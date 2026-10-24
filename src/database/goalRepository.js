import { monthRange } from '../utils/dates';
import { getDatabase } from './db';

// The saved amount of a goal is always derived from its transactions
// (contributions minus withdrawals) rather than stored separately, so the two
// can never drift apart.
const GOAL_SELECT = `
  SELECT
    g.id,
    g.name,
    g.target_amount_paise AS targetAmountPaise,
    g.target_date AS targetDate,
    g.is_active AS isActive,
    g.created_at AS createdAt,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'contribution' THEN t.amount_paise ELSE 0 END), 0)
      AS contributedPaise,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'withdrawal' THEN t.amount_paise ELSE 0 END), 0)
      AS withdrawnPaise,
    COALESCE(SUM(CASE WHEN t.transaction_type = 'contribution' THEN t.amount_paise ELSE -t.amount_paise END), 0)
      AS balancePaise,
    COUNT(t.id) AS transactionCount
  FROM savings_goals g
  LEFT JOIN goal_transactions t ON t.goal_id = g.id
`;

const GOAL_TRANSACTION_SELECT = `
  SELECT
    id,
    goal_id AS goalId,
    amount_paise AS amountPaise,
    transaction_type AS transactionType,
    transaction_date AS transactionDate,
    note,
    created_at AS createdAt
  FROM goal_transactions
`;

function normaliseGoal(row) {
  if (!row) {
    return null;
  }
  return {
    ...row,
    isActive: Number(row.isActive) === 1,
    contributedPaise: Number(row.contributedPaise ?? 0),
    withdrawnPaise: Number(row.withdrawnPaise ?? 0),
    balancePaise: Number(row.balancePaise ?? 0),
    transactionCount: Number(row.transactionCount ?? 0),
  };
}

export async function createGoal({ name, targetAmountPaise, targetDate }) {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO savings_goals (name, target_amount_paise, target_date)
     VALUES (?, ?, ?)`,
    name,
    targetAmountPaise,
    targetDate ?? null
  );
  return result.lastInsertRowId;
}

export async function updateGoal(id, { name, targetAmountPaise, targetDate }) {
  const db = await getDatabase();
  const result = await db.runAsync(
    `UPDATE savings_goals
     SET name = ?, target_amount_paise = ?, target_date = ?
     WHERE id = ?`,
    name,
    targetAmountPaise,
    targetDate ?? null,
    id
  );
  return result.changes;
}

export async function setGoalActive(id, isActive) {
  const db = await getDatabase();
  const result = await db.runAsync(
    'UPDATE savings_goals SET is_active = ? WHERE id = ?',
    isActive ? 1 : 0,
    id
  );
  return result.changes;
}

/**
 * Deletes a goal. Goals that have contributions or withdrawals cannot be
 * deleted (the foreign key is ON DELETE RESTRICT); archive them instead.
 */
export async function deleteGoal(id) {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    'SELECT COUNT(*) AS count FROM goal_transactions WHERE goal_id = ?',
    id
  );
  if (Number(row?.count ?? 0) > 0) {
    throw new Error(
      'This goal has contributions or withdrawals recorded. Archive it instead of deleting it.'
    );
  }
  const result = await db.runAsync('DELETE FROM savings_goals WHERE id = ?', id);
  return result.changes;
}

export async function getGoals({ includeArchived = false } = {}) {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `${GOAL_SELECT}
     ${includeArchived ? '' : 'WHERE g.is_active = 1'}
     GROUP BY g.id
     ORDER BY g.is_active DESC, g.created_at DESC, g.id DESC`
  );
  return rows.map(normaliseGoal);
}

export async function getGoalById(id) {
  const db = await getDatabase();
  const row = await db.getFirstAsync(`${GOAL_SELECT} WHERE g.id = ? GROUP BY g.id`, id);
  return normaliseGoal(row);
}

export async function addGoalTransaction({ goalId, amountPaise, transactionType, transactionDate, note }) {
  const db = await getDatabase();
  let insertedId = null;
  // A transaction keeps the balance check and the insert atomic.
  await db.withTransactionAsync(async () => {
    if (transactionType === 'withdrawal') {
      const balanceRow = await db.getFirstAsync(
        `SELECT COALESCE(SUM(CASE WHEN transaction_type = 'contribution' THEN amount_paise ELSE -amount_paise END), 0)
           AS balancePaise
         FROM goal_transactions WHERE goal_id = ?`,
        goalId
      );
      if (amountPaise > Number(balanceRow?.balancePaise ?? 0)) {
        throw new Error('Withdrawal is larger than the amount saved in this goal.');
      }
    }
    const result = await db.runAsync(
      `INSERT INTO goal_transactions
         (goal_id, amount_paise, transaction_type, transaction_date, note)
       VALUES (?, ?, ?, ?, ?)`,
      goalId,
      amountPaise,
      transactionType,
      transactionDate,
      note ?? null
    );
    insertedId = result.lastInsertRowId;
  });
  return insertedId;
}

export async function deleteGoalTransaction(id) {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM goal_transactions WHERE id = ?', id);
  return result.changes;
}

export async function getGoalTransactions(goalId) {
  const db = await getDatabase();
  return db.getAllAsync(
    `${GOAL_TRANSACTION_SELECT}
     WHERE goal_id = ?
     ORDER BY transaction_date DESC, id DESC`,
    goalId
  );
}

/** Contributions and withdrawals across all goals within a month. */
export async function getGoalActivityForMonth(month) {
  const db = await getDatabase();
  const { start, end } = monthRange(month);
  const row = await db.getFirstAsync(
    `SELECT
       COALESCE(SUM(CASE WHEN transaction_type = 'contribution' THEN amount_paise ELSE 0 END), 0)
         AS contributionsPaise,
       COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount_paise ELSE 0 END), 0)
         AS withdrawalsPaise
     FROM goal_transactions
     WHERE transaction_date >= ? AND transaction_date < ?`,
    start,
    end
  );
  const contributionsPaise = Number(row?.contributionsPaise ?? 0);
  const withdrawalsPaise = Number(row?.withdrawalsPaise ?? 0);
  return {
    contributionsPaise,
    withdrawalsPaise,
    netPaise: contributionsPaise - withdrawalsPaise,
  };
}

export async function getAllGoalTransactions() {
  const db = await getDatabase();
  return db.getAllAsync(`${GOAL_TRANSACTION_SELECT} ORDER BY transaction_date DESC, id DESC`);
}

import { monthRange } from '../utils/dates';
import { getDatabase } from './db';

const EXPENSE_SELECT = `
  SELECT
    id,
    amount_paise AS amountPaise,
    category,
    expense_date AS expenseDate,
    payment_method AS paymentMethod,
    note,
    created_at AS createdAt
  FROM expense_transactions
`;

export async function addExpense({ amountPaise, category, expenseDate, paymentMethod, note }) {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO expense_transactions
       (amount_paise, category, expense_date, payment_method, note)
     VALUES (?, ?, ?, ?, ?)`,
    amountPaise,
    category,
    expenseDate,
    paymentMethod ?? null,
    note ?? null
  );
  return result.lastInsertRowId;
}

export async function updateExpense(id, { amountPaise, category, expenseDate, paymentMethod, note }) {
  const db = await getDatabase();
  const result = await db.runAsync(
    `UPDATE expense_transactions
     SET amount_paise = ?, category = ?, expense_date = ?, payment_method = ?, note = ?
     WHERE id = ?`,
    amountPaise,
    category,
    expenseDate,
    paymentMethod ?? null,
    note ?? null,
    id
  );
  return result.changes;
}

export async function deleteExpense(id) {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM expense_transactions WHERE id = ?', id);
  return result.changes;
}

export async function getExpenseById(id) {
  const db = await getDatabase();
  return db.getFirstAsync(`${EXPENSE_SELECT} WHERE id = ?`, id);
}

export async function getExpensesForMonth(month, { category } = {}) {
  const db = await getDatabase();
  const { start, end } = monthRange(month);
  if (category) {
    return db.getAllAsync(
      `${EXPENSE_SELECT}
       WHERE expense_date >= ? AND expense_date < ? AND category = ?
       ORDER BY expense_date DESC, id DESC`,
      start,
      end,
      category
    );
  }
  return db.getAllAsync(
    `${EXPENSE_SELECT}
     WHERE expense_date >= ? AND expense_date < ?
     ORDER BY expense_date DESC, id DESC`,
    start,
    end
  );
}

export async function getExpenseTotalForMonth(month) {
  const db = await getDatabase();
  const { start, end } = monthRange(month);
  const row = await db.getFirstAsync(
    `SELECT COALESCE(SUM(amount_paise), 0) AS totalPaise
     FROM expense_transactions
     WHERE expense_date >= ? AND expense_date < ?`,
    start,
    end
  );
  return Number(row?.totalPaise ?? 0);
}

export async function getCategoryTotalsForMonth(month) {
  const db = await getDatabase();
  const { start, end } = monthRange(month);
  return db.getAllAsync(
    `SELECT category, COALESCE(SUM(amount_paise), 0) AS totalPaise, COUNT(*) AS count
     FROM expense_transactions
     WHERE expense_date >= ? AND expense_date < ?
     GROUP BY category
     ORDER BY totalPaise DESC, category ASC`,
    start,
    end
  );
}

export async function getAllExpenses() {
  const db = await getDatabase();
  return db.getAllAsync(`${EXPENSE_SELECT} ORDER BY expense_date DESC, id DESC`);
}

import { getDatabase } from './db';

// Income counts towards the month it *belongs to* (`salary_month`) when that is
// set, otherwise the month it was received. This lets a September salary that
// arrives on 1 October still appear in September's reports.
export const INCOME_MONTH_EXPRESSION = "COALESCE(salary_month, substr(received_date, 1, 7))";

const INCOME_SELECT = `
  SELECT
    id,
    type,
    amount_paise AS amountPaise,
    received_date AS receivedDate,
    salary_month AS salaryMonth,
    ${INCOME_MONTH_EXPRESSION} AS effectiveMonth,
    note,
    created_at AS createdAt
  FROM income_transactions
`;

export async function addIncome({ type, amountPaise, receivedDate, salaryMonth, note }) {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO income_transactions
       (type, amount_paise, received_date, salary_month, note)
     VALUES (?, ?, ?, ?, ?)`,
    type,
    amountPaise,
    receivedDate,
    salaryMonth ?? null,
    note ?? null
  );
  return result.lastInsertRowId;
}

export async function updateIncome(id, { type, amountPaise, receivedDate, salaryMonth, note }) {
  const db = await getDatabase();
  const result = await db.runAsync(
    `UPDATE income_transactions
     SET type = ?, amount_paise = ?, received_date = ?, salary_month = ?, note = ?
     WHERE id = ?`,
    type,
    amountPaise,
    receivedDate,
    salaryMonth ?? null,
    note ?? null,
    id
  );
  return result.changes;
}

export async function deleteIncome(id) {
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM income_transactions WHERE id = ?', id);
  return result.changes;
}

export async function getIncomeById(id) {
  const db = await getDatabase();
  return db.getFirstAsync(`${INCOME_SELECT} WHERE id = ?`, id);
}

export async function getIncomeForMonth(month) {
  const db = await getDatabase();
  return db.getAllAsync(
    `${INCOME_SELECT}
     WHERE ${INCOME_MONTH_EXPRESSION} = ?
     ORDER BY received_date DESC, id DESC`,
    month
  );
}

export async function getIncomeTotalForMonth(month) {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    `SELECT COALESCE(SUM(amount_paise), 0) AS totalPaise
     FROM income_transactions
     WHERE ${INCOME_MONTH_EXPRESSION} = ?`,
    month
  );
  return Number(row?.totalPaise ?? 0);
}

export async function getIncomeTotalsByType(month) {
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT type, COALESCE(SUM(amount_paise), 0) AS totalPaise, COUNT(*) AS count
     FROM income_transactions
     WHERE ${INCOME_MONTH_EXPRESSION} = ?
     GROUP BY type
     ORDER BY totalPaise DESC`,
    month
  );
}

export async function getAllIncome() {
  const db = await getDatabase();
  return db.getAllAsync(`${INCOME_SELECT} ORDER BY received_date DESC, id DESC`);
}

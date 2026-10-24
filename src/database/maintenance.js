import { getDatabase } from './db';

/**
 * Deletes every record in the database. Child rows are removed before their
 * parents so the goal foreign key never blocks the delete.
 */
export async function deleteAllData() {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync(`
      DELETE FROM goal_transactions;
      DELETE FROM savings_goals;
      DELETE FROM expense_transactions;
      DELETE FROM income_transactions;
      DELETE FROM app_settings;
    `);
  });
}

export async function getRecordCounts() {
  const db = await getDatabase();
  const row = await db.getFirstAsync(`
    SELECT
      (SELECT COUNT(*) FROM income_transactions) AS incomes,
      (SELECT COUNT(*) FROM expense_transactions) AS expenses,
      (SELECT COUNT(*) FROM savings_goals) AS goals,
      (SELECT COUNT(*) FROM goal_transactions) AS goalTransactions
  `);
  return {
    incomes: Number(row?.incomes ?? 0),
    expenses: Number(row?.expenses ?? 0),
    goals: Number(row?.goals ?? 0),
    goalTransactions: Number(row?.goalTransactions ?? 0),
  };
}

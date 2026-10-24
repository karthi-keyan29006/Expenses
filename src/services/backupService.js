import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  GOAL_TRANSACTION_TYPE_VALUES,
  INCOME_TYPE_VALUES,
  incomeTypeLabel,
  SETTINGS_KEYS,
} from '../constants';
import { getDatabase } from '../database/db';
import { getAllExpenses } from '../database/expenseRepository';
import { getAllGoalTransactions, getGoals } from '../database/goalRepository';
import { getAllIncome } from '../database/incomeRepository';
import { TABLE_NAMES } from '../database/schema';
import { getAllSettings, setSetting } from '../database/settingsRepository';
import { paiseToRupees } from '../utils/currency';
import { isValidIsoDate, isValidMonth, monthOf, todayIso } from '../utils/dates';

export class BackupValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

const EXPORT_DIRECTORY = 'exports';
const BACKUP_MIME_TYPES = ['application/json', 'text/plain', 'application/octet-stream', '*/*'];

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** Collects every table into a plain, serialisable backup object. */
export async function buildBackupPayload() {
  const [incomes, expenses, goals, goalTransactions, settings] = await Promise.all([
    getAllIncome(),
    getAllExpenses(),
    getGoals({ includeArchived: true }),
    getAllGoalTransactions(),
    getAllSettings(),
  ]);

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      income_transactions: incomes.map((row) => ({
        id: row.id,
        type: row.type,
        amount_paise: row.amountPaise,
        received_date: row.receivedDate,
        salary_month: row.salaryMonth ?? null,
        note: row.note ?? null,
        created_at: row.createdAt,
      })),
      expense_transactions: expenses.map((row) => ({
        id: row.id,
        amount_paise: row.amountPaise,
        category: row.category,
        expense_date: row.expenseDate,
        payment_method: row.paymentMethod ?? null,
        note: row.note ?? null,
        created_at: row.createdAt,
      })),
      savings_goals: goals.map((row) => ({
        id: row.id,
        name: row.name,
        target_amount_paise: row.targetAmountPaise,
        target_date: row.targetDate ?? null,
        is_active: row.isActive ? 1 : 0,
        created_at: row.createdAt,
      })),
      goal_transactions: goalTransactions.map((row) => ({
        id: row.id,
        goal_id: row.goalId,
        amount_paise: row.amountPaise,
        transaction_type: row.transactionType,
        transaction_date: row.transactionDate,
        note: row.note ?? null,
        created_at: row.createdAt,
      })),
      app_settings: settings.map((row) => ({ key: row.key, value: row.value })),
    },
  };
}

export function countRecords(data) {
  return {
    incomes: data.income_transactions.length,
    expenses: data.expense_transactions.length,
    goals: data.savings_goals.length,
    goalTransactions: data.goal_transactions.length,
  };
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Pure helper: income + expenses as a spreadsheet-friendly CSV string. */
export function buildTransactionsCsv({ incomes, expenses }) {
  const header = ['Type', 'Date', 'Month', 'Category', 'Amount (INR)', 'Payment method', 'Note'];
  const rows = [
    ...incomes.map((row) => ({
      date: row.receivedDate,
      cells: [
        'Income',
        row.receivedDate,
        row.salaryMonth ?? monthOf(row.receivedDate),
        incomeTypeLabel(row.type),
        paiseToRupees(row.amountPaise).toFixed(2),
        '',
        row.note ?? '',
      ],
    })),
    ...expenses.map((row) => ({
      date: row.expenseDate,
      cells: [
        'Expense',
        row.expenseDate,
        monthOf(row.expenseDate),
        row.category,
        paiseToRupees(row.amountPaise).toFixed(2),
        row.paymentMethod ?? '',
        row.note ?? '',
      ],
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const lines = [header, ...rows.map((row) => row.cells)].map((cells) =>
    cells.map(csvEscape).join(',')
  );
  // Byte-order mark so spreadsheet apps detect UTF-8 (notes may contain ₹ or Indic text).
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

async function writeExportFile(fileName, content) {
  const directory = new Directory(Paths.cache, EXPORT_DIRECTORY);
  directory.create({ intermediates: true, idempotent: true });
  const file = new File(directory, fileName);
  file.create({ overwrite: true });
  await file.write(content);
  return file;
}

async function shareFile(file, { mimeType, dialogTitle }) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

/**
 * Writes a complete JSON backup to the cache directory and opens the system
 * share sheet so it can be saved to Files, Drive, email, etc.
 */
export async function exportBackup() {
  const payload = await buildBackupPayload();
  const fileName = `salary-expense-backup-${todayIso()}.json`;
  const file = await writeExportFile(fileName, JSON.stringify(payload, null, 2));
  await shareFile(file, { mimeType: 'application/json', dialogTitle: 'Save backup' });
  await setSetting(SETTINGS_KEYS.lastBackupAt, payload.exportedAt);
  return { fileName, uri: file.uri, counts: countRecords(payload.data), exportedAt: payload.exportedAt };
}

/** Exports income and expenses as a CSV file for spreadsheet analysis. */
export async function exportTransactionsCsv() {
  const [incomes, expenses] = await Promise.all([getAllIncome(), getAllExpenses()]);
  const fileName = `salary-expense-transactions-${todayIso()}.csv`;
  const file = await writeExportFile(fileName, buildTransactionsCsv({ incomes, expenses }));
  await shareFile(file, { mimeType: 'text/csv', dialogTitle: 'Export transactions' });
  return { fileName, uri: file.uri, rowCount: incomes.length + expenses.length };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function assert(condition, message) {
  if (!condition) {
    throw new BackupValidationError(message);
  }
}

const isPositiveInt = (value) => Number.isInteger(value) && value > 0;
const isNullableString = (value) => value == null || typeof value === 'string';
const isNullableTimestamp = (value) =>
  value == null || (typeof value === 'string' && value.trim() !== '');

function assertUniqueIds(rows, table) {
  const seen = new Set();
  rows.forEach((row) => {
    assert(!seen.has(row.id), `${table} contains duplicate id ${row.id}.`);
    seen.add(row.id);
  });
}

/**
 * Checks a parsed backup file thoroughly before anything is written. Returns
 * normalised data; throws BackupValidationError with a specific message.
 */
export function validateBackup(payload) {
  assert(
    payload && typeof payload === 'object' && !Array.isArray(payload),
    'This file is not a backup created by this app.'
  );
  assert(payload.format === BACKUP_FORMAT, 'This file is not a backup created by this app.');
  assert(
    Number.isInteger(payload.version) && payload.version >= 1 && payload.version <= BACKUP_VERSION,
    `This backup uses version ${payload.version}, which this app cannot read. Update the app and try again.`
  );
  const data = payload.data;
  assert(data && typeof data === 'object' && !Array.isArray(data), 'The backup contains no data.');
  TABLE_NAMES.forEach((table) => {
    assert(Array.isArray(data[table]), `The backup is missing the "${table}" section.`);
  });

  const incomes = data.income_transactions.map((row, index) => {
    const where = `income_transactions[${index}]`;
    assert(row && typeof row === 'object', `${where}: invalid record.`);
    assert(isPositiveInt(row.id), `${where}: invalid id.`);
    assert(INCOME_TYPE_VALUES.includes(row.type), `${where}: unknown income type "${row.type}".`);
    assert(isPositiveInt(row.amount_paise), `${where}: invalid amount.`);
    assert(isValidIsoDate(row.received_date), `${where}: invalid received date.`);
    assert(row.salary_month == null || isValidMonth(row.salary_month), `${where}: invalid salary month.`);
    assert(isNullableString(row.note), `${where}: invalid note.`);
    assert(isNullableTimestamp(row.created_at), `${where}: invalid created_at.`);
    return {
      id: row.id,
      type: row.type,
      amount_paise: row.amount_paise,
      received_date: row.received_date,
      salary_month: row.salary_month ?? null,
      note: row.note ?? null,
      created_at: row.created_at ?? null,
    };
  });

  const expenses = data.expense_transactions.map((row, index) => {
    const where = `expense_transactions[${index}]`;
    assert(row && typeof row === 'object', `${where}: invalid record.`);
    assert(isPositiveInt(row.id), `${where}: invalid id.`);
    assert(isPositiveInt(row.amount_paise), `${where}: invalid amount.`);
    assert(typeof row.category === 'string' && row.category.trim() !== '', `${where}: missing category.`);
    assert(isValidIsoDate(row.expense_date), `${where}: invalid expense date.`);
    assert(isNullableString(row.payment_method), `${where}: invalid payment method.`);
    assert(isNullableString(row.note), `${where}: invalid note.`);
    assert(isNullableTimestamp(row.created_at), `${where}: invalid created_at.`);
    return {
      id: row.id,
      amount_paise: row.amount_paise,
      category: row.category.trim(),
      expense_date: row.expense_date,
      payment_method: row.payment_method ?? null,
      note: row.note ?? null,
      created_at: row.created_at ?? null,
    };
  });

  const goals = data.savings_goals.map((row, index) => {
    const where = `savings_goals[${index}]`;
    assert(row && typeof row === 'object', `${where}: invalid record.`);
    assert(isPositiveInt(row.id), `${where}: invalid id.`);
    assert(typeof row.name === 'string' && row.name.trim() !== '', `${where}: missing name.`);
    assert(isPositiveInt(row.target_amount_paise), `${where}: invalid target amount.`);
    assert(row.target_date == null || isValidIsoDate(row.target_date), `${where}: invalid target date.`);
    assert(row.is_active === 0 || row.is_active === 1, `${where}: invalid is_active flag.`);
    assert(isNullableTimestamp(row.created_at), `${where}: invalid created_at.`);
    return {
      id: row.id,
      name: row.name.trim(),
      target_amount_paise: row.target_amount_paise,
      target_date: row.target_date ?? null,
      is_active: row.is_active,
      created_at: row.created_at ?? null,
    };
  });

  const goalIds = new Set(goals.map((goal) => goal.id));
  const goalTransactions = data.goal_transactions.map((row, index) => {
    const where = `goal_transactions[${index}]`;
    assert(row && typeof row === 'object', `${where}: invalid record.`);
    assert(isPositiveInt(row.id), `${where}: invalid id.`);
    assert(goalIds.has(row.goal_id), `${where}: refers to a goal (${row.goal_id}) that is not in the backup.`);
    assert(isPositiveInt(row.amount_paise), `${where}: invalid amount.`);
    assert(
      GOAL_TRANSACTION_TYPE_VALUES.includes(row.transaction_type),
      `${where}: unknown transaction type "${row.transaction_type}".`
    );
    assert(isValidIsoDate(row.transaction_date), `${where}: invalid transaction date.`);
    assert(isNullableString(row.note), `${where}: invalid note.`);
    assert(isNullableTimestamp(row.created_at), `${where}: invalid created_at.`);
    return {
      id: row.id,
      goal_id: row.goal_id,
      amount_paise: row.amount_paise,
      transaction_type: row.transaction_type,
      transaction_date: row.transaction_date,
      note: row.note ?? null,
      created_at: row.created_at ?? null,
    };
  });

  const settings = data.app_settings.map((row, index) => {
    const where = `app_settings[${index}]`;
    assert(row && typeof row === 'object', `${where}: invalid record.`);
    assert(typeof row.key === 'string' && row.key !== '', `${where}: invalid key.`);
    assert(typeof row.value === 'string', `${where}: invalid value.`);
    return { key: row.key, value: row.value };
  });

  assertUniqueIds(incomes, 'income_transactions');
  assertUniqueIds(expenses, 'expense_transactions');
  assertUniqueIds(goals, 'savings_goals');
  assertUniqueIds(goalTransactions, 'goal_transactions');

  const normalised = {
    income_transactions: incomes,
    expense_transactions: expenses,
    savings_goals: goals,
    goal_transactions: goalTransactions,
    app_settings: settings,
  };

  return {
    version: payload.version,
    exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : null,
    data: normalised,
    counts: countRecords(normalised),
  };
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

/** Opens the system file picker. Resolves to null when the user cancels. */
export async function pickBackupFile() {
  const result = await File.pickFileAsync({ mimeTypes: BACKUP_MIME_TYPES });
  if (result.canceled) {
    return null;
  }
  return result.result;
}

/** Reads and validates a backup file without changing the database. */
export async function readBackupFile(file) {
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new BackupValidationError('The file could not be read as JSON.');
  }
  return validateBackup(payload);
}

/**
 * Replaces all existing records with the contents of a validated backup.
 * Runs in a single transaction: either everything is restored or nothing
 * changes. IDs are preserved so goal transactions keep pointing at their goals.
 */
export async function restoreBackup(validatedBackup) {
  const { data } = validatedBackup;
  const db = await getDatabase();

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync(`
      DELETE FROM goal_transactions;
      DELETE FROM savings_goals;
      DELETE FROM expense_transactions;
      DELETE FROM income_transactions;
      DELETE FROM app_settings;
    `);

    for (const row of data.income_transactions) {
      await txn.runAsync(
        `INSERT INTO income_transactions
           (id, type, amount_paise, received_date, salary_month, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
        row.id,
        row.type,
        row.amount_paise,
        row.received_date,
        row.salary_month,
        row.note,
        row.created_at
      );
    }

    for (const row of data.expense_transactions) {
      await txn.runAsync(
        `INSERT INTO expense_transactions
           (id, amount_paise, category, expense_date, payment_method, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
        row.id,
        row.amount_paise,
        row.category,
        row.expense_date,
        row.payment_method,
        row.note,
        row.created_at
      );
    }

    for (const row of data.savings_goals) {
      await txn.runAsync(
        `INSERT INTO savings_goals
           (id, name, target_amount_paise, target_date, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
        row.id,
        row.name,
        row.target_amount_paise,
        row.target_date,
        row.is_active,
        row.created_at
      );
    }

    for (const row of data.goal_transactions) {
      await txn.runAsync(
        `INSERT INTO goal_transactions
           (id, goal_id, amount_paise, transaction_type, transaction_date, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
        row.id,
        row.goal_id,
        row.amount_paise,
        row.transaction_type,
        row.transaction_date,
        row.note,
        row.created_at
      );
    }

    for (const row of data.app_settings) {
      await txn.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?)', row.key, row.value);
    }
  });

  return validatedBackup.counts;
}

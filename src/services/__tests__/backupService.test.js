import { BACKUP_FORMAT, BACKUP_VERSION } from '../../constants';
import { BackupValidationError, buildTransactionsCsv, validateBackup } from '../backupService';

// babel-jest hoists jest.mock above the imports; native modules are not needed
// for the pure validation and CSV helpers under test.
jest.mock('expo-file-system', () => ({ File: class {}, Directory: class {}, Paths: { cache: '' } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

function makeBackup(overrides = {}) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: '2026-10-24T10:00:00.000Z',
    data: {
      income_transactions: [
        {
          id: 1,
          type: 'salary',
          amount_paise: 3000000,
          received_date: '2026-10-01',
          salary_month: '2026-09',
          note: null,
          created_at: '2026-10-01 05:00:00',
        },
      ],
      expense_transactions: [
        {
          id: 1,
          amount_paise: 24999,
          category: 'Food',
          expense_date: '2026-10-02',
          payment_method: 'UPI',
          note: 'Groceries',
          created_at: null,
        },
      ],
      savings_goals: [
        {
          id: 7,
          name: 'Emergency fund',
          target_amount_paise: 10000000,
          target_date: null,
          is_active: 1,
          created_at: '2026-09-01 05:00:00',
        },
      ],
      goal_transactions: [
        {
          id: 1,
          goal_id: 7,
          amount_paise: 500000,
          transaction_type: 'contribution',
          transaction_date: '2026-10-03',
          note: null,
          created_at: null,
        },
      ],
      app_settings: [{ key: 'last_backup_at', value: '2026-10-20T10:00:00.000Z' }],
      ...overrides,
    },
  };
}

describe('validateBackup', () => {
  it('accepts a well-formed backup and counts records', () => {
    const result = validateBackup(makeBackup());
    expect(result.counts).toEqual({ incomes: 1, expenses: 1, goals: 1, goalTransactions: 1 });
    expect(result.exportedAt).toBe('2026-10-24T10:00:00.000Z');
    expect(result.data.expense_transactions[0].created_at).toBeNull();
  });

  it('rejects files that are not backups', () => {
    expect(() => validateBackup(null)).toThrow(BackupValidationError);
    expect(() => validateBackup([])).toThrow(BackupValidationError);
    expect(() => validateBackup({ format: 'something-else', version: 1, data: {} })).toThrow(
      /not a backup created by this app/
    );
  });

  it('rejects newer backup versions', () => {
    expect(() => validateBackup({ ...makeBackup(), version: BACKUP_VERSION + 1 })).toThrow(/Update the app/);
  });

  it('rejects a missing table section', () => {
    const backup = makeBackup();
    delete backup.data.savings_goals;
    expect(() => validateBackup(backup)).toThrow(/missing the "savings_goals" section/);
  });

  it('pinpoints the invalid record', () => {
    const backup = makeBackup({
      expense_transactions: [
        { id: 1, amount_paise: 100, category: 'Food', expense_date: '2026-10-02' },
        { id: 2, amount_paise: -5, category: 'Food', expense_date: '2026-10-02' },
      ],
    });
    expect(() => validateBackup(backup)).toThrow('expense_transactions[1]: invalid amount.');
  });

  it('rejects goal transactions that point at unknown goals', () => {
    const backup = makeBackup();
    backup.data.goal_transactions[0].goal_id = 99;
    expect(() => validateBackup(backup)).toThrow(/refers to a goal \(99\)/);
  });

  it('rejects duplicate ids', () => {
    const backup = makeBackup();
    backup.data.income_transactions.push({ ...backup.data.income_transactions[0] });
    expect(() => validateBackup(backup)).toThrow(/duplicate id 1/);
  });

  it('rejects unknown enum values', () => {
    const backup = makeBackup();
    backup.data.income_transactions[0].type = 'lottery';
    expect(() => validateBackup(backup)).toThrow(/unknown income type "lottery"/);
  });
});

describe('buildTransactionsCsv', () => {
  it('writes a header, newest first, with escaped notes', () => {
    const csv = buildTransactionsCsv({
      incomes: [
        { type: 'salary', amountPaise: 3000000, receivedDate: '2026-10-01', salaryMonth: '2026-09', note: null },
      ],
      expenses: [
        {
          amountPaise: 24999,
          category: 'Food',
          expenseDate: '2026-10-02',
          paymentMethod: 'UPI',
          note: 'Groceries, "weekly"',
        },
      ],
    });
    const lines = csv.replace(/^\uFEFF/, '').trim().split('\r\n');
    expect(lines).toEqual([
      'Type,Date,Month,Category,Amount (INR),Payment method,Note',
      'Expense,2026-10-02,2026-10,Food,249.99,UPI,"Groceries, ""weekly"""',
      'Income,2026-10-01,2026-09,Salary,30000.00,,',
    ]);
  });
});

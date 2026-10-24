// Database schema. Monetary amounts are stored as integer paise
// (₹500.50 -> 50050). Dates are ISO strings: "YYYY-MM-DD" for transactions
// and "YYYY-MM" for the month a salary belongs to.
//
// `PRAGMA foreign_keys` is set on the connection in db.js (it is a no-op inside
// a transaction, so it must not live in a migration).

export const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS income_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL
    CHECK (type IN ('salary', 'bonus', 'other')),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  received_date TEXT NOT NULL,
  salary_month TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expense_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  category TEXT NOT NULL,
  expense_date TEXT NOT NULL,
  payment_method TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS savings_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  target_amount_paise INTEGER NOT NULL
    CHECK (target_amount_paise > 0),
  target_date TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER NOT NULL DEFAULT 1
    CHECK (is_active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS goal_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  transaction_type TEXT NOT NULL
    CHECK (transaction_type IN ('contribution', 'withdrawal')),
  transaction_date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goal_id) REFERENCES savings_goals(id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_income_date
  ON income_transactions(received_date);

CREATE INDEX IF NOT EXISTS idx_income_month
  ON income_transactions(salary_month);

CREATE INDEX IF NOT EXISTS idx_expense_date
  ON expense_transactions(expense_date);

CREATE INDEX IF NOT EXISTS idx_expense_category
  ON expense_transactions(category);

CREATE INDEX IF NOT EXISTS idx_goal_transactions_goal_date
  ON goal_transactions(goal_id, transaction_date);
`;

// Ordered list of migrations. Each entry runs once, inside a transaction, when
// the database's `PRAGMA user_version` is lower than `version`. To change the
// schema in a future release, append a new migration — never edit an old one.
export const MIGRATIONS = [{ version: 1, sql: SCHEMA_V1 }];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export const TABLE_NAMES = [
  'income_transactions',
  'expense_transactions',
  'savings_goals',
  'goal_transactions',
  'app_settings',
];

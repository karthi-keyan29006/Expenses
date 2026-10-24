import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from './schema';

export const DATABASE_NAME = 'salary_expense.db';

let databasePromise = null;

async function migrate(db) {
  const row = await db.getFirstAsync('PRAGMA user_version');
  let currentVersion = Number(row?.user_version ?? 0);

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) {
      continue;
    }
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(migration.sql);
      await txn.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
    currentVersion = migration.version;
  }
}

async function openAndInitialise() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  // Must run outside a transaction, once per connection.
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await migrate(db);
  return db;
}

/**
 * Returns the shared database connection, opening it and applying any
 * pending migrations on first use. Safe to call from anywhere; the promise is
 * cached so initialisation only happens once.
 */
export function getDatabase() {
  if (!databasePromise) {
    databasePromise = openAndInitialise().catch((error) => {
      databasePromise = null; // allow a retry after a failed open
      throw error;
    });
  }
  return databasePromise;
}

/** Convenience wrapper used by the root layout to block rendering until ready. */
export async function initialiseDatabase() {
  await getDatabase();
}

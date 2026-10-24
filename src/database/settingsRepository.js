import { getDatabase } from './db';

export async function getSetting(key) {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT value FROM app_settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(key, value) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    String(value)
  );
}

export async function getAllSettings() {
  const db = await getDatabase();
  return db.getAllAsync('SELECT key, value FROM app_settings ORDER BY key');
}

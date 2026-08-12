import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'bakal.db';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 1;
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentDbVersion = result?.user_version ?? 0;

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        muscle_group TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY NOT NULL,
        date TEXT NOT NULL DEFAULT (datetime('now')),
        duration_seconds INTEGER,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS sets (
        id INTEGER PRIMARY KEY NOT NULL,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id),
        weight REAL NOT NULL,
        reps INTEGER NOT NULL,
        set_order INTEGER NOT NULL,
        rest_seconds INTEGER
      );
    `);
    currentDbVersion = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${currentDbVersion}`);
}

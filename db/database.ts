import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'bakal.db';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 14;
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

  if (currentDbVersion === 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS routines (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS routine_exercises (
        id INTEGER PRIMARY KEY NOT NULL,
        routine_id INTEGER NOT NULL REFERENCES routines(id),
        exercise_id INTEGER NOT NULL REFERENCES exercises(id),
        position INTEGER NOT NULL
      );
    `);
    currentDbVersion = 2;
  }

  if (currentDbVersion === 2) {
    await db.execAsync(`
      INSERT INTO exercises (name, muscle_group)
      SELECT 'Incline Bench Press', 'Upper Chest'
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Incline Bench Press');

      INSERT INTO exercises (name, muscle_group)
      SELECT 'Pull ups', 'Back'
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Pull ups');
    `);
    currentDbVersion = 3;
  }

  if (currentDbVersion === 3) {
    await db.execAsync(`
      INSERT INTO exercises (name, muscle_group)
      SELECT 'Side Lateral Raises', 'Side Delt Shoulder'
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Side Lateral Raises');
    `);
    currentDbVersion = 4;
  }

  if (currentDbVersion === 4) {
    await db.execAsync(`
      INSERT INTO exercises (name, muscle_group)
      SELECT 'Cable Tricep Push Down', 'Tricep'
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Cable Tricep Push Down');

      INSERT INTO exercises (name, muscle_group)
      SELECT 'Skull Crusher', 'Tricep'
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Skull Crusher');
    `);
    currentDbVersion = 5;
  }

  if (currentDbVersion === 5) {
    await db.execAsync(`
      INSERT INTO exercises (name, muscle_group)
      SELECT 'Leg Press', 'Leg'
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Leg Press');

      INSERT INTO exercises (name, muscle_group)
      SELECT 'Calf Raise', 'Leg'
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Calf Raise');

      INSERT INTO exercises (name, muscle_group)
      SELECT 'Leg Extension', 'Leg'
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Leg Extension');
    `);
    currentDbVersion = 6;
  }

  if (currentDbVersion === 6) {
    await db.execAsync(`
      INSERT INTO exercises (name, muscle_group)
      SELECT 'Chest Press', 'Chest'
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Chest Press');
    `);
    currentDbVersion = 7;
  }

  if (currentDbVersion === 7) {
    await db.execAsync(`
      INSERT INTO exercises (name, muscle_group)
      SELECT 'Low-to-High Cable Fly', 'Chest'
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Low-to-High Cable Fly');
    `);
    currentDbVersion = 8;
  }

  if (currentDbVersion === 8) {
    await db.execAsync(`
      INSERT INTO exercises (name, muscle_group)
      SELECT 'Cable Face Pull', 'Shoulder'
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Cable Face Pull');
    `);
    currentDbVersion = 9;
  }

  if (currentDbVersion === 9) {
    await db.execAsync(`
      INSERT INTO exercises (name, muscle_group)
      SELECT 'Lat Pulldown', 'Back'
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Lat Pulldown');

      INSERT INTO exercises (name, muscle_group)
      SELECT 'Seated Cable Row', 'Back'
      WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE name = 'Seated Cable Row');
    `);
    currentDbVersion = 10;
  }

  if (currentDbVersion === 10) {
    await db.execAsync(`ALTER TABLE sessions ADD COLUMN name TEXT;`);
    currentDbVersion = 11;
  }

  if (currentDbVersion === 11) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS body_weight (
        id INTEGER PRIMARY KEY NOT NULL,
        weight REAL NOT NULL,
        date TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    currentDbVersion = 12;
  }

  if (currentDbVersion === 12) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY NOT NULL,
        height_cm REAL
      );
    `);
    currentDbVersion = 13;
  }

  if (currentDbVersion === 13) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS progress_photos (
        id INTEGER PRIMARY KEY NOT NULL,
        uri TEXT NOT NULL,
        date TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    currentDbVersion = 14;
  }

  await db.execAsync(`PRAGMA user_version = ${currentDbVersion}`);
}

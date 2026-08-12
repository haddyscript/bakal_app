// SQLite's datetime('now') returns "YYYY-MM-DD HH:MM:SS" in UTC with no timezone
// marker, which `new Date(...)` parses inconsistently across JS engines.
export function parseSqliteDate(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

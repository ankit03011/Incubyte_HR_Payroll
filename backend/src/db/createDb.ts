import Database from 'better-sqlite3';
import { migrate } from './migrate.js';

export type Db = Database.Database;

export function createDb(path: string): Db {
  const db = new Database(path);
  // better-sqlite3 enables this by default; stated explicitly so integrity never depends on the build.
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

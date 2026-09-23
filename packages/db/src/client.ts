import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

export const defaultDatabasePath = './data/evomind.sqlite';

export function createDatabase(filename = process.env.DATABASE_URL ?? defaultDatabasePath): {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: Database.Database;
} {
  const sqlite = new Database(filename);
  sqlite.pragma('foreign_keys = ON');
  return { db: drizzle(sqlite, { schema }), sqlite };
}

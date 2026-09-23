import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import * as schema from './schema';

export const defaultDatabasePath = resolve(__dirname, '../data/evomind.sqlite');

export function createDatabase(filename = process.env.DATABASE_URL ?? defaultDatabasePath): {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: Database.Database;
} {
  const sqlite = new Database(filename);
  sqlite.pragma('foreign_keys = ON');
  return { db: drizzle(sqlite, { schema }), sqlite };
}

export function createMigratedDatabase(filename = process.env.DATABASE_URL ?? defaultDatabasePath) {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
  const connection = createDatabase(filename);
  migrate(connection.db, { migrationsFolder: resolve(__dirname, '../drizzle') });
  return connection;
}

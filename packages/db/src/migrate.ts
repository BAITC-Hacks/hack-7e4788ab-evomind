import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDatabase, defaultDatabasePath } from './client';

const databasePath = process.env.DATABASE_URL ?? defaultDatabasePath;
mkdirSync(dirname(resolve(databasePath)), { recursive: true });
const { db, sqlite } = createDatabase(databasePath);
migrate(db, { migrationsFolder: resolve(__dirname, '../drizzle') });
sqlite.close();
console.log(`Migrations applied to ${databasePath}`);

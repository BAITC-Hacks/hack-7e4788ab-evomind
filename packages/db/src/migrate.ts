import { createMigratedDatabase, defaultDatabasePath } from './client';

const databasePath = process.env.DATABASE_URL ?? defaultDatabasePath;
const { sqlite } = createMigratedDatabase(databasePath);
sqlite.close();
console.log(`Migrations applied to ${databasePath}`);

import 'reflect-metadata';
import { join } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { buildDatabaseUrl } from '@cardquorum/db';

async function runMigrations() {
  const databaseUrl = buildDatabaseUrl();

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);

  console.log('Running database migrations...');
  await migrate(db, { migrationsFolder: join(import.meta.dirname, 'migrations') });
  console.log('Migrations complete.');

  await client.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

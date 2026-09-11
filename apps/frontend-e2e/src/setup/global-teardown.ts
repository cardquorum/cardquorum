import { closeDb, truncateAllTables } from '../helpers/db.js';

export default async function globalTeardown(): Promise<void> {
  await truncateAllTables();
  await closeDb();
}

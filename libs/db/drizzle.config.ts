import { defineConfig } from 'drizzle-kit';
import { buildDatabaseUrl } from './src/config.js';

export default defineConfig({
  schema: './libs/db/src/schema/*.ts',
  out: './libs/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: buildDatabaseUrl(),
  },
});

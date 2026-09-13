/**
 * Shared environment helpers for e2e tests.
 * Single source of truth for database URLs and base URL.
 */
import { buildDatabaseUrl, requireDbName } from '@cardquorum/db';

export function getTestDatabaseUrl(): string {
  if (process.env['E2E_DATABASE_URL']) {
    return process.env['E2E_DATABASE_URL'];
  }
  return buildDatabaseUrl({ name: `${requireDbName()}_test` });
}

export function getAdminDatabaseUrl(): string {
  return buildDatabaseUrl();
}

export function getBaseUrl(): string {
  return process.env['E2E_BASE_URL'] || 'http://localhost:4200';
}

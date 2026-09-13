/**
 * Single source of truth for database connection config.
 * All POSTGRES_* env vars have defaults except POSTGRES_PASSWORD, which is required.
 * Call buildDatabaseUrl() anywhere a connection string is needed.
 */
export const dbConfig: {
  host: string;
  port: number;
  user: string;
  password: string | undefined;
  name: string;
} = {
  host: process.env['POSTGRES_HOST'] ?? 'localhost',
  port: parseInt(process.env['POSTGRES_PORT'] ?? '5432', 10),
  user: process.env['POSTGRES_USER'] ?? 'cardquorum',
  password: process.env['POSTGRES_PASSWORD'],
  name: process.env['POSTGRES_DB'] ?? 'cardquorum',
};

export function buildDatabaseUrl(overrides?: { name?: string }): string {
  const { host, port, user, password, name } = { ...dbConfig, ...overrides };
  if (!password) throw new Error('POSTGRES_PASSWORD is not set');
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
}

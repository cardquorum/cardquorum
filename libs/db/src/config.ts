/**
 * Single source of truth for database connection config.
 *
 * POSTGRES_USER, POSTGRES_PASSWORD and POSTGRES_DB are REQUIRED — deliberately
 * no defaults. A default here would silently disagree with the Postgres image's
 * own defaults (`postgres`/`postgres`) whenever the var is missing from .env,
 * and the mismatch surfaces much later, and far from its cause, as
 * `FATAL: role "cardquorum" does not exist`. Failing at connection time names
 * the missing variable instead.
 *
 * HOST and PORT keep defaults because both sides already agree on localhost:5432.
 *
 * Validation is deliberately lazy rather than at module load: this module is
 * re-exported from @cardquorum/db alongside the schema and repositories, which
 * unit tests import without ever opening a connection.
 */
export const dbConfig: {
  host: string;
  port: number;
  user: string | undefined;
  password: string | undefined;
  name: string | undefined;
} = {
  host: process.env['POSTGRES_HOST'] ?? 'localhost',
  port: parseInt(process.env['POSTGRES_PORT'] ?? '5432', 10),
  user: process.env['POSTGRES_USER'],
  password: process.env['POSTGRES_PASSWORD'],
  name: process.env['POSTGRES_DB'],
};

function required(value: string | undefined, varName: string): string {
  if (!value) throw new Error(`${varName} is not set — see .env.template`);
  return value;
}

/** The configured database name. Throws if POSTGRES_DB is unset. */
export function requireDbName(): string {
  return required(dbConfig.name, 'POSTGRES_DB');
}

export function buildDatabaseUrl(overrides?: { name?: string }): string {
  const { host, port } = dbConfig;
  const user = required(dbConfig.user, 'POSTGRES_USER');
  const password = required(dbConfig.password, 'POSTGRES_PASSWORD');
  const name = required(overrides?.name ?? dbConfig.name, 'POSTGRES_DB');
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
}

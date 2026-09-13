# Getting Started

## Prerequisites

- Node.js (LTS)
- pnpm
- Docker & Docker Compose

## Initial Setup

1. **Clone and install:**

   ```sh
   git clone https://github.com/reednel/cardquorum.git && cd cardquorum
   pnpm install
   ```

2. **Create your `.env` file** from the template:

   ```sh
   cp .env.template .env
   ```

   The template's values work with the Docker dev containers out of the box:

   ```env
   POSTGRES_USER=cardquorum
   POSTGRES_PASSWORD=password
   POSTGRES_DB=cardquorum
   AUTH_STRATEGIES=basic
   LOG_LEVEL=debug
   ```

   All three `POSTGRES_*` values are required — there are no defaults. Create this
   file **before** step 3: Postgres creates the role and database from
   `POSTGRES_USER`/`POSTGRES_DB` only when the data volume is first initialized,
   and ignores them on every start afterwards. Starting the container without them
   yields `FATAL: role "cardquorum" does not exist` later on.

   See [auth.md](auth.md) for OIDC configuration when `AUTH_STRATEGIES` includes `oidc`.

3. **Start Postgres:**

   ```sh
   docker compose -f compose.dev.yml up -d
   ```

4. **Run database migrations:**

   ```sh
   pnpm drizzle-migrate
   ```

   Re-run this whenever you recreate the `cq-data-dev` volume, and after pulling new
   migrations. The Docker image applies migrations automatically via its entrypoint,
   but `pnpm serve` runs the backend directly and skips that — a missing schema
   surfaces as `relation "..." does not exist` on the first query, not at startup.

5. **Start the dev servers:**

   ```sh
   pnpm nx serve
   ```

   The app will be available at `http://localhost:4200`.

## Verifying Everything Works

- **Health check:** `curl http://localhost:3000/api/healthz` should return `{"status":"ok","info":{...}}` with database showing `"up"`.
- **Build:** `pnpm nx run-many -t build`
- **Test:** `pnpm nx run-many -t test`
- **Lint:** `pnpm nx run-many -t lint`

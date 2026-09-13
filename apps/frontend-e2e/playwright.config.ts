import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';

// Read directly rather than importing src/helpers/env.ts: Nx's project-graph
// plugin loads this config through @swc-node/register, which resolves relative
// specifiers literally and cannot map './...js' back to the '.ts' source.
const baseURL = process.env['E2E_BASE_URL'] || 'http://localhost:4200';

// Only POSTGRES_DB is overridden, to point the backend at the _test database;
// every other POSTGRES_* var is inherited from the environment. When it is unset
// we pass nothing and let the backend fail at startup naming the missing
// variable — this file is also loaded by Nx's project-graph plugin, which must
// not throw.
const baseDbName = process.env['POSTGRES_DB'];
const testDbEnv = baseDbName ? `POSTGRES_DB=${baseDbName}_test ` : '';

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  globalSetup: './src/setup/global-setup',
  globalTeardown: './src/setup/global-teardown',
  timeout: 30_000,
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  webServer: {
    command: `${testDbEnv}AUTH_STRATEGIES=basic NODE_ENV=test pnpm exec nx run frontend:serve`,
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});

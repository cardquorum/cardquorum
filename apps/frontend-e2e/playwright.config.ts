import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';
import { dbConfig } from '@cardquorum/db';
import { getBaseUrl } from './src/helpers/env.js';

const baseURL = getBaseUrl();

// Pass individual POSTGRES_* vars so the backend connects to the test database.
// POSTGRES_DB is overridden; all other vars come from the current environment
// (or their defaults in dbConfig).
const testDbEnv = [
  `POSTGRES_HOST=${dbConfig.host}`,
  `POSTGRES_PORT=${dbConfig.port}`,
  `POSTGRES_USER=${dbConfig.user}`,
  `POSTGRES_PASSWORD=${dbConfig.password ?? ''}`,
  `POSTGRES_DB=${dbConfig.name}_test`,
].join(' ');

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
    command: `${testDbEnv} AUTH_STRATEGIES=basic NODE_ENV=test pnpm exec nx run frontend:serve`,
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

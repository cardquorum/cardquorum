import { defineConfig, mergeConfig } from 'vitest/config';
import { nodePreset } from '../../vitest.node';

/*
 * Deliberately NOT named vitest.config.ts.
 *
 * The @nx/vitest inference plugin globs for vite.config.* and vitest.config.*
 * files and creates a `test` target for every match. This project needs a live
 * backend and a database, so it must stay out of `nx run-many -t test`; its
 * target is `e2e` and is declared explicitly in project.json.
 */
export default mergeConfig(
  nodePreset,
  defineConfig({
    test: {
      name: 'backend-e2e',
      globalSetup: ['./src/support/global-setup.ts'],
      setupFiles: ['./src/support/test-setup.ts'],
      coverage: { reportsDirectory: '../../coverage/backend-e2e' },
    },
  }),
);

import { defineConfig, mergeConfig } from 'vitest/config';
import { nodePreset } from '../../vitest.node';

export default mergeConfig(
  nodePreset,
  defineConfig({
    test: {
      name: 'db',
      coverage: { reportsDirectory: '../../coverage/db' },
    },
  }),
);

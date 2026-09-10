import { type ViteUserConfig } from 'vitest/config';

/**
 * Shared Vitest configuration for the Node projects.
 *
 * The rule from docs/design/typescript-config.md applies here too: if you are
 * about to copy a setting from one project's vitest.config.ts into another,
 * it belongs in this file. A project config should carry only its name and its
 * coverage directory.
 *
 * Deliberately absent:
 *
 * - `clearMocks` / `restoreMocks` / `mockReset`. Jest's defaults are all false
 *   and several specs call `vi.clearAllMocks()` explicitly. Turning any of them
 *   on would change behaviour silently.
 * - `oxc.target`. Leaving it unset keeps Oxc emitting native class fields, which
 *   is the `[[Define]]` semantics that `target: es2024` implies. Setting a low
 *   target here would downlevel them and reintroduce exactly the class-field
 *   inconsistency the tsconfig restructure removed.
 */
export const nodePreset: ViteUserConfig = {
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{spec,test}.ts'],
    // Vitest excludes node_modules and dist by default, but not out-tsc, which
    // holds the declaration output of `tsc --build`.
    exclude: ['**/node_modules/**', '**/dist/**', '**/out-tsc/**'],
    passWithNoTests: true,
  },
};

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
  /*
   * Workspace packages expose their TypeScript source under the
   * `@cardquorum/source` export condition and their built JavaScript under
   * `import`. Without this, Vitest resolves the `import` condition and specs
   * exercise stale build output instead of the source they are meant to cover.
   *
   * This MUST be `ssr.resolve.conditions`, not the more obvious root-level
   * `resolve.conditions`: Vitest's `node` environment resolves modules through
   * Vite's SSR pipeline, and root-level `resolve.conditions` is never
   * consulted there — it silently has no effect. Root-level `resolve.alias`
   * was tried first and confirmed to work, which is what made the root
   * `resolve.conditions` failure easy to miss (the alias was doing all the
   * work). Verified with a poisoned-`dist`-barrel test: root `resolve
   * .conditions` alone still loads `dist`; `ssr.resolve.conditions` alone
   * loads source. If someone "simplifies" this back to root `resolve
   * .conditions`, specs will silently start exercising stale `dist` output
   * again with an all-green suite.
   */
  ssr: {
    resolve: {
      conditions: ['@cardquorum/source', 'module', 'node', 'development|production'],
    },
  },
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

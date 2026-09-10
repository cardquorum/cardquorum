import type { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Isolates the CommonJS → ESM boundary for `jose`.
 *
 * `jose` v6 is ESM-only: its package.json declares `"type": "module"` and its
 * exports map offers no `require` condition. Loading it from this CommonJS
 * backend therefore requires a dynamic `import()`.
 *
 * Keeping that import here rather than inline in AuthService gives us one named
 * place where the module-system boundary lives — which is both the single seam
 * tests mock, and the single file to delete when the backend moves to ESM and a
 * plain top-level import becomes possible.
 *
 * See docs/design/typescript-config.md for the ESM migration plan.
 */

/** The subset of `jose` this application uses. */
export interface JoseModule {
  createRemoteJWKSet: typeof createRemoteJWKSet;
  jwtVerify: typeof jwtVerify;
}

/** Dynamically loads the ESM-only `jose` package. */
export async function loadJose(): Promise<JoseModule> {
  return await import('jose');
}

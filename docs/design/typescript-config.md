# TypeScript Configuration

How `tsconfig` files are organized across the workspace, and why. This document is both the design record for the September 2026 restructure and the reference for adding new projects.

> **Rule of thumb:** if you are copying a compiler option from one project into another, stop. It belongs in a preset.

## The concerns

A `tsconfig.json` looks like one thing but is really several unrelated concerns sharing a file. Almost every configuration problem comes from mixing them. What matters about each concern is not its name but **what it varies by** — that is what decides which file it belongs in:

| Concern                    | Options                                                                 | Runtime effect? | Varies by                            |
| -------------------------- | ----------------------------------------------------------------------- | --------------- | ------------------------------------ |
| **1. Strictness**          | `strict`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, … | None            | **Nothing** — uniform workspace-wide |
| **2. Transpiler contract** | `isolatedModules`, `verbatimModuleSyntax`, `importHelpers`              | Yes             | **Nothing** — uniform workspace-wide |
| **3. Module system**       | `module`, `moduleResolution`, `customConditions`                        | Yes             | Platform                             |
| **4. Language level**      | `target`, `lib`, `useDefineForClassFields`                              | Yes             | Platform                             |
| **5. Framework**           | `experimentalDecorators`, `emitDecoratorMetadata`                       | Yes             | Framework                            |
| **6. Build orchestration** | `composite`, `references`, `declaration`, `outDir`, `rootDir`           | No              | Role                                 |

Strictness is uniform: there is no defensible reason for `libs/db` to be stricter than `apps/backend`. The **transpiler contract** is uniform too — see below. Module system and language level vary by **platform** — two values, not eight. Framework options vary by **framework**, which here means NestJS and nothing else. Orchestration varies by **role** — library, application, or test.

> **On concern 2.** `verbatimModuleSyntax` and `importHelpers` read like platform options and were originally treated as such, one copy in each platform preset. They are not: both platforms want identical values, and an option with one correct value workspace-wide belongs in the base by this document's own rule. They describe what the **transpiler** may do to your imports, not what the **runtime** is. They moved to the base once ESM made `verbatimModuleSyntax` viable on Node; before that it was impossible there, which is what disguised it as platform-varying.

## Structure

Four shared files, composed with array-form `extends` (TypeScript 5.0+), where later entries win:

```
tsconfig.base.json       ← concerns 1 + 2 + 6: strictness, transpiler contract, orchestration
tsconfig.node.json       ← concerns 3 + 4: Node platform
tsconfig.browser.json    ← concerns 3 + 4: browser platform
tsconfig.backend.json    ← concern 5: NestJS decorators
tsconfig.json            ← solution file; references only
```

Every project extends the base plus exactly one platform preset. Only `apps/backend` adds a third.

Leaf configs then carry **only** what is genuinely unique to that project — `outDir`, `rootDir`, `include`, `references`:

```jsonc
// libs/db/tsconfig.lib.json — the entire file
{
  "extends": ["../../tsconfig.base.json", "../../tsconfig.node.json"],
  "compilerOptions": { "outDir": "./dist", "rootDir": "src" },
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.spec.ts"],
  "references": [{ "path": "../shared/tsconfig.lib.json" }],
}
```

Changing a strictness flag becomes a one-line edit that applies workspace-wide.

### Platform assignment

| Project                 | Preset  | Notes                              |
| ----------------------- | ------- | ---------------------------------- |
| `libs/shared`           | node    |                                    |
| `libs/engine`           | node    |                                    |
| `libs/db`               | node    |                                    |
| `libs/games/sheepshead` | node    |                                    |
| `apps/backend`          | node    | adds decorator options             |
| `apps/backend-e2e`      | node    |                                    |
| `apps/frontend`         | browser |                                    |
| `apps/frontend-e2e`     | node    | Playwright runner executes in Node |

## File contents

### `tsconfig.base.json`

Strictness, the transpiler contract, and orchestration — everything with one correct value workspace-wide. Deliberately contains **no** `target`, `module`, or `lib`: those are platform concerns.

```jsonc
{
  "compileOnSave": false,
  "compilerOptions": {
    /* Strictness — uniform across every project */
    "strict": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,

    /* Transpiler contract — uniform; see "The concerns" above */
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "importHelpers": true,

    /* Build orchestration */
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
  },
  "exclude": ["node_modules", "tmp"],
}
```

### `tsconfig.node.json`

```jsonc
{
  "compilerOptions": {
    "target": "es2024",
    "lib": ["es2024"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "customConditions": ["@cardquorum/source"],
  },
}
```

### `tsconfig.browser.json`

```jsonc
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["es2022", "dom", "dom.iterable"],
    "module": "preserve",
    "moduleResolution": "bundler",
    "types": [],
    "customConditions": ["@cardquorum/source"],

    /* Required by the Angular builder — see "paths and customConditions" below */
    "paths": {
      "@cardquorum/shared": ["./libs/shared/src/index.ts"],
      "@cardquorum/engine": ["./libs/engine/src/index.ts"],
      "@cardquorum/sheepshead": ["./libs/games/sheepshead/src/index.ts"],
      "@cardquorum/sheepshead/reporting": ["./libs/games/sheepshead/src/reporting/index.ts"],
    },
  },
}
```

### Test configs

Each project's `tsconfig.spec.json` extends the **same platform preset as its source**, then adds test types and drops out of the emit graph:

```jsonc
// libs/db/tsconfig.spec.json
{
  "extends": ["../../tsconfig.base.json", "../../tsconfig.node.json"],
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "rootDir": "src",
    "types": ["vitest/globals", "node"],
  },
  "include": ["src/**/*.spec.ts", "src/**/*.test.ts", "src/**/*.d.ts"],
  "references": [{ "path": "./tsconfig.lib.json" }],
}
```

Sharing the platform preset is what prevents the class of bug where tests compiled under different semantics than the code they exercise — `apps/frontend/tsconfig.spec.json` was pinned at `target: es2016` while the app it tested ran at `es2022`.

The test runner preset parallels the tsconfig preset: `vitest.node.ts` at the workspace root holds everything the Node projects' Vitest configs must agree on, for the same reason `tsconfig.node.json` does. `apps/frontend` has no Vitest config — the Angular builder generates one.

### Project solution files

Each project keeps a `tsconfig.json` that emits nothing and only wires roles together. These need no preset:

```jsonc
// libs/db/tsconfig.json
{
  "files": [],
  "include": [],
  "references": [{ "path": "./tsconfig.lib.json" }, { "path": "./tsconfig.spec.json" }],
}
```

The root `tsconfig.json` follows the same shape, referencing every project.

### `tsconfig.backend.json`

```jsonc
{
  "compilerOptions": {
    /* NestJS decorator support */
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
  },
}
```

NestJS requires both for dependency injection: `emitDecoratorMetadata` is what writes the `design:paramtypes` entries Nest reads to resolve constructor parameters.

It is a **preset rather than two inline copies** because `apps/backend` has two configs that both need it — `tsconfig.app.json` and `tsconfig.spec.json`. Duplicating the pair across them was the same rule violation this document opens with. Both extend it third, after the platform preset, since later entries in an array-form `extends` win:

```jsonc
// apps/backend/tsconfig.app.json
{
  "extends": [
    "../../tsconfig.base.json",
    "../../tsconfig.node.json",
    "../../tsconfig.backend.json",
  ],
  "compilerOptions": { "outDir": "./out-tsc/app", "rootDir": "src" },
  // …
}
```

Nothing else extends it. `apps/backend-e2e` contains no decorated classes, so it takes the Node preset alone.

#### Why `rootDir` cannot move into a preset

Every Node leaf config carries `"rootDir": "src"`, which looks like duplication the rule should forbid. It is the one genuine exception: **relative paths in an extended config resolve against the file that declares them**, so `rootDir: "src"` written in `tsconfig.base.json` would mean `<workspaceRoot>/src` for every project that inherited it.

It has to be set explicitly at all, rather than left to default, because `composite: true` makes `rootDir` default to the **config file's own directory** instead of the common source directory. Without it the libraries emit to `dist/src/index.js` — one segment deeper than every `exports` path expects — and the backend's declarations land in `out-tsc/app/src/`.

## Why these values

### `target` and `lib` are descriptions, not preferences

Both describe your runtime floor. `target` controls what TypeScript downlevels into older syntax; `lib` controls which globals TypeScript believes exist.

The asymmetry matters: **setting `lib` too high fails silently.** There is no compile error for calling a method your runtime lacks — you crash in production. So the correct value is the newest version the runtime _fully_ supports, not the newest available.

**Node → ES2024.** `engines.node` is `>=24`; Node 24 ships V8 13.6 with full ES2024. Node 24 supports much of ES2025 as well, but "much of" is precisely the situation where a silent `lib` failure bites. Moving to ES2025 is a one-line change once features are verified individually.

**Browser → ES2022.** Not about browser capability — browsers support far more. Angular's builder does its own downleveling from `browserslist`, so the tsconfig target is an intermediate step, not what ships. Its real job is setting `useDefineForClassFields`. ES2022 is the value Angular 22 scaffolds; it was read from `@schematics/angular/workspace/files/tsconfig.json.template` rather than chosen.

### `useDefineForClassFields` must be consistent

At `target >= ES2022` this defaults to `true` — standard `[[Define]]` class-field semantics. Below ES2022 it silently flips to `false`, giving legacy `[[Set]]` semantics. Angular calibrates signals, `input()`, `output()`, and DI field initialization against `true`.

Before this restructure the two applications ran **different class-field semantics by accident**, purely because their targets fell on opposite sides of the ES2022 line:

```
apps/backend  → target es2021, useDefineForClassFields: false   ← legacy
apps/frontend → target es2022, useDefineForClassFields: true    ← standard
```

Both platforms now land on `true`.

### `moduleResolution` describes the actual resolver

Set it wrong and TypeScript lies in both directions — approving imports that fail at runtime, or rejecting ones that work.

- **Frontend → `bundler`.** Angular builds with esbuild/Vite, which resolve like bundlers. `module: preserve` implies this.
- **Node → `nodenext`.** Implements Node's real dual CJS/ESM algorithm.

### The frontend needs `paths` _and_ `customConditions`

These look redundant. They are not, because they serve **two different resolvers**:

| Mechanism                                  | Who reads it        | Covers                                           |
| ------------------------------------------ | ------------------- | ------------------------------------------------ |
| `customConditions: ["@cardquorum/source"]` | TypeScript only     | `tsc` typecheck, project references, the backend |
| `paths`                                    | The Angular builder | `nx serve` and `nx build` for the frontend       |

`customConditions` steers TypeScript to each workspace package's `@cardquorum/source` export condition. The Angular builder does **not** read it — it resolves modules itself and reads `paths`.

Without `paths`, the Angular dev server resolves `@cardquorum/*` through the pnpm symlinks in `node_modules`, then fails on the extensionless relative imports inside those packages, because it does not apply TypeScript resolution to `node_modules` paths:

```
[UNRESOLVED_IMPORT] Could not resolve './lib/ws-events' in libs/shared/src/index.ts
```

Two traps make this easy to get wrong:

1. **`nx build frontend` succeeds without `paths`.** Only `nx serve` fails — the production bundler resolves through the `exports` map successfully, while the dev server's per-request path does not.
2. **A warm cache hides it.** The first `nx serve` after removing `paths` can succeed on cached artifacts; the failure appears only once `.angular/cache` invalidates.

The mappings live in `tsconfig.browser.json` rather than being duplicated across `tsconfig.app.json` and `tsconfig.spec.json`. `paths` resolve relative to the file that declares them, so they are written workspace-rooted (`./libs/shared/src/index.ts`).

**When adding a new library that the frontend imports, add it to `paths` in `tsconfig.browser.json`.** Typecheck will pass without it; `nx serve` will not.

### `nodenext` is set now, and derives module semantics from `package.json`

`nodenext` derives CJS-vs-ESM from `package.json`. All Node packages now have `"type": "module"`, so `nodenext` resolves with ESM semantics — **`.js` extensions are required** on all relative imports.

### `verbatimModuleSyntax` is uniform, and lives in the base

It means "emit imports exactly as written," which is valid and desirable under both `bundler` and `nodenext` resolution. It therefore has one correct value workspace-wide and belongs in `tsconfig.base.json`.

Its history is the reason it took two moves to get there. It started browser-only because CommonJS source **cannot** honour it — measured at 615 `TS1295` errors against the pre-ESM backend. The ESM migration made it viable on Node, at which point it was copied into the Node preset, leaving an identical value in both platform presets: exactly the duplication this document's opening rule forbids. It then moved to the base. Worth remembering as a pattern — an option that is _temporarily_ impossible on one platform can masquerade as platform-varying long after the obstacle is gone.

> **Decorator-metadata hazard — permanent, not migration-only:** `verbatimModuleSyntax` erases `import type`, which prevents `emitDecoratorMetadata` from seeing the type. Any Nest parameter whose type arrives via `import type` has its metadata silently degraded to `[Function]`, with no compile error. Those imports must remain value imports. **Two** distinct failures ride on this:
>
> 1. **Constructor parameters — dependency injection.** Nest resolves dependencies from constructor paramtypes; an erased entry crashes at startup with "can't resolve dependencies of …".
> 2. **`@Body()` / `@MessageBody()` / `@Query()` / `@Param()` — request validation.** These hand their paramtype to `ValidationPipe` as the metatype. Erased, the pipe validates against `Function`, which has no decorated properties, so under `whitelist: true, forbidNonWhitelisted: true` it rejects **every** submitted field with `property <name> should not exist` — and the DTO's own rules never run. This one is nastier than the DI case: the app boots clean and every request with a body fails.
>
> The second was a real outage. Extracting inline DTOs into `*.dto.ts` files and importing them as `type` broke registration, login, password change, account deletion, user search and every room and game WebSocket message at once.
>
> `scripts/check-di-metadata.mjs` guards both, and runs as the last step of `pnpm validate`. It checks constructor paramtypes at every position, and method paramtypes **only** at indices bound to one of those four decorators — a method parameter typed as an interface erases legitimately and nothing reads it (`@ConnectedSocket() client: WebSocket` is the common case, since `ws` exports types only), so flagging those would bury the real defects in noise.
>
> `@typescript-eslint/consistent-type-imports` is **not** applied to the backend for this reason. The exclusion is deliberate: NestJS uses class-as-token DI, and the rule would demand exactly the `import type` that erases the metadata.

### Unused-variable checks belong to ESLint

`noUnusedLocals` and `noUnusedParameters` are deliberately **not** enabled. `eslint.config.mjs` already runs `@typescript-eslint/no-unused-vars` with `^_` ignore patterns at `warn` level. Enabling the compiler equivalents would duplicate the check, remove the escape hatch, and escalate a warning into a hard build failure.

Division of labor: **tsc for type correctness, ESLint for code hygiene.**

### `isolatedDeclarations` is not enabled

It was enabled briefly in September 2026 and removed. Worth recording why, because the name reads like a strictness flag and it is not one.

`isolatedDeclarations` checks nothing. It **restricts what you may write** so that a declaration emitter can produce a `.d.ts` from each file alone, without consulting a type checker — the prerequisite for emitting declarations with a non-tsc tool such as swc or oxc. It is a build-tooling capability, not a correctness feature.

Nothing here emits declarations with anything but `tsc`, and `emitDecoratorMetadata` ties the backend to tsc's emit regardless. The cost was 114 violations:

| Project                 | Violations | Shape                                                    |
| ----------------------- | ---------- | -------------------------------------------------------- |
| `libs/engine`           | 0          | —                                                        |
| `libs/shared`           | 1          | a `RegExp` literal                                       |
| `libs/games/sheepshead` | 4          | zod schemas                                              |
| `libs/db`               | 75         | 16 Drizzle `pgTable` consts, 59 repository methods       |
| `apps/backend`          | 34         | Nest gateway handlers and service methods                |
| `apps/frontend`         | n/a        | `TS5069` — the Angular builder disables declaration emit |

The distribution is the argument: the flag is free where code is plain TypeScript and expensive exactly where it is built on inference-heavy schema builders. Annotating a `pgTable` const means transcribing by hand a deeply parameterized generic that Drizzle exists to infer — at best reproducing it exactly, at worst narrowing it wrong and degrading query inference everywhere downstream.

Nor would repository annotations state a contract that is not already stated. Drizzle row types are local intermediates that die at the controller, which maps them field-by-field into the `@cardquorum/shared` response types — and those are already explicit, at the layer the frontend actually imports:

```ts
async create(…): Promise<RoomResponse> {
  const row = await this.roomService.create(…);
  return { id: row.id, name: row.name /* … */ };
}
```

Same division of labor as the section above. If what you want is explicit return types on public methods, `@typescript-eslint/explicit-module-boundary-types` gives you per-directory scoping, a severity level, and an escape hatch; `isolatedDeclarations` gives you one workspace-wide switch.

**If it is ever reinstated** — adopting swc or oxc for library declaration emit would be the reason — `libs/shared` and `libs/engine` are nearly free today, but both already import zod and sit one exported schema away from the wall `sheepshead` hit.

### Deferred strictness flags

Measured against the real codebase:

| Flag                         | shared | engine | db  | sheepshead | backend | frontend |
| ---------------------------- | ------ | ------ | --- | ---------- | ------- | -------- |
| `noImplicitOverride`         | 0      | 0      | 0   | 0          | 0       | 0        |
| `useUnknownInCatchVariables` | 0      | 0      | 0   | 0          | 0       | 0        |
| `exactOptionalPropertyTypes` | 0      | 0      | 0   | 1          | 14      | 6        |
| `noUncheckedIndexedAccess`   | 0      | 6      | 9   | 71         | 2       | 33       |

**`noUncheckedIndexedAccess` is deferred.** It conflates two very different errors:

```ts
// dealing.ts:15 — Fisher-Yates swap; i and j are provably in range.
[deck[i], deck[j]] = [deck[j], deck[i]]; // ❌ noise
```

```ts
// phases.ts:54 — Record indexed by userID, from replay data in the database.
hands = state.players.map((p) => replayPayload.hands[p.userID]); // ❌ real bug
```

A card engine indexes arrays constantly with provably-valid integers, so roughly 85% of the 121 errors are noise. The genuine bug class is captured instead by guarding the read path (see below), which enforces the invariant permanently regardless of the flag.

**`exactOptionalPropertyTypes` is deferred** — 21 errors, concentrated in the backend. Less noisy than `noUncheckedIndexedAccess`; a reasonable follow-up.

## Data-model correction: validate at the replay boundary

`Record<K, V>` claims every key is present. For data arriving from the database that is false, and TypeScript cannot see the lie without `noUncheckedIndexedAccess`:

```ts
// phases.ts:54 — every player is assumed to have a hand in the replay payload
hands = state.players.map((p) => replayPayload.hands[p.userID]);
```

### Why `Map` is the wrong fix here

`Map.get()` returns `V | undefined` natively, so it looks like the obvious answer. It is not, because **`DealEventPayload` crosses a JSON persistence boundary.**

`handleDeal` returns the payload as `sideEffects`; `GameService` assigns it to `event.payload`; that column is `jsonb`. And `JSON.stringify(new Map(...))` produces `{}` — a `Map` would silently destroy every replay record on write, converting a rare read-time bug into guaranteed total data loss.

The engine treats `sideEffects` as `unknown` and persists it generically, so a plugin-specific in-memory type cannot survive the round trip without the engine knowing about it. It shouldn't have to.

### The correct fix

Keep `Record<number, Card[]>` — it is the accurate description of what JSON round-trips — and **guard explicitly where the untrusted data is read**, in `handleDeal`'s replay branch. The type describes the wire format; the runtime check enforces the invariant.

This is the same principle as the OIDC fix: data crossing a trust boundary gets validated at that boundary, rather than being described by a type that asserts more than the source guarantees.

> **General rule:** a type that is persisted or sent over the wire must stay JSON-representable. `Map`, `Set`, `Date`, and class instances are all appropriate in memory and all wrong in a `jsonb` column. Validate on read instead of reaching for a richer type.

## Changes in this restructure

| Change                                                                                             | Measured cost |
| -------------------------------------------------------------------------------------------------- | ------------- |
| `strict` on `apps/backend`, its spec config, and `apps/backend-e2e`                                | 0 errors      |
| Remove `dom` from Node projects → validate OIDC discovery with zod                                 | 6 errors      |
| Guard the replay-payload read path in `handleDeal`                                                 | small         |
| Un-break `nx run backend:typecheck` (drop `noEmit` / `composite: false`)                           | 0             |
| Consolidate frontend `paths` into `tsconfig.browser.json` (see below — they are **not** redundant) | 0             |
| Raise `@types/node` from 20.19.9 to 24.x                                                           | 0             |
| Drop `skipDefaultLibCheck` (subsumed by `skipLibCheck`)                                            | 0             |
| Frontend spec config `target: es2016` → inherits browser preset                                    | 0             |

**Roughly 6 errors** for the entire restructure — all of them the single OIDC defect below.

Enabling `strict` on the backend costs nothing: it already satisfies every strict check. The two errors that surface when running its spec config are `TS6306`/`TS6310`, not type errors — they are the project-reference graph complaining about the same `noEmit` / `composite: false` defect described below, and they disappear when it is fixed.

### Two defects this exposes

**1. `apps/backend` was never type-checked in isolation.** `tsconfig.app.json` set `noEmit: true` with `composite: false`, which opted it out of the project-reference graph the `@nx/js/typescript` plugin depends on:

```
> nx run backend:typecheck
> echo "The 'typecheck' target is disabled because one or more project
        references set 'noEmit: true' in their tsconfig."
```

The target printed an error and **exited 0**. Since `pnpm validate` runs `typecheck`, this passed CI silently. The webpack build did run `tsc`, so the code was not wholly unchecked — but it was unchecked _non-strictly_, and never on its own.

**2. Unvalidated remote data in the OIDC path.** With `lib: ["dom"]`, `response.json()` returns `Promise<any>`. With Node's own types it correctly returns `Promise<unknown>`. The DOM lib was concealing this:

```ts
// apps/backend/src/auth/auth.service.ts:103
const discovery = await response.json();
this.tokenEndpoint = discovery.token_endpoint; // any
this.jwks = createRemoteJWKSet(new URL(discovery.jwks_uri)); // any
```

Remote JSON determines where OIDC tokens are sent and where JWT signing keys are fetched, with no validation. `zod` is already a dependency; this needs a schema. Six of the eight errors above are this.

## Out of scope

Sequenced as separate projects:

1. **ESM migration — complete.** All Node packages are native ESM, the webpack bundle is replaced by `@nx/js:tsc`, and `verbatimModuleSyntax` is enabled workspace-wide from the base. See [`esm-migration.md`](esm-migration.md) for the design record.

## Adding a new project

1. Pick the platform preset — `node` or `browser`. Extend `tsconfig.base.json` first, then the platform preset.
2. If it is a NestJS project, add `tsconfig.backend.json` **last** — array-form `extends` resolves later entries with higher precedence.
3. Write a leaf config containing only `extends`, `outDir`, `rootDir`, `include`, `exclude`, `references`. `rootDir: "src"` is required on Node projects, not optional — see "Why `rootDir` cannot move into a preset".
4. Add a `references` entry to the root `tsconfig.json`.
5. If the **frontend** will import it, add it to `paths` in `tsconfig.browser.json`. Typecheck passes without this; `nx serve` does not.
6. If it is a library the backend imports at runtime, give it a `package.json` with the dual-condition `exports` map described in [`esm-migration.md`](esm-migration.md) — `@cardquorum/source` for source consumers, `import`/`types` for built output. The `build` target is inferred from that map, not declared.
7. Do not copy compiler options from a sibling. If something seems missing, it belongs in a preset — and if two projects need it, that is the signal it belongs in a shared file, not in both.

## Verifying a config change

`pnpm validate` does not exercise the dev server, and the production build resolves modules differently from `nx serve`. After changing resolution settings, check both:

```bash
pnpm validate
rm -rf .angular/cache && pnpm serve   # cold cache — a warm one hides resolution errors
```

### A warm `.tsbuildinfo` hides compiler-option changes

`tsc --build` skips projects it considers up to date and **replays their stored diagnostics** instead of re-checking them. A change to an option in an _extended_ preset does not reliably invalidate that state, so the flag you just set may not be applied to anything.

This cuts both ways: `pnpm validate` can pass locally while a clean CI checkout fails, and it can keep reporting errors you have already fixed. It is not hypothetical — `isolatedDeclarations` was enabled workspace-wide and left 114 unfixed violations across five projects while `pnpm validate` passed on every developer machine. The same warm-cache trap as `.angular/cache` above, one layer down.

After changing anything in a preset, force a real re-check:

```bash
pnpm exec tsc --build libs/db/tsconfig.lib.json --force   # one project

# everything, cold — what CI actually sees
find . -name '*.tsbuildinfo' -not -path '*/node_modules/*' -delete
pnpm nx run-many -t build typecheck --skip-nx-cache
```

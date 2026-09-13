#!/usr/bin/env node
/**
 * Guards against silently-erased NestJS decorator metadata.
 *
 * THE BUG THIS CATCHES
 *
 * `emitDecoratorMetadata` records each parameter's type in `design:paramtypes`.
 * If a parameter's type arrives through a type-only import — `import type { X }`,
 * or an inline `{ type X }` — TypeScript erases it and emits the placeholder
 * `Function` instead of the class. There is NO compile error. It fails later, at
 * runtime, far from the import that caused it.
 *
 * Two distinct failures ride on that same erasure, and both are checked here.
 *
 * 1. CONSTRUCTOR PARAMETERS — dependency injection
 *
 *    Nest reads constructor paramtypes to resolve dependencies. An erased entry
 *    produces a confusing "can't resolve dependencies of ..." crash at startup.
 *
 * 2. VALIDATED METHOD PARAMETERS — request validation
 *
 *    `@Body()`, `@MessageBody()`, `@Query()` and `@Param()` hand their paramtype
 *    to ValidationPipe as the metatype to validate against. When it is erased,
 *    the pipe validates against `Function` instead of the DTO class, which has no
 *    decorated properties. Under `whitelist: true, forbidNonWhitelisted: true`
 *    that rejects EVERY submitted field:
 *
 *        property username should not exist, property password should not exist
 *
 *    The DTO's own `@IsString()` rules never run. This is worse than the DI case:
 *    the app boots clean and every request with a body fails.
 *
 * WHY THIS IS A SCRIPT AND NOT A GREP
 *
 * A plain `grep design:paramtypes | grep Function` over the build output is
 * useless: most method-level `Function` entries are benign. A parameter typed as
 * an interface erases legitimately and nothing reads it — `@ConnectedSocket()
 * client: WebSocket` is the common case, since `ws` exports types only. Flagging
 * those buries the real defects in noise.
 *
 * The emitted shapes are distinguishable, so we distinguish them:
 *
 *   Constructor:  __decorate([...], GameService);
 *   Method:       __decorate([...], RoomGateway.prototype, "handleJoin", null);
 *
 * Constructors are checked at every parameter. Methods are checked ONLY at the
 * parameter indices bound to a validating decorator, which `__param(N, Body())`
 * records positionally:
 *
 *   __param(0, ConnectedSocket()),                     <- index 0, not checked
 *   __param(1, MessageBody()),                         <- index 1, checked
 *   __metadata("design:paramtypes", [Function, JoinRoomDto]),
 *                                    ^^^^^^^^  benign (interface)
 *                                              ^^^^^^^^^^^ must not be Function
 *
 * WHY `Object` IS NOT FLAGGED
 *
 * `Object` means the parameter was annotated as `object`, not that a type was
 * erased. That is deliberate in the `game <-> room` circular-dependency
 * workaround: those parameters are resolved by an explicit
 * `@Inject(forwardRef(() => X))` token, so paramtypes is unused, and annotating
 * them `object` avoids an ESM temporal-dead-zone crash. `Function` is the
 * erasure signature; `Object` is not.
 *
 * Usage:  node scripts/check-di-metadata.mjs [buildDir]
 * Exits 1 if any constructor or validated parameter has erased metadata.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const buildDir = process.argv[2] ?? 'dist/apps/backend';

/**
 * Parameter decorators whose paramtype ValidationPipe uses as the metatype.
 * An erased type at one of these positions disables validation entirely.
 */
const VALIDATING_PARAM_DECORATORS = ['Body', 'MessageBody', 'Query', 'Param'];

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

/**
 * Collects `__decorate([ ... ], target...);` blocks, tagging each as a
 * constructor or a method by whether its closing line targets `X.prototype`.
 */
function decorateBlocks(source) {
  const lines = source.split('\n');
  const blocks = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (current === null && /__decorate\(\[\s*$/.test(line)) {
      current = { startLine: i + 1, body: [] };
      continue;
    }
    if (current !== null) {
      const close = /^\s*\],\s*(.+?)\);\s*$/.exec(line);
      if (close) {
        const target = close[1].trim();
        // `X.prototype, "method", null` => method decoration.
        const method = /^(.*?)\.prototype,\s*"([^"]+)"/.exec(target);
        blocks.push(
          method
            ? { ...current, kind: 'method', target: `${method[1]}.${method[2]}()` }
            : { ...current, kind: 'constructor', target },
        );
        current = null;
      } else {
        current.body.push({ lineNo: i + 1, text: line });
      }
    }
  }
  return blocks;
}

function paramTypeEntries(block) {
  // The paramtypes array may wrap across several lines.
  const joined = block.body.map((l) => l.text).join(' ');
  const match = /__metadata\("design:paramtypes",\s*\[([\s\S]*?)\]\)/.exec(joined);
  if (!match) return null;
  return match[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Maps parameter index -> decorator name, from the `__param(N, Deco())` calls.
 * Handles both the ESM (`Body()`) and CJS (`(0, common_1.Body)()`) emit shapes.
 */
function validatedParamIndices(block) {
  const joined = block.body.map((l) => l.text).join(' ');
  const indices = new Map();
  const re = /__param\((\d+),\s*(?:\(\s*0\s*,\s*[\w$]+\.)?([\w$]+)\)?\s*\(/g;
  let m;
  while ((m = re.exec(joined)) !== null) {
    if (VALIDATING_PARAM_DECORATORS.includes(m[2])) indices.set(Number(m[1]), m[2]);
  }
  return indices;
}

const files = walk(buildDir);
if (files.length === 0) {
  console.error(`No .js files found under ${buildDir}. Run the build first.`);
  process.exit(1);
}

const diFindings = [];
const validationFindings = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const block of decorateBlocks(source)) {
    const entries = paramTypeEntries(block);
    if (!entries) continue;
    const where = {
      file: relative(process.cwd(), file),
      line: block.startLine,
      target: block.target,
      entries,
    };

    if (block.kind === 'constructor') {
      const erased = entries
        .map((name, index) => ({ name, index }))
        .filter((e) => e.name === 'Function');
      if (erased.length > 0) diFindings.push({ ...where, positions: erased.map((e) => e.index) });
      continue;
    }

    // Method: only the validated parameter positions matter.
    const validated = validatedParamIndices(block);
    for (const [index, decorator] of validated) {
      if (entries[index] === 'Function') {
        validationFindings.push({ ...where, index, decorator });
      }
    }
  }
}

const total = diFindings.length + validationFindings.length;
if (total === 0) {
  console.log(
    `DI metadata OK — ${files.length} files checked, no erased constructor or validated-parameter types.`,
  );
  process.exit(0);
}

if (diFindings.length > 0) {
  console.error(`Erased DI metadata in ${diFindings.length} constructor(s):\n`);
  for (const f of diFindings) {
    console.error(`  ${f.file}:${f.line}  ${f.target}`);
    console.error(`    design:paramtypes = [${f.entries.join(', ')}]`);
    console.error(`    erased at parameter index: ${f.positions.join(', ')}`);
    console.error(
      `    fix: make that parameter's type a VALUE import (drop \`type\`), or give it an explicit @Inject() token\n`,
    );
  }
}

if (validationFindings.length > 0) {
  console.error(`Erased validation metadata on ${validationFindings.length} parameter(s):\n`);
  for (const f of validationFindings) {
    console.error(`  ${f.file}:${f.line}  ${f.target}`);
    console.error(`    design:paramtypes = [${f.entries.join(', ')}]`);
    console.error(`    @${f.decorator}() at parameter index ${f.index} has no runtime type`);
    console.error(
      `    fix: make that DTO a VALUE import (drop \`type\`) — ValidationPipe would otherwise\n` +
        `         reject every field with "property <name> should not exist"\n`,
    );
  }
}

process.exit(1);

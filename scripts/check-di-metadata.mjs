#!/usr/bin/env node
/**
 * Guards against silently-erased NestJS dependency-injection metadata.
 *
 * THE BUG THIS CATCHES
 *
 * `emitDecoratorMetadata` records each constructor parameter's type in
 * `design:paramtypes`, and Nest reads that to resolve dependencies. If a
 * parameter's type arrives through a type-only import — `import type { X }`, or
 * an inline `{ type X }` — TypeScript erases it and emits the placeholder
 * `Function` instead of the class. There is NO compile error. Nest then fails at
 * startup with a confusing "can't resolve dependencies of ..." message, far from
 * the import that caused it.
 *
 * WHY THIS IS A SCRIPT AND NOT A GREP
 *
 * A plain `grep design:paramtypes | grep Function` over the build output is
 * useless here: it matches *method* decoration too. Nest emits paramtypes for
 * every decorated method (`@Get()`, `@SubscribeMessage()`), where a `Function`
 * entry is normal and harmless — request objects and sockets are interfaces, so
 * they legitimately erase. On this codebase that grep reports ~29 hits, none of
 * them defects, which makes it noise that gets ignored.
 *
 * The emitted shapes are distinguishable, so we distinguish them:
 *
 *   Constructor (what Nest DI uses):  __decorate([...], GameService);
 *   Method (irrelevant to DI):        __decorate([...], RoomGateway.prototype, "handleJoin", null);
 *
 * Only the first form is checked.
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
 * Exits 1 if any constructor has erased metadata.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const buildDir = process.argv[2] ?? 'dist/apps/backend';

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
 * Collects `__decorate([ ... ], target...);` blocks, keeping only those whose
 * closing line targets a bare class rather than `X.prototype`.
 */
function classDecorateBlocks(source) {
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
        // `X.prototype, "method", null` => method/property decoration, not DI.
        if (!close[1].includes('.prototype')) {
          blocks.push({ ...current, target: close[1].trim() });
        }
        current = null;
      } else {
        current.body.push({ lineNo: i + 1, text: line });
      }
    }
  }
  return blocks;
}

function erasedParamTypes(block) {
  // The paramtypes array may wrap across several lines.
  const joined = block.body.map((l) => l.text).join(' ');
  const match = /__metadata\("design:paramtypes",\s*\[([\s\S]*?)\]\)/.exec(joined);
  if (!match) return null;

  const entries = match[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const erased = entries
    .map((name, index) => ({ name, index }))
    .filter(({ name }) => name === 'Function');

  return erased.length > 0 ? { entries, erased } : null;
}

const files = walk(buildDir);
if (files.length === 0) {
  console.error(`No .js files found under ${buildDir}. Run the build first.`);
  process.exit(1);
}

const findings = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  for (const block of classDecorateBlocks(source)) {
    const result = erasedParamTypes(block);
    if (result) {
      findings.push({
        file: relative(process.cwd(), file),
        line: block.startLine,
        target: block.target,
        entries: result.entries,
        positions: result.erased.map((e) => e.index),
      });
    }
  }
}

if (findings.length === 0) {
  console.log(`DI metadata OK — ${files.length} files checked, no erased constructor types.`);
  process.exit(0);
}

console.error(`Erased DI metadata in ${findings.length} constructor(s):\n`);
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  ${f.target}`);
  console.error(`    design:paramtypes = [${f.entries.join(', ')}]`);
  console.error(`    erased at parameter index: ${f.positions.join(', ')}`);
  console.error(
    `    fix: make that parameter's type a VALUE import (drop \`type\`), or give it an explicit @Inject() token\n`,
  );
}
process.exit(1);

#!/usr/bin/env node
/**
 * build-cleanup — post-Vite build pass that removes any `.map` files
 * (and `.map`-named directories) Rollup emitted into `dist/`.
 *
 * Story 1.1 source-map policy (E01 S01.12 ship gate): `find dist -name
 * '*.map' | wc -l` MUST equal zero. The `build.sourcemap = 'hidden'`
 * setting in `vite.config.ts` is the structural source of this property
 * (maps are emitted locally, no source-map reference comment reaches
 * the deployed JS), but `hidden` does emit the `.map` file itself.
 * Rather than fight the Vite emitter across versions, we delete the
 * maps after Vite finishes. Maps live only on the maintainer's build
 * machine; they never reach the CDN.
 *
 * Robustness:
 *   - try/catch around unlinkSync with one retry after a short delay
 *     (Windows Defender / VS Code file watcher may hold an open handle).
 *   - Tightens the predicate to `*.js.map`, `*.css.map`, `*.map.json`,
 *     bare `.map` files, and `.map`-named directories (Rollup emits
 *     `.map` directories for code-split chunks).
 *   - Symlink-safe: uses realpath to skip cycles.
 */

import {
  readdirSync,
  statSync,
  unlinkSync,
  rmdirSync,
  existsSync,
  realpathSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const distDir = join(repoRoot, 'dist');

const RETRY_DELAY_MS = 100;
const MAX_RETRIES = 1;

function isMapArtifact(name) {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.map') ||
    lower.endsWith('.js.map') ||
    lower.endsWith('.css.map') ||
    lower.endsWith('.map.json')
  );
}

function safeUnlink(full, removed) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      unlinkSync(full);
      removed.push(full);
      return;
    } catch (err) {
      const code = err && err.code;
      if (
        attempt < MAX_RETRIES &&
        (code === 'EBUSY' || code === 'EPERM' || code === 'EACCES')
      ) {
        attempt++;
        // Synchronous sleep — small; only one retry.
        const end = Date.now() + RETRY_DELAY_MS;
        // eslint-disable-next-line no-empty
        while (Date.now() < end) {}
        continue;
      }
      console.warn(`[build-cleanup] could not remove ${full} (${code ?? err.message})`);
      return;
    }
  }
}

function safeRmdir(full, removed) {
  try {
    rmdirSync(full);
    removed.push(full + '/');
  } catch {
    // Non-empty or not a directory — leave it; the .map-file predicate
    // already handles the contents.
  }
}

function walk(dir, seen, removed, kept) {
  let real;
  try {
    real = realpathSync(dir);
  } catch {
    return;
  }
  if (seen.has(real)) return;
  seen.add(real);
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (isMapArtifact(entry)) {
        // Try rmdir first; if it has .map contents, recurse to clean them.
        walk(full, seen, removed, kept);
        safeRmdir(full, removed);
      } else {
        walk(full, seen, removed, kept);
      }
    } else if (isMapArtifact(entry)) {
      safeUnlink(full, removed);
    } else {
      kept.push(full);
    }
  }
}

if (!existsSync(distDir)) {
  console.error(
    `[build-cleanup] ${distDir} not found. Run \`npm run build\` first.`,
  );
  process.exit(1);
}

const removed = [];
const kept = [];
walk(distDir, new Set(), removed, kept);

console.log(
  `[build-cleanup] removed ${removed.length} source-map artifact(s) from dist/`,
);
if (removed.length > 0) {
  for (const f of removed) console.log(`  - ${f}`);
}
process.exit(0);
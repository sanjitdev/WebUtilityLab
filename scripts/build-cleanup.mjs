#!/usr/bin/env node
/**
 * build-cleanup — post-Vite build pass that removes any `.map` files
 * (and `.map`-named directories) Rollup emitted into `dist/`, AND the
 * `dist/examples/` subtree that Vite's default publicDir copies
 * verbatim from `public/examples/`.
 *
 * Story 1.1 source-map policy (E01 S01.3 ship gate): `find dist -name
 * '*.map' | wc -l` MUST equal zero. The `build.sourcemap = 'hidden'`
 * setting in `vite.config.ts` is the structural source of this property
 * (maps are emitted locally, no source-map reference comment reaches
 * the deployed JS), but `hidden` does emit the `.map` file itself.
 * Rather than fight the Vite emitter across versions, we delete the
 * maps after Vite finishes. Maps live only on the maintainer's build
 * machine; they never reach the CDN.
 *
 * S03.8 Privacy Baseline: Vite copies `public/examples/sample.csv`
 * into `dist/examples/sample.csv` by default. The fixture is bundled
 * inline as a TS string constant (no fetch at runtime); the dist copy
 * would ship the literal bytes to the CDN and re-introduce the network
 * surface S03.8 removed. Build-cleanup strips the entire `dist/examples/`
 * subtree.
 *
 * Robustness:
 *   - try/catch around unlinkSync with one retry after a short delay
 *     (Windows Defender / VS Code file watcher may hold an open handle).
 *   - Tightens the predicate to `*.js.map`, `*.css.map`, `*.map.json`,
 *     bare `.map` files, and `.map`-named directories (Rollup emits
 *     `.map` directories for code-split chunks).
 *   - Symlink-safe: uses realpath to skip cycles.
 *
 * Testability (Story 1.3):
 *   - `isMapArtifact`, `walk`, `safeUnlink`, `safeRmdir`, `RETRY_DELAY_MS`,
 *     `MAX_RETRIES` are exported so Vitest can import them without
 *     triggering the top-level invocation.
 *   - The top-level IIFE runs only when the module is the entry point
 *     (`import.meta.url === pathToFileURL(process.argv[1]).href`).
 *     Importing the module from a test spawns no processes, makes no
 *     filesystem writes to `dist/`, and exits with the test's own code.
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
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const distDir = join(repoRoot, 'dist');

const RETRY_DELAY_MS = 100;
const MAX_RETRIES = 1;

export function isMapArtifact(name) {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.map') ||
    lower.endsWith('.js.map') ||
    lower.endsWith('.css.map') ||
    lower.endsWith('.map.json')
  );
}

/**
 * S03.8: predicate for the example CSV that Vite's default publicDir
 * behavior copies verbatim to dist/examples/sample.csv. The fixture is
 * bundled inline (no fetch at runtime) per the Privacy Baseline; the
 * literal copy in dist/ would ship the fixture bytes to the CDN and
 * silently re-introduce the network surface that S03.8 was designed to
 * remove. Build-cleanup strips this directory after Vite emits.
 *
 * Returns true for any file under `dist/examples/`, irrespective of
 * basename — the whole subtree is dropped (it has no other purpose;
 * the fixture's only destination is the inlined TS constant).
 *
 * The argument is normalized to forward slashes before the predicate
 * check so Windows paths (backslashes from `path.join`) match the
 * `/examples/sample.csv` suffix.
 */
export function isExampleFixtureArtifact(name) {
  const normalized = String(name).replace(/\\/g, '/').toLowerCase();
  return (
    normalized === 'examples' ||
    normalized === 'examples/sample.csv' ||
    normalized.endsWith('/examples') ||
    normalized.endsWith('/examples/sample.csv')
  );
}

export function safeUnlink(full, removed) {
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

export function safeRmdir(full, removed) {
  try {
    rmdirSync(full);
    removed.push(full + '/');
  } catch {
    // Non-empty or not a directory — leave it; the .map-file predicate
    // already handles the contents.
  }
}

/**
 * Recursively walk `dir`, removing every `.map` artifact. Collects the
 * removed paths into `removed` and the kept paths into `kept`.
 *
 * @param {string} dir - directory to walk
 * @param {Set<string>} seen - realpath cache for symlink-cycle guard
 * @param {string[]} removed - out-param: removed `.map` paths
 * @param {string[]} kept - out-param: non-`.map` paths encountered
 */
export function walk(dir, seen, removed, kept) {
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
      } else if (isExampleFixtureArtifact(entry)) {
        // S03.8: Vite's default publicDir copies public/examples/sample.csv
        // into dist/examples/sample.csv. The fixture is bundled inline via
        // scripts/inline-example.mjs (S03.8); the dist/ copy would re-introduce
        // the network surface that S03.8 was designed to remove. Recurse into
        // the subtree to strip the file (so the subsequent rmdir succeeds),
        // then remove the now-empty directory.
        walk(full, seen, removed, kept);
        safeRmdir(full, removed);
      } else {
        walk(full, seen, removed, kept);
      }
    } else if (isMapArtifact(entry)) {
      safeUnlink(full, removed);
    } else if (isExampleFixtureArtifact(full)) {
      // S03.8: file-mode paranoia for the flat-layout case
      // (public/examples/foo.csv → dist/examples/foo.csv with no nested dir).
      safeUnlink(full, removed);
    } else {
      kept.push(full);
    }
  }
}

/**
 * Run the cleanup pass against `targetDir`. Standalone entry point used
 * by the CLI invocation and by tests.
 *
 * @param {string} [targetDir=distDir] - directory to clean (defaults to
 *   `<repoRoot>/dist`). Tests pass a tempdir; the CLI passes nothing.
 * @returns {{ removed: string[]; kept: string[]; distMissing: boolean }}
 */
export function cleanDist(targetDir = distDir) {
  if (!existsSync(targetDir)) {
    return { removed: [], kept: [], distMissing: true };
  }
  const removed = [];
  const kept = [];
  walk(targetDir, new Set(), removed, kept);
  return { removed, kept, distMissing: false };
}

// Entry-point gate: only execute the CLI side-effects when this module
// is the script invoked by Node. Importing the module from Vitest
// skips this block, so tests see a pure module with no side-effects.
function isMainEntry() {
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
}

if (isMainEntry()) {
  if (!existsSync(distDir)) {
    console.error(
      `[build-cleanup] ${distDir} not found. Run \`npm run build\` first.`,
    );
    process.exit(1);
  }

  const { removed } = cleanDist(distDir);

  console.log(
    `[build-cleanup] removed ${removed.length} source-map / example-fixture artifact(s) from dist/`,
  );
  if (removed.length > 0) {
    for (const f of removed) console.log(`  - ${f}`);
  }
  process.exit(0);
}

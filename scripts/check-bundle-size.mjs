#!/usr/bin/env node
/**
 * check-bundle-size — Bundle budget gate (PRD architecture promise,
 * E01 S01.9 / Arch Spine §"What ships").
 *
 * The architecture promises that the deployed `dist/` will transfer as
 * ≤ 200 KB gzipped. This script makes that promise structural: it walks
 * `dist/`, gzips every file with the same algorithm Cloudflare's edge
 * uses, sums the gzipped bytes, and exits non-zero if the budget is
 * exceeded. A bloater PR cannot merge.
 *
 * Why `gzipSync` at level 9 and not brotli / raw bytes:
 *   - Cloudflare's edge serves with gzip (not brotli) for HTML/JS/CSS
 *     by default. Level 9 is the max compression level and matches
 *     what most CDNs do at edge.
 *   - Brotli would understate the actually-served size and let a
 *     bloater pass that the CDN would reject.
 *   - Raw bytes would overstate served size and reject a build that's
 *     actually fine.
 *
 * Why we honor `.map` artifacts even though they should be absent:
 *   Defense in depth. The build-cleanup pass (scripts/build-cleanup.mjs,
 *   invoked from `npm run build`) is what guarantees zero `.map` files
 *   in `dist/`. If that pass regresses, the bundle budget would measure
 *   any leaked `.map` — inflating the number for no real reason. The
 *   predicate filter keeps the budget focused on what the user actually
 *   downloads. (The structural assertion that NO `.map` ships is
 *   `find dist -name '*.map' | wc -l` = 0, wired into CI separately.)
 *
 * Implementation notes:
 *   - Entry-point gate: only execute when this module is the script
 *     invoked by Node. Importing from Vitest runs no side-effects.
 *   - Pure functions (`collectFiles`, `measureGzipped`, `summarize`,
 *     `formatReport`) are exported for testability.
 *   - Symlink / cycle guard: `collectFiles` tracks visited realpaths
 *     so a symlinked subdir under `dist/` doesn't loop.
 *   - Reuses `isMapArtifact` from `scripts/build-cleanup.mjs` so
 *     "what counts as a source-map artifact" stays in one place.
 */

import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  realpathSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { isMapArtifact } from './build-cleanup.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const distDir = join(repoRoot, 'dist');

/** Load-bearing architecture promise: dist/ transfer size in bytes. */
export const BUNDLE_BUDGET_BYTES = 200 * 1024;

/**
 * Recursively walk `dir`, collecting every regular file. Symlink-cycle
 * safe via `realpathSync` + `seen` set. Returns relative paths (from
 * `baseDir`) alongside absolute paths for reading.
 *
 * @param {string} dir - directory to walk
 * @param {string} [baseDir] - root for relative paths (defaults to `dir`)
 * @param {Array<{ path: string; full: string }>} [acc]
 * @param {Set<string>} [seen] - realpath cache for cycle guard
 * @returns {Array<{ path: string; full: string }>}
 */
export function collectFiles(dir, baseDir = dir, acc = [], seen = new Set()) {
  if (!existsSync(dir)) return acc;
  let real;
  try {
    real = realpathSync(dir);
  } catch {
    return acc;
  }
  if (seen.has(real)) return acc;
  seen.add(real);
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
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
      collectFiles(full, baseDir, acc, seen);
    } else if (st.isFile()) {
      acc.push({ path: relative(baseDir, full), full });
    }
  }
  return acc;
}

/**
 * Measure gzipped size for every file in `files`. Skips any file
 * whose name matches the source-map predicate. The skip is
 * load-bearing (defense in depth — see file header).
 *
 * @param {Array<{ path: string; full: string }>} files
 * @returns {Array<{ path: string; rawBytes: number; gzBytes: number }>}
 */
export function measureGzipped(files) {
  const out = [];
  for (const f of files) {
    // Use the basename for the predicate (matches build-cleanup's
    // contract). For nested paths like `assets/index-X.js`, the
    // predicate sees just the final component.
    const parts = f.path.split(/[\\/]/);
    const name = parts[parts.length - 1];
    if (isMapArtifact(name)) continue;
    const buf = readFileSync(f.full);
    const gz = gzipSync(buf, { level: 9 });
    out.push({ path: f.path, rawBytes: buf.length, gzBytes: gz.length });
  }
  return out;
}

/**
 * Sum raw + gzipped bytes; decide within-budget / overage.
 *
 * @param {Array<{ rawBytes: number; gzBytes: number }>} measurements
 * @param {number} budgetBytes
 */
export function summarize(measurements, budgetBytes) {
  let totalRaw = 0;
  let totalGz = 0;
  for (const m of measurements) {
    totalRaw += m.rawBytes;
    totalGz += m.gzBytes;
  }
  const withinBudget = totalGz <= budgetBytes;
  const overageBytes = withinBudget ? 0 : totalGz - budgetBytes;
  return { totalRaw, totalGz, withinBudget, overageBytes };
}

/**
 * Format the OK/FAIL report. Always reports `budgetBytes` for context;
 * the FAIL branch sorts entries descending by gzBytes and groups
 * sub-1 KB entries into a footer line so the output stays scannable.
 *
 * @param {Array<{ path: string; rawBytes: number; gzBytes: number }>} measurements
 * @param {{ totalRaw: number; totalGz: number; withinBudget: boolean; overageBytes: number }} summary
 * @param {number} budgetBytes
 */
export function formatReport(measurements, summary, budgetBytes) {
  const status = summary.withinBudget ? 'OK' : 'FAIL';
  const lines = [];
  const totalKb = (bytes) => (bytes / 1024).toFixed(2);
  const overageSuffix = summary.withinBudget
    ? ''
    : ` · overage=${totalKb(summary.overageBytes)} KB`;
  lines.push(
    `[check-bundle-size] ${status} · ${measurements.length} files · TOTAL raw=${totalKb(summary.totalRaw)} KB · TOTAL gz=${totalKb(summary.totalGz)} KB · budget=${totalKb(budgetBytes)} KB${overageSuffix}`,
  );
  if (measurements.length > 0) {
    // Sort descending by gzBytes for the breakdown.
    const sorted = [...measurements].sort((a, b) => b.gzBytes - a.gzBytes);
    const KB = 1024;
    const big = sorted.filter((m) => m.gzBytes >= KB);
    const small = sorted.filter((m) => m.gzBytes < KB);
    for (const m of big) {
      const gzKb = totalKb(m.gzBytes);
      const rawKb = totalKb(m.rawBytes);
      lines.push(`  ${m.path}  ${gzKb} KB gz (raw ${rawKb} KB)`);
    }
    if (small.length > 0) {
      const sumSmall = small.reduce((acc, m) => acc + m.gzBytes, 0);
      const gzKb = totalKb(sumSmall);
      lines.push(`  (${small.length} other files)  ${gzKb} KB gz`);
    }
  }
  return lines.join('\n');
}

// Entry-point gate: only execute the CLI side-effects when this module
// is the script invoked by Node. Importing from Vitest skips this block.
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
      `[check-bundle-size] ${distDir} not found. Run \`npm run build\` first.`,
    );
    process.exit(1);
  }
  const files = collectFiles(distDir);
  // Fail closed on an empty dist/ — a build that produced zero
  // deployable files is a regression, not a passing budget. Catches
  // `npm run build` that silently produced nothing (e.g. a Vite
  // error swallowed by a CI step).
  if (files.length === 0) {
    console.error(
      `[check-bundle-size] FAIL — no files found in ${distDir}. Run \`npm run build\` first.`,
    );
    process.exit(1);
  }
  const measurements = measureGzipped(files);
  const summary = summarize(measurements, BUNDLE_BUDGET_BYTES);
  const report = formatReport(measurements, summary, BUNDLE_BUDGET_BYTES);
  if (summary.withinBudget) {
    console.log(report);
    process.exit(0);
  } else {
    console.error(report);
    process.exit(1);
  }
}

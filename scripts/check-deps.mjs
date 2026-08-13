#!/usr/bin/env node
/**
 * check-deps — Privacy Baseline dependency-tree gate (PRD FR-23, E01 S01.7).
 *
 * The static `audit-privacy.mjs` walk catches runtime `fe` + `tch()`
 * calls in source and bundle. The behavioral `audit-behavior.mjs`
 * catches live runtime requests. This script is the THIRD layer: it
 * walks the full installed dependency tree (`npm ls --all --json`) and
 * asserts that no package is on a hand-maintained denylist of known
 * "phones home" packages.
 *
 * Why hand-maintained: the threat model is "a future package author adds
 * telemetry to a benign-looking library." Auto-detection would
 * false-positive on UI libraries that use `fe` + `tch()` for normal XHR, on
 * build tools that legitimately talk to the network (e.g. `playwright`
 * — and we WANT Playwright for the behavioral audit, so it must NOT be
 * on the denylist), and on test runners. A small, conservative list
 * authored by the maintainer catches the threat without false positives.
 *
 * Allow-flag: `--allow=<pattern>` is a repeatable one-off escape hatch
 * for cases where a contributor needs to add a denylisted package
 * temporarily (e.g. for a feature flag or a planned opt-out). The
 * denylist is the persistent record; the flag is the per-invocation
 * exception. Entries are NOT persisted by the script.
 *
 * Implementation notes:
 *   - Entry-point gate: only execute when this module is the script
 *     invoked by Node. Importing from Vitest runs no side-effects.
 *   - Pure functions (`parseDenyList`, `walkDeps`, `findDenylisted`,
 *     `formatReport`, `parseAllowFlags`) are exported for testability.
 *   - Symlink / cycle guard: `walkDeps` tracks visited `name@version`
 *     pairs (not just names) so both `dependencies` and `peer` edges
 *     don't infinite-loop.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const denyListPath = join(here, 'check-deps-denylist.json');

const NPM_LS_TIMEOUT_MS = 30_000;

/**
 * First-run denylist template. Written to disk if the file is missing
 * so future maintainers see the schema. Mirrors the convenience
 * behavior of `scripts/audit-behavior.mjs:loadAllowlist`.
 */
const EMPTY_DENYLIST = JSON.stringify({ version: 1, packages: {} }, null, 2) + '\n';

/**
 * Parse the hand-maintained denylist. Creates the file (empty) on first
 * run. Returns a `Map<name, { reason, added, added_by, evidence }>`.
 */
export function parseDenyList(path = denyListPath) {
  if (!existsSync(path)) {
    try {
      writeFileSync(path, EMPTY_DENYLIST, 'utf8');
    } catch {
      // best-effort
    }
    return new Map();
  }
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return new Map();
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return new Map();
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.packages || typeof parsed.packages !== 'object') {
    return new Map();
  }
  const out = new Map();
  for (const [name, entry] of Object.entries(parsed.packages)) {
    if (typeof entry === 'object' && entry !== null) {
      out.set(name, entry);
    }
  }
  return out;
}

/**
 * Walk the deps subgraph rooted at `node` and accumulate every
 * (name, version) pair into `acc`. Handles circular references via a
 * `seen` set keyed by `name@version`. Treats `peer` references as edges
 * (visit but don't recurse into them) to avoid walking the full peer
 * subgraph of large frameworks.
 *
 * `node` may be either:
 *   - The root npm-ls object (`{ name, version, dependencies: {...} }`).
 *   - A child node under `dependencies` (`{ version, dependencies: {...} }`)
 *     where the name is the parent's key. We pass the name down via
 *     `childName` so nested entries can build a `name@version` key.
 */
export function walkDeps(node, acc, seen = new Set(), childName) {
  if (!node || typeof node !== 'object') return acc;
  const name = node.name ?? childName;
  const version = node.version;
  if (typeof name === 'string' && typeof version === 'string') {
    const key = `${name}@${version}`;
    if (seen.has(key)) return acc;
    seen.add(key);
    acc.add(key);
  }
  const deps = node.dependencies;
  if (deps && typeof deps === 'object') {
    for (const [key, child] of Object.entries(deps)) {
      walkDeps(child, acc, seen, key);
    }
  }
  // Peers: record at every level (peer edges are part of the dep graph)
  // but don't recurse into the peer's own tree — a peer's transitive
  // tree would re-enter the same packages via the parent's
  // dependencies, which the cycle guard already prevents. Recording the
  // name + spec is enough to check against the denylist.
  const peers = node.peerDependencies;
  if (peers && typeof peers === 'object') {
    for (const [peerName, peerSpec] of Object.entries(peers)) {
      // Defensive: skip peers whose spec isn't a string (some npm
      // versions emit `undefined` or `*` for "any" — those don't form
      // a meaningful `name@version` key).
      if (typeof peerSpec !== 'string') continue;
      const peerKey = `${peerName}@${peerSpec}`;
      if (!seen.has(peerKey)) {
        seen.add(peerKey);
        acc.add(peerKey);
      }
    }
  }
  return acc;
}

/**
 * Find every package in the tree that appears on the denylist.
 * `allowRegexes` is an array of RegExp; any `name@version` matching is
 * suppressed (the allow-flag escape hatch).
 */
export function findDenylisted(tree, denyMap, allowRegexes = []) {
  const all = walkDeps(tree, new Set());
  /** @type {{name: string, version: string, reason: string}[]} */
  const offending = [];
  for (const nv of all) {
    const at = nv.lastIndexOf('@');
    if (at < 1) continue;
    const name = nv.slice(0, at);
    const version = nv.slice(at + 1);
    if (allowRegexes.some((re) => re.test(nv))) continue;
    const entry = denyMap.get(name);
    if (entry) {
      offending.push({
        name,
        version,
        reason: entry.reason ?? 'denylisted',
      });
    }
  }
  return offending;
}

/**
 * Pretty-print the violation list for stdout/stderr. Offending sorted
 * by name for deterministic output.
 */
export function formatReport(offending, totalCount) {
  offending.sort((a, b) => a.name.localeCompare(b.name));
  const lines = [];
  lines.push(`[check-deps] scanned ${totalCount} package(s) in dep tree`);
  if (offending.length === 0) {
    lines.push(`[check-deps] OK · 0 denylisted`);
    return lines.join('\n');
  }
  lines.push(`[check-deps] FAIL · ${offending.length} denylisted package(s) found:`);
  for (const o of offending) {
    lines.push(`  - ${o.name}@${o.version}`);
    lines.push(`      reason: ${o.reason}`);
  }
  return lines.join('\n');
}

/**
 * Parse `--allow=<pattern>` flags from `argv`. Repeatable. Returns an
 * array of compiled RegExp; invalid regexes are skipped (with a stderr
 * warning) so a flag typo doesn't crash the gate.
 */
export function parseAllowFlags(argv) {
  /** @type {RegExp[]} */
  const out = [];
  for (const arg of argv) {
    if (typeof arg !== 'string') continue;
    if (!arg.startsWith('--allow=')) continue;
    const pattern = arg.slice('--allow='.length);
    if (!pattern) continue;
    try {
      out.push(new RegExp(pattern));
    } catch (err) {
      console.error(`[check-deps] WARN: invalid --allow pattern ${JSON.stringify(pattern)}: ${err.message}`);
    }
  }
  return out;
}

/**
 * S01.10 — Read the `versionConstraints` map from the denylist JSON.
 * This is the second dep-tree layer: it catches packages whose
 * telemetry behavior changed in a specific version range (e.g. a
 * benign `pkg@1.2.3` that became `pkg@1.2.4`-with-telemetry in a
 * patch release). S01.7's `parseDenyList` catches packages by name
 * regardless of version; this catches behavior changes within a
 * version range.
 *
 * Accepts both `version: 1` (legacy, no `versionConstraints` field)
 * and `version: 2` (current). Returns an empty Map for either case
 * if the field is missing.
 *
 * Returns a `Map<name, { reason, blockedVersions?, allowedVersions? }>`.
 * The `blockedVersions` and `allowedVersions` strings are passed
 * through to `parseVersionConstraint()` at check time.
 */
export function parseVersionConstraints(path = denyListPath) {
  if (!existsSync(path)) return new Map();
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return new Map();
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return new Map();
  }
  if (!parsed || typeof parsed !== 'object') return new Map();
  const raw = parsed.versionConstraints;
  if (!raw || typeof raw !== 'object') return new Map();
  const out = new Map();
  for (const [name, entry] of Object.entries(raw)) {
    if (entry && typeof entry === 'object') {
      out.set(name, entry);
    }
  }
  return out;
}

/**
 * Run `npm ls --all --json` and return the parsed tree. Returns `null`
 * on failure (timeout, non-zero exit, parse error). The script exits
 * 1 if this fails — npm ls is the source of truth.
 */
function runNpmLs(cwd) {
  // Windows: `npm` resolves to `npm.cmd`, which `spawnSync` cannot find
  // without `shell: true` (or by setting the executable to `npm.cmd`
  // directly). `shell: true` is the portable fix that also works on macOS
  // and Linux shells, at the cost of one extra fork. The timeout still
  // bounds the wall-clock cost.
  const result = spawnSync('npm', ['ls', '--all', '--json'], {
    cwd,
    encoding: 'utf8',
    timeout: NPM_LS_TIMEOUT_MS,
    shell: process.platform === 'win32',
    // `npm ls` exits non-zero when there are missing/invalid entries
    // but still emits valid JSON on stdout. We want the JSON either way.
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) {
    console.error(`[check-deps] npm ls failed to spawn: ${result.error.message}`);
    return null;
  }
  // Diagnostic: log exit status + signal even on success so future
  // CI annotations (`::error::`) have a breadcrumb. Non-zero exit
  // with empty stdout is almost always a timeout or a missing npm.
  if (result.status !== 0) {
    console.error(
      `[check-deps] npm ls exited ${result.status} signal=${result.signal ?? 'none'} timeout=${result.signal === 'SIGTERM' ? 'yes' : 'no'}`,
    );
  }
  // On Windows + shell:true, npm may write JSON to stderr (the npm.cmd
  // shim routes stdout through a wrapper that emits to stderr). Merge
  // both streams and parse from the largest JSON block we can find.
  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  const stderr = typeof result.stderr === 'string' ? result.stderr : '';
  const merged = stdout + (stdout ? '' : stderr);
  const startIdx = merged.indexOf('{');
  const endIdx = merged.lastIndexOf('}');
  if (startIdx < 0 || endIdx <= startIdx) {
    console.error('[check-deps] npm ls produced no JSON object');
    if (stderr.trim()) console.error(`  stderr: ${stderr.trim().split('\n').slice(0, 5).join('\n  ')}`);
    return null;
  }
  const jsonText = merged.slice(startIdx, endIdx + 1);
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    console.error(`[check-deps] npm ls output not valid JSON: ${err.message}`);
    return null;
  }
  return parsed;
}

async function main() {
  const log = (msg) => console.log(`[check-deps] ${msg}`);
  const denyMap = parseDenyList();
  log(`denylist loaded: ${denyMap.size} package(s)`);

  // Fail-closed: an empty denylist is a misconfiguration, not "everything
  // is fine." A contributor who accidentally deletes the file (or a bot
  // that resets it) would otherwise get a passing CI with zero gate.
  if (denyMap.size === 0) {
    console.error(
      '[check-deps] FAIL — denylist is empty.\n' +
        '  This is a misconfiguration: an empty denylist disables the gate.\n' +
        '  Restore scripts/check-deps-denylist.json (see git history) or\n' +
        '  add an explicit package entry before re-running.',
    );
    process.exit(1);
  }

  const allowRegexes = parseAllowFlags(process.argv);
  if (allowRegexes.length > 0) {
    log(`--allow: ${allowRegexes.length} pattern(s) (these are NOT persisted)`);
  }

  const tree = runNpmLs(repoRoot);
  if (!tree) {
    process.exit(1);
  }

  const offending = findDenylisted(tree, denyMap, allowRegexes);
  const totalWalk = walkDeps(tree, new Set());
  // The format-report helper takes the total count separately so the
  // summary line stays accurate even when the denylist is empty.
  const report = formatReport(offending, totalWalk.size);
  // Print multi-line report via process.stdout (preserves ordering).
  process.stdout.write(report + '\n');
  if (offending.length > 0) {
    process.exit(1);
  }
}

/** Entry-point gate: only execute when this module is the script invoked by Node. */
function isMainEntry() {
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
}

if (isMainEntry()) {
  main();
}

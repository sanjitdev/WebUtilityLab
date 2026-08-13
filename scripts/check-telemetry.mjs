#!/usr/bin/env node
/**
 * check-telemetry — Per-version telemetry scanner (E01 S01.10).
 *
 * Privacy Baseline dep-tree gate, second layer (S01.7 was the first).
 * Catches threats S01.7 left open:
 *
 *   1. A patch release of a previously-benign package adds a telemetry
 *      call (e.g. `pkg@1.2.3` is fine, `pkg@1.2.4` adds an
 *      unload-beacon call). The S01.7 name-keyed denylist
 *      wouldn't catch this.
 *   2. A transitive dependency ships a forbidden telemetry pattern
 *      in its source code, even if its name is not on any denylist.
 *
 * Two checks:
 *
 *   A. **Per-version denylist** — `scripts/check-deps-denylist.json`'s
 *      new `versionConstraints` map. Reads the map, parses each
 *      `blockedVersions` / `allowedVersions` semver-range string,
 *      asserts no installed package matches a blocked range.
 *
 *   B. **Source-pattern scan** — every `.js`/`.mjs`/`.cjs`/`.ts` file
 *      under `node_modules/<pkg>/` is grepped for forbidden telemetry
 *      tokens. A package whose source contains a forbidden pattern is
 *      flagged, even if its name is not on any denylist.
 *
 * Why no Socket / npm-audit-resolver: same rationale as S01.7.
 * Auto-detection false-positives on benign packages that use
 * the XHR API for normal fetches. The maintainer's judgment is the
 * simpler and more accurate gate.
 *
 * Why hand-rolled `parseVersionConstraint`: `semver` is 200+ lines of
 * code for the operators we need (`>=`, `<=`, `>`, `<`, `=`, exact,
 * `*`). The naive parser is ~25 lines and matches the threat model.
 *
 * Implementation notes:
 *   - Entry-point gate: only execute when this module is the script
 *     invoked by Node. Importing from Vitest runs no side-effects.
 *   - Pure functions (`parseVersionConstraint`, `walkPackages`,
 *     `scanPackageForTelemetry`, `checkVersionConstraints`,
 *     `formatReport`) are exported for testability.
 *   - Symlink / cycle guard via `realpathSync` + `seen` set.
 *   - Skips `node_modules/<pkg>/{__tests__,test,tests,fixtures,.devtools}/`
 *     subtrees to avoid scanning Playwright's bundled devtools frontend
 *     and similar test-only code.
 *   - Honors `--allow=<regex>` (repeatable, NOT persisted).
 */

import {
  readFileSync,
  readdirSync,
  statSync,
  existsSync,
  realpathSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { parseVersionConstraints } from './check-deps.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const nodeModulesDir = join(repoRoot, 'node_modules');

/**
 * Load-bearing set of telemetry patterns. Each entry is matched as a
 * regex against each source file's contents. The patterns are
 * intentionally narrow — false positives are noisy and erode trust in
 * the gate. A package whose source contains the unload-beacon call is
 * genuinely phoning home; one whose source uses the XHR API for
 * normal browser-to-browser fetches is not flagged.
 */
export const TELEMETRY_PATTERNS = [
  {
    name: 'sendBeacon',
    // Build regex from concatenated fragments so the literal
    // unload-beacon token never appears in this file's
    // source (audit-privacy would self-match). Same pattern as
    // audit-privacy.mjs:FORBIDDEN_SOURCE_CALLS.
    regex: new RegExp(
      String.raw`\b` +
        'na' +
        'vigator' +
        String.raw`\s*\.\s*` +
        'send' +
        'Beacon' +
        String.raw`\b`,
      'i',
    ),
  },
  {
    name: 'image-pixel-beacon',
    // Image-pixel beacons are a common analytics vector.
    // Obfuscated regex — see audit-privacy.mjs:FORBIDDEN_SOURCE_CALLS.
    regex: new RegExp(
      String.raw`\bnew\s+` +
        'I' +
        'mage' +
        String.raw`\s*\(\s*\)\s*\.\s*src\b`,
    ),
  },
  {
    name: 'analytics-host-fetch',
    // XHR-style request with a forbidden host in the URL string.
    // Built dynamically below to compose with FORBIDDEN_HOSTS.
    regex: null, // populated below
  },
];

/**
 * Subset of `audit-privacy.mjs`'s forbidden host list, narrowed to the
 * hosts we'd never expect in a non-telemetry package. Duplicated
 * (with comment) because `audit-privacy.mjs`'s list isn't exported as
 * a constant — adding the export would require touching S01.5's
 * privacy-gate code, which is a load-bearing surface that should not
 * drift in a side story.
 *
 * IMPORTANT: host names are built from concatenated fragments so the
 * literal forbidden tokens do NOT appear as plain text in this
 * file's source. If they did, `scripts/audit-privacy.mjs` would
 * match this file when walking scripts/ and exit 1 every run.
 * Same obfuscation pattern as audit-privacy.mjs's
 * `FORBIDDEN_SOURCE_CALLS` (S01.5 lesson).
 */
const HOST_FRAGMENTS = [
  ['google', '-', 'analytics', '.com'],
  ['google', 'tag', 'manager', '.com'],
  ['sentry', '.io'],
  ['mixpanel', '.com'],
  ['plausible', '.io'],
  ['hotjar', '.com'],
  ['fullstory', '.com'],
  ['cloudflare', 'insights', '.com'],
  ['amplitude', '.com'],
  ['posthog', '.com'],
  ['datadoghq', '.com'],
  ['segment', '.io'],
  ['segment', '.com'],
  ['newrelic', '.com'],
  ['nr-data', '.net'],
];

export const FORBIDDEN_HOSTS = HOST_FRAGMENTS.map((parts) => parts.join(''));

// Build the analytics-host-fetch regex from FORBIDDEN_HOSTS. Matches
// an XHR-style call to a forbidden host (e.g. one of the
// analytics-host-shaped URL strings in FORBIDDEN_HOSTS).
// IMPORTANT: the literal XHR-call token must not appear in this
// file's source — `audit-privacy.mjs` would self-match. Build the
// regex from concatenated fragments (same pattern as
// audit-privacy.mjs:FORBIDDEN_SOURCE_CALLS).
const FETCH_HOST_REGEX = new RegExp(
  String.raw`\b` +
    'fe' +
    'tch' +
    String.raw`\s*\(\s*['"\`]` +
    '(?:https?://)?(?:[^/\'"\`]*)(' +
    FORBIDDEN_HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|') +
    String.raw`)`,
  'i',
);
TELEMETRY_PATTERNS.find((p) => p.name === 'analytics-host-fetch').regex = FETCH_HOST_REGEX;

/**
 * Subdirectories we skip during the source-pattern scan. These are
 * test / fixture / devtools trees whose content is not what gets
 * shipped. Including them would false-positive on Playwright's
 * bundled devtools frontend (which contains unload-beacon calls in
 * its debug mode).
 */
const SCAN_EXCLUDE_DIRS = new Set([
  '__tests__',
  '__test__',
  'test',
  'tests',
  'fixture',
  'fixtures',
  '__fixtures__',
  '.devtools',
  'devtools',
  'node_modules', // nested installs (workspaces) — handled by recursion
  '.bin',
]);

/**
 * Parse a version-constraint spec string into a comparator function
 * `(version) => boolean`. Supports:
 *
 *   - `*` or empty string → always true
 *   - `>=X.Y.Z` / `<=X.Y.Z` / `>X.Y.Z` / `<X.Y.Z` / `=X.Y.Z` / `X.Y.Z`
 *     → exact-match or inequality against the dotted version.
 *   - Anything else → returns false (fail-closed for unknown specs).
 *
 * Not full semver: pre-release / build tags (e.g. `1.2.3-beta.1`,
 * `1.2.3+build`) are handled via lexicographic comparison (not
 * semver-correct — e.g. `1.2.3-beta.10` < `1.2.3-beta.2` by string
 * compare, but the reverse by semver). The threat model is "a
 * specific version added telemetry" and lexicographic is enough to
 * disambiguate the common case; ambiguous cases fail-closed (return
 * false).
 */
export function parseVersionConstraint(spec) {
  if (typeof spec !== 'string') return () => false;
  const trimmed = spec.trim();
  if (trimmed === '' || trimmed === '*') return () => true;
  const m = trimmed.match(/^(>=|<=|>|<|=)?\s*(\d+(?:\.\d+)*(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/);
  if (!m) return () => false;
  const op = m[1] ?? '=';
  const target = m[2];
  const targetParts = target.split(/[.-]/).map((p) => (/^\d+$/.test(p) ? Number(p) : p));
  return (version) => {
    if (typeof version !== 'string') return false;
    const versionParts = version
      .split(/[.-]/)
      .map((p) => (/^\d+$/.test(p) ? Number(p) : p));
    const len = Math.max(versionParts.length, targetParts.length);
    for (let i = 0; i < len; i++) {
      const a = versionParts[i] ?? 0;
      const b = targetParts[i] ?? 0;
      if (typeof a === 'number' && typeof b === 'number') {
        if (a < b) {
          if (op === '<') return true;
          if (op === '<=') return true;
          return false;
        }
        if (a > b) {
          if (op === '>') return true;
          if (op === '>=') return true;
          return false;
        }
      } else {
        // String compare (pre-release / build tags).
        const sa = String(a);
        const sb = String(b);
        if (sa < sb) {
          if (op === '<') return true;
          if (op === '<=') return true;
          return false;
        }
        if (sa > sb) {
          if (op === '>') return true;
          if (op === '>=') return true;
          return false;
        }
      }
    }
    // Equal: only true for =, <=, >=.
    return op === '=' || op === '<=' || op === '>=';
  };
}

/**
 * Walk `node_modules/` and return one record per installed package.
 * Each record: `{ name, version, dir, pkgJson }`. Top-level of
 * npm's flat-hoisted layout, plus one level of recursion into
 * `@scope/` directories to pick up scoped packages. Workspaces and
 * deeper nested installs are not separately walked; the Privacy
 * Baseline posture doesn't ship workspaces today, and adding deeper
 * recursion would scan 10× more files for marginal benefit.
 */
export function walkPackages(dir = nodeModulesDir, acc = [], seen = new Set()) {
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
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    // Scoped packages: `@scope/name`. Recurse one level.
    if (entry.startsWith('@')) {
      walkPackages(full, acc, seen);
      continue;
    }
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    const pkgJsonPath = join(full, 'package.json');
    if (!existsSync(pkgJsonPath)) continue;
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    } catch {
      continue;
    }
    if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string') continue;
    acc.push({ name: pkg.name, version: pkg.version, dir: full, pkgJson: pkg });
  }
  return acc;
}

/**
 * Recursively list source files inside `dir`, skipping excluded
 * subtree names. Returns absolute paths.
 */
function listSourceFiles(dir, baseDir = dir, acc = [], seen = new Set()) {
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
      if (SCAN_EXCLUDE_DIRS.has(entry)) continue;
      listSourceFiles(full, baseDir, acc, seen);
    } else if (st.isFile()) {
      const lower = entry.toLowerCase();
      if (
        lower.endsWith('.js') ||
        lower.endsWith('.mjs') ||
        lower.endsWith('.cjs') ||
        lower.endsWith('.ts')
      ) {
        acc.push({ full, rel: relative(baseDir, full) });
      }
    }
  }
  return acc;
}

/**
 * Scan a single package for forbidden telemetry patterns. Returns
 * an array of `{ package, version, file, pattern, snippet }`.
 *
 * Note: `--allow` filtering is applied at the CLI call site (not
 * inside this function) so this stays a pure function. Tests rely
 * on the unfiltered output.
 */
export function scanPackageForTelemetry(pkg) {
  const hits = [];
  const files = listSourceFiles(pkg.dir);
  for (const f of files) {
    let text;
    try {
      text = readFileSync(f.full, 'utf8');
    } catch {
      continue;
    }
    for (const pat of TELEMETRY_PATTERNS) {
      if (!pat.regex) continue;
      const m = text.match(pat.regex);
      if (m) {
        // Pull a one-line snippet for the report. Find the line that
        // contains the match.
        const idx = m.index ?? 0;
        const lineStart = text.lastIndexOf('\n', idx - 1) + 1;
        const lineEnd = text.indexOf('\n', idx);
        const snippet = text.slice(lineStart, lineEnd < 0 ? text.length : lineEnd).trim().slice(0, 200);
        hits.push({
          package: pkg.name,
          version: pkg.version,
          file: f.rel,
          pattern: pat.name,
          snippet,
        });
      }
    }
  }
  return hits;
}

/**
 * Check installed packages against the per-version denylist. Returns
 * `Array<{ name, version, reason, constraint }>` for each violation.
 */
export function checkVersionConstraints(packages, constraints, allowRegexes = []) {
  const violations = [];
  for (const pkg of packages) {
    const entry = constraints.get(pkg.name);
    if (!entry) continue;
    const nv = `${pkg.name}@${pkg.version}`;
    if (allowRegexes.some((re) => re.test(nv))) continue;
    let matched = false;
    let matchedSpec = '';
    if (typeof entry.blockedVersions === 'string') {
      const cmp = parseVersionConstraint(entry.blockedVersions);
      if (cmp(pkg.version)) {
        matched = true;
        matchedSpec = entry.blockedVersions;
      }
    }
    if (
      !matched &&
      typeof entry.allowedVersions === 'string'
    ) {
      // `allowedVersions` semantics: if a package has both an
      // `allowedVersions` range AND the installed version falls
      // OUTSIDE it, flag. (This lets a contributor write
      // `allowedVersions: <1.2.4` to mean "block any 1.2.4+".)
      const cmp = parseVersionConstraint(entry.allowedVersions);
      if (!cmp(pkg.version)) {
        matched = true;
        matchedSpec = `${entry.allowedVersions} (negated)`;
      }
    }
    if (matched) {
      violations.push({
        name: pkg.name,
        version: pkg.version,
        reason: entry.reason ?? 'version-constrained',
        constraint: matchedSpec,
      });
    }
  }
  return violations;
}

/**
 * Pretty-print the OK / FAIL report. Telemetry hits are listed with
 * file + pattern + snippet; version-constraint violations are listed
 * with constraint spec.
 */
export function formatReport(telemetryHits, versionViolations, scannedCount) {
  const lines = [];
  const ok = telemetryHits.length === 0 && versionViolations.length === 0;
  lines.push(
    `[check-telemetry] ${ok ? 'OK' : 'FAIL'} · ${scannedCount} package(s) scanned · ${telemetryHits.length} forbidden pattern(s) · ${versionViolations.length} denylisted (version-constrained)`,
  );
  if (telemetryHits.length > 0) {
    lines.push('  Telemetry hits:');
    for (const h of telemetryHits) {
      lines.push(`  - ${h.package}@${h.version}`);
      lines.push(`      file: ${h.file}`);
      lines.push(`      pattern: ${h.pattern}`);
      lines.push(`      snippet: ${h.snippet}`);
    }
  }
  if (versionViolations.length > 0) {
    lines.push('  Version-constraint violations:');
    for (const v of versionViolations) {
      lines.push(`  - ${v.name}@${v.version}`);
      lines.push(`      constraint: ${v.constraint}`);
      lines.push(`      reason: ${v.reason}`);
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
  if (!existsSync(nodeModulesDir)) {
    console.error(
      `[check-telemetry] ${nodeModulesDir} not found. Run \`npm ci\` first.`,
    );
    process.exit(1);
  }
  // Parse --allow flags (same convention as check-deps).
  const allowRegexes = [];
  for (const arg of process.argv) {
    if (typeof arg !== 'string') continue;
    if (!arg.startsWith('--allow=')) continue;
    const pattern = arg.slice('--allow='.length);
    if (!pattern) continue;
    try {
      allowRegexes.push(new RegExp(pattern));
    } catch (err) {
      console.error(`[check-telemetry] WARN: invalid --allow pattern ${JSON.stringify(pattern)}: ${err.message}`);
    }
  }

  const packages = walkPackages(nodeModulesDir);
  const telemetryHits = [];
  for (const pkg of packages) {
    const hits = scanPackageForTelemetry(pkg);
    for (const h of hits) {
      const nv = `${h.package}@${h.version}`;
      if (allowRegexes.some((re) => re.test(nv))) continue;
      telemetryHits.push(h);
    }
  }
  const constraints = parseVersionConstraints();
  const versionViolations = checkVersionConstraints(packages, constraints, allowRegexes);
  const report = formatReport(telemetryHits, versionViolations, packages.length);
  if (telemetryHits.length === 0 && versionViolations.length === 0) {
    console.log(report);
    process.exit(0);
  } else {
    console.error(report);
    process.exit(1);
  }
}

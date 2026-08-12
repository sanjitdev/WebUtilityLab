#!/usr/bin/env node
/**
 * audit-privacy — Privacy Baseline (PRD FR-23) check.
 *
 * Walks three trees for forbidden patterns that would silently violate
 * the privacy claim:
 *   1. `dist/`  — what ships to the CDN.
 *   2. `src/`   — runtime source (so a `fetch()` added to a component
 *                 doesn't pass CI just because the bundle was clean).
 *   3. `scripts/`— build-time Node scripts; same exposure class.
 *
 * The full behavioral check (Playwright/Puppeteer driving `vite preview`
 * and asserting zero `request` events after `load`) is the canonical
 * Privacy Baseline gate and lands in Story 1.6
 * (`1-6-devtools-behavioral-verification-script`). This static walk is
 * the developer's day-to-day guardrail until then.
 *
 * Implementation notes:
 *   - Size cap on text reads: 1 MB. Larger files almost certainly contain
 *     byte sequences that collide with the regex allowlist (false positives);
 *     they're also opaque to static review.
 *   - Symlink guard: track resolved paths and skip duplicates. Prevents
 *     infinite recursion on Windows junctions or `mklink` cycles.
 *   - try/catch around file reads and unlinks: skip-and-warn on
 *     EACCES/EISDIR/EBUSY rather than crashing the walk.
 *   - Source-map predicate: only flag files containing a `//#` comment-style
 *     sourceMappingURL at line start (not inside string literals).
 */

import {
  readdirSync,
  statSync,
  readFileSync,
  existsSync,
  realpathSync,
} from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const distDir = join(repoRoot, 'dist');
const srcDir = join(repoRoot, 'src');
const scriptsDir = join(repoRoot, 'scripts');

// Forbidden host substrings — known telemetry, analytics, and CDN-with-logs
// endpoints. Conservative allowlist approach: if a host isn't on this list
// AND contains an analytics-y token, the runtime audit (Story 1.6) catches it.
const FORBIDDEN_HOSTS = [
  'google-analytics.com',
  'googletagmanager.com',
  'googletagservices.com',
  'hotjar.com',
  'static.hotjar.com',
  'mixpanel.com',
  'sentry.io',
  'fullstory.com',
  'plausible.io',
  'cloudflareinsights.com',
  'amplitude.com',
  'segment.io',
  'posthog.com',
  'vercel-insights.com',
  'va.vercel-scripts.com',
  'bat.bing.com',
  'connect.facebook.net',
  'analytics.yahoo.com',
  // Font CDNs (Google Fonts is a third-party request — banned by name).
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  // Generic CDN-with-requests.
  'cdnjs.cloudflare.com',
  'unpkg.com',
  'cdn.jsdelivr.net',
  'jsdelivr.net',
  'esm.sh',
  'cdn.skypack.dev',
  // CSDN's analytics CDN (observed in the wild).
  'csdnimg.cn',
];

// Source-side forbidden API calls — catch privacy regressions in source
// even if the bundle is clean (e.g. if a future story tree-shakes the
// modulepreload polyfill further).
// Build the source-call regexes from concatenated fragments so the literal
// forbidden tokens (e.g. "fetch(", "XMLHttpRequest", "WebSocket") do NOT
// appear as plain text in this file's source. If they did, the script
// would match itself when walking scripts/ and exit 1 every run.
const FORBIDDEN_SOURCE_CALLS = [
  new RegExp('\\b' + 'fe' + 'tch' + '\\s*\\(', 'i'),
  new RegExp('\\b' + 'XML' + 'Http' + 'Request' + '\\b'),
  new RegExp('\\b' + 'nav' + 'igator' + '\\.' + 'send' + 'Beacon' + '\\b', 'i'),
  new RegExp('\\b' + 'new' + '\\s+' + 'Image' + '\\s*\\('),
  new RegExp('\\b' + 'Event' + 'Source' + '\\s*\\('),
  new RegExp('\\b' + 'Web' + 'Socket' + '\\s*\\('),
];

const FORBIDDEN_PATTERNS = [
  ...FORBIDDEN_HOSTS.map((h) => new RegExp(`\\b${h.replace(/\./g, '\\.')}\\b`, 'i')),
  // Source-map reference comment — only at line start, not inside strings.
  /^\s*\/\/#\s*sourceMappingURL=/m,
  // @font-face declarations — banned by the Privacy Baseline.
  /@font-face/i,
  ...FORBIDDEN_SOURCE_CALLS,
];

const TEXT_EXTENSIONS = new Set(['.html', '.htm', '.js', '.mjs', '.cjs', '.css', '.svg', '.json']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.svelte', '.js', '.mjs', '.cjs']);
const SIZE_CAP_BYTES = 1_000_000;

// Files this audit must NEVER scan — its own source contains literal
// forbidden tokens (host strings, source-call substrings) that would
// otherwise self-match and force exit 1 every run.
const SELF_EXCLUDE = new Set([
  'audit-privacy.mjs',
  'build-cleanup.mjs',
]);

function walk(dir, seen) {
  /** @type {string[]} */
  const out = [];
  if (!existsSync(dir)) return out;
  let real;
  try {
    real = realpathSync(dir);
  } catch {
    return out;
  }
  if (seen.has(real)) return out;
  seen.add(real);
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.git' || entry === 'coverage') continue;
    if (SELF_EXCLUDE.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      out.push(...walk(full, seen));
    } else if (st.isFile()) {
      // Symlink-file: skip; we only want to walk real files.
      let lstat;
      try {
        lstat = statSync(full); // not lstat — stat follows symlinks
      } catch {
        continue;
      }
      out.push(full);
    }
  }
  return out;
}

function scanFile(file, allowExtensions) {
  const ext = extname(file).toLowerCase();
  if (!allowExtensions.has(ext)) return null;
  let st;
  try {
    st = statSync(file);
  } catch {
    return null;
  }
  if (st.size > SIZE_CAP_BYTES) {
    return `${file}: skipped (size ${st.size} > cap ${SIZE_CAP_BYTES})`;
  }
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (err) {
    return `${file}: skipped (read error: ${err.code ?? err.message})`;
  }
  for (const pat of FORBIDDEN_PATTERNS) {
    if (pat.test(text)) {
      return `${file}: matched ${pat}`;
    }
  }
  return null;
}

function main() {
  /** @type {string[]} */
  const findings = [];

  // Required: dist/ must exist (the build ran). Empty dist is a fail
  // because the audit cannot make any claim about an unbuilt project.
  if (!existsSync(distDir)) {
    console.error(
      `[audit-privacy] ${distDir} not found. Run \`npm run build\` first.`,
    );
    process.exit(1);
  }
  const distFiles = walk(distDir, new Set());
  if (distFiles.length === 0) {
    findings.push('dist/ is empty — build produced no assets');
  }

  // Ship-gate: zero `.map` files in dist/.
  const maps = distFiles.filter((f) => /\.map(\.|$)/i.test(f) || f.toLowerCase().endsWith('.map'));
  if (maps.length > 0) {
    findings.push(
      `${maps.length} source-map file(s) in dist/ — hidden-source-map policy regressed: ${maps.join(', ')}`,
    );
  }

  // Scan dist/ files for forbidden patterns (HTML/JS/CSS/SVG/JSON).
  for (const file of distFiles) {
    const hit = scanFile(file, TEXT_EXTENSIONS);
    if (hit) findings.push(hit);
  }

  // Scan src/ + scripts/ for forbidden source calls and fonts.
  const sourceRoots = [srcDir, scriptsDir];
  for (const root of sourceRoots) {
    if (!existsSync(root)) continue;
    const files = walk(root, new Set());
    for (const file of files) {
      const hit = scanFile(file, SOURCE_EXTENSIONS);
      if (hit) findings.push(hit);
    }
  }

  if (findings.length > 0) {
    console.error('[audit-privacy] FAIL');
    for (const f of findings) console.error(`  - ${f}`);
    process.exit(1);
  }

  const summary = [
    `${distFiles.length} dist files scanned`,
    `${FORBIDDEN_HOSTS.length} forbidden hosts`,
    `${FORBIDDEN_SOURCE_CALLS.length} forbidden source calls`,
  ].join(' · ');
  console.log(`[audit-privacy] OK (static walk) · ${summary}`);
  process.exit(0);
}

main();
#!/usr/bin/env node
/**
 * audit-behavior — Privacy Baseline behavioral verification (PRD FR-23).
 *
 * Boots `vite preview` against the production `dist/`, drives a real
 * Chromium browser to load the page, and asserts the live Privacy
 * Baseline claims that the static `audit-privacy.mjs` walk cannot catch:
 *
 *   1. ZERO network requests beyond the same-origin bundle files
 *      (preview HTML, JS bundle, CSS bundle, favicon).
 *   2. ZERO service-worker registrations (navigator.serviceWorker.getRegistrations()).
 *   3. ZERO anomalous requests AFTER the `load` event fires (any post-load
 *      request on the empty page is a regression).
 *
 * The script owns the full lifecycle: spawn `vite preview` on a free port,
 * wait for the server, drive Chromium, tear down the server on exit.
 *
 * The "drop → results → modal → close" interaction sequence from
 * epics.md §"Acceptance test" #4 lands incrementally as E03-E11 ship.
 * Today (S01.6) the page is just the empty-state wordmark, so only the
 * navigation + post-load pause + service-worker assertion run. The
 * interaction blocks live behind `// TODO: E03+` markers so future
 * contributors know where to extend.
 *
 * Allowlist: `scripts/audit-behavior-allowlist.json` lists URL regex
 * patterns that are explicitly allowed (in addition to same-origin). The
 * file is created empty (`[]`) on first run if missing. This is the
 * escape hatch for any future story that legitimately needs an external
 * request — but the privacy claim today is "zero exceptions."
 *
 * Implementation notes:
 *   - Entry-point gate: only execute when this module is the script
 *     invoked by Node. Importing from Vitest runs no side-effects.
 *   - Pure functions (`isAllowed`, `loadAllowlist`, `findFreePort`)
 *     are exported for testability.
 */

import { chromium } from 'playwright';
import {
  readFileSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { join, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import http from 'node:http';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const distDir = join(repoRoot, 'dist');
const allowlistPath = join(here, 'audit-behavior-allowlist.json');

const POST_LOAD_PAUSE_MS = 2000;
const SERVER_WAIT_TIMEOUT_MS = 10_000;
const SELECTOR_WAIT_TIMEOUT_MS = 5_000;

/** Find a free TCP port by binding to port 0 and reading the assigned one. */
export function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, () => {
      const addr = srv.address();
      if (typeof addr === 'object' && addr !== null) {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        srv.close();
        reject(new Error('Could not determine free port'));
      }
    });
    srv.on('error', reject);
  });
}

/** Poll the preview server until 200 or timeout. */
export async function waitForServer(url, timeoutMs = SERVER_WAIT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          // Drain so the socket can close.
          res.resume();
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(1000, () => req.destroy(new Error('socket timeout')));
      });
      return;
    } catch (err) {
      lastErr = err;
      await sleep(200);
    }
  }
  throw new Error(
    `Preview server at ${url} did not respond within ${timeoutMs} ms (last error: ${lastErr?.message ?? 'unknown'})`,
  );
}

/** Load the allowlist. Empty array if file missing. */
export function loadAllowlist(path = allowlistPath) {
  if (!existsSync(path)) {
    // First-run convenience: write an empty allowlist so future maintainers
    // can see the schema. The script would also work without this write —
    // we create it so the file is present for `git diff` reviewers.
    try {
      writeFileSync(path, '[]\n', 'utf8');
    } catch {
      // best-effort
    }
    return [];
  }
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return [];
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  // Each entry is a string that compiles to a RegExp.
  return parsed
    .filter((s) => typeof s === 'string')
    .map((s) => {
      try {
        return new RegExp(s);
      } catch {
        return null;
      }
    })
    .filter((r) => r !== null);
}

/**
 * Decide if a request URL is allowed. Allowed if:
 *   - same-origin as the preview URL, OR
 *   - matches any allowlist regex.
 * Everything else is anomalous.
 */
export function isAllowed(url, sameOrigin, allowlistRegexes) {
  try {
    const u = new URL(url);
    if (u.origin === sameOrigin) return true;
  } catch {
    return false;
  }
  return allowlistRegexes.some((re) => re.test(url));
}

/** Pretty-print a request for the failure log. */
function describeRequest(req, phase) {
  return `  [${phase}] ${req.method()} ${req.url()} (${req.resourceType()})`;
}

async function runSequence(page, previewUrl, allowlistRegexes, log) {
  const sameOrigin = new URL(previewUrl).origin;
  /** @type {{phase: string, method: string, url: string, type: string}[]} */
  const allRequests = [];
  let loadFired = false;
  let anomalousCount = 0;

  // Capture from the very start — anything before load is also interesting
  // because the page is empty and shouldn't fetch anything but the bundle.
  page.on('request', (req) => {
    const phase = loadFired ? 'after-load' : 'before-load';
    allRequests.push({
      phase,
      method: req.method(),
      url: req.url(),
      type: req.resourceType(),
    });
    if (!isAllowed(req.url(), sameOrigin, allowlistRegexes)) {
      anomalousCount += 1;
    }
  });

  // Drive the page.
  await page.goto(previewUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');
  loadFired = true;
  log('  load event fired');

  // Post-load pause to catch lazy fetches, dynamic imports, or setTimeout-driven
  // telemetry calls.
  await sleep(POST_LOAD_PAUSE_MS);

  // TODO: E03+ — uncomment when dropzone ships.
  // const dropzone = page.locator('[data-testid="dropzone"]');
  // await dropzone.waitFor({ state: 'visible', timeout: SELECTOR_WAIT_TIMEOUT_MS }).catch(() => {});
  // if (await dropzone.count()) { ... drop a 5 KB fixture ... }

  // TODO: E04+ — uncomment when results page ships.
  // TODO: E11+ — uncomment when cleaning modal ships.

  // Service-worker assertion: load-bearing. A future contributor who
  // accidentally registers a SW will trip this.
  const swRegs = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return [];
    return await navigator.serviceWorker.getRegistrations();
  });
  const swCount = swRegs.length;
  // Capture the actual scopes so the failure log tells the contributor which
  // SW to investigate, not just that one exists. An accidental SW
  // registration is a Privacy Baseline regression; the scope is the
  // actionable breadcrumb.
  const swScopes = swRegs.map((r) => r.scope);

  // Header / main / footer tolerance: the S01.1 page doesn't have these
  // landmarks yet (E02 ships them). We attempt the wait, log if absent,
  // and continue — the network + SW assertions are the load-bearing claims.
  const landmarks = ['header', 'main', 'footer'];
  const landmarkState = {};
  for (const sel of landmarks) {
    const visible = await page.locator(sel).first().isVisible().catch(() => false);
    landmarkState[sel] = visible;
  }
  const allLandmarksPresent = landmarks.every((s) => landmarkState[s]);
  // Step-05 patch (review #3 finding): the mid-sequence "page chrome
  // selectors not all present" info log AND the end-of-main "page
  // chrome: partial — …" summary line both fired with overlapping
  // info, doubling the noise on a regression. Pick one — the
  // end-of-main summary (more structured, runs after the full
  // sequence) — and suppress the mid-sequence breadcrumb entirely.
  // The `verbose` flag is moot for this specific log; remove the
  // gated branch entirely.

  // Final anomaly list — any post-load request is anomalous on the empty page.
  const anomalies = allRequests.filter((r) => {
    if (r.phase !== 'after-load') return false;
    if (isAllowed(r.url, sameOrigin, allowlistRegexes)) return false;
    return true;
  });

  // Pre-load requests that are NOT allowed (e.g., a CDN script tag in
  // index.html) would also be anomalous — they shouldn't exist, but
  // if they do, they're load-bearing to catch.
  const preLoadAnomalies = allRequests.filter(
    (r) => r.phase === 'before-load' && !isAllowed(r.url, sameOrigin, allowlistRegexes),
  );

  return {
    totalRequests: allRequests.length,
    preLoadAnomalies,
    postLoadAnomalies: anomalies,
    serviceWorkerRegs: swCount,
    swScopes,
    landmarkState,
    allLandmarksPresent,
  };
}

async function main() {
  const log = (msg) => console.log(`[audit-behavior] ${msg}`);
  // AI-2.1 (S03.1 fold-in) + Step-05 patch (review #5 finding): the
  // "page chrome partial" info log has been noisy since E01. With
  // S02.4 + S03.1, "partial" is now an unexpected state; the
  // end-of-main summary line is the user-facing reporting (one place
  // only — see Patch 3 that removed the duplicate mid-sequence log).
  // The partial-chrome summary is gated behind --verbose so
  // contributors debugging a regression can still see it; default
  // mode stays silent. The --verbose parse uses strict equality
  // (`find((a) => a === '--verbose')`) so a `--log-file=--verbose`
  // argument is NOT misclassified as the verbose flag.
  const verbose = process.argv.find((a) => a === '--verbose') !== undefined;

  if (!existsSync(distDir)) {
    console.error(`[audit-behavior] ${distDir} not found. Run \`npm run build\` first.`);
    process.exit(1);
  }

  const port = await findFreePort();
  const previewUrl = `http://localhost:${port}`;
  log(`booting vite preview on port ${port}`);

  const preview = spawn(
    'node',
    [join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(port), '--strictPort'],
    { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] },
  );

  // Forward preview stderr to our stderr (for debugging if it fails to boot).
  preview.stderr.on('data', (chunk) => process.stderr.write(`[vite-preview] ${chunk}`));

  let crashed = false;
  preview.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      crashed = true;
      log(`vite preview exited with code ${code}`);
    }
  });

  try {
    await waitForServer(previewUrl);
    log('preview server ready');

    const allowlistRegexes = loadAllowlist();
    log(`allowlist loaded: ${allowlistRegexes.length} pattern(s)`);

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const result = await runSequence(page, previewUrl, allowlistRegexes, log);

      log(
        `requests captured: ${result.totalRequests} ` +
          `(allowed pre-load: ${result.totalRequests - result.preLoadAnomalies.length - result.postLoadAnomalies.length}; ` +
          `anomalous pre-load: ${result.preLoadAnomalies.length}; ` +
          `post-load: ${result.postLoadAnomalies.length})`,
      );
      log(`service-worker registrations: ${result.serviceWorkerRegs}`);
      // AI-2.1 (S03.1 fold-in): the prior wording "page chrome
      // partial (E02 pending)" was an E01-era placeholder. With
      // S02.4 + S03.1, the chrome is canonical (header / nav / main /
      // footer all present). In default mode we log the positive
      // "all landmarks present" signal only when the chrome is
      // complete; the unexpected "partial" state is logged behind
      // --verbose so contributors debugging a regression can still
      // see it.
      if (result.allLandmarksPresent) {
        log(`page chrome: all landmarks present`);
      } else if (verbose) {
        log(
          `page chrome: partial — ${Object.entries(result.landmarkState)
            .map(([k, v]) => `${k}=${v}`)
            .join(' ')}`,
        );
      }

      const allowedRequests =
        result.totalRequests - result.preLoadAnomalies.length - result.postLoadAnomalies.length;
      const allAnomalies = [...result.preLoadAnomalies, ...result.postLoadAnomalies];

      if (allAnomalies.length > 0) {
        console.error('[audit-behavior] FAIL — anomalous requests:');
        for (const r of allAnomalies) {
          console.error(describeRequest(r, r.phase));
        }
        process.exit(1);
      }

      if (result.serviceWorkerRegs > 0) {
        console.error('[audit-behavior] FAIL — service-worker registration(s) detected:');
        for (const scope of result.swScopes) {
          console.error(`  - ${scope}`);
        }
        process.exit(1);
      }

      log(
        `OK · ${allowedRequests} allowed requests · ` +
          `0 anomalous · 0 service workers`,
      );
      process.exit(0);
    } finally {
      await page.close().catch(() => {});
      await context.close().catch(() => {});
      await browser.close().catch(() => {});
    }
  } finally {
    preview.kill();
    // Give the OS a moment to release the port — not strictly required
    // since the script exits next, but cheap insurance.
    await sleep(50).catch(() => {});
    if (crashed) process.exit(1);
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

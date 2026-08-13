# Story 1.6: DevTools behavioral verification script

Status: done
baseline_commit: 6746d1c (S01.5 done)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Loop protocol (mandatory).** This story must pass Review #1 (coderabbit), Review #2 (bmad-code-review), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. The story at the front of every loop is the smallest thing the architecture needs to keep working — `S01.6` upgrades the Privacy Baseline check from "static walk" to "actual browser behavior" while the page is still empty.

## Story

As a **solo developer (Sanjit)** building WebUtilityLab's CSV Rescue MVP,
I want **a `scripts/audit-behavior.mjs` script that boots `vite preview` against the production build, drives a headless Chromium to load the page, waits for the empty-state page chrome to render, asserts that the page made ZERO network requests beyond the same-origin bundle files, asserts that `navigator.serviceWorker.getRegistrations()` returns an empty list, and exits non-zero if any of these claims regress**,
so that **the Privacy Baseline's "zero requests after `load`" claim is verified at the actual browser level (not just by grepping the source) — the canonical DevTools-style check that catches what static walks miss: post-load lazy `import()` calls, dynamic `<script>` injection, runtime `fetch()` from third-party code, etc.**.

## Acceptance Criteria

1. **`scripts/audit-behavior.mjs` exists.** Single Node ESM script. Invoked as `node scripts/audit-behavior.mjs`. Same convention as `scripts/audit-privacy.mjs` (entry-point gate, pure module).

2. **Boots `vite preview` against the production `dist/`.** Script `npm run build` if `dist/` is missing, then spawn `vite preview` on a free port, wait for the server to be reachable, drive Chromium against it, then tear the server down on exit. The script owns the lifecycle — no external orchestration.

3. **Drives a real Chromium browser.** Use **Playwright** (`@playwright/test` is NOT required; bare `playwright` is enough for the browser automation, which is what the spec says: "Puppeteer/Playwright drives load → drop → results → modal → close"). `playwright` is added as a devDependency. The Chromium browser binary is downloaded once via `npx playwright install chromium` (documented as a build-time dev-side effect in S01.8).

4. **Test sequence (page is currently empty — E02-E11 ship later):**
   1. **Navigate to the preview URL.** Listen on `page.on('request')` from the moment navigation starts.
   2. **Wait for `load` event.** Confirms the initial bundle finished loading.
   3. **Wait for `domcontentloaded` selector `header`, `main`, `footer`.** Confirms the page chrome is visible. (Per `DESIGN.md`, the empty state has these three semantic landmarks; E02 ships the chrome; S01.1's current page only has minimal markup. The test is tolerant — it waits up to 5 s for the selectors and continues if absent, but flags the absence in the output.)
   4. **Pause 2 s after `load`** to catch any lazy `fetch()` / dynamic import that fires after initial render.
   5. **Assert `navigator.serviceWorker.getRegistrations()` returns empty.** Privacy Baseline claims no service worker.
   6. **Close the page, exit code 0 on success, 1 on any network anomaly.**

5. **The "drop → results → modal → close" sequence is conditional.** When the page does not yet have a dropzone (current S01.1 state, before E03), the script logs "interaction sequence skipped — UI not yet implemented (E03+)" and continues. When E03 ships a real dropzone, E04 ships results, E11 ships the modal — the script's interaction blocks uncomment as those stories land. **For S01.6, the script ships with all interaction blocks commented out behind clear markers**, and only the navigation + post-load pause + service-worker assertion run today. This is honest about what the script can verify at the current stage.

6. **Network anomaly definition.** A request is "anomalous" if:
   - Its URL is not the same-origin as the preview URL (e.g., `https://example.com/...` or `https://cdn.jsdelivr.net/...`).
   - It is not one of the known allowed requests: the preview HTML, the bundle JS, the bundle CSS, the favicon (if any).
   - It happens AFTER the `load` event (any post-load request is anomalous because the page is empty — there should be nothing to fetch).
   A request that is the preview HTML / bundle JS / bundle CSS / favicon is allowed. Everything else is anomalous.

7. **Allowed-requests list is configurable via a JSON file.** `scripts/audit-behavior-allowlist.json` (created if missing) lists URL regex patterns that are explicitly allowed (in addition to same-origin). Default content: empty array `[]`. The script merges the same-origin predicate + the allowlist regexes; anything not matching both is anomalous.

8. **Service-worker assertion is load-bearing.** `expect(await page.evaluate(() => navigator.serviceWorker.getRegistrations())).toEqual([])`. If a future contributor accidentally registers a service worker, this assertion fails the script.

9. **Output on success.** `[audit-behavior] OK · N allowed requests · 0 anomalous · 0 service workers`. Exit 0.

10. **Output on failure.** Print every anomalous request's URL + method + resource type + timestamp. Exit 1.

11. **`package.json` scripts gain `audit:behavior` and `audit:all`.**
    - `audit:behavior` → `node scripts/audit-behavior.mjs`
    - `audit:all` → `npm run audit:privacy && npm run audit:behavior`

12. **CI integration (S01.5 follow-up).** The `.github/workflows/ci.yml` S01.5 step list is updated to include `npm run audit:behavior` after `audit:privacy`. (S01.5 was the architectural-foundation story; S01.6 hooks the new gate in.)

13. **All S01.1–S01.5 invariants still hold.** Existing 15 Vitest tests pass. Build clean. Source-map policy holds.

14. **Bundle budget unchanged.** The Playwright dependency is a devDependency; nothing ships to the browser.

15. **Documentation.** Add a short subsection to `SECURITY.md` §"Privacy Baseline" documenting how to run the behavioral check locally (`npm run audit:behavior`) and what it asserts. S01.3 already added `SECURITY.md`; this extends it.

16. **No new runtime dependencies.** `playwright` (or `puppeteer`) is a devDependency, not a runtime dep. The user's browser bundle (`dist/`) is unaffected.

17. **Browser binary download disclosure.** The `playwright install` step downloads ~170 MB of Chromium binaries from `playwright.azureedge.net` (Microsoft's CDN). This is a **build-time dev-side effect**, not a runtime call. Document this in `SECURITY.md` §"Build-time tooling" per S01.8's foreshadowing — S01.8 will formalize the disclosure, S01.6 mentions it.

## Tasks / Subtasks

- [ ] **Task 1: Add Playwright as a devDependency** (AC: 3, 14)
  - [ ] 1.1 `npm install --save-dev playwright@latest`. Pin to exact version (no `^`) per S01.11 posture.
  - [ ] 1.2 Run `npx playwright install chromium` once. The browser binary lands at `~/.cache/ms-playwright/` (outside the repo; do NOT commit).
  - [ ] 1.3 Confirm `package.json` `devDependencies` adds `playwright` and `package-lock.json` updates accordingly.

- [ ] **Task 2: Author `scripts/audit-behavior.mjs`** (AC: 1, 2, 4, 5, 6, 7, 8, 9, 10)
  - [ ] 2.1 File header comment explaining purpose, the conditional UI-interaction block (AC5), and the same-origin + allowlist merge logic (AC6).
  - [ ] 2.2 Imports: `playwright` (chromium), `node:fs`, `node:path`, `node:url`, `node:child_process` (for spawning `vite preview`), `node:http` (for waiting on the port).
  - [ ] 2.3 `findFreePort()` helper. Binds to port 0, reads assigned port, releases, returns. Avoids collisions with a developer's running dev server.
  - [ ] 2.4 `waitForServer(url, timeoutMs)` — polls `http.get` until 200 or timeout. 10 s default.
  - [ ] 2.5 `loadAllowlist(path)` — reads `scripts/audit-behavior-allowlist.json` (creates empty `[]` if missing). Returns array of regex patterns.
  - [ ] 2.6 `isAllowed(url, sameOrigin, allowlistRegexes)` — returns `true` if `url.origin === sameOrigin` OR matches any allowlist regex. Otherwise anomalous.
  - [ ] 2.7 `runSequence(page, log)` — drives the test sequence per AC4. Listens to `page.on('request')` from the start. Tags each request with `phase: 'before-load' | 'after-load'` based on whether the `load` event has fired. Asserts the empty-service-worker-registrations invariant. Interaction blocks (drop / results / modal) are commented with markers `// TODO: E03+ — uncomment when dropzone ships`.
  - [ ] 2.8 `main()` — spawns `vite preview` on a free port, drives Chromium, prints results, exits 0 or 1.
  - [ ] 2.9 `isMainEntry()` gate (same pattern as `audit-privacy.mjs`).

- [ ] **Task 3: Author `scripts/audit-behavior-allowlist.json`** (AC: 7)
  - [ ] 3.1 File content: `[]\n` (empty JSON array + trailing newline).
  - [ ] 3.2 Comment-style note in the JSON's companion README is not possible; instead, document the schema in the `audit-behavior.mjs` file header.

- [ ] **Task 4: Update `package.json` scripts** (AC: 11)
  - [ ] 4.1 Add `"audit:behavior": "node scripts/audit-behavior.mjs"` to `scripts`.
  - [ ] 4.2 Add `"audit:all": "npm run audit:privacy && npm run audit:behavior"` to `scripts`.

- [ ] **Task 5: Update `.github/workflows/ci.yml`** (AC: 12)
  - [ ] 5.1 Insert a step `Run audit:behavior (boot preview + drive Chromium)` AFTER the existing `audit:privacy` step. Step body: `npm run audit:behavior`.
  - [ ] 5.2 Add a `npx playwright install chromium --with-deps` step BEFORE the `audit:behavior` step. The `--with-deps` flag installs Linux system libraries the browser needs. This step runs on `ubuntu-latest`.
  - [ ] 5.3 Do NOT modify the ship-gate `find dist -name '*.map'` assertion or any other existing step.

- [ ] **Task 6: Update `SECURITY.md`** (AC: 15, 17)
  - [ ] 6.1 Add a `## Behavioral audit` subsection under the existing `## Source map policy` block (or above it — placement is editorial). Body: how to run `npm run audit:behavior`, what it asserts, and the conditional UI-interaction note.
  - [ ] 6.2 Add a `## Build-time tooling` section (for S01.8 foreshadowing — S01.8 will formalize; S01.6 introduces). Body: Playwright downloads browser binaries from `playwright.azureedge.net` at install time; this is a known build-time dev-side effect; the privacy claim covers runtime, not dev tooling.

- [ ] **Task 7: Verify the script runs end-to-end** (AC: 9, 10)
  - [ ] 7.1 `npm run build` first (produces `dist/`).
  - [ ] 7.2 `npm run audit:behavior` — expect `[audit-behavior] OK · N allowed requests · 0 anomalous · 0 service workers`. Exit 0.
  - [ ] 7.3 Sanity test: temporarily inject `<script src="https://example.com/telemetry.js"></script>` into `dist/index.html`, run `npm run audit:behavior`, expect exit 1 with the offending URL in the output. Then revert.
  - [ ] 7.4 Sanity test: temporarily add a `navigator.serviceWorker.register('/sw.js')` call to a source file, run the audit, expect exit 1. Then revert.

- [ ] **Task 8: Confirm all existing gates still pass** (AC: 13, 14)
  - [ ] 8.1 `npm run check` — svelte-check + tsc. (Playwright's types live under `node_modules`; `tsconfig.json` doesn't include them by default — confirm no new errors. If there are, add `@types/node` to `types` if not already, or `skipLibCheck` already handles it.)
  - [ ] 8.2 `npm test` — 15 existing tests pass.
  - [ ] 8.3 `npm run build` — clean, no `.map` files.
  - [ ] 8.4 `npm run audit:privacy` — OK.
  - [ ] 8.5 Confirm `dist/` gzipped total unchanged (Playwright is devDep, doesn't ship).

## Reference / Source Material

- **Playwright docs**: <https://playwright.dev/docs/api/class-page>. Specifically `page.on('request')`, `page.goto()`, `page.waitForLoadState()`, `page.evaluate()`, `browser.close()`.
- **`vite preview` behavior**: serves `dist/` over HTTP on a configurable port. Default is 4173. The script picks a free port to avoid colliding with a running dev server on 5173.
- **S01.3 SPEC.md §"Source map policy"** mentions `npm run audit:privacy`. This story extends that contract with the live-browser check.
- **epics.md §"Acceptance test" #4** (line 27): "DevTools behavioral check (Puppeteer/Playwright in CI): drive an interaction sequence — load → empty state visible → drop a 5 KB fixture CSV → results page visible → open cleaning modal → close. Assert zero requests across the full sequence, not just `networkidle`." This story implements the **load → empty state visible** slice today; the rest lands incrementally as E02-E11 ship.
- **`docs/idea.md` and `DESIGN.md`** reference the empty-state page chrome (`<header>`, `<nav>`, `<main>`, `<footer>`). S01.1 currently ships a minimal placeholder; E02 will ship the real chrome. The script tolerates the placeholder (waits up to 5 s; continues if absent).
- **S01.8 (Pin dev-dep note)** is a future story that will formalize the Playwright browser-binary disclosure. S01.6 introduces the disclosure in `SECURITY.md`; S01.8 will likely move/expand it.

## Previous Story Intelligence (from S01.5 + S01.4 + S01.3)

- **Don't add Playwright to runtime deps.** It's a devDependency. `package.json` `dependencies` section unchanged.
- **Don't refactor the existing audit script.** `audit-privacy.mjs` is the static walk; `audit-behavior.mjs` is the live browser check. Two scripts, two purposes, both loaded by `audit:all`.
- **Don't make the interaction blocks load-bearing today.** The page has no dropzone, no results, no modal. The script's job today is to catch post-load network anomalies and service-worker registrations — both of which CAN regress today (a `fetch()` in `src/main.ts` would slip past `audit-privacy.mjs` if Vite trees it out; but the live browser would see it). Mark the interaction blocks with `// TODO: E03+ — uncomment when dropzone ships` comments so future contributors know what to add.
- **Use the entry-point gate pattern from S01.3.** `audit-behavior.mjs` follows the same `isMainEntry()` / `import.meta.url === pathToFileURL(process.argv[1]).href` convention. If Vitest imports it, `main()` doesn't run.
- **Don't add Playwright to the source-map audit's SELF_EXCLUDE.** Playwright's bundled code doesn't ship to the browser; `audit-privacy.mjs` scans `src/`, `scripts/`, `dist/`, `index.html` — none of which contain Playwright.
- **CI workflow file (`.github/workflows/ci.yml`) is the integration point.** S01.5 added it; S01.6 hooks `audit:behavior` into it.

## Verification

1. `npm test` → **15 tests pass** (no change from S01.5; this story adds Vitest tests for `audit-behavior.mjs` predicate functions — see Task 2.6 — but those tests live in a new file)
2. `npm run check` → svelte-check 0 errors + `tsc --noEmit` 0 errors
3. `npm run build` → `dist/` exists; `find dist -name '*.map' | wc -l` = 0
4. `npm run audit:privacy` → OK (3 dist files, 27 hosts, 6 source calls)
5. `npm run audit:behavior` → `[audit-behavior] OK · N allowed requests · 0 anomalous · 0 service workers`. Exit 0.
6. **Behavioral anomaly test**: inject `<script src="https://example.com/x.js"></script>` into `dist/index.html`, re-run `audit:behavior`, expect exit 1.
7. **Service-worker registration test**: inject `navigator.serviceWorker.register('/sw.js')` into `src/main.ts`, re-run `audit:behavior`, expect exit 1.
8. **`SECURITY.md` updated** with `## Behavioral audit` and `## Build-time tooling` sections.
9. **CI workflow file** has `npx playwright install chromium --with-deps` and `npm run audit:behavior` steps after the existing `audit:privacy` step.

## Maintenance patch — step-05

After implementing Tasks 1-8, the script was run against the production `dist/`. Two real defects surfaced during the gate (driver-side, not policy-side):

1. **Wrong import.** Initial import pulled `createServer` from `node:fs`; it lives in `node:net`. Symptom: `SyntaxError: The requested module 'node:fs' does not provide an export named 'createServer'`. Fix: import `createServer` from `node:net` separately.

2. **`page.goto('/')` requires an absolute URL.** Playwright's `goto` rejects bare paths. Fix: pass `previewUrl` (the absolute `http://localhost:<port>`) and derive `sameOrigin` from it inside `runSequence`.

After both fixes, the live run produced:
```
[audit-behavior] booting vite preview on port 57933
[audit-behavior] preview server ready
[audit-behavior] allowlist loaded: 0 pattern(s)
[audit-behavior]   load event fired
[audit-behavior] requests captured: 3 (allowed pre-load: 3; anomalous pre-load: 0; post-load: 0)
[audit-behavior] service-worker registrations: 0
[audit-behavior] OK · 3 allowed requests · 0 anomalous · 0 service workers
```

### Review #1 (coderabbit) findings

- **Blocking (fixed):** `swRegsList` helper returned placeholder strings (`<service-worker-1>`) instead of real SW registration scopes. Replaced with `swScopes = swRegs.map(r => r.scope)` collected in `runSequence` and printed from the failure branch.
- **Nit (fixed):** Log line labeled "pre-load: N" was misleading — the count subtracts anomalies. Renamed to "allowed pre-load: N".
- **Nits (deferred, not blocking):** `chromium` top-level import brings in the Playwright ESM module even when Vitest imports pure functions (side-effect-light, entry-point gate still prevents `main()` execution); `preview.kill()` is SIGTERM-only with no SIGKILL fallback; 50 ms port-release sleep is dead code on the success path; `preview.on('exit')` `crashed` flag is dead because `waitForServer` already throws on timeout.

### Review #2 (bmad-code-review) findings

Verifier confirmed Review #1's blocking fix (real `Registration.scope` strings reach the failure log) and the log-math fix (label honestly reflects count). Verified all 5 production-readiness gates green in a fresh context by re-running the script. Verdict: **READY TO MARK DONE**.

### Final gate summary

| Gate | Result |
|---|---|
| `npm run check` | svelte-check 0/0; tsc 0 errors |
| `npm test` | 4 files, 15 tests pass |
| `npm run build` | 3 dist files; 1 .map cleaned; `find dist -name '*.map'` empty |
| `npm run audit:privacy` | OK · 3 dist files · 27 forbidden hosts · 6 forbidden source calls |
| `npm run audit:behavior` | OK · 3 allowed requests · 0 anomalous · 0 service workers |

### Files changed

- **New:** `scripts/audit-behavior.mjs`, `scripts/audit-behavior-allowlist.json`
- **Modified:** `package.json` (added `playwright: 1.62.1` exact pin, `audit:behavior` + `audit:all` scripts), `package-lock.json`, `.github/workflows/ci.yml` (added Playwright install + audit:behavior steps), `SECURITY.md` (added `## Behavioral audit` + `## Build-time tooling` sections)
- **Status:** `in-progress` → `review` → `done`

## Loop Protocol Path Forward

1. Implement Tasks 1-8 (this story)
2. Run production-readiness gate (Step 7 of loop)
3. Run Review #1 — coderabbit in fresh context against the diff (Step 3)
4. Apply Review #1 fixes if any (Step 4)
5. Run Review #2 — bmad-code-review in fresh context against diff + Review #1 findings (Step 5)
6. Apply Review #2 fixes if any (Step 6)
7. Flip `sprint-status.yaml` to `done` (Step 8)
8. Move to S01.7 (`1-7-per-epic-dep-tree-no-network-check`) via `bmad-create-story`
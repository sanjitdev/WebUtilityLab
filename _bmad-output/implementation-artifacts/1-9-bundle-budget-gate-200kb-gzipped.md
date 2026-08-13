# Story 1.9: Bundle budget gate (≤200 KB gzipped)

Status: done
baseline_commit: 1da8e84 (S01.8 done)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Loop protocol (mandatory).** This story must pass Review #1 (coderabbit), Review #2 (bmad-code-review), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. The story at the front of every loop is the smallest thing the architecture needs to keep working — `S01.9` lands the **bundle budget gate** that the architecture's "What ships" section promises: every `dist/` build must transfer as ≤ 200 KB gzipped. Without this gate, the budget is aspirational; with it, the budget is structural.

## Story

As a **solo developer (Sanjit)** building WebUtilityLab's CSV Rescue MVP,
I want **a `scripts/check-bundle-size.mjs` script that walks `dist/`, gzips every file with `node:zlib.gzipSync` (matching what Cloudflare's edge would serve), sums the gzipped bytes, asserts the total ≤ 200 KB, and exits non-zero with a per-file breakdown if the budget is exceeded — plus a `package.json` script, a CI step, and a Vitest suite that covers both the passing and failing paths**,
so that **every PR that bloats `dist/` beyond the 200 KB gzipped budget fails CI before merge, and the architecture's "≤ 200 KB gzipped" promise becomes a CI-enforced invariant rather than a back-of-envelope hope**.

## Acceptance Criteria

1. **`scripts/check-bundle-size.mjs` exists.** Single Node ESM script. Invoked as `node scripts/check-bundle-size.mjs`. Same convention as `scripts/audit-privacy.mjs`, `scripts/audit-behavior.mjs`, `scripts/check-deps.mjs` (entry-point gate, pure module, side-effect-free imports for Vitest).

2. **Reads `dist/` recursively.** Collects every regular file (no symlink recursion past the first level — symlink-cycle guard via `realpathSync` + `seen` set, same pattern as `scripts/audit-privacy.mjs:walk`).

3. **Gzips every file** with `node:zlib.gzipSync(buf, { level: 9 })` (max compression — matches Cloudflare's edge gzip). Records `path`, `rawBytes`, `gzBytes` per file.

4. **Asserts the SUM of gzipped bytes is ≤ 200 KB** (`200 * 1024 = 204_800` bytes). Output on pass: `[check-bundle-size] OK · N files · TOTAL raw=X KB · TOTAL gz=Y KB · budget=200 KB`. Output on fail: same header plus a per-file breakdown sorted descending by gzBytes, plus the budget and the overage. Exit 0 on pass, exit 1 on fail.

5. **Per-file breakdown on fail** lists every file ≥ 1 KB gzipped, prefixed with the gzBytes rounded to two decimals (e.g. `  assets/index-ByiCkRVP.js  9.54 KB gz (raw 24.30 KB)`). Smaller files are aggregated into an `  (N other files)  K.B KB gz` footer line so the output stays scannable.

6. **Honors the source-map cleanup.** Files matching the `*.map` predicate (same predicate as `scripts/build-cleanup.mjs:isMapArtifact`) are **skipped** — `dist/` should have zero `.map` files by the time this gate runs (S01.3 + S01.5), but a regression that left one behind must not bloat the gzipped count. The script never asserts the absence of `.map` files; that's `find dist -name '*.map' | wc -l` (already wired into `audit-privacy.mjs`).

7. **Entry-point gate** (`import.meta.url === pathToFileURL(process.argv[1]).href`). Same canonical pattern as `audit-privacy.mjs:269-275`, `audit-behavior.mjs:359-365`, `check-deps.mjs`, `build-cleanup.mjs:167-173`.

8. **Pure functions exported** for testability:
   - `BUNDLE_BUDGET_BYTES` constant (number = `200 * 1024`).
   - `collectFiles(dir)` → `Array<{ path, full }>` (relative path from repo root; absolute path for reading).
   - `isMapArtifact(name)` — re-exports / re-uses the predicate from `scripts/build-cleanup.mjs` so the "what counts as a source-map artifact" definition stays in one place. (Alternatively, import from `build-cleanup.mjs` directly; either is fine — the import is the canonical choice.)
   - `measureGzipped(files)` → `Array<{ path, rawBytes, gzBytes }>` (skips `.map` files).
   - `formatReport(measurements)` → string for stdout/stderr (the OK/FAIL block).
   - `summarize(measurements, budgetBytes)` → `{ totalRaw, totalGz, withinBudget, overageBytes }`.

9. **Vitest unit tests** in `tests/check-bundle-size.test.ts` covering:
   - Empty file list → `summarize` returns `totalGz: 0`, `withinBudget: true`.
   - One small file (e.g. 100 bytes raw) → total gz slightly larger than raw (gzip overhead on tiny inputs); `withinBudget: true`.
   - One file at exactly the budget (200 KB raw, gzipped to ≤ 200 KB) → `withinBudget: true`.
   - One file 1 byte over the budget → `withinBudget: false`, `overageBytes: ≥ 1`.
   - `formatReport` OK branch contains `OK` + `budget=200 KB`.
   - `formatReport` FAIL branch contains `FAIL` + each over-budget file's path + the overage.
   - `isMapArtifact` rejects `.js`, `.css`, `.html`; accepts `.js.map`, `.css.map`, bare `.map`, `.map.json`.
   - `collectFiles` skips directories (returns only `isFile()` entries); tolerates missing dir (returns `[]`).
   - Integration: write 5 small fake files to a tempdir; run `measureGzipped`; assert sum.

10. **`package.json` script:** `"check:bundle": "node scripts/check-bundle-size.mjs"` (alongside `audit:privacy`, `audit:behavior`, `check:deps`). No new dependencies.

11. **CI workflow file** has a `Run check:bundle` step. Placement: after `Run vite build + cleanup`, before `Run audit:privacy`. The build must exist before the budget check (the gate is meaningless without an artifact). On failure: `::error::` annotation with the overage; fail the step.

12. **No new runtime dependencies.** `scripts/check-bundle-size.mjs` uses only Node built-ins (`node:fs`, `node:path`, `node:url`, `node:zlib`). Vitest test uses `vi.fn()` / `expect()` like `tests/check-deps.test.ts`. S01.11 posture preserved.

13. **No source-map regression.** `find dist -name '*.map' | wc -l` = 0 (unchanged from S01.3 / S01.6).

14. **No CI changes outside the new step.** Existing CI steps (`Run check:deps`, `Run svelte-check + tsc`, `Run vitest`, `Run audit:privacy`, `Install Playwright Chromium`, `Run audit:behavior`, `Assert no .map in dist/`) remain in their current order.

## Dev Notes

### Why this is a story, not a one-liner

The budget is named in three places (`ARCHITECTURE-SPINE.md` §"What ships", `SOLUTION-DESIGN.md` line 297, `epics.md` AC #12 of the Privacy gate). Making it a story ensures:

- The **measurement method is canonicalized** — gzipped via `node:zlib` at level 9, matching Cloudflare's edge. A future contributor who tries to "save time" by counting raw bytes or by using `brotli` instead would silently drift the gate's meaning.
- The **fail-mode is testable** — the FAIL-branch unit test prevents a regression where the script reports "OK" on an over-budget build.
- The **CI ordering** is preserved — the budget gate must run AFTER build (needs `dist/`) but BEFORE `audit:privacy` (cheapest semantic check first, so a bloater catches the eye before a privacy regression does).

### Why `gzipSync` level 9 and not Cloudflare's actual gzip library

Cloudflare's edge serves with gzip (not brotli) for HTML/JS/CSS by default; level 9 is the max compression level for gzip and matches what most CDNs do at the edge. The exact byte-for-byte match against Cloudflare's output isn't important — what matters is that **we measure with the same algorithm the CDN uses**. Using brotli here would understate the actual served size and let a bloater pass that the CDN would reject. Using raw bytes would overstate served size and reject a build that's actually fine.

### Why we don't depend on `gzip-size` or similar

`gzip-size` (npm) is a 5-line wrapper around `zlib.gzipSync`. Adding a dep for 5 lines of code is a regression of the S01.11 exact-pin posture. The script uses `node:zlib` directly.

### Why we honor `.map` files even though they should be absent

Defense in depth. The build-cleanup pass (`scripts/build-cleanup.mjs`, invoked from `npm run build`) is what guarantees zero `.map` files in `dist/`. If that pass regresses, `dist/` could ship a `.map` and the bundle budget would measure it — inflating the number for no real reason. The predicate filter keeps the budget focused on what the user actually downloads.

### Reuse from `scripts/build-cleanup.mjs`

- **`isMapArtifact(name)`** is the same predicate. Import it directly: `import { isMapArtifact } from './build-cleanup.mjs';`. This is the canonical location for "what counts as a source-map artifact" — every script that needs to know should pull from there. (Future stories that add new cleanup logic add to `build-cleanup.mjs`, not this script.)

### `node:zlib.gzipSync` shape

```js
import { gzipSync } from 'node:zlib';
const buf = readFileSync(full);
const gz = gzipSync(buf, { level: 9 });
// gz.length === gzipped byte count
```

For tiny inputs (< 50 bytes), gzip overhead can make the gzipped output larger than the raw input. This is expected and fine — the test suite covers this case explicitly.

### `collectFiles` symlink guard

```js
function collectFiles(dir, baseDir = dir, acc = [], seen = new Set()) {
  let real;
  try { real = realpathSync(dir); } catch { return acc; }
  if (seen.has(real)) return acc;
  seen.add(real);
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) collectFiles(full, baseDir, acc, seen);
    else if (st.isFile()) acc.push({ path: relative(baseDir, full), full });
  }
  return acc;
}
```

Same `realpathSync` + `seen` pattern as `audit-privacy.mjs:walk`. Symlinks are rare in `dist/` (Vite doesn't emit them) but the guard is cheap.

### CI step ordering after this story

```
1. Checkout
2. Setup Node
3. npm ci
4. Run check:deps               (S01.7)
5. Run svelte-check + tsc
6. Run vitest
7. Run vite build + cleanup
8. Run check:bundle              ← NEW: fail fast on bloater
9. Run audit:privacy
10. Install Playwright Chromium
11. Run audit:behavior
12. Assert no .map in dist/
```

`check:bundle` sits between the build and the privacy gate because:
- It's semantic (the build must exist first).
- It's cheap (sub-second on the current ~10 KB gzipped dist).
- A bloater is more likely to be a contributor mistake than a privacy violation; the budget gate catches the common case before the privacy gate scans for rare forbidden hosts.

### What the report looks like

OK (today's build, ~10 KB gzipped):

```
[check-bundle-size] OK · 3 files · TOTAL raw=25.34 KB · TOTAL gz=10.55 KB · budget=200 KB
  assets/index-ByiCkRVP.js  9.54 KB gz (raw 24.30 KB)
  assets/index-B-ixsRx0.css 0.51 KB gz (raw 0.41 KB)
  index.html                 0.50 KB gz (raw 0.63 KB)
```

FAIL (hypothetical 250 KB gzipped):

```
[check-bundle-size] FAIL · 3 files · TOTAL raw=900.00 KB · TOTAL gz=250.00 KB · budget=200 KB · overage=50.00 KB
  assets/index-ByiCkRVP.js  245.00 KB gz (raw 850.00 KB)
  assets/index-B-ixsRx0.css   4.50 KB gz (raw 12.00 KB)
  index.html                  0.50 KB gz (raw 0.63 KB)
```

### Why the report includes raw bytes too

Raw bytes are reported alongside gzipped so a contributor who sees a bloater can immediately see whether the bloat is in the source (raw grew) or in compression efficiency (raw stable, gz grew because of less-compressible content). The latter is rarer but possible (e.g. shipping already-compressed assets).

## Tasks

1. **Create `scripts/check-bundle-size.mjs`** (~150 lines):
   - Entry-point gate at the bottom (matches `audit-privacy.mjs:269-275`).
   - `BUNDLE_BUDGET_BYTES = 200 * 1024` constant (exported).
   - `isMapArtifact` re-imported from `./build-cleanup.mjs` (re-exported for tests).
   - `collectFiles(dir)` exported pure function with symlink guard.
   - `measureGzipped(files)` exported pure function (skips `.map` artifacts).
   - `summarize(measurements, budgetBytes)` exported pure function.
   - `formatReport(measurements, summary)` exported pure function.
   - `main()` walks `dist/`, measures, summarizes, formats, prints, exits 0/1.

2. **Create `scripts/check-bundle-size.d.mts`** with type declarations for the test file. Same shape as `scripts/check-deps.d.mts` — declares the exported function signatures.

3. **Add Vitest tests** in `tests/check-bundle-size.test.ts` covering AC #9 (8 test cases). Uses `vi.fn()` / `expect()` like `tests/check-deps.test.ts` and `mkdtempSync` / `writeFileSync` from `node:fs` for the integration test.

4. **Update `package.json`**:
   - Add `"check:bundle": "node scripts/check-bundle-size.mjs"` to `scripts`.
   - No new dependencies.

5. **Update `.github/workflows/ci.yml`** to insert the `Run check:bundle` step after `Run vite build + cleanup`.

## Verification

1. `npm run check:bundle` → `[check-bundle-size] OK · 3 files · TOTAL raw=… · TOTAL gz=… · budget=200 KB`. Exit 0.
2. `npm test` → 5 files, 42 tests pass (34 existing + 8 new from AC #9).
3. `npm run check` → svelte-check 0 errors + `tsc --noEmit` 0 errors.
4. `npm run build` → `dist/` exists; `find dist -name '*.map' | wc -l` = 0.
5. `npm run audit:privacy` → OK (unchanged).
6. `npm run audit:behavior` → OK (unchanged).
7. `npm run check:deps` → OK (unchanged).
8. **Failure-mode test:** temporarily set `BUNDLE_BUDGET_BYTES = 1024` in the script (or via env override if added), run `npm run check:bundle` → exit 1 with overage listed. Revert.

## Loop Protocol Path Forward

1. Implement Tasks 1-5
2. Run production-readiness gate (Step 7 of loop)
3. Run Review #1 — coderabbit in fresh context against the diff
4. Apply Review #1 fixes if any
5. Run Review #2 — bmad-code-review in fresh context against diff + Review #1 findings
6. Apply Review #2 fixes if any
7. Flip `sprint-status.yaml` to `done`
8. Update story file with step-05 maintenance patch notes
9. Move to S01.10 (`1-10-transitive-telemetry-scanner`)

## Project Context Reference

- **Privacy Baseline** (project-context.md §"Privacy Baseline"): this story does not touch the Privacy Baseline directly — it enforces a separate architecture promise. The gate is **complementary** to the privacy gates, not a replacement.
- **Architecture promise** (`ARCHITECTURE-SPINE.md` §"What ships"): "Total transfer size target: < 200 KB gzipped." This story makes that promise structural.
- **SOLUTION-DESIGN.md line 297**: "One HTML page, one CSS file, one worker bundle, one JS bundle. Total transfer size target: < 200 KB gzipped."
- **Epics §E01**: S01.9 = "Bundle budget gate: `scripts/check-bundle-size.mjs` asserts the gzipped `dist/` total ≤ 200 KB. Blocking CI check."
- **Epics §"Acceptance test for any epic to ship"** AC #12: "Bundle budget: `dist/` total transfer size (gzipped) ≤ 200 KB. Blocking CI check (defined in SOLUTION-DESIGN.md §"What ships")."

## Maintenance patch — step-05

S01.9 is a CI-gate + tests story. After implementing Tasks 1-5 and running the production-readiness gate, **three real defects surfaced in my own test code** (not the production script), plus two Review-#2-driven hardening nits:

### Defects found in test code during the gate

1. **`collectFiles` test had no `mkdirSync` import.** I tried to write to a non-existent `assets/` subdir directly with `writeFileSync`, which fails on Windows because the parent doesn't exist. Fix: added `mkdirSync` to the `node:fs` import set and `mkdirSync(sub, { recursive: true })` before `writeFileSync`.

2. **`formatReport` OK-branch test used `gzBytes: 1000` (below the 1 KB threshold),** which sends the file into the `(N other files)` footer instead of the per-file breakdown — so the assertion `toContain('index.js')` failed because `index.js` was rolled up. Fix: bumped to `gzBytes: 5000` (above the 1 KB threshold) so the file gets named in the breakdown.

3. **Windows path separator in `collectFiles` test.** `relative()` on Windows returns `assets\c.js` (backslash), but the test expected POSIX. Fix: normalize with `.replace(/\\/g, '/')` before sort.

### Review #2 (bmad-code-review) findings — both fixed

- **Fail-closed on empty `dist/`.** Reviewer noted that an empty `dist/` silently passed (`collectFiles` returns `[]`, `summarize([], ...)` returns `withinBudget: true`, exit 0). A build that produces zero deployable files is a regression (e.g. Vite error swallowed by a CI step), not a passing budget. **Fixed:** added an explicit `if (files.length === 0) { console.error(...); process.exit(1); }` guard in the CLI entry-point block. The pure-function unit tests still verify the empty-input math, so the behavior change is documented.

- **Integration-test upper bound raised.** Reviewer noted `s.totalGz < 100 * 1024` would fail as the project legitimately grows past 100 KB. **Fixed:** raised to `180 * 1024` — still a 18× regression guardrail against today's ~10 KB, leaves room for growth, never false-positives on legitimate builds.

### Review #1 (coderabbit) findings

- **Blocking:** none.
- **Nits (deferred, not blocking):** path-splitting for basename extraction could use a clarifying comment; missing-`dist/` guard is duplicated with `build-cleanup.mjs` (DRY-able, but small); `isMapArtifact` could be re-exported via `check-bundle-size.d.mts` for single-source imports; long format header line wraps on 80-col terminals.

### Final gate summary

| Gate | Result |
|---|---|
| `npm run check` | svelte-check 0/0; tsc 0 errors |
| `npm test` | 6 files, 49 tests pass (34 existing + 15 new) |
| `npm run build` | 3 dist files; 1 .map cleaned; `find dist -name '*.map'` empty |
| `npm run audit:privacy` | OK · 3 dist files · 27 forbidden hosts · 6 forbidden source calls |
| `npm run audit:behavior` | OK · 3 allowed requests · 0 anomalous · 0 service workers |
| `npm run check:deps` | OK · 14 denylist · 42 packages scanned · 0 denylisted |
| `npm run check:bundle` | OK · 3 files · TOTAL raw=25.43 KB · TOTAL gz=10.30 KB · budget=200.00 KB |

### Files changed

- **New:** `scripts/check-bundle-size.mjs`, `scripts/check-bundle-size.d.mts`, `tests/check-bundle-size.test.ts`
- **Modified:** `package.json` (added `check:bundle` script), `.github/workflows/ci.yml` (added `Run check:bundle` step between build and audit:privacy)
- **Status:** `in-progress` → `review` → `done`

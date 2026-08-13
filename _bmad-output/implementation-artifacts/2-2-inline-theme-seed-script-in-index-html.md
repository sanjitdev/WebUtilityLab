# Story 2.2: Inline theme-seed script in index.html

Status: done
baseline_commit: e815dd00f225b003cee0eb2a5cab71a3f3c62c8e (post S02.1 stamp)
final_commit: <to be filled after push>

> **Loop protocol (mandatory).** This story must pass Review #1 (coderabbit), Review #2 (bmad-code-review), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. The story at the front of every loop is the smallest thing the architecture needs to keep working — `S02.2` lands the **first-paint theme seed** that prevents FOUC (flash-of-unstyled-content / flash-of-wrong-theme) on reload. S02.1 put the `.dark` selector in `tokens.css`; without this seed, a dark-mode user would see a white flash for one frame before the bundle hydrates and the toggle lands (S02.3). The seed runs as an inline `<script>` in `<head>`, executes synchronously before paint, and is the **only** theme-state mutation that lives outside Svelte.

## Story

As a **solo developer (Sanjit)** building WebUtilityLab's CSV Rescue MVP,
I want **`index.html` to contain an inline `<script>` (placed in `<head>`, before any CSS link or module script) that synchronously reads `localStorage.getItem('wul-theme')`, falls back to `matchMedia('(prefers-color-scheme: dark)').matches`, and adds `class="dark"` to the `<html>` element if the resolved mode is dark — all before the browser's first paint**,
so that **the page renders in the user's chosen theme on first frame (no FOUC, no white-flash for dark-mode users), the Privacy Baseline's "no FOUC, system stack only" posture extends to a "no theme flicker" posture, and S02.3's `ThemeToggle.svelte` can assume the dark class is the single mutation surface for theme state (the toggle's job is to flip the class, persist the value, and announce the change — not to seed it from scratch on every mount)**.

## Acceptance Criteria

1. **Inline `<script>` lives in `<head>`.** Place: between `<meta name="viewport">` and the `<title>` (or anywhere in `<head>` before `</head>` that runs before paint). Type: omitted (default `text/javascript`); an inline classic script blocks parsing until it runs — *this is the entire point*. No `type="module"` (deferred); no `defer` / `async`.
2. **No external resources.** The script reads only `localStorage` and `window.matchMedia`. No `fetch`, no `XMLHttpRequest`, no DOM attribute other than `<html>`'s class.
3. **Resolution precedence** (mutually exclusive, in order):
   1. `localStorage.getItem('wul-theme')` — return values `'dark'` or `'light'` are honored; any other value (including `null`) falls through.
   2. `window.matchMedia('(prefers-color-scheme: dark)').matches` — `true` → dark.
   3. Default → light.
4. **Mutation**: when the resolved mode is `dark`, the script sets `document.documentElement.classList.add('dark')`. It does **not** set any inline style, attribute other than `class`, or anything on `<body>`.
5. **No FOUC**: the script is structurally inline and synchronous; placing it after CSS or before the bundle entry does not change "no FOUC" because the CSS in S02.1 declares both `:root { … }` (light) and `.dark { … }` (dark) — there is no separate dark stylesheet to load before resolving. The contract is: by the time the first pixel paints, the `<html>` element has (or does not have) `class="dark"`.
6. **No new dependencies.** The script uses browser globals only — no imports, no helpers from `src/`. The script length is bounded (~10–15 lines).
7. **Survives the Privacy Baseline scanners:**
   - `audit-privacy.mjs` (source-grep): the script introduces no `fetch` / `XMLHttpRequest` / `EventSource` / `sendBeacon` / dynamic `<script>` injection. Hand-verified.
   - `audit-behavior.mjs` (Playwright on `dist/`): the script introduces no new network request. The script reads `localStorage`, which is not a network. Verified at `npm run audit:behavior` time.
   - `audit:privacy` source-grep over `src/` does **not** cover `index.html` today; this story adds an assertion that the inline script is the only theme-mutation point (see test AC11).
8. **Token discipline preserved.** `index.html` does not introduce any hex color literal, any `@font-face`, any `@import`. Verified by the existing `tests/tokens-css.test.ts` AC6 and AC7 — these scans walk `src/`, but the S02.2 scan will extend to `index.html` (see test AC11).
9. **The toggle story (S02.3) does not regress.** The seed sets `class="dark"` on `<html>` if and only if the resolved mode is dark. S02.3's `ThemeToggle.svelte` later runs in the bundle, reads `localStorage.getItem('wul-theme')` and the current class to render the initial label; if the seed flipped the class, S02.3's mount is the first thing to run after the script. The seed never persists to `localStorage` (only S02.3 does) — the seed reads; the toggle writes. This separation prevents a loop where the seed writes `light`, the toggle reads `light` and doesn't flip, and the user sees light when they expected dark.
10. **Empty-state behavior**: for a first-visit user with `prefers-color-scheme: dark`, the page renders dark on first paint (no white flash, then dark). For a first-visit user with `prefers-color-scheme: light` (or no preference), the page renders light (today's behavior, no change).
11. **Vitest test file** at `tests/theme-seed.test.ts` (or extend an existing test file if one exists). Tests for:
    - **AC11a**: `index.html` contains an inline `<script>` element.
    - **AC11b**: the script's source matches one of two whitespace-tolerated shapes (exact-equality is brittle; match the canonical template with `\s+` flexed).
    - **AC11c**: the script uses `localStorage.getItem('wul-theme')` AND `prefers-color-scheme: dark` — both strings must appear in the script body; absence of either is a fail.
    - **AC11d**: the script writes `class="dark"` to `<html>` — assertion by string match on `classList.add('dark')` or equivalent.
    - **AC11e**: the script is structurally inline (no `src` attribute, no `type` attribute that defers).
    - **AC11f**: the script does NOT include `fetch`, `XMLHttpRequest`, `import`, `require`, `document.write`, `<link>`, `<style>`, or color/font literals.
    - **AC11g (extended)**: every other place in the codebase that writes to `<html>.classList` is the seed (and, eventually, S02.3's toggle). Source grep over `src/` and `index.html` for `classList` mutations and assert each is documented-or-singular. (Initial assertion: only the seed exists; S02.3 will add the second.)
    - **AC11h (behavioral shape)**: Playwright-driven test in a Vitest file is **out of scope here** (`environment: 'node'`); the existing `scripts/audit-behavior.mjs` covers the behavioral claim and is the production gate. This story does not duplicate it.
12. **No structural change to `src/`.** Only `index.html` is modified. No new files in `src/`. No modifications to `src/main.ts`, `src/App.svelte`, `src/styles/`, `vite.config.ts`.

## Verification

1. `npm test` → all tests pass (~113 from before S02.2 + a small number of new tests in `tests/theme-seed.test.ts`).
2. `npm run check` → svelte-check 0 errors + tsc 0 errors.
3. `npm run build` → `dist/` exists; `find dist -name '*.map' | wc -l` = 0; the bundle still has no hex literals outside `:root` / `.dark` (existing `tests/tokens-css.test.ts` AC6 still passes).
4. `npm run audit:privacy` → OK; the inline script does not introduce a forbidden source pattern.
5. `npm run audit:behavior` → OK; the deployed page still makes zero post-load network requests, zero anomalous requests, zero service workers. `audit-behavior.mjs` already asserts page chrome landmarks are present (E02 was the unblocker); with S02.4 landing the header/main/footer, this assertion should turn from "(info) partial" to "all landmarks present" once S02.4 ships.
6. `npm run check:deps` → OK (no new deps).
7. `npm run check:telemetry` → OK (no new source-level telemetry patterns).
8. **Manual / DevTools**:
   - Visit `dist/index.html` directly (or via `npm run preview`): clear `localStorage.wul-theme` if present, refresh — page renders light (or dark if your `prefers-color-scheme` is dark).
   - With DevTools → Application → Local Storage → set `wul-theme=dark`, refresh — page renders dark on first paint, no white flash.
   - With `wul-theme=invalid-value`, refresh — falls through to `prefers-color-scheme`.
   - With `wul-theme=dark`, open Throttling → Slow 3G and reload — the inline seed runs synchronously regardless of network speed (it's just `localStorage` and `matchMedia`); the page's first paint is still dark.

## Loop Protocol Path Forward

1. Implement Tasks 1–4 (template below).
2. Run production-readiness gate (Step 7 of loop).
3. Run Review #1 — coderabbit in fresh context against the diff.
4. Apply Review #1 fixes if any.
5. Run Review #2 — bmad-code-review in fresh context against diff + Review #1 findings.
6. Apply Review #2 fixes if any.
7. Flip `sprint-status.yaml` to `done`.
8. Update story file with step-05 maintenance patch notes.
9. Move to S02.3 (`2-3-theme-toggle-svelte-aria-pressed-cross-tab-sync`).

## Script template (canonical, for the dev agent)

This is the shape the test will match against (whitespace flexed). Place the script **after `<meta name="viewport">`** and **before `<title>`** in `<head>`:

```html
<script>
  (function () {
    try {
      var stored = localStorage.getItem('wul-theme');
      var mode = (stored === 'dark' || stored === 'light')
        ? stored
        : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      }
    } catch (_) {
      // localStorage may throw in privacy-strict browsers; default to light.
    }
  })();
</script>
```

### Notes on the template

- **IIFE**: the script runs once at parse time; namespacing avoids polluting `window`. The wrapper is a defensive measure; the script body has no `var` hoisting concerns but IIFE is the convention.
- **`try/catch`**: `localStorage.getItem` can throw in privacy-strict browsers or when storage is disabled; a thrown error in a `<head>` script aborts parser execution and can leave the page in an inconsistent state. Catch, log nothing (no `console.error` — observable noise vs. the alternative of an empty catch is fine), default to light.
- **No `console.error` or `console.warn`**: console output in a head script is an observability surface we don't need; it also can appear in test runners that listen to console. Silence the error path.
- **`var` over `let`/`const`**: the script target is ES2022; `let`/`const` work, but `var` keeps the body identical to the pattern that privacy auditors expect (no block-scoping surprises if the script is ever concatenated). Both are correct; choose `var` for consistency with the E01 era.
- **No matchMedia fallback to `false`**: `window.matchMedia` is in all target browsers per `SOLUTION-DESIGN.md` §"Build-time calls (resolved)" and per E13 S13.16's feature-based detection matrix. The `&&` short-circuit guards against the rare "matchMedia defined but threw" path.

## Files modified

- **MODIFIED**: `index.html` — add the inline `<script>` in `<head>` (template above).
- **NEW**: `tests/theme-seed.test.ts` — ~5–8 tests covering AC11a–AC11g.
- **MODIFIED**: `_bmad-output/implementation-artifacts/sprint-status.yaml` — flip status to `done` after loop closes.
- **MODIFIED**: `_bmad-output/implementation-artifacts/2-2-inline-theme-seed-script-in-index-html.md` — final status, step-05 maintenance patch notes.

## Notes for the dev agent

- **Place the script in `<head>`, before `<title>` and before any other stylesheet/link.** Placement after `<title>` works for the FOUC behavior (the script still runs before the first `<body>` paints) but tests may anchor against a strict ordering — match the template ordering for robustness against future-proof refactors of the head.
- **Inline is non-negotiable.** An external `src="./theme-seed.js"` introduces a network round-trip and reintroduces FOUC. The whole point of this story is to make the theme seed synchronous with parse.
- **Do not cache the result in a global.** The `ThemeToggle.svelte` in S02.3 is the only persistent writer; the seed is a one-shot reader. Adding a `window.__wulTheme` global is a code smell.
- **Do not call `localStorage.setItem`.** S02.3 owns persistence. If you persist here, you create a circular dependency between the toggle's label render and the seed's initial write.
- **`documentElement.classList.add('dark')` is the only DOM mutation.** Do not also set `<html lang="dark">`, `<html data-theme="dark">`, or `<html style="…">`. The token contract reads from `class="dark"` only — adding parallel attributes is asymmetric drift.
- **The `tokens-css.test.ts` AC6 hex-literal scan** is keyed off `src/`, not the project root. `index.html` is not currently scanned. This story's `tests/theme-seed.test.ts` AC11f asserts no hex/color literals in the seed script body; full-html hex-literal coverage lands in E13 S13.11 hardening if needed. (Call out the gap in the step-05 patch if you find a reason to extend.)
- **`storage` event listener does NOT go here.** S02.3 adds `window.addEventListener('storage', …)` for cross-tab sync; that's a Svelte-bundle behavior, not a parse-time behavior. Do not preempt it.
- **If you must read the value twice** (e.g., for the toggle's initial label), the seeded class is the truth — read `documentElement.classList.contains('dark')`, not `localStorage` (because the storage can be `null` and the class can still be `dark` via system preference). S02.3 will sort this out; do not pre-empt.

## Architectural compliance (AD-7, AD-8, AD-9, Privacy Baseline)

- **AD-7 (Theme contract)**: CSS-variable class flip on `<html>` (`.dark`); `localStorage` key `wul-theme`; first paint seeded by `prefers-color-scheme` via an inline `<script>` (no FOUC); theme transition is the only motion in the app. **This story lands the "no FOUC" half of AD-7.** S02.3 lands the toggle button, the persistence, and the live-region announcement. The 180 ms theme transition (S02.5) and the `prefers-reduced-motion` gate land later.
- **AD-8 (Visual token discipline)**: no hex literals in the seed. Verified by AC11f.
- **AD-9 (a11y)**: not directly applicable here (a11y-focusable elements are S02.3/S02.5). The seed is invisible to assistive tech — silent.
- **Privacy Baseline (FR-23)**: the seed is structural enforcement of "no theme flicker" without analytics, fonts, CDN, or remote calls. The script is localStorage-only.

## Previous story continuity (S02.1)

- **S02.1 landed `src/styles/tokens.css` with two blocks**: `:root { … }` (light) and `.dark { … }` (dark). The selector `.dark` is **bare class** (not `:root.dark`, not `html.dark`). The seed story uses `documentElement.classList.add('dark')` — the class is added to `<html>`, which CSS specificity matches the bare `.dark` selector equivalently. **Do not change `.dark` to `html.dark` to "match" the seed.** The bare class is the documented target; the seed matches.
- **S02.1 stub renames**: `--muted` is gone (consolidated to `--graphite`); the seed does not read tokens directly, but if a future story ever needs `getComputedStyle(...).getPropertyValue('--paper')` from the seed, it must use the canonical token names.
- **S02.1 file structure**: `tokens.css` is imported by `app.css` via `@import './tokens.css';`. The seed does not participate in this import chain — it's plain HTML+JS, parsed before the bundle's CSS evaluates. The first paint sees the inline `<style>` rules from `tokens.css` (when it lands via Vite's link tag) **plus** the class on `<html>`. Order-of-parse consideration is moot because Vite emits the link after the body where the bundle mounts; the inline script has already finished by then. The point is: **the class flips synchronously**, and the CSS doesn't need to re-fetch.

## Previous story intelligence (S01.1–S01.11 + E01 retrospective)

- **Token discipline test pattern (`tests/tokens-css.test.ts` AC6/AC7)**: the convention is "scan a directory for forbidden patterns and assert zero hits." Mirror it in `tests/theme-seed.test.ts` AC11f — but only scan the script body, not the whole file (the file may legitimately contain other hex-aware comments).
- **`audit-behavior.mjs` already asserts post-load zero requests and zero SW registrations.** The seed doesn't change those counts. The behavioral gate is satisfied with the existing script; verify only.
- **`audit-privacy.mjs` source-grep covers `src/`.** It does **not** currently cover `index.html`. The seed is in `index.html`, so the source-grep is a no-op for this story. The new test file AC11f is the loader guard for the inline script.
- **No new dependencies rule** is firm (carried from S01.11's `.npmrc`). The seed adds zero `package.json` entries.
- **`tests/*.test.ts` extension pattern**: existing test files use `node:fs` + `node:path` + `node:url` + `vitest`. Mirror this exactly.

## Project Context Reference

- **Privacy Baseline (FR-23)**: zero runtime network calls after page load. The seed is local-only; verified by `audit-behavior.mjs` post-load zero-requests assertion (which already passes on the empty-state wordmark today; S02.2 doesn't break it).
- **DESIGN.md §"Components" → "Theme toggle"** is the canonical description of the full Theme contract; S02.2 is the seed half, S02.3 the toggle half.
- **EXPERIENCE.md §"Component Patterns" → "Theme toggle"**: "First paint is seeded by `prefers-color-scheme`." This story literalizes that line.
- **AD-7 (Theme contract)**: the seed is structurally required for AD-7's "no FOUC" claim to hold. Without it, AD-7 is partially landed (CSS variables exist but the first paint always flashes light for a dark-mode user). S02.2 + S02.3 close the AD together; S02.4–S02.6 are independent.
- **epics.md §E02 S02.2**: "Inline theme-seed script in `index.html`: read `localStorage.wul-theme`, fall back to `prefers-color-scheme`, flip `<html class="dark">` before paint." This story literalizes that line.
- **Loops-protocol mandate**: the per-story loop is non-negotiable. The story's contract is small; the discipline is large. S02.1's loop is the precedent.

## Step-05 Maintenance Patch (post-review)

After Review #1 (coderabbit, fresh context, in this session) and Review #2 (bmad-code-review, fresh context, in this session), the following maintenance patches were applied. Both reviews approved the implementation; the fixes address drift between spec and tests, and surface forward-compat caveats for S02.3.

### Review #1 (coderabbit) — applied before Review #2

1. **Test file hygiene: top-level imports instead of inline `require()`.** The original AC11g test used `require('node:fs')` and `require('node:path')` inside the test body. Vitest runs the file as ESM via the vite worker pipeline; an inline `require` works but breaks lint and ESM-only tooling. Moved `readdirSync`, `statSync`, `existsSync`, `readFileSync` to top-level imports alongside the existing `join` / `fileURLToPath` / `vitest` imports.
2. **AC11g regex scoped to `documentElement.classList`.** Originally matched `.classList.(?:add|remove|toggle|replace)(` anywhere. Tightened to `documentElement.classList.(?:add|remove|toggle|replace)(` so a future component-level classList mutation (e.g. on a button element) doesn't false-positive this test, AND so the test's failure message points at a specific document-level mutation rather than a generic classList pattern.

### Review #2 (bmad-code-review) — applied after both reviews

1. **AC11b: added canonical-shape match (spec drift fix).** Spec line 35 mandates "match the canonical template with `\s+` flexed." The original test only asserted fragment presence (`localStorage.getItem`, `prefers-color-scheme: dark`, `'dark'`, `'light'`). A script that satisfies those fragments but uses `let` instead of `var`, omits the IIFE, or sets `data-theme` instead of `class` would have passed. Added an 8-part regex sequence (IIFE open, `var stored`, `var mode` strict-equality, `matchMedia` query, `if (mode === 'dark')`, `document.documentElement.classList.add('dark')`, the catch block, the IIFE close + IIFE call) that pins the canonical shape with whitespace flexed. The catch-body pattern allows an optional `//…` comment line (the seed documents the silent default-light behavior).
2. **AC11f: split into seed-body + full-index.html scans (spec drift fix).** Spec AC8 + AC11 explicitly say the token-discipline scan "will extend to `index.html`". The original test scoped hex/rgb/hsl checks to `extractSeed()` only — the rest of `index.html` was un-scanned. Added two more `it` assertions: "the full index.html contains no hex color literal" and "the full index.html contains no rgb()/hsl() color function". The early gate keeps a regression between S02.2 and S02.4 (e.g. an accidental `<meta name="theme-color">`) from shipping to E13 hardening.
3. **AC11g: weakened single-`classList.add` count to `≥ 1` (over-specification fix).** The original test asserted exactly 1 `classList.add` call. The spec asks only that the seed is the *sole* `documentElement.classList` mutation surface, not that it has exactly one additive call. A future contributor adding an idempotent re-add (e.g. for a `light`-variant flag) is benign and should not break the test. Changed `toBe(1)` to `toBeGreaterThanOrEqual(1)` with a comment explaining the rationale.
4. **AC11g: extended `index.html` scan to cover classList mutations outside the seed (spec drift fix).** Spec line 40 mandates "Source grep over `src/` and `index.html`". The original test only walked `src/`. Added a third `it` that strips the seed block from `index.html` and asserts the remainder contains no `documentElement.classList.{add|remove|toggle|replace}(`. This catches a regression where a parallel inline script (or a `<script src=…>` injection) mutates the html class — a Privacy Baseline + AD-7 violation.

### Known limitations (recorded for S02.3 maintenance)

- **`extractSeed()` first-match assumption.** If a future story ever injects a non-module classic script BEFORE the seed (e.g. a Svelte-bundled compatibility shim), this helper picks the wrong script. Mitigation: the placement convention (seed always first) plus the AC11a positional check (script precedes `</head>`) trips first if the convention is broken. If a future contributor breaks the convention, the positional assertion fires before `extractSeed()`'s mis-target is observable.
- **AC11g regex misses stored-reference mutations.** Pattern `documentElement.classList.` will not catch `const root = document.documentElement; root.classList.toggle('dark')` — exactly the shape S02.3's toggle may use. When S02.3 lands, this assertion must be widened (e.g. accept a stored ref on `documentElement`) or split into separate per-shape patterns. Today (S02.2 lands first), the pattern is the right shape: any production mutation uses the `documentElement` literal, and any deviation is a maintenance signal.

### Final state

- All 7 production-readiness gates green.
- 148 tests pass (35 new in `tests/theme-seed.test.ts` across 7 describe blocks).
- No new dependencies.
- The seed is structurally inline in `<head>`, executes synchronously, and is the *only* `documentElement.classList` mutation surface in the codebase. Privacy Baseline preserved: zero new network calls; `audit-behavior.mjs` confirms 3 same-origin requests / 0 anomalous / 0 service workers. S02.3 closes the other half of AD-7 (toggle button, persistence, live-region announcement).

# Story 2.6: Editorial posture sanity — system-ui, no font-face, zero network

Status: done
baseline_commit: fdb8a37329ed2db20bc2cce95a23a32a14b29f5d
final_commit: 928889c

> **Loop protocol (mandatory).** This story must pass Review #1 (coderabbit), Review #2 (bmad-code-review), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. `S02.6` is the **editorial-posture sanity** story — the final story in E02 — and it closes the user-visible half of E02's privacy claim by pinning, via a single canonical test gate, that the page renders the system font stack, ships zero `@font-face` declarations, and the built `dist/index.html` carries zero outbound network requests. Before this story, the editorial claims ("system-ui only", "no web fonts", "no external requests") live in scattered comments and the existing `scripts/audit-privacy.mjs` source-grep, but there is no dedicated test file that locks the claim at the dev's day-to-day `npm test` surface — a future contributor could add a `<link href="https://fonts.googleapis.com/...">` to `index.html` (it lives at the repo root and is NOT walked by `audit-privacy.mjs`'s `src/` + `scripts/` walk — actually it IS scanned separately, see line 244-249; this is a defense-in-depth double-pin), and the gate would still pass as long as `audit-privacy.mjs` didn't trip (it would, but the failure mode would be a script-level error rather than a focused test failure). After S02.6, a focused test file `tests/editorial-posture.test.ts` asserts every clause of the editorial posture at `npm test` time, with granular per-clause failure diagnostics, and the gate fails fast at the dev's editor — not at the CI script exit code.

## Story

As a **reader of WebUtilityLab / CSV Rescue's source code, and as the future me (or another contributor) tempted to "just add a Google Font" to make the wordmark prettier**,

I want **a single test file that pins every clause of the editorial posture: the page renders the system font stack (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`); no `@font-face` declaration lives anywhere in `src/`; no font URL (Google Fonts, gstatic, any `@import` of an external font) is referenced; the root `index.html` has no external `<link>` or `<script src>` pointing at a third party; the built `dist/` contains no external network reference; and the Privacy Baseline source-grep continues to pass**,

so that **the privacy claim (FR-23) is locked at the dev's `npm test` surface, not buried in a build-time script. A future contributor who adds a `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` fails the test with a single, focused diagnostic message; they don't have to understand `scripts/audit-privacy.mjs`'s tree-walking logic to know they broke the contract. Without S02.6, the editorial posture is asserted only by `audit-privacy.mjs` and by manual review — both are correct but neither gives the granular, per-clause signal that a Vitest test gives. S02.6 is the regression net for the "no fonts, no network" half of E02's privacy baseline.**

## Acceptance Criteria

1. **The page renders the system font stack via `var(--font-system)`.** `src/styles/tokens.css` declares `--font-system: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;` at the `:root` block (the S02.1 declaration, line 72-73 of `tokens.css`). `src/styles/app.css` line 36 sets `body { font-family: var(--font-system); }` so every text element inherits the system stack. The skip-link (line 53 of `app.css`) and the theme toggle (line 75 of `ThemeToggle.svelte`) ALSO use `var(--font-system)` — explicit, not inherited — so a future scope-restricted selector doesn't break the typography. No file references a font family by literal name (e.g., `font-family: Arial;`) or by remote URL (e.g., `font-family: 'Inter', sans-serif;` with a `<link>` to Google Fonts).

2. **No `@font-face` declaration exists in `src/`.** Walk every `.css` and `.svelte` file under `src/` and assert that no `@font-face` block exists outside of comments. The `tests/tokens-css.test.ts` AC7 already covers this for `tokens.css` + `app.css`; S02.6 broadens the scope to the entire `src/` tree (including `ThemeToggle.svelte` and any future component file) via a `walkSrcSync()` recursive walker. The existing `tests/tokens-css.test.ts` AC7 test is the regression detector for `tokens.css` + `app.css`; the new S02.6 test covers the rest.

3. **No Google Fonts URL exists anywhere.** The literal substrings `fonts.googleapis.com` and `fonts.gstatic.com` do not appear in any source file under `src/` (CSS, Svelte, TS, JS, HTML), in `index.html` at the repo root, in any file under `scripts/`, or in any file under `tests/`. The forbidden-host list in `scripts/audit-privacy.mjs` (lines 69-70) already includes both; S02.6 mirrors the assertion in the test file so the dev's `npm test` surface catches a future regression before the CI script does.

4. **No `@import` rule loads an external font.** The `@import` keyword may appear ONLY in the form `@import './tokens.css';` (a relative-path import that Vite resolves at build time to a static module dependency — the resulting bundle has `tokens.css`'s declarations inlined, no separate network request). A grep for `@import url(`, `@import 'https://`, `@import "https://`, `fonts.googleapis.com`, `fonts.gstatic.com`, `@font-face`, `typekit`, `font-awesome`, `cdn.jsdelivr.net/font`, `unpkg.com/font` in all source + test + index.html + script files returns zero matches outside documenting comments.

5. **`index.html` has no external `<link>` or `<script src>`.** The root `index.html` (at the repo root, the Vite entry HTML) contains exactly two `<script>` tags: the inline theme-seed script (lines 21-35, classic, no `src`) and the Vite module entry `<script type="module" src="/src/main.ts"></script>` (line 40, relative path resolved by Vite's dev server / bundled into the dist JS at build time). No `<link rel="stylesheet" href="https://...">`, no `<link rel="preconnect" href="https://...">`, no `<meta http-equiv="refresh" content="...">`. The page title is the only `<meta>` content (`charset`, `viewport`); no Open Graph, no Twitter card, no analytics meta. The `<html lang="en">` is set; the document is well-formed.

6. **The built `dist/index.html` carries no external network references.** `npm run build` produces `dist/` containing `index.html`, JS chunks, and CSS. After build, view-source on `dist/index.html` shows: zero `<link rel="stylesheet" href="https://...">`, zero `<script src="https://...">`, zero `<img src="https://...">`, zero `<source src="https://...">`, zero `<iframe src="https://...">`. All asset references use relative paths (`/assets/...` resolved by the CDN at request time, but the source-of-truth `href`/`src` in the HTML is a relative path — the CDN hostname is NOT in the HTML source). The grep is on `dist/index.html` directly, after the build runs. The test file builds and walks the dist output (or reads a snapshot the build step produces); the assertion is on the shipped HTML, not on the source.

7. **`scripts/audit-privacy.mjs` source-grep continues to pass.** The script already walks `dist/`, `src/`, `scripts/`, and the root `index.html`. After S02.6, it should report `OK (static walk)` with zero findings. The new `tests/editorial-posture.test.ts` invokes the audit as a child process and asserts exit code 0, OR re-implements the relevant sub-checks inline (per AC2-AC6). The audit-privacy source-grep is the runtime gate; the new test is the day-to-day dev gate.

8. **`scripts/audit-behavior.mjs` Playwright check continues to pass.** The audit-behavior script drives `vite preview` and asserts zero post-load requests. After S02.6, the rendered page in the Playwright session makes zero network calls (no Google Fonts CSS, no gstatic font file, no analytics beacon). The script's existing request-listener captures zero entries past the initial HTML+JS+CSS load. The new test asserts the same outcome via a focused read of the audit-behavior output (the script writes a summary line on success).

9. **No hex literals anywhere outside `tokens.css`.** `tests/tokens-css.test.ts` AC6 already walks `src/` and asserts zero hex literals outside `tokens.css`. S02.6 mirrors the assertion in the new test file (defense-in-depth: the same gate is enforced by two independent test files, so a future edit to one test file doesn't silently disable the gate). The hex-literal count in `tokens.css` is exactly 30 (15 colors × 2 modes, unchanged from S02.5's count).

10. **No other transition / animation / @keyframes exists in `src/`.** The S02.5 test (`tests/focus-ring.test.ts` AC15d / AC15j) walks `src/` for transitions, animations, cubic-bezier, and keyframes. S02.6 includes the same scan in `tests/editorial-posture.test.ts` as a regression pin (the S02.5 test will catch a transition regression; the S02.6 test catches it independently and provides a second failure surface with a different diagnostic message). The only `transition:` rule in the codebase is in `tokens.css` (the 180ms theme transition gated by `@media (prefers-reduced-motion: no-preference)`).

11. **`tokens.css` and `app.css` still use only `var(--font-system)`, never a literal font name.** No `font-family: Arial`, `font-family: sans-serif`, `font-family: serif`, `font-family: monospace` in chrome or tokens — every font reference is `var(--font-system)` or `var(--font-mono)`. The S02.5 test pin AC15h already asserts no hex literals; S02.6's analogous pin is on font-family literals.

12. **Tests** at `tests/editorial-posture.test.ts` (NEW), mirroring the convention from `tests/tokens-css.test.ts` / `tests/theme-seed.test.ts` / `tests/theme-toggle.test.ts` / `tests/page-chrome.test.ts` / `tests/focus-ring.test.ts`: `node:fs` + `node:path` + `node:url` + `node:child_process` (for the audit script subprocess invocations) + `vitest`. The test file uses the `walkSrcSync()` helper shape from `tests/focus-ring.test.ts` (recursive walker over `src/`). Coverage:
    - **AC16a (system-ui renders via the token)** — `tokens.css` declares `--font-system:` containing the literal substring `system-ui,`; `app.css` line 36 has `body { font-family: var(--font-system); }`; the body uses the token (not a literal font name); the skip-link (line 53) and ThemeToggle (line 75) also use the token.
    - **AC16b (no `@font-face` declarations anywhere in `src/`)** — walk `src/` for any `@font-face` outside comments. The existing `tests/tokens-css.test.ts` AC7 covers `tokens.css` + `app.css`; this AC broadens to the whole `src/` tree.
    - **AC16c (no Google Fonts URLs anywhere)** — assert `fonts.googleapis.com` and `fonts.gstatic.com` are NOT present in any source / test / script / `index.html` file. Mirror `tests/tokens-css.test.ts` AC7 second test but broaden the file scope.
    - **AC16d (no `@import` rule loads an external font)** — grep `src/`, `index.html`, `scripts/`, `tests/` for `@import url(`, `@import 'https://`, `@import "https://`, `@font-face`, `typekit`, `font-awesome`. The only `@import` allowed is the literal `@import './tokens.css';` in `app.css`.
    - **AC16e (`index.html` has no external `<link>` or `<script src>`)** — read `index.html`, assert zero matches for `href="https://`, `href='https://`, `src="https://`, `src='https://`, `<link rel="stylesheet"`, `<link rel="preconnect"`. The two allowed `<script>` tags are the inline seed (no `src`) and the Vite entry (`src="/src/main.ts"`, relative path).
    - **AC16f (`dist/` after build carries no external network references)** — run `npm run build` (or skip if `dist/` already exists and is recent), then read `dist/index.html` and assert zero matches for `https://`, `http://` (excluding `http://www.w3.org/2000/svg` namespace declarations if any), `//cdn.`, `googleapis`, `gstatic`. The test may shell out to `npm run build` (AC16f-1) or read `dist/index.html` if present (AC16f-2 — skip-on-missing).
    - **AC16g (`scripts/audit-privacy.mjs` exits 0)** — shell out via `child_process.spawnSync('node', ['scripts/audit-privacy.mjs'])` and assert exit code 0. The script must run AFTER `npm run build` (it reads `dist/`).
    - **AC16h (`scripts/audit-behavior.mjs` exits 0)** — shell out via `spawnSync('node', ['scripts/audit-behavior.mjs'])` and assert exit code 0. Playwright check.
    - **AC16i (no hex literals outside `tokens.css`)** — mirror `tests/tokens-css.test.ts` AC6 first test (no `#rrggbb` outside `tokens.css`) using the project's broader file walk.
    - **AC16j (Privacy Baseline + AD-7 motion contract preserved)** — mirror `tests/focus-ring.test.ts` AC15j: no `fetch(`, `XMLHttpRequest`, `EventSource`, `sendBeacon`, `navigator.sendBeacon`, `new Function`, `eval`, `import(` anywhere in `src/`. Walk the whole tree.
    - **AC16k (`tokens.css` still has exactly 15 color tokens)** — mirror `tests/tokens-css.test.ts` AC1 / `tests/focus-ring.test.ts` AC15g: the `:root` block contains exactly the 15 expected color tokens; the `.dark` block mirrors.
    - **AC16l (the 30 hex literals in `tokens.css` are unchanged)** — mirror `tests/focus-ring.test.ts` AC15h first test: `tokens.css` contains exactly 30 hex literals (15 colors × 2 modes).
    - **AC16m (S02.5 / S02.4 / S02.3 / S02.2 / S02.1 boundary pins unchanged)** — read `tests/focus-ring.test.ts`, `tests/page-chrome.test.ts`, `tests/theme-toggle.test.ts`, `tests/theme-seed.test.ts`, `tests/tokens-css.test.ts` and assert each contains the expected boundary pin (focus-visible, AC14g, AC13f aria-pressed, AC11g allowlist, AC1 expected list). A regression in any earlier story's gate is caught at `npm test` time even if the failing test's `it(...)` description was renamed.
    - **AC16n (no `font-family:` literal in chrome or tokens)** — assert `app.css` and `tokens.css` contain ONLY `var(--font-system)`, `var(--font-mono)`, or the token declarations themselves. No `font-family: Arial`, `font-family: sans-serif`, `font-family: monospace` (literal), `font-family: serif` (literal).

13. **README / docs / planning-artifact changes are out of scope.** No edits to `CHANGELOG.md`, `SECURITY.md`, `docs/loop-protocol.md`, `docs/pii-patterns.md`, or the planning artifacts (post-Epic updates). The story commit is code-only.

14. **No new dependencies.** S02.6 is a test-file addition + an optional small config tweak (e.g., adding `editorial-posture` to a test runner glob if Vitest's default `tests/**/*.test.ts` glob doesn't pick it up — Vitest's default IS `**/*.test.ts` so no tweak needed). No `package.json` entries. The existing S01.11 `.npmrc` exact-version pinning is in force.

15. **`tests/editorial-posture.test.ts` passes in the production gate.** The test file is committed, runs at `npm test`, and all assertions pass on the first implementation (no follow-up patches expected — the implementation is the gate itself).

## Verification

1. `npm test` → all tests pass (271 from before S02.6 + new tests in `tests/editorial-posture.test.ts`). The new test file adds ~15-25 tests across ~14 describe blocks (AC16a-AC16n).
2. `npm run check` → svelte-check 0 errors + tsc 0 errors. (S02.6 adds a `.ts` test file; it must typecheck.)
3. `npm run build` → `dist/` exists; `find dist -name '*.map' | wc -l` = 0; bundle still under budget. S02.6 is test-only — bundle size unchanged.
4. `npm run check:bundle` → under 200 KB gzipped.
5. `npm run audit:privacy` → OK; the test file inlines the same checks via the AC16b/AC16c/AC16d scans and additionally shells out to the script for the canonical assertion (AC16g).
6. `npm run audit:behavior` → OK; zero post-load requests; the new test file shells out for the canonical assertion (AC16h).
7. `npm run check:deps` → OK.
8. `npm run check:telemetry` → OK.
9. **Manual / DevTools**:
   - `npm run preview`; open the served page in Chrome.
   - DevTools → Elements → inspect `<body>` → Computed → `font-family`. Value should be the resolved system stack (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`). On macOS, the rendered font is SF Pro; on Windows, Segoe UI; on Linux, the distro default. The `system-ui` token cascades to the OS's UI font.
   - DevTools → Network → reload. The only requests are the HTML, the bundled JS, the bundled CSS. Zero requests to `fonts.googleapis.com`, `fonts.gstatic.com`, any analytics host, any CDN-with-logs. The panel's filter "Domain" shows only `localhost` (or the CDN hostname in production, but the deployed `dist/index.html` carries no host names — only relative asset paths).
   - View `view-source:https://<prod-host>/` — same: zero external references in the served HTML. The `dist/index.html` snapshot is the source of truth.
   - DevTools → Lighthouse → Performance. Score should remain high (no web font load = no FOUT/FOIT, no layout shift from late font swap).
   - DevTools → Lighthouse → Accessibility. Score should remain high (system-ui is accessible; no @font-face means no font-loading failures that could cause a11y regressions).

## Loop Protocol Path Forward

1. Implement Tasks 1–3 (template below).
2. Run production-readiness gate (Step 7 of loop).
3. Run Review #1 — coderabbit in fresh context against the diff.
4. Apply Review #1 fixes if any.
5. Run Review #2 — bmad-code-review in fresh context against diff + Review #1 findings.
6. Apply Review #2 fixes if any.
7. Flip `sprint-status.yaml` to `done`.
8. Update story file with step-05 maintenance patch notes.
9. **E02 retrospective** (`epic-2-retrospective`).
10. Move to E03 — `3-1-real-button-dropzone-opens-file-picker`.

## Tasks / Subtasks

- [x] **Task 1** — Verify the source code already satisfies every clause (no production code changes expected):
  - [x] 1.1 Read `src/styles/tokens.css` and confirm `--font-system:` and `--font-mono:` declarations exist with the system stack literals (already in place from S02.1; verify line numbers).
  - [x] 1.2 Read `src/styles/app.css` and confirm `body { font-family: var(--font-system); }`, the skip-link uses `var(--font-system)`, and no other font-family literal exists.
  - [x] 1.3 Read `src/components/ThemeToggle.svelte` and confirm the toggle's CSS uses `var(--font-system)` (line 75).
  - [x] 1.4 Read `index.html` and confirm no external `<link>` or `<script src>`.
  - [x] 1.5 Read `scripts/audit-privacy.mjs` and `scripts/audit-behavior.mjs` to confirm the gate exists.
  - [x] 1.6 Run `npm run build` and read `dist/index.html`; confirm zero external network references.
  - [x] 1.7 If any AC is unmet by the current source, document the gap in the story file's "Step-05" section and address it before implementing the test gate. (Expected: all ACs are already met — S02.6 is a test-only story.)

- [x] **Task 2** — Create `tests/editorial-posture.test.ts`:
  - [x] 2.1 Mirror the test convention: `import { describe, it, expect } from 'vitest';` + `node:fs` + `node:path` + `node:url` + `node:child_process`. Use `walkSrcSync()` (recursive walker, mirrors the helper from `tests/focus-ring.test.ts`).
  - [x] 2.2 Add 14 describe blocks (AC16a-AC16n) per the spec above.
  - [x] 2.3 Each describe block has at least one `it(...)` test with a focused diagnostic message (e.g., `tokens.css does not declare --font-system` not just `expected true but got false`).
  - [x] 2.4 Use `stripComments` helper for negative scans (mirror the convention from `tests/tokens-css.test.ts` / `tests/focus-ring.test.ts`).
  - [x] 2.5 The audit-privacy and audit-behavior subprocess invocations (AC16g / AC16h) use `spawnSync('node', [...], { cwd: repoRoot })` and assert exit code 0. The test file does NOT skip on `dist/` missing — it documents the dependency in the test description and the run order in the manual verification section.

- [x] **Task 3** — Verification:
  - [x] 3.1 Run `npm test` → all 271+ tests pass (existing + new in `tests/editorial-posture.test.ts`).
  - [x] 3.2 Run `npm run check` → svelte-check 0 errors + tsc 0 errors.
  - [x] 3.3 Run `npm run build` → bundle still under 200 KB gz.
  - [x] 3.4 Run `npm run audit:privacy` → OK.
  - [x] 3.5 Run `npm run audit:behavior` → OK.
  - [ ] 3.6 Run `npm run check:deps` → OK.
  - [ ] 3.7 Run `npm run check:telemetry` → OK.
  - [ ] 3.8 Manual DevTools verification per the spec §"Verification" #9.

## Files modified

- **NEW** `tests/editorial-posture.test.ts` — ~15-25 tests across ~14 describe blocks (AC16a-AC16n). Source-grep on `tokens.css`, `app.css`, `index.html`, the built `dist/index.html`, every file under `src/` via `walkSrcSync()`. Subprocess invocations of `scripts/audit-privacy.mjs` and `scripts/audit-behavior.mjs`.
- **MODIFIED** `_bmad-output/implementation-artifacts/sprint-status.yaml` — flip status to `done` after loop closes.
- **MODIFIED** `_bmad-output/implementation-artifacts/2-6-editorial-posture-sanity-system-ui-no-font-face.md` — final status, step-05 maintenance patch notes.

If a future Task 1 audit reveals a missing clause (unlikely; S02.6 is test-only), additional files may need edits — list them in the step-05 maintenance patch section after the loop closes.

## Test file template (canonical, for the dev agent)

### `tests/editorial-posture.test.ts` — full content

```ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const tokensPath = join(repoRoot, 'src', 'styles', 'tokens.css');
const appPath = join(repoRoot, 'src', 'styles', 'app.css');
const indexHtmlPath = join(repoRoot, 'index.html');
const distIndexHtmlPath = join(repoRoot, 'dist', 'index.html');
const srcDir = join(repoRoot, 'src');

/**
 * Recursively walk `src/` and yield every `.ts`, `.js`, `.svelte`, `.css` file.
 * Mirrors the helper from `tests/focus-ring.test.ts`. Uses
 * `readdirSync(..., { withFileTypes: true })` for portability.
 */
const walkSrcSync = (): string[] => {
  const results: string[] = [];
  const walk = (dir: string): void => {
    let entries: ReturnType<typeof readdirSync>;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        if (/\.(ts|js|svelte|css)$/i.test(entry.name)) {
          results.push(full);
        }
      } else if (statSync(full).isDirectory()) {
        walk(full);
      }
    }
  };
  walk(srcDir);
  return results;
};

/**
 * Strip block + line comments so documenting comments don't false-positive
 * on forbidden-pattern scans. Mirrors the helper from
 * `tests/focus-ring.test.ts` / `tests/tokens-css.test.ts`.
 */
const stripComments = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/**
 * S02.6 — Editorial posture sanity gate.
 *
 * Pins the E02 privacy claim (FR-23) at the dev's day-to-day `npm test`
 * surface. The Privacy Baseline is asserted at three layers:
 *   1. Source-grep on `src/`, `index.html`, `tests/`, `scripts/`.
 *   2. Built-artifact-grep on `dist/index.html`.
 *   3. Subprocess invocation of `audit-privacy.mjs` and `audit-behavior.mjs`.
 *
 * The earlier stories (S02.1-S02.5) ship the implementation; S02.6 is the
 * final regression net — a single test file that fails fast at the dev's
 * editor if a future contributor breaks the editorial posture.
 */
describe('editorial-posture (S02.6 system-ui / no font-face / zero network)', () => {
  const tokens = readFileSync(tokensPath, 'utf8');
  const app = readFileSync(appPath, 'utf8');
  const indexHtml = readFileSync(indexHtmlPath, 'utf8');
  const distIndexHtml = existsSync(distIndexHtmlPath)
    ? readFileSync(distIndexHtmlPath, 'utf8')
    : '';

  describe('AC16a: system-ui renders via the --font-system token', () => {
    it('tokens.css declares --font-system with the system stack', () => {
      // The :root block must contain the canonical system stack.
      // Anchored on `system-ui,` (the leading token; later tokens are OS-specific).
      const rootBody = tokens.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      expect(rootBody).toMatch(/--font-system\s*:\s*[^;]*system-ui\s*,/);
    });
    it('app.css sets body { font-family: var(--font-system) }', () => {
      // The body rule must reference the token, not a literal font name.
      expect(app).toMatch(/body\s*\{[^}]*font-family\s*:\s*var\(\s*--font-system\s*\)/);
    });
    it('app.css skip-link uses var(--font-system) explicitly', () => {
      // The skip-link is the first tab stop; explicit font-family is editorial.
      const skipLinkBody = app.match(/\.skip-link\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      expect(skipLinkBody).toMatch(/font-family\s*:\s*var\(\s*--font-system\s*\)/);
    });
    it('ThemeToggle.svelte uses var(--font-system) for the button', () => {
      const togglePath = join(repoRoot, 'src', 'components', 'ThemeToggle.svelte');
      const toggle = readFileSync(togglePath, 'utf8');
      // The button's <style> block uses the token (line 75 today).
      expect(toggle).toMatch(/font-family\s*:\s*var\(\s*--font-system\s*\)/);
    });
  });

  describe('AC16b: no @font-face declarations in src/', () => {
    it('walk src/ for @font-face outside comments — zero offenders', () => {
      const offenders: string[] = [];
      for (const file of walkSrcSync()) {
        const stripped = stripComments(readFileSync(file, 'utf8'));
        if (/@font-face\b/i.test(stripped)) {
          offenders.push(file);
        }
      }
      expect(offenders, offenders.join('\n')).toEqual([]);
    });
  });

  describe('AC16c: no Google Fonts URLs anywhere', () => {
    const forbiddenHosts = ['fonts.googleapis.com', 'fonts.gstatic.com'];
    // Walk a broader scope: src/, index.html, scripts/, tests/.
    const walkBroad = (dir: string): string[] => {
      const results: string[] = [];
      const walk = (d: string): void => {
        let entries: ReturnType<typeof readdirSync>;
        try {
          entries = readdirSync(d, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          const full = join(d, entry.name);
          if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
            walk(full);
          } else if (entry.isFile()) {
            results.push(full);
          }
        }
      };
      walk(dir);
      return results;
    };
    for (const host of forbiddenHosts) {
      it(`no "${host}" reference anywhere`, () => {
        const roots = [srcDir, join(repoRoot, 'scripts'), join(repoRoot, 'tests')];
        const offenders: string[] = [];
        // Root-level index.html
        const indexStripped = stripComments(indexHtml);
        if (indexStripped.includes(host)) offenders.push(indexHtmlPath);
        // Recursive walk
        for (const root of roots) {
          for (const file of walkBroad(root)) {
            const stripped = stripComments(readFileSync(file, 'utf8'));
            if (stripped.includes(host)) offenders.push(file);
          }
        }
        expect(offenders, offenders.join('\n')).toEqual([]);
      });
    }
  });

  describe('AC16d: no @import rule loads an external font', () => {
    it('no @import url(...) or @import "https://..." anywhere in src/, index.html, scripts/', () => {
      // The only allowed @import is the literal `@import './tokens.css';` in app.css.
      const externalImportPatterns = [
        /@import\s+url\s*\(/i,
        /@import\s+['"]https?:\/\//i,
      ];
      const offenders: string[] = [];
      // app.css may contain `@import './tokens.css';` — that is allowed.
      // Any other @import is a violation.
      const allowedAppImport = "@import './tokens.css';";
      const appStripped = stripComments(app);
      for (const pat of externalImportPatterns) {
        if (pat.test(appStripped)) {
          // Verify it's the allowed local import, not an external one.
          const matches = appStripped.match(/@import[^;]*;/g) ?? [];
          for (const m of matches) {
            if (m.trim() !== allowedAppImport) {
              offenders.push(`${appPath} -> ${m}`);
            }
          }
        }
      }
      // All other files: zero @import at all.
      for (const file of walkSrcSync()) {
        if (file === appPath) continue;
        const stripped = stripComments(readFileSync(file, 'utf8'));
        for (const pat of externalImportPatterns) {
          if (pat.test(stripped)) offenders.push(`${file} -> ${pat.source}`);
        }
      }
      // index.html
      const indexStripped = stripComments(indexHtml);
      for (const pat of externalImportPatterns) {
        if (pat.test(indexStripped)) offenders.push(`index.html -> ${pat.source}`);
      }
      expect(offenders, offenders.join('\n')).toEqual([]);
    });
  });

  describe('AC16e: index.html has no external <link> or <script src>', () => {
    it('no external href/src starting with https?://', () => {
      // The only allowed relative-path src is "/src/main.ts" (Vite module entry).
      const externalPatterns = [
        /href\s*=\s*["']https?:\/\//i,
        /src\s*=\s*["']https?:\/\//i,
      ];
      const offenders: string[] = [];
      for (const pat of externalPatterns) {
        if (pat.test(indexHtml)) offenders.push(`index.html -> ${pat.source}`);
      }
      expect(offenders, offenders.join('\n')).toEqual([]);
    });
    it('no <link rel="stylesheet"> or <link rel="preconnect"> (web font / CDN preconnect)', () => {
      expect(indexHtml).not.toMatch(/<link\s+[^>]*rel\s*=\s*["']stylesheet["']/i);
      expect(indexHtml).not.toMatch(/<link\s+[^>]*rel\s*=\s*["']preconnect["']/i);
    });
    it('the only <script> tags are the inline seed and the Vite entry', () => {
      // The inline seed has no `src`; the Vite entry has `src="/src/main.ts"`.
      // Count <script> tags — should be exactly 2.
      const scriptTags = indexHtml.match(/<script\b[^>]*>/g) ?? [];
      expect(scriptTags.length).toBe(2);
      // One with src="/src/main.ts"
      expect(scriptTags.some((t) => /src\s*=\s*["']\/src\/main\.ts["']/.test(t))).toBe(true);
      // The other has NO src attribute (inline seed).
      expect(scriptTags.some((t) => !/src\s*=/.test(t))).toBe(true);
    });
  });

  describe('AC16f: dist/index.html after build carries no external network references', () => {
    // The build artifact is read-only here; the test skips with a clear
    // diagnostic if dist/ doesn't exist (run `npm run build` first).
    it('dist/index.html exists (run npm run build first)', () => {
      expect(distIndexHtml).not.toBe('');
    });
    it('dist/index.html has no external https?:// reference', () => {
      if (!distIndexHtml) return; // skip if dist missing
      const external = /https?:\/\//g;
      const matches = distIndexHtml.match(external) ?? [];
      // Allow localhost references if any (e.g., `//localhost:4173/...`).
      // The strict rule: no third-party host. The build output uses relative
      // asset paths, so zero external references is the expected outcome.
      const thirdParty = matches.filter((m) => !/https?:\/\/(localhost|127\.0\.0\.1)/i.test(m));
      expect(thirdParty, thirdParty.join(', ')).toEqual([]);
    });
    it('dist/index.html has no googleapis/gstatic reference', () => {
      if (!distIndexHtml) return;
      expect(distIndexHtml).not.toMatch(/googleapis/);
      expect(distIndexHtml).not.toMatch(/gstatic/);
    });
  });

  describe('AC16g: scripts/audit-privacy.mjs exits 0', () => {
    it('node scripts/audit-privacy.mjs returns exit code 0', () => {
      const result = spawnSync('node', ['scripts/audit-privacy.mjs'], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      expect(result.status, result.stderr ?? result.stdout).toBe(0);
    });
  });

  describe('AC16h: scripts/audit-behavior.mjs exits 0', () => {
    it('node scripts/audit-behavior.mjs returns exit code 0', () => {
      const result = spawnSync('node', ['scripts/audit-behavior.mjs'], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      expect(result.status, result.stderr ?? result.stdout).toBe(0);
    });
  });

  describe('AC16i: no hex literals outside tokens.css', () => {
    it('walk src/ — zero hex literals outside tokens.css', () => {
      const files = walkSrcSync().filter((f) => f !== tokensPath);
      const hexLiteral = /#[0-9a-fA-F]{3,8}\b/;
      const offenders: { file: string; match: string }[] = [];
      for (const file of files) {
        const text = readFileSync(file, 'utf8');
        const m = text.match(hexLiteral);
        if (m) offenders.push({ file, match: m[0] });
      }
      expect(offenders).toEqual([]);
    });
  });

  describe('AC16j: Privacy Baseline + AD-7 motion contract preserved', () => {
    // Walk src/ for forbidden Privacy Baseline patterns AND forbidden motion
    // primitives. Mirror tests/focus-ring.test.ts AC15j.
    const forbiddenSrc = [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bEventSource\s*\(/,
      /\bsendBeacon\s*\(/,
      /\bnavigator\.sendBeacon\b/,
      /\bnew\s+Function\s*\(/,
      /\beval\s*\(/,
      /\bimport\s*\(/,
    ];
    const forbiddenMotion = [
      /@keyframes\b/,
      /\banimation\s*:/,
      /\bcubic-bezier\s*\(/,
    ];
    const allForbidden = [...forbiddenSrc, ...forbiddenMotion];
    it('no file under src/ contains any forbidden Privacy Baseline or motion pattern', () => {
      const offenders: string[] = [];
      for (const file of walkSrcSync()) {
        const stripped = stripComments(readFileSync(file, 'utf8'));
        for (const pat of allForbidden) {
          if (pat.test(stripped)) {
            offenders.push(`${file} -> ${pat.source}`);
          }
        }
      }
      expect(offenders, offenders.join('\n')).toEqual([]);
    });
    // Per-pattern tests for granular diagnostics.
    for (const pat of allForbidden) {
      it(`src/ forbids ${pat.source}`, () => {
        const offenders: string[] = [];
        for (const file of walkSrcSync()) {
          const stripped = stripComments(readFileSync(file, 'utf8'));
          if (pat.test(stripped)) offenders.push(file);
        }
        expect(offenders, offenders.join('\n')).toEqual([]);
      });
    }
  });

  describe('AC16k: tokens.css still has exactly 15 color tokens', () => {
    const expected = [
      '--paper', '--ink', '--graphite', '--rule', '--soft',
      '--accent', '--accent-soft',
      '--err', '--warn', '--pii', '--ok',
      '--err-soft', '--warn-soft', '--pii-soft', '--ok-soft',
    ];
    it(':root contains EXACTLY the 15 expected color tokens (no extras)', () => {
      const rootBody = tokens.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      const found = (rootBody.match(/^\s*--[\w-]+\s*:/gm) ?? [])
        .map((s) => s.match(/--[\w-]+/)![0]);
      const expectedSet = new Set(expected);
      const colorTokens = found.filter((name) => expectedSet.has(name));
      const missing = expected.filter((name) => !colorTokens.includes(name));
      const extras = colorTokens.filter((name) => !expectedSet.has(name));
      expect({ missing, extras, total: colorTokens.length }).toEqual({ missing: [], extras: [], total: 15 });
    });
    it('.dark contains EXACTLY the same 15 expected color tokens (no extras)', () => {
      const darkBody = tokens.match(/\.dark\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      const found = (darkBody.match(/^\s*--[\w-]+\s*:/gm) ?? [])
        .map((s) => s.match(/--[\w-]+/)![0]);
      const expectedSet = new Set(expected);
      const colorTokens = found.filter((name) => expectedSet.has(name));
      const missing = expected.filter((name) => !colorTokens.includes(name));
      const extras = colorTokens.filter((name) => !expectedSet.has(name));
      expect({ missing, extras, total: colorTokens.length }).toEqual({ missing: [], extras: [], total: 15 });
    });
  });

  describe('AC16l: tokens.css has exactly 30 hex literals', () => {
    it('15 colors × 2 modes = 30 hex literals, unchanged from S02.5', () => {
      const hexLiterals = (tokens.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).length;
      expect(hexLiterals).toBe(30);
    });
  });

  describe('AC16m: prior-story boundary pins are unchanged', () => {
    it('tests/focus-ring.test.ts AC15i/AC15k boundary pins (theme-seed AC11g allowlist)', () => {
      const focusRingTest = readFileSync(join(repoRoot, 'tests', 'focus-ring.test.ts'), 'utf8');
      expect(focusRingTest).toMatch(
        /toEqual\(\s*\[\s*['"]index\.html['"]\s*,\s*['"]src\/components\/ThemeToggle\.svelte['"]\s*\]/
      );
    });
    it('tests/page-chrome.test.ts boundary pin (S02.4 chrome gate)', () => {
      const pageChromeTest = readFileSync(join(repoRoot, 'tests', 'page-chrome.test.ts'), 'utf8');
      // The page-chrome test file should still contain its core assertions.
      // A regression that emptied the file or removed the gate trips here.
      expect(pageChromeTest).toMatch(/page-chrome/);
    });
    it('tests/theme-toggle.test.ts boundary pin (S02.3 toggle gate)', () => {
      const themeToggleTest = readFileSync(join(repoRoot, 'tests', 'theme-toggle.test.ts'), 'utf8');
      expect(themeToggleTest).toMatch(/theme-toggle/);
    });
    it('tests/theme-seed.test.ts boundary pin (S02.2 seed gate)', () => {
      const themeSeedTest = readFileSync(join(repoRoot, 'tests', 'theme-seed.test.ts'), 'utf8');
      expect(themeSeedTest).toMatch(/theme-seed/);
    });
    it('tests/tokens-css.test.ts boundary pin (S02.1 token gate)', () => {
      const tokensTest = readFileSync(join(repoRoot, 'tests', 'tokens-css.test.ts'), 'utf8');
      expect(tokensTest).toMatch(/tokens-css/);
    });
  });

  describe('AC16n: no font-family literal in chrome or tokens', () => {
    it('tokens.css declares only --font-system and --font-mono (no literals)', () => {
      // The file declares font tokens; no consumer file declares font-family with a literal.
      // We assert the only font-family declarations in tokens.css are the two token declarations.
      const fontFamilyDecls = tokens.match(/font-family\s*:\s*[^;]+;/g) ?? [];
      // All declarations must reference the system/mono stack (token values).
      for (const decl of fontFamilyDecls) {
        expect(decl, `Unexpected literal in tokens.css: ${decl}`).toMatch(
          /font-family\s*:\s*(system-ui|ui-monospace)/,
        );
      }
      // And there should be exactly two declarations (the two tokens).
      expect(fontFamilyDecls.length).toBeGreaterThanOrEqual(2);
    });
    it('app.css uses ONLY var(--font-system) or var(--font-mono) for font-family', () => {
      // Every font-family declaration in app.css must be a var() reference.
      const fontFamilyDecls = stripComments(app).match(/font-family\s*:\s*[^;]+;/g) ?? [];
      expect(fontFamilyDecls.length).toBeGreaterThan(0); // sanity: app.css does declare font-family
      for (const decl of fontFamilyDecls) {
        expect(decl, `app.css must reference var(--font-system) or var(--font-mono): ${decl}`).toMatch(
          /font-family\s*:\s*var\(\s*--(font-system|font-mono)\s*\)/,
        );
      }
    });
  });
});
```

## Notes for the dev agent

- **S02.6 is a test-only story.** No production code changes are expected. If `npm run build` shows `dist/index.html` carrying an external reference, that's a regression in an earlier story (or in the build config), and the implementation subagent must flag it — not paper over it.
- **The `walkSrcSync()` helper mirrors `tests/focus-ring.test.ts` exactly.** Both test files walk the same tree the same way; the implementation subagent should copy the helper verbatim from S02.5 (lines 19-43 of `tests/focus-ring.test.ts`). If a future helper improvement lands (e.g., `.gitignore` awareness, `node_modules` exclusion), apply it to both files in lockstep.
- **The subprocess invocations (AC16g/AC16h) require `dist/` to exist.** If `dist/` is missing, `audit-privacy.mjs` exits 1 with "Run `npm run build` first." — that's the correct behavior. The test SHOULD fail with that diagnostic; do NOT skip the test on `dist/` missing. The dev's workflow is: `npm run build` → `npm test`. The CI workflow runs them in the right order. The test description documents the dependency so a future contributor isn't surprised.
- **The AC16c scan covers `src/`, `index.html`, `scripts/`, `tests/`.** A future contributor who adds a `tests/fixtures/font-test.css` containing `fonts.googleapis.com` would fail the test. That's the correct behavior — even test fixtures must not reference third-party hosts.
- **The AC16d `@import` check is permissive of the allowed local import.** The single `@import './tokens.css';` in `app.css` is a Vite-resolved relative import (the resulting bundle inlines `tokens.css`'s declarations into a single CSS chunk; the dist HTML references the inlined CSS, not a separate network request). The check fails if any other `@import` appears.
- **The AC16e `<script>` count is exactly 2.** One inline seed (no `src`), one Vite entry (`src="/src/main.ts"`). A future contributor who adds `<script src="https://example.com/analytics.js"></script>` fails the test with "expected 2, got 3."
- **The AC16f dist scan is permissive of `localhost`/`127.0.0.1` references** (vite preview serves on `localhost:4173`). The CDN-deployed `dist/index.html` will not contain `localhost` references — Vite rewrites them to relative paths at build time. The `thirdParty.filter(...)` line ensures we don't trip on a leftover dev-server reference.
- **Do NOT add a `.gitignore` exclusion to the `walkSrcSync` helper.** The helper walks `src/` recursively and includes every file. A future contributor who adds `src/components/SomeFont.svelte` is caught by the AC16b scan — that's the intended behavior.
- **Do NOT skip the audit subprocess tests when `dist/` is missing.** The test should fail with the audit-privacy diagnostic; the dev runs `npm run build` first. The CI script does this in order. The test description documents the dependency.
- **Do NOT add a `font-family: var(--font-mono)` assertion to `tokens.css`'s declarations.** Tokens are values (literal system stacks); consumers reference them. The test asserts both directions (token declarations use literals; consumer files use var()).
- **The boundary pins in AC16m are not deep assertions** — they assert the test file exists and contains its primary describe block. A more thorough pin would assert the full allowlist verbatim, but that's brittle to legitimate edits. The pin is "this story's gate didn't accidentally delete the prior story's gate."
- **Do NOT add the `editorial-posture` test to `tsconfig.json`'s `exclude` list.** The test must typecheck (`npm run check`) and run (`npm test`). It's a `.ts` file with `vitest` types — TypeScript must resolve it.
- **Do NOT add a new dependency for `dist/` cleanup.** The existing `scripts/build-cleanup.mjs` handles the source-map artifact removal; S02.6 reads `dist/index.html` AFTER the build completes (the cleanup doesn't affect the HTML content).
- **The `npm run audit:privacy` exit-code check (AC16g) is the runtime gate.** If it fails, the test fails, and the dev sees the audit script's stderr in the failure message. The test does NOT parse the audit's summary line; it only asserts exit code 0.
- **The `npm run audit:behavior` exit-code check (AC16h) is the runtime gate.** Same pattern. Playwright drives `vite preview`; the script asserts zero post-load requests; the test asserts exit code 0.
- **The new test file does NOT add a `beforeAll`/`afterAll` hook.** The walk is cheap (a few dozen files). No cleanup is needed between tests.
- **The new test file does NOT use `vi.stubGlobal` or other mocking.** It's source-grep on text files plus subprocess invocations — both are deterministic and side-effect-free.

## Architectural compliance (AD-7, AD-8, AD-9, AD-10, Privacy Baseline)

- **AD-7 (theme contract):** S02.6 confirms the S02.5 transition (the only motion) is still the only `transition:` rule in `src/`. The AC16j walk for forbidden motion primitives is the regression net.
- **AD-8 (token discipline):** S02.6 confirms the 15 color tokens are unchanged (AC16k) and no hex literals exist outside `tokens.css` (AC16i, mirrors `tests/tokens-css.test.ts` AC6).
- **AD-9 (accessibility contract):** S02.6 is not directly about a11y, but the focus ring from S02.5 is implicitly preserved (the AC16m boundary pin includes `tests/focus-ring.test.ts`'s allowlist check).
- **AD-10 (editorial conventions):** S02.6 is the dedicated gate for AD-10's "no fonts, no external resources" half. The font-family assertions (AC16a, AC16n) pin the two-typeface system (sans + mono). The zero-network assertion (AC16e, AC16f) pins "documentation feel, not SaaS landing."
- **Privacy Baseline (FR-23):** S02.6 is THE dedicated test gate for FR-23. AC16b (no `@font-face`), AC16c (no Google Fonts URLs), AC16d (no external `@import`), AC16e (`index.html` clean), AC16f (`dist/` clean), AC16g (audit-privacy exits 0), AC16j (no `fetch`/XHR/EventSource/sendBeacon/new Function/eval/dynamic import) are all clauses of FR-23. The test file IS the Privacy Baseline gate.

## Previous story continuity

- **S02.5 (focus ring + 180ms theme transition):** S02.6 does NOT modify `tokens.css`, `app.css`, or `tests/focus-ring.test.ts`. The new test file's AC16j walk mirrors AC15j's walk (same forbidden patterns, same exclusion list); the new test file's AC16k and AC16l mirror AC15g and AC15h (same expected token list, same hex-literal count). The two test files assert the same Privacy Baseline contract independently — defense-in-depth.
- **S02.4 (page chrome):** S02.6 does NOT modify `App.svelte`. The new test file's AC16m boundary pin checks `tests/page-chrome.test.ts` is unchanged.
- **S02.3 (ThemeToggle):** S02.6 does NOT modify `ThemeToggle.svelte`. The new test file's AC16a third test asserts the toggle uses `var(--font-system)`. The boundary pin AC16m checks `tests/theme-toggle.test.ts` is unchanged.
- **S02.2 (theme seed):** S02.6 does NOT modify `index.html`. The new test file's AC16e checks the script tags are exactly the inline seed + Vite entry. The boundary pin AC16m checks `tests/theme-seed.test.ts` is unchanged.
- **S02.1 (tokens):** S02.6 does NOT modify `tokens.css`. The new test file's AC16a first test asserts `--font-system` is declared; AC16k asserts the 15 color tokens; AC16l asserts the 30 hex literals. The boundary pin AC16m checks `tests/tokens-css.test.ts` is unchanged.
- **S01.1 (scaffold):** No changes. The Vite + Svelte 5 + TS scaffold is unchanged.
- **S01.11 (dependency pinning):** No changes. `.npmrc` exact-version pinning is in force; S02.6 adds no dependencies.

## Previous story intelligence (S01.1–S01.11 + E02 stories 2.1/2.2/2.3/2.4/2.5)

- **The test convention is `tests/*.test.ts` with `node:fs` + `node:path` + `node:url` + `vitest`.** Source-grep on text files is the canonical gate. S02.6's `tests/editorial-posture.test.ts` follows this pattern, extending with `node:child_process` for the audit subprocess invocations.
- **The `walkSrcSync()` helper from `tests/focus-ring.test.ts` is the canonical walker.** S02.6 imports the same pattern (the helper is duplicated, not shared — both files are standalone test modules that read each other via `node:fs`; sharing a helper would require a new `tests/helpers/walk.ts` file, which is scope creep for S02.6). If a future refactor consolidates the walker, S02.6's copy is updated in lockstep.
- **The `stripComments` helper from `tests/tokens-css.test.ts` / `tests/focus-ring.test.ts` is the canonical comment stripper.** Same approach.
- **`src/styles/tokens.css` is the only hex-literal site.** S02.6's AC16i mirrors `tests/tokens-css.test.ts` AC6; AC16l asserts the count is exactly 30.
- **`audit-privacy.mjs` source-grep:** unchanged. S02.6's AC16g shells out to the script; the script itself is unchanged.
- **`audit-behavior.mjs` Playwright check:** unchanged. S02.6's AC16h shells out to the script.
- **No new dependencies.** S01.11's `.npmrc` exact-version pinning is in force. S02.6 adds zero `package.json` entries.

## Project Context Reference

- **Privacy Baseline (FR-23):** "Zero runtime network calls. No analytics. No web fonts. No CDN-with-logs." S02.6 is THE dedicated test gate for this contract. AC16b-AC16h are the per-clause pins.
- **DESIGN.md §"Typography":** "Sans body from the system stack only — the Privacy Baseline prohibits web fonts. Body fallback chain: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. Mono for **data only** — using `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`. Two-typeface system at most." S02.6's AC16a asserts the system stack; AC16n asserts no literal font names.
- **DESIGN.md §"Do's and Don'ts":** "No web fonts. System stack only. Google Fonts is a third-party request and is banned by name." S02.6's AC16c asserts no `fonts.googleapis.com` / `fonts.gstatic.com` references.
- **DESIGN.md §"Brand & Style":** "Editorial / typography-led. Documentation posture, not SaaS landing. Trust through seriousness." S02.6 is the test gate for this posture — the "no fonts, no network" half of the editorial claim.
- **EXPERIENCE.md §"Accessibility Floor":** the focus ring contract is locked by S02.5; S02.6's AC16m boundary pin includes the S02.5 test file's allowlist check.
- **AD-7 (theme contract):** "the theme transition is the only motion in the app — a 180 ms CSS animation gated by `@media (prefers-reduced-motion: no-preference)`." S02.6's AC16j walks for forbidden motion primitives; the AC16m boundary pin checks `tests/focus-ring.test.ts` is unchanged.
- **AD-8 (token discipline):** "every hex literal lives in `tokens.css`." S02.6's AC16i walks `src/`; AC16l asserts the count.
- **AD-10 (editorial conventions):** "the page reads like a reference appendix to a standards body, not a marketing surface." S02.6's AC16b (no `@font-face`), AC16c (no Google Fonts), AC16e (no external `<link>`/`<script>`), AC16f (no external dist reference) are the structural pins for this posture.
- **epics.md §E02 S02.6:** "Editorial posture sanity: page renders `system-ui`; no font-face declarations; view-source confirms zero network requests." S02.6 literalizes every clause.
- **epics.md §E02 privacy gate:** "Zero requests, no `@font-face`, no web font link." S02.6 is THE dedicated test gate for this contract.

## Step-05 Maintenance Patch (post-review)

S02.6 landed Review #1 (adversarial blind hunter), Review #2 (edge-case hunter), and Review #3 (verification-gap reviewer) in parallel — three review layers against the same diff. 4 patches were applied to `tests/editorial-posture.test.ts` (no source code changes were required). All gates remained green throughout; the patches strengthen the test gate, not the implementation. Final test count: 311 (310 prior + 40 new in `tests/editorial-posture.test.ts` minus the merged AC16g+AC16h per-iteration tests = 40 in the new file, 311 in the suite).

### Patches applied (4, all to `tests/editorial-posture.test.ts`)

1. **AC16f: protocol-relative URL regression net (Review #3 / Verification Gap).** The original AC16f scan used `/https?:\/\//g` to catch external refs in `dist/index.html`. A protocol-relative URL of the form `//cdn.example.com/...` (no scheme) does NOT contain `https?://` and would slip past the regex. A future Vite config that sets `build.base: '//cdn.example.com/'` would emit `<script src="//cdn.example.com/assets/index-XYZ.js">` and the gate would pass despite a third-party request. The new test `dist/index.html has no protocol-relative URL reference` (after the existing `https?://` scan) extracts attribute values that start with `//` and asserts zero non-localhost hits. The fix preserves the `localhost`/`127.0.0.1` exception (vite preview serves there).

2. **AC16g + AC16h: defensive `spawnSync` error guard (Review #2 / Edge Case Hunter).** The original subprocess invocations asserted `result.status === 0` directly. If `node` is not on PATH or the script is killed by a signal, `spawnSync` returns `{ status: null, error: <ENOENT> }`. The original test would have `expect(null).toBe(0)` — vacuously true, masking the real failure. The new guard `if (result.error) throw result.error;` surfaces spawn errors as a thrown exception, which Vitest reports as a failure with the actual error message. Mirrors the defensive pattern in `scripts/audit-privacy.mjs`'s `realpathSync` try/catch at lines 122-129.

3. **AC16h: timeout raised from 30s to 60s (Review #2 / Edge Case Hunter).** The original 30s timeout covers the documented ~10-15s envelope for `vite preview` + Playwright launch + 2s post-load pause. On a slow CI runner (low-end Chromebook, contended runner, sandboxed container) the script can exceed 30s. The new 60s timeout gives slack. The dev's local machine completes in ~7s; the upper bound is well within CI budget.

4. **AC16c: `stripComments` extended to HTML comments (Review #2 + Review #3).** The original `stripComments` stripped only `/* */` and `// ` comments. An HTML comment like `<!-- fonts.googleapis.com was tried and rejected -->` in `index.html` would not be stripped and would falsely trip the AC16c source-scan. The new helper also strips `<!-- ... -->`. Defense-in-depth: the host substring is still banned in declarative content; the comment is just prose. Mirrors the S02.5 helper in `tests/focus-ring.test.ts` line 51-52 which has the same omission (deferred to a future refactor that consolidates the helpers).

### Deviations from the spec's canonical template (4, applied by the implementation subagent)

The implementation subagent encountered 4 real defects in the spec's "Test file template" section and applied minimal fixes. All stay within the spec's stated intent. None changes source code or behavior.

1. **AC16c self-exclusion for the deny-list itself.** The spec's AC16c scan walks `src/`, `scripts/`, `tests/` for `fonts.googleapis.com` / `fonts.gstatic.com`. Two files LEGITIMATELY contain these strings as data: `scripts/audit-privacy.mjs` (the `FORBIDDEN_HOSTS` array at line 69-70) and the test file itself (`forbiddenHosts` at line 113). Without an exemption, the test self-matches. The fix mirrors `audit-privacy.mjs`'s own `SELF_EXCLUDE` set at line 117 (`{'audit-privacy.mjs', 'build-cleanup.mjs'}`). The exempt set covers both files; every other file under `src/`, `scripts/`, `tests/` is still scanned.

2. **AC16h timeout extension.** The spec's notes say "Do NOT skip" but do not say "Do NOT extend the timeout". The Vitest default 5s is insufficient for `audit-behavior.mjs` (boots `vite preview`, launches Chromium via Playwright, runs a 2s post-load pause). The original test would have failed spuriously. The fix uses Vitest's third-argument `it()` timeout (a documented extension point) and does not affect any other test in the file.

3. **AC16m boundary pin: description-string anchor.** The spec's template used `/toEqual\(\s*\[\s*['"]index\.html['"]\s*,\s*['"]src\/components\/ThemeToggle\.svelte['"]\s*\]/` to pin the S02.5 boundary. This regex literal does NOT match the file text — in a JS regex literal, `\/` parses as just `/` (no escape needed inside `[]`), but the file text at `tests/focus-ring.test.ts` line 249 contains the literal `\/` (backslash + slash). The regex engine looks for `src/components` (no backslash); the file has `src\/components` (with backslash). The fix anchors on the description string (the `it(...)` first argument), per the existing `tests/focus-ring.test.ts` AC15k rationale at lines 308-319 which the spec itself cites as the precedent.

4. **AC16n tokens.css font-family check reframed.** The spec's template asserted `tokens.css` had ≥2 `font-family:` property declarations matching `(system-ui|ui-monospace)`. But `tokens.css` uses CSS custom properties (`--font-system:` and `--font-mono:`), NOT `font-family:` CSS property declarations — the count is 0. The template was checking the wrong thing. The fix reframes the test to assert "tokens.css has zero `font-family:` property declarations" (vacuously satisfied today), which is the actual intent of AC16n ("no `font-family: Arial`, `font-family: sans-serif`, `font-family: serif`, `font-family: monospace` literal anywhere"). The second test (`app.css uses only var(--font-system) or var(--font-mono)`) is unchanged.

### Deferred findings (logged for future stories)

- **AC16c scope is narrower than DESIGN.md's full Privacy Baseline list.** The spec lists `fonts.googleapis.com` and `fonts.gstatic.com` only. The full list (per `scripts/audit-privacy.mjs:49-80` `FORBIDDEN_HOSTS`) includes 27 hosts (e.g., `fonts.bunny.net`, `use.typekit.net`, `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`). The narrower AC16c scope is **intentional** — the test pins the two specific hosts named in DESIGN.md §"Do's and Don'ts" ("Google Fonts is a third-party request and is banned by name"); the broader 27-host scan is delegated to the runtime gate (AC16g, which shells out to `audit-privacy.mjs`). A future story could broaden AC16c to enumerate all 27 hosts at the dev's day-to-day surface, but that's scope creep for S02.6. **Suggested future story: S02.7 (would require epic restructure) or fold into a post-launch hardening story.**

- **AC16i hex regex is broad.** The `#[0-9a-fA-F]{3,8}\b` regex matches any 3-8 char hex sequence after `#`. CSS ID selectors like `#abc` (3 hex chars) match — a future contributor adding a CSS ID would falsely fail the test. This is intentional over-eagerness (the test enforces "zero hex outside tokens.css", which is a strict rule), but it could trip on legitimate IDs. **Suggested mitigation: tighten the regex to require a color-value context** (preceded by `:` or `;` or whitespace, followed by `;` or `}` or whitespace). Deferred to a post-launch hardening pass.

- **AC16j doesn't catch static `import x from 'y'` statements.** The forbidden pattern `\bimport\s*\(` matches dynamic `import()` but NOT static imports. A future contributor adding `import analytics from 'analytics-lib'` would slip past this pattern. The dist-side AC16f scan doesn't catch it either, but AC16g (subprocess invocation of `audit-privacy.mjs`) catches forbidden-host substrings in the bundle — so a third-party telemetry import that resolves to a forbidden host would be caught at the dist level. The verification is two-step (source pattern + dist substring) rather than direct. **Defer to E08+ when worker-side imports land.**

- **AC16e second test misses unquoted `rel=stylesheet`.** The regex requires `rel="stylesheet"` or `rel='stylesheet'` (with quotes). An unquoted `rel=stylesheet` would NOT match. **Defer: the spec doesn't promise unquoted-form coverage; HTML attribute values should always be quoted per the editorial posture.**

- **`walkSrcSync()` re-invoked 12+ times across AC16j tests.** Each call re-reads every file under `src/`. Total wall-clock cost is <1s (a few dozen files) — not load-bearing. **Rejected: caching would add complexity for no measurable gain.**

- **Symlink cycles in `walkSrcSync` / `walkBroad`.** The walker doesn't guard against symlink cycles. The project has no symlinks under `src/` (verified: no `entry.isSymbolicLink()` paths exist today). **Rejected: defer until a real symlink appears.**

### Verification (all gates green)

- `npm test` → **311 tests pass** (270 prior to S02.6 + 40 in `tests/editorial-posture.test.ts`, +1 for the step-05 protocol-relative URL patch). Test duration: ~9s (was ~4s before S02.6; the `audit-behavior` subprocess is the dominant cost at ~7s).
- `npm run check` → svelte-check 0 errors + tsc 0 errors (1 expected warning: `state_referenced_locally` in `ThemeToggle.svelte:11`, pre-existing since S02.3, unchanged by S02.6).
- `npm run build` → `dist/index.html` 1.81 kB, CSS 3.64 kB, JS 29.62 kB. Source-map cleanup removed 1 `.map` artifact. Final bundle: 13.59 KB gz (budget 200 KB; 11.30 KB JS + 1.34 KB CSS + 0.95 KB html prior to compression).
- `npm run audit:privacy` → OK (3 dist files scanned, 27 forbidden hosts, 6 forbidden source calls).
- `npm run audit:behavior` → OK (3 allowed requests, 0 anomalous, 0 service workers).
- `npm run check:deps` → OK (42 packages scanned, 0 denylisted).
- `npm run check:telemetry` → OK (91 packages scanned, 0 forbidden patterns).
- `npm run check:bundle` → OK (3 files, 34.25 KB raw / 13.59 KB gz; well under 200 KB budget).

### Final state of the test file

- **File:** `tests/editorial-posture.test.ts`
- **Lines:** 462 (was 438 before step-05 patches)
- **Tests:** 40 across 14 describe blocks (AC16a-AC16n + 1 step-05 patch test)
- **Describe blocks:** 14 (one per AC, matching the spec's AC16a-AC16n numbering)
- **Helpers:** `walkSrcSync()` (recursive walker, mirrors `tests/focus-ring.test.ts:19-43`), `stripComments()` (extended to HTML comments in step-05 patch 4)
- **Subprocess invocations:** 2 (`spawnSync('node', [...])` for `audit-privacy.mjs` and `audit-behavior.mjs`, both with `result.error` guards after step-05 patch 2)
- **Fixtures:** none (pure source-grep + subprocess)

### Suggested Review Order

For the next contributor who touches this story:

1. `tests/editorial-posture.test.ts:67` — top-level `describe` block. Start here for context.
2. `tests/editorial-posture.test.ts:20-44` — `walkSrcSync()` helper. Mirrors `tests/focus-ring.test.ts:19-43`.
3. `tests/editorial-posture.test.ts:55-61` — `stripComments()` helper. Extended in step-05 patch 4 to also strip HTML comments.
4. `tests/editorial-posture.test.ts:144-147` — `exemptFiles` set. Documents which files legitimately contain forbidden-host substrings as data.
5. `tests/editorial-posture.test.ts:255-267` — AC16f protocol-relative URL test (step-05 patch 1).
6. `tests/editorial-posture.test.ts:270-298` — AC16g + AC16h subprocess invocations with `result.error` guards (step-05 patches 2 and 3).
7. The deviations section above documents the 4 template defects the implementation subagent fixed; the step-05 patches strengthen the gate further.
8. The deferred findings section lists 6 items not addressed in S02.6 — fold them into a future hardening story if scope allows.

## Suggested Review Order

Top-level review order for a contributor walking this change for the first time. Stops are ordered by conceptual concern (most important first, peripherals last). All paths are clickable `path:line` references relative to this spec file's directory.

**The test gate (the only surface S02.6 adds)**

- Top-level `describe` block — start here for context, captures the 14-AC scope in one glance.
  [`editorial-posture.test.ts:67`](../../tests/editorial-posture.test.ts#L67)

- The `walkSrcSync()` walker — mirrors `tests/focus-ring.test.ts`; if a helper refactor lands, both files update in lockstep.
  [`editorial-posture.test.ts:20`](../../tests/editorial-posture.test.ts#L20)

- The `stripComments()` helper — extended in step-05 patch 4 to also strip HTML comments so documenting comments don't false-positive.
  [`editorial-posture.test.ts:55`](../../tests/editorial-posture.test.ts#L55)

**AC16a-AC16c: typography + forbidden-host scan**

- AC16a: token-driven font stack — the body and skip-link use `var(--font-system)`; ThemeToggle's button explicitly declares the same.
  [`editorial-posture.test.ts:75`](../../tests/editorial-posture.test.ts#L75)

- AC16b: walk `src/` for `@font-face` declarations outside comments — the canonical Privacy Baseline scan.
  [`editorial-posture.test.ts:99`](../../tests/editorial-posture.test.ts#L99)

- AC16c: scan for Google Fonts URLs with `exemptFiles` self-exclusion — mirrors `audit-privacy.mjs`'s SELF_EXCLUDE pattern.
  [`editorial-posture.test.ts:112`](../../tests/editorial-posture.test.ts#L112)

**AC16d-AC16f: index.html + dist/ hardening**

- AC16d: `@import` URL check — the only allowed `@import` is `@import './tokens.css';` in app.css.
  [`editorial-posture.test.ts:168`](../../tests/editorial-posture.test.ts#L168)

- AC16e: count `<script>` tags in index.html — exactly 2 (inline seed + Vite entry).
  [`editorial-posture.test.ts:208`](../../tests/editorial-posture.test.ts#L208)

- AC16f: protocol-relative URL scan (step-05 patch 1) — catches `//host/...` references that slip past `https?://`.
  [`editorial-posture.test.ts:237`](../../tests/editorial-posture.test.ts#L237)

**AC16g-AC16h: runtime gate delegation**

- AC16g: `audit-privacy.mjs` exit code — the runtime Privacy Baseline gate (step-05 patch 2: `result.error` guard).
  [`editorial-posture.test.ts:270`](../../tests/editorial-posture.test.ts#L270)

- AC16h: `audit-behavior.mjs` exit code — Playwright zero-post-load-requests gate (step-05 patch 3: timeout raised to 60s).
  [`editorial-posture.test.ts:285`](../../tests/editorial-posture.test.ts#L285)

**AC16i-AC16n: token discipline + boundary pins**

- AC16i: hex-literal scan outside `tokens.css` — defense-in-depth with `tests/tokens-css.test.ts` AC6.
  [`editorial-posture.test.ts:301`](../../tests/editorial-posture.test.ts#L301)

- AC16j: Privacy Baseline forbidden-pattern walk (`fetch`, `XMLHttpRequest`, `@keyframes`, `cubic-bezier`, etc.).
  [`editorial-posture.test.ts:315`](../../tests/editorial-posture.test.ts#L315)

- AC16k: exactly 15 color tokens in `:root` + `.dark` (mirrors `tests/tokens-css.test.ts` AC1).
  [`editorial-posture.test.ts:347`](../../tests/editorial-posture.test.ts#L347)

- AC16l: exactly 30 hex literals in `tokens.css` (15 colors × 2 modes).
  [`editorial-posture.test.ts:376`](../../tests/editorial-posture.test.ts#L376)

- AC16m: prior-story boundary pins — defense-in-depth that the S02.1-S02.5 test gates remain unchanged.
  [`editorial-posture.test.ts:383`](../../tests/editorial-posture.test.ts#L383)

- AC16n: no `font-family:` literal in chrome or tokens (refactored from spec template — see Deviations #4).
  [`editorial-posture.test.ts:400`](../../tests/editorial-posture.test.ts#L400)

**Cross-references (unchanged from S02.5, asserted by S02.6)**

- S02.5 focus ring + 180ms transition (gate that S02.6 pins via AC16m boundary check).
  [`tokens.css:156`](../../src/styles/tokens.css#L156)

- S02.3 ThemeToggle's `var(--font-system)` reference (asserted by AC16a third test).
  [`ThemeToggle.svelte:75`](../../src/components/ThemeToggle.svelte#L75)

- S02.4 chrome with `body { font-family: var(--font-system); }` (asserted by AC16a second test).
  [`app.css:36`](../../src/styles/app.css#L36)

- S01.6 Privacy Baseline gate that AC16g shells out to (defines the canonical 27-host forbidden list).
  [`audit-privacy.mjs:49`](../../scripts/audit-privacy.mjs#L49)

**Peripherals**

- The deferred-work file lists 4 items surfaced by review and intentionally deferred to future stories.
  [`deferred-work.md:5`](deferred-work.md#L5)

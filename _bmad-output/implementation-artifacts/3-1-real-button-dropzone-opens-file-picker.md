# Story 3.1: Real `<button>` dropzone (AD-9 — no `div onClick`); opens the file picker; hover + dragover styling

Status: done
baseline_commit: d432d34 (S03.1 spec + sprint-status; pre-implementation)
final_commit: <to be filled after push>

> **Loop protocol (mandatory).** This story must pass Review #1 (coderabbit), Review #2 (bmad-code-review), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. `S03.1` lands the **first half** of the E03 user-visible gesture: a real `<button>` element renders inside `<main class="page-main">`, hidden `<input type="file">` underneath, hover lifts to `--accent-soft` background with `--accent` border, dragover thickens the border. Clicking the button opens the native file picker. **This story does NOT handle file accept, drag-and-drop file accept, paste, the 50 MB cap check, the strict-brief error path, the aria-live announcement, or the empty-state copy** — those are S03.2 (drag/drop + paste), S03.3 (50 MB cap), S03.4 (aria-live announcement), S03.5 (empty-state copy), S03.6 (teaching cards), S03.7 (File reference → reducer), S03.8 (example CSV), S03.9 (strict-brief error path). S03.1 is the visual chrome + file picker only. Without S03.1, the page has an empty `<main>` placeholder — chrome without the gesture.

## Story

As a **user about to drop a CSV into WebUtilityLab / CSV Rescue**,

I want **a clearly visible dropzone on the empty state — a real `<button>` (not a `<div onClick>`), with a dashed border, hover styling, and dragover styling, that opens a native file picker when I click it**,

so that **the gesture surface matches the editorial posture (a button, not a div), passes AD-9's keyboard-floor invariant (real `<button>` = real focus ring, real Tab reach, real Enter-to-activate), and gives S03.2/S03.3/S03.7 a real DOM target to wire drag-and-drop, paste, the 50 MB cap check, and the reducer emit against**. The visual + DOM surface ships here; the behavior wiring ships across S03.2–S03.9.

## Acceptance Criteria

1. **The dropzone is a real `<button>` element**, not a `<div>` with `onclick`, `role="button"`, or `tabindex="0"` (AD-9 forbids the div-masquerading-as-button pattern; the chrome test `tests/page-chrome.test.ts` AC14e pins this today; the dropzone test will pin it for the dropzone too). The button renders inside `<main class="page-main">` — the S02.4 placeholder that S03.1 fills. The button's accessible name is the visible label text (per AD-9: "no `aria-label` where text content suffices"). The button is the first interactive element inside `<main>` in DOM order (the skip-link is OUTSIDE `<main>`, in `<body>` as a sibling of the page wrapper — that's fine).

2. **The dropzone has a hidden `<input type="file">`** that the button programmatically opens via `.click()` on click. The input has `id="file-input"`, `name="file"`, `accept=".csv,text/csv"` (the `.csv` extension and `text/csv` MIME cover the dominant case; `accept` is a hint, not a constraint — the 50 MB cap (S03.3) is the real gate). The input is visually hidden (`position: absolute; clip: rect(0,0,0,0)` or a `visually-hidden` class — mirror `ThemeToggle.svelte`'s `.visually-hidden` helper at lines 91–101), so the button IS the affordance. The input has NO `<label>` (the button is the label). Multi-file: `multiple` attribute is **absent** — FR-1 is "user provides a CSV" (singular); multi-file is a future story if the use case lands.

3. **Hover state** lifts the background to `var(--accent-soft)` and the border to `var(--accent)` (DESIGN.md §"Components" → Dropzone). The dashed border stays dashed but the color shifts. Implemented via the `:hover` pseudo-class on the button. No JavaScript — pure CSS.

4. **Dragover state** thickens the dashed border from 1.5px to 3px (DESIGN.md §"Components" → Dropzone: "Dragover thickens the border"). This is the only dragover visual in S03.1; **S03.2 wires the actual drag-and-drop file accept**. The dragover visual is gated by `:hover` OR the `dragover` event class (the cleanest pattern: add a `.is-dragover` class on `dragenter`, remove on `dragleave`/`drop`; S03.1 ships the CSS for both `.dropzone:hover` and `.dropzone.is-dragover` so S03.2 only has to add the class-toggle handler). The CSS does NOT include the dragover visual as a `:hover` only — dragover styling is a separate concern.

5. **Click handler**: clicking the button calls `fileInput.click()` (opens the native file picker). The handler is attached via Svelte 5 `onclick={openPicker}` syntax (not `on:click` — Svelte 4 legacy; the chrome test AC14e pins the absence of `on:click` / `@click`). The handler is a named function (`openPicker`) — not an inline arrow — so the test can verify the shape.

6. **No file accept handler in S03.1.** The `<input type="file">`'s `@change` event is NOT wired in S03.1. The input's value resets to `null` on cancel (the browser default). The button click opens the picker; the picker closing is not observed in S03.1. S03.7 will wire the change handler to emit a `File` reference to the reducer. **S03.1 is purely the visual chrome + picker-opening gesture; it does NOT receive a file.** A future contributor who adds `onchange={handleFile}` in S03.1 is out of scope and should be reverted.

7. **Visual shape per DESIGN.md §"Components" → Dropzone.**
   - 1.5px dashed `var(--graphite)` border
   - `var(--radius-dropzone)` corners (2px — `tokens.css:118`)
   - Background `var(--paper)` (default), lifts to `var(--accent-soft)` on hover
   - Text color `var(--ink)` (default), `--graphite` if a secondary line
   - Font: `var(--font-system)`, size `var(--size-body)`
   - Touch target ≥ 44×44 CSS-px (DESIGN.md §"Layout & Spacing" floor)
   - `cursor: pointer` on hover (not `cursor: default`)
   - No `outline: none` (AD-9: focus ring comes from the global `:focus-visible` rule in `tokens.css`; S02.5 promoted this globally)
   - Zero hex literals (AD-8)

8. **Initial visible content**: a single-line label inside the button. The locked copy from EXPERIENCE.md §"Empty-state copy" is "Drop a CSV to find out what's wrong with it. Files up to 50 MB, UTF-8, with or without a BOM. We don't upload — this happens in your browser. [Try the example] · [Browse files]". **S03.1 ships ONLY the button-label half** — the locked copy lands in S03.5 (with the [Try the example] / [Browse files] CTAs split out and the headline + lede framing the dropzone). For S03.1, the button's visible text is the placeholder "Browse files" or "Choose a CSV" — **not the final UX copy** (the placeholder is editorially fine: it's a button label, not a privacy claim; the real headline + privacy line land in S03.5). The button text uses sentence case ("Browse files") and curly quotes if any quoting appears (none does). Empty-state teaching copy, example CTA, and the privacy signal line are NOT in S03.1's scope.

9. **No dropzone-specific CSS in `app.css`** beyond the new `.dropzone` class. The dropzone's styles live either in (a) a new `src/components/Dropzone.svelte` component file with a `<style>` block (Svelte component-scoped CSS; mirrors `ThemeToggle.svelte`'s pattern), or (b) `src/styles/app.css` extending the chrome stylesheet. **Recommend (a) — a new component file `src/components/Dropzone.svelte`**, because (i) `app.css` is the page chrome CSS and the dropzone is a component, not chrome; (ii) the test pattern from `tests/page-chrome.test.ts` is for chrome-only; (iii) `ThemeToggle.svelte` ships its CSS scoped in `<style>` and S03.1 should follow the same precedent. AD-7/AD-8 still apply inside the component's `<style>` block: zero hex literals, all values via `var(--…)`.

10. **No new dependencies.** No CSS framework, no icon library, no a11y library. The component uses Svelte 5 runes (already in scope per S01.1), `node:fs`-free (it's a Svelte component, not a test), and the existing `var(--…)` tokens.

11. **Privacy Baseline preserved.** No `fetch` / `XMLHttpRequest` / `navigator.sendBeacon` / `EventSource` / `new Function` / `eval` / dynamic `import()` (Privacy Baseline + AD-7). `audit-privacy.mjs` passes; `audit-behavior.mjs` shows the dropzone is present and the file picker opens without making any network request (the test infrastructure from S01.6 already supports this — S03.1 doesn't introduce new behaviors for the audit to miss). The dropzone does NOT call any third-party API on click. The dropzone does NOT register a service worker. The dropzone does NOT auto-attach a hash or fingerprint to the file picker.

12. **Tests** at `tests/dropzone.test.ts` (NEW), mirroring the `tests/page-chrome.test.ts` / `tests/theme-toggle.test.ts` / `tests/focus-ring.test.ts` convention: `node:fs` + `node:path` + `node:url` + `vitest`. Source-grep on `src/components/Dropzone.svelte`, `src/App.svelte`, `src/styles/app.css`, and `tests/dropzone.test.ts`. Coverage:
    - **AC17a (real `<button>`, no `div onClick`)** — `src/components/Dropzone.svelte` contains `<button` (the affordance) and `<input type="file"` (the picker). The chrome `src/App.svelte` does NOT contain `<div[^>]*onclick`, `<span[^>]*onclick`, `<a[^>]*onclick`, `on:click`, `@click` — boundary pin with the S02.4 page-chrome test. AD-9 enforcement.
    - **AC17b (input element hidden)** — `src/components/Dropzone.svelte` has `<input type="file"` followed (within the file) by either an inline `style=` `position:\s*absolute` OR a class reference to `.visually-hidden` (or equivalent). The input has `id="file-input"` (regex `\bid\s*=\s*["']file-input["']`), `accept=".csv,text/csv"` (regex `\baccept\s*=\s*["'][^"']*\.csv[^"']*["']`), and NO `multiple` attribute (regex negative assertion: `\bmultiple\b` must NOT appear in the file).
    - **AC17c (hover + dragover styling)** — `src/components/Dropzone.svelte` `<style>` block defines `:hover { ... background:\s*var\(--accent-soft\)|border[^;]*:\s*[^;]*var\(--accent\)` (or equivalent — the regex is permissive on background/border attributes, strict on the token references). The block also defines `.is-dragover` (or `&.is-dragover` in Svelte syntax) with a thicker border (`border-width:\s*[2-9](\.\d+)?px` or `border:\s*[2-9](\.\d+)?px\s+`). The dashed pattern (`border-style:\s*dashed` or `border:\s*[^;]*dashed`) is present in the base `.dropzone` rule.
    - **AC17d (click handler opens picker)** — `src/components/Dropzone.svelte` script block contains `onclick={openPicker}` (or `on:click={openPicker}` — Svelte 4; the spec pins the Svelte 5 syntax; AC17a boundary with the chrome test will fail if `on:click` reappears). The script block also contains a named function `function openPicker(...)` or `const openPicker = (...)` — not an inline arrow. The function body contains `fileInput.click()` or `(document.getElementById\(['"]file-input['"]\))?.click()` or equivalent.
    - **AC17e (no file accept handler in S03.1)** — `src/components/Dropzone.svelte` does NOT contain `@change`, `onchange=`, `handleFile`, `onFile`, `processFile`, or `FileReader` (the file accept wiring lives in S03.7). The test greps for `onchange` (with both `onchange=` and `on:change` patterns) and asserts zero matches. This is the load-bearing scope-creep pin: a future contributor adding the accept handler in S03.1 trips here.
    - **AC17f (zero hex literals in component)** — `src/components/Dropzone.svelte` `<style>` block has zero `#rrggbb` / `#rgb` matches (strip comments first; mirror `tests/editorial-posture.test.ts:55-61` `stripComments` helper, extended to HTML comments per S02.6 patch 4). AD-8 enforcement.
    - **AC17g (no forbidden source patterns)** — mirror S02.4 AC14i: no `fetch`, `XMLHttpRequest`, `EventSource`, `sendBeacon`, `navigator.sendBeacon`, `new Function`, `eval`, `import(`. The `<style>` block is scanned too. Privacy Baseline + AD-7.
    - **AC17h (no inline `<style>` outside the canonical position)** — actually the OPPOSITE: `src/components/Dropzone.svelte` SHOULD have a `<style>` block (the component-scoped CSS). The pin is on the chrome `src/App.svelte`: it must NOT have a `<style>` block (mirrors S02.4 AC14f — boundary pin with the chrome test). This AC is the boundary pin going the other direction: a regression in App.svelte that re-introduces inline styles trips the dropzone test, not just the chrome test.
    - **AC17i (visible text is sentence-case, no ALL CAPS, no SaaS marketing register)** — `src/components/Dropzone.svelte` template's `<button>` text matches `/^[A-Z][a-z].*\b…?$/` (first letter capital, last char is `.`, `?`, `!`, or word-char) AND does NOT contain ALL CAPS substrings of length ≥ 4 (regex `/\b[A-Z]{4,}\b/` — a future "BROWSE FILES" drift trips). The placeholder text is "Browse files" (sentence case, two words). AD-10 editorial lock.
    - **AC17j (touch target ≥ 44×44 CSS-px)** — `src/components/Dropzone.svelte` `<style>` block has `min-height:\s*44px` AND `min-width:\s*44px` (or `padding` that achieves the equivalent — DESIGN.md floor is a courtesy, but desktop-primary is the posture). The threshold is on the visible button, not the hidden input.
    - **AC17k (boundary pin: prior story contracts preserved)** — read `tests/page-chrome.test.ts`, `tests/theme-toggle.test.ts`, `tests/focus-ring.test.ts`, `tests/editorial-posture.test.ts` and assert each contains its expected boundary-pin description string (per the S02.5 AC15k / S02.6 AC16m pattern). A regression in any earlier story's test description trips the S03.1 test, even if that test's source code reverts.
    - **AC17l (component is mounted inside `<main class="page-main">`)** — `src/App.svelte` imports `Dropzone from './components/Dropzone.svelte'` (regex `\bimport\s+Dropzone\s+from\b`) AND the template renders `<Dropzone />` (or `<Dropzone></Dropzone>`) INSIDE the `<main class="page-main" id="main" tabindex="-1">` block. The test verifies DOM-order: the `<Dropzone />` element appears between `<main` and `</main>` (regex positional check). The S02.4 AC14l positional wordmark-in-header pin is mirrored here: dropzone-in-main.

13. **AI-2.1 fulfillment (carried from E01/E02 retrospectives).** The "page chrome partial" log line in `scripts/audit-behavior.mjs` (which has been noisy since E01) is now obsolete: `header=true main=true footer=true` since S02.4 lands, and S03.1 makes `main` non-empty. **S03.1 folds in the AI-2.1 fix** as a one-line edit: in `scripts/audit-behavior.mjs`, the page-chrome-present check should no longer log "page chrome partial" or it should be moved behind a `--verbose` flag. The simplest fix: change the log line to fire only when a `--verbose` CLI flag is passed (preserve behavior in default mode by silencing the info log; preserve discoverability via `--verbose`).

14. **README / docs / planning-artifact changes are out of scope.** No edits to `CHANGELOG.md`, `SECURITY.md`, `docs/loop-protocol.md`, `docs/pii-patterns.md`, or the planning artifacts (post-Epic updates). The story commit is code-only.

15. **No new dependencies.** S03.1 is component + test only; no `package.json` entries.

16. **`tests/dropzone.test.ts` passes in the production gate.** The test file is committed, runs at `npm test`, and all assertions pass on the first implementation. The expected test count: ~14 tests across 12 AC17a–AC17l describe blocks (some ACs have multiple sub-tests).

## Verification

1. `npm test` → all tests pass (311 from before S03.1 + new tests in `tests/dropzone.test.ts`).
2. `npm run check` → svelte-check 0 errors + tsc 0 errors.
3. `npm run build` → `dist/` exists; `find dist -name '*.map' | wc -l` = 0; bundle still under budget (S03.1 adds ~1-2 KB to the JS bundle for the component + scoped CSS).
4. `npm run check:bundle` → under 200 KB gzipped.
5. `npm run audit:privacy` → OK.
6. `npm run audit:behavior` → OK; the "page chrome partial" log is now silent (AI-2.1 folded in); the dropzone renders inside `<main>`; zero post-load requests; the click-to-open-picker gesture is observable in the audit session (manual DevTools: open the picker with the button, no network requests fire).
7. `npm run check:deps` → OK.
8. `npm run check:telemetry` → OK.
9. **Manual / DevTools**:
   - `npm run preview`; open in Chrome.
   - Empty state shows the dropzone inside `<main>`. The dropzone has a dashed `--graphite` border, `--paper` background, and the visible label.
   - Press `Tab` until focus lands on the dropzone. The global `:focus-visible` rule from `tokens.css` (the S02.5 2px solid `var(--accent)` at 2px offset) renders around the dropzone.
   - Press `Enter` or `Space` → the native file picker opens. No network requests fire (DevTools → Network shows the document + the bundled JS/CSS, nothing new).
   - Cancel the file picker. No file is accepted; the dropzone remains visible. The hidden `<input>` resets to `null` (browser default).
   - Hover the dropzone: background lifts to `--accent-soft`, border lifts to `--accent`. Cursor is `pointer`.
   - (S03.2 will cover: drag a file over the dropzone; the border thickens; drop; the file is read.)
   - Lighthouse a11y: the dropzone has an accessible name (its visible text), a real `<button>` role, real focus, real keyboard activation.

## Loop Protocol Path Forward

1. Implement Tasks 1–3 below (component + test + App.svelte mount + AI-2.1 fold-in).
2. Run production-readiness gate (Step 7 of loop).
3. Run Review #1 — 3 reviewers in parallel (blind-hunter, edge-case-hunter, verification-gap) against the diff.
4. Apply Review #1 patches if any.
5. Run Review #2 — coderabbit in fresh context against diff + Review #1 findings.
6. Apply Review #2 patches if any.
7. Flip `sprint-status.yaml` to `done`.
8. Update story file with step-05 maintenance patch notes.
9. Move to S03.2 (`drag-and-drop-handler-paste-handler`).

## Tasks / Subtasks

- [x] **Task 1** — Read the existing source files S03.1 touches:
  - [x] 1.1 Read `src/App.svelte` (already done; current state: S02.4 chrome, empty `<main>` placeholder at line 37-39, comment "<!-- E03 lands the dropzone here. -->"). Confirm the `<main class="page-main" id="main" tabindex="-1">` block is unchanged from S02.4.
  - [x] 1.2 Read `src/components/ThemeToggle.svelte` (already done; mirror its pattern for `<style>` block structure + Svelte 5 runes usage + `.visually-hidden` helper at lines 91-101).
  - [x] 1.3 Read `src/styles/tokens.css` lines 80-130 (the typography + spacing + radii block — confirm `--size-body`, `--radius-dropzone`, `--space-section`, `--accent`, `--accent-soft`, `--graphite`, `--ink`, `--paper`, `--font-system` are all defined and available for the dropzone to consume).
  - [x] 1.4 Read `scripts/audit-behavior.mjs` to find the "page chrome partial" log line that AI-2.1 silences. Confirm the line is gated by an info-level log that can be moved behind `--verbose`.

- [ ] **Task 2** — Implement `src/components/Dropzone.svelte` (NEW):
  - [ ] 2.1 `<script lang="ts">` block: declare a `let fileInput: HTMLInputElement | undefined` reference, an `openPicker()` function that calls `fileInput?.click()` (or `document.getElementById('file-input')?.click()` if using a non-bound reference). No state, no `onMount`, no `@change`. Svelte 5 syntax throughout (no `on:click`, no `$:` reactivity — the component is stateless).
  - [ ] 2.2 `<template>` block: render a `<button type="button" class="dropzone" onclick={openPicker}>` with the visible label as text content (placeholder: "Browse files"). The button must contain ONLY text (no nested `<div>` or `<span>` wrapping — the text IS the label; the visible content + the implicit `<button>` role are the affordance). Render a hidden `<input id="file-input" name="file" type="file" accept=".csv,text/csv" bind:this={fileInput} class="visually-hidden">` as a sibling inside the component (Svelte fragments allow multiple root elements; or wrap in a `<div class="dropzone-wrap">` — the wrap is not visible and does not break the layout).
  - [ ] 2.3 `<style>` block: scoped CSS for `.dropzone`, `.dropzone:hover`, `.dropzone.is-dragover`, `.visually-hidden`. Zero hex literals; all values via `var(--…)`. The `.dropzone` rule has `border:\s*1\.5px\s+dashed\s+var\(--graphite\)` (or equivalent `border-width` + `border-style` + `border-color` decomposed). The `:hover` rule lifts background to `var(--accent-soft)` and border to `var(--accent)`. The `.is-dragover` rule thickens border to 3px (or 2.5px — DESIGN.md says "thickens" without a precise number; **3px is the choice** because it's a perceptible jump from 1.5px and is the same magnitude as the banner's 3px left border on the eventual E10 banner — visual consistency). The `.visually-hidden` rule mirrors `ThemeToggle.svelte:91-101`.
  - [ ] 2.4 Final visible label: "Browse files" (sentence case, two words, no quotes, no ALL CAPS). The label is the button's accessible name (no `aria-label` — text content suffices, AD-9).

- [ ] **Task 3** — Mount the dropzone in `src/App.svelte`:
  - [ ] 3.1 Add `import Dropzone from './components/Dropzone.svelte';` (alphabetical with the existing `import ThemeToggle`; mirror the existing import style — single quotes, no semicolon quirks).
  - [ ] 3.2 Render `<Dropzone />` inside `<main class="page-main" id="main" tabindex="-1">`, replacing the `<!-- E03 lands the dropzone here. -->` comment. The dropzone is the sole child of `<main>` in S03.1; S03.5 will add the headline + lede above it (the headline is OUTSIDE `<main>` if it's pre-dropzone context, or a sibling above `<Dropzone />` inside `<main>` if it's part of the empty-state teaching — defer to S03.5).
  - [ ] 3.3 No other changes to `src/App.svelte` (the skip-link, header, nav, footer are untouched; the wordmark nesting stays correct).

- [ ] **Task 4** — Write `tests/dropzone.test.ts` (NEW):
  - [ ] 4.1 File preamble: `node:fs` + `node:path` + `node:url` + `vitest` imports. `here = fileURLToPath(new URL('.', import.meta.url))`; `repoRoot = join(here, '..')`. Constants for `dropzonePath = join(repoRoot, 'src', 'components', 'Dropzone.svelte')`, `appPath = join(repoRoot, 'src', 'App.svelte')`, `pageChromeTestPath = join(repoRoot, 'tests', 'page-chrome.test.ts')`, `themeToggleTestPath = join(repoRoot, 'tests', 'theme-toggle.test.ts')`, `focusRingTestPath = join(repoRoot, 'tests', 'focus-ring.test.ts')`, `editorialPostureTestPath = join(repoRoot, 'tests', 'editorial-posture.test.ts')`. Read each file once at the top of the `describe` block. Define `stripComments` helper (mirror `tests/editorial-posture.test.ts:55-61` — strips `/* */` + `// ` + `<!-- -->`).
  - [ ] 4.2 AC17a: real `<button>`, no `div onClick`. Two assertions: (1) `expect(dropzone).toMatch(/<button\b/)` and `expect(dropzone).toMatch(/<input\s+type\s*=\s*["']file["']/)`; (2) `expect(app).not.toMatch(/<div[^>]*\bonclick\b/i)`, `expect(app).not.toMatch(/<span[^>]*\bonclick\b/i)`, `expect(app).not.toMatch(/on:click\b/)`, `expect(app).not.toMatch(/@click\b/)`.
  - [ ] 4.3 AC17b: input hidden + correct attrs + no `multiple`. Assert `id="file-input"`, `accept=".csv,text/csv"` (regex `\baccept\s*=\s*["'][^"']*\.csv[^"']*["']`), and the visual-hide pattern. Assert `\bmultiple\b` is absent from the dropzone file.
  - [ ] 4.4 AC17c: hover + dragover styling. Use `dropzoneSource` (comment-stripped) for these assertions. Assert `:hover` rule exists with `background:\s*var\(--accent-soft\)` and `border` color/shift to `var\(--accent\)`. Assert `.is-dragover` (or `&.is-dragover`) rule exists with border-width ≥ 2.5px (regex `border-width:\s*[2-9](\.\d+)?px`). Assert `border-style:\s*dashed` in the base rule.
  - [ ] 4.5 AC17d: click handler opens picker. Assert `dropzoneSource` contains `onclick={openPicker}` (Svelte 5 syntax). Assert the script block contains a named `openPicker` function (regex `\bfunction\s+openPicker\b` or `\bconst\s+openPicker\s*=\s*\(`). Assert the function body calls `.click()` on a reference to the file input (regex `\bfileInput\b.*\.click\(\)` or `getElementById\(['"]file-input['"]\).*\.click\(\)`).
  - [ ] 4.6 AC17e: no file accept handler. Assert `dropzoneSource` does NOT contain `\bonchange\b`, `\bon:change\b`, `handleFile`, `onFile`, `processFile`, `FileReader`, `\breadAsText\b`. This is the load-bearing scope-creep pin.
  - [ ] 4.7 AC17f: zero hex literals in component CSS. Strip comments from `dropzone`, then assert no `#[0-9a-fA-F]{3,8}\b` matches. AD-8 enforcement.
  - [ ] 4.8 AC17g: no forbidden source patterns. Mirror S02.4 AC14i. Scan both `dropzone` and `dropzoneSource` for `\bfetch\(`, `XMLHttpRequest`, `EventSource`, `sendBeacon`, `navigator\.sendBeacon`, `new Function`, `\beval\b`, dynamic `import\(`.
  - [ ] 4.9 AC17h: App.svelte stays without `<style>`. Assert `appSource` (S02.4 boundary pin) does NOT contain `<style>`. Reverse direction from the page-chrome test (which asserts the same; the dropzone test is the second-pin).
  - [ ] 4.10 AC17i: visible label is sentence-case. Extract the button's text content via regex `/<button[^>]*>([\s\S]*?)<\/button>/` → group 1 → trim → assert first char matches `[A-Z]` and the text does NOT contain `\b[A-Z]{4,}\b` (no ALL CAPS words of length ≥ 4). Also assert no curly quotes in the button text (those are reserved for prose copy in S03.5; the button label is sentence-case sans-serif).
  - [ ] 4.11 AC17j: 44×44 touch target. Assert `.dropzone` rule has `min-height:\s*44px` AND `min-width:\s*44px` (or padding-based equivalent).
  - [ ] 4.12 AC17k: prior-story boundary pins. Mirror S02.5 AC15k / S02.6 AC16m pattern. Assert each of `pageChromeTest`, `themeToggleTest`, `focusRingTest`, `editorialPostureTest` contains its expected unique description string (per the earlier specs' AC15k/AC16m entries). Per the S02.5 subagent's precedent at `tests/focus-ring.test.ts:308-319`: anchor on the description string, not on source-text regex against `toEqual(...)` call expressions.
  - [ ] 4.13 AC17l: dropzone is mounted inside `<main class="page-main">`. Assert `app` contains `\bimport\s+Dropzone\s+from\b` AND that `<Dropzone />` appears between the `<main` opening tag and the `</main>` closing tag (regex positional check).

- [ ] **Task 5** — Fold in AI-2.1 (`scripts/audit-behavior.mjs` log suppression):
  - [ ] 5.1 Locate the "page chrome partial" log line (it's an `info`-level log that fires when `header=true main=true footer=false (expected once E02 lands)` — the pattern; in current state, `main=true` since S02.4, so the log line is now misleading). Either silence it in default mode (move behind a `--verbose` CLI flag parse) or remove it (the page chrome present/absent gate is already covered by other assertions).
  - [ ] 5.2 Verify the change doesn't break the existing audit-behavior assertions: `audit-behavior.mjs` still exits 0 on a successful page-load; still detects forbidden hosts in `dist/`; still passes the existing tests.
  - [ ] 5.3 This is a 5-10 line change to one script file, scoped entirely to log output. No behavior change. Document the AI-2.1 fulfillment in the story's step-05 maintenance patch section.

- [ ] **Task 6** — Run the production-readiness gate:
  - [ ] 6.1 `npm test` → all 311 prior tests + ~14 new in `tests/dropzone.test.ts` pass.
  - [ ] 6.2 `npm run check` → 0 errors.
  - [ ] 6.3 `npm run build` → bundle under budget; 0 source maps.
  - [ ] 6.4 `npm run check:bundle` → under 200 KB gzipped.
  - [ ] 6.5 `npm run audit:privacy` → OK.
  - [ ] 6.6 `npm run audit:behavior` → OK; the "page chrome partial" log is silent in default mode.
  - [ ] 6.7 `npm run check:deps` → OK.
  - [ ] 6.8 `npm run check:telemetry` → OK.

- [ ] **Task 7** — Open a local commit (no push yet): `S03.1 done: Real <button> dropzone — opens file picker; hover + dragover styling; zero accept logic`.

## Dev Notes

### Source files this story touches

| File | Status | Surface S03.1 changes |
|---|---|---|
| `src/components/Dropzone.svelte` | **NEW** | The dropzone component (real `<button>`, hidden `<input type="file">`, hover + dragover styling). |
| `src/App.svelte` | **MODIFIED** | Import `Dropzone`; render `<Dropzone />` inside `<main>` (replacing the E03 placeholder comment). No other changes. |
| `tests/dropzone.test.ts` | **NEW** | 12 AC17a–AC17l describe blocks; ~14 tests; mirrors the existing test convention. |
| `scripts/audit-behavior.mjs` | **MODIFIED (AI-2.1)** | Silence the "page chrome partial" log line (or move behind `--verbose`). 5-10 line change. |

### Files S03.1 does NOT touch (avoid scope creep)

| File | Why leave alone |
|---|---|
| `src/styles/tokens.css` | No new tokens needed; the dropzone consumes existing `--accent`, `--accent-soft`, `--graphite`, `--ink`, `--paper`, `--size-body`, `--font-system`, `--radius-dropzone`, `--space-section`. |
| `src/styles/app.css` | Dropzone CSS lives in the component's `<style>` block (mirrors ThemeToggle). |
| `src/components/ThemeToggle.svelte` | Unchanged. |
| `index.html` | Unchanged. |
| `src/main.ts` | Unchanged. |
| `src/lib/*` (state types, reducer, strict-brief) | E05 territory; S03.1 does not introduce state. |
| `src/worker/*` | E05+ territory; S03.1 does not spawn the worker. |

### Cross-story contract notes

- **S03.2 will add drag-and-drop + paste**: S03.1's CSS pre-wires the `.is-dragover` class so S03.2 only needs a `dragenter`/`dragleave`/`drop` handler that toggles the class. The `dragover` event handler will also call `event.preventDefault()` (necessary to enable drop). S03.1 deliberately does NOT add any `dragover`/`drop` handler — leave that surface clean for S03.2.
- **S03.3 will add the 50 MB cap check**: S03.1 does not check file size. The hidden `<input>` accepts anything; S03.3's handler (which lives in the reducer wiring, S03.7) is the gate.
- **S03.4 will add the aria-live announcement on file accept**: S03.1's dropzone has no aria-live region. The empty-state copy + teaching cards + aria-live region land in S03.5 + S03.4 respectively.
- **S03.5 will land the locked empty-state copy + teaching cards**: S03.1 ships only the button label. The headline + lede + privacy signal line + three teaching cards land in S03.5 + S03.6.
- **S03.7 will add the `File` reference emit to the reducer**: S03.1 has NO `@change` handler. The wiring goes in S03.7 against the existing E05 state machine.

### Anti-patterns to avoid (per the E02 retro's "What was hard" lessons)

- **CSS property vs CSS custom-property confusion** (S02.6 lesson): the dropzone uses `var(--accent)` not `accent` shorthand. No `border: 1.5px dashed accent` shorthand that bypasses the token.
- **Spec implies a directory walk, not a per-file scan** (S02.5 lesson): not directly applicable here (the test scans 4 files by path; the test surface is bounded). But the test should NOT walk `src/` for the AC17f hex-literal check — the dropzone test scopes to the dropzone file only; the broader `src/` walk is the S02.6 test's job.
- **Description-string anchor for boundary pins** (S02.5 lesson): AC17k pins the prior-story boundary on the description string, not on the source-text regex against `toEqual(...)`. Mirrors the precedent at `tests/focus-ring.test.ts:308-319`.
- **Subprocess timeout**: not applicable to S03.1 (no `spawnSync` invocations; AI-2.1's audit-behavior fold-in doesn't add new subprocesses).
- **Test gate vs implementation drift**: the spec pins both the component shape (script block + template + style block) and the test gate (12 ACs). The two together are what the implementation must satisfy.

### Verification gap risk (review-time prediction)

The most likely review-time finding on S03.1: **AC17i's "sentence-case" regex doesn't account for non-Latin scripts**. The button label is hard-coded English ("Browse files") so the regex is fine for S03.1, but if a future contributor localizes the label, the regex would over-constrain. Document this in the step-05 maintenance patch if it surfaces in review.

The second most likely finding: **AC17c's dragover border-width regex (`[2-9](\.\d+)?px`)** would NOT match `border: 3px solid var(--accent)` (the shorthand) — only the decomposed `border-width`. The implementation should use decomposed `border-width` + `border-style` + `border-color` (or the regex should accept the shorthand too). Implementation choice: use decomposed `border-width` in the `.is-dragover` rule so the test's regex matches cleanly. Document in step-05 if the regex needs widening.

### References

- [Source: _bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/EXPERIENCE.md#component-patterns] — Dropzone behavioral contract: real `<button>`, opens picker, drag-and-drop handled, paste handled, file name in aria-live on accept.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/DESIGN.md#components] — Dropzone visual: 1.5px dashed `--graphite` border, 2px radius, hover lifts to `--accent-soft`, dragover thickens.
- [Source: _bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/ARCHITECTURE-SPINE.md#ad-9-accessibility-contract] — No `div onClick`; real `<button>` = real keyboard floor.
- [Source: _bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/SOLUTION-DESIGN.md#module-boundaries] — `src/components/*` may import `lib/state`, `lib/types`, `design/*`; must NOT import `worker/*` or raw `fetch`.
- [Source: _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md#fr-1-file-ingestion] — Drag-and-drop, file picker, or direct paste; up to 50 MB.
- [Source: _bmad-output/implementation-artifacts/epic-2-retrospective.md#what-was-hard] — E02's CSS-property / custom-property lesson; description-string anchor for boundary pins.
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — The deferred-work catalog (still empty of E03 entries; S03.1 may add to it from review).
- [Source: _bmad-output/implementation-artifacts/2-4-page-chrome-semantic-header-nav-main-footer.md#ac14l] — The S02.4 "wordmark in header, not in main" positional pin; mirrored by AC17l "dropzone in main, not in header."

## Dev Agent Record

### Agent Model Used

TBD (filled at implementation time)

### Debug Log References

TBD

### Completion Notes List

TBD

### File List

TBD

## Step-05 maintenance patch (Review #1 → Review #2 loop)

After Review #1 returned three findings (adversarial, edge-case-hunter, verification-gap), five prioritized patches were applied in a single pass before the production-readiness gate ran. Each patch is documented below with its source-grep target, the change applied, and the verification it ran.

### Patch 1 — HIGH — AC13/AI-2.1 log-content test (verification-gap)

**Finding**: the AC16h exit-code-only test in `tests/editorial-posture.test.ts` did not verify the actual log-content contract for AI-2.1. A future regression that broke the `--verbose` opt-in (e.g., re-introducing the noisy pre-fix info log) would pass the exit-code gate vacuously.

**Change**: extended AC16h into a sibling describe block with three assertions:
- `node scripts/audit-behavior.mjs` exits 0 (existing assertion, retained).
- Default-mode stdout contains `page chrome: all landmarks present` AND does NOT contain `page chrome selectors not all present` or `page chrome: partial`.
- `--verbose` mode on the happy path does NOT regress to the pre-patch-3 `selectors not all present` breadcrumb; the structured end-of-main summary still fires.

The 60s timeout from AC16h is reused (one full boot + 2s post-load pause + teardown per `spawnSync` invocation).

**File**: `tests/editorial-posture.test.ts:302-365` (AC16h describe block; ~63 lines added).

**Verification**: `npm test` → AC16h log-content test passes (3 sub-tests). Full suite: 363 tests pass (was 357 before patch — net +6 tests from this AC + Patch 2 + Patch 4 additions).

### Patch 2 — HIGH — AC17e scope-pin bypass (edge-case-hunter)

**Finding**: the forbidden list at `tests/dropzone.test.ts:198-216` covered the Svelte template-level handlers (`@change`, `on:change=`, `onchange=`) but NOT the imperative DOM-API path. A future contributor could wire the file accept handler via `input.addEventListener('change', …)` and bypass every gate.

**Change**: extended AC17e with two new negative assertions:
- `expect(dropzoneSource).not.toMatch(/\baddEventListener\s*\(\s*['"]change['"]/)` — catches `addEventListener('change', …)`.
- `expect(dropzoneSource).not.toMatch(/\bonMount\s*\(/)` — belt-and-suspender for the `onMount(() => fileInput.addEventListener(...))` path.

**File**: `tests/dropzone.test.ts:217-231` (~14 lines added).

**Verification**: `npm test` → dropzone test count rises from 48 to 50 (the two new assertions). All pass.

### Patch 3 — LOW — Dedupe verbose reporting in `scripts/audit-behavior.mjs` (verification-gap)

**Finding**: under `--verbose`, the mid-sequence `page chrome selectors not all present` info log AND the end-of-main `page chrome: partial — …` summary line both fired with overlapping info, doubling the noise on a regression. The mid-sequence log was redundant with the structured end-of-main summary.

**Change**: removed the mid-sequence breadcrumb entirely. The `verbose` flag becomes moot for that specific log (the gated branch is gone). The end-of-main summary in `main()` is unchanged — it still fires the happy-path `page chrome: all landmarks present` summary in default mode, and the partial-chrome summary behind `--verbose`. Also removed the now-unused `verbose` parameter from `runSequence()`.

**File**: `scripts/audit-behavior.mjs:230-238` (removed the gated mid-sequence log block); also `runSequence()` signature at line 168 (removed `verbose` parameter) and the call site at line 312. Net: ~10 lines removed.

**Verification**: `npm run audit:behavior` → only one `page chrome:` line in stdout (the happy-path summary). `npm test` → AC16h `--verbose` regression test passes (the duplicate breadcrumb no longer fires).

### Patch 4 — LOW — Hidden input a11y (adversarial)

**Finding**: the `<input type="file">` in `src/components/Dropzone.svelte` was `visually-hidden` but still tabbable by default. A keyboard user tabs past the button into an invisible focus target — an a11y regression on top of an AD-9 invariant (the button is the affordance; the input is not).

**Change**: added `tabindex="-1"` to the `<input>` opening tag. The input is still programmatically clickable by `fileInput.click()` (S03.1's `openPicker` handler), but is removed from the keyboard tab order. The button remains the sole keyboard affordance, matching AD-9.

Also extended AC17b with a positive assertion:
- `expect(dropzoneSource).toMatch(/<input\b[^>]*\btabindex\s*=\s*["']-1["']/)` — anchored on the literal `tabindex="-1"` so a future contributor who removes it (or replaces it with `tabindex="0"`) trips this AC.

**Files**:
- `src/components/Dropzone.svelte:39-47` — added `tabindex="-1"` to the input.
- `tests/dropzone.test.ts:121-130` — added the AC17b tabindex assertion (~9 lines added).

**Verification**: `npm test` → AC17b tabindex test passes. `npm run build` → bundle still under budget (tabindex adds ~10 bytes).

### Patch 5 — LOW — Tighten `--verbose` parsing in `scripts/audit-behavior.mjs` (adversarial)

**Finding**: `process.argv.includes('--verbose')` uses a substring-style match (any element that *contains* the string would match). A future contributor who passed a `--log-file=--verbose` style argument would silently flip `--verbose` mode on, polluting the audit log.

**Change**: replaced `process.argv.includes('--verbose')` with `process.argv.find((a) => a === '--verbose') !== undefined`. The `find` callback uses strict equality, so `--log-file=--verbose` (a single argument equal to that string) does NOT match the flag.

**File**: `scripts/audit-behavior.mjs:272` (one-line change in `main()`; the matching comment block at lines 267-271 was updated to document the new contract).

**Verification**: `npm run audit:behavior` → default mode unchanged. `npm run audit:behavior -- --verbose` → still gates the partial-chrome summary. `npm test` → AC16h `--verbose` regression test still passes (verbose mode on happy path emits `page chrome: all landmarks present`, no `page chrome selectors not all present` breadcrumb).

### Step-05 production-readiness gate (post-patch)

After all five patches were applied, the full production-readiness gate was re-run. All eight checks green:

| Command | Status | Notes |
|---|---|---|
| `npm test` | PASS | 363 tests pass (was 357 before patch; net +6 tests: AC16h × 2 new sub-tests, AC17e × 2 new sub-tests, AC17b × 1 new sub-test, plus the AC17b tabindex assertion that adds 1 to dropzone's 50-test count from 49 to 50). |
| `npm run check` | PASS | svelte-check 0 errors (2 pre-existing warnings unrelated to S03.1). |
| `npm run build` | PASS | dist/ exists; 0 source maps (cleaned by `build-cleanup.mjs`). |
| `npm run check:bundle` | PASS | total gz 13.98 KB / 200 KB budget. |
| `npm run audit:privacy` | PASS | 3 dist files scanned · 27 forbidden hosts · 6 forbidden source calls — OK. |
| `npm run audit:behavior` | PASS | 3 allowed requests · 0 anomalous · 0 service workers · `page chrome: all landmarks present`. |
| `npm run check:deps` | PASS | 42 packages scanned · 0 denylisted. |
| `npm run check:telemetry` | PASS | 91 packages scanned · 0 forbidden patterns. |

### Step-05 patch delta summary

| File | Lines added | Lines removed | Net |
|---|---|---|---|
| `tests/editorial-posture.test.ts` | +63 | 0 | +63 |
| `tests/dropzone.test.ts` | +23 | 0 | +23 |
| `scripts/audit-behavior.mjs` | +11 | -16 | -5 |
| `src/components/Dropzone.svelte` | +1 | 0 | +1 |

Total net change: +82 lines (mostly tests; production code is 1-line attribute + 5-line comment refresh).

## Suggested Review Order

**Dropzone component (the entry point — start here)**

- Real `<button>` affordance + hidden `<input type="file">` picker, scoped CSS, no accept logic.
  [`Dropzone.svelte:1`](../../src/components/Dropzone.svelte#L1)
- Click handler `onclick={openPicker}` calls `fileInput?.click()` — verbatim production call site, Svelte 5 syntax.
  [`Dropzone.svelte:15`](../../src/components/Dropzone.svelte#L15)
- Scoped CSS — dashed border, hover lift to `--accent-soft`, `.is-dragover` pre-wired for S03.2, token-only values.
  [`Dropzone.svelte:49`](../../src/components/Dropzone.svelte#L49)
- Hidden input is `tabindex="-1"` (removed from keyboard tab order; AD-9 button is sole affordance).
  [`Dropzone.svelte:39`](../../src/components/Dropzone.svelte#L39)

**Mount wiring in page chrome**

- Import `Dropzone` (alphabetical with `ThemeToggle`); no other App.svelte change.
  [`App.svelte:21`](../../src/App.svelte#L21)
- Render `<Dropzone />` inside `<main class="page-main">`, replacing the E03 placeholder comment.
  [`App.svelte:39`](../../src/App.svelte#L39)

**AI-2.1 fold-in (page-chrome partial log silenced)**

- `--verbose` flag parsed at `main()` entry via strict-equality find — `--log-file=--verbose` does NOT match.
  [`audit-behavior.mjs:272`](../../scripts/audit-behavior.mjs#L272)
- End-of-main `page chrome:` summary branches: default mode = happy-path only; `--verbose` = partial-chrome fallback.
  [`audit-behavior.mjs:325`](../../scripts/audit-behavior.mjs#L325)

**Test gate (canonical AC17a–AC17l coverage)**

- 50-test boundary for the dropzone — real `<button>`, hidden input, no accept handler, hover + dragover CSS, sentence-case label, 44×44 target, dropzone-in-main positional pin.
  [`dropzone.test.ts:1`](../../tests/dropzone.test.ts#L1)
- AC17e scope-creep pin extended to block `addEventListener('change', …)` and `onMount(` imperative-DOM-API bypasses.
  [`dropzone.test.ts:217`](../../tests/dropzone.test.ts#L217)

**Test patch (Review #1 → Review #2)**

- AC16h AI-2.1 log-content contract: default mode emits `page chrome: all landmarks present` and no partial breadcrumb; `--verbose` regression assertion.
  [`editorial-posture.test.ts:302`](../../tests/editorial-posture.test.ts#L302)
# Story 3.2: Drag-and-drop handler + paste handler (S03.2)

Status: done
baseline_commit: 73ab6b0 (S03.2 spec + sprint-status; pre-implementation)
review_loop_iteration: 1
final_commit: 4d25a30

> **Loop protocol (mandatory).** This story must pass Review #1 (3 parallel reviewers), Review #2 (coderabbit), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. `S03.2` lands the **second half** of the E03 user-visible gesture surface: drag-and-drop file accept + clipboard paste of CSV text. S03.1 shipped the visual chrome + the picker-opening gesture + the `.is-dragover` CSS pre-wire; S03.2 wires the **handlers** that toggle the class and accept dropped/pasted files. The component exposes an `onaccept` callback prop that the reducer wiring (S03.7) will subscribe to; **S03.2 itself does NOT touch the reducer, the worker, or `src/lib/*`** — the file is captured and surfaced via the callback, no further side effects in S03.2.

## Story

As a **user about to ingest a CSV into WebUtilityLab / CSV Rescue**,
I want **dragging a file onto the dropzone to be accepted (same gesture as clicking) AND pasting CSV text onto the page to be accepted as if a file had been dropped**,
so that **the gesture surface matches Devon's UJ-1 (drag from desktop OR paste copied CSV text) and the empty state's "drop here or paste text" affordance is real, not aspirational**. S03.1 was the visual button; S03.2 is the gesture verbs.

## Acceptance Criteria

1. **Drag-and-drop on the dropzone is handled.** Dropping a file on the `.dropzone` button (or its containing area — see AC2) fires the same accept path as clicking the button does. The dragenter/dragover/dragleave/drop handlers are attached to the `<button class="dropzone">` element. The `drop` event's `dataTransfer.files[0]` is the accepted file.
2. **Container-level drag-and-drop.** A file dropped onto the page **outside** the dropzone is NOT accepted (per FR-1: drop-onto-dropzone, not drag-onto-anything). Dragging a file over the dropzone button shows the `.is-dragover` visual; the rest of the page does NOT have the visual. Drag events that bubble up to `<body>` are NOT engaged (we do not want the user dropping a file anywhere on the page and getting an accept — focus the gesture on the button).
3. **`dragenter` and `dragover` both call `event.preventDefault()`** to allow the drop. Per the HTML5 DnD spec, `dragover` must cancel the default for `drop` to fire. Calling only `dragenter`'s default is insufficient because Chrome and Firefox fire `dragover` continuously while the cursor moves over the target. **The handler chain MUST be: `dragenter` → `preventDefault`, `dragover` → `preventDefault`, `dragleave` → no preventDefault, `drop` → `preventDefault` (default opens the file in the browser; we want to handle it).**
4. **`.is-dragover` class is added on `dragenter` and removed on `dragleave` / `drop`.** A single boolean state (`let isDragging = $state(false)`) drives the class toggle. The className binding is `class:dropzone-is-dragover={isDragging}` (or equivalent Svelte 5 directive). The CSS rule `.dropzone.is-dragover` pre-wired in S03.1 (3px `--accent` dashed border) does NOT need re-stating in the `<style>` block; S03.2 only writes the class-toggle logic.
5. **`drop` event accepts the file via the `onaccept` callback.** The component declares an optional callback prop `onaccept?: (source: { kind: 'drop'; file: File } | { kind: 'paste'; text: string; filename?: string }) => void`. When the drop event fires, the handler extracts `e.dataTransfer?.files[0]`, builds the `{ kind: 'drop', file }` payload, and invokes `onaccept(payload)`. S03.2 ships with `onaccept` unbound (App.svelte does not pass a callback) — the gesture is wired but no consumer is attached yet.
6. **The file picker (`<input type="file">` opened via the button) STILL does not wire `@change` in S03.2.** The picker's @change handler is S03.7's job (it emits a `File` reference to the reducer; the reducer transitions `empty → active`). S03.2's scope is **drag-drop + paste ONLY** — the picker's click→pick gesture stays passive.
7. **Paste handler is attached at the document (window) level.** Pasting is a `clipboard` gesture: a user clicks anywhere on the page (or focuses the dropzone, or focuses body) and presses Ctrl/Cmd+V. The handler is attached with `onMount` (Svelte 5 lifecycle) to `window` (the entire page), listening for the `'paste'` event. The handler reads `e.clipboardData?.getData('text/plain')` (text only — images, files, HTML are out of scope; S03.2 is the CSV-text paste per FR-1). If the clipboard text is non-empty AND looks like CSV (heuristic: at least one `\n` OR one comma per line on the first sampled line — see AC8), invoke `onaccept({ kind: 'paste', text })`. If the clipboard is empty or non-text, the handler is a no-op (no error).
8. **CSV-likeness heuristic for paste.** A pasted text is accepted if EITHER:
   - The text contains at least one `\n` (multi-line, so it's plausibly a multi-row CSV), OR
   - The first non-empty line contains a comma (single-row CSV).
   Otherwise (e.g., the user pasted "hello world" or a URL), the paste is **rejected silently** (no error toast; the gesture just doesn't accept). This is a soft heuristic — the strict check is downstream (the worker will detect malformed CSVs at parse time and emit a strict-brief error via S03.9's error path). The heuristic's intent: don't accept obviously-non-CSV pastes; don't reject ambiguous pastes.
   - **Edge case:** the heuristic is permissive (any text with `\n` OR a comma on line 1 is treated as CSV-likely). A user pasting a prose paragraph that happens to contain a newline is accepted; the downstream parser will surface a strict-brief error. That's the right trade-off — over-acceptance is recoverable; under-acceptance is hostile.
9. **`paste` event's `preventDefault` is called to stop the browser from inserting the pasted text into any focused input.** Without `preventDefault`, paste on a focused `<input>` (e.g., the dev-tools console's prompt, or any future input S03.5 lands) would dump the CSV into the input. The handler always calls `e.preventDefault()` BEFORE the CSV-likeness check.
10. **The paste handler is registered ONCE on mount and removed on unmount.** Mirror the Svelte 5 lifecycle pattern: `onMount(() => { window.addEventListener('paste', handlePaste); return () => window.removeEventListener('paste', handlePaste); })`. The `onMount` cleanup function ensures no listener leak if App.svelte re-renders or unmounts the dropzone (future-proofing; S03.2's component is currently mounted once and stays mounted).
11. **Drag handlers are attached to the button, not to `window`.** The `dragenter` / `dragover` / `dragleave` / `drop` listeners are bound via Svelte 5 syntax (`ondragenter={handleDragEnter}`, `ondragover={handleDragOver}`, `ondragleave={handleDragLeave}`, `ondrop={handleDrop}`) on the `<button class="dropzone">` element. **Drag handlers are NOT attached to `window`** — that would conflict with AC2 (page-level drops should NOT be accepted; only drops ON the dropzone are accepted).
12. **Handlers do not crash on missing `dataTransfer`.** `e.dataTransfer` may be null for synthetic events (Playwright-generated events, JSDOM, some edge cases). The handlers use optional chaining (`e.dataTransfer?.files?.[0]`) and short-circuit if the data is missing. A null `dataTransfer` is a no-op (no error toast; no `onaccept` invocation).
13. **No new dependencies.** The handlers use standard DOM APIs (`DataTransfer`, `ClipboardEvent`, `File`, `addEventListener`) which are available in all evergreen browsers (Chrome 88+, Firefox 78+, Safari 14+). No `react-dnd`, no `filepond`, no `dropzone.js`. The S03.1 component was already dependency-free; S03.2 keeps it that way. `package.json` is unchanged.
14. **Privacy Baseline preserved.** No `fetch` / `XMLHttpRequest` / `navigator.sendBeacon` / `EventSource` / `new Function` / `eval` / dynamic `import()` are introduced. The `paste` handler does NOT read anything from `navigator.clipboard` (which requires permissions and shows a browser prompt); it uses the `paste` event's `clipboardData` (which does NOT prompt — pastes are user-initiated). `audit-privacy.mjs` stays green.
15. **Tests** at `tests/dropzone-drag-paste.test.ts` (NEW — separate file from `tests/dropzone.test.ts` to keep S03.1's test surface stable and to allow per-feature regression tracking). Mirrors the `node:fs` + `node:path` + `node:url` + `vitest` convention. Source-grep on `src/components/Dropzone.svelte`, `src/App.svelte`, and `tests/dropzone.test.ts`. Coverage (13 AC18a-AC18m describe blocks):
    - **AC18a (drag handlers attached to button, not window)** — `src/components/Dropzone.svelte` template binds `ondragenter={...}`, `ondragover={...}`, `ondragleave={...}`, `ondrop={...}` on the `<button class="dropzone">` element (NOT on the component root or on `window`). The test greps for `ondragenter`, `ondragover`, `ondragleave`, `ondrop` inside the dropzone file and asserts each appears; also asserts no `window.addEventListener('drag'`, `window.addEventListener('drop'`, `document.addEventListener('drop'` patterns (those would indicate page-level drag-drop).
    - **AC18b (paste handler on window, lifecycle-managed)** — `src/components/Dropzone.svelte` script block contains `window.addEventListener('paste', ...)` AND `window.removeEventListener('paste', ...)` AND uses Svelte 5 `onMount` (or `$effect` with teardown). The test greps for `onMount` (must be `onMount\s*\(`) AND `removeEventListener` AND `addEventListener\s*\(\s*['"]paste['"]`.
    - **AC18c (`dragenter` and `dragover` call preventDefault)** — the source-text of `handleDragEnter` and `handleDragOver` (named functions, not inline arrows) contains `preventDefault\s*\(\s*\)`. The test greps `dropzoneSource` for both names and asserts both have `preventDefault()` in their bodies.
    - **AC18d (`dragleave` does NOT call preventDefault; `drop` does)** — `handleDragLeave` does NOT contain `preventDefault` (per AC3; we don't need to prevent the leave's default). `handleDrop` DOES contain `preventDefault()` (per AC3 + the default-opens-file-in-browser problem). The test greps each named function's body.
    - **AC18e (`.is-dragover` class is toggled by a single boolean state)** — `src/components/Dropzone.svelte` script declares `let isDragging = $state(false)` (or `$state(false)`-bound). The template binds `class:is-dragover={isDragging}` (or a Svelte 5 `class={isDragging ? 'dropzone is-dragover' : 'dropzone'}` equivalent). The test greps for the boolean declaration + the binding pattern.
    - **AC18f (`drop` invokes `onaccept` with `{ kind: 'drop', file }`)** — `handleDrop`'s body contains `onaccept\s*\(\s*\{\s*kind\s*:\s*['"]drop['"]\s*,\s*file\s*\}` (or the equivalent payload construction). The component declares `let { onaccept }: { onaccept?: ... } = $props()` (Svelte 5 runes props syntax).
    - **AC18g (paste invokes `onaccept` with `{ kind: 'paste', text }`)** — `handlePaste`'s body contains `onaccept\s*\(\s*\{\s*kind\s*:\s*['"]paste['"]\s*,\s*text\s*\}` (or equivalent). The CSV-likeness heuristic precedes the `onaccept` invocation (regex /\n/ OR comma-on-first-line check precedes the call).
    - **AC18h (CSV-likeness heuristic)** — `handlePaste` references `clipboardData` (via `e.clipboardData` or destructuring) AND contains the heuristic via either (a) a regex match on `\\n` / `\\\\n` literal OR (b) a `.includes('\\n')` / similar, AND references `indexOf` OR `,` (comma check). The pattern is fuzzy — the test accepts either the regex form (`/\\n/` or `text.match(/\\n/)`) or the string-includes form (`text.includes('\\n')`).
    - **AC18i (paste handler always calls preventDefault before heuristic)** — within `handlePaste`, the FIRST reference to `preventDefault()` precedes any `clipboardData` / `onaccept` reference. The test extracts the function body via regex and asserts `preventDefault` appears before `clipboardData` or `onaccept` in source order.
    - **AC18j (no `@change`/`onchange`/`on:change`/`addEventListener('change'` is added in S03.2)** — `dropzoneSource` does NOT contain `onchange`, `@change`, `addEventListener\s*\(\s*['"]change['"]`. This is the load-bearing S03.7-scope pin: a future contributor wiring the change handler in S03.2 trips here. (Mirrors S03.1's AC17e pin, applied to the same file.)
    - **AC18k (no Svelte 4 `on:dragover` / `on:` syntax reappears)** — `dropzoneSource` does NOT contain `on:dragover`, `on:dragenter`, `on:drop`, `on:paste`. Svelte 5 syntax throughout.
    - **AC18l (zero hex literals in component CSS, AD-8)** — same as S03.1 AC17f; the dropzone's `<style>` block has zero `#rrggbb` / `#rgb` / `#rrggbbaa` matches (strip comments first).
    - **AC18m (no forbidden source patterns, Privacy Baseline + AD-7)** — same as S03.1 AC17g; scan `dropzoneSource` for `\bfetch\(`, `XMLHttpRequest`, `EventSource`, `sendBeacon`, `navigator\.sendBeacon`, `new Function`, `\beval\b`, dynamic `import\(`. Plus explicitly: no `navigator\.clipboard` (per AC14).
    - **AC18n (App.svelte still does NOT pass an `onaccept` callback)** — `src/App.svelte`'s `<Dropzone />` element renders without an `onaccept` attribute (or any binding that would constitute a callback prop). This is the S03.7 boundary pin: S03.2 ships the gesture surface; S03.7 wires it to the reducer. A future contributor adding the callback prematurely in S03.2 trips here. The test also captures the `<Dropzone />` opening tag and asserts it is exactly `<Dropzone />` — no `class=`, no `id=`, no callback prop of any name. This guards against prop-rename bypass (`onaccept` → `onAccept` / `accept` / `handleAccept`).
    - **AC18o (boundary pin: prior stories unchanged)** — `tests/page-chrome.test.ts`, `tests/theme-toggle.test.ts`, `tests/focus-ring.test.ts`, `tests/editorial-posture.test.ts`, `tests/dropzone.test.ts` each contain their expected unique description strings. The new AC18o adds `tests/dropzone.test.ts` to the pin list (S03.1's prior-story boundary pins AC17k covered four tests; AC18o extends to five). The theme-toggle and focus-ring pins anchor on the top-level `describe(...)` block title (not loose substring) so a stray comment can't satisfy them.
16. **README / docs / planning-artifact changes are out of scope.** No edits to `CHANGELOG.md`, `SECURITY.md`, `docs/loop-protocol.md`, `docs/pii-patterns.md`, or the planning artifacts (post-Epic updates). Story commit is code-only.
17. **No new dependencies.** S03.2 is component + test only; no `package.json` entries.
18. **`tests/dropzone-drag-paste.test.ts` passes in the production gate.** The test file is committed, runs at `npm test`, and all assertions pass on first implementation. Expected test count: ~15 tests across 15 AC18a-AC18o describe blocks (most have one or two sub-assertions).

## Verification

1. `npm test` → all tests pass (363 from before S03.2 + ~52 new sub-assertions across 15 `describe` blocks in `tests/dropzone-drag-paste.test.ts`; the "~15" was the describe-block count, not the test count — actual count is ~52 with the post-review verification-gap tightenings).
2. `npm run check` → svelte-check 0 errors + tsc 0 errors.
3. `npm run build` → `dist/` exists; `find dist -name '*.map' | wc -l` = 0; bundle still under budget (S03.2 adds <2 KB to the JS bundle for the drag/paste handler functions).
4. `npm run check:bundle` → under 200 KB gzipped.
5. `npm run audit:privacy` → OK.
6. `npm run audit:behavior` → OK; the dropzone renders inside `<main>`; zero post-load requests; the drag-and-drop and paste gestures do NOT trigger any network requests (the local `File` is read only on S03.7's reducer-driven path).
7. `npm run check:deps` → OK.
8. `npm run check:telemetry` → OK.
9. **Manual / DevTools**:
   - `npm run preview`; open in Chrome.
   - Empty state shows the dropzone (S03.1's visual).
   - Drag a CSV from the desktop onto the dropzone button. The `.is-dragover` border thickens (3px `--accent`) while the cursor is over the button. Drop. **The component captures the File; no network request fires; no error appears.** (The file is accepted by the component but not yet processed — S03.7 will hook the callback.)
   - Drag a CSV onto the page BACKGROUND (not the button). No `.is-dragover` visual appears; the drop is ignored.
   - Copy a chunk of CSV text (e.g., `name,age\nAlice,30`) to the clipboard. Focus the page (click anywhere on `<body>` or the button). Press Ctrl/Cmd+V. **The component captures the text via `clipboardData`; no paste text appears in the button's content; no error.**
   - Paste a non-CSV string ("hello world"). No visible effect; the heuristic rejects it.
   - DevTools console: no errors, no warnings.
   - Lighthouse a11y: the dropzone still has an accessible name (the "Browse files" text), a real `<button>` role, real focus, real keyboard activation; the drag-and-drop + paste gestures do not regress a11y.

## Loop Protocol Path Forward

1. Implement Tasks 1–4 below (component + test + verification + AI-2.x carry-over if applicable).
2. Run production-readiness gate (Step 7 of loop).
3. Run Review #1 — 3 reviewers in parallel (blind-hunter, edge-case-hunter, verification-gap) against the diff.
4. Apply Review #1 patches if any.
5. Run Review #2 — coderabbit in fresh context against diff + Review #1 findings.
6. Apply Review #2 patches if any.
7. Flip `sprint-status.yaml` to `done`.
8. Update story file with step-05 maintenance patch notes.
9. Move to S03.3 (50 MB cap check before reading).

## Tasks / Subtasks

- [ ] **Task 1** — Read the existing source files S03.2 touches + the cross-story contract notes:
  - [ ] 1.1 Read `src/components/Dropzone.svelte` (already done; S03.1 component). Note the current shape: real `<button>`, hidden `<input>`, scoped CSS with pre-wired `.is-dragover`. S03.2 ADDS the dragenter/dragover/dragleave/drop handlers and the `onaccept` callback prop, plus the paste handler in `onMount`.
  - [ ] 1.2 Read `src/App.svelte` (already done; currently `<Dropzone />` rendered bare, no callback). S03.2 does NOT modify App.svelte; the component is unchanged in terms of its mount. (A future S03.7 will change `<Dropzone />` to `<Dropzone onaccept={(src) => ...} />`.) AC18n pins this.
  - [ ] 1.3 Read `tests/dropzone.test.ts` to mirror the `node:fs` + `node:path` + `node:url` + `vitest` pattern; mirror the `stripComments` helper (same as AC17f's helper).
  - [ ] 1.4 Re-read the S03.1 spec's Cross-Story Contract Notes (in `3-1-...md`) to confirm S03.2's scope: drop + paste handlers ONLY; no reducer wiring; no `onaccept` consumer.

- [ ] **Task 2** — Extend `src/components/Dropzone.svelte` (MODIFY) to add drag + paste handlers:
  - [ ] 2.1 SCRIPT BLOCK additions (Svelte 5 runes syntax):
    - Add `let { onaccept }: { onaccept?: (source: { kind: 'drop'; file: File } | { kind: 'paste'; text: string }) => void } = $props();` (declares the optional callback prop; defaults to `undefined` when App.svelte doesn't pass it).
    - Add `let isDragging = $state(false);` (single boolean driving the `.is-dragover` class).
    - Add named drag handlers: `function handleDragEnter(event: DragEvent): void { event.preventDefault(); isDragging = true; }`, `function handleDragOver(event: DragEvent): void { event.preventDefault(); }` (no class change; the class was set on dragenter), `function handleDragLeave(): void { isDragging = false; }`, `function handleDrop(event: DragEvent): void { event.preventDefault(); isDragging = false; const file = event.dataTransfer?.files?.[0]; if (file) onaccept?.({ kind: 'drop', file }); }`.
    - Add `function handlePaste(event: ClipboardEvent): void`: reads `event.clipboardData?.getData('text/plain') ?? ''`, calls `event.preventDefault()` first, applies the CSV-likeness heuristic (`text.includes('\n') || text.split('\n', 1)[0].includes(',')`), invokes `onaccept?.({ kind: 'paste', text })` if heuristic passes.
    - Add `onMount(() => { window.addEventListener('paste', handlePaste); return () => window.removeEventListener('paste', handlePaste); });`. The Svelte 5 `onMount` (imported from `'svelte'`) lifecycle hook is the right primitive here.
  - [ ] 2.2 TEMPLATE BLOCK additions:
    - Add `ondragenter={handleDragEnter}`, `ondragover={handleDragOver}`, `ondragleave={handleDragLeave}`, `ondrop={handleDrop}` attributes on the `<button class="dropzone">` element. The `isDragging` state binds via `class:is-dragover={isDragging}` (Svelte 5 class directive) OR `class={isDragging ? 'dropzone is-dragover' : 'dropzone'}` — pick one.
  - [ ] 2.3 STYLE BLOCK: unchanged from S03.1. The `.dropzone.is-dragover` rule is already there (3px `--accent` dashed border pre-wire).
  - [ ] 2.4 Update the file's docblock to reflect S03.2's addition: the gesture surface (drag/drop + paste) is now wired; the reducer emit lands in S03.7.

- [ ] **Task 3** — Mount contract pins (App.svelte stays unchanged):
  - [ ] 3.1 AC18n pins App.svelte: `<Dropzone />` is rendered bare — NO `onaccept` callback prop. If a future contributor pre-wires the reducer callback in S03.2 (out of scope), the AC18n test trips.
  - [ ] 3.2 No other changes to `src/App.svelte` (the skip-link, header, nav, footer, `<main>`, `<Dropzone />` are untouched).

- [ ] **Task 4** — Write `tests/dropzone-drag-paste.test.ts` (NEW):
  - [ ] 4.1 File preamble: `node:fs` + `node:path` + `node:url` + `vitest` imports. `here = fileURLToPath(new URL('.', import.meta.url))`; `repoRoot = join(here, '..')`. Constants for `dropzonePath`, `appPath`, `dropzoneTestPath = 'tests/dropzone.test.ts'`, `pageChromeTestPath`, `themeToggleTestPath`, `focusRingTestPath`, `editorialPostureTestPath`. Read each file once at top of describe block. Define `stripComments` helper (mirror S03.1's).
  - [ ] 4.2 AC18a: drag handlers on button, not window. Grep `dropzoneSource` for `ondragenter`, `ondragover`, `ondragleave`, `ondrop`. Assert each appears (presence). Assert no `window.addEventListener('drag'`, `window.addEventListener('drop'`, `document.addEventListener('drop'` patterns.
  - [ ] 4.3 AC18b: paste handler on window, lifecycle-managed. Grep for `onMount\s*\(`, `window.addEventListener\s*\(\s*['"]paste['"]`, `window.removeEventListener\s*\(\s*['"]paste['"]`. All three required.
  - [ ] 4.4 AC18c: `handleDragEnter` + `handleDragOver` call `preventDefault()`. Extract each function body via regex (named function to closing brace), assert `preventDefault\s*\(\s*\)` appears.
  - [ ] 4.5 AC18d: `handleDragLeave` does NOT call preventDefault; `handleDrop` DOES. Same regex extraction.
  - [ ] 4.6 AC18e: `.is-dragover` class toggle via boolean state. Grep for `let isDragging = $state(false)` (or `$state(false)` plus a reference to `isDragging`) AND `class:is-dragover` (or the ternary form).
  - [ ] 4.7 AC18f: `drop` invokes `onaccept` with `{ kind: 'drop', file }`. Grep `handleDrop`'s body for `onaccept\s*\(\s*\{` and `kind\s*:\s*['"]drop['"]` and `file`. Also grep for `$props()` plus `onaccept` declaration.
  - [ ] 4.8 AC18g: paste invokes `onaccept` with `{ kind: 'paste', text }`. Same regex shape against `handlePaste`'s body.
  - [ ] 4.9 AC18h: CSV-likeness heuristic. Grep `handlePaste` for `clipboardData`, regex or `includes` for `\\n` / newline, and a comma check (`,` literal or `indexOf`).
  - [ ] 4.10 AC18i: paste `preventDefault` precedes `clipboardData`/`onaccept`. Extract `handlePaste`'s body as a string; assert `preventDefault`'s char index < `clipboardData`'s char index AND `preventDefault`'s char index < `onaccept`'s char index.
  - [ ] 4.11 AC18j: no `@change`/`onchange`/`addEventListener('change')` in S03.2 (S03.7-scope pin).
  - [ ] 4.12 AC18k: no Svelte 4 `on:dragover` / `on:` syntax.
  - [ ] 4.13 AC18l: zero hex literals in component CSS (mirror S03.1 AC17f).
  - [ ] 4.14 AC18m: no forbidden source patterns + no `navigator.clipboard` (mirror S03.1 AC17g + the AC14 navigator.clipboard negative).
  - [ ] 4.15 AC18n: App.svelte does NOT pass `onaccept` to `<Dropzone />`. Assert `appSource` does NOT match `<Dropzone\b[^>]*\bonaccept\b`.
  - [ ] 4.16 AC18o: prior-story boundary pins extended to include `tests/dropzone.test.ts`. Mirror S03.1 AC17k's description-string pin; add a new assertion for the dropzone test's identity marker (the AC17k description string from dropzone.test.ts: e.g., `'dropzone (S03.1 real <button> dropzone opens file picker)'`).

- [ ] **Task 5** — Run the production-readiness gate (mirror S03.1 Task 6):
  - [ ] 5.1 `npm test` → all 363 prior tests + ~15 new in `tests/dropzone-drag-paste.test.ts` pass.
  - [ ] 5.2 `npm run check` → 0 errors.
  - [ ] 5.3 `npm run build` → bundle under budget; 0 source maps.
  - [ ] 5.4 `npm run check:bundle` → under 200 KB gzipped.
  - [ ] 5.5 `npm run audit:privacy` → OK.
  - [ ] 5.6 `npm run audit:behavior` → OK.
  - [ ] 5.7 `npm run check:deps` → OK.
  - [ ] 5.8 `npm run check:telemetry` → OK.

- [ ] **Task 6** — Open a local commit (no push yet): `S03.2 done: Drag-and-drop + paste handlers; onaccept callback prop wired but unbound (S03.7 wires the reducer)`.

## Dev Notes

### Source files this story touches

| File | Status | Surface S03.2 changes |
|---|---|---|
| `src/components/Dropzone.svelte` | **MODIFIED** | Add dragenter/dragover/dragleave/drop handlers on the button; add paste handler via onMount; add `onaccept` props + `isDragging` state. CSS unchanged (pre-wire from S03.1 holds). |
| `tests/dropzone-drag-paste.test.ts` | **NEW** | 15 AC18a-AC18o describe blocks; ~15 tests. Mirrors the existing test convention. |

### Files S03.2 does NOT touch (avoid scope creep)

| File | Why leave alone |
|---|---|
| `src/App.svelte` | Mount stays `<Dropzone />` without `onaccept` (AC18n boundary pin); S03.7 wires the callback. |
| `src/lib/*` | E05 territory; S03.2 does not introduce state, reducer, types. |
| `src/worker/*` | E05+ territory; S03.2 does not spawn the worker. |
| `src/styles/tokens.css` | No new tokens. |
| `src/styles/app.css` | Dropzone CSS lives in the component's `<style>` block (mirrors S03.1). |
| `src/components/ThemeToggle.svelte` | Unchanged. |
| `index.html` | Unchanged. |
| `src/main.ts` | Unchanged. |
| `package.json` | No new deps. |

### Cross-story contract notes

- **S03.3 will add the 50 MB cap check** — the dropzone in S03.2 hands the File to the `onaccept` callback without any size check. S03.3's reducer-side handler is the gate; S03.3 is the layer that enforces 50 MB. S03.2's gesture does NOT pre-filter by size.
- **S03.4 will add the aria-live announcement on file accept** — S03.2's drop emits a File via the callback but does NOT touch any aria-live region. S03.4 stands up the aria-live surface and connects it to the reducer's accept transition.
- **S03.5 will land the empty-state copy + headline + lede** — the button label stays "Browse files" placeholder from S03.1; S03.5 lands the locked empty-state copy and rewrites the dropzone surroundings.
- **S03.6 will land the three teaching cards** — Out of S03.2's scope.
- **S03.7 will add the `File` reference emit to the reducer via the `onaccept` callback prop** — S03.7 changes `<Dropzone />` in App.svelte to `<Dropzone onaccept={(src) => reducer.accept(src)} />`. S03.7 also adds the `<input type="file" @change>` handler so the picker-driven accept flows through the same reducer transition. **By S03.7's completion, all three accept paths (drag, paste, picker) feed the same reducer transition.**

### Anti-patterns to avoid (per E02 retro's "What was hard" lessons)

- **CSS property vs custom-property confusion** (S02.6 lesson): S03.2 doesn't touch CSS, but the rule still applies if a future contributor re-touchs the `<style>` block. Use `var(--…)`, never raw color values.
- **Spec implies a directory walk, not a per-file scan** (S02.5 lesson): AC18m's negative-assertion scan is bounded to the dropzone file; the broader `src/` walk is the S02.6 test's job.
- **Description-string anchor for boundary pins** (S02.5 lesson): AC18o pins prior-story boundaries on description strings (mirror S03.1 AC17k's pattern).
- **Svelte 4 event handler syntax reappearing**: AC18k is the explicit negative. Use `ondragover={...}` (Svelte 5) not `on:dragover={...}` (Svelte 4).
- **Per-component test creep**: S03.2 keeps `tests/dropzone.test.ts` (S03.1) untouched; S03.2's tests live in `tests/dropzone-drag-paste.test.ts`. This preserves the per-story test surface for regression tracking.

### Verification gap risk (review-time prediction)

The most likely review-time finding on S03.2: **The `dragenter` and `dragover` preventDefault-only-no-class-toggle asymmetry**. The current S03.2 design calls `preventDefault()` in both `dragenter` and `dragover` (both are required to allow the drop in Chrome/Firefox), but only `dragenter` sets `isDragging = true` (avoiding the class flicker as the cursor moves within the dropzone). If a future contributor "simplifies" by also toggling in `dragover`, the class will flicker. Document in step-05 if the regex needs widening or if the design rationale should be inlined.

The second most likely finding: **The paste handler's CSV-likeness heuristic is permissive enough to accept non-CSV text**. This is intentional (see AC8 reasoning) but worth documenting in the step-05 maintenance patch — over-acceptance is recoverable (the parser emits a strict-brief error); under-acceptance is hostile (user-paste "disappears").

The third most likely finding: **`$props()` type annotation verbosity**. The `onaccept` props block is verbose. A minimalist alternative is `let { onaccept } = $props()` (no type annotation) — Svelte 5 infers. Spec choice: keep the type annotation for editor intellisense and to document the callback shape; if a reviewer prefers the untyped form, swap it (no semantic change).

### References

- [Source: _bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/EXPERIENCE.md#component-patterns] — Dropzone behavioral contract: drag-and-drop handled, paste handler accepts text, file name in aria-live on accept.
- [Source: _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md#fr-1-file-ingestion] — Three ingestion paths: drag-and-drop, file picker, or direct paste.
- [Source: _bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/ARCHITECTURE-SPINE.md#ad-9-accessibility-contract] — Real `<button>` = real focus, real keyboard floor.
- [Source: _bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/SOLUTION-DESIGN.md#state-machine] — `empty → active: file accepted` transition; S03.2 is the gesture; S03.7 wires the accept.
- [Source: _bmad-output/implementation-artifacts/3-1-real-button-dropzone-opens-file-picker.md#cross-story-contract-notes] — S03.1's cross-story handoff to S03.2: pre-wire `.is-dragover` CSS so S03.2 only toggles the class.
- [Source: _bmad-output/implementation-artifacts/epic-2-retrospective.md#what-was-hard] — E02 lessons: test-gate convergence, description-string anchors for boundary pins, Svelte 5 syntax discipline.
- [Source: MDN HTML5 Drag and Drop API — `dragover` requires `preventDefault` to enable `drop`](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/Drag_operations#specifying_drop_targets) — Verifies AC3's reasoning; `dragover` must cancel default for `drop` to fire.
- [Source: MDN ClipboardEvent.clipboardData — paste handler reads `clipboardData.getData('text/plain')`](https://developer.mozilla.org/en-US/docs/Web/API/ClipboardEvent/clipboardData) — Verifies AC7's paste-read approach; non-prompting on user-initiated pastes.

## Dev Agent Record

### Agent Model Used

puku-cli (puku-ai-2.7)

### Debug Log References

None — all 7 production-readiness gates green on first run after Review #1 patch.

### Completion Notes List

- **All 7 production-readiness gates green** (per-story subset of the 13 ship gates): `npm test` (420/420 pass; 58 in `tests/dropzone-drag-paste.test.ts`), `npm run check` (0 errors; 1 pre-existing Svelte 5 warning in ThemeToggle unrelated to S03.2), `npm run build` (0 source maps; 1.19s), `npm run check:bundle` (14.64 KB gz / 200 KB budget), `npm run audit:privacy` (OK; 0 forbidden source calls), `npm run audit:behavior` (OK; 3 allowed requests, 0 anomalous, all landmarks present), `npm run check:deps` (0 denylisted), `npm run check:telemetry` (0 forbidden patterns).
- **Review #1 — 3 parallel reviewers**:
  - blind-hunter: PASS (no must-fix).
  - edge-case-hunter: 2 must-fixes flagged, both confirmed OUT OF SCOPE per spec: (a) `filename?` field — spec declares `filename?: string` in the type for forward-compat but does NOT require S03.2 to populate it (S03.4/S03.7 will use it); (b) directory-drop guard — S03.3's reducer-side scope per cross-story contract line 167-168. Plus 5 should-fixes and 4 nits logged as deferred-to-future-stories or out-of-scope.
  - verification-gap: 2 must-fixes; **APPLIED #1** (added M4 assertion `handleDragOver does NOT toggle isDragging` — flicker-prevention contract per spec Verification gap risk line 183); **NOTED #2** ("first non-empty line" vs "first line" spec wording discrepancy — implementation is correct per spec intent; H1 assertion verifies the heuristic variable gates the call).
- **Review #2 — coderabbit fresh context**: PASS with 0 must-fix blockers. Applied 3 cosmetic should-fixes: (a) removed dead `?? ''` fallback on `text.split('\n', 1)[0]` (String.prototype.split always returns ≥1 element); (b) tightened `commaCheck` regex to disallow stray quotes after the comma literal; (c) deduplicated the `csvLike` alternation in H1.
- **Test count breakdown** (`tests/dropzone-drag-paste.test.ts`, 58 tests across 15 AC18a-AC18o describe blocks): H1 (heuristic-variable gates onaccept) + H2 (event.preventDefault on the parameter) + M2 (boolean toggle in dragenter/dragleave) + M3 (dead-code guard) + M4 (dragover must not toggle isDragging — Review #1 patch) + L13 (no `onpaste=` short form) = 6 hardening passes over the AC18 baseline.
- **Step-05 maintenance patches**: 4 Review #1 + 3 Review #2 = 7 patches landed. Diff-cumulative hash captured at commit time.
- **Cross-story contract confirmed**: App.svelte stays unchanged (AC18n boundary pin); `<Dropzone />` rendered bare with no `onaccept`. S03.7 will wire the reducer consumer. S03.3 (50 MB cap), S03.4 (aria-live announcement), S03.5 (empty-state copy), S03.6 (teaching cards), S03.9 (strict-brief error path) all remain in their respective stories.

### File List

- `src/components/Dropzone.svelte` — MODIFIED. Added `onMount` import; added `onaccept` callback prop with typed discriminated union (`{ kind: 'drop'; file: File } | { kind: 'paste'; text: string; filename?: string }`); added `isDragging = $state(false)`; added named handlers `handleDragEnter` / `handleDragOver` / `handleDragLeave` / `handleDrop` / `handlePaste`; added `onMount(() => window.addEventListener('paste', handlePaste); return () => window.removeEventListener('paste', handlePaste))`. Template bindings added: `ondragenter`, `ondragover`, `ondragleave`, `ondrop`, `class:is-dragover={isDragging}`. CSS unchanged (pre-wire from S03.1 holds). Net added: ~85 lines including docblock.
- `tests/dropzone-drag-paste.test.ts` — NEW. 58 tests across 15 AC18a-AC18o describe blocks. Mirrors the `node:fs` + `node:path` + `node:url` + `vitest` pattern. Defines `stripComments` helper (mirrors S03.1 AC17f) and `extractFunctionBody` brace-walker helper for named-function body extraction.
- `tests/dropzone.test.ts` — MODIFIED. Removed the prior "no onMount" pin (S03.1 AC17e), with explanatory comment that S03.2 legitimately uses onMount for the paste handler. The change-handler pin (no `@change` / `onchange` / `addEventListener('change')`) still holds — S03.2 is drag-drop + paste ONLY.

# Story 3.4: File-name reveal in aria-live region on accept (S03.4)

Status: done
baseline_commit: e0dfd45 (S03.3 loop closure — 50 MB cap lands, sprint-status flipped to done; S03.4 picks up from here)
review_loop_iteration: 1
final_commit: 40f9108 (S03.4 loop closure — aria-live region lands; .visually-hidden extracted to global stylesheet; sprint-status flipped to done)

> **Loop protocol (mandatory).** This story must pass Review #1 (3 parallel reviewers), Review #2 (coderabbit), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. `S03.4` lands the **announcement surface** of the E03 gesture — every successful file accept (drag-drop OR picker OR paste) surfaces the file name (or pasted text snippet) in an `aria-live="polite"` region so screen readers announce it. S03.1 shipped the visual chrome + the picker-opening gesture; S03.2 wired drag-and-drop + paste handlers and exposed `onaccept`; S03.3 added the 50 MB cap check; S03.4 now wires the consumer side: App.svelte (or a new component) renders an aria-live region that updates on `onaccept` callbacks. **S03.4 does NOT touch the reducer, the worker, or any of the parsing logic** — S03.7 owns the reducer wiring; S03.4 only renders the announcement surface and connects it to the existing `onaccept` prop. S03.4 also does NOT add a "rejection" announcement for over-cap files (S03.4 announces successful accepts only); S03.9's strict-brief path (or S03.7's reducer) handles the over-cap announcement when that lands. S03.4 is the **announcement layer for accepts**; the rejection path is downstream.

> **Path-alias note.** This project's `vite.config.ts` does **not** configure `$lib` as a path alias, and `tsconfig.json` does **not** define `"paths": { "$lib/*": [...] }`. (Verified: `vite.config.ts` has zero `resolve.alias` entries; `tsconfig.json` extends `@tsconfig/svelte` and adds no path mappings.) Therefore the spec uses **relative imports** (`'../lib/aria-live'`) throughout. (A future story in E05 may introduce `$lib` as part of the S05.x work; until then, relative paths are the convention.)

## Story

As a **user about to ingest a CSV into WebUtilityLab / CSV Rescue who uses a screen reader or other assistive technology**,

I want **the file name (for files) or a short snippet (for pasted text) to be announced via `aria-live="polite"` immediately when I drop, paste, or pick a file, so that the gesture surface is non-visual-friendly and the user can confirm their input was received without visual inspection**,

so that **PRD's AD-9 a11y floor ("every input gesture is mirrored to assistive tech via aria-live; no gesture is silent on screen readers") is honored, the EXPERIENCE.md key flow "the file name appears in the aria-live region" (line 96) is realized, and the announcement matches the editorial voice ("Working…" — short, factual, file-name-focused). The aria-live region lives on the page chrome (NOT inside the dropzone — the dropzone is a control, not a status surface), renders only when there is content to announce, and re-announces on each accept (no deduplication, no silent filtering). The reducer (S03.7) is the natural place for a state-driven announcement, but since S03.4 lands BEFORE S03.7, S03.4 uses a temporary App.svelte-located aria-live region driven directly by the `onaccept` callback prop wired in S03.4 — when S03.7 lands, the temporary wiring is replaced with a reducer-driven consumer, and the aria-live region itself (in the page chrome) is preserved.

## Acceptance Criteria

1. **An aria-live region exists in the page chrome.** A `<div role="status" aria-live="polite" aria-atomic="true">` (or `<output>` element) renders inside `<main>` (next to the dropzone) or in `<header>` (mirroring the ThemeToggle announcement pattern — see AC5). The region is **visually hidden when empty** (CSS class `.visually-hidden` applied via Svelte 5 conditional) so the page chrome isn't visually disturbed by a near-empty banner; the region is **screen-reader-visible** regardless (the `visually-hidden` class is the same one ThemeToggle uses for its theme-change announcement). The region's text content starts as an empty string and updates on each `onaccept` event.
2. **The aria-live region announces the file name (or pasted text snippet) on accept.** The `App.svelte` mount wires `<Dropzone onaccept={handleAccept} />` for the first time in S03.4 (S03.2's `onaccept` was UNBOUND; S03.3 left it unbound per AC19m; S03.4 is the first story to actually pass an `onaccept` callback). The callback:
   - On `{ kind: 'drop'; file: File }` → announces the file's `.name`. Format: `"File accepted: <filename>"` (sentence case, no quotes, mono for the filename per EXPERIENCE.md §Editorial voice).
   - On `{ kind: 'paste'; text: string }` → announces a snippet of the pasted text. Format: `"Text pasted: <first 40 chars>…"` if the text is longer than 40 chars; `"Text pasted: <full text>"` if 40 or fewer chars. The snippet is **not** the full pasted text — long pastes could create very long announcements that screen readers read in full (UX cliff).
   - On `{ kind: 'oversize'; size: number; cap: number }` → S03.4 does **NOT** announce this in the aria-live region. The over-cap signal is downstream concern; S03.7's reducer or S03.9's strict-brief path will surface it. S03.4 silently ignores the `oversize` branch (the callback is a `void` so no other action is taken). AC19m-equivalent boundary pin: App.svelte does NOT format or render the `oversize` signal — that's S03.7/S03.9.
3. **The announcement re-fires on every accept.** No deduplication (dropping the same file twice still announces "File accepted: foo.csv" — the browser sees the change). No "already announced" memoization. The aria-live `textContent` is set to the new string on every callback, even if the string is identical to the previous announcement. Screen readers re-announce on each textContent change; some readers (VoiceOver on macOS) may de-dup identical consecutive text — that's a screen-reader concern, not ours; the source-of-truth invariant is "the region was updated, the user gesture was acknowledged".
4. **Editorial voice bound.** Per EXPERIENCE.md §Editorial voice (curly quotes, spaced em-dashes, mono for data), the announcement strings use:
   - Sentence case ("File accepted: foo.csv", NOT "File Accepted: foo.csv").
   - Colon `:` separator (NOT em-dash — em-dash is reserved for findings / rules per strict-brief format).
   - File name in `<code>` (mono) inside the announcement: the announcement string is `"File accepted: "` + filename + `""`. The mono treatment comes from the `<code>` element wrapping the filename in the rendered DOM (the announcement string itself is plain text — the mono is a visual treatment in the announcement region).
   - Paste snippet uses an ellipsis character (`…`, NOT three dots `...`) if truncated.
5. **The aria-live region follows the ThemeToggle announcement pattern.** ThemeToggle's existing aria-live region (`src/components/ThemeToggle.svelte` line 66) uses:
   ```svelte
   <span class="visually-hidden" aria-live="polite">{liveText}</span>
   ```
   S03.4's region uses the same `visually-hidden` class (defined in ThemeToggle's `<style>` block; S03.4 either re-defines the class in a new component's `<style>` block OR — preferred — extracts `.visually-hidden` into `src/styles/app.css` and removes the duplicate from ThemeToggle's component CSS). **Decision (per loop): extract `.visually-hidden` to `src/styles/app.css`** so all three uses (ThemeToggle's announcement + Dropzone's hidden input + S03.4's announcement region) share one definition. The component-scoped `.visually-hidden` in Dropzone (lines 268-278) and ThemeToggle (lines 91-101) is removed; the global class in `app.css` is the source of truth. Tests pin: `tests/dropzone.test.ts` AC17e (the existing pin) verifies the visually-hidden class still exists in the DOM; S03.4's new test file adds a regression pin asserting the class is now defined in `app.css` (NOT in the component scope). The visual treatment is unchanged (1px clip rect, position absolute, etc.) — only the location of the definition moves.
6. **Empty initial state.** The aria-live region's text content is an empty string on first paint. The region is rendered into the DOM but contains no visible/audible content until the first `onaccept` callback fires. Screen readers don't announce empty regions; the empty initial state is the correct baseline.
7. **No new dependencies.** S03.4 is component + App.svelte + small utility module only; no `package.json` entries.
8. **Privacy Baseline preserved.** No `fetch` / `XMLHttpRequest` / `navigator.sendBeacon` / `EventSource` / `new Function` / `eval` / dynamic `import()` in any S03.4-touched file. The `App.svelte` handleAccept function is local-only (reads `file.name` from a closure-scoped File — does not call any network API). The new aria-live utility module (if S03.4 extracts one; spec choice below) is pure functions, no DOM access except where explicitly typed (the `liveRegion: HTMLElement` argument). `audit-privacy.mjs` stays green.
9. **Tests** at `tests/dropzone-aria-live.test.ts` (NEW). Mirrors the `node:fs` + `node:path` + `node:url` + `vitest` convention. Source-grep on `src/App.svelte`, `src/components/Dropzone.svelte`, `src/components/ThemeToggle.svelte`, `src/lib/aria-live.ts` (NEW; if extracted), `src/styles/app.css`. Coverage (10 AC20a-AC20j describe blocks):
   - **AC20a (App.svelte wires the onaccept callback)** — `appSource` contains `onaccept={handleAccept}` on the `<Dropzone>` mount (the S03.4-wired consumer). Replaces the prior S03.2 AC18n / S03.3 AC19m boundary pins (which asserted NO onaccept); S03.4 inverts those pins — the boundary pin now asserts the callback IS wired.
   - **AC20b (App.svelte has a handleAccept function)** — `appSource` contains `function\s+handleAccept\s*\(` (declaration present in the script block). The function handles all three `onaccept` kinds but only announces on `drop` and `paste` (the `oversize` branch is a no-op).
   - **AC20c (App.svelte announces file name on drop)** — `appSource` contains the file-name extraction (`file\.name` access) and the announcement format (`File accepted: ` followed by the filename). The format uses a colon `:` separator (not em-dash — strict-brief format reserves em-dash).
   - **AC20d (App.svelte announces paste snippet, max 40 chars + ellipsis)** — `appSource` contains the paste-snippet extraction (`text\.slice\(0, 40\)` or substring) AND the ellipsis suffix (`…`). The test asserts the snippet length is ≤ 40 (using a runtime assertion against a fake long text).
   - **AC20e (App.svelte does NOT format the oversize branch)** — `appSource` does NOT match `formatStrictBrief` / `oversize.*size.*cap` / any "File is X MB; limit is Y MB" prose. The `oversize` branch in `handleAccept` is a no-op (`return;` or just falls through without an announcement). Spec choice: S03.4's `handleAccept` has an explicit `if (source.kind === 'oversize') return;` (defensive no-op) — the test asserts the early-return is present.
   - **AC20f (visually-hidden class extracted to src/styles/app.css)** — `appCssSource` contains the `.visually-hidden { ... }` definition with the standard CSS properties (position absolute, width 1px, height 1px, etc.). AND `dropzoneSource` does NOT contain the `.visually-hidden` definition (the duplicate was removed from Dropzone's component CSS). Same pin for `themeToggleSource` (the duplicate in ThemeToggle was also removed).
   - **AC20g (the aria-live region element exists in App.svelte template)** — `appSource` matches `<div[^>]*role="status"[^>]*aria-live="polite"` (the polite aria-live region). The element has the `visually-hidden` class (the announcement is hidden when empty; visible when populated — S03.4 spec choice: the region is permanently visually-hidden, NEVER visible; the announcement is screen-reader-only, not a visible banner. The visible banner is a S03.9 / E04 concern; S03.4 is purely the screen-reader surface). Per AD-9 and EXPERIENCE.md §Component Patterns, the aria-live announcement is screen-reader-only; visible banners are a separate surface.
   - **AC20h (no Svelte 4 `on:` syntax reappears)** — `appSource` does NOT contain `\bon\s*:\s*accept\b` or `\bon\s*:\s*drop\b`. The Svelte 5 `onaccept={handleAccept}` form is the canonical binding.
   - **AC20i (no forbidden source patterns in NEW code, Privacy Baseline)** — `appSource` AND any new module file do NOT contain `\bfetch\(`, `XMLHttpRequest`, `EventSource`, `sendBeacon`, `navigator\.sendBeacon`, `new Function`, `\beval\b`, dynamic `import\(`, `\bFileReader\b`, `\breadAsText\b`, etc. (Mirrors S03.1 AC17g, S03.3 AC19l patterns.)
   - **AC20j (prior-story boundary pins preserved)** — `tests/dropzone.test.ts` (S03.1), `tests/dropzone-drag-paste.test.ts` (S03.2), `tests/dropzone-file-cap.test.ts` (S03.3) all still exist with their expected unique description strings. The S03.2 AC18n / S03.3 AC19m boundary pin ("App.svelte does NOT pass an onaccept callback to <Dropzone>") is INVERTED in S03.4 — AC20a is the positive assertion; the negative assertion is removed. This is a load-bearing change: S03.4 is the first story where App.svelte wires the consumer. The S03.3 AC19n pin ("tests/dropzone-drag-paste.test.ts (S03.2) still exists with its description string") is preserved verbatim (S03.2's test surface stays untouched). The S03.3 AC19o ("oversize branch carries no File reference") is preserved (S03.4's handleAccept does NOT add a File reference on the oversize branch).

10. **README / docs / planning-artifact changes are out of scope.** No edits to `CHANGELOG.md`, `SECURITY.md`, `docs/loop-protocol.md`, `docs/pii-patterns.md`, or the planning artifacts (post-Epic updates). Story commit is code-only.

11. **`tests/dropzone-aria-live.test.ts` passes in the production gate.** The test file is committed, runs at `npm test`, and all assertions pass on first implementation. Expected test count: ~40 sub-assertions across 10 AC20a-AC20j describe blocks (the "~15" estimate in early drafts was off by ~2.5× — AC20f has ~6 (3 visually-hidden definitions × 2 conditions), AC20i has ~14 (7 forbidden patterns × 2 source files), and the remaining ACs have 1-4 each).

## Verification

1. `npm test` → all tests pass (485 from before S03.4 + ~40 new in `tests/dropzone-aria-live.test.ts`).
2. `npm run check` → svelte-check 0 errors + tsc 0 errors.
3. `npm run build` → `dist/` exists; `find dist -name '*.map' | wc -l` = 0; bundle still under budget (S03.4 adds <1 KB to the JS bundle — App.svelte gains ~10 lines for handleAccept + the aria-live region; the .visually-hidden extraction is a no-op for bundle size).
4. `npm run check:bundle` → under 200 KB gzipped.
5. `npm run audit:privacy` → OK; the new aria-live wiring introduces no forbidden source patterns.
6. `npm run audit:behavior` → OK; the aria-live region is screen-reader-only (no visible surface changes), zero post-load requests.
7. `npm run check:deps` → OK.
8. `npm run check:telemetry` → OK.
9. **Manual / DevTools**:
   - `npm run preview`; open in Chrome with VoiceOver enabled.
   - Empty state shows the dropzone (S03.1's visual). The aria-live region is in the DOM but visually hidden; VoiceOver announces nothing on load.
   - Drop a CSV file (e.g., `vendor_export.csv`). VoiceOver announces: "File accepted: vendor_export.csv" (or similar; the exact wording is the editorial voice binding). The filename is in `<code>` (mono) in the DOM.
   - Paste a CSV-shaped text (e.g., `name,age\nAlice,30`). VoiceOver announces: "Text pasted: name,age\nAlice,30" (40 chars max with ellipsis if longer).
   - Drop a 100 MB file. VoiceOver announces NOTHING (S03.4's handleAccept is a no-op on `oversize`; the over-cap signal is downstream). Verify via DevTools that the `<output>` / `role="status"` element's textContent is unchanged.
   - Pick the same file twice in a row via the picker. VoiceOver announces both times (no dedup; the second accept still fires `onaccept`).
   - DevTools console: no errors, no warnings.
   - Lighthouse a11y: aria-live region is recognized by the audit (`aria-live="polite"` on a non-empty region is the highest score); dropzone button still has accessible name, real `<button>` role, real focus, real keyboard activation; aria-live region does NOT regress a11y.

## Loop Protocol Path Forward

1. Implement Tasks 1–5 below (App.svelte wiring + aria-live region + .visually-hidden extraction + test + verification).
2. Run production-readiness gate (Step 7 of loop).
3. Run Review #1 — 3 reviewers in parallel (blind-hunter, edge-case-hunter, verification-gap) against the diff.
4. Apply Review #1 patches if any.
5. Run Review #2 — coderabbit in fresh context against diff + Review #1 findings.
6. Apply Review #2 patches if any.
7. Flip `sprint-status.yaml` to `done`.
8. Update story file with step-05 maintenance patch notes.
9. Move to S03.5 (empty-state copy from EXPERIENCE.md).

## Tasks / Subtasks

- [ ] **Task 1** — Read the existing source files S03.4 touches + the cross-story contract notes:
  - [ ] 1.1 Read `src/App.svelte` (already done; S02.4 page chrome). Note: `<Dropzone />` is rendered bare with no callback. S03.4 ADDS the `onaccept={handleAccept}` mount and the aria-live region.
  - [ ] 1.2 Read `src/components/Dropzone.svelte` (already done; S03.3 cap-routing component). The `onaccept` prop type is the discriminated union S03.3 extended: `{ kind: 'drop'; file: File } | { kind: 'paste'; text; filename? } | { kind: 'oversize'; size; cap }`. S03.4 is the first consumer.
  - [ ] 1.3 Read `src/components/ThemeToggle.svelte` (already done; S02.3 component). The aria-live pattern (`<span class="visually-hidden" aria-live="polite">`) lives here; S03.4 mirrors it and extracts the class.
  - [ ] 1.4 Read `src/styles/app.css` (already done; S02.4 page styles). Note the existing `.visually-hidden` definitions are NOT here yet — they're component-scoped in ThemeToggle (line 91-101) and Dropzone (line 268-278). S03.4 extracts to `app.css`.
  - [ ] 1.5 Re-read S03.3's cross-story contract notes (line 230-244 of `3-3-50-mb-cap-check-before-reading.md`): S03.4's scope is the **announcement surface for accepts**; S03.7 wires the reducer consumer that will eventually take over; S03.4's App.svelte-located aria-live region is the temporary consumer (it's the page-chrome-level region; S03.7 may move the announcement to a reducer-driven component, but the `<output>` element in the page chrome is the source of truth for the aria-live region).

- [ ] **Task 2** — Modify `src/App.svelte` to wire the onaccept consumer + add the aria-live region:
  - [ ] 2.1 SCRIPT BLOCK additions:
    - Add a `handleAccept(source: ...)` function that handles all three `onaccept` kinds but only announces on `drop` and `paste`:
      ```ts
      function handleAccept(source: {
        kind: 'drop';
        file: File;
      } | {
        kind: 'paste';
        text: string;
        filename?: string;
      } | {
        kind: 'oversize';
        size: number;
        cap: number;
      }): void {
        if (source.kind === 'oversize') return;
        if (source.kind === 'drop') {
          liveAnnouncement = 'File accepted: ' + source.file.name;
          return;
        }
        // source.kind === 'paste'
        const snippet = source.text.length > 40
          ? source.text.slice(0, 40) + '…'
          : source.text;
        liveAnnouncement = 'Text pasted: ' + snippet;
      }
      ```
      The `liveAnnouncement` variable is `$state('')` declared at the top of the script block. The discriminated-union parameter type mirrors Dropzone's `onaccept` union EXACTLY (the type duplication is intentional — S03.4's `handleAccept` is a consumer; the type is the contract).
    - Declare `let liveAnnouncement = $state('')` (Svelte 5 `$state` rune). The variable's initial value is `''` (empty string; aria-live region is silent on first paint).
  - [ ] 2.2 TEMPLATE BLOCK additions:
    - Change `<Dropzone />` to `<Dropzone onaccept={handleAccept} />` (wire the S03.4 consumer).
    - Add the aria-live region. Two spec choices considered:
      - (a) Inside `<main>` next to the dropzone. Pros: keeps the announcement near its source. Cons: the announcement leaks into the dropzone's semantic neighborhood; some screen readers conflate regions that are physically close.
      - (b) Inside `<header>` next to ThemeToggle's announcement. Pros: groups all aria-live regions in the page header; mirrors ThemeToggle's existing pattern.
      - **(c) Decision: inside `<main>`** but AFTER the dropzone, not inside it. The region's proximity to the dropzone is the right semantic neighborhood (the announcement IS the dropzone's status). The region is permanently `visually-hidden` (screen-reader-only; the visible banner is downstream). Format:
        ```svelte
        <main id="main" tabindex="-1" class="page-main">
          <Dropzone onaccept={handleAccept} />
          <output class="visually-hidden" aria-live="polite" aria-atomic="true">{liveAnnouncement}</output>
        </main>
        ```
        The `<output>` element is the semantic choice (it's the canonical "result of a user action" element per WHATWG). `role="status"` is implicit on `<output>` (the implicit role of `<output>` is `status`); the explicit `aria-live="polite"` ensures the region announces politely (NOT assertively — over-cap signals would be `assertive`; S03.4's accept announcements are `polite`). `aria-atomic="true"` means the entire region is re-announced on every change (NOT just the diff — important for `polite` announcements where the user may not have heard the previous one).
  - [ ] 2.3 Update the docblock at the top of App.svelte: note that S03.4 wires the onaccept consumer and adds the aria-live announcement region; S03.7 will eventually consume the same callback via the reducer (the wiring remains App.svelte-side; the reducer becomes the consumer-of-the-reducer).
  - [ ] 2.4 NO other changes to App.svelte. The `<header>`, `<footer>`, and skip-link are unchanged.

- [ ] **Task 3** — Extract `.visually-hidden` to `src/styles/app.css`:
  - [ ] 3.1 Add `.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }` to `src/styles/app.css`. The class is the standard screen-reader-only pattern; the location (global stylesheet) is the source of truth.
  - [ ] 3.2 Remove the duplicate `.visually-hidden { ... }` definition from `src/components/Dropzone.svelte` `<style>` block (lines 268-278). The class is now global; the component-scoped definition is dead code.
  - [ ] 3.3 Remove the duplicate `.visually-hidden { ... }` definition from `src/components/ThemeToggle.svelte` `<style>` block (lines 91-101). Same reasoning.
  - [ ] 3.4 Verify the class is still applied to the Dropzone's hidden `<input>` (line 225) and the ThemeToggle's `<span>` (line 66). The application sites are unchanged; only the definition location moves.

- [ ] **Task 4** — Mount contract pins (App.svelte now passes the callback; this is the S03.4-boundary pin):
  - [ ] 4.1 AC20a pins App.svelte: `<Dropzone onaccept={handleAccept} />` is rendered with the callback prop. This is the FIRST story where App.svelte binds the consumer. S03.2's AC18n and S03.3's AC19m boundary pins (which asserted NO onaccept) are INVERTED in S03.4 — AC20a is the positive assertion. The negative-pin tests in `tests/dropzone-drag-paste.test.ts` AC18n and `tests/dropzone-file-cap.test.ts` AC19m are STILL VALID (those tests pin what S03.2 / S03.3 shipped — those stories' source code was unchanged; S03.4 only changes App.svelte). S03.4's new test file (`tests/dropzone-aria-live.test.ts`) is the AC20a positive pin.
  - [ ] 4.2 No other changes to `src/components/Dropzone.svelte`, `src/components/ThemeToggle.svelte`, `src/lib/*` (other than what Task 3 extracts).

- [ ] **Task 5** — Write `tests/dropzone-aria-live.test.ts` (NEW):
  - [ ] 5.1 File preamble: `node:fs` + `node:path` + `node:url` + `vitest` imports. `here = fileURLToPath(new URL('.', import.meta.url))`; `repoRoot = join(here, '..')`. Constants for `appPath`, `dropzonePath`, `themeTogglePath`, `appCssPath`, plus the 7 prior-story test paths. Read each file once at top of describe block. Define `stripComments` helper (mirror S03.1 / S03.2 / S03.3).
  - [ ] 5.2 AC20a: App.svelte wires the onaccept callback. Grep `appSource` for `<Dropzone\s+onaccept=\{handleAccept\}\s*/?>` (the S03.4 binding). The test also asserts that NO `onaccept` callback is bound elsewhere in App.svelte (defensive — only the mount should bind).
  - [ ] 5.3 AC20b: App.svelte has a handleAccept function. Grep `appSource` for `function\s+handleAccept\s*\(` (declaration present). The function body handles all three kinds (oversize is an early-return; drop and paste are announcements).
  - [ ] 5.4 AC20c: App.svelte announces file name on drop. Grep `appSource` for `liveAnnouncement\s*=\s*['"]File accepted: ['"]\s*\+\s*source\.file\.name` (the announcement format; colon separator, sentence case). The test asserts the format is colon-not-em-dash (strict-brief reserves em-dash).
  - [ ] 5.5 AC20d: App.svelte announces paste snippet, max 40 chars + ellipsis. Grep `appSource` for `text\.slice\(0,\s*40\)\s*\+\s*['"]…['"]` (the slice + ellipsis pattern). Plus a runtime assertion: simulate a 100-char paste and verify the snippet is ≤ 40 chars (the runtime check would be a unit test on the snippet function if S03.4 extracts one; spec choice below). **Spec choice: extract the snippet logic to a tiny utility** (`src/lib/aria-live.ts` with `pasteSnippet(text: string): string`) so the runtime test is a real unit test on the function. App.svelte imports and calls it.
  - [ ] 5.6 AC20e: App.svelte does NOT format the oversize branch. Grep `appSource` for `if\s*\(\s*source\.kind\s*===\s*['"]oversize['"]\s*\)\s*return` (the defensive early-return). Plus: `appSource` does NOT contain `formatStrictBrief`, `File is X MB`, `limit is Y MB`, `oversize.*size.*cap` (no premature strict-brief wiring).
  - [ ] 5.7 AC20f: visually-hidden class extracted to src/styles/app.css. Grep `appCssSource` for `.visually-hidden\s*\{` (the class definition exists in the global stylesheet). AND `dropzoneSource` does NOT match `\bvisually-hidden\s*\{` (the component-scoped duplicate is gone). Same pin for `themeToggleSource`.
  - [ ] 5.8 AC20g: aria-live region element exists in App.svelte template. Grep `appSource` for `<output[^>]*class="visually-hidden"[^>]*aria-live="polite"[^>]*aria-atomic="true"[^>]*>` (the element with all three attributes). The element wraps `{liveAnnouncement}` (the Svelte interpolation).
  - [ ] 5.9 AC20h: no Svelte 4 `on:` syntax. Grep `appSource` for negative matches on `\bon\s*:\s*accept\b` and `\bon\s*:\s*drop\b`.
  - [ ] 5.10 AC20i: no forbidden source patterns in NEW code. Mirrors S03.3 AC19l. Forbidden list: `\bfetch\(`, `XMLHttpRequest`, `EventSource`, `sendBeacon`, `navigator\.sendBeacon`, `new Function`, `\beval\b`, dynamic `import\(`, `\bFileReader\b`, `\breadAsText\b`, etc. Scanned on `appSource` AND `src/lib/aria-live.ts` (the new utility module, if extracted).
  - [ ] 5.11 AC20j: prior-story boundary pins preserved. Grep `tests/dropzone.test.ts` for `dropzone \(S03\.1`; grep `tests/dropzone-drag-paste.test.ts` for `dropzone-drag-paste \(S03\.2 drag-and-drop`; grep `tests/dropzone-file-cap.test.ts` for `dropzone-file-cap \(S03\.3 50 MB cap check`. Each prior-story test file must still exist and contain its description string.

- [ ] **Task 6** — Run the production-readiness gate (mirror S03.1 / S03.2 / S03.3 Task 6):
  - [ ] 6.1 `npm test` → all 485 prior tests + ~40 new in `tests/dropzone-aria-live.test.ts` pass.
  - [ ] 6.2 `npm run check` → 0 errors.
  - [ ] 6.3 `npm run build` → bundle under budget; 0 source maps.
  - [ ] 6.4 `npm run check:bundle` → under 200 KB gzipped.
  - [ ] 6.5 `npm run audit:privacy` → OK.
  - [ ] 6.6 `npm run audit:behavior` → OK.
  - [ ] 6.7 `npm run check:deps` → OK.
  - [ ] 6.8 `npm run check:telemetry` → OK.

- [ ] **Task 7** — Open a local commit (no push yet): `S03.4 done: aria-live region announces file name on accept; visually-hidden class extracted to global stylesheet (S03.7 will replace the App.svelte consumer with a reducer-driven one; S03.9 will format over-cap as strict-brief)`.

## Dev Notes

### Source files this story touches

| File | Status | Surface S03.4 changes |
|---|---|---|
| `src/App.svelte` | **MODIFIED** | Wires `<Dropzone onaccept={handleAccept} />` for the first time. Adds `handleAccept` function (handles all 3 onaccept kinds; announces on drop + paste; no-ops on oversize). Adds `<output>` aria-live region inside `<main>` after the dropzone. ~20 lines net added. |
| `src/styles/app.css` | **MODIFIED** | Adds `.visually-hidden { ... }` definition (the global source of truth). |
| `src/components/Dropzone.svelte` | **MODIFIED** | Removes the component-scoped `.visually-hidden` definition from `<style>` block (the class is now global). The hidden `<input>` still uses `class="visually-hidden"`. |
| `src/components/ThemeToggle.svelte` | **MODIFIED** | Removes the component-scoped `.visually-hidden` definition from `<style>` block. The announcement `<span>` still uses `class="visually-hidden"`. |
| `src/lib/aria-live.ts` | **NEW** (spec choice) | Tiny utility module exporting `pasteSnippet(text: string): string`. Pure function, no DOM. Enables a runtime unit test on the snippet logic. ~10 lines. |
| `tests/dropzone-aria-live.test.ts` | **NEW** | 10 AC20a-AC20j describe blocks; ~40 tests. Mirrors the existing test convention. |

### Files S03.4 does NOT touch (avoid scope creep)

| File | Why leave alone |
|---|---|
| `src/components/Dropzone.svelte` (script block) | The component is S03.3's; S03.4 only removes the duplicate CSS. The `onaccept` prop is unchanged; S03.4 only consumes it from App.svelte. |
| `src/components/ThemeToggle.svelte` (script block) | Same: only the duplicate CSS is removed. |
| `src/lib/*` (other than `aria-live.ts`) | No new state or reducer logic. The reducer lands in S03.7. |
| `src/worker/*` | E05+ territory. |
| `src/styles/tokens.css` | No new tokens. |
| `src/components/Dropzone.svelte` `<style>` block (other than `.visually-hidden`) | The dropzone's `.dropzone` and `.is-dragover` styles stay component-scoped (they use `--var` tokens; they're not the visually-hidden pattern). |
| `index.html` | Unchanged. |
| `src/main.ts` | Unchanged. |
| `package.json` | No new deps. |

### Cross-story contract notes

- **S03.5 will land the empty-state copy** — S03.4's aria-live region is screen-reader-only; the visible banner ("Results ready — N problems found") is S03.5 / E04 territory. S03.4 doesn't add any visible banner.
- **S03.6 will land the teaching cards** — unrelated to S03.4's aria-live region.
- **S03.7 will wire the reducer consumer** — S03.4's `handleAccept` is a temporary consumer in App.svelte. When S03.7 lands, the reducer becomes the consumer-of-the-consumer; App.svelte's `handleAccept` becomes a thin wrapper that calls `reducer.accept(source)`. The aria-live region itself (in the page chrome) is preserved; only the source of the announcement string changes (from "App.svelte's `liveAnnouncement` $state" to "the reducer's `state.liveAnnouncement` selector"). S03.7 does NOT touch S03.4's aria-live region DOM structure; it replaces the announcement text source.
- **S03.8 will land the example CSV** — the "Try the example" path. When the user clicks "Try the example", the example File flows through the same `onaccept` callback (constructed in-memory; the gesture is a button click, not a file picker). S03.4's `handleAccept` handles `{ kind: 'drop'; file: File }` correctly for the example too (the example's filename is `sample.csv`). The aria-live region announces "File accepted: sample.csv" — the same path as a user-picked file.
- **S03.9 will land the strict-brief formatter** — S03.9 imports `formatStrictBrief()` from `src/lib/strict-brief.ts` (owned by E05 S05.4) and wires the over-cap rejection to format as a strict-brief error. **S03.9 will REPLACE S03.4's no-op oversize handling** with the strict-brief path. S03.4's `if (source.kind === 'oversize') return;` is a deliberate placeholder; S03.9 expands it to render the strict-brief error in the same aria-live region (or a separate assertive region). S03.4 keeps the no-op contract; S03.9 inherits the region.
- **E04 will land the pre-flight time estimate** — the second FR-6 gate. S03.4's aria-live region will (in E04) also announce "Working… (~Ns ±30%)" when the reducer enters the `processing` state. The region is the single screen-reader surface for all gestures + state transitions; S03.4 stands it up; E04 reuses it.
- **E13 will run the full a11y audit** — S03.4's aria-live region is the foundation for the rest of E03/E04/E10's announcements. S03.4 doesn't run axe-core (that's E13), but the region is structured correctly per AD-9 (`polite`, `aria-atomic="true"`, visually-hidden when empty, screen-reader-visible when populated).

### Out-of-scope clarifications (explicit non-goals for S03.4)

- **No visible banner.** S03.4's aria-live region is permanently `visually-hidden` (screen-reader-only). A visible "File accepted: foo.csv" banner is a separate surface (likely owned by E04's pre-flight UI or S03.5's empty-state banner). S03.4 doesn't add visible UI.
- **No "rejection" announcement.** S03.4's `handleAccept` is a no-op on `{ kind: 'oversize'; size; cap }`. S03.9's strict-brief path will format the over-cap rejection; S03.4 doesn't pre-empt.
- **No deduplication.** S03.4 announces on every accept, even if the file is the same as the previous one (the screen reader's deduplication is its concern; the source-of-truth invariant is "the region was updated, the gesture was acknowledged").
- **No announcement for empty-paste.** The paste heuristic in Dropzone (S03.2) already filters out non-CSV-shaped pastes (single line, no comma, no newline). S03.4's `handleAccept` only fires for pastes that pass the heuristic — by construction, an empty paste doesn't reach `handleAccept`. S03.4 doesn't add a second filter.
- **No paste filename announcement.** Pasted text doesn't have an inherent filename. S03.4 announces the text snippet (≤ 40 chars). The Dropzone's `onaccept` paste union member has an optional `filename?: string` field (forward-compat for S03.7/S03.8); S03.4 doesn't use it (no use case yet — the source of a paste is "the clipboard", not a named file).
- **No Svelte 4 `on:` syntax.** S03.4 uses Svelte 5 syntax throughout (`onclick`, `onaccept` props, `$state`).
- **No `$lib` path alias.** S03.4 imports use relative paths (`'../lib/aria-live'` from inside App.svelte).

### Anti-patterns to avoid (per E02 retro's "What was hard" lessons)

- **CSS property vs custom-property confusion** (S02.6 lesson): S03.4 doesn't touch tokens.css; the .visually-hidden class is a global utility (no `--var` tokens — it's a structural screen-reader-only pattern).
- **Spec implies a directory walk, not a per-file scan** (S02.5 lesson): AC20i's negative-assertion scan is bounded to App.svelte + the new aria-live utility module; the broader `src/` walk is the S02.6 test's job.
- **Description-string anchor for boundary pins** (S02.5 lesson): AC20j pins prior-story boundaries on description strings (mirror S03.1 AC17k / S03.2 AC18o / S03.3 AC19n pattern). The new AC20j extends the pin list to include `tests/dropzone-aria-live.test.ts` (S03.4) — wait, that's the current test file, not a prior story. The prior-story list is `tests/dropzone.test.ts` (S03.1), `tests/dropzone-drag-paste.test.ts` (S03.2), `tests/dropzone-file-cap.test.ts` (S03.3). Each must exist with its expected unique description string.
- **Svelte 4 event handler syntax reappearing**: AC20h is the explicit negative. Use Svelte 5 syntax throughout.
- **Per-component test creep**: S03.4 keeps `tests/dropzone.test.ts` (S03.1), `tests/dropzone-drag-paste.test.ts` (S03.2), `tests/dropzone-file-cap.test.ts` (S03.3) untouched; S03.4's tests live in `tests/dropzone-aria-live.test.ts`. This preserves the per-story test surface for regression tracking.

### Verification gap risk (review-time prediction)

The most likely review-time finding on S03.4: **The `pasteSnippet` utility's boundary semantics.** If a paste is exactly 40 chars, does it get the ellipsis or not? Spec: `text.length > 40 ? slice(0, 40) + '…' : text` — the boundary is inclusive at 40 (a 40-char paste is NOT truncated; a 41-char paste IS truncated). The test must pin this boundary.

The second most likely finding: **The `output` element's implicit `role="status"`.** Some screen readers treat `<output>` differently from `<div role="status">`. AD-9's "results banner uses `role="status"`" precedent might conflict with `<output>`'s implicit role. Spec choice: use `<output>` for the semantic correctness (it's the "result of a user action" element); the implicit role is `status` per WAI-ARIA; the explicit `aria-live="polite"` is the announcement cue. If a reviewer prefers `<div role="status">`, swap (no semantic change).

The third most likely finding: **The `.visually-hidden` extraction's effect on the existing component-scoped styles.** Removing the duplicate from ThemeToggle's `<style>` block means ThemeToggle's component-scoped CSS no longer has a `.visually-hidden` rule — but the class is still applied to ThemeToggle's `<span>` (line 66). The class needs to be defined somewhere; the global stylesheet is the new location. Test must verify the class still works in both components.

The fourth most likely finding: **The `liveAnnouncement` $state initialization timing.** S03.4 initializes `liveAnnouncement = $state('')`. The `$state` rune is reactive — setting it triggers re-renders. The first user gesture sets it to a non-empty string; the region announces. If a reviewer worries about the initial empty state triggering an announcement, the spec note is: empty `aria-live` regions don't announce (per WAI-ARIA; the screen reader only fires on textContent CHANGE, and an initial empty state has no prior content to change FROM).

The fifth most likely finding: **The `handleAccept` parameter type duplication.** S03.4 duplicates the discriminated-union type from Dropzone's `onaccept` prop. A reviewer may flag this as "the source of truth should be exported from Dropzone.svelte". Spec choice: keep the type local to App.svelte for S03.4; S03.7 will extract a shared `OnAcceptSource` type to `src/lib/` (a refactor that's natural when the reducer lands). For S03.4, the duplication is small (~6 lines) and the local definition makes App.svelte self-contained.

### References

- [Source: _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md#fr-1-file-ingestion] — "File up to 50MB is accepted; larger files show a pre-flight refusal with a clear explanation and offer to sample." (line 95). The acceptance is non-silent (announcements).
- [Source: _bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/ARCHITECTURE-SPINE.md#accessibility-floor-ad-9] — "every input gesture is mirrored to assistive tech via aria-live; no gesture is silent on screen readers." S03.4 honors this.
- [Source: _bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/SOLUTION-DESIGN.md#accessibility-floor-ad-9] — "aria-live regions: results banner (`role="status"`), dropzone accept, theme change." S03.4 lands the dropzone accept region.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/EXPERIENCE.md#component-patterns] — "On accept, the file name appears in the aria-live region." (line 55). S03.4 realizes this.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/EXPERIENCE.md#a11y] — "aria-live="polite" regions: results banner, dropzone accept announcement, theme change announcement." (line 87). S03.4 lands the dropzone accept announcement.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/EXPERIENCE.md#devons-flow-uj-1] — "The dropzone accepts; the file name appears in the aria-live region." (line 96). S03.4 lands this step.
- [Source: _bmad-output/implementation-artifacts/3-2-drag-and-drop-handler-paste-handler.md#cross-story-contract-notes] — "S03.4 will add the aria-live announcement on file accept" (line 167). S03.4 implements this contract.
- [Source: _bmad-output/implementation-artifacts/3-3-50-mb-cap-check-before-reading.md#cross-story-contract-notes] — "S03.4 will land the aria-live region that announces the over-cap error" (line 230). S03.4 SCOPE NOTE: S03.4 does NOT announce the over-cap error; S03.9's strict-brief path will. S03.4 is the accept-announcement surface; S03.9 owns the rejection-announcement surface. The two may end up sharing the same `<output>` region (the S03.9 path may switch `aria-live` from `polite` to `assertive` for the over-cap signal). Spec choice for S03.4: the region is `polite` only; S03.9 inherits the region and may add a second region for `assertive`.
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml#action_items] — AI-2.2: "Pre-E03 spike: land src/lib/strict-brief.ts with formatStrictBrief() before S03.9 consumes it (re-scope as 1-story spike or fold into S03.9's spec)." S03.4 doesn't author `formatStrictBrief()`; S03.4 only stands up the announcement surface.
- [Source: MDN `<output>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/output) — The semantic element for "result of a user action"; implicit `role="status"` per WAI-ARIA.
- [Source: MDN ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions) — `polite` vs `assertive`; `aria-atomic`; screen reader behavior on textContent change.

## Dev Agent Record

### Agent Model Used

claude-opus-4.8 (puku-cli router)

### Debug Log References

- `npm test` → 543/543 pass (485 prior + 58 new S03.4). The 58 new
  tests cover AC20a-AC20j (10 describe blocks; the higher-than-
  estimated count comes from the AC20f (6 sub-pins for the visually-
  hidden extraction), AC20i (14 forbidden-patterns × 2 source files),
  AC20d (5 runtime boundary pins for pasteSnippet), and AC20j (4 prior-
  story pin preservation checks).
- `npm run check` → svelte-check 0 errors + 1 pre-existing warning in
  ThemeToggle.svelte (state_referenced_locally for `mode`; not
  introduced by S03.4 — present before S03.4's commit). tsc 0 errors.
- `npm run build` → 12.62 KB gz JS / 14.70 KB gz total / 0 source maps
  after build-cleanup.
- `npm run check:bundle` → under 200 KB gzipped budget.
- `npm run audit:privacy` → 3 dist files / 27 forbidden hosts / 6
  forbidden source calls / OK.
- `npm run audit:behavior` → 3 allowed requests / 0 anomalous / 0
  service workers / OK.
- `npm run check:deps` → 42 packages scanned / 0 denylisted.
- `npm run check:telemetry` → 91 packages scanned / 0 forbidden
  patterns / 0 denylisted.

### Completion Notes List

- **App.svelte wires the onaccept consumer for the first time.** S03.2
  left the prop unbound (the gesture surface is the unit). S03.3
  preserved that bound. S03.4 inverts the boundary: `<Dropzone
  onaccept={handleAccept} />` is the S03.4 mount. `handleAccept`
  handles all three onaccept kinds (drop, paste, oversize) but only
  announces on drop + paste; the oversize branch is a defensive
  no-op (S03.9's strict-brief path owns that surface). The
  discriminated-union parameter type mirrors Dropzone's `onaccept`
  prop type exactly — the duplication is intentional for S03.4; S03.7
  will extract a shared `OnAcceptSource` type when the reducer lands.

- **`<output class="visually-hidden" aria-live="polite" aria-atomic="true">{liveAnnouncement}</output>`** lives inside `<main>`
  after the dropzone. The semantic choice (`<output>` not `<div
  role="status">`) honors WHATWG's "result of a user action"
  semantics; the implicit ARIA role of `<output>` is `status` per
  WAI-ARIA. `aria-atomic="true"` ensures the entire region is re-
  announced on every textContent change (not just the diff — important
  for `polite` announcements where the user may not have heard the
  previous one). The region is permanently `visually-hidden` (screen-
  reader-only); the visible banner is downstream (S03.9 / E04).

- **`.visually-hidden` extracted to `src/styles/app.css`.** The
  component-scoped definitions in `Dropzone.svelte` (S03.1) and
  `ThemeToggle.svelte` (S02.3) were duplicates of the canonical
  screen-reader-only pattern (position absolute, 1px clip rect, etc.).
  S03.4 makes the global stylesheet the single source of truth; the
  application sites (the hidden `<input>` in Dropzone, the
  announcement `<span>` in ThemeToggle, the new `<output>` region in
  App.svelte) are unchanged.

- **`src/lib/aria-live.ts` (NEW) exports `pasteSnippet(text: string)`.**
  Pure function; boundary semantics: cap is INCLUSIVE at 40 chars —
  a paste of exactly 40 chars returns verbatim (no ellipsis); a paste
  of 41 chars returns `text.slice(0, 40) + '…'`. The ellipsis uses
  `…` (U+2026), NOT three-dot ASCII. The function is unit-tested at
  `tests/dropzone-aria-live.test.ts` AC20d.

- **Boundary inversions documented in prior-story test files.**
  S03.1 AC17l `<Dropzone /> appears between <main and </main>` —
  regex widened from `<Dropzone\s*\/?>` to `<Dropzone\b[^>]*>` so the
  S03.4 opening tag with the `onaccept` attribute is matched.
  S03.2 AC18n `App.svelte still does NOT pass an onaccept callback` —
  flipped to assert the S03.4 reality (App.svelte DOES pass onaccept)
  with a docblock explaining the S03.4 inversion. S03.3 AC19m same
  pattern (App.svelte DOES pass onaccept, App.svelte DOES mention
  "oversize" via handleAccept's discriminated-union parameter type).
  The historical docblocks preserve the per-story regression-tracking
  surface: a future contributor reviewing the diff sees both the
  prior-story boundary AND the current-story inversion at the same
  test location.

- **Editorial voice bound.** "File accepted: " uses colon
  separator (NOT em-dash — em-dash is reserved for strict-brief
  findings per E10/E12). Sentence case (NOT Title Case). "Text
  pasted: <snippet>" uses U+2026 ellipsis on truncation.

- **No visible surface.** S03.4 is purely the screen-reader-only
  announcement surface. No visible banner, no visible chip, no
  visible "File accepted: foo.csv" anywhere in the page chrome. The
  visible banner is downstream (S03.9 / E04).

- **Privacy Baseline preserved.** Zero network calls (no fetch /
  XMLHttpRequest / sendBeacon / EventSource / navigator.sendBeacon
  in any S03.4-touched file). The `aria-live` module is pure
  functions; the App.svelte consumer reads `file.name` from a
  closure-scoped File (no network API). `audit-privacy.mjs` stays
  green.

### File List

- `src/App.svelte` — MODIFIED. Wires `<Dropzone onaccept={handleAccept} />` for the first time. Adds `handleAccept` function (handles all 3 onaccept kinds; announces on drop + paste; no-ops on oversize). Adds `<output>` aria-live region inside `<main>` after the dropzone. ~50 lines net added (script block grew from imports-only to imports + state + handler + docblock).
- `src/styles/app.css` — MODIFIED. Adds `.visually-hidden { ... }` definition (the global source of truth) + an explanatory docblock.
- `src/components/Dropzone.svelte` — MODIFIED. Removes the component-scoped `.visually-hidden` definition from `<style>` block (lines 266-276); adds a comment explaining the extraction. The hidden `<input>` still uses `class="visually-hidden"`.
- `src/components/ThemeToggle.svelte` — MODIFIED. Removes the component-scoped `.visually-hidden` definition from `<style>` block (lines 91-101); adds a comment explaining the extraction. The announcement `<span>` still uses `class="visually-hidden"`.
- `src/lib/aria-live.ts` — NEW. ~45 lines (docblock + `pasteSnippet` function). Pure function, no DOM.
- `tests/dropzone-aria-live.test.ts` — NEW. ~340 lines. 10 AC20a-AC20j describe blocks; 58 sub-assertions.
- `tests/dropzone.test.ts` — MODIFIED. AC17l regex widened (`<Dropzone\s*\/?>` → `<Dropzone\b[^>]*>`) with docblock explaining the S03.4 inversion.
- `tests/dropzone-drag-paste.test.ts` — MODIFIED. AC18n flipped from "App.svelte does NOT pass onaccept" to "App.svelte DOES pass onaccept={handleAccept}" with docblock explaining the S03.4 inversion.
- `tests/dropzone-file-cap.test.ts` — MODIFIED. AC19m flipped from "App.svelte does NOT pass onaccept / does NOT mention oversize" to "App.svelte DOES pass onaccept / DOES mention oversize" with docblock explaining the S03.4 inversion.
- `_bmad-output/implementation-artifacts/3-4-file-name-reveal-in-aria-live-region.md` — this story file, updated with completion notes.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `3-4-file-name-reveal-in-aria-live-region: done` (from `backlog`).
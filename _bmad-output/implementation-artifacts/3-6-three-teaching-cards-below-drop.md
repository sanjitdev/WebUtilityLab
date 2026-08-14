# Story 3.6: Three teaching cards — body prose for the empty-state FR-7 teaching surface (S03.6)

Status: ready-for-dev
baseline_commit: 7d0203c (S03.5 Review #2 loop closure — coderabbit fixes landed; sprint-status flipped to done; S03.6 picks up from here)
review_loop_iteration: 0

> **Scope re-convergence note.** S03.5's AC5 and AC6 specified body prose for each of the three teaching cards (the score format explanation for "What we show you"; the cleaning-toggle-default-OFF + reversibility-view explanation for "What you can do"), but S03.5 implementation landed the cards with the heading + the `<ul>` of category names only — the body prose was deferred to keep S03.5's surface minimal. S03.6 lands that body prose. The S03.5 dev-notes earlier suggested a different re-scope ("interactive surface — hover, focus, click-to-expand"); that re-scope is **wrong** for the FR-7 teaching cards (the spec's interactive disclosure pattern is for **problem cards** in E10, not teaching cards in E03). The teaching cards are **vocabulary primers** — they list the 8 / 4 / 5 category names — and the prose-level explanations were always part of S03.5's surface. S03.6 closes that gap. There is no hover/focus/click-to-expand on the teaching cards (the cards are `<section>` elements, not `<button>` elements; making them interactive would conflict with AD-9 "real button or anchor for affordances, not `<div onClick>`" — the cards have no affordance to surface).

> **Path-alias note.** This project's `vite.config.ts` does **not** configure `$lib` as a path alias, and `tsconfig.json` does **not** define `"paths": { "$lib/*": [...] }`. (Verified: `vite.config.ts` has zero `resolve.alias` entries; `tsconfig.json` extends `@tsconfig/svelte` and adds no path mappings.) Therefore the spec uses **relative imports** (`'../lib/empty-state'`) throughout. (A future story in E05 may introduce `$lib` as part of the S05.x work; until then, relative paths are the convention.)

> **Editorial voice binding.** The body prose for all three cards is short, sentence-case, declarative, and restrained — no marketing modifiers, no exclamation marks, no rhetorical questions. The prose honors the locked FR-2 / FR-3 / FR-5 category names (no rewriting, no Title Case, no marketing modifiers). Mono for data — the category names stay in `<code>`; the body prose is plain prose (no `<code>` in the body). Curly apostrophes + spaced em-dashes per the editorial contract.

## Story

As a **first-time visitor who has scrolled past the headline, the lede, the two CTAs, and the dropzone, and who is now reading the three teaching cards before deciding to drop a file**,

I want **each card to have a one-line body prose that explains what the card's category list represents in the tool's results — the score band for "What we show you", the reversibility view for "What you can do", the anomaly derivation for "What we detect" — so the vocabulary primer links the listed categories to the actual results the user will see after dropping a file**,

so that **PRD's FR-7 ("empty state teaches — the user can reach a populated results state without reading any docs") is completed: the cards now answer "what does the tool tell me?" / "how does it score that?" / "what can I do about it?" with one declarative sentence per card, reinforcing the JTBD ("find out what's wrong with it") and preparing the user for the results page. The body prose is the missing context between the category-list enumeration and the results page — without it, the user sees 17 category names with no anchor to what they'll mean in the results. The body prose is short (one sentence per card, sentence case, no marketing modifiers) and renders immediately under the `<h3>` heading, above the `<ul>` of category names. The card's visual structure (heading → body → list) mirrors the editorial cadence of the headline → lede → CTAs block above the dropzone.**

## Acceptance Criteria

1. **Body prose for "What we detect" card.** A single `<p class="empty-state-card-lede">` (or similar; the class name is the implementer's choice but should follow the existing `.empty-state-*` naming convention) renders immediately under the `<h3>What we detect</h3>` heading, ABOVE the `<ul>` of FR-2 category names. The body prose is **one sentence** in sentence case, no period at the end of the sentence if the sentence ends with a category name reference (the editorial voice allows terminal periods but discourages them for declarative one-liners). The prose explains that the 8 listed categories are the anomaly types the tool detects per FR-2 and that each detected anomaly carries row index + column name + the specific value + the rule that was broken + a one-sentence explanation (per FR-2's testable consequences). **Spec choice for the body prose:** "Each anomaly is reported with its row, column, the value, the rule that was broken, and a one-sentence explanation." (`md5` of the string is part of the test pin.) The sentence uses curly apostrophes / spaced em-dashes as needed; the verbatim prose is the spec's locked copy and the test pins it character-for-character. The body prose has the same visual treatment as the existing `.empty-state-lede` (graphite color, no marketing modifiers) so the card hierarchy reads as "heading → body → list."

2. **Body prose for "What we show you" card.** A single `<p class="empty-state-card-lede">` renders immediately under the `<h3>What we show you</h3>` heading, ABOVE the `<ul>` of FR-3 category names. The body prose is **one sentence** that explains the score format (0–100 numeric, banded by color: red < 60, amber 60–79, green ≥ 80) per FR-3 and the broken-down category breakdown. **Spec choice for the body prose:** "A 0–100 score with a red, amber, or green band and a per-category breakdown across the four values." The em-dash in `0–100` is the en-dash (U+2013, not U+2014); the prose uses curly apostrophes / spaced em-dashes as needed. The verbatim prose is the spec's locked copy and the test pins it character-for-character. The body prose's visual treatment matches the existing `.empty-state-lede` (graphite color).

3. **Body prose for "What you can do" card.** A single `<p class="empty-state-card-lede">` renders immediately under the `<h3>What you can do</h3>` heading, ABOVE the `<ul>` of FR-5 cleaning actions. The body prose is **one sentence** that explains the cleaning-toggle default (all OFF, conservative default per FR-5) and the reversibility view (original-vs-cleaned diff shown before confirmation). **Spec choice for the body prose:** "All toggles default off; the original and the proposed cleaned version are shown side by side before you confirm." The curly apostrophe (`'` U+2019) is required; the spaced em-dash is not used here (the side-by-side concept is rendered as "side by side," not "side-by-side" with em-dashes). The verbatim prose is the spec's locked copy and the test pins it character-for-character. The body prose's visual treatment matches the existing `.empty-state-lede` (graphite color).

4. **Body prose is structurally identical across all three cards.** Each card has the same structure: `<section class="empty-state-card">` containing `<h3>` heading + `<p class="empty-state-card-lede">` body prose + `<ul>` of category names. The body's visual treatment is identical across the three cards (same font-size, same color, same margin-block). The body prose is **not** wrapped in `<code>` (mono for data applies to the category names, not the body prose per the editorial voice — "mono for data" is the rule, and the body prose is prose, not data). The body prose is **not** interactive (no `<details>` / `<summary>`, no hover state, no focus state — the card remains a `<section>`, not a `<button>` or `<details>`). The locked FR-2 / FR-3 / FR-5 names stay wrapped in `<code>` per AC21h / AC21i / AC21j from S03.5.

5. **No new dependencies.** S03.6 is App.svelte + app.css only; no `package.json` entries, no new modules. The body prose is rendered directly in App.svelte's template (a static `<p>` per card; no `$state`, no helpers). The CSS is added to `src/styles/app.css` (the global source of truth). No new tokens are added to `src/styles/tokens.css` — the body prose's typography reuses the existing token vocabulary (`var(--graphite)` for color, `var(--size-data)` for font-size, `var(--space-base)` for margin-block).

6. **Privacy Baseline preserved.** No `fetch` / `XMLHttpRequest` / `navigator.sendBeacon` / `EventSource` / `new Function` / `eval` / dynamic `import()` in any S03.6-touched file. App.svelte's template additions are pure markup; the body prose is plain text. `audit-privacy.mjs` stays green.

7. **Editorial voice bound.** The three body-prose sentences follow the editorial voice conventions from EXPERIENCE.md §Voice and Tone (line 39): curly quotes / apostrophes in prose (use `'` and `"` not `'` and `"`); spaced em-dashes (`word — word`); sentence-case; mono for data values (the 17 category names stay in `<code>`). The body prose is restrained (no marketing modifiers, no exclamation marks, no rhetorical questions). The one sentence per card is the editorial cadence the spec calls for — the body prose is NOT a paragraph of explanatory text; it's a single declarative sentence that anchors the category list to the tool's results page.

8. **Tests** at `tests/dropzone-empty-state.test.ts` (EXTENDED — the S03.5 file). The test file already covers AC21a–AC21m for S03.5. S03.6 extends the existing file with a new `AC22*` describe block (the AC numbering prefixes the story index: AC22 is the S03.6 acceptance criteria family). Mirror the S03.5 pattern: `node:fs` + `node:path` + `node:url` + `vitest` imports; source-grep on `src/App.svelte` and `src/styles/app.css`. Coverage (8 AC22a–AC22h describe blocks):
   - **AC22a (body prose for "What we detect")** — `appSource` contains the verbatim sentence `"Each anomaly is reported with its row, column, the value, the rule that was broken, and a one-sentence explanation."` The test pins the exact string (curly apostrophes NOT used here; "rule that was broken" uses no apostrophes; the sentence is ASCII-clean). The test also asserts the `<p>` is a single element (not split) and renders ABOVE the `<ul>` of FR-2 category names.
   - **AC22b (body prose for "What we show you")** — `appSource` contains the verbatim sentence `"A 0–100 score with a red, amber, or green band and a per-category breakdown across the four values."` The en-dash (U+2013) is required; the test pins the exact string. The test asserts the `<p>` is a single element and renders ABOVE the `<ul>` of FR-3 category names.
   - **AC22c (body prose for "What you can do")** — `appSource` contains the verbatim sentence `"All toggles default off; the original and the proposed cleaned version are shown side by side before you confirm."` The curly apostrophe (`'` U+2019) is required; the test pins the exact string. The test asserts the `<p>` is a single element and renders ABOVE the `<ul>` of FR-5 cleaning actions.
   - **AC22d (structural consistency)** — `appSource` contains exactly three `<p class="empty-state-card-lede">` elements (one per card). The class name `.empty-state-card-lede` is consistent across all three cards. Each `<p>` is a single child element (not a parent of nested elements).
   - **AC22e (body prose is NOT inside `<code>`)** — The body prose sits in a `<p>` element, not in a `<code>` element. The verbatim prose strings (the three sentences) appear as plain text inside `<p>` elements, not as `<code>` content. The test asserts the three sentences are NOT found inside `<code>` tags.
   - **AC22f (body prose position ordering)** — Within each card, the `<h3>` heading is the first child, the `<p class="empty-state-card-lede">` body is the second child, and the `<ul>` of category names is the third child. The test asserts the order `<h3>...<p>...<ul>` for each card. This is the "vocabulary primer hierarchy" — the heading names the card, the body explains what the categories mean in the results, and the list enumerates the categories.
   - **AC22g (CSS rules for body prose)** — `app.css` defines a `.empty-state-card-lede` rule that uses `var(--graphite)` for color, `var(--size-data)` for font-size, and `var(--space-base)` for margin-block. The test asserts the rule exists and uses all three tokens. The body prose's visual treatment is token-disciplined (AD-8).
   - **AC22h (zero hex literals + zero new forbidden source patterns)** — `appSource` does NOT contain any hex color literal (`#[0-9a-fA-F]{3,8}`); `appCssSource` does NOT contain any hex color literal. The new body prose is plain text — no `<style>` in the component, no inline styles. The forbidden-pattern scan (Privacy Baseline) is extended to include the new app.css additions (the `.empty-state-card-lede` rule).

9. **README / docs / planning-artifact changes are out of scope.** No edits to `CHANGELOG.md`, `SECURITY.md`, `docs/loop-protocol.md`, `docs/pii-patterns.md`, or the planning artifacts (post-Epic updates). Story commit is code-only.

10. **`tests/dropzone-empty-state.test.ts` passes in the production gate.** The test file is extended (AC22a–AC22h additions); ~24 new sub-assertions (the verbatim-prose pins × 3 + the structural consistency count + the no-`<code>`-wrapping pin × 3 + the order-position pin × 3 + the CSS rule pin × 3 + the hex-literal pin × 2 + the forbidden-pattern scan × 13 × 2 = sundry). The test file's prior-story boundary pins (AC21a–AC21m from S03.5) stay intact.

## Verification

1. `npm test` → all tests pass (631 from before S03.6 + ~24 new in `tests/dropzone-empty-state.test.ts`).
2. `npm run check` → svelte-check 0 errors + tsc 0 errors. The 1 pre-existing warning in ThemeToggle.svelte (`state_referenced_locally`) is NOT introduced by S03.6.
3. `npm run build` → `dist/` exists; 0 source maps after build-cleanup; bundle still under budget (S03.6 adds ~3 lines of prose × 3 cards + ~5 lines of CSS = ~0.2 KB to the JS bundle).
4. `npm run check:bundle` → under 200 KB gzipped.
5. `npm run audit:privacy` → OK; the new prose is purely visible content, no network calls.
6. `npm run audit:behavior` → OK; the body prose is static, no post-load requests.
7. `npm run check:deps` → OK.
8. `npm run check:telemetry` → OK.
9. **Manual / DevTools**:
   - `npm run preview`; open in Chrome with VoiceOver enabled.
   - Empty state shows: headline (h2), lede (p with curly apostrophe + spaced em-dash), CTAs ("Try the example" disabled button + "·" + "Browse files" anchor), dropzone (button), aria-live region (silent), three teaching cards.
   - Each teaching card now reads: heading + body prose (one sentence) + list of category names (mono).
   - VoiceOver: tab order is skip-link → nav (Privacy + ThemeToggle) → "Try the example" button (disabled, announced) → "Browse files" anchor → dropzone button → each of the 3 card headings (h3) → card body prose (p) → card list (ul/li/code). The body prose is announced as plain text (not as data/code).
   - Lighthouse a11y: all 3 h3 headings recognized; no heading-level skips (h1 in header → h2 in main → h3 in cards); body prose is in `<p>` elements (semantic paragraph); no new a11y violations.
   - Visual: cards stack to 1 column below 720px (responsive floor); cards use `--paper` background + `--rule` border + `--space-base` padding; body prose uses `--graphite` color + `--size-data` font-size.

## Loop Protocol Path Forward

1. Implement Tasks 1–7 below (App.svelte template additions + app.css rule + tests + verification).
2. Run production-readiness gate (Step 7 of loop).
3. Run Review #1 — 3 reviewers in parallel (blind-hunter, edge-case-hunter, verification-gap) against the diff.
4. Apply Review #1 patches if any.
5. Run Review #2 — coderabbit in fresh context against diff + Review #1 findings.
6. Apply Review #2 patches if any.
7. Flip `sprint-status.yaml` to `done`.
8. Update story file with step-05 maintenance patch notes.
9. Move to S03.7 (accept path emits file reference to reducer).

## Tasks / Subtasks

- [ ] **Task 1** — Read the existing source files S03.6 touches + the cross-story contract notes:
  - [ ] 1.1 Read `src/App.svelte` (already done; S03.5 page chrome + aria-live region + empty-state cards). The three teaching cards' `<h3>` headings + `<ul>` of category names are in place; S03.6 adds the `<p class="empty-state-card-lede">` body prose between them.
  - [ ] 1.2 Read `src/styles/app.css` (already done; S02.4 + S03.4 + S03.5 chrome). The existing `.empty-state-card` surface + the `.empty-state-card h3` + `.empty-state-card ul` + `.empty-state-card li` rules are in place; S03.6 adds the `.empty-state-card-lede` rule.
  - [ ] 1.3 Read `tests/dropzone-empty-state.test.ts` (already done; the S03.5 test file with 12 describe blocks). The file is extended with AC22a–AC22h describe blocks.

- [ ] **Task 2** — Modify `src/App.svelte` to add the body prose for each of the three teaching cards:
  - [ ] 2.1 SCRIPT BLOCK: no changes. S03.6's body prose is static template text; no `$state`, no helpers.
  - [ ] 2.2 TEMPLATE BLOCK additions BETWEEN each card's `<h3>` heading and the `<ul>` of category names:
    - For "What we detect" card (after the `<h3>What we detect</h3>` heading, before the `<ul>`): add `<p class="empty-state-card-lede">Each anomaly is reported with its row, column, the value, the rule that was broken, and a one-sentence explanation.</p>`
    - For "What we show you" card (after the `<h3>What we show you</h3>` heading, before the `<ul>`): add `<p class="empty-state-card-lede">A 0–100 score with a red, amber, or green band and a per-category breakdown across the four values.</p>`
    - For "What you can do" card (after the `<h3>What you can do</h3>` heading, before the `<ul>`): add `<p class="empty-state-card-lede">All toggles default off; the original and the proposed cleaned version are shown side by side before you confirm.</p>`
  - [ ] 2.3 Update the docblock at the top of App.svelte: note that S03.6 adds the body prose for each teaching card (the missing FR-7 teaching context between the category-list enumeration and the results page). The S03.5 docblock already references the teaching cards; S03.6's prose is an extension of that contract.

- [ ] **Task 3** — Add `.empty-state-card-lede` rule to `src/styles/app.css`:
  - [ ] 3.1 Add `.empty-state-card-lede { margin-block: 0 var(--space-base); color: var(--graphite); font-size: var(--size-data); }` — the body prose's visual treatment. The color is `--graphite` (muted prose, same as the page-level `.empty-state-lede`); the font-size is `--size-data` (smaller than the heading, larger than... well, no, smaller than the heading is the same as the `<ul>` font-size — the body prose and the `<ul>` are the same data-tier scale, which is the editorial cadence).
  - [ ] 3.2 NO hex literals, no rgb(), no inline `<style>` in any S03.6-touched file.

- [ ] **Task 4** — Extend `tests/dropzone-empty-state.test.ts` with `AC22*` describe blocks:
  - [ ] 4.1 AC22a: body prose for "What we detect" — verbatim string pin (no curly apostrophes; ASCII-clean) + single-`<p>`-per-card pin + body-prose-comes-before-`<ul>` pin.
  - [ ] 4.2 AC22b: body prose for "What we show you" — verbatim string pin (en-dash U+2013 required) + single-`<p>`-per-card pin + body-prose-comes-before-`<ul>` pin.
  - [ ] 4.3 AC22c: body prose for "What you can do" — verbatim string pin (curly apostrophe U+2019 required) + single-`<p>`-per-card pin + body-prose-comes-before-`<ul>` pin.
  - [ ] 4.4 AC22d: structural consistency — exactly three `<p class="empty-state-card-lede">` elements; each is a single child (not nested).
  - [ ] 4.5 AC22e: body prose is NOT inside `<code>` — the three verbatim sentences appear as plain text inside `<p>` elements, not as `<code>` content.
  - [ ] 4.6 AC22f: body prose position ordering — within each card, the order is `<h3>` → `<p class="empty-state-card-lede">` → `<ul>`.
  - [ ] 4.7 AC22g: CSS rule for body prose — `app.css` defines `.empty-state-card-lede` with `var(--graphite)`, `var(--size-data)`, `var(--space-base)`.
  - [ ] 4.8 AC22h: zero hex literals + zero new forbidden source patterns — mirror AC21k's privacy-baseline scan.

- [ ] **Task 5** — Run the production-readiness gate (mirror S03.5 Task 6):
  - [ ] 5.1 `npm test` → all 631 prior tests + ~24 new in `tests/dropzone-empty-state.test.ts` pass.
  - [ ] 5.2 `npm run check` → 0 errors + 1 pre-existing ThemeToggle warning.
  - [ ] 5.3 `npm run build` → bundle under budget; 0 source maps.
  - [ ] 5.4 `npm run check:bundle` → under 200 KB gzipped.
  - [ ] 5.5 `npm run audit:privacy` → OK.
  - [ ] 5.6 `npm run audit:behavior` → OK.
  - [ ] 5.7 `npm run check:deps` → OK.
  - [ ] 5.8 `npm run check:telemetry` → OK.

- [ ] **Task 6** — Open a local commit (no push yet): `S03.6 done: body prose for the three teaching cards (FR-7 vocabulary primer — anomaly derivation, score format, reversibility view); each card now reads heading → body → list`.

## Dev Notes

### Source files this story touches

| File | Status | Surface S03.6 changes |
|---|---|---|
| `src/App.svelte` | **MODIFIED** | Adds three `<p class="empty-state-card-lede">` body-prose paragraphs (one per teaching card). Each is rendered BETWEEN the card's `<h3>` heading and the `<ul>` of category names. ~3 lines net added (one `<p>` per card). |
| `src/styles/app.css` | **MODIFIED** | Adds `.empty-state-card-lede` rule (color, font-size, margin-block). 5 lines added. |
| `tests/dropzone-empty-state.test.ts` | **EXTENDED** | Adds AC22a–AC22h describe blocks (~24 new sub-assertions). The S03.5 AC21a–AC21m pins are preserved (the prior-story boundary contract). |

### Files S03.6 does NOT touch (avoid scope creep)

| File | Why leave alone |
|---|---|
| `src/components/Dropzone.svelte` | S03.6 is empty-state content; the dropzone is unchanged. |
| `src/components/ThemeToggle.svelte` | S03.6 is empty-state content; the theme toggle is unchanged. |
| `src/lib/*` | No new modules. The body prose is static template text. |
| `src/worker/*` | E05+ territory. |
| `src/styles/tokens.css` | No new tokens; the S03.6 CSS uses existing `var(--graphite)`, `var(--size-data)`, `var(--space-base)`. |
| `index.html` | Unchanged. |
| `src/main.ts` | Unchanged. |
| `package.json` | No new deps. |

### Cross-story contract notes

- **S03.5's AC5 and AC6 specified body prose that S03.5 didn't land.** S03.5's spec dev-notes (lines 39, 40) called for one short line per card explaining the score format (What we show you) and the cleaning-toggle-default-OFF + reversibility view (What you can do). S03.6 closes that gap. S03.5's AC21 pins remain intact (the prior-story boundary contract).

- **S03.7 will wire the reducer consumer + state-machine.** S03.7 replaces the App.svelte `handleAccept` with a reducer-driven state machine. The empty-state body prose S03.6 lands stays visible in the `empty` state; in the `active` / `processing` / `refusal` / `results` states, the empty-state content morphs (e.g., the headline changes to "Working…" or "Choose a smaller file"). S03.6 doesn't add any state-driven logic; the static body prose is the S03.6 contract.

- **S03.8 will wire the Try the example button.** S03.6 leaves the button `disabled` (the S03.5 contract is unchanged). S03.8 removes `disabled`, adds the click handler that loads the example CSV (from `src/lib/example-csv.ts` per S03.8's spec), and dispatches the same `{ kind: 'drop'; file }` event that a user-picked file would.

- **E10 will land the problem cards.** The S03.6 teaching cards are **vocabulary primers**, not problem cards. The problem cards in E10 (the FR-2 anomaly results) use `<details>` / `<summary>` for interactive disclosure per EXPERIENCE.md §Component Patterns line 56. S03.6's teaching cards do NOT use `<details>` / `<summary>` — the teaching cards are static `<section>` elements with no interactive surface. The interactive disclosure pattern is reserved for the E10 problem cards.

- **E13 will run the full a11y audit.** S03.6's body prose sits in `<p>` elements with semantic `<p>` role; the screen-reader announcement for the cards is now "heading → body → list" (the body prose is announced as plain text), which is the correct AT cadence. S03.6 doesn't run axe-core (that's E13), but the structure is semantically correct.

### Out-of-scope clarifications (explicit non-goals for S03.6)

- **No hover/focus/click-to-expand on the teaching cards.** The S03.5 dev-notes earlier suggested S03.6 could re-scope to "interactive surface" — that re-scope is **wrong** for FR-7 teaching cards. The cards have no affordance to surface; the interactivity lives in the E10 problem cards. The teaching cards are static `<section>` elements with heading + body + list.
- **No per-category tooltip / title attribute.** The 17 category names stand on their own (the locked FR-2 / FR-3 / FR-5 names). A tooltip would be redundant with the body prose and would clutter the surface.
- **No iconography on the cards.** The cards are text-only (heading + body + list). Per-category icons are out of scope; the editorial voice favors restraint over decoration.
- **No per-category descriptions.** The 17 category names are the vocabulary; the body prose is the per-card context. Per-category descriptions (e.g., "duplicates: rows that share all column values within the deduplication key") would expand the card surface significantly and are out of scope for S03.6.
- **No state-driven content.** S03.6's body prose is static; S03.7's state machine drives the empty → active → results morph.
- **No new tokens.** S03.6 uses existing `var(--graphite)`, `var(--size-data)`, `var(--space-base)`. No tokens added to `src/styles/tokens.css`.

### Anti-patterns to avoid (per E02 retro's "What was hard" lessons)

- **CSS property vs custom-property confusion** (S02.6 lesson): S03.6's CSS uses `var(--token)` for every value — `var(--graphite)`, `var(--size-data)`, `var(--space-base)`. No hex literals, no rgb().
- **Spec implies a directory walk, not a per-file scan** (S02.5 lesson): AC22h's negative-assertion scan is bounded to App.svelte + app.css; the broader `src/` walk is the S02.6 test's job.
- **Description-string anchor for boundary pins** (S02.5 lesson): AC22d's "exactly three `<p class="empty-state-card-lede">` elements" is the count pin; the verbatim-prose pins (AC22a, AC22b, AC22c) are the content pins.
- **Svelte 4 event handler syntax reappearing**: S03.6 doesn't bind any new event handlers (the body prose is static text in `<p>` elements, no handlers).
- **Per-component test creep**: S03.6 keeps `tests/dropzone-empty-state.test.ts` (the S03.5 file) untouched in its existing AC21a–AC21m pins; S03.6's AC22a–AC22h are added to the same file. This preserves the per-story test surface for regression tracking.

### Verification gap risk (review-time prediction)

The most likely review-time finding on S03.6: **The verbatim prose.** The three body-prose sentences are character-for-character; a typo (e.g., ASCII apostrophe instead of curly in "you're" / "toggles default off" / "you're confirming", wrong em-dash for the en-dash in "0–100", missing terminal period) would fail the AC22a–AC22c pins. The test must pin the exact string, not just a regex.

The second most likely finding: **The body-prose position ordering.** AC22f asserts the `<h3>` → `<p class="empty-state-card-lede">` → `<ul>` order within each card. A regression that puts the `<p>` after the `<ul>` would break the editorial cadence (the heading names the card, the body explains what the categories mean, the list enumerates the categories — the order is the hierarchy).

The third most likely finding: **The body prose is NOT inside `<code>`.** AC22e asserts the three verbatim sentences are plain text inside `<p>` elements, NOT inside `<code>` elements. The mono treatment is reserved for the category names (per "mono for data"); the body prose is prose, not data. A regression that wraps the body prose in `<code>` would break the editorial voice.

The fourth most likely finding: **The body prose is NOT inside `<details>` / `<summary>`.** The interactive disclosure pattern is for E10 problem cards, not S03.6 teaching cards. The teaching cards are static `<section>` elements. The AC22d "exactly three `<p class="empty-state-card-lede">` elements" pin catches any regression that nests the body prose inside a `<details>` (the `<details>` would change the structure count).

The fifth most likely finding: **The CSS rule uses tokens.** AC22g asserts `.empty-state-card-lede` uses `var(--graphite)`, `var(--size-data)`, `var(--space-base)`. A regression that uses a hex literal or a magic number would fail the token-discipline pin.

### References

- [Source: _bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/EXPERIENCE.md#information-architecture] — "**Empty state** — Teaching per FR-7. Privacy signal visible at the dropzone (FR-9). Headline + lede + two CTAs: 'Try the example' (primary), 'Browse files' (secondary). Drop zone below. Three teaching cards below the drop ('What we detect' / 'What we show you' / 'What you can do')." (line 24). S03.6 completes the FR-7 teaching surface.
- [Source: _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md#fr-2] — "Each detected anomaly is listed with: row index, column name, the specific value, the rule that was broken, and a one-sentence explanation." S03.6's "What we detect" body prose abstracts this FR-2 consequence into the user-facing sentence.
- [Source: _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md#fr-3] — "Tool produces a numeric data-quality score (0-100) with a brief breakdown by category." S03.6's "What we show you" body prose abstracts the FR-3 score format into the user-facing sentence.
- [Source: _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md#fr-5] — "Cleaning is reversible — the original file is shown alongside the cleaned version, with a diff." S03.6's "What you can do" body prose abstracts the FR-5 reversibility view into the user-facing sentence.
- [Source: _bmad-output/implementation-artifacts/3-5-empty-state-copy-from-experience-md.md#cross-story-contract-notes] — S03.5 dev-notes called for body prose per card; S03.6 lands it. S03.5's AC21 pins remain intact.
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml#development_status] — 3-6-three-teaching-cards-below-drop: backlog (will flip to in-progress at S03.6 implementation start).

## Dev Agent Record

### Agent Model Used

claude-opus-4.8 (puku-cli router)

### Debug Log References

- None — implementation + reviews + gates all clean.

### Completion Notes List

**S03.6 done 2026-08-14.**

Four commits landed (in order):
1. `95f69ab` — ready-for-dev (spec landed)
2. `5fab037` — implementation (App.svelte + app.css + 46 new test assertions)
3. `3e46510` — Review #1 (3 reviewers in parallel; applied 3 MUST-FIX + 6 SHOULD-FIX)
4. `19908de` — Review #2 (coderabbit in fresh context; applied 2 MUST-FIX + 1 SHOULD-FIX)

**Production surface:**
- `src/App.svelte` — adds 3 `<p class="empty-state-card-lede">` body-prose paragraphs (one per card) between each `<h3>` heading and `<ul>` of category names; adds `aria-labelledby` to each `<section class="empty-state-card">` + matching `id` on each `<h3>` (AD-9 a11y landmark names).
- `src/styles/app.css` — adds `.empty-state-card-lede` rule with `var(--graphite)`, `var(--size-data)`, `var(--space-base)`, plus `overflow-wrap: anywhere` (narrow-viewport guard for the ~120-char body sentence at the <720px collapse).

**Test surface (686 tests pass; was 631 before S03.6):**
- AC22a / AC22b / AC22c — verbatim body-prose pins for each card (FR-2 / FR-3 / FR-5 prose).
- AC22d — exactly three `<p class="empty-state-card-lede">` elements (multi-class regex form, per-section count resilience).
- AC22e — body prose NOT inside `<code>` (false-positive fix: same-line `<code>` regression now fails; scoped to current card section).
- AC22f — `<h3>` → `<p>` → `<ul>` order (intra-card scope; category-`<code>` anchor for nested-`<ul>` resilience).
- AC22g — `.empty-state-card-lede` CSS rule uses tokens + `overflow-wrap: anywhere`.
- AC22h — zero hex literals + zero forbidden source patterns (Privacy Baseline + AD-8).
- AC22i — each `<section>` has `aria-labelledby` referencing its `<h3>` `id`; three labelledby ids are unique across App.svelte.

**Review findings applied:**
- Review #1 MUST-FIX (3): AC22f inter-card vs intra-card distance; AC22e silent-skip false positive; AC22f nested-`<ul>` fragility.
- Review #1 SHOULD-FIX (6): multi-class regex; per-section count resilience; cross-card prose context; section-scoped walk-back; overflow-wrap guard; section a11y.
- Review #2 MUST-FIX (2): AC22i detect-card pin scoped to matching card; AC22e body-inside-section guard.
- Review #2 SHOULD-FIX (1): AC22c docstring removed false curly-apostrophe claim.

### File List

- `src/App.svelte` (modified — body prose + aria-labelledby + id)
- `src/styles/app.css` (modified — `.empty-state-card-lede` rule + overflow-wrap)
- `tests/dropzone-empty-state.test.ts` (modified — AC22a-AC22i + AC22g-followup)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — S03.6 flipped to done)
- `_bmad-output/implementation-artifacts/3-6-three-teaching-cards-below-drop.md` (this file — completion notes)

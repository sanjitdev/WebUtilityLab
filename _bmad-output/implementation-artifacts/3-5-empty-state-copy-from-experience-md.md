# Story 3.5: Empty-state copy from EXPERIENCE.md (S03.5)

Status: ready-for-dev
baseline_commit: c5b97f3 (S03.4 loop closure — aria-live region lands; structured Announcement discriminated union; sprint-status flipped to done; S03.5 picks up from here)
review_loop_iteration: 1
final_commit: <to be filled after push>

> **Loop protocol (mandatory).** This story must pass Review #1 (3 parallel reviewers), Review #2 (coderabbit), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. `S03.5` lands the **visible empty-state surface** that the user sees on first paint — the locked JTBD sentence ("Drop a CSV to find out what's wrong with it."), the privacy signal ("We don't upload — this happens in your browser."), the file-format guardrails ("Files up to 50 MB, UTF-8, with or without a BOM."), the two CTAs ("Try the example" primary + "Browse files" secondary), and the three teaching cards ("What we detect" / "What we show you" / "What you can do"). S03.1 shipped the visual chrome + the picker-opening gesture; S03.2 wired drag-and-drop + paste handlers and exposed `onaccept`; S03.3 added the 50 MB cap check; S03.4 wired the aria-live announcement region; S03.5 now adds the **visible empty-state content** that sits above and below the dropzone. **S03.5 does NOT touch the reducer, the worker, or the parsing logic** — S03.7 owns the reducer wiring; S03.8 owns the "Try the example" example-CSV button; S03.9 owns the strict-brief formatter. S03.5 is purely the visible-content surface: prose, two CTAs (one is a real button without an action until S03.8; the other is the existing dropzone button), and three teaching cards. The visible content is rendered statically on first paint; the reducer-driven state transition (empty → active) lands in S03.7.

> **Path-alias note.** This project's `vite.config.ts` does **not** configure `$lib` as a path alias, and `tsconfig.json` does **not** define `"paths": { "$lib/*": [...] }`. (Verified: `vite.config.ts` has zero `resolve.alias` entries; `tsconfig.json` extends `@tsconfig/svelte` and adds no path mappings.) Therefore the spec uses **relative imports** (`'../lib/empty-state'`) throughout. (A future story in E05 may introduce `$lib` as part of the S05.x work; until then, relative paths are the convention.)

> **Editorial voice binding.** The locked empty-state prose in EXPERIENCE.md §Voice and Tone (line 43) is the source of truth for S03.5. The string is quoted in the ACs below; S03.5 must render it verbatim (curly quotes, spaced em-dashes, sentence case, mono for "50 MB"). The teaching-card copy is **NOT locked** in EXPERIENCE.md — the headings ("What we detect" / "What we show you" / "What you can do") are pinned, but the body prose is left to S03.5 to draft from the 8 anomaly categories (FR-2) and the editorial voice. S03.5 picks minimal body prose that is faithful to FR-2, FR-3, FR-5, FR-6, FR-7 — the body MUST be reviewable against the spec for editorial-voice adherence (sentence case, no marketing copy, mono for data values).

## Story

As a **first-time visitor to WebUtilityLab / CSV Rescue who lands on the empty page before ingesting any file**,

I want **to see a clear headline, a one-sentence lede that names the JTBD, the privacy signal in view at the dropzone (per FR-9), the file-format guardrails (50 MB / UTF-8 / BOM-allowed), two CTAs that lead me into the tool (Try the example or Browse files), and three short teaching cards that explain what the tool detects / shows / lets me do**,

so that **PRD's FR-7 ("teaching the user what the tool does in the empty state") is honored, FR-9 ("privacy signal visible at the dropzone on first paint") is realized, and the EXPERIENCE.md §Information Architecture "Empty state" definition (Headline + lede + two CTAs + drop zone below + three teaching cards below the drop) is shipped. The empty state is the FIRST thing a user sees — it must be honest (no marketing copy), restrained (sentence case, mono for data, no exclamation marks), and complete (the user can decide to use the tool or leave without scrolling). The teaching cards sit BELOW the dropzone (per EXPERIENCE.md), so the dropzone is the primary interactive surface; the cards are secondary reading material for users who want to understand what the tool will do before they commit to uploading a file.**

## Acceptance Criteria

1. **Headline (`<h2>`)** sits above the dropzone in `<main>`. The headline is the JTBD sentence prefix — `Drop a CSV to find out what's wrong with it.` (sentence case, period at end, no marketing modifiers). The `<h2>` semantic level is correct (the wordmark `<h1>` lives in the page header; the headline is the page-section heading). No `<h1>` is added (the wordmark owns the page-level heading per S02.4).

2. **Lede (`<p>`)** immediately follows the headline. The lede carries the file-format guardrails and the privacy signal in the same paragraph (per EXPERIENCE.md line 45: "The block carries the JTBD sentence ('find out what's wrong with it') and the privacy signal in the same place — no scrolling required to read the claim"). The lede is a single `<p>` with the verbatim prose from EXPERIENCE.md line 43:
   > `Files up to 50 MB, UTF-8, with or without a BOM. We don't upload — this happens in your browser.`
   The string is rendered character-for-character: curly apostrophe in "don't", spaced em-dash (` — `, U+0020 U+2014 U+0020), sentence case, period at end. The mono treatment is reserved for data values ("50 MB" stays in plain prose per editorial voice — "mono for data" applies to the 50 MB token only if it's a value being acted on, not a sentence modifier; EXPERIENCE.md line 39 says "Mono for data" but the locked line 43 prose does NOT use `<code>` for "50 MB"). Spec choice: render "50 MB" as plain prose text (NOT `<code>`-wrapped) — the spec line 43 is the locked prose and it doesn't use mono.

3. **CTAs section** sits between the lede and the dropzone. Two affordances:
   - **"Try the example" button** (primary CTA). A real `<button type="button">` element. The button is visible but NOT yet wired to an action — S03.8 lands the example-CSV wiring. In S03.5 the button is `disabled` OR has a no-op handler that fires no event (S03.5's spec choice: `disabled` is the cleaner "not yet wired" signal; the S03.5 spec says `disabled` to make the "S03.8 will wire this" intent obvious to the user). The button text is exactly `Try the example` (sentence case, no period, per editorial voice). When the button is `disabled`, it carries `aria-disabled="true"` (the `<button disabled>` attribute is implicit `aria-disabled="true"` per WAI-ARIA; explicit `aria-disabled` is belt-and-braces and ensures VoiceOver / NVDA announce the disabled state correctly even if the user agent's default `<button disabled>` styling is overridden).
   - **"Browse files" link / button** (secondary CTA). This is the dropzone's affordance — S03.1 already shipped `<button class="dropzone">Browse files</button>`. S03.5 does NOT add a second "Browse files" button; the secondary CTA is the dropzone itself, with the visible text "Browse files" already in S03.1. S03.5's CTA section has ONE button (Try the example) and references the dropzone visually (e.g., the secondary CTA is rendered as a smaller `<span>` or `<a href="#dropzone">` that scrolls the user to the dropzone). **Spec choice: render "Browse files" as an anchor `<a href="#dropzone">` that smooth-scrolls to the dropzone below.** The anchor uses `scroll-behavior: smooth` (CSS) and `prefers-reduced-motion: reduce` honored (no smooth scroll when the user opts out). The anchor's text is exactly `Browse files`. The two CTAs are visually separated by a `·` (U+00B7 middle dot) per the locked EXPERIENCE.md line 43 format.
   - **Visual order**: "Try the example" appears FIRST (primary); the `·` separator; "Browse files" appears SECOND (secondary). This matches the locked prose and the IA spec ("two CTAs: 'Try the example' (primary), 'Browse files' (secondary)").

4. **Dropzone position** is unchanged. The dropzone remains the visual affordance below the CTAs. S03.5 does NOT move the dropzone; S03.5 only adds content ABOVE and BELOW it. The dropzone's accessible name ("Browse files") stays.

5. **Three teaching cards** sit BELOW the dropzone (per EXPERIENCE.md line 24). The three cards are:
   - **"What we detect"** — the 8 anomaly categories from FR-2: `duplicates`, `missing values`, `invalid emails`, `invalid dates`, `inconsistent categorical`, `outliers`, `suspicious columns`, and `PII`. The card body lists the 8 categories (one per line, sentence case, no punctuation at the end of each line). Spec choice: the list is rendered as a `<ul>` (semantic list) with each category as an `<li>`. The list is monospace (`<code>` per the editorial voice "mono for data") ONLY for the category names — the names ARE data values (they're the 8 categories the tool will report on, per FR-2). The category names stay verbatim in source — no Title Case, no marketing modifiers. Pin: `duplicates`, `missing values`, `invalid emails`, `invalid dates`, `inconsistent categorical`, `outliers`, `suspicious columns`, `PII` — these are the locked FR-2 names from the PRD and the EXPERIENCE.md line 29. The list is NOT exhaustive prose; it's a one-line-per-category enumeration.
   - **"What we show you"** — the 4 score categories from FR-3: `completeness`, `validity`, `uniqueness`, `consistency`. The card body lists the 4 categories (one per line, sentence case). Pin the locked FR-3 names verbatim. The body prose (one short line) explains that the score is 0-100 with a banded color treatment (red/amber/green); the spec says the body MUST NOT exceed 2 sentences and MUST be in the editorial voice (restrained, declarative).
   - **"What you can do"** — the cleaning CTA from FR-5 + the reversibility view: `dedupe`, `fill missing`, `validate`, `normalize categorical`, `redact PII`. The card body lists the 5 cleaning actions (one per line, sentence case). Pin the locked FR-5 names verbatim. The body prose notes that all toggles default OFF (cleaning is opt-in, conservative default per FR-5) and that the reversibility view (original-vs-cleaned diff) is shown before confirmation.

6. **Cards are structurally identical**: each card is a `<section>` with a `<h3>` heading + body content (a `<ul>` or `<p>`). The cards use a CSS class `.empty-state-card` defined in `src/styles/app.css` (the global source of truth, mirroring the `.visually-hidden` pattern from S03.4). Cards are laid out in a CSS grid (3 columns on wide viewports, 1 column stacked below ~720px — per AD-7 responsive floor). Card backgrounds use `var(--paper)`; card borders use `var(--rule)`; card padding uses `var(--space-base)`. No hex literals, no rgb() — all values via `var(--token)` per AD-8.

7. **No new dependencies.** S03.5 is App.svelte + app.css only; no `package.json` entries. No new modules — the empty-state copy is rendered directly in App.svelte (a static template; no `$state`, no helpers). Spec choice: do NOT extract `src/lib/empty-state.ts` for S03.5 — the copy is static prose; extracting a module would be premature abstraction. S03.7 / S03.8 may revisit if the empty-state content becomes state-driven (e.g., a "Try the example" button that fires an event), but S03.5's scope is the visible prose.

8. **Privacy Baseline preserved.** No `fetch` / `XMLHttpRequest` / `navigator.sendBeacon` / `EventSource` / `new Function` / `eval` / dynamic `import()` in any S03.5-touched file. App.svelte's template additions are pure markup; the `disabled` button attribute is HTML-only. `audit-privacy.mjs` stays green. The teaching-card prose mentions "PII" — this is a category label, not actual PII detection. No PII patterns are scanned or matched in S03.5.

9. **Editorial voice bound.** The teaching-card prose follows the editorial voice conventions from EXPERIENCE.md §Voice and Tone (line 39): curly quotes / apostrophes in prose (use `'` and `"` not `'` and `"`); spaced em-dashes (`word — word`); sentence-case headings; mono for data values (the 8 + 4 + 5 category names are wrapped in `<code>` per "mono for data"). The card body prose is restrained (no marketing modifiers, no exclamation marks, no rhetorical questions). Card headings are sentence case ("What we detect", NOT "What We Detect" or "WHAT WE DETECT"). The locked headline from AC1 and locked lede from AC2 are rendered character-for-character.

10. **Tests** at `tests/dropzone-empty-state.test.ts` (NEW). Mirrors the `node:fs` + `node:path` + `node:url` + `vitest` convention. Source-grep on `src/App.svelte` and `src/styles/app.css`. Coverage (11 AC21a-AC21k describe blocks):
    - **AC21a (headline)** — `appSource` contains `<h2>Drop a CSV to find out what's wrong with it.</h2>` (the locked JTBD sentence prefix from EXPERIENCE.md line 43). The `<h2>` is inside `<main>`, NOT inside `<header>` (the wordmark `<h1>` lives in `<header>`).
    - **AC21b (lede verbatim)** — `appSource` contains the exact lede string `Files up to 50 MB, UTF-8, with or without a BOM. We don't upload — this happens in your browser.` with curly apostrophe (U+2019), spaced em-dash (U+2014), and sentence case. The test pins the character-for-character form (no quoting, no marketing modifiers, no extra punctuation).
    - **AC21c (Try the example button)** — `appSource` contains `<button[^>]*>\s*Try the example\s*</button>` (the primary CTA). The button is `disabled` (no click handler in S03.5; S03.8 wires the example CSV). The test asserts `disabled` AND `aria-disabled="true"` (the explicit `aria-disabled` is load-bearing per AC3).
    - **AC21d (Browse files anchor)** — `appSource` contains `<a[^>]*href\s*=\s*["']#dropzone["'][^>]*>\s*Browse files\s*</a>` (the secondary CTA as an anchor). The anchor's `href="#dropzone"` resolves to the dropzone's `id="dropzone"` (S03.5 also adds `id="dropzone"` to the `<button class="dropzone">` mount; the S03.1 test pin still passes because the existing pin checks `<Dropzone\b[^>]*>` for positional integrity, NOT the `id` attribute).
    - **AC21e (separator)** — `appSource` contains a `·` (U+00B7 middle dot) character between the "Try the example" button and the "Browse files" anchor. The separator is a visual separator (NOT a button, NOT a link, NOT an `<a>`).
    - **AC21f (dropzone id="dropzone")** — `appSource` contains `id="dropzone"` on the dropzone's container OR on the `<Dropzone>` mount. (The S03.5 spec choice is: the `<button class="dropzone">` inside `Dropzone.svelte` gains `id="dropzone"`; the AC21d anchor scrolls to it. This is a S03.5 MOD to Dropzone.svelte's template; the S03.1 / S03.2 / S03.3 / S03.4 prior-story pins do NOT assert any specific `id` on the dropzone button, so the addition is non-conflicting.)
    - **AC21g (teaching cards rendered)** — `appSource` contains three `<section class="empty-state-card">` elements, each with an `<h3>` heading. The three headings are exactly `What we detect`, `What we show you`, `What you can do` (sentence case, no period).
    - **AC21h (What we detect — 8 categories)** — `appSource` contains the 8 locked FR-2 category names (each wrapped in `<code>` per the mono treatment): `duplicates`, `missing values`, `invalid emails`, `invalid dates`, `inconsistent categorical`, `outliers`, `suspicious columns`, `PII`. The test asserts each name appears verbatim (case-sensitive) and is wrapped in a `<code>` element (mono for data).
    - **AC21i (What we show you — 4 categories)** — `appSource` contains the 4 locked FR-3 category names (each in `<code>`): `completeness`, `validity`, `uniqueness`, `consistency`. The test asserts each name appears verbatim and is wrapped in `<code>`.
    - **AC21j (What you can do — 5 categories)** — `appSource` contains the 5 locked FR-5 cleaning actions (each in `<code>`): `dedupe`, `fill missing`, `validate`, `normalize categorical`, `redact PII`. The test asserts each name appears verbatim and is wrapped in `<code>`.
    - **AC21k (zero hex literals + zero new forbidden source patterns)** — `appSource` does NOT contain any hex color literal (`#[0-9a-fA-F]{3,8}`); `appCssSource` does NOT contain any hex color literal; `appSource` AND `appCssSource` do NOT contain any of the 12 forbidden source patterns (Privacy Baseline). The test mirrors AC20i's forbidden-pattern scan, extended to the new app.css additions.

11. **README / docs / planning-artifact changes are out of scope.** No edits to `CHANGELOG.md`, `SECURITY.md`, `docs/loop-protocol.md`, `docs/pii-patterns.md`, or the planning artifacts (post-Epic updates). Story commit is code-only.

12. **`tests/dropzone-empty-state.test.ts` passes in the production gate.** The test file is committed, runs at `npm test`, and all assertions pass on first implementation. Expected test count: ~50 sub-assertions across 11 AC21a-AC21k describe blocks (AC21k has the most — 12 forbidden patterns × 2 source files + 2 hex-literal pins = ~26; the remaining ACs have 1-6 each).

## Verification

1. `npm test` → all tests pass (556 from before S03.5 + ~50 new in `tests/dropzone-empty-state.test.ts`).
2. `npm run check` → svelte-check 0 errors + tsc 0 errors. The 1 pre-existing warning in ThemeToggle.svelte (`state_referenced_locally`) is NOT introduced by S03.5.
3. `npm run build` → `dist/` exists; 0 source maps after build-cleanup; bundle still under budget (S03.5 adds ~1-2 KB to the JS bundle for the static markup; the .css for the cards adds ~0.5 KB to the stylesheet bundle).
4. `npm run check:bundle` → under 200 KB gzipped.
5. `npm run audit:privacy` → OK; the new prose is purely visible content, no network calls.
6. `npm run audit:behavior` → OK; the empty-state content is static, no post-load requests.
7. `npm run check:deps` → OK.
8. `npm run check:telemetry` → OK.
9. **Manual / DevTools**:
   - `npm run preview`; open in Chrome with VoiceOver enabled.
   - Empty state shows: headline (h2), lede (p with curly apostrophe + spaced em-dash), CTAs ("Try the example" disabled button + "·" + "Browse files" anchor), dropzone (button), three teaching cards.
   - VoiceOver: tab order is skip-link → nav (Privacy + ThemeToggle) → "Try the example" button (disabled, announced) → "Browse files" anchor → dropzone button → each of the 3 card headings (h3) → card body content.
   - Click "Browse files" anchor. Page smooth-scrolls to the dropzone (when `prefers-reduced-motion: no-preference`); instant-jumps when reduced-motion is requested.
   - Click "Try the example" button. Nothing happens (disabled).
   - Lighthouse a11y: all 3 h3 headings recognized; no heading-level skips (h1 in header → h2 in main → h3 in cards); all buttons are real `<button>` elements; anchor has real `href`.
   - Visual: cards stack to 1 column below ~720px (responsive floor); cards use `--paper` background + `--rule` border + `--space-base` padding; no marketing-y fonts or colors.

## Loop Protocol Path Forward

1. Implement Tasks 1–6 below (App.svelte template additions + Dropzone id="dropzone" + app.css card rules + tests + verification).
2. Run production-readiness gate (Step 7 of loop).
3. Run Review #1 — 3 reviewers in parallel (blind-hunter, edge-case-hunter, verification-gap) against the diff.
4. Apply Review #1 patches if any.
5. Run Review #2 — coderabbit in fresh context against diff + Review #1 findings.
6. Apply Review #2 patches if any.
7. Flip `sprint-status.yaml` to `done`.
8. Update story file with step-05 maintenance patch notes.
9. Move to S03.6 (three teaching cards).

## Tasks / Subtasks

- [ ] **Task 1** — Read the existing source files S03.5 touches + the cross-story contract notes:
  - [ ] 1.1 Read `src/App.svelte` (already done; S03.4 page chrome + aria-live region). Note the `<main>` currently contains `<Dropzone onaccept={handleAccept} />` and the `<output>` region. S03.5 adds content ABOVE and BELOW the dropzone.
  - [ ] 1.2 Read `src/components/Dropzone.svelte` (already done; S03.3 cap-routing component). The `<button class="dropzone">Browse files</button>` is the dropzone's affordance; S03.5 adds `id="dropzone"` to this button (so the AC21d anchor can scroll to it).
  - [ ] 1.3 Read `src/styles/app.css` (already done; S02.4 + S03.4 chrome). Note the existing page-chrome rules (skip-link, header, nav, main, footer). S03.5 adds `.empty-state-card` rules + a grid layout for the three cards.
  - [ ] 1.4 Re-read EXPERIENCE.md §Information Architecture (lines 22-31) and §Voice and Tone (lines 33-49) for the locked empty-state prose and the three card headings. The locked prose on line 43 is the source of truth for AC21a + AC21b.

- [ ] **Task 2** — Modify `src/App.svelte` to add the empty-state content above and below the dropzone:
  - [ ] 2.1 SCRIPT BLOCK: no changes. S03.5's content is static template prose; no `$state`, no helpers. The `handleAccept` + `liveAnnouncement` from S03.4 are preserved.
  - [ ] 2.2 TEMPLATE BLOCK additions ABOVE the dropzone:
    - Add `<h2>Drop a CSV to find out what's wrong with it.</h2>` (the headline; sentence case; period at end; matches EXPERIENCE.md line 43 verbatim).
    - Add `<p class="empty-state-lede">Files up to 50 MB, UTF-8, with or without a BOM. We don't upload — this happens in your browser.</p>` (the lede; curly apostrophe + spaced em-dash; matches EXPERIENCE.md line 43 verbatim).
    - Add the CTAs section: `<div class="empty-state-ctas"><button type="button" disabled aria-disabled="true">Try the example</button> <span aria-hidden="true">·</span> <a href="#dropzone">Browse files</a></div>`. The `disabled` + explicit `aria-disabled="true"` is the S03.5 spec choice for the "not yet wired" signal; S03.8 will remove `disabled` and bind the example-CSV handler. The `<span aria-hidden="true">·</span>` is a decorative middle-dot separator; the `aria-hidden` ensures screen readers don't announce the separator.
  - [ ] 2.3 TEMPLATE BLOCK additions BELOW the dropzone:
    - Add three `<section class="empty-state-card">` elements, each with an `<h3>` heading + body content:
      ```svelte
      <section class="empty-state-card">
        <h3>What we detect</h3>
        <ul>
          <li><code>duplicates</code></li>
          <li><code>missing values</code></li>
          <li><code>invalid emails</code></li>
          <li><code>invalid dates</code></li>
          <li><code>inconsistent categorical</code></li>
          <li><code>outliers</code></li>
          <li><code>suspicious columns</code></li>
          <li><code>PII</code></li>
        </ul>
      </section>
      <section class="empty-state-card">
        <h3>What we show you</h3>
        <ul>
          <li><code>completeness</code></li>
          <li><code>validity</code></li>
          <li><code>uniqueness</code></li>
          <li><code>consistency</code></li>
        </ul>
      </section>
      <section class="empty-state-card">
        <h3>What you can do</h3>
        <ul>
          <li><code>dedupe</code></li>
          <li><code>fill missing</code></li>
          <li><code>validate</code></li>
          <li><code>normalize categorical</code></li>
          <li><code>redact PII</code></li>
        </ul>
      </section>
      ```
  - [ ] 2.4 Update the docblock at the top of App.svelte: note that S03.5 adds the visible empty-state content (headline, lede, CTAs, three teaching cards); S03.7 will replace the visible empty-state content with a reducer-driven state-machine UI (the cards stay visible in the empty state; they morph or hide in the active / processing / refusal / results states).

- [ ] **Task 3** — Modify `src/components/Dropzone.svelte` to add `id="dropzone"` to the dropzone button:
  - [ ] 3.1 Change `<button type="button" class="dropzone"` to `<button id="dropzone" type="button" class="dropzone"` on the dropzone button (line 215-217). The `id` is the scroll target for the AC21d "Browse files" anchor.
  - [ ] 3.2 The S03.1 test pins (`tests/dropzone.test.ts`) do NOT assert any specific `id` attribute on the dropzone button — adding `id="dropzone"` is non-conflicting. The S03.2 / S03.3 / S03.4 pins also do not assert against the dropzone button's `id` attribute.
  - [ ] 3.3 NO other changes to Dropzone.svelte (the cap-routing logic, the `onaccept` prop, the `handlePickerChange` declaration are unchanged).

- [ ] **Task 4** — Add `.empty-state-card` rules + the grid layout to `src/styles/app.css`:
  - [ ] 4.1 Add `.empty-state-card { background: var(--paper); border: 1px solid var(--rule); border-radius: var(--radius-default); padding: var(--space-base); }` — the card surface. All values via `var(--token)` per AD-8.
  - [ ] 4.2 Add `.empty-state-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-base); margin-top: var(--space-section); }` — the 3-column grid. Responsive floor: `@media (max-width: 720px) { .empty-state-cards { grid-template-columns: 1fr; } }` — stacks to 1 column on narrow viewports. The breakpoint uses `max-width: 720px` (mobile-first collapse); the rule is gated behind `@media (prefers-reduced-motion: no-preference)` ONLY for transitions (S03.5 has no transitions).
  - [ ] 4.3 Add `.empty-state-ctas { display: flex; align-items: center; gap: 0.5rem; margin-block: var(--space-base); }` — the CTA row.
  - [ ] 4.4 Add `html { scroll-behavior: smooth; }` + `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }` — the smooth-scroll for the "Browse files" anchor, with the reduced-motion override per AD-9.
  - [ ] 4.5 Add `.empty-state-lede { color: var(--graphite); margin-block: var(--space-base); }` — the lede's muted color (graphite, not ink, per the editorial posture of secondary prose).
  - [ ] 4.6 NO hex literals, no rgb(), no inline `<style>` in any S03.5-touched file.

- [ ] **Task 5** — Write `tests/dropzone-empty-state.test.ts` (NEW):
  - [ ] 5.1 File preamble: `node:fs` + `node:path` + `node:url` + `vitest` imports. `here = fileURLToPath(new URL('.', import.meta.url))`; `repoRoot = join(here, '..')`. Constants for `appPath`, `dropzonePath`, `appCssPath`, plus the 4 prior-story test paths. Read each file once at top of describe block. Define `stripComments` helper (mirror S03.1 / S03.2 / S03.3 / S03.4).
  - [ ] 5.2 AC21a: headline `<h2>Drop a CSV to find out what's wrong with it.</h2>` is rendered inside `<main>` (NOT inside `<header>`). The test asserts the headline text and the positional pin (h2 between `<main` and `</main>`, but NOT between `<header` and `</header>`).
  - [ ] 5.3 AC21b: lede `<p class="empty-state-lede">` carries the verbatim prose from EXPERIENCE.md line 43. The test pins the curly apostrophe (U+2019), the spaced em-dash (U+2014), the file-format guardrails (50 MB / UTF-8 / BOM), and the privacy signal (We don't upload — this happens in your browser).
  - [ ] 5.4 AC21c: "Try the example" button is `<button type="button" disabled aria-disabled="true">`. The test pins `disabled` AND `aria-disabled="true"` (both attributes are present). The test also asserts the button text is exactly `Try the example` (sentence case, no period).
  - [ ] 5.5 AC21d: "Browse files" anchor is `<a href="#dropzone">Browse files</a>`. The test pins the `href="#dropzone"` and the anchor text `Browse files`.
  - [ ] 5.6 AC21e: separator `<span aria-hidden="true">·</span>` (the middle-dot separator; aria-hidden so screen readers skip it).
  - [ ] 5.7 AC21f: dropzone button has `id="dropzone"` (the scroll target). The test asserts the `id="dropzone"` attribute on the dropzone button (mirror of AC21d's `href="#dropzone"`).
  - [ ] 5.8 AC21g: three teaching cards are `<section class="empty-state-card">` with `<h3>` headings. The test pins the three heading strings verbatim: `What we detect`, `What we show you`, `What you can do`.
  - [ ] 5.9 AC21h: "What we detect" card contains the 8 FR-2 categories, each wrapped in `<code>`. The test asserts each category name appears exactly once (or at least once) and is wrapped in `<code>...</code>`.
  - [ ] 5.10 AC21i: "What we show you" card contains the 4 FR-3 categories, each wrapped in `<code>`. Same pattern as AC21h.
  - [ ] 5.11 AC21j: "What you can do" card contains the 5 FR-5 cleaning actions, each wrapped in `<code>`. Same pattern as AC21h.
  - [ ] 5.12 AC21k: zero hex literals in App.svelte + app.css (AD-8) + zero forbidden source patterns (Privacy Baseline) in BOTH files. Mirror AC20i's forbidden-pattern list.

- [ ] **Task 6** — Run the production-readiness gate (mirror S03.1 / S03.2 / S03.3 / S03.4 Task 6):
  - [ ] 6.1 `npm test` → all 556 prior tests + ~50 new in `tests/dropzone-empty-state.test.ts` pass.
  - [ ] 6.2 `npm run check` → 0 errors + 1 pre-existing ThemeToggle warning.
  - [ ] 6.3 `npm run build` → bundle under budget; 0 source maps.
  - [ ] 6.4 `npm run check:bundle` → under 200 KB gzipped.
  - [ ] 6.5 `npm run audit:privacy` → OK.
  - [ ] 6.6 `npm run audit:behavior` → OK.
  - [ ] 6.7 `npm run check:deps` → OK.
  - [ ] 6.8 `npm run check:telemetry` → OK.

- [ ] **Task 7** — Open a local commit (no push yet): `S03.5 done: empty-state copy from EXPERIENCE.md (headline, lede, two CTAs, three teaching cards); dropzone gets id="dropzone" for the Browse files anchor (S03.8 wires the Try the example handler; S03.7 morphs the empty state to the active state)`.

## Dev Notes

### Source files this story touches

| File | Status | Surface S03.5 changes |
|---|---|---|
| `src/App.svelte` | **MODIFIED** | Adds `<h2>` headline + `<p class="empty-state-lede">` lede ABOVE the dropzone. Adds `<div class="empty-state-ctas">` CTAs section. Adds `<div class="empty-state-cards">` with three `<section class="empty-state-card">` BELOW the dropzone. ~50 lines net added (template prose + card markup). |
| `src/components/Dropzone.svelte` | **MODIFIED** | Adds `id="dropzone"` to the dropzone `<button>` (so the AC21d "Browse files" anchor scrolls to it). 1 line changed. |
| `src/styles/app.css` | **MODIFIED** | Adds `.empty-state-card` + `.empty-state-cards` + `.empty-state-ctas` + `.empty-state-lede` rules + `html { scroll-behavior: smooth }` + the `@media (max-width: 720px)` collapse + the `@media (prefers-reduced-motion: reduce)` override. ~15 lines added. |
| `tests/dropzone-empty-state.test.ts` | **NEW** | 11 AC21a-AC21k describe blocks; ~50 sub-assertions. |

### Files S03.5 does NOT touch (avoid scope creep)

| File | Why leave alone |
|---|---|
| `src/components/Dropzone.svelte` (script block) | The cap-routing logic, the `onaccept` prop, the `handlePickerChange` declaration are all S03.3's; S03.5 only adds `id="dropzone"` to the button. |
| `src/components/ThemeToggle.svelte` | The theme toggle is the nav's affordance; S03.5 doesn't touch it. |
| `src/lib/*` | No new modules. The empty-state copy is static template prose; S03.5 doesn't extract a module. |
| `src/worker/*` | E05+ territory. |
| `src/styles/tokens.css` | No new tokens; the S03.5 CSS uses existing `var(--paper)`, `var(--rule)`, `var(--space-base)`, `var(--space-section)`, `var(--radius-default)`, `var(--graphite)`. |
| `index.html` | Unchanged. |
| `src/main.ts` | Unchanged. |
| `package.json` | No new deps. |

### Cross-story contract notes

- **S03.6 will land the teaching-card visual styles** — wait, S03.6 is "three teaching cards below the drop" per sprint-status. This collides with S03.5's AC5 / AC21g. The S03.6 spec needs to be re-scoped: S03.5 lands the visible card content + the basic `.empty-state-card` rule; S03.6 should land the visual depth / interaction / focus styles for the cards (e.g., a hover lift, an expanded detail view per category, the per-category iconography). Spec note for S03.6: re-scope to "the interactive surface of the teaching cards" (hover, focus, click-to-expand for the 8 + 4 + 5 categories); S03.5 owns the static visible content.

- **S03.7 will wire the reducer consumer + state-machine** — S03.7 replaces the App.svelte `handleAccept` with a reducer-driven state machine. The empty-state content S03.5 lands stays visible in the `empty` state; in the `active` / `processing` / `refusal` / `results` states, the empty-state content morphs (e.g., the headline changes to "Working…" or "Choose a smaller file"). S03.5 doesn't add any state-driven logic; the static content is the S03.5 contract.

- **S03.8 will wire the Try the example button** — S03.5 leaves the button `disabled` + `aria-disabled="true"` with no click handler. S03.8 removes `disabled`, adds the click handler that loads the example CSV (from `src/lib/example-csv.ts` per S03.8's spec), and dispatches the same `{ kind: 'drop'; file }` event that a user-picked file would. The aria-live region (S03.4) then announces "File accepted: sample.csv" — the same path as a user-picked file.

- **E04 will land the pre-flight time estimate** — the S03.5 "Working…" text (mentioned in EXPERIENCE.md §State Patterns) is owned by E04 / S04.x, NOT by S03.5. S03.5 is purely the empty-state prose.

- **E13 will run the full a11y audit** — S03.5's heading hierarchy (h1 in header → h2 in main → h3 in cards) is correct per AD-9 ("Semantic HTML throughout — `header` / `main` / `footer` / `section` / `h1` / `h2` / `button` / `a`"). S03.5 doesn't run axe-core (that's E13), but the hierarchy is structured correctly.

### Out-of-scope clarifications (explicit non-goals for S03.5)

- **No "Try the example" wiring.** S03.5 renders the button as `disabled`; S03.8 wires it.
- **No state-driven content.** S03.5's content is static; S03.7's state machine drives the empty → active → results morph.
- **No teaching-card interactivity.** S03.5's cards are static `<section>` + `<ul>` lists; S03.6 adds the interactive surface (hover, focus, click-to-expand per the 8 + 4 + 5 categories).
- **No "Try the example" example-CSV content.** S03.8 lands the example CSV; S03.5 doesn't author or import any sample data.
- **No reduced-motion override for the theme transition.** S03.5 doesn't touch the theme toggle's CSS; S02.5 owns the theme transition.
- **No `$lib` path alias.** S03.5 doesn't import any new modules; the spec doesn't add imports.

### Anti-patterns to avoid (per E02 retro's "What was hard" lessons)

- **CSS property vs custom-property confusion** (S02.6 lesson): S03.5's CSS uses `var(--token)` for every value — `var(--paper)`, `var(--rule)`, `var(--space-base)`, `var(--space-section)`, `var(--radius-default)`, `var(--graphite)`. No hex literals, no rgb().
- **Spec implies a directory walk, not a per-file scan** (S02.5 lesson): AC21k's negative-assertion scan is bounded to App.svelte + app.css + Dropzone.svelte's button modification (the `id="dropzone"`); the broader `src/` walk is the S02.6 test's job.
- **Description-string anchor for boundary pins** (S02.5 lesson): AC21's prior-story boundary pins (the 4 prior-story test files) use the same description-string anchors as S03.1 / S03.2 / S03.3 / S03.4. AC21g's "three `<section class="empty-state-card">` elements" is the count pin; the description-string anchors (the FR-2 / FR-3 / FR-5 category names) are the verbatim-content pins.
- **Svelte 4 event handler syntax reappearing**: S03.5 doesn't bind any new event handlers (the `Try the example` button is `disabled` with no handler; the `Browse files` anchor uses native `href` navigation, not `onclick`). No Svelte 4 syntax risk.
- **Per-component test creep**: S03.5 keeps `tests/dropzone.test.ts` (S03.1), `tests/dropzone-drag-paste.test.ts` (S03.2), `tests/dropzone-file-cap.test.ts` (S03.3), `tests/dropzone-aria-live.test.ts` (S03.4) untouched; S03.5's tests live in `tests/dropzone-empty-state.test.ts`. This preserves the per-story test surface for regression tracking.

### Verification gap risk (review-time prediction)

The most likely review-time finding on S03.5: **The verbatim locked prose.** EXPERIENCE.md line 43's prose is character-for-character; a typo (e.g., ASCII apostrophe instead of curly, em-dash without spaces, wrong "50 MB" capitalization) would fail AC21b. The test must pin the exact string, not just a regex.

The second most likely finding: **The card count pin.** AC21g asserts "three `<section class="empty-state-card">` elements". A regression that adds a fourth card (e.g., a "Privacy" card that duplicates the lede) would fail this pin. The count is load-bearing for the IA spec.

The third most likely finding: **The mono treatment for category names.** AC21h / AC21i / AC21j require each category name to be wrapped in `<code>`. A regression that uses `<em>` or `<span>` instead fails the editorial-voice pin ("mono for data" is a hard rule).

The fourth most likely finding: **The dropzone `id="dropzone"` collision.** S03.1's AC17b pins `id="file-input"` on the `<input type="file">` element. S03.5 adds `id="dropzone"` to the `<button class="dropzone">` — different element, different id. No collision. The test must verify the `id="dropzone"` is on the BUTTON, not the input.

The fifth most likely finding: **The "Try the example" disabled button's accessibility.** AC21c pins `disabled` AND `aria-disabled="true"`. WAI-ARIA says `aria-disabled="true"` on a `<button disabled>` is redundant (the `disabled` attribute already implies `aria-disabled`). S03.5 keeps both for belt-and-braces (some user-agent default styles for `<button disabled>` can be overridden by CSS, breaking the visual cue; the explicit `aria-disabled` ensures the AT announcement is consistent across browsers). The redundancy is documented in the AC21c test's docblock.

### References

- [Source: _bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/EXPERIENCE.md#information-architecture] — "**Empty state** — Teaching per FR-7. Privacy signal visible at the dropzone (FR-9). Headline + lede + two CTAs: 'Try the example' (primary), 'Browse files' (secondary). Drop zone below. Three teaching cards below the drop ('What we detect' / 'What we show you' / 'What you can do')." (line 24). S03.5 ships this surface.
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/EXPERIENCE.md#voice-and-tone] — "**Empty-state copy (locked).** Drop a CSV to find out what's wrong with it. Files up to 50 MB, UTF-8, with or without a BOM. We don't upload — this happens in your browser. [Try the example] · [Browse files]" (lines 41-43). S03.5 ships the verbatim prose.
- [Source: _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md#fr-7] — "teaching the user what the tool does in the empty state". S03.5 ships the three teaching cards (What we detect / What we show you / What you can do).
- [Source: _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md#fr-9] — "privacy signal visible at the dropzone on first paint". S03.5 ships the privacy signal in the lede (We don't upload — this happens in your browser).
- [Source: _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md#fr-2] — 8 anomaly categories. S03.5 ships these as the locked FR-2 names in the "What we detect" card.
- [Source: _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md#fr-3] — 4 score categories. S03.5 ships these as the locked FR-3 names in the "What we show you" card.
- [Source: _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md#fr-5] — 5 cleaning actions. S03.5 ships these as the locked FR-5 names in the "What you can do" card.
- [Source: _bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/ARCHITECTURE-SPINE.md#accessibility-floor-ad-9] — "Semantic HTML throughout — `header` / `main` / `footer` / `section` / `h1` / `h2` / `button` / `a`". S03.5's markup uses the correct semantic levels (h1 → h2 → h3).
- [Source: _bmad-output/implementation-artifacts/3-4-file-name-reveal-in-aria-live-region.md#cross-story-contract-notes] — "S03.5 will land the empty-state copy — S03.4's aria-live region is screen-reader-only; the visible banner ('Results ready — N problems found') is S03.5 / E04 territory. S03.4 doesn't add any visible banner." (S03.5 confirms: no visible banner; just static empty-state prose + cards).
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml#development_status] — 3-5-empty-state-copy-from-experience-md: backlog (will flip to in-progress at S03.5 implementation start).

## Dev Agent Record

### Agent Model Used

TBD (filled at implementation time)

### Debug Log References

TBD

### Completion Notes List

TBD

### File List

TBD
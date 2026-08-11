---
title: WebUtilityLab / CSV Rescue — Epics & Stories
created: 2026-08-11
updated: 2026-08-11
status: final
altitude: epic
sources:
  - _bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/SOLUTION-DESIGN.md
  - _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md
  - _bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/EXPERIENCE.md
  - project-context.md
---

# WebUtilityLab / CSV Rescue — Epics & Stories

## How to read this file

13 epics, each ships one AD or one user-visible capability. Stories are sized for a single sitting. The **Privacy gate** is the MVP acceptance test: every epic must pass it before the next starts.

**Acceptance test for any epic to ship:**

1. **Source grep:** `grep -rE 'fetch|XMLHttpRequest|navigator\.sendBeacon|new Image\(\)|EventSource|preconnect|prefetch|a ping=|dns-prefetch|document\.createElement\(.script.\)' src/` returns no production matches. The grep covers the full set of side-channel vectors identified in the privacy review (H1, H4) — not only `fetch`.
2. **dist grep:** `grep -rE 'fetch|XMLHttpRequest|sendBeacon|google-analytics|gtag|googletagmanager|hotjar|mixpanel|sentry|fullstory|plausible|cloudflareinsights|@font-face|fonts\.googleapis|fonts\.gstatic' dist/` returns no matches. Also greps `<img src>`, `<a ping>`, `<source src>`, `<video poster>`, `<meta http-equiv="refresh">` for any non-self origin.
3. **dist color-literal grep:** `grep -rE '#[0-9a-fA-F]{3,8}\b' dist/**/*.css` returns no hex literals outside `:root` / `.dark` token blocks; all component CSS must consume `var(--*)` tokens.
4. **DevTools behavioral check** (Puppeteer/Playwright in CI): drive an interaction sequence — load → empty state visible → drop a 5 KB fixture CSV → results page visible → open cleaning modal → close. Assert **zero requests** across the full sequence, not just `networkidle`. Includes an assertion that `navigator.serviceWorker.getRegistrations()` returns empty.
5. **Hardening headers check** (per-PR gate, E13): `curl -sI https://<host>/` must include `content-security-policy: ... connect-src 'none' ...`, `x-content-type-options: nosniff`, `referrer-policy: no-referrer`, `permissions-policy: camera=(), microphone=(), ...`, `cross-origin-opener-policy: same-origin`, `cross-origin-embedder-policy: require-corp`, `cross-origin-resource-policy: same-origin`. Missing or weakened headers block the PR. The CSP source string itself lives at `infra/csp.txt` and is deployed verbatim — not free-text in a story.
6. **Transitive denylist:** `npm ls --all --json` is diffed against `scripts/known-telemetry-deps.json` (denylist of known phone-home packages: `@sentry/*`, `@fullstory/*`, `@hotjar/*`, `posthog-js`, `@datadog/*`, etc.). Any package in the denylist blocks the PR.
7. **Reproducible build + manifest:** each `/v1/{path}` release ships with `dist-manifest.json` listing the Git SHA, build timestamp, and SHA-256 of every asset in `dist/`. `git checkout <sha>; npm ci; npm run build; sha256sum dist/*` must reproduce the manifest hashes. Verified on every release.
8. **R2 config audit:** the deployed bucket's access-log setting is verified off. The dashboard snapshot is committed at `audit/r2-config.json` with a timestamp + SHA, regenerated on every release. The "R2 default" claim is retired in favor of this published artifact.
9. **AD enforcement:** the AD(s) named under "Anchors" are observably enforced.
10. **Vitest coverage** on the unit under test.
11. **a11y scan** (for epics with rendered UI — E02, E03, E04, E10, E11, E12): `axe-core` returns zero serious/critical violations.
12. **Bundle budget:** `dist/` total transfer size (gzipped) ≤ 200 KB. Blocking CI check (defined in SOLUTION-DESIGN.md §"What ships").
13. **No CSV injection in cleaned output:** when E11 lands, golden test downloads the cleaned file and `grep -E '^[=+\-@\t\r]' cleaned.csv` returns no rows whose first cell begins with a formula trigger.
14. **PII regex safety:** every pattern in `src/lib/pii-patterns.json` passes a ReDoS check (no nested quantifiers, no overlapping alternations, backtracking bounded). CI runs the check on every commit.
15. **Worker abort:** the `abort` envelope phase exists and the worker checks an abort flag inside its tight loops; cancel-from-processing terminates the worker cleanly within 100 ms (test in E05).
16. **Tab-close lifecycle:** `dist/` ships no service worker, no `IndexedDB` usage, no `Cache API` usage, no `sessionStorage` usage outside theme. Theme (`wul-theme` key in `localStorage`) is the only persisted state. Verified by source grep + `navigator.serviceWorker.getRegistrations()` empty assertion.
17. **CSP `style-src` hardening** (when E02 lands): `'unsafe-inline'` on style-src is replaced with `'sha256-<base64>'` hashes computed at build time from Svelte's inline `<style>` blocks. The hash list is committed at `infra/style-hashes.txt` and re-verified on every build. The "audit confirms no dynamic CSS injection" prose is replaced by this CI gate.

---

## E01 — Repo scaffold & CI

**Anchors:** AD-1 (stack), LICENSE (MIT), build-time calls (Vitest, hidden-source-map, R2).
**User-visible outcome:** `npm install && npm run build && npm run preview` boots a blank Vite + Svelte 5 + TS page at `localhost`; CI runs `npm test` and `npm run build` on every push.

**Stories**

- **S01.1** Initialize Vite + Svelte 5 + TypeScript project. `package.json`, `tsconfig.json`, `vite.config.ts`. Run `npm run build`; confirm `dist/` is produced.
- **S01.2** Add Vitest with the same Vite worker syntax used in production. First passing test on a stub module.
- **S01.3** Configure production build with `hidden-source-map` and source-map upload pipeline (deferred — manual upload only for now; no auto-upload).
- **S01.4** Add `LICENSE` (MIT, full text).
- **S01.5** GitHub Actions: `npm test` + `npm run build` + `npm run audit:privacy` on push to `main` and on **every PR** (not just main). Required check on the default branch.
- **S01.6** DevTools behavioral verification script: Puppeteer/Playwright drives load → drop → results → modal → close; asserts zero requests across the full sequence. Lives in `scripts/audit-privacy.mjs`. Required to pass on every CI run.
- **S01.7** Per-epic dep-tree no-network check: a `scripts/check-deps.mjs` runs `npm ls --all` and asserts no package known to phone home. Gates every subsequent epic. Updated `SECURITY.md` per epic landing.
- **S01.8** Pin dev-dep note: document Playwright's build-time browser-binary download (`playwright.azureedge.net`) as a known dev-side effect; the privacy claim covers runtime, not build-time dev tooling. `SECURITY.md` §"Build-time tooling" carries the disclosure.
- **S01.9** Bundle budget gate: `scripts/check-bundle-size.mjs` asserts the gzipped `dist/` total ≤ 200 KB. Blocking CI check.
- **S01.10** Transitive-telemetry scanner: integrate a scanner (Socket, npm-audit-resolver with custom rules, or a hand-maintained denylist in `scripts/check-telemetry.mjs`) that catches telemetry-adding transitive deps on every PR, not only on push-to-main. Required because patch releases can introduce telemetry between audits.
- **S01.11** Dependency pinning: `package.json` declares exact versions for runtime deps; CI uses `npm ci` (not `npm install`) to enforce the lockfile.

**Privacy gate:** Zero requests after page load on the empty stub page.

---

## E02 — Visual tokens, theme, empty page chrome

**Anchors:** AD-7 (theme), AD-8 (token discipline), AD-9 (skip-link, focus rings, semantic HTML), AD-10 (editorial conventions), Privacy Baseline (no fonts).
**User-visible outcome:** A blank editorial page with the wordmark, theme toggle (persists across reload), and `Skip to main content` as the first tab stop. The page reads "WebUtilityLab / CSV Rescue" and nothing else.

**Stories**

- **S02.1** Copy tokens from `DESIGN.md` into `src/styles/tokens.css`. Two blocks: `:root` (light) and `.dark`. Every semantic color present.
- **S02.2** Inline theme-seed script in `index.html`: read `localStorage.wul-theme`, fall back to `prefers-color-scheme`, flip `<html class="dark">` before paint.
- **S02.3** `ThemeToggle.svelte` (AD-7): button, `aria-pressed`, label switches "Dark"/"Light", sun/moon glyphs decorative, writes `wul-theme` to `localStorage`. Live region announcement on flip. **Cross-tab sync** via `window.addEventListener('storage', ...)` so toggling in one tab updates the other (5-line change; deferring it ships a bug users report).
- **S02.4** Page chrome: `<header>` with wordmark, `<nav>` with Privacy link + theme toggle, `<main>` with skip-link target, `<footer>`. Semantic HTML only; no `<div onClick>`.
- **S02.5** Focus ring rule: `2px solid var(--accent)`, `2px` offset, applied to every focusable element via `:focus-visible`.
- **S02.6** Editorial posture sanity: page renders `system-ui`; no font-face declarations; view-source confirms zero network requests.

**Privacy gate:** Zero requests, no `@font-face`, no web font link.

---

## E03 — Dropzone & file picker

**Anchors:** AD-9 (skip-link on empty state, focus, aria-live), PRD FR-1 (50 MB cap, UTF-8 with/without BOM), empty-state copy from EXPERIENCE.md.
**User-visible outcome:** Empty state matches the UX mock. User can click or drag-drop a file; the file name appears in an aria-live region; files over 50 MB are rejected with a strict-brief error.

**Stories**

- **S03.1** Real `<button>` dropzone (AD-9 — no `div onClick`). Opens a real file picker. Hover and dragover styling.
- **S03.2** Drag-and-drop handler; paste handler for dropped text.
- **S03.3** 50 MB cap check before reading. Over-cap file → strict-brief error message `[specific finding] — [rule]. [next action].` in an aria-live region.
- **S03.4** File-name reveal in aria-live region on accept (EXPERIENCE.md §"Component Patterns" → Dropzone).
- **S03.5** Empty-state copy from EXPERIENCE.md (locked): "Drop a CSV to find out what's wrong with it. Files up to 50 MB, UTF-8, with or without a BOM. We don't upload — this happens in your browser. [Try the example] · [Browse files]". Privacy signal visible at the dropzone (FR-9). Editorial voice bound: curly quotes, spaced em-dashes, mono for data.
- **S03.6** Three teaching cards below the drop ("What we detect" / "What we show you" / "What you can do"). Copy authored in `src/lib/copy/teaching-cards.ts`; bound to EXPERIENCE.md editorial voice (curly quotes, spaced em-dashes, mono for data), **not** lifted verbatim from the PRD.
- **S03.7** Accept path emits a `File` reference (no read yet) to the reducer. Actual reading + BOM detection happens in E06. The dropzone story here is purely the gesture; the worker side lands later.
- **S03.8** Example CSV: the "Try the example" path is **zero-network**. The fixture CSV is inlined at build time into the JS bundle as a string constant, and a `File` is constructed in-memory via `new File([csvString], 'sample.csv', { type: 'text/csv' })`. The fixture source still lives at `public/examples/sample.csv` for E08's fixture set and for offline review; the build step (`scripts/inline-example.mjs`) reads it once at build time and embeds it into a generated module. This satisfies the source-grep (no `fetch` anywhere) and the dist-grep (no `examples/sample.csv` reference in the deployed HTML). The user-visible button label stays "Try the example"; the deployed HTML no longer carries a fetch path.
- **S03.9** Strict-brief error path: over-50 MB rejection uses the shared `formatStrictBrief()` from `src/lib/strict-brief.ts` (owned by E05). E03 imports the formatter; it does not author its own.

**Privacy gate:** Zero requests. DevTools confirms only local file read on accept.

---

## E04 — Pre-flight estimate & refusal state

**Anchors:** FR-6 (10s budget), AD-5 (state machine gains `refusal` state), EXPERIENCE.md §"Pre-flight time-band".
**User-visible outcome:** When a file is accepted, the page shows "Working… (~Ns ±30%)" with the band in mono. If the upper bound exceeds 10s, the page advances to refusal state with three CTAs — no worker is spawned.

**Stories**

- **S04.1** Pre-flight heuristic in `src/lib/estimate.ts`: `heuristicMs = bytes / throughput_kbps`; `upperMs = heuristicMs * 1.30`. Tunable throughput constant (start at 2 MB/s). **E04 closes only after a calibration pass: profile pass-1 + pass-2 throughput on three hardware tiers (Apple Silicon, 2018 Intel, low-end Chromebook) across a 5 MB, 10 MB, and 30 MB fixture, and adjust the constant + widen the band if needed.** Acceptance: the refusal state fires on real-world files that would have blown the 10s budget under the naive constant.
- **S04.2** State machine extension: `active → processing` when `upperMs ≤ 10_000`; `active → refusal` otherwise. No worker spawn in the refusal branch.
- **S04.3** Refusal page UI: H1 ("This file is larger than we can analyze in 10 seconds."), mono data line (`{size} / ~{band} ±30% / 10s`), three CTAs (Choose smaller file / Sample 1000 rows / Pick 3 columns), helper line, privacy reminder. Reference mock: `mockups/key-screen-refusal.html` (rendered in E04 as a tracked artifact; not lifted from the planning-artifact `.working/` directory).
- **S04.4** Time-band UI: during `processing`, render "Working… (~Ns ±30%)" with the band in mono inline. Static text — no spinner (EXPERIENCE.md accessibility floor).
- **S04.5** Cancel-from-processing: a "Cancel" affordance during `processing` transitions back to `empty`. Posts `{ phase: 'abort' }` to the worker; the worker checks an abort flag inside its tight loops and terminates cleanly within 100 ms. The main thread drops the worker reference and revokes any object URLs. No partial results rendered.
- **S04.6** Worker cold-start: measure cold-start latency on first file accept; if it materially eats into the budget, prime the worker eagerly on `empty` state (S05.5).
- **S04.7** Tests: synthetic 60 MB file → refusal; synthetic 5 MB file → processing; cancel during processing → empty; abort propagates within 100 ms.

**Privacy gate:** DevTools shows zero requests during refusal rendering. Refusal state is reached without worker spawn.

---

## E05 — Worker boundary & state machine

**Anchors:** AD-3 (Web Worker boundary, typed Envelope), AD-5 (single immutable state snapshot), AD-9 (focus moves, skip-link variants).
**User-visible outcome:** Main thread owns the reducer and DOM; worker is reachable but does nothing yet. State transitions emit to the reducer with full type safety. Skip-link switches between "Skip to main content" and "Skip to problems" by state.

**Stories**

- **S05.1** `src/lib/types.ts`: `State`, `Finding`, `Column`, `Score`, `Setting` (UI state). Pure types, no behavior.
- **S05.2** `src/lib/envelope.ts`: `Envelope` discriminated union — `estimate | progress | partial | refusal | results | cleaned | error | abort`. Worker contract lives in one file. The `error` variant carries `{ kind, finding }`. The `abort` variant is sent from main → worker to terminate in-flight loops (S04.5). Includes an `isEnvelope()` type guard.
- **S05.3a** `src/lib/state/state-types.ts`: state types and the discriminated `State` union (one of `empty | active | processing | refusal | results | modal-open | building`).
- **S05.3b** `src/lib/state/reducer.ts`: reducer happy-path transitions covering the full state machine (per ARCHITECTURE-SPINE.md §"State machine"). Every transition tested.
- **S05.3c** `src/lib/state/reducer-errors.ts`: invalid-transition discriminated error returns and tests. Total reducer code split across three files; each fits a single sitting.
- **S05.4** `src/lib/strict-brief.ts`: shared `formatStrictBrief({ finding, rule, next })` helper. Locked microcopy template. Owned here so E03's over-50 MB rejection, E12's error page, and any future strict-brief call sites import the same formatter.
- **S05.5** `src/worker/index.ts`: worker entry; receives `Envelope` messages; for now, echoes them. Vite worker syntax verified: `new Worker(new URL('./index.ts', import.meta.url), { type: 'module' })`. The worker module is **cached across file accepts** — only one `new Worker(...)` per session, attached once on first `active` state. Subsequent accepts reuse the same instance.
- **S05.6** `src/components/App.svelte`: subscribes to state via runes; renders the right surface per state.
- **S05.7** Skip-link conditional: empty state → "Skip to main content"; results state → "Skip to problems" (and results-header focus via `tabindex="-1"` + `.focus()` on state change).
- **S05.8** Build rule: any `import` from `worker/*` in a main-thread module, or any `import` from `svelte` in `worker/*`, fails `tsc` (covered by tsconfig path restrictions).

**Privacy gate:** Zero requests. Worker boots without network. Module boundary enforced by build.

---

## E06 — Streaming CSV parser & BOM detection

**Anchors:** AD-2 (streaming parser, BOM surfaced per FR-1).
**User-visible outcome:** Worker receives a `File`, streams it through `TextDecoderStream`, emits a token stream (`row | field | quote | escape | BOM | EOF`). BOM is surfaced as a finding (one of the 8 categories), never silently stripped.

**Stories**

- **S06.1** `src/worker/parser.ts`: `File.stream()` → `TextDecoderStream` (`utf-8`, `fatal: false`) → character-by-character state machine emitting `row | field | quote | escape | EOF` tokens.
- **S06.1a** **Encoding sniff at first chunk:** before committing to `TextDecoderStream`, read the first ~4 KB and detect: UTF-8 BOM (`0xEF 0xBB 0xBF`), UTF-16 LE BOM (`0xFF 0xFE`), UTF-16 BE BOM (`0xFE 0xFF`), or ASCII ratio. If UTF-16 is detected, surface an `encoding` error envelope (`fatal: false` would silently corrupt). If neither BOM is present and ASCII ratio is < 0.5, surface a strict-brief "could not detect encoding" error.
- **S06.2** Quoted-field handling: opening/closing `"`, escaped `""`, line breaks inside quoted fields, trailing commas in JSON context (out of scope; CSV only).
- **S06.2a** **Per-field byte cap:** any single field that exceeds 1 MB emits a strict-brief finding (oversized field — likely a malformed CSV) and the parser skips to the next field boundary. Bounds the field-buffer memory DoS surface (rows-cap doesn't catch 50 MB single-quoted strings).
- **S06.3** BOM detection: first 3 bytes `0xEF 0xBB 0xBF` flagged as a BOM token; surfaced in `Envelope` partial findings as a `bom` category finding.
- **S06.4** Adapter to detection: parser emits row-by-row callbacks; downstream consumer (stats pass) subscribes.
- **S06.4a** **Pass-1 → Pass-2 materialization contract:** `stats.ts` returns `ColumnStats[]`; `detect.ts` consumes that array and **re-reads the file from the `File` reference** (cheap; disk I/O variance bounded by pass-1 cost). Re-parsing avoids the 2× memory footprint of holding the token stream + stats simultaneously. The architecture's "O(columns)" promise is preserved.
- **S06.5** Tests on fixtures: plain ASCII, quoted commas, embedded newlines, BOM at start, CRLF vs LF, malformed trailing quote, UTF-16 hidden inside UTF-8, 1 MB single-quoted field, 1M unclosed quotes.
- **S06.6** Row-count ceiling: parser hard-caps at 1,000,000 rows; exceeding emits a strict-brief error (over-cap; reduce row count and try again) without crashing the worker. Memory remains bounded.
- **S06.7** Total-string-byte cap: the worker tracks total retained bytes across all rows in pass-1's sample buffer + pass-2's affected-row indices. Hard cap at 100 MB; exceeding emits a strict-brief error.

**Privacy gate:** Worker reads no network. Memory profile holds: O(columns), not O(file).

---

## E07 — Pass 1: column-wise streaming statistics

**Anchors:** AD-4 (pass 1: column stats), AD-12 (schema inference shape).
**User-visible outcome:** Worker consumes the token stream and produces a `ColumnStats` record per column: `typeInference`, `nonNull`, `distinct`, `casingVariants`, numeric `min/max/mean/sigma`, length `min/max`, `sample[]`. Pass 1 completes before pass 2 begins.

**Stories**

- **S07.1** `src/worker/stats.ts`: subscribes to parser tokens; maintains per-column accumulators.
- **S07.2** Type inference: candidate types `string | number | boolean | date | email | pii`; first-row seed; downgrade rules (string→number only if ≥95% of non-null values parse).
- **S07.3** Numeric stats via Welford's algorithm (single-pass mean and variance).
- **S07.4** Casing-variant detection: lowercase / Title / UPPER / other; distinct values per case-insensitive group.
- **S07.5** Length stats; sample rotation (first 3 distinct values). **Per-sample byte cap:** each captured sample truncated to 256 bytes with `…` suffix. **Total sample buffer cap:** per-column sample buffer capped at 4 KB. Bounds the sample-buffer memory DoS surface.
- **S07.6** Tests: mixed-type column downgrade, large file passes within memory budget, numeric-only column stats accuracy.

**Privacy gate:** Worker still no network. Memory holds: O(columns) × O(samples).

---

## E08 — Pass 2: detection rules (the 8 categories)

**Anchors:** AD-4 (pass 2: cross-row rules), FR-2 (8 anomaly categories), AD-12 schema inference shape.
**User-visible outcome:** After pass 1, worker applies pass 2 detection rules and emits findings across all 8 categories. Every category has at least one fixture that triggers it.

**Stories**

- **S08.1** `src/worker/detect.ts`: subscribes to pass-1 stats; emits `Finding[]`.
- **S08.2** `duplicates`: configurable key (default all columns); exact-match deduplication; emit row indices for the first N duplicates. **Dedup strategy:** hash-of-concatenated-fields, computed via a pre-allocated buffer per row (not `JSON.stringify` — that allocates per row and is materially slower at 50,000+ rows).
- **S08.3** `missing`: empty cells, the literal string `"null"`, whitespace-only.
- **S08.4** `invalid-email`: RFC 5322 shape; common typos (`@@`, missing `@`, comma in domain).
- **S08.5** `invalid-date`: format check (ISO-8601 family); out-of-range detection.
- **S08.6** `inconsistent-categorical`: case-insensitive grouping; emit distinct forms.
- **S08.7** `outlier`: z-score ≥ 6 on numeric columns; emit row, value, mean, sigma.
- **S08.8** `suspicious-column`: heuristic flags (single-distinct, all-null, name collisions).
- **S08.9a** `pii` pattern definitions live in `src/lib/pii-patterns.json` (vendored, checked into the repo). Initial list: US SSN, email, phone (US E.164), credit-card-shape (Luhn-checked), IBAN-shape. Each entry has `{ id, label, regex, jurisdiction, sourceUrl, falsePositiveRate }`. The JSON file is the **single source of truth** — code-time changes require editing the JSON, not the TS.
- **S08.9b** PII patterns review document: `docs/pii-patterns.md` enumerates each pattern, its jurisdiction, false-positive rate, and known caveats. Required artifact before E08 closes. The exact list is still a code-time call deferred to a future patterns review; the JSON starts with the initial list above.
- **S08.9c** No PII-related npm dep. `package.json` is forbidden from declaring `validator`, `leven`, or any package whose purpose is PII detection. CI check: `npm ls validator leven 2>/dev/null` must exit non-zero.
- **S08.9d** PII ReDoS validator: `scripts/check-pii-patterns.mjs` runs on every commit; rejects any pattern in `src/lib/pii-patterns.json` with nested quantifiers, overlapping alternations, or unbounded backtracking. Patterns failing the check are not loaded at runtime (the JSON file's `pii` patterns section is filtered by the validator at module load).
- **S08.9e** Per-cell regex timeout: each cell's regex match is wrapped in a per-call budget (e.g., 10 ms); exceeding the budget skips the cell and continues. Prevents one pathological cell from hanging the worker.
- **S08.10** `bom`: surfaced from parser; emit file-level finding with strip-and-redetect affordance.
- **S08.11** One fixture per category; golden-test results.

**Privacy gate:** All 8 categories trigger correctly; worker still no network.

---

## E09 — Schema inference & score

**Anchors:** AD-3 (envelope), AD-12 (schema shape contract), FR-3 (4 score categories).
**User-visible outcome:** Worker emits `{ findings, schema, score, rowsParsed }` in the `results` envelope. Schema rows render as a `<table>` with `<caption>` and `<th scope="col">`. Score row shows 4 numeric values with horizontal bars.

**Stories**

- **S09.1** `src/worker/schema.ts`: consumes pass-1 stats; emits `{columns: [{name, type, distinct, nonNull, sample, flags}]}`. Type flags ride alongside (`mixed-casing`, `pii-pattern`).
- **S09.2** `src/worker/score.ts`: 4 categories — completeness (non-null density), validity (typed-column format correctness), uniqueness (inverse duplicate density), consistency (case-insensitive categorical consistency). Plus `overall` weighted combination.
- **S09.3** `src/components/ScoreRow.svelte`: 3-column grid (label / bar / mono number). Bar `aria-hidden`; mono number is the source of truth. **Score band carries a redundant text label** ("low" / "medium" / "high" or the threshold text "< 60" / "60–79" / "≥ 80") so the color is never the only signal (WCAG 1.4.1, AD-9).
- **S09.4** `src/components/SchemaTable.svelte`: `<table>` with `<caption>`, `<th scope="col">`. Mixed-casing / PII-pattern flags render as colored dots paired with text labels ("mixed", "PII") per WCAG 1.4.1.
- **S09.5** Tests: golden fixtures for score boundaries (100/100, 0/100, mixed).

**Privacy gate:** Schema and score render correctly; no network involved.

---

## E10 — Results UI

**Anchors:** AD-9 (aria-live banner, focus moves, skip-link), AD-10 (strict-brief error template), PRD FR-2 (anomaly groupings), EXPERIENCE.md §"Problems section".
**User-visible outcome:** Results page renders stacked vertical sections: aria-live banner ("Results ready — N problems found, M high-severity"), grouped problem cards (3px semantic left border), score section, schema section, cleaning CTA, mechanism-B links. PII card appears at top of the problems list (UJ-1 critical-reveal moment).

**Stories**

- **S10.1** `src/components/Banner.svelte`: `role="status"`, `aria-live="polite"`, accent-soft fill, 3px accent left border.
- **S10.2** `src/components/ProblemCard.svelte`: `<details>` / `<summary>`; mono title; semantic-colored 3px left border (`err / warn / pii / neutral`); first N affected rows in `<pre>` mono inside `var(--soft)`. **Border color pairs with a text label** ("error" / "warning" / "info") rendered next to the severity badge — the color is never the only signal (WCAG 1.4.1, AD-9). **N is hard-capped at 50** with a "show more" disclosure that lazily mounts additional rows on click — prevents the `<pre>` from rendering thousands of rows eagerly.
- **S10.3** Group problem cards by category (8 groups); PII first.
- **S10.4** Strict-brief copy in every finding: `[finding] — [rule]. [next action].`. Curly quotes in prose; straight quotes in mono data. Implementation uses `formatStrictBrief()` from `src/lib/strict-brief.ts` (E05).
- **S10.5** Mechanism-B links (AD-11): link-shaped, `aria-disabled="true"`, visually muted, "(coming)" annotation beside. Intentional inert.
- **S10.6** Results reveal: on state → results, focus moves to `#problems` via `tabindex="-1"` + `.focus()`. Skip-link is "Skip to problems".
- **S10.7** Cleaning CTA card: lands **after** E11's modal contract is fixed. Splitting E10 keeps the CTA from referencing a modal that doesn't yet exist. CTA card has "Clean and export" button + privacy reminder line; opening it dispatches the `modal-open` transition defined in E05's state machine.

**Privacy gate:** Banner and cards render correctly; no network.

---

## E11 — Cleaning modal & blob download

**Anchors:** AD-6 (5 toggles ALL OFF, reversibility view, filename pattern), AD-9 (focus trap, Esc close, restore focus), FR-5.
**User-visible outcome:** Clicking "Clean and export" opens a modal with five OFF toggles, a reversibility view (original vs proposed diff), and Confirm/Cancel. Confirm builds the cleaned file in the worker, downloads it as `cleaned-{basename}-{YYYY-MM-DD-HHmm}.csv`, and restores focus to the trigger.

**Stories**

- **S11.1** `src/components/CleaningModal.svelte`: focus trap, Esc closes, Cancel is initial focus, Confirm disabled until at least one toggle is on. Restore focus to trigger on close.
- **S11.2** Reversibility view: original alongside proposed cleaned with a diff (rows dropped, fields redacted, rows changed count). Modal never proceeds to Confirm unless the diff is visible.
- **S11.3** Five toggles: `dedupe`, `fill-missing`, `validate-and-flag`, `normalize-categorical`, `redact-PII`. All default OFF.
- **S11.4** `redact-PII` kind-error confirm: when the `redact-PII` toggle is flipped ON, the modal shows a dedicated confirmation panel framing the irreversibility of the redaction on the downloaded file (the original stays in the user's memory only until the browser tab closes; nothing is uploaded). Confirm remains disabled until the user explicitly acknowledges. Cancel returns the toggle to OFF.
- **S11.5** `src/worker/clean.ts`: applies toggles to a working copy; returns `{ blob, basename, rowCount: { original, cleaned } }`. Blob URL is revoked after the download fires (no lingering references).
- **S11.5a** **CSV-injection sanitizer:** any cleaned cell whose first character is `=`, `+`, `-`, `@`, `\t`, or `\r` is prefixed with a single quote `'` so the formula trigger is neutralized when the file is opened in Excel. The sanitizer is a separate pure function exported from `src/worker/clean.ts`; golden test confirms the formula prefix never appears in cleaned output.
- **S11.6** `building` intermediate state: while the worker is producing the cleaned blob, modal shows static "Building cleaned file…" text (per EXPERIENCE.md §"Cleaning modal"). No spinner; `aria-live="polite"` update.
- **S11.7** `src/lib/filename.ts`: `cleaned-{basename}-{YYYY-MM-DD-HHmm}.csv`; safe filename (no path traversal).
- **S11.8** Download gesture: `URL.createObjectURL` + anchor click; main thread owns the gesture. Anchor is removed from the DOM after click; blob URL is revoked.
- **S11.9** Tests: each toggle's diff is correct; reversibility view blocks Confirm until visible; redact-PII confirm blocks Confirm until acknowledged; filename is correct; building state is shown before download fires; focus returns to trigger button after download; blob URL is revoked.

**Privacy gate:** No upload of cleaned file. Blob URL is in-memory only; revoked after download.

---

## E12 — Error state & strict-brief template

**Anchors:** AD-9 (focus, aria-live, semantic HTML), AD-10 (strict-brief), EXPERIENCE.md §"Error message template", FR-1 (50 MB cap rejection surfaces here as a strict-brief error too).
**User-visible outcome:** When a file can't be parsed (UTF-8 BOM mislabel, malformed CSV, oversized row count, over-50 MB cap, unhandled worker error), the page renders a strict-brief error with a single CTA. No spinner, no apology.

**Stories**

- **S12.1** Error UI: H1 ("We can't read this file as UTF-8."), three-part body (what / why / what to do), single "Try a different file" CTA, privacy reminder. Reference mock: `mockups/key-screen-error.html` (rendered in E12 as a tracked artifact; not lifted from the planning-artifact `.working/` directory).
- **S12.2** Strict-brief template enforcement: every error contains `[specific finding] — [rule]. [next action].`. Curly quotes in prose; straight quotes in mono data. Implementation uses `formatStrictBrief()` from `src/lib/strict-brief.ts` (owned by E05).
- **S12.3** Common error types: UTF-8 BOM mislabel (Windows-1252 saved as UTF-8), malformed CSV (unclosed quote past EOF), zero-row file, single-column file with no header, over-50 MB (already rejected in E03 but the strict-brief page renders here), unhandled worker error.
- **S12.4** Error type detection in worker; emits `{ phase: 'error', payload: { kind, finding } }` envelope (the `error` variant was added to the Envelope union in E05's S05.2).
- **S12.5** Tests: each error type produces a strict-brief message via `formatStrictBrief()`; no marketing voice, no apology, no exclamation; the over-50 MB error lands on the same page shape as the others.

**Privacy gate:** No network on error render.

---

## E13 — Audit, hardening & deploy

**Anchors:** Privacy Baseline (FR-23) ship gate, all 12 ADs.
**User-visible outcome:** The MVP ships to a public URL. The DevTools Network tab is empty after page load on the deployed site. The repo has a CHANGELOG and an honest postmortems link.

**Stories**

- **S13.1** Transitive dependency audit: every direct dep's transitive tree reviewed. No phone-home. Documented in `SECURITY.md`.
- **S13.2** R2 bucket setup: logging disabled, public-read on objects only, Cloudflare Web Analytics NOT enabled. Audit checklist from SOLUTION-DESIGN.md §"Build-time calls (resolved)" verified. **The dashboard snapshot of the bucket settings is committed at `audit/r2-config.json`** with a timestamp + SHA and re-verified on every release. The "R2 default" prose claim is retired in favor of this published artifact.
- **S13.2a** **R2 access-policy artifact:** `audit/r2-config.json` records: bucket name, region, access-log state (off), Web Analytics state (off), public-read policy (objects only), allowed CORS origins (self only), and the SHA-256 of the dashboard screenshot if one is captured. JSON schema is locked; adding a field requires a doc update.
- **S13.3** `npm run build` produces `dist/`; `dist/` is uploaded to R2 at `/v1/{path}` (immutable URL pattern, per S13.13). Custom domain or R2 subdomain (deferred decision). **`dist-manifest.json` is generated at build time** listing the Git SHA, build timestamp, and SHA-256 of every asset. The manifest is uploaded alongside `dist/` and is the cross-check artifact a stranger uses to verify the deployed bundle matches the published source.
- **S13.3a** **Reproducible build guide:** `docs/reproducible-build.md` walks a stranger from `git checkout <sha>` through `npm ci`, `npm run build`, and `sha256sum dist/*` to the manifest hashes. The build script uses `npm ci` (not `npm install`), exact version pinning in `package.json`, and `hidden-source-map` so maps never reach the deployed site. Any non-reproducible build fails the CI gate.
- **S13.4** Playwright/Puppeteer smoke test against the deployed URL: load → empty state visible → drop a 5 KB fixture CSV → results page visible → 8 detection categories trigger correctly. The smoke test also asserts `navigator.serviceWorker.getRegistrations()` returns empty and that `curl -I` against the deployed URL returns the hardening headers from S13.11.
- **S13.5** Lighthouse audit: contrast 4.5:1 body / 3:1 large; focus rings visible; skip-link reachable; no console errors.
- **S13.6** DevTools verification script in CI: loads the deployed page; asserts zero requests after page load. The script lives at `scripts/audit-privacy.mjs` and is the canonical artifact the README points at.
- **S13.7** CHANGELOG.md (initial entry: MVP launch).
- **S13.8** Postmortems section: empty for now; placeholder file `postmortems/README.md`.
- **S13.9** README refresh: the current README is planning-focused. Replace with a deploy-time README that describes the live product, the privacy claim, the verifiable DevTools test, the license, and a short "how to use" guide. The `_bmad-output/` planning artifacts move into a `docs/planning/` section.
- **S13.10** SECURITY.md: documents the Privacy Baseline, how to verify it, and the contact path for reporting privacy regressions.
- **S13.11** **Hardening headers:** the deployed `index.html` ships with the following response headers (configured via Cloudflare Worker → R2, not via `<meta>` tags — meta-CSP is bypassable):
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; worker-src 'self'; font-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`. The `connect-src 'none'` is the load-bearing line — it guarantees no `fetch` / `XMLHttpRequest` / `EventSource` / `WebSocket` can leave the origin even if the source code regressed. The `'unsafe-inline'` on style-src is required because Svelte 5's component-scoped styles use inline `<style>` blocks (audit confirms no dynamic CSS injection).
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: no-referrer`.
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), midi=(), accelerometer=(), gyroscope=(), magnetometer=(), ambient-light-sensor=(), display-capture=()`. Disable everything; the app uses none of these.
  - `Cross-Origin-Opener-Policy: same-origin`. `Cross-Origin-Embedder-Policy: require-corp`. `Cross-Origin-Resource-Policy: same-origin`.
  - Headers are verified in the CI smoke test (S13.4) via `curl -I` against the deployed URL.
- **S13.12** **Source-map policy:** `hidden-source-map` in production is the build-time default (S01.3). Maps are **not** uploaded automatically — they're shipped to the maintainer only when the user explicitly triggers "Report a problem" (deferred UI; for MVP, the report path is documented in SECURITY.md). Maps never reach the deployed site, never reach Cloudflare, and never reach a third-party error tracker. The `dist/` shipped to R2 contains no `.map` files (CI check: `find dist -name '*.map' | wc -l` must equal zero).
- **S13.13** **R2 URL durability:** the deployed URL is permanent — R2 bucket versioning is not enabled (avoids storing old `dist/` builds with known-bad deps), but the **current** `dist/` is fronted by an immutable URL pattern (`/v1/{path}`) so future deploys do not invalidate previously cached installs of the same version. The MVP lives at a single stable URL; v1 is the canonical path. New versions ship under `/v2/...` rather than overwriting v1. A short note in README explains the policy.
- **S13.14** **R2 noindex:** deployed `index.html` ships with `<meta name="robots" content="noindex, nofollow">`. The MVP is a tool, not a landing page — it should not appear in search results, and analytics-driven SEO is irrelevant. The header is a fallback for the meta tag; if the Cloudflare Worker is later configured to inject headers, `X-Robots-Tag: noindex, nofollow` is set there too.
- **S13.15** **Report-a-problem path:** the deployed footer includes a "Report a problem" mailto link. The address points to a maintained inbox (placeholder: `privacy@webutilitylab.example`). SECURITY.md documents the triage flow: report → maintainer reviews within 7 days → fix in next release → credit reporter in CHANGELOG unless anonymity requested.
- **S13.16** **Browser support matrix:** the MVP targets **Chrome / Edge ≥ 120, Firefox ≥ 121, Safari ≥ 17.4** (the minimum versions that ship `TextDecoderStream`, `File.stream()`, `structuredClone`, and Web Workers as ES modules). On unsupported browsers, the page renders an "Unsupported browser" surface (not an error) with a single CTA "Try a supported browser" and a list of the three browsers above. Detection is **feature-based, not UA-sniffing**: a small inline script at the top of `index.html` checks for `TextDecoderStream`, `File.prototype.stream`, and `Worker` ES-module support; if any are missing, it sets `<html class="unsupported">` before paint and the body shows the unsupported surface. The unsupported surface itself contains zero third-party resources.
- **S13.17** **SRI on dist assets:** every `<script>` and `<link rel="stylesheet">` in the deployed `index.html` carries a `integrity="sha384-..."` attribute generated at build time. A Cloudflare Worker re-injects the integrity attributes at edge if the origin serves without them. Subresource Integrity prevents a compromised R2 object from serving modified JS that bypasses the CSP.

**Privacy gate:** The deployed page passes DevTools verification, ships the hardening headers, contains no source maps, has SRI on every asset, and renders the unsupported surface on browsers missing required features. CHANGELOG entry exists. Privacy claim is auditable.

---

## Summary table

| Epic | Anchors | User-visible outcome |
|---|---|---|
| E01 | AD-1, MIT, Vitest | `npm run build` works; CI green |
| E02 | AD-7, AD-8, AD-9, AD-10 | Theme + skip-link + editorial chrome |
| E03 | AD-9, FR-1 | Dropzone + 50 MB cap |
| E04 | FR-6, AD-5 | Pre-flight + refusal state |
| E05 | AD-3, AD-5, AD-9 | Worker + state machine + skip-link variants |
| E06 | AD-2 | Streaming parser + BOM surfaced |
| E07 | AD-4, AD-12 | Pass 1 column stats |
| E08 | AD-4, FR-2 | Pass 2 detection (8 categories) |
| E09 | AD-3, AD-12, FR-3 | Schema + score |
| E10 | AD-9, AD-10, FR-2 | Results UI |
| E11 | AD-6, AD-9, FR-5 | Cleaning modal + blob download |
| E12 | AD-9, AD-10, FR-1 | Error state + strict-brief |
| E13 | Privacy Baseline | Audit + deploy |

## Dependency graph (which epics must land before which)

- E01 → all others (E01 lands the dep-tree no-network gate that every subsequent epic must pass)
- E02 → E03, E10
- E03 → E04, E05
- E04 → E05
- E05 → E06, E03, E12 (E05 owns `formatStrictBrief` and the Envelope `error` variant — both E03 and E12 consume them)
- E06 → E07
- E07 → E08
- E08 → E09
- E09 → E10
- E10 → E11, E12 (E10's Cleaning CTA card lands after E11's modal contract — see S10.7)
- E11, E12 → E13

The critical path is E01 → E02 → E03 → E05 → E06 → E07 → E08 → E09 → E10 → E11 → E13 (E04 and E12 branch off but reconverge).

## What's not in any epic (deferred to post-MVP)

- Mechanism-B tools (API Response Diff, JSON Surgeon).
- Internationalization.
- Hash-routing (only if a second tool ships).
- Source-map upload pipeline (manual only for MVP; auto-upload deferred).
- Lighthouse CI integration (deferred from E13; the axe-core scan in the per-epic gate is enough for MVP).
- "Report a problem" UI (S13.15 ships only the contact path via SECURITY.md + mailto; the in-app modal is deferred).
- Custom domain for the deployed site (S13.3 ships to an R2 subdomain; custom domain deferred).
- "Add to home screen" / PWA manifest (no value for a tool that runs once per CSV).

## Open questions for the build

1. **Throughput constant for pre-flight estimate.** Start at 2 MB/s; profile against the 8 detection categories to calibrate. Could become a build-time constant or a measured runtime value.
2. **PII pattern list.** Starting list (US SSN, email, phone, credit-card-shape, IBAN-shape) is a placeholder; the exact vendored list is a code-time call deferred to a PII patterns review document. Each pattern will carry source / jurisdiction / known false-positive rate.
3. **R2 subdomain vs custom domain.** Defer until E13.
# UX Reconciliation Report — WebUtilityLab CSV Rescue MVP

**Generated:** 2026-08-11
**Status:** Both spine files are skeletons (status: draft). Only memlog is populated with decisions.

---

## Headline Finding

DESIGN.md and EXPERIENCE.md are empty skeletons with section headers only ("Brand & Style", "Colors", "Typography", etc.). All UX commitments exist in the memlog as decisions but have NOT been bound to spine tokens or sections. Effectively, **every PRD requirement that the UX must surface is `missing` from the spines**, with the exception of intentions recorded in memlog.

---

## FR-by-FR Reconciliation

### FR-1: File ingestion (drag-drop, file picker, paste)
- **Spine presence:** `missing`
- **Evidence:** EXPERIENCE.md.IA and Component Patterns sections are empty. Memlog decision #20 references "empty-state dropzone with real file-input + paste handler" but only in `.working/key-screen-empty.html`, not in EXPERIENCE.md.
- **Label:** `missing` in spine; `paraphrase` in memlog.

### FR-2: Anomaly detection (8 categories)
- **Spine presence:** `missing`
- **Evidence:** EXPERIENCE.md.Results page structure (memlog #22) lists "detected problems (top, primary)" but no enumeration of the 8 categories. Memlog #27 explicitly says "all 8 problem categories now expanded" — this was applied to `.working/key-screen-results.html` but not to EXPERIENCE.md.
- **The 8 categories from PRD FR-2:** duplicates, missing values, invalid emails, invalid dates, inconsistent categorical values, outliers, suspicious columns, potential PII. None named in spine.
- **Label:** `missing`.

### FR-3: Data-quality score (0–100, 4 categories)
- **Spine presence:** `missing`
- **Evidence:** Memlog #22 mentions "data-quality score (with category breakdown)" as a section, but EXPERIENCE.md has no text. The 4 score categories (completeness, validity, uniqueness, consistency) are NOT named anywhere in the spines.
- **Label:** `missing`.

### FR-4: Schema inference
- **Spine presence:** `missing`
- **Evidence:** PRD requires: column name, inferred type (string/number/date/boolean/email/url/phone/mixed), non-null count, distinct count, top-3 sample values, mixed-type flagging with dominant type + deviating count, downloadable JSON schema. Memlog #13 mentions "Mono ONLY for data: CSV content, column names, schema types" — type. Neither spine names the schema fields nor the type vocabulary.
- **Label:** `missing`.

### FR-5: One-click cleaning with conservative defaults + reversibility
- **Spine presence:** `missing` in spine; `paraphrase` in memlog.
- **Evidence:** Memlog #23 is a strong, locked decision: "Default state: ALL toggles OFF — cleaning is opt-in, conservative default per FR-5", modal with per-category toggles (dedupe, fill-missing, validate-and-flag, normalize-categorical, redact-PII), and a kind-error confirm for irreversible PII redaction. **Reversibility/diff is NOT mentioned** in memlog #23 either — the memlog confirms the original file is not retained ("this cannot be undone"), which directly conflicts with PRD FR-5's "Cleaning is reversible — the original file is shown alongside the cleaned version, with a diff."
- **Label:** `missing` in spine. **CONFLICT surfaced:** Memlog says original is not retained; PRD says original is shown alongside cleaned with a diff. This is a load-bearing gap the user must resolve.

### FR-6: Pre-flight time estimation with band + refusal
- **Spine presence:** `missing`
- **Evidence:** Neither EXPERIENCE.md.State Patterns nor IA mention pre-flight estimation, the band ("~3s ±30%"), or the refusal state. PRD DD1 proposes ±30% band, refuse if upper bound > 10s — not surfaced in spine.
- **Label:** `missing`.

### FR-7: Empty state teaches
- **Spine presence:** `missing` in spine; `paraphrase` in memlog.
- **Evidence:** Memlog #20 has a locked empty-state copy draft with JTBD sentence + privacy signal + "Try the example" link. The "what/who/how, with example data" teaching pattern is implicit but not enumerated in EXPERIENCE.md.
- **Label:** `missing` in spine; `paraphrase` in memlog.

### FR-8: Kind error messages (strict brief)
- **Spine presence:** `missing` in spine; `paraphrase` in memlog.
- **Evidence:** Memlog #21 has the locked template: "[specific finding] — [domain rule]. [concrete next action]." with a CSV Rescue example. Voice and Tone section in EXPERIENCE.md is empty.
- **Label:** `missing` in spine; `paraphrase` in memlog.

### FR-9: Visible-at-moment-of-trust privacy signal at drop zone
- **Spine presence:** `missing` in spine; `paraphrase` in memlog.
- **Evidence:** Memlog #20 includes "We don't upload — this happens in your browser" in the empty-state copy. Memlog #17 confirms IA "Privacy signal stays at top throughout." Drop-zone placement is NOT explicitly called out as a placement decision in spine.
- **Label:** `missing` in spine; `paraphrase` in memlog.

### FR-10: Mechanism B (result-page static links)
- **Spine presence:** `missing`
- **Evidence:** Neither spine mentions "next, you might want to..." links. Memlog does not record a decision on this.
- **Label:** `missing`.

### FR-11: Mechanism A (file metadata handoff)
- **Spine presence:** `missing`
- **Evidence:** Neither spine mentions metadata in cleaned file or recognition on read by next tool. Memlog does not record a decision.
- **Label:** `missing`.

### FR-22: Edge-case test suite
- **Spine presence:** `missing`
- **Evidence:** Neither spine addresses how the design surfaces test-acceptable behavior for BOM, NaN, BigInt, deeply nested structures, 50MB file. Memlog does not record a decision on visual treatment of edge cases.
- **Label:** `missing`.

### FR-23: Privacy audit (ship gate) — no third-party, no CDN, no web fonts, no remote anything
- **Spine presence:** `thin`
- **Evidence:** Memlog #13 (Typography: "system stack — Privacy Baseline prohibits web fonts") and memlog #17 (single-page, no routing) imply the constraint but do not enumerate the prohibition list ("no third-party requests, no CDN, no web fonts, no remote anything"). Neither DESIGN.md nor EXPERIENCE.md enforces the constraint as a written rule.
- **Label:** `thin` — implied in memlog, never written into spine.

### FR-24: Three outside users on real work files
- **Spine presence:** `missing`
- **Evidence:** UJ-1/Devon journey is referenced in PRD §2.3 but not surfaced in EXPERIENCE.md.Key Flows. Memlog does not bind UJ-1 as the seeded reference for usability testing.
- **Label:** `missing`.

### Privacy Baseline (PRD §3 glossary) — "surrounding-30% framing"
- **Spine presence:** `missing`
- **Evidence:** PRD glossary: "Privacy risk lives in the surrounding dependencies — analytics, fonts, CDN logs, transitive packages, dev-tooling." Memlog #13 partially covers (no web fonts); no spine section enumerates the "surrounding" risk surface. The "30%" framing is from the memo brief; not in either spine.
- **Label:** `missing`.

---

## Memlog Decisions — Binding Check

| # | Memlog decision | Bound to DESIGN.md? | Bound to EXPERIENCE.md? | Status |
|---|---|---|---|---|
| 8 | Working mode: Coaching | No | No | unbound (meta) |
| 9 | Form-factor C desktop-primary | No | No | `missing` |
| 10 | Brand posture: Editorial/typography-led | No | No | `missing` (DESIGN.md.Brand & Style empty) |
| 11 | Colors: two-tone + 4-5 semantic accents | No | No | `missing` (DESIGN.md.Colors empty) |
| 12 | Typography: system stack, mono for data | No | No | `missing` (DESIGN.md.Typography empty) |
| 13 | Color mode: light+dark + toggle | No | No | `missing` |
| 14 | Color palette draft | No | No | `missing` |
| 15 | Semantic categories locked (error/warning/outlier/duplicate/PII/info/success) | No | No | `missing` |
| 16 | IA: single-page, scroll-driven | No | No | `missing` (EXPERIENCE.md.IA empty) |
| 17 | Voice register: restrained spec | No | No | `missing` (EXPERIENCE.md.Voice and Tone empty) |
| 18 | Typography conventions (curly quotes, spaced em-dashes) | No | No | `missing` |
| 19 | Empty state copy locked draft | No | No | `missing` in spine; `paraphrase` only |
| 20 | Error message template locked | No | No | `missing` in spine; `paraphrase` only |
| 21 | Results page structure (stacked vertical sections) | No | No | `missing` |
| 22 | Clean-and-Export flow with modal + conservative default | No | No | `missing` in spine; `paraphrase` only; **CONFLICTS with PRD FR-5 reversibility** |
| 23 | Accessibility floor (WCAG 2.2 AA, keyboard-first, etc.) | No | No | `missing` (EXPERIENCE.md.Accessibility Floor empty) |
| 24 | Key-screens rendered (event) | n/a | n/a | event, not a binding target |
| 25 | Orphan file override (event) | n/a | n/a | event |
| 26 | Key-screen decisions (dropzone wire-up, PII violet, all 8 categories) | No | No | applied to `.working/` HTML, not to spine |
| 27 | Key-screen polish applied (event) | n/a | n/a | event |

**Every locked decision in memlog (15 total) is unbound from both spines.** Decisions exist as memlog entries only.

---

## Summary of Gaps by Category

| Category | Count |
|---|---|
| `missing` (spine has no content; memlog has the decision) | 13 |
| `thin` (implied, not written) | 1 (FR-23 Privacy Baseline) |
| `paraphrase` only (in memlog, not spine) | 7 |
| `cover` (spine addresses PRD requirement) | 0 |
| **Conflicts surfaced** | 1 (FR-5 reversibility vs. memlog "not retained") |

---

## Top 5 Gaps (by load-bearing weight)

1. **FR-23 Privacy Baseline ship gate (thin in spine, fully missing as a written rule).** The ship gate has zero explicit constraint text in either DESIGN.md or EXPERIENCE.md. Typography memo forbids web fonts; nothing forbids CDN, analytics, transitive deps, remote anything.

2. **FR-5 Cleaning reversibility conflict (load-bearing).** PRD: "original file is shown alongside the cleaned version, with a diff." Memlog #23: "The original file is not retained — this cannot be undone." Spine must reconcile or one side must yield. This is the only flagged contradiction in the dataset.

3. **FR-2 Anomaly detection — 8 categories not enumerated.** Memlog locked "all 8 problem categories" but the 8 names (duplicates, missing, invalid emails, invalid dates, inconsistent categorical, outliers, suspicious columns, PII) appear nowhere in EXPERIENCE.md.

4. **FR-3 Score categories not named.** Completeness / validity / uniqueness / consistency — none appear in spine. The score format (X/100) and breakdown behavior are unbound.

5. **IA & Component Patterns sections empty.** All structural commitments (single-page scroll-driven IA, results-page stacked cards, modal Clean-and-Export, pre-flight refusal state, schema table pattern, error message template, accessibility floor, key flows) are unbound. Memlog carries them; spine does not.

---

## File Path

`C:\ZDrive Folders\Projects\WebUtilityLab\_bmad-output\planning-artifacts\ux-designs\ux-WebUtilityLab-2026-08-11\reconcile-inputs.md`
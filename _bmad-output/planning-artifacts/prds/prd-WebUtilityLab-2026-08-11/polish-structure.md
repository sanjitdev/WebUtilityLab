# PRD Structure Polish Report

**PRD:** `prd-WebUtilityLab-2026-08-11/prd.md`
**Lens:** structure (section ordering, heading hierarchy, FR numbering, cross-refs, glossary sync, assumption indexing, open-question concreteness, table/list consistency, header/list hygiene, ID stability)
**Date:** 2026-08-11

---

## Summary

The PRD is well-organized and largely follows a clean narrative order. Heading hierarchy is consistent (`##` for top-level sections 0–9; `###` for sub-sections; `####` for FRs). FR numbering is stable, non-overlapping, and globally unique (FR-1 through FR-28). Cross-references mostly resolve. The main structural issues are: (1) §9 Assumptions Index lists six `[ASSUMPTION]` items but the inline body uses none of the `[ASSUMPTION: ...]` tags the glossary defines and that §0 promises, (3) §8 Open Questions are concrete but only DD3 names an owner-equivalent (a "block"); the rest lack explicit owners, (4) several cross-references use non-standard symbols (e.g., `D1`, `CD3`, `RA1`) without first being introduced, (5) the glossary lists `[ASSUMPTION: ...]` as a defined term, creating a circular dependency with §9. None of these are blockers for finalize, but the assumption/tag mismatch is a should-fix that weakens the traceability promise.

---

## Findings

### 1. [should-fix] Inline `[ASSUMPTION: ...]` tags are missing from body — §9 index is orphaned
- **Where:** §0 line 18 ("assumptions tagged inline and indexed in §9"), §3 Glossary line 80 (`[ASSUMPTION: ...]` defined as a term), §9 lines 341–346 (six entries).
- **Issue:** §9 lists six `[ASSUMPTION: ...]` entries, and the glossary defines `[ASSUMPTION: ...]` as a term. But scanning the body of the PRD (lines 22–337), no sentence carries an inline `[ASSUMPTION: ...]` tag. The §9 entries read as a summary list, not an index into the body. The traceability promise ("assumptions tagged inline and indexed in §9") is therefore half-fulfilled: there is no inline tag to index from.
- **Suggested fix:** Either (a) retroactively mark the source sentence of each §9 entry with the corresponding `[ASSUMPTION: ...]` tag in the body, or (b) rename §9 to "§9 Assumptions (declared)" and drop the glossary term's "tagged inline" wording.

### 2. [should-fix] Decision IDs (D1, D2, CD3, CD5, CD7, RA1) used in body without being introduced
- **Where:** §5 line 273 (`D1`), §5 line 274 (`CD3`), §6.2 line 303 (`DD2`), §7 line 316 (`D7, CD5`), §8 line 329 (`RA1`).
- **Issue:** The body cites decision IDs (`D1`, `D2`, `CD3`, `CD5`, `CD7`, `RA1`, `DD2`) that are not defined in this PRD. They presumably live in the brief or brainstorm memlog. A reader of the PRD alone cannot verify what `D1` or `CD3` means. These are essentially uncited cross-references.
- **Suggested fix:** Either include a one-line definition parenthetically the first time each is used (e.g., "Reclassified per D1 (Chainable workflows → non-goal)" → "Reclassified per D1 (brief discovery: chainable workflows are non-goal)"), or add a small "Decision ID key" subsection in §0/§8 mapping these IDs to their source (brief / brainstorm / RA = risk accepted).

### 3. [should-fix] §8 Open Questions lack explicit owners; only DD3 has a clear action
- **Where:** §8 lines 321–337 (DD1–DD6).
- **Issue:** Per the lens criterion ("Open Questions are concrete, each with owner or revisit condition"), DD1–DD6 each have a concrete question, but only DD3 has a blocking condition ("Block ship until confirmed"). DD1 has a "Confirm before launch" action but no owner. DD2 explicitly notes the owner is unassigned ("brief flags the requirement but does not assign an owner"). DD4, DD5, DD6 have implicit owners but no explicit named owner or revisit date.
- **Suggested fix:** Add an owner (or "solo: Sanjit") and a revisit condition/date to each DD item. For DD2 specifically, resolve the brief's "ownership unassigned" gap by assigning owner = Sanjit with revisit = pre-launch checklist.

### 4. [should-fix] Glossary term `[ASSUMPTION: ...]` is meta-circular with §9
- **Where:** §3 line 80, §9 lines 341–346.
- **Issue:** The glossary defines `[ASSUMPTION: ...]` as the inline tag, but §9 lists full `[ASSUMPTION: foo]` entries that read more like standalone declarations than tag definitions. The glossary entry promises "Inline tag for inferences made from the brief" — implying the tag should appear inline. §9 is the only place the bracketed form appears in the file.
- **Suggested fix:** Decide whether `[ASSUMPTION: ...]` is an inline-tag syntax (in which case §9 entries should be back-references indexed from inline tags — see finding #1) or a glossary term (in which case the §9 entries should drop the bracketed form and read as plain bullets).

### 5. [should-fix] Cross-reference to `addendum.md` is dangling
- **Where:** §4.1 FR-3 line 116.
- **Issue:** "Score formula is documented in `addendum.md` (open technical detail)." The file path is given without a section anchor and there is no §10 / "Addenda" section in the PRD. A reader cannot locate the referenced document from this PRD alone.
- **Suggested fix:** Either replace with a relative path that resolves (e.g., `./addendum.md` or a full project path) and add a "## 10. Addenda" stub section, or remove the reference and move the score-formula documentation requirement into §6 MVP Scope or §8 Open Questions.

### 6. [nit] §6.2 last bullet mentions "Public Compare page" with dual reference (idea.md §10 + DD2) — slight duplication risk
- **Where:** §6.2 line 303.
- **Issue:** The bullet references both `idea.md §10` and `DD2` for the same deliverable. Two-source citations for one item can drift if either source changes.
- **Suggested fix:** Pick one canonical source (the PRD's own §8 DD2 is more discoverable for downstream docs) and keep `idea.md §10` only as historical context.

### 7. [nit] §5 bullet "Mechanism C" and "Mechanism D" use uppercase mechanism names not introduced in glossary
- **Where:** §5 lines 279–280.
- **Issue:** Glossary defines "Workflow glue" and lists Mechanism A and Mechanism B; PWA = Mechanism D is defined. But Mechanism C is mentioned in §5 with no glossary entry. The Mechanisms A/B/D are defined; C is not.
- **Suggested fix:** Add a one-line note in the glossary's "Workflow glue" entry listing all four mechanisms and their dispositions (A = in, B = in, C = rejected, D = deferred), or add a "Mechanism C" line in §5 explaining the rejection rationale inline (currently only "rejected for UX and architectural reasons" — no specifics).

### 8. [nit] §4.2 FR-15 through FR-21 / FR-22 through FR-28 inconsistently include "Consequences (testable)"
- **Where:** §4.2 lines 216–268.
- **Issue:** FR-1 through FR-14 each include a "**Consequences (testable):**" block; FR-15–FR-21 (Craft Practices) and FR-22–FR-28 (DoD) only inconsistently include them (e.g., FR-19 has one; FR-15, FR-16, FR-17, FR-18, FR-20, FR-21, FR-22, FR-24, FR-25, FR-26, FR-27, FR-28 do not). This is a structural inconsistency: every FR in §4.1 has Consequences; not every FR in §4.2 does.
- **Suggested fix:** Either add a `**Consequences (testable):**` block to each FR that currently lacks one (even if it points to the FR it cross-references), or note in a one-line preamble to §4.2 that "Craft Practice / DoD FRs without their own Consequences block delegate to the FR they reference."

### 9. [nit] §7 SM-3 cross-reference says "the ship gate" — links to a concept, not an FR anchor
- **Where:** §7 line 312 ("Validates FR-23 (the ship gate)").
- **Issue:** The phrase "the ship gate" is defined in the glossary (line 74) but the SM-3 wording could be misread as pointing at a section called "ship gate." Minor ambiguity.
- **Suggested fix:** Replace with "Validates FR-23 (Privacy audit — the sole DoD ship gate)" for unambiguous reading.

### 10. [nit] §4.1 FR-6 line 146 cross-references "see §8 Open Question DD1" mid-sentence — fine, but FR-6 description line 141 says "10-second budget" without the reference
- **Where:** §4.1 FR-6 lines 141, 146.
- **Issue:** The FR-6 description names "10-second budget" but the budget itself is an open question (DD1). The reader has to notice the parenthetical in the Consequences block to see the unresolved status. Risk: a downstream doc could quote "10s" as a fixed number.
- **Suggested fix:** Add "(proposed; see §8 DD1)" to the FR-6 description's "10-second budget" mention so the unresolved status is visible at the description level, not only in Consequences.

### 11. [nit] §6.2 line 296 references "DD5" — see finding #2 on decision IDs
- **Where:** §6.2 line 296 ("(DD5 — see §8)").
- **Issue:** `DD5` is used to label the JSON Surgeon depth-extension-plan requirement. But §8 itself numbers its items DD1–DD6, not DD5 for JSON Surgeon. In §8 line 327, the JSON Surgeon plan is DD4, not DD5. So the §6.2 reference "(DD5 — see §8)" is wrong — it should be DD4.
- **Suggested fix:** Change "(DD5 — see §8)" in §6.2 line 296 to "(DD4 — see §8)".

### 12. [nit] §5 line 277 "Marketing copy that is unfalsifiable" duplicates FR-23 Privacy audit intent loosely
- **Where:** §5 line 277; §4.2 FR-23 line 252.
- **Issue:** §5 says "every claim must be demonstrable in DevTools by a stranger"; FR-23 says "Reproducible by a stranger with DevTools open." The "demonstrable in DevTools" property is stated in both places with slightly different wording. Not duplication per se, but a downstream doc could cite either and get the same idea in two formulations.
- **Suggested fix:** Consider folding the §5 bullet into a pointer: "Marketing copy that is unfalsifiable (see FR-23 ship-gate principle)" — single source of truth.

### 13. [nit] §8 DD6 sub-bullets use italic-with-leading-asterisk formatting, not standard markdown
- **Where:** §8 lines 332–335.
- **Issue:** The DD6 sub-items use `*Contributor guide*`, `*"Why this exists" anchor*`, etc. — italic with literal asterisk-pair inside the bullet. Renders correctly but mixes emphasis styles with the rest of the PRD (which uses **bold** for emphasis).
- **Suggested fix:** Change to `**Contributor guide**`, `**"Why this exists" anchor**`, etc. for consistency.

### 14. [nit] §9 last bullet references "D2" (brief) — see finding #2
- **Where:** §9 line 341 ("from D2 (brief)").
- **Issue:** Same as finding #2: D2 is a decision ID not defined in this PRD. The parenthetical "(brief)" is the only hint at provenance.
- **Suggested fix:** Add the same Decision ID key as proposed in finding #2.

---

## Items checked and clean

- **Section ordering:** 0 Purpose → 1 Vision → 2 Target User → 3 Glossary → 4 Features → 5 Non-Goals → 6 MVP Scope → 7 Success Metrics → 8 Open Questions → 9 Assumptions Index. Earned ordering; no section is empty or placeholder-only.
- **Heading hierarchy:** Consistent `##` (0–9), `###` (2.1–2.3, 4.1–4.2, 6.1–6.2), `####` (FR-1 through FR-28). No skipped levels found.
- **FR numbering:** FR-1 through FR-28; stable, globally unique, non-overlapping, sequential.
- **FR reference consistency in §7:** SM-1 → FR-1 through FR-7; SM-2 → FR-24; SM-3 → FR-23. All resolve to defined FRs.
- **Glossary terms used in body:** Tool, User, Result, Platform, Stateless, Craft Practice, DoD, Privacy Baseline, Ship gate, Time-to-competence, Workflow glue, PWA, CSV Rescue, BOM — all appear in body. (Finding #4 covers the `[ASSUMPTION: ...]` circular case.)
- **Body terms defined in glossary:** Spot-checked "mechanism A/B" — partially covered (see finding #7 for Mechanism C).
- **Markdown table syntax:** No tables in this PRD; FR lists use consistent `#### FR-N: Title` headers followed by description + optional Consequences list. Format is consistent.
- **Lists that "look like headers":** None found. Bold paragraphs that introduce a list (e.g., FR Consequences) use bold text, not `#` symbols.
- **§5 Non-Goals not duplicated by non-features elsewhere:** §6.2 "Out of Scope for MVP" lists deferred items; §5 lists non-goals. The two lists overlap by design (e.g., Mechanism D, Local LLM tools, Workflow chains appear in both) — this is acceptable structural redundancy when an item is both a non-goal and explicitly out of MVP scope, but the duplication should be intentional (it is).

---

## No blockers found

No findings rise to `blocker` level. The PRD can be finalized as-is from a structure standpoint. The should-fix items above (especially #1, #2, #11) will improve traceability and reduce mis-citation risk for downstream architecture / UX / epic docs.

---

## Categorization rollup

- **blocker:** 0
- **should-fix:** 5 (findings #1, #2, #3, #4, #5)
- **nit:** 9 (findings #6, #7, #8, #9, #10, #11, #12, #13, #14)
- **Total:** 14 findings
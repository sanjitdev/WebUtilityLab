# Brief → PRD Reconciliation Report

**PRD:** `prd.md` (330 lines)
**Brief:** `brief.md` (189 lines)
**Date:** 2026-08-11
**Role:** Read-only gap surface. No rewrites proposed.

Legend: **cover** = fully preserved · **thin** = preserved but weakened/dropped rationale · **paraphrase** = reworded, not verbatim · **missing** = absent from PRD.

---

## 1. Executive Summary line

| Brief | PRD | Status |
|---|---|---|
| "It costs you nothing because it doesn't remember you." | Not quoted. Absent. | **missing** |

The brief lifts this as a pull-quote. The PRD does not preserve it. Loss of brand-language artifact.

---

## 2. Four load-bearing pieces of context

### a. Local-first is architecture, not discipline (the "surrounding 30%")

| Brief | PRD | Status |
|---|---|---|
| "The privacy risk lives in the surrounding 30% — analytics, error reporters, fonts, CDN logs, transitive dependencies that phone home, dev-tooling leaks — not in the core feature. 'No API calls in core' is necessary and insufficient." (CD2) | Glossary "Privacy Baseline" name-drops "no analytics, no fonts, no CDN, no transitive-dependency side-effects" but does not frame the *surrounding 30%* insight, nor the "necessary and insufficient" framing. | **thin** |

The structural insight is reduced to a checklist item. The "error reporters" and "dev-tooling leaks" are not called out. The argument that "no API calls in core" is insufficient is lost.

### b. 10-second load ceiling as falsifiable user-perceived bedrock

| Brief | PRD | Status |
|---|---|---|
| "The 10-second load ceiling is a falsifiable user-perceived bedrock. It rules out Local LLM tools, slow crawlers, full ZIP scans as MVP candidates — not by opinion but by physics of the budget." (CD3) | FR-6 names 10s budget, FR-22 references 50MB real-world file. Non-goals section names "Local LLM tools" (line 268). But the framing as "falsifiable user-perceived bedrock" / "physics of the budget" is absent. "Slow crawlers" and "full ZIP scans" are not enumerated. | **thin** |

### c. Doc's biggest internal contradiction (chainable vs stateless)

| Brief | PRD | Status |
|---|---|---|
| "The original doc's biggest internal contradiction is resolved. `idea.md` §9 'workflows rather than tiny utilities' and the original §13 'browser-native workbench with chained operations' are now retired. The platform is stateless one-shot. The 'future possibility' framing is honest about what changed." (CD4) | Non-goals line 267: "Chainable workflows — running multiple tools together in a chain is 'future possibility, not goal' (was `idea.md` §13). Reclassified per D1." | **thin** |

PRD cites only §13, not §9. The "honest about what changed" framing is implicit. The two-sourced contradiction resolution is collapsed.

### d. MVP tool list doesn't survive depth-pressure

| Brief | PRD | Status |
|---|---|---|
| "The MVP tool list as written does not survive depth-pressure. Two of the five MVP tools are shallow by Skeptic 3's reckoning. The deep-vs-shallow axis is the new filter — and the brief reflects it." (CD5) | Not surfaced as a discovery. Implicit in §6.2 out-of-scope list (Screenshot → Color, File Metadata Cleaner). | **thin** |

The framing that two of *five* original MVP tools were dropped by the depth filter is not preserved. The PRD treats the survivors as given, not as the result of pressure.

---

## 3. Six Load-Bearing Decisions D1–D6

| Decision | PRD coverage | Status |
|---|---|---|
| **D1** Stateless and one-shot | D1 referenced in §5 Non-Goals (line 267), §3 Glossary "Stateless". Rationale (alignment with local-first, infra cost, brand asset) absent. | **paraphrase** |
| **D2** CSV Rescue is "the 1" (reversed from JSON Surgeon) | §1 Vision, §6.1. Reversal history captured in §9 Assumptions. Rationale "depth wins over visit-frequency" absent. | **thin** |
| **D3** Mechanism A + B for stateless workflow glue | FR-10, FR-11. Rationale "counters the '5 tools = 5 Google searches = 5 competitors' failure mode" absent. | **thin** |
| **D4** First-visit job is priority; time-to-competence | SM-1. Target ≤ 30s present. Rationale "replaces feature-count and parse-success" absent. | **thin** |
| **D5** Craft is the differentiator, operationalized | §1 Vision, FR-15–FR-21. Rationale referencing Skeptic 3's "describing me with extra steps" is absent. | **thin** |
| **D6** DoD is 7 falsifiable items, every tool, no exceptions | FR-22–FR-28. Rationale "separates craft-as-claim from craft-as-discipline" absent. | **thin** |

**Pattern:** Decisions are present as constraints; **rationales are dropped**. The FR structure silently loses the "why" layer that the brief explicitly preserves.

---

## 4. Seven Critical Discoveries CD1–CD7

| Discovery | PRD coverage | Status |
|---|---|---|
| **CD1** Skeptic 3's "describing me with extra steps" is load-bearing | **Not surfaced.** | **missing** |
| **CD2** Local-first is architecture, not discipline | See §2a above. | **thin** |
| **CD3** 10-second load ceiling as falsifiable bedrock | See §2b above. | **thin** |
| **CD4** Doc's biggest internal contradiction resolved | See §2c above. | **thin** |
| **CD5** MVP tool list doesn't survive depth-pressure | See §2d above. | **thin** |
| **CD6** "Craft" without operationalization is a slogan | Implicit in FR-15–FR-28. Not surfaced as a discovery. | **thin** |
| **CD7** Future-proofing is a design requirement, not a hope | **DD1 in PRD** is "time-to-result budget band width" — **DD1 in brief** is "future-proofing operationalization." See §6 below — **DD numbering drift is severe here.** | **missing** (the discovery itself is not surfaced) |

**CD1 is the most load-bearing critique.** Its absence is a structural gap.

---

## 5. Four Risks Accepted RA1–RA4

| Risk | PRD coverage | Status |
|---|---|---|
| **RA1** Behavioral correctness prioritized over privacy rigor | Referenced obliquely in DD5 (brief DD1 — privacy rigor timeline). The "Behavioral correctness prioritized over privacy rigor" framing is not preserved. | **thin** |
| **RA2** No artificial ship deadline | "DoD as the gating event" framing absent. The §6.1 scope says "ship when the gate passes" implicitly. | **thin** |
| **RA3** Stateless model accepts lost competitive surface | Cited in §5 Non-Goals (SaaS features). Trade-off framing ("table-stakes possibility") absent. | **thin** |
| **RA4** Mechanism D (PWA) deferred | §5 Non-Goals, §6.2 Out of Scope. Trigger criterion ("if post-MVP users express a clear 'I came back and lost my work' complaint") absent. | **thin** |

---

## 6. DD numbering drift — **CRITICAL**

**Brief's DD list (5 items):**
- DD1 — Future-proofing operationalization
- DD2 — Time-to-result budget band width
- DD3 — Discovery / SEO ownership
- DD4 — Naming verification
- DD5 — JSON Surgeon depth-extension plan

**PRD's DD list (5 items):**
- DD1 — Time-to-result budget band width (was brief DD2)
- DD2 — Discovery / SEO ownership (was brief DD3)
- DD3 — Naming verification (was brief DD4)
- DD4 — JSON Surgeon depth-extension plan (was brief DD5)
- DD5 — Privacy rigor timeline (was **not in brief DD list**; new in PRD)

**Drift:**
1. Every PRD DD is **brief DD shifted by one**. The brief's DD1 (future-proofing operationalization) is **completely absent** from the PRD's §8 Open Questions.
2. PRD's DD5 (Privacy rigor timeline) is a **new commitment** that didn't exist in the brief's DD list.
3. The PRD numbering preserves the count (5) but breaks the cross-doc traceability.

**Status: missing** (brief DD1 — future-proofing operationalization) + **drift** (DD1–DD4 shift) + **added** (PRD DD5).

---

## 7. Seven Craft Practices — verbatim check

| Practice | PRD text | Verbatim? |
|---|---|---|
| 1. Kind error messages | FR-15 references FR-8. Full text in FR-8. | **paraphrase** (FR-8 has the substance but reformatted) |
| 2. Graceful edge cases | FR-16: "The tool handles malformed input, boundary sizes, missing fields, and adversarial input predictably. It never silently does the wrong thing." | **verbatim** |
| 3. Teaching empty states | FR-17 references FR-7. | **paraphrase** |
| 4. Refusing jobs that can't be done well | FR-18 references FR-6. | **paraphrase** |
| 5. Honest changelogs | FR-19: "Every fix gets a date, a scope, and an entry written at the moment the bug is reported — not retroactively prettified." | **verbatim** |
| 6. Visible-at-moment-of-trust privacy signal | FR-20 references FR-9. | **paraphrase** |
| 7. Public postmortems | FR-21: "When something breaks that affects users, the postmortem is published on the public repo fast and includes what we will do to prevent the class of bug." | **verbatim** |

Practices 1, 3, 4, 6 are **defer-to-FR** constructions rather than verbatim restatement. The "Never silently does the wrong thing" tail of practice 2 is preserved. Practice 5 and 7 are verbatim. Practice 1's "plain-language explanation and a concrete next step" is paraphrased in FR-8 as "1-sentence explanation + 1-sentence next step."

---

## 8. Seven-item DoD — verbatim check

| DoD item | PRD text | Verbatim? |
|---|---|---|
| 1. Edge-case test suite green | FR-22: "Includes BOM, NaN, BigInt, deeply nested structures, and a 50MB real-world file. The tool never crashes on inputs that exist in the wild." | **verbatim** |
| 2. Privacy audit clean (SHIP GATE) | FR-23: "No network calls, no analytics, no fonts, no CDN, no transitive-dependency leaks. Reproducible by a stranger with DevTools open. This criterion blocks public release until met." | **verbatim** |
| 3. Three outside users on real work files | FR-24: "Three outside users have used the tool on real work files without surprise. Not lab demos — real files, real workflows, real feedback." | **verbatim** |
| 4. Honest changelog written before any bug is fixed | FR-25: "The changelog entry exists at the moment the bug is reported, not retrofitted." | **verbatim** |
| 5. Solo half-day "try to break it" finds no crash | FR-26: "Includes malformed input, adversarial input, and inputs at the boundary of supported sizes." | **paraphrase** (the "solo half-day" framing is preserved but the lead sentence is dropped) |
| 6. Empty state teaches | FR-27 references FR-7. | **paraphrase** |
| 7. Every error message has explanation + next-step | FR-28 references FR-8. | **paraphrase** |

**Privacy audit as ship gate:** preserved (FR-23 bold "SHIP GATE"). The brief's exemplar "Trailing comma at line 14 — JSON does not allow trailing commas. Remove the comma after `"name"` and try again." is **not** carried forward.

---

## 9. Compare page plan

| Brief | PRD | Status |
|---|---|---|
| DD3 (brief) — "stable URLs, SEO-tested brand, **Compare pages**" | DD2 (PRD) — "Stable URLs (FR-12) and SEO-tested brand require ownership." **Compare pages** not named. | **missing** |

The "Compare page day 1" commitment in the brief is dropped in the PRD.

---

## 10. Naming verification pending

| Brief | PRD | Status |
|---|---|---|
| 4 checkboxes: domain, trademark, GitHub/npm/social handle, pronounceability. Block ship until confirmed. | DD3 (PRD): "the four Naming Status checkboxes (domain, trademark, GitHub/npm/social handle, pronounceability) are not yet confirmed. Block ship until confirmed." | **cover** |

Names preserved. Numbering shifted (brief DD4 → PRD DD3).

---

## 11. Non-audiences

| Brief | PRD | Status |
|---|---|---|
| Mobile, desktop wrappers, CLI, enterprise | §2.2 Non-Users (v1): "Mobile users, desktop-wrapper users, CLI users, and enterprise teams." §5 Non-Goals. | **cover** |

---

## 12. Depth-vs-shallow axis

| Tool | Brief | PRD | Status |
|---|---|---|---|
| CSV Rescue | "the 1" | "the 1" — §1, §6.1 | **cover** |
| JSON Surgeon | MVP candidate #2 — depth-extension required | §6.2 Out of Scope as separate MVP tool. DD4 (PRD) depth-extension plan still required. | **cover** (paraphrased: brief calls it "MVP candidate"; PRD moves it to explicit out-of-scope pending depth-extension) |
| API Response Diff | MVP candidate #3 — clearly deep | §6.2 Out of Scope (deferred to v2). | **cover** |
| Screenshot → Color System | Out — shallow; re-evaluate if depth-extension (accessibility contrast) | §6.2 Out of Scope. The accessibility contrast extension example is **not** preserved. | **thin** |
| File Metadata Cleaner | Out — shallow; re-evaluate if depth-extension (visual before/after) | §6.2 Out of Scope. The visual before/after extension example is **not** preserved. | **thin** |

**Note:** The brief's depth-extension examples (accessibility contrast for Screenshot → Color; visual before/after for File Metadata Cleaner) are the *reason* these tools are out — they document that re-evaluation is possible. PRD drops the extension examples, weakening the "re-evaluate later" framing.

---

## 13. Other gaps

### a. §11 Naming — original candidate list pointer

Brief: "Naming verification ... see `idea.md` §11 for the original candidate list."
PRD: Does not reference `idea.md` §11 candidate list. Naming verification is renamed "DD3" in PRD. The candidate-list reference is dropped.

**Status: missing**

### b. "100 tools" competitors named

Brief names "iLovePDF, ToolPool" as examples of breadth optimization.
PRD: Does not name competitors. Naming competitors is a brief-only artifact.

**Status: missing** (acceptable loss — PRD is brief-agnostic on competitors)

### c. JTBD for CSV Rescue

Brief: not explicitly stated.
PRD: §2.1: "find what's wrong with this CSV in under 30 seconds, without uploading the file."

**Status: cover** (PRD adds, not a gap)

### d. Recommended Next Step

Brief: "Resolve the five open questions before building CSV Rescue. The deepest of them is **DD5** ..."
PRD: Not preserved as a top-level recommendation.

**Status: missing**

### e. Brainstorm artifact reference

Brief: "_bmad-output/brainstorming/brainstorm-webanvil-predevelopment-2026-08-11/"
PRD: Same path referenced in §0 Document Purpose.

**Status: cover**

### f. Brief memlog reference

Brief: "`_bmad-output/planning-artifacts/briefs/brief-WebUtilityLab-2026-08-11/.memlog.md`"
PRD: Not referenced.

**Status: missing** (low impact)

### g. Persona name "Devon"

Brief: no persona.
PRD: §2.3 introduces "Devon, a backend developer ..."

**Status: cover** (PRD adds, not a gap)

### h. "cstrescue.dev" example URL

Brief: no URL.
PRD: UJ-1 uses "cstrescue.dev" as an example domain.

**Status: cover** (PRD adds)

### i. Skull emoji / decoration?

None observed. Not relevant.

---

## Summary of gaps

### Critical
1. **DD numbering drift** — brief DD1 (future-proofing operationalization) is **completely absent** from PRD; every PRD DD is shifted by one; PRD DD5 is a new commitment not in brief.
2. **CD1 missing** — Skeptic 3's "describing me with extra steps" the load-bearing critique is not surfaced. The PRD implicitly addresses it via D5/FR-15+ but never names it.
3. **"It costs you nothing because it doesn't remember you"** — pull-quote is absent.

### Thinning
4. **CD2–CD5** — present in spirit but lose the "surrounding 30%," "falsifiable bedrock," "retired §9 and §13," and "two of five MVPs" framings.
5. **D1–D6 rationales** — preserved as constraints only; rationales (the "why") dropped.
6. **RA1–RA4** — present but trade-off framing and trigger criteria lost.
7. **Craft Practices 1, 3, 4, 6** — defer-to-FR pattern, not verbatim. Practice 1's "plain-language + concrete next step" lightly paraphrased.
8. **DoD exemplar error message** ("Trailing comma at line 14 ... ") not preserved.
9. **Compare page** commitment dropped.
10. **Depth-extension examples** for Screenshot → Color and File Metadata Cleaner dropped.
11. **Recommended Next Step** dropped.

### Drift
12. **DD list re-numbered** — see §6 above. Cross-doc traceability broken.
13. **Naming candidate list reference** (`idea.md` §11) dropped.

### Preserved
- 7 Craft Practices substance (with defer-to-FR pattern)
- 7-item DoD (mostly verbatim; ship gate explicit)
- Non-audiences (mobile, desktop, CLI, enterprise)
- Naming verification 4 checkboxes (under PRD DD3)
- CSV Rescue = "the 1" (with reversal history)
- Privacy Baseline scope (no analytics, no fonts, no CDN, no transitive-deps)
- Brainstorm + brief artifact references in §0

---

## Top 5 gaps by load-bearing weight

1. **DD1 future-proofing operationalization missing** (brief DD1 → PRD slot occupied by a different commitment). The brief flags contributor guide / "why this exists" anchor / code-comment-WHY policy as unresolved. CD7's whole claim ("future-proofing is a design requirement, not a hope") loses its operational arm.
2. **CD1 (Skeptic 3) never named.** The load-bearing critique is the reason craft is operationalized. Without naming it, the rationale for D5/D6 is invisible.
3. **DD numbering drift** breaks cross-doc traceability for all 5 brief DD items.
4. **"It costs you nothing because it doesn't remember you"** — brand-line lost.
5. **D1–D6 + RA1–RA4 rationales dropped** — decisions remain as constraints, but the "why" layer that the brief explicitly preserves for 6-months-from-now is gone.

---

*End of reconciliation report. No rewrites proposed.*

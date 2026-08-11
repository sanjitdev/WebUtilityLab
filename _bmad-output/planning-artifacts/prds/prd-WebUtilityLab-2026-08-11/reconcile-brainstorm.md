# Brainstorm → PRD Reconciliation Report

**Date:** 2026-08-11
**Comparator:** PRD v0 against canonical brainstorm memlog + intent summary.
**Method:** For each load-bearing brainstorm output (D1–D7, CD1–CD7, RA1–RA4, DD1–DD6, time-budget framing, mechanism decisions, 3-pane UX insight, "skeptic's visit"/"empty workshop" framings, "behavioral correctness > privacy rigor" trade-off), the report labels PRD preservation as `cover` / `thin` / `missing` / `paraphrase` with quoted evidence.

---

## A. The 7 Decisions (D1–D7)

### D1. Stateless, one-shot, no-account, no-history core principle — Section 13 chainable workflows removed/relegated
- **Intent quote:** "Core platform principle is stateless, one-shot, no-account, no-history. Upload → process → download. The screwdriver, not the SaaS…Section 13's 'chainable workflows' framing is contradicted by this and is removed from goals."
- **PRD:** §1 Vision ("no account, no history, no cloud sync, no upload" + "the screwdriver, not the SaaS"); §5 Non-Goals "Chainable workflows…was `idea.md` §13. Reclassified per D1."
- **Label:** `cover`.

### D2. JSON Surgeon is "the 1" (subsequently reversed to CSV Rescue)
- **Intent quote:** "D2. JSON Surgeon is 'the 1' — the first tool to build…(Flag: Skeptic 3 marks JSON Surgeon as mixed-depth; re-evaluation of which 5 tools are 'clearly deep' is a deferred decision — see DD3.)"
- **Memlog line:** "(decision) DECISION: JSON Surgeon is 'the 1' — the first tool to build."
- **PRD:** §1 "The first tool is **CSV Rescue**." §6.2 Out-of-Scope: "JSON Surgeon as a separate MVP tool — high developer-frequency but requires a depth-extension plan…before building (DD5)." §9 Assumptions: "[ASSUMPTION: CSV Rescue 'the 1' status is durable] — from D2 (brief). Reversed from JSON Surgeon during brief discovery."
- **Label:** `cover` (the reversal is captured, but the underlying reason — Skeptic 3's mixed-depth diagnosis on JSON Surgeon — is not surfaced; see also DD3 below).
- **Gap note (thin):** PRD does not preserve the *mechanism* of the reversal. Memlog line 80: "user accepts Skeptic 3's diagnosis: 'deep vs shallow' is the right axis; of the 5 MVP tools, only CSV Rescue + API Response Diff are clearly deep; JSON Surgeon is mixed." The PRD states CSV Rescue is "the 1" but does not cite that JSON Surgeon was demoted specifically because it failed the depth criterion — a load-bearing reasoning step that downstream contributors will need to understand the precedent.

### D3. Mechanism A+B adopted day-1; C rejected; D deferred
- **Intent quote:** "D3. Mechanism A (file-in-hand handoff via file metadata) and Mechanism B (result-page 'next, you might want to...' links) adopted day-1 across all tools…Mechanism C (same-tab sessionStorage handoff) rejected…Mechanism D (PWA-as-persistent-environment, IndexedDB recent-files, 'last 5 tools' sidebar) deferred post-MVP."
- **PRD:** §3 Glossary ("Workflow glue — Mechanism A…Mechanism B…Mechanism D; deferred post-MVP"); §5 Non-Goals ("Mechanism C…rejected for UX and architectural reasons. Mechanism D…deferred post-MVP"); FR-10 (Mechanism A) and FR-11 (Mechanism B).
- **Label:** `cover`.
- **Thin note:** FR-11 says "When the user downloads a result file, the file's metadata (e.g., a comment line for text formats, or a sidecar JSON for binary) carries a small instruction." The intent doc's D3 describes Mechanism A as *file-in-hand handoff* and Mechanism B as *result-page static links*. The PRD has partially swapped the A/B labels relative to the memlog/intent (memlog line 40–41: "ADOPTED: Mechanism A (file-in-hand handoff via file metadata)" and "ADOPTED: Mechanism B (result-page 'next, you might want to...' links)"). The PRD's FR-10 is the static links (B); FR-11 is the file metadata handoff (A). **This is a `paraphrase` risk** — the mechanism numbering in the PRD does not match the brainstorm's A/B assignment, and could confuse future readers cross-referencing memlog decisions. (Read closely: the §3 Glossary uses the correct A/B mapping, but FR-10/FR-11 in §4 swap them. Inconsistent within the PRD.)

### D4. First-visit job priority; success metric is time-to-competence
- **Intent quote:** "D4. First-visit job is the priority for JSON Surgeon. Success metric is time-to-competence — time from page load to user saying 'I have my answer and trust the answer.'"
- **PRD:** §7 SM-1 ("Time-to-competence — time from page load to user saying 'I have my answer and trust the answer.' Target: median ≤ 30 seconds for the first user session on CSV Rescue"); §3 Glossary ("Time-to-competence — Time from page load to user saying 'I have my answer and trust the answer.' Primary success metric (SM-1)").
- **Label:** `cover` (with the implied scope substitution — JSON Surgeon → CSV Rescue — captured as an assumption).

### D5. Craft as 7 operationalized practices
- **Intent quote:** lists the 7 practices verbatim.
- **PRD:** §1 ("operationalized in the 7 Craft Practices and the 7-item Definition of Done"); FR-15 through FR-21 list the 7 practices; §3 Glossary entry.
- **Label:** `cover`. All 7 are present and numbered.

### D6. DoD as 7 falsifiable items
- **Intent quote:** lists the 7 items verbatim.
- **PRD:** FR-22 through FR-28 list all 7 items; FR-23 explicitly marked **SHIP GATE**.
- **Label:** `cover`.

### D7. Quality-over-speed is committed; deadline is the DoD, not a calendar
- **Intent quote:** "D7. Quality-over-speed is committed. No artificial 'ship in 3 months.' Ship when the 5 tools are genuinely excellent."
- **PRD:** §1 ("Every tool is built to the same bar; nothing ships that doesn't meet it."); §5 Non-Goals ("Tool-count positioning — '500 free online tools' framing is explicitly disowned"); SM-C2 ("Number of tools shipped — *do not* optimize for tool count. Depth over breadth (per D6, CD5)").
- **Label:** `cover` (but note the mis-attribution in SM-C2: it cites "D6, CD5" — D6 is the DoD decision, CD5 is the "MVP tool list doesn't survive depth-pressure" discovery. The intended reference is probably D7 (quality-over-speed) and CD5 (depth-pressure). Cosmetic but the wrong decision-anchor makes the chain of reasoning harder to trace for a future contributor. Label: `paraphrase` for the citation, `cover` for the substance.)

---

## B. The 7 Critical Discoveries (CD1–CD7)

### CD1. Skeptic 3: "you are describing me with extra steps"
- **Intent quote:** "CD1. The load-bearing critique is Skeptic 3's: 'You are describing me with extra steps.'…The whole differentiator argument collapses unless WebAnvil's response is craft-as-practice, not craft-as-claim. This is the single most important thing the PRD must internalize."
- **Memlog line 78:** "'You're describing me with extra steps. Local-first doesn't matter when I'm already fast and free. Your craft is invisible in tab-comparison; your absent-features framing is marketing.'"
- **PRD:** §1 mentions craft-as-practice; §4 §FR-15–FR-21 operationalize it. But the PRD never names Skeptic 3, never surfaces the *threat* the differentiator must answer, and never references tab-comparison. A future contributor reading the PRD learns the practices but not *why* they are non-negotiable.
- **Label:** `thin`. The differentiator is implemented; the load-bearing critique that *justifies* operationalization is absent from the PRD. Without CD1 framing, "kind error messages" reads as a niceness choice rather than a survival response to a competitor who already does what WebAnvil claims.

### CD2. Privacy risk lives in the surrounding 30% — local-first is architecture, not discipline
- **Intent quote:** "CD2. Local-first is architecture, not discipline. The privacy risk lives in the surrounding 30% — analytics, error reporters, fonts, CDN logs, transitive deps, dev-tooling leaks — not in the core feature. 'No API calls in core' is necessary and insufficient. Pre-mortem PM-3 and PM-10 are brand-ending events from this gap."
- **PRD:** §3 Glossary defines Privacy Baseline ("no analytics, no fonts, no CDN, no transitive-dependency side-effects"); §6.1 includes it; §5 Non-Goals excludes analytics; FR-23 (DoD) covers "no transitive-dependency leaks."
- **Label:** `cover` for the structural elements, but `thin` for the framing. The PRD enforces the 30% rules but does not surface the *posture* — "architecture, not discipline" — that explains why these specific prohibitions exist and why they are structural, not negotiable. A new contributor might re-add a font CDN as a "small UX nicety" without understanding the brand-ending risk.

### CD3. 10-second load ceiling rules out Local LLM / slow crawlers / full ZIP scans
- **Intent quote:** "CD3. The 10-second load ceiling is a falsifiable user-perceived bedrock, not a technical nice-to-have. It rules out Local LLM tools, slow crawlers, full ZIP scans as MVP candidates — not by opinion but by physics of the budget."
- **PRD:** §5 Non-Goals ("Local LLM tools — WebLLM, ONNX, Transformers.js-based tools are deferred. The 10-second load budget rules them out as MVP candidates (CD3).")
- **Label:** `cover`.

### CD4. §9 "Workflows rather than tiny utilities" and §13 chainable workflows contradicted by stateless-as-goal
- **Intent quote:** "CD4. The doc's biggest internal contradiction: §9 'Workflows rather than tiny utilities' and §13 'browser-native workbench' with chained operations vs. the now-committed stateless-one-shot principle. §13 must be reclassified as 'future possibility, not goal.'"
- **PRD:** §5 Non-Goals ("Chainable workflows — running multiple tools together in a chain is 'future possibility, not goal' (was `idea.md` §13). Reclassified per D1."); §6.2 ("Workflow chains — explicitly non-goal.").
- **Label:** `cover` (with the minor gap that §9 'workflows rather than tiny utilities' from idea.md is not explicitly flagged in the PRD as contradicted; only §13 is reclassified. The §9 contradiction is left implicit. Label: `thin` for completeness — only §13 named, §9 not named.)

### CD5. MVP tool list does not survive depth-pressure
- **Intent quote:** "CD5. The MVP tool list as written does not survive depth-pressure. Three of the five MVP tools are shallow by Skeptic 3's reckoning. Depth-over-breadth (INV-2) and the 'depth vs. shallow' axis mean the MVP tool list is a decision, not a default."
- **PRD:** §6.2 lists each non-MVP tool with shallow-by-depth-criterion rationale; SM-C2 cites "Depth over breadth (per D6, CD5)" — but mis-cites D6 (DoD) instead of D7 (quality-over-speed).
- **Label:** `cover` for the substance (each deferred tool is explicitly flagged shallow); `paraphrase` for the citation chain (D6 mis-attributed).

### CD6. Craft without operationalization is a slogan
- **Intent quote:** "CD6. 'Craft' without operationalization is a slogan. The 7-practice list (D5) and the 7-item DoD (D6) are what make the differentiator real. PRD must include both verbatim."
- **PRD:** Both lists present verbatim in §4 (FR-15–FR-21 and FR-22–FR-28).
- **Label:** `cover`.

### CD7. Future-proofing is a design requirement, not a hope
- **Intent quote:** "CD7. Future-proofing is a design requirement, not a hope. Pre-mortem PM-5 and PM-12: solo-maintainer project with no successor design will go dark. This is in scope for day 1, not post-launch."
- **PRD:** FR-13 "Open source from day 1" partially addresses this; but the broader DD2 future-proofing operationalization (contributor guide, architecture-without-original-author, one-paragraph "why this exists", code-comments-explain-WHY) is captured only as an open question in §8 (DD2 maps to "Discovery / SEO ownership" — but wait, **DD2 in the intent doc is the future-proofing decision, not discovery/SEO**; this is another `paraphrase` / `missing` risk). The PRD §8 has five DDs, but the *content* of DD2 has been swapped (see §D below).
- **Label:** `thin` to `missing` — the day-1 future-proofing posture (CD7) is implicit in FR-13 but the explicit "code-comments-explain-WHY" / "architecture-without-original-author" deliverables that operationalize CD7 are not present. The 10x memlog items for PM-5 and PM-12 specifically called out these artifacts.

---

## C. The 4 Risks Accepted (RA1–RA4)

### RA1. Behavioral correctness prioritized over privacy rigor
- **Intent quote:** "RA1. Behavioral correctness prioritized over privacy rigor (against coach recommendation). Rationale given: 'no API calls in core' is treated as structurally sufficient. Caveats logged and not resolved by the rationale…If a privacy leak happens, the brand is unrecoverable. Privacy-audit-as-DoD (item D6.2) is the cheapest possible mitigation."
- **PRD:** §8 DD5 "Privacy rigor timeline. Privacy baseline is enforced from day 1 (per FR-23, Privacy Baseline). Formal threat model and adversarial review are deferred post-MVP. Risk accepted per RA1; revisit when first privacy leak is found."
- **Label:** `cover` (the trade-off is named, the risk-accepted status is preserved, the mitigation is cited). However, the PRD does not surface the *coach dissent* that the trade-off explicitly went against. A future contributor reading "behavioral correctness #1, privacy rigor deferred" without the dissent context may re-flip the priority without realizing this was a contested decision.
- **Sub-label:** `thin` for the contested-decision framing (the dissent is in memlog line 31 and 33 but absent from PRD).

### RA2. No artificial ship deadline
- **Intent quote:** "RA2. No artificial ship deadline. Risk: solo project without a deadline becomes 'perpetually polishing.' Mitigation deferred — relies on DoD as the gating event."
- **PRD:** §5 Non-Goals ("Tool-count positioning…disowned"); SM-C2 "Depth over breadth"; FR-23 marked ship gate. The DoD-as-deadline framing is implicit but not stated.
- **Label:** `cover` (substance) / `thin` (framing) — the DoD-as-gating-event principle is what makes RA2's mitigation work; the PRD applies the mitigation (DoD ship gate) but does not name the risk that motivates it (perpetual-polishing). A future contributor might propose a "ship-by-X-date" cut without realizing this was explicitly risk-accepted with DoD as the chosen countermeasure.

### RA3. Stateless model accepts lost competitive surface
- **Intent quote:** "RA3. Stateless model accepts lost competitive surface. History, accounts, sync, share-by-link, collab are explicitly not built. If the market demands any of these as table-stakes, WebAnvil's positioning has to absorb that — not the other way around."
- **PRD:** §5 Non-Goals ("SaaS features for any tool — accounts, history, cloud sync, share-by-link, collaboration, sign-in, saved state.").
- **Label:** `cover` (the prohibitions are listed). `thin` for the framing — the PRD does not articulate that *if* these become table-stakes, WebAnvil "absorbs" rather than adds features. This is a posture the PRD does not preserve.

### RA4. Mechanism D deferred
- **Intent quote:** "RA4. Mechanism D (PWA persistent environment) deferred. If post-MVP users express a clear 'I came back and lost my work' complaint, this becomes the next-build priority."
- **PRD:** §5 Non-Goals ("Mechanism D (PWA persistent environment) — deferred post-MVP."); §6.2 ("Mechanism D…deferred post-MVP."); §3 Glossary ("PWA…Mechanism D; deferred post-MVP.").
- **Label:** `cover`.

---

## D. The 6 Deferred Decisions (DD1–DD6)

This is where the **PRD significantly diverges** from the intent doc. The intent doc lists:
- DD1: Privacy baseline scope (audit-as-DoD-or-post-launch?)
- DD2: Future-proofing operationalization (public repo, contributor guide, architecture-without-original-author, etc.)
- DD3: Re-evaluation of MVP tool set on deep-vs-shallow axis
- DD4: First-10-second experience budget (band width, refusal policy)
- DD5: Naming (domain / trademark verification)
- DD6: Discovery / SEO plan

The PRD's §8 lists only **five** DDs and the *content mapping* is different:
- PRD DD1 = intent DD4 (time-budget band width, ±30% proposed)
- PRD DD2 = intent DD6 (discovery / SEO ownership)
- PRD DD3 = intent DD5 (naming verification)
- PRD DD4 = intent DD3 (JSON Surgeon depth-extension plan)
- PRD DD5 = intent DD1 (privacy rigor timeline)

**The intent doc's DD2 (future-proofing operationalization) is absent from the PRD's DD list.** It is partially absorbed into FR-13 ("Open source from day 1") but the specific deliverable list (contributor guide, architecture-without-original-author, one-paragraph "why this exists", code-comments-explain-WHY) is **missing**.

- **Label:** `missing` (DD2 future-proofing deliverables are not surfaced as open questions); `paraphrase` for the renumbering of the remaining DDs (which means cross-references between memlog/intent and PRD will not line up).

### DD1 (intent) — Privacy baseline scope (audit blocks ship, or post-launch?)
- **Intent quote:** "does the privacy audit (DoD item 2) block ship, or is it a post-launch commitment?"
- **PRD:** §8 DD5 (Privacy rigor timeline). The PRD has resolved this — privacy audit is the ship gate (FR-23 marked SHIP GATE). So intent-DD1 is *resolved* in the PRD, not deferred. The risk-accepted posture (RA1) is preserved.
- **Label:** `cover` (decision preserved) — but with the note that the original framing ("audit-as-DoD or post-launch?") is now closed without explicit trace that the user was asked.

### DD2 (intent) — Future-proofing operationalization — **MISSING**
- **Label:** `missing`. See above. The candidate deliverable list from the intent doc (public repo from day 1, contributor guide, architecture-without-original-author, one-paragraph "why this exists", code-comments-explain-WHY) is reduced to just the public-repo item in FR-13. The other four candidates are not surfaced as day-1 requirements or open questions. CD7 (future-proofing is a design requirement) is therefore weakly supported.

### DD3 (intent) — Deep-vs-shallow re-evaluation of MVP tool set
- **Intent quote:** "Skeptic 3's diagnosis: of the 5 MVP tools in idea.md §12, only CSV Rescue and API Response Diff are clearly deep. JSON Surgeon is mixed. Screenshot → Color System and File Metadata Cleaner are shallow. Which 5 ship in MVP? Is 'the 1 = JSON Surgeon' still correct given this?"
- **PRD:** §6.2 names each deferred tool as "shallow by the depth criterion"; §9 Assumptions notes JSON Surgeon reversed to CSV Rescue.
- **Label:** `cover` (the resolution is present, though the depth-criterion rationale is paraphrased — PRD says "shallow by the depth criterion" but does not invoke Skeptic 3 or the deep-vs-shallow axis by name).

### DD4 (intent) — Time-budget band width, ±30%, refusal policy
- **Intent quote:** "Coach's 5s-to-meaningful-result rule was rejected as too strict. Final rule needs a number and a measurement method. Candidate: pre-flight estimation shows a band ('~10s ±30%'), refuses jobs whose upper bound exceeds the threshold. Confirm band width and refusal policy."
- **PRD:** FR-6 Pre-flight time estimation with band ("~3s ±30%") and refusal on upper-bound exceeding budget; §8 DD1 (in PRD's numbering) "±30% band, refuse if upper bound exceeds 10s. Confirm before launch."
- **Label:** `cover`. (Note: PRD cites 10s as the budget threshold, matching intent; FR-6 example uses ~3s which is reasonable as an illustrative band, not the ceiling.)

### DD5 (intent) — Naming verification
- **Intent quote:** "idea.md §11 commits WebAnvil but flags 'domain and trademark availability must be independently verified before committing.' Has this verification happened? If not, name is provisional."
- **PRD:** §1 title is "WebUtilityLab" (not WebAnvil) — note the *naming change* in the PRD itself. §8 DD3 "WebUtilityLab is committed as the product name, but the four Naming Status checkboxes…are not yet confirmed. Block ship until confirmed."
- **Label:** `cover` (the verification question is preserved). The product-name swap from WebAnvil to WebUtilityLab is itself load-bearing — the PRD never explains *why* the name changed, only that it is the working title pending verification. A contributor cross-referencing memlog entries titled "brainstorm-webanvil-predevelopment" will need to know the rename happened.

### DD6 (intent) — Discovery / SEO ownership
- **Intent quote:** "Pre-mortem PM-6: brand is SEO-tested before launch; tool URLs are stable, named, linkable. Who owns this and what's the deliverable?"
- **PRD:** §8 DD2 "Stable URLs (FR-12) and SEO-tested brand require ownership; brief flags the requirement but does not assign an owner. Risk: deprioritized and forgotten."
- **Label:** `cover`.

---

## E. Time-budget framing (10s acceptable, 10min not; band + refusal)

- **Memlog lines 16–17, 22–23:** "user sets load-time ceiling: 10s acceptable, 10min not. Establishes a falsifiable user-perceived bedrock…pre-flight estimation from data size + complexity sample; show user a band ('~10s ±30%') not a fixed number; refuse jobs whose upper bound exceeds threshold."
- **PRD:** §5 Non-Goals ("Local LLM tools…The 10-second load budget rules them out as MVP candidates"); FR-6 "Pre-flight time estimation…band (e.g., '~3s ±30%')…If the upper bound of the band exceeds the budget (currently 10s — see §8 Open Question DD1), the tool refuses the operation…"; §8 DD1 (PRD numbering) "±30% band, refuse if upper bound exceeds 10s."
- **Label:** `cover`. The framing is preserved. Note that the coach's 5s rule, which the user rejected as too strict, is not in the PRD — which is appropriate, since it was rejected — but the *rejection* itself is not preserved. A future contributor might re-propose the 5s rule.

---

## F. Workflow glue (A+B adopted, C rejected, D deferred)

Covered in §A D3 above. The PRD's FR-10/FR-11 *swap* the A/B labels relative to the memlog/intent.

- **Memlog:** A = file metadata handoff; B = static next-tool links.
- **PRD:** FR-10 = static next-tool links (this is intent's B); FR-11 = file metadata handoff (this is intent's A). §3 Glossary uses the correct A/B mapping, but §4 inverts them.
- **Label:** `paraphrase` (internal inconsistency in the PRD — anyone cross-referencing will land on the wrong section). Also: the rationale for rejecting C ("breaks 'open in new tab' UX and undermines Mechanism D's coherence") is captured in spirit but not verbatim in §5 Non-Goals.

---

## G. 3-pane UI insight for JSON Surgeon (input → schema + anomalies → output)

- **Memlog line 73:** "user: JSON Surgeon three-pane / 'tool surfaces the one worry' framing is 'alright' — fits without dominating. Not a pushback, not a strong endorsement."
- **Intent:** D2's flag notes JSON Surgeon's mixed depth; the 3-pane insight is a UX principle associated with it.
- **PRD:** CSV Rescue's results pane has four sections ("detected problems, data-quality score, inferred schema, one-click Clean and export"). This is structurally analogous to the 3-pane insight (input → inferred schema + anomalies → output/result), but the PRD does not name it as a UX principle or preserve the framing.
- **Label:** `paraphrase` to `thin` — the 3-pane insight is structurally realized for CSV Rescue but the *principle* (input → inferred/derived state → output) is not preserved as a reusable UX posture for future tools. A contributor designing JSON Surgeon (or tool #3) later would have to rediscover this from the CSV Rescue FRs rather than apply a stated principle.

---

## H. Invented techniques' framings — "Skeptic's Visit" / "Empty Workshop"

- **Memlog:** Technique T6 "The Skeptic's Visit" (lines 75–78) and T7 "The Empty Workshop" (referenced line 81–82) are invented for this brainstorm.
- **PRD:** Neither technique name appears. The Empty Workshop's outcome — user's "I should make it future proof" reaction — is absorbed into CD7 in the intent but is only thinly captured in the PRD (FR-13 partial; DD2 deliverables missing — see §D above).
- **The Skeptic's Visit's output** — three named critics, of which Skeptic 3 was chosen as load-bearing — is partially captured via CD1 (critique is implicit in §1 framing) but the PRD does not cite the technique, the critic, or the tab-comparison context.
- **Label:** `missing` for the technique names (techniques are process, not artifact — not necessarily a PRD loss); `thin` for the Empty Workshop's future-proofing deliverables; `thin` for the Skeptic 3 framing in CD1.

---

## I. "Behavioral correctness > privacy rigor" trade-off and structural mitigation

- **Memlog lines 31, 33:** user flipped the priority order against coach recommendation; rationale is "no API calls in core"; caveats (analytics, fonts, CDN logs, transitive deps, dev-tooling leaks) explicitly *not* covered by the assumption.
- **PRD:** §8 DD5 ("Risk accepted per RA1") names the trade-off; FR-23 ship gate and Privacy Baseline glossary entry are the structural mitigation.
- **Label:** `cover` for the trade-off and mitigation. `thin` for the *structural* character of the mitigation — the PRD enforces the privacy baseline via FRs/DoD but does not articulate the principle that *privacy rigor may be deferred but privacy baseline is non-negotiable*. The trade-off's structural mitigation is implicit (Privacy Baseline in glossary, marked enforced) but the principle behind it is not.

---

## Summary Table

| Brainstorm Item | Status | Label |
|---|---|---|
| D1 Stateless principle + §13 reclassification | §1, §5 | `cover` |
| D2 JSON Surgeon "the 1" → CSV Rescue reversal | §1, §6.2, §9 | `cover` (substance), `thin` (Skeptic 3 depth-axis rationale) |
| D3 Mechanism A+B adopted, C rejected, D deferred | §3, §5, FR-10/11 | `cover` (substance), `paraphrase` (A/B swapped in §4) |
| D4 First-visit time-to-competence | §3, §7 | `cover` |
| D5 7 Craft Practices | §4 FR-15–21 | `cover` |
| D6 7-item DoD | §4 FR-22–28 | `cover` |
| D7 Quality-over-speed | §5, §7 | `cover`, `paraphrase` (SM-C2 cites wrong decision) |
| CD1 Skeptic 3 "extra steps" | §1 (implicit) | `thin` (critic + critique absent) |
| CD2 Surrounding-30% privacy risk | §3, FR-23, §5 | `cover` (rules), `thin` (posture) |
| CD3 10s load ceiling | §5 | `cover` |
| CD4 §13 contradiction | §5, §6.2 | `cover` (only §13 named; §9 contradiction implicit) |
| CD5 MVP depth-pressure | §6.2 | `cover`, `paraphrase` (SM-C2 mis-cites D6) |
| CD6 Operationalization | §4 | `cover` |
| CD7 Future-proofing day-1 | FR-13 | `thin` (DD2 deliverables absent) |
| RA1 Behavioral > privacy | §8 DD5 | `cover` (decision), `thin` (coach dissent absent) |
| RA2 No deadline / DoD as gate | §5, FR-23 | `cover`, `thin` (perpetual-polishing risk unstated) |
| RA3 Stateless accepts surface loss | §5 | `cover`, `thin` (posture) |
| RA4 Mechanism D deferred | §5, §6.2 | `cover` |
| DD1 (intent) Privacy scope → ship gate | §8 DD5, FR-23 | `cover` |
| DD2 (intent) Future-proofing deliverables | (absent) | **`missing`** |
| DD3 (intent) Deep-vs-shallow re-eval | §6.2 | `cover` |
| DD4 (intent) Time-budget band | FR-6, §8 DD1 | `cover` |
| DD5 (intent) Naming verification | §8 DD3 | `cover` (with rename WebAnvil→WebUtilityLab unexplained) |
| DD6 (intent) Discovery/SEO | §8 DD2 | `cover` |
| Time-budget framing | FR-6, §5, §8 | `cover` |
| Workflow glue A+B/C/D | FR-10/11, §3, §5 | `cover`, `paraphrase` (A/B swapped in §4) |
| 3-pane UX insight | (CSV Rescue structure) | `paraphrase`/`thin` (principle not preserved as reusable posture) |
| Skeptic's Visit / Empty Workshop framings | (absent) | `missing` (techniques), `thin` (Empty Workshop future-proofing only partial) |
| Behavioral > privacy trade-off + structural mitigation | §8 DD5, FR-23 | `cover` (decision + mitigation), `thin` (principle behind structural choice) |

---

## Top 5 Gaps (ranked by load-bearing weight)

1. **DD2 future-proofing operationalization is missing.** The intent doc's candidate list (contributor guide, architecture-without-original-author, one-paragraph "why this exists", code-comments-explain-WHY) is reduced to FR-13 public-repo only. CD7's day-1 successor-readiness posture is therefore not load-bearing in the PRD. *Highest gap.*

2. **CD1 Skeptic 3 framing is thin.** The craft-as-practice differentiator is operationalized (FR-15–21) but the load-bearing critique that justifies *why* it must be operationalized (competitors already do local-first in tab-comparison; absent-features framing is marketing) is absent. Future contributors may relax the practices without realizing they are survival responses, not niceties.

3. **A/B mechanism labels are swapped in §4.** §3 Glossary uses correct A=metadata-handoff, B=static-links; FR-10/FR-11 in §4 invert them. Internal inconsistency makes memlog/intent cross-references land on the wrong PRD sections.

4. **The product-name change (WebAnvil → WebUtilityLab) is unexplained.** PRD works on the new name with no trace of why. Anyone joining from the brainstorm artifacts will hit a context gap.

5. **The §9 vs §13 contradiction is only half-captured.** §13 chainable workflows is reclassified in §5 Non-Goals. The §9 "workflows rather than tiny utilities" contradiction is not named. A reader would have to know to look for the §9 conflict.

Honorable mentions (thin): the coach dissent on RA1 (behavioral > privacy) is not surfaced; the perpetual-polishing risk behind RA2 is not surfaced; SM-C2 mis-cites D6 instead of D7.
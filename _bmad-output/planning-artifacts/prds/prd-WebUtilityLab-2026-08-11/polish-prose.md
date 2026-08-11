# Prose Polish Report — WebUtilityLab PRD

**File:** `prd.md`
**Lens:** prose (sentence-level clarity, voice, vocabulary, fluff, abstract vs. concrete, hidden-verb verbs, register consistency)
**Date:** 2026-08-11

Findings are ordered by line range. Each entry: line range → quoted snippet → issue → suggested rewrite. Category in brackets: `blocker` / `should-fix` / `nit`.

---

## 1. Voice & register swings between marketing and spec

### Finding 1.1 — §1, line 28
> "**It costs you nothing because it doesn't remember you.**"

**Issue:** Marketing line lands in the middle of an otherwise spec-leaning Vision block. Surrounding prose (lines 24–32) is declarative and operational; this line is a slogan. It also sits as the only blockquote in §1, giving it visual weight that overshadows the actual differentiator claim on line 26 ("craft-as-practice, operationalized").

**Suggested rewrite:** Move the line to the end of §1 as a closing one-liner, OR rephrase in spec-register: "No account, no history, no cloud sync, no upload — the platform has no per-user state to bill against." Keep it; just land it more deliberately.

**Category:** `should-fix` (placement/transition).

### Finding 1.2 — §1, line 32
> "During brainstorm, the load-bearing critique was this: *"You're describing me with extra steps."*"

**Issue:** The Vance quote is doing two jobs: (a) crediting the brainstorm source, and (b) stating the differentiation thesis. As a quote it reads as voice-shift — the only Vance quote in the PRD — and the framing ("the load-bearing critique was this") is throat-clearing around what is essentially one sentence.

**Suggested rewrite:** Drop the framing. Lead with the thesis: "Competitors already offer local-first, no-signup, and free; 'we also do those things' is not a differentiator. The 7 Craft Practices and 7-item DoD are the response — operationalized survival behaviors under tab-comparison pressure, not niceness choices. (Source critique, brainstorm memlog: *"You're describing me with extra steps."*.)"

**Category:** `should-fix` (throat-clearing + register break).

### Finding 1.3 — §0, line 18
> "Length is calibrated to hobby/solo — about two pages of dense narrative plus the FR/NFR tables."

**Issue:** Meta-commentary about document length is throat-clearing. The PRD itself doesn't need to argue it's the right length; the brief and structure do that work.

**Suggested rewrite:** Cut the sentence. (Or move to a separate meta-note outside the PRD body.)

**Category:** `nit` (cuttable).

---

## 2. Hedge-stacks and throat-clearing

### Finding 2.1 — §4.1, line 86
> "The user arrives with a 'what's wrong with this file?' question and leaves with a report they can trust and a cleaned file they can use."

**Issue:** Mild hedge-stack: "they can trust" and "they can use" are both floating. The user-journey block in §2.3 (line 60) already establishes "trust" as concrete ("the trust signal he needs"). Here it reads as marketing glide.

**Suggested rewrite:** "The user arrives with a 'what's wrong with this file?' question and leaves with a problems report, a data-quality score, an inferred schema, and a one-click cleaned CSV."

**Category:** `nit`.

### Finding 2.2 — §3, line 73 (Privacy Baseline)
> "**Local-first is architecture, not discipline** — the privacy risk lives in the surrounding 30% (analytics, error reporters, fonts, CDN logs, transitive dependencies that phone home, dev-tooling leaks), not in the core feature. 'No API calls in core' is necessary and insufficient; the Baseline is the structural mitigation that holds even when formal privacy rigor is deferred."

**Issue:** Long sentence with stacked appositives. The "30%" figure is unanchored (referring to what? the codebase? the dependencies?); reads as rhetoric. The closing "necessary and insufficient" is jargon-y throat-clearing.

**Suggested rewrite:** "**Local-first is architecture, not discipline.** Privacy risk lives in the surrounding dependencies — analytics, fonts, CDN logs, transitive packages, dev-tooling — not in the core feature. Enforcing 'no API calls in core' is necessary but insufficient; the Privacy Baseline is the structural mitigation that holds when formal privacy review is deferred."

**Category:** `should-fix` (unanchored number, jargon).

### Finding 2.3 — §8 DD6, lines 332–337
> "*Contributor guide* — written or deferred? … *Architecture-without-original-author* — is the codebase structured to be readable without Sanjit in the room?"

**Issue:** The bullet list is four rhetorical questions rather than four assumptions or four decisions. Mixed register: italic-styled labels ("written or deferred?") read like prompt copy, not PRD content.

**Suggested rewrite:** "Resolve before launch: contributor guide, 'Why this exists' anchor, architecture-without-original-author, and a code-comments-explain-WHY policy are the candidate day-1 future-proofing artifacts. Solo-maintainer projects with no successor design go dark."

**Category:** `should-fix` (register: questions in a PRD read as undecided).

### Finding 2.4 — §5, line 277
> "**Marketing copy that is unfalsifiable** — every claim must be demonstrable in DevTools by a stranger."

**Issue:** This is a non-goal stated as a self-imposed constraint about copy. Reads as the author arguing with themselves rather than scoping the product. Same register problem as Finding 1.2.

**Suggested rewrite:** "**Every external claim is DevTools-verifiable by a stranger** — no copy that cannot be falsified by opening DevTools." (Or move to FR as a Craft Practice if it's not already one.)

**Category:** `nit` (cuttable or relocate).

---

## 3. Hidden-verb / vague-action verbs

### Finding 3.1 — §3, line 70
> "The user may install the platform as a PWA, but each tool's behavior is stateless."

**Issue:** "Behavior is stateless" — "behavior" hides the work. The glossary entry for PWA also hides work: "Progressive Web App — installable, offline-capable browser app."

**Suggested rewrite (line 70):** "The user may install the platform as a PWA, but each tool stores nothing between sessions."

**Category:** `nit`.

### Finding 3.2 — §4.2 FR-16, line 222
> "The tool handles malformed input, boundary sizes, missing fields, and adversarial input predictably. It never silently does the wrong thing."

**Issue:** "Handles" is the prototype hidden verb. The sentence promises behavior but doesn't specify it; the "It never silently does the wrong thing" half is the actual claim.

**Suggested rewrite:** "On malformed input, boundary sizes, missing fields, or adversarial input, the tool returns a clear error (per FR-8) or a kind refusal (per FR-6) — never a silent wrong answer."

**Category:** `should-fix` (concrete rewrite needed).

### Finding 3.3 — §4.2 FR-22, line 248
> "Includes BOM, NaN, BigInt, deeply nested structures, and a 50MB real-world file. The tool never crashes on inputs that exist in the wild."

**Issue:** "Includes" + "The tool never crashes" — neither names an actor. DoD is a falsifiable criterion; this reads as aspiration.

**Suggested rewrite:** "Edge-case test suite covers BOM, NaN, BigInt, deeply nested structures, and one 50MB real-world file. CSV Rescue returns a clear error (per FR-8) on each, never a crash."

**Category:** `should-fix`.

### Finding 3.4 — §4.2 FR-26, line 264
> "Includes malformed input, adversarial input, and inputs at the boundary of supported sizes."

**Issue:** Same "includes" pattern as 3.3, but here there's no actor at all.

**Suggested rewrite:** "Half-day adversarial pass: malformed input, adversarial input, and inputs at the size boundary. No crash."

**Category:** `nit`.

### Finding 3.5 — §6.2, line 303
> "**Public Compare page per deep tool** — committed for v1 in idea.md §10 (one-page artifact showing our result vs. the closest competitor's on the same dataset); captured as an open-question deliverable under DD2 (Discovery / SEO ownership)."

**Issue:** Run-on with two parentheticals and a cross-reference chain (`idea.md §10` → `DD2`). Reads as a TODO note pasted into the PRD.

**Suggested rewrite:** "**Public Compare page per deep tool** — committed for v1 per `idea.md §10`. Ownership captured under DD2."

**Category:** `nit` (parentheticals).

---

## 4. Vocabulary consistency with §3 Glossary

### Finding 4.1 — "Tool" vs "tools" (multiple)
The Glossary (line 66) defines **Tool** with capital T as a formal term. The body of the PRD uses "tool" lowercase throughout, including in formal contexts ("Each tool runs upload → process → download"). This is fine for natural reading, but §1 line 26 says "Every tool is built to the same bar" — and §4.1 FR headers use "the tool" consistently. **No change required**; flagging for awareness.

**Category:** `nit` (consistent as-is).

### Finding 4.2 — "User" term
Glossary (line 67): "Synonym not allowed elsewhere in this PRD." The body uses "user," "they," "Devon," "the developer" — Devon is a persona, "user" is the formal term. **Consistent.** Good.

**Category:** none.

### Finding 4.3 — "Result" vs "report" vs "cleaned file"
Glossary (line 68) defines **Result** as "the artifact a tool produces for the user. In CSV Rescue, the result is a report (problems, score, schema) and an optional cleaned file."

**Issue:** FR-1 through FR-5 use "results pane," "results," "results page" loosely. Glossary defines it precisely. Some FRs use "report" (FR-3 "data quality score… brief breakdown"), which is fine per glossary, but FR-5 says "export a cleaned CSV" without saying "as part of the Result."

**Suggested rewrite:** FR-1 consequence line 96 already uses "results" — leave it. But FR-5 line 131 "export a cleaned CSV" → "export the Result's cleaned CSV." (Single change.)

**Category:** `nit`.

### Finding 4.4 — "Ship gate" (line 74, line 250)
Glossary says "Privacy audit (DoD item 2) is the only ship gate." FR-23 (line 250) is tagged `(**SHIP GATE**)` and the consequence restates "This criterion blocks public release until met." Glossary and FR-23 are consistent. **No change.**

**Category:** none.

### Finding 4.5 — "PWA" (line 77, line 280)
Glossary line 77 says "Mechanism D; deferred post-MVP." §5 line 280 also says deferred. Consistent. **No change.**

**Category:** none.

### Finding 4.6 — "Stateless"
Glossary defines Stateless (line 70) as "no account, no history, no persistence between sessions on the user's behalf." Vision line 24 uses "no account, no history, no cloud sync, no upload" — adds "cloud sync" and "upload" not in the glossary definition. Minor drift, not wrong.

**Suggested rewrite:** None required; flag for awareness.

**Category:** `nit`.

---

## 5. Marketing / fluff / unfalsifiable phrases

### Finding 5.1 — §1, line 26
> "The differentiator is craft-as-practice, operationalized in the 7 Craft Practices and the 7-item Definition of Done. Every tool is built to the same bar; nothing ships that doesn't meet it."

**Issue:** "Craft-as-practice" is the term being defined; using it to define itself is mildly circular. "Built to the same bar" is unfalsifiable without the DoD reference.

**Suggested rewrite:** "The differentiator is the 7 Craft Practices (FR-15–FR-21) and the 7-item DoD (FR-22–FR-28). Every tool must clear all 14 before ship; nothing is released that fails them."

**Category:** `nit`.

### Finding 5.2 — §4.2 FR-21, line 240
> "When something breaks that affects users, the postmortem is published on the public repo fast and includes what we will do to prevent the class of bug."

**Issue:** "Fast" is the unfalsifiable word. Assumption A5 (line 345) resolves "fast" to 7 days, but FR-21 doesn't carry that number. **This is a content-fix issue (assumed out of scope here) but the prose is fluff until the number lands.**

**Suggested rewrite (prose-only):** "When a bug class breaks for users, a public postmortem lands in the repo (or `/postmortems`) within 7 days of the incident and names the preventive change."

**Category:** `should-fix` (cross-reference Assumptions Index entry).

### Finding 5.3 — §3 line 73 (Privacy Baseline cont.)
> "…the Baseline is the structural mitigation that holds even when formal privacy rigor is deferred."

**Issue:** "Formal privacy rigor" is jargon-vague. Defer-to-what? Same as 2.2.

**Suggested rewrite:** see 2.2.

**Category:** `should-fix`.

### Finding 5.4 — §7, SM-C3 (line 317)
> "The model is stateless; repeat visits are earned by quality, not engineered."

**Issue:** "Earned by quality, not engineered" is rhetoric. The "stateless" claim is the falsifiable part.

**Suggested rewrite:** "The platform is stateless (per Glossary); repeat visits come from result quality, not retention mechanics."

**Category:** `nit`.

---

## 6. Concrete vs abstract

### Finding 6.1 — §6.1, line 292
> "7 Craft Practices and 7-item DoD applied to CSV Rescue."

**Issue:** "Applied to" is abstract — says nothing about what application means.

**Suggested rewrite:** "FR-15–FR-28 enforced as ship gates for CSV Rescue (per §3 DoD)."

**Category:** `nit`.

### Finding 6.2 — §8 DD5 (line 329)
> "Formal threat model and adversarial review are deferred post-MVP. Risk accepted per RA1; revisit when first privacy leak is found."

**Issue:** "Risk accepted per RA1" — RA1 is not defined in this PRD. (Cross-reference to brief.) "Revisit when first privacy leak is found" — vague trigger.

**Suggested rewrite:** "Formal threat model and adversarial review are deferred post-MVP (per brief RA1). Revisit trigger: the first reported privacy leak in any channel."

**Category:** `nit` (unanchored acronym).

### Finding 6.3 — §2.3 UJ-1 line 58
> "He trusts the report because the tool shows him the offending row, the column, and the value, with a one-sentence explanation of the rule it broke."

**Issue:** Concrete and well-written. **No change.** Noting as the high bar other prose should match.

**Category:** none.

---

## 7. Sentence-level: run-ons

### Finding 7.1 — §0, line 20 (Naming history)
> "During brief discovery the name was revised to **WebUtilityLab** to better signal the 'utility screwdriver' framing the brief adopted. The canonical rename decision is recorded in the brief memlog. Verification of the four Naming Status checkboxes (domain, trademark, GitHub/npm/social handle, pronounceability) remains pending — see §8 DD3. Until those four are confirmed, WebUtilityLab is a working title, not a final name."

**Issue:** Four sentences chained with semicolons. Reads as a wall of meta. The "Until those four are confirmed" sentence restates what "pending" already says.

**Suggested rewrite:** "During brief discovery the name was revised from WebAnvil to **WebUtilityLab** to signal the 'utility screwdriver' framing (rename logged in brief memlog). Verification of the four Naming Status checkboxes (domain, trademark, GitHub/npm/social handle, pronounceability) remains pending (see §8 DD3); until confirmed, WebUtilityLab is a working title, not final."

**Category:** `should-fix` (merge two sentences, cut redundant final clause).

### Finding 7.2 — §2.2 (line 46)
> "Mobile users, desktop-wrapper users, CLI users, and enterprise teams. The audience is developer/technical-professional and the adjacent 'people forbidden from uploading' market. Reaching other surfaces would dilute the depth story."

**Issue:** Three short sentences in a row. The second ("The audience is…") restates the first by negation. The third is the only one doing work.

**Suggested rewrite:** "Non-users (v1): mobile, desktop-wrapper, CLI, and enterprise — reaching those surfaces would dilute the depth story for developer/technical-professional and the adjacent 'forbidden from uploading' market."

**Category:** `nit`.

### Finding 7.3 — §6.1, line 287
> "All FRs in §4.1 and §4.2 (FR-1 through FR-28)."

**Issue:** Sentence fragment with full stop. Same pattern appears in §4.1 (line 88 "**Functional Requirements:**" followed by a fragment). PRD uses fragments intentionally as a stylistic choice; flagging only because the prose elsewhere is full-sentence.

**Suggested rewrite:** None — consistent with house style. (If house style is fragments-as-bullets, this is correct.)

**Category:** `nit`.

---

## 8. Style nits (egregious only)

### Finding 8.1 — Em-dash vs hyphen
Throughout the PRD, em-dashes (—) are used correctly as parenthetical separators. Hyphens used for compound modifiers ("real-world file," "PWA persistent," "load-bearing critique"). Consistent. **No change.**

**Category:** none.

### Finding 8.2 — Quotation marks
Curly quotes used throughout (e.g., "describing me with extra steps," "Try the example"). Mixed with straight quotes in some FR consequences (e.g., line 107 "RFC-5322-ish," line 169 "This file never leaves your browser."). Last sentence uses straight quotes inside an em-dash parenthetical — likely a paste artifact.

**Suggested rewrite:** Normalize all in-PRD quotation marks to curly quotes for consistency.

**Category:** `nit`.

### Finding 8.3 — Bold-as-term
Heavy use of **bold** for first-use term definitions (e.g., line 22 `**WebUtilityLab**`). Consistent. **No change.**

**Category:** none.

---

## 9. Concrete-actor rewrite: §2.3 (Devon) verdict

Devon's journey (lines 50–63) is the gold standard for prose in this PRD: named actor, concrete actions, specific UI text, falsifiable outcomes. Other sections should aspire to this register. **No change.**

---

## 10. Summary categorization

**Blockers:** None.

**Should-fix (8):**
- 1.1 — Marketing line placement in §1
- 1.2 — Vance quote framing (throat-clearing)
- 2.2 — Privacy Baseline hedge-stack + unanchored 30%
- 2.3 — DD6 bullet-list rhetorical questions
- 3.2 — FR-16 "handles"
- 3.3 — FR-22 "includes / never crashes"
- 5.2 — FR-21 "fast" unfalsifiable
- 7.1 — §0 Naming history run-on

**Nits (13):**
- 1.3, 2.1, 2.4, 3.1, 3.4, 3.5, 4.1, 4.3, 4.6, 5.1, 5.4, 6.1, 6.2, 7.2, 7.3, 8.2

**No-change (acknowledged consistent):** 4.2, 4.4, 4.5, 6.3, 8.1, 8.3.

---

## Top 5 (for compact summary)

1. **§1 line 32 — Vance quote framing (should-fix).** Throat-clearing + voice break; rewrite to lead with thesis, cite quote as source.
2. **§1 line 28 — Marketing line placement (should-fix).** Move/rephrase; slogan currently sits in mid-Vision.
3. **§3 line 73 — Privacy Baseline hedge-stack (should-fix).** Cut unanchored 30%, replace jargon with concrete categories.
4. **§0 line 20 — Naming history run-on (should-fix).** Merge four semicolon-chained sentences; cut restated clause.
5. **§4.2 FR-16 / FR-22 — Hidden verbs "handles" / "includes" (should-fix).** Replace with named actors and concrete behaviors.

**File written to:** `C:\ZDrive Folders\Projects\WebUtilityLab\_bmad-output\planning-artifacts\prds\prd-WebUtilityLab-2026-08-11\polish-prose.md`
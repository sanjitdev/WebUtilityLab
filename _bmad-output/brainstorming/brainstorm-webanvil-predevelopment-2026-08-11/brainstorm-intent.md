# WebAnvil — Brainstorming Intent

## Topic
Pre-development critique and idea generation for WebAnvil, a browser-first utility platform whose compute platform is the browser, not a backend.

## Goal
Pressure-test the idea.md before any code is written: surface caveats, weak assumptions, contradictions, and missed opportunities so the product brief and PRD start from a defensible base.

## Decisions made

**D1. Core platform principle is stateless, one-shot, no-account, no-history.** Upload → process → download. The screwdriver, not the SaaS. SaaS features (accounts, history, cloud sync, share-by-link, collab) are explicitly out of scope and not a competitive loss.
*Rationale:* Aligns with local-first bedrock; keeps infrastructure cost near zero; turns "it doesn't remember you" into a brand asset. Section 13's "chainable workflows" framing is contradicted by this and is removed from goals.

**D2. JSON Surgeon is "the 1" — the first tool to build.** Subsequent tools only if the first validates.
*Rationale:* Highest developer visit frequency; developer-frequency signals WebAnvil's market is developers, not casual users; one tool forces depth over breadth. (Flag: Skeptic 3 marks JSON Surgeon as mixed-depth; re-evaluation of which 5 tools are "clearly deep" is a deferred decision — see DD3.)

**D3. Mechanism A (file-in-hand handoff via file metadata) and Mechanism B (result-page "next, you might want to..." links) adopted day-1 across all tools.** Mechanism C (same-tab sessionStorage handoff) rejected: breaks "open in new tab" UX and undermines future coherence. Mechanism D (PWA-as-persistent-environment, IndexedDB recent-files, "last 5 tools" sidebar) deferred post-MVP.
*Rationale:* A+B are trivial-cost stateless glue that counter the "5 tools = 5 Google searches = 5 competitors" failure without violating stateless-as-goal. C is a UX trap. D requires Mechanism D's own foundation.

**D4. First-visit job is the priority for JSON Surgeon.** Success metric is **time-to-competence** — time from page load to user saying "I have my answer and trust the answer."
*Rationale:* Replaces feature-count and parse-success as the success measure. Aligns with the landing-must-show-depth lesson from pre-mortem PM-1.

**D5. "Craft" is the un-copyable differentiator — operationalized as 7 practices, not a marketing claim:**
1. Kind error messages
2. Graceful edge-case handling
3. Teaching empty states
4. Refuse jobs that can't be done well
5. Honest changelogs (written *before* a bug, not after)
6. Visible-at-moment-of-trust privacy signal
7. Public postmortems

*Rationale:* Skeptic 3's "you're describing me with extra steps" lands because craft is invisible in tab-comparison. Operationalizing it makes it reproducible by a stranger, not a vibe.

**D6. Definition of Done (DoD) — 7 falsifiable items, every tool, no exceptions:**
1. Edge-case test suite green: BOM / NaN / BigInt / deep nesting / 50MB
2. Privacy audit clean: no network calls, no analytics, no fonts, no CDN, no transitive-dep leaks
3. Three outside users use it on real work files without surprise
4. Honest changelog written *before* a bug
5. Solo half-day "try to break it" finds no crash
6. Empty state teaches
7. Every error message has explanation + next-step

*Rationale:* DoD is what separates craft-as-claim from craft-as-discipline. Without it, "operationalized" is a word, not a gate.

**D7. Quality-over-speed is committed.** No artificial "ship in 3 months." Ship when the 5 tools are genuinely excellent.
*Rationale:* Aligns with craft-as-differentiator. The deadline is the DoD, not a calendar.

## Deferred decisions (open questions for the user)

**DD1. Privacy baseline scope.** Decision is "behavioral correctness #1, privacy rigor post-MVP" (risk-accepted, see RA1). What is the *minimum* privacy-baseline rule set that ships day-1 vs. what lands after MVP? Concrete: does the privacy audit (DoD item 2) block ship, or is it a post-launch commitment?

**DD2. Future-proofing operationalization.** User reaction to "Empty Workshop" was "I should make it future proof" — vague, important. What are the concrete day-1 deliverables? Candidate list (needs user pick): public repo from day 1, contributor guide, architecture-without-original-author, one-paragraph "why this exists," code-comments-explain-WHY.

**DD3. Re-evaluation of MVP tool set on the deep-vs-shallow axis.** Skeptic 3's diagnosis: of the 5 MVP tools in idea.md §12, only CSV Rescue and API Response Diff are clearly deep. JSON Surgeon is mixed. Screenshot → Color System and File Metadata Cleaner are shallow. Which 5 ship in MVP? Is "the 1 = JSON Surgeon" still correct given this?

**DD4. First-10-second experience budget.** User set 10s acceptable, 10min not. Coach's 5s-to-meaningful-result rule was rejected as too strict. Final rule needs a number and a measurement method. Candidate: pre-flight estimation shows a band ("~10s ±30%"), refuses jobs whose upper bound exceeds the threshold. Confirm band width and refusal policy.

**DD5. Naming.** idea.md §11 commits WebAnvil but flags "domain and trademark availability must be independently verified before committing." Has this verification happened? If not, name is provisional.

**DD6. Discovery / SEO plan.** Pre-mortem PM-6: brand is SEO-tested before launch; tool URLs are stable, named, linkable. Who owns this and what's the deliverable?

## Critical discoveries

**CD1. The load-bearing critique is Skeptic 3's: "You are describing me with extra steps."** Local-first, privacy, no-signup, free — competitors already offer most of these in tab-comparison. The whole differentiator argument collapses unless WebAnvil's response is craft-as-practice, not craft-as-claim. This is the single most important thing the PRD must internalize.

**CD2. Local-first is architecture, not discipline.** The privacy risk lives in the surrounding 30% — analytics, error reporters, fonts, CDN logs, transitive deps, dev-tooling leaks — not in the core feature. "No API calls in core" is necessary and insufficient. Pre-mortem PM-3 and PM-10 are brand-ending events from this gap.

**CD3. The 10-second load ceiling is a falsifiable user-perceived bedrock, not a technical nice-to-have.** It rules out Local LLM tools, slow crawlers, full ZIP scans as MVP candidates — not by opinion but by physics of the budget.

**CD4. The doc's biggest internal contradiction: §9 "Workflows rather than tiny utilities" and §13 "browser-native workbench" with chained operations vs. the now-committed stateless-one-shot principle.** §13 must be reclassified as "future possibility, not goal."

**CD5. The MVP tool list as written does not survive depth-pressure.** Three of the five MVP tools are shallow by Skeptic 3's reckoning. Depth-over-breadth (INV-2) and the "depth vs. shallow" axis mean the MVP tool list is a decision, not a default.

**CD6. "Craft" without operationalization is a slogan.** The 7-practice list (D5) and the 7-item DoD (D6) are what make the differentiator real. PRD must include both verbatim.

**CD7. Future-proofing is a design requirement, not a hope.** Pre-mortem PM-5 and PM-12: solo-maintainer project with no successor design will go dark. This is in scope for day 1, not post-launch.

## Risks accepted

**RA1. Behavioral correctness prioritized over privacy rigor (against coach recommendation).** Rationale given: "no API calls in core" is treated as structurally sufficient. Caveats logged and not resolved by the rationale: analytics, fonts, CDN logs, transitive-dep leaks, dev-tooling leaks. If a privacy leak happens, the brand is unrecoverable. Privacy-audit-as-DoD (item D6.2) is the cheapest possible mitigation; user to confirm whether it's required to ship or post-launch.

**RA2. No artificial ship deadline.** Risk: solo project without a deadline becomes "perpetually polishing." Mitigation deferred — relies on DoD as the gating event.

**RA3. Stateless model accepts lost competitive surface.** History, accounts, sync, share-by-link, collab are explicitly not built. If the market demands any of these as table-stakes, WebAnvil's positioning has to absorb that — not the other way around.

**RA4. Mechanism D (PWA persistent environment) deferred.** If post-MVP users express a clear "I came back and lost my work" complaint, this becomes the next-build priority. Accepting near-term friction in exchange for stateless-coherence.

## Doc revisions needed (concrete edits to `docs/idea.md`)

1. **§3 Product Vision / §5 High-Potential Tool Ideas** — replace "workflows rather than tiny utilities" with the depth-over-breadth framing; add the "library is the floor, not the ceiling" line (INV-8).
2. **§7 Product Architecture** — add the privacy-baseline rule set: no analytics, no fonts (system stack only), no CDN for runtime code, every transitive dependency audited on release. This is the "surrounding 30%" treated as architecture, not discipline.
3. **§9 Product Differentiation** — replace generic bullets with the 7-practice craft list (D5) and add a "Privacy baseline" subsection that lists the explicit prohibitions (analytics, fonts, CDN, side-effectful transitive deps).
4. **§12 Recommended MVP** — flag that the 5-tool list is provisional pending depth re-evaluation (DD3). State the deep-vs-shallow criterion explicitly.
5. **§13 Longer-Term Vision** — reclassify as "future possibility, not goal." Remove the implicit contradiction with stateless-as-goal (D1). Replace with the stateless-as-brand-asset line: "It costs you nothing because it doesn't remember you."
6. **Add §15 Craft Practices** — the 7-practice list (D5), verbatim.
7. **Add §16 Definition of Done** — the 7-item falsifiable DoD (D6), verbatim, with the explicit note that it applies to every tool.
8. **Add §17 Open Questions** — DD1–DD6 surfaced for the user; MVP cannot lock until DD3 is resolved.
9. **Add §18 Privacy Risk Posture** — document RA1 explicitly so the trade-off isn't lost when the next contributor reads the doc.
10. **§11 Naming** — note that WebAnvil is provisional pending domain/trademark verification (DD5).

## Constraints disowned (explicitly ruled out — do not reappear)

- **SaaS features for MVP**: accounts, history, cloud sync, share-by-link, collaboration, sign-in, saved state. Out.
- **Mechanism C** (same-tab sessionStorage handoff): rejected for UX and architectural reasons. Out.
- **Section 13 chainable workflows as a goal**: future possibility only. Out of MVP scope.
- **Tool-count as positioning**: "500 free online tools" framing is explicitly disowned (INV-2). Out.
- **Artificial ship deadline**: no "ship in 3 months." Out.
- **Library wrappers as products**: wrapping Papa Parse / json-formatter-js in a div and calling it a tool is explicitly the anti-pattern (INV-8). Depth is required.
- **Marketing copy that is unfalsifiable**: "local-first" and "privacy-first" must be demonstrable in DevTools by a stranger (INV-10). Aspirational claims are out.
- **Tracking and analytics** of any kind until and unless DD1 is resolved the other way.

## Recommended next step

Open `docs/idea.md` and apply the 10 doc revisions above, then resolve DD3 (depth re-evaluation of the 5 MVP tools) — that single decision unblocks the PRD's scope section.

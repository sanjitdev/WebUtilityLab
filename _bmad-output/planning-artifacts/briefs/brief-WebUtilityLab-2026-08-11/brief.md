---
title: "WebUtilityLab — Product Brief"
status: draft
created: 2026-08-11
updated: 2026-08-11
project: WebUtilityLab
source: docs/idea.md
brainstorm: _bmad-output/brainstorming/brainstorm-webanvil-predevelopment-2026-08-11/
decisions: 6
open_questions: 4
---

# Product Brief: WebUtilityLab

## Executive Summary

WebUtilityLab is a browser-first utility platform. The browser is the compute platform, not the UI. Users drop a file, dataset, screenshot, or problem in; get a useful result; download it; leave. No account, no history, no cloud sync, no upload.

Each tool is a single-purpose, stateless one-shot — the platform as a collection of screwdrivers, not a SaaS subscription. The differentiator is craft-as-practice, operationalized in the 7 Craft Practices and the 7-item Definition of Done. Every tool is built to the same bar; nothing ships that doesn't meet it.

The first tool is **CSV Rescue**. Subsequent tools only if the first tool validates the platform.

## The Problem

Many online utilities upload the user's file to a server, require registration, gate functionality behind subscriptions, or wrap a basic transformation in an ad-laden interface. For users with a problem in hand, this is friction. For users who *cannot* upload their file (government, healthcare, legal, journalists, security researchers), it's a blocker.

The opportunity is to build tools that finish the workflow — not tools that expose a single low-level operation. "Drop a messy CSV and find everything wrong with it" is a workflow. "Here is a CSV viewer" is not.

## The Solution

Tools that do the thinking for the user. The tool infers schema, surfaces anomalies, flags inconsistencies, and proposes a clean output — without the user having to ask for each step. The user arrives with a problem; the tool produces a result the user can trust.

Privacy is enforced structurally: the privacy claim must be reproducible by a stranger with the network tab open. There is no second-life of the data on a backend.

> "It costs you nothing because it doesn't remember you."

## What Makes This Different

WebUtilityLab does not compete on tool count. Existing "100 tools" sites (e.g., iLovePDF, ToolPool) optimize for breadth; WebUtilityLab optimizes for depth. A tool that wraps Papa Parse (a popular CSV parser) in a button is shallow. A tool that surfaces schema inference, PII detection, and one-click cleaning on top of CSV parsing is deep.

The Craft Practices and the Definition of Done are what make the differentiator real. Without them the differentiator is a claim. With them it is a discipline a stranger can verify.

The **load-bearing critique** (Skeptic 3, from the brainstorm): "You are describing me with extra steps." See Critical Discovery 1 for the full framing.

## Who This Serves

**Primary user — developer or technical professional.** They hit small, recurring one-shot file, dataset, or code problems multiple times a week. They have been burned by cloud tools uploading sensitive data. They are allergic to signup walls and ad-laden interfaces.

**Adjacent market — people forbidden from uploading** to cloud tools: government, healthcare, legal, journalists, security researchers. For them, local-first is not a preference; it is a job requirement.

A user is one who can describe the problem they walked in with.

## Success Criteria

**User success signal — time-to-competence.** Time from page load to user saying "I have my answer and trust the answer." Target: under 30 seconds for the first tool.

**Tool success — every tool passes the 7-item Definition of Done** before it is considered shipped. "Looks good" is not a criterion.

**Platform success — the catalog grows in depth, not breadth.** New tools earn their place by being deep, not by filling a gap in the directory.

## The 7 Craft Practices

Every tool ships with these seven. A tool that ships without them is not a WebUtilityLab tool. See `idea.md` §12 for the original framing.

1. **Kind error messages.** Every error includes a plain-language explanation and a concrete next step. "Unexpected token at position 4235" is a bug report, not an error message.
2. **Graceful edge cases.** The tool handles malformed input, boundary sizes, missing fields, and adversarial input predictably. It never silently does the wrong thing.
3. **Teaching empty states.** The empty state is a tutorial, not a blank box. A first-time user knows what to do before they read any docs.
4. **Refusing jobs that can't be done well.** If the tool can't do the job well at the requested size, it says so and offers a smaller alternative. Silent degradation is a lie.
5. **Honest changelogs.** Every fix gets a date, a scope, and an entry written at the moment the bug is reported — not retroactively prettified.
6. **Visible-at-moment-of-trust privacy signal.** When the user is about to drop their file, the privacy claim is on screen — not in a footer, not in a policy page. "This file never leaves your browser" is visible at the drop zone.
7. **Public postmortems.** When something breaks that affects users, we publish the postmortem fast and include what we will do to prevent the class of bug.

## The 7-Item Definition of Done

Every tool must pass all seven criteria before it is considered shipped. These are falsifiable. They apply to every tool, not just the first. See `idea.md` §14 for the original framing.

> A *ship gate* is a criterion that blocks public release until met.

1. **Edge-case test suite green.** Includes BOM (a UTF-8 byte-order marker that some files carry at the start), NaN, BigInt, deeply nested structures, and a 50MB real-world file. The tool never crashes on inputs that exist in the wild.
2. **Privacy audit clean.** No network calls, no analytics, no fonts, no CDN, no transitive-dependency (libraries pulled in by libraries) leaks. Reproducible by a stranger with DevTools open. **This is a ship gate.**
3. **Three outside users have used it on real work files without surprise.** Not lab demos — real files, real workflows, real feedback.
4. **Honest changelog written before any bug is fixed.** The changelog entry exists at the moment the bug is reported, not retrofitted.
5. **A solo half-day "try to break it" finds no crash.** Includes malformed input, adversarial input, and inputs at the boundary of supported sizes.
6. **Empty state teaches.** A user who has never used the tool before sees the empty state and knows what to do next.
7. **Every error message has an explanation and a next-step.** "Trailing comma at line 14 — JSON does not allow trailing commas. Remove the comma after `\"name\"` and try again."

## Scope

### In (MVP)

- **CSV Rescue** as the first tool. The chosen "the 1" — cleanest depth story, strongest proof-of-concept for the brand.
- **JSON Surgeon** as MVP candidate #2 — high developer-frequency, but requires an explicit depth-extension plan (schema inference, JSDoc generation, query) to escape jsonformatter.org feature overlap.
- **API Response Diff** as MVP candidate #3 — clearly deep (structural diff, breaking-change detection has no free competitor).
- The 7 Craft Practices and the 7-item DoD applied to every shipped tool.
- **Privacy baseline** (no analytics, no fonts, no CDN, no transitive-dependency side-effects) enforced from day 1.
- **Workflow glue** — Mechanism A (file-in-hand handoff via file metadata) and Mechanism B (result-page "next, you might want to..." links) across all tools.
- **Public source code** on GitHub under a permissive open-source license (Apache-2.0 or MIT) from day 1.

### Out (MVP)

- **Screenshot → Color System** — shallow by the depth criterion. Re-evaluate only if a depth-extension is identified (e.g., accessibility contrast checking across the extracted palette).
- **File Metadata Cleaner** — shallow by the depth criterion. Re-evaluate only if a depth-extension is identified (e.g., visual before/after of stripped fields).
- **SaaS features** — accounts, history, cloud sync, share-by-link, collaboration, sign-in, saved state. Explicitly out of scope, not deferred.
- **Mechanism C** (same-tab browser storage handoff) — rejected for UX and architectural reasons.
- **Mechanism D** (a Progressive Web App — installable, offline-capable browser app — persistent environment) — deferred post-MVP.
- **The chainable-workflows vision** — reclassified as "future possibility, not goal." Not a roadmap item.
- **Tool-count as positioning** — "500 free online tools" framing is explicitly disowned.
- **Artificial ship deadline** — no "ship in 3 months." The deadline is the DoD, not a calendar.
- **Marketing copy that is unfalsifiable** — "local-first" and "privacy-first" must be demonstrable in DevTools by a stranger.
- **Tracking and analytics** of any kind.

### Naming

WebUtilityLab is the product name. Naming verification (domain availability, trademark conflict, GitHub/npm/social handle, pronounceability) is **pending** — see `idea.md` §11 for the original candidate list.

### Non-audiences (deliberate)

Mobile, desktop wrappers, CLI, and enterprise are not in scope. The audience is the developer/technical-professional and the adjacent "people forbidden from uploading" market. Reaching other surfaces would dilute the depth story.

## The 6 Load-Bearing Decisions

These shape every downstream choice. Rationale is short so 6-months-from-now you can remember why.

**D1. Stateless and one-shot.** Each tool runs upload → process → download with no persistence. SaaS features are explicitly out of scope. *Rationale:* aligns with local-first bedrock; keeps infrastructure cost near zero; turns "it doesn't remember you" into a brand asset.

**D2. CSV Rescue is "the 1."** *(Reversed from JSON Surgeon during brief discovery.)* Highest depth of the candidates; cleanest proof-of-concept for the brand. Subsequent tools only if the first tool validates the platform. *Rationale:* depth wins over visit-frequency; the alternative was competence-over-depth with a competing-tool overlap problem.

**D3. Mechanism A + B for stateless workflow glue.** A (file-in-hand handoff via file metadata) and B (result-page "next, you might want to..." links) are day-1 across all tools. *Rationale:* counters the "5 tools = 5 Google searches = 5 competitors" failure without violating stateless-as-goal.

**D4. First-visit job is the priority for CSV Rescue.** Success metric is **time-to-competence** — time from page load to user saying "I have my answer and trust the answer." *Rationale:* replaces feature-count and parse-success as the success measure.

**D5. Craft is the differentiator, operationalized as the 7 Craft Practices.** See "What Makes This Different" for the reasoning. *Rationale:* Skeptic 3's "describing me with extra steps" lands because craft is invisible in tab-comparison. Operationalizing it makes it reproducible by a stranger, not a vibe.

**D6. Definition of Done is 7 falsifiable items, every tool, no exceptions.** Including a privacy-audit-clean ship gate. *Rationale:* DoD is what separates craft-as-claim from craft-as-discipline. Without it, "operationalized" is a word, not a gate.

## The 7 Critical Discoveries

Surfaced in the brainstorm. These are the load-bearing insights the brief is built on.

**CD1. Skeptic 3's "You are describing me with extra steps" is the load-bearing critique.** Local-first, privacy, no-signup, free — competitors already offer most of these in tab-comparison. The whole differentiator argument collapses unless WebUtilityLab's response is craft-as-practice, not craft-as-claim.

**CD2. Local-first is architecture, not discipline.** The privacy risk lives in the surrounding 30% — analytics, error reporters, fonts, CDN logs, transitive dependencies that phone home, dev-tooling leaks — not in the core feature. "No API calls in core" is necessary and insufficient.

**CD3. The 10-second load ceiling is a falsifiable user-perceived bedrock.** It rules out Local LLM tools, slow crawlers, full ZIP scans as MVP candidates — not by opinion but by physics of the budget.

**CD4. The original doc's biggest internal contradiction is resolved.** `idea.md` §9 "workflows rather than tiny utilities" and the original §13 "browser-native workbench with chained operations" are now retired. The platform is stateless one-shot. The "future possibility" framing is honest about what changed.

**CD5. The MVP tool list as written does not survive depth-pressure.** Two of the five MVP tools are shallow by Skeptic 3's reckoning. The deep-vs-shallow axis is the new filter — and the brief reflects it.

**CD6. "Craft" without operationalization is a slogan.** The 7-practice list and the 7-item DoD are what make the differentiator real. The brief includes both verbatim.

**CD7. Future-proofing is a design requirement, not a hope.** Solo-maintainer project with no successor design will go dark. The brief treats this as in-scope for day 1 (public repo, contributor-friendly architecture, "why this exists" anchor).

## The 4 Risks Accepted

Captured so the trade-off isn't lost when the next contributor reads the brief.

**RA1. Behavioral correctness prioritized over privacy rigor.** The rationale given was that "no API calls in core" is structurally sufficient. The Privacy Baseline in the Differentiation section treats the *surrounding 30%* as architecture, locking in the cheap structural guarantees. The privacy *audit* (DoD item 2) closes the rigor gap as a ship gate.

**RA2. No artificial ship deadline.** Solo project without a deadline risks becoming "perpetually polishing." The mitigation is the DoD as the gating event — the deadline is built into the bar, not a calendar.

**RA3. Stateless model accepts lost competitive surface.** History, accounts, sync, share-by-link, collab are explicitly not built. If the market demands any of these as table-stakes, WebUtilityLab's positioning has to absorb that — not the other way around.

**RA4. Mechanism D (PWA persistent environment) deferred.** If post-MVP users express a clear "I came back and lost my work" complaint, this becomes the next-build priority. Accepting near-term friction in exchange for stateless-coherence.

## Open Questions

**DD1. Future-proofing operationalization.** Concrete day-1 deliverables are not yet pinned. Open decisions:
- *Contributor guide* — written or deferred?
- *"Why this exists" anchor* — where does it live (README? index page? both)?
- *Code-comment-WHY policy* — adopted formally, or aspirational?

The public repo decision is locked per D1; the rest is open.

**DD2. Time-to-result budget band width.** User set 10s acceptable, 10min not. The rule needs a concrete number and a measurement method before CSV Rescue ships. **Open:** band width (proposed ±30% around the 10s ceiling), refusal policy (proposed: refuse if upper bound exceeds the threshold). Both need confirmation.

**DD3. Discovery / SEO ownership.** The brief flags the requirement (stable URLs, SEO-tested brand, Compare pages) but who owns the deliverable is not assigned. Owner: unassigned. Default assumption: solo. Risk: deprioritized and forgotten.

**DD4. Naming verification.** WebUtilityLab is committed as the product name, but the four Naming Status checkboxes (domain, trademark, GitHub/npm/social handle, pronounceability) are not yet confirmed. Block ship until confirmed.

**DD5. JSON Surgeon depth-extension plan.** Before building JSON Surgeon as MVP tool #2, the depth-extension plan (schema inference, JSDoc generation, query) needs to be written. Without it, the second tool fails the depth criterion.

## Recommended Next Step

Resolve the five open questions before building CSV Rescue. The deepest of them is **DD5** — without it, the second tool fails the depth criterion. Then build CSV Rescue to the 7-item DoD. Ship when the gate passes.

---

*Source artifacts: `docs/idea.md` (updated 2026-08-11), the brainstorm session at `_bmad-output/brainstorming/brainstorm-webanvil-predevelopment-2026-08-11/`, and this brief's memlog at `_bmad-output/planning-artifacts/briefs/brief-WebUtilityLab-2026-08-11/.memlog.md`.*

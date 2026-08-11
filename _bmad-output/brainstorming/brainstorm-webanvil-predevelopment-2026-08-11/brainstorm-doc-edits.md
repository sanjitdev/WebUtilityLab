# Brainstorm Doc Edits — `idea.md`

**Session date:** 2026-08-11
**Source of truth:** `.memlog.md` (in this folder)
**Target doc:** `docs/idea.md`

---

## Priority order (do these first)

1. **Section 13 — Long-Term Vision** — contradiction with the stateless-as-goal decision. Resolve before any other change so downstream sections reference the right framing.
2. **Add a "Privacy Baseline" subsection in Section 7 (Architecture)** — locks in the cheap, structural privacy guarantees before privacy rigor is deferred.
3. **Add "Definition of Done" section (new Section 13, renumber 13 → 14 and 14 → 15)** — every later section implicitly references it; lock it in early.
4. **Add "Craft Practices" section (new Section 12, renumber 12 → 14)** — defines the un-copyable differentiator.
5. **Strengthen Section 12 (Recommended MVP) framing — stateless-as-the-platform**, and add **Depth Ranking** sub-bullet.
6. **Add "User Persona" subsection in Section 2 (Problem)** — without it, every design choice floats.
7. **Add "Naming Status" sub-bullet in Section 11** — quick, but currently the doc claims a name is recommended without saying it has been verified.
8. **Add "Discovery / SEO" subsection in Section 10 (Deployment)** — the brand depends on second-visit discoverability.
9. **Refine Section 7 (Architecture) — add pre-flight time-estimation rule** — operationalizes the 10s/5s budget.
10. **Add "Open Source / Public Repo from Day 1" sub-bullet in Section 10** — closes PM-12 (burnout / dark repo).

---

## Section 2 — Problem

### Sub-bullet — User persona (NEW)

**Issue:** The doc describes a feature list but never names a user. Every later design choice (UX, marketing line, tool selection) floats without a target.

**Suggested edit:** Insert after the bullet list that ends "potentially offline-capable":

```markdown
### Target user

The primary user is a **developer or technical professional** who:

- Hits small, recurring one-shot file/dataset/code problems multiple times a week
- Has been burned by cloud tools uploading sensitive data (logs, exports, API responses)
- Is allergic to signup walls, ad-laden interfaces, and "free tier, 3 ops/day" gating

The adjacent market — and the real reason WebAnvil exists — is **people forbidden from uploading** to cloud tools: government, healthcare, legal, journalists, security researchers. For them, local-first is not a preference; it is a job requirement.

WebAnvil is for users who can describe the problem they walked in with.
```

**Rationale:** The session explicitly named developer-frequency as the JSON Surgeon "the 1" signal, and the coach reframed the real market as the "people forbidden from uploading" segment — neither appears in the doc.

---

## Section 7 — Product Architecture

### Add pre-flight time-estimation rule (NEW subsection)

**Issue:** The doc's architecture diagram shows "Browser → JS/WASM → Result" but is silent on the user-perceived load-time budget and how a tool decides a job is too big before committing to it.

**Suggested edit:** After the "Technical philosophy" block, add:

```markdown
### Time-to-result rule

Every tool must complete its core operation within a **10-second user-perceived budget**. Operations that can exceed 10s on real data must:

1. **Pre-flight estimate** from data size + a small complexity sample
2. Show the user a **time band with tolerance** (e.g. "~10s ±30%") before processing starts
3. **Refuse** the job with a kind explanation and a smaller alternative if the upper bound of the estimate exceeds the budget
4. **Progressively enhance** operations that can stream — show partial results as soon as they exist, don't gate on full completion

This is a brand promise, not a metric: a user who has waited 12 honest seconds is fine; a user who has waited 8 unexplained seconds is not.
```

**Rationale:** The session decided the 10s ceiling is the actual user-perceived bedrock, and a fixed "5s rule" was rejected — instead, pre-flight estimation with a tolerance band was adopted (see First Principles Thinking in memlog).

### Add "Open source from day 1" sub-bullet (NEW)

**Issue:** The doc implies "no paid APIs" and "open-source libraries" but does not commit the project's own source to being open and public. PM-12 made this load-bearing.

**Suggested edit:** Append to the "Possible stack" bullet list:

```markdown
- **Source code is public from day 1** (GitHub, Apache-2.0 or MIT). Privacy claim must be reproducible by a stranger.
```

**Rationale:** PM-12 in the session showed that an unmaintained private repo is the single most likely end-state of a solo-dev quality-over-speed project — public-source-on-day-1 is the structural mitigation.

---

## Section 9 — Product Differentiation

### Add "Privacy Baseline" sub-bullet (NEW)

**Issue:** The doc lists "Privacy" as a differentiator (item 5) but only gestures at the architectural claim ("no paid APIs," local-first). It does not lock in the *cheap, structural* privacy baseline that holds even when privacy rigor is deferred. Per the session, the risk is in the surrounding 30% (analytics, error reporters, fonts, CDN logs, transitive deps), not the core feature.

**Suggested edit:** Replace the existing item 5 with:

```markdown
### 5. Privacy

Make "your data never leaves your device" a meaningful product feature where technically accurate.

**Privacy Baseline (non-negotiable from day 1):**

- **No analytics.** No GA, no Hotjar, no Mixpanel, no Plausible, no Cloudflare Analytics, no Sentry, no fullstory.
- **No error reporters.** Bugs surface via a user-triggered "Report a problem" link, not automatic phone-home.
- **No web fonts.** Use system stacks or self-host. Google Fonts is a third-party request.
- **No CDN with logging.** Static assets served from a CDN that does not log request bodies. Self-host where unsure.
- **Audited transitive dependencies.** `npm audit` + a manual review of every direct dep's transitive tree before each release. No deps known to phone home.
- **Open source from day 1.** Any third party can audit the privacy claim.

These are structural, not aspirational. The privacy rigor (formal threat model, adversarial review) is post-MVP. The baseline is not.
```

**Rationale:** The session explicitly flagged that "no API calls in core" is structurally insufficient — the privacy leak path is in the surrounding 30%. This locks in the cheap baseline that holds even with privacy rigor deferred.

---

## Section 10 — Deployment / Cost Strategy

### Add "Discovery / SEO" subsection (NEW)

**Issue:** The doc has no plan for how a user who had a great experience returns to WebAnvil three weeks later. PM-6 showed this is a brand-killer — repeat-visit is the second-visit question the user flagged as heaviest (Q2 in Question Storming).

**Suggested edit:** Append to the end of Section 10:

```markdown
### Discovery / SEO

A user who had a great experience must be able to find WebAnvil again. Discovery is a feature.

- Each tool lives at a **stable, named, human-readable URL** (e.g. `/json-surgeon`, not `/tool/12`).
- Tool pages lead with **the job**, not the feature list ("See what's wrong with this API response" before "Format / validate / transform").
- No SEO-stuffing. No "free JSON formatter online no signup no ads no login" × 30. The page is honest because the product is honest.
- **Open Graph + favicon + PWA manifest** so shared links look right in chat and on home screens.
- The brand name, domain, and tagline are **SEO-tested before launch** — search the likely intent queries and confirm WebAnvil surfaces above the existing tool directories.
- A public **Compare page** for each deep tool (same dataset, same operation, our result vs. the closest competitor's) is built day 1 for the deep tools.
```

**Rationale:** The session flagged repeat-visit (Q2) as the heaviest of the 12 Question Storming questions, and PM-6 showed that without SEO-tested brand + stable URLs, second-visit intent evaporates to competitors.

---

## Section 11 — Naming

### Add "Naming Status" sub-bullet (NEW)

**Issue:** The doc says domain and trademark availability *must be independently verified* but does not state whether it has been done.

**Suggested edit:** Add at the very end of Section 11:

```markdown
### Naming Status

- [ ] `webanvil.com` (or chosen TLD) availability confirmed
- [ ] No trademark conflict in the relevant class (software / SaaS / utilities)
- [ ] `webanvil` handle available on GitHub, npm (if scoped), and at least one social platform
- [ ] The name reads cleanly when said aloud and is spellable from a verbal recommendation

Until all four are checked, **WebAnvil is a working name, not a final name**.
```

**Rationale:** The session surfaced "future-proofing" as a vague-but-important concern that needed operationalization; the naming check is the first concrete operationalization (also addresses Q7 — what the doc won't mention that would be obvious in a year).

---

## Section 12 — Recommended MVP

### Reframe MVP — stateless-as-the-platform

**Issue:** The doc currently frames MVP as "3–5 tools that demonstrate the core thesis," which reads as a stepping stone toward the workflow vision in Section 13. The session decided stateless MVP *is* the platform, not a stepping stone.

**Suggested edit:** Replace the opening of Section 12 with:

```markdown
## 12. Recommended MVP

The MVP is not a stepping stone. **The platform IS a collection of stateless, one-shot transformations** — upload → process → download → leave. Like a screwdriver. There is no history, no account, no sync. SaaS features are explicitly out of scope, not deferred.

This is the product, not a phase of the product.

> **Marketing line:** "It costs you nothing because it doesn't remember you."

Start with 3–5 tools that demonstrate the core thesis. Do not start with 50.
```

**Rationale:** Session decision (First Principles Thinking): "stateless MVP is the goal, not a stepping stone. Platform IS a collection of stateless screwdrivers. Section 13 contradicted by this."

### Add "Depth Ranking" subsection (NEW)

**Issue:** The 5 MVP tools vary in depth. CSV Rescue and API Response Diff are clearly deep; JSON Surgeon is mixed; Screenshot → Color System and File Metadata Cleaner look shallow on inspection. Skeptic 3 (the competitor) made this the load-bearing critique: "you're describing me with extra steps."

**Suggested edit:** Add at the end of the MVP candidate set (after the "This gives the project multiple proof points" block):

```markdown
### Depth ranking

The five candidates are not equal in depth. Depth = "behavior the underlying library does not have." A tool that wraps Papa Parse in a button is shallow; a tool that surfaces schema inference, PII detection, and one-click cleaning on top of CSV parsing is deep.

| Rank | Tool | Depth | Notes |
|------|------|-------|-------|
| Deep | **CSV Rescue** | High | Surfaces problems the user couldn't find by eye. Standalone value. |
| Deep | **API Response Diff** | High | Diff + breaking-change detection + structural diff. Standalone value. |
| Mixed | **JSON Surgeon** | Medium | "The 1" pick by developer-frequency, but the feature list overlaps jsonformatter.org. Must add behavior beyond formatting (schema inference, JSDoc generation, query). |
| Shallow | **Screenshot → Color System** | Low | Without added behavior (e.g. accessibility contrast checking across extracted palette, live preview against user content), this is a 30-minute wrapper. Re-evaluate before building. |
| Shallow | **File Metadata Cleaner** | Low | Without added behavior (e.g. visual before/after of stripped fields, batch of N files), this is `exiftool -all= ` in a UI. Re-evaluate before building. |

**Implication:** the MVP should ship the two deep tools first, one mixed tool with a depth-extension plan, and only build the shallow ones if a depth extension is identified. A "shallow tool" in MVP is a Skeptic 3 victory.

**Every tool publishes a "features this tool will never have" list.** Disarm by absence: history, accounts, sync, share-by-link, collaborative editing, analytics on your data, account-bound saved presets.
```

**Rationale:** Skeptic 3 (competitor) was the user's pick as the scariest critic; depth-vs-shallow was the explicit axis they identified on the 5 MVP tools.

---

## Section 13 — Longer-Term Vision

### Remove or relegate to "future possibility, not goal"

**Issue:** The session decided stateless MVP *is* the platform. Section 13's "chain multiple operations together" framing and the two CSV/API workbench examples directly contradict that decision. Keeping the section as written makes the doc self-inconsistent.

**Suggested edit:** Replace Section 13 in its entirety with:

```markdown
## 13. Definition of Done

Every tool must pass all seven criteria before it is considered shipped. These are falsifiable; "looks good" is not a criterion.

1. **Edge-case test suite green.** Includes BOM, NaN, BigInt, deeply nested structures, and a 50MB real-world file. The tool never crashes on inputs that exist in the wild.
2. **Privacy audit clean.** No network calls, no analytics, no fonts, no CDN, no transitive-dep leaks. Reproducible by a stranger with DevTools open.
3. **Three outside users have used it on real work files without surprise.** Not lab demos — real files, real workflows, real feedback.
4. **Honest changelog written before any bug is fixed.** The changelog entry exists at the moment the bug is reported, not retrofitted.
5. **A solo half-day "try to break it" finds no crash.** Includes malformed input, adversarial input, and inputs at the boundary of supported sizes.
6. **Empty state teaches.** A user who has never used the tool before sees the empty state and knows what to do next.
7. **Every error message has an explanation and a next-step.** No "Invalid JSON." Yes: "Trailing comma at line 14 — JSON does not allow trailing commas. Remove the comma after `\"name\"` and try again."

These apply to **every** tool, not just the first. A tool that fails any criterion is not shipped.

### Public postmortems

When a tool ships with a bug that affects users, the postmortem is published on the public repo. What broke, why, how it was found, what the fix is, and what we will do to prevent the class. Privacy is the load-bearing promise; the only way the privacy promise survives a leak is if the postmortem is public, fast, and honest.
```

**Rationale:** The session explicitly listed these 7 falsifiable criteria as the Definition of Done, and noted the doc should grow this section before code starts (Six Thinking Hats decision). Public postmortems are item 7 of the Craft Practices list adopted in Question Storming.

Then **renumber the original Sections 14 → 13** and **original Section 13 → DELETED** (the chainable-workflows content is reframed in the new Section 12 opening as the *opposite* of the platform's intent).

If the author prefers to keep Section 13 as a "future possibility, not goal" stub, replace it with a single paragraph:

```markdown
## 13. Future possibility (not a goal)

A user could one day chain multiple operations together — clean a CSV, analyze it, generate a chart, export a report. The session explicitly decided this is **not the platform's goal**. If it ever becomes a feature, it must be stateless end-to-end: the chain runs in the browser, the user downloads the result, and nothing is remembered. Until then, this is a "future possibility, not goal," not a roadmap item.
```

---

## NEW Section 12 — Craft Practices (insert before the renumbered MVP section)

**Issue:** The session identified "craft" as the un-copyable differentiator and listed 7 concrete practices. The doc mentions none of them. Skeptic 3 (the competitor) called craft "invisible in tab-comparison" — these 7 practices operationalize craft so it is testable, not just claimed.

**Suggested edit:** Insert as a new Section 12, shifting the MVP section to 13 (and the renumbering above):

```markdown
## 12. Craft Practices

The un-copyable differentiator of WebAnvil is not "love" or "care" — those are claims anyone can make. The differentiator is **craft as operationalized practice**. Every tool ships with these seven:

1. **Kind error messages.** Every error includes a plain-language explanation and a concrete next step. "Unexpected token at position 4235" is a bug report, not an error message.
2. **Graceful edge cases.** Malformed input, boundary sizes, missing fields, and adversarial input all behave predictably. The tool never silently does the wrong thing.
3. **Teaching empty states.** The empty state is a tutorial, not a blank box. A first-time user knows what to do before they read any docs.
4. **Refusing jobs that can't be done well.** If the tool can't do the job well at the requested size, it says so and offers a smaller alternative. Silent degradation is a lie.
5. **Honest changelogs.** Every fix is dated, scoped, and written at the moment the bug is reported — not retroactively prettified.
6. **Visible-at-moment-of-trust privacy signal.** When the user is about to drop their file, the privacy claim is on screen — not in a footer, not in a policy page. "This file never leaves your browser" is visible at the drop zone.
7. **Public postmortems.** When something breaks that affects users, the postmortem is public, fast, and includes what we will do to prevent the class of bug.

A tool that ships without these is not a WebAnvil tool.
```

**Rationale:** Question Storming decision: "'craft' is the un-copyable differentiator — operationalized, not just claimed." The 7-practice list is verbatim from the session.

---

## Notes for the doc author

- Sections numbered above are the **current** numbers in `idea.md`. If you insert the new Section 12 (Craft Practices), everything from the existing Section 12 onward needs to shift by one. The "Priority order" at the top of this file assumes you do Section 13 first (rewrite it as Definition of Done or future possibility), then insert Craft Practices as the new Section 12, then update the MVP section to be the new Section 13.
- The session logged a **risk-accepted decision** that behavioral correctness is priority #1 and privacy rigor is deferred to post-MVP. The Privacy Baseline subsection here locks in the *structural* privacy baseline that holds even with rigor deferred. Do not interpret this edit as a reversal of that risk-accepted decision — it is a hardening of the cheap part of it.
- Skeptic 3 (competitor) is the load-bearing critique: "you're describing me with extra steps." The response is **depth + craft-as-practice**, not craft-as-claim or marketing. Every edit above operationalizes one or both.
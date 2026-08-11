# Reconciliation Report: idea.md → prd.md

**Date:** 2026-08-11
**PRD:** `prd-WebUtilityLab-2026-08-11\prd.md`
**Source:** `docs\idea.md`

Labels: `cover` (fully preserved) · `thin` (partially preserved / paraphrased away) · `missing` (not present) · `paraphrase` (preserved in form but tone/voice shifted)

---

## 1. Core Thesis / Vision Statements

### 1.1 "Powerful tools. No unnecessary uploads. No paid APIs." — **cover**
idea.md §1: "Core principle: Powerful tools. No unnecessary uploads. No paid APIs."
PRD §1: "browser-first utility platform…no upload." and §5 disowns paid APIs and uploads. Preserved in spirit.

### 1.2 "turn tasks that normally take 10–60+ minutes…into a few seconds" — **missing**
idea.md §1: explicitly states the 10–60+ minute → seconds transformation as the central idea.
PRD §1, §4, §7 reference "useful result" but never quote the 10–60 minute compression framing. The visceral "this saves you an hour" claim is absent.

### 1.3 "The browser is the compute platform." — **cover**
idea.md §16: "The browser is not merely the UI. The browser is the compute platform."
PRD §1: "The browser is the compute platform, not the UI." Verbatim.

### 1.4 "Complex work, simplified in your browser." / "Powerful tools that work locally." — **missing**
idea.md §8 offers two positioning taglines to avoid "500 free online tools" framing.
PRD §5 only says tool-count positioning is "explicitly disowned" — but does not state what the platform IS positioning around. No replacement tagline.

### 1.5 "Workflows rather than tiny utilities" — **cover**
idea.md §3: "focus on workflows rather than tiny utilities."
PRD §1 and §4.1 implicitly support via UJ-1 narrative; not quoted but the concept is preserved.

---

## 2. User Persona Language

### 2.1 "burned by cloud tools uploading sensitive data" — **cover**
Both files use identical phrasing. PRD §2.1 verbatim.

### 2.2 "allergic to signup walls, ad-laden interfaces, and 'free tier, 3 ops/day' gating" — **paraphrase**
idea.md §2: full phrase.
PRD §2.1: "allergic to signup walls and ad-laden interfaces." The "'free tier, 3 ops/day' gating" specifics are dropped. The concrete adversarial example is lost.

### 2.3 Adjacent market prose — **cover**
Both files mention government, healthcare, legal, journalists, security researchers; "local-first is not a preference; it is a job requirement" appears verbatim in PRD §2.1.

### 2.4 "WebAnvil is for users who can describe the problem they walked in with." — **missing**
idea.md §2 has this distinctive one-liner framing. PRD §2.1 has JTBD skeletons but no equivalent persona-voice one-liner.

### 2.5 Devon persona detail ("cstrescue.dev or chosen domain", Slack from teammate, "let me know if this works") — **cover**
PRD §2.3 carries the full persona. idea.md never names a persona; the PRD adds it. Not a gap but note the PRD extends the source here.

---

## 3. 7 Craft Practices

| # | idea.md | PRD | Status |
|---|---------|-----|--------|
| 1 | Kind error messages | FR-8 / FR-15 | **cover** |
| 2 | Graceful edge cases | FR-16 | **cover** |
| 3 | Teaching empty states | FR-7 / FR-17 | **cover** |
| 4 | Refusing jobs that can't be done well | FR-6 / FR-18 | **cover** |
| 5 | Honest changelogs | FR-19 | **cover** |
| 6 | Visible-at-moment-of-trust privacy signal | FR-9 / FR-20 | **cover** |
| 7 | Public postmortems | FR-21 | **cover** |

All seven are present with the same verbs and intent. PRD adds a SHIP GATE classification (FR-23) that idea.md does not.

### 3.1 "A tool that ships without these is not a WebAnvil tool." — **paraphrase**
idea.md §12 closes with this line.
PRD §4 closes §4.1 with FR-11 consequences; the explicit "not a [product] tool" exclusionary framing is absent.

---

## 4. 7-item Definition of Done

| # | idea.md | PRD | Status |
|---|---------|-----|--------|
| 1 | Edge-case test suite green (BOM, NaN, BigInt, deeply nested, 50MB) | FR-22 | **cover** |
| 2 | Privacy audit clean | FR-23 (SHIP GATE) | **cover** |
| 3 | Three outside users on real work files | FR-24 | **cover** |
| 4 | Honest changelog written before any bug is fixed | FR-25 | **cover** |
| 5 | Solo half-day "try to break it" finds no crash | FR-26 | **cover** |
| 6 | Empty state teaches | FR-27 | **cover** |
| 7 | Every error message has explanation + next-step | FR-28 | **cover** |

All seven DoD items are present and verbatim in intent. The PRD elevates item 2 to SHIP GATE — an addition, not a loss.

### 4.1 "'Unexpected token at position 4235' is a bug report, not an error message." — **cover** (as example)
idea.md §14 item 7. PRD §4.1 FR-8 quotes "Unexpected token at position 4235" verbatim as a banned pattern.

### 4.2 "These apply to every tool, not just the first. A tool that fails any criterion is not shipped." — **paraphrase**
idea.md §14 closing line. PRD §6.1 lists "7-item DoD applied to CSV Rescue" — implicitly only one tool, but the universality claim ("every tool, not just the first") is not echoed.

---

## 5. Privacy Baseline

idea.md §9 lists six explicit items: no analytics, no error reporters (with specific examples GA/Hotjar/Mixpanel/Plausible/Cloudflare/Sentry/FullStory), no web fonts (Google Fonts named), no CDN with logging, audited transitive deps, open source from day 1.

| Item | idea.md | PRD | Status |
|------|---------|-----|--------|
| No analytics | Yes | FR-23 + §5 | **cover** |
| No error reporters (user-triggered "Report a problem") | Yes | **not present** | **missing** |
| No web fonts (Google Fonts named) | Yes | "no fonts" only | **thin** — Google Fonts is not named |
| No CDN with logging | Yes | "no CDN" | **cover** but loses "self-host where unsure" nuance |
| Audited transitive deps (npm audit + manual review) | Yes | "transitive-dep side-effects" | **thin** — no mention of `npm audit` or manual review process |
| Open source from day 1 | Yes | FR-13 | **cover** |
| "Privacy rigor (formal threat model, adversarial review) is post-MVP" | Yes | §8 DD5 | **cover** (as assumption) |

### 5.1 Specific vendor examples (GA, Hotjar, Mixpanel, Plausible, Cloudflare Analytics, Sentry, FullStory) — **missing**
PRD §5 says "No analytics of any kind" but never enumerates the specific tools that would violate the rule. A reader does not know the rule means "Plausible is also banned."

### 5.2 "These are structural, not aspirational." — **missing**
idea.md §9 closing line establishes the baseline as binding, not aspirational. PRD §3 Glossary "Privacy Baseline…enforced from day 1" matches intent but drops the "structural, not aspirational" phrasing.

---

## 6. Time-to-Result Rule and Pre-flight

### 6.1 10-second user-perceived budget — **cover**
idea.md §7: "10-second user-perceived budget."
PRD §4.1 FR-6: "10-second budget." Matches.

### 6.2 Four required behaviors — **thin**
idea.md §7 lists four behaviors:
1. Pre-flight estimate
2. Time band with tolerance
3. Refuse with kind explanation
4. Progressively enhance streaming

PRD FR-6 covers 1, 2, 3. **Behavior 4 (progressive streaming / partial results)** is not in the PRD. The PRD's FR-1 covers 50MB boundary but does not commit to streaming partial results.

### 6.3 "This is a brand promise, not a metric: a user who has waited 12 honest seconds is fine; a user who has waited 8 unexplained seconds is not." — **missing**
idea.md §7 closing line is a distinctive philosophical statement about honesty vs. speed. PRD §7 SM-1 / SM-C1 discuss time-related concepts but never quote this tolerance philosophy. The counter-metric SM-C1 ("A user who finishes in 12 seconds is a success") echoes the same intent but does not preserve the framing.

### 6.4 Concrete band example "~10s ±30%" — **thin**
idea.md §7 item 2 uses "~10s ±30%" as the example.
PRD §8 DD1 proposes ±30% but flags it as open, not committed.

---

## 7. Workflow Glue Mechanisms

### 7.1 Mechanism A (file-in-hand handoff) — **cover**
Both files describe static links without state-passing. PRD §4.1 FR-10 covers it.

### 7.2 Mechanism B (result-page metadata, sidecar JSON or comment line) — **cover**
Both files describe metadata-in-result. PRD §4.1 FR-11 covers it.

### 7.3 Mechanism C rejected — **cover**
Both files note Mechanism C rejected. PRD §5 names it explicitly.

### 7.4 Mechanism D (PWA) deferred — **cover**
Both files defer PWA. PRD §3 Glossary and §5 cover.

### 7.5 "with reasons" for C rejection and D deferral — **thin**
idea.md §11 (referenced via brainstorm; not in idea.md directly) — but the *idea.md* does not actually detail reasons for C/D. PRD §5 gives "UX and architectural reasons" for C rejection without elaboration. Note: idea.md does not have explicit reasons either, so this is symmetric.

---

## 8. Marketing Line

### 8.1 "It costs you nothing because it doesn't remember you." — **missing**
idea.md §13 places this verbatim as the marketing line.
PRD does not contain this phrase anywhere. Not in §1 Vision, not in §6 MVP Scope, not in glossary. The signature tagline is absent.

---

## 9. Discovery / SEO Plan

idea.md §10 lists six discovery commitments:
1. Stable, named, human-readable URLs
2. Tool pages lead with the job
3. No SEO-stuffing (with explicit example)
4. Open Graph + favicon + PWA manifest
5. Brand/domain/tagline SEO-tested before launch
6. Public Compare page for each deep tool

| # | idea.md | PRD | Status |
|---|---------|-----|--------|
| 1 | Stable URLs | FR-12 | **cover** |
| 2 | Lead with the job | Not present | **missing** |
| 3 | No SEO-stuffing, with example | Not present | **missing** |
| 4 | OG + favicon + PWA manifest | Not present | **missing** |
| 5 | SEO-tested before launch | §8 DD2 as open question | **thin** — converted to risk, not commitment |
| 6 | Public Compare page for each deep tool | Not present | **missing** |

### 9.1 "No SEO-stuffing. No 'free JSON formatter online no signup no ads no login' × 30." — **missing**
The specific anti-pattern example and the strong anti-SEO-stuffing commitment are absent from the PRD.

### 9.2 Compare page commitment — **missing**
idea.md §10: "A public Compare page for each deep tool…is built day 1 for the deep tools."
PRD has no equivalent FR. Since MVP is a single tool, this may be deferred, but the commitment is not recorded anywhere (not in §6.2 Out of Scope, not in §8 Open Questions).

---

## 10. Open Source from Day 1

### 10.1 GitHub + Apache-2.0 or MIT — **cover**
Both files. PRD §9 [ASSUMPTION: Apache-2.0 or MIT] flags license as open decision.

### 10.2 "Privacy claim must be reproducible by a stranger." — **cover**
idea.md §10. PRD FR-13 consequence: "A stranger can audit the privacy claim by reading the code." Matches.

---

## 11. Naming Status

### 11.1 Naming Status four checkboxes — **thin**
idea.md §11 lists four checkboxes: domain, trademark, GitHub/npm/social handle, pronounceability.
PRD §8 DD3 references "the four Naming Status checkboxes" as a block but does not enumerate them. A reader must know the source to know what the four are.

### 11.2 Naming candidate list — **missing**
idea.md §11 enumerates eight candidates (WebAnvil, BrowserFoundry, WebKiln, ToolAnvil, BrowserCraft, ByteWorkbench, WebWorkbench, ToolKiln).
PRD §1 commits to "WebUtilityLab" with no record of the prior candidates or the rationale for the change. The decision history is lost.

### 11.3 "WebAnvil is a working name, not a final name." — **missing**
idea.md §11 closes with this status. PRD uses "WebUtilityLab" throughout but never records that the project went through a naming exercise, that "WebUtilityLab" replaces "WebAnvil," or that final verification is pending. The transition is invisible.

---

## 12. Future Possibility (chainable workflows)

### 12.1 Reclassification — **cover**
idea.md §15: "future possibility, not goal."
PRD §5: "Reclassified per D1" with same language. Both files agree.

---

## 13. Depth Ranking / Depth-vs-Shallow Axis

### 13.1 Five-tool depth table — **paraphrase**
idea.md §13 ranks 5 MVP candidates as Deep/Mixed/Shallow with notes on what would make the shallow ones deep.
PRD §6.2 Out of Scope lists JSON Surgeon, API Response Diff, Screenshot → Color System, File Metadata Cleaner — but each with brief rationale rather than the full depth-table treatment. The "Mixed" category is preserved for JSON Surgeon.

### 13.2 "Without added behavior (e.g. accessibility contrast checking…), this is a 30-minute wrapper. Re-evaluate before building." — **missing**
idea.md §13 gives specific depth-extension ideas for the two shallow candidates. PRD §6.2 just says "deferred unless a depth-extension is identified" without recording what those extensions might be.

### 13.3 Depth definition — **missing**
idea.md §13: "Depth = 'behavior the underlying library does not have.'" Plus the conclusion: "A 'shallow tool' in MVP is a 'describing competitors with extra steps' victory for them."
PRD §7 SM-C2 says "Depth over breadth" but never defines depth or quotes the framing. The strategic clarity is reduced to a metric note.

### 13.4 "'Features this tool will never have' list" — **missing**
idea.md §13: "Every tool publishes a 'features this tool will never have' list. Disarm by absence: history, accounts, sync, share-by-link, collaborative editing, analytics on your data, account-bound saved presets."
PRD does not contain this FR or commitment. Listed in §5 Non-Goals but not as a published artifact.

---

## 14. Other Distinctive Commitments

### 14.1 Adjacent market / "real reason WebAnvil exists" — **cover**
idea.md §2 frames the adjacent market as "the real reason WebAnvil exists." PRD §2.1 includes the adjacent market but drops the "real reason it exists" emphasis.

### 14.2 Cost strategy / hosting options — **missing**
idea.md §10 lists GitHub Pages, Cloudflare Pages, Vercel, Netlify as hosting options; "No database should be required"; local persistence via IndexedDB/localStorage/Cache Storage.
PRD has no equivalent section. Deployment choices are absent.

### 14.3 Browser capabilities taxonomy — **missing**
idea.md §4 enumerates File Processing, Media/Graphics, High-Performance Computation, Browser/Device Capabilities (File System Access API, WebGPU, WebCodecs, MediaRecorder, ONNX, WebLLM, etc.).
PRD has no equivalent catalog. The PRD assumes "browser-first" without listing the surface area.

### 14.4 Local AI Direction (Section 6 in idea.md) — **cover** (as non-goal)
idea.md §6 lists WebGPU, ONNX Runtime Web, Transformers.js, WebLLM as later-phase possibilities.
PRD §5: "Local LLM tools…deferred. The 10-second load budget rules them out as MVP candidates." Intent preserved.

### 14.5 High-Potential Tool Ideas (idea.md §5) — **missing** as catalog
The full catalog of 25+ tool ideas (CSV Rescue, CSV Detective, Data Analyzer, JSON Surgeon, API Response Diff, SQL Visualizer, SQL → ER Diagram, Regex Playground, Developer Project Analyzer, PDF Suite, Find What Changed, File Privacy Cleaner, Smart Image Compressor, Screenshot → Color System, Screenshot Analyzer, UI Spacing Analyzer, Website Performance Investigator, Accessibility Auditor, Local Secret Scanner, Metadata Scanner, Decision Engine, Opportunity Cost Calculator, Manual Work → Automation Potential) is not in the PRD.
PRD §6 scopes only CSV Rescue + four deferred candidates. The catalog is intentionally narrowed, but the PRD does not acknowledge the breadth of the original brainstorm.

### 14.6 "This is the product, not a phase of the product." — **missing**
idea.md §13 closes the MVP section with: "This is the product, not a phase of the product."
PRD §1 has equivalent intent ("The first tool is CSV Rescue. Subsequent tools only if the first tool validates the platform.") but does not echo the anti-roadmap framing. The PRD's structure implies a roadmap (v1 → v2) where idea.md explicitly rejects that framing.

### 14.7 "Privacy is the load-bearing promise; the only way the privacy promise survives a leak is if the postmortem is public, fast, and honest." — **missing**
idea.md §14 closing sentence. PRD §4.1 FR-21 covers postmortems but does not state the load-bearing-promise rationale.

### 14.8 "A user who had a great experience must be able to find WebAnvil again. Discovery is a feature." — **missing**
idea.md §10 opening of the Discovery section. PRD §8 DD2 references SEO but does not state the philosophical commitment that discovery is itself a product feature.

### 14.9 Browser capabilities list "JavaScript, Web APIs, WebAssembly, Web Workers, WebGPU, Canvas, IndexedDB" — **cover** (implicit)
idea.md §1 lists these explicitly. PRD §1 implies via "browser-first" but does not enumerate.

---

## 15. Document-Purpose / Meta

### 15.1 PRD document purpose — **cover (addition)**
PRD §0 explicitly references idea.md as source. idea.md has no equivalent meta section. This is a PRD addition, not a gap.

### 15.2 Glossary vs none — **cover (addition)**
PRD §3 adds a glossary not present in idea.md. Not a gap.

### 15.3 Assumptions index — **cover (addition)**
PRD §9 adds an assumptions index. Not a gap.

---

## Summary of Most Important Gaps

The PRD's FR structure systematically drops:

1. **Marketing line** — "It costs you nothing because it doesn't remember you" is absent.
2. **Anti-SEO-stuffing commitment + Compare page** — both discovery commitments missing.
3. **10–60+ minute → seconds framing** — central value proposition is paraphrased away.
4. **Progressive streaming** — fourth behavior of the time-to-result rule is missing.
5. **Positioning taglines** — PRD says what it isn't (no tool-count) but not what it is.
6. **Depth axis definition + "features this tool will never have" list** — strategic clarity reduced.
7. **Naming history** — transition from WebAnvil to WebUtilityLab is invisible.
8. **Specific vendor examples in privacy baseline** — GA/Hotjar/Plausible/Sentry named list dropped.
9. **Hosting / cost / persistence section** — entirely absent.
10. **Tolerance-as-brand-promise philosophy** — paraphrased in SM-C1 but the load-bearing framing ("12 honest seconds vs 8 unexplained seconds") is absent.

The PRD gains (vs loses): glossary, FR structure, assumptions index, UJ-1 narrative, success metrics, ship gate classification, and explicit non-goals section. These are structural additions consistent with FR-format conversion.
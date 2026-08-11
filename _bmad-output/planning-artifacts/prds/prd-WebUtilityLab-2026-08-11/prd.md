---
title: WebUtilityLab
created: 2026-08-11
updated: 2026-08-11
status: final
---

# PRD: WebUtilityLab
*Working title — confirmed (naming verification pending; see §8 Open Questions).*

## 0. Document Purpose

This PRD is for the solo builder (Sanjit) and any future contributor. It builds on:
- `docs/idea.md` (updated 2026-08-11) — the source thesis.
- `_bmad-output/planning-artifacts/briefs/brief-WebUtilityLab-2026-08-11/brief.md` — the source brief.
- `_bmad-output/brainstorming/brainstorm-webanvil-predevelopment-2026-08-11/` — the brainstorm artifacts (memlog is canonical). Note: the brainstorm folder name retains the working name "webanvil" used during ideation; the product name was finalized as **WebUtilityLab** during brief discovery (see §8 DD3).

Structure: glossary-anchored vocabulary, features grouped with FRs nested, assumptions tagged inline and indexed in §9. Length is calibrated to hobby/solo — about two pages of dense narrative plus the FR/NFR tables.

**Naming history.** The product was brainstormed as **WebAnvil** (idea.md §11 lists 8 candidates). During brief discovery the name was revised from WebAnvil to **WebUtilityLab** to signal the "utility screwdriver" framing (rename logged in brief memlog). Verification of the four Naming Status checkboxes (domain, trademark, GitHub/npm/social handle, pronounceability) remains pending (see §8 DD3); until confirmed, WebUtilityLab is a working title, not final.

## 1. Vision

WebUtilityLab is a browser-first utility platform. The browser is the compute platform, not the UI. Users drop a file, dataset, screenshot, or problem in; get a useful result; download it; leave. No account, no history, no cloud sync, no upload.

Each tool is a single-purpose, stateless one-shot — the platform as a collection of screwdrivers, not a SaaS subscription. The differentiator is the 7 Craft Practices (FR-15–FR-21) and the 7-item DoD (FR-22–FR-28). Every tool must clear all 14 before ship; nothing is released that fails them.

The first tool is **CSV Rescue**. Subsequent tools only if the first tool validates the platform.

**Why craft must be operationalized, not claimed.** Competitors already offer local-first, no-signup, and free; "we also do those things" is not a differentiator. The Craft Practices and the DoD are the response — operationalized survival behaviors under tab-comparison pressure, not niceness choices. A contributor who softens them is un-doing the differentiator. (Source critique from brainstorm: *"You're describing me with extra steps."*)

> **It costs you nothing because it doesn't remember you.**

## 2. Target User

### 2.1 Jobs To Be Done

**Primary user — developer or technical professional.** They hit small, recurring one-shot file, dataset, or code problems multiple times a week. They have been burned by cloud tools uploading sensitive data. They are allergic to signup walls and ad-laden interfaces.

**Adjacent market — people forbidden from uploading** to cloud tools: government, healthcare, legal, journalists, security researchers. For them, local-first is not a preference; it is a job requirement.

JTBD for CSV Rescue: *find what's wrong with this CSV in under 30 seconds, without uploading the file.*

### 2.2 Non-Users (v1)

Mobile users, desktop-wrapper users, CLI users, and enterprise teams. The audience is developer/technical-professional and the adjacent "people forbidden from uploading" market. Reaching other surfaces would dilute the depth story.

### 2.3 Key User Journeys

**UJ-1. Devon, a backend developer, drops a CSV into CSV Rescue.**

> **Persona + context:** Devon, backend developer at a small SaaS, has just received a 12,000-row CSV from a vendor with the message "let me know if this works."
>
> **Entry state:** On desktop, in the browser, after a teammate Slack-message linked the file. Has not signed in. Has not created an account.
>
> **Path:** Open `cstrescue.dev` (or chosen domain). Empty state shows "Drop a CSV here, or paste CSV text." Sees an example CSV and a "Try the example" link. Drags the actual CSV from the desktop into the drop zone. Tool shows a "Detecting issues..." spinner for ~2s. Tool returns a results pane with four sections: detected problems (12 of them), a data-quality score (78/100), inferred schema, and a one-click "Clean and export" button.
>
> **Climax:** Devon scrolls the detected problems list and finds "12 duplicate rows based on `customer_id`," "47 rows with invalid emails in `contact_email`," "3 rows where `signup_date` is in the future." He trusts the report because the tool shows him the offending row, the column, and the value, with a one-sentence explanation of the rule it broke. He clicks "Clean and export." Tool downloads `cleaned-<timestamp>.csv`.
>
> **Resolution:** Devon opens the cleaned file, sends it back to the vendor, and has the trust signal he needs (data-quality score) to know the vendor's claim was real. He bookmarks the site.
>
> **Edge case:** If the CSV has a UTF-8 BOM or mixed encodings, the tool says so on the first row and offers a one-click "Strip BOM and re-detect" action.

## 3. Glossary

- **Tool** — A single-purpose browser utility. Each tool runs upload → process → download with no persistence. Examples: CSV Rescue, JSON Surgeon.
- **User** — A developer or technical professional who arrives with a specific problem and leaves with a specific result. Synonym not allowed elsewhere in this PRD.
- **Result** — The artifact a tool produces for the user. In CSV Rescue, the result is a report (problems, score, schema) and an optional cleaned file.
- **Platform** — The collection of tools plus the surrounding infrastructure (deployment, discovery, source-code repository).
- **Stateless** — No account, no history, no persistence between sessions on the user's behalf. The user may install the platform as a PWA, but each tool's behavior is stateless.
- **Craft Practice** — One of 7 operationalized behaviors every tool ships with (see FR-15 through FR-21).
- **DoD (Definition of Done)** — The 7 falsifiable criteria every tool must pass before it is considered shipped (see FR-22 through FR-28).
- **Privacy Baseline** — The day-1 structural privacy guarantees: no analytics, no fonts, no CDN, no transitive-dependency side-effects, no error reporters, no third-party requests. Enforced from day 1. **Local-first is architecture, not discipline.** Privacy risk lives in the surrounding dependencies — analytics, fonts, CDN logs, transitive packages, dev-tooling — not in the core feature. Enforcing "no API calls in core" is necessary but insufficient; the Privacy Baseline is the structural mitigation that holds when formal privacy review is deferred.
- **Ship gate** — A DoD criterion that blocks public release until met. Privacy audit (DoD item 2) is the only ship gate.
- **Time-to-competence** — Time from page load to user saying "I have my answer and trust the answer." Primary success metric (SM-1).
- **Workflow glue** — Mechanisms that connect tools without state. Mechanism A (file-in-hand handoff via file metadata) and Mechanism B (result-page "next, you might want to..." links).
- **PWA** — Progressive Web App — installable, offline-capable browser app. Mechanism D; deferred post-MVP.
- **CSV Rescue** — The MVP "the 1" tool. Deep operation: surface anomalies, score data quality, infer schema, offer one-click cleaning.
- **BOM** — Byte Order Mark; a UTF-8 marker at the start of some files. CSV edge case.
- **[ASSUMPTION: ...]** — Inline tag for inferences made from the brief that the user has not yet confirmed.

## 4. Features

### 4.1 CSV Rescue (the first tool)

**Description:** A browser-based tool that accepts a CSV (drag/drop, file picker, or paste), detects anomalies and quality issues in real time, scores the file's data quality, infers the schema, and offers one-click cleaning plus export. The user arrives with a "what's wrong with this file?" question and leaves with a report they can trust and a cleaned file they can use. Realizes UJ-1.

**Functional Requirements:**

#### FR-1: File ingestion

The user can provide a CSV via drag-and-drop, file picker, or direct paste. Realizes UJ-1.

**Consequences (testable):**
- File up to 50MB is accepted; larger files show a pre-flight refusal with a clear explanation and offer to sample.
- Pasted CSV (up to ~50MB pasted text) is accepted.
- BOM-stripped UTF-8 and UTF-8-with-BOM are accepted; the tool indicates which it detected.
- Files at the 50MB boundary complete processing within 10s on a 2019-era laptop.

#### FR-2: Anomaly detection

The tool detects duplicate rows, missing values, invalid emails, invalid dates, inconsistent categorical values, outliers, suspicious columns, and potential PII. Realizes UJ-1.

**Consequences (testable):**
- Each detected anomaly is listed with: row index, column name, the specific value, the rule that was broken, and a one-sentence explanation.
- Duplicate detection uses a configurable key (default: all columns; user can specify column subset).
- Email validation uses a current RFC-5322-ish check, not a regex that fails on `+` aliases.
- Date validation flags dates that are clearly invalid (e.g., 2026-13-45) and dates in the future (configurable threshold).
- PII detection surfaces emails, phone numbers, SSN-like patterns, and credit-card-like patterns — at minimum.

#### FR-3: Data quality score

The tool produces a numeric data-quality score (0–100) with a brief breakdown by category (completeness, validity, uniqueness, consistency). Realizes UJ-1.

**Consequences (testable):**
- Score formula is documented in `addendum.md` (open technical detail).
- Score is reproducible — same file produces the same score across runs.
- Score is broken down by category in the UI; user can expand each category for the contributing issues.

#### FR-4: Schema inference

The tool infers and displays the CSV's schema (column names, inferred types, sample values per type). Realizes UJ-1.

**Consequences (testable):**
- Each column shows: name, inferred type (string / number / date / boolean / email / url / phone / mixed), non-null count, distinct count, top-3 sample values.
- Mixed-type columns are flagged with the dominant type and the count of deviating rows.
- Schema is shown as both a table and a downloadable JSON schema document.

#### FR-5: One-click cleaning and export

The user can apply the tool's suggested fixes with one click and export a cleaned CSV. Realizes UJ-1.

**Consequences (testable):**
- Cleaning is reversible — the original file is shown alongside the cleaned version, with a diff.
- Cleaning options are explicit per-category: dedupe, fill-missing, validate-and-flag, normalize-categorical, redact-PII.
- Default cleaning is conservative — never silently mutates values; flags + offers manual fix instead.
- Cleaned file downloads as `cleaned-<originalname>-<timestamp>.csv`.

#### FR-6: Pre-flight time estimation

For operations that may exceed the 10-second budget, the tool shows an estimated time band before processing starts. Realizes UJ-1.

**Consequences (testable):**
- Estimation uses file size + a small-sample complexity check.
- Estimation shows a band (e.g., "~3s ±30%"), not a single number.
- If the upper bound of the band exceeds the budget (currently 10s — see §8 Open Question DD1), the tool refuses the operation with a kind explanation and offers sampling or column subsetting.

#### FR-7: Empty state teaches

When the user opens CSV Rescue with no input, the empty state shows what the tool does, shows an example CSV, and offers "Try the example" as a one-click action.

**Consequences (testable):**
- A first-time user who clicks "Try the example" reaches a populated results state without reading any docs.
- The empty state is a tutorial, not a blank box.

#### FR-8: Kind error messages

Every error path produces a 1-sentence explanation + a 1-sentence next step.

**Consequences (testable):**
- No bare "Invalid CSV" or "Unexpected token at position 4235" messages.
- Errors include: what went wrong, why, what to do next.

#### FR-9: Visible-at-moment-of-trust privacy signal

When the user is about to drop their file, the privacy claim is on screen: "This file never leaves your browser."

**Consequences (testable):**
- Privacy signal is at the drop zone, not in a footer or policy page.
- A stranger can verify with DevTools open that no network calls are made.

#### FR-10: Workflow glue — Mechanism B (result-page static links)

Every result page offers a "next, you might want to..." static link to a relevant other tool.

**Consequences (testable):**
- Links are static routes (no state passing).
- File contents are NOT passed between tools via Mechanism B — the user downloads the cleaned file and drops it into the next tool manually.
- Each tool's results page surfaces at least one relevant next-tool link.

#### FR-11: Workflow glue — Mechanism A (file-in-hand handoff via file metadata)

When the user downloads a result file, the file's metadata (e.g., a comment line for text formats, or a sidecar JSON for binary) carries a small instruction: which tool produced it, when, and what tool might be relevant next.

**Consequences (testable):**
- Metadata is non-load-bearing — the file works correctly without it.
- Other WebUtilityLab tools read the metadata on ingestion and offer context: "I see this came from CSV Rescue. Would you like to analyze this?"

### 4.2 Cross-cutting platform features

#### FR-12: Stable, named, human-readable URLs

Each tool lives at a stable URL (`/cstrescue`, `/jsonsurgeon`, etc.).

**Consequences (testable):**
- URLs do not change after public launch.
- Tool names appear in the URL, not numeric IDs.

#### FR-13: Open source from day 1

Source code is public on GitHub under a permissive open-source license (Apache-2.0 or MIT).

**Consequences (testable):**
- Repository is public at MVP launch.
- License file is present in the repo root.
- A stranger can audit the privacy claim by reading the code.

#### FR-14: No backend for tool operation

The tool performs all processing in the browser; no backend server is involved in tool operation.

**Consequences (testable):**
- A user can use CSV Rescue with the network tab offline (after the initial page load).
- No API calls are made during tool operation.

#### FR-15: Craft Practice — Kind error messages (per FR-8)

Verbatim from the brief.

#### FR-16: Craft Practice — Graceful edge cases

On malformed input, boundary sizes, missing fields, or adversarial input, the tool returns a clear error (per FR-8) or a kind refusal (per FR-6) — never a silent wrong answer.

#### FR-17: Craft Practice — Teaching empty states (per FR-7)

#### FR-18: Craft Practice — Refusing jobs that can't be done well (per FR-6)

#### FR-19: Craft Practice — Honest changelogs

Every fix gets a date, a scope, and an entry written at the moment the bug is reported — not retroactively prettified.

**Consequences (testable):**
- Changelog is public.
- Each entry includes: date, tool, what broke, how it was found, what was changed.

#### FR-20: Craft Practice — Visible-at-moment-of-trust privacy signal (per FR-9)

#### FR-21: Craft Practice — Public postmortems

When a bug class breaks for users, a public postmortem lands in the repo (or a `/postmortems` directory) within 7 days of the incident and names the preventive change.

**Consequences (testable):**
- Postmortems are public, in the repo (or a `/postmortems` directory).
- They are written within 7 days of the incident.

#### FR-22: DoD — Edge-case test suite green

Edge-case test suite covers BOM, NaN, BigInt, deeply nested structures, and one 50MB real-world file. CSV Rescue returns a clear error (per FR-8) on each, never a crash.

#### FR-23: DoD — Privacy audit clean (**SHIP GATE**)

No network calls, no analytics, no fonts, no CDN, no transitive-dependency leaks. Reproducible by a stranger with DevTools open. This criterion blocks public release until met.

#### FR-24: DoD — Three outside users on real work files

Three outside users have used the tool on real work files without surprise. Not lab demos — real files, real workflows, real feedback.

#### FR-25: DoD — Honest changelog written before any bug is fixed

The changelog entry exists at the moment the bug is reported, not retrofitted.

#### FR-26: DoD — Solo half-day "try to break it" finds no crash

Half-day adversarial pass: malformed input, adversarial input, and inputs at the size boundary. No crash.

#### FR-27: DoD — Empty state teaches (per FR-7)

#### FR-28: DoD — Every error message has explanation + next-step (per FR-8)

## 5. Non-Goals (Explicit)

- **SaaS features for any tool** — accounts, history, cloud sync, share-by-link, collaboration, sign-in, saved state.
- **Chainable workflows** — running multiple tools together in a chain is "future possibility, not goal" (was `idea.md` §13). Reclassified per D1.
- **Local LLM tools** — WebLLM, ONNX, Transformers.js-based tools are deferred. The 10-second load budget rules them out as MVP candidates (CD3).
- **Tool-count positioning** — "500 free online tools" framing is explicitly disowned.
- **Mobile, desktop wrapper, CLI, or enterprise surfaces** — non-audiences per §2.2.
- **Marketing copy that is unfalsifiable** — every claim must be demonstrable in DevTools by a stranger.
- **Tracking or analytics of any kind** — Privacy Baseline, enforced from day 1.
- **Mechanism C** (same-tab browser storage handoff) — rejected: it breaks "open in new tab" UX and creates a tight coupling between tools that defeats stateless-as-goal (per brainstorm D3).
- **Mechanism D** (PWA persistent environment) — deferred post-MVP.

## 6. MVP Scope

### 6.1 In Scope

- **CSV Rescue** as the first and only shipped tool in v1.
- All FRs in §4.1 and §4.2 (FR-1 through FR-28).
- The Privacy Baseline (no analytics, no fonts, no CDN, no transitive-dependency side-effects).
- Workflow glue Mechanisms A and B (FR-10, FR-11).
- Public source code on GitHub (FR-13).
- Stable URLs (FR-12).
- 7 Craft Practices and 7-item DoD applied to CSV Rescue.

### 6.2 Out of Scope for MVP

- **JSON Surgeon** as a separate MVP tool — high developer-frequency but requires a depth-extension plan (schema inference, JSDoc generation, query) before building (DD4 — see §8).
- **API Response Diff** as a separate MVP tool — clearly deep; deferred to v2.
- **Screenshot → Color System** — shallow by the depth criterion; deferred unless a depth-extension is identified.
- **File Metadata Cleaner** — shallow by the depth criterion; deferred unless a depth-extension is identified.
- **Mechanism D** (PWA persistent environment) — deferred post-MVP.
- **Workflow chains** — explicitly non-goal.
- **Local LLM tools** — explicitly non-goal.
- **Public Compare page per deep tool** — committed for v1 per `idea.md §10`. Ownership captured under DD2.

## 7. Success Metrics

**Primary**
- **SM-1**: Time-to-competence — time from page load to user saying "I have my answer and trust the answer." Target: median ≤ 30 seconds for the first user session on CSV Rescue. Validates FR-1 through FR-7.

**Secondary**
- **SM-2**: Three-outside-user criterion met for CSV Rescue before launch. Validates FR-24.
- **SM-3**: Privacy audit reproducible by a stranger with DevTools open. Validates FR-23 (Privacy audit — the sole DoD ship gate).

**Counter-metrics (do not optimize)**
- **SM-C1**: Time spent on tool — *do not* optimize for "time spent in tool" as a vanity metric. A user who finishes in 12 seconds is a success; a user who finishes in 60 seconds after thinking is also a success. Counterbalances SM-1.
- **SM-C2**: Number of tools shipped — *do not* optimize for tool count. Depth over breadth (per D7, CD5). Counterbalances any temptation to ship shallow tools.
- **SM-C3**: Repeat-visit rate — *do not* optimize for repeat visits via retention mechanics (history, accounts). The model is stateless; repeat visits are earned by quality, not engineered.

## 8. Open Questions

**DD1. Time-to-result budget band width.** Pre-flight estimation (FR-6) needs a concrete band width and refusal policy before CSV Rescue ships. Proposed: ±30% band, refuse if upper bound exceeds 10s. Confirm before launch.

**DD2. Discovery / SEO ownership.** Stable URLs (FR-12) and SEO-tested brand require ownership; brief flags the requirement but does not assign an owner. Risk: deprioritized and forgotten.

**DD3. Naming verification.** WebUtilityLab is committed as the product name, but the four Naming Status checkboxes (domain, trademark, GitHub/npm/social handle, pronounceability) are not yet confirmed. Block ship until confirmed.

**DD4. JSON Surgeon depth-extension plan.** Before building JSON Surgeon as MVP tool #2, the depth-extension plan (schema inference, JSDoc generation, query) needs to be written. Without it, the second tool fails the depth criterion.

**DD5. Privacy rigor timeline.** Privacy baseline is enforced from day 1 (per FR-23, Privacy Baseline). Formal threat model and adversarial review are deferred post-MVP (per brief RA1, behavioral correctness > privacy rigor). Revisit trigger: the first reported privacy leak in any channel.

**DD6. Future-proofing deliverables.** Future-proofing is a design requirement, not a hope (CD7). FR-13 (open-source repo) is one day-1 deliverable. The candidate list of additional day-1 artifacts is unresolved:
- **Contributor guide** — written or deferred?
- **"Why this exists" anchor** — where does it live (README? index page? both)?
- **Architecture-without-original-author** — is the codebase structured to be readable without Sanjit in the room?
- **Code-comments-explain-WHY policy** — adopted formally, or aspirational?

Resolve before launch: a solo-maintainer project with no successor design goes dark.

## 9. Assumptions Index

- **[ASSUMPTION: CSV Rescue "the 1" status is durable]** — from D2 (brief). Reversed from JSON Surgeon during brief discovery. If post-launch signals suggest JSON Surgeon is the better "the 1," reassess.
- **[ASSUMPTION: 50MB file is the MVP upper bound]** — from the brief's DoD item 1 ("50MB real-world file"). The upper bound is the DoD's "real-world" reference; the actual refusal threshold is FR-6's pre-flight estimate upper bound. If 50MB is wrong, adjust DoD.
- **[ASSUMPTION: data-quality score formula is documented in `addendum.md`]** — captured during PRD drafting; the formula itself is implementation detail, not PRD material.
- **[ASSUMPTION: Apache-2.0 or MIT license]** — from the brief. Pick one before public repo launch.
- **[ASSUMPTION: postmortems published within 7 days of incident]** — from the 7 Craft Practices ("fast" is undefined). 7 days is a reasonable working number; tighten if it proves too lax.
- **[ASSUMPTION: Scope dial for UJ-1 is "Lighter" (single sentence form)]** — the brief is passion-project; UJ-1 is one short narrative rather than a full 5-beat structure. If a UX pass later demands more journey detail, expand UJ-1.
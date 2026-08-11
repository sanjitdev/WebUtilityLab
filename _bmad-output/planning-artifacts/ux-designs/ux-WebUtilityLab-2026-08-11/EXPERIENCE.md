---
title: WebUtilityLab — Experience Contract
created: 2026-08-11
updated: 2026-08-11
status: final
sources:
  - _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md
---

# WebUtilityLab — Experience Contract

## Foundation

**Form-factor.** Desktop-primary per PRD §2.2. Layout adapts — touch targets honor a 44×44 CSS-px floor — but mobile parity is not chased. The page must remain usable on the developer's primary workstation; environments where uploading is policy-restricted are an in-scenario driver, not a positioned segment.

**IA pattern.** Single page, scroll-driven (option A from the IA decision). One HTML page morphs through empty → active → results via state changes; no routing; privacy signal stays in view throughout.

**Spec split.** `DESIGN.md` is the visual identity reference. Visual specs live there. This file owns IA, behavior, state transitions, accessibility, voice, and flows.

## Information Architecture

Five surfaces, all on one scrollable page:

- **Empty state** — Teaching per FR-7. Privacy signal visible at the dropzone (FR-9). Headline + lede + two CTAs: "Try the example" (primary), "Browse files" (secondary). Drop zone below. Three teaching cards below the drop ("What we detect" / "What we show you" / "What you can do").
- **Active state** — File accepted; the dropzone morphs into a small "Analyzing…" region with the file name in the aria-live announcement. No visual celebration of acceptance — the file is in.
- **Processing state** — Spinner-free per editorial posture. Static "Working…" text with `aria-live="polite"`. Pre-flight time-band per FR-6 if the estimate's upper bound exceeds the 10s budget.
- **Refusal state** — When the upper bound of the estimate band exceeds 10s (FR-6). Page shows only the refusal message and a single "Choose a smaller file" CTA. No partial results.
- **Results state** — Stacked vertical sections per the structure decision. Order: detected problems, data-quality score, inferred schema, cleaning CTA, mechanism-B next-links, footer. Each section is its own card. Scroll-driven; results page never requires navigation.
  - **Problems section** (FR-2) groups findings into the 8 anomaly categories the tool detects: **duplicates**, **missing values**, **invalid emails**, **invalid dates**, **inconsistent categorical**, **outliers**, **suspicious columns**, and **PII**. Each group is one or more problem cards with the strict-brief error template applied. PII is its own color category (violet) — distinct from errors — so the eye learns to scan for it.
  - **Score section** (FR-3) reports a single 0–100 number and breaks it down across the 4 score categories: **completeness** (non-null density), **validity** (format-correctness of typed columns), **uniqueness** (duplicate density, inverse), **consistency** (categorical casing / format consistency). Each category carries its own numeric value and a horizontal bar tinted by the score band (red < 60, amber 60–79, green ≥ 80).
- **Cleaning modal** — Opens from the cleaning CTA. Per-category toggles: dedupe, fill-missing, validate-and-flag, normalize-categorical, redact-PII. **Default state: ALL OFF** — cleaning is opt-in, conservative default per FR-5. The modal opens with a **reversibility view** (FR-5): the original file is shown alongside the proposed cleaned version with a diff (which rows changed, which fields were redacted, how many rows dropped). Only after the user inspects the diff can they click Confirm. The redact-PII toggle triggers a kind-error confirm framing the irreversibility of the redaction step on the downloaded file (the original stays in the user's memory only until the browser tab closes; nothing is uploaded). Esc, click-outside, or Cancel closes; Confirm proceeds to build the cleaned file in-browser and download it.

## Voice and Tone

Restrained spec. Short, declarative, near-vocabulary-of-the-domain. Editorial precision over warmth; trust comes from being exact, not conversational. Calibration target — the brief exemplar:

> Trailing comma at line 14 — JSON does not allow trailing commas. Remove the comma after `"name"` and try again.

Editorial conventions: curly quotes and apostrophes in prose; spaced em-dashes ("word — word"); sentence-case headings. Mono for data; sans for prose. Data values retain their original straight quotes and casing so they survive copy and paste back into the source file.

**Empty-state copy (locked).**

> Drop a CSV to find out what's wrong with it. Files up to 50 MB, UTF-8, with or without a BOM. We don't upload — this happens in your browser. [Try the example] · [Browse files]

The block carries the JTBD sentence ("find out what's wrong with it") and the privacy signal in the same place — no scrolling required to read the claim.

**Error message template (locked).** Strict brief pattern: `[specific finding] — [domain rule]. [concrete next action].` Every error must contain a specific finding (file, row, column, value), the rule that was broken (in domain terms), and a concrete next step (open file in editor, strip BOM, re-upload, etc.).

CSV Rescue-specific example: "Row 14 has 12 fields, expected 11 — your file uses commas inside quoted strings. Open row 14 in a text editor and check that any literal commas are wrapped in double quotes."

## Component Patterns

Visual specs live in `DESIGN.md`. What follows is behavioral.

- **Dropzone.** Real `<button>` opens the file picker. Drag-and-drop is handled. Paste handler accepts dropped or pasted text. On accept, the file name appears in the aria-live region. No upload — file reading is purely local (FR-14, Privacy Baseline).
- **Problem card.** Collapsible via native `<details>` / `<summary>`. Default collapsed. Expansion reveals the first N affected rows in a `<pre>` block (mono). Keyboard-operable; native disclosure semantics preserved.
- **Score row.** Numeric value is the source of truth for assistive tech. The horizontal bar is `aria-hidden`. The label names the category; the mono number carries the value.
- **Cleaning modal.** Focus trap when open. Esc closes. The Cancel button is the safe default and receives initial focus per the accessibility floor. Confirm is enabled only when at least one toggle is on.
- **Pre-flight time-band (FR-6).** During the active state, the static "Working…" text carries an inline parenthetical with the estimated time band — `Working… (~3s ±30%)`. The band is shown in mono so the value reads as data. If the upper bound of the band exceeds the 10s budget, the page advances to the refusal state instead of showing a band — band and refusal are mutually exclusive states, never both. The band re-renders on file size changes (re-drop of a different file); no caching.
- **Theme toggle.** Button with `aria-pressed`. The visible label switches between "Dark" and "Light" text — sun and moon glyphs are decorative. Persists in `localStorage` under `wul-theme`. First paint is seeded by `prefers-color-scheme`.
- **Mechanism-B links.** Link-shaped but `aria-disabled="true"` and visually muted; explicit "(coming)" annotation sits beside them. The link text is the entire value — clicking does nothing for MVP because the tools do not exist yet. This is intentional, not broken.

## State Patterns

What each state means, how it announces itself, where focus goes.

- **Empty.** Drop zone is the primary interactive element; focus lands on it on page load.
- **Active.** Drop zone replaced by file metadata strip + static "Working…" text. Focus shifts to the aria-live region via live announcement — no visual focus change.
- **Results.** Page reveals progressively if streaming; otherwise single replacement. Focus moves to the results header `#problems` via `tabindex="-1"` + `.focus()`. Skip link "Skip to problems" is the first tab stop.
- **Refusal.** Page shows only the refusal message + a single "Choose a smaller file" CTA. Focus on the refusal header.
- **Modal open.** Focus trapped in modal; first focusable element is Cancel. On close, focus returns to the trigger button.
- **Theme toggle.** Focus stays where it is; only the class flips.

## Interaction Primitives

No keyboard shortcuts are defined. Every interactive element is reachable in DOM order via Tab, with the skip-link as the first tab stop. Theme toggle is reachable. There are no keyboard traps.

## Accessibility Floor

Locked commitments:

- WCAG 2.2 AA, keyboard-first.
- Color contrast 4.5:1 for body text, 3:1 for large text or UI affordances.
- Visible focus rings: 2px solid cobalt accent (`{colors.semantic.accent}`), 2px offset.
- Skip-links per page: "Skip to main content" on empty state; "Skip to problems" on results state.
- `prefers-reduced-motion` respected. The only motion is the theme transition (180ms), gated behind `@media (prefers-reduced-motion: no-preference)`. No spinners — static "Working…" text replaces them.
- `aria-live="polite"` regions: results banner, dropzone accept announcement, theme change announcement.
- Semantic HTML throughout — `header` / `main` / `footer` / `section` / `h1` / `h2` / `button` / `a` / `table` / `th scope="col"` / `caption` / `details` / `summary`. No divs masquerading as buttons.
- High-severity problems (PII) carry a redundant text label — the violet dot is paired with the word "PII" in copy, never standing alone.

## Key Flows

### Devon's flow (UJ-1)

1. Devon opens `cstrescue.dev` → empty state with the privacy signal in view at the dropzone (FR-9).
2. Devon drops the vendor's CSV onto the dropzone. The dropzone accepts; the file name appears in the aria-live region.
3. Static "Working…" text replaces the dropzone. No spinner (accessibility floor / editorial posture).
4. Results page reveals. Banner announces "Results ready — 16 problems found, 1 high-severity." The 3px-violet PII problem card sits at the top of the problems list.
5. Devon scrolls. Reads the duplicate-rows card and the PII card. Expands one of them to see row 14's content in the mono pre block.
6. Devon clicks "Clean and export." Modal opens. Focus on Cancel. All toggles off.
7. Devon toggles "Deduplicate" and "Redact PII." The redact-PII toggle surfaces the kind-error confirm framing the irreversibility.
8. Devon confirms. Modal shows "Building cleaned file…" The file downloads as `cleaned-vendor_export_2026-07-2026-08-11-0914.csv`.

**Critical reveal.** When the aria-live banner announces "Results ready — N problems found, 1 high-severity" and the 3px-{`{colors.semantic.pii}`} PII problem card appears at the top of the problems list, the privacy claim and the tool's detection capability are both demonstrated in one visible moment. Subsequent sections (score, schema, cleaning) build on that reveal without re-litigating it.

### Failure paths

- **File > 50 MB or upper-bound estimate > 10s (FR-6).** Refusal state. Banner explains; single "Choose a smaller file" CTA. No partial results.
- **BOM detected (FR-1).** Surface as one of the eight problem categories with a "Strip BOM and re-detect" affordance — preserves the UJ-1 edge case from the PRD.
- **Theme toggle.** No-op beyond class flip and aria-pressed update; localStorage persists; first paint on next visit honors the stored choice.

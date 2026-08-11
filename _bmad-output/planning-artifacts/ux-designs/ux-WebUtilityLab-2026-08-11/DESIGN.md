---
title: WebUtilityLab — Design System
created: 2026-08-11
updated: 2026-08-11
status: final
sources:
  - _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md
colors:
  semantic:
    - name: paper
      light: '#fafaf7'
      dark: '#0e1116'
    - name: ink
      light: '#1a1a1a'
      dark: '#e8e6e1'
    - name: graphite
      light: '#5a5a5a'
      dark: '#9a9892'
    - name: rule
      light: '#d8d6cf'
      dark: '#2a2e35'
    - name: soft
      light: '#f1efe9'
      dark: '#161a21'
    - name: accent
      light: '#3a5a8a'
      dark: '#7a9ad0'
    - name: accent-soft
      light: '#e6ecf5'
      dark: '#1a2230'
    - name: err
      light: '#a83232'
      dark: '#d97070'
    - name: warn
      light: '#8a6a1a'
      dark: '#d4a85a'
    - name: pii
      light: '#6a3a8a'
      dark: '#b48ad0'
    - name: ok
      light: '#2a6a3a'
      dark: '#7ac090'
    - name: err-soft
      light: '#f4e2e2'
      dark: '#2a1a1a'
    - name: warn-soft
      light: '#f4ecd9'
      dark: '#2a231a'
    - name: pii-soft
      light: '#ece1f4'
      dark: '#221a2a'
    - name: ok-soft
      light: '#dcecdf'
      dark: '#1a2a1f'
typography:
  body:
    family: system-ui
    fallback: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif"
    size: 1rem
    weight: 400
    lineHeight: 1.6
  h1:
    size: 1.875rem
    weight: 600
    letterSpacing: -0.015em
  h2:
    size: 1.5rem
    weight: 600
    letterSpacing: -0.01em
  data:
    family: ui-monospace
    fallback: "SFMono-Regular, Menlo, Consolas, \"Liberation Mono\", monospace"
    size: 0.875rem
  data-sample:
    family: ui-monospace
    fallback: "SFMono-Regular, Menlo, Consolas, \"Liberation Mono\", monospace"
    size: 0.75rem
rounded:
  default: 3px
  card: 2px
  dropzone: 2px
  toggle: 4px
spacing:
  base: 1rem
  section: 2.25rem
  page: 1.5rem
  card-padding: 1.25rem
  page-max: 880px
components:
  - button
  - dropzone
  - banner
  - problem-card
  - score-row
  - schema-table
  - cta-card
  - theme-toggle
---

# WebUtilityLab — Design System

## Brand & Style

Editorial / typography-led. Documentation posture, not SaaS landing. Trust through seriousness — the page reads like a reference appendix to a standards body, not a marketing surface. References: gov.uk, stripe.com long-form, pioneer.app. Two-mode (light + dark) with system-preference detection at first paint and a manual toggle in the header. Privacy Baseline constrains the entire system: no web fonts, no CDN, no analytics — every visual choice must survive with system-ui alone.

## Colors

Two-tone palette (light + dark) layered with semantic accents reserved strictly for meaning. Light tokens: `{colors.semantic.paper}` warm paper-white for the page; `{colors.semantic.ink}` near-black for primary text; `{colors.semantic.graphite}` low-contrast secondary text; `{colors.semantic.rule}` hairline borders; `{colors.semantic.soft}` quiet fills for code and data regions; `{colors.semantic.accent}` desaturated cobalt for links, focus rings, and primary action — never decorative. Dark tokens mirror via a `.dark` class on `<html>`: `{colors.semantic.paper}` deep slate (not pure black), warm off-white for `{colors.semantic.ink}`, softer `{colors.semantic.graphite}`, the same cobalt `{colors.semantic.accent}` lifted in lightness for contrast.

Semantic colors: `{colors.semantic.err}` red for errors and invalid data; `{colors.semantic.warn}` amber for warnings and questionable values; `{colors.semantic.pii}` violet — its own category, distinct from error, so the eye learns to scan for it; `{colors.semantic.ok}` green used sparingly, only on explicit success states. Each semantic has a `-soft` companion (`{colors.semantic.err-soft}`, `{colors.semantic.warn-soft}`, `{colors.semantic.pii-soft}`, `{colors.semantic.ok-soft}`) for tinted backgrounds under badges and problem-card bodies. The banner uses `{colors.semantic.accent-soft}` for its fill and `{colors.semantic.accent}` for its 3px left border.

Outlier and duplicate findings communicate with **typography alone** (underline, strikethrough, weight) — the color budget stays reserved for hard signals. No color is ever decorative; every chromatic choice maps to a category.

Contrast targets (load-bearing): body text ≥ 4.5:1 against `{colors.semantic.paper}` in both modes; large text and UI affordances ≥ 3:1; semantic dots paired with text labels (WCAG 1.4.1 redundancy).

## Typography

Sans body from the system stack only — the Privacy Baseline prohibits web fonts. Body fallback chain: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. Mono for **data only** — column names, CSV content, PII matches, file paths, score values — using `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`. Two-typeface system at most.

Type scale: `{typography.h1}` 1.875rem / 600 / -0.015em tracking; `{typography.h2}` 1.5rem / 600 / -0.01em; body `{typography.body}` 1rem / 400 / line-height 1.6; mono data `{typography.data}` 0.875rem; mono sample (inside problem-card disclosure blocks) `{typography.data-sample}` 0.75rem. Headings track tighter than body to read as editorial chrome.

Editorial conventions: curly quotes and apostrophes in prose; spaced em-dashes ("word — word"); sentence-case headings; mono data values keep original straight quotes and casing unchanged so values survive copy and paste back into source files.

## Layout & Spacing

Single page, scroll-driven, max-width `{spacing.page-max}` centered with `{spacing.page}` page padding. Header is a thin rule-divided row: wordmark left, privacy link and theme toggle right. Skip-link (`Skip to main content` on empty state, `Skip to problems` on results) is the first tab stop on every page.

Section spacing follows `{spacing.section}` (2.25rem) between major blocks; `{spacing.base}` between related elements; `{spacing.card-padding}` (1.25rem) inside cards. Empty state gets generous whitespace above the dropzone — the page breathes before the user acts. Results stack vertically (problems → score → schema → cleaning CTA → mechanism-B links → footer) and never require navigation.

Touch targets honor a 44×44 CSS-px floor as a courtesy, but desktop-primary is the posture; mobile polish is deferred per PRD §2.2.

## Elevation & Depth

Minimal. Cards earn depth only from a 1px border in `{colors.semantic.rule}` and a 1px-high box-shadow `0 1px 0 {colors.semantic.rule}` that reads as a paper edge, not a drop shadow. The banner carries emphasis via a 3px `{colors.semantic.accent}` left border on an `{colors.semantic.accent-soft}` fill — no extra shadow. Problem cards use a 3px left border in the relevant semantic color (err / warn / pii / neutral graphite) to signal category at a glance.

No drop shadows, no glass, no blur. The flatness is the point.

## Shapes

`{rounded.default}` 3px is the system radius. Cards are `{rounded.card}` 2px, dropzone `{rounded.dropzone}` 2px, theme toggle `{rounded.toggle}` 4px. Slightly rounded — not pill, not square. The corner radius reads as editorial restraint, not as Material-style affordance.

## Components

- **Button** — Primary uses `{colors.semantic.accent}` fill with white text; secondary is border-only on `{colors.semantic.rule}`. A `danger` variant is reserved for irreversible actions (PII redaction confirm); it uses `{colors.semantic.err}` only on the confirm copy and the kind-error framing, not as a fill across the whole flow.
- **Dropzone** — Real `<button>` element (not a div with role). 1.5px dashed `{colors.semantic.graphite}` border, `{rounded.dropzone}` corners. Hover tints the background with `{colors.semantic.accent-soft}` and lifts the border to `{colors.semantic.accent}`. Dragover thickens the border. Opens a real file picker; accepts drop and paste.
- **Banner** — Status surface, `aria-live="polite"`, `{colors.semantic.accent-soft}` fill, 3px `{colors.semantic.accent}` left border, no shadow. Hosts the "Results ready — N problems found" announcement.
- **Problem card** — Bordered on `{colors.semantic.rule}` with a 3px semantic-colored left border (`{colors.semantic.err}` / `{colors.semantic.warn}` / `{colors.semantic.pii}` / `{colors.semantic.graphite}` neutral for outlier and duplicate). Monospace title with the column or row reference inline; body explains the rule in prose; `<details>` / `<summary>` reveals the first N affected rows in `{typography.data-sample}` mono inside `{colors.semantic.soft}`.
- **Score row** — Three-column grid: label, horizontal bar (semantic-colored fill — `{colors.semantic.ok}` ≥ 80, `{colors.semantic.warn}` 60–79, `{colors.semantic.err}` < 60), mono numeric value. Bar is `aria-hidden`; the label and number are the source of truth for assistive tech.
- **Schema table** — `<table>` with `<caption>`, `<th scope="col">`. Mixed-type and PII flags render as small color dots (`{colors.semantic.warn}` for mixed casing, `{colors.semantic.pii}` for PII pattern) inside the type cell, paired with the words "mixed" or "PII" so the dot is never the only signal. Cells holding values or column names use mono.
- **CTA card** — Bordered on `{colors.semantic.rule}` with `{spacing.card-padding}` interior; holds the primary "Clean and export" button and the privacy reminder line.
- **Theme toggle** — A quiet button (`{rounded.toggle}` 4px, 1px `{colors.semantic.rule}` border). `aria-pressed` reflects state; the visible label is "Dark" or "Light" text, sun and moon glyphs are decorative inside the icon. Persists under localStorage key `wul-theme`; system preference (`prefers-color-scheme`) seeds the first paint.

## Do's and Don'ts

**Privacy Baseline (ship gate, FR-23).** The design system enforces these prohibitions as architecture — not aspirations, not "we'll try." They survive every code review.

- No analytics. No GA, Hotjar, Mixpanel, Plausible, Cloudflare Analytics, Sentry, FullStory — none.
- No error reporters. Bugs surface via a user-triggered "Report a problem" link, not automatic phone-home.
- No web fonts. System stack only. Google Fonts is a third-party request and is banned by name.
- No CDN with logging. Static assets served from a CDN that does not log request bodies; self-host where unsure.
- No remote calls during tool operation. After the initial page load, no network requests are made. Verifiable with DevTools open (the ship-gate check).
- Audited transitive dependencies. Every direct dep's transitive tree reviewed before each release. No packages known to phone home.
- Open source from day 1. Any third party can audit the privacy claim by reading the code.

**Do**
- Use mono for data values (column names, PII matches, file paths, score numbers, CSV samples).
- Keep color reserved for semantic meaning: error, warning, PII, info, success.
- Include the privacy signal at the dropzone — the visible-at-moment-of-trust line for FR-9.
- Pair every color signal with a text label or typographic treatment (WCAG 1.4.1).
- Respect `prefers-reduced-motion`: the theme transition is 180ms, gated behind `@media (prefers-reduced-motion: no-preference)`.
- Local-first is architecture, not discipline. Privacy risk lives in the surrounding dependencies (analytics, fonts, CDN logs, transitive packages, dev tooling) — not in the core feature. "No API calls in core" is necessary and insufficient; the Privacy Baseline above is the structural mitigation.

**Don't**
- Import web fonts.
- Make outbound network calls at runtime (after page load).
- Add an analytics snippet "temporarily for measurement."
- Pull in a dependency that wraps a remote API without auditing its transitive tree first.
- Use color to convey information without a redundant text or typographic signal.
- Animate beyond the theme transition; the static "Working…" text replaces any spinner when motion is reduced.
- Use color decoratively — every chromatic token maps to a category.
- Round to pill — stay subtle (`{rounded.default}` 3px, cards 2px).

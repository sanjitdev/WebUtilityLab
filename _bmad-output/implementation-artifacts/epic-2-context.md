# Epic 2 Context: Visual tokens, theme, empty page chrome

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Land the visual foundation of the app: a token-driven CSS system with light/dark themes, an editorial page shell (header with wordmark, nav with privacy link and theme toggle, main with skip-link target, footer), and the persistent theme toggle. The page reads "WebUtilityLab / CSV Rescue" and nothing else — no marketing, no images, no fonts beyond system-ui. This epic establishes the design vocabulary every subsequent epic renders against.

## Stories

- Story 2.1: Copy tokens from DESIGN.md into src/styles/tokens.css (light + .dark)
- Story 2.2: Inline theme-seed script in index.html before paint
- Story 2.3: ThemeToggle.svelte component with aria-pressed and cross-tab sync
- Story 2.4: Page chrome (header / nav / main / footer semantic HTML)
- Story 2.5: Focus ring rule via :focus-visible
- Story 2.6: Editorial posture sanity (system-ui, zero @font-face)

## Requirements & Constraints

The product carries a Privacy Baseline that forbids web fonts, CDN, and analytics — every visual choice must survive with `system-ui` alone. The visual system is token-driven: all chromatic values flow through CSS variables defined in a `colors.semantic.*` tree; component CSS must consume `var(--*)` and never use hex literals outside the `:root` / `.dark` token blocks. Color is reserved for semantic meaning (err / warn / pii / ok / accent + `-soft` companions); decorative color is not used. Every chromatic signal pairs with a redundant text label or typographic treatment so color is never the only signal (WCAG 1.4.1).

The two-typeface system is binding: sans (`system-ui` stack) for prose, mono (`ui-monospace` stack) for data values (column names, PII matches, file paths, score numbers, CSV samples). Data values retain original straight quotes and casing so they survive copy and paste back into source files.

The page is desktop-primary with editorial/typography-led posture — documentation feel, not SaaS landing. Single page, scroll-driven, max-width centered with page padding. Header is a thin rule-divided row: wordmark left, privacy link and theme toggle right. Empty state gets generous whitespace above any future dropzone. Skip-link is the first tab stop on every page.

The "empty state teaches" requirement (FR-7): the empty state is a tutorial, not a blank box — though the teaching copy and example-CTA live in E03, the chrome here frames the empty state for that work.

The "visible-at-moment-of-trust privacy signal" requirement (FR-9) constrains the empty state visually — the chrome establishes the editorial / restrained tone that makes a privacy line believable.

## Technical Decisions

Theme is a CSS-variable class flip on `<html>` (`.dark`). First paint must be seeded by an inline `<script>` reading `localStorage` key `wul-theme`, falling back to `prefers-color-scheme`, then flipping `<html class="dark">` before paint to prevent FOUC. Theme is the only thing persisted in `localStorage`. The theme transition is the only motion in the app — a 180ms CSS animation gated by `@media (prefers-reduced-motion: no-preference)`. No spinners, skeletons, or motion bars.

The ThemeToggle component uses `<button aria-pressed>`; visible label switches between "Dark" and "Light" text; sun/moon glyphs are decorative. Cross-tab sync via `window.addEventListener('storage', ...)` updates sibling tabs on toggle — deferred cross-tab drift would ship a bug users report. The toggle also announces via an `aria-live="polite"` region on flip.

Focus rings are 2px solid `var(--accent)` with 2px offset, applied to every focusable element via `:focus-visible`. Focus visibility is part of the accessibility floor that every component touching the DOM commits to (no `div onClick`, no color-only signal, no `aria-label` where text content suffices, no `tabindex > 0`).

Editorial conventions bound the voice for all copy in components: curly quotes and apostrophes in prose; spaced em-dashes ("word — word"); sentence-case headings. Mono data values keep original straight quotes and casing unchanged.

## UX & Interaction Patterns

Theme toggle is the only chrome-level interaction on the empty page. Its focus stays where it is on toggle — only the class flips and the aria-live region announces. All interactive elements are reachable in DOM order via Tab, with the skip-link as the first tab stop; no keyboard traps, no keyboard shortcuts. Semantic HTML only: `header` / `nav` / `main` / `footer` / `section` / `h1` / `h2` / `button` / `a`. No `<div onClick>`.

aria-live="polite" regions exist for theme change (and later, results banner and dropzone accept — those regions are wired in later epics but the pattern is established here).

## Cross-Story Dependencies

- S05.7 (E05) extends the skip-link conditional: empty state → "Skip to main content"; results state → "Skip to problems". The skip-link landing here must allow that extension.
- E03 consumes the chrome built here (dropzone renders inside `<main>`); E10 reuses the same chrome on the results state. The page shell must support both states without a re-render seam.
- E05 owns `formatStrictBrief()` and the Envelope `error` variant — not needed in E02, but referenced so the page chrome's empty-state copy remains consistent with later strict-brief error rendering.
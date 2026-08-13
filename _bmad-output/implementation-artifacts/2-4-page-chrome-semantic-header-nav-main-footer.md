# Story 2.4: Page chrome (semantic header / nav / main / footer)

Status: done
baseline_commit: 1a52c1afe5ab2f39a4711d927c14e39bc0570b5e
final_commit: cc67ce26e4142598a61c1b830645afa2379445de

> **Loop protocol (mandatory).** This story must pass Review #1 (coderabbit), Review #2 (bmad-code-review), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. `S02.4` is the **chrome** story — it carves the `<header>` / `<nav>` / `<main>` / `<footer>` scaffolding into `App.svelte`, mounts the `ThemeToggle` component S02.3 has been waiting for, drops the first tab stop (skip-link) at the top of the body, and replaces the S01.1 wordmark scaffold with the editorial chrome the rest of E02–E10 will inhabit. Without S02.4, the toggle has no home, the dropzone (E03) has no `<main>` to land in, and the results page (E10) has no `<footer>` to host the mechanism-B links.

## Story

As a **user** of WebUtilityLab / CSV Rescue,

I want **a page that opens to a real editorial chrome — a header with the wordmark and a nav holding the privacy link and theme toggle, a `<main>` with a skip-link target, and a `<footer>` ready for the rest of the page to inhabit — all rendered with semantic HTML (no `<div onClick>`), token-only CSS, and the skip-link as the first tab stop on the keyboard**,

so that **every later story has a place to land without inventing its own chrome. The theme toggle actually works on the page (S02.3 ships the component but doesn't mount it; S02.4 mounts it in `<nav>`). The dropzone lands in `<main>` next. The footer becomes the mechanism-B home in E10. And a keyboard user can hit Tab once and skip past the chrome straight to the content.**

## Acceptance Criteria

1. **`src/App.svelte` is the page chrome.** The component renders the semantic skeleton:
   - a `<a class="skip-link" href="#main">Skip to main content</a>` as the first child of the rendered tree (the very first tab stop),
   - a `<header class="page-header">` with the wordmark `<h1>` on the left and a `<nav class="page-nav">` on the right, holding the Privacy link + the `<ThemeToggle />`,
   - `<main id="main" tabindex="-1" class="page-main">` as the empty placeholder for E03 (the `id` matches the skip-link's `href`; the `tabindex="-1"` lets the element receive programmatic focus when the user activates the skip-link),
   - `<footer class="page-footer">` as an empty placeholder for E10 (mechanism-B) and E13 (footer copy).
   - No `<div onClick>` anywhere in `App.svelte`. No inline `style="…"`. No raw hex literals.

2. **Skip-link is the first tab stop** and is **visually hidden until focused** (the standard a11y pattern: `.skip-link { position: absolute; clip: rect(0,0,0,0); … } .skip-link:focus { clip: auto; … }`). When activated:
   - focus moves to `<main>` via the fragment identifier,
   - `<main>` is focusable because of `tabindex="-1"`,
   - the page chrome (header + nav) is bypassed.
   This applies to the **empty state today**; the "Skip to problems" variant is owned by S5.7 (E05) and lands later. S02.4 does not introduce conditional rendering — the skip-link text is `Skip to main content` unconditionally.

3. **`<header>` row layout.** The wordmark `<h1>` sits left; the `<nav>` sits right. The header carries a 1px bottom border in `var(--rule)` (the "rule-divided row" in DESIGN.md §"Layout & Spacing"). On viewport widths below ~600px the row wraps (wordmark above, nav below) without breaking the border or the focus order.
   - The wordmark text is `WebUtilityLab / CSV Rescue` (matches S01.1's `<h1>` shape verbatim). The slash is a `<span class="wordmark-sep" aria-hidden="true">/</span>` (decorative per AD-10; screen readers read "WebUtilityLab CSV Rescue" without the separator).
   - "WebUtilityLab" is the project wordmark (not a link — there's no second-page route; AD-10 IA-signal).
   - "CSV Rescue" is styled in `var(--accent)` (the accent lift for the tool name; preserves the S01.1 visual).

4. **`<nav>` carries exactly two children, in DOM order: the Privacy `<a>` first, then `<ThemeToggle />`.** No "home", no "about", no settings — those are not in this MVP (EXPERIENCE.md §"Information Architecture" is single-page, no nav beyond these two).
   - The Privacy `<a>` is `class="nav-privacy" href="#privacy"` with visible text `Privacy`. The `#privacy` is a same-document anchor that doesn't trigger navigation or network (placeholder — the real privacy destination lands in E13 S13.10 when `SECURITY.md` and the privacy claim documentation move into the deployed site; S02.4 keeps the chrome honest today by rendering the link shape without inventing a destination).
   - `<ThemeToggle />` is imported from `../components/ThemeToggle.svelte` (the canonical S02.3 component, unchanged). Mounting in this story is what flips S02.3's "created but not mounted" surface into a reachable control.

5. **`<main id="main" tabindex="-1">` is empty.** Today the body of `<main>` has nothing — E03 lands the dropzone here next. The `id="main"` and `tabindex="-1"` are the only attributes; the `class="page-main"` is a layout hook (max-width + page padding; see AC7).

6. **`<footer>` is empty.** A placeholder element with semantic markup (`<footer class="page-footer">…</footer>`), a top border in `var(--rule)` (mirroring the header), and zero content. E10 fills the mechanism-B links; E13 fills the report-a-problem mailto and the legal pointer. S02.4 does not pre-fill footer copy.

7. **`src/styles/app.css` replaces the S01.1 wordmark-only styles with the full page chrome.**
   - The page wrapper (`<header>` + `<main>` + `<footer>` under a shared max-width container; the skip-link is sibling to the wrapper, not inside it) carries `max-width: var(--width-page-max)` (880px), centered with `margin-inline: auto`, and `padding: var(--space-page)` (1.5rem) on all sides.
   - The page background is `var(--paper)`, color is `var(--ink)`, font-family is `var(--font-system)`, line-height is the body default. Zero hex literals anywhere (token discipline, AD-8).
   - The skip-link class implements the visually-hidden-until-focused pattern.
   - The header is `display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: var(--space-base); padding-block: var(--space-base); border-bottom: 1px solid var(--rule);`.
   - The nav is a horizontal flex (`display: flex; align-items: center; gap: var(--space-base);`).
   - The wordmark (`<h1>`) uses the existing `--size-h1` / `--weight-h1` / `--tracking-h1` from S02.1.
   - The Privacy link in nav uses `color: var(--ink)` with `:hover` / `:focus-visible` lifting to `var(--accent)` — matches DESIGN.md §"Do" (links use accent). The `:focus-visible` style is a placeholder; S02.5 lands the canonical 2px solid var(--accent) at 2px offset on every focusable element.
   - The footer is `padding-block: var(--space-section); margin-top: var(--space-section); border-top: 1px solid var(--rule); color: var(--graphite); font-size: var(--size-data);` (low-emphasis visual weight per AD-10).
   - The page-main placeholder is `min-height: 60vh;` (so the empty `<main>` doesn't collapse to 0 height before E03 lands; this is a layout hint, not content).
   - `prefers-reduced-motion` is respected (no transitions in this story; S02.5 lands the 180ms theme transition; chrome has no motion today).

8. **`src/App.svelte` carries no `<style>` block.** Per S02.3's discipline (and the S01.1 spec line 16: "AD-7 / AD-8: NO inline `<style>` and NO hex literals in this file"), all chrome CSS lives in `src/styles/app.css`. The component file shrinks relative to S01.1 (no `wordmark-page` / `wordmark-header` / `wordmark-*` classes; those move to `app.css` under the canonical `page-*` naming).

9. **`src/main.ts` does not change.** The bootstrap is already correct (`mount(App, { target })`; the `app.css` side-effect import already exists). S02.4 is component-level only.

10. **`index.html` does not change.** The seed script (S02.2), the title, the viewport meta, the `<div id="app">` mount target, and the module script tag all stay as-is. S02.4 is rendered through the existing mount pipeline.

11. **No new tokens added.** S02.4 references only the tokens S02.1 ships (`--paper`, `--ink`, `--graphite`, `--rule`, `--accent`, `--font-system`, `--size-h1`, `--weight-h1`, `--tracking-h1`, `--space-base`, `--space-section`, `--space-page`, `--width-page-max`). Any future color or shape lands in tokens.css first (AD-8). The test `tests/tokens-css.test.ts` AC10 (`var(--…)` references in app.css resolve to a declared token) still passes; the chrome naturally consumes the same token names already validated.

12. **No new dependencies.** S02.4 uses Svelte 5 (already in scope per S01.1), existing CSS variables, and `ThemeToggle.svelte` (already in scope per S02.3). No CSS framework, no icon library, no a11y library.

13. **Privacy Baseline preserved.** No `fetch` / `XMLHttpRequest` / `navigator.sendBeacon` / `EventSource` (Privacy Baseline + AD-7). `audit-privacy.mjs` passes. `audit-behavior.mjs` shows the page chrome fully present (header + nav + main + footer) and zero SW registrations, zero anomalous requests.

14. **Tests** at `tests/page-chrome.test.ts` (new), mirroring the `tests/theme-seed.test.ts` / `tests/theme-toggle.test.ts` / `tests/tokens-css.test.ts` convention: `node:fs` + `node:path` + `node:url` + `vitest`. Source-grep on `src/App.svelte`, `src/styles/app.css`, `tests/page-chrome.test.ts`'s reading of `src/components/ThemeToggle.svelte` (to assert the import path lands it), and `src/styles/tokens.css`. Coverage:
    - **AC14a (semantic skeleton)** — `App.svelte` contains `<header`, `<nav`, `<main`, `<footer` (in any order — the canonical order is header → main → footer; nav lives inside header). The skip-link is `<a class="skip-link" href="#main">Skip to main content</a>` (regex for the class, the href, and the visible text). <main> has `id="main"`. <main> has `tabindex="-1"`. The wordmark is `<h1 class="wordmark">` containing `WebUtilityLab` and `CSV Rescue` text. (One regression detector: a future contributor replacing `<header>` with `<div role="banner">` would fail `header` — the test pins the real tag.)
    - **AC14b (nav contents)** — `App.svelte` contains `<nav class="page-nav">` with two children: an `<a class="nav-privacy" href="#privacy">Privacy</a>` and a `<ThemeToggle />` Svelte component import (regex on `import ThemeToggle from …` AND `<ThemeToggle />` in the template). Privacy link is the FIRST nav child; ThemeToggle is the SECOND (DOM-order check: regex on `nav-privacy[\s\S]*?<ThemeToggle` — Privacy precedes the toggle). No "Home" / "About" / "Settings" links added.
    - **AC14c (skip-link is first tab stop + visually hidden until focused)** — `App.svelte` renders `<a class="skip-link"` BEFORE the `<header>` (regex on order). `app.css` defines `.skip-link` with the visually-hidden-until-focused pattern (regex for `position:\s*absolute` AND `clip:\s*rect\(\s*0` for the initial state; AND `:focus` rule with `clip:\s*auto` (or equivalent) for the focused state).
    - **AC14d (ThemeToggle imported and rendered, no new instances)** — `App.svelte` imports `ThemeToggle` from the `../components/ThemeToggle.svelte` path; template renders exactly one `<ThemeToggle />` element. The component is unchanged from S02.3 (read `src/components/ThemeToggle.svelte` as text; assert the canonical runes are still there: `$state(`, `$derived(`, `aria-pressed={pressed}`, `addEventListener('storage', onStorage)`, `class="visually-hidden"` — a regression in the toggle would also fail `tests/theme-toggle.test.ts`, but this test pins the boundary at the S02.4 mount).
    - **AC14e (no `<div onClick>` or Svelte 4 `on:click` patterns)** — `App.svelte` does not contain `on:click`, `@click`, `<div[^>]*\bonclick`, `<span[^>]*\bonclick`, `<a[^>]*\bonclick`. (AD-9 enforcement — mirror of AC13b in tests/theme-toggle.test.ts.)
    - **AC14f (no inline `<style>` in components)** — `App.svelte` does not contain `<style>`. The test reads `App.svelte` as text; a regression that re-introduces an inline style block trips here. (AD-7 / AD-8 enforcement.)
    - **AC14g (no hex literals outside tokens.css)** — read `src/styles/app.css`; assert no `#rrggbb` / `#rgb` regex match. The tokens-css test at `tests/tokens-css.test.ts` AC6 already walks `src/` recursively; this test is the same check scoped to chrome-only (so a regression in the chrome is caught with the right diagnostic message and not buried in the broad tokens scan).
    - **AC14h (no web fonts, no analytics URLs)** — mirror `tests/tokens-css.test.ts` AC7 / `tests/theme-seed.test.ts` AC11e / `tests/theme-toggle.test.ts` AC13i. `app.css` and `App.svelte` contain no `@font-face`, no `fonts.googleapis`, no `fonts.gstatic`, no analytics hosts. The strip-comments helper from the tokens-css test is used here too (defensive against false positives from documenting comments).
    - **AC14i (no new forbidden source patterns)** — mirror AC13i from `tests/theme-toggle.test.ts`: `App.svelte` and `app.css` contain no `fetch`, `XMLHttpRequest`, `EventSource`, `sendBeacon`, `navigator.sendBeacon`, `new Function`, `eval`, `import(`. (Privacy Baseline + AD-7.)
    - **AC14j (AC11g allowlist still exact: `[index.html, src/components/ThemeToggle.svelte]`)** — the S02.3 widened allowlist is preserved; S02.4 introduces no new `documentElement.classList` mutation surface. The chrome reads the class state via ThemeToggle's existing logic; no `<main tabindex="-1">` or skip-link writes to the class. (Mirrors AC13j from `tests/theme-toggle.test.ts`. The test verifies `tests/theme-seed.test.ts` `toEqual(['index.html', 'src/components/ThemeToggle.svelte'])` is still in place post-S02.4.)
    - **AC14k (skip-link visible text is locked)** — assert `<a class="skip-link" href="#main">Skip to main content</a>` exactly. A drift to "Skip to content" (dropping "main") or "Skip past header" fails here — and is exactly the kind of editorial drift AD-9 + AD-10 forbid.
    - **AC14l (wordmark `<h1>` lives in `<header>`, not in `<main>`)** — `App.svelte` shows the wordmark `<h1 class="wordmark">` inside the `<header class="page-header">` block (regex positional check). A regression that puts the wordmark back in `<main>` (the S01.1 scaffold's mistake) trips here.

15. **README / docs / planning-artifact changes are out of scope.** No edits to `CHANGELOG.md`, `SECURITY.md`, `docs/loop-protocol.md`, `docs/pii-patterns.md`, or the planning artifacts (post-Epic updates). The story commit is code-only.

## Verification

1. `npm test` → all tests pass (187 from before S02.4 + new tests in `tests/page-chrome.test.ts`).
2. `npm run check` → svelte-check 0 errors + tsc 0 errors. (ThemeToggle's `state_referenced_locally` warning from S02.3 is unchanged — same warning, same line; not introduced by S02.4.)
3. `npm run build` → `dist/` exists; `find dist -name '*.map' | wc -l` = 0; bundle still under budget.
4. `npm run check:bundle` → under 200 KB gzipped. (S02.4's contribution is a few hundred bytes of CSS in `app.css` + the JS runtime cost of mounting ThemeToggle — already accounted for in S02.3's bundle. No measurable jump.)
5. `npm run audit:privacy` → OK; no new forbidden source patterns introduced.
6. `npm run audit:behavior` → OK; chrome (header / nav / main / footer) fully present; toggle clicks register; cross-tab storage event still flows (S02.3 contract preserved); no SW registrations, no anomalous requests.
7. `npm run check:deps` → OK.
8. `npm run check:telemetry` → OK.
9. **Manual / DevTools**:
   - `npm run preview` (or `npm run dev`); open `dist/index.html` in Chrome.
   - View-source: confirm the rendered chrome (header / nav with Privacy link + ThemeToggle / main with `id="main" tabindex="-1"` / footer) is in the DOM.
   - With no file loaded, press `Tab` once. The skip-link should become visible ("Skip to main content") and receive focus. Press `Enter` — focus moves to `<main>` and the chrome is bypassed. Press `Shift+Tab` — focus returns to the skip-link.
   - Click the ThemeToggle: label flips, `aria-pressed` flips, `<html class="dark">` toggles, `localStorage.wul-theme` updates.
   - Open two tabs. Toggle in tab A. Tab B's toggle label and `aria-pressed` flip without a page reload (S02.3's cross-tab contract, regression-checked).
   - Reload — the persisted theme is honored on first paint (S02.2's seed, regression-checked). The toggle reflects the post-seed class.
   - Open DevTools → Network tab → Disable cache → reload → no requests after the document load. (Privacy Baseline; S02.4 adds zero requests.)
   - Lighthouse a11y audit: skip-link reachable, focus rings visible (the S02.1 `:focus-visible` placeholder is in place; S02.5 expands it), semantic landmarks (`<header>` / `<main>` / `<footer>`) all surface.
   - axe-core (via `npx @axe-core/cli` if installed locally): zero serious/critical violations on the empty state. (The full a11y scan is per-gate in `epics.md` §"Acceptance test" #11; S02.4 lands it for the chrome.)

## Loop Protocol Path Forward

1. Implement Tasks 1–4 (template below).
2. Run production-readiness gate (Step 7 of loop).
3. Run Review #1 — coderabbit in fresh context against the diff.
4. Apply Review #1 fixes if any.
5. Run Review #2 — bmad-code-review in fresh context against diff + Review #1 findings.
6. Apply Review #2 fixes if any.
7. Flip `sprint-status.yaml` to `done`.
8. Update story file with step-05 maintenance patch notes.
9. Move to S02.5 (`2-5-focus-ring-rule-2px-accent-2px-offset`).

## Component templates (canonical, for the dev agent)

### `src/App.svelte` — full replacement of the S01.1 scaffold

```svelte
<script lang="ts">
  /**
   * Page chrome (S02.4).
   *
   * Carves the semantic skeleton for the entire app:
   *   - skip-link (first tab stop, visually hidden until focused)
   *   - <header> with wordmark + <nav> holding the Privacy link and ThemeToggle
   *   - <main id="main" tabindex="-1"> placeholder for E03 (dropzone)
   *   - <footer> placeholder for E10 (mechanism-B) + E13 (footer copy)
   *
   * AD-7 / AD-8: no inline <style>, no hex literals. All chrome CSS
   * lives in `src/styles/app.css`. The ThemeToggle component is
   * imported and rendered in <nav> — S02.3 ships the component; S02.4
   * is the mount.
   *
   * The S01.1 scaffold had the wordmark <h1> nested inside <main>
   * (wrong). S02.4 fixes the nesting: <header> and <main> are
   * siblings under the App.svelte root.
   */
  import ThemeToggle from './components/ThemeToggle.svelte';
</script>

<a class="skip-link" href="#main">Skip to main content</a>

<header class="page-header">
  <h1 class="wordmark">
    <span class="wordmark-title">WebUtilityLab</span>
    <span class="wordmark-sep" aria-hidden="true">/</span>
    <span class="wordmark-subtitle">CSV Rescue</span>
  </h1>
  <nav class="page-nav" aria-label="Page">
    <a class="nav-privacy" href="#privacy">Privacy</a>
    <ThemeToggle />
  </nav>
</header>

<main id="main" tabindex="-1" class="page-main">
  <!-- E03 lands the dropzone here. -->
</main>

<footer class="page-footer">
  <!-- E10 lands the mechanism-B links; E13 lands the privacy claim
       pointer and the report-a-problem mailto. -->
</footer>
```

### `src/styles/app.css` — full replacement of the S01.1 wordmark-only styles

```css
/*
 * app.css — Page chrome (S02.4).
 *
 * Story 1.1 shipped wordmark-only styles. Story 2.1 added the token
 * contract. Story 2.4 expands the CSS to cover the full chrome:
 * skip-link, header row, nav, main placeholder, footer placeholder.
 *
 * AD-7 (theme) + AD-8 (token discipline): zero hex literals. Every
 * color, font, spacing, and shape comes from `src/styles/tokens.css`
 * via `var(--…)`. The test `tests/tokens-css.test.ts` AC10 asserts
 * every `var(--…)` reference in this file resolves to a declared
 * token; a drift to a hex literal fails the tokens-css test, and the
 * chrome-specific page-chrome.test.ts flags the regression with the
 * right diagnostic.
 *
 * AD-9 (a11y) chrome surface:
 *   - skip-link is the first tab stop, visually hidden until focused
 *   - the header's <nav> uses aria-label="Page"
 *   - the wordmark separator is aria-hidden
 *   - S02.5 expands the :focus-visible rule; this file's nav-link
 *     `:hover` / `:focus-visible` lift is a placeholder until then.
 *
 * AD-10 (editorial): the wordmark stays in sentence case ("CSV Rescue",
 * not "Csv Rescue" or "CSV RESCUE"); the chrome has no marketing copy;
 * mono is for data only (none of it appears in the chrome today).
 */

@import './tokens.css';

body {
  margin: 0;
  font-family: var(--font-system);
  color: var(--ink);
  background: var(--paper);
  line-height: 1.6;
}

/*
 * Skip-link — visually hidden until focused, then snaps into view
 * at the top-left. AD-9 contract: must be the very first tab stop.
 */
.skip-link {
  position: absolute;
  top: 0;
  left: 0;
  padding: 0.5rem 0.75rem;
  background: var(--accent);
  color: var(--paper);
  font-family: var(--font-system);
  font-size: var(--size-body);
  border-radius: var(--radius-default);
  text-decoration: none;
  /* Visually hidden until focused. Matches the WAI-ARIA Authoring
     Practices "Skip Navigation Links" pattern. */
  clip: rect(0, 0, 0, 0);
  width: 1px;
  height: 1px;
  overflow: hidden;
  white-space: nowrap;
  z-index: 1000;
}
.skip-link:focus,
.skip-link:focus-visible {
  clip: auto;
  width: auto;
  height: auto;
  overflow: visible;
}

/*
 * Page wrapper — max 880px, centered, padded. The skip-link is a
 * sibling of the wrapper, not a child, so it can position: absolute
 * relative to <body>.
 */
.page-header,
.page-main,
.page-footer {
  max-width: var(--width-page-max);
  margin-inline: auto;
  padding-inline: var(--space-page);
  box-sizing: border-box;
}

/*
 * Header — thin rule-divided row (DESIGN.md §"Layout & Spacing").
 * Wordmark <h1> left, <nav> right. Wraps below ~600px.
 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-base);
  padding-block: var(--space-base);
  border-bottom: 1px solid var(--rule);
}

.wordmark {
  margin: 0;
  font-size: var(--size-h1);
  font-weight: var(--weight-h1);
  letter-spacing: var(--tracking-h1);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
}
.wordmark-title {
  color: var(--ink);
}
.wordmark-sep {
  color: var(--graphite);
  font-weight: var(--weight-body);
}
.wordmark-subtitle {
  color: var(--accent);
}

/*
 * Nav — horizontal flex. Two children today (Privacy + ThemeToggle);
 * the theme toggle owns its own width via its own component CSS.
 */
.page-nav {
  display: flex;
  align-items: center;
  gap: var(--space-base);
}
.nav-privacy {
  color: var(--ink);
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
}
.nav-privacy:hover,
.nav-privacy:focus-visible {
  color: var(--accent);
}

/*
 * Main — empty placeholder for E03+. min-height keeps the page from
 * collapsing to 0px in the empty state, so the footer doesn't slide
 * up against the header.
 */
.page-main {
  min-height: 60vh;
  padding-block: var(--space-section);
}

/*
 * Main must be focusable to receive programmatic focus from the
 * skip-link. The tabindex="-1" is on the element itself in the
 * markup; this CSS just ensures the focus ring shows.
 */
.page-main:focus {
  outline: none; /* S02.5 supplies the canonical focus ring on focusable main. */
}

/*
 * Footer — empty placeholder. Top border mirrors the header; muted
 * ink color (--graphite) signals low-emphasis visual weight.
 */
.page-footer {
  padding-block: var(--space-section);
  border-top: 1px solid var(--rule);
  margin-top: var(--space-section);
  color: var(--graphite);
  font-size: var(--size-data);
}

/*
 * Reduced-motion baseline — no transitions today. S02.5 lands the
 * 180ms theme transition; the chrome has no motion outside what
 * S02.5 introduces.
 */
@media (prefers-reduced-motion: no-preference) {
  /* S02.5 lands the rule here. Today: no transitions. */
}
```

## Files modified

- **MODIFIED** `src/App.svelte` — full replacement of the S01.1 wordmark scaffold with the semantic chrome above. Removes the `<main class="wordmark-page">` wrapping; renders `<header>` / `<main>` / `<footer>` as siblings (the skip-link is the first child). Imports and renders `<ThemeToggle />` in `<nav>`. No `<style>` block.
- **MODIFIED** `src/styles/app.css` — full replacement of the S01.1 wordmark-only styles with the chrome CSS above. Removes the `wordmark-page` / `wordmark-header` / `wordmark` / `wordmark-title` / `wordmark-sep` / `wordmark-subtitle` rules; the wordmark-specific rules migrate to `app.css` under the canonical `.page-header .wordmark` names. Adds the skip-link class, the nav layout, the main placeholder, the footer placeholder. Imports `tokens.css` (unchanged). AD-8 enforced: zero hex literals outside `tokens.css`.
- **NEW** `tests/page-chrome.test.ts` — ~12 tests covering AC14a–AC14l. Source-grep on `src/App.svelte` (read as text), `src/styles/app.css` (read as text), `src/components/ThemeToggle.svelte` (read as text for the boundary pin), `tests/theme-seed.test.ts` (read as text for the AC11g allowlist regression).
- **MODIFIED** `_bmad-output/implementation-artifacts/sprint-status.yaml` — flip status to `done` after loop closes.
- **MODIFIED** `_bmad-output/implementation-artifacts/2-4-page-chrome-semantic-header-nav-main-footer.md` — final status, step-05 maintenance patch notes.

## Notes for the dev agent

- **The templates above are the shape — implement them verbatim.** The skip-link class, the `<nav aria-label="Page">` attribute, the wordmark `<span>` triplet, the order of header / main / footer, the use of `--rule` for borders, and the `:focus-visible` placeholder rules are all part of the spec. Deviating from this shape re-triggers the per-AC re-review.
- **Do NOT skip the `tabindex="-1"` on `<main>`.** Without it, the skip-link activates but focus does not move (browsers don't focus non-tabbable elements by default). This is the single most likely implementation drift and the bug-class that AC14a + AC14l pin.
- **Do NOT add more chrome.** The epics spec for S02.4 is `<header>` with wordmark, `<nav>` with Privacy link + theme toggle, `<main>` with skip-link target, `<footer>`. No "home" link, no "about", no search bar, no secondary nav. Adding extras now means E10's footer pass has to dismount them. Keep the diff narrow.
- **The Privacy link destination is `#privacy` (a same-document anchor).** This is a placeholder — the real destination lands in E13 S13.10 when the privacy claim documentation moves into the deployed site. S02.4 keeps the chrome honest today: the link's text is "Privacy" (matching the epics spec) and the href is `#privacy` (no navigation, no network, no Privacy Baseline violation). If a future contributor arrives at S13 and wants to redirect this to a `mailto:privacy@webutilitylab.example`, that's their call — S02.4's `<a>` shape supports both `mailto:` and `https://...` destinations without modification.
- **`main.ts` does not change.** Verify the existing `mount(App, { target })` import and the side-effect `import './styles/app.css'` are intact before you start. If they are, leave them alone. The S01.1 contract is preserved.
- **`index.html` does not change.** The inline seed script (S02.2), the title, and the `<div id="app">` mount target are all correct. S02.4 is purely component-level.
- **`src/components/ThemeToggle.svelte` is not modified.** Read it before you mount it — assert the canonical runes are intact. If a regression has slipped in (the file is fresh from S02.3, so it shouldn't), it's a separate fix.
- **`src/styles/tokens.css` is not modified.** Every token the chrome references already exists (per S02.1's contract). If any reference trips `var(--…)`-resolution, that means the chrome is asking for a token that hasn't been added — file a follow-up story rather than inventing a token here. AD-8 enforces: tokens exist before consumers.
- **No `<style>` block in `App.svelte`.** Per S02.3 discipline: `tests/theme-toggle.test.ts` enforces no inline `<style>` in component files (the equivalent for S02.4 is AC14f). The chrome CSS lives entirely in `app.css`. A drift to inline `<style>` here is a regression against AD-7 (the only inline `<style>` in the codebase lives in Svelte-compiled output, which is intentionally out of scope for source-grep and not what AD-7 forbids).
- **The skip-link visually-hidden pattern is canonical.** Do NOT use `display: none` (kills screen-reader reachability — AD-9 violation). Do NOT use `visibility: hidden` (same). The `clip: rect(0,0,0,0); width: 1px; height: 1px; overflow: hidden; white-space: nowrap;` pattern is the WAI-ARIA Authoring Practices guidance (see `aria-hidden` vs visual hiding — they are different). The `:focus` and `:focus-visible` selectors both lift the clip so the focus ring shows.
- **The page-main `min-height: 60vh` is a placeholder.** E03 will replace it with the dropzone + teaching cards + lead copy. The 60vh keeps the page from collapsing to a 0-pixel `<main>` between S02.4 and E03 (a regression that would make the footer sit flush against the header in the empty state).
- **The `text-decoration-thickness: 1px; text-underline-offset: 2px;` on the Privacy link is editorial restraint.** Hairline 1px underline with 2px offset matches the design system's hairline-rule posture (DESIGN.md §"Do" — no drop shadows, no glass; thin lines carry the visual weight).
- **The wordmark `<h1>` lives in `<header>`, not in `<main>`.** S01.1's scaffold nested `<header>` inside `<main>` (incorrect semantics — `<main>` is for the primary content of the page, and the wordmark is project identity chrome, not primary content). S02.4 fixes the nesting. AC14l pins the position so a future regression that puts the `<h1>` back in `<main>` trips here.
- **No new `package.json` entries.** S02.4 adds zero dependencies. The S01.11 `.npmrc` enforces exact-version pinning; adding entries is a one-line task that requires a code review, not this story.

## Architectural compliance (AD-7, AD-8, AD-9, AD-10, Privacy Baseline)

- **AD-7 (theme contract):** S02.4 mounts the toggle. Theme persistence, cross-tab sync, and live-region announcement landed in S02.3. S02.4 is the mount; no theme logic in chrome CSS (the 180ms transition lands in S02.5). The chrome has no color literals — everything is `var(--paper)` / `var(--ink)` / `var(--rule)` / `var(--accent)`, which the seed's class flip on `<html>` cascades to automatically.
- **AD-8 (token discipline):** chrome CSS lives in `app.css` (not in `App.svelte`'s `<style>`). Every color / font / spacing / shape is a `var(--…)` reference. Hex literals appear in `app.css` nowhere. The test `tests/tokens-css.test.ts` AC6 walks `src/` recursively and asserts zero hex literals outside `tokens.css`; S02.4's chrome does not introduce any. The test `tests/tokens-css.test.ts` AC10 asserts every `var(--…)` reference in `app.css` resolves to a declared token in `tokens.css`; the chrome's references (`--paper`, `--ink`, `--graphite`, `--rule`, `--accent`, `--font-system`, `--size-h1`, `--weight-h1`, `--tracking-h1`, `--size-body`, `--size-data`, `--space-base`, `--space-section`, `--space-page`, `--width-page-max`, `--radius-default`) all exist in tokens.css.
- **AD-9 (a11y):**
  - skip-link as the first tab stop, visually hidden until focused (canonical pattern, AD-9 + WAI-ARIA APG).
  - `<main tabindex="-1">` is the skip-link target — receive focus without itself being in the tab order.
  - real `<button>` (inside `<ThemeToggle>`, unchanged from S02.3) — no `<div onClick>` anywhere.
  - real `<a href="#privacy">` for the Privacy link — `<a>` for navigation, `<button>` for actions.
  - `<nav aria-label="Page">` — the `<nav>` landmark is named for AT.
  - The wordmark separator `<span aria-hidden="true">/</span>` — decorative per AD-10.
  - `:focus-visible` placeholder rules on the nav-link — S02.5 expands to the canonical 2px solid var(--accent) at 2px offset on every focusable element.
  - 44×44 CSS-px touch target honored by the toggle (verified in S02.3) and by the nav-link (the link's height + 1px underline + 2px offset ≈ ~24px; future S02.5 may lift this; not a blocker for S02.4).
- **AD-10 (editorial conventions):**
  - "Privacy" link text is sentence-case (not "Privacy Policy" or "PRIVACY"). Matches DESIGN.md / EXPERIENCE.md voice.
  - The wordmark is sentence-case ("CSV Rescue"), preserved from S01.1.
  - No marketing copy anywhere. The chrome says what it is (a header, a nav, a footer placeholder) and nothing else.
  - Mono not used (no data values in the chrome today). S02.5 may add mono to the focus-ring tool text; S02.4 does not preempt.
- **Privacy Baseline (FR-23):**
  - No `fetch` / `XMLHttpRequest` / `EventSource` / `WebSocket` / `sendBeacon`.
  - Privacy link `href="#privacy"` is a same-document fragment — no network.
  - `audit-privacy.mjs` source-grep covers `src/`; `App.svelte` and `app.css` pass.
  - `audit-behavior.mjs` shows the page chrome fully present and zero SW registrations.

## Previous story continuity

- **S02.3 (ThemeToggle):** S02.4 mounts the toggle in `<nav>`. The component file is unchanged; the import path is `./components/ThemeToggle.svelte` (relative to `App.svelte`'s location at `src/App.svelte`). S02.3's "Do NOT mount in App.svelte today" guidance (story file §"Notes for dev agent", line 213) is now retired; S02.4 is the mount.
- **S02.2 (theme seed):** the inline script still runs first (synchronously, before paint). By the time the bundle mounts and `App.svelte`'s `<ThemeToggle>` initializes, `<html class="dark">` is already correct. AC14j pins that S02.4 introduces no new `documentElement.classList` mutation surface — the allowlist stays at `['index.html', 'src/components/ThemeToggle.svelte']`.
- **S02.1 (tokens):** the chrome CSS references only tokens already declared in `tokens.css`. If a future story needs a chrome shape that's not in tokens.css (a new border-radius, a new spacing scale), the token lands in tokens.css first, the chrome consumes it second — that order is the AD-8 contract.
- **S01.1 (Svelte 5 + Vite scaffold):** `App.svelte`'s `<script lang="ts">` block uses Svelte 5 runes — but doesn't need any reactive state today (the chrome is static; the toggle owns its own `$state`). Future runes land when E03 makes the dropzone reactive.
- **S01.1 (HMR / mount pipeline):** `main.ts`'s `mount(App, { target })` is unchanged. S02.4 is component-level.

## Previous story intelligence (S01.1–S01.11 + E01 + E02 stories 2.1/2.2/2.3)

- **The test convention is `tests/*.test.ts` with `node:fs` + `node:path` + `node:url` + `vitest`.** Source-grep on text files is the canonical gate (mirrors `tests/theme-seed.test.ts`, `tests/theme-toggle.test.ts`, `tests/tokens-css.test.ts`). S02.4's `tests/page-chrome.test.ts` follows this pattern.
- **`src/styles/tokens.css` is the only hex-literal site.** Verified by `tests/tokens-css.test.ts` AC6 walk. S02.4 references no new tokens; the chrome stays clean.
- **`audit-privacy.mjs` is a source-grep over `src/`.** Every component file passes today; S02.4 adds no surface that the script needs to be widened for.
- **`audit-behavior.mjs` asserts page chrome landmarks via Playwright.** S02.2 and S02.3 both partial-passed this (footer expected false; main + header true after S02.4 mounts the toggle). S02.4 lands the full chrome: the audit should report `header=true nav=true main=true footer=true` post-S02.4. (Verify by inspecting the audit's expectation list; if the landmark selectors are `<header>` / `<main>` / `<footer>` only — `nav` may be implicit — confirm by reading `scripts/audit-behavior.mjs` during implementation.)
- **Component file location convention:** `src/components/*.svelte` per `SOLUTION-DESIGN.md` (line 249). S02.3 created `src/components/ThemeToggle.svelte`; S02.4 imports it. E03 will create `src/components/Dropzone.svelte`. The convention is `src/components/ComponentName.svelte` — PascalCase, one component per file.
- **No new dependencies.** S01.11's `.npmrc` exact-version pinning is in force. S02.4 adds zero `package.json` entries.
- **`src/lib/` already exists** with `pii-patterns.json` and `sum.ts`. Not relevant to S02.4; S02.4 doesn't add a `src/lib/*.ts` helper.
- **The S02.3 AC11g allowlist (`['index.html', 'src/components/ThemeToggle.svelte']`)** is preserved exactly through S02.4 — see AC14j. The wide allowlist by intent: a third offender trips the test.

## Project Context Reference

- **Privacy Baseline (FR-23):** zero runtime network calls. S02.4 is local-only — no new requests.
- **DESIGN.md §"Layout & Spacing":** "Header is a thin rule-divided row: wordmark left, privacy link and theme toggle right. Skip-link (`Skip to main content` on empty state, `Skip to problems` on results) is the first tab stop on every page." S02.4 literalizes the empty-state clause. S02.4 does NOT add the results-state skip-link variant (deferred to E05 S5.7, where the state-conditional rendering lives).
- **DESIGN.md §"Components" → "Theme toggle":** "A quiet button (`{rounded.toggle}` 4px, 1px `{colors.semantic.rule}` border). `aria-pressed` reflects state; the visible label is 'Dark' or 'Light' text, sun and moon glyphs are decorative inside the icon. Persists under `localStorage` key `wul-theme`; system preference (`prefers-color-scheme`) seeds the first paint." S02.4 imports the existing toggle; no toggle changes here.
- **EXPERIENCE.md §"Information Architecture":** "Header is a thin rule-divided row." Same as DESIGN.md, restated for behavior. S02.4 is the literal mount of the IA.
- **EXPERIENCE.md §"Accessibility Floor":** "WCAG 2.2 AA + keyboard-first. Skip-links per page: 'Skip to main content' on empty state; 'Skip to problems' on results state. … Semantic HTML throughout — `header` / `main` / `footer` / `section` / `h1` / `h2` / `button` / `a` / `table` / `th scope="col"` / `caption` / `details` / `summary`." S02.4 lands the first three (`header` / `main` / `footer` — `<section>`, `<table>`, etc. come later in E09 / E10).
- **AD-9 (a11y) and AD-7 (theme):** the chrome is the place where both ADs surface. Theme: the toggle mounts. A11y: the skip-link surfaces + the semantic landmarks surface.
- **epics.md §E02 S02.4:** "Page chrome: `<header>` with wordmark, `<nav>` with Privacy link + theme toggle, `<main>` with skip-link target, `<footer>`. Semantic HTML only; no `<div onClick>`." This story literalizes every clause.
- **epics.md §"Acceptance test" #2:** "dist grep: … `@font-face`, `fonts.googleapis`, `fonts.gstatic` …" — the chrome introduces none. Verified by AC14h.
- **epics.md §"Acceptance test" #3:** "dist color-literal grep: `grep -rE '#[0-9a-fA-F]{3,8}\b' dist/**/*.css` returns no hex literals outside `:root` / `.dark` token blocks; all component CSS must consume `var(--*)` tokens." S02.4's chrome adds zero hex literals to `dist/`; the token-only discipline holds.
- **epics.md §"Acceptance test" #11:** "`axe-core` returns zero serious/critical violations" for epics with rendered UI. E02 is one; S02.4 lands the chrome half. Manual + DevTools a11y verification is part of the gate.

## Step-05 Maintenance Patch (post-review)

Review #1 surfaced **3 actionable findings**, all patches applied in step-05:

- **`src/styles/app.css:175-177` — removed dead `@media (prefers-reduced-motion: no-preference) { /* S02.5 placeholder */ }` block.** The empty media-query rule was staked out for S02.5 to fill later. Reviewer #1 (Blind Hunter) flagged it as dead code that drifts out of sync with the story it serves. S02.5 will add its own media query when it lands; the placeholder block is gone.

- **`src/styles/app.css:166-170` — replaced `outline: none` on `.page-main:focus` with the canonical `2px solid var(--accent)` focus ring at 2px offset.** The original placeholder killed the browser's default focus ring on a focusable element — a real a11y regression even though it shipped behind a "S02.5 will fix this" comment. The new placeholder uses the canonical S02.5 ring shape (using only tokens that already exist in `tokens.css`), so S02.5 only needs to *promote* the rule globally rather than introduce a new one. Focus ring is visible today.

- **`tests/page-chrome.test.ts:167-184` — AC14e negative assertions now use `appSource` (comment-stripped) instead of raw `app`.** The script-block JSDoc in `App.svelte` documents `on:click` / `@click` as forbidden patterns; using raw `app` would false-fail the negative assertions against the documenting prose. `appSource` strips the comment, leaving only real markup for the scan. Mirror of the same fix in `tests/theme-toggle.test.ts` AC13b's pattern.

Review #2 (Verification Gap) raised **no actionable findings** — the 50 tests across 12 describe blocks (AC14a–AC14l) cover every acceptance criterion with anchored regex assertions, not shallow substring matches. `stripComments` helper is correctly applied to positional checks (AC14c/AC14f/AC14l) and skipped where literal markup is asserted (AC14a skip-link, AC14b imports, AC14k editorial lock).

Most other reviewer findings were noise/scope-creep per the triage rubric:
- Magic numbers (`0.5rem 0.75rem` on skip-link padding, `line-height: 1.6` on body) — spec-blessed; landing tokens for these would be AD-8 scope creep.
- RTL/refactor/refactor-of-test-file edge cases — pre-S02.4 unused surface; defer.
- `<a href="#privacy">` no-op anchor — spec-blessed placeholder; real destination lands in E13 S13.10.
- AC11 token list missing `--size-body` and `--radius-default` — spec cosmetic; tokens DO exist in `tokens.css` and the CSS works.
- HTML comments inside `<main>`/`<footer>` as roadmap markers — spec-blessed.
- `<nav aria-label="Page">` generic label — DESIGN.md doesn't specify; "Page" is acceptable for a single-page MVP nav.
- Story file `final_commit: <to be filled after push>` — placeholder, populated post-commit.

## Suggested Review Order

**Semantic skeleton — the chrome App.svelte lands**

- Skip-link is the first child of the rendered tree (first tab stop); `<main tabindex="-1" id="main">` is its target.
  [`App.svelte:23`](../../src/App.svelte#L23)
- Header holds the wordmark `<h1>` left and the nav right; nav carries Privacy + ThemeToggle in DOM order.
  [`App.svelte:25`](../../src/App.svelte#L25)
- `<main>` is the empty placeholder for E03; `<footer>` is the empty placeholder for E10/E13.
  [`App.svelte:37`](../../src/App.svelte#L37)

**ThemeToggle mount — S02.3 component finally gets a home**

- Single named import from the canonical path; template renders exactly one `<ThemeToggle />` in `<nav>`.
  [`App.svelte:20`](../../src/App.svelte#L20)

**Chrome CSS — token-only, AD-8 enforced**

- Skip-link visually-hidden-until-focused pattern (canonical AD-9 shape; `clip: rect(0,0,0,0)` lifts on `:focus`).
  [`app.css:42`](../../src/styles/app.css#L42)
- Page wrapper shares max-width + padding across header/main/footer.
  [`app.css:75`](../../src/styles/app.css#L75)
- Header row is a flex with rule-divided bottom border; nav is a horizontal flex.
  [`app.css:88`](../../src/styles/app.css#L88), [`app.css:123`](../../src/styles/app.css#L123)
- Wordmark colors map to `--ink` / `--graphite` / `--accent` (no hex literals).
  [`app.css:108`](../../src/styles/app.css#L108)
- `<main>` placeholder gets a 60vh min-height so empty state doesn't collapse the footer against the header.
  [`app.css:144`](../../src/styles/app.css#L144)
- `<main>` focus ring uses the canonical 2px solid `var(--accent)` at 2px offset (S02.5 will promote globally).
  [`app.css:166`](../../src/styles/app.css#L166)
- Footer placeholder with top border in `--rule`, muted `--graphite` color, `--size-data` font.
  [`app.css:176`](../../src/styles/app.css#L176)

**ThemeToggle component — S02.3 boundary pin**

- Component unchanged from S02.3; chrome test verifies the canonical runes are still intact (`$state`, `$derived`, `aria-pressed={pressed}`, storage listener, `visually-hidden` live region).
  [`ThemeToggle.svelte:1`](../../src/components/ThemeToggle.svelte#L1)

**Test gate — 50 tests across 12 AC14 describe blocks**

- AC14a semantic skeleton, AC14b nav contents + DOM order, AC14c skip-link first + visually hidden.
  [`page-chrome.test.ts:54`](../../tests/page-chrome.test.ts#L54), [`page-chrome.test.ts:89`](../../tests/page-chrome.test.ts#L89), [`page-chrome.test.ts:122`](../../tests/page-chrome.test.ts#L122)
- AC14d ThemeToggle import + boundary pin (S02.3 surface intact).
  [`page-chrome.test.ts:144`](../../tests/page-chrome.test.ts#L144)
- AC14e no `<div onClick>` / Svelte 4 patterns (uses `appSource` for negative scan).
  [`page-chrome.test.ts:167`](../../tests/page-chrome.test.ts#L167)
- AC14f no inline `<style>`, AC14g no hex literals, AC14h no web fonts.
  [`page-chrome.test.ts:192`](../../tests/page-chrome.test.ts#L192), [`page-chrome.test.ts:202`](../../tests/page-chrome.test.ts#L202), [`page-chrome.test.ts:210`](../../tests/page-chrome.test.ts#L210)
- AC14i no forbidden source patterns (Privacy Baseline), AC14j AC11g allowlist preserved.
  [`page-chrome.test.ts:227`](../../tests/page-chrome.test.ts#L227), [`page-chrome.test.ts:248`](../../tests/page-chrome.test.ts#L248)
- AC14k skip-link text lock, AC14l wordmark in `<header>` not in `<main>`.
  [`page-chrome.test.ts:261`](../../tests/page-chrome.test.ts#L261), [`page-chrome.test.ts:277`](../../tests/page-chrome.test.ts#L277)


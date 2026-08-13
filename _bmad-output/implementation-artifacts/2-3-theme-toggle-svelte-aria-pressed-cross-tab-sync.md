# Story 2.3: ThemeToggle.svelte (aria-pressed, label switch, cross-tab sync)

Status: done
baseline_commit: 53b56ba8d6cd3fc12add2d8f531ea1cff2ec8792
final_commit: 92823f7
review_loop_iteration: 1

> **Loop protocol (mandatory).** This story must pass Review #1 (coderabbit), Review #2 (bmad-code-review), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. `S02.3` lands the user-facing theme toggle component, closing AD-7's "no FOUC + persisted preference + live-region announcement" half. S02.1 put the token contract in `tokens.css`; S02.2 landed the inline seed that prevents first-paint flicker; S02.3 is the interactive component — the only place in the codebase that writes `wul-theme` to `localStorage` and the second `documentElement.classList` mutation surface (the seed is the first; both are explicitly enumerated in the AC11g follow-up maintenance patch in S02.2). Without S02.3, the theme is purely system-preference-driven and the user has no way to override.

## Story

As a **user** of WebUtilityLab's CSV Rescue MVP,
I want **a small "Dark" / "Light" toggle button in the page header that I can click to flip the theme, that announces the change to screen readers, and that I can see flip in another open tab when I toggle it there**,
so that **the editorial page respects my preference when it differs from `prefers-color-scheme`, the Privacy Baseline claim still holds (no analytics, no remote calls — the toggle reads/writes `localStorage` only and listens to the `storage` event), and S02.4's page chrome has a working theme toggle mounted in the `<nav>` without needing to invent its own implementation**.

## Acceptance Criteria

1. **`src/components/ThemeToggle.svelte` is the sole source of user-initiated theme writes.** The component:
   - reads `document.documentElement.classList.contains('dark')` on mount to render the initial label (the seed may have flipped the class; the toggle reads it),
   - on click, flips `document.documentElement.classList.toggle('dark')`,
   - on flip, writes `'dark'` or `'light'` to `localStorage.setItem('wul-theme', mode)`,
   - the localStorage write is the only persistence path; the seed does NOT write (S02.2 spec, line 95: "the seed reads; the toggle writes").
2. **`<button type="button">` element (NOT a `<div onClick>`, NOT a Svelte `on:click` on a div).** AD-9: real buttons only. `aria-pressed` reflects the current state:
   - light mode (no `.dark` class) → `aria-pressed="false"`, visible label "Dark",
   - dark mode (`.dark` set) → `aria-pressed="true"`, visible label "Light".
3. **Label switch on flip is instant.** The visible text "Dark" ↔ "Light" is the source of truth for assistive tech (the `aria-label` is omitted — text content suffices per AD-9). The sun and moon glyphs are decorative (`aria-hidden="true"`); icons do not convey state on their own.
4. **Live-region announcement on flip.**
   - A separate visually-hidden live region (`<span class="visually-hidden" aria-live="polite">`) is rendered next to the button and updated to "Theme: dark" or "Theme: light" whenever the click handler fires.
   - The announcement text is not redundant with the button label; it includes the word "Theme" so screen readers don't read "Dark" as an isolated state.
   - Implementation detail: use Svelte 5 runes (`$state`) for `mode`; bind the live region to that state.
5. **Cross-tab sync via `storage` event.**
   - On `window.addEventListener('storage', …)`: when a sibling tab writes `wul-theme`, this tab's toggle updates its label and `aria-pressed` *without* re-firing the localStorage write (the storage event is the other tab's write, not ours — `event.storageArea === localStorage && event.key === 'wul-theme'`).
   - The toggle's click handler must NOT echo `localStorage.setItem(...)` back to `storage` listeners (the `storage` event is intentionally fire-on-other-tab-only; the same-tab trigger does NOT fire it).
   - Implementation: `onMount(() => { const fn = (e: StorageEvent) => { … }; window.addEventListener('storage', fn); return () => window.removeEventListener('storage', fn); })` (Svelte 5 idiom).
6. **Initial render matches the seed's resolution.** If `localStorage` had `'dark'`, the seed flipped the class; the toggle reads `classList.contains('dark')` and renders "Light" / `aria-pressed="true"`. If `localStorage` was empty (first visit, system-preference-driven), the seed flipped to dark only if `prefers-color-scheme: dark`; the toggle mirrors that. The toggle must NOT re-query `matchMedia` — the class on `<html>` is the truth.
7. **No-FOUC preserved.** The toggle mounts *after* paint. The bundle is the `type="module"` `<script type="module" src="/src/main.ts">` (added in S01.1); it executes after DOMContentLoaded. The toggle does not run during parse, so its render does not race the seed (which already finished by the time the bundle mounts). The seed never re-runs; the toggle reads the post-seed state.
8. **The toggle lives in `<nav>` when S02.4 lands.** Today (S02.3): the component is created but not yet mounted into `App.svelte`. S02.4 will mount it in the page-chrome `<nav>`. **S02.3 does NOT modify `App.svelte`** — keep the diff narrow; the chrome is S02.4's job.
9. **Visual styling uses `tokens.css` variables only.** No hex literals in the component CSS (would fail `tests/tokens-css.test.ts` AC6). No `@font-face` / web fonts (AD-8 / Privacy Baseline). The toggle's quiet-button styling uses `--radius-toggle`, `--rule`, `--font-system` from `tokens.css`. Per AD-7 (DESIGN.md §"Components" → "Theme toggle"): `{rounded.toggle}` 4px; 1px `{colors.semantic.rule}` border. The button is "quiet" — not a primary CTA. Two states (light ↔ dark) differ only in the visible label and `aria-pressed`; the visual styling is unchanged.
10. **No new dependencies.** Uses Svelte 5 runes (already in scope per S01.1). Uses `localStorage` and `window.addEventListener` (browser globals, no imports). No CSS framework, no theme lib, no a11y lib.
11. **Privacy Baseline preserved.** No `fetch`, no `XMLHttpRequest`, no `navigator.sendBeacon`, no `EventSource`. The `storage` event is local. `audit-privacy.mjs` source-grep walks `src/` and the toggle passes. `audit-behavior.mjs` live Playwright check confirms zero post-load requests, zero SW registrations.
12. **Reduced-motion respected (forward-compat, not enforced this story).** AD-10: the theme transition is 180 ms, gated by `@media (prefers-reduced-motion: no-preference)`. **S02.5 lands the focus ring rule, which is where the 180 ms transition lives.** Today (S02.3): the toggle's class flip is instant. S02.5 adds the visual transition; the toggle's behavior does not need to change. Note this in the dev notes; do NOT preempt S02.5 by adding CSS transitions here.
13. **Tests** at `tests/theme-toggle.test.ts` (mirroring the existing test convention: `node:fs` + `node:path` + `node:url` + `vitest`):
    - **AC13a (component file exists & renders a `<button type="button">`)** — read `src/components/ThemeToggle.svelte` as text; assert the template contains `<button` and `type="button"`. (Source-grep only — the runtime render is asserted by `audit-behavior.mjs`.)
    - **AC13b (no `<div onClick>` pattern)** — assert no `on:click` on a non-button element, no `<div` with `@click`, no `@click` outside a `<button>` block. (AD-9.)
    - **AC13c (`aria-pressed` reflects the mode)** — assert template contains `aria-pressed={pressed}` or equivalent; assert on the Svelte file's reactive expression that the value reflects the `mode` state.
    - **AC13d (`storage` event listener)** — assert the component file contains `addEventListener('storage'` and a `removeEventListener('storage'` paired in an `onMount`-shaped return.
    - **AC13e (`localStorage.setItem('wul-theme', mode)` is the persistence path)** — assert the component file contains `localStorage.setItem('wul-theme'`.
    - **AC13f (decorative glyphs, not state)** — assert sun/moon text is wrapped in `aria-hidden="true"`. If the component uses an inline emoji or a single character glyph, wrap it. If it uses an `<svg>`, the svg must have `aria-hidden="true"` or a `<title>` (we'll spec the simpler emoji-or-character path).
    - **AC13g (live region)** — assert the component file contains `aria-live="polite"` and is bound to a state field.
    - **AC13h (no new tokens / no hex literals in the component CSS)** — assert the component file does not contain `#rrggbb` / `#rgb` / `rgb()` / `hsl()` (mirrors `tests/tokens-css.test.ts` AC6).
    - **AC13i (no `fetch` / `XMLHttpRequest` / `EventSource` / `sendBeacon`)** — assert none are imported or called (mirrors `tests/theme-seed.test.ts` AC11e + Privacy Baseline).
    - **AC13j (the toggle is the named second `documentElement.classList` mutation surface)** — **known-limitation follow-up from S02.2 step-05.** Update `tests/theme-seed.test.ts` AC11g to add `src/components/ThemeToggle.svelte` to an explicit allowlist of expected offenders. This test maintenance is part of S02.3's commit; without it, the S02.2 AC11g assertion breaks on `npm test`.
14. **README / docs / planning artifact changes are out of scope.** No edits to `CHANGELOG.md`, `SECURITY.md`, `docs/loop-protocol.md`, or the planning artifacts (those are post-Epic updates). The story commit is code-only.

## Verification

1. `npm test` → all tests pass (148 from before S02.3 + new tests in `tests/theme-toggle.test.ts` + the `theme-seed.test.ts` AC11g allowlist update).
2. `npm run check` → svelte-check 0 errors + tsc 0 errors.
3. `npm run build` → `dist/` exists; `find dist -name '*.map' | wc -l` = 0; bundle still under budget.
4. `npm run audit:privacy` → OK; the component does not introduce a forbidden source pattern.
5. `npm run audit:behavior` → OK; the toggle mounts after `load`; no new requests; no SW.
6. `npm run check:deps` → OK.
7. `npm run check:telemetry` → OK.
8. **Manual / DevTools**:
   - Clear `localStorage.wul-theme`; open `dist/index.html` via `npm run preview`; click the toggle when S02.4 mounts it (today, S02.3 only verifies the component file exists). For manual verification of S02.3 alone, mount the component in a throwaway story, verify in browser, then revert. (Do NOT modify App.svelte as part of S02.3 — let S02.4 own the mount.)
   - Cross-tab test: open two tabs of `dist/index.html`; click the toggle in tab A; observe tab B's label and `aria-pressed` update.
   - Storage-event isolation: click the toggle in tab A; verify tab A's `localStorage` write did NOT fire its own `storage` listener (the `storage` event is fire-on-other-tab-only; the same-tab write doesn't fire).

## Loop Protocol Path Forward

1. Implement Tasks 1–4 (template below).
2. Run production-readiness gate (Step 7 of loop).
3. Run Review #1 — coderabbit in fresh context against the diff.
4. Apply Review #1 fixes if any.
5. Run Review #2 — bmad-code-review in fresh context against diff + Review #1 findings.
6. Apply Review #2 fixes if any.
7. Flip `sprint-status.yaml` to `done`.
8. Update story file with step-05 maintenance patch notes.
9. Move to S02.4 (`2-4-page-chrome-semantic-header-nav-main-footer`).

## Component template (canonical, for the dev agent)

This is the canonical Svelte 5 component shape. Place at `src/components/ThemeToggle.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  // Read the class flip from the seed (S02.2). The class is the truth;
  // localStorage may be 'null' (system-preference-driven first visit) but
  // the class on <html> still reflects the resolved mode.
  let mode: 'dark' | 'light' = $state(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  let pressed = $derived(mode === 'dark');
  let announcement = $state('Theme: ' + mode);
  let liveText = $derived(announcement);

  function apply(next: 'dark' | 'light'): void {
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function persist(value: 'dark' | 'light'): void {
    try {
      localStorage.setItem('wul-theme', value);
    } catch (_) {
      // localStorage may throw in privacy-strict browsers; defaults to light.
    }
  }

  function onClick(): void {
    const next: 'dark' | 'light' = mode === 'dark' ? 'light' : 'dark';
    mode = next;
    announcement = 'Theme: ' + next;
    apply(next);
    persist(next);
  }

  onMount(() => {
    function onStorage(e: StorageEvent): void {
      if (e.storageArea !== localStorage) return;
      if (e.key !== 'wul-theme') return;
      const next: 'dark' | 'light' =
        e.newValue === 'dark' || e.newValue === 'light' ? e.newValue : 'light';
      mode = next;
      announcement = 'Theme: ' + next;
      // The other tab already wrote AND already applied the class.
      // We re-apply here so this tab's DOM matches its localStorage value.
      apply(next);
      // Do NOT persist again — the storage event IS the persistence signal.
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  });
</script>

<button
  type="button"
  aria-pressed={pressed}
  onclick={onClick}
  class="theme-toggle"
>
  <span class="theme-toggle-glyph" aria-hidden="true">
    {mode === 'dark' ? '☾' : '☀'}
  </span>
  <span class="theme-toggle-label">{mode === 'dark' ? 'Light' : 'Dark'}</span>
  <span class="visually-hidden" aria-live="polite">{liveText}</span>
</button>

<style>
  .theme-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    font-family: var(--font-system);
    font-size: var(--size-body);
    font-weight: var(--weight-body);
    color: var(--ink);
    background: var(--paper);
    border: 1px solid var(--rule);
    border-radius: var(--radius-toggle);
    cursor: pointer;
  }
  .theme-toggle:hover {
    border-color: var(--graphite);
  }
  .theme-toggle-glyph {
    font-size: 1rem;
    line-height: 1;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
```

### Notes on the template

- **Svelte 5 runes**: `$state` is the initial state; `$derived` for the reactive `pressed`/`liveText`. Pre-runes Svelte 4 idioms (`let pressed = mode === 'dark';`) do NOT update on click and are forbidden here.
- **`pressed` and `liveText`**: derived from `mode`. The `aria-pressed` attribute reflects the *current* state (`mode === 'dark'`). The live text is updated only on flip, but `$derived` ensures it tracks the mode if a future story mutates `mode` programmatically.
- **Click handler uses Svelte 5 syntax `onclick={onClick}`**, not Svelte 4 `on:click={onClick}`. The skill config targets ES2022 with Svelte 5; the new event binding syntax is required.
- **`<span class="visually-hidden">` for the live region**: a separate visually-hidden `<span>` sits next to the button. The aria-live region is independent of the visible label so screen readers announce changes without conflicting with the button's accessible name.
- **`apply(next)` is the class mutation**. The toggle is the *second* `documentElement.classList` mutation surface. The S02.2 step-05 patch recorded this as a known follow-up; the AC11g test in `tests/theme-seed.test.ts` must be updated to add `src/components/ThemeToggle.svelte` to an explicit allowlist (Part of S02.3's commit; see Task 4).
- **`localStorage.setItem` is wrapped in try/catch** for parity with the seed (S02.2 spec). Privacy-strict browsers may throw; defaults to the seed's class-only fallback.
- **No `aria-label`** on the button. The visible label "Dark" / "Light" is the accessible name; adding `aria-label` is redundant and forbidden per AD-9.
- **Decorative glyph**: the moon/sun character is wrapped in `aria-hidden="true"`. For this story, we use unicode characters (`☾` / `☀`) — no `<svg>` complexity. If `<svg>` is preferred in a future story, swap with the same aria-hidden contract.
- **`onClick` is the only `classList` mutation trigger**. The `onStorage` listener re-applies the class when a sibling tab writes; that's a class flip too, but the *user-initiated* change comes from `onClick`.
- **`pressed` is `$derived`, not `$state`**, because `mode` is the source of truth.

## Files modified

- **NEW**: `src/components/ThemeToggle.svelte` — the component above.
- **NEW**: `tests/theme-toggle.test.ts` — ~10 tests covering AC13a–AC13j.
- **MODIFIED**: `tests/theme-seed.test.ts` — extend AC11g allowlist to include `src/components/ThemeToggle.svelte` (the S02.2 step-05 known-limitation follow-up). Without this update, S02.2's test fails on S02.3's commit.
- **MODIFIED**: `_bmad-output/implementation-artifacts/sprint-status.yaml` — flip status to `done` after loop closes.
- **MODIFIED**: `_bmad-output/implementation-artifacts/2-3-theme-toggle-svelte-aria-pressed-cross-tab-sync.md` — final status, step-05 maintenance patch notes.

## Notes for the dev agent

- **The template above is the shape — implement it verbatim.** The named runes, the named `<span class="visually-hidden">`, the named unicode glyphs, the named event-listener return-callback are all part of the spec. Deviating from this shape re-triggers the per-AC re-review.
- **Do NOT mount the toggle in `App.svelte` today.** S02.4 owns the page chrome (including `<nav>`). Mounting it now would force S02.4 to dismount a working toggle and re-mount under chrome. Keep S02.3's diff narrow (component file + test file + S02.2 test allowlist update).
- **The `theme-seed.test.ts` allowlist update is part of this commit.** Without it, `npm test` fails (S02.2 AC11g trips on the new mutation surface). The update is: extract the existing regex, capture its match into an offenders array with `rel` paths, and assert that the offenders are exactly `[<seed path>, 'components/ThemeToggle.svelte']` (or `[<seed path>, 'ThemeToggle.svelte']` depending on the regex's group extraction). The post-S02.3 AC11g test must be specific enough that a *third* offender (e.g. a future S02.4 chrome shim that writes a parallel attribute) trips the test.
- **`audit-behavior.mjs` will not catch the toggle's interactive behavior at the empty-state wordmark — that's S02.4.** S02.3's behavioral claim is tested only by source-grep + manual cross-tab test. The full behavioral assertion lands when S02.4 mounts the toggle and a Playwright-driven "click the toggle" sequence is wired in (deferred to S02.4's verification).
- **No `@media (prefers-reduced-motion: no-preference)` here.** The 180 ms transition lands in S02.5 (the focus-ring story includes the theme transition). Adding it now would split the transition contract across stories. Today's class flip is instant; S02.5 wraps it in a CSS transition.
- **The component does NOT query `matchMedia`.** The seed already resolved prefers-color-scheme by the time the bundle mounts; the toggle reads the class. Re-querying `matchMedia` here would diverge from the seed's behavior if the user changes system preference mid-session (acceptable to defer — single-tab posture holds per ARCHITECTURE-SPINE.md §"Deferred (named non-decisions)" — the seed re-runs only on page reload).
- **`on:click` is the Svelte 4 event-binding syntax.** The current project uses Svelte 5 (S01.1); the new syntax is `onclick={onClick}`. The test (AC13b) verifies no `on:click` patterns remain in the file.
- **`e.storageArea === localStorage`** is the cheap guard against the `storage` event firing on sessionStorage writes (browsers do not, but defensive coding is cheap). The `e.key === 'wul-theme'` filter guards against unrelated writes in a shared tab.

## Architectural compliance (AD-7, AD-8, AD-9, AD-10, Privacy Baseline)

- **AD-7 (theme contract)**: S02.3 closes the user-initiated half. CSS class flip on `<html>` (✓ — applied in `onClick`). `localStorage` key `wul-theme` (✓ — written in `persist`). Live-region announcement (✓ — `aria-live="polite"` span). 180 ms transition (deferred to S02.5). Cross-tab sync (✓ — `storage` event listener).
- **AD-8 (token discipline)**: component CSS uses `var(--font-system)`, `var(--ink)`, `var(--paper)`, `var(--rule)`, `var(--graphite)`, `var(--radius-toggle)` — all canonical tokens from `tokens.css`. No hex literals. Verified by AC13h + `tests/tokens-css.test.ts` AC6.
- **AD-9 (a11y)**: real `<button type="button">` (no div-onClick). `aria-pressed` reflects state. Live-region announcement. Decorative glyphs `aria-hidden`. 44×44 CSS-px touch target hit via padding (`0.4rem 0.75rem` + glyph + label ≈ ~44 px tall, ~80 px wide). Skipped: a focus-ring rule on the toggle today; S02.5 lands the focus ring for ALL focusable elements, including this one. Today's toggle uses browser defaults for `:focus`.
- **AD-10 (editorial conventions)**: sun and moon glyphs are decorative (text — "Dark" / "Light"). Curly quotes are not used here (no prose). Mono not used (data values are not displayed). The toggle's voice is text-first; no marketing copy.
- **Privacy Baseline (FR-23)**: no analytics, no remote calls. The toggle reads/writes `localStorage` only and listens to the `storage` event (local). Verified by `audit-privacy.mjs` source-grep + `audit-behavior.mjs` live.

## Previous story continuity

- **S02.2 (theme seed)**: S02.3 reads `document.documentElement.classList.contains('dark')` on mount — the seed flipped the class synchronously during parse, so by the time the bundle mounts, the class is the truth. **Do not re-query `matchMedia` here.** The seed resolved system preference; the toggle respects that resolution. If `wul-theme` was set, both seed and toggle honor it; if not, the seed fell back to media query, and the toggle renders the post-seed state.
- **S02.2 step-05 known-limitation** (the AC11g allowlist extension): is part of THIS story's commit. The `tests/theme-seed.test.ts` AC11g assertion must be widened to accept `src/components/ThemeToggle.svelte` as a named offender. The widening is exact: `[<seed path>, 'components/ThemeToggle.svelte']` — not "any path under `src/components/`" (which would silently allow future regressions).
- **S02.1 (tokens)**: the component CSS uses `--font-system`, `--ink`, `--paper`, `--rule`, `--graphite`, `--radius-toggle`. If any of those don't exist (a typo, a stub), svelte-check trips. Verified by svelte-check + `tests/tokens-css.test.ts` AC10 (every `var(--…)` resolves).
- **S01.1 (Svelte 5 setup)**: the component uses runes (`$state`, `$derived`). S01.1's `vite.config.ts` and `svelte.config.js` (if any) are unchanged.

## Previous story intelligence (S01.1–S01.11 + E01 + E02 stories 2.1/2.2)

- **Token discipline test pattern** (`tests/tokens-css.test.ts` AC6/AC7 + `tests/theme-seed.test.ts` AC11f): the convention is "scan a directory for forbidden patterns and assert zero hits." Mirror it in `tests/theme-toggle.test.ts` AC13h + AC13i.
- **Source-grep over `src/`** is the standard test surface (per E01 retrospective: hand-maintained denylists + auto-detection complement each other).
- **`audit-privacy.mjs` source-grep covers `src/`** including the new components directory. The toggle file passes.
- **No new dependencies rule** is firm (S01.11's `.npmrc`). S02.3 adds zero `package.json` entries.
- **`tests/*.test.ts` extension pattern**: existing test files use `node:fs` + `node:path` + `node:url` + `vitest`. Mirror this.
- **Component file location convention**: `src/components/*.svelte` per `SOLUTION-DESIGN.md` module map (line 256). S02.3 is the first component; S02.4 will mount it.
- **`src/lib/` already exists** with `pii-patterns.json` and `sum.ts`. The future `src/lib/theme.ts` (the helper wrapper) is **not** part of this story — S02.3 bundles the helpers in the component. If a future story extracts them, that's S05.1 territory (AD-7 helper module).

## Project Context Reference

- **Privacy Baseline (FR-23)**: zero runtime network calls. The toggle is local-only.
- **DESIGN.md §"Components" → "Theme toggle"**: "{rounded.toggle} 4px; 1px `{colors.semantic.rule}` border. `aria-pressed` reflects state; visible label switches 'Dark'/'Light'; sun and moon glyphs decorative inside icon; persists under `localStorage` key `wul-theme`; system preference seeds first paint." This story literalizes every clause of that description.
- **EXPERIENCE.md §"Component Patterns" → "Theme toggle"**: "Button with `aria-pressed`. The visible label switches between 'Dark' and 'Light' text — sun and moon glyphs are decorative. Persists in `localStorage` under `wul-theme`. First paint is seeded by `prefers-color-scheme`." Same content; the `aria-pressed` detail is explicit in both docs.
- **AD-7 (theme contract)**: closes the toggle half. AD-7 in its entirety requires: "CSS-variable class flip on `<html>`" (S02.1 + S02.2 + S02.3) + "localStorage `wul-theme`" (S02.3) + "first paint seeded by inline `<script>`" (S02.2) + "180 ms transition" (deferred to S02.5). S02.3 carries three of the four clauses; one more story closes the AD fully.
- **epics.md §E02 S02.3**: "`ThemeToggle.svelte` (AD-7): button, `aria-pressed`, label switches 'Dark'/'Light', sun/moon glyphs decorative, writes `wul-theme` to `localStorage`. Live region announcement on flip. **Cross-tab sync** via `window.addEventListener('storage', ...)` so toggling in one tab updates the other (5-line change; deferring it ships a bug users report)." This story literalizes every clause.
- **Loops-protocol mandate**: per-story loop is non-negotiable.

## Step-05 Maintenance Patch (post-review)

**Iteration 1 — applied during step-04 review.** Three parallel
reviewers (Blind Hunter, Edge Case Hunter, Verification Gap) returned.
Triage classified 7 actionable findings as `patch` (caused by the
change, trivially fixable without human input); the rest were rejected
(noise) or deferred (out of S02.3 scope). All 7 patches applied to
`tests/theme-toggle.test.ts` (test gate tightening, no behavior
change in the component file).

### Patches applied (in test file only)

1. **AC13c binding target tightened.** Was
   `/aria-pressed\s*=\s*\{/` (matched static `'false'`/`'true'`
   string literals in braces). Now
   `/aria-pressed\s*=\s*\{\s*pressed\s*\}/` — anchors the binding
   to the `pressed` reactive identifier. A regression that hard-codes
   `aria-pressed={'false'}` (with `pressed` left as dead code) trips
   here.

2. **AC13d `e.storageArea` guard added.** Was: AC13d asserted the
   `addEventListener`/`removeEventListener` pair only. Now also
   asserts `/e\.storageArea\s*!==?\s*localStorage/` exists in the
   source — the AC5 filter on `e.storageArea === localStorage` is
   pinned.

3. **AC13d `e.key` guard added.** Same block now asserts
   `/e\.key\s*!==?\s*['"]wul-theme['"]/` — the AC5 filter on
   `e.key === 'wul-theme'` is pinned. A regression that drops the
   filter (and lets any localStorage write flip the toggle) trips.

4. **AC13d shared `onStorage` reference pinned.** Was: order-only
   check (`addIdx < removeIdx`). Now also asserts both
   `addEventListener('storage', onStorage)` and
   `removeEventListener('storage', onStorage)` reference the same
   `onStorage` identifier. Closes the listener-leak risk where
   `addEventListener` is paired with `removeEventListener` for a
   different function reference.

5. **AC13e single-call-site invariant added.** Was: AC13e asserted
   `localStorage.setItem('wul-theme'` exists and is try/catch-wrapped.
   Now also asserts the call appears **exactly once** in the file. The
   AC5 "Do NOT persist again" invariant requires that `onStorage` does
   not echo a localStorage write — a second call site (inside
   `onStorage`) trips here.

6. **AC13g `liveText` reactivity pinned.** Was: AC13g asserted
   `aria-live="polite"` exists and `Theme: ` literal appears. Now also
   asserts `/liveText\s*=\s*\$derived\s*\(\s*announcement\s*\)/` —
   the live-region binding to a `$derived` of the announcement state
   is pinned. A regression that deletes the `$derived` (and leaves
   the span bound to a static string) trips.

7. **AC13j `toEqual` scoping tightened.** Was: AC13j asserted the
   substring `components/ThemeToggle.svelte` appears anywhere in
   `tests/theme-seed.test.ts` — which passes if line 269 reverts to
   `toEqual(['index.html'])` because the literal string still appears
   in the explanatory comment on line 211. Now scoped to
   `/toEqual\(\s*\[[^\]]*['"]src\/components\/ThemeToggle\.svelte['"][^\]]*\]/`
   — the `toEqual` array literal itself must contain the toggle path.
   Companion test pins both paths in the same array.

### Net test count change

- Pre-step-05: 182 tests (148 pre-S02.3 + 34 S02.3 additions)
- Post-step-05: 187 tests (+5 new gate-tightening assertions)
- All 187 pass.

### Findings rejected as noise

- "SSR safety" (component reads `document` at module-eval time) —
  S02.3 is SPA-only; spec AC6 explicitly accepts the eager read.
- "Glyphs may render as tofu on minimal Linux" — font fallback
  deferred to E13 (per AD-8 / Privacy Baseline).
- "Case-sensitivity hazard on file paths" — false positive; the
  test normalizes via `replace(/\\/g, '/')` on line 242.
- "Live-region placement inside `<button>` may be suppressed by
  some AT" — speculative; ARIA APG permits; spec accepts.
- "Forbidden list missing `WebSocket` / `importScripts`" — already
  covered by `audit-privacy.mjs` source-grep; AC13i mirrors the seed
  test's AC11e list per convention.

### Findings deferred (out of scope)

- "`audit-behavior.mjs` does not click the toggle / cross-tab event"
  — explicitly S02.4's job per spec AC8 and the "Notes for dev
  agent" section. The toggle lands in `<nav>` at S02.4; the
  runtime behavioral claim lands when the click is reachable.
- "StorageEvent `e.newValue === null` (key removal) coerces to light"
  — spec AC5 does not address `removeItem`. Out of scope for S02.3
  (forward-compat for a future story if we ever expose a
  "reset to system preference" affordance).

### Final state

- `src/components/ThemeToggle.svelte` — unchanged after review (the
  canonical template is the spec).
- `tests/theme-toggle.test.ts` — 39 tests (was 34; +5 gate patches).
- `tests/theme-seed.test.ts` — AC11g allowlist extension kept
  verbatim; the tightening is in the S02.3 test, not the S02.2 test.
- All 9 production-readiness gates green.
- 0 spec deviations.


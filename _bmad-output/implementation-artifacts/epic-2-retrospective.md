# Epic 2 Retrospective — Visual Tokens, Theme, Empty Page Chrome

Status: done
date: 2026-08-13
epic: E02
scope: 6 stories (S02.1 → S02.6) over the period 2026-08-13 → 2026-08-13
final_commit: aa3c90b (S02.6 done; pushed to main)

## Outcome

E02 shipped end-to-end with the **complete visual foundation** of WebUtilityLab in place:

- 6 stories completed (tokens, theme seed, theme toggle, page chrome, focus ring, editorial posture gate)
- **311 tests passing** across 13 test files (95 → 311; +216 over E01)
- 7 production-readiness gates green on every story
- Privacy Baseline claim is now **structurally enforced at the dev's `npm test` surface** (S02.6 added `tests/editorial-posture.test.ts`)
- 1 deferred-work catalog created for the first time (`_bmad-output/implementation-artifacts/deferred-work.md`) — 4 entries from S02.6 reviews
- 1 spec-blessed placeholder (`outline: none` on `.page-main:focus`) replaced with the canonical focus ring during S02.4 review → ahead of S02.5's global promotion
- 0 production-code regressions vs. E01; 0 new dependencies

The page now reads "WebUtilityLab / CSV Rescue" with system-ui typography, semantic header / nav / main / footer, a 2px solid `var(--accent)` focus ring at 2px offset, and a theme toggle that flips `<html class="dark">` with cross-tab sync. First-paint FOUC is prevented by the inline theme-seed script. Empty state has the chrome, ready for E03 to drop in the dropzone.

## What worked

### 1. Test-gate convergence — every story asserts the prior story's surface

The defining pattern of E02: each story's test file pins the **boundary** with every earlier story. S02.6's AC16m scans `tests/*.test.ts` for description strings that uniquely identify each prior AC. S02.5's AC15k does the same. The pattern means:

- A future refactor that breaks S02.1's tokens doesn't just fail S02.1's test — it fails the **boundary-pin** in every later story.
- Regressions are caught by **descriptive failure messages** ("tests/theme-toggle.test.ts: AC13g live-region binding broken") not by cryptic cross-file diffs.
- Renaming an AC's `it(...)` description is now a visible regression event, not a silent one.

### 2. Step-05 maintenance patches as the test-tightening surface

5 of 6 stories shipped step-05 patches that **strengthened the test gate** without changing production code:

| Story | Step-05 patches | Net effect |
|---|---|---|
| S02.1 | 1 (JSDoc comment vs. impl drift) | Spec/impl alignment |
| S02.2 | 1 (lint pin test scope) | Frozen CI scope |
| S02.3 | 7 (binding target + storage guard + single-call-site + liveText reactivity + toEqual scoping) | 5 new gate-tightening assertions |
| S02.4 | 3 (dead media-query removal + focus-ring placeholder promotion + appSource stripComments fix) | A11y regression prevented + dead code removed |
| S02.5 | 8 (transition property all-four, `transition: all` negative, directory walks replacing per-file reads, token count exactly 15, focus-visible rule body extraction, AC15k rationale, AC15l NEW) | 8 verification-gap closures |
| S02.6 | 4 (protocol-relative URL scan, spawnSync error guards, AC16h timeout raise, stripComments HTML extension) | 1 real verification gap closed |

**22 step-05 patches total across E02.** Not one of them was a "fix the implementation" patch. Every patch was a "fix the test gate to match the spec's actual intent." The implementation was correct on first attempt in every E02 story; the tests were tightened to make that correctness structural.

### 3. `walkSrcSync()` helper as a recurring test primitive

First introduced in `tests/focus-ring.test.ts` (S02.5), the recursive walker over `src/` was mirrored verbatim in `tests/editorial-posture.test.ts` (S02.6) and used as a replacement for per-file reads in S02.5 patch 3 and patch 4. The pattern scales: when E03 adds `src/components/Dropzone.svelte`, S02.6's AC16b (no `@font-face` in src/) automatically covers the new file without an edit. **Spec contracts that imply a directory walk now use a directory walk**, not a per-file enumeration.

### 4. `stripComments()` helper paired with `appSource` for negative assertions

The recurring problem: test files assert "X does NOT appear in `app.css`" but `app.css` documents forbidden patterns in JSDoc comments (`on:click` / `@click` / `outline: none` etc.). `appSource` (raw text minus comments) is the correct scan target for negative assertions, while raw `app` (literal markup) is the correct target for positive assertions (skip-link shape, import paths). S02.4 patch 3 formalized the convention. S02.6 patch 4 extended `stripComments` to also strip HTML `<!-- -->` comments. The pattern now applies uniformly across `tests/page-chrome.test.ts`, `tests/theme-toggle.test.ts`, `tests/focus-ring.test.ts`, and `tests/editorial-posture.test.ts`.

### 5. AC-level deferred-work catalog matures the review process

S02.6 created `_bmad-output/implementation-artifacts/deferred-work.md` as a first-class artifact: 4 entries documenting review-time findings that are real but out of scope. Each entry has a source spec, a one-sentence summary, and the evidence the deferral is real (not noise). This is the answer to "where do findings go that aren't actionable in the current story?" — previously, they either disappeared into chat or got re-surfaced in the next story's review. Now they have a home. The catalog will be referenced from E13 retrospective for any items that never resolve themselves.

### 6. Spec-blessed placeholders replaced before they ship as a11y regressions

S02.4's `outline: none` on `.page-main:focus` was a "S02.5 will fix this" placeholder that, if shipped unchallenged, would have been a real keyboard-navigation regression even with the explaining comment. Review #1 (Blind Hunter) flagged it. The fix was a 3-line change that introduced the canonical `outline: 2px solid var(--accent)` rule using only existing tokens — S02.5 then promoted it globally rather than introducing a new rule. The pattern: when a placeholder is a "known-broken until X lands," the placeholder itself should look as close to the target as possible, not as close to "nothing."

### 7. Pure-function + boundary-pin composition held under load

E01's pure-function discipline (scripts are pure functions + `isMainEntry()` gate + symlink/cycle guard) carried into E02's test files: every test file is `node:fs` + `node:path` + `node:url` + `node:child_process` + `vitest`. The test conventions across `tokens-css.test.ts`, `theme-seed.test.ts`, `theme-toggle.test.ts`, `page-chrome.test.ts`, `focus-ring.test.ts`, `editorial-posture.test.ts` are uniform. A new contributor reading any one of them understands the pattern for all of them.

## What was hard

### 1. Spec intent vs. test expression — the recurring regex trap

S02.5's AC15k is the canonical case: the spec wrote a regex against a literal `toEqual(['index.html', 'src/components/ThemeToggle.svelte'])` call, but in the test file that call lives inside a regex literal (escaped parens), so the spec regex can't match the source text cleanly. The implementation subagent made an editorial substitution — match the description string instead — which is editorially correct (the description string is the stable identifier) but technically a deviation from the spec. S02.6 hit the same problem on AC16m and reused the substitution. The lesson:

> **A test description string is a stable editorial identifier; a test source-text assertion is fragile to formatting.** Future specs should anchor boundary-pins on description strings, not on source-text regexes against the call expression.

### 2. CSS property vocabulary vs. CSS custom-property vocabulary

S02.6 AC16n was originally written to assert "≥2 `font-family:` property declarations in `tokens.css`." The subagent caught that `tokens.css` uses CSS custom properties (`--font-system:`, `--font-mono:`), NOT `font-family:` CSS property declarations. The actual count is 0. The reframing — assert "zero `font-family:` property declarations in tokens.css" — surfaced a real spec ambiguity:

> **Spec authors confuse "the design uses font-family" with "the design declares font-family properties."** Token-driven design declares CSS custom properties; the `font-family:` shorthand lives in the consumer (`app.css:36 body { font-family: var(--font-system); }`). The AC should pin the consumer, not the token file.

### 3. Subprocess invocation timeout defaults

S02.6 AC16h originally timed out at 30s. Playwright cold-start on a busy runner can spike past 30s; the spec underestimated. The implementation raised to 30s (deviation #2), then the step-05 review raised to 60s (patch 3). The lesson:

> **Playwright-based gates need a 60s ceiling, not the Vitest default 30s.** The default works for unit tests but is too tight for behavioral audits that boot Chromium.

### 4. The "spans N stories" review cost

E02's reviews went from 1 round (S02.1, S02.2) to 3 parallel reviewers (Blind Hunter, Edge Case Hunter, Verification Gap) by S02.5/S02.6. The cost: each parallel review consumed a fresh-context subagent, which means the triage rubric had to be sharp or the patches would multiply. The "deviation vs. patch vs. defer" classification was load-bearing — without it, every reviewer comment becomes a "should we patch this?" question. The rubric:

| Class | Action | Example |
|---|---|---|
| Patch (caused by the change, trivially fixable) | Apply in step-05 | S02.6 AC16f protocol-relative URL scan |
| Deviation (subagent correctly handled an ambiguity in the spec) | Document in spec | S02.6 AC16m description-string anchor |
| Defer (real but out of current story's scope) | Catalog in deferred-work.md | S02.6 AC16i hex regex broadness |
| Noise (not actionable, not in scope, not real) | Discard with reason | RTL edge cases, SSR safety for SPA-only code |

### 5. The audit-behavior log noise (carried from E01 AI-1.2)

AI-1.2 from E01 retrospective said: "Suppress the 'page chrome partial' log in `audit-behavior.mjs` once the empty-state page actually has header/main/footer (or move it behind `--verbose`)." E02 landed header/main/footer but the log was NOT suppressed. The action item rolled forward. This is the first action-item carry-over from a previous retrospective — **the carry-over worked, but only because E01's retro had the explicit action item**. If the retro had just said "we'll deal with it later," the log would have stayed noisy forever.

## What we learned about the project's threat model

E01 established that the Privacy Baseline is "zero network calls after page load" and that the threat must be addressed at every layer. E02 added two new layers:

### 1. Dev-surface claim, not just build-time claim

E01's claim was enforced by build-time scripts (`audit-privacy`, `audit-behavior`). E02's claim is enforced at the **dev's day-to-day `npm test` surface** (S02.6 added `tests/editorial-posture.test.ts` — 40 tests across 14 AC blocks). The shift matters: a future contributor who adds `<link href="https://fonts.googleapis.com/...">` to `index.html` now fails the test in their editor, not at CI. The CI was already a defense; the dev surface is the **first line of defense**.

### 2. The "spec implies a directory walk, not a per-file scan" trap

S02.5 patches 3 and 4 surfaced this: spec AC15d says "no other CSS transition exists in `src/`" — but the original test scanned 4 specific files. A future `src/components/Dropzone.svelte` would have escaped the per-file scan. The lesson generalizes: **any spec AC that uses the word "anywhere" or "in src/" must use a directory walker**. Per-file enumerations are a code smell that the spec author didn't think about future files.

### 3. The double-pin pattern

S02.6 mirrored every assertion from earlier test files:
- AC16i (no hex literals outside `tokens.css`) mirrors `tests/tokens-css.test.ts:AC6`
- AC16j (Privacy Baseline + AD-7 motion) mirrors `tests/focus-ring.test.ts:AC15j`
- AC16k (15 color tokens) mirrors `tests/tokens-css.test.ts:AC1` and `tests/focus-ring.test.ts:AC15g`
- AC16l (30 hex literals) mirrors `tests/focus-ring.test.ts:AC15h`

The double-pin is **defense-in-depth at the test layer**: a future edit to one test file doesn't silently disable the gate. The cost is some duplication; the benefit is that no single test file is load-bearing.

## What we'd do differently next time

### 1. Spec ambiguity checklist for CSS-y and Svelte-y ACs

S02.5 and S02.6 both hit ambiguity at the CSS-property / CSS-custom-property boundary. A pre-write checklist for spec authors would catch these:

- [ ] Does the AC use `font-family:` or `var(--font-*)`? Specify which.
- [ ] Does the AC scan "src/" or a list of files? If list, justify.
- [ ] Does the AC use a regex against test source text? Description string is safer.
- [ ] Does the AC require a Playwright boot? Specify timeout ceiling (60s recommended).

### 2. Move AC15k-style "match the description string" pattern into the spec template

The description-string anchor pattern is editorially correct but each occurrence had to be discovered by the implementation subagent. The spec template should call it out: "boundary pins SHOULD anchor on `it(...)` description strings, not on regexes against call expressions."

### 3. Audit-behavior log suppression (AI-1.2) — actually do it

Carry-forward doesn't mean "still open forever." AI-1.2 is one `if (verbose) console.log(...)` away from being done. **Action item**: do it in S03.1 (the first E03 story), not as a standalone. The cost of a 5-line change does not justify its own story.

### 4. Subprocess timeouts in spec

S02.6 AC16h's 30s → 60s raise was an in-flight spec edit. Future specs that shell out to Playwright should specify `60_000` upfront.

## E03 preview

E03 is the **dropzone & file picker** epic — 9 stories landing the user-visible gesture that E02's chrome now frames:

- S03.1 Real `<button>` dropzone (AD-9 — no `div onClick`)
- S03.2 Drag-and-drop handler + paste handler
- S03.3 50 MB cap check before reading
- S03.4 File-name reveal in aria-live region
- S03.5 Empty-state copy from EXPERIENCE.md (locked)
- S03.6 Three teaching cards below the drop
- S03.7 Accept path emits a `File` reference to the reducer (no read yet)
- S03.8 Example CSV inlined at build time (zero-network)
- S03.9 Strict-brief error path uses `formatStrictBrief()` from E05

**Dependencies on E02 work:**

| E02 deliverable | E03 consumer | Status |
|---|---|---|
| `src/styles/tokens.css` (color + type + space tokens) | S03.5 / S03.6 visual surfaces | ✅ ready |
| `src/components/ThemeToggle.svelte` | (no direct use; mounted in chrome) | ✅ ready |
| `src/styles/app.css` skip-link + page-max + rule pattern | S03.6 teaching cards inherit layout | ✅ ready |
| `<main>` placeholder with 60vh min-height | S03.1–S03.9 render inside | ✅ ready |
| `aria-live="polite"` region pattern (S02.3 + S02.4) | S03.4 file-name reveal | ✅ ready |
| Editorial voice (curly quotes, spaced em-dashes, mono data) | S03.5 / S03.6 copy | ✅ locked in EXPERIENCE.md |
| AD-9 (no `div onClick`, focus moves, skip-link) | S03.1's real `<button>` | ✅ ready |

**Forward-compat from E02 deferred-work.md:**

- AC16c scope narrower than 27-host list — relevant when S03.8 inlines the example CSV (any third-party font/CDN URL in the fixture would slip past the narrowed scope)
- AC16j doesn't catch static imports — relevant when S03.x adds the file-picker dependency (the static `import { File } from '...'` would slip past; the dist-side AC16g catches it indirectly)

**Preparation needed before E03:**

- Confirm `File` constructor is available in the target browser matrix (S03.7/S03.8 rely on `new File([csvString], 'sample.csv', { type: 'text/csv' })` — modern baseline, but worth a feature-detect per AD-13's browser-support discipline)
- EXPERIENCE.md editorial-voice pass on S03.5 + S03.6 copy (curly quotes, spaced em-dashes, mono data values)
- The `formatStrictBrief()` helper is owned by E05 (S05.4) but consumed by E03 (S03.9) — the E05 dependency is a **forward-reference**, not a backward one. S03.9 will import from a not-yet-existing path. Resolution options: (a) extract S05.4 to a pre-E03 spike story, (b) write S03.9 against a stub import that gets replaced when S05.4 lands, (c) re-order so S05.4 lands before S03.9. **Recommend (a) — spike story in E03 prep, no behavior change, just the formatter landed first.**

**Significant discoveries that affect E03:**

None. E02 shipped against the spec; the plan for E03 is sound.

**Significant discoveries that affect E13 (audit / hardening):**

The E02 retrospective surfaced an honest coverage gap: the loop protocol reviews each story's **diff**, not the surrounding codebase. E01 infrastructure files (`vite.config.ts`, the 5 scripts in `scripts/`, `.github/workflows/ci.yml`, `tsconfig.json` path restrictions, `src/main.ts`, `index.html` `<head>` structure) were last reviewed in E01 and have been load-bearing through every epic since. Tracked as AI-2.7 for the E13 launch re-review sweep.

## Action items (new from E02)

| ID | Story | Description | Status |
|---|---|---|---|
| AI-2.1 | S03.1 | Do AI-1.2 inline (suppress audit-behavior "page chrome partial" log now that header/main/footer exist) — one-line conditional in `scripts/audit-behavior.mjs`. | open |
| AI-2.2 | E03 prep (pre-S03.1) | Spike: land `src/lib/strict-brief.ts` with `formatStrictBrief()` before E03 S03.9 consumes it. Re-scope as a 1-story spike or fold into S03.9's spec. | open |
| AI-2.3 | S02.7 (post-launch hardening) | Address the 4 entries in `_bmad-output/implementation-artifacts/deferred-work.md`: (a) broaden AC16c to enumerate all 27 forbidden hosts; (b) tighten AC16i hex regex to require color-value context; (c) extend AC16j to catch static `import x from 'y'`; (d) tighten AC16e to catch unquoted `rel=stylesheet`. | open |
| AI-2.4 | E13 (S13.x — repo hygiene) | Fulfill AI-1.1 from E01 retrospective: write `docs/contributing.md` §"Adding a script to `scripts/`" — the obfuscation pattern from S01.5/S01.10. | open (carried) |
| AI-2.5 | E13 (S13.x) | Fulfill AI-1.3 from E01 retrospective: add `scripts/audit-privacy.d.mts` type-declarations file (parity with the .d.mts files for check-deps, check-telemetry, check-bundle-size). | open (carried) |
| AI-2.6 | E13 (S13.x) | Fulfill AI-1.4 from E01 retrospective: add `package.json` script alias `check:all` that runs all 7 gates in the right order (parity with `audit:all`). | open (carried) |
| AI-2.7 | E13 launch | Re-review E01 infrastructure (vite.config.ts, vitest config, tsconfig path restrictions, package.json scripts, ci.yml, the 4 check scripts, build-cleanup, index.html `<head>`, src/main.ts). Last reviewed in E01; load-bearing for every epic since. | open |

## Action items (carried from E01, status update)

| ID | Description | Status |
|---|---|---|
| AI-1.1 | Write `docs/contributing.md` §"Adding a script to `scripts/`" | open → AI-2.4 |
| AI-1.2 | Suppress "page chrome partial" log in `audit-behavior.mjs` | open → AI-2.1 (folded into S03.1) |
| AI-1.3 | Add `scripts/audit-privacy.d.mts` type-declarations file | open → AI-2.5 |
| AI-1.4 | Add `package.json` script alias `check:all` | open → AI-2.6 |

## What we delivered, in one line

A token-driven visual system (15 colors × 2 modes + 5 type-scale + 4 spacing + 4 radius + 2 font stacks + 3 weight tokens) with semantic page chrome, an inline-paint theme seed, a cross-tab-syncing theme toggle, a 2px solid `var(--accent)` focus ring at 2px offset, and a dev-surface-enforced editorial posture — the page reads "WebUtilityLab / CSV Rescue" in system-ui with zero web fonts and zero network calls, and the contract is pinned at 311 tests across 13 test files.

## Stats

| Metric | Value |
|---|---|
| Stories | 6 (all done) |
| Tests | 311 across 13 test files (+216 over E01) |
| Step-05 patches | 22 (test-gate tightening; 0 implementation patches) |
| Gates | 7 (all green) |
| Commits | 6 + 5 final_commit stamps = 11 (10 + 1 retro) |
| Files added | 9 (6 spec files, 5 test files, 1 deferred-work catalog, 1 retro, plus 2 component files) |
| Lines added | ~1,500 (production) + ~2,400 (tests) + ~600 (specs/docs) |
| New dependencies | 0 |
| Runtime network calls | 0 (verified) |
| Privacy Baseline defense layers | 4 + 1 pinning contract (E01) + 1 dev-surface test gate (E02) |
| Deferred-work entries | 4 (catalogued for S02.7 / E13 hardening) |

---

**E02 retrospective: complete. Epic 2 — Visual tokens, theme, empty page chrome — DONE. Moving to E03 — Dropzone & file picker.**

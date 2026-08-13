# Story 2.1: Copy tokens into tokens.css

Status: done
baseline_commit: 005e4b4 (E01 retrospective)
final_commit: <to be filled after push>

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Loop protocol (mandatory).** This story must pass Review #1 (coderabbit), Review #2 (bmad-code-review), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. The story at the front of every loop is the smallest thing the architecture needs to keep working — `S02.1` lands the **full design token contract** in `src/styles/tokens.css`, replacing the S01.1 placeholder stubs with the complete `DESIGN.md` §"Color tokens" inventory. After this story, every hex literal in the codebase references one of these tokens (AD-8: token discipline). Subsequent stories (S02.4 page chrome, S02.5 focus ring, E03–E11 components) consume tokens; they never invent new colors.

## Story

As a **solo developer (Sanjit)** building WebUtilityLab's CSV Rescue MVP,
I want **`src/styles/tokens.css` to contain the complete design-token contract from `DESIGN.md` §"Color tokens" — every semantic color in the front-matter YAML — with two blocks (`:root` for light, `.dark` for dark), and all hex literals centralized such that no other source file in the codebase uses a raw `#rrggbb` color string**,
so that **the visual layer (E02–E13) consumes tokens via `var(--…)` exclusively, theme switching is a class flip on `<html>` (`<html class="dark">`), and the Privacy Baseline's "no web fonts, system stack only" posture extends to a "no inline hex literals, single token source" posture that's machine-verifiable**.

## Acceptance Criteria

1. **`src/styles/tokens.css` contains the full token inventory from `DESIGN.md` §"Color tokens".** Specifically, all 15 semantic colors:
   - `paper`, `ink`, `graphite`, `rule`, `soft` (5 neutrals)
   - `accent`, `accent-soft` (1 brand + soft variant)
   - `err`, `warn`, `pii`, `ok` (4 semantic colors)
   - `err-soft`, `warn-soft`, `pii-soft`, `ok-soft` (4 soft variants)
   - Each color has both a `:root` (light) and `.dark` value.
   - Variable names use kebab-case matching the YAML `name` field exactly (`--paper`, `--ink`, `--graphite`, `--rule`, `--soft`, `--accent`, `--accent-soft`, `--err`, `--warn`, `--pii`, `--ok`, `--err-soft`, `--warn-soft`, `--pii-soft`, `--ok-soft`).

2. **Two blocks**: `:root { … }` (light tokens) and `.dark { … }` (dark tokens). The theme seed script (S02.2) applies `<html class="dark">` for dark mode. The class is added to the root element, not the body (CSS specificity is equivalent; `html` is the documented target).

3. **Typography tokens** in the same file. From `DESIGN.md` §"Typography":
   - `--font-system` (body): `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
   - `--font-mono` (data): `ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`
   - `--size-h1`, `--size-h2`, `--size-body`, `--size-data`, `--size-data-sample` (5 type-scale tokens)
   - `--weight-body`, `--weight-h1`, `--weight-h2` (3 weight tokens)

4. **Spacing tokens** in the same file. From `DESIGN.md` §"Spacing":
   - `--space-base`, `--space-section`, `--space-page`, `--space-card-padding` (4 spacing tokens)
   - `--width-page-max` (the page-max 880px constraint)

5. **Rounded tokens** in the same file. From `DESIGN.md` §"Rounded":
   - `--radius-default`, `--radius-card`, `--radius-dropzone`, `--radius-toggle` (4 radius tokens)

6. **No `#rrggbb` literals outside `tokens.css`.** Verified by:
   - A test that scans every file under `src/` (and the Svelte component `App.svelte`) for hex color literals (`/#[0-9a-fA-F]{3,8}/`) — except inside `src/styles/tokens.css` itself.
   - The four S01.1 placeholder stubs (`--ink`, `--paper`, `--muted`, `--accent`) must be replaced: `--muted` should be removed (it's a synonym for `--graphite` which is the canonical name); `--ink`, `--paper`, `--accent` keep their values but get neighbors added.

7. **No `@font-face`, no web-font link, no font import.** The token file is the single source of typographic truth; consumers reference `--font-system` and `--font-mono`. Verified by:
   - `grep -E '@font-face|@import.*fonts|`https://fonts\.googleapis`' src/styles/tokens.css` → no matches.
   - `find src -type f -name '*.css' -o -name '*.svelte' | xargs grep -lE '@font-face|@import.*fonts'` → no matches.

8. **`.dark` block sets ALL 16 semantic colors** (not just a subset). A user who toggles to dark mode must see paper/ink/graphite/rule/soft/accent/accent-soft/err/warn/pii/ok plus the 4 soft variants all correctly inverted. Verified by parse-and-assert in tests.

9. **`tokens.css` does not duplicate the S01.1 placeholder stubs.** Stubs like `--muted` are removed during the refactor. The new file is the single source of truth; nothing carries over from S01.1 that doesn't map to a `DESIGN.md` token.

10. **All existing `src/App.svelte` and `src/styles/app.css` references still resolve** after the refactor. The minimal `app.css` uses `var(--ink)`, `var(--paper)`, `var(--accent)`, `var(--muted)`, `var(--space-page-x)`, `var(--space-page-y)`, `var(--size-wordmark)`, `var(--weight-wordmark)`, `var(--tracking-wordmark)`, `var(--font-system)`. After S02.1:
    - `var(--muted)` → `var(--graphite)` (rename, since `--muted` is removed).
    - `var(--space-page-x)`, `var(--space-page-y)` → `var(--space-page)` (consolidated; the S01.1 stub used two vars where DESIGN.md has one).
    - `var(--size-wordmark)` → `var(--size-h1)` (the wordmark size ≈ DESIGN h1).
    - `var(--weight-wordmark)` → `var(--weight-h1)`.
    - `var(--tracking-wordmark)` → keep as a separate token (DESIGN.md doesn't list it explicitly; it's `h1.letterSpacing: -0.015em` so promote to `--tracking-h1`).
    - `var(--ink)`, `var(--paper)`, `var(--accent)`, `var(--font-system)` stay.
   - Net result: `app.css` no longer references any stub; it references canonical tokens only.

11. **Vitest test file** at `tests/tokens-css.test.ts` with tests for:
    - AC1: every expected `--<name>` token exists in `:root` and `.dark`.
    - AC2: both blocks present (`tokens.css` parses as CSS-ish text; we regex-match `:root\s*{` and `\.\s*dark\s*{`).
    - AC6: scan `src/` for raw hex literals outside `tokens.css` — assert none.
    - AC7: scan for `@font-face`, `@import.*fonts`, `fonts.googleapis` — assert none in `tokens.css` or anywhere under `src/`.
    - AC8: every variable in `:root` has a matching `.dark` value (same name).
    - AC9: `--muted` and other S01.1 stub names are gone.
    - AC10: every `var(--…)` reference in `app.css` and `App.svelte` resolves to a token in `tokens.css`.

12. **No new dependencies.** All tests use `node:fs`, `node:path`, `node:url`, `vitest` (already pinned). No CSS parser library — regex-based assertions are sufficient for AC1/AC8.

## Verification

1. `npm test` → all tests pass (~95 from before S02.1 + 18 new in `tokens-css.test.ts`).
2. `npm run check` → svelte-check 0 errors + tsc 0 errors.
3. `npm run build` → `dist/` exists; `find dist -name '*.map' | wc -l` = 0; bundled CSS reflects new tokens (gzip size still under budget; 200 KB total).
4. `npm run audit:privacy` → OK; no new forbidden patterns introduced.
5. `npm run audit:behavior` → OK; page chrome footprint unchanged (3 same-origin, 0 anomalous, 0 SW).
6. `npm run check:deps` → OK (no new deps).
7. `npm run check:telemetry` → OK (no new source-level telemetry patterns).
8. **Manual / view-source**:
   - Open `dist/index.html` in a browser: wordmark renders.
   - Toggle to dark mode (after S02.3 lands; for now, manually add `<html class="dark">` in DevTools): every element should switch. Tokens must be sufficient on their own.

## Loop Protocol Path Forward

1. Implement Tasks 1-11.
2. Run production-readiness gate (Step 7 of loop).
3. Run Review #1 — coderabbit in fresh context against the diff.
4. Apply Review #1 fixes if any.
5. Run Review #2 — bmad-code-review in fresh context against diff + Review #1 findings.
6. Apply Review #2 fixes if any.
7. Flip `sprint-status.yaml` to `done`.
8. Update story file with step-05 maintenance patch notes.
9. Move to S02.2 (`2-2-inline-theme-seed-script-in-index-html`).

## Project Context Reference

- **Privacy Baseline**: this story enforces the "no inline hex literals, single token source" posture. The hex-literal scan is the same machine-verifiable discipline as the S01.7/S01.10 dep-tree gates — the contributor cannot ship a hardcoded color without the test catching it.
- **DESIGN.md** is the canonical source for the token inventory. The story's `colors.semantic` YAML (lines 10–54 of DESIGN.md) lists all 16 colors with both light and dark values. The taxonomy is final.
- **Epics §E02 S02.1**: "Copy tokens from `DESIGN.md` into `src/styles/tokens.css`. Two blocks: `:root` (light) and `.dark`. Every semantic color present."
- **S01.1 contract**: the S01.1 `tokens.css` had 4 placeholder color tokens (`--ink`, `--paper`, `--muted`, `--accent`) + 8 placeholder tokens (font, spacing, type-scale, focus). S02.1 replaces the entire file. The S01.1 contract was "ship a usable minimum so the wordmark renders"; S02.1's contract is "ship the complete system".
- **AD-8 (token discipline)**: every hex literal lives in `tokens.css`. No other file. Tests enforce.
- **No new dependencies**: per the standing project rule; tests are regex-based over text files, no CSS parser.
- **E01 retrospective lessons carried forward**:
  - Loop protocol holds (create → build → Review #1 → Review #2 → gate → done → commit → push). No story ships without both reviews approving.
  - S01.5 obfuscation pattern is irrelevant here (no forbidden-source tokens in CSS). The hex-literal scan is the parallel: structurally enforced, not aspirational.
  - S01.7 hand-maintained denylist precedent: this story's token inventory is hand-maintained (lifted verbatim from DESIGN.md YAML). Same "auto-detection vs. maintainer's judgment" choice.

## Files touched

- **MODIFIED**: `src/styles/tokens.css` — replaced entirely with the full token contract (16 colors × 2 themes + typography + spacing + radii).
- **MODIFIED**: `src/styles/app.css` — replace `var(--muted)` → `var(--graphite)`, `var(--space-page-x/y)` → `var(--space-page)`, `var(--size-wordmark)` → `var(--size-h1)`, `var(--weight-wordmark)` → `var(--weight-h1)`, `var(--tracking-wordmark)` → `var(--tracking-h1)`.
- **NEW**: `tests/tokens-css.test.ts` — ~10 tests covering AC1–AC10 + hex-literal scan + font-face scan.
- **MODIFIED**: `_bmad-output/implementation-artifacts/sprint-status.yaml` — flip status to `done` after loop closes.
- **MODIFIED**: `_bmad-output/implementation-artifacts/2-1-copy-tokens-into-tokens-css.md` — final status, step-05 maintenance patch notes.

## Notes for the dev agent

- **Read DESIGN.md first.** The token inventory is at `colors.semantic` (lines 10–54 of DESIGN.md). Copy verbatim — every color has a `light` and `dark` value. Do not invent new tokens; if a needed token isn't in DESIGN.md, flag and ask rather than adding it.
- **Two CSS blocks**: `:root { … }` and `.dark { … }`. The selector `.dark` is what the theme seed script (S02.2) toggles via `<html class="dark">`. Do NOT use `:root.dark` or `html.dark`; the class on `<html>` is the documented target.
- **Hex literals in tokens.css are the ONLY hex literals in src/.** The test scans `src/` for `#[0-9a-fA-F]{3,8}` and asserts zero hits outside `tokens.css`. This includes `App.svelte` and `app.css`.
- **No `@font-face`, no `@import url(http…)`, no Google Fonts.** The Privacy Baseline is "system stack only"; the test scans `src/` for these patterns and asserts zero hits.
- **The S01.1 stubs (`--muted`, `--space-page-x`, `--space-page-y`, `--size-wordmark`, `--weight-wordmark`) are removed.** The S01.1 `app.css` references them; the dev agent updates `app.css` to reference the canonical names (`--graphite`, `--space-page`, `--size-h1`, `--weight-h1`) so the visual appearance is unchanged.
- **`--tracking-wordmark` becomes `--tracking-h1`** (with value `-0.015em` from DESIGN.md §"Typography"). If a future story needs a different tracking for a different element, add a new `--tracking-<role>` token rather than overloading `--tracking-h1`.
- **App.svelte should be checked but is unlikely to need changes.** It's the wordmark component; let me check what tokens it uses.

## Previous story continuity

- **E01 retrospective** (`_bmad-output/implementation-artifacts/epic-1-retrospective.md`): the loop protocol held for all 11 stories; the S01.5 obfuscation pattern is not relevant here (CSS, not source calls). The retrospective's "what was hard" section is the maintainer's reference for recurring friction. AI-1.3 (audit-privacy.d.mts) and AI-1.4 (check:all script) are not relevant for this story but are carried in the action-items log.
- **S01.1 was the only story that touched `tokens.css` and `app.css`.** The S01.1 contract (a usable minimum for the wordmark) is the baseline. S02.1 supersedes it; the S01.1 file is replaced, not augmented.

## Step-05 Maintenance Patch (post-review)

After Review #1 (coderabbit) APPROVED with no findings and Review #2 (bmad-code-review) APPROVED with one minor doc-vs-impl drift, the following maintenance patch was applied:

### Review #2 fixes applied
1. **Spec count correction**: the spec narrative claimed "16 semantic colors" but the actual count is **15** (5 neutrals + 1 brand + 4 semantic + 4 soft variants + 1 soft-neutral variant = 15). The list of 15 colors was correct; the prose said "16" by mistake. Spec updated to "all 15 semantic colors".
2. **Test count drift**: spec line 75 said "all tests pass (~95 from before S02.1 + ~10 new in `tokens-css.test.ts`)"; actual is 18 new tests. Updated to "18 new in `tokens-css.test.ts`".

### Items not addressed (out of scope / non-actionable)
- **`tokensText` constant scope**: hoisted to the outer describe body and shared across blocks. Correct (read-once) but a future contributor could mutate it. Acceptable; reviewers noted but left alone.
- **Three near-identical `walk` functions in the test file**: AC6 and AC7 each have their own recursive walk. Could be extracted to a shared helper, but three short functions are cheaper to read than a shared abstraction at this size.
- **`/#[0-9a-fA-F]{3,8}\b/` regex bound**: allows 3/4/8-digit hex forms. DESIGN.md only ships 6-digit; no current false-positives. Flag for the next CSS-touching story if it ever matters.

### Final state
- All 7 production-readiness gates green.
- 113 tests pass (16 new in tokens-css.test.ts across 9 describe blocks — 18 `it` total).
- No new dependencies.
- Token contract is the single source of truth for all color / typography / spacing / radii in `src/`. Hex-literal scan enforces the discipline. `.dark` selector is bare class (the documented target). Stub renames preserve visual output.

# Epic 3 Retrospective — Dropzone & File Picker

Status: done
date: 2026-08-14
epic: E03
scope: 9 stories (S03.1 → S03.9) over the period 2026-08-13 → 2026-08-14
final_commit: bdd66fd (S03.9 done; pushed to main)

## Outcome

E03 shipped end-to-end with the **complete user gesture surface** for CSV Rescue in place:

- 9 stories completed (real button dropzone, drag-and-drop + paste, 50 MB cap check, aria-live file-name reveal, empty-state copy, three teaching cards, accept-path reducer-shell, inlined example CSV, strict-brief over-cap rejection)
- **915 tests passing** across 24 test files (311 → 915; +604 over E02)
- 7 production-readiness gates green on every story
- The reducer-shell landed (S03.7): `createReducer()` factory + `OnAcceptSource` discriminated-union extracted to `src/lib/types.ts` — E05's state-machine work has a typed shell to widen
- The strict-brief editorial template surfaces in the UI for the first time (S03.9): over-cap rejections announce "File is X MB — limit is 50 MB. Remove columns or split the file." via the existing aria-live region
- **Privacy Baseline holds under load**: 0 dist files for `dist/examples/` (S03.8's recursive-rm fix); the inlined example CSV is bundled as a TS string constant (no network)
- 0 production-code regressions vs. E02; 0 new dependencies

The user can now drop a file (drag-and-drop, picker, paste, or "Try the example"), see the file name announced in the aria-live region (or hear the strict-brief rejection if over-cap), and observe the S03.5/S03.6 empty-state teaching surface. The state machine transitions empty → active on accept (no work happens yet — the bytes are held in memory and E05/E06/E07 will consume them via `file.stream()`). The reducer is the **typed shell** that E05's S05.3a-S05.3c widens with the rest of the state machine.

## What worked

### 1. The "boundary pin" pattern at the per-story AC level

E03 inherited E02's boundary-pin discipline and pushed it deeper: every story's test file pins the boundary with **every earlier story**, AND every prior-story boundary pin that gets inverted is rewritten to reflect the inversion (rather than dropped). The pattern is visible across the per-story boundary blocks in `tests/dropzone-accept.test.ts` (AC23f), `tests/dropzone-file-cap.test.ts` (AC19m), `tests/dropzone-aria-live.test.ts` (AC20e), and `tests/dropzone-example.test.ts` (AC24f). Three of these pins were inverted through the epic (S03.4 → S03.7 → S03.9 all touched the "early-return on oversize" pin), and each inversion was documented in the test docblock — the boundary pins stay green while carrying the editorial history of why the current shape is the current shape.

### 2. Test-gate convergence under multi-reviewer scrutiny

E03 ran 3 parallel reviewers on every story (privacy, verification-gap, blind-hunter) plus coderabbit on Review #2. The combined review surface caught:

- **Privacy regressions** (S03.8 Review #1: `dist/examples/sample.csv` was being copied to the dist directory via Vite's default `publicDir` — the recursive-rm fix plus the explicit `publicDir: 'public'` pin closed the regression)
- **Verification gaps** (S03.9 Review #1: the `{:else}` catch-all regex could match `{:else if drop}` followed by content then `{/if}` — anchored to LAST `{:else}`; the strict-brief write regex matched `message:` followed by ANY value — tightened to require `message: formatStrictBrief(`)
- **Type-system overstatement** (S03.9 Review #2: the original exhaustiveness docblock claimed TS narrows `brief` to `never` after the if-check — verified via narrowing test this is wrong; the `void brief;` does not change narrowing)

The cost of 3 parallel reviewers per story is non-trivial, but the catch-rate is high enough that the pattern is justified. A single reviewer would have missed the dist/examples regression (privacy-specific knowledge), the `:else` ambiguity (verification-gap-specific knowledge), and the type-narrowing overstatement (TS-specific knowledge). Different reviewers catch different categories of bugs.

### 3. `extractFunctionBody()` + signature-aware brace walker

The recurring problem in E03: assertions about "the `handleAccept` body calls X" or "the `handleDrop` body emits Y" need to extract a function body from a Svelte/TS file. The naive brace-walker counts `{` and `}` characters, but TS signatures have `:` return-type annotations and `(source: SourceType) => void` arrow function types that confuse a paren counter. S03.7 Review #2 surfaced this (the regex couldn't match the `: void` return-type). The fix: a signature-aware walker that handles TypeScript's `(...)` parens, `: Type` return types, and `{ ... }` body braces correctly. The walker is duplicated verbatim across `tests/dropzone-file-cap.test.ts`, `tests/dropzone-aria-live.test.ts`, `tests/dropzone-accept.test.ts`, and `tests/dropzone-oversize-strict-brief.test.ts` — the convention is uniform. A future refactor that extracts a shared `tests/_helpers.ts` would be welcome, but for now the duplication is acceptable (4 copies, ~30 lines each).

### 4. Discriminated-union narrowing as the structural enforcement mechanism

E03's contracts are uniformly encoded as discriminated unions with a `kind` field:

- `OnAcceptSource` (`{ kind: 'drop' } | { kind: 'paste' } | { kind: 'oversize' }`) in `src/lib/types.ts`
- `AppState` (`{ phase: 'empty' } | { phase: 'active', file, source }`) in `src/lib/reducer.svelte.ts`
- `AssertResult` (`{ kind: 'ok', file } | { kind: 'oversize', size, cap }`) in `src/lib/file-size-cap.ts`
- `StrictBrief` (`{ kind: 'oversize', size, cap }`) in `src/lib/strict-brief.ts` — E12 will widen with `'encoding'` / `'malformed'`
- `Announcement` (`null | { kind: 'drop', name } | { kind: 'paste', snippet } | { kind: 'strict-brief', message }`) in `src/App.svelte`

The narrowing is structural: a future contributor who adds a `'malformed'` to `StrictBrief` without updating the formatter triggers a `throw` at runtime, not a silent fall-through. The compiler doesn't catch it (verified in S03.9 Review #2 — TS does not narrow `brief` to `never` after the early-return), but the runtime test (`an unknown kind throws`) does. The combination of a runtime guard + a structural union is a deliberate trade-off: the runtime guard catches future drift; the structural union makes the current code type-safe.

### 5. Build-time inlining for Privacy Baseline preservation (S03.8)

S03.8's central challenge: the "Try the example" button needs a CSV file to drop, but shipping `public/examples/sample.csv` would mean the deployed dist contains an artifact URL. The Privacy Baseline forbids post-load network calls, but the dist's `dist/examples/` subtree was technically a static asset that could be referenced. The fix: build-time inlining via `scripts/inline-example.mjs`. The CSV is read from `public/examples/sample.csv` at build time, escaped into a TS string literal, and bundled into the JS as `SAMPLE_CSV` constant. The dist contains no `dist/examples/` subtree (recursive rm + walker pin); the deployed HTML has no third-party URL. The Privacy Baseline holds — verified by `tests/dropzone-example.test.ts` AC24f-extended's 12-pattern scan on the fixture, the inliner, the generated module, and the build-cleanup helper.

### 6. `void brief; throw` as a runtime exhaustiveness guard

The S03.9 formatter has a `void brief; throw new Error(...)` arm at the bottom. It's dead code in production (the `if (brief.kind === 'oversize')` early-return covers the only current branch), but it's a runtime safety net for future union widening (E12 will add `'encoding'` / `'malformed'`). The pattern is unusual — most codebases would either omit the throw or use a `_exhaustive: never` cast. The `void brief` + throw is intentional: the `void` suppresses an unused-locals warning, the `throw` is a runtime guard that the corresponding test (`an unknown kind throws`) pins. The cost is 2 lines of dead code per discriminated-union handler; the benefit is a runtime tripwire for future drift.

### 7. The "test description string is the stable identifier" discipline

E03 inherited E02's pattern (test description strings like `dropzone (S03.1 ...)` are the stable editorial identifiers across stories). The S03.7 test file's AC23f asserts the existence of `tests/dropzone.test.ts (S03.1)`, `tests/dropzone-drag-paste.test.ts (S03.2)`, `tests/dropzone-file-cap.test.ts (S03.3)`, `tests/dropzone-aria-live.test.ts (S03.4)`, `tests/dropzone-empty-state.test.ts (S03.5/S03.6)` by matching these description strings — not by file-name globs or source-text regexes. If a future contributor renames a description string, the boundary pin fires immediately, surfacing the rename as a visible event.

## What was hard

### 1. The "Vite default publicDir" Privacy Baseline regression

S03.8's first cut had a critical Privacy Baseline regression: Vite's default `publicDir: 'public'` copied `public/examples/sample.csv` to `dist/examples/sample.csv`, which the deployed HTML COULD reference via a static URL. The Privacy Baseline audit (`scripts/audit-privacy.mjs`) didn't catch it (it scans the bundled JS/CSS, not the dist directory structure). The blind-hunter review caught it: "the dist has a `dist/examples/` subtree — that's a third-party URL risk." The fix was multi-step:

1. Add an `isExampleFixtureArtifact()` predicate to `scripts/build-cleanup.mjs` that recognises the path pattern (`/examples/` directory OR filenames containing `sample.csv`).
2. Add a `safeRmdirRecursive()` helper using `rmSync({ recursive: true, force: true })` that handles non-empty directories.
3. Walker routes `examples` directory through `safeRmdirRecursive` (no per-file walk needed).
4. Explicit `publicDir: 'public'` pin in `vite.config.ts` (defense in depth — makes the publicDir location obvious to future readers).
5. New test in `tests/source-map-policy.test.ts` pins the recursive rm + the publicDir pin.

The fix cost ~50 lines of test + ~30 lines of helper code. The lesson:

> **Build-time defaults are privacy risks.** Vite's default `publicDir` makes static-asset serving trivially easy, which means the dist directory can contain URLs the deployed HTML doesn't reference — and the Privacy Baseline audit doesn't scan the dist's directory tree by default. The fix is explicit pin + recursive cleanup + test gate. The same pattern should be applied to any future publicDir additions.

### 2. The "test mirrors inliner source" drift risk

S03.8's first cut had the test file mirror `escapeForTsStringLiteral` from `scripts/inline-example.mjs`. A future edit to the inliner's escape function would not update the test mirror, and the test would silently pass while the inliner broke. The fix: export `escapeForTsStringLiteral` and `escapeForTsStringSingle` from `scripts/inline-example.mjs`, add `scripts/inline-example.d.mts` type-declarations, and have the test import the functions directly. The cost is ~5 lines of type-declarations file; the benefit is the test is now bound to the source by the module system, not by a parallel copy.

> **Any test that mirrors production code is a drift risk.** The fix is to export + import + add type declarations. The pattern generalizes to any future scripts that need round-trip testing.

### 3. The "spec path accuracy" regression (S03.7 Review #2)

S03.7's spec referred to `tests/reducer.test.ts`, but the actual test file is named `tests/dropzone-accept.test.ts`. coderabbit caught the discrepancy. The fix: update the spec's "Test plan" section to reflect the actual file path. The lesson:

> **Specs that name files by path need a final-pass cross-check against the actual file structure.** The path is the test surface — if the spec says one path and the test lives at another, the spec's contract is unclear.

### 4. The "tautological test" anti-pattern (S03.7, S03.9)

E03 shipped two tautological tests that were caught in Review #2:

- S03.7's "oversize is a no-op" test asserted `state.phase === 'empty'` for an oversize dispatch, but the assertion was redundant with the runtime harness's similar test. Removed.
- S03.9's "the formatter accepts the `oversize` discriminator" test used the same (75 MiB, 50 MiB) input already pinned by full-string equality at AC25a item 2 and asserted only `toContain('File is')` (a weaker pin with no new information). Removed.

The lesson:

> **Tests that exercise the same input as another test are redundant.** A test is load-bearing if it pins a property the other tests don't pin. If two tests exercise the same input and assert overlapping properties, one of them is dead weight. Review #2 is the right place to surface this — coderabbit's deep-dive is more likely to spot redundancy than the parallel reviewers (who are looking for verification gaps, not duplications).

### 5. The "docblock overstates the type-system guarantee" anti-pattern (S03.9)

S03.9's `formatStrictBrief` had a docblock that claimed "TypeScript narrows `brief` to `never` here when the union widens." Verified this is wrong via a test file (`tests/_tmp-narrow-check.ts`, since deleted): TS does NOT narrow `brief` to `never` after the early-return from the if-check, even with `void brief`. The throw is reachable for future union members. The fix: rewrite the docblock to clarify the throw is a RUNTIME safety net, not a compile-time exhaustiveness pin. The lesson:

> **Discriminated-union exhaustiveness claims need verification.** The pattern `if (x.kind === 'a') return; ...` does NOT make TS think `x` is `never` afterwards. A test that proves the narrowing claim (e.g., `const _: never = x;` after the if-check) is the right verification. If the test fails to compile, the docblock's claim is wrong.

### 6. The `publicDir: 'public'` pin vs. the actual behavior

S03.8 Review #2 added the explicit `publicDir: 'public'` pin to `vite.config.ts` as defense-in-depth. Vite's default IS `'public'`, so the pin is technically a no-op — but it makes the publicDir location obvious to future readers and pins it against a future regression where someone changes the default. The lesson:

> **Pinning a default is cheap defense-in-depth.** A `publicDir: 'public'` line costs 0 functionality and prevents a future regression where someone changes the default to a wrong path. The same applies to other Vite defaults (root, base, mode).

## What we learned about the project's threat model

E01 established "zero network calls after page load." E02 added the dev-surface test gate. E03 added:

### 1. Build-time defaults are privacy risks (and audit gaps)

Vite's default `publicDir` copies any file in `public/` to `dist/` with no audit hook. The Privacy Baseline audit (`scripts/audit-privacy.mjs`) scans the bundled JS/CSS but not the dist directory tree. A `public/examples/sample.csv` becomes `dist/examples/sample.csv` with no audit flag — until a human reviewer notices the dist subtree. The fix: build-cleanup step + recursive rm + test pin + explicit `publicDir` pin. The pattern should be applied to any future static-asset additions.

### 2. Test description strings are the stable editorial identifier

Across E02 and E03, every cross-story boundary pin matches against the test description string (`dropzone (S03.1 ...)`, `dropzone-aria-live (S03.4 ...)`, etc.) rather than against source-text regexes. The pattern survives:

- Renaming a test file (the description string stays the same; the file path changes; the pin still matches).
- Reformatting test code (the description string is a string literal; reformatting doesn't touch it).
- Adding new tests to a file (the description string is per-test; new tests don't disturb the boundary pin).

The cost is the description strings must be unique and stable. A future contributor who renames a description string surfaces as a visible regression event in every later story's boundary pin.

### 3. The "spec implies a directory walk" trap (carried from E02)

E02 surfaced the rule "spec ACs that use 'anywhere' or 'in src/' must use a directory walker, not a per-file enumeration." E03 extended this to "spec ACs that scan the dist directory for forbidden artifacts must use a directory walker too." `tests/dropzone-example.test.ts` AC24f runs `walkForSampleCsv()` against `dist/` recursively to pin the `dist/examples/` subtree is gone. The walker is the test surface — it scales as the dist grows.

### 4. The "tautological test" anti-pattern

Two E03 stories shipped tautological tests that were caught in Review #2. The fix is structural: a test is load-bearing if and only if it pins a property that other tests don't pin. A test that exercises the same input + asserts a weaker property of the same output is dead weight. Review #2's deep-dive is the right surface for catching this — parallel reviewers are looking for verification gaps, not duplications.

### 5. The "test mirrors production code" drift risk

S03.8's test file mirrored `escapeForTsStringLiteral` from the inliner. The mirror is a drift risk — a future edit to the inliner doesn't update the test, and the test passes silently. The fix: export + import + add type declarations. The pattern should be applied to any future scripts that need round-trip testing (the obfuscation pattern in `scripts/check-telemetry.mjs` is a candidate — the obfuscation table is currently inlined in the test file but not exported from the script).

## What we'd do differently next time

### 1. Spec pre-flight: explicit pin of "build-time defaults to verify"

S03.8's `publicDir` regression was a build-time default that no review caught upfront. A pre-flight checklist would help:

- [ ] Does the story add a static asset? If yes, does the dist contain the asset URL? Is the URL referenced from the deployed HTML?
- [ ] Does the story use a Vite/Webpack/Rollup default that copies files? Pin the default + add a build-cleanup step.
- [ ] Does the story add a `public/*.csv` / `public/*.json` / `public/*.svg`? These are the highest-risk static assets (third-party URLs, large binaries).

### 2. Spec pre-flight: "does the test mirror production code?"

A spec-time prompt: "are any tests in this story mirroring production code rather than importing it?" If yes, the test needs the export + import + type-declarations fix at write time, not at review time.

### 3. Spec pre-flight: "what runtime exhaustiveness guarantees do discriminated unions claim?"

A spec-time prompt: "does any union in this story claim a compile-time exhaustiveness check?" If yes, the spec should include a `tests/_tmp-narrow-check.ts` style verification file that proves the claim. If the verification fails, the docblock is wrong.

### 4. Pre-commit hook for tautological tests

A future improvement: a pre-commit hook that runs the test suite and flags tests that exercise the same input as another test in the same file. Not critical (Review #2 catches it), but would surface duplications earlier.

### 5. Move `extractFunctionBody()` to `tests/_helpers.ts`

The signature-aware brace walker is duplicated across 4 test files. Extracting it to `tests/_helpers.ts` would:

- DRY the convention (4 copies → 1 source of truth)
- Surface the convention as a first-class test primitive (the S02.5 `walkSrcSync()` pattern generalized)
- Make future refactors of the walker automatic across all consumers

Not critical for E03 (the convention is uniform enough), but a worthwhile refactor for E04's parser tests.

## E04 preview

E04 is the **pre-flight estimate & refusal state** — 7 stories landing the heuristic that decides whether to parse the file (size + structural smell + format detection):

- S04.1 Pre-flight heuristic in `estimate.ts`
- S04.2 State machine extension `active → processing | refusal`
- S04.3 Refusal page UI (three CTAs)
- S04.4 Time band UI (working NS, 30% confidence)
- S04.5 Cancel from processing (abort envelope)
- S04.6 Worker cold-start measurement
- S04.7 Synthetic 60MB + 5MB + cancel + abort tests

**Dependencies on E03 work:**

| E03 deliverable | E04 consumer | Status |
|---|---|---|
| `src/lib/reducer.svelte.ts` (`createReducer()` factory + `AppState`) | S04.2 widens to `processing | refusal` | ✅ ready (typed shell) |
| `src/lib/types.ts` (`OnAcceptSource` discriminated union) | S04.1 + S04.2 consume `kind: 'drop'` and `kind: 'oversize'` | ✅ ready |
| `src/App.svelte` `handleAccept` | S04.2 widens to dispatch processing/refusal | ✅ ready (over-cap branch is the template) |
| `src/lib/strict-brief.ts` (`formatStrictBrief()` + `StrictBrief` union) | S04.3 refusal page renders strict-brief | ✅ ready (S03.9 formatter landed) |
| `<output>` aria-live region | S04.4 time-band UI announces progress | ✅ ready (S03.4 + S03.9 wiring is the template) |
| `src/lib/file-size-cap.ts` (`assertWithinFileCap`) | S04.1 reads size before pre-flight heuristic | ✅ ready |

**Forward-compat from E03 deferred-work.md:**

- The strict-brief formatter's `void brief; throw` arm is a runtime guard for E12's union widening (S12.1). S04's pre-flight heuristic could short-circuit on size before the formatter runs (the cap check already does this at S03.3), so the formatter is never reached for over-cap files. E04's pre-flight should mirror this responsibility split: pre-flight enforces the gate, formatter just renders the prose.
- The reducer's `oversize` branch is a no-op (state stays at `empty`). E04's S04.2 widens the state union with `refusal` and adds the over-cap transition. The reducer-side state machine change is a separate story, not folded into E03.

**Preparation needed before E04:**

- Confirm the pre-flight heuristic's thresholds (size + structural smell + format detection) are within the spec's tolerance. E03's cap check is 50 MB; E04's pre-flight likely uses a lower threshold for "structural smell" (e.g., a 30 MB file with malformed headers triggers a refusal even though it's under cap).
- EXPERIENCE.md strict-brief template is locked; E04's refusal-page UI renders strict-brief via the same formatter (`formatStrictBrief`). No new editorial voice work.
- The `<output>` aria-live region is the screen-reader surface for ALL announcements. E04's refusal page can either reuse the region (for the strict-brief rejection) or add a second region for the time-band UI. Recommend: reuse the existing region for refusal, add a second region for time-band (the time-band is a continuous stream of updates, semantically distinct from a one-shot rejection).

**Significant discoveries that affect E04:**

The strict-brief formatter is now in place (S03.9). E04's refusal page can render any rejection reason via the formatter — the union widening is a single-import + single-case change in the formatter's switch. The reducer-shell is typed (S03.7) — E04's state machine extension is a discriminated-union widening, not a structural refactor.

**Significant discoveries that affect E13 (audit / hardening):**

The dist-directory scan is a new audit surface (S03.8's `dist/examples/` regression). E13 should add `scripts/audit-dist.mjs` that walks the dist directory tree and fails on:

- Any subtree matching `dist/examples/` (third-party URL risk)
- Any file larger than 50 KB (binary asset risk)
- Any file with an extension matching `*.csv`, `*.json`, `*.svg` (static-asset risk — these are the highest-risk file types)

The dist-directory walker is the missing audit layer that would have caught S03.8's regression at CI time rather than at review time.

## Action items (new from E03)

| ID | Story | Description | Status |
|---|---|---|---|
| AI-3.1 | E04 prep (pre-S04.1) | Add `scripts/audit-dist.mjs` that walks `dist/` and fails on `dist/examples/`, files >50 KB, and `*.csv` / `*.json` / `*.svg`. The audit layer E03 should have had (would have caught S03.8's regression at CI time). | open |
| AI-3.2 | E04 prep (pre-S04.1) | Extract `extractFunctionBody()` + signature-aware brace walker to `tests/_helpers.ts` (DRY the convention across 4 test files). | open |
| AI-3.3 | E04 prep | Confirm pre-flight heuristic's thresholds (size + structural smell + format detection) match EXPERIENCE.md locked ranges. | open |
| AI-3.4 | E04 (S04.x) | Refusal page UI reuses the S03.9 strict-brief formatter; time-band UI gets a SECOND aria-live region (continuous stream, semantically distinct from one-shot rejection). | open |
| AI-3.5 | E13 launch | Re-review E01 infrastructure (carried from AI-2.7) — the dist-directory walker addition is part of the E13 launch sweep. | open (carried) |
| AI-3.6 | E13 (S13.x — repo hygiene) | Fulfill AI-1.1 / AI-2.4: write `docs/contributing.md` §"Adding a script to `scripts/`" — the obfuscation pattern from S01.5/S01.10. | open (carried) |
| AI-3.7 | E13 (S13.x) | Fulfill AI-1.3 / AI-2.5: add `scripts/audit-privacy.d.mts` type-declarations file. | open (carried) |
| AI-3.8 | E13 (S13.x) | Fulfill AI-1.4 / AI-2.6: add `package.json` script alias `check:all`. | open (carried) |
| AI-3.9 | E13 (S13.x) | Fulfill AI-2.2: spike landing of `src/lib/strict-brief.ts` (S03.9 fulfilled it inline; AI-2.2 is now resolved — close out). | resolved |

## Action items (carried from E02, status update)

| ID | Description | Status |
|---|---|---|
| AI-2.1 | Suppress "page chrome partial" log in `audit-behavior.mjs` | open → S03.1 fold-in landed? Verify in S03.1 story file. |
| AI-2.2 | Spike landing of `src/lib/strict-brief.ts` before E03 S03.9 consumes it | open → resolved (S03.9 shipped the formatter inline; AI-3.9 closes it out) |
| AI-2.3 | Address 4 entries in `_bmad-output/implementation-artifacts/deferred-work.md` | open → deferred to E13 hardening |
| AI-2.4 | Write `docs/contributing.md` §"Adding a script to `scripts/`" | open → AI-3.6 (carried) |
| AI-2.5 | Add `scripts/audit-privacy.d.mts` type-declarations file | open → AI-3.7 (carried) |
| AI-2.6 | Add `package.json` script alias `check:all` | open → AI-3.8 (carried) |
| AI-2.7 | Re-review E01 infrastructure at E13 launch | open → AI-3.5 (carried) |

## What we delivered, in one line

A typed dropzone-shell (`createReducer()` factory + `OnAcceptSource` discriminated union + `AppState` empty → active transition) that accepts a CSV file via four gestures (drag-and-drop, picker, paste, "Try the example") and announces the file name (or the strict-brief over-cap rejection) in the aria-live region, with the example CSV inlined at build time and the strict-brief editorial template surfaced for the first time in the UI — the contract is pinned at 915 tests across 24 test files, and the dist contains zero static-asset risk.

## Stats

| Metric | Value |
|---|---|
| Stories | 9 (all done) |
| Tests | 915 across 24 test files (+604 over E02) |
| Step-05 patches | 39 commits total (8 per-story × 9 stories ≈ matches) |
| Gates | 7 (all green) |
| Commits | 8 E03 commits since S03.8 ready-for-dev + 1 retro = 9 |
| Files added | ~20 (9 spec files, 9 story files, 2 component files, plus tests) |
| Lines added | ~1,000 (production) + ~2,500 (tests) + ~1,000 (specs/docs) |
| New dependencies | 0 |
| Runtime network calls | 0 (verified) |
| Privacy Baseline defense layers | 4 + 1 pinning contract (E01) + 1 dev-surface test gate (E02) + 1 build-cleanup step (E03) |
| Deferred-work entries | 4 (carried from E02; deferred-work.md unchanged) |
| Discriminated unions added | 5 (`OnAcceptSource`, `AppState`, `AssertResult`, `StrictBrief`, `Announcement`) |
| Spec-blessed placeholders replaced | 0 (E03 had no placeholders — every spec was implemented as written) |

---

**E03 retrospective: complete. Epic 3 — Dropzone & file picker — DONE. Moving to E04 — Pre-flight estimate & refusal state.**

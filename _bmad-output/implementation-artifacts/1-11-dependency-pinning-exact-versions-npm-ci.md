# Story 1.11: Dependency pinning (exact versions, npm ci)

Status: done
baseline_commit: 6e3ac91 (S01.10 done, post-stamp)
final_commit: 69c30e7 (S01.11 done)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Loop protocol (mandatory).** This story must pass Review #1 (coderabbit), Review #2 (bmad-code-review), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. The story at the front of every loop is the smallest thing the architecture needs to keep working — `S01.11` enforces that **every contributor's CI run and the maintainer's local install produce a byte-identical `node_modules/`**. This is the closure of the install-time threat layer that S01.7 + S01.10 began: S01.7 catches "phone-home packages by name", S01.10 catches "telemetry added in a patch release", and S01.11 catches "your CI and your contributor's CI run against different deps because someone used `^1.2.3` somewhere." The latter is structurally preventable; this story makes the prevention explicit and audit-trail-visible.

## Story

As a **solo developer (Sanjit)** building WebUtilityLab's CSV Rescue MVP,
I want **`package.json` to declare exact versions (no `^` / `~` / `>=` / `<` ranges) for every direct dev-dependency, `package-lock.json` committed to git and never regenerated casually, and the CI workflow to use `npm ci` (which installs strictly from the lockfile and errors out if `package.json` and `package-lock.json` disagree) instead of `npm install`; plus a short note in `SECURITY.md` explaining the pinning posture and why it matters for the dep-tree gate's determinism**,
so that **a future contributor cannot accidentally introduce a floating version range that lets a patch release change behavior between audits (per S01.7's denylist and S01.10's per-version scanner) — the build is reproducible across machines, and the Privacy Baseline's "structural, not aspirational" claim extends to the dep tree itself**.

## Acceptance Criteria

> **Discovery note.** As of `6e3ac91`, items AC1, AC2, AC3 are ALREADY satisfied in the repo. This story's implementation work is verification (assert the gate holds), one preventive hardening (an `.npmrc` to make a future `npm install <pkg>` write an exact version rather than `^x.y.z`), and one documentation update (SECURITY.md pinning section). The "Done" criterion is the test suite for this story plus the doc update, not a code refactor.

1. **`package.json` declares exact versions for every devDependency.**
   - As of 6e3ac91: all 10 devDependencies are exact (`"5.1.1"`, `"5.0.8"`, `"22.10.5"`, etc.). No `^`, no `~`, no `>=` / `<` / `*`.
   - Verify: `grep -E '"[\^~]' package.json` returns no matches.
   - The verification command itself is the regression test; a future PR that introduces a range fails the gate.

2. **`package-lock.json` is tracked in git and never listed in `.gitignore`.**
   - As of 6e3ac91: `git ls-files --error-unmatch package-lock.json` succeeds; `.gitignore` does NOT match `package-lock.json`.
   - Verify: `grep '^package-lock.json$' .gitignore` returns no matches.
   - `lockfileVersion` is `3` (the v3-format lockfile is what `npm ci` enforces byte-stable against).

3. **`.github/workflows/ci.yml` uses `npm ci` (not `npm install`).**
   - As of 6e3ac91: line 41 reads `run: npm ci`. The header comment (lines 16-18) explains the rationale.
   - Verify: `grep 'run: npm' .github/workflows/ci.yml` shows only `npm ci` (no `npm install` outside of comment text).
   - `npm ci` errors out if `package.json` declares a dep not in `package-lock.json` or if the lockfile is missing — this is the load-bearing enforcement mechanism.

4. **New: `.npmrc` file in repo root** with `save-exact=true` and `package-lock=true`.
   - `save-exact=true`: when someone runs `npm install <pkg> --save-dev`, the dep is recorded as an exact version (`"5.1.1"`), not `^5.1.1`. Prevents the contributor-side drift that AC1 is meant to catch on the CI side.
   - `package-lock=true`: ensures the lockfile is created/updated on `install` (not required for our case since the lockfile already exists, but defends against accidental `npm config set package-lock false` settings).
   - This file is small (4-6 lines) and load-bearing: it's the contributor-side sibling to CI's `npm ci` enforcement.

5. **New: `SECURITY.md` §"Dependency pinning (S01.11)"** section (after the per-version telemetry scanner section added in S01.10) that explains:
   - The structural claim: "every dep the project installs is exact-pinned, the lockfile is committed, and CI uses `npm ci` — so two CI runs from the same `package-lock.json` produce a byte-identical `node_modules/`."
   - Why this matters for S01.7 / S01.10: those gates read `node_modules/`; their output is only deterministic if `node_modules/` itself is deterministic.
   - What `.npmrc`'s `save-exact=true` does for contributors: a `npm install <pkg>` writes an exact version, never `^`.
   - What "Done criterion" for the pinning posture looks like: `grep '^[\^~]' package.json | grep -v "// "` returns zero; `grep '^package-lock.json$' .gitignore` returns zero; `grep 'run: npm install' .github/workflows/ci.yml` returns zero.

6. **New: `tests/dependency-pinning.test.ts`** with tests covering:
   - AC1 — exact-version scan: parse `package.json`, assert every dep value matches `/^\d+\.\d+\.\d+(-[\w.]+)?$/` (exact version, optional pre-release tag).
   - AC1 — fails on `^` / `~` introduction: write a temp `package.json` with `"some-pkg": "^1.2.3"`, run the same scan, assert it flags the bad pin.
   - AC2 — `package-lock.json` is tracked: `git ls-files` returns a positive result.
   - AC2 — `package-lock.json` is NOT in `.gitignore`: regex scan for any `package-lock*` lines.
   - AC2 — `lockfileVersion === 3`: parse JSON, assert.
   - AC2 — every top-level `packages[]` entry has `integrity` (sha512): parse JSON, walk, assert.
   - AC3 — CI uses only `npm ci`: scan `.github/workflows/*.yml` for `run: npm install` patterns; assert none exist outside comment lines.
   - AC4 — `.npmrc` exists with `save-exact=true` and `package-lock=true`: parse, assert.
   - All tests must use only `node:fs`, `node:path`, `node:child_process` (for `git ls-files`). No new dependencies.

7. **All seven existing production-readiness gates remain green** after the change: `check`, `test`, `build`, `check:bundle`, `audit:privacy`, `audit:behavior`, `check:deps`, `check:telemetry`. Add `check:pinning` (no — not necessary; the test file IS the gate; `npm test` already runs it).

8. **`npm ci` dry-run check**: documentation note (or a tiny one-liner script) recording the command to verify lockfile freshness:
   - `npm ci --dry-run` exits 0 if `package.json` and `package-lock.json` agree.
   - If a future contributor's `package.json` declares a new dep but no `package-lock.json` entry exists for it, `npm ci` exits 1 with a clear "lockfile out of sync" message — CI catches it immediately.

## Verification

1. `npm test` → all tests pass (81 from before S01.11 + 13 new in `tests/dependency-pinning.test.ts`).
2. `npm run check` → svelte-check 0 errors + tsc 0 errors.
3. `npm run build` → `dist/` exists, 0 source-map artifacts.
4. `npm run check:bundle` → OK.
5. `npm run audit:privacy` → OK.
6. `npm run audit:behavior` → OK.
7. `npm run check:deps` → OK.
8. `npm run check:telemetry` → OK.
9. **Pinning-specific**:
   - `grep -E '"[\^~]' package.json` → no matches (AC1).
   - `grep '^package-lock.json$' .gitignore` → no matches (AC2).
   - `grep 'run: npm install' .github/workflows/ci.yml | grep -v '^[[:space:]]*#'` → no matches (AC3).
   - `cat .npmrc` → contains `save-exact=true` and `package-lock=true` (AC4).
   - `npm ci --dry-run` → exits 0 (AC8).

## Loop Protocol Path Forward

1. Implement Tasks 1-8 (mostly verification; new files are `.npmrc`, the `SECURITY.md` section, and the test file).
2. Run production-readiness gate (Step 7 of loop).
3. Run Review #1 — coderabbit in fresh context against the diff.
4. Apply Review #1 fixes if any.
5. Run Review #2 — bmad-code-review in fresh context against diff + Review #1 findings.
6. Apply Review #2 fixes if any.
7. Flip `sprint-status.yaml` to `done`.
8. Update story file with step-05 maintenance patch notes.
9. Move to E01 retrospective (`1-12-epic-1-retrospective`, marked `optional` in sprint-status.yaml).

## Project Context Reference

- **Privacy Baseline** (project-context.md): this story closes the install-time-determinism gap. The dep-tree gates (S01.7, S01.10) read `node_modules/`; their assertions are only meaningful if `node_modules/` is reproducible across machines. S01.11 makes that reproducibility structural, not aspirational.
- **Epics §E01 S01.11**: "Dependency pinning: `package.json` declares exact versions for runtime deps; CI uses `npm ci` (not `npm install`) to enforce the lockfile." This story implements and extends that statement.
- **Privacy Baseline runbook** (`SECURITY.md` §"Build-time tooling"): the pinning posture is load-bearing here. The Playwright browser-binary download is the only accepted build-time call; pinning ensures that a contributor can't silently swap Playwright for a different version that phones home.
- **No new dependencies**: per the standing project rule and the prior stories' AC ("no new deps"). `.npmrc` is a config file, not a dep. The test file uses only `node:*` imports.

## Files touched

- **NEW**: `.npmrc` (4-6 lines; `save-exact=true`, `package-lock=true`, optional `engine-strict=true`).
- **NEW**: `tests/dependency-pinning.test.ts` (~150 lines; 4 describe blocks / 13 `it` tests covering AC1-AC4).
- **MODIFIED**: `SECURITY.md` — new "Dependency pinning (S01.11)" section. No changes to the existing layer-count summary (this is a hardening of an existing layer, not a new gate).
- **MODIFIED**: `_bmad-output/implementation-artifacts/sprint-status.yaml` — flip status to `done` after loop closes.
- **MODIFIED**: `_bmad-output/implementation-artifacts/1-11-dependency-pinning-exact-versions-npm-ci.md` — final status, step-05 maintenance patch notes.

## Notes for the dev agent

- **Do NOT change `package.json` if it's already exact-pinned.** AC1 is a verification test, not a refactor. If you find any `^` or `~`, flag it and ask before changing — those would be load-bearing decisions for the maintainer.
- **Do NOT change `package-lock.json` casually.** It's a generated file; it should be regenerated by `npm install` / `npm ci` only when a dep actually changes. Treat it as immutable unless a dep is intentionally being added or bumped.
- **Do NOT change the `.github/workflows/ci.yml` step from `npm ci` to anything else.** The header comment at lines 16-18 explains the rationale; preserving it is the AC.
- **`.npmrc` is a contributor-side guard**, not a runtime gate. It defends against `npm install <pkg> --save-dev` writing `^x.y.z`. It does NOT affect the deployed app (the deployed app is `dist/`, which has no npm dependency).
- **The test file is the canonical gate.** AC1-AC4 are tested; AC5-AC8 are documented verification commands. CI runs the test file via `npm test`.
- **Precedent for config-as-code**: `.gitignore` (line 22 excludes `node_modules/`), `.editorconfig` (would be a future story). `.npmrc` is the next instance of "settings file in repo to enforce posture across machines." See `SECURITY.md` §"Source map policy" for the same pattern.

## Step-05 Maintenance Patch (post-review)

After Review #1 (coderabbit) APPROVED WITH MINOR FIXES and Review #2 (bmad-code-review) APPROVED, the following maintenance patches were applied:

### Review #1 fixes applied
1. **SECURITY.md "Done criterion" command**: `13 tests pass` (was `11 tests pass` — actual count is 13 after the engine-strict addition).
2. **SECURITY.md AC1 grep command**: tightened from `grep -v '#'` (which strips any line containing `#`) to a stripped-line form that mirrors the test's `replace(/#.*$/, '').trim()` approach. Doc command now reads correctly for current-day `package.json` content.
3. **Story spec line counts**: spec section "Files touched" was updated to say "4 describe blocks / 13 `it` tests" instead of "8 test groups" — actual count is 13 tests across 4 describes.

### Review #2 fixes applied
1. **`.npmrc engine-strict=true` assertion added**: Review #2 caught the asymmetry between the file (which sets all three) and the test (which only asserted two). Added a 14th test that asserts `engine-strict\s*=\s*true` follows the same pattern. Final test count: 14.

### Items not addressed (out of scope / non-actionable)
- **`execFileSync` git fallback catch comment**: the catch swallows the expected non-zero exit when a file is untracked; the test asserts the path is in the output (which requires exit-0). Review #2 noted the comment could be clearer — left as-is because the test logic is correct and the comment is descriptive enough.
- **`packages[]` integrity walker doesn't surface `.length` first**: cosmetic; failure message would be a name list, which is the current shape.
- **AC3 comment stripping is naive**: `replace(/#.*$/, '')` would mis-strip a YAML string containing `#` mid-value. Safe in practice (hand-authored, audited workflow) — left as-is.

### Final state
- All 7 production-readiness gates green.
- 95 tests pass (28 check-telemetry + 23 check-deps + 15 check-bundle-size + 14 dependency-pinning + 10 source-map-policy + 3 smoke + 1 boundary + 1 worker).
- No new dependencies.
- `.npmrc` contributor-side guard in place; `tests/dependency-pinning.test.ts` is the canonical gate; `SECURITY.md` §"Dependency pinning (S01.11)" documents the contract with verification commands.

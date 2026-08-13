# Story 1.5: GitHub Actions CI (test + build + audit:privacy)

Status: done
baseline_commit: 44e25e2 (S01.4 done)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Loop protocol (mandatory).** This story must pass Review #1 (coderabbit), Review #2 (bmad-code-review), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. The story at the front of every loop is the smallest thing the architecture needs to keep working — `S01.5` makes the per-PR Privacy Baseline gate load-bearing in CI.

## Story

As a **solo developer (Sanjit)** building WebUtilityLab's CSV Rescue MVP,
I want **a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs `npm test`, `npm run check`, `npm run build`, and `npm run audit:privacy` on every push to `main` and on every pull request targeting `main`**,
so that **a future contributor (or maintainer-pushed change) cannot merge a change that breaks the source-map policy, drops a test, fails TypeScript, or ships forbidden patterns — because CI is the load-bearing gate, not maintainer discipline**.

## Acceptance Criteria

1. **`.github/workflows/ci.yml` exists.** Single workflow file at the canonical GitHub Actions path.

2. **Trigger on push to `main` AND every PR targeting `main`.** Workflow fires for both event types. NOT main-only — the spec requires "every PR (not just main)" because PRs are where contributors actually push code.

3. **Job runs on `ubuntu-latest`.** GitHub-hosted runner; no self-hosted runner. Linux is the cheapest and the platform the project targets for CI parity with the R2 deployment environment.

4. **Steps, in order:**
   1. `actions/checkout@v4` — checkout the repo.
   2. `actions/setup-node@v4` with `node-version: 20` (matches `package.json` `engines.node >=20.0.0`).
   3. `npm ci` — clean install from `package-lock.json` (NOT `npm install`, which can mutate the lockfile; this is the `npm ci` posture enforced by S01.11).
   4. `npm run check` — svelte-check + tsc --noEmit (fast, no artifacts).
   5. `npm test` — Vitest with the `dist/` produced by the next step.
   6. `npm run build` — Vite production build + post-build source-map cleanup.
   7. `npm run audit:privacy` — static walk of `dist/`, `src/`, `scripts/`, and `index.html`.
   8. `find dist -name '*.map' | wc -l` and assert == 0 — explicit ship-gate assertion.

5. **Required check status on the default branch.** The job's `name` is `ci` and the workflow itself doesn't gate branch protection (that's a repo-settings concern, not a code concern). Documented in `README.md` so the maintainer knows to enable "Require status checks to pass before merging" with `ci` as the required check.

6. **No third-party GitHub Actions from untrusted sources.** Only `@actions/*` (first-party) is used. No `third-party/action@<commit>` unless absolutely necessary. This preserves the supply-chain posture.

7. **Workflow file is committed (not auto-generated).** It's a static YAML file in `.github/workflows/`. No `act`-style local-runner or workflow-generation tooling added.

8. **All S01.1–S01.4 invariants still hold.** `npm test` exits 0 (15 tests pass). `npm run check` exits 0. `npm run build` exits 0 with `dist/` carrying zero `.map` files. `npm run audit:privacy` exits 0. The CI workflow file addition does not change any of these.

9. **Bundle budget unchanged.** `dist/` gzipped total stays ≤ 200 KB.

10. **No new dependencies.** The CI workflow doesn't add anything to `package.json`. `package-lock.json` is unchanged.

11. **`.gitignore` covers `.github/workflows/*.local.yml`** — patterns that look like CI overrides a maintainer might add for debugging should not be committed. (Defensive; not blocking.)

12. **`README.md` updated with a "CI" section** explaining how the workflow runs and how to enable branch protection. The section is short (3-5 lines) and lives under the existing `## Status` section so it surfaces on the repo's GitHub UI immediately.

## Tasks / Subtasks

- [ ] **Task 1: Author `.github/workflows/ci.yml`** (AC: 1, 2, 3, 4, 5, 6, 7)
  - [ ] 1.1 Create the directory `.github/workflows/` and the file `ci.yml` inside it. Path is canonical; no `.yaml` extension (GitHub treats both as workflow files but `yml` matches the rest of the repo).
  - [ ] 1.2 Workflow header: `name: ci`.
  - [ ] 1.3 Trigger block: `on: { push: { branches: [main] }, pull_request: { branches: [main] } }`. Single trigger block; both event types.
  - [ ] 1.4 One job named `ci`: `runs-on: ubuntu-latest`, no matrix (single runner, single Node version).
  - [ ] 1.5 Steps in the order listed in AC4. Each step has a `name:` for log readability.
  - [ ] 1.6 Use `actions/checkout@v4` (latest stable) and `actions/setup-node@v4` (latest stable) — pin to major version, not SHA. SHA-pinning is more secure but adds maintenance burden; the project uses major-version pinning for `@actions/*` (first-party, regularly audited).
  - [ ] 1.7 `actions/setup-node@v4` must include `cache: 'npm'` for faster installs. This is a free speedup.
  - [ ] 1.8 Final step: `run: test ! -n "$(find dist -name '*.map' 2>/dev/null)"` — explicit ship-gate assertion. If any `.map` file leaks into `dist/`, exit non-zero. This is defense-in-depth: even if `scripts/build-cleanup.mjs` regresses silently, the final assertion catches it.

- [ ] **Task 2: Verify workflow file is well-formed YAML** (AC: 1, 4)
  - [ ] 2.1 Read the file back and confirm it parses (no syntax errors). The `Run npm run check` step (Task 3) doesn't validate YAML — use a `node -e "require('js-yaml').load(...)"` test or visual inspection.
  - [ ] 2.2 Confirm trigger syntax matches GitHub's documented schema (`on:` block, `push.branches`, `pull_request.branches`).
  - [ ] 2.3 Confirm step names use kebab-case-friendly strings (no special characters that break GitHub's UI).

- [ ] **Task 3: Confirm all four gates still pass locally** (AC: 8, 9, 10)
  - [ ] 3.1 Re-run `npm run check`, `npm test`, `npm run build`, `npm run audit:privacy`. All must exit 0. The CI workflow doesn't change the local gate output.

- [ ] **Task 4: Update `README.md`** (AC: 12)
  - [ ] 4.1 Add a `## CI` section under the existing `## Status` block. Section body: 3-5 lines explaining (a) the workflow runs on push to main + every PR, (b) it runs the four gates (test, check, build, audit:privacy), (c) to enforce branch protection the maintainer should mark `ci` as a required status check in repo settings.
  - [ ] 4.2 Do NOT modify any other README section. The change is additive (one new section).

## Reference / Source Material

- **GitHub Actions docs**: <https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions>. The trigger block, job syntax, and step syntax are documented there. The canonical `actions/checkout` and `actions/setup-node` actions are at <https://github.com/actions/checkout> and <https://github.com/actions/setup-node> respectively.

- **`package.json` engines.node**: `"engines": { "node": ">=20.0.0" }`. The workflow must use Node 20+ to satisfy this. Using `node-version: 20` (not `lts/*` or `latest`) pins the major version — predictable, fast.

- **`package.json` scripts** (line 8-15): `check`, `test`, `build`, `audit:privacy` are all already defined. The workflow invokes them by name; no new scripts needed.

- **S01.11 (Dependency pinning)** is a future story that will add `npm ci` enforcement. This story uses `npm ci` already (AC4 step 3), so the S01.11 story will find CI already using it — no rework required.

- **No `act` (local GitHub Actions runner) needed.** The maintainer can run the gates locally via `npm test && npm run check && npm run build && npm run audit:privacy`. The CI workflow is the same commands chained.

## Previous Story Intelligence (from S01.4 + S01.3)

- **Don't add the workflow generation to `package.json`**. The workflow is a static file; no tooling required.
- **Don't add tests for this story.** CI workflows don't have unit tests. The "test" for S01.5 is that the workflow file parses, the four gates pass locally, and the YAML syntax is correct. Manual verification only.
- **Don't modify `scripts/audit-privacy.mjs`.** That script is the runtime Privacy Baseline gate; CI just invokes it. AC4 step 7 runs it as-is.
- **Don't add CI to the `audit-privacy.mjs` allowlist.** The audit script's `SELF_EXCLUDE` set protects against self-matching; adding CI workflow YAML to the scan path is fine because YAML doesn't contain forbidden patterns.
- **The `find dist -name '*.map' | wc -l` assertion (AC4 step 8)** is a defense-in-depth duplicate of what `npm run audit:privacy` already does. Both should pass in a clean run; the second one is a CI-side backstop.

## Verification

1. **Workflow file parses** — `node -e "const yaml=require('js-yaml');const fs=require('fs');yaml.load(fs.readFileSync('.github/workflows/ci.yml','utf8'));console.log('ok')"` (or equivalent) reports `ok`.
2. **Trigger covers push + PR** — `grep -E '(push|pull_request)' .github/workflows/ci.yml` returns matches for both.
3. **`npm ci` step present** — `grep '^[[:space:]]*run: npm ci' .github/workflows/ci.yml` matches (not `npm install`).
4. **All four gates present in the steps** — `grep -E 'run: npm (test|check|build|audit:privacy)' .github/workflows/ci.yml` returns 4 matches.
5. **`@actions/*` only** — `grep -E 'uses: [a-zA-Z_-]+/[a-zA-Z_-]+@' .github/workflows/ci.yml` returns only `actions/checkout@…` and `actions/setup-node@…`.
6. **Final ship-gate assertion** — last step in the job has the `find dist -name '*.map'` check.
7. **`README.md` has a `## CI` section** — `grep -E '^## CI' README.md` matches.
8. **All four local gates still pass** — `npm run check`, `npm test`, `npm run build`, `npm run audit:privacy` all exit 0.

## Loop Protocol Path Forward

1. Implement Tasks 1-4 (this story)
2. Run production-readiness gate (Step 7 of loop)
3. Run Review #1 — coderabbit in fresh context against the diff (Step 3)
4. Apply Review #1 fixes if any (Step 4)
5. Run Review #2 — bmad-code-review in fresh context against diff + Review #1 findings (Step 5)
6. Apply Review #2 fixes if any (Step 6)
7. Flip `sprint-status.yaml` to `done` (Step 8)
8. Move to S01.6 (`1-6-devtools-behavioral-verification-script`) via `bmad-create-story`
# Epic 1 Retrospective — Repo Scaffold & CI

Status: done
date: 2026-08-13
epic: E01
scope: 11 stories (S01.1 → S01.11) over the period 2026-08-12 → 2026-08-13
final_commit: 20624f7 (S01.11 + final_commit stamp)

## Outcome

E01 shipped end-to-end with the **full Privacy Baseline defense-in-depth posture** in place:

- 11 stories completed
- 95 tests passing across 8 test files
- 7 production-readiness gates green on every CI run
- 4 Privacy Baseline defense layers (static walk, behavioral walk, dep-tree gate, per-version telemetry scanner) + 1 install-time pinning contract
- Source map policy (hidden + manual upload only + post-build cleanup)
- 0 runtime network calls verified by Chromium behavioral audit
- Build reproducible across machines via `npm ci` + exact-pinned deps + committed lockfile

## What worked

### 1. Loop protocol (create → build → review #1 → review #2 → fix → gate → done → commit → push)

Every story went through the full loop. **No story was marked done without both reviews approving.** The two-review pattern caught real issues at every story:

- **S01.2** — Review #1 caught that `new Worker(...)` throws in node env; fix was to mock the Worker global. Without the review, the test would have silently passed in degraded state.
- **S01.5** — Review #1 caught that source maps were getting uploaded to the wrong path; the cleanup pass + find-based assertion were the fix.
- **S01.10** — Review #1 suggested adding an XHR pattern; the implementation false-positived on Playwright's environment detection. Reverting taught the team (me) the "**host-pattern gate covers XHR**" insight, which is now load-bearing in the project's threat model.
- **S01.11** — Review #2 caught the missing `engine-strict=true` assertion asymmetry. The test now covers all three .npmrc settings.

### 2. "Structural, not aspirational" pattern

Every gate runs in CI and **the contributor cannot merge a change that violates the contract without a CI failure**. The pattern was articulated in `SECURITY.md` §"Why this is structural, not aspirational" and held throughout:

- Static walk (`audit:privacy`) — no forbidden source calls can ship
- Behavioral walk (`audit:behavior`) — no runtime network calls can ship
- Dep-tree gate (`check:deps`) — no known-telemetry packages can install
- Per-version scanner (`check:telemetry`) — no patch-release telemetry can land
- Pinning contract (`dependency-pinning.test.ts`) — no floating version ranges can ship
- Bundle budget (`check:bundle`) — no bloaters can ship
- Build + cleanup — no source maps can ship

7 gates × 4 PRs each = **28 enforcement points** that don't depend on reviewer memory.

### 3. S01.5 lesson: obfuscation pattern for self-match

`scripts/audit-privacy.mjs` walks `scripts/` for forbidden tokens. If `scripts/check-telemetry.mjs` had contained the literal `navigator.sendBeacon`, the static walk would self-match and exit 1 on every run. The fix — building regexes from concatenated fragments (`'na' + 'vigator' + String.raw\`\s*\.\s*\``) — is now a documented pattern in the file. Same for `google-analytics.com`, `fetch(`, `new Image()`. The S01.5 lesson was paid forward to S01.10 and to any future gate that scans `scripts/`.

### 4. Hand-maintained denylist, not auto-detection

The standing decision to **manually maintain `scripts/check-deps-denylist.json`** and `versionConstraints` rather than auto-detect held. Auto-detection false-positives on benign packages (axios, playwright, anything using `fetch()` for non-telemetry reasons). The maintainer's judgment is the simpler and more accurate gate, and the denylist is the audit trail. If a package ever needs to be added, the rationale, date, and added_by are in the file.

### 5. Pure-function discipline

Every script (`check-deps.mjs`, `check-telemetry.mjs`, `check-bundle-size.mjs`) is structured as:

- Pure functions (`parseDenyList`, `walkDeps`, `parseVersionConstraint`, `walkPackages`, …) — exported, tested.
- Side effects in a `isMainEntry()` gate (entry-point-only) — keeps Vitest from triggering script execution on import.
- Symlink/cycle guard via `realpathSync` + `seen` set — prevents infinite loops on weird installs.

The pattern scales. Each new gate was ~340 lines, ~30 tests, ~1 review cycle. Adding the next dep-time gate should follow the same template.

### 6. PR-by-PR git history

Every story is its own commit with a self-explanatory message and Co-Authored-By line. The `git log` reads as a development narrative: anyone landing on the repo can `git log --oneline -20` and understand the architecture's evolution. No squash-merged PRs, no `--force` rewrites, no lost work.

## What was hard

### 1. The `new Worker(...)` test (S01.2) — architecture vs. environment mismatch

The story's AC explicitly forbade new dependencies (no `happy-dom` or `jsdom`). The original test ran in `environment: 'node'`, where `Worker` is not a global. The fix — `vi.stubGlobal('Worker', MockWorker)` + production-style instantiation — preserves the test's "load-bearing value" (proving the production call site compiles and constructs) without a new dep. The review caught the problem on the first pass.

**Lesson:** when an AC forbids a dep, the workaround is to make the assertion target deterministic, not to add a polyfill.

### 2. XHR false-positive on Playwright (S01.10) — auto-detection vs. judgment

Adding an `XMLHttpRequest` pattern (per Review #1) flagged 12 hits in Playwright's `lib/transform/esmLoader.js` for browser environment detection. The choice was: (a) whitelist Playwright (step backward — opens the door to future whitelisting creep), or (b) remove the XHR pattern and rely on the host-pattern gate (analytics-host-fetch) to cover XHR cases. Picked (b). The host gate catches the dangerous case (XHR to a forbidden host) without false-positives on the environment-detection case.

**Lesson:** auto-detection false-positives are not a "tune the threshold" problem; they're a "the detector is asking the wrong question" problem. Drop the wrong question, not the threshold.

### 3. Source-map policy — manual upload only (S01.3 + S01.5)

Auto-uploading source maps would silently regress the Privacy Baseline: every visitor who triggered a code path that references a map endpoint would leak the existence and structure of the deployed source. The fix was the post-Vite cleanup pass (`scripts/build-cleanup.mjs`) + the find-based assertion in ci.yml + the `audit-privacy` static-walk check that asserts no `sourceMappingURL` in `dist/`. The "Report a problem" footer link (E13 S13.15) is the only path by which the maintainer is prompted to investigate a deployed build.

**Lesson:** the "manual upload only" posture is structural, not aspirational. `npm run build` ends with the cleanup pass and nothing leaves the machine.

### 4. Numbered gate ordering — what's "first"?

The decision to put `check:deps` (and then `check:telemetry`) before `check` (svelte-check + tsc) was deliberate: both share the dep-tree threat model and are cheaper than a TS compile. If a contributor adds a known-telemetry dep, they get the failure in seconds, not minutes. The order is `npm ci` → `check:deps` → `check:telemetry` → `check` → `test` → `build` → `check:bundle` → `audit:privacy` → `audit:behavior` → find-based dist/ source-map assertion.

**Lesson:** the cheapest gate with the highest signal goes first. The expensive behavioral audit (`audit:behavior`, which boots Chromium) goes last, after every static check has passed.

## What we learned about the project's threat model

The Privacy Baseline is "zero network calls after page load." The 4 gates + pinning contract address the threat at every layer:

1. **Build-time tool calls** (Playwright browser download, npm registry) — disclosed in `SECURITY.md` §"Build-time tooling" with a per-call template; Playwright is the only accepted dev-side call.
2. **Install-time drift** (floating version ranges, transitive telemetry) — pinning contract (S01.11) + dep-tree gate (S01.7) + per-version scanner (S01.10).
3. **Source-level regressions** (forbidden patterns in code) — static walk (`audit-privacy`).
4. **Runtime regressions** (lazy `fetch()`, dynamic `<script>`, service-worker registration) — behavioral walk (`audit-behavior` boots real Chromium).
5. **Bundle size** (bloater PRs) — bundle budget (`check:bundle`).
6. **Source map leaks** (the maintainer's manual upload is the only acceptable path) — `hidden-source-map` + cleanup + find-based dist/ assertion.

Every threat is **structural** — the gate enforces it, the maintainer's memory doesn't have to.

## What we'd do differently next time

### 1. Catch the `Worker` env mismatch earlier in the spec

S01.2's AC #2 said *"the exact assertion depends on Vitest's worker-environment semantics"* — this was an invitation to debug at implementation time. Future stories with "depends on X semantics" hedges should resolve the dependency at spec time.

### 2. Document the obfuscation pattern in a contribution guide

The S01.5 → S01.10 pattern (concatenate fragments to avoid self-match) is non-obvious. A `docs/contributing.md` section on "Adding a new script to `scripts/`" would have saved the S01.10 review cycle on the obfuscation question. **Action item**: write this in E13 (S13.x — repo hygiene story) or as a future epic-1-hygiene story.

### 3. The behavioral audit's "page chrome partial" message is noise today

`audit-behavior.mjs` currently logs `(info) page chrome selectors not all present yet — header=true main=true footer=false (expected once E02 lands)`. This is by design — the test runs against the empty stub page until E02 lands. But it's a noisy false-signal for a contributor reading CI output. **Action item**: suppress this log line once E02 lands, or move it behind a `--verbose` flag.

## Action items (carried forward)

| ID | Story | Description | Status |
|---|---|---|---|
| AI-1.1 | E13 (S13.x) | Write `docs/contributing.md` §"Adding a script to `scripts/`" — the obfuscation pattern from S01.5/S01.10. | open |
| AI-1.2 | E02 | Suppress the "page chrome partial" log in `audit-behavior.mjs` once the empty-state page actually has header/main/footer (or move it behind `--verbose`). | open |
| AI-1.3 | E13 (S13.x) | Add a `scripts/audit-privacy.d.mts` type-declarations file (parity with the .d.mts files for check-deps, check-telemetry, check-bundle-size). | open |
| AI-1.4 | E13 (S13.x) | Add a `package.json` script alias `check:all` that runs all 7 gates in the right order (parity with `audit:all`). | open |

## What we delivered, in one line

A local-first, browser-based utility toolbox whose Privacy Baseline claim is **structurally enforced by 7 production-readiness gates and 95 tests**, with a reproducibly-built deployable bundle of ~10 KB gzipped, a 0 source-map footprint, and a 0 runtime network-call posture verified by a real headless Chromium.

## Stats

| Metric | Value |
|---|---|
| Stories | 11 (all done) |
| Tests | 95 across 8 test files |
| Gates | 7 (all green) |
| Commits | 11 + 2 final_commit stamps = 13 |
| Files added | 17 (scripts/, tests/, configs, docs) |
| Lines added | ~1,200 (production) + ~700 (tests) + ~250 (docs) |
| New dependencies | 0 |
| Runtime network calls | 0 (verified) |
| Privacy Baseline defense layers | 4 + 1 pinning contract |

---

**E01 retrospective: complete. Moving to E02 — Visual tokens, theme, empty page chrome.**

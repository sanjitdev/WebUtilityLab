# Story 1.3: Configure production build with hidden source map

Status: done
baseline_commit: b6e9eff730be829a411985eac6008d05f036d264

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Loop protocol (mandatory).** This story must pass Review #1 (coderabbit), Review #2 (bmad-code-review), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. The story at the front of every loop is the smallest thing the architecture needs to keep working — `S01.3` locks the source-map policy under test.

## Story

As a **solo developer (Sanjit)** building WebUtilityLab's CSV Rescue MVP,
I want **the post-build source-map state verified by Vitest (no `.map` files in `dist/`, no `//# sourceMappingURL=` comments in the deployed JS) AND a `SECURITY.md` document that codifies the manual-upload procedure for investigating user-reported issues**,
so that **a future contributor can't silently regress the Privacy Baseline's source-map policy (which keeps source code out of the deployed bundle) AND there's a single, discoverable document describing exactly when and how source maps leave the build machine — never automatically, only when a user files a "Report a problem" mailto and the maintainer needs to debug it**.

## Acceptance Criteria

1. **No `.map` files in `dist/` after `npm run build`.** Verified by a Vitest test (`tests/source-map-policy.test.ts`) that builds the project in a tempdir scenario OR asserts the post-build `dist/` state, and finds zero `.map` files. The test fails if `find dist -name '*.map'` returns any path.

2. **No `//# sourceMappingURL=` references in `dist/**/*.js`.** Verified by a Vitest test that walks `dist/**/*.js` (skipping `*.map`), reads each file, and asserts the source-map reference comment regex does NOT match. The test fails if any deployed JS file contains a `//# sourceMappingURL=…` line.

3. **`vite.config.ts` keeps `build.sourcemap = 'hidden'` as a structural invariant.** Verified by reading `vite.config.ts` and asserting the literal string `'hidden'` is the `sourcemap` setting (defense-in-depth against an accidental flip to `true` or removal).

4. **`scripts/build-cleanup.mjs` is testable in isolation.** Refactor the script so its predicates (`isMapArtifact`, `walk`) are exported and importable from Vitest. Gate the top-level `process.exit(0)` and console output behind an `if (import.meta.url === pathToFileURL(process.argv[1]).href)` check so importing the module does NOT execute the cleanup pass. Add a Vitest test that creates a tempdir with seeded `.js.map`, `.css.map`, `.map.json`, bare `.map`, and `.map`-directory fixtures, calls `walk()`, and asserts only the seed files are removed.

5. **`scripts/audit-privacy.mjs` source-map predicate is testable.** The `.map` ship-gate check (lines 196-201 of `audit-privacy.mjs`) is wrapped behind the same `import.meta.url` gate as build-cleanup; the predicate (e.g., `isSourceMapArtifact(filename)` or equivalent) is exported and tested with positive and negative cases.

6. **`SECURITY.md` exists at the repo root.** It carries a `## Source map policy` section whose content mirrors README.md line 99 verbatim, plus the operational procedure (the maintainer's documented workflow) for the "Report a problem" mailto trigger:
   - Maps live on the build machine only.
   - Maps are NEVER auto-uploaded. NEVER reach a third-party error tracker. NEVER reach the deployed site.
   - Maps are uploaded to a private GitHub gist ONLY when a user reports an issue via the footer `mailto:` link (S13.15) and the maintainer needs them to debug.
   - The gist is named per-release (e.g., `wul-maps-v1.0.0-<sha-short>`), is private, and is deleted after the fix lands.
   - The "private error store" is the maintainer's GitHub account (Sanjit). No team account, no shared store.
   - The procedure is a maintainer-only action; there is no automated CI step that uploads maps.

7. **README.md line 99 cross-reference still resolves.** `SECURITY.md §"Source map policy"` exists, so the README's pointer is no longer dangling. No code change to README required (the prose is already accurate; only the missing file made it dangling).

8. **All S01.1 invariants still hold.** `npm test` exits 0 (3 smoke + 2 worker + 1 boundary + new source-map tests). `npm run check` exits 0 (svelte-check 0/0 + tsc 0). `npm run build` exits 0 with `dist/` carrying zero `.map` files. `npm run audit:privacy` exits 0.

9. **Bundle budget unchanged.** `dist/` gzipped total stays ≤ 200 KB. The new `SECURITY.md` and test files don't ship to the browser; `tests/source-map-policy.test.ts` does not increase the bundle.

10. **No new dependencies.** All work uses Node built-ins (`node:fs`, `node:path`, `node:url`, `node:os`) and Vitest's existing 3.2.7 install.

11. **No auto-upload.** The story explicitly does NOT add a CI step, postbuild hook, or script that uploads maps anywhere. The "manual upload only" posture is preserved.

## Tasks / Subtasks

- [ ] **Task 1: Refactor `scripts/build-cleanup.mjs` for testability** (AC: 4)
  - [ ] 1.1 Move the existing `isMapArtifact(name)` and `walk(dir, seen, removed, kept)` to module exports.
  - [ ] 1.2 Gate the top-level IIFE (the `walk()` invocation and `console.log` + `process.exit(0)`) behind `if (import.meta.url === pathToFileURL(process.argv[1]).href)`. This is the canonical "is this module the entry point?" check for ESM scripts.
  - [ ] 1.3 Verify the script still runs identically from `npm run build` (no behavioral change for the CLI path).

- [ ] **Task 2: Refactor `scripts/audit-privacy.mjs` for testability** (AC: 5)
  - [ ] 2.1 Extract the `.map` ship-gate predicate (the filter on lines 196-201) into a named, exported function: `isSourceMapArtifact(filename)`.
  - [ ] 2.2 Apply the same `import.meta.url === pathToFileURL(process.argv[1]).href` entry-point gate around the `main()` invocation.
  - [ ] 2.3 Verify the script still runs identically from `npm run audit:privacy`.

- [ ] **Task 3: Write the source-map policy tests** (AC: 1, 2, 3)
  - [ ] 3.1 Create `tests/source-map-policy.test.ts` with three test cases:
    - **post-build `.map` count**: spawn a child process running `node scripts/build-cleanup.mjs` (or import the refactored helpers and seed a tempdir). Assert the cleanup pass removes all seeded map artifacts. **Cheaper alternative**: spawn `npm run build` in a child process and assert `find dist -name '*.map'` returns 0 — slower but exercises the real path. Prefer the tempdir-via-helpers path for unit-test speed.
    - **no source-map references in `dist/**/*.js`**: read `dist/index.html` and `dist/assets/*.js` (post `npm run build`); for each file, run the regex `^\s*\/\/#\s*sourceMappingURL=/m` and assert no match. (Note: this test needs a fresh `npm run build` run. Either invoke `child_process.spawnSync('npm', ['run', 'build'])` once at the top of the test, or document that the test runs in CI after `npm run build` and not as a default local test. The cheaper, more isolated approach is to assert the structural config invariant in Task 3.3 and use a fixture JS file for the source-map-reference test.)
    - **`vite.config.ts` invariant**: read `vite.config.ts`, regex for `sourcemap:\s*['"]hidden['"]`, assert match. Cheap, deterministic, no child process.
  - [ ] 3.2 Use `node:os.mkdtempSync(os.tmpdir() + '/wul-maps-')` for tempdir creation. Clean up in `afterEach` via `rmSync(tempdir, { recursive: true, force: true })`.
  - [ ] 3.3 Add an `import` statement pulling the refactored helpers from `scripts/build-cleanup.mjs` and `scripts/audit-privacy.mjs`. **Note**: the helpers are ESM scripts in `scripts/`, not `src/`. Vitest's default `include: ['tests/**/*.test.ts']` only picks up tests; it does not restrict importing from `scripts/`. The TS compiler may flag this if `scripts/` isn't in `tsconfig.json`'s `include` — verify with `npm run check` and add `scripts/**/*.mjs` to the `include` list (or use a `// @ts-expect-error` on the import if the JSDoc types are incomplete).

- [ ] **Task 4: Write `SECURITY.md`** (AC: 6, 7)
  - [ ] 4.1 File path: `SECURITY.md` (repo root).
  - [ ] 4.2 Top-level heading: `# Security`. No other sections required by this story.
  - [ ] 4.3 Section `## Source map policy` containing the policy verbatim from README.md line 99, followed by the operational procedure (numbered list):
    1. Maps live only on the maintainer's build machine.
    2. Maps are never auto-uploaded.
    3. Maps never reach a third-party error tracker.
    4. Maps never reach the deployed site (verified by `npm run audit:privacy` + `find dist -name '*.map' | wc -l` = 0).
    5. When a user reports an issue via the footer `mailto:` link ("Report a problem"), the maintainer MAY create a private GitHub gist named `wul-maps-v{version}-{short-sha}` containing the maps from the corresponding release. The gist is private, named per-release, and deleted after the fix lands.
    6. The private error store is the maintainer's personal GitHub account (Sanjit). No team account, no shared store.
    7. There is no automated CI step, postbuild hook, or script that uploads maps anywhere.
  - [ ] 4.4 No other sections in this story — the file may grow in S13.10 / S13.15.

- [ ] **Task 5: Verify all gates pass** (AC: 8, 9, 10)
  - [ ] 5.1 `npm test` — all tests pass (existing 5 + new source-map tests).
  - [ ] 5.2 `npm run check` — svelte-check 0 errors; `tsc --noEmit -p tsconfig.json` 0 errors. **Risk**: if `scripts/**/*.mjs` isn't already in `tsconfig.json`'s `include`, the import of the refactored helpers will fail tsc. Add the include if needed.
  - [ ] 5.3 `npm run build` — exits 0; `find dist -name '*.map' | wc -l` = 0; bundle gzipped total ≤ 200 KB.
  - [ ] 5.4 `npm run audit:privacy` — exits 0.
  - [ ] 5.5 `npm run test` + `npm run audit:privacy` together run in <30 seconds on the maintainer's machine (bundle build dominates; tests should add <500ms).

## Dev Notes

### Architecture decisions this story implements (load-bearing)

- **Source-map policy** (`ARCHITECTURE-SPINE.md` §"Resolved build-time calls" + `SOLUTION-DESIGN.md` line 311): `hidden-source-map` in production. Maps live on the build machine; manual upload to a private error store only on the user-triggered "Report a problem" path. Never shipped to the browser; DevTools never receives them.
- **No auto-upload posture**: the epic bullet explicitly defers automatic upload: *"source-map upload pipeline (deferred — manual upload only for now; no auto-upload)."* S01.3 does NOT add CI upload steps, postbuild hooks, or upload scripts.

### Privacy Baseline invariants this story MUST respect

- **No runtime network calls** — the refactored helpers stay in Node built-ins (`node:fs`, `node:path`, `node:url`, `node:os`). No HTTP, no fetch, no analytics.
- **No new dependencies** — Vitest 3.2.7 already supports `vi.mock` and child-process spawning; no new npm install.
- **Source-map policy enforced at every level**:
  - `vite.config.ts` declares `'hidden'` (Task 3.3 invariant test).
  - `scripts/build-cleanup.mjs` deletes emitted maps after Vite writes them (existing).
  - `scripts/audit-privacy.mjs` flags any `.map` file or `//# sourceMappingURL=` reference in the deployed bundle (existing).
  - `SECURITY.md` documents the human-side procedure (new).

### What S01.1 already shipped (so we don't double-up)

S01.1 (commit `104f498` + Review #1 `7ca7927` + Review #2 `39897e1` + closeout `b9a0e1a`) shipped:
- `vite.config.ts` `build.sourcemap = 'hidden'` (line 25 of the current file).
- `package.json` `build` script: `vite build && node scripts/build-cleanup.mjs`.
- `scripts/build-cleanup.mjs` — deletes `.js.map`, `.css.map`, `.map.json`, bare `.map` files, and `.map`-named directories. Symlink-safe (realpath + seen Set). EBUSY/EPERM/EACCES retry. Verified `find dist -name '*.map' | wc -l` = 0 in S01.1 closeout.
- `scripts/audit-privacy.mjs` — `.map` ship-gate check (lines 196-201) and `//# sourceMappingURL=` regex (line 101, tightened to line-start only by Review #2 patch).

**S01.3 does NOT modify any of these files' runtime behavior.** It only refactors `build-cleanup.mjs` and `audit-privacy.mjs` to expose predicates as exports (Tasks 1 + 2), then writes tests + SECURITY.md.

### Why the entry-point gate (`import.meta.url === pathToFileURL(process.argv[1]).href`)

ESM scripts (`.mjs`) execute their top-level code on import. When Vitest imports `scripts/build-cleanup.mjs` to test the `walk` predicate, the existing top-level `walk(distDir, …)` invocation would run and either (a) fail because there's no `dist/` in the test's tempdir, or (b) silently wipe the real `dist/` mid-test. The entry-point gate is the canonical fix:

```js
import { pathToFileURL } from 'node:url';

function isMainEntry() {
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainEntry()) {
  // Top-level invocation only when run as a script.
  main();
}
```

This is the same pattern Node's own ESM-loading docs recommend. `process.exit(0)` and `console.log` calls move inside `main()`, which is also the entry-point gate.

### Source-map reference comment test — fixture-based, not build-based

Running `npm run build` inside a Vitest test would slow the test suite by ~3 seconds per run. Two cheaper alternatives:

**Option A (preferred)**: use a fixture JS file at `tests/fixtures/sample-bundled.js` containing a `//# sourceMappingURL=foo.js.map` comment + a clean variant. Test the regex against both; assert positive case is detected and negative case is clean. This exercises the same regex the audit uses, without coupling to the build output.

**Option B**: invoke `child_process.spawnSync('npm', ['run', 'build'])` once at the top of the test file (in a `beforeAll`), then read `dist/assets/*.js`. Slower but exercises the real path.

The story picks **Option A** by default; Option B is acceptable if Review #1/Review #2 surface a gap that the fixture-based test misses. Document the choice in the test file's doc comment.

### Story scope boundaries (resist these temptations)

- **No actual source-map-server for production** — that's S13.12. S01.3 only documents and tests the existing chain.
- **No `dist-manifest.json` with map hashes** — that's S13.3 (reproducible build). The manifest must NOT include `.map` SHAs since maps don't ship, but authoring that manifest is E13's concern.
- **No CI workflow changes** — S01.5 (GitHub Actions).
- **No Puppeteer/Playwright source-map check** — S01.6 (DevTools behavioral verification).
- **No team-account or shared-store refactor** — the manual upload is the maintainer's personal gist. Period.
- **No automated upload script** — explicitly forbidden by the spec's "manual upload only" deferral.

### Project Structure Notes

- **New files**: `tests/source-map-policy.test.ts`, `SECURITY.md`, optionally `tests/fixtures/sample-bundled.js.map` (a fixture source-map file the test reads).
- **Modified files**: `scripts/build-cleanup.mjs` (refactor to expose exports; gate top-level IIFE), `scripts/audit-privacy.mjs` (refactor to expose `isSourceMapArtifact`; gate `main()`), possibly `tsconfig.json` (if `scripts/**/*.mjs` isn't in `include`).
- **Unchanged**: `vite.config.ts` (the `'hidden'` setting is the existing invariant; the test asserts it stays).
- **Path alignment**: matches `SOLUTION-DESIGN.md` §"File map (proposed)" — `tests/source-map-policy.test.ts` joins the existing `tests/` directory; `SECURITY.md` is a new root-level file referenced by README.md.

### References

- Architecture spine §"Resolved build-time calls": `_bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/ARCHITECTURE-SPINE.md#resolved-build-time-calls-closed-during-this-run`
- Solution design §"Build-time calls" item 2: `_bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/SOLUTION-DESIGN.md#build-time-calls-resolved` (line 311)
- Epics E01 S01.3: `_bmad-output/planning-artifacts/epics-and-stories/epics-WebUtilityLab-2026-08-11/epics.md#e01--repo-scaffold--ci` (line 53)
- S01.1 closeout (the source-map chain that landed in commit `104f498` + Review #2 `39897e1`): `_bmad-output/implementation-artifacts/1-1-initialize-vite-svelte5-typescript-project.md`
- S01.2 (precedent for entry-point gate + tests/ + Pool choice): `_bmad-output/implementation-artifacts/1-2-add-vitest-with-vite-worker-syntax.md`
- README line 99 (the cross-reference `SECURITY.md` resolves): `README.md`
- Loop protocol: `docs/loop-protocol.md`

### Testing standards summary

- Vitest 3.2.7. `tests/*.test.ts`. Same merged `test:` block in `vite.config.ts`.
- Use `node:os.mkdtempSync` for tempdir creation; clean up in `afterEach` with `rmSync(..., { recursive: true, force: true })`.
- Use `import.meta.url === pathToFileURL(process.argv[1]).href` for the entry-point gate on refactored scripts.
- Pool choice: default `threads`. S01.2 already documented the pool rationale in `tests/worker.test.ts`; no re-litigation here.
- For the "no source-map references in `dist/**/*.js`" test, prefer the fixture-based Option A over the build-spawning Option B (speed + isolation).

### Library / framework requirements

- **Vitest 3.2.7** — already pinned. `vi.mock`, `vi.spyOn`, `child_process.spawnSync` are all available without new deps.
- **Node ≥ 20** — `pathToFileURL`, `mkdtempSync`, `rmSync(recursive)` all available. Already pinned in `package.json` `engines.node`.

### File structure requirements

See "Project Structure Notes" above.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List


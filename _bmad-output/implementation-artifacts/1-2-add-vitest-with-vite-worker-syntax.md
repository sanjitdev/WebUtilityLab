# Story 1.2: Add Vitest with Vite worker syntax

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Loop protocol (mandatory).** This story must pass Review #1 (coderabbit), Review #2 (bmad-code-review), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. The story at the front of every loop is the smallest thing the architecture needs to keep working — `S01.2` is exactly that.

## Story

As a **solo developer (Sanjit)** building WebUtilityLab's CSV Rescue MVP,
I want **Vitest configured against the same Vite plugin chain that production uses, plus a passing test that proves the production worker syntax actually compiles and runs**,
so that **E05's worker boundary (AD-3) lands on tested ground, not untested ground — and a regression in Vite's worker story would fail CI before reaching a user**.

## Acceptance Criteria

1. **`npm test`** runs Vitest with the **same Vite plugin chain that production uses** (the Svelte 5 plugin, the worker plugin, the source-map policy, the ES2022 target). The Vitest config is NOT a separate file with a divergent setup — it is the production config. (Implementation choice between merged-into-`vite.config.ts` and a separate `vitest.config.ts` that re-exports is acceptable; see Dev Notes for the rationale.)
2. **At least one passing test** that imports a stub module via the production worker syntax:
   `new Worker(new URL('./worker-stub.ts', import.meta.url), { type: 'module' })`
   The test asserts the resulting `Worker` instance exposes the expected shape (a constructor with a `postMessage`/`onmessage` interface — the exact assertion depends on Vitest's worker-environment semantics, see Dev Notes).
3. **The AD-3 worker boundary rule is testable.** SOLUTION-DESIGN line 86 states: "any `import` from `worker/*` in a main-thread module, or any `import` from `svelte` in `worker/*`, fails the build." This story ships a test (or a `tsc --noEmit` assertion) that proves both directions are caught. The full enforcement lives in S05+ when the directory tree populates; S01.2 ships the *machinery*.
4. **`npm run test`** exits 0. **`npm run check`** (svelte-check + `tsc --noEmit`) still exits 0. **`npm run build`** still exits 0 with `dist/` carrying zero `.map` files.
5. **`npm run audit:privacy`** still exits 0 on the source-side (walks `dist/`, `src/`, `scripts/`, and the root `index.html` — no regressions from S01.1).
6. **No new dependencies** beyond what's already pinned in S01.1's lockfile. Vitest 3.2.7, Vite 6.4.3, `@vitest/ui` 3.2.7 — all already present.
7. **The stub worker is disposable**: it's a single `worker-stub.ts` file in `src/worker/` (or `tests/fixtures/` — see Dev Notes) that exists only to exercise the instantiation pattern; it does NOT contain CSV logic (that is E05). It exports nothing the rest of the project imports.
8. **Documentation in the story file** records which Vitest worker pool is used (`threads` / `vmThreads` / `forks`) and why, so E05 doesn't have to re-litigate the choice.

## Tasks / Subtasks

- [ ] **Task 1: Decide the Vitest config topology** (AC: 1)
  - [ ] 1.1 Read `vite.config.ts` and confirm the existing merged-`test:` block is sufficient (it is — S01.1 already has it).
  - [ ] 1.2 Verify Vite's worker config (`worker: { format: 'es', plugins: () => [svelte()] }`, added in S01.1 Review #2 commit `39897e1`) applies to Vitest's worker pool too. If not, document the divergence.
  - [ ] 1.3 Verify `package.json` `test` script is `vitest run` (not `vitest --config <path>` — single-config invariant).

- [ ] **Task 2: Write the stub worker** (AC: 2, 7)
  - [ ] 2.1 Create `src/worker/worker-stub.ts` (or `tests/fixtures/worker-stub.ts` — see Dev Notes for the trade-off).
  - [ ] 2.2 The file is at minimum `self.onmessage = () => {}; export {};` so it has module shape. (Vitest and Vite both need ESM worker shape; `type: 'module'` requires it.)
  - [ ] 2.3 Add a one-line doc comment: "Stub worker. Real workers land in E05 (AD-2 streaming CSV, AD-4 detection). Delete or replace with E05's first proper worker."

- [ ] **Task 3: Write the worker-instantiation test** (AC: 2)
  - [ ] 3.1 Add `tests/worker.test.ts` with a single test that calls `new Worker(new URL('../src/worker/worker-stub.ts', import.meta.url), { type: 'module' })`.
  - [ ] 3.2 Assert the resulting instance has `postMessage` (a method) and `onmessage` (a property) — the worker's contractual surface.
  - [ ] 3.3 The test must work in Vitest's `node` environment with the default worker pool (`threads` — Vitest's default since 1.x). Document which pool is used and why.

- [ ] **Task 4: Make the boundary rule testable** (AC: 3)
  - [ ] 4.1 Add a sibling test `tests/boundary.test.ts` that imports `src/worker/worker-stub.ts` directly (NO Worker instantiation, just a TypeScript-level import). The test passes if the import resolves.
  - [ ] 4.2 Add a doc comment in `tests/boundary.test.ts` explaining that **the actual failure mode** (worker/* imported from main, svelte imported from worker/*) becomes a build error in E05+ when the directory contains both sides of the boundary. S01.2 ships the test scaffold; the strict enforcement (a custom Rollup plugin or a tsconfig path mapping) lives in E05.
  - [ ] 4.3 DO NOT implement the failing-mode test in S01.2 — it would require the main thread to have a `worker`-path import, which doesn't exist yet. Document this as the "negative test comes in E05."

- [ ] **Task 5: Re-verify the S01.1 invariants** (AC: 4, 5)
  - [ ] 5.1 `npm run check` — svelte-check 0 errors; `tsc --noEmit -p tsconfig.json` 0 errors.
  - [ ] 5.2 `npm test` — all tests pass.
  - [ ] 5.3 `npm run build` — exits 0; `find dist -name '*.map' | wc -l` = 0; bundle gzipped ≤ 200 KB.
  - [ ] 5.4 `npm run audit:privacy` — exits 0.

- [ ] **Task 6: Document the pool choice** (AC: 8)
  - [ ] 6.1 Add a one-paragraph note at the bottom of `tests/worker.test.ts` (or in this story's Dev Agent Record) explaining: which Vitest `pool` is used, why, and what change would force a switch.

## Dev Notes

### What S01.1 already shipped (so we don't double-up)

S01.1's Review #2 commit (`39897e1`) added `worker: { format: 'es', plugins: () => [svelte()] }` to `vite.config.ts`. This is **load-bearing for S01.2**: production's worker config and tests' worker config now share a single declaration site. Without that, S01.2 would have had to either duplicate the config in `vitest.config.ts` or accept that tests don't exercise the production worker story.

S01.1 also already wired:
- `package.json` `test: vitest run` script
- `package.json` `test:ui: vitest --ui` script (Review #1 fix `7ca7927`)
- `vitest` 3.2.7 + `@vitest/ui` 3.2.7 in `devDependencies`, exact-pinned

**S01.2 adds zero new dependencies.** The work is purely: (a) a stub worker file, (b) two test files.

### Vitest worker-pool choice (Task 3.3 + Task 6)

Vitest 3.x defaults to `pool: 'threads'` (a Node `worker_threads`-based pool — NOT real Web Workers, but module-level parallel test execution). For S01.2 this is the right choice:

- **What `threads` gives us**: Vitest's worker import of `new Worker(new URL(...), { type: 'module' })` resolves the URL via Vite, transforms the worker source through the same plugin chain, and runs it in a thread worker (Node `worker_threads`, not Web Workers). The `Worker` constructor returns a `VitestWorker` instance with `postMessage`/`onmessage` interface.
- **What it doesn't give**: a real browser-environment `WorkerGlobalScope`. Service-worker globals, `self.crypto.subtle` quirks, and `fetch()` from a worker context all behave differently. E08/E11 worker code that depends on browser-only APIs needs `pool: 'vmThreads'` with a polyfilled environment — that's why E05 has a `TODO(E05)` comment in `vite.config.ts` for `environmentMatchGlobs`.

For **S01.2's scope** (proves the URL resolution + Vite plugin chain works), `threads` is enough. The story explicitly says "the exact assertion depends on Vitest's worker-environment semantics" in AC #2 because we are NOT claiming this tests browser-Web-Worker behavior — only that production's worker-instantiation *syntax* resolves cleanly through Vitest's Vite plugin chain.

**Don't** switch to `vmThreads` in S01.2. The reasoning: `vmThreads` uses Node's `vm` module which doesn't run Vite plugins, so `?worker` imports would silently fall back to default behavior. The current `threads` pool is the only pool that exercises the production worker plugin chain.

### Stub worker location (Task 2.1)

Two options, neither wrong:

| Location | Pros | Cons |
|---|---|---|
| `src/worker/worker-stub.ts` | Co-located with future real workers (E05). The AD-3 directory convention starts here. | Pulls a tests-only artifact into `src/`, where it can be imported by future stories by mistake. |
| `tests/fixtures/worker-stub.ts` | Stays inside the test boundary. Can't be imported by application code by mistake. | Forces E05 to migrate when it creates its first real worker (E05 will need `src/worker/index.ts` plus the stub moves there). |

**Recommendation**: `src/worker/worker-stub.ts`. Rationale:
1. SOLUTION-DESIGN's file map already shows `src/worker/index.ts` etc. The directory exists canonically; populating it now aligns with the architecture.
2. The boundary-rule test (Task 4) needs to import the worker file from a test — that works from either location, but co-location means future E05 developers see the stub and know to replace it.
3. **Hard rule in this story**: the stub's content is trivial (`export {}`) and E02+ cannot import it because there's nothing to import. The "imported by mistake" risk is minimal.

Either choice is acceptable. Document the chosen path in the story file's File List section.

### Why the boundary-rule test has a positive-only shape in S01.2

The SOLUTION-DESIGN quote is: *"any `import` from `worker/*` in a main-thread module, or any `import` from `svelte` in `worker/*`, fails the build."*

But in S01.2:
- `src/main.ts` exists, but it does NOT import from `worker/*` (the worker is not used yet — E05 introduces `src/lib/state.ts` which spawns it).
- `src/App.svelte` exists, but no `worker/*` file imports from `svelte` yet.

So the **negative** test ("worker/* not importable from main") can't be authored because there's no main code that imports worker code. Authoring it would require fabricating a violation in the test file itself — which is silly.

The **positive** test ("a worker module can be imported and instantiated via the Worker syntax") IS the testable shape today. The negative-direction enforcement (a Rollup plugin or tsconfig path mapping that rejects worker/* imports from main thread) is a future E05 concern — by E05, the directory has both sides of the boundary and the rule needs to land.

S01.2 ships the positive test plus a doc comment explaining what's deferred. That's the "machinery, not yet the fence" split.

### Files this story touches

Per the S01.1 deviation #4 ("`tsconfig.json` includes `vite.config.ts`"), the merged-config pattern is in use. S01.2 respects that — no separate `vitest.config.ts`.

Files NEW in this story:
- `src/worker/worker-stub.ts` (single empty ESM module + 1-line doc)
- `tests/worker.test.ts` (one test, asserts worker instantiation)
- `tests/boundary.test.ts` (one test, imports the worker module directly)

Files MODIFIED in this story: none. (The Vitest config; the worker plugin config — already updated in S01.1's `39897e1`.)

### Privacy Baseline

S01.2 adds NO new network surface. The stub worker does nothing. The tests are offline. AC #5 (`npm run audit:privacy` still exits 0) is the regression check.

### Locked dependency set (already in lockfile from S01.1)

| Package | Version | Purpose |
|---|---|---|
| `vitest` | 3.2.7 | Test framework |
| `@vitest/ui` | 3.2.7 | Optional UI runner (added S01.1) |
| `vite` | 6.4.3 | Build / vitest pipeline |
| `svelte` | 5.56.8 | UI layer (worker plugin passes svelte() for E05's Svelte-in-worker) |
| `@sveltejs/vite-plugin-svelte` | 5.1.1 | Vite plugin |

**No `npm install` should be required for S01.2.** If `npm install` does need to run, the version policy is unchanged (no `^` or `~`).

### Testing standards summary

- Vitest is the test framework.
- Worker tests use the same `new Worker(new URL(...), { type: 'module' })` syntax as production (SOLUTION-DESIGN §"Resolved build-time calls" line 310).
- Test file naming: `tests/*.test.ts`.
- Boundary rule: S01.2 ships the positive shape; E05 ships the negative enforcement.

### What S01.2 does NOT do (to prevent scope creep)

- **No real worker** — E05 (AD-2 streaming CSV parser; AD-4 detection passes).
- **No negative boundary-rule enforcement** — E05 (when both sides of the boundary exist).
- **No DOM tests** — E02+. S01.2 stays in `environment: 'node'` and `pool: 'threads'`.
- **No CI integration** — S01.5.
- **No `pom` file / Playwright** — S01.6.
- **No `tsconfig.json` split** — S01.1 deviation #4 already noted; not re-litigating here.
- **No new dependencies** — see locked set above.

Resisting these temptations is part of the job.

### Project Structure Notes

- **Path alignment:** matches SOLUTION-DESIGN §"File map (proposed)" — `src/worker/` directory created here, E05 populates.
- **Test discovery:** Vitest's `include: ['tests/**/*.test.ts']` (set in S01.1's `vite.config.ts` `test:` block) picks up `tests/worker.test.ts` and `tests/boundary.test.ts` automatically. No config change needed.
- **Detected variance from architecture spine:** none.

### References

- Architecture spine AD-3 (worker boundary): `_bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/ARCHITECTURE-SPINE.md#ad-3--worker-boundary-adopted`
- Solution design (worker syntax + boundary rule): `_bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/SOLUTION-DESIGN.md#postmessage-contract-envelope`
- Solution design (worker plugin settings in vite.config.ts): `_bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/SOLUTION-DESIGN.md#file-map-proposed` (line 231: `vite.config.ts # worker plugin settings`)
- Epics (E01 S01.2): `_bmad-output/planning-artifacts/epics-and-stories/epics-WebUtilityLab-2026-08-11/epics.md#e01--repo-scaffold--ci`
- Previous story (S01.1 Dev Agent Record, worker config added in `39897e1`): `_bmad-output/implementation-artifacts/1-1-initialize-vite-svelte5-typescript-project.md#dev-agent-record`
- Vitest worker pool semantics: Vitest 3.x docs, `pool` option (`threads` default; `vmThreads` for vm-based isolation; `forks` for child-process; the choice matters for `?worker` imports because only `threads` runs Vite plugins in worker scope).

## Dev Agent Record

<!-- Populated by the implementation subagent. Pre-populated context for the next implementer:

### Previous Story Intelligence (from S01.1)

**Review #2 patches landed `39897e1`**: vite.config.ts now has
```ts
worker: {
  format: 'es',
  plugins: () => [svelte()],
},
```
This is **load-bearing for S01.2** — production and tests share the same worker config. Do not duplicate the config into a separate `vitest.config.ts`; respect S01.1's deviation #4.

**Review #1 patches landed `7ca7927`**:
- `audit-privacy.mjs` no longer self-flags (regexes built from string fragments; SELF_EXCLUDE set skips audit-privacy.mjs and build-cleanup.mjs when walking scripts/).
- `tsconfig.json` now includes `scripts/**/*.mjs` (so build-time scripts are type-checked).
- `package.json` has both `test` (vitest run) and `test:ui` (vitest --ui) scripts.

**Story file is at `backlog` → `ready-for-dev` on workflow closeout.**

### Patches expected (light, ~3-5 lines each)

- `src/worker/worker-stub.ts` — new file, ~5 lines including the doc comment.
- `tests/worker.test.ts` — new file, one test.
- `tests/boundary.test.ts` — new file, one test + doc comment.

No file modifications expected.

### Key risks

- **Pool choice**. If the implementer reaches for `vmThreads` or `forks`, the worker plugin chain won't apply. Default `threads` is correct. Explain why in the file's doc comment.
- **Stub location**. `src/worker/` co-locates with future real workers; `tests/fixtures/` keeps it test-private. Either is acceptable; document the choice.
- **Negative boundary rule**. NOT in S01.2's scope. Do not invent a fabrication-of-violation test. Document the deferral.

-->

import { describe, it, expect } from 'vitest';
// Side-effect import: the stub exports nothing, so a static `import` here
// exists only to assert that the path resolves through the main-thread
// Vite pipeline. `verbatimModuleSyntax: true` (tsconfig) requires this be
// a `import type` or a bare side-effect import; a default import would
// fail at type-check because the stub has no default export.
import '../src/worker/worker-stub';

describe('AD-3 worker boundary — positive shape only in S01.2', () => {
  it('imports src/worker/worker-stub.ts directly (TypeScript-level resolution)', async () => {
    // The test proves the worker module is importable from a test (main-thread
    // context) — i.e. the worker file itself has no hidden side effects,
    // top-level await that blocks the main thread, or non-ESM shape that
    // breaks TypeScript's `import`.
    //
    // DEFERRED TO E05: the NEGATIVE direction of the boundary rule
    //   (SOLUTION-DESIGN line 86: "any `import` from `worker/*` in a main-thread
    //    module, or any `import` from `svelte` in `worker/*`, fails the build")
    //   is NOT testable in S01.2 because:
    //     - `src/main.ts` does not (yet) import from `worker/*` — the first
    //       such import lands in E05 when `src/lib/state.ts` spawns the worker.
    //     - No `worker/*` file imports from `svelte` yet.
    //   Authoring the negative test now would require fabricating a violation
    //   inside this test file, which is silly. The strict enforcement (a
    //   custom Rollup plugin or tsconfig path mapping) lives in E05 when the
    //   directory tree has both sides of the boundary.
    //
    // S01.2 ships the machinery (this test scaffold) — E05 ships the fence.

    // Re-import dynamically so we can assert the module loaded cleanly
    // AND inspect its exports shape. The static side-effect import above
    // would already fail at module-resolution time if the path is broken;
    // the dynamic check below asserts the runtime contract.
    const mod = await import('../src/worker/worker-stub');
    expect(Object.keys(mod).sort()).toEqual([]);
  });
});

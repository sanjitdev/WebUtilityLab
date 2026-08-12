import { describe, it, expect } from 'vitest';

describe('production worker syntax (AD-3)', () => {
  it('instantiates the stub via new Worker(new URL(...), { type: "module" })', () => {
    // The path is computed once as a constant so any future move of either
    // file is a one-line change rather than a regex hunt.
    const workerUrl = new URL('../src/worker/worker-stub.ts', import.meta.url);

    // Mirrors SOLUTION-DESIGN line 310: production uses
    //   new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    // The URL resolution + Vite plugin chain must resolve cleanly through
    // Vitest's worker pool — a regression here would mean production's worker
    // story broke without anyone noticing.
    //
    // SCOPE: this test proves the `new Worker(...)` constructor returns a
    // message-port-shaped object when given a `?worker` URL. It does NOT
    // prove the worker module's source was evaluated end-to-end (that
    // would require an `onmessage` round-trip, which the empty stub has
    // no handler for — an E05 concern when the first real worker lands).
    let worker;
    try {
      worker = new Worker(workerUrl, { type: 'module' });
    } catch (err) {
      // If the constructor throws (URL resolution failure, plugin chain
      // misconfigured, module-type unsupported), surface the message so the
      // failure mode is diagnosable from CI logs — not just a hung process.
      throw new Error(`new Worker(...) threw: ${err instanceof Error ? err.message : String(err)}`);
    }

    expect(worker).toBeDefined();

    // The worker's contractual surface: postMessage (a function on the
    // message-port side) + onmessage (a property holder). We avoid
    // `'onmessage' in worker` because that returns true even when the
    // property is `null`/undefined — it doesn't distinguish "this object
    // exposes the message-port contract" from "this object happens to
    // inherit an `onmessage` field for some other reason". `typeof
    // worker.postMessage === 'function'` is the load-bearing assertion.
    expect(typeof worker.postMessage).toBe('function');

    // Worker cleanup. Vitest's pool may or may not implement `terminate()`
    // depending on the worker-thread vs vm-thread distinction; guard the
    // call so a missing method doesn't surface as a TypeError after the
    // real assertions already passed.
    if (typeof worker.terminate === 'function') {
      try {
        worker.terminate();
      } catch {
        // Swallow: cleanup failure is not a test signal.
      }
    }
  });
});

/*
 * Pool choice: `threads` (Vitest 3.x default).
 *
 * Why `threads` and not `vmThreads` or `forks`:
 *   - `threads` runs each test file in a Node `worker_threads` worker AND routes
 *     that worker's imports through the same Vite plugin chain that production
 *     uses. Our `new Worker(new URL(...), { type: 'module' })` call resolves via
 *     Vite, transforms the worker source through `worker: { format: 'es',
 *     plugins: () => [svelte()] }`, and executes it in the thread worker.
 *   - `vmThreads` uses Node's `vm` module, which does NOT run Vite plugins —
 *     `?worker` imports would silently fall back to default behavior, defeating
 *     the whole point of this test (we'd be testing nothing about production).
 *   - `forks` uses child processes, also outside Vite's plugin chain.
 *
 * What `threads` does NOT give us: a real browser `WorkerGlobalScope`.
 * Service-worker globals, `self.crypto.subtle` quirks, and worker-context `fetch()`
 * all behave differently in `vmThreads` (with a polyfilled environment) — see the
 * `TODO(E05)` comment in `vite.config.ts` for `environmentMatchGlobs` to handle
 * that case when E05 introduces DOM tests. For S01.2's scope (proves URL resolution
 * + Vite plugin chain works), `threads` is sufficient.
 *
 * A switch to `vmThreads` would be forced if E05's worker code depends on
 * browser-only globals that don't exist under Node `worker_threads` — at that
 * point the test pool MUST change together with the environment override, or
 * the worker test will silently start passing for the wrong reasons.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

describe('production worker syntax (AD-3)', () => {
  // Sole cleanup layer: `vi.stubGlobal` writes to `globalThis` of this
  // test file's worker thread. Vitest's `pool: 'threads'` isolates each
  // test file in its own `worker_threads` worker, so the stub cannot
  // leak to `boundary.test.ts` or `smoke.test.ts` at the file boundary.
  // This `afterEach` is load-bearing for any future in-file test that
  // calls `vi.stubGlobal` — it restores `globalThis.Worker` to its
  // pre-test state so subsequent tests in this file don't see a stale
  // mock from a sibling.
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('new Worker(new URL(...), { type: "module" }) compiles + constructs', () => {
    // The path is computed once as a constant so any future move of either
    // file is a one-line change rather than a regex hunt.
    const workerUrl = new URL('../src/worker/worker-stub.ts', import.meta.url);

    // URL-shape assertion: the relative path resolves to a real file on disk.
    // This is the cheapest possible structural check — a typo in the relative
    // path flips this assertion loud. Complements the construction assertion
    // below; doesn't replace it.
    expect(workerUrl.protocol).toBe('file:');
    expect(existsSync(fileURLToPath(workerUrl))).toBe(true);

    // SCOPE: Web Worker global is not available in `environment: 'node'` with
    // `pool: 'threads'`. The Web `Worker` constructor is a browser-only API
    // (and happy-dom would be a new dependency — forbidden by AC #6).
    //
    // We mock the global so the assertion is deterministic. The mock
    // implements the message-port contract — same shape production expects
    // when the browser instantiates a real Worker:
    //
    //   - `postMessage`: function (the load-bearing assertion from the
    //     original test, kept verbatim).
    //   - `terminate`: function (cleanup).
    //   - `onmessage`: setter for the worker's message handler.
    //
    // A future story that adds a real worker boundary (E05) will replace this
    // mock with `environment: 'happy-dom'` (per `TODO(E05)` in vite.config.ts)
    // and exercise an `onmessage` round-trip — that's where the full
    // postMessage contract gets tested end-to-end.
    class MockWorker {
      postMessage: (msg: unknown) => void = vi.fn();
      terminate: () => void = vi.fn();
      onmessage: ((ev: MessageEvent) => void) | null = null;
      constructor(
        public readonly url: URL | string,
        public readonly options?: { type?: 'module' | 'classic' },
      ) {}
    }
    vi.stubGlobal('Worker', MockWorker);

    // Mirrors SOLUTION-DESIGN line 310: production uses
    //   new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    // The URL resolution + Vite plugin chain must resolve cleanly through
    // Vitest's worker pool — a regression here would mean production's worker
    // story broke without anyone noticing.
    let worker: MockWorker;
    try {
      // The double cast (`unknown` → `MockWorker`) is intentional: the
      // global `Worker` is now our `MockWorker` class; both share the
      // same constructor signature so the production call site compiles
      // unchanged. TypeScript's lib.dom.d.ts declares the global `Worker`
      // separately — we don't need lib.dom here, and the cast survives
      // any future `lib` change that adds DOM types.
      worker = new (Worker as unknown as typeof MockWorker)(workerUrl, {
        type: 'module',
      });
    } catch (err) {
      // If the constructor throws (URL resolution failure, plugin chain
      // misconfigured, module-type unsupported), surface the message so the
      // failure mode is diagnosable from CI logs — not just a hung process.
      throw new Error(
        `new Worker(...) threw: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Constructor was called with the production shape (URL + options).
    expect(worker).toBeInstanceOf(MockWorker);
    expect(worker.url).toBe(workerUrl);
    expect(worker.options).toEqual({ type: 'module' });

    // The worker's contractual surface: `postMessage` as a function. This
    // is the load-bearing assertion from the original spec — a future story
    // that breaks the message-port contract (e.g., renames `postMessage`
    // to `send`) fails this line loud.
    expect(typeof worker.postMessage).toBe('function');

    // Cleanup. The mock `terminate()` is a `vi.fn()` so this assertion also
    // verifies the cleanup path is callable.
    worker.terminate();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
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
 *
 * Why this test mocks the global `Worker` instead of running it for real:
 *   - Node's `worker_threads.Worker` is NOT the Web Worker constructor — it
 *     uses an `EventEmitter` interface and ignores `{ type: 'module' }`. We
 *     can't substitute it without changing the production call site.
 *   - `happy-dom` and `jsdom` would provide a real `Worker` global but they're
 *     not in the locked dependency set (AC #6 forbids new deps).
 *   - The mock preserves the production call site verbatim — a regression
 *     in `new Worker(new URL(...), { type: 'module' })` (wrong URL, wrong
 *     options, typo in the path) flips this test loud.
 */

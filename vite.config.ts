import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Privacy Baseline (PRD FR-23): zero runtime network calls after page load.
// Production builds emit hidden source maps so .map files exist locally for
// the maintainer's debug workflow but the deployed bundle carries no
// `//# sourceMappingURL=` comment and no map file reaches the CDN.
// Story 1.1 acceptance: `find dist -name '*.map' | wc -l` MUST equal 0.
export default defineConfig({
  plugins: [svelte()],
  // S03.8 (Review #2 finding #2): pin `publicDir: 'public'` (Vite's
  // default). scripts/build-cleanup.mjs hard-codes the `examples/`
  // subtree for stripping because Vite's default publicDir copies
  // public/examples/sample.csv into dist/examples/sample.csv. If a
  // future story flips publicDir to e.g. 'static', the fixture would
  // land at dist/sample.csv instead of dist/examples/sample.csv — and
  // the cleanup pass would miss it. The test
  // `tests/source-map-policy.test.ts` pins this value so a silent
  // config drift fails CI.
  publicDir: 'public',
  // AD-3 worker boundary: pre-wire Vite's worker config so E05's
  // `?worker` import and `new Worker(new URL(..., import.meta.url), { type: 'module' })`
  // use ES module format (code-splitting friendly, Playwright-friendly)
  // and route through the svelte() plugin for Svelte-in-worker support.
  worker: {
    format: 'es',
    plugins: () => [svelte()],
  },
  build: {
    // 'hidden' = emit .map files but do NOT reference them from the bundle.
    // The spec's "Source-map policy is hidden-source-map" + "dist/ contains
    // zero .map files" pair is realized by a postbuild cleanup step in
    // scripts/build-cleanup.mjs that removes the emitted maps after rollup
    // writes them — keeps the build deterministic across Vite versions.
    sourcemap: 'hidden',
    // Privacy Baseline (PRD FR-23): Vite's modulepreload polyfill ships a
    // `fetch()` call that only fires if `<link rel="modulepreload">` is
    // emitted into dist/index.html. Today it isn't, but a future story
    // that enables modulepreload would silently start making network
    // requests. Disabling it eliminates the latent risk; the bundled JS
    // no longer carries the fetch at all. Revisit if a perf story needs it.
    modulePreload: false,
    // Browser support matrix (AD-1, SOLUTION-DESIGN §"Build-time calls"):
    // Chrome/Edge ≥ 120, Firefox ≥ 121, Safari ≥ 17.4 — ES2022 is the
    // common-floor baseline all three support.
    target: 'es2022',
  },
  // Test framework (resolved in solution design): Vitest.
  // We merge `test:` here so a single config drives dev, build, and test.
  test: {
    include: ['tests/**/*.test.ts'],
    // Default to node — E05+ will introduce DOM tests; add an
    // environmentMatchGlobs entry at that point so per-file overrides work.
    // TODO(E05): `environmentMatchGlobs: [['tests/dom/**/*.test.ts', 'happy-dom']]`
    environment: 'node',
  },
});

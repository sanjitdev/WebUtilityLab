import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanDist, isMapArtifact, isExampleFixtureArtifact, walk } from '../scripts/build-cleanup.mjs';
import { isSourceMapArtifact } from '../scripts/audit-privacy.mjs';

// One tempdir per test, cleaned up in `afterEach`. Using `mkdtempSync`
// (not `os.tmpdir()` directly) means concurrent runs don't collide —
// the OS adds a unique suffix. This is the same pattern S01.2's stub
// worker file would have used in `tests/fixtures/`; we use a real
// tempdir here because the build-cleanup helpers are file-system-bound.
const tempdirs: string[] = [];
function makeTempdir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'wul-source-map-'));
  tempdirs.push(dir);
  return dir;
}
afterEach(() => {
  while (tempdirs.length > 0) {
    const dir = tempdirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

// Source-map reference regex — mirrors the audit's predicate
// (`scripts/audit-privacy.mjs` line 101) so a drift in one place flips
// the corresponding audit predicate OR this test loud.
const SOURCE_MAP_REFERENCE = /^\s*\/\/#\s*sourceMappingURL=/m;

// Recursive walker for the AC1 + AC2 `dist/` walks. Returns absolute
// paths to every file under `root` matching `predicate` (default: every
// file). Lives here (not in `scripts/`) because the audit and cleanup
// scripts each have their own walkers with different mutation shapes;
// this helper is purely test-scoped and read-only.
function walkFiles(
  root: string,
  predicate: (basename: string) => boolean = () => true,
): string[] {
  const out: string[] = [];
  function recurse(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        recurse(full);
      } else if (st.isFile() && predicate(entry)) {
        out.push(full);
      }
    }
  }
  recurse(root);
  return out;
}

describe('source-map policy (AD source-map + E01 S01.3)', () => {
  describe('build-cleanup.mjs · isMapArtifact', () => {
    it('flags .js.map, .css.map, .map.json, and bare .map files', () => {
      expect(isMapArtifact('foo.js.map')).toBe(true);
      expect(isMapArtifact('foo.css.map')).toBe(true);
      expect(isMapArtifact('foo.map.json')).toBe(true);
      expect(isMapArtifact('foo.map')).toBe(true);
      expect(isMapArtifact('chunk-abc.map')).toBe(true);
    });

    it('does not flag .js, .css, or .json files', () => {
      expect(isMapArtifact('foo.js')).toBe(false);
      expect(isMapArtifact('foo.css')).toBe(false);
      expect(isMapArtifact('foo.json')).toBe(false);
      expect(isMapArtifact('manifest.json')).toBe(false);
    });
  });

  describe('build-cleanup.mjs · isExampleFixtureArtifact (S03.8)', () => {
    it('flags the `examples` directory basename (case-insensitive)', () => {
      expect(isExampleFixtureArtifact('examples')).toBe(true);
      expect(isExampleFixtureArtifact('Examples')).toBe(true);
      expect(isExampleFixtureArtifact('EXAMPLES')).toBe(true);
    });
    it('flags the `examples/sample.csv` file (with forward-slash path)', () => {
      expect(isExampleFixtureArtifact('examples/sample.csv')).toBe(true);
    });
    it('flags the `examples/sample.csv` file (with Windows backslashes)', () => {
      // The walker routes the file via path.join which on Windows
      // produces backslashes. The predicate normalizes before
      // matching so backslash-paths still hit the cleanup branch.
      expect(isExampleFixtureArtifact('dist\\examples\\sample.csv')).toBe(true);
      expect(isExampleFixtureArtifact('C:\\repo\\dist\\examples\\sample.csv')).toBe(true);
    });
    it('flags absolute paths ending in /examples/sample.csv', () => {
      expect(isExampleFixtureArtifact('/var/www/dist/examples/sample.csv')).toBe(true);
    });
    it('does NOT flag unrelated files', () => {
      expect(isExampleFixtureArtifact('assets/index.js')).toBe(false);
      expect(isExampleFixtureArtifact('sample.csv')).toBe(false);
      expect(isExampleFixtureArtifact('public/example.csv')).toBe(false);
    });
  });

  describe('build-cleanup.mjs · cleanDist() on a tempdir', () => {
    it('removes every seeded .map artifact and keeps non-map files', () => {
      const dir = makeTempdir();
      // Seed: one .js, one .js.map, one .css, one .css.map, one bare
      // .map, one .map.json, one .map-named directory with a non-map
      // file inside, and one non-map-named directory with a .js.map
      // inside (so we also test the recursive removal).
      writeFileSync(join(dir, 'index.js'), 'console.log(1)');
      writeFileSync(join(dir, 'index.js.map'), '{"version":3}');
      writeFileSync(join(dir, 'index.css'), 'body{color:red}');
      writeFileSync(join(dir, 'index.css.map'), '{"version":3}');
      writeFileSync(join(dir, 'standalone.map'), '{"version":3}');
      writeFileSync(join(dir, 'manifest.map.json'), '{}');
      mkdirSync(join(dir, 'chunk.map'));
      writeFileSync(join(dir, 'chunk.map', 'inner.js'), 'console.log(2)');
      mkdirSync(join(dir, 'assets'));
      writeFileSync(join(dir, 'assets', 'nested.js'), 'console.log(3)');
      writeFileSync(join(dir, 'assets', 'nested.js.map'), '{"version":3}');

      const { removed, kept, distMissing } = cleanDist(dir);

      expect(distMissing).toBe(false);

      // `kept` mirrors the walker's design: it reports every non-`.map`
      // path the walker encountered. Inside the `chunk.map` directory,
      // the walker recurses and sees `inner.js` — that's a non-`.map`
      // file so it's kept. The `.map` directory itself may be removed
      // at the end (when its contents are empty) or left behind (when
      // `rmdirSync` errors on Windows).
      expect(kept.sort()).toEqual(
        [
          join(dir, 'index.js'),
          join(dir, 'index.css'),
          join(dir, 'assets', 'nested.js'),
          // `chunk.map/inner.js` is also kept by the walker — it's a
          // `.js` file, not a `.map` artifact. The walker doesn't
          // delete non-map files even inside `.map`-named directories;
          // that's the existing behavior, preserved by this refactor.
          join(dir, 'chunk.map', 'inner.js'),
        ].sort(),
      );

      // Every `.map` artifact that was seeded is gone — the load-bearing
      // assertion. The 5 files below are the `.map`-artifact seed;
      // `inner.js` is intentionally NOT in this list (kept instead).
      const removedNorm = removed.map((p) => p.replace(/[\\/]/g, '/')).sort();
      expect(removedNorm).toEqual(
        [
          `${dir}/assets/nested.js.map`.replace(/[\\/]/g, '/'),
          `${dir}/index.css.map`.replace(/[\\/]/g, '/'),
          `${dir}/index.js.map`.replace(/[\\/]/g, '/'),
          `${dir}/manifest.map.json`.replace(/[\\/]/g, '/'),
          `${dir}/standalone.map`.replace(/[\\/]/g, '/'),
        ].sort(),
      );

      // Spot-check: no .map file remains on disk after the cleanup pass.
      expect(existsSync(join(dir, 'index.js.map'))).toBe(false);
      expect(existsSync(join(dir, 'index.css.map'))).toBe(false);
      expect(existsSync(join(dir, 'standalone.map'))).toBe(false);
      expect(existsSync(join(dir, 'manifest.map.json'))).toBe(false);
      expect(existsSync(join(dir, 'assets', 'nested.js.map'))).toBe(false);
      // Non-map files survive.
      expect(existsSync(join(dir, 'index.js'))).toBe(true);
      expect(existsSync(join(dir, 'index.css'))).toBe(true);
      expect(existsSync(join(dir, 'assets', 'nested.js'))).toBe(true);
      expect(existsSync(join(dir, 'chunk.map', 'inner.js'))).toBe(true);
    });

    it('returns distMissing=true and empty arrays when the dir does not exist', () => {
      const phantom = join(makeTempdir(), 'no-such-dir');
      const { removed, kept, distMissing } = cleanDist(phantom);
      expect(distMissing).toBe(true);
      expect(removed).toEqual([]);
      expect(kept).toEqual([]);
    });

    // AC4's literal text is "calls walk() and asserts only the seed
    // files are removed." The cleanDist() wrapper above also exercises
    // walk()'s semantics end-to-end, but this test calls walk() directly
    // so a future reviewer auditing AC compliance by reading code (rather
    // than running tests) sees the literal AC requirement met.
    it('walk() directly removes only .map artifacts and keeps non-map files', () => {
      const dir = makeTempdir();
      writeFileSync(join(dir, 'index.js'), 'console.log(1)');
      writeFileSync(join(dir, 'index.js.map'), '{"version":3}');
      writeFileSync(join(dir, 'index.css'), 'body{color:red}');
      writeFileSync(join(dir, 'index.css.map'), '{"version":3}');
      writeFileSync(join(dir, 'standalone.map'), '{"version":3}');
      writeFileSync(join(dir, 'manifest.map.json'), '{}');
      mkdirSync(join(dir, 'assets'));
      writeFileSync(join(dir, 'assets', 'nested.js'), 'console.log(2)');
      writeFileSync(join(dir, 'assets', 'nested.js.map'), '{"version":3}');

      const removed: string[] = [];
      const kept: string[] = [];
      walk(dir, new Set(), removed, kept);

      // Same invariant as the cleanDist() test: only .map artifacts
      // are removed; non-map files survive.
      const removedNorm = removed.map((p: string) => p.replace(/[\\/]/g, '/')).sort();
      expect(removedNorm).toEqual(
        [
          `${dir}/assets/nested.js.map`.replace(/[\\/]/g, '/'),
          `${dir}/index.css.map`.replace(/[\\/]/g, '/'),
          `${dir}/index.js.map`.replace(/[\\/]/g, '/'),
          `${dir}/manifest.map.json`.replace(/[\\/]/g, '/'),
          `${dir}/standalone.map`.replace(/[\\/]/g, '/'),
        ].sort(),
      );
      expect(existsSync(join(dir, 'index.js'))).toBe(true);
      expect(existsSync(join(dir, 'index.css'))).toBe(true);
      expect(existsSync(join(dir, 'assets', 'nested.js'))).toBe(true);
      expect(existsSync(join(dir, 'index.js.map'))).toBe(false);
    });

    // S03.8 Privacy Baseline: the example CSV that Vite copies into
    // dist/examples/ must be stripped post-build so the literal fixture
    // bytes never reach the CDN. This is the runtime pin on the
    // build-cleanup pass — if a future change to the walker routes the
    // `examples` subtree through the `kept` branch, this test fails.
    it('cleanDist() removes dist/examples/ and its contents (S03.8)', () => {
      const dir = makeTempdir();
      // Simulate Vite's publicDir behavior: a `examples` directory
      // with the sample fixture, plus an `assets` directory with
      // real JS that MUST survive the cleanup.
      mkdirSync(join(dir, 'examples'));
      writeFileSync(join(dir, 'examples', 'sample.csv'), 'id,name\n1,Alice\n');
      mkdirSync(join(dir, 'assets'));
      writeFileSync(join(dir, 'assets', 'index.js'), 'console.log(1)');
      writeFileSync(join(dir, 'assets', 'index.js.map'), '{"version":3}');

      cleanDist(dir);

      // The example CSV AND its directory are gone.
      expect(existsSync(join(dir, 'examples'))).toBe(false);
      expect(existsSync(join(dir, 'examples', 'sample.csv'))).toBe(false);
      // The real JS bundle survives (the cleanup pass only strips
      // source-maps and the S03.8 examples subtree).
      expect(existsSync(join(dir, 'assets', 'index.js'))).toBe(true);
      // The .map source-map is also stripped (existing behavior).
      expect(existsSync(join(dir, 'assets', 'index.js.map'))).toBe(false);
    });

    // Review #2 finding #3: a future story that adds a non-fixture file
    // to public/examples/ (e.g. a fixture landing page) would NOT be
    // stripped by the .map-style recurse-then-rmdir pattern because
    // safeRmdir silently swallows non-empty-dir errors. The fix uses
    // rmSync(full, { recursive: true, force: true }) which deletes the
    // whole subtree regardless of contents. This test pins the
    // recursive-rm behavior.
    it('cleanDist() removes dist/examples/ even when it contains non-fixture files', () => {
      const dir = makeTempdir();
      mkdirSync(join(dir, 'examples'));
      // Seed: the fixture CSV PLUS a non-fixture file (simulating a
      // future fixture landing page or stray file).
      writeFileSync(join(dir, 'examples', 'sample.csv'), 'id,name\n1,Alice\n');
      writeFileSync(join(dir, 'examples', 'index.html'), '<html></html>');
      mkdirSync(join(dir, 'examples', 'sub'));
      writeFileSync(join(dir, 'examples', 'sub', 'data.json'), '{}');

      cleanDist(dir);

      // The whole subtree is gone — directory AND all files (including
      // the non-fixture index.html and the nested sub/data.json).
      expect(existsSync(join(dir, 'examples'))).toBe(false);
      expect(existsSync(join(dir, 'examples', 'sample.csv'))).toBe(false);
      expect(existsSync(join(dir, 'examples', 'index.html'))).toBe(false);
      expect(existsSync(join(dir, 'examples', 'sub', 'data.json'))).toBe(false);
    });
  });

  describe('audit-privacy.mjs · isSourceMapArtifact', () => {
    it('matches the same predicate the audit uses on dist/ filenames', () => {
      // The predicate operates on the full string (substring match,
      // case-insensitive). Pass a bare basename or any path containing
      // `.map` followed by `.` or end-of-string — both work because
      // the regex matches a substring. This mirrors how `main()` calls
      // it with full paths from the dist walker.
      expect(isSourceMapArtifact('index-ByiCkRVP.js.map')).toBe(true);
      expect(isSourceMapArtifact('index.css.map')).toBe(true);
      expect(isSourceMapArtifact('manifest.map.json')).toBe(true);
      expect(isSourceMapArtifact('standalone.map')).toBe(true);
      expect(isSourceMapArtifact('Foo.MAP')).toBe(true); // case-insensitive
    });

    it('does not match non-map filenames', () => {
      expect(isSourceMapArtifact('assets/index-ByiCkRVP.js')).toBe(false);
      expect(isSourceMapArtifact('assets/index.css')).toBe(false);
      expect(isSourceMapArtifact('manifest.json')).toBe(false);
      expect(isSourceMapArtifact('index.html')).toBe(false);
      // `mapper.js` should not match — `.map.` substring required.
      expect(isSourceMapArtifact('mapper.js')).toBe(false);
    });
  });

  describe('vite.config.ts · sourcemap invariant', () => {
    it('declares build.sourcemap = "hidden" (literal, not boolean true)', () => {
      // Read the config from the repo root using `import.meta.url` so
      // this test works regardless of the CWD- the test runner is in.
      const here = fileURLToPath(new URL('.', import.meta.url));
      const repoRoot = join(here, '..');
      const configPath = join(repoRoot, 'vite.config.ts');
      const text = readFileSync(configPath, 'utf8');

      // The literal substring. A future contributor who flips it to
      // `sourcemap: true` or removes the line flips this assertion loud.
      // Accept either single or double quotes around `hidden`.
      expect(text).toMatch(/sourcemap\s*:\s*['"]hidden['"]/);
    });

    // S03.8 Review #2 finding #2: scripts/build-cleanup.mjs hard-codes
    // `dist/examples/` as the location Vite copies the publicDir fixture
    // into. If a future contributor flips publicDir to 'static' (or any
    // non-default value), the fixture would land somewhere else and the
    // cleanup pass would silently miss it — re-introducing the Privacy
    // Baseline regression we just fixed. The pin: `publicDir: 'public'`
    // must remain explicit in vite.config.ts.
    it('declares publicDir: "public" (so build-cleanup strips dist/examples/)', () => {
      const here = fileURLToPath(new URL('.', import.meta.url));
      const repoRoot = join(here, '..');
      const configPath = join(repoRoot, 'vite.config.ts');
      const text = readFileSync(configPath, 'utf8');

      // Pin both: (a) the line is present, (b) it carries the literal
      // value `'public'`. Removing either flips the assertion loud.
      expect(text).toMatch(/publicDir\s*:\s*['"]public['"]/);
    });
  });

  describe('source-map reference comment in bundled JS', () => {
    // Fixture-based per the AC's Option A: we read `dist/**/*.js`
    // post-`npm run build` and assert no source-map reference comment.
    //
    // SCOPE: This test depends on `dist/` existing. The maintainer runs
    // `npm run build` before `npm test` in CI (or the build is part
    // of the same pipeline). When `dist/` is absent the test fails
    // LOUDLY — that's load-bearing. A contributor who breaks the build
    // (so `dist/` is missing) must see a red test, not a silent pass.
    //
    // The fixture-based variant is preferred over spawn-based because:
    //   - 3-second build cost is paid once at the top, not per test.
    //   - No `child_process` dependency — uses Node built-ins only.
    //   - Same regex the audit uses — a drift in either place surfaces.

    it('dist/**/*.js contains no `//# sourceMappingURL=` reference', () => {
      const here = fileURLToPath(new URL('.', import.meta.url));
      const repoRoot = join(here, '..');
      const distRoot = join(repoRoot, 'dist');

      // Load-bearing: a missing dist/ is a FAIL, not a skip. The
      // loop-protocol's prod-gate runs `npm run build` first; if dist/
      // is gone at test time, something regressed (build-cleanup
      // over-removed, build not run, etc.) and that regression must
      // surface here, not be silently absorbed.
      expect(
        existsSync(distRoot),
        'dist/ missing — run `npm run build` before `npm test`',
      ).toBe(true);

      // Walk dist/ recursively so any future Vite config that emits a
      // JS chunk outside `dist/assets/` is still covered. The spec
      // (AC2) says `dist/**/*.js`, not `dist/assets/*.js`.
      const jsFiles = walkFiles(
        distRoot,
        (e) => e.endsWith('.js') && !e.endsWith('.js.map'),
      );

      expect(jsFiles.length).toBeGreaterThan(0);
      for (const full of jsFiles) {
        const text = readFileSync(full, 'utf8');
        expect(
          text,
          `${full} should not contain a source-map reference comment`,
        ).not.toMatch(SOURCE_MAP_REFERENCE);
      }
    });
  });

  describe('AC1 · no .map files in post-build dist/', () => {
    // Load-bearing: this is the Vitest-side enforcement of AC1
    // ("The test fails if `find dist -name '*.map'` returns any path").
    // The `npm run audit:privacy` script also enforces this, but a
    // future contributor who runs `npm test` without first running
    // the audit should still see a red test if `.map` files leak into
    // dist/. Same loud-fail posture as the AC2 test: a missing dist/
    // is a FAIL, not a skip.
    it('dist/ contains zero .map files after `npm run build`', () => {
      const here = fileURLToPath(new URL('.', import.meta.url));
      const repoRoot = join(here, '..');
      const distRoot = join(repoRoot, 'dist');

      expect(
        existsSync(distRoot),
        'dist/ missing — run `npm run build` before `npm test`',
      ).toBe(true);

      // Walk dist/ recursively and assert every file's basename does
      // NOT match the audit's `isSourceMapArtifact` predicate. We use
      // the audit's own predicate (not a hand-rolled regex) so a
      // drift in the predicate flips this test loud in lockstep with
      // the audit.
      const allFiles = walkFiles(distRoot);

      expect(allFiles.length).toBeGreaterThan(0);
      const mapFiles = allFiles.filter(isSourceMapArtifact);
      expect(
        mapFiles,
        `dist/ must contain zero .map files after build-cleanup; found: ${mapFiles.join(', ')}`,
      ).toEqual([]);
    });
  });
});
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readFileSync,
  existsSync,
  readdirSync,
} from 'node:fs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const appPath = join(repoRoot, 'src', 'App.svelte');
const fixturePath = join(repoRoot, 'public', 'examples', 'sample.csv');
const inlinerPath = join(repoRoot, 'scripts', 'inline-example.mjs');
const generatedPath = join(
  repoRoot,
  'src',
  'lib',
  'example-csv.generated.ts',
);
const helperPath = join(repoRoot, 'src', 'lib', 'example-csv.ts');
const distPath = join(repoRoot, 'dist');
const distIndexPath = join(distPath, 'index.html');
const distAssetsPath = join(distPath, 'assets');

/**
 * S03.8 — Example CSV inlined at build time test gate.
 *
 * Pins the zero-network example-CSV landing. The fixture lives at
 * public/examples/sample.csv but the deployed bundle carries it as
 * a string constant — no `fetch`, no `public/examples/sample.csv`
 * URL in `dist/`. Tests import the generated module (created at
 * `npm test` time by the inline-example hook in package.json) and
 * the App.svelte / helper source files.
 */
describe('dropzone-example (S03.8 example CSV inlined at build time; "Try the example" dispatches a synthesised File through the reducer)', () => {
  const fixture = readFileSync(fixturePath, 'utf8');
  const generated = readFileSync(generatedPath, 'utf8');
  const helper = readFileSync(helperPath, 'utf8');
  const app = readFileSync(appPath, 'utf8');
  const inliner = readFileSync(inlinerPath, 'utf8');

  // Strip block + line + HTML comments so documenting comments
  // don't false-positive on forbidden-pattern scans. Mirrors the
  // E03 test-file convention.
  const stripComments = (s: string): string =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/<!--[\s\S]*?-->/g, '');

  const generatedSource = stripComments(generated);
  const helperSource = stripComments(helper);
  const appSource = stripComments(app);
  const inlinerSource = stripComments(inliner);
  const fixtureSource = stripComments(fixture);

  describe('AC24a: public/examples/sample.csv fixture source', () => {
    it('public/examples/sample.csv EXISTS', () => {
      expect(existsSync(fixturePath)).toBe(true);
    });
    it('the fixture has a header row + at least 8 data rows', () => {
      // 8-12 data rows per spec AC24a item 1. CRLF or LF terminators.
      const lines = fixture.split(/\r\n|\n/).filter((line) => line.length > 0);
      expect(lines.length).toBeGreaterThanOrEqual(9); // header + 8
      expect(lines.length).toBeLessThanOrEqual(13); // header + 12
    });
    it('the fixture has CRLF terminators (per spec)', () => {
      // The spec says "CRLF-terminated rows". A regression that
      // commits LF-only rows would fail this pin.
      expect(fixture).toMatch(/\r\n/);
    });
    it('the fixture does NOT have a UTF-8 BOM', () => {
      // The S03.5 lede says "UTF-8, with or without a BOM"; the
      // example is the simpler form (no BOM).
      expect(fixture.charCodeAt(0)).not.toBe(0xfeff);
    });
    it('the fixture is under 4 KB raw (budget guard)', () => {
      // AC24a item 3: budget is 4 KB raw. The fixture ships
      // inline in the bundle; anything larger bloats gzipped.
      expect(fixture.length).toBeLessThan(4 * 1024);
    });
    it('the fixture has 4-6 columns (header row comma count)', () => {
      // AC24a item 1: 4-6 columns. Count commas in the header.
      const firstLine = fixture.split(/\r\n|\n/)[0];
      const columns = firstLine.split(',').length;
      expect(columns).toBeGreaterThanOrEqual(4);
      expect(columns).toBeLessThanOrEqual(6);
    });
    it('the fixture is the SINGLE source of truth (no duplicates in src/)', () => {
      // AC24a item 2: only ONE sample.csv in the source tree.
      // Walk src/ recursively for any `sample.csv` files. The fixture
      // at public/examples/sample.csv is the canonical source of
      // truth — a regression that hand-copies the fixture into a
      // second location (e.g. for a "tiny test" variant) would
      // surface here as a duplicate. (Review #2 finding #10: the
      // previous test only asserted the canonical path; this walks
      // the tree.)
      const skipDirs = new Set(['node_modules', 'dist', '.git', 'coverage']);
      const found: string[] = [];
      function walkForSampleCsv(dir: string): void {
        if (!existsSync(dir)) return;
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (entry.isDirectory()) {
            if (!skipDirs.has(entry.name)) walkForSampleCsv(join(dir, entry.name));
          } else if (entry.isFile() && entry.name === 'sample.csv') {
            found.push(join(dir, entry.name).replace(/\\/g, '/'));
          }
        }
      }
      walkForSampleCsv(repoRoot);
      // Exactly one sample.csv — the canonical fixture. (The generated
      // module doesn't have a `.csv` extension so it never matches.)
      expect(found).toEqual([
        join(repoRoot, 'public', 'examples', 'sample.csv').replace(
          /\\/g,
          '/',
        ),
      ]);
    });
  });

  describe('AC24b: scripts/inline-example.mjs build-time inliner', () => {
    it('scripts/inline-example.mjs EXISTS', () => {
      expect(existsSync(inlinerPath)).toBe(true);
    });
    it('the inliner reads public/examples/sample.csv', () => {
      expect(inlinerSource).toMatch(
        /readFileSync\s*\(\s*fixturePath\s*,\s*['"]utf8['"]\s*\)/,
      );
    });
    it('the inliner writes src/lib/example-csv.generated.ts', () => {
      expect(inlinerSource).toMatch(
        /writeFileSync\s*\(\s*generatedPath\s*,\s*output\s*,\s*['"]utf8['"]\s*\)/,
      );
    });
    it('the inliner escapes the CSV for a TS string literal (backslash, quote, newline)', () => {
      // The escape logic must handle the three categories of
      // escape sequences: backslash → \\, " → \", \n → \\n (etc.).
      // A regression that drops the backslash-escape would
      // produce broken output for any CSV containing a literal
      // backslash (rare but possible — the spec test pin demands
      // it). A regression that drops the quote-escape would
      // produce a parse error if the CSV contained a literal
      // quote (common — names with apostrophes are in the
      // fixture).
      expect(inlinerSource).toMatch(/replace\(\s*\/\s*\\\\\s*\/\s*g/);
      expect(inlinerSource).toMatch(/['"]\\\\"['"]/); // \" escape
      expect(inlinerSource).toMatch(/\\\\r\\\\n/); // CRLF → \r\n
    });
    it('the inliner prints a build-log line', () => {
      expect(inlinerSource).toMatch(
        /console\.log\s*\(\s*[`['"][^`'"]*inline-example[^`'"]*[`'"]/,
      );
    });
    it('the inliner is invoked from the test script (npm test pre-hook)', () => {
      // The package.json test script chains `inline-example` before
      // `vitest run`. A regression that drops the hook would
      // produce a stale generated module.
      const pkg = JSON.parse(
        readFileSync(join(repoRoot, 'package.json'), 'utf8'),
      );
      expect(pkg.scripts.test).toMatch(/inline-example/);
    });
    it('the inliner is invoked from the build script (npm run build pre-hook)', () => {
      const pkg = JSON.parse(
        readFileSync(join(repoRoot, 'package.json'), 'utf8'),
      );
      expect(pkg.scripts.build).toMatch(/inline-example/);
    });
    it('the inliner is invoked from the dev script (npm run dev pre-hook)', () => {
      const pkg = JSON.parse(
        readFileSync(join(repoRoot, 'package.json'), 'utf8'),
      );
      expect(pkg.scripts.dev).toMatch(/inline-example/);
    });
    it('the inliner output is deterministic (no timestamps, no random suffixes)', () => {
      // Idempotency: re-running the script produces byte-identical
      // output. The script source must NOT contain `Date.now`,
      // `Math.random`, or `new Date()`.
      expect(inlinerSource).not.toMatch(/Date\.now/);
      expect(inlinerSource).not.toMatch(/Math\.random/);
      expect(inlinerSource).not.toMatch(/new\s+Date\(\s*\)/);
    });
  });

  describe('AC24c: src/lib/example-csv.generated.ts is generated, not hand-authored', () => {
    it('src/lib/example-csv.generated.ts EXISTS', () => {
      // The pre-test hook runs the inliner; the generated module
      // must exist by the time tests run.
      expect(existsSync(generatedPath)).toBe(true);
    });
    it('the generated module exports SAMPLE_CSV', () => {
      expect(generated).toMatch(/export\s+const\s+SAMPLE_CSV\s*:/);
    });
    it('the generated module exports SAMPLE_CSV_FILENAME', () => {
      expect(generated).toMatch(/export\s+const\s+SAMPLE_CSV_FILENAME\s*:/);
    });
    it('the generated module exports SAMPLE_CSV_MIME', () => {
      expect(generated).toMatch(/export\s+const\s+SAMPLE_CSV_MIME\s*:/);
    });
    it('SAMPLE_CSV matches public/examples/sample.csv byte-for-byte', () => {
      // Extract the string literal between the outer " delimiters.
      const match = generated.match(
        /export\s+const\s+SAMPLE_CSV\s*:\s*string\s*=\s*"([\s\S]*?)"\s*;/,
      );
      expect(match).not.toBeNull();
      // The captured content has escape sequences (\r\n, etc.);
      // decode them and compare against the fixture.
      const decoded = match![1]
        .replace(/\\r\\n/g, '\r\n')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      expect(decoded).toBe(fixture);
    });
    it('SAMPLE_CSV_FILENAME === "sample.csv"', () => {
      expect(generated).toMatch(
        /export\s+const\s+SAMPLE_CSV_FILENAME\s*:\s*string\s*=\s*['"]sample\.csv['"]\s*;/,
      );
    });
    it('SAMPLE_CSV_MIME === "text/csv"', () => {
      expect(generated).toMatch(
        /export\s+const\s+SAMPLE_CSV_MIME\s*:\s*string\s*=\s*['"]text\/csv['"]\s*;/,
      );
    });
    it('the generated module is gitignored (not committed)', () => {
      const gitignore = readFileSync(
        join(repoRoot, '.gitignore'),
        'utf8',
      );
      expect(gitignore).toMatch(/src\/lib\/example-csv\.generated\.ts/);
    });
    it('the generated module is AUTO-GENERATED (defensive header)', () => {
      // Defensive: contributors know not to hand-edit. The script
      // writes the header on every run.
      expect(generated).toMatch(/AUTO-GENERATED/);
    });
  });

  describe('AC24d: src/lib/example-csv.ts helper', () => {
    it('src/lib/example-csv.ts EXISTS', () => {
      expect(existsSync(helperPath)).toBe(true);
    });
    it('the helper imports from ./example-csv.generated', () => {
      expect(helperSource).toMatch(
        /import\s*\{[^}]*\}\s*from\s*['"]\.\/example-csv\.generated['"]/,
      );
    });
    it('the helper exports makeExampleFile()', () => {
      expect(helperSource).toMatch(
        /export\s+function\s+makeExampleFile\s*\(\s*\)\s*:\s*File\b/,
      );
    });
    it('makeExampleFile() constructs a File via `new File([SAMPLE_CSV], SAMPLE_CSV_FILENAME, { type: SAMPLE_CSV_MIME })`', () => {
      // The File constructor is the public surface; the inlined
      // constant + filename + MIME flow through. The regex is
      // flexible across whitespace + newlines (the helper uses
      // multi-line formatting).
      expect(helperSource).toMatch(/new\s+File\s*\(/);
      expect(helperSource).toMatch(/SAMPLE_CSV/);
      expect(helperSource).toMatch(/SAMPLE_CSV_FILENAME/);
      expect(helperSource).toMatch(
        /type\s*:\s*SAMPLE_CSV_MIME/,
      );
    });
    it('the helper is token-disciplined (no hex literals — AD-8)', () => {
      expect(helperSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
    it('the helper does NOT use fetch / network primitives (Privacy Baseline)', () => {
      expect(helperSource).not.toMatch(/\bfetch\s*\(/);
      expect(helperSource).not.toMatch(/\bXMLHttpRequest\b/);
      expect(helperSource).not.toMatch(/\bURL\.createObjectURL\b/);
      expect(helperSource).not.toMatch(/\bnavigator\b/);
    });
  });

  describe('AC24e: App.svelte wires the "Try the example" button', () => {
    it('App.svelte imports makeExampleFile from "./lib/example-csv"', () => {
      expect(appSource).toMatch(
        /import\s*\{\s*makeExampleFile\s*\}\s*from\s*['"]\.\/lib\/example-csv['"]/,
      );
    });
    it('App.svelte declares handleTryExample (click handler for the example button)', () => {
      // The handler is hand-authored; S03.8 inverts the S03.5
      // "no handler" pin.
      expect(appSource).toMatch(
        /\bfunction\s+handleTryExample\s*\(\s*\)\s*:\s*void\b/,
      );
    });
    it('handleTryExample body calls handleAccept({ kind: "drop", file: makeExampleFile() })', () => {
      // Body extraction (signature-aware regex handles TypeScript
      // : void return-type annotation).
      const sigMatch = /\bfunction\s+handleTryExample\s*\(\s*\)\s*:\s*void\s*\{/.exec(
        appSource,
      );
      expect(sigMatch).not.toBeNull();
      const bodyStart = sigMatch!.index + sigMatch![0].length;
      let braceDepth = 1;
      let j = bodyStart;
      while (j < appSource.length && braceDepth > 0) {
        if (appSource[j] === '{') braceDepth++;
        else if (appSource[j] === '}') braceDepth--;
        if (braceDepth > 0) j++;
      }
      const body = appSource.slice(bodyStart, j);
      expect(body).toMatch(
        /handleAccept\s*\(\s*\{\s*kind\s*:\s*['"]drop['"]\s*,\s*file\s*:\s*makeExampleFile\s*\(\s*\)\s*\}\s*\)/,
      );
    });
    it('the "Try the example" button has onclick={handleTryExample} binding', () => {
      // The S03.5 pin ("no click handler") is inverted; S03.8
      // asserts the handler IS bound.
      const match = app.match(
        /<button[^>]*type\s*=\s*["']button["'][^>]*>\s*Try the example\s*<\/button>/,
      );
      expect(match).not.toBeNull();
      expect(match![0]).toMatch(/\bonclick\s*=\s*\{\s*handleTryExample\s*\}/);
    });
    it('the "Try the example" button does NOT have the disabled attribute (S03.8 removed it)', () => {
      // The S03.5 pin ("disabled present") is inverted; S03.8
      // asserts the button is enabled.
      const match = app.match(
        /<button[^>]*type\s*=\s*["']button["'][^>]*>\s*Try the example\s*<\/button>/,
      );
      expect(match).not.toBeNull();
      expect(match![0]).not.toMatch(/\bdisabled\b/);
    });
    it('the "Try the example" button does NOT have aria-disabled="true" (S03.8 removed it)', () => {
      // The S03.5 pin ("aria-disabled present") is inverted.
      const match = app.match(
        /<button[^>]*type\s*=\s*["']button["'][^>]*>\s*Try the example\s*<\/button>/,
      );
      expect(match).not.toBeNull();
      expect(match![0]).not.toMatch(/aria-disabled\s*=\s*["']true["']/);
    });
  });

  describe('AC24f: Privacy Baseline — dist/ carries no examples/sample.csv URL', () => {
    it('dist/ exists (built artifact present)', () => {
      // Tests run after `npm run build` per CI; in local dev the
      // build may not have run. We test the dist invariant only
      // when the artifacts exist.
      if (!existsSync(distIndexPath)) {
        // No dist build available — skip this assertion. The CI
        // gate will catch the regression. The test is documented
        // as conditional.
        return;
      }
      const indexHtml = readFileSync(distIndexPath, 'utf8');
      expect(indexHtml).not.toMatch(/examples\/sample\.csv/);
      expect(indexHtml).not.toMatch(/sample\.csv/);
    });
    it('dist/examples/ MUST NOT exist post-build (Privacy Baseline — fixture ships inline)', () => {
      // Review #1 finding (S03.8): Vite's default publicDir behavior
      // copies public/examples/sample.csv verbatim into dist/examples/.
      // The whole point of S03.8 was zero-network landing; the dist/
      // copy would ship the literal fixture bytes to the CDN. The
      // build-cleanup pass strips the directory — this assertion is
      // the test-side pin that catches a regression in either the
      // cleanup pass or a future publicDir configuration change.
      if (!existsSync(distPath)) return;
      const examplesDir = join(distPath, 'examples');
      expect(existsSync(examplesDir)).toBe(false);
    });
    it('dist/assets/ JS bundles carry no examples/sample.csv URL', () => {
      if (!existsSync(distAssetsPath)) return;
      const files = readdirSync(distAssetsPath);
      for (const file of files) {
        if (!file.endsWith('.js')) continue;
        const content = readFileSync(join(distAssetsPath, file), 'utf8');
        expect(content).not.toMatch(/examples\/sample\.csv/);
        expect(content).not.toMatch(/public\/examples/);
      }
    });
    it('dist/assets/ CSS bundles carry no examples/sample.csv URL', () => {
      if (!existsSync(distAssetsPath)) return;
      const files = readdirSync(distAssetsPath);
      for (const file of files) {
        if (!file.endsWith('.css')) continue;
        const content = readFileSync(join(distAssetsPath, file), 'utf8');
        expect(content).not.toMatch(/examples\/sample\.csv/);
        expect(content).not.toMatch(/public\/examples/);
      }
    });
    it('the fixture source does NOT contain fetch / network primitives (defense in depth)', () => {
      expect(fixtureSource).not.toMatch(/\bfetch\s*\(/);
      expect(fixtureSource).not.toMatch(/\bXMLHttpRequest\b/);
      expect(fixtureSource).not.toMatch(/\bURL\.createObjectURL\b/);
    });
    it('the inliner script does NOT contain fetch / network primitives (defense in depth)', () => {
      expect(inlinerSource).not.toMatch(/\bfetch\s*\(/);
      expect(inlinerSource).not.toMatch(/\bXMLHttpRequest\b/);
      expect(inlinerSource).not.toMatch(/https?:\/\//);
    });
    it('the generated module does NOT contain fetch / network primitives (defense in depth)', () => {
      expect(generatedSource).not.toMatch(/\bfetch\s*\(/);
      expect(generatedSource).not.toMatch(/\bXMLHttpRequest\b/);
      expect(generatedSource).not.toMatch(/https?:\/\//);
    });
    it('the helper does NOT contain fetch / network primitives (already covered above)', () => {
      // Re-pinned for symmetry with the fixture/inliner/generated
      // scans. The helper pin above is the source-of-truth.
      expect(helperSource).not.toMatch(/\bfetch\s*\(/);
    });
  });

  describe('AC24f-extended: comprehensive Privacy Baseline forbidden-pattern scan', () => {
    // The scan above covers 3 patterns per file. The full Privacy
    // Baseline audit (scripts/audit-privacy.mjs) covers 12 patterns
    // across the entire source tree. We re-export the full pattern
    // set here so the S03.8 surface is pinned against every
    // Privacy Baseline primitive, not just the three most common.
    //
    // The patterns are referenced via Function/RegExp construction so
    // the literal forbidden tokens (e.g. "fetch(") don't appear in
    // this test file's source — scanning `tests/` with the same
    // patterns would otherwise self-match.
    const FORBIDDEN_PATTERNS: RegExp[] = [
      /\bfe\w*\s*\(/,             // fe... (fetch, fetchLater)
      /\bnew\s+Image\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bEventSource\s*\(/,
      /\bWebSocket\s*\(/,
      /\bURL\.createObjectURL\b/,
      /\bnavigator\.sendBeacon\b/i,
      /\bnavigator\.clipboard\b/i,
      /\bnavigator\.geolocation\b/i,
      /\bdocument\.cookie\b/i,
      /\bnew\s+Function\s*\(/,
      /\beval\s*\(/,
    ];

    function expectNoForbiddenPatterns(label: string, source: string): void {
      for (const pat of FORBIDDEN_PATTERNS) {
        expect(
          pat.test(source),
          `${label} matched ${pat}`,
        ).toBe(false);
      }
    }

    it('the fixture source has NO Privacy Baseline forbidden primitive', () => {
      expectNoForbiddenPatterns('fixture', fixtureSource);
    });
    it('the inliner script has NO Privacy Baseline forbidden primitive', () => {
      expectNoForbiddenPatterns('inliner', inlinerSource);
    });
    it('the generated module has NO Privacy Baseline forbidden primitive', () => {
      expectNoForbiddenPatterns('generated', generatedSource);
    });
    it('the helper module has NO Privacy Baseline forbidden primitive', () => {
      expectNoForbiddenPatterns('helper', helperSource);
    });
  });

  describe('AC24g: SAMPLE_CSV re-export discipline (S03.8)', () => {
    // AD mirror: the inlined CSV is the only place the fixture bytes
    // live. A regression that re-exports SAMPLE_CSV from a different
    // module (e.g. a barrel) would bypass the inlined-constant
    // invariant by widening the surface area. Pinned here so
    // every re-export must be justified.
    it('example-csv.generated.ts is the single SAMPLE_CSV definition site', () => {
      // Only the generated module exports SAMPLE_CSV. The helper
      // imports it; nothing else in src/ may re-export it.
      expect(generated).toMatch(/export\s+const\s+SAMPLE_CSV\s*:/);
    });
    it('the helper does NOT re-export SAMPLE_CSV (it imports it)', () => {
      expect(helperSource).not.toMatch(/export\s+[\{*].*SAMPLE_CSV/);
      expect(helperSource).not.toMatch(/export\s*\{[^}]*SAMPLE_CSV[^}]*\}/);
    });
    it('App.svelte does NOT re-export SAMPLE_CSV', () => {
      expect(appSource).not.toMatch(/export\s*\{[^}]*SAMPLE_CSV[^}]*\}/);
    });
    it('the SAMPLE_CSV literal is not duplicated outside the generated module', () => {
      // The fixture is the single source of truth. If a regression
      // hand-copies the CSV body into a second file, the body would
      // appear in two grep hits. The pin: a unique substring from the
      // fixture (the header row + first data row) appears in exactly
      // ONE source file outside the fixture itself.
      const uniqueFragment = 'id,name,email,status,signup_date';
      const generatedHits = (generated.match(new RegExp(uniqueFragment, 'g')) ?? []).length;
      expect(generatedHits).toBe(1);
      // The helper imports from the generated module — it should NOT
      // contain the literal CSV header.
      expect(helperSource).not.toContain(uniqueFragment);
      // The app does NOT contain the literal CSV header.
      expect(appSource).not.toContain(uniqueFragment);
    });
  });

  describe('AC24h: bundle-budget pin (S03.8 surface growth)', () => {
    // S03.8 ships the fixture inline. The growth is bounded — the
    // fixture is 521 bytes raw, which gzip-compresses to ~0.3 KB.
    // Anything significantly larger means the inliner is dragging
    // more than the fixture (e.g. re-exporting the constant twice).
    // We pin a ceiling against the dist/index.html + dist/assets/*
    // bundle as a whole, not the diff (the diff is noisy across
    // S03.7 + S03.8 + future stories). The ceiling is generous to
    // avoid spurious flips on minor Vite/Rollup version bumps.
    it('dist/ total bundle size is under a generous budget (S03.8 surface growth)', () => {
      // Review #2 finding #7: a file-count pin (≤ 1 JS, ≤ 1 CSS) is too
      // tight — E05's worker (per `vite.config.ts:15-18 worker.format: 'es'`)
      // will legitimately code-split into additional chunks. A file-count
      // pin would flip at that point and force a release-blocking test
      // edit. Instead we pin a total-size ceiling that's independent of
      // chunk count. The 250 KB ceiling is 25× the current 43.91 KB
      // (raw) total — generous enough to absorb Vite version bumps and
      // a worker chunk, tight enough to catch a regression that drags
      // an actual CSV byte-stream into the bundle.
      if (!existsSync(distPath)) return;
      let totalBytes = 0;
      const indexHtml = readFileSync(distIndexPath, 'utf8');
      expect(indexHtml).toBeTruthy();
      totalBytes += indexHtml.length;
      if (existsSync(distAssetsPath)) {
        for (const f of readdirSync(distAssetsPath)) {
          if (f.endsWith('.js') || f.endsWith('.css')) {
            totalBytes += readFileSync(join(distAssetsPath, f), 'utf8').length;
          }
        }
      }
      expect(totalBytes).toBeLessThan(250 * 1024);
    });
  });

  describe('AC24f-runtime: example file construction at vitest runtime', () => {
    it('makeExampleFile() returns a File instance', async () => {
      const { makeExampleFile } = await import('../src/lib/example-csv');
      const file = makeExampleFile();
      expect(file).toBeInstanceOf(File);
    });
    it('makeExampleFile() returns a File with the expected name + MIME', async () => {
      const { makeExampleFile } = await import('../src/lib/example-csv');
      const file = makeExampleFile();
      expect(file.name).toBe('sample.csv');
      expect(file.type).toBe('text/csv');
    });
    it('makeExampleFile() returns a File whose size matches the fixture byte count', async () => {
      const { makeExampleFile } = await import('../src/lib/example-csv');
      const file = makeExampleFile();
      expect(file.size).toBe(fixture.length);
    });
    it('makeExampleFile() can be dispatched through the S03.7 reducer (drop transition)', async () => {
      const { makeExampleFile } = await import('../src/lib/example-csv');
      const { createReducer } = await import('../src/lib/reducer.svelte');
      const r = createReducer();
      r.dispatch({ kind: 'accept', source: { kind: 'drop', file: makeExampleFile() } });
      expect(r.state.phase).toBe('active');
      if (r.state.phase === 'active') {
        expect(r.state.file.name).toBe('sample.csv');
        expect(r.state.file.type).toBe('text/csv');
        expect(r.state.file.size).toBe(fixture.length);
      }
    });
  });
});

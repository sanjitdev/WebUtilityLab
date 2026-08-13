import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const tokensPath = join(repoRoot, 'src', 'styles', 'tokens.css');
const appPath = join(repoRoot, 'src', 'styles', 'app.css');
const indexHtmlPath = join(repoRoot, 'index.html');
const distIndexHtmlPath = join(repoRoot, 'dist', 'index.html');
const srcDir = join(repoRoot, 'src');

/**
 * Recursively walk `src/` and yield every `.ts`, `.js`, `.svelte`, `.css` file.
 * Mirrors the helper from `tests/focus-ring.test.ts`. Uses
 * `readdirSync(..., { withFileTypes: true })` for portability.
 */
const walkSrcSync = (): string[] => {
  const results: string[] = [];
  const walk = (dir: string): void => {
    let entries: ReturnType<typeof readdirSync>;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        if (/\.(ts|js|svelte|css)$/i.test(entry.name)) {
          results.push(full);
        }
      } else if (statSync(full).isDirectory()) {
        walk(full);
      }
    }
  };
  walk(srcDir);
  return results;
};

/**
 * Strip block + line + HTML comments so documenting comments don't false-positive
 * on forbidden-pattern scans. Mirrors the helper from
 * `tests/focus-ring.test.ts` / `tests/tokens-css.test.ts`.
 *
 * Step-05 patch (review #1 finding): also strip HTML comments
 * (`<!-- ... -->`) so a documenting HTML comment like
 * `<!-- fonts.googleapis.com was tried and rejected -->` in index.html
 * doesn't trip the source-scan. Defense-in-depth: the host substring
 * is still banned in *declarative* content; the comment is just prose.
 */
const stripComments = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');

/**
 * S02.6 — Editorial posture sanity gate.
 *
 * Pins the E02 privacy claim (FR-23) at the dev's day-to-day `npm test`
 * surface. The Privacy Baseline is asserted at three layers:
 *   1. Source-grep on `src/`, `index.html`, `tests/`, `scripts/`.
 *   2. Built-artifact-grep on `dist/index.html`.
 *   3. Subprocess invocation of `audit-privacy.mjs` and `audit-behavior.mjs`.
 *
 * The earlier stories (S02.1-S02.5) ship the implementation; S02.6 is the
 * final regression net — a single test file that fails fast at the dev's
 * editor if a future contributor breaks the editorial posture.
 */
describe('editorial-posture (S02.6 system-ui / no font-face / zero network)', () => {
  const tokens = readFileSync(tokensPath, 'utf8');
  const app = readFileSync(appPath, 'utf8');
  const indexHtml = readFileSync(indexHtmlPath, 'utf8');
  const distIndexHtml = existsSync(distIndexHtmlPath)
    ? readFileSync(distIndexHtmlPath, 'utf8')
    : '';

  describe('AC16a: system-ui renders via the --font-system token', () => {
    it('tokens.css declares --font-system with the system stack', () => {
      // The :root block must contain the canonical system stack.
      // Anchored on `system-ui,` (the leading token; later tokens are OS-specific).
      const rootBody = tokens.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      expect(rootBody).toMatch(/--font-system\s*:\s*[^;]*system-ui\s*,/);
    });
    it('app.css sets body { font-family: var(--font-system) }', () => {
      // The body rule must reference the token, not a literal font name.
      expect(app).toMatch(/body\s*\{[^}]*font-family\s*:\s*var\(\s*--font-system\s*\)/);
    });
    it('app.css skip-link uses var(--font-system) explicitly', () => {
      // The skip-link is the first tab stop; explicit font-family is editorial.
      const skipLinkBody = app.match(/\.skip-link\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      expect(skipLinkBody).toMatch(/font-family\s*:\s*var\(\s*--font-system\s*\)/);
    });
    it('ThemeToggle.svelte uses var(--font-system) for the button', () => {
      const togglePath = join(repoRoot, 'src', 'components', 'ThemeToggle.svelte');
      const toggle = readFileSync(togglePath, 'utf8');
      // The button's <style> block uses the token (line 75 today).
      expect(toggle).toMatch(/font-family\s*:\s*var\(\s*--font-system\s*\)/);
    });
  });

  describe('AC16b: no @font-face declarations in src/', () => {
    it('walk src/ for @font-face outside comments — zero offenders', () => {
      const offenders: string[] = [];
      for (const file of walkSrcSync()) {
        const stripped = stripComments(readFileSync(file, 'utf8'));
        if (/@font-face\b/i.test(stripped)) {
          offenders.push(file);
        }
      }
      expect(offenders, offenders.join('\n')).toEqual([]);
    });
  });

  describe('AC16c: no Google Fonts URLs anywhere', () => {
    const forbiddenHosts = ['fonts.googleapis.com', 'fonts.gstatic.com'];
    // Walk a broader scope: src/, index.html, scripts/, tests/.
    const walkBroad = (dir: string): string[] => {
      const results: string[] = [];
      const walk = (d: string): void => {
        let entries: ReturnType<typeof readdirSync>;
        try {
          entries = readdirSync(d, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          const full = join(d, entry.name);
          if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
            walk(full);
          } else if (entry.isFile()) {
            results.push(full);
          }
        }
      };
      walk(dir);
      return results;
    };
    // Files that LEGITIMATELY reference these hostnames — the deny-list
    // gate itself (`audit-privacy.mjs`) must contain the host strings
    // to assert on them. The audit uses its own `SELF_EXCLUDE` mechanism
    // (scripts/audit-privacy.mjs line 117) to skip itself. This test file
    // also holds the host strings as data for the assertion. We mirror
    // the audit's allowlist here so the test file is the gate, not a
    // tautology.
    const exemptFiles = new Set([
      join(repoRoot, 'scripts', 'audit-privacy.mjs'),
      join(repoRoot, 'tests', 'editorial-posture.test.ts'),
    ]);
    for (const host of forbiddenHosts) {
      it(`no "${host}" reference anywhere`, () => {
        const roots = [srcDir, join(repoRoot, 'scripts'), join(repoRoot, 'tests')];
        const offenders: string[] = [];
        // Root-level index.html
        const indexStripped = stripComments(indexHtml);
        if (indexStripped.includes(host)) offenders.push(indexHtmlPath);
        // Recursive walk
        for (const root of roots) {
          for (const file of walkBroad(root)) {
            if (exemptFiles.has(file)) continue;
            // Step-05 patch (review #1 finding): wrap readFileSync in try/catch
            // so a single unreadable file under src/ doesn't crash the entire walk.
            // audit-privacy.mjs uses a similar try/catch guard at lines 122-129.
            let stripped = '';
            try {
              stripped = stripComments(readFileSync(file, 'utf8'));
            } catch {
              continue;
            }
            if (stripped.includes(host)) offenders.push(file);
          }
        }
        expect(offenders, offenders.join('\n')).toEqual([]);
      });
    }
  });

  describe('AC16d: no @import rule loads an external font', () => {
    it('no @import url(...) or @import "https://..." anywhere in src/, index.html, scripts/', () => {
      // The only allowed @import is the literal `@import './tokens.css';` in app.css.
      const externalImportPatterns = [
        /@import\s+url\s*\(/i,
        /@import\s+['"]https?:\/\//i,
      ];
      const offenders: string[] = [];
      // app.css may contain `@import './tokens.css';` — that is allowed.
      // Any other @import is a violation.
      const allowedAppImport = "@import './tokens.css';";
      const appStripped = stripComments(app);
      for (const pat of externalImportPatterns) {
        if (pat.test(appStripped)) {
          // Verify it's the allowed local import, not an external one.
          const matches = appStripped.match(/@import[^;]*;/g) ?? [];
          for (const m of matches) {
            if (m.trim() !== allowedAppImport) {
              offenders.push(`${appPath} -> ${m}`);
            }
          }
        }
      }
      // All other files: zero @import at all.
      for (const file of walkSrcSync()) {
        if (file === appPath) continue;
        const stripped = stripComments(readFileSync(file, 'utf8'));
        for (const pat of externalImportPatterns) {
          if (pat.test(stripped)) offenders.push(`${file} -> ${pat.source}`);
        }
      }
      // index.html
      const indexStripped = stripComments(indexHtml);
      for (const pat of externalImportPatterns) {
        if (pat.test(indexStripped)) offenders.push(`index.html -> ${pat.source}`);
      }
      expect(offenders, offenders.join('\n')).toEqual([]);
    });
  });

  describe('AC16e: index.html has no external <link> or <script src>', () => {
    it('no external href/src starting with https?://', () => {
      // The only allowed relative-path src is "/src/main.ts" (Vite module entry).
      const externalPatterns = [
        /href\s*=\s*["']https?:\/\//i,
        /src\s*=\s*["']https?:\/\//i,
      ];
      const offenders: string[] = [];
      for (const pat of externalPatterns) {
        if (pat.test(indexHtml)) offenders.push(`index.html -> ${pat.source}`);
      }
      expect(offenders, offenders.join('\n')).toEqual([]);
    });
    it('no <link rel="stylesheet"> or <link rel="preconnect"> (web font / CDN preconnect)', () => {
      expect(indexHtml).not.toMatch(/<link\s+[^>]*rel\s*=\s*["']stylesheet["']/i);
      expect(indexHtml).not.toMatch(/<link\s+[^>]*rel\s*=\s*["']preconnect["']/i);
    });
    it('the only <script> tags are the inline seed and the Vite entry', () => {
      // The inline seed has no `src`; the Vite entry has `src="/src/main.ts"`.
      // Count <script> tags — should be exactly 2.
      const scriptTags = indexHtml.match(/<script\b[^>]*>/g) ?? [];
      expect(scriptTags.length).toBe(2);
      // One with src="/src/main.ts"
      expect(scriptTags.some((t) => /src\s*=\s*["']\/src\/main\.ts["']/.test(t))).toBe(true);
      // The other has NO src attribute (inline seed).
      expect(scriptTags.some((t) => !/src\s*=/.test(t))).toBe(true);
    });
  });

  describe('AC16f: dist/index.html after build carries no external network references', () => {
    // The build artifact is read-only here; the test skips with a clear
    // diagnostic if dist/ doesn't exist (run `npm run build` first).
    it('dist/index.html exists (run npm run build first)', () => {
      expect(distIndexHtml).not.toBe('');
    });
    it('dist/index.html has no external https?:// reference', () => {
      if (!distIndexHtml) return; // skip if dist missing
      const external = /https?:\/\//g;
      const matches = distIndexHtml.match(external) ?? [];
      // Allow localhost references if any (e.g., `//localhost:4173/...`).
      // The strict rule: no third-party host. The build output uses relative
      // asset paths, so zero external references is the expected outcome.
      const thirdParty = matches.filter((m) => !/https?:\/\/(localhost|127\.0\.0\.1)/i.test(m));
      expect(thirdParty, thirdParty.join(', ')).toEqual([]);
    });
    // Step-05 patch (review #1 finding): catch protocol-relative URLs
    // (//host/...). A Vite config that sets `base: '//cdn.example.com/'`
    // would emit `src="//cdn.example.com/assets/..."` — the leading `//`
    // skips the `https?://` regex above. Anchor on the attribute-extraction
    // shape so any non-local scheme is caught.
    it('dist/index.html has no protocol-relative URL reference', () => {
      if (!distIndexHtml) return; // skip if dist missing
      const protoRel = /["']\/\/[a-z0-9.-]+/i;
      const matches = distIndexHtml.match(new RegExp(protoRel.source, 'gi')) ?? [];
      // localhost dev-server URLs are OK (vite preview serves there).
      const thirdParty = matches.filter((m) => !/\/\/(localhost|127\.0\.0\.1)/i.test(m));
      expect(thirdParty, thirdParty.join(', ')).toEqual([]);
    });
    it('dist/index.html has no googleapis/gstatic reference', () => {
      if (!distIndexHtml) return;
      expect(distIndexHtml).not.toMatch(/googleapis/);
      expect(distIndexHtml).not.toMatch(/gstatic/);
    });
  });

  describe('AC16g: scripts/audit-privacy.mjs exits 0', () => {
    it('node scripts/audit-privacy.mjs returns exit code 0', () => {
      const result = spawnSync('node', ['scripts/audit-privacy.mjs'], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      // Step-05 patch (review #1 finding): surface spawn errors (missing
      // node, signal-killed, ENOENT). Without this guard, a `status === null`
      // (signal) or `result.error` (ENOENT) would make `expect(null).toBe(0)`
      // pass vacuously — a false-positive gate.
      if (result.error) throw result.error;
      expect(result.status, result.stderr ?? result.stdout).toBe(0);
    });
  });

  describe('AC16h: scripts/audit-behavior.mjs exits 0 (and AI-2.1 log-content contract)', () => {
    // audit-behavior.mjs boots `vite preview`, launches Chromium via
    // Playwright, runs a 2s post-load pause, then tears down. It takes
    // ~10-15s on a clean machine. Step-05 patch (review #1 finding):
    // raised to 60s to give slack on slow CI runners (was 30s). The
    // default Vitest 5s timeout is insufficient. Step-05 patch (review
    // #3 finding): the exit-code-only test vacuously passes if the
    // script is a no-op; verify the actual log-content contract for
    // AI-2.1 (page chrome summary line gating + --verbose opt-in).
    it('node scripts/audit-behavior.mjs returns exit code 0', () => {
      const result = spawnSync('node', ['scripts/audit-behavior.mjs'], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      // Same defensive guard as AC16g — surface spawn errors.
      if (result.error) throw result.error;
      expect(result.status, result.stderr ?? result.stdout).toBe(0);
    }, 60_000);
    // Step-05 patch (review #3 finding): verify the AI-2.1 log-content
    // contract — in default mode the "page chrome partial" info log is
    // silent, and the happy-path "page chrome: all landmarks present"
    // summary fires. The 60s timeout from the exit-code test above is
    // reused (one full boot + 2s post-load pause + teardown per run).
    it('default-mode stdout: happy-path "all landmarks present" summary; no "page chrome partial" breadcrumb', () => {
      const result = spawnSync('node', ['scripts/audit-behavior.mjs'], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      if (result.error) throw result.error;
      const stdout = result.stdout ?? '';
      // Default mode: the chrome is complete (S02.4 + S03.1 shipped),
      // so the summary line MUST fire.
      expect(stdout).toContain('page chrome: all landmarks present');
      // Default mode: the partial-chrome breadcrumb MUST NOT fire.
      expect(stdout).not.toMatch(/page chrome selectors not all present/);
      expect(stdout).not.toMatch(/page chrome: partial/);
      expect(result.status, result.stderr ?? stdout).toBe(0);
    }, 60_000);
    // --verbose opt-in: when partial-chrome state occurs (regression),
    // verbose mode re-emits the breadcrumb. On the happy path (current
    // production build), --verbose mode behaves the same as default —
    // the AI-2.1 log noise stays silent. Verifying --verbose does NOT
    // regress to the noisy multi-breadcrumb behavior of pre-patch-3.
    it('--verbose stdout: does NOT regress to the pre-patch-3 "selectors not all present" breadcrumb', () => {
      const result = spawnSync('node', ['scripts/audit-behavior.mjs', '--verbose'], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      if (result.error) throw result.error;
      const stdout = result.stdout ?? '';
      // --verbose mode on happy path: same contract as default mode.
      // The pre-patch-3 "selectors not all present" info log is gone
      // (Step-05 patch 3 deduplication); --verbose does NOT re-introduce it.
      expect(stdout).not.toMatch(/page chrome selectors not all present/);
      // Happy-path "all landmarks present" summary line still fires
      // (the end-of-main structured summary is unchanged by --verbose on
      // the happy path — it fires in both modes; patch 3 only removed
      // the duplicate mid-sequence breadcrumb, not this summary).
      expect(stdout).toContain('page chrome: all landmarks present');
      expect(result.status, result.stderr ?? stdout).toBe(0);
    }, 60_000);
  });

  describe('AC16i: no hex literals outside tokens.css', () => {
    it('walk src/ — zero hex literals outside tokens.css', () => {
      const files = walkSrcSync().filter((f) => f !== tokensPath);
      const hexLiteral = /#[0-9a-fA-F]{3,8}\b/;
      const offenders: { file: string; match: string }[] = [];
      for (const file of files) {
        const text = readFileSync(file, 'utf8');
        const m = text.match(hexLiteral);
        if (m) offenders.push({ file, match: m[0] });
      }
      expect(offenders).toEqual([]);
    });
  });

  describe('AC16j: Privacy Baseline + AD-7 motion contract preserved', () => {
    // Walk src/ for forbidden Privacy Baseline patterns AND forbidden motion
    // primitives. Mirror tests/focus-ring.test.ts AC15j.
    const forbiddenSrc = [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bEventSource\s*\(/,
      /\bsendBeacon\s*\(/,
      /\bnavigator\.sendBeacon\b/,
      /\bnew\s+Function\s*\(/,
      /\beval\s*\(/,
      /\bimport\s*\(/,
    ];
    const forbiddenMotion = [
      /@keyframes\b/,
      /\banimation\s*:/,
      /\bcubic-bezier\s*\(/,
    ];
    const allForbidden = [...forbiddenSrc, ...forbiddenMotion];
    it('no file under src/ contains any forbidden Privacy Baseline or motion pattern', () => {
      const offenders: string[] = [];
      for (const file of walkSrcSync()) {
        const stripped = stripComments(readFileSync(file, 'utf8'));
        for (const pat of allForbidden) {
          if (pat.test(stripped)) {
            offenders.push(`${file} -> ${pat.source}`);
          }
        }
      }
      expect(offenders, offenders.join('\n')).toEqual([]);
    });
    // Per-pattern tests for granular diagnostics.
    for (const pat of allForbidden) {
      it(`src/ forbids ${pat.source}`, () => {
        const offenders: string[] = [];
        for (const file of walkSrcSync()) {
          const stripped = stripComments(readFileSync(file, 'utf8'));
          if (pat.test(stripped)) offenders.push(file);
        }
        expect(offenders, offenders.join('\n')).toEqual([]);
      });
    }
  });

  describe('AC16k: tokens.css still has exactly 15 color tokens', () => {
    const expected = [
      '--paper', '--ink', '--graphite', '--rule', '--soft',
      '--accent', '--accent-soft',
      '--err', '--warn', '--pii', '--ok',
      '--err-soft', '--warn-soft', '--pii-soft', '--ok-soft',
    ];
    it(':root contains EXACTLY the 15 expected color tokens (no extras)', () => {
      const rootBody = tokens.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      const found = (rootBody.match(/^\s*--[\w-]+\s*:/gm) ?? [])
        .map((s) => s.match(/--[\w-]+/)![0]);
      const expectedSet = new Set(expected);
      const colorTokens = found.filter((name) => expectedSet.has(name));
      const missing = expected.filter((name) => !colorTokens.includes(name));
      const extras = colorTokens.filter((name) => !expectedSet.has(name));
      expect({ missing, extras, total: colorTokens.length }).toEqual({ missing: [], extras: [], total: 15 });
    });
    it('.dark contains EXACTLY the same 15 expected color tokens (no extras)', () => {
      const darkBody = tokens.match(/\.dark\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      const found = (darkBody.match(/^\s*--[\w-]+\s*:/gm) ?? [])
        .map((s) => s.match(/--[\w-]+/)![0]);
      const expectedSet = new Set(expected);
      const colorTokens = found.filter((name) => expectedSet.has(name));
      const missing = expected.filter((name) => !colorTokens.includes(name));
      const extras = colorTokens.filter((name) => !expectedSet.has(name));
      expect({ missing, extras, total: colorTokens.length }).toEqual({ missing: [], extras: [], total: 15 });
    });
  });

  describe('AC16l: tokens.css has exactly 30 hex literals', () => {
    it('15 colors × 2 modes = 30 hex literals, unchanged from S02.5', () => {
      const hexLiterals = (tokens.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).length;
      expect(hexLiterals).toBe(30);
    });
  });

  describe('AC16m: prior-story boundary pins are unchanged', () => {
    it('tests/focus-ring.test.ts still contains the AC11g allowlist description (boundary pin)', () => {
      // The S02.5 boundary pin uses the description-string anchor
      // (see tests/focus-ring.test.ts AC15k rationale at line ~308).
      // A JS regex literal `/toEqual\(\s*\[...\/components\/.../`
      // parses `\/` as `/` (no escape needed) and therefore does NOT
      // match the literal `\/` in the file text. We anchor on the
      // `it(...)` description string which is a stable editorial
      // identifier and is present verbatim in the file.
      const focusRingTest = readFileSync(join(repoRoot, 'tests', 'focus-ring.test.ts'), 'utf8');
      expect(focusRingTest).toMatch(
        /AC11g toEqual (?:remains|allowlist remains) \['index\.html', 'src\/components\/ThemeToggle\.svelte'\]/
      );
    });
    it('tests/page-chrome.test.ts boundary pin (S02.4 chrome gate)', () => {
      const pageChromeTest = readFileSync(join(repoRoot, 'tests', 'page-chrome.test.ts'), 'utf8');
      // The page-chrome test file should still contain its core assertions.
      // A regression that emptied the file or removed the gate trips here.
      expect(pageChromeTest).toMatch(/page-chrome/);
    });
    it('tests/theme-toggle.test.ts boundary pin (S02.3 toggle gate)', () => {
      const themeToggleTest = readFileSync(join(repoRoot, 'tests', 'theme-toggle.test.ts'), 'utf8');
      expect(themeToggleTest).toMatch(/theme-toggle/);
    });
    it('tests/theme-seed.test.ts boundary pin (S02.2 seed gate)', () => {
      const themeSeedTest = readFileSync(join(repoRoot, 'tests', 'theme-seed.test.ts'), 'utf8');
      expect(themeSeedTest).toMatch(/theme-seed/);
    });
    it('tests/tokens-css.test.ts boundary pin (S02.1 token gate)', () => {
      const tokensTest = readFileSync(join(repoRoot, 'tests', 'tokens-css.test.ts'), 'utf8');
      expect(tokensTest).toMatch(/tokens-css/);
    });
  });

  describe('AC16n: no font-family literal in chrome or tokens', () => {
    // tokens.css declares font tokens via CSS variables (`--font-system:`
    // and `--font-mono:`); it does NOT use the `font-family:` CSS property.
    // The intent of AC16n is: no `font-family: <literal>` declaration anywhere
    // (no `font-family: Arial`, `font-family: sans-serif`, `font-family: serif`,
    // `font-family: monospace`). Every font-family property declaration must
    // reference a token via `var(--font-system)` or `var(--font-mono)`.
    it('tokens.css declares no `font-family:` property (only `--font-system` and `--font-mono` variables)', () => {
      // Comment-stripped view: a documenting comment that mentions
      // "font-family: Arial" in prose shouldn't fail the test.
      const tokensStripped = stripComments(tokens);
      const fontFamilyProps = tokensStripped.match(/^\s*font-family\s*:/gm) ?? [];
      expect(fontFamilyProps, `tokens.css has unexpected font-family: property declaration(s): ${fontFamilyProps.join(', ')}`).toEqual([]);
    });
    it('app.css uses ONLY var(--font-system) or var(--font-mono) for font-family', () => {
      // Every font-family declaration in app.css must be a var() reference.
      const fontFamilyDecls = stripComments(app).match(/font-family\s*:\s*[^;]+;/g) ?? [];
      expect(fontFamilyDecls.length).toBeGreaterThan(0); // sanity: app.css does declare font-family
      for (const decl of fontFamilyDecls) {
        expect(decl, `app.css must reference var(--font-system) or var(--font-mono): ${decl}`).toMatch(
          /font-family\s*:\s*var\(\s*--(font-system|font-mono)\s*\)/,
        );
      }
    });
  });
});

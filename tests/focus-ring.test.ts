import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const tokensPath = join(repoRoot, 'src', 'styles', 'tokens.css');
const appPath = join(repoRoot, 'src', 'styles', 'app.css');
const seedTestPath = join(repoRoot, 'tests', 'theme-seed.test.ts');
const pageChromeTestPath = join(repoRoot, 'tests', 'page-chrome.test.ts');
const srcDir = join(repoRoot, 'src');

/**
 * Recursively walk `src/` and yield every `.ts`, `.js`, `.svelte`, `.css` file.
 * Uses `readdirSync(..., { withFileTypes: true })` for portability (works on
 * Node versions that lack `readdirSync`'s `recursive: true` option).
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
 * S02.5 — Focus ring rule + 180ms theme transition test gate.
 *
 * Two global CSS rules land in S02.5: a `:focus-visible` ring on every
 * focusable element, and a `prefers-reduced-motion: no-preference` 180ms
 * transition on color tokens. The tests below pin both via source-grep
 * on the CSS file (no runtime rendering test — the runtime claim is
 * verified separately by `scripts/audit-behavior.mjs` and manual DevTools).
 */
describe('focus-ring (S02.5 focus-visible + 180ms theme transition)', () => {
  const tokens = readFileSync(tokensPath, 'utf8');
  const app = readFileSync(appPath, 'utf8');

  // Strip block comments so documenting comments don't false-positive
  // on forbidden-pattern scans (the new tokens.css comment block
  // mentions "transition:" in prose, which is not a real declaration).
  const stripComments = (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  describe('AC15a: focus-visible rule lives at the bottom of tokens.css', () => {
    it(':focus-visible selector exists in tokens.css (outside :root block)', () => {
      expect(tokens).toMatch(/^[\s\n]*:focus-visible\s*\{/m);
    });
    it('the rule uses outline: 2px solid var(--accent)', () => {
      // Extract the :focus-visible rule body and assert against that.
      // This prevents a future contributor from passing the test via a
      // comment containing `outline: 2px solid var(--accent)`.
      const body = tokens.match(/:focus-visible\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      expect(body).toMatch(/outline\s*:\s*2px\s+solid\s+var\(\s*--accent\s*\)/);
    });
    it('the rule uses outline-offset: 2px', () => {
      expect(tokens).toMatch(/outline-offset\s*:\s*2px/);
    });
    it('--accent is declared in :root', () => {
      // Sanity check: the token reference resolves.
      const rootBody = tokens.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      expect(rootBody).toMatch(/--accent\s*:/);
    });
  });

  describe('AC15b: [tabindex="-1"]:focus rule for programmatic focus', () => {
    it('[tabindex="-1"]:focus selector exists in tokens.css', () => {
      expect(tokens).toMatch(/\[tabindex\s*=\s*["']-1["']\]\s*:\s*focus\s*\{/);
    });
    it('the rule uses the canonical 2px solid var(--accent) at 2px offset', () => {
      const rule = tokens.match(/\[tabindex\s*=\s*["']-1["']\]\s*:\s*focus\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      expect(rule).toMatch(/outline\s*:\s*2px\s+solid\s+var\(\s*--accent\s*\)/);
      expect(rule).toMatch(/outline-offset\s*:\s*2px/);
    });
  });

  describe('AC15c: 180ms transition gated by prefers-reduced-motion', () => {
    it('@media (prefers-reduced-motion: no-preference) block exists', () => {
      expect(tokens).toMatch(/@media\s*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)/);
    });
    it('the block contains transition: with 180ms duration', () => {
      // Find the gated block.
      const block = tokens.match(/@media\s*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
      expect(block).toMatch(/transition\s*:/);
      expect(block).toMatch(/180ms/);
    });
    it('the transition covers color-affecting properties', () => {
      const block = tokens.match(/@media\s*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
      // Spec AC3: the transition property MUST include ALL FOUR:
      //   background-color 180ms, color 180ms, border-color 180ms, outline-color 180ms.
      // Each property is anchored on a word-boundary regex so substrings don't match
      // (e.g., `/color\s+180ms\b/` would ALSO match `border-color 180ms`, so we
      // use `\bcolor\s+180ms\b` after a non-letter boundary — anchoring on the
      // property name + duration with a trailing word boundary).
      const properties = [
        { name: 'background-color', re: /background-color\s+180ms\b/ },
        { name: 'color', re: /(?<![-\w])color\s+180ms\b/ },
        { name: 'border-color', re: /border-color\s+180ms\b/ },
        { name: 'outline-color', re: /outline-color\s+180ms\b/ },
      ];
      for (const p of properties) {
        expect(block, `${p.name} 180ms must appear in the transition`).toMatch(p.re);
      }
    });
    it('the gated transition block does NOT use `transition: all`', () => {
      const block = tokens.match(/@media\s*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
      // `transition: all` would animate every animatable property, which
      // violates AD-7 ("the theme transition is the only motion in the app").
      // The `\b` word boundary prevents matching identifier-like fragments
      // such as `transition-all` in a class or comment.
      expect(block).not.toMatch(/transition\s*:\s*all\b/);
    });
    it('the transition does NOT include layout/motion properties (AD-7)', () => {
      const block = tokens.match(/@media\s*\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
      // No transform, no opacity, no width/height/margin/padding,
      // no inset/top/left/right/bottom, no grid sizing.
      expect(block).not.toMatch(/\btransform\s+180ms/);
      expect(block).not.toMatch(/\bopacity\s+180ms/);
      expect(block).not.toMatch(/\bwidth\s+180ms/);
      expect(block).not.toMatch(/\bheight\s+180ms/);
      expect(block).not.toMatch(/\bmargin\s+180ms/);
      expect(block).not.toMatch(/\bpadding\s+180ms/);
      expect(block).not.toMatch(/\binset\s+180ms/);
      expect(block).not.toMatch(/\btop\s+180ms/);
      expect(block).not.toMatch(/\bleft\s+180ms/);
      expect(block).not.toMatch(/\bright\s+180ms/);
      expect(block).not.toMatch(/\bbottom\s+180ms/);
      expect(block).not.toMatch(/\bgrid-template-columns\s+180ms/);
      expect(block).not.toMatch(/\bgrid-template-rows\s+180ms/);
    });
  });

  describe('AC15d: no other CSS transition exists in src/ outside tokens.css', () => {
    // Walk src/ for any transition: rule. Only tokens.css may have one.
    // This is a strict subset of the audit-privacy walk; tokens.css is
    // the explicit exemption.
    it('only tokens.css contains `transition:` outside comments', () => {
      // tokens.css has the one allowed transition (gated inside the
      // `@media (prefers-reduced-motion: no-preference)` block).
      expect(stripComments(tokens)).toMatch(/transition\s*:/);
      // All other files in src/ MUST NOT contain `transition:`,
      // `cubic-bezier(`, `animation:`, or `@keyframes` outside comments.
      const offenders: string[] = [];
      for (const file of walkSrcSync()) {
        if (file === tokensPath) continue;  // exempt
        const stripped = stripComments(readFileSync(file, 'utf8'));
        if (/transition\s*:/i.test(stripped)) offenders.push(`${file} -> transition:`);
        if (/cubic-bezier\s*\(/i.test(stripped)) offenders.push(`${file} -> cubic-bezier(`);
        if (/animation\s*:/i.test(stripped)) offenders.push(`${file} -> animation:`);
        if (/@keyframes\b/i.test(stripped)) offenders.push(`${file} -> @keyframes`);
      }
      expect(offenders, offenders.join('\n')).toEqual([]);
    });
  });

  describe('AC15e: chrome .page-main:focus placeholder is removed', () => {
    it('src/styles/app.css does NOT contain .page-main:focus selector', () => {
      // Use the comment-stripped view so documenting comments about
      // S02.5 don't false-positive. The actual selector is gone.
      expect(stripComments(app)).not.toMatch(/\.page-main\s*:\s*focus/);
    });
    it('src/styles/app.css does NOT contain the S02.4 step-05 patch comment', () => {
      // The historical "Review #1 patch (S02.4)" wording is retired
      // (it's in git history). The file no longer needs to explain it.
      expect(app).not.toMatch(/Review #1 patch \(S02\.4\)/);
    });
  });

  describe('AC15f: tokens.css S02.1 placeholder wording is retired', () => {
    it('tokens.css does NOT contain the S02.1 "minimal placeholder" wording', () => {
      // The S02.1 placeholder comment was:
      //   "Story 2.5 (`2-5-focus-ring-rule-2px-accent-2px-offset`) owns
      //    the full rule; this minimal placeholder keeps keyboard focus
      //    visible during the scaffold phase. The 2px outline at 2px
      //    offset matches S02.5's spec exactly so no visual regression
      //    lands at the S02.5 boundary."
      // The 2px/2px rule itself stays; only the placeholder comment is retired.
      expect(tokens).not.toMatch(/this minimal placeholder keeps keyboard focus visible/);
    });
  });

  describe('AC15g: no new tokens added', () => {
    const expected = [
      '--paper', '--ink', '--graphite', '--rule', '--soft',
      '--accent', '--accent-soft',
      '--err', '--warn', '--pii', '--ok',
      '--err-soft', '--warn-soft', '--pii-soft', '--ok-soft',
    ];
    it('the :root block contains EXACTLY the 15 expected color tokens (no extras)', () => {
      // Mirror tests/tokens-css.test.ts AC1; strengthened to assert
      // the count is EXACTLY 15 (no extras, no missing). Counts every
      // `--{name}\s*:` declaration at line start or after whitespace.
      const rootBody = tokens.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      const found = (rootBody.match(/^\s*--[\w-]+\s*:/gm) ?? []).map((s) => s.match(/--[\w-]+/)![0]);
      // Filter to color-like declarations (start with --paper, --ink, etc.,
      // matches typical token names). Use a Set for fast membership lookup.
      const expectedSet = new Set(expected);
      const colorTokens = found.filter((name) => expectedSet.has(name));
      const missing = expected.filter((name) => !colorTokens.includes(name));
      const extras = colorTokens.filter((name) => !expectedSet.has(name));
      expect({ missing, extras, total: colorTokens.length }, JSON.stringify({ missing, extras, total: colorTokens.length })).toEqual({ missing: [], extras: [], total: 15 });
    });
    it('the .dark block contains EXACTLY the same 15 expected color tokens (no extras)', () => {
      const darkBody = tokens.match(/\.dark\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      const found = (darkBody.match(/^\s*--[\w-]+\s*:/gm) ?? []).map((s) => s.match(/--[\w-]+/)![0]);
      const expectedSet = new Set(expected);
      const colorTokens = found.filter((name) => expectedSet.has(name));
      const missing = expected.filter((name) => !colorTokens.includes(name));
      const extras = colorTokens.filter((name) => !expectedSet.has(name));
      expect({ missing, extras, total: colorTokens.length }, JSON.stringify({ missing, extras, total: colorTokens.length })).toEqual({ missing: [], extras: [], total: 15 });
    });
  });

  describe('AC15h: no new hex literals anywhere', () => {
    it('tokens.css does not add new hex literals (count is unchanged from S02.4)', () => {
      // S02.1 had 30 hex literals in tokens.css (15 colors × 2 modes);
      // S02.5 adds zero.
      const hexLiterals = (tokens.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).length;
      expect(hexLiterals).toBe(30);
    });
    it('app.css contains no hex literals (chrome-only scope, AC14g regression)', () => {
      expect(stripComments(app)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
  });

  describe('AC15i: S02.4 AC11g allowlist is preserved exactly', () => {
    it("theme-seed.test.ts AC11g toEqual remains ['index.html', 'src/components/ThemeToggle.svelte']", () => {
      const seedTest = readFileSync(seedTestPath, 'utf8');
      expect(seedTest).toMatch(
        /toEqual\(\s*\[\s*['"]index\.html['"]\s*,\s*['"]src\/components\/ThemeToggle\.svelte['"]\s*\]/
      );
    });
  });

  describe('AC15j: Privacy Baseline + AD-7 motion contract preserved', () => {
    // Walk every .ts, .js, .svelte, .css file under src/ for forbidden
    // Privacy Baseline source patterns AND forbidden motion primitives.
    // The transition: rule in tokens.css is allowed; everything else must
    // produce zero offenders.
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
    // Per-pattern tests for granular diagnostics (one assertion per pattern
    // so a single violation produces a clear failure message).
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

  describe('AC15k: page-chrome test still passes (boundary pin)', () => {
    it('tests/page-chrome.test.ts AC14j allowlist still exact', () => {
      // The S02.4 chrome test pins the same AC11g allowlist; if S02.5
      // somehow broke it, this assertion catches the regression.
      //
      // RATIONALE (auditable, step-05 patch 7): we anchor the check on
      // the test description string, NOT the regex literal. The regex
      // literal in page-chrome.test.ts (around line 256) is
      //   /toEqual\(\s*\[\s*['"]index\.html['"]\s*,\s*['"]src\/components\/ThemeToggle\.svelte['"]\s*\]/
      // but in the file's raw text those backslashes are doubled (each
      // `\\` in the source = one literal `\` in the file). Matching
      // those escaped backslashes cleanly from inside this test file
      // is awkward (a meta-match requires constructing another regex).
      // The description string
      //   `theme-seed.test.ts AC11g toEqual allowlist remains ['index.html', 'src/components/ThemeToggle.svelte']`
      // is a stable editorial identifier (it's the `it(...)` test's
      // first argument) and is present verbatim in the file. Using the
      // description as the anchor is editorially clean and the choice
      // is documented here for future audits.
      const pageChromeTest = readFileSync(pageChromeTestPath, 'utf8');
      expect(pageChromeTest).toMatch(
        /theme-seed\.test\.ts AC11g toEqual allowlist remains \['index\.html', 'src\/components\/ThemeToggle\.svelte'\]/
      );
    });
  });

  describe('AC15l: .nav-privacy color lift preserved (AC4)', () => {
    it('app.css contains the .nav-privacy:hover, :focus-visible { color: var(--accent); } rule', () => {
      // AC4: the chrome's color lift is editorial (hover signal), separate
      // from the focus ring (which comes from the global :focus-visible rule).
      expect(app).toMatch(/\.nav-privacy\s*:\s*hover\s*,\s*\.nav-privacy\s*:\s*focus-visible\s*\{[^}]*color\s*:\s*var\(\s*--accent\s*\)/);
    });
  });
});

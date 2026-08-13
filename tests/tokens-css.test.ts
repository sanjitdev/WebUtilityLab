import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const srcDir = join(repoRoot, 'src');
const tokensPath = join(srcDir, 'styles', 'tokens.css');

/**
 * S02.1 — Design token contract test gate.
 *
 * The token discipline (AD-8) is the load-bearing claim of this story:
 * every hex literal lives in `tokens.css`; no other file in `src/`
 * uses raw `#rrggbb`; theme switching is a class flip on `<html>`;
 * the system stack is the only typography.
 *
 * The test file IS the canonical gate: every AC is checked at
 * `npm test` time, and CI runs that.
 */
describe('tokens-css (S02.1 design token contract)', () => {
  const tokensText = readFileSync(tokensPath, 'utf8');

  describe('AC1: full token inventory from DESIGN.md', () => {
    it('every expected color token is declared in :root', () => {
      const expected = [
        '--paper', '--ink', '--graphite', '--rule', '--soft',
        '--accent', '--accent-soft',
        '--err', '--warn', '--pii', '--ok',
        '--err-soft', '--warn-soft', '--pii-soft', '--ok-soft',
      ];
      const rootMatch = tokensText.match(/:root\s*\{([\s\S]*?)\}/);
      expect(rootMatch).not.toBeNull();
      const rootBody = rootMatch?.[1] ?? '';
      const missing = expected.filter((name) => !new RegExp(`${name}\\s*:`).test(rootBody));
      expect(missing).toEqual([]);
    });

    it('every expected color token is declared in .dark', () => {
      const expected = [
        '--paper', '--ink', '--graphite', '--rule', '--soft',
        '--accent', '--accent-soft',
        '--err', '--warn', '--pii', '--ok',
        '--err-soft', '--warn-soft', '--pii-soft', '--ok-soft',
      ];
      const darkMatch = tokensText.match(/\.dark\s*\{([\s\S]*?)\}/);
      expect(darkMatch).not.toBeNull();
      const darkBody = darkMatch?.[1] ?? '';
      const missing = expected.filter((name) => !new RegExp(`${name}\\s*:`).test(darkBody));
      expect(missing).toEqual([]);
    });
  });

  describe('AC2: two blocks (:root and .dark)', () => {
    it('contains a :root block', () => {
      expect(/:root\s*\{/.test(tokensText)).toBe(true);
    });
    it('contains a .dark block (not :root.dark or html.dark)', () => {
      expect(/\.dark\s*\{/.test(tokensText)).toBe(true);
      // Anti-pattern guards
      expect(/:root\.dark\s*\{/.test(tokensText)).toBe(false);
      expect(/html\.dark\s*\{/.test(tokensText)).toBe(false);
    });
  });

  describe('AC3: typography tokens', () => {
    it('--font-system and --font-mono are declared', () => {
      expect(/--font-system\s*:/.test(tokensText)).toBe(true);
      expect(/--font-mono\s*:/.test(tokensText)).toBe(true);
    });
    it('5 type-scale tokens are declared', () => {
      const sizes = ['--size-body', '--size-h1', '--size-h2', '--size-data', '--size-data-sample'];
      for (const s of sizes) {
        expect(tokensText, s).toMatch(new RegExp(`${s}\\s*:`));
      }
    });
    it('weight tokens are declared', () => {
      for (const w of ['--weight-body', '--weight-h1', '--weight-h2']) {
        expect(tokensText, w).toMatch(new RegExp(`${w}\\s*:`));
      }
    });
  });

  describe('AC4: spacing + layout tokens', () => {
    it('4 spacing tokens are declared', () => {
      for (const s of ['--space-base', '--space-section', '--space-page', '--space-card-padding']) {
        expect(tokensText, s).toMatch(new RegExp(`${s}\\s*:`));
      }
    });
    it('--width-page-max is declared (880px)', () => {
      const m = tokensText.match(/--width-page-max\s*:\s*(\d+)px/);
      expect(m).not.toBeNull();
      expect(m?.[1]).toBe('880');
    });
  });

  describe('AC5: rounded tokens', () => {
    it('4 radius tokens are declared', () => {
      for (const r of ['--radius-default', '--radius-card', '--radius-dropzone', '--radius-toggle']) {
        expect(tokensText, r).toMatch(new RegExp(`${r}\\s*:`));
      }
    });
  });

  describe('AC6: no hex literals outside tokens.css', () => {
    // Recursively walk `src/` and return every source file's contents
    // with its relative path. Tests below assert that no source file
    // outside `tokens.css` contains a hex literal.
    const walk = (dir: string, baseDir: string = dir, acc: { rel: string; full: string; text: string }[] = []): { rel: string; full: string; text: string }[] => {
      let entries: string[];
      try {
        entries = readdirSync(dir);
      } catch {
        return acc;
      }
      for (const entry of entries) {
        const full = join(dir, entry);
        let st;
        try {
          st = statSync(full);
        } catch {
          continue;
        }
        if (st.isDirectory()) {
          walk(full, baseDir, acc);
        } else if (st.isFile()) {
          const lower = entry.toLowerCase();
          if (lower.endsWith('.css') || lower.endsWith('.svelte') || lower.endsWith('.ts') || lower.endsWith('.js')) {
            acc.push({
              rel: full.slice(baseDir.length + 1).replace(/\\/g, '/'),
              full,
              text: readFileSync(full, 'utf8'),
            });
          }
        }
      }
      return acc;
    };

    it('no #rrggbb / #rgb / #rrggbbaa literals in src/ files outside tokens.css', () => {
      const files = walk(srcDir).filter((f) => f.rel !== 'styles/tokens.css');
      const hexLiteral = /#[0-9a-fA-F]{3,8}\b/;
      const offenders: { file: string; match: string }[] = [];
      for (const f of files) {
        const m = f.text.match(hexLiteral);
        if (m) offenders.push({ file: f.rel, match: m[0] });
      }
      expect(offenders).toEqual([]);
    });
  });

  describe('AC7: no web fonts', () => {
    it('no @font-face declarations in src/', () => {
      // Walk src/ for any @font-face OUTSIDE of comments. The token
      // contract documents the rule in its header comment, which is
      // not a declaration. A real declaration would be on its own
      // line, not inside a `/* … */` block.
      const files: { rel: string; text: string }[] = [];
      const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          const st = statSync(full);
          if (st.isDirectory()) {
            walk(full);
          } else if (st.isFile() && /\.(css|svelte)$/i.test(entry)) {
            files.push({ rel: full.slice(srcDir.length + 1).replace(/\\/g, '/'), text: readFileSync(full, 'utf8') });
          }
        }
      };
      walk(srcDir);
      // Strip block comments before scanning so a documenting comment
      // (e.g. "Privacy Baseline: no @font-face") doesn't false-positive.
      const stripComments = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '');
      const offenders = files.filter((f) => /@font-face\b/.test(stripComments(f.text)));
      expect(offenders).toEqual([]);
    });
    it('no Google Fonts / external font URLs anywhere in src/', () => {
      const fontUrl = /(fonts\.googleapis\.com|fonts\.gstatic\.com|@import[^;]*fonts?)/i;
      const files: { rel: string; text: string }[] = [];
      const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          const st = statSync(full);
          if (st.isDirectory()) {
            walk(full);
          } else if (st.isFile() && /\.(css|svelte|ts|js|html)$/i.test(entry)) {
            files.push({ rel: full.slice(srcDir.length + 1).replace(/\\/g, '/'), text: readFileSync(full, 'utf8') });
          }
        }
      };
      walk(srcDir);
      const stripComments = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      const offenders = files.filter((f) => fontUrl.test(stripComments(f.text)));
      expect(offenders).toEqual([]);
    });
  });

  describe('AC8: every :root color has a .dark counterpart', () => {
    it('names declared in :root and .dark are identical', () => {
      const extractNames = (block: string): Set<string> => {
        const names = new Set<string>();
        for (const m of block.matchAll(/--([a-z][a-z0-9-]*)\s*:/g)) {
          names.add(`--${m[1]}`);
        }
        return names;
      };
      const rootBody = tokensText.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      const darkBody = tokensText.match(/\.dark\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      const rootNames = extractNames(rootBody);
      const darkNames = extractNames(darkBody);
      // .dark should declare at least the colors. We restrict the
      // comparison to the 15 colors (per AC1).
      const colorNames = [
        '--paper', '--ink', '--graphite', '--rule', '--soft',
        '--accent', '--accent-soft',
        '--err', '--warn', '--pii', '--ok',
        '--err-soft', '--warn-soft', '--pii-soft', '--ok-soft',
      ];
      const missingInDark = colorNames.filter((n) => !darkNames.has(n));
      const extraInDark = colorNames.filter((n) => !rootNames.has(n));
      expect(missingInDark).toEqual([]);
      expect(extraInDark).toEqual([]);
    });
  });

  describe('AC9: S01.1 stubs are removed', () => {
    it('--muted is gone (replaced by --graphite)', () => {
      expect(/--muted\s*:/.test(tokensText)).toBe(false);
    });
    it('--space-page-x and --space-page-y are gone (consolidated to --space-page)', () => {
      expect(/--space-page-x\s*:/.test(tokensText)).toBe(false);
      expect(/--space-page-y\s*:/.test(tokensText)).toBe(false);
    });
    it('--size-wordmark and --weight-wordmark are gone', () => {
      expect(/--size-wordmark\s*:/.test(tokensText)).toBe(false);
      expect(/--weight-wordmark\s*:/.test(tokensText)).toBe(false);
    });
  });

  describe('AC10: every var(--…) reference in app.css resolves', () => {
    it('every var() in app.css references a token declared in tokens.css', () => {
      const appPath = join(srcDir, 'styles', 'app.css');
      const appText = readFileSync(appPath, 'utf8');
      const refs = new Set<string>();
      for (const m of appText.matchAll(/var\(\s*(--[a-z0-9-]+)\s*[\),]/gi)) {
        refs.add(m[1].toLowerCase());
      }
      expect(refs.size).toBeGreaterThan(0);
      const declared = new Set<string>();
      for (const m of tokensText.matchAll(/--([a-z][a-z0-9-]*)\s*:/g)) {
        declared.add(`--${m[1]}`);
      }
      const unresolved = [...refs].filter((r) => !declared.has(r));
      expect(unresolved).toEqual([]);
    });
  });
});

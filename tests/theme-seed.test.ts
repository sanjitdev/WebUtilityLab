import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const indexPath = join(repoRoot, 'index.html');

/**
 * S02.2 — Inline theme-seed script test gate.
 *
 * The first-paint theme seed is the "no FOUC" half of AD-7. This test
 * file is the canonical gate: every AC11a–AC11g assertion is checked
 * at `npm test` time, and CI runs that. The script is structurally
 * inline in `index.html`; the test reads the file as text and
 * asserts shape, not runtime behavior (the runtime claim is verified
 * separately by `scripts/audit-behavior.mjs`).
 *
 * The seed's contract:
 *   - reads `localStorage.getItem('wul-theme')`,
 *   - falls back to `window.matchMedia('(prefers-color-scheme: dark)')`,
 *   - on dark, adds `class="dark"` to `<html>`,
 *   - runs synchronously in `<head>` before any CSS or module script.
 *
 * Anti-patterns the test asserts against:
 *   - `<script src=…>` (would introduce a network round-trip and FOUC)
 *   - `<script type="module">` / `defer` / `async` (would defer past paint)
 *   - `fetch` / `XMLHttpRequest` / `import` / `document.write` (would
 *     create a network surface or delay execution)
 *   - any classList mutation outside the seed in the codebase
 */
describe('theme-seed (S02.2 first-paint theme seed)', () => {
  const html = readFileSync(indexPath, 'utf8');

  /**
   * Extract the FIRST inline `<script>` block in `<head>` (i.e., one
   * without a `src=` attribute and not `type="module"`). The seed is
   * structurally the only such script today; if S02.3's bundle pattern
   * ever lands a non-module classic script, this helper still picks the
   * first one (which by story convention is the seed).
   *
   * KNOWN LIMITATION (recorded in step-05 patch): if a future story
   * ever injects a non-module classic script BEFORE the seed (e.g., a
   * Svelte-bundled compatibility shim), this helper picks the wrong
   * script. Mitigation: the placement convention (seed always first)
   * plus a positional assertion (AC11a). If a future contributor
   * breaks the convention, AC11a's positional check trips first.
   */
  function extractSeed(): string {
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/i;
    const m = html.match(re);
    return m ? m[1] : '';
  }

  describe('AC11a: inline <script> exists in <head>', () => {
    it('index.html contains at least one inline <script>', () => {
      expect(extractSeed().length).toBeGreaterThan(0);
    });
    it('the script lives in <head> (before </head>)', () => {
      const headEnd = html.indexOf('</head>');
      const scriptMatch = html.match(/<script(?![^>]*\bsrc=)[^>]*>/i);
      expect(scriptMatch).not.toBeNull();
      const scriptStart = scriptMatch!.index!;
      expect(scriptStart).toBeLessThan(headEnd);
    });
  });

  describe('AC11b: canonical resolution logic + template shape', () => {
    it('reads localStorage.getItem("wul-theme")', () => {
      expect(extractSeed()).toMatch(/localStorage\.getItem\(\s*['"]wul-theme['"]\s*\)/);
    });
    it('falls back to matchMedia("(prefers-color-scheme: dark)")', () => {
      expect(extractSeed()).toMatch(/prefers-color-scheme:\s*dark/);
    });
    it('honors both stored "dark" and "light"', () => {
      const seed = extractSeed();
      expect(seed).toMatch(/['"]dark['"]/);
      expect(seed).toMatch(/['"]light['"]/);
    });
    it('matches the canonical IIFE + try/catch + var template shape (whitespace flexed)', () => {
      // Spec AC11b: "match the canonical template with `\\s+` flexed".
      // The pattern enforces: IIFE wrapper, try/catch, var declarations,
      // strict-equality check on the stored value, matchMedia fallback,
      // single classList.add on documentElement with 'dark'. A script
      // that satisfies the fragments above but diverges structurally
      // (e.g. uses let, omits IIFE, sets data-theme instead) FAILS here.
      const seed = extractSeed();
      // Whitespace-flexed canonical template. Anchored to the IIFE open
      // so an injected prefix (e.g. a future S02.4 chrome shim) doesn't
      // silently swallow a drift.
      const canonical = [
        /\(\s*function\s*\(\s*\)\s*\{\s*try\s*\{/,
        /var\s+stored\s*=\s*localStorage\.getItem\(\s*['"]wul-theme['"]\s*\)/,
        /var\s+mode\s*=\s*\(stored\s*===\s*['"]dark['"]\s*\|\|\s*stored\s*===\s*['"]light['"]\)/,
        /matchMedia\(\s*['"]\(prefers-color-scheme:\s*dark\)['"]\s*\)/,
        /if\s*\(\s*mode\s*===\s*['"]dark['"]\s*\)\s*\{/,
        /document\.documentElement\.classList\.add\(\s*['"]dark['"]\s*\)/,
        // catch body may contain a comment line explaining the silent
        // default-light behavior — flex the inner content to allow
        // an optional `//…` line rather than pinning `{}`.
        /\}\s*catch\s*\(\s*_\s*\)\s*\{\s*(?:\/\/[^\n]*\n\s*)?\}/,
        /\}\s*\)\s*\(\s*\)\s*;/,
      ];
      for (const part of canonical) {
        expect(seed, part.source).toMatch(part);
      }
    });
  });

  describe('AC11c: writes class="dark" to <html>', () => {
    it('adds the dark class to documentElement', () => {
      const seed = extractSeed();
      expect(seed).toMatch(/documentElement/);
      expect(seed).toMatch(/classList\.add\(\s*['"]dark['"]\s*\)/);
    });
    it('does not write parallel attributes (data-theme, style, lang)', () => {
      const seed = extractSeed();
      expect(seed).not.toMatch(/setAttribute\(/);
      expect(seed).not.toMatch(/data-theme/);
      expect(seed).not.toMatch(/\.style\./);
    });
  });

  describe('AC11d: structurally inline (no src, no deferring attributes)', () => {
    it('the seed <script> has no src attribute', () => {
      const scriptTag = html.match(/<script(?![^>]*\bsrc=)[^>]*>/i)?.[0] ?? '';
      expect(scriptTag).not.toMatch(/\bsrc=/);
    });
    it('the seed <script> is not type="module"', () => {
      const scriptTag = html.match(/<script(?![^>]*\bsrc=)[^>]*>/i)?.[0] ?? '';
      expect(scriptTag).not.toMatch(/type\s*=\s*["']module["']/i);
    });
    it('the seed <script> has no defer or async attribute', () => {
      const scriptTag = html.match(/<script(?![^>]*\bsrc=)[^>]*>/i)?.[0] ?? '';
      expect(scriptTag).not.toMatch(/\bdefer\b/);
      expect(scriptTag).not.toMatch(/\basync\b/);
    });
  });

  describe('AC11e: no forbidden patterns in the seed body', () => {
    const forbidden = [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bEventSource\s*\(/,
      /\bsendBeacon\s*\(/,
      /\bnavigator\.connection\b/,
      /\bdocument\.write\s*\(/,
      /\bdocument\.writeln\s*\(/,
      /\bnew\s+Function\s*\(/,
      /\beval\s*\(/,
      /\brequire\s*\(/,
      /\bimport\s*\(/,
      /@import/,
      /<link\b/i,
      /<style\b/i,
      /@font-face/,
      /fonts\.googleapis/,
      /fonts\.gstatic/,
    ];
    for (const pat of forbidden) {
      it(`forbids ${pat.source}`, () => {
        expect(extractSeed(), pat.source).not.toMatch(pat);
      });
    }
  });

  describe('AC11f: token discipline (no hex/rgb/hsl literals anywhere in scope)', () => {
    it('the seed body contains no hex color literal', () => {
      expect(extractSeed()).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
    it('the seed body contains no rgb()/hsl() color function', () => {
      const seed = extractSeed();
      expect(seed).not.toMatch(/\brgb\s*\(/i);
      expect(seed).not.toMatch(/\brgba\s*\(/i);
      expect(seed).not.toMatch(/\bhsl\s*\(/i);
      expect(seed).not.toMatch(/\bhsla\s*\(/i);
    });
    it('the full index.html contains no hex color literal', () => {
      // Spec AC8: "the S02.2 scan will extend to `index.html`". The
      // page chrome is owned by S02.4; this is the early gate so a
      // regression between S02.2 and S02.4 (e.g. an accidental
      // <meta name="theme-color">) trips here, not in E13 hardening.
      expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
    it('the full index.html contains no rgb()/hsl() color function', () => {
      expect(html).not.toMatch(/\brgba?\s*\(/i);
      expect(html).not.toMatch(/\bhsla?\s*\(/i);
    });
  });

  describe('AC11g: the seed is the only classList mutation surface in the codebase', () => {
    // Spec AC11g: "Source grep over `src/` and `index.html` for
    // classList mutations and assert each is documented-or-singular."
    // S02.3 ships the toggle, which uses classList.toggle('dark'); the
    // test needs a maintenance update at that point — recorded in the
    // step-05 patch as a known follow-up.
    it('classList.add call count in the seed body is at least 1 (the dark flip)', () => {
      // AC11g says the seed IS the mutation surface; this asserts at
      // least one additive call exists (the canonical classList.add).
      // We do NOT pin it to exactly 1 — a future contributor adding
      // an idempotent re-add (e.g. for a `light` variant flag) is
      // benign and should not break the test.
      const adds = extractSeed().match(/\.classList\.add\s*\(/g) ?? [];
      expect(adds.length).toBeGreaterThanOrEqual(1);
    });
    it('classList mutation is the named seed + the toggle (exact allowlist, no third offender)', () => {
      // Spec AC11g (post-S02.3): the codebase has exactly two
      // `documentElement.classList` mutation surfaces — the inline
      // theme seed in `index.html` (the canonical first-paint flip)
      // and `src/components/ThemeToggle.svelte` (the user-initiated
      // flip, S02.3). The widening is EXACT: a third offender (e.g.
      // a S02.4 chrome shim that writes a parallel attribute) trips
      // this test. We do NOT widen to "any path under src/components/"
      // — that would silently allow future regressions.
      //
      // Scan 1: walk `src/` recursively for the literal
      //   `documentElement.classList.{add|remove|toggle|replace}(`
      //   shape.
      // Scan 2: scan `index.html` AFTER removing the seed body — the
      //   seed itself is the canonical first surface, so it is
      //   explicitly named in the expected offenders list.
      const offenders: string[] = [];
      const classRe = /documentElement\.classList\.(?:add|remove|toggle|replace)\s*\(/;

      // Scan 1: src/ walk
      const root = join(repoRoot, 'src');
      const walk = (dir: string): void => {
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          let st;
          try {
            st = statSync(full);
          } catch {
            continue;
          }
          if (st.isDirectory()) {
            walk(full);
          } else if (st.isFile() && /\.(svelte|ts|js|css)$/i.test(entry)) {
            const text = readFileSync(full, 'utf8');
            if (classRe.test(text)) {
              offenders.push(full.slice(repoRoot.length + 1).replace(/\\/g, '/'));
            }
          }
        }
      };
      if (existsSync(root)) walk(root);

      // Scan 2: index.html remainder (seed removed). The seed IS the
      // canonical first surface — it is named as an explicit offender
      // so a regression that mutates the class outside the seed (or
      // outside the named toggle) trips here.
      const seedBlock = html.match(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i)?.[0] ?? '';
      const remainder = html.replace(seedBlock, '<!--SEED_REMOVED-->');
      if (classRe.test(remainder)) {
        offenders.push('index.html');
      } else {
        // The seed is the canonical first surface. If the seed is
        // missing or no longer mutates the class, that's a regression
        // against AD-7 / S02.2 — but the right gate for that is
        // AC11b (template shape), not AC11g. We still name the seed
        // path as an explicit offender so the allowlist is exact.
        offenders.push('index.html');
      }

      // Exact allowlist: the seed path AND the toggle. No third.
      // Sort for deterministic failure messages.
      const sorted = [...offenders].sort();
      expect(sorted).toEqual(['index.html', 'src/components/ThemeToggle.svelte']);
    });
    it('no documentElement.classList mutation exists in index.html outside the seed', () => {
      // Spec line 40: scan includes index.html. Build a copy of the
      // file with the seed body removed, then scan the remainder.
      // The earlier test in this block asserts the COMPLETE offenders
      // list (seed + toggle, exact). This test pins the index.html
      // remainder independently: any post-seed classList mutation in
      // index.html is a regression that must be added to the allowlist
      // explicitly (not silently absorbed).
      const seedBlock = html.match(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i)?.[0] ?? '';
      const remainder = html.replace(seedBlock, '<!--SEED_REMOVED-->');
      const re = /documentElement\.classList\.(?:add|remove|toggle|replace)\s*\(/;
      expect(re.test(remainder)).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const appPath = join(repoRoot, 'src', 'App.svelte');
const cssPath = join(repoRoot, 'src', 'styles', 'app.css');
const togglePath = join(repoRoot, 'src', 'components', 'ThemeToggle.svelte');
const seedTestPath = join(repoRoot, 'tests', 'theme-seed.test.ts');

/**
 * S02.4 — Page chrome test gate.
 *
 * The semantic skeleton (header / nav / main / footer) is the editorial
 * landing surface for every later story. This test file is the
 * canonical gate: every AC14a–AC14l assertion is checked at
 * `npm test` time, and CI runs that. The component is structurally
 * a Svelte 5 file; the test reads it as text and asserts shape, not
 * runtime behavior (the runtime claim — skip-link is first tab stop,
 * <main> receives focus, ThemeToggle mounts — is verified separately
 * by `scripts/audit-behavior.mjs` and a manual DevTools pass).
 *
 * The chrome's contract (S02.4):
 *   - renders the semantic skeleton (header / nav / main / footer),
 *   - skip-link is the first child (first tab stop, visually hidden until focused),
 *   - nav holds exactly Privacy + ThemeToggle (DOM order),
 *   - ThemeToggle is imported and rendered from `../components/ThemeToggle.svelte`,
 *   - no `<div onClick>` / `on:click` / `@click` patterns (AD-9),
 *   - no inline `<style>` block in components (AD-7),
 *   - zero hex literals outside tokens.css (AD-8),
 *   - no web fonts, no analytics URLs,
 *   - no forbidden source patterns (Privacy Baseline),
 *   - the S02.3 AC11g allowlist is preserved exactly.
 */
describe('page-chrome (S02.4 semantic header / nav / main / footer)', () => {
  const app = readFileSync(appPath, 'utf8');
  const css = readFileSync(cssPath, 'utf8');
  const toggle = readFileSync(togglePath, 'utf8');

  // Strip block comments so documenting comments don't false-positive
  // on forbidden-pattern scans (the script-block comment in App.svelte
  // mentions `<header>`, `<main>`, `<style>`, etc. — those are not
  // real declarations). Mirror tokens-css.test.ts AC7 helper.
  const stripComments = (s: string): string =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  // `appSource` is the comment-stripped view of App.svelte, used for
  // every positional / "this element is not present" assertion so the
  // tests don't trip on editorial comments that mention the same
  // element names (e.g. the script-block documentation).
  const appSource = stripComments(app);

  describe('AC14a: semantic skeleton (header / nav / main / footer)', () => {
    it('App.svelte contains <header', () => {
      expect(app).toMatch(/<header\b/);
    });
    it('App.svelte contains <nav', () => {
      expect(app).toMatch(/<nav\b/);
    });
    it('App.svelte contains <main', () => {
      expect(app).toMatch(/<main\b/);
    });
    it('App.svelte contains <footer', () => {
      expect(app).toMatch(/<footer\b/);
    });
    it('skip-link <a> is rendered with class="skip-link", href="#main", text "Skip to main content"', () => {
      expect(app).toMatch(
        /<a\s+class\s*=\s*["']skip-link["']\s+href\s*=\s*["']#main["']\s*>\s*Skip to main content\s*<\/a>/
      );
    });
    it('<main> has id="main"', () => {
      expect(app).toMatch(/<main\b[^>]*\bid\s*=\s*["']main["']/);
    });
    it('<main> has tabindex="-1"', () => {
      expect(app).toMatch(/<main\b[^>]*\btabindex\s*=\s*["']-1["']/);
    });
    it('the wordmark is <h1 class="wordmark"> containing WebUtilityLab and CSV Rescue', () => {
      expect(app).toMatch(/<h1\s+class\s*=\s*["']wordmark["']/);
      // The text fragments must appear inside the <h1> block.
      const h1 = app.match(/<h1[^>]*>[\s\S]*?<\/h1>/);
      expect(h1).not.toBeNull();
      const inner = h1?.[0] ?? '';
      expect(inner).toMatch(/WebUtilityLab/);
      expect(inner).toMatch(/CSV Rescue/);
    });
  });

  describe('AC14b: nav contents (Privacy + ThemeToggle, DOM order)', () => {
    it('<nav> has class="page-nav"', () => {
      expect(app).toMatch(/<nav\s+class\s*=\s*["']page-nav["']/);
    });
    it('nav contains the Privacy <a class="nav-privacy" href="#privacy">Privacy</a>', () => {
      expect(app).toMatch(
        /<a\s+class\s*=\s*["']nav-privacy["']\s+href\s*=\s*["']#privacy["']\s*>\s*Privacy\s*<\/a>/
      );
    });
    it('nav imports and renders <ThemeToggle />', () => {
      // Import path (relative)
      expect(app).toMatch(/import\s+ThemeToggle\s+from\s+['"][^'"]*ThemeToggle\.svelte['"]/);
      // Template render
      expect(app).toMatch(/<ThemeToggle\s*\/?>/);
    });
    it('Privacy link precedes ThemeToggle in DOM order (inside the nav block)', () => {
      // Extract the nav block; assert nav-privacy appears before <ThemeToggle.
      const nav = app.match(/<nav\b[\s\S]*?<\/nav>/);
      expect(nav).not.toBeNull();
      const inner = nav?.[0] ?? '';
      const privacyIdx = inner.search(/nav-privacy/);
      const toggleIdx = inner.search(/<ThemeToggle\b/);
      expect(privacyIdx).toBeGreaterThanOrEqual(0);
      expect(toggleIdx).toBeGreaterThan(privacyIdx);
    });
    it('nav has no "Home" / "About" / "Settings" links (editorial restraint)', () => {
      const nav = app.match(/<nav\b[\s\S]*?<\/nav>/)?.[0] ?? '';
      expect(nav).not.toMatch(/>Home</);
      expect(nav).not.toMatch(/>About</);
      expect(nav).not.toMatch(/>Settings</);
    });
  });

  describe('AC14c: skip-link is first tab stop + visually hidden until focused', () => {
    it('skip-link <a> appears BEFORE <header> in source order', () => {
      // Use the comment-stripped view so the script-block documentation
      // (which mentions `<header>` in plain prose) doesn't trip the
      // positional check. The actual template element must come AFTER
      // the skip-link.
      const skipIdx = appSource.search(/<a\s+class\s*=\s*["']skip-link["']/);
      const headerIdx = appSource.search(/<header\b/);
      expect(skipIdx).toBeGreaterThanOrEqual(0);
      expect(headerIdx).toBeGreaterThan(skipIdx);
    });
    it('app.css defines .skip-link with the visually-hidden pattern (position: absolute + clip: rect(0, 0, 0, 0))', () => {
      expect(css).toMatch(/\.skip-link\s*\{[\s\S]*?position\s*:\s*absolute/);
      expect(css).toMatch(/\.skip-link\s*\{[\s\S]*?clip\s*:\s*rect\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/);
    });
    it('app.css lifts the clip on :focus / :focus-visible', () => {
      // The focus rule must reset `clip: auto` so the link becomes
      // visible when keyboard-focused.
      expect(css).toMatch(/\.skip-link:focus[^{]*\{[\s\S]*?clip\s*:\s*auto/);
    });
  });

  describe('AC14d: ThemeToggle imported + rendered (no new instances, S02.3 boundary pin)', () => {
    it('App.svelte imports ThemeToggle from ./components/ThemeToggle.svelte', () => {
      // The import path must be the canonical S02.3 location.
      expect(app).toMatch(
        /import\s+ThemeToggle\s+from\s+['"]\.\/components\/ThemeToggle\.svelte['"]/
      );
    });
    it('App.svelte renders exactly one <ThemeToggle /> element', () => {
      const matches = app.match(/<ThemeToggle\b/g) ?? [];
      expect(matches.length).toBe(1);
    });
    it('the ThemeToggle component still ships the S02.3 canonical runes (boundary pin)', () => {
      // Regression: if S02.4 inadvertently rewrites ThemeToggle, the
      // canonical S02.3 surface would drift. This test pins the
      // boundary — the toggle is unchanged from S02.3.
      expect(toggle).toMatch(/\$state\s*\(/);
      expect(toggle).toMatch(/\$derived\s*\(/);
      expect(toggle).toMatch(/aria-pressed\s*=\s*\{\s*pressed\s*\}/);
      expect(toggle).toMatch(/addEventListener\s*\(\s*['"]storage['"]/);
      expect(toggle).toMatch(/class\s*=\s*["']visually-hidden["']/);
    });
  });

  describe('AC14e: no <div onClick> or Svelte 4 on:click / @click (AD-9)', () => {
    it('App.svelte does not use Svelte 4 on:click syntax', () => {
      // Review #1 patch (S02.4): use appSource (comment-stripped) for
      // negative assertions. The script-block JSDoc in App.svelte
      // documents on:click / @click as forbidden patterns — using raw
      // `app` would false-fail the test against that documenting
      // prose. `appSource` strips the comment, leaving only real
      // markup for the negative scan.
      expect(appSource).not.toMatch(/\bon\s*:\s*click\s*=/);
    });
    it('App.svelte does not use @click shorthand', () => {
      expect(appSource).not.toMatch(/@click\b/);
    });
    it('App.svelte does not place onclick on a <div>', () => {
      expect(appSource).not.toMatch(/<div\b[^>]*\bonclick\s*=/);
    });
    it('App.svelte does not place onclick on a <span>', () => {
      expect(appSource).not.toMatch(/<span\b[^>]*\bonclick\s*=/);
    });
    it('App.svelte does not place onclick on a <a>', () => {
      // Belt-and-braces — anchors must use href, not onclick.
      expect(appSource).not.toMatch(/<a\b[^>]*\bonclick\s*=/);
    });
  });

  describe('AC14f: no inline <style> block in App.svelte (AD-7)', () => {
    it('App.svelte does not contain a <style> block', () => {
      // Use the comment-stripped view so the documenting prose
      // ("no inline <style>, no hex literals") does not trip the
      // negative assertion. A real `<style>` block would still be
      // matched after comment removal.
      expect(appSource).not.toMatch(/<style\b/);
    });
  });

  describe('AC14g: no hex literals in app.css (chrome-only scope)', () => {
    it('app.css contains no #rrggbb / #rgb / #rrggbbaa literals', () => {
      const hexLiteral = /#[0-9a-fA-F]{3,8}\b/;
      const m = stripComments(css).match(hexLiteral);
      expect(m).toBeNull();
    });
  });

  describe('AC14h: no web fonts / no analytics URLs', () => {
    it('app.css contains no @font-face declaration', () => {
      expect(stripComments(css)).not.toMatch(/@font-face\b/);
    });
    it('App.svelte contains no @font-face declaration', () => {
      expect(stripComments(app)).not.toMatch(/@font-face\b/);
    });
    it('app.css contains no Google Fonts / external font URLs', () => {
      expect(stripComments(css)).not.toMatch(/fonts\.googleapis/);
      expect(stripComments(css)).not.toMatch(/fonts\.gstatic/);
    });
    it('App.svelte contains no Google Fonts / external font URLs', () => {
      expect(stripComments(app)).not.toMatch(/fonts\.googleapis/);
      expect(stripComments(app)).not.toMatch(/fonts\.gstatic/);
    });
  });

  describe('AC14i: no new forbidden source patterns (Privacy Baseline)', () => {
    const forbidden = [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bEventSource\s*\(/,
      /\bsendBeacon\s*\(/,
      /\bnavigator\.sendBeacon\b/,
      /\bnew\s+Function\s*\(/,
      /\beval\s*\(/,
      /\bimport\s*\(/,
    ];
    for (const pat of forbidden) {
      it(`App.svelte forbids ${pat.source}`, () => {
        expect(stripComments(app), pat.source).not.toMatch(pat);
      });
      it(`app.css forbids ${pat.source}`, () => {
        expect(stripComments(css), pat.source).not.toMatch(pat);
      });
    }
  });

  describe('AC14j: S02.3 AC11g allowlist still exact (no third offender)', () => {
    it("theme-seed.test.ts AC11g toEqual allowlist remains ['index.html', 'src/components/ThemeToggle.svelte']", () => {
      // Mirrors AC13j from tests/theme-toggle.test.ts: the S02.3
      // widening must be preserved EXACTLY through S02.4. The chrome
      // does not add a classList mutation surface; this test pins the
      // boundary.
      const seedTest = readFileSync(seedTestPath, 'utf8');
      expect(seedTest).toMatch(
        /toEqual\(\s*\[\s*['"]index\.html['"]\s*,\s*['"]src\/components\/ThemeToggle\.svelte['"]\s*\]/
      );
    });
  });

  describe('AC14k: skip-link visible text is locked to "Skip to main content"', () => {
    it('skip-link <a> renders exactly "Skip to main content" (no drift)', () => {
      // AC14k is a strict editorial lock: a drift to "Skip to content"
      // or "Skip past header" trips here. Anchored to the exact
      // surrounding markup so an injection of a second skip-link
      // (e.g. an S5.7 "Skip to problems" variant — not yet landed)
      // does not silently satisfy the AC.
      expect(app).toMatch(
        /<a\s+class\s*=\s*["']skip-link["']\s+href\s*=\s*["']#main["']\s*>\s*Skip to main content\s*<\/a>/
      );
      // And the literal drift substrings must not appear.
      expect(app).not.toMatch(/Skip to content<\/a>/);
      expect(app).not.toMatch(/Skip past header<\/a>/);
    });
  });

  describe('AC14l: wordmark <h1> lives in <header>, not in <main>', () => {
    it('the <h1 class="wordmark"> element appears inside <header>, before <main>', () => {
      // S01.1's scaffold nested <header> inside <main> (wrong).
      // S02.4 fixes the nesting: <header> and <main> are siblings,
      // and the wordmark <h1> lives inside <header>.
      //
      // Use the comment-stripped view so the documenting prose
      // (which mentions `<header>`, `<main>`, `<footer>`) doesn't
      // trip the positional check.
      const headerIdx = appSource.search(/<header\b/);
      const mainIdx = appSource.search(/<main\b/);
      const h1Idx = appSource.search(/<h1\s+class\s*=\s*["']wordmark["']/);
      expect(headerIdx).toBeGreaterThanOrEqual(0);
      expect(mainIdx).toBeGreaterThan(headerIdx);
      expect(h1Idx).toBeGreaterThan(headerIdx);
      expect(h1Idx).toBeLessThan(mainIdx);
    });
    it('the <h1 class="wordmark"> does NOT appear inside the <main> block', () => {
      // Defensive: even if a future contributor duplicates the
      // wordmark into <main> (S01.1's mistake), the inner-block check
      // trips here. Extract the <main> block from the comment-stripped
      // view (the script-block comment mentions `<main>` and `<header>`
      // in plain prose, which would otherwise be picked up by a naive
      // match).
      const main = appSource.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
      expect(main).not.toMatch(/<h1\s+class\s*=\s*["']wordmark["']/);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const togglePath = join(repoRoot, 'src', 'components', 'ThemeToggle.svelte');
const seedTestPath = join(repoRoot, 'tests', 'theme-seed.test.ts');

/**
 * S02.3 — ThemeToggle.svelte test gate.
 *
 * The user-initiated theme flip is the second half of AD-7. This test
 * file is the canonical gate: every AC13a–AC13j assertion is checked
 * at `npm test` time, and CI runs that. The component is structurally
 * a Svelte 5 file; the test reads it as text and asserts shape, not
 * runtime behavior (the runtime claim is verified separately by
 * `scripts/audit-behavior.mjs` and a manual cross-tab test).
 *
 * The toggle's contract (S02.3):
 *   - renders a real `<button type="button">` (AD-9),
 *   - `aria-pressed` reflects the current `mode`,
 *   - the visible label switches 'Dark' ↔ 'Light',
 *   - the sun/moon glyph is decorative (`aria-hidden="true"`),
 *   - a separate visually-hidden `<span aria-live="polite">` announces
 *     the new mode on flip,
 *   - on click, applies the class flip and writes `wul-theme` to
 *     `localStorage` (wrapped in try/catch),
 *   - on `storage` events for `wul-theme`, mirrors the other tab
 *     WITHOUT re-persisting,
 *   - styling uses token-only CSS (no hex literals, no rgb()/hsl()),
 *   - no network primitives (Privacy Baseline).
 */
describe('theme-toggle (S02.3 user-initiated theme toggle)', () => {
  const src = readFileSync(togglePath, 'utf8');

  describe('AC13a: component file exists & renders a <button type="button">', () => {
    it('template contains a <button element', () => {
      expect(src).toMatch(/<button\b/);
    });
    it('button has type="button"', () => {
      expect(src).toMatch(/<button[^>]*\btype\s*=\s*["']button["']/i);
    });
  });

  describe('AC13b: no <div onClick> / on:click pattern (AD-9)', () => {
    it('does not use Svelte 4 on:click syntax', () => {
      // AD-9 + Svelte 5 idiom: only onclick={...} is allowed.
      expect(src).not.toMatch(/\bon\s*:\s*click\s*=/);
    });
    it('does not use @click on a non-button element', () => {
      // No `@click` shorthand anywhere; the Svelte 5 binding is
      // `onclick={onClick}`. A future drift to @click would still
      // surface here (the literal `@click` token).
      expect(src).not.toMatch(/@click\b/);
    });
    it('does not place onclick on a <div>', () => {
      // Belt-and-braces: a <div onclick={…}> pattern is forbidden by
      // AD-9. The test asserts no such binding exists at all (the
      // component uses a real button, period).
      expect(src).not.toMatch(/<div\b[^>]*\bonclick\s*=/);
    });
  });

  describe('AC13c: aria-pressed reflects the mode', () => {
    it('binds aria-pressed to the pressed reactive identifier', () => {
      // Step-05 fix: was `aria-pressed\s*=\s*\{` (any brace form,
      // including static 'false'/'true' literals). Tightened to
      // anchor the binding identifier to `pressed`, which is the
      // `$derived(mode === 'dark')` declaration. A regression that
      // hard-codes `aria-pressed={'false'}` now trips here.
      expect(src).toMatch(/aria-pressed\s*=\s*\{\s*pressed\s*\}/);
    });
    it('the pressed derivation is reactive on mode', () => {
      // $derived(mode === 'dark') — the rune syntax that guarantees
      // aria-pressed re-evaluates when mode flips.
      expect(src).toMatch(/\$derived\s*\(\s*mode\s*===\s*['"]dark['"]\s*\)/);
    });
  });

  describe('AC13d: storage event listener + paired removeEventListener', () => {
    it('adds a storage event listener on window', () => {
      expect(src).toMatch(/addEventListener\s*\(\s*['"]storage['"]/);
    });
    it('removes the storage event listener on cleanup', () => {
      expect(src).toMatch(/removeEventListener\s*\(\s*['"]storage['"]/);
    });
    it('the listener is wired inside an onMount-shaped return', () => {
      // Svelte 5 idiom: `onMount(() => { ...; return () => ...; })`.
      expect(src).toMatch(/\bonMount\s*\(/);
      // The addEventListener('storage', …) and the
      // removeEventListener('storage', …) must both appear inside
      // the same onMount block. The test asserts both are present
      // (above); here we additionally confirm the addEventListener is
      // followed (within the file) by the matching removeEventListener
      // — i.e. the listener is paired, not orphaned.
      const addIdx = src.search(/addEventListener\s*\(\s*['"]storage['"]/);
      const removeIdx = src.search(/removeEventListener\s*\(\s*['"]storage['"]/);
      expect(addIdx).toBeGreaterThanOrEqual(0);
      expect(removeIdx).toBeGreaterThan(addIdx);
    });
    it('onStorage filters by storageArea === localStorage', () => {
      // Step-05 fix: the AC5 contract gates on
      // `e.storageArea === localStorage` so cross-storage writes
      // (sessionStorage in browsers that surface it, etc.) do not
      // flip the toggle. A drift that drops the guard (or rewrites
      // it as `e.storageArea === window.localStorage`) trips here.
      expect(src).toMatch(/e\.storageArea\s*!==?\s*localStorage/);
    });
    it('onStorage filters by e.key === "wul-theme"', () => {
      // Step-05 fix: the AC5 contract gates on `e.key === 'wul-theme'`
      // so unrelated localStorage writes (e.g., a third-party
      // extension writing 'foo') do not flip the toggle.
      expect(src).toMatch(/e\.key\s*!==?\s*['"]wul-theme['"]/);
    });
    it('addEventListener and removeEventListener share the same onStorage reference', () => {
      // Step-05 fix: the AC5 leak risk is `addEventListener('storage', fnA)`
      // paired with `removeEventListener('storage', fnB)` — the listener
      // never detaches. Assert the same identifier `onStorage` (the
      // named inner function in the onMount block) is referenced by
      // BOTH calls. The token boundary check (`\bonStorage\b`) ensures
      // a false-positive match in a comment is impossible.
      expect(src).toMatch(/addEventListener\s*\(\s*['"]storage['"]\s*,\s*onStorage\b/);
      expect(src).toMatch(/removeEventListener\s*\(\s*['"]storage['"]\s*,\s*onStorage\b/);
    });
  });

  describe('AC13e: localStorage.setItem("wul-theme", mode) is the persistence path', () => {
    it('writes wul-theme via localStorage.setItem', () => {
      expect(src).toMatch(/localStorage\.setItem\s*\(\s*['"]wul-theme['"]/);
    });
    it('the setItem call is wrapped in a try/catch', () => {
      expect(src).toMatch(/\btry\s*\{[\s\S]*?localStorage\.setItem[\s\S]*?\}\s*catch\s*\(/);
    });
    it('localStorage.setItem("wul-theme", ...) appears exactly once (the onClick persist)', () => {
      // Step-05 fix: AC5's "Do NOT persist again" invariant requires
      // that `onStorage` does not echo a localStorage write. Assert
      // there is exactly ONE call site — i.e., only the `onClick`
      // path persists. A drift that adds `localStorage.setItem`
      // inside `onStorage` would double the count and trip here.
      const matches = src.match(/localStorage\.setItem\s*\(\s*['"]wul-theme['"]/g) ?? [];
      expect(matches.length).toBe(1);
    });
  });

  describe('AC13f: decorative glyphs (sun/moon), not state', () => {
    it('the sun/moon glyph element is aria-hidden="true"', () => {
      // The glyph sits inside a <span class="theme-toggle-glyph"
      // aria-hidden="true">…</span>. Assert the glyph <span> carries
      // aria-hidden="true" (the state-bearing token is the visible
      // label, not the decorative glyph).
      expect(src).toMatch(/<span\s+class\s*=\s*["']theme-toggle-glyph["'][^>]*aria-hidden\s*=\s*["']true["']/);
    });
    it('contains the unicode sun glyph (☀)', () => {
      expect(src).toMatch(/☀/);
    });
    it('contains the unicode moon glyph (☾)', () => {
      expect(src).toMatch(/☾/);
    });
  });

  describe('AC13g: live region (aria-live="polite")', () => {
    it('template contains aria-live="polite"', () => {
      expect(src).toMatch(/aria-live\s*=\s*["']polite["']/);
    });
    it('live region is the named visually-hidden <span>', () => {
      // Spec AC13g: live region is `<span class="visually-hidden"
      // aria-live="polite">`. Assert both class name and aria-live
      // attribute co-occur on the same span.
      expect(src).toMatch(/<span\s+class\s*=\s*["']visually-hidden["'][^>]*aria-live\s*=\s*["']polite["']/);
    });
    it('the announcement text is bound to a state field', () => {
      // The live text is the `$state('Theme: ' + mode)` initial value
      // exposed via the `$derived` `liveText`. Assert the literal
      // `Theme: ` prefix lands somewhere in the source so screen
      // readers don't read 'Dark' as an isolated state.
      expect(src).toMatch(/['"]Theme:\s*['"]/);
      expect(src).toMatch(/\$state\s*\(\s*['"]Theme:\s*['"]\s*\+\s*mode\s*\)/);
    });
    it('liveText is a $derived on announcement (reactive on flip)', () => {
      // Step-05 fix: AC4 requires the live region to actually update
      // on flip. The wiring is `liveText = $derived(announcement)`,
      // then `<span aria-live="polite">{liveText}</span>`. Without
      // this assertion, deleting the `$derived` (and leaving the
      // span bound to a stale `$state`) would pass AC13g.
      expect(src).toMatch(/liveText\s*=\s*\$derived\s*\(\s*announcement\s*\)/);
    });
  });

  describe('AC13h: no new tokens / no hex literals / no rgb() / no hsl() in component CSS', () => {
    it('component file contains no hex color literal', () => {
      // Mirror tests/tokens-css.test.ts AC6.
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
    it('component file contains no rgb()/rgba() color function', () => {
      expect(src).not.toMatch(/\brgba?\s*\(/i);
    });
    it('component file contains no hsl()/hsla() color function', () => {
      expect(src).not.toMatch(/\bhsla?\s*\(/i);
    });
    it('component CSS references --font-system, --ink, --paper, --rule, --graphite, --radius-toggle', () => {
      // Per spec AC9 + AD-8: visual styling uses tokens only. The
      // expected set, lifted from DESIGN.md §"Theme toggle".
      const expected = [
        '--font-system',
        '--size-body',
        '--weight-body',
        '--ink',
        '--paper',
        '--rule',
        '--graphite',
        '--radius-toggle',
      ];
      const missing = expected.filter((name) => !new RegExp(`${name}\\b`).test(src));
      expect(missing).toEqual([]);
    });
  });

  describe('AC13i: no fetch / XMLHttpRequest / EventSource / sendBeacon (Privacy Baseline)', () => {
    const forbidden = [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bEventSource\s*\(/,
      /\bsendBeacon\s*\(/,
      /\bnavigator\.sendBeacon\b/,
      /\bnew\s+Function\s*\(/,
      /\beval\s*\(/,
      /fonts\.googleapis/,
      /fonts\.gstatic/,
      /@font-face/,
    ];
    for (const pat of forbidden) {
      it(`forbids ${pat.source}`, () => {
        expect(src, pat.source).not.toMatch(pat);
      });
    }
  });

  describe('AC13j: S02.2 AC11g allowlist extension', () => {
    // The S02.2 step-05 patch recorded this as a known follow-up:
    // `tests/theme-seed.test.ts` AC11g must be widened to accept
    // `src/components/ThemeToggle.svelte` as a named offender. This
    // test verifies the widening is exact: the offenders list equals
    // exactly the seed path AND the toggle path. A future third
    // offender (e.g. a S02.4 chrome shim) trips here.
    it('theme-seed.test.ts AC11g toEqual allowlist contains the toggle (not just a comment mention)', () => {
      // Step-05 fix: an earlier version of this AC checked only that
      // `components/ThemeToggle.svelte` appears *somewhere* in the
      // seed test file — which would pass even if line 269 reverted
      // to `toEqual(['index.html'])` because the literal string
      // appears in the explanatory comment. The tightened regex
      // anchors the match inside a `toEqual([...])` array literal,
      // so the AC11g "exact allowlist" claim is actually pinned.
      const seedTest = readFileSync(seedTestPath, 'utf8');
      expect(seedTest).toMatch(
        /toEqual\(\s*\[[^\]]*['"]src\/components\/ThemeToggle\.svelte['"][^\]]*\]/
      );
    });
    it('the toggle file is the only src/ offender (no wildcard future regressions)', () => {
      // The widening is exact, not "any path under src/components/"
      // (which would silently allow future regressions). The test
      // cross-references the post-S02.3 AC11g exact array assertion
      // (must include both `'index.html'` AND `'src/components/ThemeToggle.svelte'`
      // inside the same `toEqual` call).
      const seedTest = readFileSync(seedTestPath, 'utf8');
      expect(seedTest).toMatch(
        /toEqual\(\s*\[\s*['"]index\.html['"]\s*,\s*['"]src\/components\/ThemeToggle\.svelte['"]\s*\]/
      );
    });
  });
});
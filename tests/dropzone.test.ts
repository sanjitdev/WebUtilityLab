import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const dropzonePath = join(repoRoot, 'src', 'components', 'Dropzone.svelte');
const appPath = join(repoRoot, 'src', 'App.svelte');
const pageChromeTestPath = join(repoRoot, 'tests', 'page-chrome.test.ts');
const themeToggleTestPath = join(repoRoot, 'tests', 'theme-toggle.test.ts');
const focusRingTestPath = join(repoRoot, 'tests', 'focus-ring.test.ts');
const editorialPostureTestPath = join(repoRoot, 'tests', 'editorial-posture.test.ts');

/**
 * S03.1 — Dropzone test gate.
 *
 * The dropzone is the user-visible gesture surface for E03 (CSV
 * ingestion). This test file is the canonical gate: every AC17a–AC17l
 * assertion is checked at `npm test` time, and CI runs that. The
 * component is structurally a Svelte 5 file; the test reads it as
 * text and asserts shape, not runtime behavior (the runtime claim —
 * clicking the button opens the native file picker, the dashed border
 * thickens on dragover — is verified separately by manual DevTools
 * passes documented in the story).
 *
 * The dropzone's contract (S03.1):
 *   - renders a real `<button type="button">` (AD-9; no div onClick),
 *   - has a hidden `<input type="file">` underneath that the button
 *     opens via `.click()` (no `@change` handler wired in S03.1),
 *   - hover lifts the background to `--accent-soft` and the border to
 *     `--accent`; `.is-dragover` thickens the border to 3px,
 *   - zero hex literals (AD-8); no network primitives (Privacy
 *     Baseline); no Svelte 4 `on:click` / `@click`,
 *   - mount point: `<Dropzone />` lives inside `<main class="page-main">`.
 *
 * The cross-story boundary pins (AC17k) follow the description-string
 * anchor pattern from `tests/focus-ring.test.ts:308-319`.
 */
describe('dropzone (S03.1 real <button> dropzone opens file picker)', () => {
  const dropzone = readFileSync(dropzonePath, 'utf8');
  const app = readFileSync(appPath, 'utf8');
  const pageChromeTest = readFileSync(pageChromeTestPath, 'utf8');
  const themeToggleTest = readFileSync(themeToggleTestPath, 'utf8');
  const focusRingTest = readFileSync(focusRingTestPath, 'utf8');
  const editorialPostureTest = readFileSync(editorialPostureTestPath, 'utf8');

  // Strip block + line + HTML comments so documenting comments don't
  // false-positive on forbidden-pattern scans (the script-block
  // documentation in Dropzone.svelte mentions `onclick`, `@click`,
  // `<button>`, etc. — those are not real declarations).
  const stripComments = (s: string): string =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/<!--[\s\S]*?-->/g, '');
  // `dropzoneSource` is the comment-stripped view used for the
  // forbidden-pattern negative assertions and the positional / element
  // presence checks that should ignore documenting prose.
  const dropzoneSource = stripComments(dropzone);
  // `appSource` is the comment-stripped view of App.svelte, mirroring
  // `tests/page-chrome.test.ts:52` — used for every positional /
  // "this element is not present" assertion.
  const appSource = stripComments(app);

  describe('AC17a: real <button>, no div onClick / on:click / @click (AD-9)', () => {
    it('Dropzone.svelte template contains <button element', () => {
      expect(dropzone).toMatch(/<button\b/);
    });
    it('Dropzone.svelte template contains <input type="file"', () => {
      // The hidden input is the picker primitive. The regex is
      // tolerant of attribute wrapping across lines (the production
      // file spreads attributes across multiple lines for readability).
      expect(dropzone).toMatch(/<input\b[\s\S]*?type\s*=\s*["']file["']/);
    });
    it('App.svelte does not use Svelte 4 on:click syntax', () => {
      // Boundary pin with the chrome test: a future contributor who
      // rewrites the chrome with `on:click` trips both tests.
      expect(appSource).not.toMatch(/\bon\s*:\s*click\s*=/);
    });
    it('App.svelte does not use @click shorthand', () => {
      expect(appSource).not.toMatch(/@click\b/);
    });
    it('App.svelte does not place onclick on a <div>', () => {
      expect(appSource).not.toMatch(/<div\b[^>]*\bonclick\s*=/i);
    });
    it('App.svelte does not place onclick on a <span>', () => {
      expect(appSource).not.toMatch(/<span\b[^>]*\bonclick\s*=/i);
    });
    it('App.svelte does not place onclick on a <a>', () => {
      expect(appSource).not.toMatch(/<a\b[^>]*\bonclick\s*=/i);
    });
  });

  describe('AC17b: hidden <input type="file"> with id, accept, no multiple', () => {
    it('input has id="file-input"', () => {
      // Anchored on a literal `id="file-input"` so a future rename
      // trips this AC (the AC's regex is the canonical pin).
      expect(dropzone).toMatch(/\bid\s*=\s*["']file-input["']/);
    });
    it('input has name="file"', () => {
      expect(dropzone).toMatch(/\bname\s*=\s*["']file["']/);
    });
    it('input has accept=".csv,text/csv" (the .csv extension AND the text/csv MIME)', () => {
      // The accept attribute must list both the `.csv` extension
      // AND the `text/csv` MIME per the spec.
      expect(dropzone).toMatch(/\baccept\s*=\s*["'][^"']*\.csv[^"']*["']/);
    });
    it('input is visually hidden (carries the .visually-hidden class)', () => {
      // The button IS the affordance; the input is hidden via the
      // `.visually-hidden` helper (mirror ThemeToggle.svelte:91-101).
      expect(dropzone).toMatch(/<input\b[^>]*class\s*=\s*["'][^"']*\bvisually-hidden\b[^"']*["']/);
    });
    it('input has NO <label> (the button is the label, AD-9)', () => {
      // Per AC2: "The input has NO <label>". The chrome test pins the
      // same thing implicitly (no <label for="file-input"> appears in
      // the chrome), but this is the load-bearing pin.
      expect(dropzone).not.toMatch(/<label\b[^>]*\bfor\s*=\s*["']file-input["']/);
    });
    it('input has NO multiple attribute (FR-1 is singular)', () => {
      // The spec pins `multiple` as absent; a future contributor
      // adding multi-file support would trip this AC.
      expect(dropzone).not.toMatch(/\bmultiple\b/);
    });
    // Step-05 patch (review #3 finding): the input is visually hidden
    // via `.visually-hidden` but is still tabbable by default — a
    // keyboard user tabs past the button into an invisible focus
    // target. The a11y fix is `tabindex="-1"` on the input: still
    // programmatically clickable by `fileInput.click()` (openPicker),
    // but removed from the tab order. The button remains the sole
    // keyboard affordance, which is the editorial intent (AD-9).
    it('input has tabindex="-1" (not in keyboard tab order — button is the affordance)', () => {
      // Anchor on the literal `tabindex="-1"` so a future contributor
      // who removes it (or replaces it with `tabindex="0"`) trips this
      // AC. The attribute may live on the <input> opening tag across
      // multi-line, so use the comment-stripped source.
      expect(dropzoneSource).toMatch(/<input\b[^>]*\btabindex\s*=\s*["']-1["']/);
    });
  });

  describe('AC17c: hover + dragover styling (CSS pre-wires .is-dragover)', () => {
    it('.dropzone base rule sets border-style: dashed', () => {
      // The dashed border pattern is the editorial signature (DESIGN.md
      // §"Components" → Dropzone).
      const dropzoneRule = dropzoneSource.match(/\.dropzone\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      expect(dropzoneRule).toMatch(/border-style\s*:\s*dashed/);
    });
    it('.dropzone base rule uses var(--graphite) for border color', () => {
      // AD-8: token-only colors. The base border color is `--graphite`.
      const dropzoneRule = dropzoneSource.match(/\.dropzone\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      expect(dropzoneRule).toMatch(/border-color\s*:\s*var\(\s*--graphite\s*\)/);
    });
    it('.dropzone:hover rule lifts background to var(--accent-soft)', () => {
      // The :hover rule must lift the background per DESIGN.md.
      const hoverRule =
        dropzoneSource.match(/\.dropzone\s*:\s*hover\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      expect(hoverRule).toMatch(/background\s*:\s*var\(\s*--accent-soft\s*\)/);
    });
    it('.dropzone:hover rule shifts border to var(--accent)', () => {
      // The :hover rule shifts the border color to --accent.
      const hoverRule =
        dropzoneSource.match(/\.dropzone\s*:\s*hover\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      expect(hoverRule).toMatch(/border-color\s*:\s*var\(\s*--accent\s*\)/);
    });
    it('cursor: pointer appears in the .dropzone base rule (or :hover rule)', () => {
      // Per AC7: cursor is `pointer` (not `default`). The spec says
      // "on hover" but the canonical Svelte+button idiom is to put
      // `cursor: pointer` on the base rule (the button is always
      // interactive). The test accepts either rule to avoid locking
      // the implementation to a single placement.
      const baseRule = dropzoneSource.match(/\.dropzone\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      const hoverRule =
        dropzoneSource.match(/\.dropzone\s*:\s*hover\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      const cursorPointer = /cursor\s*:\s*pointer/;
      const baseHas = cursorPointer.test(baseRule);
      const hoverHas = cursorPointer.test(hoverRule);
      expect(baseHas || hoverHas, 'cursor: pointer must appear in .dropzone or .dropzone:hover').toBe(true);
    });
    it('.dropzone.is-dragover rule thickens border to 3px', () => {
      // Per AC4 + dev-notes: dragover visual thickens the border.
      // Implementation uses decomposed `border-width: 3px` so the
      // regex matches cleanly (the spec warns about shorthand-vs-
      // decomposed risk; decomposed is the cleanest path).
      const dragoverRule =
        dropzoneSource.match(/\.dropzone\.is-dragover\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      expect(dragoverRule).toMatch(/border-width\s*:\s*[2-9](\.\d+)?\s*px/);
    });
  });

  describe('AC17d: click handler opens the file picker', () => {
    it('template uses Svelte 5 onclick={openPicker} syntax (no on:click, no @click)', () => {
      // Per AC5 + AC17a boundary: Svelte 5 syntax is the only allowed
      // binding shape. The chrome test AC14e pins the absence of
      // `on:click` / `@click`; this is the dropzone-side mirror.
      expect(dropzone).toMatch(/\bonclick\s*=\s*\{\s*openPicker\s*\}/);
      expect(dropzoneSource).not.toMatch(/\bon\s*:\s*click\s*=/);
      expect(dropzoneSource).not.toMatch(/@click\b/);
    });
    it('script block defines a named `openPicker` function (not inline arrow)', () => {
      // Per AC5: "The handler is attached via ... named function
      // (`openPicker`) — not an inline arrow". A `function openPicker()`
      // or `const openPicker = …` is the canonical shape.
      expect(dropzone).toMatch(/\bfunction\s+openPicker\b/);
    });
    it('openPicker function body calls .click() on a reference to the file input', () => {
      // Per AC5: `fileInput.click()` is the canonical form. The bind:this
      // reference + the .click() call both appear inside the script.
      expect(dropzone).toMatch(/\bfileInput\b[^\n]*\.\s*click\s*\(\s*\)/);
    });
  });

  describe('AC17e: NO file accept handler in S03.1 (scope-creep pin)', () => {
    // Per AC6: S03.1 is purely the visual chrome + picker-opening gesture.
    // No @change, no handleFile, no FileReader. S03.7 wires the change
    // handler. This AC is the load-bearing pin against future scope drift.
    it('Dropzone.svelte does NOT contain @change / on:change / onchange', () => {
      expect(dropzoneSource).not.toMatch(/@change\b/);
      expect(dropzoneSource).not.toMatch(/\bon\s*:\s*change\s*=/);
      expect(dropzoneSource).not.toMatch(/\bonchange\s*=/);
    });
    it('Dropzone.svelte does NOT contain handleFile / onFile / processFile', () => {
      expect(dropzoneSource).not.toMatch(/\bhandleFile\b/);
      expect(dropzoneSource).not.toMatch(/\bonFile\b/);
      expect(dropzoneSource).not.toMatch(/\bprocessFile\b/);
    });
    it('Dropzone.svelte does NOT contain FileReader / readAsText', () => {
      expect(dropzoneSource).not.toMatch(/\bFileReader\b/);
      expect(dropzoneSource).not.toMatch(/\breadAsText\b/);
    });
    // Step-05 patch (review #2 finding): the forbidden list above does
    // NOT catch a future contributor who wires the accept handler via
    // imperative DOM API: `input.addEventListener('change', …)`. The
    // Svelte template-level handlers (`on:change=`, `onchange=`) are
    // pinned, but the imperative DOM-API path bypasses the gate. S03.1
    // is purely the picker-opening gesture — no change listener of
    // ANY shape lives here.
    it('Dropzone.svelte does NOT wire addEventListener("change", …) (imperative DOM API bypass)', () => {
      expect(dropzoneSource).not.toMatch(/\baddEventListener\s*\(\s*['"]change['"]/);
    });
    it('Dropzone.svelte does NOT contain onMount(…) (no imperatively-mounted accept handler)', () => {
      // Belt-and-suspender: a future contributor might add an
      // `onMount(() => fileInput.addEventListener('change', …))`.
      // Pinning `onMount(` absent keeps S03.1 purely declarative.
      expect(dropzoneSource).not.toMatch(/\bonMount\s*\(/);
    });
  });

  describe('AC17f: zero hex literals in component CSS (AD-8)', () => {
    it('Dropzone.svelte contains no #rrggbb / #rgb / #rrggbbaa literal (outside comments)', () => {
      // Mirror tests/editorial-posture.test.ts:55-61 stripComments helper.
      const stripped = stripComments(dropzone);
      const hexLiteral = /#[0-9a-fA-F]{3,8}\b/;
      expect(stripped, 'hex literal found in Dropzone.svelte').not.toMatch(hexLiteral);
    });
  });

  describe('AC17g: no forbidden source patterns (Privacy Baseline + AD-7)', () => {
    // Mirror S02.4 AC14i: no fetch, XMLHttpRequest, EventSource,
    // sendBeacon, navigator.sendBeacon, new Function, eval, dynamic
    // import(). The `<style>` block is scanned too — a future drift
    // to `transition: all` would surface here (transition is the
    // only motion primitive AD-7 allows; this gate would catch a
    // future contributor who added `animation:` or `@keyframes`).
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
      it(`Dropzone.svelte forbids ${pat.source}`, () => {
        expect(dropzoneSource, pat.source).not.toMatch(pat);
      });
    }
  });

  describe('AC17h: App.svelte stays without inline <style> (AD-7, boundary pin)', () => {
    // Reverse direction from the chrome test: the chrome test asserts
    // App.svelte has no `<style>`; this AC is the second pin (a
    // regression that re-introduces inline styles trips both tests).
    it('App.svelte does not contain a <style> block', () => {
      expect(appSource).not.toMatch(/<style\b/);
    });
  });

  describe('AC17i: visible label is sentence-case, no ALL CAPS, no SaaS register', () => {
    // Extract the button text content; pin its shape. Use the
    // comment-stripped source so documenting prose that mentions
    // `<button type="button">` in the script-block JSDoc doesn't
    // satisfy the regex (the lazy quantifier would otherwise match
    // the first `<button>` mention in the comment).
    it('<button> text begins with a capital letter (sentence-case first char)', () => {
      const m = dropzoneSource.match(/<button[^>]*>([\s\S]*?)<\/button>/);
      expect(m).not.toBeNull();
      const text = (m?.[1] ?? '').trim();
      // First character is `[A-Z]`. (Non-Latin label drift is a known
      // follow-up; see step-05 maintenance notes.)
      expect(text.charAt(0)).toMatch(/[A-Z]/);
    });
    it('<button> text does NOT contain ALL CAPS substrings of length ≥ 4', () => {
      const m = dropzoneSource.match(/<button[^>]*>([\s\S]*?)<\/button>/);
      expect(m).not.toBeNull();
      const text = (m?.[1] ?? '').trim();
      expect(text, 'ALL CAPS drift in dropzone label').not.toMatch(/\b[A-Z]{4,}\b/);
    });
    it('<button> text is exactly "Browse files" (locked placeholder)', () => {
      // The S03.1 placeholder is "Browse files" (sentence case, two
      // words, no quotes). The locked empty-state copy lands in S03.5.
      const m = dropzoneSource.match(/<button[^>]*>([\s\S]*?)<\/button>/);
      expect(m).not.toBeNull();
      const text = (m?.[1] ?? '').trim();
      expect(text).toBe('Browse files');
    });
  });

  describe('AC17j: touch target ≥ 44×44 CSS-px', () => {
    it('.dropzone base rule has min-height: 44px', () => {
      const dropzoneRule = dropzoneSource.match(/\.dropzone\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      expect(dropzoneRule).toMatch(/min-height\s*:\s*44px/);
    });
    it('.dropzone base rule has min-width: 44px', () => {
      const dropzoneRule = dropzoneSource.match(/\.dropzone\s*\{([\s\S]*?)\}/)?.[1] ?? '';
      expect(dropzoneRule).toMatch(/min-width\s*:\s*44px/);
    });
  });

  describe('AC17k: prior-story boundary pins are unchanged', () => {
    // Mirror S02.5 AC15k / S02.6 AC16m: each prior story's test file
    // contains its expected unique description string (the description
    // anchor is robust against regex-escape fragility). A regression
    // that empties or rewrites any earlier test file trips here.
    it('tests/page-chrome.test.ts boundary pin (S02.4 chrome gate)', () => {
      // Page-chrome test still pins the AC11g allowlist description.
      expect(pageChromeTest).toMatch(
        /theme-seed\.test\.ts AC11g toEqual allowlist remains \['index\.html', 'src\/components\/ThemeToggle\.svelte'\]/
      );
    });
    it('tests/theme-toggle.test.ts boundary pin (S02.3 toggle gate)', () => {
      // The S02.3 toggle test's core identity marker.
      expect(themeToggleTest).toMatch(/theme-toggle/);
    });
    it('tests/focus-ring.test.ts boundary pin (S02.5 focus ring gate)', () => {
      // The S02.5 focus-ring test's core identity marker.
      expect(focusRingTest).toMatch(/focus-ring/);
    });
    it('tests/editorial-posture.test.ts boundary pin (S02.6 editorial posture gate)', () => {
      // The S02.6 editorial-posture test's AC16m description string
      // is the canonical anchor. A regression that empties or rewrites
      // the editorial-posture test trips here.
      expect(editorialPostureTest).toMatch(
        /tests\/focus-ring\.test\.ts still contains the AC11g allowlist description \(boundary pin\)/
      );
    });
  });

  describe('AC17l: dropzone is mounted inside <main class="page-main">', () => {
    it('App.svelte imports Dropzone from ./components/Dropzone.svelte', () => {
      // Per AC12: `import Dropzone from './components/Dropzone.svelte'`
      // (single quotes, relative path).
      expect(app).toMatch(
        /import\s+Dropzone\s+from\s+['"]\.\/components\/Dropzone\.svelte['"]/
      );
    });
    it('<Dropzone /> appears between <main and </main> in DOM order', () => {
      // The positional pin: <Dropzone /> must live inside <main>, not
      // in <header> or <footer>. Use the comment-stripped view so the
      // documenting prose doesn't trip the positional check.
      const mainIdx = appSource.search(/<main\b/);
      const mainEndIdx = appSource.search(/<\/main>/);
      const dropzoneIdx = appSource.search(/<Dropzone\s*\/?>/);
      expect(mainIdx).toBeGreaterThanOrEqual(0);
      expect(mainEndIdx).toBeGreaterThan(mainIdx);
      expect(dropzoneIdx).toBeGreaterThan(mainIdx);
      expect(dropzoneIdx).toBeLessThan(mainEndIdx);
    });
    it('<main> retains class="page-main", id="main", tabindex="-1" (S02.4 chrome contract)', () => {
      // The chrome surface is unchanged by S03.1 — the dropzone
      // mounts INSIDE <main> without altering the parent.
      const mainTag = appSource.match(/<main\b[^>]*>/)?.[0] ?? '';
      expect(mainTag).toMatch(/class\s*=\s*["']page-main["']/);
      expect(mainTag).toMatch(/id\s*=\s*["']main["']/);
      expect(mainTag).toMatch(/tabindex\s*=\s*["']-1["']/);
    });
  });
});
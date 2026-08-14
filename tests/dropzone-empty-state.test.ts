import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const appPath = join(repoRoot, 'src', 'App.svelte');
const dropzonePath = join(repoRoot, 'src', 'components', 'Dropzone.svelte');
const appCssPath = join(repoRoot, 'src', 'styles', 'app.css');
const dropzoneTestPath = join(repoRoot, 'tests', 'dropzone.test.ts');
const dropzoneDragPasteTestPath = join(repoRoot, 'tests', 'dropzone-drag-paste.test.ts');
const dropzoneFileCapTestPath = join(repoRoot, 'tests', 'dropzone-file-cap.test.ts');
const dropzoneAriaLiveTestPath = join(repoRoot, 'tests', 'dropzone-aria-live.test.ts');

/**
 * S03.5 — Empty-state copy from EXPERIENCE.md test gate.
 *
 * S03.1 shipped the visual chrome + the picker-opening gesture.
 * S03.2 wired drag-and-drop + paste handlers and exposed `onaccept`
 * (still UNBOUND in App.svelte). S03.3 added the 50 MB cap check.
 * S03.4 wired the App.svelte `onaccept` consumer and added the
 * `<output>` aria-live region. S03.5 lands the visible empty-state
 * surface: the headline (`<h2>`), the lede (verbatim from
 * EXPERIENCE.md §Voice and Tone), the two CTAs ("Try the example"
 * disabled button + "Browse files" anchor smooth-scroll), and the
 * three teaching cards (What we detect / What we show you / What
 * you can do) with the locked FR-2 / FR-3 / FR-5 category names
 * wrapped in `<code>` (mono for data).
 *
 * Every AC21a–AC21k assertion is checked at `npm test` time. The
 * App.svelte + Dropzone.svelte + app.css files are read as text
 * and asserted for shape. The verbatim prose from EXPERIENCE.md
 * line 43 is pinned character-for-character (curly apostrophe,
 * spaced em-dash, sentence case).
 *
 * The "Try the example" button is `disabled` (and explicit
 * `aria-disabled="true"`) in S03.5 — S03.8 wires the example-CSV
 * handler. The "Browse files" anchor is `<a href="#dropzone">`
 * — S03.5 also adds `id="dropzone"` to the Dropzone's `<button>`.
 */
describe('dropzone-empty-state (S03.5 empty-state copy from EXPERIENCE.md: headline, lede, two CTAs, three teaching cards)', () => {
  const app = readFileSync(appPath, 'utf8');
  const dropzone = readFileSync(dropzonePath, 'utf8');
  const appCss = readFileSync(appCssPath, 'utf8');
  const dropzoneTest = readFileSync(dropzoneTestPath, 'utf8');
  const dropzoneDragPasteTest = readFileSync(dropzoneDragPasteTestPath, 'utf8');
  const dropzoneFileCapTest = readFileSync(dropzoneFileCapTestPath, 'utf8');
  const dropzoneAriaLiveTest = readFileSync(dropzoneAriaLiveTestPath, 'utf8');

  // Strip block + line + HTML comments so documenting comments don't
  // false-positive on forbidden-pattern scans. Mirrors S03.1 / S03.2 /
  // S03.3 / S03.4 — the convention is uniform across all E03 test files.
  const stripComments = (s: string): string =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/<!--[\s\S]*?-->/g, '');

  const appSource = stripComments(app);
  const dropzoneSource = stripComments(dropzone);
  const appCssSource = stripComments(appCss);

  describe('AC21a: empty-state headline (<h2>) is rendered inside <main>', () => {
    it('App.svelte contains the locked JTBD sentence as an <h2>', () => {
      expect(appSource).toMatch(
        /<h2[^>]*>\s*Drop a CSV to find out what's wrong with it\.\s*<\/h2>/,
      );
    });
    it('the <h2> is inside <main> (NOT inside <header>)', () => {
      const mainIdx = appSource.indexOf('<main');
      const mainCloseIdx = appSource.indexOf('</main>');
      const headerIdx = appSource.indexOf('<header');
      const headerCloseIdx = appSource.indexOf('</header>');
      const h2Match = appSource.match(/<h2[^>]*>[^<]*<\/h2>/);
      expect(h2Match).not.toBeNull();
      const h2Idx = h2Match![0].length > 0 ? appSource.indexOf(h2Match![0]) : -1;
      expect(h2Idx).toBeGreaterThan(mainIdx);
      expect(h2Idx).toBeLessThan(mainCloseIdx);
      // Either the h2 is before the <header> (so it's outside header)
      // or, more commonly, the entire <header> is before <main>, then
      // the h2 lives inside <main>. Pin: the h2 is NOT inside <header>.
      if (headerIdx > -1 && headerCloseIdx > -1) {
        const inHeader = h2Idx > headerIdx && h2Idx < headerCloseIdx;
        expect(inHeader).toBe(false);
      }
    });
  });

  describe('AC21b: lede (<p>) carries the verbatim prose from EXPERIENCE.md line 43', () => {
    it('App.svelte contains the locked lede with curly apostrophe + spaced em-dash', () => {
      // Exact verbatim string from EXPERIENCE.md §Voice and Tone line 43:
      // "Files up to 50 MB, UTF-8, with or without a BOM. We don't upload — this happens in your browser."
      // The apostrophe is U+2019 (curly), the em-dash is U+2014 with surrounding spaces.
      expect(appSource).toMatch(
        /Files up to 50 MB, UTF-8, with or without a BOM\. We don\u2019t upload \u2014 this happens in your browser\./,
      );
    });
    it('the lede has the empty-state-lede class for the muted prose treatment', () => {
      expect(appSource).toMatch(/<p[^>]*class\s*=\s*["']empty-state-lede["']/);
    });
  });

  describe('AC21c: "Try the example" button is disabled + aria-disabled="true"', () => {
    it('App.svelte contains a <button> with text "Try the example"', () => {
      expect(appSource).toMatch(
        /<button[^>]*type\s*=\s*["']button["'][^>]*>\s*Try the example\s*<\/button>/,
      );
    });
    it('the Try the example button has the disabled attribute (S03.8 will wire the handler)', () => {
      // The button is `disabled` in S03.5; S03.8 removes `disabled`
      // and binds the example-CSV click handler. The pin verifies
      // the S03.5 contract.
      const match = appSource.match(
        /<button[^>]*type\s*=\s*["']button["'][^>]*>\s*Try the example\s*<\/button>/,
      );
      expect(match).not.toBeNull();
      expect(match![0]).toMatch(/\bdisabled\b/);
    });
    it('the Try the example button has explicit aria-disabled="true" (belt-and-braces)', () => {
      // WAI-ARIA says `aria-disabled="true"` on a `<button disabled>`
      // is redundant (the `disabled` attribute already implies it),
      // but S03.5 keeps both for cross-browser consistency.
      const match = appSource.match(
        /<button[^>]*type\s*=\s*["']button["'][^>]*>\s*Try the example\s*<\/button>/,
      );
      expect(match).not.toBeNull();
      expect(match![0]).toMatch(/aria-disabled\s*=\s*["']true["']/);
    });
  });

  describe('AC21d: "Browse files" anchor is <a href="#dropzone">', () => {
    it('App.svelte contains an <a href="#dropzone"> with text "Browse files"', () => {
      expect(appSource).toMatch(
        /<a[^>]*href\s*=\s*["']#dropzone["'][^>]*>\s*Browse files\s*<\/a>/,
      );
    });
    it('the anchor is the secondary CTA (renders AFTER the Try the example button)', () => {
      // The visual order: button (primary) · separator · anchor (secondary).
      const buttonIdx = appSource.search(
        /<button[^>]*type\s*=\s*["']button["'][^>]*>\s*Try the example\s*<\/button>/,
      );
      const anchorIdx = appSource.search(/<a[^>]*href\s*=\s*["']#dropzone["'][^>]*>\s*Browse files\s*<\/a>/);
      expect(buttonIdx).toBeGreaterThan(-1);
      expect(anchorIdx).toBeGreaterThan(buttonIdx);
    });
  });

  describe('AC21e: separator is an aria-hidden <span> with middle-dot', () => {
    it('App.svelte contains a <span aria-hidden="true"> with the middle-dot character', () => {
      // The middle-dot is U+00B7 (·). The span is aria-hidden so
      // screen readers skip it (it's a visual separator, not
      // semantic content).
      expect(appSource).toMatch(
        /<span[^>]*aria-hidden\s*=\s*["']true["'][^>]*>\s*\u00B7\s*<\/span>/,
      );
    });
  });

  describe('AC21f: dropzone button has id="dropzone" (the scroll target for the Browse files anchor)', () => {
    it('Dropzone.svelte renders the dropzone button with id="dropzone"', () => {
      expect(dropzoneSource).toMatch(
        /<button[^>]*id\s*=\s*["']dropzone["'][^>]*class\s*=\s*["']dropzone["']/,
      );
    });
    it('the id="dropzone" is on the <button> (NOT on the hidden <input>)', () => {
      // The hidden <input type="file"> has id="file-input" (S03.1);
      // S03.5 adds id="dropzone" to the <button>. Two distinct
      // elements, two distinct ids. No collision.
      const buttonTag = dropzoneSource.match(/<button[^>]*id\s*=\s*["']dropzone["']/);
      expect(buttonTag).not.toBeNull();
      // The pin is that the button has id="dropzone" (the input
      // does NOT have id="dropzone" — that's a separate element).
      const inputTag = dropzoneSource.match(/<input[^>]*id\s*=\s*["']file-input["']/);
      expect(inputTag).not.toBeNull();
    });
  });

  describe('AC21g: three teaching cards are rendered as <section class="empty-state-card"> with <h3> headings', () => {
    it('App.svelte contains three <section class="empty-state-card"> elements', () => {
      const matches = appSource.match(/<section[^>]*class\s*=\s*["']empty-state-card["']/g);
      expect(matches?.length ?? 0).toBe(3);
    });
    it('each card has an <h3> heading with the locked editorial wording', () => {
      expect(appSource).toMatch(/<h3>\s*What we detect\s*<\/h3>/);
      expect(appSource).toMatch(/<h3>\s*What we show you\s*<\/h3>/);
      expect(appSource).toMatch(/<h3>\s*What you can do\s*<\/h3>/);
    });
    it('the three cards are wrapped in a <div class="empty-state-cards"> grid container', () => {
      // The grid container holds the three cards; the rule in
      // app.css applies the 3-column layout. The container is
      // scoped to the cards (not the headline/lede/CTAs).
      expect(appSource).toMatch(/<div[^>]*class\s*=\s*["']empty-state-cards["']/);
    });
  });

  describe('AC21h: "What we detect" card contains the 8 FR-2 categories, each wrapped in <code>', () => {
    const detectCategories = [
      'duplicates',
      'missing values',
      'invalid emails',
      'invalid dates',
      'inconsistent categorical',
      'outliers',
      'suspicious columns',
      'PII',
    ];
    for (const cat of detectCategories) {
      it(`App.svelte contains <code>${cat}</code> in the What we detect card`, () => {
        // Editorial voice: mono for data — each category name is
        // wrapped in <code>. The categories are the locked FR-2
        // names from PRD + EXPERIENCE.md line 29.
        expect(appSource).toMatch(
          new RegExp(`<code>\\s*${cat.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*</code>`),
        );
      });
    }
  });

  describe('AC21i: "What we show you" card contains the 4 FR-3 categories, each wrapped in <code>', () => {
    const showCategories = ['completeness', 'validity', 'uniqueness', 'consistency'];
    for (const cat of showCategories) {
      it(`App.svelte contains <code>${cat}</code> in the What we show you card`, () => {
        expect(appSource).toMatch(
          new RegExp(`<code>\\s*${cat.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*</code>`),
        );
      });
    }
  });

  describe('AC21j: "What you can do" card contains the 5 FR-5 cleaning actions, each wrapped in <code>', () => {
    const doCategories = [
      'dedupe',
      'fill missing',
      'validate',
      'normalize categorical',
      'redact PII',
    ];
    for (const cat of doCategories) {
      it(`App.svelte contains <code>${cat}</code> in the What you can do card`, () => {
        expect(appSource).toMatch(
          new RegExp(`<code>\\s*${cat.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*</code>`),
        );
      });
    }
  });

  describe('AC21k: zero hex literals + zero new forbidden source patterns', () => {
    it('App.svelte contains no hex color literal (AD-8)', () => {
      expect(appSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
    it('app.css contains no hex color literal (AD-8 — tokens.css is the only source of hex values)', () => {
      expect(appCssSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
    it('Dropzone.svelte contains no hex color literal (AD-8 — preserved against S03.1)', () => {
      expect(dropzoneSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
    const forbiddenPatterns: Array<[string, RegExp]> = [
      ['fetch', /\bfetch\s*\(/],
      ['XMLHttpRequest', /\bXMLHttpRequest\b/],
      ['EventSource', /\bEventSource\b/],
      ['WebSocket', /\bWebSocket\b/],
      ['new EventSource(', /\bnew\s+EventSource\s*\(/],
      ['sendBeacon', /\bsendBeacon\b/],
      ['navigator.sendBeacon', /\bnavigator\s*\.\s*sendBeacon\b/],
      ['new Function', /\bnew\s+Function\b/],
      ['eval', /\beval\b/],
      ['dynamic import()', /[^.\w]import\s*\(/],
      ['FileReader', /\bFileReader\b/],
      ['readAsText', /\breadAsText\b/],
      ['readAsArrayBuffer', /\breadAsArrayBuffer\b/],
    ];
    for (const [label, regex] of forbiddenPatterns) {
      it(`App.svelte source does NOT contain ${label}`, () => {
        expect(appSource).not.toMatch(regex);
      });
      it(`app.css source does NOT contain ${label}`, () => {
        expect(appCssSource).not.toMatch(regex);
      });
    }
  });

  describe('AC21l: prior-story boundary pins preserved (S03.1 + S03.2 + S03.3 + S03.4)', () => {
    it('tests/dropzone.test.ts (S03.1) still exists with its description string', () => {
      expect(dropzoneTest).toMatch(/dropzone \(S03\.1/);
    });
    it('tests/dropzone-drag-paste.test.ts (S03.2) still exists with its description string', () => {
      expect(dropzoneDragPasteTest).toMatch(
        /dropzone-drag-paste \(S03\.2 drag-and-drop \+ paste handlers, onaccept unbound\)/,
      );
    });
    it('tests/dropzone-file-cap.test.ts (S03.3) still exists with its description string', () => {
      expect(dropzoneFileCapTest).toMatch(/dropzone-file-cap \(S03\.3/);
    });
    it('tests/dropzone-aria-live.test.ts (S03.4) still exists with its description string', () => {
      expect(dropzoneAriaLiveTest).toMatch(/dropzone-aria-live \(S03\.4/);
    });
  });
});

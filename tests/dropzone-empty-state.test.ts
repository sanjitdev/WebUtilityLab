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
    it('the lede is a SINGLE <p> element (not split into two paragraphs)', () => {
      // Per review #1 verification-gap #2: a regression that splits
      // the lede into two paragraphs (one for file-format guardrails,
      // one for the privacy signal) would pass the verbatim-string
      // match above but break the editorial-voice contract. The
      // EXPERIENCE.md line 43 prose is one sentence-pair; the
      // single-<p> shape is the S03.5 contract.
      const ledeMatches = appSource.match(/<p[^>]*class\s*=\s*["']empty-state-lede["']/g);
      expect(ledeMatches?.length ?? 0).toBe(1);
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
      // but S03.5 keeps both for cross-browser consistency. Rationale
      // documented in App.svelte's template-comment docblock.
      const match = appSource.match(
        /<button[^>]*type\s*=\s*["']button["'][^>]*>\s*Try the example\s*<\/button>/,
      );
      expect(match).not.toBeNull();
      expect(match![0]).toMatch(/aria-disabled\s*=\s*["']true["']/);
    });
    it('the Try the example button has NO event handler binding (S03.8 wires it)', () => {
      // Per review #1 verification-gap #3: the button is
      // `disabled` in S03.5; it must NOT carry a click handler
      // binding (no `onclick`, no `on:click`, no
      // `on:click={noop}`, no inline `addEventListener`). The
      // contract is "the affordance exists; S03.8 wires the
      // handler" — a regression that adds a no-op handler while
      // keeping `disabled` would pass the disabled pin but break
      // the S03.5/S03.8 contract.
      const match = appSource.match(
        /<button[^>]*type\s*=\s*["']button["'][^>]*>\s*Try the example\s*<\/button>/,
      );
      expect(match).not.toBeNull();
      const buttonTag = match![0];
      // Svelte 5 + Svelte 4 + native event-attribute surface.
      expect(buttonTag).not.toMatch(/\bonclick\s*=/);
      expect(buttonTag).not.toMatch(/\bon:click\s*=/);
      expect(buttonTag).not.toMatch(/\bon:click\b/);
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
    it('id="dropzone" appears EXACTLY ONCE in Dropzone.svelte (no element collision)', () => {
      // Per review #1 blind-hunter M2: the original pin would still
      // pass if a second element (e.g., the hidden <input>) ALSO
      // gained id="dropzone" — `id` attributes must be unique in
      // the DOM. Pin the count is exactly 1 to catch a duplicate-id
      // regression.
      const matches = dropzoneSource.match(/\bid\s*=\s*["']dropzone["']/g);
      expect(matches?.length ?? 0).toBe(1);
    });
    it('the dropzone button has scroll-margin-top (anchor-scroll offset, defense-in-depth)', () => {
      // Per review #1 edge-case #1: the "Browse files" anchor
      // smooth-scrolls to the dropzone button. Without a scroll
      // offset, the button can land flush against the top edge
      // and the header chrome can occlude it. The global
      // `scroll-padding-top` in app.css is the primary offset;
      // `scroll-margin-top` on the button itself is the second
      // line of defense (Chrome, Firefox, Safari all honor it).
      const buttonTag = dropzoneSource.match(/<button[^>]*id\s*=\s*["']dropzone["']/);
      expect(buttonTag).not.toBeNull();
      // The button is rendered inside Dropzone.svelte's component-
      // scoped <style> block; the style rule references the
      // `.dropzone` class selector. The contract is: the rule
      // `.dropzone { …; scroll-margin-top: var(--space-section); }`
      // exists at least once in the component-scoped CSS.
      expect(dropzoneSource).toMatch(/scroll-margin-top\s*:\s*var\(--space-section\)/);
    });
  });

  describe('AC21g: three teaching cards are rendered as <section class="empty-state-card"> with <h3> headings', () => {
    it('App.svelte contains three <section class="empty-state-card"> elements', () => {
      const matches = appSource.match(/<section[^>]*class\s*=\s*["']empty-state-card["']/g);
      expect(matches?.length ?? 0).toBe(3);
    });
    it('each card has an <h3> heading with the locked editorial wording', () => {
      // The <h3> elements now carry `id="card-…-heading"` so
      // `aria-labelledby` can reference them (review #1
      // blind-hunter #2: <section> a11y). The regex tolerates
      // attributes between `<h3` and `>`.
      expect(appSource).toMatch(/<h3[^>]*>\s*What we detect\s*<\/h3>/);
      expect(appSource).toMatch(/<h3[^>]*>\s*What we show you\s*<\/h3>/);
      expect(appSource).toMatch(/<h3[^>]*>\s*What you can do\s*<\/h3>/);
    });
    it('the three cards are wrapped in a <div class="empty-state-cards"> grid container', () => {
      // The grid container holds the three cards; the rule in
      // app.css applies the 3-column layout. The container is
      // scoped to the cards (not the headline/lede/CTAs).
      expect(appSource).toMatch(/<div[^>]*class\s*=\s*["']empty-state-cards["']/);
    });
    it('the three cards appear in the locked order: "What we detect" → "What we show you" → "What you can do"', () => {
      // Per review #1 verification-gap #1: the test pins each
      // heading text exists, but a regression that swaps the
      // order (e.g., "What we detect" / "What you can do" / "What
      // we show you") would still pass all three independent
      // heading pins. The Experience.md §Information Architecture
      // line 24 lists the cards in a specific order; pin that
      // order with index-position assertions. Tolerates <h3 id="…">
      // attributes between `<h3` and `>`.
      const detectIdx = appSource.search(/<h3[^>]*>\s*What we detect\s*<\/h3>/);
      const showIdx = appSource.search(/<h3[^>]*>\s*What we show you\s*<\/h3>/);
      const doIdx = appSource.search(/<h3[^>]*>\s*What you can do\s*<\/h3>/);
      expect(detectIdx).toBeGreaterThan(-1);
      expect(showIdx).toBeGreaterThan(-1);
      expect(doIdx).toBeGreaterThan(-1);
      expect(detectIdx).toBeLessThan(showIdx);
      expect(showIdx).toBeLessThan(doIdx);
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

  describe('AC21m: responsive collapse + reduced-motion + scroll offset + token discipline', () => {
    it('app.css defines the 3-column grid for .empty-state-cards', () => {
      // Per review #1 should-fix: pin the 3-column grid template
      // exists in app.css (the rule that arranges the three cards
      // side-by-side on wide viewports).
      expect(appCssSource).toMatch(/\.empty-state-cards\s*\{[^}]*grid-template-columns\s*:\s*repeat\(3,\s*1fr\)/);
    });
    it('app.css defines the responsive collapse strictly below 720px', () => {
      // Per review #1 edge-case #2: the spec says "below ~720px".
      // The S03.5 contract: collapse fires strictly below 720px
      // (so 720px itself is still 3 columns — the off-by-one
      // boundary is explicit). The breakpoint uses `max-width:
      // 719px` (NOT 720px) so the rule does NOT fire at 720.
      expect(appCssSource).toMatch(/@media\s*\(\s*max-width\s*:\s*719px\s*\)/);
      // Negative pin: the rule must NOT use 720 (which would
      // include the 720 boundary as the collapse trigger).
      expect(appCssSource).not.toMatch(/@media\s*\(\s*max-width\s*:\s*720px\s*\)/);
    });
    it('app.css defines the smooth-scroll on html with reduced-motion override', () => {
      // Per review #1 should-fix: pin the smooth-scroll contract
      // is explicit (not implicit) and the reduced-motion override
      // exists. The "Browse files" anchor relies on
      // `scroll-behavior: smooth`; users with reduced-motion
      // preference see instant jumps.
      expect(appCssSource).toMatch(/html\s*\{[^}]*scroll-behavior\s*:\s*smooth/);
      expect(appCssSource).toMatch(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/);
      expect(appCssSource).toMatch(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)[^{]*\{[^}]*scroll-behavior\s*:\s*auto/);
    });
    it('app.css defines scroll-padding-top on html (anchor-scroll offset)', () => {
      // Per review #1 edge-case #1: the smooth-scroll anchor
      // targets the dropzone button; without scroll-padding-top,
      // the dropzone can land flush against the top edge and the
      // header can occlude it. The padding is the primary offset;
      // scroll-margin-top on the button itself is the secondary
      // (covered by the AC21f pin above).
      //
      // The regex anchors on `\bhtml\s*\{` (bare element selector,
      // not `*html` or `.xhtml` derivatives) so a future regression
      // that attaches scroll-padding-top to a different element
      // fails the pin.
      expect(appCssSource).toMatch(/\bhtml\s*\{[^}]*scroll-padding-top\s*:/);
    });
    it('.empty-state-card uses var(--paper) + var(--rule) + var(--space-base) (token discipline)', () => {
      // Per review #1 should-fix: pin the card surface uses tokens
      // for background / border / padding. AD-8 says all values
      // must come from tokens.css; the card surface is the most
      // prominent S03.5 visual addition.
      const cardRule = appCssSource.match(/\.empty-state-card\s*\{[^}]*\}/);
      expect(cardRule).not.toBeNull();
      expect(cardRule![0]).toMatch(/background\s*:\s*var\(--paper\)/);
      expect(cardRule![0]).toMatch(/border\s*:\s*1px\s+solid\s+var\(--rule\)/);
      expect(cardRule![0]).toMatch(/padding\s*:\s*var\(--space-base\)/);
    });
  });

  /**
   * S03.6 — Body prose for the three teaching cards (FR-7 vocabulary
   * primer).
   *
   * S03.5 shipped the visible card surface (heading + <ul> of
   * category names) but deferred the body prose that anchors the
   * category list to the results page. S03.6 lands that body prose.
   * Each card now reads "heading → body → list" — the editorial
   * hierarchy. The three body-prose sentences are verbatim from the
   * S03.6 spec (locked from FR-2 / FR-3 / FR-5 consequences):
   *
   *   - "What we detect": "Each anomaly is reported with its row,
   *     column, the value, the rule that was broken, and a one-
   *     sentence explanation." (the FR-2 anomaly derivation)
   *   - "What we show you": "A 0–100 score with a red, amber, or
   *     green band and a per-category breakdown across the four
   *     values." (the FR-3 score format)
   *   - "What you can do": "All toggles default off; the original
   *     and the proposed cleaned version are shown side by side
   *     before you confirm." (the FR-5 cleaning toggle default +
   *     reversibility view)
   *
   * The body prose sits in a <p class="empty-state-card-lede">
   * element between the <h3> heading and the <ul> of category
   * names. The class name `.empty-state-card-lede` is consistent
   * across all three cards. The prose is plain text (NOT inside
   * <code>) — mono for data is reserved for the 17 category
   * names. The prose is NOT inside <details> / <summary> — the
   * interactive disclosure pattern is for E10 problem cards, not
   * S03.6 teaching cards.
   *
   * 8 AC22a-AC22h describe blocks. The prior-story boundary pins
   * (AC21a-AC21m from S03.5) are preserved unchanged.
   */
  describe('AC22a: body prose for "What we detect" card (FR-2 anomaly derivation)', () => {
    it('App.svelte contains the locked verbatim body-prose sentence', () => {
      // Verbatim from S03.6 spec AC1: "Each anomaly is reported
      // with its row, column, the value, the rule that was broken,
      // and a one-sentence explanation." No curly apostrophes
      // (the sentence is ASCII-clean); no terminal period (the
      // editorial voice allows terminal periods but the S03.6
      // spec's locked copy uses one — pin character-for-character).
      expect(appSource).toMatch(
        /Each anomaly is reported with its row, column, the value, the rule that was broken, and a one-sentence explanation\./,
      );
    });
    it('the body prose is a single <p class="empty-state-card-lede"> element (multi-class regex form)', () => {
      // Mirror the AC21b single-<p> pin: a regression that splits
      // the body into multiple paragraphs (or nests <p> elements)
      // fails the structural pin. The body is one declarative
      // sentence, one <p>. The regex uses `\bempty-state-card-lede\b`
      // word-boundary form so a multi-class attribute like
      // `class="empty-state-card-lede variant-x"` still matches.
      const ledeMatches = appSource.match(/<p[^>]*class\s*=\s*["'][^"']*\bempty-state-card-lede\b[^"']*["']/g);
      expect(ledeMatches?.length ?? 0).toBeGreaterThanOrEqual(1);
      expect(appSource).toMatch(/<p[^>]*class\s*=\s*["'][^"']*\bempty-state-card-lede\b[^"']*["'][^>]*>\s*Each anomaly is reported with its row, column, the value, the rule that was broken, and a one-sentence explanation\.\s*<\/p>/);
    });
    it('the body prose lives INSIDE the "What we detect" <section> (cross-card context pin)', () => {
      // Per review #1 verification-gap #5: each FR-2 / FR-3 /
      // FR-5 prose must live in its expected card section. A
      // regression that swaps the body sentences across cards
      // (e.g., "All toggles default off…" under "What we
      // detect") passes the verbatim-prose pins but breaks the
      // FR-7 teaching surface contract. Scope to the card's
      // <section> and assert the body is inside it.
      const detectSection = appSource.match(/<section[^>]*class\s*=\s*["']empty-state-card["'][\s\S]*?<h3[^>]*>\s*What we detect\s*<\/h3>[\s\S]*?<\/section>/);
      expect(detectSection).not.toBeNull();
      expect(detectSection![0]).toMatch(/Each anomaly is reported with its row/);
    });
    it('the "What we detect" body prose renders BEFORE the <ul> of FR-2 category names (intra-card scoped)', () => {
      // AC22f + review #1: scope the position check to the current
      // card section. A regression that places the body outside the
      // card would fail this pin. Also anchor on the FR-2 category
      // <code>duplicates</code> so a nested-<ul> regression doesn't
      // false-positive.
      const detectCardStart = appSource.search(/<h3[^>]*>\s*What we detect\s*<\/h3>/);
      const cardStart = appSource.lastIndexOf('<section', detectCardStart);
      const cardEnd = appSource.indexOf('</section>', detectCardStart);
      const detectListStart = appSource.indexOf('<li><code>duplicates</code></li>', detectCardStart);
      const detectBodyIdx = appSource.indexOf('Each anomaly is reported with its row', detectCardStart);
      expect(detectCardStart).toBeGreaterThan(-1);
      expect(cardStart).toBeGreaterThan(-1);
      expect(cardEnd).toBeGreaterThan(detectCardStart);
      expect(detectListStart).toBeGreaterThan(-1);
      expect(detectBodyIdx).toBeGreaterThan(detectListStart === -1 ? detectCardStart : 0);
      // Body must be INSIDE the section AND before the first FR-2 <li>.
      expect(detectBodyIdx).toBeLessThan(cardEnd);
      expect(detectBodyIdx).toBeLessThan(detectListStart);
    });
  });

  describe('AC22b: body prose for "What we show you" card (FR-3 score format)', () => {
    it('App.svelte contains the locked verbatim body-prose sentence', () => {
      // Verbatim from S03.6 spec AC2: "A 0–100 score with a red,
      // amber, or green band and a per-category breakdown across
      // the four values." The en-dash in 0–100 is U+2013 (not
      // U+2014); the test pins the exact character. The sentence
      // uses no curly apostrophes.
      expect(appSource).toMatch(
        /A 0\u2013100 score with a red, amber, or green band and a per-category breakdown across the four values\./,
      );
    });
    it('the body prose is a single <p class="empty-state-card-lede"> element (multi-class regex form)', () => {
      const showBodyIdx = appSource.indexOf('A 0\u2013100 score with a red, amber, or green band and a per-category breakdown across the four values.');
      expect(showBodyIdx).toBeGreaterThan(-1);
      // The body prose must be inside a <p class="empty-state-card-lede"> element.
      // Find the nearest opening <p> tag before the body and verify the class.
      // Multi-class attribute form (per review #1 edge-case #1):
      // the regex uses `\bempty-state-card-lede\b` so multi-class
      // values like `class="empty-state-card-lede variant-x"` still match.
      const beforeBody = appSource.substring(0, showBodyIdx);
      const pOpenIdx = beforeBody.lastIndexOf('<p ');
      expect(pOpenIdx).toBeGreaterThan(-1);
      const pOpenTag = appSource.substring(pOpenIdx, appSource.indexOf('>', pOpenIdx) + 1);
      expect(pOpenTag).toMatch(/class\s*=\s*["'][^"']*\bempty-state-card-lede\b[^"']*["']/);
    });
    it('the body prose lives INSIDE the "What we show you" <section> (cross-card context pin)', () => {
      // Mirror AC22a: scope the prose to its expected card section.
      // A regression that swaps body sentences across cards fails this pin.
      const showSection = appSource.match(/<section[^>]*class\s*=\s*["']empty-state-card["'][\s\S]*?<h3[^>]*>\s*What we show you\s*<\/h3>[\s\S]*?<\/section>/);
      expect(showSection).not.toBeNull();
      expect(showSection![0]).toMatch(/A 0\u2013100 score with a red, amber, or green band/);
    });
    it('the "What we show you" body prose renders BEFORE the <ul> of FR-3 category names (intra-card scoped)', () => {
      // Mirror the AC22a intra-card pin: scope to the current
      // <section> boundary AND anchor on the FR-3 category
      // <code>completeness</code> so nested-<ul> regressions
      // don't false-positive.
      const showCardStart = appSource.search(/<h3[^>]*>\s*What we show you\s*<\/h3>/);
      const cardStart = appSource.lastIndexOf('<section', showCardStart);
      const cardEnd = appSource.indexOf('</section>', showCardStart);
      const showListStart = appSource.indexOf('<li><code>completeness</code></li>', showCardStart);
      const showBodyIdx = appSource.indexOf('A 0\u2013100 score with a red, amber, or green band', showCardStart);
      expect(showCardStart).toBeGreaterThan(-1);
      expect(cardStart).toBeGreaterThan(-1);
      expect(cardEnd).toBeGreaterThan(showCardStart);
      expect(showListStart).toBeGreaterThan(-1);
      expect(showBodyIdx).toBeGreaterThan(showCardStart);
      expect(showBodyIdx).toBeLessThan(cardEnd);
      expect(showBodyIdx).toBeLessThan(showListStart);
    });
  });

  describe('AC22c: body prose for "What you can do" card (FR-5 reversibility view)', () => {
    it('App.svelte contains the locked verbatim body-prose sentence', () => {
      // Verbatim from S03.6 spec AC3: "All toggles default off;
      // the original and the proposed cleaned version are shown
      // side by side before you confirm." Curly apostrophe NOT
      // required (no "you're" / "don't" / etc. in this sentence);
      // the curly apostrophe pin is for the second sentence of
      // the FR-5 reversibility view prose. The em-dash is NOT
      // used here — "side by side" is rendered with spaces, no
      // hyphen, no em-dash.
      expect(appSource).toMatch(
        /All toggles default off; the original and the proposed cleaned version are shown side by side before you confirm\./,
      );
    });
    it('the body prose is a single <p class="empty-state-card-lede"> element (multi-class regex form)', () => {
      const doBodyIdx = appSource.indexOf('All toggles default off; the original and the proposed cleaned version are shown side by side before you confirm.');
      expect(doBodyIdx).toBeGreaterThan(-1);
      // Multi-class attribute form (per review #1 edge-case #1):
      // the regex uses `\bempty-state-card-lede\b` so multi-class
      // values like `class="empty-state-card-lede variant-x"` still match.
      const beforeBody = appSource.substring(0, doBodyIdx);
      const pOpenIdx = beforeBody.lastIndexOf('<p ');
      expect(pOpenIdx).toBeGreaterThan(-1);
      const pOpenTag = appSource.substring(pOpenIdx, appSource.indexOf('>', pOpenIdx) + 1);
      expect(pOpenTag).toMatch(/class\s*=\s*["'][^"']*\bempty-state-card-lede\b[^"']*["']/);
    });
    it('the body prose lives INSIDE the "What you can do" <section> (cross-card context pin)', () => {
      // Mirror AC22a/b: scope the prose to its expected card section.
      // A regression that swaps body sentences across cards fails this pin.
      const doSection = appSource.match(/<section[^>]*class\s*=\s*["']empty-state-card["'][\s\S]*?<h3[^>]*>\s*What you can do\s*<\/h3>[\s\S]*?<\/section>/);
      expect(doSection).not.toBeNull();
      expect(doSection![0]).toMatch(/All toggles default off/);
    });
    it('the "What you can do" body prose renders BEFORE the <ul> of FR-5 cleaning actions (intra-card scoped)', () => {
      // Mirror the AC22a/b intra-card pin: scope to the current
      // <section> boundary AND anchor on the FR-5 category
      // <code>dedupe</code> so nested-<ul> regressions don't
      // false-positive.
      const doCardStart = appSource.search(/<h3[^>]*>\s*What you can do\s*<\/h3>/);
      const cardStart = appSource.lastIndexOf('<section', doCardStart);
      const cardEnd = appSource.indexOf('</section>', doCardStart);
      const doListStart = appSource.indexOf('<li><code>dedupe</code></li>', doCardStart);
      const doBodyIdx = appSource.indexOf('All toggles default off', doCardStart);
      expect(doCardStart).toBeGreaterThan(-1);
      expect(cardStart).toBeGreaterThan(-1);
      expect(cardEnd).toBeGreaterThan(doCardStart);
      expect(doListStart).toBeGreaterThan(-1);
      expect(doBodyIdx).toBeGreaterThan(doCardStart);
      expect(doBodyIdx).toBeLessThan(cardEnd);
      expect(doBodyIdx).toBeLessThan(doListStart);
    });
  });

  describe('AC22d: structural consistency — exactly three <p class="empty-state-card-lede"> elements (one per card)', () => {
    // Per review #1 edge-case #1 (multi-class attribute fragility)
    // + verification-gap #1 (per-section count resilience): the
    // original regex required the EXACT attribute
    // `class="empty-state-card-lede"` (no sibling classes). The
    // `\b` word-boundary form allows a multi-class value like
    // `class="empty-state-card-lede variant-x"`. Each locked card
    // heading must have exactly one body-prose sibling; a 4th
    // paragraph anywhere or a regression that consolidates prose
    // into one section fails the per-section pin.
    const cardLedeClassRegex = /<p[^>]*class\s*=\s*["'][^"']*\bempty-state-card-lede\b[^"']*["']/g;
    it('App.svelte contains exactly three <p class="…empty-state-card-lede…"> elements', () => {
      const matches = appSource.match(cardLedeClassRegex);
      expect(matches?.length ?? 0).toBe(3);
    });
    it('each card section contains EXACTLY ONE body-prose <p> (per-section count)', () => {
      // Iterate over the three card sections and assert each
      // has exactly one body-prose <p>. A regression that adds
      // a 4th body-prose paragraph inside an existing section
      // (e.g., a "Privacy" sub-lede added to "What you can do")
      // fails the per-section count even if the global count
      // happens to stay at 3.
      const cardSections = appSource.match(/<section[^>]*class\s*=\s*["']empty-state-card["'][\s\S]*?<\/section>/g) ?? [];
      expect(cardSections.length).toBe(3);
      for (const sec of cardSections) {
        const ps = sec.match(cardLedeClassRegex);
        expect(ps?.length ?? 0).toBe(1);
      }
    });
    it('each body-prose <p> is a single child (not nested)', () => {
      // The body prose is one declarative sentence per card;
      // the <p> element has no nested elements (no <code>,
      // no <span>, no <strong>). Plain text only.
      const matches = appSource.match(/<p[^>]*class\s*=\s*["'][^"']*\bempty-state-card-lede\b[^"']*["'][^>]*>[\s\S]*?<\/p>/g) ?? [];
      expect(matches.length).toBe(3);
      for (const match of matches) {
        // Strip the opening <p ...> tag and closing </p>; the
        // remaining content must be plain text (no nested tags).
        const inner = match.replace(/<p[^>]*>/, '').replace(/<\/p>$/, '').trim();
        expect(inner).not.toMatch(/<[a-zA-Z]/);
      }
    });
  });

  describe('AC22e: body prose is NOT inside <code> (mono for data, not for prose)', () => {
    const bodySentences = [
      'Each anomaly is reported with its row',
      'A 0\u2013100 score with a red, amber, or green band',
      'All toggles default off',
    ];
    for (const sentence of bodySentences) {
      it(`the body prose "${sentence.substring(0, 20)}..." is plain text (NOT inside <code>)`, () => {
        // Per review #1 verification-gap #2: the original pin
        // scoped the walk-back via `lastPOpen > lastCodeOpen`
        // ONLY when `lastPOpen > -1`. If a regression wraps the
        // body in `<code>…</code>` with no `<p>` wrapper,
        // `lastPOpen` is `-1`, the inner assertions are SKIPPED,
        // and the test passes wrongly. The fix: assert both
        // directions unconditionally — NO `<code>` may open
        // before the sentence, AND a `<p>` MUST open before it.
        // Scope the walk-back to the current card section
        // (review #1 edge-case #6) so unrelated `<code>` tags in
        // the <output> block don't trigger a false positive on
        // body prose that crosses a card boundary.
        const headingIdx = (() => {
          if (sentence.startsWith('Each anomaly')) return appSource.search(/<h3[^>]*>\s*What we detect\s*<\/h3>/);
          if (sentence.startsWith('A 0\u2013100')) return appSource.search(/<h3[^>]*>\s*What we show you\s*<\/h3>/);
          return appSource.search(/<h3[^>]*>\s*What you can do\s*<\/h3>/);
        })();
        const cardStart = appSource.lastIndexOf('<section', headingIdx);
        const idx = appSource.indexOf(sentence, headingIdx);
        expect(idx).toBeGreaterThan(-1);
        const beforeSentence = appSource.substring(cardStart, idx);
        // Direct assertion: NO `<code>` may open in the card
        // section before the body sentence. The body is prose;
        // mono is for data (the 17 category names). A regression
        // wrapping the body in `<code>` would put `<code>` BEFORE
        // the body in the section.
        expect(beforeSentence.lastIndexOf('<code>')).toBe(-1);
        expect(beforeSentence.lastIndexOf('<code ')).toBe(-1);
        // Direct assertion: a `<p>` MUST open before the body in
        // the card section. The body sits inside `<p
        // class="empty-state-card-lede">`.
        expect(beforeSentence.lastIndexOf('<p ')).toBeGreaterThan(-1);
      });
    }
  });

  describe('AC22f: body-prose position ordering — heading → body → list (intra-card scoped)', () => {
    // Per review #1 edge-case #2: the original pin computed the
    // intra-card position by `indexOf('<ul>', h3Idx)`, which finds
    // the FIRST <ul> at-or-after the heading. For the 2nd and 3rd
    // cards, the body's `indexOf` was unscoped (no fromIndex) and
    // could match an EARLIER occurrence. A regression that places
    // body prose AFTER the first card's <ul> but before the 2nd
    // card's heading would pass the original pin. Scope every
    // search to within the current <section class="empty-state-card">
    // boundary AND anchor the <ul> on the specific category <code>
    // token (the FIRST <ul> after a card's <h3> could be a nested
    // <ul> in some future regression — pinning on the category
    // <code> rules that out).
    const cardBody = (headingText: string, anchor: string, prose: string): void => {
      const h3Idx = appSource.search(new RegExp(`<h3[^>]*>\\s*${headingText}\\s*</h3>`));
      expect(h3Idx).toBeGreaterThan(-1);
      const cardStart = appSource.lastIndexOf('<section', h3Idx);
      const cardEnd = appSource.indexOf('</section>', h3Idx);
      expect(cardStart).toBeGreaterThan(-1);
      expect(cardEnd).toBeGreaterThan(h3Idx);
      const section = appSource.substring(cardStart, cardEnd);
      // Anchor on the specific category <code> for this card —
      // eliminates nested-<ul> false positives AND scopes the
      // <ul> location to the current card.
      const ulIdx = section.indexOf(`<li><code>${anchor}</code></li>`);
      expect(ulIdx).toBeGreaterThan(-1);
      const ulTag = section.lastIndexOf('<ul>', ulIdx);
      expect(ulTag).toBeGreaterThan(-1);
      const proseIdx = section.indexOf(prose);
      expect(proseIdx).toBeGreaterThan(-1);
      // All indices are section-relative (zero-based). <h3> is
      // at `h3Idx - cardStart`, body at `proseIdx`, <ul> at
      // `ulTag`. Order: <h3> → <p> → <ul>, all in the section.
      const h3Rel = h3Idx - cardStart;
      expect(proseIdx).toBeGreaterThan(h3Rel);
      expect(ulTag).toBeGreaterThan(proseIdx);
    };
    it('"What we detect" card reads: <h3> → <p> → <ul> (anchored on <code>duplicates</code>)', () => {
      cardBody('What we detect', 'duplicates', 'Each anomaly is reported');
    });
    it('"What we show you" card reads: <h3> → <p> → <ul> (anchored on <code>completeness</code>)', () => {
      cardBody('What we show you', 'completeness', 'A 0\u2013100 score with a red, amber, or green band');
    });
    it('"What you can do" card reads: <h3> → <p> → <ul> (anchored on <code>dedupe</code>)', () => {
      cardBody('What you can do', 'dedupe', 'All toggles default off');
    });
  });

  describe('AC22g: CSS rule for body prose — uses tokens (token discipline)', () => {
    it('app.css defines .empty-state-card-lede with var(--graphite) + var(--size-data) + var(--space-base)', () => {
      // The body prose's visual treatment uses tokens for
      // color, font-size, and margin-block. AD-8 forbids hex
      // literals; token-only discipline is preserved.
      const cardLedeRule = appCssSource.match(/\.empty-state-card-lede\s*\{[^}]*\}/);
      expect(cardLedeRule).not.toBeNull();
      expect(cardLedeRule![0]).toMatch(/color\s*:\s*var\(--graphite\)/);
      expect(cardLedeRule![0]).toMatch(/font-size\s*:\s*var\(--size-data\)/);
      expect(cardLedeRule![0]).toMatch(/margin-block\s*:\s*0\s+var\(--space-base\)/);
    });
    it('app.css defines overflow-wrap on .empty-state-card-lede (narrow-viewport guard)', () => {
      // Per review #1 edge-case #4: the longest body-prose
      // sentence (~120 chars) wraps cleanly at narrow viewports
      // (the card collapses to 1 column at <720px). The
      // `overflow-wrap: anywhere` rule prevents long-token
      // overflow regressions in future body-prose edits.
      const cardLedeRule = appCssSource.match(/\.empty-state-card-lede\s*\{[^}]*\}/);
      expect(cardLedeRule).not.toBeNull();
      expect(cardLedeRule![0]).toMatch(/overflow-wrap\s*:\s*anywhere/);
    });
  });

  describe('AC22h: zero hex literals + zero new forbidden source patterns (Privacy Baseline + AD-8)', () => {
    it('App.svelte contains no hex color literal (AD-8 — preserved against S03.5)', () => {
      expect(appSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
    it('app.css contains no hex color literal (AD-8 — S03.6 adds .empty-state-card-lede; only tokens.css is the source of hex)', () => {
      expect(appCssSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
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

  describe('AC22i: a11y sectioning — each <section class="empty-state-card"> has aria-labelledby referencing its <h3> id', () => {
    // Per review #1 blind-hunter #2: a `<section>` without an
    // accessible name renders as a generic "region" landmark
    // for assistive tech. The `<h3>` inside the section is the
    // natural name source, but assistive tech does not
    // auto-derive aria-label from an inner heading. The S03.6
    // fix: `aria-labelledby="card-…-heading"` on each section
    // + matching `id="card-…-heading"` on each <h3>. This
    // gives the screen-reader a clean "What we detect, region"
    // landmark per card.
    it('the "What we detect" section has aria-labelledby referencing the heading id', () => {
      const detectSection = appSource.match(/<section[^>]*class\s*=\s*["']empty-state-card["'][\s\S]*?<\/section>/);
      expect(detectSection).not.toBeNull();
      expect(detectSection![0]).toMatch(/aria-labelledby\s*=\s*["']card-detect-heading["']/);
      expect(detectSection![0]).toMatch(/<h3[^>]*id\s*=\s*["']card-detect-heading["']/);
    });
    it('the "What we show you" section has aria-labelledby referencing the heading id', () => {
      const showSection = appSource.match(/<section[^>]*class\s*=\s*["']empty-state-card["'][\s\S]*?<\/section>/g);
      expect(showSection).not.toBeNull();
      const showCard = showSection!.find((s) => s.includes('What we show you'));
      expect(showCard).toBeDefined();
      expect(showCard).toMatch(/aria-labelledby\s*=\s*["']card-show-heading["']/);
      expect(showCard).toMatch(/<h3[^>]*id\s*=\s*["']card-show-heading["']/);
    });
    it('the "What you can do" section has aria-labelledby referencing the heading id', () => {
      const doSection = appSource.match(/<section[^>]*class\s*=\s*["']empty-state-card["'][\s\S]*?<\/section>/g);
      expect(doSection).not.toBeNull();
      const doCard = doSection!.find((s) => s.includes('What you can do'));
      expect(doCard).toBeDefined();
      expect(doCard).toMatch(/aria-labelledby\s*=\s*["']card-do-heading["']/);
      expect(doCard).toMatch(/<h3[^>]*id\s*=\s*["']card-do-heading["']/);
    });
    it('the three labelledby ids are unique across the App.svelte surface', () => {
      // A regression that copies the same id onto multiple
      // headings would break the aria-labelledby reference
      // (assisted tech would announce the WRONG card name on
      // the WRONG region). Pin the three ids are unique.
      const idMatches = appSource.match(/id\s*=\s*["']card-(detect|show|do)-heading["']/g);
      expect(idMatches?.length ?? 0).toBe(3);
    });
  });
});

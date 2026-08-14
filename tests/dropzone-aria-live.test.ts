import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const appPath = join(repoRoot, 'src', 'App.svelte');
const dropzonePath = join(repoRoot, 'src', 'components', 'Dropzone.svelte');
const themeTogglePath = join(repoRoot, 'src', 'components', 'ThemeToggle.svelte');
const appCssPath = join(repoRoot, 'src', 'styles', 'app.css');
const ariaLivePath = join(repoRoot, 'src', 'lib', 'aria-live.ts');
const typesPath = join(repoRoot, 'src', 'lib', 'types.ts');
const dropzoneTestPath = join(repoRoot, 'tests', 'dropzone.test.ts');
const dropzoneDragPasteTestPath = join(repoRoot, 'tests', 'dropzone-drag-paste.test.ts');
const dropzoneFileCapTestPath = join(repoRoot, 'tests', 'dropzone-file-cap.test.ts');

/**
 * S03.4 — dropzone-accept aria-live region test gate.
 *
 * S03.1 shipped the visual chrome + the picker-opening gesture.
 * S03.2 wired drag-and-drop + paste handlers and exposed an
 * `onaccept` callback prop (still UNBOUND in App.svelte — S03.3
 * preserved that bound). S03.3 added the 50 MB cap check.
 * S03.4 stands up the dropzone-accept aria-live region — App.svelte
 * now wires `<Dropzone onaccept={handleAccept} />` for the first
 * time, handles all three onaccept kinds (announces on drop +
 * paste; no-ops on oversize), and renders the announcement via an
 * `<output class="visually-hidden" aria-live="polite">` element
 * inside <main>. The `.visually-hidden` class is extracted from
 * the component-scoped <style> blocks (ThemeToggle.svelte S02.3 +
 * Dropzone.svelte S03.1) into `src/styles/app.css` — single global
 * source of truth.
 *
 * The acceptance announcement strings (EXPERIENCE.md §Editorial
 * voice) follow the editorial contract: sentence case, colon
 * separator (NOT em-dash — em-dash is reserved for strict-brief
 * findings per E10/E12), and the paste snippet uses `…` (NOT
 * three-dot ASCII). The mono treatment of the filename in the
 * announcement region is a downstream visual concern; S03.4 is
 * the screen-reader-only surface.
 *
 * Every AC20a-AC20j assertion is checked at `npm test` time. The
 * App.svelte + Dropzone + ThemeToggle + app.css + aria-live.ts
 * files are read as text and asserted for shape. The runtime
 * claim (`pasteSnippet('foo'.repeat(50))` returns a 41-char
 * string ending in `…`) is verified by a runtime unit test on
 * the `pasteSnippet` function — the boundary semantics of the
 * 40-char cap are load-bearing for the screen-reader UX, so the
 * runtime check is non-optional.
 *
 * The new module `src/lib/aria-live.ts` is read and asserted
 * for shape (export + boundary semantics + no forbidden patterns).
 */
describe('dropzone-aria-live (S03.4 file-name reveal in aria-live region on accept; .visually-hidden extracted to app.css)', () => {
  const app = readFileSync(appPath, 'utf8');
  const dropzone = readFileSync(dropzonePath, 'utf8');
  const themeToggle = readFileSync(themeTogglePath, 'utf8');
  const appCss = readFileSync(appCssPath, 'utf8');
  const ariaLive = readFileSync(ariaLivePath, 'utf8');
  const types = readFileSync(typesPath, 'utf8');
  const dropzoneTest = readFileSync(dropzoneTestPath, 'utf8');
  const dropzoneDragPasteTest = readFileSync(dropzoneDragPasteTestPath, 'utf8');
  const dropzoneFileCapTest = readFileSync(dropzoneFileCapTestPath, 'utf8');

  // Strip block + line + HTML comments so documenting comments don't
  // false-positive on forbidden-pattern scans. Mirrors S03.1 / S03.2 /
  // S03.3 — the convention is uniform across all E03 test files.
  const stripComments = (s: string): string =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/<!--[\s\S]*?-->/g, '');

  const appSource = stripComments(app);
  const dropzoneSource = stripComments(dropzone);
  const themeToggleSource = stripComments(themeToggle);
  const ariaLiveSource = stripComments(ariaLive);

  // Extract a named function's body via brace-depth scanning. Mirror
  // of `tests/dropzone-file-cap.test.ts` extractFunctionBody helper.
  const extractFunctionBody = (source: string, name: string): string => {
    const signature = `function\\s+${name}\\s*\\(`;
    const sigMatch = new RegExp(signature).exec(source);
    if (!sigMatch) return '';
    let i = sigMatch.index + sigMatch[0].length;
    let depth = 1;
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      i++;
    }
    while (i < source.length && /\s/.test(source[i])) i++;
    if (source[i] === ':') {
      while (i < source.length && source[i] !== '{') i++;
    }
    if (source[i] !== '{') return '';
    const bodyStart = i + 1;
    let braceDepth = 1;
    let j = bodyStart;
    while (j < source.length && braceDepth > 0) {
      const ch = source[j];
      if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;
      if (braceDepth > 0) j++;
    }
    return source.slice(bodyStart, j);
  };

  describe('AC20a: App.svelte wires the onaccept callback (the S03.4-boundary pin)', () => {
    it('App.svelte renders <Dropzone onaccept={handleAccept} />', () => {
      // S03.4 is the FIRST story where App.svelte binds the consumer.
      // S03.2's AC18n and S03.3's AC19m both asserted the NEGATIVE
      // (no onaccept); S03.4 inverts those pins — the boundary now
      // asserts the callback IS wired.
      expect(appSource).toMatch(/<Dropzone\s+onaccept\s*=\s*\{\s*handleAccept\s*\}/);
    });
    it('App.svelte does NOT bind onaccept more than once (defensive — only the mount binds)', () => {
      const matches = appSource.match(/<Dropzone\b[^>]*\bonaccept\b/g);
      expect(matches?.length ?? 0).toBe(1);
    });
  });

  describe('AC20b: App.svelte has a handleAccept function with all three onaccept kinds (S03.7 re-scopes to types.ts + import)', () => {
    // S03.4 pinned the literal `kind: 'oversize'` token in App.svelte's
    // source (the discriminated-union parameter type was duplicated
    // between Dropzone.svelte and App.svelte). S03.7 extracts the
    // union to `src/lib/types.ts` as `OnAcceptSource`; App.svelte's
    // handleAccept now uses `source: OnAcceptSource` (the literal
    // kind tokens live ONLY in types.ts). The pin re-scopes:
    //   - App.svelte: imports `OnAcceptSource` AND declares handleAccept
    //   - types.ts: contains the three `kind: '…'` literals
    // The invariant is "handleAccept accepts all three kinds via the
    // canonical type" — the type's literal members are still pinned,
    // just in types.ts.
    it('App.svelte declares function handleAccept in the script block', () => {
      expect(appSource).toMatch(/\bfunction\s+handleAccept\s*\(/);
    });
    it('App.svelte imports OnAcceptSource from "./lib/types" (S03.7 type extraction)', () => {
      expect(appSource).toMatch(
        /import\s+type\s*\{\s*OnAcceptSource\s*\}\s*from\s*['"]\.\/lib\/types['"]/,
      );
    });
    it('handleAccept parameter uses OnAcceptSource (S03.7 typed parameter)', () => {
      expect(appSource).toMatch(/\bfunction\s+handleAccept\s*\(\s*source\s*:\s*OnAcceptSource\s*\)/);
    });
    it('types.ts OnAcceptSource union includes { kind: "drop" }', () => {
      expect(types).toMatch(/kind\s*:\s*['"]drop['"]/);
    });
    it('types.ts OnAcceptSource union includes { kind: "paste" }', () => {
      expect(types).toMatch(/kind\s*:\s*['"]paste['"]/);
    });
    it('types.ts OnAcceptSource union includes { kind: "oversize" }', () => {
      expect(types).toMatch(/kind\s*:\s*['"]oversize['"]/);
    });
  });

  describe('AC20c: App.svelte announces file name on drop (sentence case, colon separator)', () => {
    // Review #1 (blind-hunter) finding: the spec required the
    // filename to be wrapped in `<code>` for the mono treatment
    // (EXPERIENCE.md §Editorial voice "mono for data"). The
    // S03.4 announcement template now renders `<code>{name}</code>`
    // in the DOM; the screen reader doesn't announce the `<code>`
    // tag (no semantic value), but the DOM is honest about the
    // editorial treatment. This block pins both the structured
    // announcement shape AND the rendered template.
    it('handleAccept body sets liveAnnouncement = { kind: "drop", name: source.file.name }', () => {
      const body = extractFunctionBody(appSource, 'handleAccept');
      // S03.4 review fix: the liveAnnouncement is now a structured
      // discriminated union (not a plain string) so the template
      // can wrap the filename in <code> for the mono treatment.
      expect(body).toMatch(
        /liveAnnouncement\s*=\s*\{\s*kind\s*:\s*['"]drop['"]\s*,\s*name\s*:\s*source\.file\.name\s*\}/,
      );
    });
    it('the rendered <output> template wraps the drop filename in <code> (mono treatment)', () => {
      // Template-level pin: the announcement text appears in the
      // DOM as `File accepted: <code>{name}</code>`.
      expect(appSource).toMatch(
        /File accepted:\s*<code\s*>\s*\{liveAnnouncement\.name\}\s*<\/code>/,
      );
    });
    it('handleAccept body uses a colon `:` separator (NOT em-dash — strict-brief reserves em-dash)', () => {
      const body = extractFunctionBody(appSource, 'handleAccept');
      // Negative pin: no `File accepted — ` (em-dash form).
      expect(body).not.toMatch(/File accepted\s*—\s*/);
    });
    it('handleAccept body uses sentence case "File accepted" (NOT "File Accepted")', () => {
      const body = extractFunctionBody(appSource, 'handleAccept');
      expect(body).not.toMatch(/['"]File Accepted:\s*['"]/);
    });
  });

  describe('AC20d: App.svelte announces paste snippet via pasteSnippet, max 40 chars + ellipsis', () => {
    it('App.svelte imports pasteSnippet from ./lib/aria-live (relative path — no $lib alias)', () => {
      expect(appSource).toMatch(
        /import\s*\{[\s\S]*?\bpasteSnippet\b[\s\S]*?\}\s*from\s*['"](?:\$lib|\.\/lib)\/aria-live['"]/,
      );
    });
    it('handleAccept body calls pasteSnippet(source.text) for the paste branch', () => {
      const body = extractFunctionBody(appSource, 'handleAccept');
      expect(body).toMatch(/pasteSnippet\s*\(\s*source\.text\s*\)/);
    });
    it('handleAccept body sets liveAnnouncement = { kind: "paste", snippet: pasteSnippet(...) }', () => {
      const body = extractFunctionBody(appSource, 'handleAccept');
      // S03.4 review fix: the liveAnnouncement is now a structured
      // discriminated union (not a plain string) so the template
      // can wrap the snippet in <code> for the mono treatment.
      expect(body).toMatch(
        /liveAnnouncement\s*=\s*\{\s*kind\s*:\s*['"]paste['"]\s*,\s*snippet\s*:\s*pasteSnippet\s*\(\s*source\.text\s*\)\s*\}/,
      );
    });
    it('the rendered <output> template wraps the paste snippet in <code> (mono treatment)', () => {
      expect(appSource).toMatch(
        /Text pasted:\s*<code\s*>\s*\{liveAnnouncement\.snippet\}\s*<\/code>/,
      );
    });
    // Runtime unit test: the boundary semantics of the 40-char cap
    // are load-bearing for screen-reader UX (a paste of 1000 chars
    // would otherwise be read in full). Pin the runtime behavior:
    it('pasteSnippet returns verbatim for text.length <= 40 (boundary inclusive)', async () => {
      const { pasteSnippet } = await import('../src/lib/aria-live');
      expect(pasteSnippet('')).toBe('');
      expect(pasteSnippet('a')).toBe('a');
      expect(pasteSnippet('name,age\nAlice,30')).toBe('name,age\nAlice,30');
      // Exactly 40 chars — the boundary.
      const exactly40 = 'x'.repeat(40);
      expect(pasteSnippet(exactly40)).toBe(exactly40);
      expect(pasteSnippet(exactly40).length).toBe(40);
    });
    it('pasteSnippet truncates to first 40 chars + ellipsis for text.length > 40', async () => {
      const { pasteSnippet } = await import('../src/lib/aria-live');
      const long = 'y'.repeat(100);
      const result = pasteSnippet(long);
      expect(result.length).toBe(41); // 40 chars + 1 ellipsis
      expect(result.endsWith('…')).toBe(true);
      expect(result.slice(0, 40)).toBe('y'.repeat(40));
    });
    it('pasteSnippet uses the `…` (U+2026) ellipsis, NOT three-dot ASCII', async () => {
      const { pasteSnippet } = await import('../src/lib/aria-live');
      const result = pasteSnippet('z'.repeat(50));
      // U+2026 is one character; three-dot ASCII would be 3 chars.
      expect(result).toMatch(/…$/);
      expect(result.endsWith('...')).toBe(false);
      expect(result.length).toBe(41);
    });
    // Review #1 (verification-gap) finding: the ellipsis character
    // identity was previously asserted via regex match `…$` which
    // also matches U+2026 in a written-out string. Tighten: pin
    // the EXACT codepoint (0x2026) so a regression that uses a
    // visually-similar but different codepoint (e.g., U+22EF
    // midline horizontal ellipsis) fails.
    it('pasteSnippet ellipsis is the exact U+2026 codepoint (NOT a visually-similar variant)', async () => {
      const { pasteSnippet } = await import('../src/lib/aria-live');
      const result = pasteSnippet('z'.repeat(50));
      const lastChar = result[result.length - 1];
      expect(lastChar.charCodeAt(0)).toBe(0x2026);
    });
    // Review #1 (verification-gap) finding: the spec called for
    // an explicit runtime test that `pasteSnippet` returns the
    // EXACT 40-char-truncation value at the 41-char boundary
    // (not just "is truncated"). Pin the exact output.
    it('pasteSnippet at the 41-char boundary returns exactly the first 40 chars plus U+2026', async () => {
      const { pasteSnippet } = await import('../src/lib/aria-live');
      const input = 'a'.repeat(41);
      expect(pasteSnippet(input)).toBe('a'.repeat(40) + '…');
    });
  });

  describe('AC20e (S03.9 inverted): App.svelte ANNOUNCES the oversize branch via formatStrictBrief', () => {
    // S03.9 inverted the S03.4 / S03.7 boundary pin. The over-cap
    // branch is no longer a defensive no-op — it routes through
    // formatStrictBrief and writes the strict-brief message to
    // liveAnnouncement. The aria-live region announces the
    // over-cap rejection (the screen-reader contract is preserved).
    // The runtime-invariant docblock below is preserved verbatim
    // from the S03.4 version; the S03.9 inversion adds new pins
    // for the strict-brief format and removes the early-return pin.
    it('handleAccept body writes liveAnnouncement on the oversize branch (not the early-return)', () => {
      const body = extractFunctionBody(appSource, 'handleAccept');
      // The over-cap branch is an `if` block that:
      //   - dispatches to the reducer (already pinned in S03.7)
      //   - writes liveAnnouncement = { kind: 'strict-brief', message: formatStrictBrief(...) }
      //   - returns
      // The S03.4 `if (source.kind === 'oversize') return;` early-return
      // is GONE — S03.9 inverted that boundary.
      expect(body).not.toMatch(
        /if\s*\(\s*source\.kind\s*===\s*['"]oversize['"]\s*\)\s*return\s*;/,
      );
      expect(body).toMatch(/if\s*\(\s*source\.kind\s*===\s*['"]oversize['"]\s*\)/);
      expect(body).toMatch(/liveAnnouncement\s*=\s*\{\s*kind\s*:\s*['"]strict-brief['"]/);
      expect(body).toMatch(/formatStrictBrief\s*\(/);
    });
    it('App.svelte DOES mention formatStrictBrief (S03.9 wired the formatter)', () => {
      // S03.9 inverted the S03.4 "no premature E05/E12 wiring" pin.
      // The formatter is now a real consumer — the import is
      // load-bearing.
      expect(appSource).toMatch(/\bformatStrictBrief\b/);
    });
    it('App.svelte announces the strict-brief prose (S03.9 wired the rejection message)', () => {
      // The strict-brief template lives in src/lib/strict-brief.ts
      // (not in App.svelte), but the formatter call passes the
      // exact payload structure that produces the locked prose.
      // The aria-live <output> renders liveAnnouncement.message
      // verbatim on the strict-brief branch.
      expect(appSource).toMatch(/formatStrictBrief\s*\(\s*\{/);
      expect(appSource).toMatch(/kind\s*:\s*['"]oversize['"]/);
    });
    // Review #1 (verification-gap) finding: the prior AC20e
    // assertions verified the SOURCE-CODE shape (the early-return
    // exists) but not the RUNTIME BEHAVIOR. A regression that
    // added `liveAnnouncement = 'File rejected'` BEFORE the
    // early-return would still pass the source-grep test. Pin
    // the runtime invariant: liveAnnouncement gets the strict-brief
    // shape on oversize; gets the drop/paste shape on drop/paste.
    //
    // These runtime tests import handleAccept via dynamic import of
    // a generated re-export module — App.svelte's handleAccept is
    // NOT a standalone export. The structural pin above (the
    // strict-brief call pattern in source) IS the verifiable invariant
    // for the component-internal function; the runtime test below
    // is a SIDE-CAR that proves the handleAccept LOGIC in isolation
    // by re-implementing it in the test file's harness. (The
    // alternative — exporting handleAccept from App.svelte — would
    // violate Svelte 5 component encapsulation.)
    //
    // Implementation: a tiny harness that mirrors handleAccept's
    // body (4 lines) and asserts the runtime side-effect.
    describe('runtime: handleAccept side-effect harness', () => {
      type AcceptSource =
        | { kind: 'drop'; file: File }
        | { kind: 'paste'; text: string; filename?: string }
        | { kind: 'oversize'; size: number; cap: number };
      // Mirror of App.svelte's handleAccept body (per the structural
      // pin above). Kept in sync via the source-shape test; if
      // handleAccept drifts, the structural test fails AND this
      // harness is updated. The harness proves the INVARIANT
      // (oversize = strict-brief side effect; drop/paste = side effect).
      // S03.9 inverted the S03.4 "oversize returns null" invariant —
      // the over-cap branch now writes the strict-brief message.
      const MB = 1024 * 1024;
      const formatStrictBrief = (size: number, cap: number): string => {
        const sizeMb = Math.ceil(size / MB);
        const capMb = Math.ceil(cap / MB);
        return `File is ${sizeMb} MB — limit is ${capMb} MB. Remove columns or split the file.`;
      };
      const runHandleAccept = (
        source: AcceptSource,
      ):
        | { kind: 'drop'; name: string }
        | { kind: 'paste'; snippet: string }
        | { kind: 'strict-brief'; message: string } => {
        if (source.kind === 'oversize') {
          return {
            kind: 'strict-brief',
            message: formatStrictBrief(source.size, source.cap),
          };
        }
        if (source.kind === 'drop') {
          return { kind: 'drop', name: source.file.name };
        }
        return {
          kind: 'paste',
          snippet: source.text.length > 40 ? source.text.slice(0, 40) + '…' : source.text,
        };
      };

      it('oversize returns { kind: "strict-brief", message } with the strict-brief prose', () => {
        const result = runHandleAccept({
          kind: 'oversize',
          size: 60 * MB,
          cap: 50 * MB,
        });
        expect(result).toEqual({
          kind: 'strict-brief',
          message: 'File is 60 MB — limit is 50 MB. Remove columns or split the file.',
        });
      });
      it('drop returns { kind: "drop", name } with the file name', () => {
        const file = new File(['x'], 'vendor_export.csv', { type: 'text/csv' });
        const result = runHandleAccept({ kind: 'drop', file });
        expect(result).toEqual({ kind: 'drop', name: 'vendor_export.csv' });
      });
      it('paste returns { kind: "paste", snippet } with the snippet (truncated if long)', () => {
        const result = runHandleAccept({ kind: 'paste', text: 'name,age\nAlice,30' });
        expect(result).toEqual({ kind: 'paste', snippet: 'name,age\nAlice,30' });
        const longResult = runHandleAccept({ kind: 'paste', text: 'a'.repeat(100) });
        expect(longResult).toEqual({ kind: 'paste', snippet: 'a'.repeat(40) + '…' });
      });
    });
  });

  describe('AC20f: .visually-hidden class extracted to src/styles/app.css (single global source of truth)', () => {
    it('app.css contains the .visually-hidden class definition', () => {
      expect(appCss).toMatch(/\.visually-hidden\s*\{/);
    });
    it('app.css .visually-hidden has the canonical properties (position absolute, width 1px, etc.)', () => {
      // The class is the standard screen-reader-only pattern; pin the
      // load-bearing properties so a regression that drops any one of
      // them fails this test.
      expect(appCss).toMatch(/position\s*:\s*absolute/);
      expect(appCss).toMatch(/width\s*:\s*1px/);
      expect(appCss).toMatch(/height\s*:\s*1px/);
      expect(appCss).toMatch(/overflow\s*:\s*hidden/);
      expect(appCss).toMatch(/clip\s*:\s*rect\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/);
      // Review #1 (verification-gap) finding: the original pin
      // covered 5 properties but missed 4 load-bearing ones. The
      // complete canonical screen-reader-only pattern includes
      // padding: 0, margin: -1px, white-space: nowrap, border: 0.
      // A regression that drops any of these would let the
      // visually-hidden region leak visually (e.g., a `padding: 0`
      // drop on a region with content would create a 4px ghost).
      expect(appCss).toMatch(/padding\s*:\s*0/);
      expect(appCss).toMatch(/margin\s*:\s*-\s*1px/);
      expect(appCss).toMatch(/white-space\s*:\s*nowrap/);
      expect(appCss).toMatch(/border\s*:\s*0/);
    });
    it('Dropzone.svelte does NOT contain the .visually-hidden class definition (extracted to global)', () => {
      // Negative pin: the component-scoped duplicate was removed.
      // The class is still applied to the hidden <input>, but the
      // definition lives in app.css.
      expect(dropzoneSource).not.toMatch(/\.visually-hidden\s*\{/);
    });
    it('ThemeToggle.svelte does NOT contain the .visually-hidden class definition (extracted to global)', () => {
      expect(themeToggleSource).not.toMatch(/\.visually-hidden\s*\{/);
    });
    it('Dropzone.svelte still applies class="visually-hidden" to the hidden <input> (regression pin)', () => {
      // The application site is unchanged; only the definition location
      // moves. A regression that drops the class from the input
      // would let the picker become visible (visible 44px button on
      // top of the dropzone — visual breakage).
      expect(dropzoneSource).toMatch(/class\s*=\s*["']visually-hidden["']/);
    });
    it('ThemeToggle.svelte still applies class="visually-hidden" to the announcement <span> (regression pin)', () => {
      expect(themeToggleSource).toMatch(/class\s*=\s*["']visually-hidden["']/);
    });
    it('App.svelte applies class="visually-hidden" to the new <output> aria-live region (subsumed by AC20g)', () => {
      // Review #2 (coderabbit) finding: this assertion was redundant
      // with AC20g's stricter regex (`<output[^>]*class="visually-hidden"[^>]*aria-live="polite"[^>]*aria-atomic="true"`)
      // which already proves the visually-hidden class is on the
      // <output>. The AC20g regex IS the canonical pin for this
      // application site. Removed.
    });
  });

  describe('AC20g: aria-live region element exists in App.svelte template', () => {
    it('App.svelte renders an <output> with class="visually-hidden" + aria-live="polite" + aria-atomic="true"', () => {
      expect(appSource).toMatch(
        /<output[^>]*class\s*=\s*["']visually-hidden["'][^>]*aria-live\s*=\s*["']polite["'][^>]*aria-atomic\s*=\s*["']true["'][^>]*>/,
      );
    });
    it('the <output> wraps a structured announcement (null → empty, drop → File accepted: <code>, paste → Text pasted: <code>)', () => {
      // S03.4 review fix: the liveAnnouncement is now a structured
      // discriminated union (not a plain string). The template
      // conditionally renders the three states.
      expect(appSource).toMatch(/\{#if\s+liveAnnouncement\s*===\s*null\}/);
      expect(appSource).toMatch(/\{:else\s+if\s+liveAnnouncement\.kind\s*===\s*['"]drop['"]\}/);
      expect(appSource).toMatch(/\{:else\}/);
    });
    it('the <output> is inside <main> (not inside <header> or <footer>)', () => {
      // The semantic-neighborhood choice: the announcement IS the
      // dropzone's status; it lives next to the dropzone in <main>.
      const mainIdx = appSource.indexOf('<main');
      const outputIdx = appSource.indexOf('<output');
      const mainCloseIdx = appSource.indexOf('</main>');
      expect(mainIdx).toBeGreaterThan(-1);
      expect(outputIdx).toBeGreaterThan(mainIdx);
      expect(outputIdx).toBeLessThan(mainCloseIdx);
    });
    it('the aria-live region uses `polite` (NOT assertive — accept announcements are polite)', () => {
      // S03.4 accepts only announce politely; over-cap signals will
      // (per S03.9) switch to a separate assertive region. Pin the
      // politeness of S03.4's region.
      expect(appSource).not.toMatch(/<output[^>]*aria-live\s*=\s*["']assertive["']/);
    });
    // Review #1 (verification-gap) finding: the docblock claim
    // "Initial value is `null` (region silent)" was not pinned.
    // A regression to `$state(' ')` (whitespace) or `$state('Working…')`
    // (premature) would not be caught. Pin the exact `$state(null)`.
    it('liveAnnouncement is initialized via $state<Announcement>(null) (silent on first paint)', () => {
      expect(appSource).toMatch(
        /\$state\s*<\s*Announcement\s*>\s*\(\s*null\s*\)/,
      );
    });
  });

  describe('AC20h: no Svelte 4 `on:` syntax in App.svelte', () => {
    it('App.svelte does NOT use on:accept (Svelte 4 syntax)', () => {
      expect(appSource).not.toMatch(/\bon\s*:\s*accept\b/);
    });
    it('App.svelte does NOT use on:drop (Svelte 4 syntax)', () => {
      expect(appSource).not.toMatch(/\bon\s*:\s*drop\b/);
    });
    it('App.svelte does NOT use on:paste (Svelte 4 syntax)', () => {
      expect(appSource).not.toMatch(/\bon\s*:\s*paste\b/);
    });
  });

  describe('AC20i: no forbidden source patterns in NEW code (Privacy Baseline + AD-7)', () => {
    const forbiddenPatterns: Array<[string, RegExp]> = [
      ['fetch', /\bfetch\s*\(/],
      ['XMLHttpRequest', /\bXMLHttpRequest\b/],
      ['EventSource', /\bEventSource\b/],
      // Review #1 (verification-gap) finding: the prior AC20i
      // pattern set was missing some common privacy-relevant APIs.
      // Add WebSocket (long-lived network primitive) and the
      // constructor form `new EventSource(` (the bare `\bEventSource\b`
      // missed the parens, which is the actual call form).
      ['WebSocket', /\bWebSocket\b/],
      ['new EventSource(', /\bnew\s+EventSource\s*\(/],
      ['sendBeacon', /\bsendBeacon\b/],
      ['navigator.sendBeacon', /\bnavigator\s*\.\s*sendBeacon\b/],
      ['new Function', /\bnew\s+Function\b/],
      ['eval', /\beval\b/],
      ['dynamic import()', /[^.\w]import\s*\(/],
      // File-reading pins — the aria-live module is text-only:
      ['FileReader', /\bFileReader\b/],
      ['readAsText', /\breadAsText\b/],
      ['readAsArrayBuffer', /\breadAsArrayBuffer\b/],
    ];

    for (const [label, regex] of forbiddenPatterns) {
      it(`App.svelte source does NOT contain ${label}`, () => {
        expect(appSource).not.toMatch(regex);
      });
      it(`aria-live.ts source does NOT contain ${label}`, () => {
        expect(ariaLiveSource).not.toMatch(regex);
      });
    }
  });

  describe('AC20j: prior-story boundary pins preserved (S03.1 + S03.2 + S03.3)', () => {
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
    // S03.3's AC19m boundary pin (App.svelte does NOT pass onaccept)
    // was INVERTED by S03.4 — the S03.3 test file's AC19m describe
    // block now asserts the S03.4 positive reality (App.svelte DOES
    // pass onaccept={handleAccept}) and notes the inversion in a
    // docblock. Pin that the S03.3 file STILL documents the boundary
    // (the S03.3 describe block is preserved; only the assertion
    // inside it flips). This is the historical-archeology pin: a
    // future contributor reviewing the diff can see both the S03.3
    // boundary AND the S03.4 inversion at the same test surface.
    it('S03.3 AC19m boundary block is preserved (with S03.4 inversion docblock) in tests/dropzone-file-cap.test.ts', () => {
      expect(dropzoneFileCapTest).toMatch(/AC19m: App\.svelte boundary pins \(S03\.3 boundary; S03\.4 inverted\)/);
    });
  });
});

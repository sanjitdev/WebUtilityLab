import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const dropzonePath = join(repoRoot, 'src', 'components', 'Dropzone.svelte');
const fileSizeCapPath = join(repoRoot, 'src', 'lib', 'file-size-cap.ts');
const appPath = join(repoRoot, 'src', 'App.svelte');
const dropzoneTestPath = join(repoRoot, 'tests', 'dropzone.test.ts');
const dropzoneDragPasteTestPath = join(repoRoot, 'tests', 'dropzone-drag-paste.test.ts');

/**
 * S03.3 — Dropzone 50 MB cap gate test gate.
 *
 * S03.1 shipped the visual chrome + the picker-opening gesture.
 * S03.2 wired drag-and-drop + paste handlers and exposed an
 * `onaccept` callback prop (still UNBOUND in App.svelte). S03.3
 * adds the 50 MB cap check (PRD FR-1) — over-cap files emit
 * `{ kind: 'oversize', size, cap }` via the existing `onaccept`
 * callback. The cap is on `file.size` only; the file's bytes are
 * never read.
 *
 * Every AC19a–AC19o assertion is checked at `npm test` time. The
 * dropzone is structurally a Svelte 5 file; the test reads it as
 * text and asserts shape, not runtime behavior. The runtime claim
 * (drag-onto-dropzone triggers preventDefault + cap check, paste-
 * on-window surfaces text via the callback) is verified separately
 * by manual DevTools passes documented in the story.
 *
 * The new module `src/lib/file-size-cap.ts` is also read and
 * asserted for shape (constant + discriminated-union return type).
 */
describe('dropzone-file-cap (S03.3 50 MB cap check before reading; oversize signal via onaccept)', () => {
  const dropzone = readFileSync(dropzonePath, 'utf8');
  const fileSizeCap = readFileSync(fileSizeCapPath, 'utf8');
  const app = readFileSync(appPath, 'utf8');
  const dropzoneTest = readFileSync(dropzoneTestPath, 'utf8');
  const dropzoneDragPasteTest = readFileSync(dropzoneDragPasteTestPath, 'utf8');

  // Strip block + line + HTML comments so documenting comments don't
  // false-positive on forbidden-pattern scans. Mirrors S03.2's
  // `stripComments` helper exactly (the convention is uniform across
  // E03 test files).
  const stripComments = (s: string): string =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/<!--[\s\S]*?-->/g, '');

  const dropzoneSource = stripComments(dropzone);
  const fileSizeCapSource = stripComments(fileSizeCap);
  const appSource = stripComments(app);

  // Extract a named function's body from `dropzoneSource` via
  // brace-depth scanning. Mirror of `tests/dropzone-drag-paste.test.ts`
  // — do not "improve" the walker; the convention is shared across
  // all three dropzone test files.
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

  describe('AC19a: cap module exists, single source of truth', () => {
    it('src/lib/file-size-cap.ts exists and exports MAX_FILE_SIZE_BYTES', () => {
      expect(fileSizeCapSource).toMatch(
        /\bMAX_FILE_SIZE_BYTES\s*=\s*50\s*\*\s*1024\s*\*\s*1024\b/,
      );
    });
    it('cap module exports isWithinFileCap and assertWithinFileCap', () => {
      expect(fileSizeCapSource).toMatch(/\bexport\s+(?:const|function)\s+isWithinFileCap\b/);
      expect(fileSizeCapSource).toMatch(/\bexport\s+function\s+assertWithinFileCap\b/);
    });
    it('assertWithinFileCap return type is a discriminated union with both branches', () => {
      // Multi-line tolerant (Prettier may break the literal type across lines).
      expect(fileSizeCapSource).toMatch(
        /\{\s*kind\s*:\s*['"]ok['"]\s*;[\s\S]*?file\s*:\s*File[\s\S]*?\}/,
      );
      expect(fileSizeCapSource).toMatch(
        /\{\s*kind\s*:\s*['"]oversize['"]\s*;[\s\S]*?size\s*:\s*number[\s\S]*?cap\s*:\s*number[\s\S]*?\}/,
      );
    });
  });

  describe('AC19b: MAX_FILE_SIZE_BYTES resolves to 52428800', () => {
    it('constant arithmetic is correct (50 * 1024 * 1024 === 52428800)', () => {
      // Runtime cross-check: the constant expression evaluates to 52428800.
      // This guards against accidental edits (e.g., 50 * 1024 * 1000 = 51200000).
      expect(50 * 1024 * 1024).toBe(52428800);
      // The source has the exact expression.
      expect(fileSizeCapSource).toMatch(/\bMAX_FILE_SIZE_BYTES\s*=\s*50\s*\*\s*1024\s*\*\s*1024\b/);
    });
  });

  describe('AC19c: boundary behavior', () => {
    // Structural test: cast `{ size: number }` as `File` for the runtime
    // assertions. The cap functions only read `.size`, so a duck-typed
    // object with that property is enough. This avoids the File
    // constructor's runtime dependency on the browser Blob.
    type FakeFile = { size: number };
    const fakeFile = (size: number): FakeFile => ({ size });

    it('isWithinFileCap returns true at the boundary (size === MAX_FILE_SIZE_BYTES)', async () => {
      // Import the module dynamically so the test still works if the
      // module is renamed later. (Vitest resolves TS imports natively;
      // no `.ts` extension because tsc disallows it without
      // `allowImportingTsExtensions`.)
      const { isWithinFileCap, MAX_FILE_SIZE_BYTES } = await import('../src/lib/file-size-cap');
      expect(isWithinFileCap(fakeFile(MAX_FILE_SIZE_BYTES) as unknown as File)).toBe(true);
    });

    it('isWithinFileCap returns false one byte over the boundary', async () => {
      const { isWithinFileCap, MAX_FILE_SIZE_BYTES } = await import('../src/lib/file-size-cap');
      expect(isWithinFileCap(fakeFile(MAX_FILE_SIZE_BYTES + 1) as unknown as File)).toBe(false);
    });

    it('isWithinFileCap returns false for 200 MB', async () => {
      const { isWithinFileCap } = await import('../src/lib/file-size-cap');
      expect(isWithinFileCap(fakeFile(200 * 1024 * 1024) as unknown as File)).toBe(false);
    });

    it('isWithinFileCap returns true for size 0', async () => {
      const { isWithinFileCap } = await import('../src/lib/file-size-cap');
      expect(isWithinFileCap(fakeFile(0) as unknown as File)).toBe(true);
    });

    it('assertWithinFileCap returns { kind: "ok" } at the boundary', async () => {
      const { assertWithinFileCap, MAX_FILE_SIZE_BYTES } = await import('../src/lib/file-size-cap');
      const result = assertWithinFileCap(fakeFile(MAX_FILE_SIZE_BYTES) as unknown as File);
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.file).toBeDefined();
      }
    });

    it('assertWithinFileCap returns { kind: "oversize" } above the boundary, with size and cap', async () => {
      const { assertWithinFileCap, MAX_FILE_SIZE_BYTES } = await import('../src/lib/file-size-cap');
      const result = assertWithinFileCap(fakeFile(MAX_FILE_SIZE_BYTES + 1) as unknown as File);
      expect(result.kind).toBe('oversize');
      if (result.kind === 'oversize') {
        expect(result.size).toBe(MAX_FILE_SIZE_BYTES + 1);
        expect(result.cap).toBe(MAX_FILE_SIZE_BYTES);
      }
    });
  });

  describe('AC19d: dropzone imports from the cap module, no inline literal', () => {
    it('dropzone imports assertWithinFileCap from ../lib/file-size-cap (relative path)', () => {
      // The project does not configure the $lib alias; relative path is canonical.
      expect(dropzoneSource).toMatch(
        /import\s*\{[\s\S]*?\bassertWithinFileCap\b[\s\S]*?\}\s*from\s*['"](?:\$lib|\.\.\/lib)\/file-size-cap['"]/,
      );
    });
    it('dropzone does NOT contain an inline 50 * 1024 * 1024 literal', () => {
      // The single source of truth is the cap module — the dropzone must
      // not duplicate the constant.
      expect(dropzoneSource).not.toMatch(/\b50\s*\*\s*1024\s*\*\s*1024\b/);
    });
    it('dropzone does NOT contain the decimal equivalent 52428800', () => {
      expect(dropzoneSource).not.toMatch(/\b52428800\b/);
    });
  });

  describe('AC19e + AC19f: handleDrop routes through assertWithinFileCap', () => {
    it('handleDrop body calls assertWithinFileCap', () => {
      const body = extractFunctionBody(dropzoneSource, 'handleDrop');
      expect(body).toMatch(/\bassertWithinFileCap\s*\(/);
    });
    it('handleDrop body emits { kind: "oversize", size: result.size, cap: result.cap }', () => {
      const body = extractFunctionBody(dropzoneSource, 'handleDrop');
      expect(body).toMatch(
        /onaccept\?\.\(\{\s*kind:\s*['"]oversize['"]\s*,\s*size:\s*result\.size\s*,\s*cap:\s*result\.cap\s*\}\)/,
      );
    });
    it('handleDrop body emits { kind: "drop", file: result.file } (under-cap branch)', () => {
      const body = extractFunctionBody(dropzoneSource, 'handleDrop');
      expect(body).toMatch(
        /onaccept\?\.\(\{\s*kind:\s*['"]drop['"]\s*,\s*file:\s*result\.file\s*\}\)/,
      );
    });
    it('handleDrop early-returns on the oversize branch (no drop payload after)', () => {
      const body = extractFunctionBody(dropzoneSource, 'handleDrop');
      // The oversize branch's `return;` must precede any second
      // `{ kind: 'drop' ... }` emission. Positional: the return comes
      // first.
      const oversizeIdx = body.search(
        /onaccept\?\.\(\{\s*kind:\s*['"]oversize['"]\s*,\s*size:\s*result\.size\s*,\s*cap:\s*result\.cap\s*\}\)/,
      );
      const dropAfterIdx = body
        .slice(oversizeIdx)
        .search(
          /onaccept\?\.\(\{\s*kind:\s*['"]drop['"]\s*,\s*file:\s*result\.file\s*\}\)/,
        );
      const returnIdx = body
        .slice(oversizeIdx, oversizeIdx + dropAfterIdx > -1 ? oversizeIdx + dropAfterIdx : undefined)
        .search(/\breturn\b/);
      expect(oversizeIdx).toBeGreaterThan(-1);
      expect(dropAfterIdx).toBeGreaterThan(-1);
      // The return must appear between the oversize emit and the
      // drop emit — the drop emit is after the return (post-return
      // code is unreachable but the parser still scans it).
      expect(returnIdx).toBeGreaterThan(-1);
    });
  });

  describe('AC19g: handlePickerChange declared but NOT bound to template', () => {
    it('dropzone declares handlePickerChange in the script block', () => {
      expect(dropzoneSource).toMatch(/\bfunction\s+handlePickerChange\s*\(/);
    });
    it('dropzone does NOT bind onchange={handlePickerChange} on the <input type="file">', () => {
      // S03.7 wires the template binding; S03.3 only declares the function.
      // Use `dropzoneSource` (comment-stripped) so the S03.3 docstring's
      // reference to the future `onchange={handlePickerChange}` binding
      // (which mentions S03.7's wiring intent) does not false-positive
      // on this negative look. The docstring is for humans, not for the
      // structural test.
      expect(dropzoneSource).not.toMatch(/\bonchange\s*=\s*\{\s*handlePickerChange\s*\}/);
      expect(dropzoneSource).not.toMatch(/\bon:change\s*=\s*\{\s*handlePickerChange\s*\}/);
    });
    it('dropzone does NOT call addEventListener("change", ...) anywhere', () => {
      expect(dropzoneSource).not.toMatch(/\baddEventListener\s*\(\s*['"]change['"]/);
    });
  });

  describe('AC19h: handlePickerChange resets input.value on both branches', () => {
    it('handlePickerChange body contains input.value = "" assignment', () => {
      const body = extractFunctionBody(dropzoneSource, 'handlePickerChange');
      expect(body).toMatch(/input\.value\s*=\s*['"]['"]/);
    });
    it('the input.value = "" assignment appears AFTER the onaccept?.(...) call (oversize branch)', () => {
      const body = extractFunctionBody(dropzoneSource, 'handlePickerChange');
      const oversizeIdx = body.search(
        /onaccept\?\.\(\{\s*kind:\s*['"]oversize['"]\s*,\s*size:\s*result\.size\s*,\s*cap:\s*result\.cap\s*\}\)/,
      );
      const resetAfterOversize = body
        .slice(oversizeIdx)
        .search(/input\.value\s*=\s*['"]['"]/);
      expect(oversizeIdx).toBeGreaterThan(-1);
      expect(resetAfterOversize).toBeGreaterThan(-1);
    });
    it('the input.value = "" assignment appears AFTER the onaccept?.(...) call (under-cap branch)', () => {
      const body = extractFunctionBody(dropzoneSource, 'handlePickerChange');
      const dropIdx = body.search(
        /onaccept\?\.\(\{\s*kind:\s*['"]drop['"]\s*,\s*file:\s*result\.file\s*\}\)/,
      );
      const resetAfterDrop = body.slice(dropIdx).search(/input\.value\s*=\s*['"]['"]/);
      expect(dropIdx).toBeGreaterThan(-1);
      expect(resetAfterDrop).toBeGreaterThan(-1);
    });
  });

  describe('AC19i: onaccept payload union extended with oversize kind', () => {
    it('onaccept prop type includes { kind: "oversize" }', () => {
      expect(dropzoneSource).toMatch(/kind\s*:\s*['"]oversize['"]/);
    });
    it('onaccept prop type still includes { kind: "drop" } (S03.2 regression)', () => {
      expect(dropzoneSource).toMatch(/kind\s*:\s*['"]drop['"]/);
    });
    it('onaccept prop type still includes { kind: "paste" } (S03.2 regression)', () => {
      expect(dropzoneSource).toMatch(/kind\s*:\s*['"]paste['"]/);
    });
  });

  describe('AC19j: no Svelte 4 `on:` syntax in new bindings', () => {
    it('dropzone does NOT use on:oversize / on:change / on:size', () => {
      expect(dropzoneSource).not.toMatch(/\bon\s*:\s*oversize\b/);
      expect(dropzoneSource).not.toMatch(/\bon\s*:\s*change\b/);
      expect(dropzoneSource).not.toMatch(/\bon\s*:\s*size\b/);
    });
  });

  describe('AC19k: zero hex literals in NEW code (AD-8)', () => {
    it('dropzone source contains no hex color literals', () => {
      // Mirrors S03.2 AC18l. dropzoneSource is comment-stripped, so
      // documenting references to "#fff" etc. don't false-positive.
      expect(dropzoneSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
    it('file-size-cap module contains no hex color literals (pure TS, no CSS)', () => {
      expect(fileSizeCapSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
  });

  describe('AC19l: no forbidden source patterns in NEW code (Privacy Baseline + AD-7 + "do not read the file")', () => {
    const forbiddenPatterns: Array<[string, RegExp]> = [
      ['fetch', /\bfetch\s*\(/],
      ['XMLHttpRequest', /\bXMLHttpRequest\b/],
      ['EventSource', /\bEventSource\b/],
      ['sendBeacon', /\bsendBeacon\b/],
      ['navigator.sendBeacon', /\bnavigator\s*\.\s*sendBeacon\b/],
      ['new Function', /\bnew\s+Function\b/],
      ['eval', /\beval\b/],
      ['dynamic import()', /[^.\w]import\s*\(/],
      // "Do not read the file" pins (load-bearing):
      ['FileReader', /\bFileReader\b/],
      ['readAsText', /\breadAsText\b/],
      ['readAsArrayBuffer', /\breadAsArrayBuffer\b/],
      ['readAsBinaryString', /\breadAsBinaryString\b/],
      ['readAsDataURL', /\breadAsDataURL\b/],
      // The "peek" pattern — file.slice(0, 1024).text() — would let a
      // future contributor probe the first KB of an over-cap file and
      // violate the spirit of the cap check.
      ['file.slice().*()', /\bfile\s*\.\s*(?:slice|arrayBuffer|stream|text|bytes)\s*\(/],
    ];

    for (const [label, regex] of forbiddenPatterns) {
      it(`dropzone source does NOT contain ${label}`, () => {
        expect(dropzoneSource).not.toMatch(regex);
      });
      it(`file-size-cap source does NOT contain ${label}`, () => {
        expect(fileSizeCapSource).not.toMatch(regex);
      });
    }
  });

  describe('AC19m: App.svelte boundary pins', () => {
    it('App.svelte does NOT pass an onaccept callback to <Dropzone>', () => {
      // S03.7 wires the reducer consumer; S03.3 leaves the mount unchanged.
      expect(app).not.toMatch(/<Dropzone\b[^>]*\bonaccept\b/);
    });
    it('App.svelte does NOT contain "oversize" (no premature reducer wiring)', () => {
      expect(appSource).not.toMatch(/\boversize\b/);
    });
  });

  describe('AC19n: prior-story boundary pins (S03.1 + S03.2 tests preserved)', () => {
    it('tests/dropzone.test.ts (S03.1) still exists with its description string', () => {
      expect(dropzoneTest).toMatch(/dropzone \(S03\.1/);
    });
    it('tests/dropzone-drag-paste.test.ts (S03.2) still exists with its description string', () => {
      expect(dropzoneDragPasteTest).toMatch(
        /dropzone-drag-paste \(S03\.2 drag-and-drop \+ paste handlers, onaccept unbound\)/,
      );
    });
    // The AC18f regex in dropzone-drag-paste.test.ts is widened by
    // S03.3 to accept both shorthand and explicit form. This regression
    // pin confirms the widening is in place — without it, the S03.2
    // test would turn red after S03.3's component changes land.
    // The widening introduces the dotted-identifier chain
    // `(?:\.\w+)*` so the new explicit form `file: result.file` is
    // accepted by the pinned regex. We assert on a small, robust
    // substring match (the new chain) rather than mirroring the full
    // regex literal — the latter is fragile to escape backslashes
    // and the test's intent is to catch accidental removal of the
    // widening, not to pin syntax verbatim.
    it('dropzone-drag-paste.test.ts AC18f regex is widened to accept explicit form', () => {
      expect(dropzoneDragPasteTest).toMatch(/\(\?:\\\.\\\w\+\)\*/);
    });
  });

  describe('AC19o: oversize branch carries no File reference', () => {
    it('the { kind: "oversize" } literal in onaccept union has no `file:` field', () => {
      // Find the oversize literal type block by walking the union.
      // The pattern: `{ kind: 'oversize'; size: number; cap: number }`
      // — no `file` field inside the braces.
      const oversizeMatch = dropzoneSource.match(
        /\{\s*kind\s*:\s*['"]oversize['"]\s*;[^}]*\}/,
      );
      expect(oversizeMatch).not.toBeNull();
      if (oversizeMatch) {
        // Within the oversize literal, assert no `file:` field.
        expect(oversizeMatch[0]).not.toMatch(/\bfile\s*:/);
      }
    });
  });
});
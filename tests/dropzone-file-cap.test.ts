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
const typesPath = join(repoRoot, 'src', 'lib', 'types.ts');

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
  const types = readFileSync(typesPath, 'utf8');

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
      // The negated `[^}]*` (not `[\s\S]*?`) anchors each pattern to the
      // literal's closing `}` — the pattern CANNOT cross into the next
      // union member. This prevents the AC19o regression where a
      // malformed oversize literal that ALSO carries `file:` would
      // still match the AC19a positive pin (Review #1 blind-hunter
      // finding).
      expect(fileSizeCapSource).toMatch(
        /\{\s*kind\s*:\s*['"]ok['"]\s*;[^}]*file\s*:\s*File[^}]*\}/,
      );
      expect(fileSizeCapSource).toMatch(
        /\{\s*kind\s*:\s*['"]oversize['"]\s*;[^}]*size\s*:\s*number[^}]*cap\s*:\s*number[^}]*\}/,
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
      const input = fakeFile(MAX_FILE_SIZE_BYTES);
      const result = assertWithinFileCap(input as unknown as File);
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        // Review #2 (coderabbit) finding: the cap module's docblock
        // promises "the `ok` branch carries the `File` by value
        // (not by reference into `input.files`)". Pin identity
        // preservation: the returned `file` MUST be the same
        // reference as the input — a regression that wrapped the
        // file in a new object (or returned a different File)
        // would break S03.7's reducer contract.
        expect(result.file).toBe(input as unknown as File);
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

    it('assertWithinFileCap returns { kind: "ok" } for size 0 (Review #1 verification-gap)', async () => {
      // Review #1 finding: AC19c pins size=0 for isWithinFileCap but
      // NOT for assertWithinFileCap. Spec line 91 lists size=0 as a
      // boundary case; the discriminated-union function should mirror.
      const { assertWithinFileCap } = await import('../src/lib/file-size-cap');
      const input = fakeFile(0);
      const result = assertWithinFileCap(input as unknown as File);
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        // Review #2 identity pin (same as the boundary test).
        expect(result.file).toBe(input as unknown as File);
      }
    });

    it('assertWithinFileCap returns { kind: "oversize" } for 200 MB (Review #1 verification-gap)', async () => {
      // Review #1 finding: AC19c pins 200MB for isWithinFileCap but
      // not for assertWithinFileCap.
      const { assertWithinFileCap } = await import('../src/lib/file-size-cap');
      const result = assertWithinFileCap(fakeFile(200 * 1024 * 1024) as unknown as File);
      expect(result.kind).toBe('oversize');
      if (result.kind === 'oversize') {
        expect(result.size).toBe(200 * 1024 * 1024);
        expect(result.cap).toBe(50 * 1024 * 1024);
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
      // Review #1 finding (verification-gap): the original test's
      // `slice` arithmetic was tautological — `returnIdx` could be
      // positive even if the drop emit was absent (the slice fallback
      // to `undefined` end-index made the window unbounded). Tighten:
      // assert all three positions in the FULL body (no slice math),
      // assert ordering oversizeIdx < returnIdx < dropIdx (the return
      // sits between the oversize emit and the under-cap emit — so
      // the under-cap emit is unreachable from the oversize branch).
      const oversizeIdx = body.search(
        /onaccept\?\.\(\{\s*kind:\s*['"]oversize['"]\s*,\s*size:\s*result\.size\s*,\s*cap:\s*result\.cap\s*\}\)/,
      );
      const returnIdx = body.indexOf('return', oversizeIdx);
      const dropIdx = body.search(
        /onaccept\?\.\(\{\s*kind:\s*['"]drop['"]\s*,\s*file:\s*result\.file\s*\}\)/,
      );
      expect(oversizeIdx).toBeGreaterThan(-1);
      expect(returnIdx).toBeGreaterThan(oversizeIdx);
      expect(dropIdx).toBeGreaterThan(returnIdx);
    });
  });

  describe('AC19g: handlePickerChange declared AND bound to template (S03.7 inverted boundary)', () => {
    // S03.3 declared the function but did NOT bind it (the binding
    // was S03.7's scope, signalled via the `void handlePickerChange;`
    // suppression line). S03.7 inverts BOTH pins: the function is
    // still declared, AND the template binding now exists. The
    // S03.3 placeholder suppression line is removed.
    it('dropzone declares handlePickerChange in the script block', () => {
      expect(dropzoneSource).toMatch(/\bfunction\s+handlePickerChange\s*\(/);
    });
    it('dropzone DOES bind onchange={handlePickerChange} on the <input type="file"> (S03.7 wiring)', () => {
      // The S03.7 surface: the binding is the picker change handler.
      // S03.3 only declared the function; S03.7 wires it.
      expect(dropzoneSource).toMatch(
        /<input\b[^>]*\bonchange\s*=\s*\{\s*handlePickerChange\s*\}/,
      );
    });
    it('dropzone has NO `void handlePickerChange;` suppression line (S03.3 placeholder removed)', () => {
      // S03.3 added `void handlePickerChange;` to silence svelte-check's
      // "declared but never read" warning until S03.7 wired the binding.
      // S03.7 removes the suppression line because the binding uses the
      // function (svelte-check no longer warns).
      expect(dropzoneSource).not.toMatch(/\bvoid\s+handlePickerChange\b/);
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

  describe('AC19m: App.svelte boundary pins (S03.3 boundary; S03.4 inverted)', () => {
    // S03.4 (aria-live announcement surface) is the FIRST story to
    // wire the App.svelte <Dropzone onaccept={handleAccept} /> consumer.
    // S03.3's AC19m asserted App.svelte renders <Dropzone /> bare
    // (no onaccept) AND App.svelte does not mention "oversize"
    // (premature reducer wiring). S03.4 INVERTS both — App.svelte
    // wires onaccept={handleAccept} (handleAccept's discriminated-
    // union parameter type includes `{ kind: 'oversize'; size: number;
    // cap: number }`).
    //
    // Review #1 (verification-gap) tightened the inverted assertions:
    // the original "App.svelte does pass onaccept" was a regex
    // (`/\boversize\b/` etc.) that matched the prop-type DECLARATION
    // in Dropzone.svelte, not just App.svelte's actual usage. The
    // tightened form asserts the EXACT binding form (the literal
    // `onaccept={handleAccept}`) and the OVERSIZE token appears
    // in App.svelte's source (not just anywhere).
    //
    // Why preserve the block? The per-story test surface is preserved
    // across the E03 stories for regression tracking (see S03.2 AC18o
    // / S03.4 AC20j "prior-story boundary pins preserved" pattern).
    // The block stays; the assertions flip.
    it('App.svelte DOES pass onaccept={handleAccept} to <Dropzone> (S03.4 inverted boundary)', () => {
      // Tightened: assert the EXACT binding form. The S03.3 form
      // (`app.toMatch(/<Dropzone\b[^>]*\bonaccept\b/)`) is too
      // permissive — it would match a future `<Dropzone onaccept={foo}>`
      // with a renamed handler.
      expect(app).toMatch(/<Dropzone\b[^>]*\bonaccept\s*=\s*\{\s*handleAccept\s*\}/);
    });
    it('App.svelte DOES mention "oversize" (S03.4 inverted boundary; handleAccept parameter union)', () => {
      // The S03.4 inverted boundary: handleAccept's parameter type
      // union includes the oversize branch.
      expect(appSource).toMatch(/\boversize\b/);
    });
    it('App.svelte handleAccept has an explicit early-return on the oversize branch (S03.4 inverted boundary)', () => {
      // Tightened: the S03.4 implementation's defensive no-op pattern.
      // The "oversize" keyword alone is too permissive — it could
      // appear in a comment without the defensive early-return.
      const body = (() => {
        const sigMatch = /function\s+handleAccept\s*\(/.exec(appSource);
        if (!sigMatch) return '';
        let i = sigMatch.index + sigMatch[0].length;
        let depth = 1;
        while (i < appSource.length && depth > 0) {
          const ch = appSource[i];
          if (ch === '(') depth++;
          else if (ch === ')') depth--;
          i++;
        }
        while (i < appSource.length && /\s/.test(appSource[i])) i++;
        if (appSource[i] === ':') {
          while (i < appSource.length && appSource[i] !== '{') i++;
        }
        if (appSource[i] !== '{') return '';
        const bodyStart = i + 1;
        let braceDepth = 1;
        let j = bodyStart;
        while (j < appSource.length && braceDepth > 0) {
          const ch = appSource[j];
          if (ch === '{') braceDepth++;
          else if (ch === '}') braceDepth--;
          if (braceDepth > 0) j++;
        }
        return appSource.slice(bodyStart, j);
      })();
      expect(body).toMatch(
        /if\s*\(\s*source\.kind\s*===\s*['"]oversize['"]\s*\)\s*return\s*;/,
      );
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
    // Review #1 (verification-gap + blind-hunter both flagged the
    // prior pin as brittle): a substring match on a regex fragment
    // is fragile. Tightened: (a) verify the S03.2 test source
    // contains the structural widening marker (`(?:\.\w+)*`), AND
    // (b) build the SAME widened regex the S03.2 test uses (the
    // pattern now in source), then run it against both the S03.2
    // shorthand and the S03.3 explicit form. Both must match — the
    // widening is functional, not just syntactic.
    it('dropzone-drag-paste.test.ts AC18f regex is widened to accept explicit form', () => {
      // (a) Structural check: the S03.2 test source contains the
      // dotted-identifier chain `(?:\.\w+)*` — the widening marker.
      // Without this chain, the regex is the S03.2 narrow form.
      expect(dropzoneDragPasteTest).toMatch(/\(\?:\\\.\\w\+\)\*/);
      // (b) Functional check: build the SAME widened regex the S03.2
      // test now uses (the pattern in source) and verify it matches
      // both forms. The widening's load-bearing property: BOTH the
      // S03.2 shorthand AND the S03.3 explicit form match.
      // The pattern source — same as the regex literal in
      // tests/dropzone-drag-paste.test.ts AC18f.
      const widened = new RegExp(
        [
          'onaccept\\?\\.\\(\\{',
          '\\s*kind:\\s*[\'"]drop[\'"]',
          '\\s*,\\s*',
          'file(?:\\s*:\\s*\\w+(?:\\.\\w+)*)?',
          '\\s*\\}\\)',
        ].join(''),
      );
      expect(widened.test("onaccept?.({ kind: 'drop', file })")).toBe(true);
      expect(widened.test("onaccept?.({ kind: 'drop', file: result.file })")).toBe(true);
      // Belt-and-braces: a regex that ONLY matches the explicit form
      // would pass the second assertion but fail the first. Both
      // must match.
      expect(widened.test("onaccept?.({ kind: 'drop', file })")).toBe(true);
      // Deepening check (Review #2 coderabbit): the widening's
      // `(?:\.\w+)*` chain accepts arbitrary-depth dotted identifiers,
      // not just two-deep. A future contributor narrowing the chain
      // to `(?:\.\w+)?` (exactly one dot) would fail this.
      expect(widened.test("onaccept?.({ kind: 'drop', file: a.b.c })")).toBe(true);
    });
  });

  describe('AC19o: oversize branch carries no File reference (S03.7 re-scopes to types.ts)', () => {
    // S03.3's pin regexed Dropzone.svelte's in-source union literal.
    // S03.7 extracts the union to src/lib/types.ts (the
    // `OnAcceptSource` type) — the literal no longer lives in
    // Dropzone.svelte. The pin re-scopes to types.ts and asserts
    // the oversize branch there has no `file:` field. E05's
    // future reducer (S05.x) imports this exact type and relies
    // on the invariant.
    it('the { kind: "oversize" } literal in OnAcceptSource (types.ts) has no `file:` field', () => {
      const oversizeMatch = types.match(
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
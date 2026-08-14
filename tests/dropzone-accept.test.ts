import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const dropzonePath = join(repoRoot, 'src', 'components', 'Dropzone.svelte');
const appPath = join(repoRoot, 'src', 'App.svelte');
const typesPath = join(repoRoot, 'src', 'lib', 'types.ts');
const reducerPath = join(repoRoot, 'src', 'lib', 'reducer.svelte.ts');
const appCssPath = join(repoRoot, 'src', 'styles', 'app.css');
const dropzoneTestPath = join(repoRoot, 'tests', 'dropzone.test.ts');
const dropzoneDragPasteTestPath = join(repoRoot, 'tests', 'dropzone-drag-paste.test.ts');
const dropzoneFileCapTestPath = join(repoRoot, 'tests', 'dropzone-file-cap.test.ts');
const dropzoneAriaLiveTestPath = join(repoRoot, 'tests', 'dropzone-aria-live.test.ts');
const dropzoneEmptyStateTestPath = join(repoRoot, 'tests', 'dropzone-empty-state.test.ts');

/**
 * S03.7 — Accept path emits a File reference to the reducer test gate.
 *
 * S03.1-S03.6 shipped the visible empty-state surface + the gesture
 * verbs (drag-drop + paste + picker change). S03.7 lands the typed
 * boundary between the dropzone's accept path and the reducer-shell:
 *
 *   - src/lib/types.ts (NEW): OnAcceptSource discriminated union.
 *     Both Dropzone.svelte and App.svelte import from it.
 *   - src/lib/reducer.svelte.ts (NEW): createReducer() factory
 *     returning { state, dispatch }; state is a Svelte 5 $state
 *     rune; dispatch({ kind: 'accept', source }) transitions
 *     empty → active on drop/paste, stays at empty on oversize.
 *   - src/components/Dropzone.svelte: <input onchange={handlePickerChange}>
 *     binding lands (S03.3 placeholder `void handlePickerChange;`
 *     suppression line is removed). onaccept prop type is
 *     OnAcceptSource.
 *   - src/App.svelte: handleAccept dispatches to the reducer AND
 *     continues the S03.4 aria-live announcement. handleAccept
 *     parameter type is OnAcceptSource (extracted from the
 *     S03.4 in-source union).
 *
 * E05's S05.3a-S05.3c will widen the reducer's AppState union with
 * the rest of the state machine; S03.7 ships the typed shell only.
 * The reducer does NOT read the file (Privacy Baseline + AD-2
 * streaming). E06's parser will eventually subscribe and consume
 * the bytes via file.stream().
 *
 * Every AC23a–AC23f assertion is checked at `npm test` time. The
 * production files are read as text and asserted for shape; the
 * reducer-shell is tested at vitest runtime via the import of
 * `createReducer` from `./helpers/reducer` (the production module
 * path is `src/lib/reducer.svelte.ts` but vitest's alias map
 * resolves it the same way Vite does — see vitest.config.ts).
 */
describe('dropzone-accept (S03.7 accept path emits a File reference to the reducer; OnAcceptSource extracted to src/lib/types.ts; createReducer() factory)', () => {
  const dropzone = readFileSync(dropzonePath, 'utf8');
  const app = readFileSync(appPath, 'utf8');
  const types = readFileSync(typesPath, 'utf8');
  const reducer = readFileSync(reducerPath, 'utf8');
  const appCss = readFileSync(appCssPath, 'utf8');
  const dropzoneTest = readFileSync(dropzoneTestPath, 'utf8');
  const dropzoneDragPasteTest = readFileSync(dropzoneDragPasteTestPath, 'utf8');
  const dropzoneFileCapTest = readFileSync(dropzoneFileCapTestPath, 'utf8');
  const dropzoneAriaLiveTest = readFileSync(dropzoneAriaLiveTestPath, 'utf8');
  const dropzoneEmptyStateTest = readFileSync(dropzoneEmptyStateTestPath, 'utf8');

  // Strip block + line + HTML comments so documenting comments
  // don't false-positive on forbidden-pattern scans. Mirrors the
  // E03 test-file convention (S03.1-S03.6 all use this helper).
  const stripComments = (s: string): string =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/<!--[\s\S]*?-->/g, '');

  const dropzoneSource = stripComments(dropzone);
  const appSource = stripComments(app);
  const typesSource = stripComments(types);
  const reducerSource = stripComments(reducer);
  const appCssSource = stripComments(appCss);

  describe('AC23a: <input onchange={handlePickerChange}> binding in Dropzone.svelte', () => {
    it('Dropzone.svelte DOES bind onchange={handlePickerChange} on the <input> (S03.7 wiring)', () => {
      // The S03.3 placeholder suppression line (`void handlePickerChange;`)
      // is removed; the function is now referenced from the template,
      // satisfying the svelte-check "used" check.
      expect(dropzoneSource).toMatch(
        /<input\b[^>]*\bonchange\s*=\s*\{\s*handlePickerChange\s*\}/,
      );
    });
    it('the onchange attribute appears on the same <input> as id="file-input" + type="file"', () => {
      // The onchange binding is on the SAME <input> that has
      // id="file-input" (the picker target). A regression that
      // adds a second <input> and binds onchange to it (instead
      // of the file input) would fail this pin.
      const inputMatch = dropzoneSource.match(
        /<input\b[^>]*\bid\s*=\s*["']file-input["'][\s\S]*?\/>/,
      );
      expect(inputMatch).not.toBeNull();
      expect(inputMatch![0]).toMatch(/\bonchange\s*=\s*\{\s*handlePickerChange\s*\}/);
      expect(inputMatch![0]).toMatch(/\btype\s*=\s*["']file["']/);
      expect(inputMatch![0]).toMatch(/\baccept\s*=\s*["'][^"']*csv[^"']*["']/);
    });
    it('the S03.3 placeholder `void handlePickerChange;` suppression line is REMOVED', () => {
      // S03.3 added `void handlePickerChange;` to silence svelte-check's
      // "declared but never read" warning until S03.7 wired the
      // binding. S03.7 removes the suppression line because the
      // template binding uses the function.
      expect(dropzoneSource).not.toMatch(/\bvoid\s+handlePickerChange\b/);
    });
    it('handlePickerChange still routes through assertWithinFileCap (S03.3 cap-gate preserved)', () => {
      // The S03.7 binding is additive — the cap gate stays. The
      // function body still calls assertWithinFileCap; without it,
      // over-cap files via the picker path would bypass the gate.
      expect(dropzoneSource).toMatch(/\bfunction\s+handlePickerChange\s*\([\s\S]*?\bassertWithinFileCap\s*\(/);
    });
  });

  describe('AC23b: OnAcceptSource discriminated-union type extracted to src/lib/types.ts', () => {
    it('src/lib/types.ts EXISTS and exports OnAcceptSource', () => {
      expect(types).toMatch(/\bexport\s+type\s+OnAcceptSource\b/);
    });
    it('OnAcceptSource includes the { kind: "drop"; file: File } member', () => {
      expect(typesSource).toMatch(/\{\s*kind\s*:\s*['"]drop['"]\s*;\s*file\s*:\s*File\s*\}/);
    });
    it('OnAcceptSource includes the { kind: "paste"; text: string; filename?: string } member', () => {
      expect(typesSource).toMatch(
        /\{\s*kind\s*:\s*['"]paste['"]\s*;\s*text\s*:\s*string\s*;\s*filename\s*\?\s*:\s*string\s*\}/,
      );
    });
    it('OnAcceptSource includes the { kind: "oversize"; size: number; cap: number } member', () => {
      expect(typesSource).toMatch(
        /\{\s*kind\s*:\s*['"]oversize['"]\s*;\s*size\s*:\s*number\s*;\s*cap\s*:\s*number\s*\}/,
      );
    });
    it('Dropzone.svelte imports OnAcceptSource from "../lib/types" (no duplicated union)', () => {
      // S03.7 extracts the union — Dropzone.svelte imports it
      // instead of redeclaring it. The duplicated-parameter-type
      // risk S03.4's docblock warned about is gone.
      expect(dropzoneSource).toMatch(
        /import\s+type\s*\{\s*OnAcceptSource\s*\}\s*from\s*['"]\.\.\/lib\/types['"]/,
      );
    });
    it('Dropzone.svelte onaccept prop type uses OnAcceptSource (canonical type)', () => {
      expect(dropzoneSource).toMatch(
        /\bonaccept\s*\?\s*:\s*\(\s*source\s*:\s*OnAcceptSource\s*\)\s*=>\s*void/,
      );
    });
    it('App.svelte imports OnAcceptSource from "./lib/types" (no duplicated union)', () => {
      expect(appSource).toMatch(
        /import\s+type\s*\{\s*OnAcceptSource\s*\}\s*from\s*['"]\.\/lib\/types['"]/,
      );
    });
    it('App.svelte handleAccept parameter type uses OnAcceptSource (canonical type)', () => {
      expect(appSource).toMatch(
        /\bfunction\s+handleAccept\s*\(\s*source\s*:\s*OnAcceptSource\s*\)/,
      );
    });
    it('the raw `| { kind: \'drop\'; file: File }` literal does NOT appear in Dropzone.svelte (union lives in types.ts)', () => {
      // Defense against regression: a future edit that copies
      // the union back into Dropzone.svelte (creating the
      // duplicated-type risk S03.7 removed) fails this pin.
      expect(dropzoneSource).not.toMatch(
        /\|\s*\{\s*kind\s*:\s*['"]drop['"]\s*;\s*file\s*:\s*File\s*\}/,
      );
    });
    it('the raw `| { kind: \'oversize\'; size: number; cap: number }` literal does NOT appear in App.svelte (union lives in types.ts)', () => {
      // Same defense for App.svelte: the union literal lives
      // ONLY in types.ts.
      expect(appSource).not.toMatch(
        /\|\s*\{\s*kind\s*:\s*['"]oversize['"]\s*;\s*size\s*:\s*number\s*;\s*cap\s*:\s*number\s*\}/,
      );
    });
  });

  describe('AC23c: src/lib/reducer.svelte.ts reducer-shell', () => {
    it('src/lib/reducer.svelte.ts EXISTS', () => {
      // The file must exist; the path uses .svelte.ts so the $state
      // rune is available at module scope (Svelte 5 convention).
      expect(reducer).toBeTruthy();
      expect(reducer.length).toBeGreaterThan(0);
    });
    it('reducer exports AppState type (discriminated union with phase: "empty" | "active")', () => {
      expect(reducerSource).toMatch(/\bexport\s+type\s+AppState\b/);
      // NOTE: no trailing \b after the quote — both '\'' and the
      // following char are non-word, so \b would not match.
      expect(reducerSource).toMatch(/\bphase\s*:\s*['"]empty['"]/);
      expect(reducerSource).toMatch(/\bphase\s*:\s*['"]active['"]/);
    });
    it('reducer exports ReducerAction type with { kind: "accept"; source: OnAcceptSource }', () => {
      expect(reducerSource).toMatch(/\bexport\s+type\s+ReducerAction\b/);
      expect(reducerSource).toMatch(
        /\{\s*kind\s*:\s*['"]accept['"]\s*;\s*source\s*:\s*OnAcceptSource\s*\}/,
      );
    });
    it('reducer exports createReducer() factory returning { state, dispatch }', () => {
      expect(reducerSource).toMatch(
        /\bexport\s+function\s+createReducer\s*\(\s*\)\s*:\s*\{[\s\S]*?\bstate\s*:\s*AppState\b[\s\S]*?\bdispatch\s*:\s*\([\s\S]*?\)\s*=>\s*void/,
      );
    });
    it('createReducer() initializes state to { phase: "empty" }', () => {
      // The factory must initialise state to `empty` — the
      // pre-accept state. A regression that initialises to
      // `active` would skip the empty phase and break the
      // state machine.
      expect(reducerSource).toMatch(/\$state\s*<\s*AppState\s*>\s*\(\s*\{\s*phase\s*:\s*['"]empty['"]\s*\}\s*\)/);
    });
    it('dispatch({ kind: "accept", source }) transitions empty → active on drop', () => {
      // The dispatch body's drop branch sets state to
      // { phase: 'active', file: source.file, source }.
      expect(reducerSource).toMatch(
        /state\s*=\s*\{\s*phase\s*:\s*['"]active['"]\s*,\s*file\s*:\s*action\.source\.file\s*,\s*source\s*:\s*action\.source\s*\}/,
      );
    });
    it('dispatch({ kind: "accept", source: { kind: "oversize" } }) is a NO-OP (state stays at empty)', () => {
      // The oversize branch early-returns WITHOUT touching state.
      // The pin: the dispatch body has an explicit oversize branch
      // with `return;` (or equivalent) and no state assignment.
      const oversizeMatch = reducerSource.match(
        /if\s*\(\s*action\.source\.kind\s*===\s*['"]oversize['"]\s*\)\s*\{[\s\S]*?\}/,
      );
      expect(oversizeMatch).not.toBeNull();
      // The oversize branch must NOT contain a state assignment.
      expect(oversizeMatch![0]).not.toMatch(/\bstate\s*=/);
    });
    it('reducer does NOT read the file (Privacy Baseline — no file.text / arrayBuffer / stream / FileReader)', () => {
      // The reducer holds the File reference on the heap; no
      // read happens. E06's parser will consume the bytes.
      expect(reducerSource).not.toMatch(/\bfile\.text\s*\(/);
      expect(reducerSource).not.toMatch(/\bfile\.arrayBuffer\s*\(/);
      expect(reducerSource).not.toMatch(/\bfile\.stream\s*\(/);
      expect(reducerSource).not.toMatch(/\bFileReader\b/);
      expect(reducerSource).not.toMatch(/\breadAsText\b/);
      expect(reducerSource).not.toMatch(/\breadAsArrayBuffer\b/);
    });
    it('reducer\'s paste branch synthesises a File via new Blob + new File (in-memory)', () => {
      // The paste branch creates a Blob from the text, wraps it
      // in a File (MIME type "text/csv", default filename
      // "pasted.csv"). The Blob + File constructors are local
      // in-memory APIs (not network primitives).
      expect(reducerSource).toMatch(/\bnew\s+Blob\s*\(\s*\[\s*action\.source\.text\s*\]\s*,\s*\{\s*type\s*:\s*['"]text\/csv['"]\s*\}\s*\)/);
      expect(reducerSource).toMatch(/\bnew\s+File\s*\(/);
    });
  });

  describe('AC23d: App.svelte dispatches to the reducer on accept', () => {
    it('App.svelte imports createReducer from "./lib/reducer.svelte"', () => {
      // The reducer is in src/lib/reducer.svelte.ts (the .svelte.ts
      // suffix is required for $state rune support). Vite + vitest
      // both resolve the path; the import uses the full filename.
      expect(appSource).toMatch(
        /import\s*\{\s*createReducer\s*\}\s*from\s*['"]\.\/lib\/reducer\.svelte['"]/,
      );
    });
    it('App.svelte creates a reducer instance (createReducer() call)', () => {
      // The reducer is created once per App.svelte mount. The
      // factory call's return value is the { state, dispatch }
      // instance consumed by handleAccept.
      expect(appSource).toMatch(/\bcreateReducer\s*\(\s*\)/);
    });
    it('handleAccept calls reducer.dispatch({ kind: "accept", source }) BEFORE the aria-live announcement', () => {
      // The dispatch ordering is load-bearing — state must
      // capture before the announcement. A race-condition
      // regression that announces before the state transition
      // fails this pin.
      const handleAcceptBody = (() => {
        // Match the function signature including the parameter
        // type annotation (TypeScript `: SourceType`). The
        // trailing `\s*:\s*\w+\s*` consumes the return type
        // annotation (`: void`). The simple bracket-walk that
        // counts parens is too fragile for TypeScript signatures.
        const sigMatch = /\bfunction\s+handleAccept\s*\(source\s*:\s*OnAcceptSource\s*\)\s*:\s*void\s*\{/.exec(appSource);
        if (!sigMatch) return '';
        const bodyStart = sigMatch.index + sigMatch[0].length;
        let braceDepth = 1;
        let j = bodyStart;
        while (j < appSource.length && braceDepth > 0) {
          if (appSource[j] === '{') braceDepth++;
          else if (appSource[j] === '}') braceDepth--;
          if (braceDepth > 0) j++;
        }
        return appSource.slice(bodyStart, j);
      })();
      // The dispatch call appears in the body.
      expect(handleAcceptBody).toMatch(
        /reducer\.dispatch\s*\(\s*\{\s*kind\s*:\s*['"]accept['"]\s*,\s*source\s*\}\s*\)/,
      );
      // The dispatch's index in the body comes before the
      // liveAnnouncement assignment's index.
      const dispatchIdx = handleAcceptBody.search(/reducer\.dispatch/);
      const announcementIdx = handleAcceptBody.search(/\bliveAnnouncement\s*=/);
      expect(dispatchIdx).toBeGreaterThan(-1);
      expect(announcementIdx).toBeGreaterThan(-1);
      expect(dispatchIdx).toBeLessThan(announcementIdx);
    });
    it('handleAccept still has the S03.4 early-return on oversize (defensive no-op preserved)', () => {
      // The S03.4 aria-live announcement's defensive early-return
      // on the oversize branch is preserved through the dispatch
      // wiring. The dispatch itself is a no-op on oversize
      // (reducer early-returns); the aria-live region does not
      // need to announce (S03.4 contract — S03.9 will wire the
      // strict-brief formatter for the over-cap rejection
      // surface).
      const handleAcceptBody = (() => {
        const sigMatch = /\bfunction\s+handleAccept\s*\(source\s*:\s*OnAcceptSource\s*\)\s*:\s*void\s*\{/.exec(appSource);
        if (!sigMatch) return '';
        const bodyStart = sigMatch.index + sigMatch[0].length;
        let braceDepth = 1;
        let j = bodyStart;
        while (j < appSource.length && braceDepth > 0) {
          if (appSource[j] === '{') braceDepth++;
          else if (appSource[j] === '}') braceDepth--;
          if (braceDepth > 0) j++;
        }
        return appSource.slice(bodyStart, j);
      })();
      expect(handleAcceptBody).toMatch(
        /if\s*\(\s*source\.kind\s*===\s*['"]oversize['"]\s*\)\s*return\s*;/,
      );
    });
  });

  describe('AC23e: Privacy Baseline + AD-8 (zero hex literals, zero forbidden source patterns)', () => {
    it('App.svelte contains no hex color literal (AD-8 — preserved against S03.6)', () => {
      expect(appSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
    it('app.css contains no hex color literal (AD-8 — preserved against S03.6)', () => {
      expect(appCssSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
    it('Dropzone.svelte contains no hex color literal (AD-8 — preserved against S03.3)', () => {
      expect(dropzoneSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
    it('types.ts contains no hex color literal (AD-8 — new module is token-disciplined)', () => {
      expect(typesSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
    it('reducer.svelte.ts contains no hex color literal (AD-8 — new module)', () => {
      expect(reducerSource).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
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
      it(`types.ts source does NOT contain ${label}`, () => {
        expect(typesSource).not.toMatch(regex);
      });
      it(`reducer.svelte.ts source does NOT contain ${label}`, () => {
        expect(reducerSource).not.toMatch(regex);
      });
      it(`App.svelte source does NOT contain ${label}`, () => {
        expect(appSource).not.toMatch(regex);
      });
      it(`Dropzone.svelte source does NOT contain ${label}`, () => {
        expect(dropzoneSource).not.toMatch(regex);
      });
    }
  });

  describe('AC23f: prior-story boundary pins preserved (S03.1 + S03.2 + S03.3 + S03.4 + S03.5 + S03.6)', () => {
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
    it('tests/dropzone-empty-state.test.ts (S03.5/S03.6) still exists with its description string', () => {
      expect(dropzoneEmptyStateTest).toMatch(/dropzone-empty-state \(S03\.5/);
    });
    it('the S03.3 AC19m App.svelte boundary pins (onaccept={handleAccept} binding + oversize early-return) still pass', () => {
      // S03.7 is additive — the S03.3 inverted boundary pins
      // (App.svelte DOES pass onaccept={handleAccept}, mentions
      // "oversize", has an explicit early-return on the oversize
      // branch) must still hold. The handleAccept body now also
      // has the reducer dispatch; the early-return on oversize
      // is preserved.
      expect(app).toMatch(/<Dropzone\b[^>]*\bonaccept\s*=\s*\{\s*handleAccept\s*\}/);
      expect(appSource).toMatch(/\boversize\b/);
      const handleAcceptBody = (() => {
        // Match the full signature including the parameter type
        // annotation and the return type annotation (TypeScript
        // `: void`). The simple bracket-walk that counts parens
        // is too fragile for TypeScript signatures.
        const sigMatch = /\bfunction\s+handleAccept\s*\(source\s*:\s*OnAcceptSource\s*\)\s*:\s*void\s*\{/.exec(appSource);
        if (!sigMatch) return '';
        const bodyStart = sigMatch.index + sigMatch[0].length;
        let braceDepth = 1;
        let j = bodyStart;
        while (j < appSource.length && braceDepth > 0) {
          if (appSource[j] === '{') braceDepth++;
          else if (appSource[j] === '}') braceDepth--;
          if (braceDepth > 0) j++;
        }
        return appSource.slice(bodyStart, j);
      })();
      expect(handleAcceptBody).toMatch(
        /if\s*\(\s*source\.kind\s*===\s*['"]oversize['"]\s*\)\s*return\s*;/,
      );
    });
  });
});
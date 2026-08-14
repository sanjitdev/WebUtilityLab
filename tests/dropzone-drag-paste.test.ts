import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const dropzonePath = join(repoRoot, 'src', 'components', 'Dropzone.svelte');
const appPath = join(repoRoot, 'src', 'App.svelte');
const dropzoneTestPath = join(repoRoot, 'tests', 'dropzone.test.ts');
const pageChromeTestPath = join(repoRoot, 'tests', 'page-chrome.test.ts');
const themeToggleTestPath = join(repoRoot, 'tests', 'theme-toggle.test.ts');
const focusRingTestPath = join(repoRoot, 'tests', 'focus-ring.test.ts');
const editorialPostureTestPath = join(repoRoot, 'tests', 'editorial-posture.test.ts');

/**
 * S03.2 — Dropzone drag-and-drop + paste handler test gate.
 *
 * S03.1 shipped the visual chrome + the picker-opening gesture.
 * S03.2 wires the dragenter/dragover/dragleave/drop handlers and the
 * window-level paste handler, surfaces the accepted file or text via
 * an `onaccept` callback prop. S03.2 ships with `onaccept` UNBOUND
 * — App.svelte does not pass a callback (the AC18n boundary pin).
 * S03.7 wires the reducer consumer.
 *
 * Every AC18a–AC18o assertion is checked at `npm test` time. The
 * component is structurally a Svelte 5 file; the test reads it as
 * text and asserts shape, not runtime behavior (the runtime claim —
 * drag-onto-dropzone triggers preventDefault, paste-on-window
 * surfaces text via the callback — is verified separately by manual
 * DevTools passes documented in the story).
 */
describe('dropzone-drag-paste (S03.2 drag-and-drop + paste handlers, onaccept unbound)', () => {
  const dropzone = readFileSync(dropzonePath, 'utf8');
  const app = readFileSync(appPath, 'utf8');
  const dropzoneTest = readFileSync(dropzoneTestPath, 'utf8');
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
  // `tests/dropzone.test.ts:62` — used for every positional /
  // "this element is not present" assertion.
  const appSource = stripComments(app);

  // Extract a named function's body (named `function name(...) { ... }`)
  // from `dropzoneSource` via brace-depth scanning. Returns '' if not
  // found. The handlers are annotated with TS return types
  // (`function handleX(event: DragEvent): void { … }`), so a simple
  // regex can't reliably capture the body across all four handlers;
  // we walk the string by hand.
  const extractFunctionBody = (source: string, name: string): string => {
    const signature = `function\\s+${name}\\s*\\(`;
    const sigMatch = new RegExp(signature).exec(source);
    if (!sigMatch) return '';
    // Walk forward from the start of the function name to find the
    // opening `{` of the body. We must skip over the parameter list
    // (which can contain parens in TS types, e.g. `Array<() => void>`,
    // though our handlers don't), and any return-type annotation
    // (`: void`, `: File | null`, etc.).
    let i = sigMatch.index + sigMatch[0].length;
    // Track paren depth so we skip past the parameter list.
    let depth = 1;
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      i++;
    }
    // Now we're at the char right after the closing `)`. Skip
    // whitespace and the optional return-type annotation
    // (e.g. `: void`, `: File | null`).
    while (i < source.length && /\s/.test(source[i])) i++;
    if (source[i] === ':') {
      // Skip the return-type annotation: read until we hit `{`.
      while (i < source.length && source[i] !== '{') i++;
    }
    if (source[i] !== '{') return '';
    const bodyStart = i + 1;
    // Walk forward, tracking brace depth, until we close the body.
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

  describe('AC18a: drag handlers attached to button, not window', () => {
    it('template binds ondragenter on the <button class="dropzone">', () => {
      expect(dropzone).toMatch(/\bondragenter\s*=\s*\{\s*handleDragEnter\s*\}/);
    });
    it('template binds ondragover on the <button class="dropzone">', () => {
      expect(dropzone).toMatch(/\bondragover\s*=\s*\{\s*handleDragOver\s*\}/);
    });
    it('template binds ondragleave on the <button class="dropzone">', () => {
      expect(dropzone).toMatch(/\bondragleave\s*=\s*\{\s*handleDragLeave\s*\}/);
    });
    it('template binds ondrop on the <button class="dropzone">', () => {
      expect(dropzone).toMatch(/\bondrop\s*=\s*\{\s*handleDrop\s*\}/);
    });
    it('all four ondrag* bindings appear inside the <button class="dropzone"> element (M1)', () => {
      // The substring checks above only confirm presence anywhere in
      // the file. This scoped check captures the <button ...> opening
      // tag up to its matching closing `>` and asserts each binding
      // appears in that span — preventing a future contributor from
      // moving the bindings off the button (e.g., to a sibling <div>).
      const buttonOpen = /<button\b[^>]*>/.exec(dropzone);
      expect(buttonOpen, '<button class="dropzone"> element not found').not.toBeNull();
      const buttonSpan = dropzone.slice(buttonOpen!.index, buttonOpen!.index + buttonOpen![0].length);
      expect(buttonSpan).toMatch(/\bondragenter\s*=/);
      expect(buttonSpan).toMatch(/\bondragover\s*=/);
      expect(buttonSpan).toMatch(/\bondragleave\s*=/);
      expect(buttonSpan).toMatch(/\bondrop\s*=/);
    });
    it('does NOT attach drag listeners at window level', () => {
      // Per AC11: drag handlers are on the button, not window.
      // The paste handler is on window (AC18b), but drag must not be.
      expect(dropzoneSource).not.toMatch(/window\.addEventListener\s*\(\s*['"]drag['"]/);
      expect(dropzoneSource).not.toMatch(/window\.addEventListener\s*\(\s*['"]drop['"]/);
      expect(dropzoneSource).not.toMatch(/document\.addEventListener\s*\(\s*['"]drop['"]/);
    });
  });

  describe('AC18b: paste handler on window, lifecycle-managed (onMount)', () => {
    it('script block imports onMount from svelte', () => {
      expect(dropzone).toMatch(/import\s*\{[^}]*\bonMount\b[^}]*\}\s*from\s*['"]svelte['"]/);
    });
    it('script block uses onMount(...)', () => {
      expect(dropzoneSource).toMatch(/\bonMount\s*\(/);
    });
    it('window.addEventListener("paste", ...) is registered inside onMount', () => {
      expect(dropzoneSource).toMatch(
        /window\.addEventListener\s*\(\s*['"]paste['"]\s*,\s*handlePaste\s*\)/
      );
    });
    it('window.removeEventListener("paste", ...) is registered for cleanup', () => {
      expect(dropzoneSource).toMatch(
        /window\.removeEventListener\s*\(\s*['"]paste['"]\s*,\s*handlePaste\s*\)/
      );
    });
  });

  describe('AC18c: handleDragEnter and handleDragOver both call preventDefault()', () => {
    it('handleDragEnter body contains preventDefault()', () => {
      const body = extractFunctionBody(dropzoneSource, 'handleDragEnter');
      expect(body).toMatch(/preventDefault\s*\(\s*\)/);
    });
    it('handleDragOver body contains preventDefault()', () => {
      const body = extractFunctionBody(dropzoneSource, 'handleDragOver');
      expect(body).toMatch(/preventDefault\s*\(\s*\)/);
    });
    it('handleDragEnter calls preventDefault on the event parameter, not a fresh object (H2)', () => {
      // The bare `preventDefault()` substring check above would match
      // `someOtherObject.preventDefault()`. The real drag-accept
      // contract requires `event.preventDefault()` (the parameter),
      // because Chrome/Firefox only enable `drop` firing when the
      // actual DragEvent has its default cancelled. This assertion
      // catches the "preventDefault on the wrong object" regression.
      const body = extractFunctionBody(dropzoneSource, 'handleDragEnter');
      expect(body).toMatch(/\bevent\.preventDefault\s*\(\s*\)/);
    });
    it('handleDragOver calls preventDefault on the event parameter, not a fresh object (H2)', () => {
      const body = extractFunctionBody(dropzoneSource, 'handleDragOver');
      expect(body).toMatch(/\bevent\.preventDefault\s*\(\s*\)/);
    });
    it('handleDragOver does NOT toggle isDragging (M4 — flicker prevention)', () => {
      // The dragover handler MUST only call preventDefault. Per
      // AC3 + the spec's Verification gap risk (line 183), toggling
      // isDragging in dragover would cause the .is-dragover class to
      // flicker as the cursor moves within the button (Chrome and
      // Firefox fire dragover continuously). The class was set on
      // dragenter; the only handler that clears it is dragleave (and
      // drop, which clears on accept).
      const body = extractFunctionBody(dropzoneSource, 'handleDragOver');
      expect(body, 'handleDragOver must not toggle isDragging').not.toMatch(/\bisDragging\s*=/);
    });
  });

  describe('AC18d: handleDragLeave does NOT call preventDefault; handleDrop does', () => {
    it('handleDragLeave body does NOT contain preventDefault', () => {
      const body = extractFunctionBody(dropzoneSource, 'handleDragLeave');
      expect(body).not.toMatch(/preventDefault/);
    });
    it('handleDrop body DOES contain preventDefault()', () => {
      const body = extractFunctionBody(dropzoneSource, 'handleDrop');
      expect(body).toMatch(/preventDefault\s*\(\s*\)/);
    });
  });

  describe('AC18e: .is-dragover class is toggled by a single boolean state', () => {
    it('declares let isDragging = $state(false)', () => {
      expect(dropzoneSource).toMatch(/\blet\s+isDragging\s*=\s*\$state\s*\(\s*false\s*\)/);
    });
    it('template binds class:is-dragover={isDragging}', () => {
      expect(dropzone).toMatch(/\bclass\s*:\s*is-dragover\s*=\s*\{\s*isDragging\s*\}/);
    });
    it('handleDragEnter body sets isDragging = true (M2 — boolean must be wired)', () => {
      // The declarations above only confirm the boolean and binding
      // exist. Without this check, a contributor could leave the
      // declaration + binding intact while deleting the assignment
      // that flips the state — the class would never appear on the
      // button. Asserts the value-flipping assignment lives in the
      // dragenter handler.
      const body = extractFunctionBody(dropzoneSource, 'handleDragEnter');
      expect(body).toMatch(/\bisDragging\s*=\s*true\b/);
    });
    it('handleDragLeave body sets isDragging = false (M2 — symmetric toggle)', () => {
      const body = extractFunctionBody(dropzoneSource, 'handleDragLeave');
      expect(body).toMatch(/\bisDragging\s*=\s*false\b/);
    });
  });

  describe("AC18f: drop invokes onaccept with { kind: 'drop', file }", () => {
    it('declares onaccept via $props() with a typed source union', () => {
      expect(dropzoneSource).toMatch(/\$props\s*\(\s*\)/);
      expect(dropzoneSource).toMatch(/\bonaccept\b/);
      expect(dropzoneSource).toMatch(/kind\s*:\s*['"]drop['"]/);
      expect(dropzoneSource).toMatch(/kind\s*:\s*['"]paste['"]/);
    });
    it('handleDrop body invokes onaccept with { kind: "drop", file }', () => {
      const body = extractFunctionBody(dropzoneSource, 'handleDrop');
      // Optional chaining `onaccept?.(...)` — escape the `?`.
      // The payload is built with single quotes in the source.
      // S03.3 widens the regex to accept both the S03.2 shorthand
      // (`{ kind: 'drop', file }`) and the S03.3 explicit form
      // (`{ kind: 'drop', file: result.file }`). The discriminator
      // `result.kind` is the source of truth for the under-cap vs
      // over-cap branch; the payload file field is either the
      // shorthand `file` or the explicit `result.file` (a dotted
      // identifier chain).
      expect(body).toMatch(
        /onaccept\?\.\(\{\s*kind:\s*['"]drop['"]\s*,\s*file(?:\s*:\s*\w+(?:\.\w+)*)?\s*\}\)/,
      );
    });
    it('handleDrop does NOT wrap the onaccept call in dead code (M3)', () => {
      // The substring check above would still match `if (false) {
      // onaccept?.({ kind: 'drop', file }) }` or `if (file && false) {
      // ... }`. This check inspects the body line-by-line and rejects
      // any line whose immediately-preceding condition is `&& false`
      // or whose prefix is `if (false)`.
      const body = extractFunctionBody(dropzoneSource, 'handleDrop');
      const lines = body.split('\n');
      for (const line of lines) {
        expect(line, `dead-code line: ${line}`).not.toMatch(/\bif\s*\(\s*false\b/);
        expect(line, `dead-code line: ${line}`).not.toMatch(/&&\s*false\b/);
      }
    });
  });

  describe("AC18g: paste invokes onaccept with { kind: 'paste', text }", () => {
    it('handlePaste body invokes onaccept with { kind: "paste", text }', () => {
      const body = extractFunctionBody(dropzoneSource, 'handlePaste');
      expect(body).toMatch(/onaccept\?\.\(\{ kind: 'paste', text \}\)/);
    });
    it('handlePaste does NOT wrap the onaccept call in dead code (M3)', () => {
      const body = extractFunctionBody(dropzoneSource, 'handlePaste');
      const lines = body.split('\n');
      for (const line of lines) {
        expect(line, `dead-code line: ${line}`).not.toMatch(/\bif\s*\(\s*false\b/);
        expect(line, `dead-code line: ${line}`).not.toMatch(/&&\s*false\b/);
      }
    });
  });

  describe('AC18h: CSV-likeness heuristic (newline OR comma on first line)', () => {
    it('handlePaste references clipboardData', () => {
      const body = extractFunctionBody(dropzoneSource, 'handlePaste');
      expect(body).toMatch(/clipboardData/);
    });
    it('handlePaste includes a newline check (regex or string-includes)', () => {
      const body = extractFunctionBody(dropzoneSource, 'handlePaste');
      // Accept either the regex form (`/\n/` / `text.match(/\n/)`)
      // or the string-includes form (`text.includes('\n')`).
      const newlineCheck =
        /text\.includes\s*\(\s*['"]\\n['"]\s*\)|text\.match\s*\(\s*\/\s*\\n\s*\/\s*\)|text\.match\s*\(\s*\/\[\^\\n\]\/|\.includes\s*\(\s*['"]\\n['"]\s*\)/;
      expect(body).toMatch(newlineCheck);
    });
    it('handlePaste includes a comma check on the first line', () => {
      const body = extractFunctionBody(dropzoneSource, 'handlePaste');
      // Accept either `firstLine.includes(',')` or any reference to
      // `indexOf` against a comma.
      const commaCheck = /includes\s*\(\s*['"],['"]?\s*\)|indexOf\s*\(\s*['"],['"]?\s*\)/;
      expect(body).toMatch(commaCheck);
    });
    it('the heuristic variable gates the onaccept?.() call (H1 — load-bearing)', () => {
      // The three checks above could all pass with the heuristic
      // computed-and-discarded. AC8's intent is that the heuristic
      // *gates* the accept. This check accepts any of the right
      // structural patterns: `if (isCsvLike) onaccept?.(...)`,
      // `if (isCsvLike && …) onaccept?.(...)`, ternaries,
      // `&& isCsvLike && onaccept?.(...)`, etc. It rejects a call
      // site that lacks the heuristic variable in its near-prefix.
      const body = extractFunctionBody(dropzoneSource, 'handlePaste');
      const onacceptMatch = /onaccept\?\.\(\{[^}]*\}\)/.exec(body);
      expect(onacceptMatch, 'onaccept?.({...}) call not found in handlePaste').not.toBeNull();
      const before = body.slice(0, onacceptMatch!.index);
      // The heuristic variable must appear in the 80 chars preceding
      // the call (boilerplate spacing room). Accept any plausible
      // identifier name (isCsvLike, isCsv, looksLikeCsv, etc.).
      const recentWindow = before.slice(Math.max(0, before.length - 80));
      expect(
        recentWindow,
        `heuristic variable not found near onaccept?.() call (window: ${recentWindow})`
      ).toMatch(/\b(?:isCsvLike|isCsv|looksLikeCsv|csvLike)\b/);
      // Also: the call must NOT be the only statement on its line
      // (a bare `if (false) onaccept?.(...)` would already trip M3).
      // Cross-check: the heuristic variable must be assigned somewhere
      // in the body (computed, not just imported).
      expect(body).toMatch(/(?:isCsvLike|isCsv|looksLikeCsv|csvLike)\s*=/);
    });
  });

  describe('AC18i: paste preventDefault precedes clipboardData / onaccept', () => {
    it('first preventDefault() reference precedes first clipboardData / onaccept reference', () => {
      const body = extractFunctionBody(dropzoneSource, 'handlePaste');
      const preventIdx = body.search(/preventDefault\s*\(\s*\)/);
      const clipboardIdx = body.search(/clipboardData/);
      const onacceptIdx = body.search(/onaccept/);
      expect(preventIdx).toBeGreaterThanOrEqual(0);
      expect(preventIdx).toBeLessThan(clipboardIdx);
      expect(preventIdx).toBeLessThan(onacceptIdx);
    });
  });

  describe('AC18j: NO @change / onchange / addEventListener("change") in S03.2 (S03.7 inverts the onchange pin)', () => {
    // S03.2's scope: drag-drop + paste only; S03.7 wires the picker
    // change handler. The S03.2 pin asserted "no onchange" — S03.7
    // INVERTS it to "yes, the input has `onchange={handlePickerChange}`"
    // (the binding is the S03.7 surface). The other three pins
    // (@change, on:change, addEventListener("change")) stay
    // inverted-S03.7-aware: the inline `@change` form is a Svelte 4
    // syntax; `on:change` is also Svelte 4 syntax; Svelte 5 uses
    // `onchange={...}`. `addEventListener("change")` is still
    // forbidden (S03.7 uses the declarative form).
    it('Dropzone.svelte does NOT contain @change (Svelte 4 syntax)', () => {
      expect(dropzoneSource).not.toMatch(/@change\b/);
    });
    it('Dropzone.svelte does NOT contain on:change (Svelte 4 syntax)', () => {
      expect(dropzoneSource).not.toMatch(/\bon\s*:\s*change\s*=/);
    });
    it('Dropzone.svelte DOES bind onchange={handlePickerChange} (S03.7 inverted pin)', () => {
      // The S03.2 pin asserted "no onchange"; S03.7 inverts it.
      // The binding is the S03.7 surface — the picker change
      // handler is now wired.
      expect(dropzoneSource).toMatch(
        /<input\b[^>]*\bonchange\s*=\s*\{\s*handlePickerChange\s*\}/,
      );
    });
    it('Dropzone.svelte does NOT wire addEventListener("change", …) (declarative form preferred)', () => {
      expect(dropzoneSource).not.toMatch(/\baddEventListener\s*\(\s*['"]change['"]/);
    });
  });

  describe('AC18k: no Svelte 4 on:dragover / on:dragenter / on:drop / on:paste reappears', () => {
    it('Dropzone.svelte does NOT contain on:dragover', () => {
      expect(dropzoneSource).not.toMatch(/\bon\s*:\s*dragover\s*=/);
    });
    it('Dropzone.svelte does NOT contain on:dragenter', () => {
      expect(dropzoneSource).not.toMatch(/\bon\s*:\s*dragenter\s*=/);
    });
    it('Dropzone.svelte does NOT contain on:drop', () => {
      expect(dropzoneSource).not.toMatch(/\bon\s*:\s*drop\s*=/);
    });
    it('Dropzone.svelte does NOT contain on:paste', () => {
      expect(dropzoneSource).not.toMatch(/\bon\s*:\s*paste\s*=/);
    });
    it('Dropzone.svelte does NOT contain onpaste= short form (L13)', () => {
      // The four `on:foo=` checks above guard the Svelte 4 colon
      // syntax. They do NOT catch the Svelte 5 short form
      // `onpaste={...}` (no colon), which Svelte would bind as a
      // regular DOM attribute and silently fail to fire. Add an
      // explicit negative for the no-colon form.
      expect(dropzoneSource).not.toMatch(/\bonpaste\s*=/);
    });
  });

  describe('AC18l: zero hex literals in component CSS (AD-8)', () => {
    it('Dropzone.svelte contains no #rrggbb / #rgb / #rrggbbaa literal (outside comments)', () => {
      const hexLiteral = /#[0-9a-fA-F]{3,8}\b/;
      expect(dropzoneSource, 'hex literal found in Dropzone.svelte').not.toMatch(hexLiteral);
    });
  });

  describe('AC18m: no forbidden source patterns (Privacy Baseline + AD-7) + no navigator.clipboard', () => {
    const forbidden = [
      /\bfetch\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bEventSource\s*\(/,
      /\bsendBeacon\s*\(/,
      /\bnavigator\.sendBeacon\b/,
      /\bnew\s+Function\s*\(/,
      /\beval\s*\(/,
      /\bimport\s*\(/,
      /\bnavigator\.clipboard\b/,
    ];
    for (const pat of forbidden) {
      it(`Dropzone.svelte forbids ${pat.source}`, () => {
        expect(dropzoneSource, pat.source).not.toMatch(pat);
      });
    }
  });

  describe("AC18n: App.svelte still does NOT pass an onaccept callback (S03.7 boundary pin; S03.4 inverted)", () => {
    // S03.4 (aria-live announcement surface) is the FIRST story to
    // wire the App.svelte <Dropzone onaccept={handleAccept} /> consumer.
    // S03.2's AC18n asserted App.svelte renders <Dropzone /> bare
    // (no onaccept); S03.3 preserved that bound; S03.4 INVERTS it.
    // The block is preserved for per-story regression tracking —
    // the assertions flip to the S03.4 reality. The positive
    // pin lives at tests/dropzone-aria-live.test.ts AC20a.
    //
    // Review #1 (verification-gap) tightened the inverted assertions:
    // the S03.2 boundary was tightened to "App.svelte does NOT mention
    // onaccept at all"; the S03.4 inverted form asserts App.svelte
    // does pass onaccept={handleAccept} (the exact callback name,
    // not just any `onaccept` token — which would also match
    // Dropzone's prop declaration).
    it('App.svelte <Dropzone /> element DOES have onaccept={handleAccept} (S03.4 inverted boundary)', () => {
      // Tightened: assert the EXACT binding form (not just any
      // onaccept token). A regression that renamed the handler
      // (e.g., `onFile`) or removed the attribute would fail this.
      expect(appSource).toMatch(/<Dropzone\b[^>]*\bonaccept\s*=\s*\{\s*handleAccept\s*\}/);
    });
    it('App.svelte declares the handleAccept function (S03.4 inverted boundary; consumer)', () => {
      // The handler exists in App.svelte's script block. (This is
      // the AC20b positive pin, mirrored here for the boundary-
      // inversion docblock.)
      expect(appSource).toMatch(/\bfunction\s+handleAccept\s*\(/);
    });
    it('App.svelte <Dropzone /> opening tag has onaccept={handleAccept} verbatim (S03.4 inverted boundary; M4)', () => {
      // M4 prop-shape pin: capture the opening tag and assert the
      // exact form (not just "has an attribute").
      const open = /<Dropzone\b[^>]*>/.exec(app);
      expect(open, '<Dropzone ...> element not found in App.svelte').not.toBeNull();
      const openingTag = open![0];
      // The S03.4 inverted-boundary reality: the opening tag carries
      // the exact onaccept={handleAccept} binding.
      expect(openingTag).toMatch(/\bonaccept\s*=\s*\{\s*handleAccept\s*\}/);
    });
  });

  describe('AC18o: prior-story boundary pins are unchanged (now includes dropzone.test.ts)', () => {
    // Mirror S03.1 AC17k / S02.5 AC15k / S02.6 AC16m: each prior
    // story's test file contains its expected unique description
    // string. The new AC18o adds the dropzone test (S03.1) to the
    // pin list — the S03.1 pin covered four tests; AC18o extends
    // to five.
    it('tests/page-chrome.test.ts boundary pin (S02.4 chrome gate)', () => {
      expect(pageChromeTest).toMatch(
        /theme-seed\.test\.ts AC11g toEqual allowlist remains \['index\.html', 'src\/components\/ThemeToggle\.svelte'\]/
      );
    });
    it('tests/theme-toggle.test.ts boundary pin (S02.3 toggle gate) — anchored on describe(...) title (M5)', () => {
      // Tighter than the previous `/theme-toggle/` substring check,
      // which could be satisfied by a stray comment. Now requires
      // the top-level `describe(...)` block title to mention the
      // story identity.
      expect(themeToggleTest).toMatch(
        /describe\s*\(\s*['"`].*theme-toggle.*['"`]\s*,/
      );
    });
    it('tests/focus-ring.test.ts boundary pin (S02.5 focus ring gate) — anchored on describe(...) title (M5)', () => {
      expect(focusRingTest).toMatch(
        /describe\s*\(\s*['"`].*focus-ring.*['"`]\s*,/
      );
    });
    it('tests/editorial-posture.test.ts boundary pin (S02.6 editorial posture gate)', () => {
      expect(editorialPostureTest).toMatch(
        /tests\/focus-ring\.test\.ts still contains the AC11g allowlist description \(boundary pin\)/
      );
    });
    it('tests/dropzone.test.ts boundary pin (S03.1 dropzone gate) — NEW for AC18o', () => {
      // The S03.1 dropzone test's core identity marker.
      expect(dropzoneTest).toMatch(
        /dropzone \(S03\.1 real <button> dropzone opens file picker\)/
      );
    });
  });
});
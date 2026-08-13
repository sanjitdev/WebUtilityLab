# Story 3.3: 50 MB cap check before reading (S03.3)

Status: ready-for-dev
baseline_commit: 4f2d148 (S03.2 done — drop + paste handlers land; S03.3 picks up from here)
review_loop_iteration: 1
final_commit: <to be filled after push>

> **Loop protocol (mandatory).** This story must pass Review #1 (3 parallel reviewers), Review #2 (coderabbit), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. `S03.3` lands the **size gate** of the E03 user-visible gesture surface: any `File` handed to the dropzone is checked against the 50 MB cap (PRD FR-1) **before any read happens** (FR-1 explicitly says the cap is "before reading"). An over-cap file produces an `oversize` signal via the existing `onaccept` callback prop that S03.2 wired — the dropzone does NOT silently reject, and it does NOT read the file. S03.2 shipped the gesture verbs (drag/drop + paste) + the `onaccept` callback prop; S03.2's cross-story contract says: **"S03.3's reducer-side handler is the gate; S03.3 is the layer that enforces 50 MB."** S03.7 will wire the reducer consumer to handle both the accept path AND the over-cap signal. S03.4 will land the aria-live region that announces the over-cap error. **S03.3 does NOT author the `formatStrictBrief()` formatter** — that is S03.9's job (and per AI-2.2, S05.4 in E05 owns the module); S03.3 emits the structured `oversize` signal that S03.9's strict-brief path will format downstream. **S03.3 does NOT render the over-cap message** — that is S03.4's aria-live job. S03.3 is the **gate**; rendering is downstream.

> **Path-alias note.** This project's `vite.config.ts` does **not** configure `$lib` as a path alias, and `tsconfig.json` does **not** define `"paths": { "$lib/*": [...] }`. (Verified: `vite.config.ts` has zero `resolve.alias` entries; `tsconfig.json` extends `@tsconfig/svelte` and adds no path mappings.) Therefore the spec uses **relative imports** (`'../lib/file-size-cap'`) throughout. The `$lib` import form mentioned in early drafts has been removed; S03.3's import is `import { assertWithinFileCap } from '../lib/file-size-cap';` from inside `src/components/Dropzone.svelte`. (A future story in E05 may introduce `$lib` as part of the S05.x work; until then, relative paths are the convention.)

## Story

As a **user about to ingest a CSV into WebUtilityLab / CSV Rescue**,

I want **dragging or selecting a file over 50 MB to be refused BEFORE the file is read or any expensive operation begins, with a clear "this file is over the 50 MB limit" signal delivered to the rest of the page**,

so that **PRD FR-1's "File up to 50MB is accepted; larger files show a pre-flight refusal with a clear explanation" consequence is honored, the browser is not asked to hold a 200 MB file in memory, and the cap is enforced at the boundary the user touches (the dropzone) rather than after a worker round-trip**. The cap check must be cheap (`file.size` is already known from the `File` API), must run on the main thread (per ARCHITECTURE-SPINE.md open question line 130 — "Pre-flight estimate placement. Lean: main thread — gates whether the worker even starts, and the estimate is cheap"), and must produce a structured signal that downstream reducer + aria-live consumers can fan-out from.

## Acceptance Criteria

1. **The 50 MB cap is enforced on `File` accepts before any read.** The check is `file.size <= MAX_FILE_SIZE_BYTES` where `MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024` (50 MiB; matches PRD FR-1 "Files at the 50MB boundary"). The check runs on every File handed to the dropzone's accept path — both `handleDrop` (drag-and-drop) and the `<input type="file">` change path (S03.7 wires the change handler; S03.3 adds the cap gate inside the dropzone so all three accept paths funnel through it). **The check runs BEFORE any read.** No `FileReader.readAsText`, no `file.arrayBuffer()`, no `file.text()`, no `file.stream()` on an over-cap file — the dropzone rejects the file the moment `file.size` is known, without touching the file's contents.
2. **The cap constant is exported from `src/lib/file-size-cap.ts` (NEW).** A single module owns the constant and the pure check function. The module exports:
   - `MAX_FILE_SIZE_BYTES: number` — `50 * 1024 * 1024` (the cap; one place to change it).
   - `isWithinFileCap(file: File): boolean` — pure predicate; returns `file.size <= MAX_FILE_SIZE_BYTES`.
   - `assertWithinFileCap(file: File): { kind: 'ok'; file: File } | { kind: 'oversize'; size: number; cap: number }` — discriminated-union return shape that downstream code can `switch` on without conditional checks. The `oversize` branch carries `{ size, cap }` so the aria-live region (S03.4) can format "File is X MB; limit is Y MB" without re-reading the file.
   No other module may define `50 * 1024 * 1024` for the file-size cap. The single-source-of-truth is the new module. Tests pin this (`tests/file-size-cap.test.ts` AC19a).
3. **The dropzone extends its `onaccept` payload union with `{ kind: 'oversize'; size: number; cap: number }`.** The current S03.2 type is:
   ```ts
   onaccept?: (
     source:
       | { kind: 'drop'; file: File }
       | { kind: 'paste'; text: string; filename?: string }
   ) => void;
   ```
   S03.3 extends it to:
   ```ts
   onaccept?: (
     source:
       | { kind: 'drop'; file: File }
       | { kind: 'paste'; text: string; filename?: string }
       | { kind: 'oversize'; size: number; cap: number }
   ) => void;
   ```
   The paste branch does NOT trigger a cap check — paste carries text (no `File` to size-check), and the worker (E06) handles the 100 MB total-string-byte cap for parsed text. The drag/drop branch is the only one that goes through `assertWithinFileCap` (the picker change handler will also route through the same gate when S03.7 lands; the gate is shared).
4. **`handleDrop` routes the file through `assertWithinFileCap` BEFORE invoking `onaccept`.** The handler body becomes (structural; the exact named-function ordering is the test's concern):
   ```ts
   function handleDrop(event: DragEvent): void {
     event.preventDefault();
     isDragging = false;
     const file = event.dataTransfer?.files?.[0];
     if (!file) return;
     const result = assertWithinFileCap(file);
     if (result.kind === 'oversize') {
       onaccept?.({ kind: 'oversize', size: result.size, cap: result.cap });
       return;
     }
     onaccept?.({ kind: 'drop', file: result.file });
   }
   ```
   **Critical ordering:** `assertWithinFileCap` runs AFTER `event.preventDefault()` (the drop's default opens the file in the browser; we want to handle it), AFTER `isDragging = false` (clear the visual), AFTER the null-guard on `file` (no callback on synthetic events), and BEFORE `onaccept?.(...)`. The oversize branch is an early-return; the file is NOT re-read.
5. **The dropzone reads `MAX_FILE_SIZE_BYTES` only from `src/lib/file-size-cap.ts`.** No inline literal `50 * 1024 * 1024` in `Dropzone.svelte`. No inline literal `52428800` (the decimal equivalent). The test pins this — `tests/dropzone-file-cap.test.ts` AC19d asserts the dropzone imports `assertWithinFileCap` from `'../lib/file-size-cap'` (the relative path; this project does not configure the `$lib` alias — see the Path-alias note in the spec header) and does NOT contain any `* 1024 * 1024` literal outside the import.
6. **An under-cap file flows through unchanged.** When `file.size <= MAX_FILE_SIZE_BYTES`, `handleDrop` emits `onaccept?.({ kind: 'drop', file: result.file })` (note: S03.3 introduces an explicit `file: result.file` field, NOT the S03.2 shorthand `{ kind: 'drop', file }`). This is a deliberate S03.3 change to the payload shape — the `result` variable is the discriminator. The existing S03.2 test (`tests/dropzone-drag-paste.test.ts` AC18f) MUST be updated in S03.3 to accept both the shorthand and the explicit form. S03.3 owns the AC18f regex patch: the new pattern is `onaccept\?\.\(\{\s*kind:\s*['"]drop['"]\s*,\s*file(?:\s*:\s*\w+)?\s*\}\)`. This matches both `onaccept?.({ kind: 'drop', file })` (shorthand) AND `onaccept?.({ kind: 'drop', file: result.file })` (explicit). Without this AC18f regex update, S03.3 would regress the S03.2 test gate — a load-bearing break. **S03.3's spec author writes this regex update into the implementation pass**; it's documented here so the test author knows the AC18f pattern needs widening. (S03.7 will wire the App.svelte consumer; S03.3 leaves App.svelte unchanged.)
7. **An over-cap file emits the oversize signal, not the drop signal.** When `file.size > MAX_FILE_SIZE_BYTES`, `handleDrop` emits `onaccept?.({ kind: 'oversize', size: result.size, cap: result.cap })` (using the discriminated-union's `result.size` and `result.cap` — NOT `file.size` and `MAX_FILE_SIZE_BYTES` directly, so the values come from one source of truth) and does NOT emit `{ kind: 'drop', file }`. The two payloads are mutually exclusive on a single drop event. The M3 dead-code guard in the dropzone test (`tests/dropzone-drag-paste.test.ts:233-245`) still holds — the new oversize branch must NOT be wrapped in `if (false)` or `&& false`.
8. **Pasted text is NOT size-checked at this layer.** The paste branch emits `{ kind: 'paste', text }` unchanged. The CSV-text size cap (100 MB total-string-byte) is the worker's responsibility (E06 S06.7 — `tests/worker.test.ts` and the worker boundary pin there). S03.3 does not introduce a paste-side byte check.
9. **The picker change handler also routes through the cap gate (preparation for S03.7).** S03.3 does NOT wire the `<input type="file">` `@change` handler (that is S03.7's scope), but it DOES introduce a named function `handlePickerChange(event: Event): void` in `src/components/Dropzone.svelte` that the future S03.7 wiring will bind via `onchange={handlePickerChange}`. The function body mirrors `handleDrop`'s cap-routing logic:
   ```ts
   function handlePickerChange(event: Event): void {
     const input = event.target as HTMLInputElement | null;
     const file = input?.files?.[0];
     if (!file) return;
     const result = assertWithinFileCap(file);
     if (result.kind === 'oversize') {
       onaccept?.({ kind: 'oversize', size: result.size, cap: result.cap });
       input.value = '';
       return;
     }
     onaccept?.({ kind: 'drop', file: result.file });
     input.value = '';
   }
   ```
   The handler is declared in the script block (S03.3 lands it) but the `onchange` binding is NOT added to the template in S03.3 (S03.7 adds it). **The current S03.2 boundary pin `tests/dropzone-drag-paste.test.ts` AC18j (`no @change / onchange / addEventListener("change")`) is extended in S03.3** to permit the named function declaration but still forbid the template binding — the load-bearing S03.7 pin survives intact. AC19g (S03.3's new pin) documents this precisely.
10. **`handlePickerChange` resets `input.value = ''` after invoking `onaccept`** (mirrors the standard pattern: clear the picker so selecting the same file twice in a row still fires `@change`). The reset happens on BOTH the oversize AND the under-cap branches (the test verifies both). The over-cap branch's reset is critical: without it, the user can't re-select a different file via the picker (the browser sees the same file and skips the change event).

    **Ordering rationale — corrected:** The `File` reference is passed to `onaccept` **by value in the payload** (`{ kind: 'drop', file: result.file }`), NOT by reference into `input.files`. Clearing `input.value` after the synchronous `onaccept?.(...)` call therefore does **not** invalidate the `File` object the consumer holds — the `File` is already detached from the input by virtue of being a value in the payload. The original spec wording ("the consumer can still read the File reference from `input.files[0]`") was incorrect: setting `input.value = ''` synchronously nulls `input.files` per the HTML spec, so any consumer that deferred reading `input.files` to a microtask would see `null`. The correct contract is **value-passing**: the `File` lives in the payload, the input can be cleared independently. The reset-after-call ordering is preserved for code-clarity (clear after the consumer has the value) but the consumer MUST NOT rely on `input.files` after the synchronous handler returns.
11. **No new dependencies.** The cap check uses standard DOM APIs (`File.size` is a built-in property available on every modern browser; no polyfill required). `src/lib/file-size-cap.ts` is pure TypeScript with no imports. `audit-privacy.mjs` stays green (the new module has no `fetch`, no `XMLHttpRequest`, etc.).
12. **Privacy Baseline preserved.** No `fetch` / `XMLHttpRequest` / `navigator.sendBeacon` / `EventSource` / `new Function` / `eval` / dynamic `import()` in `src/lib/file-size-cap.ts` or in the modified `Dropzone.svelte`. The cap check reads `file.size` (a metadata property, NOT file content — the file's bytes are never read). `audit-privacy.mjs` stays green.
13. **Tests** at `tests/file-size-cap.test.ts` (NEW) for the new module, plus extension of `tests/dropzone-drag-paste.test.ts` to cover the dropzone-side routing (or — per S03.1/S03.2 per-story test convention — `tests/dropzone-file-cap.test.ts` NEW, keeping `tests/dropzone-drag-paste.test.ts` (S03.2) untouched for per-story regression tracking). **Spec choice: `tests/dropzone-file-cap.test.ts` NEW**, parallel to S03.1's `tests/dropzone.test.ts` and S03.2's `tests/dropzone-drag-paste.test.ts`. Mirrors the `node:fs` + `node:path` + `node:url` + `vitest` convention. Source-grep on `src/components/Dropzone.svelte`, `src/lib/file-size-cap.ts`, `src/App.svelte`. Coverage (15 AC19a-AC19o describe blocks):
    - **AC19a (cap module exists, single source of truth)** — `src/lib/file-size-cap.ts` exists. Contains `export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024` (regex `\bMAX_FILE_SIZE_BYTES\s*=\s*50\s*\*\s*1024\s*\*\s*1024\b` — exact constant definition). Exports `isWithinFileCap` AND `assertWithinFileCap` (both as named exports). The `assertWithinFileCap` return type is a discriminated union — the test pins the union shape by asserting the source contains both literal types. The regex MUST tolerate multi-line formatting (Prettier may break `{ kind: 'ok'; file: File }` across lines); the pattern uses `[\s\S]*?` between tokens: `\{\s*kind\s*:\s*['"]ok['"]\s*;[\s\S]*?file\s*:\s*File[\s\S]*?\}` for the ok branch and `\{\s*kind\s*:\s*['"]oversize['"]\s*;[\s\S]*?size\s*:\s*number[\s\S]*?cap\s*:\s*number[\s\S]*?\}` for the oversize branch. Both patterns use the `s` flag (or `[\s\S]*?` as a newline-tolerant alternative) so a single-line OR multi-line literal type matches.
    - **AC19b (`MAX_FILE_SIZE_BYTES` is exactly 50 MiB)** — `tests/file-size-cap.test.ts` (separate test file from the source-grep one, for behavioral coverage of the module) imports the constant and asserts `MAX_FILE_SIZE_BYTES === 50 * 1024 * 1024 === 52428800`. This is a runtime assertion that the constant resolves to the documented value (guards against accidental edits).
    - **AC19c (`isWithinFileCap` returns true at the boundary, false above it)** — runtime tests using synthetic `File` objects (the standard `new File([blob], name, { type })` works in Node 22+ via `node:buffer` Blob; for the legacy case where `File` is unavailable, the test uses a `{ size: number }` cast — the function accepts `File` but the test uses a structural type since `File.size` is the only property accessed). Cases: `size = 0` → true; `size = MAX_FILE_SIZE_BYTES` (exact boundary) → true (the boundary is inclusive: 50 MB exactly is accepted); `size = MAX_FILE_SIZE_BYTES + 1` → false; `size = 50 * 1024 * 1024 * 4` (200 MB) → false.
    - **AC19d (dropzone imports from the cap module, not inline)** — `src/components/Dropzone.svelte` script block contains `import\s*\{[\s\S]*?\bassertWithinFileCap\b[\s\S]*?\}\s*from\s*['"](?:\$lib|\.\.\/lib)\/file-size-cap['"]` (the regex uses `[\s\S]*?` not `[^}]*` so multi-line import blocks like `{ assertWithinFileCap, type FileCapResult }` across lines match). The spec uses the **relative path** `'../lib/file-size-cap'` (NOT `$lib/file-size-cap`) because the project does not configure the `$lib` alias — see the Path-alias note in the spec header. AND `dropzoneSource` does NOT contain `50\s*\*\s*1024\s*\*\s*1024` (the inline-literal negative pin).
    - **AC19e (`handleDrop` routes through `assertWithinFileCap`)** — `extractFunctionBody(dropzoneSource, 'handleDrop')` contains `assertWithinFileCap\s*\(` AND contains `onaccept\?\.\(\{ kind: 'oversize', size: result\.size, cap: result\.cap \}\)` (the oversize branch's exact payload). The test also verifies that `handleDrop`'s body still contains `onaccept\?\.\(\{ kind: 'drop', file: result\.file \}\)` (the under-cap branch still wires through).
    - **AC19f (`handleDrop` early-returns on the oversize branch — file is NOT re-emitted as `{ kind: 'drop' }`)** — same `extractFunctionBody`. The test asserts the oversize branch's `return;` precedes any `onaccept\?\.\(\{ kind: 'drop'` reference. Mirrors S03.2's AC18i (positional ordering pin), applied to the new control flow.
    - **AC19g (`handlePickerChange` is declared but NOT bound to the template)** — `dropzoneSource` contains `function\s+handlePickerChange\s*\(` (declaration present in the script block, ready for S03.7 to bind) AND does NOT match `\bonchange\s*=\s*\{\s*handlePickerChange\s*\}` on the `<input type="file">` element (template binding absent). The S03.7 boundary pin is intact: a future contributor who pre-wires `onchange={handlePickerChange}` in S03.3 trips here. (Mirrors S03.2 AC18j's pin pattern, applied to the same file.)
    - **AC19h (`handlePickerChange` body resets `input.value = ''` on both branches)** — `extractFunctionBody(dropzoneSource, 'handlePickerChange')` contains the `input.value = ''` assignment AND the assignment appears AFTER the `onaccept?.(...)` call in each branch (positional pin: clear AFTER the consumer runs, so the consumer can still read the File reference). The oversize branch's clear is load-bearing — without it, the user can't re-pick a file.
    - **AC19i (`onaccept` payload type extends to include `oversize`)** — `dropzoneSource` contains `kind\s*:\s*['"]oversize['"]` (the new union member). The existing `drop`, `paste` members are still present (the test asserts all three appear). Mirrors S03.2 AC18f (typed source union), extended with the third member.
    - **AC19j (no Svelte 4 `on:` syntax reappears in the new bindings)** — `dropzoneSource` does NOT contain `on:oversize`, `on:change`, `on:size` (forward-compat defensive pins — a future contributor adding Svelte 4 event bindings to the cap-related handlers trips here). Mirrors S03.2 AC18k.
    - **AC19k (zero hex literals in any NEW code, AD-8)** — `dropzoneSource` AND `fileSizeCapSource` (read from `src/lib/file-size-cap.ts`) do NOT contain any `#rrggbb` / `#rgb` / `#rrggbbaa` literal outside comments. The new module is pure TypeScript (no CSS), so this is a trivial pass; the pin documents the assumption.
    - **AC19l (no forbidden source patterns in NEW code, Privacy Baseline + AD-7)** — `dropzoneSource` AND `fileSizeCapSource` (both read via the `stripComments` helper so comments don't false-positive) do NOT contain `\bfetch\(`, `XMLHttpRequest`, `EventSource`, `sendBeacon`, `navigator\.sendBeacon`, `new Function`, `\beval\b`, dynamic `import\(`, `\bFileReader\b`, `\breadAsText\b`, `\breadAsArrayBuffer\b`, `\breadAsBinaryString\b`, `\breadAsDataURL\b`, **AND** `\bfile\s*\.\s*(?:slice|arrayBuffer|stream|text|bytes)\s*\(` (the "peek" patterns — `file.slice(0, 1024).text()` would let a future contributor probe the first 1 KB for "is this CSV-shaped?" and trip the spirit of the rule without tripping the explicit `readAsText` pin). The new module + the new dropzone code must NOT read the file's contents (the cap is on `file.size` only; the bytes are never touched, even for "validation" or "sniffing"). **The `FileReader` / `readAsText` / `readAsArrayBuffer` / `readAsBinaryString` / `readAsDataURL` / `file.slice().*` negatives are the load-bearing "do not read the file" pin.** A future contributor who tries to "validate" an over-cap file by peeking at the first few bytes trips here. Mirrors S03.1 AC17g, extended with the file-read negatives.
    - **AC19m (App.svelte still does NOT pass an `onaccept` callback — S03.7 boundary pin extended)** — `appSource` does NOT match `<Dropzone\b[^>]*\bonaccept\b` (the existing S03.2 AC18n pin). Plus, `appSource` does NOT contain `oversize` (no premature reducer wiring for the over-cap signal in App.svelte). The pin is unchanged from S03.2; S03.3 documents that S03.7 will extend the onaccept handler to also handle the `oversize` branch.
    - **AC19n (boundary pin: prior stories unchanged + dropzone-drag-paste.test.ts preserved)** — extend the S03.2 AC18o pin to include `tests/dropzone.test.ts` (S03.1) AND `tests/dropzone-drag-paste.test.ts` (S03.2). Each contains its expected unique description string. The dropzone-drag-paste.test.ts description string pin: `dropzone-drag-paste \(S03\.2 drag-and-drop \+ paste handlers, onaccept unbound\)`.
    - **AC19o (`onaccept` payload kind: 'oversize' does NOT carry a `File` reference)** — `dropzoneSource`'s `onaccept` discriminated union for the oversize branch is `{ kind: 'oversize'; size: number; cap: number }` (no `file` field). The test scope is critical: it MUST extract just the oversize literal-type block (via brace-walking the `onaccept` prop type annotation) and assert no `file:` field appears inside that scope. A naive file-wide grep would false-positive on the under-cap branch's `file: result.file` (which legitimately contains `file:`). The brace-walker walks the `onaccept?: (source: ... | { kind: 'oversize'; size: number; cap: number }) => void;` block until the closing `}` of the oversize literal; within that scope, assert the substring `file` does NOT appear (or more strictly, that the literal does NOT contain `file\s*:`). The intent: an over-cap file's bytes are NEVER held in app memory (the `File` object would still hold a reference to the browser's file handle, which the spec excludes). Downstream consumers (S03.4 aria-live, S03.7 reducer, S03.9 strict-brief) format the error from `{ size, cap }` only.
14. **README / docs / planning-artifact changes are out of scope.** No edits to `CHANGELOG.md`, `SECURITY.md`, `docs/loop-protocol.md`, `docs/pii-patterns.md`, or the planning artifacts (post-Epic updates). Story commit is code-only.
15. **No new dependencies.** S03.3 is component + module + test only; no `package.json` entries.
16. **`tests/dropzone-file-cap.test.ts` passes in the production gate.** The test file is committed, runs at `npm test`, and all assertions pass on first implementation. Expected test count: **~50 sub-assertions across 15 AC19a-AC19o describe blocks** (the "~20" claim in early drafts was off by ~2.5× — AC19a has 5 sub-assertions, AC19c has ~8 (4 boundary cases × 2 functions), AC19l has ~14 (9 S03.2-pinned + 5 new file-read negatives × 2 source files), and the remaining ACs have 1-6 each). Actual count depends on how the test author groups related assertions.

## Verification

1. `npm test` → all tests pass (420 from before S03.3 + ~20 new in `tests/dropzone-file-cap.test.ts`).
2. `npm run check` → svelte-check 0 errors + tsc 0 errors.
3. `npm run build` → `dist/` exists; `find dist -name '*.map' | wc -l` = 0; bundle still under budget (S03.3 adds <1 KB to the JS bundle — `file-size-cap.ts` is ~30 lines of pure TS; the dropzone adds ~25 lines for the cap-routing logic).
4. `npm run check:bundle` → under 200 KB gzipped.
5. `npm run audit:privacy` → OK; the new module introduces no forbidden source patterns.
6. `npm run audit:behavior` → OK; the dropzone renders inside `<main>`; zero post-load requests; the over-cap check does NOT trigger any network request (the check is `file.size`, a metadata property).
7. `npm run check:deps` → OK.
8. `npm run check:telemetry` → OK.
9. **Manual / DevTools**:
   - `npm run preview`; open in Chrome.
   - Empty state shows the dropzone (S03.1's visual).
   - Drag a 100 MB CSV (or any file > 50 MB) onto the dropzone. The `.is-dragover` border thickens while over, clears on drop. **The over-cap signal fires (verifiable via a temporary `console.log` in App.svelte or by attaching a debug handler in DevTools); no network request; no file read.** The file is accepted into the cap gate; S03.7's reducer consumer would receive `{ kind: 'oversize', size: ..., cap: ... }`.
   - Drag a 1 MB CSV onto the dropzone. Under-cap path; `onaccept` emits `{ kind: 'drop', file }` exactly as S03.2 shipped.
   - Paste a multi-line CSV text. Under-cap path; `onaccept` emits `{ kind: 'paste', text }` (no cap check on paste).
   - DevTools console: no errors, no warnings.
   - Lighthouse a11y: dropzone still has accessible name, real `<button>` role, real focus, real keyboard activation; the over-cap signal does NOT regress a11y (it's a structured payload, not yet rendered).

## Loop Protocol Path Forward

1. Implement Tasks 1–5 below (module + component + test + verification).
2. Run production-readiness gate (Step 7 of loop).
3. Run Review #1 — 3 reviewers in parallel (blind-hunter, edge-case-hunter, verification-gap) against the diff.
4. Apply Review #1 patches if any.
5. Run Review #2 — coderabbit in fresh context against diff + Review #1 findings.
6. Apply Review #2 patches if any.
7. Flip `sprint-status.yaml` to `done`.
8. Update story file with step-05 maintenance patch notes.
9. Move to S03.4 (file-name reveal in aria-live region).

## Tasks / Subtasks

- [ ] **Task 1** — Read the existing source files S03.3 touches + the cross-story contract notes:
  - [ ] 1.1 Read `src/components/Dropzone.svelte` (already done; S03.2 component). Note the current shape: real `<button>`, hidden `<input>`, scoped CSS, drag handlers, paste handler, `onaccept` callback prop with `{ kind: 'drop'; file } | { kind: 'paste'; text }` union. S03.3 ADDS the cap-routing logic to `handleDrop`, ADDS the new `handlePickerChange` function (declared but not bound), EXTENDS the `onaccept` union with `{ kind: 'oversize'; size; cap }`.
  - [ ] 1.2 Read `src/App.svelte` (already done; currently `<Dropzone />` rendered bare, no callback). S03.3 does NOT modify App.svelte; the mount stays unchanged. AC19m pins this. S03.7 will wire the reducer consumer.
  - [ ] 1.3 Read `tests/dropzone-drag-paste.test.ts` to confirm the S03.2 test surface is preserved (AC19n pins prior-story test descriptions). The new S03.3 test file is `tests/dropzone-file-cap.test.ts` — separate, per-story regression tracking.
  - [ ] 1.4 Re-read the S03.2 spec's Cross-Story Contract Notes (line 165-171 of `3-2-drag-and-drop-handler-paste-handler.md`) to confirm S03.3's scope: 50 MB cap on File accepts only; paste is unchanged; S03.7 wires the consumer; S03.4 lands the aria-live; S03.9 lands the strict-brief formatter.

- [ ] **Task 2** — Create `src/lib/file-size-cap.ts` (NEW):
  - [ ] 2.1 Module structure:
    - Top-of-file docblock: "File-size cap check (S03.3). Single source of truth for the 50 MB cap (PRD FR-1). Pure functions, no DOM access, no I/O. The dropzone routes File accepts through `assertWithinFileCap` before invoking its onaccept callback; over-cap files emit `{ kind: 'oversize', size, cap }` and are NEVER read."
    - Export `const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024` — the cap. Number type, readonly by convention.
    - Export `function isWithinFileCap(file: File): boolean { return file.size <= MAX_FILE_SIZE_BYTES; }` — pure predicate.
    - Export `function assertWithinFileCap(file: File): { kind: 'ok'; file: File } | { kind: 'oversize'; size: number; cap: number } { return file.size <= MAX_FILE_SIZE_BYTES ? { kind: 'ok', file } : { kind: 'oversize', size: file.size, cap: MAX_FILE_SIZE_BYTES }; }` — discriminated union return.
    - No imports. Pure TypeScript.
  - [ ] 2.2 No tests inside the module file (no `if (import.meta.vitest)` blocks; per the project's test convention, all tests live in `tests/*.test.ts`).

- [ ] **Task 3** — Modify `src/components/Dropzone.svelte` to add cap routing:
  - [ ] 3.1 SCRIPT BLOCK additions:
    - Add `import { assertWithinFileCap } from '../lib/file-size-cap';` (relative path; this project does not configure the `$lib` alias — see the Path-alias note in the spec header).
    - Extend the `onaccept` prop type to include `{ kind: 'oversize'; size: number; cap: number }` (AC19i).
    - Modify `handleDrop` to route through `assertWithinFileCap` (AC19e + AC19f): preventDefault → isDragging = false → file from dataTransfer → early-return if no file → assertWithinFileCap(file) → switch on result.kind → oversize: `onaccept?.({ kind: 'oversize', size: result.size, cap: result.cap })` and return; ok: `onaccept?.({ kind: 'drop', file: result.file })`.
    - Add `function handlePickerChange(event: Event): void` per AC9: read input.files[0], route through assertWithinFileCap, fire onaccept with the appropriate kind, reset `input.value = ''` after the consumer runs (the consumer holds the `File` by value in the payload, NOT by reference into `input.files` — see AC10's corrected ordering rationale).
  - [ ] 3.2 TEMPLATE BLOCK: unchanged. The `onchange={handlePickerChange}` binding lands in S03.7; S03.3 only declares the function in the script block. AC19g pins this.
  - [ ] 3.3 STYLE BLOCK: unchanged from S03.1 / S03.2. The cap check is a behavior change, not a visual change.
  - [ ] 3.4 Update the docblock at the top of the file to reflect S03.3's addition: the gesture surface is now size-gated; S03.7 will wire the reducer consumer; S03.4 will land the aria-live announcement; S03.9 will format the strict-brief error.

- [ ] **Task 3.5** — Patch `tests/dropzone-drag-paste.test.ts` AC18f regex (REQUIRED for S03.3):
  - [ ] 3.5.1 Locate the AC18f describe block (`'AC18f: drop invokes onaccept with { kind: 'drop', file }'`) and the assertion that uses `expect(body).toMatch(/onaccept\?\.\(\{ kind: 'drop', file \}\)/)` (S03.2's regex).
  - [ ] 3.5.2 Replace the regex with `onaccept\?\.\(\{\s*kind:\s*['"]drop['"]\s*,\s*file(?:\s*:\s*\w+)?\s*\}\)`. The `file(?:\s*:\s*\w+)?` group accepts both shorthand `{ kind: 'drop', file }` and explicit `{ kind: 'drop', file: result.file }`. Without this patch, AC18f fails after S03.3 lands the explicit form — see AC6 in this spec.
  - [ ] 3.5.3 Verify AC18f still passes by mentally tracing against the new `handleDrop` body. Both shapes must match.

- [ ] **Task 4** — Mount contract pins (App.svelte stays unchanged):
  - [ ] 4.1 AC19m pins App.svelte: `<Dropzone />` is rendered bare — NO `onaccept` callback prop, no `oversize` reference. If a future contributor pre-wires the reducer callback in S03.3 (out of scope), the AC19m test trips.
  - [ ] 4.2 No other changes to `src/App.svelte`.

- [ ] **Task 5** — Write `tests/dropzone-file-cap.test.ts` (NEW):
  - [ ] 5.1 File preamble: `node:fs` + `node:path` + `node:url` + `vitest` imports. `here = fileURLToPath(new URL('.', import.meta.url))`; `repoRoot = join(here, '..')`. Constants for `dropzonePath`, `fileSizeCapPath = 'src/lib/file-size-cap.ts'`, `appPath`, plus the 6 prior-story test paths from S03.2. Read each file once at top of describe block. Define `stripComments` helper (mirror S03.1 / S03.2).
  - [ ] 5.2 AC19a: cap module exists, single source of truth. Grep `fileSizeCapSource` for `MAX_FILE_SIZE_BYTES\s*=\s*50\s*\*\s*1024\s*\*\s*1024`. Grep for `export\s+(?:const|function)\s+(?:isWithinFileCap|assertWithinFileCap)`. Grep for `{ kind: 'ok'; file: File }` and `{ kind: 'oversize'; size: number; cap: number }` literal types in the union return.
  - [ ] 5.3 AC19b: `MAX_FILE_SIZE_BYTES === 52428800`. Import the constant (via `await import('../src/lib/file-size-cap.ts')` or `require` with the TS-aware vitest config; if the import path doesn't resolve, the test pins the literal `50 * 1024 * 1024 === 52428800` arithmetic directly as a triple-equals check — `expect(50 * 1024 * 1024).toBe(52428800)` is the runtime cross-check).
  - [ ] 5.4 AC19c: `isWithinFileCap` boundary behavior. Construct synthetic `{ size: number }` objects (cast as `File`; the function only reads `.size`, so the structural type suffices) and assert: `size = 0` → true; `size = MAX_FILE_SIZE_BYTES` → true; `size = MAX_FILE_SIZE_BYTES + 1` → false; `size = 200 * 1024 * 1024` → false. Plus: `assertWithinFileCap` returns `{ kind: 'ok', file }` for the boundary, `{ kind: 'oversize', size, cap: MAX_FILE_SIZE_BYTES }` for the over-cap case. The over-cap branch's `size` is the input file's `.size`; the `cap` is `MAX_FILE_SIZE_BYTES`.
  - [ ] 5.5 AC19d: dropzone imports from the cap module, no inline literal. Grep `dropzoneSource` for `import\s*\{[\s\S]*?\bassertWithinFileCap\b[\s\S]*?\}\s*from\s*['"](?:\$lib|\.\.\/lib)\/file-size-cap['"]` (uses `[\s\S]*?` for multi-line import blocks; the regex accepts either the relative `'../lib/file-size-cap'` path — which S03.3 uses — or the `$lib` form, but the spec mandates the relative path). Assert negative: `dropzoneSource` does NOT contain `50\s*\*\s*1024\s*\*\s*1024` (the inline literal would indicate cap duplication).
  - [ ] 5.6 AC19e + AC19f: `handleDrop` routes through `assertWithinFileCap`. Extract `handleDrop` body via the `extractFunctionBody` helper from `tests/dropzone-drag-paste.test.ts` (mirror it in this file). Assert the body contains `assertWithinFileCap\s*\(` AND `onaccept\?\.\(\{ kind: 'oversize', size: result\.size, cap: result\.cap \}\)` AND `onaccept\?\.\(\{ kind: 'drop', file: result\.file \}\)`. Positional: the `result\.size` reference appears AFTER `assertWithinFileCap` (the helper must be called first).
  - [ ] 5.7 AC19g: `handlePickerChange` declared but not bound. Grep `dropzoneSource` for `function\s+handlePickerChange\s*\(`. Assert negative: `dropzone` (the raw source, NOT comment-stripped) does NOT contain `onchange={handlePickerChange}` or `on:change={handlePickerChange}`.
  - [ ] 5.8 AC19h: `handlePickerChange` resets `input.value`. Extract `handlePickerChange` body; assert it contains `input\.value\s*=\s*['"]['"]` (empty string assignment) AND that the assignment appears AFTER the `onaccept?.(...)` call in both branches (positional ordering).
  - [ ] 5.9 AC19i: `onaccept` union extended. Grep `dropzoneSource` for `kind\s*:\s*['"]oversize['"]`. Plus the existing `drop` and `paste` kinds (regression — the S03.2 union must be preserved).
  - [ ] 5.10 AC19j: no Svelte 4 `on:` syntax. Grep `dropzoneSource` for negative matches on `\bon\s*:\s*oversize`, `\bon\s*:\s*change`, `\bon\s*:\s*size`.
  - [ ] 5.11 AC19k: zero hex literals in any NEW code (mirrors S03.2 AC18l — same regex, applied to both `dropzoneSource` AND `fileSizeCapSource`).
  - [ ] 5.12 AC19l: no forbidden source patterns + no file-read APIs in NEW code. The forbidden list extends S03.2 AC18m with: `\bFileReader\b`, `\breadAsText\b`, `\breadAsArrayBuffer\b`, `\breadAsBinaryString\b`, `\breadAsDataURL\b`. These are the "do not read the file" pins.
  - [ ] 5.13 AC19m: App.svelte boundary pin. Mirror S03.2 AC18n. Plus `appSource` does NOT contain `oversize` (no premature reducer wiring).
  - [ ] 5.14 AC19n: prior-story boundary pins. Extend S03.2 AC18o to include `tests/dropzone.test.ts` (S03.1) AND `tests/dropzone-drag-paste.test.ts` (S03.2) — each contains its expected unique description string. The dropzone-drag-paste.test.ts pin: `dropzone-drag-paste \(S03\.2 drag-and-drop \+ paste handlers, onaccept unbound\)`.
  - [ ] 5.15 AC19o: `oversize` branch carries no `file` field. Grep `dropzoneSource` for the union type annotation (the `onaccept` prop type); assert the oversize literal type does NOT include `file:`. The pattern: extract the prop-type block via brace-walking; assert it contains `{ kind: 'oversize'; size: number; cap: number }` AND does NOT contain `{ kind: 'oversize';[^}]*file:` (the negative `file:` inside the oversize literal).

- [ ] **Task 6** — Run the production-readiness gate (mirror S03.1 / S03.2 Task 6):
  - [ ] 6.1 `npm test` → all 420 prior tests + ~20 new in `tests/dropzone-file-cap.test.ts` pass.
  - [ ] 6.2 `npm run check` → 0 errors.
  - [ ] 6.3 `npm run build` → bundle under budget; 0 source maps.
  - [ ] 6.4 `npm run check:bundle` → under 200 KB gzipped.
  - [ ] 6.5 `npm run audit:privacy` → OK.
  - [ ] 6.6 `npm run audit:behavior` → OK.
  - [ ] 6.7 `npm run check:deps` → OK.
  - [ ] 6.8 `npm run check:telemetry` → OK.

- [ ] **Task 7** — Open a local commit (no push yet): `S03.3 done: 50 MB cap check before reading; oversize signal via onaccept (S03.7 wires the reducer consumer, S03.4 lands aria-live, S03.9 lands the strict-brief formatter)`.

## Dev Notes

### Source files this story touches

| File | Status | Surface S03.3 changes |
|---|---|---|
| `src/lib/file-size-cap.ts` | **NEW** | Pure TypeScript module; `MAX_FILE_SIZE_BYTES` constant + `isWithinFileCap` predicate + `assertWithinFileCap` discriminated-union function. ~30 lines. |
| `src/components/Dropzone.svelte` | **MODIFIED** | Imports `assertWithinFileCap`; extends `onaccept` payload union with `{ kind: 'oversize'; size; cap }`; modifies `handleDrop` to route through the cap (early-return on oversize); adds `handlePickerChange` function in script block (declared but not template-bound — S03.7 binds it). CSS unchanged. Net added: ~35 lines including docblock. |
| `tests/dropzone-file-cap.test.ts` | **NEW** | 15 AC19a-AC19o describe blocks; ~20 tests. Mirrors the existing test convention. |

### Files S03.3 does NOT touch (avoid scope creep)

| File | Why leave alone |
|---|---|
| `src/App.svelte` | Mount stays `<Dropzone />` without `onaccept` (AC19m boundary pin); S03.7 wires the callback. |
| `src/lib/*` (other than `file-size-cap.ts`) | No new modules. The strict-brief formatter (`src/lib/strict-brief.ts`) lands in E05 S05.4. |
| `src/worker/*` | E05+ territory; S03.3 does not spawn the worker. |
| `src/styles/tokens.css` | No new tokens. |
| `src/styles/app.css` | Dropzone CSS lives in the component's `<style>` block (unchanged from S03.1/S03.2). |
| `src/components/ThemeToggle.svelte` | Unchanged. |
| `index.html` | Unchanged. |
| `src/main.ts` | Unchanged. |
| `package.json` | No new deps. |
| `tests/dropzone-drag-paste.test.ts` | S03.2's test surface stays untouched (per-story regression tracking; AC19n pins prior descriptions). |

### Cross-story contract notes

- **S03.4 will add the aria-live announcement on file accept** — S03.3 emits the `oversize` signal via `onaccept` but does NOT touch any aria-live region. S03.4 stands up the aria-live surface and connects it to the `onaccept` consumer (which by S03.4's story may or may not be wired — S03.4 may render a temporary in-component aria-live if the reducer is not yet live; the spec notes this).
- **S03.5 will land the empty-state copy + headline + lede** — the button label stays "Browse files" placeholder from S03.1; S03.5 lands the locked empty-state copy. The 50 MB cap is referenced in the empty-state copy ("Files up to 50 MB, UTF-8, with or without a BOM") — that copy lands in S03.5.
- **S03.7 will wire the reducer consumer via the `onaccept` callback prop** — S03.7 changes `<Dropzone />` in App.svelte to `<Dropzone onaccept={(src) => reducer.accept(src)} />`. The reducer's `accept` function handles ALL THREE source kinds: `{ kind: 'drop'; file }` (under-cap file accepted), `{ kind: 'paste'; text }` (pasted CSV text accepted), AND `{ kind: 'oversize'; size; cap }` (over-cap rejection — reducer transitions to `refusal` state per the state machine in ARCHITECTURE-SPINE.md line 149-150). S03.7 also adds the `<input type="file" onchange={handlePickerChange}>` template binding that calls the function S03.3 declares. **By S03.7's completion, all three accept paths (drag-drop, paste, picker) feed the same reducer transition, and the over-cap rejection flows through the reducer's refusal-state transition.**
- **S03.9 will land the strict-brief formatter (`formatStrictBrief()`) and the over-cap strict-brief error path** — S03.9 imports `formatStrictBrief()` from `src/lib/strict-brief.ts` (owned by E05 S05.4) and wires the over-cap rejection to format as a strict-brief error. S03.3 emits the structured `oversize` signal; S03.9 formats it for display. Per AI-2.2, S05.4 owns the `formatStrictBrief()` module — S03.3 does NOT author its own formatter.
- **E04 will add the pre-flight time estimate (the second FR-6 gate)** — S03.3 enforces the size cap; E04 enforces the time-budget cap. The two are orthogonal (size is `file.size`; time is a heuristic on `bytes / processing-rate`). S03.3's cap is the upstream gate; E04's time estimate is the downstream gate. Per ARCHITECTURE-SPINE.md line 130, both run on the main thread (cheap; before the worker even starts).
- **E06 will add the worker's internal byte caps (per-field 1 MB, total 100 MB)** — S03.3's 50 MB cap is at the gesture surface; E06's caps are at the parse surface. The 50 MB cap means the worker never sees a file > 50 MB (S03.3 rejects at the dropzone); E06's caps are defense-in-depth for under-cap-but-malformed inputs.

### Out-of-scope clarifications (explicit non-goals for S03.3)

- **No directory-drop guard.** S03.3 inherits S03.2's `dataTransfer.files[0]` pattern. If the user drops a folder (some browsers expose folders as `File` entries with `webkitRelativePath` populated and `size === 0` or indeterminate), the cap check on `file.size` will pass (a directory's reported size is 0 or a small placeholder), and the worker's parser will fail downstream with a strict-brief error. S03.3 accepts this silent pass; a dedicated directory-drop guard is a separate concern (likely folded into S03.4 / S03.5 / S03.7's UX layer). The spec does NOT add a directory check in S03.3.
- **No multi-file UX.** S03.3 inherits S03.2's single-file behavior (`multiple` attribute absent on `<input type="file">` per AC2 in S03.1; `handleDrop` reads only `dataTransfer.files[0]`). If a user drops 5 files, files[1]–files[4] are silently discarded — no error toast, no console warning. FR-1 says "user provides a CSV" (singular), so multi-file UX is out of scope for E03. S03.3 does not introduce multi-file handling; if a future story adds it, the cap gate is per-file (each file gets its own `assertWithinFileCap` call).
- **No paste-side byte cap.** AC8 explicitly excludes paste from the cap check. Pasting 80 MB of text into the page is accepted unconditionally at the gesture surface; the worker's E06 S06.7 100 MB total-string-byte cap catches truly excessive pastes at the parse layer. The rejection-then-re-paste loop is a deliberate trade-off: pre-filtering paste text on the main thread would require counting bytes synchronously (cheap, but introduces a paste-side gating UX that isn't specified). S03.3 accepts the trade-off.
- **No `File` constructor usage in tests.** S03.3's runtime ACs (AC19c) cast `{ size: number }` as `File` for the boundary test — this is structural typing (TypeScript only) at compile time and duck-typing at runtime (the function only reads `.size`). If a future contributor adds `file.name` access (e.g., for logging in `assertWithinFileCap`), the cast crashes with `Cannot read properties of undefined`. The spec recommends `new File([new Blob(['x'])], 't.csv', { type: 'text/csv' })` (Node 22+ supports this) for future tests, but AC19c accepts the cast form as a fallback.
- **No `event: Event` → typed `Event & { target: HTMLInputElement }` narrowing.** AC9 uses `event: Event` (the broadest type) with an inline cast `event.target as HTMLInputElement | null`. This is intentional: Svelte 5's event types for native DOM events don't narrow `event.target` automatically (unlike React's synthetic events), so the cast is explicit. S03.3 does not introduce a typed wrapper form.

### Anti-patterns to avoid (per E02 retro's "What was hard" lessons)

- **CSS property vs custom-property confusion** (S02.6 lesson): S03.3 doesn't touch CSS, but the rule still applies if a future contributor re-touchs the `<style>` block. Use `var(--…)`, never raw color values.
- **Spec implies a directory walk, not a per-file scan** (S02.5 lesson): AC19l's negative-assertion scan is bounded to the dropzone file + the new module; the broader `src/` walk is the S02.6 test's job.
- **Description-string anchor for boundary pins** (S02.5 lesson): AC19n pins prior-story boundaries on description strings (mirror S03.1 AC17k / S03.2 AC18o pattern). The new AC19n extends the pin list to include `tests/dropzone-drag-paste.test.ts` (S03.2).
- **Svelte 4 event handler syntax reappearing**: AC19j is the explicit negative. Use Svelte 5 syntax throughout.
- **Per-component test creep**: S03.3 keeps `tests/dropzone.test.ts` (S03.1) AND `tests/dropzone-drag-paste.test.ts` (S03.2) untouched; S03.3's tests live in `tests/dropzone-file-cap.test.ts`. This preserves the per-story test surface for regression tracking.
- **Reading the file's contents to "validate" before rejecting** (the most likely review-time finding on S03.3): AC19l's `FileReader` / `readAsText` / `readAsArrayBuffer` / `readAsBinaryString` / `readAsDataURL` negatives are the load-bearing "do not read the file" pin. A future contributor who tries to "validate" an over-cap file by peeking at the first few bytes trips here. The cap check is on `file.size` ONLY — the bytes are never touched, even for "validation" purposes.

### Verification gap risk (review-time prediction)

The most likely review-time finding on S03.3: **The `handlePickerChange` declaration-vs-binding boundary pin (AC19g).** The function is declared in S03.3's script block but NOT bound to the template; S03.7 adds the binding. A future contributor who pre-wires `onchange={handlePickerChange}` in S03.3 (out of scope) trips here. Document in step-05 if the regex needs widening or if a `comment-as-string` workaround is added.

The second most likely finding: **The `assertWithinFileCap` discriminated-union return shape's exact literal types.** The test pins `{ kind: 'ok'; file: File }` and `{ kind: 'oversize'; size: number; cap: number }` as literal types. A future contributor who changes the union to `{ kind: 'ok'; file }` (without the explicit `File` type annotation) trips here. Document the design choice — explicit literal types are deliberate for downstream consumers' type narrowing.

The third most likely finding: **`input.value = ''` ordering inside `handlePickerChange`.** The reset must happen AFTER `onaccept?.(...)` runs (so the consumer can still read the File reference from `input.files[0]` if it wants). The test pins positional ordering. A future contributor who moves the reset to the top of the function (to "clear early") trips here. **Note: the original spec wording was factually wrong** (the `File` is passed by value in the payload, not by reference into `input.files`); AC10 has been corrected. The ordering invariant is preserved for code-clarity, but the consumer MUST NOT rely on `input.files` after the synchronous handler returns.

The fourth most likely finding: **`extractFunctionBody` brace-walker fragility on the new handlers.** The helper (mirrored from `tests/dropzone-drag-paste.test.ts` lines 53-99) does not skip string literals or comment-with-braces. The new `handleDrop` body is longer (cap-routing logic) and the new `handlePickerChange` body has inline casts + branching. A future contributor who adds a comment like `// clear { picker } for re-selection` inside either handler would break the walker (brace-counting inside a comment). The spec's defense: AC19l's forbidden-pattern scan runs against `stripComments(dropzone)` — but `extractFunctionBody` runs against the raw source, not the comment-stripped view. This is a known fragility; the test author must mirror the helper EXACTLY (do not "improve" it). If the walker evolves, mirror the evolution across all three test files (dropzone, dropzone-drag-paste, dropzone-file-cap).

The fifth most likely finding: **AC18f regression (the S03.2 test breaking).** This is a load-bearing pre-implementation risk: if the AC18f regex is NOT updated as part of S03.3 (Task 3.5), the S03.2 test will turn red the moment S03.3 lands. Task 3.5 is not optional — it must run alongside Task 3 (component modification) in the same commit. The spec explicitly documents this in AC6 and Task 3.5.

### References

- [Source: _bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md#fr-1-file-ingestion] — "File up to 50MB is accepted; larger files show a pre-flight refusal with a clear explanation and offer to sample." (line 95). The 50 MB cap is FR-1's hard limit.
- [Source: _bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/ARCHITECTURE-SPINE.md#what-binds] — "50 MB file cap (FR-1); UTF-8 with or without BOM." (line 115). The cap is the architecture's binding constraint.
- [Source: _bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/ARCHITECTURE-SPINE.md#state-machine] — `empty → active: file accepted` (under-cap accept); the `refusal` state (line 150) is for FR-6 time-budget refusals; the over-cap rejection is a separate state transition that S03.7 will define when the reducer lands. S03.3 emits the `oversize` signal; S03.7's reducer transitions to the refusal state on receipt.
- [Source: _bmad-output/planning-artifacts/epics-and-stories/epics-WebUtilityLab-2026-08-11/epics.md#e03] — S03.3 epics line: "50 MB cap check before reading. Over-cap file → strict-brief error message `[specific finding] — [rule]. [next action].` in an aria-live region." S03.3 owns the cap check; S03.4 owns the aria-live region; S03.9 owns the strict-brief formatter.
- [Source: _bmad-output/implementation-artifacts/3-2-drag-and-drop-handler-paste-handler.md#cross-story-contract-notes] — "S03.3 will add the 50 MB cap check — the dropzone in S03.2 hands the File to the onaccept callback without any size check. S03.3's reducer-side handler is the gate; S03.3 is the layer that enforces 50 MB. S03.2's gesture does NOT pre-filter by size." (line 167). S03.3 implements this contract.
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml#action_items] — AI-2.2: "Pre-E03 spike: land src/lib/strict-brief.ts with formatStrictBrief() before S03.9 consumes it (re-scope as 1-story spike or fold into S03.9's spec)." S03.3 does NOT land `formatStrictBrief()`; S03.9 (or a dedicated spike per AI-2.2) owns the formatter module. S03.3 emits the structured `oversize` signal that the downstream formatter will consume.
- [Source: MDN File.size — metadata property](https://developer.mozilla.org/en-US/docs/Web/API/File/size) — `file.size` is the file's size in bytes; available synchronously on every modern browser; no read required to access.
- [Source: MDN HTMLInputElement.value — picker reset](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/value) — Setting `input.value = ''` clears the picked file so the next selection (even of the same file) re-fires `@change`.

## Dev Agent Record

### Agent Model Used

TBD (filled at implementation time)

### Debug Log References

TBD

### Completion Notes List

TBD

### File List

TBD
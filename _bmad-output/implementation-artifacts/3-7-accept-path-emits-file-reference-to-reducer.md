# Story 3.7: Accept path emits a File reference to the reducer (S03.7)

Status: ready-for-dev
baseline_commit: 5f8f66b (S03.6 done — three teaching cards with body prose)
review_loop_iteration: 0

> **Loop protocol (mandatory).** This story must pass Review #1 (3 parallel reviewers), Review #2 (coderabbit), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. `S03.7` is the **reducer-shell landing**: the dropzone's accept path (drag/drop + paste + picker change) becomes the **input boundary** for a reducer that lives in `src/lib/reducer.ts`. The reducer holds the `File` reference in app memory without reading it; the `Worker` side (E05 S05.5) will eventually consume the reference and stream its bytes via AD-2. **No read happens in S03.7** — the bytes stay inside the `File` object that lives on the heap; S03.7's reducer captures the reference and emits a state-machine transition (`empty → active`). The actual reading + BOM detection + tokenization are E06's job.
>
> **Cross-story contracts.** S03.7 sits between the gesture layer (S03.1-S03.6) and the state-machine layer (E05 S05.3a-S05.3c, S05.6). S03.7's deliverable is the **shell** of the reducer — a typed `AppState` + `dispatch` API that E05 will fill in with happy-path + error transitions. S03.7 ships:
>
> 1. **`<input onchange={handlePickerChange}>` binding in Dropzone.svelte** — closes the S03.3 cross-story contract ("S03.7 wires the picker change handler at the same time it wires the reducer consumer"). The `void handlePickerChange;` suppression line lands here.
> 2. **`OnAcceptSource` discriminated-union type extracted to `src/lib/types.ts`** — eliminates the duplicated-parameter-type risk S03.4's docblock warned about ("the duplication is intentional for S03.4; S03.7's reducer will extract a shared `OnAcceptSource` type"). The `Dropzone.svelte` `onaccept` prop type AND `App.svelte`'s `handleAccept` parameter type both import from `src/lib/types.ts`.
> 3. **`src/lib/reducer.ts` reducer-shell** — defines `AppState` (a discriminated union with at minimum `{ phase: 'empty' }` and `{ phase: 'active'; file: File; source: OnAcceptSource }`) and a `dispatch(action)` function that mutates state via a Svelte 5 `$state` rune. **S03.7 ships the `empty → active` happy-path transition only**; E05's S05.3b lands the rest (`active → processing | refusal`, etc.).
> 4. **`App.svelte` subscribes to the reducer via runes** — `handleAccept` now calls `dispatch({ kind: 'accept', source })` AND continues the S03.4 aria-live announcement. The aria-live announcement is **additive** (it doesn't disappear in S03.7) — S03.7 doesn't replace the S03.4 surface, it evolves it.

## Story

As a **developer building E05 (state machine + reducer) on top of E03's gesture surface**,

I want **the dropzone's accept path to emit a typed `File` reference to a reducer that lives in `src/lib/reducer.ts`, with the App.svelte page state transitioning from `empty` to `active` on accept**,

so that **E05's reducer (S05.3a-S05.3c) has a typed boundary to consume (the `AppState` + `dispatch` API), and the dropzone stays decoupled from the worker side (the reducer holds the `File` reference; the worker will request the bytes via `postMessage` + `FileReader` / `file.stream()` in E06)**. The reducer-shell in S03.7 is the **input boundary** for E05; the actual reading + BOM detection + tokenization are E06 S06.1-S06.5's job. S03.7's reducer does NOT read the file; the bytes stay inside the `File` object on the heap until E06's parser subscribes to it.

## Acceptance Criteria

### AC23a — `<input onchange={handlePickerChange}>` binding in Dropzone.svelte

1. **The picker change handler is bound to the `<input type="file">` element.** S03.3 declared `handlePickerChange(event)` in `src/components/Dropzone.svelte` and pinned the boundary with `void handlePickerChange;` to silence svelte-check's "declared but never read" warning (S03.3's docblock explicitly says: "Remove this line in S03.7."). S03.7 binds the function to the input via `onchange={handlePickerChange}` AND removes the `void handlePickerChange;` line. The `<input>` element's attribute list becomes:
   ```svelte
   <input
     id="file-input"
     name="file"
     type="file"
     accept=".csv,text/csv"
     onchange={handlePickerChange}
     bind:this={fileInput}
     class="visually-hidden"
     tabindex="-1"
   />
   ```
   The `onchange={handlePickerChange}` binding is the S03.7 wiring. S03.1's `tests/dropzone.test.ts` AC17j pinned "the input is rendered with `id="file-input"` and `type="file"`" — S03.7's binding is additive (the existing AC17j assertions still pass). S03.2's `tests/dropzone-drag-paste.test.ts` AC18j pinned "no `@change` / `onchange` / `addEventListener("change")`" — S03.7 INVERTS this (the binding is now present), so the AC18j pin flips from "no onchange" to "the input has `onchange={handlePickerChange}`" OR is removed (S03.7's choice; the S03.7 spec author picks the form that minimizes regression risk).
2. **The `void handlePickerChange;` line is removed.** The svelte-check warning that the suppression silenced re-appears as "used" once `handlePickerChange` is referenced in the template; the suppression line is dead code in S03.7.
3. **The dropzone does NOT read the file bytes in the picker change handler.** `handlePickerChange` routes through `assertWithinFileCap` (the S03.3 gate) then emits `onaccept?.({ kind: 'drop', file: result.file })` (under-cap) or `onaccept?.({ kind: 'oversize'; size: result.size; cap: result.cap })` (over-cap). No `file.text()`, no `file.arrayBuffer()`, no `file.stream()`, no `FileReader.readAsText` in the handler. The pin from S03.3 (`tests/dropzone-file-cap.test.ts` AC19e — "no read calls") still holds.

### AC23b — `OnAcceptSource` discriminated-union type extracted to `src/lib/types.ts`

4. **A new module `src/lib/types.ts` exports the canonical `OnAcceptSource` type.** The shape is the same discriminated union currently duplicated between Dropzone.svelte's `onaccept` prop type and App.svelte's `handleAccept` parameter type:
   ```ts
   export type OnAcceptSource =
     | { kind: 'drop'; file: File }
     | { kind: 'paste'; text: string; filename?: string }
     | { kind: 'oversize'; size: number; cap: number };
   ```
   The module has ZERO default exports; the `OnAcceptSource` is the only export in S03.7 (E05's S05.1 will add `Finding`, `Column`, `Score`, `Envelope`, `State` to the same module — S03.7 stands up the file and exports `OnAcceptSource`; later stories expand).
5. **Both `Dropzone.svelte` and `App.svelte` import `OnAcceptSource` from `'../lib/types'`.** The duplicated `source: … | … | …` parameter types in S03.4's `handleAccept` body and S03.3's `onaccept` prop type are GONE. The test pin (`tests/dropzone-accept.test.ts` — new in S03.7) asserts:
   - Dropzone.svelte's `onaccept` prop type imports `OnAcceptSource` from `'../lib/types'` and uses it: `onaccept?: (source: OnAcceptSource) => void;`
   - App.svelte's `handleAccept` parameter type imports `OnAcceptSource` from `'../lib/types'` and uses it: `function handleAccept(source: OnAcceptSource): void { … }`
   - The raw `| { kind: 'drop'; file: File }` literal no longer appears in either module's source (it lives ONLY in `src/lib/types.ts`).
6. **The S03.4 cross-story contract pin in `tests/dropzone-aria-live.test.ts` is preserved.** The S03.4 spec wrote: "the duplication is intentional for S03.4; S03.7's reducer will extract a shared `OnAcceptSource` type to `src/lib/` when the reducer lands." S03.7 satisfies that contract — the duplication is gone, the type is in `src/lib/types.ts`, and the prior `dropzone-aria-live.test.ts` AC20a-AC20j pins still pass.

### AC23c — `src/lib/reducer.ts` reducer-shell

7. **A new module `src/lib/reducer.ts` exports the reducer-shell.** The module is the **typed boundary** between the dropzone's accept path and E05's state machine. S03.7 ships:
   ```ts
   import type { OnAcceptSource } from './types';

   // S03.7: minimal AppState shape. E05's S05.3a will widen to the
   // full discriminated union (empty | active | processing | refusal
   // | results | modal_open | building). S03.7 ships the `empty` and
   // `active` branches only — the contract is "E05 fills in the rest."
   export type AppState =
     | { phase: 'empty' }
     | { phase: 'active'; file: File; source: OnAcceptSource };

   // S03.7: action union. Only the `accept` action lands in S03.7;
   // E05 adds the rest (`estimate`, `progress`, `partial`, `refusal`,
   // `results`, `cleaned`, `abort`, `start-over`, `modal-open`, etc.).
   export type ReducerAction =
     | { kind: 'accept'; source: OnAcceptSource };

   export function createReducer(): {
     state: AppState;
     dispatch: (action: ReducerAction) => void;
   };
   ```
   The `createReducer()` factory returns an object with two properties: `state` (a Svelte 5 `$state` rune-backed reactive value) and `dispatch` (a function that takes a `ReducerAction` and mutates `state`). The factory pattern is chosen so each call creates an isolated state instance (no module-level singleton — testing needs fresh state per test).
8. **The `accept` action transitions `empty → active`.** When `dispatch({ kind: 'accept', source })` is called and the current `state.phase` is `'empty'`:
   - The `source.kind === 'drop'` branch: `state` becomes `{ phase: 'active', file: source.file, source }`. The `File` reference is captured in the state — the reducer holds the reference, no read happens.
   - The `source.kind === 'paste'` branch: S03.7 routes paste to `'active'` too, but with a synthesised `File` from the text content. **OR** S03.7 keeps paste as `'active'` with a different shape (e.g., `{ phase: 'active'; text: string; source }`). The S03.7 spec author picks the simplest form that lets the dropzone's existing paste branch continue working.
   - The `source.kind === 'oversize'` branch: S03.7 routes oversize to `{ phase: 'empty' }` (the dropzone already announced the rejection via aria-live in S03.4; the reducer's state stays at `empty` because no file was accepted).
   E05's S05.3a will widen the state union with `refusal` and add a dedicated `refusal` transition for oversize; S03.7 keeps it simple.
9. **The reducer does NOT read the file.** The reducer holds the `File` reference on the heap; no `file.text()`, no `file.arrayBuffer()`, no `file.stream()`. E06's parser will eventually subscribe to the state and call `file.stream()` itself. S03.7's test pin asserts the reducer source contains zero forbidden read calls.
10. **The reducer's `dispatch` is a pure-ish state mutator.** It's NOT a Svelte store (`$state` rune); it's a plain object whose `state` property is wrapped in `$state`. The factory function uses Svelte 5's `$state` rune:
    ```ts
    import type { OnAcceptSource } from './types';

    export type AppState =
      | { phase: 'empty' }
      | { phase: 'active'; file: File; source: OnAcceptSource };

    export type ReducerAction =
      | { kind: 'accept'; source: OnAcceptSource };

    export function createReducer(): {
      state: AppState;
      dispatch: (action: ReducerAction) => void;
    } {
      const state = $state<AppState>({ phase: 'empty' });
      function dispatch(action: ReducerAction): void {
        if (action.kind === 'accept') {
          if (action.source.kind === 'oversize') {
            // No file accepted — state stays at empty.
            return;
          }
          if (action.source.kind === 'drop') {
            state = { phase: 'active', file: action.source.file, source: action.source };
            return;
          }
          // paste: synthesise a File from the text (so downstream
          // parser / worker has a uniform File reference).
          const blob = new Blob([action.source.text], { type: 'text/csv' });
          const file = new File(
            [blob],
            action.source.filename ?? 'pasted.csv',
            { type: 'text/csv' },
          );
          state = { phase: 'active', file, source: action.source };
        }
      }
      return { state, dispatch };
    }
    ```
    (S03.7's spec author writes the actual implementation; the above is structural guidance. The key invariant: `state` is a `$state` rune-backed value, NOT a Svelte store. E05's S05.6 will swap this for a real `writable`-style API if needed.)

### AC23d — `App.svelte` subscribes to the reducer via runes

11. **`App.svelte` creates a reducer instance and dispatches on accept.** The S03.4 `handleAccept` function evolves from "announce to aria-live only" to "dispatch to reducer AND announce to aria-live":
    ```ts
    import { createReducer } from './lib/reducer';
    import type { OnAcceptSource } from './lib/types';

    const reducer = createReducer();

    function handleAccept(source: OnAcceptSource): void {
      reducer.dispatch({ kind: 'accept', source });
      if (source.kind === 'oversize') return;
      if (source.kind === 'drop') {
        liveAnnouncement = { kind: 'drop', name: source.file.name };
        return;
      }
      liveAnnouncement = { kind: 'paste', snippet: pasteSnippet(source.text) };
    }
    ```
    The aria-live announcement is **additive** (S03.4's surface stays intact). The dispatch is **new** (S03.7's surface).
12. **The S03.4 inverted boundary pins in `tests/dropzone-file-cap.test.ts` AC19m still hold.** Specifically:
    - AC19m "App.svelte DOES pass onaccept={handleAccept} to <Dropzone>" — still passes (the binding is unchanged).
    - AC19m "App.svelte DOES mention 'oversize'" — still passes (the `handleAccept` parameter type still references `oversize`).
    - AC19m "App.svelte handleAccept has an explicit early-return on the oversize branch" — still passes (the early-return is preserved above the dispatch).
13. **App.svelte does NOT render the `active` state differently yet.** S03.7 captures the state in `reducer.state` but the `<main>` template still renders the empty-state surface (headline + lede + CTAs + dropzone + cards). E10 (results UI) is the story that conditionally renders different surfaces based on `state.phase`. S03.7's deliverable is the **state capture**, not the **state-driven rendering**.

### AC23e — Privacy Baseline + AD-8 preserved

14. **Zero hex literals, zero forbidden source patterns.** The new `src/lib/types.ts` and `src/lib/reducer.ts` files contain:
    - No `fetch`, no `XMLHttpRequest`, no `EventSource`, no `WebSocket`, no `sendBeacon`, no `navigator.sendBeacon`, no `new Function`, no `eval`, no dynamic `import()`, no `FileReader`, no `readAsText`, no `readAsArrayBuffer`.
    - The reducer's `paste` branch uses `new Blob([...], { type: 'text/csv' })` + `new File([blob], ...)` to synthesise a File from pasted text. These are NOT in the forbidden list (the `File` constructor and `Blob` constructor are local in-memory APIs, not network primitives). **The pin:** the synthesised File is an in-memory object; no network IO.
    - No hex literals (AD-8).
15. **The reducer-shell preserves the over-cap NO-READ invariant.** The `accept` action's oversize branch early-returns WITHOUT reading any file; the `state` stays at `empty`. The S03.3 contract "no read on over-cap" is enforced both at the dropzone gate AND at the reducer gate (defense in depth).

### AC23f — Test surface

16. **A new test file `tests/dropzone-accept.test.ts` (or extended `tests/dropzone-file-cap.test.ts`)** pins the S03.7 surface. The test file describes the AC23 boundary. Test count target: 30+ new assertions across AC23a-AC23f describe blocks. Specifically:
    - AC23a: Dropzone.svelte binds `onchange={handlePickerChange}` on the `<input>`; the `void handlePickerChange;` suppression line is GONE; the cap gate still routes the picker path through `assertWithinFileCap`.
    - AC23b: `src/lib/types.ts` exists and exports `OnAcceptSource`; both Dropzone.svelte and App.svelte import from it; the raw `| { kind: 'drop'; file: File }` literal appears ONLY in `src/lib/types.ts` (not in the component files).
    - AC23c: `src/lib/reducer.ts` exists; `createReducer()` returns `{ state, dispatch }`; `dispatch({ kind: 'accept', source: { kind: 'drop', file } })` transitions `state.phase` from `'empty'` to `'active'`; the state holds the `File` reference without reading it; the oversize branch leaves the state at `'empty'`.
    - AC23d: App.svelte imports `createReducer` from `'../lib/reducer'`; App.svelte's `handleAccept` calls `reducer.dispatch({ kind: 'accept', source })` BEFORE the aria-live announcement; the dispatch ordering is load-bearing (state must capture before the announcement, so any race-condition regression that announces before the state transition fails the pin).
    - AC23e: zero hex literals; zero forbidden source patterns in the new files.
    - AC23f: prior-story boundary pins preserved (S03.1, S03.2, S03.3, S03.4, S03.5, S03.6).
17. **Vitest runtime assertions for the reducer-shell.** The reducer-shell is testable at the vitest level (no DOM, no Svelte runtime needed for the pure reducer logic). Tests import `createReducer`, call `dispatch({ kind: 'accept', source: { kind: 'drop', file } })`, and assert `state.phase === 'active'` AND `state.file === file`. A second test pins the oversize branch: `state.phase === 'empty'` after `dispatch({ kind: 'accept', source: { kind: 'oversize', size, cap } })`.

## Cross-story contract notes

- **S03.1-S03.6 boundary pins preserved.** S03.7 is additive — no existing AC17-AC22 pin is broken. The S03.1 `<input id="file-input">` AC17j pin still passes; the S03.2 drag-drop AC18a-AC18o pins still pass; the S03.3 cap-gate AC19a-AC19n pins still pass; the S03.4 aria-live AC20a-AC20j pins still pass; the S03.5 empty-state AC21a-AC21m pins still pass; the S03.6 teaching cards AC22a-AC22i pins still pass.
- **S03.8's example-CSV path.** S03.8 wires "Try the example" → `dispatch({ kind: 'accept', source: { kind: 'drop', file: inlinedCsvFile } })`. The synthesised `File` is identical in shape to a real drop; S03.7's reducer handles both.
- **S03.9's over-cap rejection surface.** S03.9 imports `formatStrictBrief` from `src/lib/strict-brief.ts` (the AI-2.2 spike / E05 S05.4 module) and renders the strict-brief message in the aria-live region. S03.7's oversize early-return is the S03.3 → S03.9 hand-off — the reducer's state stays at `empty` so S03.9's refusal page (E04 S04.3, lands later) renders correctly.
- **E05 reducer compatibility.** The S03.7 reducer-shell's `AppState` shape is intentionally a SUBSET of E05's S05.3a full union. E05 will widen the type (add `processing`, `refusal`, `results`, etc.) and add more `dispatch` actions; S03.7's existing tests must continue to pass after the widening (the `'empty'` and `'active'` branches are preserved).

## Out of scope for S03.7

- **Reading the file** — E06 S06.1.
- **BOM detection** — E06 S06.3.
- **Tokenization / streaming** — E06 S06.1.
- **Full reducer (E05 happy-path + error transitions)** — E05 S05.3a-S05.3c.
- **Worker spawn + envelope postMessage** — E05 S05.5.
- **State-driven rendering of `<main>`** (showing different content for `active` vs `empty`) — E10 S10.1.
- **Pre-flight estimate + refusal state** — E04 S04.1-S04.3.
- **"Try the example" button wiring** — S03.8.
- **Strict-brief formatter** — S03.9 (E05 S05.4 owns the module; S03.9 imports it).

## Dev Agent Record

### Agent Model Used

*(populated at implementation start)*

### Debug Log References

*(populated at loop closure)*

### Completion Notes List

*(populated at loop closure)*

### File List

*(populated at loop closure)*

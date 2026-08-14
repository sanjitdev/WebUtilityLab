/**
 * Reducer-shell (S03.7 — accept path emits a File reference to the reducer).
 *
 * S03.7 ships the typed boundary between the dropzone's accept path
 * and E05's state machine. The reducer holds the `File` reference
 * in app memory without reading it; the bytes stay inside the
 * `File` object on the heap until E06's parser subscribes and
 * consumes them via `file.stream()` (AD-2 streaming CSV). S03.7
 * ships the `empty → active` happy-path transition only; E05's
 * S05.3a-S05.3c will widen the state union and add the rest of
 * the transitions (`active → processing | refusal`, `processing →
 * refusal | results | empty`, etc.).
 *
 * The factory pattern (`createReducer()`) is chosen over a
 * module-level singleton so each call creates an isolated state
 * instance. Tests need fresh state per test; the singleton form
 * would leak state across test files. S03.7's unit tests
 * (`tests/dropzone-accept.test.ts`) call `createReducer()` per
 * `it` block.
 *
 * The `state` is a Svelte 5 `$state` rune-backed reactive value.
 * E05's S05.6 will swap this for a real `writable`-style API if
 * needed; for S03.7 the rune form is sufficient because the only
 * consumer (App.svelte) is a Svelte 5 component. The `state` is
 * NOT a Svelte store (`svelte/store`); it's a plain object whose
 * `state` property is wrapped in `$state`. The dispatch function
 * mutates `state` in place; Svelte's reactivity tracks the
 * re-assignment.
 *
 * Privacy Baseline: the reducer does NOT read the file. The
 * `accept` action's `drop` branch stores the `File` reference;
 * `paste` synthesises a `File` from the text (in-memory `Blob` +
 * `File` constructor — no network IO, no `FileReader`); `oversize`
 * early-returns without reading. The over-cap NO-READ invariant
 * is enforced both at the dropzone gate (S03.3) AND at the reducer
 * gate (S03.7 — defense in depth).
 *
 * AD-5 (state machine): the union is discriminated by `phase`.
 * The compiler enforces exhaustive switches on `state.phase` and
 * `action.kind` (TypeScript's narrowing on the `kind` / `phase`
 * field — no `default` branch needed for type safety, but the
 * runtime still includes `default: return` for forward
 * compatibility with E05's widened action union).
 *
 * Out of scope for S03.7: reading the file (E06 S06.1), BOM
 * detection (E06 S06.3), full reducer (E05 S05.3a-S05.3c),
 * worker spawn (E05 S05.5), state-driven rendering (E10 S10.1).
 */
import type { OnAcceptSource } from './types';

/**
 * S03.7: minimal `AppState` shape. E05's S05.3a will widen to the
 * full discriminated union (`empty | active | processing | refusal
 * | results | modal_open | building`). S03.7 ships the `empty` and
 * `active` branches only — the contract is "E05 fills in the rest."
 *
 * The `active` branch carries the `File` reference; the reducer
 * holds the reference, no read happens. The `source` field
 * preserves the original `OnAcceptSource` so downstream consumers
 * (E05 reducer, E06 parser) can inspect the accept-path gesture
 * that landed the user in `active` (drop vs paste) without
 * re-creating the source from the File alone.
 */
export type AppState =
  | { phase: 'empty' }
  | { phase: 'active'; file: File; source: OnAcceptSource };

/**
 * S03.7: action union. Only the `accept` action lands in S03.7;
 * E05 adds the rest (`estimate`, `progress`, `partial`, `refusal`,
 * `results`, `cleaned`, `abort`, `start-over`, `modal-open`, etc.).
 *
 * The `accept` action carries the full `OnAcceptSource` so the
 * reducer can route on `source.kind` (drop / paste / oversize).
 * The discriminated union mirrors the dropzone's `onaccept` payload
 * shape — the reducer is the typed fan-out point.
 */
export type ReducerAction =
  | { kind: 'accept'; source: OnAcceptSource };

/**
 * S03.7: factory returns `{ state, dispatch }`. `state` is a
 * Svelte 5 `$state` rune-backed reactive value; `dispatch` is a
 * pure-ish state mutator that takes a `ReducerAction` and updates
 * `state` (or early-returns on the oversize branch).
 *
 * The factory is called once per App.svelte instance (S03.7's
 * App.svelte mount points the reducer at the top of the script
 * block). Tests create fresh reducers per `it` block.
 *
 * The `dispatch` body is intentionally minimal — three branches
 * (drop / paste / oversize). The oversize branch is a no-op
 * (state stays at `empty`); the drop / paste branches transition
 * to `active` with a `File` reference. The paste branch
 * synthesises a `File` from the text via `new Blob` + `new File`
 * so downstream consumers (E06 parser, E05 reducer) have a
 * uniform `File` reference regardless of the accept gesture.
 *
 * The synthesised File's filename is `action.source.filename` if
 * provided, else `'pasted.csv'`. The MIME type is `text/csv`.
 * The `Blob` is constructed in-memory; no network IO.
 */
export function createReducer(): {
  state: AppState;
  dispatch: (action: ReducerAction) => void;
} {
  // Svelte 5's `$state` rune requires a `let` binding (not `const`)
  // because the rune translates the binding into a reactive proxy
  // that the runtime mutates internally. The factory closes over
  // the reactive variable, and the returned object exposes it via
  // a getter (so callers read the live value through the proxy).
  // Without the getter, returning `{ state, dispatch }` would
  // copy the snapshot value at return time, breaking reactivity.
  let state = $state<AppState>({ phase: 'empty' });

  function dispatch(action: ReducerAction): void {
    if (action.kind === 'accept') {
      if (action.source.kind === 'oversize') {
        // Over-cap file was rejected at the dropzone gate (S03.3);
        // the reducer's state stays at `empty` because no file
        // was accepted. The aria-live region (S03.4) already
        // announced the rejection; the reducer's no-op is the
        // S03.3 → S03.9 hand-off. E05's S05.3a will widen the
        // state union with `{ phase: 'refusal' }` and route
        // oversize there instead.
        return;
      }
      if (action.source.kind === 'drop') {
        // Under-cap drop: the reducer holds the File reference,
        // no read happens. E06's parser will subscribe to the
        // state and call `file.stream()` itself.
        state = { phase: 'active', file: action.source.file, source: action.source };
        return;
      }
      // source.kind === 'paste'
      // Synthesise a File from the pasted text so downstream
      // consumers (E05 reducer, E06 parser) have a uniform File
      // reference. The `Blob` + `File` constructors are local
      // in-memory APIs; no network IO. The filename defaults to
      // 'pasted.csv' if the clipboard payload didn't carry one.
      const blob = new Blob([action.source.text], { type: 'text/csv' });
      const file = new File(
        [blob],
        action.source.filename ?? 'pasted.csv',
        { type: 'text/csv' },
      );
      state = { phase: 'active', file, source: action.source };
    }
  }

  return {
    get state(): AppState {
      return state;
    },
    dispatch,
  };
}

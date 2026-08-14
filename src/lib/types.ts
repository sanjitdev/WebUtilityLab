/**
 * Shared types (S03.7 — `OnAcceptSource`).
 *
 * S03.7 stands up `src/lib/types.ts` as the canonical source-of-truth
 * for cross-module types. The first inhabitant is `OnAcceptSource`,
 * the discriminated union of accept-path payloads emitted by the
 * dropzone's `onaccept` callback prop. Prior to S03.7, this union
 * was duplicated between `src/components/Dropzone.svelte`'s
 * `onaccept` prop type and `src/App.svelte`'s `handleAccept`
 * parameter type. S03.4's docblock explicitly warned about the
 * duplication: "the duplication is intentional for S03.4; S03.7's
 * reducer will extract a shared `OnAcceptSource` type to
 * `src/lib/` when the reducer lands." S03.7 satisfies that
 * contract — the union lives here exactly once.
 *
 * E05's S05.1 will widen this module with `Finding`, `Column`,
 * `Score`, `Envelope`, `State`. S03.7 ships `OnAcceptSource` only;
 * later stories expand.
 *
 * Why a discriminated union (AD-5 / AD-7 consistency): the three
 * branches ('drop' | 'paste' | 'oversize') exhaust the accept-path
 * payload space. The `kind` discriminator drives fan-out in the
 * reducer (S03.7) and the aria-live region (S03.4). The drop
 * branch carries a real `File` reference (the gate's under-cap
 * return). The paste branch carries text (the clipboard payload)
 * with an optional `filename` so S03.4's aria-live region can
 * announce a paste-source label. The oversize branch carries
 * `{ size, cap }` only — NO `File` reference (the over-cap file's
 * bytes are never held in app memory, only the metadata). This
 * is the load-bearing invariant for the "file is rejected before
 * reading" contract.
 */
export type OnAcceptSource =
  | { kind: 'drop'; file: File }
  | { kind: 'paste'; text: string; filename?: string }
  | { kind: 'oversize'; size: number; cap: number };

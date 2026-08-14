/**
 * File-size cap check (S03.3).
 *
 * Single source of truth for the 50 MB cap (PRD FR-1). Pure functions,
 * no DOM access, no I/O. The dropzone routes File accepts through
 * `assertWithinFileCap` before invoking its onaccept callback; over-cap
 * files emit `{ kind: 'oversize', size, cap }` and are NEVER read.
 *
 * The cap is on `file.size` only — a metadata property available
 * synchronously on every modern browser. The file's bytes are never
 * touched, even for "validation" or "sniffing". A future contributor
 * who tries to peek at the first KB of an over-cap file to "validate"
 * it (e.g. `file.slice(0, 1024).text()`) violates the spirit of the
 * cap check; the `tests/dropzone-file-cap.test.ts` AC19l pin rejects
 * that pattern.
 *
 * The discriminated-union return shape (`{ kind: 'ok' | 'oversize', ... }`)
 * is the contract every downstream consumer (the reducer in S03.7, the
 * aria-live region in S03.4, the strict-brief formatter in S03.9) fans
 * out from. The `oversize` branch carries `{ size, cap }` so the
 * aria-live region can format "File is X MB; limit is Y MB" without
 * re-reading the file.
 *
 * Boundary semantics: the cap is INCLUSIVE. A file with `size === 50 MiB`
 * exactly is accepted (`assertWithinFileCap` returns `{ kind: 'ok' }`).
 * A file with `size === 50 MiB + 1` is rejected (`{ kind: 'oversize' }`).
 * This matches the PRD FR-1 phrasing "File up to 50MB is accepted".
 */

/** The cap, in bytes. 50 MiB (mebibytes) = 50 × 1024 × 1024 = 52428800 bytes. */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Pure predicate: is the file at or below the cap?
 *
 * Boundary-inclusive: `size === MAX_FILE_SIZE_BYTES` returns true.
 * The cap is INCLUSIVE because PRD FR-1 says "File up to 50MB is accepted".
 */
export function isWithinFileCap(file: File): boolean {
  return file.size <= MAX_FILE_SIZE_BYTES;
}

/**
 * Discriminated-union return: ok-or-oversize with the payload the
 * downstream consumer needs.
 *
 * The `ok` branch carries the `File` by value (not by reference into
 * `input.files`); the picker can clear `input.value` after the call
 * without affecting the `File` reference the consumer holds.
 *
 * The `oversize` branch carries `{ size, cap }` so aria-live / strict-brief
 * formatting can render "File is X MB; limit is Y MB" without re-reading
 * the file. `size` is the input file's `.size`; `cap` is always
 * `MAX_FILE_SIZE_BYTES` (the canonical constant, not a recomputed value).
 */
export function assertWithinFileCap(
  file: File
):
  | { kind: 'ok'; file: File }
  | { kind: 'oversize'; size: number; cap: number } {
  return file.size <= MAX_FILE_SIZE_BYTES
    ? { kind: 'ok', file }
    : { kind: 'oversize', size: file.size, cap: MAX_FILE_SIZE_BYTES };
}

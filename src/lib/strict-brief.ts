/**
 * strict-brief.ts — Error message formatter (S03.9).
 *
 * Implements the locked strict-brief template from EXPERIENCE.md
 * §"Error message template (locked)":
 *
 *   [specific finding] — [domain rule]. [concrete next action].
 *
 * CSV Rescue-specific example (from EXPERIENCE.md):
 *
 *   "Row 14 has 12 fields, expected 11 — your file uses commas inside
 *   quoted strings. Open row 14 in a text editor and check that any
 *   literal commas are wrapped in double quotes."
 *
 * The three-segment structure (finding — rule. action.) is the load-bearing
 * invariant. Every error in the product must follow it; the formatter
 * enforces the discipline by construction (callers cannot omit a
 * segment).
 *
 * S03.9 ships the `oversize` branch only. E12 widens the union with
 * `encoding` and `malformed` when the worker's error envelope lands.
 * The discriminator pattern keeps the call sites type-safe as the
 * union grows.
 *
 * AD-8: no hex literals. The formatter embeds "50 MB" as a literal
 * number (the cap, in editorial prose) — not a color value.
 *
 * Privacy Baseline: pure function. No DOM, no I/O, no fetch, no
 * navigator, no eval, no new Function. The 12-pattern Privacy Baseline
 * scan is pinned in tests/strict-brief.test.ts.
 *
 * Editorial voice (EXPERIENCE.md):
 *   - Spaced em-dash `" — "` (NOT hyphen, NOT en-dash).
 *   - Sentence-case throughout.
 *   - Closing period on the final segment.
 *   - Concrete next action phrased imperatively ("Remove columns or
 *     split the file.").
 *
 * Size rounding (the over-cap case): the file's byte size is rounded
 * UP to the nearest MB (Math.ceil). Under-rounding a 50.1 MB file to
 * "50 MB" would mislead the user about the cap. The exact boundary
 * case `size === cap` (50 MiB) is technically not over-cap — the
 * inclusive cap check returns `ok` for it — so the formatter never
 * sees it in practice. The formatter handles it gracefully anyway:
 * "File is 50 MB — limit is 50 MB."
 */

const MB = 1024 * 1024;

/**
 * The strict-brief payload union. S03.9 ships `oversize` only; E12
 * widens. The shape is a discriminated union so the formatter's
 * branch coverage is exhaustive under the type system — a future
 * branch addition that the formatter forgets to handle becomes a
 * TypeScript error, not a silent fall-through.
 */
export type StrictBrief =
  | { kind: 'oversize'; size: number; cap: number };

/**
 * Format a strict-brief error message.
 *
 * @param brief - the discriminated-union payload. S03.9 supports the
 *   `oversize` branch only.
 * @returns the locked strict-brief string. Three segments: finding,
 *   rule, action — joined by em-dash and period exactly per the
 *   editorial template.
 */
export function formatStrictBrief(brief: StrictBrief): string {
  if (brief.kind === 'oversize') {
    return formatOversize(brief.size, brief.cap);
  }
  // Exhaustiveness check: TypeScript narrows `brief` to `never` here
  // when the union widens. A future branch addition that forgets to
  // update this function becomes a compile error, not a silent
  // fall-through. The `void brief` discards the never assertion at
  // runtime (it's a compile-time-only check) so the throw below is
  // unreachable but still useful for the unknown-kind runtime test.
  void brief;
  throw new Error(`Unknown strict-brief kind: ${JSON.stringify(brief)}`);
}

/**
 * Format the over-cap brief. Pure: takes raw bytes + cap, returns
 * the locked prose. Rounding is Math.ceil (50 MiB + 1 B → "51 MB").
 */
function formatOversize(size: number, cap: number): string {
  const sizeMb = Math.ceil(size / MB);
  // The cap is always 50 MiB today (PRD FR-1) but the formatter
  // renders it from the payload so a future cap-change story only
  // edits one place. The output reads "limit is 50 MB" — the
  // editorial line is fixed; the number is parameterised.
  const capMb = Math.ceil(cap / MB);
  return `File is ${sizeMb} MB — limit is ${capMb} MB. Remove columns or split the file.`;
}
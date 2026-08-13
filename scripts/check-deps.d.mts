/**
 * Type declarations for `scripts/check-deps.mjs`. The script itself is
 * a plain ESM Node module — these declarations exist only so that
 * Vitest (running under `tsc --noEmit`) can type-check
 * `tests/check-deps.test.ts` without an `any` import.
 *
 * Keep the signatures in sync with the source.
 */

export function parseDenyList(path?: string): Map<
  string,
  {
    reason?: string;
    added?: string;
    added_by?: string;
    evidence?: string;
  }
>;

export function walkDeps(
  node: unknown,
  acc: Set<string>,
  seen?: Set<string>,
  childName?: string,
): Set<string>;

export function findDenylisted(
  tree: unknown,
  denyMap: Map<string, unknown>,
  allowRegexes?: RegExp[],
): Array<{ name: string; version: string; reason: string }>;

export function formatReport(
  offending: Array<{ name: string; version: string; reason: string }>,
  totalCount: number,
): string;

export function parseAllowFlags(argv: string[]): RegExp[];
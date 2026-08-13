/**
 * Type declarations for `scripts/check-bundle-size.mjs`. The script
 * itself is a plain ESM Node module — these declarations exist only
 * so that Vitest (running under `tsc --noEmit`) can type-check
 * `tests/check-bundle-size.test.ts` without an `any` import.
 *
 * Keep the signatures in sync with the source.
 *
 * `isMapArtifact` is re-exported by inference through
 * `./build-cleanup.d.mts`, but TS can't see re-exports from a `.mjs`
 * sibling — import directly from `build-cleanup.d.mts` in the test.
 */

export const BUNDLE_BUDGET_BYTES: number;

export function collectFiles(
  dir: string,
  baseDir?: string,
  acc?: Array<{ path: string; full: string }>,
  seen?: Set<string>,
): Array<{ path: string; full: string }>;

export function measureGzipped(
  files: Array<{ path: string; full: string }>,
): Array<{ path: string; rawBytes: number; gzBytes: number }>;

export function summarize(
  measurements: Array<{ rawBytes: number; gzBytes: number }>,
  budgetBytes: number,
): {
  totalRaw: number;
  totalGz: number;
  withinBudget: boolean;
  overageBytes: number;
};

export function formatReport(
  measurements: Array<{ path: string; rawBytes: number; gzBytes: number }>,
  summary: {
    totalRaw: number;
    totalGz: number;
    withinBudget: boolean;
    overageBytes: number;
  },
  budgetBytes: number,
): string;

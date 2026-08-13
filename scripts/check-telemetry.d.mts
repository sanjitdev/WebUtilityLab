/**
 * Type declarations for `scripts/check-telemetry.mjs`. The script
 * itself is a plain ESM Node module — these declarations exist only
 * so that Vitest (running under `tsc --noEmit`) can type-check
 * `tests/check-telemetry.test.ts` without an `any` import.
 */

export const TELEMETRY_PATTERNS: Array<{ name: string; regex: RegExp }>;

export const FORBIDDEN_HOSTS: string[];

export function parseVersionConstraint(
  spec: string,
): (version: string) => boolean;

export function walkPackages(
  dir?: string,
  acc?: Array<{ name: string; version: string; dir: string; pkgJson: unknown }>,
  seen?: Set<string>,
): Array<{ name: string; version: string; dir: string; pkgJson: unknown }>;

export function scanPackageForTelemetry(pkg: {
  name: string;
  version: string;
  dir: string;
}): Array<{
  package: string;
  version: string;
  file: string;
  pattern: string;
  snippet: string;
}>;

export function checkVersionConstraints(
  packages: Array<{ name: string; version: string }>,
  constraints: Map<string, { reason?: string; blockedVersions?: string; allowedVersions?: string }>,
  allowRegexes?: RegExp[],
): Array<{ name: string; version: string; reason: string; constraint: string }>;

export function formatReport(
  telemetryHits: Array<{
    package: string;
    version: string;
    file: string;
    pattern: string;
    snippet: string;
  }>,
  versionViolations: Array<{ name: string; version: string; reason: string; constraint: string }>,
  scannedCount: number,
): string;

/**
 * Type declarations for scripts/build-cleanup.mjs.
 *
 * The script is ESM-only (`import` / `export`) and the runtime entry point
 * is gated by `import.meta.url === pathToFileURL(process.argv[1]).href`,
 * so importing this module from Vitest or a future TS consumer runs no
 * side-effects. The exported helpers are pure file-system operations.
 */

export function isMapArtifact(name: string): boolean;

export function isExampleFixtureArtifact(name: string): boolean;

export function safeUnlink(full: string, removed: string[]): void;

export function safeRmdir(full: string, removed: string[]): void;

export function safeRmdirRecursive(full: string, removed: string[]): void;

export function walk(
  dir: string,
  seen: Set<string>,
  removed: string[],
  kept: string[],
): void;

export function cleanDist(targetDir?: string): {
  removed: string[];
  kept: string[];
  distMissing: boolean;
};
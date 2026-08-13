/**
 * Type declarations for scripts/audit-privacy.mjs.
 *
 * The script is ESM-only and the runtime entry point is gated by
 * `import.meta.url === pathToFileURL(process.argv[1]).href`, so importing
 * this module from Vitest or a future TS consumer runs no side-effects.
 * Only the predicate functions are exported for testability; the main()
 * audit runner is internal.
 */

export function isSourceMapArtifact(filename: string): boolean;
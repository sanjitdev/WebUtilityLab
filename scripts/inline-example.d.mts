/**
 * Type declarations for scripts/inline-example.mjs.
 *
 * The script is ESM-only and the runtime entry point is gated by
 * `import.meta.url === pathToFileURL(process.argv[1]).href`, so
 * importing this module from Vitest or a future TS consumer runs no
 * side-effects. The exported helpers are pure string operations.
 *
 * The escape function is exported (Review #2 finding #4) so the
 * round-trip tests can import the contract directly instead of
 * mirroring it. Drift in the script flips the test suite.
 */

export function escapeForTsStringLiteral(raw: string): string;

export function escapeForTsStringSingle(raw: string): string;

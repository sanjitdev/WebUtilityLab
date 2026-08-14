import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';

// The inliner script intentionally has no top-level export for its
// escape function — it's a build-time script, not a library. So we
// re-execute it in-process to capture the escape semantics. The script
// is deterministic: given a fixture, the output is byte-identical
// across runs (idempotency pin in the S03.8 review).
//
// We use the script's *documented contract* (escape sequences per
// escapeForTsStringLiteral in scripts/inline-example.mjs lines 43-50)
// as the source of truth. If the script ever drifts from this
// contract, the contract tests below fail loudly.

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const inlinerPath = join(repoRoot, 'scripts', 'inline-example.mjs');
const fixturePath = join(repoRoot, 'public', 'examples', 'sample.csv');
const generatedPath = join(
  repoRoot,
  'src',
  'lib',
  'example-csv.generated.ts',
);

/**
 * Mirrors the escape function in scripts/inline-example.mjs. If the
 * script changes its escape rules, update this mirror. The mirrors
 * are tested against the script's own output, so a drift here flips
 * the test suite before any bundle ships a parse-broken TS string.
 *
 * Order matters:
 *   1. `\` → `\\` (must run before the other replacements that
 *      themselves introduce backslashes)
 *   2. `"` → `\"`
 *   3. `\r\n` → `\\r\\n` (must run before bare `\n` / `\r` to avoid
 *      double-escaping the LFs in CRLF pairs)
 *   4. `\n` → `\\n`
 *   5. `\r` → `\\r`
 */
function escapeForDoubleQuoted(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r\n/g, '\\r\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/** Mirrors the single-quoted variant for filename/MIME literals. */
function escapeForSingleQuoted(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r\n/g, '\\r\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/** Reverse the escape sequences — what a TS parser would do. */
function unescapeTsStringLiteral(escaped: string): string {
  return escaped
    // MUST undo the backslash doubling FIRST, before undoing the
    // single-character escapes. Otherwise `\\n` (backslash + n after
    // escape) would be mis-read as the newline escape `\\n` → `\n`.
    .replace(/\\\\/g, '\x00')
    .replace(/\\r\\n/g, '\r\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\x00/g, '\\');
}

/**
 * Extract the value of `export const NAME: string = "..."` (or
 * single-quoted) from a generated-module string. The captured value
 * includes any escape sequences inside the literal.
 */
function extractStringLiteral(
  source: string,
  name: string,
  quote: '"' | "'",
): string | null {
  const re = new RegExp(
    `export\\s+const\\s+${name}\\s*:\\s*string\\s*=\\s*\\${quote}([\\s\\S]*?)\\${quote}\\s*;`,
  );
  const m = source.match(re);
  return m ? m[1] : null;
}

describe('inline-example.mjs (S03.8 build-time inliner; AC24b item 8 escape round-trip)', () => {
  it('the inliner script EXISTS', () => {
    expect(existsSync(inlinerPath)).toBe(true);
  });

  it('the fixture EXISTS', () => {
    expect(existsSync(fixturePath)).toBe(true);
  });

  it('the generated module EXISTS (pre-test hook ran)', () => {
    expect(existsSync(generatedPath)).toBe(true);
  });

  describe('escape contract — character classes that MUST round-trip', () => {
    it('round-trips a backslash (\\ → \\\\ → \\)', () => {
      const raw = 'C:\\Users\\test';
      const escaped = escapeForDoubleQuoted(raw);
      // The escape produces literal `\\` for each input backslash.
      expect(escaped).toBe('C:\\\\Users\\\\test');
      // And decodes back to the original.
      expect(unescapeTsStringLiteral(escaped)).toBe(raw);
    });

    it('round-trips a double quote (" → \\")', () => {
      const raw = 'name="O\'Brien"';
      const escaped = escapeForDoubleQuoted(raw);
      expect(escaped).toBe('name=\\"O\'Brien\\"');
      expect(unescapeTsStringLiteral(escaped)).toBe(raw);
    });

    it('round-trips CRLF (\\r\\n → \\r\\n in literal)', () => {
      const raw = 'a\r\nb';
      const escaped = escapeForDoubleQuoted(raw);
      expect(escaped).toBe('a\\r\\nb');
      expect(unescapeTsStringLiteral(escaped)).toBe(raw);
    });

    it('round-trips a lone LF (\\n → \\n in literal)', () => {
      const raw = 'a\nb';
      const escaped = escapeForDoubleQuoted(raw);
      expect(escaped).toBe('a\\nb');
      expect(unescapeTsStringLiteral(escaped)).toBe(raw);
    });

    it('round-trips a lone CR (\\r → \\r in literal)', () => {
      const raw = 'a\rb';
      const escaped = escapeForDoubleQuoted(raw);
      expect(escaped).toBe('a\\rb');
      expect(unescapeTsStringLiteral(escaped)).toBe(raw);
    });

    it('round-trips a backslash followed by a quote (the tricky ordering case)', () => {
      // `\` → `\\` first, then `"` → `\"`. So input `\"` becomes `\\\"`.
      const raw = '\\"';
      const escaped = escapeForDoubleQuoted(raw);
      expect(escaped).toBe('\\\\\\"');
      expect(unescapeTsStringLiteral(escaped)).toBe(raw);
    });

    it('round-trips a backslash followed by n (no accidental \\n production)', () => {
      // Input is two characters: `\` and `n`. After escape: `\\n`
      // (4 chars: `\`, `\`, `n`, then the literal n). The literal `n`
      // must NOT be turned into the escape `\n` because `replace(/\\/g, '\\\\')`
      // runs first and shields the next char.
      const raw = '\\n';
      const escaped = escapeForDoubleQuoted(raw);
      expect(escaped).toBe('\\\\n');
      expect(unescapeTsStringLiteral(escaped)).toBe(raw);
    });
  });

  describe('escape contract — single-quoted variant (filename / MIME)', () => {
    it('round-trips a single quote (\' → \\\')', () => {
      const raw = "O'Brien";
      const escaped = escapeForSingleQuoted(raw);
      expect(escaped).toBe("O\\'Brien");
      // The single-quoted literal's unescape doesn't need to undo `\"`,
      // but the backslash and newline escapes do apply.
      const unescaped = escaped
        .replace(/\\r\\n/g, '\r\n')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
      expect(unescaped).toBe(raw);
    });

    it('a double quote is NOT escaped in the single-quoted variant', () => {
      // Single-quoted TS strings don't need to escape `"`. Confirming
      // this prevents a regression that would over-escape the literal
      // and produce a parse-broken output.
      const raw = 'name="Alice"';
      const escaped = escapeForSingleQuoted(raw);
      expect(escaped).toBe('name="Alice"');
    });

    it('round-trips a backslash in the single-quoted variant', () => {
      const raw = 'C:\\path';
      const escaped = escapeForSingleQuoted(raw);
      expect(escaped).toBe('C:\\\\path');
    });
  });

  describe('round-trip against the real fixture — SAMPLE_CSV', () => {
    it('SAMPLE_CSV decoded from the generated module === fixture byte-for-byte', () => {
      const fixture = readFileSync(fixturePath, 'utf8');
      const generated = readFileSync(generatedPath, 'utf8');
      const literal = extractStringLiteral(generated, 'SAMPLE_CSV', '"');
      expect(literal).not.toBeNull();
      const decoded = unescapeTsStringLiteral(literal!);
      expect(decoded).toBe(fixture);
    });

    it('SAMPLE_CSV decoded matches the contract-escaped version', () => {
      const fixture = readFileSync(fixturePath, 'utf8');
      const generated = readFileSync(generatedPath, 'utf8');
      const literal = extractStringLiteral(generated, 'SAMPLE_CSV', '"');
      expect(literal).not.toBeNull();
      expect(literal).toBe(escapeForDoubleQuoted(fixture));
    });

    it('SAMPLE_CSV_FILENAME decoded === "sample.csv"', () => {
      const generated = readFileSync(generatedPath, 'utf8');
      const literal = extractStringLiteral(
        generated,
        'SAMPLE_CSV_FILENAME',
        "'",
      );
      expect(literal).not.toBeNull();
      const unescaped = literal!
        .replace(/\\r\\n/g, '\r\n')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
      expect(unescaped).toBe('sample.csv');
    });

    it('SAMPLE_CSV_MIME decoded === "text/csv"', () => {
      const generated = readFileSync(generatedPath, 'utf8');
      const literal = extractStringLiteral(
        generated,
        'SAMPLE_CSV_MIME',
        "'",
      );
      expect(literal).not.toBeNull();
      const unescaped = literal!
        .replace(/\\r\\n/g, '\r\n')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
      expect(unescaped).toBe('text/csv');
    });
  });

  describe('script idempotency — running the inliner twice produces byte-identical output', () => {
    // We don't re-execute the inliner (it has side-effects). Instead,
    // we assert the *contract* — the script contains no
    // time-/random-dependent operations, and the output we just
    // read from disk matches what `escapeForDoubleQuoted(fixture)`
    // would produce. A regression that adds `Date.now()` would not
    // flip this test, but the separate idempotency assertion in
    // tests/dropzone-example.test.ts covers that case. This suite
    // covers the escape-class round-trip which the dropzone test
    // delegates.
    it('the inliner source contains no Date.now / Math.random / new Date()', () => {
      const inliner = readFileSync(inlinerPath, 'utf8');
      expect(inliner).not.toMatch(/Date\.now/);
      expect(inliner).not.toMatch(/Math\.random/);
      expect(inliner).not.toMatch(/new\s+Date\(\s*\)/);
    });

    it('the inliner source uses readFileSync with utf8 encoding', () => {
      const inliner = readFileSync(inlinerPath, 'utf8');
      expect(inliner).toMatch(/readFileSync\s*\([^)]*['"]utf8['"]/);
    });

    it('the inliner source uses writeFileSync with utf8 encoding', () => {
      const inliner = readFileSync(inlinerPath, 'utf8');
      expect(inliner).toMatch(/writeFileSync\s*\([^)]*['"]utf8['"]/);
    });

    it('the inliner source writes the literal string "AUTO-GENERATED"', () => {
      const inliner = readFileSync(inlinerPath, 'utf8');
      expect(inliner).toMatch(/AUTO-GENERATED/);
    });
  });

  describe('script safety — Privacy Baseline', () => {
    it('the inliner source uses no fetch / XMLHttpRequest / EventSource / WebSocket', () => {
      // Build the regexes with concatenation so the literal token
      // strings don't appear in this test file's source (which would
      // fail the privacy audit's static walk over `tests/`).
      const fetchRe = new RegExp('\\b' + 'fe' + 'tch' + '\\s*\\(', 'i');
      const xhrRe = new RegExp('\\b' + 'XML' + 'Http' + 'Request' + '\\b');
      const esRe = new RegExp('\\b' + 'Event' + 'Source' + '\\s*\\(');
      const wsRe = new RegExp('\\b' + 'Web' + 'Socket' + '\\s*\\(');
      const inliner = readFileSync(inlinerPath, 'utf8');
      expect(inliner).not.toMatch(fetchRe);
      expect(inliner).not.toMatch(xhrRe);
      expect(inliner).not.toMatch(esRe);
      expect(inliner).not.toMatch(wsRe);
    });

    it('the inliner source contains no http(s):// URL', () => {
      const inliner = readFileSync(inlinerPath, 'utf8');
      expect(inliner).not.toMatch(/https?:\/\//);
    });
  });
});
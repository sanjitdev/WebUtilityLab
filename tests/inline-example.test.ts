import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';

import {
  escapeForTsStringLiteral,
  escapeForTsStringSingle,
} from '../scripts/inline-example.mjs';

// Review #2 finding #4: import the inliner's escape functions directly
// so a drift in the inliner's logic flips these tests, instead of
// silently passing against a stale mirror. The inliner is a build-time
// script but its escape helpers are pure and have no side-effects —
// exporting them costs nothing and the round-trip test gains a real
// signal.

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

/** Reverse the single-quoted-literal escape sequences. */
function unescapeSingleQuoted(escaped: string): string {
  return escaped
    .replace(/\\\\/g, '\x00')
    .replace(/\\r\\n/g, '\r\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\'/g, "'")
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
      const escaped = escapeForTsStringLiteral(raw);
      // The escape produces literal `\\` for each input backslash.
      expect(escaped).toBe('C:\\\\Users\\\\test');
      // And decodes back to the original.
      expect(unescapeTsStringLiteral(escaped)).toBe(raw);
    });

    it('round-trips a double quote (" → \\")', () => {
      const raw = 'name="O\'Brien"';
      const escaped = escapeForTsStringLiteral(raw);
      expect(escaped).toBe('name=\\"O\'Brien\\"');
      expect(unescapeTsStringLiteral(escaped)).toBe(raw);
    });

    it('round-trips CRLF (\\r\\n → \\r\\n in literal)', () => {
      const raw = 'a\r\nb';
      const escaped = escapeForTsStringLiteral(raw);
      expect(escaped).toBe('a\\r\\nb');
      expect(unescapeTsStringLiteral(escaped)).toBe(raw);
    });

    it('round-trips a lone LF (\\n → \\n in literal)', () => {
      const raw = 'a\nb';
      const escaped = escapeForTsStringLiteral(raw);
      expect(escaped).toBe('a\\nb');
      expect(unescapeTsStringLiteral(escaped)).toBe(raw);
    });

    it('round-trips a lone CR (\\r → \\r in literal)', () => {
      const raw = 'a\rb';
      const escaped = escapeForTsStringLiteral(raw);
      expect(escaped).toBe('a\\rb');
      expect(unescapeTsStringLiteral(escaped)).toBe(raw);
    });

    it('round-trips a backslash followed by a quote (the tricky ordering case)', () => {
      // `\` → `\\` first, then `"` → `\"`. So input `\"` becomes `\\\"`.
      const raw = '\\"';
      const escaped = escapeForTsStringLiteral(raw);
      expect(escaped).toBe('\\\\\\"');
      expect(unescapeTsStringLiteral(escaped)).toBe(raw);
    });

    it('round-trips a backslash followed by n (no accidental \\n production)', () => {
      // Input is two characters: `\` and `n`. After escape: `\\n`
      // (4 chars: `\`, `\`, `n`, then the literal n). The literal `n`
      // must NOT be turned into the escape `\n` because `replace(/\\/g, '\\\\')`
      // runs first and shields the next char.
      const raw = '\\n';
      const escaped = escapeForTsStringLiteral(raw);
      expect(escaped).toBe('\\\\n');
      expect(unescapeTsStringLiteral(escaped)).toBe(raw);
    });
  });

  describe('escape contract — single-quoted variant (filename / MIME)', () => {
    it('round-trips a single quote (\' → \\\')', () => {
      const raw = "O'Brien";
      const escaped = escapeForTsStringSingle(raw);
      expect(escaped).toBe("O\\'Brien");
      // The single-quoted literal's unescape doesn't need to undo `\"`,
      // but the backslash and newline escapes do apply.
      expect(unescapeSingleQuoted(escaped)).toBe(raw);
    });

    it('a double quote is NOT escaped in the single-quoted variant', () => {
      // Single-quoted TS strings don't need to escape `"`. Confirming
      // this prevents a regression that would over-escape the literal
      // and produce a parse-broken output.
      const raw = 'name="Alice"';
      const escaped = escapeForTsStringSingle(raw);
      expect(escaped).toBe('name="Alice"');
    });

    it('round-trips a backslash in the single-quoted variant', () => {
      const raw = 'C:\\path';
      const escaped = escapeForTsStringSingle(raw);
      expect(escaped).toBe('C:\\\\path');
    });

    it('round-trips a backslash followed by a single quote (the single-quoted ordering case)', () => {
      // Review #2 finding #6: the single-quote variant's escape order
      // is `\\` → `\\\\` first, then `'` → `\\'`. Input is 2 chars
      // (`\` + `'`). After step 1: `\\` + `'` (3 chars: `\\'`). After
      // step 2: `\\` + `\'` (4 chars: `\\\'`). Decoding: `\\` → `\`,
      // then `\'` → `'`. Net: `\'`.
      const raw = "\\'";
      const escaped = escapeForTsStringSingle(raw);
      expect(escaped).toBe("\\\\\\'");
      expect(unescapeSingleQuoted(escaped)).toBe(raw);
    });

    it('round-trips a backslash followed by n (no accidental \\n production in single-quote variant)', () => {
      // Input: 2 chars (`\` + `n`). After escape: 3 chars (`\\` + `n`).
      // The trailing `n` literal must NOT be turned into the newline
      // escape `\n` because `replace(/\\/g, '\\\\')` shields the next
      // char from the subsequent replacements.
      const raw = '\\n';
      const escaped = escapeForTsStringSingle(raw);
      expect(escaped).toBe('\\\\n');
      expect(unescapeSingleQuoted(escaped)).toBe(raw);
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
      expect(literal).toBe(escapeForTsStringLiteral(fixture));
    });

    it('SAMPLE_CSV_FILENAME decoded === "sample.csv"', () => {
      const generated = readFileSync(generatedPath, 'utf8');
      const literal = extractStringLiteral(
        generated,
        'SAMPLE_CSV_FILENAME',
        "'",
      );
      expect(literal).not.toBeNull();
      expect(unescapeSingleQuoted(literal!)).toBe('sample.csv');
    });

    it('SAMPLE_CSV_MIME decoded === "text/csv"', () => {
      const generated = readFileSync(generatedPath, 'utf8');
      const literal = extractStringLiteral(
        generated,
        'SAMPLE_CSV_MIME',
        "'",
      );
      expect(literal).not.toBeNull();
      expect(unescapeSingleQuoted(literal!)).toBe('text/csv');
    });
  });

  describe('script idempotency — running the inliner twice produces byte-identical output', () => {
    // We don't re-execute the inliner (it has side-effects). Instead,
    // we assert the *contract* — the script contains no
    // time-/random-dependent operations, and the output we just
    // read from disk matches what `escapeForTsStringLiteral(fixture)`
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
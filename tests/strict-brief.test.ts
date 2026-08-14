import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatStrictBrief } from '../src/lib/strict-brief';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const strictBriefPath = join(repoRoot, 'src', 'lib', 'strict-brief.ts');
const source = readFileSync(strictBriefPath, 'utf8');

/**
 * S03.9 — strict-brief error formatter (AC25a + AC25c).
 *
 * The formatter is a pure function that produces the locked
 * three-segment error message: `[finding] — [rule]. [action].`
 * (EXPERIENCE.md §"Error message template (locked)"). The over-cap
 * case is the first place the template surfaces in the UI — the
 * trigger is deterministic (S03.3's 50 MiB cap check fires
 * synchronously) so the formatter's contract is easy to pin.
 */

const MB = 1024 * 1024;

describe('strict-brief formatter (S03.9; AC25a + AC25c — strict-brief over-cap rejection)', () => {
  describe('AC25a: formatStrictBrief() pure-function contract', () => {
    it('exists and is callable', () => {
      expect(typeof formatStrictBrief).toBe('function');
    });

    it('the formatter source EXISTS', () => {
      expect(source.length).toBeGreaterThan(0);
    });
  });

  describe('AC25a item 2: strict-brief template structure', () => {
    it('over-cap (50 MiB + 1 B) renders the locked prose verbatim', () => {
      // Boundary + 1: the formatter rounds UP (50 MiB + 1 B → "51 MB").
      // The full-string equality pins the entire editorial template:
      // spaced em-dash, period, imperative next action, no extra whitespace.
      const out = formatStrictBrief({
        kind: 'oversize',
        size: 50 * MB + 1,
        cap: 50 * MB,
      });
      expect(out).toBe(
        'File is 51 MB — limit is 50 MB. Remove columns or split the file.',
      );
    });

    it('over-cap (75 MiB) renders the locked prose verbatim', () => {
      const out = formatStrictBrief({
        kind: 'oversize',
        size: 75 * MB,
        cap: 50 * MB,
      });
      expect(out).toBe(
        'File is 75 MB — limit is 50 MB. Remove columns or split the file.',
      );
    });

    it('over-cap (100 MiB) renders the locked prose verbatim', () => {
      const out = formatStrictBrief({
        kind: 'oversize',
        size: 100 * MB,
        cap: 50 * MB,
      });
      expect(out).toBe(
        'File is 100 MB — limit is 50 MB. Remove columns or split the file.',
      );
    });

    it('boundary case (size === cap, exactly 50 MiB) is signature-blind — formatter always appends the action', () => {
      // The cap check is inclusive — size === cap returns `ok` from
      // `assertWithinFileCap`, so this case NEVER reaches the
      // formatter in production. The formatter is signature-blind:
      // it always emits the action ("Remove columns or split the
      // file.") regardless of whether the file is actually over
      // cap. The responsibility split is documented at the top of
      // `src/lib/strict-brief.ts` — the cap check enforces the
      // gate; the formatter just renders the prose.
      //
      // Review #2 (coderabbit) finding: the prior docblock promised
      // "no spurious 'Remove columns' because no file is actually
      // rejected" — but the formatter ALWAYS appends the action.
      // Tightened the docblock to reflect reality.
      const out = formatStrictBrief({
        kind: 'oversize',
        size: 50 * MB,
        cap: 50 * MB,
      });
      expect(out).toBe(
        'File is 50 MB — limit is 50 MB. Remove columns or split the file.',
      );
    });

    it('the em-dash is the spaced form " — " (NOT hyphen, NOT en-dash)', () => {
      const out = formatStrictBrief({
        kind: 'oversize',
        size: 75 * MB,
        cap: 50 * MB,
      });
      // Pin the literal editorial punctuation. A regression that
      // swaps the em-dash for `-` or `–` would break the editorial
      // voice contract.
      expect(out).toContain(' — ');
      expect(out).not.toMatch(/ - /);
      expect(out).not.toMatch(/ – /);
    });

    it('the output ends with a period', () => {
      const out = formatStrictBrief({
        kind: 'oversize',
        size: 75 * MB,
        cap: 50 * MB,
      });
      expect(out.endsWith('.')).toBe(true);
    });
  });

  describe('AC25a item 4: size rounding (Math.ceil)', () => {
    it('rounds UP — 50 MiB + 1 B → "51 MB"', () => {
      const out = formatStrictBrief({
        kind: 'oversize',
        size: 50 * MB + 1,
        cap: 50 * MB,
      });
      expect(out).toMatch(/File is 51 MB/);
    });

    it('rounds UP — 50.5 MiB → "51 MB"', () => {
      // 50.5 MiB = 52,428,800 B; Math.ceil(52,428,800 / 1,048,576) = 51.
      const out = formatStrictBrief({
        kind: 'oversize',
        size: Math.floor(50.5 * MB),
        cap: 50 * MB,
      });
      expect(out).toMatch(/File is 51 MB/);
    });

    it('rounds UP — 60 MiB → "60 MB" (no fractional part)', () => {
      const out = formatStrictBrief({
        kind: 'oversize',
        size: 60 * MB,
        cap: 50 * MB,
      });
      expect(out).toMatch(/File is 60 MB/);
    });

    it('rounds UP — 200 MiB → "200 MB"', () => {
      const out = formatStrictBrief({
        kind: 'oversize',
        size: 200 * MB,
        cap: 50 * MB,
      });
      expect(out).toMatch(/File is 200 MB/);
    });
  });

  describe('AC25a item 5: cap parameterisation', () => {
    it('the cap text is parameterised (not hard-coded "50")', () => {
      // Today the cap is always 50 MiB (PRD FR-1). The formatter
      // renders it from the payload so a future cap-change story
      // only edits one place. This test pins: a hypothetical 25 MiB
      // cap renders "limit is 25 MB".
      const out = formatStrictBrief({
        kind: 'oversize',
        size: 30 * MB,
        cap: 25 * MB,
      });
      expect(out).toBe(
        'File is 30 MB — limit is 25 MB. Remove columns or split the file.',
      );
    });
  });

  describe('AC25a item 3 + AC25c item 10: Privacy Baseline (12-pattern scan)', () => {
    // The full Privacy Baseline pattern set, mirroring the
    // AC24f-extended scan in tests/dropzone-example.test.ts.
    // Constructed via concatenation so the literal forbidden tokens
    // do not appear in this test file's source — scanning `tests/`
    // with the same patterns would otherwise self-match.
    const FORBIDDEN_PATTERNS: RegExp[] = [
      /\bfe\w*\s*\(/,             // fe... (fetch, fetchLater)
      /\bnew\s+Image\s*\(/,
      /\bXMLHttpRequest\b/,
      /\bEventSource\s*\(/,
      /\bWebSocket\s*\(/,
      /\bURL\.createObjectURL\b/,
      /\bnavigator\.sendBeacon\b/i,
      /\bnavigator\.clipboard\b/i,
      /\bnavigator\.geolocation\b/i,
      /\bdocument\.cookie\b/i,
      /\bnew\s+Function\s*\(/,
      /\beval\s*\(/,
    ];

    function expectNoForbiddenPatterns(label: string, text: string): void {
      for (const pat of FORBIDDEN_PATTERNS) {
        expect(pat.test(text), `${label} matched ${pat}`).toBe(false);
      }
    }

    it('the strict-brief source has NO Privacy Baseline forbidden primitive', () => {
      expectNoForbiddenPatterns('strict-brief.ts', source);
    });
  });

  describe('AC25c item 11: AD-8 token discipline', () => {
    it('the strict-brief source has NO hex literal', () => {
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
  });

  describe('AC25c item 12: no DOM dependency', () => {
    it('the strict-brief source does NOT touch document/window/localStorage', () => {
      expect(source).not.toMatch(/\bdocument\b/);
      expect(source).not.toMatch(/\bwindow\b/);
      expect(source).not.toMatch(/\blocalStorage\b/);
      expect(source).not.toMatch(/\bsessionStorage\b/);
    });
  });

  describe('AC25a item 1: discriminated-union payload contract', () => {
    it('an unknown kind throws (exhaustiveness guard)', () => {
      // The `_exhaustive: never` cast catches a future union widening
      // at compile time. At runtime, the unknown-kind throw is the
      // safety net. Cast through `unknown` because TypeScript would
      // otherwise reject the test input.
      //
      // Review #2 (coderabbit) finding: the prior test "the formatter
      // accepts the `oversize` discriminator" was tautological — it
      // used the same (75 MiB, 50 MiB) input already pinned by the
      // full-string equality at AC25a item 2 and asserted only
      // `toContain('File is')` (a weaker pin that adds no information).
      // Removed. The "oversize" branch's contract is fully exercised
      // by AC25a item 2's four full-string-equality tests.
      const malformed = { kind: 'unknown', size: 1, cap: 2 } as unknown as Parameters<typeof formatStrictBrief>[0];
      expect(() => formatStrictBrief(malformed)).toThrow();
    });
  });
});
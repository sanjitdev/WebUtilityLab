import { describe, it, expect } from 'vitest';
import {
  parseDenyList,
  walkDeps,
  findDenylisted,
  formatReport,
  parseAllowFlags,
} from '../scripts/check-deps.mjs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';

const here = fileURLToPath(new URL('.', import.meta.url));
const scriptsDir = join(here, '..', 'scripts');

describe('check-deps (S01.7 dep-tree gate)', () => {
  describe('parseDenyList', () => {
    it('parses the seed denylist with the expected schema', () => {
      const map = parseDenyList(join(scriptsDir, 'check-deps-denylist.json'));
      // The seed list has 14 entries (AC #4 + extras).
      expect(map.size).toBe(14);
      const sentry = map.get('@sentry/browser');
      expect(sentry).toBeDefined();
      expect(typeof sentry?.reason).toBe('string');
      expect((sentry?.reason ?? '').length).toBeGreaterThan(0);
      expect(typeof sentry?.added).toBe('string');
      expect(sentry?.added_by).toBe('Sanjit');
    });

    it('returns empty Map when file is missing (first-run convenience)', () => {
      const emptyDir = mkdtempSync(join(tmpdir(), 'check-deps-empty-'));
      const missingPath = join(emptyDir, 'does-not-exist.json');
      const map = parseDenyList(missingPath);
      expect(map.size).toBe(0);
      // Cleanup: rm the temp dir (script also wrote an empty file there).
      rmSync(emptyDir, { recursive: true, force: true });
    });

    it('returns empty Map when file is malformed JSON', () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'check-deps-malformed-'));
      const path = join(tmpDir, 'bad.json');
      writeFileSync(path, '{ this is not valid JSON', 'utf8');
      const map = parseDenyList(path);
      expect(map.size).toBe(0);
      rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe('walkDeps', () => {
    it('walks a flat tree and accumulates name@version pairs', () => {
      const tree = {
        name: 'root',
        version: '1.0.0',
        dependencies: {
          a: { name: 'a', version: '1.0.0' },
          b: { name: 'b', version: '2.0.0' },
        },
      };
      const acc = new Set<string>();
      walkDeps(tree, acc);
      expect(acc.has('a@1.0.0')).toBe(true);
      expect(acc.has('b@2.0.0')).toBe(true);
    });

    it('walks nested dependencies recursively', () => {
      const tree = {
        name: 'root',
        version: '1.0.0',
        dependencies: {
          outer: {
            name: 'outer',
            version: '1.0.0',
            dependencies: {
              inner: { name: 'inner', version: '3.0.0' },
            },
          },
        },
      };
      const acc = new Set<string>();
      walkDeps(tree, acc);
      expect(acc.has('outer@1.0.0')).toBe(true);
      expect(acc.has('inner@3.0.0')).toBe(true);
    });

    it('does not infinite-loop on circular peer references', () => {
      const tree: {
        name: string;
        version?: string;
        dependencies?: Record<string, unknown>;
        peerDependencies?: Record<string, string>;
      } = {
        name: 'root',
        version: '1.0.0',
        dependencies: {
          a: {
            name: 'a',
            version: '1.0.0',
            peerDependencies: { b: '^1.0.0' },
          },
          b: {
            name: 'b',
            version: '1.0.0',
            peerDependencies: { a: '^1.0.0' }, // circular
          },
        },
      };
      const acc = new Set<string>();
      // If the walker loops, this throws via stack overflow.
      walkDeps(tree, acc);
      expect(acc.has('a@1.0.0')).toBe(true);
      expect(acc.has('b@1.0.0')).toBe(true);
      // Total set: root@1.0.0 + a@1.0.0 + b@1.0.0 + 2 peer entries
      // (one per package, recorded but not re-walked). If the walker
      // loops, this grows into the hundreds.
      expect(acc.size).toBe(5);
    });

    it('handles empty / null nodes gracefully', () => {
      const acc = new Set<string>();
      walkDeps(null, acc);
      walkDeps(undefined, acc);
      walkDeps({}, acc);
      expect(acc.size).toBe(0);
    });
  });

  describe('findDenylisted', () => {
    it('returns 0 violations on empty denylist + empty tree', () => {
      const violations = findDenylisted({ name: 'root' }, new Map());
      expect(violations).toEqual([]);
    });

    it('returns the offending entry when tree contains a denylisted package', () => {
      const tree = {
        name: 'root',
        version: '1.0.0',
        dependencies: {
          '@sentry/browser': { name: '@sentry/browser', version: '7.0.0' },
        },
      };
      const deny = new Map([
        ['@sentry/browser', { reason: 'Sentry phones home', added: '2026-08-13', added_by: 'Sanjit', evidence: 'n/a' }],
      ]);
      const violations = findDenylisted(tree, deny);
      expect(violations.length).toBe(1);
      expect(violations[0].name).toBe('@sentry/browser');
      expect(violations[0].version).toBe('7.0.0');
      expect(violations[0].reason).toContain('Sentry');
    });

    it('does not flag packages that are NOT on the denylist', () => {
      const tree = {
        name: 'root',
        version: '1.0.0',
        dependencies: {
          vite: { name: 'vite', version: '6.4.3' },
        },
      };
      const deny = new Map([['posthog-js', { reason: 'r', added: '2026-08-13', added_by: 'Sanjit', evidence: 'n/a' }]]);
      const violations = findDenylisted(tree, deny);
      expect(violations).toEqual([]);
    });

    it('--allow regex suppresses a known-bad package', () => {
      const tree = {
        name: 'root',
        version: '1.0.0',
        dependencies: {
          '@sentry/browser': { name: '@sentry/browser', version: '7.0.0' },
        },
      };
      const deny = new Map([
        ['@sentry/browser', { reason: 'Sentry', added: '2026-08-13', added_by: 'Sanjit', evidence: 'n/a' }],
      ]);
      const allow = [/sentry/];
      const violations = findDenylisted(tree, deny, allow);
      expect(violations).toEqual([]);
    });

    it('multiple violations: all reported', () => {
      const tree = {
        name: 'root',
        version: '1.0.0',
        dependencies: {
          a: { name: '@sentry/browser', version: '7.0.0' },
          b: { name: 'posthog-js', version: '1.0.0' },
        },
      };
      const deny = new Map([
        ['@sentry/browser', { reason: 'r1', added: '2026-08-13', added_by: 'Sanjit', evidence: 'n/a' }],
        ['posthog-js', { reason: 'r2', added: '2026-08-13', added_by: 'Sanjit', evidence: 'n/a' }],
      ]);
      const violations = findDenylisted(tree, deny);
      expect(violations.length).toBe(2);
      const names = violations.map((v: { name: string }) => v.name).sort();
      expect(names).toEqual(['@sentry/browser', 'posthog-js']);
    });
  });

  describe('formatReport', () => {
    it('prints OK for empty violation list', () => {
      const out = formatReport([], 42);
      expect(out).toContain('OK');
      expect(out).toContain('0 denylisted');
      expect(out).toContain('42');
    });

    it('prints FAIL with each violation listed and reason', () => {
      const violations = [
        { name: '@sentry/browser', version: '7.0.0', reason: 'Phones home' },
      ];
      const out = formatReport(violations, 100);
      expect(out).toContain('FAIL');
      expect(out).toContain('@sentry/browser@7.0.0');
      expect(out).toContain('Phones home');
    });

    it('sorts violations by name for deterministic output', () => {
      const violations = [
        { name: 'posthog-js', version: '1.0.0', reason: 'r' },
        { name: '@sentry/browser', version: '7.0.0', reason: 'r' },
      ];
      const out = formatReport(violations, 10);
      const sentryIdx = out.indexOf('@sentry/browser');
      const posthogIdx = out.indexOf('posthog-js');
      expect(sentryIdx).toBeGreaterThan(0);
      expect(posthogIdx).toBeGreaterThan(sentryIdx);
    });
  });

  describe('parseAllowFlags', () => {
    it('extracts repeatable --allow= patterns', () => {
      const re = parseAllowFlags(['--allow=sentry', '--allow=amplitude']);
      expect(re.length).toBe(2);
      expect(re[0].test('@sentry/browser@7.0.0')).toBe(true);
      expect(re[1].test('amplitude-js@1.0.0')).toBe(true);
    });

    it('ignores non-allow flags', () => {
      const re = parseAllowFlags(['--foo', '--bar=baz', '--allow=sentry']);
      expect(re.length).toBe(1);
    });

    it('skips invalid regex with a warning (does not throw)', () => {
      // `[` is an unclosed character class — invalid regex.
      const re = parseAllowFlags(['--allow=[invalid']);
      expect(re.length).toBe(0);
    });

    it('returns empty array when no --allow flags present', () => {
      const re = parseAllowFlags([]);
      expect(re).toEqual([]);
    });
  });
});
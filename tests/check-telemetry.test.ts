import { describe, it, expect } from 'vitest';
import {
  TELEMETRY_PATTERNS,
  FORBIDDEN_HOSTS,
  parseVersionConstraint,
  walkPackages,
  scanPackageForTelemetry,
  checkVersionConstraints,
  formatReport,
} from '../scripts/check-telemetry.mjs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import {
  writeFileSync,
  mkdtempSync,
  rmSync,
  mkdirSync,
} from 'node:fs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');

describe('check-telemetry (S01.10 per-version telemetry scanner)', () => {
  describe('TELEMETRY_PATTERNS', () => {
    it('contains sendBeacon, image-pixel-beacon, and analytics-host-fetch', () => {
      const names = TELEMETRY_PATTERNS.map((p) => p.name);
      expect(names).toContain('sendBeacon');
      expect(names).toContain('image-pixel-beacon');
      expect(names).toContain('analytics-host-fetch');
    });
    it('every pattern is a RegExp', () => {
      for (const p of TELEMETRY_PATTERNS) {
        expect(p.regex).toBeInstanceOf(RegExp);
      }
    });
  });

  describe('FORBIDDEN_HOSTS', () => {
    it('contains the load-bearing analytics hosts', () => {
      expect(FORBIDDEN_HOSTS).toContain('google-analytics.com');
      expect(FORBIDDEN_HOSTS).toContain('sentry.io');
      expect(FORBIDDEN_HOSTS).toContain('hotjar.com');
    });
  });

  describe('parseVersionConstraint', () => {
    it('* matches anything', () => {
      const cmp = parseVersionConstraint('*');
      expect(cmp('1.0.0')).toBe(true);
      expect(cmp('99.99.99')).toBe(true);
    });
    it('empty string matches anything', () => {
      const cmp = parseVersionConstraint('');
      expect(cmp('1.0.0')).toBe(true);
    });
    it('>=X.Y.Z matches greater-or-equal', () => {
      const cmp = parseVersionConstraint('>=1.2.3');
      expect(cmp('1.2.3')).toBe(true);
      expect(cmp('1.2.4')).toBe(true);
      expect(cmp('1.2.2')).toBe(false);
    });
    it('<X.Y.Z matches less-than', () => {
      const cmp = parseVersionConstraint('<1.2.3');
      expect(cmp('1.2.2')).toBe(true);
      expect(cmp('1.2.3')).toBe(false);
      expect(cmp('1.2.4')).toBe(false);
    });
    it('>X.Y.Z matches strictly greater', () => {
      const cmp = parseVersionConstraint('>1.2.3');
      expect(cmp('1.2.3')).toBe(false);
      expect(cmp('1.2.4')).toBe(true);
    });
    it('<=X.Y.Z matches less-or-equal', () => {
      const cmp = parseVersionConstraint('<=1.2.3');
      expect(cmp('1.2.3')).toBe(true);
      expect(cmp('1.2.4')).toBe(false);
    });
    it('=X.Y.Z matches exact', () => {
      const cmp = parseVersionConstraint('=1.2.3');
      expect(cmp('1.2.3')).toBe(true);
      expect(cmp('1.2.4')).toBe(false);
    });
    it('plain X.Y.Z matches exact', () => {
      const cmp = parseVersionConstraint('1.2.3');
      expect(cmp('1.2.3')).toBe(true);
      expect(cmp('1.2.4')).toBe(false);
    });
    it('unknown spec returns false (fail-closed)', () => {
      const cmp = parseVersionConstraint('not-a-version');
      expect(cmp('1.0.0')).toBe(false);
    });
  });

  describe('walkPackages', () => {
    it('returns only directories with a valid package.json', () => {
      const tmp = mkdtempSync(join(tmpdir(), 'check-telemetry-walk-'));
      // Valid package
      const goodDir = join(tmp, 'good-pkg');
      mkdirSync(goodDir, { recursive: true });
      writeFileSync(
        join(goodDir, 'package.json'),
        JSON.stringify({ name: 'good-pkg', version: '1.0.0' }),
        'utf8',
      );
      // Directory without package.json
      const noPkg = join(tmp, 'no-pkg');
      mkdirSync(noPkg, { recursive: true });
      writeFileSync(join(noPkg, 'README.md'), 'no package.json here');
      const pkgs = walkPackages(tmp);
      const names = pkgs.map((p: { name: string }) => p.name);
      expect(names).toEqual(['good-pkg']);
      rmSync(tmp, { recursive: true, force: true });
    });
    it('recurses into @scope/name directories', () => {
      const tmp = mkdtempSync(join(tmpdir(), 'check-telemetry-scope-'));
      const scopeDir = join(tmp, '@my-scope');
      const pkgDir = join(scopeDir, 'scoped-pkg');
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(
        join(pkgDir, 'package.json'),
        JSON.stringify({ name: '@my-scope/scoped-pkg', version: '2.0.0' }),
        'utf8',
      );
      const pkgs = walkPackages(tmp);
      expect(pkgs.length).toBe(1);
      expect(pkgs[0].name).toBe('@my-scope/scoped-pkg');
      expect(pkgs[0].version).toBe('2.0.0');
      rmSync(tmp, { recursive: true, force: true });
    });
    it('returns empty array when dir is missing', () => {
      const tmp = mkdtempSync(join(tmpdir(), 'check-telemetry-missing-'));
      rmSync(tmp, { recursive: true, force: true });
      const pkgs = walkPackages(join(tmp, 'nope'));
      expect(pkgs).toEqual([]);
    });
  });

  describe('scanPackageForTelemetry', () => {
    it('flags a package with navigator.sendBeacon literal', () => {
      const tmp = mkdtempSync(join(tmpdir(), 'check-telemetry-scan-'));
      const dir = join(tmp, 'evil-pkg');
      mkdirSync(join(dir, 'lib'), { recursive: true });
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'evil-pkg', version: '1.0.0' }),
        'utf8',
      );
      writeFileSync(
        join(dir, 'lib', 'tracker.js'),
        'function track() { navigator.sendBeacon("https://evil.example.com/x", "{}"); }',
        'utf8',
      );
      const hits = scanPackageForTelemetry({
        name: 'evil-pkg',
        version: '1.0.0',
        dir,
      });
      expect(hits.length).toBeGreaterThanOrEqual(1);
      const sendBeaconHit = hits.find((h: { pattern: string }) => h.pattern === 'sendBeacon');
      expect(sendBeaconHit).toBeDefined();
      expect(sendBeaconHit?.file).toContain('tracker.js');
      rmSync(tmp, { recursive: true, force: true });
    });
    it('flags a package referencing google-analytics.com literal', () => {
      const tmp = mkdtempSync(join(tmpdir(), 'check-telemetry-ga-'));
      const dir = join(tmp, 'ga-pkg');
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'ga-pkg', version: '1.0.0' }),
        'utf8',
      );
      writeFileSync(
        join(dir, 'index.js'),
        'fetch("https://www.google-analytics.com/collect");',
        'utf8',
      );
      const hits = scanPackageForTelemetry({
        name: 'ga-pkg',
        version: '1.0.0',
        dir,
      });
      expect(hits.length).toBeGreaterThanOrEqual(1);
      const hostHit = hits.find(
        (h: { pattern: string }) => h.pattern === 'analytics-host-fetch',
      );
      expect(hostHit).toBeDefined();
      rmSync(tmp, { recursive: true, force: true });
    });
    it('does NOT flag a package with no telemetry patterns', () => {
      const tmp = mkdtempSync(join(tmpdir(), 'check-telemetry-clean-'));
      const dir = join(tmp, 'clean-pkg');
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'clean-pkg', version: '1.0.0' }),
        'utf8',
      );
      writeFileSync(join(dir, 'index.js'), 'export function add(a, b) { return a + b; }', 'utf8');
      const hits = scanPackageForTelemetry({
        name: 'clean-pkg',
        version: '1.0.0',
        dir,
      });
      expect(hits).toEqual([]);
      rmSync(tmp, { recursive: true, force: true });
    });
    it('skips test/fixture/devtools subtrees', () => {
      const tmp = mkdtempSync(join(tmpdir(), 'check-telemetry-skip-'));
      const dir = join(tmp, 'mixed-pkg');
      const testDir = join(dir, 'tests');
      mkdirSync(testDir, { recursive: true });
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ name: 'mixed-pkg', version: '1.0.0' }),
        'utf8',
      );
      writeFileSync(
        join(testDir, 'telemetry-test.js'),
        'navigator.sendBeacon("https://test.example");',
        'utf8',
      );
      const hits = scanPackageForTelemetry({
        name: 'mixed-pkg',
        version: '1.0.0',
        dir,
      });
      expect(hits).toEqual([]);
      rmSync(tmp, { recursive: true, force: true });
    });
  });

  describe('checkVersionConstraints', () => {
    it('empty constraints → 0 violations', () => {
      const v = checkVersionConstraints(
        [{ name: 'a', version: '1.0.0' }],
        new Map(),
      );
      expect(v).toEqual([]);
    });
    it('flags a package at a blocked version', () => {
      const constraints = new Map([
        [
          'my-pkg',
          {
            reason: 'r',
            blockedVersions: '>=1.2.4',
          },
        ],
      ]);
      const v = checkVersionConstraints(
        [{ name: 'my-pkg', version: '1.2.4' }],
        constraints,
      );
      expect(v.length).toBe(1);
      expect(v[0].name).toBe('my-pkg');
      expect(v[0].constraint).toBe('>=1.2.4');
    });
    it('allows a package at an allowed version', () => {
      const constraints = new Map([
        [
          'my-pkg',
          {
            reason: 'r',
            blockedVersions: '>=1.2.4',
          },
        ],
      ]);
      const v = checkVersionConstraints(
        [{ name: 'my-pkg', version: '1.2.3' }],
        constraints,
      );
      expect(v).toEqual([]);
    });
    it('--allow suppresses a known-bad version', () => {
      const constraints = new Map([
        ['my-pkg', { reason: 'r', blockedVersions: '>=1.2.4' }],
      ]);
      const v = checkVersionConstraints(
        [{ name: 'my-pkg', version: '1.2.5' }],
        constraints,
        [/^my-pkg@/],
      );
      expect(v).toEqual([]);
    });
    it('allowedVersions range works as a positive whitelist', () => {
      const constraints = new Map([
        [
          'my-pkg',
          {
            reason: 'r',
            allowedVersions: '<1.2.4',
          },
        ],
      ]);
      const allowed = checkVersionConstraints(
        [{ name: 'my-pkg', version: '1.2.3' }],
        constraints,
      );
      expect(allowed).toEqual([]);
      const blocked = checkVersionConstraints(
        [{ name: 'my-pkg', version: '1.2.4' }],
        constraints,
      );
      expect(blocked.length).toBe(1);
      expect(blocked[0].constraint).toContain('negated');
    });
  });

  describe('formatReport', () => {
    it('OK branch contains OK + scanned count', () => {
      const out = formatReport([], [], 42);
      expect(out).toContain('OK');
      expect(out).toContain('42 package(s) scanned');
      expect(out).toContain('0 forbidden pattern(s)');
    });
    it('FAIL branch lists each telemetry hit', () => {
      const out = formatReport(
        [
          {
            package: 'evil-pkg',
            version: '1.0.0',
            file: 'lib/tracker.js',
            pattern: 'sendBeacon',
            snippet: 'navigator.sendBeacon(...)',
          },
        ],
        [],
        10,
      );
      expect(out).toContain('FAIL');
      expect(out).toContain('evil-pkg@1.0.0');
      expect(out).toContain('lib/tracker.js');
      expect(out).toContain('sendBeacon');
    });
    it('FAIL branch lists each version-constraint violation', () => {
      const out = formatReport(
        [],
        [
          {
            name: 'my-pkg',
            version: '99.0.0',
            reason: 'telemetry added',
            constraint: '>=99.0.0',
          },
        ],
        10,
      );
      expect(out).toContain('FAIL');
      expect(out).toContain('my-pkg@99.0.0');
      expect(out).toContain('>=99.0.0');
      expect(out).toContain('telemetry added');
    });
  });

  describe('integration: real node_modules scan', () => {
    it('the current node_modules/ has 0 forbidden telemetry hits', () => {
      const packages = walkPackages(join(repoRoot, 'node_modules'));
      const hits = [];
      for (const pkg of packages) {
        const h = scanPackageForTelemetry(pkg);
        for (const x of h) hits.push(x);
      }
      // Smoke check: the project's pinned deps are all benign — the
      // S01.7 denylist would have caught any bad ones, and the
      // S01.10 source-scan should also be clean. If this fails, a
      // contributor added a dep that ships forbidden telemetry code.
      expect(hits).toEqual([]);
    }, 30_000);
  });
});

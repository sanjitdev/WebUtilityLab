import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readFileSync,
  existsSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');

/**
 * S01.11 — Dependency pinning test gate.
 *
 * The story is mostly verification + documentation + one preventive
 * hardening (`.npmrc`). The test file IS the canonical gate: every
 * pinning contract is checked at `npm test` time, and CI runs that.
 *
 * Tests are organized in the same `describe` shape as the ACs.
 * No new dependencies — only `node:*` imports.
 */
describe('dependency-pinning (S01.11)', () => {
  describe('AC1: package.json declares exact versions for every devDependency', () => {
    it('every devDependency value is a strict semver X.Y.Z (optionally +pre-release tag)', () => {
      const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
      const deps = pkg.devDependencies ?? {};
      // Strict exact-version regex: digits.dots only, optional pre-release tag.
      // No `^` / `~` / `>=` / `<=` / `*` / `latest` / ranges.
      const exactVersion = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
      const offenders: string[] = [];
      for (const [name, ver] of Object.entries(deps)) {
        if (typeof ver !== 'string' || !exactVersion.test(ver)) {
          offenders.push(`${name}: ${JSON.stringify(ver)}`);
        }
      }
      expect(offenders).toEqual([]);
    });

    it('every dependency key has a string value (no nulls, no arrays, no objects)', () => {
      const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
      const deps = pkg.devDependencies ?? {};
      for (const [name, ver] of Object.entries(deps)) {
        expect(typeof ver, `${name} value type`).toBe('string');
      }
    });

    it('flags a hypothetical package.json that uses ^ or ~ or range syntax', () => {
      const tmp = mkdtempSync(join(tmpdir(), 'pin-fail-'));
      const fakePkg = {
        name: 'fake',
        version: '0.0.0',
        devDependencies: {
          exact: '1.0.0',
          caret: '^2.0.0',
          tilde: '~3.0.0',
          range: '>=4.0.0',
        },
      };
      const fakePath = join(tmp, 'package.json');
      writeFileSync(fakePath, JSON.stringify(fakePkg), 'utf8');
      // Run the same scan logic against the temp package.json.
      const exactVersion = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
      const offenders: string[] = [];
      for (const [name, ver] of Object.entries(fakePkg.devDependencies)) {
        if (typeof ver !== 'string' || !exactVersion.test(ver)) {
          offenders.push(`${name}: ${JSON.stringify(ver)}`);
        }
      }
      expect(offenders.length).toBeGreaterThanOrEqual(3);
      expect(offenders.some((o) => o.startsWith('caret:'))).toBe(true);
      expect(offenders.some((o) => o.startsWith('tilde:'))).toBe(true);
      expect(offenders.some((o) => o.startsWith('range:'))).toBe(true);
      expect(offenders.some((o) => o.startsWith('exact:'))).toBe(false);
      rmSync(tmp, { recursive: true, force: true });
    });
  });

  describe('AC2: package-lock.json is tracked and complete', () => {
    it('package-lock.json exists in repo root', () => {
      expect(existsSync(join(repoRoot, 'package-lock.json'))).toBe(true);
    });

    it('package-lock.json is tracked by git', () => {
      // `git ls-files --error-unmatch package-lock.json` exits 1 if untracked.
      // We run from the repo root so the relative path resolves.
      let out: string;
      try {
        out = execFileSync('git', ['ls-files', '--error-unmatch', 'package-lock.json'], {
          cwd: repoRoot,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (err) {
        out = '';
      }
      expect(out.trim()).toContain('package-lock.json');
    });

    it('package-lock.json is NOT in .gitignore', () => {
      const gi = readFileSync(join(repoRoot, '.gitignore'), 'utf8');
      // Match any line whose stripped, non-comment content equals "package-lock.json"
      // or starts with "package-lock.json" + a glob char.
      const lines = gi.split(/\r?\n/);
      const offenders = lines.filter((line) => {
        const stripped = line.replace(/#.*$/, '').trim();
        return stripped === 'package-lock.json' || /^package-lock\.json[\*\?]$/.test(stripped);
      });
      expect(offenders).toEqual([]);
    });

    it('lockfileVersion is 3 (npm 7+ v3 format)', () => {
      const lock = JSON.parse(readFileSync(join(repoRoot, 'package-lock.json'), 'utf8'));
      expect(lock.lockfileVersion).toBe(3);
    });

    it('every packages[] entry has a sha512 integrity hash', () => {
      const lock = JSON.parse(readFileSync(join(repoRoot, 'package-lock.json'), 'utf8'));
      const packages = lock.packages ?? {};
      const entries = Object.entries(packages).filter(
        ([, v]) => typeof v === 'object' && v !== null,
      );
      // The root entry (`""`) does not need an integrity field for the workspace
      // root itself, only for installed packages.
      const missing: string[] = [];
      for (const [name, val] of entries) {
        if (name === '') continue; // root entry
        const integrity = (val as { integrity?: unknown }).integrity;
        if (typeof integrity !== 'string' || !integrity.startsWith('sha512-')) {
          missing.push(name);
        }
      }
      expect(missing).toEqual([]);
    });
  });

  describe('AC3: CI uses npm ci (not npm install) for installs', () => {
    it('no `.github/workflows/*.yml` runs `npm install` (only `npm ci`)', () => {
      // Spawn git to list the workflows directory so we don't have to
      // hard-code the names. Non-comment "run: npm install" lines are
      // the failure mode AC3 is catching.
      const files = execFileSync(
        'git',
        ['ls-files', '.github/workflows/'],
        { cwd: repoRoot, encoding: 'utf8' },
      )
        .split('\n')
        .filter((l) => l.endsWith('.yml') || l.endsWith('.yaml'));
      expect(files.length).toBeGreaterThan(0);
      const offenders: { file: string; line: number; text: string }[] = [];
      for (const rel of files) {
        const text = readFileSync(join(repoRoot, rel), 'utf8');
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const raw = lines[i] ?? '';
          const stripped = raw.replace(/#.*$/, '').trim();
          // Detect "run: npm install ..." but NOT "run: npm install --no-save"
          // (AC3 forbids the bare `npm install` form for installing deps).
          if (/^\s*-?\s*run:\s*npm\s+install\b/i.test(stripped)) {
            offenders.push({ file: rel, line: i + 1, text: raw });
          }
        }
      }
      expect(offenders).toEqual([]);
    });

    it('ci.yml has at least one `run: npm ci` step', () => {
      const ci = readFileSync(join(repoRoot, '.github/workflows/ci.yml'), 'utf8');
      expect(/^\s*-?\s*run:\s*npm\s+ci\b/im.test(ci)).toBe(true);
    });
  });

  describe('AC4: .npmrc contributor-side hardening', () => {
    it('.npmrc exists in repo root', () => {
      expect(existsSync(join(repoRoot, '.npmrc'))).toBe(true);
    });

    it('.npmrc sets save-exact=true', () => {
      const text = readFileSync(join(repoRoot, '.npmrc'), 'utf8');
      expect(/^\s*save-exact\s*=\s*true\s*$/m.test(text)).toBe(true);
    });

    it('.npmrc sets package-lock=true', () => {
      const text = readFileSync(join(repoRoot, '.npmrc'), 'utf8');
      expect(/^\s*package-lock\s*=\s*true\s*$/m.test(text)).toBe(true);
    });

    it('.npmrc sets engine-strict=true (enforces package.json engines.node)', () => {
      // engine-strict makes `engines.node` (>=20.0.0) an install-time
      // error rather than a silent warning. Symmetric with the save-exact
      // and package-lock assertions; closes the .npmrc coverage gap.
      const text = readFileSync(join(repoRoot, '.npmrc'), 'utf8');
      expect(/^\s*engine-strict\s*=\s*true\s*$/m.test(text)).toBe(true);
    });
  });
});

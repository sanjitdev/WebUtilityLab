import { describe, it, expect } from 'vitest';
import {
  BUNDLE_BUDGET_BYTES,
  collectFiles,
  measureGzipped,
  summarize,
  formatReport,
} from '../scripts/check-bundle-size.mjs';
import { isMapArtifact } from '../scripts/build-cleanup.mjs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { writeFileSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';

const here = fileURLToPath(new URL('.', import.meta.url));
const scriptsDir = join(here, '..', 'scripts');

describe('check-bundle-size (S01.9 bundle budget gate)', () => {
  describe('BUNDLE_BUDGET_BYTES', () => {
    it('is exactly 200 KB (200 * 1024)', () => {
      expect(BUNDLE_BUDGET_BYTES).toBe(200 * 1024);
      expect(BUNDLE_BUDGET_BYTES).toBe(204_800);
    });
  });

  describe('isMapArtifact (re-used from build-cleanup)', () => {
    it('rejects non-map files', () => {
      expect(isMapArtifact('index.html')).toBe(false);
      expect(isMapArtifact('index.js')).toBe(false);
      expect(isMapArtifact('index.css')).toBe(false);
      expect(isMapArtifact('assets/index-abc123.js')).toBe(false);
    });
    it('accepts map artifacts', () => {
      expect(isMapArtifact('index.js.map')).toBe(true);
      expect(isMapArtifact('index.css.map')).toBe(true);
      expect(isMapArtifact('.map')).toBe(true);
      expect(isMapArtifact('chunk.map.json')).toBe(true);
    });
  });

  describe('collectFiles', () => {
    it('skips directories and returns only files', () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'check-bundle-files-'));
      writeFileSync(join(tmpDir, 'a.html'), '<!doctype html><title>x</title>');
      writeFileSync(join(tmpDir, 'b.css'), 'body{color:red}');
      const sub = join(tmpDir, 'assets');
      mkdirSync(sub, { recursive: true });
      writeFileSync(join(sub, 'c.js'), 'console.log(1);');
      const files = collectFiles(tmpDir);
      const names = files.map((f: { path: string }) => f.path.replace(/\\/g, '/')).sort();
      expect(names).toEqual(['a.html', 'assets/c.js', 'b.css']);
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns empty array when dir is missing', () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'check-bundle-missing-'));
      rmSync(tmpDir, { recursive: true, force: true });
      const files = collectFiles(join(tmpDir, 'nope'));
      expect(files).toEqual([]);
    });
  });

  describe('measureGzipped', () => {
    it('skips .map artifacts and records rawBytes + gzBytes', () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'check-bundle-measure-'));
      writeFileSync(join(tmpDir, 'index.html'), '<!doctype html><title>x</title>');
      writeFileSync(join(tmpDir, 'index.js'), 'console.log(1);');
      writeFileSync(join(tmpDir, 'index.js.map'), '{"version":3,"sources":[]}');
      const files = collectFiles(tmpDir);
      const m = measureGzipped(files);
      // The .map file MUST be skipped, so we see only 2 entries.
      expect(m.length).toBe(2);
      const byPath = Object.fromEntries(m.map((x: { path: string }) => [x.path, x]));
      expect(byPath['index.html']).toBeDefined();
      expect(byPath['index.js']).toBeDefined();
      expect(byPath['index.js.map']).toBeUndefined();
      for (const entry of m) {
        expect(typeof entry.rawBytes).toBe('number');
        expect(entry.rawBytes).toBeGreaterThan(0);
        expect(typeof entry.gzBytes).toBe('number');
        expect(entry.gzBytes).toBeGreaterThan(0);
      }
      rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe('summarize', () => {
    it('empty measurements → 0 / withinBudget', () => {
      const summary = summarize([], BUNDLE_BUDGET_BYTES);
      expect(summary.totalRaw).toBe(0);
      expect(summary.totalGz).toBe(0);
      expect(summary.withinBudget).toBe(true);
      expect(summary.overageBytes).toBe(0);
    });

    it('within budget (small file) → withinBudget true', () => {
      const m = [{ rawBytes: 100, gzBytes: 130 }];
      const s = summarize(m, BUNDLE_BUDGET_BYTES);
      expect(s.totalRaw).toBe(100);
      expect(s.totalGz).toBe(130);
      expect(s.withinBudget).toBe(true);
      expect(s.overageBytes).toBe(0);
    });

    it('exactly at budget → withinBudget true', () => {
      const m = [{ rawBytes: BUNDLE_BUDGET_BYTES, gzBytes: BUNDLE_BUDGET_BYTES }];
      const s = summarize(m, BUNDLE_BUDGET_BYTES);
      expect(s.withinBudget).toBe(true);
      expect(s.overageBytes).toBe(0);
    });

    it('1 byte over budget → withinBudget false, overageBytes >= 1', () => {
      const m = [{ rawBytes: BUNDLE_BUDGET_BYTES, gzBytes: BUNDLE_BUDGET_BYTES + 1 }];
      const s = summarize(m, BUNDLE_BUDGET_BYTES);
      expect(s.withinBudget).toBe(false);
      expect(s.overageBytes).toBe(1);
    });

    it('multiple files sum correctly', () => {
      const m = [
        { rawBytes: 100, gzBytes: 1000 },
        { rawBytes: 200, gzBytes: 2000 },
        { rawBytes: 300, gzBytes: 3000 },
      ];
      const s = summarize(m, BUNDLE_BUDGET_BYTES);
      expect(s.totalRaw).toBe(600);
      expect(s.totalGz).toBe(6000);
      expect(s.withinBudget).toBe(true);
    });
  });

  describe('formatReport', () => {
    it('OK branch contains OK + budget', () => {
      const m = [{ path: 'index.js', rawBytes: 100, gzBytes: 5000 }];
      const s = summarize(m, BUNDLE_BUDGET_BYTES);
      const out = formatReport(m, s, BUNDLE_BUDGET_BYTES);
      expect(out).toContain('OK');
      expect(out).toContain('budget=200.00 KB');
      expect(out).toContain('index.js');
    });

    it('FAIL branch contains FAIL + each over-budget file + overage', () => {
      const m = [{ path: 'huge.js', rawBytes: BUNDLE_BUDGET_BYTES, gzBytes: BUNDLE_BUDGET_BYTES + 1024 }];
      const s = summarize(m, BUNDLE_BUDGET_BYTES);
      const out = formatReport(m, s, BUNDLE_BUDGET_BYTES);
      expect(out).toContain('FAIL');
      expect(out).toContain('huge.js');
      expect(out).toContain('overage=1.00 KB');
    });

    it('groups sub-1 KB files into the (N other files) footer', () => {
      const m = [
        { path: 'big.js', rawBytes: 1000, gzBytes: 5000 },
        { path: 'a.css', rawBytes: 100, gzBytes: 200 },
        { path: 'b.css', rawBytes: 100, gzBytes: 300 },
      ];
      const s = summarize(m, BUNDLE_BUDGET_BYTES);
      const out = formatReport(m, s, BUNDLE_BUDGET_BYTES);
      expect(out).toContain('(2 other files)');
      // Footer line should appear AFTER the big file in the output.
      const bigIdx = out.indexOf('big.js');
      const otherIdx = out.indexOf('(2 other files)');
      expect(bigIdx).toBeGreaterThan(0);
      expect(otherIdx).toBeGreaterThan(bigIdx);
    });
  });

  describe('integration: real dist/ measurement', () => {
    it('the current dist/ sums to well under 200 KB gzipped', () => {
      const distPath = join(scriptsDir, '..', 'dist');
      const files = collectFiles(distPath);
      const m = measureGzipped(files);
      const s = summarize(m, BUNDLE_BUDGET_BYTES);
      expect(s.withinBudget).toBe(true);
      // Smoke check: gzipped total should be far below the budget. The
      // exact value drifts as the project grows; assert an upper bound
      // generous enough to absorb normal evolution but tight enough to
      // catch a 10x+ regression. Today's value is ~10 KB; 180 KB is the
      // 18x guardrail that still leaves room for growth.
      expect(s.totalGz).toBeLessThan(180 * 1024);
    });
  });
});

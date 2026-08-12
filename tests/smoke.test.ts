import { describe, it, expect } from 'vitest';
import { sum } from '../src/lib/sum';

/**
 * Smoke test — the minimum bar for Story 1.1 (AC #6): one passing test
 * on a stub module. E02+ expands coverage with state, parser, detector,
 * and schema tests (SOLUTION-DESIGN §"Testing standards summary").
 */
describe('sum', () => {
  it('adds two numbers', () => {
    expect(sum(1, 1)).toBe(2);
  });

  it('handles zero', () => {
    expect(sum(0, 0)).toBe(0);
  });

  it('handles negative numbers', () => {
    expect(sum(-3, 7)).toBe(4);
  });
});
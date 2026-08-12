/**
 * sum — trivial arithmetic used by the smoke test in `tests/smoke.test.ts`.
 *
 * The spec (Story 1.1, Task 6.3) prefers a real exported function over
 * `1 + 1 === 2` so the dev has something to look at and a future test can
 * lean on the same export. E02+ may add more math helpers to `src/lib/`,
 * but the file layout here is intentionally flat: ADs land their own
 * modules (state, types, theme, filename, estimate) in E02+ per
 * SOLUTION-DESIGN §"Module boundaries".
 */
export function sum(a: number, b: number): number {
  return a + b;
}
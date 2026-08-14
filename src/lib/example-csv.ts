/**
 * example-csv.ts — "Try the example" wiring helper (S03.8).
 *
 * Constructs an in-memory `File` from the inlined CSV constant
 * exported by `./example-csv.generated` (which is built by
 * `scripts/inline-example.mjs` from `public/examples/sample.csv`).
 *
 * The fixture is bundled inline (Privacy Baseline: PRD FR-23) — no
 * `fetch`, no `URL.createObjectURL`, no network IO. The deployed
 * bundle carries the CSV as a string constant; the deployed HTML
 * does not reference `public/examples/sample.csv`.
 *
 * E08's fixture set will reuse `public/examples/sample.csv` for
 * golden tests (the source tree, not the deployed bundle). S03.8
 * ships the `makeExampleFile()` helper; the App.svelte click
 * handler dispatches the synthesised File through `handleAccept`,
 * which routes to the S03.7 reducer.
 *
 * AD-8 (token discipline): no hex literals. No styling here.
 */
import {
  SAMPLE_CSV,
  SAMPLE_CSV_FILENAME,
  SAMPLE_CSV_MIME,
} from './example-csv.generated';

/**
 * Build an in-memory `File` from the inlined CSV. The File is
 * shaped identically to a real drop: it has a `name`, `type`, and
 * `size`. The reducer's drop branch (S03.7) holds the reference
 * without reading it; E06's parser will eventually consume the
 * bytes via `file.stream()`.
 */
export function makeExampleFile(): File {
  return new File([SAMPLE_CSV], SAMPLE_CSV_FILENAME, {
    type: SAMPLE_CSV_MIME,
  });
}

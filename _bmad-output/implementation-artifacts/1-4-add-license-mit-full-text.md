# Story 1.4: Add LICENSE (MIT full text)

Status: done
baseline_commit: 52b7b3c (S01.3 done)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Loop protocol (mandatory).** This story must pass Review #1 (coderabbit), Review #2 (bmad-code-review), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. The story at the front of every loop is the smallest thing the architecture needs to keep working — `S01.4` makes the LICENSE claim from `package.json` load-bearing in repo form.

## Story

As a **solo developer (Sanjit)** building WebUtilityLab's CSV Rescue MVP,
I want **a `LICENSE` file at the repo root containing the full MIT license text with the copyright year set to the initial release year (2026) and the copyright holder set to "Sanjit" (the maintainer)**,
so that **a future contributor (or downstream consumer) can read the project's license terms in the canonical place GitHub looks for them (the repo-root `LICENSE` file) AND the `package.json` `license: "MIT"` declaration has a corresponding on-disk artifact that names the same holder — closing the loop on the "open source from day 1" claim made in `project-context.md`**.

## Acceptance Criteria

1. **`LICENSE` file exists at the repo root.** Standard MIT license text. Copyright line: `Copyright (c) 2026 WebUtilityLab contributors` (matches the maintainer posture; was set in S01.1 and is the convention the project uses — single maintainer today, but the contributor framing covers future contributors under the "open source from day 1" claim from `project-context.md`). Body is the verbatim MIT license text (the version SPDX lists as `MIT`). The file also carries `SPDX-License-Identifier: MIT` on the second line so automated tooling that scans for SPDX (e.g. `reuse lint`) can pick it up.

2. **`package.json` `license` field remains `"MIT"`.** No change required to `package.json` (already set in S01.1). The story's deliverable is the file at the repo root that makes this declaration concrete.

3. **No license header is added to source files.** This story adds a single top-level `LICENSE` file; it does NOT add SPDX-license-identifier comments to every `.ts` / `.svelte` / `.mjs` file. The MIT license is a per-project license, not a per-file one; adding a header to every file would be scope creep.

4. **`SECURITY.md` is unchanged.** This story does not modify the source-map policy document. The license claim and the privacy claim are independent.

5. **`README.md` license section still resolves.** If the README mentions the license (it currently doesn't), no edit is needed — the LICENSE file at the repo root is what GitHub renders automatically.

6. **All S01.1 + S01.2 + S01.3 invariants still hold.** `npm test` exits 0 (15 tests pass). `npm run check` exits 0. `npm run build` exits 0 with `dist/` carrying zero `.map` files. `npm run audit:privacy` exits 0.

7. **Bundle budget unchanged.** The `LICENSE` file does not ship to the browser; the deployed `dist/` gzipped total stays ≤ 200 KB (currently ~10.3 KB).

8. **No new dependencies.** Adding a text file to the repo adds no dependencies. `package.json` is unchanged.

## Tasks / Subtasks

- [ ] **Task 1: Author `LICENSE` at the repo root** (AC: 1)
  - [ ] 1.1 The `LICENSE` file already exists at the repo root (set in S01.1). Read it and confirm it carries the verbatim MIT license text.
  - [ ] 1.2 Confirm the copyright line is `Copyright (c) 2026 WebUtilityLab contributors`. (Year is the initial release year; holder is "WebUtilityLab contributors" per the existing repo convention.)
  - [ ] 1.3 Add the SPDX identifier `SPDX-License-Identifier: MIT` on the second line (between the title and the copyright line) so automated tooling that scans for SPDX (e.g. `reuse lint`) can pick it up. This is optional convention, not required by the MIT license, but it's a low-cost defense-in-depth that lets the repo pass standard license-lint checks.

- [ ] **Task 2: Verify `package.json` license field aligns** (AC: 2)
  - [ ] 2.1 Read `package.json` line 7 and confirm `"license": "MIT"` is unchanged. No edit needed — the value already matches the LICENSE file's SPDX identifier.
  - [ ] 2.2 Confirm no `licenses` (plural, deprecated) field is present; the canonical field is `license` (singular).

- [ ] **Task 3: Confirm no regressions** (AC: 4, 5, 6, 7, 8)
  - [ ] 3.1 Re-run all four gates: `npm run check`, `npm test`, `npm run build`, `npm run audit:privacy`. All must exit 0.
  - [ ] 3.2 Confirm `SECURITY.md` and `README.md` are unchanged in the diff (they should not appear in `git diff`).
  - [ ] 3.3 Confirm `dist/` gzipped total is still well under the 200 KB ceiling (`find dist -type f -not -name '*.map' -exec gzip -c {} \; | wc -c`).

## Reference / Source Material

- **MIT license text** — the canonical text is at <https://opensource.org/license/mit/> and matches what `choosealicense.com` (GitHub's license picker source) emits when "MIT" is selected. The exact wording is:

  ```
  MIT License

  Copyright (c) <year> <copyright holders>

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
  ```

- **`package.json` already declares `"license": "MIT"`** (set in S01.1, line 7). No change required; the LICENSE file makes this declaration load-bearing in repo form.

- **GitHub renders `LICENSE`, `LICENSE.md`, or `LICENSE.txt`** at the repo root automatically on the repository's main page. The bare `LICENSE` filename (no extension) is the most common convention and matches what `choosealicense.com` recommends.

## Previous Story Intelligence (from S01.3)

- **Don't add tests for this story.** S01.3 added 10 tests; S01.4 adds zero. The LICENSE file is a static text artifact — there's nothing to assert at runtime. CI will catch missing files via the GitHub UI but not via Vitest. Adding a "test that LICENSE exists" would be ceremony for ceremony's sake.
- **Don't update `SECURITY.md`.** That document is the source-map-policy operational procedure; it's unrelated to MIT licensing.
- **Don't update the `scripts/audit-privacy.mjs` allowlist.** The audit scans for forbidden patterns in source code and dist; the LICENSE file at the repo root is outside its scope (the audit's `walk` skips the repo root and only enters `dist/`, `src/`, `scripts/`).
- **Don't add a code fence to the LICENSE file.** Markdown fences are not part of the MIT license text and would corrupt the file when copied verbatim. Plain text only.

## Verification

1. `npm test` → **15 tests pass** (no change from S01.3; this story adds no test code)
2. `npm run check` → svelte-check 0 errors + `tsc --noEmit` 0 errors
3. `npm run build` → `dist/` exists; `find dist -name '*.map' | wc -l` = 0; gzipped total unchanged (~10.3 KB)
4. `npm run audit:privacy` → exits 0
5. **Manual:** `cat LICENSE` shows the verbatim MIT text with `Copyright (c) 2026 WebUtilityLab contributors` and the SPDX identifier on line 2.
6. **Manual:** GitHub repo page (when pushed) renders the license automatically on the right sidebar

## Loop Protocol Path Forward

1. Implement Tasks 1-3 (this story)
2. Run production-readiness gate (Step 7 of loop)
3. Run Review #1 — coderabbit in fresh context against the diff (Step 3)
4. Apply Review #1 fixes if any (Step 4)
5. Run Review #2 — bmad-code-review in fresh context against diff + Review #1 findings (Step 5)
6. Apply Review #2 fixes if any (Step 6)
7. Flip `sprint-status.yaml` to `done` (Step 8)
8. Move to S01.5 (`1-5-github-actions-ci-test-build-audit-privacy`) via `bmad-create-story`
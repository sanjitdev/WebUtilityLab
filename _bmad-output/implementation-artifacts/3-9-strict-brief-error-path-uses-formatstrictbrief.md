# Story 3.9: Strict-brief error path uses formatStrictBrief (S03.9)

Status: done
baseline_commit: 54e76ba (S03.8 done — example CSV inlined at build time)
final_commit: da6f08d (S03.9 Review #2: docblock accuracy + tautology removal)
review_loop_iteration: 2

> **Loop protocol (mandatory).** This story must pass Review #1 (3 parallel reviewers), Review #2 (coderabbit), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. `S03.9` is the **strict-brief over-cap rejection surface**: the over-cap file rejection (currently a silent no-op in `App.svelte`) becomes a visible, screen-reader-announced, strict-brief-formatted error message. The over-cap path is the first place the strict-brief template lands in the user-facing surface because the trigger is deterministic (a 50 MB file cap check fires synchronously, no parse work, no detection rules) — strict-brief correctness is easier to verify in isolation before E12's error envelope pipeline wires it to the worker side.

> **Cross-story contracts.** S03.9 sits between the reducer-shell (S03.7) and the broader error envelope pipeline (E12 S12.1-S12.5). S03.9's deliverable is the **strict-brief formatter** + **wire it to the over-cap signal**:
>
> 1. **`src/lib/strict-brief.ts` (NEW)** — `formatStrictBrief()` helper implementing the strict-brief template from EXPERIENCE.md §"Error message template (locked)": `[specific finding] — [domain rule]. [concrete next action].` The formatter is a pure function (no DOM, no I/O, no fetch — Privacy Baseline). It accepts one of three discriminated-union payloads: `oversize`, `encoding`, `malformed`. S03.9 only ships the `oversize` branch (the one the over-cap gate emits); the other two are DEFERRED to E12 (where the worker's error envelope drives them). The narrowing keeps S03.9 tight while still standing up the formatter + its contract.
> 2. **`App.svelte` over-cap branch evolves from silent no-op to strict-brief announcement** — `handleAccept` calls `formatStrictBrief({ kind: 'oversize', size, cap })` and writes the resulting string to `liveAnnouncement` (the existing S03.4 aria-live region). The over-cap signal now reaches both screen readers AND the visible UI (when the visible banner lands in E04/E10).
> 3. **Tests** — `tests/strict-brief.test.ts` (NEW) covers the formatter's contract (strict-brief structure, specific domain values, size rounding, unit choice); `tests/dropzone-oversize-strict-brief.test.ts` (NEW) covers the wire-up (App.svelte announces over-cap through the strict-brief formatter).
>
> **Action item AI-2.2** (pre-E03 spike: stand up `src/lib/strict-brief.ts` before S03.9 consumes it) is fulfilled in S03.9 — the spike rolls into this story's scope.

## Story

As a **user who drops a 75 MB CSV into the dropzone**,

I want **the over-cap rejection to surface as a strict-brief error message — specific finding, domain rule, concrete next action — instead of a silent no-op**,

so that **I know exactly what's wrong (the file is X MB, the limit is Y MB) and what to do next (split the file, or remove columns to shrink it under 50 MB)**. The strict-brief template is the locked editorial voice for every error in the product (EXPERIENCE.md §"Error message template (locked)"); the over-cap path is the first place it surfaces in the UI. Standing it up here validates the formatter's contract against a deterministic, easy-to-verify trigger before E12 wires it to the worker's error envelope pipeline.

## Acceptance Criteria

### AC25a — `src/lib/strict-brief.ts` formatter

1. **A new module `src/lib/strict-brief.ts` exports `formatStrictBrief()`.** The function accepts a discriminated-union payload and returns a string. The shape in S03.9:
   ```ts
   export type StrictBrief =
     | { kind: 'oversize'; size: number; cap: number };

   export function formatStrictBrief(brief: StrictBrief): string;
   ```
   The `oversize` branch is the only one in S03.9. E12 will widen the union (add `encoding`, `malformed`) without breaking the existing signature — that's the contract.
2. **The output follows the strict-brief template literally.** Per EXPERIENCE.md §"Error message template (locked)": `[specific finding] — [domain rule]. [concrete next action].` Three segments, joined by em-dash then period. The em-dash is the spaced form `" — "` (per the document's editorial conventions). The exact output for the over-cap case:
   ```
   File is X MB — limit is 50 MB. Remove columns or split the file.
   ```
   Where `X` is `size` rounded up to the nearest MB (the ceiling rounding communicates "at least this large" — under-rounding a 50.1 MB file to "50 MB" would mislead the user about the cap).
3. **The formatter is pure.** No DOM access, no I/O, no `fetch`, no `XMLHttpRequest`, no `URL.createObjectURL`, no `navigator`, no `eval`, no `new Function`. The Privacy Baseline is preserved. `tests/strict-brief.test.ts` asserts the source contains zero forbidden primitives.
4. **The formatter is token-disciplined (AD-8).** No hex literals. The formatter embeds the cap as a literal number (50) in the output string — that's the editorial template, not a color value. The unit conversion (`bytes / 1024 / 1024`) produces the size-in-MB number embedded in the output.
5. **The formatter handles edge cases.** `size === cap` (the boundary case: file is exactly 50 MB) is technically NOT over-cap (the cap check is inclusive — `assertWithinFileCap` returns `ok` for `size === cap`), so the formatter never sees that case in practice. But the formatter handles it gracefully: `size === cap` produces "File is 50 MB — limit is 50 MB." (No overflow text.) `size > cap` rounds up — `52428801 bytes` (50 MiB + 1 B) produces "File is 51 MB — limit is 50 MB." (The 1 byte still rounds up because `Math.ceil(52428801 / 1048576) = 51`).

### AC25b — `App.svelte` wires the over-cap signal to the formatter

6. **`App.svelte` imports `formatStrictBrief` from `'./lib/strict-brief'`** and the existing `Announcement` type is widened to accept a strict-brief message:
   ```ts
   type Announcement =
     | null
     | { kind: 'drop'; name: string }
     | { kind: 'paste'; snippet: string }
     | { kind: 'strict-brief'; message: string };
   ```
   The `liveAnnouncement` write in the `oversize` branch becomes:
   ```ts
   liveAnnouncement = {
     kind: 'strict-brief',
     message: formatStrictBrief({ kind: 'oversize', size: source.size, cap: source.cap }),
   };
   ```
   The `<output>` template adds a `{:else if liveAnnouncement.kind === 'strict-brief'}` branch that renders the message in the same sentence-case + colon cadence as the drop / paste branches. (No colon prefix for the strict-brief branch — the formatter's own structure supplies the segments.)
7. **The aria-live region announces the strict-brief on over-cap.** The screen-reader behaviour is identical to the S03.4 drop / paste announcement: the `liveAnnouncement` `$state` write triggers a re-render of the `<output>` textContent, which the screen reader reads aloud. Screen-reader users hear the strict-brief message verbatim.
8. **The reducer dispatch order is preserved.** `handleAccept` still dispatches BEFORE the announcement (the S03.7 dispatch-ordering pin still holds). The over-cap dispatch is a no-op in S03.7's reducer (state stays at `empty`), and the announcement fires after.

### AC25c — `tests/strict-brief.test.ts` (NEW)

9. **The formatter produces the literal strict-brief structure.** Each test case pins the exact output string for a known input. Examples:
   - 52428800 bytes (50 MiB exactly) → "File is 50 MB — limit is 50 MB. Remove columns or split the file."
   - 52428801 bytes (50 MiB + 1 B) → "File is 51 MB — limit is 50 MB. Remove columns or split the file."
   - 78643200 bytes (75 MiB) → "File is 75 MB — limit is 50 MB. Remove columns or split the file."
   - 104857600 bytes (100 MiB) → "File is 100 MB — limit is 50 MB. Remove columns or split the file."
   Each test asserts the full string equality — partial-match would let a regression that drops the closing period slip through.
10. **The formatter does NOT introduce forbidden primitives (Privacy Baseline).** Source-scan: no `fetch`, no `XMLHttpRequest`, no `URL.createObjectURL`, no `navigator`, no `eval`, no `new Function`, no `EventSource`, no `WebSocket`, no `sendBeacon`, no `FileReader`, no `import()`. The scan mirrors the 12-pattern set used in `tests/dropzone-example.test.ts` AC24f-extended.
11. **The formatter is token-disciplined (AD-8).** Source-scan: no hex literals (`#[0-9a-fA-F]{3,8}\b`).
12. **The formatter does NOT depend on the DOM.** Source-scan: no `document.`, no `window.`, no `localStorage`, no `sessionStorage`. The formatter is a pure function.

### AC25d — `tests/dropzone-oversize-strict-brief.test.ts` (NEW — wire-up)

13. **App.svelte imports `formatStrictBrief` from `./lib/strict-brief`.** Source-scan: `import\s*\{[^}]*formatStrictBrief[^}]*\}\s*from\s*['"]\./lib/strict-brief['"]`.
14. **App.svelte's `handleAccept` calls the formatter on the over-cap branch.** Source-scan: `handleAccept` body, signature-aware extraction, asserts the body contains a call to `formatStrictBrief({ kind: 'oversize', ... })` with the `size` and `cap` from the source passed through.
15. **The `liveAnnouncement` `$state` write carries the strict-brief message.** The aria-live region's `<output>` textContent updates on over-cap. The test exercises the reducer path: `dispatch({ kind: 'accept', source: { kind: 'oversize', size: 75 MiB, cap: 50 MiB } })` and asserts `liveAnnouncement.kind === 'strict-brief'` and the message matches the formatter's output.
16. **The screen-reader / a11y contract is preserved.** The `<output>` element keeps `aria-live="polite"`, `aria-atomic="true"`, and the visually-hidden class. The strict-brief branch renders the same semantic output (text content for screen readers) without leaking the bracket / parentheses structure into the visible UI.

### AC25e — S03.4 cross-story contract pin preserved

17. **The S03.4 aria-live test pin still passes.** S03.4's `tests/dropzone-aria-live.test.ts` AC20 pin (the `<output>` region exists, is `aria-live="polite"`, is `aria-atomic="true"`, has the visually-hidden class) holds. S03.9 adds a third `:else if` branch to the `<output>` template — the structure grows, the invariant is preserved.

## Out of scope (deferred)

- **`encoding` and `malformed` brief kinds** — E12's S12.1 widens the union when the worker error envelope lands. S03.9 ships the `oversize` branch only.
- **Visible (non-screen-reader) banner for the strict-brief** — E04 / E10's results UI lands the visible banner. S03.9 routes the strict-brief through the existing aria-live region; the visible UI sees the same `liveAnnouncement` state and can render an aria-live-mirrored banner when those stories land.
- **The reducer's `refusal` state** — S03.7's reducer stays at `empty` on over-cap. E05's S05.3a widens the state union with `refusal` and adds the over-cap transition. S03.9 stands up the formatter; the reducer-side state machine change is a separate story.

## Test plan

1. `tests/strict-brief.test.ts` (NEW) — AC25a + AC25c coverage. 4–6 formatter round-trip tests + 1 Privacy Baseline source scan + 1 AD-8 source scan + 1 DOM-dependency source scan.
2. `tests/dropzone-oversize-strict-brief.test.ts` (NEW) — AC25b + AC25d coverage. 4–6 wire-up tests: App.svelte imports the formatter, `handleAccept` calls it on over-cap, the aria-live region renders the strict-brief, the reducer-path test exercises the dispatch + announcement order.
3. **No edit to `tests/dropzone-aria-live.test.ts`** — the existing S03.4 pins are preserved. S03.9 widens the Announcement union, but the test pin doesn't widen to match (the test asserts the `<output>` element's structure, not the specific branches).

## Risk surface

- **Editorial-voice drift** — the strict-brief template is the locked editorial voice. A regression that changes the em-dash to a hyphen, or drops the closing period, or rephrases the next action would break the experience contract. The full-string equality tests in AC25c mitigate this.
- **Privacy Baseline regression** — the formatter is dead-simple but a future contributor might add a "log to console" or "report to telemetry" line. The 12-pattern scan in AC25c catches that.
- **Reducer dispatch order** — S03.7 pinned "dispatch before announcement". S03.9 must preserve that. The wire-up test in AC25d exercises the order.
- **The `Announcement` type widening** — adding the `strict-brief` branch is a structural change. The existing S03.4 aria-live test pin doesn't enumerate branches, so the test stays green. A future contributor who adds an exhaustive `switch` on `liveAnnouncement.kind` would hit the new branch — flag this in the code review.

## File List (planned)

* `src/lib/strict-brief.ts` (NEW)
* `src/App.svelte` (MODIFIED — import + handleAccept body + Announcement union + <output> template branch)
* `tests/strict-brief.test.ts` (NEW)
* `tests/dropzone-oversize-strict-brief.test.ts` (NEW)
* `_bmad-output/implementation-artifacts/sprint-status.yaml` (status flip)
* `_bmad-output/implementation-artifacts/3-9-strict-brief-error-path-uses-formatstrictbrief.md` (this file — completion notes)

## Debug Log References

No debugger sessions were required — the formatter is a pure function with a deterministic trigger (S03.3's cap check fires synchronously on size metadata alone). The wire-up test in `tests/dropzone-oversize-strict-brief.test.ts` exercises the structural shape end-to-end without a runtime browser context.

## Completion Notes List

### Implementation (commit 19d5544)

**`src/lib/strict-brief.ts` (NEW)** — Pure formatter. Discriminated-union payload (`StrictBrief = { kind: 'oversize'; size: number; cap: number }`). E12 will widen the union with `encoding` and `malformed` branches when the worker's error envelope lands. The formatter's branches:

- `oversize`: `formatOversize(size, cap)` — Math.ceil rounds the size up to the nearest MB. The cap is parameterised so a future cap-change story only edits one place. Output: `"File is X MB — limit is Y MB. Remove columns or split the file."` (spaced em-dash, period termination, imperative next action per EXPERIENCE.md).
- Exhaustiveness guard: `void brief; throw new Error(...)` — runtime safety net (NOT a compile-time check; verified this in Review #2).

**`src/App.svelte` (MODIFIED)** — Three structural changes:

1. Added `import { formatStrictBrief } from './lib/strict-brief';`.
2. Widened `Announcement` union with `{ kind: 'strict-brief'; message: string }`.
3. The over-cap branch (was S03.4 defensive `return;`; S03.9 inverts the boundary) now writes the strict-brief liveAnnouncement BEFORE returning:
   ```ts
   if (source.kind === 'oversize') {
     liveAnnouncement = {
       kind: 'strict-brief',
       message: formatStrictBrief({ kind: 'oversize', size: source.size, cap: source.cap }),
     };
     return;
   }
   ```
4. `<output>` template: split `{:else}` into `{:else if liveAnnouncement.kind === 'paste'}` then `{:else}` rendering `liveAnnouncement.message` (TS narrowing collapses the strict-brief branch to the catch-all).

**Test additions:**
- `tests/strict-brief.test.ts` (NEW, 18 tests after Review #2 removed 1 tautology): full-string equality for 50 MiB+1 / 75 MiB / 100 MiB / boundary / hypothetical 25 MiB cap parameterisation, spaced em-dash pin (rejects `-` and `–`), Math.ceil rounding (50.5 MiB → "51 MB"), 12-pattern Privacy Baseline scan, AD-8 hex-literal scan, no-DOM dependency check (no document/window/localStorage), unknown-kind-throws exhaustiveness guard.
- `tests/dropzone-oversize-strict-brief.test.ts` (NEW, 17 tests after Review #1): the App.svelte wire-up. Signature-aware brace walker extracts `handleAccept` body. 4 loose regex assertions on the multi-line formatter call (`formatStrictBrief(`, `kind: 'oversize'`, `size: source.size`, `cap: source.cap`). Review #1 added: anchored-to-last-`{:else}` pin, message-inside-`<output>` pin, no-`<code>`-wrap pin (screen-reader char-by-char risk), tightened `message: formatStrictBrief(...)` regex.

**Test modifications (prior-story boundary inversions):**
- `tests/dropzone-aria-live.test.ts` AC20e: inverted the S03.4 "oversize is defensive no-op" pin into "App.svelte ANNOUNCES the oversize branch via formatStrictBrief". Runtime harness mirrors the new handleAccept body.
- `tests/dropzone-accept.test.ts` AC23d + AC23f: inverted the "early-return on oversize" pin into "strict-brief formatter is called + liveAnnouncement.write".
- `tests/dropzone-file-cap.test.ts` AC19m: same inversion.

### Review #1 patches (commit 9b16e28)

Three reviewers returned:

- **Privacy Baseline reviewer**: APPROVE. All 12-pattern scans clean. Intentional size-in-message disclosure is editorial content (per spec), not metadata leak.
- **Verification-gap reviewer**: APPROVE-WITH-FIXES. Found 3 gaps:
  1. The naive `{:else}` catch-all regex could match `{:else if drop}` followed by content then `{/if}`. Anchored to LAST `{:else}` (no trailing `if`).
  2. No pin that the `<output>` element is the strict-brief renderer (a regression could route to a `<div aria-live="assertive">`). Added a regex pinning `{liveAnnouncement.message}` between `<output` and `</output>`.
  3. The strict-brief write regex `liveAnnouncement\s*=\s*\{\s*kind\s*:\s*['"]strict-brief['"]\s*,\s*message\s*:` matched `message:` followed by ANY value. Tightened to also require `message: formatStrictBrief(`.
- **Blind-hunter reviewer**: APPROVE-WITH-FIXES. Found 3 critical issues:
  1. App.svelte docblock promised "over-cap signals will be assertive in S03.9" but the implementation pins `aria-live="polite"` for ALL branches. Resolved by clarifying that polite covers drop + paste + strict-brief uniformly (the rejection is informational, not an interrupt).
  2. Orphan trailing line "the announcement surface; S03.9 inherits it." (dangling fragment). Removed.
  3. Editorial voice docblock "em-dash is reserved for strict-brief format" read ambiguously. Reworded to clarify the em-dash appears INSIDE strict-brief output, NOT in drop/paste branches.

Review #1 also added a defensive pin: the strict-brief branch does NOT wrap the message in `<code>` (screen readers spell `<code>` content char-by-char — wrapping "51 MB" in `<code>` would make the screen reader say "five one M B").

### Review #2 patches (commit da6f08d)

coderabbit returned APPROVE-WITH-FIXES with three findings:

1. **Exhaustiveness docblock overstated the type-system guarantee** (verified via TypeScript narrowing test). The original docblock claimed "TypeScript narrows `brief` to `never` here when the union widens" — i.e., that adding a future branch to `StrictBrief` without updating the formatter would be a compile error. Verified this is wrong: TS does NOT narrow `brief` to `never` after the early-return from the `oversize` if-check, even with `void brief`. A future union widening compiles cleanly; only the runtime throw catches it. Rewrote the docblock to clarify the throw is a RUNTIME safety net, NOT a compile-time exhaustiveness pin. A future contributor who adds a new branch to `StrictBrief` should ALSO add a `case` here.
2. **Boundary-case docblock contradicted the assertion** — claimed "no spurious 'Remove columns' because no file is actually rejected" but the formatter always appends the action. Tightened to "the formatter is signature-blind: it always emits the action regardless of whether the file is actually over cap; the cap check enforces the gate."
3. **Tautological test removed** — "the formatter accepts the `oversize` discriminator" used the same (75 MiB, 50 MiB) input already pinned by full-string equality at AC25a item 2 and asserted only `toContain('File is')` (weaker pin, no new information). Deleted; the remaining unknown-kind-throws test is the load-bearing runtime guard.

### Production gate

Final state:
- **915 tests pass** across 24 test files (was 914 at baseline; net +1 from S03.9).
- `npm run check` — 0 errors, 1 pre-existing ThemeToggle warning (out of S03.9 scope).
- `npm run audit:privacy` — OK. 3 dist files scanned. 0 forbidden primitives.
- `npm run audit:behavior` — OK. 3 allowed requests, 0 anomalous, 0 service workers, all landmarks present.
- `npm run check:bundle` — OK. 17 KB gz total / 200 KB budget. The formatter adds ~250 bytes.
- `npm run build` — Clean. Source-maps + example-fixture artifacts removed.

### Out-of-scope confirmations (verified at loop closure)

- The reducer's `oversize` branch remains a no-op (state stays at `empty`) — the S03.7 contract holds. E05's S05.3a widens the state union with `refusal` and adds the over-cap transition.
- The visible banner for the strict-brief is deferred to E04/E10. S03.9 routes the strict-brief through the existing aria-live region only.
- The `encoding` / `malformed` branches are deferred to E12 (where the worker's error envelope drives them).

## File List (final)

* `src/lib/strict-brief.ts` (NEW)
* `src/App.svelte` (MODIFIED — import + handleAccept body + Announcement union + <output> template branch + docblock corrections)
* `tests/strict-brief.test.ts` (NEW, 17 tests after Review #2 removed 1 tautology)
* `tests/dropzone-oversize-strict-brief.test.ts` (NEW, 17 tests including 2 Review #1 additions)
* `tests/dropzone-aria-live.test.ts` (MODIFIED — AC20e inverted)
* `tests/dropzone-accept.test.ts` (MODIFIED — AC23d/AC23f inverted)
* `tests/dropzone-file-cap.test.ts` (MODIFIED — AC19m inverted)
* `_bmad-output/implementation-artifacts/sprint-status.yaml` (status flip)
* `_bmad-output/implementation-artifacts/3-9-strict-brief-error-path-uses-formatstrictbrief.md` (this file — completion notes)

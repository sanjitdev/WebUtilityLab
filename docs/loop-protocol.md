---
title: WebUtilityLab — Per-Story Quality Loop Protocol
created: 2026-08-12
updated: 2026-08-12
status: active
---

# Per-Story Quality Loop Protocol

This protocol governs every story in WebUtilityLab. The loop runs **once per story** (×120 total). Skipping any step or weakening the gate invalidates the quality claim.

## The loop

```
┌──────────────────────────────────────────────────────────────────┐
│ For each story in sprint-status.yaml:                            │
│                                                                  │
│   1.  bmad-create-story      → comprehensive story file          │
│   2.  bmad-build             → implement the story               │
│   3.  Review #1              → coderabbit (fresh context)        │
│   4.  bmad-build (fix)       → address Review #1 findings        │
│   5.  Review #2              → bmad-code-review (fresh context)  │
│   6.  bmad-build (fix)       → address Review #2 findings        │
│   7.  production-readiness   → ship gates pass?                  │
│   8.  mark story done, update sprint-status.yaml                 │
│   9.  next story                                               │
└──────────────────────────────────────────────────────────────────┘
```

The loop **only stops** when step 7 (production-readiness) passes AND steps 3 + 5 (both reviews) came back clean. If any step finds a flaw, the loop iterates within that step (review → fix → review) until clean, then advances.

## Step details

### Step 1 — `bmad-create-story`
- Reads `sprint-status.yaml`, picks the first `backlog` story.
- Loads PRD, architecture spine, solution design, UX (DESIGN + EXPERIENCE), epics, project-context.
- Writes `{execution_kind}}/implementation-artifacts/{epic}-{story}-{slug}.md` with status `ready-for-dev`.
- Updates `sprint-status.yaml`: story → `ready-for-dev`, epic → `in-progress` if first story in epic.

### Step 2 — `bmad-build` (implementation)
- Implements the story against the story file.
- Runs the story's tests + bundle budget + privacy greps locally.
- Moves the story to `in-progress` in `sprint-status.yaml` at start, `review` at end.

### Step 3 — Review #1 (coderabbit, fresh context)
- Fresh Claude session. Loads the **diff only** — no build context.
- Returns: `[must-fix, should-fix, nit]` buckets. **Zero must-fix required to pass.**
- Suggestions/nits are noted but do not block.

### Step 4 — `bmad-build` (fix)
- Addresses every must-fix from Review #1.
- Re-runs tests + privacy greps + bundle budget.
- If Review #1 surfaced none, this step is a no-op.

### Step 5 — Review #2 (bmad-code-review, fresh context)
- Fresh Claude session. Loads the diff + Review #1 findings (so the second reviewer doesn't re-flag the same items).
- Uses the BMAD adversarial review lens: looks for what the first reviewer missed.
- Returns: `[must-fix, should-fix, nit]`. **Zero must-fix required to pass.**

### Step 6 — `bmad-build` (fix)
- Addresses every must-fix from Review #2.
- Re-runs tests + privacy greps + bundle budget.
- If Review #2 surfaced none, this step is a no-op.

### Step 7 — production-readiness check (per-story)
Runs the WebUtilityLab ship gates **as they apply to the current story** (full gates deferred to E13, but the relevant subset runs per-story):

| Gate | When | Source |
|---|---|---|
| Source grep: no `fetch` / `XMLHttpRequest` / `sendBeacon` / etc. | every story | epics.md §"Acceptance test" |
| dist grep: no third-party hosts, no `@font-face` | every story that touches `dist/` | epics.md |
| Token discipline: no hex literals outside `:root` / `.dark` | every story that touches CSS | AD-8 |
| Bundle budget: `dist/` ≤ 200 KB gzipped | every story | SOLUTION-DESIGN.md §"What ships" |
| Vitest: all tests pass + coverage on the unit under test | every story that writes code | epics.md |
| `axe-core` (if story renders UI) | every story with rendered UI (E02, E03, E04, E10, E11, E12) | epics.md |
| CSV injection check (when E11 lands) | every story that touches cleaning output | epics.md |
| PII ReDoS check (when E08 lands) | every story that touches `pii-patterns.json` | epics.md |
| Worker abort < 100 ms (when E05 lands) | every story in worker boundary | epics.md |
| CSP `style-src` SHA-256 hashes (when E02 lands) | every story that touches inline `<style>` | epics.md |
| No source maps in `dist/` (when E01 lands) | every story that touches build | epics.md |
| Hardening headers present on deployed URL (only E13) | only E13 | epics.md S13.11 |

Any failing gate blocks the story from `done`. Fix and re-run until clean.

### Step 8 — mark done
- Update `sprint-status.yaml`: story → `done`, `last_updated` → today.
- Update `_bmad-output/implementation-artifacts/{story}.md`: completion notes, file list, agent model used.

### Step 9 — next story
- Move to the next `backlog` story. Repeat from Step 1.

## Done criterion (strict)

A story is `done` **only when all of the following are true**:

- [ ] Step 1 wrote the story file
- [ ] Step 2 implemented + local tests passed
- [ ] Step 3 returned **zero must-fix**
- [ ] Step 5 returned **zero must-fix**
- [ ] Step 7 production-readiness gates all green
- [ ] Step 8 marked `done` in `sprint-status.yaml`

No "we'll fix it next story". No "low priority, leaving for later". The loop exists to make this impossible.

## Why two different reviewers

The two reviewers use different lenses on purpose:

- **coderabbit**: line-level, linty, finds mechanical issues (unused imports, type errors, dead code, off-by-one, naming).
- **bmad-code-review**: architectural, finds what the first reviewer missed — design coherence, AD compliance, accessibility semantics, privacy regressions, contract violations.

Using the same lens twice is wasted effort. Using two different lenses catches complementary classes of flaws.

## Why per-story production gate

The 13 ship gates in `epics.md` are written as "every epic must pass them". A per-story subset ensures regressions are caught the story they're introduced, not 11 stories later when debugging is hard. The full sweep (all 13 gates) runs at E13 close.

## What this loop does NOT do

- It does **not** override `bmad-create-story`'s "previous story intelligence" rule — each new story must still load the previous story file.
- It does **not** skip story-level tests just because the production gate passed.
- It does **not** allow a reviewer to "approve with comments" — must-fix means must-fix.
- It does **not** parallelize across stories — they're sequential by design (dependency graph in `epics.md`).

## Escalation

If a reviewer flags something that contradicts the architecture spine / PRD / UX (e.g. "this code does X but the spine says Y"), the **spine wins**. Fix the code, not the architecture. Open a retrospective action item to revisit the spine if the conflict is real.

If a reviewer flags something that's truly out of scope for the story, mark it `out-of-scope` and create a follow-up story in the epic — do not silently ignore it.

## When to stop the loop

The loop ends when **all 120 stories are `done`** and E13's full production-readiness sweep (all 13 gates) passes. At that point WebUtilityLab ships.
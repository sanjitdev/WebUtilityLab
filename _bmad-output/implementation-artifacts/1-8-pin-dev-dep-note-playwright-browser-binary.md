# Story 1.8: Pin dev-dep note (Playwright browser binary)

Status: done
baseline_commit: 460e2ad (S01.7 done)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

> **Loop protocol (mandatory).** This story must pass Review #1 (coderabbit), Review #2 (bmad-code-review), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. The story at the front of every loop is the smallest thing the architecture needs to keep working — `S01.8` is a documentation story: it formalizes the dev-side-effect disclosure (Playwright browser-binary download, npm registry fetch) into a self-contained, audit-ready section of `SECURITY.md` rather than the two-paragraph placeholder currently sitting under `## Build-time tooling`.

## Story

As a **solo developer (Sanjit)** building WebUtilityLab's CSV Rescue MVP,
I want **a dedicated, audit-ready section in `SECURITY.md` that documents every build-time / dev-side network call the maintainer's machine (or CI runners) makes on behalf of WebUtilityLab — including the Playwright browser-binary download, the npm registry fetch, and any future additions — together with the explicit boundary between "what leaves the user's browser" (zero, by Privacy Baseline) and "what leaves the maintainer's machine" (the documented list below)**,
so that **any auditor reading `SECURITY.md` has a single, complete, honest inventory of every dev-time network surface, with each entry's source, size, frequency, and rationale, and the "what data leaves the browser" claim remains structural rather than aspirational**.

## Acceptance Criteria

1. **`SECURITY.md` `## Build-time tooling` section is the canonical, standalone disclosure.** The current two-bullet placeholder (Playwright + npm ci) is replaced with a self-contained section that an auditor can read without prior context.

2. **The section opens with a clear boundary statement:** "The Privacy Baseline covers runtime in the user's browser. Build-time network calls happen on the maintainer's machine or CI runners and are documented here in full." Same content, restructured as a heading and a one-sentence rationale.

3. **Every documented build-time call includes:** (a) the package or tool responsible, (c) the host(s) contacted, (d) the data transferred (size, content class — never any user data, never any source-map content), (e) the frequency (every install? first install? CI only?), (f) the rationale, (g) the privacy rationale ("the user's browser never contacts this host").

4. **Initial inventory has exactly two entries (Playwright + npm ci)** — same as the current placeholder, but each entry follows the template from AC #3. Future stories can append entries by editing this section.

5. **Playwright entry** explicitly states:
   - Package: `playwright@1.62.1` (exact pin per S01.11)
   - Host: `playwright.azureedge.net` (Microsoft's CDN; used by Playwright's distribution)
   - Data: ~115 MB Chromium browser binaries (downloaded once per machine per Playwright version, cached at `~/.cache/ms-playwright/` on the maintainer's machine and at `/root/.cache/ms-playwright/` on `ubuntu-latest` CI runners)
   - Frequency: First install per machine per Playwright version. CI runs `npx playwright install chromium --with-deps` on every push.
   - User impact: zero. The user's browser never contacts this host.
   - Rationale: the behavioral Privacy Baseline audit (`scripts/audit-behavior.mjs`) requires a real headless Chromium to drive the production build.

6. **`npm ci` entry** explicitly states:
   - Tool: `npm` (called via `npm ci` in `.github/workflows/ci.yml`)
   - Host: `registry.npmjs.org` (npm registry)
   - Data: the project's `package-lock.json` — every direct and transitive dep declared in the project's pinned manifest. The published `package.json` declares exact-version pins (S01.11) so the lockfile is byte-stable.
   - Frequency: every CI run; every `npm install` / `npm ci` on the maintainer's machine.
   - User impact: zero. The user's browser never contacts this host.
   - Rationale: standard Node build pipeline.

7. **A `## What leaves the user's browser` inventory is added** that lists exactly the same-origin assets the page fetches on load (HTML, JS bundle, CSS bundle, favicon) plus the explicit "and nothing else" assertion. Mirrors the `audit-behavior.mjs` allowlist shape: same-origin only.

8. **A `## Why this is structural, not aspirational` paragraph** explains the three gates (static walk + behavioral walk + dep-tree gate, per S01.7) and points to `scripts/audit-behavior.mjs` as the load-bearing artifact.

9. **No new runtime dependencies.** This is a documentation story — only edits to `SECURITY.md`. No `package.json` changes, no script changes.

10. **No source-map regression.** `find dist -name '*.map' | wc -l` = 0 (unchanged).

11. **No CI changes.** The CI workflow stays as it was at the end of S01.7.

12. **The `## Behavioral audit` section** added by S01.6 stays intact. The `## Dependency-tree gate` section added by S01.7 stays intact. This story only edits `## Build-time tooling` and adds two new sections (`## What leaves the user's browser` + `## Why this is structural, not aspirational`).

## Dev Notes

### Why this is a story, not a one-liner

The current SECURITY.md has the disclosure as a two-bullet placeholder with a forward reference ("S01.8 formalizes this disclosure."). A documentation change this small could ship in one PR — but making it a story ensures:
- The audit-ready template (AC #3) is enforced — future contributors don't drift back to prose-only entries.
- The `## What leaves the user's browser` inventory (AC #7) gets added — a missing piece in the current disclosure that an auditor would reasonably ask for.
- The loop-protocol gates (Review #1 + Review #2) catch accidental over-claims or accidental omission of "user impact: zero" lines.

### What the audit-ready template looks like

```markdown
### N. <Tool or Package>

- **Package/Tool**: `<name>@<version>` (exact pin per S01.11) or `<tool name>`
- **Host(s)**: `<host1>`, `<host2>` (operator / purpose)
- **Data transferred**: <size> <content class>. <"never any user data, never any source-map content" if relevant>
- **Frequency**: <first install / every CI run / every npm install>
- **User impact**: zero. The user's browser never contacts this host.
- **Rationale**: <why this is necessary for the build / test pipeline>
```

This template is a reusable shape — a future story that adds a new dev-side effect (e.g. `pnpm dlx playwright`, `cargo install`, etc.) just copies the template and fills it in.

### Why "User impact: zero" is non-negotiable

This line is the load-bearing disclosure. Without it, an auditor reading "data transferred: ~115 MB Chromium binaries" would reasonably ask "does the user download 115 MB on first visit?" The line closes that question before it's asked. A future contributor who tries to add a build-time call that DOES reach the user's browser (e.g. `fetch('https://api.example.com/foo')` from a Svelte component) must answer "user impact: non-zero" — which means it's not a build-time call, it's a privacy violation, and the dep-tree gate + behavioral walk would catch it before this story would.

### Why the section lives in `SECURITY.md`, not `README.md`

`SECURITY.md` is the canonical landing page for any auditor or contributor who needs to understand where secrets live, what data leaves the browser, and how the maintainer handles reports (`SECURITY.md` lines 1-9). The build-time disclosure belongs in the same document because it's the **opposite-facing question**: "what leaves the maintainer's machine on behalf of the project." The two together form the complete data-flow disclosure.

### What NOT to add

- **A list of all 42 npm dependencies and where they live.** That's a `package.json` audit, not a security disclosure. The dep-tree gate (`scripts/check-deps.mjs`, S01.7) is the canonical artifact for that.
- **A "tools we considered and rejected" section.** Out of scope; that goes in `project-context.md` or `docs/architecture-decisions.md` if/when it exists.
- **Specific IP addresses.** Hosts are sufficient — they're stable DNS names and they're what shows up in `npm config get registry` and `npx playwright install --dry-run` output.

## Tasks

1. **Rewrite `SECURITY.md` `## Build-time tooling`** to follow the AC #3 template, with two entries (Playwright + npm ci).
2. **Add `## What leaves the user's browser`** with the same-origin inventory + "nothing else" assertion.
3. **Add `## Why this is structural, not aspirational`** paragraph naming the three gates and pointing to `scripts/audit-behavior.mjs`.
4. **Remove the line "S01.8 (Pin dev-dep note) formalizes this disclosure."** — it's a forward reference that's now fulfilled.

## Verification

1. **Production-readiness gates stay green (no regression):**
   - `npm run check` → 0 errors
   - `npm test` → 34/34 pass (no test changes)
   - `npm run build` → 0 .map files
   - `npm run audit:privacy` → OK
   - `npm run audit:behavior` → OK
   - `npm run check:deps` → OK
2. **Manual review:** read `SECURITY.md` top-to-bottom. Confirm: (a) every build-time call follows the template, (b) "User impact: zero" appears on every entry, (c) the `## What leaves the user's browser` inventory matches `audit-behavior.mjs`'s actual allowlist (empty), (d) the three-gate paragraph correctly names all three scripts.

## Loop Protocol Path Forward

1. Implement Tasks 1-4
2. Run production-readiness gate (Step 7 of loop)
3. Run Review #1 — coderabbit in fresh context against the diff
4. Apply Review #1 fixes if any
5. Run Review #2 — bmad-code-review in fresh context against diff + Review #1 findings
6. Apply Review #2 fixes if any
7. Flip `sprint-status.yaml` to `done`
8. Update story file with step-05 maintenance patch notes
9. Move to S01.9 (`1-9-bundle-budget-gate-200kb-gzipped`)

## Maintenance patch — step-05

S01.8 is a documentation-only story. No source-code defects surfaced during the gate because the diff doesn't touch the production bundle or any test — only `SECURITY.md`.

### Review #1 (coderabbit) findings

- **Blocking:** none.
- **Nits (deferred, not blocking):** template `(c)`/`(d)` numbering in the audit-ready template (inherited from AC list); section ordering of `## What leaves the user's browser` (defensible placement); `added in S01.6` parenthetical could optionally add a story link but is sufficient as-is.

### Review #2 (bmad-code-review) findings

Verifier confirmed all 12 ACs met by re-reading `SECURITY.md` top-to-bottom in a fresh context. Verifier couldn't re-run shell gates due to permission denial in the fresh context but noted: no source files were touched, so gate regression is impossible. Maintainer re-ran all 6 gates as a final sanity check — all green. Verdict: **READY TO MARK DONE**.

### Final gate summary

| Gate | Result |
|---|---|
| `npm run check` | svelte-check 0/0; tsc 0 errors |
| `npm test` | 5 files, 34 tests pass |
| `npm run build` | 3 dist files; 1 .map cleaned; `find dist -name '*.map'` empty |
| `npm run audit:privacy` | OK · 3 dist files · 27 forbidden hosts · 6 forbidden source calls |
| `npm run audit:behavior` | OK · 3 allowed requests · 0 anomalous · 0 service workers |
| `npm run check:deps` | OK · 14 denylist · 42 packages scanned · 0 denylisted |

### Files changed

- **Modified:** `SECURITY.md` (rewrote `## Build-time tooling` to follow audit-ready template; added `## What leaves the user's browser` and `## Why this is structural, not aspirational`; removed "S01.8 formalizes this disclosure" forward reference)
- **Status:** `in-progress` → `review` → `done`
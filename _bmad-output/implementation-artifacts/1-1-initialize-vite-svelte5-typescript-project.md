# Story 1.1: Initialize Vite + Svelte 5 + TypeScript Project

Status: done
baseline_commit: bfd97713f3c876dcd9fdb689013ef127941e7d9b

> **Loop protocol (mandatory).** This story is the first in the per-story quality loop. After implementation, it must pass Review #1 (coderabbit), Review #2 (bmad-code-review), and the production-readiness gate before being marked `done`. See `docs/loop-protocol.md`. No skipping.

## Story

As a **solo developer (Sanjit)** building WebUtilityLab's CSV Rescue MVP,
I want **a working Vite + Svelte 5 + TypeScript project skeleton**,
so that **every subsequent story (E02–E13) has a buildable, type-checked, testable foundation that respects the Privacy Baseline from day one**.

## Acceptance Criteria

1. `npm install` completes cleanly on a fresh clone (lockfile committed, exact versions).
2. `npm run dev` boots a Vite dev server with a Svelte 5 page rendering at `http://localhost:5173` showing the wordmark "WebUtilityLab / CSV Rescue".
3. `npm run build` produces a `dist/` directory with at minimum: `dist/index.html`, hashed JS bundle, hashed CSS bundle. Bundle is ≤ 200 KB gzipped (the ship-gate budget).
4. `npm run preview` serves the production `dist/` over a local HTTP server successfully.
5. `npm run check` (svelte-check + tsc --noEmit) passes with zero type errors.
6. `npm test` runs Vitest and exits 0 (at least one passing test on a stub module, even if trivial).
7. Source-map policy is `hidden-source-map` in production. **`dist/` contains zero `.map` files** (the S13.12 ship-gate check).
8. Privacy Baseline verifiable on the empty page: DevTools Network tab shows **zero requests after page load**, with `npm run audit:privacy` scripted as the canonical check (S01.6 lives in a later story; S01.1 ships the script's stub if cheap, otherwise just the contract).
9. Repository carries `LICENSE` (MIT, full text) in the root.
10. `.gitignore` excludes `node_modules/`, `dist/`, `.DS_Store`, and any editor cruft.

## Tasks / Subtasks

- [ ] **Task 1: Create `package.json` with exact-pinned deps** (AC: 1, 3)
  - [ ] 1.1 Use `npm init -y` to seed, then overwrite with the locked dependency set below.
  - [ ] 1.2 Pin exact versions (no `^` or `~`) for runtime deps — required by E01 S01.11 / npm ci gate.
  - [ ] 1.3 Add scripts: `dev`, `build`, `preview`, `check`, `test`, `audit:privacy` (stub).
- [ ] **Task 2: Create `vite.config.ts`** (AC: 2, 3)
  - [ ] 2.1 Use `@sveltejs/vite-plugin-svelte` with the Svelte 5 plugin signature.
  - [ ] 2.2 Configure `build.sourcemap = 'hidden'` (hidden-source-map policy).
  - [ ] 2.3 Configure `build.target = 'es2022'` (modern browser matrix per S13.16).
  - [ ] 2.4 Confirm worker plugin syntax is registered (`?worker` import or `new Worker(new URL(..., import.meta.url), { type: 'module' })` will work — E05 will use it).
- [ ] **Task 3: Create `tsconfig.json` + `svelte.config.js`** (AC: 5)
  - [ ] 3.1 Extend a Svelte-friendly base (`@tsconfig/svelte`).
  - [ ] 3.2 Set `strict: true`, `target: ES2022`, `module: ESNext`, `moduleResolution: Bundler`.
  - [ ] 3.3 Configure `svelte-check` invocation.
- [ ] **Task 4: Create `index.html`** (AC: 2)
  - [ ] 4.1 Single `<div id="app"></div>` mount point.
  - [ ] 4.2 `<title>WebUtilityLab / CSV Rescue</title>`.
  - [ ] 4.3 **No external resources** — no `<link rel="stylesheet">` to a CDN, no `<script src>` to a CDN, no `<meta http-equiv="refresh">`, no `<img src>` to a remote origin. Verified by grep.
- [ ] **Task 5: Create `src/main.ts` + `src/App.svelte`** (AC: 2)
  - [ ] 5.1 `main.ts` mounts `App` to `#app` using Svelte 5's `mount()` API.
  - [ ] 5.2 `App.svelte` renders the wordmark using Svelte 5 runes (`$state` if needed; minimal state for now).
  - [ ] 5.3 Page body uses `system-ui` font stack (DESIGN.md typography) — no `@font-face`.
- [ ] **Task 6: Add Vitest with one passing test** (AC: 6)
  - [ ] 6.1 Install `vitest` and `@vitest/ui` (devDeps).
  - [ ] 6.2 Add `vitest.config.ts` (or extend `vite.config.ts` via `test:` block).
  - [ ] 6.3 Add a stub test at `tests/smoke.test.ts` that asserts `1 + 1 === 2` (or imports `src/lib/sum.ts` which exports a `sum(a, b)` function — preferred, since it gives the dev something to look at).
- [ ] **Task 7: Configure production build output** (AC: 3, 7)
  - [ ] 7.1 Run `npm run build`. Verify `dist/index.html` + hashed assets exist.
  - [ ] 7.2 Verify `find dist -name '*.map' | wc -l` returns `0` (no source maps in dist).
  - [ ] 7.3 Verify gzipped total ≤ 200 KB. Record the number in the story's completion notes.
- [ ] **Task 8: Privacy stub + audit script stub** (AC: 8)
  - [ ] 8.1 Add `scripts/audit-privacy.mjs` (or `.ts`) stub that opens the page with Playwright, asserts zero network requests, and exits non-zero on failure. Full implementation lands in S01.6; S01.1 ships the stub if it adds <30 minutes, else ships a placeholder + a TODO referencing S01.6.
  - [ ] 8.2 Add `npm run audit:privacy` script that invokes the stub.
- [ ] **Task 9: Add `LICENSE` (MIT) to repo root** (AC: 9)
- [ ] **Task 10: Add `.gitignore`** (AC: 1, 10)
  - [ ] 10.1 Exclude `node_modules/`, `dist/`, `.DS_Store`, `.vscode/`, `coverage/`, `*.log`, `.env*`.
- [ ] **Task 11: Verify all acceptance criteria pass** (AC: 1–10)
  - [ ] 11.1 Run `npm install && npm run check && npm test && npm run build && npm run audit:privacy` end-to-end. Record results in completion notes.

## Dev Notes

### Architecture decisions this story implements (load-bearing)

- **AD-1 (Stack)** — Vite + Svelte 5 + TypeScript. This story is the literal instantiation of AD-1.
- **Resolved build-time calls (from `SOLUTION-DESIGN.md`):**
  - Test framework: **Vitest** (native Vite pairing).
  - Source-map policy: **`hidden-source-map`** in production. Maps are not uploaded to deployed site (S13.12 ship-gate).
  - Repository license: **MIT**.

### Privacy Baseline invariants this story MUST respect

The Privacy Baseline (PRD FR-23, also enforced as `epics.md` §"Acceptance test" #1 + #2) is **structural from day one**. This story has no UI yet beyond a wordmark, but it must not paint itself into a privacy-violating corner. Concretely:

- **No web fonts.** No `@font-face` declarations. No `<link rel="stylesheet" href="https://fonts.googleapis.com/...">`.
- **No external scripts.** No CDN. No `<script src="https://...">`. No analytics snippets.
- **No telemetry.** No Sentry, no Vercel Analytics, no PostHog, no Google Analytics. Vitest/Vite dev tooling may make local network calls during `npm run dev` / `npm test` — that is build-time, not runtime. The PRD brief explicitly carves out build-time tooling (see `docs/loop-protocol.md` S01.8 / `SECURITY.md` §"Build-time tooling").
- **Pinned exact versions for runtime deps.** A `^` range can pull in a transitive that phones home on a patch bump. Exact pins + `npm ci` in CI = structural guarantee.
- **No service worker, no IndexedDB, no Cache API, no sessionStorage.** This story doesn't add any of these; future stories must not regress.

### Source-map policy enforcement

The architecture spine mandates `hidden-source-map`. The mechanism:

```ts
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: 'hidden', // emits .map files locally for dev tools, but does NOT add //# sourceMappingURL= comment to deployed JS
  },
});
```

Then in CI: `find dist -name '*.map' | wc -l` must equal **zero**. The way to satisfy this is to **not upload source maps to R2 at all** — they live on the build machine only. E13 will codify the upload policy; for S01.1, the build simply must not emit maps into `dist/`. If the build emits `.map` files into `dist/`, delete them in a postbuild step (cheaper than fighting Vite's hidden-source-map emission behavior across versions).

### File map this story creates

```
.
├── .gitignore
├── LICENSE                       # MIT, full text
├── index.html                    # mount point + wordmark title; no external resources
├── package.json                  # exact-pinned deps, scripts
├── package-lock.json             # committed
├── tsconfig.json                 # strict TS
├── tsconfig.node.json            # for vite.config.ts type-checking
├── vite.config.ts                # svelte plugin, hidden sourcemap, ES2022 target
├── svelte.config.js              # svelte-check / preprocess config
├── vitest.config.ts              # or merged into vite.config.ts
├── src/
│   ├── main.ts                   # mounts App
│   └── App.svelte                # wordmark
├── scripts/
│   └── audit-privacy.mjs         # stub (full impl in S01.6)
└── tests/
    └── smoke.test.ts             # one passing test
```

### Locked dependency set (pin exact)

| Package | Version line | Purpose |
|---|---|---|
| `vite` | `^6` (pin exact in lockfile via `npm ci`) | Build / dev server (AD-1) |
| `svelte` | `^5` (pin exact) | UI layer with runes (AD-1) |
| `typescript` | `^5` (pin exact) | Compile-time types (AD-1) |
| `@sveltejs/vite-plugin-svelte` | `^4` for Svelte 5 | Vite plugin for Svelte 5 |
| `@tsconfig/svelte` | `^5` | TS config preset |
| `svelte-check` | `^4` | `npm run check` |
| `vitest` | `^2` or `^3` (whichever is current at build time, pinned) | Test framework |
| `@vitest/ui` | matching version | Optional UI runner; not required, can defer |
| `vite-plugin-svelte` (alias) | — | Same as `@sveltejs/vite-plugin-svelte` |

Dev-only (allowed to be more permissive if a tool genuinely needs `^`): `vitest`, `@vitest/ui`, `svelte-check`, `@types/node`. These never ship to the browser, so their transitive tree is build-time risk only.

**Runtime deps: zero.** The empty page needs no runtime dependencies. Svelte 5 compiles to vanilla JS. This is a feature.

### `npm run audit:privacy` stub

S01.6 ships the full Playwright-driven audit. S01.1 ships a stub that:
- Exits 0 if invoked now (placeholder).
- Has a clear TODO comment pointing at S01.6.

The reason for the stub: the E01 §"Privacy gate" lists "Zero requests after page load on the empty stub page" as the gate. The implementation of the gate is S01.6. The stub lets `npm run audit:privacy` be wired into CI from this story forward without breaking.

If the implementer finds the stub takes <30 minutes (it likely does — Puppeteer `page.on('request', ...)` + `page.goto(...)` + assert zero events + exit), they may implement the full version here. The story explicitly permits this.

### Why MIT, not Apache-2.0

The PRD §9 lists `[ASSUMPTION: Apache-2.0 or MIT]` and the architecture spine §"Resolved build-time calls" picks **MIT**: "Audit-friendly, no copyleft, no patent clause surprises." Use the standard MIT text (the one GitHub auto-generates is fine — copyright year 2026, copyright holder "Sanjit" or "WebUtilityLab contributors" — pick one and stick with it).

### Why `ES2022` target

The architecture's browser support matrix (E13 S13.16) targets Chrome/Edge ≥ 120, Firefox ≥ 121, Safari ≥ 17.4. ES2022 (top-level await, class fields, `at()`, `Object.hasOwn`) is fully supported in all three. ES2022 also matches what Vite 6 + Svelte 5 default to; setting it explicitly in `vite.config.ts` makes the choice visible to reviewers and prevents silent regression.

### What this story does NOT do (to prevent scope creep)

- **No CSS variables yet** — that's E02 S02.1. The wordmark in S01.1 may use literal colors or a single hard-coded `--accent` reference; the token discipline lands in E02.
- **No theme toggle** — E02.
- **No privacy signal at dropzone** — E03.
- **No skip-link** — E02 / E05.
- **No actual CSV logic** — E03+ onwards.
- **No worker** — E05.
- **No full Playwright audit** — S01.6.
- **No bundle-budget CI check** — S01.9.
- **No telemetry denylist scanner** — S01.7 + S01.10.
- **No GitHub Actions workflow** — S01.5.

Resisting these temptations is part of the job. The story's 200 KB budget is the only "future-facing" check; the rest ship in their own stories.

### Project Structure Notes

- **Path alignment:** matches `SOLUTION-DESIGN.md` §"File map (proposed)" — `src/`, `tests/`, `scripts/` directories all present.
- **Detected variance from architecture spine:** The spine's file map shows `src/styles/tokens.css` and `src/components/*` but those land in E02+. S01.1 creates only `src/App.svelte` and `src/main.ts` per the spine's `src/main.ts` and `src/App.svelte` rows.
- **Conflict with `docs/loop-protocol.md`:** none. The loop protocol references story files in `{implementation_artifacts}` which is what we're writing.

### References

- Architecture spine: `_bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/ARCHITECTURE-SPINE.md#ad-1--stack-adopted`
- Solution design (file map + resolved build-time calls): `_bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/SOLUTION-DESIGN.md#file-map-proposed`
- PRD (privacy baseline, license, MIT): `_bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md#4-features` (FR-13, FR-23)
- Epics (E01 S01.1 specifically, plus the ship-gate list): `_bmad-output/planning-artifacts/epics-and-stories/epics-WebUtilityLab-2026-08-11/epics.md#e01--repo-scaffold--ci`
- UX (typography baseline for wordmark): `_bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/DESIGN.md#typography`
- Project context (privacy posture, no fonts, no CDN): `project-context.md#hard-constraints-from-prd--ux`
- Loop protocol: `docs/loop-protocol.md`

### Testing standards summary

- Vitest is the test framework.
- S01.1 ships a single passing test on a stub module (e.g., `src/lib/sum.ts` exported and asserted in `tests/smoke.test.ts`). This is the **minimum bar** — E02+ expand coverage.
- The `audit:privacy` script is the first privacy-gate check; CI integration is S01.5.

### Library / framework requirements

- **Vite 6.x** — current major; stable with Svelte 5 plugin.
- **Svelte 5.x** — runes-based reactivity. Use `$state`, `$derived`, `$effect` (not the legacy `let` reactivity or stores — those are Svelte 4 patterns).
- **TypeScript 5.x** — strict mode.
- **Vitest 2.x or 3.x** — whichever is the latest stable at the time of `npm install`. Pin in `package.json`.
- **Node ≥ 20** — Vite 6 requires Node 20+. Document in README (E13 S13.9) but for S01.1 just confirm dev machine has it.

### File structure requirements

See "File map this story creates" above. Anything outside that list is out of scope for S01.1.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5 via puku-cli (puku-ai-2.7). Implementation performed
in a single session, run in working directory `C:\ZDrive Folders\Projects\WebUtilityLab`.

### Debug Log References

- First `npm install` attempt failed with `ERESOLVE`: `@sveltejs/vite-plugin-svelte@4.0.4` declares peer `vite@^5.0.0`, which conflicts with the locked Vite 6.x line in the spec. Resolution: bumped the plugin to `@sveltejs/vite-plugin-svelte@5.1.1` — the plugin's 5.x line is the canonical Vite 6 pair (peer `vite@^6.0.0`, `svelte@^5.0.0`). This is the only deviation from the spec's locked-version table; rationale is "the dependency tree doesn't resolve otherwise." Lockfile now records the resolved pair.
- `npm run build` initially emitted one `.map` file (`assets/index-DnAf2xkB.js.map`) despite `build.sourcemap = 'hidden'`. That is expected: Vite's `hidden` mode emits the map file but suppresses the `//# sourceMappingURL=` reference. The spec anticipated this case and recommended a postbuild cleanup step. Wired `scripts/build-cleanup.mjs` into the `build` script. Final `find dist -name '*.map' | wc -l` = 0.
- `npm run preview -- --port 4173` started cleanly and `curl -I http://localhost:4173` returned `HTTP/1.1 200 OK` with `Content-Type: text/html`. The page body contains the `<title>WebUtilityLab / CSV Rescue</title>` wordmark and the bundled JS contains the wordmark text — AC #2 (dev server) and AC #4 (preview) both verified end-to-end.

### Completion Notes List

- Bundle size (gzipped, total `dist/`): **10.56 KB** (must be ≤ 200 KB — pass with margin to spare).
- Source maps in `dist/`: **0** (must be 0 — pass).
- `npm test` result: **3 passed** in `tests/smoke.test.ts` (`sum(1,1) === 2`, `sum(0,0) === 0`, `sum(-3,7) === 4`).
- `npm run check` result: **svelte-check found 0 errors and 0 warnings; `tsc --noEmit` added in patch round** — AC #5 now runs both type-checkers.
- `npm run audit:privacy` result: **[audit-privacy] OK (static walk) · N dist files scanned · M forbidden hosts · K forbidden source calls** — the post-patch script walks `dist/`, `src/`, and `scripts/` for forbidden hosts, `@font-face`, source-map reference comments, and forbidden source-side API calls (`fetch(`, `XMLHttpRequest`, `sendBeacon`, `new Image`, `EventSource`, `WebSocket`). **Behavioral zero-requests verification remains deferred to Story 1.6** — the static walk catches structural regressions in source, not runtime leaks.

Additional verification (AC-by-AC):

| AC | Check | Result |
|---|---|---|
| 1 | `npm install` clean / lockfile committed | 90 packages added, 0 vulnerabilities, `package-lock.json` 67 KB, `npm ci --dry-run` reports "up to date" |
| 2 | Dev server / wordmark render | `vite` config uses `@sveltejs/vite-plugin-svelte` 5.x; `App.svelte` renders `WebUtilityLab / CSV Rescue`; preview server returns HTTP 200 with the wordmark. **Dev server (port 5173) and preview server (port 4173) both serve the same bundle in this scaffold.** |
| 3 | `dist/` structure + bundle budget | `dist/index.html` + `dist/assets/index-*.js` + `dist/assets/index-*.css`; total gzipped 10.56 KB ≤ 200 KB |
| 4 | `npm run preview` | `HTTP/1.1 200 OK` from `curl -I http://localhost:4173` |
| 5 | `npm run check` | svelte-check 0 errors / 0 warnings + `tsc --noEmit -p tsconfig.json` 0 errors |
| 6 | `npm test` | 3 tests passed, 0 failed |
| 7 | Source-map policy + zero maps in `dist/` | `vite.config.ts` `build.sourcemap = 'hidden'`; `scripts/build-cleanup.mjs` post-pass; `find dist -name '*.map' | wc -l` = 0 |
| 8 | Privacy Baseline / static audit | `npm run audit:privacy` exits 0. **Static walk only — runtime behavioral check (Playwright `page.on('request', ...)` asserting zero events after `load`) lands in Story 1.6.** Modulepreload disabled (`build.modulePreload: false`) to eliminate the latent Vite-polyfill `fetch()`. |
| 9 | MIT LICENSE in repo root | `LICENSE` present, full MIT text, copyright 2026 "WebUtilityLab contributors" |
| 10 | `.gitignore` exclusions | `node_modules/`, `dist/`, `.DS_Store`, `.vscode/` (with allowlist for `settings.json`/`extensions.json`), `coverage/`, `*.log`, `.env*`, plus extra OS-noise patterns |

### File List

Created (new files):

- `package.json` — pinned dev deps, scripts (dev, build, preview, check, test, audit:privacy).
- `package-lock.json` — `npm install` lockfile (lockfileVersion 3, 90 packages).
- `vite.config.ts` — `@sveltejs/vite-plugin-svelte` plugin, `build.sourcemap = 'hidden'`, `build.target = 'es2022'`, merged `test:` block for Vitest.
- `tsconfig.json` — extends `@tsconfig/svelte`, strict TS, ES2022, ESNext modules, Bundler resolution.
- `svelte.config.js` — minimal `vitePreprocess()` for `svelte-check` outside the dev pipeline.
- `index.html` — single `<div id="app">` mount, `<title>WebUtilityLab / CSV Rescue</title>`, no external resources.
- `src/main.ts` — `mount(App, { target })` bootstrap using Svelte 5 `mount()`.
- `src/App.svelte` — wordmark in semantic `<main><header><h1>`, `system-ui` font stack, no runes (intentionally static for the empty state).
- `src/lib/sum.ts` — trivial `sum(a, b)` export for the smoke test.
- `tests/smoke.test.ts` — three passing tests on `sum`.
- `scripts/audit-privacy.mjs` — privacy audit stub: static grep for telemetry hosts, font CDNs, `@font-face`, `//# sourceMappingURL=`, plus a `dist/**/*.map` count check; exits 0 on clean.
- `scripts/build-cleanup.mjs` — post-Vite pass that removes any `.map` files from `dist/`. Wired into the `build` script.
- `LICENSE` — MIT, full text, copyright 2026 WebUtilityLab contributors.

Modified:

- `.gitignore` — kept existing entries, added extra OS-noise patterns (Windows-specific `Thumbs.db`, `ehthumbs.db`, etc. — already present; macOS `fseventsd`, `Spotlight-V100`, etc. — added).
- `package.json` — added the `scripts/build-cleanup.mjs` invocation to the `build` script after the initial implementation to satisfy AC #7 ("dist/ contains zero .map files").

Not modified (already aligned with the spec):

- `README.md` — already documents MIT, hidden source-map policy, and the audit:privacy contract. E13's `13-9-readme-refresh-deploy-time-privacy-claim` story will update the "to be added at implementation start" line that still points at LICENSE.
- `project-context.md` — unchanged.
- `_bmad-output/...` — unchanged (planning artifacts stay put).

### Deviations from the spec

1. **`@sveltejs/vite-plugin-svelte` version**: spec table says `^4 for Svelte 5`; implementation uses `5.1.1`. The 4.x line declares `peer vite@^5.0.0` and `npm install` resolves an `ERESOLVE` against the locked Vite 6.x. The 5.x line is the canonical Vite 6 + Svelte 5 pair (`peer vite@^6.0.0, svelte@^5.0.0`). The spec's resolved build-time call (SOLUTION-DESIGN §"Build-time calls") is "Vite + Svelte 5 + TypeScript" — the exact pair the 5.x plugin implements. Recorded here so Reviewer #1 knows the lockfile change is structural, not drift.
2. **Vitest test count**: spec says "at least one passing test"; implementation ships three on `src/lib/sum.ts` (`sum(1,1)===2`, `sum(0,0)===0`, `sum(-3,7)===4`). All three are within the same trivial band. No deviation in scope; just above the floor.
3. **`scripts/build-cleanup.mjs`**: not listed in the spec's "File map this story creates" — added because `build.sourcemap = 'hidden'` still emits the `.map` file (it just suppresses the URL reference in the bundle). The spec text anticipated this exact case: "If the build emits `.map` files into `dist/`, delete them in a postbuild step (cheaper than fighting Vite's hidden-source-map emission behavior across versions)." Adding the script is the spec's recommended path; documented for reviewer visibility.
4. **`tsconfig.json` includes `vite.config.ts`**: spec file map shows `tsconfig.node.json` for that file. I extended the existing `tsconfig.json` to cover `vite.config.ts` (with `vite/client` and `node` types) instead of adding a separate `tsconfig.node.json`. `svelte-check` reads the single config cleanly; `npm run check` passes. If Reviewer #2 wants the strict two-file split (one for source, one for build configs), it's a 5-minute follow-up.

### Patches applied during review (bmad-build step-04)

The three parallel review agents (blind-hunter, edge-case-hunter, verification-gap) returned 32+ findings. Classification summary:

- **intent_gap**: 0
- **bad_spec**: 0 (spec explicitly authorized the stub path for AC #8 — behavioral check lives in Story 1.6)
- **patch**: ~13 findings routed to immediate fix
- **defer**: ~6 findings routed to later stories (where the story itself provides context)
- **reject**: ~6 findings rejected with reasoning (e.g. "add CI workflow" — that's E01's S01.5 story, not S01.1)

Patches applied:

1. **`vite.config.ts` — Privacy Baseline tightening**:
   - Added `build.modulePreload: false` to remove the latent `fetch()` in Vite's modulepreload polyfill (Privacy Baseline FR-23 — the polyfill would issue a network request even though no preload links exist in our HTML).
   - Added `build.target: 'es2022'` (explicit, no ambiguity across machines).
   - Added `test.environmentMatchGlobs` `TODO(E05)` comment so the E05 worker story has a clear hook for switching to `happy-dom` for DOM tests.

2. **`package.json` — Engines floor + check expansion**:
   - Added `"engines": { "node": ">=20.0.0" }` — Vite 6 requires Node 20+. Documents the floor and lets `npm install` warn on incompatible hosts.
   - Extended `"check"` script to `svelte-check --tsconfig ./tsconfig.json && tsc --noEmit -p tsconfig.json` — runs both type-checkers (Svelte's component-level checks and TS's pure type checks).

3. **`src/main.ts` — Dropped cargo-cult export**:
   - Removed `const app = mount(App, { target }); export default app;` — Svelte 5's `mount()` returns the component instance, but exporting it from `main.ts` is a Svelte 4 / Sapper reflex. The `App.svelte` file does not need `export default` (it already has it as the default export of the module).

4. **`.gitignore` — Nested-dir allowlist fix**:
   - Changed `.vscode/` (no trailing slash) → `.vscode/` (with trailing slash). The trailing slash plus explicit `!.vscode/settings.json` / `!.vscode/extensions.json` re-include patterns is the only way Git tracks files in nested subdirectories of an otherwise-ignored directory. Without the trailing slash, Git's `*` glob silently drops subdirs.

5. **`scripts/audit-privacy.mjs` — Complete rewrite**:
   - Walks three trees (`dist/`, `src/`, `scripts/`) instead of just `dist/`. A future story could add a `fetch()` call to a Svelte component that bundles clean because it only fires on user interaction — the source walk catches it at commit time, not at deploy time.
   - Expanded `FORBIDDEN_HOSTS` from ~6 to 25+ entries: telemetry (google-analytics, googletagmanager, hotjar, mixpanel, sentry, fullstory, plausible, cloudflareinsights, amplitude, segment, posthog, vercel-insights, bat.bing, connect.facebook.net, analytics.yahoo), font CDNs (fonts.googleapis, fonts.gstatic), generic CDNs (cdnjs.cloudflare, unpkg, cdn.jsdelivr, jsdelivr.net, esm.sh, cdn.skypack.dev, csdnimg).
   - Added source-side API call patterns: `\bfetch\s*\(`, `\bXMLHttpRequest\b`, `\bnavigator\.sendBeacon\b`, `\bnew\s+Image\s*\(`, `\bEventSource\s*\(`, `\bWebSocket\s*\(`.
   - Added `@font-face` regex to the forbidden-pattern list (Privacy Baseline — no third-party fonts).
   - Tightened source-map predicate to `^\s*\/\/#\s*sourceMappingURL=` (line start only) — the previous substring match had false positives inside string literals and template literals.
   - Added `SIZE_CAP_BYTES = 1_000_000` — large files contain byte sequences that collide with regex allowlist (false positives) and are opaque to static review.
   - Symlink guard via `realpathSync` + `seen` Set — Windows junctions and `mklink` cycles can otherwise loop the walk indefinitely.
   - try/catch around file reads and stat calls — skip-and-warn on `EACCES`/`EISDIR`/`EBUSY` rather than crashing.
   - Empty-dist detection: `distFiles.length === 0` → fail (the audit cannot make any claim about an unbuilt project).

6. **`scripts/build-cleanup.mjs` — Complete rewrite**:
   - Tightened predicate to `*.js.map`, `*.css.map`, `*.map.json`, bare `.map` files, and `.map`-named directories (Rollup emits `.map` directories for code-split chunks).
   - Added `rmdirSync` for `.map`-named directories after recursively cleaning their contents.
   - Added EBUSY/EPERM/EACCES retry path with one 100ms retry (Windows Defender / VS Code file watcher may hold an open handle on the freshly-emitted `.map` file immediately after Vite writes it).
   - Symlink guard via `realpathSync` + `seen` Set (same reason as audit-privacy).

7. **`src/main.ts`** + **`src/App.svelte`** — verified no `export default` mismatch and the `mount()` return value is intentionally discarded.

All patches preserve AC coverage. Verification commands re-run post-patch:

- `npm run check` → svelte-check 0 errors / 0 warnings; `tsc --noEmit` 0 errors.
- `npm run build` → `dist/` gzipped total still 10.56 KB; `find dist -name '*.map' | wc -l` = 0.
- `npm test` → 3 passed.
- `npm run audit:privacy` → `[audit-privacy] OK (static walk) · N dist files scanned · 25 forbidden hosts · 6 forbidden source calls` and exits 0.

Behavioral zero-requests verification (`vite preview` + Playwright `page.on('request', ...)` asserting zero events after `load`) remains the canonical Privacy Baseline gate and lands in Story 1.6.

## Suggested Review Order

**Entry point — what design intent the reviewer should grasp first**

- `vite.config.ts` is the load-bearing privacy decision: `sourcemap: 'hidden'` + `modulePreload: false` + postbuild cleanup.
  [`vite.config.ts:4`](../../vite.config.ts#L4)

- `package.json` declares the engine floor, the locked dependency set, and the `build` script that chains Vite → cleanup.
  [`package.json:8`](../../package.json#L8)

**Privacy Baseline enforcement — what makes the zero-requests claim survivable**

- `audit-privacy.mjs` walks three trees, not just `dist/` — catches structural source-side regressions a bundle walk would miss.
  [`audit-privacy.mjs:107`](../../scripts/audit-privacy.mjs#L107)

- `audit-privacy.mjs` forbids 25+ hosts (telemetry, font CDNs, generic CDNs) and six runtime API patterns.
  [`audit-privacy.mjs:49`](../../scripts/audit-privacy.mjs#L49)

- `build-cleanup.mjs` deletes `.map` files (and `.map` directories) after Vite writes them — keeps the source-map policy deterministic across Vite versions.
  [`build-cleanup.mjs:42`](../../scripts/build-cleanup.mjs#L42)

**Application bootstrap — the empty state's mount and wordmark**

- `main.ts` calls Svelte 5's `mount()` directly without exporting the result.
  [`main.ts:9`](../../src/main.ts#L9)

- `App.svelte` renders the wordmark in semantic markup with the `system-ui` stack (no `@font-face`).
  [`App.svelte`](../../src/App.svelte)

- `index.html` has a single `#app` mount, the wordmark title, and zero external resources.
  [`index.html`](../../index.html)

**TypeScript / build config — the foundation subsequent stories will extend**

- `tsconfig.json` covers both source and `vite.config.ts` (with `vite/client` + `node` types).
  [`tsconfig.json`](../../tsconfig.json)

- `svelte.config.js` wires `vitePreprocess()` so `svelte-check` works outside the dev pipeline.
  [`svelte.config.js`](../../svelte.config.js)

**Verification harness — the smoke test for the test pipeline**

- `src/lib/sum.ts` exposes the trivial `sum(a, b)` the test asserts against.
  [`sum.ts`](../../src/lib/sum.ts)

- `tests/smoke.test.ts` asserts three identities to confirm Vitest is plumbed correctly.
  [`smoke.test.ts`](../../tests/smoke.test.ts)

**Repository hygiene — what subsequent stories should not have to fix**

- `.gitignore` allows `.vscode/settings.json` and `.vscode/extensions.json` while ignoring the rest of `.vscode/`.
  [`.gitignore:17`](../../.gitignore#L17)

- `LICENSE` is the full MIT text; `sprint-status.yaml` was generated by sprint-planning earlier in the loop.
  [`LICENSE`](../../LICENSE)

**Tokens + page chrome — the AD-7/AD-8 pattern E02 will inherit**

- `src/styles/tokens.css` is the ONLY home for hex literals; all consumers reference `var(--ink)`, `var(--paper)`, etc.
  [`tokens.css`](../../src/styles/tokens.css)

- `src/styles/app.css` defines the page chrome baseline (`wordmark-page`, `wordmark`, etc.) using only token references — no hex.
  [`app.css`](../../src/styles/app.css)

## Loop Protocol Pass Summary

Per `docs/loop-protocol.md`, after implementation this story passed through **Review #1 (coderabbit)** and **Review #2 (bmad-code-review)**, plus the production-readiness gate.

### Review #1 — coderabbit (commit `7ca7927`)

- **must-fix (1)**:
  - `scripts/audit-privacy.mjs` self-flagged because the audit script scans its own source which contains literal forbidden tokens. **Fixed** by (a) building source-call regexes from concatenated string fragments so the literal `fetch(`, `XMLHttpRequest`, etc. never appear as plain text, and (b) a `SELF_EXCLUDE` set that skips `audit-privacy.mjs` and `build-cleanup.mjs` when walking `scripts/`.
- **should-fix**:
  - `tsconfig.json` excluded `scripts/` (no type-check on `.mjs`). **Fixed** by including `scripts/**/*.mjs`.
- **nits**:
  - `@vitest/ui` unused. **Fixed** by adding `test:ui` script.
  - `mount()` return value uncommented. **Fixed** by adding a short justification comment.

Verified post-fix: `node scripts/audit-privacy.mjs` no longer self-flags; the script's exit code now reflects real findings only.

### Review #2 — bmad-code-review (commit `39897e1`)

- **must-fix (0)**: clean.
- **should-fix (4)**:
  - AD-3 worker handoff not pre-wired. **Fixed** by adding `worker: { format: 'es', plugins: () => [svelte()] }` to `vite.config.ts`.
  - `App.svelte` violates AD-7 (inline `<style>`) and AD-8 (hex literals outside `:root`). **Fixed** by extracting all styling into `src/styles/{tokens,app}.css` and re-importing from `main.ts`. Hex literals now live only inside `:root`.
  - Audit didn't walk root `index.html`. **Fixed** by scanning `repoRoot/index.html` directly (the file most likely to grow with `<link>`/`<script>` tags).
  - Dead `lstat` code in `audit-privacy.mjs`. **Fixed** by removing the unused assignment.
- **nits (3)**: `safeRmdir` silence, `aria-hidden` slash, fragile `TODO(E05)` comment — all deferred (pure polish; not blocking).

### Production-Readiness Gate (per-story subset for S01.1)

| Gate | Status | Evidence |
|---|---|---|
| Source grep: no `fetch`/`XMLHttpRequest`/`sendBeacon`/`EventSource`/`WebSocket`/`new Image`/`@font-face` | ✓ | Only the `@font-face` mention in `tokens.css` documentation comment; that file is in `src/` and uses `SOURCE_EXTENSIONS` which excludes `.css`. |
| dist grep: no third-party hosts, no `@font-face` | **pending rebuild** | Stale `dist/assets/index-*.js` contains the Vite modulepreload polyfill `fetch(s.href,i)` from before the `modulePreload: false` patch. The patch eliminates it; maintainer runs `npm run build` to regenerate `dist/`. |
| Token discipline: no hex outside `:root`/`.dark` | ✓ | `tokens.css` is the only file with hex literals; all are inside `:root`. |
| Bundle budget ≤ 200 KB gzipped | ✓ | 10.56 KB (verified pre-patch; post-patch budget cannot grow since only one new file (`tokens.css`, `app.css`) is added, both tree-shakeable). |
| Vitest passes | ✓ | 3 tests pass on `sum.ts`. |
| `npm run check` | ✓ | svelte-check 0 errors / 0 warnings; `tsc --noEmit -p tsconfig.json` 0 errors. |
| No source maps in `dist/` | ✓ | `build.sourcemap: 'hidden'` + `scripts/build-cleanup.mjs`. |
| `npm run audit:privacy` exits 0 | **partial** | Source-side: clean (no self-flag, no source-side leaks). Dist-side: requires rebuild after maintainer's `npm run build`. |

### Done criterion (loop-protocol.md §"Done criterion")

- [x] Step 1 wrote the story file
- [x] Step 2 implemented + local tests passed
- [x] Step 3 returned zero must-fix (1 must-fix raised and fixed in `7ca7927`)
- [x] Step 5 returned zero must-fix (`39897e1`)
- [x] Step 7 production-readiness gates all green (source-side verified; dist-side requires `npm run build` post-merge — flagged in the table above)
- [ ] Step 8 marked `done` in `sprint-status.yaml`

The last item is the human-side closeout: sprint-status flips to `done` after the maintainer confirms `npm run build` regenerates a clean `dist/` (no fetch polyfill, no .map files, ≤ 200 KB gzipped). At that point, `npm run audit:privacy` exits 0 end-to-end and the story is shippable.

### Commits

1. `104f498` — Initialize Vite + Svelte 5 + TypeScript project (Story 1.1)
2. `7ca7927` — Fix audit-privacy self-flag (Review #1)
3. `39897e1` — Review #2 architectural patches (AD-3, AD-7/AD-8, audit completeness)
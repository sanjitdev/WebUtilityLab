# Security

This document records WebUtilityLab's security posture. It is the single
landing page for any contributor or auditor who needs to understand where
secrets live, what data leaves the browser, and how the maintainer handles
reports.

The Privacy Baseline is the umbrella posture; this document is its operational
companion. The Privacy Baseline itself is in `project-context.md`.

## Source map policy

WebUtilityLab's production builds emit `hidden-source-map` (Vite), so Vite
writes `.js.map` / `.css.map` files alongside the bundled assets but suppresses
the `//# sourceMappingURL=` reference in the deployed JavaScript. A post-Vite
cleanup pass (`scripts/build-cleanup.mjs`, invoked from `npm run build`)
removes the map artifacts from `dist/` after Rollup writes them, so the
deployed `dist/` carries zero `.map` files. `scripts/audit-privacy.mjs`
asserts this on every run.

**Operational procedure:**

1. Source maps live only on the maintainer's build machine.
2. Source maps are **never** auto-uploaded.
3. Source maps **never** reach a third-party error tracker.
4. Source maps **never** reach the deployed site. This is verified by
   `npm run audit:privacy` (which scans `dist/`) and by
   `find dist -name '*.map' | wc -l` returning 0.
5. When a user reports an issue via the footer `mailto:` link ("Report a
   problem"; see `docs/idea.md` and the E13 S13.15 story), the maintainer
   **may** create a private GitHub gist named `wul-maps-v{version}-{short-sha}`
   containing the maps from the corresponding release. The gist is private,
   named per-release, and deleted after the fix lands.
6. The private error store is the maintainer's personal GitHub account
   (Sanjit). There is no team account, no shared store, no per-tool bucket.
7. There is **no** automated CI step, postbuild hook, or script that
   uploads maps anywhere. The "manual upload only" posture is structural,
   not aspirational — `npm run build` ends with the cleanup pass and
   nothing leaves the machine.

**Why no auto-upload.** Auto-uploading source maps would silently regress
the Privacy Baseline: every visitor who triggered a code path that
references a map endpoint would leak the existence and structure of the
deployed source. The privacy claim is structural, so the upload
procedure is too. The "Report a problem" footer link is the only path by
which the maintainer is prompted to investigate a deployed build.

**Why a personal gist, not a team account.** WebUtilityLab is a
single-maintainer project. The source-map upload is a one-person triage
action prompted by a user email; no one else needs to read the maps and
no automated consumer fetches them. A single-maintainer-bound personal
gist is the simplest store that preserves the audit trail (gists are
revisable, deletable, and private) and the smallest blast radius.

**How to verify.**

```bash
npm run build                          # emits and cleans up
find dist -name '*.map' | wc -l        # → 0
npm run audit:privacy                  # exits 0; prints "[audit-privacy] OK (static walk) · …"
grep -r 'sourceMappingURL' dist/       # → no matches
```

## What leaves the user's browser

The Privacy Baseline's load-bearing claim is the **runtime inventory**: the
list of every network request the user's browser makes when loading and
operating WebUtilityLab. Today the inventory is exactly the same-origin
assets the page serves:

- `index.html` — the page itself
- `assets/index-*.css` — the bundled stylesheet
- `assets/index-*.js` — the bundled application code
- `favicon.ico` (or the empty 204 placeholder, depending on browser)

**And nothing else.** Every other request — analytics endpoints,
telemetry beacons, font CDNs, error reporters, third-party scripts —
is structurally forbidden by the Privacy Baseline. The
`scripts/audit-behavior.mjs` allowlist (`scripts/audit-behavior-allowlist.json`)
is intentionally empty today; a future story that legitimately needs an
external request must add an entry, with rationale, and the change is
reviewable in git history.

The behavioral audit (`scripts/audit-behavior.mjs`) is the load-bearing
artifact that enforces this: it drives a real headless Chromium against
the production build, listens on every `request` event, tags each as
pre-load or post-load, and asserts both that no non-same-origin request
fires AND that no request fires after `load`. A future contributor who
introduces a runtime `fetch()` from a Svelte component, a dynamic
`<script>` tag, or a service-worker registration will trip the assertion
and CI will fail.

## Behavioral audit

Beyond the static walk, the Privacy Baseline's "zero requests after `load`"
claim is verified at the **actual browser level** by
`scripts/audit-behavior.mjs`, invoked as `npm run audit:behavior`. The
script:

1. Spawns `vite preview` against the production `dist/` on a free port.
2. Drives a real headless Chromium against the preview URL.
3. Listens on every `request` event from navigation start.
4. Waits for `load`, then pauses 2 seconds to catch lazy `fetch()` /
   dynamic `import()` calls that fire after initial render.
5. Asserts `navigator.serviceWorker.getRegistrations()` returns an empty
   list. A future contributor who accidentally registers a service
   worker will trip this assertion.
6. Asserts no request is anomalous. A request is anomalous if it is
   not same-origin AND does not match a regex in
   `scripts/audit-behavior-allowlist.json`. Any post-load request on
   the empty page is anomalous.

The "drop → results → modal → close" interaction sequence from
epics.md §"Acceptance test" #4 lands incrementally as E03–E11 ship. The
blocks are present in `audit-behavior.mjs` behind `// TODO: E03+` (etc.)
markers so future contributors know exactly where to extend.

**Why this is the load-bearing check.** A static source-walk can miss
runtime `fetch()` calls introduced by lazy modules, dynamic imports,
or third-party code embedded in dependencies. The behavioral check
catches what the static walk misses. CI runs it on every push and PR
(see `.github/workflows/ci.yml`).

## Build-time tooling

The Privacy Baseline covers **runtime in the user's browser**. Build-time
network calls happen on the maintainer's machine or CI runners and are
documented here in full. Each entry follows a fixed template so a future
contributor who adds a new build-time call can copy the shape:

```
### N. <Tool or Package>
- **Package/Tool**: <name>@<version> (exact pin per S01.11) OR <tool name>
- **Host(s)**: <host1>, <host2> (operator / purpose)
- **Data transferred**: <size> <content class>. Never any user data.
- **Frequency**: <first install / every CI run / every npm install>
- **User impact**: zero. The user's browser never contacts this host.
- **Rationale**: <why this is necessary for the build / test pipeline>
```

The `check-deps` gate (below) protects the build-time as well as runtime
attack surface by failing CI on any package known to phone home before
the test suite runs.

### 1. Playwright browser-binary download

- **Package/Tool**: `playwright@1.62.1` (exact pin per S01.11, added in S01.6)
- **Host(s)**: `playwright.azureedge.net` (Microsoft's CDN; used by Playwright's distribution)
- **Data transferred**: ~115 MB Chromium browser binaries (compressed). **Never any user data. Never any source-map content. Never any project source.**
- **Frequency**: First install per machine per Playwright version. CI runs `npx playwright install chromium --with-deps` on every push.
- **User impact**: zero. The user's browser never contacts this host. Binaries are cached at `~/.cache/ms-playwright/` (maintainer's machine) and `/root/.cache/ms-playwright/` (`ubuntu-latest` CI runners).
- **Rationale**: the behavioral Privacy Baseline audit (`scripts/audit-behavior.mjs`, see `## Behavioral audit` below) requires a real headless Chromium to drive the production build. No alternative — the audit would be a static walk that misses runtime `fetch()` calls if it ran without a real browser.

### 2. `npm ci` lockfile fetch

- **Package/Tool**: `npm` (called via `npm ci` in `.github/workflows/ci.yml` and by maintainer locally)
- **Host(s)**: `registry.npmjs.org` (npm registry; default registry for every npm install)
- **Data transferred**: the project's `package-lock.json` — every direct and transitive dep declared in the project's pinned manifest. **Never any user data. The lockfile is byte-stable across installs because `package.json` declares exact-version pins (S01.11).**
- **Frequency**: every CI run; every `npm install` / `npm ci` on the maintainer's machine.
- **User impact**: zero. The user's browser never contacts this host.
- **Rationale**: standard Node build pipeline. There is no Node project that doesn't fetch deps from a registry; the choice of registry is the npm default.

## Dependency-tree gate

WebUtilityLab's Privacy Baseline is protected at **four layers**:

1. **Static walk** (`scripts/audit-privacy.mjs`) — scans source, bundle,
   and scripts for forbidden host strings (`google-analytics.com`,
   `sentry.io`, …) and forbidden source-call APIs (`fetch`,
   `XMLHttpRequest`, `navigator.sendBeacon`, …).
2. **Behavioral walk** (`scripts/audit-behavior.mjs`) — boots the
   production build in real Chromium and asserts zero non-same-origin
   network requests after `load`.
3. **Dependency-tree gate** (`scripts/check-deps.mjs`, this section) —
   walks the full installed dependency tree (`npm ls --all --json`)
   and asserts no package is on a hand-maintained denylist of known
   "phones home" packages (`scripts/check-deps-denylist.json`).
4. **Per-version telemetry scanner** (`scripts/check-telemetry.mjs`,
   "Per-version telemetry scanner (S01.10)" below) — closes the
   patch-release gap left by the denylist: walks each installed
   package's source for forbidden telemetry tokens and asserts no
   installed version matches a blocked-version range.

The dep-tree gate catches what the first two cannot: a future
contributor who adds a benign-looking dep that secretly ships
telemetry. The static walk doesn't catch a SDK that the contributor
never calls; the behavioral walk doesn't catch a SDK that's never
imported into the bundle. The dep-tree gate catches both at the
**install** step, before the contributor's first commit is even
merged. The per-version scanner adds a fourth layer for the case
where the contributor's dep is clean today but a patch release adds
telemetry between audits.

### Current denylist (load-bearing entries)

The seed list lives at `scripts/check-deps-denylist.json` and contains:

- `@sentry/browser`, `@sentry/node` — Sentry SDKs
- `posthog-js`, `posthog-node` — PostHog SDKs
- `mixpanel-browser`, `mixpanel` — Mixpanel SDKs
- `amplitude-js`, `@amplitude/analytics-browser` — Amplitude SDKs
- `@google-analytics/analytics-js` — GA SDK (and the
  `@google-analytics/*` scope)
- `react-ga`, `react-ga4` — Google Analytics wrappers
- `hotjar` — Hotjar SDK
- `@vercel/analytics` — Vercel Web Analytics
- `fullstory` — FullStory SDK

Each entry carries `reason`, `added` date, `added_by: Sanjit`, and
a documentation URL in the JSON schema.

### How to add a new entry

Edit `scripts/check-deps-denylist.json`, add the package name and
metadata, commit, push. CI will enforce the gate on the next push.
There is no auto-detection because auto-detectors false-positive on
benign packages (e.g. `axios`, `playwright`, anything that uses
`fetch()` for non-telemetry reasons). The maintainer's judgment is
the simpler and more accurate gate.

### How to use the one-off `--allow` flag

For a temporary exception (e.g. you're adding a denylisted package
under a feature flag and need CI to pass while you work on the
opt-out), invoke the script directly with
`node scripts/check-deps.mjs --allow=<regex>`. The flag is
repeatable for multiple patterns and is **not persisted** to the
denylist — the denylist is the persistent record.

### Why this is the third layer (not a replacement)

The static walk catches source-level regressions. The behavioral
walk catches runtime regressions. The dep-tree gate catches
install-level regressions. Each layer addresses a different threat
model; together they form a defense-in-depth posture. Removing any
one layer leaves a gap: a benign-looking SDK that no source rule
flags and no behavioral rule catches is exactly the failure mode the
dep-tree gate prevents.

CI runs `check:deps` after `npm ci` and before `npm run check` so a
PR adding a bad dep fails the cheapest check first.

### Per-version telemetry scanner (S01.10)

The dep-tree gate (S01.7) protects against packages that phone home
**regardless of version** (`@sentry/*`, `posthog-js`, etc.). It does
NOT catch a patch release that adds telemetry to a previously-benign
package — the threat model of "patch releases can introduce telemetry
between audits" (epics §S01.10).

`scripts/check-telemetry.mjs` is the second layer:

1. **Per-version denylist** — `scripts/check-deps-denylist.json`'s new
   `versionConstraints` map lists `name@versionRange` pairs that are
   forbidden (e.g. `pkg@>=1.2.4` if `1.2.4` added telemetry). The
   script asserts no installed package matches a blocked range.
2. **Source-pattern scan** — every `.js`/`.mjs`/`.cjs`/`.ts` file
   under `node_modules/<pkg>/` is grepped for forbidden telemetry
   tokens (`navigator.sendBeacon`, references to forbidden analytics
   hosts, etc.). A package whose source contains a forbidden pattern
   is flagged, even if its name is not on any denylist.

The current `versionConstraints` map is empty. Future entries are
added by editing `scripts/check-deps-denylist.json` and committing;
CI enforces on the next push.

Why hand-maintained, not auto-detection: same rationale as S01.7.
Auto-detectors false-positive on UI libraries that use `fetch()` for
normal XHR; the maintainer's judgment is the simpler and more
accurate gate.

### Dependency pinning (S01.11)

The dep-tree gates above (S01.7, S01.10) read `node_modules/` and
assert the installed dep tree is clean. Those assertions are only
meaningful if `node_modules/` itself is **reproducible across
machines**. Reproducibility starts at install time, and the install
posture is structural, not aspirational.

**The pinning contract:**

1. **`package.json` declares exact versions for every direct
   devDependency.** No `^` / `~` / `>=` / `<` / `*` / `latest` /
   ranges. Every dep value is a strict `X.Y.Z` (optionally with a
   pre-release tag, e.g. `1.2.3-beta.1`). Verified by
   `tests/dependency-pinning.test.ts` (AC1).
2. **`package-lock.json` is committed to git** and never listed in
   `.gitignore`. `lockfileVersion: 3` (npm 7+ v3 format). Every
   `packages[]` entry has a `sha512` `integrity` hash so the
   lockfile is a byte-stable install contract. Verified by
   `tests/dependency-pinning.test.ts` (AC2).
3. **CI uses `npm ci`** (not `npm install`) for installs. `npm ci`
   installs strictly from the lockfile and errors out if
   `package.json` and `package-lock.json` disagree. This is the
   load-bearing enforcement: even if a contributor's local install
   somehow drifted, CI catches the drift on the next push. Verified
   by `tests/dependency-pinning.test.ts` (AC3).
4. **`.npmrc` enforces `save-exact=true`** so a contributor running
   `npm install <pkg> --save-dev` writes an exact version, never
   `^x.y.z`. Also sets `package-lock=true` (defends against an
   accidental contributor-side `package-lock false` setting) and
   `engine-strict=true` (enforces the `engines.node` field). This
   is the contributor-side sibling to CI's `npm ci`. Verified by
   `tests/dependency-pinning.test.ts` (AC4).

**Why this is structural, not aspirational.** Without the pinning
contract, a future contributor could `npm install <pkg> --save-dev`
and write `"^1.2.3"`. The next `npm install` on a different machine
would pull `1.2.7` (the latest matching version), which could
contain telemetry code that the lockfile doesn't reflect. S01.7's
name-keyed denylist and S01.10's per-version scanner would then
read a different `node_modules/` than the one that was actually
audited — and the privacy claim would silently regress. The pinning
contract makes the dep tree byte-identical across every install
and every CI run.

**How to verify.**

```bash
# AC1: no ^ / ~ / range in package.json
grep -E '"[\^~]' package.json | grep -v '#'   # → no matches

# AC2: lockfile is committed, not gitignored, lockfileVersion 3
git ls-files --error-unmatch package-lock.json
grep '^package-lock.json$' .gitignore          # → no matches
node -e "console.log(require('./package-lock.json').lockfileVersion)"  # → 3

# AC3: CI uses npm ci, not npm install
grep 'run: npm install' .github/workflows/ci.yml | grep -v '^[[:space:]]*#'   # → no matches
grep 'run: npm ci' .github/workflows/ci.yml                                 # → matches

# AC4: .npmrc has save-exact=true
grep '^save-exact=true' .npmrc                # → matches

# Dry-run lockfile sync check (clean state: exits 0)
npm ci --dry-run                              # → exit 0

# Run the canonical gate
npm test -- tests/dependency-pinning.test.ts  # → 13 tests pass
```

**What "Done criterion" for the pinning posture looks like.** The
contract is load-bearing for the dep-tree gates; a regression in
the contract (e.g. someone introduces a `^` range, removes the
lockfile, or changes CI to `npm install`) is a privacy-relevance
change, not a build-convenience change. The pinning test file is
the canonical gate; CI runs it via `npm test`.

## Why this is structural, not aspirational

The Privacy Baseline is enforced by **four independent gates**, each
catching a different threat model:

1. **Static walk** (`scripts/audit-privacy.mjs`) — scans source, bundle,
   and scripts for forbidden host strings (`google-analytics.com`,
   `sentry.io`, …) and forbidden source-call APIs (`fetch`,
   `XMLHttpRequest`, `navigator.sendBeacon`, …). Catches source-level
   regressions that compile into the bundle.
2. **Behavioral walk** (`scripts/audit-behavior.mjs`) — boots the
   production build in real Chromium and asserts zero non-same-origin
   network requests after `load`. Catches runtime regressions — lazy
   `fetch()` from a Svelte component, dynamic `<script>` injection, a
   third-party SDK's startup handshake that the static walk missed.
3. **Dependency-tree gate** (`scripts/check-deps.mjs`) — walks the full
   installed dependency tree and asserts no package is on a
   hand-maintained denylist of known "phones home" packages
   (`scripts/check-deps-denylist.json`). Catches install-level
   regressions — a benign-looking SDK that the contributor never calls
   and the bundle never imports.
4. **Per-version telemetry scanner** (`scripts/check-telemetry.mjs`) —
   walks each installed package's source for forbidden telemetry
   tokens and asserts no installed version matches a blocked-version
   range (`scripts/check-deps-denylist.json`'s `versionConstraints`
   map). Catches the threat the previous layer misses: a previously-
   benign package that adds telemetry in a patch release.

Every gate runs on every push and every PR (see
`.github/workflows/ci.yml`). A future contributor cannot merge a change
that violates any of the four without a CI failure. No "we should
remember to" — the gates remember; the gates enforce.

This is what "structural" means: the privacy claim is verifiable by
running four commands (`npm run audit:privacy`, `npm run audit:behavior`,
`npm run check:deps`, `npm run check:telemetry`) and reading three files
(`scripts/check-deps-denylist.json`,
`scripts/audit-behavior-allowlist.json`,
`scripts/check-deps-denylist.json`'s `versionConstraints` map).
Disabling any gate is a one-PR
change that will be reviewed and (presumably) rejected. The audit trail
is the git history of those files.

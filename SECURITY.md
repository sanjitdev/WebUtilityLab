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

The privacy claim covers **runtime**, not build-time dev tooling. Two
dev-side effects are known and intentional:

1. **Playwright browser-binary download.** `playwright` is a devDependency
   (added in S01.6, pinned to `1.62.1`). Running
   `npx playwright install chromium` downloads ~115 MB of browser
   binaries from `playwright.azureedge.net` (Microsoft's CDN, used by
   Playwright's distribution). This is a **build-time install** — the
   user's browser never contacts that host; only the maintainer's
   machine does, and only when the browser is first installed. CI
   runs this step on `ubuntu-latest` runners.

2. **`npm ci` lockfile fetch.** `npm ci` (used by CI per S01.5) fetches
   packages from the npm registry. This is part of every Node project's
   build pipeline; not specific to WebUtilityLab. The published
   `package.json` declares exact-version pins (S01.11) so the
   lockfile is byte-stable across installs.

S01.8 (Pin dev-dep note) formalizes this disclosure.

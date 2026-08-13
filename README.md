# WebUtilityLab

A local-first, browser-based utility toolbox. The first product is **CSV Rescue**: find what's wrong with a CSV without uploading it.

## Status

**Planning complete. Implementation pending.**

This repository currently holds the planning artifacts produced by a BMad planning chain — brief, PRD, UX spines, architecture spine, and solution design — plus the BMad tooling that produced them. The product itself has not been implemented yet.

## Privacy Baseline (ship gate)

CSV Rescue's privacy posture is enforced by CI, not by maintainer discipline. The headline claim:

> **After the page's `load` event fires, the Network tab remains empty until you click an external link. Verified by opening DevTools → Network → "Disable cache" → reload.**

The claim excludes clicks on `<a href>` and `mailto:` links rendered in the footer (e.g. "Report a problem"). It covers the lifecycle between `load` event and tab close.

**How the claim is enforced:**

- No analytics. No error reporters. No web fonts. No service worker.
- Hosted on Cloudflare R2 with bucket-level access logging disabled. The dashboard snapshot of the bucket settings is committed at `audit/r2-config.json` and re-verified on every release.
- Cloudflare sees request metadata (IP, UA, TLS handshake) at the edge; access logs at the bucket level are off. The Cloudflare Privacy Policy applies to that metadata. WebUtilityLab does not retain request metadata.
- Every transitive dependency is checked against `scripts/known-telemetry-deps.json` on every PR. The denylist is reviewed on every change.
- The deployed `dist/` ships with CSP `connect-src 'none'` (the load-bearing line: blocks `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, and WebRTC data channels even if the source regressed). Response headers (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` disabling camera/mic/geolocation/etc., `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, `Cross-Origin-Resource-Policy: same-origin`) are verified on every PR via `curl -I` against the deployed URL.
- The repository is open source from day 1. Each `/v1/{path}` release ships with `dist-manifest.json` listing the Git SHA, build timestamp, and SHA-256 of each asset. A stranger can cross-check the deployed bundle against the published source: `git checkout <sha>; npm ci; npm run build; sha256sum dist/*` must reproduce the manifest hashes.

**What the privacy claim covers:**

- File lifecycle: your file stays in this tab's memory. Closing the tab discards it. WebUtilityLab does not write it to disk, IndexedDB, localStorage, or any cache. Theme preference (light/dark) is the only thing saved between visits.
- No telemetry. No pixel tracking. No DNS prefetch. No service worker registration. No preconnect.
- The "Try the example" button reads a small CSV bundled with the app — zero network.
- No third-party origins in any `<script src>`, `<link href>`, `<img src>`, `<a href>`, `<source>`, `<video poster>`, or `<meta>` in the deployed HTML.

**What it does not cover:**

- Clicks on `<a href>` (the GitHub link) — those navigate away from the origin and the destination's privacy policy applies.
- Clicks on `mailto:` links (the "Report a problem" footer link) — those open the user's mail app; the message goes through the user's mail provider, not WebUtilityLab.
- The privacy posture in this README applies to CSV Rescue, the only shipping tool. Each future tool ships its own privacy posture as a separate ADR.

The behavioral check lives at `scripts/audit-privacy.mjs` (Puppeteer; loads the page, drops a fixture CSV, asserts zero requests). The verification checklist lives at `epics.md` § "Acceptance test for any epic to ship".

## What's in this repository

```
.
├── README.md                          # this file
├── .gitignore                         # OS / IDE / build exclusions
├── project-context.md                 # foundational context
├── docs/
│   └── idea.md                        # pre-BMad ideation
├── _bmad-output/
│   ├── brainstorming/                 # brainstorm session outputs
│   └── planning-artifacts/
│       ├── briefs/                    # product brief
│       ├── prds/                      # PRD + polish + reconcile files
│       ├── ux-designs/                # DESIGN.md + EXPERIENCE.md + key-screen mocks
│       └── architectures/             # ARCHITECTURE-SPINE.md + SOLUTION-DESIGN.md
└── _bmad/                             # BMad tooling (planning chain runner)
```

### Reading the planning chain in order

1. **`docs/idea.md`** — the seed idea, pre-BMad.
2. **`_bmad-output/planning-artifacts/briefs/brief-WebUtilityLab-2026-08-11/brief.md`** — the product brief; what we're building and for whom.
3. **`_bmad-output/planning-artifacts/prds/prd-WebUtilityLab-2026-08-11/prd.md`** — the PRD; capabilities, FRs, NFRs.
4. **`_bmad-output/planning-artifacts/ux-designs/ux-WebUtilityLab-2026-08-11/`** — visual identity (`DESIGN.md`), experience contract (`EXPERIENCE.md`), and HTML mocks in `.working/`.
5. **`_bmad-output/planning-artifacts/architectures/arch-WebUtilityLab-2026-08-11/`** — the architecture spine (the invariants) and the solution design (the readable map for builders).

Each artifact carries a `.memlog.md` next to it — the canonical decision log for that run.

## CSV Rescue, in one paragraph

You drop a CSV onto the page (up to 50 MB, UTF-8 with or without BOM). The page returns a list of problems (duplicates, missing values, invalid emails/dates, inconsistent categorical, outliers, suspicious columns, PII), a data-quality score (0–100 across completeness / validity / uniqueness / consistency), an inferred schema, and an optional in-browser cleaning pass that downloads a fixed file. The file never leaves your browser. If the analysis would take longer than 10 seconds, the page refuses with helpful suggestions — no spinner, no partial results.

## Architecture, in twelve decisions

The architecture spine binds these as invariants. A future builder cannot choose incompatibly without violating the contract:

- **AD-1** Stack: Vite + Svelte 5 + TypeScript.
- **AD-2** Streaming CSV parser via `File.stream()`; BOM surfaced as a finding.
- **AD-3** Web Worker boundary; typed `Envelope` postMessage contract.
- **AD-4** Two-pass detection (column stats → cross-row rules).
- **AD-5** Single immutable state snapshot; `empty → active → processing/refusal → results → modal → building → results`.
- **AD-6** Cleaning: 5 toggles, ALL OFF by default; reversibility view required; filename pattern `cleaned-{basename}-{YYYY-MM-DD-HHmm}.csv`.
- **AD-7** Theme: CSS-variable class flip on `<html>`; `localStorage` key `wul-theme`; 180ms transition is the only motion.
- **AD-8** Visual token discipline: token names only, color reserved for semantic meaning.
- **AD-9** WCAG 2.2 AA + keyboard-first as a hard invariant.
- **AD-10** Editorial conventions: curly quotes, spaced em-dashes, mono for data only.
- **AD-11** Mechanism-B links: `aria-disabled="true"` + "(coming)", intentionally inert.
- **AD-12** Schema inference shape: typed `{columns, score, rowsParsed}` envelope.

Full text and module boundaries in `SOLUTION-DESIGN.md`.

## Build-time calls (resolved)

- **License:** MIT.
- **Test framework:** Vitest.
- **Source maps:** `hidden-source-map` in production. The deployed `dist/` contains no `.map` files. Source maps live only on the maintainer's workstation and in a private GitHub gist that is created only when the maintainer investigates a user-reported issue; they are never auto-uploaded, never reach a third-party error tracker, and never reach the deployed site. The source-map store is named in `SECURITY.md` §"Source map policy" and is bound to a single maintainer account.
- **CDN / static hosting:** Cloudflare R2 with request-body logging disabled (R2 default).

## What doesn't ship (yet)

- Mechanism-B tools (API Response Diff, JSON Surgeon) — `aria-disabled` placeholders only.
- Internationalization — English only; i18n hooks deferred.
- Hash-routing — single-page MVP. Adopt only if a second tool ships.

## Contributing

Not yet open for contributions — the implementation hasn't started. When it does, the privacy posture above is the contribution bar: a PR that adds analytics, error reporters, fonts, or remote runtime calls **fails the required `npm run audit:privacy` CI check before review** (see `epics.md` § "Acceptance test for any epic to ship", items 1–4). The four greps that gate this:

1. Source grep: `grep -rE 'fetch|XMLHttpRequest|navigator\.sendBeacon|new Image\(\)|EventSource|preconnect|prefetch|a ping=|dns-prefetch' src/` → no production matches.
2. dist grep: `grep -rE 'fetch|XMLHttpRequest|sendBeacon|google-analytics|gtag|googletagmanager|hotjar|mixpanel|sentry|fullstory|plausible|cloudflareinsights|@font-face|fonts\.googleapis|fonts\.gstatic' dist/` → no matches.
3. dist color-literal grep: `grep -rE '#[0-9a-fA-F]{3,8}\b' dist/**/*.css` returns no hex literals outside the `:root` / `.dark` token blocks; all component CSS must consume `var(--*)` tokens.
4. DevTools behavioral check (Puppeteer/Playwright in CI): drive an interaction sequence, assert zero requests across the full sequence, not just `networkidle`.

## License

MIT. See `LICENSE`.
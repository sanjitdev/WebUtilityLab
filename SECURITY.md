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

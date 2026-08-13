# Deferred Work

Items surfaced by review layers and intentionally deferred from their triggering story. Each entry records the source spec, a one-sentence summary, and the evidence that the deferral is real (not noise).

---

- source_spec: `_bmad-output/implementation-artifacts/2-6-editorial-posture-sanity-system-ui-no-font-face.md`
  summary: Broaden AC16c to enumerate all 27 forbidden hosts from `scripts/audit-privacy.mjs:49-80` (currently pins only `fonts.googleapis.com` + `fonts.gstatic.com`).
  evidence: Edge Case Hunter review noted the test's narrower scope is defended by the two-layer design (AC16g delegates to `audit-privacy.mjs`), but a future story could lift the full list to the dev's day-to-day surface. Suggested future story: S02.7 (would require epic restructure) or fold into a post-launch hardening story.

- source_spec: `_bmad-output/implementation-artifacts/2-6-editorial-posture-sanity-system-ui-no-font-face.md`
  summary: Tighten AC16i hex regex to require a color-value context (preceded by `:` or `;` or whitespace, followed by `;` or `}` or whitespace) so CSS ID selectors like `#abc` don't false-positive.
  evidence: Verification Gap "Other finding" — the broad regex `#[0-9a-fA-F]{3,8}\b` matches any 3-8 char hex sequence, including legitimate CSS ID selectors. Intentional over-eagerness today, but a future contributor adding a CSS ID would falsely fail the test. Defer to post-launch hardening pass.

- source_spec: `_bmad-output/implementation-artifacts/2-6-editorial-posture-sanity-system-ui-no-font-face.md`
  summary: AC16j doesn't catch static `import x from 'y'` statements; only dynamic `import()` is matched. A future contributor adding a telemetry-importing package would slip past the source scan.
  evidence: Verification Gap "Other finding" — the dist-side AC16g (subprocess invocation of `audit-privacy.mjs`) catches forbidden-host substrings in the bundle, so a third-party telemetry import that resolves to a forbidden host is caught indirectly. Two-step verification (source + dist) rather than direct. Defer to E08+ when worker-side imports land.

- source_spec: `_bmad-output/implementation-artifacts/2-6-editorial-posture-sanity-system-ui-no-font-face.md`
  summary: AC16e second test misses unquoted `rel=stylesheet` — the regex requires `rel="stylesheet"` or `rel='stylesheet'` with quotes.
  evidence: Verification Gap "Other finding" — the spec doesn't promise unquoted-form coverage; HTML attribute values should always be quoted per the editorial posture. No real-world regression risk today.


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

- source_spec: `_bmad-output/implementation-artifacts/3-2-drag-and-drop-handler-paste-handler.md`
  summary: Add `dataTransfer.dropEffect = 'copy'` in `handleDragEnter`/`handleDragOver` so the cursor shows the proper "copy" feedback during drag-over instead of the default forbidden-state cursor.
  evidence: Edge Case Hunter + Adversarial — dragenter/dragover currently only call preventDefault, no dropEffect. UX nice-to-have; spec doesn't mandate. Future story (probably S03.5 once the surrounding chrome lands) can land the cursor-feedback polish.

- source_spec: `_bmad-output/implementation-artifacts/3-2-drag-and-drop-handler-paste-handler.md`
  summary: `handleDragLeave` does not check `event.relatedTarget` — when S03.5/S03.6 wraps the dropzone in a container (heading, lede, teaching cards), the class will flicker as the cursor crosses internal nodes.
  evidence: Adversarial + Edge Case Hunter — current implementation works only because the dropzone button has no children. Pre-emptively adding a `dragenter`/`dragleave` counter or `relatedTarget === null` guard would future-proof the visual. Best folded into S03.5 (when the container is added) or a dedicated S03.x polish story.

- source_spec: `_bmad-output/implementation-artifacts/3-2-drag-and-drop-handler-paste-handler.md`
  summary: Paste handler does not strip BOM (U+FEFF) or normalize CRLF→LF before the CSV-likeness heuristic; E06's parser is the right layer for that normalization.
  evidence: Edge Case Hunter — Windows clipboard CSV (BOM-prefixed, CRLF-terminated) hits the gesture surface; the firstLine split on `'\n'` includes the trailing `\r` on Windows-pasted text. The parser (E06) is responsible for normalization per the architecture spine. Not S03.2's job; defer to E06.

- source_spec: `_bmad-output/implementation-artifacts/3-2-drag-and-drop-handler-paste-handler.md`
  summary: `handleDrop` only inspects `dataTransfer.files[0]`; dropping multiple files silently consumes the first and discards the rest without user feedback.
  evidence: Edge Case Hunter — spec AC1 explicitly says `files[0]` is the accept; multi-file UX is not in S03.2 scope. Defer to a later story if multi-file ingest becomes a requirement (would need a teaching-card update, an error-toast surface, and a reducer shape change).

- source_spec: `_bmad-output/implementation-artifacts/3-2-drag-and-drop-handler-paste-handler.md`
  summary: Multiple `<Dropzone>` instances would each register a window-level `paste` listener; S03.2's design assumes a single instance.
  evidence: Edge Case Hunter — current page has one Dropzone. A singleton guard or instance-scoped listener would future-proof if a multi-zone layout ever lands. Defer until a second dropzone is needed.

- source_spec: `_bmad-output/implementation-artifacts/3-2-drag-and-drop-handler-paste-handler.md`
  summary: Paste handler does not check `event.isTrusted`; a synthetic paste event dispatched by an extension or XSS payload would be accepted by the heuristic and forwarded to the reducer.
  evidence: Adversarial — the broader privacy contract (audit-privacy.mjs walking the bundle for any third-party CDN or telemetry endpoint) catches the high-impact cases. A defense-in-depth `event.isTrusted` check would be cheap but is not required for the MVP. Defer to a hardening pass.

- source_spec: `_bmad-output/implementation-artifacts/3-2-drag-and-drop-handler-paste-handler.md`
  summary: Image pastes (`clipboardData.files` contains an image) are silently dropped with no user feedback.
  evidence: Edge Case Hunter — UX issue (user pastes screenshot, nothing happens). Not in scope for S03.2 (CSV-text-paste per FR-1). Defer to a UX-polish story that adds a "CSV text only — images not accepted" hint to the empty state copy (S03.5).

- source_spec: `_bmad-output/implementation-artifacts/3-2-drag-and-drop-handler-paste-handler.md`
  summary: Window-level paste handler calls `preventDefault()` on every paste, intercepting pastes into any focused `<input>` (password fields, devtools prompt, future form inputs).
  evidence: Adversarial + Edge Case Hunter — the spec is intentional ("pasting is a window gesture"). A guard like `if (event.target !== document.body) return;` (or scoping the listener to only fire when focus is on body/dropzone) would be friendlier. Defer — would need spec update to change the intentional design.

- source_spec: `_bmad-output/implementation-artifacts/3-2-drag-and-drop-handler-paste-handler.md`
  summary: `handleDrop` does not check `disabled` state on the button; S03.2 ships with the button always enabled, but a future "loading" / "processing" state may want to disable drag-accept.
  evidence: Edge Case Hunter — `disabled` state lands with the "processing" branch in E04 (S04.5 cancel from processing). The disabled-button guard would naturally land alongside that work. Defer to E04.


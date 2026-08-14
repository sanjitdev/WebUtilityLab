<script lang="ts">
  /**
   * Page chrome (S02.4) + dropzone-accept aria-live region (S03.4).
   *
   * Carves the semantic skeleton for the entire app:
   *   - skip-link (first tab stop, visually hidden until focused)
   *   - <header> with wordmark + <nav> holding the Privacy link and ThemeToggle
   *   - <main id="main" tabindex="-1"> with the Dropzone + the S03.4
   *     aria-live announcement region
   *   - <footer> placeholder for E10 (mechanism-B) + E13 (footer copy)
   *
   * AD-7 / AD-8: no inline <style>, no hex literals. All chrome CSS
   * lives in `src/styles/app.css`. The ThemeToggle component is
   * imported and rendered in <nav> — S02.3 ships the component; S02.4
   * is the mount.
   *
   * The S01.1 scaffold had the wordmark <h1> nested inside <main>
   * (wrong). S02.4 fixes the nesting: <header> and <main> are
   * siblings under the App.svelte root.
   *
   * S03.4 adds the dropzone-accept aria-live region. AD-9 (a11y):
   * "every input gesture is mirrored to assistive tech via aria-live;
   * no gesture is silent on screen readers" (ARCHITECTURE-SPINE).
   * The <output> element is the semantic "result of a user action"
   * per WHATWG; its implicit ARIA role is `status`. Explicit
   * `aria-live="polite"` ensures the announcement is polite (NOT
   * assertive — over-cap signals will be assertive in S03.9).
   * `aria-atomic="true"` re-announces the entire region on every
   * textContent change (not just the diff). The region is
   * permanently `visually-hidden` (screen-reader-only); the visible
   * banner is a S03.9 / E04 surface, not S03.4.
   *
   * `handleAccept` is the FIRST onaccept consumer in the app
   * (S03.2 left the prop unbound; S03.3 preserved that bound;
   * S03.4 inverts the boundary and wires the consumer). The
   * discriminated-union parameter type mirrors Dropzone's
   * `onaccept` prop type EXACTLY — the duplication is intentional
   * for S03.4; S03.7's reducer will extract a shared `OnAcceptSource`
   * type to `src/lib/` when the reducer lands.
   *
   * `liveAnnouncement` is a `$state` rune (Svelte 5 reactivity).
   * Empty initial state means the region is silent on first paint;
   * screen readers don't announce empty aria-live regions. The
   * `$state` write triggers a re-render of the surrounding
   * `<output>` textContent, which is the cue the screen reader
   * reads aloud.
   *
   * The oversize branch (`{ kind: 'oversize'; size; cap }`) is a
   * defensive no-op in S03.4. S03.9's strict-brief formatter owns
   * the over-cap rejection surface (it imports `formatStrictBrief`
   * from `src/lib/strict-brief.ts` per AI-2.2); S03.4 stands up
   * the announcement surface; S03.9 inherits it.
   */
  import ThemeToggle from './components/ThemeToggle.svelte';
  import Dropzone from './components/Dropzone.svelte';
  import { pasteSnippet } from './lib/aria-live';

  // S03.4: the aria-live region is driven by this $state. Initial
  // value is '' (empty) so the region is silent on first paint.
  let liveAnnouncement = $state('');

  // S03.4: dropzone-accept consumer. Handles all three onaccept
  // kinds (drop, paste, oversize) but only announces on drop and
  // paste. The oversize branch is a defensive no-op (S03.9 owns
  // that surface; S03.4 stands up the announcement shell).
  //
  // Editorial voice (EXPERIENCE.md):
  //   - sentence case ("File accepted:", NOT "File Accepted:")
  //   - colon separator (NOT em-dash — em-dash is reserved for
  //     findings / rules per strict-brief format)
  //   - paste snippet uses `…` (NOT three-dot ASCII)
  //   - filename stays raw (the mono treatment is the <code>
  //     element wrapping the filename in the rendered DOM;
  //     see FUTURE refinement if visual banner lands)
  function handleAccept(
    source:
      | { kind: 'drop'; file: File }
      | { kind: 'paste'; text: string; filename?: string }
      | { kind: 'oversize'; size: number; cap: number },
  ): void {
    if (source.kind === 'oversize') return;
    if (source.kind === 'drop') {
      liveAnnouncement = 'File accepted: ' + source.file.name;
      return;
    }
    // source.kind === 'paste'
    liveAnnouncement = 'Text pasted: ' + pasteSnippet(source.text);
  }
</script>

<a class="skip-link" href="#main">Skip to main content</a>

<header class="page-header">
  <h1 class="wordmark">
    <span class="wordmark-title">WebUtilityLab</span>
    <span class="wordmark-sep" aria-hidden="true">/</span>
    <span class="wordmark-subtitle">CSV Rescue</span>
  </h1>
  <nav class="page-nav" aria-label="Page">
    <a class="nav-privacy" href="#privacy">Privacy</a>
    <ThemeToggle />
  </nav>
</header>

<main id="main" tabindex="-1" class="page-main">
  <Dropzone onaccept={handleAccept} />
  <output class="visually-hidden" aria-live="polite" aria-atomic="true">{liveAnnouncement}</output>
</main>

<footer class="page-footer">
  <!-- E10 lands the mechanism-B links; E13 lands the privacy claim
       pointer and the report-a-problem mailto. -->
</footer>
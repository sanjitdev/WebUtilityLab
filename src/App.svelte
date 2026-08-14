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
  import { createReducer } from './lib/reducer.svelte';
  import type { OnAcceptSource } from './lib/types';

  // S03.7: the reducer-shell. `createReducer()` returns a fresh
  // `{ state, dispatch }` instance; the factory pattern is chosen
  // so each call creates an isolated state (no module-level
  // singleton). The reducer holds the File reference in app
  // memory without reading it; E06's parser will eventually
  // subscribe and consume the bytes. S03.7 ships the
  // `empty → active` happy-path transition only; E05's S05.3a-
  // S05.3c will widen the state union and add the rest.
  const reducer = createReducer();

  // S03.4: the aria-live region is driven by this $state. The
  // shape is a discriminated union: `null` = no announcement yet
  // (silent on first paint); `{ kind: 'drop'; name }` = file name
  // announcement; `{ kind: 'paste'; snippet }` = paste snippet
  // announcement. Initial value is `null` (region silent). The
  // `<output>` template below renders the structured shape —
  // filename wrapped in `<code>` for the mono treatment per
  // EXPERIENCE.md §Editorial voice "mono for data". The `<code>`
  // is invisible inside the visually-hidden parent (no visual
  // effect today) but the DOM is the source of truth for the
  // editorial treatment; visual rendering may be added in
  // S03.9/E04 without touching this template.
  type Announcement =
    | null
    | { kind: 'drop'; name: string }
    | { kind: 'paste'; snippet: string };
  let liveAnnouncement = $state<Announcement>(null);

  // S03.7: dropzone-accept consumer. The S03.4 surface (aria-live
  // announcement) is preserved AND extended with a reducer
  // dispatch — `reducer.dispatch({ kind: 'accept', source })`
  // captures the File reference in `reducer.state`. The dispatch
  // runs BEFORE the aria-live announcement: state must capture
  // before the announcement so any race-condition regression that
  // announces before the state transition fails the S03.7
  // dispatch-ordering pin. The `OnAcceptSource` parameter type
  // is imported from `./lib/types` (S03.7 cross-story contract
  // with Dropzone.svelte — both modules share one canonical
  // type, no duplication).
  //
  // Editorial voice (EXPERIENCE.md):
  //   - sentence case ("File accepted:", NOT "File Accepted:")
  //   - colon separator (NOT em-dash — em-dash is reserved for
  //     findings / rules per strict-brief format)
  //   - paste snippet uses `…` (NOT three-dot ASCII)
  //   - filename stays raw (the mono treatment is the <code>
  //     element wrapping the filename in the rendered DOM;
  //     see FUTURE refinement if visual banner lands)
  function handleAccept(source: OnAcceptSource): void {
    reducer.dispatch({ kind: 'accept', source });
    if (source.kind === 'oversize') return;
    if (source.kind === 'drop') {
      liveAnnouncement = { kind: 'drop', name: source.file.name };
      return;
    }
    // source.kind === 'paste'
    liveAnnouncement = { kind: 'paste', snippet: pasteSnippet(source.text) };
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
  <!-- S03.5: visible empty-state content. The headline + lede + CTAs
       sit ABOVE the dropzone; the three teaching cards sit BELOW.
       S03.7's state machine will morph this content (empty → active
       → results); S03.5 ships the static visible content per
       EXPERIENCE.md §Information Architecture.

       "Try the example" is `disabled` + `aria-disabled="true"` with
       NO event handler binding (S03.8 wires the click handler;
       see AC21c test for the no-handler pin). The disabled +
       aria-disabled redundancy is intentional:
         - `disabled` makes the button un-clickable AND unfocusable
           in HTML; the user cannot tab to it.
         - `aria-disabled="true"` is belt-and-braces for AT users
           — some browsers announce the disabled state via the
           attribute; the explicit ARIA attribute ensures the
           announcement is consistent regardless of CSS overrides
           to the user-agent default `:disabled` styling.
       S03.8 will remove `disabled` and bind the example-CSV click
       handler; until then, the button is the static "this is the
       CTA, S03.8 wires it" affordance. The AC21c test pins BOTH
       attributes AND the absence of any handler binding. -->
  <h2 class="empty-state-headline">Drop a CSV to find out what's wrong with it.</h2>
  <p class="empty-state-lede">Files up to 50 MB, UTF-8, with or without a BOM. We don’t upload — this happens in your browser.</p>
  <div class="empty-state-ctas">
    <button type="button" disabled aria-disabled="true">Try the example</button>
    <span aria-hidden="true">·</span>
    <a href="#dropzone">Browse files</a>
  </div>

  <Dropzone onaccept={handleAccept} />
  <output class="visually-hidden" aria-live="polite" aria-atomic="true">
    {#if liveAnnouncement === null}
      <!-- Empty branch — the {''} interpolation below is load-bearing
           (forces Svelte to render SOMETHING into the <output>; without
           it, the {#if} block collapses and some screen readers treat
           the empty element as not-a-region). -->
      {''}
    {:else if liveAnnouncement.kind === 'drop'}
      File accepted: <code>{liveAnnouncement.name}</code>
    {:else}
      Text pasted: <code>{liveAnnouncement.snippet}</code>
    {/if}
  </output>

  <!-- S03.5: three teaching cards. Each card is a <section> with an
       <h3> heading + a <ul> of category names wrapped in <code>
       (mono for data per EXPERIENCE.md §Editorial voice). The 8 + 4
       + 5 names are the locked FR-2 / FR-3 / FR-5 categories. -->
  <!-- S03.5: three teaching cards. Each card is a <section> with an
       <h3> heading + a <ul> of category names wrapped in <code>
       (mono for data per EXPERIENCE.md §Editorial voice). The 8 + 4
       + 5 names are the locked FR-2 / FR-3 / FR-5 categories.

       S03.6: each card now also has a <p class="empty-state-card-lede">
       body-prose paragraph BETWEEN the <h3> heading and the <ul> of
       category names. The body prose is one declarative sentence in
       the editorial voice that anchors the category list to the
       results page (FR-7 teaching surface): "What we detect" names
       the anomaly derivation (row + column + value + rule + one-
       sentence explanation); "What we show you" names the score
       format (0–100 with red/amber/green band + per-category
       breakdown); "What you can do" names the cleaning toggle
       default (all OFF) + the reversibility view (original vs.
       proposed side-by-side). The cards are static <section>
       elements — no hover, no focus, no <details>/<summary>
       (those patterns are reserved for E10 problem cards). -->
  <div class="empty-state-cards">
    <section class="empty-state-card" aria-labelledby="card-detect-heading">
      <h3 id="card-detect-heading">What we detect</h3>
      <p class="empty-state-card-lede">Each anomaly is reported with its row, column, the value, the rule that was broken, and a one-sentence explanation.</p>
      <ul>
        <li><code>duplicates</code></li>
        <li><code>missing values</code></li>
        <li><code>invalid emails</code></li>
        <li><code>invalid dates</code></li>
        <li><code>inconsistent categorical</code></li>
        <li><code>outliers</code></li>
        <li><code>suspicious columns</code></li>
        <li><code>PII</code></li>
      </ul>
    </section>
    <section class="empty-state-card" aria-labelledby="card-show-heading">
      <h3 id="card-show-heading">What we show you</h3>
      <p class="empty-state-card-lede">A 0–100 score with a red, amber, or green band and a per-category breakdown across the four values.</p>
      <ul>
        <li><code>completeness</code></li>
        <li><code>validity</code></li>
        <li><code>uniqueness</code></li>
        <li><code>consistency</code></li>
      </ul>
    </section>
    <section class="empty-state-card" aria-labelledby="card-do-heading">
      <h3 id="card-do-heading">What you can do</h3>
      <p class="empty-state-card-lede">All toggles default off; the original and the proposed cleaned version are shown side by side before you confirm.</p>
      <ul>
        <li><code>dedupe</code></li>
        <li><code>fill missing</code></li>
        <li><code>validate</code></li>
        <li><code>normalize categorical</code></li>
        <li><code>redact PII</code></li>
      </ul>
    </section>
  </div>
</main>

<footer class="page-footer">
  <!-- E10 lands the mechanism-B links; E13 lands the privacy claim
       pointer and the report-a-problem mailto. -->
</footer>

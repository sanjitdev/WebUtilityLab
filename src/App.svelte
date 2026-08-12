<script lang="ts">
  /**
   * Empty-state wordmark for CSV Rescue.
   *
   * AD-1 / AD-8 / AD-10 / AD-5 are all "not yet active" here — this story
   * ships the literal minimum so the Vite + Svelte 5 + TS scaffold is
   * end-to-end exercised (AC #2). The state machine, dropzone, and theme
   * flip land in E02–E05.
   *
   * Note on runes: Svelte 5 prefers `$state`/`$derived`/`$effect` for
   * reactivity. Story 1.1 doesn't need any reactive state — the wordmark
   * is static — so this component intentionally has none. The first rune
   * use lands in E03 when the dropzone becomes interactive.
   */
</script>

<main class="wordmark-page">
  <header class="wordmark-header">
    <h1 class="wordmark">
      <span class="wordmark-title">WebUtilityLab</span>
      <span class="wordmark-sep" aria-hidden="true">/</span>
      <span class="wordmark-subtitle">CSV Rescue</span>
    </h1>
  </header>
</main>

<style>
  /*
   * Typography baseline (DESIGN.md §"Typography"):
   * system-ui stack only — the Privacy Baseline (PRD FR-23) prohibits
   * web fonts. The full token discipline (CSS variables for accent / ink /
   * paper / etc.) lands in E02; this story uses literal colors so the
   * scaffold ships without painting itself into a theming corner.
   */
  .wordmark-page {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
      Roboto, Helvetica, Arial, sans-serif;
    color: #1a1a1a;
    background: #fafaf7;
    min-height: 100vh;
    margin: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 2.25rem 1.5rem;
    box-sizing: border-box;
  }

  .wordmark-header {
    width: 100%;
    max-width: 880px;
  }

  .wordmark {
    font-size: 1.875rem;
    font-weight: 600;
    letter-spacing: -0.015em;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem;
  }

  .wordmark-title {
    color: #1a1a1a;
  }

  .wordmark-sep {
    color: #5a5a5a;
    font-weight: 400;
  }

  .wordmark-subtitle {
    color: #3a5a8a;
  }
</style>
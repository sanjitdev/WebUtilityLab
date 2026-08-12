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
   *
   * AD-7 / AD-8: NO inline `<style>` and NO hex literals in this file.
   * Tokens (colors, typography, focus rings) live in `src/styles/`.
   * E02 owns the full token system; S01.1 ships with bare semantic
   * markup so the scaffold is honest about which patterns are settled
   * and which are still TBD.
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

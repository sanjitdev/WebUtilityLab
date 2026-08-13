<script lang="ts">
  /**
   * Page chrome (S02.4).
   *
   * Carves the semantic skeleton for the entire app:
   *   - skip-link (first tab stop, visually hidden until focused)
   *   - <header> with wordmark + <nav> holding the Privacy link and ThemeToggle
   *   - <main id="main" tabindex="-1"> placeholder for E03 (dropzone)
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
   */
  import ThemeToggle from './components/ThemeToggle.svelte';
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
  <!-- E03 lands the dropzone here. -->
</main>

<footer class="page-footer">
  <!-- E10 lands the mechanism-B links; E13 lands the privacy claim
       pointer and the report-a-problem mailto. -->
</footer>

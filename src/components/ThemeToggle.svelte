<script lang="ts">
  import { onMount } from 'svelte';

  // Read the class flip from the seed (S02.2). The class is the truth;
  // localStorage may be 'null' (system-preference-driven first visit) but
  // the class on <html> still reflects the resolved mode.
  let mode: 'dark' | 'light' = $state(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  let pressed = $derived(mode === 'dark');
  let announcement = $state('Theme: ' + mode);
  let liveText = $derived(announcement);

  function apply(next: 'dark' | 'light'): void {
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  function persist(value: 'dark' | 'light'): void {
    try {
      localStorage.setItem('wul-theme', value);
    } catch (_) {
      // localStorage may throw in privacy-strict browsers; defaults to light.
    }
  }

  function onClick(): void {
    const next: 'dark' | 'light' = mode === 'dark' ? 'light' : 'dark';
    mode = next;
    announcement = 'Theme: ' + next;
    apply(next);
    persist(next);
  }

  onMount(() => {
    function onStorage(e: StorageEvent): void {
      if (e.storageArea !== localStorage) return;
      if (e.key !== 'wul-theme') return;
      const next: 'dark' | 'light' =
        e.newValue === 'dark' || e.newValue === 'light' ? e.newValue : 'light';
      mode = next;
      announcement = 'Theme: ' + next;
      // The other tab already wrote AND already applied the class.
      // We re-apply here so this tab's DOM matches its localStorage value.
      apply(next);
      // Do NOT persist again — the storage event IS the persistence signal.
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  });
</script>

<button
  type="button"
  aria-pressed={pressed}
  onclick={onClick}
  class="theme-toggle"
>
  <span class="theme-toggle-glyph" aria-hidden="true">
    {mode === 'dark' ? '☾' : '☀'}
  </span>
  <span class="theme-toggle-label">{mode === 'dark' ? 'Light' : 'Dark'}</span>
  <span class="visually-hidden" aria-live="polite">{liveText}</span>
</button>

<style>
  .theme-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    font-family: var(--font-system);
    font-size: var(--size-body);
    font-weight: var(--weight-body);
    color: var(--ink);
    background: var(--paper);
    border: 1px solid var(--rule);
    border-radius: var(--radius-toggle);
    cursor: pointer;
  }
  .theme-toggle:hover {
    border-color: var(--graphite);
  }
  .theme-toggle-glyph {
    font-size: 1rem;
    line-height: 1;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>

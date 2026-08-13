<script lang="ts">
  /**
   * Dropzone (S03.1 — visual chrome + picker-opening gesture).
   *
   * AD-9 (a11y): a real button element is the affordance. The hidden
   * file input underneath is the input primitive that the button
   * programmatically opens via .click(). We DO NOT use a div onClick
   * (AD-9 forbids the div-masquerading-as-button pattern). The button
   * is the label; the visible text is the accessible name (no
   * aria-label — text content suffices).
   *
   * S03.1 scope is the visual chrome + the picker-opening gesture ONLY.
   * S03.1 does NOT handle file accept, drag-and-drop file accept, paste,
   * the 50 MB cap, the strict-brief error path, the aria-live
   * announcement, or the empty-state copy. Those are S03.2 (drag/drop +
   * paste), S03.3 (50 MB cap), S03.4 (aria-live), S03.5 (empty-state
   * copy), S03.6 (teaching cards), S03.7 (File reference to reducer),
   * S03.8 (example CSV), S03.9 (strict-brief error path).
   *
   * The CSS pre-wires the .is-dragover class so S03.2 only needs to
   * toggle the class on dragenter / dragleave / drop — the visual
   * surface is stable today.
   *
   * AD-7 / AD-8: zero hex literals, zero rgb(), all values via
   * var(--token). The component style block is scoped to this
   * component (Svelte 5 component-scoped CSS).
   */
  let fileInput: HTMLInputElement | undefined = $state();

  function openPicker(): void {
    fileInput?.click();
  }
</script>

<button type="button" class="dropzone" onclick={openPicker}>
  Browse files
</button>

<input
  id="file-input"
  name="file"
  type="file"
  accept=".csv,text/csv"
  bind:this={fileInput}
  class="visually-hidden"
  tabindex="-1"
/>

<style>
  .dropzone {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    min-width: 44px;
    padding: 0.75rem 1rem;
    font-family: var(--font-system);
    font-size: var(--size-body);
    font-weight: var(--weight-body);
    color: var(--ink);
    background: var(--paper);
    border-width: 1.5px;
    border-style: dashed;
    border-color: var(--graphite);
    border-radius: var(--radius-dropzone);
    cursor: pointer;
  }
  .dropzone:hover {
    background: var(--accent-soft);
    border-color: var(--accent);
  }
  .dropzone.is-dragover {
    border-width: 3px;
    border-style: dashed;
    border-color: var(--accent);
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
<script lang="ts">
  /**
   * Dropzone (S03.2 — drag-and-drop + paste handlers).
   *
   * AD-9 (a11y): a real button element is the affordance. The hidden
   * file input underneath is the input primitive that the button
   * programmatically opens via .click(). We DO NOT use a div onClick
   * (AD-9 forbids the div-masquerading-as-button pattern). The button
   * is the label; the visible text is the accessible name (no
   * aria-label — text content suffices).
   *
   * S03.1 shipped the visual chrome + the picker-opening gesture.
   * S03.2 adds the drag-and-drop file accept + the clipboard paste
   * accept. The component exposes an `onaccept` callback prop:
   *   onaccept?.({ kind: 'drop', file })  // drag-drop file accept
   *   onaccept?.({ kind: 'paste', text }) // clipboard paste accept
   * S03.2 ships with `onaccept` UNBOUND — App.svelte does not pass a
   * callback (AC18n). S03.7 wires the reducer consumer
   * (`<Dropzone onaccept={(src) => reducer.accept(src)} />`) and
   * also adds the `<input type="file" @change>` handler so the
   * picker-driven accept flows through the same reducer transition.
   *
   * Out of S03.2's scope: the 50 MB cap (S03.3), the aria-live
   * announcement (S03.4), the empty-state copy (S03.5), the teaching
   * cards (S03.6), the strict-brief error path (S03.9).
   *
   * The CSS pre-wires the .is-dragover class (S03.1); S03.2 only
   * toggles the class via the `isDragging` state.
   *
   * AD-7 / AD-8: zero hex literals, zero rgb(), all values via
   * var(--token). The component style block is scoped to this
   * component (Svelte 5 component-scoped CSS).
   */
  import { onMount } from 'svelte';

  let fileInput: HTMLInputElement | undefined = $state();

  // S03.2: optional callback prop. App.svelte does not pass it; S03.7
  // wires the reducer consumer. The shape is a discriminated union by
  // `kind` so the reducer can fan-out by gesture type. The paste
  // branch carries an optional `filename` so S03.4's aria-live region
  // can announce a paste-source label even when the user pastes text
  // (which has no inherent filename); S03.7's reducer can use it for
  // the suggested-download basename.
  let {
    onaccept,
  }: {
    onaccept?: (
      source:
        | { kind: 'drop'; file: File }
        | { kind: 'paste'; text: string; filename?: string }
    ) => void;
  } = $props();

  // S03.2: single boolean state driving the .is-dragover class toggle.
  // Set true on dragenter; set false on dragleave / drop.
  let isDragging = $state(false);

  function openPicker(): void {
    fileInput?.click();
  }

  // S03.2: dragenter MUST preventDefault to allow the drop (Chrome /
  // Firefox). Also flips isDragging true so the .is-dragover visual
  // appears while the cursor is over the dropzone.
  function handleDragEnter(event: DragEvent): void {
    event.preventDefault();
    isDragging = true;
  }

  // S03.2: dragover MUST preventDefault (without it, the drop event
  // does not fire). We do NOT toggle isDragging here — the class
  // was already set on dragenter, and continuously toggling on
  // dragover would flicker as the cursor moves within the button.
  function handleDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  // S03.2: dragleave clears the visual. No preventDefault (per
  // AC3: dragleave's default is benign; we only need to prevent
  // the drop's default behavior).
  function handleDragLeave(): void {
    isDragging = false;
  }

  // S03.2: drop accepts the file. preventDefault (the default opens
  // the file in the browser; we want to handle it). Toggles the
  // visual off. Builds the { kind: 'drop', file } payload and
  // invokes onaccept (no-op if the callback is unbound).
  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) onaccept?.({ kind: 'drop', file });
  }

  // S03.2: paste handler. Reads clipboard text only (no images,
  // files, HTML). preventDefault FIRST so the browser doesn't
  // insert the pasted text into any focused input. Then applies
  // the CSV-likeness heuristic (per AC8): text with at least one
  // newline OR a comma on the first line is treated as CSV-likely.
  // Over-acceptance is recoverable (the parser emits a strict-brief
  // error); under-acceptance is hostile.
  function handlePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    const firstLine = text.split('\n', 1)[0];
    const isCsvLike = text.includes('\n') || firstLine.includes(',');
    if (isCsvLike) onaccept?.({ kind: 'paste', text });
  }

  // S03.2: paste handler is registered ONCE on mount and removed on
  // unmount. The onMount cleanup function ensures no listener leak
  // if App.svelte re-renders or unmounts the dropzone (future-
  // proofing; S03.2's component is currently mounted once and stays
  // mounted).
  onMount(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  });
</script>

<button
  type="button"
  class="dropzone"
  class:is-dragover={isDragging}
  onclick={openPicker}
  ondragenter={handleDragEnter}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
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

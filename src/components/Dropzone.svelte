<script lang="ts">
  /**
   * Dropzone (S03.3 — 50 MB cap gate; drag-and-drop + paste handlers
   * from S03.2; visual chrome + picker-opening gesture from S03.1).
   *
   * AD-9 (a11y): a real button element is the affordance. The hidden
   * file input underneath is the input primitive that the button
   * programmatically opens via .click(). We DO NOT use a div onClick
   * (AD-9 forbids the div-masquerading-as-button pattern). The button
   * is the label; the visible text is the accessible name (no
   * aria-label — text content suffices).
   *
   * Story timeline:
   *   S03.1 — visual chrome + picker-opening gesture.
   *   S03.2 — drag-and-drop file accept + clipboard paste accept; ships
   *           `onaccept` callback prop UNBOUND (App.svelte does not
   *           pass it). Cross-story contract: "S03.3 adds the 50 MB
   *           cap check — the dropzone in S03.2 hands the File to the
   *           onaccept callback without any size check. S03.3's
   *           reducer-side handler is the gate; S03.3 is the layer
   *           that enforces 50 MB."
   *   S03.3 — THIS STORY. Adds the 50 MB cap gate. `handleDrop` now
   *           routes through `assertWithinFileCap` (PRD FR-1) BEFORE
   *           invoking `onaccept`. The `onaccept` payload union is
   *           extended with `{ kind: 'oversize'; size: number;
   *           cap: number }` so downstream consumers (S03.7 reducer,
   *           S03.4 aria-live, S03.9 strict-brief) can fan out from
   *           one signal. The paste branch is NOT size-checked at
   *           this layer (paste carries text, not a File; the
   *           worker's E06 S06.7 100 MB total-string-byte cap catches
   *           truly excessive pastes at the parse layer). S03.3 also
   *           declares `handlePickerChange` in the script block for
   *           S03.7 to bind (the template binding lands in S03.7).
   *           S03.3 does NOT modify App.svelte (AC19m boundary pin);
   *           the mount stays `<Dropzone />` without `onaccept`.
   *
   * Out of S03.3's scope: the aria-live region for the over-cap
   * signal (S03.4), the empty-state copy + headline + lede (S03.5),
   * the teaching cards (S03.6), the reducer consumer + picker binding
   * (S03.7), the example CSV (S03.8), the strict-brief formatter
   * (S03.9).
   *
   * The CSS pre-wires the .is-dragover class (S03.1); S03.3 does not
   * touch CSS — the cap check is a behavior change, not a visual one.
   *
   * AD-7 / AD-8: zero hex literals, zero rgb(), all values via
   * var(--token). The component style block is scoped to this
   * component (Svelte 5 component-scoped CSS).
   */
  import { onMount } from 'svelte';
  import { assertWithinFileCap } from '../lib/file-size-cap';

  let fileInput: HTMLInputElement | undefined = $state();

  // S03.2 + S03.3: optional callback prop. App.svelte does not pass
  // it; S03.7 wires the reducer consumer. The shape is a discriminated
  // union by `kind` so the reducer can fan-out by gesture type. The
  // paste branch carries an optional `filename` so S03.4's aria-live
  // region can announce a paste-source label even when the user
  // pastes text (which has no inherent filename); S03.7's reducer
  // can use it for the suggested-download basename.
  //
  // S03.3 extends the union with `{ kind: 'oversize'; size: number;
  // cap: number }`. The over-cap branch carries NO `File` reference
  // (the over-cap file's bytes are never held in app memory — only
  // the metadata `size` and the canonical `cap` constant). This is
  // the load-bearing invariant for the "file is rejected before
  // reading" contract.
  let {
    onaccept,
  }: {
    onaccept?: (
      source:
        | { kind: 'drop'; file: File }
        | { kind: 'paste'; text: string; filename?: string }
        | { kind: 'oversize'; size: number; cap: number }
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

  // S03.2 + S03.3: drop accepts the file. preventDefault (the default
  // opens the file in the browser; we want to handle it). Toggles the
  // visual off. Routes through `assertWithinFileCap` BEFORE invoking
  // `onaccept` so over-cap files are rejected at the dropzone (the
  // gate; PRD FR-1). The over-cap branch emits `{ kind: 'oversize',
  // size, cap }` and returns early — the file is NOT re-emitted as
  // `{ kind: 'drop' }`. The cap is checked on `file.size` only
  // (metadata property); the bytes are never read.
  //
  // Ordering: preventDefault → clear visual → guard null file →
  // assertWithinFileCap(file) → switch on result.kind. The oversize
  // branch early-returns; the under-cap branch falls through to
  // the onaccept emit with `{ kind: 'drop', file: result.file }`.
  // The `result.file` form (vs. the S03.2 shorthand `file`) is a
  // deliberate S03.3 change — the `result` variable is the source
  // of truth for the discriminator.
  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const result = assertWithinFileCap(file);
    if (result.kind === 'oversize') {
      onaccept?.({ kind: 'oversize', size: result.size, cap: result.cap });
      return;
    }
    onaccept?.({ kind: 'drop', file: result.file });
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

  // S03.3: picker change handler. Mirrors `handleDrop`'s cap-routing
  // logic for the third accept path (the file picker opened by
  // `openPicker()`). S03.3 declares this function in the script
  // block but does NOT bind it to the template — that binding lands
  // in S03.7 (the reducer consumer wires
  // `<input type="file" onchange={handlePickerChange}>` at the same
  // time it wires the `<Dropzone onaccept={...}>` mount in
  // App.svelte). The current S03.2 boundary pin
  // `tests/dropzone-drag-paste.test.ts` AC18j (`no @change /
  // onchange / addEventListener("change")`) is extended by
  // `tests/dropzone-file-cap.test.ts` AC19g to permit the function
  // declaration but still forbid the template binding.
  //
  // The reset `input.value = ''` after the consumer runs is
  // load-bearing: without it, the user can't re-select the same
  // file via the picker (the browser sees the same file and skips
  // the change event). The reset happens on BOTH branches — the
  // under-cap accept AND the over-cap rejection — for the same
  // reason. Value-passing note: the `File` reference in the
  // `{ kind: 'drop', file: result.file }` payload is a value (the
  // File object lives in the payload, not in `input.files`), so
  // the consumer can rely on the File after the synchronous handler
  // returns. Setting `input.value` nulls `input.files`, but the
  // payload's File is already detached.
  function handlePickerChange(event: Event & { currentTarget: HTMLInputElement }): void {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const result = assertWithinFileCap(file);
    if (result.kind === 'oversize') {
      onaccept?.({ kind: 'oversize', size: result.size, cap: result.cap });
      input.value = '';
      return;
    }
    onaccept?.({ kind: 'drop', file: result.file });
    input.value = '';
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

  // S03.3: handlePickerChange is declared in S03.3 but the template
  // binding (`<input onchange={handlePickerChange}>`) is wired in
  // S03.7. The `void` reference below is an intentional use-statement
  // that silences the svelte-check "declared but never read" warning
  // until S03.7 lands. The `void` keyword makes the reference an
  // expression statement rather than a real call — the function is
  // still bound to nothing in S03.3. Remove this line in S03.7.
  void handlePickerChange;
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
  /* .visually-hidden removed in S03.4 — the class moved to
     src/styles/app.css (the global source of truth). The hidden
     <input> below still uses `class="visually-hidden"`. */
</style>

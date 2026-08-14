/**
 * aria-live utilities (S03.4).
 *
 * Tiny pure-function helpers for the dropzone-accept announcement
 * region. The only export today is `pasteSnippet` — the snippet
 * formatter that App.svelte's `handleAccept` consumes for the
 * `paste` branch.
 *
 * The `40` is the editorial voice bound: EXPERIENCE.md §Editorial
 * voice (curly quotes, spaced em-dashes, mono for data) does not
 * pin a specific length, but a 40-char cap is the right balance
 * between "the user gets enough of the pasted text to confirm
 * their input" and "the screen reader doesn't read a full 200-line
 * CSV row out loud". The ellipsis character (`…`, U+2026) is the
 * editorial choice — not the three-dot ASCII form (`...`).
 *
 * Pure functions, no DOM access, no I/O. The split from
 * App.svelte's inline expression is intentional: it makes the
 * boundary behavior unit-testable (`tests/dropzone-aria-live.test.ts`
 * AC20d runtime assertion) without rendering a Svelte component.
 *
 * Boundary semantics: the cap is INCLUSIVE at 40. A paste of
 * exactly 40 chars returns the unmodified text (no ellipsis);
 * a paste of 41 chars returns `text.slice(0, 40) + '…'` (the
 * first 40 chars plus ellipsis). This matches the spec choice
 * `text.length > 40 ? slice(0, 40) + '…' : text`.
 *
 * No consumer of this module reads the file/network; the `text`
 * argument is already in memory (the dropzone reached this
 * function via the paste handler in S03.2). The module adds no
 * privacy surface.
 */

/**
 * Snippet the pasted text for the aria-live announcement.
 *
 * Returns the input verbatim if `text.length <= 40`; otherwise
 * returns `text.slice(0, 40) + '…'` (the first 40 chars plus a
 * single-character ellipsis). The result is plain text — no
 * surrounding quotes, no markup. The mono treatment in the
 * announcement region is a CSS-level concern (the surrounding
 * `<code>` element in App.svelte's template), not a function
 * concern.
 *
 * The function is total: it accepts any string (including
 * empty string, multi-line text, and text with control
 * characters) and always returns a string. An empty input
 * returns an empty string; the aria-live region stays silent
 * (the screen reader doesn't announce on empty textContent)
 * — but the S03.2 paste heuristic already filters out empty
 * pastes, so this branch is unreachable in practice.
 */
export function pasteSnippet(text: string): string {
  return text.length > 40 ? text.slice(0, 40) + '…' : text;
}

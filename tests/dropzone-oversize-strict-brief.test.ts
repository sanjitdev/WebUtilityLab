import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(here, '..');
const appPath = join(repoRoot, 'src', 'App.svelte');
const strictBriefPath = join(repoRoot, 'src', 'lib', 'strict-brief.ts');
const appSource = readFileSync(appPath, 'utf8');
const strictBriefSource = readFileSync(strictBriefPath, 'utf8');

// Strip block + line + HTML comments so documenting comments don't
// false-positive on forbidden-pattern scans. Mirrors the E03
// test-file convention.
const stripComments = (s: string): string =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '');

const appCode = stripComments(appSource);
const strictBriefCode = stripComments(strictBriefSource);

/**
 * S03.9 — App.svelte wire-up of the strict-brief formatter
 * (AC25b + AC25d).
 *
 * The over-cap signal from `assertWithinFileCap` (S03.3) routes
 * through `handleAccept` (App.svelte) → `formatStrictBrief`
 * (strict-brief.ts) → `liveAnnouncement` (aria-live region). The
 * formatter is the first place the strict-brief editorial template
 * surfaces in the UI; the wire-up test pins the full path.
 */

describe('dropzone-oversize-strict-brief (S03.9; AC25b + AC25d — over-cap rejection surfaces as a strict-brief announcement)', () => {
  describe('AC25b + AC25d item 13: App.svelte imports formatStrictBrief', () => {
    it('App.svelte imports formatStrictBrief from "./lib/strict-brief"', () => {
      expect(appSource).toMatch(
        /import\s*\{[^}]*formatStrictBrief[^}]*\}\s*from\s*['"]\.\/lib\/strict-brief['"]/,
      );
    });

    it('App.svelte imports it BEFORE the reducer call (load-order is consistent)', () => {
      // Order doesn't affect runtime (ES modules), but the visual
      // ordering is intentional in the source: imports are grouped
      // by external-then-internal; strict-brief lives with the other
      // `./lib/...` imports. The pin: the import statement line
      // comes before the reducer dispatch in the source.
      const importIdx = appSource.search(/formatStrictBrief/);
      const dispatchIdx = appSource.search(/reducer\.dispatch/);
      expect(importIdx).toBeGreaterThan(-1);
      expect(dispatchIdx).toBeGreaterThan(-1);
      expect(importIdx).toBeLessThan(dispatchIdx);
    });
  });

  describe('AC25b: App.svelte over-cap branch calls the formatter', () => {
    it('the over-cap branch calls formatStrictBrief with { kind: "oversize", size, cap }', () => {
      // Body extraction (signature-aware regex handles TypeScript
      // : void return-type annotation). The body must contain the
      // formatter call with the size + cap fields routed through.
      const sigMatch =
        /\bfunction\s+handleAccept\s*\(\s*source\s*:\s*OnAcceptSource\s*\)\s*:\s*void\s*\{/.exec(
          appSource,
        );
      expect(sigMatch).not.toBeNull();
      const bodyStart = sigMatch!.index + sigMatch![0].length;
      let braceDepth = 1;
      let j = bodyStart;
      while (j < appSource.length && braceDepth > 0) {
        if (appSource[j] === '{') braceDepth++;
        else if (appSource[j] === '}') braceDepth--;
        if (braceDepth > 0) j++;
      }
      const body = appSource.slice(bodyStart, j);
      // The body must call the formatter with the over-cap payload.
      // The formatter call may span multiple lines (S03.9's
      // implementation uses multi-line formatting), so the regex is
      // flexible across whitespace + newlines.
      expect(body).toMatch(/formatStrictBrief\s*\(/);
      expect(body).toMatch(/kind\s*:\s*['"]oversize['"]/);
      expect(body).toMatch(/size\s*:\s*source\.size/);
      expect(body).toMatch(/cap\s*:\s*source\.cap/);
    });

    it('the over-cap branch writes liveAnnouncement with kind: "strict-brief" AND message: formatStrictBrief(...)', () => {
      // The over-cap branch must set liveAnnouncement.kind to
      // "strict-brief" — NOT "drop" or "paste" (those are separate
      // branches). The pin: the body contains the assignment with
      // the strict-brief discriminator AND the `message` field is
      // sourced from `formatStrictBrief(...)` (not a hardcoded
      // string).
      //
      // Review #1 (verification-gap): the original regex
      // `/liveAnnouncement\s*=\s*\{\s*kind\s*:\s*['"]strict-brief['"]\s*,\s*message\s*:/`
      // matched `message:` followed by ANY value — a regression
      // that hardcoded `message: 'manual'` would still pass.
      // Tighten: require `message: formatStrictBrief(` in the
      // same property assignment.
      const sigMatch =
        /\bfunction\s+handleAccept\s*\(\s*source\s*:\s*OnAcceptSource\s*\)\s*:\s*void\s*\{/.exec(
          appSource,
      );
      expect(sigMatch).not.toBeNull();
      const bodyStart = sigMatch!.index + sigMatch![0].length;
      let braceDepth = 1;
      let j = bodyStart;
      while (j < appSource.length && braceDepth > 0) {
        if (appSource[j] === '{') braceDepth++;
        else if (appSource[j] === '}') braceDepth--;
        if (braceDepth > 0) j++;
      }
      const body = appSource.slice(bodyStart, j);
      // The strict-brief discriminator.
      expect(body).toMatch(
        /liveAnnouncement\s*=\s*\{\s*kind\s*:\s*['"]strict-brief['"]\s*,\s*message\s*:/,
      );
      // The message field is sourced from formatStrictBrief(...) —
      // NOT a hardcoded string. Multi-line tolerant (the formatter
      // call may span lines).
      expect(body).toMatch(
        /message\s*:\s*formatStrictBrief\s*\(/,
      );
    });

    it('the over-cap branch returns AFTER writing liveAnnouncement (no fall-through)', () => {
      // Defensive: a regression that drops the `return` from the
      // over-cap branch would let it fall through to the drop/paste
      // branches and overwrite liveAnnouncement with the wrong shape.
      // The pin: the body contains `return` after the formatter call.
      const sigMatch =
        /\bfunction\s+handleAccept\s*\(\s*source\s*:\s*OnAcceptSource\s*\)\s*:\s*void\s*\{/.exec(
          appSource,
      );
      expect(sigMatch).not.toBeNull();
      const bodyStart = sigMatch!.index + sigMatch![0].length;
      let braceDepth = 1;
      let j = bodyStart;
      while (j < appSource.length && braceDepth > 0) {
        if (appSource[j] === '{') braceDepth++;
        else if (appSource[j] === '}') braceDepth--;
        if (braceDepth > 0) j++;
      }
      const body = appSource.slice(bodyStart, j);
      // The over-cap branch is FIRST in handleAccept (S03.9 inverted
      // the S03.4 ordering — oversize no longer early-returns). The
      // formatter call must be followed by a `return`.
      const formatterIdx = body.search(/formatStrictBrief/);
      expect(formatterIdx).toBeGreaterThan(-1);
      const afterFormatter = body.slice(formatterIdx);
      expect(afterFormatter).toMatch(/\breturn\b/);
    });
  });

  describe('AC25b: Announcement union widened with strict-brief branch', () => {
    it('App.svelte declares Announcement with the strict-brief shape', () => {
      // The Announcement union gains a strict-brief branch. The
      // pin: the type literal `{ kind: 'strict-brief'; message: string }`
      // appears in App.svelte's source.
      expect(appSource).toMatch(
        /kind\s*:\s*['"]strict-brief['"]\s*;\s*message\s*:\s*string/,
      );
    });

    it('the <output> template renders the strict-brief message', () => {
      // The S03.4 <output> template adds a third :else if branch.
      // The pin: the source contains `liveAnnouncement.kind === 'strict-brief'`
      // in the template OR a {:else} branch that renders
      // liveAnnouncement.message. S03.9 chose the {:else} form
      // because TypeScript narrowing collapses the unmatched branch
      // to the default — the editor-preference is terser code.
      // The fallback `{:else}` rendering `liveAnnouncement.message`
      // covers the strict-brief case (the only remaining branch after
      // 'drop' and 'paste').
      expect(appSource).toMatch(/\{:else\s*\}/);
      expect(appSource).toMatch(/liveAnnouncement\.message/);
    });

    it('the strict-brief branch is the {:else} fallback (renders liveAnnouncement.message verbatim)', () => {
      // The template's strict-brief branch renders the formatter
      // output as text content (not wrapped in <code> — the
      // message is prose, not data). The pin: `liveAnnouncement.message`
      // appears inside the FINAL {:else} block of the
      // {#if ... {:else if} ... {:else}} chain.
      //
      // Review #1 (verification-gap): the naive regex
      // `\{:else\s*\}([\s\S]*?)\{\/if\}` matches the FIRST
      // `{:else if ...}` followed by an `{/if}` somewhere later,
      // which could catch a mislabelled branch. Anchor the pin
      // to the LAST `{:else}` (no trailing `if`) before `{/if}`.
      const branchMatch =
        /[\s\S]*\{:else\s*\}([\s\S]*?)\{\/if\}/.exec(
          appSource,
        );
      expect(branchMatch).not.toBeNull();
      expect(branchMatch![1]).toContain('liveAnnouncement.message');
    });

    it('the strict-brief message is rendered inside the <output> element (not a different element)', () => {
      // Review #1 (verification-gap): a regression that moves
      // the strict-brief content to a different element (e.g.,
      // a <div aria-live="assertive">) would still pass the
      // source-shape pins above but route the announcement away
      // from the screen-reader-only <output> region. The pin:
      // `{liveAnnouncement.message}` appears between <output and
      // </output> tags (whitespace-tolerant across newlines).
      const outputMatch =
        /<output\b[\s\S]*?>([\s\S]*?)<\/output>/.exec(appSource);
      expect(outputMatch).not.toBeNull();
      expect(outputMatch![1]).toContain('liveAnnouncement.message');
    });

    it('the strict-brief branch does NOT wrap the message in <code> (prose, not data)', () => {
      // The strict-brief message is plain editorial prose; the
      // mono treatment (<code>) is reserved for filenames /
      // paste snippets (data). Screen readers spell out content
      // inside <code> character-by-character — wrapping "51 MB"
      // in <code> would make the screen reader say "five one M B"
      // (5 characters). The pin: the <output> block contains
      // `{liveAnnouncement.message}` NOT wrapped in a <code> tag.
      const outputMatch =
        /<output\b[\s\S]*?>([\s\S]*?)<\/output>/.exec(appSource);
      expect(outputMatch).not.toBeNull();
      const outputBody = outputMatch![1];
      // The message textContent reference appears, but no <code>
      // tag is on the same line as the message reference.
      const messageLineMatch = outputBody
        .split('\n')
        .find((line) => line.includes('liveAnnouncement.message'));
      expect(messageLineMatch).toBeDefined();
      expect(messageLineMatch).not.toMatch(/<code\b/);
    });
  });

  describe('AC25b item 8: reducer dispatch order preserved', () => {
    it('handleAccept dispatches to the reducer BEFORE the strict-brief write', () => {
      // S03.7's dispatch-ordering pin: dispatch before announcement.
      // S03.9 inverts the over-cap branch (it now writes
      // liveAnnouncement), but the dispatch must still happen FIRST.
      // The pin: `reducer.dispatch({ kind: 'accept', source })` is
      // the first statement in handleAccept.
      const sigMatch =
        /\bfunction\s+handleAccept\s*\(\s*source\s*:\s*OnAcceptSource\s*\)\s*:\s*void\s*\{/.exec(
          appSource,
      );
      expect(sigMatch).not.toBeNull();
      const bodyStart = sigMatch!.index + sigMatch![0].length;
      let braceDepth = 1;
      let j = bodyStart;
      while (j < appSource.length && braceDepth > 0) {
        if (appSource[j] === '{') braceDepth++;
        else if (appSource[j] === '}') braceDepth--;
        if (braceDepth > 0) j++;
      }
      const body = appSource.slice(bodyStart, j);
      const dispatchIdx = body.search(/reducer\.dispatch/);
      const announcementIdx = body.search(/liveAnnouncement\s*=/);
      expect(dispatchIdx).toBeGreaterThan(-1);
      expect(announcementIdx).toBeGreaterThan(-1);
      expect(dispatchIdx).toBeLessThan(announcementIdx);
    });
  });

  describe('AC25e: S03.4 aria-live pin preserved', () => {
    it('the <output> element keeps aria-live="polite"', () => {
      expect(appSource).toMatch(/<output[^>]*aria-live\s*=\s*["']polite["']/);
    });

    it('the <output> element keeps aria-atomic="true"', () => {
      expect(appSource).toMatch(/<output[^>]*aria-atomic\s*=\s*["']true["']/);
    });

    it('the <output> element keeps the visually-hidden class', () => {
      expect(appSource).toMatch(/<output[^>]*class\s*=\s*["']visually-hidden["']/);
    });
  });

  describe('AC25b + AC25d: Privacy Baseline + AD-8', () => {
    it('App.svelte does NOT introduce fetch / network primitives (defense in depth)', () => {
      // Existing S03.4 tests cover fetch/XHR/createObjectURL. S03.9
      // adds strict-brief wiring which routes through the existing
      // aria-live announcement path — no new network primitives.
      expect(appCode).not.toMatch(/\bfetch\s*\(/);
      expect(appCode).not.toMatch(/\bXMLHttpRequest\b/);
      expect(appCode).not.toMatch(/\bURL\.createObjectURL\b/);
      expect(appCode).not.toMatch(/\bnavigator\b/);
    });

    it('App.svelte is token-disciplined (no hex literals — AD-8)', () => {
      expect(appCode).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });

    it('the strict-brief module is token-disciplined (no hex literals — AD-8)', () => {
      // Re-pinned for symmetry. The formatter's source is in
      // src/lib/strict-brief.ts; the test pin from tests/strict-brief
      // covers the same property. Cross-test symmetry.
      expect(strictBriefCode).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
  });
});
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * svelte.config.js — kept as a thin re-export of the Vite plugin's
 * preprocessor so `svelte-check` (invoked by `npm run check`) can run
 * outside the Vite build pipeline (e.g. in CI without a dev server).
 *
 * Story 1.1 ships a minimal config; AD-9 / AD-10 / AD-12 story work
 * will extend this if the Svelte template needs additional preprocessors
 * (it won't — the design is plain HTML + minimal CSS, no Markdown).
 */
export default {
  preprocess: vitePreprocess(),
};
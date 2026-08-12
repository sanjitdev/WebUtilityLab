/**
 * Application bootstrap.
 *
 * AD-1 (Vite + Svelte 5 + TypeScript) and the architectural posture
 * "one HTML page morphs through empty → active → results" (SOLUTION-DESIGN
 * §"One-paragraph summary"). This story ships the empty-state wordmark
 * only; the state machine and worker boundary land in E05.
 */
import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');
if (!target) {
  throw new Error('Mount target #app not found in index.html');
}

// `mount()` returns the component instance; we intentionally discard it.
// The app is page-lifetime — no HMR or remount dance — so the return value
// has no caller. (A Svelte 4 / Sapper reflex would `export default` it,
// which is noise here.)
mount(App, { target });
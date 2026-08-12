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

mount(App, { target });
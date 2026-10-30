import { state } from './store.js';
import { show as showRest } from './rest.js';
import { renderWorkoutHome, renderTemplate } from './views/workout.js';
import { renderHistory, renderWorkoutDetail } from './views/history.js';
import { renderExercises, renderExerciseDetail } from './views/exercises.js';
import { renderSettings } from './views/settings.js';

const root = document.getElementById('app');

// [pattern, tab, render]
const routes = [
  [/^\/workout$/, 'workout', () => renderWorkoutHome(root)],
  [/^\/template\/(.+)$/, 'workout', (id) => renderTemplate(root, id === 'new' ? null : id)],
  [/^\/history$/, 'history', () => renderHistory(root)],
  [/^\/history\/(.+)$/, 'history', (id) => renderWorkoutDetail(root, id)],
  [/^\/exercises$/, 'exercises', () => renderExercises(root)],
  [/^\/exercise\/(.+)$/, 'exercises', (id) => renderExerciseDetail(root, decodeURIComponent(id))],
  [/^\/settings$/, 'settings', () => renderSettings(root)],
];

function route() {
  const path = location.hash.slice(1) || '/workout';
  for (const [re, tab, fn] of routes) {
    const m = path.match(re);
    if (!m) continue;
    document.querySelectorAll('.tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
    document.querySelectorAll('.modal-bg').forEach((m) => m.remove());
    fn(m[1]);
    return;
  }
  location.hash = '#/workout';
}

// Views re-render by re-dispatching hashchange; only scroll to top on real navigation.
let lastPath = location.hash;
window.addEventListener('hashchange', () => {
  route();
  if (location.hash !== lastPath) window.scrollTo(0, 0);
  lastPath = location.hash;
});
route();
if (state.active?.restEnd) showRest();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker failed', e));
}

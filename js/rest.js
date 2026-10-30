import { state, save } from './store.js';
import { fmtDuration } from './util.js';

// Rest timer. Stores the end timestamp on the active workout rather than counting
// down, so it stays correct when iOS suspends the page in the background.
const el = document.getElementById('rest');
let tick = null;

export function startRest(sec = state.settings.restSec) {
  if (!state.active || !sec) return;
  state.active.restEnd = Date.now() + sec * 1000;
  save();
  show();
}

export function stopRest() {
  if (state.active) { state.active.restEnd = null; save(); }
  clearInterval(tick);
  tick = null;
  el.classList.add('hidden');
  el.classList.remove('ended');
}

function adjust(delta) {
  if (!state.active?.restEnd) return;
  state.active.restEnd = Math.max(Date.now(), state.active.restEnd + delta * 1000);
  save();
  draw();
}

function draw() {
  const left = state.active.restEnd - Date.now();
  if (left <= 0) {
    el.classList.add('ended');
    el.querySelector('.time').textContent = 'Rest done';
    navigator.vibrate?.([200, 100, 200]);
    clearInterval(tick);
    tick = null;
    state.active.restEnd = null;
    save();
    setTimeout(() => { if (!state.active?.restEnd) stopRest(); }, 4000);
    return;
  }
  el.querySelector('.time').textContent = fmtDuration(left + 999);
}

// Show the bar if a rest is running (also called on app start to resume).
export function show() {
  if (!state.active?.restEnd) return;
  el.innerHTML = `
    <span class="time"></span>
    <button data-d="-15">-15</button>
    <button data-d="15">+15</button>
    <button data-skip>Skip</button>`;
  el.classList.remove('hidden', 'ended');
  el.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => adjust(+b.dataset.d)));
  el.querySelector('[data-skip]').onclick = stopRest;
  clearInterval(tick);
  tick = setInterval(draw, 250);
  draw();
}

document.addEventListener('visibilitychange', () => { if (!document.hidden && state.active?.restEnd) draw(); });

import { state, save } from './store.js';
import { fmtDuration } from './util.js';

// Rest timer. Stores the end timestamp on the active workout rather than counting
// down, so it stays correct when iOS suspends the page in the background.
const el = document.getElementById('rest');
let tick = null;

// iOS only lets a page play sound after a tap, so the audio context is created
// (or resumed) from taps that start or adjust a rest, and reused for the chime.
let audio = null;
function unlockAudio() {
  if (!state.settings.restSound) return;
  audio ||= new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state !== 'running') audio.resume();
}

// Three short beeps, generated so there is no sound file to cache.
function chime() {
  if (!state.settings.restSound || !audio) return;
  if (audio.state !== 'running') audio.resume();
  // Duck other audio (e.g. music) briefly instead of following the default session.
  if (navigator.audioSession) navigator.audioSession.type = 'transient';
  const t0 = audio.currentTime + 0.05;
  [0, 0.25, 0.5].forEach((dt, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = i === 2 ? 1320 : 880;
    gain.gain.setValueAtTime(0.0001, t0 + dt);
    gain.gain.exponentialRampToValueAtTime(0.5, t0 + dt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.18);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0 + dt);
    osc.stop(t0 + dt + 0.2);
  });
  setTimeout(() => { if (navigator.audioSession) navigator.audioSession.type = 'auto'; }, 1500);
}

export function startRest(sec = state.settings.restSec) {
  if (!state.active || !sec) return;
  unlockAudio();
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
  unlockAudio();
  state.active.restEnd = Math.max(Date.now(), state.active.restEnd + delta * 1000);
  save();
  draw();
}

function draw() {
  const left = state.active.restEnd - Date.now();
  if (left <= 0) {
    el.classList.add('ended');
    el.querySelector('.time').textContent = 'Rest done';
    // Skip the alert if the rest ended a while ago (app was in the background).
    if (left > -5000) {
      navigator.vibrate?.([200, 100, 200]);
      chime();
    }
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

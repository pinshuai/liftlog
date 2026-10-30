import { state, save, getExercise } from '../store.js';
import { confirmModal } from '../ui.js';
import { esc, fmtDate, fmtDuration, fmtNum, toUnit } from '../util.js';

const volume = (w) => w.entries.reduce((sum, e) => sum + e.sets.reduce((s, x) => s + (Number(x.w) || 0) * (Number(x.r) || 0), 0), 0);

export function renderHistory(root) {
  const unit = state.settings.unit;
  const list = [...state.workouts].reverse();
  root.innerHTML = `
    <h1>History</h1>
    ${list.length ? '' : '<p class="muted">Finished workouts will show up here.</p>'}
    ${list.map((w) => `
      <div class="card link" data-id="${w.id}">
        <div class="row between"><b>${esc(w.name)}</b><span class="muted">${fmtDuration(w.end - w.start)}</span></div>
        <div class="muted">${fmtDate(w.start)} &middot; ${fmtNum(toUnit(volume(w), w.unit, unit))} ${unit} volume</div>
        <div style="margin-top:6px">${w.entries.map((e) => `${e.sets.length} x ${esc(getExercise(e.exerciseId).name)}`).join('<br>')}</div>
      </div>`).join('')}`;
  root.querySelectorAll('[data-id]').forEach((c) => (c.onclick = () => (location.hash = `#/history/${c.dataset.id}`)));
}

export function renderWorkoutDetail(root, id) {
  const w = state.workouts.find((x) => x.id === id);
  if (!w) { location.hash = '#/history'; return; }
  const unit = state.settings.unit;
  root.innerHTML = `
    <a class="btn text" href="#/history">&larr; History</a>
    <h1>${esc(w.name)}</h1>
    <p class="muted" style="margin-top:-12px">${fmtDate(w.start)} &middot; ${fmtDuration(w.end - w.start)}</p>
    ${w.entries.map((e) => `
      <div class="card">
        <h3><a href="#/exercise/${esc(e.exerciseId)}" style="color:inherit">${esc(getExercise(e.exerciseId).name)}</a></h3>
        ${e.sets.map((s, i) => `<div class="row between"><span class="muted">Set ${i + 1}</span><span>${fmtNum(toUnit(s.w, w.unit, unit)) || 0} ${unit} x ${s.r}</span></div>`).join('')}
      </div>`).join('')}
    <button class="block danger" data-delete>Delete workout</button>`;
  root.querySelector('[data-delete]').onclick = async () => {
    if (!(await confirmModal('Delete this workout from history?', 'Delete', true))) return;
    state.workouts = state.workouts.filter((x) => x.id !== id);
    save();
    location.hash = '#/history';
  };
}

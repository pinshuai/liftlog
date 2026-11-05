import { state, save, getExercise, saveAsTemplate, isAssisted, weightLabel } from '../store.js';
import { confirmModal, promptModal, pickExercise } from '../ui.js';
import { esc, fmtDate, fmtDuration, fmtNum, toUnit } from '../util.js';
import { exIcon } from '../icons.js';

// Assistance is not lifted load, so assisted exercises don't count toward volume.
const volume = (w) => w.entries.filter((e) => !isAssisted(e.exerciseId))
  .reduce((sum, e) => sum + e.sets.reduce((s, x) => s + (Number(x.w) || 0) * (Number(x.r) || 0), 0), 0);

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
        ${e.sets.map((s, i) => `<div class="row between"><span class="muted">Set ${i + 1}</span><span>${weightLabel(e.exerciseId, fmtNum(toUnit(s.w, w.unit, unit)), unit)} x ${s.r}</span></div>`).join('')}
      </div>`).join('')}
    <a class="btn block" href="#/history/${w.id}/edit" style="text-align:center;margin-top:8px">Edit workout</a>
    <button class="block" data-save-tpl>Save as template</button>
    <button class="block danger" data-delete>Delete workout</button>`;
  root.querySelector('[data-save-tpl]').onclick = async () => {
    const name = await promptModal('Template name', w.name);
    if (!name) return;
    saveAsTemplate(name, w.entries);
    location.hash = '#/workout';
  };
  root.querySelector('[data-delete]').onclick = async () => {
    if (!(await confirmModal('Delete this workout from history?', 'Delete', true))) return;
    state.workouts = state.workouts.filter((x) => x.id !== id);
    save();
    location.hash = '#/history';
  };
}

const pad = (n) => String(n).padStart(2, '0');
const dateValue = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const timeValue = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

// Edit a finished workout. Works on a copy; nothing changes until Save.
// Weights are edited in the unit the workout was logged in.
export function renderWorkoutEdit(root, id) {
  const original = state.workouts.find((x) => x.id === id);
  if (!original) { location.hash = '#/history'; return; }
  const w = structuredClone(original);
  let date = dateValue(w.start);
  let time = timeValue(w.start);
  let minutes = Math.max(1, Math.round((w.end - w.start) / 60000));

  const draw = () => {
    root.innerHTML = `
      <div class="row between">
        <a class="btn text" href="#/history/${w.id}">Cancel</a>
        <button class="primary" data-save>Save</button>
      </div>
      <h1>Edit workout</h1>
      <div class="card">
        <label class="muted">Name</label>
        <input data-name value="${esc(w.name)}" style="margin:4px 0 10px">
        <label class="muted">Date</label>
        <input type="date" data-date value="${date}" style="margin:4px 0 10px">
        <div class="row">
          <div class="grow" style="min-width:0"><label class="muted">Start</label><input type="time" data-time value="${time}"></div>
          <div class="grow" style="min-width:0"><label class="muted">Minutes</label><input inputmode="numeric" data-min value="${minutes}"></div>
        </div>
      </div>
      ${w.entries.map((e, ei) => `
        <div class="card">
          <div class="row between">
            <h3 class="ex-name">${exIcon(e.exerciseId)}${esc(getExercise(e.exerciseId).name)}</h3>
            <button class="text danger" data-remove-ex="${ei}">Remove</button>
          </div>
          <table class="sets">
            <tr><th class="setnum">Set</th><th class="col-w">${isAssisted(e.exerciseId) ? `Assist ${w.unit}` : w.unit}</th><th class="col-r">Reps</th><th></th></tr>
            ${e.sets.map((s, si) => `
              <tr>
                <td class="setnum">${si + 1}</td>
                <td><input inputmode="decimal" data-f="w" data-e="${ei}" data-s="${si}" value="${esc(s.w)}"></td>
                <td><input inputmode="numeric" data-f="r" data-e="${ei}" data-s="${si}" value="${esc(s.r)}"></td>
                <td><button class="del-set" data-del="${ei}:${si}" aria-label="Delete set">&times;</button></td>
              </tr>`).join('')}
          </table>
          <button class="block" data-add-set="${ei}">+ Add set</button>
        </div>`).join('')}
      <button class="block" data-add-ex>+ Add exercise</button>
      <p class="muted">Sets without reps are dropped when you save.</p>`;

    root.querySelector('[data-name]').oninput = (ev) => (w.name = ev.target.value);
    root.querySelector('[data-date]').oninput = (ev) => (date = ev.target.value);
    root.querySelector('[data-time]').oninput = (ev) => (time = ev.target.value);
    root.querySelector('[data-min]').oninput = (ev) => (minutes = parseInt(ev.target.value, 10) || 0);

    root.querySelectorAll('input[data-f]').forEach((inp) => (inp.oninput = () => {
      const v = inp.value.replace(',', '.');
      w.entries[inp.dataset.e].sets[inp.dataset.s][inp.dataset.f] = v === '' ? '' : Number(v);
    }));
    root.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => {
      const [ei, si] = b.dataset.del.split(':').map(Number);
      w.entries[ei].sets.splice(si, 1);
      draw();
    }));
    root.querySelectorAll('[data-add-set]').forEach((b) => (b.onclick = () => {
      const sets = w.entries[b.dataset.addSet].sets;
      const last = sets[sets.length - 1];
      sets.push({ w: last?.w ?? '', r: last?.r ?? '', done: true });
      draw();
    }));
    root.querySelectorAll('[data-remove-ex]').forEach((b) => (b.onclick = () => {
      w.entries.splice(Number(b.dataset.removeEx), 1);
      draw();
    }));
    root.querySelector('[data-add-ex]').onclick = async () => {
      const exId = await pickExercise();
      if (!exId) return;
      w.entries.push({ exerciseId: exId, sets: [{ w: '', r: '', done: true }] });
      draw();
    };

    root.querySelector('[data-save]').onclick = async () => {
      const start = new Date(`${date}T${time || '00:00'}`).getTime();
      if (!date || Number.isNaN(start)) return root.querySelector('[data-date]').focus();
      w.name = w.name.trim() || 'Workout';
      w.start = start;
      w.end = start + Math.max(1, minutes) * 60000;
      w.entries = w.entries
        .map((e) => ({ ...e, sets: e.sets.filter((s) => Number(s.r) > 0).map((s) => ({ ...s, done: true })) }))
        .filter((e) => e.sets.length);
      if (!w.entries.length) {
        if (!(await confirmModal('No sets left. Delete this workout instead?', 'Delete workout', true))) return;
        state.workouts = state.workouts.filter((x) => x.id !== id);
        save();
        location.hash = '#/history';
        return;
      }
      Object.assign(original, w);
      // Keep history in date order so "Previous" uses the latest session by date.
      state.workouts.sort((a, b) => a.start - b.start);
      save();
      location.hash = `#/history/${id}`;
    };
  };
  draw();
}

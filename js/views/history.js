import { state, save, getExercise, saveAsTemplate, isAssisted, weightLabel } from '../store.js';
import { confirmModal, promptModal, pickExercise } from '../ui.js';
import { esc, fmtDate, fmtDuration, fmtNum, toUnit } from '../util.js';
import { exIcon } from '../icons.js';

// Assistance is not lifted load, so assisted exercises don't count toward volume.
const volume = (w) => w.entries.filter((e) => !isAssisted(e.exerciseId))
  .reduce((sum, e) => sum + e.sets.reduce((s, x) => s + (Number(x.w) || 0) * (Number(x.r) || 0), 0), 0);

const workoutCard = (w, unit) => `
  <div class="card link" data-id="${w.id}">
    <div class="row between"><b>${esc(w.name)}</b><span class="muted">${fmtDuration(w.end - w.start)}</span></div>
    <div class="muted">${fmtDate(w.start)} &middot; ${fmtNum(toUnit(volume(w), w.unit, unit))} ${unit} volume</div>
    <div style="margin-top:6px">${w.entries.map((e) => `${e.sets.length} x ${esc(getExercise(e.exerciseId).name)}`).join('<br>')}</div>
  </div>`;

// Kept across renders so coming back from a workout returns to the same view and month.
let view = 'list';
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let selDay = null; // 'YYYY-MM-DD' or null for the whole month

export function renderHistory(root) {
  const unit = state.settings.unit;
  const list = [...state.workouts].reverse();
  root.innerHTML = `
    <div class="row between">
      <h1>History</h1>
      <div class="seg">
        <button data-view="list" class="${view === 'list' ? 'on' : ''}">List</button>
        <button data-view="cal" class="${view === 'cal' ? 'on' : ''}">Calendar</button>
      </div>
    </div>
    ${list.length ? '' : '<p class="muted">Finished workouts will show up here.</p>'}
    ${view === 'cal' ? calendar(list, unit) : list.map((w) => workoutCard(w, unit)).join('')}`;

  root.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => { view = b.dataset.view; renderHistory(root); }));
  root.querySelectorAll('[data-month]').forEach((b) => (b.onclick = () => {
    const d = new Date(calYear, calMonth + Number(b.dataset.month), 1);
    calYear = d.getFullYear();
    calMonth = d.getMonth();
    selDay = null;
    renderHistory(root);
  }));
  root.querySelectorAll('[data-day]').forEach((b) => (b.onclick = () => {
    selDay = selDay === b.dataset.day ? null : b.dataset.day;
    renderHistory(root);
  }));
  root.querySelectorAll('[data-id]').forEach((c) => (c.onclick = () => (location.hash = `#/history/${c.dataset.id}`)));
}

// Month grid (weeks start Sunday); days with workouts are highlighted.
// Below it: the selected day's workouts, or the whole month's.
function calendar(list, unit) {
  const byDay = {};
  for (const w of list) (byDay[dateValue(w.start)] ||= []).push(w);
  const first = new Date(calYear, calMonth, 1);
  const days = new Date(calYear, calMonth + 1, 0).getDate();
  const today = dateValue(Date.now());
  const key = (d) => `${calYear}-${pad(calMonth + 1)}-${pad(d)}`;
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push('<span></span>');
  for (let d = 1; d <= days; d++) {
    const k = key(d);
    const cls = [byDay[k] && 'has', k === today && 'today', k === selDay && 'sel'].filter(Boolean).join(' ');
    cells.push(`<button class="${cls}" data-day="${k}" aria-label="${k}${byDay[k] ? `, ${byDay[k].length} workout` : ''}">${d}</button>`);
  }
  const monthPrefix = `${calYear}-${pad(calMonth + 1)}-`;
  const shown = selDay ? byDay[selDay] || [] : list.filter((w) => dateValue(w.start).startsWith(monthPrefix));
  const title = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  return `
    <div class="card cal">
      <div class="row between">
        <button class="text" data-month="-1" aria-label="Previous month">&lsaquo;</button>
        <b>${title}</b>
        <button class="text" data-month="1" aria-label="Next month">&rsaquo;</button>
      </div>
      <div class="cal-grid cal-head">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x) => `<span>${x}</span>`).join('')}</div>
      <div class="cal-grid">${cells.join('')}</div>
    </div>
    <p class="muted">${selDay
      ? `${fmtDate(new Date(`${selDay}T12:00`).getTime())}: ${shown.length || 'no'} workout${shown.length === 1 ? '' : 's'}`
      : `${shown.length} workout${shown.length === 1 ? '' : 's'} in ${title}`}</p>
    ${shown.map((w) => workoutCard(w, unit)).join('')}`;
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

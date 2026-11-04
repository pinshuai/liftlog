import { state, save, getExercise, previousSets, templateItems, saveAsTemplate } from '../store.js';
import { pickExercise, confirmModal, promptModal } from '../ui.js';
import { startRest, stopRest } from '../rest.js';
import { uid, esc, fmtNum, toUnit, fmtDuration } from '../util.js';
import { exIcon } from '../icons.js';

let clock = null;

// ---------- Home: templates + start ----------

export function renderWorkoutHome(root) {
  if (state.active) return renderActive(root);
  const tpls = state.templates;
  root.innerHTML = `
    <h1>Workout</h1>
    <button class="primary block" data-empty>Start empty workout</button>
    <div class="row between"><h2>Templates</h2><a class="btn text" href="#/template/new">+ New</a></div>
    ${tpls.length ? '' : '<p class="muted">No templates yet. Create one, e.g. "Upper Body".</p>'}
    ${tpls.map((t) => `
      <div class="card">
        <div class="row between">
          <b>${esc(t.name)}</b>
          <a class="btn text" href="#/template/${t.id}">Edit</a>
        </div>
        <div class="muted">${t.items.map((i) => `${i.sets} x ${esc(getExercise(i.exerciseId).name)}`).join('<br>') || 'No exercises'}</div>
        <button class="primary block" data-start="${t.id}">Start</button>
      </div>`).join('')}`;

  root.querySelector('[data-empty]').onclick = () => startWorkout(null);
  root.querySelectorAll('[data-start]').forEach((b) => (b.onclick = () => startWorkout(b.dataset.start)));
}

function newSet(prev) {
  return { w: prev?.w ?? '', r: prev?.r ?? '', done: false };
}

// Pre-fill a new exercise's sets with the last session's numbers (converted to the current unit).
function setsFor(exerciseId, count) {
  const prev = previousSets(exerciseId);
  return Array.from({ length: count }, (_, i) => {
    const p = prev[i] || prev[prev.length - 1];
    return newSet(p ? { w: toUnit(p.w, p.unit, state.settings.unit), r: p.r } : null);
  });
}

function startWorkout(templateId) {
  const t = state.templates.find((x) => x.id === templateId);
  state.active = {
    id: uid(),
    name: t ? t.name : 'Workout',
    templateId: t?.id ?? null,
    start: Date.now(),
    unit: state.settings.unit,
    restEnd: null,
    entries: t ? t.items.map((i) => ({ exerciseId: i.exerciseId, sets: setsFor(i.exerciseId, i.sets) })) : [],
  };
  save();
  location.hash = '#/workout';
  render();
}

// ---------- Active workout ----------

function render() {
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function prevLabel(exerciseId, i) {
  const p = previousSets(exerciseId)[i];
  if (!p) return '-';
  return `${fmtNum(toUnit(p.w, p.unit, state.active.unit))} x ${p.r}`;
}

function renderActive(root) {
  const a = state.active;
  root.innerHTML = `
    <div class="row between">
      <h1 class="grow" data-rename style="cursor:pointer">${esc(a.name)}</h1>
      <button class="primary" data-finish>Finish</button>
    </div>
    <p class="muted" style="margin-top:-12px"><span data-clock></span> elapsed &middot; ${a.unit}</p>
    ${a.entries.map((e, ei) => `
      <div class="card" data-entry="${ei}">
        <div class="row between">
          <h3 class="ex-name">${exIcon(e.exerciseId)}${esc(getExercise(e.exerciseId).name)}</h3>
          <button class="text danger" data-remove-ex="${ei}">Remove</button>
        </div>
        <table class="sets">
          <tr><th class="setnum">Set</th><th>Previous</th><th class="col-w">${a.unit}</th><th class="col-r">Reps</th><th></th><th></th></tr>
          ${e.sets.map((s, si) => `
            <tr class="${s.done ? 'done' : ''}">
              <td class="setnum">${si + 1}</td>
              <td class="prev">${prevLabel(e.exerciseId, si)}</td>
              <td><input inputmode="decimal" data-f="w" data-e="${ei}" data-s="${si}" value="${esc(s.w)}"></td>
              <td><input inputmode="numeric" data-f="r" data-e="${ei}" data-s="${si}" value="${esc(s.r)}"></td>
              <td><button class="check" data-check="${ei}:${si}" aria-label="Complete set">&#10003;</button></td>
              <td><button class="del-set" data-del="${ei}:${si}" aria-label="Delete set">&times;</button></td>
            </tr>`).join('')}
        </table>
        <button class="block" data-add-set="${ei}">+ Add set</button>
      </div>`).join('')}
    <button class="block" data-add-ex>+ Add exercise</button>
    <button class="block" data-save-tpl>Save as template</button>
    <button class="block danger" data-discard>Discard workout</button>`;

  const tickClock = () => {
    const c = root.querySelector('[data-clock]');
    if (!c || !state.active) return clearInterval(clock);
    c.textContent = fmtDuration(Date.now() - state.active.start);
  };
  clearInterval(clock);
  clock = setInterval(tickClock, 1000);
  tickClock();

  // Typing updates state without re-rendering so the keyboard stays open.
  root.querySelectorAll('input[data-f]').forEach((inp) => {
    inp.oninput = () => {
      const v = inp.value.replace(',', '.');
      a.entries[inp.dataset.e].sets[inp.dataset.s][inp.dataset.f] = v === '' ? '' : Number(v);
      save();
    };
  });

  root.querySelectorAll('[data-check]').forEach((b) => (b.onclick = () => {
    const [ei, si] = b.dataset.check.split(':').map(Number);
    const s = a.entries[ei].sets[si];
    if (!s.done && (s.r === '' || s.r <= 0)) {
      // Fill from previous if the user just taps the checkmark.
      const p = previousSets(a.entries[ei].exerciseId)[si];
      if (!p) return b.closest('tr').querySelector('[data-f="r"]').focus();
      s.w = s.w === '' ? toUnit(p.w, p.unit, a.unit) : s.w;
      s.r = p.r;
    }
    s.done = !s.done;
    save();
    if (s.done) startRest();
    render();
  }));

  root.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => {
    const [ei, si] = b.dataset.del.split(':').map(Number);
    a.entries[ei].sets.splice(si, 1);
    save();
    render();
  }));

  root.querySelectorAll('[data-add-set]').forEach((b) => (b.onclick = () => {
    const sets = a.entries[b.dataset.addSet].sets;
    const last = sets[sets.length - 1];
    sets.push(newSet(last));
    save();
    render();
  }));

  root.querySelectorAll('[data-remove-ex]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmModal('Remove this exercise from the workout?', 'Remove', true))) return;
    a.entries.splice(Number(b.dataset.removeEx), 1);
    save();
    render();
  }));

  root.querySelector('[data-add-ex]').onclick = async () => {
    const id = await pickExercise();
    if (!id) return;
    a.entries.push({ exerciseId: id, sets: setsFor(id, 3) });
    save();
    render();
  };

  root.querySelector('[data-rename]').onclick = async () => {
    const name = await promptModal('Workout name', a.name);
    if (name) { a.name = name; save(); render(); }
  };

  root.querySelector('[data-save-tpl]').onclick = async () => {
    if (!a.entries.length) return;
    const name = await promptModal('Template name', a.name);
    if (!name) return;
    const t = saveAsTemplate(name, a.entries);
    // Link the workout to the new template so Finish compares against it.
    a.templateId = t.id;
    a.name = name;
    save();
    render();
  };

  root.querySelector('[data-discard]').onclick = async () => {
    if (!(await confirmModal('Discard this workout? Nothing will be saved.', 'Discard', true))) return;
    state.active = null;
    stopRest();
    save();
    render();
  };

  root.querySelector('[data-finish]').onclick = async () => {
    const entries = a.entries
      .map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.filter((s) => s.done) }))
      .filter((e) => e.sets.length);
    if (!entries.length) {
      if (await confirmModal('No sets are checked off. Discard this workout?', 'Discard', true)) {
        state.active = null;
        stopRest();
        save();
        render();
      }
      return;
    }
    const open = a.entries.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
    if (open && !(await confirmModal(`${open} unchecked set(s) will be dropped. Finish workout?`, 'Finish'))) return;
    // If exercises or set rows were added/removed vs. the template, offer to update it.
    // Compares all rows (not just checked ones) so a skipped set alone doesn't trigger this.
    const tpl = state.templates.find((t) => t.id === a.templateId);
    const items = templateItems(a.entries);
    if (tpl && JSON.stringify(items) !== JSON.stringify(tpl.items.map(({ exerciseId, sets }) => ({ exerciseId, sets })))
      && await confirmModal(`You changed this workout. Update the "${tpl.name}" template to match?`, 'Update template', false, 'Keep template as is')) {
      tpl.items = items;
    }
    const workout = { id: a.id, name: a.name, templateId: a.templateId, start: a.start, end: Date.now(), unit: a.unit, entries };
    state.workouts.push(workout);
    state.active = null;
    stopRest();
    save();
    location.hash = `#/history/${workout.id}`;
  };
}

// ---------- Template editor ----------

export function renderTemplate(root, id) {
  const existing = state.templates.find((t) => t.id === id);
  // Work on a copy so Cancel leaves the template untouched.
  const t = existing ? structuredClone(existing) : { id: uid(), name: '', items: [] };

  const draw = () => {
    root.innerHTML = `
      <div class="row between">
        <a class="btn text" href="#/workout">Cancel</a>
        <button class="primary" data-save>Save</button>
      </div>
      <h1>${existing ? 'Edit template' : 'New template'}</h1>
      <input data-name placeholder="Template name (e.g. Upper Body)" value="${esc(t.name)}">
      <h2>Exercises</h2>
      ${t.items.map((it, i) => `
        <div class="card row">
          <div class="grow ex-name">${exIcon(it.exerciseId)}${esc(getExercise(it.exerciseId).name)}</div>
          <input inputmode="numeric" data-sets="${i}" value="${it.sets}" style="width:56px;text-align:center">
          <span class="muted">sets</span>
          <button class="text" data-up="${i}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>&uarr;</button>
          <button class="text danger" data-rm="${i}" aria-label="Remove">&times;</button>
        </div>`).join('') || '<p class="muted">No exercises yet.</p>'}
      <button class="block" data-add>+ Add exercise</button>
      ${existing ? '<button class="block danger" data-delete>Delete template</button>' : ''}`;

    const nameIn = root.querySelector('[data-name]');
    nameIn.oninput = () => (t.name = nameIn.value);
    root.querySelectorAll('[data-sets]').forEach((inp) => (inp.oninput = () => {
      t.items[inp.dataset.sets].sets = Math.max(1, Math.min(20, parseInt(inp.value, 10) || 1));
    }));
    root.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { t.items.splice(+b.dataset.rm, 1); draw(); }));
    root.querySelectorAll('[data-up]').forEach((b) => (b.onclick = () => {
      const i = +b.dataset.up;
      [t.items[i - 1], t.items[i]] = [t.items[i], t.items[i - 1]];
      draw();
    }));
    root.querySelector('[data-add]').onclick = async () => {
      const exId = await pickExercise();
      if (exId) { t.items.push({ exerciseId: exId, sets: 3 }); draw(); }
    };
    root.querySelector('[data-save]').onclick = () => {
      t.name = t.name.trim();
      if (!t.name) return nameIn.focus();
      if (existing) Object.assign(existing, t);
      else state.templates.push(t);
      save();
      location.hash = '#/workout';
    };
    root.querySelector('[data-delete]')?.addEventListener('click', async () => {
      if (!(await confirmModal(`Delete template "${existing.name}"?`, 'Delete', true))) return;
      state.templates = state.templates.filter((x) => x.id !== existing.id);
      save();
      location.hash = '#/workout';
    });
  };
  draw();
}

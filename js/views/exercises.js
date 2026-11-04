import { state, save, allExercises, getExercise, exerciseHistory, isAssisted, weightLabel } from '../store.js';
import { confirmModal } from '../ui.js';
import { esc, e1rm, fmtDate, fmtNum, toUnit } from '../util.js';
import { BODY_PARTS } from '../exercises.js';
import { exIcon } from '../icons.js';

let query = '';

export function renderExercises(root) {
  root.innerHTML = `
    <h1>Exercises</h1>
    <input data-q placeholder="Search" value="${esc(query)}" autocomplete="off">
    <div data-list style="margin-top:8px"></div>`;
  const listEl = root.querySelector('[data-list]');
  const q = root.querySelector('[data-q]');
  const draw = () => {
    const term = query.toLowerCase();
    const items = allExercises().filter((x) => !term || x.name.toLowerCase().includes(term));
    listEl.innerHTML = BODY_PARTS.map((part) => {
      const group = items.filter((x) => x.bodyPart === part);
      if (!group.length) return '';
      return `<h2>${part}</h2><div class="card">${group.map((x) => `
        <div class="list-item" data-id="${esc(x.id)}">
          <span class="ex-name">${exIcon(x.id)}${esc(x.name)}</span>
          <span class="chip">${exerciseHistory(x.id).length || ''}${x.custom ? ' custom' : ''}</span>
        </div>`).join('')}</div>`;
    }).join('') || '<p class="muted">No matches.</p>';
  };
  q.oninput = () => { query = q.value.trim(); draw(); };
  listEl.onclick = (e) => {
    const item = e.target.closest('[data-id]');
    if (item) location.hash = `#/exercise/${item.dataset.id}`;
  };
  draw();
}

// Line chart of best e1RM per session, as inline SVG.
function chart(points, caption) {
  if (points.length < 2) return '<p class="muted">Log at least two sessions to see a chart.</p>';
  const W = 340, H = 180, L = 36, R = 8, T = 10, B = 22;
  const ys = points.map((p) => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 5; max += 5; }
  const x0 = points[0].x, x1 = points[points.length - 1].x;
  const sx = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const sy = (y) => T + (1 - (y - min) / (max - min)) * (H - T - B);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const short = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Estimated 1RM over time">
      <line class="axis" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/>
      <text class="lbl" x="${L - 4}" y="${sy(max) + 3}" text-anchor="end">${Math.round(max)}</text>
      <text class="lbl" x="${L - 4}" y="${sy(min) + 3}" text-anchor="end">${Math.round(min)}</text>
      <text class="lbl" x="${L}" y="${H - 6}">${short(x0)}</text>
      <text class="lbl" x="${W - R}" y="${H - 6}" text-anchor="end">${short(x1)}</text>
      <path class="ln" d="${d}"/>
      ${points.map((p) => `<circle class="pt" cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="3"/>`).join('')}
    </svg>
    <p class="muted">${caption}</p>`;
}

export function renderExerciseDetail(root, id) {
  const ex = getExercise(id);
  const unit = state.settings.unit;
  const sessions = exerciseHistory(id).map(({ workout, sets }) => ({
    workout,
    sets: sets.map((s) => ({ w: Number(toUnit(s.w, workout.unit, unit)) || 0, r: Number(s.r) })),
  }));

  // Assisted: best = least assistance (more reps breaks ties); chart least assistance.
  // Otherwise: best = heaviest set; chart best estimated 1RM.
  const assisted = isAssisted(id);
  const better = (s, b) => !b || (assisted ? s.w < b.w : s.w > b.w) || (s.w === b.w && s.r > b.r);
  let bestSet = null, bestE1rm = 0;
  const points = sessions.map(({ workout, sets }) => {
    let top = assisted ? Infinity : 0;
    for (const s of sets) {
      top = assisted ? Math.min(top, s.w) : Math.max(top, e1rm(s.w, s.r));
      if (better(s, bestSet)) bestSet = s;
    }
    if (!assisted) bestE1rm = Math.max(bestE1rm, top);
    return { x: workout.start, y: top };
  }).filter((p) => (assisted ? Number.isFinite(p.y) : p.y > 0));

  root.innerHTML = `
    <a class="btn text" href="#/exercises">&larr; Exercises</a>
    <h1 class="ex-name">${exIcon(id)}${esc(ex.name)}</h1>
    <div class="card">
      <span class="stat"><span class="muted">${assisted ? 'Least assist' : 'Best set'}</span><b>${bestSet ? `${fmtNum(bestSet.w)} x ${bestSet.r}` : '-'}</b></span>
      ${assisted ? '' : `<span class="stat"><span class="muted">Est. 1RM</span><b>${bestE1rm ? fmtNum(bestE1rm) : '-'}</b></span>`}
      <span class="stat"><span class="muted">Sessions</span><b>${sessions.length}</b></span>
    </div>
    <div class="card">${chart(points, assisted
      ? `Least assistance (${unit}) per session, lower is better`
      : `Estimated 1-rep max (${unit}) per session`)}</div>
    <h2>Sessions</h2>
    ${sessions.length ? '' : '<p class="muted">No sessions logged yet.</p>'}
    ${[...sessions].reverse().map(({ workout, sets }) => `
      <div class="card link" data-w="${workout.id}">
        <div class="muted">${fmtDate(workout.start)}</div>
        ${sets.map((s) => `${weightLabel(id, fmtNum(s.w), unit)} x ${s.r}`).join(', ')}
      </div>`).join('')}
    ${ex.custom && state.customExercises.some((x) => x.id === id) ? '<button class="block danger" data-delete>Delete custom exercise</button>' : ''}`;

  root.querySelectorAll('[data-w]').forEach((c) => (c.onclick = () => (location.hash = `#/history/${c.dataset.w}`)));
  root.querySelector('[data-delete]')?.addEventListener('click', async () => {
    const inUse = sessions.length || state.templates.some((t) => t.items.some((i) => i.exerciseId === id));
    if (inUse) return confirmModal('This exercise is used in history or a template, so it cannot be deleted.', 'OK');
    if (!(await confirmModal(`Delete "${ex.name}"?`, 'Delete', true))) return;
    state.customExercises = state.customExercises.filter((x) => x.id !== id);
    save();
    location.hash = '#/exercises';
  });
}

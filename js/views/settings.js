import { state, save, exportJSON, importJSON } from '../store.js';
import { confirmModal } from '../ui.js';

export function renderSettings(root) {
  const s = state.settings;
  root.innerHTML = `
    <h1>Settings</h1>
    <div class="card">
      <label class="muted">Weight unit (for new workouts)</label>
      <select data-unit style="margin-top:4px">
        <option value="lb" ${s.unit === 'lb' ? 'selected' : ''}>Pounds (lb)</option>
        <option value="kg" ${s.unit === 'kg' ? 'selected' : ''}>Kilograms (kg)</option>
      </select>
      <label class="muted" style="display:block;margin-top:12px">Default rest timer (seconds, 0 = off)</label>
      <input data-rest inputmode="numeric" value="${s.restSec}" style="margin-top:4px">
    </div>
    <h2>Backup</h2>
    <div class="card">
      <p class="muted" style="margin-top:0">Your data lives only on this phone. Export a backup now and then
      (save it to Files or iCloud Drive), and import it on a new phone.</p>
      <button class="primary block" data-export>Export backup</button>
      <button class="block" data-import>Import backup</button>
      <input type="file" accept="application/json,.json" data-file class="hidden">
      <p class="muted" data-msg></p>
    </div>
    <p class="muted">${state.workouts.length} workouts &middot; ${state.templates.length} templates &middot; ${state.customExercises.length} custom exercises</p>`;

  const msg = root.querySelector('[data-msg]');
  root.querySelector('[data-unit]').onchange = (e) => { s.unit = e.target.value; save(); };
  root.querySelector('[data-rest]').oninput = (e) => {
    s.restSec = Math.max(0, Math.min(900, parseInt(e.target.value, 10) || 0));
    save();
  };

  root.querySelector('[data-export]').onclick = async () => {
    const name = `liftlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([exportJSON()], name, { type: 'application/json' });
    // On iPhone the share sheet is the reliable way to save into Files.
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const fileIn = root.querySelector('[data-file]');
  root.querySelector('[data-import]').onclick = () => fileIn.click();
  fileIn.onchange = async () => {
    const f = fileIn.files[0];
    fileIn.value = '';
    if (!f) return;
    if (!(await confirmModal('Importing replaces ALL data on this phone with the backup. Continue?', 'Replace data', true))) return;
    try {
      importJSON(await f.text());
      renderSettings(root);
      root.querySelector('[data-msg]').textContent = 'Backup restored.';
    } catch (e) {
      msg.textContent = 'Import failed: ' + e.message;
    }
  };
}

import { state, save, exportJSON, exportMarkdown, importJSON } from '../store.js';
import { confirmModal } from '../ui.js';
import { fmtDate } from '../util.js';

// Hand a file to the share sheet (iPhone: Save to Files / iCloud Drive), falling
// back to a download. Resolves false if the user cancelled.
async function saveFile(name, text, type) {
  const file = new File([text], name, { type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return true; } catch (e) { if (e.name === 'AbortError') return false; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}

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
      <p class="muted" style="margin-top:0">Your data lives only in this home-screen app (a Safari tab has
      separate, empty storage). Export a backup now and then: tap <b>Save to Files</b>, then <b>iCloud Drive</b>.</p>
      <p style="margin:0 0 4px"><b>Last backup:</b> ${s.lastBackup ? fmtDate(s.lastBackup) : 'never'}</p>
      <button class="primary block" data-export>Export backup (JSON, restorable)</button>
      <button class="block" data-import>Import backup</button>
      <button class="block" data-export-md>Export readable copy (Markdown)</button>
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

  const today = () => new Date().toISOString().slice(0, 10);

  root.querySelector('[data-export]').onclick = async () => {
    if (!(await saveFile(`liftlog-backup-${today()}.json`, exportJSON(), 'application/json'))) return;
    s.lastBackup = Date.now();
    save();
    renderSettings(root);
  };

  root.querySelector('[data-export-md]').onclick = () =>
    saveFile(`liftlog-${today()}.md`, exportMarkdown(), 'text/markdown');

  const fileIn = root.querySelector('[data-file]');
  root.querySelector('[data-import]').onclick = () => fileIn.click();
  fileIn.onchange = async () => {
    const f = fileIn.files[0];
    fileIn.value = '';
    if (!f) return;
    if (!(await confirmModal('Importing replaces ALL data on this phone with the backup. Continue?', 'Replace data', true))) return;
    try {
      importJSON(await f.text());
      // The restored data came from a backup file, so it is already backed up.
      state.settings.lastBackup = Date.now();
      save();
      renderSettings(root);
      root.querySelector('[data-msg]').textContent = 'Backup restored.';
    } catch (e) {
      msg.textContent = 'Import failed: ' + e.message;
    }
  };
}

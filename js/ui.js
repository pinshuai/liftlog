import { allExercises, addCustomExercise } from './store.js';
import { BODY_PARTS } from './exercises.js';
import { esc, html } from './util.js';
import { exIcon } from './icons.js';

// Bottom-sheet modal. Returns { el, close }.
export function openModal(inner) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.append(html(`<div class="modal">${inner}</div>`));
  document.body.append(bg);
  const close = () => bg.remove();
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  return { el: bg.querySelector('.modal'), close };
}

export function confirmModal(message, okLabel = 'OK', danger = false, cancelLabel = 'Cancel') {
  return new Promise((resolve) => {
    const { el, close } = openModal(`
      <p>${esc(message)}</p>
      <button class="${danger ? 'danger' : 'primary'} block" data-ok>${esc(okLabel)}</button>
      <button class="block" data-cancel>${esc(cancelLabel)}</button>`);
    el.querySelector('[data-ok]').onclick = () => { close(); resolve(true); };
    el.querySelector('[data-cancel]').onclick = () => { close(); resolve(false); };
  });
}

export function promptModal(title, value = '') {
  return new Promise((resolve) => {
    const { el, close } = openModal(`
      <h2>${esc(title)}</h2>
      <input data-in value="${esc(value)}">
      <button class="primary block" data-ok>Save</button>
      <button class="block" data-cancel>Cancel</button>`);
    const input = el.querySelector('[data-in]');
    input.focus();
    const ok = () => { close(); resolve(input.value.trim() || null); };
    el.querySelector('[data-ok]').onclick = ok;
    input.onkeydown = (e) => { if (e.key === 'Enter') ok(); };
    el.querySelector('[data-cancel]').onclick = () => { close(); resolve(null); };
  });
}

// Searchable exercise picker with "create custom". Resolves to an exercise id or null.
export function pickExercise() {
  return new Promise((resolve) => {
    const { el, close } = openModal(`
      <div class="row between"><h2>Add exercise</h2><button class="text" data-cancel>Cancel</button></div>
      <input data-q placeholder="Search" autocomplete="off">
      <div class="scroll" data-list></div>
      <button class="block" data-new>+ Create custom exercise</button>`);
    const q = el.querySelector('[data-q]');
    const listEl = el.querySelector('[data-list]');
    const done = (id) => { close(); resolve(id); };

    const draw = () => {
      const term = q.value.trim().toLowerCase();
      const items = allExercises().filter((x) => !term || x.name.toLowerCase().includes(term) || x.bodyPart.toLowerCase().includes(term));
      listEl.innerHTML = items.map((x) => `
        <div class="list-item" data-id="${esc(x.id)}"><span class="ex-name">${exIcon(x.id)}${esc(x.name)}</span><span class="chip">${esc(x.bodyPart)}</span></div>`).join('')
        || '<p class="muted">No matches.</p>';
    };
    listEl.onclick = (e) => {
      const item = e.target.closest('[data-id]');
      if (item) done(item.dataset.id);
    };
    q.oninput = draw;
    el.querySelector('[data-cancel]').onclick = () => done(null);
    el.querySelector('[data-new]').onclick = () => {
      el.innerHTML = `
        <h2>New exercise</h2>
        <input data-name placeholder="Name" value="${esc(q.value.trim())}">
        <select data-part style="margin-top:8px">${BODY_PARTS.map((p) => `<option>${p}</option>`).join('')}</select>
        <button class="primary block" data-save>Create</button>
        <button class="block" data-cancel>Cancel</button>`;
      el.querySelector('[data-cancel]').onclick = () => done(null);
      el.querySelector('[data-save]').onclick = () => {
        const name = el.querySelector('[data-name]').value.trim();
        if (!name) return;
        done(addCustomExercise(name, el.querySelector('[data-part]').value).id);
      };
    };
    draw();
  });
}

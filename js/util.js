export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const LB_PER_KG = 2.20462;

// Convert a stored weight (in its own unit) to the display unit.
export function toUnit(w, from, to) {
  if (w == null || w === '' || from === to) return w;
  const v = from === 'kg' ? w * LB_PER_KG : w / LB_PER_KG;
  return Math.round(v * 10) / 10;
}

export const fmtNum = (n) => (n == null || n === '' ? '' : String(Math.round(n * 10) / 10));

// Epley estimated one-rep max.
export const e1rm = (w, r) => (r > 0 && w > 0 ? (r === 1 ? w : w * (1 + r / 30)) : 0);

export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (x) => String(x).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Build a DOM fragment from an HTML string.
export function html(str) {
  const t = document.createElement('template');
  t.innerHTML = str.trim();
  return t.content;
}

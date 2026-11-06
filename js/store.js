import { BUILT_IN_EXERCISES } from './exercises.js';
import { uid } from './util.js';

const KEY = 'liftlog:v1';
const VERSION = 1;

function blank() {
  return {
    version: VERSION,
    settings: { unit: 'lb', restSec: 120, restSound: true, lastBackup: null },
    customExercises: [],
    templates: [],
    workouts: [],
    active: null,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const saved = JSON.parse(raw);
    return { ...blank(), ...saved, settings: { ...blank().settings, ...saved.settings } };
  } catch (e) {
    console.error('Failed to load saved data', e);
    return blank();
  }
}

export const state = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save', e);
    alert('Could not save data: ' + e.message);
  }
}

const BACKUP_REMIND_DAYS = 7;

// True when there is data worth protecting and no JSON backup in the last week.
export function backupDue() {
  if (!state.workouts.length) return false;
  const last = state.settings.lastBackup;
  return !last || Date.now() - last > BACKUP_REMIND_DAYS * 86400000;
}

// Ask Safari not to evict our storage. Best effort; not supported everywhere.
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

export function allExercises() {
  return [...BUILT_IN_EXERCISES, ...state.customExercises].sort((a, b) => a.name.localeCompare(b.name));
}

export function getExercise(id) {
  return BUILT_IN_EXERCISES.find((e) => e.id === id)
    || state.customExercises.find((e) => e.id === id)
    || { id, name: 'Unknown exercise', bodyPart: 'Other', custom: true };
}

// Assisted exercises (e.g. "Pull Up (Assisted)") log the machine's assistance as the
// weight, so lower is better and the weight is not lifted load.
export const isAssisted = (exerciseId) => /assisted/i.test(getExercise(exerciseId).name);

// "185 lb", "50 lb assist" for assisted exercises, or "bodyweight" when no weight was entered.
export const weightLabel = (exerciseId, w, unit) => {
  if (isAssisted(exerciseId)) return `${w === '' || w == null ? 0 : w} ${unit} assist`;
  return Number(w) ? `${w} ${unit}` : 'bodyweight';
};

export function addCustomExercise(name, bodyPart) {
  const ex = { id: 'cx-' + uid(), name: name.trim(), bodyPart, custom: true };
  state.customExercises.push(ex);
  save();
  return ex;
}

// Most recent completed sets for an exercise, as [{w, r, unit}], newest workout first.
export function previousSets(exerciseId) {
  for (let i = state.workouts.length - 1; i >= 0; i--) {
    const w = state.workouts[i];
    const entry = w.entries.find((e) => e.exerciseId === exerciseId);
    const done = entry?.sets.filter((s) => s.done);
    if (done?.length) return done.map((s) => ({ ...s, unit: w.unit }));
  }
  return [];
}

// All sessions of one exercise: [{workout, sets}] oldest first.
export function exerciseHistory(exerciseId) {
  const out = [];
  for (const w of state.workouts) {
    const entry = w.entries.find((e) => e.exerciseId === exerciseId);
    const sets = entry?.sets.filter((s) => s.done && s.r > 0);
    if (sets?.length) out.push({ workout: w, sets });
  }
  return out;
}

// Template items (exercise order + set count) from workout entries.
export function templateItems(entries) {
  return entries.filter((e) => e.sets.length).map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.length }));
}

export function saveAsTemplate(name, entries) {
  const t = { id: uid(), name, items: templateItems(entries) };
  state.templates.push(t);
  save();
  return t;
}

// Human-readable log, newest workout first. Not importable; JSON is the restorable backup.
export function exportMarkdown() {
  const pad = (n) => String(n).padStart(2, '0');
  const day = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const lines = [`# LiftLog export (${day(Date.now())})`, ''];
  for (const w of [...state.workouts].reverse()) {
    const mins = Math.round((w.end - w.start) / 60000);
    lines.push(`## ${day(w.start)} ${w.name} (${mins} min)`, '');
    for (const e of w.entries) {
      const sets = e.sets.map((s) => `${weightLabel(e.exerciseId, s.w, w.unit)} x ${s.r}`).join(', ');
      lines.push(`- ${getExercise(e.exerciseId).name}: ${sets}`);
    }
    lines.push('');
  }
  if (!state.workouts.length) lines.push('_No workouts yet._');
  return lines.join('\n');
}

export function exportJSON() {
  return JSON.stringify({ app: 'liftlog', exportedAt: new Date().toISOString(), ...state }, null, 2);
}

export function importJSON(text) {
  const data = JSON.parse(text);
  if (data.app !== 'liftlog' || !Array.isArray(data.workouts) || !Array.isArray(data.templates)) {
    throw new Error('This file is not a LiftLog backup.');
  }
  const next = { ...blank(), ...data };
  delete next.app;
  delete next.exportedAt;
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, next);
  save();
}

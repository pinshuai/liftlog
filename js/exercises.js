// Built-in exercise library. IDs are stable so history keeps working across updates.
const list = [
  ['Squat (Barbell)', 'Legs'],
  ['Bench Press (Barbell)', 'Chest'],
  ['Bench Press (Dumbbell)', 'Chest'],
  ['Incline Bench Press (Barbell)', 'Chest'],
  ['Incline Bench Press (Dumbbell)', 'Chest'],
  ['Chest Dip (Assisted)', 'Chest'],
  ['Pull Up (Assisted)', 'Back'],
  ['Deadlift (Barbell)', 'Back'],
  ['Triceps Extension (Dumbbell)', 'Arms'],
  ['Crunch (Machine)', 'Core'],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const BUILT_IN_EXERCISES = list.map(([name, bodyPart]) => ({
  id: 'bi-' + slug(name),
  name,
  bodyPart,
  custom: false,
}));

export const BODY_PARTS = ['Chest', 'Shoulders', 'Back', 'Arms', 'Legs', 'Core', 'Other'];

// Line-art exercise icons on a 32x32 grid. Stroke uses currentColor so they follow the theme.
const head = (x, y) => `<circle cx="${x}" cy="${y}" r="2.4"/>`;
const l = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}"/>`;
// Horizontal barbell centred at (cx, y) with plates at both ends.
const barbell = (x1, x2, y) => l(x1, y, x2, y) + l(x1 + 1.5, y - 3.5, x1 + 1.5, y + 3.5) + l(x2 - 1.5, y - 3.5, x2 - 1.5, y + 3.5);
const dumbbell = (cx, y, hw = 2) => l(cx - hw, y, cx + hw, y) + l(cx - hw, y - 2, cx - hw, y + 2) + l(cx + hw, y - 2, cx + hw, y + 2);

const flatBench = (top) => `
  ${l(4, 25, 26, 25)}${l(7, 25, 7, 29)}${l(23, 25, 23, 29)}
  ${head(7, 20)}${l(10, 21, 22, 21)}${l(22, 21, 26, 24)}
  ${l(14, 21, 14, 11)}${l(19, 21, 19, 11)}${top}`;

// Backrest rises to the upper left with the head at the top; hips on a flat seat,
// knees bent with feet on the floor; arms press straight up.
const inclineBench = (top) => `
  ${l(8, 13, 18, 26)}${l(18, 26, 26, 26)}${l(18, 26, 16, 30)}${l(25, 26, 25, 30)}
  ${head(9.5, 8.5)}${l(11.5, 11, 20, 23.5)}${l(20, 23.5, 27, 22)}${l(27, 22, 28, 29)}
  ${l(14, 14.7, 14, 5)}${l(18, 20.5, 18, 5)}${top}`;

const ICONS = {
  'bi-squat-barbell': `
    ${barbell(3, 29, 10)}${head(16, 6)}
    ${l(16, 9, 16, 18)}${l(16, 18, 10, 21)}${l(10, 21, 10, 28)}${l(16, 18, 22, 21)}${l(22, 21, 22, 28)}
    ${l(16, 11, 11, 10)}${l(16, 11, 21, 10)}`,
  'bi-bench-press-barbell': flatBench(barbell(8, 25, 10)),
  'bi-bench-press-dumbbell': flatBench(dumbbell(14, 10) + dumbbell(19, 10)),
  'bi-incline-bench-press-barbell': inclineBench(barbell(11, 28, 4.5)),
  'bi-incline-bench-press-dumbbell': inclineBench(dumbbell(14, 4.5, 1.6) + dumbbell(18, 4.5, 1.6)),
  'bi-chest-dip-assisted': `
    ${l(5, 13, 5, 29)}${l(27, 13, 27, 29)}${l(3, 13, 9, 13)}${l(23, 13, 29, 13)}
    ${head(16, 6)}${l(16, 9, 16, 19)}${l(16, 11, 7, 13)}${l(16, 11, 25, 13)}
    ${l(16, 19, 13, 24)}${l(16, 19, 19, 24)}${l(10, 25, 22, 25)}`,
  'bi-pull-up-assisted': `
    ${l(3, 4, 29, 4)}${head(16, 10)}
    ${l(9, 4, 12, 12)}${l(23, 4, 20, 12)}${l(12, 12, 16, 13)}${l(20, 12, 16, 13)}
    ${l(16, 13, 16, 21)}${l(16, 21, 13, 26)}${l(16, 21, 19, 26)}${l(10, 27, 22, 27)}`,
  'bi-deadlift-barbell': `
    ${head(16, 5)}${l(16, 8, 16, 17)}${l(16, 17, 12, 29)}${l(16, 17, 20, 29)}
    ${l(16, 10, 11, 22)}${l(16, 10, 21, 22)}${barbell(3, 29, 22)}`,
  'bi-triceps-extension-dumbbell': `
    ${head(16, 16)}${l(16, 19, 16, 25)}${l(16, 25, 12, 30)}${l(16, 25, 20, 30)}
    ${l(13, 20, 10, 5)}${l(19, 20, 22, 5)}${l(10, 5, 16, 10)}${l(22, 5, 16, 10)}
    ${l(16, 7, 16, 12)}${l(13.5, 7, 18.5, 7)}${l(13.5, 12, 18.5, 12)}`,
  'bi-crunch-machine': `
    ${l(7, 13, 7, 27)}${l(4, 27, 16, 27)}${l(10, 27, 10, 30)}
    <path d="M10 25 Q11 16 18 13"/>${head(20, 11)}
    ${l(10, 25, 20, 24)}${l(20, 24, 21, 30)}
    ${l(13, 16, 22, 17)}${l(22, 15, 22, 19)}`,
};

// Generic dumbbell for custom exercises.
const DEFAULT = `${l(9, 16, 23, 16)}${l(9, 10, 9, 22)}${l(23, 10, 23, 22)}${l(6, 12, 6, 20)}${l(26, 12, 26, 20)}`;

export function exIcon(id) {
  return `<svg class="ex-icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[id] || DEFAULT}</svg>`;
}

/**
 * Old Snapper's portrait (B15), in the B11 style: a big blunt head turned a
 * little toward you under the front of his mossy shell like a hood, a hooked
 * beak of pale horn turned down at its corners, heavy brows slanting to the
 * middle over two small gold eyes (a glower), wrinkled skin and wattles, an
 * old fishhook in the corner of his mouth with its snapped line, his scaly
 * forelegs at the foot of the frame. Old, grumpy and not to be hurried.
 */
import { hash, put, type TGrid } from '../town2/cells';
import { cell } from './cave';
import { blob, cast, form, marks, stroke } from './heads';
import type { FaceDef } from './folkFaces';
import { rod } from './kit';

/** A scaly foreleg at the frame's foot, its claws curled forward. */
function foreleg(g: TGrid, x: number, flip: boolean): void {
  const s = flip ? -1 : 1;
  const leg = blob([
    [x - 9 * s, 72],
    [x - 8 * s, 62],
    [x - 2 * s, 57],
    [x + 6 * s, 59],
    [x + 9 * s, 66],
    [x + 8 * s, 72],
  ]);
  form(g, leg, 'turtleskin', {
    cx: x - 10,
    cy: 55,
    rx: 16,
    ry: 14,
    base: 2.8,
    k: 1.4,
    rim: 3,
    tex: (px, py, t) => ((px + py * 2) % 5 === 0 && hash(px, py, 77) < 0.6 ? t + 1 : t),
  });
  for (const dx of [-5, -1, 3]) {
    put(g, x + dx * s, 70, cell('tar', 1));
    put(g, x + dx * s + s, 71, cell('tar', 3));
  }
}

export const OLD_SNAPPER: FaceDef = {
  disc: 'tidedeep',
  discStep: 5,
  draw(g) {
    foreleg(g, 9, false);
    foreleg(g, 63, true);
    // The neck's folds below the head.
    const neckShape = blob([
      [18, 72],
      [20, 52],
      [52, 52],
      [54, 72],
    ]);
    form(g, neckShape, 'turtleskin', { cx: 26, cy: 50, rx: 26, ry: 22, base: 2.9, k: 1.3, rim: 3 });
    for (const y of [58, 63, 68])
      stroke(
        g,
        [
          [22, y],
          [30, y + 2],
          [42, y + 2],
          [50, y],
        ],
        'turtleskin',
        4,
      );
    // The shell behind him: a broad mound rising over his shoulders, mossy and knobbed.
    const dome = blob([
      [-8, 46],
      [-2, 18],
      [12, 4],
      [36, 0],
      [60, 4],
      [74, 18],
      [80, 46],
      [56, 40],
      [16, 40],
    ]);
    form(g, dome, 'turtle', {
      cx: 14,
      cy: 4,
      rx: 46,
      ry: 34,
      base: 3,
      k: 1.6,
      rim: 4,
      tex: (x, y, t) => {
        const a = Math.atan2(44 - y, x - 36);
        const r = Math.hypot(x - 36, 44 - y);
        for (const q of [0.55, 1.05, 2.1, 2.6])
          if (Math.abs(a - q) * r < 0.7 && r > 18) return t + 2;
        if (Math.abs(r - 30) < 0.6) return t + 2;
        if (Math.abs(r - 32.5) < 0.6 && hash(x, y, 93) < 0.7) return t + 1;
        return hash(x, y, 91) < 0.05 ? t + 1 : t;
      },
    });
    for (const x of [22, 36, 50])
      marks(g, x - 1, x === 36 ? 0 : 1, ['.a.', 'abc'], {
        a: ['turtle', 0],
        b: ['turtle', 2],
        c: ['turtle', 4],
      });
    for (const [x, y, r] of [
      [10, 16, 5],
      [20, 8, 4],
      [5, 27, 3],
    ] as const)
      form(
        g,
        blob([
          [x - r, y + 1],
          [x - r * 0.4, y - r * 0.7],
          [x + r * 0.6, y - r * 0.6],
          [x + r, y + 1],
          [x, y + r * 0.5],
        ]),
        'moss',
        { cx: x - r, cy: y - r, rx: r * 2, ry: r * 2, base: 2.6, k: 1.6, rim: 2 },
      );
    for (const [x, y] of [
      [62, 20],
      [66, 24],
      [63, 26],
      [68, 19],
    ] as const)
      marks(g, x, y, ['ab', 'bc'], { a: ['cream', 0], b: ['cream', 2], c: ['tar', 3] });
    marks(g, 52, 7, ['...a...', '..aba..', 'aabbbcc', '.abbbc.', '.ab.cc.', 'a.....c'], {
      a: ['plum', 1],
      b: ['plum', 2],
      c: ['plum', 4],
    });
    for (let i = 0; i < 4; i++)
      rod(g, 2 + i * 5, 40 + i, 2 + i * 5 + (i % 2), 46 + i, 2, 'kelp', [3, 4]);
    // The head, pushed out in front of the shell: broad, blunt, a hump over each eye.
    const head = blob([
      [11, 38],
      [15, 22],
      [26, 15],
      [36, 14],
      [46, 15],
      [57, 22],
      [61, 38],
      [54, 52],
      [36, 59],
      [18, 52],
    ]);
    cast(g, head, { dx: 2, dy: 2, n: 2, on: ['turtle', 'moss'] });
    form(g, head, 'turtleskin', {
      cx: 24,
      cy: 18,
      rx: 28,
      ry: 26,
      base: 2.3,
      k: 1.6,
      rim: 3,
      tex: (x, y, t) =>
        hash(Math.floor(x / 3), Math.floor(y / 3), 92) < 0.2 && (x + y) % 3 === 0 ? t + 1 : t,
    });
    // Crown scales.
    for (const [x, y] of [
      [30, 18],
      [36, 17],
      [42, 18],
      [33, 21],
      [39, 21],
    ] as const)
      marks(g, x, y, ['ab', 'bc'], {
        a: ['turtleskin', 1],
        b: ['turtleskin', 2],
        c: ['turtleskin', 4],
      });
    // The beak: pale horn, the upper hooked down over the lower to a point, the corners turned down.
    const upper = blob([
      [21, 42],
      [29, 37],
      [36, 38],
      [43, 37],
      [51, 42],
      [44, 46],
      [38, 55],
      [36, 56],
      [34, 55],
      [28, 46],
    ]);
    form(g, upper, 'cream', { cx: 28, cy: 37, rx: 16, ry: 14, base: 1.7, k: 1.5, rim: 2 });
    const lower = blob([
      [23, 49],
      [31, 50],
      [36, 57],
      [41, 50],
      [49, 49],
      [44, 55],
      [36, 60],
      [28, 55],
    ]);
    form(g, lower, 'cream', { cx: 28, cy: 49, rx: 14, ry: 10, base: 3, k: 1.1, rim: 1 });
    stroke(
      g,
      [
        [19, 50],
        [23, 46],
        [29, 47],
        [34, 55],
        [36, 57],
        [38, 55],
        [43, 47],
        [49, 46],
        [53, 50],
      ],
      'shade',
      2,
    );
    put(g, 33, 41, cell('shade', 3));
    put(g, 39, 41, cell('shade', 3));
    put(g, 32, 40, cell('cream', 0));
    // Eyes: gold balls with a dark slot of a pupil, the lid drawn down at a slant to the middle.
    for (const [ex, side] of [
      [23, 1],
      [49, -1],
    ] as const) {
      const ball = (x: number, y: number) => Math.hypot(x + 0.5 - ex, (y + 0.5 - 31) * 1.15) < 4.2;
      form(g, ball, 'gold', {
        cx: ex - 3,
        cy: 28,
        rx: 7,
        ry: 7,
        base: 1.6,
        k: 1.2,
        rim: 1,
        lo: 0,
        hi: 4,
      });
      for (let y = 28; y <= 34; y++) put(g, ex + side, y, cell('eye', 4));
      put(g, ex - 2, 30, cell('eye', 0));
      const lid = (x: number, y: number) =>
        ball(x, y) && y + 0.5 < 30.2 + (x + 0.5 - ex) * side * 0.7;
      form(g, lid, 'turtleskin', { cx: ex - 4, cy: 26, rx: 8, ry: 8, base: 2.6, k: 1.2, rim: 1 });
      for (let x = ex - 5; x <= ex + 5; x++)
        for (let y = 26; y <= 35; y++)
          if (ball(x, y) && !lid(x, y) && lid(x, y - 1)) put(g, x, y, cell('turtleskin', 5));
      // The brow: a heavy ledge over it, sloping down to the middle, its top lit.
      const b0 = 25 - side * 0;
      stroke(
        g,
        [
          [ex - 6 * side, b0 - 1],
          [ex, b0 + 1],
          [ex + 6 * side, b0 + 4],
        ],
        'turtleskin',
        5,
      );
      stroke(
        g,
        [
          [ex - 6 * side, b0 - 2],
          [ex, b0],
          [ex + 6 * side, b0 + 3],
        ],
        'turtleskin',
        1,
      );
      stroke(
        g,
        [
          [ex - 5 * side, b0 - 3],
          [ex + 1 * side, b0 - 1],
        ],
        'turtleskin',
        0,
      );
    }
    // Wrinkles round the eyes and across the cheeks, folds of age.
    for (const pts of [
      [
        [13, 36],
        [17, 39],
      ],
      [
        [59, 36],
        [55, 39],
      ],
      [
        [14, 42],
        [19, 45],
      ],
      [
        [58, 42],
        [53, 45],
      ],
      [
        [27, 35],
        [31, 36],
      ],
      [
        [45, 35],
        [41, 36],
      ],
    ] as const)
      stroke(g, pts, 'turtleskin', 4);
    // Wattles under the chin.
    for (const [x, len] of [
      [30, 4],
      [42, 3],
    ] as const)
      for (let i = 0; i < len; i++) put(g, x, 57 + i, cell('turtleskin', i === len - 1 ? 4 : 2));
    // The old hook in the corner of his mouth, and its snapped line hanging.
    marks(g, 50, 46, ['.ab', 'a..', 'a.c', '.aa'], {
      a: ['iron', 2],
      b: ['iron', 0],
      c: ['iron', 3],
    });
    stroke(
      g,
      [
        [53, 50],
        [57, 56],
        [60, 62],
      ],
      'sail',
      2,
    );
  },
};

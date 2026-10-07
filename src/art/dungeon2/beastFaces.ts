/**
 * Creatures' portraits redrawn in B11 where the first scale's had more
 * character than B10a's: the crabs' furious eyes on their stalks and their
 * raised claws, the troll's great tusks and ears, the parrot's big ringed
 * eye. The rest of the creatures stay in faces2.ts.
 */
import { hash, put, type TGrid } from '../town2/cells';
import { cell } from './cave';
import { blob, cast, form, marks, stroke, type Pts } from './heads';
import { mass } from './beasts';
import type { FaceDef } from './folkFaces';
import { rod } from './kit';

/**
 * A crab's eye on its stalk: a white ball with a dark pupil glaring toward
 * the middle, the lid drawn down across it at a slant toward the middle (a
 * furious brow), the stalk under it lit on the near side.
 */
function stalkEye(
  g: TGrid,
  o: { x0: number; y0: number; x: number; y: number; r: number; w: number; side: -1 | 1 },
): void {
  rod(g, o.x0, o.y0, o.x, o.y + o.r - 1, o.w, 'crab', [2, 3, 4]);
  const ball = (x: number, y: number) => Math.hypot(x + 0.5 - o.x, (y + 0.5 - o.y) * 1.05) < o.r;
  form(g, ball, 'sail', {
    cx: o.x - o.r * 0.6,
    cy: o.y - o.r * 0.6,
    rx: o.r * 1.6,
    ry: o.r * 1.6,
    base: 0.8,
    k: 1,
    rim: 2,
    lo: 0,
    hi: 3,
  });
  // The pupil, low and toward the middle: glaring at you.
  const px = o.x - o.side * Math.round(o.r * 0.25);
  const py = o.y + Math.round(o.r * 0.2);
  const pr = Math.max(1.6, o.r * 0.42);
  const pupil = (x: number, y: number) => Math.hypot(x + 0.5 - px, y + 0.5 - py) < pr;
  form(g, pupil, 'eye', { cx: px, cy: py, rx: pr, ry: pr, base: 4, k: 0, rim: 1, lo: 4, hi: 4 });
  put(g, Math.round(px - pr * 0.4), Math.round(py - pr * 0.4), cell('eye', 0));
  // The lid: the shell drawn down over the top, slanting to the middle.
  const lid = (x: number, y: number) =>
    ball(x, y) && y + 0.5 < o.y - o.r * 0.15 + (x + 0.5 - o.x) * -o.side * 0.55;
  form(g, lid, 'crab', {
    cx: o.x - o.r,
    cy: o.y - o.r,
    rx: o.r * 2,
    ry: o.r * 2,
    base: 2,
    k: 1.4,
    rim: 1,
  });
  // The lid's hard edge.
  for (let x = Math.floor(o.x - o.r); x <= Math.ceil(o.x + o.r); x++) {
    for (let y = Math.floor(o.y - o.r); y <= Math.ceil(o.y + o.r); y++)
      if (ball(x, y) && !lid(x, y) && lid(x, y - 1)) put(g, x, y, cell('crab', 5));
  }
}

/** A claw raised, its pincer open: the fixed finger and the moving one, shell lit and nicked. */
function claw(g: TGrid, pts: Pts, finger: Pts, base = 2.3): void {
  form(g, blob(pts), 'crab', {
    cx: pts[0]![0] - 6,
    cy: pts[0]![1] - 10,
    rx: 16,
    ry: 16,
    base,
    k: 1.6,
    rim: 3,
  });
  form(g, blob(finger), 'crab', {
    cx: finger[0]![0] - 4,
    cy: finger[0]![1] - 6,
    rx: 10,
    ry: 10,
    base: base + 0.2,
    k: 1.6,
    rim: 2,
  });
  cast(g, blob(finger), { n: 1, on: ['crab'] });
}

/**
 * The sand crab: furious eyes on stalks, its near claw raised and open, the
 * far one wagged at you, a small cross mouth: a crab with opinions.
 */
export const SAND_CRAB: FaceDef = {
  disc: 'deep',
  draw(g) {
    claw(
      g,
      [
        [14, 46],
        [6, 36],
        [4, 22],
        [9, 14],
        [16, 20],
        [17, 34],
        [22, 44],
      ],
      [
        [12, 16],
        [17, 6],
        [22, 4],
        [20, 12],
        [17, 22],
      ],
    );
    claw(
      g,
      [
        [56, 50],
        [62, 40],
        [66, 30],
        [70, 34],
        [69, 44],
        [62, 54],
      ],
      [
        [65, 31],
        [60, 24],
        [62, 20],
        [67, 26],
        [69, 33],
      ],
      2.8,
    );
    mass(g, 36, 58, 30, 15, 'crab', { base: 2.8, tex: 'shell', k: 2.2 });
    stalkEye(g, { x0: 29, y0: 50, x: 26, y: 31, r: 7, w: 4, side: -1 });
    stalkEye(g, { x0: 43, y0: 50, x: 46, y: 31, r: 7, w: 4, side: 1 });
    // A small cross mouth, scowling.
    marks(g, 32, 56, ['a.....a', '.aaaaa.', 'a.....a'], { a: ['crab', 5] });
  },
};

/**
 * The giant crab: a shell like an upturned boat, barnacled and weedy, both
 * great claws raised, eyes on thick stalks glaring under hard lids, one
 * scarred: big, old and very cross.
 */
export const GIANT_CRAB: FaceDef = {
  disc: 'deep',
  discStep: 6,
  draw(g) {
    claw(
      g,
      [
        [12, 52],
        [3, 40],
        [1, 24],
        [6, 12],
        [14, 16],
        [16, 32],
        [22, 46],
      ],
      [
        [9, 14],
        [13, 3],
        [19, 0],
        [18, 8],
        [15, 18],
      ],
    );
    claw(
      g,
      [
        [60, 52],
        [69, 40],
        [71, 24],
        [66, 12],
        [58, 16],
        [56, 32],
        [50, 46],
      ],
      [
        [63, 14],
        [59, 3],
        [53, 0],
        [54, 8],
        [57, 18],
      ],
      2.9,
    );
    mass(g, 36, 62, 34, 18, 'crab', { base: 2.9, tex: 'shell', k: 2.2, k2: 4 });
    // Barnacles in clumps on the shell, weed hanging from its rim.
    for (const [x, y] of [
      [10, 54],
      [14, 51],
      [19, 50],
      [52, 50],
      [57, 52],
      [61, 55],
      [30, 49],
    ] as const)
      marks(g, x, y, ['.ab.', 'abbc', '.cc.'], {
        a: ['cavesand', 0],
        b: ['cavesand', 2],
        c: ['caverock', 5],
      });
    for (let i = 0; i < 7; i++) rod(g, 8 + i * 9, 63, 7 + i * 9 + (i % 2), 71, 2, 'weed', [3, 4]);
    stalkEye(g, { x0: 27, y0: 52, x: 24, y: 28, r: 9, w: 6, side: -1 });
    stalkEye(g, { x0: 45, y0: 52, x: 48, y: 28, r: 9, w: 6, side: 1 });
    // A scar across the far lid.
    stroke(
      g,
      [
        [43, 18],
        [53, 30],
      ],
      'cream',
      2,
    );
    // Mouthparts working, in a scowl.
    marks(
      g,
      27,
      58,
      ['a................a', '.aaaaaaaaaaaaaaaa.', '.abcbcbcbcbcbcbca.', '..aaaaaaaaaaaaaa..'],
      { a: ['crab', 5], b: ['crab', 2], c: ['shade', 2] },
    );
  },
};

/**
 * The marsh troll: a broad low head sunk in boulder shoulders, ears out
 * like jug handles, a brow like a ledge over small mean eyes, a lump of a
 * nose and two great tusks up out of an underbite; weed for hair.
 */
export const TROLL: FaceDef = {
  disc: 'pine',
  draw(g) {
    const body = blob([
      [-4, 74],
      [-2, 54],
      [12, 44],
      [60, 44],
      [74, 54],
      [76, 74],
    ]);
    form(g, body, 'troll', { cx: 20, cy: 44, rx: 40, ry: 24, base: 2.8, k: 1.4, rim: 6 });
    for (const [x, y, r] of [
      [10, 54, 5],
      [62, 52, 4],
      [20, 48, 3],
    ] as const)
      form(
        g,
        blob([
          [x - r, y],
          [x, y - r * 0.8],
          [x + r, y],
          [x, y + r * 0.6],
        ]),
        'moss',
        {
          cx: x - r,
          cy: y - r,
          rx: r * 2,
          ry: r * 2,
          base: 2.2,
          k: 1.6,
          rim: 2,
        },
      );
    // Ears out to the sides, long and pointed, drooping at the tips.
    for (const [pts, base] of [
      [
        [
          [16, 24],
          [6, 20],
          [0, 22],
          [3, 28],
          [10, 34],
          [16, 36],
        ],
        2.4,
      ],
      [
        [
          [56, 24],
          [66, 20],
          [72, 22],
          [69, 28],
          [62, 34],
          [56, 36],
        ],
        3,
      ],
    ] as const) {
      const e = blob(pts);
      form(g, e, 'troll', { cx: 2, cy: 18, rx: 40, ry: 16, base, k: 1.4, rim: 2 });
    }
    stroke(
      g,
      [
        [4, 24],
        [10, 28],
        [15, 30],
      ],
      'troll',
      4,
    );
    stroke(
      g,
      [
        [68, 24],
        [62, 28],
        [57, 30],
      ],
      'troll',
      5,
    );
    // The head: broad and low, wider at the jaw than the crown.
    const head = blob([
      [36, 7],
      [48, 9],
      [56, 16],
      [59, 28],
      [60, 40],
      [55, 49],
      [44, 53],
      [28, 53],
      [17, 49],
      [12, 40],
      [13, 28],
      [16, 16],
      [24, 9],
    ]);
    form(g, head, 'troll', {
      cx: 30,
      cy: 18,
      rx: 26,
      ry: 26,
      base: 2.1,
      k: 1.5,
      rim: 4,
      tex: (x, y, t) => {
        const pit = hash(Math.floor(x / 3), Math.floor(y / 3), 77);
        return t + (pit < 0.06 ? 1 : 0);
      },
    });
    // The brow, a ledge over the eyes, a crease above the nose.
    const brow = blob([
      [14, 23],
      [24, 17],
      [36, 21],
      [48, 17],
      [58, 23],
      [57, 27],
      [36, 26],
      [15, 27],
    ]);
    form(g, brow, 'troll', { cx: 20, cy: 16, rx: 24, ry: 8, base: 1.6, k: 1.5, rim: 2 });
    cast(g, brow, { n: 2, dx: 0, dy: 2, on: ['troll'] });
    // Small yellow eyes, mean, deep under it.
    marks(g, 21, 27, ['KKKKKKK.', 'KabbKcK.', '.KKKKK..'], {
      K: ['troll', 6],
      a: ['gold', 0],
      b: ['gold', 1],
      c: ['eye', 4],
    });
    marks(g, 43, 27, ['.KKKKKKK', '.KcKbbaK', '..KKKKK.'], {
      K: ['troll', 6],
      a: ['gold', 1],
      b: ['gold', 1],
      c: ['eye', 4],
    });
    // The nose: a great lump with flared nostrils.
    const nose = blob([
      [34, 27],
      [39, 27],
      [42, 33],
      [44, 38],
      [39, 40],
      [33, 40],
      [28, 38],
      [31, 32],
    ]);
    form(g, nose, 'troll', { cx: 31, cy: 28, rx: 10, ry: 10, base: 1.6, k: 1.6, rim: 2 });
    cast(g, nose, { n: 1, on: ['troll'] });
    marks(g, 31, 38, ['aa....aa', '.a....a.'], { a: ['troll', 5] });
    // The underbite: the jaw jutting, its line, and two great tusks up past the lip.
    const jaw = blob([
      [17, 42],
      [36, 44],
      [55, 42],
      [56, 48],
      [46, 53],
      [26, 53],
      [16, 48],
    ]);
    form(g, jaw, 'troll', { cx: 20, cy: 42, rx: 30, ry: 10, base: 2.4, k: 1.4, rim: 2 });
    stroke(
      g,
      [
        [18, 43],
        [28, 45],
        [44, 45],
        [54, 43],
      ],
      'shade',
      3,
    );
    for (const [tx, flip] of [
      [20, false],
      [46, true],
    ] as const) {
      const rows = ['..a.', '.aab', '.abb', 'aabb', 'aabb', 'abbc', 'abbc', 'bbcc', '.bc.'];
      marks(g, tx, 36, flip ? rows.map((r) => [...r].reverse().join('')) : rows, {
        a: ['cream', 0],
        b: ['cream', 1],
        c: ['cream', 3],
      });
    }
    // Lower teeth, stubby, between the tusks.
    marks(g, 29, 44, ['a.a..a.a..a.', 'b.b..b.b..b.'], { a: ['cream', 1], b: ['cream', 3] });
    // Weed hanging from his crown like hair, in clumps.
    for (const [x0, n] of [
      [19, 5],
      [25, 7],
      [31, 6],
      [38, 8],
      [44, 6],
      [50, 5],
    ] as const) {
      const clump = blob([
        [x0 - 3, 9],
        [x0, 4],
        [x0 + 4, 8],
        [x0 + 3, 9 + n],
        [x0, 11 + n],
        [x0 - 2, 9 + n],
      ]);
      form(g, clump, 'weed', { cx: x0 - 3, cy: 4, rx: 6, ry: 8, base: 2.4, k: 1.4, rim: 1 });
    }
  },
};

/**
 * The ship's parrot: side on, a big round eye in its bare white face with a
 * brow pulled down over it, its hooked beak open in a squawk: loud, and
 * pleased about it.
 */
export const PARROT: FaceDef = {
  disc: 'blue',
  draw(g) {
    const wing = blob([
      [4, 74],
      [6, 56],
      [18, 46],
      [34, 48],
      [46, 58],
      [50, 74],
    ]);
    form(g, wing, 'grass', {
      cx: 10,
      cy: 46,
      rx: 30,
      ry: 20,
      base: 2.4,
      k: 1.4,
      rim: 4,
      tex: (x, y, t) => t + ((y + Math.floor(x / 5)) % 4 === 0 ? 1 : 0),
    });
    for (let y = 60; y < 72; y++)
      for (let x = 4; x < 11; x++) if (g.d[y * 72 + x]) put(g, x, y, cell('blue', 2 + (y % 2)));
    const head = blob([
      [12, 30],
      [16, 18],
      [26, 10],
      [38, 9],
      [46, 14],
      [50, 22],
      [50, 34],
      [44, 46],
      [32, 52],
      [20, 50],
      [13, 42],
    ]);
    form(g, head, 'crimson', {
      cx: 22,
      cy: 12,
      rx: 26,
      ry: 26,
      base: 1.8,
      k: 1.5,
      rim: 4,
      tex: (x, y, t) => t + ((x + y * 2) % 6 === 0 && y > 22 ? 1 : 0),
    });
    // The bare white face round the eye, with its fine lines of feathers.
    const face = blob([
      [30, 22],
      [36, 16],
      [44, 17],
      [49, 24],
      [47, 33],
      [40, 36],
      [32, 32],
    ]);
    form(g, face, 'sail', { cx: 32, cy: 16, rx: 14, ry: 14, base: 1, k: 1, rim: 2, lo: 0 });
    for (const pts of [
      [
        [32, 30],
        [36, 33],
        [40, 34],
      ],
      [
        [31, 25],
        [33, 28],
      ],
    ] as const)
      stroke(g, pts, 'stone', 3);
    // A big round eye: a gold ring, a black pupil, a catch-light; the brow drawn down over it.
    marks(
      g,
      34,
      19,
      [
        '..aaaa..',
        '.abbbba.',
        'abccccba',
        'abcKKcba',
        'abcKKcba',
        'abccccba',
        '.abbbba.',
        '..aaaa..',
      ],
      { a: ['stone', 4], b: ['gold', 1], c: ['gold', 2], K: ['eye', 4] },
    );
    put(g, 37, 22, cell('eye', 0));
    stroke(
      g,
      [
        [32, 18],
        [37, 17],
        [44, 19],
      ],
      'crimson',
      5,
    );
    stroke(
      g,
      [
        [33, 17],
        [38, 16],
        [43, 17],
      ],
      'crimson',
      4,
    );
    // The great hooked beak, open in a squawk: pale upper hooked over a dark lower.
    const upper = blob([
      [46, 18],
      [56, 17],
      [64, 22],
      [67, 31],
      [63, 38],
      [60, 32],
      [54, 28],
      [47, 30],
    ]);
    form(g, upper, 'sail', { cx: 48, cy: 16, rx: 16, ry: 14, base: 2.2, k: 1.5, rim: 2 });
    cast(g, upper, { n: 1, on: ['tar', 'crimson'] });
    const lower = blob([
      [47, 34],
      [55, 34],
      [59, 40],
      [54, 44],
      [48, 41],
    ]);
    form(g, lower, 'tar', { cx: 48, cy: 34, rx: 10, ry: 8, base: 2.8, k: 1.3, rim: 2 });
    marks(g, 50, 31, ['aaaa', 'abba', '.aa.'], { a: ['shade', 4], b: ['crimson', 4] });
  },
};

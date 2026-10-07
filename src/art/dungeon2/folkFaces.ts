/**
 * The people's portraits at the C scale (B11), each drawn by hand as its own
 * head: its own shape as a ring of points, its own eyes, brows, nose and
 * mouth as rows of characters, hair and beards as solid masses with a few
 * deliberate locks. A face fills the frame as the first scale's did (a head
 * about 40 pixels across on the 72 square), with eyes big enough to carry an
 * expression (lids, a centred iris, a catch-light) and one expression per
 * person that says who they are.
 */
import { put, type TGrid } from '../town2/cells';
import { cell } from './cave';
import type { Mat2 as Mat } from './cave';
import { blob, cast, either, form, marks, pinsFor, stroke, tone, without, type Pts } from './heads';
import { rod } from './kit';

export type Painter = (g: TGrid) => void;

export interface FaceDef {
  readonly disc: Mat;
  readonly discStep?: number;
  readonly draw: Painter;
}

/** Locks drawn as strokes, each a list of points. */
function locks(g: TGrid, list: readonly Pts[], mat: Mat, step: number): void {
  for (const pts of list) stroke(g, pts, mat, step);
}

/** Single lit pixels: the tips of locks, a glint. */
function dots(g: TGrid, list: Pts, mat: Mat, step: number): void {
  for (const [x, y] of list) put(g, x, y, cell(mat, step));
}

/**
 * A tricorn seen from the front: the crown, and the brim cocked up into
 * three points, the front one dipping over the brow in a V and the two at
 * the sides standing up past the crown, braid along its upper edge. `low`
 * sets it lower on a bigger head.
 */
function tricorn(
  g: TGrid,
  o: { trim: Mat; on: readonly Mat[]; skull?: boolean; low?: number },
): void {
  const d = o.low ?? 0;
  const crown = blob([
    [19, 14 + d],
    [21, 3 + d],
    [36, 0 + d],
    [51, 3 + d],
    [53, 14 + d],
  ]);
  form(g, crown, 'felt', { cx: 28, cy: 1, rx: 22, ry: 12, base: 2.5, k: 1.4, rim: 3 });
  const top: Pts = [
    [0, 1 + d],
    [9, 6 + d],
    [20, 11 + d],
    [36, 16 + d],
    [52, 11 + d],
    [63, 6 + d],
    [72, 1 + d],
  ];
  const band = blob([
    ...top,
    [71, 7 + d],
    [62, 12 + d],
    [50, 18 + d],
    [36, 23 + d],
    [22, 18 + d],
    [10, 12 + d],
    [1, 7 + d],
  ]);
  form(g, band, 'felt', { cx: 26, cy: 8 + d, rx: 36, ry: 12, base: 2.4, k: 1.5, rim: 2 });
  stroke(g, top, o.trim, 1);
  stroke(
    g,
    top.map(([x, y]) => [x, y + 1] as const),
    o.trim,
    3,
  );
  if (o.skull)
    marks(g, 33, 4 + d, ['.aaa.', 'aaaaa', 'aKaKa', '.aaa.', 'b.a.b', '.b.b.'], {
      a: ['plaster', 1],
      K: ['felt', 6],
      b: ['plaster', 3],
    });
  cast(g, band, { n: 1, dx: 1, dy: 2, on: o.on });
}

/* ------------------------------------------------------------ the smith */

/**
 * The smith: a broad bald dome with a shine, a great square chestnut beard
 * and moustache, heavy brows drawn level and low, steady eyes: proud of his
 * work and not to be hurried. His leather apron over a grey shirt.
 */
export const SMITH: FaceDef = {
  disc: 'fire',
  discStep: 6,
  draw(g) {
    const P = pinsFor({ skin: 'skin', hair: 'chestnut', browShift: 1, iris: ['slate', 2, 4] });
    const body = blob([
      [-4, 74],
      [-2, 62],
      [8, 55],
      [22, 51],
      [50, 51],
      [64, 55],
      [74, 62],
      [76, 74],
    ]);
    form(g, body, 'cloth', { cx: 30, cy: 52, rx: 40, ry: 20, base: 2.4, k: 1.3, rim: 4 });
    // The apron's bib, and its strap over the near shoulder.
    const bib = blob([
      [22, 72],
      [24, 60],
      [34, 57],
      [46, 58],
      [52, 72],
    ]);
    form(g, bib, 'leather', { cx: 30, cy: 58, rx: 18, ry: 14, base: 2.2, k: 1.2, rim: 2 });
    const strap = blob([
      [14, 53],
      [19, 51],
      [26, 61],
      [22, 63],
    ]);
    form(g, strap, 'leather', { cx: 16, cy: 52, rx: 8, ry: 8, base: 2, k: 1, rim: 1 });
    cast(g, either(bib, strap), { n: 1, on: ['cloth'] });
    const neckS = blob([
      [24, 44],
      [48, 44],
      [50, 56],
      [36, 58],
      [22, 56],
    ]);
    form(g, neckS, 'skin', { cx: 30, cy: 46, rx: 16, ry: 12, base: 3, k: 1, rim: 2 });
    const earS = blob([
      [17, 26],
      [13, 27],
      [11, 31],
      [12, 36],
      [15, 40],
      [18, 39],
    ]);
    form(g, earS, 'skin', { cx: 13, cy: 30, rx: 5, ry: 8, base: 2.4, k: 1.2, rim: 2 });
    marks(g, 13, 30, ['33', '4.', '43', '.3'], P);
    // The head: a broad dome, wide at the temples, a heavy jaw.
    const head = blob([
      [35, 5],
      [45, 7],
      [52, 13],
      [55, 22],
      [55, 32],
      [53, 41],
      [48, 49],
      [40, 53],
      [31, 53],
      [23, 49],
      [17, 41],
      [15, 31],
      [16, 20],
      [21, 11],
      [27, 7],
    ]);
    form(g, head, 'skin', { cx: 32, cy: 22, rx: 22, ry: 26, base: 1.9, k: 1.4, rim: 4, rimK: 0.8 });
    // The shine on his crown; two lines across the brow from a life of squinting at iron.
    marks(g, 25, 9, ['..00', '.000.', '000', '00'], P);
    marks(g, 29, 15, ['..3333333..', '33.......33'], P);
    // Brows: thick, level, low over the eyes, a crease between.
    marks(g, 22, 20, ['...bBBBBBb', '.bBBBBBBBB', 'BBBBBBBBB.', 'Bb.......'], P);
    marks(g, 41, 20, ['bBBBBBb..', 'BBBBBBBBb', '.BBBBBBBBB', '........bB'], P);
    marks(g, 37, 22, ['3', '4', '3'], P);
    // Eyes: steady, the lids heavy, the iris centred under the lash.
    marks(
      g,
      24,
      25,
      ['.33333333', '.KKKKKKK.', 'KKwCIiwWK', '.WWIKiWW.', '..wiiiw..', '...333...'],
      P,
    );
    marks(g, 42, 25, ['3333333.', 'KKKKKKK.', 'KwCIiwKK', '.WIKiW..', '.wiiiw..', '..333...'], P);
    // The nose: broad, lit down its near side, a shadow under it.
    marks(
      g,
      34,
      28,
      ['..12..', '..123.', '..123.', '..1234', '.11234', '1102344', '2233344', '.34445'],
      P,
    );
    // The beard: a square solid mass from ear to ear, shaded as one thing.
    const beardS = blob([
      [17, 35],
      [22, 41],
      [29, 43],
      [37, 42],
      [46, 43],
      [52, 39],
      [55, 34],
      [56, 44],
      [54, 55],
      [47, 62],
      [37, 65],
      [26, 63],
      [19, 56],
      [16, 46],
    ]);
    form(g, beardS, 'chestnut', {
      cx: 30,
      cy: 44,
      rx: 22,
      ry: 22,
      base: 2.8,
      k: 1.3,
      rim: 4,
      rimK: 1,
    });
    locks(
      g,
      [
        [
          [23, 48],
          [24, 55],
          [27, 60],
        ],
        [
          [31, 52],
          [32, 59],
          [33, 63],
        ],
        [
          [42, 52],
          [42, 58],
          [40, 63],
        ],
        [
          [49, 46],
          [49, 53],
          [46, 59],
        ],
      ],
      'chestnut',
      4,
    );
    dots(
      g,
      [
        [22, 47],
        [30, 51],
        [41, 51],
        [48, 45],
        [20, 42],
      ],
      'chestnut',
      1,
    );
    // The moustache, over the mouth, drooping at the ends.
    const tache = blob([
      [26, 44],
      [31, 40],
      [37, 41],
      [43, 40],
      [49, 44],
      [47, 47],
      [41, 45],
      [33, 45],
      [27, 48],
    ]);
    form(g, tache, 'chestnut', { cx: 33, cy: 40, rx: 14, ry: 6, base: 2.3, k: 1.3, rim: 2 });
    cast(g, tache, { n: 1, on: ['chestnut'] });
    // His lower lip under it, and the hint of a smile at its ends.
    marks(g, 33, 47, ['.3333.', '432234', '.4444.'], P);
  },
};

/* ----------------------------------------------------------- the trader */

/**
 * The trader: a heart-shaped face under a green headscarf, auburn curls
 * spilling out round it, green eyes half-lidded over a knowing smile, one
 * brow up: she knows what it is worth and what you will pay.
 */
export const TRADER: FaceDef = {
  disc: 'violet',
  draw(g) {
    const P = pinsFor({ skin: 'skin', hair: 'auburn', browShift: 1, iris: ['mossdye', 1, 3] });
    // Curls behind the head and onto the shoulders.
    const back = blob([
      [12, 26],
      [18, 14],
      [36, 9],
      [54, 14],
      [60, 28],
      [61, 44],
      [58, 60],
      [50, 63],
      [47, 50],
      [26, 50],
      [22, 63],
      [13, 60],
      [10, 44],
    ]);
    form(g, back, 'auburn', {
      cx: 26,
      cy: 28,
      rx: 30,
      ry: 30,
      base: 2.9,
      k: 1.2,
      rim: 3,
      tex: (x, y, t) =>
        t + ((Math.floor((x + y * 0.3) / 3) + Math.floor(y / 6)) % 3 === 0 ? 0.7 : 0),
    });
    const body = blob([
      [-2, 74],
      [2, 65],
      [14, 58],
      [27, 55],
      [45, 55],
      [58, 58],
      [70, 65],
      [74, 74],
    ]);
    form(g, body, 'violet', { cx: 28, cy: 56, rx: 36, ry: 18, base: 2.4, k: 1.3, rim: 3 });
    const chemise = blob([
      [27, 56],
      [45, 56],
      [40, 66],
      [36, 68],
      [32, 66],
    ]);
    form(g, chemise, 'cream', { cx: 32, cy: 58, rx: 10, ry: 8, base: 1.6, k: 1, rim: 1 });
    stroke(
      g,
      [
        [27, 57],
        [33, 60],
        [39, 60],
        [45, 57],
      ],
      'cream',
      3,
    );
    const neckS = blob([
      [29, 44],
      [43, 44],
      [43, 56],
      [36, 59],
      [29, 56],
    ]);
    form(g, neckS, 'skin', { cx: 32, cy: 46, rx: 10, ry: 12, base: 2.6, k: 1, rim: 2 });
    // The head: wide at the cheekbones, a small pointed chin.
    const head = blob([
      [36, 10],
      [46, 12],
      [53, 19],
      [55, 28],
      [53, 37],
      [48, 45],
      [40, 51],
      [34, 51],
      [27, 46],
      [21, 38],
      [18, 28],
      [20, 18],
      [27, 12],
    ]);
    form(g, head, 'skin', { cx: 33, cy: 24, rx: 20, ry: 24, base: 1.8, k: 1.3, rim: 3 });
    cast(g, head, { n: 1, dx: 0, dy: 2, on: ['skin'] });
    // A fringe under the scarf's edge.
    const fringe = blob([
      [20, 21],
      [26, 15],
      [38, 14],
      [50, 15],
      [55, 21],
      [50, 21],
      [45, 18],
      [40, 21],
      [34, 18],
      [27, 22],
    ]);
    form(g, fringe, 'auburn', { cx: 30, cy: 14, rx: 20, ry: 8, base: 2.2, k: 1.2, rim: 2 });
    cast(g, fringe, { n: 1, dx: 1, dy: 1, on: ['skin'] });
    // The headscarf, tied at the back, its ends hanging behind her near ear.
    const scarf = blob([
      [13, 22],
      [15, 11],
      [24, 4],
      [37, 2],
      [51, 5],
      [58, 13],
      [58, 21],
      [53, 17],
      [44, 14],
      [34, 14],
      [24, 16],
      [17, 22],
    ]);
    form(g, scarf, 'mossdye', {
      cx: 26,
      cy: 6,
      rx: 26,
      ry: 14,
      base: 2.3,
      k: 1.4,
      rim: 3,
    });
    locks(
      g,
      [
        [
          [22, 8],
          [30, 6],
          [38, 7],
        ],
        [
          [44, 6],
          [52, 10],
          [55, 15],
        ],
        [
          [17, 15],
          [23, 12],
          [31, 10],
        ],
      ],
      'mossdye',
      4,
    );
    const knot = blob([
      [8, 22],
      [14, 19],
      [17, 24],
      [14, 28],
      [9, 27],
    ]);
    form(g, knot, 'mossdye', { cx: 10, cy: 21, rx: 6, ry: 6, base: 2.2, k: 1.4, rim: 2 });
    marks(g, 6, 27, ['.aa.', 'aab.', 'ab..', 'b...', 'b...'], {
      a: ['mossdye', 2],
      b: ['mossdye', 4],
    });
    // Curls loose at her near cheek.
    for (const [x, y] of [
      [17, 30],
      [15, 36],
      [17, 42],
      [15, 48],
    ] as const) {
      const curl = blob([
        [x - 3, y],
        [x, y - 3],
        [x + 3, y],
        [x + 1, y + 4],
        [x - 2, y + 3],
      ]);
      form(g, curl, 'auburn', { cx: x - 2, cy: y - 2, rx: 4, ry: 4, base: 2.2, k: 1.5, rim: 2 });
    }
    // Brows: the near one easy, the far one lifted.
    marks(g, 23, 21, ['..nbbBBB.', '.bBBb...B', 'bb.......'], P);
    marks(g, 41, 19, ['...bbb..', '.bBB.BBb', 'bB.....B'], P);
    // Eyes: green, half-lidded, the lower lid pushed up by the smile.
    marks(
      g,
      24,
      25,
      ['..33333..', '.KKKKKKK.', 'KKKCIiKKK', '.WWIKiWW.', '..3iii3..', '..23332.'],
      P,
    );
    marks(g, 41, 25, ['.33333..', 'KKKKKKK.', 'KKCIiKKK', 'WWIKiWW.', '.3iii3..', '.23332..'], P);
    // A small straight nose, lit on its near side.
    marks(g, 36, 30, ['.12.', '.12.', '.123', '1123', '2334', '.44.'], P);
    // The smile: closed, the far corner higher, a dimple there.
    marks(g, 30, 40, ['.........44', '4.......43.', '.444444433.', '...2222...'], P);
    put(g, 43, 38, cell('skin', 3));
  },
};

/* ----------------------------------------------------- the town's captain */

/**
 * The captain: his tricorn filling the top of the frame, the patch over his
 * far eye, a black beard trimmed to a point, and a grin with a gold tooth:
 * a rogue who is very pleased with himself.
 */
export const PIRATE: FaceDef = {
  disc: 'teal',
  draw(g) {
    const P = pinsFor({
      skin: 'skingolden',
      hair: 'hairblack',
      browShift: 1,
      iris: ['wood', 3, 5],
    });
    const body = blob([
      [-4, 74],
      [-2, 64],
      [10, 57],
      [24, 54],
      [48, 54],
      [62, 57],
      [74, 64],
      [76, 74],
    ]);
    form(g, body, 'crimson', { cx: 28, cy: 56, rx: 38, ry: 18, base: 2.5, k: 1.3, rim: 3 });
    // The shirt at his throat, the coat's gold buttons, his epaulettes.
    const shirt = blob([
      [29, 55],
      [43, 55],
      [40, 72],
      [32, 72],
    ]);
    form(g, shirt, 'cream', { cx: 30, cy: 56, rx: 10, ry: 10, base: 1.8, k: 1, rim: 1 });
    for (const [x, y] of [
      [26, 62],
      [27, 68],
      [46, 62],
      [45, 68],
    ] as const)
      marks(g, x, y, ['gg', 'gG'], P);
    for (const [cx, dir] of [
      [11, -1],
      [61, 1],
    ] as const) {
      const ep = blob([
        [cx - 9, 59],
        [cx - 4, 55],
        [cx + 5, 55],
        [cx + 9, 59],
        [cx + 4, 61],
        [cx - 5, 61],
      ]);
      form(g, ep, 'gold', { cx: cx - 4, cy: 54, rx: 10, ry: 5, base: 2, k: 1.4, rim: 2 });
      for (let i = 0; i < 5; i++)
        stroke(
          g,
          [
            [cx - 6 + i * 3, 61],
            [cx - 6 + i * 3 + dir, 64],
          ],
          'gold',
          3,
        );
    }
    const neckS = blob([
      [27, 44],
      [45, 44],
      [45, 56],
      [36, 58],
      [27, 56],
    ]);
    form(g, neckS, 'skingolden', { cx: 30, cy: 46, rx: 12, ry: 12, base: 3, k: 1, rim: 2 });
    // The near ear with its gold ring.
    const earS = blob([
      [18, 26],
      [14, 28],
      [13, 33],
      [15, 38],
      [19, 38],
    ]);
    form(g, earS, 'skingolden', { cx: 14, cy: 30, rx: 5, ry: 8, base: 2.3, k: 1.2, rim: 2 });
    marks(g, 15, 31, ['3', '4', '3'], P);
    marks(g, 13, 38, ['.g.', 'g.G', '.G.'], P);
    const head = blob([
      [36, 11],
      [48, 13],
      [54, 20],
      [55, 30],
      [53, 40],
      [48, 48],
      [40, 52],
      [32, 52],
      [24, 48],
      [19, 40],
      [17, 30],
      [19, 20],
      [26, 13],
    ]);
    form(g, head, 'skingolden', { cx: 32, cy: 24, rx: 20, ry: 24, base: 1.9, k: 1.4, rim: 3 });
    // The beard, cut to a point, and the moustache curled up at its ends.
    const beardS = blob([
      [19, 37],
      [24, 44],
      [30, 46],
      [36, 45],
      [43, 46],
      [49, 43],
      [54, 36],
      [54, 46],
      [48, 55],
      [40, 62],
      [36, 66],
      [31, 61],
      [23, 53],
    ]);
    form(g, beardS, 'hairblack', {
      cx: 28,
      cy: 44,
      rx: 18,
      ry: 18,
      base: 2.6,
      k: 1.4,
      rim: 3,
    });
    locks(
      g,
      [
        [
          [27, 50],
          [31, 57],
          [34, 62],
        ],
        [
          [42, 50],
          [40, 57],
          [37, 62],
        ],
      ],
      'hairblack',
      4,
    );
    dots(
      g,
      [
        [25, 47],
        [33, 52],
        [45, 48],
      ],
      'hairblack',
      1,
    );
    // The grin: wide, open, a gold tooth among the white.
    marks(
      g,
      27,
      41,
      ['4..........4', '444444444444', '4TTTTgTTTTt4', '.4TTTTTTTt4.', '..44444444..'],
      P,
    );
    const tache = blob([
      [22, 40],
      [26, 37],
      [32, 38],
      [37, 39],
      [43, 38],
      [49, 37],
      [53, 39],
      [50, 41],
      [43, 41],
      [37, 41],
      [31, 41],
      [25, 42],
    ]);
    form(g, tache, 'hairblack', { cx: 30, cy: 36, rx: 16, ry: 5, base: 2.2, k: 1.4, rim: 1 });
    // The near brow cocked; the eye under it bright.
    marks(g, 21, 20, ['....bBBBB.', '..bBBBBBBB', '.bBBb.....', 'bB........'], P);
    marks(
      g,
      24,
      24,
      ['..33333..', '.KKKKKKK.', 'KKWCIiWWK', '.WWIKiWW.', '..WiiiW..', '...333...'],
      P,
    );
    // The patch over the far eye, its strap across the brow.
    const patch = blob([
      [41, 23],
      [49, 23],
      [51, 28],
      [48, 33],
      [42, 33],
      [40, 28],
    ]);
    form(g, patch, 'felt', { cx: 42, cy: 24, rx: 8, ry: 8, base: 2.6, k: 1.2, rim: 2 });
    stroke(
      g,
      [
        [21, 15],
        [34, 19],
        [42, 24],
      ],
      'felt',
      4,
    );
    stroke(
      g,
      [
        [49, 24],
        [55, 21],
      ],
      'felt',
      4,
    );
    marks(g, 40, 19, ['bBBBBBBBB.', '.bBBBBBBBB'], P);
    // A hooked nose, lit on its near side.
    marks(g, 34, 26, ['.12..', '.12..', '.123.', '.1123', '11234', '22344', '.344.'], P);
    // The tricorn, its brim cocked up into three points, gold braid along the edge.
    tricorn(g, { trim: 'gold', on: ['skingolden', 'hairblack'] });
  },
};

/* ------------------------------------------------------------ the alewife */

/**
 * The alewife: a round, broad, cheerful face, laughing so her eyes have gone
 * to crescents, chestnut hair parted and pulled back into a bun: the first
 * to laugh at your joke and the last to let you leave without paying.
 */
export const ALEWIFE: FaceDef = {
  disc: 'madder',
  draw(g) {
    const P = pinsFor({ skin: 'skinpale', hair: 'chestnut', browShift: 0 });
    // The bun, low at the back.
    const bun = blob([
      [8, 30],
      [12, 22],
      [20, 20],
      [24, 28],
      [22, 38],
      [13, 40],
    ]);
    form(g, bun, 'chestnut', { cx: 12, cy: 24, rx: 10, ry: 10, base: 2.5, k: 1.4, rim: 2 });
    locks(
      g,
      [
        [
          [11, 26],
          [15, 24],
          [19, 26],
        ],
        [
          [10, 32],
          [15, 30],
          [20, 33],
        ],
      ],
      'chestnut',
      4,
    );
    const body = blob([
      [-4, 74],
      [-2, 64],
      [10, 56],
      [24, 52],
      [48, 52],
      [62, 56],
      [74, 64],
      [76, 74],
    ]);
    form(g, body, 'madder', { cx: 26, cy: 54, rx: 40, ry: 18, base: 2.4, k: 1.3, rim: 3 });
    // A cream kerchief folded at her neck.
    const kerchief = blob([
      [24, 53],
      [48, 53],
      [44, 60],
      [36, 66],
      [28, 60],
    ]);
    form(g, kerchief, 'cream', { cx: 28, cy: 54, rx: 14, ry: 8, base: 1.8, k: 1.2, rim: 2 });
    stroke(
      g,
      [
        [30, 56],
        [36, 62],
        [42, 56],
      ],
      'cream',
      3,
    );
    const neckS = blob([
      [27, 46],
      [45, 46],
      [45, 54],
      [36, 56],
      [27, 54],
    ]);
    form(g, neckS, 'skinpale', { cx: 30, cy: 48, rx: 12, ry: 10, base: 2.8, k: 1, rim: 2 });
    // The head: round and broad, full cheeks, a soft double chin.
    const head = blob([
      [35, 10],
      [46, 12],
      [53, 19],
      [56, 29],
      [55, 39],
      [50, 47],
      [42, 52],
      [31, 52],
      [23, 48],
      [18, 40],
      [16, 30],
      [18, 20],
      [25, 13],
    ]);
    form(g, head, 'skinpale', { cx: 32, cy: 24, rx: 22, ry: 26, base: 1.7, k: 1.3, rim: 3 });
    marks(g, 30, 50, ['...3333...', '.33....33.'], P);
    // The near ear, half under the hair.
    const earS = blob([
      [19, 28],
      [15, 30],
      [15, 35],
      [18, 39],
      [20, 37],
    ]);
    form(g, earS, 'skinpale', { cx: 15, cy: 30, rx: 5, ry: 7, base: 2.3, k: 1.2, rim: 2 });
    // Hair parted at the middle, swept back over the ears.
    const hair = blob([
      [17, 30],
      [17, 18],
      [24, 10],
      [36, 7],
      [48, 9],
      [55, 16],
      [57, 26],
      [53, 21],
      [46, 16],
      [39, 14],
      [36, 13],
      [32, 15],
      [26, 18],
      [21, 25],
      [20, 33],
    ]);
    form(g, hair, 'chestnut', {
      cx: 30,
      cy: 8,
      rx: 22,
      ry: 18,
      base: 2.2,
      k: 1.5,
      rim: 2,
    });
    locks(
      g,
      [
        [
          [34, 10],
          [27, 13],
          [21, 20],
          [19, 27],
        ],
        [
          [38, 10],
          [46, 12],
          [52, 17],
        ],
        [
          [30, 9],
          [24, 12],
        ],
      ],
      'chestnut',
      4,
    );
    dots(
      g,
      [
        [26, 11],
        [28, 10],
        [44, 10],
      ],
      'chestnut',
      0,
    );
    cast(g, hair, { n: 1, dx: 1, dy: 1, on: ['skinpale'] });
    // Brows lifted high and round with the laugh.
    marks(g, 23, 21, ['..bbbbb..', '.b.....b.', 'b.......'], P);
    marks(g, 41, 21, ['..bbbbb.', '.b.....b', '........b'], P);
    // Eyes squeezed shut in crescents, creased at their corners.
    marks(g, 23, 27, ['...KKKK...', '.KK....KK.', 'K........K', '.3......3.'], P);
    marks(g, 41, 27, ['..KKKK...', 'KK....KK.', '........K', '.......3.'], P);
    marks(g, 20, 28, ['3', '.', '3'], P);
    marks(g, 51, 28, ['3', '.', '3'], P);
    // Full cheeks pushed up, lit.
    marks(g, 22, 32, ['.1111.', '111111', '.1111.'], P);
    // A round nose with a rosy tip.
    marks(g, 35, 30, ['.12..', '.12..', '1122.', '11223', '22334', '.344.'], {
      ...P,
      ...{ '2': ['madder', 1] as const },
    });
    // The laugh: wide open, teeth on top, the tongue below.
    marks(
      g,
      28,
      39,
      [
        '4...........4',
        '.44444444444.',
        '.4TTTTTTTTt4.',
        '..4DDDDDDD4..',
        '..4DRRRRDD4..',
        '...4444444...',
        '....2222....',
      ],
      P,
    );
  },
};

/* ---------------------------------------------------- the market woman */

/**
 * The market woman: a long face with strong cheekbones and a firm jaw, a
 * flat basket of loaves on her head, her black braid over her shoulder, one
 * brow up and her mouth pulled to the side: well, are you buying?
 */
export const MARKET: FaceDef = {
  disc: 'ochre',
  discStep: 5,
  draw(g) {
    const P = pinsFor({
      skin: 'skingolden',
      hair: 'hairblack',
      browShift: 1,
      iris: ['wood', 3, 5],
    });
    const body = blob([
      [-2, 74],
      [2, 64],
      [14, 57],
      [27, 54],
      [46, 54],
      [59, 57],
      [71, 64],
      [75, 74],
    ]);
    form(g, body, 'ochre', { cx: 26, cy: 56, rx: 38, ry: 18, base: 2.6, k: 1.3, rim: 3 });
    // The shawl crossed and knotted at her throat.
    locks(
      g,
      [
        [
          [14, 60],
          [26, 62],
          [36, 64],
        ],
        [
          [58, 60],
          [46, 62],
          [38, 64],
        ],
      ],
      'ochre',
      4,
    );
    const knotS = blob([
      [32, 59],
      [38, 57],
      [42, 61],
      [38, 66],
      [33, 65],
    ]);
    form(g, knotS, 'ochre', { cx: 34, cy: 58, rx: 6, ry: 6, base: 1.8, k: 1.4, rim: 2 });
    const neckS = blob([
      [29, 45],
      [43, 45],
      [42, 58],
      [36, 60],
      [30, 58],
    ]);
    form(g, neckS, 'skingolden', { cx: 31, cy: 47, rx: 10, ry: 12, base: 2.8, k: 1, rim: 2 });
    // Hair pulled back flat, behind the head.
    const back = blob([
      [17, 26],
      [20, 15],
      [36, 10],
      [52, 15],
      [56, 26],
      [54, 38],
      [20, 38],
    ]);
    form(g, back, 'hairblack', { cx: 28, cy: 14, rx: 22, ry: 18, base: 2.4, k: 1.4, rim: 2 });
    // The head: long, cheekbones set high and wide, a firm square chin.
    const head = blob([
      [36, 12],
      [46, 14],
      [52, 21],
      [54, 30],
      [53, 38],
      [50, 46],
      [45, 51],
      [37, 53],
      [29, 51],
      [23, 44],
      [19, 32],
      [20, 22],
      [27, 14],
    ]);
    form(g, head, 'skingolden', { cx: 32, cy: 26, rx: 18, ry: 24, base: 1.9, k: 1.4, rim: 3 });
    // The shadow under her cheekbones.
    marks(g, 23, 37, ['3.', '33', '33', '.3'], P);
    marks(g, 49, 36, ['.4', '44', '44', '4.'], P);
    // Hair: parted at the middle, smooth over the crown.
    const hair = blob([
      [19, 30],
      [19, 20],
      [26, 13],
      [36, 10],
      [46, 12],
      [53, 19],
      [55, 30],
      [51, 24],
      [44, 18],
      [37, 16],
      [36, 15],
      [33, 17],
      [26, 21],
      [22, 30],
    ]);
    form(g, hair, 'hairblack', { cx: 28, cy: 12, rx: 20, ry: 14, base: 2.3, k: 1.5, rim: 2 });
    locks(
      g,
      [
        [
          [34, 13],
          [27, 16],
          [22, 23],
        ],
        [
          [39, 13],
          [47, 16],
          [52, 22],
        ],
      ],
      'hairblack',
      1,
    );
    cast(g, hair, { n: 1, dx: 1, dy: 1, on: ['skingolden'] });
    // Her braid, over the near shoulder: plaits as solid lobes.
    for (let i = 0; i < 6; i++) {
      const y = 34 + i * 5;
      const x = 20 - Math.round(i * 0.6);
      const lobe = blob([
        [x - 4, y + 1],
        [x - 1, y - 2],
        [x + 3, y],
        [x + 3, y + 4],
        [x - 1, y + 5],
      ]);
      form(g, lobe, 'hairblack', { cx: x - 3, cy: y - 2, rx: 5, ry: 5, base: 2.4, k: 1.5, rim: 2 });
    }
    marks(g, 15, 66, ['.aa.', 'abba', '.aa.'], { a: ['crimson', 3], b: ['crimson', 2] });
    // The basket on her head and the loaves in it.
    for (const [cx, cy, rx, mat] of [
      [24, 4, 9, 'wood'],
      [42, 3, 10, 'ochre'],
      [55, 6, 6, 'wood'],
    ] as const) {
      const loaf = blob([
        [cx - rx, cy + 3],
        [cx - rx + 2, cy - 2],
        [cx, cy - 4],
        [cx + rx - 2, cy - 2],
        [cx + rx, cy + 3],
      ]);
      form(g, loaf, mat, { cx: cx - 4, cy: cy - 3, rx, ry: 6, base: 1.8, k: 1.5, rim: 2 });
      stroke(
        g,
        [
          [cx - 2, cy - 1],
          [cx + 1, cy - 2],
        ],
        mat,
        3,
      );
    }
    marks(g, 34, 2, ['aa', 'ab'], { a: ['crimson', 2], b: ['crimson', 4] });
    const basket = blob([
      [12, 7],
      [62, 7],
      [60, 12],
      [14, 12],
    ]);
    form(g, basket, 'thatch', {
      cx: 30,
      cy: 6,
      rx: 30,
      ry: 6,
      base: 2.4,
      k: 1.2,
      rim: 1,
      tex: (x, y, t) => t + ((x + (y % 2) * 2) % 4 === 0 ? 1 : 0),
    });
    cast(g, basket, { n: 1, dx: 0, dy: 2, on: ['hairblack', 'skingolden'] });
    // Brows: the near one flat, the far one lifted in question.
    marks(g, 23, 23, ['.bBBBBBb.', 'BBb....bB'], P);
    marks(g, 41, 20, ['...bBBb..', '.bBb..bBb', 'bB.......'], P);
    // Eyes: dark and direct.
    marks(g, 24, 27, ['.KKKKKKK.', 'KKWCIiWKK', '.WWIKiWW.', '..3iii3..', '...333...'], P);
    marks(g, 41, 26, ['.3333...', 'KKKKKKK.', 'KWCIiWKK', 'WWIKiWW.', '.3iii3..', '..333...'], P);
    // A straight nose.
    marks(g, 36, 31, ['.12.', '.12.', '.123', '.123', '1123', '2234', '.44.'], P);
    // Her mouth pulled to the far side.
    marks(g, 31, 42, ['......4444', '.44444443.', '..2222....'], P);
  },
};

/* ----------------------------------------------------------- the docker */

/**
 * The docker: a square head on a bull neck, a flat cap pulled low, a short
 * black beard close to the jaw, and a lazy lopsided grin: he has carried
 * heavier things than you and will tell you about them.
 */
export const DOCKER: FaceDef = {
  disc: 'indigo',
  draw(g) {
    const P = pinsFor({
      skin: 'skinbrown',
      hair: 'hairblack',
      browShift: 1,
      iris: ['wood', 3, 5],
    });
    const body = blob([
      [-4, 74],
      [-3, 62],
      [8, 54],
      [22, 50],
      [50, 50],
      [64, 54],
      [75, 62],
      [76, 74],
    ]);
    form(g, body, 'cream', { cx: 26, cy: 52, rx: 40, ry: 20, base: 2.4, k: 1.3, rim: 3 });
    // The waistcoat, open over the shirt.
    for (const side of [-1, 1] as const) {
      const vest = blob(
        side < 0
          ? [
              [-4, 74],
              [-3, 64],
              [8, 56],
              [20, 54],
              [30, 72],
            ]
          : [
              [44, 72],
              [52, 54],
              [64, 56],
              [75, 64],
              [76, 74],
            ],
      );
      form(g, vest, 'mossdye', { cx: 24, cy: 54, rx: 40, ry: 18, base: 2.8, k: 1.3, rim: 2 });
    }
    marks(g, 28, 64, ['g', '.', '.', '.', 'g'], P);
    const neckS = blob([
      [22, 42],
      [50, 42],
      [52, 54],
      [36, 58],
      [21, 54],
    ]);
    form(g, neckS, 'skinbrown', { cx: 28, cy: 44, rx: 16, ry: 12, base: 2.7, k: 1, rim: 2 });
    const earS = blob([
      [17, 27],
      [13, 29],
      [13, 34],
      [15, 39],
      [19, 38],
    ]);
    form(g, earS, 'skinbrown', { cx: 13, cy: 30, rx: 5, ry: 8, base: 2.2, k: 1.2, rim: 2 });
    marks(g, 15, 31, ['3', '4', '3'], P);
    // The head: square, the jaw as wide as the temples.
    const head = blob([
      [36, 12],
      [48, 13],
      [55, 20],
      [56, 31],
      [55, 42],
      [50, 49],
      [40, 52],
      [30, 52],
      [21, 48],
      [17, 40],
      [16, 30],
      [18, 19],
      [25, 13],
    ]);
    form(g, head, 'skinbrown', { cx: 32, cy: 24, rx: 22, ry: 24, base: 1.6, k: 1.4, rim: 3 });
    // A close black beard round the jaw and over the lip: a solid shadow of hair.
    const beardS = without(
      blob([
        [17, 34],
        [21, 41],
        [27, 44],
        [35, 43],
        [43, 44],
        [50, 41],
        [56, 34],
        [56, 44],
        [50, 51],
        [40, 54],
        [30, 54],
        [21, 50],
        [17, 42],
      ]),
      blob([
        [28, 47],
        [36, 45],
        [46, 46],
        [42, 49],
        [32, 49],
      ]),
    );
    form(g, beardS, 'hairblack', {
      cx: 28,
      cy: 40,
      rx: 22,
      ry: 16,
      base: 2.2,
      k: 1.3,
      rim: 2,
      tex: (x, y, t) => t + ((x * 7 + y * 3) % 11 === 0 ? -1 : 0),
    });
    // The grin, lopsided: up at the near corner.
    marks(g, 28, 44, ['4.........', '.44444444.', '..TTTTTt4.', '...44444..'], P);
    // Brows easy and low under the peak.
    marks(g, 23, 24, ['..bbBBBBb', 'bBBBb....'], P);
    marks(g, 41, 24, ['bBBBBbb..', '....bBBBb'], P);
    // Eyes narrowed with amusement, the lower lids up.
    marks(g, 24, 27, ['.KKKKKKK.', 'KKWCIiWKK', '.3WIKiW3.', '..33333..'], P);
    marks(g, 41, 27, ['KKKKKKK.', 'KWCIiWKK', '3WIKiW3.', '.33333..'], P);
    // A broad nose, flattened once.
    marks(
      g,
      33,
      30,
      ['..12...', '..12...', '..123..', '.11233.', '1102344', '2233444', '.34.44.'],
      P,
    );
    // The flat cap, its peak casting a shadow over his brow.
    const cap = blob([
      [14, 22],
      [16, 13],
      [26, 7],
      [38, 6],
      [50, 8],
      [58, 14],
      [60, 21],
      [50, 19],
      [36, 18],
      [22, 20],
    ]);
    form(g, cap, 'umber', { cx: 26, cy: 6, rx: 24, ry: 12, base: 2.4, k: 1.4, rim: 2 });
    stroke(
      g,
      [
        [20, 14],
        [32, 10],
        [46, 11],
      ],
      'umber',
      4,
    );
    const peak = blob([
      [20, 20],
      [36, 17],
      [54, 18],
      [64, 22],
      [56, 24],
      [38, 23],
      [24, 24],
    ]);
    form(g, peak, 'umber', { cx: 30, cy: 18, rx: 24, ry: 6, base: 2.8, k: 1.2, rim: 1 });
    cast(g, peak, { n: 1, dx: 0, dy: 3, on: ['skinbrown'] });
  },
};

/* ------------------------------------------------------------ the elder */

/**
 * The old man: a bald brown crown with a grey fringe, great bushy grey
 * brows, eyes creased almost shut with smiling, a long grey beard: he has
 * seen everything twice and liked most of it.
 */
export const ELDER: FaceDef = {
  disc: 'midnight',
  discStep: 5,
  draw(g) {
    const P = pinsFor({ skin: 'skindeep', hair: 'hairgrey', iris: ['wood', 3, 5] });
    const G = {
      ...P,
      b: ['hairgrey', 2] as const,
      B: ['hairgrey', 3] as const,
      n: ['hairgrey', 0] as const,
    };
    const body = blob([
      [-4, 74],
      [-2, 64],
      [10, 57],
      [24, 54],
      [48, 54],
      [62, 57],
      [74, 64],
      [76, 74],
    ]);
    form(g, body, 'umber', { cx: 26, cy: 56, rx: 38, ry: 18, base: 2.5, k: 1.3, rim: 3 });
    const neckS = blob([
      [27, 44],
      [45, 44],
      [44, 56],
      [36, 58],
      [28, 56],
    ]);
    form(g, neckS, 'skindeep', { cx: 30, cy: 46, rx: 12, ry: 12, base: 2.4, k: 1, rim: 2 });
    const earS = blob([
      [18, 25],
      [13, 27],
      [12, 33],
      [14, 39],
      [19, 38],
    ]);
    form(g, earS, 'skindeep', { cx: 13, cy: 28, rx: 5, ry: 8, base: 1.6, k: 1.2, rim: 2 });
    marks(g, 14, 30, ['2', '3', '3', '2'], P);
    const head = blob([
      [35, 7],
      [46, 9],
      [53, 16],
      [55, 26],
      [54, 37],
      [49, 46],
      [40, 51],
      [32, 51],
      [24, 47],
      [19, 39],
      [17, 28],
      [19, 17],
      [26, 10],
    ]);
    form(g, head, 'skindeep', { cx: 31, cy: 18, rx: 22, ry: 26, base: 1.3, k: 1.4, rim: 3 });
    marks(g, 25, 10, ['.00.', '000.', '00..'], P);
    // Lines across the brow.
    marks(g, 29, 15, ['.3333333.', '3.......3'], P);
    marks(g, 31, 18, ['3333333'], P);
    // The grey fringe round the back of his head, over the ear.
    const fringe = blob([
      [16, 32],
      [16, 22],
      [21, 15],
      [23, 22],
      [22, 30],
      [19, 36],
    ]);
    form(g, fringe, 'hairgrey', { cx: 16, cy: 18, rx: 8, ry: 12, base: 2.2, k: 1.4, rim: 2 });
    const fringe2 = blob([
      [52, 14],
      [56, 20],
      [57, 30],
      [55, 34],
      [53, 26],
    ]);
    form(g, fringe2, 'hairgrey', { cx: 52, cy: 16, rx: 6, ry: 12, base: 3, k: 1.2, rim: 1 });
    // Bushy brows, tufted upward at their outer ends.
    marks(g, 20, 20, ['nb.......', '.nbbBBBb.', '..BBBBBBBB', '....BBBBB'], G);
    marks(g, 40, 21, ['..bbBBBb.n', 'bBBBBBBBb.', 'BBBBB.....'], G);
    // Eyes: smiling, almost shut, deep creases at their corners.
    marks(g, 24, 25, ['...KKKK..', '.KK.IiKK.', 'K...KK...', '.3.....3.', '3.3...3.3'], P);
    marks(g, 41, 25, ['..KKKK..', '.KKIi.KK', '...KK...K', '.3.....3', '3.3...3.'], P);
    // A big nose, hooked, lit along its bridge.
    marks(
      g,
      33,
      27,
      ['..01..', '..012.', '..012.', '..0123', '.00123', '001234', '112344', '.2334.'],
      P,
    );
    // The long beard to the bottom of the frame, and the moustache over it.
    const beardS = blob([
      [19, 36],
      [24, 42],
      [32, 44],
      [41, 44],
      [49, 41],
      [54, 35],
      [54, 46],
      [50, 56],
      [45, 66],
      [38, 74],
      [32, 74],
      [26, 64],
      [21, 52],
    ]);
    form(g, beardS, 'hairgrey', { cx: 28, cy: 44, rx: 20, ry: 24, base: 2.3, k: 1.3, rim: 3 });
    locks(
      g,
      [
        [
          [26, 48],
          [28, 57],
          [31, 66],
        ],
        [
          [34, 50],
          [34, 60],
          [35, 70],
        ],
        [
          [44, 49],
          [42, 58],
          [39, 68],
        ],
        [
          [50, 44],
          [48, 52],
        ],
      ],
      'hairgrey',
      4,
    );
    const tache = blob([
      [24, 42],
      [30, 37],
      [36, 38],
      [42, 37],
      [50, 41],
      [47, 45],
      [40, 43],
      [33, 43],
      [27, 46],
    ]);
    form(g, tache, 'hairgrey', { cx: 30, cy: 36, rx: 14, ry: 6, base: 1.8, k: 1.4, rim: 2 });
    cast(g, tache, { n: 1, on: ['hairgrey'] });
    marks(g, 33, 44, ['.4444.', '..22..'], P);
  },
};

/* ----------------------------------------------------------- the footpad */

/**
 * The footpad: a deep hood, a cloth over nose and mouth, and all of him in
 * his eyes: narrowed, glancing aside, one brow cocked. A rogue, not a dead
 * stare: he is already looking at your purse.
 */
export const FOOTPAD: FaceDef = {
  disc: 'felt',
  discStep: 4,
  draw(g) {
    const P = pinsFor({ skin: 'skinpale', hair: 'hair', browShift: 1, iris: ['wood', 2, 4] });
    const body = blob([
      [-4, 74],
      [-2, 62],
      [10, 55],
      [24, 52],
      [48, 52],
      [62, 55],
      [74, 62],
      [76, 74],
    ]);
    form(g, body, 'hide', { cx: 26, cy: 54, rx: 38, ry: 18, base: 2.6, k: 1.3, rim: 3 });
    // The hood's shell, behind and round the head.
    const shell = blob([
      [10, 56],
      [10, 30],
      [16, 14],
      [28, 5],
      [42, 4],
      [55, 11],
      [62, 26],
      [62, 56],
      [50, 60],
      [24, 60],
    ]);
    form(g, shell, 'felt', { cx: 24, cy: 12, rx: 30, ry: 30, base: 2, k: 1.6, rim: 3 });
    // The dark inside it.
    const inside = blob([
      [17, 50],
      [17, 28],
      [23, 16],
      [36, 11],
      [49, 15],
      [56, 28],
      [56, 50],
      [36, 54],
    ]);
    form(g, inside, 'felt', { cx: 36, cy: 30, rx: 22, ry: 24, base: 4.4, k: 0.4, rim: 2 });
    const head = blob([
      [36, 16],
      [47, 18],
      [53, 25],
      [54, 34],
      [52, 42],
      [46, 49],
      [37, 52],
      [28, 49],
      [22, 42],
      [20, 33],
      [22, 24],
      [28, 18],
    ]);
    form(g, head, 'skinpale', { cx: 30, cy: 22, rx: 18, ry: 22, base: 2.2, k: 1.4, rim: 2 });
    // The hood's shadow across the top of his face.
    tone(g, (x, y) => y < 20 + Math.abs(x - 36) * 0.2, 1, ['skinpale']);
    // A lock of hair escaping across his brow.
    const lock = blob([
      [28, 18],
      [35, 16],
      [41, 17],
      [37, 19],
      [33, 22],
      [31, 20],
    ]);
    form(g, lock, 'hair', { cx: 30, cy: 17, rx: 10, ry: 5, base: 2.4, k: 1.4, rim: 1 });
    // The cloth over nose and mouth, tied tight.
    const mask = blob([
      [20, 35],
      [30, 33],
      [37, 31],
      [44, 33],
      [54, 35],
      [53, 44],
      [46, 51],
      [37, 54],
      [27, 50],
      [21, 43],
    ]);
    form(g, mask, 'umber', { cx: 28, cy: 32, rx: 18, ry: 14, base: 2.6, k: 1.4, rim: 2 });
    locks(
      g,
      [
        [
          [36, 33],
          [35, 40],
          [33, 47],
        ],
        [
          [26, 40],
          [31, 44],
        ],
        [
          [44, 38],
          [47, 44],
        ],
      ],
      'umber',
      4,
    );
    // Brows: the near one drawn down, the far one cocked.
    marks(g, 23, 22, ['......bBB', '..bbBBBB.', 'bBBb.....'], P);
    marks(g, 41, 20, ['.bBBb...', 'bB..bBBb', '.......B'], P);
    // Eyes: narrowed, both looking to the near side, sizing you up.
    marks(g, 24, 26, ['.KKKKKKK.', 'KIiKWWWKK', '.KK33333.'], P);
    marks(g, 41, 25, ['.KKK....', 'KKKKKKK.', 'KIiKWWKK', '.KK3333.'], P);
    dots(
      g,
      [
        [25, 27],
        [42, 27],
      ],
      'eye',
      0,
    );
    // The cudgel's knotted head over his shoulder.
    const knob = blob([
      [56, 46],
      [60, 40],
      [67, 41],
      [69, 48],
      [65, 54],
      [58, 53],
    ]);
    form(g, knob, 'bark', { cx: 58, cy: 40, rx: 8, ry: 8, base: 2.3, k: 1.5, rim: 2 });
    dots(
      g,
      [
        [62, 45],
        [65, 49],
        [60, 50],
      ],
      'bark',
      4,
    );
    rod(g, 59, 54, 53, 72, 4, 'bark', [2, 3, 4]);
  },
};

/* ---------------------------------------------------------- the smuggler */

/**
 * The smuggler: a knitted cap, a great black beard, a red drinker's nose, a
 * gold ring in his ear and one eye narrowed over a crooked smirk: he has a
 * cask of something that fell off a ship, and a price.
 */
export const SMUGGLER: FaceDef = {
  disc: 'tar',
  discStep: 4,
  draw(g) {
    const P = pinsFor({ skin: 'skin', hair: 'hairblack', browShift: 1, iris: ['slate', 2, 4] });
    const body = blob([
      [-4, 74],
      [-3, 62],
      [8, 55],
      [22, 51],
      [50, 51],
      [64, 55],
      [75, 62],
      [76, 74],
    ]);
    form(g, body, 'tar', { cx: 26, cy: 54, rx: 40, ry: 20, base: 2.2, k: 1.3, rim: 3 });
    // The striped shirt at his throat, the coat's collar turned up either side.
    const shirt = blob([
      [27, 54],
      [45, 54],
      [42, 72],
      [30, 72],
    ]);
    form(g, shirt, 'cream', {
      cx: 28,
      cy: 56,
      rx: 10,
      ry: 10,
      base: 1.8,
      k: 1,
      rim: 1,
    });
    for (let y = 57; y < 72; y += 4)
      stroke(
        g,
        [
          [28, y],
          [44, y],
        ],
        'crimson',
        3,
      );
    tone(g, (x, y) => x > 44 || x < 28 || y < 54, 0);
    for (const side of [-1, 1] as const) {
      const collar = blob(
        side < 0
          ? [
              [12, 56],
              [22, 48],
              [28, 60],
              [24, 70],
            ]
          : [
              [60, 56],
              [50, 48],
              [44, 60],
              [48, 70],
            ],
      );
      form(g, collar, 'tar', { cx: 20, cy: 48, rx: 20, ry: 14, base: 1.8, k: 1.4, rim: 2 });
    }
    const earS = blob([
      [17, 25],
      [13, 27],
      [12, 33],
      [15, 38],
      [19, 37],
    ]);
    form(g, earS, 'skin', { cx: 13, cy: 28, rx: 5, ry: 8, base: 2.3, k: 1.2, rim: 2 });
    marks(g, 14, 30, ['3', '4', '3'], P);
    marks(g, 13, 37, ['.g.', 'g.G', '.G.'], P);
    const head = blob([
      [36, 9],
      [47, 11],
      [54, 18],
      [56, 28],
      [54, 39],
      [49, 47],
      [40, 51],
      [31, 51],
      [23, 47],
      [18, 39],
      [16, 28],
      [18, 17],
      [26, 11],
    ]);
    form(g, head, 'skin', { cx: 32, cy: 22, rx: 22, ry: 24, base: 2, k: 1.4, rim: 3 });
    // The great black beard, up the cheeks, solid as a hedge.
    const beardS = blob([
      [17, 30],
      [21, 38],
      [28, 41],
      [36, 40],
      [44, 41],
      [51, 38],
      [56, 30],
      [57, 44],
      [54, 56],
      [46, 64],
      [36, 67],
      [26, 64],
      [19, 56],
      [16, 44],
    ]);
    form(g, beardS, 'hairblack', { cx: 28, cy: 40, rx: 22, ry: 22, base: 2.7, k: 1.4, rim: 3 });
    locks(
      g,
      [
        [
          [24, 46],
          [26, 54],
          [29, 61],
        ],
        [
          [33, 52],
          [34, 60],
          [35, 65],
        ],
        [
          [44, 50],
          [43, 58],
          [40, 64],
        ],
        [
          [52, 42],
          [51, 50],
        ],
      ],
      'hairblack',
      5,
    );
    dots(
      g,
      [
        [23, 45],
        [32, 51],
        [43, 49],
        [21, 39],
        [51, 40],
      ],
      'hairblack',
      1,
    );
    // The smirk, up at the far corner, under the moustache.
    marks(g, 32, 44, ['........4', '.4444444.', '..2222...'], P);
    const tache = blob([
      [25, 43],
      [30, 39],
      [37, 40],
      [44, 39],
      [50, 41],
      [47, 44],
      [41, 42],
      [33, 43],
      [27, 46],
    ]);
    form(g, tache, 'hairblack', { cx: 32, cy: 38, rx: 14, ry: 6, base: 2.2, k: 1.4, rim: 1 });
    // A red drinker's nose, round at the end.
    marks(g, 34, 28, ['.12..', '.12..', '.123.', '11223', '01223', '11233', '.233.'], {
      ...P,
      '0': ['madder', 0] as const,
      '1': ['madder', 1] as const,
      '2': ['madder', 2] as const,
      '3': ['madder', 3] as const,
    });
    // Heavy brows, the far one drawn down over a narrowed eye.
    marks(g, 21, 18, ['...bBBBBb.', '.bBBBBBBBB', 'BBBb......'], P);
    marks(g, 41, 21, ['BBBBBBb..', '.bBBBBBBB', '.....bBBB'], P);
    marks(
      g,
      24,
      22,
      ['.33333333', '.KKKKKKK.', 'KKwCIiWWK', '.WWIKiWW.', '..wiiiw..', '...333...'],
      P,
    );
    marks(g, 41, 25, ['KKKKKKKK', 'KwCIiwKK', '.33333..'], P);
    // The knitted cap, rolled at the brim, with its ribs.
    const cap = blob([
      [15, 18],
      [17, 9],
      [26, 2],
      [38, 0],
      [50, 3],
      [57, 10],
      [58, 18],
      [48, 16],
      [36, 15],
      [24, 16],
    ]);
    form(g, cap, 'indigo', {
      cx: 26,
      cy: 2,
      rx: 22,
      ry: 14,
      base: 2.6,
      k: 1.5,
      rim: 2,
      tex: (x, _y, t) => t + (x % 3 === 0 ? 0.7 : 0),
    });
    const roll = blob([
      [14, 18],
      [26, 15],
      [38, 14],
      [50, 15],
      [59, 18],
      [58, 22],
      [48, 20],
      [36, 19],
      [24, 20],
      [15, 23],
    ]);
    form(g, roll, 'indigo', { cx: 26, cy: 14, rx: 24, ry: 6, base: 2.2, k: 1.4, rim: 1 });
    cast(g, roll, { n: 1, dx: 1, dy: 2, on: ['skin'] });
  },
};

/* ---------------------------------------------------------- the deckhand */

/**
 * The deckhand: a red bandana with white spots tight over his crown, a jaw
 * dark with three days' stubble, brows down and teeth bared in a snarling
 * grin: he will start the fight and enjoy it.
 */
export const DECKHAND: FaceDef = {
  disc: 'teal',
  draw(g) {
    const P = pinsFor({
      skin: 'skingolden',
      hair: 'hairblack',
      browShift: 1,
      iris: ['wood', 3, 5],
    });
    const body = blob([
      [-4, 74],
      [-3, 62],
      [8, 55],
      [22, 51],
      [50, 51],
      [64, 55],
      [75, 62],
      [76, 74],
    ]);
    form(g, body, 'cream', { cx: 26, cy: 54, rx: 40, ry: 20, base: 2.2, k: 1.3, rim: 3 });
    for (let y = 55; y < 74; y += 5)
      for (let x = -2; x < 76; x++)
        for (let j = 0; j < 2; j++) {
          const c = g.d[(y + j) * 72 + x];
          if (x >= 0 && x < 72 && y + j < 72 && c && c >> 3 === cell('cream', 0) >> 3)
            put(g, x, y + j, cell('crimson', (c & 7) + (j ? 1 : 0)));
        }
    const neckS = blob([
      [26, 42],
      [46, 42],
      [47, 54],
      [36, 57],
      [25, 54],
    ]);
    form(g, neckS, 'skingolden', { cx: 30, cy: 44, rx: 14, ry: 12, base: 2.8, k: 1, rim: 2 });
    const earS = blob([
      [17, 25],
      [13, 27],
      [12, 33],
      [15, 38],
      [19, 37],
    ]);
    form(g, earS, 'skingolden', { cx: 13, cy: 28, rx: 5, ry: 8, base: 2.2, k: 1.2, rim: 2 });
    marks(g, 14, 30, ['3', '4', '3'], P);
    marks(g, 13, 37, ['.g.', 'g.G', '.G.'], P);
    // The head: lean and hard, hollow under the cheekbones, a jutting chin.
    const head = blob([
      [36, 10],
      [47, 12],
      [54, 19],
      [55, 29],
      [53, 39],
      [48, 46],
      [42, 52],
      [33, 53],
      [25, 49],
      [19, 40],
      [17, 29],
      [19, 18],
      [26, 12],
    ]);
    form(g, head, 'skingolden', { cx: 32, cy: 22, rx: 20, ry: 24, base: 1.8, k: 1.4, rim: 3 });
    // Stubble: one darker tone over the jaw and lip, its edge broken, never a speckle.
    const stub = without(
      blob([
        [19, 34],
        [23, 40],
        [30, 38],
        [37, 37],
        [45, 38],
        [51, 38],
        [54, 33],
        [53, 42],
        [48, 49],
        [41, 54],
        [32, 54],
        [24, 49],
      ]),
      blob([
        [28, 42],
        [37, 41],
        [47, 42],
        [44, 47],
        [31, 47],
      ]),
    );
    tone(g, stub, 2, ['skingolden']);
    tone(g, (x, y) => stub(x, y) && (x + y * 2) % 7 === 0 && !stub(x, y - 2), -1, ['skingolden']);
    marks(g, 30, 47, ['3.3.3.3.3'], P);
    // Hollow cheeks.
    marks(g, 22, 34, ['3', '3', '33'], P);
    // The snarl: teeth bared, the far side drawn up.
    marks(
      g,
      29,
      41,
      ['...........4', '4444444444.', '4TTtTTtTTT4', '4DTTTTTTTD4', '.444444444.'],
      P,
    );
    // Brows: hard, slanting down to the nose.
    marks(g, 22, 20, ['BBb.......', '.bBBBBb...', '...bBBBBBB', '.......BBB'], P);
    marks(g, 40, 20, ['.......bBB', '...bBBBBb.', 'BBBBBBb...', 'BBB.......'], P);
    // Eyes: hard and narrowed, glaring straight out.
    marks(g, 24, 25, ['.KKKKKKK.', 'KKWCIiWKK', '.wWIKiWw.', '..33333..'], P);
    marks(g, 42, 25, ['.KKKKKK.', 'KKCIiWKK', '.WIKiWw.', '..3333..'], P);
    // A nose broken once.
    marks(g, 34, 27, ['.12..', '..12.', '.123.', '.1123', '11234', '22344', '.344.'], P);
    // The bandana, tight over the crown, spotted, knotted behind.
    const band = blob([
      [16, 20],
      [17, 11],
      [25, 5],
      [37, 3],
      [49, 5],
      [56, 12],
      [57, 20],
      [48, 17],
      [36, 16],
      [24, 17],
    ]);
    form(g, band, 'crimson', { cx: 26, cy: 4, rx: 22, ry: 14, base: 2.3, k: 1.4, rim: 2 });
    for (const [x, y] of [
      [24, 8],
      [32, 6],
      [40, 7],
      [48, 9],
      [21, 14],
      [29, 12],
      [37, 12],
      [45, 13],
      [53, 15],
    ] as const)
      marks(g, x, y, ['cc', 'cd'], { c: ['cream', 1], d: ['cream', 3] });
    cast(g, band, { n: 1, dx: 1, dy: 2, on: ['skingolden'] });
    const knot = blob([
      [9, 18],
      [15, 14],
      [18, 19],
      [14, 23],
    ]);
    form(g, knot, 'crimson', { cx: 10, cy: 14, rx: 6, ry: 6, base: 2.2, k: 1.4, rim: 1 });
    marks(g, 7, 22, ['.ab', 'ab.', 'b..', 'b..'], { a: ['crimson', 2], b: ['crimson', 4] });
  },
};

/* ------------------------------------------------------ the powder monkey */

/**
 * The powder monkey: a small grown man, round bald head, ears out like jug
 * handles, a stubbled jaw, his brows shot up and a huge gap-toothed grin, his
 * lit keg held up beside his head: delighted by what is about to happen.
 */
export const MONKEY: FaceDef = {
  disc: 'ochre',
  discStep: 5,
  draw(g) {
    const P = pinsFor({ skin: 'skin', hair: 'hairblack', browShift: 1, iris: ['wood', 3, 5] });
    // Narrow shoulders, his open vest over a bare chest.
    const body = blob([
      [2, 74],
      [5, 64],
      [14, 58],
      [26, 55],
      [44, 55],
      [56, 58],
      [64, 64],
      [66, 74],
    ]);
    form(g, body, 'indigo', { cx: 24, cy: 56, rx: 32, ry: 18, base: 2.5, k: 1.3, rim: 3 });
    const chest = blob([
      [27, 56],
      [43, 56],
      [41, 74],
      [29, 74],
    ]);
    form(g, chest, 'skin', { cx: 28, cy: 56, rx: 10, ry: 14, base: 2.2, k: 1.2, rim: 2 });
    const neckS = blob([
      [29, 46],
      [41, 46],
      [41, 57],
      [35, 59],
      [29, 57],
    ]);
    form(g, neckS, 'skin', { cx: 30, cy: 48, rx: 8, ry: 10, base: 2.7, k: 1, rim: 2 });
    // The red kerchief knotted at his throat, its end sticking out.
    const kerchief = blob([
      [24, 52],
      [46, 52],
      [42, 58],
      [35, 61],
      [28, 58],
    ]);
    form(g, kerchief, 'crimson', { cx: 28, cy: 52, rx: 12, ry: 6, base: 2.2, k: 1.4, rim: 2 });
    marks(g, 41, 56, ['ab.', 'bbc', '.cc', '..c'], {
      a: ['crimson', 1],
      b: ['crimson', 2],
      c: ['crimson', 4],
    });
    // Jug-handle ears, both showing.
    for (const pts of [
      [
        [16, 24],
        [10, 22],
        [7, 28],
        [9, 35],
        [15, 36],
      ],
      [
        [52, 24],
        [58, 22],
        [61, 28],
        [59, 35],
        [53, 36],
      ],
    ] as const) {
      const e = blob(pts);
      form(g, e, 'skin', { cx: 9, cy: 24, rx: 30, ry: 10, base: 2.2, k: 1.2, rim: 2 });
    }
    marks(g, 10, 26, ['.3', '43', '4.', '43'], P);
    marks(g, 57, 26, ['3.', '34', '.4', '34'], P);
    // The head: round as a cannonball.
    const head = blob([
      [34, 8],
      [44, 10],
      [51, 16],
      [54, 26],
      [53, 36],
      [48, 44],
      [40, 49],
      [30, 49],
      [21, 44],
      [16, 36],
      [15, 26],
      [18, 16],
      [25, 10],
    ]);
    form(g, head, 'skin', { cx: 30, cy: 20, rx: 20, ry: 22, base: 1.9, k: 1.5, rim: 3 });
    marks(g, 24, 11, ['..000', '.000.', '00...'], P);
    // Creases across his brow, from the brows shooting up.
    marks(g, 27, 14, ['.333333333.', '3.........3'], P);
    // Stubble over the jaw and lip, one tone darker, its edge broken.
    const stub = without(
      blob([
        [17, 33],
        [22, 37],
        [29, 35],
        [36, 35],
        [44, 35],
        [50, 36],
        [53, 31],
        [52, 39],
        [47, 46],
        [38, 50],
        [28, 49],
        [20, 43],
      ]),
      blob([
        [24, 38],
        [35, 37],
        [48, 38],
        [42, 47],
        [28, 47],
      ]),
    );
    tone(g, stub, 2, ['skin']);
    // Brows shot up high and arched.
    marks(g, 21, 16, ['...bBBb..', '.bBb..bB.', 'bB.......'], P);
    marks(g, 39, 16, ['..bBBb...', '.Bb..bBb.', '.......bB'], P);
    // Eyes wide open, the iris small in all that white.
    marks(
      g,
      22,
      21,
      ['..KKKKKK.', '.KKWWCIiK', 'KWWWWIKiK', 'KWWWWiiiK', '.KWWWWWK.', '..33333..'],
      P,
    );
    marks(
      g,
      39,
      21,
      ['.KKKKKK..', 'KWWWCIiK.', 'KWWWWIKiK', 'KWWWWiiiK', '.KWWWWWK.', '..33333..'],
      P,
    );
    // A snub nose.
    marks(g, 32, 27, ['.12.', '1123', '2234', '.44.'], P);
    // The grin, ear to ear, a tooth missing.
    marks(
      g,
      23,
      34,
      [
        '4....................4',
        '.44444444444444444444.',
        '.4TTTTTDDTTTTTTTTTTt4.',
        '..4TTTTDDTTTTTTTTTt4..',
        '...4DDDDDDDDDDDDDDD4..',
        '...4DDDRRRRRRRDDDD4...',
        '....44444444444444....',
        '......2222222222......',
      ],
      P,
    );
    // The keg held up beside his head, a skull painted on, its fuse lit.
    const keg = blob([
      [52, 32],
      [54, 28],
      [66, 28],
      [69, 32],
      [70, 44],
      [68, 54],
      [55, 54],
      [52, 46],
    ]);
    form(g, keg, 'wood', {
      cx: 54,
      cy: 34,
      rx: 12,
      ry: 18,
      base: 2.3,
      k: 1.5,
      rim: 2,
      tex: (x, _y, t) => t + ((x - 52) % 4 === 3 ? 0.8 : 0),
    });
    for (const y of [31, 50])
      stroke(
        g,
        [
          [53, y],
          [69, y],
        ],
        'iron',
        3,
      );
    marks(g, 57, 37, ['.ccc.', 'ccccc', 'cKcKc', 'ccKcc', '.c.c.'], {
      c: ['sail', 0],
      K: ['wood', 5],
    });
    marks(
      g,
      62,
      18,
      ['..FE', '.fF.', '.f..', 'f...', 'f...', 'f...', 'f...', 'f...', 'f...', 'f...'],
      {
        f: ['tar', 2],
        F: ['fire', 1],
        E: ['fire', 3],
      },
    );
    // His fist under it.
    marks(g, 51, 50, ['.234.', '23344', '34444', '.444.'], P);
  },
};

/* --------------------------------------------------------- the captain */

/**
 * Brinebeard: a great tricorn with a skull and a purple plume, a heavy face
 * under it red with weather, eyes glaring out of deep sockets under brows
 * like ledges, and a grey-green beard full of weed and shells spreading to
 * the bottom of the frame: frightening, and a little ridiculous.
 */
export const BRINEBEARD: FaceDef = {
  disc: 'midnight',
  discStep: 6,
  draw(g) {
    const P = pinsFor({ skin: 'skin', hair: 'hairgrey', iris: ['slate', 2, 4] });
    const G = {
      ...P,
      b: ['hairgrey', 3] as const,
      B: ['hairgrey', 4] as const,
      n: ['hairgrey', 2] as const,
    };
    const body = blob([
      [-4, 74],
      [-4, 60],
      [6, 52],
      [22, 48],
      [50, 48],
      [66, 52],
      [76, 60],
      [76, 74],
    ]);
    form(g, body, 'violet', { cx: 22, cy: 50, rx: 40, ry: 20, base: 2.8, k: 1.4, rim: 3 });
    // Brass braid down his lapels.
    stroke(
      g,
      [
        [18, 54],
        [24, 72],
      ],
      'bronze',
      1,
    );
    stroke(
      g,
      [
        [54, 54],
        [48, 72],
      ],
      'bronze',
      2,
    );
    const earS = blob([
      [16, 27],
      [11, 29],
      [10, 35],
      [13, 40],
      [17, 39],
    ]);
    form(g, earS, 'skin', { cx: 11, cy: 30, rx: 5, ry: 8, base: 2.4, k: 1.2, rim: 2 });
    marks(g, 12, 32, ['3', '4', '3'], P);
    marks(g, 10, 39, ['.g.', 'g.G', '.G.'], P);
    // The head: big, heavy, wide in the jaw.
    const head = blob([
      [36, 12],
      [49, 14],
      [56, 22],
      [58, 32],
      [57, 42],
      [52, 50],
      [40, 54],
      [30, 54],
      [20, 50],
      [15, 42],
      [14, 32],
      [16, 22],
      [24, 14],
    ]);
    form(g, head, 'skin', { cx: 32, cy: 24, rx: 24, ry: 26, base: 2.1, k: 1.4, rim: 3 });
    // Deep sockets under the brow.
    tone(
      g,
      blob([
        [21, 24],
        [33, 23],
        [34, 30],
        [22, 31],
      ]),
      1,
      ['skin'],
    );
    tone(
      g,
      blob([
        [40, 23],
        [52, 24],
        [51, 31],
        [39, 30],
      ]),
      1,
      ['skin'],
    );
    // Eyes: glaring out, small irises, the whites showing round them.
    marks(g, 22, 25, ['.KKKKKKKK', 'KWWWCIWWK', '.WWWiKWW.', '..33333..'], P);
    marks(g, 41, 25, ['KKKKKKKK.', 'KWWCIWWWK', '.WWiKWWW.', '..33333..'], P);
    // Brows like ledges, grey, slanting down to the nose in a glower.
    marks(
      g,
      19,
      19,
      ['nbb.........', 'bBBBbbb.....', '.BBBBBBBbb..', '....BBBBBBBB', '.......BBBBB'],
      G,
    );
    marks(
      g,
      39,
      19,
      ['.........bbn', '.....bbbBBBb', '..bbBBBBBBB.', 'BBBBBBBB....', 'BBBBB.......'],
      G,
    );
    // A great red nose, round as a buoy.
    const noseS = blob([
      [35, 27],
      [39, 27],
      [41, 33],
      [44, 37],
      [42, 41],
      [36, 42],
      [32, 40],
      [32, 35],
    ]);
    form(g, noseS, 'madder', { cx: 34, cy: 32, rx: 8, ry: 10, base: 1.8, k: 1.5, rim: 2 });
    dots(
      g,
      [
        [35, 35],
        [35, 36],
      ],
      'madder',
      0,
    );
    // The beard of brine: a great grey-green mass to the bottom of the frame.
    const beardS = blob([
      [15, 38],
      [21, 44],
      [29, 44],
      [36, 43],
      [44, 44],
      [52, 44],
      [57, 38],
      [62, 50],
      [60, 62],
      [52, 72],
      [38, 76],
      [22, 72],
      [12, 62],
      [10, 50],
    ]);
    form(g, beardS, 'hairgrey', {
      cx: 26,
      cy: 44,
      rx: 26,
      ry: 26,
      base: 2.5,
      k: 1.4,
      rim: 3,
      tex: (x, y, t) =>
        t + ((Math.floor(x / 4) + Math.floor((y + x * 0.2) / 7)) % 3 === 0 ? 0.6 : 0),
    });
    // Weed in it, hanging in strands.
    locks(
      g,
      [
        [
          [17, 50],
          [18, 57],
          [16, 64],
        ],
        [
          [27, 55],
          [27, 63],
          [29, 70],
        ],
        [
          [47, 52],
          [46, 60],
          [48, 68],
        ],
        [
          [56, 48],
          [57, 56],
        ],
      ],
      'weed',
      3,
    );
    locks(
      g,
      [
        [
          [21, 52],
          [23, 62],
        ],
        [
          [36, 54],
          [37, 64],
          [36, 71],
        ],
        [
          [52, 54],
          [51, 64],
        ],
      ],
      'hairgrey',
      4,
    );
    marks(g, 30, 64, ['.ab', 'abc', 'bc.'], { a: ['shell', 1], b: ['shell', 2], c: ['shell', 4] });
    marks(g, 42, 60, ['..a..', 'aabaa', '.bcb.', '.b.b.'], {
      a: ['crab', 1],
      b: ['crab', 2],
      c: ['crab', 3],
    });
    // The moustache, swept out, and the scowling mouth under it.
    const tache = blob([
      [19, 45],
      [26, 41],
      [32, 41],
      [37, 43],
      [42, 41],
      [48, 41],
      [55, 45],
      [52, 48],
      [44, 46],
      [37, 47],
      [30, 46],
      [22, 48],
    ]);
    form(g, tache, 'hairgrey', { cx: 28, cy: 40, rx: 18, ry: 6, base: 2, k: 1.4, rim: 1 });
    cast(g, tache, { n: 1, on: ['hairgrey'] });
    marks(g, 32, 48, ['..4444..', '.4....4.', '4......4'], P);
    // The great tricorn with its skull, and the purple plume.
    tricorn(g, { trim: 'bronze', on: ['skin', 'hairgrey'], skull: true, low: -1 });
    const plume = blob([
      [10, 14],
      [2, 6],
      [1, 1],
      [8, 2],
      [16, 8],
      [18, 12],
    ]);
    form(g, plume, 'plum', { cx: 4, cy: 2, rx: 10, ry: 8, base: 2, k: 1.5, rim: 2 });
    locks(
      g,
      [
        [
          [3, 3],
          [9, 7],
          [15, 11],
        ],
      ],
      'plum',
      4,
    );
  },
};

/* ---------------------------------------------------------- the goblin */

/**
 * The goblin poacher: a narrow green head between ears longer than it is,
 * yellow eyes slitted with spite, a hooked nose and a grin full of pointed
 * teeth, his hood back and his longbow over his shoulder.
 */
export const GOBLIN: FaceDef = {
  disc: 'mossdye',
  draw(g) {
    const P = pinsFor({ skin: 'goblin', hair: 'hairblack', browShift: 1, iris: ['gold', 1, 3] });
    // The bow over his shoulder.
    rod(g, 63, 4, 66, 72, 3, 'bark', [1, 2, 4]);
    stroke(
      g,
      [
        [61, 6],
        [58, 72],
      ],
      'linen',
      2,
    );
    const body = blob([
      [2, 74],
      [5, 64],
      [14, 58],
      [26, 55],
      [46, 55],
      [58, 58],
      [66, 64],
      [69, 74],
    ]);
    form(g, body, 'umber', { cx: 24, cy: 56, rx: 34, ry: 18, base: 2.5, k: 1.3, rim: 3 });
    // The hood thrown back behind his head.
    const hoodS = blob([
      [12, 58],
      [12, 36],
      [18, 20],
      [36, 13],
      [54, 20],
      [60, 36],
      [60, 58],
      [36, 60],
    ]);
    form(g, hoodS, 'mossdye', { cx: 24, cy: 20, rx: 26, ry: 28, base: 2.6, k: 1.4, rim: 3 });
    // Long ears out either side, pointing up and back.
    const nearEar = blob([
      [20, 30],
      [8, 22],
      [1, 14],
      [6, 24],
      [14, 34],
      [21, 38],
    ]);
    const farEar = blob([
      [50, 30],
      [62, 22],
      [70, 14],
      [65, 25],
      [57, 34],
      [50, 38],
    ]);
    form(g, nearEar, 'goblin', { cx: 4, cy: 14, rx: 20, ry: 14, base: 2, k: 1.3, rim: 2 });
    form(g, farEar, 'goblin', { cx: 50, cy: 14, rx: 20, ry: 14, base: 2.6, k: 1.3, rim: 2 });
    stroke(
      g,
      [
        [6, 21],
        [12, 27],
        [18, 32],
      ],
      'goblin',
      4,
    );
    stroke(
      g,
      [
        [64, 21],
        [58, 27],
        [52, 32],
      ],
      'goblin',
      5,
    );
    const neckS = blob([
      [30, 46],
      [41, 46],
      [41, 57],
      [36, 59],
      [30, 57],
    ]);
    form(g, neckS, 'goblin', { cx: 30, cy: 48, rx: 8, ry: 10, base: 3, k: 1, rim: 2 });
    // The head: a narrow crown, wide cheeks, a pointed chin.
    const head = blob([
      [35, 14],
      [44, 16],
      [50, 22],
      [52, 31],
      [51, 39],
      [46, 46],
      [38, 52],
      [32, 50],
      [25, 44],
      [20, 37],
      [19, 28],
      [22, 20],
      [28, 15],
    ]);
    form(g, head, 'goblin', { cx: 30, cy: 24, rx: 18, ry: 22, base: 2, k: 1.4, rim: 3 });
    // Brows: thin and slanted hard down to the nose.
    marks(g, 22, 22, ['BB.......', '.bBBBb...', '....bBBB.'], P);
    marks(g, 37, 22, ['.......BB', '...bBBBb.', '.BBBb....'], P);
    // Yellow eyes, slitted.
    marks(g, 24, 26, ['KKKKKKK.', 'KCIKIWKK', '.333333.'], P);
    marks(g, 38, 26, ['.KKKKKKK', 'KKCIKIWK', '.333333.'], P);
    // A long hooked nose.
    marks(
      g,
      33,
      28,
      ['.12...', '.12...', '.123..', '.1123.', '.11233', '.12234', '..2344', '..44..'],
      P,
    );
    // A wide grin of pointed teeth.
    marks(
      g,
      26,
      39,
      [
        '4.............4',
        '.4444444444444.',
        '.4TDTDTDTDTDT4.',
        '..4.T.T.T.T.4..',
        '...444444444...',
      ],
      P,
    );
  },
};

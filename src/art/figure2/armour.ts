/**
 * Body armour and coats at the C scale, every pixel by hand: the militia's
 * hide jerkin with its one bronze disc, the town guard's mail, the hunter's
 * laced leather and bracers, the captain's coat. (The knight's plate is in
 * knight.ts.) Each is drawn over the everyday tunic on the posed body, its
 * edges a step darker than the cloth beside them so it reads as worn over it.
 */
import { DEPTH } from '../depth';
import { hash } from '../town2/cells';
import type { Mat } from '../town2/ramps';
import { hold } from './clothes';
import { runs, type Gear2, type Line, type Part2, type Pins } from './engine';

const { ARMOUR, WRIST } = DEPTH;

/** Rows starting at column `x`, row `y`. */
const block = (
  x: number,
  y: number,
  depth: number,
  mat: Mat,
  rows: readonly string[],
  pins?: Pins,
): Part2 => ({
  at: [x, y],
  depth,
  mat,
  rows,
  pins,
});

// ------------------------------------------------------------------ bronze

/**
 * The militia's jerkin: stiff hide over the tunic, sleeveless, laced at the
 * shoulders, its skirt cut in tabs; one cast bronze disc over the heart.
 */
const BRONZE_JERKIN: Gear2 = {
  id: 'bronze_jerkin',
  slot: 'body',
  parts: [
    block(21, 23, ARMOUR, 'hide', [
      '..122.....334..',
      '.1222.....2334.',
      '.12221...12334.',
      '.122221.123334.',
      '.1222224223334.',
      '.1222222223334.',
      '.1222222223334.',
      '.1222222223334.',
      '.1222222223334.',
      '.122222223334..',
      '.122222223334..',
      '.122222223334..',
      '.122222223334..',
      '.1222222223334.',
      '.1222222223334.',
      '122222222233344',
      '122222222233344',
      '233333333344445',
      '123.122.223.344',
      '123.122.223.344',
      '344.344.344.455',
    ]),
    block(24, 28, ARMOUR + 1, 'bronze', ['.012.', '01123', '12234', '12344', '.344.']),
  ],
};

// -------------------------------------------------------------------- iron

/**
 * One row of mail: rings catch the light in rows, every other ring on a lit
 * row a step brighter, the rows between a step darker, the far side of the
 * body a step darker again.
 */
function mailRow(y: number, x0: number, x1: number, turn: number): Line {
  let s = '';
  for (let x = x0; x <= x1; x++) {
    const side = x === x0 ? 0 : x >= x1 - 1 ? 2 : x >= turn ? 1 : 0;
    // Rings in offset rows: a ring's lit top, its shadowed underside, the next row's ring between.
    const ring = (x + (Math.floor(y / 2) % 2)) % 2 === 0;
    const top = y % 2 === 0;
    const weave = (ring ? (top ? 0 : 1) : top ? 1 : 0) + (y % 4 === 3 ? 1 : 0);
    s += String(Math.max(0, Math.min(4, 1 + side + weave + mailForm(x, y))));
  }
  return [y, [x0, s]];
}

/**
 * Light on mail follows the body under it, not the weave: the chest catches
 * the sun high on its near side (a bright patch, a few rings at a glint), the
 * rings go dark under the chest and under the arm, the skirt below the belt
 * hangs in two folds (a lit column, then a dark one), and here and there a
 * ring sits crooked and drops a step, so no row is a perfect repeat.
 */
function mailForm(x: number, y: number): number {
  const chest = ((x - 25) / 3.2) ** 2 + ((y - 28) / 2.6) ** 2;
  let f = chest < 1 ? -1 : 0;
  if (chest < 0.3 && (x + y) % 2 === 0) f = -2;
  if (y >= 32 && y <= 34 && x >= 27) f += 1;
  if (x >= 31 && y >= 26 && y <= 31) f += y === 26 || x >= 33 ? 1 : 0;
  if (y >= 39) {
    if (x === 23 || x === 30) f -= 1;
    if (x === 24 || x === 31 || x === 32) f += 1;
  }
  if (hash(x, y, 7) < 0.12) f += 1;
  return f;
}
const mail = (shape: readonly (readonly [number, number, number, number?])[]): Line[] =>
  shape.map(([y, x0, x1, turn]) => mailRow(y, x0, x1, turn ?? Math.round(x0 + (x1 - x0) * 0.62)));

/**
 * The town guard's mail: a shirt of rings to the thigh over the tunic,
 * sleeves to the elbow, hemmed in a dark row; one metal, no gold.
 */
const IRON_MAIL: Gear2 = {
  id: 'iron_mail',
  slot: 'body',
  parts: [
    runs(
      ARMOUR,
      [
        [22, [24, '23'], [31, '34']],
        ...mail([
          [23, 23, 25],
          [24, 22, 25],
          [25, 22, 26],
          [26, 22, 27],
        ]),
        [23, [31, '3344']],
        [24, [31, '33344']],
        [25, [30, '334344']],
        [26, [29, '4343434']],
        ...mail([
          [27, 22, 34],
          [28, 22, 34],
          [29, 22, 34],
          [30, 22, 34],
          [31, 22, 34],
          [32, 22, 33],
          [33, 22, 33],
          [34, 22, 33],
          [35, 22, 33],
          [36, 22, 34],
          [37, 22, 34],
          [38, 21, 35],
          [39, 21, 35],
          [40, 21, 35],
          [41, 20, 35],
          [42, 20, 35],
          [43, 20, 36],
        ]),
        [44, [20, '34444444444444445']],
        [27, [28, '4']],
      ],
      { mat: 'iron' },
    ),
    runs(
      ARMOUR + 0.5,
      [
        ...mail([
          [25, 19, 22],
          [26, 18, 22],
          [27, 17, 22],
          [28, 16, 22],
          [29, 16, 21],
          [30, 16, 21],
          [31, 16, 21],
          [32, 16, 21],
          [33, 16, 21],
        ]),
        [34, [16, '344445']],
      ],
      { mat: 'iron' },
    ),
    runs(
      ARMOUR + 0.5,
      [
        ...mail([
          [24, 34, 36, 35],
          [25, 34, 37, 35],
          [26, 34, 38, 36],
          [27, 35, 39, 37],
          [28, 35, 39, 37],
          [29, 36, 40, 38],
          [30, 36, 40, 38],
          [31, 37, 41, 39],
          [32, 37, 41, 39],
        ]),
        [33, [38, '34445']],
      ],
      { mat: 'iron' },
    ),
  ],
};

// ----------------------------------------------------------------- leather

const CORD: Pins = { c: ['linen', 1], C: ['linen', 3] };

/**
 * The hunter's jerkin: tan leather laced up the front with linen cord, a
 * pieced yoke over the shoulders, the skirt cut in tabs. No metal.
 */
const LEATHER_JERKIN: Gear2 = {
  id: 'leather_jerkin',
  slot: 'body',
  parts: [
    block(
      21,
      23,
      ARMOUR,
      'tan',
      [
        '..122.....334..',
        '.12222...23334.',
        '.122221.233334.',
        '.1222212133334.',
        '.444444c4444445',
        '.122223C2233334',
        '.12222c3c233334',
        '.122223C2233334',
        '.12222c3c23334.',
        '.12223C223334..',
        '.1222c3c23334..',
        '.12223C223334..',
        '.1222c3c23334..',
        '.1222232223334.',
        '.1222232223334.',
        '122222232233344',
        '233333343344445',
        '1223.1223.12334',
        '1223.1223.12334',
        '1223.1223.12334',
        '3444.3444.34445',
      ],
      CORD,
    ),
  ],
};

/** Laced bracers on both forearms; the near one in each pose of the arm. */
const BRACER_PINS: Pins = { c: ['linen', 1] };
const LEATHER_BRACERS: Gear2 = {
  id: 'leather_bracers',
  slot: 'wrist',
  parts: [
    hold(block(16, 35, WRIST, 'tan', ['.1234', '1c234', '12c34', '1c235'], BRACER_PINS)),
    block(36, 34, WRIST, 'tan', ['..12334', '.1c2334', '12c234', '1c234'], BRACER_PINS),
  ],
};

// ----------------------------------------------------------- the captain's

const BRASS: Pins = { b: ['bronze', 1], B: ['bronze', 3], g: ['bronze', 0] };

/**
 * Brinebeard's coat: long and purple, open down the front over the tunic,
 * braided in brass along its edges and at the cuffs, its skirts to the knee.
 * The belt goes over it.
 */
const CAPTAINS_COAT: Gear2 = {
  id: 'captains_coat',
  slot: 'body',
  parts: [
    block(
      19,
      22,
      ARMOUR,
      'midnight',
      [
        '.....12b......B34....',
        '...1122b......B3344..',
        '..11222b......B33344.',
        '..112222b....B333344.',
        '..1122222b..B3333344.',
        '...122222b..B333344..',
        '...122222b..B333344..',
        '...122222b..B333344..',
        '...122222b..B333344..',
        '...12222b....B33344..',
        '...12222b....B33344..',
        '...12222b....B33344..',
        '...12222b....B33344..',
        '...12222b....B333344.',
        '...12222b....B333344.',
        '..122222b....B333344.',
        '..122222b....B333344.',
        '..122223b....B3433344',
        '..122232b....B3343344',
        '.1222322b....B3343344',
        '.1223222b....B3334344',
        '.1223222b....B3334344',
        '.1232222b....B3333434',
        '.1232222b....B3333434',
        '12322222b....B3333434',
        '12322222b....B3333344',
        '12322222b....B3333344',
        '12222222b....B3333344',
        '12222222b....B3333344',
        '12222222b....B3333344',
        '12222222b....B3333344',
        '12222222b....B3333344',
        'bbbbbbbbb....BBBBBBBB',
      ],
      BRASS,
    ),
    // Sleeves to the wrist with brass cuffs: the far one, the near one in each pose.
    block(
      33,
      24,
      ARMOUR + 0.5,
      'midnight',
      [
        '.1223',
        '.12334',
        '.122334',
        '..122334',
        '..122334',
        '...122334',
        '...122334',
        '....122334',
        '....122334',
        '.....12334',
        '.....12334',
        '....bbBBB',
        '...bbBBB',
        '..bbBBB',
      ],
      BRASS,
    ),
    block(
      16,
      25,
      ARMOUR + 0.5,
      'midnight',
      [
        '...1112',
        '..11122',
        '.111223',
        '1112223',
        '111223',
        '111223',
        '111223',
        '111223',
        '112233',
        '112233',
      ],
      BRASS,
    ),
    hold(block(16, 35, ARMOUR + 0.5, 'midnight', ['.1223', '.1223', 'bbbB'], BRASS)),
  ],
};

export const ARMOUR2: readonly Gear2[] = [
  BRONZE_JERKIN,
  IRON_MAIL,
  LEATHER_JERKIN,
  LEATHER_BRACERS,
  CAPTAINS_COAT,
];

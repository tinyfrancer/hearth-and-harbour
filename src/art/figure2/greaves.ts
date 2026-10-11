/**
 * Leg armour from the smithy (B13): the militia's bronze greaves and the town
 * guard's iron ones, worn over the trousers and the boots' tops, under every
 * skirt, tabard and coat. Bronze is a shin plate with a domed knee cop and
 * two hide straps; iron a wider, ridged plate with a knee cop of two lames on
 * leather straps, so the ladder reads at the shins as it does at the chest.
 *
 * Each is drawn three ways: from the front by hand (both legs; the walk bends
 * them with the legs), from behind (the plates' edges wrapping the calf and
 * the straps across it, the knee cop's rim only), and in profile as stretches
 * of the shin (`SideCover`s laid along the leg's bones, the straps their own
 * short stretches) with the knee cop riding on the knee.
 *
 * The art slot is `knees`, the knight's knee cops' own, so the everyday
 * trousers stay on under them (the game wears them in its legs slot, which
 * replaces trousers; the art draws the trousers it finds or the everyday ones).
 */
import { DEPTH } from '../depth';
import type { Mat } from '../town2/ramps';
import type { Gear2, Part2, Pins } from './engine';
import type { Cover } from './rig2';

/** Over the boots' tops (`FEET`), under every shirt, skirt and coat. */
const GREAVE = DEPTH.FEET + 1;

const part = (x: number, y: number, mat: Mat, rows: readonly string[], pins: Pins): Part2 => ({
  at: [x, y],
  depth: GREAVE,
  mat,
  rows,
  pins,
});

const HIDE: Pins = { h: ['hide', 2], H: ['hide', 4] };
const STRAP: Pins = { h: ['leather', 2], H: ['leather', 4] };

// The near leg is columns 21 to 27 (the shin from row 54, the knee 50 to 53),
// the far, eased leg 30 to 35 (its knee a column in); boots begin at row 61.
// B17: each plate stops a few rows above the boot's top, so a band of the
// boot's leather shows between plate and foot (at true size a plate down to
// the foot read as a tall metal boot).

/** Bronze: a domed cop over the knee, a shin plate lit down its ridge, two hide straps. */
const BRONZE_NEAR = part(
  21,
  50,
  'bronze',
  [
    '..001..',
    '.01123.',
    '.11234.',
    '.34455.',
    '.10233.',
    'hhhhhHH',
    '.10234.',
    '.11234.',
    'hhhhhHH',
    '.12234.',
    '.44455.',
  ],
  HIDE,
);
const BRONZE_FAR = part(
  29,
  51,
  'bronze',
  [
    '..012.',
    '.11234',
    '.34455',
    '..1234',
    '.hhhhH',
    '..1234',
    '..1234',
    '.hhhhH',
    '..1234',
    '..4455',
  ],
  HIDE,
);

/** Iron: a cop of two lames with a fan, a plate as wide as the shin with a ridge, leather straps. */
const IRON_NEAR = part(
  21,
  49,
  'iron',
  [
    '..012..',
    '.01123.',
    '0112334',
    '4445555',
    '.01233.',
    '.44555.',
    '0102334',
    'h10233H',
    '1102334',
    '1112334',
    'h12233H',
    '4445555',
  ],
  STRAP,
);
const IRON_FAR = part(
  29,
  50,
  'iron',
  [
    '..0123',
    '.11233',
    '.44555',
    '..1233',
    '..4455',
    '.10234',
    '.h023H',
    '.11234',
    '.12234',
    '.h223H',
    '.44555',
  ],
  STRAP,
);

/**
 * From behind: the calf, so only the plates' edges where they wrap round, the
 * straps across, and the cop's rim either side of the knee's hollow. Drawn in
 * front coordinates; the back view mirrors and re-lights it (views.ts).
 */
const backOf = (front: Part2): Part2 => {
  const rows = front.rows.map((row) => {
    if (/[hH]/.test(row)) return row;
    const chars = [...row];
    const xs = chars.map((c, i) => (c === '.' ? -1 : i)).filter((i) => i >= 0);
    if (!xs.length) return row;
    const a = xs[0]!;
    const b = xs[xs.length - 1]!;
    return chars.map((_c, i) => (i === a ? '2' : i === b ? '4' : '.')).join('');
  });
  return { ...front, rows };
};

export const GREAVES2: readonly Gear2[] = [
  { id: 'bronze_greaves', slot: 'knees', parts: [BRONZE_NEAR, BRONZE_FAR] },
  { id: 'iron_greaves', slot: 'knees', parts: [IRON_NEAR, IRON_FAR] },
];

/** Each greave's back, by gear id and part index (views.ts). */
export const GREAVES_BACK: Readonly<Record<string, readonly Part2[]>> = {
  bronze_greaves: [backOf(BRONZE_NEAR), backOf(BRONZE_FAR)],
  iron_greaves: [backOf(IRON_NEAR), backOf(IRON_FAR)],
};

/**
 * In profile: stretches of the shin, measured from the hip (the knee is at 12,
 * the ankle at 23, a boot's shaft from 15), laid after the boots so the plate
 * is over the boot's top; the straps are their own short stretches.
 */
export interface SideGreaves {
  readonly covers: readonly Cover[];
  readonly cop: readonly string[];
  readonly mat: Mat;
}

const plate = (mat: Mat, from: number, to: number): Cover => ({
  mat,
  from,
  to,
  bulk: 1,
  pattern: 'plate',
  steps: [1, 2, 3, 4],
});
const strap = (mat: Mat, at: number): Cover => ({
  mat,
  from: at,
  to: at + 1,
  bulk: 1,
  steps: [2, 3, 4, 4],
});

export const GREAVES_SIDE: Readonly<Record<string, SideGreaves>> = {
  bronze_greaves: {
    mat: 'bronze',
    covers: [
      plate('bronze', 13, 15),
      strap('hide', 15),
      plate('bronze', 16, 18),
      strap('hide', 18),
      { ...plate('bronze', 19, 20), hem: true },
    ],
    cop: ['.012.', '01123', '12334', '.445.'],
  },
  iron_greaves: {
    mat: 'iron',
    covers: [
      plate('iron', 13, 16),
      strap('leather', 16),
      plate('iron', 17, 18),
      strap('leather', 18),
      { ...plate('iron', 19, 20), bulk: 2, hem: true },
    ],
    cop: ['.0112.', '011223', '444555', '.1223.', '.4455.'],
  },
};

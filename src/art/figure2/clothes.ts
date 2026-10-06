/**
 * What everyone wears under their gear at the C scale, and the cloth on the
 * ladder's first rungs: the everyday teal tunic, grey trousers, boots and
 * belt; the linen villager's tunic, trousers and hood; the hunter's leather.
 *
 * Cloth is flat where it hangs flat: a lit column down its left, its shadow
 * down its right, and folds only where it is pulled or gathered (under the
 * belt, at the elbow, from the knee), each widening as it falls. Parts that
 * cover the weapon forearm come in two poses (`pose`), the hand closed or at
 * rest.
 */
import { DEPTH } from '../depth';
import type { Mat } from '../town2/ramps';
import { cloth, runs, type Extent, type Gear2, type Part2 } from './engine';

const { LEGS, FEET, SHIRT, BELT } = DEPTH;

/** A part worn only in one pose of the weapon arm. */
export type Posed = Part2 & { readonly pose?: 'hold' | 'ease' };
export const hold = (p: Part2): Posed => ({ ...p, pose: 'hold' });
export const ease = (p: Part2): Posed => ({ ...p, pose: 'ease' });

const rows = (a: number, b: number, x0: number, x1: number): Extent[] =>
  Array.from({ length: b - a + 1 }, (_, i): Extent => [a + i, x0, x1]);

// ------------------------------------------------------- shapes everyone shares

/**
 * The torso of a shirt or tunic, collar to the hem at mid-thigh: sloped
 * shoulders, a waist the belt pulls in, a skirt flaring to the hem, which
 * hangs a row lower on the eased side.
 */
export const TORSO: readonly Extent[] = [
  [22, 24, 25],
  [22, 31, 32],
  [23, 23, 25],
  [23, 31, 34],
  [24, 22, 25],
  [24, 31, 35],
  [25, 21, 26],
  [25, 30, 35],
  [26, 21, 27],
  [26, 29, 35],
  ...rows(27, 31, 21, 35),
  ...rows(32, 35, 22, 33),
  ...rows(36, 37, 22, 34),
  ...rows(38, 40, 21, 35),
  ...rows(41, 43, 20, 35),
  ...rows(44, 45, 20, 36),
  [46, 27, 36],
];
/** The folds a belt pulls into a tunic: short above it, spreading below it to the hem. */
const BELTED: readonly (readonly (readonly [number, number])[])[] = [
  [
    [33, 25],
    [34, 25],
    [35, 25],
  ],
  [
    [33, 29],
    [34, 29],
    [35, 29],
  ],
  [
    [38, 24],
    [39, 24],
    [40, 23],
    [41, 23],
    [42, 23],
    [43, 22],
    [44, 22],
    [45, 22],
  ],
  [
    [38, 28],
    [39, 28],
    [40, 28],
    [41, 28],
    [42, 28],
    [43, 28],
    [44, 28],
    [45, 28],
  ],
  [
    [38, 32],
    [39, 32],
    [40, 33],
    [41, 33],
    [42, 33],
    [43, 34],
    [44, 34],
    [45, 34],
  ],
];
/** The neck's opening, a V with a lit lip on its shadow side. */
const V_NECK: readonly (readonly [number, number, number])[] = [
  [25, 24, 1],
  [26, 25, 1],
  [27, 26, 1],
  [28, 27, 3],
  [31, 24, 4],
  [30, 25, 4],
  [29, 26, 4],
];

/** The near sleeve, shoulder to elbow, the same in both poses. */
export const NEAR_SLEEVE_UPPER: readonly Extent[] = [
  [25, 20, 22],
  [26, 19, 22],
  [27, 18, 22],
  [28, 17, 22],
  ...rows(29, 32, 17, 21),
  ...rows(33, 34, 16, 21),
];
/** On to the wrist, the hand closed at the hip... */
export const NEAR_SLEEVE_HOLD: readonly Extent[] = [
  [35, 17, 20],
  [36, 17, 20],
  [37, 16, 19],
];
/** ...or resting on the belt. */
export const NEAR_SLEEVE_EASE: readonly Extent[] = [
  [35, 17, 21],
  [36, 19, 22],
  [37, 21, 22],
];
/** The far sleeve: out to the elbow and back in to the wrist at the hip. */
export const FAR_SLEEVE: readonly Extent[] = [
  [24, 34, 36],
  [25, 34, 37],
  [26, 34, 38],
  ...rows(27, 28, 35, 39),
  ...rows(29, 30, 36, 40),
  ...rows(31, 32, 37, 41),
  ...rows(33, 34, 38, 42),
  [35, 37, 41],
  [36, 36, 39],
  [37, 35, 38],
];

// ------------------------------------------------------------ the everyday

const tunic = (id: string, mat: Mat, steps?: readonly [number, number, number, number]): Gear2 => ({
  id,
  slot: 'shirt',
  parts: [
    cloth(SHIRT, mat, TORSO, { steps, folds: BELTED, hems: [45, 46], fix: V_NECK, turn: 0.7 }),
    cloth(SHIRT + 0.5, mat, FAR_SLEEVE, { steps, hems: [37], turn: 0.5 }),
    cloth(SHIRT + 0.5, mat, NEAR_SLEEVE_UPPER, { steps, turn: 0.55 }),
    hold(cloth(SHIRT + 0.5, mat, NEAR_SLEEVE_HOLD, { steps, hems: [37] })),
    ease(cloth(BELT + 0.3, mat, NEAR_SLEEVE_EASE, { steps, hems: [37] })),
  ],
});

/**
 * The villager's linen tunic: undyed, its sleeves rolled above the elbow so
 * the forearms are bare, a drawstring at the neck. A step darker than the
 * hood and a step lighter than the trousers, so linen never sits on linen.
 */
const LINEN_TUNIC: Gear2 = {
  id: 'linen_tunic',
  slot: 'shirt',
  parts: [
    cloth(SHIRT, 'linen', TORSO, {
      steps: [1, 2, 3, 4],
      folds: BELTED,
      hems: [45, 46],
      turn: 0.7,
      fix: [...V_NECK, [27, 25, 4], [29, 25, 4], [27, 26, 3], [29, 27, 4]],
    }),
    cloth(
      SHIRT + 0.5,
      'linen',
      FAR_SLEEVE.filter(([y]) => y <= 32),
      { turn: 0.5, hems: [31] },
    ),
    cloth(
      SHIRT + 0.6,
      'linen',
      [
        [31, 37, 41],
        [32, 37, 42],
      ],
      { steps: [1, 1, 2, 3], hems: [32] },
    ),
    cloth(
      SHIRT + 0.5,
      'linen',
      NEAR_SLEEVE_UPPER.filter(([y]) => y <= 31),
      { turn: 0.55, hems: [30] },
    ),
    cloth(
      SHIRT + 0.6,
      'linen',
      [
        [31, 16, 21],
        [32, 16, 21],
      ],
      { steps: [1, 1, 2, 3], hems: [32] },
    ),
  ],
};
/** The legs: the near one straight under the weight, the far one eased, its knee in. */
export const LEGS_SHAPE: readonly Extent[] = [
  ...rows(44, 50, 21, 28),
  ...rows(51, 53, 21, 27),
  ...rows(54, 60, 21, 27),
  ...rows(44, 50, 29, 35),
  ...rows(51, 53, 29, 34),
  ...rows(54, 60, 30, 35),
];
const trousers = (
  id: string,
  mat: Mat,
  steps?: readonly [number, number, number, number],
): Gear2 => ({
  id,
  slot: 'legs',
  parts: [
    cloth(LEGS, mat, LEGS_SHAPE, {
      steps,
      folds: [
        [
          [51, 31],
          [52, 31],
          [53, 32],
        ],
        [
          [57, 24],
          [58, 25],
        ],
      ],
      fix: [
        [28, 44, 4],
        [29, 44, 4],
        [22, 52, 1],
        [30, 52, 1],
      ],
    }),
  ],
});

const BOOTS: Part2 = runs(
  FEET,
  [
    [61, [21, '0112234'], [30, '011234']],
    [62, [21, '1222334'], [30, '122334']],
    [63, [21, '1222334'], [30, '1222334']],
    [64, [20, '12222334'], [30, '1222334']],
    [65, [20, '12222334'], [29, '122223344']],
    [66, [20, '01222334'], [29, '012223344']],
    [67, [20, '11223344'], [29, '112233344']],
    [68, [20, '44444455'], [29, '444444455']],
    [69, [20, '55555555'], [29, '555555555']],
  ],
  { mat: 'leather' },
);

const BELT_PART: Part2 = runs(
  BELT,
  [
    [36, [22, '1222'], [26, 'ggggg']],
    [37, [22, '3333'], [26, 'gGhGg'], [31, '2334']],
    [38, [26, 'gGGGg'], [31, '3445']],
  ],
  { mat: 'leather', pins: { g: ['gold', 2], G: ['gold', 4], h: ['leather', 5] } },
);

export const CLOTHES2: readonly Gear2[] = [
  tunic('teal_tunic', 'teal'),
  LINEN_TUNIC,
  trousers('grey_trousers', 'cloth'),
  trousers('linen_trousers', 'linen', [2, 3, 3, 4]),
  { id: 'leather_boots', slot: 'feet', parts: [BOOTS] },
  { id: 'leather_belt', slot: 'belt', parts: [BELT_PART] },
];

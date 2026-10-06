/**
 * Small things at the C scale, each by hand and findable on any outfit:
 * what hangs at the collar (shells, the trollstone, a wolf's tooth), the
 * shell bracelet at the weapon wrist (in each pose of the arm), and the
 * quivers on the back with their strap across the chest.
 *
 * Shells are cream and rose, never peach, uneven in size, hanging from a dark
 * cord; at the wrist they hang on the side towards the body, clear of the
 * fist and of anything held in front of the forearm.
 */
import { DEPTH } from '../depth';
import type { Mat } from '../town2/ramps';
import { ON_BELT } from './body';
import { ease, hold } from './clothes';
import { runs, type Gear2, type Part2, type Pins } from './engine';

const { JEWELLERY, WRIST, QUIVER, ARMOUR, BELT } = DEPTH;

const at = (
  x: number,
  y: number,
  depth: number,
  rows: readonly string[],
  pins: Pins,
  mat?: Mat,
): Part2 => ({
  at: [x, y],
  depth,
  rows,
  pins,
  mat,
});

const CORD: Pins = { k: ['leather', 4], K: ['leather', 5] };
const SHELL: Pins = { ...CORD, a: ['shell', 1], b: ['shell', 2], c: ['shell', 3], d: ['shell', 4] };

/** Two shells of different sizes on a cord round the neck. */
const SHELL_NECKLACE: Gear2 = {
  id: 'shell_necklace',
  slot: 'neck',
  parts: [
    at(24, 23, JEWELLERY, ['k.......K', '.k.....K.', '..kabkK..', '..bcd.a..', '...d..c..'], SHELL),
  ],
};

/** The trollstone: a grey pebble on a thong at the collar. */
const TROLLSTONE: Gear2 = {
  id: 'trollstone',
  slot: 'neck',
  parts: [
    at(
      24,
      23,
      JEWELLERY,
      ['k.......K', '.k.....K.', '..kk.KK..', '...123...', '...234...', '....4....'],
      CORD,
      'stone',
    ),
  ],
};

/** A wolf's tooth on a cord at the collar. */
const HUNTERS_CHARM: Gear2 = {
  id: 'hunters_charm',
  slot: 'neck',
  parts: [
    at(
      24,
      23,
      JEWELLERY,
      ['k.......K', '.k.....K.', '..kk.KK..', '....1....', '....12...', '....2....', '....3....'],
      CORD,
      'linen',
    ),
  ],
};

/** Shells on a cord round the weapon wrist: below the cuff with the fist closed, by the belt at rest. */
const SHELL_BRACELET: Gear2 = {
  id: 'shell_bracelet',
  slot: 'wrist',
  parts: [
    hold(at(16, 38, WRIST, ['kkKKab', '....cb', '.....d'], SHELL)),
    ease(at(20, 36, ON_BELT + 0.1, ['ka', 'kb', 'Kc', '.d'], SHELL)),
  ],
};

/**
 * A quiver on the back: arrows' fletchings and the quiver's mouth over the
 * far shoulder, the strap across the chest to the near hip.
 */
const quiver = (id: string, fletch: Mat): Gear2 => ({
  id,
  slot: 'back',
  parts: [
    at(
      34,
      13,
      QUIVER,
      [
        '.a..a.',
        'ab.ab.a',
        'abcabcab',
        '.bcabcbc',
        '..s.s.cs',
        '..ss.ss.',
        'OOOOOOO',
        'O1223345',
        '122334',
        '12334',
        '1234',
      ],
      { a: [fletch, 1], b: [fletch, 2], c: [fletch, 4], s: ['wood', 3], O: ['leather', 4] },
      'leather',
    ),
    runs(
      BELT - 0.5,
      [
        [24, [32, '23']],
        [25, [31, '23']],
        [26, [30, '23']],
        [27, [29, '23']],
        [28, [28, '23']],
        [29, [27, '23']],
        [30, [26, '23']],
        [31, [25, '23']],
        [32, [24, '23']],
        [33, [23, '23']],
        [34, [22, '23']],
        [35, [22, '3']],
      ],
      { mat: 'leather' },
    ),
  ],
});

export const TRINKETS2: readonly Gear2[] = [
  SHELL_NECKLACE,
  TROLLSTONE,
  HUNTERS_CHARM,
  SHELL_BRACELET,
  quiver('arrow_quiver', 'linen'),
  quiver('barbed_quiver', 'crimson'),
];
void ARMOUR;

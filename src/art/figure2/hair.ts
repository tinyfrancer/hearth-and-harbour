/**
 * Hairstyles for the C-scale head (body.ts, `HEAD`), drawn in the `hair`
 * ramp; a look swaps it for its colour. As at the current scale, each style
 * is a crown (what a helmet or hood covers: the top of the head and the
 * fringe) and what hangs below it (locks beside the face, a curtain behind
 * the shoulders, a braid), so under head gear only what hangs is worn and
 * nothing pokes through. Hair never covers an eye or a brow, and sits a pixel
 * proud of the skull so it reads as hair, not paint.
 *
 * Rows share the head's 15 columns from `HEAD_AT` (the middle one is the
 * face's centre line); a hang may reach wider and lower.
 */
import { DEPTH } from '../depth';
import { HEAD_AT } from './body';
import type { Gear2, Part2 } from './engine';

const { HAIR, HAIR_BACK, HAIR_OVER } = DEPTH;
const [HX, HY] = HEAD_AT;

const at = (rows: readonly string[], depth: number, dx = 0, dy = 0): Part2 => ({
  at: [HX + dx, HY + dy],
  depth,
  mat: 'hair',
  rows,
  cast: depth !== HAIR_BACK,
});

/** Short (the default): cropped at the sides, a broken fringe, a parting and a tuft. */
const SHORT = at(
  [
    '....01122.33...',
    '..00111222333..',
    '.0011121222334.',
    '012111222233345',
    '122.12.23.3.345',
    '12...........45',
    '2.............5',
  ],
  HAIR,
);

/** Long, parted in the middle: a curtain each side of the face, over the ears, onto the shoulders. */
const LONG_CROWN = at(
  ['....0112333....', '..00111233334..', '.0010112233344.', '001011212333445', '011.........345'],
  HAIR,
);
const LONG_LOCKS = at(
  [
    '122...........345',
    '112...........345',
    '122...........345',
    '122...........445',
    '112...........345',
    '1222.........3345',
    '1122.........3445',
    '11222.......33445',
    '12222.......34445',
    '112222.....334445',
    '122222.....344445',
    '112222.....334445',
    '1222.........3445',
    '122...........445',
    '12.............45',
    '1...............5',
  ],
  HAIR,
  -1,
  5,
);
/** Behind the neck, between the locks, in shadow. */
const LONG_BACK = at(
  ['.3444444444443.', ...Array.from({ length: 11 }, () => '344444444444445')],
  HAIR_BACK,
  0,
  10,
);

/** A braid: pulled back from a high, clean hairline, plaited over the far shoulder. */
const BRAID_CROWN = at(
  [
    '....0112333....',
    '..01112223334..',
    '.0111222233344.',
    '0112.......3345',
    '01..........345',
    '1.............4',
    '1.............4',
  ],
  HAIR,
);
const BRAID = at(
  [
    '..34',
    '.344',
    '.23.',
    '123.',
    '232.',
    '.23.',
    '123.',
    '232.',
    '.23.',
    '123.',
    '232.',
    '.23.',
    '.123',
    '.232',
    '..23',
    '.123',
    '.232',
    '..23',
    '.123',
    '.232',
    '..5.',
    '.234',
    '.1.3',
  ],
  HAIR_OVER,
  12,
  8,
);

/** Shaggy: tufts on the crown, a jagged fringe, locks over the ears to the cheek. */
const SHAGGY_CROWN = at(
  ['...0.012.23.3..', '..011112223334.', '.00111222233344', '001121222333445', '0112122.1223345'],
  HAIR,
);
const SHAGGY_LOCKS = at(
  ['12...........45', '12...........45', '12...........34', '1.............4', '2.............5'],
  HAIR,
  0,
  5,
);
const SHAGGY_BACK = at(
  Array.from({ length: 7 }, () => '.4444444444444.'),
  HAIR_BACK,
  0,
  10,
);

export const HAIR2: readonly Gear2[] = [
  { id: 'short_hair', slot: 'hair', parts: [SHORT] },
  { id: 'long_hair', slot: 'hair', parts: [LONG_CROWN, LONG_LOCKS, LONG_BACK] },
  { id: 'long_hair_under', slot: 'hair', parts: [LONG_LOCKS, LONG_BACK] },
  { id: 'braid_hair', slot: 'hair', parts: [BRAID_CROWN, BRAID] },
  { id: 'braid_hair_under', slot: 'hair', parts: [BRAID] },
  { id: 'shaggy_hair', slot: 'hair', parts: [SHAGGY_CROWN, SHAGGY_LOCKS, SHAGGY_BACK] },
  { id: 'shaggy_hair_under', slot: 'hair', parts: [SHAGGY_LOCKS, SHAGGY_BACK] },
];

/** Every hairstyle by its look id: the whole style, and what still shows under head gear. */
export const HAIRSTYLES2: Readonly<Record<string, { gear: string | null; under: string | null }>> =
  {
    short: { gear: 'short_hair', under: null },
    long: { gear: 'long_hair', under: 'long_hair_under' },
    braid: { gear: 'braid_hair', under: 'braid_hair_under' },
    shaggy: { gear: 'shaggy_hair', under: 'shaggy_hair_under' },
    bald: { gear: null, under: null },
  };

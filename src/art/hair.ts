/**
 * Hairstyles for the standard body, drawn to its head (rows 1 to 12, columns
 * 13 to 24 of the figure canvas). Hair is drawn in the `hair` steps; the
 * character's hair colour swaps that ramp for another (character.ts), and the
 * brows, drawn in the same steps on the body, follow it.
 *
 * Each style is a crown (what a helmet or hood covers: the top of the head
 * and the fringe) and what hangs below it (locks beside the face, the mass
 * behind the neck, a braid). Under a helmet or hood only what hangs is worn,
 * so hair never pokes through; the helmet is drawn over the hanging hair's
 * top, so it seems to come out from under the rim.
 */
import { DEPTH } from './depth';
import type { FigurePart, GearDef } from './figure';

export interface Hairstyle {
  readonly id: string;
  readonly name: string;
  /** The whole style; null for none. */
  readonly gear: string | null;
  /** What still shows under a helmet or hood; null for nothing. */
  readonly under: string | null;
}

const LONG_HANG: readonly FigurePart[] = [
  {
    // Behind the neck and jaw, in shadow.
    at: [13, 8],
    depth: DEPTH.HAIR_BACK,
    rows: [
      'HHHHHHHHHHHH',
      'HHHHHHHHHHHH',
      'HHHHHHHHHHHH',
      'HHHHHHHHHHHH',
      'HHHHHHHHHHHH',
      'HHHHHHHHHHHH',
      'HHHHHHHHHHHH',
    ],
  },
  {
    // Straight locks beside the face, lying on the shoulders.
    at: [11, 7],
    depth: DEPTH.HAIR,
    rows: [
      '.hh..........HH',
      '.hh..........HH',
      '.ih..........hH',
      '.ih..........hH',
      '.hh..........hH',
      '.hhh........hhH',
      'hhhh........hhHH',
      'hihh........hHHH',
      'hhh..........HHH',
      'h.h..........H.H',
    ],
  },
];

const LONG_CROWN: FigurePart = {
  // Parted a little left of centre, framing the forehead.
  at: [11, 0],
  depth: DEPTH.HAIR,
  rows: [
    '.....hhhhhh',
    '...hhiiHhhhhhH',
    '..hhiihHhhhhhHH',
    '.hhihhhHhhhhhHH',
    '.hhihh....hhhHH',
    '.hhhh......hhHH',
    '.hhh........hHH',
  ],
};

const BRAID_HANG: readonly FigurePart[] = [
  {
    // Gathered behind the ear and brought forward over the shoulder.
    at: [23, 7],
    depth: DEPTH.HAIR_OVER,
    rows: [
      '.hH',
      '.hH',
      '.hHH',
      '.ihH',
      '.hHh',
      '.ihH',
      '.hHh',
      '.ihH',
      'hHh',
      'ihH',
      'hHh',
      'ihH',
      'hHh',
      'fOf',
      'hhH',
      'h.H',
    ],
  },
];

const BRAID_CROWN: FigurePart = {
  // Pulled back from the face: a high, clean hairline and no fringe.
  at: [13, 0],
  depth: DEPTH.HAIR,
  rows: [
    '...hhhhhh',
    '.hhiihhhhhhH',
    'hhiihhhhhhHH',
    'hhh......hHH',
    'hh........HH',
    'h..........H',
    'h..........H',
  ],
};

const SHAGGY_HANG: readonly FigurePart[] = [
  {
    at: [13, 8],
    depth: DEPTH.HAIR_BACK,
    rows: ['HHHHHHHHHHHH', 'HHHHHHHHHHHH', 'HHHHHHHHHHHH', 'HHHHHHHHHHHH', 'HHHHHHHHHHHH'],
  },
  {
    // To the jaw, cut ragged.
    at: [12, 7],
    depth: DEPTH.HAIR,
    rows: [
      'hh..........HH',
      'hh..........HH',
      'ih..........hH',
      'hh..........HH',
      'hhh........hHH',
      'h.hh......hH.H',
    ],
  },
];

const SHAGGY_CROWN: FigurePart = {
  // A fringe swept to one side.
  at: [12, 0],
  depth: DEPTH.HAIR,
  rows: [
    '....hhhhhh',
    '..hhiihhhhhhH',
    '.hhiihhhhhhHHH',
    'hhhihhhhhhhhHH',
    'hhhhhhhh..hhHH',
    'hhhhh......hHH',
    'hh..........HH',
  ],
};

export const HAIRSTYLE_GEAR: readonly GearDef[] = [
  { id: 'long_hair', slot: 'hair', parts: [LONG_CROWN, ...LONG_HANG] },
  { id: 'long_hair_under', slot: 'hair', parts: LONG_HANG },
  { id: 'braid_hair', slot: 'hair', parts: [BRAID_CROWN, ...BRAID_HANG] },
  { id: 'braid_hair_under', slot: 'hair', parts: BRAID_HANG },
  { id: 'shaggy_hair', slot: 'hair', parts: [SHAGGY_CROWN, ...SHAGGY_HANG] },
  { id: 'shaggy_hair_under', slot: 'hair', parts: SHAGGY_HANG },
];

/** Every hairstyle, the default first. `short_hair` is the approved hero's (wardrobe.ts). */
export const HAIRSTYLES: readonly Hairstyle[] = [
  { id: 'short', name: 'Short', gear: 'short_hair', under: null },
  { id: 'long', name: 'Long', gear: 'long_hair', under: 'long_hair_under' },
  { id: 'braid', name: 'Braid', gear: 'braid_hair', under: 'braid_hair_under' },
  { id: 'shaggy', name: 'Shaggy', gear: 'shaggy_hair', under: 'shaggy_hair_under' },
  { id: 'bald', name: 'Bald', gear: null, under: null },
];

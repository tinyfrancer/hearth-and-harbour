/**
 * Art study (not shipped), round two: four ways to draw the knight's head at
 * option C's size, on one body. Every face pixel is placed by hand (pinned
 * steps, hand.ts); the automatic shading pass never touches a face.
 *
 * The body is option C's knight (figures-c.ts) less its head and sword arm.
 * The arm is redrawn so the forearm comes down from the elbow to a fist held
 * out from the hip and the blade leaves the fist the other way, leaning out:
 * the forearm, the fist and the blade each show, by the hand rule.
 *
 * Heads are drawn in `skin` and `hair` and take a look by swapping ramps
 * (`recolour`), the same way the game's looks are ramps, not repaints.
 */
import { drawFigure, recolour, selOut, type FigureDef, type Layer, type TGrid } from './engine';
import { HERO_C } from './figures-c';
import { compose, padTop, type Pins } from './hand';
import {
  BALD_ROWS,
  BRAID_ROWS,
  H1_ROWS,
  H2_ROWS,
  H3_ROWS,
  H4_ROWS,
  LONG_ROWS,
  SHAGGY_ROWS,
} from './head-rows';

/** Characters a face is drawn in. Hair and skin steps are swapped for a look. */
export const FACE_PINS: Pins = {
  o: ['skin', 0],
  s: ['skin', 1],
  t: ['skin', 2],
  u: ['skin', 3],
  v: ['skin', 4],
  w: ['skin', 5],
  '0': ['hair', 0],
  '1': ['hair', 1],
  '2': ['hair', 2],
  '3': ['hair', 3],
  '4': ['hair', 4],
  '5': ['hair', 5],
  K: ['eye', 4],
  W: ['eye', 1],
  G: ['eye', 0],
  I: ['eye', 3],
  B: ['eye', 2],
};

export interface Head {
  readonly id: string;
  readonly title: string;
  readonly caption: readonly string[];
  /** Rows, odd width, the middle column on the body's centre line. */
  readonly rows: readonly string[];
  /** Which row is the bottom of the jaw: it sits on canvas row 15 (+ pad). */
  readonly jaw: number;
  /** Hair that hangs apart from the head (a braid), placed relative to the head's rows. */
  readonly extra?: { readonly at: readonly [number, number]; readonly rows: readonly string[] };
}

/** H1: a small head on a long neck, simple dark eyes, cropped hair, an angular jaw. */
const H1: Head = {
  id: 'H1',
  title: 'Realistic',
  caption: ['head 11 × 13 · 4.8 heads tall', 'dot eyes, cropped hair, long neck'],
  ...H1_ROWS,
};

/** H2: a rounder skull, a touch larger, eyes with whites and a lid, light brows, a fringe. */
const H2: Head = {
  id: 'H2',
  title: 'Rounder, open eyes',
  caption: ['head 13 × 14 · 4.6 heads tall', 'whites + iris, soft brows, fringe'],
  ...H2_ROWS,
};

/** H3: a big round head, shaggy hair, glinting eyes, a small chin and a short neck. */
const H3: Head = {
  id: 'H3',
  title: 'Charming',
  caption: ['head 15 × 16 · 4.1 heads tall', 'glint eyes, shaggy hair, short neck'],
  ...H3_ROWS,
};

/** H4: swept-back hair, a high forehead, strong brows over narrow eyes, a square jaw. */
const H4: Head = {
  id: 'H4',
  title: 'Strong brows',
  caption: ['head 13 × 14 · 4.6 heads tall', 'swept back, square jaw, thick neck'],
  ...H4_ROWS,
};

export const HEADS: readonly Head[] = [H1, H2, H3, H4];

export interface LookCase {
  readonly head: Head;
  readonly skin: string;
  readonly hair: string;
  readonly name: string;
}

const look = (id: string, rows: Pick<Head, 'rows' | 'jaw' | 'extra'>): Head => ({
  id,
  title: id,
  caption: [],
  ...rows,
});

/** H2 in four of the character creator's looks, and the default for comparison. */
export const LOOKS_CHECK: readonly LookCase[] = [
  { head: H2, skin: 'skin', hair: 'hair', name: 'Fair · Brown · Short' },
  {
    head: look('long', LONG_ROWS),
    skin: 'skindeep',
    hair: 'hairblack',
    name: 'Deep · Black · Long',
  },
  {
    head: look('braid', BRAID_ROWS),
    skin: 'skinpale',
    hair: 'hairblonde',
    name: 'Pale · Blonde · Braid',
  },
  {
    head: look('shaggy', SHAGGY_ROWS),
    skin: 'skingolden',
    hair: 'chestnut',
    name: 'Golden · Chestnut · Shaggy',
  },
  {
    head: look('bald', BALD_ROWS),
    skin: 'skinbrown',
    hair: 'hairgrey',
    name: 'Brown · Grey · Bald',
  },
];

// ------------------------------------------------------------------ the body

/** The blade, leaning out one column every four rows from the fist at column 10. */
const BLADE: Layer = (() => {
  const rows: string[] = [];
  for (let y = 0; y <= 32; y++) {
    const cx = 10 - Math.floor((33 - y) / 4);
    if (y === 0) rows.push('.'.repeat(cx) + 'M');
    else if (y === 1) rows.push('.'.repeat(cx - 1) + 'M|');
    else rows.push('.'.repeat(cx - 1) + 'M' + (y >= 7 && y <= 9 ? 'W' : '|') + 'M');
  }
  return { at: [0, 0], depth: 8, rows, R: { blade: 1.5 } };
})();

/** The sword arm: sleeve under the pauldron, couter at the elbow, bracer down to the wrist. */
const ARM: Layer = {
  at: [11, 24],
  depth: 5,
  rows: [
    '...TTTTT',
    '...TTTTT',
    '...TTTTt',
    '...TTTTt',
    '...TTTTt',
    '...TTTtt',
    '..KKKKK',
    '..KKKKKK',
    '...^^^^',
    '..====-',
    '.=====',
    '.====',
  ],
  R: { knee: 1.5 },
};

const GUARD: Layer = { at: [6, 32], depth: 8, rows: ['G.......G', 'GGGGGGGGG'], R: { guard: 1 } };
const POMMEL: Layer = { at: [9, 39], depth: 8, rows: ['GGG', '.G.'], R: { guard: 1 } };

/** The body less the head: option C's knight, with the new arm and sword. */
const BODY: FigureDef = {
  ...HERO_C,
  legend: {
    ...HERO_C.legend,
    '=': { m: 'plate', g: 'vamb' },
    '-': { m: 'plate', g: 'vamb', o: 1 },
  },
  layers: [
    ...HERO_C.layers.filter(
      (l) =>
        !(l.at[0] === 18 && l.at[1] === 3) && // head
        !(l.at[0] === 12 && l.at[1] === 24) && // old arm
        !(l.at[0] === 12 && l.at[1] === 36) && // old fist
        !(l.at[0] === 8 && l.at[1] === 34) && // old guard
        !(l.at[0] === 13 && l.at[1] === 40) && // old pommel
        !(l.at[0] === 0 && l.at[1] === 0 && l.depth === 8), // old blade
    ),
    ARM,
    BLADE,
    GUARD,
    POMMEL,
  ],
};

/** The fist, by hand: thumb over the top, three finger rows, knuckles lit from the upper left. */
const FIST = ['.sst.', 'osstv', 'tuuuw', 'sstuv', '.uvw.'];

/** Rows of padding above the knight so a large head clears the top. */
export const PAD = 2;
/** The body's centre line. */
export const AXIS = 26;

let bodyCache: TGrid | null = null;
function body(): TGrid {
  bodyCache ??= padTop(drawFigure(BODY, false), PAD);
  return bodyCache;
}

/** The knight with a head, outlined. */
export function knight(head: Head): TGrid {
  const w = (head.rows[0] ?? '').length;
  const x = AXIS - (w - 1) / 2;
  const y = 15 + PAD - head.jaw;
  const g = compose(
    body().w,
    body().h,
    [
      { at: [x, y], depth: 20, rows: head.rows, cast: false },
      ...(head.extra
        ? [
            {
              at: [x + head.extra.at[0], y + head.extra.at[1]] as const,
              depth: 22,
              rows: head.extra.rows,
              cast: false,
            },
          ]
        : []),
      { at: [8, 34 + PAD], depth: 21, rows: FIST, cast: false },
    ],
    FACE_PINS,
    body(),
  );
  return selOut(g);
}

/** A look: skin and hair ramps swapped. */
export const withLook = (g: TGrid, skin: string, hair: string): TGrid =>
  recolour(g, { skin, hair } as never);

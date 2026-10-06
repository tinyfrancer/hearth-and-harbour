/**
 * What the hero holds at the C scale, by the hand rule (docs/style-guide.md,
 * "How things are held"): the grip runs down through the fist (`GRIP`, hidden
 * by the fingers), everything else is in front of the forearm and body
 * (`HELD_FRONT`), with something showing directly above the fist and directly
 * below it, and the whole thing on one straight line through the middle of
 * the fist, leaning out towards the top. Only a bowstring goes behind
 * (`HELD_BEHIND`).
 *
 * Straight things (blades, hafts, staves) are laid along that line by rule so
 * they are straight and evenly stepped; heads, guards, pommels and every
 * glint are placed by hand.
 */
import { DEPTH } from '../depth';
import type { Mat } from '../town2/ramps';
import { FIST2, GRIP_X } from './body';
import type { Gear2, Line, Part2, Pins } from './engine';
import { runs } from './engine';

const { GRIP, HELD_FRONT, HELD_BEHIND, SHIELD } = DEPTH;

/** The fist's rows, top and bottom. */
export const FIST_TOP = FIST2.at[1];
export const FIST_BOTTOM = FIST2.at[1] + FIST2.rows.length - 1;
/** The middle of the grip, between its two columns. */
const MID = (GRIP_X[0] + GRIP_X[1]) / 2;

/** Where the held line is at row `y`, leaning out one column every `per` rows above the fist. */
export const lineAt = (y: number, per: number): number => MID - (FIST_TOP - y) / per;

/** The grip under the fingers: two columns down through the fist. */
export const gripPart = (mat: Mat, steps: readonly [number, number] = [2, 4]): Part2 =>
  runs(
    GRIP,
    Array.from({ length: FIST_BOTTOM - FIST_TOP + 1 }, (_, i): Line => [
      FIST_TOP + i,
      [GRIP_X[0], `${steps[0]}${steps[1]}`],
    ]),
    { mat },
  );

/**
 * A straight blade from the guard (row `from`) up to its point (row `tip`),
 * leaning out one column every `per` rows: a lit edge, a bright midrib, a
 * shadow edge, so it reads as steel and stays symmetric about its midrib.
 * `leaf` widens it in its upper part (the bronze leaf blade).
 */
export function straightBlade(
  mat: Mat,
  o: {
    from: number;
    tip: number;
    per: number;
    steps?: readonly [edge: number, rib: number, shadow: number];
    leaf?: readonly [from: number, to: number];
    glint?: readonly number[];
  },
): Part2 {
  const [edge, rib, shadow] = o.steps ?? [1, 0, 3];
  const lines: Line[] = [];
  for (let y = o.tip; y <= o.from; y++) {
    const c = Math.round(lineAt(y, o.per) - 0.01);
    const s = (n: number) => String(n);
    if (y === o.tip) lines.push([y, [c, s(rib)]]);
    else if (y === o.tip + 1) lines.push([y, [c - 1, s(edge) + s(rib) + s(shadow)]]);
    else {
      const wide = o.leaf && y >= o.leaf[0] && y <= o.leaf[1];
      const midrib = o.glint?.includes(y) ? '0' : s(rib);
      lines.push(
        wide
          ? [y, [c - 2, s(edge) + s(edge + 1) + midrib + s(shadow) + s(Math.min(5, shadow + 1))]]
          : [y, [c - 1, s(edge) + midrib + s(shadow)]],
      );
    }
  }
  return runs(HELD_FRONT, lines, { mat });
}

/** Rows placed at (x, y) in front of the arm, in a material with pins of its own. */
const front = (x: number, y: number, mat: Mat, rows: readonly string[], pins?: Pins): Part2 => ({
  at: [x, y],
  depth: HELD_FRONT,
  mat,
  rows,
  pins,
});

// ------------------------------------------------------------------ swords

/**
 * The militia's short leaf blade: bronze, to the shoulder, widening in its
 * upper part, its midrib polished and its shadow edge dark; a small cast
 * guard and pommel.
 */
const BRONZE_SHORTSWORD: Gear2 = {
  id: 'bronze_shortsword',
  slot: 'weapon',
  parts: [
    straightBlade('bronze', { from: 37, tip: 21, per: 9, steps: [2, 0, 4], leaf: [25, 31] }),
    front(13, 38, 'bronze', ['123345']),
    gripPart('hide'),
    front(15, 44, 'bronze', ['24', '.4']),
  ],
};

/**
 * The town guard's arming sword: a straight iron blade above the head, a
 * plain iron cross a little wider than a hand, a wheel pommel.
 */
const IRON_ARMING_SWORD: Gear2 = {
  id: 'iron_arming_sword',
  slot: 'weapon',
  parts: [
    straightBlade('iron', { from: 37, tip: 8, per: 6, steps: [1, 1, 3], glint: [12, 13, 14] }),
    front(11, 38, 'iron', ['011122334']),
    gripPart('leather'),
    front(15, 44, 'iron', ['12', '34']),
  ],
};

/** A blade that bows outward as it rises, for the cutlasses: its edge is the outer side. */
function curvedBlade(
  mat: Mat,
  o: {
    from: number;
    tip: number;
    per: number;
    bow: number;
    steps: readonly [number, number, number];
    nicks?: readonly number[];
  },
): Part2 {
  const [edge, face, back] = o.steps;
  const lines: Line[] = [];
  const len = o.from - o.tip;
  for (let y = o.tip; y <= o.from; y++) {
    const t = (o.from - y) / len;
    const c = Math.round(lineAt(y, o.per) - o.bow * Math.sin(t * Math.PI * 0.85) - 0.01);
    const e = o.nicks?.includes(y) ? String(face + 1) : String(edge);
    if (y === o.tip) lines.push([y, [c, e]]);
    else if (y < o.tip + 3) lines.push([y, [c, e + String(back)]]);
    else lines.push([y, [c - 1, e + String(face) + String(back)]]);
  }
  return runs(HELD_FRONT, lines, { mat });
}

/**
 * The smuggler's cutlass: iron's rung by its steel, finer by its polish (a
 * white edge) and a knuckle bow that runs round the outside of the fist.
 */
const SMUGGLERS_CUTLASS: Gear2 = {
  id: 'smugglers_cutlass',
  slot: 'weapon',
  parts: [
    curvedBlade('iron', { from: 37, tip: 13, per: 7, bow: 3, steps: [0, 1, 3] }),
    front(12, 38, 'iron', ['01112234']),
    front(13, 39, 'iron', ['1', '1', '2', '2', '3', '334']),
    gripPart('leather'),
  ],
};

/**
 * A deckhand's cutlass: the same line, but dull steel nicked along its edge,
 * a brass cup guard and a brass knuckle bow.
 */
const PIRATES_CUTLASS: Gear2 = {
  id: 'pirates_cutlass',
  slot: 'weapon',
  parts: [
    curvedBlade('iron', {
      from: 37,
      tip: 14,
      per: 7,
      bow: 3,
      steps: [1, 2, 4],
      nicks: [19, 20, 26, 31],
    }),
    front(11, 37, 'bronze', ['.1223', '012234']),
    front(13, 39, 'bronze', ['2', '2', '3', '3', '3', '3445']),
    gripPart('leather'),
  ],
};

/**
 * The knight's long sword lives with his gear (knight.ts); everything below
 * is held the same way.
 */

// -------------------------------------------------------------------- hafts

/** A haft of wood along the held line from row `top` to row `bottom`, lit on its left. */
function haft(
  mat: Mat,
  top: number,
  bottom: number,
  per: number,
  steps: readonly [number, number] = [2, 4],
): Part2 {
  const lines: Line[] = [];
  for (let y = top; y <= bottom; y++) {
    if (y >= FIST_TOP && y <= FIST_BOTTOM) continue;
    const c = Math.floor(lineAt(y, per) + 0.01);
    lines.push([y, [c, `${steps[0]}${steps[1]}`]]);
  }
  return runs(HELD_FRONT, lines, { mat });
}

/**
 * The militia's hatchet: a solid bronze wedge at the very top of a short
 * haft, a pixel of haft above it, a flat top, a curved bit edged in the
 * polished step, the socket dark where the wood goes in.
 */
const BRONZE_HATCHET: Gear2 = {
  id: 'bronze_hatchet',
  slot: 'weapon',
  parts: [
    haft('wood', 25, 45, 7),
    front(7, 26, 'bronze', [
      '0222225',
      '0122235',
      '0122345',
      '012345.',
      '02345..',
      '0345...',
      '04.....',
    ]),
    gripPart('wood'),
  ],
};

/**
 * The town guard's bearded axe: a longer haft, the iron head's lower edge
 * running down the haft in a beard, the bit bright along its curve.
 */
const IRON_BEARDED_AXE: Gear2 = {
  id: 'iron_bearded_axe',
  slot: 'weapon',
  parts: [
    haft('wood', 16, 45, 7),
    front(5, 18, 'iron', [
      '.0111235',
      '01112235',
      '01122345',
      '0122345.',
      '012345..',
      '01234...',
      '01234...',
      '.01234..',
      '.012345.',
      '..012345',
      '...00135',
    ]),
    gripPart('wood'),
  ],
};

/**
 * The footpad's cudgel: a knotted length of oak, swelling towards its head,
 * the knots lit on their upper left with a dark hollow under each.
 */
const CUDGEL: Gear2 = {
  id: 'cudgel',
  slot: 'weapon',
  parts: [
    haft('bark', 30, 45, 7),
    front(10, 20, 'bark', [
      '..123.',
      '.11234',
      '.12334',
      '0124345',
      '.12334',
      '.11233',
      '.12344',
      '..1234',
      '..2134',
      '..1234',
      '...234',
    ]),
    gripPart('bark'),
  ],
};

/**
 * A boarding axe: a long haft rising above the head, a broad bit on the
 * outside and a spike behind for hooking rails.
 */
const BOARDING_AXE: Gear2 = {
  id: 'boarding_axe',
  slot: 'weapon',
  parts: [
    haft('wood', 2, 45, 9),
    front(4, 5, 'iron', [
      '.01123',
      '011122',
      '0112235112',
      '0112235.234',
      '011234..',
      '01234...',
      '.0234...',
      '..04....',
    ]),
    gripPart('wood'),
  ],
};

/**
 * Brinebeard's anchor, held by its shank at arm's length and hanging: the
 * ring and the wooden stock up by the shoulder, the shank through the fist,
 * the crown at the knee with its arms curving up either side. Iron going to
 * rust, the stock of old oak.
 */
const BRINEBEARDS_ANCHOR: Gear2 = {
  id: 'brinebeards_anchor',
  slot: 'weapon',
  parts: [
    front(13, 21, 'iron', ['.23.', '3..4', '.34.']),
    front(9, 24, 'bark', ['012222233345', '344444444555']),
    haft('iron', 26, 52, 40, [1, 3]),
    front(8, 46, 'iron', [
      '23..........34',
      '123........345',
      '.12........34.',
      '.123......345.',
      '..123....345..',
      '...1223333455.',
      '.....33445....',
    ]),
    gripPart('iron'),
  ],
};

// --------------------------------------------------------------------- bows

/**
 * A shortbow, held at the middle of its stave with the string outward: the
 * stave curves from the fist out to tips level with the shoulder and the
 * knee, the string runs straight between the tips, behind. One drawing in
 * three woods.
 */
function bowParts(mat: Mat, top: number, bottom: number, bend: number, bind?: Mat): Part2[] {
  const mid = (top + bottom) / 2;
  const half = (bottom - top) / 2;
  const lines: Line[] = [];
  let tipX = 0;
  for (let y = top; y <= bottom; y++) {
    if (y >= FIST_TOP && y <= FIST_BOTTOM) continue;
    const u = (y - mid) / half;
    const x = Math.round(15.5 - bend * u * u - 0.01);
    if (y === top || y === bottom) {
      lines.push([y, [x, '1']]);
      tipX = x;
    } else lines.push([y, [x - 1, Math.abs(u) > 0.8 ? '13' : '124']]);
  }
  const parts: Part2[] = [runs(HELD_FRONT, lines, { mat })];
  // The string, behind, one straight column clear of the hand.
  parts.push(
    runs(
      HELD_BEHIND,
      Array.from({ length: bottom - top - 1 }, (_, i): Line => [top + 1 + i, [tipX - 1, '1']]),
      { mat: 'linen' },
    ),
  );
  if (bind)
    parts.push(
      runs(
        HELD_FRONT + 0.1,
        [
          [FIST_TOP - 1, [15, '23']],
          [FIST_BOTTOM + 1, [15, '34']],
        ],
        { mat: bind },
      ),
    );
  parts.push(gripPart(mat, [3, 4]));
  return parts;
}

const bow = (id: string, mat: Mat): Gear2 => ({
  id,
  slot: 'weapon',
  parts: bowParts(mat, 22, 60, 5, 'leather'),
});

/** The poacher's longbow: a head taller than the shortbows, nearly straight, dark oak, green-bound. */
const POACHERS_LONGBOW: Gear2 = {
  id: 'poachers_longbow',
  slot: 'weapon',
  parts: bowParts('bark', 12, 68, 3, 'leaf'),
};

// ------------------------------------------------------------------ shields

const HIDE_RIM: Pins = {
  r: ['hide', 3],
  R: ['hide', 4],
  x: ['hide', 5],
  b: ['bronze', 1],
  B: ['bronze', 3],
  c: ['bronze', 0],
  C: ['bronze', 5],
};

/**
 * The militia's buckler: a small round shield of planks, a hide rim, a cast
 * bronze boss in the middle; strapped to the far forearm, it hides the hand.
 */
const BRONZE_BUCKLER: Gear2 = {
  id: 'bronze_buckler',
  slot: 'shield',
  parts: [
    {
      at: [31, 31],
      depth: SHIELD,
      mat: 'wood',
      rows: [
        '....rrrrR....',
        '..r4122234R..',
        '.r141222343R.',
        '.r141222343R.',
        'r12412223433R',
        'r1241cbB3433R',
        'r1241bbBC433R',
        'r1241BBC3433x',
        'r12412223433x',
        '.r141222343x.',
        '.r141222343x.',
        '..R4122234x..',
        '....RRxxx....',
      ],
      pins: HIDE_RIM,
    },
  ],
};

/**
 * The town guard's heater: plain iron, flat along the top, its sides curving
 * to a point; a rim a step darker, the face lit on its left. One metal.
 */
const IRON_HEATER_SHIELD: Gear2 = {
  id: 'iron_heater_shield',
  slot: 'shield',
  parts: [
    {
      at: [31, 27],
      depth: SHIELD,
      mat: 'iron',
      rows: [
        '33333333333334',
        '30111111122234',
        '31111111222234',
        '31111112222334',
        '31111122222334',
        '31111122223334',
        '31111222223334',
        '31112222233334',
        '31112222233334',
        '31122222233344',
        '.3122222333344',
        '.3122222333344',
        '.3122223333345',
        '..312223333445',
        '..31222333345.',
        '...3122333445.',
        '...312233345..',
        '....3123345...',
        '.....31345....',
        '......345.....',
      ],
    },
  ],
};

/**
 * The wyrmscale shield: one great green scale shaped like a leaf, rimmed in
 * iron, rounded at the top and coming to a point, a ridge down its middle.
 */
const WYRMSCALE_SHIELD: Gear2 = {
  id: 'wyrmscale_shield',
  slot: 'shield',
  parts: [
    {
      at: [30, 27],
      depth: SHIELD,
      mat: 'leaf',
      rows: [
        '....nnnnnn....',
        '..nn112023nn..',
        '.n11120233344n',
        'n111220233344n',
        'n112220333444n',
        'n122220333444n',
        'n122220334445n',
        'n122220334445n',
        'n122203344445n',
        '.n1220334445n.',
        '.n1220334445n.',
        '.n122033445n..',
        '..n12033445n..',
        '..n1203345n...',
        '...n203345n...',
        '...n20345n....',
        '....n0345n....',
        '....n034n.....',
        '.....n3n......',
        '......n.......',
      ],
      pins: { n: ['iron', 3] },
    },
  ],
};

/**
 * A brass spyglass, closed, held upright in the off hand at the hip: the
 * wide end above, the eyepiece below, the fingers round its middle.
 */
const SPYGLASS: Gear2 = {
  id: 'spyglass',
  slot: 'shield',
  parts: [
    {
      at: [33, 28],
      depth: SHIELD,
      mat: 'bronze',
      rows: [
        '1234',
        '0234',
        '1234',
        '.23.',
        '1234',
        '.23.',
        '.23.',
        '.23.',
        '.23.',
        '',
        '',
        '',
        '',
        '.34',
        '.34',
        '.23',
        '.45',
      ],
    },
    { at: [32, 37], depth: SHIELD + 1, rows: ['.sst', 'osstv', 'tuuuw', 'sstuv'], cast: false },
  ],
};

export const HELD2: readonly Gear2[] = [
  BRONZE_SHORTSWORD,
  IRON_ARMING_SWORD,
  SMUGGLERS_CUTLASS,
  PIRATES_CUTLASS,
  BRONZE_HATCHET,
  IRON_BEARDED_AXE,
  CUDGEL,
  BOARDING_AXE,
  BRINEBEARDS_ANCHOR,
  bow('pine_shortbow', 'pinewood'),
  bow('oak_shortbow', 'wood'),
  bow('willow_shortbow', 'willow'),
  POACHERS_LONGBOW,
  BRONZE_BUCKLER,
  IRON_HEATER_SHIELD,
  WYRMSCALE_SHIELD,
  SPYGLASS,
];

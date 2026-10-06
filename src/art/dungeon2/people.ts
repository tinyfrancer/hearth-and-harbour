/**
 * The grotto's people and the idle game's footpad and goblin at the C scale,
 * on the figure engine: the hero's posed body and the wardrobe's own gear
 * (imported from ../figure2, never changed), each with a head of their own
 * drawn by hand and the pieces only they wear, so they walk, breathe, swing
 * and fall on the same rig as the hero, by the same hand rule.
 *
 * Told apart by silhouette first: the deckhand by a boathook taller than he
 * is and a knotted bandana; the smuggler by his long dark coat and raised
 * cutlass; the powder monkey a head shorter, a keg held over his head with
 * its fuse alight; the footpad hooded and masked with a cudgel; the goblin
 * small, long-eared and green under a hood with a longbow.
 */
import { DEPTH } from '../depth';
import { mirror, stepOf, tgrid, type Cell, type TGrid } from '../town2/cells';
import { cell, matOf } from './cave';
import type { Mat2 as Mat } from './cave';
import type { Glow } from '../raster';
import { HEAD, HEAD_AT } from '../figure2/body';
import { bonedParts } from '../figure2/dress';
import { recolour, type Part2, type Pins } from '../figure2/engine';
import { swap2 } from './cave';
import { turnRow } from '../figure2/folk';
import {
  HERO_RIG,
  IDLE2,
  posedFigure,
  STAND2,
  walkKey,
  type Boned,
  type Key2,
} from '../figure2/walk';
import { dyed, gridPart, laid, repaint } from './pose';
import { strikeArm, windupArm, type Sleeve, type SwingKind } from './swing';

const [HX, HY] = HEAD_AT;
const FACE = /[KWIbBstuvw]/;

/** A head of one's own, drawn front-on and turned a column toward the facing as the townsfolk's are. */
function headPart(rows: readonly string[], pins: Pins, dx = 0, dy = 0, depth = 0.5): Part2 {
  return {
    at: [HX + dx, HY + dy],
    depth,
    cast: false,
    bone: 'head',
    rows: rows.map((r) => (FACE.test(r) ? turnRow(r) : r)),
    mat: 'hair',
    pins,
  };
}

/** A part at (x, y) with its own pins, moving with `bone`. */
const bit = (
  x: number,
  y: number,
  depth: number,
  rows: readonly string[],
  pins: Pins,
  bone: Part2['bone'],
  cast = true,
): Part2 => ({ at: [x, y], depth, rows, pins, bone, cast });

/** A person: gear from the wardrobe, parts of their own, and the ramps their skin and hair are drawn in. */
interface Person {
  readonly gear: readonly string[];
  readonly body?: 'standard' | 'standard_at_ease';
  /** Every worn part passed through this (a dye, stripes), or left out (null). */
  readonly worn?: (part: Part2, gearId: string | null) => Part2 | null;
  readonly own: readonly Boned[];
  readonly skin: Mat;
  readonly hair: Mat;
  /** Rows taken out to make a shorter person (counted on the posed figure; the soles stay put). */
  readonly shorter?: readonly number[];
  readonly glows?: (key: Key2) => readonly Glow[];
  /** What they strike with, and the sleeve on the striking arm. */
  readonly swing: { readonly kind: SwingKind; readonly sleeve: Sleeve };
}

const b = (part: Part2, bone: Boned['bone']): Boned => ({ part, bone });

/* ---------------------------------------------------------------- the deckhand */

/** A red bandana knotted at the back, a gold ring in his ear, a black stubbled jaw, a scowl. */
const DECKHAND_HEAD = headPart(
  [
    '....RRRrr......',
    '..RRRRcRRrr....',
    '.RRcRRRRRRrrr..',
    'RRRRRRRRcRRrrq.',
    'qRRRRRRRRRRrrq.',
    '.sBBbssssbBBuv.',
    '.ssssBssBttuuv.',
    'stsKIKsstKIKuvu',
    'tusWIWsstWIWuvv',
    'gtsssssstttuuvu',
    '.hhsssttuutuh..',
    '.hhsshvvvhuhh..',
    '..hhshhhhhhh...',
    '...hhhhhhhh....',
    '....hhhhhh.....',
    '.....tuuvw.....',
    '.....tuuvw.....',
    '....ttuuvvw....',
  ],
  {
    R: ['crimson', 2],
    r: ['crimson', 3],
    q: ['crimson', 4],
    c: ['cream', 1],
    h: ['hairblack', 3],
    g: ['gold', 1],
  },
);

/** The bandana's tails, hanging behind his head. */
const DECKHAND_KNOT = bit(
  HX - 3,
  HY + 3,
  -15,
  ['.qq', 'qq.', 'rq.', '.qr', '..q'],
  {
    q: ['crimson', 4],
    r: ['crimson', 3],
  },
  'head',
);

/** A boathook's head: a spike straight up and a hook curling back off the haft. */
const BOATHOOK: Part2 = bit(
  8,
  0,
  DEPTH.HELD_FRONT,
  ['...01.', '...01.', '..012.', '0.012.', '01.12.', '.0112.', '..123.', '..34..'],
  {
    '0': ['iron', 1],
    '1': ['iron', 2],
    '2': ['iron', 3],
    '3': ['iron', 4],
    '4': ['iron', 5],
  },
  'nearHeld',
);

/** Stripes across a shirt: two rows of cream, two of red, all the way down. */
const striped = (part: Part2): Part2 =>
  repaint(part, (_x, y, c) =>
    matOf(c) !== 'teal'
      ? c
      : cell(
          ((y + 1) >> 1) % 2 ? 'crimson' : 'cream',
          Math.min(5, stepOf(c) + (((y + 1) >> 1) % 2 ? 0 : -1)),
        ),
  );

const DECKHAND: Person = {
  gear: ['teal_tunic', 'linen_trousers', 'leather_boots', 'leather_belt', 'boarding_axe'],
  worn: (part, id) => {
    if (id === 'teal_tunic') return striped(part);
    // The boarding axe's haft carries the hook instead of the axe's bit.
    if (id === 'boarding_axe') return part.rows.length === 8 ? BOATHOOK : part;
    return part;
  },
  own: [b(DECKHAND_HEAD, 'head'), b(DECKHAND_KNOT, 'head')],
  swing: { kind: 'hook', sleeve: { upper: 'crimson', fore: 'skin' } },
  skin: 'skingolden',
  hair: 'hairblack',
};

/* --------------------------------------------------------------- the smuggler */

/** A knitted cap rolled at the brim, a great black beard, heavy brows, a broken nose. */
const SMUGGLER_HEAD = headPart(
  [
    '...............',
    '.....nnnn......',
    '...nnNnnnnN....',
    '..nNnnnNnnnNN..',
    '.mmmmmmmmmmmmM.',
    '.sBBBsssBBBtuv.',
    '.ssssssssttuuv.',
    'stsKIKsstKIKuvu',
    'tusWIWsotWIWuvv',
    'st2ssssottt3uvu',
    '.22ssstuutt34..',
    '.2312333233443.',
    '.22123vvv23443.',
    '.221222223334..',
    '..21222223334..',
    '...222223334...',
    '....2233344....',
    '.....3344......',
  ],
  { n: ['indigo', 3], N: ['indigo', 4], m: ['indigo', 2], M: ['indigo', 4] },
);

/** A green bottle, corked, in his other hand. */
const BOTTLE = bit(
  33,
  33,
  DEPTH.HAND + 1,
  ['.c.', '.c.', '.g.', 'GgG', 'Ggh', 'Ggh', 'Ggh', 'Ghh', '.h.'],
  {
    c: ['wood', 2],
    g: ['moss', 1],
    G: ['moss', 3],
    h: ['moss', 5],
  },
  'far',
);

const SMUGGLER: Person = {
  gear: [
    'captains_coat',
    'teal_tunic',
    'grey_trousers',
    'leather_boots',
    'leather_belt',
    'smugglers_cutlass',
  ],
  worn: (part, id) => {
    if (id === 'captains_coat') return dyed(dyed(part, 'midnight', 'tar'), 'bronze', 'iron');
    if (id === 'teal_tunic') return striped(part);
    return part;
  },
  own: [b(SMUGGLER_HEAD, 'head'), b(BOTTLE, 'far')],
  swing: { kind: 'cutlass', sleeve: { upper: 'tar', fore: 'tar' } },
  skin: 'skin',
  hair: 'hairblack',
};

/* ----------------------------------------------------------------- the footpad */

/** Hooded and masked to the eyes, brows drawn down. */
const FOOTPAD_HEAD = headPart(
  [
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '.ssBBsssssBBuv.',
    '.sssBBsssBBtuv.',
    'stsKIKsstKIKuvu',
    'tusWIWsstWIWuvv',
    'mmmmmmmmmmmmmmM',
    '.mmmmnmmmmmmmM.',
    '.mmmmmmmnmmmMM.',
    '..mmmmmmmmmMM..',
    '...mmmmmmmmM...',
    '....mmmmmmM....',
    '.....mmMMM.....',
    '.....tuuvw.....',
    '....ttuuvvw....',
  ],
  { m: ['umber', 3], n: ['umber', 2], M: ['umber', 5] },
);

const FOOTPAD: Person = {
  gear: [
    'linen_hood',
    'leather_jerkin',
    'teal_tunic',
    'grey_trousers',
    'leather_boots',
    'leather_belt',
    'cudgel',
  ],
  worn: (part, id) => {
    if (id === 'linen_hood') return dyed(part, 'linen', 'felt');
    if (id === 'teal_tunic') return dyed(part, 'teal', 'umber');
    if (id === 'leather_jerkin') return dyed(part, 'tan', 'hide');
    return part;
  },
  own: [b(FOOTPAD_HEAD, 'head')],
  swing: { kind: 'cudgel', sleeve: { upper: 'hide', fore: 'hide' } },
  skin: 'skinpale',
  hair: 'hair',
};

/* ------------------------------------------------------------ the goblin poacher */

/** Long ears out from under a hood, a hooked nose, small yellow eyes, a sly grin. */
const GOBLIN_HEAD = headPart(
  [
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '.sBBsssssBBtuv.',
    '.ssssssssttuuv.',
    'stsKyKsstKyKuvu',
    'tussssostssstvv',
    'stssssottttuuvu',
    '.sssssouttuuv..',
    '..sswvvvvvuv...',
    '...sswWWwuv....',
    '....ssttuv.....',
    '.....tuuv......',
    '.....tuuvw.....',
    '.....tuuvw.....',
    '....ttuuvvw....',
  ],
  { y: ['gold', 1], W: ['eye', 1] },
);
/** The ears, long and pointed, out either side of the hood. */
const GOBLIN_EARS: Boned[] = [
  b(bit(HX - 6, HY + 8, 74, ['tt....', '.stt..', '..sttu', '...tuu'], {}, 'head', false), 'head'),
  b(bit(HX + 14, HY + 8, 74, ['....uv', '..tuv.', 'ttuv..', 'tuv...'], {}, 'head', false), 'head'),
];

const GOBLIN: Person = {
  gear: [
    'linen_hood',
    'leather_jerkin',
    'teal_tunic',
    'grey_trousers',
    'leather_boots',
    'leather_belt',
    'poachers_longbow',
    'barbed_quiver',
  ],
  worn: (part, id) => {
    if (id === 'linen_hood') return dyed(part, 'linen', 'mossdye');
    if (id === 'teal_tunic') return dyed(part, 'teal', 'umber');
    return part;
  },
  own: [b(GOBLIN_HEAD, 'head'), ...GOBLIN_EARS],
  swing: { kind: 'bow', sleeve: { upper: 'leather', fore: 'skin' } },
  skin: 'goblin',
  hair: 'hairblack',
  shorter: [24, 28, 32, 36, 45, 47, 49, 51, 53, 56, 58, 60],
};

export const PEOPLE: Readonly<Record<string, Person>> = {
  deckhand: DECKHAND,
  smuggler: SMUGGLER,
  footpad: FOOTPAD,
  goblin_poacher: GOBLIN,
};

/* ------------------------------------------------------------------- posing */

/** The person's parts with what each moves with, their own head in place of the hero's. */
function partsOf(p: Person): Boned[] {
  const body = p.body ?? 'standard';
  const out: Boned[] = [];
  // Walk the gear one piece at a time, so each part knows whose it is.
  const base = bonedParts(body, []).filter((x) => x.part !== HEAD);
  for (const x of base) out.push(x);
  for (const id of p.gear) {
    const withGear = bonedParts(body, [id]).slice(bonedParts(body, []).length);
    for (const x of withGear) {
      const part = p.worn ? p.worn(x.part, id) : x.part;
      if (!part) continue;
      out.push({ part, bone: x.bone });
    }
  }
  return [...out, ...p.own];
}

/** Rows taken out of a posed figure to make a shorter person, the soles kept where they are. */
function shortened(g: TGrid, rows: readonly number[]): TGrid {
  if (!rows.length) return g;
  const out = tgrid(g.w, g.h);
  const keep = Array.from({ length: g.h }, (_, y) => y).filter((y) => !rows.includes(y));
  const shift = g.h - keep.length;
  keep.forEach((y, i) => out.d.set(g.d.subarray(y * g.w, (y + 1) * g.w), (i + shift) * g.w));
  return out;
}

/**
 * A frame of a person posed by `key`, recoloured to their skin and hair,
 * shortened if they are. Winding up and striking, the near arm and what it
 * holds are drawn again for the blow (swing.ts); with a bow, both arms.
 */
function personFrame(id: string, key: Key2, pose: PersonPose): { grid: TGrid; glows: Glow[] } {
  const p = PEOPLE[id]!;
  let parts = partsOf(p);
  if (pose === 'windup' || pose === 'strike') {
    const gone = new Set([
      'near',
      'nearHeld',
      ...(p.swing.kind === 'bow' ? ['far', 'farHeld'] : []),
    ]);
    const arm = pose === 'windup' ? windupArm : strikeArm;
    parts = [
      ...parts.filter((x) => !gone.has(x.bone)),
      { part: gridPart(arm(p.swing.kind, p.swing.sleeve), 80, { bone: 'body' }), bone: 'body' },
    ];
  }
  let grid = posedFigure(parts, HERO_RIG, key);
  grid = recolour(grid, swap2({ skin: p.skin, hair: p.hair, brow: p.hair }));
  grid = shortened(grid, p.shorter ?? []);
  return { grid, glows: [] };
}

/** The poses each person has, as keys on the hero's rig. */
const WINDUP: Key2 = { ...STAND2, lean: -1, bob: 0 };
const STRIKE: Key2 = { ...STAND2, lean: 2, bob: 1 };
const HURT: Key2 = {
  ...STAND2,
  armNear: { dx: -3, dy: -2 },
  armFar: { dx: 2, dy: -2 },
  lean: -2,
  bob: 1,
};
const BUCKLE: Key2 = { ...STAND2, armNear: { dx: -2, dy: 3 }, lean: -1, bob: 3 };

export type PersonPose = 'idle' | 'walk' | 'windup' | 'strike' | 'hurt' | 'fall';

/** How many frames each pose has. */
export const PERSON_FRAMES: Readonly<Record<PersonPose, number>> = {
  idle: 2,
  walk: 8,
  windup: 1,
  strike: 1,
  hurt: 1,
  fall: 2,
};

function keyOf(pose: PersonPose, frame: number): Key2 {
  switch (pose) {
    case 'idle':
      return IDLE2[frame % 2]!;
    case 'walk':
      return walkKey('right', frame, 12);
    case 'windup':
      return WINDUP;
    case 'strike':
      return STRIKE;
    case 'hurt':
      return HURT;
    case 'fall':
      return BUCKLE;
  }
}

/** A person's frame: a 56 x 72 picture (72 x 56 lying down) and where it stands. */
export interface PersonFrame {
  readonly grid: TGrid;
  readonly glows: readonly Glow[];
  readonly anchor: { readonly x: number; readonly y: number };
}

/** A person posed, facing right. Fall's second frame lies on its back. */
export function personPose(id: string, pose: PersonPose, frame: number): PersonFrame | null {
  if (!Object.hasOwn(PEOPLE, id)) return null;
  const f = Math.abs(Math.floor(frame)) % PERSON_FRAMES[pose];
  if (pose === 'fall' && f === 1) {
    const { grid } = personFrame(id, BUCKLE, 'fall');
    const lying = laid(grid);
    // On its back: the feet where they stood, the head behind, the back on the ground.
    let low = 0;
    for (let i = 0; i < lying.d.length; i++) if (lying.d[i]) low = Math.floor(i / lying.w);
    return { grid: lying, glows: [], anchor: { x: 58, y: low } };
  }
  const { grid, glows } = personFrame(id, keyOf(pose, f), pose);
  return { grid, glows, anchor: { x: 28, y: 70 } };
}

void mirror;
void (0 as unknown as Cell);

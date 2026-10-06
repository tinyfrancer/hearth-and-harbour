/*
 * Gullwick at the C scale, as data: the art lane's layout of the redrawn
 * town (`src/art/town2/`, 1440 x 2136 art pixels on 24-pixel tiles) turned
 * into a scene to walk in, with what each thing says and opens. Shown only
 * in the preview (`preview.ts`) until it replaces `town.ts`.
 *
 * Every placement keeps the current town's name where it has one, and a
 * place with the current town's name says and opens exactly what it does
 * there (`TOWN_LAYOUT`'s words are reused, not copied). The words here are
 * for what is new, or drawn differently: the house, the oak, fences,
 * benches, planters, bushes, boulders, the forest's pines and a signpost
 * with two arms. The townsfolk stand where their work is.
 */
import {
  town2Layout,
  TOWN2_SOLID,
  TOWN2_START,
  TOWN2_TILE,
  town2Walk,
  type Placement2,
} from '../art/town2/town';
import { blockFootprints, type Scene, type Thing, type Use } from './things';
import {
  cellAt,
  centreOf,
  isSolid,
  type Cell,
  type Point,
  type TileKind,
  type TileMap,
} from './tileMap';
import { TOWN_LAYOUT } from './town';
import { CAPTAIN, SMITH, TRADER } from './townsfolk';
import type { Townsfolk2 } from './figures2';

const T = TOWN2_TILE;

/** How fast the hero walks at the C scale: as many of his own heights a second as at the old scale. */
export const WALK_SPEED2 = 88;
/** Art pixels per half-step of the hero's bob: the old rhythm at the new speed. */
export const STRIDE2 = 8;
/** How near the hero comes before someone standing about turns to him: the old distance, scaled. */
export const NOTICE2 = 54;

/** Where the hero first stands: the art lane's start, on the square left of the well. */
export const TOWN2_START_CELL: Cell = cellAt(TOWN2_START, T);

/** Where the boat lands him back from a dungeon: on the quay beside it. */
export const BOAT_LANDING2: Cell = { col: 18, row: 59 };

/** The current town's words for a place, by its name there. */
function wordsOf(id: string): Use {
  const use = TOWN_LAYOUT.find((p) => p.id === id)?.use;
  if (!use) throw new Error(`The current town has no words for ${id}.`);
  return use;
}

const SIGNPOST: Use = {
  name: 'Signpost',
  lines: [
    'Two arms: NORTH, up the road into the trees, and QUAY, for anyone the smell of fish has not reached yet.',
  ],
};
const HOUSE: Use = {
  name: 'Your house',
  lines: [
    'Limewash, thatch and a blue door, and the key is already in your pocket. Not much inside yet but echoes.',
  ],
  duskLines: ['A lamp in the window, as if someone were waiting up. It was you. You left it on.'],
};
const OAK: Use = {
  name: 'Oak',
  lines: ['Broad, old and in no hurry. Oak burns slow and sells well, and it knows it.'],
  button: { label: 'Go to Woodcutting', opens: { skill: 'woodcutting' } },
};
const FENCE: Use = {
  name: 'Garden fence',
  lines: ['Painted blue to match the door, by someone who ran short of blue near the end.'],
};
const BENCH: Use = {
  name: 'Bench',
  lines: ['Worn smooth by a century of sitting. This morning’s gossip is still warm on it.'],
  duskLines: ['Empty. The gossip has gone to the tavern, where it gets louder and less true.'],
};
const PLANTER: Use = {
  name: 'Planter',
  lines: ['Flowers in a stone trough, watered by whoever passes with a bucket and a conscience.'],
};
const BUSH: Use = {
  name: 'Bush',
  lines: ['Some of these leaves are worth picking. Most are not. The bush is not saying which.'],
  button: { label: 'Go to Foraging', opens: { skill: 'foraging' } },
};
const BOULDER: Use = {
  name: 'Boulder',
  lines: [
    'Too big to move and too stubborn to crack. The good stone is further out, with the miners.',
  ],
  button: { label: 'Go to Mining', opens: { skill: 'mining' } },
};

/** What a placement says, by its name; null for what is only scenery. */
function useFor(name: string): Use | null {
  if (name === 'signpost') return SIGNPOST;
  if (name === 'house') return HOUSE;
  if (name === 'oak') return OAK;
  if (name.startsWith('pine-')) return wordsOf('pine-grove-1');
  if (name.startsWith('lamp-')) return wordsOf('lamp-west');
  if (name.startsWith('fence-')) return FENCE;
  if (name.startsWith('bench-')) return BENCH;
  if (name.startsWith('planter-')) return PLANTER;
  if (name.startsWith('bush-')) return BUSH;
  if (name.startsWith('boulder-')) return BOULDER;
  return TOWN_LAYOUT.find((p) => p.id === name)?.use ?? null;
}

/**
 * Where to stand to look at what has no footprint: things afloat are looked
 * at from the quay, the pier or the beach; the net from beside it. The rest
 * are walked up to on their own spots or beside their footprints.
 */
const LOOKOUTS: Readonly<Record<string, readonly Cell[]>> = {
  rowboat: [BOAT_LANDING2, { col: 27, row: 61 }],
  ship: [
    { col: 30, row: 70 },
    { col: 30, row: 72 },
  ],
  wreck: [
    { col: 4, row: 63 },
    { col: 2, row: 64 },
  ],
  buoy: [{ col: 27, row: 71 }],
  'buoy-far': [{ col: 30, row: 77 }],
  net: [{ col: 39, row: 57 }],
};

/** The townsfolk: where each stands, which sides the hero talks to them from, and their figure. */
export interface Townsperson2 {
  readonly id: string;
  readonly figure: Townsfolk2;
  readonly at: Cell;
  readonly sides: readonly (-1 | 1)[];
  readonly use: Use;
}

export const TOWNSFOLK2_AT: readonly Townsperson2[] = [
  // Between the anvil and the forge, where the work is.
  { id: 'smith', figure: 'smith', at: { col: 40, row: 48 }, sides: [-1, 1], use: SMITH },
  // At the stall's east end, as in the current town.
  { id: 'trader', figure: 'trader', at: { col: 13, row: 53 }, sides: [1], use: TRADER },
  // A few boards out along the pier, looking at the ship.
  { id: 'captain', figure: 'pirate', at: { col: 28, row: 64 }, sides: [1], use: CAPTAIN },
];

/** A person's tap box: about their figure, standing on their tile. */
const PERSON_TAP = { w: 36, h: 66 };

/** Where a townsperson's feet are: the middle of their tile, as the hero's are on his. */
export function feetOf(p: Townsperson2): Point {
  return centreOf(p.at, T);
}

function cellsOf(f: NonNullable<Placement2['footprint']>): Cell[] {
  const cells: Cell[] = [];
  for (let row = f.row; row < f.row + f.rows; row++)
    for (let col = f.col; col < f.col + f.cols; col++) cells.push({ col, row });
  return cells;
}

/** Every placement that is a thing in the scene: everything but smoke, gulls and the pier's boards. */
function isThing(p: Placement2): boolean {
  return p.layer !== 'above' && p.id !== 'pier';
}

/** Trees are tapped by their trunk and lower boughs: the middle three fifths across, the lower four fifths up. */
const TREE = /^(pine|pine_2|pine_3|oak)$/;

/**
 * Where a placement is tapped. Lane B's box for a tree is its whole picture,
 * 238 pixels across for the oak, and the sky round its crown would take taps
 * meant for the bush or boulder standing in front of it (the box further
 * forward wins, and a tree's foot is further forward than a bush under its
 * crown). Everything else keeps lane B's box.
 */
function tapOf(p: Placement2): Placement2['tap'] {
  if (!TREE.test(p.id)) return p.tap;
  const w = Math.round(p.tap.w * 0.6);
  const h = Math.round(p.tap.h * 0.8);
  return { x: p.tap.x + Math.round((p.tap.w - w) / 2), y: p.tap.y + p.tap.h - h, w, h };
}

function thingOf(p: Placement2): Thing {
  const use = useFor(p.name);
  const own = Object.values(p.spots).map((s) => cellAt(s, T));
  const spots = own.length ? own : LOOKOUTS[p.name];
  return {
    id: p.name,
    footprint: p.footprint ? cellsOf(p.footprint) : [],
    base: p.base,
    tap: tapOf(p),
    ...(spots ? { spots } : {}),
    ...(use ? { use } : {}),
    // The stall's counter is the trader's, as in the current town.
    ...(p.name === 'stall' ? { panelOf: 'trader' } : {}),
  };
}

function personOf(p: Townsperson2): Thing {
  const feet = feetOf(p);
  return {
    id: p.id,
    footprint: [p.at],
    base: feet.y,
    tap: {
      x: feet.x - PERSON_TAP.w / 2,
      y: feet.y + 2 - PERSON_TAP.h,
      w: PERSON_TAP.w,
      h: PERSON_TAP.h,
    },
    spots: p.sides.map((d) => ({ col: p.at.col + d, row: p.at.row })),
    use: p.use,
  };
}

type Ground2 = keyof typeof TOWN2_SOLID;

/** The ground alone, as tiles: what is under each tile's middle, before anything stands on it. */
function groundMap(): TileMap<Ground2> {
  const walk = town2Walk();
  const tiles: Ground2[][] = [];
  for (let r = 0; r < walk.rows; r++)
    tiles.push(walk.kinds.slice(r * walk.cols, (r + 1) * walk.cols));
  const kinds = Object.fromEntries(
    Object.entries(TOWN2_SOLID).map(([k, solid]) => [k, { solid }]),
  ) as Record<Ground2, TileKind>;
  return { cols: walk.cols, rows: walk.rows, tiles, kinds, tile: T };
}

/** The C-scale town as a scene: its ground on 24-pixel tiles with every footprint solid, and its things. */
export function buildTown2Scene(): Scene {
  const placed = town2Layout().filter(isThing);
  const laid: Thing[] = [...placed.map(thingOf), ...TOWNSFOLK2_AT.map(personOf)];
  const map = blockFootprints(groundMap(), laid);
  // A tree is walked up to from in front where there is room: beside its trunk its lower
  // boughs would hide the hero, who stands behind them there.
  const things = laid.map((thing, i) => {
    const p = placed[i];
    if (!p || !TREE.test(p.id) || thing.footprint.length === 0) return thing;
    const below = Math.max(...thing.footprint.map((c) => c.row)) + 1;
    const front = thing.footprint
      .filter((c) => c.row === below - 1)
      .map((c) => ({ col: c.col, row: below }))
      .filter((c) => !isSolid(map, c));
    return front.length ? { ...thing, spots: front } : thing;
  });
  return {
    map,
    things,
    speed: WALK_SPEED2,
    stride: STRIDE2,
    notice: NOTICE2,
  };
}

let built: Scene | null = null;

/** The C-scale town's scene, built once a page. */
export function town2Scene(): Scene {
  built ??= buildTown2Scene();
  return built;
}

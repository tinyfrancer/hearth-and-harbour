/*
 * Gullwick, as data: the art lane's layout of the town (`src/art/town2/`,
 * 1440 x 2136 art pixels on 24-pixel tiles) turned into a scene to walk in,
 * with what each thing says and opens. The townsfolk stand where their work
 * is; the villagers about the square and the quay.
 *
 * Placements keep the names the first town gave them (`tavern`,
 * `crate-yours`, `lamp-west`), and the words for them came across with the
 * names when that town was retired.
 */
import {
  town2Layout,
  TOWN2_SOLID,
  TOWN2_START,
  TOWN2_TILE,
  town2Walk,
  type Placement2,
} from '../art/town2/town';
import { clearLine } from './path';
import { STAND_HALF } from './play';
import type { Stroll } from './stroll';
import {
  blockFootprints,
  spotsBeside,
  usable,
  type Box,
  type Scene,
  type Thing,
  type Use,
} from './things';
import {
  cellAt,
  centreOf,
  isSolid,
  type Cell,
  type Point,
  type TileKind,
  type TileMap,
} from './tileMap';
import { ALEWIFE, CAPTAIN, DOCKER, ELDER, MARKET, SMITH, TRADER } from './townsfolk';
import { FIGURE2_ANCHOR_X, FIGURE2_W, townsfolkFigure2, type Townsfolk2 } from './figures2';

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

const SMITHING = { label: 'Go to Smithing', opens: { skill: 'smithing' } } as const;

const TAVERN: Use = {
  name: 'The Gull & Anchor',
  lines: ['The door is shut, but the smell of stew gets out anyway.'],
  duskLines: ['Warm light, loud singing, and someone losing at cards with great dignity.'],
};
const SMITHY: Use = {
  name: 'The smithy',
  lines: ['Hot, loud, and smelling of honest work and singed eyebrows.'],
  duskLines: ['The forge is still going. So is the smith, by the sound of it.'],
  button: SMITHING,
};
const ANVIL: Use = {
  name: 'Anvil',
  lines: ['Older than the town, by the dents. It has been hit more often than the tavern door.'],
  button: SMITHING,
};
const CRATE_YOURS: Use = {
  name: 'Your crate',
  lines: ['Everything you have gathered, packed with more care than you would expect.'],
  button: { label: 'Open the bank', opens: { tab: 'bank' } },
};
const WELL: Use = {
  name: 'The well',
  lines: ['Deep and cold. Shout down it and it shouts back, but more politely.'],
};
const BOARD: Use = {
  name: 'Notice board',
  lines: [
    'LOST: one goat, answers to Duchess. FOUND: one goat, does not.',
    'Nothing yet worth drawing a sword over. Check back.',
  ],
};
const PINE: Use = {
  name: 'Pine',
  lines: [
    'Tall, straight and sticky. It would make a fine stack of logs, and it suspects as much.',
  ],
  button: { label: 'Go to Woodcutting', opens: { skill: 'woodcutting' } },
};
const LAMP: Use = {
  name: 'Street lamp',
  lines: ['Unlit. Someone comes round at six with a taper and a grudge.'],
  duskLines: ['Lit, and busy with moths making poor decisions.'],
};
const BARREL: Use = {
  name: 'Barrel',
  lines: ['Salted herring, by the smell. The lid is nailed down for everyone’s sake.'],
};
const CARGO: Use = {
  name: 'Cargo',
  lines: ['Stamped for somewhere warmer. Not yours, and the gulls are keeping count.'],
};
const BUOY: Use = {
  name: 'Buoy',
  lines: ['Red, white and bobbing. It marks something underneath. Nobody agrees what.'],
};
const CRAB: Use = {
  name: 'Crab',
  lines: ['It has claimed this bit of quay. It is prepared to discuss it.'],
};
const BUCKET: Use = {
  name: 'Bucket',
  lines: ['Half full of seawater and one very confident shrimp.'],
};
const NET: Use = {
  name: 'Fishing net',
  lines: ['Spread out to dry. It dries in the sun and in the rain at about the same speed.'],
};
const ROWBOAT: Use = {
  name: 'Rowing boat',
  lines: [
    'Tied up and bailed out, mostly. The name has worn off; it answers to “oi”.',
    'Round the point is Brinebeard’s Grotto, where the tide comes and goes as it likes.',
    'Take iron, at least, and a good stack of cooked fish. Mind the water: it moves.',
  ],
  button: {
    label: 'Row out to Brinebeard’s Grotto',
    opens: { dungeon: 'brinebeards_grotto' },
  },
};
const SHIP: Use = {
  name: 'The ship',
  lines: [
    'Black flag, patched sail, and barnacles that have clearly settled in for the long haul.',
  ],
  duskLines: ['One window lit aboard, and somebody in it singing badly about a mermaid.'],
};
const WRECK: Use = {
  name: 'The rock',
  lines: ['A rock with a face, and the bones of a ship that met it. The face looks sorry. Mostly.'],
};

/** What each placement with a name of its own says. */
const NAMED: Readonly<Record<string, Use>> = {
  tavern: TAVERN,
  smithy: SMITHY,
  anvil: ANVIL,
  'crate-yours': CRATE_YOURS,
  well: WELL,
  board: BOARD,
  crab: CRAB,
  bucket: BUCKET,
  net: NET,
  rowboat: ROWBOAT,
  ship: SHIP,
  wreck: WRECK,
  buoy: BUOY,
  'buoy-far': BUOY,
};

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
  if (name.startsWith('pine-')) return PINE;
  if (name.startsWith('lamp-')) return LAMP;
  if (name.startsWith('barrel-')) return BARREL;
  if (name.startsWith('crate-cargo-')) return CARGO;
  if (name.startsWith('fence-')) return FENCE;
  if (name.startsWith('bench-')) return BENCH;
  if (name.startsWith('planter-')) return PLANTER;
  if (name.startsWith('bush-')) return BUSH;
  if (name.startsWith('boulder-')) return BOULDER;
  return NAMED[name] ?? null;
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

/**
 * Placements that are only looked at: none now. Lane B moved the far buoy
 * (B9) to where the pier's end shows it, and it can be tapped like the rest;
 * `tests/scene/reach.test.ts` holds every tappable thing to being tappable.
 */
const LOOKED_AT_ONLY: ReadonlySet<string> = new Set<string>();

/** The townsfolk: where each stands, which sides the hero talks to them from, and their figure. */
export interface Townsperson2 {
  readonly id: string;
  readonly figure: Townsfolk2;
  /** Where they stand, or for a stroller, where they rest at home. */
  readonly at: Cell;
  readonly sides: readonly (-1 | 1)[];
  readonly use: Use;
  /** A turn they take about the square, if they do not stand still. */
  readonly stroll?: Stroll;
}

export const TOWNSFOLK2_AT: readonly Townsperson2[] = [
  // Between the anvil and the forge, where the work is.
  { id: 'smith', figure: 'smith', at: { col: 40, row: 48 }, sides: [-1, 1], use: SMITH },
  // At the stall's east end, as in the current town.
  { id: 'trader', figure: 'trader', at: { col: 13, row: 53 }, sides: [1], use: TRADER },
  // A few boards out along the pier, looking at the ship.
  { id: 'captain', figure: 'pirate', at: { col: 28, row: 64 }, sides: [1], use: CAPTAIN },
  // The villagers. The alewife on the tavern's front, a few steps along from its door.
  { id: 'alewife', figure: 'alewife', at: { col: 17, row: 46 }, sides: [-1, 1], use: ALEWIFE },
  // The market woman by the stall's west end, where the people are; she walks up the
  // west side of the square to the corner by the tavern's lamp and back.
  {
    id: 'market',
    figure: 'market',
    at: { col: 6, row: 53 },
    sides: [-1, 1],
    use: MARKET,
    stroll: {
      route: [
        { col: 6, row: 53 },
        { col: 6, row: 51 },
        { col: 2, row: 51 },
      ],
      restMs: 4000,
      speed: 40,
      startMs: 0,
    },
  },
  // The docker on the quay beside the east cargo.
  { id: 'docker', figure: 'docker', at: { col: 38, row: 58 }, sides: [1], use: DOCKER },
  // The old man by the bench east of the well, who takes a slow turn above it toward the smithy.
  {
    id: 'elder',
    figure: 'elder',
    at: { col: 34, row: 54 },
    sides: [-1, 1],
    use: ELDER,
    stroll: {
      route: [
        { col: 34, row: 54 },
        { col: 34, row: 52 },
        { col: 41, row: 52 },
      ],
      restMs: 5000,
      speed: 30,
      startMs: 9000,
    },
  },
];

/** The townsfolk who stand still: painted with the town, off the main thread. */
export const STANDING2: readonly Townsperson2[] = TOWNSFOLK2_AT.filter((p) => !p.stroll);
/** The townsfolk who take a turn about the square: painted on the page as they walk. */
export const STROLLERS2: readonly (Townsperson2 & { readonly stroll: Stroll })[] =
  TOWNSFOLK2_AT.filter((p): p is Townsperson2 & { stroll: Stroll } => !!p.stroll);

/** A person's tap box: about their figure, standing on their tile. */
const PERSON_TAP = { w: 36, h: 66 };

/** A person's tap box with their feet at `feet`. */
export function personTap(feet: Point): Box {
  return {
    x: feet.x - PERSON_TAP.w / 2,
    y: feet.y + 2 - PERSON_TAP.h,
    w: PERSON_TAP.w,
    h: PERSON_TAP.h,
  };
}

/** Where a townsperson's feet are: the middle of their tile, as the hero's are on his. */
export function feetOf(p: Townsperson2): Point {
  return centreOf(p.at, T);
}

/**
 * How far in front of where he stands the hero reaches, standing, in any
 * gear: the widest any wearable makes him on the side he faces (a shield's
 * rim; weapons are carried behind). `tests/scene/talk2.test.ts` holds every
 * wearable to it.
 */
export const HERO_FRONT = 17;
/** A little air between two people talking, in art pixels. */
const TALK_AIR = 2;

/**
 * How far from someone's feet the hero stands to talk to them: their reach
 * toward him (they turn to face him) and his toward them, and a little air,
 * so the two never overlap. From lane B's picture of them, never guessed.
 */
export function talkGap(figure: Townsfolk2): number {
  const drawn = townsfolkFigure2(figure)?.drawn;
  const front = drawn ? drawn.right - FIGURE2_ANCHOR_X : FIGURE2_W / 2 - 4;
  return front + HERO_FRONT + TALK_AIR;
}

/**
 * Where the hero stands to talk to someone with their feet at `feet`, on
 * their side `side`: `gap` off, level with them, or as near that as the
 * ground allows (somewhere he can stand, reached in a straight line from the
 * middle of the tile beside them). Null if even that tile is not open.
 */
export function standBeside(map: TileMap, feet: Point, side: -1 | 1, gap: number): Point | null {
  const spot = { col: cellAt(feet, T).col + side, row: cellAt(feet, T).row };
  if (isSolid(map, spot)) return null;
  const middle = centreOf(spot, T);
  for (let g = Math.round(gap); g > T; g--) {
    const p = { x: feet.x + side * g, y: feet.y };
    if (!isSolid(map, cellAt(p, T)) && clearLine(map, middle, p, STAND_HALF)) return p;
  }
  return middle;
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
  // Someone who strolls is never in the way and is tapped where they are now
  // (`town2Folk.ts`): here they are only their words, under their id.
  if (p.stroll) return { id: p.id, footprint: [], base: feet.y, use: p.use };
  return {
    id: p.id,
    footprint: [p.at],
    base: feet.y,
    tap: personTap(feet),
    spots: p.sides.map((d) => ({ col: p.at.col + d, row: p.at.row })),
    use: p.use,
  };
}

/** Each standing person's talking points, one per side, once the ground is known. */
function withStands(map: TileMap, thing: Thing, p: Townsperson2): Thing {
  if (p.stroll) return thing;
  const gap = talkGap(p.figure);
  const stand = p.sides.map((d) => standBeside(map, feetOf(p), d, gap) ?? centreOf(p.at, T));
  return { ...thing, stand };
}

/** Every tile a stroller walks on, by key: nobody else is sent to stand there. */
const STROLLED: ReadonlySet<string> = new Set(
  STROLLERS2.flatMap((p) => {
    const cells: string[] = [];
    const r = p.stroll.route;
    for (let i = 1; i < r.length; i++) {
      const a = r[i - 1]!;
      const b = r[i]!;
      const n = Math.max(Math.abs(b.col - a.col), Math.abs(b.row - a.row));
      for (let k = 0; k <= n; k++)
        cells.push(
          `${a.col + Math.sign(b.col - a.col) * k},${a.row + Math.sign(b.row - a.row) * k}`,
        );
    }
    return cells;
  }),
);

/** Every tile a stroller walks through. */
export const strolledTiles = (): ReadonlySet<string> => STROLLED;

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
    if (!p || !TREE.test(p.id)) return thing;
    // Deep in the forest, with nowhere to stand beside it, a pine is only looked at: what of it
    // is not hidden by the pines in front of it lies off the map, or under the sun button.
    if (thing.id.startsWith('pine-forest') && spotsBeside(map, thing).length === 0)
      return scenery(thing);
    if (thing.footprint.length === 0) return thing;
    const below = Math.max(...thing.footprint.map((c) => c.row)) + 1;
    const front = thing.footprint
      .filter((c) => c.row === below - 1)
      .map((c) => ({ col: c.col, row: below }))
      .filter((c) => !isSolid(map, c));
    return front.length ? { ...thing, spots: front } : thing;
  });
  for (let i = 0; i < things.length; i++) {
    let thing = things[i]!;
    if (LOOKED_AT_ONLY.has(thing.id)) thing = scenery(thing);
    const person = i >= placed.length ? TOWNSFOLK2_AT[i - placed.length] : undefined;
    if (person) thing = withStands(map, thing, person);
    // Nobody is sent to stand where a stroller walks: the old man's bench is
    // used from its other sides, not from where he rests.
    else if (usable(thing)) {
      const spots = spotsBeside(map, thing);
      const clear = spots.filter((c) => !STROLLED.has(`${c.col},${c.row}`));
      if (clear.length && clear.length < spots.length) thing = { ...thing, spots: clear };
    }
    things[i] = thing;
  }
  return {
    map,
    things,
    speed: WALK_SPEED2,
    stride: STRIDE2,
    notice: NOTICE2,
  };
}

/** A thing with nothing to tap or say: only scenery. */
function scenery(thing: Thing): Thing {
  const { id, footprint, base, spots, panelOf, sprite } = thing;
  return {
    id,
    footprint,
    base,
    ...(spots ? { spots } : {}),
    ...(panelOf ? { panelOf } : {}),
    ...(sprite ? { sprite } : {}),
  };
}

let built: Scene | null = null;

/** The C-scale town's scene, built once a page. */
export function town2Scene(): Scene {
  built ??= buildTown2Scene();
  return built;
}

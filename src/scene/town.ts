/*
 * Gullwick, as data: the ground, what stands on it and what each thing says.
 * The layout is the approved mock-up's town (docs/art-reference/town-mockup.html,
 * whose placements are lane B's `townLayout()`), opened out to a map bigger
 * than a phone screen: the tavern and the smithy at the top with the road
 * north between them and a strip of grass behind them, the square with the
 * well, the stall, the notice board, crates, barrels and lamps, then the quay
 * wall, the pier running out past the captain, and the sea with the ship, the
 * rowing boat, the rock and its wreck. The middle of the town is the mock-up
 * spaced out by about half again down the square; the extra width is a pine
 * grove to the east and room round the stall to the west.
 */
import type { Glow, Picture } from '../art/raster';
import type { Ambient, Loop } from './ambient';
import { blockFootprints, type Box, type Scene, type Thing, type Use } from './things';
import { parseMap, TILE, type Cell, type Point, type TileKind } from './tileMap';
import {
  HERO_FEET,
  SHADOW_MIDDLE,
  chimneySmoke,
  gulls,
  litBy,
  mirrored,
  paintGround,
  shadowShadeAt,
  shoreFoam,
  townPieceFor,
  walkerShadow,
  type GroundPlan,
  type GroundShadow,
  type PieceId,
} from './townArt';
import { CAPTAIN, SMITH, TRADER } from './townsfolk';
import type { Grid } from '../art/grid';
import { picture } from '../art/raster';
import type { Shade } from '../art/palette';

export type TownTile =
  'forest' | 'verge' | 'grass' | 'cobble' | 'road' | 'north' | 'quay' | 'sea' | 'pier';

export const TOWN_KINDS: Readonly<Record<TownTile, TileKind>> = {
  forest: { solid: true },
  // The tree line down each side: the map's edge, kept a tile in so nobody's sword is cut off by it.
  verge: { solid: true },
  grass: { solid: false },
  cobble: { solid: false },
  road: { solid: false },
  // The road north, drawn on into the forest but not open yet; a hero standing on it would be off the map.
  north: { solid: true },
  quay: { solid: true },
  sea: { solid: true },
  pier: { solid: false },
};

const KEY: Readonly<Record<string, TownTile>> = {
  T: 'forest',
  v: 'verge',
  '^': 'north',
  ',': 'grass',
  '.': 'cobble',
  ':': 'road',
  '#': 'quay',
  '~': 'sea',
  '=': 'pier',
};

const NORTH = 'TTTTTTTTTTTTT^^TTTTTTTTTTTTT';
const GREEN = 'v,,,,,,,,,,,,::,,,,,,,,,,,,v';
const SQUARE = 'v..........................v';
const QUAY = '#############==#############';
const PIER = '~~~~~~~~~~~~~==~~~~~~~~~~~~~';
const SEA = '~~~~~~~~~~~~~~~~~~~~~~~~~~~~';
const times = (n: number, row: string): string[] => Array.from({ length: n }, () => row);

/**
 * The ground: 28 by 40 tiles (448 by 640 art pixels). Walking is decided
 * here and by footprints; the pictures follow it, never the other way round.
 */
export const TOWN_GROUND = parseMap(
  [
    ...times(3, NORTH), // rows 0-2: the forest
    ...times(8, GREEN), // rows 3-10: grass behind and between the tavern and the smithy, the road, the grove
    ...times(9, SQUARE), // rows 11-19: the square
    QUAY, // row 20: the quay wall, the pier's head
    ...times(10, PIER), // rows 21-30: the pier
    ...times(9, SEA), // rows 31-39
  ],
  KEY,
  TOWN_KINDS,
);

export const TOWN_WIDTH = TOWN_GROUND.cols * TILE;
export const TOWN_HEIGHT = TOWN_GROUND.rows * TILE;

/**
 * Where the hero first stands: in the square right of the well, near where the
 * mock-up has him, with the tavern and the smithy both in view.
 */
export const TOWN_START: Cell = { col: 14, row: 17 };

/** The pier: its deck over columns 13 and 14, running out from the square to row 30. */
const PIER_AT = { x: 13 * TILE - 6, y: 19 * TILE + 6, length: 192 };

/** Where each ground lies in art pixels, matching the tiles above. */
export const GROUND_PLAN: GroundPlan = {
  width: TOWN_WIDTH,
  height: TOWN_HEIGHT,
  forestDepth: 3 * TILE,
  road: { x: 14 * TILE, until: 11 * TILE },
  flowers: [
    { box: { x: 0, y: 44, w: TOWN_WIDTH, h: 130 }, n: 46 },
    { box: { x: 352, y: 176, w: 80, h: 30 }, n: 4 },
  ],
  // Starts six rows above the tavern's step, where the mock-up's square tapers into the grass.
  square: { x: 8, y: 11 * TILE - 6, w: TOWN_WIDTH - 16, h: 9 * TILE + 6 },
  // A ring for the rowing boat's line, and others along the wall as the mock-up spaced them.
  quay: { y: 20 * TILE, rings: [34, 140, 290, 372, 420] },
  pier: PIER_AT,
  net: { x: 11 * TILE, y: 18 * TILE + 5 },
};

/** Every tile from (c0, r0) to (c1, r1), both included. */
function block(c0: number, r0: number, c1: number, r1: number): Cell[] {
  const cells: Cell[] = [];
  for (let row = r0; row <= r1; row++)
    for (let col = c0; col <= c1; col++) cells.push({ col, row });
  return cells;
}

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
const SMITHING = { label: 'Go to Smithing', opens: { skill: 'smithing' } } as const;

/** One thing in the town: a piece, the tiles it stands on, and what it is for. */
interface Placement {
  readonly id: string;
  readonly piece: PieceId;
  /** The tiles it makes solid. Things afloat stand on water, which is solid already, and have none. */
  readonly footprint: readonly Cell[];
  /** Its picture's top-left. Without one, the picture stands centred on its footprint's bottom edge. */
  readonly at?: Point;
  /** Its base line, for things with no footprint to take it from: its picture's own. */
  readonly afloat?: true;
  /** Where a tap picks it: a box, or a size that stands centred on its footprint's bottom edge. */
  readonly tap?: Box | { readonly w: number; readonly h: number };
  readonly spots?: readonly Cell[];
  readonly use?: Use;
  readonly panelOf?: string;
  /** Someone who turns to look at the hero when he comes near. */
  readonly turns?: true;
}

const pine = (id: string, col: number, row: number, n: 1 | 2 | 3, use = true): Placement => ({
  id,
  piece: n === 1 ? 'pine' : n === 2 ? 'pine_2' : 'pine_3',
  footprint: [{ col, row }],
  tap: { w: 24, h: 40 },
  ...(use ? { use: PINE } : {}),
});
const lamp = (id: string, col: number, row: number): Placement => ({
  id,
  piece: 'lamp',
  footprint: [{ col, row }],
  tap: { w: 12, h: 30 },
  use: LAMP,
});
const prop = (
  id: string,
  piece: 'barrel' | 'crate',
  col: number,
  row: number,
  use: Use,
): Placement => ({
  id,
  piece,
  footprint: [{ col, row }],
  tap: { w: 16, h: 18 },
  use,
});
/**
 * Someone standing about. The hero talks to them from beside them, never from
 * in front, where he would stand over them, or behind, where they would hide him.
 */
const person = (
  id: string,
  piece: PieceId,
  col: number,
  row: number,
  use: Use,
  sides: readonly (-1 | 1)[],
): Placement => ({
  id,
  piece,
  footprint: [{ col, row }],
  tap: { w: 24, h: 46 },
  spots: sides.map((d) => ({ col: col + d, row })),
  use,
  turns: true,
});

export const TOWN_LAYOUT: readonly Placement[] = [
  {
    id: 'tavern',
    piece: 'tavern',
    footprint: block(5, 7, 12, 10),
    at: { x: 74, y: 64 },
    // The door and the lantern beside it.
    tap: { x: 126, y: 146, w: 44, h: 32 },
    spots: [{ col: 8, row: 11 }],
    use: {
      name: 'The Gull & Anchor',
      lines: ['The door is shut, but the smell of stew gets out anyway.'],
      duskLines: ['Warm light, loud singing, and someone losing at cards with great dignity.'],
    },
  },
  {
    id: 'smithy',
    piece: 'smithy',
    footprint: block(16, 7, 21, 9),
    at: { x: 256, y: 74 },
    // Its open front, forge and all.
    tap: { x: 267, y: 121, w: 53, h: 39 },
    spots: [{ col: 18, row: 10 }],
    use: {
      name: 'The smithy',
      lines: ['Hot, loud, and smelling of honest work and singed eyebrows.'],
      duskLines: ['The forge is still going. So is the smith, by the sound of it.'],
      button: SMITHING,
    },
  },
  person('smith', 'smith', 20, 10, SMITH, [-1, 1]),
  {
    id: 'anvil',
    piece: 'anvil',
    footprint: [{ col: 17, row: 11 }],
    tap: { w: 20, h: 16 },
    use: {
      name: 'Anvil',
      lines: [
        'Older than the town, by the dents. It has been hit more often than the tavern door.',
      ],
      button: SMITHING,
    },
  },
  {
    id: 'signpost',
    piece: 'signpost',
    footprint: [{ col: 12, row: 11 }],
    tap: { w: 22, h: 24 },
    use: {
      name: 'Signpost',
      lines: ['One arm, pointing north. The sign-painter felt the sea could speak for itself.'],
    },
  },
  {
    id: 'crate-yours',
    piece: 'crate',
    footprint: [{ col: 10, row: 11 }],
    tap: { w: 16, h: 18 },
    use: {
      name: 'Your crate',
      lines: ['Everything you have gathered, packed with more care than you would expect.'],
      button: { label: 'Open the bank', opens: { tab: 'bank' } },
    },
  },
  {
    id: 'well',
    piece: 'well',
    footprint: block(12, 14, 13, 14),
    tap: { w: 30, h: 34 },
    use: {
      name: 'The well',
      lines: ['Deep and cold. Shout down it and it shouts back, but more politely.'],
    },
  },
  {
    id: 'board',
    piece: 'notice_board',
    footprint: block(19, 14, 20, 14),
    tap: { w: 26, h: 30 },
    use: {
      name: 'Notice board',
      lines: [
        'LOST: one goat, answers to Duchess. FOUND: one goat, does not.',
        'Nothing yet worth drawing a sword over. Check back.',
      ],
    },
  },
  {
    id: 'stall',
    piece: 'stall',
    footprint: block(3, 15, 6, 16),
    at: { x: 49, y: 233 },
    tap: { x: 49, y: 233, w: 62, h: 40 },
    // The counter, from the front.
    spots: [{ col: 5, row: 17 }],
    panelOf: 'trader',
  },
  person('trader', 'trader', 7, 16, TRADER, [1]),
  lamp('lamp-tavern', 4, 11),
  lamp('lamp-west', 9, 16),
  lamp('lamp-east', 18, 16),
  lamp('lamp-corner', 2, 19),
  lamp('lamp-grove', 24, 14),
  {
    // On the pier's left edge near its end, as in the mock-up, so a tap on the end itself walks there.
    ...lamp('lamp-pier', 13, 30),
    at: { x: PIER_AT.x + 4, y: 31 * TILE - 29 },
    tap: { x: PIER_AT.x + 4, y: 31 * TILE - 29, w: 9, h: 29 },
  },
  prop('crate-cargo-1', 'crate', 16, 17, CARGO),
  prop('crate-cargo-2', 'crate', 16, 18, CARGO),
  prop('crate-cargo-3', 'crate', 17, 18, CARGO),
  prop('crate-cargo-4', 'crate', 25, 17, CARGO),
  prop('crate-cargo-5', 'crate', 24, 18, CARGO),
  prop('crate-cargo-6', 'crate', 25, 18, CARGO),
  prop('barrel-quay-1', 'barrel', 19, 18, BARREL),
  prop('barrel-quay-2', 'barrel', 20, 19, BARREL),
  prop('barrel-quay-3', 'barrel', 10, 19, BARREL),
  prop('barrel-quay-4', 'barrel', 23, 19, BARREL),
  prop('barrel-stall', 'barrel', 2, 16, BARREL),
  {
    id: 'crab',
    piece: 'crab',
    footprint: [{ col: 21, row: 19 }],
    tap: { w: 14, h: 10 },
    use: {
      name: 'Crab',
      lines: ['It has claimed this bit of quay. It is prepared to discuss it.'],
    },
  },
  {
    id: 'bucket',
    piece: 'bucket',
    footprint: [{ col: 15, row: 19 }],
    tap: { w: 12, h: 9 },
    use: { name: 'Bucket', lines: ['Half full of seawater and one very confident shrimp.'] },
  },
  {
    // Lies flat on the cobbles (painted with the ground), so it is walked over, not round.
    id: 'net',
    piece: 'net',
    footprint: [],
    tap: { x: GROUND_PLAN.net.x, y: GROUND_PLAN.net.y, w: 31, h: 14 },
    spots: [{ col: 11, row: 17 }],
    use: {
      name: 'Fishing net',
      lines: ['Spread out to dry. It dries in the sun and in the rain at about the same speed.'],
    },
  },
  person('captain', 'pirate', 13, 22, CAPTAIN, [1]),
  {
    id: 'rowboat',
    piece: 'rowboat',
    footprint: [],
    at: { x: 113, y: 20 * TILE + 10 },
    afloat: true,
    tap: { x: 113, y: 336, w: 35, h: 17 },
    spots: [
      { col: 8, row: 19 },
      { col: 9, row: 19 },
    ],
    use: {
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
    },
  },
  {
    id: 'ship',
    piece: 'ship',
    footprint: [],
    at: { x: 256, y: 378 },
    afloat: true,
    tap: { x: 262, y: 383, w: 80, h: 95 },
    spots: [
      { col: 14, row: 27 },
      { col: 14, row: 28 },
    ],
    use: {
      name: 'The ship',
      lines: [
        'Black flag, patched sail, and barnacles that have clearly settled in for the long haul.',
      ],
      duskLines: ['One window lit aboard, and somebody in it singing badly about a mermaid.'],
    },
  },
  {
    id: 'wreck',
    piece: 'wreck_rock',
    footprint: [],
    at: { x: 30, y: 496 },
    afloat: true,
    tap: { x: 30, y: 500, w: 68, h: 42 },
    spots: [{ col: 13, row: 29 }],
    use: {
      name: 'The rock',
      lines: [
        'A rock with a face, and the bones of a ship that met it. The face looks sorry. Mostly.',
      ],
    },
  },
  {
    id: 'buoy',
    piece: 'buoy',
    footprint: [],
    at: { x: 150, y: 462 },
    afloat: true,
    tap: { x: 150, y: 462, w: 11, h: 13 },
    spots: [{ col: 13, row: 27 }],
    use: BUOY,
  },
  {
    id: 'buoy-far',
    piece: 'buoy',
    footprint: [],
    at: { x: 380, y: 566 },
    afloat: true,
    tap: { x: 380, y: 566, w: 11, h: 13 },
    spots: [{ col: 14, row: 30 }],
    use: BUOY,
  },
  // A grove east of the smithy, for Woodcutting.
  pine('pine-grove-1', 23, 4, 1),
  pine('pine-grove-2', 25, 6, 2),
  pine('pine-grove-3', 23, 8, 3),
  pine('pine-grove-4', 25, 10, 1),
  // West of the tavern, where the mock-up has a stray pine.
  pine('pine-west-1', 2, 5, 2),
  pine('pine-west-2', 2, 9, 3),
  // The tree line down each side.
  pine('pine-edge-w1', 0, 4, 1),
  pine('pine-edge-w2', 0, 8, 2),
  pine('pine-edge-w3', 0, 12, 3),
  pine('pine-edge-w4', 0, 16, 1),
  pine('pine-edge-e1', 27, 4, 3),
  pine('pine-edge-e2', 27, 8, 2),
  pine('pine-edge-e3', 27, 12, 1),
  pine('pine-edge-e4', 27, 16, 3),
];

/** Smoke from the two chimneys, where the art lane attaches it (`attached` in its index). */
const SMOKE = { tavern: { x: 74 + 93, y: 64 - 20 }, smithy: { x: 256 + 73, y: 74 - 26 } };

/** Three gulls on lazy loops over the harbour, where the mock-up has its three. */
export const GULL_LOOPS: readonly Loop[] = [
  { x: 330, y: 392, rx: 46, ry: 14, lapMs: 24000, start: 0.1, turn: 1 },
  { x: 80, y: 430, rx: 34, ry: 11, lapMs: 19000, start: 0.6, turn: -1 },
  { x: 220, y: 592, rx: 42, ry: 12, lapMs: 30000, start: 0.3, turn: 1 },
];

/** The bottom edge of a footprint, in art pixels: the base line of what stands on it. */
function baseOf(cells: readonly Cell[]): number {
  return (Math.max(...cells.map((c) => c.row)) + 1) * TILE;
}

function middleOf(cells: readonly Cell[]): number {
  const cols = cells.map((c) => c.col);
  return ((Math.min(...cols) + Math.max(...cols) + 1) * TILE) / 2;
}

/** A box `w` by `h` standing centred on a footprint's bottom edge. */
function standing(cells: readonly Cell[], w: number, h: number): Box {
  return { x: Math.round(middleOf(cells) - w / 2), y: baseOf(cells) - h, w, h };
}

/** Everything the stage needs to draw the town, beside the rules in `Scene`. */
export interface TownArt {
  /** The ground, one grid the size of the map, before any palette. */
  readonly groundGrid: Grid;
  /** The ground with every evening light in town on it. */
  readonly ground: Picture;
  readonly heroFeet: Point;
  /** Every lamp, window and fire in town, in art pixels: what lights the hero at dusk (`Hero`). */
  readonly lights: readonly Glow[];
  /** The hero's shadow on whatever ground is at `feet` and the point of it under the feet; null over water. */
  shadowAt(feet: Point): { readonly picture: Picture; readonly middle: Point } | null;
  /** Smoke, gulls and foam. */
  readonly ambient: readonly Ambient[];
}

export interface Town {
  readonly scene: Scene;
  readonly art: TownArt;
}

/** Builds the town: its pieces placed, its ground painted, its lights shared out. */
export function buildTown(): Town {
  const placed = TOWN_LAYOUT.map((p) => {
    const piece = townPieceFor(p.piece);
    const pic = piece.picture;
    const at = p.at ?? standing(p.footprint, pic.grid.w, pic.grid.h);
    const tap = p.tap && ('x' in p.tap ? p.tap : standing(p.footprint, p.tap.w, p.tap.h));
    const base = p.afloat || p.footprint.length === 0 ? at.y + piece.base : baseOf(p.footprint);
    return { p, piece, at: { x: at.x, y: at.y }, tap, base };
  });

  const lights: Glow[] = placed.flatMap(({ piece, at }) =>
    piece.picture.glows.map((glow) => ({ ...glow, x: glow.x + at.x, y: glow.y + at.y })),
  );
  const shadows: GroundShadow[] = placed.flatMap(({ piece, at }) =>
    piece.shadow
      ? [
          {
            x: at.x + piece.shadow.x,
            y: at.y + piece.shadow.y,
            rx: piece.shadow.rx,
            ry: piece.shadow.ry,
          },
        ]
      : [],
  );
  const groundGrid = paintGround(GROUND_PLAN, shadows);

  // The net is painted into the ground; everything else stands.
  const things: Thing[] = placed.map(({ p, piece, at, tap, base }) => ({
    id: p.id,
    footprint: p.footprint,
    base,
    ...(tap ? { tap } : {}),
    ...(p.spots ? { spots: p.spots } : {}),
    ...(p.use ? { use: p.use } : {}),
    ...(p.panelOf ? { panelOf: p.panelOf } : {}),
    ...(p.piece === 'net'
      ? {}
      : {
          sprite: {
            picture: litBy(piece.picture, at, lights),
            at,
            ...(p.turns
              ? { turned: litBy(picture(mirrored(piece.picture.grid)), at, lights) }
              : {}),
          },
        }),
  }));

  const shadowPictures = new Map<Shade, Picture>();
  return {
    scene: { map: blockFootprints(TOWN_GROUND, things), things },
    art: {
      groundGrid,
      ground: picture(groundGrid, lights),
      heroFeet: HERO_FEET,
      lights,
      shadowAt(feet) {
        const shade = shadowShadeAt(groundGrid, feet);
        if (!shade) return null;
        let pic = shadowPictures.get(shade);
        if (!pic) {
          pic = walkerShadow(shade);
          shadowPictures.set(shade, pic);
        }
        return { picture: pic, middle: SHADOW_MIDDLE };
      },
      ambient: [
        chimneySmoke('tavern_smoke', SMOKE.tavern, 0),
        chimneySmoke('smithy_smoke', SMOKE.smithy, 1300),
        shoreFoam(groundGrid, GROUND_PLAN, lights),
        ...gulls(GULL_LOOPS),
      ],
    },
  };
}

let built: Town | null = null;

/** The town, built once a page and shared by every Town tab shown. */
export function town(): Town {
  built ??= buildTown();
  return built;
}

/*
 * Gullwick, as data: the ground, what stands on it and what each thing says.
 * The layout follows the approved mock-up (docs/art-reference/town-mockup.html),
 * widened and deepened so the camera has somewhere to go: the tavern and the
 * smithy's plot at the top with the road north between them, the square with
 * the well, the notice board and the stall's plot, then the quay, the pier and
 * the sea.
 *
 * Plots marked PLOT are where lane B's pieces go in S12b; docs/status/lane-c.md
 * lists each one's place and size.
 */
import type { Glow, Picture } from '../art/raster';
import { blockFootprints, type Box, type Scene, type Thing, type Use } from './things';
import { parseMap, TILE, type Cell, type Point, type TileKind } from './tileMap';
import {
  HERO_FEET,
  SHADOW_MIDDLE,
  heroPicture,
  litBy,
  paintGround,
  shadowShadeAt,
  townPieces,
  walkerShadow,
  type GroundPlan,
  type GroundShadow,
  type PieceId,
} from './townArt';
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
const FOREST = 'TTTTTTTTTTTTT::TTTTTTTTTTTTT';
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
    ...times(3, NORTH), // rows 0-2
    FOREST, // row 3
    ...times(6, GREEN), // rows 4-9: the tavern, the road, the smithy's plot, the pines
    ...times(12, SQUARE), // rows 10-21
    QUAY, // row 22
    ...times(8, PIER), // rows 23-30
    ...times(9, SEA), // rows 31-39
  ],
  KEY,
  TOWN_KINDS,
);

export const TOWN_WIDTH = TOWN_GROUND.cols * TILE;
export const TOWN_HEIGHT = TOWN_GROUND.rows * TILE;

/** Where the hero first stands: in the square by the tavern, with the road north in view. */
export const TOWN_START: Cell = { col: 9, row: 11 };

/** Where each ground lies in art pixels, matching the tiles above. */
export const GROUND_PLAN: GroundPlan = {
  width: TOWN_WIDTH,
  height: TOWN_HEIGHT,
  forestDepth: 4 * TILE,
  road: { centre: 14 * TILE, half: 12, until: 10 * TILE },
  square: { x: TILE, y: 150, w: 26 * TILE, h: 22 * TILE - 150 },
  quay: { x: 0, y: 22 * TILE, w: TOWN_WIDTH, h: TILE }, // PLOT: quay
  sea: { x: 0, y: 23 * TILE, w: TOWN_WIDTH, h: 17 * TILE }, // PLOT: sea
  pier: { x: 13 * TILE, y: 22 * TILE, w: 2 * TILE, h: 9 * TILE }, // PLOT: pier
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

/** One thing in the town: a piece, the tiles it stands on, and what it is for. */
interface Placement {
  readonly id: string;
  readonly piece: PieceId;
  readonly footprint: readonly Cell[];
  /** Its picture's top-left. Without one, the picture stands centred on its footprint's bottom edge. */
  readonly at?: Point;
  /** Where a tap picks it: a box, or a size that stands centred on its footprint's bottom edge. */
  readonly tap?: Box | { readonly w: number; readonly h: number };
  readonly spots?: readonly Cell[];
  readonly use?: Use;
}

const pine = (id: string, col: number, row: number, n: 1 | 2 | 3): Placement => ({
  id,
  piece: `pine${n}`,
  footprint: [{ col, row }],
  tap: { w: 24, h: 40 },
  use: PINE,
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

export const TOWN_LAYOUT: readonly Placement[] = [
  {
    id: 'tavern',
    piece: 'tavern',
    footprint: block(1, 4, 9, 9),
    at: { x: 24, y: 48 },
    // The door and the lantern beside it.
    tap: { x: 72, y: 128, w: 44, h: 34 },
    spots: [{ col: 5, row: 10 }],
    use: {
      name: 'The Gull & Anchor',
      lines: ['The door is shut, but the smell of stew gets out anyway.'],
      duskLines: ['Warm light, loud singing, and someone losing at cards with great dignity.'],
    },
  },
  // PLOT: the smithy. Solid now so that S12b only swaps the picture.
  { id: 'smithy', piece: 'smithyPlot', footprint: block(16, 4, 21, 8) },
  // PLOT: the market stall.
  { id: 'stall', piece: 'stallPlot', footprint: block(3, 13, 6, 14) },
  {
    id: 'well',
    piece: 'well',
    footprint: block(12, 15, 13, 15),
    tap: { w: 30, h: 34 },
    use: {
      name: 'The well',
      lines: ['Deep and cold. Shout down it and it shouts back, but more politely.'],
    },
  },
  {
    id: 'board',
    piece: 'board',
    footprint: block(19, 13, 20, 13),
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
    id: 'crate-yours',
    piece: 'crate',
    footprint: [{ col: 8, row: 10 }],
    tap: { w: 16, h: 18 },
    use: {
      name: 'Your crate',
      lines: ['Everything you have gathered, packed with more care than you would expect.'],
      button: { label: 'Open the bank', opens: { tab: 'bank' } },
    },
  },
  lamp('lamp-west', 10, 14),
  lamp('lamp-east', 17, 14),
  lamp('lamp-corner', 1, 18),
  lamp('lamp-pier', 13, 30),
  prop('crate-cargo-1', 'crate', 18, 19, CARGO),
  prop('crate-cargo-2', 'crate', 18, 20, CARGO),
  prop('crate-cargo-3', 'crate', 19, 20, CARGO),
  prop('crate-cargo-4', 'crate', 10, 21, CARGO),
  prop('barrel-quay-1', 'barrel', 21, 20, BARREL),
  prop('barrel-quay-2', 'barrel', 22, 20, BARREL),
  prop('barrel-quay-3', 'barrel', 11, 21, BARREL),
  prop('barrel-stall', 'barrel', 7, 15, BARREL),
  pine('pine-grove-1', 23, 5, 1),
  pine('pine-grove-2', 26, 6, 2),
  pine('pine-grove-3', 24, 8, 3),
  // The tree line down each side. The two behind the tavern cannot be reached, so they only stand.
  { id: 'pine-west-1', piece: 'pine1', footprint: [{ col: 0, row: 5 }] },
  { id: 'pine-west-2', piece: 'pine3', footprint: [{ col: 0, row: 9 }] },
  pine('pine-west-3', 0, 12, 2),
  pine('pine-west-4', 0, 16, 1),
  pine('pine-west-5', 0, 19, 3),
  pine('pine-east-1', 27, 4, 3),
  pine('pine-east-2', 27, 9, 1),
  pine('pine-east-3', 27, 14, 2),
  pine('pine-east-4', 27, 17, 3),
  pine('pine-east-5', 27, 20, 1),
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
  readonly hero: Picture;
  readonly heroFeet: Point;
  /** The hero's shadow on whatever ground is at `feet` and the point of it under the feet; null over water. */
  shadowAt(feet: Point): { readonly picture: Picture; readonly middle: Point } | null;
}

export interface Town {
  readonly scene: Scene;
  readonly art: TownArt;
}

/** Builds the town: its pieces placed, its ground painted, its lights shared out. */
export function buildTown(): Town {
  const pieces = townPieces();
  const placed = TOWN_LAYOUT.map((p) => {
    const pic = pieces[p.piece].picture;
    const at = p.at ?? standing(p.footprint, pic.grid.w, pic.grid.h);
    const tap = p.tap && ('x' in p.tap ? p.tap : standing(p.footprint, p.tap.w, p.tap.h));
    return { p, at: { x: at.x, y: at.y }, tap };
  });

  const lights: Glow[] = placed.flatMap(({ p, at }) =>
    pieces[p.piece].picture.glows.map((glow) => ({ ...glow, x: glow.x + at.x, y: glow.y + at.y })),
  );
  const shadows: GroundShadow[] = placed.flatMap(({ p, at }) => {
    const { picture: pic, shadow } = pieces[p.piece];
    if (!shadow) return [];
    return [
      {
        x: at.x + (shadow.x ?? pic.grid.w / 2),
        y: at.y + (shadow.y ?? pic.grid.h - 3),
        rx: shadow.rx,
        ry: shadow.ry,
      },
    ];
  });
  const groundGrid = paintGround(
    GROUND_PLAN,
    [pieces.pine1.picture.grid, pieces.pine2.picture.grid, pieces.pine3.picture.grid],
    shadows,
  );

  const things: Thing[] = placed.map(({ p, at, tap }) => ({
    id: p.id,
    footprint: p.footprint,
    base: baseOf(p.footprint),
    ...(tap ? { tap } : {}),
    ...(p.spots ? { spots: p.spots } : {}),
    ...(p.use ? { use: p.use } : {}),
    sprite: { picture: litBy(pieces[p.piece].picture, at, lights), at },
  }));

  const shadowPictures = new Map<Shade, Picture>();
  return {
    scene: { map: blockFootprints(TOWN_GROUND, things), things },
    art: {
      groundGrid,
      ground: picture(groundGrid, lights),
      hero: heroPicture(),
      heroFeet: HERO_FEET,
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
    },
  };
}

let built: Town | null = null;

/** The town, built once a page and shared by every Town tab shown. */
export function town(): Town {
  built ??= buildTown();
  return built;
}

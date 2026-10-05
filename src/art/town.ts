/**
 * The town's art, for scenes to build with: every building, prop, boat and
 * person the approved mock-up (docs/art-reference/town-mockup.html) draws,
 * through one index keyed by plain ids, and the mock-up's whole town
 * assembled from them.
 *
 * The town is drawn exactly as the mock-up's town() draws it: the same
 * grounds and pieces, in the same order, from one random source seeded 21,
 * so it is the approved picture pixel for pixel (tests/art/town.test.ts runs
 * the mock-up's own code to check). Each piece in the index is the very
 * picture drawn there, wear and all.
 *
 * Everything here is a fact about the drawing (sizes, base lines, where a
 * door is). Where things stand, what is solid and what can be tapped are a
 * scene's own data.
 */
import {
  FIGURE_H,
  HERO_OUTFIT,
  PIRATE_OUTFIT,
  SMITH_OUTFIT,
  TRADER_OUTFIT,
  figure,
} from './figure';
import { cobbledSquare, quayWall, road, sea, wildflowers } from './ground';
import { blit, grid, groundShadow, rect, type Grid } from './grid';
import {
  anvil,
  bucket,
  buoy,
  crab,
  gull,
  net,
  pier,
  rowboat,
  ship,
  signpost,
  smithy,
  smithySmoke,
  stall,
  tavernSmoke,
  wreckRock,
} from './harbour';
import type { Shade } from './palette';
import { picture, type Glow, type Picture } from './raster';
import { seeded } from './rng';
import { barrel, crate, grass, lamp, noticeBoard, pine, tavern, well } from './scenery';

/** Every piece in the index. */
export const TOWN_IDS = [
  'tavern',
  'smithy',
  'stall',
  'pier',
  'ship',
  'well',
  'notice_board',
  'signpost',
  'anvil',
  'lamp',
  'barrel',
  'crate',
  'net',
  'bucket',
  'pine',
  'pine_2',
  'pine_3',
  'rowboat',
  'buoy',
  'wreck_rock',
  'crab',
  'gull',
  'tavern_smoke',
  'smithy_smoke',
  'hero',
  'pirate',
  'smith',
  'trader',
] as const;

export type TownId = (typeof TOWN_IDS)[number];

/** A point in art pixels, from a piece's top-left. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * How a piece is drawn among others. `ground`: lies flat, drawn with the
 * ground before anything standing (people walk over it). `stand`: stands up,
 * sorted with everything else that stands by base line (lower on screen is
 * in front). `above`: drawn over everything (smoke, birds).
 */
export type TownLayer = 'ground' | 'stand' | 'above';

/** A ground shadow, as the mock-up lays it: an ellipse in the ground's own dark step. */
export interface Shadow {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

/** Another piece that belongs with this one, drawn at (x, y) from this one's top-left. */
export interface Attached {
  readonly id: TownId;
  readonly x: number;
  readonly y: number;
}

export interface TownPiece {
  readonly id: TownId;
  /** The drawing, outline included, with its glows (lit at dusk; a forge's always). */
  readonly picture: Picture;
  /** Its size in art pixels (the picture's grid). */
  readonly w: number;
  readonly h: number;
  /**
   * The row, from the top, where it meets the ground: the bottom of its
   * feet, posts or step, or its waterline. Sort standing pieces by
   * `y + base`.
   */
  readonly base: number;
  readonly layer: TownLayer;
  /**
   * Where a person stands to use it (a door, a counter), as the point their
   * feet are on. Empty for most pieces.
   */
  readonly spots: Readonly<Record<string, Point>>;
  /** Its ground shadow in the mock-up, if it had one; drawn on the ground before it. */
  readonly shadow?: Shadow;
  /** Pieces drawn with it, such as a chimney's smoke. */
  readonly attached: readonly Attached[];
}

/** One piece placed in the mock-up's town, by its top-left. */
export interface Placement {
  readonly id: TownId;
  readonly x: number;
  readonly y: number;
}

/** The mock-up's town: one phone screen. */
export const TOWN_W = 270;
export const TOWN_H = 360;

/** Rows of the mock-up's town where its grounds change (for a scene laying out its own). */
export const TOWN_GROUND = {
  /** Grass from the top down to the quay; flecked down to row 138. */
  grass: { x: 0, y: 0, w: 270, h: 226 },
  /** Wild flowers in the grass. */
  flowers: { x: 0, y: 44, w: 270, h: 84, n: 18 },
  /** The road north: its middle column and rows. */
  road: { x: 152, y: 0, h: 140 },
  /** The cobbled square. */
  square: { x: 3, y: 126, w: 264, h: 100 },
  /** The quay wall's top row and its mooring rings. */
  quay: { x: 0, y: 226, w: 270, rings: [33, 87, 225] },
  /** The sea, from the shore down. */
  sea: { x: 0, y: 237, w: 270, h: 123 },
} as const;

type Meta = Omit<TownPiece, 'id' | 'picture' | 'w' | 'h' | 'attached'> & {
  readonly attached?: readonly Attached[];
};

const none = {};
const prop = (base: number): Meta => ({ base, layer: 'stand', spots: none });
const person = (cx: number, cy: number, base = FIGURE_H - 1): Meta => ({
  base,
  layer: 'stand',
  spots: none,
  shadow: { cx, cy, rx: 10, ry: 2.6 },
});

const META: Readonly<Record<TownId, Meta>> = {
  tavern: {
    base: 112,
    layer: 'stand',
    spots: { door: { x: 65, y: 114 } },
    shadow: { cx: 66, cy: 117, rx: 66, ry: 4 },
    attached: [{ id: 'tavern_smoke', x: 93, y: -20 }],
  },
  smithy: {
    base: 86,
    layer: 'stand',
    spots: { door: { x: 38, y: 88 } },
    shadow: { cx: 48, cy: 89, rx: 48, ry: 4 },
    attached: [{ id: 'smithy_smoke', x: 73, y: -26 }],
  },
  stall: {
    base: 39,
    layer: 'stand',
    spots: { counter: { x: 31, y: 41 } },
    shadow: { cx: 30, cy: 43, rx: 29, ry: 3.5 },
  },
  pier: { base: 126, layer: 'ground', spots: none },
  ship: prop(100),
  well: { ...prop(29), shadow: { cx: 14, cy: 30, rx: 15, ry: 3.5 } },
  notice_board: prop(27),
  signpost: prop(22),
  anvil: prop(12),
  lamp: prop(27),
  barrel: prop(15),
  crate: prop(13),
  net: { base: 13, layer: 'ground', spots: none },
  bucket: prop(7),
  pine: prop(39),
  pine_2: prop(39),
  pine_3: prop(39),
  rowboat: prop(21),
  buoy: prop(11),
  wreck_rock: prop(45),
  crab: prop(7),
  gull: { base: 3, layer: 'above', spots: none },
  tavern_smoke: { base: 17, layer: 'above', spots: none },
  smithy_smoke: { base: 23, layer: 'above', spots: none },
  hero: person(20, 47),
  pirate: person(19, 47),
  smith: person(20, 47),
  // Her shoes end a row above everyone else's boots.
  trader: person(20, 46, FIGURE_H - 2),
};

interface Built {
  readonly picture: Picture;
  readonly pieces: Readonly<Record<TownId, Picture>>;
  readonly layout: readonly Placement[];
}

/** The mock-up's town(), step for step. */
function build(): Built {
  const g = grid(TOWN_W, TOWN_H);
  const rand = seeded(21);
  const glows: Glow[] = [];
  const pieces = {} as Record<TownId, Picture>;
  const layout: Placement[] = [];
  const has = (id: TownId, make?: () => Grid | Picture): Picture => {
    if (!pieces[id]) {
      if (!make) throw new Error(`"${id}" is placed before it is drawn.`);
      const made = make();
      pieces[id] = 'grid' in made ? made : picture(made);
    }
    return pieces[id];
  };
  const place = (id: TownId, x: number, y: number, make?: () => Grid | Picture): void => {
    const pic = has(id, make);
    blit(g, pic.grid, x, y);
    for (const glow of pic.glows) glows.push({ ...glow, x: glow.x + x, y: glow.y + y });
    layout.push({ id, x, y });
  };
  const shade = (cx: number, cy: number, rx: number, ry: number, ground: Shade) =>
    groundShadow(g, cx, cy, ground, rx, ry);

  const G = TOWN_GROUND;
  rect(g, G.grass.x, G.grass.y, G.grass.w, G.grass.h, 'grass2');
  grass(g, rand, { x: 0, y: 0, w: 270, h: 138 });
  wildflowers(g, rand, G.flowers, G.flowers.n);
  road(g, rand, G.road.x, G.road.y, G.road.h);
  cobbledSquare(g, rand, G.square);
  quayWall(g, rand, G.quay.x, G.quay.y, G.quay.w, G.quay.rings);
  sea(g, rand, G.sea);

  // Two rows of pines along the top, leaving a gap for the road, then three strays.
  const pines: readonly TownId[] = ['pine', 'pine_2', 'pine_3'];
  for (const id of pines) has(id, () => pine(rand));
  const tree = (i: number) => pines[i % 3] as TownId;
  for (let x = -2, i = 0; x < 270; x += 15, i++) {
    if (x > 120 && x < 172) continue;
    place(tree(i), x, -26 + ((rand() * 8) | 0));
  }
  for (let x = -10, i = 1; x < 270; x += 15, i++) {
    if (x > 126 && x < 166) continue;
    place(tree(i), x, -14 + ((rand() * 10) | 0));
  }
  place('pine', -9, 90);
  place('pine_2', 251, 126);
  place('pine_3', -10, 144);

  const at = (id: TownId, x: number, y: number, ground: Shade, make?: () => Grid | Picture) => {
    const s = META[id].shadow;
    if (s) shade(x + s.cx, y + s.cy, s.rx, s.ry, ground);
    place(id, x, y, make);
  };
  at('tavern', 6, 20, 'cobble3', () => tavern(rand));
  at('smithy', 171, 35, 'grass3', () => smithy(rand));
  place('tavern_smoke', 99, 0, tavernSmoke);
  place('smithy_smoke', 244, 9, smithySmoke);
  place('signpost', 126, 96, signpost);
  place('anvil', 188, 130, anvil);
  at('well', 123, 144, 'cobble3', well);
  at('stall', 14, 156, 'cobble3', stall);
  place('notice_board', 226, 146, noticeBoard);
  for (const [x, y] of [
    [100, 168],
    [212, 172],
    [18, 196],
  ] as const)
    place('lamp', x, y, lamp);
  for (const [x, y] of [
    [183, 195],
    [199, 200],
    [190, 183],
  ] as const)
    place('crate', x, y, crate);
  for (const [x, y] of [
    [228, 198],
    [243, 205],
    [84, 204],
  ] as const)
    place('barrel', x, y, barrel);
  place('net', 104, 210, net);
  place('bucket', 155, 213, bucket);
  place('crab', 245, 216, crab);
  place('pier', 132, 216, () => pier(rand));
  place('lamp', 139, 310, lamp);
  place('rowboat', 60, 236, rowboat);
  place('ship', 180, 242, ship);
  place('wreck_rock', 12, 288, () => wreckRock(rand));
  place('buoy', 104, 306, buoy);
  at('smith', 223, 87, 'grass3', () => figure('smith', SMITH_OUTFIT));
  at('trader', 68, 158, 'cobble3', () => figure('trader', TRADER_OUTFIT));
  at('hero', 160, 153, 'cobble3', () => figure('standard', HERO_OUTFIT));
  at('pirate', 134, 236, 'wood3', () => figure('pirate', PIRATE_OUTFIT));
  for (const [x, y] of [
    [223, 263],
    [34, 257],
    [112, 339],
  ] as const)
    place('gull', x, y, gull);

  return { picture: picture(g, glows), pieces, layout };
}

let built: Built | null = null;
const town = (): Built => (built ??= build());

/** One piece of the town by id. */
export function townPiece(id: TownId): TownPiece {
  const pic = town().pieces[id];
  const meta = META[id];
  return {
    id,
    picture: pic,
    w: pic.grid.w,
    h: pic.grid.h,
    ...meta,
    attached: meta.attached ?? [],
  };
}

/** The mock-up's whole town, 270 x 360, with every glow. */
export function townPicture(): Picture {
  return town().picture;
}

/**
 * Where the mock-up puts each piece, in the order it draws them (pines
 * appear many times, lamps, crates and barrels a few). Grounds and shadows
 * come first; see TOWN_GROUND.
 */
export function townLayout(): readonly Placement[] {
  return town().layout;
}

/**
 * Brinebeard's Grotto's ground, as 16 x 16 tiles: a sea cave at dusk, the
 * same world as the town (its stone, its pier's planks, its sea) underground
 * and at the waterline.
 *
 * Every kind tiles with itself in any arrangement and every variant of a
 * kind with every other: nothing but single grains touches a tile's edge, and
 * each edge is mostly the kind's own base step, so no seam or grid shows.
 * The wall's front face and the planks have patterns that run across tiles;
 * those patterns sit at the same rows on every variant's left and right
 * edges. Floors are kept quieter than anything that stands on them: a few
 * grains, a little wear, and now and then a shell or a pebble.
 *
 * Light from the upper left, as everywhere: a crack's lit side is its right
 * wall, a pebble's highlight its upper left.
 */
import { blit, get, grid, parseSprite, rect, set, type Grid, type Legend } from './grid';
import type { Shade } from './palette';
import { seeded } from './rng';

export const TILE_SIZE = 16;

export const GROTTO_TILE_KINDS = [
  'sand',
  'wet_sand',
  'rock_floor',
  'wall_top',
  'wall_face',
  'shallows',
  'deep_water',
  'planks',
  'door_barred',
  'door_open',
] as const;

export type GrottoTileKind = (typeof GROTTO_TILE_KINDS)[number];

type Rand = () => number;

/** A few grains of one step scattered over the whole tile, edges included. */
function grains(g: Grid, rand: Rand, n: number, on: Shade, to: Shade): void {
  for (let i = 0; i < n; i++) {
    const x = (rand() * TILE_SIZE) | 0;
    const y = (rand() * TILE_SIZE) | 0;
    if (get(g, x, y) === on) set(g, x, y, to);
  }
}

/** Somewhere a stamp of this size sits clear of the tile's edges by `margin`. */
function inside(rand: Rand, w: number, h: number, margin = 1): [number, number] {
  const x = margin + ((rand() * (TILE_SIZE - 2 * margin - w + 1)) | 0);
  const y = margin + ((rand() * (TILE_SIZE - 2 * margin - h + 1)) | 0);
  return [x, y];
}

const STAMP_LEGEND: Legend = {
  a: 'cavesand1',
  b: 'cavesand2',
  c: 'cavesand3',
  d: 'cavesand4',
  p: 'shell1',
  P: 'shell2',
  q: 'shelldark1',
  Q: 'shelldark2',
  s: 'stone1',
  S: 'stone2',
  t: 'stone3',
  u: 'slate3',
  g: 'pine1',
  G: 'pine2',
  H: 'pine3',
  w: 'shoal1',
  W: 'shoal2',
  v: 'shoal3',
  x: 'shade1',
};

const stamp = (rows: readonly string[]): Grid => parseSprite(rows, STAMP_LEGEND);

/** A cockle shell, ribbed, lying on the sand. */
const SHELL = stamp(['.qP.', 'qPqQ', '.QQ.']);
/** Two pebbles, lit from the upper left. */
const PEBBLES = stamp(['.st.....', 'sStt..s.', '.ttt.sSt', '.....tt.']);
/** A strand of weed the tide left. */
const WEED = stamp(['G......', 'GG...G.', '.GHGGH.', '...HH..']);
/** A crab's hole, with the sand it threw out. */
const BURROW = stamp(['.aa..', 'acxxb', '.cxc.', '..c..']);
/** A pool left in a hollow of wet sand. */
const PUDDLE = stamp(['..vvvv..', '.vWWWWv.', 'vWwWWWWv', '.vvvvv..']);
/** A pool in a hollow of the rock floor. */
const ROCK_POOL = stamp(['.tttt..', 'tvvWvt.', 'tvWWWvt', '.tvvvt.', '..ttt..']);
/** A rounded boss of rock on the wall's top. */
const BOSS = parseSprite(['.bb...', 'bbaa..', 'baaaa.', '.aaaac', '..cccc'], {
  a: 'slate2',
  b: 'slate1',
  c: 'shade1',
});

/* ----- Floors ----- */

/*
 * Each floor has more plain wears than wears with something on them, so a
 * shell or a pool turns up now and then rather than on every other tile.
 */
const SAND_WEAR = 20;
function sand(i: number): Grid {
  const rand = seeded(7100 + i);
  const g = grid(TILE_SIZE, TILE_SIZE);
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, 'cavesand2');
  grains(g, rand, 6, 'cavesand2', 'cavesand3');
  grains(g, rand, 3, 'cavesand2', 'cavesand1');
  // A ripple the water left: a lit crest with its shadow below it.
  if (i === 2 || i === 5) {
    const [x, y] = inside(rand, 6, 2, 3);
    rect(g, x, y, 4, 1, 'cavesand1');
    rect(g, x + 2, y + 1, 4, 1, 'cavesand3');
  }
  if (i === 7) blit(g, SHELL, ...inside(rand, 4, 3, 3));
  if (i === 8) blit(g, PEBBLES, ...inside(rand, 8, 4, 2));
  if (i === 9) blit(g, BURROW, ...inside(rand, 5, 4, 3));
  return g;
}

const WET_WEAR = 16;
function wetSand(i: number): Grid {
  const rand = seeded(7200 + i);
  const g = grid(TILE_SIZE, TILE_SIZE);
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, 'cavesand3');
  grains(g, rand, 7, 'cavesand3', 'cavesand4');
  grains(g, rand, 2, 'cavesand3', 'cavesand2');
  // The shine of water still on it.
  const [x, y] = inside(rand, 3, 1, 2);
  rect(g, x, y, 2 + (i % 2), 1, 'shoal3');
  if (i === 5) blit(g, PUDDLE, ...inside(rand, 8, 4, 2));
  if (i === 6) blit(g, WEED, ...inside(rand, 7, 4, 2));
  if (i === 7) blit(g, SHELL, ...inside(rand, 4, 3, 3));
  return g;
}

const ROCK_WEAR = 20;
function rockFloor(i: number): Grid {
  const rand = seeded(7300 + i);
  const g = grid(TILE_SIZE, TILE_SIZE);
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, 'stone2');
  grains(g, rand, 7, 'stone2', 'stone3');
  grains(g, rand, 3, 'stone2', 'stone1');
  // A crack worn into the rock, lit on its right side.
  if (i % 3 !== 0) {
    let [x, y] = inside(rand, 1, 1, 3);
    const len = 3 + ((rand() * 3) | 0);
    for (let s = 0; s < len; s++) {
      set(g, x, y, 'stone3');
      if (get(g, x + 1, y) === 'stone2') set(g, x + 1, y, 'stone1');
      if (rand() < 0.5) x += rand() < 0.5 ? -1 : 1;
      else y += 1;
      x = Math.max(2, Math.min(12, x));
      y = Math.max(2, Math.min(13, y));
    }
  }
  if (i === 7) blit(g, PEBBLES, ...inside(rand, 8, 4, 2));
  if (i === 8) blit(g, ROCK_POOL, ...inside(rand, 7, 5, 2));
  if (i === 9) blit(g, WEED, ...inside(rand, 7, 4, 2));
  return g;
}

/* ----- Water ----- */

const SHALLOWS_WEAR = 4;
function shallows(i: number): Grid {
  const rand = seeded(7400 + i);
  const g = grid(TILE_SIZE, TILE_SIZE);
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, 'shoal2');
  // The sand's ripples under the water.
  for (let k = 0; k < 2; k++) {
    const [x, y] = inside(rand, 6, 1, 1);
    rect(g, x, y, 4 + ((rand() * 3) | 0), 1, 'shoal3');
  }
  // Light on the surface.
  for (let k = 0; k < 2; k++) {
    const [x, y] = inside(rand, 4, 1, 1);
    rect(g, x, y, 2 + ((rand() * 2) | 0), 1, 'shoal1');
  }
  return g;
}

const DEEP_WEAR = 4;
function deepWater(i: number): Grid {
  const rand = seeded(7500 + i);
  const g = grid(TILE_SIZE, TILE_SIZE);
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, 'sea3');
  // A slow swell: dark troughs and the odd lit crest.
  for (let k = 0; k < 2; k++) {
    const [x, y] = inside(rand, 7, 1, 1);
    rect(g, x, y, 5 + ((rand() * 3) | 0), 1, 'navy1');
  }
  const [x, y] = inside(rand, 4, 1, 1);
  rect(g, x, y, 3, 1, 'sea2');
  if (i === 1) set(g, ...inside(rand, 1, 1, 3), 'sea1');
  return g;
}

/* ----- Walls ----- */

const TOP_WEAR = 4;
/**
 * The rock the cave is cut from, seen from above: dark and quiet, broken by a
 * crack and, here and there, a paler rounded boss of rock.
 */
function wallTop(i: number): Grid {
  const rand = seeded(7600 + i);
  const g = grid(TILE_SIZE, TILE_SIZE);
  rect(g, 0, 0, TILE_SIZE, TILE_SIZE, 'slate3');
  grains(g, rand, 6, 'slate3', 'shade1');
  grains(g, rand, 3, 'slate3', 'slate2');
  if (i < 2) blit(g, BOSS, ...inside(rand, 6, 5, 2));
  // A crack, dark, wandering down and across.
  let [x, y] = inside(rand, 1, 1, 3);
  for (let s = 0; s < 4 + (i % 3); s++) {
    if (get(g, x, y) === 'slate3') set(g, x, y, 'shade1');
    if (rand() < 0.5) x += 1;
    else y += 1;
    x = Math.min(13, x);
    y = Math.min(13, y);
  }
  return g;
}

const FACE_WEAR = 4;
/**
 * The rock's front face: a lit lip where the top's edge rounds over, two
 * ledges that wander a pixel up and down (but meet every neighbour at the
 * same rows), upright cracks, the tide's mark with weed and barnacles, and a
 * dark foot that anything standing in front of it reads against.
 */
function wallFace(i: number): Grid {
  const rand = seeded(7700 + i);
  const g = grid(TILE_SIZE, TILE_SIZE);
  rect(g, 0, 0, TILE_SIZE, 2, 'stone1');
  rect(g, 0, 2, TILE_SIZE, 9, 'stone2');
  rect(g, 0, 11, TILE_SIZE, 2, 'slate2');
  rect(g, 0, 13, TILE_SIZE, 1, 'slate3');
  rect(g, 0, 14, TILE_SIZE, 2, 'shade1');
  // The lip rounds over: a few pixels of its second row in shadow.
  for (let k = 0; k < 4; k++) set(g, 1 + ((rand() * 14) | 0), 1, 'stone2');
  // Ledges, each a shadow under the rock above and a lit top on the rock
  // below, bending by a pixel between the tile's edges (level at both).
  const bends = [
    [1, 1],
    [-1, 2],
    [1, 2],
    [-1, 1],
  ] as const;
  for (const [row, turn] of [
    [5, 0],
    [9, 1],
  ] as const) {
    const [amp, waves] = bends[(i + turn) % bends.length]!;
    for (let x = 0; x < TILE_SIZE; x++) {
      const y = row + Math.round(amp * Math.sin((Math.PI * waves * x) / (TILE_SIZE - 1)));
      set(g, x, y, 'stone3');
      if (x > 0 && x < TILE_SIZE - 1 && rand() < 0.4) set(g, x, y + 1, 'stone1');
    }
  }
  // An upright crack in each band, lit on its right.
  for (const [y0, y1] of [
    [2, 4],
    [7, 8],
  ] as const) {
    const x = 2 + ((rand() * 11) | 0);
    for (let y = y0; y <= y1; y++) {
      if (get(g, x, y) === 'stone2') set(g, x, y, 'stone3');
      if (get(g, x + 1, y) === 'stone2') set(g, x + 1, y, 'stone1');
    }
  }
  // Weed hanging over the tide's mark, and barnacles.
  for (let k = 0; k < 3; k++) {
    const x = 1 + ((rand() * 14) | 0);
    const len = 1 + ((rand() * 3) | 0);
    for (let y = 11; y < 11 + len; y++) set(g, x, y, y === 11 ? 'pine2' : 'pine3');
  }
  for (let k = 0; k < 3; k++) {
    const x = 1 + ((rand() * 14) | 0);
    if (get(g, x, 12) === 'slate2') set(g, x, 12, 'stone1');
  }
  return g;
}

/* ----- Planks ----- */

const PLANK_WEAR = 4;
/** Boards across, as on the town's pier: four rows each, the last a dark gap. */
function planks(i: number): Grid {
  const rand = seeded(7800 + i);
  const g = grid(TILE_SIZE, TILE_SIZE);
  for (let b = 0; b < 4; b++) {
    const y = b * 4;
    rect(g, 0, y, TILE_SIZE, 1, 'wood1');
    rect(g, 0, y + 1, TILE_SIZE, 2, 'wood2');
    rect(g, 0, y + 3, TILE_SIZE, 1, 'wood4');
    // Where one board ends and the next begins, with a nail each side.
    const x = 3 + ((rand() * 10) | 0);
    rect(g, x, y, 1, 3, 'wood4');
    set(g, x + 1, y, 'wood1');
    set(g, x - 1, y + 1, 'metal3');
    set(g, x + 2, y + 1, 'metal3');
  }
  grains(g, rand, 10, 'wood2', 'wood3');
  grains(g, rand, 4, 'wood2', 'wood1');
  // A split board with the dark water showing through.
  if (i === 3) {
    const [x] = inside(rand, 4, 1, 3);
    rect(g, x, 9, 4, 1, 'sea3');
    set(g, x, 9, 'wood4');
  }
  return g;
}

/* ----- Doors ----- */

const DOOR_LEGEND: Legend = {
  j: 'wood1',
  W: 'wood2',
  o: 'wood3',
  O: 'wood4',
  M: 'metal1',
  m: 'metal2',
  n: 'metal3',
  x: 'shade1',
  k: 'ink1',
  s: 'stone1',
  S: 'stone2',
  t: 'stone3',
  c: 'cavesand3',
  d: 'cavesand4',
};

/** A timber-framed way through the rock, shut with iron bars and a bar across. */
const DOOR_BARRED = [
  'OjjjjjjjjjjjjjjO',
  'OWWWWWWWWWWWWWWO',
  'jOOOOOOOOOOOOOOW',
  'jWkxMkxxMkxxMkxW',
  'jWkxmnxxmnxxmnkW',
  'jWkxmnxxmnxxmnkW',
  'jWkxmnxxmnxxmnkW',
  'jWnMMMMMMMMMMMnW',
  'jWnnnnnnnnnnnnnW',
  'jWkxmnxxmnxxmnkW',
  'jWkxmnxxmnxxmnkW',
  'jWkxmnxxmnxxmnkW',
  'jWkxmnxxmnxxmnkW',
  'jWkxmnxxmnxxmnkW',
  'jWkxmnkxmnkxmnkW',
  'OOOOOOOOOOOOOOOO',
];

/** The same frame, open: the dark of the next cave, and the floor going on into it. */
const DOOR_OPEN = [
  'OjjjjjjjjjjjjjjO',
  'OWWWWWWWWWWWWWWO',
  'jOOOOOOOOOOOOOOW',
  'jWkkkkkkkkkkkkkW',
  'jWkkkkkkkkkkkkkW',
  'jWkkkkkkkkkkkkkW',
  'jWkkkkkkkkkkkkkW',
  'jWxkkkkkkkkkkkkW',
  'jWxxkkkkkkkkkkxW',
  'jWxxxkkkkkkkkxxW',
  'jWxxxxxxxxxxxxxW',
  'jWddxxxxxxxxxddW',
  'jWcdddddddddddcW',
  'jWccdcddddcdccdW',
  'jWcccccccccccccW',
  'OOOOOOOOOOOOOOOO',
];

const tile = (rows: readonly string[]) => (): Grid => parseSprite(rows, DOOR_LEGEND);

/** Each kind: how many wears it has and how to draw one. */
export const GROTTO_TILES: Readonly<
  Record<GrottoTileKind, { readonly wears: number; readonly draw: (wear: number) => Grid }>
> = {
  sand: { wears: SAND_WEAR, draw: sand },
  wet_sand: { wears: WET_WEAR, draw: wetSand },
  rock_floor: { wears: ROCK_WEAR, draw: rockFloor },
  wall_top: { wears: TOP_WEAR, draw: wallTop },
  wall_face: { wears: FACE_WEAR, draw: wallFace },
  shallows: { wears: SHALLOWS_WEAR, draw: shallows },
  deep_water: { wears: DEEP_WEAR, draw: deepWater },
  planks: { wears: PLANK_WEAR, draw: planks },
  door_barred: { wears: 1, draw: tile(DOOR_BARRED) },
  door_open: { wears: 1, draw: tile(DOOR_OPEN) },
};

/**
 * Which wear a variant number asks for. Mixed first, so variants numbered
 * along a row or down a column (a cell's index, say) do not repeat in a
 * visible stripe; the same number always gives the same wear.
 */
export function wearOf(variant: number, wears: number): number {
  const v = Math.floor(Number.isFinite(variant) ? variant : 0);
  let h = Math.imul(v ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) % wears;
}

export function isGrottoTileKind(kind: string): kind is GrottoTileKind {
  return (GROTTO_TILE_KINDS as readonly string[]).includes(kind);
}

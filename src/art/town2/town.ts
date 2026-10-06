/**
 * The C-scale town laid out: where every piece stands, what ground is where,
 * which tiles can be walked on, and the whole town composed into one picture
 * per time of day. A small harbour town four screens wide and three tall:
 * the forest along the top with the road north running out of it; on the
 * upper street your house with its garden, the oak and a pine grove for
 * woodcutting; the tavern and the smithy facing south across the square, the
 * signpost at the road's mouth; the well, the stall and the notice board on
 * the square; the quay with its cargo, a beach to the west, the pier running
 * out to sea past the rowing boat, the ship at anchor and the rock with its
 * wreck.
 *
 * It mirrors the current town's doors (src/art/town.ts: `townLayout`,
 * `townPicture`, `TOWN_GROUND`) so a scene can switch by lookup. Everything
 * here is data: positions, footprints, walk-up spots and tap boxes are
 * declared, never measured from a picture.
 */
import type { Glow } from '../raster';
import { at, cell, dim, hash, isMat, put, stamp, tgrid, type Picture2, type TGrid } from './cells';
import {
  channel,
  cobbles,
  dirt,
  drainGrate,
  edgeMoss,
  edgeStones,
  flagstones,
  flowerDrift,
  gardenBed,
  grass,
  gutter,
  kerb,
  leafDrift,
  longGrass,
  pebble,
  puddle,
  quayWall,
  roundPaving,
  sand,
  sea,
  settPatch,
  shadowOval,
  stump,
  wheelRuts,
  wornWay,
} from './ground';
import { PIER_DECK } from './harbour';
import {
  PIER_LENGTH,
  forgetTown2Pieces,
  town2Facts,
  town2Piece,
  type Town2Id,
  type Town2Layer,
} from './pieces';
import type { TimeOfDay } from './ramps';
import { m } from './scale';
import { clumps, fbm, noise } from './texture';
import { ashlar } from './walls';

/** The town's size in art pixels: four screens across, a little over three tall. */
export const TOWN2_W = 1440;
export const TOWN2_H = 2136;
/** The side of one walking tile, in art pixels: about a person's stride (a 64-pixel person is 2.7 tiles tall). */
export const TOWN2_TILE = 24;

/** Where the grounds lie, in art pixels. */
export const TOWN2_GROUND = {
  /** The forest along the top: solid, pines standing in it. */
  forest: { y: 0, h: 216 },
  /** The road north: its middle column at the square, its half width, and where it meets the square. */
  road: { x: 696, half: 44, until: 1124 },
  /** The lane from the road to your house. */
  lane: { x0: 740, x1: 1010, y: 666, half: 22 },
  /** The cobbled square, from below the tavern and smithy to the quay. */
  square: { x: 0, y: 1104, w: 1440, h: 320 },
  /** The pavement of flagstones along the tavern's and smithy's fronts. */
  pavement: { y: 1104, h: 40 },
  /** The round paved platform the well stands on. */
  well: { x: 760, y: 1262, r: 92 },
  /** The beach in the west: sand from the square's edge down to the water. */
  beach: { x: 0, w: 372, y: 1372, wall: 30, stairs: { x: 150, w: 72 } },
  /** The quay: its coping's top row, from the beach's end to the east edge, and its rings. */
  quay: { x: 372, y: 1420, rings: [540, 620, 1000, 1200, 1360] },
} as const;

/** The quay's face reaches the water this many pixels below its coping's top. */
const QUAY_FACE = m(0.28) + m(1.15);
/** Where the water starts at column `x`: under the quay, or the beach's curving shore. */
export function shoreAt(x: number): number {
  const q = TOWN2_GROUND.quay;
  if (x >= q.x) return q.y + QUAY_FACE;
  const f = x / q.x;
  return Math.round(1560 - f * (1560 - (q.y + QUAY_FACE) - 18) + Math.sin(x / 37) * 6);
}

/** Whether (x, y) is on the road north or the lane to the house. */
function onRoad(x: number, y: number): boolean {
  const r = TOWN2_GROUND.road;
  if (y > r.until) return false;
  const cx = r.x + Math.round(Math.sin(y / 140) * 14);
  if (Math.abs(x - cx) <= r.half + Math.round(Math.sin(y / 23) * 2)) return true;
  const l = TOWN2_GROUND.lane;
  return x >= l.x0 && x <= l.x1 && Math.abs(y - l.y - Math.sin(x / 50) * 3) <= l.half;
}

/** One piece placed in the town. */
export interface Placement2 {
  /** A name for this placement, unique in the town (the current scene's names where it has them). */
  readonly name: string;
  readonly id: Town2Id;
  /** Its picture's top-left, in art pixels. */
  readonly x: number;
  readonly y: number;
  /** Its base line in the town: `y` plus the piece's base. Standing pieces are drawn in this order. */
  readonly base: number;
  readonly layer: Town2Layer;
  /** The tiles it makes solid, as a box of whole tiles (col, row, cols, rows); none for things afloat or flat. */
  readonly footprint: {
    readonly col: number;
    readonly row: number;
    readonly cols: number;
    readonly rows: number;
  } | null;
  /** Where a person's feet stand to use it, in the town. */
  readonly spots: Readonly<Record<string, { readonly x: number; readonly y: number }>>;
  /** Where a tap picks it, in the town. */
  readonly tap: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
}

/** A placement as written below: the piece's foot at (fx, by), its base line. */
type Spec = readonly [name: string, id: Town2Id, fx: number, by: number];

const T = TOWN2_TILE;

/** The pines of the forest along the top: rows of them, the gap where the road runs out. */
function forest(): Spec[] {
  const out: Spec[] = [];
  const ids: Town2Id[] = ['pine', 'pine_2', 'pine_3'];
  let n = 0;
  for (let row = 0; row < 4; row++) {
    const by = 78 + row * 46;
    for (let x = -30 + (row % 2) * 44; x < TOWN2_W + 60; x += 88) {
      const fx = x + Math.round((fbm(x, row, 30, 2) - 0.5) * 40);
      if (Math.abs(fx - TOWN2_GROUND.road.x) < 96 + row * 4) continue;
      out.push([`pine-forest-${n++}`, ids[(n + row) % 3] as Town2Id, fx, by + ((n * 7) % 13)]);
    }
  }
  return out;
}

const Q = TOWN2_GROUND.quay.y;

const SPECS: readonly Spec[] = [
  ...forest(),
  // The upper street: your house and its garden, the oak, a grove for woodcutting.
  ['house', 'house', 990, 672],
  ['oak', 'oak', 1290, 860],
  ['pine-grove-1', 'pine', 150, 420],
  ['pine-grove-2', 'pine_3', 330, 480],
  ['pine-grove-3', 'pine_2', 520, 430],
  ['pine-grove-4', 'pine', 240, 640],
  ['pine-grove-5', 'pine_2', 470, 660],
  ['pine-east-1', 'pine_3', 1400, 470],
  ['pine-east-2', 'pine', 1412, 1060],
  ['fence-house-1', 'fence', 860, 770],
  ['fence-house-2', 'fence', 944, 770],
  ['fence-house-3', 'fence', 1068, 770],
  ['fence-house-4', 'fence', 1152, 770],
  ['lamp-house', 'lamp', 1012, 776],
  ['bush-house-1', 'bush', 804, 700],
  ['bush-house-2', 'bush', 1180, 700],
  ['bush-road-1', 'bush', 610, 880],
  ['bush-road-2', 'bush', 790, 520],
  ['bush-west', 'bush', 60, 760],
  ['bush-tavern', 'bush', 20, 1080],
  ['bush-smithy', 'bush', 1310, 1084],
  ['boulder-1', 'boulder', 560, 300],
  ['boulder-2', 'boulder', 1160, 380],
  ['boulder-3', 'boulder', 1380, 760],
  // The tavern and the smithy, facing south across the square.
  ['tavern', 'tavern', 330, 1104],
  ['smithy', 'smithy', 1040, 1104],
  ['crate-yours', 'crate', 452, 1150],
  ['planter-tavern', 'planter', 212, 1146],
  ['lamp-tavern', 'lamp', 110, 1152],
  ['signpost', 'signpost', 618, 1150],
  ['anvil', 'anvil', 912, 1172],
  // The square: the well on its round paving, benches, the stall, the notice board.
  ['well', 'well', 760, 1268],
  ['bench-well-1', 'bench', 636, 1300],
  ['bench-well-2', 'bench', 886, 1300],
  ['planter-well', 'planter', 760, 1366],
  ['stall', 'stall', 250, 1296],
  ['barrel-stall', 'barrel', 104, 1290],
  ['board', 'notice_board', 1180, 1214],
  ['lamp-west', 'lamp', 470, 1352],
  ['lamp-east', 'lamp', 1050, 1352],
  ['lamp-corner', 'lamp', 1340, 1250],
  ['planter-east', 'planter', 1300, 1160],
  ['crate-cargo-1', 'crate', 560, Q - 12],
  ['crate-cargo-2', 'crate', 590, Q + 2],
  ['crate-cargo-3', 'crate', 532, Q + 6],
  ['crate-cargo-4', 'crate', 860, Q - 6],
  ['crate-cargo-5', 'crate', 890, Q + 6],
  ['crate-cargo-6', 'crate', 872, Q - 30],
  ['barrel-quay-1', 'barrel', 822, Q + 6],
  ['barrel-quay-2', 'barrel', 1150, Q - 6],
  ['barrel-quay-3', 'barrel', 1176, Q + 6],
  ['barrel-quay-4', 'barrel', 470, Q + 2],
  ['net', 'net', 1010, Q - 40],
  ['bucket', 'bucket', 650, Q + 10],
  ['crab', 'crab', 1290, Q + 10],
  // The harbour.
  ['pier', 'pier', 696, Q - 4 + PIER_LENGTH],
  ['lamp-pier', 'lamp', 660, Q - 10 + PIER_LENGTH],
  ['rowboat', 'rowboat', 520, Q + 102],
  ['ship', 'ship', 1080, 2040],
  ['wreck', 'wreck_rock', 110, 1800],
  ['buoy', 'buoy', 560, 1740],
  // Far out past the pier's end, but where its end's view still reaches (lane C's need, B9).
  ['buoy-far', 'buoy', 840, 2084],
  ['gull-1', 'gull', 900, 1620],
  ['gull-2', 'gull', 330, 1680],
  ['gull-3', 'gull', 1200, 1880],
];

/** Tap boxes for the buildings: their doors and fronts, from the drawing's facts. */
function tapFor(id: Town2Id, x: number, y: number, w: number, h: number, base: number) {
  if (id === 'tavern' || id === 'smithy' || id === 'house') {
    // The ground floor's front: a person taps the building, not its roof.
    return { x: x + 8, y: y + base - m(3.2), w: w - 16, h: m(3.2) };
  }
  return { x, y, w, h };
}

function place([name, id, fx, by0]: Spec): Placement2 {
  const p = town2Facts(id);
  // Anything with a walk-up spot stands on a tile edge, so its spot is on the tile in front of its footprint.
  const by = Object.keys(p.spots).length ? Math.round(by0 / T) * T : by0;
  const x = fx - p.foot;
  const y = by - p.base;
  const flat = p.layer === 'ground' || p.layer === 'above' || p.shadow?.kind === 'water';
  let footprint: Placement2['footprint'] = null;
  if (!flat && p.ground.w > 0) {
    const col = Math.floor((fx - p.ground.w / 2) / T);
    const col1 = Math.max(col, Math.ceil((fx + p.ground.w / 2) / T) - 1);
    const rows = Math.max(1, Math.round(p.ground.d / T));
    const row1 = Math.floor((by - 1) / T);
    // Clipped to the town: a tree at the edge stands half outside it.
    const c0 = Math.max(0, col);
    const c1 = Math.min(TOWN2_W / T - 1, col1);
    const r0 = Math.max(0, row1 - rows + 1);
    footprint = c1 >= c0 ? { col: c0, row: r0, cols: c1 - c0 + 1, rows: row1 - r0 + 1 } : null;
  }
  const spots = Object.fromEntries(
    Object.entries(p.spots).map(([k, s]) => [k, { x: x + s.x, y: y + s.y }]),
  );
  return {
    name,
    id,
    x,
    y,
    base: by,
    layer: p.layer,
    footprint,
    spots,
    tap: tapFor(id, x, y, p.w, p.h, p.base),
  };
}

let layout: readonly Placement2[] | null = null;

/**
 * Every piece placed in the town, in drawing order: flat things first, then
 * everything standing by its base line, then what is above (smoke, gulls).
 * Smoke attached to chimneys is listed too, after its building's placement
 * in the order.
 */
export function town2Layout(): readonly Placement2[] {
  if (layout) return layout;
  const placed = SPECS.map(place);
  const smoke = placed.flatMap((p) =>
    town2Facts(p.id).attached.map((a) => {
      const s = town2Facts(a.id);
      return {
        name: `${p.name}-smoke`,
        id: a.id,
        x: p.x + a.x,
        y: p.y + a.y,
        base: p.y + a.y + s.base,
        layer: s.layer,
        footprint: null,
        spots: {},
        tap: { x: p.x + a.x, y: p.y + a.y, w: s.w, h: s.h },
      } satisfies Placement2;
    }),
  );
  const order: Record<Town2Layer, number> = { ground: 0, stand: 1, above: 2 };
  layout = [...placed, ...smoke].sort(
    (a, b) => order[a.layer] - order[b.layer] || (a.layer === 'stand' ? a.base - b.base : 0),
  );
  return layout;
}

/** What a tile is, for walking. */
export type Town2Tile = 'forest' | 'grass' | 'road' | 'cobble' | 'sand' | 'quay' | 'sea' | 'pier';

/** Which ground kinds can be walked on. */
export const TOWN2_SOLID: Readonly<Record<Town2Tile, boolean>> = {
  forest: true,
  grass: false,
  road: false,
  cobble: false,
  sand: false,
  quay: true,
  sea: true,
  pier: false,
};

/** The ground kind under a point. */
export function groundAt(x: number, y: number): Town2Tile {
  const G = TOWN2_GROUND;
  const pierX = 696 - PIER_DECK / 2;
  if (x >= pierX && x < pierX + PIER_DECK && y >= G.quay.y - 4 && y < G.quay.y + PIER_LENGTH)
    return 'pier';
  if (y >= shoreAt(x)) return 'sea';
  // The coping is walked on; the face below it is not.
  if (x >= G.quay.x && y >= G.quay.y + 12) return 'quay';
  if (y < G.forest.h) return 'forest';
  if (x < G.beach.w && y >= G.beach.y) {
    const st = G.beach.stairs;
    const onStairs = x >= st.x && x < st.x + st.w;
    return y < G.beach.y + G.beach.wall && !onStairs ? 'quay' : 'sand';
  }
  if (y >= G.square.y) return 'cobble';
  if (onRoad(x, y)) return 'road';
  return 'grass';
}

/**
 * The walking map: one entry per tile, row by row, true where it is solid
 * (its ground, or a footprint on it). A tile's ground is what is under its
 * middle.
 */
export function town2Walk(): { cols: number; rows: number; solid: Uint8Array; kinds: Town2Tile[] } {
  const cols = TOWN2_W / T;
  const rows = TOWN2_H / T;
  const solid = new Uint8Array(cols * rows);
  const kinds: Town2Tile[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = groundAt(c * T + T / 2, r * T + T / 2);
      kinds.push(k);
      solid[r * cols + c] = TOWN2_SOLID[k] ? 1 : 0;
    }
  for (const p of town2Layout()) {
    const f = p.footprint;
    if (!f) continue;
    for (let r = f.row; r < f.row + f.rows; r++)
      for (let c = f.col; c < f.col + f.cols; c++)
        if (c >= 0 && r >= 0 && c < cols && r < rows) solid[r * cols + c] = 1;
  }
  return { cols, rows, solid, kinds };
}

/** Where the hero first stands: on the square, left of the well. */
export const TOWN2_START = { x: 640, y: 1360 };

// ------------------------------------------------------------------ composing

/** The ground alone (grass, roads, cobbles, sand, quay, sea), before anything stands on it. */
function paintGround(): TGrid {
  const G = TOWN2_GROUND;
  const g = tgrid(TOWN2_W, TOWN2_H);
  const whole = { x: 0, y: 0, w: TOWN2_W, h: TOWN2_H };
  grass(g, { x: 0, y: 0, w: TOWN2_W, h: G.square.y + 20 }, 5, (x, y) => !onRoad(x, y));
  // The forest floor: the grass darker and needle-strewn under the trees.
  for (let y = 0; y < G.forest.h + 40; y++)
    for (let x = 0; x < TOWN2_W; x++) {
      const f = (G.forest.h + 40 - y) / 60;
      if (clumps(x, y, 2) < f && isMat(at(g, x, y), 'grass'))
        dim(g, x, y, 1 + (clumps(x, y, 3) < f - 1 ? 1 : 0));
    }
  dirt(g, { x: 560, y: 0, w: 480, h: G.road.until + 4 }, 7, onRoad, (y) => {
    const cx = G.road.x + Math.round(Math.sin(y / 140) * 14);
    return y < G.lane.y + G.lane.half && y > G.lane.y - G.lane.half ? [] : [cx - 16, cx + 14];
  });
  streetDressing(g);
  const kx0 = G.road.x - G.road.half - 6;
  const kx1 = G.road.x + G.road.half + 6;
  const sq = G.square;
  cobbles(g, sq, 9, (x, y) => y < G.quay.y + 4 && !(x < G.beach.w && y >= G.beach.y));
  squareDressing(g);
  // Flagstones along the buildings' fronts, a gutter from the road's mouth to the quay, the well's round paving.
  flagstones(
    g,
    { x: 0, y: G.pavement.y, w: TOWN2_W, h: G.pavement.h },
    13,
    (x) => x < kx0 - 2 || x > kx1 + 2,
  );
  for (let x = 0; x < TOWN2_W; x++)
    if (!(x >= kx0 - 2 && x <= kx1 + 2)) dim(g, x, G.pavement.y + G.pavement.h, 2);
  gutter(g, (y) => G.road.x + Math.round(Math.sin(y / 60) * 3), sq.y + 2, G.quay.y);
  roundPaving(g, G.well.x, G.well.y, G.well.r, 14);
  // The kerb where the square meets the grass and the road, broken by the road's mouth.
  kerb(g, 0, sq.y - 4, kx0, 3);
  kerb(g, kx1, sq.y - 4, TOWN2_W - kx1, 4);
  // The beach, and a kerb along its top.
  sand(
    g,
    { x: 0, y: G.beach.y, w: G.beach.w, h: 260 },
    11,
    (x, y) => x < G.beach.w && y >= G.beach.y && y < shoreAt(x) + 2,
    shoreAt,
  );
  beachWall(g);
  quayWall(g, G.quay.x, G.quay.y, TOWN2_W - G.quay.x, 8, G.quay.rings);
  // The quay's end where it meets the beach: a column of big stones.
  for (let y = G.beach.y - 4; y < shoreAt(G.quay.x) + 4; y++)
    for (let i = 0; i < 10; i++) {
      const t = i === 0 ? 1 : i === 9 ? 5 : (y - G.quay.y) % 14 === 13 ? 5 : 3;
      put(g, G.quay.x - 6 + i, y, cell('stone', t));
    }
  squareFinish(g);
  sea(g, whole, 12, shoreAt);
  return g;
}

/** The middle column of the road north at row `y`. */
const roadX = (y: number) => TOWN2_GROUND.road.x + Math.round(Math.sin(y / 140) * 14);

/**
 * The upper street's dressing (B9): stones along the road's and the lane's
 * edges, a trodden path to the woodcutting grove, stumps there, drifts of
 * wild flowers, long grass against the fence and the rocks, stones lying in
 * the turf, and a garden bed beside your door.
 */
function streetDressing(g: TGrid): void {
  const G = TOWN2_GROUND;
  const R = G.road;
  const L = G.lane;
  // The path to the grove, trodden through the grass from the road's west edge.
  const pathY = (x: number) => 556 + Math.sin(x / 45) * 6 + (650 - x) * 0.05;
  dirt(
    g,
    { x: 300, y: 500, w: 360, h: 120 },
    17,
    (x, y) =>
      x > 330 + Math.sin(y) * 2 &&
      x < roadX(y) - R.half + 2 &&
      Math.abs(y - pathY(x)) < 5 + noise(x, y, 9, 4) * 4,
  );
  for (const side of [-1, 1])
    edgeStones(
      g,
      (t) => {
        const y = 236 + t * (R.until - 260);
        return [roadX(y) + side * (R.half + 3), y];
      },
      34,
      40 + side,
    );
  for (const side of [-1, 1])
    edgeStones(
      g,
      (t) => {
        const x = L.x0 + 40 + t * (L.x1 - L.x0 - 60);
        return [x, L.y + side * (L.half + 3) + Math.sin(x / 50) * 3];
      },
      9,
      50 + side,
    );
  // Stumps in the grove, where trees have come down for the fire.
  for (const [x, y, w, k] of [
    [262, 532, 22, 1],
    [384, 604, 24, 2],
    [96, 478, 18, 3],
    [566, 536, 20, 4],
    [180, 700, 19, 5],
  ] as const)
    stump(g, x, y, w, k);
  // Drifts of wild flowers: white and buttercup yellow, pink, cornflower.
  for (const [x, y, rx, ry, n, cols, k] of [
    [900, 796, 26, 6, 30, [0, 1], 1],
    [1112, 796, 24, 6, 26, [3, 2, 0], 2],
    [632, 410, 16, 8, 22, [1], 3],
    [770, 960, 20, 8, 26, [0, 4], 4],
    [1236, 902, 24, 7, 28, [1, 0], 5],
    [1100, 470, 28, 12, 40, [3, 4, 0], 6],
    [300, 880, 30, 10, 38, [1, 0], 7],
    [480, 300, 20, 9, 26, [4, 2], 8],
    [96, 590, 18, 7, 20, [0], 9],
    [1330, 620, 22, 9, 26, [2, 1], 10],
    [560, 1000, 18, 6, 20, [3, 0], 11],
  ] as const)
    flowerDrift(g, x, y, rx * 1.2, ry * 1.2, Math.round(n * 1.6), cols, k);
  // Long grass against the fence's foot and round the rocks.
  longGrass(g, 836, 774, 120, 1);
  longGrass(g, 1040, 774, 136, 2);
  for (const [x, y, w, k] of [
    [536, 306, 12, 3],
    [580, 304, 10, 4],
    [1136, 386, 12, 5],
    [1180, 384, 10, 6],
    [1356, 766, 10, 7],
    [1396, 764, 12, 8],
    [130, 424, 10, 9],
    [452, 664, 12, 10],
  ] as const)
    longGrass(g, x, y, w, k);
  // Stones lying in the turf, in twos and threes.
  for (const [x, y, k] of [
    [880, 560, 1],
    [1222, 604, 2],
    [420, 842, 3],
    [206, 982, 4],
    [1004, 1004, 5],
    [622, 706, 6],
    [1300, 1000, 7],
    [60, 860, 8],
  ] as const) {
    pebble(g, x, y, 7, 5, k);
    pebble(g, x + 8, y + 3, 5, 4, k + 20);
    if (k % 2) pebble(g, x - 6, y + 4, 4, 3, k + 40);
  }
  gardenBed(g, { x: 1040, y: 694, w: 112, h: 48 }, 3);
}

/**
 * The square's dressing (B9), before its pavement, gutter and well paving
 * are laid over it: the ruts carts have worn from the road's mouth down to
 * the cargo on the quay, and patches mended in granite setts.
 */
function squareDressing(g: TGrid): void {
  const W = TOWN2_GROUND.well;
  // Ways worn by feet: each door to the well, and the well down to the pier.
  wornWay(
    g,
    [
      [330, 1150],
      [520, 1230],
      [W.x - 60, W.y],
    ],
    m(0.7),
  );
  wornWay(
    g,
    [
      [1140, 1150],
      [980, 1220],
      [W.x + 60, W.y],
    ],
    m(0.7),
  );
  wornWay(
    g,
    [
      [W.x - 20, W.y + 40],
      [700, 1380],
      [696, 1416],
    ],
    m(0.8),
  );
  wheelRuts(g, [696, 1108, 612, 1250, 560, 1404]);
  for (const [x, y, w, h, k] of [
    [52, 1176, 60, 36, 1],
    [1012, 1366, 70, 34, 2],
    [1236, 1164, 50, 30, 3],
  ] as const)
    settPatch(g, { x, y, w, h }, k);
  // A drain across the square, below the well, into the gutter.
  channel(g, 1328, 0, TOWN2_W, 3);
}

/** What lies on the square once it is laid: moss at its edges, puddles, leaves, the drain. */
function squareFinish(g: TGrid): void {
  const G = TOWN2_GROUND;
  edgeMoss(
    g,
    { x: 0, y: G.square.y - 4, w: TOWN2_W, h: G.quay.y - G.square.y + 8 },
    (x, y) =>
      Math.min(
        Math.abs(y - (G.pavement.y + G.pavement.h)),
        Math.abs(G.quay.y - y),
        Math.abs(Math.hypot((x - G.well.x) / 1, (y - G.well.y) / 0.55) - G.well.r - 4),
      ),
    12,
  );
  for (const [x, y, rx, ry, k] of [
    [722, 1392, 15, 5, 1],
    [594, 1190, 12, 4, 2],
    [1110, 1262, 16, 5, 3],
    [404, 1300, 12, 4, 4],
    [950, 1394, 11, 4, 5],
  ] as const)
    puddle(g, x, y, rx, ry, k);
  drainGrate(g, roadX(G.quay.y), G.quay.y - 12);
  leafDrift(g, 1110, 1150, 180, 14, 1);
  leafDrift(g, 900, 1412, 160, 10, 2);
  leafDrift(g, 742, 1106, 60, 6, 3);
  leafDrift(g, 690, 1340, 14, 4, 4);
}

/**
 * The low wall between the square and the beach, with steps down: a coping,
 * a face of dressed stone, the sand's shadow at its foot.
 */
function beachWall(g: TGrid): void {
  const B = TOWN2_GROUND.beach;
  const st = B.stairs;
  kerb(g, 0, B.y - 4, st.x, 6);
  kerb(g, st.x + st.w, B.y - 4, B.w - st.x - st.w - 4, 7);
  for (const [x0, x1] of [
    [0, st.x],
    [st.x + st.w, B.w - 4],
  ] as const) {
    ashlar(g, { x: x0, y: B.y + 6, w: x1 - x0, h: B.wall - 6 }, 15, m(0.3));
    for (let x = x0; x < x1; x++) {
      dim(g, x, B.y + B.wall, 2);
      dim(g, x + 2, B.y + B.wall + 1, 1);
      dim(g, x + 3, B.y + B.wall + 2, 1);
    }
  }
  // The steps: treads lit on their nose, risers in shadow.
  const treads = 4;
  const th = Math.round((B.wall + 4) / treads);
  for (let n = 0; n < treads; n++)
    for (let j = 0; j < th; j++)
      for (let x = st.x; x < st.x + st.w; x++) {
        const y = B.y - 4 + n * th + j;
        const t = j === 0 ? 1 : j < th / 2 ? 2 : j === th - 1 ? 5 : 4;
        put(g, x, y, cell('stone', x === st.x || x === st.x + st.w - 1 ? Math.min(5, t + 1) : t));
      }
}

/** Darkens the ground along a building's foot and throws a wedge to its right; longer at dusk. */
function wallShadow(
  g: TGrid,
  x0: number,
  x1: number,
  base: number,
  height: number,
  time: TimeOfDay,
): void {
  const band = time === 'dusk' ? m(1.0) : m(0.35);
  const reach = time === 'dusk' ? m(3.2) : m(1.1);
  for (let j = 0; j < band; j++)
    for (let x = x0 - 2; x < x1 + Math.round((j / band) * reach * 0.5); x++) {
      const n = j < 3 ? 2 : clumps(x, base + j, 4) < 1 - j / band ? 1 : 0;
      if (n) dim(g, x, base + j, n);
    }
  // The wedge thrown to the right: from the wall's right edge, as tall as the wall's shadow reaches.
  const h = Math.min(height, Math.round(reach * 1.6));
  for (let yy = base - h; yy < base + band; yy++) {
    const e = Math.round(((yy - (base - h)) / (h + band)) * reach);
    for (let x = x1; x < x1 + e; x++)
      dim(g, x, yy, x - x1 > e - 3 && clumps(x, yy, 6) > 0.5 ? 0 : 1);
  }
}

/** The shadow on the water under something afloat: a dark band below its waterline. */
function waterShadow(g: TGrid, x0: number, x1: number, base: number, time: TimeOfDay): void {
  const d = time === 'dusk' ? m(0.8) : m(0.4);
  const lean = time === 'dusk' ? 1.6 : 0.8;
  for (let j = 1; j < d; j++) {
    const f = j / d;
    for (let x = x0 + Math.round(j * 0.8); x < x1 + Math.round(j * lean); x++) {
      if (!isMat(at(g, x, base + j), 'sea')) continue;
      // Soft at its ends and its far edge.
      const end = Math.min(x - x0, x1 + j * lean - x) / 12;
      const n =
        f < 0.35 && end > 1 ? 2 : clumps(x / 3, base + j, 8) < (1 - f) * Math.min(1, end) ? 1 : 0;
      dim(g, x, base + j, n);
    }
  }
}

/**
 * The pier's shadow on the water down its right side. The water moves it:
 * its edge swells out and in with the waves, breaks into clumps where it
 * thins, and goes darkest under each pair of piles, where the deck is
 * thickest; a lit wavelet now and then runs across it. (B7's was an even
 * strip with a straight edge, which read as paint on the water.)
 */
function pierShadow(g: TGrid, x1: number, y0: number, y1: number, time: TimeOfDay): void {
  const w = time === 'dusk' ? m(0.55) : m(0.3);
  for (let y = y0; y < y1; y++) {
    const reach = w + Math.sin(y / 7) * 2 + Math.sin(y / 19 + 1.3) * 3;
    const pile = (y - y0 - m(0.6) + 400) % m(2.0) < 10;
    const crest = hash(Math.floor(y / 3), 5, 77) < 0.08;
    for (let i = 0; i < reach + 5; i++) {
      const x = x1 + i;
      if (!isMat(at(g, x, y), 'sea')) continue;
      const f = i / reach;
      let n = f < 0.4 ? 2 : f < 1.15 && clumps(x / 2, y, 9) < 1.2 - f ? 1 : 0;
      if (pile && f < 0.8) n += 1;
      if (crest && f > 0.3 && i % 4 !== 3) n = Math.max(0, n - 1);
      dim(g, x, y, n);
    }
  }
}

/** The ground with every shadow and every flat thing on it, for one time of day. */
function groundFor(time: TimeOfDay): TGrid {
  const g = paintGround();
  for (const p of town2Layout()) {
    const piece = town2Piece(p.id);
    const s = piece.shadow;
    if (!s) continue;
    if (p.id === 'pier') pierShadow(g, p.x + piece.w - 4, p.y, p.base, time);
    if (s.kind === 'wall') wallShadow(g, p.x + s.x0, p.x + s.x1, p.base, s.height, time);
    else if (s.kind === 'water') waterShadow(g, p.x + s.x0, p.x + s.x1, p.base, time);
    else {
      const stretch = time === 'dusk' ? 2.2 : 1;
      shadowOval(g, p.x + s.cx + (s.rx * (stretch - 1)) / 2 + 2, p.base, s.rx * stretch, s.ry);
      // The contact shadow right under its foot.
      const half = Math.max(2, Math.round(piece.ground.w * 0.45));
      for (let x = p.x + s.cx - half; x <= p.x + s.cx + half; x++) {
        dim(g, x, p.base, 1);
        dim(g, x, p.base + 1, 1);
      }
    }
  }
  for (const p of town2Layout())
    if (p.layer === 'ground') stamp(g, town2Piece(p.id).picture.grid, p.x, p.y);
  return g;
}

function glowsOf(only?: (p: Placement2) => boolean): Glow[] {
  return town2Layout()
    .filter((p) => !only || only(p))
    .flatMap((p) =>
      town2Piece(p.id).picture.glows.map((gl) => ({ ...gl, x: gl.x + p.x, y: gl.y + p.y })),
    );
}

const grounds = new Map<TimeOfDay, Picture2>();
const towns = new Map<TimeOfDay, Picture2>();

/**
 * The ground for a scene to lay under its sprites: grass, roads, cobbles,
 * quay and sea, every shadow for the time of day, and the flat pieces (the
 * pier, the net), with every light in town so lamps light the cobbles at dusk.
 */
export function town2Ground(time: TimeOfDay): Picture2 {
  let pic = grounds.get(time);
  if (!pic) {
    pic = { grid: groundFor(time), glows: glowsOf() };
    grounds.set(time, pic);
  }
  return pic;
}

/** The whole town composed: ground, shadows and every piece in drawing order, with every glow. */
export function town2Picture(time: TimeOfDay): Picture2 {
  let pic = towns.get(time);
  if (!pic) {
    const g = tgrid(TOWN2_W, TOWN2_H);
    g.d.set(town2Ground(time).grid.d);
    for (const p of town2Layout())
      if (p.layer !== 'ground') stamp(g, town2Piece(p.id).picture.grid, p.x, p.y);
    pic = { grid: g, glows: glowsOf() };
    towns.set(time, pic);
  }
  return pic;
}

/**
 * Lets go of the composed grounds and towns kept by `town2Ground` and
 * `town2Picture` (a 1440 x 2136 cell grid each, 6.2 MB a time of day): a
 * scene that has rasterized the ground onto its own canvas no longer needs
 * them (lane C's need, B9). Asked for again, they are composed again. Pass
 * `pieces: true` to let the drawn pieces go as well (`forgetTown2Pieces`).
 */
export function forgetTown2Grids(o: { pieces?: boolean } = {}): void {
  grounds.clear();
  towns.clear();
  if (o.pieces) forgetTown2Pieces();
}

export type { Town2Id } from './pieces';

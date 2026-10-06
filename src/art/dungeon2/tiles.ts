/**
 * Brinebeard's Grotto's ground at the C scale: 24 x 24 tiles in the C-scale
 * town's cells (material and step), so a contact shadow is the ground's own
 * steps darkened, as in town.
 *
 * Every texture is worked out from the pixel's place in the room, not in the
 * tile, as the town's grounds are: a tile asked for at its cell (`at`) joins
 * its neighbours with no seam, rock splits in lumps that run on across tile
 * edges, sand ripples and swell carry through, and no two tiles are alike,
 * so a room never shows its grid.
 *
 * A tile may also be told its neighbours (`Around`), and then joins them: a
 * higher ground spills over a lower one's edge in a curve (sand over wet
 * sand, any land over water with a broken line of foam where it meets it,
 * shallows over the deep), floors darken under the walls and decks that
 * rise beside them, and the rock's top catches a lip where it falls away.
 * The spill is drawn inside the lower tile only, in the higher kind's own
 * texture at the same place, and its depth is worked out from where the
 * edge lies, so two tiles along one shore agree where they meet.
 */
import { cell, darker, hash, isMat, tgrid, type Cell, type TGrid } from '../town2/cells';
import { noise } from '../town2/texture';

/** A tile's size in art pixels. */
export const TILE2 = 24;

export const TILE2_KINDS = [
  'sand',
  'wet_sand',
  'rock_floor',
  'wall_top',
  'wall_face',
  'wall_face_high',
  'shallows',
  'deep_water',
  'planks',
  'door_barred',
  'door_open',
] as const;
export type Tile2Kind = (typeof TILE2_KINDS)[number];

/**
 * How many wears each kind has: which of its occasional details (a shell, a
 * pool, a split board) a tile carries. The texture itself comes from the
 * tile's place.
 */
export const TILE2_WEARS: Readonly<Record<Tile2Kind, number>> = {
  sand: 20,
  wet_sand: 16,
  rock_floor: 20,
  wall_top: 4,
  wall_face: 4,
  wall_face_high: 4,
  shallows: 4,
  deep_water: 4,
  planks: 4,
  door_barred: 1,
  door_open: 1,
};

export const isTile2Kind = (kind: string): kind is Tile2Kind =>
  (TILE2_KINDS as readonly string[]).includes(kind);

/**
 * What is next to a tile, by compass point: a tile kind, or null (or left
 * out) for rock or the edge of the map.
 */
export type Around = Partial<
  Record<'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw', string | null>
>;

/** A tile's cell in its room: column and row. */
export interface TileAt {
  readonly col: number;
  readonly row: number;
}

const P = TILE2;
const TAU = Math.PI * 2;
const lim = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
const frac = (v: number) => v - Math.floor(v);

/** A threshold in clumps a few pixels across. */
const clumpsAt = (x: number, y: number, k: number) =>
  noise(x, y, 3, k + 101) * 0.6 + noise(x, y, 7, k + 103) * 0.4;

/** Rounds, breaking the halfway line into clumps rather than a checker (texture.ts's `clumpRound`). */
function cround(t: number, x: number, y: number, k: number, spread = 0.7): number {
  const f = t - Math.floor(t);
  return f > 0.5 + (clumpsAt(x, y, k) - 0.5) * spread ? Math.ceil(t) : Math.floor(t);
}

/* ------------------------------------------------------------------- lumps */

interface Lump {
  /** Which lump: the same number for every pixel in it. */
  readonly id: number;
  /** -1, 0 or 1: how it is tilted, a step lighter or darker than its neighbours. */
  readonly tilt: number;
  /** How lit its dome is at this pixel, -1 (lower right) to 1 (upper left). */
  readonly lit: number;
}

/**
 * Rock splits in lumps: the nearest of points jittered on a grid `size`
 * apart, wider than tall as rock splits along its beds, each domed and lit
 * from the upper left and tilted its own way.
 */
function lumpAt(x: number, y: number, size: number, k: number, tall = false): Lump {
  const gx = Math.floor(x / size);
  const gy = Math.floor(y / size);
  let bd = Infinity;
  let id = 0;
  let ox = 0;
  let oy = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = gx + i;
      const cy = gy + j;
      const px = (cx + 0.15 + 0.7 * hash(cx, cy, k)) * size;
      const py = (cy + 0.15 + 0.7 * hash(cx, cy, k + 1)) * size;
      const dx = x + 0.5 - px;
      const dy = y + 0.5 - py;
      const d = tall ? dx * dx * 1.5 + dy * dy * 0.55 : dx * dx * 0.7 + dy * dy * 1.3;
      if (d < bd) {
        bd = d;
        id = cx * 7919 + cy * 104729;
        ox = dx;
        oy = dy;
      }
    }
  const r = hash(id, 3, k);
  const tilt = r < 0.3 ? -1 : r < 0.75 ? 0 : 1;
  return { id, tilt, lit: Math.max(-1, Math.min(1, -(ox * 0.6 + oy * 0.8) / (size * 0.5))) };
}

/** Whether a pixel is in a crack: its lump meets another below or to the right (only at a step, if `steps`). */
function cracked(
  x: number,
  y: number,
  size: number,
  k: number,
  steps: boolean,
  tall = false,
): boolean {
  const here = lumpAt(x, y, size, k, tall);
  for (const [dx, dy] of [
    [1, 0],
    [0, 1],
  ] as const) {
    const there = lumpAt(x + dx, y + dy, size, k, tall);
    if (there.id !== here.id && (!steps || there.tilt !== here.tilt)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ floors */

/** Sand ripples: a wavy line every seven rows, wandering. */
const ripple = (x: number, y: number) =>
  frac((y + 2.2 * Math.sin(x / 9) + 5 * noise(x, y, 14, 4)) / 7);

/** Dry cave sand: soft patches, ripples here and there lit on their crests, a few grains. */
function sandAt(x: number, y: number): Cell {
  const v = noise(x, y, 16, 1) * 0.6 + noise(x, y, 7, 2) * 0.4;
  let t = cround(2.1 + (v - 0.5) * 1.5, x, y, 3, 0.6);
  const f = ripple(x, y);
  const show = noise(x, y, 20, 5);
  if (show > 0.55 && f > 0.86) t -= 1;
  else if (show > 0.68 && f < 0.1) t += 1;
  const gr = hash(x, y, 6);
  if (gr < 0.02) t += 1;
  else if (gr > 0.98) t -= 1;
  return cell('cavesand', lim(t, 1, 4));
}

/** Wet sand: the same sand darker, water lying in its ripples, a shine along it. */
function wetAt(x: number, y: number): Cell {
  const v = noise(x, y, 16, 7) * 0.6 + noise(x, y, 7, 8) * 0.4;
  let t = cround(3.2 + (v - 0.5) * 1.4, x, y, 9, 0.6);
  const f = ripple(x, y);
  if (f < 0.18 && noise(x, y, 9, 10) > 0.5)
    return cell('shoal', f < 0.07 && hash(x, y, 11) < 0.3 ? 1 : 3);
  if (noise(x, y * 2.5, 8, 12) > 0.72) t -= 1;
  if (hash(x, y, 13) < 0.02) t += 1;
  return cell('cavesand', lim(t, 2, 5));
}

/** Wet rock floor: broad worn planes, a crack where two meet at a step, lit on its lower lip, a damp shine. */
function rockAt(x: number, y: number): Cell {
  const S = 15;
  if (cracked(x, y, S, 14, true)) return cell('caverock', 5);
  const l = lumpAt(x, y, S, 14);
  let t = cround(
    3.1 + l.tilt * 0.45 - l.lit * 0.35 + (noise(x, y, 6, 15) - 0.5) * 0.8,
    x,
    y,
    16,
    0.5,
  );
  if (cracked(x, y - 1, S, 14, true) || cracked(x - 1, y, S, 14, true)) t = Math.min(t, 2);
  if (hash(x, y, 17) < 0.02) t -= 1;
  if (hash(x, y, 18) > 0.985) t += 1;
  return cell('caverock', lim(t, 2, 4));
}

/** Shallow water over sand: green-teal, the sand's ripples showing through, glints lying along it. */
function shallowsAt(x: number, y: number): Cell {
  const v = noise(x, y, 16, 19) * 0.6 + noise(x, y * 2, 8, 20) * 0.4;
  let t = cround(2.3 + (v - 0.5) * 1.3, x, y, 21, 0.7);
  if (ripple(x + 3, y + 2) < 0.13) t += 1;
  if (noise(x, y * 3, 6, 22) > 0.84 && hash(x, y, 23) < 0.6)
    return cell('shoal', hash(x, y, 29) < 0.3 ? 0 : 1);
  return cell('shoal', lim(t, 1, 4));
}

/** Deep water: dark blue in a slow swell, a rare glint. */
function deepAt(x: number, y: number): Cell {
  const s = Math.sin(TAU * (y / 9 + 0.6 * noise(x, y, 18, 24))) * 0.5;
  const v = noise(x, y * 2, 8, 25) - 0.5;
  const t = cround(3.4 + s * 0.9 + v * 1.1, x, y, 26, 0.8);
  if (noise(x, y * 4, 5, 27) > 0.82 && hash(x, y, 28) < 0.5) return cell('deep', 1);
  return cell('deep', lim(t, 2, 5));
}

/** Planks across: boards six rows deep, a lit top edge, grain, a dark seam, butt joints and nails. */
function planksAt(x: number, y: number): Cell {
  const row = ((y % 6) + 6) % 6;
  const board = Math.floor(y / 6);
  if (row === 5) return cell('wood', 5);
  // Boards of their own lengths, their joints staggered.
  const len = 34 + Math.floor(hash(board, 0, 30) * 22);
  const off = Math.floor(hash(board, 1, 30) * len);
  const along = (((x + off) % len) + len) % len;
  const piece = Math.floor((x + off) / len);
  if (along === 0) return cell('wood', 5);
  if (along === 1) return cell('wood', 1);
  if ((along === 3 || along === len - 2) && (row === 1 || row === 3))
    return cell('iron', row === 1 ? 2 : 4);
  const tone = hash(board, piece, 31) < 0.4 ? 1 : 0;
  let t = row === 0 ? 1 : row === 4 ? 3 : 2;
  t += tone * (row === 0 ? 0 : 1);
  const grainRow = 1 + Math.floor(hash(board, piece, 32) * 3);
  if (row === grainRow && noise(x, y, 5, 33 + board) > 0.45) t += 1;
  if (hash(x, y, 34) < 0.04) t += 1;
  return cell('wood', lim(t, 1, 4));
}

/* ------------------------------------------------------------------- walls */

/** The rock's top, seen from above: the dark mass of it in faint lumps, cracked here and there. */
function wallTopAt(x: number, y: number): Cell {
  if (cracked(x, y, 16, 40, true) && noise(x, y, 4, 39) < 0.45) return cell('caverock', 6);
  const l = lumpAt(x, y, 16, 40);
  const t = 5.4 + l.tilt * 0.15 - l.lit * 0.35 + (noise(x, y, 9, 41) - 0.5) * 0.9;
  return cell('caverock', lim(cround(t, x, y, 42, 0.6), 4, 6));
}

/**
 * The upper face (`y` is the row in the tile): the rock's top rounds over at
 * a ragged lip that catches a little light, a shadow under it, then the face
 * in big lumps, dark high up and lighter as it comes down toward the floor
 * the lanterns light.
 */
function faceHighAt(x: number, y: number, wy: number): Cell {
  const lip = 2 + Math.round((noise(x, 0, 7, 43) - 0.5) * 4);
  if (y < lip - 1) return wallTopAt(x, wy);
  if (y === lip - 1) return cell('caverock', 3);
  if (y === lip || (y === lip + 1 && hash(x, 0, 44) < 0.7)) return cell('caverock', 6);
  if (cracked(x, wy, 15, 45, true, true)) return cell('caverock', 6);
  const l = lumpAt(x, wy, 15, 45, true);
  const t = 6 - (y / 24) * 1.6 + l.tilt * 0.35 - l.lit * 1.0 + (noise(x, wy, 6, 46) - 0.5) * 0.5;
  return cell('caverock', lim(cround(t, x, wy, 47, 0.6), 3, 6));
}

/**
 * The lower face, where the light reaches: the same lumps lit by the floor,
 * the tide's mark of barnacles and weed, and a wet dark foot that anything
 * standing in front reads against.
 */
function faceAt(x: number, y: number, wy: number): Cell {
  if (y >= 22) return cell('caverock', y === 23 ? 6 : 5);
  if (y >= 20) return cell('caverock', hash(x, y, 48) < 0.15 ? 3 : 5);
  // The tide's mark: weed hanging in clumps, barnacles above it.
  const top = 15 + Math.round((noise(x, 0, 11, 49) - 0.5) * 4);
  const weed = Math.round(noise(x, 1, 3, 50) * 4.5 - 0.5);
  if (y >= top && y < top + weed) {
    const t = y === top ? 3 : y === top + weed - 1 ? 5 : 4 - (hash(x, y, 51) < 0.25 ? 1 : 0);
    return cell('weed', t);
  }
  if (y >= top) return cell('caverock', hash(x, y, 52) < 0.1 ? 4 : 5);
  if (y >= top - 2 && hash(x, y, 53) < 0.2) return cell('cavesand', y === top - 2 ? 2 : 4);
  if (cracked(x, wy, 15, 45, true, true)) return cell('caverock', 5);
  const l = lumpAt(x, wy, 15, 45, true);
  const t = 3.5 + (y / 15) * 0.5 + l.tilt * 0.35 - l.lit * 1.1 + (noise(x, wy, 6, 46) - 0.5) * 0.5;
  return cell('caverock', lim(cround(t, x, wy, 47, 0.6), 2, 5));
}

/* ------------------------------------------------------------------- doors */

/**
 * A door: a timber frame set in the rock's face, dark beyond with the floor
 * going on into it; barred, iron bars and two bands across.
 */
function door(barred: boolean, x0: number, y0: number): TGrid {
  const g = tgrid(P, P);
  for (let y = 0; y < P; y++)
    for (let x = 0; x < P; x++) {
      let c: Cell;
      const post = x <= 4 || x >= 19;
      if (y <= 4 && x >= 1 && x <= 22) {
        // The lintel: lit on top, grain, a dark underside.
        c = cell('wood', y === 0 ? 6 : y === 1 ? 1 : y === 4 ? 4 : hash(x, y, 54) < 0.2 ? 3 : 2);
      } else if (post && x >= 1 && x <= 22) {
        // The posts, as cylinders lit from the left, darker where the lintel shades them.
        const nx = x <= 4 ? (x - 2.5) / 2 : (x - 20.5) / 2;
        let t = nx < -0.6 ? 1 : nx < 0.2 ? 2 : nx < 0.7 ? 3 : 4;
        if (y === 5) t += 1;
        if (x === 1 || x === 22) t = 6;
        c = cell('wood', t);
      } else if (post) {
        c = faceAt(x0 + x, y, y0 + y);
      } else {
        // Beyond: dark, the floor coming out of it into the light.
        c =
          y >= 17
            ? cell('caverock', y >= 21 ? 3 : y >= 19 ? 4 : 5)
            : cell('shade', y < 8 ? 4 : y < 13 ? 3 : 2);
      }
      g.d[y * P + x] = c;
    }
  if (barred) {
    for (const bx of [6, 10, 14]) {
      for (let y = 5; y < P; y++) {
        g.d[y * P + bx] = cell('iron', 1);
        g.d[y * P + bx + 1] = cell('iron', 3);
        g.d[y * P + bx + 2] = cell('iron', 5);
      }
    }
    for (const by of [8, 16]) {
      for (let x = 5; x <= 18; x++) {
        g.d[by * P + x] = cell('iron', 2);
        g.d[(by + 1) * P + x] = cell('iron', 4);
      }
      for (const bx of [7, 11, 15]) g.d[by * P + bx] = cell('iron', 0);
    }
  }
  return g;
}

/* ------------------------------------------------------------- composition */

type FloorKind = 'deep_water' | 'shallows' | 'rock_floor' | 'wet_sand' | 'sand';
/** Which ground lies over which at a join: each spills over the edges of those before it. */
const RANK: Readonly<Record<FloorKind, number>> = {
  deep_water: 0,
  shallows: 1,
  rock_floor: 2,
  wet_sand: 3,
  sand: 4,
};
const isFloor = (k: string | null | undefined): k is FloorKind => !!k && Object.hasOwn(RANK, k);
const isWater = (k: string | null | undefined) => k === 'shallows' || k === 'deep_water';
const WALLS = new Set(['wall_top', 'wall_face', 'wall_face_high', 'door_barred', 'door_open']);
/** Rock: a wall kind, or nothing known (the map's edge). */
const isRock = (k: string | null | undefined) => !k || WALLS.has(k) || !isTile2Kind(k);

/** A ground's texture at a place in the room. */
const FLOOR: Readonly<Record<FloorKind | 'planks' | 'wall_top', (x: number, y: number) => Cell>> = {
  sand: sandAt,
  wet_sand: wetAt,
  rock_floor: rockAt,
  shallows: shallowsAt,
  deep_water: deepAt,
  planks: planksAt,
  wall_top: wallTopAt,
};

/** How deep a spill reaches over an edge, from where along the edge it is: 3 to 11 pixels, wandering. */
const reach = (x: number, y: number, k: number) => 3 + 10 * noise(x, y, 13, 60 + k);

const DIRS = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'] as const;
type Dir = (typeof DIRS)[number];

/** Whether a pixel (x, y in the tile at x0, y0) lies in the spill from a neighbour on `dir`. */
function inSpill(dir: Dir, x: number, y: number, x0: number, y0: number, k: number): boolean {
  switch (dir) {
    case 'n':
      return y + 0.5 < reach(x0 + x, y0, k);
    case 's':
      return P - 0.5 - y < reach(x0 + x, y0 + P, k);
    case 'w':
      return x + 0.5 < reach(x0, y0 + y, k);
    case 'e':
      return P - 0.5 - x < reach(x0 + P, y0 + y, k);
    default: {
      const cx = dir.endsWith('w') ? 0 : P;
      const cy = dir.startsWith('n') ? 0 : P;
      return Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < reach(x0 + cx, y0 + cy, k);
    }
  }
}

function joinFloor(
  g: TGrid,
  kind: FloorKind,
  around: Around,
  x0: number,
  y0: number,
  wear: number,
): void {
  // Higher grounds spill over this one's edges, the lowest of them first.
  const over = DIRS.map((d) => ({ d, k: around[d] }))
    .filter((n): n is { d: Dir; k: FloorKind } => isFloor(n.k) && RANK[n.k] > RANK[kind])
    .sort((a, b) => RANK[a.k] - RANK[b.k]);
  const land = new Uint8Array(P * P);
  for (const { d, k } of over)
    for (let y = 0; y < P; y++)
      for (let x = 0; x < P; x++) {
        if (!inSpill(d, x, y, x0, y0, RANK[k])) continue;
        g.d[y * P + x] = FLOOR[k](x0 + x, y0 + y);
        land[y * P + x] = isWater(k) ? 2 : 1;
      }
  // Where land meets water, a broken line of foam on the water's side and a
  // sparser one a pixel out; where sand meets the wet, a line of wrack.
  if (isWater(kind) || kind === 'wet_sand') {
    const add: [number, Cell][] = [];
    for (let y = 0; y < P; y++)
      for (let x = 0; x < P; x++) {
        const i = y * P + x;
        if (land[i]) continue;
        const near = (dx: number, dy: number) => {
          const xx = x + dx;
          const yy = y + dy;
          return xx >= 0 && yy >= 0 && xx < P && yy < P && land[yy * P + xx] === 1;
        };
        const touch = near(-1, 0) || near(1, 0) || near(0, -1) || near(0, 1);
        const two = !touch && (near(-2, 0) || near(2, 0) || near(0, -2) || near(0, 2));
        const X = x0 + x;
        const Y = y0 + y;
        if (kind === 'wet_sand') {
          if (touch && clumpsAt(X, Y, 62) > 0.45)
            add.push([i, cell(hash(X, Y, 63) < 0.5 ? 'weed' : 'cavesand', 4)]);
        } else if (touch && clumpsAt(X, Y, 64) > 0.3)
          add.push([i, cell('shoal', hash(X, Y, 65) < 0.35 ? 0 : 1)]);
        else if (two && clumpsAt(X, Y, 66) > 0.62) add.push([i, cell('shoal', 2)]);
      }
    for (const [i, c] of add) g.d[i] = c;
  }
  // The deep's edge under shallows drops away: the water there a step darker.
  if (kind === 'deep_water')
    for (let y = 0; y < P; y++)
      for (let x = 0; x < P; x++) {
        if (land[y * P + x] !== 2) continue;
        const edge = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => {
          const xx = x + dx!;
          const yy = y + dy!;
          return xx >= 0 && yy >= 0 && xx < P && yy < P && !land[yy * P + xx];
        });
        if (edge) g.d[y * P + x] = cell('shoal', 4);
      }
  shadeUnder(g, around, x0, y0, wear);
}

/** Floors darken under the walls and decks that rise beside them, in clumps rather than a ruled band. */
function shadeUnder(g: TGrid, around: Around, x0: number, y0: number, wear: number): void {
  const dim = (x: number, y: number, n: number) => {
    const i = y * P + x;
    if (n > 0 && g.d[i]) g.d[i] = darker(g.d[i]!, n);
  };
  const deck = around.n === 'planks';
  if (deck || isRock(around.n)) {
    const deep = deck ? 3 : 5;
    for (let y = 0; y <= deep; y++)
      for (let x = 0; x < P; x++) {
        const edge = deep - y + (clumpsAt(x0 + x, y0 + y, 67) - 0.5) * 2.4;
        dim(x, y, y < (deck ? 1 : 2) ? 2 : edge > 0.6 ? 1 : 0);
      }
    // A little scree at the rock's foot.
    if (!deck)
      for (let i = 0; i < 3; i++) {
        const x = 2 + Math.floor(hash(wear, i, 68) * 19);
        const y = 2 + Math.floor(hash(wear, i, 69) * 2);
        const c = g.d[y * P + x]!;
        if (hash(wear, i, 70) < 0.55 && !isMat(c, 'deep') && !isMat(c, 'shoal')) {
          g.d[y * P + x] = cell('caverock', 2);
          g.d[y * P + x + 1] = cell('caverock', 4);
          g.d[(y + 1) * P + x] = cell('caverock', 5);
          g.d[(y + 1) * P + x + 1] = darker(g.d[(y + 1) * P + x + 1]!, 1);
        }
      }
  }
  for (const [side, edgeX, dx] of [
    ['w', 0, 1],
    ['e', P - 1, -1],
  ] as const) {
    if (!isRock(around[side])) continue;
    for (let y = 0; y < P; y++) {
      dim(edgeX, y, 2);
      if (clumpsAt(x0 + edgeX + dx, y0 + y, 71) > 0.35) dim(edgeX + dx, y, 1);
      if (side === 'w' && clumpsAt(x0 + edgeX + 2 * dx, y0 + y, 72) > 0.7)
        dim(edgeX + 2 * dx, y, 1);
    }
  }
  if (isRock(around.s)) for (let x = 0; x < P; x++) dim(x, P - 1, 1);
}

/** The rock's top where it falls away to open ground: a ragged lip, lit or shaded by the way it faces. */
function joinTop(g: TGrid, around: Around, x0: number, y0: number): void {
  const open = (k: string | null | undefined) => !isRock(k);
  for (let y = 0; y < P; y++)
    for (let x = 0; x < P; x++) {
      const i = y * P + x;
      // Facing up (a room's bottom wall) or left (its right wall): the lip catches the light.
      const dN = open(around.n) ? reach(x0 + x, y0, 5) / 2.5 : 0;
      const dW = open(around.w) ? reach(x0, y0 + y, 6) / 2.5 : 0;
      const dE = open(around.e) ? reach(x0 + P, y0 + y, 7) / 2.5 : 0;
      if (y + 0.5 < dN || x + 0.5 < dW) {
        const rim = (y < 1 && open(around.n)) || (x < 1 && open(around.w));
        g.d[i] = cell('caverock', rim ? 3 : 2);
      } else if (P - 0.5 - x < dE) g.d[i] = cell('caverock', x === P - 1 ? 5 : 4);
    }
}

/** A deck's own edges: a beam along any edge with no deck beyond. */
function joinPlanks(g: TGrid, around: Around): void {
  if (around.s !== 'planks')
    for (let x = 0; x < P; x++) {
      g.d[21 * P + x] = cell('wood', 2);
      g.d[22 * P + x] = cell('wood', 4);
      g.d[23 * P + x] = cell('wood', 5);
    }
  if (around.w !== 'planks')
    for (let y = 0; y < P; y++) if (y % 6 !== 5) g.d[y * P] = cell('wood', 2);
  if (around.e !== 'planks') for (let y = 0; y < P; y++) g.d[y * P + P - 1] = cell('wood', 5);
}

/** A low ledge: a face with open ground above it shows its lip. */
function joinFace(g: TGrid, around: Around): void {
  if (isRock(around.n)) return;
  for (let x = 0; x < P; x++) {
    g.d[x] = cell('caverock', 2);
    g.d[P + x] = cell('caverock', 3);
  }
}

/** Now and then a detail: a shell, pebbles, a crab's hole, weed, a rock pool, barnacles, a split board. */
function details(g: TGrid, kind: Tile2Kind, wear: number): void {
  const set = (x: number, y: number, c: Cell) => {
    if (x >= 0 && y >= 0 && x < P && y < P) g.d[y * P + x] = c;
  };
  const r = (i: number) => hash(wear, i, 72 + kind.length);
  const cx = 7 + Math.floor(r(1) * 10);
  const cy = 8 + Math.floor(r(2) * 9);
  if (kind === 'sand' || kind === 'wet_sand') {
    const base = kind === 'sand' ? 2 : 3;
    if (wear === 3) {
      // A cockle: ribbed, lit on its left, its own shadow below.
      set(cx, cy, cell('shell', 1));
      set(cx + 1, cy, cell('shell', 2));
      set(cx + 2, cy, cell('shell', 3));
      set(cx, cy + 1, cell('shell', 3));
      set(cx + 1, cy + 1, cell('shell', 4));
      set(cx + 2, cy + 1, cell('shell', 4));
      set(cx + 1, cy + 2, cell('cavesand', base + 2));
      set(cx + 2, cy + 2, cell('cavesand', base + 2));
    } else if (wear === 9) {
      // Pebbles in a little group.
      for (const [dx, dy] of [
        [0, 0],
        [3, 1],
        [1, 3],
      ] as const) {
        set(cx + dx, cy + dy, cell('caverock', 2));
        set(cx + dx + 1, cy + dy, cell('caverock', 3));
        set(cx + dx + 1, cy + dy + 1, cell('cavesand', base + 2));
      }
    } else if (wear === 14) {
      // A crab's hole: a dark mouth, the sand thrown up round it.
      set(cx, cy, cell('cavesand', 1));
      set(cx + 1, cy, cell('cavesand', 1));
      set(cx - 1, cy + 1, cell('cavesand', 1));
      set(cx, cy + 1, cell('shade', 3));
      set(cx + 1, cy + 1, cell('shade', 2));
      set(cx + 2, cy + 1, cell('cavesand', 3));
      set(cx, cy + 2, cell('cavesand', 4));
      set(cx + 1, cy + 2, cell('cavesand', 3));
    } else if (wear === 6 && kind === 'wet_sand') {
      // A strand of weed the tide left.
      for (let i = 0; i < 6; i++) {
        const dy = Math.round(Math.sin(i * 1.2));
        set(cx + i, cy + dy, cell('weed', i % 2 ? 3 : 2));
        set(cx + i, cy + 1 + dy, cell('weed', 5));
      }
    }
  } else if (kind === 'rock_floor') {
    if (wear === 4) {
      // A rock pool: a rim lit on its far side, water a step down inside.
      for (let y = -3; y <= 3; y++)
        for (let x = -4; x <= 4; x++) {
          const d = (x / 4.5) ** 2 + (y / 3.2) ** 2;
          if (d > 1) continue;
          set(
            cx + x,
            cy + y,
            d > 0.6
              ? cell('caverock', y < 0 ? 5 : 2)
              : cell('shoal', y < -1 ? 4 : x < -1 && y < 1 ? 1 : 3),
          );
        }
      set(cx - 1, cy, cell('shoal', 0));
    } else if (wear === 11) {
      // Barnacles: pale cones with dark mouths.
      for (const [dx, dy] of [
        [0, 0],
        [2, -1],
        [3, 1],
        [1, 2],
      ] as const) {
        set(cx + dx, cy + dy, cell('cavesand', 1));
        set(cx + dx + 1, cy + dy, cell('cavesand', 3));
        set(cx + dx, cy + dy + 1, cell('caverock', 5));
      }
    } else if (wear === 17) {
      for (let i = 0; i < 5; i++) {
        set(cx + i, cy + (i % 2), cell('weed', 2));
        set(cx + i, cy + 1 + (i % 2), cell('weed', 4));
      }
    }
  } else if (kind === 'planks' && wear === 2) {
    // A split board, dark down it.
    for (let x = 8; x < 15; x++) set(x, 14, cell('wood', x % 3 === 0 ? 4 : 5));
  }
}

const tiles = new Map<string, TGrid>();

/** One letter per neighbour, for the cache: only what changes the tile. */
function signature(around: Around | undefined): string {
  if (!around) return '-';
  return DIRS.map((d) => {
    const k = around[d];
    if (isRock(k)) return k === 'wall_top' ? 't' : '#';
    return String(TILE2_KINDS.indexOf(k as Tile2Kind));
  }).join('');
}

/**
 * A tile's grid by kind, wear (0 to `TILE2_WEARS[kind] - 1`) and cell, joined
 * to its neighbours if told them. Kept once made (1.2 KB of cells each);
 * `forgetTiles2` lets them go.
 */
export function tile2Grid(kind: Tile2Kind, wear: number, around?: Around, at?: TileAt): TGrid {
  // Without a cell, each wear stands in its own place, far from the others.
  const col = at ? Math.floor(at.col) : wear * 5 + 1000;
  const row = at ? Math.floor(at.row) : 1000;
  const key = `${kind} ${wear} ${signature(around)} ${col} ${row}`;
  let g = tiles.get(key);
  if (g) return g;
  const x0 = col * P;
  const y0 = row * P;
  if (kind === 'door_barred' || kind === 'door_open') g = door(kind === 'door_barred', x0, y0);
  else {
    g = tgrid(P, P);
    for (let y = 0; y < P; y++)
      for (let x = 0; x < P; x++)
        g.d[y * P + x] =
          kind === 'wall_face'
            ? faceAt(x0 + x, y, y0 + y)
            : kind === 'wall_face_high'
              ? faceHighAt(x0 + x, y, y0 + y)
              : FLOOR[kind](x0 + x, y0 + y);
    details(g, kind, wear);
    if (around) {
      if (isFloor(kind)) joinFloor(g, kind, around, x0, y0, wear);
      else if (kind === 'wall_top') joinTop(g, around, x0, y0);
      else if (kind === 'planks') joinPlanks(g, around);
      else if (kind === 'wall_face') joinFace(g, around);
    }
  }
  tiles.set(key, g);
  return g;
}

/** Lets go of every tile kept. */
export function forgetTiles2(): void {
  tiles.clear();
}

/** How many tiles are kept, for memory checks. */
export const keptTiles2 = (): number => tiles.size;

/**
 * How many steps a standing thing's contact shadow darkens each ground (the
 * ground's own steps, as in town): two on dry ground and decks, one in the
 * shallows, none on the deep.
 */
export const GROUND2_SHADOW: Readonly<Partial<Record<Tile2Kind, number>>> = {
  sand: 2,
  wet_sand: 2,
  rock_floor: 2,
  shallows: 1,
  planks: 2,
};

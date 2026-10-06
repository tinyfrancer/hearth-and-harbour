/*
 * Grid pathing for tap-to-move. Written fresh and small; the idea of searching
 * the grid and then straightening the route by testing lines for a body's
 * clearance comes from untitled-boomer-mmo's PathSystem, which did much more.
 */
import {
  TILE,
  cellAt,
  centreOf,
  inMap,
  isSolid,
  tileOf,
  type Cell,
  type Point,
  type TileMap,
} from './tileMap';

/**
 * Half the side of the box a walker's feet take up, in art pixels. It is less
 * than half a tile, so a walker always fits at a tile's centre, and it keeps a
 * straightened route from shaving the corner of a wall.
 */
export const FOOT_HALF = 4;

/** The half-width of a walker's feet on this map: `FOOT_HALF` on 16-pixel tiles, in proportion on others. */
export function footHalf(map: TileMap): number {
  return (FOOT_HALF * tileOf(map)) / TILE;
}

const DIAGONAL = Math.SQRT2;
const STEPS: readonly { dc: number; dr: number; cost: number }[] = [
  { dc: 1, dr: 0, cost: 1 },
  { dc: -1, dr: 0, cost: 1 },
  { dc: 0, dr: 1, cost: 1 },
  { dc: 0, dr: -1, cost: 1 },
  { dc: 1, dr: 1, cost: DIAGONAL },
  { dc: 1, dr: -1, cost: DIAGONAL },
  { dc: -1, dr: 1, cost: DIAGONAL },
  { dc: -1, dr: -1, cost: DIAGONAL },
];

interface Reach {
  /** Cost to reach each tile from the start, by index; Infinity where it cannot be reached. */
  readonly cost: Float64Array;
  /** The tile each was reached from, by index; -1 for the start and the unreached. */
  readonly from: Int32Array;
}

/**
 * Which tiles of a map are solid, one byte a tile, worked out once a map:
 * searching and testing lines read this rather than asking each tile's kind,
 * which made a search over the town allocate a cell for every step it tried
 * (enough, on a tap, to hold up a frame on a slow phone). Maps are never
 * changed in place, so a map's grid is good for as long as the map is.
 */
const solidGrids = new WeakMap<TileMap, Uint8Array>();

function solidOf(map: TileMap): Uint8Array {
  let grid = solidGrids.get(map);
  if (!grid) {
    grid = new Uint8Array(map.cols * map.rows);
    for (let row = 0; row < map.rows; row++)
      for (let col = 0; col < map.cols; col++)
        grid[row * map.cols + col] = isSolid(map, { col, row }) ? 1 : 0;
    solidGrids.set(map, grid);
  }
  return grid;
}

/** Whether a tile is solid, by column and row; off the map counts as solid. */
const solidAt = (map: TileMap, grid: Uint8Array, col: number, row: number): boolean =>
  col < 0 || row < 0 || col >= map.cols || row >= map.rows || grid[row * map.cols + col] === 1;

/**
 * Everywhere a walker can get to from `start`, and how. One search answers
 * both "how do I get there" and "where is the nearest place I can get to", and
 * a town is small enough that searching all of it is cheaper than being
 * clever. It allocates its two answers and the heap's arrays, nothing per tile.
 */
function reachFrom(map: TileMap, start: Cell): Reach {
  const size = map.cols * map.rows;
  const cost = new Float64Array(size).fill(Infinity);
  const from = new Int32Array(size).fill(-1);
  if (isSolid(map, start)) return { cost, from };
  const solid = solidOf(map);
  const cols = map.cols;
  const open = new MinHeap();
  const first = start.row * cols + start.col;
  cost[first] = 0;
  open.push(first, 0);
  while (open.size > 0) {
    const at = open.top;
    const atCost = open.topCost;
    open.pop();
    if (atCost > cost[at]!) continue;
    const col = at % cols;
    const row = (at - col) / cols;
    for (const { dc, dr, cost: step } of STEPS) {
      const tc = col + dc;
      const tr = row + dr;
      if (solidAt(map, solid, tc, tr)) continue;
      // A diagonal step may not cut the corner of a solid tile.
      if (dc && dr && (solidAt(map, solid, tc, row) || solidAt(map, solid, col, tr))) continue;
      const to = tr * cols + tc;
      const toCost = atCost + step;
      if (toCost < cost[to]!) {
        cost[to] = toCost;
        from[to] = at;
        open.push(to, toCost);
      }
    }
  }
  return { cost, from };
}

/** The tiles from `start` to `goal`, both included, or null if there is no way there. */
export function findPath(map: TileMap, start: Cell, goal: Cell): Cell[] | null {
  if (!inMap(map, goal)) return null;
  return pathIn(map, reachFrom(map, start), goal);
}

function pathIn(map: TileMap, reach: Reach, goal: Cell): Cell[] | null {
  let at = goal.row * map.cols + goal.col;
  if (reach.cost[at] === Infinity) return null;
  const cells: Cell[] = [];
  for (; at !== -1; at = reach.from[at]!) {
    cells.push({ col: at % map.cols, row: Math.floor(at / map.cols) });
  }
  return cells.reverse();
}

/**
 * The tile a walker at `start` should head for when asked to go to `target`:
 * the target itself if it can be reached, otherwise the reachable tile nearest
 * to it in a straight line (the shorter walk breaks a tie). Null only when the
 * walker is standing somewhere it cannot be.
 */
export function nearestReachable(map: TileMap, start: Cell, target: Cell): Cell | null {
  return nearestIn(map, reachFrom(map, start), target);
}

function nearestIn(map: TileMap, reach: Reach, target: Cell): Cell | null {
  let best = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < reach.cost.length; i++) {
    if (reach.cost[i] === Infinity) continue;
    const col = i % map.cols;
    const row = (i - col) / map.cols;
    const distance = (col - target.col) ** 2 + (row - target.row) ** 2;
    if (
      distance < bestDistance ||
      (distance === bestDistance && reach.cost[i]! < reach.cost[best]!)
    ) {
      best = i;
      bestDistance = distance;
    }
  }
  return best === -1 ? null : { col: best % map.cols, row: Math.floor(best / map.cols) };
}

/**
 * Of `cells`, the one a walker at `from` can reach by the shortest walk (the
 * earlier in the list breaks a tie), or null if it can reach none of them.
 */
export function cheapest(map: TileMap, from: Point, cells: readonly Cell[]): Cell | null {
  const reach = reachFrom(map, cellAt(from, tileOf(map)));
  let best: Cell | null = null;
  let bestCost = Infinity;
  for (const cell of cells) {
    if (!inMap(map, cell)) continue;
    const cost = reach.cost[cell.row * map.cols + cell.col]!;
    if (cost < bestCost) {
      best = cell;
      bestCost = cost;
    }
  }
  return best;
}

/** How far apart the boxes are set along a line being tested: under a tile, so none is missed. */
const LINE_STEP = 2;

/** Whether a walker's feet can go from `a` to `b` in a straight line without touching a solid tile. */
export function clearLine(map: TileMap, a: Point, b: Point, half = footHalf(map)): boolean {
  const tile = tileOf(map);
  const solid = solidOf(map);
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / LINE_STEP));
  for (let i = 0; i <= steps; i++) {
    const x = a.x + ((b.x - a.x) * i) / steps;
    const y = a.y + ((b.y - a.y) * i) / steps;
    // A box that only touches a tile's edge is not in it.
    const left = Math.floor((x - half) / tile);
    const right = Math.ceil((x + half) / tile) - 1;
    const top = Math.floor((y - half) / tile);
    const bottom = Math.ceil((y + half) / tile) - 1;
    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (solidAt(map, solid, col, row)) return false;
      }
    }
  }
  return true;
}

/**
 * The points a walker at `from` walks through to get as near `to` as it can,
 * not including where it starts. The grid route is straightened: each leg
 * runs to the furthest point on the route it can reach in a straight line, so
 * the walk goes across open ground rather than in steps along the grid.
 */
export function route(map: TileMap, from: Point, to: Point): Point[] {
  const tile = tileOf(map);
  const start = cellAt(from, tile);
  const reach = reachFrom(map, start);
  const target = cellAt(
    {
      x: Math.min(Math.max(to.x, 0), map.cols * tile - 1),
      y: Math.min(Math.max(to.y, 0), map.rows * tile - 1),
    },
    tile,
  );
  const goal = nearestIn(map, reach, target);
  const cells = goal && pathIn(map, reach, goal);
  if (!cells) return [];
  const points = cells.map((cell) => centreOf(cell, tile));
  const legs: Point[] = [];
  let at = from;
  for (let i = 0; i < points.length;) {
    let j = points.length - 1;
    while (j > i && !clearLine(map, at, points[j]!)) j--;
    const next = points[j]!;
    if (next.x !== at.x || next.y !== at.y) legs.push(next);
    at = next;
    i = j + 1;
  }
  return legs;
}

/**
 * A small binary heap of tile indexes by cost: enough for a search, and no
 * dependency. Two plain arrays rather than a pair per entry, so a search
 * makes no garbage; the order it gives ties in is the same as it always was,
 * so every route comes out exactly as before.
 */
class MinHeap {
  private readonly items: number[] = [];
  private readonly costs: number[] = [];

  get size(): number {
    return this.items.length;
  }

  /** The cheapest tile, and its cost: read before `pop`. */
  get top(): number {
    return this.items[0]!;
  }

  get topCost(): number {
    return this.costs[0]!;
  }

  push(item: number, cost: number): void {
    const items = this.items;
    const costs = this.costs;
    items.push(item);
    costs.push(cost);
    for (let i = items.length - 1; i > 0;) {
      const parent = (i - 1) >> 1;
      if (costs[parent]! <= cost) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): void {
    const items = this.items;
    const costs = this.costs;
    const last = items.pop()!;
    const lastCost = costs.pop()!;
    if (items.length === 0) return;
    items[0] = last;
    costs[0] = lastCost;
    for (let i = 0; ;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let least = i;
      if (l < items.length && costs[l]! < costs[least]!) least = l;
      if (r < items.length && costs[r]! < costs[least]!) least = r;
      if (least === i) break;
      this.swap(i, least);
      i = least;
    }
  }

  private swap(i: number, j: number): void {
    const items = this.items;
    const costs = this.costs;
    const item = items[i]!;
    items[i] = items[j]!;
    items[j] = item;
    const cost = costs[i]!;
    costs[i] = costs[j]!;
    costs[j] = cost;
  }
}

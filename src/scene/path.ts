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
 * Everywhere a walker can get to from `start`, and how. One search answers
 * both "how do I get there" and "where is the nearest place I can get to", and
 * a town is small enough that searching all of it is cheaper than being
 * clever.
 */
/**
 * Each tile of a map, solid (1) or not (0), row by row: worked out once a
 * map (maps are never changed, only replaced) so a search reads a byte
 * rather than looking a tile's kind up.
 */
const solids = new WeakMap<TileMap, Uint8Array>();
function solidOf(map: TileMap): Uint8Array {
  let s = solids.get(map);
  if (!s) {
    s = new Uint8Array(map.cols * map.rows);
    for (let row = 0; row < map.rows; row++)
      for (let col = 0; col < map.cols; col++)
        s[row * map.cols + col] = isSolid(map, { col, row }) ? 1 : 0;
    solids.set(map, s);
  }
  return s;
}

/**
 * The search works on plain numbers, with nothing made per tile: on the
 * town's 60 x 89 map it was a few milliseconds a tap (a dropped frame or
 * two on a slow phone), most of it making little objects for each tile
 * looked at. It visits tiles in exactly the same order as before.
 */
function reachFrom(map: TileMap, start: Cell): Reach {
  const { cols, rows } = map;
  const size = cols * rows;
  const cost = new Float64Array(size).fill(Infinity);
  const from = new Int32Array(size).fill(-1);
  if (isSolid(map, start)) return { cost, from };
  const solid = solidOf(map);
  const open = new MinHeap();
  const first = start.row * cols + start.col;
  cost[first] = 0;
  open.push(first, 0);
  while (open.size > 0) {
    const atCost = open.topCost();
    const at = open.pop();
    if (atCost > cost[at]!) continue;
    const col = at % cols;
    const row = (at - col) / cols;
    for (let k = 0; k < STEPS.length; k++) {
      const { dc, dr, cost: step } = STEPS[k]!;
      const c = col + dc;
      const r = row + dr;
      if (c < 0 || r < 0 || c >= cols || r >= rows || solid[r * cols + c]) continue;
      // A diagonal step may not cut the corner of a solid tile.
      if (dc && dr && (solid[row * cols + c] || solid[r * cols + col])) continue;
      const to = r * cols + c;
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
  const { cols, rows } = map;
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
        // Off the map counts as solid, as `isSolid` has it.
        if (col < 0 || row < 0 || col >= cols || row >= rows || solid[row * cols + col])
          return false;
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
 * A small binary heap of tile indexes by cost, in two growing typed arrays:
 * enough for a search, no dependency, and nothing made per push. It sifts
 * exactly as the one it replaced, so ties come out in the same order.
 */
class MinHeap {
  private items = new Int32Array(256);
  private costs = new Float64Array(256);
  size = 0;

  push(item: number, cost: number): void {
    if (this.size === this.items.length) {
      const items = new Int32Array(this.size * 2);
      const costs = new Float64Array(this.size * 2);
      items.set(this.items);
      costs.set(this.costs);
      this.items = items;
      this.costs = costs;
    }
    const { items, costs } = this;
    let i = this.size++;
    items[i] = item;
    costs[i] = cost;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (costs[parent]! <= cost) break;
      items[i] = items[parent]!;
      costs[i] = costs[parent]!;
      items[parent] = item;
      costs[parent] = cost;
      i = parent;
    }
  }

  /** The cost of the item `pop` will give. */
  topCost(): number {
    return this.costs[0]!;
  }

  /** Takes the cheapest item off. Only while `size` is more than none. */
  pop(): number {
    const { items, costs } = this;
    const top = items[0]!;
    const n = --this.size;
    if (n === 0) return top;
    items[0] = items[n]!;
    costs[0] = costs[n]!;
    for (let i = 0; ;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let least = i;
      if (l < n && costs[l]! < costs[least]!) least = l;
      if (r < n && costs[r]! < costs[least]!) least = r;
      if (least === i) break;
      const item = items[i]!;
      const cost = costs[i]!;
      items[i] = items[least]!;
      costs[i] = costs[least]!;
      items[least] = item;
      costs[least] = cost;
      i = least;
    }
    return top;
  }
}

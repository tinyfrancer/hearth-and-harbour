/*
 * Light as a dungeon's mechanic (Thistlewood Burrow's, as the tide is the
 * grotto's), as pure rules: lanterns on posts that a hero lights by hand and
 * moths put out, the pools they lay, spore clouds that hang in the air and
 * burn off in a pool, and what the dark does. Everything here reads a run's
 * state; `battle.ts` changes it, in its tick, and draws its numbers from
 * here. The pictures follow these numbers (`grottoArt.ts` lays each pool to
 * exactly this size), never the other way round.
 *
 * The rules, each in a sentence:
 * - A room with lanterns on posts (`Q`, `Y` in its rows) is dark but for
 *   their pools; a point is lit when it is inside a burning lantern's pool,
 *   out to its edge (`LIT_EDGE`), and not inside a spore cloud.
 * - Tapping an unlit lantern walks the hero beside it; standing there he
 *   lights it in `LIGHT_MS`, striking nothing meanwhile. A blow that lands on
 *   him puts the match out (he must start again); any other order he gives
 *   ends it.
 * - In the dark he fights half blind: his blows land `DARK_AIM` as often, and
 *   blows at him find him as if his defence were `DARK_GUARD` of itself. A
 *   heavy blow made in the light is marked `LIT_WARN_MS` longer (seen
 *   coming). The mark itself is the same, lit or not, and never hidden.
 * - A boss that burrows comes up under him where he stands in the dark; in a
 *   lantern's light it cannot, so it comes up at that lantern instead (which
 *   it puts out) and is dazzled there for `DAZZLE_MS`, open to blows.
 * - Something that creeps (`FoeKind.creeps`) walks only in the dark: in a
 *   pool it holds still, though it still fights what comes into its reach.
 * - A moth (`FoeKind.seeksLight`) flies to the nearest burning lantern and
 *   puts it out after `snuffMs`, unless a blow lands on it first (which
 *   starts it over); with nothing burning it fights like anything else.
 * - A spore cloud hurts whoever stands in it every `CLOUD_EVERY_MS`; one in a
 *   pool burns off within `CLOUD_BURN_MS`.
 * - A darker day (S16 `darker`): a lantern takes `DARKER_LIGHTING` times as
 *   long to light, and his own small light is smaller (`DARKER_HERO`).
 */
import { DUNGEON, far } from './dungeonMetrics';
import type { Ground, LampSpot, RoomTile } from './ground';
import { cellAt, centreOf, inMap, isSolid, type Cell, type Point, type TileMap } from './tileMap';

const T = DUNGEON.tile;

/** A lantern's pool across the floor: half its width, art pixels (lane B's lantern lays 70). */
export const LAMP_POOL = far(44);
/** How flat a pool lies on the floor, as lane B's do: its height is this much of its width. */
export const LAMP_SQUASH = 0.62;
/**
 * How far out a pool's light counts, as a share of its half-width: its heart
 * (inside 1) and its ragged edge band (to this) are lit; beyond is the dark.
 * The same band as a darker day's (`POOL_EDGE` in `grottoArt.ts`).
 */
export const LIT_EDGE = 1.5;
/** How far below a post's foot the middle of its pool lies: the light falls about the post. */
export const POOL_DROP = 4;
/** How long lighting a lantern takes, standing beside it. A whole number of ticks. */
export const LIGHT_MS = 1200;
/** How near his feet must be to a lantern's foot to light it. */
export const TEND_REACH = far(30);
/** A darker day: his own light (drawing only; it is not a rule) lays this share of its pool. */
export const DARKER_HERO = 0.7;
/** In the dark, his blows land this much as often. */
export const DARK_AIM = 0.55;
/** In the dark, blows at him find him as if his defence were this much of itself. */
export const DARK_GUARD = 0.35;
/** A burrower come up into a lantern's light is dazzled this long: it does nothing. */
export const DAZZLE_MS = 2500;
/** A heavy blow begun in the light is marked this much longer: it is seen coming. */
export const LIT_WARN_MS = 500;
/** How often a spore cloud hurts whoever stands in it. */
export const CLOUD_EVERY_MS = 1000;
/** How soon a spore cloud in a lantern's pool burns off. */
export const CLOUD_BURN_MS = 1500;
/** Where a lantern on a post can be tapped, from its foot: as wide as the post's light, as tall as it. */
export const LAMP_TAP = { w: 24, h: 48 } as const;

/** A cloud of spores hanging over the floor, until it settles. */
export interface Cloud {
  readonly room: string;
  readonly at: Point;
  readonly radius: number;
  /** On the run's clock: when it came, and when it is gone. */
  readonly from: number;
  readonly until: number;
  /** What it does to whoever stands in it, every `CLOUD_EVERY_MS`. */
  readonly damage: number;
  /** In a lantern's pool, burning off (its `until` brought in once). */
  readonly burning?: true;
}

/**
 * A darker day where light is a rule (S16 `darker`): the dark presses in,
 * and a lantern takes this many times as long to catch (`LIGHT_MS`). Its
 * pool, once lit, is as wide as ever: what the rules call lit is what is
 * drawn lit.
 */
export const DARKER_LIGHTING = 1.25;

/** Whether a room's light is a rule: it has lanterns on posts. */
export const lightRoom = (ground: Ground): boolean => ground.lamps.length > 0;

/** Where a lantern's post meets the floor (its prop's foot, as every prop's: two above its tile's bottom). */
export function lampFoot(cell: Cell): Point {
  return { x: cell.col * T + T / 2, y: cell.row * T + T - 2 };
}

/** The middle of a lantern's pool on the floor. */
export function poolMiddle(cell: Cell): Point {
  const foot = lampFoot(cell);
  return { x: foot.x, y: foot.y + POOL_DROP };
}

/** How far into a lantern's pool a point is: 0 at its middle, 1 at its heart's edge, `LIT_EDGE` at its light's. */
export function intoPool(cell: Cell, p: Point): number {
  const m = poolMiddle(cell);
  return Math.hypot((p.x - m.x) / LAMP_POOL, (p.y - m.y) / (LAMP_POOL * LAMP_SQUASH));
}

/** Whether a point is in the light of a lantern: inside its pool, out to the edge of its light. */
export const inPool = (cell: Cell, p: Point): boolean => intoPool(cell, p) <= LIT_EDGE + 1e-9;

/** Whether a point is in the light of any of a room's lanterns that burn (`lit`, by the ground's order). */
export function litBy(
  lamps: readonly LampSpot[],
  lit: readonly boolean[] | undefined,
  p: Point,
): boolean {
  if (!lit) return false;
  for (let i = 0; i < lamps.length; i++) if (lit[i] && inPool(lamps[i]!.cell, p)) return true;
  return false;
}

/** Whether a point is in a cloud. */
export const inCloud = (c: Cloud, p: Point): boolean =>
  Math.hypot(p.x - c.at.x, p.y - c.at.y) < c.radius - 1e-6;

/** The cell of a lantern a point is on, by the ground's order; null for none. */
export function lampOn(ground: Ground, cell: Cell): number | null {
  const i = ground.lamps.findIndex((l) => l.cell.col === cell.col && l.cell.row === cell.row);
  return i >= 0 ? i : null;
}

/** The floor round a post, in front of it first: the first three put the hero before the post, not behind it. */
const STAND: readonly [number, number][] = [
  [0, 1],
  [-1, 1],
  [1, 1],
  [-1, 0],
  [1, 0],
  [0, -1],
];
const IN_FRONT = 3;

/**
 * Where to stand to light a lantern: the open floor beside its post nearest
 * `from`, a tile's worth in favour of the floor in front of it (where the
 * hero is seen at the flame, not hidden behind the post), below it first as a
 * tie; or null if it is walled in.
 */
export function lampStand(map: TileMap<RoomTile>, cell: Cell, from?: Point): Point | null {
  let best: Point | null = null;
  let bestD = Infinity;
  STAND.forEach(([dc, dr], i) => {
    const c = { col: cell.col + dc, row: cell.row + dr };
    if (!inMap(map, c) || isSolid(map, c) || map.tiles[c.row]![c.col] === 'door') return;
    const p = centreOf(c, T);
    // The order breaks a tie, so the same lantern is always stood at from the same side.
    const d =
      (from ? Math.hypot(p.x - from.x, p.y - from.y) : 0) + (i < IN_FRONT ? 0 : T) + i * 1e-3;
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  });
  return best;
}

const HOVER: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
];

/**
 * Where a moth hovers to put a lantern out: over the floor beside its post,
 * up at the flame, so it is seen at the lantern rather than lost in the post,
 * and a hero come to light it again has the floor in front free to stand on.
 */
export function hoverSpot(map: TileMap<RoomTile>, cell: Cell): Point | null {
  for (const [dc, dr] of HOVER) {
    const c = { col: cell.col + dc, row: cell.row + dr };
    if (inMap(map, c) && !isSolid(map, c) && map.tiles[c.row]![c.col] !== 'door') return centreOf(c, T);
  }
  return lampStand(map, cell);
}

/** The lantern whose post's tap box (`LAMP_TAP`, grown to `min`) a point is in, nearest first; null for none. */
export function lampUnder(ground: Ground, point: Point, min = 0): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  ground.lamps.forEach((l, i) => {
    const foot = lampFoot(l.cell);
    const w = Math.max(LAMP_TAP.w, min);
    const h = Math.max(LAMP_TAP.h, min);
    const top = foot.y - LAMP_TAP.h + (LAMP_TAP.h - h) / 2;
    if (Math.abs(point.x - foot.x) > w / 2 || point.y < top || point.y > top + h) return;
    const d = Math.hypot(point.x - foot.x, point.y - (foot.y - LAMP_TAP.h / 2));
    if (d < bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

/** Whether a cell is the post of one of a room's lanterns. */
export const isLampCell = (ground: Ground, at: Point): boolean =>
  lampOn(ground, cellAt(at, T)) !== null;

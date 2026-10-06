/*
 * Things that stand in a scene: buildings, props, trees. Where each one is
 * solid, where it can be tapped, where a person stands to use it and what it
 * says are all data here, never measured from its picture, so the art can be
 * redrawn without moving a wall or a tap target.
 */
import type { Picture } from '../art/raster';
import type { Shell } from '../ui/view';
import { cheapest } from './path';
import { TILE, inMap, isSolid, type Cell, type Point, type TileMap } from './tileMap';

/** A box in art pixels. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Where a button in a scene takes the player: a tab, one skill's page, or a dungeon by its id. */
export type Opens =
  | { readonly tab: Parameters<Shell['openTab']>[0] }
  | { readonly skill: string }
  | { readonly dungeon: string };

/** What walking up to a thing shows: its name, a line or two, and perhaps a button. */
export interface Use {
  readonly name: string;
  /** Shown every visit. */
  readonly lines: readonly string[];
  /** What it says instead after dark, if that is different. */
  readonly duskLines?: readonly string[];
  /**
   * Said one at a time, after `lines`: the next one each visit, in order and
   * then round again. Someone who talks rather than something that is read.
   */
  readonly says?: readonly string[];
  /** Said after dark before going round `says`, so the first visit of an evening hears one of these. */
  readonly duskSays?: readonly string[];
  readonly button?: { readonly label: string; readonly opens: Opens };
  /** Whose face to show beside the words, by the art lane's portrait id, when it has drawn one. */
  readonly portrait?: string;
}

/** How a thing looks: a picture with its top-left at `at`, in art pixels. */
export interface Sprite {
  readonly picture: Picture;
  readonly at: Point;
  /** The picture facing the other way, for someone who turns to look at the walker when he comes near. */
  readonly turned?: Picture;
}

export interface Thing {
  readonly id: string;
  /** The tiles it makes solid. */
  readonly footprint: readonly Cell[];
  /**
   * The row its feet or foundations stand on, in art pixels. Everything that
   * stands is drawn in order of this line, so someone whose feet are above it
   * is drawn behind the thing and someone below it in front.
   */
  readonly base: number;
  /** Where a tap picks it, in art pixels. Without one it cannot be tapped. */
  readonly tap?: Box;
  /** Where a person stands to use it. Without them, any open tile beside its footprint. */
  readonly spots?: readonly Cell[];
  /**
   * Where exactly to stand on each of `spots`, in art pixels, where that is
   * not the tile's middle: someone is talked to from far enough off that the
   * two do not overlap. One for each spot, in the same order.
   */
  readonly stand?: readonly Point[];
  readonly use?: Use;
  /**
   * Walking up to this opens another thing's panel instead: a stall's counter
   * opens the trader's. Counted as a visit to that other thing.
   */
  readonly panelOf?: string;
  readonly sprite?: Sprite;
}

/** The ground and what stands on it: everything the rules of walking need. */
export interface Scene {
  /** The ground with every footprint made solid. */
  readonly map: TileMap;
  readonly things: readonly Thing[];
  /** How fast the walker crosses it, in art pixels a second: `WALK_SPEED` when not given. */
  readonly speed?: number;
  /** Art pixels per half-step of the walker's bob: `STRIDE` when not given. */
  readonly stride?: number;
  /** How near the walker comes, in art pixels, before someone standing about turns: `NOTICE` when not given. */
  readonly notice?: number;
}

/** One entry in the order things are drawn: a thing, or the walker. */
export type Drawn = Thing | 'walker';

/**
 * The order to draw things in, back to front: by base line, the walker
 * standing at `walkerBase` (its feet). A thing whose base is exactly level
 * with the walker's feet goes first, so the walker is in front.
 */
export function drawOrder(things: readonly Thing[], walkerBase: number): Drawn[] {
  const order: Drawn[] = [...things];
  order.push('walker');
  const baseOf = (d: Drawn): number => (d === 'walker' ? walkerBase : d.base);
  // A stable sort keeps the walker after anything level with it.
  return order.sort((a, b) => baseOf(a) - baseOf(b));
}

/** The kind a footprint's tiles become. */
export const BLOCKED = 'blocked';

/** The map with every thing's footprint made solid. Things off the map are ignored. */
export function blockFootprints<K extends string>(
  map: TileMap<K>,
  things: readonly Thing[],
): TileMap<K | typeof BLOCKED> {
  const tiles = map.tiles.map((row) => [...row] as (K | typeof BLOCKED)[]);
  for (const thing of things)
    for (const cell of thing.footprint) if (inMap(map, cell)) tiles[cell.row]![cell.col] = BLOCKED;
  return {
    cols: map.cols,
    rows: map.rows,
    tiles,
    kinds: { ...map.kinds, [BLOCKED]: { solid: true } } as TileMap<K | typeof BLOCKED>['kinds'],
    ...(map.tile === undefined ? {} : { tile: map.tile }),
  };
}

const SIDES: readonly [number, number][] = [
  [0, 1],
  [-1, 0],
  [1, 0],
  [0, -1],
];

/** The open tiles a person could stand on to use a thing: its own spots, or those beside its footprint. */
export function spotsBeside(map: TileMap, thing: Thing): Cell[] {
  const own = new Set(thing.footprint.map((c) => `${c.col},${c.row}`));
  const seen = new Set<string>();
  const spots: Cell[] = [];
  const candidates =
    thing.spots ??
    thing.footprint.flatMap((c) => SIDES.map(([dc, dr]) => ({ col: c.col + dc, row: c.row + dr })));
  for (const cell of candidates) {
    const key = `${cell.col},${cell.row}`;
    if (own.has(key) || seen.has(key) || isSolid(map, cell)) continue;
    seen.add(key);
    spots.push(cell);
  }
  return spots;
}

/**
 * Where a walker at `from` should go to use a thing: of the spots beside it,
 * the one it can walk to soonest. Null when none can be reached.
 */
export function approach(map: TileMap, from: Point, thing: Thing): Cell | null {
  return cheapest(map, from, spotsBeside(map, thing));
}

/**
 * The middle of a thing's footprint, across: which way to face it. Something
 * with no footprint (it stands on water, which is solid anyway) is faced by
 * the middle of its tap box.
 */
export function footprintCentreX(thing: Thing, tile = TILE): number {
  const cols = thing.footprint.map((c) => c.col);
  if (cols.length === 0) return thing.tap ? thing.tap.x + thing.tap.w / 2 : 0;
  return ((Math.min(...cols) + Math.max(...cols) + 1) * tile) / 2;
}

/** Whether walking up to a thing does anything. */
export function usable(thing: Thing): boolean {
  return thing.use !== undefined || thing.panelOf !== undefined;
}

/** The thing whose panel opens when the walker reaches `thing`. */
export function panelFor(thing: Thing): string {
  return thing.panelOf ?? thing.id;
}

/** A box grown about its centre to at least `min` art pixels each way. */
export function grown(box: Box, min: number): Box {
  const w = Math.max(box.w, min);
  const h = Math.max(box.h, min);
  return { x: box.x - (w - box.w) / 2, y: box.y - (h - box.h) / 2, w, h };
}

const inside = (box: Box, p: Point): boolean =>
  p.x >= box.x && p.x < box.x + box.w && p.y >= box.y && p.y < box.y + box.h;

/**
 * The thing a tap at `point` picks. A tap inside a thing's own tap box picks
 * it (the front one, where boxes overlap). A tap just outside still picks the
 * nearest thing whose box, grown to `min` art pixels, holds it, so a small
 * barrel is still a target a thumb can hit.
 */
export function thingAt(things: readonly Thing[], point: Point, min = 0): Thing | null {
  let best: Thing | null = null;
  for (const thing of things) {
    if (thing.tap && inside(thing.tap, point) && (!best || thing.base >= best.base)) best = thing;
  }
  if (best) return best;
  let bestDistance = Infinity;
  for (const thing of things) {
    if (!thing.tap) continue;
    const box = grown(thing.tap, min);
    if (!inside(box, point)) continue;
    const distance = Math.hypot(box.x + box.w / 2 - point.x, box.y + box.h / 2 - point.y);
    if (distance < bestDistance) {
      best = thing;
      bestDistance = distance;
    }
  }
  return best;
}

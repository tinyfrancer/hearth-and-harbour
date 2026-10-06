/**
 * The dungeon's art at the C scale (B10a), beside the first scale's doors
 * (dungeonArt.ts), shaped like them so switching is a lookup change: tiles,
 * props and every foe by the same ids, the faces in `portraits2.ts`. Nothing
 * here changes what the first scale's doors give.
 *
 * Pictures are `Picture2`s in the C-scale cells (material and step), so a
 * scene can stamp them into a room's grid, darken the ground under them for
 * contact shadows and light the ground by steps (`lightGround2`), as the
 * town does. They hold the cave's own materials as well as the town's, so
 * rasterize them with a cave palette (`CAVE_DUSK`, as the dungeon is played;
 * `CAVE_DAY` for a menu), never `DUSK2` or `DAY2`.
 *
 * For drawing in a frame, take the sprites (`foeSprite2`,
 * `dungeonPropSprite2`): offscreen canvases at one pixel per art pixel, made
 * once per picture and palette and kept with the town's (`forgetSprites()`
 * frees them). Never rasterize in a frame.
 */
import { mirror, type Picture2 } from './town2/cells';
import { spriteCanvas } from './town2/raster';
import { CAVE_DAY, CAVE_DUSK, type CavePalette } from './dungeon2/cave';
import {
  foe2Frame,
  foe2Frames,
  FOE2_IDS,
  FOE2_POSES,
  GROTTO2_IDS,
  MONSTER2_IDS,
  type Foe2Pose,
} from './dungeon2/cast2';
import { FOE2_SIZES, type Foe2Size } from './dungeon2/sizes';
import { prop2, PROP2_IDS } from './dungeon2/props';
import type { Light2 } from './dungeon2/light';
import {
  isTile2Kind,
  tile2Grid,
  TILE2,
  TILE2_KINDS,
  TILE2_WEARS,
  type Around,
  type Tile2Kind,
  type TileAt,
} from './dungeon2/tiles';

export {
  CAVE_DAY,
  CAVE_DUSK,
  FOE2_IDS,
  FOE2_POSES,
  FOE2_SIZES,
  GROTTO2_IDS,
  MONSTER2_IDS,
  PROP2_IDS,
  TILE2_KINDS,
  TILE2_WEARS,
};
export type { Around, CavePalette, Foe2Pose, Foe2Size, Light2, Tile2Kind, TileAt };
export { GROUND2_SHADOW, forgetTiles2 } from './dungeon2/tiles';
export { roomKinds2, aroundOf } from './dungeon2/room';
export { forgetFoes2 } from './dungeon2/cast2';
export {
  DUNGEON2_LIGHT,
  FUSE_LIGHT2,
  LANTERN_LIGHT2,
  flicker2,
  lightAt,
  lightGround2,
} from './dungeon2/light';

/** A dungeon tile's size at the C scale, in art pixels (`TILE` in the scene is 16 at the first scale). */
export const DUNGEON2_TILE = TILE2;

/** Which way a foe faces. Drawn facing right; left is the exact mirror, feet and glows with it. */
export type Foe2Facing = 'left' | 'right';

/** Mixes a variant number into a wear, so neighbouring cells do not step through wears in order. */
function wearOf(variant: number, wears: number): number {
  const v = Math.floor(Number.isFinite(variant) ? variant : 0);
  let h = Math.imul(v ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) % wears;
}

/**
 * A 24 x 24 tile of Brinebeard's Grotto by kind (the first scale's ten, and
 * `wall_face_high`, the upper half of a wall's face: walls stand two tiles
 * tall), or null for any other kind. `variant` picks which occasional detail
 * it carries (any number; pass the cell's index in the room). `around`, its
 * neighbours' kinds, lets it join them in curves (a shore with foam, sand
 * over rock, the deep's drop, shade under a wall); `at`, its column and row,
 * makes its texture run on from its neighbours' with no seam. Pass both for
 * a room. Kept once made.
 */
export function dungeonTile2(
  kind: string,
  variant = 0,
  around?: Around,
  at?: TileAt,
): Picture2 | null {
  if (!isTile2Kind(kind)) return null;
  return { grid: tile2Grid(kind, wearOf(variant, TILE2_WEARS[kind]), around, at), glows: [] };
}

/** Something standing in a dungeon room. */
export interface PropPicture2 {
  /** Outlined, in cave cells; a lantern's glow is in it, in its own coordinates. */
  readonly picture: Picture2;
  /** The row where it meets the ground: sort standing things by it. */
  readonly base: number;
  /** The middle of its foot on the base row: stand it at (x - foot, y - base). */
  readonly foot: number;
  /** Where something sitting on it stands (the perch's top), from its top-left. */
  readonly seat?: { readonly x: number; readonly y: number };
  /** The light it gives (the lantern's), in its own coordinates: move it with `lightAt`. */
  readonly light?: Light2;
}

const propPics = new Map<string, PropPicture2>();

/** A prop by id (`powder_keg`, `crate`, `lantern`, ...; `PROP2_IDS`), or null. */
export function dungeonProp2(id: string): PropPicture2 | null {
  const p = prop2(id);
  if (!p) return null;
  let made = propPics.get(id);
  if (!made) {
    made = {
      picture: { grid: p.grid, glows: p.glows },
      base: p.base,
      foot: p.foot,
      ...(p.seat ? { seat: p.seat } : {}),
      ...(p.light ? { light: p.light } : {}),
    };
    propPics.set(id, made);
  }
  return made;
}

/** A prop on an offscreen canvas at one pixel per art pixel, kept; null for an unknown id. */
export function dungeonPropSprite2(
  id: string,
  palette: CavePalette = CAVE_DUSK,
): HTMLCanvasElement | null {
  const p = dungeonProp2(id);
  return p ? spriteCanvas(`dungeon2 prop ${id}`, p.picture, palette) : null;
}

/** A foe's frame, with where it stands (the middle of its feet on the ground), from its top-left. */
export interface FoePicture2 {
  readonly picture: Picture2;
  readonly feet: { readonly x: number; readonly y: number };
}

const lefts = new Map<string, FoePicture2>();

/**
 * Any foe by its id (`FOE2_IDS`: the grotto's cast and every monster in the
 * tables), in a pose, facing either way, at a frame of that pose (any whole
 * number; it wraps at `foeFrames2(id)[pose]`); `phase` is the captain's, 1 to
 * 3. Draw it at (x - feet.x, y - feet.y) for a foe standing at (x, y): a
 * frame's size can differ from its standing canvas (a body lying down), its
 * feet never lie. Null for an unknown id or pose. Kept once made.
 */
export function foePicture2(
  id: string,
  pose: Foe2Pose = 'idle',
  facing: Foe2Facing = 'right',
  frame = 0,
  phase = 1,
): FoePicture2 | null {
  const right = foe2Frame(id, pose, frame, phase);
  if (!right || facing !== 'left') return right;
  const key = `${id} ${pose} ${frame} ${phase}`;
  let left = lefts.get(key);
  if (!left) {
    const { grid, glows } = right.picture;
    left = {
      picture: {
        grid: mirror(grid),
        glows: glows.map((g) => ({ ...g, x: grid.w - g.x })),
      },
      feet: { x: grid.w - 1 - right.feet.x, y: right.feet.y },
    };
    lefts.set(key, left);
  }
  return left;
}

/** How many frames each pose of a foe has, or null for an unknown id. */
export const foeFrames2 = (id: string): Readonly<Record<Foe2Pose, number>> | null => foe2Frames(id);

/**
 * A foe's frame on an offscreen canvas at one pixel per art pixel, kept (per
 * id, pose, facing, frame, phase and palette); null for an unknown id. Its
 * feet are `foePicture2`'s for the same ask.
 */
export function foeSprite2(
  id: string,
  pose: Foe2Pose = 'idle',
  facing: Foe2Facing = 'right',
  frame = 0,
  phase = 1,
  palette: CavePalette = CAVE_DUSK,
): HTMLCanvasElement | null {
  const counts = foe2Frames(id);
  if (!counts || !Object.hasOwn(counts, pose)) return null;
  const n = counts[pose];
  const f = ((Math.floor(Number.isFinite(frame) ? frame : 0) % n) + n) % n;
  const ph = id === 'brinebeard' ? Math.max(1, Math.min(3, Math.floor(phase) || 1)) : 1;
  const pic = foePicture2(id, pose, facing, f, ph);
  return pic
    ? spriteCanvas(`dungeon2 foe ${id} ${pose} ${facing} ${f} ${ph}`, pic.picture, palette)
    : null;
}

/** A foe's sizes, as data (`FOE2_SIZES`), or null for an unknown id. */
export const foeSize2 = (id: string): Foe2Size | null =>
  Object.hasOwn(FOE2_SIZES, id) ? FOE2_SIZES[id]! : null;

/** The cave palette for a time of day: dusk in a run, day in the menus. */
export const cavePalette2 = (time: 'day' | 'dusk'): CavePalette =>
  time === 'day' ? CAVE_DAY : CAVE_DUSK;

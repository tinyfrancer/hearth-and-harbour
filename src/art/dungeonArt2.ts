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
import {
  burrowNight,
  BURROW_DARK_BANDS,
  BURROW_NIGHT_LEVELS,
  CAVE_BURROW,
  CAVE_BURROW_DARK,
  CAVE_DAY,
  CAVE_DUSK,
  CAVE_TIDEPOOL,
  NIGHT,
  NIGHT_EXEMPT,
  nightRgb,
  type CavePalette,
} from './dungeon2/cave';
import { DUNGEON2_THEMES, isDungeon2Theme, type Dungeon2Theme } from './dungeon2/theme';
import { lightGround2 } from './dungeon2/light';
import { burrowFungusGlows } from './dungeon2/burrow';
import {
  BURROW_PROPS,
  postLanternProp,
  postLanternShines,
  POST_LANTERN2_FRAMES,
  POST_LANTERN2_FRAME_MS,
  POST_LANTERN2_LIGHT,
  type PostLanternState,
} from './dungeon2/burrowProps';
export {
  BURROW_ERUPTION2_FRAMES,
  BURROW_ERUPTION2_FRAME_MS,
  BURROW_MOUND2_FRAMES,
  burrowEruption as burrowEruption2,
  burrowMound as burrowMound2,
  HERO_LIGHT2,
  SPORE_CLOUD2_FRAMES,
  SPORE_CLOUD2_FRAME_MS,
  sporeCloud as sporeCloud2,
  type BurrowPiece2,
} from './dungeon2/burrowPieces';
export { POST_LANTERN2_FRAMES, POST_LANTERN2_FRAME_MS, POST_LANTERN2_LIGHT, postLanternShines };
export type { PostLanternState };
import type { TGrid } from './town2/cells';
import {
  foe2Frame,
  foe2Frames,
  FOE2_IDS,
  FOE2_POSES,
  BURROW2_IDS,
  GROTTO2_IDS,
  PHASED2_IDS,
  MONSTER2_IDS,
  TIER2_MONSTER2_IDS,
  TIDEPOOL2_IDS,
  type Foe2Pose,
} from './dungeon2/cast2';
import { TIDEPOOL2_PROP_IDS } from './dungeon2/tideProps';
import { FOE2_SIZES, type Foe2Size } from './dungeon2/sizes';
import { prop2, PROP2_IDS } from './dungeon2/props';
import { BURROW_SPECIALS, burrowSpecialFrame } from './dungeon2/burrowCast';
import {
  DOOR2_FOOTPRINTS,
  footprint2,
  isDoorKind2,
  placeDoor2,
  type DoorFootprint2,
  type DoorKind2,
} from './dungeon2/doors';
import type { Light2 } from './dungeon2/light';
import {
  isTile2Kind,
  roomIsWest,
  tile2Grid,
  TILE2,
  TILE2_KINDS,
  TILE2_WEARS,
  type Around,
  type Tile2Kind,
  type TileAt,
} from './dungeon2/tiles';

export {
  BURROW2_IDS,
  burrowNight,
  BURROW_DARK_BANDS,
  BURROW_NIGHT_LEVELS,
  CAVE_BURROW,
  CAVE_BURROW_DARK,
  NIGHT,
  NIGHT_EXEMPT,
  nightRgb,
  CAVE_DAY,
  CAVE_DUSK,
  CAVE_TIDEPOOL,
  DUNGEON2_THEMES,
  TIDEPOOL2_IDS,
  TIDEPOOL2_PROP_IDS,
  FOE2_IDS,
  FOE2_POSES,
  FOE2_SIZES,
  GROTTO2_IDS,
  MONSTER2_IDS,
  TIER2_MONSTER2_IDS,
  PROP2_IDS,
  TILE2_KINDS,
  TILE2_WEARS,
};
export type { Around, CavePalette, Dungeon2Theme, Foe2Pose, Foe2Size, Light2, Tile2Kind, TileAt };
export { GROUND2_SHADOW, forgetTiles2 } from './dungeon2/tiles';
export { roomKinds2, aroundOf } from './dungeon2/room';
export { forgetFoes2 } from './dungeon2/cast2';
export {
  BURROW2_LIGHT,
  FUNGUS2_RGB,
  burrowLevel2,
  DUNGEON2_LIGHT,
  FUSE_LIGHT2,
  LANTERN_LIGHT2,
  SHAFT_LIGHT2,
  TIDEPOOL2_LIGHT,
  flicker2,
  lightAt,
} from './dungeon2/light';
export { lightGround2 };

/**
 * B20: the Burrow's props, by id (also in `PROP2_IDS`): the lantern on a post
 * burning and out, lane C's six floor props, the whole throne, and what makes
 * the warren lived in.
 */
export const BURROW2_PROP_IDS: readonly string[] = Object.keys(BURROW_PROPS);

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
 * a room. Kept once made. `theme` (B15, `DUNGEON2_THEMES`) draws the same
 * kind in another cave's look (`'tidepool'`); left out, the grotto's.
 */
export function dungeonTile2(
  kind: string,
  variant = 0,
  around?: Around,
  at?: TileAt,
  theme: Dungeon2Theme = 'grotto',
): Picture2 | null {
  if (!isTile2Kind(kind)) return null;
  const t = isDungeon2Theme(theme) ? theme : 'grotto';
  const grid = tile2Grid(kind, wearOf(variant, TILE2_WEARS[kind]), around, at, t);
  // B20: the Burrow's face carries its glowing fungus's light (only with its cell, where the fungus is).
  const glows = t === 'burrow' && at ? burrowFungusGlows(kind, Math.floor(at.col) * TILE2) : [];
  return { grid, glows };
}

/**
 * A door as the way onward (B13): a piece three tiles tall over the door's
 * cell and its neighbours, so it stands a figure high. Draw it after the
 * room's tiles (it covers the cells in `covers`) and before anything
 * standing: at the door cell's top-left plus (`dx`, `dy`). An open door
 * carries its lanterns' glows and the light from beyond (`light`, in the
 * piece's own coordinates: move it with `lightAt` and light the room's floor
 * with it, as a lantern's). The single tile by the same id is the piece's
 * slice over the door's own cell.
 */
export interface DoorPiece2Picture {
  readonly picture: Picture2;
  readonly dx: number;
  readonly dy: number;
  /** The cells it covers, as (col, row) from the door's cell. */
  readonly covers: readonly (readonly [number, number])[];
  readonly light?: Light2;
}

export type { DoorKind2, DoorFootprint2 };
export { DOOR2_FOOTPRINTS, footprint2 as doorFootprint2 };

const doorPieces = new Map<string, DoorPiece2Picture>();

/**
 * The door piece for a door tile's id (`door_open`, `door_barred`,
 * `door_side_open`, `door_side_barred`), or null for any other kind.
 * `around` turns a side door to the room (as `dungeonTile2`); `at`, the door
 * cell's column and row, runs the rock on from its neighbours'. `theme` (B15)
 * draws it in another cave's look on the same footprint. Kept once made.
 */
export function dungeonDoor2(
  kind: string,
  around?: Around,
  at?: TileAt,
  theme: Dungeon2Theme = 'grotto',
): DoorPiece2Picture | null {
  if (!isDoorKind2(kind)) return null;
  const t = isDungeon2Theme(theme) ? theme : 'grotto';
  const west = roomIsWest(around);
  const col = at ? Math.floor(at.col) : 1000;
  const row = at ? Math.floor(at.row) : 1000;
  const key = `${t} ${kind} ${west} ${col} ${row}`;
  let made = doorPieces.get(key);
  if (made) return made;
  const f = footprint2(kind, west);
  const { piece } = placeDoor2(kind, west, col, row, t);
  const covers: [number, number][] = [];
  for (let r = 0; r < f.rows; r++)
    for (let c = 0; c < f.cols; c++) covers.push([c - f.door[0], r - f.door[1]]);
  made = {
    picture: { grid: piece.grid, glows: piece.glows },
    dx: f.door[0] ? -f.door[0] * TILE2 : 0,
    dy: f.door[1] ? -f.door[1] * TILE2 : 0,
    covers,
    ...(piece.light ? { light: piece.light } : {}),
  };
  doorPieces.set(key, made);
  return made;
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

/** B20: what a lantern on a post can be doing, in the order a lantern goes through them. */
export const POST_LANTERN2_STATES: readonly PostLanternState[] = [
  'out',
  'lighting',
  'lit',
  'snuffed',
];

const lanternFrames = new Map<string, PropPicture2>();

/**
 * B20: a lantern on a post in a state (`POST_LANTERN2_STATES`) at a frame
 * (any whole number; it wraps at `POST_LANTERN2_FRAMES[state]`): out, being
 * lit (a spark, the flame catching; it shines from its third frame), burning
 * (the flame wavering) or snuffed (a wisp of smoke from its cap). Every frame
 * has `post_lantern`'s canvas, base and foot, so a state changes in place;
 * its glows and light only while it shines (`postLanternShines`). `lit` 0 is
 * `post_lantern` and `out` is `post_lantern_out`. Kept once made.
 */
export function postLanternFrame2(state: PostLanternState, frame = 0): PropPicture2 {
  const s: PostLanternState = POST_LANTERN2_STATES.includes(state) ? state : 'out';
  const n = POST_LANTERN2_FRAMES[s];
  const f = ((Math.floor(Number.isFinite(frame) ? frame : 0) % n) + n) % n;
  const key = `${s} ${f}`;
  let made = lanternFrames.get(key);
  if (!made) {
    const p = postLanternProp(s, f);
    // The outline adds a pixel on every side, as every prop's (props.ts).
    made = {
      picture: { grid: p.grid, glows: p.glows.map((g) => ({ ...g, x: g.x + 1, y: g.y + 1 })) },
      base: p.base,
      foot: (p.foot ?? Math.floor(p.grid.w / 2)) + 1,
      ...(p.light ? { light: { ...p.light, x: p.light.x + 1, y: p.light.y + 1 } } : {}),
    };
    lanternFrames.set(key, made);
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
  const ph = PHASED2_IDS.includes(id) ? Math.max(1, Math.min(3, Math.floor(phase) || 1)) : 1;
  const pic = foePicture2(id, pose, facing, f, ph);
  return pic
    ? spriteCanvas(`dungeon2 foe ${id} ${pose} ${facing} ${f} ${ph}`, pic.picture, palette)
    : null;
}

/* ----- B20: the moves beyond the common poses ----- */

/**
 * B20: each foe's special moves and how many frames each has, by id (the
 * Burrow's cast): the puff's `swell` and `burst`; the guard's `block` and
 * `turn`; the hound's `crouch`, `charge` and `stuck`; the moth's `hover` and
 * `snuff`. A foe with none is absent.
 */
export const FOE2_SPECIALS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  ...Object.fromEntries(
    Object.entries(BURROW_SPECIALS).map(([id, s]) => [
      id,
      Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v.length])),
    ]),
  ),
};

const specials = new Map<string, FoePicture2>();

/**
 * B20: a foe's special move (`FOE2_SPECIALS`) in a facing, at a frame (any
 * whole number; it wraps), the king in his phase (1 to 3). Its feet are where
 * it stands, as `foePicture2`'s. Null for an unknown id or move. Kept.
 */
export function foeSpecial2(
  id: string,
  special: string,
  facing: Foe2Facing = 'right',
  frame = 0,
  phase = 1,
): FoePicture2 | null {
  const moves = Object.hasOwn(FOE2_SPECIALS, id) ? FOE2_SPECIALS[id]! : {};
  const n = Object.hasOwn(moves, special) ? moves[special] : undefined;
  if (!n) return null;
  const f = ((Math.floor(Number.isFinite(frame) ? frame : 0) % n) + n) % n;
  const ph = PHASED2_IDS.includes(id) ? Math.max(1, Math.min(3, Math.floor(phase) || 1)) : 1;
  const key = `${id} ${special} ${facing} ${f} ${ph}`;
  let made = specials.get(key);
  if (made) return made;
  const right = burrowSpecialFrame(id, special, f);
  if (!right) return null;
  const grid = edgedSpecial(right.grid);
  made =
    facing === 'left'
      ? {
          picture: { grid: mirror(grid), glows: [] },
          feet: { x: grid.w - 1 - right.feet.x, y: right.feet.y },
        }
      : { picture: { grid, glows: [] }, feet: right.feet };
  specials.set(key, made);
  return made;
}

/** A special on an offscreen canvas at one pixel per art pixel, kept; null as `foeSpecial2`. */
export function foeSpecialSprite2(
  id: string,
  special: string,
  facing: Foe2Facing = 'right',
  frame = 0,
  phase = 1,
  palette: CavePalette = CAVE_DUSK,
): HTMLCanvasElement | null {
  const pic = foeSpecial2(id, special, facing, frame, phase);
  if (!pic) return null;
  const n = FOE2_SPECIALS[id]![special]!;
  const f = ((Math.floor(Number.isFinite(frame) ? frame : 0) % n) + n) % n;
  const ph = PHASED2_IDS.includes(id) ? Math.max(1, Math.min(3, Math.floor(phase) || 1)) : 1;
  return spriteCanvas(
    `dungeon2 special ${id} ${special} ${facing} ${f} ${ph}`,
    pic.picture,
    palette,
  );
}

/** Anything on a special's canvas edge ends in its outline there, as every frame's does (cast2.ts). */
function edgedSpecial(g: TGrid): TGrid {
  const d = g.d.slice();
  const line = (i: number) => {
    const c = d[i]!;
    if (c && (c & 7) !== 6) d[i] = (c & ~7) | 6;
  };
  for (let x = 0; x < g.w; x++) {
    line(x);
    line((g.h - 1) * g.w + x);
  }
  for (let y = 0; y < g.h; y++) {
    line(y * g.w);
    line(y * g.w + g.w - 1);
  }
  return { w: g.w, h: g.h, d };
}

/** A foe's sizes, as data (`FOE2_SIZES`), or null for an unknown id. */
export const foeSize2 = (id: string): Foe2Size | null =>
  Object.hasOwn(FOE2_SIZES, id) ? FOE2_SIZES[id]! : null;

/** The cave palette for a time of day: dusk in a run, day in the menus. */
export const cavePalette2 = (time: 'day' | 'dusk'): CavePalette =>
  time === 'day' ? CAVE_DAY : CAVE_DUSK;

/**
 * A dungeon's doors bound to its theme (B15): the same functions as the
 * module's, with `theme` filled in, its palette, and the time of day its
 * figures are drawn in. Nothing here differs from calling the functions
 * with a trailing `theme` and the palette by hand; it saves passing them.
 *
 * ```ts
 * const art = dungeonTheme2('tidepool');
 * art.tile(kind, cellIndex, aroundOf(kinds, col, row), { col, row });
 * art.lightGround(ground, lights);
 * rasterize2(pic, art.palette, 1);
 * characterSprite2(look, worn, art.figureTime);
 * ```
 */
export interface DungeonTheme2 {
  readonly theme: Dungeon2Theme;
  /** Rasterize the room and everything in it with this: `CAVE_DUSK` or `CAVE_TIDEPOOL`. */
  readonly palette: CavePalette;
  /** The hero's time of day to match the palette (`characterSprite2(look, worn, figureTime)`). */
  readonly figureTime: 'day' | 'dusk';
  /** The prop ids made for this cave (any prop id still draws in any cave). */
  readonly propIds: readonly string[];
  /** The foe ids of this cave's cast. */
  readonly castIds: readonly string[];
  tile(kind: string, variant?: number, around?: Around, at?: TileAt): Picture2 | null;
  door(kind: string, around?: Around, at?: TileAt): DoorPiece2Picture | null;
  prop(id: string): PropPicture2 | null;
  propSprite(id: string): HTMLCanvasElement | null;
  lightGround(ground: TGrid, lights: readonly Light2[]): TGrid;
  foeSprite(
    id: string,
    pose?: Foe2Pose,
    facing?: Foe2Facing,
    frame?: number,
    phase?: number,
  ): HTMLCanvasElement | null;
}

const themes = new Map<Dungeon2Theme, DungeonTheme2>();

/** The doors bound to a theme; an unknown theme is the grotto. Kept once made. */
export function dungeonTheme2(theme: Dungeon2Theme | string = 'grotto'): DungeonTheme2 {
  const t: Dungeon2Theme = isDungeon2Theme(theme) ? theme : 'grotto';
  let made = themes.get(t);
  if (made) return made;
  const palette = t === 'tidepool' ? CAVE_TIDEPOOL : t === 'burrow' ? CAVE_BURROW : CAVE_DUSK;
  made = {
    theme: t,
    palette,
    figureTime: t === 'tidepool' ? 'day' : 'dusk',
    propIds:
      t === 'tidepool'
        ? TIDEPOOL2_PROP_IDS
        : t === 'burrow'
          ? BURROW2_PROP_IDS
          : PROP2_IDS.filter(
              (id) => !TIDEPOOL2_PROP_IDS.includes(id) && !BURROW2_PROP_IDS.includes(id),
            ),
    castIds: t === 'tidepool' ? TIDEPOOL2_IDS : t === 'burrow' ? BURROW2_IDS : GROTTO2_IDS,
    tile: (kind, variant = 0, around, at) => dungeonTile2(kind, variant, around, at, t),
    door: (kind, around, at) => dungeonDoor2(kind, around, at, t),
    prop: (id) => dungeonProp2(id),
    propSprite: (id) => dungeonPropSprite2(id, palette),
    lightGround: (ground, lights) => lightGround2(ground, lights, t),
    foeSprite: (id, pose = 'idle', facing = 'right', frame = 0, phase = 1) =>
      foeSprite2(id, pose, facing, frame, phase, palette),
  };
  themes.set(t, made);
  return made;
}

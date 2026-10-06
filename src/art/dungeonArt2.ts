/**
 * The dungeon's art at the C scale, beside the first scale's doors
 * (dungeonArt.ts, portraits.ts), shaped like them so switching is a lookup
 * change: tiles, props and the cast by the same ids, faces by the same ids,
 * plus the hero's own portrait. Pictures are `Picture2`s in the C-scale
 * town's cells (material and step), so a scene can stamp them into a room's
 * grid and darken the ground under them for contact shadows, as in town.
 *
 * For a scene, take the sprites (`foeSprite2`, `dungeonPropSprite2`): offscreen
 * canvases at one pixel per art pixel, made once per picture and palette and
 * kept with the town's (`forgetSprites()` frees them). The dungeon is always
 * dusk: pass `DUSK2`.
 */
import type { Look } from './character';
import { DEFAULT_LOOK } from './character';
import { ITEM_LAYERS2 } from './character2';
import { WARDROBE2 } from './figure2/dress';
import { HAIR_COLOUR2, SKIN2 } from './figure2/look';
import type { Picture2 } from './town2/cells';
import { pixelCanvas2, spriteCanvas } from './town2/raster';
import { DAY2, type Palette2 } from './town2/ramps';
import {
  foe2Frame,
  foe2Frames,
  FOE2_IDS,
  FOE2_POSES,
  MONSTER2_IDS,
  type Foe2Pose,
} from './dungeon2/cast2';
import { prop2, PROP2_IDS } from './dungeon2/props';
import {
  heroBustPicture,
  PORTRAIT2_IDS,
  PORTRAIT2_SAFE,
  PORTRAIT2_SIZE,
  portraitPicture2,
  type HeroBust,
} from './dungeon2/portraits2';
import {
  isTile2Kind,
  tile2Grid,
  TILE2,
  TILE2_KINDS,
  TILE2_WEARS,
  type Around,
  type TileAt,
} from './dungeon2/tiles';

export {
  FOE2_IDS,
  FOE2_POSES,
  MONSTER2_IDS,
  PROP2_IDS,
  PORTRAIT2_IDS,
  PORTRAIT2_SAFE,
  PORTRAIT2_SIZE,
  TILE2_KINDS,
  TILE2_WEARS,
};
export type { Around, TileAt, Foe2Pose };
export { GROUND2_SHADOW, forgetTiles2 } from './dungeon2/tiles';
export { roomKinds2, aroundOf } from './dungeon2/room';
export { forgetFoes2 } from './dungeon2/cast2';

/** A dungeon tile's size at the C scale, in art pixels. */
export const DUNGEON2_TILE = TILE2;

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
 * A 24 x 24 tile for a dungeon by theme and kind (the first scale's ten and
 * `wall_face_high`, the upper half of a wall's face), or null. `variant` picks
 * which occasional detail it carries; `around` (its neighbours' kinds) lets it
 * join them, a curving shore, sand drifting over rock, shade under walls; `at`
 * (its column and row) makes its texture run on from its neighbours' with no
 * seam, so pass both for a room's floor. Kept once made.
 */
export function dungeonTile2(
  theme: string,
  kind: string,
  variant = 0,
  around?: Around,
  at?: TileAt,
): Picture2 | null {
  if (theme !== 'grotto' || !isTile2Kind(kind)) return null;
  return { grid: tile2Grid(kind, wearOf(variant, TILE2_WEARS[kind]), around, at), glows: [] };
}

/** Something standing in a dungeon room, with the row it meets the ground on. */
export interface PropPicture2 {
  readonly picture: Picture2;
  /** The row where it meets the ground: sort standing things by it. */
  readonly base: number;
  /** The middle of its foot on the base row. */
  readonly foot: number;
  /** Where something sitting on it stands (the perch's top), from its top-left. */
  readonly seat?: { readonly x: number; readonly y: number };
}

const propPics = new Map<string, PropPicture2>();

/** A prop by theme and id (`grotto`, `powder_keg`), or null. Its glows (the lantern's) are in its own coordinates. */
export function dungeonProp2(theme: string, id: string): PropPicture2 | null {
  if (theme !== 'grotto') return null;
  const p = prop2(id);
  if (!p) return null;
  let made = propPics.get(id);
  if (!made) {
    made = {
      picture: { grid: p.grid, glows: p.glows },
      base: p.base,
      foot: p.foot,
      ...(p.seat ? { seat: p.seat } : {}),
    };
    propPics.set(id, made);
  }
  return made;
}

/** A prop on an offscreen canvas at one pixel per art pixel, kept; null for an unknown id. */
export function dungeonPropSprite2(
  theme: string,
  id: string,
  palette: Palette2,
): HTMLCanvasElement | null {
  const p = dungeonProp2(theme, id);
  return p ? spriteCanvas(`prop2 ${id}`, p.picture, palette) : null;
}

/** A foe's picture facing right, with where its feet stand (the anchor) from its top-left. */
export interface FoePicture2 {
  readonly picture: Picture2;
  readonly feet: { readonly x: number; readonly y: number };
}

/**
 * A foe's sprite by its id (the same ids as `foePicture`), facing right
 * (mirror for left: the feet's x becomes `w - 1 - x`), in a pose and frame;
 * `phase` is the captain's (1 to 3). Null for an id with none.
 */
export function foePicture2(
  id: string,
  pose: Foe2Pose = 'idle',
  frame = 0,
  phase = 1,
): FoePicture2 | null {
  if (!FOE2_IDS.includes(id)) return null;
  return foe2Frame(id, pose, frame, phase);
}

/** How many frames each pose of a foe has, or null. */
export const foeFrames2 = (id: string): Readonly<Record<Foe2Pose, number>> | null =>
  FOE2_IDS.includes(id) || MONSTER2_IDS.includes(id) ? foe2Frames(id) : null;

/** A foe's frame on an offscreen canvas at one pixel per art pixel, kept; null for an unknown id. */
export function foeSprite2(
  id: string,
  palette: Palette2,
  pose: Foe2Pose = 'idle',
  frame = 0,
  phase = 1,
): HTMLCanvasElement | null {
  const counts = foeFrames2(id);
  const f = counts ? foe2Frame(id, pose, frame, phase) : null;
  if (!f || !counts) return null;
  const n = counts[pose];
  const k = ((Math.floor(frame) % n) + n) % n;
  return spriteCanvas(
    `foe2 ${id} ${pose} ${k} ${id === 'brinebeard' ? phase : 1}`,
    f.picture,
    palette,
  );
}

/**
 * A monster from the idle game's tables as a C-scale picture (the Combat
 * screen's, the bestiary's): standing, facing right. Every monster in the
 * tables, the two bounty-only ones included; null for any other id. Any pose
 * the cast has can be asked for too.
 */
export function monsterPicture2(
  id: string,
  pose: Foe2Pose = 'idle',
  frame = 0,
): FoePicture2 | null {
  if (!MONSTER2_IDS.includes(id)) return null;
  return foe2Frame(id, pose, frame);
}

/* ------------------------------------------------------------------ faces */

/**
 * Device pixels per art pixel for the three frames a portrait is shown in:
 * the fight screen's (2 CSS pixels per art pixel, 144), its lists' (4/3, 96)
 * and the dungeon's panels' (2/3, 48), rounded down to whole device pixels so
 * a face never outgrows its frame: 6, 4 and 2 on a 3x phone.
 */
export function portraitScales2(dpr: number): { large: number; small: number; mini: number } {
  return {
    large: Math.max(1, Math.floor(2 * dpr + 1e-9)),
    small: Math.max(1, Math.floor((4 / 3) * dpr + 1e-9)),
    mini: Math.max(1, Math.floor((2 / 3) * dpr + 1e-9)),
  };
}

/** The portrait as an element: three canvases, and `art.css` shows the one that fits its frame. */
function portraitElement(pic: Picture2, label?: string): HTMLElement {
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const scales = portraitScales2(dpr);
  const el = document.createElement('div');
  el.className = 'portrait2-art';
  if (label) {
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', label);
  }
  for (const size of ['large', 'small', 'mini'] as const) {
    const canvas = pixelCanvas2(pic, DAY2, scales[size], dpr);
    canvas.classList.add(`portrait2-${size}`);
    el.append(canvas);
  }
  return el;
}

/** A face by id, as an element that fills whatever frame it is put in; null for an id with none. */
export function portrait2(id: string): Element | null {
  const pic = portraitPicture2(id);
  return pic ? portraitElement(pic) : null;
}

const slotOf = (gearId: string): string | undefined =>
  WARDROBE2.gear.find((g) => g.id === gearId)?.slot;

/** What the hero's portrait shows for a look and worn items (by the game's own ids). */
export function heroBust2(look: Partial<Look>, wornItemIds: readonly string[]): HeroBust {
  const safe: Look = { ...DEFAULT_LOOK, ...look };
  const gear = wornItemIds.map((id) => ITEM_LAYERS2[id]).filter((g): g is string => !!g);
  const inSlot = (slot: string) => gear.find((g) => slotOf(g) === slot) ?? null;
  const style =
    (['short', 'long', 'braid', 'shaggy', 'bald'] as const).find((s) => s === safe.hair) ?? 'short';
  return {
    skin: SKIN2[safe.skin] ?? 'skin',
    hair: HAIR_COLOUR2[safe.hairColour] ?? 'hair',
    style,
    head: inSlot('head'),
    body: inSlot('body'),
    neck: inSlot('neck'),
  };
}

const heroPics = new Map<string, Picture2>();

/** The hero's portrait as a picture, in the look and the head gear and clothes worn; kept per look and outfit. */
export function heroPortraitPicture2(
  look: Partial<Look>,
  wornItemIds: readonly string[],
): Picture2 {
  const bust = heroBust2(look, wornItemIds);
  const key = JSON.stringify(bust);
  let pic = heroPics.get(key);
  if (!pic) {
    pic = heroBustPicture(bust);
    heroPics.set(key, pic);
  }
  return pic;
}

/** The hero's portrait as an element, like `portrait2`; never null. */
export function heroPortrait2(look: Partial<Look>, wornItemIds: readonly string[]): Element {
  return portraitElement(heroPortraitPicture2(look, wornItemIds), 'Your character');
}

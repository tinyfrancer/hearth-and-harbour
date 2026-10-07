/**
 * Faces at the C scale (B10a), beside the first scale's (portraits.ts): every
 * face `portrait(id)` gives, the two bounty-only monsters it never had, the
 * town's four villagers, and the hero's own in the look and head gear worn.
 * Nothing here changes what `portrait` gives.
 *
 * A portrait is 72 x 72 art pixels (`PORTRAIT2_SIZE`): a bust on a dark disc,
 * the head about three times the figures' H2 head, drawn at this size, never
 * scaled. The game shows faces in three square frames (the fight screen's
 * 144 CSS pixels inside its border, its lists' 96 and the dungeon's panel's
 * 48), so the element carries the face at 2, 4/3 and 2/3 CSS pixels per art
 * pixel (6, 4 and 2 device pixels on a 3x phone), and `portraits2.css` shows
 * whichever fits the frame whole. A face is never cropped: the whole square
 * shows in every frame. The first scale's 48-pixel face in the dungeon's
 * 48-pixel panel showed its 96-pixel canvas and lost hats and chins.
 *
 * Each face also declares a safe box (`PORTRAIT2_SAFE`): everything that
 * names it (face, hat, ears, horns, whiskers) is inside it, so a frame that
 * must crop (a round one, a short one) can crop to it and lose nothing.
 */
import './dungeon2/portraits2.css';
import type { Look } from './character';
import { DEFAULT_LOOK } from './character';
import { ITEM_LAYERS2 } from './character2';
import { WARDROBE2 } from './figure2/dress';
import { HAIR_COLOUR2, SKIN2 } from './figure2/look';
import type { Picture2 } from './town2/cells';
import { pixelCanvas2 } from './town2/raster';
import { CAVE_DAY } from './dungeon2/cave';
import {
  heroBustPicture,
  PORTRAIT2_IDS,
  PORTRAIT2_SIZE,
  portraitPicture2,
  type HeroBust,
} from './dungeon2/faces2';
import { HERO_PORTRAIT2_SAFE, PORTRAIT2_SAFE, type Box2 } from './dungeon2/safe';

export { PORTRAIT2_IDS, PORTRAIT2_SIZE, PORTRAIT2_SAFE, HERO_PORTRAIT2_SAFE, portraitPicture2 };
export type { Box2, HeroBust };

/**
 * Device pixels per art pixel for the three frames: the fight screen's (2 CSS
 * pixels per art pixel, 144), its lists' (4/3, 96) and the dungeon's panel's
 * (2/3, 48), rounded down to whole device pixels so a face never outgrows
 * its frame: 6, 4 and 2 on a 3x phone, 4, 2 and 1 on a 2x one.
 */
export function portraitScales2(dpr: number): { large: number; small: number; mini: number } {
  return {
    large: Math.max(1, Math.floor(2 * dpr + 1e-9)),
    small: Math.max(1, Math.floor((4 / 3) * dpr + 1e-9)),
    mini: Math.max(1, Math.floor((2 / 3) * dpr + 1e-9)),
  };
}

/** The portrait as an element: three canvases, and `portraits2.css` shows the one that fits its frame. */
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
    const canvas = pixelCanvas2(pic, CAVE_DAY, scales[size], dpr);
    canvas.classList.add(`portrait2-${size}`);
    el.append(canvas);
  }
  return el;
}

/**
 * A face by id (`PORTRAIT2_IDS`: every id `portrait` serves, `goblin_poacher`,
 * `bramble_wyrm` and the villagers), as an element that fills whatever square
 * frame it is put in; null for an id with none. Drawn by daylight: the menus
 * have no dusk.
 */
export function portrait2(id: string): Element | null {
  const pic = portraitPicture2(id);
  return pic ? portraitElement(pic) : null;
}

const slotOf = (gearId: string): string | undefined =>
  WARDROBE2.gear.find((g) => g.id === gearId)?.slot;

/** What the hero's portrait shows for a look and worn items (the game's own ids). */
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
    shirt: inSlot('shirt'),
  };
}

const heroPics = new Map<string, Picture2>();

/**
 * The hero's portrait as a picture, in the look (skin, hair and its colour)
 * and the head gear and clothes worn; unknown looks fall back to the
 * default, unknown items are ignored, never throws. Kept per look and outfit.
 */
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

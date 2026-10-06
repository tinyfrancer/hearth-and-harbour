/**
 * The door to the figures at the C scale (src/art/figure2/), beside the
 * current one (character.ts), shaped like it so switching is a lookup change:
 * the game says how the character looks and which items they wear, by its own
 * ids, and art answers with a picture; the townsfolk answer to the ids the
 * town uses today. Nothing the live game reads changed.
 *
 * Pictures are `Picture2`s (town2/cells.ts), so a figure can be stamped into
 * the C-scale town's own grid. For a scene, take the sprite (`characterSprite2`,
 * `townsfolkSprite2`): an offscreen canvas at one pixel per art pixel, drawn
 * once per look, outfit and time of day and kept, to be drawn with `drawImage`
 * at the scene's scale and never rasterized in a frame.
 */
import { DEFAULT_LOOK, LOOK_CHOICES, type Look } from './character';
import type { Picture2, TGrid } from './town2/cells';
import { mirror } from './town2/cells';
import { pixelCanvas2, spriteCanvas } from './town2/raster';
import { DAY2, paletteFor, type TimeOfDay } from './town2/ramps';
import { town2Scale } from './town2/scale';
import { FIG_H, FIG_W, AXIS, SOLE } from './figure2/body';
import { figure2, WARDROBE2 } from './figure2/dress';
import { recolour } from './figure2/engine';
import { FOLK2, folkGrid } from './figure2/folk';
import { HAIRSTYLES2 } from './figure2/hair';
import { lookSwap } from './figure2/look';

/** The figure canvas: 56 x 72 art pixels, outline included. */
export const FIGURE2_W = FIG_W;
export const FIGURE2_H = FIG_H;
/** Where a figure stands: the middle of its soles, from the canvas's top-left. */
export const FIGURE2_ANCHOR_X = AXIS;
export const FIGURE2_SOLE_Y = SOLE;

/** The same choices as the current character: the creator needs no change. */
export const LOOK_CHOICES2 = LOOK_CHOICES;

/**
 * The gear each wearable item is drawn with at the C scale. Every wearable
 * in the item tables has one; several items may share one (both arrows are a
 * quiver).
 */
export const ITEM_LAYERS2: Readonly<Record<string, string>> = {
  bronze_sword: 'bronze_shortsword',
  iron_sword: 'iron_arming_sword',
  bronze_axe: 'bronze_hatchet',
  iron_axe: 'iron_bearded_axe',
  bronze_helmet: 'bronze_cap',
  iron_helmet: 'iron_nasal_helm',
  bronze_shield: 'bronze_buckler',
  iron_shield: 'iron_heater_shield',
  bronze_breastplate: 'bronze_jerkin',
  iron_breastplate: 'iron_mail',
  linen_tunic: 'linen_tunic',
  linen_hood: 'linen_hood',
  linen_trousers: 'linen_trousers',
  shell_necklace: 'shell_necklace',
  shell_bracelet: 'shell_bracelet',
  pine_shortbow: 'pine_shortbow',
  oak_shortbow: 'oak_shortbow',
  willow_shortbow: 'willow_shortbow',
  bronze_arrows: 'arrow_quiver',
  iron_arrows: 'arrow_quiver',
  leather_jerkin: 'leather_jerkin',
  leather_cap: 'leather_cap',
  leather_bracers: 'leather_bracers',
  cudgel: 'cudgel',
  smugglers_cutlass: 'smugglers_cutlass',
  trollstone: 'trollstone',
  poachers_longbow: 'poachers_longbow',
  wyrmscale_shield: 'wyrmscale_shield',
  barbed_arrows: 'barbed_quiver',
  hunters_charm: 'hunters_charm',
  feathered_hat: 'feathered_hat',
  pirate_cutlass: 'pirates_cutlass',
  boarding_axe: 'boarding_axe',
  tricorn: 'tricorn',
  captains_coat: 'captains_coat',
  spyglass: 'spyglass',
  brinebeards_anchor: 'brinebeards_anchor',
  velvet_cap: 'velvet_cap',
};

/**
 * Tier 2's knight, by gear id: drawn, waiting for tier 2's items. When lane A
 * adds them, each item id gets a row in `ITEM_LAYERS2` pointing at one of these.
 */
export const KNIGHT_GEAR2: readonly string[] = [
  'knight_plate',
  'knight_knees',
  'red_cloak',
  'kite_shield',
  'knight_sword',
];

/** What everyone has on under their gear: the tunic, trousers, boots and belt, unless replaced. */
const EVERYDAY: readonly string[] = [
  'teal_tunic',
  'grey_trousers',
  'leather_boots',
  'leather_belt',
];

const slotOf = (gearId: string): string | undefined =>
  WARDROBE2.gear.find((g) => g.id === gearId)?.slot;

/**
 * The gear ids for a look and worn items, one per slot, worn items first,
 * then the hair (only what hangs, under head gear), then the everyday clothes.
 * `extra` gear ids (the knight's) are worn as if they were items.
 */
export function characterGear2(
  look: Partial<Look>,
  wornItemIds: readonly string[],
  extra: readonly string[] = [],
): string[] {
  const slots = new Set<string>();
  const gear: string[] = [];
  const wear = (id: string | null | undefined) => {
    if (!id) return;
    const slot = slotOf(id);
    if (!slot || slots.has(slot)) return;
    slots.add(slot);
    gear.push(id);
  };
  for (const id of wornItemIds) wear(ITEM_LAYERS2[id]);
  for (const id of extra) wear(id);
  const style = HAIRSTYLES2[look.hair ?? ''] ?? HAIRSTYLES2[DEFAULT_LOOK.hair]!;
  wear(slots.has('head') ? style.under : style.gear);
  for (const id of EVERYDAY) wear(id);
  return gear;
}

/** The body for an outfit: the hand closed if it holds something, at rest on the belt if not. */
export function characterBody2(gear: readonly string[]): 'standard' | 'standard_at_ease' {
  return gear.some((id) => slotOf(id) === 'weapon') ? 'standard' : 'standard_at_ease';
}

const pictures = new Map<string, Picture2>();
const keyOf = (look: Partial<Look>, worn: readonly string[], extra: readonly string[]) =>
  `${look.skin}|${look.hair}|${look.hairColour}|${worn.join(',')}|${extra.join(',')}`;

/**
 * The character with this look, wearing these items: 56 x 72, outlined,
 * standing with the middle of its soles at (`FIGURE2_ANCHOR_X`,
 * `FIGURE2_SOLE_Y`). Unknown looks fall back to the default and unknown items
 * are left off; it never throws. Kept once drawn.
 */
export function characterPicture2(
  look: Partial<Look>,
  wornItemIds: readonly string[],
  extra: readonly string[] = [],
): Picture2 {
  const key = keyOf(look, wornItemIds, extra);
  let pic = pictures.get(key);
  if (!pic) {
    const safe: Look = { ...DEFAULT_LOOK, ...look };
    let grid: TGrid;
    try {
      const gear = characterGear2(safe, wornItemIds, extra);
      grid = figure2(characterBody2(gear), gear);
    } catch {
      grid = figure2('standard_at_ease', ['short_hair', ...EVERYDAY]);
    }
    pic = { grid: recolour(grid, lookSwap(safe)), glows: [] };
    pictures.set(key, pic);
  }
  return pic;
}

/** The character facing the other way (they face right as drawn). */
export const facingLeft2 = (pic: Picture2): Picture2 => ({
  grid: mirror(pic.grid),
  glows: pic.glows,
});

/**
 * The character as an element for a menu: `sheet` for the character sheet
 * (twice game scale), `thumb` for small places (game scale). Game scale is
 * the C scale's (3 device pixels per art pixel on a 390-wide 3x phone).
 */
export function characterCanvas2(
  look: Partial<Look>,
  wornItemIds: readonly string[],
  size: 'sheet' | 'thumb' = 'sheet',
): HTMLCanvasElement {
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  const width = typeof innerWidth === 'number' ? innerWidth : 390;
  const scale = c2Scale(width, dpr) * (size === 'sheet' ? 2 : 1);
  return pixelCanvas2(characterPicture2(look, wornItemIds), DAY2, scale, dpr, 'Your character');
}

/** Device pixels per art pixel at the C scale on this screen, never a fraction. */
export const c2Scale = (cssWidth: number, dpr: number): number =>
  town2Scale(Math.min(cssWidth, 480), dpr);

/** The character on an offscreen canvas, one pixel per art pixel, made once per look, outfit and time of day. */
export function characterSprite2(
  look: Partial<Look>,
  wornItemIds: readonly string[],
  time: TimeOfDay = 'day',
): HTMLCanvasElement {
  const key = `hero ${keyOf(look, wornItemIds, [])}`;
  return spriteCanvas(key, characterPicture2(look, wornItemIds), paletteFor(time));
}

/** The townsfolk at the C scale, by the ids the town uses today, and the villagers. */
export const TOWNSFOLK2_IDS: readonly string[] = FOLK2.map((f) => f.id);

/** A townsperson's picture, 56 x 72, anchored like the hero; null for an id with none. */
export function townsfolkPicture2(id: string): Picture2 | null {
  const grid = folkGrid(id);
  return grid ? { grid, glows: [] } : null;
}

/** What a townsperson is called, for a label. */
export const townsfolkName2 = (id: string): string | null =>
  FOLK2.find((f) => f.id === id)?.name ?? null;

/** A townsperson on an offscreen canvas, one pixel per art pixel, made once per time of day; null for an unknown id. */
export function townsfolkSprite2(id: string, time: TimeOfDay = 'day'): HTMLCanvasElement | null {
  const pic = townsfolkPicture2(id);
  return pic ? spriteCanvas(`folk ${id}`, pic, paletteFor(time)) : null;
}

/** A townsperson as an element at game scale, for a menu or a dialogue. */
export function townsfolkCanvas2(id: string): HTMLCanvasElement | null {
  const pic = townsfolkPicture2(id);
  if (!pic) return null;
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  const width = typeof innerWidth === 'number' ? innerWidth : 390;
  return pixelCanvas2(pic, DAY2, c2Scale(width, dpr), dpr, townsfolkName2(id) ?? id);
}

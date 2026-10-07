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
import type { Cell, Picture2, TGrid } from './town2/cells';
import { mirror } from './town2/cells';
import { mirrorLit } from './figure2/relight';
import { pixelCanvas2, spriteCanvas } from './town2/raster';
import { DAY2, paletteFor, type TimeOfDay } from './town2/ramps';
import { town2Scale } from './town2/scale';
import { FIG_H, FIG_W, AXIS, SOLE } from './figure2/body';
import { bonedParts, figure2, slottedParts, WARDROBE2 } from './figure2/dress';
import { backParts, frontWalkParts, taggedParts } from './figure2/views';
import { recolour } from './figure2/engine';
import { FOLK2, FOLK_HALF_STEP, folkBoned, folkGrid, folkRig, folkSwap } from './figure2/folk';
import { HAIRSTYLES2 } from './figure2/hair';
import { lookSwap } from './figure2/look';
import { sideWalkGrid } from './figure2/side';
import { sideDress } from './figure2/sideDress';
import { FOLK_SIDE } from './figure2/sideFolk';
import { folkBackParts } from './figure2/folkBack';
import {
  BACK_RIG,
  BACK_SHIELD_RIG,
  FRONT_WALK_RIG,
  HERO_RIG,
  IDLE2,
  IDLE2_FRAMES,
  WALK2_FRAMES,
  WALK2_STRIDE,
  posedFigure,
  posedTagged,
  walkKey,
  type Tagged,
  type Boned,
  type Facing2,
  type Key2,
  type Rig2,
} from './figure2/walk';

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

// ------------------------------------------------------- walking and breathing

export type { Facing2 } from './figure2/walk';
export { WALK2_FRAMES, WALK2_STRIDE, IDLE2_FRAMES } from './figure2/walk';

/**
 * How long each walk frame is shown, in milliseconds: the planted foot moves
 * back `WALK2_STRIDE` art pixels a frame, so a walker crossing the ground at
 * `WALK2_STRIDE / WALK2_FRAME_MS` (87.5 art pixels a second) never slides.
 * At another speed, show each frame for `WALK2_STRIDE / speed` seconds.
 */
export const WALK2_FRAME_MS = 80;
/** How long each of the two breathing frames is held, standing. */
export const IDLE2_FRAME_MS = 900;
/**
 * Townsfolk stroll with a shorter step: the ground passes `TOWNSFOLK2_STRIDE`
 * art pixels under them a frame, shown for `TOWNSFOLK2_FRAME_MS`, so they
 * walk at 40 art pixels a second without sliding.
 */
export const TOWNSFOLK2_STRIDE = FOLK_HALF_STEP / 2;
export const TOWNSFOLK2_FRAME_MS = 100;

const posedPics = new Map<string, Picture2>();

/**
 * Lets go of every walk and breath picture kept (8 KB of cells each; the
 * canvases made from them are freed by `forgetSprites()`). An outfit the
 * hero no longer wears keeps its frames until this is called.
 */
export function forgetWalks2(): void {
  posedPics.clear();
}

function posedPicture(
  key: string,
  make: () => { boned: readonly Boned[]; rig: Rig2; swap: (c: Cell) => Cell } | null,
  pose: Key2,
  flip: boolean,
): Picture2 | null {
  let pic = posedPics.get(key);
  if (pic) return pic;
  const m = make();
  if (!m) return null;
  let grid = recolour(posedFigure(m.boned, m.rig, pose), m.swap);
  if (flip) grid = mirror(grid);
  pic = { grid, glows: [] };
  posedPics.set(key, pic);
  return pic;
}

function heroParts(
  look: Partial<Look>,
  worn: readonly string[],
  extra: readonly string[],
  facing: Facing2 | 'idle' = 'idle',
) {
  const safe: Look = { ...DEFAULT_LOOK, ...look };
  let gear: string[];
  let body: 'standard' | 'standard_at_ease';
  try {
    gear = characterGear2(safe, worn, extra);
    body = characterBody2(gear);
    bonedParts(body, gear);
  } catch {
    gear = ['short_hair', ...EVERYDAY];
    body = 'standard_at_ease';
  }
  const shield = gear.some((id) => slotOf(id) === 'shield');
  let boned: Boned[] = taggedParts(slottedParts(body, gear));
  let rig: Rig2 = HERO_RIG;
  if (facing === 'down') {
    boned = frontWalkParts(boned, shield);
    if (!shield) rig = FRONT_WALK_RIG;
  } else if (facing === 'up') {
    boned = backParts(slottedParts(body, gear), HAIRSTYLES2[safe.hair]?.gear ?? null);
    rig = shield ? BACK_SHIELD_RIG : BACK_RIG;
  }
  return { boned, rig, swap: lookSwap(safe) };
}

/**
 * For tests and review sheets: a walk (toward or away) or breathing frame
 * before its outline, with what drew each pixel and where each thing's parts
 * lie, seen or covered (walk.ts, `posedTagged`). Across, `sideWalkGrid` gives
 * the same tags.
 */
export function characterFrameTagged2(
  look: Partial<Look>,
  wornItemIds: readonly string[],
  facing: 'down' | 'up' | 'idle',
  frame: number,
  extra: readonly string[] = [],
): Tagged {
  const m = heroParts(look, wornItemIds, extra, facing);
  const key =
    facing === 'idle' ? IDLE2[Math.abs(Math.floor(frame)) % IDLE2_FRAMES]! : walkKey(facing, frame);
  return posedTagged(m.boned, m.rig, key);
}

/** A townsperson's frame with what drew each pixel, as `characterFrameTagged2`; null for an unknown id. */
export function townsfolkFrameTagged2(
  id: string,
  facing: 'down' | 'up',
  frame: number,
): Tagged | null {
  const m = facing === 'up' ? folkBackParts(id) : folkParts(id);
  return m && posedTagged(m.boned, m.rig, walkKey(facing, frame, folkRig(id).half));
}

/** The character walking across in true profile (side.ts), or null if some gear has no side drawing. */
function sidePicture(
  key: string,
  look: Partial<Look>,
  worn: readonly string[],
  extra: readonly string[],
  facing: 'right' | 'left',
  f: number,
): Picture2 | null {
  const kept = posedPics.get(key);
  if (kept) return kept;
  const safe: Look = { ...DEFAULT_LOOK, ...look };
  let dress = null;
  try {
    dress = sideDress(characterGear2(safe, worn, extra));
  } catch {
    dress = null;
  }
  if (!dress) return null;
  const { grid } = sideWalkGrid(dress, f, WALK2_STRIDE, facing === 'left');
  const pic = { grid: recolour(grid, lookSwap(safe)), glows: [] };
  posedPics.set(key, pic);
  return pic;
}

/**
 * The character walking: frame `frame` (any whole number; it wraps at
 * `WALK2_FRAMES`) of the cycle toward the camera (`down`) or across
 * (`right`, and `left`, its exact mirror). The same 56 x 72 picture and
 * anchor as standing; the planted foot is always on the sole row. Kept once
 * drawn.
 */
export function characterWalkPicture2(
  look: Partial<Look>,
  wornItemIds: readonly string[],
  facing: Facing2,
  frame: number,
  extra: readonly string[] = [],
): Picture2 {
  const f = (((Math.floor(frame) % WALK2_FRAMES) + WALK2_FRAMES) % WALK2_FRAMES) | 0;
  const key = `walk ${facing} ${f} ${keyOf(look, wornItemIds, extra)}`;
  if (facing === 'right' || facing === 'left') {
    const side = sidePicture(key, look, wornItemIds, extra, facing, f);
    if (side) return side;
  }
  return posedPicture(
    key,
    () => heroParts(look, wornItemIds, extra, facing),
    walkKey(facing, f),
    facing === 'left',
  )!;
}

/** The character standing and breathing: frame 0 is `characterPicture2`, frame 1 the breath in. */
export function characterIdlePicture2(
  look: Partial<Look>,
  wornItemIds: readonly string[],
  frame: number,
  extra: readonly string[] = [],
): Picture2 {
  const f = Math.abs(Math.floor(frame)) % IDLE2_FRAMES;
  if (f === 0) return characterPicture2(look, wornItemIds, extra);
  const key = `idle ${f} ${keyOf(look, wornItemIds, extra)}`;
  return posedPicture(key, () => heroParts(look, wornItemIds, extra), IDLE2[f]!, false)!;
}

/**
 * A walk frame on an offscreen canvas at one pixel per art pixel, made the
 * first time it is asked for (per look, outfit, time of day, facing and
 * frame) and kept, like `characterSprite2`; `forgetSprites()` frees them.
 */
export function characterWalk2(
  look: Partial<Look>,
  wornItemIds: readonly string[],
  time: TimeOfDay,
  facing: Facing2,
  frame: number,
  extra: readonly string[] = [],
): HTMLCanvasElement {
  const pic = characterWalkPicture2(look, wornItemIds, facing, frame, extra);
  const f = (((Math.floor(frame) % WALK2_FRAMES) + WALK2_FRAMES) % WALK2_FRAMES) | 0;
  return spriteCanvas(
    `hero walk ${facing} ${f} ${keyOf(look, wornItemIds, extra)}`,
    pic,
    paletteFor(time),
  );
}

/** The breathing frames on offscreen canvases (frame 0 is `characterSprite2`'s picture). */
export function characterIdle2(
  look: Partial<Look>,
  wornItemIds: readonly string[],
  time: TimeOfDay,
  frame: number,
): HTMLCanvasElement {
  const f = Math.abs(Math.floor(frame)) % IDLE2_FRAMES;
  if (f === 0) return characterSprite2(look, wornItemIds, time);
  return spriteCanvas(
    `hero idle ${f} ${keyOf(look, wornItemIds, [])}`,
    characterIdlePicture2(look, wornItemIds, f),
    paletteFor(time),
  );
}

const folkParts = (id: string) => {
  const b = folkBoned(id);
  return b && { ...b, swap: folkSwap(id) };
};

/** A townsperson walking, as `characterWalkPicture2`; null for an unknown id. */
export function townsfolkWalkPicture2(id: string, facing: Facing2, frame: number): Picture2 | null {
  const f = (((Math.floor(frame) % WALK2_FRAMES) + WALK2_FRAMES) % WALK2_FRAMES) | 0;
  const key = `folk walk ${facing} ${f} ${id}`;
  if (facing === 'right' || facing === 'left') {
    const kept = posedPics.get(key);
    if (kept) return kept;
    const dress = FOLK_SIDE[id]?.();
    if (!dress) return null;
    // Townsfolk carry no weapon, so walking left is the right walk mirrored, re-lit from the left.
    const { grid } = sideWalkGrid(dress, f, TOWNSFOLK2_STRIDE, false);
    const pic = {
      grid: recolour(facing === 'left' ? mirrorLit(grid) : grid, folkSwap(id)),
      glows: [],
    };
    posedPics.set(key, pic);
    return pic;
  }
  return posedPicture(
    key,
    () => (facing === 'up' ? folkBackParts(id) : folkParts(id)),
    walkKey(facing, f, folkRig(id).half),
    false,
  );
}

/** A townsperson breathing, as `characterIdlePicture2`; null for an unknown id. */
export function townsfolkIdlePicture2(id: string, frame: number): Picture2 | null {
  const f = Math.abs(Math.floor(frame)) % IDLE2_FRAMES;
  if (f === 0) return townsfolkPicture2(id);
  return posedPicture(`folk idle ${f} ${id}`, () => folkParts(id), IDLE2[f]!, false);
}

/** A townsperson's walk frame on a kept offscreen canvas; null for an unknown id. */
export function townsfolkWalk2(
  id: string,
  time: TimeOfDay,
  facing: Facing2,
  frame: number,
): HTMLCanvasElement | null {
  const pic = townsfolkWalkPicture2(id, facing, frame);
  const f = (((Math.floor(frame) % WALK2_FRAMES) + WALK2_FRAMES) % WALK2_FRAMES) | 0;
  return pic ? spriteCanvas(`folk walk ${facing} ${f} ${id}`, pic, paletteFor(time)) : null;
}

/** A townsperson's breathing frame on a kept offscreen canvas; null for an unknown id. */
export function townsfolkIdle2(
  id: string,
  time: TimeOfDay,
  frame: number,
): HTMLCanvasElement | null {
  const f = Math.abs(Math.floor(frame)) % IDLE2_FRAMES;
  if (f === 0) return townsfolkSprite2(id, time);
  const pic = townsfolkIdlePicture2(id, f);
  return pic ? spriteCanvas(`folk idle ${f} ${id}`, pic, paletteFor(time)) : null;
}

/** A townsperson as an element at game scale, for a menu or a dialogue. */
export function townsfolkCanvas2(id: string): HTMLCanvasElement | null {
  const pic = townsfolkPicture2(id);
  if (!pic) return null;
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  const width = typeof innerWidth === 'number' ? innerWidth : 390;
  return pixelCanvas2(pic, DAY2, c2Scale(width, dpr), dpr, townsfolkName2(id) ?? id);
}

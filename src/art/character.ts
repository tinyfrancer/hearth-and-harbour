import { AT_EASE_GEAR } from './armoury';
import { gameScale, pixelCanvas } from './canvas';
import { WARDROBE, figure } from './figure';
import type { Grid } from './grid';
import { HAIRSTYLES } from './hair';
import { DAY, type Shade } from './palette';
import { picture, type Picture } from './raster';

/**
 * The player's character, drawn. This is the art lane's door for everything
 * that shows the character: the game says how they look and which items they
 * are wearing, by plain ids, and art answers with a picture.
 *
 * Item ids are the game's (`bronze_sword`, `linen_hood`). Which gear layer an
 * item is drawn with is art's business, decided here; an item art has not
 * drawn yet is simply not shown, so the game never has to wait for a picture.
 */
export interface Look {
  skin: string;
  hair: string;
  hairColour: string;
}

export interface LookChoice {
  id: string;
  /** What the choice is called on the character creation screen. */
  name: string;
}

/**
 * A skin tone: the steps the body's light, shadow and mouth are drawn in.
 * Each tone is a palette ramp of its own, so day and dusk shift it like any
 * other colour.
 */
const SKIN_TONES: readonly (LookChoice & { steps: readonly [Shade, Shade, Shade] })[] = [
  { id: 'fair', name: 'Fair', steps: ['skin1', 'skin2', 'lips2'] },
  { id: 'pale', name: 'Pale', steps: ['skinpale1', 'skinpale2', 'skinpale3'] },
  { id: 'golden', name: 'Golden', steps: ['skingolden1', 'skingolden2', 'skingolden3'] },
  { id: 'brown', name: 'Brown', steps: ['skinbrown1', 'skinbrown2', 'skinbrown3'] },
  { id: 'deep', name: 'Deep', steps: ['skindeep1', 'skindeep2', 'skindeep3'] },
];

/** A hair colour: the steps hair and brows are drawn in, highlight to shadow. */
const HAIR_COLOURS: readonly (LookChoice & { steps: readonly [Shade, Shade, Shade] })[] = [
  { id: 'brown', name: 'Brown', steps: ['hair1', 'hair2', 'hair3'] },
  { id: 'black', name: 'Black', steps: ['hairblack1', 'hairblack2', 'hairblack3'] },
  { id: 'chestnut', name: 'Chestnut', steps: ['hairchestnut1', 'hairchestnut2', 'hairchestnut3'] },
  { id: 'auburn', name: 'Auburn', steps: ['auburn1', 'auburn2', 'auburn3'] },
  { id: 'blonde', name: 'Blonde', steps: ['hairblonde1', 'hairblonde2', 'hairblonde3'] },
  { id: 'grey', name: 'Grey', steps: ['hairgrey1', 'hairgrey2', 'hairgrey3'] },
];

const choices = (list: readonly LookChoice[]): readonly LookChoice[] =>
  list.map(({ id, name }) => ({ id, name }));

/** Every look the player may choose, per part. The first of each is the default. */
export const LOOK_CHOICES: Readonly<Record<keyof Look, readonly LookChoice[]>> = {
  skin: choices(SKIN_TONES),
  hair: choices(HAIRSTYLES),
  hairColour: choices(HAIR_COLOURS),
};

export const DEFAULT_LOOK: Look = {
  skin: LOOK_CHOICES.skin[0]!.id,
  hair: LOOK_CHOICES.hair[0]!.id,
  hairColour: LOOK_CHOICES.hairColour[0]!.id,
};

/**
 * The gear layer each wearable item is drawn with. Several items may share a
 * layer (both kinds of arrow show as the same quiver). Items sit on the gear
 * ladder (docs/style-guide.md): bronze is the militia's, iron the town
 * guard's. The approved hero's sword, plate, kite shield and cloak are the
 * knight's, one rung up, and are kept for tier 2's items.
 */
export const ITEM_LAYERS: Readonly<Record<string, string>> = {
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
  // S8's leather set and the drops that can be worn (B5).
  leather_jerkin: 'leather_jerkin',
  leather_cap: 'leather_cap',
  leather_bracers: 'leather_bracers',
  cudgel: 'cudgel',
  smugglers_cutlass: 'smugglers_cutlass',
  trollstone: 'trollstone',
  // S9's bounty items and the grotto's loot (B6).
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
};

/**
 * What everyone has on under their gear: the tunic unless a body item
 * replaces it, the trousers unless a legs item does, and always boots and a
 * belt (until the game has boots).
 */
const EVERYDAY: readonly string[] = [
  'teal_tunic',
  'grey_trousers',
  'leather_boots',
  'leather_belt',
];

const find = <T extends LookChoice>(list: readonly T[], id: string): T =>
  list.find((choice) => choice.id === id) ?? list[0]!;

/**
 * The gear ids for a look and worn items, one per slot, worn items first.
 * With nothing in the weapon hand, clothes on that forearm are the ones drawn
 * for the hand at rest (`characterBody`).
 */
export function characterGear(look: Look, wornItemIds: readonly string[]): string[] {
  const slots = new Set<string>();
  const gear: string[] = [];
  const wear = (gearId: string | null | undefined) => {
    if (!gearId) return;
    const def = WARDROBE.gear.find((entry) => entry.id === gearId);
    if (!def || slots.has(def.slot)) return;
    slots.add(def.slot);
    gear.push(gearId);
  };
  for (const id of wornItemIds) wear(ITEM_LAYERS[id]);
  // A helmet or hood covers the crown of the head; only what hangs below it shows.
  const style = find(HAIRSTYLES, look.hair);
  wear(slots.has('head') ? style.under : style.gear);
  for (const id of EVERYDAY) wear(id);
  if (slots.has('weapon')) return gear;
  return gear.map((id) => AT_EASE_GEAR[id] ?? id);
}

/**
 * The body the character stands in: the standard pose, fist closed on what
 * it holds, or with nothing held the same pose with that hand resting at the
 * belt rather than hanging. (The other hand rests on the hip either way; a
 * shield covers it.)
 */
export function characterBody(gear: readonly string[]): string {
  const holding = gear.some(
    (id) => WARDROBE.gear.find((entry) => entry.id === id)?.slot === 'weapon',
  );
  return holding ? 'standard' : 'standard_at_ease';
}

/** The figure in this look's skin tone and hair colour: each step swapped for its ramp's. */
function inLook(g: Grid, look: Look): Grid {
  const swap = new Map<Shade, Shade>();
  const tone = find(SKIN_TONES, look.skin).steps;
  const hair = find(HAIR_COLOURS, look.hairColour).steps;
  (['skin1', 'skin2', 'lips2'] as const).forEach((step, i) => swap.set(step, tone[i]!));
  (['hair1', 'hair2', 'hair3'] as const).forEach((step, i) => swap.set(step, hair[i]!));
  return { w: g.w, h: g.h, d: g.d.map((cell) => (cell && swap.get(cell)) ?? cell) };
}

/**
 * The character with this look, wearing these items. Unknown looks fall back
 * to the default and unknown items are left off; it never throws.
 */
export function characterPicture(look: Look, wornItemIds: readonly string[]): Picture {
  const safeLook: Look = { ...DEFAULT_LOOK, ...look };
  try {
    const gear = characterGear(safeLook, wornItemIds);
    return picture(inLook(figure(characterBody(gear), gear), safeLook));
  } catch {
    return picture(figure('standard', ['short_hair', ...EVERYDAY]));
  }
}

/**
 * The character as an element for a menu: `sheet` for the character sheet
 * (twice game scale), `thumb` for small places (game scale).
 */
export function characterCanvas(
  look: Look,
  wornItemIds: readonly string[],
  size: 'sheet' | 'thumb' = 'sheet',
): HTMLCanvasElement {
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  const width = typeof innerWidth === 'number' ? innerWidth : 390;
  const scale = gameScale(Math.min(width, 480), dpr) * (size === 'sheet' ? 2 : 1);
  return pixelCanvas(characterPicture(look, wornItemIds), {
    palette: DAY,
    scale,
    dpr,
    label: 'Your character',
  });
}

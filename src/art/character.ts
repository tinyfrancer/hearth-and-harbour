import { gameScale, pixelCanvas } from './canvas';
import { WARDROBE, figure } from './figure';
import { DAY } from './palette';
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

/** Every look the player may choose, per part. The first of each is the default. */
export const LOOK_CHOICES: Readonly<Record<keyof Look, readonly LookChoice[]>> = {
  skin: [{ id: 'fair', name: 'Fair' }],
  hair: [{ id: 'short', name: 'Short' }],
  hairColour: [{ id: 'brown', name: 'Brown' }],
};

export const DEFAULT_LOOK: Look = {
  skin: LOOK_CHOICES.skin[0]!.id,
  hair: LOOK_CHOICES.hair[0]!.id,
  hairColour: LOOK_CHOICES.hairColour[0]!.id,
};

/** What everyone has on under their gear. */
const EVERYDAY: readonly string[] = [
  'short_hair',
  'teal_tunic',
  'grey_trousers',
  'leather_boots',
  'leather_belt',
];

/**
 * The character with this look, wearing these items. Unknown looks fall back
 * to the default and unknown items are left off; it never throws.
 *
 * Placeholder until the art lane's B3: the look is ignored, and an item shows
 * only if a gear layer happens to share its id.
 */
export function characterPicture(_look: Look, wornItemIds: readonly string[]): Picture {
  const slots = new Set<string>();
  const gear: string[] = [];
  for (const id of [...wornItemIds, ...EVERYDAY]) {
    const def = WARDROBE.gear.find((entry) => entry.id === id);
    if (!def || slots.has(def.slot)) continue;
    slots.add(def.slot);
    gear.push(id);
  }
  return picture(figure('standard', gear));
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

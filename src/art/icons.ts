/**
 * Pictures for things the game names by id. This is the art lane's door into
 * the menus: the UI asks for an icon wherever one would go and shows it if
 * there is one, so drawing an icon is a change here and nowhere else.
 *
 * Ids are plain strings on purpose. Art knows nothing about the game's
 * tables; an id with no picture is simply null.
 */
import { pixelCanvas } from './canvas';
import { GEAR_ICON_DEFS } from './gearIcons';
import { GROTTO_ICON_DEFS } from './grottoIcons';
import { ICON_SIZE, iconGrid, type IconDef } from './iconKit';
import { ITEM_ICON_DEFS } from './itemIcons';
import { LOOT_ICON_DEFS } from './lootIcons';
import { DAY } from './palette';
import { picture, type Picture } from './raster';
import { SKILL_ICON_DEFS } from './skillIcons';
import { TAB_ICON_DEFS, TAB_MUTED } from './tabArt';

/** Every item art has an icon for, by the game's item id. */
const ITEMS: Readonly<Record<string, IconDef>> = {
  ...ITEM_ICON_DEFS,
  ...GEAR_ICON_DEFS,
  ...LOOT_ICON_DEFS,
  ...GROTTO_ICON_DEFS,
};

export const ITEM_ICON_IDS: readonly string[] = Object.keys(ITEMS);
export const SKILL_ICON_IDS: readonly string[] = Object.keys(SKILL_ICON_DEFS);

/**
 * The icons in their families, as the gallery shows them: each family was
 * drawn together so its members read as kin and differ at a glance.
 */
export const ICON_FAMILIES: readonly {
  readonly name: string;
  readonly kind: 'item' | 'skill';
  readonly ids: readonly string[];
}[] = [
  { name: 'Logs', kind: 'item', ids: ['pine_logs', 'oak_logs', 'willow_logs'] },
  {
    name: 'Fish, raw and cooked',
    kind: 'item',
    ids: ['raw_shrimp', 'raw_herring', 'raw_cod', 'cooked_shrimp', 'cooked_herring', 'cooked_cod'],
  },
  {
    name: 'Ore and bars',
    kind: 'item',
    ids: ['copper_ore', 'tin_ore', 'iron_ore', 'bronze_bar', 'iron_bar'],
  },
  { name: 'Forage', kind: 'item', ids: ['seashells', 'flax', 'sageleaf', 'glowcap'] },
  { name: 'Cloth and thread', kind: 'item', ids: ['linen', 'bowstring'] },
  {
    name: 'Arrows',
    kind: 'item',
    ids: ['arrow_shafts', 'bronze_arrowheads', 'iron_arrowheads', 'bronze_arrows', 'iron_arrows'],
  },
  {
    name: 'Bronze',
    kind: 'item',
    ids: ['bronze_axe', 'bronze_sword', 'bronze_helmet', 'bronze_shield', 'bronze_breastplate'],
  },
  {
    name: 'Iron',
    kind: 'item',
    ids: ['iron_axe', 'iron_sword', 'iron_helmet', 'iron_shield', 'iron_breastplate'],
  },
  {
    name: 'Linen and shell',
    kind: 'item',
    ids: ['linen_hood', 'linen_tunic', 'linen_trousers', 'shell_necklace', 'shell_bracelet'],
  },
  { name: 'Bows', kind: 'item', ids: ['pine_shortbow', 'oak_shortbow', 'willow_shortbow'] },
  {
    name: 'What monsters drop',
    kind: 'item',
    ids: ['hide', 'feathers', 'pearl', 'smuggled_tea', 'trollstone', 'cudgel', 'smugglers_cutlass'],
  },
  {
    name: 'Leather',
    kind: 'item',
    ids: ['leather', 'leather_cap', 'leather_jerkin', 'leather_bracers'],
  },
  {
    name: 'The vial and potions',
    kind: 'item',
    ids: ['shell_vial', 'sage_tonic', 'steady_draught', 'glowcap_tincture', 'midnight_oil'],
  },
  {
    name: 'Bounty hunting',
    kind: 'item',
    ids: [
      'poachers_longbow',
      'wyrmscale_shield',
      'barbed_arrows',
      'hunters_charm',
      'feathered_hat',
    ],
  },
  {
    name: 'Brinebeard’s Grotto',
    kind: 'item',
    ids: [
      'doubloon',
      'pirate_cutlass',
      'boarding_axe',
      'tricorn',
      'captains_coat',
      'spyglass',
      'brinebeards_anchor',
      'ships_figurehead',
    ],
  },
  { name: 'The general store', kind: 'item', ids: ['velvet_cap'] },
  { name: 'Skills', kind: 'skill', ids: SKILL_ICON_IDS },
];

/**
 * How big an icon is on screen, in CSS pixels: a little taller than a line of
 * the menus' 18px text, so it sits beside a heading without crowding it.
 */
export const ICON_CSS = 32;

const pictures = new Map<string, Picture>();

function iconPicture(
  kind: 'item' | 'skill' | 'tab',
  table: Readonly<Record<string, IconDef>>,
  id: string,
): Picture | null {
  if (!Object.hasOwn(table, id)) return null;
  const key = `${kind}:${id}`;
  let pic = pictures.get(key);
  if (!pic) {
    pic = picture(iconGrid(table[id]!));
    pictures.set(key, pic);
  }
  return pic;
}

/** An item's icon as a picture (24 x 24, outlined), or null for an id art has not drawn. */
export function itemIconPicture(itemId: string): Picture | null {
  return iconPicture('item', ITEMS, itemId);
}

/** A skill's icon as a picture (24 x 24, outlined), or null for an id art has not drawn. */
export function skillIconPicture(skillId: string): Picture | null {
  return iconPicture('skill', SKILL_ICON_DEFS, skillId);
}

/**
 * Device pixels per art pixel for an icon on this screen: the whole number
 * that comes nearest to `ICON_CSS`, never less than one. 4 on a 3x phone
 * (32px), 3 at 2x (36px), 1 at 1x (24px).
 */
export function iconScale(dpr: number): number {
  return Math.max(1, Math.round((dpr * ICON_CSS) / ICON_SIZE));
}

function iconElement(pic: Picture | null): HTMLCanvasElement | null {
  if (!pic) return null;
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const canvas = pixelCanvas(pic, { palette: DAY, scale: iconScale(dpr), dpr });
  canvas.classList.add('icon');
  // The name always sits beside it, so the picture is not read out twice.
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}

export function itemIcon(itemId: string): Element | null {
  return iconElement(itemIconPicture(itemId));
}

export function skillIcon(skillId: string): Element | null {
  return iconElement(skillIconPicture(skillId));
}

export const TAB_ICON_IDS: readonly string[] = Object.keys(TAB_ICON_DEFS);

/** A tab's icon as a picture (24 x 24, outlined), or null for a tab art has not drawn. */
export function tabIconPicture(tabId: string): Picture | null {
  return iconPicture('tab', TAB_ICON_DEFS, tabId);
}

/**
 * A picture for one of the app's bottom tabs (`skills`, `bank`, `character`,
 * `town`, `menu`), or null for any other id (the bar keeps its glyph then).
 * B10b: a `<span class="tab-icon">` holding the icon twice, lit and muted;
 * art.css shows the lit one in the open tab (`.tab[aria-current='page']`)
 * and the muted one in the rest, so the bar needs no change to show which is
 * open. Each is 24 x 24 art pixels at the item icons' whole-pixel scale.
 */
export function tabIcon(tabId: string): Element | null {
  const pic = tabIconPicture(tabId);
  if (!pic) return null;
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const span = document.createElement('span');
  span.className = 'tab-icon';
  span.setAttribute('aria-hidden', 'true');
  for (const [palette, state] of [
    [DAY, 'on'],
    [TAB_MUTED, 'off'],
  ] as const) {
    const canvas = pixelCanvas(pic, { palette, scale: iconScale(dpr), dpr });
    canvas.classList.add(`tab-icon-${state}`);
    span.append(canvas);
  }
  return span;
}

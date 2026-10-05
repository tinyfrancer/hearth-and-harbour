/**
 * Small scenes for the gallery: each is a picture on its own patch of ground,
 * so it can be judged as it will look in the world rather than floating on a
 * menu panel. Pure, like the rest of the engine.
 */
import { DEFAULT_LOOK, characterPicture, type Look } from './character';
import {
  FIGURE_H,
  HERO_OUTFIT,
  PIRATE_OUTFIT,
  SMITH_OUTFIT,
  TRADER_OUTFIT,
  figure,
} from './figure';
import { blit, grid, groundShadow, type Grid } from './grid';
import type { Shade } from './palette';
import { picture, type Glow, type Picture } from './raster';
import { seeded } from './rng';
import {
  barrel,
  cobbles,
  crate,
  grass,
  lamp,
  noticeBoard,
  pine,
  tavern,
  well,
  type Box,
} from './scenery';
import { townPiece, type TownId } from './town';

/** A plate being drawn: its grid and the glows of what has been placed on it. */
class Plate {
  readonly g: Grid;
  readonly glows: Glow[] = [];
  constructor(w: number, h: number) {
    this.g = grid(w, h);
  }
  place(thing: Grid | Picture, x: number, y: number): void {
    const pic = 'grid' in thing ? thing : picture(thing);
    blit(this.g, pic.grid, x, y);
    for (const glow of pic.glows) this.glows.push({ ...glow, x: glow.x + x, y: glow.y + y });
  }
  /** Stands something on the ground: a shadow at its feet, then the thing. */
  stand(thing: Grid | Picture, x: number, y: number, ground: Shade, rx = 10, ry = 2.6): void {
    const g = 'grid' in thing ? thing.grid : thing;
    groundShadow(this.g, x + g.w / 2, y + g.h - 3, ground, rx, ry);
    this.place(thing, x, y);
  }
  done(): Picture {
    return picture(this.g, this.glows);
  }
}

const whole = (w: number, h: number): Box => ({ x: 0, y: 0, w, h });

/** Where a figure's feet are, measured from the top of its outlined grid. */
const FEET = FIGURE_H - 1;

/** One figure on cobbles, as it stands in the town square. */
export function figurePlate(gear: readonly string[] = HERO_OUTFIT): Picture {
  const p = new Plate(60, 58);
  cobbles(p.g, seeded(7), whole(60, 58));
  const who = figure('standard', gear);
  // The mock-up's shadow: centred under the figure, 47 rows below its top.
  groundShadow(p.g, 10 + 20, 4 + FEET, 'cobble3');
  p.place(who, 10, 4);
  return p.done();
}

/** The steps from bare body to the approved hero, each a body plus layers chosen by id. */
export const DRESSING: readonly (readonly string[])[] = [
  [],
  ['grey_trousers', 'leather_boots'],
  ['grey_trousers', 'leather_boots', 'teal_tunic', 'leather_belt'],
  ['grey_trousers', 'leather_boots', 'teal_tunic', 'leather_belt', 'iron_plate'],
  [
    'grey_trousers',
    'leather_boots',
    'teal_tunic',
    'leather_belt',
    'iron_plate',
    'short_hair',
    'red_cloak',
  ],
  HERO_OUTFIT,
];

/** The hero being dressed, left to right, on grass. */
export function dressingPlate(): Picture {
  const step = 42;
  const p = new Plate(DRESSING.length * step + 4, 56);
  grass(p.g, seeded(3), whole(p.g.w, p.g.h));
  DRESSING.forEach((gear, i) => {
    const x = 3 + i * step;
    groundShadow(p.g, x + 20, 3 + FEET, 'grass3');
    p.place(figure('standard', gear), x, 3);
  });
  return p.done();
}

/** The tavern on the edge of the square, with a lamp, crates and a barrel. */
export function tavernPlate(): Picture {
  const w = 204;
  const h = 168;
  const rand = seeded(21);
  const p = new Plate(w, h);
  grass(p.g, rand, { x: 0, y: 0, w, h: 128 });
  const trees = [pine(rand), pine(rand), pine(rand)];
  for (let x = 140, i = 0; x < w; x += 15, i++)
    p.place(trees[i % 3] as Grid, x, -22 + ((i * 5) % 8));
  cobbles(p.g, rand, { x: 0, y: 126, w, h: h - 126 });
  // The mock-up's long shadow under the tavern's front.
  groundShadow(p.g, 72, 137, 'cobble3', 66, 4);
  p.place(tavern(rand), 6, 20);
  p.place(lamp(), 162, 124);
  p.stand(crate(), 174, 146, 'cobble3', 8, 2.4);
  p.stand(crate(), 188, 150, 'cobble3', 8, 2.4);
  p.stand(barrel(), 150, 148, 'cobble3', 7, 2.2);
  return p.done();
}

/** The small things of the town, standing in a row on cobbles. */
export function propsPlate(): Picture {
  const rand = seeded(5);
  const w = 176;
  const h = 64;
  const p = new Plate(w, h);
  cobbles(p.g, rand, whole(w, h));
  const base = 58;
  const put = (thing: Grid | Picture, x: number, rx: number) => {
    const g = 'grid' in thing ? thing.grid : thing;
    p.stand(thing, x, base - g.h + 3, 'cobble3', rx, 2.6);
  };
  put(pine(rand), 2, 11);
  put(well(), 34, 14);
  put(noticeBoard(), 68, 11);
  put(lamp(), 100, 5);
  put(barrel(), 116, 7);
  put(crate(), 134, 8);
  put(crate(), 152, 8);
  return p.done();
}

/** The people of the town, each as the mock-up dressed them. */
export const TOWNSFOLK: readonly {
  readonly id: TownId;
  readonly body: string;
  readonly gear: readonly string[];
}[] = [
  { id: 'hero', body: 'standard', gear: HERO_OUTFIT },
  { id: 'pirate', body: 'pirate', gear: PIRATE_OUTFIT },
  { id: 'smith', body: 'smith', gear: SMITH_OUTFIT },
  { id: 'trader', body: 'trader', gear: TRADER_OUTFIT },
];

/** Characters side by side on grass, each on the hero's ground shadow. */
export function lineupPlate(people: readonly Picture[]): Picture {
  const step = 42;
  const p = new Plate(people.length * step + 4, 56);
  grass(p.g, seeded(13), whole(p.g.w, p.g.h));
  const shadow = townPiece('hero').shadow;
  people.forEach((who, i) => {
    const x = 3 + i * step;
    if (shadow) groundShadow(p.g, x + shadow.cx, 3 + shadow.cy, 'grass3', shadow.rx, shadow.ry);
    p.place(who, x, 3);
  });
  return p.done();
}

/** A look and what is worn with it: one character in the wardrobe's gallery. */
export interface Outfit {
  readonly name: string;
  readonly look: Look;
  readonly items: readonly string[];
}

/**
 * Tier 1's gear ladder on one character, the approved hero's own look: the
 * villager in linen, the militia volunteer in bronze, the town guard in iron.
 * `ladderPlate` stands the hero beside them where tier 2's knight will be.
 */
export const WARDROBE_LADDER: readonly Outfit[] = [
  { name: 'Linen', look: DEFAULT_LOOK, items: ['linen_tunic', 'linen_trousers'] },
  {
    name: 'Leather',
    look: DEFAULT_LOOK,
    items: ['leather_cap', 'leather_jerkin', 'leather_bracers', 'oak_shortbow', 'bronze_arrows'],
  },
  {
    name: 'Bronze',
    look: DEFAULT_LOOK,
    items: ['bronze_helmet', 'bronze_breastplate', 'bronze_sword', 'bronze_shield'],
  },
  {
    name: 'Iron',
    look: DEFAULT_LOOK,
    items: ['iron_helmet', 'iron_breastplate', 'iron_sword', 'iron_shield'],
  },
];

/** The ladder, rung by rung, with the approved hero last as tier 2's knight. */
export function ladderPlate(): Picture {
  return lineupPlate([
    ...WARDROBE_LADDER.map(outfitPicture),
    picture(figure('standard', HERO_OUTFIT)),
  ]);
}

/** The full sets, each in a different look, so looks are seen in gear too. */
export const WARDROBE_SETS: readonly Outfit[] = [
  {
    name: 'Bronze',
    look: { skin: 'brown', hair: 'braid', hairColour: 'black' },
    items: ['bronze_helmet', 'bronze_breastplate', 'bronze_sword', 'bronze_shield'],
  },
  {
    name: 'Iron',
    look: DEFAULT_LOOK,
    items: ['iron_helmet', 'iron_breastplate', 'iron_sword', 'iron_shield'],
  },
  {
    name: 'Linen',
    look: { skin: 'pale', hair: 'long', hairColour: 'blonde' },
    items: ['linen_hood', 'linen_tunic', 'linen_trousers', 'shell_necklace', 'shell_bracelet'],
  },
  {
    name: 'Leather',
    look: { skin: 'deep', hair: 'shaggy', hairColour: 'auburn' },
    items: ['leather_cap', 'leather_jerkin', 'leather_bracers', 'trollstone', 'cudgel'],
  },
];

/** Each bow, with arrows (a quiver) and linen, in three more looks. */
export const WARDROBE_BOWS: readonly Outfit[] = [
  {
    name: 'Pine shortbow',
    look: { skin: 'golden', hair: 'shaggy', hairColour: 'chestnut' },
    items: ['pine_shortbow', 'bronze_arrows', 'linen_tunic', 'linen_trousers'],
  },
  {
    name: 'Oak shortbow',
    look: { skin: 'deep', hair: 'short', hairColour: 'grey' },
    items: ['oak_shortbow', 'iron_arrows', 'linen_tunic', 'linen_trousers'],
  },
  {
    name: 'Willow shortbow',
    look: { skin: 'fair', hair: 'long', hairColour: 'auburn' },
    items: ['willow_shortbow', 'iron_arrows', 'linen_tunic', 'linen_trousers'],
  },
];

/** Every wearable item the wardrobe draws, each worn alone, in the order the gallery shows them. */
export const WARDROBE_ITEMS: readonly string[] = [
  'bronze_sword',
  'iron_sword',
  'bronze_axe',
  'iron_axe',
  'bronze_shield',
  'iron_shield',
  'bronze_helmet',
  'iron_helmet',
  'linen_hood',
  'bronze_breastplate',
  'iron_breastplate',
  'linen_tunic',
  'linen_trousers',
  'shell_necklace',
  'shell_bracelet',
  'pine_shortbow',
  'oak_shortbow',
  'willow_shortbow',
  'iron_arrows',
];

export const outfitPicture = (o: Outfit): Picture => characterPicture(o.look, o.items);

/** The hero and the three townsfolk side by side on grass, each on their mock-up shadow. */
export function townsfolkPlate(): Picture {
  const step = 42;
  const p = new Plate(TOWNSFOLK.length * step + 4, 56);
  grass(p.g, seeded(11), whole(p.g.w, p.g.h));
  TOWNSFOLK.forEach(({ id, body, gear }, i) => {
    const x = 3 + i * step;
    const shadow = townPiece(id).shadow;
    if (shadow) groundShadow(p.g, x + shadow.cx, 3 + shadow.cy, 'grass3', shadow.rx, shadow.ry);
    p.place(figure(body, gear), x, 3);
  });
  return p.done();
}

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOOK,
  ITEM_LAYERS,
  LOOK_CHOICES,
  characterCanvas,
  characterGear,
  characterPicture,
  type Look,
} from '../../src/art/character';
import { FIGURE_H, FIGURE_W, WARDROBE, figure } from '../../src/art/figure';
import { get, type Grid } from '../../src/art/grid';
import { DAY, DUSK, RAMPS, type Shade } from '../../src/art/palette';

// The door the game draws the character through. What it must never do is
// make the game wait for art: any ids at all give a picture.
describe('characterPicture', () => {
  it('draws a figure for the default look and no gear', () => {
    const pic = characterPicture(DEFAULT_LOOK, []);
    expect(pic.grid.w).toBeGreaterThanOrEqual(FIGURE_W);
    expect(pic.grid.h).toBeGreaterThanOrEqual(FIGURE_H);
  });

  it('never throws for items or looks art has not drawn', () => {
    expect(() =>
      characterPicture({ skin: 'green', hair: 'none', hairColour: 'x' }, ['no_such_item', '']),
    ).not.toThrow();
  });

  it('keeps one item per slot rather than failing on two', () => {
    expect(() => characterPicture(DEFAULT_LOOK, ['iron_sword', 'iron_sword'])).not.toThrow();
  });

  it('offers at least one choice for every part of a look, the default first', () => {
    for (const part of ['skin', 'hair', 'hairColour'] as const) {
      expect(LOOK_CHOICES[part].length).toBeGreaterThan(0);
      expect(DEFAULT_LOOK[part]).toBe(LOOK_CHOICES[part][0]!.id);
    }
  });

  it('gives a labelled element in both sizes', () => {
    for (const size of ['sheet', 'thumb'] as const) {
      const el = characterCanvas(DEFAULT_LOOK, [], size);
      expect(el.tagName).toBe('CANVAS');
      expect(el.getAttribute('aria-label')).toBe('Your character');
    }
  });
});

/** Every wearable item in the game's tables (lane A's S5 and S6). */
const WEARABLES = [
  'bronze_sword',
  'iron_sword',
  'bronze_axe',
  'iron_axe',
  'bronze_helmet',
  'iron_helmet',
  'bronze_shield',
  'iron_shield',
  'bronze_breastplate',
  'iron_breastplate',
  'linen_tunic',
  'linen_hood',
  'linen_trousers',
  'shell_necklace',
  'shell_bracelet',
  'pine_shortbow',
  'oak_shortbow',
  'willow_shortbow',
  'bronze_arrows',
  'iron_arrows',
  // S8's leather set and the drops that can be worn (drawn in B5).
  'leather_jerkin',
  'leather_cap',
  'leather_bracers',
  'cudgel',
  'smugglers_cutlass',
  'trollstone',
];

const cells = (g: Grid): readonly (Shade | null)[] => g.d;
const differs = (a: Grid, b: Grid) => cells(a).some((c, i) => c !== cells(b)[i]);
const shades = (g: Grid) => new Set(cells(g).filter((c): c is Shade => c !== null));
const ramp = (name: string, steps: Set<Shade>) => [...steps].filter((s) => s.startsWith(name));

describe('the wardrobe', () => {
  const bare = characterPicture(DEFAULT_LOOK, []).grid;

  it('maps every wearable item to a layer it has drawn', () => {
    expect(Object.keys(ITEM_LAYERS).sort()).toEqual([...WEARABLES].sort());
    for (const layer of Object.values(ITEM_LAYERS))
      expect(WARDROBE.gear.some((g) => g.id === layer)).toBe(true);
  });

  it('shows every wearable item on the character', () => {
    for (const id of WEARABLES)
      expect(differs(characterPicture(DEFAULT_LOOK, [id]).grid, bare), id).toBe(true);
  });

  it('dresses the default character in the approved hero’s clothes and hair', () => {
    const held = figure('standard', [
      'short_hair',
      'teal_tunic',
      'grey_trousers',
      'leather_boots',
      'leather_belt',
      'iron_arming_sword',
    ]);
    expect(cells(characterPicture(DEFAULT_LOOK, ['iron_sword']).grid)).toEqual(cells(held));
    const atEase = figure('standard_at_ease', [
      'short_hair',
      'teal_tunic_at_ease',
      'grey_trousers',
      'leather_boots',
      'leather_belt',
    ]);
    expect(cells(bare)).toEqual(cells(atEase));
  });

  it('wears the everyday tunic and trousers unless something replaces them', () => {
    const held = characterGear(DEFAULT_LOOK, ['bronze_sword']);
    expect(held).toEqual(
      expect.arrayContaining(['teal_tunic', 'grey_trousers', 'leather_boots', 'leather_belt']),
    );
    const linen = characterGear(DEFAULT_LOOK, ['linen_tunic', 'linen_trousers']);
    expect(linen).not.toContain('teal_tunic_at_ease');
    expect(linen).not.toContain('grey_trousers');
    expect(linen).toContain('leather_boots');
    // Armour goes over the tunic.
    expect(characterGear(DEFAULT_LOOK, ['bronze_breastplate'])).toContain('teal_tunic_at_ease');
  });

  it('keeps the first of two items in one slot', () => {
    const gear = characterGear(DEFAULT_LOOK, ['bronze_sword', 'iron_axe']);
    expect(gear).toContain('bronze_shortsword');
    expect(gear).not.toContain('iron_bearded_axe');
  });

  it('shows both kinds of arrow as the same quiver', () => {
    expect(cells(characterPicture(DEFAULT_LOOK, ['bronze_arrows']).grid)).toEqual(
      cells(characterPicture(DEFAULT_LOOK, ['iron_arrows']).grid),
    );
  });

  it('tells bronze from iron by colour', () => {
    for (const kind of ['sword', 'axe', 'helmet', 'shield', 'breastplate']) {
      const bronze = shades(characterPicture(DEFAULT_LOOK, [`bronze_${kind}`]).grid);
      const iron = shades(characterPicture(DEFAULT_LOOK, [`iron_${kind}`]).grid);
      expect(ramp('bronze', bronze).length, kind).toBeGreaterThan(0);
      expect(ramp('metal', bronze), kind).toEqual([]);
      expect(ramp('metal', iron).length, kind).toBeGreaterThan(0);
      expect(ramp('bronze', iron), kind).toEqual([]);
    }
  });

  it('tells the three bows apart by their wood', () => {
    const woods = ['pine_shortbow', 'oak_shortbow', 'willow_shortbow'].map((id) =>
      [...shades(characterPicture(DEFAULT_LOOK, [id]).grid)].sort().join(),
    );
    expect(new Set(woods).size).toBe(3);
  });
});

/** Where the eyes are on the outlined figure: whites at columns 16 and 23 of row 8. */
const eyes = (g: Grid) => [get(g, 16, 8), get(g, 17, 8), get(g, 22, 8), get(g, 23, 8)];

describe('looks', () => {
  const all: Look[] = LOOK_CHOICES.skin.flatMap((skin) =>
    LOOK_CHOICES.hair.flatMap((hair) =>
      LOOK_CHOICES.hairColour.map((hairColour) => ({
        skin: skin.id,
        hair: hair.id,
        hairColour: hairColour.id,
      })),
    ),
  );

  it('offers several skin tones, hairstyles and hair colours, keeping the first as they were', () => {
    expect(LOOK_CHOICES.skin.length).toBeGreaterThanOrEqual(3);
    expect(LOOK_CHOICES.hair.length).toBeGreaterThanOrEqual(4);
    expect(LOOK_CHOICES.hairColour.length).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_LOOK).toEqual({ skin: 'fair', hair: 'short', hairColour: 'brown' });
    expect(LOOK_CHOICES.hair.map((h) => h.id)).toContain('bald');
  });

  it('draws every choice differently', () => {
    for (const part of ['skin', 'hair', 'hairColour'] as const) {
      const base = part === 'hairColour' ? { ...DEFAULT_LOOK, hair: 'long' } : DEFAULT_LOOK;
      const drawn = LOOK_CHOICES[part].map((c) =>
        cells(characterPicture({ ...base, [part]: c.id }, []).grid).join(),
      );
      expect(new Set(drawn).size, part).toBe(drawn.length);
    }
  });

  it('draws each skin tone from a ramp of its own', () => {
    for (const skin of LOOK_CHOICES.skin) {
      const used = shades(characterPicture({ ...DEFAULT_LOOK, skin: skin.id }, []).grid);
      const tone = skin.id === 'fair' ? 'skin' : `skin${skin.id}`;
      expect(tone in RAMPS, skin.id).toBe(true);
      const skinSteps = [...used].filter((s) => s.startsWith('skin'));
      expect(
        skinSteps.every((s) => s.replace(/\d$/, '') === tone),
        skin.id,
      ).toBe(true);
      if (skin.id !== 'fair') expect(used.has('lips2'), skin.id).toBe(false);
    }
  });

  it('colours the brows with the hair', () => {
    const blonde = characterPicture({ ...DEFAULT_LOOK, hair: 'bald', hairColour: 'blonde' }, []);
    // Brows on row 7 of the outlined figure.
    expect(get(blonde.grid, 16, 7)).toBe('hairblonde3');
  });

  it('keeps both eyes open and mirrored in every look, with or without a helmet or hood', () => {
    const open = eyes(characterPicture(DEFAULT_LOOK, []).grid);
    expect(open).toEqual(['white1', 'ink1', 'ink1', 'white1']);
    for (const head of [[], ['bronze_helmet'], ['iron_helmet'], ['linen_hood'], ['leather_cap']])
      for (const look of all) {
        const g = characterPicture(look, head).grid;
        expect(eyes(g), JSON.stringify([look, head])).toEqual(open);
      }
  });

  it('never lets hair show through a helmet or hood', () => {
    for (const head of ['bronze_helmet', 'iron_helmet', 'linen_hood', 'leather_cap'])
      for (const look of all) {
        const g = characterPicture(look, [head]).grid;
        // Above the eyes (rows 0 to 7 of the outlined figure), only the head gear and face.
        for (let y = 0; y <= 7; y++)
          for (let x = 0; x < g.w; x++) {
            const c = get(g, x, y);
            if (!c || y === 7) continue;
            const isHair = /^(hair|auburn)/.test(c);
            expect(isHair, `${head} ${look.hair} at ${x},${y}`).toBe(false);
          }
      }
  });

  it('gives every step of every look a colour by day and at dusk', () => {
    for (const look of all)
      for (const step of shades(characterPicture(look, WEARABLES.slice(0, 4)).grid)) {
        expect(DAY.colours[step]).toMatch(/^#/);
        expect(DUSK.colours[step]).toMatch(/^#/);
      }
  });
});

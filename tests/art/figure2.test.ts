import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, LOOK_CHOICES, characterPicture } from '../../src/art/character';
import {
  FIGURE2_ANCHOR_X,
  FIGURE2_H,
  FIGURE2_SOLE_Y,
  FIGURE2_W,
  ITEM_LAYERS2,
  KNIGHT_GEAR2,
  LOOK_CHOICES2,
  TOWNSFOLK2_IDS,
  characterBody2,
  characterCanvas2,
  characterGear2,
  characterPicture2,
  characterSprite2,
  townsfolkCanvas2,
  townsfolkPicture2,
  townsfolkSprite2,
} from '../../src/art/character2';
import { DEPTH } from '../../src/art/depth';
import { BODIES2, FIST2, GRIP_X } from '../../src/art/figure2/body';
import { WARDROBE2, dress2, partsOf } from '../../src/art/figure2/dress';
import { pixels, type Gear2 } from '../../src/art/figure2/engine';
import { FOLK2 } from '../../src/art/figure2/folk';
import { browShift, contrast, HAIR_COLOUR2, SKIN2 } from '../../src/art/figure2/look';
import { isMat, matOf, stepOf, type TGrid } from '../../src/art/town2/cells';
import type { Mat } from '../../src/art/town2/ramps';

// The hero and the townsfolk at the C scale (docs/style-guide.md, "Figures at
// the C scale"): built beside the current figures, through doors of the same
// shape, every look and every wearable drawn, held things by the hand rule,
// the ladder climbing, the eyes mirrored.

/** Every wearable item in the game's tables (src/data/items.ts), copied here so a new one fails this test. */
const WEARABLES = [
  'bronze_axe',
  'bronze_sword',
  'bronze_helmet',
  'bronze_shield',
  'bronze_breastplate',
  'iron_axe',
  'iron_sword',
  'iron_helmet',
  'iron_shield',
  'iron_breastplate',
  'shell_necklace',
  'shell_bracelet',
  'linen_hood',
  'linen_trousers',
  'linen_tunic',
  'bronze_arrows',
  'iron_arrows',
  'pine_shortbow',
  'oak_shortbow',
  'willow_shortbow',
  'cudgel',
  'smugglers_cutlass',
  'trollstone',
  'poachers_longbow',
  'wyrmscale_shield',
  'barbed_arrows',
  'hunters_charm',
  'feathered_hat',
  'pirate_cutlass',
  'boarding_axe',
  'tricorn',
  'captains_coat',
  'spyglass',
  'brinebeards_anchor',
  'velvet_cap',
  'leather_bracers',
  'leather_cap',
  'leather_jerkin',
];

const at = (g: TGrid, x: number, y: number) => g.d[y * g.w + x]!;
const grid = (items: readonly string[], extra: readonly string[] = []) =>
  characterPicture2(DEFAULT_LOOK, items, extra).grid;
const differs = (a: TGrid, b: TGrid) => a.d.some((c, i) => c !== b.d[i]);
const count = (g: TGrid, test: (c: number) => boolean) => g.d.filter((c) => c && test(c)).length;
const looks = () =>
  LOOK_CHOICES.skin.flatMap((s) =>
    LOOK_CHOICES.hair.flatMap((h) =>
      LOOK_CHOICES.hairColour.map((c) => ({ skin: s.id, hair: h.id, hairColour: c.id })),
    ),
  );

describe('the door', () => {
  it('has the size and anchor lane C builds against', () => {
    expect([FIGURE2_W, FIGURE2_H, FIGURE2_ANCHOR_X, FIGURE2_SOLE_Y]).toEqual([56, 72, 28, 70]);
    const g = grid([]);
    expect([g.w, g.h]).toEqual([56, 72]);
    // The soles' line is the lowest row drawn, under both feet either side of the anchor.
    const sole = [...Array(56).keys()].filter((x) => at(g, x, FIGURE2_SOLE_Y));
    expect(Math.min(...sole)).toBeLessThan(FIGURE2_ANCHOR_X);
    expect(Math.max(...sole)).toBeGreaterThan(FIGURE2_ANCHOR_X);
    for (let x = 0; x < 56; x++) expect(at(g, x, 71)).toBe(0);
  });

  it('offers the same look choices as the current character', () => {
    expect(LOOK_CHOICES2).toBe(LOOK_CHOICES);
  });

  it('never throws and ignores what it does not know', () => {
    expect(() =>
      characterPicture2({ skin: 'teal', hair: 'mohawk', hairColour: 'green' }, ['nonsense']),
    ).not.toThrow();
    expect(grid(['nonsense']).d).toEqual(grid([]).d);
    expect(characterPicture2({}, []).grid.d).toEqual(grid([]).d);
  });

  it('keeps a picture once drawn, and a sprite per look, outfit and time of day', () => {
    expect(characterPicture2(DEFAULT_LOOK, ['iron_sword'])).toBe(
      characterPicture2(DEFAULT_LOOK, ['iron_sword']),
    );
    const day = characterSprite2(DEFAULT_LOOK, ['iron_sword'], 'day');
    expect(characterSprite2(DEFAULT_LOOK, ['iron_sword'], 'day')).toBe(day);
    expect(characterSprite2(DEFAULT_LOOK, ['iron_sword'], 'dusk')).not.toBe(day);
    expect([day.width, day.height]).toEqual([56, 72]);
  });

  it('gives canvases for menus at whole device pixels', () => {
    const c = characterCanvas2(DEFAULT_LOOK, [], 'thumb');
    const dpr = window.devicePixelRatio || 1;
    expect(c.width % FIGURE2_W).toBe(0);
    expect((parseFloat(c.style.width) * dpr) / c.width).toBeCloseTo(1, 6);
    expect(townsfolkCanvas2('smith')?.width).toBeGreaterThan(0);
    expect(townsfolkCanvas2('nobody')).toBeNull();
  });

  it('leaves the current doors exactly as they were', () => {
    const old = characterPicture(DEFAULT_LOOK, []);
    expect([old.grid.w, old.grid.h]).toEqual([40, 50]);
    expect(LOOK_CHOICES.skin.map((c) => c.id)).toEqual(['fair', 'pale', 'golden', 'brown', 'deep']);
    expect(LOOK_CHOICES.hair.map((c) => c.id)).toEqual([
      'short',
      'long',
      'braid',
      'shaggy',
      'bald',
    ]);
  });
});

describe('the hero in every look', () => {
  it('draws every combination of skin, hair and hair colour, each its own picture, inside the canvas', () => {
    const seen = new Set<string>();
    for (const look of looks()) {
      const g = characterPicture2(look, []).grid;
      for (let x = 0; x < 56; x++) expect(at(g, x, 71), JSON.stringify(look)).toBe(0);
      // Its skin and hair are its own tone's and colour's ramps.
      expect(count(g, (c) => isMat(c, SKIN2[look.skin]!))).toBeGreaterThan(100);
      if (look.hair !== 'bald')
        expect(count(g, (c) => isMat(c, HAIR_COLOUR2[look.hairColour]!))).toBeGreaterThan(30);
      expect(count(g, (c) => isMat(c, 'skin') && look.skin !== 'fair')).toBe(0);
      seen.add(g.d.join());
    }
    // Bald looks differ only by brow colour; every combination is still a picture of its own.
    expect(seen.size).toBe(looks().length);
  });

  it('keeps every part a pixel inside the canvas, so the outline fits', () => {
    for (const piece of [...WARDROBE2.bodies, ...WARDROBE2.gear])
      for (const part of piece.parts)
        for (const [x, y] of pixels(part)) {
          expect(x, piece.id).toBeGreaterThanOrEqual(1);
          expect(x, piece.id).toBeLessThanOrEqual(54);
          expect(y, piece.id).toBeGreaterThanOrEqual(1);
          expect(y, piece.id).toBeLessThanOrEqual(69);
        }
  });

  it('mirrors the eyes about the centre column in every look and under every head gear', () => {
    const heads = [
      [],
      ...WEARABLES.filter(
        (id) => WARDROBE2.gear.find((g) => g.id === ITEM_LAYERS2[id])?.slot === 'head',
      ).map((id) => [id]),
    ];
    for (const look of looks())
      for (const worn of heads) {
        const g = characterPicture2(look, worn).grid;
        const eyes: [number, number, number][] = [];
        for (let y = 0; y < 72; y++)
          for (let x = 0; x < 56; x++)
            if (isMat(at(g, x, y), 'eye')) eyes.push([x, y, at(g, x, y)]);
        expect(eyes.length, `${JSON.stringify(look)} ${worn}`).toBe(12);
        for (const [x, y, c] of eyes)
          expect(at(g, 2 * FIGURE2_ANCHOR_X - x, y), `${x},${y}`).toBe(c);
        // The iris in the middle of each eye: the gaze is straight out.
        const irises = [...new Set(eyes.filter(([, , c]) => stepOf(c) === 3).map(([x]) => x))];
        expect(irises.sort((a, b) => a - b)).toEqual([FIGURE2_ANCHOR_X - 3, FIGURE2_ANCHOR_X + 3]);
      }
  });

  it('draws brows that show on every skin in every hair colour', () => {
    for (const skin of Object.values(SKIN2))
      for (const hair of Object.values(HAIR_COLOUR2)) {
        const shift = browShift(skin, hair);
        for (const step of [3, 4]) {
          const s = Math.max(1, Math.min(5, step + shift));
          expect(contrast(hair, s, skin, 1), `${hair} on ${skin}`).toBeGreaterThanOrEqual(1.6);
        }
      }
  });

  it('hangs long hair beside the face and over the shoulders, and keeps it under head gear', () => {
    const long = characterPicture2({ ...DEFAULT_LOOK, hair: 'long' }, []).grid;
    const hooded = characterPicture2({ ...DEFAULT_LOOK, hair: 'long' }, ['iron_helmet']).grid;
    const hair = (g: TGrid, x0: number, x1: number, y0: number, y1: number) => {
      let n = 0;
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) if (isMat(at(g, x, y), 'hair')) n++;
      return n;
    };
    // Beside the face on both sides at eye level, and down past the jaw.
    for (const g of [long, hooded]) {
      expect(hair(g, 19, 22, 13, 16)).toBeGreaterThan(4);
      expect(hair(g, 34, 37, 13, 16)).toBeGreaterThan(4);
      expect(hair(g, 18, 38, 22, 28)).toBeGreaterThan(8);
    }
    // Nothing of the crown above the helmet's rim.
    expect(hair(hooded, 18, 38, 0, 10)).toBe(0);
  });
});

describe('every wearable', () => {
  it('has a layer drawn for every wearable item in the game', () => {
    expect(Object.keys(ITEM_LAYERS2).sort()).toEqual([...WEARABLES].sort());
    for (const id of WEARABLES)
      expect(
        WARDROBE2.gear.find((g) => g.id === ITEM_LAYERS2[id]),
        id,
      ).toBeDefined();
  });

  it('shows every item, inside the canvas, by day and at dusk', () => {
    const plain = grid([]);
    for (const id of WEARABLES) {
      const g = grid([id]);
      expect(differs(g, plain), id).toBe(true);
      for (let x = 0; x < 56; x++) expect(at(g, x, 71), id).toBe(0);
    }
  });

  it('stands at rest with nothing held and closes the hand on anything held', () => {
    expect(characterBody2(characterGear2(DEFAULT_LOOK, []))).toBe('standard_at_ease');
    for (const id of ['bronze_sword', 'pine_shortbow', 'brinebeards_anchor', 'cudgel'])
      expect(characterBody2(characterGear2(DEFAULT_LOOK, [id])), id).toBe('standard');
    expect(characterBody2(characterGear2(DEFAULT_LOOK, ['iron_shield']))).toBe('standard_at_ease');
  });

  it('wears only what hangs of the hair under head gear', () => {
    expect(characterGear2({ ...DEFAULT_LOOK, hair: 'long' }, ['iron_helmet'])).toContain(
      'long_hair_under',
    );
    expect(characterGear2({ ...DEFAULT_LOOK, hair: 'long' }, [])).toContain('long_hair');
    expect(characterGear2(DEFAULT_LOOK, ['linen_hood']).some((id) => id.endsWith('_hair'))).toBe(
      false,
    );
  });
});

// ------------------------------------------------------------- the hand rule

type P = readonly [number, number];
const key = ([x, y]: P) => `${x},${y}`;
const FIST = pixels(FIST2).map(([x, y]): P => [x, y]);
const fistAt = new Set(FIST.map(key));
const FIST_COLUMNS = [...new Set(FIST.map(([x]) => x))];
const fistTop = (x: number) => Math.min(...FIST.filter(([fx]) => fx === x).map(([, y]) => y));
const fistBottom = (x: number) => Math.max(...FIST.filter(([fx]) => fx === x).map(([, y]) => y));
const HELD = WARDROBE2.gear.filter((g) => g.slot === 'weapon');
const SHIELDS = WARDROBE2.gear.filter((g) => g.slot === 'shield' && g.id !== 'spyglass');
const isBow = (g: Gear2) => /bow$/.test(g.id);
const partsAt = (g: Gear2, depth: number) =>
  g.parts.filter((p) => p.depth === depth).flatMap((p) => pixels(p).map(([x, y]): P => [x, y]));
const EVERYDAY = ['short_hair', 'teal_tunic', 'grey_trousers', 'leather_boots', 'leather_belt'];
const OUTFITS: readonly (readonly string[])[] = [
  EVERYDAY,
  [
    'short_hair',
    'linen_tunic',
    'linen_trousers',
    'leather_boots',
    'leather_belt',
    'linen_hood',
    'shell_bracelet',
  ],
  [...EVERYDAY, 'bronze_jerkin', 'bronze_cap', 'shell_necklace'],
  [...EVERYDAY, 'iron_mail', 'iron_nasal_helm', 'arrow_quiver'],
  [...EVERYDAY, 'leather_jerkin', 'leather_cap', 'leather_bracers', 'trollstone'],
  [...EVERYDAY, 'captains_coat', 'tricorn', 'hunters_charm', 'barbed_quiver'],
  [...EVERYDAY, 'knight_plate', 'knight_knees', 'red_cloak'],
];

describe('the hand rule at the C scale', () => {
  it('covers every held thing', () => {
    expect(HELD.map((g) => g.id).sort()).toEqual(
      [
        'boarding_axe',
        'brinebeards_anchor',
        'bronze_hatchet',
        'bronze_shortsword',
        'cudgel',
        'iron_arming_sword',
        'iron_bearded_axe',
        'knight_sword',
        'oak_shortbow',
        'pine_shortbow',
        'pirates_cutlass',
        'poachers_longbow',
        'smugglers_cutlass',
        'willow_shortbow',
      ].sort(),
    );
  });

  it('draws each in the grip and in front; behind only a bowstring, one straight column', () => {
    for (const held of HELD) {
      for (const part of held.parts)
        expect(
          [DEPTH.HELD_BEHIND, DEPTH.GRIP, DEPTH.HELD_FRONT, DEPTH.HELD_FRONT + 0.1],
          held.id,
        ).toContain(part.depth);
      expect(partsAt(held, DEPTH.GRIP).length, held.id).toBeGreaterThan(0);
      const behind = partsAt(held, DEPTH.HELD_BEHIND);
      if (!isBow(held)) expect(behind, held.id).toEqual([]);
      else expect(new Set(behind.map(([x]) => x)).size, held.id).toBe(1);
    }
  });

  it('runs every grip two columns wide through the fist, the fingers covering all of it', () => {
    for (const held of HELD) {
      const grip = partsAt(held, DEPTH.GRIP);
      expect(new Set(grip.map(([x]) => x)), held.id).toEqual(new Set(GRIP_X));
      for (const p of grip) expect(fistAt.has(key(p)), `${held.id} ${key(p)}`).toBe(true);
    }
  });

  it('shows the held thing directly above the fist and directly below it, never over it', () => {
    for (const held of HELD) {
      const front = new Set(
        [...partsAt(held, DEPTH.HELD_FRONT), ...partsAt(held, DEPTH.HELD_FRONT + 0.1)].map(key),
      );
      expect(
        FIST_COLUMNS.some((x) => front.has(key([x, fistTop(x) - 1]))),
        `${held.id} above`,
      ).toBe(true);
      expect(
        FIST_COLUMNS.some((x) => front.has(key([x, fistBottom(x) + 1]))),
        `${held.id} below`,
      ).toBe(true);
      for (const p of front) expect(fistAt.has(p), `${held.id} ${p}`).toBe(false);
    }
  });

  it('shows the whole fist and keeps the forearm clear of the weapon, in every outfit, with and without each shield', () => {
    const forearm = pixels(
      BODIES2.find((b) => b.id === 'standard')!.parts.find((p) => p.at[1] === 35 && p.depth === 2)!,
    );
    for (const held of HELD)
      for (const outfit of OUTFITS)
        for (const shield of [null, ...SHIELDS]) {
          const gear = [...outfit, held.id, ...(shield ? [shield.id] : [])];
          const g = dress2('standard', gear);
          for (const [x, y, c] of pixels(FIST2))
            expect(at(g, x, y), `${gear}: fist ${x},${y}`).toBe(c);
          // Above the wrist the forearm (in whatever sleeve) is not hidden by the weapon.
          const weapon = new Set(
            held.parts
              .filter((p) => p.depth >= DEPTH.HELD_FRONT)
              .flatMap((p) => pixels(p).map(([x, y]) => key([x, y]))),
          );
          const hidden = forearm.filter(([x, y]) => y < 38 && weapon.has(key([x, y])));
          expect(hidden.length, `${held.id} hides the forearm`).toBeLessThanOrEqual(2);
        }
  });

  it('hides the hand a shield is strapped to, and wraps the fingers round a spyglass', () => {
    const farHand = pixels(BODIES2[0]!.parts.find((p) => p.depth === DEPTH.HAND)!);
    for (const shield of SHIELDS) {
      const g = dress2('standard_at_ease', [...EVERYDAY, shield.id]);
      for (const [x, y] of farHand)
        expect(isMat(at(g, x, y), 'skin'), `${shield.id} ${x},${y}`).toBe(false);
    }
    const spy = dress2('standard_at_ease', [...EVERYDAY, 'spyglass']);
    const fingers = WARDROBE2.gear
      .find((g) => g.id === 'spyglass')!
      .parts.find((p) => p.depth > DEPTH.SHIELD)!;
    for (const [x, y, c] of pixels(fingers)) expect(at(spy, x, y)).toBe(c);
  });
});

// ------------------------------------------------------------- the ladder

const RUNGS = {
  linen: ['linen_hood', 'linen_tunic', 'linen_trousers'],
  leather: ['leather_cap', 'leather_jerkin', 'leather_bracers'],
  bronze: ['bronze_helmet', 'bronze_breastplate', 'bronze_shield', 'bronze_sword'],
  iron: ['iron_helmet', 'iron_breastplate', 'iron_shield', 'iron_sword'],
} as const;
const metal = (g: TGrid) =>
  count(g, (c) => ['bronze', 'iron', 'plate'].includes(matOf(c) as string));

describe('the gear ladder at the C scale', () => {
  it('makes each rung its own picture and each richer than the last', () => {
    const rungs = [
      grid(RUNGS.linen),
      grid(RUNGS.leather),
      grid(RUNGS.bronze),
      grid(RUNGS.iron),
      grid([], KNIGHT_GEAR2),
    ];
    for (let i = 1; i < rungs.length; i++)
      expect(differs(rungs[i]!, rungs[i - 1]!), `rung ${i}`).toBe(true);
    const [linen, leather, bronze, iron, knight] = rungs.map(metal) as [
      number,
      number,
      number,
      number,
      number,
    ];
    expect(linen).toBe(0);
    expect(leather).toBe(0);
    expect(bronze).toBeGreaterThan(40);
    expect(iron).toBeGreaterThan(bronze * 2);
    // From the knight on, a higher rung shows heavier metal, not more of it: polished plate, white where the light strikes.
    expect(knight).toBeGreaterThan(bronze);
    const glints = (g: TGrid) =>
      count(g, (c) => ['plate', 'iron'].includes(matOf(c) as string) && stepOf(c) === 0);
    expect(glints(rungs[4]!)).toBeGreaterThan(glints(rungs[3]!) * 1.5);
    // Colour arrives with the knight: a cloak, a painted shield, gilding.
    const trim = (g: TGrid) =>
      count(g, (c) => ['gold', 'crimson', 'blue'].includes(matOf(c) as string));
    expect(trim(rungs[4]!)).toBeGreaterThan(trim(rungs[3]!) + 300);
  });

  it('grows the shield and the reach from rung to rung', () => {
    const shown = (gear: string) =>
      count(dress2('standard_at_ease', [...EVERYDAY, gear]), (c) => c !== 0);
    const shieldSize = (id: string) =>
      WARDROBE2.gear.find((g) => g.id === id)!.parts.reduce((n, p) => n + pixels(p).length, 0);
    expect(shieldSize('bronze_buckler')).toBeLessThan(shieldSize('iron_heater_shield'));
    expect(shieldSize('iron_heater_shield')).toBeLessThan(shieldSize('kite_shield'));
    const tip = (id: string) =>
      Math.min(
        ...WARDROBE2.gear
          .find((g) => g.id === id)!
          .parts.flatMap((p) => pixels(p).map(([, y]) => y)),
      );
    expect(tip('iron_arming_sword')).toBeLessThan(tip('bronze_shortsword'));
    expect(tip('knight_sword')).toBeLessThan(tip('iron_arming_sword'));
    expect(shown('bronze_buckler')).toBeGreaterThan(0);
  });

  it('keeps tier 1 off the knight’s colours: no gold but the buckle, no cloak', () => {
    for (const rung of Object.values(RUNGS)) {
      const g = grid(rung);
      for (let y = 0; y < 72; y++)
        for (let x = 0; x < 56; x++)
          if (isMat(at(g, x, y), 'gold'))
            expect(x >= 26 && x <= 30 && y >= 36 && y <= 38, `${rung} ${x},${y}`).toBe(true);
      expect(count(grid(rung), (c) => isMat(c, 'crimson'))).toBe(0);
    }
  });

  it('keeps bronze and iron apart', () => {
    expect(count(grid(RUNGS.bronze), (c) => isMat(c, 'iron'))).toBe(0);
    expect(count(grid(RUNGS.iron), (c) => isMat(c, 'bronze'))).toBe(0);
  });
});

// ------------------------------------------------------------- townsfolk

describe('the townsfolk at the C scale', () => {
  it('answers to the town’s ids and the villagers’, and null to anything else', () => {
    expect(TOWNSFOLK2_IDS).toEqual([
      'smith',
      'trader',
      'pirate',
      'alewife',
      'market',
      'docker',
      'elder',
    ]);
    for (const id of TOWNSFOLK2_IDS) {
      const pic = townsfolkPicture2(id)!;
      expect([pic.grid.w, pic.grid.h], id).toEqual([56, 72]);
      for (let x = 0; x < 56; x++) expect(at(pic.grid, x, 71), id).toBe(0);
    }
    expect(townsfolkPicture2('nobody')).toBeNull();
    expect(townsfolkSprite2('nobody')).toBeNull();
    expect(townsfolkSprite2('smith', 'dusk')).toBe(townsfolkSprite2('smith', 'dusk'));
  });

  it('makes each an individual: no two alike, each in a skin and dyes of their own', () => {
    const pics = TOWNSFOLK2_IDS.map((id) => townsfolkPicture2(id)!.grid.d.join());
    expect(new Set(pics).size).toBe(pics.length);
    for (const f of FOLK2)
      expect(
        count(townsfolkPicture2(f.id)!.grid, (c) => isMat(c, f.skin as Mat)),
        f.id,
      ).toBeGreaterThan(40);
  });

  it('keeps every part inside the canvas, the soles on the sole row', () => {
    for (const f of FOLK2) {
      const ys = f.parts.flatMap((p) => pixels(p).map(([, y]) => y));
      const xs = f.parts.flatMap((p) => pixels(p).map(([x]) => x));
      expect(Math.max(...ys), f.id).toBe(FIGURE2_SOLE_Y - 1);
      expect(Math.min(...xs), f.id).toBeGreaterThanOrEqual(1);
      expect(Math.max(...xs), f.id).toBeLessThanOrEqual(54);
      expect(Math.min(...ys), f.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('mirrors their eyes about the centre column, but for the captain’s patch', () => {
    for (const id of TOWNSFOLK2_IDS) {
      const g = townsfolkPicture2(id)!.grid;
      const eyes: [number, number, number][] = [];
      for (let y = 0; y < 72; y++)
        for (let x = 0; x < 56; x++) if (isMat(at(g, x, y), 'eye')) eyes.push([x, y, at(g, x, y)]);
      if (id === 'pirate') {
        expect(eyes.length).toBe(6);
        expect([...new Set(eyes.filter(([, , c]) => stepOf(c) === 3).map(([x]) => x))]).toEqual([
          FIGURE2_ANCHOR_X + 3,
        ]);
        continue;
      }
      expect(eyes.length, id).toBe(12);
      for (const [x, y, c] of eyes)
        expect(at(g, 2 * FIGURE2_ANCHOR_X - x, y), `${id} ${x},${y}`).toBe(c);
    }
  });
});

describe('dressing', () => {
  it('refuses two things in one slot and unknown gear, as the current wardrobe does', () => {
    expect(() => partsOf('standard', ['teal_tunic', 'linen_tunic'])).toThrow();
    expect(() => partsOf('standard', ['nonsense'])).toThrow();
    expect(() => partsOf('nobody', [])).toThrow();
  });
});

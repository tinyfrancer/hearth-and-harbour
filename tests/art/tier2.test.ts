import { describe, expect, it } from 'vitest';
import {
  ITEM_LAYERS2,
  KNIGHT_GEAR2,
  STRIKE2_FRAMES,
  WALK2_FRAMES,
  characterPicture2,
  characterStrikePicture2,
  characterWalkPicture2,
} from '../../src/art/character2';
import { DEFAULT_LOOK, LOOK_CHOICES } from '../../src/art/character';
import { get, type Grid } from '../../src/art/grid';
import { itemIconPicture } from '../../src/art/icons';
import { WARDROBE2 } from '../../src/art/figure2/dress';
import { pixels } from '../../src/art/figure2/engine';
import { HAIR_COLOUR2 } from '../../src/art/figure2/look';
import { HEADGEAR_BACK, HEADGEAR_SIDE } from '../../src/art/figure2/sideHeads';
import { EDGE2 } from '../../src/art/figure2/edges';
import { CARRY } from '../../src/art/figure2/carry';
import { isMat, matOf, stepOf, type TGrid } from '../../src/art/town2/cells';
import { DAY2, DUSK2, type Mat } from '../../src/art/town2/ramps';
import { DAY, DUSK } from '../../src/art/palette';

// Tier 2 (B19; docs/tier2-manifest.md, docs/style-guide.md "Salt-iron"): every
// id the manifest names that needs a picture has one; salt-iron is a metal of
// its own; the knight is drawn in it and climbs the ladder from iron.

/** The manifest's ids that need an icon, as drawn so far (reconciled with the manifest batch by batch). */
const TIER2_ICONS = [
  'salt_iron_ore',
  'salt_iron_bar',
  'salt_iron_arrowheads',
  'salt_iron_sword',
  'salt_iron_axe',
  'salt_iron_helm',
  'salt_iron_plate',
  'salt_iron_greaves',
  'salt_iron_shield',
  'red_cloak',
  'salt_iron_arrows',
  'broadhead_arrows',
  // Batch 2.
  'driftwood',
  'elm_logs',
  'yew_logs',
  'raw_mackerel',
  'raw_halibut',
  'raw_swordfish',
  'silver_ore',
  'gold_ore',
  'sea_holly',
  'nettles',
  'sea_glass',
  'duskbloom',
  'cooked_mackerel',
  'cooked_halibut',
  'cooked_swordfish',
  'silver_bar',
  'gold_bar',
  'nettle_cloth',
  'thick_hide',
  'thick_leather',
  'holly_tonic',
  'forgehand_draught',
  'duskbloom_tincture',
  'twilight_elixir',
  'ranger_hood',
  'ranger_bracers',
  'ranger_coat',
  'driftwood_shortbow',
  'elm_longbow',
  'yew_longbow',
  'silver_bangle',
  'gold_amulet',
  'ogre_maul',
  'briar_charm',
  'mossback_shield',
  'amber',
  'thornwood_bow',
  'capguard_helm',
  'badger_crown',
];

/** The manifest's wearables, with the layer each is worn as. */
const TIER2_LAYERS: Readonly<Record<string, string>> = {
  salt_iron_sword: 'knight_sword',
  salt_iron_axe: 'saltiron_axe',
  salt_iron_helm: 'knight_helm',
  salt_iron_plate: 'knight_plate',
  salt_iron_greaves: 'knight_knees',
  salt_iron_shield: 'kite_shield',
  red_cloak: 'red_cloak',
  salt_iron_arrows: 'arrow_quiver',
  broadhead_arrows: 'barbed_quiver',
  ranger_hood: 'ranger_hood',
  ranger_coat: 'ranger_coat',
  ranger_bracers: 'ranger_bracers',
  driftwood_shortbow: 'driftwood_shortbow',
  elm_longbow: 'elm_longbow',
  yew_longbow: 'yew_longbow',
  thornwood_bow: 'thornwood_bow',
  silver_bangle: 'silver_bangle',
  gold_amulet: 'gold_amulet',
  briar_charm: 'briar_charm',
  ogre_maul: 'ogre_maul',
  mossback_shield: 'mossback_shield',
  capguard_helm: 'capguard_helm',
};

const KNIGHT = [
  'salt_iron_sword',
  'salt_iron_helm',
  'salt_iron_plate',
  'salt_iron_greaves',
  'salt_iron_shield',
  'red_cloak',
];
const FACINGS = ['down', 'right', 'left', 'up'] as const;
const count = (g: TGrid, test: (c: number) => boolean) => g.d.filter((c) => c && test(c)).length;
const at = (g: TGrid, x: number, y: number) => g.d[y * g.w + x]!;

/** CIE L*a*b* of a hex colour, for how far apart two colours look. */
function lab(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const deltaE = (a: string, b: string) => {
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

describe('salt-iron, tier 2’s metal', () => {
  it('stands apart from iron, bronze, gold and every hair colour, by day and at dusk', () => {
    for (const pal of [DAY2, DUSK2]) {
      const salt = pal.colours.saltiron;
      for (const other of ['iron', 'bronze', 'gold', ...Object.values(HAIR_COLOUR2)] as Mat[]) {
        const d = [1, 2, 3, 4].map((s) => deltaE(salt[s]!, pal.colours[other][s]!));
        expect(Math.min(...d), `${pal.name} ${other} ${d.map(Math.round)}`).toBeGreaterThan(12);
        expect(d.reduce((a, b) => a + b) / 4, `${pal.name} ${other}`).toBeGreaterThan(20);
      }
    }
  });

  it('is richer than iron: more colour, and more contrast from its bloom to its shadow', () => {
    const chroma = (hex: string) => Math.hypot(lab(hex)[1], lab(hex)[2]);
    for (const pal of [DAY2, DUSK2]) {
      const [salt, iron] = [pal.colours.saltiron, pal.colours.iron];
      const span = (r: readonly string[]) => lab(r[0]!)[0] - lab(r[4]!)[0];
      expect(span(salt), pal.name).toBeGreaterThan(span(iron));
      const mean = (r: readonly string[]) => [1, 2, 3].reduce((n, s) => n + chroma(r[s]!), 0) / 3;
      expect(mean(salt), pal.name).toBeGreaterThan(mean(iron));
      // Sea-green steel: its lit steps lean green-blue (a* below zero), never warm.
      for (const s of [1, 2, 3]) expect(lab(salt[s]!)[1], `${pal.name} ${s}`).toBeLessThan(0);
    }
  });

  it('is the same metal on the icons as on the figures', () => {
    for (const [pal, pal2] of [
      [DAY, DAY2],
      [DUSK, DUSK2],
    ] as const)
      for (let s = 1; s <= 4; s++)
        expect(pal.colours[`saltiron${s}` as 'saltiron1'], `${pal.name} ${s}`).toBe(
          pal2.colours.saltiron[s - 1],
        );
  });
});

describe('the knight in salt-iron', () => {
  it('maps the manifest’s salt-iron set onto the knight’s layers, and draws every one', () => {
    for (const [id, gear] of Object.entries(TIER2_LAYERS)) {
      expect(ITEM_LAYERS2[id], id).toBe(gear);
      expect(
        WARDROBE2.gear.find((g) => g.id === gear),
        id,
      ).toBeDefined();
    }
    // The old gear ids keep working, and the helm joined them.
    for (const id of ['knight_plate', 'knight_knees', 'red_cloak', 'kite_shield', 'knight_sword'])
      expect(KNIGHT_GEAR2).toContain(id);
    expect(KNIGHT_GEAR2).toContain('knight_helm');
  });

  it('draws his metal in salt-iron, never the old polished plate', () => {
    const metal = new Set<string>();
    for (const id of [...KNIGHT_GEAR2, 'saltiron_axe'])
      for (const p of WARDROBE2.gear.find((g) => g.id === id)!.parts)
        for (const [, , c] of pixels(p)) metal.add(matOf(c) as string);
    expect(metal.has('plate')).toBe(false);
    expect(metal.has('saltiron')).toBe(true);
    const worn = characterPicture2(DEFAULT_LOOK, KNIGHT).grid;
    expect(count(worn, (c) => isMat(c, 'plate'))).toBe(0);
    expect(count(worn, (c) => isMat(c, 'saltiron'))).toBeGreaterThan(900);
  });

  it('climbs the ladder from iron: more metal, polished, colour and gilding', () => {
    const iron = characterPicture2(DEFAULT_LOOK, [
      'iron_helmet',
      'iron_breastplate',
      'iron_shield',
      'iron_sword',
      'iron_greaves',
    ]).grid;
    const knight = characterPicture2(DEFAULT_LOOK, KNIGHT).grid;
    const metal = (g: TGrid) => count(g, (c) => ['iron', 'saltiron'].includes(matOf(c) as string));
    expect(metal(knight)).toBeGreaterThan(metal(iron));
    const glints = (g: TGrid) =>
      count(g, (c) => ['iron', 'saltiron'].includes(matOf(c) as string) && stepOf(c) === 0);
    expect(glints(knight)).toBeGreaterThan(glints(iron) * 1.5);
    expect(count(knight, (c) => isMat(c, 'gold'))).toBeGreaterThan(40);
  });

  it('wears plate over mail: no everyday tunic shows below his belt', () => {
    const g = characterPicture2(DEFAULT_LOOK, KNIGHT).grid;
    for (let y = 39; y < 50; y++)
      for (let x = 0; x < 56; x++) expect(isMat(at(g, x, y), 'teal'), `${x},${y}`).toBe(false);
  });

  it('shows salt-iron at the shins in every facing, walk and blow, and stops short of the boot', () => {
    for (const f of FACINGS) {
      for (let k = 0; k < WALK2_FRAMES; k += 2) {
        const g = characterWalkPicture2(DEFAULT_LOOK, ['salt_iron_greaves'], f, k).grid;
        let n = 0;
        for (let y = 49; y < 72; y++)
          for (let x = 0; x < 56; x++) if (isMat(at(g, x, y), 'saltiron')) n++;
        expect(n, `${f} ${k}`).toBeGreaterThan(f === 'up' ? 8 : 30);
      }
      for (let k = 0; k < STRIKE2_FRAMES; k++) {
        const g = characterStrikePicture2(DEFAULT_LOOK, ['salt_iron_greaves'], f, k).grid;
        expect(
          count(g, (c) => isMat(c, 'saltiron')),
          `${f} strike ${k}`,
        ).toBeGreaterThan(8);
      }
    }
    // Standing, the boot's leather shows below each plate.
    const g = characterPicture2(DEFAULT_LOOK, ['salt_iron_greaves']).grid;
    for (const x of [24, 32]) {
      let lowest = 0;
      for (let y = 0; y < 72; y++) if (isMat(at(g, x, y), 'saltiron')) lowest = y;
      expect(isMat(at(g, x, lowest + 2), 'leather'), `${x}`).toBe(true);
    }
  });
});

describe('the salt-iron helm', () => {
  const eyes = (g: TGrid) => count(g, (c) => isMat(c, 'eye'));
  it('keeps both eyes and the brows clear, in every look, standing and across', () => {
    for (const hair of LOOK_CHOICES.hair.map((h) => h.id)) {
      const bare = characterPicture2({ hair: 'bald' }, []).grid;
      const helmed = characterPicture2({ hair }, ['salt_iron_helm']).grid;
      expect(eyes(helmed), hair).toBe(eyes(bare));
      for (const f of ['right', 'left'] as const) {
        const a = characterWalkPicture2({ hair: 'bald' }, [], f, 0).grid;
        const b = characterWalkPicture2({ hair }, ['salt_iron_helm'], f, 0).grid;
        expect(eyes(b), `${hair} ${f}`).toBe(eyes(a));
      }
    }
    // Brows (row 11, the eyes' columns) are hair or skin, never helm.
    const g = characterPicture2(DEFAULT_LOOK, ['salt_iron_helm']).grid;
    for (const x of [25, 26, 27, 31, 32, 33])
      expect(isMat(at(g, x, 11), 'saltiron'), `${x}`).toBe(false);
  });

  it('changes the head’s outline: rounder, wider and higher than the guard’s cone, with an aventail', () => {
    const top = (g: TGrid) => {
      for (let y = 0; y < 72; y++) for (let x = 0; x < 56; x++) if (at(g, x, y)) return y;
      return 72;
    };
    const iron = characterPicture2(DEFAULT_LOOK, ['iron_helmet']).grid;
    const salt = characterPicture2(DEFAULT_LOOK, ['salt_iron_helm']).grid;
    expect(top(salt)).toBeLessThanOrEqual(top(iron));
    const wide = (g: TGrid, y: number) => {
      let n = 0;
      for (let x = 0; x < 56; x++) if (at(g, x, y)) n++;
      return n;
    };
    expect(wide(salt, 5)).toBeGreaterThan(wide(iron, 5));
    // The aventail's rings cover the neck under the chin.
    for (let x = 27; x <= 30; x++) expect(isMat(at(salt, x, 22), 'saltiron'), `${x}`).toBe(true);
    // A gilt band at the brow.
    expect(count(salt, (c) => isMat(c, 'gold'))).toBeGreaterThan(10);
  });

  it('is drawn in profile and from behind, its visor the furthest thing forward on the head', () => {
    expect(HEADGEAR_SIDE.knight_helm?.length).toBeGreaterThan(0);
    expect(HEADGEAR_BACK.knight_helm?.length).toBeGreaterThan(0);
    const side = characterWalkPicture2(DEFAULT_LOOK, ['salt_iron_helm'], 'right', 2).grid;
    const bare = characterWalkPicture2(DEFAULT_LOOK, [], 'right', 2).grid;
    const front = (g: TGrid) => {
      let m = 0;
      for (let y = 0; y < 12; y++) for (let x = 0; x < 56; x++) if (at(g, x, y)) m = Math.max(m, x);
      return m;
    };
    expect(front(side)).toBeGreaterThan(front(bare));
    const back = characterWalkPicture2(DEFAULT_LOOK, ['salt_iron_helm'], 'up', 0).grid;
    expect(count(back, (c) => isMat(c, 'saltiron'))).toBeGreaterThan(200);
  });
});

describe('the salt-iron axe', () => {
  it('keeps its bit forward and is carried low like the guard’s', () => {
    expect(EDGE2.saltiron_axe).toEqual({ edge: 'out', turn: 'flip' });
    expect(CARRY.saltiron_axe?.down).toBe(true);
  });

  it('is struck and walked with inside the canvas in every facing', () => {
    for (const f of FACINGS)
      for (let k = 0; k < STRIKE2_FRAMES; k++) {
        const g = characterStrikePicture2(DEFAULT_LOOK, ['salt_iron_axe'], f, k).grid;
        for (let i = 0; i < 56; i++) {
          expect(at(g, i, 0), `${f} ${k}`).toBe(0);
          expect(at(g, i, 71), `${f} ${k}`).toBe(0);
        }
        for (let j = 0; j < 72; j++) {
          expect(at(g, 0, j), `${f} ${k}`).toBe(0);
          expect(at(g, 55, j), `${f} ${k}`).toBe(0);
        }
        expect(
          count(g, (c) => isMat(c, 'saltiron')),
          `${f} ${k}`,
        ).toBeGreaterThan(10);
      }
  });
});

describe('tier 2’s icons', () => {
  const icon = (id: string): Grid => itemIconPicture(id)!.grid;
  const uses = (g: Grid, prefix: string) => {
    let n = 0;
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) if (get(g, x, y)?.startsWith(prefix)) n++;
    return n;
  };

  it('draws every id the manifest gives an icon, each its own picture', () => {
    const seen = new Set<string>();
    for (const id of TIER2_ICONS) {
      expect(itemIconPicture(id), id).not.toBeNull();
      const key = icon(id).d.join();
      expect(seen.has(key), id).toBe(false);
      seen.add(key);
    }
  });

  it('draws the salt-iron set in salt-iron, never iron’s grey or bronze', () => {
    for (const id of TIER2_ICONS.filter(
      (i) => i.startsWith('salt_iron') && i !== 'salt_iron_ore',
    )) {
      expect(uses(icon(id), 'saltiron'), id).toBeGreaterThan(8);
      expect(uses(icon(id), 'metal') + uses(icon(id), 'bronze'), id).toBe(0);
    }
  });

  it('reads ore and bar as one material: salt-iron in both, salt on both', () => {
    for (const id of ['salt_iron_ore', 'salt_iron_bar']) {
      expect(uses(icon(id), 'saltiron'), id).toBeGreaterThan(4);
      expect(uses(icon(id), 'white'), id).toBeGreaterThan(0);
    }
  });

  it('gives the knight’s pieces his colours: the kite blue and gold, the sword gilt, the cloak red', () => {
    expect(uses(icon('salt_iron_shield'), 'blue')).toBeGreaterThan(60);
    expect(uses(icon('salt_iron_shield'), 'gold')).toBeGreaterThan(20);
    expect(uses(icon('salt_iron_sword'), 'gold')).toBeGreaterThan(8);
    expect(uses(icon('red_cloak'), 'red')).toBeGreaterThan(150);
  });

  it('draws each tier 2 family beside its tier 1 kin: logs, the ingot, the vial, the bows', () => {
    const outline = (id: string) =>
      icon(id)
        .d.map((c) => (c ? 1 : 0))
        .join('');
    // Logs share the logs' drawing, bars the ingot, potions the shell vial (below its stopper).
    for (const id of ['elm_logs', 'yew_logs']) expect(outline(id), id).toBe(outline('oak_logs'));
    for (const id of ['silver_bar', 'gold_bar', 'salt_iron_bar'])
      expect(outline(id), id).toBe(outline('iron_bar'));
    const vial = (id: string) => outline(id).slice(24 * 9);
    for (const id of ['holly_tonic', 'forgehand_draught', 'duskbloom_tincture', 'twilight_elixir'])
      expect(vial(id), id).toBe(vial('sage_tonic'));
    // Raw fish stay cool, cooked fish warm.
    for (const id of ['raw_mackerel', 'raw_halibut', 'raw_swordfish'])
      expect(uses(icon(id), 'cooked'), id).toBe(0);
    for (const id of ['cooked_mackerel', 'cooked_halibut', 'cooked_swordfish']) {
      expect(uses(icon(id), 'cooked'), id).toBeGreaterThan(30);
      for (const raw of ['mackerel', 'halibut', 'swordfish'])
        expect(uses(icon(id), raw), id).toBe(0);
    }
  });

  it('gives each tier 2 potion its own liquid', () => {
    const liquids = ['holtonic', 'forge', 'dusklight', 'twilight'];
    ['holly_tonic', 'forgehand_draught', 'duskbloom_tincture', 'twilight_elixir'].forEach((id, i) =>
      liquids.forEach((l, j) => expect(uses(icon(id), l) > 0, `${id} ${l}`).toBe(i === j)),
    );
  });
});

describe('tier 2’s other wearables', () => {
  it('draws each in every facing, walking and striking, inside the canvas (the soles’ row kept clear)', () => {
    for (const id of Object.keys(TIER2_LAYERS).filter((i) => !KNIGHT.includes(i))) {
      const bare = characterPicture2(DEFAULT_LOOK, []).grid;
      const worn = characterPicture2(DEFAULT_LOOK, [id]).grid;
      expect(
        worn.d.some((c, i) => c !== bare.d[i]),
        id,
      ).toBe(true);
      for (const f of FACINGS)
        for (const pic of [
          characterWalkPicture2(DEFAULT_LOOK, [id], f, 2),
          characterStrikePicture2(DEFAULT_LOOK, [id], f, 2),
        ]) {
          const g = pic.grid;
          for (let i = 0; i < 56; i++) expect(at(g, i, 71), `${id} ${f}`).toBe(0);
          for (let j = 0; j < 72; j++) expect(at(g, 0, j) + at(g, 55, j), `${id} ${f}`).toBe(0);
        }
    }
  });

  it('wears the ranger’s hood as a hood: the hair that falls out of one, the face clear', () => {
    const eyes = (g: TGrid) => count(g, (c) => isMat(c, 'eye'));
    for (const hair of ['long', 'braid', 'short']) {
      const linen = characterPicture2({ hair }, ['linen_hood']).grid;
      const ranger = characterPicture2({ hair }, ['ranger_hood']).grid;
      // The same cut: where the linen hood is linen, the ranger's is his leather.
      expect(
        count(ranger, (c) => isMat(c, 'ranger')),
        hair,
      ).toBeGreaterThan(count(linen, (c) => isMat(c, 'linen')) - 40);
      expect(eyes(ranger), hair).toBe(eyes(characterPicture2({ hair }, []).grid));
    }
  });

  it('dyes the ranger’s coat the captain’s cut in leather, no brass, no purple', () => {
    const g = characterPicture2(DEFAULT_LOOK, ['ranger_coat']).grid;
    expect(count(g, (c) => isMat(c, 'ranger'))).toBeGreaterThan(300);
    expect(count(g, (c) => isMat(c, 'bronze') || isMat(c, 'midnight'))).toBe(0);
  });

  it('gives the longbows a head more than the shortbows, and the thornwood its thorns', () => {
    const tall = (id: string) => {
      const ys = WARDROBE2.gear
        .find((g) => g.id === id)!
        .parts.flatMap((p) => pixels(p).map(([, y]) => y));
      return Math.max(...ys) - Math.min(...ys);
    };
    for (const id of ['elm_longbow', 'yew_longbow', 'thornwood_bow'])
      expect(tall(id), id).toBeGreaterThan(tall('driftwood_shortbow') + 12);
    const thorny = WARDROBE2.gear
      .find((g) => g.id === 'thornwood_bow')!
      .parts.flatMap((p) => pixels(p))
      .filter(([, , c]) => isMat(c, 'thorn'));
    expect(thorny.length).toBeGreaterThan(40);
  });
});

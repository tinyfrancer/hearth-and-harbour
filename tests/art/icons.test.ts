import { describe, expect, it } from 'vitest';
import { get, type Grid } from '../../src/art/grid';
import { ICON_SIZE } from '../../src/art/iconKit';
import {
  ICON_FAMILIES,
  ITEM_ICON_IDS,
  SKILL_ICON_IDS,
  iconScale,
  itemIcon,
  itemIconPicture,
  skillIcon,
  skillIconPicture,
} from '../../src/art/icons';
import type { Shade } from '../../src/art/palette';

// The test's own copy of the game's ids (src/data/items.ts and skills.ts), so
// that art never imports the game and a missing icon fails here by name.
const ITEMS = [
  'pine_logs',
  'oak_logs',
  'willow_logs',
  'raw_shrimp',
  'raw_herring',
  'raw_cod',
  'copper_ore',
  'tin_ore',
  'iron_ore',
  'seashells',
  'flax',
  'sageleaf',
  'glowcap',
  'cooked_shrimp',
  'cooked_herring',
  'cooked_cod',
  'bronze_bar',
  'iron_bar',
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
  'bronze_arrowheads',
  'iron_arrowheads',
  'shell_vial',
  'bowstring',
  'linen',
  'shell_necklace',
  'shell_bracelet',
  'linen_hood',
  'linen_trousers',
  'linen_tunic',
  'arrow_shafts',
  'bronze_arrows',
  'iron_arrows',
  'pine_shortbow',
  'oak_shortbow',
  'willow_shortbow',
  'sage_tonic',
  'steady_draught',
  'glowcap_tincture',
  'midnight_oil',
  // S8's drops and the leather set, drawn in B5.
  'hide',
  'feathers',
  'pearl',
  'cudgel',
  'smuggled_tea',
  'smugglers_cutlass',
  'trollstone',
  'leather',
  'leather_bracers',
  'leather_cap',
  'leather_jerkin',
];

const SKILLS = [
  'woodcutting',
  'fishing',
  'mining',
  'foraging',
  'cooking',
  'smithing',
  'crafting',
  'fletching',
  'alchemy',
  // Lane A's combat skills (S8), drawn ahead of their arrival.
  'melee',
  'ranged',
  'defence',
  'vitality',
];

const cells = (g: Grid): Shade[] => g.d.filter((c): c is Shade => c !== null);
const steps = (g: Grid): Set<string> => new Set(cells(g));
const ramps = (g: Grid): Set<string> => new Set(cells(g).map((s) => s.replace(/\d$/, '')));

/** The drawn part's width and height, outline excluded. */
function drawnSize(g: Grid): [number, number] {
  let x0 = g.w;
  let y0 = g.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const c = get(g, x, y);
      if (c && c !== 'ink1') {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
    }
  return [x1 - x0 + 1, y1 - y0 + 1];
}

const item = (id: string): Grid => itemIconPicture(id)!.grid;

describe('item and skill icons', () => {
  it('draws every item and skill the game has', () => {
    for (const id of ITEMS) {
      expect(itemIconPicture(id), id).not.toBeNull();
      expect(itemIcon(id), id).toBeInstanceOf(HTMLCanvasElement);
    }
    for (const id of SKILLS) {
      expect(skillIconPicture(id), id).not.toBeNull();
      expect(skillIcon(id), id).toBeInstanceOf(HTMLCanvasElement);
    }
    expect([...ITEM_ICON_IDS].sort()).toEqual([...ITEMS].sort());
    expect([...SKILL_ICON_IDS].sort()).toEqual([...SKILLS].sort());
  });

  it('answers null, and never throws, for an id it does not know', () => {
    for (const id of ['bounty_charm', 'wolf_pelt', '', 'toString', '__proto__', 'constructor']) {
      expect(itemIcon(id), id).toBeNull();
      expect(skillIcon(id), id).toBeNull();
    }
    expect(skillIcon('pine_logs')).toBeNull();
    expect(itemIcon('woodcutting')).toBeNull();
  });

  it('gives no two things the same picture', () => {
    const seen = new Map<string, string>();
    const all = [
      ...ITEMS.map((id) => [id, item(id)] as const),
      ...SKILLS.map((id) => [id, skillIconPicture(id)!.grid] as const),
    ];
    for (const [id, g] of all) {
      const key = g.d.join(',');
      expect(seen.get(key), `${id} is the same picture as ${seen.get(key)}`).toBeUndefined();
      seen.set(key, id);
    }
  });

  it('is a 24 x 24 outlined object that fills most of its square', () => {
    for (const g of [...ITEMS.map(item), ...SKILLS.map((id) => skillIconPicture(id)!.grid)]) {
      expect([g.w, g.h]).toEqual([ICON_SIZE, ICON_SIZE]);
      const [w, h] = drawnSize(g);
      expect(Math.max(w, h)).toBeGreaterThanOrEqual(16);
      // The automatic outline: nothing but ink touches the edge of the square.
      for (let i = 0; i < ICON_SIZE; i++)
        for (const c of [get(g, i, 0), get(g, 0, i), get(g, i, 23), get(g, 23, i)])
          expect(c === null || c === 'ink1').toBe(true);
    }
  });

  it('puts every icon in exactly one family', () => {
    const listed = ICON_FAMILIES.flatMap((f) => f.ids.map((id) => `${f.kind}:${id}`));
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed.sort()).toEqual(
      [...ITEMS.map((id) => `item:${id}`), ...SKILLS.map((id) => `skill:${id}`)].sort(),
    );
  });

  it('is shown at a whole number of device pixels, about 32 CSS pixels across', () => {
    expect(iconScale(3)).toBe(4);
    expect(iconScale(2)).toBe(3);
    expect(iconScale(1)).toBe(1);
    expect(iconScale(2.625)).toBe(4);
    const canvas = itemIcon('pine_logs') as HTMLCanvasElement;
    const dpr = window.devicePixelRatio || 1;
    expect((parseFloat(canvas.style.width) * dpr) / canvas.width).toBeCloseTo(1, 6);
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('families read apart', () => {
  it('tells the three logs apart by bark and by cut wood', () => {
    // The two steps most of each log is drawn in (its bark) are its own.
    const main = ['pine_logs', 'oak_logs', 'willow_logs'].map((id) => {
      const count = new Map<string, number>();
      for (const c of cells(item(id))) if (c !== 'ink1') count.set(c, (count.get(c) ?? 0) + 1);
      return [...count.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([s]) => s);
    });
    expect(new Set(main.flat()).size).toBe(6);
    // And the cut ends differ: each log's lightest end step is used by no other log.
    const ends = ['pinewood1', 'wood1', 'willow1'];
    ['pine_logs', 'oak_logs', 'willow_logs'].forEach((id, i) => {
      for (const [j, end] of ends.entries()) expect(steps(item(id)).has(end), id).toBe(i === j);
    });
  });

  it('keeps raw fish cool and cooked food warm', () => {
    const raw = ['scales', 'herring', 'cod', 'shrimpraw'];
    for (const id of ['cooked_shrimp', 'cooked_herring', 'cooked_cod'])
      for (const r of raw) expect(ramps(item(id)).has(r), `${id} uses ${r}`).toBe(false);
    for (const id of ['raw_shrimp', 'raw_herring', 'raw_cod'])
      for (const r of ['cooked', 'shrimp'])
        expect(ramps(item(id)).has(r), `${id} uses ${r}`).toBe(false);
  });

  it('draws bronze gear without iron and iron gear without bronze', () => {
    for (const piece of ['axe', 'sword', 'helmet', 'shield', 'breastplate', 'bar', 'arrowheads']) {
      expect(ramps(item(`bronze_${piece}`)).has('metal'), `bronze_${piece}`).toBe(false);
      expect(ramps(item(`iron_${piece}`)).has('bronze'), `iron_${piece}`).toBe(false);
    }
  });

  it('gives each potion its own liquid and its own stopper', () => {
    const potions = ['sage_tonic', 'steady_draught', 'glowcap_tincture', 'midnight_oil'];
    const liquids = ['tonic', 'draught', 'tincture', 'midnight'];
    potions.forEach((id, i) => {
      for (const [j, liquid] of liquids.entries())
        expect(ramps(item(id)).has(liquid), `${id} and ${liquid}`).toBe(i === j);
    });
    // The tops differ: the first rows of each drawing are not all the same.
    const tops = potions.map((id) =>
      item(id)
        .d.slice(0, ICON_SIZE * 6)
        .join(','),
    );
    expect(new Set(tops).size).toBe(potions.length);
  });

  it('makes the bronze hatchet the same object as the one worn: a wedge with a bright bit', () => {
    const g = item('bronze_axe');
    const head: [number, number, Shade][] = [];
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        const c = get(g, x, y);
        if (c?.startsWith('bronze')) head.push([x, y, c]);
      }
    const rows = new Map<number, number[]>();
    for (const [x, y] of head) rows.set(y, [...(rows.get(y) ?? []), x]);
    const ys = [...rows.keys()].sort((a, b) => a - b);
    // A solid head, taller than a bar and as heavy as a hatchet's should be.
    expect(ys.length).toBeGreaterThanOrEqual(7);
    expect(head.length).toBeGreaterThanOrEqual(50);
    // Every row of the head is solid, with no gap: a wedge, not a hook.
    for (const y of ys) {
      const xs = rows.get(y)!;
      expect(Math.max(...xs) - Math.min(...xs) + 1, `row ${y}`).toBe(xs.length);
    }
    // The bit is on the left, edged in the polished step, and curved.
    for (const y of ys) {
      const left = Math.min(...rows.get(y)!);
      expect(get(g, left, y), `row ${y}`).toBe('bronze5');
    }
    const lefts = ys.map((y) => Math.min(...rows.get(y)!));
    expect(lefts[0]!).toBeGreaterThan(Math.min(...lefts));
    expect(lefts[lefts.length - 1]!).toBeGreaterThan(Math.min(...lefts));
    // A little haft shows above the head, as on the character.
    const top = Math.min(...ys);
    const wood = (y: number) =>
      [...Array(g.w).keys()].some((x) => get(g, x, y)?.startsWith('wood'));
    expect(wood(top - 1)).toBe(true);
  });
});

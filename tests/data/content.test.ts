import { describe, expect, it } from 'vitest';
import { SLOTS } from '../../src/core/content';
import { MAX_LEVEL } from '../../src/core/xp';
import { CONTENT } from '../../src/data';

// The tables are typed, but a type cannot see a typo in an id.
describe('the content tables', () => {
  it('keys every row by its own id', () => {
    for (const table of [CONTENT.skills, CONTENT.items, CONTENT.actions]) {
      for (const [key, row] of Object.entries(table)) {
        expect(row.id).toBe(key);
      }
    }
  });

  it('has actions that point at real skills and items, with sane numbers', () => {
    for (const action of Object.values(CONTENT.actions)) {
      expect(CONTENT.skills[action.skill], action.id).toBeDefined();
      expect(action.level).toBeGreaterThanOrEqual(1);
      expect(action.level).toBeLessThanOrEqual(MAX_LEVEL);
      expect(action.durationMs).toBeGreaterThan(0);
      expect(action.xp).toBeGreaterThan(0);
      expect(action.gives.length).toBeGreaterThan(0);
      for (const { item, qty } of action.gives) {
        expect(CONTENT.items[item], `${action.id} gives ${item}`).toBeDefined();
        expect(Number.isInteger(qty) && qty > 0).toBe(true);
      }
    }
  });

  it('has recipes that use real items, each of which something makes', () => {
    const made = new Set(
      Object.values(CONTENT.actions).flatMap((action) => action.gives.map(({ item }) => item)),
    );
    for (const action of Object.values(CONTENT.actions)) {
      for (const { item, qty } of action.uses ?? []) {
        expect(CONTENT.items[item], `${action.id} uses ${item}`).toBeDefined();
        expect(made.has(item), `nothing makes ${item}`).toBe(true);
        expect(Number.isInteger(qty) && qty > 0).toBe(true);
      }
    }
  });

  it('has potions that help real skills, in whole numbers, and that something brews', () => {
    const potions = Object.values(CONTENT.items).filter((item) => item.potion);
    expect(potions.length).toBeGreaterThanOrEqual(3);
    for (const item of potions) {
      const { charges, skills, effect } = item.potion!;
      expect(Number.isInteger(charges) && charges > 0, item.id).toBe(true);
      expect(skills.length, item.id).toBeGreaterThan(0);
      for (const skill of skills) {
        expect(CONTENT.skills[skill], `${item.id} helps ${skill}`).toBeDefined();
      }
      const amount = effect.kind === 'extra' ? effect.every : effect.percent;
      expect(Number.isInteger(amount) && amount > 0, item.id).toBe(true);
      if (effect.kind === 'speed') expect(effect.percent).toBeLessThan(100);
      // An extra item from a recipe would be something made from nothing.
      if (effect.kind === 'extra') {
        for (const skill of skills) {
          const recipes = Object.values(CONTENT.actions).filter(
            (action) => action.skill === skill && action.uses?.length,
          );
          expect(recipes, `${item.id} doubles ${skill}'s recipes`).toEqual([]);
        }
      }
      const brewedBy = Object.values(CONTENT.actions).filter((action) =>
        action.gives.some((entry) => entry.item === item.id),
      );
      expect(brewedBy.length, `nothing makes ${item.id}`).toBeGreaterThan(0);
    }
  });

  it('gives every wearable made so far a slot and whole, sensible numbers', () => {
    const wearable = [
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
      'linen_hood',
      'linen_tunic',
      'linen_trousers',
      'shell_necklace',
      'shell_bracelet',
      'pine_shortbow',
      'oak_shortbow',
      'willow_shortbow',
      'bronze_arrows',
      'iron_arrows',
    ];
    for (const id of wearable) {
      expect(CONTENT.items[id]?.equip, id).toBeDefined();
    }
    for (const item of Object.values(CONTENT.items)) {
      const def = item.equip;
      if (!def) continue;
      expect(SLOTS, item.id).toContain(def.slot);
      if (def.twoHanded) expect(def.slot, item.id).toBe('main_hand');
      if (def.slot === 'main_hand') expect(def.style, `${item.id} needs a style`).toBeDefined();
      for (const amount of [def.attack ?? 0, def.strength ?? 0, def.armour ?? 0]) {
        expect(Number.isInteger(amount) && amount >= 0, item.id).toBe(true);
      }
    }
    expect(CONTENT.items.pine_shortbow?.equip).toMatchObject({ twoHanded: true, style: 'ranged' });
    expect(CONTENT.items.bronze_arrows?.equip).toMatchObject({ slot: 'ammo', style: 'ranged' });
  });

  it('makes iron clearly better than bronze, and cloth a poor sort of armour', () => {
    const sum = (id: string): number => {
      const def = CONTENT.items[id]!.equip!;
      return (def.attack ?? 0) + (def.strength ?? 0) + (def.armour ?? 0);
    };
    for (const piece of ['sword', 'axe', 'helmet', 'shield', 'breastplate', 'arrows']) {
      expect(sum(`iron_${piece}`), piece).toBeGreaterThanOrEqual(sum(`bronze_${piece}`) * 1.5);
    }
    for (const [cloth, metal] of [
      ['linen_hood', 'bronze_helmet'],
      ['linen_tunic', 'bronze_breastplate'],
    ] as const) {
      expect(sum(cloth) * 3, cloth).toBeLessThanOrEqual(sum(metal));
    }
  });

  it('groups every action of a skill or none of them', () => {
    for (const skill of Object.values(CONTENT.skills)) {
      const actions = Object.values(CONTENT.actions).filter((a) => a.skill === skill.id);
      const grouped = actions.filter((action) => action.group);
      expect([0, actions.length], skill.id).toContain(grouped.length);
    }
    const smithing = Object.values(CONTENT.actions).filter((a) => a.skill === 'smithing');
    expect([...new Set(smithing.map((action) => action.group))]).toEqual([
      'Bars',
      'Bronze',
      'Iron',
    ]);
  });

  it('gives every skill something to do at level 1', () => {
    for (const skill of Object.values(CONTENT.skills)) {
      const first = Object.values(CONTENT.actions).filter(
        (action) => action.skill === skill.id && action.level === 1,
      );
      expect(first.length, skill.id).toBeGreaterThan(0);
    }
  });
});

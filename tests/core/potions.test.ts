import { describe, expect, it } from 'vitest';
import { actionDuration } from '../../src/core/actions';
import type { Content } from '../../src/core/content';
import { activePotion, drinkPotion, extrasIn, potionFor } from '../../src/core/potions';
import { newGame } from '../../src/core/state';

const content: Content = {
  skills: {
    digging: { id: 'digging', name: 'Digging', verb: 'Digging', group: 'Gathering' },
    baking: { id: 'baking', name: 'Baking', verb: 'Baking', group: 'Artisan' },
  },
  items: {
    mud: { id: 'mud', name: 'Mud', description: '', value: 1 },
    quick: {
      id: 'quick',
      name: 'Quick',
      description: '',
      value: 1,
      potion: { charges: 30, skills: ['digging'], effect: { kind: 'speed', percent: 20 } },
    },
    clever: {
      id: 'clever',
      name: 'Clever',
      description: '',
      value: 1,
      potion: { charges: 50, skills: ['digging', 'baking'], effect: { kind: 'xp', percent: 10 } },
    },
  },
  actions: {
    dig: {
      id: 'dig',
      skill: 'digging',
      name: 'Dig',
      level: 1,
      durationMs: 1000,
      xp: 5,
      gives: [{ item: 'mud', qty: 1 }],
    },
    bake: {
      id: 'bake',
      skill: 'baking',
      name: 'Bake',
      level: 1,
      durationMs: 2000,
      xp: 5,
      gives: [{ item: 'mud', qty: 1 }],
    },
  },
};
const stocked = { ...newGame('Cody', 0), bank: { quick: 2, clever: 1, mud: 4 } };
const drink = (state: typeof stocked, item: string) => {
  const result = drinkPotion(state, item, content);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};

describe('drinking a potion', () => {
  it('takes one from the bank and gives its charges', () => {
    const state = drink(stocked, 'quick');
    expect(state.bank).toEqual({ quick: 1, clever: 1, mud: 4 });
    expect(state.potion).toEqual({ item: 'quick', charges: 30 });
  });

  it('removes the stack it empties', () => {
    expect(drink(stocked, 'clever').bank).toEqual({ quick: 2, mud: 4 });
  });

  it('replaces the potion that was working, charges and all', () => {
    const state = drink({ ...stocked, potion: { item: 'quick', charges: 3 } }, 'clever');
    expect(state.potion).toEqual({ item: 'clever', charges: 50 });
    // The same potion again starts it afresh.
    const again = drink({ ...stocked, potion: { item: 'quick', charges: 3 } }, 'quick');
    expect(again.potion).toEqual({ item: 'quick', charges: 30 });
  });

  it('refuses what is not a potion, and a potion not held', () => {
    expect(drinkPotion(stocked, 'mud', content)).toEqual({
      ok: false,
      reason: 'That is not something to drink.',
    });
    expect(drinkPotion(newGame('Cody', 0), 'quick', content)).toEqual({
      ok: false,
      reason: 'You have none of those.',
    });
  });

  it('never changes the state it was given', () => {
    const before = structuredClone(stocked);
    drink(stocked, 'quick');
    expect(stocked).toEqual(before);
  });
});

describe('which actions a potion helps', () => {
  const dig = content.actions.dig!;
  const bake = content.actions.bake!;

  it('helps only the skills it lists', () => {
    const quick = drink(stocked, 'quick');
    expect(potionFor(quick, dig, content)?.effect.kind).toBe('speed');
    expect(potionFor(quick, bake, content)).toBeNull();
    const clever = drink(stocked, 'clever');
    expect(potionFor(clever, bake, content)?.effect.kind).toBe('xp');
  });

  it('shows in how long an action takes', () => {
    expect(actionDuration(stocked, dig, content)).toBe(1000);
    expect(actionDuration(drink(stocked, 'quick'), dig, content)).toBe(800);
    expect(actionDuration(drink(stocked, 'quick'), bake, content)).toBe(2000);
  });

  it('does nothing if the tables no longer hold it', () => {
    const orphan = { ...stocked, potion: { item: 'gone', charges: 5 } };
    expect(activePotion(orphan, content)).toBeNull();
    expect(potionFor(orphan, dig, content)).toBeNull();
  });
});

describe('extrasIn', () => {
  it('counts the charges used that are multiples of the step', () => {
    // From 10 charges, using 10: charges 10, 5 → 2.
    expect(extrasIn(10, 10, 5)).toBe(2);
    // From 10, using 4: charges 10, 9, 8, 7 → only 10.
    expect(extrasIn(10, 4, 5)).toBe(1);
    // From 9, using 4: 9, 8, 7, 6 → none.
    expect(extrasIn(9, 4, 5)).toBe(0);
  });

  it('adds up the same however the charges are split', () => {
    for (let first = 0; first <= 23; first += 1) {
      expect(extrasIn(23, first, 4) + extrasIn(23 - first, 23 - first, 4)).toBe(
        extrasIn(23, 23, 4),
      );
    }
  });
});

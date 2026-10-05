import { describe, expect, it } from 'vitest';
import { settleRun } from '../../src/core/run';
import { newGame, type GameState } from '../../src/core/state';

const base: GameState = {
  ...newGame('Cody', 0),
  skills: { melee: 100 },
  bank: { hide: 2 },
  coins: 10,
  food: { item: 'cooked_shrimp', qty: 5 },
  equipment: { ammo: { item: 'bronze_arrows', qty: 30 }, head: { item: 'bronze_helmet', qty: 1 } },
};

describe('settleRun', () => {
  it('pays in XP, loot and coins, and takes what was eaten and shot, in one change', () => {
    const after = settleRun(base, {
      xp: { melee: 250, vitality: 60 },
      loot: { hide: 3, pearl: 1 },
      coins: 45,
      foodEaten: 2,
      arrowsUsed: 12,
    });
    expect(after.skills).toEqual({ melee: 350, vitality: 60 });
    expect(after.bank).toEqual({ hide: 5, pearl: 1 });
    expect(after.coins).toBe(55);
    expect(after.food).toEqual({ item: 'cooked_shrimp', qty: 3 });
    expect(after.equipment.ammo).toEqual({ item: 'bronze_arrows', qty: 18 });
    expect(after.equipment.head).toEqual(base.equipment.head);
  });

  it('empties a slot on the last one, and never takes more than was carried', () => {
    const after = settleRun(base, { foodEaten: 99, arrowsUsed: 30 });
    expect(after.food).toBeNull();
    expect(after.equipment).toEqual({ head: { item: 'bronze_helmet', qty: 1 } });
  });

  it('counts amounts that are not whole and positive as nothing', () => {
    const after = settleRun(base, {
      xp: { melee: -5, ranged: Number.NaN },
      loot: { hide: 0.9, pearl: -1 },
      coins: -100,
      foodEaten: -3,
      arrowsUsed: Number.POSITIVE_INFINITY,
    });
    expect(after.skills).toEqual(base.skills);
    expect(after.bank).toEqual(base.bank);
    expect(after.coins).toBe(10);
    expect(after.food).toEqual(base.food);
    expect(after.equipment).toEqual(base.equipment);
  });

  it('leaves the idle task, the dice and the state it was given alone', () => {
    const busy = { ...base, action: { id: 'chop_pine', progressMs: 700 } };
    const before = structuredClone(busy);
    const after = settleRun(busy, { loot: { hide: 1 }, foodEaten: 1, arrowsUsed: 1 });
    expect(busy).toEqual(before);
    expect(after.action).toEqual(busy.action);
    expect(after.rng).toBe(busy.rng);
    expect(after.fight).toBe(busy.fight);
  });

  it('settles an empty-handed run without complaint', () => {
    const bare = newGame('Cody', 0);
    expect(settleRun(bare, { foodEaten: 3, arrowsUsed: 3 })).toEqual(bare);
    expect(settleRun(bare, {})).toEqual(bare);
  });
});

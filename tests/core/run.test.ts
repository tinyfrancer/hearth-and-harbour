import { describe, expect, it } from 'vitest';
import type { Content, MonsterDef } from '../../src/core/content';
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

const monster = (id: string): MonsterDef => ({
  id,
  name: id,
  description: '',
  area: 'shore',
  level: 1,
  hp: 10,
  attack: 1,
  defence: 1,
  maxHit: 1,
  speedMs: 1000,
  coins: [0, 0],
  always: [],
  rare: [],
  bounty: { kills: [5, 5], points: 1 },
});

const tables: Content = {
  skills: {},
  items: {},
  actions: {},
  monsters: { rat: monster('rat'), crab: monster('crab') },
  dungeons: { cove: { id: 'cove', name: 'The Cove', loot: [] } },
};

describe('settleRun: kills and clears', () => {
  const known: GameState = {
    ...newGame('Cody', 0),
    bestiary: { rat: { kills: 4, seen: ['hide'] } },
    bounty: { monster: 'rat', count: 10, done: 7 },
  };

  it('counts kills towards the bestiary and the bounty held, as idle kills do', () => {
    const after = settleRun(known, { kills: { rat: 2, crab: 3 } }, tables);
    expect(after.bestiary).toEqual({
      rat: { kills: 6, seen: ['hide'] },
      crab: { kills: 3, seen: [] },
    });
    expect(after.bounty).toEqual({ monster: 'rat', count: 10, done: 9 });
  });

  it('counts a bounty up to what it asks and no further, and only for its own monster', () => {
    const after = settleRun(known, { kills: { rat: 12 } }, tables);
    expect(after.bounty).toEqual({ monster: 'rat', count: 10, done: 10 });
    expect(after.bestiary.rat!.kills).toBe(16);
    expect(settleRun(known, { kills: { crab: 9 } }, tables).bounty).toBe(known.bounty);
  });

  it('counts kills of a monster the tables do not hold, and odd amounts, as nothing', () => {
    const after = settleRun(
      known,
      { kills: { deckhand: 5, rat: -2, crab: 0.5, ['__proto__']: 3 } },
      tables,
    );
    expect(after.bestiary).toBe(known.bestiary);
    expect(after.bounty).toBe(known.bounty);
  });

  it('keeps a clear and the best time, and counts a clear without a time', () => {
    const once = settleRun(known, { cleared: 'cove', timeMs: 420_000 }, tables);
    expect(once.dungeons).toEqual({ cove: { clears: 1, bestMs: 420_000 } });
    const slower = settleRun(once, { cleared: 'cove', timeMs: 500_000 }, tables);
    expect(slower.dungeons).toEqual({ cove: { clears: 2, bestMs: 420_000 } });
    const faster = settleRun(slower, { cleared: 'cove', timeMs: 390_500.7 }, tables);
    expect(faster.dungeons).toEqual({ cove: { clears: 3, bestMs: 390_500 } });
    const untimed = settleRun(faster, { cleared: 'cove' }, tables);
    expect(untimed.dungeons).toEqual({ cove: { clears: 4, bestMs: 390_500 } });
    expect(settleRun(known, { cleared: 'cove' }, tables).dungeons).toEqual({
      cove: { clears: 1 },
    });
  });

  it('records no clear of a dungeon the tables do not hold, or of a run that did not clear', () => {
    expect(settleRun(known, { cleared: 'atlantis', timeMs: 1 }, tables).dungeons).toEqual({});
    expect(settleRun(known, { timeMs: 300_000 }, tables).dungeons).toEqual({});
  });

  it('counts neither without the tables, and rolls no dice either way', () => {
    const spoils = { kills: { rat: 2 }, cleared: 'cove', timeMs: 1000 };
    const bare = settleRun(known, spoils);
    expect(bare.bestiary).toBe(known.bestiary);
    expect(bare.dungeons).toEqual({});
    expect(settleRun(known, spoils, tables).rng).toBe(known.rng);
    // The same spoils settle the same way every time.
    expect(settleRun(known, spoils, tables)).toEqual(settleRun(known, spoils, tables));
  });
});

import { describe, expect, it } from 'vitest';
import type { Content, DungeonDef } from '../../src/core/content';
import { dungeonStatus, dungeonsInOrder, mayEnter } from '../../src/core/dungeons';
import { settleRun } from '../../src/core/run';
import { newGame, type GameState } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';
import { CONTENT } from '../../src/data';

const row = (id: string, order: number, extra: Partial<DungeonDef> = {}): DungeonDef => ({
  id,
  name: id,
  description: '',
  order,
  recommended: 1,
  unlock: { kind: 'none' },
  unlockText: `Rule for ${id}.`,
  loot: [],
  ...extra,
});

const tables: Content = {
  skills: {},
  items: { sword: { id: 'sword', name: 'Sword', description: '', value: 1 } },
  actions: {},
  // Out of order in the table, so the chart's order shows.
  dungeons: {
    keep: row('keep', 3, { unlock: { kind: 'combat', level: 10 }, recommended: 12 }),
    cave: row('cave', 1, { firstClear: [{ item: 'sword', qty: 1 }] }),
    cove: row('cove', 2, { unlock: { kind: 'cleared', dungeon: 'cave' } }),
    later: row('later', 4, { comingSoon: true, unlock: { kind: 'none' } }),
  },
};

const fresh = (): GameState => newGame('Cody', 0);
const fighter = (level: number): GameState => {
  const xp = xpForLevel(level);
  return { ...fresh(), skills: { melee: xp, defence: xp, vitality: xp } };
};

describe('dungeonStatus', () => {
  it('opens a dungeon with no rule from the start, and says what its rule is', () => {
    expect(dungeonStatus(fresh(), 'cave', tables)).toEqual({
      id: 'cave',
      state: 'open',
      unlock: 'Rule for cave.',
      recommended: 1,
      clears: 0,
    });
  });

  it('locks one behind a first clear until that dungeon is cleared', () => {
    expect(dungeonStatus(fresh(), 'cove', tables)?.state).toBe('locked');
    const cleared = settleRun(fresh(), { cleared: 'cave', timeMs: 95_000 }, tables);
    expect(dungeonStatus(cleared, 'cove', tables)?.state).toBe('open');
    expect(dungeonStatus(cleared, 'cave', tables)).toMatchObject({
      state: 'cleared',
      clears: 1,
      bestMs: 95_000,
    });
  });

  it('locks one behind a combat level until the character reaches it', () => {
    expect(dungeonStatus(fighter(9), 'keep', tables)?.state).toBe('locked');
    expect(dungeonStatus(fighter(10), 'keep', tables)?.state).toBe('open');
  });

  it('never opens a landing to come, whatever is done, nor counts a clear of it', () => {
    expect(dungeonStatus(fighter(99), 'later', tables)?.state).toBe('soon');
    const tried = settleRun(fresh(), { cleared: 'later' }, tables);
    expect(tried.dungeons).toEqual({});
    expect(mayEnter(tried, 'later', tables)).toBe(false);
  });

  it('knows nothing of an id the tables do not hold', () => {
    expect(dungeonStatus(fresh(), 'atlantis', tables)).toBeNull();
    expect(dungeonStatus(fresh(), 'constructor', tables)).toBeNull();
    expect(mayEnter(fresh(), 'atlantis', tables)).toBe(false);
  });

  it('lets the boat go to open and cleared dungeons only', () => {
    const cleared = settleRun(fresh(), { cleared: 'cave' }, tables);
    expect(['cave', 'cove', 'keep'].map((id) => mayEnter(fresh(), id, tables))).toEqual([
      true,
      false,
      false,
    ]);
    expect(['cave', 'cove'].map((id) => mayEnter(cleared, id, tables))).toEqual([true, true]);
  });

  it('lists the chart in its order, not the table’s', () => {
    expect(dungeonsInOrder(tables).map((d) => d.id)).toEqual(['cave', 'cove', 'keep', 'later']);
  });

  it('shows the real chart to a new character: the cave and the grotto open, the rest to come', () => {
    const states = dungeonsInOrder(CONTENT).map(
      (d) => `${d.id} ${dungeonStatus(fresh(), d.id, CONTENT)!.state}`,
    );
    expect(states).toEqual([
      'tidepool_cave open',
      'brinebeards_grotto open',
      'thistlewood_burrow soon',
      'unknown_2 soon',
      'unknown_3 soon',
    ]);
  });
});

describe('a first clear', () => {
  it('pays its reward once, with the run’s own loot, and never again', () => {
    const first = settleRun(fresh(), { cleared: 'cave', loot: { sword: 2 } }, tables);
    expect(first.bank).toEqual({ sword: 3 });
    const second = settleRun(first, { cleared: 'cave' }, tables);
    expect(second.bank).toEqual({ sword: 3 });
    expect(second.dungeons.cave?.clears).toBe(2);
  });

  it('pays nothing for a run that did not clear', () => {
    expect(settleRun(fresh(), { loot: { sword: 1 } }, tables).bank).toEqual({ sword: 1 });
  });

  it('gives a new character a bronze sword and five shrimp for the cave', () => {
    const after = settleRun(fresh(), { cleared: 'tidepool_cave', coins: 9 }, CONTENT);
    expect(after.bank).toEqual({ bronze_sword: 1, cooked_shrimp: 5 });
    expect(after.coins).toBe(9);
  });
});

describe("the cave's rats and crabs", () => {
  it('are the shore’s own: one bestiary entry, a bounty on them counted, drops seen', () => {
    const hunting: GameState = {
      ...fresh(),
      bestiary: { dock_rat: { kills: 10, seen: [] } },
      bounty: { monster: 'dock_rat', count: 12, done: 3, points: 5 },
    };
    const after = settleRun(
      hunting,
      {
        kills: { dock_rat: 2, sand_crab: 2, old_snapper: 1 },
        dropped: { dock_rat: ['hide'], sand_crab: ['seashells'], old_snapper: ['seashells'] },
      },
      CONTENT,
    );
    expect(after.bestiary.dock_rat).toEqual({ kills: 12, seen: ['hide'] });
    expect(after.bestiary.sand_crab).toEqual({ kills: 2, seen: ['seashells'] });
    expect(after.bestiary.old_snapper).toEqual({ kills: 1, seen: ['seashells'] });
    expect(after.bounty?.done).toBe(5);
  });
});

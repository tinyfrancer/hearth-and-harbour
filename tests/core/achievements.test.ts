import { describe, expect, it } from 'vitest';
import { award, meets, takeStock, totalLevel } from '../../src/core/achievements';
import type { AchievementRule, Content } from '../../src/core/content';
import { newGame, type GameState } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';

const skill = (id: string, group: string) => ({ id, name: id, verb: id, group });
const content: Content = {
  skills: {
    digging: skill('digging', 'Gathering'),
    fishing: skill('fishing', 'Gathering'),
    baking: skill('baking', 'Artisan'),
  },
  items: {
    mud: { id: 'mud', name: 'Mud', description: '', value: 1 },
    gem: { id: 'gem', name: 'Gem', description: '', value: 1 },
    hat: { id: 'hat', name: 'Hat', description: '', value: 1 },
  },
  actions: {},
  achievements: {
    muddy: { id: 'muddy', name: 'Muddy', text: '', rule: { kind: 'found', items: ['mud'] } },
    digger: {
      id: 'digger',
      name: 'Digger',
      text: '',
      rule: { kind: 'level', level: 10, skill: 'digging' },
    },
    rich: {
      id: 'rich',
      name: 'Rich',
      text: '',
      hidden: true,
      rule: { kind: 'coins', amount: 100 },
    },
  },
};

const at = (extra: Partial<GameState> = {}): GameState => ({ ...newGame('Cody', 0), ...extra });
const level = (n: number) => xpForLevel(n);
const check = (rule: AchievementRule, state: GameState) => meets(state, rule, content);

describe('what an achievement asks', () => {
  it('reads levels: one skill, any of a group, any at all, or all of a group', () => {
    const state = at({ skills: { digging: level(12), fishing: level(4) } });
    expect(check({ kind: 'level', level: 10, skill: 'digging' }, state)).toBe(true);
    expect(check({ kind: 'level', level: 10, skill: 'fishing' }, state)).toBe(false);
    expect(check({ kind: 'level', level: 10, group: 'Gathering' }, state)).toBe(true);
    expect(check({ kind: 'level', level: 10, group: 'Artisan' }, state)).toBe(false);
    expect(check({ kind: 'level', level: 12 }, state)).toBe(true);
    expect(check({ kind: 'level', level: 13 }, state)).toBe(false);
    expect(check({ kind: 'level', level: 4, group: 'Gathering', all: true }, state)).toBe(true);
    expect(check({ kind: 'level', level: 5, group: 'Gathering', all: true }, state)).toBe(false);
    // Every one of no skills at all is not an achievement.
    expect(check({ kind: 'level', level: 1, group: 'Nothing', all: true }, state)).toBe(false);
  });

  it('adds up every skill in the tables for a total, untrained ones as 1', () => {
    const state = at({ skills: { digging: level(12), fishing: level(4), lost: level(50) } });
    expect(totalLevel(state, content)).toBe(17);
    expect(check({ kind: 'total', level: 17 }, state)).toBe(true);
    expect(check({ kind: 'total', level: 18 }, state)).toBe(false);
  });

  it('reads mastery of any one action', () => {
    const state = at({ mastery: { dig: level(10), bake: level(3) } });
    expect(check({ kind: 'mastery', level: 10 }, state)).toBe(true);
    expect(check({ kind: 'mastery', level: 11 }, state)).toBe(false);
  });

  it('reads the collection log: some of a list, all of it, or a number of the things it holds', () => {
    const state = at({ collection: ['mud', 'gem', 'retired_item'] });
    expect(check({ kind: 'found', items: ['mud', 'hat'], count: 1 }, state)).toBe(true);
    expect(check({ kind: 'found', items: ['mud', 'hat'] }, state)).toBe(false);
    expect(check({ kind: 'found', items: ['mud', 'gem'] }, state)).toBe(true);
    // Only what the tables hold counts towards a number.
    expect(check({ kind: 'collected', count: 2 }, state)).toBe(true);
    expect(check({ kind: 'collected', count: 3 }, state)).toBe(false);
  });

  it('reads kills, of one monster or all together', () => {
    const state = at({
      bestiary: { rat: { kills: 60, seen: [] }, crab: { kills: 45, seen: [] } },
    });
    expect(check({ kind: 'kills', count: 100 }, state)).toBe(true);
    expect(check({ kind: 'kills', count: 106 }, state)).toBe(false);
    expect(check({ kind: 'kills', count: 60, monster: 'rat' }, state)).toBe(true);
    expect(check({ kind: 'kills', count: 1, monster: 'gull' }, state)).toBe(false);
  });

  it('reads what is worn, all at once', () => {
    const state = at({
      equipment: { head: { item: 'hat', qty: 1 }, main_hand: { item: 'sword', qty: 1 } },
    });
    expect(check({ kind: 'worn', items: ['hat', 'sword'] }, state)).toBe(true);
    expect(check({ kind: 'worn', items: ['hat', 'shield'] }, state)).toBe(false);
  });

  it('reads clears, coins, thefts and the running counts', () => {
    const state = at({
      dungeons: { cave: { clears: 2 } },
      coins: 500,
      marks: {
        a: { picked: 6, caught: 4, seen: [] },
        b: { picked: 5, caught: 1, seen: [] },
      },
      stats: { bestStreak: 5, bounties: 9 },
    });
    expect(check({ kind: 'cleared', dungeon: 'cave' }, state)).toBe(true);
    expect(check({ kind: 'cleared', dungeon: 'cave', count: 3 }, state)).toBe(false);
    expect(check({ kind: 'cleared', dungeon: 'grotto' }, state)).toBe(false);
    expect(check({ kind: 'coins', amount: 500 }, state)).toBe(true);
    expect(check({ kind: 'coins', amount: 501 }, state)).toBe(false);
    expect(check({ kind: 'thefts', count: 11 }, state)).toBe(true);
    expect(check({ kind: 'thefts', count: 12 }, state)).toBe(false);
    expect(check({ kind: 'thefts', count: 5, caught: true }, state)).toBe(true);
    expect(check({ kind: 'thefts', count: 6, caught: true }, state)).toBe(false);
    expect(check({ kind: 'stat', stat: 'bestStreak', count: 5 }, state)).toBe(true);
    expect(check({ kind: 'stat', stat: 'potions', count: 1 }, state)).toBe(false);
  });
});

describe('earning achievements', () => {
  it('earns what the state shows, in table order, once, and says which', () => {
    const state = at({ coins: 150, skills: { digging: level(10) } });
    const first = award(state, content);
    expect(first.state.achievements).toEqual(['digger', 'rich']);
    expect(first.earned.map((def) => def.id)).toEqual(['digger', 'rich']);
    // Nothing new: the very same state back.
    const again = award(first.state, content);
    expect(again.state).toBe(first.state);
    expect(again.earned).toEqual([]);
  });

  it('keeps an achievement when what earned it is gone', () => {
    const earned = award(at({ coins: 150 }), content).state;
    const spent = award({ ...earned, coins: 0 }, content);
    expect(spent.state.achievements).toEqual(['rich']);
  });

  it('finds things and earns what they bring in one step', () => {
    const { state, earned } = takeStock(at({ bank: { mud: 1 } }), content);
    expect(state.collection).toEqual(['mud']);
    expect(earned.map((def) => def.id)).toEqual(['muddy']);
  });

  it('earns nothing from tables without achievements', () => {
    const state = at({ coins: 1000 });
    expect(award(state, { ...content, achievements: undefined }).state).toBe(state);
  });
});

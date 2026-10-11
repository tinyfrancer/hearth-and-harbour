import { describe, expect, it } from 'vitest';
import { meets } from '../../src/core/achievements';
import type { Content, RunStats } from '../../src/core/content';
import {
  DAY_MS,
  challengeMet,
  dailyModifier,
  effectWords,
  foeUnder,
  heroMaxHitUnder,
  isKind,
  localDay,
  mayIdle,
  modifierOn,
  msToMidnight,
  newChallenges,
  readStats,
  tierUnlocked,
} from '../../src/core/progress';
import { settleRun, spoilsUnder } from '../../src/core/run';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';

const CAVE = 'tidepool_cave';
const GROTTO = 'brinebeards_grotto';
/** Noon UTC on a day in October 2026. */
const NOON = Date.UTC(2026, 9, 11, 12);
const HOUR = 60 * 60 * 1000;

/** Everything a careful run reports. */
const STATS: RunStats = {
  timeMs: 100_000,
  damageTaken: 8,
  foodEaten: 2,
  braces: 1,
  stepOuts: 4,
  knockedOut: false,
  kills: 7,
};

describe('the day', () => {
  it('turns at local midnight, from the time passed in and the phone’s offset', () => {
    const midnight = Date.UTC(2026, 9, 12);
    expect(localDay(midnight - 1)).toBe(localDay(midnight) - 1);
    // An hour ahead of UTC, the day turns an hour sooner by the UTC clock.
    expect(localDay(midnight - HOUR, 60)).toBe(localDay(midnight));
    expect(localDay(midnight - HOUR - 1, 60)).toBe(localDay(midnight) - 1);
    // Behind it, later.
    expect(localDay(midnight + 4 * HOUR, -5 * 60)).toBe(localDay(midnight) - 1);
    expect(msToMidnight(midnight - 1)).toBe(1);
    expect(msToMidnight(midnight - HOUR, 60)).toBe(DAY_MS);
  });
});

describe('the day’s modifier', () => {
  const draws = (dungeon: string, days: number, from = localDay(NOON)) =>
    Array.from({ length: days }, (_, at) => modifierOn(from + at, dungeon, CONTENT));

  it('is the same all day, wherever in the day it is asked', () => {
    for (const dungeon of [CAVE, GROTTO]) {
      const start = Date.UTC(2026, 9, 11);
      const day = dailyModifier(start, dungeon, CONTENT);
      for (let ms = 0; ms < DAY_MS; ms += 37 * 60_000) {
        expect(dailyModifier(start + ms, dungeon, CONTENT)).toBe(day);
      }
      expect(dailyModifier(start + DAY_MS - 1, dungeon, CONTENT)).toBe(day);
    }
  });

  it('changes at local midnight, and is never the same two days running', () => {
    for (const dungeon of [CAVE, GROTTO]) {
      const year = draws(dungeon, 400, localDay(NOON) - 200);
      for (let at = 1; at < year.length; at += 1) expect(year[at]).not.toBe(year[at - 1]);
    }
    // In London's summer the grotto's day turns at 23:00 UTC.
    const turn = Date.UTC(2026, 6, 1, 23);
    expect(dailyModifier(turn - 1, GROTTO, CONTENT, 60)).toBe(
      dailyModifier(turn - 2 * HOUR, GROTTO, CONTENT, 60),
    );
    expect(dailyModifier(turn, GROTTO, CONTENT, 60)).toBe(
      dailyModifier(turn + 2 * HOUR, GROTTO, CONTENT),
    );
  });

  it('comes round evenly: over a year, every one of a dungeon’s within a day of the others', () => {
    for (const dungeon of [CAVE, GROTTO]) {
      const counts = new Map<string, number>();
      for (const id of draws(dungeon, 365)) counts.set(id!, (counts.get(id!) ?? 0) + 1);
      const pool = CONTENT.dungeons![dungeon]!.modifiers!;
      expect([...counts.keys()].sort()).toEqual([...pool].sort());
      expect(Math.max(...counts.values()) - Math.min(...counts.values())).toBeLessThanOrEqual(1);
    }
  });

  it('depends on the day and the dungeon alone: the same on any phone, for any character, rolling no dice', () => {
    const a = draws(GROTTO, 30);
    const b = draws(GROTTO, 30);
    expect(a).toEqual(b);
    // Two dungeons with pools of the same size do not march in step.
    const twin: Content = {
      ...CONTENT,
      dungeons: {
        ...CONTENT.dungeons,
        twin: { ...CONTENT.dungeons![GROTTO]!, id: 'twin' },
      },
    };
    expect(
      draws('twin', 30).map((_, at) => modifierOn(localDay(NOON) + at, 'twin', twin)),
    ).not.toEqual(a);
  });

  it('gives the learning cave only kind days, and every other day a trade', () => {
    for (const id of CONTENT.dungeons![CAVE]!.modifiers!) {
      expect(isKind(CONTENT.modifiers![id]!.effects), id).toBe(true);
    }
    for (const id of CONTENT.dungeons![GROTTO]!.modifiers!) {
      expect(isKind(CONTENT.modifiers![id]!.effects), id).toBe(false);
    }
  });

  it('is none for a landing to come, an unknown id, or a dungeon that draws from none', () => {
    expect(dailyModifier(NOON, 'unknown_1', CONTENT)).toBeNull();
    expect(dailyModifier(NOON, 'nowhere', CONTENT)).toBeNull();
    expect(dailyModifier(NOON, 'constructor', CONTENT)).toBeNull();
    const plain: Content = {
      ...CONTENT,
      dungeons: { [CAVE]: { ...CONTENT.dungeons![CAVE]!, modifiers: undefined } },
    };
    expect(dailyModifier(NOON, CAVE, plain)).toBeNull();
  });
});

describe('what a modifier does', () => {
  it('scales a foe, rounding, never to nothing', () => {
    const rat = { hp: 6, maxHit: 1, speedMs: 3000, name: 'Rat' };
    expect(foeUnder(rat, {})).toBe(rat);
    expect(foeUnder(rat, { foeHealth: 1.3, foeDamage: 1.3, foeSpeed: 1.25 })).toEqual({
      ...rat,
      hp: 8,
      maxHit: 1,
      speedMs: 2400,
    });
    expect(foeUnder({ ...rat, hp: 1 }, { foeHealth: 0.1 }).hp).toBe(1);
    expect(heroMaxHitUnder(12, { heroDamage: 0.85 })).toBe(10);
    expect(heroMaxHitUnder(1, { heroDamage: 0.5 })).toBe(1);
  });

  it('says what it does plainly', () => {
    expect(effectWords(CONTENT.modifiers!.spring_tide!.effects)).toEqual([
      'Foes hit 10% harder',
      'The tide turns 50% faster',
      '35% more of the usual drops',
    ]);
    expect(effectWords(CONTENT.modifiers!.still_pools!.effects)).toEqual([
      'Foes strike 20% less often',
    ]);
    expect(effectWords(CONTENT.modifiers!.bare_larder!.effects)).toEqual([
      'Nothing can be eaten',
      '25% more of the usual drops',
      '20% more XP',
    ]);
  });
});

describe('challenges', () => {
  it('reads a run’s statistics against the rule, and only ever on a clear', () => {
    const clear = { cleared: true, modifier: null };
    expect(challengeMet({ kind: 'atMost', stat: 'timeMs', n: 120_000 }, STATS, clear)).toBe(true);
    expect(challengeMet({ kind: 'atMost', stat: 'timeMs', n: 99_999 }, STATS, clear)).toBe(false);
    expect(challengeMet({ kind: 'atMost', stat: 'foodEaten', n: 0 }, STATS, clear)).toBe(false);
    expect(challengeMet({ kind: 'atLeast', stat: 'braces', n: 1 }, STATS, clear)).toBe(true);
    expect(challengeMet({ kind: 'atLeast', stat: 'stepOuts', n: 5 }, STATS, clear)).toBe(false);
    expect(challengeMet({ kind: 'atLeast', stat: 'braces', n: 1 }, STATS, { cleared: false })).toBe(
      false,
    );
    expect(
      challengeMet(
        { kind: 'atLeast', stat: 'braces', n: 1 },
        { ...STATS, knockedOut: true },
        clear,
      ),
    ).toBe(false);
  });

  it('never takes a statistic not reported as nothing', () => {
    const clear = { cleared: true };
    expect(challengeMet({ kind: 'atMost', stat: 'foodEaten', n: 0 }, {}, clear)).toBe(false);
    expect(challengeMet({ kind: 'atMost', stat: 'foodEaten', n: 0 }, undefined, clear)).toBe(false);
    expect(
      challengeMet({ kind: 'atMost', stat: 'damageTaken', n: 5 }, { damageTaken: -1 }, clear),
    ).toBe(false);
    expect(readStats({ timeMs: 1.7, braces: 'two', knockedOut: 0, kills: Infinity })).toEqual({
      timeMs: 1,
    });
  });

  it('reads the day’s modifier: any, or the one named', () => {
    const rule = { kind: 'withModifier', id: 'spring_tide' } as const;
    expect(challengeMet(rule, STATS, { cleared: true, modifier: 'spring_tide' })).toBe(true);
    expect(challengeMet(rule, STATS, { cleared: true, modifier: 'lamps_out' })).toBe(false);
    expect(challengeMet({ kind: 'withModifier' }, STATS, { cleared: true, modifier: 'x' })).toBe(
      true,
    );
    expect(challengeMet({ kind: 'withModifier' }, STATS, { cleared: true, modifier: null })).toBe(
      false,
    );
  });

  it('has three or four a dungeon, with stable ids under the dungeon’s own', () => {
    for (const id of [CAVE, GROTTO]) {
      const challenges = CONTENT.dungeons![id]!.challenges!;
      expect(challenges.length).toBeGreaterThanOrEqual(3);
      expect(challenges.length).toBeLessThanOrEqual(4);
      for (const challenge of challenges)
        expect(challenge.id).toMatch(new RegExp(`^${id}\\.[a-z_]+$`));
    }
  });
});

describe('settling a run that meets challenges', () => {
  const start: GameState = { ...newGame('Cody', 0), coins: 0 };
  const caveClear = (stats: Partial<RunStats>, extra = {}) => ({
    loot: { seashells: 3 },
    coins: 10,
    xp: { melee: 100 },
    cleared: CAVE,
    dungeon: CAVE,
    timeMs: stats.timeMs,
    stats: stats as RunStats,
    ...extra,
  });

  it('pays each challenge met once, records it, and says which', () => {
    const first = settleRun(start, caveClear(STATS), CONTENT);
    expect(first.dungeons[CAVE]!.challenges).toEqual([
      'tidepool_cave.brace',
      'tidepool_cave.step_out',
      'tidepool_cave.whole',
      'tidepool_cave.brisk',
    ]);
    // The first clear's reward, the run's coins and the four challenges' coins.
    expect(first.coins).toBe(10 + 100 + 150 + 250 + 250);
    expect(first.bountyPoints).toBe(4);
    // Five shrimp from the first clear, five from Stand Firm.
    expect(first.bank.cooked_shrimp).toBe(10);
    expect(newChallenges(start, first, CONTENT).map((c) => c.id)).toHaveLength(4);
    // Met again: nothing more.
    const second = settleRun(first, caveClear(STATS), CONTENT);
    expect(second.coins).toBe(first.coins + 10);
    expect(second.bountyPoints).toBe(4);
    expect(newChallenges(first, second, CONTENT)).toEqual([]);
  });

  it('pays nothing for a run that did not clear, or for statistics not reported', () => {
    const fell = settleRun(start, { ...caveClear(STATS), cleared: undefined }, CONTENT);
    expect(fell.dungeons[CAVE]).toBeUndefined();
    const silent = settleRun(start, { ...caveClear({}), timeMs: 100_000 }, CONTENT);
    expect(silent.dungeons[CAVE]).toEqual({ clears: 1, bestMs: 100_000 });
  });

  it('keeps the best statistics of every clear: the quickest, the least damage, the least eaten', () => {
    let state = settleRun(start, caveClear({ ...STATS, damageTaken: 14, foodEaten: 3 }), CONTENT);
    state = settleRun(state, caveClear({ timeMs: 130_000, damageTaken: 9 }), CONTENT);
    expect(state.dungeons[CAVE]).toMatchObject({
      clears: 2,
      bestMs: 100_000,
      leastDamage: 9,
      leastFood: 3,
    });
  });

  it('pays a modifier’s rewards: XP, coins, and the regular drops alone, counted over', () => {
    const spoils = {
      xp: { melee: 100 },
      coins: 10,
      loot: { seashells: 3, pearl: 1, hide: 1 },
      dungeon: CAVE,
      modifier: 'washed_up',
    };
    // Shells drop on every kill in the cave; a pearl and a hide do not.
    expect(spoilsUnder(spoils, CONTENT)).toEqual({
      xp: { melee: 100 },
      coins: 15,
      loot: { seashells: 5, pearl: 1, hide: 1 },
      modifier: 'washed_up',
    });
    const after = settleRun(start, spoils, CONTENT);
    expect(after.bank).toEqual({ seashells: 5, pearl: 1, hide: 1 });
    expect(after.coins).toBe(15);
    // A modifier the dungeon does not draw, or a run that says nothing of where, is paid plain.
    expect(spoilsUnder({ ...spoils, modifier: 'spring_tide' }, CONTENT).coins).toBe(10);
    expect(spoilsUnder({ ...spoils, dungeon: undefined }, CONTENT).coins).toBe(10);
    expect(spoilsUnder({ ...spoils, modifier: 'washed_up' }).coins).toBe(10);
  });

  it('records the modifiers cleared under, each once', () => {
    const clear = caveClear(STATS, { modifier: 'still_pools' });
    let state = settleRun(start, clear, CONTENT);
    state = settleRun(state, clear, CONTENT);
    state = settleRun(state, caveClear(STATS, { modifier: 'washed_up' }), CONTENT);
    expect(state.dungeons[CAVE]!.modifiers).toEqual(['still_pools', 'washed_up']);
  });

  it('pays the grotto’s Spring Tide only on its day', () => {
    const grotto = (modifier: string) => ({
      cleared: GROTTO,
      dungeon: GROTTO,
      modifier,
      stats: { ...STATS, timeMs: 500_000, foodEaten: 20, stepOuts: 40 },
    });
    const lamps = settleRun(start, grotto('lamps_out'), CONTENT);
    expect(lamps.dungeons[GROTTO]!.challenges).toBeUndefined();
    const spring = settleRun(lamps, grotto('spring_tide'), CONTENT);
    expect(spring.dungeons[GROTTO]!.challenges).toEqual(['brinebeards_grotto.spring_tide']);
    expect(spring.coins - lamps.coins).toBe(4000);
    expect(spring.bountyPoints - lamps.bountyPoints).toBe(5);
  });
});

describe('what a clear opens', () => {
  it('opens tier 2 on the grotto’s first clear, and nothing past what is built', () => {
    const fresh = newGame('Cody', 0);
    expect(tierUnlocked(fresh, 1, CONTENT)).toBe(true);
    expect(tierUnlocked(fresh, 2, CONTENT)).toBe(false);
    const caved = settleRun(fresh, { cleared: CAVE }, CONTENT);
    expect(tierUnlocked(caved, 2, CONTENT)).toBe(false);
    const cleared = settleRun(caved, { cleared: GROTTO }, CONTENT);
    expect(tierUnlocked(cleared, 2, CONTENT)).toBe(true);
    expect(tierUnlocked(cleared, 3, CONTENT)).toBe(false);
  });

  it('lets a dungeon be run idle only once cleared by hand, and only if its row says how', () => {
    const idleCave: Content = {
      ...CONTENT,
      dungeons: {
        ...CONTENT.dungeons,
        [CAVE]: {
          ...CONTENT.dungeons![CAVE]!,
          idle: { rooms: [{ foes: ['dock_rat'], walkMs: 1000 }], tripMs: 1000, lootPercent: 50 },
        },
      },
    };
    const fresh = newGame('Cody', 0);
    expect(mayIdle(fresh, CAVE, idleCave)).toBe(false);
    const cleared = settleRun(fresh, { cleared: CAVE }, idleCave);
    expect(mayIdle(cleared, CAVE, idleCave)).toBe(true);
    expect(mayIdle(cleared, GROTTO, idleCave)).toBe(false);
    expect(mayIdle(cleared, 'unknown_1', idleCave)).toBe(false);
  });
});

describe('achievements of dungeons', () => {
  const record = (fields: object): GameState => ({
    ...newGame('Cody', 0),
    dungeons: { [CAVE]: { clears: 1, ...fields } },
  });

  it('reads the least damage of a clear, every challenge done, the modifiers cleared under and idle runs', () => {
    expect(
      meets(
        record({ leastDamage: 0 }),
        { kind: 'cleared', dungeon: CAVE, damageAtMost: 0 },
        CONTENT,
      ),
    ).toBe(true);
    expect(
      meets(
        record({ leastDamage: 1 }),
        { kind: 'cleared', dungeon: CAVE, damageAtMost: 0 },
        CONTENT,
      ),
    ).toBe(false);
    expect(meets(record({}), { kind: 'cleared', dungeon: CAVE, damageAtMost: 0 }, CONTENT)).toBe(
      false,
    );
    const all = CONTENT.dungeons![CAVE]!.challenges!.map((c) => c.id);
    expect(meets(record({ challenges: all }), { kind: 'challenges', dungeon: CAVE }, CONTENT)).toBe(
      true,
    );
    expect(
      meets(record({ challenges: all.slice(1) }), { kind: 'challenges', dungeon: CAVE }, CONTENT),
    ).toBe(false);
    const under = { kind: 'underModifiers', dungeon: CAVE } as const;
    expect(meets(record({ modifiers: ['still_pools'] }), under, CONTENT)).toBe(false);
    expect(meets(record({ modifiers: ['still_pools'] }), { ...under, count: 1 }, CONTENT)).toBe(
      true,
    );
    expect(meets(record({ modifiers: ['washed_up', 'still_pools'] }), under, CONTENT)).toBe(true);
    // A modifier the cave no longer draws counts for nothing.
    expect(meets(record({ modifiers: ['washed_up', 'gone'] }), under, CONTENT)).toBe(false);
    expect(meets(record({ idleRuns: 9 }), { kind: 'idleRuns', count: 10 }, CONTENT)).toBe(false);
    expect(
      meets(record({ idleRuns: 10 }), { kind: 'idleRuns', count: 10, dungeon: CAVE }, CONTENT),
    ).toBe(true);
    expect(
      meets(record({ idleRuns: 10 }), { kind: 'idleRuns', count: 1, dungeon: GROTTO }, CONTENT),
    ).toBe(false);
  });
});

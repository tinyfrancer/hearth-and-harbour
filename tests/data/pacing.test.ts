import { describe, expect, it } from 'vitest';
import { advance, startAction } from '../../src/core/actions';
import type { ActionDef } from '../../src/core/content';
import { markChance } from '../../src/core/thieving';
import { newGame, skillLevel, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import {
  GATHERING,
  bestFightHour,
  bestGatheringHour,
  chainOf,
  chainPremium,
  fightHour,
  skillHour,
  thievingHour,
  usedWorth,
  madeWorth,
} from './economy';
import { hoursToLevel as hoursOfFighting } from './fighting';

const HOUR = 60 * 60 * 1000;

/**
 * Plays a skill the way a sensible player would: always the best action open,
 * looked at again once a minute. Returns the hours it took to reach `target`.
 *
 * Whatever the skill's recipes use is kept topped up, so an artisan skill is
 * timed with its materials on hand, as its pacing assumes.
 */
function hoursToLevel(skill: string, target: number): number {
  const actions = Object.values(CONTENT.actions).filter((action) => action.skill === skill);
  const best = (state: GameState): string =>
    actions
      .filter((action) => action.level <= skillLevel(state, skill))
      .sort((a, b) => b.xp / b.durationMs - a.xp / a.durationMs)[0]!.id;
  const plenty = Object.fromEntries(
    actions.flatMap((action) => action.uses ?? []).map(({ item }) => [item, 1_000_000]),
  );

  let state = newGame('Sim', 0);
  let elapsed = 0;
  while (skillLevel(state, skill) < target) {
    state = { ...state, bank: { ...state.bank, ...plenty } };
    const started = startAction(state, best(state), CONTENT);
    if (!started.ok) throw new Error(started.reason);
    state = advance(started.state, 60_000, CONTENT);
    elapsed += 60_000;
    if (elapsed > 1000 * HOUR) throw new Error(`${skill} never reached ${target}`);
  }
  return elapsed / HOUR;
}

// Balance is held here, by simulation, and not by eye. Tier 1 of a skill is an
// afternoon of idling, so that ten or so skills make a first week.
describe('pacing', () => {
  it('gets a fresh character a first level within the first half minute', () => {
    let state = newGame('Sim', 0);
    const started = startAction(state, 'chop_pine', CONTENT);
    if (!started.ok) throw new Error(started.reason);
    state = advance(started.state, 30_000, CONTENT);
    expect(skillLevel(state, 'woodcutting')).toBeGreaterThanOrEqual(2);
  });

  it.each(['woodcutting', 'fishing', 'mining', 'foraging'])(
    'takes %s through tier 1 (level 20) in about three hours',
    (skill) => {
      const hours = hoursToLevel(skill, 20);
      expect(hours).toBeGreaterThan(2.5);
      expect(hours).toBeLessThan(3.5);
    },
  );

  it.each(['cooking', 'smithing', 'crafting', 'fletching', 'alchemy'])(
    'takes %s through tier 1 in about two hours with the materials on hand',
    (skill) => {
      const hours = hoursToLevel(skill, 20);
      expect(hours).toBeGreaterThan(1.6);
      expect(hours).toBeLessThan(2.4);
    },
  );
});

// A combat skill is paced like a gathering one: about three hours to level 20,
// fighting the strongest monster of the character's level in that level's
// gear with food on hand (tests/data/fighting.ts). Melee or Ranged follows the
// weapon; Defence and Vitality come along with either.
describe('pacing of combat', () => {
  it.each([
    ['melee', 'melee'],
    ['defence', 'melee'],
    ['vitality', 'melee'],
    ['ranged', 'ranged'],
    ['defence', 'ranged'],
    ['vitality', 'ranged'],
  ] as const)('takes %s through tier 1 in about three hours, fighting with %s', (skill, style) => {
    const { hours, deaths } = hoursOfFighting(skill, 20, style);
    expect(hours).toBeGreaterThan(2.5);
    expect(hours).toBeLessThan(3.5);
    // A sensible player at their own level does not die on the way.
    expect(deaths).toBe(0);
  });
});

// A potion's strength is a number held here, beside what it costs to make:
// a dozen or so seconds of Foraging, Crafting and Alchemy for one. Each case is a
// fresh character doing a level-1 action for an hour, once with the potion
// drunk at the start and once without; the potion runs out within the hour.
describe('what a potion is worth', () => {
  const hourOf = (actionId: string, potion: string | null): GameState => {
    const action = CONTENT.actions[actionId]!;
    const plenty = Object.fromEntries((action.uses ?? []).map(({ item }) => [item, 1_000_000]));
    const state: GameState = {
      ...newGame('Sim', 0),
      bank: plenty,
      potion: potion ? { item: potion, charges: CONTENT.items[potion]!.potion!.charges } : null,
    };
    const started = startAction(state, actionId, CONTENT);
    if (!started.ok) throw new Error(started.reason);
    return advance(started.state, HOUR, CONTENT);
  };
  const gained = (actionId: string, potion: string) => {
    const [aided, plain] = [hourOf(actionId, potion), hourOf(actionId, null)];
    const action = CONTENT.actions[actionId]!;
    const item = action.gives[0]!.item;
    expect(aided.potion, `${potion} lasts less than the hour`).toBeNull();
    return {
      items: (aided.bank[item] ?? 0) - (plain.bank[item] ?? 0),
      xp: (aided.skills[action.skill] ?? 0) - (plain.skills[action.skill] ?? 0),
    };
  };

  it.each([
    // 150 chops at 2.7s instead of 3s: the time saved chops sixteen more.
    ['sage_tonic', 'chop_pine', { items: 16, xp: 160 }],
    // 150 shrimp at 11 XP instead of 10.
    ['steady_draught', 'cook_shrimp', { items: 0, xp: 150 }],
    // A log over again on every fifth of 150 charges.
    ['glowcap_tincture', 'chop_pine', { items: 30, xp: 0 }],
    // 200 chops at 12 XP instead of 10: 10 x 1.15 rounds up.
    ['midnight_oil', 'chop_pine', { items: 0, xp: 400 }],
  ])('pins %s at a fixed gain over an hour of %s', (potion, actionId, expected) => {
    expect(gained(actionId, potion)).toEqual(expected);
  });
});

// Thieving is paced like a gathering skill, and pays in coins: somewhat more
// than selling what gathering brings in, never absurdly more. A sensible thief
// picks the mark that pays best for what they are after, counting the time
// lost to being caught, and looks again once a minute.
describe('pacing of Thieving', () => {
  const marks = Object.values(CONTENT.actions).filter((action) => action.steal);
  /** What a mark is expected to pay a millisecond, in XP or coins, at the thief's chance now. */
  const worth = (state: GameState, mark: ActionDef, of: 'xp' | 'coins'): number => {
    const steal = mark.steal!;
    const chance = markChance(state, mark);
    const each = of === 'xp' ? mark.xp : (steal.coins[0] + steal.coins[1]) / 2;
    return (chance * each) / (mark.durationMs + (1 - chance) * steal.stunMs);
  };
  const bestMark = (state: GameState, of: 'xp' | 'coins'): string =>
    marks
      .filter((mark) => mark.level <= skillLevel(state, 'thieving'))
      .sort((a, b) => worth(state, b, of) - worth(state, a, of))[0]!.id;
  /** A minute at a time, the best mark (or action) chosen afresh each minute. */
  const minutes = (start: GameState, count: number, choose: (s: GameState) => string) => {
    let state = start;
    for (let minute = 0; minute < count; minute += 1) {
      const started = startAction(state, choose(state), CONTENT);
      if (!started.ok) throw new Error(started.reason);
      state = advance(started.state, 60_000, CONTENT);
    }
    return state;
  };

  it('takes Thieving through tier 1 in about three hours', () => {
    let state = newGame('Sim', 0);
    let hours = 0;
    while (skillLevel(state, 'thieving') < 20) {
      state = minutes(state, 1, (now) => bestMark(now, 'xp'));
      hours += 1 / 60;
      if (hours > 10) throw new Error('Thieving never reached 20');
    }
    expect(hours).toBeGreaterThan(2.5);
    expect(hours).toBeLessThan(3.5);
  });

  it.each([
    // Coins in the hour, and what the loot that came with them would sell for.
    [1, 39532, 6237],
    [10, 56760, 6290],
    [20, 80562, 22368],
  ])(
    'pays a fixed purse in an hour from level %i: %i coins, and loot worth %i',
    (level, coins, loot) => {
      expect(thievingHour(level)).toEqual({ coins, loot });
      // Better than an hour's gathering sold, but not by a mile.
      const gathered = bestGatheringHour(level);
      expect(coins / gathered).toBeGreaterThan(1.2);
      expect(coins / gathered).toBeLessThan(1.6);
    },
  );
});

// What things sell for (src/data/items.ts) is set by what an hour of the
// skill that makes them should earn, and held here. Each case is an hour from
// a level, played for coins: the best-paying thing open, looked at again each
// minute (tests/data/economy.ts). The story the numbers tell:
// - gathering pays more the further up a skill you are, and the four
//   gathering skills pay about the same as each other;
// - a made thing sells for more than what went into it, so an hour of an
//   artisan skill with the materials on hand earns something of its own; but
//   gathering and making the whole chain pays only a little better than
//   selling what was gathered, so selling the raw goods is never foolish;
// - Thieving pays somewhat better than gathering (above);
// - fighting, for money, sits between the two, after the fish it eats.
describe('what an hour earns', () => {
  it.each([
    // Coins an hour of each gathering skill brings in, sold, from levels 1, 10 and 20.
    ['woodcutting', [23050, 31500, 50400]],
    ['fishing', [25920, 32710, 51000]],
    ['mining', [24940, 33000, 48000]],
    ['foraging', [28530, 38685, 54000]],
  ] as const)('pins %s at a fixed purse from levels 1, 10 and 20', (skill, purses) => {
    const hours = [1, 10, 20].map((level) => skillHour(skill, level).gross);
    expect(hours).toEqual(purses);
    expect(hours[1]!).toBeGreaterThan(hours[0]!);
    expect(hours[2]!).toBeGreaterThan(hours[1]! * 1.3);
  });

  it('pays the four gathering skills about the same at the same level', () => {
    for (const level of [1, 10, 20]) {
      const hours = GATHERING.map((skill) => skillHour(skill, level).gross);
      expect(Math.max(...hours) / Math.min(...hours), `level ${level}`).toBeLessThan(1.3);
    }
  });

  it.each([
    // What an hour of each artisan skill adds to its materials, from levels 1, 10 and 20.
    ['cooking', [36720, 55380, 78000]],
    ['smithing', [44955, 59400, 84000]],
    ['crafting', [43620, 50400, 61200]],
    ['fletching', [42450, 51000, 81000]],
    ['alchemy', [60958, 69864, 79560]],
  ] as const)('pins what an hour of %s earns over its materials', (skill, earned) => {
    const hours = [1, 10, 20].map((level) => skillHour(skill, level));
    expect(hours.map((hour) => hour.earned)).toEqual(earned);
    expect(earned[1]).toBeGreaterThan(earned[0]);
    expect(earned[2]).toBeGreaterThan(earned[1]);
    // Something of its own, but not so much that gathering is the poor relation.
    for (const [index, level] of [1, 10, 20].entries()) {
      const ratio = earned[index]! / bestGatheringHour(level);
      expect(ratio, `level ${level}`).toBeGreaterThan(1);
      expect(ratio, `level ${level}`).toBeLessThan(2.2);
    }
  });

  it('sells every made thing for more than what went into it', () => {
    for (const action of Object.values(CONTENT.actions)) {
      if (!action.uses) continue;
      expect(madeWorth(action), action.id).toBeGreaterThan(usedWorth(action));
    }
  });

  it('pays a whole chain from gathering a little better than selling what was gathered', () => {
    const made = [
      ...new Set(
        Object.values(CONTENT.actions)
          .filter((action) => action.uses)
          .map((action) => action.gives[0]!.item),
      ),
    ];
    let chains = 0;
    for (const item of made) {
      const premium = chainPremium(item);
      // Leather and its goods come from fighting, not gathering.
      if (premium === null) {
        expect(chainOf(item), item).toBeNull();
        continue;
      }
      chains += 1;
      expect(premium, item).toBeGreaterThan(1);
      expect(premium, item).toBeLessThan(1.25);
    }
    expect(chains).toBeGreaterThan(30);
  });

  it.each([
    // The best-paying fight for money at a level, with melee, after the fish eaten.
    [1, 'dock_rat', 32953],
    [10, 'thieving_gull', 47020],
    [20, 'footpad', 67024],
  ] as const)(
    'pays a fight for money at level %i (%s) between gathering and thieving: %i',
    (level, monster, earned) => {
      const best = bestFightHour(level);
      expect([best.monster, best.earned]).toEqual([monster, earned]);
      expect(earned / bestGatheringHour(level)).toBeGreaterThan(1);
      expect(earned).toBeLessThan(thievingHour(level).coins);
    },
  );

  it('prices the store’s dear things at a few hours’ earnings, mid-tier', () => {
    const hour = bestGatheringHour(10);
    const dear = Object.values(CONTENT.store!).filter((entry) => entry.price > hour);
    expect(dear.map((entry) => entry.id)).toEqual(['potion_case', 'velvet_cap']);
    for (const entry of dear) {
      expect(entry.price / hour, entry.id).toBeGreaterThan(1.5);
      expect(entry.price / hour, entry.id).toBeLessThan(5);
    }
  });

  it('makes the strongest monster at a level pay its way, unless it is an animal', () => {
    // Animals carry no purse: a boar or a wolf is fought for XP and hides.
    for (const level of [1, 20]) {
      const hour = fightHour(level);
      expect(hour.earned / bestGatheringHour(level), hour.monster).toBeGreaterThan(1);
    }
    expect(fightHour(10).monster).toBe('bramble_boar');
    expect(fightHour(10).coins).toBe(0);
  });
});

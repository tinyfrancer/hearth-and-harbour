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
import { CAVE, ROOMS as CAVE_ROOMS, many as manyCaveRuns } from './cave';
import {
  GROTTO_CLEARED,
  characterAt,
  fight,
  hourOf,
  hoursToLevel as hoursOfFighting,
} from './fighting';
import { actionLock } from '../../src/core/tiers';
import { xpForLevel } from '../../src/core/xp';
import { handRunOf, idleHourOf } from './idleRuns';
import { novice, playCave } from '../scene/caveBot';
import { begin, playThrough, prepared } from '../scene/grottoBot';
import { beginBurrow, playBurrow } from '../scene/burrowBot';
import { castOf } from '../../src/scene/dungeons';
import { fighterOf } from '../../src/scene/battle';
import { foodUnder } from '../../src/core/progress';

/** The pins of the idle dungeon cases, measured (S16). */
const HAND_CAVE_XP = 11530;
const IDLE_CAVE: number[][] = [
  [26, 7265],
  [26, 7170],
  [26, 7265],
];
const HAND_GROTTO_XP = 22631;
const IDLE_GROTTO: number[] = [5, 18750, 8095];
/** The burrow's days by hand against a plain day (wave 21): XP, coins' worth earned, their mean. */
const BURROW_DAYS: Record<string, [number, number, number]> = {
  thick_caps: [1.27, 1.13, 1.2],
  fierce_brambles: [1, 1.08, 1.04],
  swift_hounds: [1.13, 0.93, 1.03],
  short_rations: [1, 1.21, 1.1],
  deep_gloom: [1.24, 1.1, 1.17],
};
/** The grotto's days by hand against a plain day (wave 18): XP, coins' worth earned, their mean. */
const GROTTO_DAYS: Record<string, [number, number, number]> = {
  thick_skulls: [1.22, 1, 1.11],
  angry_crew: [1, 1.15, 1.08],
  quick_tempers: [1.09, 0.98, 1.04],
  spring_tide: [1, 1.26, 1.13],
  short_rations: [0.98, 1.22, 1.1],
  unlit_lamps: [1.15, 1.01, 1.08],
};
import {
  bountyChoices,
  bountyPoints,
  handInBounty,
  readBoard,
  takeBounty,
} from '../../src/core/bounty';

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
    [10, 'thieving_gull', 48060],
    [20, 'footpad', 66979],
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

// Bounties (wave 13). Cody's review: "I only got marsh trolls over and over".
// The board used to post only what was within six levels, and past level 26
// only the troll; and each monster paid fixed points, so a rat's bounty paid
// a quarter of a troll's for the same time (14 and 60 points an hour at level
// 30). Now it posts everything open, and an offer pays for the time it should
// take (src/core/bounty.ts): whatever is hunted, an hour pays about the same,
// rising a little with the level. Each case is the real fight, in that level's
// gear, an hour long, against every monster the board may post: the points an
// hour of an average-sized bounty on it pays.
describe('what an hour of bounties pays', () => {
  const perHour = (level: number): Record<string, number> =>
    Object.fromEntries(
      bountyChoices(characterAt(level), CONTENT).map((monster) => {
        const [least, most] = monster.bounty!.kills;
        const count = Math.round((least + most) / 2);
        const { kills } = hourOf(level, monster.id);
        return [monster.id, (bountyPoints(level, monster, count) * kills) / count];
      }),
    );

  it.each([
    // Combat level, how many monsters are open, and the least and most an hour pays.
    [5, 3, 22, 25],
    [10, 5, 31, 38],
    [20, 10, 42, 49],
    [30, 10, 53, 58],
  ])(
    'pays about the same an hour for everything open at level %i (%i open): %i to %i points',
    (level, open, least, most) => {
      const hours = Object.values(perHour(level));
      expect(hours).toHaveLength(open);
      expect(Math.floor(Math.min(...hours))).toBe(least);
      expect(Math.floor(Math.max(...hours))).toBe(most);
      // The easiest is never the poor relation of the hardest.
      expect(Math.min(...hours) / Math.max(...hours)).toBeGreaterThan(0.8);
    },
  );

  it('offers a different monster bounty after bounty at level 30, every one of them in time', () => {
    let state = ok(readBoard(characterAt(30), CONTENT));
    const hunted: string[] = [];
    for (let round = 0; round < 80; round += 1) {
      state = ok(takeBounty(state, CONTENT));
      hunted.push(state.bounty!.monster);
      state = ok(
        handInBounty(
          { ...state, bounty: { ...state.bounty!, done: state.bounty!.count } },
          CONTENT,
        ),
      );
    }
    expect(hunted.every((monster, at) => monster !== hunted[at - 1])).toBe(true);
    expect(new Set(hunted).size).toBe(10);
    // Leaning to a fair fight: the troll comes up far more than the rat.
    const times = (id: string) => hunted.filter((monster) => monster === id).length;
    expect(times('marsh_troll')).toBeGreaterThan(times('dock_rat'));
  });
});

// The Tidepool Cave (wave 15) is a lesson with a first clear's reward, not a
// farm. Run back to back by a level-1 character in linen with the reward's
// bronze sword, each run as quick as the quickest fight of 400 dice in the
// model of tests/data/cave.ts (foes in reach from the first moment, every
// heavy blow dodged), plus a dozen seconds to walk its three rooms and
// fifteen for the round trip (rowing out, the results, the boat and the chart
// again), with every drop at its average and the pearl at its odds: it pays
// under half an hour of the first skills.
//
// Its XP is about what dock rats pay idle at level 1, and never much more.
// Until wave 16 this case said "less than the rats", on a model of two rats
// and two crabs; lane C's numbers (wave 16: more hit points, a longer run)
// gave 1.08 times the rats' on a model of five rats, and the scene's four
// rats (wave 17) give 1.05, at the speed of a player who never misses a tap. It needs hands
// and the rats do not, and from level 2 or 3 the idle fights pay far more.
describe('the Tidepool Cave run again and again (wave 15)', () => {
  const WALK_MS = 12_000;
  const ROUND_TRIP_MS = 15_000;
  const perRun = (): { worth: number; xp: number } => {
    let worth = 0;
    let damage = 0;
    for (const room of CAVE_ROOMS) {
      for (const id of room) {
        const foe = CAVE.cast!.find((row) => row.id === id)!;
        const mean = (d: { min: number; max: number }): number => (d.min + d.max) / 2;
        worth += (foe.coins[0] + foe.coins[1]) / 2;
        for (const drop of foe.always) worth += mean(drop) * CONTENT.items[drop.item]!.value;
        for (const drop of foe.rare)
          worth += (mean(drop) / drop.oneIn) * CONTENT.items[drop.item]!.value;
        damage += foe.hp;
      }
    }
    // Every point of a foe's health is dealt once: 5 XP each to the attacking skill.
    return { worth, xp: damage * 5 };
  };

  it('pays less an hour than the first skills, and about the XP of dock rats idle', () => {
    const fastest = manyCaveRuns(characterAt(1), { dodge: 1 }).quickest + WALK_MS + ROUND_TRIP_MS;
    const runs = HOUR / fastest;
    const { worth, xp } = perRun();
    const coins = Math.round(worth * runs);
    const xpHour = Math.round(xp * runs);
    // Pinned so a change to the cave's numbers is seen: about 90 coins and 270 XP a run, 66 s
    // (wave 17: the model's three rats under the pool, as the scene has them; it had four).
    expect([Math.round(worth), xp, Math.round(fastest / 1000)]).toEqual([90, 270, 66]);
    expect(coins).toBeLessThan(skillHour('woodcutting', 1).gross / 2);
    expect(coins).toBeLessThan(bestFightHour(1).earned / 2);
    const rats = hourOf(1, 'dock_rat').xpPerHour;
    expect(Math.round((xpHour / rats) * 100) / 100).toBe(1.05);
    expect(xpHour).toBeLessThan(rats * 1.15);
  });
});

// Challenges (S16) are paid once each, and modestly: a goal, not a source of
// income. Every challenge of a dungeon together pays less than half an hour of
// the best gathering at the level the dungeon is meant for, counting what its
// things sell for, and fewer bounty points than an hour of bounties there.
describe('what challenges pay, all told (S16)', () => {
  it.each([
    // Dungeon, its coins and items' worth all told, and its points all told.
    ['tidepool_cave', 910, 4],
    ['brinebeards_grotto', 24000, 35],
    // Charted since wave 20: held to the same bound at its level, 40.
    ['thistlewood_burrow', 47000, 35],
  ] as const)('pays %s’s challenges %i coins’ worth and %i points', (id, worth, points) => {
    const dungeon = CONTENT.dungeons![id]!;
    let coins = 0;
    let earned = 0;
    for (const { reward } of dungeon.challenges!) {
      coins += reward.coins ?? 0;
      for (const { item, qty } of reward.items ?? []) coins += CONTENT.items[item]!.value * qty;
      earned += reward.bountyPoints ?? 0;
    }
    expect([coins, earned]).toEqual([worth, points]);
    // Past level 20 the gathering is tier 2's (S22).
    const tier2 = dungeon.recommended > 20;
    expect(coins).toBeLessThan(bestGatheringHour(dungeon.recommended, tier2) / 2);
    // An hour of bounties pays at least 22 points from combat level 5, and 42 from 20.
    expect(earned).toBeLessThan(dungeon.recommended >= 20 ? 42 : 22);
  });
});

// A dungeon run idle (S16: "send the hero through it idle") is never the best
// way to spend an hour: strictly worse than playing the same dungeon by hand,
// and no better than the best idle fight at the level it is first cleared at,
// on any day. Play by hand is lane C's scripted players' median clear
// (tests/scene/caveBot.ts, grottoBot.ts) plus fifteen seconds of round trip,
// each foe felled once, with every drop at its odds (`handRunOf`). Idle is an
// hour of the real rules (src/core/idleRun.ts) in that level's gear with
// plenty of fish (`idleHourOf`), each day's modifier in turn. XP is the
// attacking skill's, as the other combat cases count it, and all three combat
// skills together where several foes at once give Defence more to do.
describe('a dungeon run idle (S16)', () => {
  const ROUND_TRIP_MS = 15_000;
  const REACT_MS = 400;
  const SEEDS = Array.from({ length: 12 }, (_, i) => (i + 1) * 7919);
  const median = (xs: readonly number[]): number =>
    [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
  /** An idle fight's hour, all three combat skills' XP together. */
  const fightAllXp = (level: number, monster: string): number => {
    let state = fight(characterAt(level, { seed: 1, food: 100_000 }), monster);
    const before = { ...state.skills };
    for (let minute = 0; minute < 60; minute += 1) {
      state = advance(state, 60_000, CONTENT);
      if (!state.fight) state = fight(state, monster);
    }
    return ['melee', 'defence', 'vitality'].reduce(
      (sum, id) => sum + (state.skills[id] ?? 0) - (before[id] ?? 0),
      0,
    );
  };
  const open = (level: number): string[] =>
    Object.values(CONTENT.monsters!)
      .filter((monster) => monster.level <= level && !monster.bountyOnly)
      .map((monster) => monster.id);

  it('runs the Tidepool Cave idle for less than by hand, and less than dock rats idle at level 1', () => {
    const cave = CONTENT.dungeons!.tidepool_cave!;
    const armed = {
      ...novice(),
      equipment: { ...novice().equipment, main_hand: { item: 'bronze_sword', qty: 1 } },
    };
    const clear = median(
      SEEDS.map(
        (seed) => playCave(armed, seed, { reactMs: REACT_MS, brace: true, lessons: false }).ms,
      ),
    );
    const hand = handRunOf(cave);
    const handRuns = HOUR / (clear + ROUND_TRIP_MS);
    const handXp = hand.xp * handRuns;
    const handWorth = hand.worth * handRuns;
    const rats = hourOf(1, 'dock_rat').xpPerHour;
    const ratsAll = fightAllXp(1, 'dock_rat');
    const ratsEarned = bestFightHour(1).earned;
    const days = [null, ...cave.modifiers!].map((modifier) =>
      idleHourOf(1, 'tidepool_cave', { modifier }),
    );
    // Pinned so a change is seen: by hand about 270 XP and 90 coins' worth a run; idle 26 runs an hour.
    expect([hand.xp, Math.round(hand.worth), Math.round(handXp)]).toEqual([270, 90, HAND_CAVE_XP]);
    expect(days.map((day) => [day.runs, day.xp])).toEqual(IDLE_CAVE);
    for (const day of days) {
      expect(day.knockedOut).toBe(false);
      expect(day.xp).toBeLessThan(handXp * 0.8);
      expect(day.loot + day.coins).toBeLessThan(handWorth);
      expect(day.xp).toBeLessThan(rats);
      expect(day.allXp).toBeLessThan(ratsAll);
      expect(day.earned).toBeLessThan(ratsEarned);
    }
  }, 120_000);

  it('runs Brinebeard’s Grotto idle for less than by hand, and less than the best idle fight at level 20, on any day', () => {
    const grotto = CONTENT.dungeons!.brinebeards_grotto!;
    const clears = SEEDS.map((seed) => playThrough(prepared(), seed, { reactMs: REACT_MS })).filter(
      (run) => run.cleared,
    );
    const clear = median(clears.map((run) => run.ms));
    const hand = handRunOf(grotto);
    const handRuns = HOUR / (clear + ROUND_TRIP_MS);
    const handXp = hand.xp * handRuns;
    const handWorth = hand.worth * handRuns;
    const level = 20;
    const bestXp = Math.max(...open(level).map((id) => hourOf(level, id).xpPerHour));
    const bestAll = Math.max(...open(level).map((id) => fightAllXp(level, id)));
    const bestEarned = bestFightHour(level).earned;
    const plain = idleHourOf(level, 'brinebeards_grotto');
    // Pinned so a change is seen: by hand 3,230 XP and about 10,086 coins' worth a run.
    expect([hand.xp, Math.round(hand.worth), Math.round(handXp)]).toEqual([
      3230,
      10086,
      HAND_GROTTO_XP,
    ]);
    expect([plain.runs, plain.xp, Math.round(plain.earned)]).toEqual(IDLE_GROTTO);
    // Day for day, worse than by hand.
    expect(plain.xp).toBeLessThan(handXp * 0.9);
    expect(plain.loot + plain.coins).toBeLessThan(handWorth / 2);
    for (const modifier of [null, ...grotto.modifiers!]) {
      const day = idleHourOf(level, 'brinebeards_grotto', { modifier });
      expect(day.xp, String(modifier)).toBeLessThan(bestXp);
      expect(day.allXp, String(modifier)).toBeLessThan(bestAll);
      expect(day.earned, String(modifier)).toBeLessThan(bestEarned);
      // Wave 18: every one of its days is a trade, played plain idle, so none costs money.
      expect(day, String(modifier)).toEqual(plain);
      expect(day.earned, String(modifier)).toBeGreaterThan(0);
    }
    // Nor at the level a careful player first clears it, over a night's worth of runs: the cod
    // eaten (about 120 an hour) is paid for by the half of the doubloons kept.
    for (const first of [19, 20]) {
      const night = idleHourOf(first, 'brinebeards_grotto', { hours: 6 });
      expect(night.knockedOut, String(first)).toBe(false);
      expect(night.earned, String(first)).toBeGreaterThan(night.food / 2);
    }
  }, 240_000);
});

// Thistlewood Burrow run idle (wave 20), held as the grotto is: worse than by
// hand (lane C's careful player at level 40 in the full tier-2 kit, its median
// clear plus fifteen seconds), and worse than the best idle fight at 40, on
// any day; and a night of it at the levels it is first cleared at pays for
// its fish.
const IDLE_BURROW: number[] = [6, 64077, 69589];
/**
 * The Burrow's cast as the tables have it, played by the cases below whatever
 * the scene's balance test fights by (wave 21: lane C's bot, until it reads the
 * tables itself, played the numbers it asked for in wave 19).
 */
const BURROW_CAST = castOf(CONTENT, 'thistlewood_burrow');
describe('Thistlewood Burrow run idle (wave 20)', () => {
  const SEEDS = Array.from({ length: 12 }, (_, i) => (i + 1) * 7919);
  const median = (xs: readonly number[]): number =>
    [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

  it('runs it idle for less than by hand, and less than the best idle fight at level 40, on any day', () => {
    const burrow = CONTENT.dungeons!.thistlewood_burrow!;
    const level = 40;
    const hero = characterAt(level, { tier2: true, food: 20 });
    const runs = SEEDS.map((seed) =>
      playBurrow(fighterOf(hero, CONTENT), seed, { reactMs: 400, monsters: BURROW_CAST }),
    );
    const clear = median(runs.filter((run) => run.cleared).map((run) => run.ms));
    const hand = handRunOf(burrow);
    const handRuns = HOUR / (clear + 15_000);
    const handXp = hand.xp * handRuns;
    const handWorth = hand.worth * handRuns;
    const open = Object.values(CONTENT.monsters!).filter(
      (monster) => monster.level <= level && !monster.bountyOnly,
    );
    const hours = open.map((monster) => hourOf(level, monster.id, { tier2: true }));
    const bestXp = Math.max(...hours.map((hour) => hour.xpPerHour));
    const bestEarned = bestFightHour(level, true).earned;
    const plain = idleHourOf(level, 'thistlewood_burrow', { tier2: true });
    // Pinned so a change is seen: idle 6 runs an hour, its XP and what it earns after fish.
    expect([plain.runs, plain.xp, Math.round(plain.earned)]).toEqual(IDLE_BURROW);
    expect(plain.xp).toBeLessThan(handXp * 0.9);
    expect(plain.loot + plain.coins).toBeLessThan(handWorth / 2);
    for (const modifier of [null, ...burrow.modifiers!]) {
      const day = idleHourOf(level, 'thistlewood_burrow', { modifier, tier2: true });
      expect(day.knockedOut, String(modifier)).toBe(false);
      expect(day.xp, String(modifier)).toBeLessThan(bestXp);
      expect(day.earned, String(modifier)).toBeLessThan(bestEarned);
      // Every one of its days is a trade, played plain idle.
      expect(day, String(modifier)).toEqual(plain);
    }
    // A night's worth of runs at the levels it is first cleared at: never knocked out, and the
    // amber kept pays for the swordfish eaten.
    for (const first of [38, 40]) {
      const night = idleHourOf(first, 'thistlewood_burrow', { hours: 6, tier2: true });
      expect(night.knockedOut, String(first)).toBe(false);
      expect(night.earned, String(first)).toBeGreaterThan(night.food);
    }
  }, 240_000);
});

// The grotto's days by hand (wave 18): every trade is worth choosing and none
// is a must. An hour by hand on a modifier day pays between 1.0 and 1.3 times
// a plain day's, by the mean of its two measures, XP and coins' worth earned
// (what falls, as settling pays it, less the cod eaten as sold instead), and
// neither measure falls below 0.9 or passes 1.3. An hour is lane C's careful
// player at combat 20 (tests/scene/grottoBot.ts), twelve seeds, with fish to
// spare (30 cod: on 20 he eats all but one even on a plain day, so the fish a
// harder day costs only show with more), the median clear plus fifteen
// seconds of round trip; what falls is the tables' average (`handRunOf`).
// Whether each day can be cleared on the ordinary 20 is lane C's measure
// (tests/scene/modifierRun.test.ts).
describe('the grotto’s days by hand (wave 18)', () => {
  const ROUND_TRIP_MS = 15_000;
  const SEEDS = Array.from({ length: 12 }, (_, i) => (i + 1) * 7919);
  const median = (xs: readonly number[]): number =>
    [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
  const grotto = CONTENT.dungeons!.brinebeards_grotto!;
  const cod = CONTENT.items.cooked_cod! as { heals?: number; value: number };

  /** XP and coins' worth earned an hour by hand, on a day of `modifier` (or none). */
  const handHour = (modifier: string | null): { xp: number; earned: number; clears: number } => {
    const effects = (modifier && CONTENT.modifiers![modifier]!.effects) || {};
    // Short rations' food is the scene's to apply (lane C's `foodUnder`): until it does, the
    // careful player is fed as it will feed him, so the day is measured as it is meant.
    const heals = cod.heals!;
    const meant = foodUnder(heals, effects);
    const fed = begin(prepared(20), 1, undefined, modifier ?? undefined).battle!.fighter.food!
      .heals;
    if (fed !== meant) cod.heals = meant;
    try {
      const runs = SEEDS.map((seed) =>
        playThrough(prepared(20, 30), seed, { reactMs: 400, modifier: modifier ?? undefined }),
      );
      const cleared = runs.filter((run) => run.cleared);
      const hours = (median(cleared.map((run) => run.ms)) + ROUND_TRIP_MS) / HOUR;
      const run = handRunOf(grotto, effects);
      const eaten = median(runs.map((r) => r.eaten)) * cod.value;
      return { xp: run.xp / hours, earned: (run.worth - eaten) / hours, clears: cleared.length };
    } finally {
      cod.heals = heals;
    }
  };

  it('pays each trade 1.0 to 1.3 times a plain day’s hour by hand', () => {
    const plain = handHour(null);
    const ratios: Record<string, [number, number, number]> = {};
    for (const modifier of grotto.modifiers!) {
      const day = handHour(modifier);
      expect(day.clears, modifier).toBe(12);
      const xp = day.xp / plain.xp;
      const earned = day.earned / plain.earned;
      const mean = (xp + earned) / 2;
      expect(mean, modifier).toBeGreaterThanOrEqual(1);
      expect(mean, modifier).toBeLessThanOrEqual(1.3);
      for (const each of [xp, earned]) {
        expect(each, modifier).toBeGreaterThanOrEqual(0.9);
        expect(each, modifier).toBeLessThanOrEqual(1.3);
      }
      const round = (n: number): number => Math.round(n * 100) / 100;
      ratios[modifier] = [round(xp), round(earned), round(mean)];
    }
    // Pinned so a change is seen: XP, earned and their mean against a plain day.
    expect(ratios).toEqual(GROTTO_DAYS);
  }, 240_000);
});

function ok(result: { ok: true; state: GameState } | { ok: false; reason: string }): GameState {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

// Tier 2 (S22), levels 20 to 40, opened by Brinebeard's Grotto's first clear,
// held to tier 1's limits on the same curve: about three hours a gathering or
// combat skill from 20 to 40, about two an artisan skill with its materials
// on hand, Thieving about three; each hour's earnings told the same story as
// tier 1's. Every case starts at level 20 with the grotto cleared.
// Pinned so a change is seen: an hour from levels 30 and 40, tier 2 open: what each gathering
// skill sells for, what each artisan skill adds to its materials, Thieving's coins, and the
// best fight for money (melee, after the fish eaten).
/** What each of tier 2's potions adds to an hour of a level-20 tier 2 action (S22). */
const TIER2_POTIONS: Record<string, { items: number; xp: number }> = {
  // 200 chops at 3.4 s instead of 4: the time saved chops 31 more.
  holly_tonic: { items: 31, xp: 2542 },
  // 200 cooks at 2.25 s instead of 2.5: twenty more.
  forgehand_draught: { items: 20, xp: 1540 },
  // A log over again on every fourth of 200 charges.
  duskbloom_tincture: { items: 50, xp: 0 },
  // 250 chops at 98 XP instead of 82.
  twilight_elixir: { items: 0, xp: 4000 },
};

const TIER2_EARNED: Record<number, Record<string, number>> = {
  30: {
    woodcutting: 87180,
    fishing: 86250,
    mining: 82740,
    foraging: 90430,
    cooking: 140724,
    smithing: 146004,
    crafting: 145104,
    fletching: 181359,
    alchemy: 140134,
    thieving: 127457,
    brigand: 118387,
  },
  40: {
    woodcutting: 102000,
    fishing: 96000,
    mining: 96600,
    foraging: 105000,
    cooking: 161160,
    smithing: 167280,
    crafting: 169200,
    fletching: 221520,
    alchemy: 156000,
    thieving: 166090,
    hobgoblin: 165264,
  },
};

/** Hours from level `from` to `target` in a skill, the best open action each minute, tier 2 open. */
function tier2Hours(skill: string, from: number, target: number): number {
  const actions = Object.values(CONTENT.actions).filter((action) => action.skill === skill);
  const plenty = Object.fromEntries(
    actions.flatMap((action) => action.uses ?? []).map(({ item }) => [item, 1_000_000]),
  );
  const rate = (state: GameState, action: ActionDef): number => {
    if (!action.steal) return action.xp / action.durationMs;
    const chance = markChance(state, action);
    return (chance * action.xp) / (action.durationMs + (1 - chance) * action.steal.stunMs);
  };
  let state: GameState = {
    ...newGame('Sim', 0),
    dungeons: GROTTO_CLEARED,
    skills: { [skill]: xpForLevel(from) },
  };
  let elapsed = 0;
  while (skillLevel(state, skill) < target) {
    state = { ...state, bank: { ...state.bank, ...plenty } };
    const best = actions
      .filter((action) => actionLock(state, action, CONTENT) === null)
      .sort((a, b) => rate(state, b) - rate(state, a))[0]!;
    const started = startAction(state, best.id, CONTENT);
    if (!started.ok) throw new Error(started.reason);
    state = advance(started.state, 60_000, CONTENT);
    elapsed += 60_000;
    if (elapsed > 100 * HOUR) throw new Error(`${skill} never reached ${target}`);
  }
  return elapsed / HOUR;
}

describe('pacing of tier 2 (S22)', () => {
  it.each(['woodcutting', 'fishing', 'mining', 'foraging', 'thieving'])(
    'takes %s from 20 to 40 in about three hours',
    (skill) => {
      const hours = tier2Hours(skill, 20, 40);
      expect(hours).toBeGreaterThan(2.5);
      expect(hours).toBeLessThan(3.5);
    },
  );

  it.each(['cooking', 'smithing', 'crafting', 'fletching', 'alchemy'])(
    'takes %s from 20 to 40 in about two hours with the materials on hand',
    (skill) => {
      const hours = tier2Hours(skill, 20, 40);
      expect(hours).toBeGreaterThan(1.6);
      expect(hours).toBeLessThan(2.4);
    },
  );

  it.each([
    ['melee', 'melee'],
    ['defence', 'melee'],
    ['vitality', 'melee'],
    ['ranged', 'ranged'],
    ['defence', 'ranged'],
    ['vitality', 'ranged'],
  ] as const)(
    'takes %s from 20 to 40 in about three hours, fighting with %s',
    (skill, style) => {
      const { hours, deaths } = hoursOfFighting(skill, 40, style, 20);
      expect(hours).toBeGreaterThan(2.5);
      expect(hours).toBeLessThan(3.5);
      expect(deaths).toBe(0);
    },
    240_000,
  );

  it('opens nothing of tier 2 to a level-40 character who has not cleared the grotto', () => {
    const state: GameState = { ...newGame('Sim', 0), skills: { woodcutting: xpForLevel(40) } };
    const result = startAction(state, 'chop_yew', CONTENT);
    expect(result).toEqual({ ok: false, reason: 'Clear Brinebeard’s Grotto.' });
    const cleared = startAction({ ...state, dungeons: GROTTO_CLEARED }, 'chop_yew', CONTENT);
    expect(cleared.ok).toBe(true);
  });
});

describe('what an hour of tier 2 earns (S22)', () => {
  it.each([30, 40])(
    'tells tier 1’s story at level %i',
    (level) => {
      const gathered = Object.fromEntries(
        GATHERING.map((skill) => [skill, skillHour(skill, level, true).gross]),
      );
      const made = Object.fromEntries(
        ['cooking', 'smithing', 'crafting', 'fletching', 'alchemy'].map((skill) => [
          skill,
          skillHour(skill, level, true).earned,
        ]),
      );
      const best = bestGatheringHour(level, true);
      const thief = thievingHour(level, true);
      const fight = bestFightHour(level, true);
      // Gathering pays more than tier 1's best at 20 (54,000), and the four skills alike.
      const hours = Object.values(gathered);
      expect(Math.min(...hours)).toBeGreaterThan(54_000 * 1.3);
      expect(Math.max(...hours) / Math.min(...hours)).toBeLessThan(1.3);
      // Making pays something of its own, never so much that gathering is the poor relation.
      for (const [skill, earned] of Object.entries(made)) {
        expect(earned / best, skill).toBeGreaterThan(1);
        expect(earned / best, skill).toBeLessThan(2.2);
      }
      // Thieving somewhat better than gathering; fighting for money between the two.
      expect(thief.coins / best).toBeGreaterThan(1.2);
      expect(thief.coins / best).toBeLessThan(1.6);
      expect(fight.earned / best, fight.monster).toBeGreaterThan(1);
      expect(fight.earned, fight.monster).toBeLessThan(thief.coins);
      // Wave 20: the best fight for money is tier 2's own (it was the tier-1 smuggler at 30, and
      // the ogre 3.5% under Thieving at 40), at least a quarter over gathering, and at 30 at least
      // a twentieth under Thieving. That is about all the room there is: a character in tier-2
      // gear farms the tier-1 marsh troll for 0.92 of Thieving at 30, and the troll cannot pay
      // less without failing tier 1's limit at 20 (it pays its way there by 4%), so tier 2's best
      // must sit between the troll and Thieving.
      expect(CONTENT.monsters![fight.monster]!.tier, fight.monster).toBe(2);
      expect(fight.earned / best, fight.monster).toBeGreaterThan(1.25);
      // At 40 the knight wears the cloak and the gold amulet together (their own slots since
      // wave 20), and farms the troll for 0.99 of Thieving (164,631): tier 2's best can only
      // sit between them, so at 40 the margin is the existing one, under Thieving at all.
      expect(fight.earned / thief.coins, fight.monster).toBeLessThan(level === 30 ? 0.95 : 1);
      expect({
        ...gathered,
        ...made,
        thieving: thief.coins,
        [fight.monster]: fight.earned,
      }).toEqual(TIER2_EARNED[level]);
    },
    240_000,
  );
});

// Bounties past the grotto (S22): the board posts tier 2's monsters beside
// tier 1's, and whatever is hunted an hour pays about the same, as below 20.
describe('what an hour of bounties pays in tier 2 (S22)', () => {
  it.each([
    // Combat level, how many monsters are open, and the least and most an hour pays.
    [30, 13, 60, 69],
    // Wave 20: at 40 the knight wears the cloak and the amulet together (69 to 83 before).
    [40, 17, 75, 90],
  ])(
    'pays about the same an hour for everything open at level %i (%i open): %i to %i points',
    (level, open, least, most) => {
      const hours = bountyChoices(characterAt(level, { tier2: true }), CONTENT).map((monster) => {
        const [fewest, many] = monster.bounty!.kills;
        const count = Math.round((fewest + many) / 2);
        const { kills } = hourOf(level, monster.id, { tier2: true });
        return (bountyPoints(level, monster, count) * kills) / count;
      });
      expect(hours).toHaveLength(open);
      expect([Math.floor(Math.min(...hours)), Math.floor(Math.max(...hours))]).toEqual([
        least,
        most,
      ]);
      expect(Math.min(...hours) / Math.max(...hours)).toBeGreaterThan(0.8);
    },
  );
});

// Tier 2's potions (S22), each pinned as tier 1's are: an hour of a level-20
// tier 2 action past the grotto with it and without, the potion running out
// within the hour.
describe('what a tier 2 potion is worth (S22)', () => {
  const hourOf = (actionId: string, potion: string | null): GameState => {
    const action = CONTENT.actions[actionId]!;
    const plenty = Object.fromEntries((action.uses ?? []).map(({ item }) => [item, 1_000_000]));
    const state: GameState = {
      ...newGame('Sim', 0),
      dungeons: GROTTO_CLEARED,
      skills: { [action.skill]: xpForLevel(20) },
      bank: plenty,
      potion: potion ? { item: potion, charges: CONTENT.items[potion]!.potion!.charges } : null,
    };
    const started = startAction(state, actionId, CONTENT);
    if (!started.ok) throw new Error(started.reason);
    return advance(started.state, HOUR, CONTENT);
  };

  it.each([
    ['holly_tonic', 'chop_driftwood'],
    ['forgehand_draught', 'cook_mackerel'],
    ['duskbloom_tincture', 'chop_driftwood'],
    ['twilight_elixir', 'chop_driftwood'],
  ])('pins %s at a fixed gain over an hour of %s', (potion, actionId) => {
    const [aided, plain] = [hourOf(actionId, potion), hourOf(actionId, null)];
    const action = CONTENT.actions[actionId]!;
    const item = action.gives[0]!.item;
    expect(aided.potion, `${potion} lasts less than the hour`).toBeNull();
    expect({
      items: (aided.bank[item] ?? 0) - (plain.bank[item] ?? 0),
      xp: (aided.skills[action.skill] ?? 0) - (plain.skills[action.skill] ?? 0),
    }).toEqual(TIER2_POTIONS[potion]);
  });
});

// Thistlewood Burrow by hand (wave 20): the second dungeon is the best active
// content of tier 2, not strictly dominated by re-running the grotto. At
// level 40, in the best tier-2 gear the level wears (tests/data/fighting.ts)
// with 20 cooked swordfish, lane C's careful player (tests/scene/burrowBot.ts,
// twelve seeds, a person's 0.4 s to react) clears it; an hour is the median
// clear plus fifteen seconds of round trip, what falls the tables' average
// (`handRunOf`), less the fish eaten as sold instead. The grotto is measured
// the same way, re-run by the same level-40 character (lane C's grotto
// player): far quicker than at 20, and nearly no fish. The burrow earns more
// coins an hour than that by at least a tenth, and more XP; and more than the
// best fight for money at 40 (`bestFightHour`). Not held: XP against an idle
// fight. A dungeon's rooms are walked, its lanterns lit and its foes met a
// few at a time, so by hand it pays well under half the XP of a fight back to
// back (wave 21: 74,711 an hour against 190,055; the grotto by hand at 20 paid
// 0.73 of that level's best fight). Wave 21: the cast as the tables have it
// (`BURROW_CAST`): 12 of 12 cleared, 186,557 coins earned an hour against the
// grotto re-run's 151,210 and the hobgoblin's 165,264.
// The hour by hand is the bot's, which lane C may re-tune; only the run's
// worth and XP are pinned.
describe('Thistlewood Burrow by hand (wave 20)', () => {
  const ROUND_TRIP_MS = 15_000;
  const SEEDS = Array.from({ length: 12 }, (_, i) => (i + 1) * 7919);
  const median = (xs: readonly number[]): number =>
    [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
  const fish = CONTENT.items.cooked_swordfish!.value;

  it('earns more an hour at level 40 than re-running the grotto, or the best fight for money', () => {
    const hero = characterAt(40, { tier2: true, food: 20 });
    const burrow = CONTENT.dungeons!.thistlewood_burrow!;
    const grotto = CONTENT.dungeons!.brinebeards_grotto!;
    const byHand = (
      runs: readonly { cleared: boolean; ms: number; eaten: number }[],
      run: { worth: number; xp: number },
    ): { xp: number; earned: number; clears: number } => {
      const cleared = runs.filter((r) => r.cleared);
      const hours = (median(cleared.map((r) => r.ms)) + ROUND_TRIP_MS) / HOUR;
      const eaten = median(runs.map((r) => r.eaten)) * fish;
      return { xp: run.xp / hours, earned: (run.worth - eaten) / hours, clears: cleared.length };
    };
    const burrowRun = handRunOf(burrow);
    const grottoRun = handRunOf(grotto);
    // Pinned so a change is seen: a burrow run by its tables is worth about 31,285 coins and pays
    // 10,665 XP (its foes at tier 2's 270%); the grotto's 10,086 and 3,230.
    expect([Math.round(burrowRun.worth), burrowRun.xp]).toEqual([31285, 10665]);
    expect([Math.round(grottoRun.worth), grottoRun.xp]).toEqual([10086, 3230]);
    const fighter = fighterOf(hero, CONTENT);
    const there = byHand(
      SEEDS.map((seed) => playBurrow(fighter, seed, { reactMs: 400, monsters: BURROW_CAST })),
      burrowRun,
    );
    const again = byHand(
      SEEDS.map((seed) => playThrough(hero, seed, { reactMs: 400 })),
      grottoRun,
    );
    expect(there.clears).toBeGreaterThanOrEqual(10);
    expect(again.clears).toBe(12);
    expect(there.earned / again.earned).toBeGreaterThan(1.1);
    expect(there.xp / again.xp).toBeGreaterThan(1.1);
    expect(there.earned).toBeGreaterThan(bestFightHour(40, true).earned);
  }, 240_000);
});

// The Burrow's days by hand (wave 21), held as the grotto's are: every trade is
// worth choosing and none is a must. An hour by hand on a modifier day pays
// between 1.0 and 1.3 times a plain day's, by the mean of XP and coins' worth
// earned (what falls, as settling pays it, less the swordfish eaten as sold
// instead), and neither measure falls below 0.9 or passes 1.3. An hour is lane
// C's careful player at combat 40 in the full tier-2 kit with 30 swordfish
// (food to spare, so a day's cost in fish shows), twelve seeds, the median
// clear plus fifteen seconds of round trip. Each day is cleared on at least
// 10 of 12 (whether it is cleared often enough is lane C's measure, over 48).
describe('the Burrow’s days by hand (wave 21)', () => {
  const ROUND_TRIP_MS = 15_000;
  const SEEDS = Array.from({ length: 12 }, (_, i) => (i + 1) * 7919);
  const median = (xs: readonly number[]): number =>
    [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
  const burrow = CONTENT.dungeons!.thistlewood_burrow!;
  const fish = CONTENT.items.cooked_swordfish!;
  const fighter = fighterOf(characterAt(40, { tier2: true, food: 30 }), CONTENT);

  const handHour = (modifier: string | null): { xp: number; earned: number; clears: number } => {
    const effects = (modifier && CONTENT.modifiers![modifier]!.effects) || {};
    // The scene feeds him as the day says (lane C's `foodUnder`), so the day is measured as meant.
    const fed = beginBurrow(fighter, 1, modifier ?? undefined, BURROW_CAST).battle!.fighter.food!;
    expect(fed.heals, String(modifier)).toBe(foodUnder(fish.heals!, effects));
    const runs = SEEDS.map((seed) =>
      playBurrow(fighter, seed, {
        reactMs: 400,
        monsters: BURROW_CAST,
        ...(modifier ? { modifier } : {}),
      }),
    );
    const cleared = runs.filter((run) => run.cleared);
    const hours = (median(cleared.map((run) => run.ms)) + ROUND_TRIP_MS) / HOUR;
    const run = handRunOf(burrow, effects);
    const eaten = median(runs.map((r) => r.eaten)) * fish.value;
    return { xp: run.xp / hours, earned: (run.worth - eaten) / hours, clears: cleared.length };
  };

  it('pays each trade 1.0 to 1.3 times a plain day’s hour by hand', () => {
    const plain = handHour(null);
    const ratios: Record<string, [number, number, number]> = {};
    for (const modifier of burrow.modifiers!) {
      const day = handHour(modifier);
      expect(day.clears, modifier).toBeGreaterThanOrEqual(10);
      const xp = day.xp / plain.xp;
      const earned = day.earned / plain.earned;
      const mean = (xp + earned) / 2;
      expect(mean, modifier).toBeGreaterThanOrEqual(1);
      expect(mean, modifier).toBeLessThanOrEqual(1.3);
      for (const each of [xp, earned]) {
        expect(each, modifier).toBeGreaterThanOrEqual(0.9);
        expect(each, modifier).toBeLessThanOrEqual(1.3);
      }
      const round = (n: number): number => Math.round(n * 100) / 100;
      ratios[modifier] = [round(xp), round(earned), round(mean)];
    }
    // Pinned so a change is seen: XP, earned and their mean against a plain day.
    expect(ratios).toEqual(BURROW_DAYS);
  }, 480_000);
});

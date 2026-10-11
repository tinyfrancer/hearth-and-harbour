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
import { characterAt, fight, hourOf, hoursToLevel as hoursOfFighting } from './fighting';
import { handRunOf, idleHourOf } from './idleRuns';
import { novice, playCave } from '../scene/caveBot';
import { playThrough, prepared } from '../scene/grottoBot';

/** The pins of the idle dungeon cases, measured (S16). */
const HAND_CAVE_XP = 11530;
const IDLE_CAVE: number[][] = [
  [26, 7265],
  [26, 7170],
  [26, 7265],
];
const HAND_GROTTO_XP = 22631;
const IDLE_GROTTO: number[] = [5, 18750, 8095];
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
    expect(coins).toBeLessThan(bestGatheringHour(dungeon.recommended) / 2);
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
    }
  }, 240_000);
});

function ok(result: { ok: true; state: GameState } | { ok: false; reason: string }): GameState {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

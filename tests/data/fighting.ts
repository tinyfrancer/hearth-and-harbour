import { advance } from '../../src/core/actions';
import { playerCombat, startFight } from '../../src/core/combat';
import type { Slot } from '../../src/core/content';
import { seedFrom } from '../../src/core/rng';
import { newGame, skillLevel, type GameState, type Worn } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';
import { CONTENT } from '../../src/data';

// The simulations that hold combat's balance (tests/data/duels.test.ts and
// tests/data/pacing.test.ts) play the real rules on the real tables, as a
// sensible player would set a character up.

export const HOUR = 60 * 60 * 1000;

type Gear = Partial<Record<Slot, Worn>>;
const one = (item: string): Worn => ({ item, qty: 1 });

/**
 * What a character of a level fights in: the best that level may wear of what
 * tier 1 makes, the way the gear ladder climbs. Linen and a bronze sword to
 * start; bronze plate from level 5 (a few hours of Smithing in); iron from
 * 10, when it may be worn; shell jewellery from 15. An archer wears leather.
 */
export function gearAt(level: number, style: 'melee' | 'ranged' = 'melee'): Gear {
  if (style === 'ranged') {
    return {
      main_hand: one(
        level >= 15 ? 'willow_shortbow' : level >= 10 ? 'oak_shortbow' : 'pine_shortbow',
      ),
      ammo: { item: level >= 10 ? 'iron_arrows' : 'bronze_arrows', qty: 100_000 },
      head: one(level >= 5 ? 'leather_cap' : 'linen_hood'),
      body: one(level >= 5 ? 'leather_jerkin' : 'linen_tunic'),
      legs: one('linen_trousers'),
      wrist: one('leather_bracers'),
      ...(level >= 15 ? { neck: one('shell_necklace') } : {}),
    };
  }
  if (level < 5) {
    return {
      main_hand: one('bronze_sword'),
      head: one('linen_hood'),
      body: one('linen_tunic'),
      legs: one('linen_trousers'),
    };
  }
  const metal = level >= 10 ? 'iron' : 'bronze';
  return {
    main_hand: one(`${metal}_sword`),
    off_hand: one(`${metal}_shield`),
    head: one(`${metal}_helmet`),
    body: one(`${metal}_breastplate`),
    legs: one('linen_trousers'),
    ...(level >= 15 ? { neck: one('shell_necklace'), wrist: one('shell_bracelet') } : {}),
  };
}

/** The cooked fish a character of a level would have: what their tier of Fishing catches. */
export function foodAt(level: number): string {
  return level >= 15 ? 'cooked_cod' : level >= 8 ? 'cooked_herring' : 'cooked_shrimp';
}

/** A character with every combat skill at `level`, in that level's gear, with dice of `seed`. */
export function characterAt(
  level: number,
  { style = 'melee' as 'melee' | 'ranged', seed = 1, food = 0 } = {},
): GameState {
  const xp = xpForLevel(level);
  return {
    ...newGame('Sim', 0),
    rng: seedFrom(seed),
    skills: level > 1 ? { melee: xp, ranged: xp, defence: xp, vitality: xp } : {},
    equipment: gearAt(level, style),
    food: food > 0 ? { item: foodAt(level), qty: food } : null,
  };
}

export function fight(state: GameState, monster: string): GameState {
  const result = startFight(state, monster, CONTENT);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

/** One monster, fought from full health: who won, and how much of the character's health it cost. */
export function duel(state: GameState, monster: string): { won: boolean; lost: number } {
  const start = fight(state, monster);
  const settled = (at: GameState): boolean => !at.fight || at.fight.kills > 0;
  // The first moment it is settled, to the millisecond.
  let lo = 0;
  let hi = 60_000;
  while (!settled(advance(start, hi, CONTENT))) hi *= 2;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (settled(advance(start, mid, CONTENT))) hi = mid;
    else lo = mid;
  }
  const end = advance(start, hi, CONTENT);
  if (!end.fight) return { won: false, lost: 1 };
  // Just before the killing blow: what it cost, before the breather after it.
  const before = advance(start, hi - 1, CONTENT).fight!;
  return { won: true, lost: 1 - before.hp / start.fight!.hp };
}

/** Many duels with different dice: how often the character wins, and what an average win costs. */
export function duels(
  level: number,
  monster: string,
  count = 200,
  style: 'melee' | 'ranged' = 'melee',
): { winRate: number; meanLost: number } {
  let wins = 0;
  let lost = 0;
  for (let seed = 1; seed <= count; seed += 1) {
    const result = duel(characterAt(level, { style, seed }), monster);
    if (result.won) {
      wins += 1;
      lost += result.lost;
    }
  }
  return { winRate: wins / count, meanLost: wins ? lost / wins : 1 };
}

/**
 * An hour of fighting one monster with plenty of food, starting again after a
 * death as a player would. What it cost and what it paid.
 */
export function hourOf(
  level: number,
  monster: string,
  { style = 'melee' as 'melee' | 'ranged', seed = 1 } = {},
): { kills: number; eaten: number; deaths: number; xpPerHour: number } {
  const food = 100_000;
  let state = fight(characterAt(level, { style, seed, food }), monster);
  const skill = playerCombat(state, CONTENT).skill;
  const xpBefore = state.skills[skill] ?? 0;
  let deaths = 0;
  for (let minute = 0; minute < 60; minute += 1) {
    state = advance(state, 60_000, CONTENT);
    if (!state.fight) {
      deaths += 1;
      state = fight(state, monster);
    }
  }
  return {
    kills: state.bestiary[monster]?.kills ?? 0,
    eaten: food - (state.food?.qty ?? 0),
    deaths,
    xpPerHour: (state.skills[skill] ?? 0) - xpBefore,
  };
}

/** The strongest monster a character should take on at their level: the highest at or below it. */
export function monsterFor(level: number): string {
  return Object.values(CONTENT.monsters!)
    .filter((monster) => monster.level <= level)
    .sort((a, b) => b.level - a.level)[0]!.id;
}

/**
 * Hours from a fresh character to `target` in a combat skill, fighting the
 * strongest monster of their level in their level's gear, with food on hand,
 * looked at again once a minute: a new monster or new gear when the level
 * allows, and a fresh start after a death.
 */
export function hoursToLevel(
  skill: string,
  target: number,
  style: 'melee' | 'ranged' = 'melee',
): { hours: number; deaths: number; eaten: number } {
  let state = { ...newGame('Sim', 0), rng: seedFrom(7) };
  let elapsed = 0;
  let deaths = 0;
  let eaten = 0;
  while (skillLevel(state, skill) < target) {
    // Gear and food follow the lowest of the skills the fight reads.
    const level = Math.min(...['defence', 'vitality', style].map((id) => skillLevel(state, id)));
    state = { ...state, equipment: gearAt(level, style), food: { item: foodAt(level), qty: 1000 } };
    if (!state.fight || state.fight.monster !== monsterFor(level)) {
      state = fight(state, monsterFor(level));
    }
    state = advance(state, 60_000, CONTENT);
    eaten += 1000 - (state.food?.qty ?? 0);
    if (!state.fight) deaths += 1;
    elapsed += 60_000;
    if (elapsed > 100 * HOUR) throw new Error(`${skill} never reached ${target}`);
  }
  return { hours: elapsed / HOUR, deaths, eaten };
}

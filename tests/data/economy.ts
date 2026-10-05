import { advance, startAction } from '../../src/core/actions';
import type { ActionDef } from '../../src/core/content';
import { markChance } from '../../src/core/thieving';
import { newGame, skillLevel, type GameState } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';
import { CONTENT } from '../../src/data';
import { HOUR, characterAt, fight, foodAt, monsterFor } from './fighting';

// What an hour of each way of earning brings in, in coins, played as a
// sensible player would: the best-paying thing open, looked at again once a
// minute. It is what the sale values in src/data/items.ts are set by
// (tests/data/pacing.test.ts pins the results).

const MINUTE = 60_000;

export const GATHERING = ['woodcutting', 'fishing', 'mining', 'foraging'] as const;
export const ARTISAN = ['cooking', 'smithing', 'crafting', 'fletching', 'alchemy'] as const;

export const value = (item: string): number => CONTENT.items[item]!.value;

/** What a bank (or any count of things) would sell for. */
export const worth = (items: Readonly<Record<string, number>>): number =>
  Object.entries(items).reduce((sum, [item, qty]) => sum + qty * value(item), 0);

/** What one completion of an action makes, sold. */
export const madeWorth = (action: ActionDef): number =>
  action.gives.reduce((sum, { item, qty }) => sum + qty * value(item), 0);

/** What one completion of an action uses, sold instead. */
export const usedWorth = (action: ActionDef): number =>
  (action.uses ?? []).reduce((sum, { item, qty }) => sum + qty * value(item), 0);

/** Coins an action adds in a millisecond: what it makes, less what it uses, sold. */
export const addedPerMs = (action: ActionDef): number =>
  (madeWorth(action) - usedWorth(action)) / action.durationMs;

const actionsOf = (skill: string): ActionDef[] =>
  Object.values(CONTENT.actions).filter((action) => action.skill === skill);

/** A fresh character with one skill at a level. */
export const at = (skill: string, level: number): GameState => ({
  ...newGame('Sim', 0),
  skills: level > 1 ? { [skill]: xpForLevel(level) } : {},
});

export interface SkillHour {
  /** What was made or gathered, by item id. */
  made: Record<string, number>;
  /** What it sells for. */
  gross: number;
  /** What the materials it used would have sold for. */
  used: number;
  /** Gross less used: what the hour itself earned. */
  earned: number;
}

/**
 * An hour of a gathering or artisan skill from a level: each minute the open
 * action that adds the most coins, with whatever an artisan's recipes use on
 * hand (as its pacing assumes).
 */
export function skillHour(skill: string, level: number): SkillHour {
  const actions = actionsOf(skill);
  const plenty = 1_000_000;
  const inputs = [...new Set(actions.flatMap((action) => action.uses ?? []).map((u) => u.item))];
  let state = at(skill, level);
  const made: Record<string, number> = {};
  let used = 0;
  for (let minute = 0; minute < 60; minute += 1) {
    const stocked = { ...state.bank };
    for (const item of inputs) stocked[item] = plenty;
    const open = actions.filter((action) => action.level <= skillLevel(state, skill));
    const best = open.sort((a, b) => addedPerMs(b) - addedPerMs(a))[0]!;
    const started = startAction({ ...state, bank: stocked }, best.id, CONTENT);
    if (!started.ok) throw new Error(started.reason);
    const before = started.state.bank;
    state = advance(started.state, MINUTE, CONTENT);
    for (const [item, qty] of Object.entries(state.bank)) {
      const change = qty - (before[item] ?? 0);
      if (change > 0) made[item] = (made[item] ?? 0) + change;
      else if (change < 0) used += -change * value(item);
    }
    state = { ...state, bank: {}, action: null };
  }
  const gross = worth(made);
  return { made, gross, used, earned: gross - used };
}

/** An hour of the gathering skill that pays best from a level, all of it sold. */
export function bestGatheringHour(level: number): number {
  return Math.max(...GATHERING.map((skill) => skillHour(skill, level).gross));
}

/** A mark's expected pay a millisecond, in coins, at the thief's chance now. */
function markPay(state: GameState, mark: ActionDef): number {
  const steal = mark.steal!;
  const chance = markChance(state, mark);
  return (
    (chance * (steal.coins[0] + steal.coins[1]) * 0.5) /
    (mark.durationMs + (1 - chance) * steal.stunMs)
  );
}

/** An hour of Thieving from a level on the mark that pays best: coins, and the loot sold. */
export function thievingHour(level: number): { coins: number; loot: number } {
  const marks = actionsOf('thieving');
  let state = at('thieving', level);
  for (let minute = 0; minute < 60; minute += 1) {
    const open = marks.filter((mark) => mark.level <= skillLevel(state, 'thieving'));
    const best = open.sort((a, b) => markPay(state, b) - markPay(state, a))[0]!;
    const started = startAction(state, best.id, CONTENT);
    if (!started.ok) throw new Error(started.reason);
    state = advance(started.state, MINUTE, CONTENT);
  }
  return { coins: state.coins, loot: worth(state.bank) };
}

export interface FightHour {
  monster: string;
  kills: number;
  coins: number;
  /** The loot, sold. */
  loot: number;
  /** The fish eaten, as sold instead. */
  food: number;
  /** The arrows shot, as sold instead. */
  arrows: number;
  /** Coins and loot less the food and arrows: what the hour earned. */
  earned: number;
}

/**
 * An hour fighting the strongest monster anyone may fight at a level, every
 * combat skill at it, in that level's gear (tests/data/fighting.ts), eating
 * that level's fish, starting again after a knock-out.
 */
export function fightHour(
  level: number,
  style: 'melee' | 'ranged' = 'melee',
  monster = monsterFor(level),
): FightHour {
  const plenty = 100_000;
  const fresh = characterAt(level, { style, seed: 3, food: plenty });
  let state = fight(fresh, monster);
  for (let minute = 0; minute < 60; minute += 1) {
    state = advance(state, MINUTE, CONTENT);
    if (!state.fight) state = fight(state, monster);
  }
  const eaten = plenty - (state.food?.qty ?? 0);
  const coins = state.coins;
  const loot = worth(state.bank);
  const food = eaten * value(foodAt(level));
  const quiver = fresh.equipment.ammo;
  const arrows = quiver ? (quiver.qty - (state.equipment.ammo?.qty ?? 0)) * value(quiver.item) : 0;
  return {
    monster,
    kills: state.bestiary[monster]?.kills ?? 0,
    coins,
    loot,
    food,
    arrows,
    earned: coins + loot - food - arrows,
  };
}

export { HOUR };

/**
 * The best-paying fight a character of a level would pick for money: of the
 * monsters anyone may fight at or below the level, the one whose hour, fought
 * with melee, earns most after the fish eaten.
 */
export function bestFightHour(level: number): FightHour {
  const open = Object.values(CONTENT.monsters!).filter(
    (monster) => monster.level <= level && !monster.bountyOnly,
  );
  return open
    .map((monster) => fightHourOf(level, monster.id))
    .sort((a, b) => b.earned - a.earned)[0]!;
}

/** An hour fighting one monster at a level: `fightHour` against a chosen monster. */
export function fightHourOf(
  level: number,
  monster: string,
  style: 'melee' | 'ranged' = 'melee',
): FightHour {
  return fightHour(level, style, monster);
}

/**
 * What lies behind one of a made thing, back to what was gathered for it:
 * the gathered things' sale value, the time spent gathering them, and the
 * time spent gathering and making it all. Null for anything that is not made
 * from gathered things alone (leather comes from fighting).
 */
export function chainOf(item: string): { raw: number; gatherMs: number; totalMs: number } | null {
  const gathered = Object.values(CONTENT.actions).find(
    (action) => !action.uses && !action.steal && action.gives.some((g) => g.item === item),
  );
  if (gathered) {
    const each = gathered.durationMs / gathered.gives[0]!.qty;
    return { raw: value(item), gatherMs: each, totalMs: each };
  }
  const made = Object.values(CONTENT.actions).find(
    (action) => action.uses && action.gives.some((g) => g.item === item),
  );
  if (!made) return null;
  let raw = 0;
  let gatherMs = 0;
  let totalMs = made.durationMs;
  for (const { item: input, qty } of made.uses!) {
    const behind = chainOf(input);
    if (!behind) return null;
    raw += behind.raw * qty;
    gatherMs += behind.gatherMs * qty;
    totalMs += behind.totalMs * qty;
  }
  const makes = made.gives[0]!.qty;
  return { raw: raw / makes, gatherMs: gatherMs / makes, totalMs: totalMs / makes };
}

/**
 * How much better, a millisecond, gathering everything for a made thing and
 * making it pays than selling what was gathered: 1 is no better.
 */
export function chainPremium(item: string): number | null {
  const chain = chainOf(item);
  if (!chain) return null;
  return value(item) / chain.totalMs / (chain.raw / chain.gatherMs);
}

import type { ActionDef } from './content';
import { Dice } from './rng';
import { masteryLevel, skillLevel, type GameState, type MarkRecord } from './state';
import { Trained, masteryXpPer } from './xp';

/**
 * Thieving's rules. A theft is an action whose row has a `steal` (a mark):
 * it is started, stopped and mastered like any other, but each attempt goes
 * by chance, so `advance` hands it to `advanceTheft` here, which walks it
 * attempt by attempt with the save's dice, as a fight is walked blow by blow.
 *
 * Each rule in a sentence:
 * - An attempt takes the mark's set time, whatever the level or mastery.
 * - The thief's rating is 10, plus the Thieving level, plus half the mark's
 *   mastery level (rounded down).
 * - An attempt succeeds with the chance rating / (rating + the mark's
 *   difficulty), and never more than 95% of the time.
 * - A success pays the mark's coins and XP, mastery of the mark, and rolls
 *   each thing in its loot on its own.
 * - Being caught is a stun of the mark's `stunMs` in which nothing happens,
 *   then the next attempt begins. It costs nothing else: no coins, no items,
 *   no health.
 */

/** There is always somebody looking. */
export const MAX_STEAL_CHANCE = 0.95;

export function thiefRating(level: number, mastery: number): number {
  return 10 + level + Math.floor(mastery / 2);
}

export function stealChance(rating: number, difficulty: number): number {
  return Math.min(MAX_STEAL_CHANCE, rating / (rating + difficulty));
}

/** The chance this character's next attempt on a mark succeeds. */
export function markChance(state: GameState, action: ActionDef): number {
  const rating = thiefRating(skillLevel(state, action.skill), masteryLevel(state, action.id));
  return stealChance(rating, action.steal?.difficulty ?? 0);
}

/**
 * Move a theft forward by `ms`: the theft's half of `advance`.
 *
 * Attempt by attempt, in order: the stun after being caught runs out, the
 * next attempt's time fills, and the attempt rolls the dice (success first,
 * then its coins, then each thing in the loot, and how many of it). An
 * attempt or the end of a stun falling exactly at the end of the time is part
 * of it. The chance is read afresh for every attempt, so a level or mastery
 * level gained on one attempt counts from the next, however the time is cut.
 *
 * The walk keeps its numbers in plain variables and builds one new state at
 * the end: a day away is about twenty-five thousand attempts.
 */
export function advanceTheft(state: GameState, action: ActionDef, ms: number): GameState {
  const steal = action.steal!;
  const current = state.action!;
  const thieving = new Trained(state.skills[action.skill] ?? 0);
  const mastery = new Trained(state.mastery[action.id] ?? 0);
  const perSuccess = masteryXpPer(action);
  const dice = new Dice(state.rng);
  const known = state.marks[action.id];

  let progress = current.progressMs;
  let stun = current.stunMs ?? 0;
  let time = ms;
  let picked = 0;
  let caught = 0;
  let coins = 0;
  // Copied on the first thing found, so a frame with none copies nothing.
  let bank: Record<string, number> | null = null;
  let seen: string[] | null = null;

  for (;;) {
    if (stun > 0) {
      if (stun > time) {
        stun -= time;
        break;
      }
      time -= stun;
      stun = 0;
    }
    const need = action.durationMs - progress;
    if (need > time) {
      progress += time;
      break;
    }
    time -= need;
    progress = 0;
    const rating = thiefRating(thieving.level, mastery.level);
    if (dice.next() < stealChance(rating, steal.difficulty)) {
      picked += 1;
      coins += dice.between(steal.coins[0], steal.coins[1]);
      for (const { item, min, max, oneIn } of steal.loot) {
        if (dice.next() * oneIn < 1) {
          bank ??= { ...state.bank };
          seen ??= [...(known?.seen ?? [])];
          bank[item] = (bank[item] ?? 0) + dice.between(min, max);
          if (!seen.includes(item)) seen.push(item);
        }
      }
      thieving.add(action.xp);
      mastery.add(perSuccess);
    } else {
      caught += 1;
      stun = steal.stunMs;
    }
  }

  const next: GameState = {
    ...state,
    rng: dice.seed,
    action:
      stun > 0
        ? { id: action.id, progressMs: 0, stunMs: stun }
        : { id: action.id, progressMs: progress },
  };
  if (picked > 0) {
    next.skills = { ...state.skills, [action.skill]: thieving.xp };
    next.mastery = { ...state.mastery, [action.id]: mastery.xp };
    next.coins = state.coins + coins;
  }
  if (bank) next.bank = bank;
  if (picked + caught > 0) {
    const record: MarkRecord = {
      picked: (known?.picked ?? 0) + picked,
      caught: (known?.caught ?? 0) + caught,
      seen: seen ?? known?.seen ?? [],
    };
    next.marks = { ...state.marks, [action.id]: record };
  }
  return next;
}

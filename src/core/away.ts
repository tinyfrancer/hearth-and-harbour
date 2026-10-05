import { advance, missingInput } from './actions';
import { busy } from './combat';
import type { Content } from './content';
import { fightEnded } from './fight';
import { masteryLevel, skillLevel, type GameState } from './state';

/** The most time away that is ever paid for. */
export const OFFLINE_CAP_MS = 24 * 60 * 60 * 1000;

/** What happened while nobody was looking: everything the away report shows. */
export interface AwayReport {
  /** How long the game was really away. */
  awayMs: number;
  /** How much of that was paid for: `awayMs`, or the cap. */
  countedMs: number;
  /** The action that was running when the game was left, or null if it was a fight. */
  actionId: string | null;
  /** What came of the fight that was running when the game was left, or null if it was an action. */
  fight: null | {
    /** A MonsterDef id. */
    monster: string;
    kills: number;
    /** Food eaten from the food slot, and what it was (null if the slot was empty). */
    eaten: number;
    food: string | null;
    /** Arrows shot. */
    arrows: number;
  };
  /**
   * Items gained (or, for something an action uses, lost) by item id. Nothing
   * at zero. Food and arrows a fight uses are not in the bank, so not here.
   */
  items: Record<string, number>;
  /** Coins gained. */
  coins: number;
  /** XP gained by skill id. */
  xp: Record<string, number>;
  /** Skills that gained levels. */
  levels: Record<string, { from: number; to: number }>;
  /** Actions whose mastery level rose, by action id. */
  mastery: Record<string, { from: number; to: number }>;
  /** Why the action or fight is no longer running, or null if it still is. */
  stopped:
    | null
    | { reason: 'ran_out'; item: string }
    | { reason: 'gone' }
    | { reason: 'died' }
    | { reason: 'no_arrows' };
  /**
   * What became of the potion: charges used and whether that was the last of
   * them. Null when no potion helped with anything.
   */
  potion: null | { item: string; used: number; ranOut: boolean };
}

/**
 * Pay for time away. This is `advance` and nothing else, with a cap on the
 * time and an account of the difference: a night away and a night of live
 * frames cannot disagree, because they are the same sum.
 *
 * The report is null when nothing was running, so there is nothing to tell.
 */
export function catchUp(
  state: GameState,
  awayMs: number,
  content: Content,
): { state: GameState; report: AwayReport | null } {
  // A clock set backwards makes a negative gap; it pays nothing.
  const away = Number.isFinite(awayMs) ? Math.max(awayMs, 0) : 0;
  if (!busy(state) || away === 0) {
    return { state, report: null };
  }
  const countedMs = Math.min(away, OFFLINE_CAP_MS);
  const after = advance(state, countedMs, content);

  const items: Record<string, number> = {};
  for (const item of new Set([...Object.keys(state.bank), ...Object.keys(after.bank)])) {
    const change = (after.bank[item] ?? 0) - (state.bank[item] ?? 0);
    if (change !== 0) items[item] = change;
  }
  const xp: Record<string, number> = {};
  const levels: AwayReport['levels'] = {};
  for (const [skill, total] of Object.entries(after.skills)) {
    const gained = total - (state.skills[skill] ?? 0);
    if (gained > 0) xp[skill] = gained;
    const from = skillLevel(state, skill);
    const to = skillLevel(after, skill);
    if (to > from) levels[skill] = { from, to };
  }

  const mastery: AwayReport['mastery'] = {};
  for (const action of Object.keys(after.mastery)) {
    const from = masteryLevel(state, action);
    const to = masteryLevel(after, action);
    if (to > from) mastery[action] = { from, to };
  }

  let stopped: AwayReport['stopped'] = null;
  let fight: AwayReport['fight'] = null;
  if (state.fight) {
    const { monster } = state.fight;
    const ended = fightEnded(state, after, content);
    if (ended) stopped = { reason: ended };
    const left = (worn: { item: string; qty: number } | null | undefined, item: string): number =>
      worn?.item === item ? worn.qty : 0;
    fight = {
      monster,
      kills: (after.bestiary[monster]?.kills ?? 0) - (state.bestiary[monster]?.kills ?? 0),
      eaten: state.food ? state.food.qty - left(after.food, state.food.item) : 0,
      food: state.food?.item ?? null,
      arrows: state.equipment.ammo
        ? state.equipment.ammo.qty - left(after.equipment.ammo, state.equipment.ammo.item)
        : 0,
    };
  } else if (state.action && !after.action) {
    const action = content.actions[state.action.id];
    const short = action && missingInput(after, action);
    stopped = short ? { reason: 'ran_out', item: short.item } : { reason: 'gone' };
  }

  // Only `advance` ran, and it never swaps one potion for another, so what is
  // left (if anything) is the same potion with fewer charges.
  const used = state.potion ? state.potion.charges - (after.potion?.charges ?? 0) : 0;
  const potion: AwayReport['potion'] =
    state.potion && used > 0 ? { item: state.potion.item, used, ranOut: !after.potion } : null;

  return {
    state: after,
    report: {
      awayMs: away,
      countedMs,
      actionId: state.action?.id ?? null,
      fight,
      items,
      coins: after.coins - state.coins,
      xp,
      levels,
      mastery,
      stopped,
      potion,
    },
  };
}

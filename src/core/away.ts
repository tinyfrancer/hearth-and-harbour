import { advance, missingInput } from './actions';
import { busy } from './combat';
import type { Content } from './content';
import { fightEnded } from './fight';
import { idleRunEnded } from './idleRun';
import { masteryLevel, skillLevel, stat, type GameState } from './state';

/** The most time away that is ever paid for. */
export const OFFLINE_CAP_MS = 24 * 60 * 60 * 1000;

/** What happened while nobody was looking: everything the away report shows. */
export interface AwayReport {
  /** How long the game was really away. */
  awayMs: number;
  /** How much of that was paid for: `awayMs`, or the cap. */
  countedMs: number;
  /** The action that was running when the game was left, or null if it was a fight or idle runs. */
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
   * What came of the dungeon being run idle when the game was left, or null:
   * runs finished, foes felled, food eaten (and what it was) and arrows shot.
   */
  dungeon: null | {
    /** A DungeonDef id. */
    dungeon: string;
    runs: number;
    kills: number;
    eaten: number;
    food: string | null;
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
  /** What came of the theft that was running when the game was left, or null. */
  theft: null | {
    /** The mark's ActionDef id. */
    mark: string;
    attempts: number;
    picked: number;
    caught: number;
  };
  /**
   * How the bounty held came along: kills made towards it while away, where
   * it stands, and whether it is ready to hand in. Null when no bounty was
   * held, or it gained nothing and was not already done.
   */
  bounty: null | { monster: string; gained: number; done: number; count: number; ready: boolean };
  /**
   * What auto bounty handed in while away: how many bounties, the points
   * they paid (their coins are in `coins`), and the monsters they were on
   * (MonsterDef ids, each once, in table order). Null when it handed in none.
   */
  claimed: null | { bounties: number; points: number; monsters: string[] };
  /** Why the action, fight or idle runs are no longer running, or null if they still are. */
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
 * The monsters whose bounties auto bounty handed in between `before` and
 * `after`, read off the bestiary with no new state: it hands one in only on
 * the kill that finishes the bounty on the monster being fought, and then the
 * fight follows the next bounty, so every kill in that time was of a bounty's
 * monster. Each monster killed was handed in, but for the bounty now held,
 * unless more of its monster fell than that bounty counts (it was handed in
 * earlier in the chain too).
 */
function claimedOn(before: GameState, after: GameState, content: Content): string[] {
  const held = after.bounty;
  return Object.keys(content.monsters ?? {}).filter((id) => {
    const killed = (after.bestiary[id]?.kills ?? 0) - (before.bestiary[id]?.kills ?? 0);
    return killed > (held?.monster === id ? held.done : 0);
  });
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
  const countedMs = Math.min(away, OFFLINE_CAP_MS);
  if (!busy(state) || away === 0) {
    // A hurt character heals while away, but that is nothing to report.
    return { state: advance(state, countedMs, content), report: null };
  }
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
  let dungeon: AwayReport['dungeon'] = null;
  const left = (worn: { item: string; qty: number } | null | undefined, item: string): number =>
    worn?.item === item ? worn.qty : 0;
  if (state.idleRun) {
    const id = state.idleRun.dungeon;
    const ended = idleRunEnded(state, after, content);
    if (ended) stopped = { reason: ended };
    const killed = (at: GameState): number =>
      Object.values(at.bestiary).reduce((sum, record) => sum + record.kills, 0);
    dungeon = {
      dungeon: id,
      runs: (after.dungeons[id]?.idleRuns ?? 0) - (state.dungeons[id]?.idleRuns ?? 0),
      kills: killed(after) - killed(state),
      eaten: state.food ? state.food.qty - left(after.food, state.food.item) : 0,
      food: state.food?.item ?? null,
      arrows: state.equipment.ammo
        ? state.equipment.ammo.qty - left(after.equipment.ammo, state.equipment.ammo.item)
        : 0,
    };
  } else if (state.fight) {
    const { monster } = state.fight;
    const ended = fightEnded(state, after, content);
    if (ended) stopped = { reason: ended };
    // Every kill counts, whoever it was: auto bounty may have moved the fight on.
    const killed = (at: GameState): number =>
      Object.values(at.bestiary).reduce((sum, record) => sum + record.kills, 0);
    fight = {
      monster,
      kills: killed(after) - killed(state),
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

  let theft: AwayReport['theft'] = null;
  const mark = state.action && content.actions[state.action.id];
  if (mark?.steal) {
    const was = state.marks[mark.id];
    const now = after.marks[mark.id];
    const picked = (now?.picked ?? 0) - (was?.picked ?? 0);
    const caught = (now?.caught ?? 0) - (was?.caught ?? 0);
    theft = { mark: mark.id, attempts: picked + caught, picked, caught };
  }

  // Only fighting changes a bounty while time passes (a fight or idle runs): by
  // counting kills, and with auto bounty by handing one in and taking the next.
  const handed = stat(after, 'bounties') - stat(state, 'bounties');
  const claimed: AwayReport['claimed'] =
    handed > 0
      ? {
          bounties: handed,
          points: after.bountyPoints - state.bountyPoints,
          // Idle runs fell more than the bounty's monster, so which were handed in cannot be read.
          monsters: state.idleRun ? [] : claimedOn(state, after, content),
        }
      : null;
  let bounty: AwayReport['bounty'] = null;
  if (after.bounty && (state.bounty || claimed)) {
    const { monster, done, count } = after.bounty;
    const same = !claimed && state.bounty?.monster === monster;
    const gained = same ? done - state.bounty!.done : done;
    if (gained > 0 || done >= count || claimed) {
      bounty = { monster, gained, done, count, ready: done >= count };
    }
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
      dungeon,
      items,
      coins: after.coins - state.coins,
      xp,
      levels,
      mastery,
      theft,
      bounty,
      claimed,
      stopped,
      potion,
    },
  };
}

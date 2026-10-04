import { advance, missingInput } from './actions';
import type { Content } from './content';
import { masteryLevel, skillLevel, type GameState } from './state';

/** The most time away that is ever paid for. */
export const OFFLINE_CAP_MS = 24 * 60 * 60 * 1000;

/** What happened while nobody was looking: everything the away report shows. */
export interface AwayReport {
  /** How long the game was really away. */
  awayMs: number;
  /** How much of that was paid for: `awayMs`, or the cap. */
  countedMs: number;
  /** The action that was running when the game was left. */
  actionId: string;
  /** Items gained (or, for something an action uses, lost) by item id. Nothing at zero. */
  items: Record<string, number>;
  /** XP gained by skill id. */
  xp: Record<string, number>;
  /** Skills that gained levels. */
  levels: Record<string, { from: number; to: number }>;
  /** Actions whose mastery level rose, by action id. */
  mastery: Record<string, { from: number; to: number }>;
  /** Why the action is no longer running, or null if it still is. */
  stopped: null | { reason: 'ran_out'; item: string } | { reason: 'gone' };
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
  if (!state.action || away === 0) {
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
  if (!after.action) {
    const action = content.actions[state.action.id];
    const short = action && missingInput(after, action);
    stopped = short ? { reason: 'ran_out', item: short.item } : { reason: 'gone' };
  }

  return {
    state: after,
    report: {
      awayMs: away,
      countedMs,
      actionId: state.action.id,
      items,
      xp,
      levels,
      mastery,
      stopped,
    },
  };
}

import type { ActionDef, Content } from './content';
import { bankCount, masteryLevel, masteryXp, skillLevel, type GameState } from './state';
import { MAX_LEVEL, xpForLevel } from './xp';

export type StartResult = { ok: true; state: GameState } | { ok: false; reason: string };

/** Mastery XP per second of an action's base time. Level 99 is about 88 hours of one thing. */
const MASTERY_XP_PER_SECOND = 12;
/** Each mastery level past the first makes its action this much quicker: 19.6% at 99. */
export const MASTERY_SPEED_PER_LEVEL = 0.002;

/** Mastery XP one completion of an action is worth. Longer actions teach more. */
export function masteryXpPer(action: ActionDef): number {
  return Math.max(1, Math.round((action.durationMs / 1000) * MASTERY_XP_PER_SECOND));
}

/**
 * How long one completion takes at a mastery level. A whole number of
 * milliseconds, so that sums of them are exact and time cut into frames adds
 * up to the same as time taken whole.
 */
export function durationAt(action: ActionDef, mastery: number): number {
  return Math.max(1, Math.round(action.durationMs * (1 - MASTERY_SPEED_PER_LEVEL * (mastery - 1))));
}

/** How long one completion takes this character right now. */
export function actionDuration(state: GameState, action: ActionDef): number {
  return durationAt(action, masteryLevel(state, action.id));
}

/**
 * Begin an action, dropping whatever was under way: the character does one
 * thing at a time. Starting the action already running leaves it be, so a
 * double tap does not throw away progress.
 */
export function startAction(state: GameState, actionId: string, content: Content): StartResult {
  const action = content.actions[actionId];
  if (!action) {
    return { ok: false, reason: 'There is no such thing to do.' };
  }
  if (skillLevel(state, action.skill) < action.level) {
    const skill = content.skills[action.skill]?.name ?? action.skill;
    return { ok: false, reason: `Needs ${skill} level ${action.level}.` };
  }
  if (state.action?.id === actionId) {
    return { ok: true, state };
  }
  const short = missingInput(state, action);
  if (short) {
    const item = content.items[short.item]?.name ?? short.item;
    return { ok: false, reason: `Needs ${short.qty} ${item}.` };
  }
  return { ok: true, state: { ...state, action: { id: actionId, progressMs: 0 } } };
}

export function stopAction(state: GameState): GameState {
  return state.action ? { ...state, action: null } : state;
}

/** How many completions the bank can pay for. Infinity for an action that uses nothing. */
export function affordable(state: GameState, action: ActionDef): number {
  let most = Infinity;
  for (const { item, qty } of action.uses ?? []) {
    most = Math.min(most, Math.floor(bankCount(state, item) / qty));
  }
  return most;
}

/** The first thing an action uses that the bank cannot cover once, if any. */
export function missingInput(
  state: GameState,
  action: ActionDef,
): { item: string; qty: number } | null {
  return (action.uses ?? []).find(({ item, qty }) => bankCount(state, item) < qty) ?? null;
}

/** Pay `count` completions of an action: materials out, items, XP and mastery in. */
function complete(state: GameState, action: ActionDef, count: number): GameState {
  const bank = { ...state.bank };
  for (const { item, qty } of action.uses ?? []) {
    const left = (bank[item] ?? 0) - qty * count;
    if (left > 0) bank[item] = left;
    else delete bank[item];
  }
  for (const { item, qty } of action.gives) {
    bank[item] = (bank[item] ?? 0) + qty * count;
  }
  return {
    ...state,
    bank,
    skills: {
      ...state.skills,
      [action.skill]: (state.skills[action.skill] ?? 0) + action.xp * count,
    },
    mastery: {
      ...state.mastery,
      [action.id]: masteryXp(state, action.id) + masteryXpPer(action) * count,
    },
  };
}

/**
 * Move the game forward by `ms`. The only way time passes: live play calls it
 * every frame with a few milliseconds and offline catch-up calls it once with
 * hours, and both must land in the same place. So it is worked out in whole
 * completions by arithmetic, never by looping over ticks, and
 * advance(a) then advance(b) always equals advance(a + b).
 *
 * The one thing that changes as it goes is mastery, which makes the action
 * quicker. So the time is spent in stretches, each at one mastery level and
 * each ending on the completion that reaches the next: at most 98 of them.
 */
export function advance(state: GameState, ms: number, content: Content): GameState {
  if (!state.action || !(ms > 0)) {
    return state;
  }
  const action = content.actions[state.action.id];
  if (!action || action.durationMs <= 0) {
    // A save can outlive the thing it was doing; stop rather than guess.
    return { ...state, action: null };
  }
  const perCompletion = masteryXpPer(action);
  /** Time in hand: what was already put into the bar, plus what has just passed. */
  let time = state.action.progressMs + ms;
  let next = state;
  for (;;) {
    const mastery = masteryLevel(next, action.id);
    const duration = durationAt(action, mastery);
    const byTime = Math.floor(time / duration);
    const canPay = affordable(next, action);
    const toNextMastery =
      mastery >= MAX_LEVEL
        ? Infinity
        : Math.ceil((xpForLevel(mastery + 1) - masteryXp(next, action.id)) / perCompletion);
    const count = Math.min(byTime, canPay, toNextMastery);
    if (count > 0) {
      next = complete(next, action, count);
      time -= count * duration;
    }
    // Out of materials: the action ends on the completion that used the last
    // of them, and whatever time is left over is simply not spent. Ending
    // there, and not when the next bar fills, is what keeps this independent
    // of how the time was cut up.
    if (count === canPay) {
      return { ...next, action: null };
    }
    if (count < toNextMastery) {
      // Time ran out partway through a bar.
      return { ...next, action: { id: action.id, progressMs: time } };
    }
  }
}

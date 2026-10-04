import type { ActionDef, Content } from './content';
import { bankCount, skillLevel, type GameState } from './state';

export type StartResult = { ok: true; state: GameState } | { ok: false; reason: string };

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

/**
 * Move the game forward by `ms`. The only way time passes: live play calls it
 * every frame with a few milliseconds and offline catch-up calls it once with
 * hours, and both must land in the same place. So it is worked out in whole
 * completions by arithmetic, never by looping over ticks, and
 * advance(a) then advance(b) always equals advance(a + b).
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
  const total = state.action.progressMs + ms;
  const byTime = Math.floor(total / action.durationMs);
  const canPay = affordable(state, action);
  const completions = Math.min(byTime, canPay);
  // Out of materials: the action ends on the completion that used the last of
  // them, and whatever time is left over is simply not spent. Ending there,
  // and not when the next bar fills, is what keeps this independent of how
  // the time was cut up.
  const ranOut = canPay <= byTime;
  if (completions === 0) {
    return {
      ...state,
      action: ranOut ? null : { id: action.id, progressMs: total },
    };
  }
  const bank = { ...state.bank };
  for (const { item, qty } of action.uses ?? []) {
    const left = (bank[item] ?? 0) - qty * completions;
    if (left > 0) bank[item] = left;
    else delete bank[item];
  }
  for (const { item, qty } of action.gives) {
    bank[item] = (bank[item] ?? 0) + qty * completions;
  }
  return {
    ...state,
    bank,
    skills: {
      ...state.skills,
      [action.skill]: (state.skills[action.skill] ?? 0) + action.xp * completions,
    },
    action: ranOut ? null : { id: action.id, progressMs: total - completions * action.durationMs },
  };
}

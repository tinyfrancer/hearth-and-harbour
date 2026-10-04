import type { Content } from './content';
import { skillLevel, type GameState } from './state';

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
  return { ok: true, state: { ...state, action: { id: actionId, progressMs: 0 } } };
}

export function stopAction(state: GameState): GameState {
  return state.action ? { ...state, action: null } : state;
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
  const completions = Math.floor(total / action.durationMs);
  const progressMs = total - completions * action.durationMs;
  if (completions === 0) {
    return { ...state, action: { id: action.id, progressMs } };
  }
  const bank = { ...state.bank };
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
    action: { id: action.id, progressMs },
  };
}

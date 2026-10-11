import type { GameState } from './state';

/*
 * One-off things the game remembers about a character, so that something
 * shown once is not shown again after a reload or on another phone: the town's
 * first-visit pan, a dungeon's lessons. Each is a short key chosen by whoever
 * asks (`'town.pan'`, `'cave.lesson.attack'`); the rules give them no meaning.
 *
 * Kept in the save (`GameState.seen`), so they travel with an exported save.
 * Only ever added to: nothing here forgets.
 */

/** The longest key kept. */
export const SEEN_KEY_MAX = 48;
/**
 * The most keys a save keeps. A dungeon's lessons are a handful each; this is
 * room for dozens of dungeons, and a bound on what a careless caller can grow.
 */
export const SEEN_MAX = 256;

/** Letters and digits in parts joined by `.`, `_` or `-`: `town.pan`, `cave.lesson.wide_swing`. */
const SEEN_KEY = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/;

/** Whether `key` has the shape of a key that can be remembered. */
export function isSeenKey(key: unknown): key is string {
  return typeof key === 'string' && key.length <= SEEN_KEY_MAX && SEEN_KEY.test(key);
}

/** Whether `key` has been remembered. A key of the wrong shape never has. */
export function remembered(state: GameState, key: string): boolean {
  return isSeenKey(key) && state.seen.includes(key);
}

/**
 * Remember `key` for good. The same state comes back when there is nothing to
 * add: the key is already kept, is not of the right shape, or the save is full.
 */
export function remember(state: GameState, key: string): GameState {
  if (!isSeenKey(key) || state.seen.includes(key) || state.seen.length >= SEEN_MAX) return state;
  return { ...state, seen: [...state.seen, key] };
}

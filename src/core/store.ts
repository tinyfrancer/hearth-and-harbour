import { held } from './bounty';
import type { Content, StoreEntry } from './content';
import { bankCount, stat, type GameState } from './state';

/**
 * The general store: it buys anything at its sale value (`sell` in
 * src/core/bank.ts) and sells a small stock for coins (`content.store`).
 * A lot of an item goes into the bank; a perk is kept in `perks` for good and
 * sold once.
 */

/** "150,000": store prices run to six figures, and a reason is read at a glance. */
const grouped = (amount: number): string => Math.floor(amount).toLocaleString('en-GB');

export type StoreResult = { ok: true; state: GameState } | { ok: false; reason: string };

/** Why the store will not sell this entry now, or null if it will. */
export function storeProblem(state: GameState, entry: StoreEntry): string | null {
  if (entry.perk && state.perks.includes(entry.id)) return 'Yours already.';
  if (entry.item && entry.once && held(state, entry.item) > 0) return 'You have one already.';
  if (state.coins < entry.price) {
    return `Needs ${grouped(entry.price)} coins; you have ${grouped(state.coins)}.`;
  }
  return null;
}

/** Buy one lot from the store: coins out, the lot into the bank or the perk kept. */
export function buyFromStore(state: GameState, entryId: string, content: Content): StoreResult {
  const entry = content.store && Object.hasOwn(content.store, entryId) && content.store[entryId];
  if (!entry) return { ok: false, reason: 'The store has no such thing.' };
  const problem = storeProblem(state, entry);
  if (problem) return { ok: false, reason: problem };
  const paid: GameState = {
    ...state,
    coins: state.coins - entry.price,
    stats: { ...state.stats, bought: stat(state, 'bought') + 1 },
  };
  if (entry.perk) return { ok: true, state: { ...paid, perks: [...state.perks, entry.id] } };
  return {
    ok: true,
    state: {
      ...paid,
      bank: { ...state.bank, [entry.item]: bankCount(state, entry.item) + entry.qty },
    },
  };
}

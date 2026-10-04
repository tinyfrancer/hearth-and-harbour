import type { Content } from './content';
import { bankCount, type GameState } from './state';

/**
 * Sell up to `qty` of an item for coins. Asking for more than is held sells
 * what is held; asking for nothing, or for something worthless to the tables,
 * changes nothing.
 */
export function sell(state: GameState, itemId: string, qty: number, content: Content): GameState {
  const item = content.items[itemId];
  const held = bankCount(state, itemId);
  const count = Math.min(Math.floor(qty), held);
  if (!item || !(count > 0)) {
    return state;
  }
  const bank = { ...state.bank };
  if (held > count) bank[itemId] = held - count;
  else delete bank[itemId];
  return { ...state, bank, coins: state.coins + item.value * count };
}

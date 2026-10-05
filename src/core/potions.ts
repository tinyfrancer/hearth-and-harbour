import type { ActionDef, Content, ItemDef, PotionDef } from './content';
import { bankCount, type GameState } from './state';

export type DrinkResult = { ok: true; state: GameState } | { ok: false; reason: string };

/** The potion working on the character and its table row, or null. */
export function activePotion(
  state: GameState,
  content: Content,
): { item: ItemDef; potion: PotionDef; charges: number } | null {
  const active = state.potion;
  const item = active && content.items[active.item];
  // A save can outlive a potion the tables no longer hold: it then does nothing.
  if (!active || !item?.potion || !(active.charges > 0)) return null;
  return { item, potion: item.potion, charges: active.charges };
}

/** The potion helping this action right now, or null if none is or it helps other skills. */
export function potionFor(state: GameState, action: ActionDef, content: Content): PotionDef | null {
  const active = activePotion(state, content);
  return active && active.potion.skills.includes(action.skill) ? active.potion : null;
}

/**
 * Drink one of a potion from the bank. It replaces whatever potion was working,
 * charges and all: the screen asks before throwing charges away, not this.
 */
export function drinkPotion(state: GameState, itemId: string, content: Content): DrinkResult {
  const potion = content.items[itemId]?.potion;
  if (!potion) {
    return { ok: false, reason: 'That is not something to drink.' };
  }
  const held = bankCount(state, itemId);
  if (held < 1) {
    return { ok: false, reason: 'You have none of those.' };
  }
  const bank = { ...state.bank };
  if (held > 1) bank[itemId] = held - 1;
  else delete bank[itemId];
  return { ok: true, state: { ...state, bank, potion: { item: itemId, charges: potion.charges } } };
}

/**
 * How many of `count` completions, begun with `charges` left, earn an extra
 * with a potion that gives one every `every`th charge: the completions that
 * use a charge whose number is a multiple of `every`. Counted from the charges
 * and not from the start, so it needs nothing saved beyond them.
 */
export function extrasIn(charges: number, count: number, every: number): number {
  return Math.floor(charges / every) - Math.floor((charges - count) / every);
}

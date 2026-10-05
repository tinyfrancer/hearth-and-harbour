import { SLOTS, type CombatStyle, type Content, type ItemDef, type Slot } from './content';
import { bankCount, type GameState, type Worn } from './state';

export type EquipResult = { ok: true; state: GameState } | { ok: false; reason: string };

/** The three numbers combat reads, and the style they are for. */
export interface Totals {
  style: CombatStyle;
  attack: number;
  strength: number;
  armour: number;
}

/** A bank with `qty` more of an item. */
function deposit(bank: Record<string, number>, item: string, qty: number): Record<string, number> {
  return { ...bank, [item]: (bank[item] ?? 0) + qty };
}

/** A bank with `qty` fewer of an item, keeping nothing at zero. */
function withdraw(bank: Record<string, number>, item: string, qty: number): Record<string, number> {
  const next = { ...bank };
  const left = (next[item] ?? 0) - qty;
  if (left > 0) next[item] = left;
  else delete next[item];
  return next;
}

/** Whatever is in `slot`, back to the bank, and the slot emptied. */
function takeOff(
  bank: Record<string, number>,
  equipment: Partial<Record<Slot, Worn>>,
  slot: Slot,
): { bank: Record<string, number>; equipment: Partial<Record<Slot, Worn>> } {
  const worn = equipment[slot];
  if (!worn) return { bank, equipment };
  const rest = { ...equipment };
  delete rest[slot];
  return { bank: deposit(bank, worn.item, worn.qty), equipment: rest };
}

/** Whether the main hand holds something that takes both hands. */
function bothHandsFull(state: GameState, content: Content): boolean {
  const held = state.equipment.main_hand;
  return Boolean(held && content.items[held.item]?.equip?.twoHanded);
}

/**
 * Wear or wield an item from the bank. One moves to its slot and whatever was
 * there goes back to the bank; ammunition moves as the whole stack, joining
 * the stack worn if it is the same kind. A two-handed weapon sends the off
 * hand back to the bank, and an off-hand item sends back a two-handed weapon.
 */
export function equip(state: GameState, itemId: string, content: Content): EquipResult {
  const def = content.items[itemId]?.equip;
  if (!def) {
    return { ok: false, reason: 'That is not something to wear.' };
  }
  const held = bankCount(state, itemId);
  if (held < 1) {
    return { ok: false, reason: 'You have none of those.' };
  }
  const { slot } = def;
  let bank = state.bank;
  let equipment = state.equipment;
  const qty = slot === 'ammo' ? held : 1;
  const already = slot === 'ammo' && equipment.ammo?.item === itemId ? equipment.ammo.qty : 0;

  ({ bank, equipment } = takeOff(bank, equipment, slot));
  if (def.twoHanded) {
    ({ bank, equipment } = takeOff(bank, equipment, 'off_hand'));
  }
  if (slot === 'off_hand' && bothHandsFull(state, content)) {
    ({ bank, equipment } = takeOff(bank, equipment, 'main_hand'));
  }
  // Taken from the bank after the slot is emptied, so a stack of arrows
  // swapped for more of the same comes back and goes on together.
  bank = withdraw(bank, itemId, qty + already);
  equipment = { ...equipment, [slot]: { item: itemId, qty: qty + already } };
  return { ok: true, state: { ...state, bank, equipment } };
}

/** Take off whatever is in a slot and put it in the bank. An empty slot changes nothing. */
export function unequip(state: GameState, slot: Slot): GameState {
  if (!state.equipment[slot]) return state;
  return { ...state, ...takeOff(state.bank, state.equipment, slot) };
}

/** The ids of everything worn, in slot order: what the art draws on the character. */
export function wornItemIds(state: GameState): string[] {
  return SLOTS.flatMap((slot) => {
    const worn = state.equipment[slot];
    return worn ? [worn.item] : [];
  });
}

/** What the bank holds that goes in `slot`, in table order. */
export function wearablesFor(state: GameState, slot: Slot, content: Content): ItemDef[] {
  return Object.values(content.items).filter(
    (item) => item.equip?.slot === slot && bankCount(state, item.id) > 0,
  );
}

/** How the character fights: the main-hand weapon's style, or melee with none. */
export function combatStyle(state: GameState, content: Content): CombatStyle {
  const held = state.equipment.main_hand;
  return (held && content.items[held.item]?.equip?.style) || 'melee';
}

/**
 * The three totals of everything worn. Attack and strength from an item with
 * a style count only when the character fights in that style, so arrows add
 * nothing to a sword. An item the tables no longer hold adds nothing.
 */
export function equipmentTotals(state: GameState, content: Content): Totals {
  const style = combatStyle(state, content);
  const totals: Totals = { style, attack: 0, strength: 0, armour: 0 };
  for (const slot of SLOTS) {
    const worn = state.equipment[slot];
    const def = worn && content.items[worn.item]?.equip;
    if (!def) continue;
    totals.armour += def.armour ?? 0;
    if (def.style && def.style !== style) continue;
    totals.attack += def.attack ?? 0;
    totals.strength += def.strength ?? 0;
  }
  return totals;
}

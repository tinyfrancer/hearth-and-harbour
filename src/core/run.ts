import type { GameState } from './state';

/**
 * What a dungeon run came to. A run is played by hand in a scene, with its
 * own dice and its own clock, and none of it is saved while it lasts; this is
 * the whole of what it leaves behind.
 */
export interface RunSpoils {
  /** XP earned, by skill id. */
  xp?: Readonly<Record<string, number>>;
  /** Items picked up, by item id. */
  loot?: Readonly<Record<string, number>>;
  coins?: number;
  /** How many were eaten from the food slot. */
  foodEaten?: number;
  /** How many were shot from the ammunition slot. */
  arrowsUsed?: number;
}

const whole = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

/**
 * Bring a run's spoils home, as one change: what was eaten and shot is taken
 * from the food and ammunition slots, and the XP, loot and coins are paid in.
 * A failed run settles the same way, with whatever was picked up before it
 * ended. Amounts that are not whole and positive count as nothing, and no
 * more can be eaten or shot than was carried.
 *
 * It touches neither the idle task nor the dice (`rng`): a run rolls its own.
 */
export function settleRun(state: GameState, spoils: RunSpoils): GameState {
  const skills = { ...state.skills };
  for (const [skill, amount] of Object.entries(spoils.xp ?? {})) {
    const gained = whole(amount);
    if (gained > 0) skills[skill] = (skills[skill] ?? 0) + gained;
  }
  const bank = { ...state.bank };
  for (const [item, amount] of Object.entries(spoils.loot ?? {})) {
    const gained = whole(amount);
    if (gained > 0) bank[item] = (bank[item] ?? 0) + gained;
  }

  let food = state.food;
  const eaten = Math.min(whole(spoils.foodEaten), food?.qty ?? 0);
  if (food && eaten > 0) {
    // Nothing is kept at zero: the last one eaten empties the slot.
    food = food.qty > eaten ? { item: food.item, qty: food.qty - eaten } : null;
  }

  let equipment = state.equipment;
  const quiver = equipment.ammo;
  const shot = Math.min(whole(spoils.arrowsUsed), quiver?.qty ?? 0);
  if (quiver && shot > 0) {
    equipment = { ...equipment };
    if (quiver.qty > shot) equipment.ammo = { item: quiver.item, qty: quiver.qty - shot };
    else delete equipment.ammo;
  }

  return { ...state, skills, bank, coins: state.coins + whole(spoils.coins), food, equipment };
}

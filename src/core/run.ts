import { comeRound, hurt, maxHp } from './combat';
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
  /**
   * The hero's hit points when the run ended, if the run kept them (it should
   * start from `playerCombat(state, content).hp`). 0 is a knock-out, and the
   * character comes round as from any other. Left out, health is unchanged.
   */
  hp?: number;
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
 * (A run happens with the idle clock paused, so no idle fight is under way to
 * own the hit points; if one somehow is, its hit points stand.)
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

  const settled = { ...state, skills, bank, coins: state.coins + whole(spoils.coins), food, equipment };
  // Read after the XP is in: a Vitality level from the run raises the most there can be.
  if (typeof spoils.hp === 'number' && Number.isFinite(spoils.hp) && !state.fight) {
    const most = maxHp(settled);
    const hp = Math.min(Math.floor(spoils.hp), most);
    settled.health = hp > 0 ? hurt(hp, most) : comeRound(most);
  }
  return settled;
}

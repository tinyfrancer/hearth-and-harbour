import { comeRound, hurt, maxHp } from './combat';
import type { Content } from './content';
import type { GameState, MonsterRecord } from './state';

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
  /**
   * Kills in the run, by monster id. They count towards the bestiary and a
   * bounty held, as idle kills do. An id the monster tables do not hold (a
   * dungeon's own cast, until it is in them) counts for nothing.
   */
  kills?: Readonly<Record<string, number>>;
  /**
   * The dungeon's id, if the run cleared it (reached the end with the boss
   * down). Kept in the save as a clear (S16 unlocks by them). An id the
   * dungeon tables do not hold counts for nothing.
   */
  cleared?: string;
  /** How long the run took, in milliseconds: the dungeon's best time, if it was cleared. */
  timeMs?: number;
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
/**
 * Kills and a clear count only against the tables in `content`: without them
 * (as a scene's own test may call it) they count for nothing, and everything
 * else settles the same.
 */
export function settleRun(state: GameState, spoils: RunSpoils, content?: Content): GameState {
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

  const settled: GameState = {
    ...state,
    skills,
    bank,
    coins: state.coins + whole(spoils.coins),
    food,
    equipment,
  };
  let bestiary = state.bestiary;
  let bounty = state.bounty;
  for (const [monster, amount] of Object.entries(spoils.kills ?? {})) {
    const killed = whole(amount);
    // Own rows only: an id like `constructor` is no monster.
    if (killed === 0 || !content?.monsters || !Object.hasOwn(content.monsters, monster)) continue;
    const known: MonsterRecord = bestiary[monster] ?? { kills: 0, seen: [] };
    bestiary = { ...bestiary, [monster]: { ...known, kills: known.kills + killed } };
    // As in an idle fight: kills count while the bounty is held, up to what it asks.
    if (bounty?.monster === monster && bounty.done < bounty.count) {
      bounty = { ...bounty, done: Math.min(bounty.count, bounty.done + killed) };
    }
  }
  if (bestiary !== state.bestiary) settled.bestiary = bestiary;
  if (bounty !== state.bounty) settled.bounty = bounty;

  const cleared = spoils.cleared;
  if (
    typeof cleared === 'string' &&
    content?.dungeons &&
    Object.hasOwn(content.dungeons, cleared)
  ) {
    const record = state.dungeons[cleared] ?? { clears: 0 };
    const time = whole(spoils.timeMs);
    const best = time > 0 ? Math.min(record.bestMs ?? time, time) : record.bestMs;
    settled.dungeons = {
      ...state.dungeons,
      [cleared]: { clears: record.clears + 1, ...(best !== undefined ? { bestMs: best } : {}) },
    };
  }

  // Read after the XP is in: a Vitality level from the run raises the most there can be.
  if (typeof spoils.hp === 'number' && Number.isFinite(spoils.hp) && !state.fight) {
    const most = maxHp(settled);
    const hp = Math.min(Math.floor(spoils.hp), most);
    settled.health = hp > 0 ? hurt(hp, most) : comeRound(most);
  }
  return settled;
}

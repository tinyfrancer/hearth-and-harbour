import { autoHandIn } from './bounty';
import { comeRound, hurt, maxHp } from './combat';
import type {
  ChallengeDef,
  ChallengeReward,
  Content,
  DungeonDef,
  DungeonFoe,
  MonsterDef,
  RunStats,
} from './content';
import { dungeonDef } from './dungeons';
import { challengeMet, effectsOf, modifierPool, readStats, scaled } from './progress';
import type { DungeonRecord, GameState, MonsterRecord } from './state';

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
   * bounty held, as idle kills do. An id neither the monster tables nor a
   * dungeon's `cast` holds counts for nothing.
   */
  kills?: Readonly<Record<string, number>>;
  /**
   * What each foe was seen to drop in the run, by monster id: the item ids,
   * in any order. Kept in the bestiary as an idle fight keeps what it sees,
   * so the bestiary names a drop only once that foe has dropped it. Counted
   * only for a known foe and an item its own row says it can drop; anything
   * else counts for nothing.
   */
  dropped?: Readonly<Record<string, readonly string[]>>;
  /**
   * The dungeon's id, if the run cleared it (reached the end with the boss
   * down). Kept in the save as a clear (the next landing on the chart may
   * unlock by it), and the first one pays the dungeon's `firstClear`. An id
   * the dungeon tables do not hold, or a landing to come, counts for nothing.
   */
  cleared?: string;
  /** How long the run took, in milliseconds: the dungeon's best time, if it was cleared. */
  timeMs?: number;
  /**
   * The dungeon the run was in, cleared or not: what its modifier, its
   * regular drops and its statistics are read against. Left out, a run that
   * did not clear has no modifier paid.
   */
  dungeon?: string;
  /**
   * The day's modifier the run was played under, fixed as it rowed out
   * (`Shell.todaysModifier`), or null for none. The scene applies its fight
   * effects; its rewards (`loot`, `coins`, `xp`) are paid here, by
   * `settleRun`, and never by the scene. Counted only if the dungeon draws it.
   */
  modifier?: string | null;
  /**
   * How the run went, for its challenges and the dungeon's records. To be
   * filled by every new run; anything missing is not known, never nothing.
   */
  stats?: RunStats;
}

/**
 * A foe's row, from the monster tables or a dungeon's cast; undefined for
 * anything else. Own rows only: an id like `constructor` is no monster.
 */
export function foeRow(content: Content, id: string): MonsterDef | DungeonFoe | undefined {
  if (content.monsters && Object.hasOwn(content.monsters, id)) return content.monsters[id];
  for (const dungeon of Object.values(content.dungeons ?? {})) {
    const foe = dungeon.cast?.find((row) => row.id === id);
    if (foe) return foe;
  }
  return undefined;
}

/** Whether kills of `id` are kept: a monster of the tables, or one of a dungeon's cast. */
export function knownFoe(content: Content, id: string): boolean {
  return foeRow(content, id) !== undefined;
}

/** Every item a foe's own row says it can drop: always, rare, and one-thing-or-another. */
export function foeDrops(foe: MonsterDef | DungeonFoe): string[] {
  return [
    ...foe.always.map((drop) => drop.item),
    ...foe.rare.map((drop) => drop.item),
    ...(('pick' in foe && foe.pick?.items) || []),
  ];
}

/**
 * What a dungeon's first clear pays (`DungeonDef.firstClear`): only items the
 * tables hold, in whole positive amounts. Nothing for a landing to come.
 */
export function firstClearOf(
  dungeon: DungeonDef,
  content: Content,
): { item: string; qty: number }[] {
  if (dungeon.comingSoon) return [];
  return (dungeon.firstClear ?? []).flatMap(({ item, qty }) =>
    Object.hasOwn(content.items, item) && whole(qty) > 0 ? [{ item, qty: whole(qty) }] : [],
  );
}

const whole = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

/**
 * The modifier a run's spoils name, if it counts: one the dungeon they say
 * the run was in draws its days from. Null otherwise.
 */
export function runModifier(spoils: RunSpoils, content?: Content): string | null {
  const modifier = typeof spoils.modifier === 'string' ? spoils.modifier : null;
  const where = typeof spoils.dungeon === 'string' ? spoils.dungeon : spoils.cleared;
  const dungeon = content && typeof where === 'string' ? dungeonDef(content, where) : undefined;
  if (!modifier || !dungeon || !content) return null;
  return modifierPool(dungeon, content).includes(modifier) ? modifier : null;
}

/**
 * Items some foe of a dungeon drops on every kill (doubloons, shells): what a
 * modifier's `loot` counts over again.
 */
export function regularDrops(dungeon: DungeonDef): Set<string> {
  return new Set((dungeon.cast ?? []).flatMap((foe) => foe.always.map((drop) => drop.item)));
}

/**
 * What settling a run will pay in, after its modifier's rewards (`loot`,
 * `coins`, `xp`): whole and positive amounts only, as `settleRun` takes
 * them. For the scene's results card, so it says what the bank will get.
 */
export function spoilsUnder(
  spoils: RunSpoils,
  content?: Content,
): {
  xp: Record<string, number>;
  loot: Record<string, number>;
  coins: number;
  modifier: string | null;
} {
  const modifier = runModifier(spoils, content);
  const effects = content ? effectsOf(content, modifier) : {};
  const where = typeof spoils.dungeon === 'string' ? spoils.dungeon : spoils.cleared;
  const dungeon = content && modifier && where ? dungeonDef(content, where) : undefined;
  const regular = dungeon ? regularDrops(dungeon) : new Set<string>();
  const xp: Record<string, number> = {};
  for (const [skill, amount] of Object.entries(spoils.xp ?? {})) {
    const gained = scaled(whole(amount), effects.xp);
    if (gained > 0) xp[skill] = gained;
  }
  const loot: Record<string, number> = {};
  for (const [item, amount] of Object.entries(spoils.loot ?? {})) {
    const gained = regular.has(item) ? scaled(whole(amount), effects.loot) : whole(amount);
    if (gained > 0) loot[item] = gained;
  }
  return { xp, loot, coins: scaled(whole(spoils.coins), effects.coins), modifier };
}

/** A challenge's reward as it will be paid: whole positive amounts, and only items the tables hold. */
export function rewardOf(
  reward: ChallengeReward,
  content: Content,
): { coins: number; bountyPoints: number; items: { item: string; qty: number }[] } {
  return {
    coins: whole(reward.coins),
    bountyPoints: whole(reward.bountyPoints),
    items: (reward.items ?? []).flatMap(({ item, qty }) =>
      Object.hasOwn(content.items, item) && whole(qty) > 0 ? [{ item, qty: whole(qty) }] : [],
    ),
  };
}

/** What a clear pays on top of what the run picked up: its first-clear reward and new challenges. */
export interface ClearRewards {
  /** The dungeon's first-clear reward, if this is its first clear; empty otherwise. */
  firstClear: { item: string; qty: number }[];
  /** Each challenge this run meets for the first time, in the dungeon's order, as it will be paid. */
  challenges: { challenge: ChallengeDef; reward: ReturnType<typeof rewardOf> }[];
}

/**
 * What settling `spoils` will pay beyond the run's own (`spoilsUnder`): the
 * first-clear reward and each challenge met for the first time. Nothing for a
 * run that did not clear. For the scene's results card, read before settling
 * (afterwards the clear and the challenges are already counted); `settleRun`
 * pays exactly this.
 */
export function clearRewards(
  state: GameState,
  spoils: RunSpoils,
  content: Content | undefined,
): ClearRewards {
  const none: ClearRewards = { firstClear: [], challenges: [] };
  const cleared = typeof spoils.cleared === 'string' ? spoils.cleared : undefined;
  const dungeon = content && cleared !== undefined ? dungeonDef(content, cleared) : undefined;
  if (!content || !dungeon || dungeon.comingSoon) return none;
  const record = state.dungeons[dungeon.id];
  const stats = readStats(spoils.stats);
  const modifier = runModifier(spoils, content);
  return {
    firstClear: (record?.clears ?? 0) === 0 ? firstClearOf(dungeon, content) : [],
    challenges: (dungeon.challenges ?? []).flatMap((challenge) =>
      (record?.challenges ?? []).includes(challenge.id) ||
      !challengeMet(challenge.rule, stats, { cleared: true, modifier })
        ? []
        : [{ challenge, reward: rewardOf(challenge.reward, content) }],
    ),
  };
}

/**
 * Bring a run's spoils home, as one change: what was eaten and shot is taken
 * from the food and ammunition slots, and the XP, loot and coins are paid in.
 * A failed run settles the same way, with whatever was picked up before it
 * ended. Amounts that are not whole and positive count as nothing, and no
 * more can be eaten or shot than was carried.
 *
 * It touches neither the idle task nor the dice (`rng`): a run rolls its own.
 * (A run happens with the idle clock paused; a fight or a dungeon run idle
 * paused under it keeps its own hit points, which stand.)
 */
/**
 * Kills and a clear count only against the tables in `content`: without them
 * (as a scene's own test may call it) they count for nothing, and everything
 * else settles the same.
 *
 * A clear also keeps the run's best statistics (the quickest, the least
 * damage taken, the least eaten), the modifier it was cleared under, and
 * pays each of the dungeon's challenges it meets for the first time
 * (`challengeMet`, src/core/progress.ts). The modifier's rewards (`loot`,
 * `coins`, `xp`) are paid on any run, cleared or not (`spoilsUnder`).
 */
export function settleRun(state: GameState, spoils: RunSpoils, content?: Content): GameState {
  const paid = spoilsUnder(spoils, content);
  const skills = { ...state.skills };
  for (const [skill, gained] of Object.entries(paid.xp)) {
    skills[skill] = (skills[skill] ?? 0) + gained;
  }
  const bank = { ...state.bank };
  for (const [item, gained] of Object.entries(paid.loot)) {
    bank[item] = (bank[item] ?? 0) + gained;
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
    coins: state.coins + paid.coins,
    food,
    equipment,
  };
  let bestiary = state.bestiary;
  let bounty = state.bounty;
  for (const [monster, amount] of Object.entries(spoils.kills ?? {})) {
    const killed = whole(amount);
    if (killed === 0 || !content || !knownFoe(content, monster)) continue;
    const known: MonsterRecord = bestiary[monster] ?? { kills: 0, seen: [] };
    bestiary = { ...bestiary, [monster]: { ...known, kills: known.kills + killed } };
    // As in an idle fight: kills count while the bounty is held, up to what it asks.
    if (bounty?.monster === monster && bounty.done < bounty.count) {
      bounty = { ...bounty, done: Math.min(bounty.count, bounty.done + killed) };
    }
  }
  for (const [monster, items] of Object.entries(spoils.dropped ?? {})) {
    const row = content && foeRow(content, monster);
    if (!row || !Array.isArray(items)) continue;
    const can = foeDrops(row);
    const known: MonsterRecord = bestiary[monster] ?? { kills: 0, seen: [] };
    const fresh = items.filter(
      (item, at) =>
        typeof item === 'string' &&
        can.includes(item) &&
        !known.seen.includes(item) &&
        items.indexOf(item) === at,
    );
    if (fresh.length > 0) {
      bestiary = { ...bestiary, [monster]: { ...known, seen: [...known.seen, ...fresh] } };
    }
  }
  if (bestiary !== state.bestiary) settled.bestiary = bestiary;
  if (bounty !== state.bounty) settled.bounty = bounty;

  const cleared = typeof spoils.cleared === 'string' ? spoils.cleared : undefined;
  const dungeon = content && cleared !== undefined ? dungeonDef(content, cleared) : undefined;
  // A landing with nothing there yet cannot have been cleared.
  if (cleared !== undefined && dungeon && !dungeon.comingSoon) {
    const rewards = clearRewards(state, spoils, content);
    const record: DungeonRecord = state.dungeons[cleared] ?? { clears: 0 };
    const stats = readStats(spoils.stats);
    const time = whole(spoils.timeMs) || (stats.timeMs ?? 0);
    const best = time > 0 ? Math.min(record.bestMs ?? time, time) : record.bestMs;
    const least = (was: number | undefined, now: number | undefined): number | undefined =>
      now === undefined ? was : Math.min(was ?? now, now);
    const next: DungeonRecord = { ...record, clears: record.clears + 1 };
    if (best !== undefined) next.bestMs = best;
    const leastDamage = least(record.leastDamage, stats.damageTaken);
    if (leastDamage !== undefined) next.leastDamage = leastDamage;
    const leastFood = least(record.leastFood, stats.foodEaten);
    if (leastFood !== undefined) next.leastFood = leastFood;
    if (paid.modifier && !(record.modifiers ?? []).includes(paid.modifier)) {
      next.modifiers = [...(record.modifiers ?? []), paid.modifier];
    }
    // Each challenge pays once: the first clear that meets it.
    for (const { challenge, reward } of rewards.challenges) {
      next.challenges = [...(next.challenges ?? []), challenge.id];
      settled.coins += reward.coins;
      settled.bountyPoints += reward.bountyPoints;
      for (const { item, qty } of reward.items) bank[item] = (bank[item] ?? 0) + qty;
    }
    settled.dungeons = { ...state.dungeons, [cleared]: next };
    // The first clear's reward, once: on top of what the run picked up.
    for (const { item, qty } of rewards.firstClear) bank[item] = (bank[item] ?? 0) + qty;
  }

  // Read after the XP is in: a Vitality level from the run raises the most there can be.
  if (
    typeof spoils.hp === 'number' &&
    Number.isFinite(spoils.hp) &&
    !state.fight &&
    !state.idleRun
  ) {
    const most = maxHp(settled);
    const hp = Math.min(Math.floor(spoils.hp), most);
    settled.health = hp > 0 ? hurt(hp, most) : comeRound(most);
  }
  // A settled run is over: nothing of it is kept to take up again. A bounty it
  // finished is handed in by itself if auto bounty is on, as a fight's would be.
  settled.run = null;
  return content ? autoHandIn(settled, content) : settled;
}

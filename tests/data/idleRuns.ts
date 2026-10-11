import { advance } from '../../src/core/actions';
import { attackSkill } from '../../src/core/combat';
import type { Content, DungeonDef } from '../../src/core/content';
import { startIdleRun } from '../../src/core/idleRun';
import { seedFrom } from '../../src/core/rng';
import type { GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { value, worth } from './economy';
import { characterAt, foodAt, HOUR } from './fighting';

// Dungeons run idle (S16), measured on the real rules and tables, as the
// pacing cases need them: an hour of runs, and what a run by hand is worth by
// the dungeon's own loot tables.

/** Noon on a day of October 2026: when the simulated runs start. */
export const START = Date.UTC(2026, 9, 11, 12);

/**
 * The tables with a dungeon's days fixed: every day `modifier`, or none.
 * Pinning the day lets a case weigh one modifier at a time.
 */
export function withDay(dungeon: string, modifier: string | null): Content {
  const row = CONTENT.dungeons![dungeon]!;
  return {
    ...CONTENT,
    dungeons: {
      ...CONTENT.dungeons,
      [dungeon]: { ...row, modifiers: modifier ? [modifier] : [] },
    },
  };
}

export interface IdleHour {
  runs: number;
  knockedOut: boolean;
  /** XP of the attacking skill, as the other combat cases count it. */
  xp: number;
  /** XP of every combat skill together. */
  allXp: number;
  coins: number;
  /** What the loot sells for. */
  loot: number;
  /** The fish eaten, as sold instead. */
  food: number;
  /** Coins and loot less the food. */
  earned: number;
}

/**
 * An hour (or `hours`) of a dungeon run idle by a character of a level in
 * that level's gear with plenty of that level's fish, its days fixed to
 * `modifier`. The dungeon is taken as cleared by hand.
 */
export function idleHourOf(
  level: number,
  dungeon: string,
  {
    modifier = null as string | null,
    seed = 1,
    hours = 1,
    state = null as GameState | null,
  } = {},
): IdleHour {
  const content = withDay(dungeon, modifier);
  const plenty = 100_000;
  const fresh = state ?? characterAt(level, { seed, food: plenty });
  const start: GameState = {
    ...fresh,
    rng: seedFrom(seed),
    dungeons: { ...fresh.dungeons, [dungeon]: { clears: 1 } },
  };
  const begun = startIdleRun(start, dungeon, content, START, 0);
  if (!begun.ok) throw new Error(begun.reason);
  let at = begun.state;
  for (let minute = 0; minute < 60 * hours; minute += 1) at = advance(at, 60_000, content);
  const skill = attackSkill('melee');
  const gained = (id: string): number => (at.skills[id] ?? 0) - (start.skills[id] ?? 0);
  const eaten = (start.food?.qty ?? 0) - (at.food?.qty ?? 0);
  const banked: Record<string, number> = {};
  for (const [item, qty] of Object.entries(at.bank)) {
    const more = qty - (start.bank[item] ?? 0);
    if (more > 0) banked[item] = more;
  }
  const loot = worth(banked) / hours;
  const coins = (at.coins - start.coins) / hours;
  const food = (eaten * (start.food ? value(start.food.item) : 0)) / hours;
  return {
    runs: (at.dungeons[dungeon]?.idleRuns ?? 0) / hours,
    knockedOut: !at.idleRun,
    xp: gained(skill) / hours,
    allXp: (gained(skill) + gained('defence') + gained('vitality')) / hours,
    coins,
    loot,
    food,
    earned: coins + loot - food,
  };
}

/**
 * What one run by hand brings, on average, by the dungeon's own tables: every
 * foe its rooms hold (the scene's own cast, `idle.rooms`) felled once, each
 * drop at its odds, every point of their health dealt once at 5 XP.
 */
export function handRunOf(dungeon: DungeonDef): { worth: number; xp: number } {
  let total = 0;
  let damage = 0;
  const mean = (drop: { min: number; max: number }): number => (drop.min + drop.max) / 2;
  for (const room of dungeon.idle!.rooms) {
    for (const id of room.foes) {
      const foe = dungeon.cast!.find((row) => row.id === id)!;
      total += (foe.coins[0] + foe.coins[1]) / 2;
      for (const drop of foe.always) total += mean(drop) * value(drop.item);
      for (const drop of foe.rare) total += (mean(drop) / drop.oneIn) * value(drop.item);
      if (foe.pick) {
        const each = foe.pick.items.reduce((sum, item) => sum + value(item), 0);
        total += each / foe.pick.items.length / foe.pick.oneIn;
      }
      damage += foe.hp;
    }
  }
  return { worth: total, xp: damage * 5 };
}

export { HOUR, foodAt };

/*
 * The day's modifier in a hand-played run, and what a run did (S16), as pure
 * rules on lane A's contract (`src/core/progress.ts`, #73). A modifier is
 * plain multipliers and flags (`ModifierEffects`), applied generically,
 * never by its name:
 *
 * - foe health, damage and swing: the monsters' rows a run starts with,
 *   by lane A's `foeUnder` (heavy blows are made of a foe's max hit; a cannon's are not);
 * - hero damage: his max hit as he rows out, by `heroMaxHitUnder`;
 * - the tide's pace, and no food: read by the rules as the fight goes
 *   (`BattleMods`, `battleMods`);
 * - darker: smaller light pools, from the rooms' own light (`dimOf`);
 * - loot, coins and XP: paid by `settleRun`, never here (the results card
 *   reads `spoilsUnder` for what the bank will get).
 *
 * A run with no modifier never passes through any of it, so it is the run it
 * always was, to the last roll. The modifier is chosen once, as the boat rows
 * out (a run that crosses midnight keeps it), and kept in the run.
 */
import type { MonsterDef } from '../core/content';
import type { RunSpoils } from '../core/run';
import { spoilsOf, type BattleMods, type Fighter } from './battle';
import type { Run } from './dungeon';
import { foeUnder, heroMaxHitUnder, type ModifierEffects, type RunStats } from './fromLaneA';

/** A run's modifier as it keeps it: its id, and what it does (as it did when the boat rowed out). */
export interface RunModifier {
  readonly id: string;
  readonly effects: ModifierEffects;
}

const factor = (k: number | undefined): number =>
  typeof k === 'number' && Number.isFinite(k) && k > 0 ? k : 1;

/** The monsters' rows under the day's foe health, damage and swing. Unchanged (the same object) at 1. */
export function modifiedMonsters(
  monsters: Readonly<Record<string, MonsterDef>>,
  e: ModifierEffects | undefined,
): Readonly<Record<string, MonsterDef>> {
  if (!e || (factor(e.foeHealth) === 1 && factor(e.foeDamage) === 1 && factor(e.foeSpeed) === 1))
    return monsters;
  return Object.fromEntries(Object.entries(monsters).map(([id, m]) => [id, foeUnder(m, e)]));
}

/** The hero as he rows out under the day's hero damage. Unchanged at 1. */
export function modifiedFighter(fighter: Fighter, e: ModifierEffects | undefined): Fighter {
  if (!e) return fighter;
  const maxHit = heroMaxHitUnder(fighter.maxHit, e);
  return maxHit === fighter.maxHit ? fighter : { ...fighter, maxHit };
}

/** What the rules read as the fight goes; null when nothing of it applies. */
export function battleMods(e: ModifierEffects | undefined): BattleMods | null {
  if (!e) return null;
  const mods: { tidePace?: number; noFood?: boolean } = {};
  if (factor(e.tideFaster) !== 1) mods.tidePace = factor(e.tideFaster);
  if (e.noFood) mods.noFood = true;
  return Object.keys(mods).length ? mods : null;
}

/** How much of the rooms' light a darker day leaves: its pools this much as wide. */
export const DARKER_LIGHT = 0.45;

/** How much of the rooms' light a run has (1: all of it). */
export function dimOf(e: ModifierEffects | undefined): number {
  return e?.darker ? DARKER_LIGHT : 1;
}

/**
 * What a run did, from its fight's own counts and tally: time from rowing
 * out to the boss's fall (the run's clock stops behind the prompt, through a
 * pause and while the page is away, so none of that is in it; the moment of
 * results after the last blow is not either), hit points lost to blows,
 * food eaten (from the slot and found), heavy blows braced and stepped out
 * of, knocked out, kills.
 */
export function runStats(run: Run): RunStats {
  const b = run.battle;
  const over = b?.over ?? null;
  // The run's clock runs on through the beat after the last blow; the fight's clock says how long.
  const timeMs = Math.round(over ? Math.max(0, run.ms - Math.max(0, b!.clock - over.at)) : run.ms);
  const t = b?.tally;
  const found = Object.values(t?.ateFound ?? {}).reduce((a, n) => a + n, 0);
  return {
    timeMs,
    damageTaken: b?.count?.damage ?? 0,
    foodEaten: (t?.eaten ?? 0) + found,
    braces: b?.count?.braces ?? 0,
    stepOuts: b?.count?.stepOuts ?? 0,
    knockedOut: over?.why === 'fell' || run.ending === 'fell',
    kills: t?.kills ?? 0,
  };
}

/**
 * A run's spoils as `settleRun` takes them: the fight's (`spoilsOf`), the
 * dungeon it was in, its modifier (null for none) and its statistics, with
 * its time; `cleared` if it was.
 */
export function runSpoils(run: Run, cleared = false): RunSpoils {
  const stats = runStats(run);
  const base: RunSpoils = run.battle
    ? spoilsOf(run.battle, cleared ? run.dungeon : undefined)
    : { xp: {}, loot: {}, coins: 0, foodEaten: 0, arrowsUsed: 0 };
  return {
    ...base,
    dungeon: run.dungeon,
    modifier: run.modifier?.id ?? null,
    stats,
    timeMs: stats.timeMs,
  };
}

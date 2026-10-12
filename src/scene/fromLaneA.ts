/*
 * What this scene takes from lane A's wave 15 (PRs #61 and #64), in one
 * place: the dungeon table as a chart (`dungeonsInOrder`, `dungeonStatus`,
 * `mayEnter`, `src/core/dungeons.ts`), the Shell's `takeRequest` and
 * `chartOpened`. Built against a stand-in of the same shape while those were
 * not on `main`; now only these re-exports and two small readers.
 */
import type { Content, DungeonDef, ModifierEffects } from '../core/content';
import * as progress from '../core/progress';
import type { GameState } from '../core/state';
import type { Shell, ShellRequest } from '../ui/view';

export {
  dungeonStatus,
  dungeonsInOrder,
  mayEnter,
  type DungeonState,
  type DungeonStatus,
} from '../core/dungeons';
import { dungeonDef } from '../core/dungeons';

/** A dungeon's row on the chart: lane A's `DungeonDef`. */
export type ChartRow = DungeonDef;

/** A dungeon's chart row by id (its name and line), or undefined. */
export function chartRow(content: Content, id: string): ChartRow | undefined {
  return dungeonDef(content, id);
}

/** What the menus asked the town to open, taken once; null for a shell without the hook. */
export function takeRequest(shell: Shell | undefined): ShellRequest | null {
  return shell?.takeRequest?.() ?? null;
}

/** Tells the shell the chart opened, if it listens. */
export function chartOpened(shell: Shell | undefined): void {
  shell?.chartOpened?.();
}

/* ----- S16 (wave 17, lane A's #73): statistics, challenges, the day's modifier, idle runs ----- */

export {
  challengeDone,
  challengeMet,
  challengesOf,
  effectsOf,
  effectWords,
  foeUnder,
  heroMaxHitUnder,
  mayIdle,
  modifierDef,
} from '../core/progress';
export { rewardOf, spoilsUnder } from '../core/run';
export type {
  ChallengeDef,
  ChallengeRule,
  ModifierDef,
  ModifierEffects,
  RunStats,
} from '../core/content';

/**
 * What one thing eaten heals under a day's modifier (lane A's wave 18
 * `foodHeals`, `foodUnder`): lane A's rule where it is on `main`, else the
 * same rule here (a multiplier, rounded, at least 1; nothing stays nothing),
 * read through a local signature so this scene runs before and after it lands.
 */
export function foodHealsUnder(heals: number, effects: ModifierEffects): number {
  const theirs = (
    progress as unknown as { foodUnder?: (heals: number, effects: ModifierEffects) => number }
  ).foodUnder;
  if (typeof theirs === 'function') return theirs(heals, effects);
  const by = (effects as { foodHeals?: number }).foodHeals;
  if (typeof by !== 'number' || !Number.isFinite(by) || by <= 0 || by === 1 || !(heals > 0))
    return heals;
  return Math.max(1, Math.round(heals * by));
}

/** Today's modifier on a dungeon, by the shell's clock and time zone; null without one. */
export function todaysModifier(shell: Shell | undefined, dungeon: string): string | null {
  try {
    return shell?.todaysModifier?.(dungeon) ?? null;
  } catch {
    return null;
  }
}

/** Whether this shell can send the hero through a dungeon unattended. */
export function canSendIn(shell: Shell | undefined): boolean {
  return typeof shell?.sendIdle === 'function';
}

/** Sends the hero through a cleared dungeon unattended, if the shell can and may: true if it did. */
export function sendIn(shell: Shell | undefined, dungeon: string): boolean {
  try {
    return shell?.sendIdle?.(dungeon) === true;
  } catch {
    return false;
  }
}

/** The dungeon the hero is running unattended, if any (`GameState.idleRun`). */
export function idleRunOf(state: GameState): string | null {
  return state.idleRun?.dungeon ?? null;
}

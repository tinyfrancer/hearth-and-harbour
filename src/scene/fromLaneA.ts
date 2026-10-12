/*
 * What this scene takes from lane A's wave 15 (PRs #61 and #64), in one
 * place: the dungeon table as a chart (`dungeonsInOrder`, `dungeonStatus`,
 * `mayEnter`, `src/core/dungeons.ts`), the Shell's `takeRequest` and
 * `chartOpened`. Built against a stand-in of the same shape while those were
 * not on `main`; now only these re-exports and two small readers.
 */
import type { Content, DungeonDef } from '../core/content';
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
export { spoilsUnder } from '../core/run';
export type {
  ChallengeDef,
  ChallengeRule,
  ModifierDef,
  ModifierEffects,
  RunStats,
} from '../core/content';

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

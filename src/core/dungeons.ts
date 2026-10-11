import { combatLevel } from './bounty';
import type { Content, DungeonDef } from './content';
import type { GameState } from './state';

/**
 * Where a character stands with a dungeon, for the harbour chart and the
 * menus. Each rule in a sentence:
 * - A landing `comingSoon` is always `soon`: nothing there yet, whatever is done.
 * - A dungeon cleared at least once is `cleared` (its first clear is the
 *   save's `dungeons[id].clears` reaching 1); it stays open.
 * - Otherwise it is `open` when its unlock rule holds (nothing; a combat
 *   level at least so high; a first clear of another dungeon) and `locked`
 *   when it does not.
 * The recommended level is advice only: it never locks anything.
 */
export type DungeonState = 'soon' | 'locked' | 'open' | 'cleared';

export interface DungeonStatus {
  id: string;
  state: DungeonState;
  /** What unlocks it, in a line for the player (the row's `unlockText`). */
  unlock: string;
  /** The combat level it is meant for. */
  recommended: number;
  /** Runs that cleared it. */
  clears: number;
  /** The quickest clear, in milliseconds, when one was timed. */
  bestMs?: number;
}

/** Whether a dungeon's unlock rule holds for this character (true for a rule of nothing). */
export function unlocked(state: GameState, dungeon: DungeonDef): boolean {
  const rule = dungeon.unlock;
  switch (rule.kind) {
    case 'none':
      return true;
    case 'combat':
      return combatLevel(state) >= rule.level;
    case 'cleared':
      return (state.dungeons[rule.dungeon]?.clears ?? 0) >= 1;
  }
}

/** A dungeon's row, own rows only; undefined for anything the tables do not hold. */
export function dungeonDef(content: Content, id: string): DungeonDef | undefined {
  return content.dungeons && Object.hasOwn(content.dungeons, id) ? content.dungeons[id] : undefined;
}

/** Where the character stands with one dungeon, or null for an id the tables do not hold. */
export function dungeonStatus(
  state: GameState,
  id: string,
  content: Content,
): DungeonStatus | null {
  const dungeon = dungeonDef(content, id);
  if (!dungeon) return null;
  const record = state.dungeons[id];
  const clears = dungeon.comingSoon ? 0 : (record?.clears ?? 0);
  const status: DungeonStatus = {
    id,
    state: dungeon.comingSoon
      ? 'soon'
      : clears > 0
        ? 'cleared'
        : unlocked(state, dungeon)
          ? 'open'
          : 'locked',
    unlock: dungeon.unlockText,
    recommended: dungeon.recommended,
    clears,
  };
  if (!dungeon.comingSoon && record?.bestMs !== undefined) status.bestMs = record.bestMs;
  return status;
}

/** Whether the boat will take the character there now: open or cleared. */
export function mayEnter(state: GameState, id: string, content: Content): boolean {
  const status = dungeonStatus(state, id, content)?.state;
  return status === 'open' || status === 'cleared';
}

/** Every dungeon in the tables in chart order (`order`, then table order), landings to come among them. */
export function dungeonsInOrder(content: Content): DungeonDef[] {
  return Object.values(content.dungeons ?? {})
    .map((dungeon, at) => ({ dungeon, at }))
    .sort((a, b) => a.dungeon.order - b.dungeon.order || a.at - b.at)
    .map(({ dungeon }) => dungeon);
}

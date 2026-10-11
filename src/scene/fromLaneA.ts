/*
 * STAND-IN SEAM (lane A, wave 15). Everything this scene needs from lane A's
 * early PR (#61) that is not on `main` yet, in one place, so swapping the
 * real thing in is an edit to this file alone:
 *
 * - the dungeon table as a chart (`dungeonsInOrder`, `dungeonStatus`,
 *   `mayEnter`, each row's name, line, order, recommended level and unlock):
 *   the same rules as lane A's `src/core/dungeons.ts`, over a copy of its
 *   rows' chart fields, for the content that does not have them yet;
 * - the cave's cast's numbers, until `src/data/dungeons.ts` has a
 *   `tidepool_cave` row with its cast (`castOf` prefers the tables' rows, so
 *   these stop counting as soon as they come);
 * - the Shell's `takeRequest` and `chartOpened`, read off any shell that has
 *   them.
 *
 * When lane A's PR lands, each part below becomes a re-export of theirs.
 */
import { combatLevel } from '../core/bounty';
import type { Content } from '../core/content';
import type { GameState } from '../core/state';
import type { Shell } from '../ui/view';
import type { CastDef } from './cast';

/** Where a character stands with a dungeon: lane A's `DungeonState`. */
export type DungeonState = 'soon' | 'locked' | 'open' | 'cleared';

/** Lane A's `DungeonStatus`. */
export interface DungeonStatus {
  id: string;
  state: DungeonState;
  unlock: string;
  recommended: number;
  clears: number;
  bestMs?: number;
}

type Unlock =
  { kind: 'none' } | { kind: 'combat'; level: number } | { kind: 'cleared'; dungeon: string };

/** What the chart reads of a dungeon's row: lane A's `DungeonDef` fields. */
export interface ChartRow {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly order: number;
  readonly recommended: number;
  readonly unlock: Unlock;
  readonly unlockText: string;
  readonly comingSoon?: boolean;
}

/** Lane A's rows' chart fields, as their PR has them, for content that does not have them yet. */
const STAND_IN_ROWS: readonly ChartRow[] = [
  {
    id: 'tidepool_cave',
    name: 'Tidepool Cave',
    description: 'A shallow cave under the quay: somewhere to find your feet before the open sea.',
    order: 1,
    recommended: 1,
    unlock: { kind: 'none' },
    unlockText: 'Open from the start.',
  },
  {
    id: 'brinebeards_grotto',
    name: 'Brinebeard’s Grotto',
    description: 'A pirate crew’s sea cave, where the tide decides where you can stand.',
    order: 2,
    recommended: 20,
    unlock: { kind: 'none' },
    unlockText: 'Open from the start, for those ready for it.',
  },
  {
    id: 'uncharted_1',
    name: 'Uncharted',
    description: 'Not yet charted.',
    order: 3,
    recommended: 40,
    unlock: { kind: 'cleared', dungeon: 'brinebeards_grotto' },
    unlockText: 'Clear Brinebeard’s Grotto.',
    comingSoon: true,
  },
  {
    id: 'uncharted_2',
    name: 'Uncharted',
    description: 'Not yet charted.',
    order: 4,
    recommended: 60,
    unlock: { kind: 'cleared', dungeon: 'uncharted_1' },
    unlockText: 'Clear the landing before it.',
    comingSoon: true,
  },
];

/** A row with the chart's fields: the content's own once it has them, else the stand-in's. */
function rowOf(content: Content, id: string): ChartRow | undefined {
  const own = content.dungeons?.[id] as Partial<ChartRow> | undefined;
  if (own && typeof own.order === 'number' && own.unlock) return own as ChartRow;
  return STAND_IN_ROWS.find((r) => r.id === id);
}

/** Every dungeon on the chart in order (lane A's `dungeonsInOrder`). */
export function dungeonsInOrder(content: Content): ChartRow[] {
  const ids = new Set([...STAND_IN_ROWS.map((r) => r.id), ...Object.keys(content.dungeons ?? {})]);
  return [...ids]
    .map((id, at) => ({ row: rowOf(content, id), at }))
    .filter((r): r is { row: ChartRow; at: number } => !!r.row)
    .sort((a, b) => a.row.order - b.row.order || a.at - b.at)
    .map((r) => r.row);
}

function unlocked(state: GameState, row: ChartRow): boolean {
  const rule = row.unlock;
  switch (rule.kind) {
    case 'none':
      return true;
    case 'combat':
      return combatLevel(state) >= rule.level;
    case 'cleared':
      return (state.dungeons[rule.dungeon]?.clears ?? 0) >= 1;
  }
}

/** Where the character stands with one dungeon (lane A's `dungeonStatus`), or null. */
export function dungeonStatus(
  state: GameState,
  id: string,
  content: Content,
): DungeonStatus | null {
  const row = rowOf(content, id);
  if (!row) return null;
  const record = state.dungeons[id];
  const clears = row.comingSoon ? 0 : (record?.clears ?? 0);
  const status: DungeonStatus = {
    id,
    state: row.comingSoon
      ? 'soon'
      : clears > 0
        ? 'cleared'
        : unlocked(state, row)
          ? 'open'
          : 'locked',
    unlock: row.unlockText,
    recommended: row.recommended,
    clears,
  };
  if (!row.comingSoon && record?.bestMs !== undefined) status.bestMs = record.bestMs;
  return status;
}

/** Whether the boat will take the character there now (lane A's `mayEnter`). */
export function mayEnter(state: GameState, id: string, content: Content): boolean {
  const s = dungeonStatus(state, id, content)?.state;
  return s === 'open' || s === 'cleared';
}

/** A dungeon's chart row by id (its name and line), or undefined. */
export function chartRow(content: Content, id: string): ChartRow | undefined {
  return rowOf(content, id);
}

/** What the menus may ask the town to open (lane A's `ShellRequest`). */
export type ShellRequest = 'chart';

/** The shell as lane A's PR extends it. */
type ShellA = Shell & { takeRequest?(): ShellRequest | null; chartOpened?(): void };

/** What the menus asked the town to open, taken once; null for a shell without the hook. */
export function takeRequest(shell: Shell | undefined): ShellRequest | null {
  return (shell as ShellA | undefined)?.takeRequest?.() ?? null;
}

/** Tells the shell the chart opened, if it listens. */
export function chartOpened(shell: Shell | undefined): void {
  (shell as ShellA | undefined)?.chartOpened?.();
}

/**
 * Cast rows the scene fights by until the tables hold them, by dungeon id.
 * Placeholder numbers, set by the novice's balance test
 * (`tests/scene/caveRun.test.ts`).
 */
export const STAND_IN_CAST: Readonly<Record<string, Readonly<Record<string, CastDef>>>> = {
  tidepool_cave: {
    dock_rat: {
      id: 'dock_rat',
      name: 'Dock rat',
      description: 'The size of a terrier and twice as sure of itself.',
      area: 'tidepool_cave',
      level: 1,
      hp: 4,
      attack: 6,
      defence: 4,
      maxHit: 1,
      speedMs: 2400,
      coins: [10, 30],
      always: [{ item: 'hide', min: 1, max: 1 }],
      rare: [],
    },
    sand_crab: {
      id: 'sand_crab',
      name: 'Sand crab',
      description: 'A crab with opinions, most of them about you, all of them sideways.',
      area: 'tidepool_cave',
      level: 2,
      hp: 8,
      attack: 8,
      defence: 6,
      maxHit: 2,
      speedMs: 3000,
      coins: [20, 60],
      always: [{ item: 'seashells', min: 1, max: 3 }],
      rare: [],
    },
    old_snapper: {
      id: 'old_snapper',
      name: 'Old Snapper',
      description: 'Older than the harbour wall, and about as easy to move.',
      area: 'tidepool_cave',
      level: 3,
      hp: 16,
      attack: 10,
      defence: 6,
      maxHit: 2,
      speedMs: 3600,
      coins: [0, 0],
      always: [{ item: 'seashells', min: 3, max: 5 }],
      rare: [{ item: 'pearl', min: 1, max: 1, oneIn: 8 }],
    },
  },
};

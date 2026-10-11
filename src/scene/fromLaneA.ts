/*
 * What this scene takes from lane A's wave 15 (PRs #61 and #64), in one
 * place: the dungeon table as a chart (`dungeonsInOrder`, `dungeonStatus`,
 * `mayEnter`, `src/core/dungeons.ts`), the Shell's `takeRequest` and
 * `chartOpened`. Built against a stand-in of the same shape while those were
 * not on `main`; now only these re-exports and two small readers.
 */
import type { Content, DungeonDef } from '../core/content';
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

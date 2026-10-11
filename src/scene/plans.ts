/*
 * Every dungeon's rooms as written, by id, and nothing else: what the
 * worker that paints rooms needs (`grottoWorker.ts`), without the rules,
 * the words or the tables. `dungeons.ts` holds the rest of each dungeon.
 */
import type { DungeonPlan } from './dungeon';
import { GROTTO } from './grotto';
import { TIDEPOOL } from './tidepool';

export const DUNGEON_PLANS: Readonly<Record<string, DungeonPlan>> = {
  [GROTTO.id]: GROTTO,
  [TIDEPOOL.id]: TIDEPOOL,
};

/** A dungeon's plan by id; null for one not known. */
export function planOf(id: string): DungeonPlan | null {
  return Object.hasOwn(DUNGEON_PLANS, id) ? DUNGEON_PLANS[id]! : null;
}

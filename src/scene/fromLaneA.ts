/*
 * STAND-IN SEAM (lane A, wave 15). Everything this scene needs from lane A's
 * early PR that is not on `main` yet, in one place, so swapping the real
 * thing in is an edit to this file alone:
 *
 * - the cave's boss's numbers (`old_snapper`), until `src/data/dungeons.ts`
 *   has a `tidepool_cave` row with its cast (`castOf` prefers the tables'
 *   rows, so this one stops counting as soon as they come);
 *
 * When lane A's PR lands, each part below becomes a re-export of theirs.
 */
import type { CastDef } from './cast';

/**
 * Cast rows the scene fights by until the tables hold them, by dungeon id.
 * Placeholder numbers, set by the novice's balance test
 * (`tests/scene/caveRun.test.ts`).
 */
export const STAND_IN_CAST: Readonly<Record<string, Readonly<Record<string, CastDef>>>> = {
  tidepool_cave: {
    old_snapper: {
      id: 'old_snapper',
      name: 'Old Snapper',
      description: 'Older than the harbour wall, and about as easy to move.',
      area: 'tidepool_cave',
      level: 4,
      hp: 24,
      attack: 12,
      defence: 10,
      maxHit: 3,
      speedMs: 3600,
      coins: [0, 0],
      always: [{ item: 'seashells', min: 3, max: 5 }],
      rare: [{ item: 'pearl', min: 1, max: 1, oneIn: 8 }],
    },
  },
};

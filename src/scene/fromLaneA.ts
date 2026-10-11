/*
 * STAND-IN SEAM (lane A, wave 15). Everything this scene needs from lane A's
 * early PR that is not on `main` yet, in one place, so swapping the real
 * thing in is an edit to this file alone:
 *
 * - the cave's cast's numbers, until `src/data/dungeons.ts` has a
 *   `tidepool_cave` row with its cast (`castOf` prefers the tables' rows, so
 *   these stop counting as soon as they come). The tables' own dock rat and
 *   sand crab are too much for a character with no weapon (a level-1 blow
 *   does 1): the novice's balance test falls in the second room every time
 *   on them. These are what clear it in two to three minutes;
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

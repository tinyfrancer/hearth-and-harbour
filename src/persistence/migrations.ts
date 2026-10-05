import { seedFrom } from '../core/rng';
import { DEFAULT_EAT_AT, GAME_STATE_VERSION, type GameState } from '../core/state';

// Harvested from untitled-boomer-mmo. Each step upgrades a save from exactly
// `fromVersion` to `fromVersion + 1`. A step is owed whenever the *shape or
// meaning* of the save changes: add it here, bump GAME_STATE_VERSION, and add
// a case to tests/persistence/migrations.test.ts.
type MigrationStep = (state: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, MigrationStep> = {
  // The idle engine (S2): nobody made before it has trained, banked or begun anything.
  1: (state) => ({ ...state, skills: {}, bank: {}, action: null }),
  // Coins and mastery (S4): nobody made before them has sold or mastered anything.
  2: (state) => ({ ...state, coins: 0, mastery: {} }),
  // Potions (S6): nobody made before them has drunk one.
  3: (state) => ({ ...state, potion: null }),
  // Looks and equipment (S7b): nobody made before them has worn anything, and
  // a look with nothing chosen is drawn as the art's first choice of each part.
  4: (state) => ({ ...state, look: {}, equipment: {} }),
  // Combat (S8): nobody made before it has fought, fed the food slot or met a
  // monster. Their dice are seeded from when they were made, so each
  // character's are their own and a save migrated twice rolls the same.
  5: (state) => ({
    ...state,
    fight: null,
    food: null,
    eatAt: DEFAULT_EAT_AT,
    rng: seedFrom(typeof state.createdAt === 'number' ? state.createdAt : 0),
    bestiary: {},
  }),
  // Thieving, bounties and hit points that last (S9): nobody made before them
  // has robbed anyone or held a bounty, and a character not in a fight was
  // always at full health between fights, which is what no `health` means.
  6: (state) => ({ ...state, marks: {}, bounty: null, bountyPoints: 0, health: null }),
};

/**
 * Bring a parsed save up to GAME_STATE_VERSION, or return null if it can't be
 * (not a save, no chain of steps from its version, or from a newer build).
 */
export function migrateGameState(
  raw: unknown,
  steps: Record<number, MigrationStep> = MIGRATIONS,
  target: number = GAME_STATE_VERSION,
): GameState | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  let state = raw as Record<string, unknown>;
  let version = state.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version > target) {
    return null;
  }
  while (version < target) {
    const step = steps[version];
    if (!step) {
      return null;
    }
    state = step(state);
    version += 1;
    state.version = version;
  }
  return state as unknown as GameState;
}

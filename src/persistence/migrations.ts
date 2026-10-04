import { GAME_STATE_VERSION, type GameState } from '../core/state';

// Harvested from untitled-boomer-mmo. Each step upgrades a save from exactly
// `fromVersion` to `fromVersion + 1`. A step is owed whenever the *shape or
// meaning* of the save changes: add it here, bump GAME_STATE_VERSION, and add
// a case to tests/persistence/migrations.test.ts.
type MigrationStep = (state: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, MigrationStep> = {
  // The idle engine (S2): nobody made before it has trained, banked or begun anything.
  1: (state) => ({ ...state, skills: {}, bank: {}, action: null }),
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

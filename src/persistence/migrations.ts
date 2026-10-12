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
  // The collection log, achievements, dungeon clears, running counts and the
  // store's lasting things (S10). The log starts with what the save already
  // proves was held: the bank, what is worn, the food slot, the potion
  // working, and every drop the bestiary and the marks have seen. Nothing
  // older can be known; achievements are earned from this state on first
  // load, like any other change. Coins changed meaning: every price went up
  // tenfold, so the purse does too and is worth what it was.
  7: (state) => ({
    ...state,
    coins: typeof state.coins === 'number' ? state.coins * 10 : state.coins,
    collection: provenFinds(state),
    achievements: [],
    dungeons: {},
    stats: {},
    perks: [],
  }),
  // Wave 13, one step for all of it: the notice board shows offers to choose
  // from (none posted yet: the board is read afresh), remembers the last
  // target so it is not offered straight back, and can hand bounties in by
  // itself (off). A bounty already held keeps its old pay: it has no `points`,
  // and pays its monster's old row. A run under way can be kept through a
  // reload (none is). Beards: a look made before them has none, which is the
  // art's own id for a bare chin.
  8: (state) => ({
    ...state,
    bountyBoard: [],
    lastBounty: null,
    autoBounty: false,
    run: null,
    look: { beard: 'none', ...record(state.look) },
  }),
  // Wave 16: one-off things remembered for good (the town's first pan, a
  // dungeon's lessons), which until now lasted only as long as the page.
  // Nothing older can be known, so nothing is remembered yet.
  9: (state) => ({ ...state, seen: [] }),
  // Wave 17 (S16), one step for all of it: a dungeon can be run unattended
  // once cleared (none is yet). A dungeon's record gains challenges done, the
  // modifiers cleared under, the least damage and food of a clear and idle
  // runs, all optional and none known for an older clear, so the records stand.
  10: (state) => ({ ...state, idleRun: null }),
  // Wave 20: a ninth slot, `back`, for a cloak. The red cloak was worn at the
  // neck until now; one worn there moves to the back (empty in every older
  // save), freeing the neck for an amulet. Nothing else was a cloak.
  11: (state) => ({ ...state, equipment: cloakToBack(record(state.equipment)) }),
};

/** The one thing that ever went on the back but was worn at the neck before version 12. */
export const MOVED_TO_BACK = 'red_cloak';

/** Equipment with a red cloak worn at the neck moved to the back. */
function cloakToBack(equipment: Record<string, unknown>): Record<string, unknown> {
  if (record(equipment.neck).item !== MOVED_TO_BACK) return equipment;
  const { neck, ...rest } = equipment;
  return { ...rest, back: neck };
}

/** A save's field as a plain object, or an empty one if it is not one. */
function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Item ids a version 7 save shows the character has held, each once, in a fixed order. */
function provenFinds(state: Record<string, unknown>): string[] {
  const found = new Set<string>();
  const note = (id: unknown): void => {
    if (typeof id === 'string') found.add(id);
  };
  Object.keys(record(state.bank)).forEach(note);
  for (const worn of Object.values(record(state.equipment))) note(record(worn).item);
  note(record(state.food).item);
  note(record(state.potion).item);
  for (const known of [
    ...Object.values(record(state.bestiary)),
    ...Object.values(record(state.marks)),
  ]) {
    const seen = record(known).seen;
    if (Array.isArray(seen)) seen.forEach(note);
  }
  return [...found];
}

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

import type {
  ChallengeDef,
  ChallengeRule,
  Content,
  DungeonDef,
  ModifierDef,
  ModifierEffects,
  RunStatId,
  RunStats,
} from './content';
import { dungeonDef } from './dungeons';
import { Dice } from './rng';
import type { GameState } from './state';

/**
 * Dungeon progression and replay (S16): what a clear opens, the day's
 * modifier, challenges, and whether a dungeon may be run idle. Each rule in a
 * sentence:
 * - Tier 1 is open from the start; each later tier opens on the first clear
 *   of the dungeon whose row says it opens it (`DungeonDef.opens`), read from
 *   the clears the save already keeps, so it needs no state of its own.
 * - Each dungeon has a modifier a day (or none, if it draws from none),
 *   changing at local midnight. Its modifiers come round in turn, every one
 *   once before any comes again, in an order shuffled afresh each time round
 *   and never the same two days running. The day and the dungeon alone decide
 *   it (a hash, not the save's dice), so it is the same on any phone and for
 *   a new character, and reading it rolls nothing.
 * - A challenge is met by a clear whose reported statistics satisfy its rule;
 *   a statistic not reported never satisfies one.
 * - A dungeon may be run idle once it has been cleared by hand and its row
 *   says how (`DungeonDef.idle`).
 *
 * Time is passed in, never read: the day comes from `now` and the phone's
 * offset from UTC, both handed in by the app.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** The day `now` falls on where the phone is, counted from the epoch: `utcOffset` is minutes ahead of UTC. */
export function localDay(now: number, utcOffset = 0): number {
  return Math.floor((now + utcOffset * 60_000) / DAY_MS);
}

/** Milliseconds from `now` to the next local midnight. */
export function msToMidnight(now: number, utcOffset = 0): number {
  return (localDay(now, utcOffset) + 1) * DAY_MS - utcOffset * 60_000 - now;
}

/** A modifier's row, own rows only. */
export function modifierDef(content: Content, id: string): ModifierDef | undefined {
  return content.modifiers && Object.hasOwn(content.modifiers, id)
    ? content.modifiers[id]
    : undefined;
}

/** The modifiers a dungeon draws its days from, those the tables hold, in its row's order. */
export function modifierPool(dungeon: DungeonDef, content: Content): string[] {
  if (dungeon.comingSoon) return [];
  return [...new Set(dungeon.modifiers ?? [])].filter((id) => modifierDef(content, id));
}

/** A whole number from a dungeon's id, the same on every phone (FNV-1a). */
function saltOf(id: string): number {
  let hash = 0x811c9dc5;
  for (let at = 0; at < id.length; at += 1) {
    hash = Math.imul(hash ^ id.charCodeAt(at), 0x01000193) >>> 0;
  }
  return hash;
}

/** The order the pool comes round in for one turn of it, before the fix at its start. */
function shuffled(turn: number, salt: number, size: number): number[] {
  const dice = new Dice((salt ^ Math.imul(turn, 0x9e3779b1)) >>> 0);
  const order = Array.from({ length: size }, (_, at) => at);
  for (let at = size - 1; at > 0; at -= 1) {
    const other = Math.floor(dice.next() * (at + 1));
    [order[at], order[other]] = [order[other]!, order[at]!];
  }
  return order;
}

/** Which of a pool of `size` falls on `day`, for a dungeon of `salt`. */
function pick(day: number, salt: number, size: number): number {
  if (size === 1) return 0;
  // Two can only take turns, if never the same two days running.
  if (size === 2) return (((day + salt) % 2) + 2) % 2;
  const turn = Math.floor(day / size);
  const order = shuffled(turn, salt, size);
  // A turn never opens with the day the last one closed on. Only the first two
  // places move, so the last turn's last place is its shuffle's own.
  if (order[0] === shuffled(turn - 1, salt, size)[size - 1]) {
    [order[0], order[1]] = [order[1]!, order[0]!];
  }
  return order[day - turn * size]!;
}

/** The modifier on a dungeon on a local day (`localDay`), or null if it draws from none. */
export function modifierOn(day: number, dungeonId: string, content: Content): string | null {
  const dungeon = dungeonDef(content, dungeonId);
  const pool = dungeon ? modifierPool(dungeon, content) : [];
  if (pool.length === 0) return null;
  return pool[pick(day, saltOf(dungeonId), pool.length)]!;
}

/**
 * Today's modifier on a dungeon, or null: the day `now` falls on where the
 * phone is (`utcOffset` minutes ahead of UTC; the app passes it in).
 */
export function dailyModifier(
  now: number,
  dungeonId: string,
  content: Content,
  utcOffset = 0,
): string | null {
  return modifierOn(localDay(now, utcOffset), dungeonId, content);
}

/** What a modifier does, by id; nothing for null or an id the tables do not hold. */
export function effectsOf(content: Content, id: string | null | undefined): ModifierEffects {
  return (id && modifierDef(content, id)?.effects) || {};
}

const times = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 1;

/** A foe's numbers under a modifier: hit points, max hit and wait between blows. */
export function foeUnder<T extends { hp: number; maxHit: number; speedMs: number }>(
  foe: T,
  effects: ModifierEffects,
): T {
  const health = times(effects.foeHealth);
  const damage = times(effects.foeDamage);
  const speed = times(effects.foeSpeed);
  if (health === 1 && damage === 1 && speed === 1) return foe;
  return {
    ...foe,
    hp: Math.max(1, Math.round(foe.hp * health)),
    maxHit: Math.max(1, Math.round(foe.maxHit * damage)),
    speedMs: Math.max(1, Math.round(foe.speedMs / speed)),
  };
}

/** The hero's max hit under a modifier. */
export function heroMaxHitUnder(maxHit: number, effects: ModifierEffects): number {
  const damage = times(effects.heroDamage);
  return damage === 1 ? maxHit : Math.max(1, Math.round(maxHit * damage));
}

/**
 * What one thing eaten heals under a modifier (`foodHeals`): rounded, at
 * least 1; nothing stays nothing. For the food slot and for food found alike.
 * (`noFood`, which no dungeon draws any more, is the scene's own flag and
 * not read here.)
 */
export function foodUnder(heals: number, effects: ModifierEffects): number {
  const by = times(effects.foodHeals);
  if (by === 1 || !(heals > 0)) return heals;
  return Math.max(1, Math.round(heals * by));
}

/**
 * The modifier a hero sent through idle plays under, from the day's: a kind
 * day as it comes, a trade day plain (null), its catch and its bonus both
 * left out. Sent alone, he cannot choose to bring more fish or stay away on a
 * hard day, so idle never risks one: a night away never ends because the
 * calendar turned.
 */
export function idleModifier(content: Content, id: string | null | undefined): string | null {
  const def = id ? modifierDef(content, id) : undefined;
  return def && isKind(def.effects) ? def.id : null;
}

/** A reward multiplier (`loot`, `coins`, `xp`) applied to a whole amount, rounded. */
export function scaled(amount: number, multiplier: number | undefined): number {
  const by = times(multiplier);
  return by === 1 ? amount : Math.round(amount * by);
}

/** How much more or less, in whole percent, for words. */
const percent = (value: number): number => Math.round(Math.abs(value - 1) * 100);

/** What a modifier does, plainly, a line a part, in the order the parts are listed. */
export function effectWords(effects: ModifierEffects): string[] {
  const words: string[] = [];
  const more = (value: number | undefined, up: string, down: string): void => {
    const by = times(value);
    if (by !== 1)
      words.push(
        by > 1 ? up.replace('#', `${percent(by)}%`) : down.replace('#', `${percent(by)}%`),
      );
  };
  more(effects.foeHealth, 'Foes have # more health', 'Foes have # less health');
  more(effects.foeDamage, 'Foes hit # harder', 'Foes hit # softer');
  more(effects.foeSpeed, 'Foes strike # more often', 'Foes strike # less often');
  more(effects.heroDamage, 'Your blows land # harder', 'Your blows land # softer');
  more(effects.foodHeals, 'Food heals # more', 'Food heals # less');
  if (effects.noFood) words.push('Nothing can be eaten');
  more(effects.tideFaster, 'The tide turns # faster', 'The tide turns # slower');
  if (effects.darker) words.push('The rooms are darker');
  more(effects.loot, '# more of the usual drops', '# fewer of the usual drops');
  more(effects.coins, '# more coins', '# fewer coins');
  more(effects.xp, '# more XP', '# less XP');
  return words;
}

/** Whether a modifier only makes things easier or pays more, never harder (a learning dungeon's kind). */
export function isKind(effects: ModifierEffects): boolean {
  const harder =
    times(effects.foeHealth) > 1 ||
    times(effects.foeDamage) > 1 ||
    times(effects.foeSpeed) > 1 ||
    times(effects.heroDamage) < 1 ||
    times(effects.foodHeals) < 1 ||
    times(effects.tideFaster) > 1 ||
    Boolean(effects.noFood) ||
    Boolean(effects.darker);
  return !harder;
}

/* ----- Challenges ----- */

const RUN_STAT_IDS: readonly RunStatId[] = [
  'timeMs',
  'damageTaken',
  'foodEaten',
  'braces',
  'stepOuts',
  'kills',
];

/**
 * A run's statistics as far as they can be trusted: each number whole and
 * not below nothing, and `knockedOut` a yes or no. Anything else is left
 * out, which is to say not known.
 */
export function readStats(raw: unknown): Partial<RunStats> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const from = raw as Record<string, unknown>;
  const stats: Partial<RunStats> = {};
  for (const id of RUN_STAT_IDS) {
    const value = from[id];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      stats[id] = Math.floor(value);
    }
  }
  if (typeof from.knockedOut === 'boolean') stats.knockedOut = from.knockedOut;
  return stats;
}

/** What a challenge is judged by besides the statistics: whether the run cleared, and its day's modifier. */
export interface ChallengeContext {
  cleared: boolean;
  modifier?: string | null;
}

/**
 * Whether a run meets a challenge's rule. Only a clear ever does, and a
 * statistic the run did not report never does (unknown is not nothing).
 * Both lanes call this: the scene for its results card, `settleRun` to pay.
 */
export function challengeMet(
  rule: ChallengeRule,
  stats: Partial<RunStats> | undefined,
  context: ChallengeContext,
): boolean {
  if (!context.cleared) return false;
  const known = readStats(stats);
  if (known.knockedOut === true) return false;
  switch (rule.kind) {
    case 'atMost': {
      const value = known[rule.stat];
      return value !== undefined && value <= rule.n;
    }
    case 'atLeast': {
      const value = known[rule.stat];
      return value !== undefined && value >= rule.n;
    }
    case 'withModifier': {
      const modifier = context.modifier ?? null;
      return modifier !== null && (rule.id === undefined || rule.id === modifier);
    }
  }
}

/** A dungeon's challenges, in its row's order. */
export function challengesOf(content: Content, dungeonId: string): readonly ChallengeDef[] {
  return dungeonDef(content, dungeonId)?.challenges ?? [];
}

/** Whether a challenge has been done. */
export function challengeDone(state: GameState, dungeonId: string, challengeId: string): boolean {
  return state.dungeons[dungeonId]?.challenges?.includes(challengeId) ?? false;
}

/** The challenges done between two states, in the order the tables list them. */
export function newChallenges(
  before: GameState,
  after: GameState,
  content: Content,
): ChallengeDef[] {
  return Object.values(content.dungeons ?? {}).flatMap((dungeon) =>
    (dungeon.challenges ?? []).filter(
      (challenge) =>
        challengeDone(after, dungeon.id, challenge.id) &&
        !challengeDone(before, dungeon.id, challenge.id),
    ),
  );
}

/* ----- What a clear opens ----- */

// The rule lives with the other tier rules (src/core/tiers.ts); exported here too, where S16 put it.
export { tierUnlocked } from './tiers';

/** Whether the hero may be sent through a dungeon unattended: cleared by hand, and the row says how. */
export function mayIdle(state: GameState, dungeonId: string, content: Content): boolean {
  const dungeon = dungeonDef(content, dungeonId);
  return Boolean(
    dungeon &&
    !dungeon.comingSoon &&
    dungeon.idle &&
    dungeon.idle.rooms.length > 0 &&
    (state.dungeons[dungeonId]?.clears ?? 0) >= 1,
  );
}

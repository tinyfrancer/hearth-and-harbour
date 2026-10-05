/*
 * The grotto's tide, as a clock. The sea rises and falls in four levels, 0
 * (low water) to 3 (high water), on a slow cycle that every room shares; the
 * captain's cove keeps its own, which he raises when he is losing.
 *
 * Ground that the tide reaches has a height, 0 to 3. Water at a level covers
 * ground below it: one level over a tile is shallows (wadeable, slow), two or
 * more is deep water (nobody stands in it). So a sandbar of height 1 is dry at
 * low water, shallows at level 1, and gone at 2 and 3.
 *
 * Pure functions of the run's clock (and, in the cove, of when the captain
 * called the sea in): the same moment always has the same tide.
 */

/** The highest the water goes. */
export const HIGH_WATER = 3;

/** How long, before a rise, the ground it will cover darkens: the warning that the sea is coming. */
export const TIDE_WARN_MS = 3000;

/** One stretch of the cycle: the water at a level for a time. */
export interface TideStep {
  readonly level: number;
  readonly ms: number;
}

/**
 * The cycle, from low water: a long low, a rise in two short steps, a long
 * high, and back down. A minute in all, so a room's fight sees it turn at
 * least once.
 */
export const TIDE_CYCLE: readonly TideStep[] = [
  { level: 0, ms: 18_000 },
  { level: 1, ms: 6000 },
  { level: 2, ms: 6000 },
  { level: 3, ms: 18_000 },
  { level: 2, ms: 6000 },
  { level: 1, ms: 6000 },
];

export const TIDE_PERIOD = TIDE_CYCLE.reduce((sum, s) => sum + s.ms, 0);

/** Where in the cycle a run starts: low water, with a while to look around before it turns. */
export const TIDE_START = 4000;

/** The water now, and what it does next. */
export interface TideNow {
  readonly level: number;
  /** The next change: to what level, and when on the run's clock. Null while it holds for good. */
  readonly next: { readonly level: number; readonly at: number } | null;
  /** When the water came to this level (for the gauge's creep); -Infinity if it always was. */
  readonly since: number;
}

/** The shared tide at `clock` (the run's own clock, in ms). */
export function cycleTide(clock: number): TideNow {
  const into = (((clock + TIDE_START) % TIDE_PERIOD) + TIDE_PERIOD) % TIDE_PERIOD;
  let start = 0;
  for (let i = 0; i < TIDE_CYCLE.length; i++) {
    const step = TIDE_CYCLE[i]!;
    if (into < start + step.ms) {
      const following = TIDE_CYCLE[(i + 1) % TIDE_CYCLE.length]!;
      const since = clock - (into - start);
      return { level: step.level, since, next: { level: following.level, at: since + step.ms } };
    }
    start += step.ms;
  }
  // Not reached: `into` is always inside the period.
  return { level: 0, since: clock, next: null };
}

/** The sea coming into the cove: a level every this long once the captain calls it, from a short warning. */
export const SURGE_STEP_MS = 5000;
/** From the call to the first rise: the warning, as every rise has. */
export const SURGE_FIRST_MS = TIDE_WARN_MS;
/** Going out again once he is down: a level every this long. */
export const EBB_STEP_MS = 1500;

/**
 * The cove's own tide: low water until `surge` (the clock time he called the
 * sea in), then a level every `SURGE_STEP_MS` up to high water, where it
 * holds; from `ebb`, back down a level at a time. Each rise comes
 * `TIDE_WARN_MS` after it is first shown, as the cycle's do.
 */
export function surgeTide(clock: number, surge: number | null, ebb: number | null): TideNow {
  if (surge === null || clock < surge) {
    return {
      level: 0,
      since: -Infinity,
      next: surge === null ? null : { level: 1, at: surge + SURGE_FIRST_MS },
    };
  }
  const risen = (t: number): number =>
    t < surge + SURGE_FIRST_MS
      ? 0
      : Math.min(HIGH_WATER, 1 + Math.floor((t - surge - SURGE_FIRST_MS) / SURGE_STEP_MS));
  const riseAt = (level: number): number => surge + SURGE_FIRST_MS + (level - 1) * SURGE_STEP_MS;
  if (ebb === null || clock < ebb) {
    const level = risen(clock);
    const since = level === 0 ? surge : riseAt(level);
    if (level < HIGH_WATER)
      return { level, since, next: { level: level + 1, at: riseAt(level + 1) } };
    return { level, since, next: ebb === null ? null : { level: level - 1, at: ebb } };
  }
  const top = risen(ebb);
  const gone = Math.floor((clock - ebb) / EBB_STEP_MS);
  const level = Math.max(0, top - gone);
  return {
    level,
    since: ebb + gone * EBB_STEP_MS,
    next: level > 0 ? { level: level - 1, at: ebb + (gone + 1) * EBB_STEP_MS } : null,
  };
}

/** Whether the water is about to rise: the next change is up, and near enough to show. */
export function rising(tide: TideNow, clock: number): boolean {
  return !!tide.next && tide.next.level > tide.level && tide.next.at - clock <= TIDE_WARN_MS;
}

export type Water = 'dry' | 'shallow' | 'deep';

/** What the water makes of ground of `height` at `level`. */
export function waterAt(height: number, level: number): Water {
  const depth = level - height + 1;
  return depth <= 0 ? 'dry' : depth === 1 ? 'shallow' : 'deep';
}

/**
 * How high the water stands on the gauge, from 0 to `HIGH_WATER`, in
 * fractions: it sits at its level, and creeps towards the next through the
 * warning before a change, arriving as it does.
 */
export function gaugeLevel(tide: TideNow, clock: number): number {
  if (!tide.next) return tide.level;
  const left = tide.next.at - clock;
  if (left >= TIDE_WARN_MS) return tide.level;
  const k = 1 - Math.max(0, left) / TIDE_WARN_MS;
  return tide.level + (tide.next.level - tide.level) * k;
}

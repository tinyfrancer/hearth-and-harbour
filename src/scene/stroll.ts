/*
 * Townsfolk who take a turn about the square: out along a short route of
 * their own, a rest at the far end, back, a rest at home, and round again.
 * Where they are is a pure function of their own clock, which the town runs
 * on with the scene's time and holds still while the hero is talking to them
 * (or on his way to): so it never reads the time, nothing about it is random,
 * and a second in one step lands where sixty steps of a sixtieth do.
 *
 * Routes are data (`STROLLERS2` in `town2.ts`), kept clear of doors and of
 * anything that can be tapped (`tests/scene/stroll.test.ts`).
 */
import type { Facing, Way } from './play';
import { centreOf, type Cell, type Point } from './tileMap';

export interface Stroll {
  /** The tiles walked through, from where they rest at home to where they turn back. */
  readonly route: readonly Cell[];
  /** How long they rest at each end. */
  readonly restMs: number;
  /** How fast they walk, art pixels a second. */
  readonly speed: number;
  /** How far into the round they are when the page opens. */
  readonly startMs: number;
}

/** One straight stretch of a route, in art pixels, with which way it goes. */
interface Leg {
  readonly from: Point;
  readonly to: Point;
  readonly length: number;
  readonly way: Way;
  /** The way across they face on it: its own, or for a leg straight up or down, the last one's. */
  readonly side: Facing;
}

/** A route worked out: its legs each way, and how long a round takes. */
export interface Round {
  readonly stroll: Stroll;
  readonly out: readonly Leg[];
  readonly back: readonly Leg[];
  /** The length of the route one way, in art pixels. */
  readonly length: number;
  /** How long one round takes: out, rest, back, rest. */
  readonly ms: number;
}

/** Where a stroller is and what they are doing at a moment of their round. */
export interface Strolling {
  readonly at: Point;
  readonly walking: boolean;
  /** How far they have walked since they last set off, in art pixels: what times their stride. */
  readonly walked: number;
  readonly way: Way;
  readonly side: Facing;
}

function legsOf(points: readonly Point[], startSide: Facing): Leg[] {
  const legs: Leg[] = [];
  let side = startSide;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1]!;
    const to = points[i]!;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx < 0) side = 'left';
    else if (dx > 0) side = 'right';
    const way: Way = Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : 'across';
    legs.push({ from, to, length: Math.hypot(dx, dy), way, side });
  }
  return legs;
}

/** The last way across a list of legs faced, or `fallback` if none went across. */
const lastSide = (legs: readonly Leg[], fallback: Facing): Facing => legs.at(-1)?.side ?? fallback;

/** A stroll's round, worked out once: tile centres on `tile`-pixel tiles. */
export function roundOf(stroll: Stroll, tile: number): Round {
  const points = stroll.route.map((c) => centreOf(c, tile));
  // The way across they first face: the first leg that goes across, out.
  const firstAcross = legsOf(points, 'right').find((l) => l.way === 'across');
  const out = legsOf(points, firstAcross?.side ?? 'right');
  const back = legsOf([...points].reverse(), lastSide(out, 'right'));
  const length = out.reduce((sum, l) => sum + l.length, 0);
  return {
    stroll,
    out,
    back,
    length,
    ms: 2 * stroll.restMs + (2 * length * 1000) / stroll.speed,
  };
}

/** Where along `legs` someone is after walking `d` art pixels from the first. */
function along(legs: readonly Leg[], d: number): { at: Point; leg: Leg } {
  let left = d;
  for (const leg of legs) {
    if (left <= leg.length) {
      const k = leg.length ? left / leg.length : 0;
      return {
        at: {
          x: leg.from.x + (leg.to.x - leg.from.x) * k,
          y: leg.from.y + (leg.to.y - leg.from.y) * k,
        },
        leg,
      };
    }
    left -= leg.length;
  }
  const leg = legs.at(-1)!;
  return { at: leg.to, leg };
}

/** Where a stroller is `clock` milliseconds into their own time (any number; the round repeats). */
export function strollAt(round: Round, clock: number): Strolling {
  const { stroll, out, back, length } = round;
  const home = out[0]?.from ?? centreOf(stroll.route[0]!, 1);
  const walkMs = (length * 1000) / stroll.speed;
  let t = (((clock + stroll.startMs) % round.ms) + round.ms) % round.ms;
  if (!out.length) return { at: home, walking: false, walked: 0, way: 'across', side: 'right' };
  const resting = (at: Point, side: Facing): Strolling => ({
    at,
    walking: false,
    walked: 0,
    way: 'across',
    side,
  });
  if (t < stroll.restMs) return resting(home, lastSide(back, 'right'));
  t -= stroll.restMs;
  for (const [legs, end] of [
    [out, 'far'],
    [back, 'home'],
  ] as const) {
    if (t < walkMs) {
      const walked = (t * stroll.speed) / 1000;
      const { at, leg } = along(legs, walked);
      return { at, walking: true, walked, way: leg.way, side: leg.side };
    }
    t -= walkMs;
    if (end === 'far') {
      if (t < stroll.restMs) return resting(out.at(-1)!.to, lastSide(out, 'right'));
      t -= stroll.restMs;
    }
  }
  return resting(home, lastSide(back, 'right'));
}

/** A stroller's clock after `ms` more: it runs only while nobody is talking to them. */
export function strollOn(clock: number, ms: number, talking: boolean): number {
  return talking ? clock : clock + Math.max(0, ms);
}

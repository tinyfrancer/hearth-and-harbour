/*
 * Who is drawn where in a fight, when two figures stand so close that one
 * would be painted over the other: the hero at his blade's stand beside a
 * giant crab or the captain (36 art pixels, less than the crab's claws reach
 * from its feet), or one of the captain's crew pressed against his coat.
 *
 * Drawing only. Where everyone stands, how far a blow reaches and when it
 * lands are the fight's (`battle.ts`) and do not move: this says how far to
 * one side of their feet each figure is shown, from the art lane's declared
 * sizes (`FOE2_SIZES`: the body's width, and what is drawn ahead of and
 * behind the feet), never from a picture's pixels. The one who gives way is
 * the smaller (the hero, before any foe; a deckhand, before the captain),
 * by no more than half a tile, so a figure is never shown far from where
 * the marks on the ground judge it.
 *
 * Pure and smooth: a function of where everyone is this moment, so it never
 * jumps as they walk (except as one passes straight through another's
 * feet), and fades as someone falls or as they stand apart up and down the
 * room, where drawing by feet already puts one in front of the other.
 */
import type { Point } from './tileMap';

/** Someone in the fight as this reckons them: their feet and how far they are drawn either side. */
export interface Figure {
  readonly key: string;
  readonly at: Point;
  /** Art pixels of body drawn to the left and to the right of the feet, as they face now. */
  readonly left: number;
  readonly right: number;
  /** Who gives way to whom: the lower moves. */
  readonly rank: number;
  /** How much they count, 0 to 1: less as they fall. */
  readonly weight: number;
}

/** How far two figures may overlap before either is moved: outlines touching reads as a fight. */
export const APART_ALLOW = 4;
/** The most anyone is shown from their feet, in art pixels: half a tile. */
export const APART_MOST = 12;
/** Feet this near up and down the room count fully; this far apart, not at all. */
export const APART_NEAR = 6;
export const APART_FAR = 20;

/** How much of an overlap up and down the room still matters: 1 level, 0 well apart. */
function level(dy: number): number {
  const d = Math.abs(dy);
  if (d <= APART_NEAR) return 1;
  if (d >= APART_FAR) return 0;
  return 1 - (d - APART_NEAR) / (APART_FAR - APART_NEAR);
}

/**
 * How far to the side each figure is drawn from its feet (negative left), by
 * key; anyone not moved is absent. Each pair that overlaps by more than
 * `APART_ALLOW` sends the lower-ranked one away from the other by the
 * overlap (scaled by how level they stand and how much each counts); what
 * one figure is sent by several adds up, to at most `APART_MOST`.
 */
export function shownApart(figures: readonly Figure[]): Map<string, number> {
  const out = new Map<string, number>();
  for (let i = 0; i < figures.length; i++)
    for (let j = i + 1; j < figures.length; j++) {
      const p = figures[i]!;
      const q = figures[j]!;
      if (p.rank === q.rank || p.weight <= 0 || q.weight <= 0) continue;
      // Left and right of each other by their feet; level with each other, by the list's order.
      const [a, b] = p.at.x < q.at.x || (p.at.x === q.at.x && i < j) ? [p, q] : [q, p];
      const overlap = a.at.x + a.right - (b.at.x - b.left) - APART_ALLOW;
      if (overlap <= 0) continue;
      const amount = overlap * level(a.at.y - b.at.y) * Math.min(a.weight, b.weight);
      if (amount <= 0) continue;
      const mover = a.rank < b.rank ? a : b;
      const sign = mover === a ? -1 : 1;
      out.set(mover.key, (out.get(mover.key) ?? 0) + sign * amount);
    }
  for (const [key, dx] of out) {
    const k = Math.max(-APART_MOST, Math.min(APART_MOST, dx));
    // Whole art pixels: a figure is drawn on the grid.
    out.set(key, Math.round(k));
  }
  return out;
}

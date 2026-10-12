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
 * by little more than half a tile, so a figure is never shown far from where
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
/**
 * The most anyone is shown from their feet, in art pixels: a little over half
 * a tile. 14 since wave 14 (was 12), enough for the giant crab's claws (its
 * drawn front, 41, against the hero's 13 at the 36-pixel stand, less the 4
 * allowed: 14) so they no longer reach over him; the captain, narrowed by the
 * art lane, needs 8.
 */
export const APART_MOST = 14;
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
 * The most anyone in a knot of three or more is shown from their feet (the
 * hero, a deckhand pressed against him and the captain behind), art pixels:
 * a tile, reached as the knot draws tight (`APART_TIGHT`).
 */
export const APART_CHAIN = 24;

/**
 * How far a figure must be sent on to another before their knot counts in
 * full, art pixels: below it the extra room grows with it, so a knot forming
 * never makes anyone jump.
 */
export const APART_TIGHT = 2;

/** How many times a knot is looked at again, each time with everyone where they were last shown. */
export const APART_ROUNDS = 8;

/** How far `a` (on the left) and `b` overlap past what is allowed, weighted; never below 0. */
function overlapOf(a: Figure, ax: number, b: Figure, bx: number): number {
  const overlap = ax + a.right - (bx - b.left) - APART_ALLOW;
  return overlap > 0 ? overlap * level(a.at.y - b.at.y) * Math.min(a.weight, b.weight) : 0;
}

/**
 * How far to the side each figure is drawn from its feet (negative left), by
 * key; anyone not moved is absent. Each pair that overlaps by more than
 * `APART_ALLOW` sends the lower-ranked one away from the other by the
 * overlap (scaled by how level they stand and how much each counts); what
 * one figure is sent by several adds up, to at most `APART_MOST`.
 *
 * Wave 18: three or more in a knot. A figure sent away from one can be sent
 * on to another (a deckhand off the captain's coat, on to the hero). Those
 * the pairs' rule leaves overlapping, three or more joined by overlaps, are
 * a knot: its pairs are looked at again with everyone where they are shown,
 * and the lower-ranked of each pair still overlapping gives way further, to
 * at most `APART_CHAIN`, the extra room growing as the knot draws tight.
 * Two alone are drawn exactly as before, and so is anyone pushed equally
 * both ways. `rounds` 1 is the pairs' rule alone, as it was before wave 18.
 */
export function shownApart(
  figures: readonly Figure[],
  rounds: number = APART_ROUNDS,
): Map<string, number> {
  const n = figures.length;
  const shift = new Array<number>(n).fill(0);
  /** Who was sent anywhere at all (even both ways at once, to nowhere): they are in the answer. */
  const sent = new Array<boolean>(n).fill(false);
  const pairs: [number, number][] = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      const p = figures[i]!;
      const q = figures[j]!;
      if (p.rank === q.rank || p.weight <= 0 || q.weight <= 0) continue;
      // Left and right of each other by their feet; level with each other, by the list's order.
      pairs.push(p.at.x < q.at.x || (p.at.x === q.at.x && i < j) ? [i, j] : [j, i]);
    }
  const at = (k: number): number => figures[k]!.at.x + shift[k]!;
  /** One look: each pair still overlapping sends its lower-ranked one away, by `of` of them. */
  const look = (of: readonly [number, number][]): number[] => {
    const push = new Array<number>(n).fill(0);
    for (const [ia, ib] of of) {
      const amount = overlapOf(figures[ia]!, at(ia), figures[ib]!, at(ib));
      if (amount <= 0) continue;
      const mover = figures[ia]!.rank < figures[ib]!.rank ? ia : ib;
      push[mover]! += (mover === ia ? -1 : 1) * amount;
      sent[mover] = true;
    }
    return push;
  };
  // The pairs' own rule: from where everyone stands.
  const first = look(pairs);
  for (let k = 0; k < n; k++) shift[k] = Math.max(-APART_MOST, Math.min(APART_MOST, first[k]!));

  if (rounds > 1) {
    // The knots: three or more joined by overlaps as shown (or as they stand), and how tight each
    // is, by how far the pairs' rule sent anyone on to another.
    const group = figures.map((_, k) => k);
    const root = (k: number): number => (group[k] === k ? k : (group[k] = root(group[k]!)));
    const tight = new Array<number>(n).fill(0);
    for (const [ia, ib] of pairs) {
      const a = figures[ia]!;
      const b = figures[ib]!;
      const standing = overlapOf(a, a.at.x, b, b.at.x);
      const shown = overlapOf(a, at(ia), b, at(ib));
      if (standing <= 0 && shown <= 0) continue;
      group[root(ia)] = root(ib);
      const onto = Math.max(0, shown - standing);
      tight[ia] = Math.max(tight[ia]!, onto);
      tight[ib] = Math.max(tight[ib]!, onto);
    }
    const size = new Map<number, number>();
    const tightest = new Map<number, number>();
    for (let k = 0; k < n; k++) {
      const r = root(k);
      size.set(r, (size.get(r) ?? 0) + 1);
      tightest.set(r, Math.max(tightest.get(r) ?? 0, tight[k]!));
    }
    const knotted = pairs.filter(([ia]) => (size.get(root(ia)) ?? 0) >= 3);
    const most = (k: number): number =>
      APART_MOST +
      (APART_CHAIN - APART_MOST) * Math.min(1, (tightest.get(root(k)) ?? 0) / APART_TIGHT);
    for (let round = 1; round < rounds && knotted.length; round++) {
      const push = look(knotted);
      let moved = false;
      for (let k = 0; k < n; k++) {
        if (!push[k]) continue;
        // Half the way each look, so a knot settles rather than rocks.
        const next = Math.max(-most(k), Math.min(most(k), shift[k]! + push[k]! / 2));
        if (next !== shift[k]) moved = true;
        shift[k] = next;
      }
      if (!moved) break;
    }
  }
  const out = new Map<string, number>();
  figures.forEach((f, k) => {
    // Whole art pixels: a figure is drawn on the grid.
    if (sent[k]) out.set(f.key, Math.round(shift[k]!));
  });
  return out;
}

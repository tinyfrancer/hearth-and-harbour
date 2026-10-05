/**
 * The town's grounds beyond grass and cobbles, harvested from the approved
 * mock-up's town() (docs/art-reference/town-mockup.html): wild flowers, the
 * sandy road north with its ruts, the cobbled square with its ragged edge,
 * the quay wall and the sea with its foam. Same numbers and the same order
 * of random draws, so painted in the mock-up's order with one seed they give
 * its picture exactly (tests/art/town.test.ts holds them to that).
 *
 * Each paints into a grid the caller owns. Patterns that must line up when a
 * ground is painted in pieces (cobble joints, the sea's swell, the road's
 * bend, shore foam) are worked out from world position; only the wear and
 * flecks are random.
 */
import { rect, set, sprinkle, type Grid } from './grid';
import type { Shade } from './palette';
import { cobbleAt, stone, type Box } from './scenery';

type Rand = () => number;

/** Pairs of flower pixels with a stalk, in white, yellow and red by turns. */
export function wildflowers(g: Grid, rand: Rand, box: Box, n: number): void {
  const colours: readonly Shade[] = ['white1', 'gold1', 'red1'];
  for (let i = 0; i < n; i++) {
    const x = box.x + ((rand() * box.w) | 0);
    const y = box.y + ((rand() * box.h) | 0);
    const c = colours[i % 3] as Shade;
    set(g, x, y, c);
    set(g, x + 1, y, c);
    set(g, x, y + 1, 'pine2');
  }
}

/** Half the width of the road, in art pixels. */
export const ROAD_HALF_WIDTH = 10;

/** Where the road's middle is on row `y`: it bends gently as it runs north. */
export function roadCentre(x: number, y: number): number {
  return x + Math.round(6 * Math.sin(y / 20));
}

/**
 * The sandy road, running north and south between rows `y` and `y + h`
 * around column `x`: rough dark edges, two wheel ruts broken every fourth
 * row, and a scatter of light and dark grit.
 */
export function road(g: Grid, rand: Rand, x: number, y: number, h: number): void {
  for (let row = y; row < y + h; row++) {
    const cx = roadCentre(x, row);
    rect(g, cx - ROAD_HALF_WIDTH, row, 2 * ROAD_HALF_WIDTH, 1, 'sand2');
    set(g, cx - 10, row, 'sand3');
    if (rand() < 0.5) set(g, cx - 11, row, 'sand3');
    set(g, cx + 9, row, 'sand3');
    if (rand() < 0.4) set(g, cx + 10, row, 'sand3');
    if (row % 4) {
      set(g, cx - 4, row, 'sand3');
      set(g, cx + 4, row, 'sand3');
    }
    grit(g, rand, cx - 8, row, 16, 2);
  }
}

/** Up to `tries` grains of light or dark sand somewhere in a run of `w` pixels. */
function grit(g: Grid, rand: Rand, x: number, y: number, w: number, tries: number): void {
  for (let k = 0; k < tries; k++)
    if (rand() < 0.5) set(g, x + ((rand() * w) | 0), y, rand() < 0.5 ? 'sand1' : 'sand3');
}

/**
 * Open sand: the road's own surface and grit, without its edges or ruts, for
 * any patch of sandy ground. The mock-up has no beach; this is its road's sand.
 */
export function sand(g: Grid, rand: Rand, box: Box): void {
  rect(g, box.x, box.y, box.w, box.h, 'sand2');
  const tries = Math.max(1, Math.round(box.w / 8));
  for (let y = box.y; y < box.y + box.h; y++) grit(g, rand, box.x, y, box.w, tries);
}

/** Rows over which the square's top edge tapers into the grass. */
const SQUARE_TAPER = 6;

/**
 * The cobbled square: cobbles whose top edge narrows over a few rows and
 * whose sides wander by a pixel, so the grass meets it raggedly, then a
 * scatter of grime.
 */
export function cobbledSquare(g: Grid, rand: Rand, box: Box): void {
  const right = box.x + box.w;
  for (let y = box.y; y < box.y + box.h; y++) {
    const rag = y < box.y + SQUARE_TAPER ? (box.y + SQUARE_TAPER - y) * 4 : 0;
    // The far end is drawn again on every step, as the mock-up's loop did.
    for (let x = box.x + rag + ((rand() * 2) | 0); x < right - rag - ((rand() * 2) | 0); x++)
      set(g, x, y, cobbleAt(x, y));
  }
  const grime: Box = { x: box.x, y: box.y + SQUARE_TAPER, w: box.w, h: box.h - 8 };
  const n = Math.round((grime.w * grime.h * 160) / (264 * 92));
  sprinkle(g, rand, n, grime, 'cobble2', 'cobble3');
}

/** How tall the quay wall is, from its pale top edge to its ink line on the water. */
export const QUAY_H = 11;

/**
 * The quay's edge along the top of the water: a pale kerb, a course of
 * stone, a dark line and an ink line, with iron mooring rings at `rings`
 * (columns). Its top row is `y`; the water starts at `y + QUAY_H`.
 */
export function quayWall(
  g: Grid,
  rand: Rand,
  x: number,
  y: number,
  w: number,
  rings: readonly number[],
): void {
  rect(g, x, y, w, 2, 'stone1');
  stone(g, rand, x, y + 2, w, 7, 14, 4);
  rect(g, x, y + 9, w, 1, 'stone3');
  rect(g, x, y + 10, w, 1, 'ink1');
  for (const r of rings)
    for (const [a, b] of [
      [0, 0],
      [1, 1],
      [-1, 1],
      [1, 2],
      [-1, 2],
      [0, 3],
    ] as const)
      set(g, r + a, y + 4 + b, 'metal1');
}

/**
 * The sea: shallow and deep water in a swell that deepens away from the
 * shore at row `box.y`, flecked with light crests and foam, and (if `shore`)
 * a broken line of foam where it meets the quay.
 */
export function sea(g: Grid, rand: Rand, box: Box, shore = true): void {
  for (let y = box.y; y < box.y + box.h; y++)
    for (let x = box.x; x < box.x + box.w; x++) {
      const deep = (y - box.y - 41) / 68 + Math.sin(x / 16 + y / 10) * 0.12;
      set(g, x, y, deep > rand() * 0.9 + 0.1 ? 'sea3' : 'sea2');
    }
  const crests = Math.round((230 * box.w * box.h) / (270 * 123));
  for (let i = 0; i < crests; i++) {
    const x = box.x + ((rand() * (box.w - 6)) | 0);
    const y = box.y + 4 + ((rand() * (box.h - 6)) | 0);
    rect(g, x, y, 2 + ((rand() * 6) | 0), 1, rand() < 0.6 ? 'sea1' : 'foam1');
  }
  if (!shore) return;
  for (let x = box.x; x < box.x + box.w; x++)
    if (Math.sin(x * 0.6) + Math.sin(x * 0.21) > 0.2) {
      set(g, x, box.y, 'foam1');
      if (rand() < 0.4) set(g, x, box.y + 1, 'foam1');
    }
}

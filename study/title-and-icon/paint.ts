/**
 * Painting helpers shared by the titles: skies in flat bands whose edges break
 * into sideways clumps (never a smooth gradient, never a Bayer cloth), stars
 * placed sparsely by hash, water in stretched ripple bands, and the broken
 * streak a light leaves on water. All arithmetic on the town's grid.
 */
import { at, hash, put, type TGrid } from '../../src/art/town2/cells';
import { clumps, noise } from '../../src/art/town2/texture';
import { X, type XMat } from './pal';

export type Stop = readonly [XMat, number];

/** Index into `stops` at fraction f, with the band edges broken into sideways clumps. */
function bandAt(stops: readonly Stop[], f: number, x: number, y: number, k: number, stretch: number) {
  const t = Math.max(0, Math.min(stops.length - 1, f * (stops.length - 1)));
  const fl = Math.floor(t);
  const fr = t - fl;
  const thr = 0.5 + (clumps(x / stretch, y, k) - 0.5) * 0.8;
  const i = Math.min(stops.length - 1, fr > thr ? fl + 1 : fl);
  return stops[i]!;
}

/** Fills rows y0..y1 (and only empty cells, if `under`) with banded stops top to bottom. */
export function bands(
  g: TGrid,
  y0: number,
  y1: number,
  stops: readonly Stop[],
  o: { k?: number; stretch?: number; under?: boolean; x0?: number; x1?: number; curve?: (f: number) => number } = {},
): void {
  const k = o.k ?? 1;
  const stretch = o.stretch ?? 4;
  for (let y = y0; y < y1; y++)
    for (let x = o.x0 ?? 0; x < (o.x1 ?? g.w); x++) {
      if (o.under && at(g, x, y)) continue;
      let f = (y - y0) / Math.max(1, y1 - y0 - 1);
      if (o.curve) f = o.curve(f);
      const [m, s] = bandAt(stops, f, x, y, k, stretch);
      put(g, x, y, X(m, s));
    }
}

/** A ramp's steps as stops, from step a to step b. */
export const run = (m: XMat, a: number, b: number): Stop[] => {
  const out: Stop[] = [];
  const d = a <= b ? 1 : -1;
  for (let s = a; d > 0 ? s <= b : s >= b; s += d) out.push([m, s]);
  return out;
};

/**
 * Stars in a box, thinning toward its foot: most single pixels, a few with
 * a four-point cross. `phase` makes a handful twinkle (step changes only).
 */
export function stars(
  g: TGrid,
  x0: number,
  y0: number,
  w: number,
  h: number,
  o: { density?: number; k?: number; phase?: number; avoid?: (x: number, y: number) => boolean } = {},
): void {
  const k = o.k ?? 3;
  const dens = o.density ?? 0.006;
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const fade = 1 - (y - y0) / h;
      const r = hash(x, y, k);
      if (r > dens * fade * fade) continue;
      if (o.avoid?.(x, y)) continue;
      const big = hash(x, y, k + 1) < 0.12;
      const tw = o.phase !== undefined ? Math.floor(hash(x, y, k + 2) * 8 + o.phase) % 8 : 1;
      const dim = tw === 0 ? 2 : 0;
      if (big) {
        put(g, x, y, X('star', 0 + dim / 2));
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ])
          put(g, x + dx!, y + dy!, X('star', 3 + dim / 2));
      } else {
        put(g, x, y, X('star', (hash(x, y, k + 3) < 0.5 ? 1 : 2) + dim));
      }
    }
}

/**
 * Water: bands of `stops` from y0 (far) to y1 (near), the edges broken into
 * long sideways ripples, and a lit lip on some ripples that moves with phase.
 */
export function water(
  g: TGrid,
  y0: number,
  y1: number,
  stops: readonly Stop[],
  o: { k?: number; phase?: number; glint?: Stop; x0?: number; x1?: number } = {},
): void {
  const k = o.k ?? 5;
  const ph = o.phase ?? 0;
  for (let y = y0; y < y1; y++) {
    const f = (y - y0) / Math.max(1, y1 - y0 - 1);
    // Ripples get longer and further apart toward the viewer.
    const stretch = 6 + f * 14;
    for (let x = o.x0 ?? 0; x < (o.x1 ?? g.w); x++) {
      const [m, s] = bandAt(stops, f, x + ph * (2 + f * 4), y, k, stretch);
      put(g, x, y, X(m, s));
    }
  }
  if (o.glint) {
    for (let y = y0 + 2; y < y1; y++) {
      const f = (y - y0) / (y1 - y0);
      const len = Math.round(2 + f * 7);
      for (let x = o.x0 ?? 0; x < (o.x1 ?? g.w); x += 1) {
        const n = noise((x + ph * (3 + f * 6)) / (8 + f * 20), y / (1.2 + f * 2.5), 1, k + 9);
        if (n > 0.86 && hash(Math.floor(x / len), y, k + 11) < 0.35)
          put(g, x, y, X(o.glint[0], o.glint[1]));
      }
    }
  }
}

/**
 * The streak a light leaves on water below it: short dashes that widen and
 * break up with distance from the shore, wobbling with phase.
 */
export function streak(
  g: TGrid,
  cx: number,
  y0: number,
  len: number,
  o: { w?: number; k?: number; phase?: number; mats?: readonly Stop[] } = {},
): void {
  const k = o.k ?? 7;
  const ph = o.phase ?? 0;
  const mats = o.mats ?? [
    ['lamp', 0],
    ['lamp', 1],
    ['glass', 3],
  ];
  for (let j = 0; j < len; j++) {
    const f = j / len;
    if (hash(Math.round(cx), j, k) < f * 0.75) continue;
    const half = Math.round((o.w ?? 2) * (0.6 + f * 1.4) * (0.5 + hash(j, Math.round(cx), k + 1)));
    const wob = Math.round(Math.sin(j * 0.9 + ph * 1.7 + cx) * (0.5 + f * 2.5));
    const m = mats[Math.min(mats.length - 1, Math.floor(f * mats.length + hash(j, 3, k) * 0.8))]!;
    for (let i = -half; i <= half; i++) put(g, cx + wob + i, y0 + j, X(m[0], m[1]));
  }
}

/** Darkens every drawn cell in a box by n steps (a shadow cast across a scene). */
export function shade(g: TGrid, x0: number, y0: number, w: number, h: number, n: number, cap = 6): void {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const c = at(g, x, y);
      if (c) put(g, x, y, (c & ~7) | Math.min(Math.max(cap, c & 7), (c & 7) + n));
    }
}

/** A silhouette ridge: fills below `top(x)` down to y1 with banded stops by depth. */
export function ridge(
  g: TGrid,
  top: (x: number) => number,
  y1: number,
  fill: (x: number, y: number, depth: number) => number,
  x0 = 0,
  x1 = g.w,
): void {
  for (let x = x0; x < x1; x++) {
    const t = Math.round(top(x));
    for (let y = Math.max(0, t); y < y1; y++) put(g, x, y, fill(x, y, y - t));
  }
}

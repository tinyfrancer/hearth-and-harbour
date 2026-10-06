/**
 * Small drawing helpers for the grotto at the C scale: shapes shaded as
 * solids in the town's cells (material and step), lit from the upper left.
 * Pure arithmetic on grids; nothing here touches a canvas.
 */
import { bevel, FLAT_LIGHT, hash, put, type Cell, type TGrid } from '../town2/cells';
import { cell } from './cave';
import type { Mat2 as Mat } from './cave';

export const lim = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, Math.round(v)));

/** Fills every pixel of the box where `f` gives a cell. */
export function paint(
  g: TGrid,
  x0: number,
  y0: number,
  w: number,
  h: number,
  f: (x: number, y: number) => Cell | 0 | null | undefined,
): void {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const c = f(x, y);
      if (c) put(g, x, y, c);
    }
}

/**
 * How lit a point on a solid's surface is, from its outward direction in the
 * picture (nx right, ny down, both -1..1): 1 facing the light (upper left),
 * -1 turned away, about 0.3 facing the viewer.
 */
export function litBy(nx: number, ny: number): number {
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  const L = [-0.55, -0.62, 0.56];
  const n = Math.hypot(L[0]!, L[1]!, L[2]!);
  return (nx * L[0]! + ny * L[1]! + nz * L[2]!) / n;
}

/** A step for a lit amount: `base` at 0.3 (facing the viewer), `k` steps of contrast. */
export const stepFor = (lit: number, base: number, k: number, lo = 1, hi = 5): number =>
  lim(base - (lit - 0.3) * k * 1.6, lo, hi);

/** An ellipse shaded as a dome (a ball, a boss, a head): `base` at its middle. */
export function dome(
  g: TGrid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  mat: Mat,
  base = 3,
  k = 2,
  lo = 1,
  hi = 5,
): void {
  paint(
    g,
    Math.floor(cx - rx),
    Math.floor(cy - ry),
    Math.ceil(rx * 2) + 2,
    Math.ceil(ry * 2) + 2,
    (x, y) => {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny > 1) return 0;
      return cell(mat, stepFor(litBy(nx * 0.95, ny * 0.95), base, k, lo, hi));
    },
  );
}

/** An upright cylinder (a barrel, a post): columns lit across from the left. */
export function cylinder(
  g: TGrid,
  x0: number,
  y0: number,
  w: number,
  h: number,
  mat: Mat,
  base = 3,
  k = 2,
  lo = 1,
  hi = 5,
): void {
  paint(g, x0, y0, w, h, (x) => {
    const nx = ((x + 0.5 - x0) / w) * 2 - 1;
    return cell(mat, stepFor(litBy(nx * 0.97, 0), base, k, lo, hi));
  });
}

/** A straight line of a cell, every pixel. */
export function line(g: TGrid, x0: number, y0: number, x1: number, y1: number, c: Cell): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++)
    put(g, Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
}

/** A thick line (a rod, a haft) lit on its upper-left side: `w` pixels across, steps from lit to shaded. */
export function rod(
  g: TGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  mat: Mat,
  steps: readonly number[],
): void {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  // The side toward the upper left is the lit one.
  let px = -(y1 - y0) / len;
  let py = (x1 - x0) / len;
  if (px + py > 0) {
    px = -px;
    py = -py;
  }
  const n = Math.ceil(len * 2);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const cx = x0 + (x1 - x0) * t;
    const cy = y0 + (y1 - y0) * t;
    for (let j = 0; j < w; j++) {
      const o = j - (w - 1) / 2;
      const s =
        steps[
          Math.min(steps.length - 1, Math.round((j / Math.max(1, w - 1)) * (steps.length - 1)))
        ]!;
      put(g, Math.round(cx - px * o), Math.round(cy - py * o), cell(mat, s));
    }
  }
}

/** Rows of characters at (x, y), each pinned to a material and step; '.' is empty. */
export function sprite(
  g: TGrid,
  x: number,
  y: number,
  rows: readonly string[],
  pins: Readonly<Record<string, readonly [Mat, number]>>,
): void {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]!;
      if (ch === '.' || ch === ' ') continue;
      const pin = pins[ch];
      if (!pin) throw new Error(`Unknown "${ch}" in "${row}"`);
      put(g, x + i, y + j, cell(pin[0], pin[1]));
    }
  });
}

/** A point-in-polygon test at pixel centres (even-odd), for silhouettes given as corners. */
export function poly(
  points: readonly (readonly [number, number])[],
): (x: number, y: number) => boolean {
  return (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i]!;
      const [xj, yj] = points[j]!;
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

/** The polygon moved by (dx, dy). */
export const shifted = (
  points: readonly (readonly [number, number])[],
  dx: number,
  dy: number,
): [number, number][] => points.map(([x, y]) => [x + dx, y + dy]);

/**
 * A silhouette shaded as a solid: every pixel `inside` takes `mat` at a step
 * from how lit its bevel is (rounded edges `radius` deep, lit from the upper
 * left), `base` where it faces the viewer, `contrast` steps either way, then
 * `tex` may move it (fur strokes, scales). The town's `solid`, for the cave's
 * materials too.
 */
export function shaped(
  g: TGrid,
  inside: (x: number, y: number) => boolean,
  mat: Mat,
  o: {
    base: number;
    contrast: number;
    radius: number;
    lo?: number;
    hi?: number;
    tex?: (x: number, y: number, t: number) => number;
  },
): Uint8Array {
  const { w, h } = g;
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x, y)) mask[y * w + x] = 1;
  const lit = bevel(mask, w, h, o.radius);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      let t = o.base + (o.contrast * (FLAT_LIGHT - lit[i]!)) / 0.5;
      if (o.tex) t = o.tex(x, y, t);
      put(g, x, y, cell(mat, lim(t, o.lo ?? 1, o.hi ?? 5)));
    }
  return mask;
}

/**
 * A part laid over another of the same stuff, drawn apart from it: every
 * drawn pixel just outside `inside` (below it, left of it or right of it)
 * goes `n` steps darker, a seam of shadow, so a troll's head reads in front
 * of his shoulders and a boar's cheek in front of his neck.
 */
export function seam(g: TGrid, inside: (x: number, y: number) => boolean, n = 2): void {
  const hit: number[] = [];
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const i = y * g.w + x;
      if (!g.d[i] || inside(x, y)) continue;
      if (inside(x, y - 1) || inside(x - 1, y) || inside(x + 1, y)) hit.push(i);
    }
  for (const i of hit) {
    const c = g.d[i]!;
    g.d[i] = (c & ~7) | Math.min(5, Math.max(c & 7, (c & 7) + n));
  }
}

/**
 * Fur lying back along a body: short strokes a step darker, their lit tips a
 * step lighter, worked out from position so it never swims between frames of
 * the same pose. `along` leans the strokes.
 */
export const furTex =
  (k: number, along = 0.5, dense = 0.2) =>
  (x: number, y: number, t: number): number => {
    const stroke = hash(Math.floor((x + y * along) / 2), y, 7 + k);
    if (stroke < dense) return t + 1;
    if (stroke > 0.92 && t < 3.5) return t - 1;
    return t;
  };

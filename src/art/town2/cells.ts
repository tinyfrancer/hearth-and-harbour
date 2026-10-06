/**
 * The C-scale pixel engine. Taken from the approved scale study
 * (study/scale-detail/engine.ts): a cell is a material and a step (0
 * lightest, 6 the line) packed in one number, rather than a palette name as in
 * src/art/grid.ts, so a shadow can be cast by darkening whatever is
 * underneath, and an outline can take the darkest step of the colour it goes
 * round. Kept from the study: the cells, the primitives, the selective
 * outline and the bevel that lights a flat shape as a solid. Left behind: the
 * figure layers (figures are drawn elsewhere) and its canvas painter (raster.ts
 * here does that, with glows).
 *
 * Everything is pure arithmetic on typed arrays; nothing touches a canvas.
 */
import type { Glow } from '../raster';
import { MATS, type Mat } from './ramps';

const MAT_ID = Object.fromEntries(MATS.map((m, i) => [m, i + 1])) as Record<Mat, number>;

/** 0 is empty; otherwise material id * 8 + step. */
export type Cell = number;
/** The line step: the darkest tone of a material, drawn round it. */
export const LINE = 6;

export const cell = (m: Mat, t: number): Cell =>
  MAT_ID[m] * 8 + Math.max(0, Math.min(LINE, Math.round(t)));
export const matOf = (c: Cell): Mat | null => (c ? (MATS[(c >> 3) - 1] ?? null) : null);
export const stepOf = (c: Cell): number => c & 7;
export const isMat = (c: Cell, m: Mat): boolean => c !== 0 && c >> 3 === MAT_ID[m];

/** The same material `n` steps darker, stopping at `cap` (the line step only if asked). */
export const darker = (c: Cell, n = 1, cap = 5): Cell =>
  c ? (c & ~7) | Math.max(0, Math.min(Math.max(cap, c & 7), (c & 7) + n)) : c;

export interface TGrid {
  readonly w: number;
  readonly h: number;
  /** Row by row, `w * h` cells. Drawing writes into it. */
  readonly d: Int16Array;
}

/** A drawing and the lights in it. */
export interface Picture2 {
  readonly grid: TGrid;
  readonly glows: readonly Glow[];
}

export const tgrid = (w: number, h: number): TGrid => ({ w, h, d: new Int16Array(w * h) });

export function put(g: TGrid, x: number, y: number, c: Cell): void {
  x = Math.round(x);
  y = Math.round(y);
  if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y * g.w + x] = c;
}

export const at = (g: TGrid, x: number, y: number): Cell =>
  x >= 0 && y >= 0 && x < g.w && y < g.h ? (g.d[y * g.w + x] as number) : 0;

export function box(g: TGrid, x: number, y: number, w: number, h: number, c: Cell): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(g, x + i, y + j, c);
}

export function oval(g: TGrid, cx: number, cy: number, rx: number, ry: number, c: Cell): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const a = (x + 0.5 - cx) / rx;
      const b = (y + 0.5 - cy) / ry;
      if (a * a + b * b <= 1) put(g, x, y, c);
    }
}

export function segment(g: TGrid, x0: number, y0: number, x1: number, y1: number, c: Cell) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) put(g, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
}

/** Darkens one pixel in place by `n` steps, if anything is there. */
export function dim(g: TGrid, x: number, y: number, n: number, cap = 5): void {
  const c = at(g, x, y);
  if (c && n > 0) put(g, x, y, darker(c, n, cap));
}

/** Draws `s` onto `g` at (x, y); empty cells let `g` show through. */
export function stamp(g: TGrid, s: TGrid, x: number, y: number): void {
  for (let j = 0; j < s.h; j++) {
    const yy = y + j;
    if (yy < 0 || yy >= g.h) continue;
    for (let i = 0; i < s.w; i++) {
      const c = s.d[j * s.w + i] as number;
      const xx = x + i;
      if (c && xx >= 0 && xx < g.w) g.d[yy * g.w + xx] = c;
    }
  }
}

/** The grid flipped left to right. */
export function mirror(s: TGrid): TGrid {
  const g = tgrid(s.w, s.h);
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) g.d[y * s.w + (s.w - 1 - x)] = s.d[y * s.w + x] as number;
  return g;
}

/** Hashes a position to 0..1, for texture that lines up however it is painted. */
export function hash(x: number, y: number, k = 0): number {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * The selective outline, one pixel bigger on every side: each empty pixel
 * that touches a drawn one along an edge takes that pixel's material at its
 * line step. Where it touches two, the one above or to the left wins, so the
 * shadow side's colour carries round.
 */
export function outlined(s: TGrid): TGrid {
  const g = tgrid(s.w + 2, s.h + 2);
  stamp(g, s, 1, 1);
  const add: number[] = [];
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      if (at(g, x, y)) continue;
      const near = at(g, x - 1, y) || at(g, x, y - 1) || at(g, x + 1, y) || at(g, x, y + 1);
      if (near) add.push(y * g.w + x, (near & ~7) | LINE);
    }
  for (let i = 0; i < add.length; i += 2) g.d[add[i] as number] = add[i + 1] as number;
  return g;
}

/** The light, from the upper left and in front: x, y on the picture, z out of it. */
const LIGHT = (() => {
  const v = [-0.55, -0.72, 0.78];
  const n = Math.hypot(...v);
  return v.map((x) => x / n) as [number, number, number];
})();

/** Chamfer distance from each pixel of `mask` to the nearest pixel outside it. */
function distance(mask: Uint8Array, w: number, h: number): Float32Array {
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 1e6 : 0;
  const get = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]!);
  const D = Math.SQRT2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (mask[i])
        d[i] = Math.min(
          d[i]!,
          get(x - 1, y) + 1,
          get(x, y - 1) + 1,
          get(x - 1, y - 1) + D,
          get(x + 1, y - 1) + D,
        );
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (mask[i])
        d[i] = Math.min(
          d[i]!,
          get(x + 1, y) + 1,
          get(x, y + 1) + 1,
          get(x + 1, y + 1) + D,
          get(x - 1, y + 1) + D,
        );
    }
  return d;
}

/**
 * How lit each pixel of a flat shape is when the shape is a solid with
 * rounded edges `radius` pixels deep: about 0.5 on a face turned to the
 * viewer, more on edges that face the light, less on those turned away.
 * Returns 0 outside the mask. This is how rocks, foliage and the crab are
 * shaded as solids rather than flat fills.
 */
export function bevel(mask: Uint8Array, w: number, h: number, radius: number): Float32Array {
  const d = distance(mask, w, h);
  const out = new Float32Array(w * h);
  const H = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return 0;
    const v = Math.min(d[y * w + x]!, radius);
    return Math.sqrt(Math.max(0, radius * radius - (radius - v) * (radius - v)));
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      const hx = (H(x + 1, y) - H(x - 1, y)) / 2;
      const hy = (H(x, y + 1) - H(x, y - 1)) / 2;
      const n = Math.hypot(hx, hy, 1);
      out[i] = (-hx * LIGHT[0] - hy * LIGHT[1] + LIGHT[2]) / n;
    }
  return out;
}

/** How lit a face turned straight to the viewer is, by `bevel`'s measure. */
export const FLAT_LIGHT = LIGHT[2];

/**
 * Paints a flat shape as a solid: `inside(x, y)` says which pixels of the box
 * at (x0, y0) are in it, and each takes `mat` at a step from how lit its
 * bevel is: `base` facing the viewer, `contrast` steps either way, within
 * `lo`..`hi`. Rocks, foliage, smoke, a crab's shell.
 */
export function solid(
  g: TGrid,
  x0: number,
  y0: number,
  w: number,
  h: number,
  inside: (x: number, y: number) => boolean,
  mat: Mat,
  o: {
    base: number;
    contrast: number;
    radius: number;
    lo?: number;
    hi?: number;
    jitter?: number;
    k?: number;
  },
): Uint8Array {
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x, y)) mask[y * w + x] = 1;
  const lit = bevel(mask, w, h, o.radius);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      let t = o.base + (o.contrast * (FLAT_LIGHT - (lit[i] as number))) / 0.5;
      if (o.jitter) t += (hash(x0 + x, y0 + y, o.k ?? 0) - 0.5) * o.jitter;
      put(g, x0 + x, y0 + y, cell(mat, Math.max(o.lo ?? 1, Math.min(o.hi ?? 5, Math.round(t)))));
    }
  return mask;
}

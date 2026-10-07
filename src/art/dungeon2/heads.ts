/**
 * The tools faces are drawn with at the C scale (B11). Every person's head,
 * hair, beard and clothes is its own shape, placed by hand as a ring of
 * points (`blob`); every eye, brow, nose and mouth is its own rows of
 * characters (`marks`). What these tools do is only the shading a pixel
 * artist would lay on a shape they had drawn: a rounded solid lit from the
 * upper left in clean bands (`form`), a shadow cast down and right by one
 * shape onto another (`cast`), and a stroke along a line (`stroke`). Nothing
 * here decides what a face looks like.
 *
 * B10a's faces were one built head (bust.ts) with features swapped: a tall
 * narrow oval, small evenly spaced features, a column of a neck and beards
 * of stippled noise, which together read as a mannequin. These replace them.
 */
import { bevel, FLAT_LIGHT, put, type TGrid } from '../town2/cells';
import { cell, matOf } from './cave';
import type { Mat2 as Mat } from './cave';
import { lim, litBy, poly, sprite } from './kit';

export type Pt = readonly [number, number];
export type Pts = readonly Pt[];
export type Inside = (x: number, y: number) => boolean;

/**
 * A smooth closed shape through hand-placed points (a Catmull-Rom curve, so
 * a head is round where its points say and nowhere else), as an inside test.
 */
export function blob(pts: Pts): Inside {
  const n = pts.length;
  const dense: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    for (let k = 0; k < 8; k++) {
      const t = k / 8;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return poly(dense);
}

/** Both shapes. */
export const either =
  (...fs: Inside[]): Inside =>
  (x, y) =>
    fs.some((f) => f(x, y));
/** The first shape without the second. */
export const without =
  (a: Inside, b: Inside): Inside =>
  (x, y) =>
    a(x, y) && !b(x, y);

/** The shape's pixels on the bust, as a mask. */
export function maskOf(g: TGrid, inside: Inside): Uint8Array {
  const m = new Uint8Array(g.w * g.h);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (inside(x, y)) m[y * g.w + x] = 1;
  return m;
}

/**
 * A shape painted as a rounded solid: lit as a dome about (cx, cy) with
 * radii (rx, ry) (the broad turn of a head or a shoulder) and rounded at its
 * rim (`rim` pixels deep), in clean bands: `base` where it faces the viewer,
 * `k` steps of contrast. `tex` may move a pixel's step (a hand-placed lock).
 */
export function form(
  g: TGrid,
  inside: Inside,
  mat: Mat,
  o: {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    base?: number;
    k?: number;
    rim?: number;
    rimK?: number;
    lo?: number;
    hi?: number;
    tex?: (x: number, y: number, t: number) => number;
  },
): Uint8Array {
  const mask = maskOf(g, inside);
  const lit = bevel(mask, g.w, g.h, o.rim ?? 3);
  const base = o.base ?? 2.2;
  const k = o.k ?? 1.5;
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const i = y * g.w + x;
      if (!mask[i]) continue;
      const nx = Math.max(-1, Math.min(1, (x + 0.5 - o.cx) / o.rx));
      const ny = Math.max(-1, Math.min(1, (y + 0.5 - o.cy) / o.ry));
      let t = base - (litBy(nx * 0.86, ny * 0.86) - 0.3) * k * 1.6;
      t += ((FLAT_LIGHT - lit[i]!) / 0.5) * (o.rimK ?? 0.9);
      if (o.tex) t = o.tex(x, y, t);
      put(g, x, y, cell(mat, lim(t, o.lo ?? 1, o.hi ?? 5)));
    }
  return mask;
}

/**
 * A shadow cast by `by` onto what is already drawn, `dx`, `dy` down and
 * right of it: those pixels go `n` steps darker, but only where they are
 * one of `on`'s materials (a fringe's shadow falls on the brow, not on the
 * hat), and never inside `by` itself.
 */
export function cast(
  g: TGrid,
  by: Inside,
  o: { dx?: number; dy?: number; n?: number; on?: readonly Mat[]; cap?: number } = {},
): void {
  const dx = o.dx ?? 1;
  const dy = o.dy ?? 1;
  const hit: number[] = [];
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const c = g.d[y * g.w + x]!;
      if (!c || by(x, y)) continue;
      let shaded = false;
      for (let j = 0; j <= dy && !shaded; j++)
        for (let i = 0; i <= dx && !shaded; i++) if ((i || j) && by(x - i, y - j)) shaded = true;
      if (!shaded) continue;
      const m = matOf(c);
      if (o.on && (!m || !o.on.includes(m))) continue;
      hit.push(y * g.w + x);
    }
  for (const i of hit) {
    const c = g.d[i]!;
    g.d[i] = (c & ~7) | Math.min(o.cap ?? 5, (c & 7) + (o.n ?? 1));
  }
}

/** A one-pixel stroke through points (a lock of hair, a crease, a strap's edge). */
export function stroke(g: TGrid, pts: Pts, mat: Mat, step: number): void {
  for (let s = 0; s < pts.length - 1; s++) {
    const [x0, y0] = pts[s]!;
    const [x1, y1] = pts[s + 1]!;
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let i = 0; i <= n; i++)
      put(
        g,
        Math.round(x0 + ((x1 - x0) * i) / n),
        Math.round(y0 + ((y1 - y0) * i) / n),
        cell(mat, step),
      );
  }
}

/** Darkens (or lightens, `n` < 0) what is drawn inside a shape, within steps 0..5. */
export function tone(g: TGrid, inside: Inside, n: number, on?: readonly Mat[]): void {
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const i = y * g.w + x;
      const c = g.d[i]!;
      if (!c || !inside(x, y)) continue;
      const m = matOf(c);
      if (on && (!m || !on.includes(m))) continue;
      g.d[i] = (c & ~7) | Math.max(0, Math.min(5, (c & 7) + n));
    }
}

/**
 * What a face's rows of characters mean, for one person: `0`-`5` their skin
 * at that step, `n`/`b`/`B` the brow (their hair's, unless `brow` says
 * otherwise) lit, mid and dark, `K` the lash line and pupil, `W` the white of the eye, `w`
 * the white in the lid's shade, `C` the catch-light, `I`/`i` the iris lit and
 * dark, `T`/`t` teeth lit and shaded, `D` the mouth's dark, `R` the tongue,
 * `g`/`G` gold; anything else from `extra`.
 */
export function pinsFor(o: {
  skin: Mat;
  hair?: Mat;
  brow?: Mat;
  browShift?: number;
  iris?: readonly [Mat, number, number];
  extra?: Readonly<Record<string, readonly [Mat, number]>>;
}): Record<string, readonly [Mat, number]> {
  const hair = o.hair ?? 'hair';
  const brow = o.brow ?? hair;
  const s = o.browShift ?? 0;
  const iris = o.iris ?? (['eye', 2, 3] as const);
  const p: Record<string, readonly [Mat, number]> = {
    n: [brow, lim(2 + s, 0, 5)],
    b: [brow, lim(3 + s, 1, 5)],
    B: [brow, lim(4 + s, 1, 5)],
    K: ['eye', 4],
    W: ['eye', 1],
    w: ['stone', 1],
    C: ['eye', 0],
    I: [iris[0], iris[1]],
    i: [iris[0], iris[2]],
    T: ['eye', 1],
    t: ['cream', 3],
    D: ['shade', 1],
    R: ['crimson', 3],
    g: ['gold', 2],
    G: ['gold', 4],
  };
  for (let k = 0; k <= 5; k++) p[String(k)] = [o.skin, k];
  return { ...p, ...o.extra };
}

/** Rows of characters at (x, y) in a person's pins: an eye, a brow, a mouth, a lock. */
export function marks(
  g: TGrid,
  x: number,
  y: number,
  rows: readonly string[],
  pins: Readonly<Record<string, readonly [Mat, number]>>,
): void {
  sprite(g, x, y, rows, pins);
}

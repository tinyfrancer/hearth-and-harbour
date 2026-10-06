/**
 * Art study (not shipped), round two: sprites whose every pixel is placed by
 * hand. A character names a material and a step outright, so nothing is
 * shaded automatically: faces, folds and hems are where they were drawn. The
 * only automatic parts are a one-step contact shadow where a layer in front
 * overlaps one behind, and the coloured outline (engine.ts `selOut`).
 */
import { cell, darker, matOf, stamp, tgrid, type Cell, type TGrid } from './engine';
import type { Mat } from './ramps';

export type Pins = Readonly<Record<string, readonly [Mat, number]>>;

export interface HLayer {
  readonly at: readonly [number, number];
  readonly depth: number;
  readonly rows: readonly string[];
  /** Whether this layer darkens what it overlaps by a step just below and right. Default true. */
  readonly cast?: boolean;
}

/** Rows of characters to a grid, each character pinned to one material and step. */
export function sprite(rows: readonly string[], pins: Pins): TGrid {
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const g = tgrid(w, rows.length);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      const p = pins[ch];
      if (!p) throw new Error(`Unknown "${ch}" at ${x},${y} in "${row}"`);
      g.d[y * w + x] = cell(p[0], p[1]);
    }),
  );
  return g;
}

/**
 * Layers stacked back to front onto `base` (or an empty grid), without the
 * outline. A pixel just right of or below something in front of it goes a
 * step darker: where a sleeve lies over a skirt, the skirt shows it.
 */
export function compose(
  w: number,
  h: number,
  layers: readonly HLayer[],
  pins: Pins,
  base?: TGrid,
): TGrid {
  const g = tgrid(w, h);
  const depthAt = new Int16Array(w * h).fill(-999);
  const casts = new Uint8Array(w * h);
  if (base) stamp(g, base, 0, 0);
  const sorted = [...layers].sort((a, b) => a.depth - b.depth);
  for (const l of sorted) {
    const s = sprite(l.rows, pins);
    for (let j = 0; j < s.h; j++)
      for (let i = 0; i < s.w; i++) {
        const c = s.d[j * s.w + i]!;
        const x = l.at[0] + i;
        const y = l.at[1] + j;
        if (!c || x < 0 || y < 0 || x >= w || y >= h) continue;
        g.d[y * w + x] = c;
        depthAt[y * w + x] = l.depth;
        casts[y * w + x] = l.cast === false ? 0 : 1;
      }
  }
  const out = g.d.slice();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const c = g.d[i]!;
      if (!c || depthAt[i] === -999 || matOf(c) === 'eye') continue;
      const front = (xx: number, yy: number) => {
        if (xx < 0 || yy < 0) return false;
        const j = yy * w + xx;
        return g.d[j] !== 0 && casts[j] === 1 && depthAt[j]! > depthAt[i]!;
      };
      if (front(x - 1, y) || front(x, y - 1)) out[i] = darker(c, 1);
    }
  g.d.set(out);
  return g;
}

/** One row of a placed layer: its y, then runs of pixels each starting at an x. */
export type Line = readonly [number, ...(readonly [number, string])[]];

/**
 * A layer from runs of pixels placed by column number, so a body drawn on a
 * wide canvas need not be padded out with dots by hand.
 */
export function placed(depth: number, lines: readonly Line[], cast = true): HLayer {
  const ys = lines.map((l) => l[0]);
  const runs = lines.flatMap((l) => l.slice(1) as (readonly [number, string])[]);
  const x0 = Math.min(...runs.map((r) => r[0]));
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const rows: string[][] = Array.from({ length: y1 - y0 + 1 }, () => []);
  for (const [y, ...rs] of lines)
    for (const [x, s] of rs as (readonly [number, string])[]) {
      const row = rows[y - y0]!;
      for (let i = 0; i < s.length; i++) {
        while (row.length < x - x0 + i) row.push('.');
        row[x - x0 + i] = s[i]!;
      }
    }
  return { at: [x0, y0], depth, rows: rows.map((r) => r.join('')), cast };
}

/** A grid grown by `top` empty rows above, so a taller head fits. */
export function padTop(g: TGrid, top: number): TGrid {
  const o = tgrid(g.w, g.h + top);
  stamp(o, g, 0, top);
  return o;
}

/** Copies a grid. */
export const clone = (g: TGrid): TGrid => ({ w: g.w, h: g.h, d: g.d.slice() });

export type { Cell };

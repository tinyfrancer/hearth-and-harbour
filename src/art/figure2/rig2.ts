/**
 * The walking figure seen from the side (B10b): a skeleton posed per frame,
 * limbs drawn along it, and the parts that do not bend (head, torso, boots,
 * hands, what is held) drawn by hand and carried on it.
 *
 * B9 walked across by shearing the front figure's rows. That keeps every lit
 * edge but cannot turn a body: the torso faced the camera while the legs
 * strode sideways, a bent leg was a row shifted, and a foot was a front boot
 * stretched. Here a leg is two bones (hip to knee to ankle, the knee found
 * from where the foot must be), and each bone is drawn as a limb of its own
 * width, lit from the upper left across its round, so a bent knee is a real
 * bend and the lit edge runs unbroken down the whole leg. Whatever covers a
 * limb (a trouser, a boot's shaft, a sleeve, a vambrace) is a stretch of it,
 * measured in pixels from the joint it hangs from, so a garment drawn for one
 * pose fits every pose.
 *
 * This file is the engine: points, limbs, the stack and the outline. The
 * figure and its gear are in side.ts.
 */
import { cell, darker, isMat, tgrid, type Cell, type TGrid } from '../town2/cells';
import type { Mat } from '../town2/ramps';
import { FIG_H, FIG_W } from './body';
import { outlineIn, pixels, type Part2 } from './engine';

export type Pt = readonly [x: number, y: number];

/** A pixel on its way to the canvas, with what it is for the cast shadow and the tests. */
export interface Dot {
  readonly x: number;
  readonly y: number;
  readonly c: Cell;
  readonly depth: number;
  readonly cast: boolean;
  readonly shaded: boolean;
  /** What drew it: `fist`, `grip`, `held`, `shield`, `body`, ... */
  readonly tag: string;
}

/** Everything drawn for one frame, back to front once stacked. */
export class Sheet {
  readonly dots: Dot[] = [];
  add(x: number, y: number, c: Cell, depth: number, tag = 'body', cast = true, shaded = true) {
    if (!c) return;
    this.dots.push({ x: Math.round(x), y: Math.round(y), c, depth, cast, shaded, tag });
  }
  /** A drawn part, moved by (dx, dy), at its own depth or `depth`. */
  part(p: Part2, dx = 0, dy = 0, o: { depth?: number; tag?: string; darken?: number } = {}) {
    const d = o.depth ?? p.depth;
    for (const [x, y, c] of pixels(p))
      this.add(
        x + dx,
        y + dy,
        o.darken ? darker(c, o.darken) : c,
        d,
        o.tag ?? 'body',
        p.cast !== false,
        p.shaded !== false,
      );
  }
}

/** What a frame's pixels came from, for the tests: the grid, and for each cell the tag that won it. */
export interface Stacked {
  readonly grid: TGrid;
  readonly tags: readonly (string | null)[];
}

/**
 * The sheet stacked (stable by depth), the one-step cast shadow as in
 * `stack` (engine.ts), then outlined inside the canvas.
 */
export function stackSheet(sheet: Sheet, w = FIG_W, h = FIG_H): Stacked {
  const order = sheet.dots
    .map((d, i) => ({ d, i }))
    .sort((a, b) => a.d.depth - b.d.depth || a.i - b.i);
  const g = tgrid(w, h);
  const depthAt = new Float32Array(w * h).fill(-1e9);
  const casts = new Uint8Array(w * h);
  const shaded = new Uint8Array(w * h);
  const tags: (string | null)[] = Array(w * h).fill(null);
  for (const { d } of order) {
    if (d.x < 0 || d.y < 0 || d.x >= w || d.y >= h) continue;
    const i = d.y * w + d.x;
    g.d[i] = d.c;
    depthAt[i] = d.depth;
    casts[i] = d.cast ? 1 : 0;
    shaded[i] = d.shaded ? 1 : 0;
    tags[i] = d.tag;
  }
  const out = g.d.slice();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const c = g.d[i]!;
      if (!c || isMat(c, 'eye') || !shaded[i]) continue;
      const front = (j: number) =>
        g.d[j] !== 0 && casts[j] === 1 && depthAt[j]! > depthAt[i]! + 0.01;
      if ((x > 0 && front(i - 1)) || (y > 0 && front(i - w))) out[i] = darker(c, 1);
    }
  g.d.set(out);
  return { grid: outlineIn(g), tags };
}

// ------------------------------------------------------------------ bones

/**
 * The knee (or elbow) between `a` and `c` for bones of lengths `l1` and `l2`,
 * bending toward `side` (+1: the joint lies to the right of the line from a to
 * c, as a knee does walking right). Out of reach, the limb is straight.
 */
export function joint(a: Pt, c: Pt, l1: number, l2: number, side: 1 | -1): Pt {
  const dx = c[0] - a[0];
  const dy = c[1] - a[1];
  const d = Math.hypot(dx, dy);
  if (d >= l1 + l2 - 1e-6 || d < 1e-6)
    return [a[0] + (dx * l1) / (l1 + l2), a[1] + (dy * l1) / (l1 + l2)];
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const px = a[0] + (dx * along) / d;
  const py = a[1] + (dy * along) / d;
  // Perpendicular to the line; its x sign picks the side.
  let nx = -dy / d;
  let ny = dx / d;
  if (Math.sign(nx) !== side && nx !== 0) {
    nx = -nx;
    ny = -ny;
  }
  return [px + nx * h, py + ny * h];
}

/** A point `len` along a bone at `angle` from straight down, + toward the walk. */
export const along = (from: Pt, angle: number, len: number): Pt => [
  from[0] + Math.sin(angle) * len,
  from[1] + Math.cos(angle) * len,
];

// ------------------------------------------------------------------ limbs

/** How a stretch of a limb is drawn: a material, its steps, and what marks it. */
export interface Cover {
  readonly mat: Mat;
  /** From and to, in pixels along the limb from its root (the hip, the shoulder). */
  readonly from: number;
  readonly to: number;
  /** Steps of the lit edge, the field, the shadow side and the far edge. Default 1, 2, 3, 4. */
  readonly steps?: readonly [number, number, number, number];
  /** A row a step darker where it ends (a hem, a cuff's edge); `lip` a row a step lighter where it starts (a turned-down boot top). */
  readonly hem?: boolean;
  readonly lip?: boolean;
  /** A pattern over the shading: mail's rings, laced cord, a plate's polish. */
  readonly pattern?: 'mail' | 'lace' | 'plate' | 'rings';
  /** Pins for a pattern: the cord's material for lacing. */
  readonly cord?: Mat;
  /** Wider (+) or narrower than the bare limb, in pixels. */
  readonly bulk?: number;
}

/** A limb: points from its root, the bare width at each, and what covers it. */
export interface Limb {
  readonly pts: readonly Pt[];
  readonly widths: readonly number[];
  /** Bare skin underneath, or the cloth nearest it. */
  readonly base: Cover;
  readonly covers: readonly Cover[];
  /** Steps darker for the far side of the body. */
  readonly far?: number;
}

/** Where the light comes from: the upper left, a little in front. */
const LIGHT: Pt = [-0.78, -0.62];

/** Where along a limb a point lies, in pixels from its root, how far across it, and the bone's own lit side. */
function nearest(limb: Limb, x: number, y: number, bulk: (s: number) => number) {
  let best: { s: number; r: number; lit: number } | null = null;
  let start = 0;
  for (let i = 0; i + 1 < limb.pts.length; i++) {
    const a = limb.pts[i]!;
    const b = limb.pts[i + 1]!;
    const vx = b[0] - a[0];
    const vy = b[1] - a[1];
    const len = Math.hypot(vx, vy) || 1;
    let t = ((x - a[0]) * vx + (y - a[1]) * vy) / (len * len);
    t = Math.max(0, Math.min(1, t));
    const cx = a[0] + vx * t;
    const cy = a[1] + vy * t;
    const s = start + t * len;
    const w = limb.widths[i]! + (limb.widths[i + 1]! - limb.widths[i]!) * t + bulk(s);
    const half = (w - 1) / 2 + 0.02;
    const d = Math.hypot(x - cx, y - cy);
    const r = half <= 0 ? (d < 0.3 ? 0 : 9) : d / Math.max(half, 0.5);
    if (r <= 1 && (!best || r < best.r)) {
      // Lit by how the surface under this pixel faces the light: across the bone, not along it.
      const nx = -vy / len;
      const ny = vx / len;
      const side = (x - cx) * nx + (y - cy) * ny;
      const facing = Math.sign(side) * (nx * LIGHT[0] + ny * LIGHT[1]);
      best = { s, r, lit: half > 0.6 ? facing * Math.min(1, Math.abs(side) / half) : 0 };
    }
    start += len;
  }
  return best;
}

/** The cover over a point `s` pixels along, the last listed winning. */
const coverAt = (limb: Limb, s: number): Cover => {
  let c = limb.base;
  for (const k of limb.covers) if (s >= k.from && s < k.to) c = k;
  return c;
};

/**
 * A limb drawn into the sheet: every pixel within its width of the bones,
 * lit by where it sits across the round of the limb, the cover there giving
 * the material and steps, a hem a step darker, the far side darker again.
 */
export function drawLimb(sheet: Sheet, limb: Limb, depth: number, tag = 'body'): void {
  const xs = limb.pts.map((p) => p[0]);
  const ys = limb.pts.map((p) => p[1]);
  const pad = Math.max(...limb.widths) + 3;
  const x0 = Math.floor(Math.min(...xs) - pad);
  const x1 = Math.ceil(Math.max(...xs) + pad);
  const y0 = Math.floor(Math.min(...ys) - pad);
  const y1 = Math.ceil(Math.max(...ys) + pad);
  const bulk = (s: number) => coverAt(limb, s).bulk ?? 0;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const n = nearest(limb, x, y, bulk);
      if (!n) continue;
      const k = coverAt(limb, n.s);
      const [lit, field, shadow, edge] = k.steps ?? [1, 2, 3, 4];
      let step = n.lit > 0.45 ? lit : n.lit > -0.25 ? field : n.lit > -0.75 ? shadow : edge;
      if (n.r > 0.92 && n.lit < 0) step = edge;
      if (k.hem && n.s >= k.to - 1) step += 1;
      if (k.lip && n.s < k.from + 1) step = Math.max(0, step - 1);
      let mat = k.mat;
      if (k.pattern === 'mail' || k.pattern === 'rings') {
        const ring = (x + (y >> 1)) % 2 === 0;
        step += (ring ? 0 : 1) + (y % 2 === 1 ? 0 : 0) - (ring && y % 2 === 0 && n.lit > 0 ? 1 : 0);
      } else if (k.pattern === 'lace' && k.cord) {
        const cx = Math.round(n.s) % 3;
        if (cx === 1 && Math.abs(n.lit) < 0.5) {
          mat = k.cord;
          step = 1;
        }
      } else if (k.pattern === 'plate') {
        if (n.lit > 0.75 && n.r > 0.3) step = 0;
      }
      step += limb.far ?? 0;
      sheet.add(x, y, cell(mat, Math.max(0, Math.min(5, step))), depth, tag);
    }
}

/** A drawn sprite placed so its point `anchor` (in its own rows) lands on `at`. */
export function placed(
  sheet: Sheet,
  rows: readonly string[],
  anchor: Pt,
  at: Pt,
  o: {
    mat: Mat;
    pins?: Readonly<Record<string, readonly [Mat, number]>>;
    depth: number;
    tag?: string;
    darken?: number;
    cast?: boolean;
    shaded?: boolean;
  },
): void {
  const ox = Math.round(at[0] - anchor[0]);
  const oy = Math.round(at[1] - anchor[1]);
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]!;
      if (ch === '.' || ch === ' ') continue;
      let c: Cell;
      if (ch >= '0' && ch <= '6') c = cell(o.mat, Number(ch));
      else {
        const pin = o.pins?.[ch];
        if (!pin) throw new Error(`Unknown "${ch}" in "${row}"`);
        c = cell(pin[0], pin[1]);
      }
      if (o.darken) c = darker(c, o.darken);
      sheet.add(ox + i, oy + j, c, o.depth, o.tag ?? 'body', o.cast !== false, o.shaded !== false);
    }
  });
}

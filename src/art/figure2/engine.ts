/**
 * People at the C scale: parts drawn pixel by pixel, stacked by depth. Built
 * beside the current figures (../figure.ts) and on the C-scale town's cells
 * (../town2/cells.ts), so a figure can stand in the town's own picture.
 *
 * A part is rows of characters. Every character is pinned to a material and
 * a step: digits 0 to 6 are steps of the part's own material, letters come
 * from the shared legend (legend.ts) or the part's own pins. Nothing is lit
 * automatically: light, folds, rivets and faces are where they were drawn.
 * The only automatic touches are a one-step cast shadow where a part lies over
 * one behind it (just below and to the right of its edge, the way the light
 * falls) and the outline, which goes round the dressed figure in each
 * material's own darkest step (`outlined` in town2/cells.ts, here kept inside
 * the canvas).
 *
 * Studied in study/scale-detail (hand.ts, heads.ts, villagers.ts); taken from
 * it: pinned characters, the cast step and the selective outline. Left
 * behind: its automatic bevel for cloth and plate, which the owner asked to
 * be replaced by hand-placed pixels.
 */
import {
  LINE,
  at,
  cell,
  darker,
  isMat,
  matOf,
  stepOf,
  tgrid,
  type Cell,
  type TGrid,
} from '../town2/cells';
import type { Mat } from '../town2/ramps';
import { LEGEND2 } from './legend';

/** A character pinned to a material and a step. */
export type Pin = readonly [Mat, number];
export type Pins = Readonly<Record<string, Pin>>;

/** Part of a figure: rows of characters placed at `at`, at a depth (higher is nearer). */
export interface Part2 {
  readonly at: readonly [x: number, y: number];
  readonly depth: number;
  readonly rows: readonly string[];
  /** The material digits 0-6 are steps of. */
  readonly mat?: Mat;
  /** Characters of this part's own, over the shared legend. */
  readonly pins?: Pins;
  /** Whether it darkens what it lies over, just below and right of its edge. Default true. */
  readonly cast?: boolean;
  /** Whether it takes the shadow of what lies over it. Default true; a fist does not, so it always shows whole. */
  readonly shaded?: boolean;
  /**
   * What it moves with when the figure walks or breathes (walk.ts). Left out,
   * it is worked out from the slot it is worn in and where it lies.
   */
  readonly bone?: Bone;
}

/**
 * What a part moves with in a walk (walk.ts): the head; the body (rigid with
 * the hips); `trunk`, the body above the hips and the legs below; `legs`,
 * split between the near and far leg at the crotch; `skirt`, the body above
 * the hips and swaying below; the cloak; an arm (`near`, `far`), bent by its
 * joints; and what an arm's hand holds (`nearHeld`, `farHeld`), carried
 * rigidly with the wrist so the hand rule holds in every frame.
 */
export type Bone =
  'head' | 'body' | 'trunk' | 'legs' | 'skirt' | 'cloak' | 'near' | 'nearHeld' | 'far' | 'farHeld';

/** A posed body. */
export interface Body2 {
  readonly id: string;
  readonly parts: readonly Part2[];
}

/** One piece of gear (or a hairstyle): parts worn in one slot. */
export interface Gear2 {
  readonly id: string;
  readonly slot: string;
  readonly parts: readonly Part2[];
}

/** One pixel of a part: where it lands and what it is. */
export type Px = readonly [x: number, y: number, c: Cell];

const parsed = new WeakMap<Part2, Px[]>();

/** The pixels of a part in canvas coordinates. Unknown characters throw, naming the row. */
export function pixels(part: Part2): readonly Px[] {
  let out = parsed.get(part);
  if (out) return out;
  out = [];
  part.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]!;
      if (ch === '.' || ch === ' ') continue;
      let c: Cell;
      if (ch >= '0' && ch <= '6' && part.mat) c = cell(part.mat, Number(ch));
      else {
        const pin = part.pins?.[ch] ?? LEGEND2[ch];
        if (!pin) throw new Error(`Unknown "${ch}" at ${i},${j} in "${row}"`);
        c = cell(pin[0], pin[1]);
      }
      out.push([part.at[0] + i, part.at[1] + j, c]);
    }
  });
  parsed.set(part, out);
  return out;
}

/**
 * Parts stacked back to front on a `w` x `h` canvas (stable: parts at one
 * depth keep their order), then the cast step: a pixel with a nearer, casting
 * pixel just left of it or just above it goes one step darker. Eyes never
 * darken, so a fringe cannot dull a look.
 */
export function stack(parts: readonly Part2[], w: number, h: number): TGrid {
  const g = tgrid(w, h);
  const depthAt = new Float32Array(w * h).fill(-1e9);
  const casts = new Uint8Array(w * h);
  const shaded = new Uint8Array(w * h);
  const sorted = parts.map((p, i) => ({ p, i })).sort((a, b) => a.p.depth - b.p.depth || a.i - b.i);
  for (const { p } of sorted)
    for (const [x, y, c] of pixels(p)) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = y * w + x;
      g.d[i] = c;
      depthAt[i] = p.depth;
      casts[i] = p.cast === false ? 0 : 1;
      shaded[i] = p.shaded === false ? 0 : 1;
    }
  const out = g.d.slice();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const c = g.d[i]!;
      if (!c || isMat(c, 'eye') || !shaded[i]) continue;
      const front = (j: number) => g.d[j] !== 0 && casts[j] === 1 && depthAt[j]! > depthAt[i]!;
      if ((x > 0 && front(i - 1)) || (y > 0 && front(i - w))) out[i] = darker(c, 1);
    }
  g.d.set(out);
  return g;
}

/**
 * The outline, drawn inside the canvas: every empty pixel touching a drawn
 * one along an edge takes that pixel's material at its line step, the one
 * above or to the left winning where two touch (so the shadow side's colour
 * carries round), as `outlined` does for the town. Figures keep a pixel of
 * margin so the line always fits.
 */
export function outlineIn(s: TGrid): TGrid {
  const g: TGrid = { w: s.w, h: s.h, d: s.d.slice() };
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      if (at(s, x, y)) continue;
      const near = at(s, x - 1, y) || at(s, x, y - 1) || at(s, x + 1, y) || at(s, x, y + 1);
      if (near) g.d[y * g.w + x] = (near & ~7) | LINE;
    }
  return g;
}

/** A grid with every cell passed through `to` (a look's skin and hair, a wood for a bow). */
export function recolour(g: TGrid, to: (c: Cell) => Cell): TGrid {
  return { w: g.w, h: g.h, d: g.d.map((c) => (c ? to(c) : 0)) };
}

/** Swaps whole materials, keeping each cell's step. */
export function swapMats(swap: Partial<Record<Mat, Mat>>): (c: Cell) => Cell {
  return (c) => {
    const m = matOf(c);
    const to = m && swap[m];
    return to ? cell(to, stepOf(c)) : c;
  };
}

/** A part with every material swapped (one drawing in three woods). */
export function partIn(part: Part2, swap: Partial<Record<Mat, Mat>>): Part2 {
  const to = (pin: Pin): Pin => [swap[pin[0]] ?? pin[0], pin[1]];
  const pins: Record<string, Pin> = {};
  for (const ch of new Set(part.rows.join(''))) {
    if (ch === '.' || ch === ' ' || (ch >= '0' && ch <= '6' && part.mat)) continue;
    const pin = part.pins?.[ch] ?? LEGEND2[ch];
    if (pin) pins[ch] = to(pin);
  }
  return { ...part, mat: part.mat && (swap[part.mat] ?? part.mat), pins };
}

/** A part that moves with `bone` when the figure walks. */
export const on = (bone: Bone, part: Part2): Part2 => ({ ...part, bone });

/** A part moved by (dx, dy). */
export const moved = (part: Part2, dx: number, dy: number): Part2 => ({
  ...part,
  at: [part.at[0] + dx, part.at[1] + dy],
});

/** Rows placed by runs: `[y, [x, 'run'], [x, 'run'], ...]`, so a wide part need not be padded by hand. */
export type Line = readonly [number, ...(readonly [number, string])[]];

export function runs(
  depth: number,
  lines: readonly Line[],
  o: { mat?: Mat; pins?: Pins; cast?: boolean } = {},
): Part2 {
  const ys = lines.map((l) => l[0]);
  const all = lines.flatMap((l) => l.slice(1) as (readonly [number, string])[]);
  const x0 = Math.min(...all.map((r) => r[0]));
  const y0 = Math.min(...ys);
  const rows: string[][] = Array.from({ length: Math.max(...ys) - y0 + 1 }, () => []);
  for (const [y, ...rs] of lines)
    for (const [x, s] of rs as (readonly [number, string])[]) {
      const row = rows[y - y0]!;
      for (let i = 0; i < s.length; i++) {
        while (row.length < x - x0 + i) row.push('.');
        row[x - x0 + i] = s[i]!;
      }
    }
  return { at: [x0, y0], depth, rows: rows.map((r) => r.join('')), ...o };
}

/** A row of a cloth shape: its y and its first and last columns. */
export type Extent = readonly [y: number, x0: number, x1: number];

/** How a piece of cloth is lit and folded before it is corrected by hand. */
export interface ClothLook {
  /** Step of the lit edge, the field, the shadow third and the far edge. Default 1, 2, 3, 4. */
  readonly steps?: readonly [lit: number, field: number, shadow: number, edge: number];
  /** Where the shadow third starts, 0 to 1 across the row. Default 0.62. */
  readonly turn?: number;
  /** Fold lines: each a list of [y, x] pixels a step darker, with a lit lip just left of each. */
  readonly folds?: readonly (readonly (readonly [number, number])[])[];
  /** Rows drawn a step darker all across (a hem, the shadow under a collar). */
  readonly hems?: readonly number[];
  /** Hand corrections, last: [x, y, step], or [x, y, -1] to leave a pixel out. */
  readonly fix?: readonly (readonly [number, number, number])[];
}

/**
 * Cloth: the one place shading is assisted. A shape given row by row is lit
 * from the left (a lit edge, the field, a shadow third, a dark far edge),
 * folds are laid where they are drawn (a darker line with a lit lip), and
 * then every pixel the rule got wrong is set by hand in `fix`. Faces, hands
 * and armour never use this.
 */
export function cloth(
  depth: number,
  mat: Mat,
  extents: readonly Extent[],
  look: ClothLook = {},
  cast = true,
): Part2 {
  const [lit, field, shadow, edge] = look.steps ?? [1, 2, 3, 4];
  const turn = look.turn ?? 0.62;
  const px = new Map<string, number>();
  const k = (x: number, y: number) => `${x},${y}`;
  for (const [y, x0, x1] of extents)
    for (let x = x0; x <= x1; x++) {
      const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      let s = x === x0 ? lit : x === x1 ? edge : t < turn ? field : t < 0.9 ? shadow : edge;
      if (look.hems?.includes(y)) s += 1;
      px.set(k(x, y), s);
    }
  for (const keys of look.folds ?? []) {
    // A fold is given by its key points and runs unbroken between them.
    const fold: [number, number][] = [];
    keys.forEach(([y, x], i) => {
      const next = keys[i + 1];
      if (!next || next[0] <= y) return void fold.push([y, x]);
      for (let yy = y; yy < next[0]; yy++)
        fold.push([yy, Math.round(x + ((next[1] - x) * (yy - y)) / (next[0] - y))]);
    });
    for (const [y, x] of fold) {
      const here = px.get(k(x, y));
      if (here === undefined) continue;
      px.set(k(x, y), Math.min(5, here + 1));
      const left = px.get(k(x - 1, y));
      if (left !== undefined && !fold.some(([fy, fx]) => fy === y && fx === x - 1))
        px.set(k(x - 1, y), Math.max(0, left - 1));
    }
  }
  for (const [x, y, s] of look.fix ?? []) {
    if (s < 0) px.delete(k(x, y));
    else px.set(k(x, y), s);
  }
  const lines = new Map<number, [number, string][]>();
  for (const [key, s] of px) {
    const [x, y] = key.split(',').map(Number) as [number, number];
    if (!lines.has(y)) lines.set(y, []);
    lines.get(y)!.push([x, String(s)]);
  }
  return runs(
    depth,
    [...lines].map(([y, rs]): Line => [y, ...rs]),
    { mat, cast },
  );
}

/** The same run on every row from `a` to `b`. */
export const span = (a: number, b: number, ...rs: (readonly [number, string])[]): Line[] =>
  Array.from({ length: b - a + 1 }, (_, i): Line => [a + i, ...rs]);

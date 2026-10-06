/**
 * Art study (not shipped): a small pixel engine like src/art/grid.ts, but a
 * cell is a material and a step (0 lightest .. 6 line) rather than a palette
 * name, so shadows can be cast by darkening whatever is underneath.
 *
 * Figures are drawn as rows of characters, in layers at depths, as in
 * src/art/figure.ts. What differs is light: each layer is shaded from its own
 * shape (a bevel worked out from how far each pixel is from the layer's edge,
 * lit from the upper left), then layers in front cast a shadow on the ones
 * behind, and the outline takes the darkest step of the colour it surrounds
 * instead of one ink. Hand-placed characters can push a pixel lighter or
 * darker, or pin it to a step, so folds, seams and faces stay hand-drawn.
 */
import { COLOURS, LOOKS, MATS, type Mat } from './ramps';

const MAT_ID: Record<Mat, number> = Object.fromEntries(MATS.map((m, i) => [m, i + 1])) as Record<
  Mat,
  number
>;

/** A cell: 0 is empty, otherwise material id * 8 + step. */
export type Cell = number;
export const cell = (m: Mat, t: number): Cell =>
  MAT_ID[m] * 8 + Math.max(0, Math.min(6, Math.round(t)));
export const matOf = (c: Cell): Mat => MATS[(c >> 3) - 1] as Mat;
export const stepOf = (c: Cell): number => c & 7;
/** The same material `n` steps darker (never into the line step unless asked). */
export const darker = (c: Cell, n = 1, cap = 5): Cell =>
  c ? (c & ~7) | Math.max(0, Math.min(Math.max(cap, c & 7), (c & 7) + n)) : c;

export interface TGrid {
  readonly w: number;
  readonly h: number;
  readonly d: Int16Array;
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

/** Darkens what is already there inside a shape: a shadow falling on it. */
export function shadeWhere(
  g: TGrid,
  inside: (x: number, y: number) => boolean,
  n: number,
  bx = 0,
  by = 0,
  bw = g.w,
  bh = g.h,
): void {
  for (let y = Math.max(0, by); y < Math.min(g.h, by + bh); y++)
    for (let x = Math.max(0, bx); x < Math.min(g.w, bx + bw); x++)
      if (inside(x, y)) {
        const i = y * g.w + x;
        g.d[i] = darker(g.d[i] as number, n);
      }
}

/** Draws `s` onto `g` at (x, y); empty cells let `g` show through. */
export function stamp(g: TGrid, s: TGrid, x: number, y: number): void {
  for (let j = 0; j < s.h; j++)
    for (let i = 0; i < s.w; i++) {
      const c = s.d[j * s.w + i] as number;
      if (c) put(g, x + i, y + j, c);
    }
}

export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Hashes a position to 0..1, for texture that lines up however it is painted. */
export function hash(x: number, y: number, k = 0): number {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The same picture with some materials swapped for others of the same shape (a skin tone). */
export function recolour(g: TGrid, swap: Partial<Record<Mat, Mat>>): TGrid {
  const d = g.d.map((c) => {
    if (!c) return c;
    const to = swap[matOf(c)];
    return to ? cell(to, stepOf(c)) : c;
  });
  return { w: g.w, h: g.h, d };
}

// ---------------------------------------------------------------- figures

/** What one character in a figure's rows means. */
export interface Spec {
  readonly m: Mat;
  /** Shape group: pixels in one group are shaded as one surface. Defaults to the material. */
  readonly g?: string;
  /** Steps lighter (negative) or darker (positive) than the light gives. */
  readonly o?: number;
  /** Pinned to this step whatever the light. */
  readonly t?: number;
}
export type Legend = Readonly<Record<string, Spec>>;

export interface Layer {
  readonly at: readonly [number, number];
  readonly depth: number;
  readonly rows: readonly string[];
  /** Bevel radius per shape group, where a group wants other than its material's. */
  readonly R?: Readonly<Record<string, number>>;
}

export interface FigureDef {
  readonly w: number;
  readonly h: number;
  readonly legend: Legend;
  readonly layers: readonly Layer[];
  /** How much darker the feet are than the head, in steps. */
  readonly fall?: number;
}

const L = (() => {
  const v = [-0.55, -0.72, 0.78];
  const n = Math.hypot(...v);
  return v.map((x) => x / n) as [number, number, number];
})();
const FLAT = L[2];

/** Chamfer distance from each pixel of `mask` to the nearest pixel outside it. */
function distance(mask: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e6;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? INF : 0;
  const get = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[y * w + x]!);
  const D = Math.SQRT2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
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
      if (!mask[i]) continue;
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

interface Shaded {
  readonly grid: TGrid;
  readonly depth: number;
}

/** One layer, shaded from its own shape. */
function shadeLayer(layer: Layer, def: FigureDef): Shaded {
  const { w, h, legend } = def;
  const out = tgrid(w, h);
  const specs: (Spec | null)[] = new Array(w * h).fill(null);
  const groups = new Map<string, Uint8Array>();
  layer.rows.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch === '.' || ch === ' ') return;
      const s = legend[ch];
      if (!s) throw new Error(`Unknown "${ch}" at row ${j} col ${i}`);
      const x = layer.at[0] + i;
      const y = layer.at[1] + j;
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      specs[y * w + x] = s;
      const g = s.g ?? s.m;
      let m = groups.get(g);
      if (!m) groups.set(g, (m = new Uint8Array(w * h)));
      m[y * w + x] = 1;
    }),
  );
  const fall = def.fall ?? 0.9;
  for (const [g, mask] of groups) {
    const d = distance(mask, w, h);
    const first = specs[mask.indexOf(1)]!;
    const R = layer.R?.[g] ?? LOOKS[first.m].R;
    // Polished metal mirrors the sky above a horizon and the ground below it.
    let gy0 = h;
    let gy1 = 0;
    for (let i = 0; i < mask.length; i++)
      if (mask[i]) {
        const yy = (i / w) | 0;
        gy0 = Math.min(gy0, yy);
        gy1 = Math.max(gy1, yy);
      }
    const env = LOOKS[first.m].env ?? 0;
    const H = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return 0;
      const v = Math.min(d[y * w + x]!, R);
      return Math.sqrt(Math.max(0, R * R - (R - v) * (R - v)));
    };
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!mask[i]) continue;
        const s = specs[i]!;
        const look = LOOKS[s.m];
        if (s.t !== undefined) {
          out.d[i] = cell(s.m, s.t);
          continue;
        }
        const hx = (H(x + 1, y) - H(x - 1, y)) / 2;
        const hy = (H(x, y + 1) - H(x, y - 1)) / 2;
        const n = Math.hypot(hx, hy, 1);
        const lam = (-hx * L[0] - hy * L[1] + L[2]) / n;
        let t = look.base + (look.k * (FLAT - lam)) / 0.5 + (fall * y) / h + (s.o ?? 0);
        if (env && gy1 - gy0 >= 4) {
          const rel = (y - gy0) / (gy1 - gy0);
          t += rel < 0.42 ? -env * (1 - rel / 0.42) * 0.8 : env * 0.6;
        }
        if (look.spec !== undefined && lam > look.spec && !(s.o && s.o > 0)) t = 0;
        out.d[i] = cell(s.m, Math.max(t === 0 ? 0 : look.min, Math.min(look.max, Math.round(t))));
      }
  }
  // Single stray pixels inside one material take their neighbours' step.
  const copy = out.d.slice();
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const c = copy[i]!;
      const s = specs[i];
      if (!c || !s || s.t !== undefined || s.o) continue;
      const n4 = [copy[i - 1]!, copy[i + 1]!, copy[i - w]!, copy[i + w]!];
      if (n4.some((v) => !v || v >> 3 !== c >> 3)) continue;
      if (n4.every((v) => v === n4[0]) && n4[0] !== c) {
        const t = stepOf(n4[0]!);
        if (t !== 0) out.d[i] = n4[0]!;
      }
    }
  return { grid: out, depth: layer.depth };
}

/**
 * A figure: layers shaded and stacked back to front, each casting a shadow
 * down and to the right on what is behind it, then the selective outline.
 */
export function drawFigure(def: FigureDef, outlineIt = true): TGrid {
  const layers = def.layers.map((l) => shadeLayer(l, def)).sort((a, b) => a.depth - b.depth);
  const { w, h } = def;
  const g = tgrid(w, h);
  const depthAt = new Int16Array(w * h).fill(-999);
  for (const { grid: s, depth } of layers) {
    for (let i = 0; i < w * h; i++)
      if (s.d[i]) {
        g.d[i] = s.d[i]!;
        depthAt[i] = depth;
      }
  }
  // Cast shadow and contact line: a pixel with something in front of it just
  // above or to its left is in that thing's shadow.
  const cast = g.d.slice();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!g.d[i] || matOf(g.d[i]!) === 'eye') continue;
      const me = depthAt[i]!;
      const front = (dx: number, dy: number) => {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) return false;
        const j = yy * w + xx;
        return g.d[j] !== 0 && depthAt[j]! > me;
      };
      let n = 0;
      if (front(-1, 0) || front(0, -1)) n = 2;
      else if (front(-1, -1) || front(-2, 0) || front(0, -2)) n = 1;
      else if (front(1, 0) || front(0, 1)) n = 1;
      if (n) cast[i] = darker(g.d[i]!, n);
    }
  g.d.set(cast);
  return outlineIt ? selOut(g) : g;
}

/**
 * The selective outline, one pixel bigger on every side: round the lit top
 * and left a line in the darkest step of the colour inside; round the bottom
 * and right, where the light does not reach, the colour's line step.
 */
export function selOut(s: TGrid): TGrid {
  const g = tgrid(s.w + 2, s.h + 2);
  stamp(g, s, 1, 1);
  const add: [number, Cell][] = [];
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      if (at(g, x, y)) continue;
      // The thing is to the left or above: this is its shadow side.
      const shadowSide = at(g, x - 1, y) || at(g, x, y - 1);
      const litSide = at(g, x + 1, y) || at(g, x, y + 1);
      if (shadowSide) add.push([y * g.w + x, (shadowSide & ~7) | 6]);
      else if (litSide) add.push([y * g.w + x, (litSide & ~7) | 6]);
    }
  for (const [i, c] of add) g.d[i] = c;
  return g;
}

/** Parses rows into a grid with fixed steps: for props and textures drawn pixel by pixel. */
export function rowsGrid(rows: readonly string[], legend: Readonly<Record<string, Cell>>): TGrid {
  const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const g = tgrid(w, rows.length);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return;
      const c = legend[ch];
      if (c === undefined) throw new Error(`Unknown "${ch}" at ${x},${y}`);
      g.d[y * w + x] = c;
    }),
  );
  return g;
}

// ---------------------------------------------------------------- output

const RGB: Record<number, [number, number, number]> = {};
for (const m of MATS)
  COLOURS[m].forEach((hex, t) => {
    RGB[cell(m, t)] = [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
  });

export function rgbOfCell(c: Cell): [number, number, number] {
  return RGB[c] ?? [255, 0, 255];
}

/** Paints `g` at `scale` device pixels per art pixel into a 2D context, nearest neighbour. */
export function paintGrid(
  ctx: CanvasRenderingContext2D,
  g: TGrid,
  scale: number,
  ox = 0,
  oy = 0,
  clip?: { x: number; y: number; w: number; h: number },
): void {
  const img = ctx.createImageData(g.w * scale, g.h * scale);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const c = g.d[y * g.w + x]!;
      if (!c) continue;
      const [r, gg, b] = rgbOfCell(c);
      for (let j = 0; j < scale; j++) {
        let o = ((y * scale + j) * g.w * scale + x * scale) * 4;
        for (let i = 0; i < scale; i++, o += 4) {
          img.data[o] = r;
          img.data[o + 1] = gg;
          img.data[o + 2] = b;
          img.data[o + 3] = 255;
        }
      }
    }
  const tmp = document.createElement('canvas');
  tmp.width = img.width;
  tmp.height = img.height;
  tmp.getContext('2d')!.putImageData(img, 0, 0);
  ctx.save();
  if (clip) {
    ctx.beginPath();
    ctx.rect(clip.x, clip.y, clip.w, clip.h);
    ctx.clip();
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, ox, oy);
  ctx.restore();
}

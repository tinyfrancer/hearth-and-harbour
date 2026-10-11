/**
 * Two hand-designed letter sets for the logotype, drawn as shapes and sampled
 * at pixel centres, then corrected pixel by pixel where the sampling left a
 * stray step. Neither is a typeface: each holds only the letters of the name.
 *
 * - Caps: Roman capitals, thick stems and thin hairlines, bracketed serifs.
 *   Shapes are polygons and elliptical rings on a 100-unit cap height.
 * - Uncial: a broad-nib pen (a flat nib held at a fixed angle) swept along
 *   each letter's path, so thick and thin fall where a scribe's would. Paths
 *   are on a 100-unit x-height, ascenders above zero.
 */

export interface Mask {
  w: number;
  h: number;
  d: Uint8Array;
}
export const mask = (w: number, h: number): Mask => ({ w, h, d: new Uint8Array(w * h) });
export const mget = (m: Mask, x: number, y: number): number =>
  x < 0 || y < 0 || x >= m.w || y >= m.h ? 0 : (m.d[y * m.w + x] as number);
export const mset = (m: Mask, x: number, y: number, v = 1): void => {
  if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.d[y * m.w + x] = v;
};

type P = readonly [number, number];

/** Shapes in glyph units; `inside(u, v)` says whether a unit point is ink. */
type Shape = (u: number, v: number) => boolean;

const poly =
  (...pts: P[]): Shape =>
  (u, v) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i]!;
      const [xj, yj] = pts[j]!;
      if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
const rect = (x0: number, y0: number, x1: number, y1: number): Shape =>
  poly([x0, y0], [x1, y0], [x1, y1], [x0, y1]);
/** Between two ellipses, optionally only where `keep` holds. */
const ring =
  (
    o: { cx: number; cy: number; rx: number; ry: number },
    i: { cx: number; cy: number; rx: number; ry: number },
    keep: (u: number, v: number) => boolean = () => true,
  ): Shape =>
  (u, v) => {
    const a = ((u - o.cx) / o.rx) ** 2 + ((v - o.cy) / o.ry) ** 2;
    const b = ((u - i.cx) / i.rx) ** 2 + ((v - i.cy) / i.ry) ** 2;
    return a <= 1 && b > 1 && keep(u, v);
  };
const any =
  (...s: Shape[]): Shape =>
  (u, v) =>
    s.some((f) => f(u, v));
const minus =
  (a: Shape, b: Shape): Shape =>
  (u, v) =>
    a(u, v) && !b(u, v);

// Roman capitals --------------------------------------------------------------

const TH = 18; // a thick stem
const TN = 8; // a hairline
const SE = 9; // how far a serif reaches past its stem
const SH = 6; // a serif's thickness

/** A serif across the foot or head of a stem from x0 to x1, with brackets. */
function serif(x0: number, x1: number, top: boolean, left = true, right = true): Shape {
  const y0 = top ? 0 : 100 - SH;
  const y1 = top ? SH : 100;
  const a = left ? x0 - SE : x0;
  const b = right ? x1 + SE : x1;
  const yb = top ? SH + 6 : 100 - SH - 6;
  const parts: Shape[] = [rect(a, y0, b, y1)];
  // Brackets: little curved fillets from the serif into the stem.
  if (left) parts.push(poly([x0 - 6, top ? SH : 100 - SH], [x0, top ? SH : 100 - SH], [x0, yb]));
  if (right) parts.push(poly([x1 + 6, top ? SH : 100 - SH], [x1, top ? SH : 100 - SH], [x1, yb]));
  return any(...parts);
}

/** A stem from the top to the foot with serifs both ends. */
const stem = (x0: number, w = TH, l = true, r = true) =>
  any(rect(x0, 0, x0 + w, 100), serif(x0, x0 + w, true, l, r), serif(x0, x0 + w, false, l, r));

interface CapGlyph {
  w: number;
  s: Shape;
}

const CAPS: Record<string, CapGlyph> = {
  H: {
    w: 84,
    s: any(stem(9, TH), stem(57, TH), rect(9, 45, 75, 54)),
  },
  E: {
    w: 66,
    s: any(
      rect(9, 0, 27, 100),
      serif(9, 27, true, true, false),
      serif(9, 27, false, true, false),
      rect(9, 0, 60, 8),
      poly([52, 0], [62, 0], [62, 26], [58, 26], [52, 8]),
      rect(9, 45, 50, 53),
      poly([44, 37], [50, 37], [50, 61], [44, 61], [42, 53], [42, 45]),
      rect(9, 92, 63, 100),
      poly([54, 92], [64, 72], [66, 72], [66, 100], [54, 100]),
    ),
  },
  A: {
    w: 86,
    s: any(
      poly([37, 0], [47, 0], [79, 94], [59, 94]),
      poly([37, 0], [43, 0], [18, 94], [11, 94]),
      rect(22, 62, 64, 70),
      rect(1, 94, 27, 100),
      poly([11, 94], [18, 94], [21, 88]),
      rect(51, 94, 85, 100),
    ),
  },
  R: {
    w: 78,
    s: any(
      rect(9, 0, 27, 100),
      serif(9, 27, true, true, false),
      serif(9, 27, false),
      rect(9, 0, 44, 8),
      rect(9, 47, 44, 55),
      ring(
        { cx: 44, cy: 27.5, rx: 25, ry: 27.5 },
        { cx: 42, cy: 27.5, rx: 11, ry: 19.5 },
        (u) => u >= 42,
      ),
      poly([36, 53], [52, 53], [70, 94], [52, 94]),
      rect(50, 94, 77, 100),
    ),
  },
  T: {
    w: 78,
    s: any(
      rect(3, 0, 75, 8),
      poly([3, 0], [11, 0], [9, 8], [5, 26], [3, 26]),
      poly([67, 0], [75, 0], [75, 26], [73, 26], [69, 8]),
      rect(30, 0, 48, 100),
      serif(30, 48, false),
    ),
  },
  B: {
    w: 74,
    s: any(
      rect(9, 0, 27, 100),
      serif(9, 27, true, true, false),
      serif(9, 27, false, true, false),
      rect(9, 0, 42, 8),
      rect(9, 45, 44, 53),
      rect(9, 92, 44, 100),
      ring(
        { cx: 42, cy: 26.5, rx: 22, ry: 26.5 },
        { cx: 40, cy: 26.5, rx: 9, ry: 18.5 },
        (u) => u >= 40,
      ),
      ring(
        { cx: 44, cy: 72.5, rx: 27, ry: 27.5 },
        { cx: 42, cy: 72.5, rx: 13, ry: 19.5 },
        (u) => u >= 42,
      ),
    ),
  },
  O: {
    w: 90,
    s: ring({ cx: 45, cy: 50, rx: 42, ry: 51 }, { cx: 45, cy: 50, rx: 25, ry: 42 }),
  },
  U: {
    w: 84,
    s: any(
      rect(9, 0, 27, 62),
      serif(9, 27, true),
      rect(64, 0, 72, 62),
      serif(64, 72, true),
      ring(
        { cx: 40.5, cy: 62, rx: 31.5, ry: 38 },
        { cx: 45.5, cy: 62, rx: 18.5, ry: 30 },
        (_u, v) => v >= 62,
      ),
    ),
  },
};

/** Rasterises a cap glyph at `cap` pixels tall: ink where a pixel's centre is. */
function capMask(ch: string, cap: number): Mask {
  const gl = CAPS[ch];
  if (!gl) return mask(Math.round(cap * 0.4), cap);
  const k = cap / 100;
  const w = Math.round(gl.w * k);
  const m = mask(w, cap);
  for (let y = 0; y < cap; y++)
    for (let x = 0; x < w; x++) if (gl.s((x + 0.5) / k, (y + 0.5) / k)) mset(m, x, y);
  return m;
}

// The broad-nib pen -----------------------------------------------------------

type Path = readonly P[];

/** A cubic Bézier sampled into points. */
const bez = (a: P, b: P, c: P, d: P, n = 24): P[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const s = 1 - t;
    return [
      s * s * s * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t * t * t * d[0],
      s * s * s * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t * t * t * d[1],
    ] as P;
  });
const line = (a: P, b: P, n = 12): P[] =>
  Array.from(
    { length: n + 1 },
    (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n] as P,
  );
/** An elliptical arc from angle a0 to a1 (radians, 0 = right, clockwise on screen). */
const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 32) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as P;
  });

interface PenGlyph {
  w: number;
  strokes: Path[];
  /** Extra filled shapes (a wedge serif). */
  fill?: Shape[];
}

const D = Math.PI / 180;

/**
 * Uncial letters, x-height 0..100, ascenders to -60. The nib is flat, held at
 * about 20 degrees, so verticals are thick, horizontals thinner and the
 * thinnest strokes run up to the right.
 */
const UNCIAL: Record<string, PenGlyph> = {
  h: {
    w: 92,
    strokes: [
      [...line([18, -58], [18, 96])],
      [...bez([18, 38], [26, 4], [70, -6], [80, 30]), ...bez([80, 30], [88, 60], [80, 90], [62, 100])],
    ],
    fill: [poly([4, -66], [30, -66], [24, -50], [10, -54])],
  },
  e: {
    w: 84,
    strokes: [
      [...arc(48, 50, 38, 48, -40 * D, -180 * D, 20), ...arc(48, 50, 38, 48, 180 * D, 40 * D, 20)],
      [...line([14, 46], [66, 40])],
    ],
  },
  a: {
    w: 92,
    strokes: [
      [...bez([60, 6], [20, -6], [6, 40], [12, 70]), ...bez([12, 70], [18, 104], [58, 100], [70, 60])],
      [...line([70, 2], [72, 86]), ...bez([72, 86], [72, 98], [84, 100], [92, 92])],
    ],
  },
  r: {
    w: 70,
    strokes: [[...line([18, 2], [18, 98])], [...bez([18, 26], [30, 0], [58, -4], [66, 18])]],
  },
  t: {
    w: 82,
    strokes: [
      [...line([2, 8], [76, 4])],
      [...bez([40, -34], [32, 30], [24, 96], [60, 98]), ...line([60, 98], [80, 84], 4)],
    ],
  },
  b: {
    w: 90,
    strokes: [
      [...line([18, -58], [18, 92])],
      [...bez([18, 36], [30, 0], [80, -4], [82, 48]), ...bez([82, 48], [84, 98], [36, 104], [18, 90])],
    ],
    fill: [poly([4, -66], [30, -66], [24, -50], [10, -54])],
  },
  o: {
    w: 96,
    strokes: [[...arc(48, 50, 40, 48, 0, 2 * Math.PI, 48)]],
  },
  u: {
    w: 94,
    strokes: [
      [...line([16, 2], [16, 64]), ...bez([16, 64], [18, 104], [64, 104], [78, 70])],
      [...line([78, 2], [78, 86]), ...bez([78, 86], [78, 98], [88, 100], [94, 92])],
    ],
  },
  '&': {
    w: 100,
    strokes: [
      [
        ...bez([96, 100], [70, 70], [26, 30], [30, 6]),
        ...bez([30, 6], [34, -30], [80, -24], [66, 8]),
        ...bez([66, 8], [56, 30], [6, 44], [8, 76]),
        ...bez([8, 76], [10, 106], [70, 104], [88, 56]),
      ],
    ],
  },
};
// The capital H of the uncial line: two full-height stems, the right one
// bellied out and flicked at the foot, a hairline bar, wedge heads.
UNCIAL.H = {
  w: 104,
  strokes: [
    [...bez([18, -60], [14, -10], [14, 50], [16, 96])],
    [...bez([80, -60], [92, -10], [92, 50], [80, 92]), ...line([80, 92], [100, 100], 4)],
    [...line([16, 22], [86, 16])],
  ],
  fill: [poly([2, -70], [32, -70], [26, -54], [8, -56]), poly([64, -70], [94, -70], [88, -54], [70, -56])],
};

/** The nib: a segment `width` units long at `angle`. */
function penMask(gl: PenGlyph, xh: number, nibW: number, angle: number, top = -90): Mask {
  const k = xh / 100;
  const pad = Math.ceil(nibW / 2) + 2;
  const w = Math.ceil((gl.w + 20) * k) + pad * 2;
  const h = Math.ceil((100 - top + 30) * k) + pad;
  const m = mask(w, h);
  const ox = pad + 10 * k;
  const oy = -top * k;
  const nx = (Math.cos(angle) * nibW) / 2;
  const ny = (-Math.sin(angle) * nibW) / 2;
  const quads: Shape[] = [];
  for (const path of gl.strokes)
    for (let i = 0; i + 1 < path.length; i++) {
      const [ax, ay] = path[i]!;
      const [bx, by] = path[i + 1]!;
      const A: P = [ax * k + ox, ay * k + oy];
      const B: P = [bx * k + ox, by * k + oy];
      quads.push(
        poly([A[0] - nx, A[1] - ny], [A[0] + nx, A[1] + ny], [B[0] + nx, B[1] + ny], [B[0] - nx, B[1] - ny]),
      );
    }
  const fills = (gl.fill ?? []).map((s): Shape => (x, y) => s((x - ox) / k, (y - oy) / k));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = x + 0.5;
      const v = y + 0.5;
      if (quads.some((q) => q(u, v)) || fills.some((f) => f(u, v))) mset(m, x, y);
    }
  return trim(m, oy, xh);
}

/** Trims empty columns either side, keeping the rows (so baselines line up). */
function trim(m: Mask, _oy: number, _xh: number): Mask {
  let x0 = m.w;
  let x1 = -1;
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++)
      if (mget(m, x, y)) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
      }
  if (x1 < 0) return m;
  const out = mask(x1 - x0 + 1, m.h);
  for (let y = 0; y < m.h; y++)
    for (let x = x0; x <= x1; x++) if (mget(m, x, y)) mset(out, x - x0, y);
  return out;
}

/** Fills one-pixel pinholes and knocks off lone pixels: the hand-correction pass. */
export function tidy(m: Mask): Mask {
  const out = { ...m, d: new Uint8Array(m.d) };
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      const n4 = mget(m, x - 1, y) + mget(m, x + 1, y) + mget(m, x, y - 1) + mget(m, x, y + 1);
      if (!mget(m, x, y) && n4 >= 3) mset(out, x, y);
      if (mget(m, x, y) && n4 === 0) mset(out, x, y, 0);
    }
  return out;
}

/** Places glyph masks side by side on one baseline. */
export function join(parts: { m: Mask; dx?: number; dy?: number }[], gap: number): Mask {
  let w = 0;
  let h = 0;
  for (const p of parts) {
    w += p.m.w + gap + (p.dx ?? 0);
    h = Math.max(h, p.m.h + (p.dy ?? 0));
  }
  const out = mask(Math.max(1, w - gap), h);
  let x = 0;
  for (const p of parts) {
    x += p.dx ?? 0;
    for (let y = 0; y < p.m.h; y++)
      for (let i = 0; i < p.m.w; i++) if (mget(p.m, i, y)) mset(out, x + i, y + (p.dy ?? 0));
    x += p.m.w + gap;
  }
  return out;
}

/** A word in Roman capitals, `cap` pixels tall, letters `gap` apart (kerned for A and T). */
export function capsWord(word: string, cap: number, gap = Math.max(1, Math.round(cap / 14))): Mask {
  const KERN: Record<string, number> = { HA: -2, AR: -2, RT: -2, TH: -2, RB: -1, BO: 0, OU: 0, UR: 0 };
  const parts = [...word].map((ch, i) => ({
    m: tidy(capMask(ch, cap)),
    dx: i ? Math.round(((KERN[word[i - 1]! + ch] ?? 0) * cap) / 30) : 0,
  }));
  return join(parts, gap);
}

/** A word in the uncial hand at x-height `xh`, pen `nib` units wide. */
export function uncialWord(
  word: string,
  xh: number,
  nib = 22,
  angle = 20 * D,
  gap = Math.max(1, Math.round(xh / 12)),
): Mask {
  const parts = [...word].map((ch) => {
    const gl = UNCIAL[ch];
    return { m: gl ? tidy(penMask(gl, xh, nib * (xh / 100), angle)) : mask(Math.round(xh * 0.5), 1) };
  });
  return join(parts, gap);
}

/** One uncial letter (for the ampersand set apart, or a monogram). */
export function uncialGlyph(ch: string, xh: number, nib = 22, angle = 20 * D): Mask {
  return tidy(penMask(UNCIAL[ch]!, xh, nib * (xh / 100), angle));
}

export function capGlyph(ch: string, cap: number): Mask {
  return tidy(capMask(ch, cap));
}

/** The uncial line's baseline row in a mask made at x-height `xh`. */
export const uncialBaseline = (xh: number): number => Math.round(0.9 * xh) + Math.round(xh);

export { minus, any, rect, poly };

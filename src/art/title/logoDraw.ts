/**
 * How the logotype is drawn: HEARTH over HARBOUR in gilded Roman capitals, a small cream
 * uncial ampersand between them on a short gold rule. Taken from the approved
 * title study (study/title-and-icon/glyphs.ts, logo.ts, lockups.ts), trimmed
 * to this one lockup: the letters are shapes on a 100-unit cap height sampled
 * at pixel centres, then lit as gold leaf standing proud (the town's bevel),
 * lined in gilt's darkest step, rimmed in navy and given a drop shadow so it
 * holds over the sky at any height.
 *
 * This is the drawing; the game shows its output, baked into logoData.ts
 * (the letters take far longer to sample than the whole scene takes to
 * draw, and they never change). tests/art/title.test.ts checks the bake is
 * this drawing's output and rewrites it when run with UPDATE_LOGO=1.
 *
 * B14 trued it up: stems and hairlines are whole pixels at the one size it is
 * drawn (a stem 6, a hairline 2 or 3, never a mix along one stroke), the
 * letters are spaced by their shapes (round and diagonal sides closer, two
 * stems further) rather than one gap, and the two words share a width.
 */
import { bevel, FLAT_LIGHT } from '../town2/cells';
import { clumps } from '../town2/texture';
import { tc, type TitleMat } from './ramps';
import type { Cells } from './logo';

interface Mask {
  w: number;
  h: number;
  d: Uint8Array;
}
const mask = (w: number, h: number): Mask => ({ w, h, d: new Uint8Array(w * h) });
const mget = (m: Mask, x: number, y: number): number =>
  x < 0 || y < 0 || x >= m.w || y >= m.h ? 0 : (m.d[y * m.w + x] as number);
const mset = (m: Mask, x: number, y: number, v = 1): void => {
  if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.d[y * m.w + x] = v;
};

type P = readonly [number, number];
/** A shape in glyph units: whether a unit point is ink. */
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
interface Ell {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}
/** Between two ellipses, where `keep` holds. */
const ring =
  (o: Ell, i: Ell, keep: (u: number, v: number) => boolean = () => true): Shape =>
  (u, v) =>
    ((u - o.cx) / o.rx) ** 2 + ((v - o.cy) / o.ry) ** 2 <= 1 &&
    ((u - i.cx) / i.rx) ** 2 + ((v - i.cy) / i.ry) ** 2 > 1 &&
    keep(u, v);
const any =
  (...s: Shape[]): Shape =>
  (u, v) =>
    s.some((f) => f(u, v));

// Roman capitals, on a cap height of 100 units ---------------------------------

/**
 * The capitals are drawn for one size, a 40-pixel cap, where a pixel is 2.5
 * units: every stem, serif, bar and hairline edge lies on a whole pixel, so
 * sampling at pixel centres gives each stroke the same width wherever it
 * falls (the study's 17-unit stems came out 6 or 7 pixels by position).
 * Stems are 7 pixels, hairlines and bars 3, serifs reach 3 and are 2 thick.
 */
const TH = 17.5;
const SE = 7.5;
const SH = 5;
const HL = 7.5;

function serif(x0: number, x1: number, top: boolean, left = true, right = true): Shape {
  const y0 = top ? 0 : 100 - SH;
  const y1 = top ? SH : 100;
  const a = left ? x0 - SE : x0;
  const b = right ? x1 + SE : x1;
  const yb = top ? SH + 5 : 100 - SH - 5;
  const yi = top ? SH : 100 - SH;
  const parts: Shape[] = [rect(a, y0, b, y1)];
  // Brackets: the little fillets from the serif into the stem.
  if (left) parts.push(poly([x0 - 5, yi], [x0, yi], [x0, yb]));
  if (right) parts.push(poly([x1 + 5, yi], [x1, yi], [x1, yb]));
  return any(...parts);
}
const stem = (x0: number, w = TH, l = true, r = true) =>
  any(rect(x0, 0, x0 + w, 100), serif(x0, x0 + w, true, l, r), serif(x0, x0 + w, false, l, r));

interface CapGlyph {
  w: number;
  s: Shape;
}

const CAPS: Record<string, CapGlyph> = {
  H: { w: 85, s: any(stem(7.5), stem(60), rect(7.5, 45, 77.5, 45 + HL)) },
  E: {
    w: 65,
    s: any(
      rect(7.5, 0, 7.5 + TH, 100),
      serif(7.5, 7.5 + TH, true, true, false),
      serif(7.5, 7.5 + TH, false, true, false),
      rect(7.5, 0, 60, HL),
      poly([52.5, 0], [62.5, 0], [62.5, 25], [57.5, 25], [52.5, HL]),
      rect(7.5, 45, 50, 45 + HL),
      poly([45, 37.5], [50, 37.5], [50, 60], [45, 60], [42.5, 52.5], [42.5, 45]),
      rect(7.5, 100 - HL, 62.5, 100),
      poly([55, 100 - HL], [62.5, 72.5], [65, 72.5], [65, 100], [55, 100]),
    ),
  },
  A: {
    w: 85,
    s: any(
      poly([37.5, 0], [47.5, 0], [80, 95], [60, 95]),
      poly([37.5, 0], [42.5, 0], [17.5, 95], [12.5, 95]),
      rect(22.5, 62.5, 62.5, 62.5 + HL),
      rect(2.5, 95, 27.5, 100),
      rect(52.5, 95, 85, 100),
    ),
  },
  R: {
    w: 77.5,
    s: any(
      rect(7.5, 0, 7.5 + TH, 100),
      serif(7.5, 7.5 + TH, true, true, false),
      serif(7.5, 7.5 + TH, false),
      rect(7.5, 0, 45, HL),
      rect(7.5, 47.5, 45, 47.5 + HL),
      ring(
        { cx: 45, cy: 27.5, rx: 25, ry: 27.5 },
        { cx: 42.5, cy: 27.5, rx: 10, ry: 20 },
        (u) => u >= 42.5,
      ),
      poly([35, 55], [52.5, 55], [70, 95], [52.5, 95]),
      rect(50, 95, 77.5, 100),
    ),
  },
  T: {
    w: 77.5,
    s: any(
      rect(2.5, 0, 75, HL),
      poly([2.5, 0], [10, 0], [7.5, HL], [5, 25], [2.5, 25]),
      poly([67.5, 0], [75, 0], [75, 25], [72.5, 25], [70, HL]),
      rect(30, 0, 30 + TH, 100),
      serif(30, 30 + TH, false),
    ),
  },
  B: {
    w: 75,
    s: any(
      rect(7.5, 0, 7.5 + TH, 100),
      serif(7.5, 7.5 + TH, true, true, false),
      serif(7.5, 7.5 + TH, false, true, false),
      rect(7.5, 0, 42.5, HL),
      rect(7.5, 45, 45, 45 + HL),
      rect(7.5, 100 - HL, 45, 100),
      ring(
        { cx: 42.5, cy: 26.25, rx: 22.5, ry: 26.25 },
        { cx: 40, cy: 26.25, rx: 8.75, ry: 18.75 },
        (u) => u >= 40,
      ),
      ring(
        { cx: 45, cy: 72.5, rx: 27.5, ry: 27.5 },
        { cx: 42.5, cy: 72.5, rx: 12.5, ry: 20 },
        (u) => u >= 42.5,
      ),
    ),
  },
  O: {
    w: 90,
    s: ring({ cx: 45, cy: 50, rx: 42.5, ry: 51 }, { cx: 45.5, cy: 50, rx: 25, ry: 42.5 }),
  },
  U: {
    w: 85,
    s: any(
      rect(7.5, 0, 7.5 + TH, 62.5),
      serif(7.5, 7.5 + TH, true),
      rect(65, 0, 65 + HL, 65),
      serif(65, 65 + HL, true),
      ring(
        { cx: 40, cy: 62.5, rx: 32.5, ry: 37.5 },
        { cx: 45, cy: 62.5, rx: 20, ry: 30 },
        (_u, v) => v >= 62.5,
      ),
    ),
  },
};

/** A capital at `cap` pixels tall: ink where a pixel's centre is. */
function capMask(ch: string, cap: number): Mask {
  const gl = CAPS[ch] as CapGlyph;
  const k = cap / 100;
  const w = Math.round(gl.w * k);
  const m = mask(w, cap);
  for (let y = 0; y < cap; y++)
    for (let x = 0; x < w; x++) if (gl.s((x + 0.5) / k, (y + 0.5) / k)) mset(m, x, y);
  return tidy(m);
}

// The ampersand, a broad-nib uncial ------------------------------------------

const bez = (a: P, b: P, c: P, d: P, n = 24): P[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const s = 1 - t;
    return [
      s * s * s * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t * t * t * d[0],
      s * s * s * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t * t * t * d[1],
    ] as P;
  });

const AMP: P[] = [
  ...bez([96, 100], [70, 70], [26, 30], [30, 6]),
  ...bez([30, 6], [34, -30], [80, -24], [66, 8]),
  ...bez([66, 8], [56, 30], [6, 44], [8, 76]),
  ...bez([8, 76], [10, 106], [70, 104], [88, 56]),
];

/** The ampersand at x-height `xh`: a flat nib at 20 degrees swept along its path. */
function ampMask(xh: number): Mask {
  const k = xh / 100;
  const nib = 22 * k;
  const angle = (20 * Math.PI) / 180;
  const pad = Math.ceil(nib / 2) + 2;
  const top = -40;
  const w = Math.ceil(120 * k) + pad * 2;
  const h = Math.ceil((100 - top + 14) * k) + pad;
  const m = mask(w, h);
  const ox = pad + 10 * k;
  const oy = -top * k;
  const nx = (Math.cos(angle) * nib) / 2;
  const ny = (-Math.sin(angle) * nib) / 2;
  const quads: Shape[] = [];
  for (let i = 0; i + 1 < AMP.length; i++) {
    const [ax, ay] = AMP[i]!;
    const [bx, by] = AMP[i + 1]!;
    const A: P = [ax * k + ox, ay * k + oy];
    const B: P = [bx * k + ox, by * k + oy];
    quads.push(
      poly(
        [A[0] - nx, A[1] - ny],
        [A[0] + nx, A[1] + ny],
        [B[0] + nx, B[1] + ny],
        [B[0] - nx, B[1] - ny],
      ),
    );
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (quads.some((q) => q(x + 0.5, y + 0.5))) mset(m, x, y);
  return crop(tidy(m));
}

/** Fills one-pixel pinholes and knocks off lone pixels. */
function tidy(m: Mask): Mask {
  const out = { ...m, d: new Uint8Array(m.d) };
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      const n4 = mget(m, x - 1, y) + mget(m, x + 1, y) + mget(m, x, y - 1) + mget(m, x, y + 1);
      if (!mget(m, x, y) && n4 >= 3) mset(out, x, y);
      if (mget(m, x, y) && n4 === 0) mset(out, x, y, 0);
    }
  return out;
}

function crop(m: Mask): Mask {
  let x0 = m.w;
  let y0 = m.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++)
      if (mget(m, x, y)) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  const out = mask(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) out.d[(y - y0) * out.w + x - x0] = m.d[y * m.w + x] as number;
  return out;
}

/** Each row's leftmost and rightmost ink (-1 where the row is empty). */
function edges(m: Mask): { l: Int16Array; r: Int16Array } {
  const l = new Int16Array(m.h).fill(-1);
  const r = new Int16Array(m.h).fill(-1);
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++)
      if (mget(m, x, y)) {
        if (l[y] === -1) l[y] = x;
        r[y] = x;
      }
  return { l, r };
}

/** The tightest two letters may come: a pixel and a half between serifs reads as touching. */
const MIN_GAP = 2;
/** The air two letters should hold on average down their facing sides (each row counted to 9). */
const MEAN_GAP = 5.2;
const ROW_CAP = 9;

/**
 * Where the next letter starts after one ending at `prevX`: spaced by its
 * shape rather than one gap, so two stems hold the air a round side or a
 * diagonal does, and an A tucks under a T's arm without touching it.
 */
function nextX(prev: Mask, prevX: number, next: Mask): number {
  const a = edges(prev);
  const b = edges(next);
  for (let x = prevX + 1; ; x++) {
    let min = Infinity;
    let sum = 0;
    let n = 0;
    for (let y = 0; y < prev.h; y++) {
      if (a.r[y]! < 0 || b.l[y]! < 0) continue;
      const gap = x + b.l[y]! - (prevX + a.r[y]!) - 1;
      min = Math.min(min, gap);
      sum += Math.min(ROW_CAP, gap);
      n++;
    }
    if (min >= MIN_GAP && sum / Math.max(1, n) >= MEAN_GAP) return x;
  }
}

/** A word in the capitals, spaced by its letters' shapes. */
function capsWord(word: string, cap: number): Mask {
  const glyphs = [...word].map((ch) => capMask(ch, cap));
  const xs: number[] = [0];
  for (let i = 1; i < glyphs.length; i++) xs.push(nextX(glyphs[i - 1]!, xs[i - 1]!, glyphs[i]!));
  const last = glyphs[glyphs.length - 1]!;
  const out = mask(xs[xs.length - 1]! + last.w, cap);
  glyphs.forEach((m, i) => {
    for (let y = 0; y < cap; y++)
      for (let j = 0; j < m.w; j++) if (mget(m, j, y)) mset(out, xs[i]! + j, y);
  });
  return crop(out);
}

// Lit and framed --------------------------------------------------------------

/** A picture in cells, `w` by `h`. */
const cells = (w: number, h: number): Cells => ({ w, h, d: new Int16Array(w * h) });
const cput = (g: Cells, x: number, y: number, c: number) => {
  if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y * g.w + x] = c;
};

/** Gold leaf standing proud: banded like polished metal, lit from the upper left. */
function gilt(m: Mask): Cells {
  const lit = bevel(m.d, m.w, m.h, 2.2);
  const g = cells(m.w, m.h);
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      if (!mget(m, x, y)) continue;
      const f = (y + 0.5) / m.h;
      // Bright top, a dark band just below the middle, a warm bounce at the foot.
      const band =
        f < 0.42
          ? 1.3 + f * 1.6
          : f < 0.5
            ? 3.4
            : f < 0.72
              ? 3.0 - (f - 0.5) * 2.5
              : 2.2 + (f - 0.72) * 3;
      let t = band + (1.4 * (FLAT_LIGHT - (lit[y * m.w + x] as number))) / 0.5;
      t += (clumps(x, y, 9) - 0.5) * 0.4;
      cput(g, x, y, tc('gilt', Math.max(0, Math.min(5, Math.round(t)))));
    }
  glints(m, g, 'gilt');
  return g;
}

/** Limewash cream, softly lit: the ampersand. */
function cream(m: Mask): Cells {
  const lit = bevel(m.d, m.w, m.h, 2);
  const g = cells(m.w, m.h);
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      if (!mget(m, x, y)) continue;
      const t =
        1 + ((y + 0.5) / m.h) * 1.4 + (1.2 * (FLAT_LIGHT - (lit[y * m.w + x] as number))) / 0.5;
      cput(g, x, y, tc('parch', Math.max(0, Math.min(4, Math.round(t)))));
    }
  return g;
}

/** The brightest step on each stroke's upper-left corner. */
function glints(m: Mask, g: Cells, mat: TitleMat) {
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++)
      if (
        mget(m, x, y) &&
        !mget(m, x - 1, y) &&
        !mget(m, x, y - 1) &&
        mget(m, x + 1, y) &&
        mget(m, x, y + 1)
      )
        cput(g, x, y, tc(mat, 0));
}

/** Grows a mask by one pixel on every side (4-connected). */
function grow(m: Mask): Mask {
  const n = mask(m.w + 2, m.h + 2);
  for (let y = 0; y < n.h; y++)
    for (let x = 0; x < n.w; x++) {
      const px = x - 1;
      const py = y - 1;
      if (
        mget(m, px, py) ||
        mget(m, px - 1, py) ||
        mget(m, px + 1, py) ||
        mget(m, px, py - 1) ||
        mget(m, px, py + 1)
      )
        n.d[y * n.w + x] = 1;
    }
  return n;
}

/** Letters with their line (gilt's darkest), a navy rim and a navy drop shadow beneath. */
function framed(letters: Cells, m: Mask, line: number, drop: number): Cells {
  const lineM = grow(m);
  const rimM = grow(lineM);
  const g = cells(rimM.w + drop, rimM.h + drop);
  for (let y = 0; y < rimM.h; y++)
    for (let x = 0; x < rimM.w; x++)
      if (mget(rimM, x, y)) for (let k = 1; k <= drop; k++) cput(g, x + k, y + k, tc('navy', 7));
  for (let y = 0; y < rimM.h; y++)
    for (let x = 0; x < rimM.w; x++) if (mget(rimM, x, y)) cput(g, x, y, tc('navy', 6));
  for (let y = 0; y < lineM.h; y++)
    for (let x = 0; x < lineM.w; x++) if (mget(lineM, x, y)) cput(g, x + 1, y + 1, line);
  for (let y = 0; y < letters.h; y++)
    for (let x = 0; x < letters.w; x++) {
      const c = letters.d[y * letters.w + x] as number;
      if (c) cput(g, x + 2, y + 2, c);
    }
  return g;
}

function stampCells(g: Cells, s: Cells, x: number, y: number) {
  for (let j = 0; j < s.h; j++)
    for (let i = 0; i < s.w; i++) {
      const c = s.d[j * s.w + i] as number;
      if (c) cput(g, x + i, y + j, c);
    }
}

/** The capitals' height in art pixels. */
const LOGO_CAP = 40;

/** HEARTH / & / HARBOUR, centred on one another, in cells (title ramps). */
export function drawLogotype(): Cells {
  const cap = LOGO_CAP;
  const drop = 3;
  const aM = capsWord('HEARTH', cap);
  const bM = capsWord('HARBOUR', cap);
  const a = framed(gilt(aM), aM, tc('gilt', 6), drop);
  const b = framed(gilt(bM), bM, tc('gilt', 6), drop);
  const ampM = ampMask(Math.round(cap * 0.42));
  const amp = framed(cream(ampM), ampM, tc('parch', 6), 2);
  const w = Math.max(a.w, b.w);
  const ampH = Math.round(cap * 0.55);
  const gap = 2;
  const h = a.h + ampH + b.h + gap * 2;
  const out = cells(w, h);
  stampCells(out, a, Math.round((w - a.w) / 2), 0);
  stampCells(out, b, Math.round((w - b.w) / 2), a.h + ampH + gap * 2);
  // The rule either side of the ampersand: gold over its dark line, a lozenge at each end.
  const ry = a.h + gap + Math.round(ampH / 2);
  const ruleHalf = Math.round(w * 0.3);
  const cx = Math.round(w / 2);
  const clear = Math.round(amp.w / 2) + 4;
  for (let x = cx - ruleHalf; x <= cx + ruleHalf; x++) {
    if (Math.abs(x - cx) < clear) continue;
    const end = Math.abs(x - cx) > ruleHalf - 3;
    cput(out, x, ry - 1, tc('navy', 6));
    cput(out, x, ry, tc('gilt', end ? 3 : 1));
    cput(out, x, ry + 1, tc('gilt', end ? 5 : 4));
    cput(out, x, ry + 2, tc('navy', 6));
  }
  for (const ex of [cx - ruleHalf - 3, cx + ruleHalf + 3])
    for (let j = -3; j <= 3; j++)
      for (let i = -3; i <= 3; i++) {
        const d = Math.abs(i) + Math.abs(j);
        if (d <= 3)
          cput(out, ex + i, ry + j, d === 3 ? tc('navy', 6) : tc('gilt', i + j < 0 ? 1 : 3));
      }
  stampCells(out, amp, cx - Math.round(amp.w / 2), ry - Math.round(amp.h * 0.55));
  return trimCells(out);
}

function trimCells(g: Cells): Cells {
  let x0 = g.w;
  let y0 = g.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++)
      if (g.d[y * g.w + x]) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  const out = cells(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = y0; y <= y1; y++)
    out.d.set(g.d.subarray(y * g.w + x0, y * g.w + x1 + 1), (y - y0) * out.w);
  return out;
}

/**
 * The dusk sky: flat bands from the plum-navy zenith to the amber afterglow,
 * the young moon, stars placed by hand where the sky is dark enough, and long
 * clouds lit from beneath that drift and loop.
 *
 * Bands are flat colours with a deliberate interlock where two meet (a row of
 * the lower colour in short dashes over a row of the upper in the gaps), so a
 * transition is a pixel artist's two rows, never a smooth gradient and never a
 * scatter of noise (the study's clumped edges read as mud at true size).
 */
import { hash, put, type TGrid } from '../town2/cells';
import { tc, rampId, type TitleMat } from './ramps';
import type { Box } from './layout';

/** The bands top to bottom: the zenith's eight, then the afterglow's eight. */
const BANDS: readonly (readonly [TitleMat, number])[] = [
  ...[7, 6, 5, 4, 3, 2, 1, 0].map((s) => ['skyHi', s] as const),
  ...[7, 6, 5, 4, 3, 2, 1, 0].map((s) => ['skyLo', s] as const),
];

/**
 * Where each band starts, as a fraction of the sky's height: the zenith's
 * bands deep (the logotype sits in them), the afterglow's thinner and
 * thinner toward the hills, as a sky's colour changes fastest there.
 */
const STARTS = (() => {
  const out: number[] = [];
  // Weights: 0..7 the zenith (heavy at the top), 8..15 the afterglow (lightening fast).
  const weight = [
    2.4, 1.7, 1.4, 1.2, 1.1, 1, 0.95, 0.9, 0.85, 0.8, 0.72, 0.66, 0.6, 0.56, 0.52, 0.6,
  ];
  const total = weight.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (const wgt of weight) {
    out.push(acc / total);
    acc += wgt;
  }
  return out;
})();

/** The sky's ramp ids, for telling sky cells from everything else. */
export const SKY_IDS = [rampId('skyHi'), rampId('skyLo')] as const;
export const isSky = (c: number): boolean => c >> 3 === SKY_IDS[0] || c >> 3 === SKY_IDS[1];

/** Paints the sky into rows 0..bottom of `g` (the afterglow's last band reaches `bottom`). */
export function paintSky(g: TGrid, bottom: number): number[] {
  const rows = STARTS.map((f) => Math.round(f * bottom));
  for (let i = 0; i < BANDS.length; i++) {
    const [m, s] = BANDS[i]!;
    const y0 = rows[i]!;
    const y1 = i + 1 < rows.length ? rows[i + 1]! : bottom;
    g.d.fill(tc(m, s), y0 * g.w, y1 * g.w);
  }
  // The interlock at each band's top edge: short dashes of the lower band
  // poke up a row, the upper band's colour hangs a row down in the gaps
  // between them, spaced unevenly so it never reads as a zip.
  for (let i = 1; i < BANDS.length; i++) {
    const y = rows[i]!;
    if (y - rows[i - 1]! < 3) continue;
    const [um, us] = BANDS[i - 1]!;
    const [lm, ls] = BANDS[i]!;
    let x = Math.floor(hash(i, 0, 77) * 6) - 6;
    let k = 0;
    while (x < g.w) {
      const dash = 2 + Math.floor(hash(i, k, 78) * 4);
      const gap = 3 + Math.floor(hash(i, k, 79) * 7);
      for (let j = 0; j < dash; j++) put(g, x + j, y - 1, tc(lm, ls));
      // The upper colour hangs down under the middle of the gap.
      for (let j = 1; j < gap - 1; j++)
        if (hash(i, k, 80) < 0.7) put(g, x + dash + j, y, tc(um, us));
      x += dash + gap;
      k++;
    }
  }
  return rows;
}

/** The young moon, its lit edge toward the sun that has set (down and to the left). */
export function paintMoon(g: TGrid, cx: number, cy: number): Box {
  const r = 8;
  for (let y = cy - r - 1; y <= cy + r + 1; y++)
    for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      const a = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      // The dark part of the disc: a circle offset up and to the right.
      const b = Math.hypot(x + 0.5 - (cx + 3.4), y + 0.5 - (cy - 2.6));
      if (a > r || b <= r - 0.6) continue;
      // Thickest at the lower left, a glint where the crescent is widest.
      const edge = a > r - 1.1;
      const inner = b <= r + 0.6;
      put(g, x, y, tc('star', edge ? 1 : inner ? 2 : 0));
    }
  // Earthshine: the dark of the disc a step lighter than the sky round it.
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++) {
      const a = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const b = Math.hypot(x + 0.5 - (cx + 3.4), y + 0.5 - (cy - 2.6));
      if (a <= r - 0.2 && b <= r - 0.6) {
        const c = g.d[y * g.w + x] as number;
        if (isSky(c)) put(g, x, y, tc('skyHi', Math.max(0, (c & 7) - 2)));
      }
    }
  return { x: cx - r - 1, y: cy - r - 1, w: 2 * r + 3, h: 2 * r + 3 };
}

/** A star: where, how bright, and when it twinkles. */
export interface Star {
  readonly x: number;
  readonly y: number;
  /** 0 a bright cross, 1 a bright point, 2 a point, 3 a faint point. */
  readonly kind: 0 | 1 | 2 | 3;
  /** Its own twinkle: period and phase in ms. */
  readonly period: number;
  readonly phase: number;
}

/**
 * The stars: a jittered grid so they never clump or line up, thinning toward
 * the afterglow and gone where the sky is warm, kept off the logotype and the
 * moon; a few bright crosses placed where the eye can rest between the words
 * and the edges; and the Plough, low in the north-west, because a sailor's
 * town would know it.
 */
export function placeStars(
  w: number,
  darkBottom: number,
  cx: number,
  avoid: readonly Box[],
): Star[] {
  const stars: Star[] = [];
  const clear = (x: number, y: number, m: number) =>
    x >= 2 &&
    x < w - 2 &&
    y >= 2 &&
    !avoid.some((b) => x >= b.x - m && x < b.x + b.w + m && y >= b.y - m && y < b.y + b.h + m);
  const cellW = 23;
  const cellH = 19;
  // The grid is laid from the middle out, so a wider screen adds stars at its
  // edges without moving the ones in the middle.
  const cols = Math.ceil(w / cellW / 2) + 1;
  for (let j = 0; j * cellH < darkBottom; j++)
    for (let i = -cols; i <= cols; i++) {
      const f = (j * cellH) / darkBottom;
      if (hash(i, j, 5) > 0.78 * (1 - f * f)) continue;
      const x = cx + i * cellW + Math.floor(hash(i, j, 6) * (cellW - 4));
      const y = j * cellH + Math.floor(hash(i, j, 7) * (cellH - 4));
      if (y >= darkBottom || !clear(x, y, 3)) continue;
      const r = hash(i, j, 8);
      const kind = r < 0.1 && f < 0.6 ? 1 : r < 0.55 ? 2 : 3;
      stars.push({
        x,
        y,
        kind,
        period: 2600 + Math.floor(hash(i, j, 9) * 3400),
        phase: Math.floor(hash(i, j, 10) * 6000),
      });
    }
  // The bright crosses: either side of the logotype's foot and high in the corners.
  const bright: [number, number][] = [
    [cx - Math.min(160, w / 2 - 14), Math.round(darkBottom * 0.12)],
    [cx + Math.min(150, w / 2 - 18), Math.round(darkBottom * 0.07)],
    [cx - Math.min(118, w / 2 - 30), Math.round(darkBottom * 0.62)],
    [cx + Math.min(96, w / 2 - 40), Math.round(darkBottom * 0.8)],
  ];
  bright.forEach(([x, y], i) => {
    if (clear(x, y, 4)) stars.push({ x, y, kind: 0, period: 4200 + i * 700, phase: i * 1300 });
  });
  // The Plough: seven stars, the handle curving down to the right.
  const plough: [number, number][] = [
    [0, 0],
    [9, -2],
    [17, 1],
    [24, 6],
    [27, 15],
    [38, 17],
    [40, 7],
  ];
  const px = cx - Math.min(170, w / 2 - 8) + 6;
  const py = Math.round(darkBottom * 0.34);
  if (plough.every(([dx, dy]) => clear(px + dx, py + dy, 2)))
    plough.forEach(([dx, dy], i) =>
      stars.push({
        x: px + dx,
        y: py + dy,
        kind: i === 4 || i === 6 ? 1 : 2,
        period: 5000 + i * 400,
        phase: i * 900,
      }),
    );
  // Nothing on top of another: a later star gives way to an earlier one.
  return stars.filter(
    (s, i) => !stars.some((o, j) => j < i && Math.abs(o.x - s.x) < 4 && Math.abs(o.y - s.y) < 4),
  );
}

/** The pixels a star lights at time `ms`, as [dx, dy, starStep]. */
export function starPixels(s: Star, ms: number): readonly (readonly [number, number, number])[] {
  // Twinkling is a short dip once a period: most of the time a star is steady.
  const p = (((ms + s.phase) % s.period) + s.period) % s.period;
  const dip = p < 380;
  switch (s.kind) {
    case 0:
      return dip
        ? [[0, 0, 1]]
        : [
            [0, 0, 0],
            [1, 0, 3],
            [-1, 0, 3],
            [0, 1, 3],
            [0, -1, 3],
          ];
    case 1:
      return [[0, 0, dip ? 2 : 0]];
    case 2:
      return [[0, 0, dip ? 4 : 2]];
    default:
      return dip ? [] : [[0, 0, 3]];
  }
}

/** A cloud, as rows of cells relative to its top-left, on the cloud ramp. */
export interface Cloud {
  readonly x: number;
  readonly y: number;
  readonly g: TGrid;
}

/**
 * Long low clouds: lens-shaped streaks, flat beneath where the afterglow
 * lights them (the brightest step on the underside, cooler toward the top),
 * thin trailing ends. Laid on a strip `period` wide that scrolls and wraps.
 */
export function makeClouds(period: number, top: number, bottom: number): Cloud[] {
  const specs: [number, number, number, number][] = [
    // x across the strip, y as a fraction from top to bottom, length, thickness
    [0.02, 0.2, 104, 7],
    [0.33, 0.02, 58, 4],
    [0.47, 0.58, 140, 8],
    [0.72, 0.3, 80, 5],
    [0.86, 0.85, 118, 6],
    [0.2, 0.95, 66, 4],
    [0.6, 0.12, 46, 3],
    [0.12, 0.62, 52, 4],
  ];
  return specs.map(([fx, fy, len, th], k) => {
    const g: TGrid = { w: len, h: th + 2, d: new Int16Array(len * (th + 2)) };
    // A flat base lit warm from below, a lumpy top in shadow: heaps along a long body.
    const lumps = 3 + (k % 3);
    for (let x = 0; x < len; x++) {
      const u = (x + 0.5) / len;
      const body = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.85)), 0.6);
      let heap = 0;
      for (let q = 0; q < lumps; q++) {
        const c = (q + 0.5 + 0.3 * Math.sin(k * 7 + q * 3)) / lumps;
        heap = Math.max(heap, Math.max(0, 1 - Math.abs(u - c) * lumps * 1.6));
      }
      const tall = Math.round((th + 1) * body * (0.45 + 0.55 * Math.sqrt(heap)));
      if (tall <= 0) continue;
      for (let j = 0; j < tall; j++) {
        const y = th + 1 - j;
        const step =
          j === 0 ? (u < 0.7 ? 0 : 1) : j === 1 ? 1 : j >= tall - 1 ? 4 : j >= tall - 2 ? 3 : 2;
        g.d[y * len + x] = tc('cloud', step);
      }
    }
    return { x: Math.round(fx * period), y: Math.round(top + fy * (bottom - top)), g };
  });
}

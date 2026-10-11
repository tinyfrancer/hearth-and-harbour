/**
 * The harbour chart (B15): the sea chart the rowing boat opens, each dungeon
 * a landing on it. A hand-drawn chart in the game's pixel style: old paper
 * with a torn, browned edge, a double ink frame, the home harbour's coast
 * inked with wave lines offshore and hills and woods behind it, islands and
 * a far shore, soundings, rhumb lines from a compass rose, a sea serpent in
 * the margin. Day only (it is paper): rasterize with `DAY2`.
 *
 * The chart is the geography; the game's state goes on it as separate small
 * pieces with anchors, which a scene lays over it at the landings:
 * `chartMarker2(state)`, `chartEmblem2(id)` (each dungeon's own, or its
 * silhouette while locked), the rowing boat token (`chartBoat2`) and the
 * dotted route (`chartRoute2` for the points, `chartDot2` for a dot).
 *
 * Size: 340 x 300 art pixels, to fill a phone-width panel at the town's
 * scale (one art pixel to one CSS pixel on a 390-wide phone, 3 device
 * pixels each). Words are the scene's, never the picture's.
 */
import { cell, hash, outlined, put, stamp, tgrid, type Picture2, type TGrid } from './town2/cells';
import type { Mat } from './town2/ramps';
import { noise } from './town2/texture';

export const CHART2_W = 340;
export const CHART2_H = 300;

/** A point on the chart, in art pixels from its top-left. */
export interface ChartPoint2 {
  readonly x: number;
  readonly y: number;
}

/** The dungeons' landings, by dungeon id, and three for dungeons to come. */
export const CHART2_LANDINGS: Readonly<Record<string, ChartPoint2>> = {
  tidepool_cave: { x: 239, y: 116 },
  brinebeards_grotto: { x: 106, y: 170 },
  unknown_1: { x: 250, y: 178 },
  unknown_2: { x: 52, y: 133 },
  unknown_3: { x: 196, y: 262 },
};
/** Where the boat sets out from: the town's quay in the bay. */
export const CHART2_HOME: ChartPoint2 = { x: 128, y: 100 };

export interface HarbourChart2 {
  readonly picture: Picture2;
  readonly width: number;
  readonly height: number;
  readonly landings: Readonly<Record<string, ChartPoint2>>;
  readonly home: ChartPoint2;
}

const W = CHART2_W;
const H = CHART2_H;
const lim = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

/** A closed shape through points, as an inside test (even-odd at pixel centres), smoothed by subdividing. */
function shape(pts: readonly (readonly [number, number])[]): (x: number, y: number) => boolean {
  const n = pts.length;
  const dense: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    for (let k = 0; k < 6; k++) {
      const t = k / 6;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + c) * t +
          (2 * a - 5 * b + 4 * c - d) * t * t +
          (-a + 3 * b - 3 * c + d) * t * t * t);
      dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;
    let inside = false;
    for (let i = 0, j = dense.length - 1; i < dense.length; j = i++) {
      const [xi, yi] = dense[i]!;
      const [xj, yj] = dense[j]!;
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

/** The coast of home, the headland east of the bay, the islands and the far shore. */
const MAINLAND: readonly (readonly [number, number])[] = [
  [-8, -8],
  [348, -8],
  [348, 44],
  [322, 50],
  [298, 46],
  [276, 58],
  [262, 76],
  [252, 98],
  [242, 110],
  [230, 104],
  [220, 88],
  [202, 76],
  [180, 74],
  [162, 80],
  [150, 96],
  [136, 104],
  [118, 104],
  [106, 96],
  [98, 80],
  [86, 70],
  [64, 74],
  [42, 66],
  [22, 74],
  [-8, 70],
];
const GROTTO_ISLE: readonly (readonly [number, number])[] = [
  [70, 186],
  [76, 176],
  [92, 172],
  [104, 178],
  [112, 190],
  [106, 204],
  [92, 210],
  [76, 206],
];
const ISLE_SE: readonly (readonly [number, number])[] = [
  [252, 186],
  [258, 180],
  [270, 179],
  [278, 186],
  [274, 196],
  [262, 198],
];
const ISLE_W1: readonly (readonly [number, number])[] = [
  [30, 128],
  [38, 122],
  [48, 124],
  [50, 132],
  [42, 138],
  [32, 136],
];
const ISLE_W2: readonly (readonly [number, number])[] = [
  [54, 146],
  [60, 142],
  [66, 146],
  [62, 152],
  [56, 152],
];
const FAR_SHORE: readonly (readonly [number, number])[] = [
  [140, 308],
  [146, 290],
  [164, 280],
  [186, 276],
  [204, 270],
  [226, 274],
  [248, 284],
  [262, 296],
  [270, 308],
];

/** The land, as a mask, and how far every sea pixel is from it (in pixels, chamfered). */
function geography(): { land: Uint8Array; dist: Float32Array } {
  const parts = [MAINLAND, GROTTO_ISLE, ISLE_SE, ISLE_W1, ISLE_W2, FAR_SHORE].map(shape);
  const land = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      // A ragged coast: the shape's edge nudged by a little noise.
      const j = (noise(x, y, 5, 901) - 0.5) * 2.2;
      const jx = Math.round(x + j);
      const jy = Math.round(y - j);
      if (parts.some((p) => p(jx, jy))) land[y * W + x] = 1;
    }
  const dist = new Float32Array(W * H).fill(1e9);
  for (let i = 0; i < land.length; i++) if (land[i]) dist[i] = 0;
  const pass = (x: number, y: number, dx: number, dy: number, w: number) => {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
    const i = y * W + x;
    const v = dist[ny * W + nx]! + w;
    if (v < dist[i]!) dist[i] = v;
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      pass(x, y, -1, 0, 1);
      pass(x, y, 0, -1, 1);
      pass(x, y, -1, -1, 1.41);
      pass(x, y, 1, -1, 1.41);
    }
  for (let y = H - 1; y >= 0; y--)
    for (let x = W - 1; x >= 0; x--) {
      pass(x, y, 1, 0, 1);
      pass(x, y, 0, 1, 1);
      pass(x, y, 1, 1, 1.41);
      pass(x, y, -1, 1, 1.41);
    }
  return { land, dist };
}

/** Rows of characters at (x, y): '.' empty, any other a pin. */
function marks(
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
      const p = pins[ch];
      if (p) put(g, x + i, y + j, cell(p[0], p[1]));
    }
  });
}

/** A line of a cell, every pixel (or every other, dashed). */
function line(
  g: TGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  c: number,
  every = 1,
  only?: (x: number, y: number) => boolean,
): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) {
    if (i % every) continue;
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    if (!only || only(x, y)) put(g, x, y, c);
  }
}

/** Tiny figures for soundings, three wide and four tall. */
const DIGITS: Readonly<Record<string, readonly string[]>> = {
  '2': ['aa.', '..a', '.a.', 'aaa'],
  '3': ['aa.', '.aa', '..a', 'aa.'],
  '4': ['a.a', 'aaa', '..a', '..a'],
  '5': ['aaa', 'aa.', '..a', 'aa.'],
  '7': ['aaa', '..a', '.a.', '.a.'],
  '9': ['aaa', 'a.a', '.aa', '..a'],
};

/** The compass rose: an eight-pointed star in a ring, each point half lit, the north point red, a fleur at its tip. */
function compassRose(g: TGrid, cx: number, cy: number, r: number): void {
  // The ring, double.
  for (let a = 0; a < 360; a += 1) {
    const t = (a * Math.PI) / 180;
    put(g, Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), cell('ink', 3));
    if (a % 2 === 0)
      put(
        g,
        Math.round(cx + Math.cos(t) * (r - 2)),
        Math.round(cy + Math.sin(t) * (r - 2)),
        cell('ink', 2),
      );
  }
  // Ticks on the ring.
  for (let a = 0; a < 32; a++) {
    const t = (a / 32) * Math.PI * 2;
    put(
      g,
      Math.round(cx + Math.cos(t) * (r + 2)),
      Math.round(cy + Math.sin(t) * (r + 2)),
      cell('ink', 3),
    );
  }
  // The points: the four winds long, the half-winds short; each a kite split down its spine.
  const point = (dir: number, len: number, wide: number, north: boolean) => {
    const ux = Math.cos(dir);
    const uy = Math.sin(dir);
    for (let s = 0; s <= len; s++)
      for (let w = -wide; w <= wide; w++) {
        const k = 1 - s / len;
        if (Math.abs(w) > wide * k + 0.3) continue;
        const x = Math.round(cx + ux * s - uy * w * 0.9);
        const y = Math.round(cy + uy * s + ux * w * 0.9);
        const lit = w < 0;
        const m: Mat = north ? 'crimson' : 'ink';
        put(
          g,
          x,
          y,
          lit ? cell(north ? 'crimson' : 'parchment', north ? 1 : 0) : cell(m, north ? 3 : 4),
        );
      }
  };
  for (let i = 0; i < 4; i++) point(Math.PI / 4 + (i * Math.PI) / 2, r * 0.62, 3, false);
  for (let i = 0; i < 4; i++) point((i * Math.PI) / 2, r + 4, 4, i === 3);
  // The hub, gold.
  marks(g, cx - 2, cy - 2, ['.ab.', 'abbc', 'abcc', '.cc.'], {
    a: ['gold', 1],
    b: ['gold', 2],
    c: ['gold', 4],
  });
  // A fleur-de-lis over the north point.
  marks(
    g,
    cx - 3,
    cy - r - 12,
    ['...a...', '..aba..', 'a.aba.a', 'aabbbaa', '.aabaa.', '..aaa..', '.aaaaa.'],
    { a: ['ink', 4], b: ['crimson', 2] },
  );
}

/** A sea serpent in the margin: three humps out of the water, a finned head with an open mouth, waves at its coils. */
function serpent(g: TGrid, x0: number, y0: number): void {
  const water = y0 + 16;
  // Humps: half rings rising out of the water, shaded, inked.
  for (const [hx, r] of [
    [x0 + 10, 6],
    [x0 + 24, 7],
    [x0 + 38, 6],
  ] as const)
    for (let y = water - r; y <= water; y++)
      for (let x = hx - r; x <= hx + r; x++) {
        const d = Math.hypot(x + 0.5 - hx, y + 0.5 - water);
        if (d > r || d < r - 3.5) continue;
        const edge = d > r - 1 || d < r - 2.6;
        put(g, x, y, edge ? cell('ink', 4) : cell('chartsea', x < hx ? 2 : 4));
      }
  // The head, rearing at the front: a neck rising, a finned crest, a mouth open with teeth.
  marks(
    g,
    x0 + 44,
    y0,
    [
      '....aaa.....',
      '..aabbba....',
      '.abbbbbbaa..',
      'abbbcbbbbba.',
      'abbbbbaaaaa.',
      '.abbba.t.t..',
      '..abbbaaaaa.',
      '..abbbbbba..',
      '...abbba....',
      '...abba.....',
      '...abbba....',
      '....abbba...',
      '.....abbba..',
      '......abba..',
      '.......aba..',
      '.......aa...',
    ],
    { a: ['ink', 4], b: ['chartsea', 3], c: ['crimson', 2], t: ['parchment', 0] },
  );
  // A fin along its crest, and the sea round its coils.
  marks(g, x0 + 42, y0 + 1, ['a.', 'aa', '.a', 'aa'], { a: ['ink', 3] });
  for (let x = x0 - 2; x < x0 + 60; x++)
    if ((x - x0) % 7 < 4) put(g, x, water + 1 + ((x >> 2) % 2), cell('ink', 2));
}

let chart: HarbourChart2 | null = null;

/** The harbour chart: the picture and where its landings and home are on it. Drawn once and kept. */
export function harbourChart2(): HarbourChart2 {
  if (chart) return chart;
  const g = tgrid(W, H);
  const { land, dist } = geography();
  const isLand = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < W && y < H && land[y * W + x] === 1;
  const sea = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && !land[y * W + x];
  // Paper: soft stains, browned toward a torn edge.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
      const tear = 1.2 + noise(x * 0.7, y * 0.7, 6, 902) * 3.2;
      if (edge < tear - 1.5) continue;
      // Faint foxing and a stain or two: quiet, so the chart reads first.
      const n = noise(x, y, 60, 903) * 0.7 + noise(x, y, 17, 904) * 0.3;
      let t = 0.6 + (n > 0.7 ? 1 : 0);
      if (edge < 14) t += (14 - edge) / 7 + (noise(x, y, 5, 905) - 0.5) * 0.8;
      if (edge < tear + 1) t = 4.4;
      g.d[y * W + x] = cell('parchment', lim(t, 0, 5));
    }
  const onPaper = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < W && y < H && g.d[y * W + x] !== 0;
  // The sea's wash, deepest along the coast, fading out to plain paper.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (land[i] || !g.d[i]) continue;
      const d = dist[i]! + (noise(x, y, 7, 906) - 0.5) * 3;
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (edge < 12) continue;
      if (d < 4) g.d[i] = cell('chartsea', 3);
      else if (d < 11) g.d[i] = cell('chartsea', 2);
      else if (d < 22) g.d[i] = cell('chartsea', 1);
      else g.d[i] = cell('chartsea', noise(x, y, 30, 907) > 0.7 ? 1 : 0);
    }
  // Rhumb lines from the rose, faint and dotted, over the sea only.
  const rose = { x: 292, y: 232 };
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    line(
      g,
      rose.x,
      rose.y,
      rose.x + Math.cos(a) * 420,
      rose.y + Math.sin(a) * 420,
      cell('ink', k % 4 === 0 ? 1 : 0),
      k % 2 ? 3 : 2,
      (x, y) => sea(x, y) && onPaper(x, y) && Math.hypot(x - rose.x, y - rose.y) > 30,
    );
  }
  // Wave lines offshore: two broken lines following the coast.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (land[i] || !g.d[i]) continue;
      const d = dist[i]!;
      if (Math.abs(d - 3.2) < 0.55 && noise(x, y, 4, 908) > 0.3) g.d[i] = cell('ink', 2);
      else if (Math.abs(d - 6.6) < 0.5 && noise(x, y, 5, 909) > 0.5) g.d[i] = cell('ink', 1);
    }
  // The land: paper a little warmer, its coast inked, lit along its seaward lip.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!land[i] || !g.d[i]) continue;
      const coast = sea(x - 1, y) || sea(x + 1, y) || sea(x, y - 1) || sea(x, y + 1);
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (coast) g.d[i] = cell('ink', 4);
      else if (edge < 12) continue;
      else if (sea(x, y + 2) || sea(x + 2, y) || sea(x, y + 3)) g.d[i] = cell('parchment', 4);
      else {
        // The land in a warm wash, a green band of shore behind the coast.
        const n = noise(x, y, 18, 910);
        let near = 99;
        for (const [dx, dy] of [
          [0, 6],
          [6, 0],
          [-6, 0],
          [0, -6],
          [4, 4],
          [-4, 4],
        ] as const)
          if (sea(x + dx, y + dy)) near = 6;
        g.d[i] = near < 99 && n > 0.25 ? cell('mossdye', 0) : cell('parchment', n > 0.78 ? 3 : 2);
      }
    }
  // Hills: little inked hummocks with a shaded side, in rows behind the coast.
  const hill = (x: number, y: number, w: number) => {
    for (let i = -w; i <= w; i++) {
      const hy = Math.round(y - Math.sqrt(Math.max(0, 1 - (i / w) ** 2)) * (w * 0.7));
      if (!isLand(x + i, hy)) continue;
      put(g, x + i, hy, cell('ink', 3));
      if (i > 0)
        for (let k = 1; k < 3; k++)
          if (isLand(x + i, hy + k)) put(g, x + i, hy + k, cell('parchment', 4));
    }
  };
  for (const [x, y, w] of [
    [30, 40, 7],
    [52, 32, 9],
    [76, 46, 6],
    [200, 40, 8],
    [226, 54, 6],
    [262, 30, 9],
    [300, 24, 7],
    [320, 36, 5],
    [190, 284, 6],
    [222, 290, 7],
    [88, 190, 5],
  ] as const)
    hill(x, y, w);
  // Woods: tiny inked pines in clumps.
  const pine = (x: number, y: number) => {
    if (!isLand(x, y) || !isLand(x, y - 4)) return;
    marks(g, x - 2, y - 5, ['..a..', '.aba.', '.aba.', 'abbba', '..a..'], {
      a: ['ink', 4],
      b: ['pine', 2],
    });
  };
  for (let i = 0; i < 46; i++) {
    const x = 8 + Math.floor(hash(i, 1, 911) * 324);
    const y = 12 + Math.floor(hash(i, 2, 911) * 46);
    if (Math.abs(x - 128) < 30 && y > 40) continue;
    pine(x, y);
  }
  // Home: the town on the bay, its roofs red and slate, the quay out into the water.
  marks(
    g,
    110,
    76,
    [
      '.........ttt..........',
      '........ttttt.........',
      '.......tttttttc.......',
      '........hhhhh.c.......',
      '..rrrrrr.hdhh....sss..',
      '.rrrrrrrr.......sssss.',
      'rrrrrrrrrr.....sssssss',
      'RRRRRRRRRR.....SSSSSSS',
      'hwhwhwhwhh.....hhwhhhh',
      'hhhhhhdhhh.....hhhdhhh',
      'hhhhhhdhhh.....hhhdhhh',
      '......................',
      'qqqqqqqqqqqqqqqqqqqqqq',
      'QQQQQQQQQQQQQQQQQQQQQQ',
    ],
    {
      r: ['tile', 1],
      R: ['tile', 3],
      s: ['slate', 1],
      S: ['slate', 3],
      h: ['plaster', 1],
      w: ['glass', 2],
      d: ['wood', 3],
      t: ['thatch', 1],
      c: ['stone', 3],
      q: ['stone', 2],
      Q: ['stone', 4],
    },
  );
  for (let y = 90; y < 108; y++) {
    put(g, 127, y, cell('wood', 2));
    put(g, 128, y, cell('wood', 3));
    put(g, 129, y, cell('ink', 4));
  }
  // A little lighthouse on the headland east of the bay, its light a dot of gold.
  marks(g, 254, 72, ['.g.', 'aaa', '.c.', '.a.', '.c.', 'aaa'], {
    a: ['ink', 4],
    c: ['crimson', 2],
    g: ['gold', 1],
  });
  // Soundings: the depth in tiny figures, scattered over the open sea.
  const keys = Object.keys(DIGITS);
  for (let i = 0; i < 26; i++) {
    const x = 16 + Math.floor(hash(i, 3, 912) * 304);
    const y = 110 + Math.floor(hash(i, 4, 912) * 170);
    if (dist[y * W + x]! < 8 || Math.hypot(x - rose.x, y - rose.y) < 36) continue;
    if (x < 100 && y > 240) continue;
    const near = Object.values(CHART2_LANDINGS).some((p) => Math.hypot(p.x - x, p.y - y) < 18);
    if (near) continue;
    const a = keys[Math.floor(hash(i, 5, 912) * keys.length)]!;
    marks(g, x, y, DIGITS[a]!, { a: ['ink', 2] });
    if (hash(i, 6, 912) < 0.5)
      marks(g, x + 4, y, DIGITS[keys[(i + 2) % keys.length]!]!, { a: ['ink', 2] });
  }
  // Rocks and reefs: little crosses (a rock awash) and dots.
  for (const [x, y] of [
    [150, 150],
    [158, 156],
    [214, 200],
    [120, 236],
    [300, 150],
  ] as const)
    marks(g, x - 1, y - 1, ['a.a', '.a.', 'a.a'], { a: ['ink', 3] });
  compassRose(g, rose.x, rose.y, 20);
  serpent(g, 20, 252);
  // The frame: a double ink rule inset from the edge, corners squared off with a block.
  for (const [inset, t] of [
    [8, 3],
    [10, 2],
  ] as const) {
    line(g, inset, inset, W - 1 - inset, inset, cell('ink', t));
    line(g, inset, H - 1 - inset, W - 1 - inset, H - 1 - inset, cell('ink', t));
    line(g, inset, inset, inset, H - 1 - inset, cell('ink', t));
    line(g, W - 1 - inset, inset, W - 1 - inset, H - 1 - inset, cell('ink', t));
  }
  for (const [x, y] of [
    [6, 6],
    [W - 13, 6],
    [6, H - 13],
    [W - 13, H - 13],
  ] as const)
    marks(g, x, y, ['aaaaaaa', 'abbbbba', 'ab...ba', 'ab.c.ba', 'ab...ba', 'abbbbba', 'aaaaaaa'], {
      a: ['ink', 4],
      b: ['parchment', 1],
      c: ['crimson', 2],
    });
  chart = {
    picture: { grid: g, glows: [] },
    width: W,
    height: H,
    landings: CHART2_LANDINGS,
    home: CHART2_HOME,
  };
  return chart;
}

/* ------------------------------------------------------------- the pieces */

/** A small piece to lay on the chart: its picture and the point of it that goes on a landing. */
export interface ChartPiece2 {
  readonly picture: Picture2;
  readonly anchor: ChartPoint2;
}

export const CHART_MARKER2_STATES = ['open', 'cleared', 'locked', 'unknown', 'selected'] as const;
export type ChartMarker2State = (typeof CHART_MARKER2_STATES)[number];

const pieces = new Map<string, ChartPiece2>();
const kept = (key: string, make: () => ChartPiece2): ChartPiece2 => {
  let p = pieces.get(key);
  if (!p) {
    p = make();
    pieces.set(key, p);
  }
  return p;
};

/** An outlined piece from rows, its anchor given in the rows' own coordinates (moved one in by the outline). */
function piece(
  rows: readonly string[],
  pins: Readonly<Record<string, readonly [Mat, number]>>,
  ax: number,
  ay: number,
  outline = true,
): ChartPiece2 {
  const g = tgrid(rows[0]!.length, rows.length);
  marks(g, 0, 0, rows, pins);
  if (!outline) {
    const pad = tgrid(g.w + 2, g.h + 2);
    stamp(pad, g, 1, 1);
    return { picture: { grid: pad, glows: [] }, anchor: { x: ax + 1, y: ay + 1 } };
  }
  return { picture: { grid: outlined(g), glows: [] }, anchor: { x: ax + 1, y: ay + 1 } };
}

/**
 * A landing's marker, standing on its point (its anchor at the pole's foot):
 * `open`, a red pennant flying; `cleared`, the pennant gold with a gold seal
 * at its foot; `locked`, the pennant furled grey with a padlock; `unknown`,
 * a dotted ring of mist round a question; `selected`, a gold ring with
 * ticks, laid round whichever marker is chosen (its anchor its middle).
 */
export function chartMarker2(state: ChartMarker2State): ChartPiece2 {
  return kept(`marker ${state}`, () => {
    switch (state) {
      case 'open':
        return piece(
          [
            'pf.......',
            'pffff....',
            'pfFFfff..',
            'pfFFFfff.',
            'pfffff...',
            'pff......',
            'p........',
            'p........',
            'p........',
            'p........',
            'p........',
            'p........',
            'g........',
          ],
          { p: ['wood', 3], f: ['crimson', 2], F: ['crimson', 1], g: ['gold', 2] },
          0,
          12,
        );
      case 'cleared':
        return piece(
          [
            '.pf.......',
            '.pffff....',
            '.pfFFfff..',
            '.pfFFFfff.',
            '.pfffff...',
            '.pff......',
            '.p........',
            '.p........',
            '.p........',
            '.p........',
            '.ggg......',
            'gGGgg.....',
            'gGggg.....',
            '.ggg......',
          ],
          { p: ['wood', 3], f: ['gold', 2], F: ['gold', 1], g: ['gold', 3], G: ['gold', 1] },
          1,
          12,
        );
      case 'locked':
        return piece(
          [
            '.p......',
            '.pf.....',
            '.pff....',
            '.pff....',
            '.pf.....',
            '.p......',
            '.p......',
            '.p.aaa..',
            '.p.a.a..',
            '.pbbbbb.',
            '.pbbcbb.',
            '.pbbcbb.',
            '.pbbbbb.',
          ],
          { p: ['ink', 3], f: ['stone', 3], a: ['iron', 2], b: ['iron', 3], c: ['ink', 5] },
          1,
          12,
        );
      case 'unknown':
        return piece(
          [
            '....a.a.a....',
            '..a.......a..',
            '.....qqq.....',
            'a...qq.qq...a',
            '.......qq....',
            'a.....qq....a',
            '.....qq......',
            'a...........a',
            '.....qq......',
            '..a.......a..',
            '....a.a.a....',
          ],
          { a: ['ink', 3], q: ['ink', 5] },
          6,
          5,
          false,
        );
      case 'selected': {
        const S = 27;
        const g = tgrid(S, S);
        const c = (S - 1) / 2;
        for (let y = 0; y < S; y++)
          for (let x = 0; x < S; x++) {
            const d = Math.hypot(x - c, y - c);
            if (d > 10.4 && d < 12.6) put(g, x, y, cell('gold', d < 11.5 ? 1 : 3));
          }
        for (const [dx, dy] of [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ] as const)
          for (let k = 13; k <= 13; k++) {
            put(g, Math.round(c + dx * k), Math.round(c + dy * k), cell('gold', 2));
            put(g, Math.round(c + dx * k) + dy, Math.round(c + dy * k) + dx, cell('gold', 2));
          }
        return { picture: { grid: outlined(g), glows: [] }, anchor: { x: c + 1, y: c + 1 } };
      }
    }
  });
}

/** The rowing boat as a token on the chart, from above a little: oars out, its middle the anchor. */
export function chartBoat2(facing: 'left' | 'right' = 'right'): ChartPiece2 {
  return kept(`boat ${facing}`, () => {
    const rows = [
      '...o.....o......',
      '....o...o.......',
      '..wwwwwwwwwww...',
      '.wWWWWWWWWWWWww.',
      'wWWbbWWWWbbWWWww',
      '.wwwwwwwwwwwwww.',
      '..wwwwwwwwwww...',
      '....o...o.......',
      '...o.....o......',
    ];
    const r = facing === 'left' ? rows.map((s) => [...s].reverse().join('')) : rows;
    return piece(r, { w: ['wood', 3], W: ['wood', 1], b: ['wood', 4], o: ['wood', 2] }, 8, 4);
  });
}

/** One dot of a route, red ink. */
export function chartDot2(): ChartPiece2 {
  return kept('dot', () =>
    piece(['.a.', 'aba', '.a.'], { a: ['crimson', 3], b: ['crimson', 2] }, 1, 1, false),
  );
}

/**
 * A route's dots from one point to another: a gentle curve (bowed to the
 * right of the way, by `bend` of its length), a dot every `step` pixels,
 * the ends left clear for the markers. Lay `chartDot2()` at each, or show
 * the first `n` for a boat on its way.
 */
export function chartRoute2(
  from: ChartPoint2,
  to: ChartPoint2,
  o: { step?: number; bend?: number } = {},
): ChartPoint2[] {
  const step = o.step ?? 7;
  const bend = o.bend ?? 0.18;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const mx = (from.x + to.x) / 2 - (dy / len) * len * bend;
  const my = (from.y + to.y) / 2 + (dx / len) * len * bend;
  const at = (t: number) => ({
    x: (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * mx + t * t * to.x,
    y: (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * my + t * t * to.y,
  });
  // Walk the curve finely and drop a dot every `step` of its length.
  const out: ChartPoint2[] = [];
  let prev = at(0);
  let run = 0;
  const N = 400;
  for (let i = 1; i <= N; i++) {
    const p = at(i / N);
    run += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
    if (run >= step) {
      run -= step;
      const fromEnd = Math.min(
        Math.hypot(p.x - from.x, p.y - from.y),
        Math.hypot(p.x - to.x, p.y - to.y),
      );
      if (fromEnd > 8) out.push({ x: Math.round(p.x), y: Math.round(p.y) });
    }
  }
  return out;
}

/**
 * Each dungeon's emblem for its landing, about 18 pixels: the grotto's a
 * skull over crossed cutlasses, the tide-pool cave's a turtle's shell with a
 * starfish. `silhouette` draws it as a flat ink shape (a locked landing).
 * Null for any other id. Its anchor is its middle.
 */
export function chartEmblem2(id: string, silhouette = false): ChartPiece2 | null {
  const def = EMBLEMS[id];
  if (!def) return null;
  return kept(`emblem ${id} ${silhouette}`, () => {
    const pins = silhouette
      ? Object.fromEntries(Object.keys(def.pins).map((k) => [k, ['ink', 4] as const]))
      : def.pins;
    const p = piece(
      def.rows,
      pins,
      Math.floor(def.rows[0]!.length / 2),
      Math.floor(def.rows.length / 2),
    );
    return p;
  });
}

const EMBLEMS: Readonly<
  Record<
    string,
    { rows: readonly string[]; pins: Readonly<Record<string, readonly [Mat, number]>> }
  >
> = {
  brinebeards_grotto: {
    rows: [
      'c...............c',
      '.c.....sss.....c.',
      '..c..ssSSSss..c..',
      '...cssSSSSSssc...',
      '....sSkSSSkSs....',
      '....sSkkSkkSs....',
      '....ssSSnSSss....',
      '...c.ssSSSss.c...',
      '..c...stttts..c..',
      '.h.....tttt....h.',
      'hh.............hh',
    ],
    pins: {
      c: ['iron', 1],
      h: ['bronze', 2],
      s: ['cream', 3],
      S: ['cream', 1],
      k: ['ink', 5],
      n: ['ink', 4],
      t: ['cream', 2],
    },
  },
  tidepool_cave: {
    rows: [
      '.....aaaaa.........',
      '...aabbbbbaa.......',
      '..abbcbbbcbba......',
      '.abbbcbppcbbba.hhh.',
      '.acccccppcccca.hkhh',
      'tbbbbcbbbbcbbbhhhhh',
      'tbbbbcbbbbcbbbhhh..',
      '.accccccccccca.....',
      '..h.aaaaaaa.h......',
      '..h.........h......',
    ],
    pins: {
      a: ['moss', 4],
      b: ['moss', 2],
      c: ['moss', 4],
      h: ['grass', 3],
      k: ['ink', 5],
      p: ['plum', 2],
      t: ['grass', 4],
    },
  },
};

/** The emblems drawn, by dungeon id. */
export const CHART_EMBLEM2_IDS: readonly string[] = Object.keys(EMBLEMS);

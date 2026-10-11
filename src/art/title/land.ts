/**
 * The land above the waterline, back to front: two ranges of far hills in
 * haze, a far forest, the nearer woods either side of the town, the town's
 * own hill with your house on its broad shoulder and a path down to the quay,
 * and the quay itself. Everything is laid out from the middle of the town
 * (`cx`) and the waterline (`wl`), and the scenery beyond the town is a
 * function of distance from the middle, so a wider screen shows more shore
 * and woods without moving the town.
 *
 * Each far layer is one flat colour with a lit rim on the slopes that face
 * the light: clean silhouettes, each a step nearer the night than the one
 * behind it (atmospheric steps), never noise.
 *
 * Cody's fault with the study was the house sitting on a hump narrower than
 * itself. The hill here is shaped round the house: a shoulder three times the
 * house's width, its flat top seen as a strip of ground in front of and
 * either side of the house, falling away in slopes that go down behind the
 * tavern and the smithy, with a fenced garden, a tree, and the path.
 */
import { hash, put, at, type TGrid } from '../town2/cells';
import { tc, type TitleMat } from './ramps';

const C = (m: TitleMat, t: number): number => tc(m, t);

export interface LandFrame {
  readonly w: number;
  readonly cx: number;
  readonly wl: number;
}

/** Marks ground cells (what a building may stand on) as they are painted. */
export type Ground = Uint8Array;

/** The shoulder of the hill: where its flat top runs and the row it is at. */
export const SHOULDER = { l: -92, r: 78, back: -104, front: -91 } as const;
/** The house's ground row, on the shoulder. */
export const HOUSE_GROUND = -96;
/** Where the tavern's and smithy's feet stand: the quay's top. */
export const QUAY_GROUND = -10;
/** The quay's top front edge (the pier leaves the quay here). */
export const QUAY_FRONT = -6;

/** A ridge's top at distance `rx` from the middle: sums of slow waves, peaked here and there. */
function ridge(rx: number, base: number, k: number, amp: number): number {
  return (
    base +
    amp * Math.sin(rx / 83 + k) +
    amp * 0.55 * Math.sin(rx / 37 + k * 2.1) +
    amp * 0.25 * Math.sin(rx / 17 + k * 3.7)
  );
}

/** A far range: one colour, a lit rim where the slope faces left, down to `bottom`. */
function range(
  g: TGrid,
  f: LandFrame,
  top: (rx: number) => number,
  m: TitleMat,
  body: number,
  rim: number,
  bottom: number,
) {
  // Cells worked out once and written straight in: this runs for every pixel of two ranges.
  const rimC = C(m, rim);
  const bodyC = C(m, body);
  const d = g.d;
  for (let x = 0; x < f.w; x++) {
    const rx = x - f.cx;
    const t = Math.round(top(rx));
    const edge = t + (top(rx + 2) < top(rx - 2) - 0.6 ? 2 : 1);
    for (let y = Math.max(0, t); y < bottom; y++) d[y * f.w + x] = y < edge ? rimC : bodyC;
  }
}

/** A small pine as a tiered silhouette, its sunward edge lit. */
function pine(
  g: TGrid,
  cx: number,
  base: number,
  h: number,
  m: TitleMat,
  body: number,
  lit: number,
  shade: number,
) {
  const tiers = Math.max(3, Math.round(h / 7));
  const crown = h - 2;
  const litC = C(m, lit);
  const bodyC = C(m, body);
  const shadeC = C(m, shade);
  for (let y = base - 2; y < base; y++) put(g, cx, y, shadeC);
  for (let t = 0; t < tiers; t++) {
    const ty0 = base - h + Math.round((t / tiers) * crown * 0.82);
    const ty1 = base - h + Math.round(((t + 1) / tiers) * crown) + 1;
    const maxHalf = 1 + ((t + 1) / tiers) * h * 0.2 * (0.9 + hash(t, cx, 3) * 0.25);
    for (let y = ty0; y < ty1; y++) {
      const f = (y - ty0) / Math.max(1, ty1 - ty0);
      const half = Math.round(maxHalf * (0.25 + 0.75 * f));
      for (let x = cx - half; x <= cx + half; x++) {
        const under = y >= ty1 - 1 && half > 1;
        const left = x <= cx - half + (half > 2 ? 1 : 0) && !under;
        put(g, x, y, left ? litC : under || x > cx + half / 2 ? shadeC : bodyC);
      }
    }
  }
  put(g, cx, base - h - 1, litC);
}

/** The far hills, the far forest and the woods either side of the town. */
export function paintFar(g: TGrid, f: LandFrame): void {
  const { wl } = f;
  // The farthest range, palest, peaked behind the left of the town.
  range(
    g,
    f,
    (rx) => ridge(rx, wl - 150, 1.3, 11) - 14 * Math.exp(-(((rx + 90) / 70) ** 2)),
    'haze',
    1,
    0,
    wl,
  );
  // The nearer range, a step darker, lower in the middle where the town's valley opens.
  range(
    g,
    f,
    (rx) => ridge(rx, wl - 124, 4.1, 8) + 10 * Math.exp(-((rx / 120) ** 2)),
    'haze',
    2,
    1,
    wl,
  );
  // The far forest: a ragged band of pine tops on the near range's foot.
  g.d.fill(C('haze', 4), (wl - 98) * f.w, wl * f.w);
  const span = Math.ceil(f.w / 2) + 12;
  for (let i = -Math.ceil(span / 7); i <= Math.ceil(span / 7); i++) {
    const x = f.cx + i * 7 + Math.floor(hash(i, 1, 21) * 5) - 2;
    const base = wl - 94 + Math.floor(hash(i, 2, 21) * 6);
    pine(g, x, base, 13 + Math.floor(hash(i, 3, 21) * 10), 'haze', 4, 3, 5);
  }
  // The nearer woods, big dark pines either side of the town, thinning toward the middle.
  for (let i = -Math.ceil(span / 9); i <= Math.ceil(span / 9); i++) {
    const rx = i * 9 + Math.floor(hash(i, 4, 22) * 6) - 3;
    if (Math.abs(rx) < 70) continue;
    const base =
      wl -
      58 +
      Math.floor(hash(i, 5, 22) * 10) -
      Math.round(Math.max(0, 140 - Math.abs(rx)) * 0.12);
    pine(g, f.cx + rx, base, 22 + Math.floor(hash(i, 6, 22) * 14), 'haze', 5, 4, 6);
  }
  // The woods' floor either side of the town's valley.
  const floor = C('haze', 5);
  const gapL = Math.max(0, f.cx - 59);
  const gapR = Math.min(f.w, f.cx + 60);
  for (let y = wl - 52; y < wl; y++) {
    g.d.fill(floor, y * f.w, y * f.w + gapL);
    g.d.fill(floor, y * f.w + gapR, (y + 1) * f.w);
  }
}

/** The hill's top edge at `rx`: the broad shoulder in the middle, slopes either side. */
export function hillTop(rx: number): number {
  const { l, r, back } = SHOULDER;
  if (rx >= l && rx <= r) {
    // A shallow crown, so the shoulder reads as a rounded hilltop, not a shelf.
    const u = (rx - (l + r) / 2) / ((r - l) / 2);
    return back + Math.round(u * u * 2);
  }
  const d = rx < l ? l - rx : rx - r;
  // The slope eases off the shoulder and onto the low ground (a cosine, not a
  // ruled line), a little uneven on the way down, then rolls on to the edges.
  const span = rx < l ? 96 : 84;
  const low = -46 + 4 * Math.sin(rx / 23);
  const f = Math.min(1, d / span);
  const ease = (1 - Math.cos(f * Math.PI)) / 2;
  const wobble = 2.2 * Math.sin(d / 11 + (rx < l ? 1 : 3)) * Math.sin(f * Math.PI);
  return Math.round(back + 2 + (low - back - 2) * ease + wobble);
}

/**
 * The hill: dusk grass shaded as a solid (lit on the left slope, in shadow on
 * the right), the shoulder's flat top a lighter strip, a low stone wall along
 * its front edge, the slope's face below it with a path in turns down to the
 * pier's head.
 */
export function paintHill(g: TGrid, ground: Ground, f: LandFrame): void {
  const { wl, cx, w } = f;
  const grassC = [0, 1, 2, 3, 4, 5].map((t) => C('grass', t));
  for (let x = 0; x < w; x++) {
    const rx = x - cx;
    const top = wl + hillTop(rx);
    const slope = (hillTop(rx + 4) - hillTop(rx - 4)) / 2;
    for (let y = Math.max(0, top); y < wl + QUAY_GROUND; y++) {
      const depth = y - top;
      const onShoulder = rx >= SHOULDER.l && rx <= SHOULDER.r && y < wl + SHOULDER.front;
      // At dusk the grass is in its shadow steps; the sunward slope a step up, its rim lit.
      let t = 4;
      if (onShoulder) t = depth < 1 ? 2 : 3;
      else if (depth === 0) t = slope > 0 ? 2 : 3;
      else if (slope > 1.2) t = depth < 3 ? 3 : 4;
      else if (slope < -1.2) t = 5;
      else {
        // The face: contour terraces, each lit along its top and shaded under its lip.
        const band = (y - wl) % 9;
        if (band === 0 && hash(x >> 3, y, 31) < 0.8) t = 3;
        else if (band === 1 && hash(x >> 3, y - 1, 31) < 0.8) t = 5;
      }
      // Toward the quay the face falls into the buildings' and the evening's shadow.
      if (!onShoulder && y > wl - 28 && t < 5 && hash(x >> 1, y >> 1, 35) < (y - (wl - 28)) / 30)
        t++;
      g.d[y * w + x] = grassC[t] as number;
      ground[y * w + x] = 1;
    }
  }
  // The shoulder's front edge: a low dry-stone wall, lit on top.
  const fy = wl + SHOULDER.front;
  for (let x = cx + SHOULDER.l + 6; x < cx + SHOULDER.r - 4; x++) {
    put(g, x, fy, C('stone', x % 5 === 0 ? 3 : 1));
    put(g, x, fy + 1, C('stone', (x + 2) % 5 === 0 ? 5 : 3));
    put(g, x, fy + 2, C('grass', 5));
  }
}

/** The path from the house's door down the face in turns to the pier's head. */
export function paintPath(g: TGrid, f: LandFrame, from: number, to: number): void {
  const { wl, cx } = f;
  const pts: [number, number][] = [
    [from, HOUSE_GROUND + 1],
    [from + 2, SHOULDER.front],
    [from + 26, -78],
    [from - 18, -60],
    [from + 16, -40],
    [to - 4, -22],
    [to, QUAY_GROUND + 1],
  ];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i]!;
    const [bx, by] = pts[i + 1]!;
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let s = 0; s <= n; s++) {
      const x = Math.round(ax + ((bx - ax) * s) / n);
      const y = Math.round(ay + ((by - ay) * s) / n);
      const steep = Math.abs(by - ay) > Math.abs(bx - ax);
      const half = steep ? 2 : 1;
      for (let dx = -half; dx <= half; dx++)
        for (let dy = 0; dy <= (steep ? 0 : 1); dy++) {
          const c = at(g, cx + x + dx, wl + y + dy);
          if (!c) continue;
          const lip = dy === 0 && !steep;
          put(g, cx + x + dx, wl + y + dy, C('dirt', lip ? 2 : dx === -half ? 3 : 4));
        }
      // Steps where it is steep: a lit tread every few rows.
      if (steep && (wl + y) % 4 === 0)
        for (let dx = -2; dx <= 2; dx++) put(g, cx + x + dx, wl + y, C('dirt', 1));
    }
  }
}

/** A round bush or small tree crown: lit upper left, its underside dark. */
export function bush(
  g: TGrid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  m: TitleMat = 'leaf',
) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const u = (x + 0.5 - cx) / rx;
      const v = (y + 0.5 - cy) / ry;
      const lump = 0.12 * Math.sin(x * 1.7 + y) + 0.1 * Math.sin(y * 2.3 - x);
      if (u * u + v * v > 1 + lump) continue;
      const light = -u * 0.6 - v * 0.8;
      put(g, x, y, C(m, light > 0.45 ? 2 : light > -0.1 ? 3 : light > -0.6 ? 4 : 5));
    }
}

/** The garden on the shoulder: a fence along the front with a gate at the path, a tree, a bush. */
export function paintGarden(g: TGrid, f: LandFrame, gate: number): void {
  const { wl, cx } = f;
  const fy = wl + SHOULDER.front - 1;
  for (let x = cx + SHOULDER.l + 10; x < cx + SHOULDER.r - 8; x++) {
    if (Math.abs(x - (cx + gate)) < 4) continue;
    put(g, x, fy - 2, C('wood', 2));
    if ((x - cx) % 3 === 0) {
      put(g, x, fy - 3, C('wood', 2));
      put(g, x, fy - 1, C('wood', 4));
    }
  }
  // A small oak to the house's right, its trunk on the shoulder.
  const tx = cx + 52;
  for (let y = wl + HOUSE_GROUND - 12; y < wl + HOUSE_GROUND + 2; y++) {
    put(g, tx, y, C('bark', 2));
    put(g, tx + 1, y, C('bark', 4));
  }
  bush(g, tx - 4, wl + HOUSE_GROUND - 22, 9, 8);
  bush(g, tx + 6, wl + HOUSE_GROUND - 18, 8, 7);
  bush(g, tx + 1, wl + HOUSE_GROUND - 28, 7, 6);
  // A bush by the left of the house, and a pine at the shoulder's left end.
  bush(g, cx - 50, wl + HOUSE_GROUND - 3, 6, 4);
  pine(g, cx + SHOULDER.l + 8, wl + HOUSE_GROUND + 2, 30, 'pine', 3, 2, 4);
  // Shrubs on the face, either side of the path, and a hedge along a terrace.
  for (const [bx, by, r] of [
    [-46, -72, 5],
    [38, -64, 6],
    [-36, -44, 4],
    [46, -36, 5],
    [-50, -24, 4],
  ] as const)
    bush(g, cx + bx, wl + by, r, Math.round(r * 0.75));
  // A hedge along one terrace, as a row of small clumps with gaps.
  for (let x = cx + 8; x < cx + 46; x += 5) bush(g, x, wl - 48 + ((x >> 2) & 1), 3, 2);
  // Small pines down the hill's sides, where its slopes go behind the tavern and the smithy.
  for (const [px, base, h] of [
    [-104, -86, 24],
    [-116, -78, 20],
    [92, -86, 22],
    [106, -80, 26],
    [122, -70, 20],
  ] as const)
    pine(g, cx + px, wl + base, h, 'pine', 4, 3, 5);
  // B17: the face was quiet. A dry-stone wall runs across the left of it, following the slope, a
  // gap for a gate in it; sheep graze either side of the path, and on the right a few dots of
  // gorse in flower.
  for (let x = -60; x <= -28; x++) {
    const y = Math.round(-47 + (x + 60) * 0.38 + Math.sin(x / 5) * 0.8);
    if (x > -40 && x < -36) continue;
    put(g, cx + x, wl + y, C('stone', (x & 3) === 0 ? 2 : 0));
    put(g, cx + x, wl + y + 1, C('stone', (x & 3) === 2 ? 5 : 4));
  }
  for (const [sx, sy, face] of [
    [-50, -66, 1],
    [-42, -61, -1],
    [-52, -38, 1],
    [26, -60, -1],
  ] as const) {
    // A sheep: a woolly body two rows deep, its dark head down to the grass.
    for (let i = 0; i < 4; i++) {
      put(g, cx + sx + i, wl + sy, C('sail', i === 1 ? 0 : 1));
      put(g, cx + sx + i, wl + sy + 1, C('sail', 3));
    }
    const hx = face > 0 ? sx + 4 : sx - 1;
    put(g, cx + hx, wl + sy + 1, C('tar', 4));
    put(g, cx + sx + 1, wl + sy + 2, C('tar', 5));
    put(g, cx + sx + 3, wl + sy + 2, C('tar', 5));
  }
  for (const [gx, gy] of [
    [30, -74],
    [34, -71],
    [58, -60],
    [62, -58],
    [20, -56],
  ] as const) {
    put(g, cx + gx, wl + gy, C('gold', 2));
    put(g, cx + gx + 1, wl + gy, C('gold', 3));
    put(g, cx + gx, wl + gy + 1, C('leaf', 4));
  }
  // Stones lying on the face in twos and threes.
  for (const [sx, sy] of [
    [-26, -80],
    [24, -46],
    [-18, -30],
  ] as const) {
    put(g, cx + sx, wl + sy, C('rock', 2));
    put(g, cx + sx + 1, wl + sy, C('rock', 3));
    put(g, cx + sx, wl + sy + 1, C('rock', 4));
    put(g, cx + sx + 1, wl + sy + 1, C('rock', 5));
    put(g, cx + sx + 3, wl + sy + 1, C('rock', 3));
  }
}

/**
 * The quay: a cobbled top seen at a low angle (four rows), then its wall in
 * courses, dark and weeded at the tide line, along the whole waterfront. At
 * the edges of a wide screen it gives way to a rocky shore under the woods.
 */
export function paintQuay(g: TGrid, ground: Ground, f: LandFrame, l: number, r: number): void {
  const { wl, cx, w } = f;
  for (let x = 0; x < w; x++) {
    const rx = x - cx;
    if (rx < l || rx > r) {
      // The shore beyond the quay: boulders and shingle at the water, the woods' foot behind.
      const lift = Math.round(Math.min(18, (rx < l ? l - rx : rx - r) * 0.18));
      const top = wl - 8 - lift + Math.round(2 * Math.sin(rx / 9));
      for (let y = top; y < wl; y++) {
        const t =
          y - top < 1 ? 2 : 3 + (hash(x >> 2, y >> 1, 41) < 0.3 ? 1 : 0) + (y > wl - 3 ? 1 : 0);
        put(g, x, y, C('rock', t));
      }
      continue;
    }
    for (let y = wl + QUAY_GROUND; y < wl + QUAY_FRONT; y++) {
      const row = y - (wl + QUAY_GROUND);
      const cob = (x + (row & 1) * 2) % 4 === 0;
      put(g, x, y, C('cobble', row === 3 ? 2 : cob ? 4 : 3));
      ground[y * w + x] = 1;
    }
    for (let y = wl + QUAY_FRONT; y < wl; y++) {
      const row = y - (wl + QUAY_FRONT);
      const joint = row === 2 || (x + (row > 2 ? 7 : 0)) % 13 === 0;
      const m: TitleMat = row >= 4 ? 'moss' : 'stone';
      put(g, x, y, C(m, row >= 4 ? (row === 4 ? 4 : 5) : row === 0 ? 1 : joint ? 5 : 3));
    }
  }
  // Steps down the wall's ends to the water.
  for (const ex of [l, r]) put(g, cx + ex, wl + QUAY_FRONT, C('stone', 0));
}

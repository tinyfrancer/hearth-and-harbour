/**
 * The C-scale town's trees, drawn fresh (the scale study's pine was a stack
 * of blobby cones). A pine is tiers of drooping boughs: each bough's upper
 * face catches the light, lit most on the sun's side; its underside is in
 * shadow; its tips droop in needle clumps; each tier casts a band of shadow
 * on the one below it, and the trunk shows in the gaps. Three pines differ in
 * height, spread and how their tiers fall. The oak is a broadleaf: a crown of
 * leafy clumps, each a solid lit from the upper left, small leaf clusters on
 * every clump, the crown's underside dark, limbs showing through the gaps.
 */
import {
  at,
  cell,
  dim,
  hash,
  isMat,
  outlined,
  put,
  tgrid,
  type Picture2,
  type TGrid,
} from './cells';
import { m } from './scale';
import { clamp, clumps, cyl, fbm } from './texture';

const C = cell;

/** A tree: its drawing and where its trunk meets the ground, from its top-left. */
export interface Tree {
  readonly picture: Picture2;
  readonly base: number;
  /** The middle of the trunk at the ground. */
  readonly foot: number;
}

interface PineShape {
  readonly height: number;
  readonly spread: number;
  readonly tiers: number;
  /** How far tiers lean out on the right (+) or left (-), for an untidy tree. */
  readonly lean: number;
  readonly k: number;
  /** How far its boughs droop, 1 for the usual. */
  readonly droop: number;
  /** How often a bough is broken short. */
  readonly broken: number;
}

function trunk(g: TGrid, cx: number, y0: number, y1: number, w: number, k: number): void {
  for (let y = y0; y < y1; y++) {
    const flare = y > y1 - 6 ? Math.round((y - (y1 - 6)) * 0.6) : 0;
    for (let i = -flare; i < w + flare; i++) {
      const nx = ((i + flare + 0.5) / (w + 2 * flare)) * 2 - 1;
      let t = cyl(nx, 2.6, 1.4);
      if (hash(cx + i, Math.floor(y / 4), k) < 0.22) t += 1;
      if (hash(cx + i, Math.floor(y / 7), k + 1) < 0.1) t -= 1;
      put(g, Math.round(cx - w / 2) + i, y, C('bark', clamp(t, 1, 5)));
    }
  }
}

function pine(s: PineShape): Tree {
  const H = m(s.height);
  const W = m(s.spread) | 1;
  const g = tgrid(W + 4, H);
  const cx = (W + 4) / 2;
  const trunkH = m(0.75);
  const crownH = H - trunkH;
  const tw = Math.max(4, m(0.24));
  trunk(g, cx, Math.round(crownH * 0.4), H, tw, s.k);
  // Tiers from the top down; each is drawn after (over) the one below it, so draw bottom first.
  // B9: tiers no longer repeat like chevrons. Each tier has its own spacing
  // from the one above (so some gaps show the trunk and some boughs crowd),
  // each side of it its own reach, droop and number of needle clumps, and
  // here and there a bough is broken short, so the outline is a tree's.
  const weights = Array.from({ length: s.tiers }, (_, i) => 0.8 + hash(i, s.k, 21) * 0.5);
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const tierInfo = weights.map((wt, i) => {
    const f = (i + 1) / s.tiers;
    const top = Math.round((acc / total) * crownH * 0.88);
    acc += wt;
    const h = Math.round((crownH / s.tiers) * (1.4 + hash(i, s.k, 22) * 0.45));
    const reach = (W / 2 - 1) * (0.22 + 0.78 * Math.pow(f, 0.9));
    const sides = [-1, 1].map((side) => {
      const broken = i > 0 && i < s.tiers - 1 && hash(i, side + 5, s.k + 31) < s.broken;
      return {
        half: reach * (broken ? 0.5 : 0.8 + hash(i, side + 2, s.k + 13) * 0.32),
        droop: s.droop * (0.75 + hash(i, side + 7, s.k + 17) * 0.55),
        tips: 2 + Math.floor(hash(i, side + 9, s.k + 19) * (i > s.tiers / 2 ? 2.4 : 1.6)),
      };
    }) as [
      { half: number; droop: number; tips: number },
      { half: number; droop: number; tips: number },
    ];
    const half = Math.max(sides[0].half, sides[1].half);
    const lean = s.lean * (hash(i, s.k, 9) - 0.3) * half * 0.25;
    return { top, h, half, sides, lean, i };
  });
  const owner = new Int8Array(g.w * g.h).fill(-1);
  for (const tier of [...tierInfo].reverse()) {
    const { top, h, half, sides, lean, i } = tier;
    for (let y = top; y < top + h && y < H - trunkH + 2; y++)
      for (let x = Math.floor(cx - half - 3 + lean); x <= Math.ceil(cx + half + 3 + lean); x++) {
        const dx = x + 0.5 - cx - lean * ((y - top) / h);
        const side = dx < 0 ? -1 : 1;
        const sd = sides[side < 0 ? 0 : 1];
        const u = Math.abs(dx) / sd.half;
        if (u > 1.02) continue;
        const v = (y - top) / h;
        // The bough's upper face slopes down from the trunk; its underside droops in needle clumps.
        const vTop = 0.04 + 0.48 * sd.droop * Math.pow(u, 1.2);
        const tips = sd.tips;
        const p = u * tips + hash(i, side, s.k) * 0.6;
        const f = p - Math.floor(p);
        const fringe = hash(x, Math.floor(y / 2), s.k + 11) < 0.25 ? 0.04 : 0;
        const vBot = 0.58 + 0.3 * u * sd.droop + 0.2 * Math.pow(f, 1.6) * (0.6 + 0.4 * u) - fringe;
        if (v < vTop || v > vBot) continue;
        const thick = (v - vTop) / Math.max(0.05, vBot - vTop);
        // Lit on the upper face and on the sun's side; dark underneath and away from it.
        let t = thick < 0.14 ? 1 : thick < 0.5 ? 2 : thick < 0.8 ? 3 : thick < 0.93 ? 4 : 5;
        if (side > 0 && u > 0.35) t += 1;
        if (side < 0 && u > 0.45 && thick < 0.45) t -= 1;
        // The notch between two clumps is in shadow.
        if ((f < 0.12 || f > 0.88) && thick > 0.55) t = Math.max(t, 4);
        // Needle strokes down the upper face, a step lighter.
        const stroke = hash(
          Math.floor((Math.abs(dx) * 0.8 + v * h * 0.5) / 3),
          i * 7 + side,
          s.k + 5,
        );
        if (thick > 0.15 && thick < 0.7 && stroke < 0.3 && (x + y) % 3 !== 0) t -= 1;
        t += Math.round((fbm(x, y, m(0.4), s.k + 7) - 0.5) * 1.1);
        put(g, x, y, C('pine', clamp(t, 0, 5)));
        owner[y * g.w + x] = i;
      }
  }
  // Each tier's shadow on the one below, under its ragged edge.
  for (let y = 1; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const me = owner[y * g.w + x] as number;
      if (me < 0) continue;
      for (let s2 = 1; s2 <= 4; s2++) {
        const above = owner[(y - s2) * g.w + x - (s2 > 2 ? 1 : 0)];
        if (above !== undefined && above >= 0 && above < me) {
          dim(g, x, y, s2 <= 2 ? 2 : 1);
          break;
        }
      }
    }
  // The tip.
  put(g, Math.round(cx - 0.5), 0, C('pine', 2));
  const out = outlined(g);
  return { picture: { grid: out, glows: [] }, base: H, foot: Math.round(cx) + 1 };
}

/** A full, even young pine. */
export const pineTree = (): Tree =>
  pine({ height: 6.2, spread: 3.0, tiers: 7, lean: 0, k: 1, droop: 1, broken: 0.08 });
/** A short, wind-bent pine, gappy, a bough or two broken off. */
export const pineTree2 = (): Tree =>
  pine({ height: 5.2, spread: 2.5, tiers: 6, lean: 0.9, k: 2, droop: 0.85, broken: 0.3 });
/** A tall old pine whose heavy boughs droop. */
export const pineTree3 = (): Tree =>
  pine({ height: 7.2, spread: 3.3, tiers: 8, lean: 1.2, k: 3, droop: 1.3, broken: 0.15 });

/**
 * The oak (redrawn in B9: B7's crown was one round, even mass). An oak's
 * crown is not a ball: its limbs go out wide and nearly level, and the leaves
 * hang in separate masses at their ends, so the outline is lumpy, the masses
 * stand at different heights, light comes through between them and through
 * holes in them, and the limbs show in the gaps. Each mass is a heap of leaf
 * domes, each dome lit from the upper left; a mass is darker underneath and
 * on its right, and darker still where it tucks behind a nearer one.
 */
export function oakTree(k = 5): Tree {
  const W = m(6.2);
  const H = m(6.8);
  const g = tgrid(W, H);
  const cx = W / 2;
  const tw = m(0.6);
  const fork = Math.round(H * 0.6);
  trunk(g, cx, fork - 4, H, tw, k);
  // Limbs: from the fork out to each mass, thick at the trunk and thinning,
  // lit along their upper side.
  const P = (fx: number, fy: number) => [W * fx, H * fy] as const;
  const limb = (pts: readonly (readonly [number, number])[], w0: number, w1: number) => {
    const total = pts.length - 1;
    for (let s = 0; s < total; s++) {
      const [ax, ay] = pts[s]!;
      const [bx, by] = pts[s + 1]!;
      const L = Math.hypot(bx - ax, by - ay);
      const n = Math.ceil(L);
      // Across the limb: lit on its upper (or left) side, dark below.
      const [px, py] = [-(by - ay) / L, (bx - ax) / L];
      const up = py > 0 ? -1 : 1;
      for (let i = 0; i <= n; i++) {
        const f = (s + i / n) / total;
        const x = ax + ((bx - ax) * i) / n;
        const y = ay + ((by - ay) * i) / n;
        const w = Math.max(2, w0 + (w1 - w0) * f);
        for (let o = -w / 2; o <= w / 2; o += 0.5) {
          const u = (o / (w / 2)) * up;
          const t = u < -0.6 ? 1 : u < -0.1 ? 2 : u < 0.6 ? 3 : 4;
          put(g, Math.round(x + px * o), Math.round(y + py * o), C('bark', t));
        }
      }
    }
  };
  const base = P(0.5, 0.64);
  limb([base, P(0.36, 0.53), P(0.19, 0.44)], m(0.5), m(0.14));
  limb([P(0.36, 0.53), P(0.3, 0.6)], m(0.2), m(0.1));
  limb([P(0.4, 0.55), P(0.42, 0.32), P(0.4, 0.18)], m(0.3), m(0.1));
  limb([base, P(0.52, 0.46), P(0.53, 0.36)], m(0.42), m(0.14));
  limb([base, P(0.66, 0.53), P(0.85, 0.44)], m(0.5), m(0.14));
  limb([P(0.66, 0.53), P(0.73, 0.6)], m(0.22), m(0.1));
  limb([P(0.6, 0.55), P(0.66, 0.33), P(0.68, 0.2)], m(0.28), m(0.1));
  // The masses: centre, size, how dark (lower and further right are darker).
  const masses = [
    { f: [0.4, 0.16, 0.22, 0.14], d: 0 },
    { f: [0.68, 0.2, 0.2, 0.13], d: 0.3 },
    { f: [0.19, 0.36, 0.18, 0.15], d: 0.3 },
    { f: [0.52, 0.34, 0.21, 0.15], d: 0.5 },
    { f: [0.84, 0.38, 0.15, 0.14], d: 0.8 },
    { f: [0.31, 0.54, 0.17, 0.1], d: 1.0 },
    { f: [0.71, 0.56, 0.19, 0.1], d: 1.3 },
  ] as const;
  type Dome = { x: number; y: number; r: number; mass: number; tone: number };
  const domes: Dome[] = [];
  masses.forEach(({ f: [fx, fy, frx, fry], d }, mi) => {
    const mx = W * fx;
    const my = H * fy;
    const rx = W * frx;
    const ry = H * fry;
    const n = Math.round((rx * ry) / (m(0.4) * m(0.4) * 0.75));
    for (let i = 0; i < n; i++) {
      const a = hash(i, mi, k + 1) * Math.PI * 2;
      const r = Math.sqrt(hash(mi, i, k + 2)) * 0.8;
      const y = my + Math.sin(a) * r * ry;
      domes.push({
        x: mx + Math.cos(a) * r * rx,
        y,
        r: m(0.3) + hash(i, mi, k + 3) * m(0.2),
        mass: mi,
        // Within a mass, lower domes are darker.
        tone: 1.9 + d + ((y - my) / ry) * 0.5,
      });
    }
  });
  // Upper domes first, so lower, nearer ones stand over them.
  domes.sort((a, b) => a.y - b.y);
  // Holes the light comes through: kept clear of leaves.
  const holes = [
    [0.3, 0.3, 5],
    [0.47, 0.25, 4],
    [0.6, 0.29, 5],
    [0.74, 0.33, 4],
    [0.4, 0.44, 4],
    [0.62, 0.47, 5],
    [0.26, 0.47, 3],
  ].map(([fx, fy, r]) => [W * fx!, H * fy!, r!] as const);
  const hole = (x: number, y: number) =>
    holes.some(([hx, hy, r]) => (x - hx) ** 2 + ((y - hy) * 1.3) ** 2 < r * r);
  const owner = new Int16Array(W * H).fill(-1);
  domes.forEach((c, id) => {
    for (let y = Math.floor(c.y - c.r - 1); y <= c.y + c.r + 1; y++)
      for (let x = Math.floor(c.x - c.r - 1); x <= c.x + c.r + 1; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const dx = (x + 0.5 - c.x) / c.r;
        const dy = (y + 0.5 - c.y) / c.r;
        const sc = 1 + 0.12 * Math.sin(Math.atan2(dy, dx) * 7 + id);
        const dd = (dx * dx + dy * dy) / (sc * sc);
        if (dd > 1 || hole(x, y)) continue;
        const lx = dx / sc + 0.3;
        const ly = dy / sc + 0.34;
        let t = lx * lx + ly * ly <= 0.55 ? c.tone : c.tone + 1;
        if ((dx / sc + 0.45) ** 2 + (dy / sc + 0.5) ** 2 <= 0.1) t -= 1;
        if (dy > 0.55 && dd > 0.6) t += 1;
        put(g, x, y, C('leaf', clamp(t, 1, 5)));
        owner[y * W + x] = id;
      }
  });
  // Where a dome tucks behind a nearer one, a step darker along the join.
  for (let y = 0; y < H - 2; y++)
    for (let x = 0; x < W - 2; x++) {
      const me = owner[y * W + x] as number;
      if (me < 0) continue;
      const r = owner[y * W + x + 1] as number;
      const d = owner[(y + 1) * W + x] as number;
      const d2 = owner[(y + 2) * W + x] as number;
      if (r > me || d > me || d2 > me) dim(g, x, y, 1);
    }
  // Small leaf clusters on the lit sides, so the masses read as leaves, not felt.
  // Each a little dome: a lit arc on its upper left and a dark one below right.
  for (let y = 0; y < H; y += 5)
    for (let x = (y / 5) % 2 ? 3 : 0; x < W; x += 6) {
      const sx = x + Math.floor(hash(x, y, k + 6) * 3);
      const sy = y + Math.floor(hash(y, x, k + 7) * 3);
      const id = owner[sy * W + sx] as number;
      if (id < 0) continue;
      for (let j = -3; j <= 3; j++)
        for (let i = -3; i <= 3; i++) {
          const d = Math.hypot(i, j);
          if (d < 1.8 || d > 3.2) continue;
          const px = sx + i;
          const py = sy + j;
          if (owner[py * W + px] !== id) continue;
          const tt = at(g, px, py) & 7;
          if (i + j < -1) put(g, px, py, C('leaf', Math.max(1, tt - 1)));
          else if (i + j > 2 && j > 0) put(g, px, py, C('leaf', Math.min(5, tt + 1)));
        }
    }
  // The crown's shadow across the trunk and the limbs under it.
  for (let y = fork - 6; y < fork + m(0.7); y++)
    for (let x = Math.round(cx - tw); x < cx + tw; x++)
      if (isMat(at(g, x, y), 'bark') && clumps(x, y, k) < 0.75) dim(g, x, y, 1);
  const out = outlined(g);
  return { picture: { grid: out, glows: [] }, base: H, foot: Math.round(cx) + 1 };
}

/** A shrub: a few leafy domes, lit on their upper left, darker where they tuck behind each other. */
export function bush(k = 7): Tree {
  const W = m(1.5);
  const H = m(1.1);
  const g = tgrid(W, H);
  const domes = [
    [0.3, 0.6, 0.26],
    [0.68, 0.58, 0.28],
    [0.5, 0.36, 0.3],
    [0.24, 0.78, 0.2],
    [0.74, 0.8, 0.22],
  ] as const;
  const owner = new Int8Array(W * H).fill(-1);
  domes.forEach(([fx, fy, fr], id) => {
    const r = W * fr;
    const cx = W * fx;
    const cy = H * fy;
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const dx = (x + 0.5 - cx) / r;
        const dy = (y + 0.5 - cy) / r;
        const ang = Math.atan2(dy, dx);
        const sc = 1 + 0.08 * Math.sin(ang * 7 + id + k);
        const d = (dx * dx + dy * dy) / (sc * sc);
        if (d > 1 || y >= H) continue;
        const base = 2.4 + fy * 0.8;
        const lx = dx / sc + 0.25;
        const ly = dy / sc + 0.3;
        let t = lx * lx + ly * ly <= 0.6 ? base : base + 1;
        if ((dx / sc + 0.45) ** 2 + (dy / sc + 0.5) ** 2 <= 0.12) t -= 1;
        if (hash(x, y, k) < 0.1) t += 1;
        put(g, x, y, C('leaf', clamp(t, 1, 5)));
        owner[y * W + x] = id;
      }
  });
  for (let y = 0; y < H - 1; y++)
    for (let x = 0; x < W - 1; x++) {
      const me = owner[y * W + x] as number;
      const r = owner[y * W + x + 1] as number;
      const d = owner[(y + 1) * W + x] as number;
      if (me >= 0 && ((r > me && r >= 0) || (d > me && d >= 0))) dim(g, x, y, 1);
    }
  // A few berries.
  for (let n = 0; n < 5; n++) {
    const x = Math.floor(hash(n, 1, k) * W);
    const y = Math.floor(hash(n, 2, k) * H);
    if (isMat(at(g, x, y), 'leaf')) put(g, x, y, C('flower', 3));
  }
  const out = outlined(g);
  return { picture: { grid: out, glows: [] }, base: H, foot: Math.round(W / 2) + 1 };
}

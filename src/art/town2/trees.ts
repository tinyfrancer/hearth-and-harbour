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
import { bayer, clamp, cyl, fbm } from './texture';

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
  const tierInfo = Array.from({ length: s.tiers }, (_, i) => {
    const f = (i + 1) / s.tiers;
    const top = Math.round(i * (crownH / (s.tiers + 0.4)) * 0.92);
    const h = Math.round((crownH / s.tiers) * 1.55);
    const half = (W / 2 - 1) * (0.22 + 0.78 * Math.pow(f, 0.9)) * (0.92 + hash(i, s.k, 13) * 0.16);
    const lean = s.lean * (hash(i, s.k, 9) - 0.3) * half * 0.25;
    return { top, h, half, lean, i };
  });
  const owner = new Int8Array(g.w * g.h).fill(-1);
  for (const tier of [...tierInfo].reverse()) {
    const { top, h, half, lean, i } = tier;
    for (let y = top; y < top + h && y < H - trunkH + 2; y++)
      for (let x = Math.floor(cx - half - 3 + lean); x <= Math.ceil(cx + half + 3 + lean); x++) {
        const dx = x + 0.5 - cx - lean * ((y - top) / h);
        const side = dx < 0 ? -1 : 1;
        const u = Math.abs(dx) / half;
        if (u > 1.02) continue;
        const v = (y - top) / h;
        // The bough's upper face slopes down from the trunk; its underside droops in needle clumps.
        const vTop = 0.04 + 0.48 * Math.pow(u, 1.2);
        const tips = 2 + (i > s.tiers / 2 ? 1 : 0);
        const p = u * tips + hash(i, side, s.k) * 0.6;
        const f = p - Math.floor(p);
        const fringe = hash(x, Math.floor(y / 2), s.k + 11) < 0.25 ? 0.04 : 0;
        const vBot = 0.58 + 0.3 * u + 0.2 * Math.pow(f, 1.6) * (0.6 + 0.4 * u) - fringe;
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

export const pineTree = (): Tree => pine({ height: 6.2, spread: 3.0, tiers: 7, lean: 0, k: 1 });
export const pineTree2 = (): Tree => pine({ height: 5.2, spread: 2.5, tiers: 6, lean: 0.6, k: 2 });
export const pineTree3 = (): Tree => pine({ height: 7.2, spread: 3.3, tiers: 8, lean: 1.2, k: 3 });

/** The oak: a broad crown of leafy clumps over a stout trunk with limbs. */
export function oakTree(k = 5): Tree {
  const W = m(6.2);
  const H = m(6.8);
  const g = tgrid(W, H);
  const cx = W / 2;
  const crownCy = m(2.6);
  const crownRx = W / 2 - m(0.3);
  const crownRy = m(2.35);
  // Trunk and limbs: they show below and through the crown.
  const tw = m(0.55);
  trunk(g, cx, crownCy, H, tw, k);
  const limbs = [
    [-1, 0.9, 2.2],
    [1, 0.7, 2.0],
    [-1, 1.6, 1.4],
    [1, 1.5, 1.6],
  ] as const;
  for (const [side, len, rise] of limbs) {
    const x0 = cx + side * 3;
    const y0 = crownCy + m(0.9);
    const x1 = cx + side * m(len + 0.6);
    const y1 = y0 - m(rise * 0.7);
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      const w = Math.max(2, Math.round(m(0.22) * (1 - i / n)) + 1);
      for (let j = 0; j < w; j++)
        put(g, x + j - w / 2, y, C('bark', j === 0 ? 2 : j === w - 1 ? 5 : 3));
    }
  }
  // Clumps: big domes over the crown's ellipse in loose rows, the upper ones first so the
  // nearer, lower ones stand over them.
  const clumps: { x: number; y: number; r: number }[] = [];
  const rows = [3, 4, 5, 4];
  rows.forEach((n, row) => {
    const fy = -0.62 + row * 0.42;
    for (let i = 0; i < n; i++) {
      const fx = n === 1 ? 0 : -0.8 + (1.6 * i) / (n - 1);
      const wobble = (hash(i, row, k) - 0.5) * 0.18;
      const span = Math.sqrt(Math.max(0, 1 - fy * fy));
      clumps.push({
        x: cx + (fx * span + wobble) * (crownRx - m(0.7)),
        y: crownCy + fy * (crownRy - m(0.5)) + (hash(row, i, k + 1) - 0.5) * m(0.3),
        r: m(0.95) + hash(i + 3, row, k) * m(0.35),
      });
    }
  });
  const crown = new Int8Array(W * H).fill(-1);
  clumps.forEach((c, id) => {
    const r = c.r;
    for (let y = Math.floor(c.y - r - 2); y <= c.y + r + 2; y++)
      for (let x = Math.floor(c.x - r - 2); x <= c.x + r + 2; x++) {
        const dx = (x + 0.5 - c.x) / r;
        const dy = (y + 0.5 - c.y) / r;
        const ang = Math.atan2(dy, dx);
        const scallop = 1 + 0.07 * Math.sin(ang * 9 + id);
        const d = (dx * dx + dy * dy) / (scallop * scallop);
        if (d > 1) continue;
        // A dome lit from the upper left: a lit body, a highlight toward the light and a
        // shadowed rim away from it; the whole crown darker toward its lower right.
        const base = 2.1 + ((c.y - crownCy) / crownRy) * 1.1 + ((c.x - cx) / crownRx) * 0.45;
        const lx = dx / scallop + 0.24;
        const ly = dy / scallop + 0.28;
        const hx = dx / scallop + 0.42;
        const hy = dy / scallop + 0.46;
        let t: number;
        if (lx * lx + ly * ly <= 0.62) t = hx * hx + hy * hy <= 0.16 ? base - 1 : base;
        else t = dy > 0.45 && d > 0.7 ? base + 2 : base + 1;
        put(g, x, y, C('leaf', clamp(t, 1, 5)));
        crown[y * W + x] = id;
      }
  });
  // Leaf clusters on every clump: small domes, a lit arc on their upper left and a dark one below.
  for (let y = 0; y < H; y += 5)
    for (let x = (y / 5) % 2 ? 3 : 0; x < W; x += 6) {
      const sx = x + Math.floor(hash(x, y, k + 6) * 3);
      const sy = y + Math.floor(hash(y, x, k + 7) * 3);
      const id = crown[sy * W + sx] as number;
      if (id < 0) continue;
      for (let j = -3; j <= 3; j++)
        for (let i = -3; i <= 3; i++) {
          const d = Math.hypot(i, j);
          if (d < 1.8 || d > 3.2) continue;
          const px = sx + i;
          const py = sy + j;
          if (crown[py * W + px] !== id) continue;
          const c = at(g, px, py);
          const tt = c & 7;
          if (i + j < -1) put(g, px, py, C('leaf', Math.max(1, tt - 1)));
          else if (i + j > 2 && j > 0) put(g, px, py, C('leaf', Math.min(5, tt + 1)));
        }
    }
  // Where a clump tucks behind a nearer one, it is a step darker along the join.
  const ao = new Uint8Array(W * H);
  for (let y = 0; y < H - 3; y++)
    for (let x = 0; x < W - 3; x++) {
      const me = crown[y * W + x] as number;
      if (me < 0) continue;
      for (const [ox, oy] of [
        [1, 0],
        [2, 0],
        [0, 1],
        [0, 2],
        [1, 1],
        [3, 0],
        [0, 3],
      ] as const) {
        const o = crown[(y + oy) * W + x + ox] as number;
        if (o > me) {
          ao[y * W + x] = 1;
          break;
        }
      }
    }
  for (let i = 0; i < ao.length; i++) if (ao[i]) dim(g, i % W, Math.floor(i / W), ao[i] as number);
  // The crown's shadow on the trunk below it.
  for (let y = crownCy + Math.round(crownRy * 0.8); y < crownCy + crownRy + m(0.5); y++)
    for (let x = Math.round(cx - tw); x < cx + tw; x++)
      if (isMat(at(g, x, y), 'bark') && bayer(x, y) < 0.7) dim(g, x, y, 1);
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

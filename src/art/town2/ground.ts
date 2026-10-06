/**
 * The C-scale town's grounds, as painters into a grid the caller owns:
 * grass with variety, domed cobbles, a kerb, a beaten dirt road, sand, the
 * quay wall and the sea with its shore. Grass, cobbles and the kerb are taken
 * from the approved scale study (study/scale-detail/props.ts); the rest are
 * new. Everything is worked out from world position, so a ground painted in
 * pieces lines up and the same town comes out the same every time.
 */
import { at, cell, dim, hash, isMat, put, type TGrid } from './cells';
import { m } from './scale';
import { bayer, clamp, fbm, noise, softRound } from './texture';

const C = cell;

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

type Inside = (x: number, y: number) => boolean;
const all: Inside = () => true;

/**
 * Grass: broad soft patches of lighter and darker turf, tufts whose tips catch
 * the sun, lusher clumps here and there, clover, a few flowers and pebbles.
 */
export function grass(g: TGrid, b: Box, k: number, inside: Inside = all): void {
  for (let y = b.y; y < b.y + b.h; y++)
    for (let x = b.x; x < b.x + b.w; x++) {
      if (!inside(x, y)) continue;
      // Soft swathes of lighter and darker turf, their edges in an ordered dither.
      const v = fbm(x, y, m(2.2), k);
      const s = noise(x, y, m(6), k + 3);
      const t = 2.15 + (v - 0.5) * 1.5 + (s - 0.5) * 0.7;
      put(g, x, y, C('grass', clamp(softRound(t, x, y, 0.12), 1, 4)));
    }
  // Tufts: three blades, the tips a step lighter, the root a step darker.
  const n = Math.round((b.w * b.h) / (m(1) * m(1) * 0.07));
  for (let i = 0; i < n; i++) {
    const x = b.x + Math.floor(hash(i, 1, k) * b.w);
    const y = b.y + Math.floor(hash(i, 2, k) * b.h);
    if (!inside(x, y) || !isMat(at(g, x, y), 'grass')) continue;
    const t0 = at(g, x, y) & 7;
    const lush = fbm(x, y, m(1.2), k + 9) > 0.66;
    const bh = lush ? 5 : 3;
    for (const dx of [-1, 0, 1]) {
      const hh = bh - (dx === 0 ? 0 : 1);
      for (let j = 0; j < hh; j++) {
        const xx = x + dx + (dx !== 0 && j > hh / 2 ? dx : 0);
        const tt = j === hh - 1 ? Math.max(1, t0 - 1) : j === 0 ? Math.min(5, t0 + 1) : t0;
        if (inside(xx, y - j)) put(g, xx, y - j, C('grass', lush && j === 0 ? 4 : tt));
      }
    }
  }
  // Clover: little round leaves in a cluster, and flowers: white and yellow pairs on a stalk.
  const nc = Math.round((b.w * b.h) / (m(1) * m(1) * 6));
  for (let i = 0; i < nc; i++) {
    const cx = b.x + Math.floor(hash(i, 3, k) * b.w);
    const cy = b.y + Math.floor(hash(i, 4, k) * b.h);
    for (let l = 0; l < 4; l++) {
      const x = cx + Math.floor(hash(i, l, k + 5) * 7) - 3;
      const y = cy + Math.floor(hash(l, i, k + 6) * 5) - 2;
      if (!inside(x, y) || !isMat(at(g, x, y), 'grass')) continue;
      put(g, x, y, C('grass', 1));
      put(g, x + 1, y, C('grass', 2));
      put(g, x, y + 1, C('grass', 3));
    }
  }
  const nf = Math.round((b.w * b.h) / (m(1) * m(1) * 2.2));
  for (let i = 0; i < nf; i++) {
    const x = b.x + Math.floor(hash(i, 5, k) * b.w);
    const y = b.y + Math.floor(hash(i, 6, k) * b.h);
    if (!inside(x, y) || !isMat(at(g, x, y), 'grass')) continue;
    const r = hash(i, 7, k);
    const c = r < 0.5 ? C('flower', 0) : r < 0.85 ? C('flower', 1) : C('flower', 3);
    put(g, x, y, c);
    put(g, x + 1, y, c);
    put(g, x, y + 1, C('grass', 4));
  }
  const np = Math.round((b.w * b.h) / (m(1) * m(1) * 5));
  for (let i = 0; i < np; i++) {
    const x = b.x + Math.floor(hash(i, 8, k) * b.w);
    const y = b.y + Math.floor(hash(i, 9, k) * b.h);
    if (!inside(x, y) || !isMat(at(g, x, y), 'grass')) continue;
    put(g, x, y, C('stone', 2));
    put(g, x + 1, y, C('stone', 3));
    put(g, x + 1, y + 1, C('grass', 5));
  }
}

/**
 * Cobbles: rounded stones in offset rows of slightly different heights, each
 * a low dome lit top-left, set a pixel up or down from its neighbours, dark
 * joints with a little grass in them, and worn smoother where feet go.
 */
export function cobbles(g: TGrid, b: Box, k: number, inside: Inside = all): void {
  const sh0 = Math.max(4, m(0.24));
  const sw = Math.max(5, m(0.3));
  let y = b.y;
  for (let row = 0; y < b.y + b.h; row++) {
    const sh = sh0 + (hash(row, 9, k) < 0.35 ? 1 : 0) - (hash(row, 8, k) < 0.2 ? 1 : 0);
    let edge = b.x - Math.floor(hash(row, 0, k) * sw);
    let idx = 0;
    let w = sw + Math.round((hash(row, idx, k + 1) - 0.5) * sw * 0.7);
    for (let x = b.x; x < b.x + b.w; x++) {
      while (x >= edge + w) {
        edge += w;
        idx++;
        w = sw + Math.round((hash(row, idx, k + 1) - 0.5) * sw * 0.7);
      }
      const px = x - edge;
      const tone =
        2 + (hash(row, idx, k + 2) < 0.22 ? 1 : 0) - (hash(row, idx, k + 3) < 0.15 ? 1 : 0);
      const lift = hash(row, idx, k + 6) < 0.3 ? 1 : 0;
      for (let py = 0; py < sh; py++) {
        const yy = y + py;
        if (yy >= b.y + b.h || !inside(x, yy)) continue;
        const nx = (px - (w - 2) / 2) / ((w - 1) / 2);
        const ny = (py + lift * 0.5 - (sh - 2) / 2) / ((sh - 1) / 2);
        const r = Math.abs(nx) ** 2.4 + Math.abs(ny) ** 2.4;
        const gap = py === sh - 1 || px === w - 1 || r > 1.0;
        let t = gap ? 5 : tone + Math.round((nx * 0.8 + ny * 1.1) * 1.0);
        if (!gap && r < 0.25 && nx < 0 && ny < 0) t = Math.min(t, tone - 1);
        if (!gap && fbm(x, yy, m(3), k + 4) < 0.22) t += 1;
        let c = C('cobble', clamp(t, 1, 5));
        if (gap && hash(x, yy, k + 5) < 0.06) c = C('grass', 3);
        put(g, x, yy, c);
      }
    }
    y += sh;
  }
}

/** A kerb of long dressed stones along a row, its face lit on top. Returns its height. */
export function kerb(g: TGrid, x0: number, y: number, w: number, k: number): number {
  const h = Math.max(4, m(0.28));
  const top = Math.max(2, Math.round(h * 0.4));
  let x = x0 - Math.floor(hash(k, 1) * m(1));
  let i = 0;
  while (x < x0 + w) {
    const len = Math.round(m(0.8) + hash(i, k) * m(0.5));
    for (let j = 0; j < h; j++)
      for (let a = 0; a < len; a++) {
        if (x + a < x0 || x + a >= x0 + w) continue;
        let t = j < top ? 1 : 3;
        if (j === 0) t = 0;
        if (a === len - 1) t = 5;
        else if (a === 0) t = j < top ? 0 : 2;
        if (j === h - 1) t = 5;
        if (hash(x + a, y + j, k) < 0.06) t += 1;
        put(g, x + a, y + j, C('stone', Math.min(5, t)));
      }
    x += len;
    i++;
  }
  return h;
}

/**
 * Beaten earth: a road or lane, two wheel ruts and a grassy crown between
 * them where `ruts` is given, pebbles, puddle-dark hollows, and a ragged edge
 * where the grass grows over it.
 */
export function dirt(
  g: TGrid,
  b: Box,
  k: number,
  inside: Inside,
  ruts?: (y: number) => number[],
): void {
  for (let y = b.y; y < b.y + b.h; y++) {
    const rx = ruts?.(y) ?? [];
    for (let x = b.x; x < b.x + b.w; x++) {
      if (!inside(x, y)) continue;
      const v = fbm(x, y, m(1.2), k);
      let t = v > 0.64 ? 1 : v < 0.3 ? 3 : 2;
      for (const r of rx) {
        const d = Math.abs(x - r);
        if (d < 2) t = 3;
        else if (d < 3) t = Math.max(t, 3) - (x < r ? 0 : 1) + 0;
        if (Math.abs(x - r - 3) < 1) t = 1;
      }
      put(g, x, y, C('dirt', clamp(t, 1, 5)));
    }
  }
  // Pebbles: a lit pixel over a dark one.
  const n = Math.round((b.w * b.h) / (m(1) * m(1) * 0.6));
  for (let i = 0; i < n; i++) {
    const x = b.x + Math.floor(hash(i, 1, k) * b.w);
    const y = b.y + Math.floor(hash(i, 2, k) * b.h);
    if (!inside(x, y) || !inside(x + 1, y + 1)) continue;
    put(g, x, y, C(hash(i, 3, k) < 0.5 ? 'stone' : 'dirt', 1));
    put(g, x + 1, y, C('dirt', 3));
    put(g, x, y + 1, C('dirt', 4));
  }
  // The grass's edge: tufts leaning out over the dirt.
  for (let y = b.y; y < b.y + b.h; y++)
    for (let x = b.x; x < b.x + b.w; x++) {
      if (!inside(x, y)) continue;
      const nearEdge =
        !inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2) || !inside(x, y + 2);
      if (nearEdge && hash(x, y, k + 4) < 0.45)
        put(g, x, y, C('grass', hash(x, y, k + 5) < 0.5 ? 2 : 3));
      else if (nearEdge) dim(g, x, y, 1);
    }
}

/** Sand: pale and fine, rippled by the wind, darker and wet toward the water line. */
export function sand(
  g: TGrid,
  b: Box,
  k: number,
  inside: Inside,
  wetFrom?: (x: number) => number,
): void {
  for (let y = b.y; y < b.y + b.h; y++)
    for (let x = b.x; x < b.x + b.w; x++) {
      if (!inside(x, y)) continue;
      const v = fbm(x, y, m(1.6), k);
      let t = softRound(1.9 + (v - 0.5) * 1.4, x, y, 0.12);
      if (Math.sin((x * 0.3 + y * 1.1 + noise(x, y, 20, k) * 9) * 0.9) > 0.92) t = 3;
      const wet = wetFrom?.(x);
      if (wet !== undefined && y > wet - m(0.6)) t = y > wet - m(0.25) ? 4 : Math.max(t, 3);
      put(g, x, y, C('sand', clamp(t, 1, 5)));
    }
  const n = Math.round((b.w * b.h) / (m(1) * m(1) * 1.5));
  for (let i = 0; i < n; i++) {
    const x = b.x + Math.floor(hash(i, 1, k) * b.w);
    const y = b.y + Math.floor(hash(i, 2, k) * b.h);
    if (!inside(x, y)) continue;
    // A shell or a pebble.
    put(g, x, y, hash(i, 3, k) < 0.5 ? C('linen', 0) : C('rock', 2));
    put(g, x + 1, y, C('sand', 4));
  }
}

/**
 * The quay wall's face, from the street's edge down to the water: a coping
 * of long stones lit on top, then courses of big dressed blocks, iron rings,
 * weed and a dark wet band at the foot. Returns the face's height.
 */
export function quayWall(
  g: TGrid,
  x0: number,
  y: number,
  w: number,
  k: number,
  rings: readonly number[],
): number {
  const cope = kerb(g, x0, y, w, k);
  const face = m(1.15);
  const ch = m(0.38);
  for (let row = 0; row * ch < face; row++) {
    const y0 = y + cope + row * ch;
    let bx = x0 - Math.floor(hash(row, k) * m(0.8));
    while (bx < x0 + w) {
      const bw = Math.round(m(0.75) + hash(bx, row, k + 1) * m(0.6));
      const tone =
        3 + (hash(bx, row, k + 2) < 0.25 ? 1 : 0) - (hash(bx, row, k + 3) < 0.15 ? 1 : 0);
      for (let j = 0; j < ch && row * ch + j < face; j++)
        for (let i = 0; i < bw; i++) {
          const px = bx + i;
          if (px < x0 || px >= x0 + w) continue;
          let t = tone;
          if (j === ch - 1 || i === bw - 1) t = 5;
          else if (j === 0 || i === 0) t = tone - 1;
          else if (hash(px, y0 + j, k + 4) < 0.06) t = tone + 1;
          // Wet toward the foot.
          if (
            row * ch + j > face - m(0.4) &&
            bayer(px, y0 + j) < (row * ch + j - (face - m(0.4))) / m(0.4)
          )
            t += 1;
          put(g, px, y0 + j, C('stone', clamp(t, 1, 5)));
        }
      bx += bw;
    }
  }
  // Weed in the joints at the foot, and its dark band.
  for (let x = x0; x < x0 + w; x++)
    for (let j = 0; j < m(0.25); j++) {
      const yy = y + cope + face - 1 - j;
      if (fbm(x, yy, 7, k + 5) > 0.5 - j * 0.04) put(g, x, yy, C('moss', j < 3 ? 5 : 4));
    }
  for (const rx of rings) {
    const ry = y + cope + m(0.42);
    for (let a = 0; a < 28; a++) {
      const th = (a / 28) * Math.PI * 2;
      put(g, rx + Math.cos(th) * 4, ry + 4 + Math.sin(th) * 4, C('iron', a < 14 ? 4 : 1));
    }
    put(g, rx, ry - 1, C('iron', 2));
    put(g, rx, ry, C('iron', 3));
  }
  return cope + face;
}

/**
 * The sea: deepening away from `shoreAt(x)`, slow swells of a lighter step,
 * glints of sun in short strokes, and foam breaking along the shore.
 */
export function sea(g: TGrid, b: Box, k: number, shoreAt: (x: number) => number): void {
  for (let y = b.y; y < b.y + b.h; y++)
    for (let x = b.x; x < b.x + b.w; x++) {
      const s = shoreAt(x);
      if (y < s) continue;
      // Lighter in the shallows, deepening away from the shore, in soft dithered patches.
      const depth = Math.min(1, (y - s) / m(9));
      const t = 2.1 + depth * 1.8 + (fbm(x, y, m(3.5), k) - 0.5) * 0.55;
      put(g, x, y, C('sea', clamp(softRound(t, x, y, 0.1), 1, 5)));
    }
  // Wavelets: short crests, a lit stroke over a darker trough, thicker toward the shore.
  const n = Math.round((b.w * b.h) / (m(1) * m(1) * 0.3));
  for (let i = 0; i < n; i++) {
    const x = b.x + Math.floor(hash(i, 1, k) * b.w);
    const y = b.y + Math.floor(hash(i, 2, k) * b.h);
    const s = shoreAt(x);
    if (y < s + 6) continue;
    const near = 1 - Math.min(1, (y - s) / m(8));
    const len = 3 + Math.floor(hash(i, 3, k) * (4 + near * 5));
    for (let j = 0; j < len; j++) {
      const lift = j === 0 || j === len - 1 ? 1 : 0;
      if (!isMat(at(g, x + j, y + lift), 'sea')) continue;
      put(g, x + j, y + lift, C('sea', lift ? 2 : hash(i, 4, k) < 0.25 + near * 0.4 ? 0 : 1));
      if (isMat(at(g, x + j, y + lift + 1), 'sea')) dim(g, x + j, y + lift + 1, 1);
    }
  }
  // Foam along the shore: a broken line, then wisps.
  for (let x = b.x; x < b.x + b.w; x++) {
    const s = shoreAt(x);
    if (s < b.y || s >= b.y + b.h) continue;
    const wob = Math.round(Math.sin(x / 9 + k) * 1.5);
    for (let j = 0; j < 3; j++)
      if (hash(x, j, k + 7) < 0.85 - j * 0.3) put(g, x, s + j + wob, C('sea', j === 0 ? 0 : 1));
    if (hash(x >> 2, 9, k) < 0.4) put(g, x, s + 5 + wob + ((x >> 2) % 2), C('sea', 1));
    if (hash(x >> 3, 10, k) < 0.3) put(g, x, s + 9 + wob, C('sea', 1));
  }
}

/**
 * Flagstones: big flat dressed slabs in staggered courses, each lit along
 * its top and left edge, a few cracked or a shade off.
 */
export function flagstones(g: TGrid, b: Box, k: number, inside: Inside = all): void {
  const ch = m(0.45);
  for (let y = b.y; y < b.y + b.h; y++) {
    const row = Math.floor((y - b.y) / ch);
    const py = (y - b.y) % ch;
    for (let x = b.x; x < b.x + b.w; x++) {
      if (!inside(x, y)) continue;
      const off = Math.floor(hash(row, 0, k) * m(0.7));
      const sw = m(0.75);
      const idx = Math.floor((x - b.x + off) / sw);
      const px = (x - b.x + off) % sw;
      const tone =
        2 + (hash(idx, row, k + 1) < 0.2 ? 1 : 0) - (hash(idx, row, k + 2) < 0.12 ? 1 : 0);
      let t = tone;
      if (py === ch - 1 || px === sw - 1) t = 5;
      else if (py === 0 || px === 0) t = tone - 1;
      else if (py === ch - 2 || px === sw - 2) t = tone + 1;
      put(g, x, y, C('cobble', clamp(t, 1, 5)));
    }
  }
}

/**
 * A round paved platform: rings of slabs with radial joints, seen at the
 * town's slant (half as deep as wide), its rim a kerb lit on top.
 */
export function roundPaving(g: TGrid, cx: number, cy: number, r: number, k: number): void {
  const ry = r * 0.55;
  for (let y = Math.floor(cy - ry - 4); y <= cy + ry + 6; y++)
    for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
      const a = (x + 0.5 - cx) / r;
      const bb = (y + 0.5 - cy) / ry;
      const d = Math.sqrt(a * a + bb * bb);
      if (d > 1.04) {
        // The rim's face, below the platform.
        if (d < 1.04 + 5 / ry && bb > 0) put(g, x, y, C('stone', d < 1.04 + 2 / ry ? 3 : 5));
        continue;
      }
      const ring = Math.floor(d * 4);
      const ang = Math.atan2(bb, a);
      const segs = 6 + ring * 6;
      const seg = Math.floor(((ang + Math.PI) / (2 * Math.PI)) * segs + ring * 0.5);
      const ringEdge = Math.abs(d * 4 - Math.round(d * 4)) < 0.06 && ring > 0;
      const segEdge =
        Math.abs(
          ((ang + Math.PI) / (2 * Math.PI)) * segs +
            ring * 0.5 -
            Math.round(((ang + Math.PI) / (2 * Math.PI)) * segs + ring * 0.5),
        ) <
        0.04 / Math.max(0.3, d);
      let t = 2 + (hash(seg, ring, k) < 0.25 ? 1 : 0) - (hash(seg, ring, k + 1) < 0.15 ? 1 : 0);
      // Worn paler where feet go round the well, a little moss in the joints.
      if (fbm(x, y, 9, k + 2) > 0.66) t -= 1;
      if (ringEdge || segEdge) t = hash(x, y, k + 3) < 0.12 ? 0 : 4;
      if ((ringEdge || segEdge) && t === 0) {
        put(g, x, y, C('moss', 4));
        continue;
      }
      if (d > 0.93) t = d > 0.98 ? 1 : 2;
      put(g, x, y, C('stone', clamp(t, 0, 5)));
    }
}

/** A gutter running down a street: a shallow channel of dark setts with a lit far lip. */
export function gutter(g: TGrid, x: (y: number) => number, y0: number, y1: number): void {
  for (let y = y0; y < y1; y++) {
    const cx = x(y);
    for (let i = -3; i <= 3; i++) {
      const t =
        i === -3 ? 5 : i === 3 ? 1 : (y + (i + 3) * 3) % 7 === 0 ? 5 : Math.abs(i) < 2 ? 4 : 3;
      put(g, cx + i, y, C('cobble', t));
    }
    if (y % 5 === 0) put(g, cx, y, C('sea', 2));
  }
}

/**
 * A soft shadow on the ground in an ellipse: a darker core and a dithered
 * edge, darkening whatever ground is there by its own steps.
 */
export function shadowOval(g: TGrid, cx: number, cy: number, rx: number, ry: number, n = 1): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const a = (x + 0.5 - cx) / rx;
      const b = (y + 0.5 - cy) / ry;
      const d = a * a + b * b;
      if (d > 1) continue;
      const s = d < 0.45 ? n + 1 : d > 0.8 && bayer(x, y) > 0.5 ? 0 : n;
      dim(g, x, y, s);
    }
}

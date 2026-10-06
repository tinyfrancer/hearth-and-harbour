/**
 * What the C-scale town's buildings are made of, as painters: timbers,
 * render, cut stone and rubble, windows, doors, roofs of tile, slate and
 * thatch, chimneys, lanterns and signs. Taken from the approved scale study
 * (study/scale-detail/buildings.ts): its timbers with a lit edge, grain and a
 * shadow edge; its stone blocks lit top-left; its windows with recessed panes,
 * a reflection and a sill that casts a shadow; its plank door with strap
 * hinges; its scalloped roof tiles, each course shading the one below. New
 * here: rubble walls, slate and thatch roofs, moss as cushions rather than
 * dashes, render broken up by tone patches, stains under sills, cracks and a
 * spalled patch, and windows that light at dusk.
 *
 * Every painter works in art pixels on a grid the caller owns, with sizes in
 * metres through `m()`, and takes a seed `k` so two buildings never wear alike.
 */
import type { Glow } from '../raster';
import { at, cell, dim, hash, isMat, matOf, put, type Cell, type TGrid } from './cells';
import type { Mat } from './ramps';
import { m } from './scale';
import { bayer, clamp, cyl, fbm } from './texture';

const C = cell;

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Materials a shadow may fall on as a wall's surface (not timber, glass or metal). */
const SURFACES: readonly Mat[] = ['plaster', 'limewash', 'stone', 'rock'];
const onSurface = (c: Cell): boolean => SURFACES.some((s) => isMat(c, s));

// ------------------------------------------------------------------ timber

/** A timber, upright: lit left edge, grain in streaks, shadow right edge, a knot. */
export function beamV(
  g: TGrid,
  x: number,
  y: number,
  w: number,
  h: number,
  k: number,
  mask?: Uint8Array,
  mat: Mat = 'wood',
): void {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      let t = 3;
      if (i === 0) t = 2;
      else if (i === w - 1) t = 5;
      else if (i === w - 2 && w >= 4) t = 4;
      else if (hash(x + i, Math.floor((y + j + hash(x + i, k) * 40) / 7), k) < 0.22) t = 4;
      if (j === 0 && i < w - 1) t = Math.min(t, 2);
      put(g, x + i, y + j, C(mat, t));
      if (mask) mask[(y + j) * g.w + x + i] = 1;
    }
  if (w >= 5 && h > 20) {
    const ky = y + 6 + Math.floor(hash(x, y, k + 3) * (h - 12));
    put(g, x + 2, ky, C(mat, 5));
    put(g, x + 2, ky - 1, C(mat, 1));
  }
}

/** A timber, lying: lit top edge, grain along it, shadow underneath. */
export function beamH(
  g: TGrid,
  x: number,
  y: number,
  w: number,
  h: number,
  k: number,
  mask?: Uint8Array,
  mat: Mat = 'wood',
): void {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      let t = 3;
      if (j === 0) t = 2;
      else if (j === h - 1) t = 5;
      else if (j === h - 2 && h >= 4) t = 4;
      else if (hash(Math.floor((x + i + hash(y + j, k) * 50) / 9), y + j, k) < 0.25) t = 4;
      if (i === 0 && j < h - 1) t = Math.min(t, 2);
      put(g, x + i, y + j, C(mat, t));
      if (mask) mask[(y + j) * g.w + x + i] = 1;
    }
}

/** A diagonal brace from (x0, y0) to (x1, y1), `w` thick, lit on its upper-left side. */
export function brace(
  g: TGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  mask: Uint8Array,
): void {
  const ya = Math.min(y0, y1);
  const yb = Math.max(y0, y1);
  for (let y = ya; y <= yb; y++) {
    const t = (y - y0) / (y1 - y0 || 1);
    const cx = Math.round(x0 + (x1 - x0) * t - w / 2);
    for (let i = 0; i < w; i++) {
      let s = 3;
      if (i === 0) s = 2;
      else if (i === w - 1) s = 5;
      else if (hash(cx + i - y, 1, 5) < 0.2) s = 4;
      put(g, cx + i, y, C('wood', s));
      mask[y * g.w + cx + i] = 1;
    }
  }
}

/**
 * Timbers' shadows on the wall around them: whatever surface pixel has a
 * timber (in `mask`) just above or to its left is in its shadow, deepest
 * where they touch, down and to the right.
 */
export function timberShadows(g: TGrid, mask: Uint8Array, r: Rect, depth: number): void {
  const W = g.w;
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++) {
      const i = y * W + x;
      if (mask[i] || !onSurface(at(g, x, y))) continue;
      let n = 0;
      if (mask[i - 1] || mask[i - W]) n = 2;
      else
        for (let s = 2; s <= depth + 1; s++)
          if (mask[i - s] || mask[i - s * W] || mask[i - s * W - s]) n = 1;
      dim(g, x, y, n);
    }
}

// ------------------------------------------------------------------ walls

/**
 * Render (lime plaster or limewash): pale, in broad soft-edged patches of a
 * step either way rather than speckle, dirtier toward the ground in an
 * ordered dither, with hairline cracks lit on their lower lip.
 */
export function render(g: TGrid, r: Rect, dirtFrom: number, k: number, mat: Mat = 'plaster'): void {
  const { x, y, w, h } = r;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const px = x + i;
      const py = y + j;
      const v = fbm(px, py, m(1.8), k);
      let t = v > 0.7 ? 1 : v < 0.22 ? 3 : 2;
      if (py > dirtFrom) {
        const f = (py - dirtFrom) / Math.max(1, y + h - dirtFrom);
        if (bayer(px, py) < f * 0.9) t = Math.max(t, 3);
        if (bayer(px, py) < f * 0.35 - 0.05) t = 4;
      }
      put(g, px, py, C(mat, t));
    }
  // Pits in the render, a few: a dark pixel with its lit lower lip.
  const pits = Math.round((w * h) / 900);
  for (let n = 0; n < pits; n++) {
    const px = x + 2 + Math.floor(hash(n, k, 61) * (w - 4));
    const py = y + 2 + Math.floor(hash(k, n, 62) * (h - 4));
    if (!isMat(at(g, px, py), mat)) continue;
    put(g, px, py, C(mat, 4));
    put(g, px + 1, py + 1, C(mat, 1));
  }
  // Hairline cracks: wandering down a pixel at a time.
  const n = Math.max(1, Math.round((w * h) / (m(1) * m(1) * 4)));
  for (let c = 0; c < n; c++) {
    let cx = x + 3 + Math.floor(hash(x, c, 31 + k) * (w - 6));
    let cy = y + 2 + Math.floor(hash(y, c, 32 + k) * (h - 6));
    const len = 4 + Math.floor(hash(c, x, 33 + k) * m(0.35));
    for (let s = 0; s < len && cy < y + h - 1; s++) {
      if (!isMat(at(g, cx, cy), mat)) break;
      put(g, cx, cy, C(mat, 4));
      if (isMat(at(g, cx + 1, cy), mat) && s % 2 === 0) put(g, cx + 1, cy, C(mat, 1));
      cx += hash(cx, cy, 34) < 0.45 ? 1 : hash(cx, cy, 35) < 0.2 ? -1 : 0;
      cy += 1;
    }
  }
}

/**
 * A patch where the render has fallen away and the stones show: the render's
 * broken edge is lit along the bottom and shadowed along the top, where it
 * stands proud of the stone.
 */
export function spall(g: TGrid, cx: number, cy: number, rx: number, ry: number, k: number): void {
  const inside = (x: number, y: number) => {
    const a = (x - cx) / rx;
    const b = (y - cy) / ry;
    const wob = (hash(Math.round(x / 2), Math.round(y / 2), k) - 0.5) * 0.5;
    return a * a + b * b <= 1 + wob;
  };
  const box = { x: Math.floor(cx - rx - 1), y: Math.floor(cy - ry - 1) };
  const scratch: [number, number][] = [];
  for (let y = box.y; y <= cy + ry + 1; y++)
    for (let x = box.x; x <= cx + rx + 1; x++) if (inside(x, y)) scratch.push([x, y]);
  // Small stones in courses inside the patch.
  for (const [x, y] of scratch) {
    if (!onSurface(at(g, x, y))) continue;
    const row = Math.floor((y - box.y) / 4);
    const col = Math.floor((x - box.x + (row % 2) * 3) / 6);
    const lx = (x - box.x + (row % 2) * 3) % 6;
    const ly = (y - box.y) % 4;
    let t = 2 + (hash(col, row, k) < 0.3 ? 1 : 0);
    if (lx === 5 || ly === 3) t = 5;
    else if (lx === 0 || ly === 0) t = 1;
    put(g, x, y, C('stone', t));
  }
  for (const [x, y] of scratch) {
    if (!inside(x, y - 1)) dim(g, x, y, 1);
    if (!inside(x, y + 1)) {
      const c = at(g, x, y + 1);
      if (c && !isMat(c, 'stone')) put(g, x, y + 1, (c & ~7) | 1);
    }
  }
}

/** Cut stone in courses: each block lit on its top and left, shadowed below and right. */
export function ashlar(g: TGrid, r: Rect, k: number, course = m(0.24), mat: Mat = 'stone'): void {
  const { x, y, w, h } = r;
  const ch = Math.max(3, course);
  for (let row = 0; row * ch < h; row++) {
    const y0 = y + row * ch;
    let bx = x - Math.floor(hash(row, k, 41) * ch * 2);
    while (bx < x + w) {
      const bw = Math.max(4, Math.round(ch * (1.5 + hash(bx, row, k) * 1.9)));
      const tone =
        2 + (hash(bx, row, k + 1) < 0.25 ? 1 : 0) - (hash(bx, row, k + 2) < 0.15 ? 1 : 0);
      for (let j = 0; j < ch && y0 + j < y + h; j++)
        for (let i = 0; i < bw; i++) {
          const px = bx + i;
          if (px < x || px >= x + w) continue;
          let t = tone;
          if (j === ch - 1 || i === bw - 1) t = 5;
          else if (j === 0 || i === 0) t = tone - 1;
          else if (j === ch - 2 || i === bw - 2) t = tone + 1;
          else if (hash(px, y0 + j, k + 4) < 0.05) t = tone + 1;
          if ((i === 0 || i === bw - 2) && (j === 0 || j === ch - 2) && ch > 4) t = 4;
          put(g, px, y0 + j, C(mat, clamp(t, 1, 5)));
        }
      bx += bw;
    }
  }
}

/**
 * Rubble stone: rounded field stones of uneven sizes in rough courses, each
 * a low cushion lit top-left, bedded in pale lime mortar that is shadowed
 * under each stone. The smithy's walls.
 */
export function rubble(g: TGrid, r: Rect, k: number, mat: Mat = 'stone'): void {
  const { x, y, w, h } = r;
  // Mortar first.
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const v = fbm(x + i, y + j, 9, k + 1);
      put(g, x + i, y + j, C('plaster', v > 0.55 ? 3 : 4));
    }
  let yy = y;
  let row = 0;
  while (yy < y + h) {
    const ch = Math.round(m(0.22) + hash(row, k, 2) * m(0.14));
    let xx = x - Math.floor(hash(row, k, 3) * m(0.3));
    let n = 0;
    while (xx < x + w) {
      const bw = Math.round(m(0.3) + hash(n, row, k + 4) * m(0.42));
      const bh = ch - 1 - Math.floor(hash(n, row, k + 5) * 3);
      const oy = Math.floor(hash(n, row, k + 6) * 2);
      const tone = 2 + (hash(n, row, k + 7) < 0.3 ? 1 : 0) - (hash(n, row, k + 8) < 0.12 ? 1 : 0);
      const tint: Mat = hash(n, row, k + 9) < 0.18 ? 'rock' : mat;
      const cx = xx + bw / 2;
      const cy = yy + oy + bh / 2;
      for (let j = 0; j < bh; j++)
        for (let i = 0; i < bw - 1; i++) {
          const px = xx + i;
          const py = yy + oy + j;
          if (px < x || px >= x + w || py >= y + h) continue;
          const nx = (px + 0.5 - cx) / ((bw - 1) / 2);
          const ny = (py + 0.5 - cy) / (bh / 2);
          const rr = Math.abs(nx) ** 2.6 + Math.abs(ny) ** 2.6;
          if (rr > 1) continue;
          let t = tone + Math.round(nx * 0.7 + ny * 1.1);
          if (rr > 0.55 && (nx > 0.3 || ny > 0.4)) t = Math.max(t, tone + 1);
          if (nx < -0.2 && ny < -0.2 && rr < 0.6) t = Math.min(t, tone - 1);
          put(g, px, py, C(tint, clamp(t, 1, 5)));
        }
      // The mortar's shadow under the stone.
      for (let i = 1; i < bw - 1; i++) {
        const px = xx + i;
        const py = yy + oy + bh;
        if (isMat(at(g, px, py), 'plaster')) put(g, px, py, C('plaster', 5));
      }
      xx += bw;
      n++;
    }
    yy += ch;
    row++;
  }
}

// ------------------------------------------------------------------ openings

export interface WindowOptions {
  /** Panes across and down. */
  readonly nx: number;
  readonly ny: number;
  /** Lit at dusk (`glass`) or dark (`pane`). */
  readonly lit: boolean;
  /** Shutters' paint, or none. */
  readonly shutters?: Mat;
  /** The frame's and sill's wood. */
  readonly frame?: Mat;
  /** Rain stains running down the wall from the sill's ends. */
  readonly stains?: boolean;
  readonly k: number;
}

/**
 * A window: frame, recessed panes with a reflection, glazing bars, a sill
 * that casts a shadow, stains from its ends, and shutters if asked. Returns
 * its glow when it lights up at dusk.
 */
export function windowAt(
  g: TGrid,
  x: number,
  y: number,
  w: number,
  h: number,
  o: WindowOptions,
): Glow | null {
  const ft = Math.max(2, m(0.08));
  const frame = o.frame ?? 'wood';
  const glass: Mat = o.lit ? 'glass' : 'pane';
  for (let j = -ft; j < h + ft; j++)
    for (let i = -ft; i < w + ft; i++) {
      if (!(j < 0 || i < 0 || j >= h || i >= w)) continue;
      let t = 3;
      if (j === -ft || i === -ft) t = 2;
      if (j === h + ft - 1 || i === w + ft - 1) t = 5;
      put(g, x + i, y + j, C(frame, t));
    }
  // Glass: dark inside, a pale reflection in a diagonal band, the reveal's shadow top and left.
  const reveal = Math.max(2, m(0.08));
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const band = ((i + j * 0.9 + o.k * 3) % (w * 0.9)) / (w * 0.9);
      let t = 4;
      if (band < 0.16) t = 2;
      else if (band < 0.24) t = 3;
      if (j < reveal || i < 1) t = 5;
      put(g, x + i, y + j, C(glass, t));
    }
  for (let a = 1; a < o.nx; a++) {
    const bx = x + Math.round((a * w) / o.nx);
    for (let j = 0; j < h; j++) put(g, bx, y + j, C(frame, j === 0 ? 4 : 3));
    for (let j = 1; j < h; j++) dim(g, bx + 1, y + j, 1);
  }
  for (let b = 1; b < o.ny; b++) {
    const by = y + Math.round((b * h) / o.ny);
    for (let i = 0; i < w; i++) put(g, x + i, by, C(frame, 3));
    for (let i = 1; i < w; i++) dim(g, x + i, by + 1, 1);
  }
  for (let a = 0; a < o.nx; a++)
    for (let b = 0; b < o.ny; b++)
      put(g, x + Math.round((a * w) / o.nx) + 2, y + Math.round((b * h) / o.ny) + 2, C(glass, 0));
  // Sill, and its shadow on the wall.
  const sh = Math.max(3, m(0.1));
  const sy = y + h + ft;
  for (let j = 0; j < sh; j++)
    for (let i = -ft - 2; i < w + ft + 2; i++)
      put(g, x + i, sy + j, C(frame, j === 0 ? 1 : j === sh - 1 ? 5 : 3));
  for (let j = 0; j < 3; j++)
    for (let i = -ft - 1; i < w + ft + 3; i++) {
      const c = at(g, x + i, sy + sh + j);
      if (onSurface(c)) dim(g, x + i, sy + sh + j, j === 0 ? 2 : 1);
    }
  if (o.stains) {
    const len = m(0.7);
    for (const sx of [x - ft - 1, x - ft, x + w + ft, x + w + ft + 1, x + Math.round(w / 2)])
      for (let j = 3; j < len; j++) {
        const py = sy + sh + j;
        const f = 1 - j / len;
        if (bayer(sx, py) < f * (sx === x + Math.round(w / 2) ? 0.35 : 0.75))
          if (onSurface(at(g, sx, py))) dim(g, sx, py, 1);
      }
  }
  if (o.shutters) {
    const sw = Math.round(w * 0.42);
    const pw = Math.max(3, m(0.12));
    for (const side of [-1, 1]) {
      const sx = side < 0 ? x - ft - sw - 1 : x + w + ft + 1;
      for (let j = -ft; j < h + ft; j++)
        for (let i = 0; i < sw; i++) {
          let t = 2;
          if (i % pw === pw - 1) t = 4;
          if (i === 0) t = 1;
          if (i === sw - 1) t = 5;
          const ly = (j + ft) % Math.floor((h + 2 * ft) / 2);
          if (ly < 2) t = Math.min(t, 1);
          else if (ly === 2) t = 4;
          if (j === -ft) t = 1;
          if (j === h + ft - 1) t = 5;
          put(g, sx + i, y + j, C(o.shutters, t));
        }
      // A hinge pin, and the shutter's shadow on the wall to its right.
      put(g, side < 0 ? sx + sw - 1 : sx, y + 3, C('iron', 2));
      put(g, side < 0 ? sx + sw - 1 : sx, y + h - 4, C('iron', 2));
      for (let j = -ft + 1; j < h + ft + 1; j++) {
        dim(g, sx + sw, y + j, 2);
        dim(g, sx + sw + 1, y + j, 1);
      }
    }
  }
  return o.lit ? { x: x + w / 2, y: y + h / 2, radius: m(0.9) + w / 3, strength: 0.32 } : null;
}

export interface DoorOptions {
  /** The leaf's paint: bare `wood`, or a colour. */
  readonly paint?: Mat;
  /** A small barred window with warm light behind it. */
  readonly grille?: boolean;
  /** A fanlight over the door, lit at dusk. */
  readonly fanlight?: boolean;
  readonly k: number;
}

/**
 * A door: framed, recessed (its top and left in the opening's shadow), plank
 * leaf with strap hinges and a ring, and a grille or fanlight if asked.
 * Returns its glow (the grille or fanlight at dusk), if it has one.
 */
export function doorAt(
  g: TGrid,
  x: number,
  y: number,
  w: number,
  h: number,
  o: DoorOptions,
): Glow | null {
  const ft = Math.max(3, m(0.13));
  const scratch = new Uint8Array(g.w * g.h);
  beamH(g, x - ft, y - ft, w + 2 * ft, ft, o.k + 9, scratch);
  beamV(g, x - ft, y, ft, h, o.k + 8, scratch);
  beamV(g, x + w, y, ft, h, o.k + 10, scratch);
  const leaf = o.paint ?? 'wood';
  const pw = Math.max(4, m(0.18));
  const sd = Math.max(3, m(0.12));
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const p = i % pw;
      let t = 2;
      if (p === pw - 1) t = 5;
      else if (p === 0) t = 1;
      else if (hash(x + i, Math.floor((y + j + hash(i, 3) * 30) / 6), 77 + o.k) < 0.16) t = 3;
      if (j < sd) t += 2;
      else if (j < sd * 2) t += 1;
      if (i < 2) t += 1;
      put(g, x + i, y + j, C(leaf, Math.min(5, t)));
    }
  // Painted doors are panelled: a raised rail across the middle, lit on top.
  if (leaf !== 'wood') {
    const ry = y + Math.round(h * 0.55);
    for (let i = 0; i < w; i++) {
      put(g, x + i, ry, C(leaf, 1));
      put(g, x + i, ry + 1, C(leaf, 2));
      put(g, x + i, ry + 2, C(leaf, 4));
    }
  }
  const hh = Math.max(2, m(0.07));
  for (const fy of [0.24, 0.76]) {
    const hy = y + Math.round(h * fy);
    const len = Math.round(w * 0.72);
    for (let i = 0; i < len; i++)
      for (let j = 0; j < hh + (i < len * 0.2 ? 1 : 0); j++)
        put(g, x + i, hy + j, C('iron', j === 0 ? 1 : j === hh - 1 ? 3 : 2));
    for (let i = 0; i < len; i++) dim(g, x + i, hy + hh + (i < len * 0.2 ? 1 : 0), 1);
    for (let i = 2; i < len; i += pw) put(g, x + i, hy + 1, C('iron', 0));
  }
  const rx = x + w - Math.round(w * 0.25);
  const ry = y + Math.round(h * 0.52);
  const rr = Math.max(2, m(0.08));
  for (let a = 0; a < 24; a++) {
    const th = (a / 24) * Math.PI * 2;
    put(g, rx + Math.cos(th) * rr, ry + rr + Math.sin(th) * rr, C('iron', a < 12 ? 3 : 1));
  }
  put(g, rx, ry - 1, C('iron', 2));
  let glow: Glow | null = null;
  if (o.grille) {
    const gw = Math.max(5, Math.round(w * 0.36));
    const gh = Math.max(4, Math.round(h * 0.13));
    const gx = x + Math.round((w - gw) / 2);
    const gy = y + Math.round(h * 0.3);
    for (let j = -1; j <= gh; j++)
      for (let i = -1; i <= gw; i++) {
        const edge = j < 0 || i < 0 || j === gh || i === gw;
        put(g, gx + i, gy + j, edge ? C(leaf, j < 0 || i < 0 ? 4 : 1) : C('glass', 4));
      }
    for (let i = 0; i < gw; i++) put(g, gx + i, gy + Math.floor(gh / 2), C('iron', 2));
    for (let j = 0; j < gh; j++) put(g, gx + Math.floor(gw / 2), gy + j, C('iron', 2));
    glow = { x: gx + gw / 2, y: gy + gh / 2, radius: m(0.6), strength: 0.3 };
  }
  if (o.fanlight) {
    // A half-round light over the door inside the frame's head.
    const fr = Math.round(w / 2);
    const fy = y - ft - 1;
    for (let j = 0; j < fr; j++)
      for (let i = -fr; i <= fr; i++) {
        const d = Math.hypot(i, j + 0.5);
        if (d > fr + 1) continue;
        const px = x + fr + i;
        const py = fy - j;
        if (d > fr - 1) put(g, px, py, C(leaf, d > fr ? 5 : 2));
        else if (i % 4 === 0 || Math.abs(Math.atan2(j, i) - Math.PI / 2) < 0.1)
          put(g, px, py, C(leaf, 3));
        else put(g, px, py, C('glass', j < 3 ? 4 : 3));
      }
    glow = { x: x + w / 2, y: fy - fr / 2, radius: m(0.7), strength: 0.28 };
  }
  return glow;
}

/** A stone step in front of a door, lit on its top and left. */
export function doorStep(g: TGrid, x: number, y: number, w: number): void {
  const sh = Math.max(3, m(0.2));
  for (let j = 0; j < sh; j++)
    for (let i = 0; i < w; i++) {
      let t = j === 0 ? 1 : j === sh - 1 ? 5 : 3;
      if (i === 0 && j > 0) t = 2;
      if (i === w - 1) t = 5;
      if (j > 0 && j < sh - 1 && hash(x + i, y + j, 3) < 0.08) t = 4;
      put(g, x + i, y + j, C('stone', t));
    }
}

// ------------------------------------------------------------------ roofs

/**
 * Darkens a band under an overhang (eaves, a jetty, a porch hood): two steps
 * where it starts, fading to none over `depth` rows in an ordered dither.
 * Only wall surfaces and timber take it; glass keeps its own dark.
 */
export function overhangShadow(g: TGrid, x0: number, x1: number, y: number, depth: number): void {
  for (let j = 0; j < depth; j++)
    for (let x = x0; x < x1; x++) {
      const f = 1 - j / depth;
      const c = at(g, x, y + j);
      if (!c) continue;
      const mt = matOf(c);
      if (mt === 'glass' || mt === 'pane') continue;
      dim(g, x, y + j, Math.floor(f * 2 + bayer(x, j) * 0.999));
    }
}

/**
 * A roof's outline: a hipped (or gabled, with `hip` 0) slope from `yTop` to
 * `yBot`, `hip` pixels in at the top on each side.
 */
export interface RoofShape {
  readonly xl: number;
  readonly xr: number;
  readonly yTop: number;
  readonly yBot: number;
  readonly hip: number;
}

const rowSpan = (r: RoofShape, y: number): [number, number] => {
  const ins = Math.round((r.hip * (r.yBot - 1 - y)) / Math.max(1, r.yBot - r.yTop - 1));
  return [r.xl + ins, r.xr - ins];
};

/**
 * Clay tiles in staggered courses: each a half-round lit on its left with a
 * rounded lower lip, the course above shading the top of the one below, the
 * whole slope a little lighter toward the sun, a few weathered and replaced.
 */
export function tileRoof(g: TGrid, r: RoofShape, k: number, mat: Mat = 'tile'): void {
  const th = Math.max(4, m(0.23));
  const tw = Math.max(5, m(0.34));
  const cx = (r.xl + r.xr) / 2;
  const span = r.xr - r.xl;
  const cap = Math.max(3, m(0.12));
  for (let y = r.yTop; y < r.yBot; y++) {
    const [a, b] = rowSpan(r, y);
    const fromBot = r.yBot - 1 - y;
    const row = Math.floor(fromBot / th);
    const py = th - 1 - (fromBot % th);
    const stagger = row % 2 ? Math.floor(tw / 2) : 0;
    for (let x = a; x <= b; x++) {
      const kx = (((x + stagger) % tw) + tw) % tw;
      const tile = Math.floor((x + stagger) / tw);
      let t = kx <= 1 ? 1 : kx >= tw - 2 ? 3 : 2;
      const ex = Math.min(kx, tw - 1 - kx);
      const round = Math.max(1, Math.round(th * 0.35));
      const lip = th - 1 - py;
      if (kx === 0 && py > th * 0.45) t = 5;
      else if (lip < round && ex < round - lip) t = 5;
      else if (py === 0) t = Math.max(t + 2, 4);
      else if (py === 1) t = Math.max(t + 1, 3);
      else if (lip === 0) t = Math.max(1, t - 1);
      const rnd = hash(tile, row, k);
      if (rnd < 0.07) t += 1;
      else if (rnd > 0.95) t -= 1;
      const tileX = tile * tw - stagger + tw / 2;
      const lean = ((tileX - cx) / span) * 1.3 + (hash(tile, row, k + 5) - 0.5) * 0.5;
      put(g, x, y, C(mat, t === 5 ? 5 : clamp(t + lean, 1, 5)));
    }
    if (r.hip > 0)
      for (let i = 0; i < cap; i++) {
        put(g, a + i, y, C(mat, (y + i) % th === 0 ? 3 : i === 0 ? 1 : 2));
        put(g, b - i, y, C(mat, (y + i) % th === 0 ? 5 : i === 0 ? 5 : 4));
      }
  }
  ridge(g, r, cap, tw + 2, mat);
}

/** The ridge along a roof's top: capping pieces lit on top. */
function ridge(g: TGrid, r: RoofShape, cap: number, every: number, mat: Mat): void {
  for (let j = 0; j < cap + 1; j++)
    for (let x = r.xl + r.hip; x <= r.xr - r.hip; x++) {
      const kx = (x - r.xl) % every;
      let t = j === 0 ? 1 : j === cap ? 4 : 2;
      if (kx === 0) t = 4;
      put(g, x, r.yTop + j - 1, C(mat, t));
    }
}

/**
 * Slates: thin, flat and cool, in courses whose lower edges cast a hard line
 * of shadow on the course below; joints staggered, a few slates newer and
 * paler, a few slipped a pixel; lead along the hips.
 */
export function slateRoof(g: TGrid, r: RoofShape, k: number): void {
  const th = Math.max(4, m(0.15));
  const cap = Math.max(3, m(0.1));
  const cx = (r.xl + r.xr) / 2;
  const span = r.xr - r.xl;
  for (let y = r.yTop; y < r.yBot; y++) {
    const [a, b] = rowSpan(r, y);
    const fromBot = r.yBot - 1 - y;
    const row = Math.floor(fromBot / th);
    const py = th - 1 - (fromBot % th);
    let edge = a - Math.floor(hash(row, k, 1) * m(0.3));
    let n = 0;
    let sw = m(0.24) + Math.floor(hash(row, n, k) * m(0.14));
    for (let x = a; x <= b; x++) {
      while (x >= edge + sw) {
        edge += sw;
        n++;
        sw = m(0.24) + Math.floor(hash(row, n, k) * m(0.14));
      }
      const kx = x - edge;
      const slipped = hash(row, n, k + 3) < 0.05 ? 1 : 0;
      const tone = 2 + (hash(row, n, k + 1) < 0.18 ? 1 : 0) - (hash(row, n, k + 2) < 0.1 ? 1 : 0);
      let t = tone;
      if (py === th - 1 - slipped || (slipped && py === th - 1)) t = 5;
      else if (py === 0) t = tone + 2;
      else if (py === 1) t = tone + 1;
      else if (kx === 0) t = 5;
      else if (kx === 1) t = Math.max(1, tone - 1);
      else if (kx === sw - 1) t = tone + 1;
      const lean = ((x - cx) / span) * 1.1;
      put(g, x, y, C('slate', t >= 5 ? 5 : clamp(t + lean, 1, 4)));
    }
    // Lead on the hips, lit on the left one.
    if (r.hip > 0)
      for (let i = 0; i < cap; i++) {
        put(g, a + i, y, C('iron', i === 0 ? 1 : 2));
        put(g, b - i, y, C('iron', i === 0 ? 5 : 4));
      }
  }
  for (let j = 0; j < cap + 1; j++)
    for (let x = r.xl + r.hip; x <= r.xr - r.hip; x++)
      put(g, x, r.yTop + j - 1, C('iron', j === 0 ? 1 : j === cap ? 4 : 2));
}

/**
 * Thatch: a deep, soft roof of straw laid in courses, each course's lower
 * edge a ragged fringe that shades the next; combed streaks run down the
 * slope; a patterned ridge of liggers along the top; the slope rounds over
 * at the eaves and hips.
 */
export function thatchRoof(g: TGrid, r: RoofShape, k: number): void {
  const course = m(0.5);
  const ridgeH = m(0.42);
  for (let y = r.yTop; y < r.yBot; y++) {
    const [a, b] = rowSpan(r, y);
    for (let x = a; x <= b; x++) {
      const fromBot = r.yBot - 1 - y;
      const fringe = Math.floor(hash(Math.floor(x / 2), Math.floor(fromBot / course), k) * 4);
      const py = (fromBot + fringe) % course;
      // Long streaks of straw running down the slope, light and dark.
      const sx = Math.floor((x + Math.sin(y / 13) * 1.5) / 2);
      const s = hash(sx, Math.floor((y + hash(sx, 0, k + 2) * 30) / 11), k + 1);
      let t = 2;
      if (s < 0.22) t = 1;
      else if (s > 0.8) t = 3;
      // Each course's ragged lower edge shades the top of the next.
      if (py === 0) t = 4;
      else if (py === 1) t = Math.max(t, 3);
      else if (py === course - 1 && s < 0.6) t = 1;
      // Lumps in the coat, a whole step either way, soft-edged.
      // Lumps in the coat catch the light.
      if (fbm(x, y, m(0.9), k + 3) > 0.7) t -= 1;
      // Rounded over at the hips and eaves: darker toward the right hip.
      const edgeR = b - x;
      const edgeL = x - a;
      if (edgeR < 5) t += edgeR < 2 ? 2 : 1;
      if (edgeL < 3) t = Math.max(1, t - 1);
      if (fromBot < 4) t += fromBot < 2 ? 2 : 1;
      t += Math.round(((x - (r.xl + r.xr) / 2) / (r.xr - r.xl)) * 1.2);
      put(g, x, y, C('thatch', clamp(t, 1, 5)));
    }
  }
  // The ridge: a raised band with crossed liggers.
  for (let j = 0; j < ridgeH; j++) {
    const y = r.yTop + j - 2;
    const [a, b] = rowSpan(r, Math.max(r.yTop, y));
    for (let x = a + 2; x <= b - 2; x++) {
      let t = j === 0 ? 1 : j === ridgeH - 1 ? 5 : j < ridgeH / 2 ? 2 : 3;
      const p = (x + (j < ridgeH / 2 ? j : ridgeH - j)) % 10;
      if (j > 1 && j < ridgeH - 2 && (p === 0 || (x - j * 2) % 10 === 0)) t = 4;
      put(g, x, y, C('thatch', t));
    }
    // Scalloped lower edge of the ridge.
    if (j === ridgeH - 1)
      for (let x = a + 2; x <= b - 2; x++)
        if (Math.sin((x - a) / 3.2) > 0.3) put(g, x, y + 1, C('thatch', 4));
  }
}

/**
 * Moss on a roof: cushions, not dashes. Each clump is a few overlapping
 * domes sitting on a course's lip, lit on its upper left, with a dark
 * underside where it meets the roof and a fleck of brighter growth on top.
 * Clumps gather where `fbm` runs high, in the lower part of the slope and
 * along the hips.
 */
export function moss(g: TGrid, r: RoofShape, k: number, count: number, roof: Mat): void {
  let placed = 0;
  for (let tries = 0; tries < count * 30 && placed < count; tries++) {
    const y = r.yTop + m(0.3) + Math.floor(hash(tries, k, 71) * (r.yBot - r.yTop - m(0.4)));
    const [a, b] = rowSpan(r, y);
    if (b - a < 20) continue;
    const x = a + 4 + Math.floor(hash(k, tries, 72) * (b - a - 8));
    const low = (y - r.yTop) / (r.yBot - r.yTop);
    const nearHip = Math.min(x - a, b - x) < m(0.6);
    if (fbm(x, y, m(1.4), k + 9) < 0.55 && !nearHip) continue;
    if (low < 0.35 && !nearHip) continue;
    if (!isMat(at(g, x, y), roof)) continue;
    clump(g, x, y, 3 + Math.floor(hash(tries, 1, k) * 4), k + tries);
    placed++;
  }
}

function clump(g: TGrid, x: number, y: number, size: number, k: number): void {
  const blobs = 2 + Math.floor(hash(k, 2, 0) * 3);
  const cells: [number, number, number][] = [];
  for (let b = 0; b < blobs; b++) {
    const bx = x + Math.round((hash(k, b, 3) - 0.5) * size * 1.6);
    const by = y + Math.round((hash(b, k, 4) - 0.5) * 2);
    const rx = size * (0.6 + hash(b, k, 5) * 0.5);
    const ry = Math.max(1.6, rx * 0.55);
    for (let j = Math.floor(-ry); j <= Math.ceil(ry); j++)
      for (let i = Math.floor(-rx); i <= Math.ceil(rx); i++) {
        const d = (i / rx) ** 2 + (j / ry) ** 2;
        if (d > 1) continue;
        // Light from the upper left on a dome.
        const lam = -(i / rx) * 0.6 - (j / ry) * 0.8;
        cells.push([bx + i, by + j, lam]);
      }
  }
  for (const [px, py, lam] of cells) {
    let t = 3 - Math.round(lam * 1.6);
    if (hash(px, py, k) < 0.12) t -= 1;
    put(g, px, py, C('moss', clamp(t, 1, 5)));
  }
  // The underside, where the cushion meets the roof.
  for (const [px, py] of cells) {
    if (!cells.some(([qx, qy]) => qx === px && qy === py + 1)) {
      const c = at(g, px, py + 1);
      if (c && !isMat(c, 'moss')) put(g, px, py + 1, C('moss', 6));
    }
  }
}

// ------------------------------------------------------------------ fittings

/**
 * A chimney stack: stone in courses, a projecting cap, a dark flue, lead
 * flashing where it meets the roof, and its shadow cast down and to the
 * right across the roof.
 */
export function chimney(
  g: TGrid,
  x: number,
  top: number,
  bottom: number,
  w: number,
  k: number,
  mat: Mat = 'stone',
): void {
  // The shadow on the roof first, so the stack stands over it.
  for (let y = top + m(0.4); y < bottom + m(0.7); y++) {
    const sw = m(0.55) - Math.max(0, Math.round((y - bottom) * 0.8));
    for (let xx = x + w; xx < x + w + sw; xx++) {
      const c = at(g, xx, y);
      if (c && matOf(c) !== mat) dim(g, xx, y, 1);
    }
  }
  ashlar(g, { x, y: top + 3, w, h: bottom - top - 3 }, k, m(0.17), mat);
  // Soot toward the top.
  for (let y = top + 3; y < top + 3 + m(0.3); y++)
    for (let xx = x; xx < x + w; xx++)
      if (bayer(xx, y) < 0.5 - (y - top) / m(0.6)) dim(g, xx, y, 1);
  const capH = Math.max(3, m(0.14));
  for (let j = 0; j < capH; j++)
    for (let i = -2; i < w + 2; i++)
      put(g, x + i, top + j, C(mat, j === 0 ? 1 : i === w + 1 || j === capH - 1 ? 5 : 3));
  // Two pots.
  const pw = Math.max(4, m(0.14));
  for (const px of [x + Math.round(w * 0.2), x + Math.round(w * 0.6)]) {
    const ph = m(0.22);
    for (let j = 0; j < ph; j++)
      for (let i = 0; i < pw; i++) {
        const nx = ((i + 0.5) / pw) * 2 - 1;
        put(
          g,
          px + i,
          top - ph + j,
          C('tile', clamp(cyl(nx, 2.2, 1.3) + (j === 0 ? -1 : 0), 1, 5)),
        );
      }
    for (let i = 1; i < pw - 1; i++) put(g, px + i, top - ph, C('shade', 1));
  }
  for (let i = -1; i <= w; i++) {
    put(g, x + i, bottom, C('iron', i === -1 ? 1 : 2));
    put(g, x + i, bottom + 1, C('iron', 3));
  }
}

/** A wall lantern on a bracket: iron frame, warm glass, its shadow on the wall. */
export function wallLantern(g: TGrid, x: number, y: number): Glow {
  const lw = Math.max(5, m(0.3));
  const lh = Math.max(7, m(0.42));
  for (let i = 0; i < m(0.25); i++) put(g, x + Math.round(lw / 2), y - 1 - i, C('iron', 3));
  for (let i = 0; i < m(0.2); i++) put(g, x + Math.round(lw / 2) - i, y - m(0.25), C('iron', 2));
  for (let j = 0; j < lh; j++)
    for (let i = 0; i < lw; i++) {
      const frame = i === 0 || i === lw - 1 || j === 0 || j === lh - 1;
      put(
        g,
        x + i,
        y + j,
        frame
          ? C('iron', i === 0 ? 2 : 4)
          : C('lamp', i === 1 && j < lh / 2 ? 0 : j > lh * 0.6 ? 3 : 1),
      );
    }
  for (let i = -1; i <= lw; i++) put(g, x + i, y - 1, C('iron', 2));
  for (let j = 0; j < lh; j++) {
    dim(g, x + lw, y + j + 1, 2);
    dim(g, x + lw + 1, y + j + 2, 1);
  }
  return { x: x + lw / 2, y: y + lh / 2, radius: m(1.6), strength: 0.5 };
}

/**
 * A hanging sign on an iron bracket out from a wall at (x, y): a framed
 * board, and whatever `paint` draws on its face (given the face's box).
 */
export function hangingSign(
  g: TGrid,
  x: number,
  y: number,
  out: number,
  bw: number,
  bh: number,
  paint: (face: Rect) => void,
  k: number,
  face: Mat = 'linen',
): void {
  const bt = Math.max(2, m(0.08));
  for (let i = 0; i < out; i++)
    for (let j = 0; j < bt; j++) put(g, x + i, y + j, C('iron', j === 0 ? 1 : 3));
  // The curl under the bracket.
  const cr = Math.round(out * 0.32);
  for (let a = 0; a < 30; a++) {
    const th = Math.PI / 2 + (a / 30) * Math.PI;
    put(g, x + cr + Math.cos(th) * cr, y + bt + cr + Math.sin(th) * cr - cr, C('iron', 3));
  }
  for (let i = 0; i < Math.round(out * 0.55); i++)
    put(g, x + i, y + bt + Math.round(out * 0.55) - i, C('iron', 3));
  const bx = x + out - bw - 2;
  const by = y + bt + m(0.22);
  for (const hx of [bx + Math.round(bw * 0.15), bx + Math.round(bw * 0.85)])
    for (let yy = y + bt; yy < by; yy++) put(g, hx, yy, C('iron', (yy & 1) === 0 ? 2 : 4));
  const fr = Math.max(2, m(0.07));
  for (let j = 0; j < bh; j++)
    for (let i = 0; i < bw; i++) {
      const edge = i < fr || j < fr || i >= bw - fr || j >= bh - fr;
      // The face is painted: one step, a little worn, its upper left catching the light.
      const base = face === 'linen' ? 1 : 4;
      let t = edge ? 4 : base;
      if (edge && (i === 0 || j === 0)) t = 2;
      if (i === bw - 1 || j === bh - 1) t = 5;
      if (!edge && hash(bx + i, Math.floor((by + j) / 3), k) < 0.12) t = base + 1;
      if (!edge && i < fr + 2 && j < bh / 2) t = base - 1;
      put(g, bx + i, by + j, C(edge ? 'wood' : face, t));
    }
  paint({ x: bx + fr, y: by + fr, w: bw - 2 * fr, h: bh - 2 * fr });
}

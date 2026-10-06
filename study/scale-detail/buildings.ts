/**
 * Art study (not shipped): the tavern (and a plain neighbour) drawn to scale
 * at any size. `u` is art pixels per metre; a door is two metres tall, so at
 * u = 28 the door is 56 pixels, taller than a 47-pixel hero. Every texture
 * (tiles, timbers, stones, panes, planks) is laid out in metres and drawn
 * natively at that size, so nothing is scaled up from a smaller drawing.
 *
 * Same building as the approved tavern (src/art/scenery.ts): timber frame
 * and plaster on a stone plinth, a patched red tiled roof, a chimney, teal
 * shutters, a window box, a lantern by the door and a hanging tankard sign.
 * What is new is light: a lit left edge and a shadow right edge on every
 * timber, shadows cast by beams, sills, the oversailing upper floor and the
 * eaves, recessed windows and door, and per-tile and per-stone shading.
 */
import {
  at,
  cell,
  darker,
  hash,
  matOf,
  put,
  selOut,
  stepOf,
  tgrid,
  type Cell,
  type TGrid,
} from './engine';
import type { Mat } from './ramps';
import { bayer, fbm } from './texture';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Building {
  readonly grid: TGrid;
  /** The row the building stands on (first row of ground in front of it). */
  readonly base: number;
  /** The door opening, if it has one. */
  readonly door: Rect | null;
  /** Left and right of the ground-floor wall, for laying shadows. */
  readonly wallX0: number;
  readonly wallX1: number;
}

export interface BuildingCfg {
  readonly bays: number;
  /** Which bay holds the door, or -1. */
  readonly doorBay: number;
  readonly roof: Mat;
  readonly seed: number;
  readonly sign: boolean;
  /** Where the chimney stands, 0..1 across the wall. */
  readonly chimney: number;
  readonly windowBox: number;
  readonly shutters: readonly number[];
}

const C = cell;

/** Darkens one pixel in place. */
function dim(g: TGrid, x: number, y: number, n: number): void {
  const c = at(g, x, y);
  if (c) put(g, x, y, darker(c, n));
}

/** A timber, upright: lit left edge, grain in streaks, shadow right edge. */
function beamV(g: TGrid, x: number, y: number, w: number, h: number, k: number, mask?: Uint8Array) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      let t = 3;
      if (i === 0) t = 2;
      else if (i === w - 1) t = 5;
      else if (i === w - 2 && w >= 4) t = 4;
      else {
        const streak = hash(x + i, Math.floor((y + j + hash(x + i, k) * 40) / 7), k) < 0.22;
        if (streak) t = 4;
      }
      if (j === 0 && i < w - 1) t = Math.min(t, 2);
      put(g, x + i, y + j, C('wood', t));
      if (mask) mask[(y + j) * g.w + x + i] = 1;
    }
  // A knot or two.
  if (w >= 5 && h > 20) {
    const ky = y + 6 + Math.floor(hash(x, y, k + 3) * (h - 12));
    put(g, x + 2, ky, C('wood', 5));
    put(g, x + 2, ky - 1, C('wood', 2));
  }
}

/** A timber, lying: lit top edge, grain along it, shadow underneath. */
function beamH(g: TGrid, x: number, y: number, w: number, h: number, k: number, mask?: Uint8Array) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      let t = 3;
      if (j === 0) t = 2;
      else if (j === h - 1) t = 5;
      else if (j === h - 2 && h >= 4) t = 4;
      else if (hash(Math.floor((x + i + hash(y + j, k) * 50) / 9), y + j, k) < 0.25) t = 4;
      if (i === 0 && j < h - 1) t = Math.min(t, 2);
      put(g, x + i, y + j, C('wood', t));
      if (mask) mask[(y + j) * g.w + x + i] = 1;
    }
}

/** A diagonal brace from (x0, y0) to (x1, y1), `w` thick, lit on its upper side. */
function brace(
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

/** Lime plaster: pale, mottled, a little dirtier toward the ground, the odd crack. */
function plaster(
  g: TGrid,
  x: number,
  y: number,
  w: number,
  h: number,
  dirtFrom: number,
  u: number,
) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const px = x + i;
      const py = y + j;
      let t = 2 + (fbm(px, py, u * 0.9, 11) - 0.5) * 0.85;
      const r = hash(px, py, 21);
      if (r < 0.025) t -= 1;
      else if (r > 0.975) t += 1;
      if (py > dirtFrom) t += ((py - dirtFrom) / (y + h - dirtFrom)) * 1.1;
      put(g, px, py, C('plaster', Math.max(1, Math.min(4, Math.round(t)))));
    }
  // Hairline cracks.
  const n = Math.round((w * h) / (u * u * 3));
  for (let c = 0; c < n; c++) {
    let cx = x + Math.floor(hash(x, c, 31) * w);
    let cy = y + Math.floor(hash(y, c, 32) * h);
    const len = 3 + Math.floor(hash(c, x, 33) * u * 0.25);
    for (let s = 0; s < len; s++) {
      put(g, cx, cy, C('plaster', 4));
      cx += hash(cx, cy, 34) < 0.5 ? 1 : 0;
      cy += 1;
    }
  }
}

/** Cut stone in courses: each block lit on its top and left, shadowed below and right. */
export function stones(
  g: TGrid,
  x: number,
  y: number,
  w: number,
  h: number,
  u: number,
  k: number,
  mat: Mat = 'stone',
): void {
  const ch = Math.max(3, Math.round(0.24 * u));
  for (let row = 0; row * ch < h; row++) {
    const y0 = y + row * ch;
    let bx = x - Math.floor(hash(row, k, 41) * u * 0.5);
    while (bx < x + w) {
      const bw = Math.max(4, Math.round(u * (0.35 + hash(bx, row, k) * 0.45)));
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
          else if (hash(px, y0 + j, k + 4) < 0.08) t = tone + 1;
          // Rounded corners: the mortar takes them.
          if ((i === 0 || i === bw - 2) && (j === 0 || j === ch - 2) && ch > 4) t = 4;
          put(g, px, y0 + j, C(mat, Math.max(1, Math.min(5, t))));
        }
      bx += bw;
    }
  }
}

/** A window: frame, recessed panes with a reflection, a sill that casts a shadow. */
function windowAt(
  g: TGrid,
  x: number,
  y: number,
  w: number,
  h: number,
  nx: number,
  ny: number,
  u: number,
  shutters: boolean,
): void {
  const ft = Math.max(1, Math.round(0.08 * u));
  // Frame.
  for (let j = -ft; j < h + ft; j++)
    for (let i = -ft; i < w + ft; i++) {
      const edge = j < 0 || i < 0 || j >= h || i >= w;
      if (!edge) continue;
      let t = 3;
      if (j === -ft || i === -ft) t = 2;
      if (j === h + ft - 1 || i === w + ft - 1) t = 5;
      put(g, x + i, y + j, C('wood', t));
    }
  // Glass: dark inside, a pale sky reflection in a diagonal band, the reveal's shadow.
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const d = i + j * 0.9;
      let t = 4;
      const band = (d % (w * 0.9)) / (w * 0.9);
      if (band < 0.18) t = 2;
      else if (band < 0.26) t = 3;
      if (j < Math.max(1, Math.round(u * 0.08)) || i < 1) t = 5;
      put(g, x + i, y + j, C('glass', t));
    }
  // Glazing bars.
  for (let a = 1; a < nx; a++) {
    const bx = x + Math.round((a * w) / nx);
    for (let j = 0; j < h; j++) put(g, bx, y + j, C('wood', j === 0 ? 4 : 3));
  }
  for (let b = 1; b < ny; b++) {
    const by = y + Math.round((b * h) / ny);
    for (let i = 0; i < w; i++) put(g, x + i, by, C('wood', 3));
    for (let i = 0; i < w; i++) dim(g, x + i, by + 1, 1);
  }
  // Pane corner glints.
  for (let a = 0; a < nx; a++)
    for (let b = 0; b < ny; b++) {
      const px = x + Math.round((a * w) / nx) + 2;
      const py = y + Math.round((b * h) / ny) + 2;
      if (u >= 24) put(g, px, py, C('glass', 0));
    }
  // Sill, and its shadow on the wall.
  const sh = Math.max(2, Math.round(0.1 * u));
  for (let j = 0; j < sh; j++)
    for (let i = -ft - 2; i < w + ft + 2; i++)
      put(g, x + i, y + h + ft + j, C('wood', j === 0 ? 1 : j === sh - 1 ? 5 : 3));
  for (let j = 0; j < Math.max(1, Math.round(u * 0.07)); j++)
    for (let i = -ft - 1; i < w + ft + 3; i++)
      dim(g, x + i, y + h + ft + sh + j, 1 + (j === 0 ? 1 : 0));
  if (!shutters) return;
  // Teal shutters, open against the wall: planks, ledges, and a shadow to their right.
  const sw = Math.round(w * 0.42);
  for (const side of [-1, 1]) {
    const sx = side < 0 ? x - ft - sw - 1 : x + w + ft + 1;
    for (let j = -ft; j < h + ft; j++)
      for (let i = 0; i < sw; i++) {
        const pw = Math.max(2, Math.round(u * 0.12));
        let t = 2;
        if (i % pw === pw - 1) t = 4;
        if (i === 0) t = 1;
        if (i === sw - 1) t = 5;
        const ledge = Math.max(1, Math.round(u * 0.07));
        const ly = (j + ft) % Math.floor((h + 2 * ft) / 2);
        if (ly < ledge) t = Math.min(t, 1);
        else if (ly === ledge) t = 4;
        if (j === -ft) t = 1;
        if (j === h + ft - 1) t = 5;
        put(g, sx + i, y + j, C('teal', t));
      }
    for (let j = -ft + 1; j < h + ft + 1; j++) dim(g, sx + sw, y + j, 2);
  }
}

/** The door: framed, recessed, plank leaf with strap hinges, a ring and a little grille. */
function door(g: TGrid, x: number, y: number, w: number, h: number, u: number): void {
  const ft = Math.max(2, Math.round(0.13 * u));
  const fake = new Uint8Array(g.w * g.h);
  beamH(g, x - ft, y - ft, w + 2 * ft, ft, 9, fake);
  beamV(g, x - ft, y, ft, h, 8, fake);
  beamV(g, x + w, y, ft, h, 10, fake);
  const pw = Math.max(3, Math.round(0.18 * u));
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const p = i % pw;
      let t = 2;
      if (p === pw - 1) t = 5;
      else if (p === 0) t = 1;
      else if (hash(x + i, Math.floor((y + j + hash(i, 3) * 30) / 6), 77) < 0.18) t = 3;
      // The opening's top and left are in shadow.
      const sd = Math.max(2, Math.round(u * 0.12));
      if (j < sd) t += 2;
      else if (j < sd * 2) t += 1;
      if (i < Math.max(1, Math.round(u * 0.05))) t += 1;
      put(g, x + i, y + j, C('wood', Math.min(5, t)));
    }
  // Strap hinges with nails.
  const hh = Math.max(1, Math.round(0.07 * u));
  for (const fy of [0.24, 0.76]) {
    const hy = y + Math.round(h * fy);
    const len = Math.round(w * 0.72);
    for (let i = 0; i < len; i++)
      for (let j = 0; j < hh + (i < len * 0.2 ? 1 : 0); j++) {
        put(g, x + i, hy + j, C('iron', j === 0 ? 1 : j === hh - 1 && hh > 1 ? 3 : 2));
      }
    for (let i = 0; i < len; i++) dim(g, x + i, hy + hh + (i < len * 0.2 ? 1 : 0), 1);
    if (u >= 24)
      for (let i = 2; i < len; i += pw) put(g, x + i, hy + (hh > 1 ? 1 : 0), C('iron', 0));
  }
  // Ring handle.
  const rx = x + w - Math.round(w * 0.25);
  const ry = y + Math.round(h * 0.52);
  const rr = Math.max(1.5, u * 0.08);
  for (let a = 0; a < 24; a++) {
    const th = (a / 24) * Math.PI * 2;
    put(g, rx + Math.cos(th) * rr, ry + rr + Math.sin(th) * rr, C('iron', a < 12 ? 3 : 1));
  }
  put(g, rx, ry - 1, C('iron', 2));
  // A small barred window in the door.
  if (u >= 15) {
    const gw = Math.max(4, Math.round(w * 0.36));
    const gh = Math.max(3, Math.round(h * 0.13));
    const gx = x + Math.round((w - gw) / 2);
    const gy = y + Math.round(h * 0.33);
    for (let j = -1; j <= gh; j++)
      for (let i = -1; i <= gw; i++) {
        const edge = j < 0 || i < 0 || j === gh || i === gw;
        put(g, gx + i, gy + j, edge ? C('wood', j < 0 || i < 0 ? 4 : 1) : C('glass', 4));
      }
    // A warm glow from inside.
    for (let j = 1; j < gh; j++)
      for (let i = 1; i < gw; i++)
        if (hash(gx + i, gy + j, 3) < 0.35) put(g, gx + i, gy + j, C('lamp', 4));
    for (let i = 0; i < gw; i++) put(g, gx + i, gy + Math.floor(gh / 2), C('iron', 2));
    for (let j = 0; j < gh; j++) put(g, gx + Math.floor(gw / 2), gy + j, C('iron', 2));
  }
}

/** Clay pantiles in staggered rows, each lit on its left and shaded under the row above. */
function tileRoof(
  g: TGrid,
  xl: number,
  xr: number,
  yTop: number,
  yBot: number,
  hipIn: number,
  u: number,
  mat: Mat,
  k: number,
): void {
  const th = Math.max(3, Math.round(0.23 * u));
  const tw = Math.max(4, Math.round(0.34 * u));
  const rh = yBot - yTop;
  const cx = (xl + xr) / 2;
  const span = xr - xl;
  const cap = Math.max(2, Math.round(0.12 * u));
  for (let y = yTop; y < yBot; y++) {
    const ins = Math.round((hipIn * (yBot - 1 - y)) / (rh - 1));
    const a = xl + ins;
    const b = xr - ins;
    const fromBot = yBot - 1 - y;
    const row = Math.floor(fromBot / th);
    const py = th - 1 - (fromBot % th);
    const stagger = row % 2 ? Math.floor(tw / 2) : 0;
    for (let x = a; x <= b; x++) {
      const kx = (((x + stagger) % tw) + tw) % tw;
      const tile = Math.floor((x + stagger) / tw);
      // Each tile a half-round: lit on its left, its right turning into shadow;
      // its lower end rounded, so the courses read as scalloped tiles, not brick.
      let t = kx <= 1 ? 1 : kx >= tw - 2 ? 3 : 2;
      const ex = Math.min(kx, tw - 1 - kx);
      const round = Math.max(1, Math.round(th * 0.35));
      const lip = th - 1 - py;
      if (kx === 0 && py > th * 0.45) t = 5;
      else if (lip < round && ex < round - lip) t = 5;
      // The course above overlaps the top of this one and shades it.
      else if (py === 0) t = Math.max(t + 2, 4);
      else if (py === 1 && th > 4) t = Math.max(t + 1, 3);
      else if (lip === 0) t = Math.max(1, t - 1);
      // Weathered and replaced tiles.
      const r = hash(tile, row, k);
      if (r < 0.07) t += 1;
      else if (r > 0.95) t -= 1;
      // The whole slope a little lighter to the left, where the sun is: a
      // whole tile at a time, so the change never breaks into a checkerboard.
      const tileX = Math.floor((x + stagger) / tw) * tw - stagger + tw / 2;
      const lean = ((tileX - cx) / span) * 1.3 + (hash(tile, row, k + 5) - 0.5) * 0.5;
      let m: Mat = mat;
      let step = t === 5 ? 5 : Math.round(t + lean);
      // Moss in clumps along a few tiles' lips, low on the roof.
      const moss = fbm(tileX, y, u * 1.2, k + 9);
      if (
        moss > 0.72 &&
        fromBot < rh * 0.45 &&
        lip <= 2 &&
        ex >= 2 &&
        hash(tile, row, k + 7) < 0.4
      ) {
        m = 'pine';
        step = lip === 0 ? 3 : lip === 1 ? 2 : 1;
      }
      put(g, x, y, C(m, Math.max(1, Math.min(5, step))));
    }
    // Hip cap tiles along the sloping edges: lit on the left hip, shaded on the right.
    if (hipIn > 0) {
      for (let i = 0; i < cap; i++) {
        put(g, a + i, y, C(mat, (y + i) % th === 0 ? 3 : i === 0 ? 1 : 2));
        put(g, b - i, y, C(mat, (y + i) % th === 0 ? 5 : i === 0 ? 5 : 4));
      }
    }
  }
  // The ridge along the top.
  const ins = hipIn;
  for (let j = 0; j < cap + 1; j++)
    for (let x = xl + ins; x <= xr - ins; x++) {
      const kx = (x - xl) % (tw + 2);
      let t = j === 0 ? 1 : j === cap ? 4 : 2;
      if (kx === 0) t = 4;
      put(g, x, yTop + j - 1, C(mat, t));
    }
}

/** The tavern, or with other settings a plainer neighbour, at `u` pixels a metre. */
export function building(u: number, cfg: BuildingCfg): Building {
  const tb = Math.max(3, Math.round(0.21 * u));
  const bayW = Math.round(2.5 * u);
  const wallW = cfg.bays * bayW + tb;
  const jo = Math.max(1, Math.round(0.16 * u));
  const eo = Math.round(0.42 * u);
  const plinthH = Math.round(0.5 * u);
  const g1 = Math.round(3.05 * u) - plinthH;
  const jb = tb + Math.max(2, Math.round(tb / 2));
  const g2 = Math.round(2.45 * u);
  const rh = Math.round(3.2 * u);
  const chimH = Math.round(1.15 * u);
  const signOut = cfg.sign ? Math.round(1.55 * u) : 0;
  const left = jo + eo + 2;
  const W = left + wallW + jo + eo + signOut + 3;
  const roofTop = chimH + 2;
  const roofBot = roofTop + rh;
  const upTop = roofBot - Math.round(0.4 * u);
  const upBot = roofBot + g2;
  const jTop = upBot;
  const jBot = upBot + jb;
  const gTop = jBot;
  const gBot = gTop + g1;
  const base = gBot + plinthH;
  const H = base + Math.round(0.3 * u) + 3;
  const g = tgrid(W, H);
  const timber = new Uint8Array(W * H);
  const k = cfg.seed;

  // Walls.
  const ux0 = left - jo;
  const uw = wallW + 2 * jo;
  plaster(g, ux0, upTop, uw, upBot - upTop, upBot, u);
  plaster(g, left, gTop, wallW, gBot - gTop, gBot - Math.round(0.9 * u), u);

  // Upper floor timbers: posts, a rail under the windows, chevron braces below it.
  const upRail = upBot - Math.round(0.95 * u);
  const upPost = (i: number) => ux0 + Math.round((i * (uw - tb)) / cfg.bays);
  beamH(g, ux0, upRail, uw, tb, k + 1, timber);
  for (let i = 0; i < cfg.bays; i++) {
    const p0 = upPost(i) + tb;
    const p1 = upPost(i + 1);
    const mid = Math.round((p0 + p1) / 2);
    brace(g, p0 + tb * 0.4, upBot - 1, mid - tb * 0.2, upRail + tb, tb, timber);
    brace(g, p1 - tb * 0.4, upBot - 1, mid + tb * 0.2, upRail + tb, tb, timber);
    // Short studs either side of the window.
    const ww = Math.round(1.1 * u);
    for (const sx of [
      mid - Math.round(ww / 2) - tb - Math.round(0.45 * u),
      mid + Math.round(ww / 2) + Math.round(0.45 * u),
    ])
      beamV(g, sx, upTop, tb, upRail - upTop, k + 3 + i, timber);
  }
  for (let i = 0; i <= cfg.bays; i++)
    beamV(g, upPost(i), upTop, tb, upBot - upTop, k + 20 + i, timber);

  // Ground floor timbers: posts, a rail under the windows (broken by the door), a sole plate.
  const gPost = (i: number) => left + i * bayW;
  const gRail = base - Math.round(1.0 * u);
  for (let i = 0; i < cfg.bays; i++) {
    if (i === cfg.doorBay) continue;
    beamH(g, gPost(i), gRail, bayW + tb, tb, k + 40 + i, timber);
  }
  for (let i = 0; i <= cfg.bays; i++) beamV(g, gPost(i), gTop, tb, gBot - gTop, k + 50 + i, timber);
  // Cast shadows from the timbers onto the plaster: down and to the right.
  const sd = Math.max(1, Math.round(u * 0.05));
  for (let y = upTop; y < gBot; y++)
    for (let x = ux0; x < ux0 + uw; x++) {
      const i = y * W + x;
      if (timber[i] || matOf(at(g, x, y) || C('ink', 0)) !== 'plaster') continue;
      let n = 0;
      if (timber[i - 1] || timber[i - W]) n = 2;
      else
        for (let s = 2; s <= sd + 1; s++)
          if (timber[i - s] || timber[i - s * W] || timber[i - s * W - s]) n = Math.max(n, 1);
      if (n) dim(g, x, y, n);
    }

  // Windows: upper floor one a bay, ground floor one a bay but the door's.
  for (let i = 0; i < cfg.bays; i++) {
    const p0 = upPost(i) + tb;
    const p1 = upPost(i + 1);
    const ww = Math.round(1.1 * u);
    const wh = Math.round(1.05 * u);
    windowAt(
      g,
      Math.round((p0 + p1 - ww) / 2),
      upRail - wh - Math.round(0.28 * u),
      ww,
      wh,
      2,
      2,
      u,
      cfg.shutters.includes(i),
    );
  }
  let doorRect: Rect | null = null;
  for (let i = 0; i < cfg.bays; i++) {
    const cx = gPost(i) + Math.round((bayW + tb) / 2);
    if (i === cfg.doorBay) {
      const dw = Math.round(1.05 * u);
      const dh = Math.round(2.0 * u);
      doorRect = { x: cx - Math.round(dw / 2), y: base - dh, w: dw, h: dh };
      continue;
    }
    const ww = Math.round(1.45 * u);
    const wh = Math.round(1.12 * u);
    windowAt(
      g,
      cx - Math.round(ww / 2),
      gRail - wh - Math.round(0.1 * u) - Math.max(2, Math.round(0.1 * u)),
      ww,
      wh,
      3,
      2,
      u,
      false,
    );
  }

  // The oversailing upper floor: its big beam, joist ends under it, and its shadow.
  beamH(g, ux0, jTop, uw, jb, k + 60, timber);
  const jsh = Math.round(0.42 * u);
  for (let j = 0; j < jsh; j++)
    for (let x = left; x < left + wallW; x++) {
      const f = 1 - j / jsh;
      dim(g, x, gTop + j, Math.floor(f * 2 + bayer(x, j) * 0.999));
    }
  const js = Math.max(2, Math.round(0.16 * u));
  for (let x = left + Math.round(0.3 * u); x < left + wallW - js; x += Math.round(0.62 * u)) {
    for (let j = 0; j < js; j++)
      for (let i = 0; i < js; i++) {
        const t = i === 0 || j === 0 ? 1 : i === js - 1 || j === js - 1 ? 4 : 2;
        put(g, x + i, gTop + j, C('wood', t));
      }
    for (let j = 0; j < js; j++) dim(g, x + js, gTop + j + 1, 2);
    for (let i = 0; i < js; i++) dim(g, x + i + 1, gTop + js, 2);
  }

  // Stone plinth.
  stones(g, left, gBot, wallW, plinthH, u, k + 70);

  // The door, cut through plinth and wall, and its step.
  if (doorRect) {
    const d = doorRect;
    door(g, d.x, d.y, d.w, d.h, u);
    const sh = Math.max(2, Math.round(0.2 * u));
    const sx = d.x - Math.round(0.22 * u);
    const sw = d.w + Math.round(0.44 * u);
    for (let j = 0; j < sh; j++)
      for (let i = 0; i < sw; i++) {
        let t = j === 0 ? 1 : j === sh - 1 ? 5 : 3;
        if (i === 0 && j > 0) t = 2;
        if (i === sw - 1) t = 5;
        put(g, sx + i, base - 1 + j, C('stone', t));
      }
  }

  // Roof: tiles over the eaves, a fascia board under them, the eaves' shadow on the wall.
  const xl = ux0 - eo;
  const xr = ux0 + uw + eo - 1;
  const fh = Math.max(2, Math.round(0.1 * u));
  const esh = Math.round(0.36 * u);
  for (let j = 0; j < esh; j++)
    for (let x = ux0; x < ux0 + uw; x++) {
      const f = 1 - j / esh;
      dim(g, x, roofBot + fh + j - 1, Math.floor(f * 2 + bayer(x, j) * 0.999));
    }
  tileRoof(g, xl, xr, roofTop, roofBot, Math.round(rh * 0.55), u, cfg.roof, k + 80);
  beamH(g, xl + 1, roofBot, xr - xl - 1, fh, k + 81);

  // Chimney: stone, a cap, soot, its lead flashing and its shadow down the roof.
  const cw = Math.round(0.85 * u);
  const ccx = Math.round(left + wallW * cfg.chimney);
  const cTop = 2;
  const cBot = roofTop + Math.round(rh * 0.36);
  for (let y = roofTop; y < cBot + Math.round(0.7 * u); y++) {
    const sw = Math.round(u * 0.5) - Math.max(0, Math.round((y - cBot) * 0.7));
    for (let x = ccx + cw; x < ccx + cw + sw; x++)
      if (matOf(at(g, x, y) || C('ink', 0)) !== 'stone') dim(g, x, y, 1);
  }
  stones(g, ccx, cTop + 2, cw, cBot - cTop - 2, u * 0.7, k + 90);
  for (let j = 0; j < Math.max(2, Math.round(0.14 * u)); j++)
    for (let i = -1; i <= cw; i++)
      put(g, ccx + i, cTop + j, C('stone', j === 0 ? 1 : i === cw ? 5 : 3));
  for (let i = 1; i < cw - 1; i++) put(g, ccx + i, cTop - 1, C('shade', 1));
  for (let i = -1; i <= cw; i++) put(g, ccx + i, cBot, C('iron', i === -1 ? 1 : 2));

  // Sign on a bracket at the right end of the upper floor.
  if (cfg.sign) {
    const sx0 = ux0 + uw;
    const sy = upTop + Math.round(0.55 * u);
    const bt = Math.max(2, Math.round(0.1 * u));
    for (let i = 0; i < signOut; i++)
      for (let j = 0; j < bt; j++) put(g, sx0 + i, sy + j, C('iron', j === 0 ? 1 : 3));
    for (let i = 0; i < Math.round(signOut * 0.6); i++)
      put(g, sx0 + i, sy + bt + Math.round(signOut * 0.6) - i, C('iron', 3));
    const bw = Math.round(1.15 * u);
    const bh = Math.round(0.95 * u);
    const bx = sx0 + signOut - bw - Math.round(0.08 * u);
    const by = sy + bt + Math.round(0.22 * u);
    for (const cxh of [bx + Math.round(bw * 0.15), bx + Math.round(bw * 0.85)])
      for (let y = sy + bt; y < by; y++) put(g, cxh, y, C('iron', (y & 1) === 0 ? 2 : 4));
    for (let j = 0; j < bh; j++)
      for (let i = 0; i < bw; i++) {
        const fr = Math.max(1, Math.round(u * 0.07));
        const edge = i < fr || j < fr || i >= bw - fr || j >= bh - fr;
        let t = edge ? 4 : 2;
        if (edge && (i === 0 || j === 0)) t = 2;
        if (i === bw - 1 || j === bh - 1) t = 5;
        if (!edge && hash(bx + i, Math.floor((by + j) / 3), 5) < 0.2) t = 3;
        put(g, bx + i, by + j, C('wood', t));
      }
    // The tankard, painted.
    const tw = Math.round(bw * 0.38);
    const tH = Math.round(bh * 0.55);
    const tx = bx + Math.round(bw * 0.24);
    const ty = by + Math.round(bh * 0.28);
    for (let j = 0; j < tH; j++)
      for (let i = 0; i < tw; i++) {
        let t = i < tw * 0.3 ? 1 : i > tw * 0.7 ? 3 : 2;
        if (j > 0 && j % Math.max(3, Math.round(tH / 3)) === 0) t = 4;
        put(g, tx + i, ty + j, C('gold', t));
      }
    for (let j = 0; j < Math.max(2, Math.round(tH * 0.22)); j++)
      for (let i = -1; i <= tw; i++)
        put(g, tx + i, ty - Math.round(tH * 0.15) + j, C('plaster', j === 0 ? 0 : 1));
    const hr = Math.max(2, Math.round(tH * 0.3));
    for (let a = -8; a <= 8; a++) {
      const th = (a / 8) * (Math.PI / 2);
      put(g, tx + tw + Math.cos(th) * hr - 1, ty + tH / 2 + Math.sin(th) * hr, C('gold', 3));
    }
  }

  // A lantern beside the door, and a window box of flowers.
  if (doorRect) {
    const lx = doorRect.x + doorRect.w + Math.round(0.42 * u);
    const ly = doorRect.y + Math.round(0.15 * u);
    const lw = Math.max(3, Math.round(0.3 * u));
    const lh = Math.max(4, Math.round(0.42 * u));
    for (let i = 0; i < Math.round(0.2 * u); i++)
      put(g, lx + Math.round(lw / 2), ly - 1 - i, C('iron', 3));
    for (let j = 0; j < lh; j++)
      for (let i = 0; i < lw; i++) {
        const frame = i === 0 || i === lw - 1 || j === 0 || j === lh - 1;
        put(
          g,
          lx + i,
          ly + j,
          frame
            ? C('iron', i === 0 ? 2 : 4)
            : C('lamp', i === 1 && j < lh / 2 ? 0 : j > lh * 0.6 ? 3 : 1),
        );
      }
    for (let i = -1; i <= lw; i++) put(g, lx + i, ly - 1, C('iron', 2));
    for (let j = 0; j < lh; j++) dim(g, lx + lw, ly + j + 1, 2);
  }
  if (cfg.windowBox >= 0) {
    const i = cfg.windowBox;
    const p0 = upPost(i) + tb;
    const p1 = upPost(i + 1);
    const bw = Math.round(1.35 * u);
    const bx = Math.round((p0 + p1 - bw) / 2);
    const by =
      upRail -
      Math.round(0.28 * u) +
      Math.max(2, Math.round(0.1 * u)) +
      Math.max(1, Math.round(0.08 * u));
    const bh = Math.max(3, Math.round(0.26 * u));
    // Flowers first, the box over their stems.
    const fr = Math.max(1, Math.round(0.07 * u));
    for (let n = 0; n < Math.round(bw / (fr * 2.2)); n++) {
      const fx = bx + Math.floor(hash(n, 1, k) * bw);
      const fy = by - Math.floor(hash(n, 2, k) * u * 0.28) - 1;
      for (let j = -fr; j <= fr + 1; j++)
        for (let ii = -fr; ii <= fr; ii++)
          if (ii * ii + j * j <= fr * fr + 1)
            put(g, fx + ii, fy + j + 2, C('pine', ii < 0 ? 1 : 3));
      const hue = hash(n, 3, k) < 0.5;
      put(g, fx, fy, C('flower', hue ? 3 : 1));
      if (fr > 1) {
        put(g, fx + 1, fy, C('flower', hue ? 4 : 2));
        put(g, fx, fy - 1, C('flower', hue ? 2 : 0));
      }
    }
    for (let j = 0; j < bh; j++)
      for (let ii = 0; ii < bw; ii++) {
        let t = j === 0 ? 1 : j === bh - 1 ? 5 : 3;
        if (ii === 0 && j > 0) t = 2;
        if (ii === bw - 1) t = 5;
        put(g, bx + ii, by + j, C('wood', t));
      }
    for (let ii = 1; ii <= bw; ii++) dim(g, bx + ii, by + bh, 2);
  }

  const out = selOut(g);
  return {
    grid: out,
    base: base + 1,
    door: doorRect ? { ...doorRect, x: doorRect.x + 1, y: doorRect.y + 1 } : null,
    wallX0: left + 1,
    wallX1: left + wallW + 1,
  };
}

export const TAVERN: BuildingCfg = {
  bays: 5,
  doorBay: 2,
  roof: 'tile',
  seed: 3,
  sign: true,
  chimney: 0.7,
  windowBox: 1,
  shutters: [0, 3],
};

/** For the smaller option D: the same tavern, three bays across. */
export const TAVERN_SMALL: BuildingCfg = {
  ...TAVERN,
  bays: 3,
  doorBay: 1,
  windowBox: 0,
  shutters: [2],
};

export const NEIGHBOUR: BuildingCfg = {
  bays: 2,
  doorBay: -1,
  roof: 'slate',
  seed: 17,
  sign: false,
  chimney: 0.3,
  windowBox: -1,
  shutters: [0, 1],
};

/** For the record of what a step is, used by scenes when they shade. */
export const stepIs = (c: Cell, m: Mat): boolean => c !== 0 && matOf(c) === m && stepOf(c) < 6;

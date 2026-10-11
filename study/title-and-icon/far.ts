/**
 * The town seen from afar, for the titles that look at it across the water or
 * down from the headland: the tavern, the smithy and your house drawn again at
 * a fifth of their size (a storey about 24 pixels), in the same materials (red
 * tile and timber and plaster, slate and rubble, thatch and limewash and blue
 * paint), lit from the upper left, each outlined in its own darkest step. The
 * real pieces (src/art/town2/) are drawn at full size for the walkable town and
 * would not fit; these are new drawings of the same buildings.
 *
 * Also the cutter at anchor, a third of its size, and small pines as tiered
 * silhouettes for a far forest.
 */
import { at, cell, hash, outlined, put, stamp, tgrid, type TGrid } from '../../src/art/town2/cells';
import type { Mat } from '../../src/art/town2/ramps';
import { X, type BandGlow, type XMat } from './pal';

const C = cell;

export interface FarSpec {
  /** Left of the wall and the ground row it stands on. */
  x: number;
  base: number;
  w: number;
  wallH: number;
  roofH: number;
  roof: 'tile' | 'slate' | 'thatch';
  wall: 'timber' | 'rubble' | 'limewash';
  /** Window boxes: x, y from the wall's top-left, lit or not. */
  windows: { x: number; y: number; w?: number; h?: number; lit: boolean; shutters?: boolean }[];
  door?: { x: number; w: number; h: number; mat?: Mat };
  chimney?: { x: number; w: number; h: number };
  /** An open forge (the smithy): x, w, h from the wall's bottom-left. */
  forge?: { x: number; w: number; h: number };
  sign?: { x: number; y: number };
  k?: number;
}

/** Draws one far building into a picture; returns the glows its lit windows cast. */
export function farBuilding(g: TGrid, s: FarSpec, lightsOn = true): BandGlow[] {
  const k = s.k ?? 1;
  const W = s.w + 12;
  const H = s.wallH + s.roofH + (s.chimney?.h ?? 0) + 4;
  const b = tgrid(W, H);
  const wx = 6;
  const wallTop = H - s.wallH;
  const eave = wallTop;
  const glows: BandGlow[] = [];
  // Walls.
  for (let y = wallTop; y < H; y++)
    for (let x = wx; x < wx + s.w; x++) {
      const fx = (x - wx) / s.w;
      let c: number;
      if (s.wall === 'rubble') {
        // Rubble in irregular courses, the stones lit top-left.
        const row = Math.floor((y - wallTop) / 3);
        const off = (row * 5 + Math.floor(hash(row, 0, k) * 4)) % 6;
        const sx = (x - wx + off) % 6;
        const sy = (y - wallTop) % 3;
        let t = 2 + Math.round(hash(Math.floor((x - wx + off) / 6), row, k) * 1.4);
        if (sx === 0 || sy === 2) t = 5;
        else if (sy === 0 || sx === 1) t -= 1;
        c = C('stone', t);
      } else if (s.wall === 'limewash') {
        c = C('limewash', 2 + (hash(Math.floor(x / 4), Math.floor(y / 3), k) < 0.18 ? 1 : 0));
      } else c = C('plaster', 2 + (hash(Math.floor(x / 5), Math.floor(y / 4), k) < 0.15 ? 1 : 0));
      if (fx > 0.94) c = (c & ~7) | Math.min(5, (c & 7) + 1);
      put(b, x, y, c);
    }
  // A stone plinth along the foot.
  for (let y = H - 3; y < H; y++)
    for (let x = wx; x < wx + s.w; x++) put(b, x, y, C('stone', y === H - 3 ? 2 : 3 + ((x >> 2) & 1)));
  // Timber framing: posts each bay, a rail at the floor, braces.
  if (s.wall === 'timber') {
    const floor = wallTop + Math.round(s.wallH * 0.48);
    const bays = Math.max(2, Math.round(s.w / 20));
    for (let i = 0; i <= bays; i++) {
      const px = wx + Math.round((i * (s.w - 2)) / bays);
      for (let y = wallTop; y < H - 3; y++) {
        put(b, px, y, C('wood', 3));
        put(b, px + 1, y, C('wood', 4));
      }
      if (i < bays) {
        const nx = wx + Math.round(((i + 1) * (s.w - 2)) / bays);
        // Braces in the upper storey, alternating.
        const h = floor - wallTop - 2;
        for (let j = 0; j < h; j++) {
          const bx = i % 2 ? px + 2 + Math.round((j / h) * 6) : nx - 1 - Math.round((j / h) * 6);
          put(b, bx, floor - 1 - j, C('wood', 4));
        }
      }
    }
    for (const ry of [wallTop, floor, floor + 1])
      for (let x = wx; x < wx + s.w; x++) put(b, x, ry, C('wood', ry === floor ? 2 : 3));
    // The jetty: the upper storey's shadow on the lower.
    for (let x = wx; x < wx + s.w; x++) {
      const c = at(b, x, floor + 2);
      if (c) put(b, x, floor + 2, (c & ~7) | Math.min(5, (c & 7) + 1));
    }
  }
  // Windows.
  for (const w of s.windows) {
    const ww = w.w ?? 6;
    const wh = w.h ?? 7;
    const x0 = wx + w.x;
    const y0 = wallTop + w.y;
    for (let j = -1; j <= wh; j++)
      for (let i = -1; i <= ww; i++) {
        const edge = i < 0 || j < 0 || i === ww || j === wh;
        if (edge) put(b, x0 + i, y0 + j, C('wood', j === wh ? 1 : 4));
        else {
          const mullion = i === Math.floor(ww / 2) || j === Math.floor(wh / 2);
          if (mullion) put(b, x0 + i, y0 + j, C('wood', 4));
          else if (w.lit && lightsOn) put(b, x0 + i, y0 + j, C('glass', j < wh / 2 ? (i < ww / 2 ? 0 : 1) : 2));
          else put(b, x0 + i, y0 + j, C('pane', j === 0 ? 4 : i < ww / 2 && j < 2 ? 2 : 3));
        }
      }
    if (w.shutters)
      for (let j = 0; j < wh; j++) {
        put(b, x0 - 3, y0 + j, C('blue', 2));
        put(b, x0 - 2, y0 + j, C('blue', 3));
        put(b, x0 + ww + 1, y0 + j, C('blue', 2));
        put(b, x0 + ww + 2, y0 + j, C('blue', 3));
      }
    if (w.lit && lightsOn) glows.push({ x: s.x - wx + x0 + ww / 2, y: s.base - H + y0 + wh / 2, r: 8, strength: 0.22, bands: 2 });
  }
  if (s.door) {
    const d = s.door;
    for (let j = 0; j < d.h; j++)
      for (let i = 0; i < d.w; i++) {
        const y = H - 3 - d.h + j;
        const plank = i % 3 === 2;
        put(b, wx + d.x + i, y, C(d.mat ?? 'wood', j === 0 ? 5 : plank ? 4 : i === 0 ? 2 : 3));
      }
  }
  if (s.forge) {
    const f = s.forge;
    for (let j = 0; j < f.h; j++)
      for (let i = 0; i < f.w; i++) {
        const y = H - 3 - f.h + j;
        const fire = j > f.h - 6 && i > 2 && i < f.w - 3;
        put(b, wx + f.x + i, y, fire ? C('fire', j > f.h - 3 ? 2 : 3 + ((i + j) & 1)) : C('shade', 1 + (j < 2 ? 2 : 0)));
      }
    glows.push({ x: s.x - wx + wx + f.x + f.w / 2, y: s.base - 6, r: 22, strength: 0.32, bands: 3, colour: [255, 120, 50] });
  }
  // Roof: the front slope, a trapezoid from the eave up to the ridge.
  const over = 3;
  for (let j = 0; j < s.roofH; j++) {
    const y = eave - 1 - j;
    const f = j / s.roofH;
    const inset = Math.round(f * s.roofH * 0.55);
    const x0 = wx - over + inset;
    const x1 = wx + s.w + over - inset;
    for (let x = x0; x < x1; x++) {
      const fx = (x - x0) / Math.max(1, x1 - x0);
      let c: number;
      if (s.roof === 'tile') {
        const course = j % 3;
        const scal = (x + (Math.floor(j / 3) % 2) * 2) % 4;
        let t = course === 0 ? 4 : course === 1 ? 2 : 1;
        if (course === 1 && scal === 0) t = 3;
        if (hash(x >> 1, j >> 1, k + 4) < 0.08) t += 1;
        c = C('tile', t);
      } else if (s.roof === 'slate') {
        const course = j % 3;
        let t = course === 0 ? 5 : 2 + (hash(x >> 2, j, k) < 0.3 ? 1 : 0);
        if (course === 1) t -= 1;
        c = C('slate', t);
      } else {
        // Thatch: combed, drooping strands, darker at the eave.
        const t = j < 2 ? 4 : 1 + Math.round(hash(x, j >> 1, k + 5) * 1.6) + (j % 4 === 0 ? 1 : 0);
        c = C('thatch', t);
      }
      // The hip ends turn from the light on the right, toward it on the left.
      if (fx > 0.93) c = (c & ~7) | Math.min(5, (c & 7) + 2);
      else if (fx < 0.06) c = (c & ~7) | Math.max(0, (c & 7) - 1);
      put(b, x, y, c);
    }
  }
  // Ridge line.
  {
    const j = s.roofH - 1;
    const inset = Math.round(((j / s.roofH) * s.roofH * 0.55) | 0);
    for (let x = wx - over + inset; x < wx + s.w + over - inset; x++)
      put(b, x, eave - s.roofH, C(s.roof === 'thatch' ? 'thatch' : s.roof === 'slate' ? 'slate' : 'tile', 1));
  }
  // The eave's shadow on the wall.
  for (let x = wx; x < wx + s.w; x++)
    for (let j = 0; j < 2; j++) {
      const c = at(b, x, wallTop + j);
      if (c) put(b, x, wallTop + j, (c & ~7) | Math.min(5, (c & 7) + (2 - j)));
    }
  if (s.chimney) {
    const ch = s.chimney;
    const top = eave - s.roofH - ch.h + Math.round(s.roofH * 0.4);
    for (let y = top; y < eave - Math.round(s.roofH * 0.3); y++)
      for (let i = 0; i < ch.w; i++) {
        const row = (y - top) % 3;
        put(b, wx + ch.x + i, y, C('stone', i === 0 ? 1 : i === ch.w - 1 ? 4 : row === 2 ? 4 : 2));
      }
    for (let i = -1; i <= ch.w; i++) put(b, wx + ch.x + i, top, C('stone', 1));
  }
  if (s.sign) {
    const sx = wx + s.sign.x;
    const sy = wallTop + s.sign.y;
    for (let i = 0; i < 6; i++) put(b, sx + i, sy, C('iron', 3));
    for (let j = 1; j < 7; j++)
      for (let i = 1; i < 7; i++) put(b, sx + i + 1, sy + j, C('wood', i === 1 || j === 1 ? 2 : 4));
    put(b, sx + 4, sy + 3, C('gold', 1));
    put(b, sx + 4, sy + 4, C('gold', 2));
    put(b, sx + 3, sy + 5, C('gold', 2));
    put(b, sx + 5, sy + 5, C('gold', 2));
  }
  const o = outlined(b);
  stamp(g, o, s.x - wx - 1, s.base - H - 1);
  return glows;
}

/** Where a far building's chimney top is, for its smoke. */
export function chimneyTop(s: FarSpec): { x: number; y: number } | null {
  if (!s.chimney) return null;
  const H = s.wallH + s.roofH + s.chimney.h + 4;
  const eave = H - s.wallH;
  const top = eave - s.roofH - s.chimney.h + Math.round(s.roofH * 0.4);
  return { x: s.x + s.chimney.x + s.chimney.w / 2 - 1, y: s.base - H + top - 1 };
}

/**
 * Smoke rising from a chimney: small puffs lit on the left, drifting right
 * as they climb, thinning as they go. `phase` 0..1 moves them up one puff.
 */
export function farSmoke(g: TGrid, x: number, y: number, phase: number, o: { n?: number; dusk?: boolean; size?: number } = {}): void {
  const n = o.n ?? 6;
  const size = o.size ?? 1;
  for (let i = 0; i < n; i++) {
    const f = (i + phase) / n;
    const py = y - f * 34 * size;
    const px = x + Math.pow(f, 1.4) * 16 * size + Math.sin(f * 5) * 1.5;
    const r = (1.2 + f * 3.2) * size;
    for (let yy = Math.floor(py - r); yy <= py + r; yy++)
      for (let xx = Math.floor(px - r); xx <= px + r; xx++) {
        const dx = (xx + 0.5 - px) / r;
        const dy = (yy + 0.5 - py) / r;
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        if (f > 0.55 && hash(xx, yy, i + Math.floor(phase * 7)) < (f - 0.55) * 1.6) continue;
        const lit = -dx * 0.7 - dy * 0.5;
        const t = (o.dusk ? 3 : 1.5) + f * 1.2 - lit * 1.2;
        put(g, xx, yy, C('smoke', Math.max(1, Math.min(5, Math.round(t)))));
      }
  }
}

/** A small pine as a tiered silhouette: `cellAt(depth, lit)` picks the colour. */
export function farPine(
  g: TGrid,
  cx: number,
  base: number,
  h: number,
  cellAt: (lit: boolean, shade: boolean) => number,
  k = 1,
): void {
  const tiers = Math.max(3, Math.round(h / 9));
  const trunkH = Math.max(2, Math.round(h * 0.1));
  for (let y = base - trunkH; y < base; y++) put(g, cx, y, cellAt(false, true));
  const crownTop = base - h;
  const crownH = h - trunkH;
  for (let t = 0; t < tiers; t++) {
    const ty0 = crownTop + Math.round((t / tiers) * crownH * 0.85);
    const ty1 = crownTop + Math.round(((t + 1) / tiers) * crownH) + 1;
    const maxHalf = 1.5 + ((t + 1) / tiers) * h * 0.22 * (0.85 + hash(t, cx, k) * 0.3);
    for (let y = ty0; y < ty1; y++) {
      const f = (y - ty0) / Math.max(1, ty1 - ty0);
      const half = Math.round(maxHalf * (0.25 + 0.75 * f));
      for (let x = cx - half; x <= cx + half; x++) {
        const edgeL = x <= cx - half + 1;
        const under = y >= ty1 - 2;
        put(g, x, y, cellAt(edgeL && !under, under || x > cx + half * 0.5));
      }
    }
  }
}

/**
 * The cutter at anchor, bow to the left, about a third of its size in the
 * town: tarred hull with its gilded wale and red bottom, gun ports, the stern
 * castle with its lit windows and lantern, one mast, the sail furled on its
 * yard, shrouds, and the black flag. Returns its glows.
 */
export function farShip(g: TGrid, x: number, wl: number, s = 1, lightsOn = true, flagPhase = 0): BandGlow[] {
  const L = Math.round(140 * s);
  const hullH = Math.round(24 * s);
  const mastH = Math.round(150 * s);
  const W = L + Math.round(50 * s);
  const H = mastH + hullH + 8;
  const b = tgrid(W, H);
  const x0 = Math.round(30 * s);
  const wly = H - 2;
  const deck = wly - hullH;
  const glows: BandGlow[] = [];
  const sheer = (xx: number) => {
    const f = (xx - x0) / L;
    return Math.round(Math.pow(Math.abs(f - 0.55) / 0.55, 2.2) * 7 * s);
  };
  const deckAt = (xx: number) => deck - sheer(Math.max(x0, Math.min(x0 + L - 1, xx)));
  // Hull.
  for (let y = deckAt(x0) - 2; y < wly; y++) {
    const jy = (y - (deck - 3)) / (wly - (deck - 3));
    const fore = x0 + Math.round(Math.pow(Math.max(0, jy), 2.2) * 14 * s);
    const aft = x0 + L - Math.round(Math.max(0, jy) * 6 * s);
    for (let xx = fore; xx < aft; xx++) {
      const top = deckAt(xx);
      if (y < top) continue;
      const j = y - top;
      const f = (xx - x0) / L;
      let mat: Mat = 'tar';
      let t = 1.6 + (j / hullH) * 1.8;
      if (f < 0.08 || f > 0.94) t += 1;
      if (j % 4 === 0) t += 1;
      if (j >= 4 && j < 6) {
        mat = 'gold';
        t = j === 4 ? 2 : 3;
      }
      if (y >= wly - 4) {
        mat = 'crimson';
        t = 3 + (y >= wly - 2 ? 1 : 0);
      }
      put(b, xx, y, C(mat, Math.max(0, Math.min(5, Math.round(t)))));
    }
  }
  // Gun ports along the strake below the wale.
  for (let i = 0; i < 5; i++) {
    const px = x0 + Math.round(L * (0.22 + i * 0.13));
    const py = deckAt(px) + 8;
    for (let j = 0; j < 3; j++) for (let q = 0; q < 3; q++) put(b, px + q, py + j, C('shade', 1));
    put(b, px, py - 1, C('crimson', 3));
    put(b, px + 1, py - 1, C('crimson', 3));
    put(b, px + 2, py - 1, C('crimson', 3));
  }
  // Rail along the deck.
  for (let xx = x0 + 4; xx < x0 + L - 2; xx++) {
    const top = deckAt(xx);
    put(b, xx, top - 4, C('wood', 2));
    if (xx % 5 === 0) for (let j = -3; j < 0; j++) put(b, xx, top + j, C('wood', 3));
  }
  // Stern castle: a raised cabin aft with gilded windows.
  const sc0 = x0 + Math.round(L * 0.78);
  const sc1 = x0 + L - 2;
  const scTop = deckAt(sc1) - Math.round(14 * s);
  for (let y = scTop; y < deckAt(sc0); y++)
    for (let xx = sc0; xx < sc1; xx++) {
      put(b, xx, y, C('tar', xx === sc0 ? 1 : y === scTop ? 1 : 2 + ((xx - sc0) % 6 === 5 ? 1 : 0)));
    }
  for (let xx = sc0 - 1; xx <= sc1; xx++) put(b, xx, scTop - 1, C('gold', 2));
  for (let i = 0; i < 3; i++) {
    const wx = sc0 + 3 + i * 6;
    for (let j = 0; j < 4; j++)
      for (let q = 0; q < 3; q++)
        put(b, wx + q, scTop + 4 + j, lightsOn ? C('glass', j < 2 ? 0 : 2) : C('pane', 3));
    for (let q = -1; q <= 3; q++) put(b, wx + q, scTop + 3, C('gold', 2));
    if (lightsOn) glows.push({ x: x + wx + 1, y: wl - H + scTop + 6, r: 9, strength: 0.25, bands: 2 });
  }
  // Stern lantern on its post.
  const lx = sc1 - 1;
  for (let j = 1; j < 8; j++) put(b, lx, scTop - j, C('iron', 3));
  for (let j = 0; j < 4; j++) for (let q = -1; q <= 1; q++) put(b, lx + q, scTop - 11 + j, C('lamp', j < 2 ? 0 : 1));
  put(b, lx, scTop - 12, C('iron', 2));
  if (lightsOn) glows.push({ x: x + lx, y: wl - H + scTop - 9, r: 18, strength: 0.4, bands: 3 });
  // Bowsprit.
  const bx = x0 + 6;
  for (let i = 0; i < Math.round(36 * s); i++) put(b, bx - i, deckAt(bx) - 3 - Math.round(i * 0.35), C('wood', 3));
  // Mast, yards, furled sail.
  const mx = x0 + Math.round(L * 0.48);
  const mTop = 6;
  for (let y = mTop; y < deckAt(mx); y++) {
    put(b, mx, y, C('wood', 2));
    put(b, mx + 1, y, C('wood', 4));
  }
  const yard = (yy: number, half: number) => {
    for (let i = -half; i <= half; i++) put(b, mx + i, yy, C('wood', 3));
    // The sail furled along it, in bunches.
    for (let i = -half + 2; i <= half - 2; i++) {
      const bunch = Math.abs(((i + 40) % 7) - 3) < 2;
      put(b, mx + i, yy + 1, C('sail', bunch ? 1 : 2));
      put(b, mx + i, yy + 2, C('sail', bunch ? 3 : 4));
    }
  };
  yard(Math.round(mTop + mastH * 0.28), Math.round(30 * s));
  yard(Math.round(mTop + mastH * 0.58), Math.round(40 * s));
  // Top and its crow's nest.
  for (let i = -4; i <= 4; i++) put(b, mx + i, Math.round(mTop + mastH * 0.2), C('wood', i < 0 ? 2 : 4));
  // Shrouds and stays: lines from the masthead to the rails.
  const line = (ax: number, ay: number, cx2: number, cy2: number) => {
    const n = Math.max(Math.abs(cx2 - ax), Math.abs(cy2 - ay));
    for (let i = 0; i <= n; i++) {
      const px = Math.round(ax + ((cx2 - ax) * i) / n);
      const py = Math.round(ay + ((cy2 - ay) * i) / n);
      if (!at(b, px, py)) put(b, px, py, C('tar', 5));
    }
  };
  line(mx, mTop + 4, bx - Math.round(34 * s), deckAt(bx) - 3 - Math.round(12 * s));
  line(mx, mTop + 4, sc1 - 2, scTop - 2);
  for (const d of [-12, -6, 6, 12]) line(mx, Math.round(mTop + mastH * 0.2), mx + Math.round(d * s), deckAt(mx + d) - 4);
  // The black flag at the masthead, rippling with phase.
  for (let j = 0; j < 9; j++)
    for (let i = 0; i < 14; i++) {
      const wave = Math.round(Math.sin(i * 0.6 + flagPhase * Math.PI * 2) * 1);
      put(b, mx + 2 + i, mTop - 6 + j + wave, C('felt', j === 0 ? 2 : i > 10 ? 4 : 3));
    }
  // The skull, two pixels' worth.
  put(b, mx + 8, mTop - 3, C('sail', 0));
  put(b, mx + 9, mTop - 3, C('sail', 0));
  put(b, mx + 8, mTop - 2, C('sail', 1));
  put(b, mx + 9, mTop - 2, C('sail', 1));
  const o = outlined(b);
  stamp(g, o, x - 1, wl - H - 1);
  return glows;
}

/** A small iron street lamp at far scale; returns its glow. */
export function farLamp(g: TGrid, x: number, base: number, h = 18, on = true): BandGlow {
  for (let y = base - h + 4; y < base; y++) put(g, x, y, C('iron', 4));
  put(g, x - 1, base - 1, C('iron', 4));
  put(g, x + 1, base - 1, C('iron', 4));
  for (let j = 0; j < 4; j++)
    for (let i = -1; i <= 1; i++) put(g, x + i, base - h + j, C(on ? 'lamp' : 'iron', on ? (j < 2 ? 0 : 1) : 3));
  put(g, x, base - h - 1, C('iron', 3));
  return { x: x + 0.5, y: base - h + 2, r: 16, strength: 0.38, bands: 3 };
}

export const xc = (m: XMat, t: number): number => X(m, t);

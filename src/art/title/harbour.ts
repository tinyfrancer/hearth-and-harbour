/**
 * What stands in the harbour and over it: the cutter at anchor, the pier and
 * its lamp, the rowboat tied to it, a quay lamp, the buoy, the gulls and the
 * ship's flag. Drawn small, in metres: the ship is nearer than the quay, at
 * 8.4 art pixels a metre (an 11 m hull, a 10.5 m mast, as in the town).
 */
import { at, hash, outlined, put, type TGrid } from '../town2/cells';
import { tc, type TitleMat } from './ramps';
import type { Halo } from './light';
import type { Flicker } from './buildings';

const C = (m: TitleMat, t: number): number => tc(m, t);
const grid = (w: number, h: number): TGrid => ({ w, h, d: new Int16Array(w * h) });

/** A one-pixel line with no doubled steps, drawn only where nothing is yet. */
function line(g: TGrid, ax: number, ay: number, bx: number, by: number, c: number, over = false) {
  const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) || 1;
  for (let i = 0; i <= n; i++) {
    const x = Math.round(ax + ((bx - ax) * i) / n);
    const y = Math.round(ay + ((by - ay) * i) / n);
    if (over || !at(g, x, y)) put(g, x, y, c);
  }
}

export interface Ship {
  /** The drawing, outlined; its waterline is row `wl` of it. */
  readonly g: TGrid;
  readonly wl: number;
  readonly halos: readonly Halo[];
  readonly flicker: readonly Flicker[];
  /** Where the flag's hoist meets the masthead, in the drawing. */
  readonly flag: { x: number; y: number };
}

/** Pixels a metre on the ship. */
const S = 9.2;
const sm = (metres: number) => Math.round(metres * S);

/**
 * The cutter at anchor, bow to the left: tarred hull with its gilded wale,
 * gun ports and a red boot-top at the waterline; the stern castle with three
 * lit windows and the taffrail lantern; one mast with the courses furled on
 * their yards, the top and its crow's nest, shrouds with ratlines, stays to
 * the bowsprit and the stern, the boom, and the anchor cable running down
 * from the bow.
 */
export function ship(): Ship {
  const L = sm(11);
  const hullH = sm(2.2);
  const mastH = sm(10.5);
  const x0 = sm(3.4);
  const W = x0 + L + 6;
  const top = 10;
  const H = top + mastH + hullH + 2;
  const g = grid(W, H);
  const wl = H - 2;
  const deck = wl - hullH;
  const halos: Halo[] = [];
  const flick: Flicker[] = [];
  const sheer = (x: number) => {
    const f = (x - x0) / L;
    return Math.round(Math.pow(Math.abs(f - 0.52) / 0.52, 2.2) * sm(0.8));
  };
  const deckAt = (x: number) => deck - sheer(Math.max(x0, Math.min(x0 + L - 1, x)));
  // The hull: the bow's curve forward, the stern's rake aft, planks in strakes.
  for (let y = deckAt(x0) - 1; y < wl; y++) {
    const jy = Math.max(0, (y - (deck - 2)) / (wl - (deck - 2)));
    const fore = x0 + Math.round(Math.pow(jy, 2) * sm(1.7));
    const aft = x0 + L - Math.round(jy * sm(0.6));
    for (let x = fore; x < aft; x++) {
      const t0 = deckAt(x);
      if (y < t0) continue;
      const j = y - t0;
      const f = (x - x0) / L;
      let m: TitleMat = 'tar';
      let t = 1.5 + (j / hullH) * 2;
      if (f < 0.06 || f > 0.95) t += 1;
      if (j % 3 === 0 && j > 0) t += 1;
      if (j === 4 || j === 5) {
        m = 'gold';
        t = j === 4 ? 2 : 3;
      }
      if (wl - y <= 2) {
        m = 'crimson';
        t = wl - y === 1 ? 4 : 3;
      }
      put(g, x, y, C(m, Math.max(0, Math.min(5, Math.round(t)))));
    }
  }
  // Gun ports under the wale, their lids open above them.
  for (let i = 0; i < 4; i++) {
    const px = x0 + Math.round(L * (0.24 + i * 0.13));
    const py = deckAt(px) + 7;
    for (let j = 0; j < 3; j++) for (let q = 0; q < 3; q++) put(g, px + q, py + j, C('shade', 1));
    for (let q = 0; q < 3; q++) put(g, px + q, py - 1, C('crimson', 3));
  }
  // The rail and its stanchions.
  for (let x = x0 + 3; x < x0 + L - 2; x++) {
    const t0 = deckAt(x);
    put(g, x, t0 - 3, C('wood', 2));
    if (x % 4 === 0) for (let j = -2; j < 0; j++) put(g, x, t0 + j, C('wood', 4));
  }
  // The stern castle: a raised cabin aft with three gilded, lit windows.
  const sc0 = x0 + Math.round(L * 0.76);
  const sc1 = x0 + L - 1;
  const scTop = deckAt(sc1) - sm(1.5);
  for (let y = scTop; y < deckAt(sc0) + 1; y++)
    for (let x = sc0; x < sc1; x++)
      put(g, x, y, C('tar', x === sc0 || y === scTop ? 1 : 2 + ((x - sc0) % 7 === 6 ? 1 : 0)));
  for (let x = sc0 - 1; x <= sc1; x++) put(g, x, scTop - 1, C('gold', 2));
  for (let i = 0; i < 3; i++) {
    const wx = sc0 + 3 + i * 6;
    for (let j = 0; j < 4; j++)
      for (let q = 0; q < 3; q++) {
        const c = C('glass', j < 2 ? (q === 0 ? 0 : 1) : 2);
        put(g, wx + q, scTop + 3 + j, c);
        flick.push({
          x: wx + q + 1,
          y: scTop + 3 + j + 1,
          a: c,
          b: C('glass', j < 2 ? 2 : 3),
          id: 60 + i,
        });
      }
    for (let q = -1; q <= 3; q++) put(g, wx + q, scTop + 2, C('gold', 2));
    halos.push({ x: wx + 2.5, y: scTop + 6, r: 9, strength: 0.2, bands: 2 });
  }
  // The taffrail lantern on its post.
  const lx = sc1 - 1;
  for (let j = 1; j < 7; j++) put(g, lx, scTop - j, C('iron', 3));
  for (let j = 0; j < 4; j++)
    for (let q = -1; q <= 1; q++) {
      const c = C('lamp', j < 2 ? 0 : 1);
      put(g, lx + q, scTop - 10 + j, c);
      flick.push({ x: lx + q + 1, y: scTop - 10 + j + 1, a: c, b: C('lamp', 2), id: 65 });
    }
  put(g, lx, scTop - 11, C('iron', 2));
  halos.push({ x: lx + 1, y: scTop - 7, r: 16, strength: 0.34, bands: 3 });
  // The bowsprit, rising forward.
  const bx = x0 + 4;
  const bLen = sm(3.2);
  for (let i = 0; i < bLen; i++) {
    put(g, bx - i, deckAt(bx) - 3 - Math.round(i * 0.36), C('wood', 3));
  }
  const tipX = bx - bLen + 1;
  const tipY = deckAt(bx) - 3 - Math.round((bLen - 1) * 0.36);
  // The mast, its top and the crow's nest.
  const mx = x0 + Math.round(L * 0.44);
  const mTop = top;
  for (let y = mTop; y < deckAt(mx); y++) {
    put(g, mx, y, C('wood', 2));
    put(g, mx + 1, y, C('wood', 4));
  }
  const nestY = mTop + Math.round(mastH * 0.2);
  for (let j = 0; j < 3; j++)
    for (let i = -3; i <= 4; i++) put(g, mx + i, nestY + j, C('wood', j === 0 ? 2 : i < 0 ? 3 : 4));
  // The yards with their courses furled in bunches.
  const yard = (yy: number, half: number) => {
    for (let i = -half; i <= half; i++) put(g, mx + i, yy, C('wood', i < 0 ? 3 : 4));
    for (let i = -half + 2; i <= half - 2; i++) {
      const bunch = Math.abs(((i + 40) % 6) - 3) < 2;
      put(g, mx + i, yy + 1, C('sail', bunch ? 1 : 2));
      put(g, mx + i, yy + 2, C('sail', bunch ? 3 : 4));
    }
  };
  yard(mTop + Math.round(mastH * 0.33), sm(1.9));
  yard(mTop + Math.round(mastH * 0.58), sm(2.5));
  // The boom, low over the after deck.
  const boomY = deckAt(mx) - sm(1.5);
  for (let i = 0; i < Math.round(L * 0.55); i++)
    put(g, mx + 2 + i, boomY + Math.round(i * 0.08), C('wood', 3));
  // Standing rigging: the forestay to the bowsprit, the backstay aft, shrouds fanned either side of the mast.
  const rope = C('tar', 5);
  line(g, mx, mTop + 3, tipX, tipY, rope);
  line(g, mx + 1, mTop + 3, sc1 - 3, scTop - 2, rope);
  const shroudFoot = (d: number) => [mx + d, deckAt(mx + d) - 3] as const;
  const feet = [-11, -6, 7, 12].map(shroudFoot);
  for (const [fx, fy] of feet) line(g, mx + (fx < mx ? 0 : 1), nestY + 3, fx, fy, rope);
  // Ratlines: rungs across each pair of shrouds every few rows.
  for (let y = nestY + 8; y < deckAt(mx) - 6; y += 5)
    for (const [a, b] of [
      [feet[0]!, feet[1]!],
      [feet[2]!, feet[3]!],
    ] as const) {
      const f = (y - nestY - 3) / (a[1] - nestY - 3);
      const xa = Math.round(mx + (a[0] - mx) * f);
      const xb = Math.round(mx + (b[0] - mx) * f);
      for (let x = Math.min(xa, xb) + 1; x < Math.max(xa, xb); x++)
        if (!at(g, x, y)) put(g, x, y, C('tar', 4));
    }
  // The anchor cable, down from the hawse into the water ahead of the bow.
  const hx = x0 + 3;
  line(g, hx, deckAt(hx) + 3, hx - sm(2.2), wl, C('tar', 4));
  const o = outlined(g);
  return {
    g: o,
    wl: wl + 1,
    halos: halos.map((h) => ({ ...h, x: h.x + 1, y: h.y + 1 })),
    flicker: flick,
    flag: { x: mx + 2 + 1, y: mTop + 1 },
  };
}

/** The ship's black flag at frame `f` (0..3), streaming to the right: cells and where to put them. */
export function flagCells(f: number): readonly (readonly [number, number, number])[] {
  const out: [number, number, number][] = [];
  const w = 11;
  const h = 7;
  for (let i = 0; i < w; i++) {
    // The wave runs out along the fly; the free end lifts and drops most.
    const wave = Math.round(Math.sin(i * 0.75 - f * (Math.PI / 2)) * Math.min(1.4, i / 4));
    for (let j = 0; j < h; j++) {
      const shade = j === 0 ? 2 : i > 7 || ((i + f) % 4 === 3 && j > 1) ? 4 : 3;
      out.push([i, j + wave, C('felt', shade)]);
    }
    out.push([i, -1 + wave, C('felt', 6)]);
    out.push([i, h + wave, C('felt', 6)]);
  }
  // The skull, a pixel or two of bone.
  const sk = Math.round(Math.sin(4 * 0.75 - f * (Math.PI / 2)) * 1);
  out.push(
    [4, 2 + sk, C('sail', 0)],
    [5, 2 + sk, C('sail', 0)],
    [4, 3 + sk, C('sail', 1)],
    [5, 3 + sk, C('sail', 2)],
  );
  return out;
}

export interface Pier {
  readonly g: TGrid;
  /** Where the drawing's top-left goes relative to (pier centre, the quay's top front row). */
  readonly dx: number;
  readonly dy: number;
  /** The row of the drawing at the water, under the near end. */
  readonly wl: number;
  readonly halos: readonly Halo[];
  readonly flicker: readonly Flicker[];
}

/**
 * The pier from the quay out toward the viewer: planks across, widening as it
 * comes nearer, posts under its sides and its near end, a lamp at the end,
 * the rowboat tied alongside.
 */
export function pier(length: number): Pier {
  const farHalf = 8;
  const nearHalf = 13;
  const cx = nearHalf + 24;
  const W = cx + nearHalf + 8;
  const top = 22;
  const H = top + length + 12;
  const g = grid(W, H);
  const halos: Halo[] = [];
  const flick: Flicker[] = [];
  const halfAt = (j: number) => Math.round(farHalf + ((nearHalf - farHalf) * j) / length);
  for (let j = 0; j < length; j++) {
    const y = top + j;
    const half = halfAt(j);
    const f = j / length;
    const plankH = 2 + Math.round(f * 1.5);
    const row = j % plankH;
    for (let x = cx - half; x <= cx + half; x++) {
      let t = row === 0 ? 4 : 2 + (hash(Math.floor(j / plankH), x >> 2, 9) < 0.25 ? 1 : 0);
      if (x === cx - half) t = Math.max(1, t - 1);
      put(g, x, y, C('wood', t));
    }
    // Posts show under both edges at intervals.
    if (j % 9 === 4)
      for (let k = 1; k <= 2; k++) {
        put(g, cx - half - 1, y + k, C('wood', 4));
        put(g, cx + half + 1, y + k, C('wood', 5));
      }
  }
  // The near end's face and its posts down into the water.
  const ey = top + length;
  for (let x = cx - nearHalf; x <= cx + nearHalf; x++) {
    put(g, x, ey, C('wood', 1));
    put(g, x, ey + 1, C('wood', 3));
    put(g, x, ey + 2, C('wood', 4));
  }
  for (const px of [cx - nearHalf, cx - 1, cx + nearHalf - 2])
    for (let y = ey + 3; y < ey + 9; y++) {
      put(g, px, y, C('wood', 3));
      put(g, px + 1, y, C('wood', 4));
      put(g, px + 2, y, C('wood', 5));
    }
  // The lamp at the end, on the right-hand corner.
  const lx = cx + nearHalf - 1;
  for (let y = ey - 17; y < ey; y++) put(g, lx, y, C('iron', 4));
  for (let j = 0; j < 4; j++)
    for (let i = -1; i <= 1; i++) {
      put(g, lx + i, ey - 21 + j, C('lamp', j < 2 ? 0 : 1));
      flick.push({
        x: lx + i + 1,
        y: ey - 21 + j + 1,
        a: C('lamp', j < 2 ? 0 : 1),
        b: C('lamp', 2),
        id: 70,
      });
    }
  put(g, lx, ey - 22, C('iron', 3));
  put(g, lx - 1, ey - 17, C('iron', 3));
  put(g, lx + 1, ey - 17, C('iron', 3));
  halos.push({ x: lx + 1.5, y: ey - 18, r: 18, strength: 0.36, bands: 3 });
  // A bollard and a coil of rope by the near end.
  put(g, cx - nearHalf + 3, ey - 3, C('iron', 2));
  put(g, cx - nearHalf + 3, ey - 2, C('iron', 4));
  // The rowboat, tied alongside on the left, its painter to the bollard.
  {
    const bx = cx - nearHalf - 24;
    const by = ey - 4;
    const len = 20;
    for (let i = 0; i < len; i++) {
      const f = i / (len - 1);
      const depth = Math.round(4 - Math.pow(Math.abs(f - 0.5) * 2, 2) * 2);
      put(g, bx + i, by, C('wood', i < 3 || i > len - 3 ? 1 : 2));
      put(g, bx + i, by + 1, C('wood', 5));
      for (let j = 2; j < 2 + depth; j++) put(g, bx + i, by + j, C('wood', j === 2 ? 3 : 4));
    }
    for (let i = 4; i < len - 4; i += 5) put(g, bx + i, by + 1, C('wood', 3));
    line(g, bx + len - 1, by, cx - nearHalf + 3, ey - 3, C('linen', 4), true);
  }
  const o = outlined(g);
  return {
    g: o,
    dx: -cx - 1,
    dy: -top - 1,
    wl: ey + 4 + 1,
    halos: halos.map((h) => ({ ...h, x: h.x + 1, y: h.y + 1 })),
    flicker: flick,
  };
}

/** A street lamp on the quay, standing at (x, base); returns its halo and its flicker. */
export function quayLamp(
  g: TGrid,
  x: number,
  base: number,
  id: number,
): { halo: Halo; flick: Flicker[] } {
  const h = 19;
  for (let y = base - h + 4; y < base; y++) put(g, x, y, C('iron', 4));
  put(g, x - 1, base - 1, C('iron', 4));
  put(g, x + 1, base - 1, C('iron', 4));
  put(g, x - 1, base - h + 4, C('iron', 3));
  put(g, x + 1, base - h + 4, C('iron', 3));
  const flick: Flicker[] = [];
  for (let j = 0; j < 4; j++)
    for (let i = -1; i <= 1; i++) {
      const c = C('lamp', j < 2 ? 0 : 1);
      put(g, x + i, base - h + j, c);
      flick.push({ x: x + i, y: base - h + j, a: c, b: C('lamp', 2), id });
    }
  put(g, x, base - h - 1, C('iron', 3));
  put(g, x - 1, base - h, C('iron', 3));
  put(g, x + 1, base - h, C('iron', 3));
  return { halo: { x: x + 0.5, y: base - h + 2, r: 12, strength: 0.3, bands: 3 }, flick };
}

/** A barrel (4 by 6, hooped) or a crate (6 by 5, boarded) standing on the quay at (x, base). */
export function cargo(g: TGrid, x: number, base: number, kind: 'barrel' | 'crate'): void {
  if (kind === 'barrel') {
    for (let j = 0; j < 6; j++)
      for (let i = 0; i < 4; i++) {
        const hoop = j === 1 || j === 4;
        put(
          g,
          x + i,
          base - 6 + j,
          hoop ? C('iron', i === 0 ? 2 : 4) : C('wood', i === 0 ? 1 : i === 3 ? 4 : 2),
        );
      }
    for (let i = 0; i < 4; i++) put(g, x + i, base - 7, C('wood', 6));
    for (let j = 0; j < 6; j++) {
      put(g, x - 1, base - 6 + j, C('wood', 6));
      put(g, x + 4, base - 6 + j, C('wood', 6));
    }
    return;
  }
  for (let j = 0; j < 5; j++)
    for (let i = 0; i < 6; i++) {
      const edge = i === 0 || j === 0 || i === 5 || j === 4;
      put(
        g,
        x + i,
        base - 5 + j,
        C('wood', edge ? (i === 0 || j === 0 ? 2 : 4) : (i + j) % 4 === 0 ? 4 : 3),
      );
    }
  for (let i = -1; i <= 6; i++) put(g, x + i, base - 6, C('wood', 6));
  for (let j = 0; j < 5; j++) {
    put(g, x - 1, base - 5 + j, C('wood', 6));
    put(g, x + 6, base - 5 + j, C('wood', 6));
  }
}

/** The buoy: a red and white can with a cage and a lamp on top, 7 by 12. */
export function buoy(): TGrid {
  const g = grid(7, 12);
  for (let y = 4; y < 12; y++)
    for (let x = 0; x < 7; x++) {
      const band = Math.floor((y - 4) / 3) % 2 === 0;
      const t = x === 0 ? 1 : x >= 5 ? 4 : x >= 3 ? 3 : 2;
      put(g, x, y, band ? C('crimson', t) : C('linen', t));
    }
  for (const x of [1, 5]) for (let y = 1; y < 4; y++) put(g, x, y, C('iron', 3));
  put(g, 2, 1, C('iron', 3));
  put(g, 4, 1, C('iron', 3));
  put(g, 3, 0, C('lamp', 1));
  put(g, 3, 1, C('lamp', 0));
  return outlined(g);
}

/**
 * A gull at frame 0 (wings up) or 1 (wings level) or 2 (wings down), as [dx, dy, cell]. B17: half
 * as big again, with a body, a beak and dark wingtips (it was a tick of three pixels a wing).
 */
export function gullCells(f: number): readonly (readonly [number, number, number])[] {
  const rows =
    f === 0
      ? ['kw.........wk', '.ww.......ww.', '..www...www..', '....wbbbwo...', '.....bbb.....']
      : f === 1
        ? ['.............', 'kwwww...wwwwk', '....wbbbwo...', '.....bbb.....']
        : ['.............', '.....bbb.o...', '...wwbbbww...', '.ww.......ww.', 'kw.........wk'];
  const out: [number, number, number][] = [];
  rows.forEach((r, j) =>
    [...r].forEach((ch, i) => {
      const c =
        ch === 'w'
          ? C('sail', 1)
          : ch === 'b'
            ? C('sail', 0)
            : ch === 'k'
              ? C('tar', 4)
              : ch === 'o'
                ? C('gold', 2)
                : 0;
      if (c) out.push([i - 6, j - 2, c]);
    }),
  );
  return out;
}

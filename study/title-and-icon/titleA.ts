/**
 * Title A, the harbour at dusk: the town seen from the water as the lamps come
 * on. Sky in flat dusk bands with the first stars and a young moon, the hills
 * and the forest behind in haze, the tavern, the smithy with its forge and your
 * thatched house up the slope with their windows lit, lamps along the quay,
 * the cutter at anchor with its stern lantern, and the whole lot mirrored in
 * the water, broken by ripples. Reuses the town's real buoy and gull (props.ts)
 * and every material from its ramps; the buildings and ship are redrawn small.
 *
 * What moves: the ripples (and so the reflections and the lamps' streaks),
 * the stars twinkling, chimney smoke rising, the flag, the buoy bobbing, two
 * gulls gliding across, the lamps' light breathing a band in and out.
 */
import { at, outlined, put, stamp, tgrid, type TGrid } from '../../src/art/town2/cells';
import { buoy, gull } from '../../src/art/town2/props';
import { hash } from '../../src/art/town2/cells';
import { clumps, noise } from '../../src/art/town2/texture';
import { X, isX, xpal, type BandGlow } from './pal';
import { bands, run, stars, type Stop } from './paint';
import { chimneyTop, farBuilding, farLamp, farPine, farShip, farSmoke, type FarSpec } from './far';
import { lockupCaps, stampCentred } from './lockups';
import { SCREEN_H, SCREEN_W, type Frame, type Title } from './screen';

const WL = 548; // the quay's foot: where the water meets the town
const LOOP = 4000;
const SHIP_X = 246;
const SHIP_WL = 650;
const SHIP_S = 0.84;

const SKY: Stop[] = [...run('skyHi', 7, 0), ...run('skyLo', 7, 0)];

const TAVERN: FarSpec = {
  x: 18,
  base: WL - 10,
  w: 120,
  wallH: 50,
  roofH: 30,
  roof: 'tile',
  wall: 'timber',
  windows: [
    { x: 8, y: 8, lit: false },
    { x: 32, y: 8, lit: true },
    { x: 56, y: 8, lit: true },
    { x: 84, y: 8, lit: false },
    { x: 104, y: 8, lit: true },
    { x: 8, y: 30, lit: true },
    { x: 30, y: 30, lit: true },
    { x: 78, y: 30, lit: true },
    { x: 100, y: 30, lit: true },
  ],
  door: { x: 56, w: 9, h: 16 },
  chimney: { x: 84, w: 7, h: 14 },
  sign: { x: 120, y: 18 },
  k: 3,
};
const SMITHY: FarSpec = {
  x: 222,
  base: WL - 10,
  w: 96,
  wallH: 36,
  roofH: 24,
  roof: 'slate',
  wall: 'rubble',
  windows: [{ x: 80, y: 12, lit: true }],
  door: { x: 64, w: 8, h: 15 },
  forge: { x: 14, w: 34, h: 24 },
  chimney: { x: 26, w: 8, h: 16 },
  k: 11,
};
const HOUSE: FarSpec = {
  x: 146,
  base: 470,
  w: 72,
  wallH: 30,
  roofH: 26,
  roof: 'thatch',
  wall: 'limewash',
  windows: [
    { x: 10, y: 10, lit: true, shutters: true },
    { x: 54, y: 10, lit: true, shutters: true },
  ],
  door: { x: 33, w: 7, h: 14, mat: 'blue' },
  chimney: { x: 58, w: 6, h: 12 },
  k: 23,
};

/** The sky and land above the water: drawn once, it never changes. */
function backdrop(): { g: TGrid; glows: BandGlow[] } {
  const g = tgrid(SCREEN_W, SCREEN_H);
  bands(g, 0, 470, SKY, { k: 2, stretch: 6, curve: (f) => Math.pow(f, 1.25) });
  // The young moon, lit from the sunken sun's side.
  for (let y = 96; y <= 122; y++)
    for (let x = 306; x <= 332; x++) {
      const a = Math.hypot(x + 0.5 - 319, y + 0.5 - 109);
      const b = Math.hypot(x + 0.5 - 324, y + 0.5 - 106);
      if (a <= 12 && b > 10.5) put(g, x, y, X('star', a > 10.5 ? 2 : b < 12 ? 1 : 0));
    }
  // Long low clouds lit from beneath by the sun that has gone down.
  const clouds = [
    [70, 352, 90, 5],
    [250, 330, 110, 6],
    [330, 388, 70, 4],
    [40, 408, 60, 3],
    [190, 420, 80, 3],
  ] as const;
  clouds.forEach(([cx, cy, rx, ry], i) => {
    for (let y = cy - ry - 2; y <= cy + ry + 2; y++)
      for (let x = cx - rx - 8; x <= cx + rx + 8; x++) {
        const lump = noise(x / 9, y / 3, 1, i + 30) * 0.5;
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / (ry + lump * 3)) ** 2;
        if (d > 1 - lump * 0.4) continue;
        const under = (y - (cy - ry)) / (2 * ry);
        const t = 4.6 - under * 3.6 + (clumps(x / 2, y, i) - 0.5);
        put(g, x, y, X('cloudDusk', Math.max(0, Math.min(6, Math.round(t)))));
      }
  });
  // Far hills in haze, the left higher.
  for (let x = 0; x < SCREEN_W; x++) {
    const top = 412 + Math.sin(x / 70) * 10 + (x / SCREEN_W) * 30 + noise(x / 18, 0, 1, 4) * 10;
    for (let y = Math.round(top); y < WL; y++) put(g, x, y, X('hazeDusk', 1 + (y - top < 2 ? 0 : 1)));
  }
  // The forest on the hill behind the town: two rows of pines in deeper haze.
  for (let i = 0; i < 40; i++) {
    const cx = Math.round(i * 10 + hash(i, 1, 5) * 8 - 4);
    const base = 470 + Math.round(hash(i, 2, 5) * 10);
    farPine(g, cx, base, 22 + Math.round(hash(i, 3, 5) * 14), (lit, sh) => X('hazeDusk', lit ? 2 : sh ? 4 : 3), i);
  }
  for (let x = 0; x < SCREEN_W; x++) for (let y = 470; y < WL; y++) if (!at(g, x, y) || y > 478) put(g, x, y, X('hazeDusk', 4));
  for (let i = 0; i < 26; i++) {
    const cx = Math.round(i * 15 + hash(i, 4, 6) * 10);
    const base = 490 + Math.round(hash(i, 5, 6) * 14);
    farPine(g, cx, base, 26 + Math.round(hash(i, 6, 6) * 16), (lit, sh) => X('hazeDusk', lit ? 3 : sh ? 6 : 5), i + 50);
  }
  // The slope the town stands on: dark dusk grass, and the road up to your house.
  for (let x = 0; x < SCREEN_W; x++) {
    const hump = Math.max(0, 1 - Math.abs(x - 182) / 70);
    const top = 486 + Math.round(Math.sin(x / 40) * 3 - hump * hump * 20);
    for (let y = top; y < WL; y++)
      put(g, x, y, X('grass', 4 + (y - top < 2 ? -1 : 0) + (clumps(x / 2, y, 3) > 0.62 ? 1 : 0)));
  }
  const glows: BandGlow[] = [];
  // Nearer pines between the buildings, in the town's own green.
  glows.push(...farBuilding(g, HOUSE));
  for (const [cx, base, h] of [
    [146, 528, 44],
    [210, 524, 40],
    [336, 500, 54],
    [366, 508, 46],
    [124, 476, 30],
  ] as const)
    farPine(g, cx, base, h, (lit, sh) => X('pine', lit ? 3 : sh ? 5 : 4), cx);
  glows.push(...farBuilding(g, TAVERN));
  glows.push(...farBuilding(g, SMITHY));
  // The quay: its cobbled top, then the wall in courses, dark and weeded at the tide line.
  for (let y = WL - 10; y < WL - 6; y++)
    for (let x = 0; x < SCREEN_W; x++) put(g, x, y, X('cobble', 3 + ((x + (y & 1) * 2) % 4 === 0 ? 1 : 0)));
  for (let y = WL - 6; y < WL; y++)
    for (let x = 0; x < SCREEN_W; x++) {
      const row = y - (WL - 6);
      const joint = row === 2 || (x + (row > 2 ? 7 : 0)) % 14 === 0;
      put(g, x, y, X(row >= 4 ? 'moss' : 'stone', row >= 4 ? 5 : joint ? 5 : row === 0 ? 2 : 3));
    }
  // Lamps along the quay.
  for (const lx of [10, 150, 206, 340]) glows.push(farLamp(g, lx, WL - 8));
  return { g, glows };
}

let cache: { g: TGrid; glows: BandGlow[] } | null = null;

/** The pier, from the quay out toward the viewer, its lamp at the end. */
function pier(g: TGrid, glows: BandGlow[]): void {
  const y0 = WL - 6;
  const y1 = 612;
  for (let y = y0; y < y1; y++) {
    const f = (y - y0) / (y1 - y0);
    const half = Math.round(9 + f * 13);
    const cx = 178;
    // Deck planks across, each lit on its near edge.
    for (let x = cx - half; x <= cx + half; x++) {
      const plank = Math.floor((y - y0) / (2 + f * 2));
      const row = (y - y0) % Math.round(2 + f * 2);
      put(g, x, y, X('wood', row === 0 ? 2 : 3 + (hash(plank, x >> 3, 3) < 0.3 ? 1 : 0)));
    }
    put(g, cx - half - 1, y, X('wood', 6));
    put(g, cx + half + 1, y, X('wood', 6));
  }
  // The near end's face and the posts down into the water.
  for (let y = y1; y < y1 + 5; y++) for (let x = 178 - 22; x <= 178 + 22; x++) put(g, x, y, X('wood', y === y1 ? 1 : 4));
  for (const px of [157, 176, 197])
    for (let y = y1 + 5; y < y1 + 14; y++) {
      put(g, px, y, X('wood', 3));
      put(g, px + 1, y, X('wood', 4));
      put(g, px + 2, y, X('wood', 5));
    }
  glows.push(farLamp(g, 196, y1, 24));
}

/** The picture at time t. */
export function drawA(t: number): Frame {
  cache ??= backdrop();
  const g = tgrid(SCREEN_W, SCREEN_H);
  g.d.set(cache.g.d);
  const glows: BandGlow[] = [...cache.glows];
  const ph = (t % LOOP) / LOOP;
  stars(g, 0, 0, SCREEN_W, 300, {
    density: 0.0065,
    k: 4,
    phase: ph * 8,
    avoid: (x, y) => {
      const c = at(g, x, y);
      return !(isX(c, 'skyHi') || isX(c, 'skyLo'));
    },
  });
  // Smoke from the chimneys.
  for (const s of [TAVERN, SMITHY, HOUSE]) {
    const c = chimneyTop(s);
    if (c) farSmoke(g, c.x, c.y, ph, { dusk: true });
  }
  // Two gulls gliding left to right across the sky.
  const gp = asPic(gull());
  for (const [y, speed, off] of [
    [262, 1, 0.1],
    [292, 1, 0.55],
  ] as const) {
    const x = Math.round(((ph * speed + off) % 1) * (SCREEN_W + 60)) - 30;
    stamp(g, gp, x, y + Math.round(Math.sin(ph * Math.PI * 2 + off * 6) * 2));
  }
  // Water: dark near the quay where it mirrors the land, the afterglow further out.
  const SEA: Stop[] = [
    ['sea', 6],
    ['sea', 5],
    ['sea', 5],
    ['sea', 4],
    ['sea', 4],
    ['sea', 3],
    ['sea', 4],
    ['sea', 5],
    ['sea', 6],
  ];
  for (let y = WL; y < SCREEN_H; y++) {
    const f = (y - WL) / (SCREEN_H - WL);
    for (let x = 0; x < SCREEN_W; x++) {
      const idx = Math.max(0, Math.min(SEA.length - 1, Math.round(f * (SEA.length - 1) + (clumps(x / (8 + f * 16) + ph * 3, y, 7) - 0.5) * 0.9)));
      const [m, s] = SEA[idx]!;
      put(g, x, y, X(m, s));
    }
  }
  pier(g, glows);
  // The cutter at anchor.
  glows.push(...farShip(g, SHIP_X, SHIP_WL, SHIP_S, true, ph * 2));
  // Reflections: each water row mirrors the row as far above the waterline,
  // shifted sideways by the ripple there, darkened a step; rows in a trough show the sea.
  reflect(g, WL, SCREEN_H, ph);
  reflect(g, SHIP_WL, SHIP_WL + 70, ph, SHIP_X + 4, SCREEN_W, 2);
  // The buoy in the foreground, bobbing.
  const bp = asPic(buoy());
  const bob = Math.round(Math.sin(ph * Math.PI * 2) * 1.5);
  stamp(g, bp, 324, 792 - bp.h + bob);
  // The lamps' light breathes: their glows grow and shrink by a band.
  const breath = 1 + Math.sin(ph * Math.PI * 4) * 0.06;
  const live = glows.map((gl) => ({ ...gl, r: gl.r * breath }));
  // Logotype last, over everything.
  stampCentred(g, lockupCaps(), 78);
  return { g, glows: live };
}

const asPic = (d: { grid: TGrid }): TGrid => outlined(d.grid);

/** The water's mirror: see drawA. */
function reflect(g: TGrid, wl: number, y1: number, ph: number, x0 = 0, x1 = g.w, extra = 0): void {
  const src = new Int16Array(g.d);
  for (let y = wl; y < y1; y++) {
    const dy = y - wl;
    const f = dy / (y1 - wl);
    const sy = wl - 1 - Math.round(dy * 0.92);
    if (sy < 0) break;
    for (let x = x0; x < x1; x++) {
      const here = src[y * g.w + x] as number;
      // Leave things standing in the water (pier posts, the ship, the buoy) alone.
      if (here && !isX(here, 'sea')) continue;
      const wave = noise((x + ph * 40) / (10 + f * 30), y / (1.1 + f * 1.6), 1, 17);
      if (wave < 0.46 - f * 0.1) continue;
      const sx = x + Math.round(Math.sin(y * 0.7 + ph * Math.PI * 2) * (0.5 + f * 2.5));
      const c = src[sy * g.w + Math.max(0, Math.min(g.w - 1, sx))] as number;
      if (!c) continue;
      const lit = isX(c, 'glass') || isX(c, 'lamp') || isX(c, 'fire');
      const n = lit ? 0 : 2 + (f > 0.4 ? 1 : 0) + extra;
      put(g, x, y, (c & ~7) | Math.min(6, (c & 7) + n));
    }
  }
}

export const TITLE_A: Title = {
  id: 'A',
  name: 'The harbour at dusk',
  pal: xpal('dusk'),
  draw: drawA,
  ui: 'continue',
  uiTop: 676,
  animated: true,
  loop: LOOP,
};

/**
 * The title scene as pixels: built once for a screen size, then any frame
 * painted as a pure function of the time passed in. Nothing here reads the
 * clock or keeps state between frames: every frame starts from the same
 * still layers and draws what moves on top, so a frame depends only on `ms`.
 *
 * Built once (on the first frame, or `build()`):
 * - `still`: the sky, the moon, the land and the town with their lights'
 *   halos, and the logotype, as packed pixels;
 * - `mirror`: what each water pixel mirrors, the row as far above the
 *   waterline (nearer things about their own waterlines), darkened and
 *   cooled, lights left bright and drawn out into streaks;
 * - the ripple pattern: which pixels of each water row break the mirror to
 *   show the water's own face, and which of those are lit lips;
 * - sprites for what stands in the water (the pier, the ship).
 * Each frame copies `still`, draws the clouds, stars, smoke and gulls where
 * the sky or land shows, the water row by row (each ripple band's mirror
 * shifted a pixel or two, its face a darker version of what it mirrors),
 * the sprites, the flag, the flickering lights and the buoy.
 */
import { stamp, tgrid, hash, type TGrid } from '../town2/cells';
import { TITLE_RGBA, rampId, unpack } from './ramps';
import { addHalos, type Halo } from './light';
import { TOWN_RISE, titleLayout, type Box, type TitleLayout } from './layout';
import { logotype } from './logo';
import { isSky, makeClouds, paintMoon, paintSky, placeStars, starPixels, type Star } from './sky';
import {
  HOUSE_GROUND,
  QUAY_FRONT,
  QUAY_GROUND,
  paintFar,
  paintGarden,
  paintHill,
  paintPath,
  paintQuay,
  type LandFrame,
} from './land';
import { houseSmall, smithySmall, tavernSmall, type Building, type Flicker } from './buildings';
import { buoy, cargo, flagCells, gullCells, pier, quayLamp, ship } from './harbour';

/** Where things stand across, from the middle of the town. */
const PLACE = {
  tavernL: -174,
  smithyL: 48,
  houseMid: -6,
  pierMid: -8,
  pierLen: 44,
  shipL: 32,
  shipWl: 60,
  quayL: -196,
  quayR: 196,
  lamps: [-182, -36, 40, 176],
  buoy: -140,
} as const;

/** One building as placed: its foot's columns and the ground row under it. */
export interface Placed {
  readonly id: string;
  readonly x0: number;
  readonly x1: number;
  readonly ground: number;
}

interface Sprite {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly px: Uint32Array;
}

interface Live {
  readonly x: number;
  readonly y: number;
  readonly a: number;
  readonly b: number;
  readonly id: number;
}

interface Built {
  readonly top: TGrid;
  readonly still: Uint32Array;
  /** 1 where the still layer shows plain sky (clouds and stars may go there). */
  readonly skyMask: Uint8Array;
  /** 1 where the logotype is (nothing moving covers it). */
  readonly logoMask: Uint8Array;
  readonly mirror: Uint32Array;
  /** 1 where the water shows something standing in it or its mirror (not the town's). */
  readonly near: Uint8Array;
  /** Per water row: which look each column shows (0 mirror, 1 face, 2 lip), `RIPPLE_P` long. */
  readonly ripples: Uint8Array;
  /** Per water row: its ripple band. */
  readonly bandOf: Uint16Array;
  readonly sprites: readonly Sprite[];
  readonly stars: readonly Star[];
  readonly clouds: Int32Array;
  readonly cloudPeriod: number;
  readonly smoke: readonly { x: number; y: number; dark: boolean }[];
  readonly live: readonly Live[];
  readonly flag: { x: number; y: number };
  readonly buoy: { x: number; wl: number; px: Uint32Array; w: number; h: number };
  readonly gullY: readonly number[];
  readonly placed: readonly Placed[];
  readonly ground: Uint8Array;
  readonly logo: Box;
}

/** The ripple pattern's period across: a power of two, wider than a phone. */
const RIPPLE_P = 512;
/** The most a ripple moves the mirror sideways, in art pixels. */
export const RIPPLE_SHIFT = 3;

/** How far ripple band `band` (at water row `d`) moves the mirror at time `t`. */
function rippleShift(band: number, d: number, t: number): number {
  const amp = d < 4 ? 0 : d < 30 ? (band % 3 === 0 ? 0 : 1) : d < 140 ? 2 : RIPPLE_SHIFT;
  const period = 2000 + Math.floor(hash(band, 1, 51) * 1600);
  const phase = hash(band, 2, 51);
  return Math.round(amp * Math.sin(((t / period + phase) % 1) * Math.PI * 2));
}

/** A title scene for one screen size; `frame(ms)` paints the picture at time `ms`. */
export class TitleScene {
  readonly layout: TitleLayout;
  /** The packed pixels of the last frame painted, `layout.w` by `layout.h`. */
  readonly pixels: Uint32Array;
  private built: Built | null = null;

  constructor(widthCss: number, heightCss: number, dpr: number) {
    const logo = logotype();
    this.layout = titleLayout(widthCss, heightCss, dpr, logo.w, logo.h);
    this.pixels = new Uint32Array(this.layout.w * this.layout.h);
  }

  /** The logotype's box, in art pixels. */
  get logo(): Box {
    return this.build().logo;
  }

  /** Each building's foot and the row it stands on (for checking it stands on land). */
  get placed(): readonly Placed[] {
    return this.build().placed;
  }

  /** Whether the art pixel (x, y) was painted as ground a building may stand on. */
  isGround(x: number, y: number): boolean {
    const { w, wl } = this.layout;
    return x >= 0 && y >= 0 && x < w && y < wl && this.build().ground[y * w + x] === 1;
  }

  /** The cell above the water at (x, y), or 0. */
  cellAt(x: number, y: number): number {
    const { w, wl } = this.layout;
    return x >= 0 && y >= 0 && x < w && y < wl ? (this.build().top.d[y * w + x] as number) : 0;
  }

  /** The still layer's pixel at (x, y): everything that does not move, above the water. */
  stillAt(x: number, y: number): number {
    return this.build().still[y * this.layout.w + x] as number;
  }

  /** Whether water pixel (x, y) shows the pier, the ship or their mirrors rather than the town's. */
  isNear(x: number, y: number): boolean {
    return this.build().near[(y - this.layout.wl) * this.layout.w + x] === 1;
  }

  /** Builds the still layers now (the first frame does it if this is not called). */
  build(): Built {
    this.built ??= build(this.layout);
    return this.built;
  }

  /** Paints the frame for time `ms` into `pixels` and returns them. */
  frame(ms: number): Uint32Array {
    const b = this.build();
    const { w, h, wl } = this.layout;
    const F = this.pixels;
    F.set(b.still);
    const t = Math.max(0, ms);

    // Clouds drift right a pixel every 1.6 s, round a strip wider than the screen.
    const off = Math.floor(t / 1600) % b.cloudPeriod;
    const lead = Math.floor((b.cloudPeriod - w) / 2);
    const cl = b.clouds;
    for (let k = 0; k < cl.length; k += 3) {
      let x = (cl[k] as number) + off;
      if (x >= b.cloudPeriod) x -= b.cloudPeriod;
      x -= lead;
      if (x < 0 || x >= w) continue;
      const i = (cl[k + 1] as number) * w + x;
      if (b.skyMask[i]) F[i] = cl[k + 2] as number;
    }
    // Stars, where the sky still shows.
    for (const s of b.stars)
      for (const [dx, dy, step] of starPixels(s, t)) {
        const x = s.x + dx;
        const y = s.y + dy;
        if (x < 0 || x >= w || y < 0) continue;
        const i = y * w + x;
        if (b.skyMask[i] && F[i] === b.still[i]) F[i] = TITLE_RGBA[STAR + step] as number;
      }
    // Smoke from the chimneys, drifting right with the wind.
    b.smoke.forEach((s, k) => smoke(F, b.logoMask, w, wl, s.x, s.y, s.dark, t, k));
    // Two gulls crossing the sky, flapping now and then between glides.
    b.gullY.forEach((gy, k) => {
      const v = k === 0 ? 8.5 : 6.2;
      const span = w + 60;
      const x = Math.floor(((t * v) / 1000 + k * span * 0.55) % span) - 30;
      const y = gy + Math.round(2.5 * Math.sin((t / 5200) * Math.PI * 2 + k * 2));
      const cyc = (t + k * 1700) % 3600;
      const f = cyc < 1200 ? ([0, 1, 2, 1][Math.floor(cyc / 150) % 4] as number) : 1;
      for (const [dx, dy, c] of gullCells(f)) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || xx >= w || yy < 0 || yy >= wl) continue;
        const i = yy * w + xx;
        if (!b.logoMask[i]) F[i] = TITLE_RGBA[c] as number;
      }
    });
    // The water, row by row: the mirror shifted by its ripple band, broken
    // where a ripple shows its face (darker, cooler) or its lit lip.
    const P = RIPPLE_P;
    for (let d = 0; d < h - wl; d++) {
      const band = b.bandOf[d] as number;
      const sh = rippleShift(band, d, t);
      const pace = 260 + Math.floor(hash(band, 3, 51) * 420);
      const dir = band % 2 === 0 ? 1 : -1;
      const scroll = (((Math.floor(t / pace) * dir) % P) + P) % P;
      const row = d * w;
      const rip = d * P;
      const out = (wl + d) * w;
      for (let x = 0; x < w; x++) {
        const k = b.ripples[rip + ((x + scroll) & (P - 1))] as number;
        if (k === 0) {
          const sx = x + sh < 0 ? 0 : x + sh >= w ? w - 1 : x + sh;
          F[out + x] = b.mirror[row + sx] as number;
          continue;
        }
        // Halfway to the depth (a face) or to the afterglow (a lip): one shift and an add.
        F[out + x] =
          ((((b.mirror[row + x] as number) >>> 1) & 0x7f7f7f) + (k === 1 ? FACE_HALF : WARM_HALF)) |
          ALPHA;
      }
    }
    // What stands in the water.
    for (const s of b.sprites) blit(F, w, h, s);
    // The flag, streaming.
    const fr = Math.floor(t / 170) % 4;
    for (const [dx, dy, c] of flagCells(fr)) {
      const x = b.flag.x + dx;
      const y = b.flag.y + dy;
      if (x >= 0 && x < w && y >= 0 && y < h) F[y * w + x] = TITLE_RGBA[c] as number;
    }
    // Lights that flicker: a lamp gutters now and then, the forge's fire breathes.
    for (const l of b.live) {
      const fire = l.id === 40;
      const dim = hash(Math.floor(t / (fire ? 140 : 110)), l.id, 61) > (fire ? 0.55 : 0.93);
      if (l.x >= 0 && l.x < w && l.y >= 0 && l.y < h) F[l.y * w + l.x] = dim ? l.b : l.a;
    }
    // The buoy, bobbing a pixel either way, a ring of light water about its foot.
    const bob = Math.round(Math.sin((t / 2600) * Math.PI * 2) * 1.2);
    const by = b.buoy.wl - b.buoy.h + 2 + bob;
    blit(F, w, h, { x: b.buoy.x, y: by, w: b.buoy.w, h: b.buoy.h, px: b.buoy.px });
    const ringRow = b.buoy.wl + 1;
    if (ringRow < h)
      for (const dx of [-3, -2, b.buoy.w + 1, b.buoy.w + 2]) {
        const x = b.buoy.x + dx;
        if (x >= 0 && x < w) F[ringRow * w + x] = RING;
      }
    return F;
  }

  /** Lets go of the built layers. */
  dispose(): void {
    this.built = null;
  }
}

function blit(F: Uint32Array, w: number, h: number, s: Sprite) {
  for (let j = 0; j < s.h; j++) {
    const y = s.y + j;
    if (y < 0 || y >= h) continue;
    for (let i = 0; i < s.w; i++) {
      const p = s.px[j * s.w + i] as number;
      const x = s.x + i;
      if (p && x >= 0 && x < w) F[y * w + x] = p;
    }
  }
}

const SMOKE = rampId('smoke') * 8;
const STAR = rampId('star') * 8;
const RING = TITLE_RGBA[rampId('skyLo') * 8 + 4] as number;
/** The water's depth, which its face leans toward; the afterglow its lips catch. */
const DEEP = unpack(TITLE_RGBA[rampId('skyHi') * 8 + 7] as number);
const FACE = unpack(TITLE_RGBA[rampId('skyHi') * 8 + 5] as number);
const WARM = unpack(TITLE_RGBA[rampId('skyLo') * 8 + 4] as number);
const half = ([r, g, b]: readonly [number, number, number]) =>
  ((b >> 1) << 16) | ((g >> 1) << 8) | (r >> 1);
const FACE_HALF = half(FACE);
const WARM_HALF = half(WARM);
const ALPHA = 0xff000000 | 0;

/** Puffs rising from a chimney at (x, y): lit on the left, drifting right, thinning as they go. */
function smoke(
  F: Uint32Array,
  logo: Uint8Array,
  w: number,
  wl: number,
  x: number,
  y: number,
  dark: boolean,
  t: number,
  k: number,
) {
  const n = 6;
  const T = 4600 + k * 500;
  for (let i = 0; i < n; i++) {
    const age = t / T + i / n;
    const a = age % 1;
    const life = Math.floor(age);
    const px = x + Math.pow(a, 1.25) * 19 + Math.sin(a * 5 + k) * 1.4;
    const py = y - 1 - a * 34;
    const r = 1.2 + a * 3.6;
    for (let yy = Math.floor(py - r); yy <= py + r; yy++)
      for (let xx = Math.floor(px - r); xx <= px + r; xx++) {
        if (xx < 0 || xx >= w || yy < 0 || yy >= wl) continue;
        const dx = (xx + 0.5 - px) / r;
        const dy = (yy + 0.5 - py) / r;
        if (dx * dx + dy * dy > 1) continue;
        if (a > 0.5 && hash(xx, yy, i * 31 + life * 7 + k) < (a - 0.5) * 1.9) continue;
        const i2 = yy * w + xx;
        if (logo[i2]) continue;
        const lit = -dx * 0.7 - dy * 0.5;
        // Lit by the afterglow on its lower left: pale at first, greying as it thins.
        const step = Math.max(1, Math.min(5, Math.round((dark ? 2.9 : 1.9) + a * 1.4 - lit * 1.1)));
        F[i2] = TITLE_RGBA[SMOKE + step] as number;
      }
  }
}

/** The colour of a cell, or 0. */
const rgba = (c: number): number => (c ? (TITLE_RGBA[c] as number) : 0);

/** 1 for each ramp that is a light (lit glass, lamps, fire). */
const LIGHT = new Uint8Array(TITLE_RGBA.length >> 3);
for (const m of ['glass', 'lamp', 'fire'] as const) LIGHT[rampId(m)] = 1;
const isLight = (c: number): boolean => c !== 0 && LIGHT[c >> 3] === 1;
/** Per cell: 1 if it is a light, 1 if it is sky (tables, so the build's loops do no calls). */
const LIGHT_CELL = new Uint8Array(TITLE_RGBA.length);
const SKY_CELL = new Uint8Array(TITLE_RGBA.length);
for (let c = 8; c < TITLE_RGBA.length; c++) {
  LIGHT_CELL[c] = isLight(c) ? 1 : 0;
  SKY_CELL[c] = isSky(c) ? 1 : 0;
}

/** Mixes a packed pixel toward an RGB colour by `f`. */
function mix(p: number, rgb: readonly [number, number, number], f: number): number {
  const r = p & 255;
  const g = (p >>> 8) & 255;
  const b = (p >>> 16) & 255;
  return (
    ((255 << 24) |
      (((b + (rgb[2] - b) * f + 0.5) | 0) << 16) |
      (((g + (rgb[1] - g) * f + 0.5) | 0) << 8) |
      ((r + (rgb[0] - r) * f + 0.5) | 0)) >>>
    0
  );
}

/**
 * Each cell's colour in the water's mirror: lights as they are (a lamp's
 * glint a step softer), the sky a step darker, everything else two steps
 * darker, both cooled toward the sea.
 */
const MIRROR_LUT: Uint32Array = (() => {
  const out = new Uint32Array(TITLE_RGBA.length);
  const sea = unpack(TITLE_RGBA[rampId('sea') * 8 + 4] as number);
  const sky = new Set([rampId('skyHi'), rampId('skyLo')]);
  for (let c = 8; c < out.length; c++) {
    const ramp = c >> 3;
    const s = c & 7;
    if (LIGHT[ramp]) out[c] = TITLE_RGBA[(c & ~7) | Math.min(6, s + (s < 2 ? 1 : 0))] as number;
    else if (sky.has(ramp))
      out[c] = mix(TITLE_RGBA[(c & ~7) | Math.min(7, s + 1)] as number, sea, 0.18);
    else out[c] = mix(TITLE_RGBA[(c & ~7) | Math.min(6, s + 2)] as number, sea, 0.22);
  }
  return out;
})();

/**
 * The colour cell `c` takes mirrored at water row `d` of `wh`: toward the
 * viewer the water mirrors less and shows more of its own depth.
 */
export function mirrorColour(c: number, d: number, wh: number): number {
  if (!c) return 0;
  return fadeLut(fadeLevel(d, wh))[c] as number;
}

/** How far toward the depth row `d` of `wh` leans, in sixteenths (the fade is stepped, not smooth). */
const fadeLevel = (d: number, wh: number): number =>
  Math.round(Math.min(0.42, (d / Math.max(1, wh)) * 0.5) * 16);

const FADES: Uint32Array[] = [];
/** The mirror's colours for every cell at one fade level, made when first asked for. */
function fadeLut(level: number): Uint32Array {
  let lut = FADES[level];
  if (!lut) {
    lut = new Uint32Array(MIRROR_LUT.length);
    for (let c = 8; c < lut.length; c++)
      lut[c] = isLight(c)
        ? (MIRROR_LUT[c] as number)
        : mix(MIRROR_LUT[c] as number, DEEP, level / 16);
    FADES[level] = lut;
  }
  return lut;
}

function build(L: TitleLayout): Built {
  const { w, h, wl, cx } = L;
  const f: LandFrame = { w, cx, wl };
  const top = tgrid(w, wl);
  const ground = new Uint8Array(w * wl);
  const logoCells = logotype();
  const logo: Box = { x: L.logoX, y: L.logoY, w: logoCells.w, h: logoCells.h };

  // The sky, down behind the hills.
  const skyBottom = wl - 132;
  const rows = paintSky(top, skyBottom, logo.y + logo.h + 8);
  const last = top.d[(skyBottom - 1) * w] as number;
  top.d.fill(last, skyBottom * w, wl * w);
  // The young moon, right of the logotype's lower word, low in the dark of the sky.
  const moonBox = paintMoon(
    top,
    Math.min(w - 16, cx + Math.round(logo.w / 2) + 22),
    logo.y + Math.round(logo.h * 0.82),
  );

  // The land, back to front.
  paintFar(top, f);
  paintHill(top, ground, f);
  paintQuay(top, ground, f, PLACE.quayL, PLACE.quayR);
  const halos: Halo[] = [];
  const live: Live[] = [];
  const smokeAt: { x: number; y: number; dark: boolean }[] = [];
  const placed: Placed[] = [];
  paintPath(top, f, PLACE.houseMid, PLACE.pierMid);
  paintGarden(top, f, PLACE.houseMid);
  const place = (b: Building, x: number, groundRow: number) => {
    placed.push({ id: b.id, x0: x + b.footL, x1: x + b.footR, ground: groundRow });
    const y = groundRow - (b.g.h - 1);
    stamp(top, b.g, x, y);
    for (const hl of b.halos) halos.push({ ...hl, x: hl.x + x, y: hl.y + y });
    for (const fl of b.flicker) live.push(liveOf(fl, x, y));
    for (const c of b.chimneys) smokeAt.push({ x: c.x + x, y: c.y + y, dark: c.dark });
  };
  const house = houseSmall();
  place(
    house,
    cx + PLACE.houseMid - Math.round((house.footL + house.footR) / 2),
    wl + HOUSE_GROUND,
  );
  const tavern = tavernSmall();
  place(tavern, cx + PLACE.tavernL - tavern.footL, wl + QUAY_GROUND);
  const smithy = smithySmall();
  place(smithy, cx + PLACE.smithyL - smithy.footL, wl + QUAY_GROUND);
  // Cargo on the quay: barrels by the tavern's door, crates by the smithy.
  for (const [x, kind] of [
    [-110, 'barrel'],
    [-105, 'barrel'],
    [-62, 'crate'],
    [28, 'crate'],
    [22, 'barrel'],
    [160, 'barrel'],
  ] as const)
    cargo(top, cx + x, wl + QUAY_GROUND + 3, kind);
  PLACE.lamps.forEach((lx, i) => {
    const q = quayLamp(top, cx + lx, wl + QUAY_GROUND + 1, 80 + i);
    halos.push(q.halo);
    for (const fl of q.flick) live.push(liveOf(fl, 0, 0));
  });

  // The still layer: cells to colour, the halos added, the logotype on top.
  const still = new Uint32Array(w * h);
  const skyMask = new Uint8Array(w * wl);
  colourStill(top.d, still, skyMask);
  addHalos(still, w, wl, halos);
  for (let y = Math.max(0, moonBox.y); y < moonBox.y + moonBox.h; y++)
    for (let x = Math.max(0, moonBox.x); x < Math.min(w, moonBox.x + moonBox.w); x++)
      skyMask[y * w + x] = 0;
  const logoMask = new Uint8Array(w * wl);
  for (let j = 0; j < logoCells.h; j++)
    for (let i = 0; i < logoCells.w; i++) {
      const c = logoCells.d[j * logoCells.w + i] as number;
      const x = logo.x + i;
      const y = logo.y + j;
      if (!c || x < 0 || x >= w || y < 0 || y >= wl) continue;
      const k = y * w + x;
      still[k] = rgba(c);
      skyMask[k] = 0;
      logoMask[k] = 1;
    }

  // What stands in the water: the pier from the quay's front, the ship at anchor.
  const pr = pier(PLACE.pierLen);
  const prX = cx + PLACE.pierMid + pr.dx;
  const prY = wl + QUAY_FRONT + pr.dy;
  const sh = ship();
  const shX = cx + PLACE.shipL;
  const shY = wl + PLACE.shipWl - sh.wl;
  const waterHalos: Halo[] = [
    ...pr.halos.map((hl) => ({ ...hl, x: hl.x + prX, y: hl.y + prY })),
    ...sh.halos.map((hl) => ({ ...hl, x: hl.x + shX, y: hl.y + shY })),
  ];
  for (const fl of pr.flicker) live.push(liveOf(fl, prX, prY));
  for (const fl of sh.flicker) live.push(liveOf(fl, shX, shY));
  const sprite = (g: TGrid, x: number, y: number): Sprite => {
    const px = new Uint32Array(g.w * g.h);
    for (let i = 0; i < px.length; i++) px[i] = rgba(g.d[i] as number);
    // Halos light the sprites too: the lantern on the ship's stern, the lamp on the pier's planks.
    addHalos(
      px,
      g.w,
      g.h,
      waterHalos.map((hl) => ({ ...hl, x: hl.x - x, y: hl.y - y })),
    );
    return { x, y, w: g.w, h: g.h, px };
  };
  const sprites = [sprite(pr.g, prX, prY), sprite(sh.g, shX, shY)];

  // The mirror's cells: each water row shows the row as far above the
  // waterline; nearer things (the pier, the ship) mirrored about their own.
  const wh = h - wl;
  const cells = new Int16Array(w * wh);
  for (let d = 0; d < wh; d++) {
    const sy = wl - 1 - d;
    if (sy >= 0) cells.set(top.d.subarray(sy * w, sy * w + w), d * w);
    else cells.copyWithin(d * w, (d - 1) * w, d * w);
  }
  const near = new Uint8Array(w * wh);
  const mirrorNear = (s: Sprite, g: TGrid, gwl: number) => {
    for (let j = 0; j < g.h; j++) {
      // The sprite itself, where it stands in the water.
      const d = s.y + j - wl;
      if (d >= 0 && d < wh)
        for (let i = 0; i < g.w; i++)
          if (g.d[j * g.w + i] && s.x + i >= 0 && s.x + i < w) near[d * w + s.x + i] = 1;
    }
    // Row `gwl - 1 - j` of the drawing shows at water row `s.y + gwl + j`.
    for (let j = 0; j < gwl; j++) {
      const d = s.y + gwl + j - wl;
      if (d < 0 || d >= wh) continue;
      const sr = gwl - 1 - j;
      for (let i = 0; i < g.w; i++) {
        const c = g.d[sr * g.w + i] as number;
        const x = s.x + i;
        if (!c || x < 0 || x >= w) continue;
        cells[d * w + x] = c;
        near[d * w + x] = 1;
      }
    }
  };
  mirrorNear(sprites[0]!, pr.g, pr.wl);
  mirrorNear(sprites[1]!, sh.g, sh.wl);
  // A lit window mirrors as one patch of light: the bars and frame between
  // lit panes are lost in the water's blur, so they take their neighbours' light.
  // Lights are only in the town's band and the mirrors of the pier and the ship:
  // the passes that look for them need go no further down the water than that.
  const lit = Math.min(wh, Math.max(TOWN_RISE + 8, shY + sh.g.h * 2 - wl, prY + pr.g.h * 2 - wl));
  fillLitBars(cells, w, lit);
  const mirror = new Uint32Array(w * wh);
  colourMirror(cells, mirror, w, wh);
  streakLights(cells, mirror, w, wh, lit);
  // Pools of lamplight on the water under the pier's lamp and the ship's lantern.
  addHalos(
    mirror,
    w,
    wh,
    waterHalos.map((hl) => ({
      ...hl,
      y: hl.y - wl,
      squash: 0.55,
      r: hl.r * 1.25,
      strength: hl.strength * 0.5,
    })),
  );

  // The ripples: bands two rows tall by the quay, deeper toward the viewer;
  // in each, long runs of mirror broken by short runs of face, a band's top
  // row lit as a lip. By the quay the mirror is nearly still; in the menu's
  // band the runs are long and the lips few, so the button sits on calm water.
  const bandOf = new Uint16Array(wh);
  for (let d = 0, band = 0; d < wh; band++) {
    const bh = d < 90 ? 2 : 3;
    for (let j = 0; j < bh && d < wh; j++, d++) bandOf[d] = band;
  }
  const calm = L.calm - wl;
  const ripples = makeRipples(bandOf, wh, calm);

  // The buoy, on the left, clear above the calm water.
  const bu = buoy();
  const buoyPx = new Uint32Array(bu.w * bu.h);
  for (let i = 0; i < buoyPx.length; i++) buoyPx[i] = rgba(bu.d[i] as number);
  const buoyWl = Math.min(L.calm - 8, wl + Math.round((L.calm - wl) * 0.7));

  // The clouds, as pixels on their strip: x, y and colour in threes.
  const cloudPeriod = Math.max(w + 140, 540);
  const cloudTop = logo.y + logo.h + 8;
  const cloudBottom = Math.max(cloudTop + 20, wl - 112);
  const cloudPx: number[] = [];
  for (const c of makeClouds(cloudPeriod, cloudTop, cloudBottom))
    for (let j = 0; j < c.g.h; j++)
      for (let i = 0; i < c.g.w; i++) {
        const cell = c.g.d[j * c.g.w + i] as number;
        if (cell && c.y + j < wl) cloudPx.push((c.x + i) % cloudPeriod, c.y + j, rgba(cell));
      }

  const stars = placeStars(w, rows[9] ?? skyBottom, cx, [logo, moonBox]);
  const townTop = wl - 190;
  const gap = Math.max(10, townTop - (logo.y + logo.h));
  const gullY = [logo.y + logo.h + Math.round(gap * 0.45), logo.y + logo.h + Math.round(gap * 0.8)];

  return {
    top,
    still,
    skyMask,
    logoMask,
    mirror,
    near,
    ripples,
    bandOf,
    sprites,
    stars,
    clouds: Int32Array.from(cloudPx),
    cloudPeriod,
    smoke: smokeAt,
    live,
    flag: { x: shX + sh.flag.x, y: shY + sh.flag.y },
    buoy: { x: cx + PLACE.buoy, wl: buoyWl, px: buoyPx, w: bu.w, h: bu.h },
    gullY,
    placed,
    ground,
    logo,
  };
}

// The build's long loops, each in a small function of its own: a loop over
// every pixel is compiled on its own as it runs, which is far quicker when the
// function around it is small (the title's first frame waits on these).

/** Colours the cells above the water, and marks where plain sky shows. */
function colourStill(d: Int16Array, still: Uint32Array, skyMask: Uint8Array): void {
  for (let i = 0; i < d.length; i++) {
    const c = d[i] as number;
    still[i] = TITLE_RGBA[c] as number;
    skyMask[i] = SKY_CELL[c] as number;
  }
}

/**
 * A lit window mirrors as one patch of light: the bars and frame between lit
 * panes are lost in the water's blur, so they take their neighbours' light.
 */
function fillLitBars(cells: Int16Array, w: number, wh: number): void {
  const fills: number[] = [];
  for (let d = 1; d < wh - 1; d++)
    for (let i = d * w + 1; i < (d + 1) * w - 1; i++) {
      if (LIGHT_CELL[cells[i] as number]) continue;
      const l = cells[i - 1] as number;
      const u = cells[i - w] as number;
      if (LIGHT_CELL[l] && LIGHT_CELL[cells[i + 1] as number]) fills.push(i, l);
      else if (LIGHT_CELL[u] && LIGHT_CELL[cells[i + w] as number]) fills.push(i, u);
    }
  for (let k = 0; k < fills.length; k += 2) cells[fills[k] as number] = fills[k + 1] as number;
}

/** The mirror's colours, row by row at each row's fade. */
function colourMirror(cells: Int16Array, mirror: Uint32Array, w: number, wh: number): void {
  for (let d = 0; d < wh; d++) {
    const lut = fadeLut(fadeLevel(d, wh));
    for (let i = d * w; i < (d + 1) * w; i++) mirror[i] = lut[cells[i] as number] as number;
  }
}

/**
 * Lights reflect as streaks: each lit pixel drawn out downward in dashes,
 * longer further from the shore, a wobbling column of light.
 */
function streakLights(
  cells: Int16Array,
  mirror: Uint32Array,
  w: number,
  wh: number,
  rows: number,
): void {
  for (let i = 0; i < w * rows; i++) {
    const c = cells[i] as number;
    if (!LIGHT_CELL[c] || (c & 7) > 3) continue;
    const d = (i / w) | 0;
    const x = i - d * w;
    const len = 2 + Math.round(d * 0.1);
    for (let j = 1; j <= len; j++) {
      const dd = d + j;
      if (dd >= wh || (dd + (x & 1)) % 3 === 2 || hash(x, dd, 71) < j / (len + 3)) continue;
      mirror[dd * w + x] = TITLE_RGBA[
        (c & ~7) | Math.min(4, (c & 7) + (j > len / 2 ? 2 : 1))
      ] as number;
    }
  }
}

/**
 * The ripple pattern: in each band, long runs of mirror broken by short runs
 * of face, a band's top row lit as a lip. By the quay the mirror is nearly
 * still; in the menu's band (from row `calm`) the runs are long and the lips few.
 */
function makeRipples(bandOf: Uint16Array, wh: number, calm: number): Uint8Array {
  const ripples = new Uint8Array(wh * RIPPLE_P);
  for (let d = 0; d < wh; d++) {
    const band = bandOf[d] as number;
    const first = d === 0 || bandOf[d - 1] !== band;
    const inCalm = d >= calm;
    const onBase = d < 6 ? 90 : inCalm ? 46 : 22 + 14 * (d / Math.max(1, calm));
    const offBase = d < 6 ? 1 : inCalm ? 3 : 2 + 3 * (d / Math.max(1, calm));
    const look = first && d > 3 && hash(band, 9, 81) < (inCalm ? 0.25 : 0.7) ? 2 : 1;
    let x = Math.floor(hash(band, 4, 81) * 20);
    for (let k = 0; x < RIPPLE_P; k++) {
      x += Math.round(onBase * (0.45 + hash(band, k, 82)));
      const len = Math.max(1, Math.round(offBase * (0.5 + hash(band, k, 83))));
      ripples.fill(
        look,
        d * RIPPLE_P + Math.min(RIPPLE_P, x),
        d * RIPPLE_P + Math.min(RIPPLE_P, x + len),
      );
      x += len;
    }
  }
  return ripples;
}

function liveOf(f: Flicker, x: number, y: number): Live {
  return { x: f.x + x, y: f.y + y, a: rgba(f.a), b: rgba(f.b), id: f.id };
}

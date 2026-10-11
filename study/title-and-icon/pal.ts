/**
 * The study's colours: every C-scale ramp the town uses (src/art/town2/ramps.ts,
 * read-only, through its day or dusk palette) plus a few ramps this study needs
 * that the town never did (skies, a heraldic field, the firelit room). A cell
 * is the town's own encoding (material id * 8 + step), so the town's pieces and
 * figures stamp straight into a title's grid and its `darker`, `outlined` and
 * `solid` work on the new ramps too.
 *
 * Lights are banded, never smooth: a glow adds warm light in a few flat rings
 * whose edges break into clumps, the way the town breaks its water and grass.
 */
import { MATS, DAY2, DUSK2, type Mat } from '../../src/art/town2/ramps';
import { rgbOf } from '../../src/art/palette';
import { clumps } from '../../src/art/town2/texture';
import type { TGrid } from '../../src/art/town2/cells';

/** New ramps, lightest first. Up to eight steps; 6 is the line where it matters. */
export const EXTRA = {
  // Dusk sky over the harbour, from the zenith (hi 6) down to the afterglow (lo 0).
  skyHi: ['#4a3c78', '#41366e', '#393164', '#312b5a', '#2a2650', '#232046', '#1c1a3c', '#16142f'],
  skyLo: ['#f6c47a', '#eea06c', '#dc8068', '#c0686e', '#9c5878', '#7c4c7a', '#5e4278', '#4f3d78'],
  // Dawn sky over the headland, zenith (hi 6) down to the sunrise (lo 0).
  dawnHi: ['#a8c8ec', '#98bce6', '#88afdf', '#7aa2d6', '#6c94cc', '#6086c0', '#5678b2', '#4c6aa4'],
  dawnLo: ['#fff6d8', '#ffe8b4', '#ffd8a0', '#fcc49a', '#f0b0a0', '#dca2ac', '#c49cbc', '#acacd6'],
  // A cloud lit from below and the left at dawn, or at dusk (cloudDusk).
  cloud: ['#fffbee', '#ffe8c8', '#f8ccb4', '#e4aab0', '#c88ea8', '#a07a9e', '#6e5c86'],
  cloudDusk: ['#ffcf8a', '#f0a07a', '#c87878', '#9c6080', '#764e78', '#5a4270', '#3a2c58'],
  // Far land under haze: dusk (hazeDusk) and dawn (hazeDawn), nearest last.
  hazeDusk: ['#7a5a8a', '#664e82', '#55467a', '#463d6e', '#3a3462', '#2f2b55', '#221f44'],
  hazeDawn: ['#d6c6dc', '#c0b4d6', '#a8a4cc', '#9496c0', '#8088b2', '#6c78a2', '#4c5a86'],
  // The heraldic field: deep blue, and the diaper pattern's step.
  azure: ['#6a8ee0', '#4a6cc8', '#3a56ac', '#2e4590', '#253876', '#1d2c5e', '#141f44', '#0c1430'],
  // The menus' navy, as a ramp for icons and the crest's ground.
  navy: ['#4a5682', '#38426a', '#2e3658', '#262c48', '#232a45', '#1e1a2a', '#15111f', '#0e0b16'],
  // Starlight and the moon.
  star: ['#ffffff', '#fff6d8', '#d8d4f0', '#a8a4d8', '#7c78b4', '#5a5690', '#3a3866'],
  // The menus' gold, the gilding of a logotype: glint to line.
  gilt: ['#fffbe0', '#ffe9a0', '#ffd34d', '#e8ac3a', '#c9822e', '#94582a', '#5a3020', '#2c1418'],
  // Ember and firelight on things in a dark room.
  ember: ['#fff4c0', '#ffd27a', '#f4a050', '#d8743a', '#a8502e', '#6e3228', '#3a1a1e'],
  // Limewash cream for painted letters, unshifted at any hour.
  parch: ['#fffcf0', '#fbf0d4', '#f2e2b8', '#e2cc9c', '#c8ac80', '#9a7c64', '#5a4048', '#2e1e2a'],
  // A banner's red, richer than the cloak's crimson.
  banner: ['#ff9a7a', '#e8604e', '#c83c44', '#a02c40', '#7c223c', '#561834', '#2c0c22'],
  // Sunset sea for the ship icon.
  sunsea: ['#ffe6a8', '#f8b878', '#d88070', '#a8607a', '#7a4a78', '#523a6c', '#2e2450'],
} as const satisfies Record<string, readonly string[]>;

export type XMat = Mat | keyof typeof EXTRA;
const XNAMES = Object.keys(EXTRA) as (keyof typeof EXTRA)[];
const ID: Record<string, number> = {};
MATS.forEach((m, i) => (ID[m] = i + 1));
XNAMES.forEach((m, i) => (ID[m] = MATS.length + 1 + i));
const COUNT = MATS.length + XNAMES.length + 1;

/** A cell on any ramp, town or study; steps 0..7. */
export const X = (m: XMat, t: number): number =>
  (ID[m] as number) * 8 + Math.max(0, Math.min(7, Math.round(t)));
export const xmatOf = (c: number): XMat | null => {
  if (!c) return null;
  const i = (c >> 3) - 1;
  return i < MATS.length ? (MATS[i] ?? null) : (XNAMES[i - MATS.length] ?? null);
};
export const isX = (c: number, m: XMat): boolean => c !== 0 && c >> 3 === ID[m];

export interface XPal {
  /** RGB per cell id. */
  readonly rgb: Uint8Array;
}

/**
 * A palette: the town's ramps at `time`, each colour optionally passed
 * through `tint` (a firelit room warms them), and the study ramps as authored.
 */
export function xpal(
  time: 'day' | 'dusk',
  tint?: (rgb: [number, number, number], m: XMat) => [number, number, number],
  overrides: Partial<Record<XMat, readonly string[]>> = {},
): XPal {
  const rgb = new Uint8Array(COUNT * 8 * 3);
  const base = time === 'day' ? DAY2 : DUSK2;
  const set = (m: XMat, steps: readonly string[]) =>
    steps.forEach((hex, t) => {
      let c = rgbOf(hex);
      if (tint) c = tint(c, m);
      rgb.set(c, ((ID[m] as number) * 8 + t) * 3);
    });
  for (const m of MATS) {
    const s = [...(overrides[m] ?? base.colours[m])];
    while (s.length < 8) s.push(s[s.length - 1] as string);
    set(m, s);
  }
  for (const m of XNAMES) {
    const s = [...(overrides[m] ?? EXTRA[m])];
    while (s.length < 8) s.push(s[s.length - 1] as string);
    set(m, s);
  }
  return { rgb };
}

/** A banded light: flat rings of `colour`, their edges broken into clumps. */
export interface BandGlow {
  x: number;
  y: number;
  r: number;
  strength: number;
  colour?: readonly [number, number, number];
  bands?: number;
  /** Squash vertically (a pool of light on the ground). */
  squash?: number;
  /** How far the rings' edges break into clumps (0 for clean rings). */
  jitter?: number;
}

const WARM = [255, 176, 84] as const;

/** Colours a grid into RGBA, one value per art pixel, glows added in bands. */
export function colourise(g: TGrid, pal: XPal, glows: readonly BandGlow[] = []): Uint8ClampedArray {
  const out = new Uint8ClampedArray(g.w * g.h * 4);
  for (let i = 0; i < g.d.length; i++) {
    const c = g.d[i] as number;
    if (!c) continue;
    out[i * 4] = pal.rgb[c * 3] as number;
    out[i * 4 + 1] = pal.rgb[c * 3 + 1] as number;
    out[i * 4 + 2] = pal.rgb[c * 3 + 2] as number;
    out[i * 4 + 3] = 255;
  }
  for (const gl of glows) {
    const col = gl.colour ?? WARM;
    const bands = gl.bands ?? 3;
    const sq = gl.squash ?? 1;
    const ry = gl.r * sq;
    for (let y = Math.max(0, Math.floor(gl.y - ry)); y <= Math.min(g.h - 1, gl.y + ry); y++)
      for (let x = Math.max(0, Math.floor(gl.x - gl.r)); x <= Math.min(g.w - 1, gl.x + gl.r); x++) {
        const d = Math.hypot((x + 0.5 - gl.x) / gl.r, (y + 0.5 - gl.y) / ry);
        if (d >= 1) continue;
        const f = 1 - d;
        // Quantise to `bands` flat rings, the boundary between rings clumped.
        const q = Math.floor(f * bands + (clumps(x, y, 41) - 0.5) * (gl.jitter ?? 0.7) + 0.15);
        if (q <= 0) continue;
        const a = (gl.strength * Math.min(bands, q)) / bands;
        const i = (y * g.w + x) * 4;
        if (!out[i + 3]) continue;
        for (let k = 0; k < 3; k++)
          out[i + k] = Math.min(255, (out[i + k] as number) + (col[k] as number) * a);
      }
  }
  return out;
}

/** A canvas showing the grid at one canvas pixel per art pixel, CSS-scaled crisp. */
export function gridCanvas(
  g: TGrid,
  pal: XPal,
  glows: readonly BandGlow[] = [],
  cssScale = 1,
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = g.w;
  c.height = g.h;
  c.style.width = `${g.w * cssScale}px`;
  c.style.height = `${g.h * cssScale}px`;
  c.style.imageRendering = 'pixelated';
  paintInto(c, g, pal, glows);
  return c;
}

export function paintInto(
  c: HTMLCanvasElement,
  g: TGrid,
  pal: XPal,
  glows: readonly BandGlow[] = [],
): void {
  const ctx = c.getContext('2d')!;
  const data = colourise(g, pal, glows);
  ctx.putImageData(new ImageData(data as Uint8ClampedArray<ArrayBuffer>, g.w, g.h), 0, 0);
}

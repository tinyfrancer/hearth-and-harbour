/**
 * The title's colours. Every C-scale ramp the town uses, at dusk
 * (`DUSK2` in ../town2/ramps.ts, read-only), plus the few ramps the title
 * needs that the town never did: the dusk sky, the haze on the far land, a
 * cloud lit from below, starlight, the logotype's gilt and its navy rim.
 * Taken from the approved title study (study/title-and-icon/pal.ts), trimmed
 * to the dusk harbour and with the sky ramps re-stepped so neighbouring bands
 * differ by a clear, even amount (the study's lower sky had two pairs of
 * near-identical steps, which read as mud).
 *
 * A cell is the town's own encoding (material id * 8 + step), so the town's
 * `outlined`, `darker` and `bevel` work on the title's ramps too.
 */
import { MATS, DUSK2, type Mat } from '../town2/ramps';
import { rgbOf } from '../palette';

/** The title's own ramps, lightest first; up to eight steps. */
export const TITLE_RAMPS = {
  // The dusk sky from the zenith (skyHi 7) down to the afterglow on the horizon (skyLo 0).
  skyHi: ['#4e4180', '#463a76', '#3f346c', '#382f62', '#312a58', '#2a254e', '#232044', '#1c1a3a'],
  skyLo: ['#f7c27a', '#efa36e', '#e08868', '#c8716c', '#aa6274', '#8c5679', '#704c7c', '#5a457e'],
  // Long clouds lit from beneath by the sun that has gone down.
  cloud: ['#ffd696', '#f6ae7e', '#d88a7c', '#b06e80', '#8a5a7e', '#6a4a76', '#46345e'],
  // Far land under haze, farthest (0) to nearest (6), stepping toward the night.
  haze: ['#8e6488', '#7a5a86', '#664f80', '#554677', '#463e6c', '#39355f', '#2a2a50'],
  // Starlight and the moon.
  star: ['#ffffff', '#fff6d8', '#e4dcf4', '#b8b0e0', '#8c84c0', '#64609c', '#403c70'],
  // The logotype's gold leaf, glint to line.
  gilt: ['#fffbe0', '#ffe9a0', '#ffd34d', '#e8ac3a', '#c9822e', '#94582a', '#5a3020', '#2c1418'],
  // The menus' navy, for the logotype's rim and shadow.
  navy: ['#4a5682', '#38426a', '#2e3658', '#262c48', '#232a45', '#1e1a2a', '#15111f', '#0e0b16'],
  // Limewash cream for the ampersand, unshifted at any hour.
  parch: ['#fffcf0', '#fbf0d4', '#f2e2b8', '#e2cc9c', '#c8ac80', '#9a7c64', '#5a4048', '#2e1e2a'],
} as const satisfies Record<string, readonly string[]>;

export type TitleMat = Mat | keyof typeof TITLE_RAMPS;
const EXTRA = Object.keys(TITLE_RAMPS) as (keyof typeof TITLE_RAMPS)[];
// A plain object, not a Map: `tc('grass', t)` in a loop is then a property read the engine caches.
const ID = {} as Record<TitleMat, number>;
MATS.forEach((m, i) => (ID[m] = i + 1));
EXTRA.forEach((m, i) => (ID[m] = MATS.length + 1 + i));
const COUNT = MATS.length + EXTRA.length + 1;

/** A cell on any ramp, town or title; steps 0..7. */
export const tc = (m: TitleMat, t: number): number =>
  ID[m] * 8 + (t <= 0 ? 0 : t >= 7 ? 7 : Math.round(t));

/** Whether a cell is on ramp `m`. */
export const isOn = (c: number, m: TitleMat): boolean => c !== 0 && c >> 3 === ID[m];

const NAMES: TitleMat[] = [];
for (const m of Object.keys(ID) as TitleMat[]) NAMES[ID[m]] = m;

/** A cell as `ramp:step`, a name that survives ramps being added (data baked into source uses it). */
export const cellName = (c: number): string => `${NAMES[c >> 3]}:${c & 7}`;

/** The cell a `ramp:step` name stands for. */
export function cellNamed(name: string): number {
  const [m, s] = name.split(':') as [TitleMat, string];
  return tc(m, Number(s));
}

/** A cell's ramp id (cell >> 3), for comparing without a lookup. */
export const rampId = (m: TitleMat): number => ID[m];

/**
 * Each cell's colour as one 32-bit value in the byte order ImageData keeps
 * (red first in memory), opaque. Cell 0 is transparent.
 */
export const TITLE_RGBA: Uint32Array = (() => {
  const out = new Uint32Array(COUNT * 8);
  const set = (m: TitleMat, steps: readonly string[]) => {
    for (let t = 0; t < 8; t++) {
      const [r, g, b] = rgbOf(steps[Math.min(t, steps.length - 1)] as string);
      out[ID[m] * 8 + t] = packRgb(r, g, b);
    }
  };
  for (const m of MATS) set(m, DUSK2.colours[m]);
  for (const m of EXTRA) set(m, TITLE_RAMPS[m]);
  return out;
})();

/** Red, green and blue packed as an opaque pixel in ImageData's byte order. */
export function packRgb(r: number, g: number, b: number): number {
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/** The red, green and blue of a packed pixel. */
export const unpack = (p: number): [number, number, number] => [
  p & 255,
  (p >>> 8) & 255,
  (p >>> 16) & 255,
];

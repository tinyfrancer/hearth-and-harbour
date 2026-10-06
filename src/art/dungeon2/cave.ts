/**
 * The dungeon's own colours at the C scale, named once (B10a): the cave's
 * rock, sand and water and the hides, shells and feathers of what lives in
 * it. They are kept here, beside the town's ramps (../town2/ramps.ts) rather
 * than in them, so the dungeon's palette can change without touching a cell
 * of the town, and the town's ramps can grow without moving a cell of the
 * dungeon: cave materials are numbered from `CAVE_FIRST`, far past any id
 * the town will reach, in the same cells (material id * 8 + step) that every
 * C-scale helper already works on (`darker`, `outlined`, `stamp`, ...).
 *
 * The cave palettes (`CAVE_DUSK`, `CAVE_DAY`) are the town's (`DUSK2`,
 * `DAY2`) with the cave's ramps added: every town material keeps its colour,
 * so the hero, drawn in town materials, is the same in a cave as at dusk in
 * town. Anything holding a dungeon picture rasterizes it with one of these.
 */
import { DAY_SHIFT, DUSK_SHIFT, rgbOf, shift } from '../palette';
import {
  cell as townCell,
  isMat as townIsMat,
  matOf as townMatOf,
  type Cell,
} from '../town2/cells';
import { DAY2, DUSK2, type Mat, type Palette2 } from '../town2/ramps';

/**
 * Base colours, lightest first, before the day or dusk shift: six steps and
 * the line, lights leaning warm and shadows cool, as the town's.
 */
const CAVE_BASE = {
  // Cave rock: cooler and more violet than the town's `rock`, so a cave
  // reads as underground beside it.
  caverock: ['#e4dce6', '#bcb2c4', '#968ea6', '#787290', '#5c5874', '#423e58', '#201c30'],
  // Cave sand: greyer than the beach, so a floor stays calm under a lantern.
  cavesand: ['#f4ead0', '#dccdae', '#c2b192', '#a69578', '#867a66', '#625a54', '#302a2e'],
  // Shallow water over sand, green-teal: plainly wadeable.
  shoal: ['#d4fff0', '#96e6d2', '#66c6b6', '#46a49c', '#327e80', '#225a66', '#0e2c3a'],
  // The cave's dark sea, much darker than the shallows: plainly not.
  deep: ['#a8d4f4', '#5c9ad0', '#3c74b0', '#2c5890', '#203f72', '#182c56', '#0a142e'],
  // Weed at the tide line and in the pools.
  weed: ['#d4e494', '#a8c466', '#7ea04c', '#5e7e3c', '#465e30', '#304226', '#161e12'],
  // Hides, shells and feathers worn by nobody in town.
  fur: ['#d8ccc4', '#b0a29c', '#8c7e7c', '#6e6264', '#544a50', '#3a323c', '#1c161e'],
  crab: ['#ffc88a', '#f08a52', '#d4603c', '#b04434', '#86302e', '#5a2026', '#2c0e14'],
  feather: ['#f4ffb0', '#b6e45a', '#6cbc44', '#3e9a3c', '#2a7638', '#1c5232', '#0c281c'],
  troll: ['#c8d4a0', '#a0b07c', '#7e9064', '#627452', '#4a5844', '#343e36', '#181e1c'],
  goblin: ['#e0ec9a', '#b8d06a', '#94b250', '#749240', '#567234', '#3c522a', '#1e2a16'],
  // A light itself (a lit fuse, a pool's glint): never shifted.
  ember: ['#ffffff', '#fff6c0', '#ffe070', '#ffb040', '#f07028', '#b84020', '#501010'],
} as const satisfies Record<string, readonly string[]>;

export type CaveMat = keyof typeof CAVE_BASE;
export const CAVE_MATS = Object.keys(CAVE_BASE) as CaveMat[];
/** Any material a dungeon picture may hold: the town's or the cave's. */
export type Mat2 = Mat | CaveMat;

/** The first cave material's id: far past the town's (about 70 today), so neither moves the other. */
export const CAVE_FIRST = 400;
const CAVE_ID = Object.fromEntries(CAVE_MATS.map((m, i) => [m, CAVE_FIRST + i])) as Record<
  CaveMat,
  number
>;

const isCave = (m: Mat2): m is CaveMat => Object.hasOwn(CAVE_ID, m);

/** A material and a step, for town and cave materials alike. */
export const cell = (m: Mat2, t: number): Cell =>
  isCave(m) ? CAVE_ID[m] * 8 + Math.max(0, Math.min(6, Math.round(t))) : townCell(m, t);

/** A cell's material, town or cave; null for an empty cell. */
export function matOf(c: Cell): Mat2 | null {
  if (!c) return null;
  const id = c >> 3;
  if (id >= CAVE_FIRST) return CAVE_MATS[id - CAVE_FIRST] ?? null;
  return townMatOf(c);
}

export const isMat = (c: Cell, m: Mat2): boolean =>
  isCave(m) ? c !== 0 && c >> 3 === CAVE_ID[m] : townIsMat(c, m);

/** Swaps whole materials, keeping each cell's step (a skin for a goblin's). */
export function swap2(swap: Partial<Record<Mat2, Mat2>>): (c: Cell) => Cell {
  return (c) => {
    const m = matOf(c);
    const to = m && swap[m];
    return to ? cell(to, c & 7) : c;
  };
}

/** Ramps that never shift. */
const EXEMPT: readonly CaveMat[] = ['ember'];

/**
 * Dusk's hand-set steps: shallow water, shifted, stays a bright daylight teal
 * in the dark cave, so it is set by hand as the town's sea is; its glints
 * catch the lanterns.
 */
const DUSK_SET: Partial<Record<CaveMat, readonly (string | null)[]>> = {
  shoal: ['#c8e4d4', '#6fb0a4', '#4c9088', '#3a7676', '#2c5c62', '#20424e', '#0e2230'],
};

/** A cave palette: the town's palette of that time with the cave's ramps added. */
export interface CavePalette extends Palette2 {
  /** The cave's own ramps as colours, for keys and the gallery. */
  readonly cave: Readonly<Record<CaveMat, readonly string[]>>;
}

function cavePalette(town: Palette2): CavePalette {
  const by = town.name === 'day' ? DAY_SHIFT : DUSK_SHIFT;
  const rgb = new Uint8Array((CAVE_FIRST + CAVE_MATS.length) * 8 * 3);
  rgb.set(town.rgb.subarray(0, Math.min(town.rgb.length, rgb.length)));
  const cave = {} as Record<CaveMat, readonly string[]>;
  for (const m of CAVE_MATS) {
    const set = town.name === 'dusk' ? DUSK_SET[m] : undefined;
    const steps = (CAVE_BASE[m] as readonly string[]).map(
      (hex, t) => set?.[t] ?? (EXEMPT.includes(m) ? hex : shift(hex, by)),
    );
    cave[m] = steps;
    steps.forEach((hex, t) => rgb.set(rgbOf(hex), (CAVE_ID[m] * 8 + t) * 3));
  }
  return { name: town.name, lightsOn: town.lightsOn, colours: town.colours, rgb, cave };
}

/** The dungeon as it is played: always dusk, lit by its lanterns. */
export const CAVE_DUSK: CavePalette = cavePalette(DUSK2);
/** The same by day: for portraits and the menus, which have no dusk. */
export const CAVE_DAY: CavePalette = cavePalette(DAY2);

/** The cave palette for a time of day. */
export const cavePaletteFor = (time: 'day' | 'dusk'): CavePalette =>
  time === 'day' ? CAVE_DAY : CAVE_DUSK;

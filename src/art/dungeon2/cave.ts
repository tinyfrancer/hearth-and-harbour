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
  // B15, the tide-pool cave (appended, so every material above keeps its id and colour).
  // Its rock: warm, pale and water-worn, a sandstone grey with a blush of ochre, so a sea cave
  // open to daylight never reads as the grotto's violet dark.
  tiderock: ['#fcf4e6', '#e4d6c2', '#c8b8a2', '#a89884', '#887a6e', '#625858', '#2e262c'],
  // Its sand: a beach's, bright and warm, wet sand a step down it.
  tidesand: ['#fffae6', '#faecc6', '#f0daa8', '#dcc08a', '#bc9e72', '#8a745e', '#40342e'],
  // Clear water over sand in a pool, sunlit: turquoise, lighter than any cave shoal.
  pool: ['#f0fffa', '#b4f4e8', '#80e0d6', '#56c6c4', '#3aa2aa', '#2a7a88', '#123c4a'],
  // The sea in the cave: blue-green and bright, much darker than the pools.
  tidedeep: ['#c4f0f6', '#7ad0e6', '#4eaed2', '#3a8ebc', '#2c70a0', '#20527e', '#0e2644'],
  // Kelp and wrack: olive-brown, not the grotto's green weed.
  kelp: ['#f0e8a0', '#d0c066', '#a8964a', '#827238', '#5e5430', '#403a26', '#1e1a12'],
  // Old Snapper's shell, mossy olive-brown, and his skin, grey-green.
  turtle: ['#eee6a8', '#cabe80', '#a2965e', '#7e7448', '#5e563a', '#423c2e', '#201c16'],
  turtleskin: ['#e8eac8', '#c2c8a0', '#9aa27e', '#7a8462', '#5e684e', '#42483c', '#1e221c'],
  // Anemones: a soft sea pink, small and never on a floor's open ground.
  anemone: ['#fff0f6', '#ffc4dc', '#f494bc', '#d8689e', '#ac4c82', '#783662', '#381830'],
  // B19, Thistlewood's Edge and the Deepthorn (appended): the black bear's coat, the dire wolf's
  // charcoal (darker than the grey wolf's, so he reads as the bigger, worse thing), the hill ogre's
  // grey-green hide (greyer and paler than the troll's), the hobgoblin's orange-brown skin.
  bear: ['#948ea0', '#686274', '#4c4858', '#3a3644', '#2a2632', '#1c1a24', '#0c0a10'],
  direfur: ['#bab6c0', '#8e8a98', '#6e6a7a', '#545062', '#3e3a4a', '#2a2834', '#121018'],
  ogre: ['#dce2c4', '#b6bea0', '#949e84', '#78826a', '#5c6654', '#40483c', '#1e221c'],
  hobgob: ['#f8c08c', '#e09a66', '#c67e4c', '#a8623a', '#84482c', '#5a3022', '#2a1410'],
  // B20, Thistlewood Burrow (appended). Packed earth, warm umber in the light and cool violet-brown
  // in its shadows, so a lantern's pool reads warm against the burrow's cold dark.
  soil: ['#ecc896', '#c89c6a', '#a27a52', '#7e5c42', '#5c4436', '#3e2e2c', '#1e1418'],
  // The paler, greyer beds of clay between the soil's, and the stones in them.
  clay: ['#eedcb0', '#d0ba8c', '#ae9a72', '#8a7a5e', '#68604e', '#48423c', '#22201e'],
  // Roots: pale, fibrous, lighter than the earth they run through.
  root: ['#f6e6c4', '#dcc29a', '#b89c74', '#927a5a', '#6e5a46', '#4a3c34', '#221a18'],
  // Fungus that glows in the dark: a cool blue-green light, never shifted and never dimmed by the
  // dark (`NIGHT_EXEMPT`), distinct from a lantern's warmth.
  glowcap: ['#f4fffc', '#c2fff2', '#7ef4e0', '#46d4c8', '#2ea4a8', '#22727e', '#103644'],
  // Leaf litter blown down the tunnels: dun and olive (floors never red or orange).
  litter: ['#f0e4ac', '#d0c084', '#ac9a60', '#887848', '#665a38', '#463e2c', '#221e16'],
  // The badger king's flagstones: worn grey-green stone.
  flag: ['#e4e4d4', '#c4c6b4', '#a2a694', '#828878', '#646a60', '#484e4a', '#22262a'],
  // The cast: the spore puff's pale puffball skin, the cap folk's stalk, the bramble hound's briar,
  // the moth's dusky wings, the badger's coat.
  puff: ['#fbf8f2', '#ebe4dc', '#d4ccc4', '#b4aaa6', '#8e8488', '#665c66', '#302a34'],
  stalk: ['#fbfaf4', '#ece8dc', '#d6d0c0', '#b8b0a0', '#928a80', '#686068', '#322c34'],
  briar: ['#ccd496', '#9ca868', '#72824a', '#56643c', '#3e4a30', '#2a3424', '#121a10'],
  mothwing: ['#fffaf0', '#ece2d2', '#d2c4b0', '#b2a290', '#8c7c70', '#625458', '#2e2630'],
  badger: ['#aaa6b2', '#7e7a8a', '#605c6c', '#4a4656', '#383442', '#26222e', '#121018'],
  // The puffs' spores: a sulphur green that glows faintly, so a cloud reads in the dark too (never
  // shifted, never dimmed), and is told from the fungus's cold blue-green and every warning's red.
  spore: ['#fbffd8', '#eef6a0', '#d4e470', '#b4c852', '#8ea640', '#667c34', '#323e1c'],
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
const EXEMPT: readonly CaveMat[] = ['ember', 'glowcap', 'spore'];

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
  /**
   * B20: what tells it apart from the other palettes of its time of day in a
   * sprite's cache key (`spriteCanvas`), for a palette whose colours differ
   * from `CAVE_DUSK`'s (the Burrow's night levels). Absent: the time's name.
   */
  readonly key?: string;
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

/**
 * The tide-pool cave (B15): a shallow sea cave open to daylight, so it is
 * painted by day, not at dusk. Every town colour is the town's by day
 * (`DAY2`), so the hero from `characterSprite2(look, worn, 'day')` and every
 * foe read as they do in the sun; the cave's own ramps take the day shift.
 */
export const CAVE_TIDEPOOL: CavePalette = cavePalette(DAY2);

/* ------------------------------------------------------- the Burrow's night (B20) */

/**
 * Thistlewood Burrow is played dark: lit only in lanterns' pools. Its palette
 * in the light (`CAVE_BURROW`) is the dungeon's dusk (`CAVE_DUSK`, so the
 * hero and every figure are as at dusk in town); its **night ramp**
 * (`CAVE_BURROW_DARK`) is the same cells taken down to the dark: each colour
 * desaturated by `NIGHT.grey`, scaled by `NIGHT.keep` and lifted by a cold
 * blue-green floor (`NIGHT.floor`), so a dark room keeps every material's
 * steps in order (its forms) and its hue a little, never flat black, while
 * its detail sinks together. Lights themselves (`NIGHT_EXEMPT`: flame, lamp,
 * ember, glowing fungus) keep their colour in the dark.
 *
 * **The rule, in whole palette steps** (`burrowNight(level)`), by how far into
 * a lantern's pool a pixel is (`u`: 0 its middle, 1 its edge, as the
 * pools' rings, edges ragged; `BURROW_DARK_BANDS`):
 *
 * | level | where (`u`)              | colour of a cell at step `t`               |
 * | ----- | ------------------------ | ------------------------------------------ |
 * | 0     | in a pool (`u < 1`)      | `CAVE_BURROW` at `t` (the light's own)      |
 * | 1     | its edge (`1 ≤ u < 1.5`) | `CAVE_BURROW_DARK` at `t − 2` (twilight)    |
 * | 2     | the dark (`u ≥ 1.5`)     | `CAVE_BURROW_DARK` at `t`                   |
 * | 3     | far dark (`u ≥ 2.2`)     | `CAVE_BURROW_DARK` at `t + 1`               |
 *
 * A step stays within 0 to 5 (the line, 6, stays the line, at each level's
 * own palette). The edge is the night ramp lifted, not the light darkened:
 * the warm light's own lower steps read as a red stain round each pool, the
 * cold twilight reads as light failing. Each level is a whole palette, so a scene paints a pixel by
 * looking its cell up in that level's palette: no blending, no grey wash, and
 * a figure in the dark is its sprite in `burrowNight(2)`.
 */
export const NIGHT = {
  /** How much of a colour's own saturation the dark keeps. */
  grey: 0.5,
  /** How much of its brightness. */
  keep: 0.34,
  /** The cold floor added to every colour in the dark: no pixel is ever black. */
  floor: [9, 15, 22] as const,
} as const;

/** Where each level of the dark begins, in pools' half-widths from their middle (`u`). */
export const BURROW_DARK_BANDS = [1, 1.5, 2.2] as const;

/** Lights in the dark: these keep their colour at every level (flame, lamp, ember, the glowing fungus and spores). */
export const NIGHT_EXEMPT: readonly Mat2[] = ['fire', 'lamp', 'ember', 'glowcap', 'spore'];

/** A colour in the dark, by `NIGHT`. */
export function nightRgb(r: number, g: number, b: number): [number, number, number] {
  const L = 0.299 * r + 0.587 * g + 0.114 * b;
  const f = (c: number, i: number) =>
    Math.round(Math.min(255, (L + (c - L) * NIGHT.grey) * NIGHT.keep + NIGHT.floor[i]!));
  return [f(r, 0), f(g, 1), f(b, 2)];
}

const exemptIds = (): Set<number> => new Set(NIGHT_EXEMPT.map((m) => cell(m, 0) >> 3));

/**
 * A palette whose every cell (material, step) takes the colour of the same
 * material at `step + shift` in `from`, the line kept, lights kept as lit.
 */
function stepped(
  from: CavePalette,
  shift: number,
  key: string,
  lit: CavePalette = from,
): CavePalette {
  const rgb = new Uint8Array(from.rgb.length);
  const keepLit = exemptIds();
  const ids = from.rgb.length / 24;
  for (let id = 0; id < ids; id++)
    for (let t = 0; t < 8; t++) {
      const to = t >= 6 ? t : Math.max(0, Math.min(5, t + shift));
      const src = keepLit.has(id) ? lit : from;
      const s = keepLit.has(id) ? t : to;
      rgb.set(src.rgb.subarray((id * 8 + s) * 3, (id * 8 + s) * 3 + 3), (id * 8 + t) * 3);
    }
  return { ...from, rgb, key };
}

/** Thistlewood Burrow in the light (B20): the dungeon's dusk, as the hero and every figure are drawn. */
// The same colours as `CAVE_DUSK` (so its sprites are shared with the dusk's in the cache).
export const CAVE_BURROW: CavePalette = cavePalette(DUSK2);

/** Thistlewood Burrow's night ramp (B20): every cell of `CAVE_BURROW` in the dark (`NIGHT`). */
export const CAVE_BURROW_DARK: CavePalette = (() => {
  const rgb = new Uint8Array(CAVE_BURROW.rgb.length);
  const keepLit = exemptIds();
  for (let i = 0; i < rgb.length; i += 3) {
    const id = Math.floor(i / 24);
    const [r, g, b] = keepLit.has(id)
      ? [CAVE_BURROW.rgb[i]!, CAVE_BURROW.rgb[i + 1]!, CAVE_BURROW.rgb[i + 2]!]
      : nightRgb(CAVE_BURROW.rgb[i]!, CAVE_BURROW.rgb[i + 1]!, CAVE_BURROW.rgb[i + 2]!);
    rgb[i] = r;
    rgb[i + 1] = g;
    rgb[i + 2] = b;
  }
  const cave = Object.fromEntries(
    CAVE_MATS.map((m) => [
      m,
      CAVE_BURROW.cave[m].map((_hex, t) => {
        const o = (CAVE_ID[m] * 8 + t) * 3;
        return `#${[rgb[o]!, rgb[o + 1]!, rgb[o + 2]!].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
      }),
    ]),
  ) as unknown as Record<CaveMat, readonly string[]>;
  return { ...CAVE_BURROW, rgb, cave, key: 'burrow-dark' };
})();

/** How many levels of the dark `burrowNight` has (0 the light, 3 the far dark). */
export const BURROW_NIGHT_LEVELS = 4;

const NIGHT_LEVELS: readonly CavePalette[] = [
  CAVE_BURROW,
  stepped(CAVE_BURROW_DARK, -2, 'burrow-edge', CAVE_BURROW_DARK),
  CAVE_BURROW_DARK,
  stepped(CAVE_BURROW_DARK, 1, 'burrow-far', CAVE_BURROW_DARK),
];

/**
 * The Burrow's palette at a level of the dark (0 to 3; the rule above
 * `NIGHT`): paint a pixel at that level by looking its cell up in it. Out of
 * range is clamped.
 */
export function burrowNight(level: number): CavePalette {
  const l = Math.max(0, Math.min(3, Math.floor(Number.isFinite(level) ? level : 0)));
  return NIGHT_LEVELS[l]!;
}

/** The cave palette for a time of day. */
export const cavePaletteFor = (time: 'day' | 'dusk'): CavePalette =>
  time === 'day' ? CAVE_DAY : CAVE_DUSK;

/**
 * The C-scale town's colours, named once. Taken from the approved scale study
 * (study/scale-detail/ramps.ts, option C): the approved ramps stretched to six
 * steps and a line step each, lights leaning warm and shadows leaning cool,
 * put through the game's own day and dusk shifts (src/art/palette.ts) so the
 * new town keeps the approved palette's character. Ramps the study did not
 * need (sea, sand, moss, leaves, bark, rock, sails, a ship's tarred wood, the
 * house's limewash, smoke, fire, unlit panes) are new here, built the same way.
 *
 * Step 0 is a glint or sunlit edge, 1-2 the lit side, 3-4 the shadow side, 5
 * the deepest shadow and 6 the line drawn round that material (the outline
 * rule: each thing is outlined in its own darkest tone, never one ink).
 *
 * Nothing in the live game reads this file; the current town keeps its own
 * palette until the swap.
 */
import { DAY_SHIFT, DUSK_SHIFT, rgbOf, shift } from '../palette';

/** Base colours, lightest first, before the day or dusk shift. */
const BASE = {
  // Walls and roofs.
  plaster: ['#fffaea', '#f6ead0', '#e9d9b8', '#d4bf9b', '#b09888', '#84727c', '#463a50'],
  limewash: ['#fff8de', '#fbe9b8', '#f0d698', '#dbba7e', '#b4906a', '#86685e', '#40303a'],
  stone: ['#e6eaee', '#c6ccd4', '#a6adba', '#8b93a6', '#6e7590', '#50566e', '#2a2c42'],
  tile: ['#f69a76', '#e46e56', '#cc4c46', '#aa3640', '#842a3e', '#5c1e38', '#30102a'],
  slate: ['#b8c6e2', '#8e9ec0', '#6e80a8', '#5a6a94', '#465282', '#343c66', '#1a1e3c'],
  thatch: ['#fff0b4', '#ecd28a', '#d4b066', '#b48c50', '#8c6a44', '#644a3c', '#30222a'],
  moss: ['#eef4a0', '#cede74', '#aec258', '#8ea446', '#6c863c', '#4c6434', '#263420'],
  // Timber, paint and metal.
  wood: ['#f4c888', '#d89c5c', '#b4743f', '#8e5634', '#6a3c2a', '#4a2824', '#261218'],
  tar: ['#9c8070', '#76604e', '#5a4640', '#463434', '#34262c', '#241a22', '#120a12'],
  teal: ['#86d0ae', '#4aa088', '#2f7a6a', '#246462', '#1c4c54', '#163646', '#0c1a28'],
  blue: ['#c0dcff', '#8ab2ee', '#5f8edc', '#4c70c4', '#3c50a0', '#2c3474', '#161840'],
  crimson: ['#f4886a', '#d85a50', '#b8323c', '#962842', '#742042', '#4e1838', '#280a22'],
  gold: ['#fffbd0', '#ffe27a', '#ffc847', '#d99a2b', '#a8682a', '#704032', '#381c20'],
  iron: ['#d0d8e2', '#96a0b4', '#6e768c', '#545a70', '#3e4058', '#2a2a3e', '#16142a'],
  linen: ['#fbf2d8', '#e8dab6', '#d3c39e', '#b3a37e', '#8e7e66', '#665854', '#322636'],
  sail: ['#fffaee', '#f2e8d0', '#e2d4b4', '#c8b894', '#a69478', '#7a6a5c', '#3c3036'],
  // Glass: `glass` is a window that is lit at dusk, `pane` one that stays dark.
  glass: ['#f0f8ff', '#b0cee8', '#84a8cc', '#5c82aa', '#3e5f88', '#2a4066', '#16203a'],
  pane: ['#f0f8ff', '#b0cee8', '#84a8cc', '#5c82aa', '#3e5f88', '#2a4066', '#16203a'],
  lamp: ['#fffde8', '#fff2c0', '#ecdc9c', '#cfc0a0', '#a89478', '#7a6858', '#3a2c30'],
  fire: ['#ffffff', '#fff2a0', '#ffd34d', '#ff9a30', '#e8582a', '#a83020', '#4a1010'],
  smoke: ['#ffffff', '#eef0f4', '#d8dce4', '#bcc0cc', '#9ea2b0', '#7a7e8e', '#3c3e4c'],
  // Ground.
  grass: ['#c8ee88', '#9edb6c', '#7cc458', '#60a84c', '#468a48', '#306a44', '#183c2e'],
  dirt: ['#f2dca2', '#e2c486', '#c9a46a', '#a88456', '#86654a', '#604640', '#30222a'],
  cobble: ['#e4dcc8', '#cac0ac', '#b0a692', '#958c7e', '#79726c', '#5a555c', '#343240'],
  sand: ['#fff4cc', '#f6e2a8', '#e9cd8c', '#d4b070', '#b48c58', '#86644a', '#40302a'],
  rock: ['#dcd6cc', '#b8b0a6', '#948e8a', '#747072', '#56545e', '#3a3a48', '#1c1c28'],
  sea: ['#f2fdff', '#9fe4f4', '#6fd0ec', '#46b0e0', '#2e8ccc', '#22669e', '#123a5e'],
  // Living things.
  pine: ['#8ec872', '#5caa66', '#3e8c58', '#2c6e4e', '#205444', '#163c38', '#0a2026'],
  leaf: ['#d8f094', '#aad66c', '#82bc54', '#5f9e46', '#46803e', '#2f5e38', '#163024'],
  bark: ['#c8b8a4', '#a4907c', '#84705e', '#66544a', '#4c3e3a', '#342a2c', '#1a1418'],
  flower: ['#ffffff', '#ffe27a', '#ff9a8a', '#e05a6a', '#a84a8a', '#6a3a7a', '#301838'],
  // The deepest dark that is not a line: a doorway, the inside of a forge.
  shade: ['#3a2a30', '#2a1c22', '#22161e', '#1c121a', '#160e16', '#120a12', '#0c060c'],
} as const satisfies Record<string, readonly string[]>;

export type Mat = keyof typeof BASE;
export const MATS = Object.keys(BASE) as Mat[];

/** Steps in every ramp: six and the line. */
export const STEPS = 7;

/** Ramps that never shift: fire looks like fire at any hour. */
const EXEMPT: readonly Mat[] = ['fire'];

/**
 * Dusk's hand-set steps. Windows that light up and lamps are lights, so at
 * dusk they are lit rather than shifted (warm, brightest at the glass's
 * reflection band, a deep amber where the reveal shades it). The sea is set
 * by hand: shifted, it stays a bright daylight blue beside the plum-dark land,
 * so it is muted toward slate, its foam catching the last light. Gold's glint
 * and the sails' light are kept bright; shifted they go muddy, as the mock-up
 * found for its own highlights.
 */
const DUSK_SET: Partial<Record<Mat, readonly (string | null)[]>> = {
  glass: ['#fffbe0', '#fff0b0', '#ffe48a', '#ffd46a', '#f4b04c', '#b8683a', '#3a1c24'],
  lamp: ['#ffffff', '#fff6c8', '#ffe89a', '#ffd470', '#d8a050', '#8a5a40', '#3a2028'],
  sea: ['#e8b8a0', '#7a98c0', '#5a7eac', '#47689c', '#385688', '#2b4270', '#141c3a'],
  gold: ['#ffefb0', '#ffcf5a', null, null, null, null, null],
  sail: ['#e6d4d0', '#cdb8c0', null, null, null, null, null],
};

export interface Palette2 {
  readonly name: 'day' | 'dusk';
  /** Whether evening lights (lit windows, lamps, the forge's full glow) shine. */
  readonly lightsOn: boolean;
  /** Each material's seven steps as colours. */
  readonly colours: Readonly<Record<Mat, readonly string[]>>;
  /** The same as RGB, indexed by cell (material id * 8 + step); see cells.ts. */
  readonly rgb: Uint8Array;
}

function makePalette(name: Palette2['name']): Palette2 {
  const by = name === 'day' ? DAY_SHIFT : DUSK_SHIFT;
  const colours = {} as Record<Mat, readonly string[]>;
  const rgb = new Uint8Array((MATS.length + 1) * 8 * 3);
  MATS.forEach((m, i) => {
    const set = name === 'dusk' ? DUSK_SET[m] : undefined;
    const steps = (BASE[m] as readonly string[]).map(
      (hex, t) => set?.[t] ?? (EXEMPT.includes(m) ? hex : shift(hex, by)),
    );
    colours[m] = steps;
    steps.forEach((hex, t) => rgb.set(rgbOf(hex), ((i + 1) * 8 + t) * 3));
  });
  return { name, lightsOn: name === 'dusk', colours, rgb };
}

export const DAY2: Palette2 = makePalette('day');
export const DUSK2: Palette2 = makePalette('dusk');
export const PALETTES2: readonly Palette2[] = [DAY2, DUSK2];

/** The time of day a town is composed for: dusk's shadows are longer. */
export type TimeOfDay = Palette2['name'];
export const paletteFor = (time: TimeOfDay): Palette2 => (time === 'day' ? DAY2 : DUSK2);

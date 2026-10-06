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

  // Figures (B8, src/art/figure2/), appended so every cell above keeps its number.
  // Skin: the approved light at step 1 and shadow at step 3, the mouth and the
  // shadow under the jaw at 4; each tone's shadow leans warmer than its light.
  skin: ['#fff1dc', '#f8cda4', '#ecb68e', '#e0a27c', '#b86e5c', '#86484c', '#40202e'],
  skinpale: ['#fffaf4', '#ffe6d2', '#f6cdb6', '#eeb49c', '#c47a70', '#8e4c56', '#482030'],
  skingolden: ['#f0c896', '#d9a06c', '#c6864f', '#b06c40', '#8a4a30', '#5e2e26', '#2e1418'],
  skinbrown: ['#c8926a', '#ac7450', '#985e3e', '#83492e', '#683426', '#48201e', '#220e10'],
  skindeep: ['#a26e52', '#7e4e38', '#6c3e2c', '#5a3020', '#46221a', '#301412', '#18080a'],
  // Hair: the approved light, mid and dark at steps 2, 4 and 5. Auburn is
  // deeper and redder than the study's, which sat on golden skin at the same
  // value and lost the face's edge.
  hair: ['#a07a5c', '#7c5a46', '#5a4038', '#46302e', '#33222a', '#241620', '#140a14'],
  hairblack: ['#8a8ca8', '#6a6a84', '#4a4a60', '#3a3848', '#2a2834', '#16141c', '#0a080e'],
  hairblonde: ['#fffbe0', '#fff0b8', '#f6dc96', '#e6c47a', '#d4aa5e', '#9c7036', '#583a20'],
  auburn: ['#f4a070', '#d8704a', '#b8503a', '#9a3e30', '#7c3028', '#58201e', '#2c0c0e'],
  hairgrey: ['#ffffff', '#f2eee8', '#e2dcd6', '#c8c0ba', '#ada59e', '#78706c', '#3c3640'],
  chestnut: ['#d8906a', '#b8704a', '#9a5434', '#844428', '#6e3420', '#481e16', '#240c0c'],
  // Brows are drawn in this and take a hair colour's ramp, at the step that shows on the skin.
  brow: ['#a07a5c', '#7c5a46', '#5a4038', '#46302e', '#33222a', '#241620', '#140a14'],
  // Eyes: 0-1 the whites, 2-3 the iris, 4 the lashes. Whites are set by hand at dusk.
  eye: ['#ffffff', '#f2ece6', '#4a84cc', '#2c4c8c', '#1a1224', '#1a1224', '#1a1224'],
  // The knight's polished plate, brighter and bluer than iron.
  plate: ['#ffffff', '#eef1ee', '#c3cdda', '#97a3bb', '#6b7696', '#474d6e', '#242640'],
  leather: ['#c89466', '#a06e48', '#7c5036', '#5e3a2c', '#462a28', '#301c22', '#180c14'],
  cloth: ['#a2a4b8', '#7e8098', '#62647e', '#4c4c66', '#3a3a54', '#2a2a40', '#141426'],
  // Bronze leans yellow-olive, away from every skin tone, duller and greener
  // than gold; its glint is pale and cool. Set by hand at dusk, or it goes the
  // plum-brown of skin. Hide is the cool leather it sits on.
  bronze: ['#fbfae6', '#efe6b4', '#d2c27a', '#bba04e', '#957e3c', '#6a5830', '#2e2614'],
  hide: ['#b8a494', '#958070', '#7c685c', '#64524a', '#52423c', '#40342e', '#201816'],
  // Leather, the hunter's tan: yellow-leaning, kept off skin; set by hand at dusk.
  tan: ['#e4c48a', '#c8a066', '#ae844c', '#94683a', '#76502c', '#584020', '#2a1e10'],
  // Townsfolk's dyed wool and work linen, each kept apart from skin and from linen.
  mossdye: ['#c4c87a', '#a0a65c', '#7e8a48', '#62703e', '#4a5634', '#323c2a', '#181e16'],
  madder: ['#f0a090', '#d07868', '#b05a52', '#904448', '#6e3240', '#4a2234', '#24101c'],
  ochre: ['#fff0a0', '#f0cc68', '#d8a848', '#b88638', '#90642e', '#644226', '#301c14'],
  umber: ['#c09878', '#9c7458', '#7c5844', '#624436', '#4a322c', '#322226', '#180e12'],
  indigo: ['#a8b8dc', '#7a90c0', '#5a70a4', '#465888', '#36446c', '#262e50', '#121628'],
  // A work cream for aprons and shirts, a step duller than the study's.
  cream: ['#fbf4e4', '#ece0c8', '#dccdb0', '#c4b294', '#a08e7a', '#74646a', '#382e38'],
  violet: ['#d4c4e2', '#ac94c8', '#8e76ac', '#765e92', '#5c4676', '#403054', '#1e1430'],
  plum: ['#e8a8c8', '#c47aa6', '#a2588c', '#844276', '#66305e', '#462044', '#200e22'],
  midnight: ['#aca4d8', '#8478c0', '#6a5ea4', '#544888', '#40366c', '#2c2450', '#140e2c'],
  felt: ['#8a8698', '#5e5a6c', '#46424f', '#34303c', '#26222c', '#1a1620', '#0c0a10'],
  // Shells are cream and rose, never peach; set by hand at dusk like the whites of eyes.
  shell: ['#ffffff', '#f6f2ec', '#ead8dc', '#d8a2b4', '#b07e90', '#80586a', '#402834'],
  pinewood: ['#fff0b0', '#f0d08a', '#dab06a', '#c4964e', '#9a703a', '#6c4c2c', '#342414'],
  willow: ['#fbf8ee', '#e4ddcc', '#c8c0ac', '#aca390', '#8a8270', '#625c50', '#302c28'],
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
  // Figures (B8): the whites of eyes and the knight's polish still catch the
  // last light; bronze, tan and shells are set by hand at every step, as in
  // the current palette, or they go the plum-brown of skin.
  eye: ['#f4ecf4', '#ddd0de', null, null, null, null, null],
  plate: ['#f2ecf8', '#d4d0e2', null, null, null, null, null],
  bronze: ['#f2ecd8', '#e2d6a2', '#bcad6c', '#94804a', '#76663a', '#544a2e', '#26200f'],
  tan: ['#c8b07c', '#a88c5a', '#8e7046', '#745832', '#5c4426', '#463a24', '#201a0e'],
  shell: ['#f6eef2', '#ece4e6', '#d4c4cc', '#a07a8c', '#84607a', '#604458', '#30202a'],
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

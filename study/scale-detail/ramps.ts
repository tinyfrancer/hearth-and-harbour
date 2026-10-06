/**
 * Art study (not shipped): the approved ramps stretched to six steps plus an
 * outline step each, hue-shifted so lights lean warm (toward yellow) and
 * shadows lean cool (toward blue-violet). Every ramp keeps the approved base
 * colours (src/art/palette.ts) as its middle steps and adds a step either side
 * and one between, then goes through the same day shift as the game, so the
 * picture keeps the approved palette's character.
 *
 * Step 0 is a highlight (glints, sunlit edges), 1-2 light, 3-4 shadow, 5 the
 * deepest shadow and 6 the line colour drawn round that material.
 */
import { DAY_SHIFT, shift } from '../../src/art/palette';

const BASE = {
  skin: ['#fff1dc', '#f8cda4', '#ecb68e', '#e0a27c', '#b86e5c', '#86484c', '#40202e'],
  skinb: ['#e2aa7c', '#c48a5e', '#ac7450', '#93603e', '#7a4632', '#582c28', '#2c1218'],
  hair: ['#a07a5c', '#7c5a46', '#5a4038', '#46302e', '#33222a', '#241620', '#140a14'],
  plate: ['#ffffff', '#eef1ee', '#c3cdda', '#97a3bb', '#6b7696', '#474d6e', '#242640'],
  teal: ['#86d0ae', '#4aa088', '#2f7a6a', '#246462', '#1c4c54', '#163646', '#0c1a28'],
  crimson: ['#f4886a', '#d85a50', '#b8323c', '#962842', '#742042', '#4e1838', '#280a22'],
  blue: ['#c0dcff', '#8ab2ee', '#5f8edc', '#4c70c4', '#3c50a0', '#2c3474', '#161840'],
  gold: ['#fffbd0', '#ffe27a', '#ffc847', '#d99a2b', '#a8682a', '#704032', '#381c20'],
  leather: ['#c89466', '#a06e48', '#7c5036', '#5e3a2c', '#462a28', '#301c22', '#180c14'],
  cloth: ['#a2a4b8', '#7e8098', '#62647e', '#4c4c66', '#3a3a54', '#2a2a40', '#141426'],
  linen: ['#fbf2d8', '#e8dab6', '#d3c39e', '#b3a37e', '#8e7e66', '#665854', '#322636'],
  eye: ['#ffffff', '#f2ece6', '#4a84cc', '#2c4c8c', '#1a1224', '#1a1224', '#1a1224'],
  wood: ['#f4c888', '#d89c5c', '#b4743f', '#8e5634', '#6a3c2a', '#4a2824', '#261218'],
  plaster: ['#fffaea', '#f6ead0', '#e9d9b8', '#d4bf9b', '#b09888', '#84727c', '#463a50'],
  stone: ['#e6eaee', '#c6ccd4', '#a6adba', '#8b93a6', '#6e7590', '#50566e', '#2a2c42'],
  tile: ['#f69a76', '#e46e56', '#cc4c46', '#aa3640', '#842a3e', '#5c1e38', '#30102a'],
  slate: ['#b8c6e2', '#8e9ec0', '#6e80a8', '#5a6a94', '#465282', '#343c66', '#1a1e3c'],
  dirt: ['#f2dca2', '#e2c486', '#c9a46a', '#a88456', '#86654a', '#604640', '#30222a'],
  cobble: ['#e4dcc8', '#cac0ac', '#b0a692', '#958c7e', '#79726c', '#5a555c', '#343240'],
  grass: ['#c8ee88', '#9edb6c', '#7cc458', '#60a84c', '#468a48', '#306a44', '#183c2e'],
  pine: ['#8ec872', '#5caa66', '#3e8c58', '#2c6e4e', '#205444', '#163c38', '#0a2026'],
  glass: ['#f0f8ff', '#b0cee8', '#84a8cc', '#5c82aa', '#3e5f88', '#2a4066', '#16203a'],
  iron: ['#d0d8e2', '#96a0b4', '#6e768c', '#545a70', '#3e4058', '#2a2a3e', '#16142a'],
  lamp: ['#fffde8', '#fff2c0', '#ecdc9c', '#cfc0a0', '#a89478', '#7a6858', '#3a2c30'],
  flower: ['#ffffff', '#ffe27a', '#ff9a8a', '#e05a6a', '#a84a8a', '#6a3a7a', '#301838'],
  shade: ['#3a2a30', '#2a1c22', '#22161e', '#1c121a', '#160e16', '#120a12', '#0c060c'],
  ink: ['#1a1224', '#1a1224', '#1a1224', '#1a1224', '#1a1224', '#1a1224', '#1a1224'],
  // Round two (figures): the character creator's other looks, stretched the
  // same way. Skin keeps the approved light at step 1 and shadow at step 3;
  // hair keeps the approved light, mid and dark at steps 2, 4 and 5, like `hair`.
  skinpale: ['#fffaf4', '#ffe6d2', '#f6cdb6', '#eeb49c', '#c47a70', '#8e4c56', '#482030'],
  skingolden: ['#f0c896', '#d9a06c', '#c6864f', '#b06c40', '#8a4a30', '#5e2e26', '#2e1418'],
  skinbrown: ['#c8926a', '#ac7450', '#985e3e', '#83492e', '#683426', '#48201e', '#220e10'],
  skindeep: ['#a26e52', '#7e4e38', '#6c3e2c', '#5a3020', '#46221a', '#301412', '#18080a'],
  hairblack: ['#8a8ca8', '#6a6a84', '#4a4a60', '#3a3848', '#2a2834', '#16141c', '#0a080e'],
  hairblonde: ['#fffbe0', '#fff0b8', '#f6dc96', '#e6c47a', '#d4aa5e', '#9c7036', '#583a20'],
  auburn: ['#ffc890', '#f4a868', '#e08a4a', '#cc6e3a', '#b8562e', '#86381e', '#441810'],
  hairgrey: ['#ffffff', '#f2eee8', '#e2dcd6', '#c8c0ba', '#ada59e', '#78706c', '#3c3640'],
  chestnut: ['#d8906a', '#b8704a', '#9a5434', '#844428', '#6e3420', '#481e16', '#240c0c'],
  // Townsfolk's cloth: dyed wool and work linen, each kept apart from skin and from linen.
  moss: ['#c4c87a', '#a0a65c', '#7e8a48', '#62703e', '#4a5634', '#323c2a', '#181e16'],
  madder: ['#f0a090', '#d07868', '#b05a52', '#904448', '#6e3240', '#4a2234', '#24101c'],
  ochre: ['#fff0a0', '#f0cc68', '#d8a848', '#b88638', '#90642e', '#644226', '#301c14'],
  umber: ['#c09878', '#9c7458', '#7c5844', '#624436', '#4a322c', '#322226', '#180e12'],
  indigo: ['#a8b8dc', '#7a90c0', '#5a70a4', '#465888', '#36446c', '#262e50', '#121628'],
  cream: ['#ffffff', '#fbf6ec', '#ece2d2', '#d4c6b4', '#ae9e96', '#786a74', '#3a3040'],
  brown: ['#a07a5c', '#7c5a46', '#5a4038', '#46302e', '#33222a', '#241620', '#140a14'],
} as const satisfies Record<string, readonly string[]>;

export type Mat = keyof typeof BASE;
export const MATS = Object.keys(BASE) as Mat[];

/** Every material's seven steps after the game's day shift; ink is the game's day ink. */
export const COLOURS: Readonly<Record<Mat, readonly string[]>> = Object.fromEntries(
  MATS.map((m) => [
    m,
    m === 'ink' ? BASE.ink : (BASE[m] as readonly string[]).map((hex) => shift(hex, DAY_SHIFT)),
  ]),
) as unknown as Record<Mat, readonly string[]>;

/** How auto shading treats a material: its flat step, contrast, step range, bevel and glint. */
export interface MatLook {
  readonly base: number;
  readonly k: number;
  readonly min: number;
  readonly max: number;
  /** Bevel radius in art pixels: how far in from an edge the surface still curves. */
  readonly R: number;
  /** Above this light level a pixel takes step 0, a glint. Metals only. */
  readonly spec?: number;
  /** How strongly a polished surface mirrors bright sky above and dark ground below. */
  readonly env?: number;
}

const look = (base: number, k: number, R: number, min = 1, max = 5, spec?: number): MatLook => ({
  base,
  k,
  min,
  max,
  R,
  spec,
});

export const LOOKS: Readonly<Record<Mat, MatLook>> = {
  skin: look(1.55, 1.25, 3, 1, 4),
  skinb: look(1.55, 1.25, 3, 1, 4),
  hair: look(2.2, 1.5, 3, 0, 5),
  plate: { ...look(2.0, 2.0, 2, 1, 5, 0.9), env: 1.1 },
  teal: look(2.0, 1.45, 2.5),
  crimson: look(2.2, 1.45, 3),
  blue: look(2.0, 1.35, 5),
  gold: look(2.0, 1.6, 1.5, 1, 5, 0.92),
  leather: look(2.0, 1.45, 2),
  cloth: look(2.0, 1.4, 2),
  linen: look(1.9, 1.35, 3),
  eye: look(1, 0, 1, 0, 6),
  wood: look(2.0, 1.4, 2),
  plaster: look(2, 1, 2),
  stone: look(2, 1, 2),
  tile: look(2, 1, 2),
  slate: look(2, 1, 2),
  dirt: look(2, 1, 2),
  cobble: look(2, 1, 2),
  grass: look(2, 1, 2),
  pine: look(2, 1.4, 3),
  glass: look(2, 1, 2),
  iron: look(2.0, 1.6, 1.5, 1, 5, 0.92),
  lamp: look(1, 1, 2),
  flower: look(2, 1, 1),
  shade: look(1, 0, 1),
  ink: look(0, 0, 1, 0, 0),
  skinpale: look(1.55, 1.25, 3, 1, 4),
  skingolden: look(1.55, 1.25, 3, 1, 4),
  skinbrown: look(1.55, 1.25, 3, 1, 4),
  skindeep: look(1.55, 1.25, 3, 1, 4),
  hairblack: look(2.2, 1.5, 3, 0, 5),
  hairblonde: look(2.2, 1.5, 3, 0, 5),
  auburn: look(2.2, 1.5, 3, 0, 5),
  hairgrey: look(2.2, 1.5, 3, 0, 5),
  chestnut: look(2.2, 1.5, 3, 0, 5),
  moss: look(2, 1.4, 2),
  madder: look(2, 1.4, 2),
  ochre: look(2, 1.4, 2),
  umber: look(2, 1.4, 2),
  indigo: look(2, 1.4, 2),
  cream: look(2, 1.4, 2),
  brown: look(2, 1.4, 2),
};

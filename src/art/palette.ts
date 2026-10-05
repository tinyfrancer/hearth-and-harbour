/**
 * Every colour the art uses, named once. Harvested from the approved mock-up
 * (docs/art-reference/town-mockup.html): its base colours, its colour shift
 * and its day and dusk palettes, regrouped as ramps of named steps.
 *
 * Drawings never hold colours. They hold steps ('wood2'), and a palette turns
 * steps into colours when the picture is shown, which is how dusk is the same
 * drawing as day. Nothing outside this file names a colour.
 */

/**
 * The base ramps, lightest step first, before the day or dusk shift. The first
 * block is the style guide's list; the rest are the mock-up's other colours,
 * grouped by what they are for.
 */
export const RAMPS = {
  grass: ['#93d667', '#74c256', '#58a548'],
  sand: ['#f6e2a8', '#e7c781', '#c9a062'],
  sea: ['#6fd6ee', '#3fb2e2', '#2a86c9'],
  wood: ['#d59a5a', '#b0703e', '#7a4a2c', '#52301e'],
  red: ['#d85a50', '#b8323c', '#8a2432'],
  plaster: ['#f3e6c8', '#d9c49c'],
  stone: ['#b9c0cc', '#8b93a6', '#626a80'],
  slate: ['#8494b8', '#5f6f94', '#414d6e'],
  cobble: ['#c2b9a6', '#9d9484', '#7a7268'],
  pine: ['#4a9a62', '#2f744e', '#1e523c'],
  skin: ['#f8cda4', '#e0a27c'],
  metal: ['#eef3f8', '#b9c6d6', '#7f8ca3'],
  gold: ['#ffd34d', '#d99a2b'],
  navy: ['#38426a', '#232a45'],
  fire: ['#ffe27a', '#ff8a30', '#d8442a'],

  // Outline ink. The base value is never shown: day and dusk each set their own.
  ink: ['#33203a'],
  // The deepest shadow that is not outline: soles, doorways, the inside of a forge.
  shade: ['#2a1c22'],
  white: ['#ffffff'],
  foam: ['#f2fdff'],
  glass: ['#7fa4c8', '#3d5f86'],
  lamp: ['#cfc6a4'],
  smoke: ['#c9ccd4'],
  sail: ['#eadfc4', '#c4b494'],
  flag: ['#1a1420'],
  hair: ['#5a4038', '#3a2a26', '#241816'],
  auburn: ['#e08a4a', '#b8562e', '#86381e'],
  beard: ['#4e3c36', '#2a1e1c'],
  lips: ['#d07a6a', '#a85048'],
  flush: ['#e89a80', '#d89a88'],
  eyes: ['#3a78c8', '#4a9a5a'],
  teal: ['#2f7a6a', '#1f5a50'],
  crimson: ['#b8323c', '#7c2030'],
  cloth: ['#4a4a5a'],
  leather: ['#3a2618'],
  blue: ['#7fa9ea', '#4c7fd0'],
  apron: ['#8a6a4a', '#6a4e36'],
  dress: ['#7a5aa0', '#5a407c'],

  // The character's looks (character.ts). A skin tone is light, shadow and
  // mouth; the first tone is `skin` with `lips2` for its mouth. A hair colour
  // is highlight, mid and shadow (brows too); the first is `hair`, and
  // `auburn` above is another.
  skinpale: ['#ffe6d2', '#eeb49c', '#b45a56'],
  skingolden: ['#d9a06c', '#b06c40', '#7a3a2c'],
  skinbrown: ['#ac7450', '#83492e', '#5a2a24'],
  skindeep: ['#7e4e38', '#5a3020', '#3a1a18'],
  hairblack: ['#4a4a60', '#2a2834', '#16141c'],
  hairblonde: ['#f6dc96', '#d4aa5e', '#9c7036'],
  hairchestnut: ['#9a5434', '#6e3420', '#481e16'],
  hairgrey: ['#e2dcd6', '#ada59e', '#78706c'],

  // Gear. Bronze leans yellow-olive, away from every skin tone's orange, with
  // a pale highlight so it reads as metal; it is greener and duller than gold
  // and warm against iron (`metal`). Hide is the militia's leather, a cool
  // brown that frames bronze and does not read as skin. Bronze's fifth step
  // is out of order on purpose: a polished glint brighter and cooler than its
  // first, for the edges and midribs of weapons, which in the armour's steps
  // alone read as yellow plastic. Shells are cream and rose, kept away from
  // every skin tone's peach.
  bronze: ['#efe6b4', '#bba04e', '#7a6532', '#473a22', '#fbfae6'],
  hide: ['#958070', '#64524a', '#40342e'],
  linen: ['#d8caa6', '#ad9d7a', '#7e705a'],
  shell: ['#f6f2ec', '#d8a2b4'],
  pinewood: ['#f0d08a', '#c4964e'],
  willow: ['#e4ddcc', '#aca390'],

  // Icons (icons.ts). Bark tells the three logs apart: pine's is the warm
  // `wood` ramp, oak's a grey-brown, willow's a grey-green.
  oakbark: ['#a08c78', '#73624f', '#4c3f36'],
  willowbark: ['#c2c49a', '#8e936c', '#5e6448'],
  // Raw fish are cool and silvery; cooked food is warm and browned, so the
  // two read apart at a glance whatever the fish.
  scales: ['#f2f6f6', '#bccdd2', '#7d97a4', '#4e6577'],
  herring: ['#6fa0b4', '#3f6a86'],
  cod: ['#cdbd8a', '#9a8a5c', '#655a3c'],
  shrimpraw: ['#dfe8e4', '#a2b8b6', '#64807e'],
  shrimp: ['#ffc8a8', '#f4825e', '#c4503e'],
  cooked: ['#f8d08a', '#e0974a', '#ab5d2f', '#6e3723'],
  // What ore is: a green crust and a red-gold glint on copper, rust on iron.
  verdigris: ['#8ee0b8', '#46a884'],
  copper: ['#f8a868', '#c8683a'],
  rust: ['#c87e58', '#9a5238', '#683226'],
  // Forage and the shells' shadows.
  sage: ['#c8d6b0', '#93ab84', '#60775c'],
  glowcap: ['#f2fff6', '#b4ecd6', '#70b4ac'],
  shelldark: ['#c4aeb0', '#8a6c74'],
  // Potions, one hue each: a green tonic, an amber draught, a pale glowing
  // tincture and a midnight-blue oil.
  tonic: ['#a8f070', '#58b848', '#2e7a3a'],
  draught: ['#ffd88a', '#e09a3a', '#a85e26'],
  tincture: ['#e4fffa', '#88e8e0', '#3aa8b8'],
  midnight: ['#8a7ad8', '#4a3c98', '#271f58'],
} as const satisfies Record<string, readonly string[]>;

export type RampName = keyof typeof RAMPS;

/** The ramps the style guide lists by name; the others came from the mock-up. */
export const GUIDE_RAMPS: readonly RampName[] = [
  'grass',
  'sand',
  'sea',
  'wood',
  'red',
  'plaster',
  'stone',
  'slate',
  'cobble',
  'pine',
  'skin',
  'metal',
  'gold',
  'navy',
  'fire',
];
type StepNumber = [1, 2, 3, 4, 5];
type StepsOf<R extends string, T extends readonly string[]> = {
  [K in keyof T]: K extends `${infer N extends 0 | 1 | 2 | 3 | 4}` ? `${R}${StepNumber[N]}` : never;
}[number];
/** One step of one ramp, named like 'wood2' (steps count from 1, lightest first). */
export type Shade = { [R in RampName]: StepsOf<R, (typeof RAMPS)[R]> }[RampName];

/** Every step, ramp by ramp, lightest first. */
export const SHADES: readonly Shade[] = (Object.keys(RAMPS) as RampName[]).flatMap((ramp) =>
  RAMPS[ramp].map((_, i) => `${ramp}${i + 1}` as Shade),
);

export function isShade(name: string): name is Shade {
  return (SHADES as readonly string[]).includes(name);
}

/** The base colour of a step, before any shift. */
export function baseColour(shade: Shade): string {
  const match = /^([a-z]+)(\d)$/.exec(shade);
  const ramp = RAMPS[match?.[1] as RampName] as readonly string[];
  return ramp[Number(match?.[2]) - 1] as string;
}

/** How a palette leans: multiply saturation and lightness, then mix toward a tint. */
export interface Shift {
  readonly saturation: number;
  readonly lightness: number;
  readonly tint: string;
  readonly amount: number;
}

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const rgbToHex = (rgb: readonly number[]): string =>
  '#' +
  rgb
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');

export function rgbOf(hex: string): [number, number, number] {
  return hexToRgb(hex);
}

/**
 * The mock-up's colour shift, kept to the letter so the palettes match the
 * approved picture exactly: through HSL, then a straight mix in RGB.
 */
export function shift(hex: string, by: Shift): string {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  let light = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hue /= 6;
  }
  sat = Math.min(1, sat * by.saturation);
  light = Math.max(0, Math.min(1, light * by.lightness));
  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  const channel = (t: number): number => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 0.5) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const tint = hexToRgb(by.tint);
  const out = [channel(hue + 1 / 3), channel(hue), channel(hue - 1 / 3)].map(
    (v, i) => v * 255 + ((tint[i] as number) - v * 255) * by.amount,
  );
  return rgbToHex(out);
}

/** The style guide's two shifts. */
export const DAY_SHIFT: Shift = {
  saturation: 1.05,
  lightness: 0.88,
  tint: '#2a1a4a',
  amount: 0.07,
};
export const DUSK_SHIFT: Shift = {
  saturation: 0.85,
  lightness: 0.62,
  tint: '#6a2a6a',
  amount: 0.2,
};

/** Ramps that never shift: fire looks like fire at any hour. */
const EXEMPT: readonly RampName[] = ['fire'];

export interface Palette {
  readonly name: 'day' | 'dusk';
  /** Whether evening lights (lit windows, lamps, lanterns) glow. */
  readonly lightsOn: boolean;
  readonly colours: Readonly<Record<Shade, string>>;
}

function makePalette(
  name: Palette['name'],
  by: Shift,
  lightsOn: boolean,
  fixed: Partial<Record<Shade, string>>,
): Palette {
  const colours = {} as Record<Shade, string>;
  for (const shade of SHADES) {
    const ramp = shade.replace(/\d$/, '') as RampName;
    colours[shade] = EXEMPT.includes(ramp) ? baseColour(shade) : shift(baseColour(shade), by);
  }
  return { name, lightsOn, colours: { ...colours, ...fixed } };
}

export const DAY: Palette = makePalette('day', DAY_SHIFT, false, { ink1: '#1a1224' });

/**
 * Dusk, with the mock-up's lit and kept-bright steps. Windows and lamps are
 * lights, so at dusk they are lit rather than shifted. The highlights (foam,
 * the sea's crests, gold, polished metal, the whites of eyes, sails) were
 * set by hand in the approved mock-up so they still catch the light instead
 * of going muddy. Bronze is set by hand at every step: shifted, it drifts
 * into the plum-brown of skin at dusk; kept olive, it stays metal. Shells
 * are pale things that catch the light, like the whites of eyes: shifted,
 * they go the orange of skin at dusk.
 */
export const DUSK: Palette = makePalette('dusk', DUSK_SHIFT, true, {
  ink1: '#150d20',
  glass1: '#fff2b0',
  glass2: '#ffd34d',
  lamp1: '#ffe08a',
  foam1: '#e8b8a0',
  sea1: '#b87488',
  gold1: '#ffcf5a',
  gold2: '#d99a2b',
  metal1: '#e6dcf0',
  bronze1: '#e6d898',
  bronze2: '#a08a4a',
  bronze3: '#6c6036',
  bronze4: '#3e3a28',
  bronze5: '#f2ecd8',
  shell1: '#ece4e6',
  shell2: '#b88aa0',
  white1: '#efe4f0',
  sail1: '#cdb8c0',
});

export const PALETTES: readonly Palette[] = [DAY, DUSK];

/** The warm light of an evening glow, added on top of the picture. */
export const GLOW_RGB: readonly [number, number, number] = [255, 170, 70];

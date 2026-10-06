/**
 * The five tab icons (B10b): one object each, in the item icons' hand (24 x
 * 24 with the outline, lit from the upper left, the game's ramps), chosen to
 * be told apart by silhouette at the size the tab bar shows them: crossed
 * tools for Skills, a strongbox for the Bank, the hero's head and shoulders
 * for Character, a house with a smoking chimney for the Town, a sealed scroll
 * for the Menu. Each comes in two states: lit for the tab that is open, and
 * muted toward the bar's grey for the others, so the open tab reads at a
 * glance the way its gold label does.
 */
import type { Legend } from './grid';
import type { IconDef } from './iconKit';
import { DAY, rgbOf, type Palette, type Shade } from './palette';

const L: Legend = {
  M: 'metal1',
  m: 'metal2',
  n: 'metal3',
  j: 'wood1',
  W: 'wood2',
  o: 'wood3',
  O: 'wood4',
  y: 'gold1',
  Y: 'gold2',
  r: 'red1',
  R: 'red2',
  Z: 'red3',
  s: 'skin1',
  S: 'skin2',
  h: 'hair1',
  H: 'hair2',
  k: 'hair3',
  t: 'teal1',
  T: 'teal2',
  e: 'eyes1',
  w: 'white1',
  p: 'plaster1',
  P: 'plaster2',
  c: 'stone1',
  C: 'stone2',
  d: 'stone3',
  g: 'glass1',
  G: 'glass2',
  f: 'smoke1',
  a: 'sail1',
  A: 'sail2',
  l: 'leather1',
  b: 'beard1',
};

// A pickaxe and a woodcutter's axe crossed: the tools of the idle skills.
const SKILLS: readonly string[] = [
  '..mMMn..........MMmn..',
  '.mMmmnn........MmmmMn.',
  'mMm..jOnn.....MmmmmMMn',
  'Mm....jOn....jMmmmmMMn',
  'Mn.....jOn..jOnmmMMMn.',
  'm.......jOnjOn..nMMn..',
  'n........jOjOn....n...',
  '..........jjO.........',
  '.........jOjOn........',
  '........jOn.jOn.......',
  '.......jOn...jOn......',
  '......jOn.....jOn.....',
  '.....jOn.......jOn....',
  '....jOn.........jOn...',
  '...jOn...........jOn..',
  '..jOn.............jOn.',
  '.jOn...............jO.',
  'jOn.................jO',
  'On...................O',
];

// A strongbox: oak planks, iron bands and studs, a gold lock, a coin by it.
const BANK: readonly string[] = [
  '....jjjjjjjjjjjjjj....',
  '...jWWWWWWWWWWWWWWo...',
  '..jWWWWWWWWWWWWWWWWo..',
  '.MmmmmmmmmmmmmmmmmmmnO',
  '.jWWWWWWWWWWWWWWWWWWoO',
  '.nnnnnnnnnyYYnnnnnnnnO',
  '.jWWoWWWWWyOYWWWWoWWoO',
  '.jWWoWWWWWyYYWWWWoWWoO',
  '.jWWoWWWWWWWWWWWWoWWoO',
  '.MmmmmmmmmmmmmmmmmmmnO',
  '.jWWoWWWWWWWWWWWWoWWoO',
  '.jWWoWWWWWWWWWWWWoWWoO',
  '.jWWoWWWWWWWWWWWWoWWoO',
  '.nnnnnnnnnnnnnnnnnnnnO',
  '.OOOOOOOOOOOOOOOOOOOO.',
];

// The hero's head and shoulders: brown hair, eyes, the teal tunic.
const CHARACTER: readonly string[] = [
  '.......hhhhhh.......',
  '.....hhhhhhhhHH.....',
  '....hhhhhhhhhHHH....',
  '...hhhhhhhhhhHHHk...',
  '...hhssssssssHHkk...',
  '...hsssssssssSHkk...',
  '...hsweesweesSHk....',
  '...hssssssssSSHk....',
  '...SssssSsssSSk.....',
  '....SsssSSsSSS......',
  '.....SSsssSSS.......',
  '......SSSSSS........',
  '..ttttTSSSTTTTT.....',
  '.tttttttSTTTTTTTT...',
  'tttttttttTTTTTTTTT..',
  'tttttttttTTTTTTTTTT.',
  'tttttttttTTTTTTTTTT.',
];

// A house: limewash and timber under a red tiled roof, a lit window, a chimney smoking.
const TOWN: readonly string[] = [
  '................ff....',
  '..............fffff...',
  '.............fff.f....',
  '.............cccd.....',
  '........rrr..cCCd.....',
  '......rrrRRR.cCCd.....',
  '.....rrrRRRRRcCCd.....',
  '....rrrRRRRRRRRZZ.....',
  '...rrrRRRRRRRRRRRZ....',
  '..rrrRRRRRRRRRRRRRZ...',
  '.rrRRRRRRRRRRRRRRRRZ..',
  'ZZZZZZZZZZZZZZZZZZZZZ.',
  '.OppppOpppppOpppppO...',
  '.OpggpOppOOOOpggpO....',
  '.OpGgpOppOjWOpGgpO....',
  '.OppppOppOjWOppppO....',
  '.OOOOOOOOOjWOOOOOO....',
  '.OPPPPPPPOjWOPPPPO....',
  '.OPPPPPPPOjWOPPPPO....',
  '.OOOOOOOOOOOOOOOOO....',
];

// A rolled scroll, its middle unrolled with lines on it, a red wax seal.
const MENU: readonly string[] = [
  '..aaaaaaaaaaaaaaaaa...',
  '.aAAAAAAAAAAAAAAAAAa..',
  '.aaaaaaaaaaaaaaaaaaaA.',
  '...pppppppppppppppA...',
  '...pOOOOOOOOOOOOppA...',
  '...ppppppppppppppPA...',
  '...pOOOOOOOOOOOppPA...',
  '...ppppppppppppppPA...',
  '...pOOOOOOOOOOOOpPA...',
  '...ppppppppppppppPA...',
  '...pOOOOOOOOOppppPA...',
  '...pppppppppprrRpPA...',
  '...ppppppppprRRRZPA...',
  '...pppppppppRRRRZPA...',
  '.aaaaaaaaaaaaRZaaaaa..',
  '.aAAAAAAAAAAAAAAAAAa..',
  '..aaaaaaaaaaaaaaaaa...',
];

/** The tab icons by the app's tab ids. */
export const TAB_ICON_DEFS: Readonly<Record<string, IconDef>> = {
  skills: { rows: SKILLS, legend: L },
  bank: { rows: BANK, legend: L },
  character: { rows: CHARACTER, legend: L },
  town: { rows: TOWN, legend: L },
  menu: { rows: MENU, legend: L },
};

/**
 * The day palette muted toward the tab bar's grey, for a tab that is not
 * open: each colour mostly its own lightness in a warm grey lifted toward
 * the bar's muted text, a little of its hue kept, so the shape still reads
 * on the dark bar and the open tab's colours stand out beside it.
 */
export const TAB_MUTED: Palette = {
  name: 'day',
  lightsOn: false,
  colours: Object.fromEntries(
    Object.entries(DAY.colours).map(([shade, hex]) => {
      const [r, g, b] = rgbOf(hex);
      const l = 0.3 * r + 0.59 * g + 0.11 * b;
      const lift = 48 + l * 0.62;
      const grey = [lift * 1.0, lift * 0.95, lift * 0.85];
      const mixed = [r, g, b].map((v, i) => v * 0.2 + grey[i]! * 0.8);
      return [
        shade,
        '#' +
          mixed
            .map((v) =>
              Math.max(0, Math.min(255, Math.round(v)))
                .toString(16)
                .padStart(2, '0'),
            )
            .join(''),
      ];
    }),
  ) as Record<Shade, string>,
};

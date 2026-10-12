/**
 * Tier 2's icons (B19), in the item icons' hand (24 x 24 with the outline,
 * lit from the upper left, three or four steps a ramp) and drawn as one
 * family with the tier 1 sheet: salt-iron follows the gear ladder after
 * iron, so it is iron's shapes grown richer (the knight's plate, the kite
 * shield's paint and gilding, the long sword's gilt guard), in a sea-green
 * steel with a pale salt bloom (`saltiron` in palette.ts, the figures' own
 * steps set by hand). Ore and bar read as two steps of one material.
 *
 * Drawings are named for what they are; `TIER2_ICON_DEFS` maps the game's
 * item ids (docs/tier2-manifest.md) onto them.
 */
import type { Legend } from './grid';
import { recolour, type IconDef } from './iconKit';
import { FLETCH, IRON_ARROWS } from './gearIcons';
import { BARBED_ARROWS, GROTTO_L } from './grottoIcons';

const SALT: Legend = {
  R: 'red1',
  r: 'red2',
  e: 'red3',
  o: 'wood3',
  S: 'saltiron1',
  s: 'saltiron2',
  t: 'saltiron3',
  u: 'saltiron4',
  v: 'saltiron5',
  G: 'gold1',
  g: 'gold2',
  B: 'blue1',
  b: 'blue2',
  x: 'shade1',
  f: 'leather1',
  O: 'wood4',
};

// The bascinet: a round dome, the visor raised over the brow with its row of
// breaths, the rim, cheek plates round the open face, the aventail's rings.
const HELM: readonly string[] = [
  '.......SSsstt',
  '.....SSsssstttu',
  '....SSsssssttttu',
  '...SSsssssstttuuv',
  '..SSsssssssttttuuv',
  '..SSSSSSSsssssttuv',
  '..svvsvvsvvsvvtvvuv',
  '..sssssssttttttuuuv',
  '.Svvvvvvvvvvvvvvvvuv',
  '.GGGGGGGGGGgggggggv',
  '.Sst.xxxxxxxxxx.tuuv',
  '.Sst.xxxxxxxxxx.tuuv',
  '.Sst.xxxxxxxxxx.tuuv',
  '.Sstt.xxxxxxxx.ttuuv',
  '..Sst..xxxxxx..tuuv',
  '.Sststststststtutuuv',
  'Ssstststststtututuvv',
  'stststststsstututuvv',
  '.vuvuvuvuvuvuvuvuvv',
];

// The cuirass: pauldrons of three lames over the shoulders, a breastplate
// with its ridge lit on the left facet, a fauld of two lames.
const CUIRASS: readonly string[] = [
  '..SSsst.......sttuu',
  '.SSsssst.xxx.sttuuuv',
  'SSssssttSSxxStttuuuv',
  'Sssssst.SSssSt.tuuuv',
  'vvvvvvv.SSssStu.vvvv',
  '.Sssstv.SSssSttu.tuuv',
  '.vvvvv.SSsssSttuu.vvv',
  '..Sstv.SSsssSttuu.tuv',
  '..vvv..SSsssSttuu..vv',
  '.......SSsssSttuu',
  '........SsssSttu',
  '........SsssSttu',
  '.......SSsssSttuu',
  '.......vvvvvvvvvv',
  '......SSssssStttuu',
  '......vvvvvvvvvvvv',
];

// The kite shield: a salt-iron rim lit down its left, a blue field, the gold cross.
const KITE: readonly string[] = [
  'tSSSSSSSssssttu',
  'SsBBBBBGgbbbbtu',
  'SsBBBBBGgbbbbtu',
  'SsBBBBBGgbbbbtu',
  'SsBBBBBGgbbbbtu',
  'SsBBBBBGgbbbbtu',
  'SsGGGGGGGggggtu',
  'Ssgggggggggggtu',
  'SsBBBBBGgbbbbtu',
  'SsBBBBBGgbbbbtu',
  '.SsBBBBGgbbbtu',
  '.SsBBBBGgbbbtu',
  '.SsBBBBGgbbbtu',
  '..SsBBBGgbbtu',
  '..SsBBBGgbbtu',
  '...SsBBGgbtu',
  '...SsBBGgbtu',
  '....SsBGgtu',
  '.....SsGtu',
  '......Stu',
  '.......u',
];

// The long sword: a blade to the corner, its bloom down the lit edge, a gilt
// cross wider than the iron sword's, a leather grip, a gilt pommel.
const LONG_SWORD: readonly string[] = [
  '.....................S',
  '...................Sst',
  '..................Sst',
  '.................Sst',
  '................Sst',
  '...............Sst',
  '..............Sst',
  '.............Sst',
  '............Sst',
  '...........Sst',
  '..........Sst',
  '...G.....Sst',
  '...gG...Sst',
  '....gGGSst',
  '.....gGt',
  '.....fgG',
  '....fO.gG',
  '...fO...g',
  '..fO',
  '.GgO',
  '.gg',
];

const WAR_AXE: readonly string[] = [
  '...........oO',
  '.SSssssstttuuu',
  'SSssssssttuuuuv',
  'Sssssssttuuuuvvvvv',
  'Ssssssttuuuuv',
  'Sssssttt...GgO',
  'Sssstt......GgO',
  'Ssstt.......oO',
  '.Sstt........oO',
  '..Sst........oO',
  '...St.........oO',
  '....S..........oO',
  '...............oO',
  '................oO',
  '................oO',
  '.................oO',
  '.................oO',
  '..................oO',
  '..................oO',
  '...................oO',
  '...................oO',
  '...................OO',
];

const CLOAK: readonly string[] = [
  '....RRRr...rre',
  '...GgRrrxxxrreGg',
  '..RRrrrrexerrrree',
  '.RrrrRrerrRrerRee',
  '.RrrrRrerrRrerRree',
  '.RrrrRrerrRrerRree',
  '.RrrrRrerrRrerRree',
  '.RrrrRrerrRrerRree',
  '.RrrrRrerrRrerRree',
  'RrrrrRrerrRrerRreee',
  'RrrrrRrerrRrerRreee',
  'RrrrrRrerrRrerRreee',
  'RrrrrRrerrRrerRreee',
  'RrrrrRrerrRrerRreee',
  'RrrrrRrerrRrerRreee',
  'RrrrrRrerrRrerRreree',
  'RrrrrRrerrRrerRreree',
  'RrrrrRrerrRrerRreree',
  'ee.eeee.eeee.eeee.ee',
];

// Ore: a slate-dark lump with sea-green crystals in it and a crust of salt on its top faces.
const ORE: readonly string[] = [
  '.........S',
  '......sSsSt',
  '.....sSsttSu',
  '...cWsSttStuccc',
  '.ccccWsttucccdd',
  'cccWWcccccccWddd',
  'eeWccccccccccddd',
  'eeeeecccccccddsSd',
  'eeseeeeeeeddddtud',
  'esStueeeeedddddddd',
  'eettueeeeeddddWWdd',
  '.eeeeeeeeeddddddd',
  '..eeeeeseeddddd',
  '...eeeeeeedddd',
];

// Bars: the tier 1 ingot (itemIcons.ts BAR) in salt-iron, a fleck of salt on its top face.
const BAR: readonly string[] = [
  '.....hhhhhhhhhhhh',
  '....hzzaaaaaWaaaab',
  '...hzaaaaaaaaaaaabb',
  '..haaaaaaaaaaaaaabbc',
  '.dbbbbbbbbbbbbbbbbcc',
  'ddbbbbbbbbbbbbbbbbcc',
  'ddbbbbbbbbbbbbbbbccc',
  '.dbbbbbbbbbbbbbbbcc',
  '..cccccccccccccccc',
];

/** The greaves' pair (gearIcons.ts) in salt-iron: plate without a strap showing. */
export const GREAVES_PAIR: readonly string[] = [
  '..1233',
  '.112334',
  '.1122344...2344',
  '..34455...223445',
  '.112234...2233455',
  '1122334....45555',
  '4445555...223345',
  '1122334..2233445',
  '.112234..4445555',
  '..11234..2233445',
  '..44455...223345',
  '..10234....22345',
  '..11234....44555',
  '..11254....22345',
  '..112344...22345',
  '...2345....22345',
  '...........223455',
  '............3455',
];

const ARROWHEADS: readonly string[] = [
  '........sS',
  '.......sSu',
  '......sSu',
  '.....sSu',
  '.....Su',
  '...vSu',
  '...vv',
  '..v.................sS',
  '...................sSu',
  '..................sSu',
  '.................sSu',
  '.................Su',
  '...............vSu',
  '...............vv',
  '..........sS..v',
  '.........sSu',
  '........sSu',
  '.......sSu',
  '.......Su',
  '.....vSu',
  '.....vv',
  '....v',
];

/** Every tier 2 drawing, by what it is. */
export const TIER2_DRAWINGS: Readonly<Record<string, IconDef>> = {
  saltiron_helm: { rows: HELM, legend: SALT },
  saltiron_cuirass: { rows: CUIRASS, legend: SALT },
  saltiron_kite: { rows: KITE, legend: SALT },
  saltiron_longsword: { rows: LONG_SWORD, legend: SALT },
  saltiron_greaves: {
    rows: recolour(GREAVES_PAIR, { '0': 'S', '1': 'S', '2': 's', '3': 't', '4': 'u', '5': 'v' }),
    legend: SALT,
  },
  saltiron_ore: {
    rows: ORE,
    legend: {
      c: 'slate1',
      d: 'slate3',
      e: 'slate2',
      S: 'white1',
      W: 'saltiron1',
      s: 'saltiron2',
      t: 'saltiron3',
      u: 'saltiron4',
    },
  },
  saltiron_bar: {
    rows: BAR,
    legend: {
      h: 'saltiron1',
      a: 'saltiron2',
      b: 'saltiron3',
      c: 'saltiron5',
      d: 'saltiron2',
      z: 'white1',
      W: 'white1',
    },
  },
  saltiron_arrowheads: { rows: ARROWHEADS, legend: SALT },
  saltiron_axe: { rows: WAR_AXE, legend: SALT },
  red_cloak: { rows: CLOAK, legend: SALT },
  saltiron_arrows: {
    rows: recolour(IRON_ARROWS, { M: '1', m: '2', n: '4' }),
    legend: { ...FLETCH, '1': 'saltiron1', '2': 'saltiron3', '4': 'saltiron5' },
  },
  broadhead_arrows: {
    rows: recolour(BARBED_ARROWS, { M: '1', m: '2', n: '4', r: 'g', R: 'G' }),
    legend: {
      ...GROTTO_L,
      '1': 'saltiron1',
      '2': 'saltiron3',
      '4': 'saltiron5',
      g: 'pine1',
      G: 'pine2',
    },
  },
};

/**
 * The game's tier 2 item ids, by the drawing each is shown with. Filled in
 * from docs/tier2-manifest.md as lane A publishes it.
 */
export const TIER2_ICON_IDS: Readonly<Record<string, string>> = {
  salt_iron_ore: 'saltiron_ore',
  salt_iron_bar: 'saltiron_bar',
  salt_iron_arrowheads: 'saltiron_arrowheads',
  salt_iron_sword: 'saltiron_longsword',
  salt_iron_axe: 'saltiron_axe',
  salt_iron_helm: 'saltiron_helm',
  salt_iron_plate: 'saltiron_cuirass',
  salt_iron_greaves: 'saltiron_greaves',
  salt_iron_shield: 'saltiron_kite',
  red_cloak: 'red_cloak',
  salt_iron_arrows: 'saltiron_arrows',
  broadhead_arrows: 'broadhead_arrows',
};

export const TIER2_ICON_DEFS: Readonly<Record<string, IconDef>> = Object.fromEntries(
  Object.entries(TIER2_ICON_IDS).map(([id, drawing]) => [id, TIER2_DRAWINGS[drawing]!]),
);

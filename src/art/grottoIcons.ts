/**
 * Icons for what bounty hunting (S9) and Brinebeard's Grotto (wave 6) added:
 * the bounty shop's and bounty monsters' things, and the grotto's loot. Drawn
 * by hand as rows of characters, like the other icons.
 *
 * The grotto's gear sits on the ladder just above iron: a pirate's finery,
 * salt-stained and a little showy. Brass rather than gold (gold belongs to
 * tier 2's knight), steel with its nicks, the captain's purple coat in gold
 * braid, his black tricorn.
 */
import type { Legend } from './grid';
import type { IconDef } from './iconKit';

const L: Legend = {
  M: 'metal1',
  m: 'metal2',
  n: 'metal3',
  y: 'gold1',
  Y: 'gold2',
  '3': 'bronze3',
  '4': 'bronze4',
  j: 'wood1',
  W: 'wood2',
  o: 'wood3',
  O: 'wood4',
  r: 'red1',
  R: 'red2',
  Z: 'red3',
  u: 'midnight1',
  U: 'midnight2',
  X: 'midnight3',
  w: 'white1',
  a: 'tan1',
  b: 'tan2',
  c: 'tan3',
  F: 'hide1',
  H: 'hide2',
  '#': 'hide3',
  g: 'grass1',
  G: 'grass2',
  t: 'pine1',
  T: 'pine2',
  P: 'pine3',
  e: 'plaster1',
  E: 'plaster2',
  s: 'stone1',
  S: 'stone2',
  d: 'stone3',
  K: 'hairblack1',
  J: 'hairblack2',
  V: 'hairblack3',
  x: 'shade1',
  q: 'slate3',
  k: 'oakbark1',
  '&': 'oakbark2',
  '=': 'oakbark3',
  '<': 'pinewood1',
  '>': 'pinewood2',
};

/** Brass, not gold: the grotto's trim is the `bronze` ramp, as on the worn layers. */
const BRASS: Legend = { ...L, y: 'bronze1', Y: 'bronze2' };

/* ----- Bounty hunting (S9) ----- */

// A longbow taller than the shortbows, nearly straight, in dark oak with a
// green wrap at the grip: a poacher's, for shooting from cover.
const POACHERS_LONGBOW: readonly string[] = [
  '....................k=',
  '..................k&.e',
  '................kk&.e',
  '..............kk&..e',
  '.............k&...e',
  '...........kk&...e',
  '..........k&....e',
  '.........k&....e',
  '........tP....e',
  '.......tP....e',
  '......tP....e',
  '.....k&....e',
  '.....k&...e',
  '....k&...e',
  '....k&..e',
  '...k&..e',
  '..k&..e',
  '..k&.e',
  '.k&.e',
  '.k&e',
  'k&e',
  '=e',
];

// One great green scale, ridged like a leaf, rimmed in iron.
const WYRMSCALE_SHIELD: readonly string[] = [
  '.....nnnnnnnn',
  '...nnMgggggGGnn',
  '..nMggggggGGGGGn',
  '.nMgggggGgGGGGTTn',
  '.nMggggGgggGGGTTn',
  'nMggggGgggggGGTTPn',
  'nMgggGgggggggGTTPn',
  'nMgggGgggGgggGTTPn',
  'nMggGgggGGgggGTTPn',
  '.nMgGgggGggggGTPn',
  '.nMgGggGgggggGTPn',
  '..nMgGgGgggggTPn',
  '..nMgGGgggggTTPn',
  '...nMgGggggTTPn',
  '...nMggGgggTPn',
  '....nMgGggTPn',
  '....nMggGgTPn',
  '.....nMgGTPn',
  '......nMgTn',
  '.......nMn',
  '........n',
];

// Two arrows, heads up and to the right, each head hooked behind its point;
// dark red fletching so they are not taken for the plain iron ones.
const BARBED_ARROWS: readonly string[] = [
  '..................M',
  '.................Mn',
  '...............MMn',
  '.............n.mMn...M',
  '..............nmn...Mn',
  '.............Sn...MMn',
  '............Ss..n.mMn',
  '...........Ss....nmn',
  '..........Ss....Sn',
  '.........Ss....Ss',
  '........Ss....Ss',
  '.....rrSs....Ss',
  '....rrSs....Ss',
  '...rrSs....Ss',
  '...rSsR.rrSs',
  '...SsRRrrSs',
  '..OsRRrrSs',
  '..ORR.rSsR',
  '......SsRR',
  '.....OsRR',
  '.....ORR',
];

// A wolf's tooth on a cord, notched for every bounty.
const HUNTERS_CHARM: readonly string[] = [
  '.....cccccccc',
  '...cc........cc',
  '..c............c',
  '.c..............c',
  '.c..............c',
  '..c............c',
  '...cc........cc',
  '.....cc....cc',
  '.......cbbc',
  '........bb',
  '.......eeee',
  '.......ewwE',
  '.......eweE',
  '.......edeE',
  '.......eeeE',
  '.......edEE',
  '........eeE',
  '........edE',
  '........eE',
  '.........eE',
  '.........E',
];

// A broad brim, a red band, and a plume the size of a gull's opinion.
const FEATHERED_HAT: readonly string[] = [
  '..........eeee',
  '.......eeewwwee',
  '.....eewwweeeEEe',
  '....ewweeEEE...ee',
  '...ewwEE.........e',
  '..ewEE...FFFF',
  '..eE...FFFFFFH',
  '.eE...FFFFFFFHH',
  '.e...FFFFFFFFHH',
  '.e...RRRRrRRRRR',
  '..FFFFFFFFFFFFHHHH',
  'FFFFFFFFFFFFFHHHHHH#',
  '.##FFFFFFFFHHHHHH###',
  '....############',
];

/* ----- Brinebeard's Grotto ----- */

// Old gold: a coin stamped with a king nobody remembers, and another lying by it.
const DOUBLOON: readonly string[] = [
  '.....yyyyyy',
  '...yyYYYYYYyy',
  '..yYYyyyyyyYYy',
  '.yYyyyyYYYyyyYY',
  '.yYyyyYYyyYyyyY4',
  'yYyyyYYyyyyyyyYY4',
  'yYyyyyYYyyyyyyYY4',
  'yYyyyyyYyyyyyyYY4',
  'yYyyyyYYyyyyyyYY4',
  'yYyyyYYYYyyyyyYY4',
  '.yYyyyyyYYyyyYY44',
  '.yYYyyyyyyyyYYY4',
  '..44YYyyyyYYY44...yyy',
  '...4444YYYY444..yyYYYy',
  '......44444...yYyyyyYY',
  '.............yYYYYYYY4',
  '..............44444444',
];

// A cutlass that has seen use: a broad curved blade, nicked along its edge,
// a brass cup of a guard and a leather grip.
const PIRATE_CUTLASS: readonly string[] = [
  '..................Mm',
  '.................Mmn',
  '...............MMmn',
  '.............MMmmn',
  '............Mmm.n',
  '..........MMmmn',
  '.........Mmmmn',
  '........Mmmnn',
  '.......Mm.mn',
  '......Mmmnn',
  '.....Mmmn',
  '...yyMmn',
  '..yYyMn',
  '.yYYYY3',
  'yYcbY3',
  'Ycbb3',
  '.bb3',
  'yY3',
  'Y3',
];

// A long haft, a broad bit and a spike behind it for hooking rails.
const BOARDING_AXE: readonly string[] = [
  '.........MMM',
  '........MmmmM',
  '.......Mmmmmn',
  '.......Mmmmnnn',
  '........MmnnnjO',
  '.........nnnjoOnn',
  '...........joOmnnn',
  '..........joO..nnd',
  '.........joO',
  '........joO',
  '.......joO',
  '......joO',
  '.....joO',
  '....jcO',
  '...jcc',
  '..jcO',
  '.joO',
  'joO',
  'oO',
];

// A black tricorn, three corners edged in brass, one red feather.
const TRICORN: readonly string[] = [
  '.......KKKKKK......rr',
  '......KKKKKKKK....rRR',
  'Y....KKKKKKKKKJ..rRR.Y',
  'KY...KKKKKKKKJJ.rRJ.YJ',
  'KKY.KKKKKKKKKJJJRJ.YJJ',
  'KKKYYKKKKKKKKJJJJYYJJV',
  '.KKKKYYKKKKKKJJYYJJJV',
  '..KKKKKYYKKKKJYYJJJV',
  '...KKKKKKYYYYYJJJJV',
  '....VKKKKKKYJJJJVV',
  '......VVKKKYJJVV',
  '.........VYV',
  '..........Y',
];

// Brinebeard's coat: long and purple, brass braid down the front and on the
// cuffs, a white shirt at the collar.
const CAPTAINS_COAT: readonly string[] = [
  '....uuuu....UUUU',
  '...uuuuuyweyUUUUU',
  '..uuuuuuyweyUUUUUU',
  '.uuuuuuuyyeyyUUUUUU',
  'uuuuuuuuuyeyUUUUUUUX',
  'uuuuuuuuyuyUUUUUUUUX',
  'uuuu.uuuyuyUUUU.UUUX',
  'uuuu.uuuyuyUUUU.UUUX',
  'uuuu.uuuyuyUUUU.UUUX',
  'yyyY.uuuyuyUUUU.yYYY',
  'XXXX.uuuyuyUUUU.XXXX',
  '.....uuuyuyUUUU',
  '.....uuuyuyUUUU',
  '....uuuuyuyUUUUU',
  '....uuuuyuyUUUUU',
  '...uuuuuy.yUUUUUX',
  '...uuuuuy.yUUUUUX',
  '..uuuuuuy.yUUUUUUX',
  '..yyyyyyy.yYYYYYYY',
];

// A brass spyglass drawn out, wider section by section, with a dent in it.
const SPYGLASS: readonly string[] = [
  '...............Yyyy',
  '..............YyMwy3',
  '.............yYyMyY3',
  '............yYyyyY33',
  '...........yYyy4Y33',
  '..........44yyY333',
  '.........yyY4433',
  '........yYYY33',
  '.......44Y333',
  '......cbbb4',
  '.....cbbbbc',
  '....cbbbbc',
  '...44bbc',
  '..yY33',
  '.yY3',
  'y44',
  '44',
];

// The captain's own anchor, iron going to rust, on a short length of chain.
const BRINEBEARDS_ANCHOR: readonly string[] = [
  '.........nnn',
  '..SS....n...n',
  '.S..S...n...n',
  '..SS.SS..nnn',
  '.....S.SjjjmnjjjjjO',
  '.......SoooMnoooooO',
  '.........Mmn',
  '.........Mmn',
  '.........Mmn',
  '.........MRn',
  '.........Mmn',
  '.........Mmn',
  '.........Mmn',
  '..M......Mmn......n',
  '.MMm.....Mmn.....mnn',
  '..Mmm....Mmn....mnn',
  '...Mmn...Mmn...Mnn',
  '....Mmnn.Mmn.nMmn',
  '.....MMmmMmnmmmn',
  '.......MMmmmnn',
];

// A carved lady from a ship's prow, in profile: a fierce stare, a chipped
// nose, flowing hair, the paint of her dress mostly gone.
const SHIPS_FIGUREHEAD: readonly string[] = [
  '.....oooooo',
  '...ooWWWWWWo',
  '..oWWWWeeeeWo',
  '..oWWWeeeeeeeE',
  '.oWWWWeeeOOeeeE',
  '.oWoWWeeeexeeeE',
  '.oWoWWeeeeeeeeeeE',
  'oWWoWWeeeeeeeeE',
  'oWWoWWWeeeeeeeE',
  'oWoWWWWeeeeRReE',
  'oWoWWWWWeeeeeE',
  '.oWoWWWWWeeeE',
  '.oWoWWWWWeeE',
  '..oWoWWWWeeeeE',
  '..oWWoWWWeeeeeeE',
  '...oWWWWRRReeeeeE',
  '...oWWRRRRRRRRREE',
  '....oWRRRRRRRRRRR',
  '....oRRRZRRRRRRRo',
  '.....oRRZRRRRZRRo',
  '......oooooooooo',
];

// The store's velvet cap (B10): plum velvet slouched to one side over a
// darker band, a gold pin with a stone set in it. Soft, so lit in broad
// planes rather than a metal's glints.
const VELVET_CAP: readonly string[] = [
  '.......pppppp........',
  '....ppuuuupppppP.....',
  '..ppuuuuuppppppPPP...',
  '.puuuuppppppppPPPPP..',
  'puuuppppppppPPPPPPPP.',
  'puppppppppPPPPPPPPPPX',
  'ppppppppPPPPPPPPPPXXX',
  '.pppPPPPPPPPPPPXXXXX.',
  '..XPPPPPPPPPXXXXXX...',
  '..PPPPPPPPPPPPPPP....',
  '..PPPPPPPyYPPPPPX....',
  '..XPPPPPyrYYPPPXX....',
  '...XXXXXXYYXXXXX.....',
];
const VELVET: Legend = {
  ...L,
  p: 'dress1',
  P: 'dress2',
  X: 'midnight3',
  u: 'midnight1',
  r: 'red1',
};

export const GROTTO_ICON_DEFS: Readonly<Record<string, IconDef>> = {
  velvet_cap: { rows: VELVET_CAP, legend: VELVET },
  poachers_longbow: { rows: POACHERS_LONGBOW, legend: L },
  wyrmscale_shield: { rows: WYRMSCALE_SHIELD, legend: L },
  barbed_arrows: { rows: BARBED_ARROWS, legend: L },
  hunters_charm: { rows: HUNTERS_CHARM, legend: L },
  feathered_hat: { rows: FEATHERED_HAT, legend: L },
  doubloon: { rows: DOUBLOON, legend: L },
  pirate_cutlass: { rows: PIRATE_CUTLASS, legend: BRASS },
  boarding_axe: { rows: BOARDING_AXE, legend: L },
  tricorn: { rows: TRICORN, legend: BRASS },
  captains_coat: { rows: CAPTAINS_COAT, legend: BRASS },
  spyglass: { rows: SPYGLASS, legend: BRASS },
  brinebeards_anchor: { rows: BRINEBEARDS_ANCHOR, legend: L },
  ships_figurehead: { rows: SHIPS_FIGUREHEAD, legend: L },
};

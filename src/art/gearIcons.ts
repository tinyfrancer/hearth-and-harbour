/**
 * Icons for things made to be worn or used: weapons and armour on the gear
 * ladder (bronze plain and leathery, iron solid and grey), linen and shells,
 * bows and arrows, cloth and string, and the shell vial with its potions.
 * Drawn by hand as rows of characters, like the item icons.
 */
import type { Legend } from './grid';
import { recolour, type IconDef } from './iconKit';

const BRONZE: Legend = {
  '1': 'bronze1',
  '2': 'bronze2',
  '3': 'bronze3',
  '4': 'bronze4',
  '5': 'bronze5',
  F: 'hide1',
  X: 'hide2',
  '#': 'hide3',
  j: 'wood1',
  W: 'wood2',
  o: 'wood3',
  O: 'wood4',
};

const IRON: Legend = {
  M: 'metal1',
  m: 'metal2',
  n: 'metal3',
  d: 'slate3',
  q: 'stone3',
  x: 'shade1',
  W: 'wood2',
  o: 'wood3',
  O: 'wood4',
  f: 'leather1',
};

// ---------------------------------------------------------------------------
// Axes. The hatchet is the worn one's solid wedge, a little larger: a flat
// top, a curved bit with a bright edge, a socket wrapped round the haft and
// a little haft above. The iron axe's head is bigger and bearded.
const BRONZE_AXE: readonly string[] = [
  '.......Wo',
  '.511113333',
  '5112223334',
  '5122223334',
  '51222223334',
  '52222233334',
  '522333....Wo',
  '5233......Wo',
  '.53........Wo',
  '...........Wo',
  '............Wo',
  '............Wo',
  '.............Wo',
  '.............Wo',
  '..............Wo',
  '..............Wo',
  '...............Wo',
  '...............oO',
];

const IRON_AXE: readonly string[] = [
  '..........Wo',
  '.MMmmmmmmmnnnn',
  'MMmmmmmmmmnnnd',
  'Mmmmmmmmmmnnnd',
  'Mmmmmmmmnnnnnd',
  'Mmmmmnnn....Wo',
  'Mmmmnnn......Wo',
  'Mmmmnn.......Wo',
  '.Mmmn.........Wo',
  '..Mmn.........Wo',
  '...Mn..........Wo',
  '...............Wo',
  '................Wo',
  '................Wo',
  '.................Wo',
  '.................Wo',
  '..................Wo',
  '..................Wo',
  '...................Wo',
  '...................Wo',
  '....................Wo',
  '....................oO',
];

// Swords, point up and to the right. Bronze: a short leaf blade with a bright
// midrib, a small cast guard, a hide grip. Iron: a long straight blade, a
// plain cross, a leather grip.
const BRONZE_SWORD: readonly string[] = [
  '..................5',
  '................153',
  '..............12523',
  '.............12523',
  '............12523',
  '...........12523',
  '..........1253',
  '.....13..1253',
  '......23.153',
  '.......2353',
  '........23',
  '.......X.23',
  '......X#..23',
  '.....X#',
  '....X#',
  '..12#',
  '..23',
];

const IRON_SWORD: readonly string[] = [
  '....................M',
  '..................Mmn',
  '.................Mmn',
  '................Mmn',
  '...............Mmn',
  '..............Mmn',
  '.............Mmn',
  '............Mmn',
  '...........Mmn',
  '...M......Mmn',
  '...nm....Mmn',
  '....nm..Mmn',
  '.....nmMmn',
  '......nm',
  '......fnm',
  '.....fO.nm',
  '....fO...nm',
  '...fO.....n',
  '.MmO',
  '.mn',
];

// Helmets. Bronze: a close cap, a bright ridge over the crown, a riveted rim
// on a hide liner. Iron: a conical helm with a nasal, dark inside.
const BRONZE_HELMET: readonly string[] = [
  '......12523',
  '....112252233',
  '...11222522233',
  '..1122225222233',
  '.112222252222334',
  '.112222252222334',
  '11222222522222334',
  '31313131313131313',
  'FXXXXXXXXXXXXXXX#',
  '.###############',
];

const IRON_HELMET: readonly string[] = [
  '........Mm',
  '.......MMmn',
  '......MMmmnn',
  '.....MMmmmmnn',
  '....MMmmmmmmnn',
  '...MMmmmmmmmmnn',
  '..MMmmmmmmmmmmnn',
  '..Mmmmmmmmmmmmmn',
  '.MMmmmmmmmmmmmmnn',
  '.nnnnnnnMnnnnnnnn',
  '.Mmxxxxx.Mnxxxxxmn',
  '.Mmxxxxx.Mnxxxxxmn',
  '.Mmxxxxx.Mnxxxxxmn',
  '..mxxxx..Mn.xxxxn',
  '..mn......n.....n',
];

// Shields. Bronze: a small round wooden shield, a hide rim, a bronze boss.
// Iron: a plain heater, rimmed and riveted.
const BRONZE_SHIELD: readonly string[] = [
  '......FFFFFF',
  '....FFFWWWWFFF',
  '...FFjOWWWWOoXX',
  '..FjjjOWWWWOoooX',
  '.FFjjjOWWWWOoooX#',
  '.FjjjjOWWWWOoooo#',
  'FFjjjj.1122.oooo##',
  'Fjjjjj115223ooooo#',
  'Fjjjjj152233ooooo#',
  'Fjjjjj122334ooooo#',
  'Fjjjjj223344ooooo#',
  'FFjjjj.2344.oooo##',
  '.FjjjjOWWWWOoooo#',
  '.FXjjjOWWWWOooo##',
  '..XjjjOWWWWOooo#',
  '...XXjOWWWWOo##',
  '....###WWWW###',
  '......######',
];

const IRON_SHIELD: readonly string[] = [
  'nnnnnnnnnnnnnnnn',
  'nMMMMmmmmmmmmmmn',
  'nMMmnmmmmmmnmmmn',
  'nMMmmmmmmmmmmmmn',
  'nMMmmmmmmmmmmmmn',
  'nMMmmmmMMnmmmmmn',
  'nMMmmmmMmnnmmmmn',
  'nMMmmmmmnnmmmmmn',
  'nMMmmmmmmmmmmmmn',
  'nMMmnmmmmmmnmmmn',
  '.nMMmmmmmmmmmmn',
  '.nMMmmmmmmmmmmn',
  '..nMmmmmmmmmmn',
  '..nMmmmmmmmmmn',
  '...nMmmmmmmmn',
  '....nMmmmmmn',
  '.....nMmmmn',
  '......nmmn',
  '.......nn',
];

// Body. Bronze: a hide jerkin with one bronze disc on the chest and tabs
// below the belt. Iron: a mail shirt with short sleeves, rows of rings.
const BRONZE_BODY: readonly string[] = [
  '...FXXX....XXX#',
  '...FXXX....XXX#',
  '...FXXXO..OXXX#',
  '...FXXXXOOXXXX#',
  '..FXXXXXOOXXXXX#',
  '.FXXXXXXXXXXXXXX#',
  'FXXXXXX1122XXXXXX#',
  'FXXXXX112223XXXXX#',
  'FXXXXX125223XXXXX#',
  'FXXXXX122233XXXXX#',
  'FXXXXX222334XXXXX#',
  'FXXXXXX2334XXXXXX#',
  'F################F',
  'FXXXXXXXXXXXXXXXX#',
  'FX#FX#FX#FX#FX#FX#',
  'F#.F#.F#.F#.F#.F#',
];

const IRON_BODY: readonly string[] = [
  '...MMMmm....mmnnn',
  '.MMMmmmmmmmmmmmnnnq',
  'MMmnmnmnmnmnmnmnqnqq',
  'Mmmm.mmmmmmmmmm.nnnq',
  'mnmn.mnmnmnmnmn.qnqq',
  'Mmmm.mmmmmmmmmm.nnnq',
  'nnnn.mnmnmnmnmn.qqqq',
  '.....mmmmmmmmmn',
  '.....mnmnmnmnmq',
  '.....mmmmmmmmmn',
  '.....mnmnmnmnmq',
  '.....mmmmmmmmmn',
  '....mmnmnmnmnmqn',
  '....Mmmmmmmmmmnn',
  '....mnmnmnmnmnqq',
  '....nnnnnnnnnnqq',
];

// ---------------------------------------------------------------------------
// Linen, undyed and plain, and things strung with shells.
const LINEN: Legend = { l: 'linen1', L: 'linen2', I: 'linen3', O: 'wood4', x: 'shade1' };

const LINEN_TUNIC: readonly string[] = [
  '....llll....LLLL',
  '..lllllllIOIlLLLLL',
  '.llllllllIOILLLLLLL',
  'llllLllllIOLLLLLLLII',
  'lllLllllllLLLLLLLLII',
  'lllL.lllllLLLLL.LLII',
  'lllL.lllllLLLLL.LLII',
  'lllL.lllllLLLLL.LLII',
  'lllL.lllllLLLLL.LLII',
  'IIII.lllllLLLLL.IIII',
  '.....lllllLLLLL',
  '.....lllllLLLLL',
  '....llllllLLLLLL',
  '....lllllLLLLLLL',
  '....IIIIIIIIIIII',
];

const LINEN_TROUSERS: readonly string[] = [
  'IIIIIIIOOIIIIIII',
  'llllllllLLLLLLLL',
  'llllllllLLLLLLLL',
  'lllllllLlLLLLLLL',
  'llllllL..lLLLLLL',
  'llllllL..lLLLLLL',
  'llllllL..lLLLLLL',
  'lllllLL..lLLLLLI',
  'lllllLL..lLLLLLI',
  'lllllLL..lLLLLLI',
  'llllLLL..lLLLLLI',
  'IlllLLL..lLLLLII',
  'lIllLLL..lILLLLI',
  'llIlLLL..lLILLLI',
  'lllIlLL..lLLILLI',
  'llllILL..lLLLIII',
  'IIIIIII..IIIIIII',
];

const LINEN_HOOD: readonly string[] = [
  '......llllLLLL',
  '....lllllLLLLLLI',
  '...llllLLLLLLLLII',
  '..lllLLIIIIIILLLII',
  '..llLIxxxxxxxILLII',
  '..llLIxxxxxxxILLII',
  '..llLIxxxxxxxILLII',
  '..llLIxxxxxxxILLII',
  '..llLLIxxxxxILLLII',
  '..lllLLIIIIILLLLII',
  '.llllLLLLLLLLLLLIII',
  'lllllLLLLLLLLLLLIIII',
  'llllLLLLLLLLLLLLIIII',
  '.lLLILLLLILLLLIIIII',
];

const SHELLS: Legend = { a: 'shell1', p: 'shell2', d: 'shelldark1', D: 'shelldark2', O: 'hide3' };

// B12: drawn to fill the square like the other icons (they had used its middle third).
const SHELL_NECKLACE: readonly string[] = [
  '.Oo................oO.',
  '.Oo................oO.',
  '..Oo..............oO..',
  '..Oo..............oO..',
  '...Oo............oO...',
  '...Oo............oO...',
  '....Oo..........oO....',
  '...apOo........oOap...',
  '..apdDOo......oOapdD..',
  '...dD..Oo....oO..dD...',
  '.....aap.OooO.apa.....',
  '.....apdD.OO.apdd.....',
  '......dD.aapp.dD......',
  '........aappdd........',
  '........apapdd........',
  '........apapdD........',
  '.........pddD.........',
  '..........dD..........',
  '..........D...........',
];

const SHELL_BRACELET: readonly string[] = [
  '.......OOOOOOOO.......',
  '....OOO........OOO....',
  '..OO..............OO..',
  '.O..................O.',
  'Oo..................oO',
  'Oo..................oO',
  'Oap................apO',
  '.apdD............apdD.',
  '..dDaap........aapdD..',
  '....apdDoaapoo.apdD...',
  '......dDapdDapdD......',
  '........dDaapdD.......',
  '..........dD..........',
];

// ---------------------------------------------------------------------------
// Bows: one drawing in three woods, string to the lower right, the stave
// bowed toward the light, a hide grip at the middle.
const BOW: readonly string[] = [
  '...............<<<<>',
  '...........<<<<....e',
  '.........<<>>>....e',
  '.......F<>>......e',
  '......FX>.......e',
  '.....FX........e',
  '....FX........e',
  '....<>.......e',
  '...<>.......e',
  '...<>......e',
  '..<>......e',
  '..<>.....e',
  '..<>....e',
  '..<....e',
  '.<....e',
  '.<...e',
  '.<..e',
  '.<.e',
  '.>e',
];

const bow = (light: string, dark: string): IconDef => ({
  rows: recolour(BOW, { '<': 'a', '>': 'b' }),
  legend: { a: light, b: dark, e: 'plaster1', F: 'hide1', X: 'hide2' } as Legend,
});

// Arrows: two, head up and to the right, fletching down and to the left.
const BRONZE_ARROWS: readonly string[] = [
  '..................5',
  '................15',
  '...............153',
  '..............152....5',
  '..............423..15',
  '.............S43..153',
  '............Ss...152',
  '...........Ss....423',
  '..........Ss....S43',
  '.........Ss....Ss',
  '........Ss....Ss',
  '.....eeSs....Ss',
  '....eeSs....Ss',
  '...eeSs....Ss',
  '...eSsE.eeSs',
  '...SsEEeeSs',
  '..OsEEeeSs',
  '..OEE.eSsE',
  '......SsEE',
  '.....OsEE',
  '.....OEE',
];

const IRON_ARROWS: readonly string[] = [
  '..................M',
  '.................M',
  '...............MMn',
  '..............mMm....M',
  '..............nmn...M',
  '.............Sn...MMn',
  '............Ss...mMm',
  '...........Ss....nmn',
  '..........Ss....Sn',
  '.........Ss....Ss',
  '........Ss....Ss',
  '.....eeSs....Ss',
  '....eeSs....Ss',
  '...eeSs....Ss',
  '...eSsE.eeSs',
  '...SsEEeeSs',
  '..OsEEeeSs',
  '..OEE.eSsE',
  '......SsEE',
  '.....OsEE',
  '.....OEE',
];

const ARROW_SHAFTS: readonly string[] = [
  '.................Ss',
  '................Ss',
  '...............Ss.S',
  '..............Ss.Ss',
  '.............Ss.Ss',
  '............Ss.Ss.S',
  '...........Ss.Ss.Ss',
  '..........Ss.Ss.Ss',
  '.........Ss.Ss.Ss',
  '........Is.Ss.Ss',
  '.......IL.Ss.Ss',
  '......Ss.LI.Ss',
  '.....Ss.SI.Is',
  '....Ss.Ss.IL',
  '...Ss.Ss.Ss',
  '..Ss.Ss.Ss',
  '..s.Ss.Ss',
  '...Ss.Ss',
  '..Ss.Ss',
  '..s.Ss',
  '...Ss',
  '..Ss',
];

const BRONZE_ARROWHEADS: readonly string[] = [
  '........15',
  '......1153',
  '.....1153',
  '.....1533',
  '....4533',
  '....44',
  '...4',
  '....................15',
  '..................1153',
  '.................1153',
  '.................1533',
  '................4533',
  '................44',
  '...............4',
  '..........15',
  '........1153',
  '.......1153',
  '.......1533',
  '......4533',
  '......44',
  '.....4',
];

const IRON_ARROWHEADS: readonly string[] = [
  '........mM',
  '.......mMn',
  '......mMn',
  '.....mMn',
  '.....Mn',
  '...qMn',
  '...qq',
  '..q.................mM',
  '...................mMn',
  '..................mMn',
  '.................mMn',
  '.................Mn',
  '...............qMn',
  '...............qq',
  '..........mM..q',
  '.........mMn',
  '........mMn',
  '.......mMn',
  '.......Mn',
  '.....qMn',
  '.....qq',
  '....q',
];

const FLETCH: Legend = {
  S: 'pinewood1',
  s: 'pinewood2',
  c: 'pinewood1',
  C: 'pinewood2',
  e: 'plaster1',
  E: 'plaster2',
  O: 'wood3',
  L: 'hide2',
  I: 'hide3',
};

// ---------------------------------------------------------------------------
// Cloth and string.
const LINEN_CLOTH: readonly string[] = [
  '....llllllllllllll',
  '...llllllllllllllLL',
  '..llllllllllllllLLLL',
  '.LLLLLLLLLLLLLLLLLLLl',
  '.IIIIIIIIIIIIIIIIIIIL',
  '..llllllllllllllllllL',
  '.lLLLLLLLLLLLLLLLLLLLl',
  '.IIIIIIIIIIIIIIIIIIIlL',
  '..lllllllllllllllllllL',
  '.lLLLLLLLLLLLLLLLLLLlLI',
  '.IIIIIIIIIIIIIIIIIIIlLI',
  '...................lLI',
  '..................lLLI',
  '..................LLI',
  '...................I',
];

const BOWSTRING: readonly string[] = [
  '.....llllll',
  '...llLLLLLLll',
  '..lL........Ll',
  '.lL..llllll..Ll',
  '.l..lL....Ll..l',
  'lL.lL......Ll.Ll',
  'l..l...ll...l..l',
  'l..l..l..L..l..l',
  'l..L...LL...L..L',
  'L..LL......LL..L',
  '.L..LLLLLLLL..L',
  '.LL..........LL',
  '..LLLLLLLLLLLL.L',
  '...............L',
  '...............L',
];

// ---------------------------------------------------------------------------
// The shell vial: a long whelk shell, scrubbed out and stoppered. A potion is
// the same vial with the liquid showing through the thin shell, and its own
// stopper: a cork, a red wax seal, a little glowcap, a lit wick.
const VIAL_BODY: readonly string[] = [
  '....abbc',
  '...aabbcc',
  '..aahbbbcc',
  '.aahbbbbbcc',
  '.ahbbbbrrrc',
  'aahbbrrrbbcc',
  'ahbrrrbbbbcc',
  'abbbbbbbbbcc',
  '.abbbbbbrrc',
  '.abbbrrrbbc',
  '..arrbbbbc',
  '..abbbbbcc',
  '...abbbrc',
  '...abrrcc',
  '....abcc',
  '....abc',
  '.....bc',
  '.....c',
];

// prettier-ignore
const CORK: readonly string[] = [
  '.....sS',
  '....ssSS',
  '....sSSS',
  '....nnnn',
];
// prettier-ignore
const WAX: readonly string[] = [
  '....rrR',
  '...rrrRR',
  '...rRrRR',
  '...rnRnR',
];
// prettier-ignore
const CAP: readonly string[] = [
  '...ggggG',
  '..gggggGG',
  '..GGGGGGG',
  '....nnnn',
];
// prettier-ignore
const WICK: readonly string[] = [
  '.....f',
  '....fF',
  '.....k',
  '....NNNN',
];

const potion = (top: readonly string[], body: Legend): IconDef => ({
  rows: [...top, ...VIAL_BODY],
  legend: {
    s: 'wood1',
    S: 'wood2',
    n: 'wood3',
    r: 'red1',
    R: 'red2',
    g: 'glowcap1',
    G: 'glowcap2',
    f: 'fire1',
    F: 'fire2',
    k: 'ink1',
    N: 'navy2',
    h: 'white1',
    ...body,
  },
});

const liquid = (ramp: 'tonic' | 'draught' | 'tincture' | 'midnight'): Legend =>
  ({
    a: `${ramp}1`,
    b: `${ramp}2`,
    c: `${ramp}3`,
    r: `${ramp}3`,
  }) as Legend;

// ---------------------------------------------------------------------------

export const GEAR_ICON_DEFS: Readonly<Record<string, IconDef>> = {
  bronze_axe: { rows: BRONZE_AXE, legend: BRONZE },
  bronze_sword: { rows: BRONZE_SWORD, legend: BRONZE },
  bronze_helmet: { rows: BRONZE_HELMET, legend: BRONZE },
  bronze_shield: { rows: BRONZE_SHIELD, legend: BRONZE },
  bronze_breastplate: { rows: BRONZE_BODY, legend: BRONZE },
  iron_axe: { rows: IRON_AXE, legend: IRON },
  iron_sword: { rows: IRON_SWORD, legend: IRON },
  iron_helmet: { rows: IRON_HELMET, legend: IRON },
  iron_shield: { rows: IRON_SHIELD, legend: IRON },
  iron_breastplate: { rows: IRON_BODY, legend: IRON },
  bronze_arrowheads: { rows: BRONZE_ARROWHEADS, legend: BRONZE },
  iron_arrowheads: { rows: IRON_ARROWHEADS, legend: IRON },
  shell_vial: potion(CORK, { a: 'white1', b: 'shell1', c: 'shelldark1', r: 'shelldark2' }),
  bowstring: { rows: BOWSTRING, legend: LINEN },
  linen: { rows: LINEN_CLOTH, legend: LINEN },
  shell_necklace: { rows: SHELL_NECKLACE, legend: { ...SHELLS, o: 'hide2' } },
  shell_bracelet: { rows: SHELL_BRACELET, legend: { ...SHELLS, o: 'hide2' } },
  linen_hood: { rows: LINEN_HOOD, legend: LINEN },
  linen_trousers: { rows: LINEN_TROUSERS, legend: LINEN },
  linen_tunic: { rows: LINEN_TUNIC, legend: LINEN },
  arrow_shafts: { rows: ARROW_SHAFTS, legend: FLETCH },
  bronze_arrows: { rows: BRONZE_ARROWS, legend: { ...FLETCH, ...pick(BRONZE, '12345') } },
  iron_arrows: { rows: IRON_ARROWS, legend: { ...FLETCH, ...pick(IRON, 'Mmn') } },
  pine_shortbow: bow('pinewood1', 'pinewood2'),
  oak_shortbow: bow('wood2', 'wood3'),
  willow_shortbow: bow('willow1', 'willow2'),
  sage_tonic: potion(CORK, liquid('tonic')),
  steady_draught: potion(WAX, liquid('draught')),
  glowcap_tincture: potion(CAP, liquid('tincture')),
  midnight_oil: potion(WICK, liquid('midnight')),
};

function pick(legend: Legend, keys: string): Legend {
  return Object.fromEntries([...keys].map((k) => [k, legend[k]!]));
}

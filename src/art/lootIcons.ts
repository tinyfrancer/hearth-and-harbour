/**
 * Icons for what monsters drop and what is made of it (S8's items, drawn in
 * B5): a hide, feathers, a pearl, a tin of tea and a trollstone; leather and
 * the hunter's leather set; the footpad's cudgel and the smuggler's cutlass.
 * Drawn by hand as rows of characters, like the other icons.
 *
 * Leather sits on the gear ladder between linen and bronze, a hunter's or a
 * woodsman's: the `tan` ramp, with linen lacing and no metal.
 */
import type { Legend } from './grid';
import type { IconDef } from './iconKit';

const L: Legend = {
  F: 'hide1',
  X: 'hide2',
  '#': 'hide3',
  k: 'oakbark1',
  K: 'oakbark2',
  q: 'oakbark3',
  j: 'wood1',
  W: 'wood2',
  o: 'wood3',
  O: 'wood4',
  s: 'stone1',
  S: 'stone2',
  t: 'stone3',
  w: 'white1',
  e: 'plaster1',
  E: 'plaster2',
  p: 'shell1',
  P: 'shell2',
  d: 'shelldark1',
  D: 'shelldark2',
  M: 'metal1',
  m: 'metal2',
  n: 'metal3',
  x: 'shade1',
  r: 'red1',
  R: 'red2',
  Z: 'red3',
  g: 'pine1',
  G: 'pine2',
  f: 'leather1',
  y: 'slate1',
  Y: 'slate2',
  u: 'slate3',
  a: 'tan1',
  b: 'tan2',
  c: 'tan3',
  l: 'linen1',
  L: 'linen2',
};

// A raw pelt, stretched: four legs and a tail, fur in strokes, the militia's
// cool hide before it is tanned.
const HIDE: readonly string[] = [
  '..X#............X#',
  '.XFX#..........XX#',
  '.XFFXX#XXXXXXXXXX#',
  '..XFFXXXXXFXXXXX#',
  '...XFXFXXXXFXXX#',
  '...XFXXFXXXXXXX#',
  '..XFXXXXXXFXXX#X#',
  '.XFXFXXXXXXFXXXXX#',
  '.XFXXFXXX#XXXXX#X#',
  '.XFXXXXXXX#XXXXXX#',
  '..XFXXFXXXXXXX#X#',
  '...XFXXFXXXX#XX#',
  '...XFXXXXXXXXXX#',
  '..XFFXXXXX#XXXX##',
  '.XFFXX#XXXXX##XX#',
  '.XFX#.....#....X#',
  '..X#...........##',
];

// A gull's white feather with a grey one behind, quills down and to the left.
const FEATHERS: readonly string[] = [
  '................ss',
  '..............swws',
  '.............swwwS',
  '............swwwwS',
  '...........swwEwS',
  '..........swwEwwS',
  '.....tt..swwEwwS',
  '....tSSSsswEwwSS',
  '...tSSSSswEwwS',
  '..tSSSSswEwwSS',
  '..tSSStsSEwwS',
  '.tSSSt.sEswS',
  '.tSSt.sEwSS',
  '.tSt.sEtS',
  '.tt..Et.',
  '.t..E',
  '.t.E',
  '..E',
  '.E',
  'E',
];

// A pearl in an open oyster: rough grey valves, pearly pink inside, the pearl
// round and white with its shine to the upper left.
const PEARL: readonly string[] = [
  '......tttttttt',
  '....ttSqSSSSqSSt',
  '...tSqSSSSSSSSqSt',
  '..tSPPPPPPPPPPPPSt',
  '..tPPPPpwwppPPPPPt',
  '...tPPpwwwpppPPPt',
  '....tPpwwppppPPt',
  '.....dpwpppppPd',
  '..ttPdpppppppPdPtt',
  '.tSPPPdppppPPddPPSt',
  'tSPPPPPddddddPPPPPSt',
  'tSSqSSSSqSSSSqSSSqSt',
  '.ttSSSSSSSSSSSSSSStt',
  '...ttttttttttttttt',
];

// A tea tin with no duty paid: a red label with a leaf, a lid sealed with tar.
const SMUGGLED_TEA: readonly string[] = [
  '....xxxxxxxx',
  '..xsssssSSSSx',
  '.xsMMMMmmmmSnx',
  '.ssssSSSSSSStt',
  '.xmmmmmmmmnnnx',
  '..smmmmmmmnnn',
  '..rrrrRRRRRZZ',
  '..rrggrRRRRZZ',
  '..rgGGrRRRRZZ',
  '..rrgGRRRRRZZ',
  '..rrrrRRRRRZZ',
  '..smmmmmmmnnn',
  '..smmmmmmmnnn',
  '..smmmmmmmnnn',
  '..smmmmmmmnnn',
  '..ttttttttttt',
];

// A smooth grey pebble on a thong, a pale mark scratched in it.
const TROLLSTONE: readonly string[] = [
  '.#..............#',
  '..#............#',
  '...#..........#',
  '....#........#',
  '.....#......#',
  '......#....#',
  '.......#..#',
  '.......####',
  '.....sssssSSt',
  '....swwssSSSSt',
  '...swssssSSSStt',
  '...sssSSeSSSStt',
  '...ssSSeSeSSStt',
  '...sSSSSeSSSttt',
  '....SSSSSSSStt',
  '.....tttttttt',
];

// Tanned leather, rolled and tied with a thong: the hide's tan, finished.
const LEATHER: readonly string[] = [
  '...........aaab',
  '.........aaaabbbc',
  '.......aaaaaabbbbc',
  '.....aaaaaaa#bbbbc',
  '...aaaaaaaa#Xbbbbc',
  '..aaaaaaaa#Xbbbbc',
  '.abbaaaaa#Xbbbbc',
  'abaababa#Xbbbbc',
  'abcbabb#Xbbbbc',
  'abccaa#Xbbbbc',
  'abbaa#Xbbbbc',
  '.abb#Xbbbbc',
  '..a#Xbbbbc',
  '...#bbbbc',
  '....cccc',
];

// A snug hunter's cap with ear flaps and a stitched seam over the crown.
const LEATHER_CAP: readonly string[] = [
  '.......aaab',
  '.....aaaalbbc',
  '....aaaaalbbbc',
  '...aaaaaalbbbbc',
  '..aaaaaaalbbbbbc',
  '..aaaaaaalbbbbbc',
  '.aaaaaaaalbbbbbbc',
  '.ccccccccccccccccc',
  '.ab............bc',
  '.ab............bc',
  '.ab............bc',
  '.abc..........cbc',
  '..ac..........cc',
];

// A tan jerkin, laced up the front with linen cord, belted, its hem cut in tabs.
const LEATHER_JERKIN: readonly string[] = [
  '...aaab.....abbb',
  '..aaaaab...abbbbc',
  '.aaaaaaablbbbbbbbc',
  '.aaaaaaabLbbbbbbbc',
  '.aaaaaaalblbbbbbbc',
  '...aaaaabLbbbbbc',
  '...aaaaalblbbbbc',
  '...aaaaabLbbbbbc',
  '...aaaaalblbbbbc',
  '...aaaaabbbbbbbc',
  '...ffffffffffffc',
  '...aaaaabbbbbbbc',
  '...aaaaabbbbbbbc',
  '..aaaaaabbbbbbbbc',
  '..ababababcbcbcbc',
];

// A pair of cuffs laced up the front, the lace ends hanging below.
const LEATHER_BRACERS: readonly string[] = [
  '...........abbbbb',
  '..........acccccbb',
  '.........aaaaaaabbc',
  '..abbbbb.aaalaaabbc',
  '.acccccbbaalalaabbc',
  'aaaaaaabbcaalaaabbc',
  'aaalaaabbcaalalabbc',
  'aalalaabbcaaalaabbc',
  'aaalaaabbcaalalabbc',
  '.aalalabbcaaalaabbc',
  '.aaalaabbc.alalabc',
  '.aalalabbc.aalaabc',
  '.aaalaabbc.aabbbbc',
  '..alalabc...cl.lcc',
  '..aalaabc....l.l',
  '..aabbbbc...l...l',
  '...cl.lcc',
  '....l.l',
  '...l...l',
];

// A length of oak, thick and knotted at the business end, the grip bound in
// leather.
const CUDGEL: readonly string[] = [
  '............kkk',
  '..........kkkKKq',
  '.........kkKjKKKq',
  '........kkKjjoKKKq',
  '........kKKjoKKKqq',
  '.......kkKKKKKKKqq',
  '.......kKKKKKKKqq',
  '......kKKKKKKKqq',
  '......kKKKKKqqq',
  '.....kKKKKKqq',
  '.....kKKKqq',
  '....kKKKq',
  '....kKKq',
  '...kKKq',
  '...kKq',
  '..fXq',
  '..fX#',
  '.fX#',
  '.fX#',
  'kKq',
  'Kq',
];

// A wide curved blade of good steel, edged in white where it catches the light,
// with a dark guard and a leather grip. A shade finer than its tier: the
// polish, never gold, which belongs to tier 2.
const SMUGGLERS_CUTLASS: readonly string[] = [
  '...................w',
  '..................wM',
  '................wwMn',
  '..............wwMmn',
  '............wwMMmn',
  '..........wwMMmmn',
  '........wwMMmmnn',
  '.......wMMmmnn',
  '......wMmmnn',
  '.....wMmnn',
  '..yy.wMn',
  '.yYuwMn',
  '.YufMn.',
  'yYf#u',
  'Yf#.u',
  'f#.u',
  'yYu',
  'Yu',
];

export const LOOT_ICON_DEFS: Readonly<Record<string, IconDef>> = {
  hide: { rows: HIDE, legend: L },
  feathers: { rows: FEATHERS, legend: L },
  pearl: { rows: PEARL, legend: L },
  smuggled_tea: { rows: SMUGGLED_TEA, legend: L },
  trollstone: { rows: TROLLSTONE, legend: L },
  leather: { rows: LEATHER, legend: L },
  leather_cap: { rows: LEATHER_CAP, legend: L },
  leather_jerkin: { rows: LEATHER_JERKIN, legend: L },
  leather_bracers: { rows: LEATHER_BRACERS, legend: L },
  cudgel: { rows: CUDGEL, legend: L },
  smugglers_cutlass: { rows: SMUGGLERS_CUTLASS, legend: L },
};

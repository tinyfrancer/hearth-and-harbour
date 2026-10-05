/**
 * Item icons, drawn by hand as rows of characters, family by family. Each
 * family shares a drawing or a way of drawing so its members read as kin,
 * and differs by design: bark and wood, raw and cooked, bronze and iron.
 * Ids are the game's item ids, kept here as plain strings (art knows nothing
 * about the game's tables).
 */
import type { IconDef } from './iconKit';
import { recolour } from './iconKit';
import type { Legend } from './grid';

// ---------------------------------------------------------------------------
// Logs: two logs stacked, cut ends to the left showing their rings. The three
// woods differ by bark (a, b, c, d: light to darkest) and by the colour of the
// cut wood (e, f: light and ring; g the heart).
const LOGS: readonly string[] = [
  '.......bbbaaaaaaaaaaa',
  '......beeebaaaaaaaaaaa',
  '.....beeeeebaaabaaaaba',
  '.....befffecbbbbbbcbbb',
  '.....befgfecbbcccbbbbb',
  '.....befffecbbbbbbbccb',
  '.....beeeefccbcccccccc',
  '......cefeccccccccccc',
  '.......cccdddddddddd',
  '..bbbaaaaaaaaaaaaaa',
  '.beeebaaaaaaaaaaaaaa',
  'beeeeebaaaabaaaaabaa',
  'befffecbbbbbbbbcbbbb',
  'befgfecbbcccbbbbbbbb',
  'befffecbbbbbbbbbbccb',
  'beeeefccbbcccccccccc',
  '.cefecccccccccccccc',
  '..cccddddddddddddd',
];

const logs = (legend: Legend): IconDef => ({ rows: LOGS, legend });

// ---------------------------------------------------------------------------
// Fish, facing left. Raw fish are cool and silver with a dark eye; cooked
// fish are the same fish browned, with grill marks and the eye gone white.
const HERRING: readonly string[] = [
  '.....ccccccc.......cc',
  '...ccdddddddcc....cdd',
  '..cdddddddddddddc.cdd',
  '.cwkddgdddddddddddcd.',
  'cdbbbbgbbbbbbbbbbbd..',
  '.aaaaagaaaaaaaaaabgg.',
  '..aaagaaaaaaaaab..ggg',
  '...bbaaaaaaabb....bgg',
  '.....bbbbbbb.......gg',
];

const COOKED_HERRING: readonly string[] = [
  '.....ccccccc.......cc',
  '...ccddddmddcm....cdd',
  '..cdddddmdddmdddm.cdd',
  '.cwwddgdmdddmdddmdcd.',
  'cdbbbbgmbbbmbbbmbbd..',
  '.aaaaagmaaamaaamabgg.',
  '..aaagmaaamaaamb..ggg',
  '...bbamaaamabb....bgg',
  '.....bbbbbbb.......gg',
];

const COD: readonly string[] = [
  '.......ddd..ddd',
  '.....cccccccccc....dd',
  '...ccceccccccecc..ddd',
  '.cwkccgcccecccccedddd',
  'cccccgcccccccccceddd',
  'aaaaagaaaaaaaaaabddd',
  '.aaaaaaaaaaaaaab.dddd',
  '..bbaaaaaaaaabb...ddd',
  '...ddbbbbbbbbd.....dd',
  '......dd...dd',
];

const COOKED_COD: readonly string[] = [
  '.......ddd..ddd',
  '.....cccmcccmcc....dd',
  '...cccemcccmcecm..ddd',
  '.cwwccgmccemcccmedddd',
  'cccccgmcccmcccmceddd',
  'aaaaagmaaamaaamabddd',
  '.aaaamaaamaaamab.dddd',
  '..bbamaaamaaamb...ddd',
  '...ddbbbbbbbbd.....dd',
  '......dd...dd',
];

const SHRIMP: readonly string[] = [
  't......aa',
  '.t..aaacaab',
  '..aaaaacaabbc',
  '.aaaaaacaabbcb',
  '.aaaaabcbbbcbbc',
  'aaaaab...bbbbbc',
  'akaab.....bbbbc',
  'aaabb.....bbbbc',
  '.bbb......ccccc',
  '.l.l......bbbbc',
  '..l.l....bbbcbc',
  '........bbbcbc',
  '........bbcbcc',
  '......cbbbbc',
  '....cbcbcbc',
  '...c.c.c',
];

const RAW_FISH: Legend = {
  a: 'scales1',
  b: 'scales2',
  g: 'scales3',
  c: 'herring1',
  d: 'herring2',
  w: 'white1',
  k: 'ink1',
};

const RAW_COD: Legend = {
  a: 'plaster1',
  b: 'plaster2',
  c: 'cod1',
  d: 'cod2',
  e: 'cod3',
  g: 'cod3',
  l: 'plaster1',
  w: 'white1',
  k: 'ink1',
};

const COOKED_FISH: Legend = {
  a: 'cooked1',
  b: 'cooked2',
  c: 'cooked2',
  d: 'cooked3',
  e: 'cooked3',
  g: 'cooked3',
  l: 'cooked1',
  m: 'cooked4',
  w: 'plaster1',
};

// ---------------------------------------------------------------------------
// Ore: a lump of rock, lit on its upper left face, with what makes it ore
// showing in it. Copper is warm grey stone with a green crust and red-gold
// glints; tin is cool grey with pale crystals; iron is a rust-brown block.
const COPPER_ORE: readonly string[] = [
  '.....aaggaa',
  '...aagGGgaaaa',
  '.aaaaaggaaaaaac',
  'aaggaaaaaaaaaccc',
  'bbGgaaaaaaaaOcocc',
  'bbbbbaaaaaacccOcc',
  'bbobbbbbbbcccccccc',
  'bbObbbbbbbccccoccc',
  'bbbbbbggbbccccOccc',
  '.bbbbbGgbbccccccc',
  '..bbbbbbbbcccccc',
  '...bbbbbbbccccc',
];

const TIN_ORE: readonly string[] = [
  '.......x',
  '......xy.x',
  '.....xxyxy',
  '...aaxyyxyaa',
  '.aaaaaxyyaaaac',
  'aaaaaaaaaaaaaccc',
  'bbaaaaaaaaaacccc',
  'bbbbbaaaaaacccccc',
  'bbxybbbbbbcccxccc',
  'bbyybbbbbbccyyccc',
  'bbbbbbbbbbcccccccc',
  '.bbbbbbbbbccccccc',
  '..bbbbbbbbcccccc',
  '...bbbbbbbccccc',
];

const IRON_ORE: readonly string[] = [
  '.....aaaaaa',
  '...aaaayaaaaa',
  '.aaxaaaaaaaaaac',
  'aaaaaaaaayaaaccc',
  'bbaaaaaaaaaacccc',
  'bbbbbaaaaaaccxccc',
  'bbbbbbbybbcccccccc',
  'bybbbbbbbbccycccc',
  'bbbbbxbbbbcccccxcc',
  '.bbbbbbbbbcyccccc',
  '..bbbybbbbcccccc',
  '...bbbbbbbccccc',
];

// ---------------------------------------------------------------------------
// Bars: an ingot from the mould, its top face catching the light.
const BAR: readonly string[] = [
  '.....hhhhhhhhhhhh',
  '....hzzaaaaaaaaaab',
  '...hzaaaaaaaaaaaabb',
  '..haaaaaaaaaaaaaabbc',
  '.dbbbbbbbbbbbbbbbbcc',
  'ddbbbbbbbbbbbbbbbbcc',
  'ddbbbbbbbbbbbbbbbccc',
  '.dbbbbbbbbbbbbbbbcc',
  '..cccccccccccccccc',
];

// ---------------------------------------------------------------------------
// Forage.
const SEASHELLS: readonly string[] = [
  '....aapadd',
  '..paaapaddpd',
  '.apaaapaddpdd',
  'aaapaapadpddd',
  'aaapaapadpddd',
  'aaaapapapdddd..aa',
  '.aaapapapddd..aapd',
  '..aaapppddd...apdd',
  '...aaapadd...aapdD',
  '...dDaapdDd..apddD',
  '...DDDdDDD....pdD',
  '..............dD',
  '...............D',
];

const FLAX: readonly string[] = [
  '..u...U...u..',
  '.uUu.uUu.uUu.',
  '..u.G.u.G.u..',
  '..g.G.g.G.g..',
  '...gG.g.Gg...',
  '...gGggGGg...',
  '....gGgGg....',
  '....gGgGg....',
  '....LLLLL....',
  '....IIIII....',
  '....gGgGg....',
  '....gGgGg....',
  '...gGg.GgG...',
  '...gG.g.GG...',
  '..gG..g..GG..',
  '..g...g...G..',
];

const SAGELEAF: readonly string[] = [
  '..........aab..',
  '.........aabbc.',
  '....aab..abbc..',
  '...aabbc.abc...',
  '...abbbc.sc....',
  '....abc.s...aa.',
  '.....bcs...aabb',
  '.......s..aabbc',
  '..aab..s.abbbc.',
  '.aabbc.sabbc...',
  '.abbbcs.bcc....',
  '..bcc.s........',
  '.....s.........',
  '....s..........',
  '...s...........',
];

const GLOWCAP: readonly string[] = [
  '.....aaaaa........',
  '...aaaaaaabb......',
  '..aaaabaaabbb.....',
  '.aaaaaaaabbbbc....',
  '.aabaaaaabbbcc....',
  'aaaaaaaabbbbccc...',
  'cccccccccccccc....',
  '....dddde.........',
  '....ddde...aaab...',
  '....ddde..aaabbc..',
  '....ddde.aaaabbcc.',
  '...ddddeecccccccc.',
  '...dddeee..dde....',
  '..dddddee..dde....',
  '..........ddee....',
];

// ---------------------------------------------------------------------------

export const ITEM_ICON_DEFS: Readonly<Record<string, IconDef>> = {
  pine_logs: logs({
    a: 'wood2',
    b: 'wood3',
    c: 'wood4',
    d: 'shade1',
    e: 'pinewood1',
    f: 'pinewood2',
    g: 'wood3',
  }),
  oak_logs: logs({
    a: 'oakbark1',
    b: 'oakbark2',
    c: 'oakbark3',
    d: 'shade1',
    e: 'wood1',
    f: 'wood2',
    g: 'wood3',
  }),
  willow_logs: logs({
    a: 'willowbark1',
    b: 'willowbark2',
    c: 'willowbark3',
    d: 'oakbark3',
    e: 'willow1',
    f: 'willow2',
    g: 'willowbark3',
  }),
  raw_shrimp: {
    rows: SHRIMP,
    legend: { a: 'shrimpraw1', b: 'shrimpraw2', c: 'shrimpraw3', t: 'shrimpraw3', l: 'shrimpraw3', k: 'ink1' },
  },
  raw_herring: { rows: HERRING, legend: RAW_FISH },
  raw_cod: { rows: COD, legend: RAW_COD },
  cooked_shrimp: {
    rows: SHRIMP,
    legend: { a: 'shrimp1', b: 'shrimp2', c: 'shrimp3', t: 'shrimp3', l: 'shrimp3', k: 'ink1' },
  },
  cooked_herring: { rows: COOKED_HERRING, legend: COOKED_FISH },
  cooked_cod: { rows: COOKED_COD, legend: COOKED_FISH },
  copper_ore: {
    rows: COPPER_ORE,
    legend: {
      a: 'cobble1',
      b: 'cobble2',
      c: 'cobble3',
      g: 'verdigris1',
      G: 'verdigris2',
      o: 'copper1',
      O: 'copper2',
    },
  },
  tin_ore: {
    rows: TIN_ORE,
    legend: { a: 'stone1', b: 'stone2', c: 'stone3', x: 'white1', y: 'metal2' },
  },
  iron_ore: {
    rows: IRON_ORE,
    legend: { a: 'rust1', b: 'rust2', c: 'rust3', x: 'metal2', y: 'wood4' },
  },
  bronze_bar: {
    rows: BAR,
    legend: { h: 'bronze1', a: 'bronze2', b: 'bronze3', c: 'bronze4', d: 'bronze2', z: 'bronze5' },
  },
  iron_bar: {
    rows: BAR,
    legend: { h: 'metal1', a: 'metal2', b: 'metal3', c: 'slate3', d: 'metal2', z: 'metal1' },
  },
  seashells: {
    rows: SEASHELLS,
    legend: { a: 'shell1', p: 'shell2', d: 'shelldark1', D: 'shelldark2' },
  },
  flax: {
    rows: FLAX,
    legend: { u: 'blue1', U: 'blue2', g: 'grass2', G: 'pine2', L: 'linen2', I: 'linen3' },
  },
  sageleaf: {
    rows: SAGELEAF,
    legend: { a: 'sage1', b: 'sage2', c: 'sage3', s: 'pine3' },
  },
  glowcap: {
    rows: GLOWCAP,
    legend: { a: 'glowcap1', b: 'glowcap2', c: 'glowcap3', d: 'plaster1', e: 'plaster2' },
  },
};

void recolour;

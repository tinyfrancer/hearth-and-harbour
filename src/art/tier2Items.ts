/**
 * Tier 2's other icons (B19): its woods, fish, ores and bars, forage, cloth
 * and leather, potions, the ranger's leather and bows, jewellery, the new
 * area's drops and what the Thistlewood gives up. Each is drawn beside its
 * tier 1 counterpart and shares its family's drawing where it has one (the
 * logs, the ingot, the vial, the bow, the hide and the roll of leather), so a
 * tier 2 thing reads as the next step of a thing the player already knows.
 */
import type { Legend } from './grid';
import { recolour, type IconDef } from './iconKit';
import { BAR, COPPER_ORE, IRON_ORE, LOGS } from './itemIcons';
import { BOW, CORK, LINEN_CLOTH, WAX, WICK, potion } from './gearIcons';
import { HIDE, LEATHER, LEATHER_BRACERS, LOOT_L } from './lootIcons';
import { CAPTAINS_COAT, POACHERS_LONGBOW } from './grottoIcons';

// ------------------------------------------------------------------ woods

/** Driftwood: one sea-worn branch, bleached and smooth as bone, a fork and two knots, no bark. */
const DRIFTWOOD: readonly string[] = [
  '..................ab',
  '................aabc',
  '...............abbc',
  '..aa..........abbc',
  '..abb........abbc',
  '...abb......abbbc',
  '....abbb..aabbbc',
  '.....abbbabbkbc',
  '......abbbbbbc',
  '.....aabbbbbc',
  '....aabbkbbc',
  '...aabbbbbcc',
  '..aabbbbbcc',
  '.aabbbbbcc',
  'aabbbbcc',
  'abbbccc',
  '.bccc',
];

// ------------------------------------------------------------------- fish

/** The mackerel: slim, a green-blue back with dark wavy bars, a silver-white belly. */
const MACKEREL: readonly string[] = [
  '.....ccccccc.......cc',
  '...cczdzddzdcc....cdd',
  '..cdzdzddzddzddc.cdd.',
  '.cwkdzdddzdddzdddcd..',
  'cdbbbbbbbbbbbbbbbbd..',
  '.aaaaaaaaaaaaaaaabgg.',
  '..aaaaaaaaaaaaab..ggg',
  '....bbbbbbbbbb....bgg',
  '...................gg',
];

/** Two grill marks across a fish and its eye gone white, as the tier 1 cooked fish. */
const grilled = (rows: readonly string[], cols: readonly number[]): string[] =>
  rows.map((row, y) =>
    [...row]
      .map((ch, x) => {
        if (ch === 'k') return 'w';
        const on = cols.some((c) => x === c - Math.floor(y / 3));
        return on && ch !== '.' && ch !== 'w' && y > 1 ? 'm' : ch;
      })
      .join(''),
  );

/** The halibut: a big flatfish seen from above, both eyes on one side, a white fringe of fin. */
const HALIBUT: readonly string[] = [
  '......eeeee',
  '...eeeaaaaaee',
  '..eaaaabaaaaae',
  '.eaWkaaaaaabaae....e',
  '.eaWkaaabaaaaaae..ee',
  'eaaaaaaaaaaabaaaeeee',
  'eaabaaaaabaaaaaaaeee',
  '.eaaaaaaaaaaaabaeeee',
  '.eaaabaaaaaaaaae..ee',
  '..eaaaaabaaaaae....e',
  '...eeeaaaaaaee',
  '......eeeee',
];

/** The swordfish: steel-blue, a tall back fin, a long flat sword of a bill. */
const SWORDFISH: readonly string[] = [
  '..........c',
  '.........ccd',
  '........cccd........c',
  '.......cccdd.......cd',
  '.....ccddddddcc...cd.',
  '...ccwkdddddddddc.cd.',
  'lllcdddddddddddddcd..',
  '...aaaaaaaaaaaaaabgg.',
  '.....aaaaaaaaaab..ggg',
  '.......bbbbbbb.....gg',
];

/** A thick halibut steak seen aslant: its top seared with grill marks round the bone, its white side, the skin. */
const HALIBUT_STEAK: readonly string[] = [
  '.....wwwwwwww',
  '...wwwmwwwmwwvv',
  '..wwwmwwwmwwwmvv',
  '.wwwmwwwbBwwmwwvv',
  'wwwmwwwbBBbwmwwwvv',
  'wwmwwwwwbbwmwwwmvv',
  'wmwwwmwwwwmwwwmwvv',
  'ddddddddddddddddddd',
  'slllllllllllllllls',
  'sllllfllllllfllllls',
  '.sssssssssssssssss',
];

/** A round swordfish steak: seared dark at its rim, the spine at its heart. */
const SWORDFISH_STEAK: readonly string[] = [
  '......dddddd',
  '....ddccccccdd',
  '...dccaaaaaaccd',
  '..dcaaaaaaaaaacd',
  '.dcaaammmaaaaacd',
  '.dcaammaammaaacdd',
  'dcaaamawwamaaaacd',
  'dcaaamawwamaaaacd',
  'dcaaaammmmaaaaccd',
  '.dcaaaaaaaaaaacdd',
  '.dccaaaaaaaaaccd',
  '..dccaaaaaaccdd',
  '...ddccccccdd',
  '.....dddddd',
];

// --------------------------------------------------------------- forage

/** Sea holly: three thistle heads of pale blue on stems over spiky blue-grey leaves. */
const SEA_HOLLY: readonly string[] = [
  '...h.h......h.h',
  '..hHhHh....hHhHh',
  '.h.HHH.h..h.HHH.h',
  '..jHHHj....jHHHj',
  '...jjj......jjj',
  '....L...h.h..L',
  '....L..hHhHh.L',
  '....L.h.HHH.hL',
  '.....L.jHHHjL',
  '.l...L..jjj.L...l',
  '.ll..L...L..L..ll',
  '..lLlL...L..LlLl',
  '.l.lLL...L..LLl.l',
  '...llLL..L.LLll',
  '.l..lLLL.L.LLl..l',
  '..lllLLLLLLLLlll',
  '....llLLLLLLll',
  '......LLLLLL',
];

/** Nettles: a bundle of toothed leaves on dark stalks, tied with a stem. */
const NETTLES: readonly string[] = [
  '..g.....g......g',
  '.gGg...gGg....gGg',
  '..k.....k......k',
  'gGkGg.gGkGg..gGkGg',
  '.gkg...gkg....gkg',
  '..k.....k.....k',
  '.gGkGg.gGkGggGkGg',
  '..gkg...gkg.gkg',
  '...k....k...k',
  '..gGkGg.gkgGkGg',
  '...gkg..gkggkg',
  '....k...k..k',
  '.....k..k.k',
  '......kTTk',
  '......kTTk',
  '.......kk.k',
  '......k.k..k',
  '.....k..k...k',
];

/** Sea-glass: three frosted pebbles of old glass, green, pale blue and white. */
const SEA_GLASS: readonly string[] = [
  '.....aaaa',
  '...aaAaaab',
  '..aAAaaaabb',
  '..aaaaaabbb',
  '...abbbbbb...cccc',
  '....bbbb...ccCcccd',
  '...........cCCcccdd',
  '..eeee.....ccccccdd',
  '.eEEeee.....cddddd',
  'eEEeeeef.....dddd',
  'eeeeeeff',
  '.effff',
];

/** Duskbloom: a violet flower curled open round a glowing heart, on a stem with two leaves. */
const DUSKBLOOM: readonly string[] = [
  '......a...a',
  '....aabaaabaa',
  '...abbbabbbbba',
  '..abbbbcbbbbbca',
  '..abbcGGGcbbbca',
  '.abbcGwwGGcbbcd',
  '.abbcGwGGGcbbcd',
  '.abbbcGGGcbbbcd',
  '..abbbcccbbbccd',
  '...accbbbbbccd',
  '....ddcccccdd',
  '.......sS',
  '..ll...sS...LL',
  '.lllL..sS..LLLL',
  '..llLLLsSLLLL',
  '....LLssSLL',
  '.......sS',
  '.......sS',
];

// ------------------------------------------------------------------- bows

/** The longbow (grottoIcons' poacher's) taken thorny: a spike off its back every few rows. */
const THORNY: readonly string[] = POACHERS_LONGBOW.map((row, y) => {
  if (y % 3 !== 1) return row;
  const i = row.indexOf('k');
  return i > 0 ? `${row.slice(0, i - 1)}x${row.slice(i)}` : row;
});

// ------------------------------------------------------------- the ranger

/** The ranger's hood: deep, its face in shadow, a stitched seam over the crown, a short cape. */
const RANGER_HOOD: readonly string[] = [
  '.......aacaa',
  '.....aaaacabbb',
  '....aaaaacbbbbb',
  '...aaaaabcbbbbbc',
  '..aaaaaxxxxbbbbc',
  '..aaaaxxxxxxbbbc',
  '.aaaaxxxxxxxxbbbc',
  '.aaaaxxxxxxxxbbbc',
  '.aaaaxxxxxxxxbbbc',
  '.aaaaaxxxxxxbbbbc',
  'aaaaaaaxxxxbbbbbcc',
  'aaaaaaabbbbbbbbbccc',
  'aaaaabbbbbbbbbbbcccc',
  'aaabbbbbbbbbbbbbbccc',
  '.aaabbbbbbbbbbbbccc',
  '..cccccccccccccccc',
];

/** The ranger's coat: the captain's coat cut plain in dark leather, belted, a high collar. */
const RANGER_COAT: readonly string[] = CAPTAINS_COAT.map((row, y) =>
  y === 11 ? '.....ffffbBffff' : row,
);

// --------------------------------------------------------------- jewellery

/** A silver bangle seen aslant, a green sea-glass stone set at its front. */
const BANGLE: readonly string[] = [
  '......sssss',
  '....ssSSSSSss',
  '...sSS.....SSs',
  '..sS.........Ss',
  '.sS...........Sv',
  '.s.............v',
  'sS.............Sv',
  'sS.............Sv',
  's..............Sv',
  '.s............Sv',
  '.sS..........SSv',
  '..SSs......sSSv',
  '...SSSsgGGsSSv',
  '....vSgGwGgSv',
  '.....vvgGGvv',
];

/** A gold amulet: a fine chain to a disc with a pale blue sea-glass at its heart. */
const AMULET: readonly string[] = [
  'c...............c',
  '.C.............C',
  '..c...........c',
  '...C.........C',
  '....c.......c',
  '.....C.....C',
  '......cgggc',
  '.....gGGGGGg',
  '....gGGbbbGGh',
  '...gGGbBwbbGGh',
  '...gGbBBbbbbGh',
  '...gGbBbbbbbGh',
  '...gGGbbbbbGGh',
  '....gGGbbbGGh',
  '.....hGGGGGh',
  '......hhhhh',
];

// ----------------------------------------------------- the new area's drops

/** The ogre's maul: a tree-trunk club, its head bound with three rusty iron bands. */
const OGRE_MAUL: readonly string[] = [
  '..............aaab',
  '............aaaabbbc',
  '...........rRaabbbbcc',
  '..........aarRSbbbbcc',
  '.........aaabrRSbbccc',
  '........aaabbbrRSbccc',
  '.......aaabrRbbbrRScc',
  '......aaabbbrRSbbccc',
  '.....aaabbbbbrRSccc',
  '....aabbbrRbbbbccc',
  '...aabbbbbrRSccc',
  '..aabbbbccc',
  '.aabbbccc',
  'aabbccc',
  'abccc',
  '.cc',
];

/** The briar charm: a little wreath of dark thorns round one red berry, on a cord. */
const BRIAR_CHARM: readonly string[] = [
  'l...............l',
  '.l.............l',
  '..l...........l',
  '...l.........l',
  '....ll.....ll',
  '......lllll',
  '.....tTtTtT',
  '....tTx.xTtx',
  '...xT.....Tt',
  '...tT..rr.tT',
  '...Tt.rRRZ.T',
  '...tT.rRZZ.tx',
  '...xT..ZZ.Tt',
  '....tTx..tT',
  '.....TtTtT',
  '......x.x',
];

/** The mossback shield: a rough slab of grey stone grown over with moss, bound with roots. */
const MOSSBACK: readonly string[] = [
  '...ggGgsSSsss',
  '.sggGGGGgSSSSt',
  'sSgGGgGgSSSSSStt',
  'sSSgGgSSSSmSSStt',
  'oOOOOOOOOOOOOOOO',
  'sSSSSSSSSSSgSSStt',
  'sSSmSSSSSSggGSStt',
  'sSSSSSSSSgGGgSStt',
  'sSSSSSSSSSgSSSStt',
  'sSSgSSSSSSSSSmStt',
  'oOOOOOOOOOOOOOOOt',
  'sSgGgSSSSSSSSSStt',
  'sSSgSSSSmSSSSSttt',
  '.sSSSSSSSSSSgStt',
  '.sSSSSSSSSSgGgt',
  '..sSSSSSSSSStt',
  '...ttSSSSSStt',
  '.....tttttt',
];

// ------------------------------------------------- what the Thistlewood gives

/** Amber: a rounded golden nugget with a seed caught in it. */
const AMBER: readonly string[] = [
  '......aaaaa',
  '....aaAAAAaab',
  '...aAwAAAAAabb',
  '..aAwwAAAAAaabb',
  '.aAwAAAAAAAAabbb',
  '.aAAAAAAkkAAabbb',
  'aAAAAAAkKKkAaabbc',
  'aAAAAAAAkKAAaabbc',
  'aAAAAAAAAkAAaabbc',
  'aaAAAAAAAAAaabbcc',
  '.aaAAAAAAAaabbbcc',
  '.aaaAAAAAaabbbcc',
  '..aaaaaaabbbbcc',
  '...bbbbbbbbccc',
  '.....cccccc',
];

/** The cap-guard helm: a broad red mushroom cap with white spots, its gills under it, a chin strap. */
const CAP_HELM: readonly string[] = [
  '......rrrrrrrr',
  '....rrrrwwrrrrRR',
  '..rrwwrrrrrrwwRRR',
  '.rrwwrrrrrrrwwRRRR',
  'rrrrrrrwwrrrrRRRRRZ',
  'rrrrrrwwwwrrRRRRRRZZ',
  'ZZZZZZZZZZZZZZZZZZZZ',
  '..eeeEeeeEeeeEeeeE',
  '...EEEEEEEEEEEEEE',
  '....f..........f',
  '....f..........f',
  '.....f........f',
  '......ffffffff',
];

/** The Badger King's crown: small, battered, three blunt points, one stone missing. */
const CROWN: readonly string[] = [
  '..g......g......g',
  '.gGg....gGg....gGg',
  '.gGGg..gGGGg..gGGh',
  '.gGGGggGGGGGggGGGh',
  '.gGrGGGGGxGGGGbGGh',
  '.gGGGGGGGGGGGGGGh',
  '..gGGGGGGGGGGGGGh',
  '..hhhhhhhhhhhhhhh',
];

// ---------------------------------------------------------------- legends

const COOKED: Legend = {
  a: 'cooked1',
  b: 'cooked2',
  c: 'cooked2',
  d: 'cooked3',
  z: 'cooked4',
  m: 'cooked4',
  g: 'cooked3',
  w: 'plaster1',
  v: 'plaster2',
};

/** Every drawing in this file, by the game's item id. */
export const TIER2_ITEM_DEFS: Readonly<Record<string, IconDef>> = {
  driftwood: { rows: DRIFTWOOD, legend: { a: 'drift1', b: 'drift2', c: 'drift3', k: 'drift4' } },
  elm_logs: {
    rows: LOGS,
    legend: {
      a: 'elmbark1',
      b: 'elmbark2',
      c: 'elmbark3',
      d: 'shade1',
      e: 'elmwood1',
      f: 'elmwood2',
      g: 'elmwood3',
    },
  },
  yew_logs: {
    rows: LOGS,
    legend: {
      a: 'yewbark1',
      b: 'yewbark2',
      c: 'yewbark3',
      d: 'shade1',
      e: 'plaster1',
      f: 'yewheart2',
      g: 'yewheart3',
    },
  },
  raw_mackerel: {
    rows: MACKEREL,
    legend: {
      a: 'white1',
      b: 'scales2',
      c: 'mackerel1',
      d: 'mackerel2',
      z: 'mackerel3',
      g: 'mackerel2',
      w: 'white1',
      k: 'ink1',
    },
  },
  raw_halibut: {
    rows: HALIBUT,
    legend: { a: 'halibut1', b: 'halibut3', e: 'plaster1', W: 'white1', k: 'ink1' },
  },
  raw_swordfish: {
    rows: SWORDFISH,
    legend: {
      a: 'scales1',
      b: 'scales2',
      c: 'swordfish1',
      d: 'swordfish2',
      g: 'swordfish3',
      l: 'swordfish3',
      w: 'white1',
      k: 'ink1',
    },
  },
  cooked_mackerel: { rows: grilled(MACKEREL, [9, 14]), legend: COOKED },
  cooked_halibut: {
    rows: HALIBUT_STEAK,
    legend: {
      w: 'plaster1',
      v: 'cooked1',
      m: 'cooked3',
      d: 'cooked2',
      b: 'plaster2',
      B: 'stone2',
      l: 'plaster2',
      f: 'plaster1',
      s: 'stone2',
    },
  },
  cooked_swordfish: {
    rows: grilled(SWORDFISH_STEAK, [7, 12]),
    legend: { ...COOKED, d: 'cooked4', c: 'cooked2' },
  },
  silver_ore: {
    rows: IRON_ORE,
    legend: {
      a: 'silver2',
      b: 'silver3',
      c: 'silver4',
      r: 'white1',
      R: 'silver1',
      S: 'silver3',
    },
  },
  gold_ore: {
    rows: COPPER_ORE,
    legend: {
      a: 'cobble1',
      b: 'cobble2',
      c: 'cobble3',
      g: 'ingot1',
      G: 'ingot2',
      o: 'ingot2',
      O: 'ingot4',
    },
  },
  silver_bar: {
    rows: BAR,
    legend: { h: 'white1', a: 'silver1', b: 'silver2', c: 'silver4', d: 'silver1', z: 'white1' },
  },
  gold_bar: {
    rows: BAR,
    legend: { h: 'ingot1', a: 'ingot2', b: 'ingot3', c: 'ingot4', d: 'ingot2', z: 'white1' },
  },
  sea_holly: {
    rows: SEA_HOLLY,
    legend: { h: 'holly1', H: 'holly2', j: 'holly3', l: 'holly2', L: 'holly3' },
  },
  nettles: {
    rows: NETTLES,
    legend: { g: 'nettle1', G: 'nettle2', k: 'nettle3', K: 'nettle3', t: 'tan2', T: 'tan3' },
  },
  sea_glass: {
    rows: SEA_GLASS,
    legend: {
      a: 'seaglass1',
      A: 'white1',
      b: 'seaglass2',
      c: 'seaglass3',
      C: 'white1',
      d: 'seaglass4',
      e: 'plaster1',
      E: 'white1',
      f: 'stone1',
    },
  },
  duskbloom: {
    rows: DUSKBLOOM,
    legend: {
      a: 'duskbloom1',
      b: 'duskbloom2',
      c: 'duskbloom3',
      d: 'duskbloom4',
      G: 'glowcap1',
      w: 'white1',
      s: 'pine1',
      S: 'pine2',
      l: 'pine1',
      L: 'pine2',
    },
  },
  nettle_cloth: {
    rows: LINEN_CLOTH,
    legend: { l: 'nettlecloth1', L: 'nettlecloth2', I: 'nettlecloth3' },
  },
  thick_hide: { rows: HIDE, legend: { F: 'thickhide1', X: 'thickhide2', '#': 'thickhide3' } },
  thick_leather: {
    rows: LEATHER,
    legend: {
      ...LOOT_L,
      a: 'thickhide1',
      b: 'thickhide2',
      c: 'thickhide3',
      l: 'linen1',
      X: 'tan2',
      '#': 'tan3',
    },
  },
  holly_tonic: potion(CORK, { a: 'holtonic1', b: 'holtonic2', c: 'holtonic3', r: 'holtonic3' }),
  forgehand_draught: potion(WAX, { a: 'forge1', b: 'forge2', c: 'forge3', r: 'forge3' }),
  duskbloom_tincture: potion(['....pPp', '...pPwPp', '....PPP', '....nnnn'], {
    a: 'dusklight1',
    b: 'dusklight2',
    c: 'dusklight3',
    r: 'dusklight1',
    p: 'duskbloom1',
    P: 'duskbloom2',
    w: 'glowcap1',
  }),
  twilight_elixir: potion(WICK, { a: 'twilight1', b: 'twilight2', c: 'twilight3', r: 'ingot1' }),
  driftwood_shortbow: {
    rows: recolour(BOW, { '<': 'a', '>': 'b' }),
    legend: { a: 'drift2', b: 'drift3', e: 'plaster1', F: 'thorn1', X: 'thorn2' },
  },
  elm_longbow: {
    rows: POACHERS_LONGBOW,
    legend: {
      k: 'elmwood1',
      '&': 'elmwood3',
      t: 'tan2',
      P: 'tan3',
      '=': 'elmwood3',
      e: 'plaster1',
    },
  },
  yew_longbow: {
    rows: POACHERS_LONGBOW,
    legend: {
      k: 'plaster1',
      '&': 'yewheart2',
      t: 'leather1',
      P: 'thorn2',
      '=': 'plaster2',
      e: 'plaster1',
    },
  },
  thornwood_bow: {
    rows: THORNY,
    legend: {
      k: 'thorn1',
      '&': 'thorn2',
      x: 'thorn3',
      t: 'pine1',
      P: 'pine2',
      '=': 'thorn3',
      e: 'plaster1',
    },
  },
  ranger_hood: {
    rows: RANGER_HOOD,
    legend: { a: 'ranger1', b: 'ranger2', c: 'ranger3', x: 'shade1' },
  },
  ranger_bracers: {
    rows: LEATHER_BRACERS,
    legend: { a: 'thickhide1', b: 'thickhide2', c: 'thickhide3', l: 'linen1' },
  },
  ranger_coat: {
    rows: RANGER_COAT,
    legend: {
      u: 'ranger1',
      U: 'ranger2',
      X: 'ranger3',
      y: 'thickhide2',
      Y: 'thickhide3',
      e: 'thickhide1',
      w: 'tan1',
      f: 'thickhide3',
      b: 'tan1',
      B: 'tan2',
    },
  },
  silver_bangle: {
    rows: BANGLE,
    legend: {
      s: 'silver1',
      S: 'silver2',
      v: 'silver4',
      g: 'seaglass1',
      G: 'seaglass2',
      w: 'white1',
    },
  },
  gold_amulet: {
    rows: AMULET,
    legend: {
      c: 'ingot2',
      C: 'ingot3',
      g: 'ingot1',
      G: 'ingot2',
      h: 'ingot4',
      b: 'seaglass3',
      B: 'seaglass4',
      w: 'white1',
    },
  },
  ogre_maul: {
    rows: OGRE_MAUL,
    legend: { a: 'oakbark1', b: 'oakbark2', c: 'oakbark3', r: 'rust1', R: 'rust2', S: 'rust3' },
  },
  briar_charm: {
    rows: BRIAR_CHARM,
    legend: {
      l: 'linen2',
      t: 'thorn1',
      T: 'thorn2',
      x: 'thorn3',
      r: 'red1',
      R: 'red2',
      Z: 'red3',
    },
  },
  mossback_shield: {
    rows: MOSSBACK,
    legend: {
      s: 'stone1',
      S: 'stone2',
      t: 'stone3',
      g: 'grass1',
      G: 'pine2',
      m: 'pine1',
      o: 'oakbark2',
      O: 'oakbark3',
    },
  },
  amber: {
    rows: AMBER,
    legend: {
      A: 'amber1',
      a: 'amber2',
      b: 'amber3',
      c: 'yewheart3',
      k: 'thorn1',
      K: 'thorn2',
      w: 'white1',
    },
  },
  capguard_helm: {
    rows: CAP_HELM,
    legend: {
      r: 'red1',
      R: 'red2',
      Z: 'red3',
      w: 'white1',
      e: 'plaster1',
      E: 'plaster2',
      f: 'leather1',
    },
  },
  badger_crown: {
    rows: CROWN,
    legend: {
      g: 'ingot1',
      G: 'ingot2',
      h: 'ingot4',
      r: 'red2',
      x: 'shade1',
      b: 'seaglass3',
    },
  },
};

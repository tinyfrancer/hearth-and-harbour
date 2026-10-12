/**
 * Heads in profile and from behind (B10b), from the H2 head's rules: a round
 * skull, an ear, a jaw wider than the neck, brows a skin row above the eye,
 * the eye a lid line over a white with the iris at its front, a nose lit on
 * its upper side, a three-row mouth and chin. Every hairstyle in profile and
 * from behind, each split, as at the front, into a crown (what head gear
 * covers) and what hangs; every piece of head gear the same.
 *
 * Profiles face right on the 56 x 72 canvas; `PROFILE_AT` is their top-left,
 * one column back from the front head's, so the skull's middle stays over the
 * neck and the face reaches forward. From behind, rows share the front head's
 * columns (`HEAD_AT`).
 */
import { DEPTH } from '../depth';
import type { Mat } from '../town2/ramps';
import { HEAD_AT } from './body';
import type { Part2, Pins } from './engine';
import { LONG_HOOD, NEW_HAIR, RIM_SIDE, clipFrom } from './hairStyles';
import { mailSpans } from './mail';

export const PROFILE_AT = [HEAD_AT[0] - 1, HEAD_AT[1]] as const;
const [PX, PY] = PROFILE_AT;
const [BX, BY] = HEAD_AT;

/** The bald head in profile, skin, every pixel by hand. */
export const HEAD_SIDE: Part2 = {
  at: [PX, PY],
  depth: 0,
  cast: false,
  // The ear a rim in the skin's shadow round a darker hollow, never the
  // mouth's red (it read as a blush); the jaw a shadow running from under
  // the ear to the chin, the neck set back behind it.
  rows: [
    '.....oosttu.....',
    '...oossssttu....',
    '..ossssssssttu..',
    '.osssssssssssu..',
    '.ssssssssssssst.',
    '.ssssssssssbBBt.',
    '.sssssssssssssu.',
    '.sssstuussssKIt.',
    '.ssssuwussssWIst',
    '.sssstvusssssssu',
    '.tssssuussssssv.',
    '.tsssssssssssvt.',
    '..tttsssssssssu.',
    '...uutttssssstu.',
    '....uuuuttttuv..',
    '.....tuuuvvv....',
    '.....tuuuvw.....',
    '....ttuuuvw.....',
  ],
};

/**
 * The back of the bald head: the skull, both ears, the nape and neck. Turned
 * from the light, it is a step darker than a face and has no features, so a
 * head seen from behind is never taken for one seen from the front.
 */
export const HEAD_BACK: Part2 = {
  at: [BX, BY],
  depth: 0,
  cast: false,
  // The back of the skull, a step darker than a face and featureless but for
  // what a bald head shows from behind (B11, after B10b's read as a plain
  // dome): a lit patch on the crown, the backs of both ears with their rims,
  // the hollow where the skull meets the neck and the neck's two cords. B17:
  // still a dome at true size, so the crown's light is broader, a crease
  // parts each ear from the skull, the shadow side turns darker, and a dark
  // band under the skull's base marks where it meets the neck.
  rows: [
    '...............',
    '....ssstuu.....',
    '..ssooosttuu...',
    '.ssoooossttuuv.',
    '.sooosssttuuuv.',
    '.sssssstttuuuv.',
    'svstttttttuuvwu',
    'tvsttttttuuuvwv',
    'uvtttttttuuuvwv',
    '.vtttttttuuuvv.',
    '..tttttttuuvv..',
    '..utttttuuuvv..',
    '...vvuuuuuvw...',
    '....wvvvvvww...',
    '.....uvuvvw....',
    '.....tuvuvw....',
    '.....tuvuvw....',
    '....ttuvuvww...',
  ],
};

const hair = (
  x: number,
  y: number,
  rows: readonly string[],
  depth: number = DEPTH.HAIR,
): Part2 => ({
  at: [x, y],
  depth,
  mat: 'hair',
  rows,
  cast: true,
});

/** A hairstyle in profile and from behind: crown and hang each way. */
export interface HairViews {
  readonly side: readonly Part2[];
  readonly sideUnder: readonly Part2[];
  readonly back: readonly Part2[];
  readonly backUnder: readonly Part2[];
}

const SHORT: HairViews = {
  side: [
    hair(PX, PY - 1, [
      '.....00112......',
      '...0011111223...',
      '..011111122233..',
      '.01111111222334.',
      '0111111112223334',
      '01112222223..344',
      '0112233.33......',
      '01223...3.......',
      '1223............',
      '1233............',
      '.233............',
      '..34............',
    ]),
  ],
  sideUnder: [],
  back: [
    hair(BX, BY - 1, [
      '.....001112....',
      '...0011111223..',
      '..011111112233.',
      '.01111111122334',
      '.11111111222334',
      '.11121212223334',
      '.1122222222334.',
      '.1222222223334.',
      '..12222223334..',
      '..12223233334..',
      '..2232323334...',
      '...3.3.3.3.....',
    ]),
  ],
  backUnder: [],
};

// Long hair's hang in profile (B11: a dark mass in black): a sheen across it
// below the crown, lit strands down its front edge and partings between
// locks, so it reads as hair in every colour, black included.
const LONG_SIDE_HANG = hair(
  PX - 1,
  PY + 4,
  [
    '01233...........',
    '012334..........',
    '1022344.........',
    '1102344.........',
    '12013344........',
    '12103344........',
    '1221334.........',
    '1223344.........',
    '12123344........',
    '12213344........',
    '12223434........',
    '1213334.........',
    '.122334.........',
    '.12133..........',
    '..1233..........',
    '..123...........',
    '...2............',
  ],
  DEPTH.HAIR,
);
const LONG: HairViews = {
  side: [
    hair(PX, PY - 1, [
      '.....00112......',
      '...0011111223...',
      '..011111112233..',
      '.01111111122334.',
      '0111111112223334',
      '0111222222233.44',
      '0112233..3..3...',
    ]),
    LONG_SIDE_HANG,
  ],
  sideUnder: [LONG_SIDE_HANG],
  back: [
    hair(BX, BY - 1, [
      '.....001112....',
      '...0011111223..',
      '..011111112233.',
      '.01111111122334',
      '.11111111122334',
    ]),
    // B17: a sheen across the hang below the crown, curving down at the sides with the
    // skull, lit strands on the shadow side and partings between locks: black hair from
    // behind was a dark mass.
    hair(BX - 1, BY + 4, [
      '.111122222333444.',
      '.111122222333444.',
      '.111120000033444.',
      '10000011111111223',
      '00011112222222333',
      '01013212322343343',
      '11013212322343344',
      '11013212322343344',
      '11013212322343344',
      '11013212323243344',
      '11013212323243344',
      '11113212323243344',
      '.111221232324444.',
      '.111222232324444.',
      '..1122223233444..',
      '..1122223233444..',
      '...12122333344...',
      '....2.2.3.3.4....',
    ]),
  ],
  backUnder: [
    hair(BX - 1, BY + 6, [
      '.111120000033444.',
      '10000011111111223',
      '00011112222222333',
      '01013212322343343',
      '11013212322343344',
      '11013212322343344',
      '11013212322343344',
      '11013212323243344',
      '11013212323243344',
      '11113212323243344',
      '.111221232324444.',
      '.111222232324444.',
      '..1122223233444..',
      '..1122223233444..',
      '...12122333344...',
      '....2.2.3.3.4....',
    ]),
  ],
};

// B13: the plait bolder (four wide, its lobes lit on alternate sides) and
// longer, gathered at the nape, so the braid reads in profile at true size.
const BRAID_SIDE_PLAIT = hair(
  PX + 1,
  PY + 7,
  [
    '.12.',
    '1223',
    '1233',
    '.234',
    '.123',
    '1223',
    '1233',
    '.234',
    '.123',
    '1223',
    '1233',
    '.234',
    '.123',
    '1223',
    '1233',
    '.234',
    '.123',
    '1223',
    '.55.',
    '1234',
    '1..3',
  ],
  DEPTH.HAIR,
);
const BRAID: HairViews = {
  side: [
    hair(PX, PY - 1, [
      '.....00112......',
      '...0011111223...',
      '..011111112233..',
      '.01111111122334.',
      '011111112223334.',
      '0111122223.33...',
      '01122333........',
      '01223...........',
      '1223............',
      '.2334...........',
    ]),
    BRAID_SIDE_PLAIT,
  ],
  sideUnder: [BRAID_SIDE_PLAIT],
  back: [
    hair(BX, BY - 1, [
      '.....001112....',
      '...0011111223..',
      '..011111112233.',
      '.01111111122334',
      '.11111111122334',
      '.11121212223334',
      '.1112121222334.',
      '..112121223334.',
      '..11212122334..',
      '...122222334...',
      '....1222334....',
    ]),
    hair(BX + 5, BY + 11, [
      '.233.',
      '12332',
      '.233.',
      '12332',
      '.233.',
      '12332',
      '.233.',
      '12332',
      '.233.',
      '12332',
      '.233.',
      '12332',
      '.233.',
      '..5..',
      '.234.',
      '.1.3.',
    ]),
  ],
  backUnder: [
    hair(BX + 5, BY + 11, [
      '.233.',
      '12332',
      '.233.',
      '12332',
      '.233.',
      '12332',
      '.233.',
      '12332',
      '.233.',
      '12332',
      '.233.',
      '12332',
      '.233.',
      '..5..',
      '.234.',
      '.1.3.',
    ]),
  ],
};

// B13: shaggy in profile had read as short hair; now tufts stand up off the
// crown and out behind, and a long ragged nape falls over the ear and collar.
const SHAGGY_SIDE_HANG = hair(PX - 2, PY + 2, [
  '.1...............',
  '01...............',
  '.1...............',
  '012..............',
  '.1223..2.........',
  '.12233.23........',
  '.122333.3........',
  '.1223334.........',
  '.1223334.........',
  '0.22334..........',
  '.1.2334..........',
  '...234...........',
  '...3.4...........',
]);
const SHAGGY_TUFTS = hair(PX + 3, PY - 4, ['.0.....1.', '012..0122']);
const SHAGGY: HairViews = {
  side: [
    hair(PX, PY - 2, [
      '....0.01.12.....',
      '...0011112.23...',
      '..001111122233..',
      '.0111111112223..',
      '011111111222334.',
      '0111111122233344',
      '011122222233.334',
      '0112233.3.3..3..',
    ]),
    SHAGGY_SIDE_HANG,
    SHAGGY_TUFTS,
  ],
  sideUnder: [SHAGGY_SIDE_HANG],
  back: [
    hair(BX, BY - 2, [
      '....0.01.12.3..',
      '...0011112.233.',
      '..0011111222334',
      '.01111111122234',
      '011111111222334',
      '011112111223334',
      '.1112121222334.',
      '.1121212223334.',
      '.11212122233344',
      '.12222122233344',
      '..1222222333344',
      '..122323233344.',
      '..2.3.2.3.3.4..',
    ]),
  ],
  backUnder: [
    hair(BX, BY + 6, [
      '.1121212223334.',
      '.11212122233344',
      '.12222122233344',
      '..1222222333344',
      '..122323233344.',
      '..2.3.2.3.3.4..',
    ]),
  ],
};

/** What shows of a style under head gear's rim (and what lies over the gear, whole). */
const under = (parts: readonly Part2[]): Part2[] =>
  parts.map((p) => clipFrom(p, RIM_SIDE)).filter((p) => p.rows.some((r) => /[^.]/.test(r)));
/** Laid over head gear: a plait over a hood's back. */
const over = (parts: readonly Part2[]): Part2[] =>
  parts.map((p) => ({ ...p, depth: DEPTH.HAIR_OVER }));

const OLD: Readonly<Record<string, HairViews>> = {
  short: SHORT,
  long: LONG,
  braid: BRAID,
  shaggy: SHAGGY,
};

/**
 * Every hairstyle by the front gear id it stands for, crown and hang. Under
 * head gear (B13) a style shows everything of itself below the rim, as from
 * behind (B10b showed only the long styles' hang in profile, so short hair
 * was bald under a cap); under a hood, what falls out of it, over it.
 */
export const HAIR_VIEWS: Readonly<Record<string, readonly Part2[] | undefined>> = {
  ...Object.fromEntries(
    Object.entries(OLD).flatMap(([id, v]) => [
      [`${id}_hair`, v.side],
      [`${id}_hair_under`, under(v.side)],
    ]),
  ),
  long_hair_hood: [...under(LONG.side), ...LONG_HOOD.side!],
  braid_hair_hood: [...under(BRAID.side), ...over([BRAID_SIDE_PLAIT])],
  ...Object.fromEntries(
    Object.entries(NEW_HAIR).flatMap(([id, d]) => [
      [`${id}_hair`, d.side],
      [`${id}_hair_under`, under(d.under?.side ?? d.side)],
    ]),
  ),
};
export const HAIR_BACKS: Readonly<Record<string, readonly Part2[] | undefined>> = {
  ...Object.fromEntries(
    Object.entries(OLD).flatMap(([id, v]) => [
      [`${id}_hair`, v.back],
      [`${id}_hair_under`, under(v.back)],
    ]),
  ),
  long_hair_hood: under(LONG.back),
  braid_hair_hood: [...under(BRAID.back.slice(0, 1)), ...over(BRAID.backUnder)],
  ...Object.fromEntries(
    Object.entries(NEW_HAIR).flatMap(([id, d]) => [
      [`${id}_hair`, d.back],
      [`${id}_hair_under`, under(d.under?.back ?? d.back)],
    ]),
  ),
};

// ------------------------------------------------------------- head gear

const gear = (
  x: number,
  y: number,
  mat: Mat,
  rows: readonly string[],
  pins?: Pins,
  depth: number = DEPTH.HELMET,
): Part2 => ({ at: [x, y], depth, mat, rows, pins });

const HIDE: Pins = { x: ['hide', 4], X: ['hide', 5] };
const CORD: Pins = { c: ['linen', 1], C: ['linen', 3] };
/** The knight's helm's gilt brow band (B19). */
const GILT: Pins = { o: ['gold', 0], g: ['gold', 1], G: ['gold', 3], h: ['gold', 4] };

/** Head gear in profile (facing right) and from behind, by gear id. */
export const HEADGEAR_SIDE: Readonly<Record<string, readonly Part2[]>> = {
  bronze_cap: [
    gear(
      PX,
      PY - 2,
      'bronze',
      [
        '.....01122......',
        '...0011112233...',
        '..001111222334..',
        '.00111122223344.',
        '0011111222233344',
        '3022022033223314',
        '.xxxxxxxxxxxxxX.',
      ],
      HIDE,
    ),
  ],
  iron_nasal_helm: [
    gear(PX, PY - 4, 'iron', [
      '.......0........',
      '......102.......',
      '.....11023......',
      '....1120334.....',
      '..111222023344..',
      '.11122220233344.',
      '1111222202333344',
      '0101101101212133',
      '3444444444444455',
      '..............2.',
      '..............2.',
      '..............3.',
      '..............3.',
    ]),
  ],
  // B19: the knight's bascinet in profile: the dome over the crown and down
  // to the nape, the cheek plate over the ear to the jaw, the raised visor
  // standing up and forward over the brow (its snout the furthest thing
  // forward on the head), the aventail down the neck onto the shoulders.
  knight_helm: [
    mailSpans(18, [
      [18, 19, 24],
      [19, 19, 25],
      [20, 19, 27],
      [21, 19, 30],
      [22, 18, 31],
      [23, 18, 32],
      [24, 19, 32],
    ]),
    gear(
      PX - 1,
      PY - 4,
      'saltiron',
      [
        '.......001122',
        '.....00111122233',
        '....0011111222334',
        '...00111111222334',
        '..001111112222334',
        '..011111122223344',
        '.0111111222233344',
        '.1111112222333444',
        '.oggggggggggGGGhh',
        '.1112222333',
        '.1112223334',
        '.111222334',
        '.111222334',
        '.11122334',
        '.1122334',
        '..12234',
      ],
      GILT,
    ),
    // The visor, raised: pivoted at the temple, its snout up and forward.
    gear(PX + 7, PY - 3, 'saltiron', [
      '.....0112',
      '...0011223',
      '.001111223345',
      '0152525253455',
      '.44444444555',
    ]),
  ],
  linen_hood: [
    gear(PX - 1, PY - 2, 'linen', [
      '......11112222...',
      '....111111122222.',
      '...1111111111222.',
      '..1111111111122..',
      '..11111111112223.',
      '.1111111111222.3.',
      '.111111111122....',
      '1111211111223....',
      '1111211111123....',
      '1112211111223....',
      '1112221111223....',
      '1112221111223....',
      '1122222111223....',
      '1122222211223....',
      '.112222211223....',
      '.11222222223.....',
      '..1222222233.....',
    ]),
    gear(
      PX - 1,
      PY + 15,
      'linen',
      [
        '..1112222333.....',
        '.111122223333....',
        '11111222233334...',
        '1111222223333344.',
        '11211222223233444',
        '.12.112.22.3.34..',
      ],
      undefined,
      DEPTH.HELMET - 0.5,
    ),
  ],
  leather_cap: [
    gear(
      PX,
      PY - 1,
      'tan',
      [
        '.....11223......',
        '...11122c233....',
        '..1122222c3334..',
        '.112222222c3344.',
        '1122222222C33344',
        '233333333333444.',
        '12...1223.......',
        '12...1223.......',
        '23...1223.......',
        '.....2334.......',
        '.....c..c.......',
      ],
      CORD,
    ),
  ],
  feathered_hat: [
    gear(
      PX - 4,
      PY - 4,
      'hide',
      [
        'qpP.....................',
        '.qpPP...................',
        '..qqpPP..1122...........',
        '....qqpP112223..........',
        '......qp1222233.........',
        '.......q1122223.........',
        '........rrrrrRR.........',
        '..111112222222223333344.',
        '.33444444444444444455555',
      ],
      { r: ['crimson', 2], R: ['crimson', 4], P: ['linen', 0], p: ['linen', 1], q: ['linen', 3] },
    ),
  ],
  tricorn: [
    gear(
      PX - 3,
      PY - 4,
      'felt',
      [
        '.........rR.........',
        '.......11rR3........',
        'b.....1122r3.......B',
        'bb...1122223.....BB4',
        '1bb..1122223....BB44',
        '11bb.1122223...BB444',
        '111bb112222333BB4444',
        '.111bbbbbbBBBBB444..',
        '..3344444444444.....',
      ],
      { b: ['bronze', 1], B: ['bronze', 3], r: ['crimson', 2], R: ['crimson', 4] },
    ),
  ],
  velvet_cap: [
    gear(
      PX - 1,
      PY - 1,
      'plum',
      [
        '......1122233....',
        '...11122222333...',
        '.11222222223333..',
        '1122222222233334.',
        '1222222222233g45.',
        '3444444444445555.',
      ],
      { g: ['gold', 1] },
    ),
  ],
};

export const HEADGEAR_BACK: Readonly<Record<string, readonly Part2[]>> = {
  bronze_cap: [
    gear(
      BX,
      BY - 2,
      'bronze',
      [
        '.....12034.....',
        '...112203344...',
        '..11222033344..',
        '.1122220333445.',
        '112222203333445',
        '302202203313314',
        '.xxxxxxxxxxxxX.',
      ],
      HIDE,
    ),
  ],
  iron_nasal_helm: [
    gear(BX - 1, BY - 4, 'iron', [
      '........0........',
      '.......102.......',
      '......11023......',
      '.....1120334.....',
      '...11122023344...',
      '..1112222023345..',
      '.111222202333345.',
      '01011011012121334',
      '34444444444445555',
    ]),
  ],
  // B19: the bascinet from behind, its aventail over the nape and the neck.
  knight_helm: [
    mailSpans(18, [
      [16, 19, 37],
      [17, 18, 38],
      [18, 18, 38],
      [19, 18, 38],
      [20, 18, 38],
      [21, 18, 38],
      [22, 17, 39],
      [23, 17, 39],
      [24, 18, 38],
    ]),
    gear(
      BX - 2,
      BY - 4,
      'saltiron',
      [
        '.......0011223',
        '.....0001112233',
        '....001111222334',
        '...00111122223344',
        '..0011111222233344',
        '..0111111222233344',
        '.01111112222233344',
        '.011111122222333445',
        '.111111222223333445',
        '.111112222233334445',
        '.111122222333344455',
        '.111122222333344455',
        '.11122222333344445',
        '.oggggggggggGGGGhh',
      ],
      GILT,
    ),
  ],
  linen_hood: [
    gear(BX - 2, BY - 2, 'linen', [
      '......11112222.....',
      '....11111112222....',
      '...1111111112223...',
      '..111111111122233..',
      '..111111111222333..',
      '.11111111112223334.',
      '.11121111112223334.',
      '111121111122233344.',
      '111221111122233344.',
      '111221111122233344.',
      '112221111222333344.',
      '112221111222333444.',
      '112222111222333444.',
      '112222211222333444.',
      '.11222221122233344.',
      '.11222222222333444.',
      '.11122222223333444.',
      '.11122222223333344.',
      '..1112222223333344.',
      '..1112222223333344.',
    ]),
    gear(
      BX - 3,
      BY + 16,
      'linen',
      [
        '.....1111222333333.....',
        '...11111222223333344...',
        '..1111112222233333444..',
        '.111111122222233333444.',
        '11111112222222333334444',
        '11211122223222333443444',
        '.12.112.223.22.334.344.',
      ],
      undefined,
      DEPTH.HELMET - 0.5,
    ),
  ],
  leather_cap: [
    gear(
      BX,
      BY - 1,
      'tan',
      [
        '.....12233.....',
        '...1122c2334...',
        '.112222c333445.',
        '1122222C2333445',
        '1122222c3333445',
        '233333333334445',
        '12...........45',
        '12...........45',
        '12...........45',
        '12...........45',
        '23...........45',
        '.c...........c.',
      ],
      CORD,
    ),
  ],
  feathered_hat: [
    gear(
      BX - 4,
      BY - 4,
      'hide',
      [
        '.......qp..............',
        '.......qpP.1122........',
        '........qpP2223........',
        '.......1122pP33........',
        '.......11222pP3........',
        '.......1122223q........',
        '.......rrrrrRRR........',
        '.111112222222223333344.',
        '33444444444444444455555',
      ],
      { r: ['crimson', 2], R: ['crimson', 4], P: ['linen', 0], p: ['linen', 1], q: ['linen', 3] },
    ),
  ],
  tricorn: [
    gear(
      BX - 3,
      BY - 4,
      'felt',
      [
        '..........rR.........',
        '.......1122r33.......',
        'b.....112222333....B.',
        'bb...1122222333...BB.',
        '1bb..1122222333..BB4.',
        '11bb.1122222333.BB44.',
        '111bb112222233.BB444.',
        '1111bbb12223BBBB4444.',
        '.1112bbbbbBBBB24444..',
        '..334444444444444....',
      ],
      { b: ['bronze', 1], B: ['bronze', 3], r: ['crimson', 2], R: ['crimson', 4] },
    ),
  ],
  velvet_cap: [
    gear(BX - 1, BY - 1, 'plum', [
      '.....1122233.......',
      '...11122222333.....',
      '..1122222223333344.',
      '.11222222223333444.',
      '.11222222223333444.',
      '.344444444444455555',
    ]),
  ],
};

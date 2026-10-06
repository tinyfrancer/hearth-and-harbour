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
  rows: [
    '...............',
    '....ssstuu.....',
    '..ssssttttuu...',
    '.sssstttttuuuv.',
    '.ssttttttttuuv.',
    '.sttttttttuuuv.',
    '.ttttttttuuuvv.',
    'tttttttttuuuvvu',
    'utttttttuuuuvvv',
    'tttttttttuuuvvu',
    '..tttttttuuvv..',
    '..ttttttuuuvv..',
    '...tttttuuuv...',
    '....tuuuuvv....',
    '.....uvvvvw....',
    '.....tuuvvw....',
    '.....tuuvvw....',
    '....ttuuvvww...',
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

const LONG_SIDE_HANG = hair(
  PX - 1,
  PY + 4,
  [
    '12233...........',
    '122334..........',
    '1223344.........',
    '1223344.........',
    '12233344........',
    '12233344........',
    '1223334.........',
    '1223344.........',
    '12223344........',
    '12223344........',
    '12223344........',
    '1222334.........',
    '.122334.........',
    '.12233..........',
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
    hair(BX - 1, BY + 4, [
      '.1111111111222334',
      '.1121212122223334',
      '.1121212122223334',
      '11212121222233344',
      '11212121222233344',
      '11212121222233344',
      '11212122222233344',
      '11212122222333444',
      '11212122222333444',
      '12212122223333444',
      '12212122223333444',
      '12222222233333444',
      '.122222222333344.',
      '.122222223333344.',
      '..1222222333344..',
      '..1222222333344..',
      '...12223233334...',
      '....2.3.3.3.4....',
    ]),
  ],
  backUnder: [
    hair(BX - 1, BY + 6, [
      '.1121212122223334',
      '11212121222233344',
      '11212121222233344',
      '11212121222233344',
      '11212122222233344',
      '11212122222333444',
      '11212122222333444',
      '12212122223333444',
      '12212122223333444',
      '12222222233333444',
      '.122222222333344.',
      '.122222223333344.',
      '..1222222333344..',
      '..1222222333344..',
      '...12223233334...',
      '....2.3.3.3.4....',
    ]),
  ],
};

const BRAID_SIDE_PLAIT = hair(
  PX + 1,
  PY + 9,
  [
    '.233',
    '1232',
    '.23.',
    '123.',
    '232.',
    '.23.',
    '123.',
    '232.',
    '.23.',
    '123.',
    '232.',
    '.23.',
    '.5..',
    '234.',
    '1.3.',
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

const SHAGGY_SIDE_HANG = hair(PX - 1, PY + 5, [
  '1223..2.........',
  '12233.23........',
  '122333.3........',
  '1223334.........',
  '1223.34.........',
  '.23..4..........',
]);
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

/** Every hairstyle by the front gear id it stands for, crown and hang. */
export const HAIR_VIEWS: Readonly<Record<string, readonly Part2[] | undefined>> = {
  short_hair: SHORT.side,
  long_hair: LONG.side,
  long_hair_under: LONG.sideUnder,
  braid_hair: BRAID.side,
  braid_hair_under: BRAID.sideUnder,
  shaggy_hair: SHAGGY.side,
  shaggy_hair_under: SHAGGY.sideUnder,
};
export const HAIR_BACKS: Readonly<Record<string, readonly Part2[] | undefined>> = {
  short_hair: SHORT.back,
  long_hair: LONG.back,
  long_hair_under: LONG.backUnder,
  braid_hair: BRAID.back,
  braid_hair_under: BRAID.backUnder,
  shaggy_hair: SHAGGY.back,
  shaggy_hair_under: SHAGGY.backUnder,
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

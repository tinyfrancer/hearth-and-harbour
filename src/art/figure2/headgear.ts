/**
 * What is worn on the head at the C scale, every pixel by hand on the head's
 * own rows (`HEAD_AT`, 15 columns, the middle one the face's centre line).
 * Each changes the head's outline (style guide, "Headgear changes the head's
 * outline"): a metal cap sits a pixel proud of the skull with a ridge and a
 * riveted rim, a helm rises to a point, a hood frames the face and lies on the
 * shoulders, a hat has a brim wider than the head. Nothing covers an eye or a
 * brow; under any of them only the hanging part of a hairstyle is worn.
 */
import { DEPTH } from '../depth';
import { HEAD_AT } from './body';
import type { Gear2, Part2, Pins } from './engine';
import type { Mat } from '../town2/ramps';

const { HELMET } = DEPTH;
const [HX, HY] = HEAD_AT;

/** Rows on the head: (dx, dy) from the head's top-left. */
const onHead = (
  dx: number,
  dy: number,
  mat: Mat,
  rows: readonly string[],
  pins?: Pins,
  depth = HELMET,
): Part2 => ({
  at: [HX + dx, HY + dy],
  depth,
  mat,
  rows,
  pins,
});

const HIDE: Pins = { x: ['hide', 4], X: ['hide', 5], h: ['hide', 2], H: ['hide', 3] };

/**
 * The militia's bronze cap: a close dome a pixel proud of the skull, a bright
 * ridge over the crown, a rim of rivets on a dark hide liner. No brim.
 */
const BRONZE_CAP: Gear2 = {
  id: 'bronze_cap',
  slot: 'head',
  parts: [
    onHead(
      0,
      -2,
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
};

/**
 * The town guard's iron helm: a cone rising to a point above the crown, a
 * bright ridge, a riveted band, and a nasal bar down the bridge of the nose,
 * between the eyes and over neither.
 */
const IRON_NASAL_HELM: Gear2 = {
  id: 'iron_nasal_helm',
  slot: 'head',
  parts: [
    onHead(-1, -4, 'iron', [
      '........0........',
      '.......102.......',
      '......11023......',
      '.....1120334.....',
      '...11122023344...',
      '..1112222023345..',
      '.111222202333345.',
      '01011011012121334',
      '34444444444445555',
      '........1........',
      '........1........',
      '........2........',
      '........2........',
      '........3........',
    ]),
  ],
};

/**
 * The villager's linen hood: round over the crown, the face framed in its
 * opening with the forehead in its shadow, the cowl closed under the chin and
 * a short cape over the shoulders.
 */
const LINEN_HOOD: Gear2 = {
  id: 'linen_hood',
  slot: 'head',
  parts: [
    onHead(-2, -2, 'linen', [
      '......11112222.....',
      '....11111112222....',
      '...1111111112223...',
      '..111111111122233..',
      '..111111112222333..',
      '.11122222222222334.',
      '.112tttttttttuu334.',
      '1112...........3344',
      '1112...........3344',
      '1112...........3344',
      '1122...........3344',
      '1122...........3344',
      '1122...........3344',
      '1122...........3344',
      '11222.........33444',
      '.11222.......33344.',
      '.112222.....333444.',
      '.11122223333333444.',
      '..1112222233333444.',
      '..1112222223333344.',
    ]),
    {
      // The cape over the shoulders, a step darker where the cowl's fold falls.
      at: [18, 22],
      depth: HELMET - 0.5,
      mat: 'linen',
      rows: [
        '.....1111222333333.....',
        '...11111222223333344...',
        '..1111112222233333444..',
        '.111111122222233333444.',
        '11111112222222333334444',
        '11211122223222333443444',
        '.12.112.223.22.334.344.',
      ],
    },
  ],
};

/** The hunter's leather cap: snug, a stitched seam over the crown, ear flaps down over the ears. */
const LEATHER_CAP: Gear2 = {
  id: 'leather_cap',
  slot: 'head',
  parts: [
    onHead(
      0,
      -1,
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
      { c: ['linen', 1], C: ['linen', 3] },
    ),
  ],
};

/** A broad felt brim with a red band and a cream plume sweeping back off it. */
const FEATHERED_HAT: Gear2 = {
  id: 'feathered_hat',
  slot: 'head',
  parts: [
    onHead(
      -4,
      -4,
      'hide',
      [
        '.................qp....',
        '.........1122...qpP....',
        '........112223.qpP.....',
        '.......11222233pP......',
        '.......1122223qpP......',
        '.......1122223pP.......',
        '.......rrrrrRRRq.......',
        '.111112222222223333344.',
        '33444444444444444455555',
      ],
      { r: ['crimson', 2], R: ['crimson', 4], P: ['linen', 0], p: ['linen', 1], q: ['linen', 3] },
    ),
  ],
};

/**
 * A black tricorn: its brim turned up into two wings and a corner over the
 * brow, edged in brass, a red feather in the band.
 */
const TRICORN: Gear2 = {
  id: 'tricorn',
  slot: 'head',
  parts: [
    onHead(
      -3,
      -4,
      'felt',
      [
        '.........rR..........',
        '.......11rR33........',
        'b.....1122r33......B.',
        'bb...112222333....BB.',
        '1bb..112222333...BB4.',
        '11bb.112222333..BB44.',
        '111bb11222233..BB444.',
        '1111bbb122233BBB4444.',
        '.1112bbbbbBBBB24444..',
        '..334444444444444....',
      ],
      { b: ['bronze', 1], B: ['bronze', 3], r: ['crimson', 2], R: ['crimson', 4] },
    ),
  ],
};

/** The general store's velvet cap: soft plum velvet slouched to one side, a gold pin at the front. */
const VELVET_CAP: Gear2 = {
  id: 'velvet_cap',
  slot: 'head',
  parts: [
    onHead(
      -1,
      -1,
      'plum',
      [
        '.....1122233.......',
        '...11122222333.....',
        '..1122222223333344.',
        '.11222222223333444.',
        '.1g2222222233334445',
        '.344444444444455555',
      ],
      { g: ['gold', 1] },
    ),
  ],
};

export const HEADGEAR2: readonly Gear2[] = [
  BRONZE_CAP,
  IRON_NASAL_HELM,
  LINEN_HOOD,
  LEATHER_CAP,
  FEATHERED_HAT,
  TRICORN,
  VELVET_CAP,
];

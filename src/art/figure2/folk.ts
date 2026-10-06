/**
 * The townsfolk at the C scale, each a person of their own drawn whole on
 * the figure canvas: the town's three named people by the ids the scene uses
 * today (`smith`, `trader`, `pirate`) and the study's four villagers
 * (`alewife`, `market`, `docker`, `elder`), reworked. Every face and hand is
 * placed by hand, from the hero's H2 head; cloth is shaded by `cloth` and then
 * corrected. Each is told apart by silhouette first (a beard and an apron, a
 * headscarf, a tricorn and a long coat, a bun, a shawl, a flat cap and crossed
 * arms, a stoop and a stick), then by their dyes, and each has something to
 * do with their hands.
 *
 * They are drawn only where they show: people of the town, always seen in
 * their own clothes, not bodies to dress.
 */
import { DEPTH } from '../depth';
import type { TGrid } from '../town2/cells';
import type { Mat } from '../town2/ramps';
import { FIG_H, FIG_W, HEAD_AT } from './body';
import {
  cloth,
  outlineIn,
  recolour,
  runs,
  stack,
  swapMats,
  type Extent,
  type Part2,
  type Pins,
} from './engine';

const rows = (a: number, b: number, x0: number, x1: number): Extent[] =>
  Array.from({ length: b - a + 1 }, (_, i): Extent => [a + i, x0, x1]);

/** A part placed at (x, y), in a material, with pins. */
const at = (
  x: number,
  y: number,
  depth: number,
  rws: readonly string[],
  mat?: Mat,
  pins?: Pins,
  cast = true,
): Part2 => ({
  at: [x, y],
  depth,
  rows: rws,
  mat,
  pins,
  cast,
});
/** A head's rows at the head's place, moved by (dx, dy). Digits are hair. */
const head = (rws: readonly string[], dx = 0, dy = 0, pins?: Pins): Part2 =>
  at(HEAD_AT[0] + dx, HEAD_AT[1] + dy, 60, rws, 'hair', pins, false);

export interface Folk {
  readonly id: string;
  readonly name: string;
  /** Skin and hair ramps their face and hair are drawn in. */
  readonly skin: Mat;
  readonly hair: Mat;
  readonly parts: readonly Part2[];
}

// ---------------------------------------------------------------- the smith

/**
 * Odo Flint, the smith: broad and bald, a full beard, a leather apron over a
 * grey work shirt with the sleeves rolled off thick forearms; his hammer
 * hangs head down from one fist, the other thumb is hooked in his apron
 * string.
 */
const SMITH: Folk = {
  id: 'smith',
  name: 'Odo Flint, smith',
  skin: 'skin',
  hair: 'chestnut',
  parts: [
    head([
      '...............',
      '....sosttu.....',
      '..ssoossstttu..',
      '.ssoossssttuuv.',
      '.sssssssstttuv.',
      '.ss233sss332uv.',
      '.ssssssssttuuv.',
      'stsKIKsstKIKuvu',
      'tusWIWsstWIWuvv',
      'st2sssssttt3uvu',
      '.22ssssttuu34..',
      '.2312333233443.',
      '.22123vvv23443.',
      '..21222223334..',
      '..21222223334..',
      '...222223334...',
      '....2233344....',
      '.....3344......',
    ]),
    // Neck and collar under the beard.
    cloth(
      1,
      'cloth',
      [
        [22, 22, 25],
        [22, 31, 34],
        [23, 21, 35],
      ],
      { steps: [2, 2, 3, 4] },
    ),
    // The shirt's body, broad, and its sleeves rolled above the elbow.
    cloth(2, 'cloth', [...rows(24, 26, 19, 37), ...rows(27, 36, 20, 36), ...rows(37, 44, 21, 35)], {
      turn: 0.66,
    }),
    cloth(3, 'cloth', [[24, 17, 20], ...rows(25, 31, 15, 20), [32, 15, 20]], {
      turn: 0.5,
      hems: [31],
    }),
    cloth(
      3.1,
      'cloth',
      [
        [32, 14, 20],
        [33, 14, 20],
      ],
      { steps: [1, 1, 2, 3], hems: [33] },
    ),
    cloth(
      3,
      'cloth',
      [[24, 36, 39], ...rows(25, 27, 36, 40), ...rows(28, 30, 37, 41), [31, 38, 42]],
      { turn: 0.45, hems: [30] },
    ),
    cloth(
      3.1,
      'cloth',
      [
        [31, 38, 43],
        [32, 38, 43],
      ],
      { steps: [1, 1, 2, 3], hems: [32] },
    ),
    // Forearms: the near one straight down to the fist on the hammer, the far one back to the hip.
    runs(4, [
      ...[34, 35, 36, 37, 38, 39, 40].map((y): [number, [number, string]] => [
        y,
        [14, y < 38 ? 'ssttuv' : 'osttuv'.slice(0, 5)],
      ]),
    ]),
    runs(4, [
      [33, [39, 'sttuv']],
      [34, [38, 'sttuuv']],
      [35, [37, 'sttuv']],
      [36, [36, 'sttuv']],
      [37, [35, 'stuv']],
      [38, [33, 'osstuv']],
      [39, [33, 'tuuuvw']],
      [40, [34, 'uvw']],
    ]),
    // The hammer: its butt above the fist, the haft through it, the head at the knee.
    at(15, 39, 9, ['23', '23'], 'wood'),
    at(15, 41, 10, ['23', '23', '23', '23', '23'], 'wood'),
    at(13, 41, 11, ['.sst.', 'osstv', 'tuuuw', 'sstuv', '.uvw.'], undefined, undefined, false),
    at(15, 46, 9, ['23', '23', '23', '23', '23', '23'], 'wood'),
    at(11, 52, 9, ['.0112233.', '011122334', '122233345', '.3444455.'], 'iron'),
    // The apron: strap, bib, the string tied at the waist, the skirt to the knee.
    at(24, 23, 6, ['1.......3', '1.......3', '1.......4', '1.......4'], 'leather'),
    cloth(
      6,
      'leather',
      [
        ...rows(27, 34, 24, 32),
        [35, 22, 34],
        [36, 22, 34],
        ...rows(37, 46, 21, 35),
        ...rows(47, 55, 20, 36),
      ],
      {
        turn: 0.7,
        folds: [
          [
            [38, 25],
            [40, 25],
            [42, 24],
            [44, 24],
            [46, 24],
            [48, 23],
            [50, 23],
            [52, 23],
            [54, 23],
          ],
          [
            [38, 31],
            [40, 31],
            [42, 32],
            [44, 32],
            [46, 32],
            [48, 33],
            [50, 33],
            [52, 33],
            [54, 33],
          ],
        ],
        hems: [55],
      },
    ),
    runs(
      7,
      [
        [35, [21, 'aaab']],
        [36, [21, 'bbbc']],
        [35, [33, 'abbc']],
        [36, [33, 'bccc']],
      ],
      {
        pins: { a: ['cream', 1], b: ['cream', 2], c: ['cream', 3] },
      },
    ),
    // Trousers below the apron, and boots set square.
    cloth(0, 'umber', [...rows(54, 60, 21, 27), ...rows(54, 60, 29, 35)], { turn: 0.6 }),
    runs(
      1,
      [
        [61, [21, '0122334'], [29, '0122334']],
        ...[62, 63, 64].map((y): [number, [number, string], [number, string]] => [
          y,
          [21, '1222334'],
          [29, '1222334'],
        ]),
        ...[65, 66].map((y): [number, [number, string], [number, string]] => [
          y,
          [20, '12222334'],
          [29, '12222334'],
        ]),
        [67, [20, '11223344'], [29, '11223344']],
        [68, [20, '44444455'], [29, '44444455']],
        [69, [20, '55555555'], [29, '55555555']],
      ],
      { mat: 'leather' },
    ),
  ],
};

// -------------------------------------------------------------- the alewife

const ALE: Pins = { f: ['cream', 0], F: ['cream', 1], i: ['iron', 2], I: ['iron', 4] };

/**
 * The alewife: stout, her hair pulled back into a broad bun low at the back
 * of her head, a madder dress with the sleeves rolled, a work-cream apron
 * with a bib; a foaming tankard in one hand, the other fist on her hip.
 */
const ALEWIFE: Folk = {
  id: 'alewife',
  name: 'The alewife',
  skin: 'skinpale',
  hair: 'chestnut',
  parts: [
    // The bun, behind the head: wider than tall, sitting low at the back.
    at(
      HEAD_AT[0] + 10,
      HEAD_AT[1] + 1,
      1,
      ['..1223..', '.112233.', '1122334.', '1223344.', '.23344..'],
      'hair',
    ),
    head([
      '....0112233....',
      '..00111222334..',
      '.0111122223344.',
      '.1121212233345.',
      '.12sssssssttu4.',
      '.2sbbBsssBbbu4.',
      '.2sssssssttuu4.',
      'stsKIKsstKIKuvu',
      'tusWIWsstWIWuvv',
      'stssssssttttuvu',
      '..ssssstuttuu..',
      '..tsssuvuttuv..',
      '...tssssttuv...',
      '....utttuvv....',
      '.....vwwww.....',
      '.....uvvww.....',
      '.....tuuvw.....',
      '....ttuuvvw....',
    ]),
    // The dress: bodice, the sleeves rolled at the elbow, a full skirt.
    cloth(
      2,
      'madder',
      [
        [22, 23, 25],
        [22, 31, 33],
        [23, 21, 35],
        ...rows(24, 26, 19, 37),
        ...rows(27, 34, 20, 36),
        ...rows(35, 37, 20, 36),
      ],
      {
        turn: 0.66,
      },
    ),
    cloth(
      1,
      'madder',
      [...rows(38, 44, 18, 38), ...rows(45, 52, 17, 39), ...rows(53, 64, 16, 40), [65, 16, 40]],
      {
        turn: 0.68,
        folds: [
          [
            [45, 20],
            [48, 19],
            [51, 19],
            [54, 18],
            [57, 18],
            [60, 18],
            [63, 18],
          ],
          [
            [45, 36],
            [48, 37],
            [51, 37],
            [54, 38],
            [57, 38],
            [60, 38],
            [63, 38],
          ],
        ],
        hems: [65],
      },
    ),
    // Sleeves: the near arm bent to the tankard, the far fist on the hip.
    cloth(3, 'madder', [[24, 16, 20], ...rows(25, 30, 15, 20), [31, 15, 20]], {
      turn: 0.5,
      hems: [31],
    }),
    cloth(3, 'madder', [[24, 36, 40], ...rows(25, 27, 37, 41), ...rows(28, 30, 38, 42)], {
      turn: 0.45,
      hems: [30],
    }),
    runs(4, [
      [32, [15, 'sstu']],
      [33, [15, 'sstuv']],
      [34, [16, 'sstuv']],
      [35, [17, 'sstuv']],
      [36, [18, 'osstu']],
      [37, [19, 'sstuv']],
    ]),
    runs(4, [
      [31, [38, 'sttuv']],
      [32, [38, 'sttuv']],
      [33, [37, 'sttuv']],
      [34, [36, 'stuuv']],
      [35, [35, 'sstuv']],
      [36, [34, 'osstuv']],
      [37, [34, 'tuuuvw']],
      [38, [35, 'uvw']],
    ]),
    // The apron: neck strap, bib, waistband, the skirt to below the knee.
    at(24, 22, 5, ['F.......c', 'F.......c', 'F.......c'], undefined, {
      F: ['cream', 2],
      c: ['cream', 4],
    }),
    cloth(
      5,
      'cream',
      [
        ...rows(25, 34, 24, 32),
        [35, 21, 35],
        [36, 21, 35],
        ...rows(37, 46, 22, 34),
        ...rows(47, 58, 21, 35),
      ],
      {
        steps: [2, 2, 3, 4],
        turn: 0.7,
        hems: [35, 58],
        folds: [
          [
            [38, 25],
            [41, 25],
            [44, 24],
            [47, 24],
            [50, 24],
            [53, 23],
            [56, 23],
          ],
          [
            [38, 31],
            [41, 31],
            [44, 32],
            [47, 32],
            [50, 32],
            [53, 33],
            [56, 33],
          ],
        ],
      },
    ),
    // The tankard: staves and two iron bands, foam on top, the hand round its handle.
    at(
      19,
      33,
      8,
      [
        '.ffFf..',
        'f1122i.',
        'i3333I.',
        '012234I',
        '012234.I',
        '0122345I',
        'i3333I.',
        '012234.',
        '.4444..',
      ],
      'wood',
      ALE,
    ),
    at(23, 37, 9, ['sstv', 'tuuw', 'suvw'], undefined, undefined, false),
    // Boots peeping under the hem.
    runs(
      0,
      [
        [66, [21, '12233'], [30, '12234']],
        [67, [20, '122334'], [30, '122334']],
        [68, [20, '444455'], [30, '444455']],
        [69, [20, '555555'], [30, '555555']],
      ],
      { mat: 'leather' },
    ),
  ],
};

// ---------------------------------------------------------------- the trader

const SCARF: Pins = {
  m: ['mossdye', 1],
  n: ['mossdye', 2],
  p: ['mossdye', 3],
  q: ['mossdye', 4],
  r: ['mossdye', 5],
};
const GOODS: Pins = {
  a: ['crimson', 1],
  A: ['crimson', 3],
  c: ['ochre', 1],
  C: ['ochre', 3],
  f: ['iron', 1],
  F: ['iron', 3],
  g: ['mossdye', 2],
};

/**
 * Mags Fenwick, the trader: auburn hair under a green headscarf knotted at
 * the back, a violet dress with a laced bodice and the sleeves pushed up; a
 * basket of her wares in the crook of one arm, an apple held up in the other
 * hand for whoever is passing.
 */
const TRADER: Folk = {
  id: 'trader',
  name: 'Mags Fenwick, trader',
  skin: 'skin',
  hair: 'auburn',
  parts: [
    // The scarf's knot and tails behind the head.
    at(
      HEAD_AT[0] + 12,
      HEAD_AT[1] + 2,
      1,
      ['.np', 'nnpq', 'npq.', '.pq.', '.pqr', '..qr'],
      undefined,
      SCARF,
    ),
    head(
      [
        '.....mnnnpp....',
        '...mmnnnnppq...',
        '..mmnnnnnpppq..',
        '.mmnnnnnnppppq.',
        '.mnnnnnnnpppqq.',
        '.qqqqqqqqqqqqr.',
        '.2sbbBsssBbbu3.',
        '.2ssssssssttu3.',
        'stsKIKsstKIKuvu',
        'tusWIWsstWIWuvv',
        'stssssssttttuvu',
        '..ssssstuttuu..',
        '..tsssuvuttuv..',
        '.2.tssssttuv.3.',
        '.12.utttuvv.34.',
        '..2..vwwww..3..',
        '.....uvvww.....',
        '.....tuuvw.....',
        '....ttuuvvw....',
      ],
      0,
      -1,
      SCARF,
    ),
    // Bodice with a square neck over the chemise, laced up the front.
    cloth(
      2,
      'violet',
      [[22, 23, 25], [22, 31, 33], [23, 21, 35], ...rows(24, 26, 20, 36), ...rows(27, 37, 21, 35)],
      {
        turn: 0.66,
        fix: [
          [26, 30, 5],
          [28, 31, 5],
          [30, 30, 5],
          [26, 32, 5],
          [28, 33, 5],
          [30, 32, 5],
          [26, 34, 5],
          [28, 35, 5],
          [30, 34, 5],
        ],
      },
    ),
    runs(
      2.5,
      [
        [24, [25, 'FFFFFF'], [31, 'c']],
        [25, [25, 'FFFFFFc']],
        [26, [26, 'FFFFc']],
        [27, [27, 'FFc']],
      ],
      { pins: { F: ['cream', 1], c: ['cream', 3] } },
    ),
    runs(
      2.6,
      [
        [29, [27, 'c.c']],
        [30, [28, 'c']],
        [31, [27, 'c.c']],
        [32, [28, 'c']],
        [33, [27, 'c.c']],
        [34, [28, 'c']],
      ],
      { pins: { c: ['ochre', 1] } },
    ),
    // The skirt, full, to the ankles.
    cloth(
      1,
      'violet',
      [
        ...rows(38, 44, 19, 37),
        ...rows(45, 52, 18, 38),
        ...rows(53, 60, 17, 39),
        ...rows(61, 66, 16, 40),
      ],
      {
        turn: 0.68,
        folds: [
          [
            [39, 23],
            [66, 20],
          ],
          [
            [39, 28],
            [66, 28],
          ],
          [
            [39, 33],
            [66, 36],
          ],
        ],
        hems: [66],
      },
    ),
    // The near arm: sleeve pushed to the elbow, the forearm up to the apple at her chest.
    cloth(3, 'violet', [[24, 17, 20], ...rows(25, 29, 16, 20), [30, 16, 20]], {
      turn: 0.5,
      hems: [30],
    }),
    runs(4, [
      [31, [16, 'sstu']],
      [32, [16, 'stuuv']],
      [31, [20, 'tu']],
      [30, [19, 'stuv']],
      [29, [20, 'stuv']],
      [28, [21, 'sstu']],
      [27, [21, 'sstuv']],
      [26, [21, 'ostuv']],
    ]),
    at(21, 23, 5, ['..g.', '.aaA', 'aaAA', '.AA.'], undefined, GOODS),
    at(21, 25, 6, ['s..t', 'su.v'], undefined, undefined, false),
    // The far arm crooked round the basket on her hip.
    cloth(3, 'violet', [[24, 36, 39], ...rows(25, 29, 36, 40), [30, 37, 41]], {
      turn: 0.45,
      hems: [30],
    }),
    runs(4, [
      [31, [37, 'sttuv']],
      [32, [37, 'sttuv']],
      [33, [37, 'sttuv']],
      [34, [36, 'stuv']],
    ]),
    at(
      33,
      32,
      5,
      [
        '..*......*...',
        '.*.aAcCff.*..',
        '.%aaAccCfFF*.',
        '%&&&&&&&&&&&*',
        '%&*&&*&&*&&*+',
        '&*&&*&&*&&*++',
        '%&*&&*&&*&&*+',
        '&*&&*&&*&&*++',
        '.&*&&*&&*&*+.',
        '..*********..',
      ],
      undefined,
      { ...GOODS, '%': ['wood', 1], '&': ['wood', 2], '*': ['wood', 3], '+': ['wood', 4] },
    ),
    runs(6, [
      [35, [33, 'osstu']],
      [36, [33, 'tuuvw']],
      [37, [34, 'uvw']],
    ]),
    // Boots peeping under the hem.
    runs(
      0,
      [
        [67, [21, '122334'], [30, '122334']],
        [68, [21, '444455'], [30, '444455']],
        [69, [21, '555555'], [30, '555555']],
      ],
      { mat: 'leather' },
    ),
  ],
};

// --------------------------------------------------------------- the captain

const CAPTAIN_PINS: Pins = {
  x: ['felt', 3],
  X: ['felt', 5],
  g: ['gold', 1],
  G: ['gold', 3],
  h: ['gold', 4],
};

/**
 * Captain Corwin Lusk: a black tricorn edged in gold, a patch over one eye
 * (the other looks straight out), a black beard, a long red coat with gold
 * buttons, epaulettes and cuffs; a hook for one hand and a peg for one leg,
 * the other hand resting on his cutlass, point down at his boot.
 */
const PIRATE: Folk = {
  id: 'pirate',
  name: 'Captain Corwin Lusk',
  skin: 'skingolden',
  hair: 'hairblack',
  parts: [
    at(
      HEAD_AT[0] - 3,
      HEAD_AT[1] - 4,
      61,
      [
        '.........ccC.........',
        '.......11cC33........',
        'g.....1122c33......G.',
        'gg...112222333....GG.',
        '1gg..112222333...GG4.',
        '11gg.112222333..GG44.',
        '111gg11222233..GG444.',
        '1111ggg122233GGG4444.',
        '.1112ggggggGGGG24444..',
        '..334444444444444....',
      ],
      'felt',
      { g: ['gold', 1], G: ['gold', 3], c: ['cream', 1], C: ['cream', 3] },
    ),
    head(
      [
        '...............',
        '...............',
        '...............',
        '...............',
        '...............',
        '.ssssxsssBbbuv.',
        '.sssxssssttuuv.',
        'stxxXXsstKIKuvu',
        'xxxXXXsstWIWuvv',
        'st2xXssstttuuvu',
        '.22ssssttuu34..',
        '.2312333233443.',
        '.22123vvv23443.',
        '..21222223334..',
        '..21222223334..',
        '...222223334...',
        '....2233344....',
        '.....3344......',
      ],
      0,
      0,
      CAPTAIN_PINS,
    ),
    at(
      HEAD_AT[0] + 1,
      HEAD_AT[1] + 1,
      59,
      ['..ssosttu..', 'ssoossstttu', 'soossssttuu', 'sssssssttuv'],
      undefined,
    ),
    // Shirt and coat: open over a cream shirt, gold buttons down its edges, to the knee.
    cloth(1, 'cream', [...rows(23, 40, 25, 31)], { steps: [2, 2, 3, 4] }),
    cloth(
      2,
      'crimson',
      [
        [22, 22, 25],
        [22, 31, 34],
        ...rows(23, 25, 19, 37),
        ...rows(26, 37, 20, 36),
        ...rows(38, 46, 19, 37),
        ...rows(47, 54, 18, 38),
      ],
      {
        turn: 0.66,
        folds: [
          [
            [42, 22],
            [54, 20],
          ],
          [
            [42, 34],
            [54, 36],
          ],
        ],
        hems: [54],
        fix: [
          ...[23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40].flatMap(
            (y): [number, number, number][] => [
              [26, y, -1],
              [27, y, -1],
              [28, y, -1],
              [29, y, -1],
              [30, y, -1],
            ],
          ),
        ],
      },
    ),
    runs(
      3,
      [
        ...[24, 27, 30, 33].map((y): [number, [number, string], [number, string]] => [
          y,
          [25, 'g'],
          [31, 'G'],
        ]),
        ...Array.from({ length: 18 }, (_, i): [number, [number, string], [number, string]] => [
          23 + i,
          [24, '3'],
          [32, '3'],
        ]),
      ],
      { mat: 'crimson', pins: CAPTAIN_PINS },
    ),
    // A black belt and its gold buckle.
    runs(
      4,
      [
        [37, [20, 'xxxxxxgggxxxxxxX']],
        [38, [20, 'XXXXXXgGgXXXXXXX']],
      ],
      { pins: CAPTAIN_PINS },
    ),
    // Epaulettes with their fringe.
    at(16, 23, 6, ['..gggg.', '.gGGGGh', 'g.g.g.h', 'g.g.g..'], undefined, CAPTAIN_PINS),
    at(34, 22, 6, ['.gggg..', 'gGGGGh.', 'g.G.G.h', '..G.G.h'], undefined, CAPTAIN_PINS),
    // The near arm hangs to a gold cuff, and a hook.
    cloth(5, 'crimson', [...rows(26, 36, 15, 20)], { turn: 0.5 }),
    runs(
      5.5,
      [
        [37, [14, 'ggGGGh']],
        [38, [14, 'gGGhhh']],
      ],
      { pins: CAPTAIN_PINS },
    ),
    at(14, 39, 5, ['..12', '..12', '..13', '1..3', '12.3', '.233'], 'iron'),
    // The far arm down to his fist on the cutlass's grip, the blade point down by his boot.
    cloth(5, 'crimson', [...rows(25, 34, 36, 41), [35, 36, 40]], { turn: 0.45 }),
    runs(5.5, [[36, [36, 'gGGGh']]], { pins: CAPTAIN_PINS }),
    at(37, 37, 7, ['12', '34'], 'gold'),
    at(36, 39, 8, ['.sst.', 'osstv', 'tuuuw', 'sstuv', '.uvw.'], undefined, undefined, false),
    at(35, 44, 7, ['0122334'], 'gold'),
    runs(
      7,
      Array.from({ length: 20 }, (_, i): [number, [number, string]] => {
        const y = 45 + i;
        const x = 37 + Math.floor(i / 8);
        return [y, [x, i === 19 ? '1' : '013']];
      }),
      { mat: 'iron' },
    ),
    // Trousers; the near leg ends at the knee on a wooden peg, the far one in a boot.
    cloth(0, 'indigo', [...rows(48, 57, 21, 27), ...rows(48, 58, 29, 35)], { turn: 0.6 }),
    at(
      22,
      58,
      1,
      [
        '2223344',
        '.12233.',
        '..123..',
        '..123..',
        '..123..',
        '..123..',
        '..123..',
        '..123..',
        '..123..',
        '..234..',
        '..iiI..',
        '..IIX..',
      ],
      'wood',
      { i: ['iron', 2], I: ['iron', 4], X: ['iron', 5] },
    ),
    runs(
      1,
      [
        [59, [29, '0122334']],
        ...[60, 61, 62, 63, 64].map((y): [number, [number, string]] => [y, [29, '1222334']]),
        [65, [29, '12222334']],
        [66, [29, '12222334']],
        [67, [29, '11223344']],
        [68, [29, '44444455']],
        [69, [29, '55555555']],
      ],
      { mat: 'felt' },
    ),
  ],
};

// ------------------------------------------------------- the market woman

/**
 * The market woman: slim and younger, a black braid over one shoulder, an
 * ochre shawl crossed over a cream blouse and knotted at the chest, where her
 * hand is; an indigo dress; a basket of apples and a loaf hanging from the
 * other fist, its handle through her fingers.
 */
const MARKET: Folk = {
  id: 'market',
  name: 'The market woman',
  skin: 'skingolden',
  hair: 'hairblack',
  parts: [
    head([
      '....0112333....',
      '..00111223334..',
      '.1010112233344.',
      '.1101121223344.',
      '.12ssssssstt34.',
      '.2sbbBsssBbbu4.',
      '.2ssssssssttu4.',
      'stsKIKsstKIKuvu',
      'tusWIWsstWIWuvv',
      'stssssssttttuvu',
      '..ssssstuttuu..',
      '..tsssuvuttuv..',
      '...tssssttuv...',
      '....utttuvv....',
      '.....vwwww.....',
      '.....uvvww.....',
      '.....tuuvw.....',
      '....ttuuvvw....',
    ]),
    at(
      HEAD_AT[0] + 11,
      HEAD_AT[1] + 9,
      62,
      [
        '.12',
        '123',
        '232',
        '.23',
        '123',
        '232',
        '.23',
        '123',
        '232',
        '.23',
        '123',
        '.5.',
        '.24',
        '.1.',
      ],
      'hair',
    ),
    // The blouse at the neck, the dress below the shawl.
    cloth(1, 'cream', [[22, 23, 25], [22, 31, 33], ...rows(23, 26, 22, 34)], {
      steps: [1, 2, 3, 4],
    }),
    cloth(
      1,
      'indigo',
      [
        ...rows(27, 34, 22, 34),
        [35, 22, 34],
        [36, 22, 34],
        ...rows(37, 44, 21, 35),
        ...rows(45, 54, 20, 36),
        ...rows(55, 66, 19, 37),
      ],
      {
        turn: 0.66,
        folds: [
          [
            [38, 24],
            [66, 22],
          ],
          [
            [38, 28],
            [66, 28],
          ],
          [
            [38, 32],
            [66, 34],
          ],
        ],
        hems: [66],
      },
    ),
    runs(
      2,
      [
        [35, [22, '1222222223334']],
        [36, [22, '3333333334445']],
      ],
      { mat: 'leather' },
    ),
    // The far sleeve hanging, and the hand on the basket's handle.
    cloth(2, 'cream', [[24, 35, 37], ...rows(25, 32, 35, 38), [33, 35, 38]], {
      turn: 0.5,
      hems: [33],
    }),
    runs(4, [
      [34, [35, 'sstu']],
      [35, [35, 'sttu']],
      [36, [35, 'tuuv']],
    ]),
    // The shawl: over both shoulders, crossed and knotted at the chest, its two ends hanging.
    at(
      17,
      22,
      4,
      [
        '.....QQz.....zxX.....',
        '...QQQzz.....zxxxX...',
        '..QQQQzzzx...zzxxxxX.',
        '..QQQzzzzx..xzzzxxxX.',
        '..QQzzzzzzx.xzzzzxxX.',
        '..QQzzzzzzxzzzzzzxxX.',
        '..QzzzzzzXQQzXzzzzxX.',
        '..QzzzzzxXQzxXzzzzxX.',
        '..xxxxX.QzX.zxX.xxxX.',
        '........Qz...xX......',
        '........zx....X......',
        '.........x....X......',
      ],
      undefined,
      { Q: ['ochre', 1], z: ['ochre', 2], x: ['ochre', 3], X: ['ochre', 4] },
    ),
    // The near arm: elbow out below the shawl, the hand back up at the knot.
    cloth(
      5,
      'cream',
      [
        [31, 18, 21],
        [32, 18, 21],
        [33, 19, 21],
      ],
      { steps: [1, 2, 3, 4], hems: [33] },
    ),
    runs(5, [
      [28, [24, 'osst']],
      [29, [23, 'sstuv']],
      [30, [22, 'sstu']],
      [31, [22, 'stu']],
      [32, [22, 'tu']],
    ]),
    // The basket hanging from the far fist.
    at(
      32,
      37,
      5,
      [
        '..*....*..',
        '.*.aA.cC*.',
        '%&&&&&&&&*',
        '%&*&&*&&*+',
        '&*&&*&&*++',
        '%&*&&*&&*+',
        '.&*&&*&*+.',
        '..******..',
      ],
      undefined,
      { ...GOODS, '%': ['wood', 1], '&': ['wood', 2], '*': ['wood', 3], '+': ['wood', 4] },
    ),
    runs(
      0,
      [
        [67, [22, '122334'], [30, '122334']],
        [68, [22, '444455'], [30, '444455']],
        [69, [22, '555555'], [30, '555555']],
      ],
      { mat: 'leather' },
    ),
  ],
};

// --------------------------------------------------------------- the docker

/**
 * The docker: broad, a short beard, a flat cap proud of his skull, a moss
 * waistcoat over a linen shirt with the sleeves rolled. His arms are folded:
 * each forearm runs up from its elbow to the other arm, crossing at a slant,
 * the top one's hand gripping the near upper arm, the lower one's fingers
 * showing under the far one.
 */
const DOCKER: Folk = {
  id: 'docker',
  name: 'The docker',
  skin: 'skinbrown',
  hair: 'hairblack',
  parts: [
    head(
      [
        '....mnnnnpp....',
        '..mmnnnnnnppq..',
        '.mmnnnnnnnnppq.',
        'mmnnnnnnnnpppqq',
        'qqqqqqqqqqqqqqr',
        '.ssbbBsssBbbuv.',
        '.ssssssssttuuv.',
        'stsKIKsstKIKuvu',
        'tusWIWsstWIWuvv',
        'stssssssttttuvu',
        '.2ssssstuttu3..',
        '.23ss333444t34.',
        '..33svvvt4434..',
        '...33344444....',
        '....vwwwwww....',
        '....uvvvwww....',
        '...ttuuuvvww...',
        '...ttuuuvvww...',
      ],
      0,
      0,
      { m: ['indigo', 1], n: ['indigo', 2], p: ['indigo', 3], q: ['indigo', 4], r: ['indigo', 5] },
    ),
    // Shirt and waistcoat.
    cloth(1, 'linen', [[22, 23, 25], [22, 31, 33], ...rows(23, 26, 21, 35)], {
      steps: [1, 2, 3, 4],
    }),
    cloth(
      2,
      'mossdye',
      [
        ...rows(27, 37, 20, 36),
        [24, 21, 25],
        [25, 20, 26],
        [26, 20, 27],
        [24, 31, 35],
        [25, 30, 36],
        [26, 29, 36],
      ],
      {
        turn: 0.66,
        fix: [
          [28, 27, 4],
          [28, 28, 5],
          [28, 29, 5],
          [28, 30, 5],
          [28, 31, 5],
          [28, 32, 5],
          [28, 33, 5],
          [28, 34, 5],
          [28, 35, 5],
          [28, 36, 5],
          [28, 37, 5],
        ],
      },
    ),
    runs(
      2.5,
      [
        [36, [27, 'g']],
        [37, [27, 'g']],
      ],
      { pins: { g: ['gold', 2] } },
    ),
    runs(
      3,
      [
        [38, [20, '22222222333334445']],
        [39, [20, '33333333444445555']],
      ],
      { mat: 'leather' },
    ),
    // Upper arms in rolled sleeves.
    cloth(3, 'linen', [[24, 17, 20], ...rows(25, 29, 15, 20), [30, 15, 20], [31, 15, 20]], {
      turn: 0.5,
      hems: [31],
    }),
    cloth(3, 'linen', [[24, 36, 39], ...rows(25, 29, 36, 41), [30, 36, 41], [31, 36, 41]], {
      turn: 0.45,
      hems: [31],
    }),
    // The lower forearm: from the near elbow up across to the far arm, its fingers under it.
    runs(4, [
      [32, [15, 'ssst'], [31, 'sstt'], [35, 'stu']],
      [33, [15, 'ssssstt'], [26, 'sssttt'], [32, 'tttuuu']],
      [34, [16, 'tsssssssttttttttuuuv']],
      [35, [17, 'uuuuuuuuuvvvvvvvvvw']],
    ]),
    // The top forearm: from the far elbow up across to the near arm, the hand round it.
    runs(5, [
      [29, [17, 'osst']],
      [30, [16, 'ssstt'], [21, 'ssst']],
      [31, [16, 'tsstuussssttt'], [29, 'ttt']],
      [32, [17, 'uvvuu'], [22, 'tttttuuuuuuuuu'], [36, 'tuu']],
      [33, [23, 'vvvv'], [33, 'uuuvv'], [38, 'uuv']],
      [34, [36, 'vvvw']],
    ]),
    // Trousers and boots.
    cloth(
      0,
      'umber',
      [
        ...rows(40, 50, 21, 28),
        ...rows(51, 60, 21, 27),
        ...rows(40, 50, 29, 35),
        ...rows(51, 60, 29, 35),
      ],
      {
        turn: 0.6,
        folds: [
          [
            [48, 24],
            [52, 25],
          ],
          [
            [49, 32],
            [53, 31],
          ],
        ],
      },
    ),
    runs(
      1,
      [
        [61, [21, '0122334'], [29, '0122334']],
        ...[62, 63, 64].map((y): [number, [number, string], [number, string]] => [
          y,
          [21, '1222334'],
          [29, '1222334'],
        ]),
        ...[65, 66].map((y): [number, [number, string], [number, string]] => [
          y,
          [20, '12222334'],
          [29, '12222334'],
        ]),
        [67, [20, '11223344'], [29, '11223344']],
        [68, [20, '44444455'], [29, '44444455']],
        [69, [20, '55555555'], [29, '55555555']],
      ],
      { mat: 'leather' },
    ),
  ],
};

// ---------------------------------------------------------------- the elder

/**
 * The old man: stooped, a head lower than the others, his shoulders up round
 * his ears; bald with a grey fringe and a long grey beard; a long umber coat
 * open over a cream shirt; his near fist on the knob of a stick, the other
 * hand in his coat's pocket.
 */
const ELDER: Folk = {
  id: 'elder',
  name: 'The old man',
  skin: 'skindeep',
  hair: 'hairgrey',
  parts: [
    head(
      [
        '...............',
        '....sosttu.....',
        '..ssoossstttu..',
        '.ssoossssttuuv.',
        '.sssssssstttuv.',
        '.2sbbBsssBbbu4.',
        '.2ssssssssttu4.',
        '23sKIKsstKIKu45',
        '23sWIWsstWIWu45',
        '.2sssssstttuu4.',
        '.22ssssttuu34..',
        '.2211222233443.',
        '.22123vvv33443.',
        '..21222223334..',
        '..21222223334..',
        '...222223334...',
        '...122223334...',
        '....2223334....',
        '....2223344....',
        '.....22334.....',
        '......334......',
      ],
      0,
      3,
    ),
    // Shirt, coat and the hunched shoulders.
    cloth(1, 'cream', [...rows(26, 51, 25, 31)], { steps: [2, 2, 3, 4], hems: [51] }),
    cloth(
      2,
      'umber',
      [
        [25, 21, 35],
        ...rows(26, 28, 19, 37),
        ...rows(29, 40, 20, 36),
        ...rows(41, 48, 19, 37),
        ...rows(49, 56, 18, 38),
      ],
      {
        turn: 0.66,
        folds: [
          [
            [44, 22],
            [56, 20],
          ],
          [
            [44, 34],
            [56, 36],
          ],
        ],
        hems: [56],
        fix: Array.from({ length: 31 }, (_, i) => 26 + i).flatMap(
          (y): [number, number, number][] => [
            [26, y, -1],
            [27, y, -1],
            [28, y, -1],
            [29, y, -1],
            [30, y, -1],
            [25, y, 5],
            [31, y, 4],
          ],
        ),
      },
    ),
    // The far arm, its hand in the pocket.
    cloth(3, 'umber', [...rows(27, 36, 36, 40), [37, 35, 39], [38, 34, 38]], {
      turn: 0.45,
      hems: [38],
    }),
    runs(3.5, [[39, [34, '4444']]], { mat: 'umber' }),
    // The near arm, a little forward, down to the stick.
    cloth(3, 'umber', [...rows(27, 34, 16, 20), [35, 15, 19]], { turn: 0.5, hems: [35] }),
    // The stick in front of the arm, the fist over its knob.
    at(14, 36, 5, ['01', '12'], 'wood'),
    at(13, 37, 6, ['.sst.', 'osstv', 'tuuuw', 'sstuv', '.uvw.'], undefined, undefined, false),
    runs(
      5,
      Array.from({ length: 27 }, (_, i): [number, [number, string]] => [
        42 + i,
        [14, i === 26 ? '34' : '23'],
      ]),
      { mat: 'wood' },
    ),
    // Trousers and boots.
    cloth(0, 'cloth', [...rows(50, 60, 21, 27), ...rows(50, 60, 29, 35)], { turn: 0.6 }),
    runs(
      1,
      [
        [61, [21, '0122334'], [29, '0122334']],
        ...[62, 63, 64, 65, 66].map((y): [number, [number, string], [number, string]] => [
          y,
          [21, '1222334'],
          [29, '1222334'],
        ]),
        [67, [20, '11223344'], [29, '11223344']],
        [68, [20, '44444455'], [29, '44444455']],
        [69, [20, '55555555'], [29, '55555555']],
      ],
      { mat: 'leather' },
    ),
  ],
};

export const FOLK2: readonly Folk[] = [SMITH, TRADER, PIRATE, ALEWIFE, MARKET, DOCKER, ELDER];
const drawn = new Map<string, TGrid>();

/** A townsperson drawn and outlined, in their own skin and hair; null for an id with none. */
export function folkGrid(id: string): TGrid | null {
  const folk = FOLK2.find((f) => f.id === id);
  if (!folk) return null;
  let g = drawn.get(id);
  if (!g) {
    g = recolour(
      outlineIn(stack(folk.parts, FIG_W, FIG_H)),
      swapMats({ skin: folk.skin, hair: folk.hair, brow: folk.hair }),
    );
    drawn.set(id, g);
  }
  return g;
}
void DEPTH;

/**
 * Tier 2's knight at the C scale, the approved hero's gear redrawn for the
 * 64-pixel body: polished plate with a ridged breastplate, pauldrons of three
 * lames, couters, vambraces, a fauld and knee cops; the red cloak; the kite
 * shield with its gold cross; the long sword with its gilt guard. Every plate
 * pixel is placed by hand (the study's knight was lit by the automatic bevel;
 * the owner asked for this): a white specular on each plate where the light
 * from the upper left strikes it, the ridge between the lit and shadowed
 * facets, a dark lower edge on every lame where it overlaps the next.
 *
 * Nothing in the game wears these yet; they wait for tier 2's items, as the
 * current knight does.
 */
import { DEPTH } from '../depth';
import { cloth, runs, type Gear2, type Part2, type Pins } from './engine';
import { hold } from './clothes';
import { gripPart, straightBlade } from './held';

const { CLOAK, ARMOUR, LEGS, WRIST, HELD_FRONT, SHIELD } = DEPTH;

const block = (
  x: number,
  y: number,
  depth: number,
  rows: readonly string[],
  pins?: Pins,
): Part2 => ({
  at: [x, y],
  depth,
  mat: 'plate',
  rows,
  pins,
});

const KNIGHT_PLATE: Gear2 = {
  id: 'knight_plate',
  slot: 'body',
  parts: [
    // The breastplate: a medial ridge down the centre line, the left facet
    // catching the light with a white specular high on it, the right in shade.
    block(22, 24, ARMOUR, [
      '..011213344..',
      '.10011133344.',
      '1000111333444',
      '1001121333344',
      '1011221333344',
      '1112221334344',
      '1122221334344',
      '2122221334445',
      '.21222133444.',
      '.22222133444.',
      '.32222334445.',
      '.44444444455.',
    ]),
    // The fauld: two lames below the waist, each lit along its top and dark at its lower edge.
    block(21, 37, ARMOUR, [
      '.01122223333444',
      '.11222223333444',
      '333334444444455',
      '012222223333444',
      '444445555555555',
    ]),
    // Pauldrons, three lames each, wider than the body; the near one a row lower.
    block(15, 24, ARMOUR + 2, [
      '....01223',
      '..0112233',
      '.01122334',
      '011222334',
      '334444445',
      '012223344',
      '444444455',
      '.0223344.',
      '.4445555.',
    ]),
    block(33, 22, ARMOUR + 2, [
      '.0112....',
      '1011223..',
      '10122334.',
      '112223344',
      '344444455',
      '122233445',
      '444455555',
      '.1223344.',
      '.4455555.',
    ]),
    // Couters at the elbows.
    block(16, 33, ARMOUR + 1, ['.0112.', '112334', '.4455.']),
    block(38, 32, ARMOUR + 1, ['.0112', '11234', '.4455']),
    // Vambraces: the far forearm, and the near one in each pose.
    block(36, 35, WRIST, ['..1123', '.11234', '11234']),
    hold(block(16, 35, WRIST, ['.0123', '.1123', '01234'])),
  ],
};

const KNEE_COPS: Gear2 = {
  id: 'knight_knees',
  slot: 'knees',
  parts: [
    block(21, 50, LEGS + 1, ['.01123.', '0011234', '1112334', '.44455.', '.11233.', '.33445.']),
    block(29, 50, LEGS + 1, ['.01123', '011234', '112334', '.4455.', '.1233.', '.3445.']),
  ],
};

/** The red cloak: hung from the shoulders behind, falling in folds nearly to the heels. */
const CLOAK_SHAPE = Array.from({ length: 45 }, (_, i): readonly [number, number, number] => {
  const y = 23 + i;
  const t = Math.sqrt(i / 44);
  return [y, Math.round(21 - 9 * t), Math.round(35 + 9 * t)];
});
const RED_CLOAK: Gear2 = {
  id: 'red_cloak',
  slot: 'cloak',
  parts: [
    cloth(
      CLOAK,
      'crimson',
      CLOAK_SHAPE,
      {
        turn: 0.66,
        folds: [
          Array.from({ length: 36 }, (_, i): [number, number] => [
            31 + i,
            Math.round(19 - 6 * Math.sqrt(i / 35)),
          ]),
          Array.from({ length: 36 }, (_, i): [number, number] => [
            31 + i,
            Math.round(37 + 6 * Math.sqrt(i / 35)),
          ]),
          Array.from({ length: 20 }, (_, i): [number, number] => [
            47 + i,
            Math.round(15 - 2 * Math.sqrt(i / 19)),
          ]),
          Array.from({ length: 20 }, (_, i): [number, number] => [
            47 + i,
            Math.round(41 + 2 * Math.sqrt(i / 19)),
          ]),
        ],
        hems: [67],
        fix: [
          [12, 67, -1],
          [16, 67, -1],
          [17, 67, -1],
          [39, 67, -1],
          [40, 67, -1],
          [44, 67, -1],
        ],
      },
      false,
    ),
    // Clasped over the shoulders: the cloak's edge shows round the collar.
    runs(
      ARMOUR + 1,
      [
        [22, [23, '122'], [31, '334']],
        [23, [22, '1222'], [31, '3344']],
      ],
      { mat: 'crimson' },
    ),
  ],
};

const GOLD: Pins = { g: ['gold', 1], G: ['gold', 3], h: ['gold', 4], o: ['gold', 0] };

/**
 * The kite shield, strapped to the far forearm and hiding its hand: a plate
 * rim, a blue field curving away to the right, a gold cross with a lit edge.
 */
const KITE_SHIELD: Gear2 = {
  id: 'kite_shield',
  slot: 'shield',
  parts: [
    {
      at: [31, 26],
      depth: SHIELD,
      mat: 'blue',
      rows: [
        '.NNNNNNNNNNNNN.',
        'N0112222gG33344',
        'N1122222gG33344',
        'N1222222gG33344',
        'N1222222gG33344',
        'N1222222gG33344',
        'N1222222gG33344',
        'NggggggggGGGGGh',
        'NGGGGGGGGGGhhhh',
        'N1222222gG33344',
        'N1222222gG33344',
        'N2222222gG33344',
        'N2222222gG33344',
        '.N222222gG3334N',
        '.N222222gG3344N',
        '.N222222gG3344N',
        '..N22222gG334N.',
        '..N22222gG344N.',
        '...N2222gG34N..',
        '...N2222gG34N..',
        '....N222gG4N...',
        '.....N22gG4N...',
        '......N2gGN....',
        '.......NNN.....',
      ],
      pins: { ...GOLD, N: ['plate', 3] },
    },
    // The rim's lit edge down the left and along the top.
    {
      at: [31, 26],
      depth: SHIELD + 0.1,
      mat: 'plate',
      rows: [
        '.11111111111112',
        '1',
        '1',
        '1',
        '1',
        '1',
        '1',
        '1',
        '1',
        '1',
        '1',
        '1',
        '1',
        '.1',
        '.1',
        '.1',
        '..1',
        '..1',
        '...1',
        '...1',
        '....1',
        '.....1',
        '......1',
      ],
    },
  ],
};

/**
 * The long sword, raised: the blade to the top of the canvas in polished
 * plate, a gilt guard wider than the fist, a gilt pommel.
 */
const KNIGHT_SWORD: Gear2 = {
  id: 'knight_sword',
  slot: 'weapon',
  parts: [
    straightBlade('plate', { from: 37, tip: 1, per: 6, steps: [1, 0, 3], glint: [6, 7, 8, 9] }),
    { at: [10, 37], depth: HELD_FRONT, mat: 'gold', rows: ['1.........4', '01111222334'] },
    gripPart('leather'),
    { at: [14, 44], depth: HELD_FRONT, mat: 'gold', rows: ['.12.', '1234', '.34.'] },
  ],
};

export const KNIGHT_GEAR: readonly string[] = [
  'knight_plate',
  'knight_knees',
  'red_cloak',
  'kite_shield',
  'knight_sword',
];
export const KNIGHT2: readonly Gear2[] = [
  KNIGHT_PLATE,
  KNEE_COPS,
  RED_CLOAK,
  KITE_SHIELD,
  KNIGHT_SWORD,
];

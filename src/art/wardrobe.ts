/**
 * The posed body and the gear drawn to fit it, in `FIGURE_LEGEND` characters
 * on the 38 x 48 figure canvas. The hero's outfit is harvested from heroFig in
 * the approved mock-up (docs/art-reference/town-mockup.html), split into its
 * pieces; worn together on the standard body it is that figure, pixel for
 * pixel (tests/art/figure.test.ts holds it to that).
 *
 * Light comes from the upper left: left edges take the light step, right
 * edges the dark one. Eyes mirror each other, pupils toward the nose.
 */
import { ARMOURY } from './armoury';
import { DEPTH } from './depth';
import type { BodyDef, FigurePart, GearDef } from './figure';
import { HAIRSTYLE_GEAR } from './hair';
import { TOWNSFOLK_BODIES, TOWNSFOLK_GEAR } from './townsfolk';

const { CLOAK, LEGS, FEET, SHIRT, ARMOUR, HAND, BELT, GRIP, FIST, HELD_FRONT, HAIR, SHIELD } =
  DEPTH;

/**
 * The weapon hand closed on a grip: four fingers' width and three rows deep,
 * below the cuff and the wrist, lit from the upper left. Every held thing is
 * drawn so its grip runs down through these columns (`GRIP`, hidden by the
 * fingers), something of it shows directly above (a guard, a haft, the bow's
 * binding) and something directly below (a pommel, a butt). B5 added it:
 * before, the sleeve ran to the wrist and a guard and a fist-sized grip filled
 * the rows where the hand should be, so no hand showed at all.
 */
export const FIST_PART: FigurePart = { at: [10, 27], depth: FIST, rows: ['sssd', 'ssdd', '.ddd'] };

const STANDARD_BODY: BodyDef = {
  // Standing square to the viewer in linen smallclothes: the left fist
  // closed at the hip (where a held weapon goes), the right hand on the hip
  // (where a shield's straps go). Bald, so any hair can sit on it.
  id: 'standard',
  parts: [
    {
      at: [10, 1],
      depth: 0,
      rows: [
        '......ssssdd',
        '.....sssssssd',
        '....ssssssssdd',
        '....ssssssssdd',
        '....sssssssssd',
        '...dsHHssssHHdd',
        '...dswksssskwdd',
        '....sssssssssd',
        '....ssssddssdd',
        '....sssDDDDsdd',
        '.....sssssssd',
        '......ssssdd',
        '.......dddd',
        '.......sddd',
        '.eeeeeessddeeeEEE',
        'eeeeeeeeeeeeeeEEEE',
        'eeeEeeeeeeeeeEeEEE',
        'eeeE.eeeeeeEE.eEEE',
        'eeeE.eeeeeeEE.eEEE',
        'eeeE.eeeeeeEE.eEEE',
        'eeeE.eeeeeeEE.eEEE',
        'sssd.eeeeeeEE.sddd',
        'sssd..eeeeEE.sddd',
        '.sssd.eeeeEE.sdd',
        '.sssdeeeeeEEsdd',
        '.sssdeeeeeEEsdd',
        '.sssdeeeeeeEE',
        '.....eeeeeeEE',
        '.....eeeeeeEE',
        '....eeeeeeEEEE',
        '....eeeeeeEEEE',
        '....eeeeeeEEEE',
        '....eeeE..eEEE',
        '....eeeE..eEEE',
        '....eeeE..eEEE',
        '....eeEE..eEEE',
        '....sssd..sddd',
        '....sssd..sddd',
        '....sssd..sddd',
        '....sssd..sddd',
        '....sssd..sddd',
        '....sssd..sddd',
        '....sssd..sddd',
        '...sssdd..ssddd',
        '...sssdd..ssddd',
        '...ddddd..ddddd',
      ],
    },
    FIST_PART,
  ],
};

/**
 * The standard body's rows from the elbow down on the weapon side, redrawn so
 * the empty hand rests at the belt instead of hanging closed: the forearm
 * angles in from the elbow and the hand comes to the buckle. Every other row
 * is the standard body's own.
 */
const AT_EASE_ARM: Readonly<Record<number, string>> = {
  22: '.sssd.eeeeEE.sddd',
  23: '..sssdeeeeEE.sdd',
  24: '...sssdeeeEEsdd',
  25: '.....sdeeeEEsdd',
  26: '.....eeeeeeEE',
};

const AT_EASE_BODY: BodyDef = {
  // The standard pose with nothing in the weapon hand.
  id: 'standard_at_ease',
  parts: [
    {
      ...STANDARD_BODY.parts[0]!,
      rows: STANDARD_BODY.parts[0]!.rows.map((row, i) => AT_EASE_ARM[i] ?? row),
    },
    {
      // The hand again, over whatever shirt or armour it rests on.
      at: [13, 25],
      depth: HAND,
      rows: ['sssd', '..sd'],
    },
  ],
};

export const BODIES: readonly BodyDef[] = [STANDARD_BODY, AT_EASE_BODY, ...TOWNSFOLK_BODIES];

export const GEAR: readonly GearDef[] = [
  {
    id: 'short_hair',
    slot: 'hair',
    parts: [
      {
        at: [13, 0],
        depth: HAIR,
        rows: [
          '...hhhhhh',
          '.hhhihhhhhh',
          'hhhiihhhhhHH',
          'hhhhhhhhhhHH',
          'hh.hhh..hhhH',
          'h..........H',
          'h..........H',
          'h..........H',
        ],
      },
    ],
  },
  {
    id: 'red_cloak',
    slot: 'cloak',
    parts: [
      {
        at: [8, 15],
        depth: CLOAK,
        rows: [
          '...cccCCCCCCCCCCCCC',
          '...cccCCCCCCCCCCCCC',
          '...cccCCCCCCCCCCCCC',
          '...cccCCCCCCCCCCCCC',
          '...cccCCCCCCCCCCCCC',
          '..cccCCCCCCCCCCCCCCC',
          '..cccCCCCCCCCCCCCCCC',
          '..cccCCCCCCCCCCCCCCC',
          '..cccCCCCCCCCCCCCCCC',
          '..cccCCCCCCCCCCCCCCC',
          '..cccCCCCCCCCCCCCCCC',
          '..cccCCCCCCCCCCCCCCC',
          '..cccCCCCCCCCCCCCCCC',
          '..cccCCCCCCCCCCCCCCC',
          '.cccCCCCCCCCCCCCCCCCC',
          '.cccCCCCCCCCCCCCCCCCC',
          '.cccCCCCCCCCCCCCCCCCC',
          '.cccCCCCCCCCCCCCCCCCC',
          '.cccCCCCCCCCCCCCCCCCC',
          '.cccCCCCCCCCCCCCCCCCC',
          '.cccCCCCCCCCCCCCCCCCC',
          '.cccCCCCCCCCCCCCCCCCC',
          '.cccCCCCCCCCCCCCCCCCC',
          'cccCCCCCCCCCCCCCCCCCCC',
          'cccCCCCCCCCCCCCCCCCCCC',
          'cccCCCCCCCCCCCCCCCCCCC',
          'cccCCCCCCCCCCCCCCCCCCC',
          '.cc.CC.CC.CC.CC.CC.CC',
          'cc.CC.CC.CC.CC.CC.CC.C',
        ],
      },
    ],
  },
  {
    // Held up in the left fist: the blade rises past the shoulder in front of
    // the arm, the guard sits on the wrist above the fist, the grip runs
    // through the fist and the pommel shows below it. (B5 changed the
    // approved hero here, at the owner's request: the blade was behind the
    // arm and the grip, as wide as a fist, stood where the hand should be.)
    id: 'iron_sword',
    slot: 'weapon',
    parts: [
      {
        at: [3, 0],
        depth: HELD_FRONT,
        rows: [
          'm',
          'Mm',
          'Mm',
          'Mm',
          '.Mm',
          '.Mm',
          '.Mm',
          '..Mm',
          '..Mm',
          '..Mm',
          '...Mm',
          '...Mm',
          '...Mm',
          '...Mm',
          '....Mm',
          '....Mm',
          '....Mm',
          '.....Mm',
          '.....Mm',
          '.....Mm',
          '......Mm',
          '......Mm',
          '......Mm',
          '......Mm',
          '.......Mm',
          '.......Mm',
        ],
      },
      { at: [7, 26], depth: HELD_FRONT, rows: ['gggggggG'] },
      { at: [11, 27], depth: GRIP, rows: ['oO', 'oO', 'oO'] },
      { at: [12, 30], depth: HELD_FRONT, rows: ['gG'] },
    ],
  },
  {
    id: 'grey_trousers',
    slot: 'legs',
    parts: [
      {
        at: [14, 30],
        depth: LEGS,
        rows: [
          'pppppxxxxx',
          'pppppxxxxx',
          'pppppxxxxx',
          'pppx..pxxx',
          'pppx..pxxx',
          'pppx..pxxx',
          'pppx..pxxx',
          'pppx..pxxx',
          'pppx..pxxx',
        ],
      },
    ],
  },
  {
    id: 'leather_boots',
    slot: 'feet',
    parts: [
      {
        at: [12, 39],
        depth: FEET,
        rows: [
          '.ooooo..ooooo',
          '.ooooo..ooooo',
          '.ffffx..fffxx',
          '.ffffx..fffxx',
          '.ffffx..fffxx',
          'fffffx..ffffxx',
          'fffffx..ffffxx',
          'xxxxxx..xxxxxx',
        ],
      },
    ],
  },
  {
    id: 'teal_tunic',
    slot: 'shirt',
    parts: [
      {
        at: [10, 18],
        depth: SHIRT,
        rows: [
          'tttT..........tTTT',
          'tttT..........tTTT',
          'tttT..........tTTT',
          'tttT..........tTTT',
          'tttT',
          'ttTT..ttttTT',
          '.ttTT.ttttTT',
          '.ttTT',
          '.....ttttTTTT',
          '....tttttTTTTT',
          '....ttttttTTTT',
          '....tttttTtTTT',
          '....ttt.ttT.TT',
          '....t..tt.T..T',
        ],
      },
      {
        // The chest and shoulders, which armour hides in the mock-up but a
        // tunic worn on its own needs.
        at: [10, 15],
        depth: SHIRT,
        rows: [
          '.tttttt....tTTTTT',
          'tttttttttttttTTTTT',
          'tttTtttttttTTtTTTT',
          '.....ttttttTT',
          '.....ttttttTT',
          '.....ttttttTT',
          '.....ttttttTT',
          '.....ttttttTT',
        ],
      },
    ],
  },
  {
    // Breastplate and pauldrons, with knee cops strapped over the trousers.
    id: 'iron_plate',
    slot: 'body',
    parts: [
      {
        at: [9, 14],
        depth: ARMOUR,
        rows: [
          '..MMm..nmmmmn..mmn',
          '.MMmmmnmmmmmmnmmmnn',
          'MmmmmnmMMmmmnnmmmmnn',
          'mmmmnnmMMmmmnnmmmnnn',
          '......mMMmmmnn',
          '......mMmmmmnn',
          '......mmmmmnnn',
          '......nmmmmnnn',
          '......nnnnnnnn',
        ],
      },
      { at: [14, 36], depth: ARMOUR, rows: ['mmmn..mmnn'] },
    ],
  },
  {
    id: 'leather_belt',
    slot: 'belt',
    parts: [{ at: [15, 25], depth: BELT, rows: ['ooOggOOO'] }],
  },
  {
    // Carried on the right arm, over everything.
    id: 'kite_shield',
    slot: 'shield',
    parts: [
      {
        at: [23, 19],
        depth: SHIELD,
        rows: [
          'nnnnnnnnnnn',
          'nuuUUUUUUUn',
          'nuuUUgUUUUn',
          'nuuUUgUUUUn',
          'nuuUUgUUUUn',
          'nuuUUgUUUUn',
          'ngggggggggn',
          'nGGGGGGGGGn',
          'nuuUUgUUUUn',
          'nuuUUgUUUUn',
          'nuuUUgUUUUn',
          'nuuUUgUUUUn',
          '.nuUUgUUUn',
          '..nUUgUUn',
          '...nUgUn',
          '...nUgUn',
          '....nUn',
          '.....n',
          '.....n',
        ],
      },
    ],
  },
  ...TOWNSFOLK_GEAR,
  ...HAIRSTYLE_GEAR,
  ...ARMOURY,
];

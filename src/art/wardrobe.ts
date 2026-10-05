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
import type { BodyDef, GearDef } from './figure';

// Depths, back to front.
const CLOAK = -20;
const HELD_BEHIND = -10;
const LEGS = 10;
const FEET = 20;
const SHIRT = 30;
const ARMOUR = 40;
const BELT = 50;
const HELD_FRONT = 60;
const HAIR = 70;
const SHIELD = 80;

export const BODIES: readonly BodyDef[] = [
  {
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
    ],
  },
];

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
    // Held up in the left fist: the blade rises behind the shoulder, the
    // guard and grip sit in front of the hand.
    id: 'iron_sword',
    slot: 'weapon',
    parts: [
      {
        at: [3, 0],
        depth: HELD_BEHIND,
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
      {
        at: [7, 26],
        depth: HELD_FRONT,
        rows: ['gggggggG', '....oooO', '....oooO', '....oooO', '.....gG'],
      },
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
];

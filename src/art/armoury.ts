/**
 * Gear for the game's wearable items, drawn to fit the standard body's pose
 * (wardrobe.ts): the left fist closed at the hip, holding a weapon whose
 * blade or limb rises behind the shoulder along the approved sword's line;
 * the right forearm angled in to the hip, where a shield's straps go.
 *
 * Iron is the `metal` ramp, as on the approved hero; bronze is its own ramp,
 * copper-red, so the two metals differ by colour as well as by shape.
 * Light comes from the upper left.
 */
import { DEPTH } from './depth';
import type { GearDef } from './figure';

const { HELD_BEHIND, HELD_FRONT, LEGS, SHIRT, ARMOUR, JEWELLERY, HELMET, SHIELD, QUIVER } = DEPTH;

/**
 * A shortbow held at the grip in the left fist, string outward: the stave
 * curves in to the hand and out to the tips, and the string runs straight
 * between them. Drawn once with `<` for the wood's light step and `>` for its
 * dark step; each bow is this drawing in its own wood.
 */
const BOW_STAVE: readonly string[] = [
  '.<',
  'e<>',
  'e<>',
  'e.<>',
  'e.<>',
  'e.<>',
  'e..<>',
  'e..<>',
  'e..<>',
  'e..<>',
  'e..<>',
  'e..<>',
  'e...<>',
  'e....<>',
  'e.....<>',
  'e.....<>',
  'e.....<>',
  'e....<>',
  'e....<>',
  'e...<>',
  'e...<>',
  'e...<>',
  'e..<>',
  'e..<>',
  'e..<>',
  'e.<>',
  'e.<>',
  'e.<>',
  'e<>',
  'e<>',
  '.<',
];

function bow(id: string, light: string, dark: string): GearDef {
  return {
    id,
    slot: 'weapon',
    parts: [
      {
        at: [5, 12],
        depth: HELD_BEHIND,
        rows: BOW_STAVE.map((row) => row.replace(/</g, light).replace(/>/g, dark)),
      },
      // The grip's leather binding shows above and below the fist.
      { at: [10, 25], depth: HELD_FRONT, rows: ['f', '', '', '.fO'] },
    ],
  };
}

export const ARMOURY: readonly GearDef[] = [
  {
    // A leaf-shaped blade, widest near the point, cast in one piece with its
    // guard; the grip is bound in leather. It rises along the hero's line.
    id: 'bronze_leaf_sword',
    slot: 'weapon',
    parts: [
      {
        at: [3, 3],
        depth: HELD_BEHIND,
        rows: [
          '.1',
          '.12',
          '.12',
          '.122',
          '..122',
          '..122',
          '..122',
          '...122',
          '...122',
          '...12',
          '...12',
          '....12',
          '....12',
          '....12',
          '.....12',
          '.....12',
          '.....12',
          '......12',
          '......12',
          '......12',
          '......12',
          '.......12',
          '.......12',
        ],
      },
      {
        at: [8, 26],
        depth: HELD_FRONT,
        rows: ['3122224', '...fffO', '...fffO', '...fffO', '....14'],
      },
    ],
  },
  {
    // A bearded head socketed onto the haft, its edge outward.
    id: 'iron_bearded_axe',
    slot: 'weapon',
    parts: [
      {
        at: [0, 6],
        depth: HELD_BEHIND,
        rows: [
          '.MMmmnn',
          'MMmmmnn',
          'Mmmmmnn',
          'Mmmmnnn',
          'Mmmn..Wo',
          'Mmmn..Wo',
          '.Mmn..Wo',
          '..Mn..Wo',
          '.......Wo',
          '.......Wo',
          '.......Wo',
          '........Wo',
          '........Wo',
          '........Wo',
          '.........Wo',
          '.........Wo',
          '.........Wo',
          '.........Wo',
          '..........Wo',
          '..........Wo',
        ],
      },
      {
        at: [11, 26],
        depth: HELD_FRONT,
        rows: ['oooO', 'oooO', 'oooO', 'oooO', '.oO'],
      },
    ],
  },
  {
    // A cast head that fans out to its edge: no beard, unlike the iron axe.
    id: 'bronze_crescent_axe',
    slot: 'weapon',
    parts: [
      {
        at: [0, 4],
        depth: HELD_BEHIND,
        rows: [
          '..13',
          '.12',
          '122',
          '1223344',
          '1223344',
          '122..Wo',
          '.12...Wo',
          '..13..Wo',
          '......Wo',
          '......Wo',
          '.......Wo',
          '.......Wo',
          '.......Wo',
          '........Wo',
          '........Wo',
          '........Wo',
          '.........Wo',
          '.........Wo',
          '.........Wo',
          '.........Wo',
          '..........Wo',
          '..........Wo',
        ],
      },
      {
        at: [11, 26],
        depth: HELD_FRONT,
        rows: ['oooO', 'oooO', 'oooO', 'oooO', '.oO'],
      },
    ],
  },
  {
    // A conical helm with a nasal bar; the brows and eyes show either side.
    id: 'iron_nasal_helm',
    slot: 'head',
    parts: [
      {
        at: [13, 0],
        depth: HELMET,
        rows: [
          '.....Mm',
          '...MMmmmn',
          '..MMMmmmnn',
          '.MMmmmmmmnn',
          'MMmmmmmmmnnn',
          'nMnnnnnnnMnn',
          'Mn...Mn...mn',
          'M....mn....n',
          '.....mn',
        ],
      },
    ],
  },
  {
    // A round dome with broad cheek plates down to the jaw, leaving the eyes,
    // nose and mouth open: rounder than the iron helm, and no nasal.
    id: 'bronze_cheek_helm',
    slot: 'head',
    parts: [
      {
        at: [13, 0],
        depth: HELMET,
        rows: [
          '...112233',
          '.1112222334',
          '111222222334',
          '112222222334',
          '222222223334',
          '441444444144',
          '13........34',
          '13........34',
          '123......334',
          '123......334',
          '.13......34',
          '..1......4',
        ],
      },
    ],
  },
  {
    // A heater shield, plain iron: a rim, a boss and four rivets.
    id: 'iron_heater_shield',
    slot: 'shield',
    parts: [
      {
        at: [23, 19],
        depth: SHIELD,
        rows: [
          'nnnnnnnnnnn',
          'nMMMmmmmmmn',
          'nMMmmmmmmmn',
          'nMmnmmmmnmn',
          'nMmmmmmmmmn',
          'nMmmmMnmmmn',
          'nMmmmnnmmmn',
          'nMmmmmmmmmn',
          'nMmnmmmmnmn',
          '.nmmmmmmmn',
          '.nmmmmmmmn',
          '..nmmmmmn',
          '...nmmmn',
          '....nmn',
          '.....n',
        ],
      },
    ],
  },
  {
    // A round shield with a broad rim and a boss.
    id: 'bronze_round_shield',
    slot: 'shield',
    parts: [
      {
        at: [22, 20],
        depth: SHIELD,
        rows: [
          '....3333',
          '..31111223',
          '.3111222223',
          '.3112222224',
          '311222222224',
          '312221322224',
          '312223422224',
          '312222222244',
          '.3222222244',
          '.3222222444',
          '..34444444',
          '....4444',
        ],
      },
    ],
  },
  {
    // A cuirass shaped to the chest, on shoulder straps; no pauldrons.
    id: 'bronze_cuirass',
    slot: 'body',
    parts: [
      {
        at: [13, 15],
        depth: ARMOUR,
        rows: [
          '1222....2334',
          '112222223334',
          '112222223334',
          '122222223334',
          '.1222223334',
          '.1222222334',
          '.1222222334',
          '.1222222334',
          '.1222223334',
          '.1222223334',
          '.4444444444',
        ],
      },
      // Leather strips hanging from its lower edge, over the tunic.
      {
        at: [14, 26],
        depth: ARMOUR,
        rows: ['oOoOoOoOoO', 'oOoOoOoOoO', 'oOoOoOoOoO', 'o.o.o.o.o.'],
      },
    ],
  },
  {
    // Undyed linen with a laced neck, worn instead of the everyday tunic.
    id: 'linen_tunic',
    slot: 'shirt',
    parts: [
      {
        at: [10, 18],
        depth: SHIRT,
        rows: [
          'lllL..........lLLL',
          'lllL..........lLLL',
          'lllL..........lLLL',
          'lllL..........lLLL',
          'lllL',
          'llLL..llllLL',
          '.llLL.llllLL',
          '.IIII',
          '.....llllLLLL',
          '....lllllLLLLL',
          '....llllllLLLL',
          '....lllllLlLLL',
          '....llllllLLLL',
          '....IIIIIIIIII',
        ],
      },
      {
        at: [10, 15],
        depth: SHIRT,
        rows: [
          '.llllll....lLLLLL',
          'lllllllIOIllllLLL',
          'lllLlllIOIlLLlLLL',
          '.....llIOLLL',
          '.....lllllLL',
          '.....lllllLL',
          '.....lllllLL',
          '.....lllllLL',
        ],
      },
    ],
  },
  {
    // Loose linen trousers, the shins wrapped.
    id: 'linen_trousers',
    slot: 'legs',
    parts: [
      {
        at: [14, 30],
        depth: LEGS,
        rows: [
          'LLLLLIIIII',
          'LLLLLIIIII',
          'LLLLIIIIII',
          'LLLI..LIII',
          'LLLI..LIII',
          'LLLI..LIII',
          'lLLI..lIII',
          'LlLI..LlII',
          'LLlI..LIlI',
        ],
      },
    ],
  },
  {
    // A deep linen hood with a short cape over the shoulders.
    id: 'linen_hood',
    slot: 'head',
    parts: [
      {
        at: [10, 0],
        depth: HELMET,
        rows: [
          '.....lllLLLL',
          '...lllLLLLLLII',
          '..llLLLLLLLLLII',
          '..lLLIIIIIIIILII',
          '..lLI........III',
          '..lLI........III',
          '..lLI........III',
          '..lLI........III',
          '..lLI........III',
          '..lLI........III',
          '..lLI........III',
          '..lLLI......IIII',
          '..lLLL......LIII',
          '..lLLLLIIIILLIII',
          '.lLLLLLLLLLLLIIII',
          'lLLLLLLLLLLLLLIIII',
          'lLLLLLLLLLLLLIIIII',
          '.LLILLLLILLLLIIII',
        ],
      },
    ],
  },
  {
    // Three shells on a cord at the throat.
    id: 'shell_necklace',
    slot: 'neck',
    parts: [{ at: [16, 14], depth: JEWELLERY, rows: ['.O..O', '.bOOb', '..bP', '..PP'] }],
  },
  {
    // Shells on a cord at the left wrist, above the fist.
    id: 'shell_bracelet',
    slot: 'wrist',
    parts: [{ at: [10, 25], depth: JEWELLERY, rows: ['bPbPb'] }],
  },
  bow('pine_shortbow', 'J', 'K'),
  bow('oak_shortbow', 'W', 'o'),
  bow('willow_shortbow', 'Q', 'S'),
  {
    // A quiver slung on the back: its mouth and fletchings rise behind the
    // left shoulder, beside the head.
    id: 'arrow_quiver',
    slot: 'back',
    parts: [
      {
        at: [25, 6],
        depth: QUIVER,
        rows: ['..e.r', '.erre', '.eerr', '..ooo', 'oOOOO', 'fffO', 'fffO', 'fffO', 'fffO'],
      },
    ],
  },
];

/**
 * Gear for the game's wearable items, drawn to fit the standard body's pose
 * (wardrobe.ts): the left fist closed at the hip, holding a weapon whose
 * blade or limb rises behind the shoulder along the approved sword's line;
 * the right forearm angled in to the hip, where a shield's straps go.
 *
 * Gear climbs a ladder (docs/style-guide.md, "Gear ladder"): linen is a
 * villager's, bronze a militia volunteer's (leather with a little metal),
 * iron a town guard's (mail, a plain helm and heater). The approved hero's
 * plate, kite shield, cloak and long sword (wardrobe.ts) are the next rung,
 * the knight, and wait for tier 2's items. Each rung covers more of the body
 * in metal, stands larger and catches more light than the one below.
 *
 * Iron is the `metal` ramp, as on the approved hero; bronze is its own ramp,
 * yellow-olive, framed in dark `hide` leather so it never sits bare against
 * skin. Light comes from the upper left.
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

/** Bronze: the militia volunteer. Leather and cloth with a little cast metal. */
const BRONZE: readonly GearDef[] = [
  {
    // A short leaf blade, straight along its centre line: a bright midrib
    // (the polished step, `5`) between two olive faces, a dark edge on the
    // shadow side, widest a little below the point. A small cast guard, a
    // hide-bound grip and a bronze pommel. It rises only to the shoulder.
    id: 'bronze_shortsword',
    slot: 'weapon',
    parts: [
      {
        at: [6, 13],
        depth: HELD_BEHIND,
        rows: [
          '5',
          '53',
          '253',
          '2523',
          '2523',
          '.253',
          '.253',
          '.253',
          '..253',
          '..253',
          '..253',
          '...253',
          '...253',
        ],
      },
      {
        at: [8, 26],
        depth: HELD_FRONT,
        rows: ['412234', '...FXX#', '...FXX#', '....13'],
      },
    ],
  },
  {
    // A hatchet for kindling: the head sits at the very top of a short haft,
    // which shows above it. Straight along the top, it flares down to a
    // curved bit with a bright edge; the socket is dark where the wood goes in.
    id: 'bronze_hatchet',
    slot: 'weapon',
    parts: [
      {
        at: [0, 10],
        depth: HELD_BEHIND,
        rows: [
          '......Wo',
          '.5112344',
          '522222344',
          '522233444',
          '5233..Wo',
          '.53...Wo',
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
    // A soldier's cap: a low dome that sits close, a pixel proud of the
    // skull, with a bright ridge over the crown and a riveted rim on a dark
    // hide liner. The ridge's shine is what tells it from hair.
    id: 'bronze_cap',
    slot: 'head',
    parts: [
      {
        at: [12, 0],
        depth: HELMET,
        rows: [
          '....215233',
          '..1122522333',
          '.112225222334',
          '.112225222334',
          '.313131313134',
          '..#XXXXXXXX#',
        ],
      },
    ],
  },
  {
    // A small round shield: boards with a hide rim and a bronze boss.
    id: 'bronze_buckler',
    slot: 'shield',
    parts: [
      {
        at: [21, 20],
        depth: SHIELD,
        rows: [
          '...FXX#',
          '.FFjjWW##',
          'FjjjWWWWo#',
          'FjjW12WWo#',
          'FjW1223Wo#',
          'FjW2234oo#',
          'FjjW34Woo#',
          'XjWWWWooo#',
          '.##WWoo##',
          '...####',
        ],
      },
    ],
  },
  {
    // A sleeveless hide jerkin over the tunic, laced at the neck, with a
    // bronze disc on the chest and tabs below the belt.
    id: 'bronze_jerkin',
    slot: 'body',
    parts: [
      {
        at: [13, 15],
        depth: ARMOUR,
        rows: [
          'FXXX....XXX#',
          'FXXXF..FXXX#',
          'FXXXXFFXXXX#',
          '..FX1223X#',
          '..F122223#',
          '..F121233#',
          '..F123334#',
          '..FX2334X#',
          '..FXXXXXX#',
          '..FXXXXXX#',
          '',
          '..FXXXXXX#',
          '.FX#FX#FX#',
        ],
      },
    ],
  },
];

/** Iron: the town guard. Plain mail and a plain helm; no pauldrons, no gold. */
const IRON: readonly GearDef[] = [
  {
    // A straight arming sword with a plain iron cross: longer than the
    // bronze blade, shorter than the knight's.
    id: 'iron_arming_sword',
    slot: 'weapon',
    parts: [
      {
        at: [4, 5],
        depth: HELD_BEHIND,
        rows: [
          'M',
          'mn',
          '.mn',
          '.mn',
          '.mn',
          '..mn',
          '..mn',
          '..mn',
          '..mn',
          '...mn',
          '...mn',
          '...mn',
          '....mn',
          '....mn',
          '....mn',
          '....mn',
          '.....mn',
          '.....mn',
          '.....mn',
          '......mn',
          '......mn',
        ],
      },
      {
        at: [8, 26],
        depth: HELD_FRONT,
        rows: ['Mmmmmmn', '...oooO', '...oooO', '...oooO', '....mn'],
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
    // A mail shirt to the thigh with sleeves to the elbow, over the tunic.
    // Rows of rings, lit from the left; the belt goes over it.
    id: 'iron_mail',
    slot: 'body',
    parts: [
      {
        at: [10, 15],
        depth: ARMOUR,
        rows: [
          '.Mmmmmm....mmnnnq',
          'Mmmmmmmmmmmmnnnnnq',
          'mnmnmnmnmnmnqnqnqq',
          'Mmmm.mmmmmmnn.nnnq',
          'mnmn.mnmnmnqn.qnqq',
          'Mmmm.mmmmmmnn.nnnq',
          'nnnn.mnmnmnqn.qqqq',
          '.....mmmmmmnn',
          '.....mnmnmnqn',
          '.....mmmmmmnn',
          '',
          '.....mnmnmnqn',
          '.....mmmmmmnn',
          '.....mnmnmnqn',
          '....mmmmmmmnnn',
          '....mnmnmnmqnq',
          '....nnnnn.qqqq',
        ],
      },
    ],
  },
];

/** Linen: the villager's clothes. Soft, undyed, no metal. */
const LINEN: readonly GearDef[] = [
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
];

/** Things worn by anyone, on any rung. */
const TRINKETS: readonly GearDef[] = [
  {
    // Two found shells, one larger, hung from a cord along the collar.
    id: 'shell_necklace',
    slot: 'neck',
    parts: [{ at: [16, 14], depth: JEWELLERY, rows: ['O....O', '.OOOO', '.b.bb', '...bP'] }],
  },
  {
    // A dark cord round the left wrist, a pixel proud of the arm, with two
    // shells of different sizes hanging from it: a string of found things,
    // not a band. The cord keeps the shells apart from skin of any tone.
    id: 'shell_bracelet',
    slot: 'wrist',
    parts: [{ at: [9, 24], depth: JEWELLERY, rows: ['OOOOOO', '.bb.P', '.bP'] }],
  },
  {
    // A quiver slung on the back: its mouth and a fan of fletchings rise
    // behind the left shoulder, beside the head.
    id: 'arrow_quiver',
    slot: 'back',
    parts: [
      {
        at: [24, 3],
        depth: QUIVER,
        rows: [
          '...e.r',
          '..eerre',
          '..rere',
          '..oooo',
          '.FXXX#',
          '.FXX##',
          'FXXX#',
          'FXX##',
          'FXX#',
          'FX#',
          'FX#',
          'F#',
        ],
      },
    ],
  },
];

/**
 * The same clothes for an empty weapon hand (the `standard_at_ease` body):
 * where a sleeve or bracelet sits on the forearm, it follows the arm up to
 * the belt. character.ts swaps these in when nothing is held.
 */
const AT_EASE: readonly GearDef[] = [
  {
    id: 'teal_tunic_at_ease',
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
          '.ttTT.ttttTT',
          '......ttttTT',
          '',
          '.....ttttTTTT',
          '....tttttTTTTT',
          '....ttttttTTTT',
          '....tttttTtTTT',
          '....ttt.ttT.TT',
          '....t..tt.T..T',
        ],
      },
      {
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
    id: 'linen_tunic_at_ease',
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
          '.IIII.llllLL',
          '......llllLL',
          '',
          '.....llllLLLL',
          '....lllllLLLLL',
          '....llllllLLLL',
          '....lllllLlLLL',
          '....llllllLLLL',
          '....IIIIIIIIII',
        ],
      },
      LINEN[0]!.parts[1]!,
    ],
  },
  {
    id: 'shell_bracelet_at_ease',
    slot: 'wrist',
    parts: [{ at: [10, 23], depth: JEWELLERY, rows: ['..OOOOO', '.OObb.P', '...bP'] }],
  },
];

export const ARMOURY: readonly GearDef[] = [
  ...BRONZE,
  ...IRON,
  ...LINEN,
  ...TRINKETS,
  bow('pine_shortbow', 'J', 'K'),
  bow('oak_shortbow', 'W', 'o'),
  bow('willow_shortbow', 'Q', 'S'),
  ...AT_EASE,
];

/** Gear that changes when the weapon hand is empty, and what it becomes. */
export const AT_EASE_GEAR: Readonly<Record<string, string>> = {
  teal_tunic: 'teal_tunic_at_ease',
  linen_tunic: 'linen_tunic_at_ease',
  shell_bracelet: 'shell_bracelet_at_ease',
};

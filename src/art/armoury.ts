/**
 * Gear for the game's wearable items, drawn to fit the standard body's pose
 * (wardrobe.ts): the left fist closed below the hip, holding a weapon whose
 * blade or limb rises past the shoulder along the approved sword's line;
 * the right forearm angled in to the hip, where a shield's straps go.
 *
 * Every held thing follows the hand rule (docs/style-guide.md): its grip at
 * `GRIP` runs down through the fist's columns and is hidden by the fingers,
 * everything else of it is `HELD_FRONT`, with something directly above the
 * fist and something directly below, and only a bowstring goes behind.
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

const {
  HELD_BEHIND,
  GRIP,
  HELD_FRONT,
  LEGS,
  SHIRT,
  ARMOUR,
  WRIST,
  JEWELLERY,
  HELMET,
  SHIELD,
  QUIVER,
} = DEPTH;

/**
 * A shortbow held at the middle of its stave in the left fist, string
 * outward: the stave curves in to the hand and out to the tips, and the string
 * runs straight between them. Drawn once with `<` for the wood's light step
 * and `>` for its dark step; each bow is this drawing in its own wood. Rows
 * 14 to 16 are the grip, inside the fist; rows 13 and 17 are the leather
 * binding showing just above and below it.
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

/** Where the bow sits: its grip (rows 14 to 16) in the fist's middle columns. */
const BOW_AT: readonly [number, number] = [5, 13];
const BOW_GRIP = [14, 15, 16];
const BOW_BINDING = [13, 17];

/**
 * The poacher's longbow (B6): taller than the shortbows and nearly straight,
 * the same hand on it. Its grip (rows 20 to 22) is in the same fist; rows 19
 * and 23 are its binding.
 */
const LONGBOW_STAVE: readonly string[] = [
  '.<',
  'e<>',
  'e.<>',
  'e.<>',
  'e..<>',
  'e..<>',
  'e..<>',
  'e..<>',
  'e..<>',
  'e..<>',
  'e...<>',
  'e...<>',
  'e...<>',
  'e...<>',
  'e...<>',
  'e....<>',
  'e....<>',
  'e....<>',
  'e.....<>',
  'e.....<>',
  'e.....<>',
  'e.....<>',
  'e.....<>',
  'e.....<>',
  'e.....<>',
  'e.....<>',
  'e....<>',
  'e....<>',
  'e....<>',
  'e...<>',
  'e...<>',
  'e...<>',
  'e...<>',
  'e..<>',
  'e..<>',
  'e..<>',
  'e..<>',
  'e.<>',
  'e.<>',
  'e<>',
  '.<',
];

interface Stave {
  readonly rows: readonly string[];
  readonly at: readonly [number, number];
  readonly grip: readonly number[];
  readonly binding: readonly number[];
  /** The binding's light and dark characters. */
  readonly bound: readonly [string, string];
}

const SHORT: Stave = {
  rows: BOW_STAVE,
  at: BOW_AT,
  grip: BOW_GRIP,
  binding: BOW_BINDING,
  bound: ['f', 'O'],
};

function bow(id: string, light: string, dark: string, shape: Stave = SHORT): GearDef {
  const wood = shape.rows.map((row) => row.replace(/</g, light).replace(/>/g, dark));
  // The stave without its string, and only the given rows of it.
  const stave = (keep: (i: number) => boolean, paint = (row: string) => row) =>
    wood.map((row, i) => (keep(i) ? paint('.' + row.slice(1)) : ''));
  return {
    id,
    slot: 'weapon',
    parts: [
      // The string is the one thing held that passes behind the body.
      { at: shape.at, depth: HELD_BEHIND, rows: wood.map((row) => (row[0] === 'e' ? 'e' : '')) },
      {
        at: shape.at,
        depth: HELD_FRONT,
        rows: stave((i) => !shape.grip.includes(i) && !shape.binding.includes(i)),
      },
      {
        at: shape.at,
        depth: HELD_FRONT,
        rows: stave(
          (i) => shape.binding.includes(i),
          (row) => row.replace(light, shape.bound[0]).replace(dark, shape.bound[1]),
        ),
      },
      { at: shape.at, depth: GRIP, rows: stave((i) => shape.grip.includes(i)) },
    ],
  };
}

/** Bronze: the militia volunteer. Leather and cloth with a little cast metal. */
const BRONZE: readonly GearDef[] = [
  {
    // A short leaf blade, straight along its centre line: a bright midrib
    // (the polished step, `5`) between two olive faces, a dark edge on the
    // shadow side, widest a little below the point. A small cast guard, a
    // hide-bound grip and a bronze pommel. It rises only to the shoulder,
    // in front of the arm; the guard sits above the fist, the grip in it.
    id: 'bronze_shortsword',
    slot: 'weapon',
    parts: [
      {
        at: [6, 13],
        depth: HELD_FRONT,
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
      { at: [8, 26], depth: HELD_FRONT, rows: ['412234'] },
      { at: [11, 27], depth: GRIP, rows: ['X#', 'X#', 'X#'] },
      { at: [11, 30], depth: HELD_FRONT, rows: ['13'] },
    ],
  },
  {
    // A hatchet for kindling: the head sits at the very top of a short haft,
    // which shows above it. The head is a solid wedge, not an outline: a
    // socket wrapped round the haft, filling out to a curved bit as tall as
    // the head is long, with a bright edge on the side away from the body.
    // Straight along the top, slanting underneath. B3c's thin bar hooking
    // off the haft read as a hook or a pick; a filled block reads as an axe.
    id: 'bronze_hatchet',
    slot: 'weapon',
    parts: [
      {
        at: [0, 10],
        depth: HELD_FRONT,
        rows: [
          '......Wo',
          '.5111233',
          '51122233',
          '51222233',
          '52222334',
          '52233.Wo',
          '.53...Wo',
          '.......Wo',
          '.......Wo',
          '.......Wo',
          '........Wo',
          '........Wo',
          '........Wo',
          '.........Wo',
          '.........Wo',
          '.........Wo',
          '..........Wo',
        ],
      },
      { at: [10, 27], depth: GRIP, rows: ['Wo', 'Wo', '.Wo'] },
      { at: [11, 30], depth: HELD_FRONT, rows: ['oO'] },
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
        depth: HELD_FRONT,
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
      { at: [8, 26], depth: HELD_FRONT, rows: ['Mmmmmmn'] },
      { at: [11, 27], depth: GRIP, rows: ['oO', 'oO', 'oO'] },
      { at: [11, 30], depth: HELD_FRONT, rows: ['mn'] },
    ],
  },
  {
    // A bearded head socketed onto the haft, its edge outward.
    id: 'iron_bearded_axe',
    slot: 'weapon',
    parts: [
      {
        at: [0, 6],
        depth: HELD_FRONT,
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
          '..........Wo',
        ],
      },
      { at: [11, 27], depth: GRIP, rows: ['Wo', 'Wo', 'Wo'] },
      { at: [11, 30], depth: HELD_FRONT, rows: ['oO'] },
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

/**
 * Leather: the hunter's or woodsman's rung, between linen and bronze. Tanned
 * leather in the `tan` ramp, laced with linen cord, and no metal at all.
 */
const LEATHER: readonly GearDef[] = [
  {
    // A sleeveless tan jerkin over the tunic, laced up the front with linen
    // cord, its skirt cut in tabs below the belt.
    id: 'leather_jerkin',
    slot: 'body',
    parts: [
      {
        at: [13, 15],
        depth: ARMOUR,
        rows: [
          '6677....7778',
          '66677..77778',
          '666667l77778',
          '..667l7778',
          '..66l7l778',
          '..667l7778',
          '..66l7l778',
          '..667l7778',
          '..66677778',
          '..66677778',
          '',
          '..66677778',
          '.6667777788',
          '.67867867878',
        ],
      },
    ],
  },
  {
    // A snug cap a pixel proud of the skull, with a stitched seam over the
    // crown, a dark band and ear flaps down beside the face.
    id: 'leather_cap',
    slot: 'head',
    parts: [
      {
        at: [12, 0],
        depth: HELMET,
        rows: [
          '....66l778',
          '..6666l7778',
          '.66666l77778',
          '.66666l77778',
          '.666666777778',
          '.888888888888',
          '.67........78',
          '.67........78',
          '.68........88',
        ],
      },
    ],
  },
  {
    // Laced cuffs on both forearms: the weapon arm's over the sleeve above the
    // wrist, under anything held; the other arm's is hidden by a shield.
    id: 'leather_bracers',
    slot: 'wrist',
    parts: [
      { at: [10, 22], depth: WRIST, rows: ['6678', '6l78', '.6678', '.6l78'] },
      { at: [24, 22], depth: WRIST, rows: ['6678', '6l78', '6678'] },
    ],
  },
];

/** What monsters drop that can be worn. */
const DROPS: readonly GearDef[] = [
  {
    // The footpad's oak club, by the hand rule: thick and knotted at the top,
    // narrowing to a grip in the fist, its butt below.
    id: 'cudgel',
    slot: 'weapon',
    parts: [
      {
        at: [3, 11],
        depth: HELD_FRONT,
        rows: [
          '...%&=',
          '..%&&&=',
          '..%%&&=',
          '.%%&&&=',
          '%%&=&&=',
          '..%&&&=',
          '...%&&=',
          '....%&&=',
          '....%&&=',
          '.....%&=',
          '.....%&=',
          '.....%&=',
          '......&=',
          '......&=',
          '......&=',
          '.......&=',
        ],
      },
      { at: [10, 27], depth: GRIP, rows: ['&=', '&=', '.&='] },
      { at: [11, 30], depth: HELD_FRONT, rows: ['%='] },
    ],
  },
  {
    // The smuggler's cutlass: a wide blade that bends further out towards
    // its point, bright along its edge; a dark cup guard on the wrist and a
    // knuckle bow round the outside of the fist down to the pommel. A shade
    // finer than its tier, by its polish and its bow, and never gold.
    id: 'smugglers_cutlass',
    slot: 'weapon',
    parts: [
      {
        at: [0, 7],
        depth: HELD_FRONT,
        rows: [
          '.w',
          '.wM',
          '.wMn',
          '..wMn',
          '..wMmn',
          '...wMmn',
          '...wMmn',
          '....wMmn',
          '....wMmn',
          '.....wMmn',
          '.....wMmn',
          '......wMmn',
          '......wMmn',
          '.......wMmn',
          '........wMn',
          '........wMn',
          '........wMn',
          '.........wMn',
          '.........wMn',
        ],
      },
      { at: [8, 26], depth: HELD_FRONT, rows: ['nnmmnx', '.n', '.n', '..n', '...nx'] },
      { at: [11, 27], depth: GRIP, rows: ['ff', 'ff', 'ff'] },
    ],
  },
  {
    // A smooth grey pebble on a thong round the neck, over clothes and armour.
    id: 'trollstone',
    slot: 'neck',
    parts: [
      {
        at: [16, 14],
        depth: JEWELLERY,
        rows: ['#....#', '.#..#', '..##', '.990q', '.900q', '..qq'],
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
    // not a band. The cord keeps the shells apart from skin of any tone. It
    // sits at the cuff with the shells on the side towards the body, clear
    // of the line a held blade or haft takes in front of the forearm (the
    // hand rule), which would otherwise hide them.
    id: 'shell_bracelet',
    slot: 'wrist',
    parts: [{ at: [9, 23], depth: WRIST, rows: ['OOOOOO', '...b.P', '...bb'] }],
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
    id: 'leather_bracers_at_ease',
    slot: 'wrist',
    parts: [
      { at: [11, 22], depth: WRIST, rows: ['6678', '.6l78', '..6678'] },
      { at: [24, 22], depth: WRIST, rows: ['6678', '6l78', '6678'] },
    ],
  },
  {
    id: 'shell_bracelet_at_ease',
    slot: 'wrist',
    parts: [{ at: [10, 23], depth: WRIST, rows: ['..OOOOO', '.OObb.P', '...bP'] }],
  },
];

/**
 * What bounty hunting buys or wins (S9): a hunter's things, a step aside from
 * the ladder rather than up it. The longbow is drawn with the bows, below.
 */
const BOUNTY: readonly GearDef[] = [
  {
    // One great green scale rimmed in iron, shaped like a leaf: rounded at
    // the top, coming to a point, a ridge down it. Strapped to the forearm
    // like the heater, hiding the hand.
    id: 'wyrmscale_shield',
    slot: 'shield',
    parts: [
      {
        at: [23, 19],
        depth: SHIELD,
        rows: [
          '...nnnnn',
          '.nnM**++nn',
          'nM****+++-n',
          'nM***+*++-n',
          'nM**+***+-n',
          'nM*+****+-n',
          'nM*+***++-n',
          'nM*+**++--n',
          'nM*+*+*+--n',
          '.nM*++*+-n',
          '.nM*+*+--n',
          '..nM*+--n',
          '..nM*+-n',
          '...nM-n',
          '....nn',
        ],
      },
    ],
  },
  {
    // A wolf's tooth on a cord at the collar, over clothes and armour.
    id: 'hunters_charm',
    slot: 'neck',
    parts: [
      { at: [16, 14], depth: JEWELLERY, rows: ['8....8', '.8..8', '..88', '..eE', '..eE', '...E'] },
    ],
  },
  {
    // A broad felt brim with a red band and a cream plume sweeping back off
    // it: a hat that stops nothing and is noticed everywhere.
    id: 'feathered_hat',
    slot: 'head',
    parts: [
      {
        at: [7, 0],
        depth: HELMET,
        rows: [
          '.eee....FFFFFFFX',
          'eeeEe..FFFFFFFFXX',
          'E..eEeeFFFFFFFFXXX',
          '....EeeF:rrrrrrrrR',
          '...FFFFFFFFFFFFXXXXXX',
          '..##FFFFFFFFFFXXXXX###',
        ],
      },
    ],
  },
  {
    // The barbed arrows' quiver: the same quiver, dark red fletchings.
    id: 'barbed_quiver',
    slot: 'back',
    parts: [
      {
        at: [24, 3],
        depth: QUIVER,
        rows: [
          '...R.r',
          '..RRrrR',
          '..rRrR',
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
 * Brinebeard's Grotto's loot (B6): a pirate's finery, salt-stained and a
 * little showy, on the ladder between iron and the knight. Brass rather than
 * gold (bronze's ramp; gold is the knight's), steel with its nicks, and the
 * captain's own purple and black.
 */
const GROTTO: readonly GearDef[] = [
  {
    // A deckhand's cutlass: the smuggler's blade's line, but dull steel,
    // nicked along the edge and pitted with salt, a brass cup guard and a
    // brass knuckle bow round the fist.
    id: 'pirates_cutlass',
    slot: 'weapon',
    parts: [
      {
        at: [0, 7],
        depth: HELD_FRONT,
        rows: [
          '.M',
          '.Mm',
          '.Mmn',
          '..Mmn',
          '..nmmn',
          '...Mmmn',
          '...Mmqn',
          '....Mmmn',
          '....nmmn',
          '.....Mmmn',
          '.....Mmmn',
          '......Mmqn',
          '......Mmmn',
          '.......nmmn',
          '........Mmn',
          '........Mmn',
          '........Mmn',
          '.........Mmn',
          '.........Mmn',
        ],
      },
      { at: [8, 26], depth: HELD_FRONT, rows: ['112234', '.2', '.2', '..3', '...34'] },
      { at: [11, 27], depth: GRIP, rows: ['ff', 'ff', 'ff'] },
    ],
  },
  {
    // A boarding axe: a haft longer than the bearded axe's, rising above the
    // head, with a broad bit on the outside and a spike behind for hooking
    // rails. Its haft follows the bearded axe's line through the fist.
    id: 'boarding_axe',
    slot: 'weapon',
    parts: [
      {
        at: [0, 0],
        depth: HELD_FRONT,
        rows: [
          '...Mn',
          '.MmWo',
          'MmmWo',
          'MmmWonnq',
          'MmmnWonq',
          'Mmn.Wo',
          '.Mn.Wo',
          '.....Wo',
          '.....Wo',
          '.....Wo',
          '......Wo',
          '......Wo',
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
          '..........Wo',
        ],
      },
      { at: [11, 27], depth: GRIP, rows: ['Wo', 'Wo', 'Wo'] },
      { at: [11, 30], depth: HELD_FRONT, rows: ['oO'] },
    ],
  },
  {
    // Brinebeard's anchor, held by its shank at arm's length, hanging: the
    // ring and the wooden stock up by the shoulder, the shank down through
    // the fist, and the crown at the knee with its two arms curving up either
    // side, as the captain stands with it. Iron going to rust.
    id: 'brinebeards_anchor',
    slot: 'weapon',
    parts: [
      {
        at: [0, 9],
        depth: HELD_FRONT,
        rows: [
          '.......nn',
          '......n..n',
          '.......nn',
          '...WWWWMmWWo',
          '...ooooMmooO',
          '.......Mm',
          '.......Mm',
          '.......Mm',
          '.......MR',
          '........Mm',
          '........Mm',
          '........Mm',
          '........Mm',
          '.........Mm',
          '.........Mm',
          '.........MR',
          '.........Mm',
          '..........Mm',
        ],
      },
      { at: [11, 27], depth: GRIP, rows: ['Mm', 'Mm', 'Mm'] },
      {
        at: [8, 30],
        depth: HELD_FRONT,
        rows: [
          '...Mm',
          '....Mm',
          '....MR',
          '....Mm',
          '.....Mm',
          '.....Mm',
          'Mm...Mm.....mn',
          'MMm..Mm....mnn',
          '.Mm...Mm...mn',
          '..Mm..Mm..mn',
          '...MMmmmmnn',
          '.....mmnn',
        ],
      },
    ],
  },
  {
    // A black tricorn, its three corners turned up and edged in brass, one
    // red feather in the band.
    id: 'tricorn',
    slot: 'head',
    parts: [
      {
        at: [9, 0],
        depth: HELMET,
        rows: [
          '.......!!!!!!:r',
          '1....!!!!!!!!~:r...1',
          '!1..!!!!!!!!!~~r..1~',
          '!!1!!!!!!!!!!~~~~1~~',
          '.!!11!!!!!!!!!~~11~?',
          '...??11111111111??',
        ],
      },
    ],
  },
  {
    // The captain's coat: long, purple, open down the front over whatever is
    // under it, braided in brass along its edges and at the cuffs, the
    // skirts to the knee. The belt goes over it.
    id: 'captains_coat',
    slot: 'body',
    parts: [
      {
        at: [10, 15],
        depth: ARMOUR,
        rows: [
          '.@@@@@1....2$$$$^^',
          '@@@@@@@1..2$$$$$$^',
          '@@@^@@@1..2$$^$$$^',
          '@@@^.@@1..2$$.$$$^',
          '@@@^.@@1..2$$.$$$^',
          '@@@^.@@1..2$$.$$$^',
          '1112.@@1..2$$.1122',
          '.....@@1..2$$',
          '.....@@1..2$$',
          '.....@@1..2$$',
          '.....@@1..2$$',
          '....@@@1..2$$$',
          '....@@@1..2$$$',
          '...@@@@1..2$$$$',
          '...@@@@1..2$$$$',
          '...@@@@1..2$$$$',
          '..@@@@@1..2$$$$$',
          '..@@@@@1..2$$$$$',
          '..@@@@@1..2$$$$^',
          '..@@@@@1..2$$$$^',
          '..@@@@@1..2$$$$^',
          '..@@@@@1..2$$$$^',
          '..@@@@@1..2$$$$^',
          '..111111..222222',
        ],
      },
    ],
  },
  {
    // A brass spyglass, closed, held upright in the off hand at the hip: the
    // fingers round the middle of it, the wide end above, the eyepiece below.
    id: 'spyglass',
    slot: 'shield',
    parts: [
      {
        at: [24, 16],
        depth: SHIELD,
        rows: ['.12', '1223', '1223', '.33', '.12', '.12', '', '', '', '.12', '.33', '.12', '.4'],
      },
      { at: [24, 22], depth: SHIELD + 1, rows: ['sssd', 'ssdd', 'sddd'] },
    ],
  },
];

export const ARMOURY: readonly GearDef[] = [
  ...BRONZE,
  ...IRON,
  ...LINEN,
  ...LEATHER,
  ...DROPS,
  ...TRINKETS,
  ...BOUNTY,
  ...GROTTO,
  bow('pine_shortbow', 'J', 'K'),
  bow('oak_shortbow', 'W', 'o'),
  bow('willow_shortbow', 'Q', 'S'),
  bow('poachers_longbow', '&', '=', {
    rows: LONGBOW_STAVE,
    at: [5, 7],
    grip: [20, 21, 22],
    binding: [19, 23],
    bound: [';', '|'],
  }),
  ...AT_EASE,
];

/** Gear that changes when the weapon hand is empty, and what it becomes. */
export const AT_EASE_GEAR: Readonly<Record<string, string>> = {
  teal_tunic: 'teal_tunic_at_ease',
  linen_tunic: 'linen_tunic_at_ease',
  shell_bracelet: 'shell_bracelet_at_ease',
  leather_bracers: 'leather_bracers_at_ease',
};

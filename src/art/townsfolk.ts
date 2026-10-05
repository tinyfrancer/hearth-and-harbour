/**
 * The townsfolk the approved mock-up posed (docs/art-reference/town-mockup.html):
 * the pirate captain, the smith and the trader. Each stood in a pose of their
 * own, so each is a body of their own on the standard 38 x 48 figure canvas,
 * harvested from the mock-up's pirateFig, smithFig and traderFig. What they
 * hold is gear, so it is a layer like the hero's sword. Dressed in their
 * outfits (figure.ts) they are the mock-up's figures pixel for pixel
 * (tests/art/townsfolk.test.ts runs the mock-up's own code to check).
 *
 * Unlike the standard body, these are drawn only where they show: they are
 * people of the town, always seen in their own clothes, not bodies to dress.
 */
import type { BodyDef, GearDef } from './figure';

/** The depth wardrobe.ts gives a thing held in front of the body. */
const HELD_FRONT = 60;

export const TOWNSFOLK_BODIES: readonly BodyDef[] = [
  {
    // Tricorn, patch over one eye, black beard, red coat with gold buttons and
    // epaulettes. A hook for one hand (on our left), the other hand on the cutlass's
    // grip; one boot and a peg leg. The open eye looks straight out.
    id: 'pirate',
    parts: [
      {
        at: [9, 0],
        depth: 0,
        rows: [
          '......zzzzzzzz',
          '.....zzzZwwZzzz',
          '.....zzzZwwZzzz',
          'zz..zzzzzzzzzzzz..zz',
          'zzggggggggggggggggzz',
          '.zzzzzzzzzzzzzzzzzz',
          '.....kkkkkkkkkk',
          '.....sHHHsskkkd',
          '.....swkwskkkkd',
          '.....ssssddskkd',
          '.....BBBssssBBB',
          '.....BBBBkkBBBB',
          '.....BBBBBBBBBB',
          'gggggGBBBBBBBBgggGGG',
          'gGgGgGrBBBBBBRgGgGGG',
          'rrRRrrrgBBBBgRRRrRRR',
          'rrRRrrrgeBBegRRRrRRR',
          'rrRRrrrgeOeegRRRrRRR',
          'rrRRrrrgeeeegRRRrRRR',
          'rrRRrrrgeeOegRRRrRRR',
          'rrRRrrrgeeeegRRRrRRR',
          '.rrRRrrgeOeegRRRrRRR',
          '.rrRRrrgeeeegRRR.rRRR',
          '.rrRRrrgeeeegRRR.rRRR',
          '.gggGgggggGGGGGG..gGGG',
          '..ggGGGGGGGGGGGG..gGG',
          '...nrgGrgz.GRRRR...ssd',
          '...mrgnrgz.GRRRR...sdd',
          '...mrgmrgz.GRRRR',
          '....mmGrgz.GRRRR',
          '....rgGrgz.GRRRR',
          '...rrgGrgz.GRRRRR',
          '...rrrrrgz.GRRRRR',
          '...rrrrgzz..GRRRR',
          '...rrrrgzz..GRRRR',
          '...rrrrgzz..GRRRR',
          '..rrrrrgzz..GRRRRR',
          '..rrrrrgzz..GRRRRR',
          '..rrrrrgzz..GRRRRR',
          '..rrrrrgoo..GRRRRR',
          '..RRRRRooo..WGRRRR',
          '.....xxxxx..Wo',
          '.....xxxxx..Wo',
          '.....xxxxx..Wo',
          '.....xxxxx..Wo',
          '.....xxxxx..Wo',
          '....xxxxxx..Wo',
        ],
      },
    ],
  },
  {
    // Bald and bearded, sleeves rolled, leather apron; arms folded across
    // the chest. Eyes mirrored.
    id: 'smith',
    parts: [
      {
        at: [9, 1],
        depth: 0,
        rows: [
          '.......ssssss',
          '......ssssssss',
          '.....sssssssssd',
          '.....sssssssssd',
          '....dsHHssssHHdd',
          '....dswksssskwdd',
          '.....ssssddssdd',
          '.....BBBssssBBB',
          '.....BBBBkkBBBB',
          '.....BBBBBBBBBB',
          '......BBBBBBBB',
          '.......BBBBBB',
          '..qqqqaqqqqqqAxxxx',
          'qqqqqqaaaaaAAAxxxxxx',
          'qqqxqqaaaaaAAAxxxxxx',
          'sssdqqaaaaaAAAxxssdd',
          'sssdqqaaaaaAAAxxssdd',
          'sssdqqaaaaaAAAxxssdd',
          'sssdqqaaaaaAAAxxssdd',
          '.ssssssssssssssssss',
          '.ssssssssddssssssdd',
          '.dddddddddddddddddd',
          '....qaaaaaaAAAAx',
          '....qaaaaaaAAAAx',
          '....qaaaaaaAAAAx',
          '.....aaaaaaAAAA',
          '.....aaaaaaAAAA',
          '.....aaaaaaAAAA',
          '.....aaAAAAAAAA',
          '.....aaaaaaAAAA',
          '.....aaaaaaAAAA',
          '.....aaaaaaAAAA',
          '.....aaaaaaAAAA',
          '.....aaaaaaAAAA',
          '.....aaaaaaAAAA',
          '.....AAAAAAAAAA',
          '.....pppx..pxxx',
          '.....pppx..pxxx',
          '.....pppx..pxxx',
          '.....pppx..pxxx',
          '....ffffx..fffxx',
          '....ffffx..fffxx',
          '....ffffx..fffxx',
          '...fffffx..ffffxx',
          '...fffffx..ffffxx',
          '...xxxxxx..xxxxxx',
        ],
      },
    ],
  },
  {
    // Auburn hair to the shoulders, purple dress with a linen apron. One
    // hand holds a basket by its handle; the other rests on her hip.
    // Eyes mirrored.
    id: 'trader',
    parts: [
      {
        at: [10, 0],
        depth: 0,
        rows: [
          '......YYYYYY',
          '....YYYyYYYYYY',
          '...YYYyyYYYYYNN',
          '...YYYYYYYYYNNN',
          '...YYssYsssYYNN',
          '...YsNNssssNNsN',
          '...YswksssskwsN',
          '...YsssssssssdN',
          '...YssssddsssdN',
          '...YYssDDDDsdNN',
          '...YY.ssssdd.NN',
          '...YY..dddd..NN',
          '..YYY..sddd..NNN',
          '..vvvvvssddVVVVV',
          'vvvVvvvvvvVVVVVVV',
          'vvvVvvvvvvVVVVvVVV',
          'vvvVvvvvvvVVVV.vVV',
          'vvvVvvvvvvVVVV.vVVV',
          'vvvVvvvvvvVVVV..vVV',
          'vvvVvvvvvvVVVV..vVV',
          'vvvV.vvvvvVVV..vVVV',
          '.vvvVvvvvvVVV.vVVV',
          '.vvvVvvvvvVVVssd',
          '.vvvVeeeeeEEEE',
          '.vvvVveeeeEEVV',
          '.vvvVveeeeEEVV',
          '..ssdveeeeEEVV',
          '..sddveeeeEEVV',
          '....vveeeeEEVV',
          '....vveeeeEEVV',
          '...vvveeeeEEVVV',
          '...vvveeeeEEVVV',
          '...vvveeeeEEVVV',
          '...vvveeeeEEVVV',
          '...vvveeeeEEVVV',
          '...vvveeeeEEVVV',
          '..vvvveeeeEEVVVV',
          '..vvvvvvvvVVVVVV',
          '..vvvvvvvvVVVVVV',
          '..vvvvvvvvVVVVVV',
          '..vvvvvvvvVVVVVV',
          '..vvvvvvvvVVVVVV',
          '.VVVVVVVVVVVVVVVV',
          '.....fff..ffx',
          '....ffff..fffx',
          '....xxxx..xxxx',
        ],
      },
    ],
  },
];

export const TOWNSFOLK_GEAR: readonly GearDef[] = [
  {
    // Guard in the pirate's left hand, the blade curving down past his coat.
    id: 'pirate_cutlass',
    slot: 'weapon',
    parts: [
      {
        at: [27, 28],
        depth: HELD_FRONT,
        rows: [
          'ggggG',
          '..mM',
          '..mM',
          '...mM',
          '...mM',
          '....mM',
          '....mM',
          '.....mM',
          '.....mM',
          '.....mM',
          '.....mM',
          '.....mM',
          '.....mM',
          '.....mM',
          '.....mM',
          '.....mM',
          '.....mM',
          '.....m',
        ],
      },
    ],
  },
  {
    // A wicker basket of fruit, held by its handle.
    id: 'trader_basket',
    slot: 'held',
    parts: [
      {
        at: [8, 28],
        depth: HELD_FRONT,
        rows: [
          '.o.rgr.o',
          'ojjjjjjjo',
          'jjojjojjo',
          'jjojjojjo',
          'jjojjojjo',
          'jjojjojjo',
          '.ooooooo',
        ],
      },
    ],
  },
];

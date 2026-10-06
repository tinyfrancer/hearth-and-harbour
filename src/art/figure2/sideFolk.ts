/**
 * The seven townsfolk walking across, in profile (B10b), on the same skeleton
 * as the hero (side.ts): each a head drawn in profile with their own hair,
 * hat and beard, a torso in their own clothes, skirts and aprons that kick
 * with the stride, and their business kept in their hands: the smith's
 * hammer swinging head down, the trader's apple held out and her basket in
 * the crook of her arm, the captain's hook and his peg swung stiff from the
 * hip, the alewife's tankard raised, the market woman's basket steadied on
 * her head, the docker's sack on his shoulder, the old man's stick planted
 * as his far foot takes his weight.
 *
 * Drawn facing right, in the `skin`, `hair` and `brow` ramps their look swaps
 * (folk.ts, `folkSwap`).
 */
import type { Mat } from '../town2/ramps';
import { FIST2 } from './body';
import { cloth, runs, type Extent, type Part2, type Pins } from './engine';
import { SIDE, type SideDress, type SkirtSpec } from './side';
import { HEAD_SIDE, PROFILE_AT } from './sideHeads';
import { TORSO_SIDE } from './sideDress';

const [PX, PY] = PROFILE_AT;
const T = SIDE.TORSO;
const H = SIDE.HEAD;

const part = (
  x: number,
  y: number,
  depth: number,
  rows: readonly string[],
  mat?: Mat,
  pins?: Pins,
  cast = true,
): Part2 => ({ at: [x, y], depth, rows, mat, pins, cast });

/** The profile head's skin, under each townsperson's hair, hat and beard. */
const SKULL: Part2 = { ...HEAD_SIDE, depth: H };

const torso = (
  mat: Mat,
  top: number,
  bottom: number,
  depth: number = T,
  widen = 0,
  o = {},
): Part2 =>
  cloth(
    depth,
    mat,
    TORSO_SIDE.filter(([y]) => y >= top && y <= bottom).map(([y, a, b]): Extent => [
      y,
      a - (y > 26 ? widen : 0),
      b + (y > 26 ? widen : 0),
    ]),
    { turn: 0.6, ...o },
  );

const skirt = (s: Partial<SkirtSpec> & { mat: Mat; hem: number }): SkirtSpec => ({
  top: 39,
  x0: 22,
  x1: 32,
  depth: SIDE.SKIRT,
  ...s,
});

const base = (): SideDress => ({
  torso: [],
  head: [SKULL],
  leg: [],
  arm: [],
  weaponArm: [],
  boot: 'leather',
  held: [],
  shield: [],
  back: [],
});

/** A cover from the root of a limb. */
const cover = (mat: Mat, to: number, o: object = {}) => ({
  mat,
  from: 0,
  to,
  bulk: 1,
  hem: true,
  ...o,
});

/** Something placed about the fist, as FIST2 sits at (14, 39). */
const byFist = (
  x: number,
  y: number,
  depth: number,
  rows: readonly string[],
  mat?: Mat,
  pins?: Pins,
): Part2 => part(FIST2.at[0] + x, FIST2.at[1] + y, depth, rows, mat, pins);

// ------------------------------------------------------------------ the smith

const SMITH_BEARD = part(
  PX,
  PY + 7,
  H + 3,
  [
    '.......1........',
    '.......12.......',
    '.......122......',
    '.......1222.2334',
    '.......12222.44.',
    '......1222223334',
    '......1222223344',
    '.....12222233344',
    '......1222233344',
    '.......12223334.',
    '........122334..',
    '.........1234...',
    '..........23....',
  ],
  'hair',
);

const SMITH = (): SideDress => {
  const d = base();
  d.head.push(SMITH_BEARD);
  d.torso.push(
    torso('cloth', 22, 43, T, 1),
    // The apron's bib over the chest's front, its strap over the shoulder.
    part(
      29,
      22,
      T + 5,
      [
        '2.',
        '.2',
        '.12',
        '.123',
        '.1233',
        '.1233',
        '.1233',
        '.1233',
        '.1234',
        '.1234',
        '.1234',
        '.1234',
        '.1234',
        '.12344',
      ],
      'leather',
    ),
    runs(
      T + 6,
      [
        [36, [22, 'aaaaaaaab']],
        [37, [22, 'bbbbbbbbc']],
      ],
      { pins: { a: ['cream', 1], b: ['cream', 2], c: ['cream', 3] } },
    ),
  );
  d.skirt = skirt({ mat: 'leather', hem: 55, top: 37, apron: true, depth: SIDE.SKIRT + 2 });
  d.arm.push(cover('cloth', 6));
  d.leg.push(cover('umber', 23, { hem: false }), {
    mat: 'leather',
    from: 15,
    to: 30,
    bulk: 1,
    lip: true,
  });
  // The hammer hangs head down from the near fist and swings with it; the far thumb is in the apron string.
  d.nearJob = {
    upper: 0,
    fore: 0.1,
    swing: 0.8,
    hand: 'fist',
    holds: [
      byFist(1, -2, 0, ['23', '23'], 'wood'),
      byFist(1, 5, 0, ['23', '23', '23', '23', '23', '23'], 'wood'),
      byFist(-3, 11, 0, ['.0112233.', '011122334', '122233345', '.3444455.'], 'iron'),
    ],
  };
  d.farJob = { upper: -0.1, fore: 0.5, swing: 0.3, hand: 'fist' };
  return d;
};

// ----------------------------------------------------------------- the trader

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
  '%': ['wood', 1],
  '&': ['wood', 2],
  '*': ['wood', 3],
  '+': ['wood', 4],
};

const TRADER = (): SideDress => {
  const d = base();
  d.head.push(
    part(
      PX,
      PY - 1,
      H + 5,
      [
        '.....mnnnpp.....',
        '...mmnnnnnppq...',
        '..mmnnnnnnpppq..',
        '.mmnnnnnnnppppq.',
        'mmnnnnnnnppppqq.',
        'mnnnnnnnnpppq2..',
        'mnnnnnnnppqr12..',
        'nnnnnnnpqr......',
        'nnnnnnpqr.......',
        'nnnnnpqr........',
        'pnnpqqr.........',
        '.pqqr...........',
      ],
      'hair',
      SCARF,
    ),
    // The knot at the back and its tails.
    part(PX - 3, PY + 7, H + 4, ['..np', '.npq', 'npq.', 'pq..', 'pqr.', '.qr.'], undefined, SCARF),
  );
  d.torso.push(
    torso('violet', 22, 43),
    part(29, 22, T + 2, ['FF', 'FFc', '.Fc'], undefined, { F: ['cream', 1], c: ['cream', 3] }),
    runs(
      T + 3,
      [
        [28, [31, 'c']],
        [30, [31, 'c']],
        [32, [30, 'c']],
        [34, [30, 'c']],
      ],
      { pins: { c: ['ochre', 1] } },
    ),
  );
  d.skirt = skirt({ mat: 'violet', hem: 66, top: 38 });
  d.arm.push(cover('violet', 7));
  d.leg.push({ mat: 'leather', from: 15, to: 30, bulk: 1 });
  // The apple held out on her palm; the basket of wares in the crook of the far arm.
  d.nearJob = {
    upper: 0.2,
    fore: 1.45,
    swing: 0.15,
    hand: 'none',
    holds: [
      byFist(0, 0, 1, ['ssttu', '.tuuv'], undefined),
      byFist(1, -4, 2, ['.kG', 'oaA', 'aAC', '.C.'], undefined, {
        ...GOODS,
        o: ['crimson', 0],
        C: ['crimson', 4],
        G: ['mossdye', 4],
        k: ['wood', 4],
      }),
    ],
  };
  d.farJob = {
    upper: 0.25,
    fore: 1.35,
    swing: 0.1,
    hand: 'none',
    holds: [
      byFist(
        -6,
        -6,
        1,
        [
          '..*......*...',
          '.*.aAcCff.*..',
          '.%aaAccCfFF*.',
          '%&&&&&&&&&&&*',
          '%&*&&*&&*&&*+',
          '&*&&*&&*&&*++',
          '%&*&&*&&*&&*+',
          '.&*&&*&&*&*+.',
          '..*********..',
        ],
        undefined,
        GOODS,
      ),
    ],
  };
  return d;
};

// ---------------------------------------------------------------- the captain

const CAPTAIN: Pins = {
  x: ['felt', 3],
  X: ['felt', 5],
  g: ['gold', 1],
  G: ['gold', 3],
  h: ['gold', 4],
};

const PIRATE = (): SideDress => {
  const d = base();
  d.head.push(
    // The tricorn in profile: a corner over the brow, a wing turned up behind, gold along the edges.
    part(
      PX - 3,
      PY - 4,
      H + 10,
      [
        '..........ccC.......',
        '........11cC3.......',
        'g......112c233.....G',
        'gg....11222333....GG',
        '1gg...112222333..GG4',
        '11gg..1122223333GG44',
        '111ggg11222233GGG444',
        '.111gggggggGGGG4444.',
        '...33444444444444...',
      ],
      'felt',
      { g: ['gold', 1], G: ['gold', 3], c: ['cream', 1], C: ['cream', 3] },
    ),
    // The patch over the near eye, its strap back over the ear; a black beard.
    part(PX + 3, PY + 5, H + 4, ['xxxxxxxxxXX', '.........XX', '........xX.'], undefined, CAPTAIN),
    part(
      PX,
      PY + 8,
      H + 3,
      [
        '.......3........',
        '.......3....344.',
        '.......3.....4..',
        '.......34..3444.',
        '.......3444444..',
        '........34444...',
        '.........344....',
      ],
      'hair',
    ),
  );
  d.torso.push(
    torso('crimson', 22, 43, T, 1),
    part(30, 23, T + 2, ['c', 'cc', 'cc', 'c', 'c', 'c'], undefined, { c: ['cream', 2] }),
    runs(
      T + 3,
      [
        [25, [32, 'g']],
        [28, [33, 'G']],
        [31, [32, 'g']],
        [34, [31, 'G']],
      ],
      { pins: CAPTAIN },
    ),
    runs(
      T + 20,
      [
        [37, [21, 'xxxxxxxxxgg']],
        [38, [21, 'XXXXXXXXXGh']],
      ],
      { pins: CAPTAIN },
    ),
  );
  d.skirt = skirt({ mat: 'crimson', hem: 54, x0: 21, x1: 33 });
  d.shoulderCap = ['.gggg..', 'gGGGGh.', 'g.G.G.h', 'g.G.G..'];
  d.capMat = 'gold';
  d.capPins = CAPTAIN;
  d.arm.push(cover('crimson', 13), { mat: 'gold', from: 12, to: 14, bulk: 1, steps: [1, 1, 3, 3] });
  d.leg.push(cover('indigo', 23, { hem: false }));
  d.boot = 'felt';
  d.peg = true;
  d.nearJob = { upper: 0, fore: 0.15, swing: 0.6, hand: 'hook' };
  // The far hand on his cutlass, point down.
  d.farJob = {
    upper: -0.05,
    fore: 0.25,
    swing: 0.25,
    hand: 'fist',
    holds: [
      byFist(1, -2, 0, ['12', '34'], 'gold'),
      byFist(-1, 5, 1, ['0122334'], 'gold'),
      runs(
        0,
        Array.from({ length: 18 }, (_, i): [number, [number, string]] => [
          FIST2.at[1] + 6 + i,
          [FIST2.at[0] + 1 + Math.floor(i / 8), i === 17 ? '1' : '013'],
        ]),
        { mat: 'iron' },
      ),
    ],
  };
  return d;
};

// ---------------------------------------------------------------- the alewife

const ALEWIFE = (): SideDress => {
  const d = base();
  d.head.push(
    part(
      PX,
      PY - 1,
      H + 5,
      [
        '.....00112......',
        '...0011111223...',
        '..011111112233..',
        '.01111111222334.',
        '0111111122223...',
        '0111111222233...',
        '0111222233......',
        '01122333........',
        '01223...........',
      ],
      'hair',
    ),
    // The broad bun, low at the back of her head.
    part(
      PX - 4,
      PY + 5,
      H + 4,
      ['.1223.', '112233', '122334', '123344', '.2344.', '..44..'],
      'hair',
    ),
  );
  d.torso.push(
    torso('madder', 22, 43, T, 1),
    part(
      30,
      24,
      T + 5,
      ['F', 'Fc', 'Fc', 'Fc', 'Fcc', 'Fcc', 'Fcc', 'Fcc', 'Fcc', 'Fcc', 'Fcc'],
      undefined,
      { F: ['cream', 2], c: ['cream', 3] },
    ),
  );
  d.skirt = skirt({ mat: 'madder', hem: 65, top: 38, x0: 21, x1: 33 });
  d.skirt2 = skirt({
    mat: 'cream',
    hem: 58,
    top: 36,
    apron: true,
    steps: [2, 2, 3, 4],
    depth: SIDE.SKIRT + 2,
  });
  d.arm.push(cover('madder', 6));
  d.leg.push({ mat: 'leather', from: 15, to: 30, bulk: 1 });
  // The tankard held up by its handle, foaming; the far fist on her hip, elbow back.
  d.nearJob = {
    upper: 0.35,
    fore: 2.3,
    swing: 0.1,
    hand: 'none',
    holds: [
      byFist(
        -3,
        -6,
        1,
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
        { f: ['cream', 0], F: ['cream', 1], i: ['iron', 2], I: ['iron', 4] },
      ),
      byFist(2, -2, 2, ['sstv', 'tuuw', 'suvw'], undefined),
    ],
  };
  d.farJob = { upper: -0.7, fore: 0.9, swing: 0, hand: 'none' };
  return d;
};

// ------------------------------------------------------------ the market woman

const MARKET = (): SideDress => {
  const d = base();
  d.head.push(
    part(
      PX,
      PY - 1,
      H + 5,
      [
        '.....00112......',
        '...0011111223...',
        '..011111112233..',
        '.01111111222334.',
        '0111111122223...',
        '01111112222.3...',
        '0111222233......',
        '01122333........',
        '01223...........',
        '1223............',
      ],
      'hair',
    ),
    part(
      PX + 1,
      PY + 9,
      H + 4,
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
        '.5..',
        '.24.',
        '.1..',
      ],
      'hair',
    ),
    // The flat basket of loaves and apples on her head.
    part(
      PX - 3,
      1,
      H + 12,
      [
        '......lLLm.aA.lLm...',
        '....llLLLmmaAAlLLmm.',
        '..%%%%%%%%%%%%%%%%%#',
        '.%&&*&&*&&*&&*&&*&&+',
        '.%&*&&*&&*&&*&&*&&++',
        '..&&*&&*&&*&&*&&*++.',
        '...***************..',
      ],
      undefined,
      {
        ...GOODS,
        l: ['wood', 0],
        L: ['wood', 1],
        m: ['wood', 3],
        '%': ['thatch', 0],
        '#': ['thatch', 2],
        '&': ['thatch', 1],
        '*': ['thatch', 3],
        '+': ['thatch', 4],
      },
    ),
  );
  d.torso.push(
    torso('cream', 22, 30, T),
    torso('indigo', 31, 43, T),
    // The shawl over her shoulders, its ends crossed at the chest.
    part(
      22,
      22,
      T + 4,
      [
        '..QQzzx..',
        '.QQzzzxx.',
        'QQzzzzxxX',
        'QzzzzzxxX',
        'Qzzzzzzxx',
        '.zzzzzxxX',
        '..zzzxxX.',
        '.....xX..',
      ],
      undefined,
      { Q: ['ochre', 1], z: ['ochre', 2], x: ['ochre', 3], X: ['ochre', 4] },
    ),
    runs(
      T + 20,
      [
        [36, [22, '1222222223']],
        [37, [22, '3333333334']],
      ],
      { mat: 'leather' },
    ),
  );
  d.skirt = skirt({ mat: 'indigo', hem: 66, top: 38 });
  d.arm.push(cover('cream', 14));
  d.leg.push({ mat: 'leather', from: 15, to: 30, bulk: 1 });
  d.nearJob = { upper: 0, fore: 0.15, swing: 0.8, hand: 'open' };
  // The far arm raised to steady the basket: the hand on its rim, the elbow out.
  d.farJob = {
    upper: 2.7,
    fore: 3.05,
    swing: 0,
    hand: 'none',
    lengths: [9, 9],
    holds: [byFist(0, -3, 1, ['.ss.', 'osst', 'sstu', '.tu.'], undefined)],
  };
  return d;
};

// ---------------------------------------------------------------- the docker

const DOCKER = (): SideDress => {
  const d = base();
  d.head.push(
    // The flat cap, its peak over the brow.
    part(
      PX,
      PY - 1,
      H + 10,
      [
        '....mnnnnpp.....',
        '..mmnnnnnnppq...',
        '.mmnnnnnnnnppq..',
        'mmnnnnnnnnnpppqq',
        'qqqqqqqqqqqqqqrr',
      ],
      undefined,
      { m: ['indigo', 1], n: ['indigo', 2], p: ['indigo', 3], q: ['indigo', 4], r: ['indigo', 5] },
    ),
    part(
      PX,
      PY + 4,
      H + 5,
      ['012.......', '0122......', '1223......', '1233......', '.23.......'],
      'hair',
    ),
    part(
      PX,
      PY + 9,
      H + 3,
      [
        '.......2........',
        '.......23..2334.',
        '.......2333.44..',
        '......2333334...',
        '.......23344....',
        '........344.....',
      ],
      'hair',
    ),
  );
  d.torso.push(
    torso('linen', 22, 26, T, 1, { steps: [1, 2, 3, 4] }),
    torso('mossdye', 27, 39, T + 2, 1),
    torso('linen', 40, 43, T, 1, { steps: [1, 2, 3, 4] }),
    runs(
      T + 20,
      [
        [38, [21, '22222222333']],
        [39, [21, '33333333444']],
      ],
      { mat: 'leather' },
    ),
    // A sack of grain over the near shoulder, its bulk down his back, its neck in his hand.
    part(
      13,
      13,
      T + 18,
      [
        '.............12..',
        '...........1223..',
        '.........011233..',
        '......0111112234.',
        '....01111122223..',
        '...011111222233..',
        '..0111112222334..',
        '.01111222223344..',
        '.11112222233344..',
        '011122222333444..',
        '111222223334445..',
        '11222223333445...',
        '1222223334455....',
        '.22233344455.....',
        '..333444555......',
        '...44455.........',
      ],
      'dirt',
    ),
  );
  d.arm.push(cover('linen', 6, { steps: [1, 2, 3, 4] }));
  d.leg.push(cover('umber', 23, { hem: false }), {
    mat: 'leather',
    from: 15,
    to: 30,
    bulk: 1,
    lip: true,
  });
  d.nearJob = { upper: 1.0, fore: 3.0, swing: 0, hand: 'fist' };
  d.farJob = { upper: 0, fore: 0.15, swing: 0.8, hand: 'fist' };
  return d;
};

// ---------------------------------------------------------------- the old man

const ELDER = (): SideDress => {
  const d = base();
  d.head.push(
    // A grey fringe round the back of his bald head, and a long grey beard.
    part(
      PX,
      PY + 4,
      H + 5,
      ['12........', '123.......', '1223......', '1233......', '.233......', '..3.......'],
      'hair',
    ),
    part(
      PX,
      PY + 7,
      H + 3,
      [
        '.......1........',
        '.......12.......',
        '.......122..234.',
        '.......1222.24..',
        '......12222223..',
        '......122222234.',
        '.....1222222334.',
        '......122223334.',
        '.......12223334.',
        '.......1222334..',
        '........12234...',
        '........1223....',
        '.........123....',
        '.........12.....',
        '..........2.....',
      ],
      'hair',
    ),
  );
  d.torso.push(
    torso('cream', 22, 43, T),
    torso('umber', 22, 43, T + 2, 0, {
      fix: Array.from({ length: 21 }, (_, i): [number, number, number] => [32, 23 + i, -1]),
    }),
  );
  d.skirt = skirt({ mat: 'umber', hem: 56, x1: 31 });
  d.arm.push(cover('umber', 14));
  d.leg.push(cover('cloth', 23, { hem: false }), {
    mat: 'leather',
    from: 15,
    to: 30,
    bulk: 1,
    lip: true,
  });
  d.body = [1, 0];
  d.hipDrop = 3;
  d.headAt = [2, 2];
  d.shoulderDx = 2;
  d.nearJob = {
    upper: 0.35,
    fore: 0.55,
    swing: 0.35,
    hand: 'fist',
    holds: [byFist(1, -2, 0, ['01', '12'], 'wood')],
  };
  d.stick = 'wood';
  d.farJob = { upper: 0.1, fore: -0.2, swing: 0, hand: 'none' };
  return d;
};

/** Each townsperson's dress seen from the side, by id. */
export const FOLK_SIDE: Readonly<Record<string, () => SideDress>> = {
  smith: SMITH,
  trader: TRADER,
  pirate: PIRATE,
  alewife: ALEWIFE,
  market: MARKET,
  docker: DOCKER,
  elder: ELDER,
};

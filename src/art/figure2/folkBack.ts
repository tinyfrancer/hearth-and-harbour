/**
 * The townsfolk from behind, walking away (B10b): each one's front drawing
 * mirrored and re-lit (views.ts, `flipLit`), with the back of their head in
 * place of their face, and the things only seen from the front taken off (an
 * apron's bib, a coat's opening, a shirt's buttons, a scarf's knot moved to
 * the nape). What they carry stays in the same hand, now seen from behind.
 */
import type { Mat } from '../town2/ramps';
import { HEAD_AT } from './body';
import { cloth, type Part2, type Pins } from './engine';
import { FOLK2, folkBoneOf, folkRig, folkSwap } from './folk';
import { HEAD_BACK } from './sideHeads';
import { BACK_AXIS, filled, flipLit, rechar } from './views';
import type { Boned, Rig2 } from './walk';

const [BX, BY] = HEAD_AT;
const hd = (
  dx: number,
  dy: number,
  rows: readonly string[],
  mat?: Mat,
  pins?: Pins,
  depth = 61,
): Part2 => ({
  at: [BX + dx, BY + dy],
  depth,
  rows,
  mat,
  pins,
});
const SKULL: Part2 = { ...HEAD_BACK, depth: 60 };

const SCARF: Pins = {
  m: ['mossdye', 1],
  n: ['mossdye', 2],
  p: ['mossdye', 3],
  q: ['mossdye', 4],
  r: ['mossdye', 5],
};

/** The back of each townsperson's head. */
const HEADS: Readonly<Record<string, readonly Part2[]>> = {
  smith: [
    SKULL,
    // His beard shows either side of his jaw.
    hd(0, 9, ['2.............3', '22...........33', '.2...........3.', '..2.........3..'], 'hair'),
  ],
  trader: [
    SKULL,
    hd(
      0,
      -1,
      [
        '.....mnnnpp....',
        '...mmnnnnnppq..',
        '..mmnnnnnnpppq.',
        '.mmnnnnnnnppppq',
        '.mnnnnnnnnpppqq',
        '.mnnnnnnnnpppqq',
        '.mnnnnnnnnpppqq',
        'mnnnnnnnnnppqqr',
        'mnnnnnnnnpppqqr',
        '.nnnnnnnnpppqq.',
        '..nnnnnnpppqq..',
        '...pnnnnppqq...',
        '....npqqpqr....',
      ],
      undefined,
      SCARF,
    ),
    // The knot at her nape and its tails.
    hd(5, 11, ['.np.', 'npqq', '.pq.', 'np.q', 'p..r', 'q..r'], undefined, SCARF, 62),
  ],
  pirate: [
    SKULL,
    hd(
      0,
      4,
      [
        '.11122223333444',
        '111122223333444',
        '111222233334444',
        '.1122223333444.',
        '..12222333344..',
        '...122233334...',
        '.....12334.....',
        '.....r2333.....',
        '......2334.....',
        '......2334.....',
        '.......34......',
      ],
      'hair',
      { r: ['crimson', 2] },
    ),
    // The patch's strap round the back of his head.
    hd(1, 5, ['xxxxxxxxxxxxX'], undefined, { x: ['felt', 3], X: ['felt', 5] }, 62),
    hd(
      -3,
      -4,
      [
        '..........cC.........',
        '.......1122c33.......',
        'g.....112222333....G.',
        'gg...1122222333...GG.',
        '1gg..1122222333..GG4.',
        '11gg.1122222333.GG44.',
        '111gg112222233.GG444.',
        '1111ggg12223GGGG4444.',
        '.1112ggggggGGGG24444.',
        '..334444444444444....',
      ],
      'felt',
      { g: ['gold', 1], G: ['gold', 3], c: ['cream', 1], C: ['cream', 3] },
      63,
    ),
  ],
  alewife: [
    SKULL,
    hd(
      0,
      -1,
      [
        '.....001112....',
        '...0011111223..',
        '..011111112233.',
        '.01111111122334',
        '.11111111222334',
        '.11121212223334',
        '.1112121222334.',
        '..112121223334.',
        '..11212122334..',
      ],
      'hair',
    ),
    hd(
      3,
      6,
      ['...1223...', '.11222334.', '1122223344', '1222233344', '.12233344.', '..23344...'],
      'hair',
      undefined,
      62,
    ),
  ],
  market: [
    SKULL,
    hd(
      0,
      -1,
      [
        '.....001112....',
        '...0011111223..',
        '..011111112233.',
        '.01111111122334',
        '.11111111222334',
        '.11121212223334',
        '.1112121222334.',
        '..112121223334.',
        '..11212122334..',
        '...122222334...',
        '....1222334....',
      ],
      'hair',
    ),
    hd(
      5,
      11,
      [
        '.233.',
        '12332',
        '.233.',
        '12332',
        '.233.',
        '12332',
        '.233.',
        '12332',
        '.233.',
        '12332',
        '..5..',
        '.234.',
        '.1.3.',
      ],
      'hair',
      undefined,
      62,
    ),
  ],
  docker: [
    SKULL,
    hd(0, 4, ['.012222223334.', '.1222222233334', '..122222333.4.', '...2.2.3.3....'], 'hair'),
    hd(
      0,
      -1,
      [
        '....mnnnnpp....',
        '..mmnnnnnnppq..',
        '.mmnnnnnnnnppq.',
        'mmnnnnnnnnnpppq',
        'qqqqqqqqqqqqqqr',
      ],
      undefined,
      { m: ['indigo', 1], n: ['indigo', 2], p: ['indigo', 3], q: ['indigo', 4], r: ['indigo', 5] },
      63,
    ),
  ],
  elder: [
    SKULL,
    hd(
      0,
      5,
      [
        '1.............4',
        '12...........34',
        '122.........334',
        '1223.......3344',
        '.12233333333344',
        '..222333333344.',
        '...2233333344..',
      ],
      'hair',
    ),
  ],
};

/**
 * What shows from behind that the front drawing never needed: the smith's
 * thighs, under the apron at the front, and the apron's strings tied in a bow
 * at the small of his back; the market woman's shawl, a point down her back
 * (B11: the front drawing turned round still showed its knot).
 */
const EXTRA: Readonly<Record<string, readonly Part2[]>> = {
  market: [
    {
      at: [18, 22],
      depth: 4,
      rows: [
        '..QQQQzzzzzzzzzxxX...',
        '.QQQQzzzzzzzzzzzxxX..',
        '.QQQzzzzzzxzzzzzzxX..',
        '..QQzzzzzzxzzzzzxX...',
        '...Qzzzzzzxzzzzzx....',
        '....Qzzzzzxzzzzx.....',
        '.....Qzzzzxzzzx......',
        '......Qzzzzzzx.......',
        '.......Qzzzzx........',
        '........Qzzx.........',
        '.........zx..........',
        '.........QX..........',
        '..........X..........',
      ],
      pins: { Q: ['ochre', 1], z: ['ochre', 2], x: ['ochre', 3], X: ['ochre', 4] },
    },
  ],
  smith: [
    {
      at: [21, 36],
      depth: 7,
      rows: [
        'aaaaaabbcbbaaaaaaa',
        'cccccbbacabbcccccc',
        '.......bcb........',
        '......ba.ab.......',
        '......b...b.......',
      ],
      pins: { a: ['leather', 3], b: ['leather', 2], c: ['leather', 4] },
    },
    cloth(
      0,
      'umber',
      [
        ...Array.from({ length: 13 }, (_, i): [number, number, number] => [43 + i, 21, 27]),
        ...Array.from({ length: 13 }, (_, i): [number, number, number] => [43 + i, 29, 35]),
      ],
      { turn: 0.6 },
    ),
  ],
};

/** What of each front drawing does not show from behind (by its index in the drawing), and what is closed or recoloured. */
const BEHIND: Readonly<Record<string, (p: Part2, i: number) => Part2 | null>> = {
  smith: (p, i) => (i === 0 ? null : p.mat === 'leather' && p.depth === 6 ? null : p),
  trader: (p, i) => (i <= 1 || i === 3 || i === 4 ? null : i === 2 ? rechar(p, { '5': '3' }) : p),
  pirate: (p, i) =>
    i <= 3 || i === 5
      ? null
      : i === 4
        ? filled(p, '2')
        : i === 6
          ? rechar(p, { g: 'x', G: 'X' })
          : p,
  alewife: (p, i) => (i <= 1 ? null : p.mat === 'cream' && p.depth === 5 ? null : p),
  // The shawl is crossed and knotted in front; from behind it is a point down the back (EXTRA).
  market: (p, i) => (i <= 1 || i === 7 ? null : p),
  docker: (p, i) => (i === 0 || i === 3 ? null : p),
  elder: (p, i) => (i === 0 || i === 1 ? null : i === 2 ? rechar(filled(p, '2'), { '5': '3' }) : p),
};

/** A townsperson from behind, ready for the walk's rig; null for an unknown id. */
export function folkBackParts(
  id: string,
): { boned: Boned[]; rig: Rig2; swap: ReturnType<typeof folkSwap> } | null {
  const folk = FOLK2.find((f) => f.id === id);
  if (!folk) return null;
  const front = folkRig(id);
  const rig: Rig2 = {
    ...front,
    split: 27,
    feet: [
      [19, 27],
      [29, 36],
    ],
    wrists: [front.wrists[1], front.wrists[0]],
    swing: [front.swing[1], front.swing[0]],
    stiff: front.stiff === 'near' ? 'far' : front.stiff === 'far' ? 'near' : undefined,
  };
  const rule = BEHIND[id] ?? ((p: Part2) => p);
  const boned: Boned[] = [];
  folk.parts.forEach((p, i) => {
    const kept = rule(p, i);
    if (!kept) return;
    const turned = flipLit(kept, BACK_AXIS);
    boned.push({ part: turned, bone: folkBoneOf(turned, rig) });
  });
  for (const p of HEADS[id] ?? []) boned.push({ part: p, bone: 'head' });
  for (const p of EXTRA[id] ?? []) boned.push({ part: p, bone: folkBoneOf(p, rig) });
  return { boned, rig, swap: folkSwap(id) };
}

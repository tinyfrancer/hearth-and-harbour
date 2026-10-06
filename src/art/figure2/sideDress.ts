/**
 * Every wearable seen from the side (B10b): what each gear id puts on the
 * walking figure of side.ts. A torso garment is drawn whole in profile on the
 * standing torso (rigid with the hips' bob), its skirt below the belt is laid
 * per frame between the legs that push it, its sleeves are stretches of the
 * arm, its trousers and boots stretches of the leg. Plate's caps (pauldron,
 * couter, knee cop) ride on their joints. What is held is the front view's
 * own drawing carried rigidly in the fist (a blade or haft seen from the side
 * is the same line), so the hand rule holds by construction; a shield shows
 * its face on the near arm and its edge beyond the chest on the far one.
 */
import { DEPTH } from '../depth';
import type { Mat } from '../town2/ramps';
import { cloth, moved, runs, type Extent, type Part2, type Pins } from './engine';
import { FIST2 } from './body';
import { HELD2 } from './held';
import { mirrored } from './views';
import { KNIGHT2 } from './knight';
import { HAIR_VIEWS, HEAD_SIDE, HEADGEAR_SIDE } from './sideHeads';
import { SIDE, type SideDress, type SkirtSpec } from './side';
import type { Cover } from './rig2';

const rows = (a: number, b: number, x0: number, x1: number): Extent[] =>
  Array.from({ length: b - a + 1 }, (_, i): Extent => [a + i, x0, x1]);

/** The torso in profile, facing right: the back on the left, the chest on the right, collar to seat. */
export const TORSO_SIDE: readonly Extent[] = [
  [22, 25, 29],
  [23, 24, 30],
  [24, 23, 31],
  [25, 23, 32],
  [26, 23, 32],
  ...rows(27, 30, 22, 33),
  [31, 22, 32],
  [32, 23, 32],
  ...rows(33, 36, 23, 31),
  [37, 23, 31],
  ...rows(38, 41, 22, 32),
  ...rows(42, 43, 22, 32),
];
/** Where a garment's skirt begins to swing, and the waist's columns there. */
const WAIST = { y: 39, x0: 22, x1: 32 } as const;

const T = SIDE.TORSO;

/** A torso garment by hand in profile: `cloth` over the side torso from `top` to `bottom`, corrected. */
const torso = (
  mat: Mat,
  top: number,
  bottom: number,
  o: Parameters<typeof cloth>[3] = {},
  depth: number = T,
  shape: readonly Extent[] = TORSO_SIDE,
): Part2 =>
  cloth(
    depth,
    mat,
    shape.filter(([y]) => y >= top && y <= bottom),
    { turn: 0.6, ...o },
  );

/** The neck's front, under any collar, and the smallclothes. */
const SMALLCLOTHES = torso('linen', 22, 43, {}, 1);

const skirt = (s: Partial<SkirtSpec> & { mat: Mat; hem: number }): SkirtSpec => ({
  top: WAIST.y,
  x0: WAIST.x0,
  x1: WAIST.x1,
  depth: SIDE.SKIRT,
  ...s,
});

const sleeve = (mat: Mat, to: number, o: Partial<Cover> = {}): Cover => ({
  mat,
  from: 0,
  to,
  bulk: 1,
  hem: true,
  ...o,
});

/** What one gear id adds to the side view. */
type Dresser = (d: SideDress) => void;

/**
 * Held things lean forward in profile: the front drawing turned about the
 * fist's own middle column, so the guard, the knuckle bow and the haft keep
 * their places round the fingers and the blade leans toward the walk.
 */
const FIST_AXIS = 2 * (FIST2.at[0] + 2);

const heldParts = (id: string) =>
  HELD2.find((g) => g.id === id)?.parts ?? KNIGHT2.find((g) => g.id === id)?.parts ?? [];

/** The collar's V at the front of the neck, dark inside. */
const V_SIDE: readonly (readonly [number, number, number])[] = [
  [29, 22, 4],
  [30, 23, 4],
  [30, 24, 3],
  [31, 24, 4],
];

const BRASS: Pins = { b: ['bronze', 1], B: ['bronze', 3] };

export const SIDE_GEAR: Readonly<Record<string, Dresser>> = {
  // ------------------------------------------------------------ everyday
  teal_tunic: (d) => {
    d.torso.push(
      torso('teal', 22, 43, {
        folds: [
          [
            [33, 28],
            [37, 27],
          ],
        ],
        fix: [...V_SIDE],
      }),
    );
    d.arm.push(sleeve('teal', 14));
    d.skirt = skirt({ mat: 'teal', hem: 46 });
  },
  linen_tunic: (d) => {
    d.torso.push(
      torso('linen', 22, 43, {
        steps: [1, 2, 3, 4],
        folds: [
          [
            [33, 26],
            [36, 26],
          ],
          [
            [32, 29],
            [35, 30],
          ],
        ],
        fix: [...V_SIDE, [31, 23, 1]],
      }),
    );
    d.arm.push(sleeve('linen', 6, { steps: [1, 1, 2, 3] }));
    d.skirt = skirt({ mat: 'linen', hem: 46, steps: [1, 2, 3, 4] });
  },
  grey_trousers: (d) => d.leg.push({ mat: 'cloth', from: 0, to: 23, bulk: 1 }),
  linen_trousers: (d) =>
    d.leg.push({ mat: 'linen', from: 0, to: 23, bulk: 1, steps: [2, 3, 3, 4] }),
  leather_boots: (d) => {
    d.leg.push({ mat: 'leather', from: 15, to: 30, bulk: 1, lip: true });
    d.boot = 'leather';
  },
  leather_belt: (d) =>
    d.torso.push(
      runs(
        T + 20,
        [
          [37, [22, '1222222'], [29, 'gGg']],
          [38, [22, '3333333'], [29, 'GhG'], [32, '4']],
        ],
        { mat: 'leather', pins: { g: ['gold', 2], G: ['gold', 4], h: ['leather', 5] } },
      ),
    ),

  // ----------------------------------------------------------- the head
  linen_hood: (d) => d.head.push(...HEADGEAR_SIDE.linen_hood!),
  bronze_cap: (d) => d.head.push(...HEADGEAR_SIDE.bronze_cap!),
  iron_nasal_helm: (d) => d.head.push(...HEADGEAR_SIDE.iron_nasal_helm!),
  leather_cap: (d) => d.head.push(...HEADGEAR_SIDE.leather_cap!),
  feathered_hat: (d) => d.head.push(...HEADGEAR_SIDE.feathered_hat!),
  tricorn: (d) => d.head.push(...HEADGEAR_SIDE.tricorn!),
  velvet_cap: (d) => d.head.push(...HEADGEAR_SIDE.velvet_cap!),

  // ---------------------------------------------------------- body armour
  bronze_jerkin: (d) => {
    d.torso.push(
      torso(
        'hide',
        23,
        41,
        {
          fix: [
            [29, 23, -1],
            [24, 23, 1],
            [25, 23, 1],
            [24, 24, 1],
          ],
        },
        T + 10,
        TORSO_SIDE.map(([y, a, b]): Extent => [y, a, Math.max(a, b - (y < 25 ? 1 : 0))]),
      ),
      // The disc over the heart, its rim showing at the chest.
      runs(
        T + 12,
        [
          [27, [31, '01']],
          [28, [31, '0123']],
          [29, [31, '1234']],
          [30, [31, '234']],
        ],
        { mat: 'bronze' },
      ),
    );
    d.skirt = skirt({ mat: 'hide', hem: 45, tabs: 3, steps: [1, 2, 3, 4], depth: SIDE.SKIRT + 1 });
  },
  iron_mail: (d) => {
    d.torso.push(mailTorso());
    d.arm.push(sleeve('iron', 8, { pattern: 'mail', steps: [1, 1, 2, 3] }));
    d.skirt = skirt({
      mat: 'iron',
      hem: 47,
      pattern: 'mail',
      steps: [1, 1, 2, 3],
      depth: SIDE.SKIRT + 1,
    });
  },
  leather_jerkin: (d) => {
    d.torso.push(
      // The leather's front edge lit where the lacing pulls it, under the cord.
      torso(
        'tan',
        23,
        41,
        {
          fix: [
            [32, 26, 1],
            [32, 28, 1],
            [32, 30, 1],
            [32, 32, 1],
            [31, 27, 1],
            [31, 29, 1],
            [31, 31, 1],
            [31, 33, 1],
          ],
        },
        T + 10,
      ),
      // The lacing up the front: linen cord crossing at the chest's edge.
      runs(
        T + 11,
        [
          [26, [32, 'c']],
          [27, [31, 'c']],
          [28, [32, 'c']],
          [29, [31, 'c']],
          [30, [32, 'c']],
          [31, [31, 'c']],
          [32, [31, 'C']],
          [33, [30, 'c']],
          [34, [30, 'C']],
          [35, [30, 'c']],
        ],
        { pins: { c: ['linen', 1], C: ['linen', 3] } },
      ),
    );
    d.skirt = skirt({ mat: 'tan', hem: 46, tabs: 3, depth: SIDE.SKIRT + 1 });
  },
  leather_bracers: (d) =>
    d.arm.push({ mat: 'tan', from: 9, to: 14, bulk: 1, pattern: 'lace', cord: 'linen', hem: true }),
  captains_coat: (d) => {
    d.torso.push(
      torso(
        'midnight',
        22,
        43,
        {
          fix: [
            [31, 23, -1],
            [30, 22, -1],
          ],
        },
        T + 10,
      ),
      // Brass braid down the coat's open front edge.
      runs(
        T + 11,
        [
          ...Array.from(
            { length: 19 },
            (_, i) => [24 + i, [i < 9 ? 31 : 30, i % 3 === 0 ? 'B' : 'b']] as const,
          ),
        ],
        { pins: BRASS },
      ),
    );
    d.arm.push(sleeve('midnight', 13), {
      mat: 'bronze',
      from: 12,
      to: 14,
      bulk: 1,
      steps: [1, 1, 2, 3],
    });
    d.skirt = skirt({ mat: 'midnight', hem: 56, x1: 31, depth: SIDE.SKIRT + 1 });
  },

  // ------------------------------------------------------------ trinkets
  shell_necklace: (d) =>
    d.torso.push(
      neckCord(
        [
          ['shell', 1],
          ['shell', 3],
        ],
        'shell',
      ),
    ),
  trollstone: (d) =>
    d.torso.push(
      neckCord(
        [
          ['stone', 1],
          ['stone', 3],
        ],
        'stone',
      ),
    ),
  hunters_charm: (d) =>
    d.torso.push(
      neckCord(
        [
          ['linen', 1],
          ['linen', 2],
        ],
        'linen',
      ),
    ),
  shell_bracelet: (d) =>
    d.weaponArm.push({ mat: 'shell', from: 12, to: 14, bulk: 1, steps: [1, 2, 2, 3] }),
  arrow_quiver: (d) => quiver(d, 'linen'),
  barbed_quiver: (d) => quiver(d, 'crimson'),

  // ----------------------------------------------------------- the knight
  knight_plate: (d) => {
    d.torso.push({
      at: [22, 23],
      depth: T + 10,
      mat: 'plate',
      rows: [
        '..01122.....',
        '.0011123....',
        '.00111233...',
        '0001112334..',
        '00011123344.',
        '001112233344',
        '011122233344',
        '011122233444',
        '111222233444',
        '.11222333444',
        '.1222233344.',
        '.122233344..',
        '.12223334...',
        '.4444444455.',
      ],
    });
    d.shoulderCap = [
      '..0112..',
      '.011223.',
      '01122334',
      '44444455',
      '.122334.',
      '.4445555',
      '..1223..',
      '..4455..',
    ];
    d.elbowCap = ['.012.', '01234', '.455.'];
    d.capMat = 'plate';
    d.arm.push({ mat: 'plate', from: 8, to: 14, bulk: 1, pattern: 'plate', steps: [1, 1, 2, 3] });
    d.skirt = skirt({
      mat: 'plate',
      hem: 45,
      top: 37,
      pattern: 'lames',
      steps: [1, 1, 2, 3],
      depth: SIDE.SKIRT + 1,
    });
  },
  knight_knees: (d) => {
    d.kneeCap = ['.0112.', '011223', '112334', '.4455.'];
    d.capMat = 'plate';
  },
  red_cloak: (d) => {
    d.cloak = { mat: 'crimson' };
    d.torso.push(
      runs(
        T + 15,
        [
          [22, [24, '122']],
          [23, [23, '1122']],
          [24, [23, '123']],
        ],
        { mat: 'crimson' },
      ),
    );
  },
};

/** The mail shirt in profile: rings in offset rows, lit high on the back, darker under the arm. */
function mailTorso(): Part2 {
  const lines = TORSO_SIDE.filter(([y]) => y >= 23 && y <= 43).map(([y, x0, x1]) => {
    let s = '';
    for (let x = x0; x <= x1; x++) {
      const t = (x - x0) / Math.max(1, x1 - x0);
      const ring = (x + (Math.floor(y / 2) % 2)) % 2 === 0;
      const top = y % 2 === 0;
      let step = 1 + (t > 0.62 ? 1 : 0) + (t > 0.9 ? 1 : 0) + (ring ? (top ? 0 : 1) : top ? 1 : 0);
      if (x === x0) step = 1;
      if (y === 43) step = 4;
      s += String(Math.max(0, Math.min(4, step)));
    }
    return [y, [x0, s]] as const;
  });
  return runs(T + 10, lines, { mat: 'iron' });
}

/** A cord round the neck with what hangs from it at the chest's front. */
function neckCord(stone: readonly (readonly [Mat, number])[], _mat: Mat): Part2 {
  return runs(
    T + 25,
    [
      [23, [27, 'kk']],
      [24, [29, 'k']],
      [25, [30, 'k']],
      [26, [31, 'ab']],
      [27, [31, 'bb']],
    ],
    {
      pins: {
        k: ['leather', 4],
        a: [stone[0]![0], stone[0]![1]],
        b: [stone[1]![0], stone[1]![1]],
      },
    },
  );
}

/** A quiver on the back, its mouth by the shoulder and its fletchings above it; the strap over the near shoulder. */
function quiver(d: SideDress, fletch: Mat): void {
  d.back.push({
    at: [16, 15],
    depth: SIDE.BACK,
    rows: [
      '..a..a..',
      '.ab.ab..',
      'abcabc..',
      '.bcbc...',
      '..s.s...',
      '.OOOO...',
      '.1223...',
      '.12234..',
      '..1234..',
      '..12234.',
      '...1234.',
      '...12234',
      '....1234',
      '....1234',
      '.....123',
      '.....234',
      '......34',
    ],
    mat: 'leather',
    pins: { a: [fletch, 1], b: [fletch, 2], c: [fletch, 4], s: ['wood', 3], O: ['leather', 4] },
  });
  d.torso.push(
    runs(
      T + 24,
      [
        [22, [24, '23']],
        [23, [25, '23']],
        [24, [27, '23']],
        [25, [29, '23']],
        [26, [30, '3']],
      ],
      { mat: 'leather' },
    ),
  );
}

/** The side view's dress for a list of gear ids (as `characterGear2` gives), or null if any id has no side drawing. */
export function sideDress(gearIds: readonly string[]): SideDress | null {
  const d: SideDress = {
    torso: [SMALLCLOTHES],
    head: [{ ...HEAD_SIDE, depth: SIDE.HEAD }],
    leg: [],
    arm: [],
    weaponArm: [],
    boot: 'leather',
    held: [],
    shield: [],
    back: [],
  };
  for (const id of gearIds) {
    const hair = HAIR_VIEWS[id];
    if (hair) {
      d.head.push(...hair.map((p) => ({ ...p, depth: SIDE.HEAD + 5 })));
      continue;
    }
    const dresser = SIDE_GEAR[id];
    if (dresser) {
      dresser(d);
      continue;
    }
    const held = HELD2.find((g) => g.id === id) ?? KNIGHT2.find((g) => g.id === id);
    if (held?.slot === 'weapon') d.held.push(...heldParts(id).map((p) => mirrored(p, FIST_AXIS)));
    else if (id === 'spyglass') d.offHeld = [moved(heldParts(id)[0]!, -18, 2)];
    else if (held?.slot === 'shield') d.shield.push(...heldParts(id));
    else return null;
  }
  // Head gear over hair, hair over the head, all with the head.
  d.head = d.head.map((p) => ({
    ...p,
    depth:
      SIDE.HEAD +
      (p.depth >= DEPTH.HELMET - 1 ? 10 + (p.depth - DEPTH.HELMET) : p.depth === SIDE.HEAD ? 0 : 5),
  }));
  return d;
}

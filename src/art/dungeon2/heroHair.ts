/**
 * The hero's portrait (heroFace.ts): the hairstyles and beards added in B13,
 * drawn as the B11 styles are, solid shaded masses placed by hand as rings of
 * points with a few deliberate locks; each with its own silhouette, so a
 * style reads in the 48-pixel panel as it does on the figure.
 *
 * Beards are in the hair's colour, the mouth always showing: a beard is drawn
 * after the face and the mouth is laid back over it, as a moustache sits on
 * the upper lip and a beard parts under the lower one. Stubble is one tone
 * over the jaw with a broken top edge, never a speckle.
 */
import type { TGrid } from '../town2/cells';
import { blob, cast, form, marks, stroke, tone, type Inside, type Pts } from './heads';
import type { Mat2 as Mat } from './cave';

export type NewStyle = 'ponytail' | 'topknot' | 'curly' | 'mohawk' | 'bob' | 'twin_braids';

const hairForm = (g: TGrid, inside: Inside, hair: Mat, base = 2.3) =>
  form(g, inside, hair, { cx: 26, cy: 6, rx: 26, ry: 22, base, k: 1.5, rim: 3 });

/** Hair pulled back from a high, clean hairline (the ponytail's and the topknot's). */
const PULLED: Pts = [
  [16, 28],
  [16, 17],
  [22, 9],
  [34, 4],
  [46, 6],
  [55, 12],
  [58, 22],
  [57, 29],
  [54, 21],
  [48, 15],
  [40, 13],
  [32, 13],
  [25, 16],
  [20, 22],
  [19, 28],
];

/** The crown of each new style: what head gear covers. */
export const NEW_CROWN: Readonly<Record<NewStyle, Pts>> = {
  ponytail: PULLED,
  topknot: PULLED,
  curly: [
    [14, 42],
    [10, 32],
    [9, 21],
    [13, 11],
    [20, 4],
    [28, 1],
    [37, 0],
    [46, 1],
    [54, 5],
    [60, 12],
    [63, 22],
    [62, 33],
    [58, 42],
    [55, 33],
    [54, 25],
    [50, 20],
    [46, 22],
    [42, 18],
    [37, 21],
    [32, 18],
    [27, 22],
    [23, 19],
    [20, 26],
    [19, 34],
    [17, 42],
  ],
  mohawk: [
    [30, 17],
    [29, 8],
    [31, 2],
    [35, 0],
    [40, 1],
    [43, 7],
    [42, 17],
    [39, 13],
    [36, 15],
    [33, 13],
  ],
  bob: [
    [15, 46],
    [13, 34],
    [13, 20],
    [19, 9],
    [31, 3],
    [44, 4],
    [54, 10],
    [60, 20],
    [60, 34],
    [58, 46],
    [53, 46],
    [54, 34],
    [54, 24],
    [50, 19],
    [36, 19],
    [22, 19],
    [19, 25],
    [19, 36],
    [20, 46],
  ],
  twin_braids: [
    [16, 34],
    [15, 18],
    [21, 9],
    [33, 4],
    [46, 6],
    [55, 12],
    [59, 22],
    [58, 34],
    [55, 26],
    [52, 18],
    [44, 13],
    [37, 14],
    [36, 10],
    [35, 14],
    [28, 13],
    [21, 18],
    [19, 26],
  ],
};

/** Locks over each new crown: partings and lit strands. */
const NEW_LOCKS: Readonly<Record<NewStyle, readonly [Pts, number][]>> = {
  ponytail: [
    [
      [
        [27, 14],
        [33, 8],
        [42, 6],
      ],
      4,
    ],
    [
      [
        [22, 18],
        [27, 10],
      ],
      1,
    ],
    [
      [
        [46, 14],
        [51, 11],
      ],
      4,
    ],
  ],
  topknot: [
    [
      [
        [28, 14],
        [33, 8],
      ],
      4,
    ],
    [
      [
        [44, 14],
        [40, 8],
      ],
      4,
    ],
    [
      [
        [22, 18],
        [27, 10],
      ],
      1,
    ],
  ],
  curly: [],
  mohawk: [
    [
      [
        [33, 3],
        [33, 13],
      ],
      1,
    ],
    [
      [
        [39, 3],
        [39, 12],
      ],
      4,
    ],
  ],
  bob: [
    [
      [
        [28, 9],
        [28, 18],
      ],
      4,
    ],
    [
      [
        [42, 9],
        [42, 18],
      ],
      4,
    ],
    [
      [
        [22, 12],
        [30, 6],
      ],
      1,
    ],
    [
      [
        [16, 30],
        [16, 42],
      ],
      1,
    ],
  ],
  twin_braids: [
    [
      [
        [36, 5],
        [36, 13],
      ],
      4,
    ],
    [
      [
        [24, 12],
        [31, 8],
      ],
      1,
    ],
  ],
};

/** The little curls over a curly crown: a lit arc over a dark one, placed by hand. */
const CURLS: readonly [number, number][] = [
  [17, 9],
  [24, 5],
  [32, 3],
  [40, 3],
  [48, 6],
  [55, 11],
  [12, 18],
  [19, 15],
  [27, 11],
  [35, 9],
  [43, 10],
  [51, 14],
  [58, 19],
  [12, 27],
  [58, 28],
  [14, 35],
  [56, 37],
];

/** The crown of a new style with its locks (no head gear on). */
export function drawNewCrown(g: TGrid, style: NewStyle, hair: Mat, skin: Mat): void {
  if (style === 'mohawk') {
    // Shaved sides: the stubble's one tone over the scalp either side of the crest.
    for (const side of [
      [
        [19, 24],
        [20, 14],
        [27, 9],
        [30, 10],
        [29, 17],
        [22, 22],
      ],
      [
        [54, 24],
        [53, 14],
        [46, 9],
        [43, 10],
        [44, 17],
        [51, 22],
      ],
    ] as const)
      form(g, blob(side), hair, { cx: 26, cy: 6, rx: 30, ry: 24, base: 3.6, k: 0.4, rim: 1 });
  }
  const crown = blob(NEW_CROWN[style]);
  hairForm(g, crown, hair, style === 'curly' ? 2.1 : 2.3);
  for (const [pts, step] of NEW_LOCKS[style]) stroke(g, pts, hair, step);
  if (style === 'curly')
    for (const [x, y] of CURLS)
      marks(g, x - 2, y - 1, ['.aa.', 'a..b', '.bb.'], { a: [hair, 1], b: [hair, 4] });
  if (style === 'topknot') {
    const bun = blob([
      [29, 9],
      [30, 3],
      [35, 0],
      [41, 1],
      [44, 6],
      [43, 10],
    ]);
    form(g, bun, hair, { cx: 32, cy: 1, rx: 9, ry: 7, base: 2.2, k: 1.5, rim: 2 });
    stroke(
      g,
      [
        [30, 10],
        [43, 10],
      ],
      'leather',
      3,
    );
  }
  cast(g, crown, { n: 1, dx: 1, dy: 1, on: [skin] });
}

/** Under a helm or hood: what of a new style shows below the rim (the curls' and the bob's sides). */
export function drawNewUnder(g: TGrid, style: NewStyle, hair: Mat): void {
  const sides: Readonly<Partial<Record<NewStyle, readonly Pts[]>>> = {
    curly: [
      [
        [12, 22],
        [19, 22],
        [19, 40],
        [14, 43],
        [9, 34],
      ],
      [
        [54, 22],
        [61, 22],
        [63, 34],
        [58, 43],
        [54, 40],
      ],
    ],
    bob: [
      [
        [13, 22],
        [19, 22],
        [20, 46],
        [15, 46],
        [13, 34],
      ],
      [
        [54, 22],
        [60, 22],
        [60, 34],
        [58, 46],
        [53, 46],
      ],
    ],
    twin_braids: [
      [
        [15, 22],
        [20, 21],
        [20, 34],
        [16, 34],
      ],
      [
        [53, 21],
        [58, 22],
        [58, 34],
        [54, 34],
      ],
    ],
  };
  for (const s of sides[style] ?? []) hairForm(g, blob(s), hair, 2.4);
  if (style === 'curly')
    for (const [x, y] of CURLS.filter(([, y]) => y >= 26))
      marks(g, x - 2, y - 1, ['.aa.', 'a..b', '.bb.'], { a: [hair, 1], b: [hair, 4] });
}

/** Behind the head and shoulders: the ponytail's tail, swinging out past the far side. */
export function drawBehind(g: TGrid, style: string, hair: Mat): void {
  if (style !== 'ponytail') return;
  const tail = blob([
    [53, 18],
    [60, 20],
    [64, 30],
    [65, 42],
    [63, 54],
    [58, 58],
    [57, 46],
    [58, 34],
    [55, 24],
  ]);
  form(g, tail, hair, { cx: 56, cy: 20, rx: 10, ry: 30, base: 2.6, k: 1.3, rim: 2 });
  stroke(
    g,
    [
      [59, 26],
      [61, 38],
      [60, 50],
    ],
    hair,
    4,
  );
  stroke(
    g,
    [
      [55, 22],
      [60, 23],
    ],
    'leather',
    3,
  );
}

/** In front of the shoulders: twin braids, each a column of plaited lobes. */
export function drawBraids(g: TGrid, hair: Mat, top = 34): void {
  for (const [x0, dark] of [
    [17, 0],
    [55, 0.4],
  ] as const)
    for (let i = 0; top + i * 5 < 66; i++) {
      const y = top + i * 5;
      const x = x0 + (x0 < 36 ? -1 : 1) * Math.round(i * 0.4);
      const lobe = blob([
        [x - 4, y + 1],
        [x - 1, y - 2],
        [x + 3, y],
        [x + 3, y + 4],
        [x - 1, y + 5],
      ]);
      form(g, lobe, hair, {
        cx: x - 3,
        cy: y - 2,
        rx: 5,
        ry: 5,
        base: 2.4 + dark,
        k: 1.5,
        rim: 2,
      });
    }
}

// ------------------------------------------------------------------ beards

/** The mouth, laid back over a beard (the same marks as the face's). */
const MOUTH = ['.........4', '4.......4.', '.4444444..', '..2222....'];

const MOUSTACHE_PTS: Pts = [
  [27, 41],
  [29, 37],
  [35, 36],
  [37, 37],
  [39, 36],
  [45, 37],
  [47, 41],
  [45, 43],
  [41, 39],
  [33, 39],
  [29, 43],
];

const BEARDS: Readonly<Record<string, Pts>> = {
  short_beard: [
    [17, 32],
    [21, 40],
    [27, 44],
    [37, 45],
    [47, 44],
    [53, 40],
    [56, 32],
    [57, 42],
    [53, 51],
    [45, 56],
    [37, 58],
    [29, 56],
    [21, 51],
    [16, 42],
  ],
  full_beard: [
    [15, 28],
    [20, 38],
    [27, 44],
    [37, 45],
    [47, 44],
    [53, 38],
    [58, 28],
    [60, 42],
    [56, 54],
    [47, 62],
    [37, 65],
    [27, 62],
    [18, 54],
    [14, 42],
  ],
  braided_beard: [
    [17, 32],
    [21, 40],
    [27, 44],
    [37, 45],
    [47, 44],
    [53, 40],
    [56, 32],
    [57, 42],
    [53, 50],
    [45, 55],
    [37, 57],
    [29, 55],
    [21, 50],
    [16, 42],
  ],
};

const CHOPS: readonly Pts[] = [
  [
    [16, 28],
    [21, 30],
    [24, 38],
    [30, 42],
    [27, 46],
    [20, 44],
    [16, 38],
  ],
  [
    [57, 28],
    [52, 30],
    [49, 38],
    [43, 42],
    [46, 46],
    [53, 44],
    [57, 38],
  ],
];

/**
 * A beard (by its look id) on the portrait's face. `only` keeps what lies in
 * a band of rows: under a hood the cheeks are drawn before it and the beard
 * below the jaw again after its cape, so it lies over the cape.
 */
export function drawBeard(
  g: TGrid,
  beard: string | null | undefined,
  hair: Mat,
  skin: Mat,
  only: (y: number) => boolean = () => true,
): void {
  if (!beard || beard === 'none') return;
  const P =
    (inside: Inside): Inside =>
    (x, y) =>
      only(y) && inside(x, y);
  const mouth = () => {
    const rows = MOUTH.map((r, j) => (only(40 + j) ? r : '.'.repeat(r.length)));
    marks(g, 30, 40, rows, { 2: [skin, 2], 4: [skin, 4] });
  };
  if (beard === 'stubble') {
    // One tone over the jaw and chin, its top edge broken; the mouth kept.
    const jaw = blob([
      [20, 35],
      [23, 39],
      [26, 38],
      [28, 43],
      [33, 44],
      [37, 46],
      [41, 44],
      [46, 43],
      [48, 38],
      [51, 39],
      [53, 35],
      [52, 42],
      [48, 47],
      [41, 51],
      [32, 51],
      [25, 47],
      [21, 42],
    ]);
    // The skin a step darker over the jaw, and the hair's own tone in a band along
    // its lower edge, thickest at the chin, its top edge ragged.
    tone(g, P(jaw), 1, [skin]);
    const band = blob([
      [20, 40],
      [24, 46],
      [32, 51],
      [41, 51],
      [49, 46],
      [53, 40],
      [50, 42],
      [45, 45],
      [41, 47],
      [37, 46],
      [32, 47],
      [28, 45],
      [23, 42],
    ]);
    form(g, P(band), hair, { cx: 30, cy: 40, rx: 20, ry: 12, base: 3.2, k: 0.4, rim: 1 });
    mouth();
    return;
  }
  if (beard === 'mutton_chops') {
    for (const c of CHOPS)
      form(g, P(blob(c)), hair, { cx: 24, cy: 30, rx: 14, ry: 14, base: 2.5, k: 1.3, rim: 2 });
  }
  const mass = BEARDS[beard];
  if (mass) {
    const s = blob(mass);
    form(g, P(s), hair, {
      cx: 30,
      cy: 42,
      rx: 22,
      ry: 22,
      base: 2.6,
      k: 1.3,
      rim: 3,
    });
    // Three or four strokes down it: partings and a lit lock.
    for (const [pts, step] of [
      [
        [
          [27, 49],
          [30, 55],
        ],
        4,
      ],
      [
        [
          [44, 49],
          [42, 55],
        ],
        4,
      ],
      [
        [
          [22, 44],
          [24, 50],
        ],
        1,
      ],
    ] as const)
      if (only(pts[0][1])) stroke(g, pts, hair, step);
  }
  if (beard === 'braided_beard')
    for (let i = 0; i < 3; i++) {
      const y = 56 + i * 5;
      const lobe = blob([
        [33, y + 1],
        [36, y - 2],
        [40, y],
        [40, y + 4],
        [36, y + 5],
      ]);
      form(g, P(lobe), hair, { cx: 34, cy: y - 2, rx: 5, ry: 5, base: 2.4, k: 1.5, rim: 2 });
    }
  if (beard === 'braided_beard' && only(70)) {
    marks(g, 35, 70, ['abba'], { a: ['gold', 1], b: ['gold', 3] });
  }
  // Every beard but stubble has a moustache over the upper lip.
  form(g, P(blob(MOUSTACHE_PTS)), hair, {
    cx: 34,
    cy: 36,
    rx: 12,
    ry: 6,
    base: 2.4,
    k: 1.4,
    rim: 2,
  });
  mouth();
}

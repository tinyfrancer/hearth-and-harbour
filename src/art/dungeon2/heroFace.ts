/**
 * The hero's portrait at the C scale (B11): a likeable adventurer in any
 * look and anything worn on the head. Built as the H2 head on the figure is,
 * at three times its size: a round head a little wider than tall, open eyes
 * with the iris centred and a catch-light, soft brows in the hair's colour at
 * the step that stands clear of the skin, a broken fringe, a small easy
 * smile. Hair has volume (a pixel or three proud of the skull) and its own
 * silhouette per style; helmets and hoods sit above the brows and frame the
 * face rather than burying it.
 *
 * Hair is split as on the figure: the crown (what head gear covers) and what
 * hangs (long hair's curtains, the braid, the nape), so under a helm only
 * the hang is drawn, and under a brimmed hat the hair at the temples too.
 */
import { put, type TGrid } from '../town2/cells';
import { cell } from './cave';
import type { Mat2 as Mat } from './cave';
import { blob, cast, form, marks, pinsFor, stroke, tone, type Inside, type Pts } from './heads';
import { rod } from './kit';
import { browShift } from '../figure2/look';
import type { Mat as TownMat } from '../town2/ramps';

/** The hero's portrait parts: skin, hair colour and style, head gear and body gear ids (the figures' gear ids). */
export interface HeroBust {
  readonly skin: Mat;
  readonly hair: Mat;
  readonly style: 'short' | 'long' | 'braid' | 'shaggy' | 'bald';
  readonly head: string | null;
  readonly body: string | null;
  readonly neck: string | null;
  /** The shirt under the body garment (`linen_tunic`; the everyday teal one when none). */
  readonly shirt?: string | null;
}

/** The head's outline: round, the jaw soft, a little wider than tall. */
const HEAD: Pts = [
  [36, 10],
  [47, 12],
  [54, 19],
  [56, 29],
  [54, 39],
  [49, 47],
  [41, 52],
  [32, 52],
  [24, 47],
  [19, 39],
  [17, 29],
  [19, 19],
  [26, 12],
];

/** Head gear that leaves the hair at the temples showing under a brim. */
const BRIMMED = new Set(['feathered_hat', 'tricorn', 'velvet_cap']);

const shoulders = (top = 54): Inside =>
  blob([
    [-4, 74],
    [-3, 64],
    [8, top + 3],
    [24, top],
    [48, top],
    [64, top + 3],
    [75, 64],
    [76, 74],
  ]);

/** The body garment at the shoulders, by the figures' gear id. */
const BODY: Readonly<Record<string, (g: TGrid, shirt: Mat) => void>> = {
  shirt: (g, shirt) => tunic(g, shirt),
  leather_jerkin: (g, shirt) => {
    tunic(g, shirt);
    const j = blob([
      [-4, 74],
      [-3, 64],
      [8, 58],
      [22, 56],
      [30, 72],
    ]);
    const k = blob([
      [42, 72],
      [50, 56],
      [64, 58],
      [75, 64],
      [76, 74],
    ]);
    for (const s of [j, k])
      form(g, s, 'tan', { cx: 22, cy: 56, rx: 40, ry: 18, base: 2.4, k: 1.3, rim: 2 });
    for (let y = 60; y < 72; y += 3) {
      put(g, 31, y, cell('linen', 1));
      put(g, 41, y + 1, cell('linen', 1));
      stroke(
        g,
        [
          [31, y],
          [41, y + 1],
        ],
        'linen',
        2,
      );
    }
  },
  bronze_jerkin: (g, shirt) => {
    tunic(g, shirt);
    form(g, shoulders(56), 'hide', { cx: 22, cy: 56, rx: 40, ry: 18, base: 2.6, k: 1.3, rim: 3 });
    const disc = blob([
      [36, 61],
      [41, 63],
      [42, 68],
      [38, 72],
      [32, 71],
      [30, 66],
    ]);
    form(g, disc, 'bronze', { cx: 32, cy: 62, rx: 6, ry: 6, base: 2, k: 1.6, rim: 2 });
    put(g, 34, 64, cell('bronze', 0));
  },
  iron_mail: (g, shirt) => {
    form(g, shoulders(), 'iron', {
      cx: 22,
      cy: 54,
      rx: 40,
      ry: 18,
      base: 2.2,
      k: 1.3,
      rim: 3,
      tex: (x, y, t) =>
        t + ((x + (y % 2) * 2) % 4 === 0 ? 1 : (x + (y % 2) * 2) % 4 === 1 ? -0.4 : 0),
    });
    const collar = blob([
      [26, 55],
      [46, 55],
      [43, 60],
      [29, 60],
    ]);
    form(g, collar, shirt, { cx: 28, cy: 55, rx: 10, ry: 4, base: 2.6, k: 1, rim: 1 });
  },
  captains_coat: (g) => {
    tunic(g, 'cream');
    for (const pts of [
      [
        [-4, 74],
        [-3, 64],
        [8, 57],
        [24, 54],
        [33, 72],
      ],
      [
        [39, 72],
        [48, 54],
        [64, 57],
        [75, 64],
        [76, 74],
      ],
    ] as const)
      form(g, blob(pts), 'midnight', { cx: 22, cy: 54, rx: 40, ry: 18, base: 2.4, k: 1.3, rim: 2 });
    stroke(
      g,
      [
        [24, 55],
        [32, 72],
      ],
      'bronze',
      1,
    );
    stroke(
      g,
      [
        [48, 55],
        [40, 72],
      ],
      'bronze',
      2,
    );
  },
  knight_plate: (g) => {
    form(g, shoulders(), 'plate', { cx: 22, cy: 54, rx: 40, ry: 18, base: 2.2, k: 1.4, rim: 3 });
    for (const [x0, x1] of [
      [-2, 22],
      [50, 74],
    ] as const) {
      const p = blob([
        [x0, 66],
        [x0 + 3, 58],
        [(x0 + x1) / 2, 55],
        [x1 - 3, 58],
        [x1, 66],
      ]);
      form(g, p, 'plate', { cx: x0 + 4, cy: 54, rx: 14, ry: 10, base: 1.8, k: 1.6, rim: 2 });
      put(g, x0 + 7, 58, cell('plate', 0));
    }
  },
};

function tunic(g: TGrid, mat: Mat): void {
  form(g, shoulders(), mat, { cx: 22, cy: 54, rx: 40, ry: 18, base: 2.4, k: 1.3, rim: 3 });
  // The neckline.
  stroke(
    g,
    [
      [27, 56],
      [36, 61],
      [45, 56],
    ],
    mat,
    4,
  );
}

/* ----------------------------------------------------------- the hair */

/** The crown of each hairstyle: over the skull, its fringe broken across the brow. */
const CROWN: Readonly<Record<HeroBust['style'], Pts | null>> = {
  short: [
    [16, 28],
    [15, 18],
    [21, 9],
    [33, 4],
    [46, 6],
    [55, 12],
    [59, 22],
    [58, 30],
    [55, 24],
    [52, 19],
    [49, 21],
    [46, 17],
    [42, 20],
    [38, 16],
    [34, 20],
    [30, 17],
    [26, 21],
    [22, 19],
    [19, 25],
  ],
  long: [
    [15, 30],
    [15, 18],
    [21, 9],
    [33, 4],
    [46, 6],
    [55, 12],
    [59, 22],
    [59, 31],
    [55, 23],
    [50, 17],
    [44, 14],
    [38, 15],
    [36, 13],
    [33, 17],
    [27, 19],
    [21, 24],
    [19, 31],
  ],
  braid: [
    [16, 28],
    [16, 17],
    [22, 9],
    [34, 5],
    [46, 7],
    [55, 13],
    [58, 23],
    [57, 29],
    [54, 22],
    [49, 17],
    [42, 15],
    [37, 17],
    [34, 15],
    [28, 18],
    [22, 22],
    [19, 28],
  ],
  shaggy: [
    [14, 31],
    [12, 22],
    [16, 12],
    [22, 6],
    [30, 2],
    [38, 3],
    [46, 2],
    [52, 7],
    [58, 11],
    [61, 20],
    [60, 31],
    [56, 26],
    [54, 21],
    [50, 24],
    [47, 19],
    [43, 23],
    [39, 18],
    [35, 23],
    [31, 18],
    [27, 23],
    [24, 19],
    [21, 26],
    [18, 30],
  ],
  bald: null,
};

/** Locks drawn over each crown: dark partings, lit strands. */
const CROWN_LOCKS: Readonly<Record<HeroBust['style'], readonly [Pts, number][]>> = {
  short: [
    [
      [
        [22, 13],
        [30, 9],
        [40, 9],
      ],
      1,
    ],
    [
      [
        [30, 17],
        [33, 12],
        [38, 9],
      ],
      4,
    ],
    [
      [
        [42, 19],
        [46, 13],
        [51, 12],
      ],
      4,
    ],
    [
      [
        [20, 22],
        [21, 17],
        [25, 13],
      ],
      4,
    ],
  ],
  long: [
    [
      [
        [36, 6],
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
    [
      [
        [33, 15],
        [26, 17],
        [21, 23],
      ],
      4,
    ],
    [
      [
        [40, 13],
        [48, 15],
        [54, 21],
      ],
      4,
    ],
  ],
  braid: [
    [
      [
        [35, 7],
        [35, 15],
      ],
      4,
    ],
    [
      [
        [24, 12],
        [31, 9],
      ],
      1,
    ],
    [
      [
        [33, 16],
        [25, 18],
        [20, 25],
      ],
      4,
    ],
    [
      [
        [38, 15],
        [47, 15],
        [53, 20],
      ],
      4,
    ],
  ],
  shaggy: [
    [
      [
        [20, 12],
        [28, 6],
        [36, 6],
      ],
      1,
    ],
    [
      [
        [31, 18],
        [32, 11],
        [36, 6],
      ],
      4,
    ],
    [
      [
        [43, 22],
        [44, 13],
        [48, 7],
      ],
      4,
    ],
    [
      [
        [24, 19],
        [22, 13],
      ],
      4,
    ],
    [
      [
        [55, 22],
        [56, 15],
      ],
      4,
    ],
    [
      [
        [16, 26],
        [16, 18],
      ],
      4,
    ],
  ],
  bald: [],
};

/** Long hair's curtains either side of the face, onto the shoulders. */
const CURTAINS: readonly Pts[] = [
  [
    [19, 22],
    [15, 30],
    [13, 42],
    [12, 54],
    [14, 64],
    [21, 63],
    [22, 52],
    [20, 42],
    [20, 32],
  ],
  [
    [54, 22],
    [58, 30],
    [60, 42],
    [61, 54],
    [59, 64],
    [52, 63],
    [52, 52],
    [53, 42],
    [53, 32],
  ],
];

function hairForm(g: TGrid, inside: Inside, hair: Mat, base = 2.3): Uint8Array {
  return form(g, inside, hair, { cx: 26, cy: 6, rx: 26, ry: 22, base, k: 1.5, rim: 3 });
}

/** What hangs: long hair's curtains (behind the shoulders' line), the braid over the near shoulder. */
function hang(g: TGrid, o: HeroBust, under: boolean): void {
  if (o.style === 'long') {
    for (const c of CURTAINS) {
      const s = blob(c);
      hairForm(g, s, o.hair, 2.5);
      stroke(
        g,
        c.slice(2, 5).map(([x, y]) => [x + (x < 36 ? 3 : -3), y] as const),
        o.hair,
        4,
      );
    }
    if (under) {
      // Under a helm, the hair comes from under its rim at the temples.
      for (const s of [
        blob([
          [16, 20],
          [22, 18],
          [21, 28],
          [17, 30],
        ]),
        blob([
          [51, 18],
          [57, 20],
          [56, 30],
          [52, 28],
        ]),
      ])
        hairForm(g, s, o.hair, 2.4);
    }
  }
  if (o.style === 'braid')
    for (let i = 0; i < (under ? 4 : 6); i++) {
      // Over the near shoulder; out of a hood, over its cape.
      const y = (under ? 52 : 40) + i * 5;
      const x = (under ? 14 : 18) - Math.round(i * 0.7);
      const lobe = blob([
        [x - 4, y + 1],
        [x - 1, y - 2],
        [x + 3, y],
        [x + 3, y + 4],
        [x - 1, y + 5],
      ]);
      form(g, lobe, o.hair, { cx: x - 3, cy: y - 2, rx: 5, ry: 5, base: 2.4, k: 1.5, rim: 2 });
    }
}

/* ------------------------------------------------------------ head gear */

const RIM = 19;

const HATS: Readonly<Record<string, (g: TGrid, o: HeroBust) => void>> = {
  linen_hood: (g, o) => {
    const shell = blob([
      [8, 66],
      [9, 36],
      [13, 18],
      [24, 7],
      [37, 4],
      [50, 7],
      [60, 18],
      [64, 36],
      [64, 66],
      [50, 62],
      [24, 62],
    ]);
    const opening = blob([
      [19, 34],
      [21, 22],
      [28, 15],
      [37, 13],
      [46, 15],
      [53, 22],
      [55, 34],
      [53, 46],
      [46, 54],
      [36, 57],
      [26, 54],
      [20, 46],
    ]);
    form(g, (x, y) => shell(x, y) && !opening(x, y), 'linen', {
      cx: 22,
      cy: 10,
      rx: 30,
      ry: 30,
      base: 2.3,
      k: 1.5,
      rim: 3,
    });
    // The opening's edge folded back, lit on the near side.
    const lip = (x: number, y: number) =>
      opening(x, y) === false && (opening(x + 1, y) || opening(x, y + 1) || opening(x - 1, y));
    tone(g, (x, y) => lip(x, y) && x < 36, -1, ['linen']);
    // Shadow inside the hood over the brow.
    tone(g, (x, y) => opening(x, y) && y < 21 + Math.abs(x - 37) * 0.25, 1, [o.skin]);
    locks(g, [
      [
        [14, 40],
        [16, 52],
        [14, 62],
      ],
      [
        [58, 40],
        [58, 52],
        [60, 62],
      ],
    ]);
    function locks(gr: TGrid, list: Pts[]) {
      for (const pts of list) stroke(gr, pts, 'linen', 4);
    }
    if (o.style === 'braid') hang(g, o, true);
  },
  leather_cap: (g) => {
    const cap = blob([
      [15, RIM + 2],
      [16, 12],
      [24, 5],
      [36, 3],
      [48, 5],
      [56, 12],
      [58, RIM + 2],
      [48, RIM],
      [36, RIM - 1],
      [24, RIM],
    ]);
    form(g, cap, 'tan', { cx: 24, cy: 4, rx: 24, ry: 16, base: 2.4, k: 1.5, rim: 3 });
    // The stitched seam over the crown.
    for (let y = 5; y < RIM - 1; y += 2) put(g, 37, y, cell('linen', 2));
    stroke(
      g,
      [
        [36, 4],
        [36, RIM - 1],
      ],
      'tan',
      4,
    );
    // Ear flaps.
    for (const pts of [
      [
        [14, 20],
        [20, 20],
        [21, 32],
        [17, 35],
        [13, 30],
      ],
      [
        [53, 20],
        [59, 20],
        [60, 30],
        [56, 35],
        [52, 32],
      ],
    ] as const)
      form(g, blob(pts), 'tan', { cx: 14, cy: 20, rx: 30, ry: 14, base: 2.6, k: 1.3, rim: 2 });
    stroke(
      g,
      [
        [15, RIM + 1],
        [36, RIM - 1],
        [58, RIM + 1],
      ],
      'tan',
      4,
    );
  },
  bronze_cap: (g) => {
    const liner = blob([
      [15, RIM + 2],
      [22, RIM - 1],
      [36, RIM - 2],
      [50, RIM - 1],
      [58, RIM + 2],
      [57, RIM + 4],
      [36, RIM + 1],
      [16, RIM + 4],
    ]);
    form(g, liner, 'hide', { cx: 20, cy: RIM, rx: 30, ry: 6, base: 3, k: 1, rim: 1 });
    const cap = blob([
      [16, RIM],
      [17, 11],
      [25, 4],
      [36, 2],
      [47, 4],
      [55, 11],
      [57, RIM],
      [36, RIM - 1],
    ]);
    form(g, cap, 'bronze', { cx: 24, cy: 4, rx: 22, ry: 16, base: 2.2, k: 1.7, rim: 3 });
    // The ridge, polished, and the rivets round the rim.
    stroke(
      g,
      [
        [35, 3],
        [35, RIM - 2],
      ],
      'bronze',
      0,
    );
    stroke(
      g,
      [
        [36, 3],
        [36, RIM - 2],
      ],
      'bronze',
      3,
    );
    for (const x of [20, 26, 32, 41, 47, 53]) put(g, x, RIM - 2, cell('bronze', x < 36 ? 0 : 1));
  },
  iron_nasal_helm: (g) => {
    const helm = blob([
      [15, RIM + 1],
      [17, 12],
      [26, 3],
      [36, -3],
      [46, 3],
      [55, 12],
      [57, RIM + 1],
      [36, RIM],
    ]);
    form(g, helm, 'iron', { cx: 24, cy: 2, rx: 22, ry: 18, base: 2.2, k: 1.7, rim: 3 });
    stroke(
      g,
      [
        [36, -2],
        [36, RIM - 1],
      ],
      'iron',
      0,
    );
    // The rim band, riveted.
    const band = blob([
      [14, RIM + 3],
      [15, RIM - 1],
      [36, RIM - 2],
      [58, RIM - 1],
      [58, RIM + 3],
      [36, RIM + 2],
    ]);
    form(g, band, 'iron', { cx: 20, cy: RIM - 2, rx: 30, ry: 4, base: 2.6, k: 1.2, rim: 1 });
    for (const x of [19, 26, 46, 53]) put(g, x, RIM, cell('iron', 0));
    // The nasal down the face's centre line, between the eyes.
    const nasal = blob([
      [36, RIM],
      [39, RIM],
      [39, 34],
      [37, 36],
      [35, 34],
    ]);
    form(g, nasal, 'iron', { cx: 35, cy: RIM, rx: 4, ry: 18, base: 2, k: 1.4, rim: 1 });
    cast(g, nasal, { n: 1, dx: 1, dy: 0, on: [] });
  },
  feathered_hat: (g) => {
    const brim = blob([
      [6, 20],
      [13, 15],
      [26, 13],
      [46, 13],
      [59, 15],
      [65, 20],
      [60, 23],
      [46, 21],
      [26, 21],
      [11, 23],
    ]);
    const crown = blob([
      [20, 16],
      [21, 6],
      [30, 2],
      [44, 2],
      [52, 6],
      [53, 16],
    ]);
    form(g, crown, 'felt', { cx: 26, cy: 2, rx: 20, ry: 12, base: 2.3, k: 1.4, rim: 3 });
    const band = (x: number, y: number) => crown(x, y) && y >= 12 && y <= 14;
    tone(g, band, 0);
    for (let x = 18; x < 56; x++)
      for (let y = 12; y <= 14; y++) if (crown(x, y)) put(g, x, y, cell('crimson', x < 34 ? 2 : 3));
    form(g, brim, 'felt', { cx: 26, cy: 14, rx: 34, ry: 8, base: 2.6, k: 1.4, rim: 2 });
    // The cream plume, swept back over the near side.
    const plume = blob([
      [24, 12],
      [16, 4],
      [8, 0],
      [12, 4],
      [18, 10],
    ]);
    form(g, plume, 'cream', { cx: 10, cy: 0, rx: 12, ry: 10, base: 1.4, k: 1.4, rim: 1 });
    stroke(
      g,
      [
        [23, 12],
        [10, 1],
      ],
      'cream',
      3,
    );
  },
  tricorn: (g) => {
    const crown = blob([
      [19, 16],
      [21, 5],
      [36, 1],
      [51, 5],
      [53, 16],
    ]);
    form(g, crown, 'felt', { cx: 28, cy: 2, rx: 22, ry: 12, base: 2.5, k: 1.4, rim: 3 });
    // Its points kept three pixels inside the square, where the header's frame crops a face.
    const top: Pts = [
      [5, 4],
      [12, 8],
      [22, 13],
      [36, 18],
      [50, 13],
      [60, 8],
      [66, 4],
    ];
    const band = blob([...top, [66, 9], [59, 14], [49, 19], [36, 23], [23, 19], [13, 14], [6, 9]]);
    form(g, band, 'felt', { cx: 26, cy: 9, rx: 36, ry: 12, base: 2.4, k: 1.5, rim: 2 });
    stroke(g, top, 'bronze', 1);
  },
  velvet_cap: (g) => {
    const cap = blob([
      [16, RIM - 1],
      [16, 10],
      [24, 4],
      [36, 2],
      [50, 3],
      [60, 8],
      [62, 14],
      [58, RIM - 2],
      [46, RIM - 3],
      [30, RIM - 2],
    ]);
    form(g, cap, 'plum', { cx: 26, cy: 3, rx: 24, ry: 14, base: 2.2, k: 1.6, rim: 3 });
    stroke(
      g,
      [
        [22, 8],
        [36, 5],
        [52, 8],
      ],
      'plum',
      1,
    );
    const band = blob([
      [15, RIM + 1],
      [16, RIM - 2],
      [36, RIM - 3],
      [57, RIM - 2],
      [57, RIM + 1],
      [36, RIM],
    ]);
    form(g, band, 'plum', { cx: 20, cy: RIM - 3, rx: 30, ry: 4, base: 3, k: 1.2, rim: 1 });
    marks(g, 46, RIM - 5, ['.a.', 'aba', '.c.'], {
      a: ['gold', 2],
      b: ['gold', 0],
      c: ['gold', 4],
    });
  },
};

/** The hero's bust drawn into `g`: shoulders, neck, head, face, hair, head gear. */
export function drawHero(g: TGrid, o: HeroBust): void {
  // Brows take the hair's colour at the steps that stand clear of the skin, as the figures' do.
  const P = pinsFor({
    skin: o.skin,
    hair: o.hair,
    browShift: browShift(o.skin as TownMat, o.hair as TownMat),
  });
  const helmed = !!o.head && !BRIMMED.has(o.head);
  // Long hair falls behind the shoulders' line; the braid in front of it.
  if (o.style === 'long' && o.head !== 'linen_hood') hang(g, { ...o }, helmed);
  (BODY[o.body ?? ''] ?? BODY.shirt!)(g, o.shirt === 'linen_tunic' ? 'linen' : 'teal');
  const neck = blob([
    [28, 44],
    [44, 44],
    [44, 57],
    [36, 60],
    [28, 57],
  ]);
  form(g, neck, o.skin, { cx: 30, cy: 46, rx: 10, ry: 12, base: 2.8, k: 1, rim: 2 });
  if (o.neck === 'shell_necklace' || o.neck === 'hunters_charm' || o.neck === 'trollstone') {
    stroke(
      g,
      [
        [29, 55],
        [33, 59],
        [36, 60],
        [40, 59],
        [43, 55],
      ],
      'leather',
      4,
    );
    const charm =
      o.neck === 'shell_necklace' ? 'shell' : o.neck === 'trollstone' ? 'stone' : 'cream';
    marks(g, 35, 60, ['.ab', 'abc', '.c.'], {
      a: [charm, 1],
      b: [charm, 2],
      c: [charm, 4],
    });
  }
  // The near ear.
  const ear = blob([
    [19, 26],
    [14, 27],
    [13, 33],
    [15, 38],
    [20, 37],
  ]);
  form(g, ear, o.skin, { cx: 14, cy: 28, rx: 5, ry: 8, base: 2.2, k: 1.2, rim: 2 });
  marks(g, 15, 30, ['3', '4', '3'], P);
  // The braid comes from behind the head, over the near shoulder.
  if (o.style === 'braid' && o.head !== 'linen_hood') hang(g, o, false);
  const head = blob(HEAD);
  form(g, head, o.skin, { cx: 32, cy: 24, rx: 20, ry: 24, base: 1.9, k: 1.4, rim: 3 });
  cast(g, head, { n: 1, dx: 0, dy: 2, on: [o.skin] });
  // Brows: soft, a little arched, in the hair's colour.
  marks(g, 23, 21, ['..bbBBBb.', '.bBBb..bB', 'b........'], P);
  marks(g, 41, 21, ['.bBBBbb..', 'Bb..bBBb.', '........b'], P);
  // Eyes: open, the iris centred, a catch-light, a crease above.
  marks(
    g,
    24,
    25,
    ['..33333..', '.KKKKKKK.', 'KKwCIiwWK', '.WWIKiWW.', '..wiiiw..', '...333...'],
    P,
  );
  marks(g, 41, 25, ['..33333.', '.KKKKKKK', 'KwCIiwKK', '.WIKiWW.', '..wiiiw.', '...333..'], P);
  // A straight nose lit on its near side.
  marks(g, 35, 29, ['.12..', '.12..', '.123.', '.123.', '11234', '22344', '.344.'], P);
  // An easy smile, a little up at the near corner.
  marks(g, 30, 40, ['.........4', '4.......4.', '.4444444..', '..2222....'], P);
  if (o.style === 'bald' && !o.head) marks(g, 25, 13, ['..00', '.000', '00.'], P);
  // The hair, under or around whatever is on the head.
  const crownPts = CROWN[o.style];
  if (crownPts && !o.head) {
    const crown = blob(crownPts);
    hairForm(g, crown, o.hair);
    for (const [pts, step] of CROWN_LOCKS[o.style]) stroke(g, pts, o.hair, step);
    cast(g, crown, { n: 1, dx: 1, dy: 1, on: [o.skin] });
  } else if (crownPts && o.head && BRIMMED.has(o.head)) {
    // Under a brim: the hair over the ears and a little at the brow.
    const temples = blob([
      [15, 28],
      [15, 16],
      [36, 12],
      [58, 16],
      [58, 28],
      [54, 22],
      [46, 19],
      [36, 21],
      [26, 19],
      [19, 23],
    ]);
    hairForm(g, temples, o.hair);
    cast(g, temples, { n: 1, dx: 1, dy: 1, on: [o.skin] });
  }
  if (o.head) {
    HATS[o.head]?.(g, o);
    if (o.style === 'long' && o.head === 'linen_hood') {
      // Long hair falls out of the hood onto the chest.
      for (const pts of [
        [
          [20, 40],
          [24, 44],
          [24, 56],
          [21, 66],
          [16, 64],
          [18, 52],
        ],
        [
          [52, 40],
          [49, 44],
          [49, 56],
          [52, 66],
          [57, 64],
          [55, 52],
        ],
      ] as const)
        hairForm(g, blob(pts), o.hair, 2.4);
    }
  }
  void rod;
}

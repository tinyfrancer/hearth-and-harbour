/**
 * Tier 2's faces (B19): the seven monsters of Thistlewood's Edge and the
 * Deepthorn, and the five new thieving marks, drawn by hand in the B11 way
 * (folkFaces.ts, beastFaces.ts, markFaces.ts): each head its own shape, its
 * own features as rows of characters, one expression a viewer can name, and
 * for a mark one thing beside the face that says who they are. Friendly
 * people look friendly, rogues roguish, beasts keep the silhouette that
 * names them.
 */
import { hash, put, type TGrid } from '../town2/cells';
import { cell } from './cave';
import type { Mat2 as Mat } from './cave';
import {
  blob,
  cast,
  form,
  marks,
  pinsFor,
  stroke,
  tone,
  without,
  type Inside,
  type Pts,
} from './heads';
import { mass } from './beasts';
import type { FaceDef } from './folkFaces';

type P = Record<string, readonly [Mat, number]>;

/** Shoulders filling the frame's bottom. */
function shoulders(g: TGrid, mat: Mat, base = 2.5, top = 51): void {
  const body = blob([
    [-4, 74],
    [-3, 63],
    [9, top + 4],
    [23, top],
    [49, top],
    [63, top + 4],
    [75, 63],
    [76, 74],
  ]);
  form(g, body, mat, { cx: 26, cy: 53, rx: 40, ry: 20, base, k: 1.3, rim: 3 });
}

/** A neck and the near ear, in a skin. */
function neckAndEar(g: TGrid, skin: Mat, p: P, earTop = 26, ear = true): void {
  const neck = blob([
    [24, 42],
    [48, 42],
    [48, 55],
    [36, 58],
    [24, 55],
  ]);
  form(g, neck, skin, { cx: 30, cy: 44, rx: 14, ry: 12, base: 2.6, k: 1, rim: 2 });
  if (!ear) return;
  const e = blob([
    [18, earTop],
    [13, earTop + 2],
    [12, earTop + 8],
    [14, earTop + 13],
    [19, earTop + 12],
  ]);
  form(g, e, skin, { cx: 13, cy: earTop + 3, rx: 5, ry: 8, base: 2, k: 1.2, rim: 2 });
  marks(g, 14, earTop + 5, ['3', '4', '3'], p);
}

/** A head of a given outline in a skin, lit from the upper left. */
const head = (g: TGrid, pts: Pts, skin: Mat, base = 1.8): Inside => {
  const h = blob(pts);
  form(g, h, skin, { cx: 31, cy: 24, rx: 22, ry: 24, base, k: 1.4, rim: 3 });
  return h;
};

const dots = (g: TGrid, list: Pts, mat: Mat, step: number) => {
  for (const [x, y] of list) put(g, x, y, cell(mat, step));
};

/* ------------------------------------------------------------------ the brigand */

/**
 * The brigand: a red scarf pulled up over his nose and mouth, dark tangled
 * hair, the eyes narrowed over the scarf and the brows drawn hard down, a
 * scar through one brow. All you get to see is that he means it.
 */
export const BRIGAND: FaceDef = {
  disc: 'umber',
  draw(g) {
    const p = pinsFor({ skin: 'skingolden', hair: 'hairblack', browShift: 1 });
    shoulders(g, 'umber', 2.6);
    // The coat's collar turned up.
    for (const pts of [
      [
        [10, 56],
        [22, 48],
        [30, 60],
        [24, 72],
      ],
      [
        [62, 56],
        [50, 48],
        [42, 60],
        [48, 72],
      ],
    ] as const)
      form(g, blob(pts), 'umber', { cx: 20, cy: 50, rx: 20, ry: 14, base: 1.9, k: 1.4, rim: 2 });
    neckAndEar(g, 'skingolden', p, 26);
    head(
      g,
      [
        [36, 12],
        [48, 14],
        [55, 22],
        [56, 33],
        [53, 43],
        [46, 50],
        [36, 52],
        [27, 50],
        [20, 44],
        [17, 34],
        [18, 23],
        [25, 15],
      ],
      'skingolden',
    );
    // Narrowed eyes over the scarf, brows drawn hard down to the nose.
    marks(g, 24, 27, ['......', '.KKKKKK', 'KWIIiWK', '.33333.'], p);
    marks(g, 41, 27, ['......', 'KKKKKK.', 'KWIiIWK', '.33333.'], p);
    marks(g, 22, 22, ['BBb....', '.bBBBb.', '....bBB'], p);
    marks(g, 41, 22, ['....bBB', '.bBBBb.', 'BBb....'], p);
    // A scar through the far brow.
    stroke(
      g,
      [
        [48, 19],
        [51, 27],
      ],
      'skingolden',
      0,
    );
    // The scarf over nose and mouth, knotted behind, folds across it.
    const scarf = blob([
      [17, 33],
      [36, 32],
      [56, 33],
      [55, 44],
      [48, 53],
      [36, 56],
      [24, 53],
      [18, 44],
    ]);
    form(g, scarf, 'crimson', { cx: 26, cy: 32, rx: 24, ry: 16, base: 2, k: 1.5, rim: 2 });
    for (const pts of [
      [
        [22, 40],
        [36, 42],
        [50, 40],
      ],
      [
        [25, 47],
        [36, 49],
        [47, 47],
      ],
    ] as const)
      stroke(g, pts, 'crimson', 4);
    // The nose's bump under the scarf.
    marks(g, 34, 33, ['.11.', '1223', '.33.'], {
      1: ['crimson', 1],
      2: ['crimson', 2],
      3: ['crimson', 4],
    });
    // Tangled dark hair over the brow.
    const hair = blob([
      [15, 30],
      [14, 18],
      [20, 9],
      [30, 5],
      [42, 5],
      [52, 9],
      [58, 18],
      [57, 28],
      [52, 20],
      [44, 16],
      [36, 19],
      [28, 16],
      [21, 22],
    ]);
    form(g, hair, 'hairblack', { cx: 26, cy: 6, rx: 22, ry: 16, base: 2.4, k: 1.4, rim: 2 });
    for (const pts of [
      [
        [24, 9],
        [20, 18],
      ],
      [
        [34, 7],
        [31, 15],
      ],
      [
        [44, 8],
        [46, 15],
      ],
    ] as const)
      stroke(g, pts, 'hairblack', 1);
    cast(g, hair, { n: 1, dx: 1, dy: 1, on: ['skingolden'] });
  },
};

/* --------------------------------------------------------------- the hobgoblin */

/**
 * The hobgoblin: the goblin's big cousin, broad and brutish: a dented iron
 * cap, ears out to the frame's edges, small yellow eyes under a heavy brow, a
 * flat broad nose, an underbite with two tusks, a scowl at the world.
 */
export const HOBGOBLIN: FaceDef = {
  disc: 'moss',
  draw(g) {
    const s: Mat = 'hobgob';
    const p = pinsFor({ skin: s, hair: 'hairblack', browShift: 1, iris: ['gold', 1, 2] });
    shoulders(g, 'hide', 2.6);
    neckAndEar(g, s, p, 26, false);
    // Ears: long, pointed, one torn.
    for (const pts of [
      [
        [18, 26],
        [2, 16],
        [4, 22],
        [10, 30],
        [17, 36],
      ],
      [
        [54, 26],
        [70, 15],
        [68, 22],
        [63, 29],
        [56, 36],
      ],
    ] as const) {
      const e = blob(pts);
      form(g, e, s, { cx: 10, cy: 18, rx: 14, ry: 10, base: 2, k: 1.4, rim: 2 });
    }
    put(g, 66, 19, 0);
    put(g, 67, 20, 0);
    head(
      g,
      [
        [36, 13],
        [49, 15],
        [56, 24],
        [57, 36],
        [54, 46],
        [45, 52],
        [36, 53],
        [27, 52],
        [18, 46],
        [15, 36],
        [16, 24],
        [23, 15],
      ],
      s,
      2,
    );
    // A heavy brow, small yellow eyes, a scowl.
    marks(g, 21, 23, ['BBBBBBbb..', '..bbBBBBBb'], p);
    marks(g, 41, 23, ['..bbBBBBBB', 'bBBBBBbb..'], p);
    marks(g, 25, 27, ['KKKKK', 'KIiWK', '.333.'], p);
    marks(g, 42, 27, ['KKKKK', 'KWiIK', '.333.'], p);
    // A broad flat nose.
    marks(g, 31, 30, ['...12...', '..1223..', '.112234.', '01D23D44', '.223344.'], p);
    // The underbite: the jaw thrust out, two tusks up over the lip.
    marks(g, 26, 41, ['44444444444444444', '4.33333333333333.', '.444444444444444.'], p);
    marks(g, 28, 37, ['T.........T', 'TT.......TT', 'TT.......TT', 'tT.......tT'], p);
    // The dented iron cap.
    const cap = blob([
      [14, 22],
      [17, 11],
      [27, 4],
      [36, 2],
      [46, 4],
      [55, 11],
      [58, 22],
      [36, 21],
    ]);
    form(g, cap, 'iron', { cx: 24, cy: 4, rx: 24, ry: 16, base: 2.3, k: 1.6, rim: 3 });
    // The dent, a dark hollow with a lit lower lip.
    marks(g, 41, 9, ['.44.', '4554', '.11.'], { 4: ['iron', 4], 5: ['iron', 5], 1: ['iron', 1] });
    const rim = blob([
      [12, 24],
      [13, 19],
      [36, 18],
      [59, 19],
      [60, 24],
      [36, 23],
    ]);
    form(g, rim, 'iron', { cx: 20, cy: 18, rx: 30, ry: 4, base: 2.8, k: 1.2, rim: 1 });
    cast(g, rim, { n: 1, dx: 0, dy: 1, on: [s] });
  },
};

/* --------------------------------------------------------------- the briar hag */

/**
 * The briar hag: a long crooked face, one eye screwed shut and the other
 * wide, a hooked nose with a wart, a gap-toothed cackle, her hair a great
 * tangle of brambles full of thorns and red berries spreading past her face.
 */
export const BRIAR_HAG: FaceDef = {
  disc: 'mossdye',
  draw(g) {
    const p = pinsFor({ skin: 'turtleskin', hair: 'hairgrey', browShift: 2 });
    // The brambles behind her head, wide.
    const tangle = blob([
      [4, 44],
      [2, 24],
      [10, 8],
      [24, 0],
      [44, 0],
      [60, 6],
      [70, 22],
      [68, 44],
      [58, 30],
      [36, 26],
      [14, 30],
    ]);
    form(g, tangle, 'thorn', { cx: 24, cy: 4, rx: 30, ry: 24, base: 1.8, k: 1.6, rim: 3 });
    // Its canes, crossing every way, lit along their tops.
    for (let i = 0; i < 16; i++) {
      const x0 = Math.round(4 + hash(i, 1, 151) * 62);
      const y0 = Math.round(2 + hash(i, 2, 151) * 36);
      const dx = Math.round((hash(i, 3, 151) - 0.5) * 18);
      stroke(
        g,
        [
          [x0, y0],
          [x0 + dx, y0 + 8],
        ],
        'thorn',
        i % 3 === 0 ? 0 : i % 3 === 1 ? 3 : 5,
      );
    }
    shoulders(g, 'mossdye', 2.7);
    neckAndEar(g, 'turtleskin', p, 28, false);
    // A long face, the chin jutting forward.
    head(
      g,
      [
        [36, 13],
        [47, 15],
        [53, 24],
        [54, 36],
        [52, 46],
        [44, 53],
        [37, 56],
        [30, 53],
        [22, 46],
        [18, 36],
        [19, 24],
        [25, 16],
      ],
      'turtleskin',
      1.9,
    );
    // Hollow cheeks, bags under the eyes, a wart on the chin.
    tone(
      g,
      (x, y) => Math.hypot(x - 24, (y - 40) / 1.6) < 4 || Math.hypot(x - 49, (y - 40) / 1.6) < 4,
      1,
      ['turtleskin'],
    );
    marks(g, 25, 30, ['.33333.'], p);
    marks(g, 41, 30, ['.33333.'], p);
    marks(g, 40, 49, ['ab', 'bc'], {
      a: ['turtleskin', 2],
      b: ['turtleskin', 3],
      c: ['turtleskin', 4],
    });
    // Wrinkles at the eyes and across the brow.
    for (const pts of [
      [
        [27, 18],
        [34, 17],
      ],
      [
        [39, 17],
        [46, 18],
      ],
      [
        [21, 31],
        [23, 34],
      ],
    ] as const)
      stroke(g, pts, 'turtleskin', 3);
    // One eye wide and glittering, the other screwed shut.
    marks(g, 24, 25, ['.KKKKK.', 'KWIIiWK', 'KWIiIWK', '.33333.'], p);
    marks(g, 40, 27, ['KKKKKK.', '.33333.'], p);
    marks(g, 23, 21, ['..bbBb.', 'bBb..Bb'], p);
    marks(g, 40, 24, ['BBBBbb.'], p);
    // A hooked nose with a wart.
    marks(
      g,
      32,
      26,
      ['..12...', '..123..', '..1233.', '.11233.', '.112334', '..12344', '...2344', '....44.'],
      p,
    );
    marks(g, 38, 31, ['ab', 'bb'], { a: ['turtleskin', 2], b: ['turtleskin', 4] });
    // The cackle: a wide mouth, a tooth here and there.
    marks(
      g,
      26,
      40,
      ['4............4', '44..........44', '.4DTDDTDDDTDD4', '..4DDDDDDDDD4.', '...444444444..'],
      p,
    );
    // The brambles over her brow: strands, thorns, berries.
    for (let i = 0; i < 9; i++) {
      const x0 = 14 + i * 5;
      stroke(
        g,
        [
          [x0, 6 + (i % 3)],
          [x0 + 4, 14 + (i % 2) * 2],
          [x0 + 1, 20],
        ],
        'thorn',
        i % 2 ? 4 : 2,
      );
    }
    for (const [x, y] of [
      [18, 12],
      [29, 8],
      [44, 10],
      [55, 15],
      [9, 26],
      [62, 28],
      [36, 6],
    ] as const)
      marks(g, x, y, ['ab', 'bc'], { a: ['crimson', 0], b: ['crimson', 2], c: ['crimson', 4] });
    for (const [x, y] of [
      [22, 4],
      [50, 5],
      [6, 18],
      [66, 18],
      [40, 3],
    ] as const)
      marks(g, x, y, ['a', 'b'], { a: ['thorn', 5], b: ['thorn', 3] });
    for (const [x, y] of [
      [12, 16],
      [58, 22],
      [26, 2],
    ] as const)
      marks(g, x, y, ['.a.', 'aba'], { a: ['leaf', 2], b: ['leaf', 4] });
  },
};

/* ------------------------------------------------------------- the black bear */

/**
 * The black bear: a great round black head nearly filling the frame, small
 * round ears on top, a pale brown muzzle and a wet black nose, small eyes
 * under brows crossed into a frown, the lip lifted off a tooth. Not pleased.
 */
export const BLACK_BEAR: FaceDef = {
  disc: 'pine',
  draw(g) {
    shoulders(g, 'bear', 3.2, 50);
    for (const [x, s] of [
      [17, 3],
      [55, 3.4],
    ] as const) {
      mass(g, x, 13, 8, 7.5, 'bear', { base: s, tex: 'fur', k2: x });
      mass(g, x + (x < 36 ? 1 : -1), 14, 4, 3.6, 'umber', { base: 3.2 });
    }
    mass(g, 36, 30, 26, 22, 'bear', { base: 3, tex: 'fur', k2: 7 });
    // The muzzle, brown, broad.
    mass(g, 38, 40, 13, 10, 'umber', { base: 2.2, k: 1.4 });
    // The nose: a wet black stone with a glint.
    mass(g, 38, 34, 6.5, 4.2, 'tar', { base: 3, k: 1.8 });
    put(g, 35, 32, cell('tar', 0));
    put(g, 36, 32, cell('tar', 1));
    stroke(
      g,
      [
        [38, 38],
        [38, 42],
      ],
      'tar',
      5,
    );
    // The mouth, the lip lifted off one tooth.
    stroke(
      g,
      [
        [29, 46],
        [33, 44],
        [38, 43],
        [43, 44],
        [47, 46],
      ],
      'tar',
      5,
    );
    marks(g, 41, 45, ['ab', 'b.'], { a: ['cream', 0], b: ['cream', 2] });
    // Small eyes under a cross frown.
    for (const [x, d] of [
      [25, 1],
      [46, -1],
    ] as const) {
      marks(g, x, 25, ['ab', 'bb'], { a: ['cream', 0], b: ['eye', 4] });
      stroke(
        g,
        [
          [x - 3 * d + (d > 0 ? -1 : 2), 21 - 1],
          [x + 3 * d + (d > 0 ? 2 : -1), 23],
        ],
        'bear',
        5,
      );
    }
    // A paler crescent on the chest.
    for (let x = 22; x <= 50; x++)
      put(g, x, 62 + Math.round(Math.abs(x - 36) / 4), cell('cream', 3));
  },
};

/* --------------------------------------------------------------- the dire wolf */

/**
 * The dire wolf: a huge charcoal head in three-quarters, a shaggy mane round
 * its neck, one ear torn, pale eyes under a heavy brow, scars across the
 * muzzle, the lip drawn back off long teeth in a snarl.
 */
export const DIRE_WOLF: FaceDef = {
  disc: 'midnight',
  draw(g) {
    // The mane, shaggy, round the neck and up behind the ears.
    const mane = blob([
      [0, 72],
      [2, 40],
      [10, 26],
      [24, 22],
      [34, 34],
      [40, 56],
      [36, 72],
    ]);
    form(g, mane, 'direfur', { cx: 14, cy: 30, rx: 24, ry: 26, base: 2.8, k: 1.4, rim: 3 });
    for (let i = 0; i < 14; i++) {
      const x = 4 + i * 2.5;
      stroke(
        g,
        [
          [Math.round(x), 34 + (i % 3) * 4],
          [Math.round(x) - 2, 44 + (i % 3) * 5],
        ],
        'direfur',
        i % 2 ? 4 : 2,
      );
    }
    // Ears: the far one pricked, the near one torn.
    form(
      g,
      blob([
        [24, 22],
        [26, 2],
        [36, 18],
      ]),
      'direfur',
      { cx: 26, cy: 4, rx: 10, ry: 12, base: 2.4, k: 1.4, rim: 2 },
    );
    form(
      g,
      blob([
        [38, 18],
        [44, 0],
        [52, 18],
      ]),
      'direfur',
      { cx: 44, cy: 4, rx: 10, ry: 12, base: 2.8, k: 1.4, rim: 2 },
    );
    put(g, 41, 7, 0);
    put(g, 42, 8, 0);
    // The skull and the long muzzle.
    const skull = blob([
      [22, 24],
      [30, 15],
      [44, 14],
      [54, 20],
      [58, 30],
      [52, 40],
      [36, 44],
      [24, 40],
    ]);
    form(g, skull, 'direfur', { cx: 30, cy: 16, rx: 22, ry: 18, base: 2, k: 1.6, rim: 3 });
    const muzzle = blob([
      [44, 28],
      [58, 26],
      [70, 32],
      [70, 40],
      [60, 46],
      [46, 44],
    ]);
    form(g, muzzle, 'direfur', { cx: 50, cy: 26, rx: 18, ry: 12, base: 1.8, k: 1.5, rim: 2 });
    // The nose at the muzzle's end.
    marks(g, 66, 29, ['abb', 'bbc', '.cc'], { a: ['tar', 1], b: ['tar', 3], c: ['tar', 5] });
    // Scars across the muzzle.
    for (const pts of [
      [
        [52, 27],
        [57, 35],
      ],
      [
        [56, 27],
        [61, 34],
      ],
    ] as const)
      stroke(g, pts, 'direfur', 0);
    // A pale eye under a heavy brow, narrowed.
    marks(g, 37, 21, ['aaaaaaa.', '.abbcca.', '.abccaa.', '..aaa...'], {
      a: ['direfur', 5],
      b: ['cream', 0],
      c: ['eye', 4],
    });
    marks(g, 27, 23, ['aaaa', '.bc.', '.aa.'], {
      a: ['direfur', 5],
      b: ['cream', 1],
      c: ['eye', 4],
    });
    // The snarl: the lip drawn back, long teeth top and bottom, the jaw open.
    marks(
      g,
      44,
      40,
      [
        'aaaaaaaaaaaaaaaaaa',
        'w.w.ww.w.ww.ww.w..',
        'rrrrrrrrrrrrrrr...',
        '.w.w.w.w.w.w.w....',
        'aaaaaaaaaaaaaa....',
      ],
      { a: ['tar', 4], w: ['cream', 0], r: ['crimson', 4] },
    );
    const jaw = blob([
      [42, 45],
      [62, 45],
      [58, 52],
      [44, 52],
    ]);
    form(g, jaw, 'direfur', { cx: 46, cy: 44, rx: 14, ry: 6, base: 2.4, k: 1.2, rim: 2 });
  },
};

/* --------------------------------------------------------------- the hill ogre */

/**
 * The hill ogre: a big bald grey-green head on no neck to speak of, tiny eyes
 * close together, one brow lower than the other, a nose like a turnip, jug
 * ears, a wide mouth with its one tooth stuck up over the lip. Slow, and
 * annoyed about something he has forgotten.
 */
export const HILL_OGRE: FaceDef = {
  disc: 'ochre',
  draw(g) {
    const s: Mat = 'ogre';
    const p = pinsFor({ skin: s, hair: 'ogre', browShift: 1, iris: ['gold', 1, 2] });
    shoulders(g, s, 2.6, 48);
    for (const pts of [
      [
        [12, 22],
        [2, 22],
        [2, 36],
        [10, 40],
      ],
      [
        [60, 22],
        [70, 22],
        [70, 36],
        [62, 40],
      ],
    ] as const)
      form(g, blob(pts), s, { cx: 4, cy: 24, rx: 10, ry: 12, base: 2.4, k: 1.4, rim: 2 });
    head(
      g,
      [
        [36, 4],
        [50, 7],
        [60, 18],
        [62, 32],
        [58, 46],
        [48, 54],
        [36, 56],
        [24, 54],
        [14, 46],
        [10, 32],
        [12, 18],
        [22, 7],
      ],
      s,
      1.9,
    );
    // The crown's shine.
    marks(g, 24, 8, ['.00.', '0001', '.01.'], p);
    // Tiny eyes close together, one brow lower.
    marks(g, 25, 22, ['bbBBBB.'], p);
    marks(g, 39, 24, ['.BBBBbb'], p);
    marks(g, 28, 25, ['KKK', 'KiK'], p);
    marks(g, 41, 27, ['KKK', 'KiK'], p);
    // A nose like a turnip.
    mass(g, 36, 34, 6, 5, s, { base: 2, k: 1.8 });
    marks(g, 33, 37, ['D....D'], p);
    // The wide mouth, the one tooth stuck up over the lip.
    stroke(
      g,
      [
        [22, 44],
        [28, 46],
        [36, 47],
        [44, 46],
        [50, 44],
      ],
      s,
      5,
    );
    marks(g, 31, 42, ['a', 'a', 'b', 'b'], { a: ['cream', 0], b: ['cream', 2] });
    // Warts and a few bristles.
    dots(
      g,
      [
        [48, 36],
        [18, 30],
        [44, 14],
      ],
      s,
      4,
    );
  },
};

/* --------------------------------------------------------------- the moss golem */

/**
 * The moss golem: a head that is one great boulder, cracked, a cushion of
 * moss on its crown with ferns standing up out of it, two eyes glowing deep
 * in the cracks, roots binding it to the stones of its shoulders.
 */
export const MOSS_GOLEM: FaceDef = {
  disc: 'pine',
  draw(g) {
    for (const [x, y, rx, ry] of [
      [8, 64, 16, 12],
      [64, 64, 16, 12],
      [36, 70, 16, 10],
    ] as const)
      mass(g, x, y, rx, ry, 'rock', { base: 2.8, tex: 'shell', k2: x });
    const rock = blob([
      [36, 6],
      [52, 9],
      [62, 22],
      [62, 40],
      [54, 52],
      [36, 56],
      [18, 52],
      [10, 40],
      [10, 22],
      [20, 9],
    ]);
    form(g, rock, 'rock', {
      cx: 26,
      cy: 14,
      rx: 26,
      ry: 26,
      base: 2.2,
      k: 1.7,
      rim: 3,
      tex: (x, y, t) => {
        const b = hash(Math.floor(x / 3), Math.floor(y / 3), 131);
        return t + (b < 0.1 ? 1 : b > 0.92 ? -1 : 0);
      },
    });
    // Cracks, dark, lit on their lower lip.
    for (const pts of [
      [
        [20, 18],
        [26, 26],
        [24, 34],
      ],
      [
        [50, 14],
        [46, 22],
        [52, 30],
      ],
      [
        [30, 44],
        [36, 50],
        [44, 46],
      ],
    ] as const) {
      stroke(g, pts, 'rock', 6);
      stroke(
        g,
        pts.map(([x, y]) => [x + 1, y + 1] as const),
        'rock',
        1,
      );
    }
    // The eyes: two deep slots glowing green-gold.
    for (const x of [24, 42])
      marks(g, x, 28, ['aaaaaa', 'abcwba', 'abccba', '.aaaa.'], {
        a: ['rock', 6],
        b: ['ember', 2],
        c: ['ember', 1],
        w: ['eye', 0],
      });
    // A crack of a mouth.
    stroke(
      g,
      [
        [26, 42],
        [32, 43],
        [40, 42],
        [46, 43],
      ],
      'rock',
      6,
    );
    // The moss on its crown, ferns out of it.
    const moss = blob([
      [14, 18],
      [20, 8],
      [36, 4],
      [52, 7],
      [60, 16],
      [48, 14],
      [36, 13],
      [24, 15],
    ]);
    form(g, moss, 'moss', { cx: 26, cy: 4, rx: 24, ry: 8, base: 2.2, k: 1.6, rim: 2 });
    for (const [x, d] of [
      [24, -1],
      [36, 0],
      [48, 1],
    ] as const)
      for (let i = 0; i < 7; i++) {
        put(g, x + d * i, 6 - i, cell('moss', 1 + (i % 2)));
        put(g, x + d * i - 1, 7 - i, cell('moss', 3));
        put(g, x + d * i + 1, 7 - i, cell('moss', 4));
      }
    // Roots binding head to shoulders.
    for (const pts of [
      [
        [14, 46],
        [8, 56],
        [10, 66],
      ],
      [
        [58, 46],
        [64, 56],
        [62, 66],
      ],
    ] as const)
      stroke(g, pts, 'bark', 3);
  },
};

/* --------------------------------------------------------------- the marks */

/**
 * The spice merchant: plump and pleased with himself, a striped turban, round
 * cheeks pushed up by a seller's smile, a great curled moustache, and beside
 * him a sack spilling saffron and red pepper.
 */
export const SPICE_MERCHANT: FaceDef = {
  disc: 'crimson',
  draw(g) {
    const p = pinsFor({ skin: 'skinbrown', hair: 'hairblack', browShift: 1 });
    shoulders(g, 'ochre', 2.4, 49);
    neckAndEar(g, 'skinbrown', p, 28);
    head(
      g,
      [
        [36, 14],
        [49, 17],
        [57, 27],
        [58, 38],
        [54, 47],
        [45, 54],
        [36, 56],
        [27, 54],
        [18, 47],
        [14, 38],
        [16, 27],
        [23, 17],
      ],
      'skinbrown',
      1.8,
    );
    // Round cheeks, lit.
    marks(g, 20, 36, ['.11.', '1111', '.11.'], p);
    marks(g, 48, 36, ['.22.', '2222', '.22.'], p);
    // Eyes creased up in a smile, brows up.
    marks(g, 24, 29, ['.KKKKK.', 'K.....K'], p);
    marks(g, 41, 29, ['.KKKKK.', 'K.....K'], p);
    marks(g, 23, 25, ['.bBBBb.'], p);
    marks(g, 41, 25, ['.bBBBb.'], p);
    marks(g, 34, 31, ['..12..', '.1223.', '011234', '.2344.'], p);
    // The great curled moustache over a broad smile.
    const tache = blob([
      [22, 40],
      [30, 37],
      [36, 39],
      [42, 37],
      [50, 40],
      [54, 37],
      [52, 42],
      [42, 42],
      [36, 43],
      [30, 42],
      [20, 42],
      [18, 37],
    ]);
    form(g, tache, 'hairblack', { cx: 28, cy: 37, rx: 18, ry: 4, base: 2.4, k: 1.2, rim: 1 });
    marks(g, 29, 44, ['4.........4', '.44444444..', '..TTTTTT...'], p);
    // The turban: wound in stripes, a jewel at its front.
    const turban = blob([
      [12, 26],
      [12, 14],
      [22, 4],
      [36, 0],
      [50, 4],
      [60, 14],
      [60, 26],
      [36, 22],
    ]);
    form(g, turban, 'cream', { cx: 26, cy: 4, rx: 26, ry: 16, base: 1.9, k: 1.4, rim: 3 });
    for (let i = 0; i < 6; i++)
      stroke(
        g,
        [
          [12 + i * 2, 24 - i * 3],
          [36, 20 - i * 3],
          [60 - i * 2, 24 - i * 3],
        ],
        'crimson',
        i % 2 ? 2 : 3,
      );
    marks(g, 34, 16, ['.a.', 'abc', '.c.'], { a: ['gold', 0], b: ['leaf', 1], c: ['gold', 3] });
    // The sack of spices beside him, spilling.
    const sack = blob([
      [56, 72],
      [56, 54],
      [62, 48],
      [72, 48],
      [72, 72],
    ]);
    form(g, sack, 'linen', { cx: 58, cy: 50, rx: 12, ry: 14, base: 2.4, k: 1.3, rim: 2 });
    for (const [x, y, m] of [
      [60, 47, 'ochre'],
      [64, 46, 'ochre'],
      [68, 47, 'crimson'],
      [62, 49, 'crimson'],
      [66, 49, 'ochre'],
    ] as const)
      marks(g, x, y, ['ab', 'bb'], { a: [m, 1], b: [m, 3] });
  },
};

/**
 * The customs clerk: thin and exact, spectacles on a long nose, a quill
 * behind his ear, one brow raised over a pursed mouth, a high collar, and a
 * tower of seized ledgers at his elbow.
 */
export const CUSTOMS_CLERK: FaceDef = {
  disc: 'indigo',
  draw(g) {
    const p = pinsFor({ skin: 'skinpale', hair: 'chestnut', browShift: 1 });
    shoulders(g, 'indigo', 2.5, 52);
    // A high white collar.
    form(
      g,
      blob([
        [22, 50],
        [36, 54],
        [50, 50],
        [48, 60],
        [36, 62],
        [24, 60],
      ]),
      'cream',
      { cx: 28, cy: 50, rx: 16, ry: 8, base: 1.8, k: 1.2, rim: 2 },
    );
    neckAndEar(g, 'skinpale', p, 26);
    // A long narrow face.
    head(
      g,
      [
        [36, 10],
        [46, 13],
        [52, 22],
        [53, 34],
        [50, 45],
        [43, 52],
        [36, 54],
        [29, 52],
        [22, 45],
        [19, 34],
        [20, 22],
        [26, 13],
      ],
      'skinpale',
      1.8,
    );
    // Hair combed flat with a parting.
    const hair = blob([
      [19, 24],
      [20, 13],
      [28, 7],
      [38, 6],
      [48, 9],
      [53, 18],
      [53, 24],
      [46, 16],
      [36, 14],
      [26, 17],
    ]);
    form(g, hair, 'chestnut', { cx: 26, cy: 8, rx: 18, ry: 10, base: 2.2, k: 1.3, rim: 2 });
    stroke(
      g,
      [
        [30, 8],
        [28, 16],
      ],
      'chestnut',
      5,
    );
    // Eyes behind round spectacles; one brow up.
    marks(g, 25, 27, ['.KKKK.', 'KWIiWK', '.3333.'], p);
    marks(g, 40, 27, ['.KKKK.', 'KWiIWK', '.3333.'], p);
    for (const x of [24, 39])
      marks(g, x, 25, ['.aaaaa.', 'a.....a', 'a.....a', 'a.....a', '.aaaaa.'], { a: ['gold', 3] });
    stroke(
      g,
      [
        [31, 27],
        [39, 27],
      ],
      'gold',
      3,
    );
    marks(g, 24, 22, ['.bBBb.'], p);
    marks(g, 40, 20, ['..bB.', '.bB.B', 'b....'], p);
    // A long nose, a pursed little mouth.
    marks(g, 34, 29, ['.12.', '.12.', '.123', '.123', '1123', '.234'], p);
    marks(g, 33, 43, ['.444.', '4.R.4', '.444.'], p);
    // A quill behind his ear.
    stroke(
      g,
      [
        [8, 14],
        [14, 26],
        [16, 32],
      ],
      'cream',
      1,
    );
    stroke(
      g,
      [
        [7, 15],
        [11, 22],
      ],
      'cream',
      3,
    );
    // The ledgers at his elbow.
    for (let i = 0; i < 4; i++) {
      const y = 66 - i * 6;
      const box = blob([
        [55 + (i % 2), y],
        [71, y],
        [71, y + 5],
        [55 + (i % 2), y + 5],
      ]);
      form(g, box, i % 2 ? 'crimson' : 'umber', {
        cx: 58,
        cy: y,
        rx: 12,
        ry: 4,
        base: 2.4,
        k: 1.2,
        rim: 1,
      });
      stroke(
        g,
        [
          [56 + (i % 2), y + 2],
          [70, y + 2],
        ],
        'cream',
        2,
      );
    }
  },
};

/**
 * The visiting noble: a powdered wig in rolled curls, a beauty mark, eyes
 * half-lidded down a lifted nose, a lace jabot at a plum coat, and the
 * jewelled head of his cane beside his cheek. Very full purse.
 */
export const VISITING_NOBLE: FaceDef = {
  disc: 'plum',
  draw(g) {
    const p = pinsFor({ skin: 'skinpale', hair: 'hairgrey', browShift: 1 });
    shoulders(g, 'plum', 2.4, 52);
    // The lace jabot.
    form(
      g,
      blob([
        [28, 52],
        [44, 52],
        [42, 70],
        [36, 72],
        [30, 70],
      ]),
      'sail',
      { cx: 32, cy: 52, rx: 10, ry: 12, base: 1.4, k: 1.2, rim: 2 },
    );
    for (let y = 55; y < 70; y += 3)
      stroke(
        g,
        [
          [31, y],
          [41, y],
        ],
        'sail',
        3,
      );
    // The wig's curls either side, rolled.
    for (const x of [13, 59])
      for (let i = 0; i < 3; i++) mass(g, x, 26 + i * 8, 6, 4.4, 'hairgrey', { base: 1.8, k: 1.6 });
    neckAndEar(g, 'skinpale', p, 26, false);
    head(
      g,
      [
        [36, 12],
        [47, 14],
        [53, 23],
        [54, 34],
        [51, 44],
        [44, 51],
        [36, 53],
        [28, 51],
        [21, 44],
        [18, 34],
        [19, 23],
        [25, 14],
      ],
      'skinpale',
      1.5,
    );
    // Half-lidded, looking down his nose.
    marks(g, 24, 27, ['KKKKKKK', 'KWIiIWK', '.33333.'], p);
    marks(g, 41, 27, ['KKKKKKK', 'KWIiIWK', '.33333.'], p);
    marks(g, 24, 22, ['....bBb', '.bBBb..'], p);
    marks(g, 41, 22, ['bBb....', '..bBBb.'], p);
    // The nose lifted, a small proud mouth, a beauty mark.
    marks(g, 34, 28, ['..12.', '..12.', '.1123', '01234', '.D.D.'], p);
    marks(g, 32, 42, ['.4444.', '.RRRR.'], p);
    put(g, 45, 38, cell('shade', 2));
    // The powdered wig over the crown, rolled at the brow.
    const wig = blob([
      [16, 24],
      [17, 12],
      [26, 4],
      [36, 2],
      [46, 4],
      [55, 12],
      [56, 24],
      [48, 16],
      [36, 15],
      [24, 16],
    ]);
    form(g, wig, 'hairgrey', { cx: 26, cy: 4, rx: 22, ry: 14, base: 1.5, k: 1.4, rim: 2 });
    for (let x = 20; x <= 52; x += 4) mass(g, x, 15, 2.4, 2, 'hairgrey', { base: 1.6, k: 1.6 });
    // The cane's jewelled head beside his cheek.
    stroke(
      g,
      [
        [66, 72],
        [66, 30],
      ],
      'tar',
      3,
    );
    mass(g, 66, 26, 4.5, 4.5, 'gold', { base: 1.6, k: 1.6 });
    marks(g, 65, 25, ['ab', 'bc'], { a: ['crimson', 0], b: ['crimson', 2], c: ['crimson', 4] });
  },
};

/**
 * The smiths' guild coffer's guard, asleep on his feet: a kettle helm slid
 * forward over his brow, his eyes shut, his mouth open on a snore, a night's
 * stubble; beside him the iron-banded chest with the guild's hammer.
 */
export const GUILD_GUARD: FaceDef = {
  disc: 'slate',
  draw(g) {
    const p = pinsFor({ skin: 'skin', hair: 'hair', browShift: 0 });
    shoulders(g, 'cloth', 2.6, 51);
    neckAndEar(g, 'skin', p, 28);
    const h = head(
      g,
      [
        [36, 14],
        [48, 16],
        [55, 24],
        [56, 35],
        [53, 45],
        [46, 52],
        [36, 54],
        [27, 52],
        [20, 45],
        [17, 35],
        [18, 24],
        [24, 16],
      ],
      'skin',
      1.8,
    );
    // A night's stubble.
    const jaw = without(
      blob([
        [18, 38],
        [26, 46],
        [36, 48],
        [46, 46],
        [55, 38],
        [54, 47],
        [46, 53],
        [36, 55],
        [26, 53],
        [19, 47],
      ]),
      blob([
        [30, 44],
        [42, 44],
        [40, 50],
        [32, 50],
      ]),
    );
    tone(g, (x, y) => jaw(x, y) && h(x, y), 1, ['skin']);
    for (let y = 36; y < 55; y++)
      for (let x = 18; x < 56; x++)
        if (jaw(x, y) && h(x, y) && hash(x, y, 141) < 0.14) put(g, x, y, cell('hair', 4));
    // Eyes shut, brows slack, the mouth open on a snore.
    marks(g, 24, 31, ['.KKKKK.', 'K.....K'], p);
    marks(g, 41, 31, ['.KKKKK.', 'K.....K'], p);
    marks(g, 33, 32, ['..12..', '..123.', '.1123.', '012334', '.2344.'], p);
    marks(g, 32, 43, ['.4444.', '4DDDD4', '.4444.'], p);
    // A kettle helm slid forward, its brim over his brow.
    const crown = blob([
      [18, 22],
      [21, 10],
      [36, 4],
      [51, 10],
      [54, 22],
    ]);
    form(g, crown, 'iron', { cx: 26, cy: 6, rx: 20, ry: 12, base: 2.2, k: 1.6, rim: 3 });
    const brim = blob([
      [6, 28],
      [14, 22],
      [36, 21],
      [58, 22],
      [66, 28],
      [36, 27],
    ]);
    form(g, brim, 'iron', { cx: 24, cy: 22, rx: 30, ry: 5, base: 2.6, k: 1.3, rim: 1 });
    cast(g, brim, { n: 2, dx: 0, dy: 2, on: ['skin'] });
    // The coffer beside him: iron bands, the hammer crest.
    const chest = blob([
      [50, 72],
      [50, 56],
      [72, 56],
      [72, 72],
    ]);
    form(g, chest, 'wood', { cx: 52, cy: 56, rx: 14, ry: 10, base: 2.6, k: 1.3, rim: 1 });
    for (const y of [57, 64])
      stroke(
        g,
        [
          [50, y],
          [72, y],
        ],
        'iron',
        2,
      );
    marks(g, 58, 60, ['aaaaa', '.bab.', '..a..', '..a..'], { a: ['gold', 1], b: ['gold', 3] });
  },
};

/**
 * The banker of the counting house: bald and shining, mutton-chop whiskers,
 * a monocle screwed into one eye, a small calculating smile, and his scales
 * and a stack of gold at his shoulder.
 */
export const BANKER: FaceDef = {
  disc: 'gold',
  discStep: 4,
  draw(g) {
    const p = pinsFor({ skin: 'skin', hair: 'hairgrey', browShift: 2 });
    shoulders(g, 'tar', 2.2, 51);
    // A white shirt front and a dark cravat.
    form(
      g,
      blob([
        [28, 52],
        [44, 52],
        [40, 72],
        [32, 72],
      ]),
      'sail',
      { cx: 30, cy: 52, rx: 10, ry: 12, base: 1.6, k: 1.1, rim: 2 },
    );
    marks(g, 33, 54, ['aaaaaa', '.aaaa.', '..aa..'], { a: ['plum', 3] });
    neckAndEar(g, 'skin', p, 27);
    head(
      g,
      [
        [36, 10],
        [48, 13],
        [56, 23],
        [57, 35],
        [53, 45],
        [45, 52],
        [36, 54],
        [27, 52],
        [19, 45],
        [15, 35],
        [16, 23],
        [24, 13],
      ],
      'skin',
      1.6,
    );
    // The bald crown's shine.
    marks(g, 25, 13, ['.000.', '00011', '.011.'], p);
    // Mutton-chop whiskers down to the jaw.
    for (const pts of [
      [
        [16, 30],
        [24, 31],
        [26, 44],
        [20, 46],
        [16, 40],
      ],
      [
        [56, 30],
        [48, 31],
        [46, 44],
        [52, 46],
        [56, 40],
      ],
    ] as const)
      form(g, blob(pts), 'hairgrey', { cx: 18, cy: 30, rx: 8, ry: 12, base: 1.9, k: 1.4, rim: 2 });
    // One eye narrowed, the other magnified behind a monocle on a cord.
    marks(g, 24, 28, ['KKKKKK.', 'KWIiIK.', '.3333..'], p);
    marks(g, 41, 26, ['.KKKKK.', 'KWWIiWK', 'KWIIiWK', '.33333.'], p);
    marks(g, 39, 24, ['.aaaaaa.', 'a......a', 'a......a', 'a......a', 'a......a', '.aaaaaa.'], {
      a: ['gold', 2],
    });
    stroke(
      g,
      [
        [47, 30],
        [50, 40],
        [48, 52],
      ],
      'gold',
      3,
    );
    marks(g, 24, 24, ['.bBBb.'], p);
    marks(g, 40, 21, ['.bBBBb.'], p);
    marks(g, 34, 31, ['..12..', '.1223.', '011234', '.2344.'], p);
    // A small calculating smile, up at one corner.
    marks(g, 30, 43, ['..........4', '4444444444.', '.RRRRR.....'], p);
    // Scales and a stack of coin at his shoulder.
    for (let i = 0; i < 5; i++)
      form(
        g,
        blob([
          [56, 70 - i * 3],
          [70, 70 - i * 3],
          [70, 72 - i * 3],
          [56, 72 - i * 3],
        ]),
        'gold',
        { cx: 58, cy: 70 - i * 3, rx: 8, ry: 2, base: 1.8, k: 1.2, rim: 1 },
      );
    stroke(
      g,
      [
        [8, 50],
        [8, 72],
      ],
      'bronze',
      2,
    );
    stroke(
      g,
      [
        [1, 52],
        [15, 52],
      ],
      'bronze',
      1,
    );
    for (const x of [2, 14])
      marks(g, x - 2, 56, ['abbba', '.aaa.'], { a: ['bronze', 3], b: ['bronze', 1] });
  },
};

/**
 * Thistlewood Burrow's faces (B20), 72 x 72, drawn by hand in the B11 way
 * (beastFaces.ts, tier2Faces.ts): each its own shape, its features placed by
 * hand, one expression a viewer can name, everything that names it above row
 * 56 inside its safe box.
 *
 * - The spore puff, puffed up and indignant: a warty puffball filling the
 *   frame, its glowing freckles, its vent smoking, cross little eyes, cheeks
 *   blown out round a pursed mouth.
 * - The cap guard, grim on duty: its broad brown cap low over a stern pale
 *   face, gills in the shade of the brim, the red rim of its shield-cap
 *   before its shoulder.
 * - The bramble hound, snarling: a long head of twisted briar in
 *   three-quarters, leaf ears laid back, ember eyes, thorn teeth bared.
 * - The lantern moth, rapt: front-on, two great glowing eyes, a ruff of pale
 *   fur, feathered antennae, its eye-spotted wings spread behind.
 * - The badger king, offended: crowned and robed (in the king's batch).
 */
import { hash, put } from '../town2/cells';
import { cell } from './cave';
import type { Mat2 as Mat } from './cave';
import { blob, cast, form, marks, stroke } from './heads';
import { mass } from './beasts';
import type { FaceDef } from './folkFaces';

type P = Record<string, readonly [Mat, number]>;

/* ------------------------------------------------------------- spore puff */

export const SPORE_PUFF_FACE: FaceDef = {
  disc: 'moss',
  draw(g) {
    // Its little root feet at the frame's foot, under the body.
    for (const x of [20, 46])
      form(
        g,
        blob([
          [x, 56],
          [x + 8, 56],
          [x + 9, 72],
          [x - 1, 72],
        ]),
        'root',
        { cx: x + 2, cy: 60, rx: 6, ry: 10, base: 2.4, k: 1.2, rim: 2 },
      );
    // The body: a great round puffball, warty, lit on its upper left.
    const body = blob([
      [36, 6],
      [52, 9],
      [63, 20],
      [66, 34],
      [62, 48],
      [50, 58],
      [36, 61],
      [22, 58],
      [10, 48],
      [6, 34],
      [9, 20],
      [20, 9],
    ]);
    form(g, body, 'puff', {
      cx: 30,
      cy: 26,
      rx: 32,
      ry: 30,
      base: 1.8,
      k: 1.6,
      rim: 4,
      tex: (x, y, t) => {
        // Warts: little lit domes with a shade under each, scattered by hand-picked places.
        const u = Math.floor(x / 5);
        const v = Math.floor(y / 5);
        if (hash(u, v, 1501) < 0.35) {
          const cx = u * 5 + 2;
          const cy = v * 5 + 2;
          if (x === cx && y === cy) return t - 1.2;
          if (x === cx + 1 && y === cy + 1) return t + 1.2;
        }
        return t;
      },
    });
    // The vent on its crown, smoking with spores.
    marks(g, 32, 7, ['.abba.', 'abccba', '.abba.'], {
      a: ['puff', 3],
      b: ['puff', 5],
      c: ['spore', 0],
    });
    for (const [x, y, s] of [
      [34, 4, 1],
      [36, 2, 2],
      [33, 1, 0],
      [38, 0, 3],
      [31, 3, 2],
    ] as const)
      put(g, x, y, cell('spore', s));
    // Glowing freckles across its crown.
    for (const [x, y] of [
      [18, 18],
      [26, 13],
      [46, 14],
      [55, 22],
      [13, 30],
      [58, 34],
      [22, 22],
    ] as const)
      put(g, x, y, cell('spore', 1));
    // Cheeks blown out: two round domes, a little lighter.
    for (const x of [19, 53]) mass(g, x, 41, 7, 5.5, 'puff', { base: 1.5, k: 1.4 });
    // Cross little eyes under brows slanted down to the middle.
    const p: P = {
      K: ['eye', 4],
      W: ['eye', 0],
      C: ['eye', 0],
      b: ['puff', 5],
      d: ['puff', 4],
    };
    marks(g, 21, 26, ['.KKKKK.', 'KWWKKKK', 'KWKKKKK', 'KKKKKKK', '.KKKKK.'], p);
    marks(g, 44, 26, ['.KKKKK.', 'KWWKKKK', 'KWKKKKK', 'KKKKKKK', '.KKKKK.'], p);
    stroke(
      g,
      [
        [18, 19],
        [24, 20],
        [30, 24],
      ],
      'puff',
      5,
    );
    stroke(
      g,
      [
        [54, 19],
        [48, 20],
        [42, 24],
      ],
      'puff',
      5,
    );
    // The pursed mouth between the cheeks: a small round o, puckered.
    marks(g, 32, 41, ['..dd..', '.dbbd.', 'dbbbbd', '.dbbd.', '..dd..'], { ...p, b: ['shade', 3] });
  },
};

/* --------------------------------------------------------------- cap guard */

export const CAP_GUARD_FACE: FaceDef = {
  disc: 'slate',
  draw(g) {
    // Shoulders: its pale stalk of a body, the ring of its skirt across.
    const body = blob([
      [10, 72],
      [14, 56],
      [24, 49],
      [48, 49],
      [58, 56],
      [62, 72],
    ]);
    form(g, body, 'stalk', { cx: 28, cy: 54, rx: 30, ry: 18, base: 2.4, k: 1.2, rim: 3 });
    // The face: a broad pale stalk-top under the cap.
    const face = blob([
      [20, 24],
      [52, 24],
      [55, 36],
      [50, 48],
      [36, 52],
      [22, 48],
      [17, 36],
    ]);
    form(g, face, 'stalk', { cx: 30, cy: 32, rx: 22, ry: 20, base: 1.8, k: 1.3, rim: 3 });
    // Its cap: broad and low over the brow, brown, pale scales on it.
    const cap = blob([
      [36, 2],
      [54, 5],
      [67, 14],
      [70, 24],
      [60, 27],
      [36, 26],
      [12, 27],
      [2, 24],
      [5, 14],
      [18, 5],
    ]);
    form(g, cap, 'umber', { cx: 28, cy: 8, rx: 36, ry: 20, base: 2.2, k: 1.6, rim: 3 });
    for (const [x, y] of [
      [22, 10],
      [30, 7],
      [42, 8],
      [52, 12],
      [14, 16],
      [60, 18],
      [36, 14],
    ] as const) {
      put(g, x, y, cell('cream', 1));
      put(g, x + 1, y, cell('cream', 2));
    }
    // Gills under the brim, in shade, their edge glowing faintly.
    for (let x = 6; x <= 66; x++) {
      put(g, x, 26, cell('stalk', x % 2 ? 4 : 5));
      put(g, x, 27, cell('stalk', 5));
      if (x % 6 === 0) put(g, x, 26, cell('glowcap', 3));
    }
    cast(g, cap, { dx: 0, dy: 3, n: 1, on: ['stalk'] });
    // A stern face: a hard straight brow, narrowed eyes, a grim set mouth.
    const p: P = { K: ['eye', 4], W: ['eye', 1], I: ['eye', 3], C: ['eye', 0], b: ['stalk', 5] };
    marks(
      g,
      20,
      30,
      ['bbb......', '.bbbbbbb.', '.KKKKKKK.', 'KWWIIIWWK', 'KWWIKIWWK', '.KKKKKKK.'],
      p,
    );
    marks(
      g,
      42,
      30,
      ['......bbb', '.bbbbbbb.', '.KKKKKKK.', 'KWWIIIWWK', 'KWWIKIWWK', '.KKKKKKK.'],
      p,
    );
    marks(g, 32, 35, ['.b.', '.b.', 'bb.'], p);
    marks(g, 28, 43, ['..bbbbbbbb..', '.b........b.', 'b..........b'], p);
    // The rim of its shield-cap before its shoulder: red, white spots.
    const shield = blob([
      [44, 72],
      [48, 58],
      [58, 52],
      [70, 52],
      [72, 72],
    ]);
    form(g, shield, 'crimson', { cx: 54, cy: 54, rx: 20, ry: 16, base: 2.2, k: 1.6, rim: 3 });
    for (const [x, y] of [
      [56, 58],
      [64, 56],
      [61, 64],
      [52, 66],
    ] as const)
      mass(g, x, y, 2, 1.7, 'cream', { base: 1.2, k: 1 });
  },
};

/* ----------------------------------------------------------- bramble hound */

export const BRAMBLE_HOUND_FACE: FaceDef = {
  disc: 'midnight',
  draw(g) {
    // The neck and shoulders, strands of briar, thorns pale on them.
    const neck = blob([
      [0, 72],
      [2, 46],
      [16, 34],
      [34, 40],
      [44, 60],
      [40, 72],
    ]);
    form(g, neck, 'briar', {
      cx: 14,
      cy: 40,
      rx: 26,
      ry: 26,
      base: 2.8,
      k: 1.4,
      rim: 3,
      tex: (x, y, t) => ((y + Math.round(x * 0.4)) % 4 === 0 ? t + 1.3 : t),
    });
    for (const [x, y] of [
      [6, 44],
      [14, 38],
      [22, 37],
      [4, 56],
      [30, 46],
    ] as const) {
      put(g, x, y, cell('cream', 2));
      put(g, x + 1, y - 1, cell('cream', 1));
    }
    // Leaf ears laid back.
    for (const [pts, s] of [
      [
        [
          [18, 10],
          [26, 6],
          [32, 14],
          [26, 20],
        ],
        3,
      ],
      [
        [
          [8, 16],
          [16, 12],
          [22, 22],
          [14, 26],
        ],
        2.4,
      ],
    ] as const)
      form(g, blob(pts), 'leaf', { cx: 18, cy: 12, rx: 10, ry: 10, base: s, k: 1.4, rim: 2 });
    // The head: long and low in three-quarters, the muzzle out to the right.
    const head = blob([
      [22, 16],
      [38, 14],
      [52, 22],
      [66, 32],
      [70, 40],
      [62, 46],
      [44, 48],
      [28, 46],
      [16, 36],
    ]);
    form(g, head, 'briar', {
      cx: 30,
      cy: 22,
      rx: 30,
      ry: 22,
      base: 2,
      k: 1.6,
      rim: 3,
      tex: (x, y, t) => ((x + y * 2 + Math.round(Math.sin(x * 0.5) * 2)) % 5 === 0 ? t + 1.2 : t),
    });
    // The brow: a ridge of thorns over the eye, pale tips.
    stroke(
      g,
      [
        [30, 23],
        [36, 21],
        [44, 23],
      ],
      'briar',
      5,
    );
    for (const [x, y] of [
      [31, 21],
      [36, 19],
      [41, 20],
    ] as const)
      put(g, x, y, cell('cream', 1));
    // The ember eye: it keeps its glow in the dark.
    // Its pupil a dark slit, like a hunting thing's.
    marks(g, 32, 24, ['..aKb..', '.aaKbbc', 'abbKbcc', '.bbKcc.'], {
      a: ['ember', 0],
      b: ['ember', 2],
      c: ['ember', 4],
      K: ['eye', 4],
    });
    // The snarl: lips drawn back off thorn teeth, a dark mouth.
    marks(
      g,
      40,
      36,
      [
        'DDDDDDDDDDDDDDDDD',
        'TT.TT.TT.TT.TT.T.',
        'tT.tT.tT.tT.tT...',
        'RRRRRRRRRRRRR....',
        'DDDDDDDDDDDD.....',
        '.T.TT.TT.TT......',
        '.tTtTtTtTt.......',
      ],
      { D: ['briar', 5], t: ['cream', 2], T: ['cream', 0], R: ['crimson', 4] },
    );
    // The nose, a knot of dark wood.
    mass(g, 67, 36, 3, 2.6, 'tar', { base: 3, k: 1.4 });
    put(g, 66, 35, cell('tar', 1));
  },
};

/* ----------------------------------------------------------- lantern moth */

export const LANTERN_MOTH_FACE: FaceDef = {
  disc: 'plum',
  draw(g) {
    // Its wings spread behind, an eye spot on each.
    for (const s of [-1, 1]) {
      const cx = 36 + s * 22;
      const wingPts: [number, number][] = [
        [36, 26],
        [36 + s * 18, 16],
        [36 + s * 36, 18],
        [36 + s * 38, 40],
        [36 + s * 28, 62],
        [36 + s * 12, 54],
      ];
      form(g, blob(wingPts), 'mothwing', {
        cx,
        cy: 18,
        rx: 22,
        ry: 26,
        base: 2.6,
        k: 1.2,
        rim: 2,
        tex: (x, y, t) =>
          Math.floor((Math.abs(x - 36) * 0.5 + y * 0.6) / 4) % 3 === 0 ? t + 0.7 : t,
      });
      mass(g, cx + s * 8, 44, 4, 3.6, 'ochre', { base: 2.6, k: 1.2 });
      mass(g, cx + s * 8, 44, 2, 1.8, 'tar', { base: 3.4, k: 0.6 });
    }
    // The body below: a furred thorax, a pale ruff round its neck.
    const thorax = blob([
      [26, 72],
      [24, 52],
      [36, 46],
      [48, 52],
      [46, 72],
    ]);
    form(g, thorax, 'mothwing', { cx: 32, cy: 52, rx: 14, ry: 14, base: 2.2, k: 1.4, rim: 3 });
    const ruff = blob([
      [18, 48],
      [24, 40],
      [36, 42],
      [48, 40],
      [54, 48],
      [46, 56],
      [36, 54],
      [26, 56],
    ]);
    form(g, ruff, 'mothwing', {
      cx: 30,
      cy: 44,
      rx: 22,
      ry: 10,
      base: 0.8,
      lo: 0,
      k: 1.2,
      rim: 2,
      tex: (x, y, t) => (hash(x >> 1, y, 1601) < 0.25 ? t + 1 : t),
    });
    // The head, furred, two great round eyes that glow.
    const head = blob([
      [36, 18],
      [48, 22],
      [52, 32],
      [46, 42],
      [36, 44],
      [26, 42],
      [20, 32],
      [24, 22],
    ]);
    form(g, head, 'mothwing', { cx: 32, cy: 26, rx: 18, ry: 16, base: 1.6, k: 1.4, rim: 3 });
    for (const x of [27, 45]) {
      mass(g, x, 31, 7, 7.5, 'ember', { base: 2.6, k: 1.8, lo: 0, hi: 5 });
      put(g, x - 3, 27, cell('ember', 0));
      put(g, x - 2, 27, cell('ember', 0));
      put(g, x - 3, 28, cell('ember', 1));
      // The dark spot a moth's eye seems to look at you with.
      put(g, x, 32, cell('eye', 4));
      put(g, x + 1, 32, cell('eye', 4));
      put(g, x, 33, cell('eye', 4));
    }
    // Feathered antennae arcing up and out.
    for (const s of [-1, 1]) {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 10; i++) pts.push([36 + s * (3 + i * 2.2), 20 - i * 1.7 + i * i * 0.07]);
      stroke(g, pts, 'mothwing', 4);
      for (let i = 2; i <= 10; i += 2) {
        const [x, y] = pts[i]!;
        put(g, Math.round(x + s), Math.round(y - 1), cell('mothwing', 3));
        put(g, Math.round(x + s), Math.round(y + 1), cell('mothwing', 5));
      }
    }
    // A small mouth, curled tongue tucked under.
    marks(g, 34, 39, ['.aa.', 'a..a'], { a: ['mothwing', 5] });
  },
};

/* ------------------------------------------------------------ badger king */

/**
 * The badger king, offended: his white face front-on, the two black stripes
 * from his nose over his eyes to his ears, his chin up and his eyes
 * half-lidded, his mouth turned down at the corners; a small gold crown
 * perched between his ears; an ermine collar and his purple robe.
 */
export const BADGER_KING_FACE: FaceDef = {
  disc: 'midnight',
  draw(g) {
    // The robe on his shoulders and its ermine collar, black tail-tips in the white.
    const robe = blob([
      [-4, 72],
      [-2, 58],
      [12, 50],
      [60, 50],
      [74, 58],
      [76, 72],
    ]);
    form(g, robe, 'violet', { cx: 26, cy: 54, rx: 40, ry: 18, base: 2.6, k: 1.4, rim: 3 });
    const collar = blob([
      [8, 58],
      [16, 48],
      [36, 52],
      [56, 48],
      [64, 58],
      [56, 64],
      [36, 60],
      [16, 64],
    ]);
    form(g, collar, 'hairgrey', { cx: 28, cy: 50, rx: 30, ry: 12, base: 1, lo: 0, k: 1.2, rim: 2 });
    for (const [x, y] of [
      [14, 56],
      [22, 55],
      [30, 56],
      [42, 56],
      [50, 55],
      [58, 56],
    ] as const) {
      put(g, x, y, cell('tar', 3));
      put(g, x, y + 1, cell('tar', 4));
    }
    // His grizzled grey cheeks and the dark of his throat under the white.
    const fur = blob([
      [10, 30],
      [16, 16],
      [36, 12],
      [56, 16],
      [62, 30],
      [58, 46],
      [36, 54],
      [14, 46],
    ]);
    form(g, fur, 'badger', {
      cx: 30,
      cy: 26,
      rx: 28,
      ry: 26,
      base: 1.6,
      k: 1.4,
      rim: 3,
      tex: (x, y, t) => (hash(x >> 1, y, 1801) < 0.22 ? t - 1 : t),
    });
    // Ears, small and round, white-rimmed.
    for (const x of [14, 58])
      form(
        g,
        blob([
          [x - 6, 13],
          [x - 4, 8],
          [x, 6],
          [x + 4, 8],
          [x + 6, 13],
          [x + 3, 18],
          [x - 3, 18],
        ]),
        'badger',
        { cx: x - 1, cy: 11, rx: 6, ry: 6, base: 4, k: 1, rim: 2 },
      );
    for (const x of [14, 58])
      stroke(
        g,
        [
          [x - 5, 12],
          [x - 3, 8],
          [x, 7],
          [x + 3, 8],
          [x + 5, 12],
        ],
        'hairgrey',
        1,
      );
    // The white face: a long blaze from the crown down to the nose, and white cheeks.
    const blaze = blob([
      [30, 12],
      [42, 12],
      [44, 30],
      [42, 44],
      [36, 50],
      [30, 44],
      [28, 30],
    ]);
    form(g, blaze, 'hairgrey', {
      cx: 33,
      cy: 22,
      rx: 10,
      ry: 20,
      base: 0.8,
      lo: 0,
      k: 1.2,
      rim: 2,
    });
    for (const x of [18, 54])
      form(
        g,
        blob([
          [x - 6, 34],
          [x + (x < 36 ? 8 : -8), 30],
          [x + (x < 36 ? 10 : -10), 44],
          [x, 46],
        ]),
        'hairgrey',
        { cx: x - 2, cy: 34, rx: 10, ry: 10, base: 1.2, lo: 0, k: 1.2, rim: 2 },
      );
    // The stripes: from the nose up over each eye to the ear, black, broadening.
    for (const s of [-1, 1]) {
      const m = (pts: [number, number][]) =>
        pts.map(([x, y]) => [36 + s * (x - 36), y] as [number, number]);
      const stripe = blob(
        m([
          [33, 44],
          [30, 34],
          [26, 24],
          [18, 14],
          [11, 16],
          [16, 26],
          [22, 36],
          [29, 46],
        ]),
      );
      form(g, stripe, 'badger', {
        cx: 22,
        cy: 24,
        rx: 14,
        ry: 20,
        base: 4.6,
        k: 0.8,
        rim: 1,
        hi: 5,
      });
    }
    // Half-lidded eyes in the stripes: a heavy pale lid over a sliver of dark eye.
    for (const [x, d] of [
      [21, 1],
      [44, -1],
    ] as const) {
      marks(g, x, 26, ['.ccccc.', 'cWWWWWc', 'WKKKKKW', 'WKCKKKW', '.WWWWW.'], {
        c: ['hairgrey', 1],
        K: ['eye', 4],
        W: ['eye', 1],
        C: ['eye', 0],
      });
      // A brow raised at the affront on one side, lowered on the other.
      stroke(
        g,
        d > 0
          ? [
              [22, 24],
              [26, 22],
              [30, 23],
            ]
          : [
              [43, 23],
              [47, 24],
              [51, 26],
            ],
        'badger',
        5,
      );
    }
    // The nose: a big black leather knob, glinting.
    mass(g, 36, 44, 5, 3.6, 'tar', { base: 3, k: 1.6 });
    put(g, 34, 42, cell('tar', 0));
    put(g, 35, 42, cell('tar', 1));
    // The mouth, turned down at its corners: most irregular.
    stroke(
      g,
      [
        [29, 52],
        [31, 50],
        [36, 50],
        [41, 50],
        [43, 52],
      ],
      'badger',
      5,
    );
    // The crown: small, gold, perched between his ears, a red stone in it.
    marks(
      g,
      28,
      2,
      ['a...a...a', 'aa.aaa.aa', 'abbbbbbba', 'bbbrrbbbb', 'bcccccccb', 'ddddddddd'],
      {
        a: ['gold', 0],
        b: ['gold', 1],
        c: ['gold', 2],
        r: ['crimson', 1],
        d: ['gold', 4],
      },
    );
    cast(
      g,
      blob([
        [28, 4],
        [37, 4],
        [37, 8],
        [28, 8],
      ]),
      { dx: 0, dy: 2, n: 1, on: ['hairgrey'] },
    );
  },
};

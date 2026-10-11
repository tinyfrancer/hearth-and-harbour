/**
 * The ferryman's portrait (B15), in the B11 style: a weathered old salt
 * under a yellow sou'wester, the brim turned up in front and falling over
 * his ears, a short grey beard and moustache, one eye screwed up against the
 * wind, the other twinkling, his pipe in the corner of a crooked smile with
 * a wisp of smoke, his oilskin's collar up and the loom of his oar at his
 * shoulder: he will row you anywhere, and has opinions about all of it.
 */
import { put, type TGrid } from '../town2/cells';
import { cell } from './cave';
import { blob, cast, form, marks, pinsFor, stroke, without } from './heads';
import type { FaceDef } from './folkFaces';

export const FERRYMAN: FaceDef = {
  disc: 'sea',
  discStep: 4,
  draw(g: TGrid) {
    const P = pinsFor({ skin: 'skingolden', hair: 'hairgrey', iris: ['teal', 2, 4] });
    const G = { ...P, b: ['hairgrey', 2] as const, B: ['hairgrey', 4] as const };
    // The oar's loom standing at his near shoulder.
    for (let y = 0; y < 72; y++) {
      put(g, 4, y, cell('pinewood', 1));
      put(g, 5, y, cell('pinewood', 2));
      put(g, 6, y, cell('pinewood', 3));
    }
    // The oilskin, its collar turned up round his neck.
    const body = blob([
      [-4, 74],
      [-2, 62],
      [10, 55],
      [24, 52],
      [48, 52],
      [62, 55],
      [74, 62],
      [76, 74],
    ]);
    form(g, body, 'ochre', { cx: 24, cy: 54, rx: 40, ry: 20, base: 2.3, k: 1.3, rim: 3 });
    for (const side of [-1, 1] as const) {
      const collar = blob(
        side < 0
          ? [
              [16, 66],
              [14, 50],
              [22, 44],
              [30, 52],
              [30, 66],
            ]
          : [
              [42, 66],
              [42, 52],
              [50, 44],
              [58, 50],
              [56, 66],
            ],
      );
      form(g, collar, 'ochre', { cx: 20, cy: 44, rx: 30, ry: 20, base: 1.8, k: 1.4, rim: 2 });
    }
    marks(g, 35, 60, ['a', '.', '.', '.', '.', 'a'], { a: ['wood', 4] });
    const neckS = blob([
      [28, 44],
      [44, 44],
      [44, 56],
      [36, 58],
      [28, 56],
    ]);
    form(g, neckS, 'skingolden', { cx: 30, cy: 46, rx: 12, ry: 12, base: 3, k: 1, rim: 2 });
    // The head: broad and weathered, the jaw square under the beard.
    const head = blob([
      [36, 12],
      [47, 14],
      [54, 21],
      [55, 31],
      [54, 41],
      [49, 48],
      [40, 52],
      [31, 52],
      [23, 48],
      [18, 40],
      [17, 30],
      [19, 20],
      [26, 14],
    ]);
    form(g, head, 'skingolden', { cx: 30, cy: 22, rx: 22, ry: 24, base: 1.5, k: 1.4, rim: 3 });
    // A short grey beard round the jaw, a moustache over the lip.
    const beard = without(
      blob([
        [18, 35],
        [22, 42],
        [28, 45],
        [36, 44],
        [44, 45],
        [50, 42],
        [55, 35],
        [55, 45],
        [49, 52],
        [40, 56],
        [31, 56],
        [23, 52],
        [18, 44],
      ]),
      blob([
        [28, 48],
        [36, 46],
        [45, 47],
        [41, 50],
        [32, 50],
      ]),
    );
    form(g, beard, 'hairgrey', {
      cx: 28,
      cy: 40,
      rx: 22,
      ry: 16,
      base: 1.8,
      k: 1.3,
      rim: 2,
      tex: (x, y, t) => t + ((x * 5 + y * 3) % 9 === 0 ? 1 : 0),
    });
    const tache = blob([
      [27, 43],
      [33, 41],
      [37, 42],
      [41, 41],
      [47, 43],
      [44, 46],
      [37, 45],
      [30, 46],
    ]);
    form(g, tache, 'hairgrey', { cx: 30, cy: 40, rx: 14, ry: 6, base: 1.6, k: 1.2, rim: 1 });
    // The smile, crooked up at the near corner round the pipe's stem.
    marks(g, 30, 46, ['4.......', '.444444.', '..TTt4..'], P);
    // The pipe: its stem from the far corner of the mouth, the bowl hanging, an ember, a wisp of smoke.
    marks(
      g,
      45,
      46,
      [
        'ab..........',
        '.aab........',
        '...aab......',
        '.....aab....',
        '.......cccd.',
        '......ccfccd',
        '......ccccdd',
        '.......cccd.',
        '........dd..',
      ],
      { a: ['wood', 2], b: ['wood', 4], c: ['tar', 2], d: ['tar', 4], f: ['fire', 1] },
    );
    stroke(
      g,
      [
        [54, 49],
        [57, 45],
        [56, 41],
        [59, 37],
        [58, 33],
      ],
      'smoke',
      1,
    );
    put(g, 60, 31, cell('smoke', 2));
    put(g, 59, 29, cell('smoke', 3));
    // The nose: big, a little red with weather, lit on its bridge.
    marks(
      g,
      33,
      30,
      ['..12...', '..12...', '..123..', '.11233.', '1102344', '2233444', '.34.44.'],
      P,
    );
    // Eyes: the near one screwed up against the wind, the far one open and twinkling.
    marks(g, 23, 29, ['..KKKKK..', '.K33333K.', 'K3.....3K', '..33333..'], G);
    marks(g, 41, 28, ['.KKKKKKK.', 'KKWCIiWKK', '.3WIKiW3.', '..33333..'], G);
    // Crow's feet, and bushy grey brows: the near one down over the squint, the far one up.
    stroke(
      g,
      [
        [19, 31],
        [21, 32],
      ],
      'skingolden',
      4,
    );
    stroke(
      g,
      [
        [19, 34],
        [21, 33],
      ],
      'skingolden',
      4,
    );
    stroke(
      g,
      [
        [52, 30],
        [54, 31],
      ],
      'skingolden',
      4,
    );
    marks(g, 21, 25, ['..bbBBBBb', 'bbBBBBB..', '....BB...'], G);
    marks(g, 40, 23, ['....bbBB.', '.bbBBBBBb', 'bBBb.....'], G);
    // The sou'wester: a round crown, the brim turned up short in front and falling over the ears.
    const crown = blob([
      [18, 20],
      [20, 9],
      [30, 3],
      [42, 3],
      [52, 9],
      [55, 20],
    ]);
    form(g, crown, 'ochre', { cx: 26, cy: 3, rx: 26, ry: 14, base: 1.8, k: 1.5, rim: 3 });
    const brim = blob([
      [6, 34],
      [10, 22],
      [20, 17],
      [36, 15],
      [52, 17],
      [62, 22],
      [66, 34],
      [60, 36],
      [56, 26],
      [46, 22],
      [36, 21],
      [26, 22],
      [16, 26],
      [12, 36],
    ]);
    form(g, brim, 'ochre', { cx: 24, cy: 16, rx: 34, ry: 14, base: 1.6, k: 1.5, rim: 2 });
    stroke(
      g,
      [
        [16, 24],
        [26, 20],
        [36, 19],
        [46, 20],
        [56, 24],
      ],
      'ochre',
      0,
    );
    cast(g, brim, { n: 1, dx: 0, dy: 2, on: ['skingolden', 'hairgrey'] });
  },
};

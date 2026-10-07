/**
 * The five thieving marks' faces (B12, for lane A's thieving cards), drawn by
 * hand as the townsfolk's are (folkFaces.ts, B11): each head its own shape,
 * its own eyes, brows, nose and mouth as rows of characters, one expression
 * that says who they are, and one thing beside the face that names them at
 * the lists' size. Ids are the game's thieving actions.
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
import type { FaceDef } from './folkFaces';

const dots = (g: TGrid, list: Pts, mat: Mat, step: number) => {
  for (const [x, y] of list) put(g, x, y, cell(mat, step));
};

/** Stubble: the skin a step darker where it grows, a few hairs showing at random. */
function stubble(g: TGrid, where: Inside, skin: Mat, hair: Mat, seed: number, step = 3): void {
  tone(g, where, 1, [skin]);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++)
      if (where(x, y) && g.d[y * g.w + x] && hash(x, y, seed) < 0.16)
        put(g, x, y, cell(hair, step));
}

/** Shoulders filling the frame's bottom, in `mat`. */
function shoulders(g: TGrid, mat: Mat, base = 2.5): void {
  const body = blob([
    [-4, 74],
    [-3, 63],
    [9, 55],
    [23, 51],
    [49, 51],
    [63, 55],
    [75, 63],
    [76, 74],
  ]);
  form(g, body, mat, { cx: 26, cy: 53, rx: 40, ry: 20, base, k: 1.3, rim: 3 });
}

/** A neck and the near ear, in a skin. */
function neckAndEar(
  g: TGrid,
  skin: Mat,
  P: Record<string, readonly [Mat, number]>,
  earTop = 26,
): void {
  const neck = blob([
    [24, 42],
    [48, 42],
    [48, 55],
    [36, 58],
    [24, 55],
  ]);
  form(g, neck, skin, { cx: 30, cy: 44, rx: 14, ry: 12, base: 2.6, k: 1, rim: 2 });
  const ear = blob([
    [18, earTop],
    [13, earTop + 2],
    [12, earTop + 8],
    [14, earTop + 13],
    [19, earTop + 12],
  ]);
  form(g, ear, skin, { cx: 13, cy: earTop + 3, rx: 5, ry: 8, base: 2, k: 1.2, rim: 2 });
  marks(g, 14, earTop + 5, ['3', '4', '3'], P);
}

/* ------------------------------------------------------ the dozing fisherman */

/**
 * Asleep: a yellow oilskin hat tipped down over his brow, his eyes shut in
 * two soft curves, his mouth fallen a little open, grey stubble, a knitted
 * jumper rolled at the neck. Nobody has ever looked so comfortable on a crate.
 */
export const FISHERMAN: FaceDef = {
  disc: 'teal',
  draw(g) {
    const P = pinsFor({ skin: 'skingolden', hair: 'hairgrey', browShift: 0 });
    shoulders(g, 'indigo', 2.6);
    // The jumper's rolled collar, ribbed.
    const roll = blob([
      [18, 50],
      [30, 47],
      [44, 47],
      [56, 50],
      [50, 56],
      [36, 58],
      [22, 56],
    ]);
    form(g, roll, 'indigo', { cx: 30, cy: 48, rx: 20, ry: 6, base: 2, k: 1.2, rim: 2 });
    for (let x = 21; x <= 53; x += 3)
      stroke(
        g,
        [
          [x, 50],
          [x, 55],
        ],
        'indigo',
        4,
      );
    neckAndEar(g, 'skingolden', P, 27);
    // A broad, weathered face, heavy at the jaw.
    const head = blob([
      [36, 12],
      [48, 14],
      [55, 22],
      [56, 33],
      [54, 43],
      [48, 50],
      [38, 53],
      [29, 52],
      [21, 47],
      [17, 38],
      [17, 27],
      [21, 17],
      [28, 13],
    ]);
    form(g, head, 'skingolden', { cx: 31, cy: 24, rx: 22, ry: 24, base: 1.7, k: 1.4, rim: 3 });
    // Grey stubble along the jaw and lip.
    const jawline = without(
      blob([
        [18, 38],
        [24, 44],
        [36, 46],
        [48, 44],
        [55, 37],
        [54, 46],
        [46, 52],
        [36, 54],
        [26, 52],
        [19, 46],
      ]),
      blob([
        [29, 44],
        [43, 44],
        [40, 49],
        [32, 49],
      ]),
    );
    stubble(g, jawline, 'skingolden', 'hairgrey', 11, 4);
    // Eyes shut: soft lids curving down, lashes at their ends.
    marks(g, 24, 30, ['.KKKKK.', 'K.....K', '3.....3'], P);
    marks(g, 41, 30, ['.KKKKK.', 'K.....K', '3.....3'], P);
    // Brows relaxed, a little lifted at their inner ends.
    marks(g, 24, 27, ['.bbBBBb'], P);
    marks(g, 41, 27, ['bBBbb..'], P);
    // A blunt nose.
    marks(g, 33, 31, ['..12..', '..123.', '.1123.', '012334', '.2344.'], P);
    // The mouth fallen open in a snore.
    marks(g, 32, 43, ['.4444.', '4DDDD4', '4DDDD4', '.4444.'], P);
    // The oilskin hat tipped down over his brow, its brim sagging, a shadow under it.
    const crown = blob([
      [20, 18],
      [24, 8],
      [36, 4],
      [48, 7],
      [54, 16],
      [50, 21],
      [36, 20],
      [24, 22],
    ]);
    form(g, crown, 'ochre', { cx: 28, cy: 6, rx: 20, ry: 12, base: 1.8, k: 1.4, rim: 2 });
    const brim = blob([
      [8, 24],
      [16, 19],
      [30, 18],
      [46, 18],
      [60, 20],
      [66, 25],
      [56, 27],
      [40, 26],
      [26, 27],
      [12, 28],
    ]);
    form(g, brim, 'ochre', { cx: 30, cy: 18, rx: 28, ry: 6, base: 2.6, k: 1.2, rim: 1 });
    stroke(
      g,
      [
        [22, 19],
        [36, 17],
        [52, 18],
      ],
      'ochre',
      4,
    );
    cast(g, brim, { n: 1, dx: 0, dy: 2, on: ['skingolden'] });
  },
};

/* ------------------------------------------------------ the fish stall's keeper */

/**
 * The stallholder who hears every coin: auburn hair piled up under a
 * kerchief, her eyes cut sideways toward the sound and one brow up, lips
 * pursed, a gold hoop in the ear she is listening with.
 */
export const STALLHOLDER: FaceDef = {
  disc: 'ochre',
  draw(g) {
    const P = pinsFor({
      skin: 'skin',
      hair: 'auburn',
      browShift: 0,
      iris: ['moss', 3, 5],
    });
    shoulders(g, 'cream', 2.2);
    // A striped neckerchief.
    const kerchief = blob([
      [20, 50],
      [36, 49],
      [52, 50],
      [44, 60],
      [36, 64],
      [28, 60],
    ]);
    form(g, kerchief, 'crimson', { cx: 30, cy: 50, rx: 18, ry: 10, base: 2.2, k: 1.2, rim: 2 });
    for (let y = 52; y < 64; y += 3)
      stroke(
        g,
        [
          [24, y],
          [48, y],
        ],
        'cream',
        2,
      );
    neckAndEar(g, 'skin', P, 27);
    // A gold hoop in her ear.
    dots(
      g,
      [
        [14, 40],
        [13, 41],
        [13, 42],
        [14, 43],
        [16, 43],
        [17, 42],
      ],
      'gold',
      1,
    );
    // A neat oval face.
    const head = blob([
      [36, 12],
      [47, 14],
      [53, 22],
      [54, 33],
      [51, 43],
      [44, 50],
      [36, 52],
      [28, 50],
      [21, 44],
      [18, 34],
      [19, 23],
      [26, 14],
    ]);
    form(g, head, 'skin', { cx: 31, cy: 24, rx: 20, ry: 24, base: 1.5, k: 1.3, rim: 3 });
    // Her hair, piled high, wisps at the temples.
    const hair = blob([
      [17, 26],
      [18, 14],
      [26, 6],
      [38, 2],
      [50, 6],
      [56, 16],
      [56, 26],
      [50, 18],
      [40, 14],
      [28, 16],
      [22, 22],
    ]);
    form(g, hair, 'auburn', { cx: 28, cy: 4, rx: 22, ry: 14, base: 2, k: 1.5, rim: 2 });
    stroke(
      g,
      [
        [24, 12],
        [32, 7],
        [42, 6],
      ],
      'auburn',
      1,
    );
    stroke(
      g,
      [
        [20, 24],
        [19, 30],
      ],
      'auburn',
      3,
    );
    // A kerchief over the top, knotted.
    const scarf = blob([
      [22, 8],
      [32, 1],
      [46, 2],
      [54, 9],
      [46, 8],
      [34, 7],
    ]);
    form(g, scarf, 'crimson', { cx: 30, cy: 2, rx: 14, ry: 5, base: 2, k: 1.3, rim: 1 });
    // One brow arched up, the other drawn down: she has heard something.
    marks(g, 23, 23, ['....bbB', '.bBBB..', 'bB.....'], P);
    marks(g, 41, 26, ['bBBBBb.', '.....bB'], P);
    // Eyes cut hard to her left, toward the sound.
    marks(g, 24, 28, ['.KKKKKK.', 'KIiCWWWK', 'KIKiWWK.', '.33333..'], P);
    marks(g, 41, 28, ['.KKKKK.', 'KIiCWWK', 'KIKiWK.', '.3333..'], P);
    // A small straight nose.
    marks(g, 33, 31, ['..1..', '..12.', '..12.', '.1123', '.234.'], P);
    // Lips pursed to one side.
    marks(g, 30, 42, ['...RRR..', '..RR3RR.', '...RRR..'], { ...P, R: ['madder', 2] });
    // A herring held up by the tail beside her, silver, its eye on the viewer.
    const fish = blob([
      [61, 30],
      [65, 32],
      [67, 40],
      [66, 50],
      [63, 56],
      [60, 50],
      [59, 40],
    ]);
    form(g, fish, 'iron', { cx: 60, cy: 34, rx: 5, ry: 14, base: 1.2, k: 1.6, rim: 2 });
    stroke(
      g,
      [
        [62, 34],
        [63, 52],
      ],
      'teal',
      2,
    );
    marks(g, 58, 23, ['F...F', '.F.F.', '..F..', '.SSS.', 'SSSSS'], {
      F: ['iron', 2],
      S: ['skin', 2],
    });
    dots(g, [[62, 51]], 'eye', 4);
  },
};

/* ------------------------------------------------------ the tipsy sailor */

/**
 * Mid-song: a red knitted cap pushed askew, brows up, eyes swimming (one lid
 * lower than the other), mouth wide open on a note, a gold ring in his ear
 * and three days' stubble over a striped shirt.
 */
export const SAILOR: FaceDef = {
  disc: 'blue',
  draw(g) {
    const P = pinsFor({ skin: 'skinbrown', hair: 'hairblack', browShift: 0, iris: ['wood', 3, 5] });
    shoulders(g, 'cream', 2.2);
    // Stripes across the shirt.
    for (let y = 56; y < 74; y += 4)
      for (let x = 0; x < 72; x++)
        if (g.d[y * g.w + x]) {
          put(g, x, y, cell('indigo', 2));
          put(g, x, y + 1, cell('indigo', 3));
        }
    neckAndEar(g, 'skinbrown', P, 26);
    dots(
      g,
      [
        [14, 39],
        [13, 40],
        [13, 41],
        [14, 42],
        [15, 42],
      ],
      'gold',
      1,
    );
    // A long, loose face.
    const head = blob([
      [35, 11],
      [47, 13],
      [54, 21],
      [55, 33],
      [53, 44],
      [46, 52],
      [37, 55],
      [28, 53],
      [21, 47],
      [17, 37],
      [17, 25],
      [22, 16],
      [28, 12],
    ]);
    form(g, head, 'skinbrown', { cx: 31, cy: 24, rx: 21, ry: 26, base: 1.6, k: 1.4, rim: 3 });
    // Stubble.
    const jaw = blob([
      [18, 38],
      [26, 46],
      [38, 48],
      [50, 45],
      [55, 38],
      [53, 48],
      [46, 54],
      [36, 57],
      [25, 53],
    ]);
    stubble(g, jaw, 'skinbrown', 'hairblack', 12);
    // Brows high, as if the note were up there.
    marks(g, 23, 22, ['..bbBBb', 'bBb....'], P);
    marks(g, 41, 22, ['bBBbb..', '....bBb'], P);
    // Eyes swimming: the near lid heavy, the far one less, irises not quite together.
    marks(g, 24, 27, ['.KKKKKK.', 'KKKKKKKK', 'KWIiCWWK', '.33333..'], P);
    marks(g, 41, 27, ['.KKKKK.', 'KWWCIiK', 'KWWIKiK', '.3333..'], P);
    // A nose a little bulbous.
    marks(g, 33, 30, ['..12..', '..123.', '.11233', '012344', '.2344.'], P);
    // The mouth wide open on a note, teeth along the top.
    marks(
      g,
      29,
      41,
      ['..44444..', '.4TTTTT4.', '4DDDDDDD4', '4DDRRRDD4', '.4DDDDD4.', '..44444..'],
      P,
    );
    // The knitted cap pushed back and over to one side, its ribs, a turned-up band.
    const cap = blob([
      [18, 20],
      [20, 9],
      [30, 3],
      [42, 3],
      [52, 9],
      [56, 18],
      [44, 16],
      [30, 17],
    ]);
    form(g, cap, 'crimson', { cx: 26, cy: 4, rx: 20, ry: 12, base: 2, k: 1.4, rim: 2 });
    for (let x = 24; x <= 50; x += 3)
      stroke(
        g,
        [
          [x, 6],
          [x, 15],
        ],
        'crimson',
        3,
      );
    const band = blob([
      [16, 22],
      [28, 16],
      [44, 15],
      [58, 19],
      [56, 23],
      [44, 20],
      [28, 21],
      [18, 26],
    ]);
    form(g, band, 'crimson', { cx: 28, cy: 16, rx: 22, ry: 4, base: 2.6, k: 1.2, rim: 1 });
    cast(g, band, { n: 1, dx: 0, dy: 1, on: ['skinbrown'] });
  },
};

/* ------------------------------------------------------ the travelling pedlar */

/**
 * The pedlar: a broad-brimmed hat hung with ribbons, a long nose, a thin
 * waxed moustache over a closed, knowing smile, one eye half shut in
 * something not quite a wink; a coat of patches and pockets, ribbon ends at
 * its collar.
 */
export const PEDLAR: FaceDef = {
  disc: 'plum',
  draw(g) {
    const P = pinsFor({ skin: 'skin', hair: 'chestnut', browShift: 1, iris: ['moss', 2, 4] });
    shoulders(g, 'umber', 2.4);
    // Patches and a pocket flap on the coat.
    for (const [x, y, w, h, m] of [
      [6, 60, 8, 7, 'mossdye'],
      [52, 58, 9, 8, 'ochre'],
      [24, 64, 10, 6, 'madder'],
    ] as const) {
      for (let yy = y; yy < y + h; yy++)
        for (let xx = x; xx < x + w; xx++)
          if (g.d[yy * g.w + xx]) put(g, xx, yy, cell(m, xx === x || yy === y ? 2 : 3));
    }
    // Ribbon ends at the collar.
    stroke(
      g,
      [
        [30, 52],
        [27, 58],
        [29, 64],
      ],
      'crimson',
      2,
    );
    stroke(
      g,
      [
        [42, 52],
        [45, 57],
        [43, 63],
      ],
      'teal',
      2,
    );
    neckAndEar(g, 'skin', P, 27);
    // A long, narrow face.
    const head = blob([
      [36, 14],
      [46, 16],
      [52, 24],
      [53, 34],
      [50, 44],
      [43, 52],
      [35, 54],
      [27, 51],
      [21, 44],
      [18, 34],
      [19, 24],
      [26, 16],
    ]);
    form(g, head, 'skin', { cx: 31, cy: 26, rx: 20, ry: 24, base: 1.6, k: 1.4, rim: 3 });
    // Brows: one level, one lifted.
    marks(g, 23, 25, ['..bbBBb', 'bBb....'], P);
    marks(g, 41, 26, ['bBBBb..'], P);
    // The near eye half shut, the far one open and amused.
    marks(g, 24, 29, ['.KKKKK.', 'KKKKKKK', '.3IiC3.', '..333..'], P);
    marks(g, 41, 28, ['.KKKKK.', 'KWCIiWK', 'KWIKiWK', '.3333..'], P);
    // A long nose with a bump.
    marks(
      g,
      33,
      30,
      ['..1..', '..12.', '..12.', '.012.', '..123', '..123', '.1123', '01234', '.234.'],
      P,
    );
    // A thin moustache, waxed into curls, and a closed smile under it.
    marks(
      g,
      25,
      41,
      [
        'B.............B',
        '.BB.........BB.',
        '..BBBBBBBBBBB..',
        '.....4...4.....',
        '......444......',
      ],
      P,
    );
    // The hat: a broad brim, the crown banded, ribbons hanging from the brim at the side.
    const crown = blob([
      [24, 16],
      [26, 5],
      [36, 2],
      [46, 5],
      [50, 16],
    ]);
    form(g, crown, 'felt', { cx: 30, cy: 4, rx: 14, ry: 10, base: 2, k: 1.4, rim: 2 });
    stroke(
      g,
      [
        [24, 13],
        [50, 13],
      ],
      'gold',
      2,
    );
    stroke(
      g,
      [
        [24, 14],
        [50, 14],
      ],
      'gold',
      3,
    );
    const brim = blob([
      [6, 22],
      [14, 17],
      [30, 15],
      [46, 15],
      [62, 17],
      [68, 22],
      [58, 23],
      [40, 21],
      [24, 22],
      [12, 24],
    ]);
    form(g, brim, 'felt', { cx: 30, cy: 15, rx: 30, ry: 5, base: 2.6, k: 1.2, rim: 1 });
    cast(g, brim, { n: 1, dx: 0, dy: 2, on: ['skin'] });
    for (const [x, m, len] of [
      [62, 'crimson', 14],
      [65, 'gold', 10],
      [59, 'teal', 18],
    ] as const) {
      stroke(
        g,
        [
          [x, 22],
          [x + 1, 22 + Math.round(len / 2)],
          [x, 22 + len],
        ],
        m,
        1,
      );
      stroke(
        g,
        [
          [x + 1, 22],
          [x + 2, 22 + Math.round(len / 2)],
          [x + 1, 22 + len],
        ],
        m,
        3,
      );
    }
  },
};

/* ------------------------------------------------------ the harbourmaster's clerk */

/**
 * The clerk who guards the strongbox: a thin pale face, dark hair parted and
 * plastered flat, round spectacles over eyes stretched wide with tiny pupils
 * (he has not blinked), a mouth like a ruled line, a high starched collar and
 * a black stock, a quill behind his ear.
 */
export const CLERK: FaceDef = {
  disc: 'slate',
  draw(g) {
    const P = pinsFor({ skin: 'skinpale', hair: 'hairblack', browShift: 0 });
    shoulders(g, 'midnight', 2.4);
    // A high white collar and a black stock.
    const collar = blob([
      [20, 46],
      [30, 50],
      [36, 56],
      [42, 50],
      [52, 46],
      [54, 56],
      [44, 60],
      [36, 62],
      [28, 60],
      [18, 56],
    ]);
    form(g, collar, 'limewash', { cx: 30, cy: 46, rx: 18, ry: 8, base: 1.4, k: 1.2, rim: 2 });
    const stock = blob([
      [31, 54],
      [41, 54],
      [40, 62],
      [36, 66],
      [32, 62],
    ]);
    form(g, stock, 'tar', { cx: 34, cy: 54, rx: 6, ry: 8, base: 2.2, k: 1.2, rim: 1 });
    neckAndEar(g, 'skinpale', P, 25);
    // A long, thin face.
    const head = blob([
      [36, 9],
      [46, 11],
      [52, 20],
      [53, 32],
      [50, 43],
      [44, 50],
      [36, 52],
      [28, 50],
      [22, 43],
      [19, 32],
      [20, 20],
      [26, 11],
    ]);
    form(g, head, 'skinpale', { cx: 31, cy: 22, rx: 20, ry: 25, base: 1.5, k: 1.3, rim: 3 });
    // Hair parted and plastered flat, a sheen along it.
    const hair = blob([
      [19, 24],
      [20, 13],
      [28, 7],
      [38, 6],
      [48, 9],
      [53, 18],
      [53, 24],
      [46, 15],
      [34, 13],
      [26, 15],
      [22, 20],
    ]);
    form(g, hair, 'hairblack', { cx: 28, cy: 6, rx: 20, ry: 12, base: 2.2, k: 1.4, rim: 2 });
    stroke(
      g,
      [
        [30, 7],
        [32, 13],
      ],
      'hairblack',
      5,
    );
    stroke(
      g,
      [
        [34, 8],
        [44, 10],
      ],
      'hairblack',
      1,
    );
    // A quill behind his ear.
    stroke(
      g,
      [
        [17, 36],
        [10, 18],
        [8, 10],
      ],
      'cream',
      1,
    );
    stroke(
      g,
      [
        [11, 22],
        [7, 12],
        [6, 8],
      ],
      'cream',
      3,
    );
    stroke(
      g,
      [
        [17, 36],
        [18, 38],
      ],
      'tar',
      4,
    );
    // Brows straight and high.
    marks(g, 23, 23, ['.bBBBBBb'], P);
    marks(g, 41, 23, ['bBBBBBb.'], P);
    // Eyes stretched wide, white all round, the pupils pinpricks.
    marks(g, 24, 26, ['.KKKKKK.', 'KWWWWWWK', 'KWWIiWWK', 'KWWWWWWK', '.KKKKKK.'], P);
    marks(g, 41, 26, ['.KKKKK.', 'KWWWWWK', 'KWWIiWK', 'KWWWWWK', '.KKKKK.'], P);
    // Round spectacles over them, the bridge across the nose.
    const rim: [number, number][] = [];
    for (const cx of [27.5, 44]) {
      for (let a = 0; a < 40; a++) {
        const t = (a / 40) * Math.PI * 2;
        rim.push([Math.round(cx + Math.cos(t) * 6), Math.round(28 + Math.sin(t) * 5)]);
      }
    }
    dots(g, rim, 'iron', 2);
    stroke(
      g,
      [
        [34, 27],
        [38, 27],
      ],
      'iron',
      2,
    );
    dots(
      g,
      [
        [24, 25],
        [41, 25],
      ],
      'pane',
      0,
    );
    // A thin nose.
    marks(g, 34, 31, ['.1..', '.12.', '.12.', '.12.', '1123', '.234'], P);
    // A mouth like a ruled line.
    marks(g, 30, 43, ['44444444', '.333333.'], P);
  },
};

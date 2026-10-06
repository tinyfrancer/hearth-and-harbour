/**
 * Portraits at the C scale: a 72 x 72 bust on a dark disc for every face the
 * game shows (the townsfolk, every monster the idle game fights, the grotto's
 * cast and its captain) and the hero's own, in the look and head gear worn.
 * Drawn at this size from the bust pieces (bust.ts), each with one clear
 * expression and the silhouette that names it, recognisable from its figure.
 *
 * Everything that matters (face, hat, ears, horns) lies inside the safe box
 * (`PORTRAIT2_SAFE`), so a frame that must crop a portrait can crop to it.
 */
import { put, stamp, tgrid, type Picture2, type TGrid } from '../town2/cells';
import { cell } from './cave';
import type { Mat2 as Mat } from './cave';
import { outlineIn } from '../figure2/engine';
import { browShift } from '../figure2/look';
import type { Mat as TownMat } from '../town2/ramps';
import { dome, lim, litBy, paint, rod, sprite } from './kit';
import { eye as beadEye, mass, shade } from './beasts';
import {
  BUST,
  HEAD0,
  beard,
  disc,
  ear,
  eyes,
  face,
  faceX,
  eyesY,
  headHalf,
  mouth,
  neck,
  nose,
  shoulders,
  skull,
  strands,
  type Head,
} from './bust';

/** A portrait's size at the C scale, in art pixels. */
export const PORTRAIT2_SIZE = BUST;

/* ------------------------------------------------------------- head gear */

/** Hair over the crown, cut short, a fringe across the brow. */
function shortHair(g: TGrid, h: Head, mat: Mat, long = false): void {
  const ey = eyesY(h);
  strands(
    g,
    mat,
    (x, y) => {
      const half = headHalf(h, y) + 1.5;
      const lx = x + 0.5 - h.cx;
      if (Math.abs(lx) > half) return false;
      if (y < h.top - 1) return false;
      // The hairline: across the brow, down past the ears.
      const line = ey - 8 + Math.round(Math.abs(lx) * 0.25) + (lx < -h.w + 4 ? 8 : 0);
      if (long && Math.abs(lx) > h.w - 4 && y < h.chin + 6) return true;
      return y < line;
    },
    {
      x0: h.cx - h.w - 3,
      y0: h.top - 2,
      w: h.w * 2 + 6,
      h: long ? 58 : 30,
      cx: h.cx - 4,
      cy: h.top + 6,
      lean: 0.4,
    },
  );
  if (long)
    strands(
      g,
      mat,
      (x, y) =>
        y > ey - 6 &&
        y < h.chin + 8 &&
        ((x > h.cx - h.w - 4 && x < h.cx - h.w + 4) || (x > h.cx + h.w - 2 && x < h.cx + h.w + 4)),
      {
        x0: h.cx - h.w - 5,
        y0: ey - 6,
        w: h.w * 2 + 10,
        h: h.chin - ey + 16,
        cx: h.cx - 6,
        cy: ey,
        lean: 0,
      },
    );
}

/** A head as bald as an egg, a shine on the crown. */
function baldShine(g: TGrid, h: Head, skin: Mat): void {
  for (const [x, y] of [
    [h.cx - 6, h.top + 4],
    [h.cx - 5, h.top + 3],
    [h.cx - 4, h.top + 3],
    [h.cx - 7, h.top + 5],
  ] as const)
    put(g, x, y, cell(skin, 0));
}

/** A tricorn: the crown domed, the brim turned up in three points, edged with braid. */
function tricorn(g: TGrid, h: Head, mat: Mat, trim: Mat, skullMark = false, scale = 1): void {
  const cx = h.cx + 1;
  const y0 = h.top - 6;
  paint(g, cx - 30, y0, 60, 26, (x, y) => {
    const lx = (x + 0.5 - cx) / scale;
    const ly = y - y0;
    const crown = Math.hypot(lx / 13, (ly - 10) / 10) <= 1 && ly <= 16;
    const brimTop =
      14 - Math.round(Math.abs(lx) * 0.42) - (Math.abs(lx) > 20 ? Math.abs(lx) - 20 : 0);
    const brim = ly >= brimTop && ly <= 19 - Math.round(Math.abs(lx) * 0.14) && Math.abs(lx) <= 25;
    if (!crown && !brim) return 0;
    if (brim && ly <= brimTop + 1) return cell(trim, ly === brimTop ? 1 : 3);
    const t =
      2.8 - (litBy(lx / 26, crown && !brim ? (ly - 10) / 10 : 0.3) - 0.3) * 2 + (brim ? 0.5 : 0);
    return cell(mat, lim(t, 1, 5));
  });
  if (skullMark)
    sprite(g, cx - 3, y0 + 6, ['.aaa.', 'aaaaa', 'aKaKa', '.aaa.', 'b.a.b', '.b.b.'], {
      a: ['plaster', 1],
      K: [mat, 6],
      b: ['plaster', 3],
    });
}

/** A bandana tight over the crown, knotted behind, its tails hanging. */
function bandana(g: TGrid, h: Head, mat: Mat, dot: Mat): void {
  const ey = eyesY(h);
  paint(g, h.cx - h.w - 2, h.top - 2, h.w * 2 + 5, ey - h.top - 2, (x, y) => {
    const half = headHalf(h, Math.max(h.top + 2, y)) + 1.5;
    const lx = x + 0.5 - h.cx;
    if (Math.abs(lx) > half || y > ey - 6 + Math.round(Math.abs(lx) * 0.15)) return 0;
    if ((x * 3 + y * 5) % 11 === 0) return cell(dot, 1);
    const t =
      2.4 - (litBy(lx / half, (y - h.top - 6) / 10) - 0.3) * 2 + ((x + y) % 5 === 0 ? 0.6 : 0);
    return cell(mat, lim(t, 1, 5));
  });
  sprite(g, h.cx - h.w - 7, ey - 9, ['..aab', '.aabb', 'aab..', 'ab...', 'ab...', '.b...'], {
    a: [mat, 2],
    b: [mat, 4],
  });
}

/** A hood: over the head and down onto the shoulders, the face looking out of its opening. */
function hood(g: TGrid, h: Head, mat: Mat): void {
  const fx = faceX(h);
  const ey = eyesY(h);
  paint(g, h.cx - h.w - 7, h.top - 5, h.w * 2 + 15, BUST - h.top + 5, (x, y) => {
    const lx = x + 0.5 - h.cx;
    const cy = h.top + 16;
    const shell =
      Math.hypot(lx / (h.w + 5), (y - cy) / 21) <= 1 ||
      (y > cy && Math.abs(lx) < h.w + 5 + (y - cy) * 0.6);
    if (!shell) return 0;
    // The opening, where the face is.
    const open = Math.hypot((x + 0.5 - fx) / (h.w - 3), (y - ey - 3) / 16) <= 1;
    if (open) return 0;
    const nx = lx / (h.w + 6);
    let t = 2.6 - (litBy(Math.max(-1, Math.min(1, nx)), (y - cy) / 30) - 0.3) * 2;
    // The opening's edge folds back, lit; inside it is dark.
    if (Math.hypot((x + 0.5 - fx) / (h.w - 1), (y - ey - 3) / 18) <= 1) t = x < fx ? 1.6 : 3.6;
    return cell(mat, lim(t, 1, 5));
  });
}

/** A knitted cap, rolled at the brim. */
function knitCap(g: TGrid, h: Head, mat: Mat): void {
  const ey = eyesY(h);
  paint(g, h.cx - h.w - 2, h.top - 4, h.w * 2 + 5, ey - h.top - 1, (x, y) => {
    const half = headHalf(h, Math.max(h.top + 1, y + 2)) + 2;
    const lx = x + 0.5 - h.cx;
    const brim = ey - 9;
    if (Math.abs(lx) > half || y > brim + 2) return 0;
    if (y >= brim) return cell(mat, y === brim ? 2 : lx > 6 ? 4 : 3);
    const t = 2.6 - (litBy(lx / half, (y - h.top) / 10) - 0.3) * 2 + (x % 3 === 0 ? 0.7 : 0);
    return cell(mat, lim(t, 1, 5));
  });
}

/** A flat cap: low over the brow, a short peak. */
function flatCap(g: TGrid, h: Head, mat: Mat): void {
  const ey = eyesY(h);
  paint(g, h.cx - h.w - 2, h.top - 3, h.w * 2 + 12, ey - h.top - 1, (x, y) => {
    const lx = x + 0.5 - h.cx;
    const half = headHalf(h, Math.max(h.top + 2, y + 2)) + 2;
    const peak = y >= ey - 8 && y <= ey - 7 && lx > -2 && lx < h.w + 8;
    if (!peak && (Math.abs(lx) > half || y > ey - 8)) return 0;
    if (peak) return cell(mat, y === ey - 8 ? 3 : 5);
    const t = 2.5 - (litBy(lx / half, (y - h.top) / 9) - 0.3) * 2;
    return cell(mat, lim(t + ((x + y) % 4 === 0 ? 0.6 : 0), 1, 5));
  });
}

/** A headscarf over the hair, knotted at the nape, a little hair showing at the brow. */
function headscarf(g: TGrid, h: Head, mat: Mat, hair: Mat): void {
  const ey = eyesY(h);
  strands(g, hair, (x, y) => y > ey - 9 && y < ey - 6 && Math.abs(x + 0.5 - h.cx) < h.w - 2, {
    x0: h.cx - h.w,
    y0: ey - 10,
    w: h.w * 2,
    h: 5,
    cx: h.cx,
    cy: ey - 8,
  });
  paint(g, h.cx - h.w - 3, h.top - 3, h.w * 2 + 6, ey - h.top + 4, (x, y) => {
    const half = headHalf(h, Math.max(h.top + 2, y)) + 2;
    const lx = x + 0.5 - h.cx;
    if (Math.abs(lx) > half) return 0;
    if (y > ey - 9 + Math.round(Math.abs(lx) * 0.1) && lx > -h.w + 3) return 0;
    const t = 2.4 - (litBy(lx / half, (y - h.top) / 12) - 0.3) * 2 + ((x - y) % 6 === 0 ? 0.8 : 0);
    return cell(mat, lim(t, 1, 5));
  });
  sprite(g, h.cx - h.w - 6, ey - 2, ['.aab', 'aabb', 'ab..', 'ab..', '.b..'], {
    a: [mat, 2],
    b: [mat, 4],
  });
}

/* ------------------------------------------------------------ the people */

type Painter = (g: TGrid) => void;

interface FaceDef {
  readonly disc: Mat;
  readonly discStep?: number;
  readonly draw: Painter;
}

const H = HEAD0;

const SMITH: FaceDef = {
  disc: 'fire',
  discStep: 6,
  draw(g) {
    shoulders(g, 'cloth');
    // The apron's bib and its strap.
    paint(g, 22, 58, 28, 14, (x, y) =>
      Math.abs(x + 0.5 - 37) < 10 + (y - 58) * 0.3 ? cell('leather', x < 33 ? 2 : 3) : 0,
    );
    rod(g, 26, 58, 30, 52, 3, 'leather', [2, 3, 4]);
    neck(g, H, 'skin', 9);
    face(g, H, 'skin', { brow: 'heavy', browMat: 'chestnut', nose: 'broad', mouth: 'set' });
    baldShine(g, H, 'skin');
    beard(g, H, 'chestnut', { length: 12, width: 1.05, moustache: true });
  },
};

const TRADER: FaceDef = {
  disc: 'violet',
  draw(g) {
    shoulders(g, 'violet', { neck: 8 });
    paint(g, 30, 56, 14, 4, (x, y) =>
      y === 56 || Math.abs(x - 37) < 5 - (y - 56) ? cell('cream', 2) : 0,
    );
    neck(g, H, 'skin', 7);
    face(g, { ...H, jaw: 8 }, 'skin', {
      brow: 'raised',
      browMat: 'auburn',
      nose: 'snub',
      mouth: 'smirk',
      iris: 'moss',
    });
    headscarf(g, H, 'mossdye', 'auburn');
    // Auburn curls loose at her near cheek, falling to the shoulder.
    for (const [x, y, r] of [
      [18, 32, 3],
      [16.5, 37, 3.2],
      [18, 42, 3],
      [16, 47, 2.8],
      [18.5, 51, 2.5],
    ] as const)
      dome(g, x, y, r, r * 0.9, 'auburn', 2.4, 2.2);
  },
};

const PIRATE: FaceDef = {
  disc: 'crimson',
  draw(g) {
    shoulders(g, 'crimson');
    // Gold epaulette and the cream shirt at the throat.
    paint(g, 31, 56, 12, 16, (x) => cell('cream', x < 36 ? 1 : 3));
    dome(g, 14, 60, 6, 3, 'gold', 2, 2);
    neck(g, H, 'skingolden', 8);
    face(g, H, 'skingolden', {
      brow: 'angry',
      browMat: 'hairblack',
      nose: 'hook',
      mouth: 'smirk',
      patch: true,
      ring: 'gold',
    });
    beard(g, H, 'hairblack', { length: 8, moustache: true });
    tricorn(g, H, 'felt', 'gold');
  },
};

const ALEWIFE: FaceDef = {
  disc: 'madder',
  draw(g) {
    // The bun, low at the back.
    dome(g, 17, 38, 8, 7, 'chestnut', 2.6, 2);
    shoulders(g, 'madder', { neck: 9 });
    paint(g, 28, 58, 18, 14, (x, y) =>
      Math.abs(x + 0.5 - 37) < 7 + (y - 58) * 0.2 ? cell('cream', x < 35 ? 1 : 2) : 0,
    );
    neck(g, H, 'skinpale', 7);
    face(g, { ...H, jaw: 10 }, 'skinpale', {
      eyes: 'glad',
      brow: 'level',
      browMat: 'chestnut',
      nose: 'bulb',
      mouth: 'smile',
      ruddy: 'madder',
    });
    shortHair(g, H, 'chestnut');
  },
};

const MARKET: FaceDef = {
  disc: 'ochre',
  draw(g) {
    shoulders(g, 'ochre', { neck: 10 });
    // The shawl's knot at her throat.
    dome(g, 38, 58, 4, 3, 'ochre', 1.6, 2);
    neck(g, H, 'skingolden', 7);
    face(g, { ...H, jaw: 8 }, 'skingolden', {
      brow: 'worried',
      browMat: 'hairblack',
      nose: 'straight',
      mouth: 'set',
    });
    shortHair(g, H, 'hairblack');
    // Her braid over the near shoulder.
    for (let i = 0; i < 6; i++) dome(g, 21 - i * 0.4, 44 + i * 4, 3, 2.4, 'hairblack', 2.4, 2);
    // The loaves on her head.
    dome(g, 30, 7, 9, 4, 'ochre', 2.3, 2);
    dome(g, 42, 7, 7, 4, 'wood', 2, 2);
    paint(g, 21, 9, 30, 3, (_x, y) => cell('thatch', y === 9 ? 2 : 4));
  },
};

const DOCKER: FaceDef = {
  disc: 'indigo',
  draw(g) {
    shoulders(g, 'cream', { neck: 10, slope: 2.6 });
    // The waistcoat over the shirt.
    paint(g, 0, 58, BUST, 14, (x, y) => {
      const lx = x + 0.5 - 37;
      if (Math.abs(lx) < 4 + (y - 58) * 0.2) return 0;
      if (Math.abs(lx) > 9 + (y - 58) * 2.4) return 0;
      return cell('umber', lx < 0 ? 2 : 4);
    });
    neck(g, H, 'skinbrown', 9);
    face(g, { ...H, w: 17, jaw: 11 }, 'skinbrown', {
      brow: 'level',
      browMat: 'hairblack',
      nose: 'broad',
      mouth: 'set',
    });
    beard(g, { ...H, w: 17, jaw: 11 }, 'hairblack', { stubble: true });
    flatCap(g, { ...H, w: 17 }, 'umber');
  },
};

const ELDER: FaceDef = {
  disc: 'midnight',
  draw(g) {
    shoulders(g, 'umber', { neck: 8 });
    neck(g, H, 'skindeep', 7);
    face(g, H, 'skindeep', {
      eyes: 'narrow',
      brow: 'heavy',
      browMat: 'hairgrey',
      nose: 'hook',
      mouth: 'set',
    });
    // Lines at the brow and the eye's corner.
    for (const x of [30, 31, 32, 39, 40, 41]) put(g, x, 22, cell('skindeep', 3));
    beard(g, H, 'hairgrey', { length: 18, width: 0.9, moustache: true });
    shortHair(g, { ...H, top: H.top + 2 }, 'hairgrey');
  },
};

/* ------------------------------------------------- the grotto's people */

const DECKHAND: FaceDef = {
  disc: 'teal',
  draw(g) {
    shoulders(g, 'cream', { neck: 10 });
    // Stripes across the jersey.
    paint(g, 0, 58, BUST, 14, (x, y) =>
      g.d[y * BUST + x] && Math.floor((y - 58) / 3) % 2 === 0 ? cell('crimson', x < 34 ? 2 : 3) : 0,
    );
    neck(g, H, 'skingolden', 9);
    face(g, H, 'skingolden', {
      brow: 'angry',
      browMat: 'hairblack',
      nose: 'broad',
      mouth: 'scowl',
      ring: 'gold',
    });
    beard(g, H, 'hairblack', { stubble: true });
    bandana(g, H, 'crimson', 'cream');
  },
};

const SMUGGLER: FaceDef = {
  disc: 'tar',
  draw(g) {
    shoulders(g, 'tar', { neck: 10, slope: 2.6 });
    paint(g, 31, 57, 12, 15, (x, y) =>
      Math.floor((y - 57) / 2) % 2 ? cell('crimson', 3) : cell('cream', x < 37 ? 1 : 2),
    );
    neck(g, H, 'skin', 9);
    face(g, H, 'skin', {
      brow: 'heavy',
      browMat: 'hairblack',
      nose: 'bulb',
      mouth: 'set',
      ruddy: 'madder',
    });
    beard(g, H, 'hairblack', { length: 14, width: 1.1, moustache: true });
    knitCap(g, H, 'indigo');
  },
};

const MONKEY: FaceDef = {
  disc: 'ochre',
  draw(g) {
    shoulders(g, 'umber', { neck: 7, slope: 2 });
    neck(g, H, 'skinbrown', 7);
    face(g, { ...H, w: 17, jaw: 10 }, 'skinbrown', {
      eyes: 'wide',
      brow: 'raised',
      browMat: 'hair',
      nose: 'snub',
      mouth: 'grin',
    });
    beard(g, { ...H, w: 17, jaw: 10 }, 'hair', { stubble: true });
    baldShine(g, H, 'skinbrown');
    // The keg's rim over his shoulder and its fuse, lit.
    paint(g, 52, 50, 18, 22, (x, y) => {
      const nx = ((x - 52 + 0.5) / 18) * 2 - 1;
      if (Math.abs(nx) > 1) return 0;
      return y === 56 || y === 66 ? cell('iron', 3) : cell('wood', lim(2.5 + nx * 1.4, 1, 5));
    });
    sprite(g, 62, 42, ['..FE', '.f..', 'f...', 'f...', 'f...', 'f...', 'f...', 'f...'], {
      f: ['tar', 2],
      F: ['ember', 1],
      E: ['ember', 3],
    });
  },
};

const FOOTPAD: FaceDef = {
  disc: 'felt',
  draw(g) {
    shoulders(g, 'hide', { neck: 10 });
    neck(g, H, 'skinpale', 9);
    face(g, H, 'skinpale', { eyes: 'narrow', brow: 'angry', browMat: 'hair', noEar: true });
    // The mask over nose and mouth.
    const ey = eyesY(H);
    paint(g, H.cx - H.w, ey + 4, H.w * 2 + 3, H.chin - ey, (x, y) => {
      const half = headHalf(H, y) + 1;
      if (Math.abs(x + 0.5 - H.cx - 1) > half) return 0;
      return cell(
        'umber',
        lim(2.6 + (x > faceX(H) + 3 ? 1 : 0) + ((x + y) % 5 === 0 ? 0.6 : 0), 1, 5),
      );
    });
    hood(g, H, 'felt');
    // The cudgel's knotted head over his shoulder.
    dome(g, 60, 46, 6, 7, 'bark', 2.6, 2);
    rod(g, 57, 52, 52, 72, 4, 'bark', [2, 3, 4]);
  },
};

const GOBLIN: FaceDef = {
  disc: 'mossdye',
  draw(g) {
    const h: Head = { cx: 35, top: 16, w: 15, jaw: 6, chin: 52 };
    shoulders(g, 'umber', { neck: 7, slope: 2 });
    neck(g, h, 'goblin', 6);
    // Ears: long and pointed, out either side of the hood.
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? h.cx - h.w - 1 : h.cx + h.w + 2;
      for (let i = 0; i < 14; i++) {
        const x = x0 + side * i;
        const y = eyesY(h) - 2 - Math.round(i * 0.6);
        for (let j = 0; j < Math.max(1, 5 - Math.floor(i / 3)); j++)
          put(g, x, y + j, cell('goblin', j === 0 ? 1 : side > 0 ? 4 : 3));
      }
    }
    face(g, h, 'goblin', {
      eyes: 'narrow',
      brow: 'angry',
      browMat: 'hairblack',
      iris: 'gold',
      nose: 'hook',
      mouth: 'grin',
      noEar: true,
    });
    hood(g, h, 'mossdye');
    // The bow's tip and string over his shoulder.
    rod(g, 62, 8, 66, 70, 3, 'bark', [1, 2, 4]);
  },
};

/* ------------------------------------------------------------ the beasts */

const RAT: FaceDef = {
  disc: 'stone',
  draw(g) {
    mass(g, 30, 52, 24, 18, 'fur', { base: 3, tex: 'fur' });
    mass(g, 38, 38, 15, 13, 'fur', { base: 2.6, tex: 'fur', k2: 2 });
    mass(g, 52, 44, 9, 7, 'fur', { base: 2.4, k2: 3 });
    // Round ears, pink inside.
    for (const [x, y] of [
      [26, 22],
      [44, 20],
    ] as const) {
      dome(g, x, y, 7, 7, 'fur', 2.4, 2);
      dome(g, x + 1, y + 1, 4, 4, 'shell', 3, 1.5);
    }
    beadEye(g, 44, 34);
    beadEye(g, 45, 35);
    put(g, 46, 34, cell('eye', 4));
    paint(g, 58, 41, 4, 4, (x, y) => cell('shell', x === 58 || y === 41 ? 2 : 4));
    // Teeth, yellow, under the snout.
    sprite(g, 52, 50, ['aa', 'ab', 'ab'], { a: ['cream', 2], b: ['ochre', 3] });
    for (const [x0, y0, x1, y1] of [
      [56, 44, 68, 40],
      [56, 46, 69, 47],
      [55, 48, 66, 53],
    ] as const)
      rod(g, x0, y0, x1, y1, 1, 'cream', [3]);
  },
};

const SAND_CRAB: FaceDef = {
  disc: 'deep',
  draw(g) {
    mass(g, 36, 56, 30, 16, 'crab', { base: 2.8, tex: 'shell', k: 2.2 });
    // Stalk eyes, furious.
    for (const [x, tilt] of [
      [27, -1],
      [44, 1],
    ] as const) {
      rod(g, x, 46, x + tilt * 2, 26, 3, 'crab', [2, 3, 4]);
      dome(g, x + tilt * 2, 24, 4, 4, 'eye', 4, 0.5);
      put(g, x + tilt * 2 - 1, 22, cell('eye', 0));
      // The angry brow ridge.
      rod(g, x + tilt * 2 - 4 * tilt, 18, x + tilt * 2 + 3 * tilt, 21, 2, 'crab', [1, 3]);
    }
    // A claw raised beside, pincer open.
    mass(g, 10, 30, 8, 11, 'crab', { base: 2.4, k: 2.4 });
    rod(g, 7, 20, 3, 8, 4, 'crab', [1, 3]);
    rod(g, 14, 20, 15, 10, 3, 'crab', [2, 4]);
    sprite(g, 29, 57, ['a.b.b.a', '.bcccb.', 'a.b.b.a'], {
      a: ['crab', 2],
      b: ['crab', 4],
      c: ['shade', 3],
    });
  },
};

const GULL: FaceDef = {
  disc: 'sea',
  draw(g) {
    mass(g, 28, 60, 26, 14, 'sail', { base: 1.8, k: 1.6 });
    mass(g, 18, 58, 16, 9, 'stone', { base: 2.4, tex: 'feather' });
    mass(g, 36, 34, 15, 15, 'sail', { base: 1.5, k: 1.6 });
    // The fierce yellow eye under a flat grey brow.
    paint(g, 37, 26, 8, 6, (x, y) =>
      Math.hypot(x - 41, y - 29) < 3 ? cell('gold', y < 29 ? 1 : 2) : 0,
    );
    put(g, 41, 29, cell('eye', 4));
    put(g, 42, 29, cell('eye', 4));
    paint(g, 35, 24, 12, 2, (_x, y) => cell('stone', y === 24 ? 4 : 5));
    // The beak, a red spot on its hook, the chip clamped in it.
    sprite(g, 48, 32, ['aaaaaaaaab..', 'aaaaaaaabbc.', '.ccccccrrbc.', '.aaaaab.....'], {
      a: ['gold', 1],
      b: ['gold', 3],
      c: ['gold', 4],
      r: ['crimson', 2],
    });
    rod(g, 55, 38, 68, 22, 3, 'ochre', [1, 2, 3]);
  },
};

const BOAR: FaceDef = {
  disc: 'leaf',
  draw(g) {
    // Shoulders hunched, the head low and long, the snout's disc toward us at the right.
    mass(g, 26, 64, 28, 14, 'umber', { base: 3, tex: 'fur', k: 2.2 });
    mass(g, 30, 40, 20, 19, 'umber', { base: 2.8, tex: 'fur', k: 2.4, k2: 2 });
    mass(g, 50, 48, 13, 11, 'umber', { base: 2.6, tex: 'fur', k2: 3 });
    // Ears, pointed and laid back.
    sprite(g, 14, 14, ['a....', 'ab...', 'abb..', '.abbc', '..bcc'], {
      a: ['umber', 1],
      b: ['umber', 3],
      c: ['umber', 5],
    });
    sprite(g, 34, 12, ['....a', '...ab', '..abb', '.abbc', 'abbcc'], {
      a: ['umber', 2],
      b: ['umber', 4],
      c: ['umber', 5],
    });
    // Bristles up the crown with brambles caught in them.
    for (let x = 14; x < 44; x += 2)
      rod(g, x, 24, x - 2, 17 - Math.abs(x - 28) * 0.15, 1, 'tar', [2]);
    sprite(g, 22, 15, ['.a.b.', 'aabaa', 'a.c.a', '.a.a.'], {
      a: ['leaf', 3],
      b: ['leaf', 5],
      c: ['crimson', 2],
    });
    sprite(g, 36, 13, ['.a.b', 'aaba', '.c.a'], {
      a: ['leaf', 3],
      b: ['leaf', 5],
      c: ['crimson', 2],
    });
    // The snout's disc, wet, two nostrils.
    mass(g, 59, 50, 7, 8, 'shell', { base: 3, k: 2 });
    for (const y of [47, 53]) {
      put(g, 60, y, cell('shell', 6));
      put(g, 61, y, cell('shell', 5));
    }
    // A small mean eye, a heavy brow over it.
    paint(g, 39, 35, 5, 3, (x, y) => (y === 35 ? cell('tar', 3) : cell('gold', x < 41 ? 1 : 2)));
    put(g, 42, 36, cell('eye', 4));
    put(g, 42, 37, cell('eye', 4));
    // Tusks curling up out of the jaw.
    for (const [x, d] of [
      [46, -1],
      [55, 1],
    ] as const)
      for (let i = 0; i < 9; i++) {
        put(g, x + d * Math.round(i * 0.4), 62 - i, cell('cream', i > 5 ? 0 : 1));
        put(g, x + d * Math.round(i * 0.4) + 1, 62 - i, cell('cream', 3));
      }
    paint(g, 44, 58, 14, 2, (_x, y) => cell('shade', y === 58 ? 4 : 3));
  },
};

const WOLF: FaceDef = {
  disc: 'midnight',
  draw(g) {
    // The ruff, the head in three-quarters, a long muzzle out to the right.
    mass(g, 30, 64, 28, 14, 'fur', { base: 2.8, tex: 'fur' });
    mass(g, 30, 36, 17, 17, 'fur', { base: 2.5, tex: 'fur', k2: 2 });
    mass(g, 50, 44, 17, 8, 'fur', { base: 2.3, tex: 'fur', k2: 3 });
    mass(g, 48, 52, 13, 4, 'cream', { base: 2.6, k: 1.4 });
    // Ears, tall and pricked.
    sprite(
      g,
      14,
      4,
      ['.....a', '....ab', '...abb', '..abbc', '.abbbc', 'abbdbc', 'abbdcc', 'bbbccc'],
      {
        a: ['fur', 1],
        b: ['fur', 3],
        c: ['fur', 5],
        d: ['shell', 4],
      },
    );
    sprite(
      g,
      34,
      3,
      ['a.....', 'ab....', 'abb...', 'abdb..', 'abdbc.', 'abbbcc', 'bbbccc', 'bbcccc'],
      {
        a: ['fur', 1],
        b: ['fur', 3],
        c: ['fur', 5],
        d: ['shell', 4],
      },
    );
    // Pale eyes under a lowered brow, a dark mask between them.
    for (const x of [27, 40]) {
      paint(g, x, 31, 5, 3, (xx, y) =>
        y === 31 ? cell('fur', 6) : cell('gold', xx <= x + 1 ? 1 : 2),
      );
      put(g, x + 3, 32, cell('eye', 4));
      put(g, x + 3, 33, cell('eye', 4));
    }
    paint(g, 33, 27, 6, 10, (x) => cell('fur', x < 35 ? 4 : 5));
    // The nose at the muzzle's end, the lip drawn back over long teeth.
    paint(g, 63, 39, 5, 4, (x, y) => cell('tar', x === 63 || y === 39 ? 3 : 5));
    sprite(
      g,
      46,
      47,
      ['aaaaaaaaaaaaaaaaa..', 'bcccbcccbcccbccc...', 'b.c...c...c...c....', 'bbbbbbbbbbbbbbb....'],
      {
        a: ['crimson', 4],
        b: ['shade', 3],
        c: ['cream', 0],
      },
    );
  },
};

const TROLL: FaceDef = {
  disc: 'moss',
  draw(g) {
    mass(g, 36, 66, 34, 14, 'troll', { base: 3, tex: 'shell' });
    mass(g, 36, 38, 22, 24, 'troll', { base: 2.6, k: 2.4, tex: 'shell', k2: 3 });
    // A brow like a ledge, little eyes under it.
    paint(g, 16, 26, 40, 4, (_x, y) => cell('troll', y === 26 ? 1 : y === 27 ? 2 : 4));
    for (const x of [24, 42]) {
      paint(g, x, 30, 5, 3, (xx, y) =>
        y === 32 ? cell('troll', 5) : cell('gold', xx === x ? 1 : 2),
      );
      put(g, x + 3, 31, cell('eye', 4));
    }
    mass(g, 36, 40, 6, 5, 'troll', { base: 2, k: 2.4 });
    // The vast jaw, the underbite, tusks up past the lip.
    mass(g, 37, 54, 20, 10, 'troll', { base: 2.8, k: 2, k2: 5 });
    paint(g, 20, 48, 34, 2, (_x, y) => cell('shade', y === 48 ? 4 : 3));
    for (const x of [22, 50])
      sprite(g, x, 38, ['.a', 'aa', 'ab', 'ab', 'ab', 'ab', 'ab', 'ab', 'bb', 'bc'], {
        a: ['cream', 0],
        b: ['cream', 2],
        c: ['cream', 4],
      });
    for (let i = 0; i < 6; i++)
      rod(g, 26 + i * 4, 15, 25 + i * 4, 21 + (i % 3) * 2, 2, 'weed', [2, 4]);
  },
};

const WYRM: FaceDef = {
  disc: 'pine',
  draw(g) {
    mass(g, 24, 58, 18, 16, 'pine', { base: 3, tex: 'scale' });
    mass(g, 34, 34, 15, 12, 'pine', { base: 2.6, k: 2.4, tex: 'scale', k2: 2 });
    mass(g, 52, 40, 15, 8, 'pine', { base: 2.4, tex: 'scale', k2: 5 });
    // Horns swept back, thorns down the neck.
    rod(g, 30, 24, 14, 6, 4, 'bark', [1, 2, 4]);
    rod(g, 38, 23, 30, 4, 3, 'bark', [2, 3, 4]);
    for (let i = 0; i < 5; i++)
      sprite(g, 8 + i * 3, 46 + i * 4, ['.a', 'ab'], { a: ['bark', 2], b: ['bark', 4] });
    // A gold slit eye.
    paint(g, 37, 29, 6, 4, (x, y) =>
      Math.hypot(x - 40, y - 31) < 2.8 ? cell('gold', y < 31 ? 1 : 2) : 0,
    );
    paint(g, 40, 29, 1, 4, () => cell('eye', 4));
    rod(g, 35, 27, 44, 26, 2, 'pine', [5, 6]);
    // The jaw open, teeth, a forked tongue.
    paint(g, 44, 46, 24, 4, (_x, y) => cell(y === 46 ? 'crimson' : 'shade', y === 46 ? 4 : 3));
    sprite(g, 45, 44, ['a.a.a.a.a.a.', '............', '............', '.a.a.a.a.a..'], {
      a: ['cream', 0],
    });
    mass(g, 54, 54, 12, 4, 'pine', { base: 2.8, k: 2 });
    sprite(g, 62, 47, ['aa...', '..aaa', '..a..', '.a...'], { a: ['crimson', 2] });
  },
};

const GIANT_CRAB: FaceDef = {
  disc: 'deep',
  discStep: 6,
  draw(g) {
    mass(g, 36, 60, 34, 18, 'crab', { base: 2.9, tex: 'shell', k: 2.2, k2: 4 });
    // Barnacles and weed on the shell's rim.
    for (let i = 0; i < 14; i++) {
      const x = 8 + ((i * 37) % 56);
      const y = 48 + ((i * 13) % 8);
      sprite(g, x, y, ['ab', 'bc'], { a: ['cavesand', 1], b: ['cavesand', 3], c: ['caverock', 5] });
    }
    for (let i = 0; i < 8; i++) rod(g, 6 + i * 8, 64, 5 + i * 8, 71, 2, 'weed', [3, 4]);
    // Great stalk eyes, one scarred.
    for (const [x, tilt] of [
      [25, -2],
      [46, 2],
    ] as const) {
      rod(g, x, 50, x + tilt * 2, 20, 5, 'crab', [2, 3, 4]);
      dome(g, x + tilt * 2, 17, 6, 6, 'eye', 4, 0.5);
      put(g, x + tilt * 2 - 2, 14, cell('eye', 0));
      put(g, x + tilt * 2 - 1, 14, cell('eye', 1));
    }
    rod(g, 48, 10, 54, 20, 1, 'cream', [2]);
    // Mouthparts working.
    paint(g, 28, 60, 16, 5, (x, y) =>
      y === 60 ? cell('crab', 4) : (x + y) % 3 === 0 ? cell('crab', 2) : cell('shade', 3),
    );
  },
};

const PARROT: FaceDef = {
  disc: 'blue',
  draw(g) {
    // Side-on: the green wing at the shoulder, the red head, the white face patch, a great hooked beak.
    mass(g, 22, 64, 22, 12, 'feather', { base: 2.8, tex: 'feather' });
    for (let i = 0; i < 4; i++) rod(g, 6 + i * 6, 64, 2 + i * 6, 72, 3, 'blue', [2, 3, 4]);
    mass(g, 30, 50, 15, 14, 'crimson', { base: 2.6, k: 2, tex: 'feather' });
    mass(g, 33, 32, 17, 16, 'crimson', { base: 2.2, k: 2.2, tex: 'feather', k2: 2 });
    mass(g, 42, 32, 8, 8, 'cream', { base: 1.3, k: 1.2 });
    for (let i = 0; i < 4; i++) rod(g, 37 + i * 3, 27, 38 + i * 3, 38, 1, 'cream', [3]);
    paint(g, 40, 28, 6, 6, (x, y) => {
      const d = Math.hypot(x - 42.5, y - 30.5);
      return d < 1.5 ? cell('eye', 4) : d < 2.8 ? cell('gold', 2) : 0;
    });
    put(g, 42, 29, cell('eye', 0));
    // The upper mandible: a great hook, pale and lit; the lower one dark, open.
    mass(g, 54, 33, 8, 7, 'cream', { base: 1.8, k: 2 });
    rod(g, 58, 36, 61, 46, 4, 'cream', [1, 2, 3]);
    put(g, 61, 47, cell('tar', 3));
    put(g, 60, 47, cell('tar', 4));
    mass(g, 52, 47, 6, 4, 'tar', { base: 2.6, k: 2 });
    paint(g, 50, 42, 8, 3, (_x, y) => cell(y === 42 ? 'shade' : 'crimson', 4));
  },
};

const BRINEBEARD: FaceDef = {
  disc: 'midnight',
  discStep: 6,
  draw(g) {
    const h: Head = { cx: 35, top: 15, w: 18, jaw: 12, chin: 52 };
    shoulders(g, 'midnight', { top: 54, neck: 12, slope: 3, base: 2.4 });
    // Lapels and braid.
    for (let y = 56; y < 72; y++) {
      put(g, 30 - (y - 56), y, cell('bronze', 2));
      put(g, 44 + (y - 56), y, cell('bronze', 3));
    }
    face(g, h, 'skin', {
      eyes: 'narrow',
      brow: 'heavy',
      browMat: 'hairgrey',
      nose: 'bulb',
      mouth: 'set',
      ruddy: 'madder',
      ring: 'gold',
    });
    // The beard of brine: grey-green strands to the bottom of the frame, a shell, a starfish.
    beard(g, h, 'hairgrey', { length: 22, width: 1.25, moustache: true });
    for (let i = 0; i < 7; i++)
      rod(g, 22 + i * 5, 50 + (i % 2) * 3, 23 + i * 5, 66 + (i % 3) * 2, 1, 'weed', [3]);
    sprite(g, 30, 60, ['.ab', 'abc'], { a: ['shell', 1], b: ['shell', 2], c: ['shell', 4] });
    sprite(g, 42, 56, ['..a..', 'aabaa', '.bcb.', '.b.b.'], {
      a: ['crab', 1],
      b: ['crab', 2],
      c: ['crab', 3],
    });
    tricorn(g, h, 'felt', 'bronze', true, 1.2);
    // The purple plume.
    rod(g, 14, 12, 4, 2, 4, 'plum', [1, 2, 4]);
  },
};

/** Every face, by the game's id. */
const FACES2: Readonly<Record<string, FaceDef>> = {
  smith: SMITH,
  trader: TRADER,
  pirate: PIRATE,
  alewife: ALEWIFE,
  market: MARKET,
  docker: DOCKER,
  elder: ELDER,
  dock_rat: RAT,
  sand_crab: SAND_CRAB,
  thieving_gull: GULL,
  bramble_boar: BOAR,
  footpad: FOOTPAD,
  grey_wolf: WOLF,
  smuggler: SMUGGLER,
  marsh_troll: TROLL,
  goblin_poacher: GOBLIN,
  bramble_wyrm: WYRM,
  deckhand: DECKHAND,
  powder_monkey: MONKEY,
  giant_crab: GIANT_CRAB,
  ships_parrot: PARROT,
  brinebeard: BRINEBEARD,
};

export const PORTRAIT2_IDS: readonly string[] = Object.keys(FACES2);

/** A bust on its disc: the bust outlined in its own darkest steps, cut by the frame's bottom. */
export function bustPicture(discMat: Mat, step: number, draw: Painter, withDisc = true): Picture2 {
  const g = tgrid(BUST, BUST);
  if (withDisc) disc(g, discMat, step);
  const b = tgrid(BUST, BUST);
  draw(b);
  stamp(g, outlineIn(b), 0, 0);
  return { grid: g, glows: [] };
}

/** A face's bust alone, outlined, without its disc (for checking it against the safe box). */
export function portraitBust2(id: string): TGrid | null {
  if (!Object.hasOwn(FACES2, id)) return null;
  const b = tgrid(BUST, BUST);
  FACES2[id]!.draw(b);
  return outlineIn(b);
}

const made = new Map<string, Picture2>();

/** A face as a picture, or null for an id with none; kept once drawn. */
export function portraitPicture2(id: string): Picture2 | null {
  if (!Object.hasOwn(FACES2, id)) return null;
  let pic = made.get(id);
  if (!pic) {
    const def = FACES2[id]!;
    pic = bustPicture(def.disc, def.discStep ?? 5, def.draw);
    made.set(id, pic);
  }
  return pic;
}

/* ------------------------------------------------------------- the hero */

/** What the hero wears on the head, by the figures' gear id, as a portrait draws it. */
const HERO_HATS: Readonly<Record<string, (g: TGrid, h: Head) => void>> = {
  linen_hood: (g, h) => hood(g, h, 'linen'),
  leather_cap: (g, h) => {
    knitCap(g, h, 'tan');
    for (const side of [-1, 1])
      paint(g, side < 0 ? h.cx - h.w - 2 : h.cx + h.w - 1, eyesY(h) - 4, 4, 9, (_x, y) =>
        cell('tan', y < eyesY(h) ? 3 : 4),
      );
  },
  bronze_cap: (g, h) => {
    paint(g, h.cx - h.w - 2, h.top - 3, h.w * 2 + 5, eyesY(h) - h.top - 4, (x, y) => {
      const half = headHalf(h, Math.max(h.top + 1, y + 2)) + 2;
      const lx = x + 0.5 - h.cx;
      if (Math.abs(lx) > half) return 0;
      if (y >= eyesY(h) - 9) return cell('hide', (x % 4 === 0 ? 1 : 3) + (lx > 6 ? 1 : 0));
      if (Math.abs(lx + 1) < 1) return cell('bronze', 0);
      return cell('bronze', lim(2.4 - (litBy(lx / half, (y - h.top) / 10) - 0.3) * 2.2, 1, 5));
    });
  },
  iron_nasal_helm: (g, h) => {
    const fx = faceX(h);
    paint(g, h.cx - h.w - 2, h.top - 9, h.w * 2 + 5, eyesY(h) - h.top + 4, (x, y) => {
      const lx = x + 0.5 - h.cx;
      const cone = y >= h.top - 9 + Math.abs(lx) * 0.7 - 6 && y < eyesY(h) - 6;
      const half = headHalf(h, Math.max(h.top + 1, y + 2)) + 2;
      const nasal = Math.abs(x - fx) < 1.5 && y >= eyesY(h) - 6 && y < eyesY(h) + 6;
      if (nasal) return cell('iron', x < fx ? 1 : 3);
      if (!cone || Math.abs(lx) > half) return 0;
      if (y >= eyesY(h) - 9) return cell('iron', (x % 5 === 0 ? 0 : 2) + (lx > 6 ? 1 : 0));
      if (Math.abs(lx + 1) < 1) return cell('iron', 0);
      return cell('iron', lim(2.4 - (litBy(lx / half, (y - h.top) / 10) - 0.3) * 2.2, 1, 5));
    });
  },
  feathered_hat: (g, h) => {
    paint(g, h.cx - 26, h.top - 6, 54, 14, (x, y) => {
      const lx = x + 0.5 - h.cx - 1;
      const crown = Math.abs(lx) < 13 && y < h.top + 6 && y >= h.top - 6 + Math.abs(lx) * 0.15;
      const brim = y >= h.top + 3 && y <= h.top + 6 && Math.abs(lx) < 26 - (h.top + 6 - y);
      if (!crown && !brim) return 0;
      if (crown && y >= h.top + 1 && y <= h.top + 2) return cell('crimson', 2);
      return cell('felt', lim(2.2 + (lx > 4 ? 1 : 0) + (brim ? 0.6 : 0), 1, 5));
    });
    rod(g, h.cx - 8, h.top + 1, h.cx - 22, h.top - 10, 3, 'cream', [0, 1, 3]);
  },
  tricorn: (g, h) => tricorn(g, h, 'felt', 'bronze'),
  velvet_cap: (g, h) => {
    paint(g, h.cx - h.w - 2, h.top - 5, h.w * 2 + 8, eyesY(h) - h.top - 2, (x, y) => {
      const lx = x + 0.5 - h.cx - 2;
      const half = headHalf(h, Math.max(h.top + 1, y + 3)) + 3 + (y < h.top + 2 ? 2 : 0);
      if (Math.abs(lx) > half || y > eyesY(h) - 8) return 0;
      if (y >= eyesY(h) - 10) return cell('plum', lx > 6 ? 4 : 3);
      return cell('plum', lim(2.2 - (litBy(lx / half, (y - h.top) / 9) - 0.3) * 2.4, 1, 5));
    });
    dome(g, h.cx + 9, h.top + 3, 2, 2, 'gold', 1.4, 2);
  },
};

/** What the hero wears on the body, by gear id: the material showing at the shoulders. */
const HERO_BODY: Readonly<Record<string, (g: TGrid) => void>> = {
  linen_tunic: (g) => shoulders(g, 'linen'),
  leather_jerkin: (g) => {
    shoulders(g, 'tan');
    for (let y = 58; y < 72; y += 3) put(g, 36, y, cell('linen', 1));
  },
  bronze_jerkin: (g) => {
    shoulders(g, 'hide');
    dome(g, 36, 66, 5, 5, 'bronze', 1.8, 2);
  },
  iron_mail: (g) => {
    shoulders(g, 'iron');
    paint(g, 0, 56, BUST, 16, (x, y) =>
      g.d[y * BUST + x] && (x + (y % 2) * 1) % 2 === 0 ? cell('iron', 4) : 0,
    );
  },
  captains_coat: (g) => {
    shoulders(g, 'midnight');
    for (let y = 58; y < 72; y++) {
      put(g, 32 - (y - 58) * 0.6, y, cell('bronze', 2));
      put(g, 40 + (y - 58) * 0.6, y, cell('bronze', 3));
    }
  },
  knight_plate: (g) => {
    shoulders(g, 'plate', { base: 2.2 });
    dome(g, 14, 62, 9, 5, 'plate', 1.8, 2.4);
    dome(g, 58, 62, 9, 5, 'plate', 2.6, 2.4);
  },
};

/** The hero's portrait parts: skin, hair colour and style, head gear and body gear ids (the figures' gear ids). */
export interface HeroBust {
  readonly skin: Mat;
  readonly hair: Mat;
  readonly style: 'short' | 'long' | 'braid' | 'shaggy' | 'bald';
  readonly head: string | null;
  readonly body: string | null;
  readonly neck: string | null;
}

/** The hero's bust: the look's skin and hair, the hairstyle under any head gear, the gear worn. */
export function heroBustPicture(o: HeroBust, withDisc = true): Picture2 {
  // Brows take the hair's colour at the steps that stand clear of the skin, as the figures' do.
  const browBy = browShift(o.skin as TownMat, o.hair as TownMat);
  return bustPicture(
    'teal',
    6,
    (g) => {
      const h = HEAD0;
      (HERO_BODY[o.body ?? ''] ?? HERO_BODY.linen_tunic!)(g);
      if (o.style === 'long' || o.style === 'braid') {
        if (
          !o.head ||
          o.head === 'iron_nasal_helm' ||
          o.head === 'bronze_cap' ||
          o.head === 'tricorn' ||
          o.head === 'feathered_hat' ||
          o.head === 'velvet_cap'
        )
          strands(g, o.hair, (x, y) => y > 30 && y < 62 && x > 15 && x < 56 && (x < 21 || x > 50), {
            x0: 14,
            y0: 30,
            w: 44,
            h: 33,
            cx: 20,
            cy: 34,
            lean: 0,
          });
      }
      neck(g, h, o.skin, 8);
      face(g, h, o.skin, {
        brow: 'level',
        browMat: o.hair,
        browShift: browBy,
        mouth: 'set',
        nose: 'straight',
      });
      if (o.neck === 'shell_necklace' || o.neck === 'hunters_charm' || o.neck === 'trollstone') {
        for (let x = 29; x <= 45; x++)
          put(g, x, 58 + Math.round(((x - 37) / 8) ** 2 * 3), cell('leather', 4));
        dome(
          g,
          37,
          62,
          2.2,
          2.4,
          o.neck === 'shell_necklace' ? 'shell' : o.neck === 'trollstone' ? 'stone' : 'cream',
          1.6,
          2,
        );
      }
      if (
        o.style !== 'bald' &&
        (!o.head || o.head === 'feathered_hat' || o.head === 'tricorn' || o.head === 'velvet_cap')
      )
        shortHair(g, h, o.hair, o.style === 'long');
      if (o.style === 'shaggy' && !o.head)
        for (let i = 0; i < 6; i++) rod(g, 22 + i * 5, 12, 20 + i * 5, 22, 2, o.hair, [2, 3]);
      if (o.style === 'braid')
        for (let i = 0; i < 5; i++) dome(g, 20 - i * 0.3, 46 + i * 4, 2.8, 2.2, o.hair, 2.4, 2);
      if (o.style === 'bald' && !o.head) baldShine(g, h, o.skin);
      if (o.head) HERO_HATS[o.head]?.(g, h);
    },
    withDisc,
  );
}

void shade;
void ear;
void eyes;
void mouth;
void nose;
void skull;

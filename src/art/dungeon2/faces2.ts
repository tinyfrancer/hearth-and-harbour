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
import { hash, put, stamp, tgrid, type Picture2, type TGrid } from '../town2/cells';
import { cell, matOf as matOf2 } from './cave';
import type { Mat2 as Mat } from './cave';
import { outlineIn } from '../figure2/engine';
import { browShift } from '../figure2/look';
import type { Mat as TownMat } from '../town2/ramps';
import { dome, furTex, lim, litBy, paint, poly, rod, seam, shaped, sprite } from './kit';
import { mass, shade } from './beasts';
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
    // His open indigo vest over a bare chest, the red kerchief knotted at his throat.
    shoulders(g, 'indigo', { neck: 7, slope: 2 });
    paint(g, 28, 58, 17, 14, (x, y) =>
      Math.abs(x + 0.5 - 36) < 3 + (y - 58) * 0.35 ? cell('skin', x < 35 ? 1 : 2) : 0,
    );
    neck(g, H, 'skin', 7);
    paint(g, 25, 53, 24, 7, (x, y) => {
      const lx = x + 0.5 - 37;
      if (Math.abs(lx) > 11 - (y - 53) * 0.8) return 0;
      return cell('crimson', lim(2 + (lx > 4 ? 1 : 0) + (y > 57 ? 1 : 0), 1, 5));
    });
    sprite(g, 45, 55, ['ab.', 'bbc', '.cc', '..c'], {
      a: ['crimson', 1],
      b: ['crimson', 2],
      c: ['crimson', 4],
    });
    face(g, { ...H, w: 17, jaw: 10 }, 'skin', {
      eyes: 'wide',
      brow: 'raised',
      browMat: 'hairblack',
      nose: 'snub',
      mouth: 'grin',
    });
    // Stubble: a shadow of it along the jaw and over the lip, sparse, so the grin shows.
    const MH = { ...H, w: 17, jaw: 10 };
    const ey = eyesY(MH);
    for (let y = ey + 6; y <= MH.chin; y++)
      for (let x = MH.cx - MH.w; x <= MH.cx + MH.w; x++) {
        const c = g.d[y * 72 + x];
        if (!c || matOf2(c) !== 'skin') continue;
        const mouthBand = y >= ey + 10 && y <= ey + 14 && Math.abs(x - faceX(MH) + 0.5) < 6;
        if (!mouthBand && hash(x, y, 91) < 0.22) g.d[y * 72 + x] = cell('hairblack', 2);
      }
    baldShine(g, H, 'skin');
    // The keg held up beside his head, the skull painted on, its fuse lit.
    paint(g, 51, 30, 20, 26, (x, y) => {
      const nx = ((x - 51 + 0.5) / 20) * 2 - 1;
      const ny = ((y - 30 + 0.5) / 26) * 2 - 1;
      if (Math.abs(nx) > 0.95 && Math.abs(ny) > 0.8) return 0;
      if (y === 34 || y === 51) return cell('iron', lim(2.5 + nx, 1, 5));
      return cell('wood', lim(2.4 + nx * 1.5 + ((x - 51) % 4 === 3 ? 1 : 0), 1, 5));
    });
    sprite(g, 57, 39, ['.ccc.', 'ccccc', 'cKcKc', 'ccKcc', '.c.c.'], {
      c: ['sail', 0],
      K: ['wood', 6],
    });
    sprite(g, 62, 22, ['..FE', '.fF.', '.f..', 'f...', 'f...', 'f...', 'f...', 'f...'], {
      f: ['tar', 2],
      F: ['fire', 1],
      E: ['fire', 3],
    });
    // His fist under the keg.
    sprite(g, 50, 52, ['.stt.', 'sttuu', 'tuuvv', '.vvw.'], {
      s: ['skin', 1],
      t: ['skin', 2],
      u: ['skin', 3],
      v: ['skin', 4],
      w: ['skin', 5],
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
  disc: 'slate',
  draw(g) {
    // The body behind, hunched.
    shaped(
      g,
      poly([
        [2, 72],
        [6, 54],
        [20, 46],
        [50, 46],
        [66, 54],
        [70, 72],
      ]),
      'fur',
      {
        base: 2.8,
        contrast: 1.6,
        radius: 8,
        tex: furTex(41, -0.5, 0.22),
      },
    );
    // Round ears, pink inside.
    for (const [cx, cy, s] of [
      [17, 18, 2.2],
      [51, 16, 2.8],
    ] as const) {
      const ear = (x: number, y: number) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < 10;
      shaped(g, ear, 'fur', { base: s, contrast: 1.6, radius: 3 });
      shaped(g, (x, y) => Math.hypot(x + 0.5 - cx - 1, y + 0.5 - cy - 1) < 6.5, 'shell', {
        base: 2.8,
        contrast: 1.4,
        radius: 3,
      });
    }
    // The head: wide at the cheeks, coming to a point at the nose.
    const head = poly([
      [14, 34],
      [20, 24],
      [30, 20],
      [42, 20],
      [52, 24],
      [58, 34],
      [54, 44],
      [44, 52],
      [38, 60],
      [34, 60],
      [28, 52],
      [18, 44],
    ]);
    shaped(g, head, 'fur', {
      base: 2.1,
      contrast: 1.9,
      radius: 9,
      tex: (x, y, t) => furTex(43, 0.3, 0.16)(x, y, t - (y > 46 ? 0.6 : 0)),
    });
    seam(g, head, 1);
    // Beady black eyes with a glint, close together, a sly look.
    for (const ex of [26, 41])
      sprite(g, ex, 32, ['.aaa.', 'abcca', 'accca', '.aaa.'], {
        a: ['fur', 5],
        b: ['eye', 0],
        c: ['eye', 4],
      });
    // A pink nose, whiskers out either side.
    sprite(g, 33, 55, ['.ab.', 'abbc', '.cc.'], {
      a: ['shell', 2],
      b: ['shell', 3],
      c: ['shell', 4],
    });
    for (const [x0, y0, dx, dy] of [
      [30, 55, -14, -3],
      [30, 57, -15, 1],
      [40, 55, 14, -3],
      [40, 57, 15, 1],
    ] as const)
      for (let i = 0; i <= 12; i++)
        put(
          g,
          x0 + Math.round((dx * i) / 12),
          y0 + Math.round((dy * i) / 12),
          cell('cream', i < 6 ? 1 : 2),
        );
    // Buck teeth under the nose.
    sprite(g, 34, 59, ['abba', 'abba'], { a: ['cream', 2], b: ['cream', 0] });
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
    // Grey back and a white breast below the head.
    shaped(
      g,
      poly([
        [0, 72],
        [2, 58],
        [14, 50],
        [30, 48],
        [44, 54],
        [50, 72],
      ]),
      'smoke',
      {
        base: 1.8,
        contrast: 1.6,
        radius: 8,
      },
    );
    shaped(
      g,
      poly([
        [0, 60],
        [6, 52],
        [18, 50],
        [26, 56],
        [24, 72],
        [0, 72],
      ]),
      'stone',
      {
        base: 2.4,
        contrast: 1.6,
        radius: 5,
        tex: (x, y, t) => ((y + Math.floor(x / 4)) % 4 === 0 ? t + 1 : t),
      },
    );
    // The head, side on: a flat brow, a round white crown, a thick neck.
    const head = poly([
      [14, 28],
      [18, 18],
      [26, 12],
      [36, 11],
      [44, 15],
      [48, 22],
      [50, 30],
      [46, 42],
      [40, 52],
      [24, 54],
      [16, 44],
    ]);
    shaped(g, head, 'smoke', { base: 1.3, contrast: 1.8, radius: 9, lo: 0 });
    seam(g, head, 1);
    // The beak: long, yellow, hooked at the tip, a red spot, a stolen chip crosswise in it.
    const beak = poly([
      [45, 26],
      [64, 27],
      [69, 30],
      [67, 33],
      [62, 32],
      [46, 34],
    ]);
    shaped(g, beak, 'gold', { base: 1.6, contrast: 1.6, radius: 2 });
    for (let x = 47; x <= 64; x++) put(g, x, 31, cell('gold', 4));
    sprite(g, 60, 32, ['ab', 'bb'], { a: ['crimson', 1], b: ['crimson', 3] });
    // The chip.
    const chip = poly([
      [49, 20],
      [53, 19],
      [60, 40],
      [56, 41],
    ]);
    shaped(g, chip, 'cream', { base: 0.8, contrast: 1.4, radius: 1, lo: 0 });
    seam(g, chip, 2);
    // A fierce eye: a pale ring, a black pupil, a brow drawn down hard.
    sprite(
      g,
      31,
      17,
      ['aa......', '.aaaaa..', '...aaaaa', '..bbbbb.', '.bccddb.', '.bccddb.', '..bbbb..'],
      {
        a: ['stone', 5],
        b: ['crimson', 3],
        c: ['gold', 1],
        d: ['eye', 4],
      },
    );
  },
};

const BOAR: FaceDef = {
  disc: 'pine',
  draw(g) {
    // Shoulders, a heap of bristle.
    shaped(
      g,
      poly([
        [0, 72],
        [4, 54],
        [18, 48],
        [54, 48],
        [68, 54],
        [72, 72],
      ]),
      'umber',
      {
        base: 2.8,
        contrast: 1.6,
        radius: 8,
        tex: furTex(31, 0.6, 0.26),
      },
    );
    // Ears out to the sides, pointed, dark inside.
    const earL = poly([
      [4, 12],
      [21, 18],
      [14, 28],
    ]);
    const earR = poly([
      [51, 18],
      [68, 10],
      [59, 27],
    ]);
    shaped(g, earL, 'umber', { base: 2.2, contrast: 1.8, radius: 2 });
    shaped(g, earR, 'umber', { base: 2.8, contrast: 1.8, radius: 2 });
    shaped(
      g,
      poly([
        [8, 14],
        [18, 19],
        [14, 24],
      ]),
      'shell',
      { base: 4.5, contrast: 0.5, radius: 1 },
    );
    shaped(
      g,
      poly([
        [55, 19],
        [64, 13],
        [59, 23],
      ]),
      'shell',
      { base: 4.5, contrast: 0.5, radius: 1 },
    );
    // The head, a great wedge coming at you.
    const head = poly([
      [12, 30],
      [18, 18],
      [28, 12],
      [44, 12],
      [54, 18],
      [60, 30],
      [58, 42],
      [50, 52],
      [36, 58],
      [22, 52],
      [14, 42],
    ]);
    shaped(g, head, 'umber', {
      base: 2.2,
      contrast: 2,
      radius: 9,
      tex: (x, y, t) => {
        const jowl = (x < 22 || x > 48) && y > 34;
        return furTex(33, 0.25, 0.2)(x, y, t - (jowl ? 0.9 : 0));
      },
    });
    seam(g, head, 1);
    // A crest of black bristles over the crown, brambles caught in it.
    for (let x = 20; x <= 52; x++) {
      const top = 13 - Math.round(3 * Math.sin(((x - 20) / 32) * Math.PI));
      const tall = 2 + Math.round(hash(x, 1, 35) * 3) + (x % 3 === 0 ? 1 : 0);
      for (let j = 0; j < tall; j++)
        put(g, x, top - j, cell('tar', j === tall - 1 ? 4 : 2 + (j % 2)));
    }
    for (const [x, y] of [
      [22, 6],
      [35, 3],
      [47, 6],
    ] as const)
      sprite(g, x, y, ['.ab.c', 'aaba.', '.ad..', 'a....'], {
        a: ['leaf', 3],
        b: ['leaf', 5],
        c: ['crimson', 2],
        d: ['crimson', 4],
      });
    // Small mean eyes, red-rimmed, under brows slanting in.
    sprite(g, 19, 26, ['aaa.....', '.aaaa...', '..bcda..', '...ee...'], {
      a: ['tar', 4],
      b: ['crimson', 2],
      c: ['gold', 1],
      d: ['eye', 4],
      e: ['umber', 4],
    });
    sprite(g, 45, 26, ['.....aaa', '...aaaa.', '..adcb..', '...ee...'], {
      a: ['tar', 4],
      b: ['crimson', 2],
      c: ['gold', 1],
      d: ['eye', 4],
      e: ['umber', 4],
    });
    // Tusks, curling up beside the snout.
    sprite(g, 17, 38, ['a....', 'ab...', 'ab...', '.ab..', '.abb.', '..bbc', '...cc'], {
      a: ['cream', 0],
      b: ['cream', 1],
      c: ['cream', 3],
    });
    sprite(g, 50, 38, ['....a', '...ba', '...ba', '..ba.', '.bba.', 'cbb..', 'cc...'], {
      a: ['cream', 0],
      b: ['cream', 2],
      c: ['cream', 3],
    });
    // The snout: a pink disc, wet, two nostrils, the mouth's line under it.
    const snout = (x: number, y: number) => Math.hypot((x + 0.5 - 36) / 11, (y + 0.5 - 45) / 8) < 1;
    shaped(g, snout, 'shell', { base: 2.8, contrast: 1.6, radius: 4 });
    seam(g, snout, 2);
    for (const nx of [30, 39])
      sprite(g, nx, 43, ['.aa.', 'abba', '.aa.'], { a: ['shade', 2], b: ['shade', 4] });
    for (let x = 27; x <= 45; x++) put(g, x, 55 + Math.round(Math.abs(x - 36) / 6), cell('tar', 4));
  },
};

const WOLF: FaceDef = {
  disc: 'midnight',
  draw(g) {
    // The ruff, thick, over the shoulders.
    shaped(
      g,
      poly([
        [2, 72],
        [6, 56],
        [16, 48],
        [36, 52],
        [58, 48],
        [68, 58],
        [72, 72],
      ]),
      'fur',
      {
        base: 2.4,
        contrast: 1.6,
        radius: 8,
        tex: furTex(21, -0.4, 0.22),
      },
    );
    // Ears, tall and pricked, dark inside.
    const earL = poly([
      [15, 26],
      [17, 4],
      [32, 18],
    ]);
    const earR = poly([
      [42, 17],
      [55, 3],
      [59, 26],
    ]);
    shaped(g, earL, 'fur', { base: 2.2, contrast: 1.8, radius: 2 });
    shaped(g, earR, 'fur', { base: 2.6, contrast: 1.8, radius: 2 });
    shaped(
      g,
      poly([
        [19, 22],
        [19, 10],
        [28, 19],
      ]),
      'shell',
      { base: 4, contrast: 0.6, radius: 1 },
    );
    shaped(
      g,
      poly([
        [46, 18],
        [54, 9],
        [55, 22],
      ]),
      'shell',
      { base: 4.5, contrast: 0.6, radius: 1 },
    );
    // The head: a broad skull narrowing to a long muzzle, the cheeks' ruff flaring out.
    const head = poly([
      [13, 34],
      [18, 22],
      [28, 15],
      [46, 15],
      [56, 22],
      [61, 34],
      [58, 42],
      [50, 46],
      [46, 56],
      [38, 62],
      [30, 56],
      [26, 46],
      [17, 42],
    ]);
    shaped(g, head, 'fur', {
      base: 2.0,
      contrast: 1.8,
      radius: 9,
      tex: (x, y, t) => {
        // The mask: the brow and between the eyes dark, the muzzle and cheeks pale.
        const muzzle = x > 28 && x < 46 && y > 38;
        const cheek = (x < 25 || x > 50) && y > 32;
        const mask = x > 33 && x < 41 && y > 18 && y < 34;
        return furTex(23, 0.2, 0.16)(x, y, t + (mask ? 1.4 : 0) - (muzzle || cheek ? 1.2 : 0));
      },
    });
    seam(g, head, 1);
    // Eyes, pale gold and slanted, under a lowered brow.
    sprite(g, 22, 29, ['aaaa....', '.abccd..', '..aeed..', '...aa...'], {
      a: ['fur', 5],
      b: ['gold', 0],
      c: ['gold', 1],
      d: ['eye', 4],
      e: ['gold', 2],
    });
    sprite(g, 43, 29, ['....aaaa', '..dccba.', '..deeba.', '...aa...'], {
      a: ['fur', 5],
      b: ['gold', 1],
      c: ['gold', 1],
      d: ['eye', 4],
      e: ['gold', 2],
    });
    // The nose, black and wet.
    sprite(g, 32, 46, ['.abbbbc.', 'abbddbbc', 'bbdbbdbc', '.cccccc.'], {
      a: ['tar', 1],
      b: ['tar', 3],
      c: ['tar', 5],
      d: ['tar', 6],
    });
    // The lip drawn back: long teeth, a dark gum.
    sprite(
      g,
      29,
      53,
      ['abbbbbbbbbbbbba', 'acdcdcccdcccdca', '.c.c.......c.c.', '..aaaaaaaaaaa..'],
      {
        a: ['shade', 3],
        b: ['crimson', 4],
        c: ['cream', 0],
        d: ['cream', 2],
      },
    );
  },
};

const TROLL: FaceDef = {
  disc: 'pine',
  draw(g) {
    // Shoulders like boulders, moss on them.
    shaped(
      g,
      poly([
        [0, 72],
        [0, 52],
        [14, 44],
        [58, 44],
        [72, 52],
        [72, 72],
      ]),
      'troll',
      {
        base: 2.8,
        contrast: 1.6,
        radius: 9,
      },
    );
    for (const [x, y, r] of [
      [10, 52, 4],
      [62, 50, 3.5],
      [18, 47, 2.5],
    ] as const)
      shaped(g, (xx, yy) => Math.hypot(xx - x, (yy - y) * 1.3) < r, 'moss', {
        base: 2.4,
        contrast: 1.8,
        radius: 2,
      });
    // Ears drooping at the sides.
    shaped(
      g,
      poly([
        [8, 22],
        [16, 24],
        [16, 38],
        [6, 34],
      ]),
      'troll',
      { base: 2.8, contrast: 1.6, radius: 2 },
    );
    shaped(
      g,
      poly([
        [56, 24],
        [64, 22],
        [66, 34],
        [56, 38],
      ]),
      'troll',
      { base: 3.2, contrast: 1.6, radius: 2 },
    );
    // The head, broad and low, sunk on the shoulders.
    const head = poly([
      [12, 26],
      [18, 12],
      [30, 7],
      [44, 7],
      [56, 12],
      [60, 26],
      [58, 44],
      [36, 50],
      [14, 44],
    ]);
    shaped(g, head, 'troll', {
      base: 2.1,
      contrast: 2,
      radius: 10,
      tex: (x, y, t) => {
        const pit = hash(Math.floor(x / 2), Math.floor(y / 2), 77);
        return t + (pit < 0.07 ? 1 : pit > 0.96 ? -1 : 0);
      },
    });
    seam(g, head, 1);
    // A brow like a ledge.
    shaped(
      g,
      poly([
        [14, 22],
        [24, 17],
        [36, 20],
        [48, 17],
        [58, 22],
        [58, 26],
        [14, 26],
      ]),
      'troll',
      {
        base: 1.6,
        contrast: 1.6,
        radius: 2,
      },
    );
    for (let x = 15; x <= 57; x++) put(g, x, 26, cell('troll', 5));
    // Small yellow eyes deep under it.
    for (const ex of [22, 43])
      sprite(g, ex, 27, ['aaaaaaa', 'abccbda', '.aaaaa.'], {
        a: ['troll', 5],
        b: ['gold', 1],
        c: ['gold', 2],
        d: ['eye', 4],
      });
    // The nose: a great lump.
    const nose = (x: number, y: number) => Math.hypot((x + 0.5 - 36) / 6, (y + 0.5 - 34) / 5) < 1;
    shaped(g, nose, 'troll', { base: 1.7, contrast: 2, radius: 3 });
    seam(g, nose, 1);
    // The underbite, two tusks up over the lip.
    const jaw = poly([
      [16, 40],
      [56, 40],
      [58, 46],
      [50, 52],
      [22, 52],
      [14, 46],
    ]);
    shaped(g, jaw, 'troll', { base: 2.4, contrast: 1.8, radius: 3 });
    seam(g, jaw, 2);
    for (let x = 20; x <= 52; x++) put(g, x, 41, cell('shade', 4));
    for (const tx of [22, 47])
      sprite(g, tx, 34, ['.a.', 'aab', 'abb', 'abb', 'abc', 'bbc'], {
        a: ['cream', 0],
        b: ['cream', 2],
        c: ['cream', 3],
      });
    // Weed hanging from his crown like hair.
    for (let i = 0; i < 14; i++) {
      const x = 17 + i * 3;
      const n = 4 + ((i * 7) % 5);
      for (let j = 0; j < n; j++)
        put(g, x + (j > 3 ? (i % 2 ? 1 : -1) : 0), 5 + j + (i % 3), cell('weed', 2 + (j % 3)));
    }
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
    // Wings folded below: green, a blue edge, feathers in rows.
    shaped(
      g,
      poly([
        [4, 72],
        [6, 56],
        [18, 46],
        [34, 48],
        [46, 58],
        [50, 72],
      ]),
      'grass',
      {
        base: 2.4,
        contrast: 1.6,
        radius: 7,
        tex: (x, y, t) => ((y + Math.floor(x / 5)) % 4 === 0 ? t + 1 : t),
      },
    );
    for (let y = 60; y < 72; y++)
      for (let x = 4; x < 10; x++) if (g.d[y * 72 + x]) put(g, x, y, cell('blue', 2 + (y % 2)));
    // The head, side on: red, round, a bare white face.
    const head = poly([
      [12, 30],
      [16, 18],
      [26, 10],
      [38, 9],
      [46, 14],
      [50, 22],
      [50, 34],
      [44, 46],
      [32, 52],
      [20, 50],
      [13, 42],
    ]);
    shaped(g, head, 'crimson', {
      base: 1.8,
      contrast: 1.8,
      radius: 9,
      tex: (x, y, t) => ((x + y * 2) % 6 === 0 && y > 20 ? t + 1 : t),
    });
    seam(g, head, 1);
    // The bare face round the eye, white with fine lines.
    const face = (x: number, y: number) => Math.hypot((x + 0.5 - 40) / 8, (y + 0.5 - 26) / 7) < 1;
    shaped(g, face, 'sail', { base: 1.2, contrast: 1, radius: 3, lo: 0 });
    for (const [x, y] of [
      [35, 30],
      [37, 31],
      [39, 32],
      [36, 23],
      [34, 26],
    ] as const)
      put(g, x, y, cell('stone', 3));
    // A yellow eye with a black pupil.
    sprite(g, 38, 22, ['.aa.', 'abca', 'acca', '.aa.'], {
      a: ['gold', 2],
      b: ['eye', 0],
      c: ['eye', 4],
    });
    // The great hooked beak, open in a squawk: pale upper hooked over a black lower.
    const upper = poly([
      [46, 18],
      [56, 18],
      [64, 24],
      [66, 32],
      [62, 38],
      [60, 32],
      [54, 28],
      [47, 30],
    ]);
    shaped(g, upper, 'sail', { base: 2.4, contrast: 1.6, radius: 3 });
    seam(g, upper, 1);
    const lower = poly([
      [47, 34],
      [55, 34],
      [59, 40],
      [54, 44],
      [48, 41],
    ]);
    shaped(g, lower, 'tar', { base: 3, contrast: 1.4, radius: 2 });
    sprite(g, 50, 31, ['aaaa', 'abba', '.aa.'], { a: ['shade', 4], b: ['crimson', 4] });
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

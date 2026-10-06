/**
 * The pieces portraits at the C scale are built from: a bust on 72 x 72,
 * about three times the figures' H2 head, drawn natively at that size (never
 * scaled up from a sprite). A head is a solid lit from the upper left and
 * turned a little toward the right as the figures are; its features (eyes,
 * brows, nose, mouth, ears) are placed by hand from small row drawings, one
 * set of shapes per expression; hair, beards, hats and clothes are shapes
 * shaded as solids, strands and cloth.
 */
import { cell, put, type TGrid } from '../town2/cells';
import type { Mat } from '../town2/ramps';
import { lim, litBy, paint, rod, sprite } from './kit';
import { softRound } from '../town2/texture';

export const BUST = 72;

/** Where a head sits and how it is shaped. Rows and columns on the 72 x 72 bust. */
export interface Head {
  readonly cx: number;
  /** The crown's top row. */
  readonly top: number;
  /** Half the skull's width. */
  readonly w: number;
  /** Half the jaw's width just above the chin. */
  readonly jaw: number;
  /** The chin's lowest row. */
  readonly chin: number;
}
export const HEAD0: Head = { cx: 35, top: 10, w: 16, jaw: 9, chin: 51 };

/** The face's centre line: a little right of the skull's, toward the way the face is turned. */
export const faceX = (h: Head): number => h.cx + 2;
/** The eyes' row. */
export const eyesY = (h: Head): number => h.top + 21;

/** Half the head's width at row `y`, 0 outside it. */
export function headHalf(h: Head, y: number): number {
  const cy = h.top + 19;
  if (y < h.top) return 0;
  if (y <= cy + 4) {
    const d = (y + 0.5 - cy) / 19.5;
    return h.w * Math.sqrt(Math.max(0, 1 - d * d));
  }
  // From the cheekbones down to the jaw, then rounding into the chin.
  const t = (y - cy - 4) / (h.chin - cy - 4);
  if (t > 1) return 0;
  const cheek = h.w * Math.sqrt(1 - (4.5 / 19.5) ** 2);
  const w = cheek + (h.jaw - cheek) * Math.min(1, t * 1.25);
  return t > 0.8 ? w * Math.sqrt(Math.max(0, 1 - ((t - 0.8) / 0.2) ** 2)) * 0.95 + 1 : w;
}

/** The neck, under the jaw, shaded under the chin. */
export function neck(g: TGrid, h: Head, skin: Mat, width = 8, to = 62): void {
  const fx = faceX(h);
  paint(g, fx - width - 1, h.chin - 8, width * 2 + 2, to - h.chin + 9, (x, y) => {
    const lx = x - (fx - 1);
    const half = width - (y < h.chin ? 0 : 0) + (y > to - 4 ? (y - to + 4) * 1.5 : 0);
    if (Math.abs(lx) > half) return 0;
    let t = 2.6 + (lx > 2 ? 1 : 0) + (lx < -width + 2 ? -0.6 : 0);
    if (y < h.chin + 4) t += 1;
    return cell(skin, lim(t, 1, 5));
  });
}

/** The head as a solid in its skin, the far side and under the cheekbones in shade. */
export function skull(g: TGrid, h: Head, skin: Mat): void {
  const fx = faceX(h);
  const ey = eyesY(h);
  paint(g, h.cx - h.w - 1, h.top, h.w * 2 + 4, h.chin - h.top + 1, (x, y) => {
    const half = headHalf(h, y);
    // The face turns right: the near side shows more.
    const c = h.cx + (y > ey - 6 ? 1 : 0);
    const lx = x + 0.5 - c;
    if (lx < -half - 0.5 || lx > half + (y > ey - 6 ? 0 : 0.5)) return 0;
    const nx = lx / Math.max(1, half);
    const ny = (y - (h.top + 22)) / 26;
    let t = 2.1 - (litBy(nx * 0.8, ny * 0.7) - 0.3) * 1.8;
    // Sockets, a little shaded; the cheek under the near eye lit; shadow under the cheekbone on the far side.
    if (Math.hypot((x - (fx - 7)) / 5, (y - ey) / 3.5) < 1) t += 0.5;
    if (Math.hypot((x - (fx + 7)) / 5, (y - ey) / 3.5) < 1) t += 0.6;
    if (Math.hypot((x - (fx - 8)) / 4, (y - ey - 7) / 3) < 1) t -= 0.5;
    if (x > fx + 8 && y > ey + 5 && y < ey + 12) t += 0.6;
    return cell(skin, Math.max(0, Math.min(5, softRound(t, x, y, 0.12))));
  });
}

export type EyeLook = 'open' | 'narrow' | 'glad' | 'wide' | 'shut';

const EYES: Readonly<Record<EyeLook, readonly string[]>> = {
  open: ['.KKKKK.', 'KWJPIWK', '.WIIIW.', '..vvv..'],
  narrow: ['.......', 'KKKKKKK', 'KWJPIWK', '.vvvvv.'],
  glad: ['.......', '.KKKKK.', 'KWJPIWK', '.v.v.v.'],
  wide: ['.KKKKK.', 'KWWJIWK', 'KWJPIWK', '.WWIWW.'],
  shut: ['.......', '.......', 'KKKKKKK', '.vvvvv.'],
};

export type BrowLook = 'level' | 'angry' | 'raised' | 'heavy' | 'worried';
/** The near brow; the far one is its mirror. Over an eye's seven columns, from two rows above it. */
const BROWS: Readonly<Record<BrowLook, readonly string[]>> = {
  level: ['.bbbbbb.', 'b......b'],
  angry: ['bb......', '.bBBbb..', '....bBB.'],
  raised: ['..bbbb..', '.b....b.', 'b......b'],
  heavy: ['BBBBBBBB', 'bBBBBBBb', '.b....b.'],
  worried: ['.....bb.', '..bbb..b', 'bb......'],
};

const mirrorRow = (r: string) => [...r].reverse().join('');

/** Eyes and brows, mirrored about the face's line, the far eye a pixel narrower for the turn. */
export function eyes(
  g: TGrid,
  h: Head,
  skin: Mat,
  o: { look?: EyeLook; brow?: BrowLook; browMat?: Mat; iris?: Mat; patch?: boolean } = {},
): void {
  const fx = faceX(h);
  const ey = eyesY(h);
  const pins = {
    K: ['eye', 4],
    W: ['eye', 1],
    J: [o.iris ?? 'eye', o.iris ? 1 : 2],
    I: [o.iris ?? 'eye', o.iris ? 3 : 3],
    P: ['eye', 4],
    v: [skin, 3],
    b: [o.browMat ?? 'hair', 3],
    B: [o.browMat ?? 'hair', 4],
  } as const;
  const rows = EYES[o.look ?? 'open'];
  const brow = BROWS[o.brow ?? 'level'];
  sprite(g, fx - 10, ey - 1, rows, pins);
  if (o.patch) {
    sprite(g, fx + 3, ey - 2, ['.ppppppp', 'pppppppp', 'pppppppp', 'pppppppP', '.pppppP.'], {
      p: ['felt', 3],
      P: ['felt', 5],
    });
    for (let i = 0; i < 12; i++) put(g, fx + 3 - i, ey - 3 - Math.round(i * 0.55), cell('felt', 4));
    for (let i = 0; i < 8; i++) put(g, fx + 11 + i, ey - 2 - Math.round(i * 0.6), cell('felt', 4));
  } else
    sprite(
      g,
      fx + 4,
      ey - 1,
      rows.map((r) => mirrorRow(r).slice(1)),
      pins,
    );
  const by =
    ey - 1 - brow.length - (o.look === 'narrow' || o.look === 'glad' || o.look === 'shut' ? -1 : 0);
  sprite(g, fx - 11, by, brow, pins);
  if (!o.patch)
    sprite(
      g,
      fx + 3,
      by,
      brow.map((r) => mirrorRow(r).slice(1)),
      pins,
    );
}

export type NoseLook = 'straight' | 'broad' | 'hook' | 'bulb' | 'snub';
const NOSES: Readonly<Record<NoseLook, readonly string[]>> = {
  straight: ['.so.', '.st.', '.st.', '.st.', 'sstu', 'stuu', 'uvvv'],
  broad: ['.so..', '.st..', '.stt.', 'sstu.', 'ssttu', 'stuuv', 'uvvvv'],
  hook: ['.so..', '.sst.', '.sstt', '.sstu', '.stuu', 'stuuv', 'uv.vv'],
  bulb: ['.so..', '.st..', 'osttu', 'sosttu', 'sstttu', 'tuuvv.'],
  snub: ['.s..', '.st.', 'sstu', 'stuu', 'uvv.'],
};

export function nose(g: TGrid, h: Head, skin: Mat, look: NoseLook = 'straight', ruddy?: Mat): void {
  const fx = faceX(h);
  const ey = eyesY(h);
  const m: Mat = ruddy ?? skin;
  sprite(g, fx - 2, ey + 1, NOSES[look], {
    o: [m, 0],
    s: [m, 1],
    t: [m, 2],
    u: [skin, 3],
    v: [skin, 4],
  });
}

export type MouthLook = 'set' | 'smile' | 'grin' | 'scowl' | 'open' | 'smirk' | 'roar';
const MOUTHS: Readonly<Record<MouthLook, readonly string[]>> = {
  set: ['.vvvvvv.', '..tttt..'],
  smile: ['v......v', '.vvvvvv.', '..tttt..'],
  grin: ['vvvvvvvv', 'vWWdWWWv', '.vvvvvv.', '..tttt..'],
  scowl: ['..vvvv..', '.v....v.', 'v......v'],
  open: ['.vvvvv.', 'vddddd.', '.vtttv.'],
  smirk: ['......vv', '.vvvvv..', '..ttt...'],
  roar: ['vvvvvvvv', 'vWdWWdWv', 'vddrrddv', 'vWdddWWv', '.vvvvvv.'],
};

export function mouth(g: TGrid, h: Head, skin: Mat, look: MouthLook = 'set', dy = 0): void {
  const fx = faceX(h);
  const ey = eyesY(h);
  sprite(g, fx - 4, ey + 11 + dy, MOUTHS[look], {
    v: [skin, 4],
    t: [skin, 1],
    W: ['eye', 1],
    d: ['shade', 3],
    r: ['crimson', 4],
  });
}

/** The near ear, out from the skull's side; a ring in it if asked. */
export function ear(g: TGrid, h: Head, skin: Mat, ring?: Mat): void {
  const ey = eyesY(h);
  const x = h.cx - h.w - 2;
  sprite(g, x, ey - 2, ['.st.', 'sttu', 'stvu', 'sttu', 'stu.', '.tu.'], {
    s: [skin, 1],
    t: [skin, 2],
    u: [skin, 3],
    v: [skin, 4],
  });
  if (ring) {
    put(g, x + 1, ey + 4, cell(ring, 1));
    put(g, x + 1, ey + 5, cell(ring, 3));
    put(g, x + 2, ey + 6, cell(ring, 2));
  }
}

/** A face whole: skull, ear, eyes and brows, nose, mouth. */
export function face(
  g: TGrid,
  h: Head,
  skin: Mat,
  o: {
    eyes?: EyeLook;
    brow?: BrowLook;
    browMat?: Mat;
    iris?: Mat;
    nose?: NoseLook;
    mouth?: MouthLook;
    ruddy?: Mat;
    ring?: Mat;
    patch?: boolean;
    noEar?: boolean;
  } = {},
): void {
  skull(g, h, skin);
  if (!o.noEar) ear(g, h, skin, o.ring);
  eyes(g, h, skin, {
    look: o.eyes,
    brow: o.brow,
    browMat: o.browMat,
    iris: o.iris,
    patch: o.patch,
  });
  nose(g, h, skin, o.nose, o.ruddy);
  mouth(g, h, skin, o.mouth);
}

/**
 * Shoulders and chest in cloth, cut by the bottom of the bust: lit on the
 * near side, a fold or two, darker away from the light.
 */
export function shoulders(
  g: TGrid,
  mat: Mat,
  o: { top?: number; neck?: number; slope?: number; cx?: number; base?: number } = {},
): void {
  const top = o.top ?? 56;
  const cx = o.cx ?? 36;
  const nk = o.neck ?? 9;
  const slope = o.slope ?? 2.3;
  paint(g, 0, top, BUST, BUST - top, (x, y) => {
    const ly = y - top;
    const half = Math.min(35, nk + ly * slope + (ly > 3 ? 6 : ly * 2));
    const lx = x + 0.5 - cx;
    if (Math.abs(lx) > half) return 0;
    const nx = lx / half;
    let t = (o.base ?? 2.6) - (litBy(nx * 0.9, ly < 4 ? -0.6 : -0.1) - 0.3) * 2;
    if (Math.abs(lx - half * 0.55) < 0.7 && ly > 6) t += 1;
    return cell(mat, lim(t, 1, 5));
  });
}

/** Hair as strands within a shape: lit on the near side and the crown, each strand a step either way. */
export function strands(
  g: TGrid,
  mat: Mat,
  inside: (x: number, y: number) => boolean,
  o: {
    x0: number;
    y0: number;
    w: number;
    h: number;
    cx: number;
    cy: number;
    lean?: number;
    base?: number;
  },
): void {
  paint(g, o.x0, o.y0, o.w, o.h, (x, y) => {
    if (!inside(x, y)) return 0;
    const nx = (x - o.cx) / (o.w / 2);
    const ny = (y - o.cy) / (o.h / 2);
    let t =
      (o.base ?? 2.6) -
      (litBy(Math.max(-1, Math.min(1, nx)) * 0.8, Math.max(-1, Math.min(1, ny)) * 0.6) - 0.3) * 2.2;
    const s = Math.floor((x + (y - o.y0) * (o.lean ?? 0.3)) / 2);
    if (s % 3 === 0) t += 0.8;
    else if (s % 3 === 1) t -= 0.5;
    return cell(mat, lim(t, 1, 5));
  });
}

/** A beard: from the cheeks down past the chin, in strands; a moustache over the mouth. */
export function beard(
  g: TGrid,
  h: Head,
  mat: Mat,
  o: { length?: number; width?: number; moustache?: boolean; stubble?: boolean } = {},
): void {
  const fx = faceX(h);
  const ey = eyesY(h);
  const len = o.length ?? 10;
  const w = o.width ?? 1;
  if (o.stubble) {
    for (let y = ey + 6; y <= h.chin; y++)
      for (let x = h.cx - h.w; x <= h.cx + h.w + 1; x++) {
        const half = headHalf(h, y);
        if (Math.abs(x + 0.5 - h.cx - 1) > half - 0.5) continue;
        const inMouth = Math.abs(x - fx) < 5 && y >= ey + 10 && y <= ey + 13;
        if (y < ey + 9 && Math.abs(x - fx) < 6) continue;
        const r = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        if (!inMouth && r - Math.floor(r) < 0.42)
          put(g, x, y, cell(mat, r - Math.floor(r) < 0.12 ? 3 : 4));
      }
    return;
  }
  strands(
    g,
    mat,
    (x, y) => {
      if (y < ey + 5) return false;
      const half = (y <= h.chin ? headHalf(h, y) : 0) * w;
      const below = y > h.chin ? Math.max(0, h.jaw * w + 2 - (y - h.chin) * 0.7) : 0;
      const lx = Math.abs(x + 0.5 - h.cx - 1);
      if (y > h.chin + len) return false;
      if (y <= h.chin && lx > half + 0.5) return false;
      if (y > h.chin && lx > below) return false;
      // The cheeks above the moustache stay bare, and the mouth shows if there is no moustache over it.
      if (y < ey + 9 && Math.abs(x - fx) < 7) return false;
      if (!o.moustache && Math.abs(x - fx) < 4 && y >= ey + 10 && y <= ey + 12) return false;
      return true;
    },
    {
      x0: h.cx - h.w - 2,
      y0: ey + 4,
      w: h.w * 2 + 6,
      h: h.chin - ey + len,
      cx: h.cx - 2,
      cy: ey + 6,
      lean: 0,
      base: 2.6,
    },
  );
  if (o.moustache)
    sprite(g, fx - 6, ey + 9, ['..aaaaaaaa..', '.abbbaabbbb.', 'ab........bc', 'b..........c'], {
      a: [mat, 2],
      b: [mat, 3],
      c: [mat, 4],
    });
}

/** A disc behind a bust: a dark step of a ramp, its upper-left rim a step lighter. */
export function disc(g: TGrid, mat: Mat, step = 5): void {
  paint(g, 0, 0, BUST, BUST, (x, y) => {
    const d = Math.hypot(x + 0.5 - 36, y + 0.5 - 37);
    if (d > 34.5) return 0;
    const rim = d > 32.6 && x + y < 74;
    return cell(mat, rim ? step - 1 : step);
  });
}

void rod;

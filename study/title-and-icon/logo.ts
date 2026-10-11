/**
 * The logotype treatments: a letter mask from glyphs.ts made into pixels lit
 * the town's way (upper-left light, the bevel in town2/cells.ts), with the
 * outline in the material's own darkest step and a rim and drop shadow so it
 * holds over a busy picture.
 *
 * - Gilt: gold leaf banded like polished metal (bright top, a dark band below
 *   the middle, a warm bounce at the foot), a brown line, a navy rim.
 * - Cream: limewash-cream letters, softly lit, a madder line and a deep red
 *   shadow cast down and right: a painted storybook title.
 * - Carved: cut into a board and gilded, so the light falls on the lower-right
 *   walls of each cut and the upper-left walls are in shadow.
 */
import { bevel, FLAT_LIGHT, tgrid, put, at, type TGrid } from '../../src/art/town2/cells';
import { clumps } from '../../src/art/town2/texture';
import { X, type XMat } from './pal';
import { mget, mask, type Mask } from './glyphs';

export type Treatment = 'gilt' | 'cream' | 'carved' | 'silver';

interface Look {
  mat: XMat;
  /** Step per row (0 top .. 1 foot) before the bevel. */
  band: (f: number) => number;
  contrast: number;
  radius: number;
  lo: number;
  hi: number;
  line: [XMat, number];
}

const LOOKS: Record<Exclude<Treatment, 'carved'>, Look> = {
  gilt: {
    mat: 'gilt',
    band: (f) =>
      f < 0.42
        ? 1.3 + f * 1.6
        : f < 0.5
          ? 3.4
          : f < 0.72
            ? 3.0 - (f - 0.5) * 2.5
            : 2.2 + (f - 0.72) * 3,
    contrast: 1.4,
    radius: 2.2,
    lo: 0,
    hi: 5,
    line: ['gilt', 6],
  },
  silver: {
    mat: 'plate',
    band: (f) => (f < 0.45 ? 1 + f * 2 : f < 0.52 ? 3.6 : 2.4 + (f - 0.52) * 2),
    contrast: 1.4,
    radius: 2.2,
    lo: 0,
    hi: 5,
    line: ['plate', 6],
  },
  cream: {
    mat: 'parch',
    band: (f) => 1 + f * 1.4,
    contrast: 1.2,
    radius: 2,
    lo: 0,
    hi: 4,
    line: ['banner', 5],
  },
};

/** Shades a mask as letters standing proud, in one of the looks. */
function shadeRaised(m: Mask, look: Look, top = 0, bottom = m.h): TGrid {
  const lit = bevel(m.d, m.w, m.h, look.radius);
  const g = tgrid(m.w, m.h);
  const span = Math.max(1, bottom - top);
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      if (!mget(m, x, y)) continue;
      const f = Math.max(0, Math.min(1, (y + 0.5 - top) / span));
      let t = look.band(f) + (look.contrast * (FLAT_LIGHT - (lit[y * m.w + x] as number))) / 0.5;
      // The band edges break into clumps rather than ruling straight across.
      t += (clumps(x, y, 9) - 0.5) * 0.5;
      const s = Math.max(look.lo, Math.min(look.hi, Math.round(t)));
      put(g, x, y, X(look.mat, s));
    }
  // A glint on the upper-left corners of each stroke: the brightest step.
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++)
      if (
        mget(m, x, y) &&
        !mget(m, x - 1, y) &&
        !mget(m, x, y - 1) &&
        mget(m, x + 1, y) &&
        mget(m, x, y + 1)
      )
        put(g, x, y, X(look.mat, 0));
  return g;
}

/** Shades a mask as letters cut into a board and gilded. */
function shadeCarved(m: Mask): TGrid {
  const g = tgrid(m.w, m.h);
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) {
      if (!mget(m, x, y)) continue;
      // The cut's walls: the upper-left one in shade, the lower-right one lit.
      const ul = !mget(m, x - 1, y) || !mget(m, x, y - 1) || !mget(m, x - 1, y - 1);
      const lr = !mget(m, x + 1, y) || !mget(m, x, y + 1);
      const s = ul ? 5 : lr ? 1 : 2 + Math.round(clumps(x, y, 3) * 1.2);
      put(g, x, y, X('gilt', s));
    }
  return g;
}

export interface Framed {
  g: TGrid;
  /** Where the letters' top-left sits inside g. */
  ox: number;
  oy: number;
}

/**
 * Adds the line (one pixel in the look's line step), a rim (`rim` pixels in
 * `rimMat`) and a drop shadow `drop` pixels down and right, beneath.
 */
export function frame(
  letters: TGrid,
  m: Mask,
  o: {
    line: [XMat, number];
    rim?: [XMat, number];
    rimW?: number;
    drop?: number;
    dropCell?: [XMat, number];
  },
): Framed {
  const rimW = o.rim ? (o.rimW ?? 1) : 0;
  const drop = o.drop ?? 0;
  const pad = 1 + rimW;
  const W = m.w + pad * 2 + drop;
  const H = m.h + pad * 2 + drop;
  const g = tgrid(W, H);
  // Grow the mask ring by ring.
  const grown: Mask[] = [m];
  for (let r = 0; r < 1 + rimW; r++) {
    const prev = grown[grown.length - 1]!;
    const next = mask(m.w + 2 * (r + 1), m.h + 2 * (r + 1));
    for (let y = 0; y < next.h; y++)
      for (let x = 0; x < next.w; x++) {
        const px = x - 1;
        const py = y - 1;
        if (
          mget(prev, px, py) ||
          mget(prev, px - 1, py) ||
          mget(prev, px + 1, py) ||
          mget(prev, px, py - 1) ||
          mget(prev, px, py + 1)
        )
          next.d[y * next.w + x] = 1;
      }
    grown.push(next);
  }
  const outer = grown[grown.length - 1]!;
  // Drop shadow: the outermost ring, moved down and right.
  if (drop && o.dropCell)
    for (let y = 0; y < outer.h; y++)
      for (let x = 0; x < outer.w; x++)
        if (mget(outer, x, y))
          for (let k = 1; k <= drop; k++) put(g, x + k, y + k, X(o.dropCell[0], o.dropCell[1]));
  // Rim, then line, then letters.
  if (o.rim)
    for (let y = 0; y < outer.h; y++)
      for (let x = 0; x < outer.w; x++) if (mget(outer, x, y)) put(g, x, y, X(o.rim[0], o.rim[1]));
  const lineM = grown[1]!;
  const lo = rimW;
  for (let y = 0; y < lineM.h; y++)
    for (let x = 0; x < lineM.w; x++)
      if (mget(lineM, x, y)) put(g, x + lo, y + lo, X(o.line[0], o.line[1]));
  for (let y = 0; y < letters.h; y++)
    for (let x = 0; x < letters.w; x++) {
      const c = at(letters, x, y);
      if (c) put(g, x + pad, y + pad, c);
    }
  return { g, ox: pad, oy: pad };
}

/** A mask shaded and framed in one go. */
export function treat(
  m: Mask,
  t: Treatment,
  o: {
    rim?: [XMat, number];
    rimW?: number;
    drop?: number;
    dropCell?: [XMat, number];
    top?: number;
    bottom?: number;
    line?: [XMat, number];
  } = {},
): Framed {
  if (t === 'carved') {
    return frame(shadeCarved(m), m, { line: o.line ?? ['wood', 5], ...o });
  }
  const look = LOOKS[t];
  return frame(shadeRaised(m, look, o.top ?? 0, o.bottom ?? m.h), m, {
    line: o.line ?? look.line,
    ...o,
  });
}

/** Stamps a framed logotype into a picture at (x, y): its top-left. */
export function stampF(g: TGrid, f: Framed, x: number, y: number): void {
  for (let j = 0; j < f.g.h; j++)
    for (let i = 0; i < f.g.w; i++) {
      const c = f.g.d[j * f.g.w + i] as number;
      if (c) put(g, x + i, y + j, c);
    }
}

/** The vertical extent of ink in a mask (first and last inked rows). */
export function inkRows(m: Mask): [number, number] {
  let a = -1;
  let b = -1;
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++)
      if (mget(m, x, y)) {
        if (a < 0) a = y;
        b = y;
        break;
      }
  return [a, b];
}

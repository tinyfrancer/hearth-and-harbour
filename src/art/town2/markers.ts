/**
 * Interaction markers for the town (B15; Cody: "make it more apparent we
 * need to click the boat"): small animated overlay pieces a scene floats
 * over anything that can be tapped, and a soft ring for the thing the hero
 * is nearest. Few and quiet, so the town never looks like a menu: a little
 * cream badge on a pointer with a dark keyline (it reads over busy cobbles
 * and over the sea), one pictogram in it, bobbing a pixel or two.
 *
 * - `talk`: speech dots, for someone to talk to.
 * - `enter`: a doorway, for a building to go into.
 * - `gather`: a leaf with a glint, for something to work at (B16; a hand axe before).
 * - `travel`: an anchor, for the rowing boat (a journey).
 * - `new`: a gold sparkle, no badge, for something not yet seen.
 *
 * Town colours: rasterize with `DAY2` or `DUSK2` as the town; the badge's
 * light (`sail`) and the sparkle's gold keep their brightness at dusk (set by hand there).
 */
import { bevel, cell, outlined, put, tgrid, type Cell, type Picture2, type TGrid } from './cells';
import type { Mat } from './ramps';

export const TOWN_MARKER2_KINDS = ['talk', 'enter', 'gather', 'travel', 'new'] as const;
export type TownMarker2Kind = (typeof TOWN_MARKER2_KINDS)[number];

/** Frames in a marker's loop, and how long to show each. */
export const TOWN_MARKER2_FRAMES = 4;
export const TOWN_MARKER2_FRAME_MS = 180;

/** A marker: its picture and its anchor, the pointer's tip (float it over the thing at that point). */
export interface TownMarker2 {
  readonly picture: Picture2;
  readonly anchor: { readonly x: number; readonly y: number };
}

/**
 * A marker's size: `small` (14 x 16 before its keyline) for things near the
 * hero, `large` (27 x 28 before its keyline, about twice) for the rowing
 * boat seen from across the square (B16).
 */
export const TOWN_MARKER2_SIZES = ['small', 'large'] as const;
export type TownMarker2Size = (typeof TOWN_MARKER2_SIZES)[number];

/** Which way an edge-of-screen pointer points. */
export const TOWN_POINTER2_DIRECTIONS = ['left', 'right', 'up', 'down'] as const;
export type TownPointer2Direction = (typeof TOWN_POINTER2_DIRECTIONS)[number];

/** How far the badge rises in each frame: a slow bob. */
const BOB = [0, 1, 2, 1] as const;

const pin = (m: Mat, t: number): Cell => cell(m, t);

function rowsAt(
  g: TGrid,
  x: number,
  y: number,
  rows: readonly string[],
  pins: Readonly<Record<string, Cell>>,
): void {
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) {
      const c = pins[r[i]!];
      if (c) put(g, x + i, y + j, c);
    }
  });
}

/** The pictograms, 10 x 8 in the badge, dark on its cream. */
const ICONS: Readonly<
  Record<Exclude<TownMarker2Kind, 'new'>, { rows: readonly string[]; pins: Record<string, Cell> }>
> = {
  // B16: a leaf with a glint (a hand axe before, the least clear at true size), drawn by hand
  // at this size so its keyline and vein hold.
  gather: {
    rows: [
      '.y....kkkk',
      'yYy..kgggk',
      '.y..kgggvk',
      '...kgggvhk',
      '..kggvhhk.',
      '.kgvhhhk..',
      '.kvkkkk...',
      'k.........',
    ],
    pins: {
      k: pin('leaf', 5),
      g: pin('leaf', 2),
      h: pin('leaf', 3),
      v: pin('leaf', 5),
      y: pin('gold', 3),
      Y: pin('gold', 1),
    },
  },
  talk: {
    rows: ['..........', '..........', '..........', '.aa.aa.aa.', '.aa.aa.aa.', '..........'],
    pins: { a: pin('tar', 5) },
  },
  enter: {
    rows: [
      '...aaaa...',
      '..abbbba..',
      '.abbbbbba.',
      '.abbbbbba.',
      '.abbbbcba.',
      '.abbbbbba.',
      '.abbbbbba.',
      'aaaaaaaaaa',
    ],
    pins: { a: pin('wood', 4), b: pin('tar', 5), c: pin('gold', 2) },
  },
  travel: {
    rows: [
      '....aa....',
      '...a..a...',
      '....aa....',
      '..aaaaaa..',
      '....aa....',
      'a...aa...a',
      'aa..aa..aa',
      '.aaaaaaaa.',
    ],
    pins: { a: pin('tar', 5) },
  },
};

const made = new Map<string, TownMarker2>();

/**
 * A marker of a kind at a frame of its loop (any whole number; it wraps at
 * `TOWN_MARKER2_FRAMES`): float it with its anchor a few pixels over the
 * top of what it marks (a person's head, a door's lintel, the boat's
 * gunwale), and step the frame every `TOWN_MARKER2_FRAME_MS`. Every frame of
 * a kind is the same size with its anchor in the same place, so it never
 * jumps; the badge bobs inside it.
 */
export function townMarker2(
  kind: TownMarker2Kind,
  frame = 0,
  size: TownMarker2Size = 'small',
): TownMarker2 {
  const f =
    ((Math.floor(Number.isFinite(frame) ? frame : 0) % TOWN_MARKER2_FRAMES) + TOWN_MARKER2_FRAMES) %
    TOWN_MARKER2_FRAMES;
  if (size === 'large') return largeMarker(kind, f);
  const key = `${kind} ${f}`;
  let out = made.get(key);
  if (out) return out;
  const W = 14;
  const H = 16;
  const g = tgrid(W, H);
  const up = BOB[f]!;
  if (kind === 'new') {
    // A sparkle: a four-pointed star, its points growing and shrinking, a glint at its heart.
    const r = [3, 4, 5, 4][f]!;
    const cx = 6;
    const cy = 8 - up;
    for (let k = -r; k <= r; k++) {
      const t = Math.abs(k) >= r - 1 ? 3 : Math.abs(k) > 1 ? 2 : 1;
      put(g, cx + k, cy, pin('gold', t));
      put(g, cx, cy + k, pin('gold', t));
    }
    put(g, cx - 1, cy - 1, pin('gold', 2));
    put(g, cx + 1, cy + 1, pin('gold', 2));
    put(g, cx + 1, cy - 1, pin('gold', 3));
    put(g, cx - 1, cy + 1, pin('gold', 3));
    put(g, cx, cy, pin('gold', 0));
    if (f === 2) put(g, cx + 4, cy - 4, pin('gold', 1));
    if (f === 0) put(g, cx - 4, cy + 3, pin('gold', 2));
  } else {
    // The badge: a rounded cream plaque lit on its top, a pointer below it to the thing.
    const top = 3 - up;
    rowsAt(
      g,
      1,
      top,
      [
        '.aaaaaaaaaa.',
        'aaabbbbbbbbb',
        'abbbbbbbbbbc',
        'abbbbbbbbbbc',
        'abbbbbbbbbbc',
        'abbbbbbbbbbc',
        'abbbbbbbbbbc',
        'abbbbbbbbbbc',
        'abbbbbbbbbbc',
        '.cccccccccc.',
        '....ccc.....',
        '.....c......',
      ],
      { a: pin('sail', 0), b: pin('sail', 1), c: pin('sail', 3) },
    );
    const icon = ICONS[kind];
    rowsAt(g, 2, top + 1, icon.rows, icon.pins);
  }
  const pic: Picture2 = { grid: outlined(g), glows: [] };
  out = { picture: pic, anchor: { x: 6 + 1, y: H } };
  made.set(key, out);
  return out;
}

/* ----- The large marker and the edge pointer (B16) ----- */

/** The large badge before its keyline: 27 across, 21 deep, a pointer 5 below, 2 of bob above. */
const LW = 27;
const LH = 21;
const LPOINT = 5;
const LBOB = 2;

/**
 * A leaf with a glint on it, for `gather` (something to work at): an almond
 * of green rising to the right, its vein dark, a short stem at its foot,
 * edged a step darker so it holds on the cream; a gold sparkle at its upper
 * left says "take this". Laid on `g` in a `w` x `h` box at (x0, y0).
 */
function leafIcon(g: TGrid, x0: number, y0: number, w: number, h: number): void {
  const big = w > 12;
  const cx = w * (big ? 0.56 : 0.58);
  const cy = h * (big ? 0.55 : 0.56);
  const rx = w * (big ? 0.42 : 0.43);
  const ry = h * (big ? 0.3 : 0.32);
  const t = -0.62;
  const [c, s] = [Math.cos(t), Math.sin(t)];
  const inLeaf = (x: number, y: number): { u: number; v: number } | null => {
    const dx = x + 0.5 - cx;
    const dy = y + 0.5 - cy;
    const u = dx * c + dy * s;
    const v = -dx * s + dy * c;
    const k = 1 - (u / rx) ** 2;
    return k > 0 && Math.abs(v) <= ry * k ? { u, v } : null;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = inLeaf(x, y);
      if (!p) continue;
      const edge = !inLeaf(x - 1, y) || !inLeaf(x + 1, y) || !inLeaf(x, y - 1) || !inLeaf(x, y + 1);
      const vein = Math.abs(p.v) < 0.55 && Math.abs(p.u) < rx - 1;
      const step = vein ? 5 : edge ? (p.v < 0 ? 4 : 5) : p.v < 0 ? 2 : 3;
      put(g, x0 + x, y0 + y, pin('leaf', step));
    }
  // The stem, from the leaf's lower-left tip on down and out.
  const sx = cx - rx * c;
  const sy = cy - rx * s;
  for (let k = 0; k < (big ? 3 : 2); k++)
    put(g, x0 + Math.floor(sx) - k, y0 + Math.floor(sy) + k, pin('leaf', 5));
  // The glint, up and to the left of the leaf: a small four-point star.
  const gx = x0 + (big ? 3 : 1);
  const gy = y0 + (big ? 2 : 1);
  const r = big ? 2 : 1;
  for (let k = -r; k <= r; k++) {
    put(g, gx + k, gy, pin('gold', 3));
    put(g, gx, gy + k, pin('gold', 3));
  }
  put(g, gx, gy, pin('gold', 1));
}

/** The large pictograms, 19 x 13 in the badge. */
const LARGE_ICONS: Readonly<
  Record<
    Exclude<TownMarker2Kind, 'new' | 'gather'>,
    { rows: readonly string[]; pins: Record<string, Cell> }
  >
> = {
  talk: {
    rows: [
      '...................',
      '...................',
      '...................',
      '...................',
      '..aaa...aaa...aaa..',
      '..aaa...aaa...aaa..',
      '..aaa...aaa...aaa..',
    ],
    pins: { a: pin('tar', 5) },
  },
  enter: {
    rows: [
      '.......aaaaa.......',
      '.....aabbbbbaa.....',
      '....abbbbbbbbba....',
      '....abbbbbbbbba....',
      '...abbbbbbbbbbba...',
      '...abbbbbbbbbbba...',
      '...abbbbbbbbbbba...',
      '...abbbbbbbbbbba...',
      '...abbbbbbbbbcba...',
      '...abbbbbbbbbbba...',
      '...abbbbbbbbbbba...',
      '...abbbbbbbbbbba...',
      '.aaaaaaaaaaaaaaaaa.',
    ],
    pins: { a: pin('wood', 3), b: pin('tar', 5), c: pin('gold', 2) },
  },
  // A little sailing boat on the water: "set out from here".
  travel: {
    rows: [
      '.........mrrr......',
      '.........mrr.......',
      '.........ms........',
      '........kmss.......',
      '.......kkmsss......',
      '......kkkmssss.....',
      '.....kkkkmsssss....',
      '....kkkkkmssssss...',
      '.........m.........',
      '.hhhhhhhhhhhhhhhhh.',
      '..hhhhhhhhhhhhhhh..',
      '....hhhhhhhhhhh....',
      'w.ww..ww..ww..ww..w',
    ],
    pins: {
      m: pin('tar', 5),
      r: pin('crimson', 2),
      k: pin('tar', 3),
      s: pin('tar', 3),
      h: pin('tar', 5),
      w: pin('sea', 4),
    },
  },
};

/** A gold sparkle, its arms `r` long and thickening toward a white heart. */
function sparkle(g: TGrid, cx: number, cy: number, r: number): void {
  for (let k = -r; k <= r; k++) {
    const a = Math.abs(k);
    const t = a >= r - 1 ? 3 : a > r / 2 ? 2 : 1;
    put(g, cx + k, cy, pin('gold', t));
    put(g, cx, cy + k, pin('gold', t));
    if (a > 0 && a <= r / 3) {
      put(g, cx + k, cy - 1, pin('gold', 2));
      put(g, cx + k, cy + 1, pin('gold', 2));
      put(g, cx - 1, cy + k, pin('gold', 2));
      put(g, cx + 1, cy + k, pin('gold', 2));
    }
  }
  put(g, cx - 1, cy - 1, pin('gold', 1));
  put(g, cx + 1, cy + 1, pin('gold', 2));
  put(g, cx + 1, cy - 1, pin('gold', 2));
  put(g, cx - 1, cy + 1, pin('gold', 2));
  put(g, cx, cy, pin('gold', 0));
}

/** Inside a rounded rectangle `w` x `h` with corners of radius `r`, by pixel centres. */
function inRounded(x: number, y: number, w: number, h: number, r: number): boolean {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const px = x + 0.5;
  const py = y + 0.5;
  const qx = Math.max(r - px, 0, px - (w - r));
  const qy = Math.max(r - py, 0, py - (h - r));
  return qx * qx + qy * qy <= r * r;
}

function largeMarker(kind: TownMarker2Kind, f: number): TownMarker2 {
  const key = `${kind} ${f} large`;
  let out = made.get(key);
  if (out) return out;
  const g = tgrid(LW, LH + LPOINT + LBOB);
  const up = BOB[f]!;
  const top = LBOB - up;
  const mid = (LW - 1) / 2;
  if (kind === 'new') {
    sparkle(g, mid, top + 11, [7, 9, 11, 9][f]!);
    if (f === 2) sparkle(g, mid + 9, top + 2, 1);
    if (f === 0) sparkle(g, mid - 9, top + 19, 1);
  } else {
    // The badge: a cream plaque in a gold rim, lit on its top, a gold pointer below it to the thing.
    for (let y = 0; y < LH; y++)
      for (let x = 0; x < LW; x++) {
        if (!inRounded(x, y, LW, LH, 6)) continue;
        const lit = y < LH / 2;
        let c: Cell;
        if (
          !inRounded(x - 1, y, LW, LH, 6) ||
          !inRounded(x + 1, y, LW, LH, 6) ||
          y === 0 ||
          y === LH - 1
        )
          c = pin('gold', lit ? 1 : 2);
        else if (
          !inRounded(x - 2, y - 2, LW, LH, 6) ||
          !inRounded(x + 2, y + 2, LW, LH, 6) ||
          y <= 1 ||
          y >= LH - 2
        )
          c = pin('gold', lit ? 3 : 4);
        else c = pin('sail', y <= 2 ? 0 : y >= LH - 3 ? 2 : 1);
        put(g, x, top + y, c);
      }
    put(g, 4, top + 1, pin('gold', 0));
    put(g, 5, top + 1, pin('gold', 0));
    for (let j = 0; j < LPOINT; j++) {
      const half = LPOINT - 1 - j;
      for (let i = -half; i <= half; i++)
        put(g, mid + i, top + LH + j, pin('gold', i < 0 ? 2 : i === 0 ? 3 : 4));
    }
    if (kind === 'gather') leafIcon(g, 4, top + 4, 19, 13);
    else {
      const icon = LARGE_ICONS[kind];
      rowsAt(g, 4, top + 4, icon.rows, icon.pins);
    }
  }
  out = {
    picture: { grid: outlined(g), glows: [] },
    anchor: { x: mid + 1, y: LBOB + LH + LPOINT + 1 },
  };
  made.set(key, out);
  return out;
}

/** The pointer's length along its way and its width across, before its keyline; it moves 2 along. */
const PL = 12;
const PW = 17;
const PBOB = [0, 1, 2, 1] as const;

/**
 * An arrow for the edge of the screen, aimed at something off it (the rowing
 * boat): a gold chevron with a dark keyline, the dungeon's way-onward arrow
 * in the town's pixels, nudging toward where it points by frame. Every frame
 * of a direction is the same size with the same anchor: the point just past
 * the arrow's tip at its furthest, so put the anchor where the arrow should
 * point to (a few pixels inside the screen's edge, on the line to the boat)
 * and it never crosses it. Step the frame with the markers'.
 */
export function townPointer2(direction: TownPointer2Direction, frame = 0): TownMarker2 {
  const f =
    ((Math.floor(Number.isFinite(frame) ? frame : 0) % TOWN_MARKER2_FRAMES) + TOWN_MARKER2_FRAMES) %
    TOWN_MARKER2_FRAMES;
  const key = `pointer ${direction} ${f}`;
  let out = made.get(key);
  if (out) return out;
  const L = PL + 2;
  const across = direction === 'left' || direction === 'right';
  const w = across ? L : PW;
  const h = across ? PW : L;
  const mask = new Uint8Array(w * h);
  const shift = PBOB[f]!;
  const half = (PW - 1) / 2;
  // The chevron pointing along +a, its tip at a = PL - 1 + shift, notched at its back.
  const inside = (a: number, b: number): boolean => {
    const d = Math.abs(b - half);
    const tip = PL - 1 + shift;
    const front = tip - (d / half) * (PL - 1);
    const notch = shift + 3 - (d / half) * 3;
    return d <= half && a <= front + 0.5 && a >= notch - 0.5;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [a, b] =
        direction === 'right'
          ? [x, y]
          : direction === 'left'
            ? [L - 1 - x, y]
            : direction === 'down'
              ? [y, x]
              : [L - 1 - y, x];
      if (inside(a, b)) mask[y * w + x] = 1;
    }
  const light = bevel(mask, w, h, 2.5);
  const g = tgrid(w, h);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const l = light[i]!;
    put(g, i % w, Math.floor(i / w), pin('gold', l > 0.85 ? 0 : l > 0.7 ? 1 : l > 0.5 ? 2 : 3));
  }
  const tip = L + 1;
  out = {
    picture: { grid: outlined(g), glows: [] },
    anchor:
      direction === 'right'
        ? { x: tip, y: half + 1 }
        : direction === 'left'
          ? { x: 0, y: half + 1 }
          : direction === 'down'
            ? { x: half + 1, y: tip }
            : { x: half + 1, y: 0 },
  };
  made.set(key, out);
  return out;
}

/**
 * A ring on the ground round the thing the hero is nearest (B16; B15's was
 * a broken ellipse of pale light, whose dashes on the sea were taken for
 * foam): a thin unbroken ellipse of gold `w` across (and a third as deep),
 * kept between two dark keylines so it reads on cobbles, grass, sand,
 * planks and water alike, a brighter glint creeping round it by frame.
 * Centre it on the thing's foot (its anchor is the ring's middle) and draw
 * it on the ground, under everything standing.
 */
export function townHighlight2(w: number, frame = 0): TownMarker2 {
  const W = Math.max(12, Math.round(w)) | 1;
  const D = Math.max(5, Math.round(W * 0.34)) | 1;
  const f = ((Math.floor(frame) % TOWN_MARKER2_FRAMES) + TOWN_MARKER2_FRAMES) % TOWN_MARKER2_FRAMES;
  const key = `ring ${W} ${f}`;
  let out = made.get(key);
  if (out) return out;
  const GW = W + 4;
  const GH = D + 4;
  const g = tgrid(GW, GH);
  const cx = (GW - 1) / 2;
  const cy = (GH - 1) / 2;
  const rx = (W - 1) / 2;
  const ry = (D - 1) / 2;
  // The gold line: the ellipse walked finely, one pixel thick, each pixel knowing its angle.
  const angle = new Float32Array(GW * GH).fill(NaN);
  const n = Math.ceil((W + D) * 4);
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(t) * rx);
    const y = Math.round(cy + Math.sin(t) * ry);
    angle[y * GW + x] = t;
  }
  const on = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < GW && y < GH && !Number.isNaN(angle[y * GW + x]!);
  // Thin the line where it steps: a pixel making an L with two neighbours goes (the diagonal holds).
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      if (!on(x, y)) continue;
      const h = on(x - 1, y) || on(x + 1, y);
      const v = on(x, y - 1) || on(x, y + 1);
      const n = +on(x - 1, y) + +on(x + 1, y) + +on(x, y - 1) + +on(x, y + 1);
      if (h && v && n === 2) angle[y * GW + x] = NaN;
    }
  // The glint: an eighth of the way round, a quarter further each frame.
  const glint = (f / TOWN_MARKER2_FRAMES) * Math.PI * 2 - Math.PI / 2;
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      if (on(x, y)) {
        const t = angle[y * GW + x]!;
        const d = Math.abs(((t - glint + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        put(g, x, y, pin('gold', d < Math.PI / 8 ? 0 : 1));
      } else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))
        put(g, x, y, pin('tar', 5));
    }
  out = { picture: { grid: g, glows: [] }, anchor: { x: Math.round(cx), y: Math.round(cy) } };
  made.set(key, out);
  return out;
}

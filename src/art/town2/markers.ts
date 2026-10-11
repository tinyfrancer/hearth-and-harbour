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
 * - `gather`: a hand axe, for something to work at.
 * - `travel`: an anchor, for the rowing boat (a journey).
 * - `new`: a gold sparkle, no badge, for something not yet seen.
 *
 * Town colours: rasterize with `DAY2` or `DUSK2` as the town; the badge's
 * light (`sail`) and the sparkle's gold keep their brightness at dusk (set by hand there).
 */
import { cell, outlined, put, tgrid, type Cell, type Picture2, type TGrid } from './cells';
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
  gather: {
    rows: [
      '..aaa.....',
      '.aaaab....',
      '.aaa.b....',
      '..a...b...',
      '......b...',
      '.......b..',
      '.......b..',
      '.......bb.',
    ],
    pins: { a: pin('iron', 4), b: pin('wood', 4) },
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
export function townMarker2(kind: TownMarker2Kind, frame = 0): TownMarker2 {
  const f =
    ((Math.floor(Number.isFinite(frame) ? frame : 0) % TOWN_MARKER2_FRAMES) + TOWN_MARKER2_FRAMES) %
    TOWN_MARKER2_FRAMES;
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

/**
 * A soft ring on the ground round the thing the hero is nearest: a broken
 * ellipse of pale light `w` across (and a third as deep), its dashes
 * creeping round by frame. Centre it on the thing's foot (its anchor is the
 * ring's middle) and draw it on the ground, under everything standing. No
 * outline: it is light on the ground, not a thing.
 */
export function townHighlight2(w: number, frame = 0): TownMarker2 {
  const W = Math.max(12, Math.round(w)) | 1;
  const D = Math.max(5, Math.round(W * 0.34)) | 1;
  const f = ((Math.floor(frame) % TOWN_MARKER2_FRAMES) + TOWN_MARKER2_FRAMES) % TOWN_MARKER2_FRAMES;
  const key = `ring ${W} ${f}`;
  let out = made.get(key);
  if (out) return out;
  const g = tgrid(W + 2, D + 2);
  const cx = (W + 1) / 2;
  const cy = (D + 1) / 2;
  const rx = W / 2;
  const ry = D / 2;
  for (let y = 0; y < D + 2; y++)
    for (let x = 0; x < W + 2; x++) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d < 1 - 1.4 / ry || d > 1) continue;
      const a = Math.atan2((y - cy) / ry, (x - cx) / rx);
      const dash = (((a + Math.PI) / (Math.PI * 2)) * 24 + f * 0.5) % 1;
      if (dash > 0.7) continue;
      // Lit on the far side (the top of the ellipse), softer toward the near side.
      put(g, x, y, pin('lamp', y < cy ? 0 : 1));
    }
  out = { picture: { grid: g, glows: [] }, anchor: { x: Math.round(cx), y: Math.round(cy) } };
  made.set(key, out);
  return out;
}

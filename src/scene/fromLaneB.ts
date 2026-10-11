/*
 * STAND-IN SEAM (lane B, wave 15). Everything this scene needs from lane B's
 * early PR that is not on `main` yet, in one place, so swapping the real
 * thing in is an edit to this file alone. Until then each part is a plain
 * stand-in, drawn here as simply as will read, never meant to ship as art:
 *
 * - the harbour chart (`harbourChart2`: a map, each dungeon's landing on it,
 *   and home), its landing markers and emblems and the rowboat token;
 * - the town's markers over tappable things (`townMarker2`) and the ring
 *   under the one a tap would use;
 * - the ferryman's figure (the docker's until lane B draws him), the boat's
 *   sign and its bow lantern;
 * - the cave's own tiles (`'tidepool'`: the grotto's until then) and the
 *   Old Snapper's picture (the giant crab's until then).
 */
import { cell, put, tgrid, type Picture2, type TGrid } from '../art/town2/cells';
import { foeSize2 } from '../art/dungeonArt2';
import type { Mat } from '../art/town2/ramps';
import type { TimeOfDay } from './daylight';
import type { Townsfolk2 } from './figures2';
import { cellPixels, palette2 } from './town2Paint';
import type { Point } from './tileMap';

/* ----- Painting a stand-in ----- */

const canPaint = (): boolean => typeof ImageData !== 'undefined' && typeof document !== 'undefined';

/** A stand-in drawing on a canvas of its own, one pixel per art pixel; null where nothing paints. */
function painted(pic: Picture2, time: TimeOfDay): HTMLCanvasElement | null {
  if (!canPaint()) return null;
  const canvas = document.createElement('canvas');
  canvas.width = pic.grid.w;
  canvas.height = pic.grid.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const data = cellPixels(pic, palette2(time));
  ctx.putImageData(
    new ImageData(data as Uint8ClampedArray<ArrayBuffer>, pic.grid.w, pic.grid.h),
    0,
    0,
  );
  return canvas;
}

function fill(g: TGrid, x: number, y: number, w: number, h: number, m: Mat, t: number): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(g, x + i, y + j, cell(m, t));
}

function disc(g: TGrid, cx: number, cy: number, r: number, m: Mat, t: number): void {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r + r) put(g, cx + x, cy + y, cell(m, t));
}

/** Rows of characters to cells: each character a material and step by `key`, `.` empty. */
function rows(lines: readonly string[], key: Readonly<Record<string, [Mat, number]>>): TGrid {
  const g = tgrid(lines[0]!.length, lines.length);
  lines.forEach((line, y) =>
    [...line].forEach((ch, x) => {
      const k = key[ch];
      if (k) put(g, x, y, cell(k[0], k[1]));
    }),
  );
  return g;
}

/* ----- The harbour chart ----- */

/** Lane B's `harbourChart2()`, as this scene uses it: the map painted, its landings and home. */
export interface HarbourChart {
  /** The map, one pixel per art pixel; null where nothing paints (tests). */
  readonly canvas: HTMLCanvasElement | null;
  readonly width: number;
  readonly height: number;
  /** Each landing's place on the map, by dungeon id (and `unknown_1`… for landings to come). */
  readonly landings: Readonly<Record<string, Point>>;
  /** The harbour, where the route starts. */
  readonly home: Point;
  /** True while this is the stand-in, not lane B's map. */
  readonly standIn: boolean;
}

const CHART_W = 180;
const CHART_H = 120;

/** Where the stand-in puts each landing: the cave close in, the grotto round the point, the rest out at sea. */
const STAND_IN_LANDINGS: Readonly<Record<string, Point>> = {
  tidepool_cave: { x: 44, y: 76 },
  brinebeards_grotto: { x: 92, y: 40 },
  unknown_1: { x: 140, y: 22 },
  unknown_2: { x: 158, y: 74 },
  unknown_3: { x: 116, y: 100 },
};
const STAND_IN_HOME: Point = { x: 22, y: 104 };

function chartPicture(): Picture2 {
  const g = tgrid(CHART_W, CHART_H);
  // Paper sea, and the coast along the left and the top.
  fill(g, 0, 0, CHART_W, CHART_H, 'linen', 1);
  for (let y = 0; y < CHART_H; y++)
    for (let x = 0; x < CHART_W; x++) {
      const coast = 30 + Math.round(10 * Math.sin(y / 9) + 6 * Math.sin(y / 3.7));
      const north = 12 + Math.round(6 * Math.sin(x / 11) + 3 * Math.sin(x / 4.3));
      if (x < coast || y < north)
        put(g, x, y, cell('sand', x < coast - 4 || y < north - 4 ? 2 : 1));
      else if ((x + y * 3) % 23 === 0) put(g, x, y, cell('linen', 3));
    }
  // A headland the grotto sits round, and islands out at sea.
  disc(g, 92, 30, 12, 'sand', 2);
  disc(g, 140, 16, 7, 'sand', 2);
  disc(g, 160, 70, 6, 'sand', 2);
  disc(g, 116, 104, 5, 'sand', 2);
  // The harbour: a quay and the town's roofs.
  fill(g, 10, 98, 16, 3, 'stone', 3);
  fill(g, 6, 90, 5, 5, 'tile', 2);
  fill(g, 13, 88, 5, 6, 'tile', 3);
  // A compass in the corner.
  for (let i = -6; i <= 6; i++) {
    put(g, 164 + i, 104, cell('wood', 4));
    put(g, 164, 104 + i, cell('wood', 4));
  }
  put(g, 164, 97, cell('crimson', 2));
  return { grid: g, glows: [] };
}

let chart: HarbourChart | null = null;

/** The harbour chart: lane B's `harbourChart2()` once it lands, a plain stand-in map until then. */
export function harbourChart(): HarbourChart {
  if (chart && (chart.canvas || !canPaint())) return chart;
  chart = {
    canvas: painted(chartPicture(), 'day'),
    width: CHART_W,
    height: CHART_H,
    landings: STAND_IN_LANDINGS,
    home: STAND_IN_HOME,
    standIn: true,
  };
  return chart;
}

/**
 * A landing's marker for its state (lane B's `chartMarker2(state)`); null
 * while there is none, when the panel draws its own plain pin.
 */
export function chartMarker(_state: string): HTMLCanvasElement | null {
  return null;
}

/** A dungeon's emblem on the chart (lane B's `chartEmblem2(id)`); null until there is one. */
export function chartEmblem(_id: string): HTMLCanvasElement | null {
  return null;
}

/** The rowboat token that rows along the route (lane B's); null: the panel draws a plain one. */
export function chartBoat(): HTMLCanvasElement | null {
  return null;
}

/* ----- The town's markers ----- */

/** What a marker over a tappable thing says it is for. */
export type MarkerKind = 'talk' | 'enter' | 'gather' | 'travel' | 'new';

/** How many frames a marker's bob has (lane B's will say). */
export const MARKER_FRAMES = 4;

const MARKER_ROWS: Readonly<Record<MarkerKind, readonly string[]>> = {
  // A speech bubble.
  talk: [
    '.lllllllll.',
    'lwwwwwwwwwl',
    'lwkwwkwwkwl',
    'lwwwwwwwwwl',
    '.lllwwllll.',
    '....lwl....',
    '.....l.....',
  ],
  // An arrow in through a door.
  enter: [
    '.lllllllll.',
    'lgggggggggl',
    'lggggwggggl',
    'lgggwwwgggl',
    'lggwwwwwggl',
    'lggggwggggl',
    '.lllllllll.',
  ],
  // A leaf.
  gather: [
    '....lll....',
    '...lfffl...',
    '..lffwffl..',
    '..lfwfffl..',
    '...lffl....',
    '....ll.....',
    '...l.......',
  ],
  // An anchor, for the boat and those by it.
  travel: [
    '....lll....',
    '....lwl....',
    '..lllwlll..',
    '....lwl....',
    '.l..lwl..l.',
    '.lwwwwwwwl.',
    '..lllllll..',
  ],
  // A bright "!": somewhere new to go.
  new: [
    '...lllll...',
    '...lgwgl...',
    '...lgwgl...',
    '...lgwgl...',
    '...lllll...',
    '...lgwgl...',
    '...lllll...',
  ],
};

const MARKER_KEY: Readonly<Record<string, [Mat, number]>> = {
  l: ['wood', 6],
  w: ['linen', 0],
  k: ['wood', 5],
  g: ['gold', 2],
  f: ['leaf', 2],
};

const markers = new Map<string, HTMLCanvasElement | null>();

/**
 * A marker for something tappable in town, by kind, at a time of day (lane
 * B's `townMarker2(kind, frame)`); the bob is drawn by the caller from
 * `frame` (0 to `MARKER_FRAMES - 1`). Null where nothing paints.
 */
export function townMarker(kind: MarkerKind, time: TimeOfDay): HTMLCanvasElement | null {
  const key = `${kind} ${time}`;
  if (!markers.has(key)) {
    const g = rows(MARKER_ROWS[kind], MARKER_KEY);
    markers.set(key, painted({ grid: g, glows: [] }, time));
  }
  return markers.get(key)!;
}

/** How far a marker is lifted at a frame of its bob, in art pixels. */
export function markerBob(frame: number): number {
  return [0, 1, 2, 1][((frame % MARKER_FRAMES) + MARKER_FRAMES) % MARKER_FRAMES]!;
}

/* ----- The ferryman, the boat's sign and its lantern ----- */

/** The ferryman's figure: lane B's `ferryman` once drawn; the docker's stands in. */
export const FERRYMAN_FIGURE: Townsfolk2 = 'docker';

/** A town piece this scene places itself until lane B's layout has it. */
export interface StandInPiece {
  readonly id: string;
  /** Where its foot is, in town pixels: the middle of the bottom of its picture. */
  readonly foot: Point;
  picture(time: TimeOfDay): HTMLCanvasElement | null;
  readonly w: number;
  readonly h: number;
}

const SIGN_ROWS = [
  'llllllllllllll',
  'lwwwwwwwwwwwwl',
  'lwkkwkwkkwkkwl',
  'lwwwwwwwwwwwwl',
  'lwkwkkwkwkkkwl',
  'lwwwwwwwwwwwwl',
  'llllllllllllll',
  '......lpl.....',
  '......lpl.....',
  '......lpl.....',
  '......lpl.....',
  '.....lpppl....',
];

const LANTERN_ROWS = ['..lll..', '.lyyyl.', '.lyoyl.', '.lyyyl.', '..lll..', '...p...', '...p...'];

const pieces = new Map<string, HTMLCanvasElement | null>();
function pieceCanvas(id: string, lines: readonly string[], time: TimeOfDay, lit: boolean) {
  const key = `${id} ${time}`;
  if (!pieces.has(key)) {
    const key2: Record<string, [Mat, number]> = {
      l: ['wood', 6],
      w: ['wood', 1],
      k: ['wood', 4],
      p: ['wood', 3],
      y: lit && time === 'dusk' ? ['lamp', 0] : ['glass', 2],
      o: lit && time === 'dusk' ? ['fire', 1] : ['glass', 3],
    };
    pieces.set(key, painted({ grid: rows(lines, key2), glows: [] }, time));
  }
  return pieces.get(key)!;
}

/** The boat's sign, on the quay by the mooring: a stand-in board until lane B's `boat_sign`. */
export const BOAT_SIGN: StandInPiece = {
  id: 'boat_sign',
  foot: { x: 14 * 24 + 12, y: 59 * 24 + 18 },
  w: SIGN_ROWS[0]!.length,
  h: SIGN_ROWS.length,
  picture: (time) => pieceCanvas('boat_sign', SIGN_ROWS, time, false),
};

/** The lantern on the boat's bow: a stand-in until lane B's boat lantern. */
export const BOAT_LANTERN: StandInPiece = {
  id: 'boat_lantern',
  foot: { x: 466, y: 1490 },
  w: LANTERN_ROWS[0]!.length,
  h: LANTERN_ROWS.length,
  picture: (time) => pieceCanvas('boat_lantern', LANTERN_ROWS, time, true),
};

/* ----- The cave ----- */

/** The Old Snapper's picture until lane B draws it: the giant crab's, by the art lane's id. */
export function foeArtId(monster: string): string {
  if (monster === 'old_snapper' && !foeSize2('old_snapper')) return 'giant_crab';
  return monster;
}

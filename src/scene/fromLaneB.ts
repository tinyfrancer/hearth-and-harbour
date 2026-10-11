/*
 * STAND-IN SEAM (lane B, wave 15). Everything this scene needs from lane B's
 * early PR that is not on `main` yet, in one place, so swapping the real
 * thing in is an edit to this file alone. Until then each part is a plain
 * stand-in, drawn here as simply as will read, never meant to ship as art:
 *
 * - the town's markers over tappable things (`townMarker2`) and the ring
 *   under the one a tap would use;
 * - the ferryman's figure (the docker's until lane B draws him), the boat's
 *   sign and its bow lantern;
 *
 * Lane B's first PR (#63) is in: the harbour chart, its pieces and route are
 * theirs (below, painted for the page), and the Old Snapper is drawn
 * (`foeArtId` gives his own id now that the art lane has a size for him).
 */
import {
  chartBoat2,
  chartDot2,
  chartEmblem2,
  chartMarker2,
  chartRoute2,
  harbourChart2,
  type ChartMarker2State,
  type ChartPiece2,
} from '../art/chart';
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

/**
 * Rows of characters to cells: each character a material and step by `key`,
 * `.` empty, each `k` art pixels square (a stand-in drawn big enough to read).
 */
function rows(
  lines: readonly string[],
  key: Readonly<Record<string, [Mat, number]>>,
  k = 1,
): TGrid {
  const g = tgrid(lines[0]!.length * k, lines.length * k);
  lines.forEach((line, y) =>
    [...line].forEach((ch, x) => {
      const c = key[ch];
      if (c) fill(g, x * k, y * k, k, k, c[0], c[1]);
    }),
  );
  return g;
}

/** How many art pixels square each cell of a stand-in marker or piece is. */
const STAND_IN_K = 2;

/* ----- The harbour chart (lane B's, B15) ----- */

/** A piece of the chart painted: its canvas and the point of it that goes on its spot (art pixels). */
export interface ChartPiece {
  readonly canvas: HTMLCanvasElement;
  readonly anchor: Point;
}

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
}

let chart: HarbourChart | null = null;

/** The harbour chart: lane B's map, painted by day (it is drawn for day only), kept. */
export function harbourChart(): HarbourChart {
  if (chart && (chart.canvas || !canPaint())) return chart;
  const art = harbourChart2();
  chart = {
    canvas: painted(art.picture, 'day'),
    width: art.width,
    height: art.height,
    landings: art.landings,
    home: art.home,
  };
  return chart;
}

const chartPieces = new Map<string, ChartPiece | null>();
function chartPiece(key: string, make: () => ChartPiece2 | null): ChartPiece | null {
  if (!chartPieces.has(key) || (!chartPieces.get(key) && canPaint())) {
    const p = make();
    const canvas = p ? painted(p.picture, 'day') : null;
    chartPieces.set(key, p && canvas ? { canvas, anchor: p.anchor } : null);
  }
  return chartPieces.get(key)!;
}

/** What the chart's marker is for each state a landing can be in, by lane A's states. */
const MARKER_STATE: Readonly<Record<string, ChartMarker2State>> = {
  open: 'open',
  cleared: 'cleared',
  locked: 'locked',
  soon: 'unknown',
  selected: 'selected',
};

/** A landing's marker for its state, or the ring round the one picked (`'selected'`). */
export function chartMarker(state: string): ChartPiece | null {
  const s = MARKER_STATE[state];
  return s ? chartPiece(`marker ${s}`, () => chartMarker2(s)) : null;
}

/** A dungeon's emblem beside its landing, flat ink while it is locked; null for one with none. */
export function chartEmblem(id: string, silhouette = false): ChartPiece | null {
  return chartPiece(`emblem ${id} ${silhouette}`, () => chartEmblem2(id, silhouette));
}

/** The rowboat that rows along the route, facing the way it goes. */
export function chartBoat(facing: 'left' | 'right' = 'right'): ChartPiece | null {
  return chartPiece(`boat ${facing}`, () => chartBoat2(facing));
}

/** One dot of a route. */
export function chartDot(): ChartPiece | null {
  return chartPiece('dot', () => chartDot2());
}

/** The route's dots from home to a landing, as lane B lays them. */
export function chartRoute(from: Point, to: Point): Point[] {
  return chartRoute2(from, to);
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
    // Somewhere new is the one to see from across the quay: half as big again.
    const g = rows(MARKER_ROWS[kind], MARKER_KEY, kind === 'new' ? STAND_IN_K + 1 : STAND_IN_K);
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
  /** The line it is sorted by among those standing. */
  readonly base: number;
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
    pieces.set(key, painted({ grid: rows(lines, key2, STAND_IN_K), glows: [] }, time));
  }
  return pieces.get(key)!;
}

/** The boat's sign, on the quay by the mooring: a stand-in board until lane B's `boat_sign`. */
export const BOAT_SIGN: StandInPiece = {
  id: 'boat_sign',
  foot: { x: 14 * 24 + 12, y: 59 * 24 + 18 },
  w: SIGN_ROWS[0]!.length * STAND_IN_K,
  h: SIGN_ROWS.length * STAND_IN_K,
  base: 59 * 24 + 18,
  picture: (time) => pieceCanvas('boat_sign', SIGN_ROWS, time, false),
};

/** The lantern on the boat's bow: a stand-in until lane B's boat lantern. */
export const BOAT_LANTERN: StandInPiece = {
  id: 'boat_lantern',
  foot: { x: 470, y: 1500 },
  w: LANTERN_ROWS[0]!.length * STAND_IN_K,
  h: LANTERN_ROWS.length * STAND_IN_K,
  // In front of the boat it hangs on.
  base: 1530,
  picture: (time) => pieceCanvas('boat_lantern', LANTERN_ROWS, time, true),
};

/* ----- The cave ----- */

/** The Old Snapper's picture until lane B draws it: the giant crab's, by the art lane's id. */
export function foeArtId(monster: string): string {
  if (monster === 'old_snapper' && !foeSize2('old_snapper')) return 'giant_crab';
  return monster;
}

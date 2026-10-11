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
import type { Picture2 } from '../art/town2/cells';
import { foeSize2 } from '../art/dungeonArt2';
import {
  townHighlight2,
  townMarker2,
  TOWN_MARKER2_FRAMES,
  TOWN_MARKER2_FRAME_MS,
  type TownMarker2,
  type TownMarker2Kind,
} from '../art/town2/markers';
import { ROWBOAT_LANTERN_AT, town2Facts, town2Piece } from '../art/town2/pieces';
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

/* ----- The town's markers and ring (lane B's, B15b) ----- */

/** What a marker over a tappable thing says it is for. */
export type MarkerKind = TownMarker2Kind;

/** How many frames a marker has, and how long each shows. */
export const MARKER_FRAMES = TOWN_MARKER2_FRAMES;
export const MARKER_FRAME_MS = TOWN_MARKER2_FRAME_MS;

/** A marker or the ring painted: its canvas and the point of it that goes on its spot. */
export interface TownMark {
  readonly canvas: HTMLCanvasElement;
  readonly anchor: Point;
}

const marks = new Map<string, TownMark | null>();
function townMark(key: string, make: () => TownMarker2, time: TimeOfDay): TownMark | null {
  const k = `${key} ${time}`;
  if (!marks.has(k) || (!marks.get(k) && canPaint())) {
    const m = make();
    const canvas = painted(m.picture, time);
    marks.set(k, canvas ? { canvas, anchor: m.anchor } : null);
  }
  return marks.get(k)!;
}

/** A marker for something tappable in town, by kind, at a frame of its bob and a time of day. */
export function townMarker(kind: MarkerKind, frame: number, time: TimeOfDay): TownMark | null {
  const f = ((frame % MARKER_FRAMES) + MARKER_FRAMES) % MARKER_FRAMES;
  return townMark(`marker ${kind} ${f}`, () => townMarker2(kind, f), time);
}

/** The ring round the thing a tap would use, `w` across, at a frame. */
export function townRing(w: number, frame: number, time: TimeOfDay): TownMark | null {
  const f = ((frame % MARKER_FRAMES) + MARKER_FRAMES) % MARKER_FRAMES;
  const width = Math.max(16, Math.round(w));
  return townMark(`ring ${width} ${f}`, () => townHighlight2(width, f), time);
}

/* ----- The ferryman, the boat's sign and its lantern (lane B's, B15b) ----- */

/** The ferryman's figure. */
export const FERRYMAN_FIGURE: Townsfolk2 = 'ferryman';

/** A town piece this scene places itself (the art lane's layout does not hold these). */
export interface StandInPiece {
  readonly id: string;
  /** Where its foot is, in town pixels: the middle of its foot on its base line. */
  readonly foot: Point;
  picture(time: TimeOfDay): HTMLCanvasElement | null;
  readonly w: number;
  readonly h: number;
  /** The line it is sorted by among those standing. */
  readonly base: number;
  /** Its picture's top-left, from its foot. */
  readonly offset: Point;
}

const pieces = new Map<string, HTMLCanvasElement | null>();
function placed(id: 'boat_sign' | 'boat_lantern', foot: Point, base: number): StandInPiece {
  const facts = town2Facts(id);
  return {
    id,
    foot,
    w: facts.w,
    h: facts.h,
    base,
    offset: { x: facts.foot, y: facts.base },
    picture: (time) => {
      const key = `${id} ${time}`;
      if (!pieces.has(key) || (!pieces.get(key) && canPaint()))
        pieces.set(key, painted(town2Piece(id).picture, time));
      return pieces.get(key)!;
    },
  };
}

/** Where the rowing boat's picture has its top-left (its placement, which lane B keeps). */
const BOAT_TOP_LEFT: Point = { x: 452, y: 1468 };

/**
 * The boat's sign, on the quay west of the ferryman, where it reads over the
 * boat from the square and keeps the way down to the boat open.
 */
export const BOAT_SIGN: StandInPiece = placed(
  'boat_sign',
  { x: 14 * 24 + 12, y: 59 * 24 + 22 },
  59 * 24 + 22,
);

/** The lantern in the boat's bow: drawn right after the boat (it is in it). */
export const BOAT_LANTERN: StandInPiece = placed(
  'boat_lantern',
  { x: BOAT_TOP_LEFT.x + ROWBOAT_LANTERN_AT.x, y: BOAT_TOP_LEFT.y + ROWBOAT_LANTERN_AT.y },
  1523,
);

/* ----- The cave ----- */

/** The Old Snapper's picture until lane B draws it: the giant crab's, by the art lane's id. */
export function foeArtId(monster: string): string {
  if (monster === 'old_snapper' && !foeSize2('old_snapper')) return 'giant_crab';
  return monster;
}

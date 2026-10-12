/*
 * What this scene takes from lane B, in one place: the harbour chart and its
 * pieces (B15), the town's markers, ring and edge-of-screen pointer (B15b,
 * B16), the ferryman, the boat's sign and its bow lantern, painted for the
 * page. Lane B's B16 markers (a `'large'` size, `townPointer2`) are read
 * through a local signature (`laneB` below), so this scene ran on `main`
 * before they landed: a small marker and a pointer of its own until then.
 */
import {
  chartBoat2,
  chartDot2,
  chartEmblem2,
  chartMarker2,
  chartPennant2,
  chartRoute2,
  CHART_PENNANT2_FRAME_MS,
  CHART_PENNANT2_FRAMES,
  harbourChart2,
  type ChartMarker2State,
  type ChartPiece2,
} from '../art/chart';
import type { Picture2 } from '../art/town2/cells';
import { dungeonSeal } from '../art/dungeonIcons';
import { foeSize2 } from '../art/dungeonArt2';
import * as markers2 from '../art/town2/markers';
import {
  townHighlight2,
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

/** How big a marker is: lane B's quiet one, or the larger one for across the square (B16). */
export type MarkerSize = 'small' | 'large';

/**
 * Lane B's markers as wave 16 has them: `townMarker2` with a third, optional
 * size (B16's first PR), and `townPointer2`, a chevron for the screen's edge.
 * Read through a local signature so this scene type-checks and runs whether
 * or not that PR is on `main`: before it, the size is ignored (a small
 * marker comes back) and there is no pointer (this scene draws its own).
 */
const laneB = markers2 as unknown as {
  townMarker2(kind: TownMarker2Kind, frame?: number, size?: MarkerSize): TownMarker2;
  townPointer2?(direction: PointerDirection, frame?: number): TownMarker2;
  TOWN_POINTER2_DIRECTIONS?: readonly string[];
};

/**
 * Whether lane B's chevrons point eight ways (wave 17 adds the four
 * diagonals to `townPointer2`); else the pointer picks the nearest of four.
 */
export function diagonalPointersIn(): boolean {
  return laneB.TOWN_POINTER2_DIRECTIONS?.includes('up-left') === true;
}

/** Whether lane B's larger marker is in (else a `'large'` marker is the small one). */
export function largeMarkersIn(): boolean {
  return typeof laneB.townPointer2 === 'function';
}

/** A marker for something tappable in town, by kind, at a frame of its bob and a time of day. */
export function townMarker(
  kind: MarkerKind,
  frame: number,
  time: TimeOfDay,
  size: MarkerSize = 'small',
): TownMark | null {
  const f = ((frame % MARKER_FRAMES) + MARKER_FRAMES) % MARKER_FRAMES;
  return size === 'large'
    ? townMark(`marker ${kind} ${f} large`, () => laneB.townMarker2(kind, f, 'large'), time)
    : townMark(`marker ${kind} ${f}`, () => laneB.townMarker2(kind, f), time);
}

/** Which way the edge-of-screen pointer points: four ways, and the diagonals once lane B draws them. */
export type PointerDirection =
  'left' | 'right' | 'up' | 'down' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

/** Lane B's edge-of-screen chevron (B16), or null before it is in (the scene draws a plain one). */
export function townPointer(
  direction: PointerDirection,
  frame: number,
  time: TimeOfDay,
): TownMark | null {
  const make = laneB.townPointer2;
  if (!make) return null;
  // A diagonal only where lane B draws one.
  if (direction.includes('-') && !diagonalPointersIn()) return null;
  const f = ((frame % MARKER_FRAMES) + MARKER_FRAMES) % MARKER_FRAMES;
  return townMark(`pointer ${direction} ${f}`, () => make(direction, f), time);
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

/* ----- Dungeon replay (lane B's B17a): modifier and challenge icons, medals, the pennant ----- */

export {
  CHALLENGE_MEDAL_FRAME_MS,
  CHALLENGE_MEDAL_FRAMES,
  challengeIcon,
  challengeMedal,
  modifierIcon,
} from '../art/dungeonIcons';

/** How often the chart's pennant flutters a frame. */
export const PENNANT_FRAME_MS = CHART_PENNANT2_FRAME_MS;

/** The chart's pennant for a landing with a modifier today, at a frame of its flutter. */
export function chartPennant(frame = 0): ChartPiece | null {
  const f = ((frame % CHART_PENNANT2_FRAMES) + CHART_PENNANT2_FRAMES) % CHART_PENNANT2_FRAMES;
  return chartPiece(`pennant ${f}`, () => chartPennant2(f));
}

/** A dungeon's seal (lane B's `dungeonSeal`, B17a): bronze once cleared, gold with every challenge done. */
export function chartSeal(id: string, tier: 'cleared' | 'all-challenges'): ChartPiece | null {
  return chartPiece(`seal ${id} ${tier}`, () => dungeonSeal(id, tier));
}

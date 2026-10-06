/*
 * Everything heavy about the town, worked out where it will not stop the
 * page: in a worker (`town2Worker.ts`) where the browser has one, on the
 * spot where it has not (tests). Two parts:
 *
 * - The facts (`town2Facts`): the scene to walk in, every light, where the
 *   smoke and the gulls are. The art lane's layout draws every piece to
 *   know its size, about a second on a slow phone, so the page never asks
 *   for the layout itself: it is handed these, as plain data.
 * - The paint (`paintTown`) for a time of day: the ground with every
 *   person's contact shadow laid into it, every standing piece, the moved
 *   foam, the smoke's frames, the gull, the townsfolk facing either way, and
 *   the ground's cells, from which the hero's shadow is cut as he walks.
 *
 * All of it pure arithmetic on typed arrays. The worker turns the pixels
 * into bitmaps; the page only shows them.
 */
import type { Glow } from '../art/raster';
import { tgrid } from '../art/town2/cells';
import { town2Facts as pieceFacts, town2Piece } from '../art/town2/pieces';
import { town2Ground, town2Layout, TOWN2_H, TOWN2_W, type Placement2 } from '../art/town2/town';
import type { TimeOfDay } from './daylight';
import {
  FIGURE2_ANCHOR_X,
  FIGURE2_H,
  FIGURE2_SOLE_Y,
  FIGURE2_W,
  townsfolkFigure2,
} from './figures2';
import type { Raw } from './figures2';
import { standing as standingPose } from './gait';
import type { Facing } from './play';
import { layShadow } from './shadow2';
import type { Box, Scene } from './things';
import { feetOf, TOWNSFOLK2_AT, town2Scene } from './town2';
import {
  cellPixels,
  foamBand,
  glowsIn,
  palette2,
  pixels1,
  reaches,
  shiftedFoam,
  SMOKE_FRAMES,
  smokeFrame,
  townLights,
} from './town2Paint';

export type { Raw } from './figures2';

/** A gull's lazy loop: centre, half-width and half-height, a lap's length and where it starts. */
export interface GullLoop {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly lapMs: number;
  readonly start: number;
  readonly turn: 1 | -1;
}

/** Each gull the art lane placed circles where it was placed. */
export function gullLoop(p: Placement2, i: number): GullLoop {
  const piece = pieceFacts(p.id);
  return {
    x: p.x + Math.round(piece.w / 2),
    y: p.y + Math.round(piece.h / 2),
    rx: 70 - i * 8,
    ry: 20 - i * 2,
    lapMs: 26000 + i * 5000,
    start: [0.1, 0.6, 0.3][i % 3]!,
    turn: i % 2 ? -1 : 1,
  };
}

/** What the page needs to know about the town, beside its pixels. Plain data. */
export interface TownFacts {
  readonly scene: Scene;
  /** Every lamp, window and fire, in town pixels: what lights the hero at dusk. */
  readonly lights: readonly Glow[];
  /** Where each chimney's smoke stands (its frames come painted). */
  readonly smoke: readonly { readonly x: number; readonly y: number }[];
  /** Each gull's loop, and the gull's size. */
  readonly gulls: readonly GullLoop[];
  readonly gull: { readonly w: number; readonly h: number };
}

const isGull = (p: Placement2): boolean => p.id === 'gull';
const isSmoke = (p: Placement2): boolean => p.layer === 'above' && !isGull(p);

/** The town's facts, from the art lane's layout. */
export function town2Facts(): TownFacts {
  const gull = pieceFacts('gull');
  return {
    scene: town2Scene(),
    lights: townLights(),
    smoke: town2Layout()
      .filter(isSmoke)
      .map((p) => ({ x: p.x, y: p.y })),
    gulls: town2Layout().filter(isGull).map(gullLoop),
    gull: { w: gull.w, h: gull.h },
  };
}

/** Everything that stands, in depth order: which of `pieces` it is, and where. */
export interface Standing2 {
  readonly piece: number;
  readonly x: number;
  readonly y: number;
  readonly base: number;
}

/** One picture each way. */
export interface Facings<I> {
  readonly right: I | null;
  readonly left: I | null;
}

/** A townsperson each way, breathing out (as drawn) and, if painted, in. */
export interface Folk<I> extends Facings<I> {
  readonly inhale?: Facings<I>;
}

/**
 * The town painted for one time of day. `I` is how a picture travels: `Raw`
 * pixels as worked out, or a bitmap once a worker has put them on one.
 */
export interface TownPaint<I> {
  readonly time: TimeOfDay;
  /**
   * The still: with every standing piece already drawn on it (`composed`, as
   * a worker sends it), or the ground alone, for the page to draw them on.
   */
  readonly composed: boolean;
  readonly still: I;
  /** Each standing piece's picture: one per piece where no light reaches it, one per placement where one does. */
  readonly pieces: readonly I[];
  readonly standing: readonly Standing2[];
  /** The foam moved along, laid over the shore every other beat. */
  readonly foam: { readonly x: number; readonly y: number; readonly image: I };
  /** Each chimney's smoke, frame by frame, in the order of the facts' `smoke`. */
  readonly smoke: readonly (readonly I[])[];
  readonly gull: Facings<I>;
  /** Each of the townsfolk, in the order of `TOWNSFOLK2_AT`, lit where they stand. */
  readonly folk: readonly Folk<I>[];
  /** The ground's cells, shadows and all: what the hero's shadow darkens as he walks. */
  readonly cells: Int16Array;
}

/** What the page asks a worker for. */
export interface TownRequest {
  readonly time: TimeOfDay;
  readonly facts: boolean;
}

/** How far the work has got, of `STEPS`: shown on the scene while it waits. */
export type TownStep = 1 | 2 | 3;
export const STEPS = 3;

/**
 * What comes back, in this order: the facts (if asked), steps, then the town
 * (`kept` if it was kept from an earlier visit rather than worked out); or
 * that the worker failed, and the page must work the town out itself.
 */
export type TownAnswer =
  | { readonly kind: 'facts'; readonly facts: TownFacts }
  | { readonly kind: 'step'; readonly step: TownStep }
  | {
      readonly kind: 'town';
      readonly paint: TownPaint<ImageBitmap | Raw>;
      readonly kept?: boolean;
    }
  | { readonly kind: 'failed' };

/** How many rows of the ground are turned into colours at a time: a strip's colours are 1.5 MB. */
const STRIP = 128;

/** Rows `y0` to `y0 + h` of a grid, as a picture of their own, with the glows moved to match. */
function rowsOf(d: Int16Array, glows: readonly Glow[], y0: number, h: number) {
  const box = { x: 0, y: y0, w: TOWN2_W, h };
  return {
    grid: { w: TOWN2_W, h, d: d.subarray(y0 * TOWN2_W, (y0 + h) * TOWN2_W) },
    glows: glows.filter((g) => reaches(g, box)).map((g) => ({ ...g, y: g.y - y0 })),
  };
}

/** A picture's pixels as `Raw`. */
const raw = (w: number, h: number, data: Uint8ClampedArray): Raw => ({ w, h, data });

/** The person standing at feet `feet` facing either way: where their canvas goes, and its box. */
function figureBox(feet: { x: number; y: number }, facing: Facing): Box {
  const ax = facing === 'left' ? FIGURE2_W - 1 - FIGURE2_ANCHOR_X : FIGURE2_ANCHOR_X;
  return { x: feet.x - ax, y: feet.y - FIGURE2_SOLE_Y, w: FIGURE2_W, h: FIGURE2_H };
}

/** Where a townsperson's canvas stands, facing either way. */
export function folkBox(i: number, facing: Facing): Box {
  return figureBox(feetOf(TOWNSFOLK2_AT[i]!), facing);
}

/**
 * The whole town painted for a time of day: the ground (lane B's, with each
 * townsperson's shadow laid in), every standing piece in depth order, each
 * lit by every light that reaches it, as the art lane's `town2Picture` lights
 * the town at once; the foam, the smoke, the gull and the townsfolk. Never a
 * whole-town buffer of colours (98 MB at the art lane's eight bytes a
 * channel): the ground is coloured a strip at a time.
 */
export function paintTown(time: TimeOfDay, progress?: (step: TownStep) => void): TownPaint<Raw> {
  const palette = palette2(time);
  const pic = town2Ground(time);
  progress?.(2);
  // Lane B keeps its ground: the shadows are laid into a copy, which goes to the page for the hero's.
  const cells = pic.grid.d.slice();
  const grid = { w: TOWN2_W, h: TOWN2_H, d: cells };
  for (const p of TOWNSFOLK2_AT) layShadow(grid, feetOf(p), time);
  const ground = new Uint8ClampedArray(TOWN2_W * TOWN2_H * 4);
  for (let y0 = 0; y0 < TOWN2_H; y0 += STRIP) {
    const h = Math.min(STRIP, TOWN2_H - y0);
    const strip = rowsOf(cells, pic.glows, y0, h);
    ground.set(pixels1(strip, palette), y0 * TOWN2_W * 4);
  }
  progress?.(3);

  const lights = townLights();
  const pieces: Raw[] = [];
  const shared = new Map<string, number>();
  const standing: Standing2[] = [];
  for (const p of town2Layout()) {
    if (p.layer !== 'stand') continue;
    const piece = town2Piece(p.id);
    const lit = glowsIn(lights, { x: p.x, y: p.y, w: piece.w, h: piece.h }, palette);
    let index = lit.length ? undefined : shared.get(p.id);
    if (index === undefined) {
      index = pieces.length;
      const data = cellPixels({ grid: piece.picture.grid, glows: lit }, palette);
      pieces.push(raw(piece.w, piece.h, data));
      if (!lit.length) shared.set(p.id, index);
    }
    standing.push({ piece: index, x: p.x, y: p.y, base: p.base });
  }

  const { grid: foamGrid, band } = shiftedFoam(pic.grid);
  const foamData = cellPixels(
    { grid: foamGrid, glows: glowsIn(pic.glows, band, palette) },
    palette,
  );

  const smoke = town2Layout()
    .filter(isSmoke)
    .map((p) => {
      const src = town2Piece(p.id).picture.grid;
      return Array.from({ length: SMOKE_FRAMES }, (_, f) =>
        raw(src.w, src.h, cellPixels({ grid: smokeFrame(src, f), glows: [] }, palette)),
      );
    });

  const g = town2Piece('gull').picture.grid;
  const flipped = tgrid(g.w, g.h);
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) flipped.d[y * g.w + (g.w - 1 - x)] = g.d[y * g.w + x]!;
  const gull = {
    right: raw(g.w, g.h, cellPixels({ grid: g, glows: [] }, palette)),
    left: raw(g.w, g.h, cellPixels({ grid: flipped, glows: [] }, palette)),
  };

  const folk = TOWNSFOLK2_AT.map((p, i) => {
    const figure = townsfolkFigure2(p.figure);
    const stand = (facing: Facing, breath: number): Raw | null => {
      if (!figure) return null;
      const box = folkBox(i, facing);
      return figure.pixels(standingPose(facing, breath), time, glowsIn(lights, box, palette));
    };
    return {
      right: stand('right', 0),
      left: stand('left', 0),
      inhale: { right: stand('right', 1), left: stand('left', 1) },
    };
  });

  return {
    time,
    composed: false,
    still: raw(TOWN2_W, TOWN2_H, ground),
    pieces,
    standing,
    foam: { x: band.x, y: band.y, image: raw(band.w, band.h, foamData) },
    smoke,
    gull,
    folk,
    cells,
  };
}

/** The band the foam moves in: for the page, which never computes the shore. */
export { foamBand };

/** Every buffer in a painted town, to hand from a worker to the page without copying. */
export function buffersOf(paint: TownPaint<Raw>): ArrayBuffer[] {
  const all: Raw[] = [
    paint.still,
    ...paint.pieces,
    paint.foam.image,
    ...paint.smoke.flat(),
    ...[paint.gull.right, paint.gull.left].filter((r): r is Raw => r !== null),
    ...paint.folk
      .flatMap((f) => [f.right, f.left, f.inhale?.right ?? null, f.inhale?.left ?? null])
      .filter((r): r is Raw => r !== null),
  ];
  return [...all.map((r) => r.data.buffer as ArrayBuffer), paint.cells.buffer as ArrayBuffer];
}

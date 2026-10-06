/*
 * The C-scale town's heavy pixels, as pure arithmetic with no canvas, so it
 * can run off the main thread (`town2Worker.ts`) as well as on it: the
 * ground for a time of day turned into RGBA in strips, the shore's foam
 * moved along, and the lights. Composing the ground's cells is the art
 * lane's (`town2Ground`) and takes over a second on a fast machine, several
 * on a slow phone; done here in a worker, the town keeps moving meanwhile.
 */
import { shines, type Glow } from '../art/raster';
import { cell, isMat, stepOf, tgrid, type Picture2, type TGrid } from '../art/town2/cells';
import { town2Piece } from '../art/town2/pieces';
import { DAY2, DUSK2, type Palette2 } from '../art/town2/ramps';
import { rasterize2 } from '../art/town2/raster';
import { shoreAt, town2Ground, town2Layout, TOWN2_H, TOWN2_W } from '../art/town2/town';
import type { TimeOfDay } from './daylight';
import type { Box } from './things';

export const palette2 = (time: TimeOfDay): Palette2 => (time === 'day' ? DAY2 : DUSK2);

/** Whether a glow's light reaches into a box. */
function reaches(glow: Glow, box: Box): boolean {
  const nx = Math.max(box.x, Math.min(glow.x, box.x + box.w));
  const ny = Math.max(box.y, Math.min(glow.y, box.y + box.h));
  return Math.hypot(glow.x - nx, glow.y - ny) < glow.radius;
}

/** The glows that shine in this palette and reach a box, moved into the box's own pixels. */
export function glowsIn(glows: readonly Glow[], box: Box, palette: Palette2): Glow[] {
  return glows
    .filter((g) => shines(g, palette) && reaches(g, box))
    .map((g) => ({ ...g, x: g.x - box.x, y: g.y - box.y }));
}

let lights: readonly Glow[] | null = null;

/**
 * Every light in town, in town pixels: every placed piece's glows, as the
 * art lane gathers them for its ground. Worked out from the layout, without
 * composing the ground.
 */
export function townLights(): readonly Glow[] {
  lights ??= town2Layout().flatMap((p) =>
    town2Piece(p.id).picture.glows.map((g) => ({ ...g, x: g.x + p.x, y: g.y + p.y })),
  );
  return lights;
}

/**
 * A picture's pixels, lit by its glows, with empty cells left empty: light
 * past a piece's edge is a halo, and the ground beneath it is lit already.
 */
export function cellPixels(pic: Picture2, palette: Palette2): Uint8ClampedArray {
  const image = rasterize2(pic, palette, 1);
  const d = pic.grid.d;
  for (let i = 0; i < d.length; i++) if (!d[i]) image.data[i * 4 + 3] = 0;
  return image.data;
}

/** How many rows of the ground are turned into colours at a time: a strip's colours are 1.5 MB. */
const STRIP = 128;

/** Rows `y0` to `y0 + h` of a picture, as a picture of their own with its glows moved to match. */
function rowsOf(pic: Picture2, y0: number, h: number): Picture2 {
  const { w } = pic.grid;
  const box = { x: 0, y: y0, w, h };
  return {
    grid: { w, h, d: pic.grid.d.subarray(y0 * w, (y0 + h) * w) },
    glows: pic.glows.filter((g) => reaches(g, box)).map((g) => ({ ...g, y: g.y - y0 })),
  };
}

/** A standing piece's pixels: one per piece where no light reaches it, one per placement where one does. */
export interface PiecePixels {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;
}

/** Everything that stands, in depth order: which of `pieces` it is, and where. */
export interface Standing2 {
  readonly piece: number;
  readonly x: number;
  readonly y: number;
  readonly base: number;
}

/** The town's pixels for one time of day, one pixel per art pixel. */
export interface Ground2Pixels {
  readonly time: TimeOfDay;
  /** The ground, `TOWN2_W` x `TOWN2_H`, row by row. */
  readonly ground: Uint8ClampedArray;
  /** The foam moved along, over `band` (transparent where nothing changes). */
  readonly foam: { readonly band: Box; readonly data: Uint8ClampedArray };
  readonly pieces: readonly PiecePixels[];
  readonly standing: readonly Standing2[];
}

/** Every buffer in a town's pixels, to hand from a worker to the page without copying. */
export function buffersOf(px: Ground2Pixels): ArrayBuffer[] {
  return [px.ground, px.foam.data, ...px.pieces.map((p) => p.data)].map(
    (d) => d.buffer as ArrayBuffer,
  );
}

/**
 * Every standing piece's pixels in depth order, each lit by every light that
 * reaches it, as the art lane's `town2Picture` lights the whole town at once.
 * Pieces no light reaches share one picture per piece; lit ones have their own.
 */
function standingPixels(time: TimeOfDay): Pick<Ground2Pixels, 'pieces' | 'standing'> {
  const palette = palette2(time);
  const glows = townLights();
  const pieces: PiecePixels[] = [];
  const shared = new Map<string, number>();
  const standing: Standing2[] = [];
  for (const p of town2Layout()) {
    if (p.layer !== 'stand') continue;
    const piece = town2Piece(p.id);
    const lit = glowsIn(glows, { x: p.x, y: p.y, w: piece.w, h: piece.h }, palette);
    let index = lit.length ? undefined : shared.get(p.id);
    if (index === undefined) {
      index = pieces.length;
      pieces.push({
        w: piece.w,
        h: piece.h,
        data: cellPixels({ grid: piece.picture.grid, glows: lit }, palette),
      });
      if (!lit.length) shared.set(p.id, index);
    }
    standing.push({ piece: index, x: p.x, y: p.y, base: p.base });
  }
  return { pieces, standing };
}

/**
 * The art lane's ground for a time of day (with every shadow, the pier and
 * the net, lit by every light) as pixels. Turned into colours a strip at a
 * time, so there is never a whole-town buffer of colours (98 MB at the
 * art lane's eight bytes a channel), only the 12 MB of pixels.
 */
export function groundPixels(time: TimeOfDay): Ground2Pixels {
  const palette = palette2(time);
  const pic = town2Ground(time);
  const ground = new Uint8ClampedArray(TOWN2_W * TOWN2_H * 4);
  for (let y0 = 0; y0 < TOWN2_H; y0 += STRIP) {
    const h = Math.min(STRIP, TOWN2_H - y0);
    ground.set(rasterize2(rowsOf(pic, y0, h), palette, 1).data, y0 * TOWN2_W * 4);
  }
  const { grid, band } = shiftedFoam(pic.grid);
  const data = cellPixels({ grid, glows: glowsIn(pic.glows, band, palette) }, palette);
  return { time, ground, foam: { band, data }, ...standingPixels(time) };
}

/* ----- The shore's foam ----- */

/** How far along the shore the foam moves between its two states. */
export const FOAM_SHIFT = 5;

/** Whether foam breaks at column `x` and row `j` below the waterline, `shift` along. */
function foamAt(x: number, j: number, shift: number): boolean {
  const u = x + shift;
  const wave = Math.sin(u * 0.55) + Math.sin(u * 0.19) + Math.sin(u * 0.07 + j);
  return wave > 0.3 + j * 0.9;
}

/** The band along the shore that foam may change, in art pixels. */
export function foamBand(): Box {
  let top = TOWN2_H;
  let bottom = 0;
  for (let x = 0; x < TOWN2_W; x++) {
    top = Math.min(top, shoreAt(x) - 2);
    bottom = Math.max(bottom, shoreAt(x) + 6);
  }
  return { x: 0, y: top, w: TOWN2_W, h: bottom - top };
}

/**
 * The shore's foam moved along: in the band by the waterline, every cell of
 * sea within a few rows of the shore washed to plain water and foam laid
 * again `FOAM_SHIFT` pixels along. Only cells that change are set, and only
 * on water, so the pier and boats lying over the shore are untouched. Shown
 * in turn with the foam as painted, it reads as the sea moving.
 */
export function shiftedFoam(ground: TGrid): { grid: TGrid; band: Box } {
  const band = foamBand();
  const out = tgrid(band.w, band.h);
  for (let x = 0; x < band.w; x++) {
    const s = shoreAt(x);
    for (let j = -1; j < 5; j++) {
      const y = s + j;
      const was = ground.d[y * ground.w + x] ?? 0;
      if (!isMat(was, 'sea')) continue;
      const foam = j >= 0 && j < 3 && foamAt(x, j, FOAM_SHIFT);
      const next = foam ? cell('sea', j === 0 ? 0 : 1) : stepOf(was) <= 1 ? cell('sea', 2) : was;
      if (next !== was) out.d[(y - band.y) * band.w + x] = next;
    }
  }
  return { grid: out, band };
}

/* ----- Chimney smoke ----- */

/** Frames in a plume's sway. */
export const SMOKE_FRAMES = 6;
/** How far the top of a plume rises and leans, frame by frame; the chimney's mouth stays put. */
const SMOKE_RISE = [0, 1, 2, 3, 2, 1] as const;
const SMOKE_LEAN = [0, 1, 2, 2, 1, 0] as const;

/**
 * A plume swaying in the breeze: frame `f` of the art lane's smoke with each
 * row moved up and over in proportion to its height above the chimney, so
 * the mouth never moves and the loop has no jump.
 */
export function smokeFrame(src: TGrid, f: number): TGrid {
  const out = tgrid(src.w, src.h);
  const rise = SMOKE_RISE[f % SMOKE_FRAMES]!;
  const lean = SMOKE_LEAN[f % SMOKE_FRAMES]!;
  for (let y = 0; y < src.h; y++) {
    const up = 1 - y / src.h;
    const ty = y - Math.round(rise * up);
    const dx = Math.round(lean * up);
    if (ty < 0) continue;
    for (let x = 0; x < src.w; x++) {
      const c = src.d[y * src.w + x]!;
      const tx = x + dx;
      if (c && tx < src.w) out.d[ty * src.w + tx] = c;
    }
  }
  return out;
}

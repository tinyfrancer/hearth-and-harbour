/*
 * The part of the scene engine that touches a canvas. It is kept thin: where
 * things are, what order they stand in, what the camera sees and how big a
 * pixel is are all worked out by pure functions elsewhere, and this only puts
 * pixels where they say.
 *
 * Everything that never moves (the ground and every thing standing on it) is
 * composed once per palette into one picture of the whole map. A frame copies
 * the part of it the camera sees, then draws over it only what moves (the
 * walker, his shadow, smoke, gulls) and the few standing things that must be
 * drawn again because they stand in front of someone who moves where they
 * overlap. A patch of the frame can be redrawn the same way on its own, so a gull
 * crossing the sky repaints a few pixels round the gull, not the screen.
 */
import type { Palette } from '../art/palette';
import { rasterize, type Picture } from '../art/raster';
import type { Box } from './things';
import type { Point } from './tileMap';

/**
 * Each picture becomes pixels once per palette, one canvas pixel per art
 * pixel, and is then copied at the scene's scale every frame. Kept for the
 * page's life, so coming back to a scene does not paint it again.
 */
const painted = new WeakMap<Picture, Map<Palette['name'], HTMLCanvasElement | null>>();

/** A picture in a palette, on a canvas of its own; null where the browser cannot draw. */
export function canvasOf(pic: Picture, palette: Palette): HTMLCanvasElement | null {
  let byPalette = painted.get(pic);
  if (!byPalette) {
    byPalette = new Map();
    painted.set(pic, byPalette);
  }
  if (byPalette.has(palette.name)) return byPalette.get(palette.name)!;
  const canvas = paint(pic, palette);
  byPalette.set(palette.name, canvas);
  return canvas;
}

function paint(pic: Picture, palette: Palette): HTMLCanvasElement | null {
  if (typeof ImageData === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = pic.grid.w;
  canvas.height = pic.grid.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const image = rasterize(pic, palette, 1);
  // A light around a standing thing also lights the empty pixels about it (a
  // halo). The same light is already on the ground beneath, so the halo is
  // dropped here rather than added twice.
  pic.grid.d.forEach((cell, i) => {
    if (!cell) image.data[i * 4 + 3] = 0;
  });
  ctx.putImageData(new ImageData(image.data as Uint8ClampedArray<ArrayBuffer>, image.width), 0, 0);
  return canvas;
}

/** Something to copy onto the frame, with its top-left at whole art pixels. */
export interface Placed {
  readonly image: HTMLCanvasElement;
  readonly x: number;
  readonly y: number;
}

/** A standing thing, placed, with the line it sorts by. */
export interface Standing extends Placed {
  readonly base: number;
}

/** The box a placed image covers, in art pixels. */
export function boxOf(p: Placed): Box {
  return { x: p.x, y: p.y, w: p.image.width, h: p.image.height };
}

/**
 * The whole map as it stands with nobody walking: the ground, then every
 * standing thing in depth order. Made once per palette and kept.
 */
export function compose(
  ground: HTMLCanvasElement,
  standing: readonly Standing[],
): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = ground.width;
  canvas.height = ground.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(ground, 0, 0);
  for (const s of [...standing].sort((a, b) => a.base - b.base)) ctx.drawImage(s.image, s.x, s.y);
  return canvas;
}

export interface Frame {
  /** What shows past the map's edges. */
  readonly backdrop: string;
  readonly scale: number;
  readonly camera: Point;
  /** The map with everything that stands still on it (`compose`). */
  readonly still: HTMLCanvasElement;
  /** Every standing thing, already in `still`, in depth order. */
  readonly standing: readonly Standing[];
  /** Laid on the ground over `still`: the walker's shadow, foam. */
  readonly underfoot: readonly Placed[];
  /** Where a walk on open ground ends, if one is under way. */
  readonly target: Point | null;
  readonly marker: { readonly light: string; readonly ink: string };
  /**
   * Whoever is not in `still` because they move: the walker (and, in a
   * dungeon, whatever comes for him). Each with the line their feet are on.
   */
  readonly actors: readonly Standing[];
  /** Over everything: smoke, gulls. */
  readonly above: readonly Placed[];
  /** Drawn on the ground after what is laid there, before anyone standing: a fight's marks. */
  readonly ground?: ((ctx: CanvasRenderingContext2D) => void) | undefined;
  /** Drawn last, over everything: a fight's health bars and numbers. */
  readonly over?: ((ctx: CanvasRenderingContext2D) => void) | undefined;
}

/** The box the end-of-walk marker covers. */
export function markerBox(at: Point): Box {
  return { x: Math.round(at.x) - 3, y: Math.round(at.y) - 3, w: 7, h: 7 };
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * What must be drawn again over a patch: the boxes where the still picture
 * is wrong there (under the actors and whatever is laid on the ground), and
 * the standing things that cross those boxes, with the actors among them in
 * depth order. They are drawn clipped to those boxes, so a thing drawn again
 * never lands on one in front of it anywhere else.
 */
export function redrawn(frame: Frame, patch: Box): { boxes: Box[]; list: Standing[] } {
  const boxes: Box[] = [
    ...frame.underfoot.map(boxOf),
    ...(frame.target ? [markerBox(frame.target)] : []),
    ...frame.actors.map(boxOf),
  ].filter((b) => overlaps(b, patch));
  if (boxes.length === 0) return { boxes, list: [] };
  const list: Standing[] = frame.standing.filter((s) => {
    const box = boxOf(s);
    return overlaps(box, patch) && boxes.some((m) => overlaps(m, box));
  });
  for (const actor of frame.actors) {
    if (!overlaps(boxOf(actor), patch)) continue;
    // After anything level with the actor's feet, so the actor is in front.
    const at = list.findIndex((s) => s.base > actor.base);
    list.splice(at === -1 ? list.length : at, 0, actor);
  }
  return { boxes, list };
}

/**
 * Draws one patch of the frame (a box in art pixels, whole numbers), or all
 * of it. Every position is a whole art pixel and the scale whole, so nothing
 * blurs or shimmers.
 */
export function drawFrame(ctx: CanvasRenderingContext2D, frame: Frame, patch: Box): void {
  const { scale, camera, still } = frame;
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, -camera.x * scale, -camera.y * scale);
  ctx.imageSmoothingEnabled = false;
  ctx.beginPath();
  ctx.rect(patch.x, patch.y, patch.w, patch.h);
  ctx.clip();
  const x0 = Math.max(0, patch.x);
  const y0 = Math.max(0, patch.y);
  const x1 = Math.min(still.width, patch.x + patch.w);
  const y1 = Math.min(still.height, patch.y + patch.h);
  if (x0 > patch.x || y0 > patch.y || x1 < patch.x + patch.w || y1 < patch.y + patch.h) {
    ctx.fillStyle = frame.backdrop;
    ctx.fillRect(patch.x, patch.y, patch.w, patch.h);
  }
  if (x1 > x0 && y1 > y0) ctx.drawImage(still, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  for (const p of frame.underfoot) if (overlaps(boxOf(p), patch)) ctx.drawImage(p.image, p.x, p.y);
  if (frame.target && overlaps(markerBox(frame.target), patch))
    drawTarget(ctx, frame.target, frame.marker);
  frame.ground?.(ctx);
  const { boxes, list } = redrawn(frame, patch);
  if (list.length > 0) {
    ctx.save();
    ctx.beginPath();
    for (const b of boxes) ctx.rect(b.x, b.y, b.w, b.h);
    ctx.clip();
    for (const s of list) ctx.drawImage(s.image, s.x, s.y);
    ctx.restore();
  }
  for (const p of frame.above) if (overlaps(boxOf(p), patch)) ctx.drawImage(p.image, p.x, p.y);
  frame.over?.(ctx);
  ctx.restore();
}

/** A small cross on the ground where the walk ends. */
function drawTarget(ctx: CanvasRenderingContext2D, at: Point, colours: Frame['marker']): void {
  const x = Math.round(at.x);
  const y = Math.round(at.y);
  ctx.fillStyle = colours.ink;
  ctx.fillRect(x - 3, y - 1, 7, 3);
  ctx.fillRect(x - 1, y - 3, 3, 7);
  ctx.fillStyle = colours.light;
  ctx.fillRect(x - 2, y, 5, 1);
  ctx.fillRect(x, y - 2, 1, 5);
}

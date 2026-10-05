/*
 * The part of the scene engine that touches a canvas. It is kept thin: where
 * things are, what order they stand in, what the camera sees and how big a
 * pixel is are all worked out by pure functions elsewhere, and this only puts
 * pixels where they say.
 */
import type { Palette } from '../art/palette';
import { rasterize, type Picture } from '../art/raster';
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

const mirrors = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

/** The same canvas flipped left to right: a walker facing the other way. */
export function mirrorOf(source: HTMLCanvasElement): HTMLCanvasElement {
  let flipped = mirrors.get(source);
  if (!flipped) {
    flipped = document.createElement('canvas');
    flipped.width = source.width;
    flipped.height = source.height;
    const ctx = flipped.getContext('2d');
    if (ctx) {
      ctx.setTransform(-1, 0, 0, 1, source.width, 0);
      ctx.drawImage(source, 0, 0);
    }
    mirrors.set(source, flipped);
  }
  return flipped;
}

/** Something to copy onto the frame, with its top-left at whole art pixels. */
export interface Placed {
  readonly image: HTMLCanvasElement;
  readonly x: number;
  readonly y: number;
}

export interface Frame {
  /** What shows past the map's edges. */
  readonly backdrop: string;
  readonly scale: number;
  readonly camera: Point;
  readonly ground: HTMLCanvasElement;
  /** Laid on the ground under everything that stands: the walker's shadow. */
  readonly underfoot: readonly Placed[];
  /** Where a walk on open ground ends, if one is under way. */
  readonly target: Point | null;
  readonly marker: { readonly light: string; readonly ink: string };
  /** Everything that stands, back to front. */
  readonly standing: readonly Placed[];
}

/** Draws one frame. Every position is a whole art pixel and the scale whole, so nothing blurs or shimmers. */
export function drawFrame(ctx: CanvasRenderingContext2D, frame: Frame): void {
  const { scale, camera } = frame;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = frame.backdrop;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(scale, 0, 0, scale, -camera.x * scale, -camera.y * scale);
  ctx.drawImage(frame.ground, 0, 0);
  for (const p of frame.underfoot) ctx.drawImage(p.image, p.x, p.y);
  if (frame.target) drawTarget(ctx, frame.target, frame.marker);
  for (const p of frame.standing) ctx.drawImage(p.image, p.x, p.y);
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

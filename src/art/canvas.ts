/**
 * The only part of the engine that touches a canvas. Everything it shows was
 * worked out by `rasterize`; this copies the pixels across and sizes the
 * element so one canvas pixel is exactly one device pixel.
 */
import type { Palette } from './palette';
import { rasterize, type Picture } from './raster';

/** The width of one phone screen, portrait, in art pixels. */
export const SCREEN_ART_WIDTH = 270;

/**
 * Device pixels per art pixel when `artWidth` art pixels must fit across
 * `cssWidth` CSS pixels: the largest whole number that fits, never a fraction,
 * and never less than one. A 390-pixel-wide phone at 3x gives 4 for a screen.
 */
export function wholeScale(cssWidth: number, dpr: number, artWidth = SCREEN_ART_WIDTH): number {
  // The small allowance stops 3 * 90 / 270 landing a hair under 1.
  return Math.max(1, Math.floor((cssWidth * dpr) / artWidth + 1e-9));
}

/** The scale the game itself draws at on this screen: a 270-pixel-wide world across the app. */
export function gameScale(cssWidth: number, dpr: number): number {
  return wholeScale(cssWidth, dpr);
}

/**
 * The smallest whole number of CSS pixels that is also a whole number of
 * device pixels: 1 at 2x or 3x, 2 at 1.5x, 8 at 2.625x (21 device pixels).
 */
export function cssStep(dpr: number): number {
  for (let q = 1; q <= 64; q++) if (Math.abs(q * dpr - Math.round(q * dpr)) < 1e-6) return q;
  return 1;
}

/**
 * How many device pixels a canvas spans for `artPixels` at `scale`. Browsers
 * lay out in fractions of a CSS pixel (Chrome in 64ths), so a canvas whose
 * CSS size is not whole, like 464 device pixels at 3x (154.67px), gets
 * stretched a hair and resampled, and its pixels blur. So the canvas is
 * padded with empty space on the right and bottom up to the next size that
 * is whole in both: under one CSS pixel on most phones.
 */
export function deviceSize(artPixels: number, scale: number, dpr: number): number {
  const exact = artPixels * scale;
  const step = Math.round(cssStep(dpr) * dpr);
  return Math.ceil(exact / step) * step;
}

/** Draws a picture onto a canvas at `scale` device pixels per art pixel, resizing it to fit. */
export function paint(
  canvas: HTMLCanvasElement,
  pic: Picture,
  palette: Palette,
  scale: number,
  dpr = 1,
) {
  const image = rasterize(pic, palette, scale);
  canvas.width = deviceSize(pic.grid.w, scale, dpr);
  canvas.height = deviceSize(pic.grid.h, scale, dpr);
  // Without pixel support (jsdom has none) or a 2D context, the sized element
  // still holds its place. ImageData is checked first so jsdom is never asked.
  if (typeof ImageData === 'undefined') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.putImageData(new ImageData(image.data as Uint8ClampedArray<ArrayBuffer>, image.width), 0, 0);
}

export interface PixelCanvasOptions {
  readonly palette: Palette;
  /** Device pixels per art pixel; a whole number. */
  readonly scale: number;
  /** The screen's device pixel ratio, so the element's CSS size maps one-to-one. */
  readonly dpr: number;
  /** What the picture shows, for screen readers. */
  readonly label?: string;
}

/** A canvas element showing `pic`, sized so its pixels land exactly on device pixels. */
export function pixelCanvas(pic: Picture, options: PixelCanvasOptions): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'pixel-art';
  if (options.label) {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', options.label);
  }
  repaint(canvas, pic, options);
  return canvas;
}

/** Redraws a canvas made by `pixelCanvas` at a new scale (after a resize or rotation). */
export function repaint(canvas: HTMLCanvasElement, pic: Picture, o: PixelCanvasOptions) {
  canvas.style.width = `${deviceSize(pic.grid.w, o.scale, o.dpr) / o.dpr}px`;
  canvas.style.height = `${deviceSize(pic.grid.h, o.scale, o.dpr) / o.dpr}px`;
  paint(canvas, pic, o.palette, o.scale, o.dpr);
}

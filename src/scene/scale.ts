import type { Point } from './tileMap';
import { cssStep } from '../art/canvas';
import type { Size } from './camera';

/** A scene is drawn about this many art pixels across: one phone screen in the style guide. */
export const SCENE_WIDTH = 270;

/**
 * The fewest art pixels a scene shows top to bottom before it gives up width
 * for height: a phone on its side, or a short window, would otherwise show a
 * letterbox slot of ground.
 */
export const MIN_SCENE_HEIGHT = 160;

/**
 * How many device pixels one art pixel takes: always a whole number, never a
 * fraction, so every art pixel is the same size and crisp. It is the largest
 * that still shows at least `SCENE_WIDTH` across (so nothing meant to be on
 * screen is cut off) and `MIN_SCENE_HEIGHT` down. A screen too small for that
 * at one device pixel each still gets one: never less.
 */
export function sceneScale(device: Size): number {
  let scale = Math.max(1, Math.floor(device.width / SCENE_WIDTH));
  while (scale > 1 && device.height / scale < MIN_SCENE_HEIGHT) scale--;
  return scale;
}

/**
 * The canvas for a box of `box` CSS pixels: as big as fits, in a whole number
 * of CSS pixels that is also a whole number of device pixels (`cssStep`), and
 * a backing store of exactly that many device pixels.
 *
 * A canvas whose CSS size is a fraction of a device pixel off its backing
 * store is stretched by a hair when it is shown, and somewhere down the screen
 * one row of art comes out a device pixel short. The shell's screen is rarely
 * a whole size (727.4 CSS pixels tall on a 390-wide phone), so the canvas is
 * made a little smaller instead, never stretched.
 */
export function canvasFit(box: Size, dpr: number): { css: Size; device: Size } {
  const step = cssStep(dpr);
  const width = Math.floor(box.width / step + 1e-6) * step;
  const height = Math.floor(box.height / step + 1e-6) * step;
  return {
    css: { width, height },
    device: { width: Math.round(width * dpr), height: Math.round(height * dpr) },
  };
}

/** How much of the scene, in art pixels, a canvas of this many device pixels shows at `scale`. */
export function viewSize(device: Size, scale: number): Size {
  return { width: device.width / scale, height: device.height / scale };
}

/**
 * How many art pixels `cssPixels` CSS pixels cover on this canvas: how big a
 * thumb is in the scene, or how much of it a panel hides.
 */
export function cssToArt(cssPixels: number, cssSize: Size, device: Size, scale: number): number {
  if (cssSize.width === 0) return 0;
  return (cssPixels * device.width) / cssSize.width / scale;
}

/**
 * Where in the scene, in art pixels, a tap at `offset` CSS pixels from the
 * canvas's top-left lands. `cssSize` is the canvas's size on the page and
 * `device` its size in device pixels, so the ratio between them is the true
 * device pixel ratio whatever the browser rounded.
 */
export function tapToWorld(
  offset: Point,
  cssSize: Size,
  device: Size,
  scale: number,
  camera: Point,
): Point {
  return {
    x: camera.x + (offset.x * device.width) / cssSize.width / scale,
    y: camera.y + (offset.y * device.height) / cssSize.height / scale,
  };
}

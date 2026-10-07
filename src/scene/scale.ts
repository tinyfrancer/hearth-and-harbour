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
 * How much of a scene a phone shows, in art pixels: a property of the scene
 * being shown, not of the game, so the current town and the dungeons (drawn
 * for a world 270 across) and the C-scale town (360 across) each get their
 * own scale on the same screen.
 */
export interface SceneSize {
  /** About this many art pixels across: one phone screen of this scene's art. */
  readonly width: number;
  /** The fewest art pixels top to bottom before width is given up for height. */
  readonly minHeight: number;
  /**
   * How many art pixels short of `width` a view may fall and still keep its
   * scale. The canvas is trimmed to whole CSS and device pixels (`canvasFit`),
   * which on a 2.625x phone 412 CSS pixels wide takes it from 1081 device
   * pixels to 1071: without slack the C-scale town would drop from 3 device
   * pixels an art pixel to 2 for want of three art pixels. None by default.
   */
  readonly slack?: number;
}

/** The current town's and the dungeons' scale: the style guide's 270-pixel screen. */
export const TOWN_SIZE: SceneSize = { width: SCENE_WIDTH, minHeight: MIN_SCENE_HEIGHT };

/**
 * How many device pixels one art pixel takes: always a whole number, never a
 * fraction, so every art pixel is the same size and crisp. It is the largest
 * that still shows at least the scene's width across (so nothing meant to be
 * on screen is cut off) and its least height down. A screen too small for
 * that at one device pixel each still gets one: never less.
 */
export function sceneScale(device: Size, size: SceneSize = TOWN_SIZE): number {
  const width = size.width - (size.slack ?? 0);
  let scale = Math.max(1, Math.floor(device.width / width));
  while (scale > 1 && device.height / scale < size.minHeight) scale--;
  return scale;
}

/** The scale rule for one scene's size, as the stage takes it. */
export function scaleFor(size: SceneSize): (device: Size) => number {
  return (device) => sceneScale(device, size);
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

/**
 * The canvas for a scene drawn at one canvas pixel per art pixel and
 * enlarged by the browser (`image-rendering: pixelated`): `art` is the
 * canvas's own size, `device` and `css` what it covers on screen, `scale` the
 * whole number of device pixels each art pixel becomes.
 *
 * A frame then writes a ninth of the pixels it would at 3 device pixels an
 * art pixel, and the enlarging is the compositor's. For it to stay crisp the
 * enlargement must be exactly `scale` both ways: so the canvas covers a whole
 * number of art pixels, each `scale` device pixels, and its CSS size is a
 * whole number of device pixels (`cssStep`). Where the box is not such a
 * size the canvas is a little smaller than it, never stretched.
 */
export function pixelFit(
  box: Size,
  dpr: number,
  scaleOf: (device: Size) => number,
): { css: Size; device: Size; art: Size; scale: number } {
  const fit = canvasFit(box, dpr);
  const step = Math.round(cssStep(dpr) * dpr);
  let scale = scaleOf(fit.device);
  // A trimmed canvas can want a smaller scale; a smaller scale never trims more. Two rounds settle it.
  for (let round = 0; round < 3; round++) {
    const art = {
      width: whole(fit.device.width, scale, step),
      height: whole(fit.device.height, scale, step),
    };
    const device = { width: art.width * scale, height: art.height * scale };
    const next = scaleOf(device);
    if (next === scale || round === 2)
      return {
        art,
        device,
        css: { width: device.width / dpr, height: device.height / dpr },
        scale,
      };
    scale = next;
  }
  throw new Error('unreachable');
}

/** The most art pixels at `scale` in `device` pixels whose device size is a multiple of `step`. */
function whole(device: number, scale: number, step: number): number {
  let art = Math.floor(device / scale);
  while (art > 0 && (art * scale) % step !== 0) art--;
  return art;
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

/**
 * The scale for a dungeon, played with the phone on its side: the town's
 * scale for the screen's short side, so the hero is the same size on screen
 * after the phone is turned as he was in town before it. `width` is the
 * dungeons' world across (`dungeonMetrics.ts`).
 */
export function dungeonScale(device: Size, width = SCENE_WIDTH): number {
  return Math.max(1, Math.floor(Math.min(device.width, device.height) / width));
}

/**
 * A scene's overlay for words and thin lines (`StageOptions.overlay`): as
 * big on the page as the scene's canvas, `css`, and a device pixel per pixel
 * whatever the scene's own canvas holds (`device` covered at `scale` device
 * pixels an art pixel). `perArt` is how many of its pixels an art pixel
 * takes, so drawing in art pixels lands on the scene's own; `k` is how many
 * art pixels a CSS pixel is, for sizes given in CSS pixels.
 */
export function overlayFit(
  css: Size,
  dpr: number,
  device: Size,
  scale: number,
): { width: number; height: number; perArt: number; k: number } {
  const width = Math.round(css.width * dpr);
  const height = Math.round(css.height * dpr);
  const perArt = (scale * width) / Math.max(1, device.width);
  return { width, height, perArt, k: width / Math.max(1, css.width) / perArt };
}

/**
 * Where on the overlay a box of the scene (art pixels) falls, in its device
 * pixels, snapped out to whole CSS-and-device steps so the overlay canvas
 * placed there sits exactly on device pixels, and clamped to the scene's
 * canvas; null where none of it is on screen.
 */
export function overlayRect(
  box: { x: number; y: number; w: number; h: number },
  camera: Point,
  perArt: number,
  full: { width: number; height: number },
  dpr: number,
): { x: number; y: number; w: number; h: number } | null {
  const step = Math.max(1, Math.round(cssStep(dpr) * dpr));
  const x0 = Math.max(0, Math.floor(((box.x - camera.x) * perArt) / step) * step);
  const y0 = Math.max(0, Math.floor(((box.y - camera.y) * perArt) / step) * step);
  const x1 = Math.min(full.width, Math.ceil(((box.x + box.w - camera.x) * perArt) / step) * step);
  const y1 = Math.min(full.height, Math.ceil(((box.y + box.h - camera.y) * perArt) / step) * step);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

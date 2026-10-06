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
 * after the phone is turned as he was in town before it.
 */
export function dungeonScale(device: Size): number {
  return Math.max(1, Math.floor(Math.min(device.width, device.height) / SCENE_WIDTH));
}

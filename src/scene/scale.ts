import type { Point } from './tileMap';
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
 * How many device pixels a canvas of `css` CSS pixels covers. Where the
 * browser reports the exact count (`exact`, from the device-pixel box) and it
 * agrees with the ratio to within a pixel, that is the answer, since it is the
 * count after the browser's own rounding. Where it does not report it
 * (Safari), or reports something that disagrees (Chrome emulating a phone's
 * ratio reports CSS pixels), it is worked out from the ratio.
 */
export function deviceSize(css: Size, dpr: number, exact?: Size): Size {
  const width = css.width * dpr;
  const height = css.height * dpr;
  if (exact && Math.abs(exact.width - width) <= 1 && Math.abs(exact.height - height) <= 1) {
    return exact;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

/** How much of the scene, in art pixels, a canvas of this many device pixels shows at `scale`. */
export function viewSize(device: Size, scale: number): Size {
  return { width: device.width / scale, height: device.height / scale };
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

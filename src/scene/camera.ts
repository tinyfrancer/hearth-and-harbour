import type { Point } from './tileMap';

export interface Size {
  readonly width: number;
  readonly height: number;
}

/**
 * The top-left corner of the view, in whole art pixels, that keeps `focus` in
 * the middle without showing past the map's edges. A map narrower than the
 * view along an axis is centred on that axis instead.
 *
 * Whole pixels, because a camera between pixels would make every pixel of the
 * ground shimmer as it moved.
 */
export function cameraFor(focus: Point, view: Size, world: Size): Point {
  return { x: axis(focus.x, view.width, world.width), y: axis(focus.y, view.height, world.height) };
}

function axis(focus: number, view: number, world: number): number {
  if (world <= view) return Math.round((world - view) / 2);
  return Math.round(Math.min(Math.max(focus - view / 2, 0), world - view));
}

import { route } from './path';
import type { Point, TileMap } from './tileMap';

/** How fast a walker crosses the ground, in art pixels a second: four tiles. */
export const WALK_SPEED = 64;

/** Someone on the ground: where their feet are and the points still to walk through. */
export interface Walker {
  readonly at: Point;
  readonly path: readonly Point[];
}

/** Sets a walker off towards `target`, or as near to it as the map allows. */
export function walkTo(map: TileMap, walker: Walker, target: Point): Walker {
  return { at: walker.at, path: route(map, walker.at, target) };
}

/**
 * Moves a walker along its path by the distance `ms` of walking covers. The
 * distance comes from time, not frames, so a walk takes as long on a slow
 * phone as a fast one; it carries over corners, so a long frame does not cut
 * one short.
 */
export function step(walker: Walker, ms: number, speed = WALK_SPEED): Walker {
  return stepBy(walker, ms, speed).walker;
}

/**
 * `step`, and how far the walker went along the path: round a corner that is
 * more than the straight line from where it was to where it is, and what the
 * walk cycle counts, so a frame that turns a corner shows the same stride as
 * two frames either side of it.
 */
export function stepBy(
  walker: Walker,
  ms: number,
  speed = WALK_SPEED,
): { walker: Walker; distance: number } {
  const all = (speed * Math.max(ms, 0)) / 1000;
  let left = all;
  let at = walker.at;
  let path = walker.path;
  while (path.length > 0 && left > 0) {
    const next = path[0]!;
    const gap = Math.hypot(next.x - at.x, next.y - at.y);
    if (gap <= left) {
      at = next;
      path = path.slice(1);
      left -= gap;
    } else {
      at = { x: at.x + ((next.x - at.x) * left) / gap, y: at.y + ((next.y - at.y) * left) / gap };
      left = 0;
    }
  }
  if (path === walker.path && at === walker.at) return { walker, distance: 0 };
  return { walker: { at, path }, distance: all - left };
}

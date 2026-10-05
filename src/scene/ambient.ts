/*
 * A little life in a scene, as pure functions of time: smoke that rises, gulls
 * that circle, foam that shifts. Each says what to show at a moment; the stage
 * redraws only the patch where that changed, and only while the scene is on
 * screen, so none of it costs a full frame.
 */
import type { Picture } from '../art/raster';
import type { Box, Sprite } from './things';
import type { Point } from './tileMap';

/** Something that moves by itself: what it looks like, and where, at `ms` on the page's clock. */
export interface Ambient {
  /** `ground`: lies on the ground, under everything standing. `above`: over everything. */
  readonly layer: 'ground' | 'above';
  at(ms: number): Sprite | null;
}

/** Which of `n` frames shows at `ms`, each lasting `frameMs`, offset by `phaseMs`. */
export function frameAt(ms: number, n: number, frameMs: number, phaseMs = 0): number {
  const i = Math.floor((ms + phaseMs) / frameMs) % n;
  return i < 0 ? i + n : i;
}

/** A sequence of pictures shown in turn at one place: smoke, foam. */
export function cycling(
  layer: Ambient['layer'],
  frames: readonly Picture[],
  at: Point,
  frameMs: number,
  phaseMs = 0,
): Ambient {
  return {
    layer,
    at: (ms) => ({ picture: frames[frameAt(ms, frames.length, frameMs, phaseMs)]!, at }),
  };
}

/** A puff of smoke: its middle and size, in its picture's pixels. */
export type Puff = readonly [x: number, y: number, r: number];

/**
 * The puffs of a plume part of the way (`phase`, 0 to 1) from one puff's
 * place to the next: each has risen towards where the one above it was, the
 * top one thins away past the last, and at 0 they are exactly where they
 * started. Run round from 0 to 1, the smoke rises from the chimney for ever.
 */
export function risenPuffs(puffs: readonly Puff[], phase: number): Puff[] {
  const n = puffs.length;
  if (n < 2) return [...puffs];
  const at = (s: number): Puff => {
    const i = Math.min(Math.floor(s), n - 2);
    const t = s - i;
    const a = puffs[i]!;
    const b = puffs[i + 1]!;
    const r = s > n - 1 ? b[2] * Math.max(0, n - s) : a[2] + (b[2] - a[2]) * t;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r];
  };
  return puffs.map((_, i) => at(i + phase)).filter(([, , r]) => r >= 0.8);
}

/** A gull's lazy loop over the water: centre, half-width and half-height, and how long a lap takes. */
export interface Loop {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly lapMs: number;
  /** Where on the loop it starts, 0 to 1. */
  readonly start: number;
  /** Which way round: 1 or -1. */
  readonly turn: 1 | -1;
}

/** Where a gull on `loop` is at `ms`, in whole art pixels so it never blurs. */
export function loopAt(loop: Loop, ms: number): Point {
  const a = 2 * Math.PI * (loop.start + (loop.turn * ms) / loop.lapMs);
  return {
    x: Math.round(loop.x + loop.rx * Math.cos(a)),
    y: Math.round(loop.y + loop.ry * Math.sin(a)),
  };
}

/** A picture flying round a loop. `centre` is the point of the picture that follows the loop. */
export function circling(picture: Picture, centre: Point, loop: Loop): Ambient {
  return {
    layer: 'above',
    at: (ms) => {
      const p = loopAt(loop, ms);
      return { picture, at: { x: p.x - centre.x, y: p.y - centre.y } };
    },
  };
}

/** The box a sprite covers, in art pixels. */
export function spriteBox(sprite: Sprite): Box {
  return { x: sprite.at.x, y: sprite.at.y, w: sprite.picture.grid.w, h: sprite.picture.grid.h };
}

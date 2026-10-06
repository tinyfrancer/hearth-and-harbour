/*
 * The one place the C-scale town gets its people from: the hero in the
 * player's look and gear, and the townsfolk by today's ids, from lane B's
 * door (`src/art/character2.ts`). Nothing else in the scene looks at how a
 * figure is drawn: it gets canvases of the declared size with the soles'
 * middle at the declared anchor, lit by whatever lights the scene hands in.
 *
 * A figure is painted either onto a canvas here (the hero, whose look and gear
 * change, and anyone who walks about) or as plain pixels (`pixels`), which a
 * worker can make: the townsfolk who stand still are painted off the main
 * thread with the rest of the town.
 *
 * Walking and breathing (lane B's B9) come through the same door as poses:
 * which of lane B's facings and which frame. Only the doors and constants
 * are relied on, never what the frames look like, so lane B can redraw them.
 */
import type { Look } from '../art/character';
import {
  FIGURE2_ANCHOR_X as ANCHOR_X,
  FIGURE2_H as H,
  FIGURE2_SOLE_Y as SOLE_Y,
  FIGURE2_W as W,
  IDLE2_FRAME_MS,
  IDLE2_FRAMES,
  WALK2_FRAMES,
  WALK2_STRIDE,
  characterIdlePicture2,
  characterWalkPicture2,
  facingLeft2,
  townsfolkIdlePicture2,
  townsfolkWalkPicture2,
  type Facing2,
} from '../art/character2';
import type { Picture2 } from '../art/town2/cells';
import type { Glow } from '../art/raster';
import type { TimeOfDay } from './daylight';
import type { Facing, Play, Way } from './play';
import { cellPixels, palette2 } from './town2Paint';

/** A C-scale figure's canvas, in art pixels: room for a person 64 tall and what they hold. */
export const FIGURE2_W = W;
export const FIGURE2_H = H;
/** The column the figure stands on, facing right; facing left it is the mirror of it (`FIGURE2_W - 1 - x`). */
export const FIGURE2_ANCHOR_X = ANCHOR_X;
/** The row of the soles of the feet: the figure's base line, its lowest row drawn. */
export const FIGURE2_SOLE_Y = SOLE_Y;

/** The townsfolk, by lane B's ids: the three with work to offer, and the villagers. */
export const TOWNSFOLK2 = [
  'smith',
  'trader',
  'pirate',
  'alewife',
  'market',
  'docker',
  'elder',
] as const;
export type Townsfolk2 = (typeof TOWNSFOLK2)[number];

/** Pixels with no canvas: one RGBA value per art pixel, row by row. */
export interface Raw {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray;
}

/**
 * How a figure stands this frame: walking (a frame of lane B's stride, in
 * one of its facings) or standing (a frame of the breath, facing left or
 * right, the left the mirror of the right).
 */
export interface Pose2 {
  readonly walking: boolean;
  readonly facing: Facing2;
  readonly frame: number;
}

/** Standing as drawn: facing right, breath out. */
export const STANDING2: Pose2 = { walking: false, facing: 'right', frame: 0 };

/** Every pose a walker can show: each facing's stride, and the breath each way. */
export const POSES2: readonly Pose2[] = [
  ...(['right', 'left', 'down', 'up'] as const).flatMap((facing) =>
    Array.from({ length: WALK2_FRAMES }, (_, frame) => ({ walking: true, facing, frame })),
  ),
  ...(['right', 'left'] as const).flatMap((facing) =>
    Array.from({ length: IDLE2_FRAMES }, (_, frame) => ({ walking: false, facing, frame })),
  ),
];

/** A pose as a short key, for keeping its pictures. */
export const poseKey = (p: Pose2): string => `${p.walking ? 'w' : 's'}${p.facing}${p.frame}`;

/** The column of the canvas the soles' middle is on, in this pose. */
export const anchorOf = (p: Pose2): number => (p.facing === 'left' ? W - 1 - ANCHOR_X : ANCHOR_X);

/**
 * Which of lane B's facings a walker going `way` shows, having last gone
 * `side` across. The one place this is decided.
 *
 * Toward the camera, lane B's down frames; away, its back view (B10b's
 * `'up'`); across, and on any diagonal `wayAfter` keeps across, the side
 * frames of the way he goes, never mirrored here (lane B's `'left'` keeps the
 * sword in his right hand).
 */
export function walkFacing(way: Way, side: Facing): Facing2 {
  if (way === 'down') return 'down';
  if (way === 'up') return 'up';
  return side;
}

/**
 * The frame of a stride after walking `walked` art pixels from where the
 * walk began: by distance, never by time, so the planted foot stays put on
 * the ground at any speed. `stride` is how far the ground moves under the
 * feet a frame (lane B's `WALK2_STRIDE` for the hero, `TOWNSFOLK2_STRIDE`
 * for the townsfolk).
 */
export function strideFrame(walked: number, stride: number): number {
  return Math.floor(Math.max(0, walked) / stride) % WALK2_FRAMES;
}

/** The frame of the breath at `now` (the scene's clock), a little out of step by `phase`. */
export function breathFrame(now: number, phase = 0): number {
  return Math.floor(Math.max(0, now + phase) / IDLE2_FRAME_MS) % IDLE2_FRAMES;
}

/** The hero's pose as he walks or stands (`play`), at the scene's time `now`. */
export function heroPose(play: Play, now: number): Pose2 {
  if (play.walker.path.length > 0)
    return {
      walking: true,
      facing: walkFacing(play.way ?? 'across', play.facing),
      frame: strideFrame(play.walked - (play.strideFrom ?? 0), WALK2_STRIDE),
    };
  return { walking: false, facing: play.facing, frame: breathFrame(now) };
}

/** A figure as the C-scale town shows it. */
export interface Figure2 {
  /** The canvas's size: always `FIGURE2_W` x `FIGURE2_H`. */
  readonly w: number;
  readonly h: number;
  /** Where its drawn pixels lie standing as drawn (facing right), inclusive: crown to soles, and side to side. */
  readonly drawn: {
    readonly top: number;
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
  };
  /**
   * The figure in a pose, at one canvas pixel per art pixel, in a time of
   * day's colours, lit by `glows` (in the canvas's own pixels, as the caller
   * has placed it). Empty pixels stay empty: the ground beneath is already
   * lit. Painted onto `into` if given (a canvas of the figure's size, to
   * reuse one), else a new canvas. Null where nothing can be painted (no
   * canvas, as in tests).
   */
  paint(
    pose: Pose2,
    time: TimeOfDay,
    glows: readonly Glow[],
    into?: HTMLCanvasElement,
  ): HTMLCanvasElement | null;
  /** The same as plain pixels, with no canvas: for a worker, or a test. */
  pixels(pose: Pose2, time: TimeOfDay, glows: readonly Glow[]): Raw;
}

/** Where a figure's pictures come from, pose by pose: lane B's walk and breath, for one person. */
interface Poser {
  walk(facing: Facing2, frame: number): Picture2 | null;
  idle(frame: number): Picture2 | null;
}

/** The player's character in their look and gear, as the C-scale town shows them. */
export function heroFigure2(look: Look, worn: readonly string[]): Figure2 {
  return figureOf({
    walk: (facing, frame) => characterWalkPicture2(look, worn, facing, frame),
    idle: (frame) => characterIdlePicture2(look, worn, frame),
  })!;
}

/** One of the townsfolk by today's id, or null for an id lane B has no figure for. */
export function townsfolkFigure2(id: string): Figure2 | null {
  return figureOf({
    walk: (facing, frame) => townsfolkWalkPicture2(id, facing, frame),
    idle: (frame) => townsfolkIdlePicture2(id, frame),
  });
}

function figureOf(poser: Poser): Figure2 | null {
  const right = poser.idle(0);
  if (!right) return null;
  const pictures = new Map<string, Picture2>();
  /** A pose's picture: lane B's, the standing left mirrored here (lane B's walking left is mirrored already). */
  const pictureOf = (pose: Pose2): Picture2 => {
    const key = poseKey(pose);
    let pic = pictures.get(key);
    if (!pic) {
      if (pose.walking) pic = poser.walk(pose.facing, pose.frame) ?? right;
      else {
        const still = poser.idle(pose.frame) ?? right;
        pic = pose.facing === 'left' ? facingLeft2(still) : still;
      }
      pictures.set(key, pic);
    }
    return pic;
  };
  const g = right.grid;
  const drawn = { top: g.h, bottom: -1, left: g.w, right: -1 };
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      if (!g.d[y * g.w + x]) continue;
      drawn.top = Math.min(drawn.top, y);
      drawn.bottom = Math.max(drawn.bottom, y);
      drawn.left = Math.min(drawn.left, x);
      drawn.right = Math.max(drawn.right, x);
    }
  const pixels = (pose: Pose2, time: TimeOfDay, glows: readonly Glow[]): Raw => {
    const pic = pictureOf(pose);
    return {
      w: pic.grid.w,
      h: pic.grid.h,
      data: cellPixels({ grid: pic.grid, glows: [...pic.glows, ...glows] }, palette2(time)),
    };
  };
  return {
    w: g.w,
    h: g.h,
    drawn,
    pixels,
    paint(pose, time, glows, into) {
      if (typeof ImageData === 'undefined' || typeof document === 'undefined') return null;
      const raw = pixels(pose, time, glows);
      const canvas = into ?? document.createElement('canvas');
      if (canvas.width !== raw.w) canvas.width = raw.w;
      if (canvas.height !== raw.h) canvas.height = raw.h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.putImageData(
        new ImageData(raw.data as Uint8ClampedArray<ArrayBuffer>, raw.w, raw.h),
        0,
        0,
      );
      return canvas;
    },
  };
}

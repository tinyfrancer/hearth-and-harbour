/*
 * How a C-scale figure moves its feet: which frame of lane B's walk cycle
 * shows, which way it faces, and the breath while standing. Pure rules over
 * a `Play` and a clock passed in; every number is read from lane B's door
 * (`src/art/character2.ts`), so a redrawn stride or a new facing there
 * changes nothing here but what it should.
 *
 * The frame follows the distance walked, never the time: whatever the speed
 * or the frame rate, the planted foot moves back exactly as far as the
 * ground passes under it, so it never slides.
 */
import {
  IDLE2_FRAMES,
  IDLE2_FRAME_MS,
  TOWNSFOLK2_FRAME_MS,
  TOWNSFOLK2_STRIDE,
  WALK2_FRAMES,
  WALK2_FRAME_MS,
  WALK2_STRIDE,
  type Facing2,
} from '../art/character2';
import type { Facing, Play } from './play';

/**
 * How fast the hero walks, in art pixels a second: as fast as his stride
 * pushes the ground back, a stride a frame.
 */
export const HERO_SPEED2 = (WALK2_STRIDE / WALK2_FRAME_MS) * 1000;

/** How fast the townsfolk stroll, should one walk: their own shorter stride a frame. */
export const FOLK_SPEED2 = (TOWNSFOLK2_STRIDE / TOWNSFOLK2_FRAME_MS) * 1000;

/** Which way a figure faces: across either way, or toward the camera (and away, once lane B draws it). */
export type Heading2 = Facing2;

/**
 * What a figure is doing this frame: standing (breathing, frame 0 or 1),
 * facing across, or walking (a frame of the cycle) any way it has frames
 * for. Every pose there is exists once (`standing`, `walking`), with a key
 * to keep its pictures by, so a frame asks for one without making anything.
 */
export interface Pose2 {
  readonly walking: boolean;
  readonly heading: Heading2;
  readonly frame: number;
  readonly key: string;
}

const STANDING: Readonly<Record<Facing, readonly Pose2[]>> = {
  right: breaths('right'),
  left: breaths('left'),
};

function breaths(facing: Facing): Pose2[] {
  return Array.from({ length: IDLE2_FRAMES }, (_, frame) => ({
    walking: false,
    heading: facing,
    frame,
    key: `stand ${facing} ${frame}`,
  }));
}

/** The walking poses each way, made the first time a heading is walked: any way `Facing2` has. */
const WALKING = new Map<Heading2, readonly Pose2[]>();

/** Standing facing across, on breathing frame `breath` (any whole number). */
export function standing(facing: Facing, breath: number): Pose2 {
  const frames = STANDING[facing];
  return frames[((breath % frames.length) + frames.length) % frames.length]!;
}

/** Walking `heading`, on cycle frame `frame` (any whole number). */
export function walking(heading: Heading2, frame: number): Pose2 {
  let frames = WALKING.get(heading);
  if (!frames) {
    frames = Array.from({ length: WALK2_FRAMES }, (_, f) => ({
      walking: true,
      heading,
      frame: f,
      key: `walk ${heading} ${f}`,
    }));
    WALKING.set(heading, frames);
  }
  return frames[((frame % frames.length) + frames.length) % frames.length]!;
}

/** The breathing frame at `ms` on a clock: one breath in, one out, each held `IDLE2_FRAME_MS`. */
export function breathAt(ms: number): number {
  return Math.floor(Math.max(ms, 0) / IDLE2_FRAME_MS) % IDLE2_FRAMES;
}

/** The walk frame after `walked` art pixels of a walk, at `stride` a frame: frame 0 is the contact as a walk starts. */
export function walkFrame(walked: number, stride = WALK2_STRIDE): number {
  return Math.floor(Math.max(walked, 0) / stride) % WALK2_FRAMES;
}

/**
 * Steeper than this (rows moved for each column), a walk is toward or away
 * from the camera; anything shallower, a diagonal included, is across.
 */
export const STEEP = 1.5;

/**
 * Which way a figure faces walking `dx`, `dy` (art pixels, down the screen
 * positive), having last faced `across`. Across the screen, and on a
 * diagonal: the side frames the way it goes. Down the screen: toward the camera. Up it: lane B has no back view
 * yet, so the last way across, as lane B asks. The day `Facing2` gains
 * `'up'`, the line marked below becomes `return 'up';` and nothing else here
 * changes (a pose is made for any heading on first ask).
 */
export function headingFor(dx: number, dy: number, across: Facing): Heading2 {
  if (Math.abs(dy) <= Math.abs(dx) * STEEP) return dx > 0 ? 'right' : dx < 0 ? 'left' : across;
  if (dy > 0) return 'down';
  return across; // UP: becomes `return 'up';` once `Facing2` has it.
}

/**
 * Every way a walk can face: whatever `headingFor` gives going each way, so
 * the day it gives `'up'` this has it too, with no second change.
 */
export const HEADINGS: readonly Heading2[] = [
  ...new Set(
    (['right', 'left'] as const).flatMap((across) =>
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].map(([dx, dy]) => headingFor(dx!, dy!, across)),
    ),
  ),
];

/** Every pose a figure shows: each breath standing facing right, and each walk frame every way. */
export function everyPose(): Pose2[] {
  const poses: Pose2[] = [];
  for (let b = 0; b < IDLE2_FRAMES; b++) poses.push(standing('right', b));
  for (const heading of HEADINGS)
    for (let f = 0; f < WALK2_FRAMES; f++) poses.push(walking(heading, f));
  return poses;
}

/**
 * A walker's feet, frame by frame: standing and breathing until a walk
 * starts, then the cycle from its contact frame by the distance walked, the
 * way the next leg of the walk goes; standing again the moment it stops.
 * Remembers only where in `play.walked` the walk began.
 */
export class Gait {
  /** Where in `play.walked` this walk began, while one is under way. */
  private from: number | null = null;
  /** `play.walked` when last seen standing: where the next walk begins. */
  private still: number | null = null;
  private readonly stride: number;

  constructor(stride = WALK2_STRIDE) {
    this.stride = stride;
  }

  /** The pose for `play` at `now` (ms on any clock that only moves forward). */
  pose(play: Play, now: number): Pose2 {
    const next = play.walker.path[0];
    if (!next) {
      this.from = null;
      this.still = play.walked;
      return standing(play.facing, breathAt(now));
    }
    // From where he stood, however far the first frame of the walk already took him.
    if (this.from === null) this.from = this.still ?? play.walked;
    if (play.walked < this.from) this.from = play.walked;
    const at = play.walker.at;
    const heading = headingFor(next.x - at.x, next.y - at.y, play.facing);
    return walking(heading, walkFrame(play.walked - this.from, this.stride));
  }
}

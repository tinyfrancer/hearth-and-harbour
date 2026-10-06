/*
 * The one place the C-scale town gets its people from: the hero in the
 * player's look and gear, and the townsfolk by today's ids, from lane B's
 * door (`src/art/character2.ts`). Nothing else in the scene looks at how a
 * figure is drawn: it gets canvases of the declared size with the soles'
 * middle at the declared anchor, lit by whatever lights the scene hands in.
 *
 * Written first against a stand-in (today's figures blown up), while lane B
 * drew these; swapping to lane B's door was a change to this file alone, and
 * so was taking lane B's walk cycle and breath (B9).
 *
 * A figure is painted either onto a canvas here (the hero, whose look and gear
 * change) or as plain pixels (`pixels`), which a worker can make: the
 * townsfolk are painted off the main thread with the rest of the town.
 */
import type { Look } from '../art/character';
import {
  FIGURE2_ANCHOR_X as ANCHOR_X,
  FIGURE2_H as H,
  FIGURE2_SOLE_Y as SOLE_Y,
  FIGURE2_W as W,
  characterIdlePicture2,
  characterWalkPicture2,
  facingLeft2,
  townsfolkIdlePicture2,
  townsfolkPicture2,
  townsfolkWalkPicture2,
} from '../art/character2';
import type { Picture2 } from '../art/town2/cells';
import type { Glow } from '../art/raster';
import type { TimeOfDay } from './daylight';
import { everyPose, standing, type Heading2, type Pose2 } from './gait';
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

/** A figure as the C-scale town shows it. */
export interface Figure2 {
  /** The canvas's size: always `FIGURE2_W` x `FIGURE2_H`. */
  readonly w: number;
  readonly h: number;
  /** Where its drawn pixels lie standing facing right, inclusive: crown to soles, and side to side. */
  readonly drawn: {
    readonly top: number;
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
  };
  /** The column under the soles' middle in a pose's picture: a picture facing left stands one over. */
  anchorX(pose: Pose2): number;
  /**
   * The figure in a pose (standing and breathing, or a frame of the walk any
   * way it goes), at one canvas pixel per art pixel, in a time of day's
   * colours, lit by `glows` (in the canvas's own pixels, as the caller has
   * placed it). Empty pixels stay empty: the ground beneath is already lit.
   * Null where nothing can be painted (no canvas, as in tests).
   */
  paint(pose: Pose2, time: TimeOfDay, glows: readonly Glow[]): HTMLCanvasElement | null;
  /** The same as plain pixels, with no canvas: for a worker, or a test. */
  pixels(pose: Pose2, time: TimeOfDay, glows: readonly Glow[]): Raw;
}

/*
 * The walk cycle and the breath are lane B's (B9): each pose's picture comes
 * from its door as a `Picture2`, which this lane lights itself (`paint`,
 * `pixels`). Walking left is lane B's own left frames, never a mirror made
 * here; standing left is the standing picture mirrored, as lane B says.
 * Which pose shows when is `gait.ts`'s.
 */

/** Where a pose's pictures come from: lane B's door for the hero or for one of the townsfolk. */
interface Poses {
  stand(breath: number): Picture2 | null;
  walk(heading: Heading2, frame: number): Picture2 | null;
}

/**
 * A figure's poses drawn elsewhere (in a worker: lane B's posing takes a few
 * milliseconds a frame and makes a lot of garbage, too much for a frame on a
 * slow phone), by pose key: each breath standing right, each walk frame.
 */
export type PoseBook = ReadonlyMap<string, Picture2>;

/**
 * The player's character in their look and gear, as the C-scale town shows
 * them. Given `book`, poses come from it once it is in (null until then,
 * when the figure stands as drawn, every pose, rather than draw a pose here);
 * without it each is drawn here the first time it is shown.
 */
export function heroFigure2(
  look: Look,
  worn: readonly string[],
  book?: () => PoseBook | null,
): Figure2 {
  return figureOf(
    {
      stand: (breath) => characterIdlePicture2(look, worn, breath),
      walk: (heading, frame) => characterWalkPicture2(look, worn, heading, frame),
    },
    book,
  )!;
}

/** The poses a worker draws for a figure: each breath, standing right, and every walk frame. */
export function posesFor(look: Look, worn: readonly string[]): Map<string, Picture2> {
  const out = new Map<string, Picture2>();
  for (const pose of everyPose())
    out.set(
      pose.key,
      pose.walking
        ? characterWalkPicture2(look, worn, pose.heading, pose.frame)
        : characterIdlePicture2(look, worn, pose.frame),
    );
  return out;
}

/** One of the townsfolk by today's id, or null for an id lane B has no figure for. */
export function townsfolkFigure2(id: string): Figure2 | null {
  if (!townsfolkPicture2(id)) return null;
  return figureOf({
    stand: (breath) => townsfolkIdlePicture2(id, breath),
    walk: (heading, frame) => townsfolkWalkPicture2(id, heading, frame),
  });
}

function figureOf(poses: Poses, book?: () => PoseBook | null): Figure2 | null {
  const right = poses.stand(0);
  if (!right) return null;
  const left = facingLeft2(right);
  const pictures = new Map<string, Picture2>();
  const pictureOf = (pose: Pose2): Picture2 => {
    let pic = pictures.get(pose.key);
    if (pic) return pic;
    if (book) {
      const kept = book();
      // Not in yet: as drawn, kept nowhere, so the real pose shows the moment it is in.
      if (!kept) return pose.heading === 'left' ? left : right;
      const key = pose.walking ? pose.key : standing('right', pose.frame).key;
      // A pose the book has not got (a heading lane B added since) is drawn here.
      const found = kept.get(key);
      if (found) pic = !pose.walking && pose.heading === 'left' ? facingLeft2(found) : found;
    }
    if (!pic) {
      if (pose.walking) pic = poses.walk(pose.heading, pose.frame) ?? right;
      else {
        const stood = poses.stand(pose.frame) ?? right;
        pic = pose.heading === 'left' ? facingLeft2(stood) : stood;
      }
    }
    pictures.set(pose.key, pic);
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
    anchorX: (pose) =>
      pose.heading === 'left' ? FIGURE2_W - 1 - FIGURE2_ANCHOR_X : FIGURE2_ANCHOR_X,
    pixels,
    paint(pose, time, glows) {
      if (typeof ImageData === 'undefined' || typeof document === 'undefined') return null;
      const raw = pixels(pose, time, glows);
      const canvas = document.createElement('canvas');
      canvas.width = raw.w;
      canvas.height = raw.h;
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

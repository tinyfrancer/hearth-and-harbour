/*
 * The one place the C-scale town gets its people from: the hero in the
 * player's look and gear, and the townsfolk by today's ids, from lane B's
 * door (`src/art/character2.ts`). Nothing else in the scene looks at how a
 * figure is drawn: it gets canvases of the declared size with the soles'
 * middle at the declared anchor, lit by whatever lights the scene hands in.
 *
 * Written first against a stand-in (today's figures blown up), while lane B
 * drew these; swapping to lane B's door was a change to this file alone.
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
  characterPicture2,
  facingLeft2,
  townsfolkPicture2,
} from '../art/character2';
import type { Picture2 } from '../art/town2/cells';
import type { Glow } from '../art/raster';
import type { TimeOfDay } from './daylight';
import type { Facing } from './play';
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
  /** Where its drawn pixels lie facing right, inclusive: crown to soles, and side to side. */
  readonly drawn: {
    readonly top: number;
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
  };
  /**
   * The figure facing either way, at one canvas pixel per art pixel, in a
   * time of day's colours, lit by `glows` (in the canvas's own pixels, as
   * the caller has placed it). Empty pixels stay empty: the ground beneath is
   * already lit. Null where nothing can be painted (no canvas, as in tests).
   */
  paint(facing: Facing, time: TimeOfDay, glows: readonly Glow[]): HTMLCanvasElement | null;
  /** The same as plain pixels, with no canvas: for a worker, or a test. */
  pixels(facing: Facing, time: TimeOfDay, glows: readonly Glow[]): Raw;
}

/*
 * THE WALK CYCLE PLUGS IN HERE. Lane B is drawing walk frames into
 * `src/art/character2.ts` (B9); until they land a walker is the standing
 * figure with the stage's one-pixel bob. When they do:
 *
 *  1. Add `frame` (0 = standing, 1..n = the stride) to `paint` and `pixels`
 *     above, and take each frame's picture from lane B's door in `figureOf`
 *     below (keep one `Picture2` per frame and facing, made on first ask).
 *  2. `Hero2.at` (`town2Art.ts`) picks the frame from `play.walked` (the
 *     stride is `STRIDE2`, 8 art pixels a half-step) and keys its kept
 *     pictures by frame as well as facing and light; drop `bob` for him.
 *  3. Townsfolk stand still and keep frame 0; nothing in the worker changes.
 *
 * Nothing else in the scene looks at how a figure is drawn.
 */

/** The player's character in their look and gear, as the C-scale town shows them. */
export function heroFigure2(look: Look, worn: readonly string[]): Figure2 {
  return figureOf(characterPicture2(look, worn));
}

/** One of the townsfolk by today's id, or null for an id lane B has no figure for. */
export function townsfolkFigure2(id: string): Figure2 | null {
  const pic = townsfolkPicture2(id);
  return pic && figureOf(pic);
}

function figureOf(right: Picture2): Figure2 {
  const pictures: Record<Facing, Picture2> = { right, left: facingLeft2(right) };
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
  const pixels = (facing: Facing, time: TimeOfDay, glows: readonly Glow[]): Raw => {
    const pic = pictures[facing];
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
    paint(facing, time, glows) {
      if (typeof ImageData === 'undefined' || typeof document === 'undefined') return null;
      const raw = pixels(facing, time, glows);
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

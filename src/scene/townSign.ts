/*
 * The loading card's picture: the player's own character waiting by the
 * town's signpost on a patch of cobbles, breathing, at the town's own scale
 * and in its light, so the wait already looks like the place it leads to.
 *
 * Small and cheap on purpose: one piece of the town (the signpost, drawn on
 * its own), the hero (whose picture the town needs anyway), lane B's cobble
 * painter over a patch a few dozen pixels across, and this lane's contact
 * shadows. None of the town's heavy work, which stays in the worker.
 */
import type { Look } from '../art/character';
import { characterIdlePicture2, c2Scale } from '../art/character2';
import { stamp, tgrid, type Picture2, type TGrid } from '../art/town2/cells';
import { cobbles } from '../art/town2/ground';
import { town2Piece } from '../art/town2/pieces';
import { pixelCanvas2 } from '../art/town2/raster';
import { h } from '../ui/dom';
import type { TimeOfDay } from './daylight';
import { FIGURE2_ANCHOR_X, FIGURE2_SOLE_Y } from './figures2';
import { breathAt } from './gait';
import { layShadow } from './shadow2';
import { palette2 } from './town2Paint';

/** The picture's size in art pixels, and where things stand in it. */
export const SIGN_W = 132;
export const SIGN_H = 104;
/** The row everyone's feet are on. */
const FEET_Y = 94;
/** Where the signpost's foot and the hero's soles are, across. */
const POST_X = 42;
const HERO_X = 100;

/** The cobbles: an oval patch under them, its edge left ragged by the stones. */
const patch = (x: number, y: number): boolean =>
  ((x - SIGN_W / 2) / (SIGN_W / 2)) ** 2 + ((y - FEET_Y) / 11) ** 2 <= 1;

/** One breath's picture: the ground, both shadows, the signpost and the hero. */
function scene(hero: Picture2, time: TimeOfDay): Picture2 {
  const g: TGrid = tgrid(SIGN_W, SIGN_H);
  cobbles(g, { x: 0, y: FEET_Y - 12, w: SIGN_W, h: 24 }, 7, patch);
  layShadow(g, { x: POST_X, y: FEET_Y }, time);
  layShadow(g, { x: HERO_X, y: FEET_Y }, time);
  const post = town2Piece('signpost');
  stamp(g, post.picture.grid, POST_X - post.foot, FEET_Y - post.base);
  stamp(g, hero.grid, HERO_X - FIGURE2_ANCHOR_X, FEET_Y - FIGURE2_SOLE_Y);
  return { grid: g, glows: [] };
}

/** The picture, breathing: two canvases, one shown at a time. */
export interface TownSign {
  readonly el: HTMLElement;
  /** Shows the breath for `now` (ms on any forward clock); does nothing between breaths. */
  breathe(now: number): void;
}

export function townSign(look: Look, worn: readonly string[], time: TimeOfDay): TownSign {
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  const width = typeof innerWidth === 'number' ? innerWidth : 390;
  // Twice the town's own scale where the card has room for it (every phone in portrait).
  const scale = c2Scale(width, dpr) * (Math.min(width, 480) >= 340 ? 2 : 1);
  const frames = [0, 1].map((breath) => {
    const canvas = pixelCanvas2(
      scene(characterIdlePicture2(look, worn, breath), time),
      palette2(time),
      scale,
      dpr,
    );
    canvas.setAttribute('aria-hidden', 'true');
    canvas.hidden = breath !== 0;
    return canvas;
  });
  const el = h('div', { class: 'scene-loading-sign' }, frames);
  let shown = 0;
  return {
    el,
    breathe(now) {
      const next = breathAt(now) % frames.length;
      if (next === shown) return;
      frames[shown]!.hidden = true;
      frames[next]!.hidden = false;
      shown = next;
    },
  };
}

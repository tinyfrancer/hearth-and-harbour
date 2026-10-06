import type { Look } from '../art/character';
import { IDLE2_FRAMES, IDLE2_FRAME_MS, characterIdlePicture2 } from '../art/character2';
import { pixelCanvas2 } from '../art/town2/raster';
import { DAY2 } from '../art/town2/ramps';

/**
 * The character drawn large for a menu: lane B's C-scale figure at a whole
 * number of CSS pixels to an art pixel (so a whole number of device pixels
 * on any phone), standing and, where the screen is updated each frame,
 * breathing. The breath is two canvases with one shown; breathing swaps
 * which, and nothing is drawn after the first breath in.
 */
export interface Portrait {
  /** What goes on the page: the canvases, one shown at a time. */
  readonly canvases: readonly HTMLCanvasElement[];
  /** Shows the breath for `ms` on any clock that only moves forward. */
  breathe(ms: number): void;
}

/** The label a screen reader hears for the character. */
const LABEL = 'Your character';

/**
 * The CSS pixels an art pixel takes for a figure about `tall` CSS pixels
 * high at most: the largest whole number that fits, at least 1.
 */
export function portraitScale(tall: number, artTall: number): number {
  return Math.max(1, Math.floor(tall / artTall));
}

export function portrait(look: Look, worn: readonly string[], cssScale: number): Portrait {
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  // Whole device pixels too: a fractional ratio (2.625) rounds the art pixel to the nearest whole.
  const device = Math.max(1, Math.round(cssScale * dpr));
  const draw = (breath: number): HTMLCanvasElement => {
    const canvas = pixelCanvas2(
      characterIdlePicture2(look, worn, breath),
      DAY2,
      device,
      dpr,
      LABEL,
    );
    canvas.dataset.breath = String(breath);
    return canvas;
  };
  const first = draw(0);
  const canvases: HTMLCanvasElement[] = [first];
  let shown = 0;
  return {
    canvases,
    breathe(ms) {
      const next = Math.floor(Math.max(ms, 0) / IDLE2_FRAME_MS) % IDLE2_FRAMES;
      if (next === shown) return;
      // The breath in is drawn the first time it is wanted, not with the screen.
      while (canvases.length <= next) {
        const canvas = draw(canvases.length);
        canvas.hidden = true;
        first.after(canvas);
        canvases.push(canvas);
      }
      canvases[shown]!.hidden = true;
      canvases[next]!.hidden = false;
      shown = next;
    },
  };
}

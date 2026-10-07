import {
  FIGURE2_H,
  FIGURE2_W,
  IDLE2_FRAMES,
  IDLE2_FRAME_MS,
  characterIdle2,
} from '../art/character2';
import { iconScale, itemIcon } from '../art/icons';
import type { DrawnLook } from './look';

/**
 * The hero drawn large for a menu, breathing: lane B's breath frames
 * (`characterIdle2`, one pixel per art pixel) stamped onto one canvas at a
 * whole number of device pixels per art pixel, so every art pixel is a crisp
 * square on any phone. The canvas is made once; a breath redraws it in place,
 * and only when the frame changes.
 */
export interface HeroFigure {
  readonly el: HTMLCanvasElement;
  /** Shows the breath due at `ms` on the app's clock (passed in, never read). */
  breathe(ms: number): void;
  /** Draws a new look or outfit on the same canvas, at the breath it is on. */
  dress(look: DrawnLook, worn: readonly string[]): void;
}

/** Which breath is due at `ms`: the frames alternate every `IDLE2_FRAME_MS`. */
export const breathAt = (ms: number): number =>
  Math.floor(Math.max(ms, 0) / IDLE2_FRAME_MS) % IDLE2_FRAMES;

/**
 * Device pixels to an art pixel for a figure meant to be `cssScale` CSS
 * pixels to one: the nearest whole number, so 3 at a ratio of 2.625 is 8
 * (3.05 CSS pixels), never a fraction that would blur.
 */
export const deviceScale = (cssScale: number, dpr: number): number =>
  Math.max(1, Math.round(cssScale * dpr));

const ratio = (): number =>
  typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;

export function heroFigure(look: DrawnLook, worn: readonly string[], cssScale: number): HeroFigure {
  const dpr = ratio();
  const scale = deviceScale(cssScale, dpr);
  const canvas = document.createElement('canvas');
  canvas.className = 'pixel-art hero-figure';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Your character');
  canvas.width = FIGURE2_W * scale;
  canvas.height = FIGURE2_H * scale;
  canvas.style.width = `${canvas.width / dpr}px`;
  canvas.style.height = `${canvas.height / dpr}px`;
  // jsdom has no pixels to draw on; it gets the sizes and what is shown, written on the canvas.
  const ctx = typeof ImageData === 'undefined' ? null : canvas.getContext('2d');
  let dressed = { look, worn };
  let shown = -1;
  let draws = 0;

  const draw = (frame: number): void => {
    shown = frame;
    draws += 1;
    canvas.dataset.breath = String(frame);
    canvas.dataset.draws = String(draws);
    canvas.dataset.look = `${dressed.look.skin} ${dressed.look.hair} ${dressed.look.hairColour}`;
    canvas.dataset.worn = [...dressed.worn].sort().join(' ');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      characterIdle2(dressed.look, dressed.worn, 'day', frame),
      0,
      0,
      canvas.width,
      canvas.height,
    );
  };
  draw(0);

  return {
    el: canvas,
    breathe(ms) {
      const frame = breathAt(ms);
      if (frame !== shown) draw(frame);
    },
    dress(look, worn) {
      dressed = { look, worn };
      draw(shown);
    },
  };
}

/**
 * CSS pixels to an art pixel for what is worn, in the doll's squares. The
 * menus' usual 32px icon is a third of a CSS pixel finer than one and leaves
 * the 56px squares half empty beside a hero at three; two fills a square's
 * 48px inside with a 24-pixel icon and comes nearer the hero's own pixels.
 */
export const DOLL_ICON_SCALE = 2;

/**
 * An item's icon for the doll: art's own canvas (`itemIcon`), shown at a whole
 * number of device pixels per art pixel near `DOLL_ICON_SCALE`, so every art
 * pixel stays a crisp square (6 at 3x, 4 at 2x, 5 at 2.625x). Null when art
 * has not drawn the item. Its art size is read off the canvas, not assumed.
 */
export function dollIcon(itemId: string): HTMLCanvasElement | null {
  const icon = itemIcon(itemId);
  if (!(icon instanceof HTMLCanvasElement)) return null;
  const dpr = ratio();
  const per = deviceScale(DOLL_ICON_SCALE, dpr);
  const drawn = iconScale(dpr);
  icon.style.width = `${((icon.width / drawn) * per) / dpr}px`;
  icon.style.height = `${((icon.height / drawn) * per) / dpr}px`;
  icon.classList.add('doll-icon');
  return icon;
}

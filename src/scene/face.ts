/*
 * A face in a scene's panel, whole at any screen: the art lane's 72-pixel
 * portrait (`portraitPicture2`) painted at a whole number of device pixels an
 * art pixel, the largest that keeps it within the panel's room, and its frame
 * made the face's own size. The art lane's element (`portrait2`) offers three
 * sizes for its three frames, and on a desktop screen (1x) the smallest of
 * them is 72 CSS pixels: cut to the middle of a 48-pixel frame, hat and chin
 * gone. Choosing the size here, per device pixel ratio, shows the whole face:
 * 48 CSS pixels on a 3x phone, 55 at 2.625x, 36 at 2x; at 1x, where no whole
 * scale is smaller, 72 across cut to its safe box's height (`faceFrame`), so
 * the panel keeps its height.
 */
import { CAVE_DAY } from '../art/dungeonArt2';
import { PORTRAIT2_SAFE, PORTRAIT2_SIZE, portraitPicture2 } from '../art/portraits2';
import { pixelCanvas2 } from '../art/town2/raster';
import { h } from '../ui/dom';

/** The most a panel's face may take across, in CSS pixels: what the fight's top strip has room for. */
export const FACE_MOST = 56;

/** Whole device pixels an art pixel for a face at this device pixel ratio: never under one. */
export function faceScale(dpr: number, most = FACE_MOST): number {
  return Math.max(1, Math.floor((most * dpr) / PORTRAIT2_SIZE + 1e-9));
}

const ratio = (): number =>
  typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;

/**
 * Someone's whole face for a panel, in a frame its own size (`.scene-face`),
 * or null if the art lane has none for the id. Hidden from screen readers:
 * the name beside it says who it is.
 */
export function wholeFace(id: string, most = FACE_MOST): HTMLElement | null {
  const pic = portraitPicture2(id);
  if (!pic) return null;
  const dpr = ratio();
  const scale = faceScale(dpr, most);
  const canvas = pixelCanvas2(pic, CAVE_DAY, scale, dpr);
  const frame = h('span', { class: 'scene-face', attrs: { 'aria-hidden': 'true' } }, [canvas]);
  const box = faceFrame(id, scale / dpr, most);
  frame.style.width = canvas.style.width;
  frame.style.height = canvas.style.height;
  if (box.h < box.w) {
    frame.style.height = `${box.h}px`;
    canvas.style.position = 'relative';
    canvas.style.top = `${-box.top}px`;
  }
  return frame;
}

/**
 * A face's frame in CSS pixels at `css` CSS pixels an art pixel: the whole
 * portrait, unless that is taller than `most` (a desktop screen, 1x, where
 * no whole scale is smaller), when it is cut top and bottom to its safe box
 * (`PORTRAIT2_SAFE`, everything that names it), at least `most` tall, so the
 * panel stays the height it was laid out for; `top` is how much is cut off
 * above. Whole CSS pixels at 1x; never wider than the portrait.
 */
export function faceFrame(
  id: string,
  css: number,
  most = FACE_MOST,
): { w: number; h: number; top: number } {
  const full = PORTRAIT2_SIZE * css;
  if (full <= most + 1e-9) return { w: full, h: full, top: 0 };
  const safe = PORTRAIT2_SAFE[id] ?? { x: 0, y: 0, w: PORTRAIT2_SIZE, h: PORTRAIT2_SIZE };
  const h = Math.min(full, Math.max(most, Math.ceil(safe.h * css)));
  const middle = (safe.y + safe.h / 2) * css;
  const top = Math.round(Math.max(0, Math.min(full - h, middle - h / 2)));
  return { w: full, h, top };
}

/*
 * A face in a scene's panel, whole at any screen: the art lane's 72-pixel
 * portrait (`portraitPicture2`) painted at a whole number of device pixels an
 * art pixel, the largest that keeps it within the panel's room, and its frame
 * made the face's own size. The art lane's element (`portrait2`) offers three
 * sizes for its three frames, and on a desktop screen (1x) the smallest of
 * them is 72 CSS pixels: cut to the middle of a 48-pixel frame, hat and chin
 * gone. Choosing the size here, per device pixel ratio, shows the whole face:
 * 48 CSS pixels on a 3x phone, 55 at 2.625x, 36 at 2x, and 72 at 1x, where no
 * whole scale is smaller.
 */
import { CAVE_DAY } from '../art/dungeonArt2';
import { PORTRAIT2_SIZE, portraitPicture2 } from '../art/portraits2';
import { pixelCanvas2 } from '../art/town2/raster';
import { h } from '../ui/dom';

/** The most a panel's face may take across, in CSS pixels: what the fight's top strip has room for. */
export const FACE_MOST = 56;

/** Whole device pixels an art pixel for a face at this device pixel ratio: never under one. */
export function faceScale(dpr: number, most = FACE_MOST): number {
  return Math.max(1, Math.floor((most * dpr) / PORTRAIT2_SIZE + 1e-9));
}

/** How wide a face shows at this ratio, in CSS pixels. */
export const faceSize = (dpr: number, most = FACE_MOST): number =>
  (PORTRAIT2_SIZE * faceScale(dpr, most)) / dpr;

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
  const canvas = pixelCanvas2(pic, CAVE_DAY, faceScale(dpr, most), dpr);
  const frame = h('span', { class: 'scene-face', attrs: { 'aria-hidden': 'true' } }, [canvas]);
  frame.style.width = canvas.style.width;
  frame.style.height = canvas.style.height;
  return frame;
}

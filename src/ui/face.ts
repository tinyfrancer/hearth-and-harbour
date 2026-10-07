import {
  HERO_PORTRAIT2_SAFE,
  PORTRAIT2_SIZE,
  heroPortrait2,
  portrait2,
  portraitScales2,
} from '../art/portraits2';
import { h } from './dom';
import type { DrawnLook } from './look';

/**
 * The frames a face is shown in, by the sizes the art draws faces at
 * (`portrait2` carries each face at 144, 96 and 48 CSS pixels and shows the
 * largest that fits whole): the fight screen's, the lists', and the header's.
 * Each frame is its face plus the gold border, so the face is never cut.
 */
export type FaceSize = 'large' | 'small' | 'mini';

/**
 * Someone's face from the art (a monster, the dungeon's cast, a townsperson,
 * by id), or a framed initial until art has drawn one. The frame is the same
 * size either way, so a face arriving moves nothing.
 */
export function face(who: { id: string; name: string }, size: FaceSize): HTMLElement {
  const art = portrait2(who.id);
  return h(
    'div',
    {
      class: `portrait ${size}${art ? '' : ' blank'}`,
      attrs: { 'aria-hidden': 'true', 'data-face': who.id },
    },
    [art ?? h('span', { text: who.name.charAt(0) })],
  );
}

/**
 * Someone's face in its frame if art has drawn one, and nothing if not: for
 * a place that looks finished without a face (a thieving mark's card).
 */
export function faceIfDrawn(who: { id: string }, size: FaceSize): HTMLElement | null {
  const art = portrait2(who.id);
  return (
    art &&
    h('div', { class: `portrait ${size}`, attrs: { 'aria-hidden': 'true', 'data-face': who.id } }, [
      art,
    ])
  );
}

/** The least the header's face is across, in CSS pixels: a thumb's tap. */
export const HEADER_FACE_CSS = 48;
/** The most of it the header shows down, in CSS pixels, before it crops to the safe box. */
export const HEADER_FACE_MAX = 56;
/** The header frame's gold border, each side (`--px`). */
const FRAME_BORDER = 2;

export interface HeaderFaceSize {
  /** Device pixels per art pixel: a whole number, so the face is crisp. */
  readonly scale: number;
  /** The whole face's side, in CSS pixels. */
  readonly face: number;
  /** What the frame shows inside its border, in CSS pixels. */
  readonly width: number;
  readonly height: number;
  /** How far the face sits up and left of the frame's inside, in CSS pixels. */
  readonly left: number;
  readonly top: number;
}

/**
 * The header's face, sized from the art's own scales (`portraitScales2`):
 * the fewest whole device pixels per art pixel that make the face at least
 * `HEADER_FACE_CSS` across, never fewer than the art's smallest face. Shown
 * whole where that is no taller than `HEADER_FACE_MAX` (48 at 3x, 54.9 at
 * 2.625x); where it is (72 at 2x and 1x, whose next step down would be 36),
 * cropped to the hero's safe box, which loses only the disc's edge and the
 * shoulders. Every art pixel is a whole number of device pixels either way.
 */
export function headerFaceSize(dpr: number): HeaderFaceSize {
  const scale = Math.max(
    portraitScales2(dpr).mini,
    Math.ceil((HEADER_FACE_CSS * dpr) / PORTRAIT2_SIZE - 1e-9),
  );
  const css = scale / dpr;
  const face = PORTRAIT2_SIZE * css;
  if (face <= HEADER_FACE_MAX + 1e-9) {
    return { scale, face, width: face, height: face, left: 0, top: 0 };
  }
  const safe = HERO_PORTRAIT2_SAFE;
  return {
    scale,
    face,
    width: safe.w * css,
    height: (safe.y + safe.h) * css,
    left: safe.x * css,
    top: 0,
  };
}

const ratio = (): number =>
  typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;

/**
 * Sizes a header frame and its face: the frame to what it shows, and the
 * art's smallest canvas (`portrait2-mini`, drawn at `portraitScales2().mini`)
 * to `scale` device pixels an art pixel. Each art pixel of that canvas is a
 * block of whole device pixels, so drawn pixelated (the art's CSS) at a whole
 * number of device pixels a block it stays crisp.
 */
function sizeHeaderFace(frame: HTMLElement): void {
  const dpr = ratio();
  const size = headerFaceSize(dpr);
  frame.style.width = `${size.width + 2 * FRAME_BORDER}px`;
  frame.style.height = `${size.height + 2 * FRAME_BORDER}px`;
  frame.dataset.scale = String(size.scale);
  const mini = frame.querySelector<HTMLCanvasElement>('canvas.portrait2-mini');
  if (!mini) return;
  // The art pads its canvas at the right and foot to a whole CSS pixel, so the
  // whole canvas is scaled, by the same whole-pixel step as the face on it.
  const step = size.scale / portraitScales2(dpr).mini;
  mini.style.width = `${(mini.width * step) / dpr}px`;
  mini.style.height = `${(mini.height * step) / dpr}px`;
  mini.style.marginLeft = `${-size.left}px`;
  mini.style.marginTop = `${-size.top}px`;
}

/**
 * The hero's own face, in the look and with the hat and clothes worn. It is
 * labelled for a screen reader ("Your character"), unlike the others, since
 * it may be the only picture of them on the page. In the header (`mini`) it
 * is sized by `headerFaceSize`.
 */
export function heroFace(look: DrawnLook, worn: readonly string[], size: FaceSize): HTMLElement {
  const frame = h('div', { class: `portrait ${size} hero-face`, attrs: { 'data-face': 'hero' } }, [
    heroPortrait2(look, worn),
  ]);
  if (size === 'mini') sizeHeaderFace(frame);
  return frame;
}

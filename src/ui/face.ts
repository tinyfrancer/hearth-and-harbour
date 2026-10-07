import { heroPortrait2, portrait2 } from '../art/portraits2';
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

/**
 * The hero's own face, in the look and with the hat and clothes worn. It is
 * labelled for a screen reader ("Your character"), unlike the others, since
 * it may be the only picture of them on the page.
 */
export function heroFace(look: DrawnLook, worn: readonly string[], size: FaceSize): HTMLElement {
  return h('div', { class: `portrait ${size} hero-face`, attrs: { 'data-face': 'hero' } }, [
    heroPortrait2(look, worn),
  ]);
}

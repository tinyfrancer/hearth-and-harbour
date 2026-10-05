import { portrait } from '../art/portraits';
import type { MonsterDef } from '../core/content';
import { h } from './dom';

/**
 * A monster's face from the art, or a framed initial until it has one. The
 * frame is the same size either way, so a face arriving moves nothing.
 */
export function face(monster: MonsterDef, size: 'large' | 'small'): HTMLElement {
  const art = portrait(monster.id);
  return h(
    'div',
    { class: `portrait ${size}${art ? '' : ' blank'}`, attrs: { 'aria-hidden': 'true' } },
    [art ?? h('span', { text: monster.name.charAt(0) })],
  );
}

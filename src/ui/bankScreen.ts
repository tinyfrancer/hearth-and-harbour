import type { Content } from '../core/content';
import { bankCount, type GameState } from '../core/state';
import { h } from './dom';
import { formatNumber } from './format';
import type { View } from './view';

/** The Bank tab, first cut: what you hold and how many. Selling and item cards arrive in S4. */
export function bankView(state: GameState, content: Content): View {
  // Table order, not arrival order, so a stack never jumps about.
  const held = Object.values(content.items).filter((item) => bankCount(state, item.id) > 0);
  if (held.length === 0) {
    return {
      el: h('section', { class: 'panel empty' }, [
        h('p', { class: 'muted', text: 'Your bank is empty. Go and chop something.' }),
      ]),
    };
  }
  const updates: ((state: GameState) => void)[] = [];
  const rows = held.map((item) => {
    const qty = h('span', { class: 'qty' });
    updates.push((now) => {
      qty.textContent = formatNumber(bankCount(now, item.id));
    });
    return h('div', { class: 'panel stack tight', attrs: { 'data-item': item.id } }, [
      h('div', { class: 'card-head' }, [h('h2', { text: item.name }), qty]),
      h('p', { class: 'muted small', text: item.description }),
    ]);
  });
  const update = (now: GameState): void => updates.forEach((apply) => apply(now));
  update(state);
  return { el: h('div', { class: 'stack' }, rows), update };
}

import type { Content } from '../core/content';
import type { GameState } from '../core/state';
import { h } from './dom';
import type { View } from './view';

/** The Character tab. Gear, stats and the portrait arrive with equipment (S7b). */
export function characterView(state: GameState, _content: Content): View {
  return {
    el: h('section', { class: 'panel stack' }, [
      h('h2', { text: state.name }),
      h('p', { class: 'muted', text: 'Gear and stats will show here.' }),
    ]),
  };
}

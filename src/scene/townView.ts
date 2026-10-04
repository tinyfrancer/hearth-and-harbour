import type { Content } from '../core/content';
import type { GameState } from '../core/state';
import { h } from '../ui/dom';
import type { View } from '../ui/view';

/**
 * What the Town tab shows. This is the scene lane's one door into the app:
 * `src/ui/app.ts` calls it and knows nothing else about scenes, so everything
 * behind it can change without touching the shell.
 */
export function townView(_state: GameState, _content: Content): View {
  return {
    el: h('section', { class: 'panel empty' }, [
      h('p', { class: 'muted', text: 'The road into town is not open yet.' }),
    ]),
  };
}

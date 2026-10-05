/*
 * The small panel that opens over the bottom of a scene when the walker
 * reaches something: its name, what it says, and perhaps a button. Plain DOM,
 * styled like the menus, so it reads as part of the app rather than the
 * picture.
 */
import { button, h } from '../ui/dom';
import type { TimeOfDay } from './daylight';
import type { Opens, Use } from './things';

export interface PanelActions {
  press(opens: Opens): void;
  close(): void;
}

/** The lines a thing says at this time of day. */
export function linesFor(use: Use, time: TimeOfDay): readonly string[] {
  return time === 'dusk' && use.duskLines ? use.duskLines : use.lines;
}

export function usePanel(use: Use, time: TimeOfDay, actions: PanelActions): HTMLElement {
  const close = h('button', {
    class: 'scene-panel-close',
    text: '×',
    attrs: { type: 'button', 'aria-label': 'Close' },
    on: { click: actions.close },
  });
  const opens = use.button?.opens;
  return h('section', { class: 'scene-panel', attrs: { 'aria-label': use.name } }, [
    close,
    h('h2', { text: use.name }),
    ...linesFor(use, time).map((line) => h('p', { text: line })),
    use.button && opens ? button(use.button.label, () => actions.press(opens), 'primary') : null,
  ]);
}

/*
 * The small panel that opens over the bottom of a scene when the walker
 * reaches something: its name, what it says, and perhaps a button. Plain DOM,
 * styled like the menus, so it reads as part of the app rather than the
 * picture.
 */
import { portrait } from '../art/portraits';
import { button, h } from '../ui/dom';
import type { TimeOfDay } from './daylight';
import type { Opens, Use } from './things';

export interface PanelActions {
  press(opens: Opens): void;
  close(): void;
}

/** The lines a thing shows every visit at this time of day. */
export function linesFor(use: Use, time: TimeOfDay): readonly string[] {
  return time === 'dusk' && use.duskLines ? use.duskLines : use.lines;
}

/**
 * What someone says on their `visit`th visit (counting from 1): the next of
 * their lines each time, in order and then round again. After dark their
 * evening lines come first in the round. Null for something with nothing to say.
 */
export function sayingFor(use: Use, time: TimeOfDay, visit: number): string | null {
  const round = [...(time === 'dusk' ? (use.duskSays ?? []) : []), ...(use.says ?? [])];
  if (round.length === 0) return null;
  const i = (((Math.max(1, visit) - 1) % round.length) + round.length) % round.length;
  return round[i]!;
}

export function usePanel(use: Use, time: TimeOfDay, actions: PanelActions, visit = 1): HTMLElement {
  const close = h('button', {
    class: 'scene-panel-close',
    text: '×',
    attrs: { type: 'button', 'aria-label': 'Close' },
    on: { click: actions.close },
  });
  const opens = use.button?.opens;
  const say = sayingFor(use, time, visit);
  // A face beside the name once the art lane has drawn one; until then, just the name.
  const face = use.portrait ? portrait(use.portrait) : null;
  const title = h('h2', { text: use.name });
  return h('section', { class: 'scene-panel', attrs: { 'aria-label': use.name } }, [
    close,
    face ? h('div', { class: 'scene-panel-head' }, [face, title]) : title,
    ...linesFor(use, time).map((line) => h('p', { text: line })),
    say ? h('p', { class: 'scene-say', text: say }) : null,
    use.button && opens ? button(use.button.label, () => actions.press(opens), 'primary') : null,
  ]);
}

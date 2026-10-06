import type { Look } from '../art/character';
import { FIGURE2_H } from '../art/character2';
import { NAME_MAX_LENGTH, nameProblem } from '../core/state';
import { button, h } from './dom';
import { heroFigure } from './figure';
import { importPanel } from './importPanel';
import { fullLook, lookPicker } from './look';
import type { GameState } from '../core/state';

interface CreateScreenOptions {
  onCreate(name: string, look: Look): void;
  onImport(state: GameState): void;
}

/** The creator, built once: its page, and the breath, moved by the app's clock. */
export interface CreateScreen {
  el: HTMLElement;
  breathe(ms: number): void;
}

/**
 * CSS pixels to an art pixel for the figure in the creator: the largest
 * whole number that fits in about three eighths of the screen's height, from
 * three to four, so on any phone he is the middle of the screen and the
 * steppers, the name and Begin still fit beneath him. Two on a phone too
 * narrow for three.
 */
export function creatorScale(
  height = typeof innerHeight === 'number' ? innerHeight : 844,
  width = typeof innerWidth === 'number' ? innerWidth : 390,
): number {
  if (Math.min(width, 480) < 340) return 2;
  return Math.max(3, Math.min(4, Math.floor((height * 0.36) / FIGURE2_H)));
}

/** The first thing a new player sees: name and dress a character, or bring a save in. */
export function createScreen({ onCreate, onImport }: CreateScreenOptions): CreateScreen {
  let look = fullLook({});
  const figure = heroFigure(look, [], creatorScale());
  const stage = h('div', { class: 'figure stage', attrs: { 'data-figure': '' } }, [figure.el]);
  const picker = lookPicker(look, (next) => {
    look = next;
    // Only the figure changes, at once, on the same canvas: the steppers stay under the thumb.
    figure.dress(look, []);
  });
  const input = h('input', {
    class: 'field',
    attrs: {
      type: 'text',
      name: 'character-name',
      maxlength: String(NAME_MAX_LENGTH),
      placeholder: 'Name',
      autocomplete: 'off',
      autocapitalize: 'words',
      spellcheck: 'false',
      'aria-label': 'Character name',
    },
  });
  const problem = h('p', { class: 'problem', attrs: { role: 'alert' } });
  const form = h(
    'form',
    {
      class: 'panel stack create-form',
      on: {
        submit: (event) => {
          event.preventDefault();
          const issue = nameProblem(input.value);
          problem.textContent = issue ?? '';
          if (!issue) onCreate(input.value, look);
        },
      },
    },
    [
      h('h2', { text: 'Who are you?' }),
      // The choices sit right under the figure, so each step shows on it at once.
      stage,
      picker,
      input,
      problem,
      h('button', { class: 'btn primary', text: 'Begin', attrs: { type: 'submit' } }),
    ],
  );

  const importHolder = h('div');
  const importToggle = button('I have a save', () => {
    importToggle.remove();
    importHolder.append(importPanel({ onImport }));
  });

  return {
    el: h('main', { class: 'create' }, [
      h('header', { class: 'title' }, [
        h('h1', { text: 'Hearth & Harbour' }),
        h('p', { class: 'muted', text: 'A small town, a long road, and a house to fill.' }),
      ]),
      form,
      importToggle,
      importHolder,
    ]),
    breathe: figure.breathe,
  };
}

import type { Look } from '../art/character';
import { characterCanvas2 } from '../art/character2';
import { NAME_MAX_LENGTH, nameProblem } from '../core/state';
import { button, h } from './dom';
import { importPanel } from './importPanel';
import { fullLook, lookPicker } from './look';
import type { GameState } from '../core/state';

interface CreateScreenOptions {
  onCreate(name: string, look: Look): void;
  onImport(state: GameState): void;
}

/** The first thing a new player sees: name and dress a character, or bring a save in. */
export function createScreen({ onCreate, onImport }: CreateScreenOptions): HTMLElement {
  let look = fullLook({});
  const drawn = (): HTMLCanvasElement => characterCanvas2(look, [], 'sheet');
  const figure = h('div', { class: 'figure stage', attrs: { 'data-figure': '' } }, [drawn()]);
  const picker = lookPicker(look, (next) => {
    look = next;
    figure.replaceChildren(drawn());
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
      class: 'panel stack',
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
      figure,
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

  return h('main', { class: 'create' }, [
    h('header', { class: 'title' }, [
      h('h1', { text: 'Hearth & Harbour' }),
      h('p', { class: 'muted', text: 'A small town, a long road, and a house to fill.' }),
    ]),
    form,
    importToggle,
    importHolder,
  ]);
}

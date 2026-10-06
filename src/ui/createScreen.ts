import type { Look } from '../art/character';
import { FIGURE2_H } from '../art/character2';
import { NAME_MAX_LENGTH, nameProblem } from '../core/state';
import { button, h } from './dom';
import { importPanel } from './importPanel';
import { fullLook, lookPicker } from './look';
import { portrait, portraitScale } from './portrait';
import type { GameState } from '../core/state';

interface CreateScreenOptions {
  onCreate(name: string, look: Look): void;
  onImport(state: GameState): void;
}

/**
 * CSS pixels to an art pixel for the figure in the creator: as large as fits
 * in about two fifths of the screen's height, from three to four, so on any
 * phone he is the middle of the screen and the choices and the button still
 * fit below him.
 */
export function creatorScale(
  height = typeof innerHeight === 'number' ? innerHeight : 844,
  width = typeof innerWidth === 'number' ? innerWidth : 390,
): number {
  const tall = portraitScale(height * 0.36, FIGURE2_H);
  return Math.max(Math.min(width, 480) >= 350 ? 3 : 2, Math.min(tall, 4));
}

/** The first thing a new player sees: name and dress a character, or bring a save in. */
export function createScreen({ onCreate, onImport }: CreateScreenOptions): HTMLElement {
  let look = fullLook({});
  const scale = creatorScale();
  const drawn = (): HTMLCanvasElement[] => {
    const canvases = [...portrait(look, [], scale).canvases];
    figure.dataset.look = `${look.skin} ${look.hair} ${look.hairColour}`;
    return canvases;
  };
  const figure = h('div', { class: 'figure stage', attrs: { 'data-figure': '', 'data-worn': '' } });
  figure.replaceChildren(...drawn());
  const picker = lookPicker(look, (next) => {
    look = next;
    // Only the figure changes, at once, in the new look: the steppers stay under the thumb.
    figure.replaceChildren(...drawn());
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

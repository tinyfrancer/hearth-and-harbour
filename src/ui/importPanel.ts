import type { GameState } from '../core/state';
import { readSave } from '../persistence/saveFile';
import { button, h } from './dom';

interface ImportPanelOptions {
  /** Named when loading would replace a character already here. */
  replacing?: string;
  onImport(state: GameState): void;
}

/** Bring a save in, from a pasted code or a chosen file. */
export function importPanel({ replacing, onImport }: ImportPanelOptions): HTMLElement {
  const message = h('p', { class: 'problem', attrs: { role: 'alert' } });
  const confirmHolder = h('div', { class: 'stack' });
  const code = h('textarea', {
    class: 'field code',
    attrs: { rows: '3', placeholder: 'Paste a save code', 'aria-label': 'Save code' },
  });

  const offer = (text: string): void => {
    confirmHolder.replaceChildren();
    const result = readSave(text);
    if (!result.ok) {
      message.textContent = result.reason;
      return;
    }
    message.textContent = '';
    if (!replacing) {
      onImport(result.state);
      return;
    }
    // Loading over a character cannot be undone, so it is asked twice.
    confirmHolder.append(
      h('p', { text: `Replace ${replacing} with ${result.state.name}? This cannot be undone.` }),
      h('div', { class: 'row' }, [
        button(`Replace ${replacing}`, () => onImport(result.state), 'danger'),
        button('Cancel', () => confirmHolder.replaceChildren()),
      ]),
    );
  };

  const file = h('input', {
    class: 'file',
    attrs: { type: 'file', accept: '.json,application/json', 'aria-label': 'Save file' },
    on: {
      change: () => {
        const chosen = file.files?.[0];
        if (!chosen) return;
        void chosen.text().then(offer, () => {
          message.textContent = 'That file could not be read.';
        });
        file.value = '';
      },
    },
  });

  return h('section', { class: 'panel stack' }, [
    h('h2', { text: 'Load a save' }),
    code,
    button('Load code', () => offer(code.value)),
    h('label', { class: 'btn file-button' }, ['Choose a save file', file]),
    message,
    confirmHolder,
  ]);
}

import type { GameState } from '../core/state';
import { writeSaveExport } from '../persistence/saveFile';
import { button, h } from './dom';
import { importPanel } from './importPanel';
import { copyText, downloadFile } from './saveTransfer';

export interface MenuActions {
  /** Whether the save was written. */
  saveNow(): boolean;
  importSave(state: GameState): void;
  deleteCharacter(): void;
}

export function menuScreen(state: GameState, actions: MenuActions): HTMLElement {
  const status = h('p', { class: 'muted', attrs: { role: 'status' } });
  const codeOut = h('textarea', {
    class: 'field code',
    attrs: { rows: '3', readonly: '', 'aria-label': 'Your save code', hidden: '' },
  });

  const save = h('section', { class: 'panel stack' }, [
    h('h2', { text: 'Save' }),
    h('p', {
      class: 'muted',
      text: 'The game saves itself on this device. Keep a copy somewhere else now and then.',
    }),
    button('Save now', () => {
      status.textContent = actions.saveNow()
        ? 'Saved.'
        : 'Could not save: this device refused the write.';
    }),
    button('Download save file', () => {
      actions.saveNow();
      const out = writeSaveExport('file', state);
      if (out.kind === 'file') downloadFile(out.fileName, out.text);
      status.textContent = 'Save file sent to your downloads.';
    }),
    button('Copy save code', () => {
      actions.saveNow();
      const out = writeSaveExport('code', state);
      // On screen as well, since the clipboard is refused over plain http.
      codeOut.value = out.text;
      codeOut.hidden = false;
      void copyText(out.text).then((copied) => {
        status.textContent = copied ? 'Save code copied.' : 'Copy the code below by hand.';
      });
    }),
    status,
    codeOut,
  ]);

  const confirmHolder = h('div', { class: 'stack' });
  const remove = h('section', { class: 'panel stack' }, [
    h('h2', { text: 'Start over' }),
    button(
      'Delete character',
      () => {
        confirmHolder.replaceChildren(
          h('p', { text: `Delete ${state.name} for good? This cannot be undone.` }),
          h('div', { class: 'row' }, [
            button(`Delete ${state.name}`, actions.deleteCharacter, 'danger'),
            button('Cancel', () => confirmHolder.replaceChildren()),
          ]),
        );
      },
      'danger',
    ),
    confirmHolder,
  ]);

  return h('div', { class: 'stack' }, [
    save,
    importPanel({ replacing: state.name, onImport: actions.importSave }),
    remove,
    h('p', { class: 'muted version', text: `Hearth & Harbour v${__APP_VERSION__}` }),
  ]);
}

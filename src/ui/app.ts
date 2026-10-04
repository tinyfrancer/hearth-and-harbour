import { TAB_ICONS } from '../art/tabIcons';
import { pixelSvg } from '../art/pixelSvg';
import { newGame, type GameState } from '../core/state';
import type { SaveService } from '../persistence/SaveService';
import { createScreen } from './createScreen';
import { h } from './dom';
import { menuScreen } from './menuScreen';
import { TABS, type TabId } from './tabs';

export interface AppDeps {
  saves: SaveService;
  now(): number;
}

export interface App {
  /** Write the game to storage, stamped with the time. False if it failed or there is no game. */
  save(): boolean;
}

// What each empty screen says until its session fills it in.
const COMING: Record<Exclude<TabId, 'menu' | 'character'>, string> = {
  skills: 'No skills to train yet. The first one arrives with the next update.',
  bank: 'Your bank is empty.',
  town: 'The road into town is not open yet.',
};

/** Builds the whole app inside `root`: character creation, or the tabbed shell. */
export function mountApp(root: HTMLElement, { saves, now }: AppDeps): App {
  let state: GameState | null = saves.load();
  let tab: TabId = 'skills';

  const save = (): boolean => {
    if (!state) return false;
    state.savedAt = now();
    return saves.save(state);
  };

  const adopt = (next: GameState): void => {
    state = next;
    tab = 'skills';
    save();
    render();
  };

  const screen = (game: GameState): HTMLElement => {
    if (tab === 'menu') {
      return menuScreen(game, {
        saveNow: save,
        importSave: adopt,
        deleteCharacter: () => {
          saves.clear();
          state = null;
          render();
        },
      });
    }
    if (tab === 'character') {
      return h('section', { class: 'panel stack' }, [
        h('h2', { text: game.name }),
        h('p', { class: 'muted', text: 'Gear and stats will show here.' }),
      ]);
    }
    return h('section', { class: 'panel empty' }, [h('p', { class: 'muted', text: COMING[tab] })]);
  };

  const render = (): void => {
    if (!state) {
      root.replaceChildren(
        createScreen({ onCreate: (name) => adopt(newGame(name, now())), onImport: adopt }),
      );
      return;
    }
    const current = TABS.find((entry) => entry.id === tab)!;
    root.replaceChildren(
      h('header', { class: 'topbar' }, [
        h('h1', { text: current.label }),
        h('span', { class: 'who', text: state.name }),
      ]),
      h('main', { class: 'screen', attrs: { id: 'screen', 'data-tab': tab } }, [screen(state)]),
      h(
        'nav',
        { class: 'tabbar', attrs: { 'aria-label': 'Sections' } },
        TABS.map(({ id, label }) =>
          h(
            'button',
            {
              class: 'tab',
              attrs: {
                type: 'button',
                'data-tab': id,
                ...(id === tab ? { 'aria-current': 'page' } : {}),
              },
              on: {
                click: () => {
                  tab = id;
                  render();
                },
              },
            },
            [pixelSvg(TAB_ICONS[id]!), h('span', { text: label })],
          ),
        ),
      ),
    );
  };

  render();
  return { save };
}

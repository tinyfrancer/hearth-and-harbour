import { TAB_ICONS } from '../art/tabIcons';
import { pixelSvg } from '../art/pixelSvg';
import { advance, startAction, stopAction } from '../core/actions';
import type { Content } from '../core/content';
import { newGame, skillLevel, type GameState } from '../core/state';
import type { SaveService } from '../persistence/SaveService';
import { bankView } from './bankScreen';
import { createScreen } from './createScreen';
import { h } from './dom';
import { menuScreen } from './menuScreen';
import { skillListView, skillPageView } from './skillsScreen';
import { TABS, type TabId } from './tabs';
import type { View } from './view';

export interface AppDeps {
  saves: SaveService;
  content: Content;
  now(): number;
}

export interface App {
  /** Write the game to storage, stamped with the time. False if it failed or there is no game. */
  save(): boolean;
  /** Let the time since the last tick pass in the game, and show it. Called every frame. */
  tick(): void;
}

/** While something is under way, the game is written this often as well as on closing. */
const AUTOSAVE_MS = 10_000;
/**
 * The most one tick may grant. A page left in the background stops ticking and
 * then gets the whole gap at once; this holds that to the offline cap until S3
 * gives time away its proper rules and report.
 */
const MAX_TICK_MS = 24 * 60 * 60 * 1000;
const TOAST_MS = 3000;

/** Builds the whole app inside `root`: character creation, or the tabbed shell. */
export function mountApp(root: HTMLElement, { saves, content, now }: AppDeps): App {
  let state: GameState | null = saves.load();
  let tab: TabId = 'skills';
  /** The skill whose page is open on the Skills tab, or null for the list. */
  let openSkill: string | null = null;
  let view: View | null = null;
  let lastTick = now();
  let lastSave = now();
  const toasts = h('div', { class: 'toasts', attrs: { role: 'status' } });

  const save = (): boolean => {
    if (!state) return false;
    lastSave = now();
    state = { ...state, savedAt: lastSave };
    return saves.save(state);
  };

  const adopt = (next: GameState): void => {
    state = next;
    tab = 'skills';
    openSkill = null;
    lastTick = now();
    save();
    render();
  };

  const toast = (text: string): void => {
    const note = h('p', { class: 'toast', text });
    toasts.append(note);
    setTimeout(() => note.remove(), TOAST_MS);
  };

  /** A change the player made: take it, keep it, and redraw the screen. */
  const act = (next: GameState): void => {
    state = next;
    save();
    render();
  };

  const buildView = (game: GameState): View => {
    if (tab === 'menu') {
      return {
        el: menuScreen(() => state ?? game, {
          saveNow: save,
          importSave: adopt,
          deleteCharacter: () => {
            saves.clear();
            state = null;
            render();
          },
        }),
      };
    }
    if (tab === 'skills') {
      const skill = openSkill ? content.skills[openSkill] : undefined;
      if (!skill) {
        return skillListView(game, content, (id) => {
          openSkill = id;
          render();
        });
      }
      return skillPageView(game, content, skill, {
        back: () => {
          openSkill = null;
          render();
        },
        start: (actionId) => {
          const result = startAction(state ?? game, actionId, content);
          if (result.ok) act(result.state);
          else toast(result.reason);
        },
        stop: () => act(stopAction(state ?? game)),
      });
    }
    if (tab === 'bank') {
      return bankView(game, content);
    }
    if (tab === 'character') {
      return {
        el: h('section', { class: 'panel stack' }, [
          h('h2', { text: game.name }),
          h('p', { class: 'muted', text: 'Gear and stats will show here.' }),
        ]),
      };
    }
    return {
      el: h('section', { class: 'panel empty' }, [
        h('p', { class: 'muted', text: 'The road into town is not open yet.' }),
      ]),
    };
  };

  const render = (): void => {
    if (!state) {
      view = null;
      root.replaceChildren(
        createScreen({ onCreate: (name) => adopt(newGame(name, now())), onImport: adopt }),
      );
      return;
    }
    const current = TABS.find((entry) => entry.id === tab)!;
    view = buildView(state);
    root.replaceChildren(
      h('header', { class: 'topbar' }, [
        h('h1', { text: current.label }),
        h('span', { class: 'who', text: state.name }),
      ]),
      h('main', { class: 'screen', attrs: { id: 'screen', 'data-tab': tab } }, [view.el]),
      toasts,
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
                  // Tapping the tab you are on goes back to its front page.
                  if (id === tab) openSkill = null;
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

  const tick = (): void => {
    const time = now();
    const elapsed = Math.min(Math.max(time - lastTick, 0), MAX_TICK_MS);
    lastTick = time;
    if (!state?.action) return;

    const before = state;
    state = advance(state, elapsed, content);
    let redraw = false;
    for (const skill of Object.values(content.skills)) {
      const level = skillLevel(state, skill.id);
      if (level > skillLevel(before, skill.id)) {
        toast(`${skill.name} level ${level}!`);
        // A level can unlock an action, and what is on screen was built for the old one.
        redraw = true;
      }
    }
    // The bank lists only what is held, so a first log needs its row built.
    const firstOfSomething = Object.keys(state.bank).length !== Object.keys(before.bank).length;
    if (time - lastSave >= AUTOSAVE_MS) save();
    if (redraw || (tab === 'bank' && firstOfSomething)) render();
    else view?.update?.(state);
  };

  render();
  return { save, tick };
}

import { TAB_ICONS } from '../art/tabIcons';
import { pixelSvg } from '../art/pixelSvg';
import { advance, missingInput, startAction, stopAction } from '../core/actions';
import { catchUp, type AwayReport } from '../core/away';
import type { Content } from '../core/content';
import { newGame, skillLevel, type GameState } from '../core/state';
import type { SaveService } from '../persistence/SaveService';
import { awayReportOverlay } from './awayReport';
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
 * A gap this long between ticks is time away, not a slow frame: the page was
 * in the background or the phone asleep. It is paid by the same rule as a
 * closed game, and reported.
 */
const AWAY_MS = 60_000;
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
  /** The away report on screen, until it is dismissed. */
  let away: AwayReport | null = null;
  const toasts = h('div', { class: 'toasts', attrs: { role: 'status' } });

  const save = (): boolean => {
    if (!state) return false;
    lastSave = now();
    state = { ...state, savedAt: lastSave };
    return saves.save(state);
  };

  /**
   * Pay for `ms` away and keep the report to show. Used for a game that was
   * closed (measured from its last save) and for a page that was only hidden.
   */
  const returnFrom = (ms: number): void => {
    if (!state) return;
    const result = catchUp(state, ms, content);
    state = result.state;
    // A quick reload is paid like any other gap but is not worth a report.
    // Coming back twice before reading the first report keeps the newer one.
    if (ms >= AWAY_MS) away = result.report ?? away;
    save();
  };

  // A loaded or imported file is not paid for the time since it was written:
  // the same file can be loaded any number of times.
  const adopt = (next: GameState): void => {
    state = next;
    away = null;
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
      ...(away
        ? [
            awayReportOverlay(away, content, () => {
              away = null;
              render();
            }),
          ]
        : []),
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
    const elapsed = Math.max(time - lastTick, 0);
    lastTick = time;
    if (!state?.action) return;
    if (elapsed >= AWAY_MS) {
      returnFrom(elapsed);
      render();
      return;
    }

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
    if (!state.action) {
      const short = missingInput(state, content.actions[before.action!.id]!);
      toast(short ? `Out of ${content.items[short.item]?.name ?? short.item}.` : 'Stopped.');
      save();
      redraw = true;
    }
    // The bank lists only what is held, so a first log needs its row built.
    const firstOfSomething = Object.keys(state.bank).length !== Object.keys(before.bank).length;
    if (time - lastSave >= AUTOSAVE_MS) save();
    if (redraw || (tab === 'bank' && firstOfSomething)) render();
    else view?.update?.(state);
  };

  // A game that was closed: everything since its last save is time away.
  if (state) returnFrom(now() - state.savedAt);
  render();
  return { save, tick };
}

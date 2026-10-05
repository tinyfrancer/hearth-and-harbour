import { TAB_ICONS } from '../art/tabIcons';
import { pixelSvg } from '../art/pixelSvg';
import { advance, missingInput, startAction, stopAction } from '../core/actions';
import { catchUp, type AwayReport } from '../core/away';
import { sell } from '../core/bank';
import {
  DEFENCE,
  MELEE,
  RANGED,
  VITALITY,
  busy,
  loadFood,
  setEatAt,
  startFight,
  stopFight,
  unloadFood,
} from '../core/combat';
import { equip, unequip } from '../core/equipment';
import { fightEnded } from '../core/fight';
import { drinkPotion } from '../core/potions';
import { settleRun } from '../core/run';
import { SLOTS, type Content } from '../core/content';
import { newGame, skillLevel, type Fight, type GameState } from '../core/state';
import type { SaveService } from '../persistence/SaveService';
import { awayReportOverlay } from './awayReport';
import { artGallery } from '../art/gallery';
import { townView } from '../scene/townView';
import { bankView } from './bankScreen';
import { characterView, type SheetPanel } from './characterScreen';
import { areasView, fightView, type CombatActions, type FightOver } from './combatScreen';
import { createScreen } from './createScreen';
import { button, h } from './dom';
import { listed } from './format';
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
/** The skills trained by fighting, which have a Combat page instead of actions. */
const COMBAT_SKILLS: readonly string[] = [MELEE, RANGED, DEFENCE, VITALITY];

/**
 * A fight's tally as it stood at the end of `after`, when the fight is over
 * there: the last tally kept, plus what the final stretch of time changed.
 * Only the fight changes these between the two, so the differences are its.
 */
function finalTally(before: GameState, after: GameState): Fight {
  const fight = before.fight!;
  const loot = { ...fight.loot };
  for (const [item, qty] of Object.entries(after.bank)) {
    const gained = qty - (before.bank[item] ?? 0);
    if (gained > 0) loot[item] = (loot[item] ?? 0) + gained;
  }
  const left = (worn: { qty: number } | null | undefined): number => worn?.qty ?? 0;
  const monster = fight.monster;
  return {
    ...fight,
    kills:
      fight.kills + (after.bestiary[monster]?.kills ?? 0) - (before.bestiary[monster]?.kills ?? 0),
    coins: fight.coins + after.coins - before.coins,
    loot,
    eaten: fight.eaten + left(before.food) - left(after.food),
    arrows: fight.arrows + left(before.equipment.ammo) - left(after.equipment.ammo),
  };
}

/** Builds the whole app inside `root`: character creation, or the tabbed shell. */
export function mountApp(root: HTMLElement, { saves, content, now }: AppDeps): App {
  let state: GameState | null = saves.load();
  let tab: TabId = 'skills';
  /** The skill whose page is open on the Skills tab, or null for the list. */
  let openSkill: string | null = null;
  /** Which of the Combat pages is open on the Skills tab, if one is. */
  let combatPage: 'areas' | 'fight' | null = null;
  /** How the last fight ended, until the player moves on from it. */
  let fightOver: FightOver | null = null;
  /** The item whose card is open on the Bank tab, if any. */
  let openItem: string | null = null;
  /** A scene has stopped the idle clock (a dungeon run is on). */
  let idlePaused = false;
  /** Whether Menu is showing the art gallery. */
  let galleryOpen = false;
  /** What is open under the character sheet: a slot's choices, the look, or nothing. */
  let sheetPanel: SheetPanel = null;
  /** Which action headings are open on each skill's page, for as long as the app runs. */
  const openGroups = new Map<string, Set<string>>();
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
    openItem = null;
    sheetPanel = null;
    tab = 'skills';
    openSkill = null;
    combatPage = null;
    fightOver = null;
    lastTick = now();
    save();
    render();
  };

  const toast = (text: string): void => {
    const note = h('p', { class: 'toast', text });
    // Toasts sit in one spot, so a new one replaces the last rather than printing over it.
    toasts.replaceChildren(note);
    setTimeout(() => note.remove(), TOAST_MS);
  };

  /**
   * A change the player made: take it, keep it, and redraw the screen. The
   * screen is the same one, so it stays scrolled where the thumb left it: a
   * card tapped low on a long page should still be under the thumb after.
   */
  const act = (next: GameState): void => {
    state = next;
    save();
    const top = root.querySelector('#screen')?.scrollTop ?? 0;
    render();
    const screen = root.querySelector('#screen');
    if (screen) screen.scrollTop = top;
  };

  /**
   * Wear something from the bank, saying what went on and what came off to
   * make room for it: a bow's second hand is easy to forget.
   */
  const wear = (itemId: string): void => {
    const before = state;
    if (!before) return;
    const result = equip(before, itemId, content);
    if (!result.ok) {
      toast(result.reason);
      return;
    }
    const after = result.state;
    const name = (id: string): string => content.items[id]?.name ?? id;
    const off = SLOTS.flatMap((slot) => {
      const was = before.equipment[slot];
      return was && was.item !== after.equipment[slot]?.item ? [name(was.item)] : [];
    });
    const slot = content.items[itemId]!.equip!.slot;
    const worn = after.equipment[slot]!;
    const on =
      slot === 'ammo'
        ? `You ready ${worn.qty} ${name(itemId)}.`
        : slot === 'main_hand' || slot === 'off_hand'
          ? `You take up the ${name(itemId)}.`
          : `You put on the ${name(itemId)}.`;
    toast(
      off.length
        ? `${on} ${listed(off)} ${off.length === 1 ? 'goes' : 'go'} back to the bank.`
        : on,
    );
    // A card for a stack that is gone would reopen by itself the next time one is made.
    if (openItem && !after.bank[openItem]) openItem = null;
    act(after);
  };

  /** Show a different page of the same tab, from its top. */
  const turnTo = (): void => {
    render();
    const screen = root.querySelector('#screen');
    if (screen) screen.scrollTop = 0;
  };

  const combatActions = (game: GameState): CombatActions => ({
    back: () => {
      combatPage = null;
      render();
    },
    areas: () => {
      combatPage = 'areas';
      fightOver = null;
      turnTo();
    },
    showFight: () => {
      combatPage = 'fight';
      turnTo();
    },
    fight: (monsterId) => {
      const result = startFight(state ?? game, monsterId, content);
      if (!result.ok) {
        toast(result.reason);
        return;
      }
      fightOver = null;
      combatPage = 'fight';
      state = result.state;
      save();
      turnTo();
    },
    stop: () => {
      const current = state ?? game;
      if (current.fight) {
        fightOver = { monster: current.fight.monster, reason: 'stopped', tally: current.fight };
      }
      act(stopFight(current));
    },
    loadFood: (itemId) => {
      const result = loadFood(state ?? game, itemId, content);
      if (result.ok) act(result.state);
      else toast(result.reason);
    },
    unloadFood: () => act(unloadFood(state ?? game)),
    setEatAt: (percent) => act(setEatAt(state ?? game, percent)),
  });

  const buildView = (game: GameState): View => {
    if (tab === 'menu' && galleryOpen) {
      return {
        el: h('div', { class: 'stack' }, [
          button(
            '‹ Menu',
            () => {
              galleryOpen = false;
              render();
            },
            'back',
          ),
          artGallery(),
        ]),
      };
    }
    if (tab === 'menu') {
      return {
        el: menuScreen(() => state ?? game, {
          saveNow: save,
          importSave: adopt,
          showGallery: () => {
            galleryOpen = true;
            render();
          },
          deleteCharacter: () => {
            saves.clear();
            state = null;
            render();
          },
        }),
      };
    }
    if (tab === 'skills') {
      if (combatPage === 'fight') return fightView(game, content, fightOver, combatActions(game));
      if (combatPage === 'areas') return areasView(game, content, combatActions(game));
      const skill = openSkill ? content.skills[openSkill] : undefined;
      if (!skill) {
        const openCombat = (): void => {
          // Into the fight if there is one, otherwise to choose one.
          combatPage = game.fight ? 'fight' : 'areas';
          turnTo();
        };
        return skillListView(
          game,
          content,
          (id) => {
            // A combat skill has nothing to do on a page of its own: it is trained by fighting.
            if (COMBAT_SKILLS.includes(id)) {
              openCombat();
              return;
            }
            openSkill = id;
            render();
          },
          openCombat,
        );
      }
      return skillPageView(
        game,
        content,
        skill,
        {
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
        },
        openGroups,
      );
    }
    if (tab === 'bank') {
      return bankView(game, content, openItem, {
        open: (itemId) => {
          openItem = itemId;
          render();
        },
        sell: (itemId, qty) => {
          const sold = sell(state ?? game, itemId, qty, content);
          // A card for a stack that is gone would reopen by itself the next time one is gathered.
          if (!sold.bank[itemId]) openItem = null;
          act(sold);
        },
        drink: (itemId) => {
          const result = drinkPotion(state ?? game, itemId, content);
          if (!result.ok) {
            toast(result.reason);
            return;
          }
          if (!result.state.bank[itemId]) openItem = null;
          toast(`You drink the ${content.items[itemId]?.name ?? itemId}.`);
          act(result.state);
        },
        equip: wear,
        feed: (itemId) => {
          const result = loadFood(state ?? game, itemId, content);
          if (!result.ok) {
            toast(result.reason);
            return;
          }
          openItem = null;
          toast(
            `Your food slot holds ${result.state.food!.qty} ${content.items[itemId]?.name ?? itemId}.`,
          );
          act(result.state);
        },
      });
    }
    if (tab === 'character') {
      return characterView(game, content, sheetPanel, {
        open: (panel) => {
          sheetPanel = panel;
          render();
        },
        equip: (itemId) => {
          sheetPanel = null;
          wear(itemId);
        },
        unequip: (slot) => {
          sheetPanel = null;
          act(unequip(state ?? game, slot));
        },
        setLook: (look) => {
          if (!state) return;
          state = { ...state, look };
          save();
        },
      });
    }
    return townView(game, content, {
      openTab: (id) => {
        tab = id;
        render();
      },
      openSkill: (skillId) => {
        tab = 'skills';
        openSkill = content.skills[skillId] ? skillId : null;
        render();
      },
      pauseIdle: (on) => {
        // Bring the game up to this moment first, so the pause begins and
        // ends cleanly and nothing before it is lost.
        tick();
        idlePaused = on;
      },
      fullScreen: (on) => {
        root.classList.toggle('fullscreen', on);
      },
      settleRun: (spoils) => {
        if (!state) return;
        // Paid and saved on the spot, without rebuilding the tab: the scene
        // that called this is still showing its results.
        state = settleRun(state, spoils);
        save();
      },
    });
  };

  const render = (): void => {
    if (tab !== 'town' || !state) {
      // Only a scene on the Town tab may hold the clock or the whole screen.
      idlePaused = false;
      root.classList.remove('fullscreen');
    }
    if (!state) {
      view = null;
      root.replaceChildren(
        createScreen({
          onCreate: (name, look) => adopt(newGame(name, now(), look)),
          onImport: adopt,
        }),
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
                  if (id === tab) {
                    openSkill = null;
                    combatPage = null;
                    fightOver = null;
                    openItem = null;
                    galleryOpen = false;
                    sheetPanel = null;
                  }
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
    if (!state) return;
    if (idlePaused) {
      // A dungeon run: the idle task waits. Saving keeps `savedAt` moving, so
      // the time spent here is never mistaken for time away and paid for.
      if (time - lastSave >= AUTOSAVE_MS) save();
      view?.update?.(state);
      return;
    }
    if (!busy(state)) {
      // Nothing is passing in the game, but a screen may still be moving (a
      // scene's walker): every view hears every frame.
      view?.update?.(state);
      return;
    }
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
    if (before.potion && !state.potion) {
      const name = content.items[before.potion.item]?.name ?? 'potion';
      toast(`Your ${name} has worn off.`);
      // Its panel goes, and the action's numbers go back to plain.
      redraw = true;
    }
    if (before.action && !state.action) {
      const short = missingInput(state, content.actions[before.action.id]!);
      toast(short ? `Out of ${content.items[short.item]?.name ?? short.item}.` : 'Stopped.');
      save();
      redraw = true;
    }
    if (before.fight && !state.fight) {
      const reason = fightEnded(before, state, content) ?? 'gone';
      const name = content.monsters?.[before.fight.monster]?.name ?? 'monster';
      fightOver = { monster: before.fight.monster, reason, tally: finalTally(before, state) };
      toast(
        reason === 'died'
          ? `Knocked out by the ${name}. You are back at full health, resting.`
          : reason === 'no_arrows'
            ? 'Out of arrows. The fight is over.'
            : 'That fight is over.',
      );
      save();
      redraw = true;
    } else if (before.food && !state.food) {
      toast(
        `Out of ${content.items[before.food.item]?.name ?? 'food'}. Fighting on without eating.`,
      );
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

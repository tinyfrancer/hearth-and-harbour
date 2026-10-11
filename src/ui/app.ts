import { tabIcon } from '../art/icons';
import { takeStock } from '../core/achievements';
import { advance, missingInput, startAction, stopAction } from '../core/actions';
import { catchUp, type AwayReport } from '../core/away';
import { sell } from '../core/bank';
import {
  bountyReady,
  bountyReward,
  buyFromShop,
  giveUpBounty,
  handInBounty,
  readBoard,
  rerollBoard,
  setAutoBounty,
  takeBounty,
} from '../core/bounty';
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
import { equip, unequip, wornItemIds } from '../core/equipment';
import { fightEnded } from '../core/fight';
import { drinkPotion } from '../core/potions';
import { settleRun } from '../core/run';
import { buyFromStore } from '../core/store';
import { SLOTS, type AchievementDef, type Content } from '../core/content';
import { newGame, skillLevel, stat, type Fight, type GameState } from '../core/state';
import type { SaveService } from '../persistence/SaveService';
import { awayReportOverlay } from './awayReport';
import { artGallery } from '../art/gallery';
import { townView } from '../scene/townView';
import { bankView } from './bankScreen';
import { bountiesView, type BountyActions } from './bountyScreen';
import { characterView, type SheetPanel } from './characterScreen';
import { areasView, fightView, type CombatActions, type FightOver } from './combatScreen';
import { createScreen, type CreateScreen } from './createScreen';
import { achievementsView, collectionView } from './logScreen';
import { button, h } from './dom';
import { heroFace } from './face';
import { fullLook } from './look';
import { counted, listed } from './format';
import { menuScreen } from './menuScreen';
import { skillListView, skillPageView } from './skillsScreen';
import { entryName, storeView } from './storeScreen';
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
/** An achievement's note stays a little longer than a toast: it is worth reading. */
const AWARD_MS = 4500;
/** At most this many achievement notes at once; more are summed up in the last. */
const AWARDS_SHOWN = 2;
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

/** Room kept between something brought into view and the screen's edge, in CSS pixels. */
const VIEW_MARGIN = 8;

/**
 * How far to scroll `screen` down so `el` can be seen: its foot inside the
 * screen if it fits, else its top at the screen's top; never up, and never
 * further than that, so what the thumb tapped moves no more than it must.
 */
export function scrollToShow(screen: DOMRect, el: DOMRect): number {
  const below = el.bottom + VIEW_MARGIN - screen.bottom;
  if (below <= 0) return 0;
  return Math.max(0, Math.min(below, el.top - VIEW_MARGIN - screen.top));
}

/**
 * How far to scroll for a slot's choices under a doll that sticks to the
 * screen's top while they are open: as `scrollToShow` would, but never past
 * the doll's top reaching the screen's top. From there the doll stays put
 * and the choices scroll beneath it, so they are never hidden behind it.
 */
export function scrollToChoose(screen: DOMRect, doll: DOMRect, choices: DOMRect): number {
  return Math.min(scrollToShow(screen, choices), Math.max(0, doll.top - screen.top));
}

/**
 * Scrolls the screen to show `el`, gliding unless the player asked for less
 * motion; with `under`, a doll that sticks above it (`scrollToChoose`).
 */
function bringIntoView(screen: HTMLElement, el: HTMLElement, under?: HTMLElement | null): void {
  const box = screen.getBoundingClientRect();
  const by = under
    ? scrollToChoose(box, under.getBoundingClientRect(), el.getBoundingClientRect())
    : scrollToShow(box, el.getBoundingClientRect());
  if (by <= 0) return;
  const top = screen.scrollTop + by;
  const still =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // jsdom has no scrollTo; there it is set outright, as it is with less motion.
  if (!still && typeof screen.scrollTo === 'function') {
    screen.scrollTo({ top, behavior: 'smooth' });
  } else {
    screen.scrollTop = top;
  }
}

/** Builds the whole app inside `root`: character creation, or the tabbed shell. */
export function mountApp(root: HTMLElement, { saves, content, now }: AppDeps): App {
  let state: GameState | null = saves.load();
  let tab: TabId = 'skills';
  /** The skill whose page is open on the Skills tab, or null for the list. */
  let openSkill: string | null = null;
  /** Which of the Combat pages is open on the Skills tab, if one is. */
  let combatPage: 'areas' | 'fight' | 'bounties' | null = null;
  /** How the last fight ended, until the player moves on from it. */
  let fightOver: FightOver | null = null;
  /** The item whose card is open on the Bank tab, if any. */
  let openItem: string | null = null;
  /** Whether the Bank tab is showing the general store. */
  let storeOpen = false;
  /** Which of the records is open on the Character tab, if one is. */
  let records: 'log' | 'achievements' | null = null;
  /** A scene has stopped the idle clock (a dungeon run is on). */
  let idlePaused = false;
  /** Whether Menu is showing the art gallery. */
  let galleryOpen = false;
  /** What is open under the character sheet: a slot's choices, the look, or nothing. */
  let sheetPanel: SheetPanel = null;
  /** Which action headings are open on each skill's page, for as long as the app runs. */
  const openGroups = new Map<string, Set<string>>();
  let view: View | null = null;
  /** The character creator, while there is no character. */
  let creator: CreateScreen | null = null;
  /** The header's face, kept while the look and what is worn stay the same. */
  let face: { key: string; el: HTMLElement } | null = null;
  const headerFace = (game: GameState): HTMLElement => {
    const look = fullLook(game.look);
    const worn = wornItemIds(game);
    const key = JSON.stringify([look, worn]);
    if (face?.key !== key) face = { key, el: heroFace(look, worn, 'mini') };
    return face.el;
  };
  let lastTick = now();
  let lastSave = now();
  /** The away report on screen, until it is dismissed, and the achievements it earned. */
  let away: AwayReport | null = null;
  let awayEarned: string[] = [];
  /** The away report's overlay while it is up: laid over the screen, which is left alone. */
  let awayEl: HTMLElement | null = null;
  const toasts = h('div', { class: 'toasts', attrs: { role: 'status' } });
  // Achievements have notes of their own, above the toasts, so an achievement
  // earned by the same moment as a level or the end of a fight hides neither.
  const awards = h('div', { class: 'awards', attrs: { role: 'status' } });

  /** Say what was just earned: a note each, stacked, gone after a while. */
  const announce = (earned: readonly AchievementDef[]): void => {
    const shown = earned.slice(0, AWARDS_SHOWN);
    const more = earned.length - shown.length;
    shown.forEach((def, index) => {
      const extra = index === shown.length - 1 && more > 0 ? ` And ${more} more.` : '';
      const note = h('div', { class: 'award', attrs: { 'data-award': def.id } }, [
        h('p', { class: 'award-name', text: `Achievement: ${def.name}` }),
        h('p', { class: 'small', text: `${def.text}${extra}` }),
      ]);
      awards.append(note);
      setTimeout(() => note.remove(), AWARD_MS);
    });
    // Old notes give way to new ones rather than pile up the screen.
    while (awards.childElementCount > AWARDS_SHOWN) awards.firstElementChild!.remove();
  };

  /**
   * Bring the collection log and achievements up to date with whatever just
   * happened, live or away, and say what was earned.
   */
  const takeStockOf = (next: GameState): GameState => {
    const stocked = takeStock(next, content);
    if (stocked.earned.length > 0) announce(stocked.earned);
    return stocked.state;
  };

  const save = (): boolean => {
    if (!state) return false;
    state = takeStockOf(state);
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
    const had = state.achievements.length;
    state = result.state;
    save();
    // A quick reload is paid like any other gap but is not worth a report.
    // Coming back twice before reading the first report keeps the newer one,
    // and everything both earned.
    if (ms >= AWAY_MS && result.report) {
      awayEarned = [...(away ? awayEarned : []), ...state.achievements.slice(had)];
      away = result.report;
    }
  };

  // A loaded or imported file is not paid for the time since it was written:
  // the same file can be loaded any number of times.
  const adopt = (next: GameState): void => {
    state = next;
    away = null;
    openItem = null;
    storeOpen = false;
    records = null;
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
    redrawInPlace();
  };

  /** Redraws the screen, kept scrolled where it was. */
  const redrawInPlace = (): void => {
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
    bounties: () => {
      combatPage = 'bounties';
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

  /** Take a bounty rule's result: keep it and redraw, or say why not. */
  const bountyAct = (
    result: { ok: true; state: GameState } | { ok: false; reason: string },
    said?: (next: GameState) => string,
  ): void => {
    if (!result.ok) {
      toast(result.reason);
      return;
    }
    if (said) toast(said(result.state));
    act(result.state);
  };

  const monsterName = (id: string | undefined): string =>
    (id && content.monsters?.[id]?.name) ?? 'monster';

  const bountyActions = (game: GameState): BountyActions => ({
    back: () => {
      combatPage = null;
      turnTo();
    },
    read: () => bountyAct(readBoard(state ?? game, content)),
    take: (index) =>
      bountyAct(
        takeBounty(state ?? game, content, index),
        (next) => `Wanted: ${counted(next.bounty!.count, monsterName(next.bounty!.monster))}.`,
      ),
    reroll: () =>
      bountyAct(rerollBoard(state ?? game, content), () => 'Fresh notices on the board.'),
    handIn: () => {
      const before = state ?? game;
      const { points, coins } = bountyReward(before, content);
      bountyAct(handInBounty(before, content), (next) => {
        const stopped = before.fight && !next.fight ? ' The hunt is over.' : '';
        return `Bounty paid: ${points} points and ${coins} coins.${stopped} Pick the next from the board.`;
      });
    },
    giveUp: () =>
      bountyAct(
        giveUpBounty(state ?? game, content),
        () => 'Given up. Pick another from the board.',
      ),
    auto: (on) => {
      const before = state ?? game;
      const next = setAutoBounty(before, on, content);
      toast(
        on
          ? stat(next, 'bounties') > stat(before, 'bounties')
            ? `Auto bounty on. Paid, and next: ${counted(next.bounty?.count ?? 0, monsterName(next.bounty?.monster))}.`
            : 'Auto bounty on: a finished bounty hands itself in.'
          : 'Auto bounty off.',
      );
      act(next);
    },
    hunt: (monsterId) => {
      const current = state ?? game;
      if (current.fight?.monster === monsterId) {
        combatPage = 'fight';
        turnTo();
        return;
      }
      combatActions(game).fight(monsterId);
    },
    buy: (entryId) => {
      const entry = content.shop?.[entryId];
      const name = entry ? (content.items[entry.item]?.name ?? entry.item) : '';
      bountyAct(
        buyFromShop(state ?? game, entryId, content),
        () =>
          `Bought: ${entry && entry.qty > 1 ? `${entry.qty} ${name}` : `the ${name}`}. It is in the bank.`,
      );
    },
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
      if (combatPage === 'bounties') return bountiesView(game, content, bountyActions(game));
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
          () => {
            combatPage = 'bounties';
            turnTo();
          },
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
    if (tab === 'bank' && storeOpen) {
      return storeView(game, content, {
        back: () => {
          storeOpen = false;
          turnTo();
        },
        buy: (entryId) => {
          const entry = content.store?.[entryId];
          const result = buyFromStore(state ?? game, entryId, content);
          if (!result.ok) {
            toast(result.reason);
            return;
          }
          toast(
            entry?.perk
              ? `Bought: the ${entry.perk.name}. Yours for good.`
              : `Bought: ${entry ? entryName(entry, content) : entryId}. It is in the bank.`,
          );
          act(result.state);
        },
      });
    }
    if (tab === 'bank') {
      return bankView(game, content, openItem, {
        store: () => {
          storeOpen = true;
          openItem = null;
          turnTo();
        },
        // The bank opens and closes a card in place, where the thumb is: only
        // which one is open is kept here, for coming back to the tab.
        open: (itemId) => {
          openItem = itemId;
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
    if (tab === 'character' && records) {
      const back = (): void => {
        records = null;
        turnTo();
      };
      return records === 'log'
        ? collectionView(game, content, back)
        : achievementsView(game, content, back);
    }
    if (tab === 'character') {
      return characterView(game, content, sheetPanel, {
        records: (page) => {
          records = page;
          sheetPanel = null;
          turnTo();
        },
        open: (panel) => {
          sheetPanel = panel;
          // Opened where it was tapped: the sheet stays put, then moves just far
          // enough for what opened to be seen.
          redrawInPlace();
          const opened = root.querySelector<HTMLElement>(
            panel === 'look' ? '[data-look-picker]' : '[data-picker]',
          );
          const screen = root.querySelector<HTMLElement>('#screen');
          const doll = panel === 'look' ? null : root.querySelector<HTMLElement>('.doll');
          if (opened && screen) bringIntoView(screen, opened, doll);
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
        const before = state;
        state = settleRun(state, spoils, content);
        if (bountyReady(state) && !bountyReady(before)) {
          toast(
            `Bounty done: ${counted(state.bounty!.count, monsterName(state.bounty!.monster))}. Hand it in.`,
          );
        }
        save();
      },
      openBounties: () => {
        tab = 'skills';
        openSkill = null;
        combatPage = 'bounties';
        fightOver = null;
        turnTo();
      },
      keepRun: (run) => {
        if (!state) return;
        // Kept with the next save (every few seconds while a run pauses the
        // idle clock, and when the page is hidden); a run over is saved at once.
        state = { ...state, run };
        if (!run) save();
      },
      savedRun: () => state?.run ?? null,
    });
  };

  /** The away report, laid over whatever screen is showing; gone with a tap, screen untouched. */
  const awayOverlay = (): HTMLElement => {
    awayEl = awayReportOverlay(
      away!,
      content,
      () => {
        away = null;
        awayEarned = [];
        awayEl?.remove();
        awayEl = null;
      },
      awayEarned,
    );
    return awayEl;
  };

  /**
   * Builds the screen's view again in place, kept scrolled where it was, with
   * the header, tabs, notes and any report around it left as they are.
   */
  const rebuildView = (): void => {
    const screen = root.querySelector<HTMLElement>('#screen');
    if (!screen || !state) {
      render();
      return;
    }
    const top = screen.scrollTop;
    view = buildView(state);
    screen.replaceChildren(view.el);
    screen.scrollTop = top;
  };

  /** The header's face follows the outfit (the last arrow shot changes it) without a rebuild. */
  const syncHeader = (game: GameState): void => {
    const holder = root.querySelector('.who-face');
    const el = headerFace(game);
    if (holder && holder.firstElementChild !== el) holder.replaceChildren(el);
  };

  /**
   * Shows what time alone changed: in place, unless the screen says what it
   * is built of changed (`View.stale`), and then rebuilt in place.
   */
  const refresh = (before: GameState, time: number): void => {
    if (!state) return;
    syncHeader(state);
    if (view?.stale?.(before, state)) rebuildView();
    view?.update?.(state, time);
  };

  const render = (): void => {
    if (tab !== 'town' || !state) {
      // Only a scene on the Town tab may hold the clock or the whole screen.
      idlePaused = false;
      root.classList.remove('fullscreen');
    }
    if (!state) {
      view = null;
      creator = createScreen({
        onCreate: (name, look) => adopt(newGame(name, now(), look)),
        onImport: adopt,
      });
      root.replaceChildren(creator.el);
      return;
    }
    creator = null;
    const current = TABS.find((entry) => entry.id === tab)!;
    view = buildView(state);
    root.replaceChildren(
      h('header', { class: 'topbar' }, [
        h('h1', { text: current.label }),
        h('span', { class: 'who', text: state.name }),
        // Their own face beside their name, in what they wear, on every tab: a tap
        // opens the sheet. (The scene's tests tap the scene's own canvas, so a
        // canvas in the header is no trouble to them.)
        h(
          'button',
          {
            class: 'who-face',
            attrs: { type: 'button', 'aria-label': `${state.name}: the character sheet` },
            on: {
              click: () => {
                tab = 'character';
                records = null;
                render();
              },
            },
          },
          [headerFace(state)],
        ),
      ]),
      h('main', { class: 'screen', attrs: { id: 'screen', 'data-tab': tab } }, [view.el]),
      awards,
      toasts,
      ...(away ? [awayOverlay()] : []),
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
                    storeOpen = false;
                    records = null;
                    galleryOpen = false;
                    sheetPanel = null;
                  }
                  tab = id;
                  render();
                },
              },
            },
            // Art's own picture for the tab; an empty place of the same kind if it ever has none.
            [
              tabIcon(id) ?? h('span', { class: 'tab-icon', attrs: { 'aria-hidden': 'true' } }),
              h('span', { text: label }),
            ],
          ),
        ),
      ),
    );
  };

  const tick = (): void => {
    const time = now();
    const elapsed = Math.max(time - lastTick, 0);
    lastTick = time;
    if (!state) {
      // Nothing to play yet, but the figure being dressed breathes.
      creator?.breathe(time);
      return;
    }
    if (idlePaused) {
      // A dungeon run: the idle task waits. Saving keeps `savedAt` moving, so
      // the time spent here is never mistaken for time away and paid for.
      if (time - lastSave >= AUTOSAVE_MS) save();
      view?.update?.(state, time);
      return;
    }
    if (!busy(state) && !state.health) {
      // Nothing is passing in the game, but a screen may still be moving (a
      // scene's walker): every view hears every frame.
      view?.update?.(state, time);
      return;
    }
    if (elapsed >= AWAY_MS) {
      const was = state;
      const reported = away;
      returnFrom(elapsed);
      // The report goes over the screen; the screen itself changes only as a
      // frame would change it, so a page left open is as it was left.
      if (away && away !== reported) {
        awayEl?.remove();
        root.querySelector('nav.tabbar')?.before(awayOverlay());
      }
      if (was.fight && !state.fight) {
        const reason = fightEnded(was, state, content) ?? 'gone';
        fightOver = { monster: was.fight.monster, reason, tally: finalTally(was, state) };
      }
      refresh(was, time);
      return;
    }

    const before = state;
    state = takeStockOf(advance(state, elapsed, content));
    // What changed is said in a toast; which screens it changes is theirs to
    // say (`View.stale`), so a kill or a level never rebuilds a screen it
    // does not touch.
    for (const skill of Object.values(content.skills)) {
      const level = skillLevel(state, skill.id);
      if (level > skillLevel(before, skill.id)) {
        toast(`${skill.name} level ${level}!`);
      }
    }
    if (before.potion && !state.potion) {
      const name = content.items[before.potion.item]?.name ?? 'potion';
      toast(`Your ${name} has worn off.`);
    }
    if (before.action && !state.action) {
      const short = missingInput(state, content.actions[before.action.id]!);
      toast(short ? `Out of ${content.items[short.item]?.name ?? short.item}.` : 'Stopped.');
      save();
    }
    if (before.fight && !state.fight) {
      const reason = fightEnded(before, state, content) ?? 'gone';
      const name = content.monsters?.[before.fight.monster]?.name ?? 'monster';
      fightOver = { monster: before.fight.monster, reason, tally: finalTally(before, state) };
      toast(
        reason === 'died'
          ? `Knocked out by the ${name}. You come round sore, and heal as you rest.`
          : reason === 'no_arrows'
            ? 'Out of arrows. The fight is over.'
            : 'That fight is over.',
      );
      save();
    } else if (before.food && !state.food) {
      toast(
        `Out of ${content.items[before.food.item]?.name ?? 'food'}. Fighting on without eating.`,
      );
    }
    const handed = stat(state, 'bounties') - stat(before, 'bounties');
    if (handed > 0) {
      // Auto bounty handed it in and took the next, mid-fight.
      const paid = state.bountyPoints - before.bountyPoints;
      toast(
        `Bounty paid: ${counted(paid, 'point')}. Next: ${counted(state.bounty?.count ?? 0, monsterName(state.bounty?.monster))}.`,
      );
      save();
    } else if (bountyReady(state) && !bountyReady(before)) {
      toast(
        `Bounty done: ${counted(state.bounty!.count, monsterName(state.bounty!.monster))}. Hand it in.`,
      );
    }
    if (time - lastSave >= AUTOSAVE_MS) save();
    refresh(before, time);
  };

  // A game that was closed: everything since its last save is time away. A
  // dungeon run it was left in is taken up again after a quick reload (the
  // scene asks for it, `savedRun`), and no idle time is owed for the gap, as
  // the run had the idle clock stopped. Left longer, the run is over: what was
  // picked up comes home as from a run rowed back early, and then the time
  // away is paid to the idle task like any other.
  if (state) {
    const gap = now() - state.savedAt;
    if (state.run && gap < AWAY_MS) {
      lastTick = now();
    } else {
      if (state.run) {
        // Rowed home early: no clear, whatever the snapshot says.
        state = settleRun(state, { ...state.run.spoils, cleared: undefined }, content);
        toast('Your dungeon run was cut short. What you carried came home with you.');
      }
      returnFrom(gap);
    }
  }
  render();
  return { save, tick };
}

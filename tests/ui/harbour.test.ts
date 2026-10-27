import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FIGURE2_H } from '../../src/art/character2';
import { startFight } from '../../src/core/combat';
import type { Content } from '../../src/core/content';
import { settleRun } from '../../src/core/run';
import { newGame, type GameState } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { memoryPrefs, type Prefs } from '../../src/persistence/Prefs';
import { mountApp, type App } from '../../src/ui/app';
import { STRIP_TALLEST, stripScale } from '../../src/ui/nowDoing';
import type { Shell } from '../../src/ui/view';

// Wave 15, Cody: "let's make it more apparent we need to click the boat."
// The menus point a new player at the learning dungeon, once each, and the
// strip folds away. The town is a stand-in that keeps the Shell it was given.
let shell: Shell | undefined;
vi.mock('../../src/scene/townView', () => ({
  townView: (_state: unknown, _content: unknown, given: Shell) => {
    shell = given;
    return { el: document.createElement('div') };
  },
}));

let root: HTMLElement;
let clock: number;
const saves = () => new LocalStorageSaveService();
const q = <T extends HTMLElement>(selector: string): T => {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`nothing matches ${selector}`);
  return found;
};
const press = (label: string): void => {
  const found = [...root.querySelectorAll('button')].find((b) => b.textContent === label);
  if (!found) throw new Error(`no button says ${label}`);
  found.click();
};
const tab = (id: string): void => q<HTMLButtonElement>(`.tab[data-tab="${id}"]`).click();
const dot = (): Element | null => root.querySelector('.tab[data-tab="town"] [data-tab-dot]');

function playing(extra: Partial<GameState> = {}, prefs: Prefs = memoryPrefs()): App {
  saves().save({ ...newGame('Cody', clock), ...extra });
  return mountApp(root, { saves: saves(), content: CONTENT, now: () => clock, prefs });
}

/** Reopened on the same phone: the same save, the same preferences. */
function reopen(prefs: Prefs): void {
  root.replaceChildren();
  mountApp(root, { saves: saves(), content: CONTENT, now: () => clock, prefs });
}

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.replaceChildren(root);
  clock = 1000;
  shell = undefined;
});

describe('the first-steps card', () => {
  it('greets a character just made, at the top of the Skills tab, pointing at the cave', () => {
    const app = mountApp(root, { saves: saves(), content: CONTENT, now: () => clock });
    q<HTMLInputElement>('input[name="character-name"]').value = 'Cody';
    q<HTMLFormElement>('form').requestSubmit();
    const card = q('[data-first-steps]');
    expect(q('#screen').firstElementChild!.firstElementChild).toBe(card);
    expect(card.textContent).toContain('Tidepool Cave');
    expect(card.textContent).toContain('rowing boat');
    void app;
  });

  it('takes the player to the harbour with the chart asked for, and is not shown again', () => {
    const prefs = memoryPrefs();
    playing({}, prefs);
    q('[data-first-steps]');
    press('To the harbour');
    expect(q('.tab[data-tab="town"]').getAttribute('aria-current')).toBe('page');
    expect(shell!.takeRequest!()).toBe('chart');
    tab('skills');
    expect(root.querySelector('[data-first-steps]')).toBeNull();
    reopen(prefs);
    expect(root.querySelector('[data-first-steps]')).toBeNull();
  });

  it('puts itself away with "Not now", for good on this phone', () => {
    const prefs = memoryPrefs();
    playing({}, prefs);
    press('Not now');
    expect(root.querySelector('[data-first-steps]')).toBeNull();
    expect(q('.tab[data-tab="skills"]').getAttribute('aria-current')).toBe('page');
    reopen(prefs);
    expect(root.querySelector('[data-first-steps]')).toBeNull();
  });

  it('is shown afresh to a new character on the same phone', () => {
    const prefs = memoryPrefs();
    playing({}, prefs);
    press('Not now');
    clock += 5000;
    playing({}, prefs);
    expect(root.querySelector('[data-first-steps]')).not.toBeNull();
  });

  it('is not shown once the cave is cleared', () => {
    playing(settleRun(newGame('Cody', clock), { cleared: 'tidepool_cave' }, CONTENT));
    expect(root.querySelector('[data-first-steps]')).toBeNull();
  });
});

describe('the Town tab’s dot', () => {
  it('shows while an open dungeon has not been seen on the chart: a dot, not a number', () => {
    playing();
    expect(dot()).not.toBeNull();
    expect(dot()!.textContent).toBe('');
    // On every tab.
    tab('bank');
    expect(dot()).not.toBeNull();
  });

  it('goes once the chart is opened, and stays gone', () => {
    const prefs = memoryPrefs();
    playing({}, prefs);
    tab('town');
    expect(dot()).not.toBeNull();
    shell!.chartOpened!();
    expect(dot()).toBeNull();
    tab('skills');
    expect(dot()).toBeNull();
    reopen(prefs);
    expect(dot()).toBeNull();
  });

  it('goes when the chart is opened for "To the harbour", or a dungeon is rowed out to', () => {
    playing();
    press('To the harbour');
    expect(dot()).not.toBeNull();
    shell!.takeRequest!();
    expect(dot()).toBeNull();

    root.replaceChildren();
    localStorage.clear();
    clock += 5000;
    playing();
    tab('town');
    shell!.keepRun!({ dungeon: 'tidepool_cave', scene: 1, spoils: {}, data: {} });
    expect(dot()).toBeNull();
  });

  it('comes at once when a level gained by fighting opens a dungeon, with no screen rebuilt', () => {
    // A landing opened by combat level alone (none on the real chart yet).
    const content: Content = {
      ...CONTENT,
      dungeons: {
        ...CONTENT.dungeons,
        test_reef: {
          id: 'test_reef',
          name: 'Test reef',
          description: 'A reef for a test.',
          order: 9,
          recommended: 2,
          unlock: { kind: 'combat', level: 2 },
          unlockText: 'Reach combat level 2.',
          loot: [],
        },
      },
    };
    let state = newGame('Cody', clock);
    state = settleRun(state, { cleared: 'tidepool_cave' }, CONTENT);
    state = settleRun(state, { cleared: 'brinebeards_grotto' }, CONTENT);
    state = settleRun(state, { cleared: 'thistlewood_burrow' }, CONTENT);
    // A breath short of combat level 2, fighting rats.
    const almost = xpForLevel(2) - 1;
    state = {
      ...state,
      skills: { melee: almost, defence: almost, vitality: almost },
      equipment: { main_hand: { item: 'bronze_sword', qty: 1 } },
    };
    const started = startFight(state, 'dock_rat', content);
    if (!started.ok) throw new Error(started.reason);
    saves().save(started.state);
    const app = mountApp(root, { saves: saves(), content, now: () => clock });
    tab('bank');
    expect(dot()).toBeNull();
    const screen = q('#screen').firstElementChild;
    for (let i = 0; i < 60 && !dot(); i += 1) {
      clock += 1000;
      app.tick();
    }
    expect(dot()).not.toBeNull();
    expect(q('#screen').firstElementChild).toBe(screen);
  });

  it('is not worn by a character with every open dungeon cleared', () => {
    let state = newGame('Cody', clock);
    state = settleRun(state, { cleared: 'tidepool_cave' }, CONTENT);
    state = settleRun(state, { cleared: 'brinebeards_grotto' }, CONTENT);
    // Wave 20: the grotto's clear opens the burrow, which wears the dot until it is cleared too.
    playing(state);
    expect(dot()).not.toBeNull();
    root.replaceChildren();
    playing(settleRun(state, { cleared: 'thistlewood_burrow' }, CONTENT));
    expect(dot()).toBeNull();
  });
});

describe('the "now doing" strip', () => {
  it('folds to a slim bar and back, remembered on this phone', () => {
    const prefs = memoryPrefs();
    playing({ action: { id: 'chop_pine', progressMs: 0 } }, prefs);
    const strip = q('.now-strip');
    expect(strip.classList.contains('folded')).toBe(false);
    const fold = q<HTMLButtonElement>('[data-now-fold]');
    expect(fold.getAttribute('aria-expanded')).toBe('true');
    fold.click();
    expect(strip.classList.contains('folded')).toBe(true);
    expect(fold.getAttribute('aria-expanded')).toBe('false');
    // Still saying what is being done, and still a way to it.
    expect(q('[data-now-doing]').textContent).toContain('Chopping Pine');
    reopen(prefs);
    expect(q('.now-strip').classList.contains('folded')).toBe(true);
    q<HTMLButtonElement>('[data-now-fold]').click();
    expect(q('.now-strip').classList.contains('folded')).toBe(false);
  });

  it('does not draw the hero while folded', () => {
    const prefs = memoryPrefs({ 'strip-folded': '1' });
    const app = playing({ action: { id: 'chop_pine', progressMs: 0 } }, prefs);
    const stage = q<HTMLCanvasElement>('[data-now-doing] .work-stage');
    const draws = Number(stage.dataset.draws ?? 0);
    for (let i = 0; i < 30; i += 1) {
      clock += 100;
      app.tick();
    }
    expect(Number(stage.dataset.draws ?? 0)).toBe(draws);
  });

  it('fits its stage to the work under way: no other loop’s prop beside him', () => {
    const sizeOf = (extra: Partial<GameState>): { w: number; h: number; activity?: string } => {
      root.replaceChildren();
      localStorage.clear();
      playing(extra);
      const stage = q<HTMLCanvasElement>('[data-now-doing] .work-stage');
      return { w: stage.width, h: stage.height, activity: stage.dataset.activity };
    };
    const fishing = sizeOf({ action: { id: 'fish_shrimp', progressMs: 0 } });
    const resting = sizeOf({});
    expect([fishing.activity, resting.activity]).toEqual(['fishing', 'resting']);
    // Standing, he needs no room for a rod's line out over the water.
    expect(resting.w).toBeLessThan(fishing.w - 20);
    // As tall either way: he stands on the same line.
    expect(resting.h).toBe(fishing.h);
  });

  it('shows him at least 0.6 CSS pixels an art pixel where he fits, in whole device pixels', () => {
    expect([1, 2, 2.625, 3, 3.5].map((dpr) => stripScale(dpr))).toEqual([1, 1, 2, 2, 2]);
    for (const dpr of [2.625, 3]) {
      expect(stripScale(dpr) / dpr).toBeGreaterThanOrEqual(0.6);
      expect((stripScale(dpr) - 1) / dpr).toBeLessThan(0.6);
    }
  });

  it('never stands him taller than the cap on a phone, so the strip is no taller at 2x than at 3x', () => {
    for (const dpr of [2, 2.625, 3, 3.5]) {
      expect((stripScale(dpr) * FIGURE2_H) / dpr, `at ${dpr}x`).toBeLessThanOrEqual(STRIP_TALLEST);
    }
    // At 2x the next whole size up would be 72 CSS tall (the strip was 75).
    expect((2 * FIGURE2_H) / 2).toBeGreaterThan(STRIP_TALLEST);
  });
});

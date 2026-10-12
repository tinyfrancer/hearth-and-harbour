import { beforeEach, describe, expect, it, vi } from 'vitest';
import { modifierOn } from '../../src/core/progress';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { mountApp } from '../../src/ui/app';
import type { Shell } from '../../src/ui/view';

// What the shell promises a scene. The town itself is swapped for a stand-in
// that only keeps hold of the Shell it was given.
let shell: Shell | undefined;
vi.mock('../../src/scene/townView', () => ({
  townView: (_state: unknown, _content: unknown, given: Shell) => {
    shell = given;
    return { el: document.createElement('div') };
  },
}));

let root: HTMLElement;
let clock: number;
const saved = () => new LocalStorageSaveService().load();
const click = (selector: string): void => root.querySelector<HTMLElement>(selector)!.click();

/** A character chopping pine, standing on the Town tab. */
function inTown() {
  const app = mountApp(root, {
    saves: new LocalStorageSaveService(),
    content: CONTENT,
    now: () => clock,
  });
  root.querySelector<HTMLInputElement>('input[name="character-name"]')!.value = 'Cody';
  root.querySelector<HTMLFormElement>('form')!.requestSubmit();
  click('[data-skill="woodcutting"]');
  click('[data-action="chop_pine"]');
  click('.tab[data-tab="town"]');
  return app;
}

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.replaceChildren(root);
  clock = 1000;
  shell = undefined;
});

describe('the shell a scene is given', () => {
  it('stops the idle clock while paused and owes nothing for it afterwards', () => {
    const app = inTown();
    clock += 3000;
    app.tick();
    shell!.pauseIdle(true);
    // A long dungeon run, long enough to count as time away were it not paused.
    for (let i = 0; i < 40; i += 1) {
      clock += 30_000;
      app.tick();
    }
    shell!.pauseIdle(false);
    clock += 3000;
    app.tick();
    app.save();
    expect(saved()?.bank).toEqual({ pine_logs: 2 });
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });

  it('pays what was earned up to the moment the pause began', () => {
    const app = inTown();
    clock += 3000;
    shell!.pauseIdle(true);
    app.save();
    expect(saved()?.bank).toEqual({ pine_logs: 1 });
  });

  it('does not pay a paused run as time away if the game is closed during it', () => {
    const app = inTown();
    shell!.pauseIdle(true);
    clock += 20 * 60_000;
    app.tick();
    const reopenedAt = saved()!.savedAt;
    expect(reopenedAt).toBe(clock);
  });

  it('hides the bars for a full-screen scene and brings them back on request', () => {
    inTown();
    shell!.fullScreen(true);
    expect(root.classList.contains('fullscreen')).toBe(true);
    shell!.fullScreen(false);
    expect(root.classList.contains('fullscreen')).toBe(false);
  });

  it('gives the clock and the bars back when the Town tab is left', () => {
    const app = inTown();
    shell!.pauseIdle(true);
    shell!.fullScreen(true);
    shell!.openTab('bank');
    expect(root.classList.contains('fullscreen')).toBe(false);
    clock += 3000;
    app.tick();
    app.save();
    expect(saved()?.bank).toEqual({ pine_logs: 1 });
  });

  it('holds a fight still while paused: no blows, no dice, nothing owed afterwards', () => {
    const app = mountApp(root, {
      saves: new LocalStorageSaveService(),
      content: CONTENT,
      now: () => clock,
    });
    root.querySelector<HTMLInputElement>('input[name="character-name"]')!.value = 'Cody';
    root.querySelector<HTMLFormElement>('form')!.requestSubmit();
    click('[data-combat]');
    click('[data-monster="dock_rat"]');
    click('.tab[data-tab="town"]');
    clock += 1000;
    app.tick();
    shell!.pauseIdle(true);
    app.save();
    const before = saved()!;
    for (let i = 0; i < 40; i += 1) {
      clock += 30_000;
      app.tick();
    }
    app.save();
    const during = saved()!;
    expect(during.fight).toEqual(before.fight);
    expect(during.rng).toBe(before.rng);
    expect(during.skills).toEqual(before.skills);
    shell!.pauseIdle(false);
    // The first blow, 2.4 seconds in, falls 1.4 seconds after the pause ends.
    clock += 1399;
    app.tick();
    app.save();
    expect(saved()!.rng).toBe(before.rng);
    clock += 1;
    app.tick();
    app.save();
    expect(saved()!.rng).not.toBe(before.rng);
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });

  it("banks a run's spoils at once, without disturbing the idle task", () => {
    const app = inTown();
    clock += 3000;
    app.tick();
    shell!.pauseIdle(true);
    shell!.settleRun({ xp: { melee: 120 }, loot: { hide: 2 }, coins: 30 });
    expect(saved()).toMatchObject({
      skills: { melee: 120, woodcutting: 10 },
      bank: { hide: 2, pine_logs: 1 },
      coins: 30,
      action: { id: 'chop_pine' },
    });
  });

  it("counts a run's kills towards the bestiary and the bounty held, and keeps a clear", () => {
    const app = inTown();
    app.save();
    const before = saved()!;
    new LocalStorageSaveService().save({
      ...before,
      bounty: { monster: 'dock_rat', count: 10, done: 8 },
    });
    root.replaceChildren();
    const again = mountApp(root, {
      saves: new LocalStorageSaveService(),
      content: CONTENT,
      now: () => clock,
    });
    click('.tab[data-tab="town"]');
    shell!.settleRun({
      kills: { dock_rat: 3, deckhand: 4, kraken: 2 },
      cleared: 'brinebeards_grotto',
      timeMs: 432_100,
    });
    again.save();
    expect(saved()).toMatchObject({
      bestiary: { dock_rat: { kills: 3, seen: [] }, deckhand: { kills: 4, seen: [] } },
      bounty: { monster: 'dock_rat', count: 10, done: 10 },
      dungeons: { brinebeards_grotto: { clears: 1, bestMs: 432_100 } },
    });
    // The grotto's cast is kept like any monster; someone in no table or cast counts for nothing.
    expect(saved()!.bestiary.kraken).toBeUndefined();
    // Nothing is laid over the scene's results card (wave 18)...
    expect(root.querySelector('.toast')).toBeNull();
    expect(root.querySelector('[data-award]')).toBeNull();
    // ...it is all said back in the menus: the bounty, and the clear's achievement.
    click('.tab[data-tab="bank"]');
    expect(root.querySelector('.toast')?.textContent).toBe(
      'Bounty done: 10 Dock rats. Hand it in.',
    );
    expect(root.querySelector('[data-award="grotto_cleared"]')).not.toBeNull();
  });

  it('opens the notice board from town', () => {
    inTown();
    expect(shell!.openBounties).toBeDefined();
    shell!.openBounties!();
    expect(root.querySelector('.tab[aria-current="page"]')?.getAttribute('data-tab')).toBe(
      'skills',
    );
    expect(root.querySelector('[data-bounty]')).not.toBeNull();
    expect(root.textContent).toContain('Bounty points');
  });
});

describe('a dungeon run kept through a reload', () => {
  const run = {
    dungeon: 'brinebeards_grotto',
    scene: 1,
    spoils: { loot: { doubloon: 4 }, coins: 30, xp: { melee: 50 }, kills: { deckhand: 2 } },
    data: { room: 'tide_pools', battle: { seed: 9, clock: 1200 } },
  };
  /** In a run: the scene has stopped the idle clock and handed over its snapshot. */
  const inRun = () => {
    const app = inTown();
    shell!.pauseIdle(true);
    shell!.keepRun!(run);
    clock += 10_000;
    app.tick();
    return app;
  };
  const reload = (after: number) => {
    root.replaceChildren();
    clock += after;
    shell = undefined;
    mountApp(root, { saves: new LocalStorageSaveService(), content: CONTENT, now: () => clock });
    click('.tab[data-tab="town"]');
  };

  it('opens on the Town tab after a quick reload, where the scene takes it up', () => {
    const app = inRun();
    app.save();
    root.replaceChildren();
    clock += 20_000;
    shell = undefined;
    mountApp(root, { saves: new LocalStorageSaveService(), content: CONTENT, now: () => clock });
    expect(root.querySelector('.tab[data-tab="town"]')!.getAttribute('aria-current')).toBe('page');
    // The scene was built at once, and given the run.
    expect(shell!.savedRun!()).toEqual(run);
  });

  it('opens where it always does after a long gap, the run come home', () => {
    const app = inRun();
    app.save();
    root.replaceChildren();
    clock += 2 * 60 * 60 * 1000;
    mountApp(root, { saves: new LocalStorageSaveService(), content: CONTENT, now: () => clock });
    expect(root.querySelector('.tab[data-tab="skills"]')!.getAttribute('aria-current')).toBe(
      'page',
    );
  });

  it('is written with the save and handed back to the scene after a quick reload', () => {
    const app = inRun();
    app.save();
    expect(saved()!.run).toEqual(run);
    const logs = saved()!.bank.pine_logs ?? 0;
    reload(20_000);
    expect(shell!.savedRun!()).toEqual(run);
    // Nothing settled yet, and no idle time paid for the reload: the run had the clock.
    expect(saved()!.bank.doubloon).toBeUndefined();
    expect(saved()!.bank.pine_logs ?? 0).toBe(logs);
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });

  it('comes home from its spoils, as rowed back early, when left for longer, then pays the time away', () => {
    const app = inRun();
    app.save();
    reload(2 * 60 * 60 * 1000);
    const after = saved()!;
    expect(after.run).toBeNull();
    expect(after.bank.doubloon).toBe(4);
    expect(after.bestiary.deckhand?.kills).toBe(2);
    expect(after.dungeons).toEqual({});
    expect(shell!.savedRun!()).toBeNull();
    expect(root.textContent).toContain('Your dungeon run was cut short.');
    // The idle task was paid for the night as for any closed game.
    expect(after.bank.pine_logs).toBeGreaterThan(1000);
  });

  it('is let go once the run is settled', () => {
    inRun();
    shell!.settleRun({ loot: { doubloon: 1 } });
    expect(saved()!.run).toBeNull();
    shell!.keepRun!(run);
    shell!.keepRun!(null);
    expect(saved()!.run).toBeNull();
  });
});

describe('the harbour chart, asked for from the menus', () => {
  it('opens the Town tab with the chart asked for, taken once', () => {
    inTown();
    click('.tab[data-tab="skills"]');
    // Twice: the first comes back to the woodcutting page, the second to the list.
    click('.tab[data-tab="skills"]');
    click('[data-combat]');
    click('[data-dungeons] button.primary');
    expect(root.querySelector('.tab[data-tab="town"]')!.getAttribute('aria-current')).toBe('page');
    expect(shell!.takeRequest!()).toBe('chart');
    expect(shell!.takeRequest!()).toBeNull();
  });

  it('asks nothing of a town opened by its tab', () => {
    inTown();
    expect(shell!.takeRequest!()).toBeNull();
  });

  it('drops a request the town did not take before the tab was left', () => {
    inTown();
    click('.tab[data-tab="skills"]');
    // Twice: the first comes back to the woodcutting page, the second to the list.
    click('.tab[data-tab="skills"]');
    click('[data-combat]');
    click('[data-dungeons] button.primary');
    const asked = shell!;
    click('.tab[data-tab="bank"]');
    click('.tab[data-tab="town"]');
    expect(asked.takeRequest!()).toBeNull();
    expect(shell!.takeRequest!()).toBeNull();
  });

  it("pays a dungeon's first clear once, and says so", () => {
    inTown();
    shell!.settleRun({ cleared: 'tidepool_cave', coins: 7, timeMs: 100_000 });
    expect(saved()!.bank).toMatchObject({ bronze_sword: 1, cooked_shrimp: 5 });
    // Said once back in the menus, not over the results card.
    expect(root.querySelector('.toast')).toBeNull();
    click('.tab[data-tab="bank"]');
    expect(root.querySelector('.toast')!.textContent).toBe(
      'First clear of Tidepool Cave! Into the bank: a Bronze sword and 5 Cooked shrimp.',
    );
    click('.tab[data-tab="town"]');
    shell!.settleRun({ cleared: 'tidepool_cave' });
    expect(saved()!.bank).toMatchObject({ bronze_sword: 1, cooked_shrimp: 5 });
    expect(saved()!.dungeons.tidepool_cave).toEqual({ clears: 2, bestMs: 100_000 });
  });
});

describe('the day’s modifier and challenges, for a scene (S16)', () => {
  it('names today’s modifier by the app’s clock and the phone’s time zone, turning at local midnight', () => {
    // 23:30 UTC: still the 11th in London's winter, already the 12th an hour ahead.
    clock = Date.UTC(2026, 9, 11, 23, 30);
    const at = (utcOffset: number): (string | null)[] => {
      root.replaceChildren();
      shell = undefined;
      mountApp(root, {
        saves: new LocalStorageSaveService(),
        content: CONTENT,
        now: () => clock,
        utcOffset: () => utcOffset,
      });
      if (!saved()) {
        root.querySelector<HTMLInputElement>('input[name="character-name"]')!.value = 'Cody';
        root.querySelector<HTMLFormElement>('form')!.requestSubmit();
      }
      click('.tab[data-tab="town"]');
      return [
        shell!.todaysModifier!('brinebeards_grotto'),
        shell!.todaysModifier!('tidepool_cave'),
      ];
    };
    const day = (d: number): (string | null)[] => [
      modifierOn(d, 'brinebeards_grotto', CONTENT),
      modifierOn(d, 'tidepool_cave', CONTENT),
    ];
    const eleventh = Math.floor(Date.UTC(2026, 9, 11) / 86_400_000);
    expect(at(0)).toEqual(day(eleventh));
    expect(at(60)).toEqual(day(eleventh + 1));
    expect(shell!.todaysModifier!('unknown_2')).toBeNull();
  });

  it('pays a challenge met by a clear once, and says so', () => {
    inTown();
    const stats = {
      timeMs: 110_000,
      damageTaken: 14,
      foodEaten: 0,
      braces: 2,
      stepOuts: 1,
      knockedOut: false,
      kills: 7,
    };
    const run = { cleared: 'tidepool_cave', dungeon: 'tidepool_cave', timeMs: 110_000, stats };
    shell!.settleRun(run);
    expect(saved()!.dungeons.tidepool_cave!.challenges).toEqual([
      'tidepool_cave.quick',
      'tidepool_cave.no_food',
    ]);
    expect(root.querySelector('.toast')).toBeNull();
    click('.tab[data-tab="bank"]');
    expect(root.querySelector('.toast')!.textContent).toBe(
      'First clear of Tidepool Cave! Into the bank: a Bronze sword and 5 Cooked shrimp. ' +
        'Challenge done: Brisk! 250 coins and 2 bounty points. ' +
        'Challenge done: Packed Lunch, Uneaten! 100 coins and 5 Cooked shrimp.',
    );
    expect(saved()!.coins).toBe(350);
    root.querySelector('.toast')!.remove();
    click('.tab[data-tab="town"]');
    shell!.settleRun(run);
    click('.tab[data-tab="bank"]');
    expect(saved()!.coins).toBe(350);
    // Nothing new to say.
    expect(root.querySelector('.toast')).toBeNull();
  });
});

describe('things remembered for a scene (wave 16)', () => {
  const reopen = (after: number): void => {
    root.replaceChildren();
    clock += after;
    shell = undefined;
    mountApp(root, { saves: new LocalStorageSaveService(), content: CONTENT, now: () => clock });
    click('.tab[data-tab="town"]');
  };

  it('remembers a key at once, in the save, through a reload', () => {
    inTown();
    expect(shell!.remembered!('town.pan')).toBe(false);
    shell!.remember!('town.pan');
    expect(shell!.remembered!('town.pan')).toBe(true);
    // Saved there and then, without waiting for the next save.
    expect(saved()!.seen).toEqual(['town.pan']);
    reopen(5_000);
    expect(shell!.remembered!('town.pan')).toBe(true);
    expect(shell!.remembered!('cave.lesson.attack')).toBe(false);
  });

  it('keeps each key once, in the order remembered, and ignores keys of the wrong shape', () => {
    inTown();
    for (const key of ['cave.lesson.attack', 'town.pan', 'cave.lesson.attack']) {
      shell!.remember!(key);
    }
    shell!.remember!('not a key');
    shell!.remember!('x'.repeat(49));
    expect(saved()!.seen).toEqual(['cave.lesson.attack', 'town.pan']);
    expect(shell!.remembered!('not a key')).toBe(false);
  });

  it('does not rebuild the screen under the scene, nor disturb the idle task', () => {
    const app = inTown();
    const screen = root.querySelector('#screen')!.firstElementChild;
    clock += 3000;
    app.tick();
    shell!.remember!('town.pan');
    expect(root.querySelector('#screen')!.firstElementChild).toBe(screen);
    expect(saved()!.bank).toEqual({ pine_logs: 1 });
  });
});

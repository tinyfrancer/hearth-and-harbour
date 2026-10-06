import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    expect(root.querySelector('.toast')?.textContent).toBe(
      'Bounty done: 10 Dock rats. Hand it in.',
    );
    // A clear is an achievement, said at once.
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

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
});

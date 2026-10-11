import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { mountApp, type App } from '../../src/ui/app';

// Cody chose the harbour at dusk for a title screen: the first thing on every cold start.
let root: HTMLElement;
let clock: number;
const saves = () => new LocalStorageSaveService();
const q = <T extends HTMLElement>(selector: string): T => {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`nothing matches ${selector}`);
  return found;
};
const HOUR = 60 * 60 * 1000;
const open = (): App =>
  mountApp(root, { saves: saves(), content: CONTENT, now: () => clock, title: true });
const saving = (extra: Partial<GameState> = {}): void => {
  saves().save({ ...newGame('Cody', clock), ...extra });
};

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.replaceChildren(root);
  clock = 1000;
});

describe('the title screen', () => {
  it('opens a new player on "Tap to begin", which leads to making a character', async () => {
    const app = open();
    expect(q('[data-title="new"]').textContent).toContain('Hearth & Harbour');
    expect(q('[data-title-go="begin"]').textContent).toBe('Tap to begin');
    expect(q('.title-version').textContent).toMatch(/^v/);
    expect(root.querySelector('.tabbar')).toBeNull();
    // The picture is loaded after the screen is up, never before it.
    await vi.dynamicImportSettled();
    expect(q('.title-picture')).toBeTruthy();
    app.tick();
    q<HTMLButtonElement>('[data-title-go]').click();
    expect(q('input[name="character-name"]')).toBeTruthy();
    expect(root.querySelector('[data-title]')).toBeNull();
  });

  it('opens a game on "Continue" with its name and time away, paying that time only on Continue', () => {
    saving({ action: { id: 'chop_pine', progressMs: 0 } });
    clock += 3 * HOUR;
    const app = open();
    expect(q('[data-title-go="continue"]').textContent).toBe('Continue');
    expect(q('.title-who').textContent).toBe('Cody · away 3h');
    // Sitting on the title pays nothing and stamps nothing, whatever the phone does.
    clock += 10 * 60 * 1000;
    app.tick();
    expect(app.save()).toBe(false);
    expect(saves().load()!.savedAt).toBe(1000);
    expect(saves().load()!.bank).toEqual({});
    // Continue: the time away is paid as on any start, with its report.
    q<HTMLButtonElement>('[data-title-go]').click();
    expect(q('[role="dialog"]').textContent).toContain('3h 10m');
    expect(saves().load()!.savedAt).toBe(clock);
    expect(saves().load()!.bank.pine_logs).toBeGreaterThan(3000);
    expect(q('.tabbar')).toBeTruthy();
  });

  it('is not shown again when a page left in the background comes back', () => {
    saving({ action: { id: 'chop_pine', progressMs: 0 } });
    const app = open();
    q<HTMLButtonElement>('[data-title-go]').click();
    clock += HOUR;
    app.tick();
    expect(root.querySelector('[data-title]')).toBeNull();
    expect(q('[role="dialog"]').textContent).toContain('While you were away');
  });

  it('is a menu entry away, saved first, and Continue comes back in', () => {
    saving();
    const app = open();
    q<HTMLButtonElement>('[data-title-go]').click();
    q<HTMLButtonElement>('.tab[data-tab="menu"]').click();
    clock += 5000;
    [...root.querySelectorAll('button')].find((b) => b.textContent === 'Title screen')!.click();
    expect(saves().load()!.savedAt).toBe(clock);
    expect(q('[data-title="continue"]').textContent).toContain('Cody');
    app.tick();
    q<HTMLButtonElement>('[data-title-go]').click();
    expect(q('.tabbar')).toBeTruthy();
  });

  it('keeps a dungeon run left a moment ago, decided by the gap at opening', () => {
    saving({
      run: {
        dungeon: 'brinebeards_grotto',
        scene: 1,
        spoils: {},
        data: {},
      },
    });
    clock += 20_000;
    open();
    clock += 2 * 60 * 1000;
    q<HTMLButtonElement>('[data-title-go]').click();
    // Still there for the scene to take up.
    expect(saves().load()?.run ?? null).not.toBeNull();
  });
});

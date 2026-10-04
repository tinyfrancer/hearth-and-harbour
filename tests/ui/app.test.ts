import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { writeSaveExport } from '../../src/persistence/saveFile';
import { newGame } from '../../src/core/state';
import { mountApp } from '../../src/ui/app';
import { CONTENT } from '../../src/data';

// The whole shell, driven the way a thumb would, against real storage.
let root: HTMLElement;
let clock: number;
const mount = () =>
  mountApp(root, { saves: new LocalStorageSaveService(), content: CONTENT, now: () => clock });

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
const create = (name: string): void => {
  q<HTMLInputElement>('input[name="character-name"]').value = name;
  q<HTMLFormElement>('form').requestSubmit();
};

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.replaceChildren(root);
  clock = 1000;
});

describe('the app shell', () => {
  it('asks a new player for a name and refuses an empty one', () => {
    mount();
    create('   ');
    expect(q('.problem').textContent).toMatch(/needs a name/);
    expect(root.querySelector('.tabbar')).toBeNull();
  });

  it('creates a named character and still has them after a reload', () => {
    mount();
    create('Cody');
    expect(q('.who').textContent).toBe('Cody');

    root.replaceChildren();
    mount();
    expect(q('.who').textContent).toBe('Cody');
  });

  it('has the five tabs and shows the one that was tapped', () => {
    mount();
    create('Cody');
    const labels = [...root.querySelectorAll('.tab')].map((el) => el.textContent);
    expect(labels).toEqual(['Skills', 'Bank', 'Character', 'Town', 'Menu']);
    for (const id of ['bank', 'character', 'town', 'menu', 'skills']) {
      tab(id);
      expect(q('#screen').dataset.tab).toBe(id);
      expect(q('.tab[aria-current="page"]').dataset.tab).toBe(id);
    }
  });

  it('stamps the save with the time when asked to save', () => {
    const app = mount();
    expect(app.save()).toBe(false);
    create('Cody');
    clock = 5000;
    expect(app.save()).toBe(true);
    expect(new LocalStorageSaveService().load()).toMatchObject({ createdAt: 1000, savedAt: 5000 });
  });

  it('shows a save code that loads back in on a fresh device', () => {
    mount();
    create('Cody');
    tab('menu');
    press('Copy save code');
    const code = q<HTMLTextAreaElement>('textarea[aria-label="Your save code"]').value;

    localStorage.clear();
    root.replaceChildren();
    mount();
    press('I have a save');
    q<HTMLTextAreaElement>('textarea[aria-label="Save code"]').value = code;
    press('Load code');
    expect(q('.who').textContent).toBe('Cody');
    expect(new LocalStorageSaveService().load()?.name).toBe('Cody');
  });

  it('explains a bad code and changes nothing', () => {
    mount();
    press('I have a save');
    q<HTMLTextAreaElement>('textarea[aria-label="Save code"]').value = 'nonsense';
    press('Load code');
    expect(root.textContent).toContain("That isn't a Hearth & Harbour save.");
    expect(root.querySelector('.tabbar')).toBeNull();
  });

  it('asks before a loaded save replaces the character', () => {
    mount();
    create('Cody');
    tab('menu');
    q<HTMLTextAreaElement>('textarea[aria-label="Save code"]').value = writeSaveExport(
      'code',
      newGame('Meg', 1),
    ).text;
    press('Load code');
    expect(q('.who').textContent).toBe('Cody');
    press('Replace Cody');
    expect(q('.who').textContent).toBe('Meg');
  });

  it('deletes the character only after a second tap', () => {
    mount();
    create('Cody');
    tab('menu');
    press('Delete character');
    press('Cancel');
    expect(new LocalStorageSaveService().load()?.name).toBe('Cody');
    press('Delete character');
    press('Delete Cody');
    expect(new LocalStorageSaveService().load()).toBeNull();
    expect(root.querySelector('input[name="character-name"]')).not.toBeNull();
  });

  describe('woodcutting', () => {
    const openWoodcutting = (): void => q<HTMLButtonElement>('[data-skill="woodcutting"]').click();
    const card = (id: string): HTMLElement => q(`[data-action="${id}"]`);
    /** Let `ms` pass in frames, the way a running page would. */
    const wait = (app: { tick(): void }, ms: number): void => {
      for (let passed = 0; passed < ms; passed += 16) {
        clock += Math.min(16, ms - passed);
        app.tick();
      }
    };

    it('chops pine: the bar fills, logs reach the bank, XP is paid', () => {
      const app = mount();
      create('Cody');
      openWoodcutting();
      expect(card('chop_oak').tagName).toBe('DIV');
      expect(card('chop_oak').textContent).toContain('Level 8');

      card('chop_pine').click();
      expect(card('chop_pine').getAttribute('aria-pressed')).toBe('true');
      wait(app, 1500);
      expect(q('.bar.action').getAttribute('aria-valuenow')).toBe('50');
      expect(card('chop_pine').textContent).toContain('Pine logs: 0');

      wait(app, 1500 + 6000);
      expect(card('chop_pine').textContent).toContain('Pine logs: 3');
      expect(root.textContent).toContain('30 / 40 XP');

      tab('bank');
      expect(q('[data-item="pine_logs"] .qty').textContent).toBe('3');
      wait(app, 3000);
      expect(q('[data-item="pine_logs"] .qty').textContent).toBe('4');
    });

    it('announces a level and stops when tapped again', () => {
      const app = mount();
      create('Cody');
      openWoodcutting();
      card('chop_pine').click();
      wait(app, 12_000);
      expect(q('.toast').textContent).toBe('Woodcutting level 2!');
      expect(q('.level').textContent).toBe('Level 2');

      card('chop_pine').click();
      expect(card('chop_pine').getAttribute('aria-pressed')).toBe('false');
      wait(app, 9000);
      expect(card('chop_pine').textContent).toContain('Pine logs: 4');
    });

    it('unlocks oak at level 8 and keeps everything through a reload', () => {
      const app = mount();
      create('Cody');
      openWoodcutting();
      card('chop_pine').click();
      // One long tick, as a page coming back from the background gets.
      clock += 30 * 60 * 1000;
      app.tick();
      expect(card('chop_oak').tagName).toBe('BUTTON');
      card('chop_oak').click();
      wait(app, 4000);
      app.save();

      root.replaceChildren();
      const again = mount();
      expect(q('[data-skill="woodcutting"]').textContent).toContain('Level 8');
      expect(q('[data-skill="woodcutting"]').textContent).toContain('Chopping Oak');
      openWoodcutting();
      expect(card('chop_oak').textContent).toContain('Oak logs: 1');
      wait(again, 4000);
      expect(card('chop_oak').textContent).toContain('Oak logs: 2');
    });
  });
});

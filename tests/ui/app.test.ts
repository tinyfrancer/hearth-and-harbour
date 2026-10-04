import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { writeSaveExport } from '../../src/persistence/saveFile';
import { newGame } from '../../src/core/state';
import { mountApp } from '../../src/ui/app';

// The whole shell, driven the way a thumb would, against real storage.
let root: HTMLElement;
let clock: number;
const mount = () => mountApp(root, { saves: new LocalStorageSaveService(), now: () => clock });

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
});

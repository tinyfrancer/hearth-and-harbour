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
      press('Carry on');
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

  describe('time away', () => {
    const HOUR = 60 * 60 * 1000;
    const startChopping = (): void => {
      q<HTMLButtonElement>('[data-skill="woodcutting"]').click();
      q<HTMLButtonElement>('[data-action="chop_pine"]').click();
    };
    const report = (): HTMLElement => q('[role="dialog"]');

    it('pays for a closed game when it is opened again, and says what happened', () => {
      const app = mount();
      create('Cody');
      startChopping();
      app.save();

      root.replaceChildren();
      clock += 2 * HOUR;
      mount();
      expect(report().textContent).toContain('2h, chopping Pine');
      expect(report().textContent).toContain('Pine logs+2,474');
      expect(report().textContent).toContain('Woodcutting XP+24,740');
      expect(report().textContent).toContain('Woodcutting level 1 → 14');
      expect(report().textContent).toContain('New: Oak');
      expect(report().textContent).not.toContain('New: Willow');
      expect(report().textContent).toContain('Pine mastery 1 → 22');
      expect(new LocalStorageSaveService().load()).toMatchObject({
        bank: { pine_logs: 2474 },
        savedAt: clock,
      });

      press('Carry on');
      expect(root.querySelector('[role="dialog"]')).toBeNull();
      expect(q('[data-skill="woodcutting"]').textContent).toContain('Level 14');
    });

    it('does not pay the same night twice', () => {
      const app = mount();
      create('Cody');
      startChopping();
      app.save();
      clock += 2 * HOUR;
      root.replaceChildren();
      mount();
      root.replaceChildren();
      mount();
      expect(new LocalStorageSaveService().load()?.bank).toEqual({ pine_logs: 2474 });
    });

    it('counts a day at most and says so', () => {
      const app = mount();
      create('Cody');
      startChopping();
      app.save();
      root.replaceChildren();
      clock += 31 * HOUR;
      mount();
      expect(report().textContent).toContain('1d 7h');
      expect(report().textContent).toContain('Only the first 1d count.');
      expect(new LocalStorageSaveService().load()?.bank).toEqual({ pine_logs: 31_484 });
    });

    it('treats a page left in the background the same way', () => {
      const app = mount();
      create('Cody');
      startChopping();
      clock += 3 * HOUR;
      app.tick();
      expect(report().textContent).toContain('3h, chopping Pine');
      expect(report().textContent).toContain('Pine logs+3,733');
    });

    it('pays a quick reload without making a report of it', () => {
      const app = mount();
      create('Cody');
      startChopping();
      app.save();
      root.replaceChildren();
      clock += 9000;
      mount();
      expect(root.querySelector('[role="dialog"]')).toBeNull();
      expect(new LocalStorageSaveService().load()?.bank).toEqual({ pine_logs: 3 });
    });

    it('says nothing to a character who was doing nothing', () => {
      const app = mount();
      create('Cody');
      app.save();
      root.replaceChildren();
      clock += 5 * HOUR;
      mount();
      expect(root.querySelector('[role="dialog"]')).toBeNull();
    });

    it('does not pay a loaded save file for the time since it was written', () => {
      const old = { ...newGame('Meg', 1), action: { id: 'chop_pine', progressMs: 0 } };
      clock = 50 * HOUR;
      mount();
      press('I have a save');
      q<HTMLTextAreaElement>('textarea[aria-label="Save code"]').value = writeSaveExport(
        'code',
        old,
      ).text;
      press('Load code');
      expect(root.querySelector('[role="dialog"]')).toBeNull();
      expect(new LocalStorageSaveService().load()?.bank).toEqual({});
    });
  });

  describe('the other gathering skills', () => {
    it('lists all four under Gathering and lets each be trained', () => {
      const app = mount();
      create('Cody');
      const names = [...root.querySelectorAll('[data-group="Gathering"] [data-skill] h2')].map(
        (el) => el.textContent,
      );
      expect(names).toEqual(['Woodcutting', 'Fishing', 'Mining', 'Foraging']);

      q<HTMLButtonElement>('[data-skill="fishing"]').click();
      q<HTMLButtonElement>('[data-action="fish_shrimp"]').click();
      clock += 4000;
      app.tick();
      expect(q('[data-action="fish_shrimp"]').textContent).toContain('Raw shrimp: 1');
    });

    it('does one thing at a time: starting to mine stops the fishing', () => {
      const app = mount();
      create('Cody');
      q<HTMLButtonElement>('[data-skill="fishing"]').click();
      q<HTMLButtonElement>('[data-action="fish_shrimp"]').click();
      press('‹ All skills');
      q<HTMLButtonElement>('[data-skill="mining"]').click();
      q<HTMLButtonElement>('[data-action="mine_copper"]').click();
      clock += 5000;
      app.tick();
      press('‹ All skills');
      expect(q('[data-skill="mining"]').textContent).toContain('Mining Copper');
      expect(q('[data-skill="fishing"]').textContent).not.toContain('Catching');
      app.save();
      expect(new LocalStorageSaveService().load()?.bank).toEqual({ copper_ore: 1 });
    });
  });

  describe('artisan skills', () => {
    /** A character who already has some things in the bank, as if they had been gathering. */
    const stocked = (bank: Record<string, number>, skills: Record<string, number> = {}) => {
      new LocalStorageSaveService().save({ ...newGame('Cody', clock), bank, skills });
      return mount();
    };
    const card = (id: string): HTMLElement => q(`[data-action="${id}"]`);

    it('lists the five artisan skills under their own heading', () => {
      mount();
      create('Cody');
      const headings = [...root.querySelectorAll('.group-heading')].map((el) => el.textContent);
      expect(headings).toEqual(['Gathering', 'Artisan']);
      const artisan = [...root.querySelectorAll('[data-group="Artisan"] [data-skill] h2')].map(
        (el) => el.textContent,
      );
      expect(artisan).toEqual(['Cooking', 'Smithing', 'Crafting', 'Fletching', 'Alchemy']);
    });

    it('cooks shrimp until the raw ones run out, and says so', () => {
      const app = stocked({ raw_shrimp: 3 });
      q<HTMLButtonElement>('[data-skill="cooking"]').click();
      expect(card('cook_shrimp').textContent).toContain('Raw shrimp × 1');
      expect(q('[data-action="cook_shrimp"] [data-input="raw_shrimp"] .qty').textContent).toBe('3');
      expect(card('cook_shrimp').textContent).toContain('Enough for 3');

      card('cook_shrimp').click();
      clock += 2000;
      app.tick();
      expect(card('cook_shrimp').textContent).toContain('Enough for 2');
      expect(card('cook_shrimp').textContent).toContain('Cooked shrimp: 1');

      clock += 5000;
      app.tick();
      expect(q('.toast').textContent).toBe('Out of Raw shrimp.');
      expect(card('cook_shrimp').getAttribute('aria-pressed')).toBe('false');
      expect(card('cook_shrimp').classList).toContain('short');
      expect(card('cook_shrimp').textContent).toContain('Not enough Raw shrimp');
      expect(card('cook_shrimp').textContent).toContain('Cooked shrimp: 3');
      expect(new LocalStorageSaveService().load()?.bank).toEqual({ cooked_shrimp: 3 });
    });

    it('will not smelt without tin, and says what is short', () => {
      stocked({ copper_ore: 5 });
      q<HTMLButtonElement>('[data-skill="smithing"]').click();
      const bronze = card('smelt_bronze');
      expect(bronze.classList).toContain('short');
      expect(bronze.getAttribute('aria-disabled')).toBe('true');
      expect(bronze.textContent).toContain('Not enough Tin ore');
      expect(bronze.textContent).not.toContain('Tap to start');
      expect(q('[data-input="copper_ore"]').classList).not.toContain('short');
      expect(q('[data-input="tin_ore"]').classList).toContain('short');
      bronze.click();
      expect(q('.toast').textContent).toBe('Needs 1 Tin ore.');
      expect(card('smelt_bronze').getAttribute('aria-pressed')).toBe('false');
    });

    it('smelts bars and then makes something of them', () => {
      const app = stocked({ copper_ore: 4, tin_ore: 2 });
      q<HTMLButtonElement>('[data-skill="smithing"]').click();
      expect(card('smelt_bronze').textContent).toContain('Enough for 2');
      expect(card('smith_bronze_axe').textContent).toContain('Not enough Bronze bar');
      card('smelt_bronze').click();
      clock += 3000;
      app.tick();
      // The axe card comes good as the first bar lands, without leaving the page.
      expect(card('smith_bronze_axe').classList).not.toContain('short');
      expect(card('smith_bronze_axe').textContent).toContain('Enough for 1');
      clock += 3000;
      app.tick();
      expect(q('.toast').textContent).toBe('Out of Tin ore.');
      card('smith_bronze_axe').click();
      clock += 6000;
      app.tick();
      app.save();
      expect(new LocalStorageSaveService().load()?.bank).toEqual({ copper_ore: 2, bronze_axe: 2 });
    });

    it('reports a night of cooking that ran out of fish', () => {
      const app = stocked({ raw_shrimp: 100 });
      q<HTMLButtonElement>('[data-skill="cooking"]').click();
      card('cook_shrimp').click();
      app.save();
      root.replaceChildren();
      clock += 8 * 60 * 60 * 1000;
      mount();
      const report = q('[role="dialog"]').textContent;
      expect(report).toContain('cooking Shrimp');
      expect(report).toContain('Raw shrimp−100');
      expect(report).toContain('Cooked shrimp+100');
      expect(report).toContain('Stopped: you ran out of Raw shrimp.');
    });

    it("names the new recipes on the bank's item cards", () => {
      stocked({ raw_cod: 1, copper_ore: 1, bronze_bar: 1 });
      tab('bank');
      q<HTMLButtonElement>('[data-item="raw_cod"]').click();
      expect(q('[data-card="raw_cod"]').textContent).toContain('Used inCooking (Cod)');
      press('Close');
      q<HTMLButtonElement>('[data-item="copper_ore"]').click();
      expect(q('[data-card="copper_ore"]').textContent).toContain('Used inSmithing (Bronze bar)');
      press('Close');
      q<HTMLButtonElement>('[data-item="bronze_bar"]').click();
      const bar = q('[data-card="bronze_bar"]').textContent;
      expect(bar).toContain('FromSmithing (Bronze bar)');
      expect(bar).toContain('Smithing (Bronze axe), Smithing (Bronze arrowheads)');
    });

    it('keeps a recipe locked until its level, whatever is in the bank', () => {
      stocked({ raw_cod: 10 }, { cooking: 0 });
      q<HTMLButtonElement>('[data-skill="cooking"]').click();
      expect(card('cook_cod').tagName).toBe('DIV');
      expect(card('cook_cod').textContent).toContain('Level 15');
    });
  });

  describe('Crafting, Fletching and Alchemy', () => {
    const card = (id: string): HTMLElement => q(`[data-action="${id}"]`);

    it('makes ten arrow shafts from a log, and says ten on the card', () => {
      new LocalStorageSaveService().save({ ...newGame('Cody', clock), bank: { pine_logs: 2 } });
      const app = mount();
      q<HTMLButtonElement>('[data-skill="fletching"]').click();
      expect(card('fletch_arrow_shafts').querySelector('h2')?.textContent).toBe('Arrow shafts ×10');
      card('fletch_arrow_shafts').click();
      clock += 2000;
      app.tick();
      expect(card('fletch_arrow_shafts').textContent).toContain('Arrow shafts: 10');
      expect(card('fletch_arrow_shafts').textContent).toContain('Enough for 1');
    });

    it('brews a potion from a herb and a vial crafted from a shell', () => {
      new LocalStorageSaveService().save({
        ...newGame('Cody', clock),
        bank: { seashells: 1, sageleaf: 1 },
      });
      const app = mount();
      q<HTMLButtonElement>('[data-skill="crafting"]').click();
      card('craft_shell_vial').click();
      clock += 2000;
      app.tick();
      press('‹ All skills');
      q<HTMLButtonElement>('[data-skill="alchemy"]').click();
      card('brew_sage_tonic').click();
      clock += 3000;
      app.tick();
      app.save();
      expect(new LocalStorageSaveService().load()?.bank).toEqual({ sage_tonic: 1 });
    });
  });

  describe('potions', () => {
    const card = (id: string): HTMLElement => q(`[data-action="${id}"]`);
    const begin = (extra: Partial<ReturnType<typeof newGame>> = {}) => {
      new LocalStorageSaveService().save({
        ...newGame('Cody', clock),
        bank: { sage_tonic: 2, steady_draught: 1 },
        ...extra,
      });
      return mount();
    };
    const openCard = (item: string): void => {
      tab('bank');
      q<HTMLButtonElement>(`[data-item="${item}"]`).click();
    };

    it("says on the bank's card what a potion does, and drinks one", () => {
      begin();
      openCard('sage_tonic');
      const text = q('[data-card="sage_tonic"]').textContent;
      expect(text).toContain('Does10% quicker');
      expect(text).toContain('ForGathering skills');
      expect(text).toContain('Lasts150 actions');
      press('Drink Sage tonic');
      expect(q('.toast').textContent).toBe('You drink the Sage tonic.');
      expect(q('[data-card="sage_tonic"] .card-head .qty').textContent).toBe('1');
      expect(new LocalStorageSaveService().load()?.potion).toEqual({
        item: 'sage_tonic',
        charges: 150,
      });
    });

    it('shows the potion on the Skills tab and on the pages of the skills it helps', () => {
      begin({ potion: { item: 'sage_tonic', charges: 150 } });
      const panel = q('[data-potion="sage_tonic"]');
      expect(panel.textContent).toContain('Sage tonic');
      expect(panel.textContent).toContain('150 left');
      expect(panel.textContent).toContain('10% quicker · Gathering skills');
      q<HTMLButtonElement>('[data-skill="woodcutting"]').click();
      expect(q('[data-potion="sage_tonic"]').textContent).toContain('150 left');
      press('‹ All skills');
      q<HTMLButtonElement>('[data-skill="cooking"]').click();
      expect(root.querySelector('[data-potion]')).toBeNull();
    });

    it('uses a charge a completion, and the action carries on unaided when it runs out', () => {
      const app = begin({ potion: { item: 'sage_tonic', charges: 3 } });
      q<HTMLButtonElement>('[data-skill="woodcutting"]').click();
      const rate = (): HTMLElement => q('[data-action="chop_pine"] .card-head .muted');
      expect(rate().textContent).toBe('2.7s · 10 XP');
      expect(rate().classList).toContain('potion-helped');
      card('chop_pine').click();
      clock += 2700;
      app.tick();
      expect(q('[data-potion="sage_tonic"]').textContent).toContain('2 left');
      expect(q('[data-potion] .bar').getAttribute('aria-valuenow')).toBe('1');

      clock += 2 * 2700;
      app.tick();
      expect(q('.toast').textContent).toBe('Your Sage tonic has worn off.');
      expect(root.querySelector('[data-potion]')).toBeNull();
      // Back to plain, less the mastery three chops have earned.
      expect(rate().textContent).toBe('2.99s · 10 XP');
      expect(rate().classList).not.toContain('potion-helped');
      expect(card('chop_pine').getAttribute('aria-pressed')).toBe('true');
      clock += 3000;
      app.tick();
      expect(card('chop_pine').textContent).toContain('Pine logs: 4');
    });

    it('asks before pouring away charges, and does nothing on Cancel', () => {
      begin({ potion: { item: 'steady_draught', charges: 40 } });
      openCard('sage_tonic');
      press('Drink Sage tonic');
      expect(q('[data-card="sage_tonic"]').textContent).toContain(
        'Your Steady-hand draught still has 40 charges left.',
      );
      press('Cancel');
      expect(new LocalStorageSaveService().load()?.potion).toEqual({
        item: 'steady_draught',
        charges: 40,
      });
      press('Drink Sage tonic');
      press('Replace Steady-hand draught');
      expect(new LocalStorageSaveService().load()?.potion).toEqual({
        item: 'sage_tonic',
        charges: 150,
      });
    });

    it('closes the card when the last of a potion is drunk', () => {
      begin();
      openCard('steady_draught');
      press('Drink Steady-hand draught');
      expect(root.querySelector('[data-card]')).toBeNull();
      expect(root.querySelector('[data-item="steady_draught"]')).toBeNull();
    });

    it('says in the away report how many charges went, and that it wore off', () => {
      const app = begin({ potion: { item: 'sage_tonic', charges: 150 } });
      q<HTMLButtonElement>('[data-skill="woodcutting"]').click();
      card('chop_pine').click();
      app.save();
      root.replaceChildren();
      clock += 2 * 60 * 60 * 1000;
      mount();
      expect(q('[role="dialog"]').textContent).toContain(
        'Sage tonic: 150 charges used, and it has worn off.',
      );
      press('Carry on');
      expect(root.querySelector('[data-potion]')).toBeNull();
    });

    it('says how many were used when some are left', () => {
      const app = begin({ potion: { item: 'sage_tonic', charges: 150 } });
      q<HTMLButtonElement>('[data-skill="woodcutting"]').click();
      card('chop_pine').click();
      clock += 2 * 60 * 1000;
      app.tick();
      expect(q('[role="dialog"]').textContent).toContain('Sage tonic: 44 charges used.');
      press('Carry on');
      expect(q('[data-potion]').textContent).toContain('106 left');
    });
  });

  describe('mastery', () => {
    it('shows on the action card and shortens the time as it grows', () => {
      const app = mount();
      create('Cody');
      q<HTMLButtonElement>('[data-skill="woodcutting"]').click();
      const pine = q<HTMLButtonElement>('[data-action="chop_pine"]');
      expect(pine.textContent).toContain('Mastery 1');
      expect(pine.textContent).toContain('3s · 10 XP');
      pine.click();
      clock += 40_000;
      app.tick();
      expect(q('[data-action="chop_pine"]').textContent).toContain('Mastery 3');
      expect(q('[data-action="chop_pine"]').textContent).toContain('2.99s · 10 XP');
    });
  });

  describe('the bank', () => {
    const stock = (): { tick(): void } => {
      const app = mount();
      create('Cody');
      q<HTMLButtonElement>('[data-skill="woodcutting"]').click();
      q<HTMLButtonElement>('[data-action="chop_pine"]').click();
      clock += 45_000;
      app.tick();
      q<HTMLButtonElement>('[data-action="chop_pine"]').click();
      tab('bank');
      return app;
    };
    const coins = (): string => q('.purse .qty').textContent ?? '';

    it('opens an item card that says where a thing comes from and what it is worth', () => {
      stock();
      expect(coins()).toBe('0');
      q<HTMLButtonElement>('[data-item="pine_logs"]').click();
      const card = q('[data-card="pine_logs"]');
      expect(card.textContent).toContain('15');
      expect(card.textContent).toContain('FromWoodcutting (Pine)');
      expect(card.textContent).toContain(
        'Used inFletching (Arrow shafts), Fletching (Pine shortbow)',
      );
      expect(card.textContent).toContain('Worth1 coin each');
      press('Close');
      expect(root.querySelector('[data-card]')).toBeNull();
    });

    it('sells one, ten, and then all that is left', () => {
      stock();
      q<HTMLButtonElement>('[data-item="pine_logs"]').click();
      press('Sell 1 for 1 coin');
      expect(coins()).toBe('1');
      q<HTMLButtonElement>('[data-sell="10"]').click();
      press('Sell 10 for 10 coins');
      expect(coins()).toBe('11');
      // Only four left: a hundred is offered as what there is.
      q<HTMLButtonElement>('[data-sell="100"]').click();
      press('Sell 4 for 4 coins');
      expect(coins()).toBe('15');
      expect(root.querySelector('[data-card]')).toBeNull();
      expect(root.textContent).toContain('Your bank is empty');
      expect(new LocalStorageSaveService().load()).toMatchObject({ coins: 15, bank: {} });
    });

    it('sells everything held with All', () => {
      stock();
      q<HTMLButtonElement>('[data-item="pine_logs"]').click();
      q<HTMLButtonElement>('[data-sell="all"]').click();
      press('Sell 15 for 15 coins');
      expect(coins()).toBe('15');
    });
  });

  // What is behind a door belongs to its lane and changes without this file
  // knowing, so these check that the door opens, not what it shows.
  describe("the lanes' doors", () => {
    it('opens the art gallery from Menu and comes back', () => {
      mount();
      create('Cody');
      tab('menu');
      press('Art gallery');
      const page = q('#screen > .stack');
      expect(page.children).toHaveLength(2);
      expect(page.firstElementChild?.textContent).toBe('‹ Menu');
      expect(q('#screen').textContent).not.toContain('Save now');
      press('‹ Menu');
      expect(q('#screen').textContent).toContain('Save now');
    });

    it('shows the town and the character through their own views', () => {
      mount();
      create('Cody');
      tab('town');
      expect(q('#screen[data-tab="town"]').children).toHaveLength(1);
      tab('character');
      expect(q('#screen h2').textContent).toBe('Cody');
    });
  });

  describe('what a view can rely on', () => {
    it('hears every frame even when the character is doing nothing', () => {
      const app = mount();
      create('Cody');
      // The skill list rewrites its status line on update; emptying it by hand
      // and ticking shows whether update ran.
      const xp = q('[data-skill="woodcutting"] .bar');
      xp.setAttribute('aria-valuenow', 'stale');
      clock += 16;
      app.tick();
      expect(xp.getAttribute('aria-valuenow')).toBe('0');
    });
  });
});

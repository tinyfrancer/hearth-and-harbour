import { beforeEach, describe, expect, it } from 'vitest';
import { freshFight } from '../../src/core/combat';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { memoryPrefs, type Prefs } from '../../src/persistence/Prefs';
import { mountApp, type App } from '../../src/ui/app';
import { bankOrder, categoryOf, shortCount } from '../../src/ui/bankOrder';

// Cody: "Too much scrolling, maybe. Shrink the icons of items and have rows, sort features."
let root: HTMLElement;
let clock: number;
const saves = () => new LocalStorageSaveService();
const q = <T extends HTMLElement>(selector: string): T => {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`nothing matches ${selector}`);
  return found;
};
const tab = (id: string): void => q<HTMLButtonElement>(`.tab[data-tab="${id}"]`).click();
const shown = (): string[] =>
  [...root.querySelectorAll<HTMLElement>('[data-item]')].map((el) => el.dataset.item!);

function playing(extra: Partial<GameState> = {}, prefs: Prefs = memoryPrefs()): App {
  saves().save({
    ...newGame('Cody', clock),
    equipment: { main_hand: { item: 'bronze_sword', qty: 1 } },
    ...extra,
  });
  return mountApp(root, { saves: saves(), content: CONTENT, now: () => clock, prefs });
}
const sortBy = (id: string): void => {
  const select = q<HTMLSelectElement>('[data-bank-sort]');
  select.value = id;
  select.dispatchEvent(new Event('change'));
};

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.replaceChildren(root);
  clock = 1000;
});

const bank = {
  pine_logs: 1500,
  cooked_shrimp: 4,
  sage_tonic: 2,
  bronze_sword: 1,
  bronze_arrows: 70,
  hide: 3,
  copper_ore: 9,
};

describe('kinds and order', () => {
  it('reads each item’s kind off its own row and the action tables', () => {
    const kind = (id: string) => categoryOf(CONTENT.items[id]!, CONTENT);
    expect(kind('pine_logs')).toBe('resources');
    expect(kind('bronze_bar')).toBe('resources');
    expect(kind('cooked_shrimp')).toBe('food');
    expect(kind('sage_tonic')).toBe('potions');
    expect(kind('bronze_sword')).toBe('equipment');
    expect(kind('bronze_arrows')).toBe('ammunition');
    expect(kind('doubloon')).toBe('other');
  });

  it('sorts by kind, name, value, a stack’s worth, count and newest find', () => {
    const state = { ...newGame('Cody', 0), bank, collection: Object.keys(bank) };
    const order = (sort: Parameters<typeof bankOrder>[2]['sort']) =>
      bankOrder(state, CONTENT, { sort, filter: 'all', search: '' });
    expect(order('type')).toEqual(
      [
        'pine_logs',
        'copper_ore',
        'hide',
        'cooked_shrimp',
        'sage_tonic',
        'bronze_sword',
        'bronze_arrows',
      ].filter((id) => order('type').includes(id)),
    );
    expect(order('type').indexOf('cooked_shrimp')).toBeLessThan(
      order('type').indexOf('sage_tonic'),
    );
    expect(order('name')[0]).toBe('bronze_arrows');
    const value = order('value').map((id) => CONTENT.items[id]!.value);
    expect(value).toEqual([...value].sort((a, b) => b - a));
    expect(order('count')[0]).toBe('pine_logs');
    expect(order('stack')[0]).toBe('pine_logs');
    expect(order('newest')).toEqual([...Object.keys(bank)].reverse());
    expect(bankOrder(state, CONTENT, { sort: 'type', filter: 'food', search: '' })).toEqual([
      'cooked_shrimp',
    ]);
    expect(bankOrder(state, CONTENT, { sort: 'name', filter: 'all', search: 'BRONZE' })).toEqual([
      'bronze_arrows',
      'bronze_sword',
    ]);
  });

  it('shortens a count for a cell, rounding down', () => {
    expect(shortCount(999)).toBe('999');
    expect(shortCount(1234)).toBe('1.2k');
    expect(shortCount(1999)).toBe('1.9k');
    expect(shortCount(12_345)).toBe('12k');
    expect(shortCount(123_456)).toBe('123k');
    expect(shortCount(1_234_567)).toBe('1.2M');
    expect(shortCount(45_000_000)).toBe('45M');
  });
});

describe('the bank’s grid', () => {
  it('shows each stack as a cell with a short count, headed by kind', () => {
    playing({ bank });
    tab('bank');
    expect(q('[data-item="pine_logs"] .qty').textContent).toBe('1.5k');
    expect(q('[data-item="pine_logs"]').textContent).toContain('Pine logs');
    expect(
      [...root.querySelectorAll<HTMLElement>('[data-heading]')].map((el) => el.dataset.heading),
    ).toEqual(
      ['resources', 'other', 'food', 'potions', 'equipment', 'ammunition'].filter((id) =>
        root.querySelector(`[data-heading="${id}"]`),
      ),
    );
    // The card has the full count.
    q<HTMLButtonElement>('[data-item="pine_logs"]').click();
    expect(q('[data-card="pine_logs"] .card-head .qty').textContent).toBe('1,500');
    // A second tap on the same cell closes it.
    q<HTMLButtonElement>('[data-item="pine_logs"]').click();
    expect(root.querySelector('[data-card]')).toBeNull();
  });

  it('keeps the sort chosen on this device, and the kind and search for the session', () => {
    const prefs = memoryPrefs();
    playing({ bank }, prefs);
    tab('bank');
    sortBy('name');
    expect(shown()[0]).toBe('bronze_arrows');
    expect(prefs.get('bank-sort')).toBe('name');
    expect(root.querySelector('[data-heading]')).toBeNull();
    q<HTMLButtonElement>('[data-filter="equipment"]').click();
    expect(shown()).toEqual(['bronze_sword']);
    // Away to another tab and back: the same.
    tab('skills');
    tab('bank');
    expect(shown()).toEqual(['bronze_sword']);
    q<HTMLButtonElement>('[data-filter="equipment"]').click();
    const search = q<HTMLInputElement>('[data-bank-search]');
    search.value = 'shr';
    search.dispatchEvent(new Event('input'));
    expect(shown()).toEqual(['cooked_shrimp']);
    // A new session on the same device sorts the same way, and shows everything.
    root.replaceChildren();
    playing({ bank }, prefs);
    tab('bank');
    expect(q<HTMLSelectElement>('[data-bank-sort]').value).toBe('name');
    expect(shown()[0]).toBe('bronze_arrows');
    expect(shown()).toHaveLength(Object.keys(bank).length);
  });

  it('takes a new kind in without a rebuild, the open card and its cell untouched', () => {
    const app = playing({
      bank: { copper_ore: 9 },
      fight: freshFight(CONTENT.monsters!.dock_rat!, 20),
    });
    tab('bank');
    q<HTMLButtonElement>('[data-item="copper_ore"]').click();
    const card = q('[data-card="copper_ore"]');
    const cell = q('[data-item="copper_ore"]');
    for (let guard = 0; !root.querySelector('[data-item="hide"]'); guard += 1) {
      clock += 250;
      app.tick();
      if (guard > 4000) throw new Error('no hide');
    }
    expect(q('[data-card="copper_ore"]')).toBe(card);
    expect(q('[data-item="copper_ore"]')).toBe(cell);
    expect(cell.getAttribute('aria-pressed')).toBe('true');
  });

  it('does not shuffle the cells as counts climb, sorted by count', () => {
    const app = playing({
      bank: { pine_logs: 1, oak_logs: 2, copper_ore: 3 },
      action: { id: 'chop_pine', progressMs: 0 },
    });
    tab('bank');
    sortBy('count');
    expect(shown()).toEqual(['copper_ore', 'oak_logs', 'pine_logs']);
    for (let i = 0; i < 80; i += 1) {
      clock += 250;
      app.tick();
    }
    expect(Number(q('[data-item="pine_logs"] .qty').textContent)).toBeGreaterThan(3);
    expect(shown()).toEqual(['copper_ore', 'oak_logs', 'pine_logs']);
    // Sorting again puts it first.
    sortBy('count');
    expect(shown()[0]).toBe('pine_logs');
  });
});

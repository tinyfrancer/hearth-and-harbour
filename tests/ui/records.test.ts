import { beforeEach, describe, expect, it } from 'vitest';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { mountApp, type App } from '../../src/ui/app';

// The general store, the collection log and achievements, driven the way a
// thumb would, against real storage.
let root: HTMLElement;
let clock: number;
const saves = () => new LocalStorageSaveService();
const saved = (): GameState => saves().load()!;

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
const lastToast = (): string => [...root.querySelectorAll('.toast')].at(-1)?.textContent ?? '';
const awards = (): string[] =>
  [...root.querySelectorAll('[data-award]')].map((note) => note.getAttribute('data-award')!);

function playing(extra: Partial<GameState> = {}): App {
  saves().save({ ...newGame('Cody', clock), ...extra });
  return mountApp(root, { saves: saves(), content: CONTENT, now: () => clock });
}

function play(app: App, ms: number): void {
  for (let spent = 0; spent < ms; spent += 1000) {
    clock += 1000;
    app.tick();
  }
}

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.replaceChildren(root);
  clock = 1000;
});

describe('the general store', () => {
  it('is reached from the bank, and sells for coins into the bank', () => {
    playing({ coins: 2000 });
    q<HTMLButtonElement>('.tab[data-tab="bank"]').click();
    q<HTMLButtonElement>('[data-store-door]').click();
    expect(q('[data-store]').textContent).toContain('The general store');
    expect(q('.purse .qty').textContent).toBe('2,000');
    const arrows = q<HTMLButtonElement>('[data-buy="bronze_arrows"]');
    expect(arrows.textContent).toBe('Buy for 1,500 coins');
    arrows.click();
    expect(lastToast()).toBe('Bought: Bronze arrows ×50. It is in the bank.');
    expect(saved()).toMatchObject({
      coins: 500,
      bank: { bronze_arrows: 50 },
      stats: { bought: 1 },
    });
    expect(q('.purse .qty').textContent).toBe('500');
    // What the purse cannot reach says so, and waits.
    const sword = q<HTMLButtonElement>('[data-buy="bronze_sword"]');
    expect(sword.disabled).toBe(false);
    const cap = q<HTMLButtonElement>('[data-buy="velvet_cap"]');
    expect(cap.disabled).toBe(true);
    expect(q('[data-stock="velvet_cap"]').textContent).toContain(
      'Needs 75,000 coins; you have 500.',
    );
    // A first purchase is an achievement.
    expect(awards()).toContain('first_purchase');
    press('‹ Bank');
    expect(root.querySelector('[data-item="bronze_arrows"]')).not.toBeNull();
  });

  it('keeps a lasting thing for good, and potions then last longer', () => {
    playing({ coins: 200_000, bank: { sage_tonic: 2 } });
    q<HTMLButtonElement>('.tab[data-tab="bank"]').click();
    q<HTMLButtonElement>('[data-store-door]').click();
    q<HTMLButtonElement>('[data-buy="potion_case"]').click();
    expect(saved().perks).toEqual(['potion_case']);
    expect(q<HTMLButtonElement>('[data-buy="potion_case"]').textContent).toBe('Yours');
    expect(q<HTMLButtonElement>('[data-buy="potion_case"]').disabled).toBe(true);
    press('‹ Bank');
    q<HTMLButtonElement>('[data-item="sage_tonic"]').click();
    expect(q('[data-card="sage_tonic"]').textContent).toContain('Lasts225 actions');
    press('Drink Sage tonic');
    expect(saved().potion).toEqual({ item: 'sage_tonic', charges: 225 });
  });
});

describe('the collection log', () => {
  it('fills as things are found, live, with its count on the character sheet', () => {
    const app = playing({ bank: { seashells: 3 } });
    q<HTMLButtonElement>('[data-skill="woodcutting"]').click();
    q<HTMLButtonElement>('[data-action="chop_pine"]').click();
    q<HTMLButtonElement>('.tab[data-tab="character"]').click();
    // What the save already held is found from the first look.
    const total = q('[data-log] .qty').textContent!;
    expect(total).toMatch(/^1 \/ \d+$/);
    q<HTMLButtonElement>('[data-log]').click();
    expect(q('[data-log-item="seashells"]').classList).toContain('found');
    expect(q('[data-log-item="pine_logs"]').classList).not.toContain('found');
    expect(q('[data-log-item="pine_logs"]').textContent).toBe('?');
    expect(q('[data-source="skills:Gathering"] .small').textContent).toMatch(/^1 \/ 13$/);
    // A log is cut while the page is open, and turns over in place.
    play(app, 3000);
    expect(q('[data-log-item="pine_logs"]').classList).toContain('found');
    expect(q('[data-log-item="pine_logs"]').textContent).toBe('Pine logs');
    expect(q('[data-source="skills:Gathering"] .small').textContent).toBe('2 / 13');
    expect(q('[data-found]').textContent).toMatch(/^2 \/ \d+$/);
    app.save();
    expect(saved().collection).toEqual(['seashells', 'pine_logs']);
    // The grotto has a heading of its own, nothing found in it yet.
    expect(q('[data-source="dungeon:brinebeards_grotto"]').textContent).toContain('0 / 8');
    press('‹ Character');
    expect(q('[data-log] .qty').textContent).toMatch(/^2 \/ \d+$/);
  });
});

describe('achievements', () => {
  it('are earned with a note when the state shows them, and listed earned or not', () => {
    const app = playing();
    q<HTMLButtonElement>('[data-skill="woodcutting"]').click();
    q<HTMLButtonElement>('[data-action="chop_pine"]').click();
    play(app, 3000);
    expect(awards()).toEqual(['first_log']);
    expect(q('[data-award="first_log"]').textContent).toContain('Achievement: Timber!');
    // A level's toast shows beside it, and neither hides the other.
    play(app, 9000);
    expect(lastToast()).toBe('Woodcutting level 2!');
    expect(awards()).toEqual(['first_log']);
    app.save();
    expect(saved().achievements).toEqual(['first_log']);
    q<HTMLButtonElement>('.tab[data-tab="character"]').click();
    q<HTMLButtonElement>('[data-achievements]').click();
    expect(q('[data-earned]').textContent).toMatch(/^1 \/ \d+$/);
    expect(q('[data-achievement="first_log"]').classList).toContain('earned');
    expect(q('[data-achievement="first_catch"]').classList).not.toContain('earned');
    // A hidden one keeps its secret until earned.
    expect(q('[data-achievement="doubloon"]').textContent).toContain('???');
    expect(q('[data-achievement="doubloon"]').textContent).not.toContain('doubloon');
  });

  it('are earned on return from time away, and said so', () => {
    const app = playing();
    q<HTMLButtonElement>('[data-skill="fishing"]').click();
    q<HTMLButtonElement>('[data-action="fish_shrimp"]').click();
    app.save();
    root.replaceChildren();
    clock += 2 * 60 * 60 * 1000;
    mountApp(root, { saves: saves(), content: CONTENT, now: () => clock });
    expect(awards()).toEqual(expect.arrayContaining(['first_catch', 'level_10']));
    // The away report says so too, where it will be read.
    expect(q('[role="dialog"] [data-away-award="first_catch"]').textContent).toBe(
      'Achievement: A Bite',
    );
    expect(saved().achievements).toEqual(expect.arrayContaining(['first_catch', 'level_10']));
  });

  it('come to an old save on its first load, from what it proves', () => {
    const old = {
      ...newGame('Cody', clock),
      version: 7,
      bank: { pine_logs: 4 },
      coins: 12,
    } as Record<string, unknown>;
    for (const key of ['collection', 'achievements', 'dungeons', 'stats', 'perks']) delete old[key];
    localStorage.setItem('hearth-and-harbour:save', JSON.stringify(old));
    mountApp(root, { saves: saves(), content: CONTENT, now: () => clock });
    expect(saved()).toMatchObject({
      version: 8,
      coins: 120,
      collection: ['pine_logs'],
      achievements: ['first_log'],
    });
    expect(awards()).toEqual(['first_log']);
  });
});

describe('the tab bar', () => {
  it('shows art’s own picture for every tab', () => {
    playing();
    for (const tab of root.querySelectorAll('.tab')) {
      // The first scale's placeholder glyphs are gone: every tab has art's icon.
      expect(tab.querySelector('.tab-icon canvas'), tab.getAttribute('data-tab')!).not.toBeNull();
    }
  });
});

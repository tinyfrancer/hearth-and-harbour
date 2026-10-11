import { beforeEach, describe, expect, it } from 'vitest';
import { freshFight } from '../../src/core/combat';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { mountApp, type App } from '../../src/ui/app';

// Cody's Milestone A review: "Selecting an item in your bank to expand the
// details always scrolls you back to the top" and "killing a mob resets menu
// regardless of the menu". Every screen is driven here the way a thumb would:
// opened, scrolled, something opened or typed, and then the game left to run
// by itself. What is on screen must be the very same nodes afterwards, still
// scrolled where it was.
let root: HTMLElement;
let clock: number;
const saves = () => new LocalStorageSaveService();

const q = <T extends HTMLElement>(selector: string): T => {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`nothing matches ${selector}`);
  return found;
};
const tab = (id: string): void => q<HTMLButtonElement>(`.tab[data-tab="${id}"]`).click();
const screen = (): HTMLElement => q('#screen');
const toasts = (): string[] => {
  seen.push(...[...root.querySelectorAll('.toast')].map((el) => el.textContent ?? ''));
  return seen;
};
let seen: string[] = [];

/** A level-1 swordsman, so a few kills bring levels, with `extra` laid over. */
function playing(extra: Partial<GameState> = {}): App {
  saves().save({
    ...newGame('Cody', clock),
    equipment: { main_hand: { item: 'bronze_sword', qty: 1 } },
    ...extra,
  });
  return mountApp(root, { saves: saves(), content: CONTENT, now: () => clock });
}

/** Already fighting dock rats, as a save would hold it. */
const fighting = (extra: Partial<GameState> = {}): Partial<GameState> => ({
  fight: freshFight(CONTENT.monsters!.dock_rat!, 20),
  ...extra,
});

/** Live play: `ms` of frames a quarter of a second apart, noting every toast on the way. */
function play(app: App, ms: number): void {
  for (let spent = 0; spent < ms; spent += 250) {
    clock += 250;
    app.tick();
    toasts();
  }
}

/** Kills of dock rats so far, from the save. */
const kills = (): number => saves().load()!.bestiary.dock_rat?.kills ?? 0;

/** Every element on the screen now, to compare with what is there later. */
const nodes = (): Element[] => [...screen().querySelectorAll('*')];

/**
 * Plays until `count` more rats are dead, then checks that nothing on screen
 * was replaced (new nodes may have joined it) and that the scroll held.
 */
function killsLeaveAlone(app: App, count: number, turnsOver = ''): void {
  // A collection log entry found turns over in place: its own '?' gives way to the thing.
  const before = nodes().filter((el) => !turnsOver || !el.closest(turnsOver));
  const top = screen().scrollTop;
  const from = kills();
  for (let guard = 0; kills() < from + count; guard += 1) {
    play(app, 1000);
    app.save();
    if (guard > 600) throw new Error('the rats are winning');
  }
  const after = new Set(nodes());
  const gone = before.filter((el) => !after.has(el));
  expect(gone.map((el) => el.outerHTML.slice(0, 80))).toEqual([]);
  expect(screen().scrollTop).toBe(top);
}

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.replaceChildren(root);
  clock = 1000;
  seen = [];
});

describe('the bank', () => {
  const stocked = {
    pine_logs: 5,
    oak_logs: 4,
    raw_shrimp: 3,
    copper_ore: 9,
    tin_ore: 9,
    seashells: 2,
    bronze_bar: 2,
    linen: 1,
  };

  it('opens and closes an item card in place, where it was scrolled to', () => {
    playing({ bank: stocked });
    tab('bank');
    const page = screen().firstElementChild;
    screen().scrollTop = 240;
    const above = q('[data-item="pine_logs"]');
    q<HTMLButtonElement>('[data-item="seashells"]').click();
    // The same page, the same scroll, the card where the row was.
    expect(screen().firstElementChild).toBe(page);
    expect(screen().scrollTop).toBe(240);
    expect(q('[data-card="seashells"]')).toBeTruthy();
    expect(root.querySelector('[data-item="seashells"]')).toBeNull();
    expect(q('[data-item="pine_logs"]')).toBe(above);
    // Another opens in its place; the first goes back to a row.
    q<HTMLButtonElement>('[data-item="tin_ore"]').click();
    expect(root.querySelector('[data-card="seashells"]')).toBeNull();
    expect(q('[data-card="tin_ore"]')).toBeTruthy();
    expect(q('[data-item="seashells"]')).toBeTruthy();
    // Close puts it back, still nothing rebuilt above.
    [...q('[data-card="tin_ore"]').querySelectorAll('button')]
      .find((b) => b.textContent === 'Close')!
      .click();
    expect(root.querySelector('[data-card]')).toBeNull();
    expect(screen().firstElementChild).toBe(page);
    expect(q('[data-item="pine_logs"]')).toBe(above);
    expect(screen().scrollTop).toBe(240);
  });

  it('is left alone by kills and levels while a card is open, mid-scroll, and grows in place', () => {
    const app = playing(fighting({ bank: stocked }));
    tab('bank');
    screen().scrollTop = 180;
    q<HTMLButtonElement>('[data-item="copper_ore"]').click();
    const card = q('[data-card="copper_ore"]');
    killsLeaveAlone(app, 6);
    expect(q('[data-card="copper_ore"]')).toBe(card);
    // The kills brought levels and a hide each: a new row, in its place.
    expect(toasts().some((text) => /level \d+!/.test(text))).toBe(true);
    expect(q('[data-item="hide"] .qty').textContent).toBe(String(saves().load()!.bank.hide));
  });

  it('is left alone while an action fills it and a potion wears off', () => {
    const app = playing({
      bank: stocked,
      action: { id: 'chop_pine', progressMs: 0 },
      potion: { item: 'sage_tonic', charges: 2 },
    });
    tab('bank');
    screen().scrollTop = 120;
    q<HTMLButtonElement>('[data-item="oak_logs"]').click();
    const before = nodes();
    play(app, 20_000);
    expect(toasts()).toContain('Your Sage tonic has worn off.');
    const after = new Set(nodes());
    expect(before.filter((el) => !after.has(el))).toEqual([]);
    expect(screen().scrollTop).toBe(120);
    expect(Number(q('[data-item="pine_logs"] .qty').textContent)).toBeGreaterThan(5);
  });

  it('keeps the screen under the away report, as it was left', () => {
    const app = playing(fighting({ bank: stocked }));
    tab('bank');
    screen().scrollTop = 200;
    q<HTMLButtonElement>('[data-item="raw_shrimp"]').click();
    const before = nodes();
    clock += 5 * 60 * 1000;
    app.tick();
    expect(q('[role="dialog"]')).toBeTruthy();
    const after = new Set(nodes());
    expect(before.filter((el) => !after.has(el))).toEqual([]);
    expect(screen().scrollTop).toBe(200);
    // Closing the report leaves the screen be too.
    [...q('[role="dialog"]').querySelectorAll('button')].at(-1)!.click();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(q('[data-card="raw_shrimp"]')).toBeTruthy();
  });
});

describe('while idle combat runs, a kill leaves every other screen alone', () => {
  it('the skills list, whose levels move in place', () => {
    const app = playing(fighting());
    screen().scrollTop = 90;
    killsLeaveAlone(app, 5);
    expect(q('[data-skill="melee"] .level').textContent).toMatch(/^Level [2-9]/);
  });

  it('a skill page', () => {
    const app = playing(fighting());
    q<HTMLButtonElement>('[data-skill="smithing"]').click();
    q<HTMLButtonElement>('[data-group-toggle="Iron"]').click();
    screen().scrollTop = 300;
    killsLeaveAlone(app, 5);
  });

  it('the character sheet with a slot’s choices open', () => {
    const app = playing(fighting({ bank: { bronze_helmet: 1, iron_helmet: 1 } }));
    tab('character');
    q<HTMLButtonElement>('[data-slot="head"]').click();
    screen().scrollTop = 150;
    killsLeaveAlone(app, 5);
    expect(q('[data-picker="head"] [data-equip="iron_helmet"] .problem').textContent).toContain(
      'Defence',
    );
  });

  it('Menu, with a code half typed', () => {
    const app = playing(fighting());
    tab('menu');
    const code = q<HTMLTextAreaElement>('textarea[aria-label="Save code"]');
    code.value = 'eyJnYW1lIjoiaGVh';
    code.focus();
    killsLeaveAlone(app, 5);
    expect(q<HTMLTextAreaElement>('textarea[aria-label="Save code"]')).toBe(code);
    expect(code.value).toBe('eyJnYW1lIjoiaGVh');
  });

  it('the collection log and the achievements', () => {
    const app = playing(fighting());
    tab('character');
    q<HTMLButtonElement>('[data-log]').click();
    screen().scrollTop = 400;
    killsLeaveAlone(app, 3, '[data-log-item="hide"]');
    expect(q('[data-log-item="hide"]').classList).toContain('found');
    q<HTMLButtonElement>('.tab[data-tab="character"]').click();
    q<HTMLButtonElement>('[data-achievements]').click();
    screen().scrollTop = 100;
    killsLeaveAlone(app, 2);
    expect(q('[data-achievement="first_kill"]').classList).toContain('earned');
  });

  it('the store', () => {
    const app = playing(fighting());
    tab('bank');
    q<HTMLButtonElement>('[data-store-door]').click();
    screen().scrollTop = 250;
    killsLeaveAlone(app, 5);
  });

  it('the bestiary, whose kills and drops move in place', () => {
    const app = playing(fighting());
    // The fight under way opens on the fight screen; back from it to the areas.
    q<HTMLButtonElement>('[data-combat]').click();
    q<HTMLButtonElement>('button.back').click();
    expect(q('[data-monster="dock_rat"]')).toBeTruthy();
    screen().scrollTop = 220;
    killsLeaveAlone(app, 5);
    expect(q('[data-monster="dock_rat"]').textContent).toContain(`Killed ${kills()}`);
    expect(q('[data-monster="dock_rat"] .drops').textContent).toContain('Hide');
  });

  it('the fight screen itself, which moves in place', () => {
    const app = playing(fighting());
    q<HTMLButtonElement>('[data-combat]').click();
    expect(q('[data-foe="dock_rat"]')).toBeTruthy();
    killsLeaveAlone(app, 5);
    expect(q('[data-tally]').textContent).toContain(`${saves().load()!.fight!.kills} kills`);
  });

  it('the bounties page, while kills count towards the bounty held', () => {
    const app = playing(fighting({ bounty: { monster: 'dock_rat', count: 50, done: 0 } }));
    q<HTMLButtonElement>('[data-bounties]').click();
    killsLeaveAlone(app, 4);
    expect(saves().load()!.bounty!.done).toBeGreaterThanOrEqual(4);
  });
});

// Cody: "Total level of all skills".
describe('total level', () => {
  it('heads the skills list and sits on the character sheet, moving in place with a level', () => {
    const skills = Object.keys(CONTENT.skills).length;
    const app = playing(fighting());
    const total = q('[data-total-level]');
    expect(total.textContent).toBe(String(skills));
    expect(q('[data-combat-level]').textContent).toBe('Combat level 1');
    killsLeaveAlone(app, 3);
    const gained = Number(total.textContent) - skills;
    expect(gained).toBeGreaterThan(0);
    expect(q('[data-total-level]')).toBe(total);
    tab('character');
    expect(q('[data-total-level]').textContent).toBe(String(skills + gained));
    expect(q('[data-combat-level]').textContent).toMatch(/^\d+$/);
  });
});

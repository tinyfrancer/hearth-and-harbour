import { beforeEach, describe, expect, it } from 'vitest';
import { newGame, type GameState } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';
import { CONTENT } from '../../src/data';
import { LocalStorageSaveService } from '../../src/persistence/LocalStorageSaveService';
import { mountApp, type App } from '../../src/ui/app';

// Thieving, bounties and the hit points that last between fights, driven the
// way a thumb would, against real storage.
let root: HTMLElement;
let clock: number;
const saves = () => new LocalStorageSaveService();
const saved = (): GameState => saves().load()!;

const q = <T extends HTMLElement>(selector: string): T => {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`nothing matches ${selector}`);
  return found;
};
const buttonSaying = (label: string | RegExp): HTMLButtonElement => {
  const found = [...root.querySelectorAll('button')].find((b) =>
    typeof label === 'string' ? b.textContent === label : label.test(b.textContent ?? ''),
  );
  if (!found) throw new Error(`no button says ${label}`);
  return found;
};
const press = (label: string | RegExp): void => buttonSaying(label).click();
const lastToast = (): string => [...root.querySelectorAll('.toast')].at(-1)?.textContent ?? '';

/** A character from a save, with `extra` laid over a fresh one, on the Skills tab. */
function playing(extra: Partial<GameState> = {}): App {
  saves().save({
    ...newGame('Cody', clock),
    equipment: { main_hand: { item: 'bronze_sword', qty: 1 } },
    ...extra,
  });
  return mountApp(root, { saves: saves(), content: CONTENT, now: () => clock });
}

/** Live play: `ms` of frames a second apart. */
function play(app: App, ms: number): void {
  for (let spent = 0; spent < ms; spent += 1000) {
    clock += 1000;
    app.tick();
  }
}

/** Shut the game, come back `ms` later, and read the away report. */
function away(app: App, ms: number): string {
  app.save();
  root.replaceChildren();
  clock += ms;
  mountApp(root, { saves: saves(), content: CONTENT, now: () => clock });
  return q('[role="dialog"]').textContent!;
}

const HOUR = 60 * 60 * 1000;
const trained = (level: number) => {
  const xp = xpForLevel(level);
  return { melee: xp, defence: xp, vitality: xp };
};

beforeEach(() => {
  localStorage.clear();
  root = document.createElement('div');
  document.body.replaceChildren(root);
  clock = 1000;
});

describe('Thieving', () => {
  it('sits under Roguery, and lists its marks with the chance and the stun', () => {
    playing();
    expect(q('[data-group="Roguery"]').textContent).toContain('Thieving');
    q<HTMLButtonElement>('[data-skill="thieving"]').click();
    const fisherman = q('[data-action="steal_fisherman"]');
    expect(fisherman.textContent).toContain('Dozing fisherman');
    expect(q('[data-chance="steal_fisherman"]').textContent).toBe('58% chance · caught: 3s stun');
    expect(fisherman.textContent).toContain('1–7 coins · ?');
    expect(fisherman.textContent).toContain('Not yet tried');
    // The rest wait for their levels.
    expect(q('[data-action="steal_strongbox"]').classList).toContain('locked');
    expect(q('[data-action="steal_strongbox"]').textContent).toContain('Level 18');
  });

  it('picks pockets and gets caught, and says so while lying low', () => {
    const app = playing({ coins: 5 });
    q<HTMLButtonElement>('[data-skill="thieving"]').click();
    q<HTMLButtonElement>('[data-action="steal_fisherman"]').click();
    expect(saved().action).toEqual({ id: 'steal_fisherman', progressMs: 0 });
    let sawCaught = false;
    const card = (): string => q('[data-action="steal_fisherman"]').textContent!;
    for (let i = 0; i < 300 && !(sawCaught && /Picked [1-9]/.test(card())); i += 1) {
      play(app, 1000);
      if (q('[data-chance="steal_fisherman"]').textContent!.startsWith('Caught!')) {
        sawCaught = true;
        expect(q('[data-action="steal_fisherman"] .bar.stun')).toBeTruthy();
      }
    }
    expect(sawCaught).toBe(true);
    app.save();
    const record = saved().marks.steal_fisherman!;
    expect(record.caught).toBeGreaterThan(0);
    expect(q('[data-action="steal_fisherman"]').textContent).toContain(
      `Picked ${record.picked} · Caught ${record.caught}`,
    );
    expect(saved().coins).toBeGreaterThan(5);
    // The Skills list says so too.
    press('‹ All skills');
    expect(q('[data-skill="thieving"]').textContent).toMatch(/Robbing Dozing fisherman|Caught!/);
  });

  it('is accounted for in the away report', () => {
    const app = playing();
    q<HTMLButtonElement>('[data-skill="thieving"]').click();
    q<HTMLButtonElement>('[data-action="steal_fisherman"]').click();
    const report = away(app, 2 * HOUR);
    expect(report).toContain('robbing Dozing fisherman');
    expect(report).toMatch(/attempts: got away with it [\d,]+ times, caught [\d,]+ times\./);
    expect(report).toContain('Coins');
    expect(report).toContain('Thieving XP');
  });
});

describe('bounties', () => {
  it('are reached from the Combat section, and taken from the board', () => {
    playing();
    q<HTMLButtonElement>('[data-bounties]').click();
    expect(q('[data-points]').textContent).toBe('0');
    press('Take a bounty');
    expect(saved().bounty).toMatchObject({ monster: 'dock_rat', done: 0 });
    expect(lastToast()).toMatch(/^Wanted: \d+ Dock rat\.$/);
    expect(q('[data-bounty="dock_rat"]').textContent).toContain('Wanted:');
  });

  it('are hunted, progressed by fighting, handed in, and spent', () => {
    const app = playing({
      bounty: { monster: 'dock_rat', count: 5, done: 0 },
      bountyPoints: 29,
      coins: 0,
    });
    q<HTMLButtonElement>('[data-bounties]').click();
    press('Hunt the Dock rat');
    expect(saved().fight?.monster).toBe('dock_rat');
    expect(q('[data-wanted]').textContent).toBe('Bounty: 0 / 5');
    let toasts = '';
    for (let i = 0; i < 120 && (saved().bounty?.done ?? 0) < 5; i += 1) {
      play(app, 1000);
      toasts += lastToast();
    }
    expect(saved().bounty).toEqual({ monster: 'dock_rat', count: 5, done: 5 });
    expect(toasts).toContain('Bounty done: 5 Dock rat. Hand it in.');
    expect(q('[data-wanted]').textContent).toContain('Hand it in');
    press('‹ Areas');
    q<HTMLButtonElement>('[data-bounties]').click();
    const coinsBefore = saved().coins;
    press('Hand in for 2 points');
    expect(saved().bountyPoints).toBe(31);
    expect(saved().coins).toBe(coinsBefore + 20);
    expect(lastToast()).toMatch(/^Bounty paid: 2 points and 20 coins\./);
    // A fresh one is posted at once.
    expect(saved().bounty).toMatchObject({ done: 0 });
    // And something bought with the points.
    expect(buttonSaying('Buy for 90').disabled).toBe(true);
    q<HTMLButtonElement>('[data-buy="feathered_hat"]').click();
    expect(saved().bountyPoints).toBe(1);
    expect(saved().bank.feathered_hat).toBe(1);
    expect(lastToast()).toBe('Bought: the Feathered hat. It is in the bank.');
    expect(q('[data-shop="feathered_hat"]').textContent).toContain('You have one already.');
  });

  it('can be swapped, with a second tap, for a few points', () => {
    playing({
      skills: trained(8),
      bounty: { monster: 'dock_rat', count: 60, done: 3 },
      bountyPoints: 10,
    });
    q<HTMLButtonElement>('[data-bounties]').click();
    press('Swap it (3 points)');
    expect(saved().bountyPoints).toBe(10);
    press('Tap again to spend 3 points');
    expect(saved().bountyPoints).toBe(7);
    expect(saved().bounty!.monster).not.toBe('dock_rat');
    expect(lastToast()).toMatch(/^Swapped\./);
  });

  it('open the way to a monster only bounty hunters go after', () => {
    playing({ skills: trained(10) });
    q<HTMLButtonElement>('[data-combat]').click();
    const goblin = q('[data-monster="goblin_poacher"]');
    expect(goblin.classList).toContain('locked');
    expect(goblin.textContent).toContain('Only with a bounty on it.');
    goblin.click();
    expect(lastToast()).toBe('Only a bounty on the Goblin poacher will lead you to it.');
    expect(saved().fight).toBeNull();
  });

  it('let a bounty-only monster be fought while one names it', () => {
    playing({ skills: trained(10), bounty: { monster: 'goblin_poacher', count: 20, done: 4 } });
    q<HTMLButtonElement>('[data-combat]').click();
    const goblin = q('[data-monster="goblin_poacher"]');
    expect(goblin.classList).not.toContain('locked');
    expect(goblin.textContent).toContain('Bounty: 4 / 20');
    goblin.click();
    expect(saved().fight?.monster).toBe('goblin_poacher');
  });

  it('are in the away report, ready to hand in', () => {
    const app = playing({
      bounty: { monster: 'dock_rat', count: 10, done: 2 },
      food: { item: 'cooked_shrimp', qty: 20 },
    });
    q<HTMLButtonElement>('[data-combat]').click();
    q<HTMLButtonElement>('[data-monster="dock_rat"]').click();
    const report = away(app, HOUR);
    expect(report).toContain('Bounty on the Dock rat: 10 of 10. Ready to hand in.');
  });
});

describe('hit points between fights', () => {
  it('stay down after a fight is stopped, and come back while resting', () => {
    const app = playing({ health: { hp: 7, regenMs: 0 } });
    q<HTMLButtonElement>('[data-combat]').click();
    expect(q('[data-you]').textContent).toContain('7 / 20 hit points, healing');
    play(app, 12_000);
    app.save();
    expect(saved().health).toEqual({ hp: 9, regenMs: 0 });
    expect(q('[data-you]').textContent).toContain('9 / 20 hit points, healing');
    play(app, 120_000);
    app.save();
    expect(saved().health).toBeNull();
    expect(q('[data-you]').textContent).toContain('20 hit points');
  });

  it('carry into the next fight', () => {
    playing({ health: { hp: 15, regenMs: 0 } });
    q<HTMLButtonElement>('[data-combat]').click();
    q<HTMLButtonElement>('[data-monster="dock_rat"]').click();
    expect(q('[data-you] .qty').textContent).toBe('15 / 20');
  });
});

import { describe, expect, it } from 'vitest';
import { newGame } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import { awayReportOverlay } from '../../src/ui/awayReport';
import { areasView, type CombatActions } from '../../src/ui/combatScreen';
import type { AwayReport } from '../../src/core/away';

const idle = (): void => {};
const actions: CombatActions = {
  back: idle,
  areas: idle,
  showFight: idle,
  bounties: idle,
  harbour: idle,
  fight: idle,
  stop: idle,
  loadFood: idle,
  unloadFood: idle,
  setEatAt: idle,
};

describe('wave 13’s weak spots', () => {
  it('adds a row to the food list when a new kind of fish arrives while it is open', () => {
    const state = { ...newGame('Cody', 0), bank: { cooked_shrimp: 4 } };
    const view = areasView(state, CONTENT, actions);
    const shrimp = view.el.querySelector('[data-food-choice="cooked_shrimp"]');
    expect(shrimp).not.toBeNull();
    expect(view.el.querySelector('[data-food-choice="cooked_herring"]')).toBeNull();
    view.update!({ ...state, bank: { cooked_shrimp: 3, cooked_herring: 2 } });
    expect(view.el.querySelector('[data-food-choice="cooked_herring"]')!.textContent).toContain(
      '×2',
    );
    // The row already there is the same row, its count moved in place.
    expect(view.el.querySelector('[data-food-choice="cooked_shrimp"]')).toBe(shrimp);
    expect(shrimp!.textContent).toContain('×3');
    // Eaten up, a row goes; with none left, it says so.
    view.update!({ ...state, bank: {} });
    expect(view.el.querySelector('[data-food-choice]')).toBeNull();
    expect(view.el.textContent).toContain('No cooked fish in the bank.');
    // The areas list draws every monster's face the first time: slow in jsdom.
  }, 30_000);

  it('names the monsters whose bounties auto bounty handed in while away', () => {
    const report: AwayReport = {
      awayMs: 3_600_000,
      countedMs: 3_600_000,
      actionId: null,
      fight: { monster: 'dock_rat', kills: 90, eaten: 0, food: null, arrows: 0 },
      dungeon: null,
      items: {},
      coins: 0,
      xp: {},
      levels: {},
      mastery: {},
      theft: null,
      bounty: null,
      claimed: { bounties: 3, points: 40, monsters: ['dock_rat', 'sand_crab'] },
      stopped: null,
      potion: null,
    };
    const el = awayReportOverlay(report, CONTENT, idle);
    expect(el.querySelector('[data-claimed]')!.textContent).toContain(
      'Auto bounty handed in 3 bounties (on the Dock rat and Sand crab) for 40 points',
    );
  });
});

import { describe, expect, it } from 'vitest';
import { sell } from '../../src/core/bank';
import type { Content } from '../../src/core/content';
import { buyFromStore, storeProblem } from '../../src/core/store';
import { newGame, type GameState } from '../../src/core/state';

const item = (id: string, extra = {}) => ({ id, name: id, description: '', value: 2, ...extra });
const content: Content = {
  skills: {},
  actions: {},
  items: {
    bun: item('bun'),
    hat: item('hat', { equip: { slot: 'head', armour: 1 } }),
  },
  store: {
    buns: { id: 'buns', item: 'bun', qty: 10, price: 50 },
    hat: { id: 'hat', item: 'hat', qty: 1, price: 300, once: true },
    satchel: {
      id: 'satchel',
      price: 1000,
      perk: { name: 'Satchel', description: '', potionCharges: 50 },
    },
  },
};

const purse = (coins: number, extra: Partial<GameState> = {}): GameState => ({
  ...newGame('Cody', 0),
  coins,
  ...extra,
});
const ok = (result: ReturnType<typeof buyFromStore>): GameState => {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};

describe('the general store', () => {
  it('sells a lot for coins, into the bank, and counts the purchase', () => {
    const after = ok(buyFromStore(purse(120, { bank: { bun: 3 } }), 'buns', content));
    expect(after.coins).toBe(70);
    expect(after.bank).toEqual({ bun: 13 });
    expect(after.stats).toEqual({ bought: 1 });
    expect(ok(buyFromStore(after, 'buns', content)).stats).toEqual({ bought: 2 });
  });

  it('keeps a perk for good, and sells it once', () => {
    const after = ok(buyFromStore(purse(2500), 'satchel', content));
    expect(after.coins).toBe(1500);
    expect(after.perks).toEqual(['satchel']);
    expect(after.bank).toEqual({});
    expect(buyFromStore(after, 'satchel', content)).toEqual({
      ok: false,
      reason: 'Yours already.',
    });
  });

  it('sells a one-off only to someone without one, banked or worn', () => {
    const rich = purse(5000);
    expect(storeProblem(rich, content.store!.hat!)).toBeNull();
    expect(storeProblem({ ...rich, bank: { hat: 1 } }, content.store!.hat!)).toBe(
      'You have one already.',
    );
    const wearing = { ...rich, equipment: { head: { item: 'hat', qty: 1 } } };
    expect(buyFromStore(wearing, 'hat', content)).toEqual({
      ok: false,
      reason: 'You have one already.',
    });
    // Sold back, it may be bought again.
    const sold = sell({ ...rich, bank: { hat: 1 } }, 'hat', 1, content);
    expect(buyFromStore(sold, 'hat', content).ok).toBe(true);
  });

  it('refuses what is dearer than the purse, and what it does not sell, changing nothing', () => {
    const poor = purse(49);
    expect(buyFromStore(poor, 'buns', content)).toEqual({
      ok: false,
      reason: 'Needs 50 coins; you have 49.',
    });
    expect(buyFromStore(poor, 'cake', content)).toEqual({
      ok: false,
      reason: 'The store has no such thing.',
    });
    expect(buyFromStore(poor, 'constructor', content).ok).toBe(false);
    expect(buyFromStore(poor, 'buns', { ...content, store: undefined }).ok).toBe(false);
    expect(ok(buyFromStore(purse(50), 'buns', content)).coins).toBe(0);
  });

  it('never changes the state it was given', () => {
    const before = purse(5000, { bank: { bun: 1 } });
    const copy = structuredClone(before);
    buyFromStore(before, 'buns', content);
    buyFromStore(before, 'satchel', content);
    expect(before).toEqual(copy);
  });
});

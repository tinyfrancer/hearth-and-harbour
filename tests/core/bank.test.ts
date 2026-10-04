import { describe, expect, it } from 'vitest';
import { sell } from '../../src/core/bank';
import type { Content } from '../../src/core/content';
import { newGame } from '../../src/core/state';

const content: Content = {
  skills: {},
  actions: {},
  items: { pearl: { id: 'pearl', name: 'Pearl', description: '', value: 25 } },
};
const rich = { ...newGame('Cody', 0), bank: { pearl: 10 }, coins: 5 };

describe('sell', () => {
  it('trades items for their value in coins', () => {
    expect(sell(rich, 'pearl', 4, content)).toMatchObject({ bank: { pearl: 6 }, coins: 105 });
  });

  it('sells what is held when asked for more, and leaves no zero behind', () => {
    const sold = sell(rich, 'pearl', Infinity, content);
    expect(sold.bank).toEqual({});
    expect(sold.coins).toBe(255);
  });

  it('changes nothing for nothing, for a fraction of one, or for a thing not held or not known', () => {
    expect(sell(rich, 'pearl', 0, content)).toBe(rich);
    expect(sell(rich, 'pearl', -3, content)).toBe(rich);
    expect(sell(rich, 'pearl', 0.9, content)).toBe(rich);
    expect(sell(rich, 'pearl', Number.NaN, content)).toBe(rich);
    const poor = newGame('Cody', 0);
    expect(sell(poor, 'pearl', 1, content)).toBe(poor);
    expect(sell({ ...rich, bank: { rock: 3 } }, 'rock', 1, content).coins).toBe(5);
  });
});

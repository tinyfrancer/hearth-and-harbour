import { describe, expect, it } from 'vitest';
import { SEEN_KEY_MAX, SEEN_MAX, isSeenKey, remember, remembered } from '../../src/core/remembered';
import { newGame } from '../../src/core/state';

describe('things remembered', () => {
  it('starts with nothing remembered', () => {
    expect(newGame('Cody', 0).seen).toEqual([]);
    expect(remembered(newGame('Cody', 0), 'town.pan')).toBe(false);
  });

  it('remembers a key for good, once, in a new state', () => {
    const before = newGame('Cody', 0);
    const after = remember(before, 'town.pan');
    expect(after).not.toBe(before);
    expect(before.seen).toEqual([]);
    expect(remembered(after, 'town.pan')).toBe(true);
    // Again changes nothing, and gives back the same state.
    expect(remember(after, 'town.pan')).toBe(after);
    expect(remember(remember(after, 'cave.lesson.eat'), 'town.pan').seen).toEqual([
      'town.pan',
      'cave.lesson.eat',
    ]);
  });

  it('takes short plain keys only', () => {
    for (const key of ['town.pan', 'cave.lesson.attack', 'cave.lesson.wide_swing', 'a-b', 'X9']) {
      expect(isSeenKey(key), key).toBe(true);
    }
    expect(isSeenKey('k'.repeat(SEEN_KEY_MAX))).toBe(true);
    for (const key of [
      '',
      'town pan',
      '.town',
      'town.',
      'town..pan',
      'é',
      '<b>',
      'k'.repeat(SEEN_KEY_MAX + 1),
      7,
      null,
    ]) {
      expect(isSeenKey(key), String(key)).toBe(false);
    }
    const state = newGame('Cody', 0);
    expect(remember(state, 'town pan')).toBe(state);
    expect(remembered({ ...state, seen: ['town pan'] }, 'town pan')).toBe(false);
  });

  it('stops adding new keys once full, and keeps what it has', () => {
    const full = {
      ...newGame('Cody', 0),
      seen: Array.from({ length: SEEN_MAX }, (_, i) => `key${i}`),
    };
    expect(remember(full, 'town.pan')).toBe(full);
    expect(remembered(full, 'key0')).toBe(true);
  });
});

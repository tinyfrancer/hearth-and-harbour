import { describe, expect, it } from 'vitest';
import { GAME_STATE_VERSION, cleanName, nameProblem, newGame } from '../../src/core/state';

describe('names', () => {
  it('trims and collapses spaces', () => {
    expect(cleanName('  Mad   Meg ')).toBe('Mad Meg');
  });

  it('refuses an empty or over-long name and accepts the rest', () => {
    expect(nameProblem('   ')).not.toBeNull();
    expect(nameProblem('x'.repeat(17))).not.toBeNull();
    expect(nameProblem('x'.repeat(16))).toBeNull();
    expect(nameProblem('Cody')).toBeNull();
  });
});

describe('newGame', () => {
  it('starts a current-version game stamped with the time', () => {
    expect(newGame(' Cody ', 1000)).toEqual({
      version: GAME_STATE_VERSION,
      name: 'Cody',
      createdAt: 1000,
      savedAt: 1000,
      skills: {},
      bank: {},
      action: null,
    });
  });
});

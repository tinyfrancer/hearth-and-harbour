import { describe, expect, it } from 'vitest';
import { GAME_STATE_VERSION, newGame } from '../../src/core/state';
import { migrateGameState } from '../../src/persistence/migrations';

describe('migrateGameState', () => {
  it('passes a current save through untouched', () => {
    const state = newGame('Cody', 5);
    expect(migrateGameState(state)).toBe(state);
  });

  it('refuses what is not a save, and a save from a newer build', () => {
    expect(migrateGameState(null)).toBeNull();
    expect(migrateGameState('save')).toBeNull();
    expect(migrateGameState({ name: 'Cody' })).toBeNull();
    expect(migrateGameState({ version: 1.5 })).toBeNull();
    expect(migrateGameState({ ...newGame('Cody', 5), version: GAME_STATE_VERSION + 1 })).toBeNull();
  });

  it('brings a version 1 save (S1: a name and nothing else) up to date', () => {
    const v1 = { version: 1, name: 'Cody', createdAt: 5, savedAt: 9 };
    expect(migrateGameState(v1)).toEqual({ ...newGame('Cody', 5), savedAt: 9 });
  });

  it('brings a version 2 save (S2 and S3) up to date without touching what it holds', () => {
    const v2 = {
      version: 2,
      name: 'Cody',
      createdAt: 5,
      savedAt: 9,
      skills: { woodcutting: 500 },
      bank: { pine_logs: 50 },
      action: { id: 'chop_pine', progressMs: 100 },
    };
    expect(migrateGameState(v2)).toEqual({ ...v2, version: 3, coins: 0, mastery: {} });
  });

  it('walks every step in order and stamps the version as it goes', () => {
    const steps = {
      1: (state: Record<string, unknown>) => ({ ...state, coins: 0 }),
      2: (state: Record<string, unknown>) => ({ ...state, coins: (state.coins as number) + 10 }),
    };
    expect(migrateGameState({ version: 1, name: 'Cody' }, steps, 3)).toEqual({
      version: 3,
      name: 'Cody',
      coins: 10,
    });
  });

  it('refuses a save with a gap in its chain', () => {
    const steps = { 2: (state: Record<string, unknown>) => state };
    expect(migrateGameState({ version: 1 }, steps, 3)).toBeNull();
  });
});

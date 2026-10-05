import { describe, expect, it } from 'vitest';
import { seedFrom } from '../../src/core/rng';
import { GAME_STATE_VERSION, newGame } from '../../src/core/state';
import { migrateGameState } from '../../src/persistence/migrations';

/** What version 7 adds: nothing robbed, no bounty, and full health. */
const unrobbed = { marks: {}, bounty: null, bountyPoints: 0, health: null };

/** What versions 6 and 7 add to a save made at `createdAt`: no fight, no food, dice of its own. */
const unfought = (createdAt: number) => ({
  fight: null,
  food: null,
  eatAt: 50,
  rng: seedFrom(createdAt),
  bestiary: {},
  ...unrobbed,
});

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
    expect(migrateGameState(v2)).toEqual({
      ...v2,
      version: GAME_STATE_VERSION,
      coins: 0,
      mastery: {},
      potion: null,
      look: {},
      equipment: {},
      ...unfought(5),
    });
  });

  it('brings a version 3 save (S4 and S5) up to date with no potion drunk', () => {
    const v3 = {
      version: 3,
      name: 'Cody',
      createdAt: 5,
      savedAt: 9,
      skills: { cooking: 900 },
      bank: { raw_shrimp: 12, sageleaf: 3 },
      coins: 40,
      mastery: { cook_shrimp: 120 },
      action: { id: 'cook_shrimp', progressMs: 250 },
    };
    expect(migrateGameState(v3)).toEqual({
      ...v3,
      version: GAME_STATE_VERSION,
      potion: null,
      look: {},
      equipment: {},
      ...unfought(5),
    });
  });

  it('brings a version 4 save (S6) up to date with the first look and nothing worn', () => {
    const v4 = {
      version: 4,
      name: 'Cody',
      createdAt: 5,
      savedAt: 9,
      skills: { smithing: 4000 },
      bank: { bronze_sword: 1, bronze_shield: 1, bronze_arrows: 50 },
      coins: 12,
      mastery: { smith_bronze_sword: 300 },
      action: null,
      potion: { item: 'steady_draught', charges: 40 },
    };
    // Gear in the bank stays in the bank: a migration puts nothing on.
    expect(migrateGameState(v4)).toEqual({
      ...v4,
      version: GAME_STATE_VERSION,
      look: {},
      equipment: {},
      ...unfought(5),
    });
  });

  it('brings a version 5 save (S7b) up to date with no fight, no food and dice of its own', () => {
    const v5 = {
      version: 5,
      name: 'Cody',
      createdAt: 1_700_000_000_000,
      savedAt: 1_700_000_009_000,
      skills: { smithing: 4000 },
      bank: { cooked_shrimp: 20 },
      coins: 12,
      mastery: {},
      action: { id: 'cook_shrimp', progressMs: 10 },
      potion: null,
      look: { hair: 'long' },
      equipment: { main_hand: { item: 'bronze_sword', qty: 1 } },
    };
    // Gear stays worn and food stays in the bank: a migration feeds nobody.
    const v6 = migrateGameState(v5);
    expect(v6).toEqual({ ...v5, version: GAME_STATE_VERSION, ...unfought(v5.createdAt) });
    expect(Number.isInteger(v6!.rng) && v6!.rng >= 0 && v6!.rng < 2 ** 32).toBe(true);
    // Two characters made at different times roll different dice.
    expect(migrateGameState({ ...v5, createdAt: 1 })!.rng).not.toBe(v6!.rng);
  });

  it('brings a version 6 save (S8) up to date mid-fight, unrobbed and with no bounty', () => {
    const v6 = {
      ...newGame('Cody', 5),
      version: 6,
      bank: { hide: 3 },
      equipment: { main_hand: { item: 'bronze_sword', qty: 1 } },
      food: { item: 'cooked_shrimp', qty: 10 },
      fight: {
        monster: 'dock_rat',
        hp: 12,
        foeHp: 4,
        playerMs: 800,
        foeMs: 1200,
        kills: 3,
        coins: 6,
        loot: { hide: 3 },
        eaten: 0,
        arrows: 0,
      },
      bestiary: { dock_rat: { kills: 3, seen: ['hide'] } },
    } as Record<string, unknown>;
    for (const key of Object.keys(unrobbed)) delete v6[key];
    // The fight keeps its own hit points: health out of a fight is for after it.
    expect(migrateGameState(v6)).toEqual({ ...v6, version: GAME_STATE_VERSION, ...unrobbed });
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

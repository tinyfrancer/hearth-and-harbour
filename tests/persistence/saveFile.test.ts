import { describe, expect, it } from 'vitest';
import { seedFrom } from '../../src/core/rng';
import { GAME_STATE_VERSION, newGame, type GameState } from '../../src/core/state';
import { SAVE_FILE_GAME, readSave, writeSaveExport } from '../../src/persistence/saveFile';

const state: GameState = {
  ...newGame('Zoë the Bold', 1_700_000_000_000),
  skills: { woodcutting: 1234 },
  bank: { pine_logs: 40 },
  coins: 77,
  mastery: { chop_pine: 480 },
  action: { id: 'chop_pine', progressMs: 1500.5 },
  potion: { item: 'sage_tonic', charges: 87 },
  look: { skin: 'a-skin', hair: 'a-hair', hairColour: 'a-colour' },
  equipment: {
    main_hand: { item: 'pine_shortbow', qty: 1 },
    ammo: { item: 'bronze_arrows', qty: 120 },
  },
  food: { item: 'cooked_herring', qty: 30 },
  eatAt: 40,
  bestiary: { dock_rat: { kills: 12, seen: ['rat_hide'] } },
};
/** The same character halfway through a fight instead of chopping. */
const fighting: GameState = {
  ...state,
  action: null,
  fight: {
    monster: 'dock_rat',
    hp: 14,
    foeHp: 0,
    playerMs: 800,
    foeMs: 1200,
    kills: 3,
    coins: 20,
    loot: { rat_hide: 3 },
    eaten: 1,
    arrows: 9,
  },
};
/** What version 6 adds to a save from before it. */
const unfought = {
  fight: null,
  food: null,
  eatAt: 50,
  rng: seedFrom(state.createdAt),
  bestiary: {},
};
/** A save as a version before 6 wrote it. */
const before6 = (version: number): Record<string, unknown> => {
  const old: Record<string, unknown> = { ...state, version };
  for (const field of ['fight', 'food', 'eatAt', 'rng', 'bestiary']) delete old[field];
  return old;
};

describe('save export and import', () => {
  it('round-trips through a file', () => {
    const out = writeSaveExport('file', state, new Date(2026, 9, 4));
    expect(out).toMatchObject({
      kind: 'file',
      fileName: 'hearth-and-harbour-zo-the-bold-2026-10-04.json',
    });
    expect(readSave(out.text)).toEqual({ ok: true, state });
    const mid = writeSaveExport('file', fighting);
    expect(readSave(mid.text)).toEqual({ ok: true, state: fighting });
  });

  it('round-trips through a code, accents and all, even when a message wraps it', () => {
    const { text } = writeSaveExport('code', state);
    expect(text).toMatch(/^[A-Za-z0-9+/=]+$/);
    const wrapped = text.replace(/(.{20})/g, '$1\n');
    expect(readSave(`  ${wrapped} `)).toEqual({ ok: true, state });
  });

  it('loads a save exported by the first release', () => {
    const v1 = {
      game: SAVE_FILE_GAME,
      save: { version: 1, name: 'Cody', createdAt: 5, savedAt: 9 },
    };
    expect(readSave(JSON.stringify(v1))).toEqual({
      ok: true,
      state: { ...newGame('Cody', 5), savedAt: 9 },
    });
  });

  it('loads a version 3 save, from before potions, with none drunk', () => {
    const v3 = before6(3);
    delete v3.potion;
    delete v3.look;
    delete v3.equipment;
    expect(readSave(JSON.stringify({ game: SAVE_FILE_GAME, save: v3 }))).toEqual({
      ok: true,
      state: { ...state, potion: null, look: {}, equipment: {}, ...unfought },
    });
  });

  it('loads a version 4 save, from before equipment, with nothing worn', () => {
    const v4 = before6(4);
    delete v4.look;
    delete v4.equipment;
    expect(readSave(JSON.stringify({ game: SAVE_FILE_GAME, save: v4 }))).toEqual({
      ok: true,
      state: { ...state, look: {}, equipment: {}, ...unfought },
    });
  });

  it('loads a version 5 save, from before combat, still wearing its gear', () => {
    expect(readSave(JSON.stringify({ game: SAVE_FILE_GAME, save: before6(5) }))).toEqual({
      ok: true,
      state: { ...state, ...unfought },
    });
  });

  it('says so when the text is not a save', () => {
    for (const text of ['', 'hello', '{"game":"other","save":{}}', '[]']) {
      expect(readSave(text)).toEqual({ ok: false, reason: "That isn't a Hearth & Harbour save." });
    }
  });

  it('tells a newer save from a damaged one', () => {
    const wrap = (save: object) => JSON.stringify({ game: SAVE_FILE_GAME, save });
    const newer = readSave(wrap({ ...state, version: GAME_STATE_VERSION + 1 }));
    expect(newer).toMatchObject({ ok: false, reason: expect.stringContaining('newer version') });
    for (const broken of [
      { ...state, version: 'one' },
      { ...state, name: '' },
      { ...state, name: 'x'.repeat(40) },
      { ...state, savedAt: 'yesterday' },
      { ...state, createdAt: -1 },
      { ...state, skills: { woodcutting: -5 } },
      { ...state, skills: null },
      { ...state, bank: { pine_logs: 1.5 } },
      { ...state, action: { id: 'chop_pine' } },
      { ...state, action: 'chop_pine' },
      { ...state, coins: 1.5 },
      { ...state, coins: -1 },
      { ...state, mastery: { chop_pine: 'lots' } },
      { ...state, potion: 'sage_tonic' },
      { ...state, potion: { item: 'sage_tonic' } },
      { ...state, potion: { item: 'sage_tonic', charges: 0 } },
      { ...state, potion: { item: 'sage_tonic', charges: 2.5 } },
      { ...state, potion: { item: 7, charges: 10 } },
      { ...state, potion: undefined },
      { ...state, look: undefined },
      { ...state, look: 'handsome' },
      { ...state, look: { skin: 3 } },
      { ...state, look: { nose: 'long' } },
      { ...state, equipment: undefined },
      { ...state, equipment: [] },
      { ...state, equipment: { pocket: { item: 'seashells', qty: 1 } } },
      { ...state, equipment: { head: 'linen_hood' } },
      { ...state, equipment: { head: { item: 'linen_hood', qty: 2 } } },
      { ...state, equipment: { head: { item: 5, qty: 1 } } },
      { ...state, equipment: { ammo: { item: 'bronze_arrows', qty: 0 } } },
      { ...state, equipment: { ammo: { item: 'bronze_arrows', qty: 1.5 } } },
      { ...state, fight: undefined },
      { ...state, fight: 'dock_rat' },
      // Fighting and chopping at once.
      { ...fighting, action: state.action },
      { ...fighting, fight: { ...fighting.fight, hp: 0 } },
      { ...fighting, fight: { ...fighting.fight, foeHp: -1 } },
      { ...fighting, fight: { ...fighting.fight, playerMs: 0 } },
      { ...fighting, fight: { ...fighting.fight, foeMs: 2.5 } },
      { ...fighting, fight: { ...fighting.fight, monster: 3 } },
      { ...fighting, fight: { ...fighting.fight, kills: -1 } },
      { ...fighting, fight: { ...fighting.fight, loot: { rat_hide: 'some' } } },
      { ...fighting, fight: { ...fighting.fight, eaten: undefined } },
      { ...state, food: { item: 'cooked_herring', qty: 0 } },
      { ...state, food: 'cooked_herring' },
      { ...state, food: undefined },
      { ...state, eatAt: 150 },
      { ...state, eatAt: 'half' },
      { ...state, rng: -1 },
      { ...state, rng: 2 ** 32 },
      { ...state, rng: 0.5 },
      { ...state, bestiary: undefined },
      { ...state, bestiary: { dock_rat: { kills: 1 } } },
      { ...state, bestiary: { dock_rat: { kills: 1, seen: [4] } } },
    ]) {
      expect(readSave(wrap(broken))).toMatchObject({
        ok: false,
        reason: expect.stringContaining('damaged'),
      });
    }
  });
});

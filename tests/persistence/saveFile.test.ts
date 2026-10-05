import { describe, expect, it } from 'vitest';
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
};

describe('save export and import', () => {
  it('round-trips through a file', () => {
    const out = writeSaveExport('file', state, new Date(2026, 9, 4));
    expect(out).toMatchObject({
      kind: 'file',
      fileName: 'hearth-and-harbour-zo-the-bold-2026-10-04.json',
    });
    expect(readSave(out.text)).toEqual({ ok: true, state });
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
    const { potion: _, ...v3 } = { ...state, version: 3 };
    expect(readSave(JSON.stringify({ game: SAVE_FILE_GAME, save: v3 }))).toEqual({
      ok: true,
      state: { ...state, potion: null },
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
    ]) {
      expect(readSave(wrap(broken))).toMatchObject({
        ok: false,
        reason: expect.stringContaining('damaged'),
      });
    }
  });
});

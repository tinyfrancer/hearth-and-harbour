import { describe, expect, it } from 'vitest';
import { GAME_STATE_VERSION, newGame } from '../../src/core/state';
import { SAVE_FILE_GAME, readSave, writeSaveExport } from '../../src/persistence/saveFile';

const state = newGame('Zoë the Bold', 1_700_000_000_000);

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
    ]) {
      expect(readSave(wrap(broken))).toMatchObject({
        ok: false,
        reason: expect.stringContaining('damaged'),
      });
    }
  });
});

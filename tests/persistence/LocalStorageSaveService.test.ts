import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame } from '../../src/core/state';
import {
  LocalStorageSaveService,
  STORAGE_KEY,
  UNREADABLE_KEY,
} from '../../src/persistence/LocalStorageSaveService';

describe('LocalStorageSaveService', () => {
  const saves = new LocalStorageSaveService();

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('has nothing to load at first', () => {
    expect(saves.load()).toBeNull();
  });

  it('loads back what it saved', () => {
    const state = newGame('Cody', 42);
    expect(saves.save(state)).toBe(true);
    expect(saves.load()).toEqual(state);
  });

  it('clears', () => {
    saves.save(newGame('Cody', 42));
    saves.clear();
    expect(saves.load()).toBeNull();
  });

  it('sets a corrupt save aside rather than crashing or destroying it', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(saves.load()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(UNREADABLE_KEY)).toBe('{not json');
  });

  it('sets a save from a newer build aside', () => {
    const future = JSON.stringify({ ...newGame('Cody', 42), version: 999 });
    localStorage.setItem(STORAGE_KEY, future);
    expect(saves.load()).toBeNull();
    expect(localStorage.getItem(UNREADABLE_KEY)).toBe(future);
  });

  it('reports a refused write instead of throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(saves.save(newGame('Cody', 42))).toBe(false);
  });
});

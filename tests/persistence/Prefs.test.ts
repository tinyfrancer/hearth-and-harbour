import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalStoragePrefs, PREFS_PREFIX, memoryPrefs } from '../../src/persistence/Prefs';
import { STORAGE_KEY } from '../../src/persistence/LocalStorageSaveService';

beforeEach(() => localStorage.clear());

describe('the menus’ preferences', () => {
  it('are kept in local storage under their own prefix, apart from the save', () => {
    const prefs = new LocalStoragePrefs();
    expect(prefs.get('bank-sort')).toBeNull();
    prefs.set('bank-sort', 'value');
    expect(new LocalStoragePrefs().get('bank-sort')).toBe('value');
    expect(localStorage.getItem(`${PREFS_PREFIX}bank-sort`)).toBe('value');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('are forgotten, not fatal, when storage refuses', () => {
    const prefs = new LocalStoragePrefs();
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('refused');
    });
    expect(() => prefs.set('bank-sort', 'name')).not.toThrow();
    expect(prefs.get('bank-sort')).toBeNull();
    set.mockRestore();
    get.mockRestore();
  });

  it('can be held in memory alone', () => {
    const prefs = memoryPrefs({ 'bank-sort': 'count' });
    expect(prefs.get('bank-sort')).toBe('count');
    prefs.set('bank-sort', 'name');
    expect(prefs.get('bank-sort')).toBe('name');
    expect(prefs.get('other')).toBeNull();
  });
});

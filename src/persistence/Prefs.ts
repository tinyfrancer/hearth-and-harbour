/**
 * How the menus are arranged on this device (the bank's sort, say), kept
 * apart from the game: a preference is not progress, so it is never in the
 * save, never exported, and changing one never asks for a save version. A
 * preference that cannot be kept (storage refused, a private window) is
 * simply forgotten; nothing depends on it.
 */
export interface Prefs {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

/** Where the menus' preferences live in local storage, each under this prefix. */
export const PREFS_PREFIX = 'hearth-and-harbour:pref:';

export class LocalStoragePrefs implements Prefs {
  get(key: string): string | null {
    try {
      return localStorage.getItem(PREFS_PREFIX + key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      localStorage.setItem(PREFS_PREFIX + key, value);
    } catch {
      // Full or refused: the choice lasts until the page closes, which is fine.
    }
  }
}

/** Preferences held for as long as the page is open: for tests and anywhere storage is not wanted. */
export function memoryPrefs(start: Record<string, string> = {}): Prefs {
  const kept = new Map(Object.entries(start));
  return {
    get: (key) => kept.get(key) ?? null,
    set: (key, value) => {
      kept.set(key, value);
    },
  };
}

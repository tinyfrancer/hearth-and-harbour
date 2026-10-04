import type { GameState } from '../core/state';
import { migrateGameState } from './migrations';
import type { SaveService } from './SaveService';

export const STORAGE_KEY = 'hearth-and-harbour:save';
/** A save this build could not read is set aside here rather than destroyed. */
export const UNREADABLE_KEY = 'hearth-and-harbour:save:unreadable';

// Harvested from untitled-boomer-mmo, with one change: that one wiped a save
// it could not migrate. This one moves it aside, so a save from a newer build
// (an old cached page opening after an update) is never lost to a reload.
export class LocalStorageSaveService implements SaveService {
  load(): GameState | null {
    let raw: string | null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
    if (!raw) {
      return null;
    }
    let migrated: GameState | null = null;
    let upgraded = false;
    try {
      const parsed: unknown = JSON.parse(raw);
      migrated = migrateGameState(parsed);
      upgraded = migrated !== null && migrated !== parsed;
    } catch {
      // Unparsable, or a step threw on a shape it did not expect.
    }
    if (!migrated) {
      this.setAside(raw);
      return null;
    }
    if (upgraded) {
      // Persist the upgraded shape so the migration runs once, not every load.
      this.save(migrated);
    }
    return migrated;
  }

  save(state: GameState): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      // Storage unavailable or full: report it rather than crash play.
      return false;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  private setAside(raw: string): void {
    try {
      localStorage.setItem(UNREADABLE_KEY, raw);
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

import type { GameState } from '../core/state';

/**
 * Where the game is kept. The game only ever talks to this, so a cloud-backed
 * one can replace the local one later without the rest noticing.
 */
export interface SaveService {
  load(): GameState | null;
  /** Whether it was written: false when storage is full or unavailable. */
  save(state: GameState): boolean;
  clear(): void;
}

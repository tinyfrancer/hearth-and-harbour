/**
 * The whole saved game. Everything the rules know lives here and nothing here
 * knows how it is shown. S2 grows it (skills, bank, the current action); a
 * change of shape bumps `GAME_STATE_VERSION` and adds a migration step.
 */
export const GAME_STATE_VERSION = 1;

export interface GameState {
  version: number;
  name: string;
  /** Epoch ms the character was made. */
  createdAt: number;
  /** Epoch ms of the last save: what offline progress (S3) measures from. */
  savedAt: number;
}

export const NAME_MAX_LENGTH = 16;

/** A typed name as it will be stored: trimmed, inner runs of space collapsed. */
export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/** What is wrong with a name, in words for the player, or null if it will do. */
export function nameProblem(raw: string): string | null {
  const name = cleanName(raw);
  if (name.length === 0) {
    return 'Your character needs a name.';
  }
  if (name.length > NAME_MAX_LENGTH) {
    return `Names can be up to ${NAME_MAX_LENGTH} characters.`;
  }
  return null;
}

export function newGame(name: string, now: number): GameState {
  return { version: GAME_STATE_VERSION, name: cleanName(name), createdAt: now, savedAt: now };
}

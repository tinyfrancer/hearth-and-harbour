import { GAME_STATE_VERSION, nameProblem, type GameState } from '../core/state';
import { migrateGameState } from './migrations';

// Harvested from untitled-boomer-mmo and trimmed to what this game's save holds.

/**
 * What names a file as one of this game's saves, whatever version wrote the
 * game inside it. It is the difference between "that is not a save" and "that
 * save is damaged", which are two different things to be told.
 */
export const SAVE_FILE_GAME = 'hearth-and-harbour';

interface SaveEnvelope {
  game: typeof SAVE_FILE_GAME;
  save: GameState;
}

/** Which of the two ways out a save was asked for. */
export type SaveExportKind = 'file' | 'code';

/** A save written for taking away: a file to download, or a code to copy. */
export type SaveExport =
  { kind: 'file'; fileName: string; text: string } | { kind: 'code'; text: string };

export type SaveReadResult = { ok: true; state: GameState } | { ok: false; reason: string };

const NOT_A_SAVE = "That isn't a Hearth & Harbour save.";
const TOO_NEW =
  'That save was made by a newer version of the game. Reload to update, then try again.';
const TOO_OLD = 'That save is from a version of the game too old to load.';

export function writeSaveExport(
  kind: SaveExportKind,
  state: GameState,
  now = new Date(),
): SaveExport {
  const envelope: SaveEnvelope = { game: SAVE_FILE_GAME, save: state };
  if (kind === 'code') {
    return { kind, text: encodeCode(JSON.stringify(envelope)) };
  }
  return {
    kind,
    fileName: `${SAVE_FILE_GAME}-${slug(state.name)}-${localDate(now)}.json`,
    // Indented, since a file is the form somebody might open to read.
    text: `${JSON.stringify(envelope, null, 2)}\n`,
  };
}

/**
 * Reads a save back from either form it was handed out in, and brings it up to
 * the current version through the same migration chain a stored save takes.
 */
export function readSave(text: string): SaveReadResult {
  const envelope = parseSaveText(text);
  if (!isRecord(envelope) || envelope.game !== SAVE_FILE_GAME || !isRecord(envelope.save)) {
    return { ok: false, reason: NOT_A_SAVE };
  }
  const { version } = envelope.save;
  if (typeof version !== 'number') {
    return { ok: false, reason: damaged('version should be a number') };
  }
  if (version > GAME_STATE_VERSION) {
    return { ok: false, reason: TOO_NEW };
  }
  let migrated: GameState | null;
  try {
    migrated = migrateGameState(envelope.save);
  } catch {
    // A step reads the older shape it upgrades, and a hand-edited one can
    // throw inside it before there is anything to name.
    return { ok: false, reason: damaged('it could not be brought up to date') };
  }
  if (!migrated) {
    return { ok: false, reason: TOO_OLD };
  }
  const problem = saveProblem(migrated as unknown as Record<string, unknown>);
  if (problem) {
    return { ok: false, reason: damaged(problem) };
  }
  return { ok: true, state: migrated };
}

/**
 * What is wrong with a current-version save, or null. A file can be edited by
 * hand, so nothing in it is trusted; each field the state gains gets a line.
 */
function saveProblem(state: Record<string, unknown>): string | null {
  if (typeof state.name !== 'string' || nameProblem(state.name) !== null) {
    return 'the name is missing or too long';
  }
  for (const field of ['createdAt', 'savedAt']) {
    const value = state[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return `${field} should be a time`;
    }
  }
  if (!isRecord(state.skills) || !Object.values(state.skills).every(isCount)) {
    return 'skills should be amounts of XP';
  }
  if (!isRecord(state.bank) || !Object.values(state.bank).every(isWhole)) {
    return 'the bank should hold whole numbers of things';
  }
  const { action } = state;
  if (
    action !== null &&
    !(isRecord(action) && typeof action.id === 'string' && isCount(action.progressMs))
  ) {
    return 'the current action is not one';
  }
  return null;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isWhole(value: unknown): value is number {
  return isCount(value) && Number.isInteger(value);
}

function damaged(problem: string): string {
  return `That save is damaged: ${problem}.`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Either form: a file's JSON as it is, or a code, which is that JSON in base64. */
function parseSaveText(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed.startsWith('{') ? trimmed : decodeCode(trimmed));
  } catch {
    return null;
  }
}

// Base64 over the UTF-8 bytes, so a name with an accent survives, and because
// a code is pasted through notes and messages that curl a straight quote.
function encodeCode(json: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(json)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function decodeCode(code: string): string {
  // A message wraps a long code, and a wrap is whitespace base64 never holds.
  const binary = atob(code.replace(/\s+/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

function slug(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'character';
}

function localDate(now: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

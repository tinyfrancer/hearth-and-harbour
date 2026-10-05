import { SLOTS } from '../core/content';
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
  if (!isWhole(state.coins)) {
    return 'coins should be a whole number';
  }
  if (!isRecord(state.mastery) || !Object.values(state.mastery).every(isCount)) {
    return 'mastery should be amounts of XP';
  }
  const { action } = state;
  if (
    action !== null &&
    !(
      isRecord(action) &&
      typeof action.id === 'string' &&
      isCount(action.progressMs) &&
      // A stun is time still to wait, so never nothing, and nothing fills the bar during it.
      (action.stunMs === undefined ||
        (isCount(action.stunMs) && action.stunMs > 0 && action.progressMs === 0))
    )
  ) {
    return 'the current action is not one';
  }
  const { potion } = state;
  if (
    potion !== null &&
    !(
      isRecord(potion) &&
      typeof potion.item === 'string' &&
      isWhole(potion.charges) &&
      potion.charges > 0
    )
  ) {
    return 'the potion should be a potion and a whole number of charges';
  }
  const { look } = state;
  if (
    !isRecord(look) ||
    !Object.entries(look).every(([part, id]) => LOOK_PARTS.includes(part) && typeof id === 'string')
  ) {
    return 'the look should be a skin, a hair and a hair colour';
  }
  const { equipment } = state;
  if (
    !isRecord(equipment) ||
    !Object.entries(equipment).every(
      ([slot, worn]) =>
        (SLOTS as readonly string[]).includes(slot) &&
        isRecord(worn) &&
        typeof worn.item === 'string' &&
        isWhole(worn.qty) &&
        (slot === 'ammo' ? worn.qty > 0 : worn.qty === 1),
    )
  ) {
    return 'the equipment should be one thing a slot, or a stack of ammunition';
  }
  const { fight } = state;
  if (fight !== null && !isFight(fight)) {
    return 'the fight under way is not one';
  }
  if (fight !== null && action !== null) {
    return 'it is fighting and doing something else at once';
  }
  const { food } = state;
  if (
    food !== null &&
    !(isRecord(food) && typeof food.item === 'string' && isWhole(food.qty) && food.qty > 0)
  ) {
    return 'the food slot should hold a stack of one kind of food';
  }
  if (!isWhole(state.eatAt) || state.eatAt > 100) {
    return 'the line to eat at should be a percentage';
  }
  if (!isWhole(state.rng) || state.rng >= 2 ** 32) {
    return 'the dice should be a whole number below 2^32';
  }
  const { bestiary } = state;
  if (
    !isRecord(bestiary) ||
    !Object.values(bestiary).every(
      (record) =>
        isRecord(record) &&
        isWhole(record.kills) &&
        Array.isArray(record.seen) &&
        record.seen.every((item) => typeof item === 'string'),
    )
  ) {
    return 'what is known of monsters should be kills and drops seen';
  }
  const { marks } = state;
  if (
    !isRecord(marks) ||
    !Object.values(marks).every(
      (record) =>
        isRecord(record) &&
        isWhole(record.picked) &&
        isWhole(record.caught) &&
        Array.isArray(record.seen) &&
        record.seen.every((item) => typeof item === 'string'),
    )
  ) {
    return 'what is known of marks should be pockets picked, times caught and things seen';
  }
  const { bounty } = state;
  if (
    bounty !== null &&
    !(
      isRecord(bounty) &&
      typeof bounty.monster === 'string' &&
      isWhole(bounty.count) &&
      bounty.count > 0 &&
      isWhole(bounty.done) &&
      bounty.done <= bounty.count
    )
  ) {
    return 'the bounty should be a monster and a count of kills made of those asked';
  }
  if (!isWhole(state.bountyPoints)) {
    return 'bounty points should be a whole number';
  }
  const { health } = state;
  if (
    health !== null &&
    !(isRecord(health) && isWhole(health.hp) && health.hp > 0 && isCount(health.regenMs))
  ) {
    return 'health should be hit points and time towards the next';
  }
  if (health !== null && fight !== null) {
    return 'it has hit points in a fight and out of one at once';
  }
  return null;
}

/** A fight: a monster, both sides' hit points, both waits, and the tally so far. */
function isFight(fight: unknown): boolean {
  return (
    isRecord(fight) &&
    typeof fight.monster === 'string' &&
    isWhole(fight.hp) &&
    fight.hp > 0 &&
    isWhole(fight.foeHp) &&
    // The next blow is always ahead: a wait of nothing has already happened.
    isWhole(fight.playerMs) &&
    fight.playerMs > 0 &&
    isWhole(fight.foeMs) &&
    fight.foeMs > 0 &&
    ['kills', 'coins', 'eaten', 'arrows'].every((count) => isWhole(fight[count])) &&
    isRecord(fight.loot) &&
    Object.values(fight.loot).every(isWhole)
  );
}

/** The parts of a look a save may name. Their values are the art's to judge. */
const LOOK_PARTS: readonly string[] = ['skin', 'hair', 'hairColour'];

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

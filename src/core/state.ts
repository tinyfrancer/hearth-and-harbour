import type { Slot } from './content';
import { levelForXp } from './xp';

/**
 * The whole saved game. Everything the rules know lives here and nothing here
 * knows how it is shown. A change of shape or meaning bumps
 * `GAME_STATE_VERSION` and adds a migration step.
 *
 * States are never changed in place: every rule returns a new one.
 */
export const GAME_STATE_VERSION = 5;

export interface ActiveAction {
  /** An ActionDef id. */
  id: string;
  /** Time already put into the completion under way. */
  progressMs: number;
}

/** The potion last drunk, while it has charges left. */
export interface ActivePotion {
  /** The ItemDef id of the potion, whose `potion` says what it does. */
  item: string;
  /** Completions it has left to help with: a whole number, never zero. */
  charges: number;
}

/**
 * How the character looks, by the ids the art offers (`LOOK_CHOICES` in
 * `src/art/character.ts`). Core never knows the choices, so it never checks
 * them: a part left out, or one the art no longer offers, is drawn as the
 * art's first choice for it. A character made before looks is all left out.
 */
export interface Look {
  skin?: string;
  hair?: string;
  hairColour?: string;
}

/** What is in one equipment slot: one of a thing, or a whole stack of ammunition. */
export interface Worn {
  /** An ItemDef id whose `equip` names this slot. */
  item: string;
  /** Always 1, except ammunition, which is worn as a stack. Never zero. */
  qty: number;
}

export interface GameState {
  version: number;
  name: string;
  /** Epoch ms the character was made. */
  createdAt: number;
  /** Epoch ms of the last save: what offline progress (S3) measures from. */
  savedAt: number;
  /** Total XP by skill id. A skill never trained has no entry and reads as 0. */
  skills: Record<string, number>;
  /** How many of each item, by item id. Nothing is stored at zero. */
  bank: Record<string, number>;
  coins: number;
  /** Mastery XP by action id: practice at one particular thing. Unpractised reads as 0. */
  mastery: Record<string, number>;
  /** The one thing the character is doing, or null when idle. */
  action: ActiveAction | null;
  /** One potion at a time; null when none is working. */
  potion: ActivePotion | null;
  look: Look;
  /** What is worn, by slot. An empty slot has no entry. */
  equipment: Partial<Record<Slot, Worn>>;
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

export function newGame(name: string, now: number, look: Look = {}): GameState {
  return {
    version: GAME_STATE_VERSION,
    name: cleanName(name),
    createdAt: now,
    savedAt: now,
    skills: {},
    bank: {},
    coins: 0,
    mastery: {},
    action: null,
    potion: null,
    look,
    equipment: {},
  };
}

export function skillXp(state: GameState, skill: string): number {
  return state.skills[skill] ?? 0;
}

export function skillLevel(state: GameState, skill: string): number {
  return levelForXp(skillXp(state, skill));
}

export function bankCount(state: GameState, item: string): number {
  return state.bank[item] ?? 0;
}

export function masteryXp(state: GameState, action: string): number {
  return state.mastery[action] ?? 0;
}

/** Mastery runs 1-99 on the same curve as skills. */
export function masteryLevel(state: GameState, action: string): number {
  return levelForXp(masteryXp(state, action));
}

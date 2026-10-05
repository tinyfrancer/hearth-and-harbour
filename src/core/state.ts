import type { Slot } from './content';
import { seedFrom } from './rng';
import { levelForXp } from './xp';

/**
 * The whole saved game. Everything the rules know lives here and nothing here
 * knows how it is shown. A change of shape or meaning bumps
 * `GAME_STATE_VERSION` and adds a migration step.
 *
 * States are never changed in place: every rule returns a new one.
 */
export const GAME_STATE_VERSION = 6;

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

/**
 * A fight under way: the character against one monster after another of a
 * kind, until told to stop, out of arrows, or dead. Everything the next
 * event depends on is here, so a fight carries on from a save exactly.
 */
export interface Fight {
  /** A MonsterDef id. */
  monster: string;
  /** The character's hit points: above zero, at most the Vitality maximum. */
  hp: number;
  /** The monster's hit points. Zero while the next one is on its way. */
  foeHp: number;
  /** Milliseconds until the character's next blow. */
  playerMs: number;
  /**
   * Milliseconds until the monster's next blow, or, while `foeHp` is zero,
   * until the next monster arrives.
   */
  foeMs: number;
  /** What this fight has come to so far, for the fight screen's tally. */
  kills: number;
  coins: number;
  /** Items dropped, by item id. */
  loot: Record<string, number>;
  /** Food eaten. */
  eaten: number;
  /** Arrows shot. */
  arrows: number;
}

/** What the character has learnt of one kind of monster. */
export interface MonsterRecord {
  kills: number;
  /** The item ids it has been seen to drop, in the order first seen. */
  seen: string[];
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
  /**
   * The one thing the character is doing, or null when idle or fighting. At
   * most one of `action` and `fight` is ever set.
   */
  action: ActiveAction | null;
  /** The fight under way, or null. */
  fight: Fight | null;
  /** One potion at a time; null when none is working. */
  potion: ActivePotion | null;
  look: Look;
  /** What is worn, by slot. An empty slot has no entry. */
  equipment: Partial<Record<Slot, Worn>>;
  /** The food slot: a stack of one kind of cooked food, eaten in a fight. Null when empty. */
  food: Worn | null;
  /** Eat when hit points fall below this percentage of the most there can be. */
  eatAt: number;
  /** Where the dice have got to (src/core/rng.ts). A whole number from 0 to 2^32 - 1. */
  rng: number;
  /** What the character knows of each monster, by MonsterDef id. Never fought reads as nothing. */
  bestiary: Record<string, MonsterRecord>;
}

/** Eat below half health, unless the player says otherwise. */
export const DEFAULT_EAT_AT = 50;

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
    fight: null,
    food: null,
    eatAt: DEFAULT_EAT_AT,
    rng: seedFrom(now),
    bestiary: {},
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

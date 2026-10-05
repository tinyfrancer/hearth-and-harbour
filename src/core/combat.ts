import type { CombatStyle, Content, MonsterDef } from './content';
import { equipmentTotals } from './equipment';
import { bankCount, skillLevel, type Fight, type GameState, type Health, type Worn } from './state';

/**
 * Combat's rules, each plain enough to say in a sentence. The fight itself,
 * blow by blow, is `advanceFight` in src/core/fight.ts; this file is the
 * numbers it reads and what the player does to start, stop and feed it.
 *
 * Combat reads four skills by these ids, which src/data/skills.ts fills in.
 * Which one a blow trains follows the weapon in hand.
 */
export const MELEE = 'melee';
export const RANGED = 'ranged';
export const DEFENCE = 'defence';
export const VITALITY = 'vitality';

/** The character swings or shoots once every 2.4 seconds, whatever is in hand. */
export const PLAYER_ATTACK_MS = 2400;
/** A monster killed is followed by the next of its kind three seconds later. */
export const RESPAWN_MS = 3000;
/** The attacking skill earns this much XP for each point of damage dealt. */
export const XP_PER_DAMAGE = 5;
/** Defence earns this much XP for each point of a monster's max hit, every time it attacks. */
export const DEFENCE_XP_PER_MAX_HIT = 2;

export type ResultOf = { ok: true; state: GameState } | { ok: false; reason: string };

/** Attack rating: 10, plus the attacking skill's level, plus the gear's attack. */
export function attackRating(level: number, gearAttack: number): number {
  return 10 + level + gearAttack;
}

/** Defence rating: 10, plus the Defence level, plus the armour worn. */
export function defenceRating(level: number, armour: number): number {
  return 10 + level + armour;
}

/** A blow lands with the chance attack / (attack + defence): even ratings hit half the time. */
export function hitChance(attack: number, defence: number): number {
  return attack / (attack + defence);
}

/** A blow that lands does 1 to its max hit: 1, plus half of the skill's level and the gear's strength. */
export function maxHitFor(level: number, gearStrength: number): number {
  return 1 + Math.floor((level + gearStrength) / 2);
}

/** Hit points: 20, and 4 more for each Vitality level after the first. */
export function maxHpFor(vitality: number): number {
  return 20 + 4 * (vitality - 1);
}

/** Between one monster and the next the character gets back a tenth of their hit points, rounded up. */
export function breatherFor(maxHp: number): number {
  return Math.ceil(maxHp / 10);
}

/** Out of a fight the character gets back one hit point every six seconds. */
export const REGEN_MS = 6000;

/** The most hit points the character can have, by their Vitality level. */
export function maxHp(state: GameState): number {
  return maxHpFor(skillLevel(state, VITALITY));
}

/** The character's hit points now: the fight's, or what they carry out of one. */
export function hitPoints(state: GameState): number {
  if (state.fight) return state.fight.hp;
  return state.health ? state.health.hp : maxHp(state);
}

/** What `health` holds for a character at `hp` of `most`: nothing at full health. */
export function hurt(hp: number, most: number): Health | null {
  return hp >= most ? null : { hp, regenMs: 0 };
}

/**
 * Let `ms` pass out of a fight for the character's health: a hit point back
 * every REGEN_MS, the time towards the next one carried, until full. Worked
 * out by arithmetic on the total, so time cut up any way heals the same.
 */
export function rest(state: GameState, ms: number): GameState {
  const health = state.health;
  if (!health || state.fight || !(ms > 0)) return state;
  const time = health.regenMs + ms;
  const hp = health.hp + Math.floor(time / REGEN_MS);
  if (hp >= maxHp(state)) return { ...state, health: null };
  return { ...state, health: { hp, regenMs: time % REGEN_MS } };
}

/** Out of the fight under way, carrying its hit points out with the character. */
export function leaveFight(state: GameState): GameState {
  if (!state.fight) return state;
  return { ...state, fight: null, health: hurt(state.fight.hp, maxHp(state)) };
}

/** Knocked out: the fight is over and the character comes round with a tenth of their hit points. */
export function comeRound(most: number): Health {
  return { hp: breatherFor(most), regenMs: 0 };
}

/** The skill a blow in this style trains. */
export function attackSkill(style: CombatStyle): string {
  return style === 'ranged' ? RANGED : MELEE;
}

/** Everything about the character a fight reads, as it stands now: what the sheet shows. */
export interface PlayerCombat {
  style: CombatStyle;
  /** The skill that earns from the character's blows. */
  skill: string;
  attack: number;
  defence: number;
  maxHit: number;
  maxHp: number;
  /** Hit points now, in a fight or out of one: what a dungeon run starts with. */
  hp: number;
}

export function playerCombat(state: GameState, content: Content): PlayerCombat {
  const totals = equipmentTotals(state, content);
  const skill = attackSkill(totals.style);
  const level = skillLevel(state, skill);
  return {
    style: totals.style,
    skill,
    attack: attackRating(level, totals.attack),
    defence: defenceRating(skillLevel(state, DEFENCE), totals.armour),
    maxHit: maxHitFor(level, totals.strength),
    maxHp: maxHpFor(skillLevel(state, VITALITY)),
    hp: hitPoints(state),
  };
}

export function monsterDef(content: Content, id: string): MonsterDef | undefined {
  return content.monsters?.[id];
}

/** The monsters of an area, weakest first. */
export function monstersIn(content: Content, areaId: string): MonsterDef[] {
  return Object.values(content.monsters ?? {})
    .filter((monster) => monster.area === areaId)
    .sort((a, b) => a.level - b.level);
}

/** A fight's opening: both at full health, both blows a full wait away. */
export function freshFight(monster: MonsterDef, hp: number): Fight {
  return {
    monster: monster.id,
    hp,
    foeHp: monster.hp,
    playerMs: PLAYER_ATTACK_MS,
    foeMs: monster.speedMs,
    kills: 0,
    coins: 0,
    loot: {},
    eaten: 0,
    arrows: 0,
  };
}

/** Whether a monster may be fought now: one only bounty hunters go after needs a bounty on it. */
export function mayFight(state: GameState, monster: MonsterDef): boolean {
  return !monster.bountyOnly || state.bounty?.monster === monster.id;
}

/**
 * Pick a fight. It stops whatever else the character was doing; picking the
 * fight already under way changes nothing, so a double tap loses nothing.
 * A new fight starts with the hit points the character has, and if those are
 * below the eating line, with a meal from the food slot first.
 */
export function startFight(state: GameState, monsterId: string, content: Content): ResultOf {
  const monster = monsterDef(content, monsterId);
  if (!monster) {
    return { ok: false, reason: 'There is no such thing to fight.' };
  }
  if (state.fight?.monster === monsterId) {
    return { ok: true, state };
  }
  if (!mayFight(state, monster)) {
    return { ok: false, reason: `Only a bounty on the ${monster.name} will lead you to it.` };
  }
  const me = playerCombat(state, content);
  if (me.style === 'ranged' && !state.equipment.ammo) {
    return { ok: false, reason: 'A bow needs arrows. Ready some first.' };
  }
  let hp = me.hp;
  let food = state.food?.qty ?? 0;
  const heals = state.food ? (content.items[state.food.item]?.heals ?? 0) : 0;
  while (food > 0 && heals > 0 && hp * 100 < state.eatAt * me.maxHp) {
    hp = Math.min(me.maxHp, hp + heals);
    food -= 1;
  }
  const eaten = (state.food?.qty ?? 0) - food;
  return {
    ok: true,
    state: {
      ...state,
      action: null,
      health: null,
      food: state.food && food > 0 ? { item: state.food.item, qty: food } : null,
      fight: { ...freshFight(monster, hp), eaten },
    },
  };
}

export function stopFight(state: GameState): GameState {
  return leaveFight(state);
}

/** Whether there is anything going on for time to pass for. */
export function busy(state: GameState): boolean {
  return state.action !== null || state.fight !== null;
}

/**
 * Put a kind of food in the food slot: the whole stack from the bank, joining
 * what is there if it is the same kind and sending it back if not.
 */
export function loadFood(state: GameState, itemId: string, content: Content): ResultOf {
  if (!(content.items[itemId]?.heals ?? 0)) {
    return { ok: false, reason: 'That is not something to eat.' };
  }
  const held = bankCount(state, itemId);
  if (held < 1) {
    return { ok: false, reason: 'You have none of those.' };
  }
  const bank = { ...unloaded(state).bank };
  const qty = bank[itemId]!;
  delete bank[itemId];
  const food: Worn = { item: itemId, qty };
  return { ok: true, state: { ...state, bank, food } };
}

/** The food slot emptied into the bank. */
export function unloadFood(state: GameState): GameState {
  return state.food ? unloaded(state) : state;
}

function unloaded(state: GameState): GameState {
  if (!state.food) return state;
  const { item, qty } = state.food;
  return { ...state, bank: { ...state.bank, [item]: bankCount(state, item) + qty }, food: null };
}

/** The lowest and highest the eating line can be set, and the step it moves in. */
export const EAT_AT_MIN = 10;
export const EAT_AT_MAX = 90;
export const EAT_AT_STEP = 10;

/** Set the line below which the character eats, as a percentage of their hit points. */
export function setEatAt(state: GameState, percent: number): GameState {
  const eatAt = Math.min(Math.max(Math.round(percent), EAT_AT_MIN), EAT_AT_MAX);
  return eatAt === state.eatAt ? state : { ...state, eatAt };
}

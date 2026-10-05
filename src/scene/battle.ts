/*
 * Fighting in a dungeon, as pure rules. A battle is a value: time, taps and
 * button presses move it on, and nothing in it is saved while it lasts. When
 * the run ends, `spoilsOf` is what it came to, for `settleRun`.
 *
 * The numbers are lane A's (src/core/combat.ts): the character's ratings, max
 * hit and hit points from `playerCombat`, who hits whom by `hitChance`, the
 * monsters' own rows (from the tables, or the grotto's cast in `cast.ts`),
 * XP by `XP_PER_DAMAGE` and friends. What is the room's own is here:
 * walking, wading and being washed off by the tide, reach, noticing, heavy
 * attacks marked on the ground, a boss's phases and volleys, abilities, food,
 * and loot left on the floor.
 *
 * Chance comes from dice seeded when the run starts, never the save's. Rules
 * act on a tick every 100 ms of the run's own clock, the same ticks however
 * the frames fall, with movement carried exactly between them; so the same
 * seed and the same taps at the same moments give the same run, and a heavy
 * attack lands on a tick, judged by exactly where the hero stands then. The
 * tide is a function of the same clock, and everything it does (flooding,
 * slowing) is decided on a tick too.
 */
import type { CombatStyle, Content, MonsterDef } from '../core/content';
import {
  DEFENCE,
  DEFENCE_XP_PER_MAX_HIT,
  PLAYER_ATTACK_MS,
  VITALITY,
  XP_PER_DAMAGE,
  hitChance,
  playerCombat,
  type PlayerCombat,
} from '../core/combat';
import { Dice } from '../core/rng';
import type { RunSpoils } from '../core/run';
import type { GameState } from '../core/state';
import type { CastDef } from './cast';
import { foeKind, type FoeKind } from './foes';
import { groundMap, standable, wading, type Ground, type RoomTile } from './ground';
import { clearLine, route } from './path';
import { advancePlay, facingToward, type Facing, type Play } from './play';
import { cycleTide, surgeTide, type TideNow } from './tide';
import { step } from './walker';
import { TILE, cellAt, centreOf, inMap, isSolid, type Cell, type Point, type TileMap } from './tileMap';

/** The rules act every this many ms of the run's clock. Every timer is a whole number of them. */
export const TICK_MS = 100;
/** How near, feet to feet, the hero must be to strike with a weapon in hand. */
export const MELEE_REACH = 30;
/** How far beside his target a hero with a blade stands to strike it. */
export const MELEE_STAND = 24;
/** How far a bow reaches, with nothing solid but water between. */
export const RANGED_REACH = 120;
/** A monster arriving within reach waits at least this long before its first blow. */
export const WINDUP_MS = 800;
/** Loot this near the hero's feet is picked up. */
export const PICKUP = 14;
/** From the last blow of a run to its results. */
export const BEAT_MS = 1200;
/** How long a number or a flash stays on screen. */
export const EFFECT_MS = 900;
/** Between one fish and the next. */
export const FOOD_MS = 3000;

/** In the shallows everyone walks at this much of their pace. */
export const WADE_PACE = 0.6;
/** Washed off ground the sea has covered: how many times walking pace the water carries you. */
export const WASH_PACE = 3;
/** Washed off: a fraction of the hero's hit points, never the last one. */
export const FLOOD_HURT = 1 / 14;
/** A brig's first cells open once the hero is this far inside its doors. */
export const RELEASE_STEP = 40;
/** Something said over a speaker's head lasts this long. */
export const SAY_MS = 2600;

/** Wide swing: reaches everything this near. */
export const SWEEP_REACH = 40;
/** Brace: how long it waits for a heavy blow before it lapses. */
export const BRACE_MS = 6000;
/** Step back: how far, and how many times walking pace. */
export const STEP_BACK = 40;
export const STEP_BACK_PACE = 4;

export type AbilityId = 'sweep' | 'brace' | 'double' | 'step_back';

export interface Ability {
  readonly id: AbilityId;
  readonly name: string;
  readonly cooldownMs: number;
}

/** Two abilities for each style of weapon, in the order the buttons show them. */
export const ABILITIES: Readonly<Record<CombatStyle, readonly [Ability, Ability]>> = {
  melee: [
    { id: 'sweep', name: 'Wide swing', cooldownMs: 8000 },
    { id: 'brace', name: 'Brace', cooldownMs: 12_000 },
  ],
  ranged: [
    { id: 'double', name: 'Double shot', cooldownMs: 8000 },
    { id: 'step_back', name: 'Step back', cooldownMs: 9000 },
  ],
};

/**
 * The character as a run reads them when it starts: what the sheet shows,
 * the hit points they have now, the food and the arrows carried.
 */
export interface Fighter extends PlayerCombat {
  readonly food: { readonly item: string; readonly qty: number; readonly heals: number } | null;
  /** Arrows carried; none counted for a weapon that does not shoot. */
  readonly arrows: number;
}

export function fighterOf(state: GameState, content: Content): Fighter {
  const me = playerCombat(state, content);
  const heals = state.food ? (content.items[state.food.item]?.heals ?? 0) : 0;
  return {
    ...me,
    food: state.food && heals > 0 ? { ...state.food, heals } : null,
    arrows: me.style === 'ranged' ? (state.equipment.ammo?.qty ?? 0) : 0,
  };
}

/** A monster put in a room, where it stands to begin with, and which of the room's cells it waits in. */
export interface Placement {
  readonly room: string;
  readonly monster: string;
  readonly at: Point;
  readonly wave?: number;
}

/** The shape of ground a heavy attack marks. */
export type MarkShape = 'circle' | 'line' | 'arc';

/** A heavy attack on its way: the marked ground, and when it lands. */
export interface Telegraph {
  /** A circle's or an arc's middle; the top of a line, which runs straight down from it. */
  readonly at: Point;
  /** A circle's or arc's radius; half a line's width. */
  readonly radius: number;
  readonly shape: MarkShape;
  /** A line's bottom end (its y). */
  readonly bottom?: number;
  /** An arc's direction (radians, from +x towards +y) and its width (radians). */
  readonly facing?: number;
  readonly spread?: number;
  /** On the run's clock: when the mark appeared, and when it lands. */
  readonly from: number;
  readonly lands: number;
  /** Where it was thrown from, for one that flies. */
  readonly origin: Point | null;
  readonly damage: number;
  /** A lit keg, which goes out if it lands in water. */
  readonly douse?: boolean;
}

/** Whether feet at `p` are in a mark's ground when it lands. */
export function inMark(t: Telegraph, p: Point): boolean {
  if (t.shape === 'line') {
    return Math.abs(p.x - t.at.x) < t.radius && p.y >= t.at.y && p.y <= (t.bottom ?? t.at.y);
  }
  const d = distance(p, t.at);
  if (d >= t.radius) return false;
  if (t.shape === 'circle' || d < 1) return true;
  const turn = Math.atan2(p.y - t.at.y, p.x - t.at.x) - (t.facing ?? 0);
  const off = Math.abs(Math.atan2(Math.sin(turn), Math.cos(turn)));
  return off <= (t.spread ?? Math.PI * 2) / 2;
}

/** Where a flier is in its round. */
export interface Flight {
  readonly mode: 'perch' | 'in' | 'down' | 'out';
  /** Which of the room's perches it is on or making for. */
  readonly perch: number;
  /** When this part of the round ends, on the clock; Infinity while it is flying somewhere. */
  readonly until: number;
}

export interface Foe {
  /** Its room and its place in the battle's list: `pools 2`. */
  readonly key: string;
  readonly room: string;
  readonly monster: string;
  readonly at: Point;
  readonly path: readonly Point[];
  readonly facing: Facing;
  readonly hp: number;
  readonly aware: boolean;
  /** Until its next ordinary blow. */
  readonly blowMs: number;
  /** Whether it was within reach at the last tick: arriving starts its wind-up. */
  readonly engaged: boolean;
  /** Until it may start a heavy attack. */
  readonly heavyMs: number;
  readonly heavy: Telegraph | null;
  /** When it was last struck, for the flash; -Infinity if never. */
  readonly struckAt: number;
  readonly diedAt: number | null;
  /** Which of its room's cells it waits behind: it fights once that many waves are let out. */
  readonly wave: number;
  /** In the shallows at the last tick: it walks slower. */
  readonly wading: boolean;
  /** Being carried off ground the sea has covered, to here. */
  readonly wash: Point | null;
  /** Gone without being beaten: a crew running for it when their captain falls. */
  readonly fled: boolean;
  /** Its blows come faster: a parrot nearby is egging it on. */
  readonly rallied: boolean;
  /** A flier's round; null for anything on foot. */
  readonly flight: Flight | null;
  /** A boss's phase, from 1; 0 for anyone else. */
  readonly phase: number;
  /** A boss's time until its next volley. */
  readonly volleyMs: number;
}

/** Loot on the floor where something fell. */
export interface Pile {
  readonly room: string;
  readonly at: Point;
  readonly loot: Readonly<Record<string, number>>;
  readonly coins: number;
}

/** Who says what, by the id of the line: the words themselves are the view's. */
export type SayLine = 'tide' | 'anchor' | 'down';

/** Something to show for a moment: a number, a miss, a heal, a flash. Not rules; drawn by `fightArt.ts`. */
export type Effect =
  | {
      readonly kind: 'hit';
      readonly at: Point;
      readonly amount: number;
      readonly on: 'hero' | 'foe';
      readonly from: number;
    }
  | {
      readonly kind: 'miss';
      readonly at: Point;
      readonly on: 'hero' | 'foe';
      readonly from: number;
    }
  | { readonly kind: 'heal'; readonly at: Point; readonly amount: number; readonly from: number }
  | {
      readonly kind: 'landed';
      readonly at: Point;
      readonly radius: number;
      readonly from: number;
      readonly mark: Telegraph;
      /** A keg that fell in water and went out. */
      readonly doused: boolean;
    }
  | { readonly kind: 'shot'; readonly at: Point; readonly to: Point; readonly from: number }
  | { readonly kind: 'swing'; readonly at: Point; readonly radius: number; readonly from: number }
  | { readonly kind: 'loot'; readonly at: Point; readonly from: number }
  | { readonly kind: 'empty'; readonly at: Point; readonly from: number }
  /** Washed off by the tide, here. */
  | { readonly kind: 'splash'; readonly at: Point; readonly from: number }
  /** A cell's bars lifted. */
  | { readonly kind: 'released'; readonly at: Point; readonly from: number }
  | { readonly kind: 'say'; readonly who: string; readonly line: SayLine; readonly from: number };

/** What the run has earned so far: paid in by `settleRun` however it ends. */
export interface Tally {
  readonly xp: Readonly<Record<string, number>>;
  readonly loot: Readonly<Record<string, number>>;
  readonly coins: number;
  readonly kills: number;
  /** Kills by monster id. */
  readonly killed: Readonly<Record<string, number>>;
  readonly eaten: number;
  readonly shot: number;
}

export type Cooldown = 'first' | 'second' | 'food';

export interface Battle {
  readonly fighter: Fighter;
  readonly monsters: Readonly<Record<string, MonsterDef>>;
  /** The item ids the game knows: loot of any other id is not dropped. Null knows everything. */
  readonly known: Readonly<Record<string, true>> | null;
  readonly seed: number;
  /** The battle's own clock, ms; it runs only while the run is played, not through doors. */
  readonly clock: number;
  readonly hp: number;
  /** Until the hero's next blow; at 0 he strikes as soon as something is in reach. */
  readonly blowMs: number;
  readonly struckAt: number;
  readonly target: string | null;
  /** Whether the hero walks after his target by himself (it was tapped) or only strikes it in reach. */
  readonly chase: boolean;
  readonly foes: readonly Foe[];
  readonly piles: readonly Pile[];
  /** When each room's doors opened, on the clock; rooms that never held anything are not here. */
  readonly opened: Readonly<Record<string, number>>;
  /** How many waves of each room's cells have been let out. */
  readonly released: Readonly<Record<string, number>>;
  /** The clock time each button is ready again. */
  readonly ready: Readonly<Record<Cooldown, number>>;
  /** Until when a brace is held, waiting for a heavy blow. */
  readonly braceUntil: number;
  /** Where a step back is taking him, at its quicker pace. */
  readonly dash: Point | null;
  /** In the shallows at the last tick: he walks slower. */
  readonly wading: boolean;
  /** Being carried off ground the sea has covered, to here. */
  readonly wash: Point | null;
  /** When the captain called the sea into his cove, and when it began to go out again. */
  readonly surge: number | null;
  readonly ebb: number | null;
  /** Marks that belong to no one foe: a boss's cannon volleys. */
  readonly volleys: readonly Telegraph[];
  readonly effects: readonly Effect[];
  readonly tally: Tally;
  /** How the fighting ended, and when: the room cleared, or the hero down. */
  readonly over: { readonly why: 'cleared' | 'fell'; readonly at: number } | null;
}

/** Where the battle is being fought: the room, its ground, whether it is the last, and its perches and landings. */
export interface Place {
  readonly room: string;
  readonly ground: Ground;
  readonly last: boolean;
  /** Where a flier sits out of reach between visits. */
  readonly perches?: readonly Point[];
  /** Where help called by a boss comes in. */
  readonly spawns?: readonly Point[];
}

type Writable<T> = { -readonly [K in keyof T]: T[K] };

export interface BattleOptions {
  /** The item ids the game knows, so loot it does not know yet is skipped rather than paid in. */
  readonly known?: Iterable<string>;
}

export function startBattle(
  fighter: Fighter,
  monsters: Readonly<Record<string, MonsterDef>>,
  placements: readonly Placement[],
  seed: number,
  options: BattleOptions = {},
): Battle {
  const foes: Foe[] = [];
  for (const p of placements) {
    const def = monsters[p.monster];
    if (!def) continue;
    const kind = foeKind(p.monster);
    foes.push(newFoe(`${p.room} ${foes.length}`, p.room, p.monster, p.at, def.hp, kind, p.wave));
  }
  const known = options.known
    ? (Object.fromEntries([...options.known].map((id) => [id, true])) as Record<string, true>)
    : null;
  return {
    fighter,
    monsters,
    known,
    seed: seed >>> 0,
    clock: 0,
    // As hurt as the character rowed out (hit points last between fights), never more than whole.
    hp: fighter.hp > 0 ? Math.min(fighter.hp, fighter.maxHp) : fighter.maxHp,
    blowMs: 0,
    struckAt: -Infinity,
    target: null,
    chase: false,
    foes,
    piles: [],
    opened: {},
    released: {},
    ready: { first: 0, second: 0, food: 0 },
    braceUntil: 0,
    dash: null,
    wading: false,
    wash: null,
    surge: null,
    ebb: null,
    volleys: [],
    effects: [],
    tally: { xp: {}, loot: {}, coins: 0, kills: 0, killed: {}, eaten: 0, shot: 0 },
    over: null,
  };
}

function newFoe(
  key: string,
  room: string,
  monster: string,
  at: Point,
  hp: number,
  kind: FoeKind,
  wave = 0,
): Foe {
  return {
    key,
    room,
    monster,
    at,
    path: [],
    facing: 'left',
    hp,
    aware: false,
    blowMs: 0,
    engaged: false,
    heavyMs: 0,
    heavy: null,
    struckAt: -Infinity,
    diedAt: null,
    wave,
    wading: false,
    wash: null,
    fled: false,
    rallied: false,
    flight: kind.flies ? { mode: 'perch', perch: 0, until: 0 } : null,
    phase: kind.boss ? 1 : 0,
    volleyMs: kind.boss ? kind.boss.volleys.firstMs : 0,
  };
}

/* ----- Reading a battle ----- */

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export const alive = (foe: Foe): boolean => foe.diedAt === null;

export function foesIn(battle: Battle, room: string): Foe[] {
  return battle.foes.filter((f) => f.room === room);
}

/** Whether a room's doors are shut: something in it is still standing. */
export function roomLocked(battle: Battle, room: string): boolean {
  return battle.foes.some((f) => f.room === room && alive(f));
}

/** The tide in a room now: its own (the captain's) or the one the grotto shares. */
export function tideOf(battle: Battle, place: Place): TideNow {
  return place.ground.ownTide
    ? surgeTide(battle.clock, battle.surge, battle.ebb)
    : cycleTide(battle.clock);
}

/** The room's ground now, to walk and path on: the tide, barred doors, open cells. */
export function mapOf(battle: Battle, place: Place): TileMap<RoomTile> {
  return groundMap(place.ground, {
    level: tideOf(battle, place).level,
    shut: roomLocked(battle, place.room),
    released: battle.released[place.room] ?? 0,
  });
}

/** Whether a foe is still behind the bars of a cell that has not been opened. */
export function held(battle: Battle, place: Place, foe: Foe): boolean {
  return place.ground.bars.length > 0 && foe.wave >= (battle.released[place.room] ?? 0);
}

/** How far the hero's weapon reaches. */
export function reachOf(fighter: Fighter): number {
  return fighter.style === 'ranged' ? RANGED_REACH : MELEE_REACH;
}

/** Whether nothing that blocks sight (rock; not water, bars or what stands about) lies between. */
export function inSight(map: TileMap, a: Point, b: Point): boolean {
  const steps = Math.max(1, Math.ceil(distance(a, b) / 4));
  for (let i = 1; i < steps; i++) {
    const cell = cellAt({ x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps });
    if (!inMap(map, cell)) return false;
    const tile = map.tiles[cell.row]![cell.col];
    if (tile === 'rock' || (isSolid(map, cell) && tile === 'door')) return false;
  }
  return true;
}

/** Whether the hero at `hero` can strike `foe`: near enough, and for a bow, in sight. */
export function inReach(battle: Battle, map: TileMap, hero: Point, foe: Foe): boolean {
  if (!alive(foe)) return false;
  const reach = reachOf(battle.fighter);
  if (distance(hero, foe.at) > reach) return false;
  return battle.fighter.style !== 'ranged' || inSight(map, hero, foe.at);
}

export function arrowsLeft(battle: Battle): number {
  return Math.max(0, battle.fighter.arrows - battle.tally.shot);
}

export function foodLeft(battle: Battle): number {
  return Math.max(0, (battle.fighter.food?.qty ?? 0) - battle.tally.eaten);
}

/** The foe a tap at `point` is on, if any: its tap box from the data, grown to `min` art pixels. */
export function foeAt(battle: Battle, room: string, point: Point, min = 0): Foe | null {
  let best: Foe | null = null;
  let bestDistance = Infinity;
  for (const foe of battle.foes) {
    if (foe.room !== room || !alive(foe)) continue;
    const { w, h } = foeKind(foe.monster).box;
    const width = Math.max(w, min);
    const height = Math.max(h, min);
    const top = foe.at.y - h + (h - height) / 2;
    if (Math.abs(point.x - foe.at.x) > width / 2 || point.y < top || point.y > top + height)
      continue;
    const d = distance(point, { x: foe.at.x, y: foe.at.y - h / 2 });
    if (d < bestDistance) {
      best = foe;
      bestDistance = d;
    }
  }
  return best;
}

/**
 * What a run has come to, as `settleRun` takes it: XP, loot, coins, what was
 * eaten and shot, the hit points left, the kills by monster, and the
 * dungeon's id if the run cleared it.
 */
export function spoilsOf(battle: Battle, cleared?: string): RunSpoils {
  const { xp, loot, coins, eaten, shot, killed } = battle.tally;
  // The hit points come home too: 0 is a knock-out, and the character comes round as from any other.
  return {
    xp,
    loot,
    coins,
    foodEaten: eaten,
    arrowsUsed: shot,
    hp: battle.hp,
    kills: killed,
    ...(cleared ? { cleared } : {}),
  };
}

/** A button's state: ready, or how long until it is. */
export function cooldownLeft(battle: Battle, which: Cooldown): number {
  return Math.max(0, battle.ready[which] - battle.clock);
}

/** The boss of a room, standing or not, if it has one. */
export function bossOf(battle: Battle, room: string): Foe | null {
  return battle.foes.find((f) => f.room === room && foeKind(f.monster).boss) ?? null;
}

/* ----- The working copy: rules edit this, and hand back a new battle ----- */

interface Work extends Writable<
  Omit<Battle, 'foes' | 'tally' | 'ready' | 'piles' | 'effects' | 'opened' | 'released' | 'volleys'>
> {
  opened: Record<string, number>;
  released: Record<string, number>;
  foes: Writable<Foe>[];
  tally: Writable<Tally> & {
    xp: Record<string, number>;
    loot: Record<string, number>;
    killed: Record<string, number>;
  };
  ready: Record<Cooldown, number>;
  piles: Pile[];
  volleys: Telegraph[];
  effects: Effect[];
}

function working(b: Battle): Work {
  return {
    ...b,
    foes: b.foes.map((f) => ({ ...f })),
    tally: {
      ...b.tally,
      xp: { ...b.tally.xp },
      loot: { ...b.tally.loot },
      killed: { ...b.tally.killed },
    },
    ready: { ...b.ready },
    opened: { ...b.opened },
    released: { ...b.released },
    piles: [...b.piles],
    volleys: [...b.volleys],
    effects: [...b.effects],
  };
}

const effect = (w: Work, e: Effect): void => {
  w.effects.push(e);
};

function earn(w: Work, skill: string, xp: number): void {
  if (xp > 0) w.tally.xp[skill] = (w.tally.xp[skill] ?? 0) + xp;
}

/** The hero's blow (or shot) at a foe: rolls to hit, then for damage. */
function strike(w: Work, dice: Dice, foe: Writable<Foe>, hero: Point, place: Place): void {
  const me = w.fighter;
  const def = w.monsters[foe.monster]!;
  if (me.style === 'ranged') {
    w.tally.shot += 1;
    effect(w, { kind: 'shot', at: hero, to: foe.at, from: w.clock });
  }
  foe.aware = true;
  // Numbers over a foe rise from the top of its head.
  const top = { x: foe.at.x, y: foe.at.y - foeKind(foe.monster).box.h };
  if (dice.next() < hitChance(me.attack, def.defence)) {
    const dealt = Math.min(dice.between(1, me.maxHit), foe.hp);
    foe.hp -= dealt;
    foe.struckAt = w.clock;
    earn(w, me.skill, XP_PER_DAMAGE * dealt);
    earn(w, VITALITY, Math.floor((XP_PER_DAMAGE * dealt) / 2));
    effect(w, { kind: 'hit', at: top, amount: dealt, on: 'foe', from: w.clock });
  } else {
    effect(w, { kind: 'miss', at: top, on: 'foe', from: w.clock });
  }
  if (foe.hp === 0) fall(w, dice, foe, place);
}

/**
 * A foe down: its loot rolled onto the floor where it fell, as an idle kill
 * rolls it. Every roll is made whether or not the game knows the item yet,
 * so a run rolls the same either way; an item it does not know is left out.
 * A boss down sends its crew running and the sea out.
 */
function fall(w: Work, dice: Dice, foe: Writable<Foe>, place: Place): void {
  const def = w.monsters[foe.monster] as CastDef;
  foe.diedAt = w.clock;
  foe.heavy = null;
  foe.path = [];
  foe.wash = null;
  w.tally.kills += 1;
  w.tally.killed[foe.monster] = (w.tally.killed[foe.monster] ?? 0) + 1;
  const known = (item: string): boolean => !w.known || item in w.known;
  const loot: Record<string, number> = {};
  const add = (item: string, qty: number): void => {
    if (known(item) && qty > 0) loot[item] = (loot[item] ?? 0) + qty;
  };
  const coins = dice.between(def.coins[0], def.coins[1]);
  for (const { item, min, max } of def.always) add(item, dice.between(min, max));
  for (const { item, min, max, oneIn } of def.rare) {
    if (dice.next() * oneIn < 1) add(item, dice.between(min, max));
  }
  if (def.pick && def.pick.items.length > 0) {
    if (dice.next() * def.pick.oneIn < 1)
      add(def.pick.items[dice.between(0, def.pick.items.length - 1)]!, 1);
  }
  if (coins > 0 || Object.keys(loot).length > 0) {
    // Something that falls over water drops what it had on the nearest shore, where it can be picked up.
    const map = mapOf(w, place);
    const under = tileUnder(map, foe.at);
    const at = standable(under) && under !== 'door' ? foe.at : (shoreOf(map, foe.at) ?? foe.at);
    w.piles.push({ room: foe.room, at, loot, coins });
  }
  if (w.target === foe.key) {
    w.target = null;
    w.chase = false;
  }
  if (foeKind(foe.monster).boss) {
    effect(w, { kind: 'say', who: foe.key, line: 'down', from: w.clock });
    w.volleys = [];
    if (place.ground.ownTide && w.surge !== null) w.ebb = w.clock;
    for (const other of w.foes) {
      if (other.room !== foe.room || !alive(other)) continue;
      other.diedAt = w.clock;
      other.fled = true;
      other.heavy = null;
      other.path = [];
    }
  }
}

/** A foe's blow at the hero: Defence and Vitality earn from every attack, hit or miss. */
function struck(w: Work, dice: Dice, def: MonsterDef, damage: number | null, hero: Point): void {
  const earned = DEFENCE_XP_PER_MAX_HIT * def.maxHit;
  earn(w, DEFENCE, earned);
  earn(w, VITALITY, Math.floor(earned / 2));
  let dealt = damage;
  if (dealt === null) {
    dealt =
      dice.next() < hitChance(def.attack, w.fighter.defence) ? dice.between(1, def.maxHit) : 0;
    if (dealt === 0) {
      effect(w, { kind: 'miss', at: hero, on: 'hero', from: w.clock });
      return;
    }
  }
  hurtHero(w, dealt, hero);
}

function hurtHero(w: Work, dealt: number, hero: Point): void {
  if (dealt <= 0) return;
  w.hp = Math.max(0, w.hp - dealt);
  w.struckAt = w.clock;
  effect(w, { kind: 'hit', at: hero, amount: dealt, on: 'hero', from: w.clock });
  if (w.hp === 0 && !w.over) w.over = { why: 'fell', at: w.clock };
}

/** A heavy blow landing: on the hero if he is in it, halved if he braced. */
function land(w: Work, t: Telegraph, map: TileMap, hero: Point, def: MonsterDef | null): void {
  const under = cellAt(t.at);
  const tile = inMap(map, under) ? map.tiles[under.row]![under.col] : undefined;
  const doused = !!t.douse && (tile === 'water' || tile === 'shallows');
  effect(w, { kind: 'landed', at: t.at, radius: t.radius, from: w.clock, mark: t, doused });
  if (doused) return;
  const inside = inMark(t, hero);
  let damage = inside ? t.damage : 0;
  if (inside && w.braceUntil > w.clock) {
    damage = Math.ceil(damage / 2);
    w.braceUntil = 0;
  }
  if (def) {
    const earned = DEFENCE_XP_PER_MAX_HIT * def.maxHit;
    earn(w, DEFENCE, earned);
    earn(w, VITALITY, Math.floor(earned / 2));
  }
  hurtHero(w, damage, hero);
}

function pickUp(w: Work, pile: Pile): void {
  w.tally.coins += pile.coins;
  for (const [item, qty] of Object.entries(pile.loot))
    w.tally.loot[item] = (w.tally.loot[item] ?? 0) + qty;
  effect(w, { kind: 'loot', at: pile.at, from: w.clock });
}

/** The foes of this room that are standing, in the battle's order. */
const standing = (w: Work, room: string): Writable<Foe>[] =>
  w.foes.filter((f) => f.room === room && alive(f));

/** The ground under some feet, now. */
function tileUnder(map: TileMap<RoomTile>, at: Point): RoomTile | undefined {
  const cell = cellAt(at);
  return inMap(map, cell) ? map.tiles[cell.row]![cell.col] : undefined;
}

const NEIGHBOURS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * Where the sea puts someone standing on ground it has just covered: the
 * nearest ground still to stand on, reached over water (never through rock),
 * the nearest in a straight line among the nearest in steps. Null only for a
 * room with nowhere dry at all, which the grotto's rooms never are.
 */
export function shoreOf(map: TileMap<RoomTile>, at: Point): Point | null {
  const start = cellAt(at);
  if (!inMap(map, start)) return null;
  const seen = new Set<number>([start.row * map.cols + start.col]);
  let ring: Cell[] = [start];
  while (ring.length > 0) {
    let best: Cell | null = null;
    let bestDistance = Infinity;
    for (const cell of ring) {
      const tile = map.tiles[cell.row]![cell.col];
      if (tile !== 'door' && standable(tile) && !isSolid(map, cell)) {
        const d = distance(centreOf(cell), at);
        if (d < bestDistance) {
          best = cell;
          bestDistance = d;
        }
      }
    }
    if (best) return centreOf(best);
    const next: Cell[] = [];
    for (const cell of ring) {
      for (const [dc, dr] of NEIGHBOURS) {
        const c = { col: cell.col + dc, row: cell.row + dr };
        if (!inMap(map, c)) continue;
        const i = c.row * map.cols + c.col;
        if (seen.has(i)) continue;
        seen.add(i);
        const tile = map.tiles[c.row]![c.col];
        if (tile === 'rock' || tile === 'prop' || tile === 'bars') continue;
        next.push(c);
      }
    }
    ring = next;
  }
  return null;
}

/** The first wave of a room's cells that has not been let out yet, if every earlier one is beaten. */
function nextWave(w: Work, place: Place, hero: Point, doors: readonly Point[]): boolean {
  const bars = place.ground.bars.length;
  const released = w.released[place.room] ?? 0;
  if (bars === 0 || released >= bars) return false;
  if (released === 0) return doors.every((d) => distance(d, hero) > RELEASE_STEP);
  return !w.foes.some((f) => f.room === place.room && alive(f) && f.wave < released);
}

/** The doors of a room's ground, as points. */
function doorsOf(ground: Ground): Point[] {
  const out: Point[] = [];
  ground.tiles.forEach((line, row) =>
    line.forEach((t, col) => {
      if (t === 'door') out.push(centreOf({ col, row }));
    }),
  );
  return out;
}

const doorPoints = new WeakMap<Ground, Point[]>();

/**
 * The rules, once a tick. In this order, every time: the tide (flooding and
 * wading), timers, heavy attacks landing, cells opening, noticing, loot, the
 * hero's target and blow, each foe in the order the room lists them, then
 * whether the room is clear.
 */
function tick(w: Work, dice: Dice, place: Place, play: Play): Play {
  w.effects = w.effects.filter((e) => w.clock - e.from < (e.kind === 'say' ? SAY_MS : EFFECT_MS));
  if (w.over) return play;
  let map = mapOf(w, place);
  let hero = play.walker.at;
  let next = play;

  // The sea: washed off covered ground, slowed in the shallows. Fliers fly over it.
  if (w.wash && next.walker.path.length === 0) w.wash = null;
  if (!w.wash && isSolid(map, cellAt(hero)) && tileUnder(map, hero) === 'water') {
    const shore = shoreOf(map, hero);
    if (shore) {
      w.wash = shore;
      w.dash = null;
      w.chase = false;
      next = { ...next, walker: { at: hero, path: [shore] }, heading: null };
      effect(w, { kind: 'splash', at: hero, from: w.clock });
      hurtHero(w, Math.min(Math.ceil(w.fighter.maxHp * FLOOD_HURT), w.hp - 1), hero);
    }
  } else if (!w.wash && !w.dash && next.walker.path.length > 0) {
    // A walk the water has since cut is planned again round it.
    if (!clearLine(map, hero, next.walker.path[0]!)) {
      next = { ...next, walker: { at: hero, path: walkPath(map, hero, next.walker.path.at(-1)!) } };
    }
  }
  w.wading = !w.wash && wading(tileUnder(map, hero));
  const here = standing(w, place.room);
  for (const foe of here) {
    if (foe.flight) continue;
    if (foe.wash && foe.path.length === 0) foe.wash = null;
    if (!foe.wash && tileUnder(map, foe.at) === 'water') {
      const shore = shoreOf(map, foe.at);
      if (shore) {
        foe.wash = shore;
        foe.path = [shore];
        foe.heavy = null;
        foe.engaged = false;
      }
    } else if (!foe.wash && foe.path.length > 0 && !clearLine(map, foe.at, foe.path[0]!)) {
      foe.path = walkPath(map, foe.at, foe.path.at(-1)!);
    }
    foe.wading = !foe.wash && wading(tileUnder(map, foe.at));
  }

  // A parrot nearby makes a crew's blows come faster.
  const rallies = here.filter((f) => foeKind(f.monster).rally && !held(w, place, f));
  const pace = new Map<Foe, number>();
  for (const foe of here) {
    const kind = foeKind(foe.monster);
    let fastest = 1;
    if (kind.crew) {
      for (const r of rallies) {
        const rally = foeKind(r.monster).rally!;
        if (distance(r.at, foe.at) <= rally.radius) fastest = Math.max(fastest, rally.pace);
      }
    }
    foe.rallied = fastest > 1;
    pace.set(foe, fastest);
  }

  w.blowMs = Math.max(0, w.blowMs - TICK_MS);
  for (const foe of here) {
    if (!foe.aware) continue;
    if (!foe.heavy) {
      // Whole milliseconds, so a rallied blow still lands on a tick.
      foe.blowMs = Math.max(0, foe.blowMs - Math.round(TICK_MS * pace.get(foe)!));
      foe.heavyMs = Math.max(0, foe.heavyMs - TICK_MS);
    }
    if (foeKind(foe.monster).boss && !foe.heavy) foe.volleyMs = Math.max(0, foe.volleyMs - TICK_MS);
  }

  // Heavy attacks land first: where the hero stands at this instant is all that counts.
  for (const foe of here) {
    if (!foe.heavy || foe.heavy.lands > w.clock) continue;
    const t = foe.heavy;
    foe.heavy = null;
    foe.heavyMs = foeKind(foe.monster).heavy!.everyMs;
    land(w, t, map, hero, w.monsters[foe.monster]!);
    if (w.over) return next;
  }
  if (w.volleys.length > 0) {
    const landing = w.volleys.filter((t) => t.lands <= w.clock);
    if (landing.length > 0) {
      w.volleys = w.volleys.filter((t) => t.lands > w.clock);
      // One blow for a volley, however many of its lines he stands in.
      const hit = landing.find((t) => inMark(t, hero));
      for (const t of landing) if (t !== hit) land(w, t, map, { x: -1e6, y: -1e6 }, null);
      if (hit) land(w, hit, map, hero, null);
      if (w.over) return next;
    }
  }

  // A brig's cells: the first open once he is in, each next once the last is beaten.
  let doors = doorPoints.get(place.ground);
  if (!doors) {
    doors = doorsOf(place.ground);
    doorPoints.set(place.ground, doors);
  }
  if (nextWave(w, place, hero, doors)) {
    const wave = w.released[place.room] ?? 0;
    w.released[place.room] = wave + 1;
    for (const cell of place.ground.bars[wave]!)
      effect(w, { kind: 'released', at: centreOf(cell), from: w.clock });
    for (const foe of here) {
      if (foe.wave !== wave) continue;
      foe.aware = true;
      foe.heavyMs = foeKind(foe.monster).heavy?.firstMs ?? 0;
    }
    map = mapOf(w, place);
  }

  for (const foe of here) {
    if (foe.aware || held(w, place, foe)) continue;
    const kind = foeKind(foe.monster);
    if (distance(foe.at, hero) <= kind.notice && inSight(map, foe.at, hero)) {
      foe.aware = true;
      foe.heavyMs = kind.heavy?.firstMs ?? 0;
    }
  }

  for (let i = w.piles.length - 1; i >= 0; i--) {
    const pile = w.piles[i]!;
    if (pile.room === place.room && distance(pile.at, hero) <= PICKUP) {
      pickUp(w, pile);
      w.piles.splice(i, 1);
    }
  }

  // The target: kept while it stands; if it is out of reach and not being
  // chased, whatever is nearest within reach becomes the target instead.
  let target = here.find((f) => f.key === w.target && alive(f)) ?? null;
  if (!target) {
    w.target = null;
    w.chase = false;
  }
  const reachable = (f: Foe): boolean =>
    alive(f) && !held(w, place, f) && inReach(w, map, hero, f);
  if (!target || (!w.chase && !reachable(target))) {
    const near = here
      .filter(reachable)
      .sort((a, b) => distance(a.at, hero) - distance(b.at, hero))[0];
    if (near) {
      target = near;
      w.target = near.key;
      w.chase = false;
    }
  }

  if (target && w.chase && !w.wash) {
    if (reachable(target)) {
      if (next.walker.path.length > 0) next = { ...next, walker: { at: hero, path: [] } };
    } else {
      const slot = chaseTo(w, map, hero, target.at);
      const end = next.walker.path.at(-1);
      if (!end || distance(end, slot) > TILE / 2)
        next = { ...next, walker: { at: hero, path: walkPath(map, hero, slot) } };
    }
  }

  if (target && w.blowMs === 0 && reachable(target) && !w.wash) {
    if (w.fighter.style === 'ranged' && arrowsLeft(w) === 0) {
      // Nothing to shoot: said once a swing's length, not every tick.
      w.blowMs = PLAYER_ATTACK_MS;
      effect(w, { kind: 'empty', at: hero, from: w.clock });
    } else {
      w.blowMs = PLAYER_ATTACK_MS;
      next = { ...next, facing: facingToward(next.facing, hero, target.at.x) };
      strike(w, dice, target, hero, place);
      // A boss falling ends the fight round him at once.
      map = mapOf(w, place);
    }
  }

  for (const foe of here) {
    if (!alive(foe) || !foe.aware || held(w, place, foe) || foe.wash) continue;
    if (foeKind(foe.monster).boss) bossTurn(w, dice, place, foe, hero);
    if (!alive(foe)) continue;
    if (foe.flight) {
      if (fly(w, place, foe, map, hero)) continue;
    }
    const fell = act(w, dice, map, here, foe, hero);
    if (fell) return next;
  }

  if (
    !(place.room in w.opened) &&
    w.foes.some((f) => f.room === place.room) &&
    !roomLocked(w, place.room)
  ) {
    w.opened[place.room] = w.clock;
    if (place.last) {
      // The end: whatever is still on this floor is gathered up with it.
      for (let i = w.piles.length - 1; i >= 0; i--) {
        if (w.piles[i]!.room !== place.room) continue;
        pickUp(w, w.piles[i]!);
        w.piles.splice(i, 1);
      }
      w.over = { why: 'cleared', at: w.clock };
    }
  }
  return next;
}

/** A foe on foot (or a flier come down) doing what it does: a heavy attack, keeping its distance, walking up, a blow. True if the hero fell. */
function act(
  w: Work,
  dice: Dice,
  map: TileMap,
  here: readonly Writable<Foe>[],
  foe: Writable<Foe>,
  hero: Point,
): boolean {
  const kind = foeKind(foe.monster);
  const def = w.monsters[foe.monster]!;
  const d = distance(foe.at, hero);
  if (foe.heavy) return false;
  const heavy = kind.heavy;
  if (
    heavy &&
    foe.heavyMs === 0 &&
    (heavy.fromPhase ?? 0) <= foe.phase &&
    !(heavy.aim === 'sweep' && w.volleys.length > 0) &&
    d <= heavy.range &&
    (heavy.aim === 'self' || inSight(map, foe.at, hero))
  ) {
    const sweep = heavy.aim === 'sweep';
    foe.heavy = {
      at: heavy.aim === 'thrown' ? hero : foe.at,
      radius: heavy.radius,
      shape: sweep ? 'arc' : 'circle',
      ...(sweep
        ? { facing: Math.atan2(hero.y - foe.at.y, hero.x - foe.at.x), spread: heavy.spread }
        : {}),
      from: w.clock,
      lands: w.clock + heavy.warnMs,
      origin: heavy.aim === 'thrown' ? foe.at : null,
      damage: heavy.times * def.maxHit,
      ...(heavy.douse ? { douse: true } : {}),
    };
    foe.path = [];
    foe.engaged = false;
    foe.facing = facingToward(foe.facing, foe.at, hero.x);
    return false;
  }
  if (kind.shy && d < kind.shy && !foe.flight) {
    // Too close: backs off, keeping its distance, while there is room to.
    const away = backOff(map, foe.at, hero, kind.keep - d);
    if (away) {
      const end = foe.path.at(-1);
      if (!end || distance(end, away) > TILE / 2) foe.path = [away];
    }
  } else {
    // Walk up beside the hero, as near as it likes to be, without pushing past one already closer.
    const crowded = here.some(
      (o) => o !== foe && alive(o) && distance(o.at, hero) < d && distance(o.at, foe.at) < 12,
    );
    if (arrived(foe.at, hero, kind.keep) || crowded) {
      foe.path = [];
    } else {
      const slot = kind.keep > BESIDE_MOST ? hero : besideOf(map, foe.at, hero, kind.keep);
      const end = foe.path.at(-1);
      if (!end || distance(end, slot) > TILE / 2) foe.path = walkPath(map, foe.at, slot);
    }
  }
  if (d <= kind.reach) {
    foe.facing = facingToward(foe.facing, foe.at, hero.x);
    if (!foe.engaged) {
      foe.engaged = true;
      foe.blowMs = Math.max(foe.blowMs, WINDUP_MS);
    } else if (foe.blowMs === 0) {
      foe.blowMs = def.speedMs;
      struck(w, dice, def, null, hero);
      if (w.over) return true;
    }
  } else {
    foe.engaged = false;
  }
  return false;
}

/** Somewhere `far` further from `from`, straight away from it or as near that as the room allows. */
function backOff(map: TileMap, at: Point, from: Point, far: number): Point | null {
  const length = Math.max(TILE, Math.min(64, far));
  const away = Math.atan2(at.y - from.y, at.x - from.x);
  for (const turn of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2]) {
    for (const k of [1, 0.6]) {
      const to = {
        x: at.x + Math.cos(away + turn) * length * k,
        y: at.y + Math.sin(away + turn) * length * k,
      };
      if (clearLine(map, at, to)) return to;
    }
  }
  return null;
}

/**
 * A flier's round: sits on its perch out of reach until its time is up, then
 * comes down beside the hero, stays a while (fighting as anything on foot
 * does), and goes back up to its other perch. True while it is in the air or
 * perched, when it does nothing else.
 */
function fly(w: Work, place: Place, foe: Writable<Foe>, map: TileMap, hero: Point): boolean {
  const flies = foeKind(foe.monster).flies!;
  const perches = place.perches ?? [];
  const f = foe.flight!;
  if (f.mode === 'perch') {
    if (w.clock < f.until) return true;
    foe.flight = { ...f, mode: 'in', until: Infinity };
  }
  if (foe.flight!.mode === 'in') {
    const to = besideOf(map, foe.at, hero, foeKind(foe.monster).keep);
    if (foe.path.length === 0 && distance(foe.at, to) <= 2) {
      foe.flight = { ...foe.flight!, mode: 'down', until: w.clock + flies.downMs };
      foe.engaged = false;
      return false;
    }
    foe.path = [to];
    foe.facing = facingToward(foe.facing, foe.at, to.x);
    return true;
  }
  if (foe.flight!.mode === 'down') {
    if (w.clock < foe.flight!.until) return false;
    const perch = perches.length > 0 ? (foe.flight!.perch + 1) % perches.length : 0;
    foe.flight = { mode: 'out', perch, until: Infinity };
    foe.engaged = false;
    foe.path = perches[perch] ? [perches[perch]!] : [];
    return true;
  }
  // Going back up.
  if (foe.path.length === 0) foe.flight = { ...foe.flight!, mode: 'perch', until: w.clock + flies.perchMs };
  return true;
}

/**
 * A boss's own turn before it fights as anything else does: the phase it is
 * in by its hit points (a new one calls the sea in and help with it, or
 * brings the anchor out), and its volleys. A volley is never begun while its
 * sweep is being wound up, nor a sweep while a volley is on its way: one big
 * thing to step out of at a time.
 */
function bossTurn(
  w: Work,
  dice: Dice,
  place: Place,
  foe: Writable<Foe>,
  hero: Point,
): void {
  const rules = foeKind(foe.monster).boss!;
  const def = w.monsters[foe.monster]!;
  const phase = 1 + rules.phases.filter((f) => foe.hp <= f * def.hp).length;
  while (foe.phase < phase) {
    foe.phase += 1;
    if (foe.phase === 2) {
      if (place.ground.ownTide && w.surge === null) w.surge = w.clock;
      const spawns = place.spawns ?? [];
      for (let i = 0; i < rules.calls.count && spawns.length > 0; i++) {
        const helper = w.monsters[rules.calls.monster];
        if (!helper) break;
        const kind = foeKind(rules.calls.monster);
        const at = spawns[i % spawns.length]!;
        w.foes.push({
          ...newFoe(`${place.room} ${w.foes.length}`, place.room, helper.id, at, helper.hp, kind),
          aware: true,
          heavyMs: kind.heavy?.firstMs ?? 0,
        });
      }
      effect(w, { kind: 'say', who: foe.key, line: 'tide', from: w.clock });
    }
    if (foe.phase === 3) {
      foe.heavyMs = foeKind(foe.monster).heavy?.firstMs ?? 0;
      effect(w, { kind: 'say', who: foe.key, line: 'anchor', from: w.clock });
    }
  }
  const volley = rules.volleys.phases[Math.min(foe.phase, rules.volleys.phases.length) - 1]!;
  if (foe.volleyMs > 0 || foe.heavy || w.volleys.length > 0) return;
  foe.volleyMs = volley.everyMs;
  // Lines straight down the room, the first through where the hero stands.
  const { left, right, top, bottom } = floorBounds(place.ground);
  const xs: number[] = [Math.min(right, Math.max(left, hero.x))];
  for (let i = 1; i < volley.lines; i++) {
    for (let tries = 0; tries < 6; tries++) {
      const x = left + dice.next() * (right - left);
      if (xs.every((o) => Math.abs(o - x) >= rules.volleys.gap)) {
        xs.push(Math.round(x));
        break;
      }
    }
  }
  for (const x of xs) {
    w.volleys.push({
      at: { x, y: top },
      radius: rules.volleys.half,
      shape: 'line',
      bottom,
      from: w.clock,
      lands: w.clock + volley.warnMs,
      origin: null,
      damage: rules.volleys.damage,
    });
  }
}

const bounds = new WeakMap<
  Ground,
  { left: number; right: number; top: number; bottom: number }
>();

/** The span of a room's open ground, in art pixels: where a volley's lines can fall. */
export function floorBounds(g: Ground): { left: number; right: number; top: number; bottom: number } {
  let made = bounds.get(g);
  if (!made) {
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    g.tiles.forEach((line, row) =>
      line.forEach((t, col) => {
        if (t === 'rock' || t === 'door' || t === 'prop' || t === 'bars') return;
        left = Math.min(left, col * TILE + TILE / 2);
        right = Math.max(right, col * TILE + TILE / 2);
        top = Math.min(top, row * TILE);
        bottom = Math.max(bottom, row * TILE + TILE);
      }),
    );
    made = { left, right, top, bottom };
    bounds.set(g, made);
  }
  return made;
}

/** Someone keeping `keep` from another stands beside them this far off, level with their feet. */
const BESIDE_MOST = 40;

/**
 * Where to stand to fight someone at `other`, coming from `from`: beside
 * them, level with their feet, on the side already nearest, so two figures
 * never stand one over the other; the far side if the near one is rock or
 * water; their own spot if neither is open.
 */
export function besideOf(map: TileMap, from: Point, other: Point, gap: number): Point {
  const side = from.x < other.x ? -1 : 1;
  for (const s of [side, -side]) {
    const p = { x: other.x + s * gap, y: other.y };
    if (!isSolid(map, cellAt(p)) && clearLine(map, other, p)) return p;
  }
  return other;
}

/** Whether someone at `at` keeping `keep` from `other` has got there: beside it, or nearer than that. */
export function arrived(at: Point, other: Point, keep: number): boolean {
  if (keep > BESIDE_MOST) return distance(at, other) <= keep;
  const dx = Math.abs(at.x - other.x);
  const dy = Math.abs(at.y - other.y);
  return (dy <= 6 && dx <= keep + 3) || distance(at, other) <= keep * 0.6;
}

/** Where the hero walks to strike his target: beside it for a blade; straight at it for a bow. */
function chaseTo(battle: Battle, map: TileMap, hero: Point, target: Point): Point {
  return battle.fighter.style === 'ranged' ? target : besideOf(map, hero, target, MELEE_STAND);
}

/** A walk to exactly `to`: the grid's route, then the last step to the point if nothing is in the way. */
export function walkPath(map: TileMap, from: Point, to: Point): Point[] {
  const path = route(map, from, to);
  const last = path.at(-1) ?? from;
  if ((last.x !== to.x || last.y !== to.y) && clearLine(map, last, to)) path.push(to);
  return path;
}

/** The hero walking for `ms`: carried by the sea, at a step back's pace, wading, or walking. */
function moveHero(w: Work, play: Play, ms: number): Play {
  if (w.wash) {
    // The water takes him where it takes him, whatever he was doing.
    play = { ...play, walker: { at: play.walker.at, path: [w.wash] } };
    return advancePlay(NO_SCENE, play, ms * WASH_PACE);
  }
  const end = play.walker.path.at(-1);
  const dashing = w.dash !== null && !!end && end.x === w.dash.x && end.y === w.dash.y;
  if (w.dash && !dashing) w.dash = null;
  const pace = dashing ? STEP_BACK_PACE : w.wading ? WADE_PACE : 1;
  return advancePlay(NO_SCENE, play, ms * pace);
}

const NO_SCENE = {
  map: { cols: 0, rows: 0, tiles: [], kinds: {} } as TileMap,
  things: [],
};

function moveFoes(w: Work, place: Place, ms: number): void {
  for (const foe of w.foes) {
    if (foe.room !== place.room || !alive(foe) || foe.path.length === 0) continue;
    const kind = foeKind(foe.monster);
    const flying = !!foe.flight && (foe.flight.mode === 'in' || foe.flight.mode === 'out');
    const speed = foe.wash
      ? kind.speed * WASH_PACE
      : flying
        ? kind.flies!.speed
        : kind.speed * (foe.wading ? WADE_PACE : 1);
    const moved = step({ at: foe.at, path: foe.path }, ms, speed);
    if (!foe.wash) {
      if (moved.at.x < foe.at.x - 0.01) foe.facing = 'left';
      else if (moved.at.x > foe.at.x + 0.01) foe.facing = 'right';
    }
    foe.at = moved.at;
    foe.path = moved.path;
  }
}

/**
 * `ms` of the run in `place`, with the hero walking where `play` has him
 * going. Movement is carried exactly up to each tick, the rules act on it,
 * and so on to the end of the time, so a frame of any length comes to the
 * same thing as the same time in many short ones.
 */
export function advanceBattle(
  battle: Battle,
  place: Place,
  play: Play,
  ms: number,
): { battle: Battle; play: Play } {
  if (!(ms > 0)) return { battle, play };
  const w = working(battle);
  const dice = new Dice(w.seed);
  let left = ms;
  let p = play;
  while (left > 0) {
    const next = (Math.floor(w.clock / TICK_MS + 1e-9) + 1) * TICK_MS;
    const toTick = next - w.clock;
    const dt = Math.min(left, toTick);
    if (!w.over) {
      p = moveHero(w, p, dt);
      moveFoes(w, place, dt);
    }
    left -= dt;
    if (dt >= toTick) {
      w.clock = next;
      p = tick(w, dice, place, p);
    } else {
      w.clock += dt;
    }
  }
  w.seed = dice.seed;
  return { battle: w, play: p };
}

/* ----- What the player does ----- */

/** A foe tapped: it becomes the target, and the hero goes after it until it is in reach. */
export function targetFoe(
  battle: Battle,
  place: Place,
  play: Play,
  key: string,
): { battle: Battle; play: Play } {
  const foe = battle.foes.find((f) => f.key === key && f.room === place.room && alive(f));
  if (!foe || battle.over || battle.wash) return { battle, play };
  const map = mapOf(battle, place);
  const hero = play.walker.at;
  const there = inReach(battle, map, hero, foe);
  return {
    battle: { ...battle, target: key, chase: true, dash: null },
    play: {
      ...play,
      walker: {
        at: hero,
        path: there ? [] : walkPath(map, hero, chaseTo(battle, map, hero, foe.at)),
      },
      heading: null,
      open: null,
      facing: there ? facingToward(play.facing, hero, foe.at.x) : play.facing,
    },
  };
}

/** The ground tapped: walk there, still marking the target but no longer going after it. */
export function stopChasing(battle: Battle): Battle {
  return battle.chase || battle.dash ? { ...battle, chase: false, dash: null } : battle;
}

/** Why an ability cannot be used just now, or null if it can. */
export function abilityProblem(
  battle: Battle,
  place: Place,
  play: Play,
  slot: 0 | 1,
): 'cooling' | 'nobody' | 'no_arrows' | 'over' | null {
  if (battle.over) return 'over';
  if (cooldownLeft(battle, slot === 0 ? 'first' : 'second') > 0) return 'cooling';
  const ability = ABILITIES[battle.fighter.style][slot];
  const hero = play.walker.at;
  const here = foesIn(battle, place.room).filter((f) => alive(f) && !held(battle, place, f));
  if (ability.id === 'sweep' && !here.some((f) => distance(f.at, hero) <= SWEEP_REACH))
    return 'nobody';
  if (ability.id === 'double') {
    if (arrowsLeft(battle) === 0) return 'no_arrows';
    const target = here.find((f) => f.key === battle.target);
    if (!target || !inReach(battle, mapOf(battle, place), hero, target)) return 'nobody';
  }
  if (ability.id === 'step_back' && !stepBackTo(battle, place, play)) return 'nobody';
  return null;
}

/** Where a step back takes the hero: straight away from what is nearest, or as near that as the room allows. */
function stepBackTo(battle: Battle, place: Place, play: Play): Point | null {
  const map = mapOf(battle, place);
  const hero = play.walker.at;
  const threats = foesIn(battle, place.room).filter((f) => alive(f) && f.aware);
  const from =
    threats.sort((a, b) => distance(a.at, hero) - distance(b.at, hero))[0]?.at ??
    (play.facing === 'right' ? { x: hero.x + 1, y: hero.y } : { x: hero.x - 1, y: hero.y });
  const d = distance(from, hero) || 1;
  const away = Math.atan2((hero.y - from.y) / d, (hero.x - from.x) / d);
  for (const turn of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2]) {
    for (const length of [STEP_BACK, STEP_BACK * 0.75, STEP_BACK * 0.5]) {
      const to = {
        x: hero.x + Math.cos(away + turn) * length,
        y: hero.y + Math.sin(away + turn) * length,
      };
      if (clearLine(map, hero, to)) return to;
    }
  }
  return null;
}

/** An ability's button pressed. Unusable just now changes nothing. */
export function useAbility(
  battle: Battle,
  place: Place,
  play: Play,
  slot: 0 | 1,
): { battle: Battle; play: Play } {
  if (abilityProblem(battle, place, play, slot)) return { battle, play };
  const ability = ABILITIES[battle.fighter.style][slot];
  const w = working(battle);
  const dice = new Dice(w.seed);
  const hero = play.walker.at;
  let next = play;
  w.ready[slot === 0 ? 'first' : 'second'] = w.clock + ability.cooldownMs;
  const here = standing(w, place.room).filter((f) => !held(w, place, f));
  if (ability.id === 'sweep') {
    effect(w, { kind: 'swing', at: hero, radius: SWEEP_REACH, from: w.clock });
    for (const foe of here)
      if (alive(foe) && distance(foe.at, hero) <= SWEEP_REACH) strike(w, dice, foe, hero, place);
  } else if (ability.id === 'brace') {
    w.braceUntil = w.clock + BRACE_MS;
  } else if (ability.id === 'double') {
    const target = here.find((f) => f.key === w.target)!;
    next = { ...next, facing: facingToward(next.facing, hero, target.at.x) };
    strike(w, dice, target, hero, place);
    if (alive(target) && arrowsLeft(w) > 0) strike(w, dice, target, hero, place);
  } else {
    const to = stepBackTo(battle, place, play)!;
    w.dash = to;
    w.chase = false;
    next = { ...next, walker: { at: hero, path: [to] }, heading: null };
  }
  w.seed = dice.seed;
  return { battle: w, play: next };
}

/** Why the food button does nothing just now, or null if it eats. */
export function foodProblem(battle: Battle): 'none' | 'cooling' | 'full' | 'over' | null {
  if (battle.over) return 'over';
  if (!battle.fighter.food || foodLeft(battle) === 0) return 'none';
  if (cooldownLeft(battle, 'food') > 0) return 'cooling';
  if (battle.hp >= battle.fighter.maxHp) return 'full';
  return null;
}

/** One from the food slot, if one can be eaten now. */
export function eat(battle: Battle, hero: Point): Battle {
  if (foodProblem(battle)) return battle;
  const heals = battle.fighter.food!.heals;
  const hp = Math.min(battle.fighter.maxHp, battle.hp + heals);
  return {
    ...battle,
    hp,
    ready: { ...battle.ready, food: battle.clock + FOOD_MS },
    tally: { ...battle.tally, eaten: battle.tally.eaten + 1 },
    effects: [
      ...battle.effects,
      { kind: 'heal', at: hero, amount: hp - battle.hp, from: battle.clock },
    ],
  };
}

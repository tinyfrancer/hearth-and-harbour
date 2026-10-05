/*
 * Fighting in a dungeon, as pure rules. A battle is a value: time, taps and
 * button presses move it on, and nothing in it is saved while it lasts. When
 * the run ends, `spoilsOf` is what it came to, for `settleRun`.
 *
 * The numbers are lane A's (src/core/combat.ts): the character's ratings, max
 * hit and hit points from `playerCombat`, who hits whom by `hitChance`, the
 * monsters' own rows from the tables, XP by `XP_PER_DAMAGE` and friends. What
 * is the room's own is here: walking, reach, noticing, heavy attacks marked
 * on the ground, abilities, food, and loot left on the floor.
 *
 * Chance comes from dice seeded when the run starts, never the save's. Rules
 * act on a tick every 100 ms of the run's own clock, the same ticks however
 * the frames fall, with movement carried exactly between them; so the same
 * seed and the same taps at the same moments give the same run, and a heavy
 * attack lands on a tick, judged by exactly where the hero stands then.
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
import { foeKind } from './foes';
import { clearLine, route } from './path';
import { advancePlay, facingToward, type Facing, type Play } from './play';
import { step } from './walker';
import { TILE, cellAt, isSolid, type Point, type TileMap } from './tileMap';

/** The rules act every this many ms of the run's clock. Every timer is a whole number of them. */
export const TICK_MS = 100;
/** How near, feet to feet, the hero must be to strike with a weapon in hand. */
export const MELEE_REACH = 24;
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

/** Wide swing: reaches everything this near. */
export const SWEEP_REACH = 32;
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

/** The character as a run reads them when it starts: what the sheet shows, the food and the arrows carried. */
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

/** A monster put in a room, where it stands to begin with. */
export interface Placement {
  readonly room: string;
  readonly monster: string;
  readonly at: Point;
}

/** A heavy attack on its way: the marked circle, and when it lands. */
export interface Telegraph {
  readonly at: Point;
  readonly radius: number;
  /** On the run's clock: when the mark appeared, and when it lands. */
  readonly from: number;
  readonly lands: number;
  /** Where it was thrown from, for one that flies. */
  readonly origin: Point | null;
  readonly damage: number;
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
}

/** Loot on the floor where something fell. */
export interface Pile {
  readonly room: string;
  readonly at: Point;
  readonly loot: Readonly<Record<string, number>>;
  readonly coins: number;
}

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
  | { readonly kind: 'landed'; readonly at: Point; readonly radius: number; readonly from: number }
  | { readonly kind: 'shot'; readonly at: Point; readonly to: Point; readonly from: number }
  | { readonly kind: 'swing'; readonly at: Point; readonly radius: number; readonly from: number }
  | { readonly kind: 'loot'; readonly at: Point; readonly from: number }
  | { readonly kind: 'empty'; readonly at: Point; readonly from: number };

/** What the run has earned so far: paid in by `settleRun` however it ends. */
export interface Tally {
  readonly xp: Readonly<Record<string, number>>;
  readonly loot: Readonly<Record<string, number>>;
  readonly coins: number;
  readonly kills: number;
  readonly eaten: number;
  readonly shot: number;
}

export type Cooldown = 'first' | 'second' | 'food';

export interface Battle {
  readonly fighter: Fighter;
  readonly monsters: Readonly<Record<string, MonsterDef>>;
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
  /** The clock time each button is ready again. */
  readonly ready: Readonly<Record<Cooldown, number>>;
  /** Until when a brace is held, waiting for a heavy blow. */
  readonly braceUntil: number;
  /** Where a step back is taking him, at its quicker pace. */
  readonly dash: Point | null;
  readonly effects: readonly Effect[];
  readonly tally: Tally;
  /** How the fighting ended, and when: the room cleared, or the hero down. */
  readonly over: { readonly why: 'cleared' | 'fell'; readonly at: number } | null;
}

/** Where the battle is being fought: the room, its ground (doors shut or not), and whether it is the last. */
export interface Place {
  readonly room: string;
  readonly map: TileMap;
  readonly last: boolean;
}

type Writable<T> = { -readonly [K in keyof T]: T[K] };

export function startBattle(
  fighter: Fighter,
  monsters: Readonly<Record<string, MonsterDef>>,
  placements: readonly Placement[],
  seed: number,
): Battle {
  const foes: Foe[] = [];
  for (const p of placements) {
    const def = monsters[p.monster];
    if (!def) continue;
    foes.push({
      key: `${p.room} ${foes.length}`,
      room: p.room,
      monster: p.monster,
      at: p.at,
      path: [],
      facing: 'left',
      hp: def.hp,
      aware: false,
      blowMs: 0,
      engaged: false,
      heavyMs: 0,
      heavy: null,
      struckAt: -Infinity,
      diedAt: null,
    });
  }
  return {
    fighter,
    monsters,
    seed: seed >>> 0,
    clock: 0,
    hp: fighter.maxHp,
    blowMs: 0,
    struckAt: -Infinity,
    target: null,
    chase: false,
    foes,
    piles: [],
    opened: {},
    ready: { first: 0, second: 0, food: 0 },
    braceUntil: 0,
    dash: null,
    effects: [],
    tally: { xp: {}, loot: {}, coins: 0, kills: 0, eaten: 0, shot: 0 },
    over: null,
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

/** How far the hero's weapon reaches. */
export function reachOf(fighter: Fighter): number {
  return fighter.style === 'ranged' ? RANGED_REACH : MELEE_REACH;
}

/** Whether nothing that blocks sight (rock; not water, which can be seen and shot across) lies between. */
export function inSight(map: TileMap, a: Point, b: Point): boolean {
  const steps = Math.max(1, Math.ceil(distance(a, b) / 4));
  for (let i = 1; i < steps; i++) {
    const cell = cellAt({ x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps });
    if (isSolid(map, cell) && map.tiles[cell.row]?.[cell.col] !== 'water') return false;
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

/** What a run has come to, as `settleRun` takes it. */
export function spoilsOf(battle: Battle): RunSpoils {
  const { xp, loot, coins, eaten, shot } = battle.tally;
  return { xp, loot, coins, foodEaten: eaten, arrowsUsed: shot };
}

/** A button's state: ready, or how long until it is. */
export function cooldownLeft(battle: Battle, which: Cooldown): number {
  return Math.max(0, battle.ready[which] - battle.clock);
}

/* ----- The working copy: rules edit this, and hand back a new battle ----- */

interface Work extends Writable<
  Omit<Battle, 'foes' | 'tally' | 'ready' | 'piles' | 'effects' | 'opened'>
> {
  opened: Record<string, number>;
  foes: Writable<Foe>[];
  tally: Writable<Tally> & { xp: Record<string, number>; loot: Record<string, number> };
  ready: Record<Cooldown, number>;
  piles: Pile[];
  effects: Effect[];
}

function working(b: Battle): Work {
  return {
    ...b,
    foes: b.foes.map((f) => ({ ...f })),
    tally: { ...b.tally, xp: { ...b.tally.xp }, loot: { ...b.tally.loot } },
    ready: { ...b.ready },
    opened: { ...b.opened },
    piles: [...b.piles],
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
function strike(w: Work, dice: Dice, foe: Writable<Foe>, hero: Point): void {
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
  if (foe.hp === 0) fall(w, dice, foe);
}

/** A foe down: its loot rolled onto the floor where it fell, as an idle kill rolls it. */
function fall(w: Work, dice: Dice, foe: Writable<Foe>): void {
  const def = w.monsters[foe.monster]!;
  foe.diedAt = w.clock;
  foe.heavy = null;
  foe.path = [];
  w.tally.kills += 1;
  const loot: Record<string, number> = {};
  const coins = dice.between(def.coins[0], def.coins[1]);
  for (const { item, min, max } of def.always)
    loot[item] = (loot[item] ?? 0) + dice.between(min, max);
  for (const { item, min, max, oneIn } of def.rare) {
    if (dice.next() * oneIn < 1) loot[item] = (loot[item] ?? 0) + dice.between(min, max);
  }
  if (coins > 0 || Object.keys(loot).length > 0)
    w.piles.push({ room: foe.room, at: foe.at, loot, coins });
  if (w.target === foe.key) {
    w.target = null;
    w.chase = false;
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
  if (dealt <= 0) return;
  w.hp = Math.max(0, w.hp - dealt);
  w.struckAt = w.clock;
  effect(w, { kind: 'hit', at: hero, amount: dealt, on: 'hero', from: w.clock });
  if (w.hp === 0 && !w.over) w.over = { why: 'fell', at: w.clock };
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

/**
 * The rules, once a tick. In this order, every time: timers, heavy attacks
 * landing, noticing, loot, the hero's target and blow, each foe in the order
 * the room lists them, then whether the room is clear.
 */
function tick(w: Work, dice: Dice, place: Place, play: Play): Play {
  w.effects = w.effects.filter((e) => w.clock - e.from < EFFECT_MS);
  if (w.over) return play;
  const hero = play.walker.at;
  const here = standing(w, place.room);
  w.blowMs = Math.max(0, w.blowMs - TICK_MS);
  for (const foe of here) {
    if (!foe.aware) continue;
    if (!foe.heavy) {
      foe.blowMs = Math.max(0, foe.blowMs - TICK_MS);
      foe.heavyMs = Math.max(0, foe.heavyMs - TICK_MS);
    }
  }

  // Heavy attacks land first: where the hero stands at this instant is all that counts.
  for (const foe of here) {
    if (!foe.heavy || foe.heavy.lands > w.clock) continue;
    const t = foe.heavy;
    foe.heavy = null;
    foe.heavyMs = foeKind(foe.monster).heavy!.everyMs;
    effect(w, { kind: 'landed', at: t.at, radius: t.radius, from: w.clock });
    const inside = distance(hero, t.at) < t.radius;
    let damage = inside ? t.damage : 0;
    if (inside && w.braceUntil > w.clock) {
      damage = Math.ceil(damage / 2);
      w.braceUntil = 0;
    }
    struck(w, dice, w.monsters[foe.monster]!, damage, hero);
    if (w.over) return play;
  }

  for (const foe of here) {
    if (foe.aware) continue;
    const kind = foeKind(foe.monster);
    if (distance(foe.at, hero) <= kind.notice && inSight(place.map, foe.at, hero)) {
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
  let target = here.find((f) => f.key === w.target) ?? null;
  if (!target) {
    w.target = null;
    w.chase = false;
  }
  const reachable = (f: Foe): boolean => inReach(w, place.map, hero, f);
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

  let next = play;
  if (target && w.chase) {
    if (reachable(target)) {
      if (next.walker.path.length > 0) next = { ...next, walker: { at: hero, path: [] } };
    } else {
      const end = next.walker.path.at(-1);
      if (!end || distance(end, target.at) > TILE / 2)
        next = { ...next, walker: { at: hero, path: route(place.map, hero, target.at) } };
    }
  }

  if (target && w.blowMs === 0 && reachable(target)) {
    if (w.fighter.style === 'ranged' && arrowsLeft(w) === 0) {
      // Nothing to shoot: said once a swing's length, not every tick.
      w.blowMs = PLAYER_ATTACK_MS;
      effect(w, { kind: 'empty', at: hero, from: w.clock });
    } else {
      w.blowMs = PLAYER_ATTACK_MS;
      next = { ...next, facing: facingToward(next.facing, hero, target.at.x) };
      strike(w, dice, target, hero);
    }
  }

  for (const foe of here) {
    if (!alive(foe) || !foe.aware) continue;
    const kind = foeKind(foe.monster);
    const def = w.monsters[foe.monster]!;
    const d = distance(foe.at, hero);
    if (foe.heavy) continue;
    const heavy = kind.heavy;
    if (
      heavy &&
      foe.heavyMs === 0 &&
      d <= heavy.range &&
      (heavy.aim === 'self' || inSight(place.map, foe.at, hero))
    ) {
      foe.heavy = {
        at: heavy.aim === 'self' ? foe.at : hero,
        radius: heavy.radius,
        from: w.clock,
        lands: w.clock + heavy.warnMs,
        origin: heavy.aim === 'thrown' ? foe.at : null,
        damage: heavy.times * def.maxHit,
      };
      foe.path = [];
      foe.engaged = false;
      foe.facing = facingToward(foe.facing, foe.at, hero.x);
      continue;
    }
    // Walk up to the hero, as near as it likes to be, without pushing past one already closer.
    const crowded = here.some(
      (o) => o !== foe && alive(o) && distance(o.at, hero) < d && distance(o.at, foe.at) < 12,
    );
    if (d <= kind.keep || crowded) {
      foe.path = [];
    } else {
      const end = foe.path.at(-1);
      const there = cellAt(hero);
      if (!end || cellAt(end).col !== there.col || cellAt(end).row !== there.row)
        foe.path = route(place.map, foe.at, hero);
    }
    if (d <= kind.reach) {
      foe.facing = facingToward(foe.facing, foe.at, hero.x);
      if (!foe.engaged) {
        foe.engaged = true;
        foe.blowMs = Math.max(foe.blowMs, WINDUP_MS);
      } else if (foe.blowMs === 0) {
        foe.blowMs = def.speedMs;
        struck(w, dice, def, null, hero);
        if (w.over) return next;
      }
    } else {
      foe.engaged = false;
    }
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

/** The hero walking for `ms`: at a step back's pace while one is under way. */
function moveHero(w: Work, place: Place, play: Play, ms: number): Play {
  const end = play.walker.path.at(-1);
  const dashing = w.dash !== null && !!end && end.x === w.dash.x && end.y === w.dash.y;
  if (w.dash && !dashing) w.dash = null;
  return advancePlay({ map: place.map, things: [] }, play, dashing ? ms * STEP_BACK_PACE : ms);
}

function moveFoes(w: Work, place: Place, ms: number): void {
  for (const foe of w.foes) {
    if (foe.room !== place.room || !alive(foe) || foe.path.length === 0) continue;
    const moved = step({ at: foe.at, path: foe.path }, ms, foeKind(foe.monster).speed);
    if (moved.at.x < foe.at.x - 0.01) foe.facing = 'left';
    else if (moved.at.x > foe.at.x + 0.01) foe.facing = 'right';
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
      p = moveHero(w, place, p, dt);
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
  if (!foe || battle.over) return { battle, play };
  const hero = play.walker.at;
  const there = inReach(battle, place.map, hero, foe);
  return {
    battle: { ...battle, target: key, chase: true, dash: null },
    play: {
      ...play,
      walker: { at: hero, path: there ? [] : route(place.map, hero, foe.at) },
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
  const here = foesIn(battle, place.room).filter(alive);
  if (ability.id === 'sweep' && !here.some((f) => distance(f.at, hero) <= SWEEP_REACH))
    return 'nobody';
  if (ability.id === 'double') {
    if (arrowsLeft(battle) === 0) return 'no_arrows';
    const target = here.find((f) => f.key === battle.target);
    if (!target || !inReach(battle, place.map, hero, target)) return 'nobody';
  }
  if (ability.id === 'step_back' && !stepBackTo(battle, place, play)) return 'nobody';
  return null;
}

/** Where a step back takes the hero: straight away from what is nearest, or as near that as the room allows. */
function stepBackTo(battle: Battle, place: Place, play: Play): Point | null {
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
      if (clearLine(place.map, hero, to)) return to;
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
  const here = standing(w, place.room);
  if (ability.id === 'sweep') {
    effect(w, { kind: 'swing', at: hero, radius: SWEEP_REACH, from: w.clock });
    for (const foe of here) if (distance(foe.at, hero) <= SWEEP_REACH) strike(w, dice, foe, hero);
  } else if (ability.id === 'brace') {
    w.braceUntil = w.clock + BRACE_MS;
  } else if (ability.id === 'double') {
    const target = here.find((f) => f.key === w.target)!;
    next = { ...next, facing: facingToward(next.facing, hero, target.at.x) };
    strike(w, dice, target, hero);
    if (alive(target) && arrowsLeft(w) > 0) strike(w, dice, target, hero);
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

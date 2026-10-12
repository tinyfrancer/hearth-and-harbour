/*
 * A scripted hero who plays Thistlewood Burrow through by a simple policy,
 * the way a careful player would (`grottoBot.ts` is the grotto's): walk out
 * of anything marked on the ground and out of spore clouds, eat below half
 * health, light the room's lanterns while nothing is on him, go after a moth
 * making for a light before anything else, step round behind a cap guard
 * whose cap is to him, and otherwise go for the nearest foe. When a room is
 * clear: what fell, then the door. He never uses an ability. A careless
 * player is the same hero who never lights a lantern (`light: false`).
 *
 * The hero is a stat line, not a save: tier-2 gear is not in the tables yet
 * (lane A's S22), so `tier2` is what its first pass implies (see
 * `docs/status/lane-c.md`, "Balance").
 */
import { effectsOf } from '../../src/core/progress';
import { CONTENT } from '../../src/data';
import {
  alive,
  blocks,
  eat,
  foodProblem,
  held,
  inLight,
  inMark,
  stopChasing,
  targetFoe,
  tendLamp,
  walkPath,
  type Battle,
  type Fighter,
  type Foe,
  type Telegraph,
} from '../../src/scene/battle';
import {
  advanceRun,
  buildDungeon,
  groundNow,
  placeOf,
  startRun,
  type Dungeon,
  type Run,
} from '../../src/scene/dungeon';
import { BURROW } from '../../src/scene/burrow';
import { castOf } from '../../src/scene/dungeons';
import { foeKind } from '../../src/scene/foes';
import { standable, type RoomTile } from '../../src/scene/ground';
import { inCloud, lampFoot, lampStand, type Cloud } from '../../src/scene/light';
import type { RunModifier } from '../../src/scene/modifiers';
import { clearLine } from '../../src/scene/path';
import { DUNGEON, far } from '../../src/scene/dungeonMetrics';
import {
  cellAt,
  centreOf,
  inMap,
  isSolid,
  type Point,
  type TileMap,
} from '../../src/scene/tileMap';

export const BURROW_DUNGEON: Dungeon = buildDungeon(BURROW);
const T = DUNGEON.tile;
export const BURROW_ORDER = ['hollow', 'watch', 'gallery', 'run', 'sett'];

/**
 * A level-`level` hero (Melee, Defence and Vitality) in the best tier-2 gear
 * lane A's first pass implies, as the sheet would read: a salt-iron blade
 * (+12 attack, +11 strength) and armour (helm 12, shield 18, body 26, legs
 * 14: 70), the hunter's charm (+3 attack, +1 strength), and `fish` of a
 * tier-2 fish that heals `heals`.
 */
export function tier2(level = 40, fish = 20, heals = 30): Fighter {
  const attack = 12 + 3;
  const strength = 11 + 1;
  const armour = 12 + 18 + 26 + 14;
  const maxHp = 20 + 4 * (level - 1);
  return {
    style: 'melee',
    skill: 'melee',
    attack: 10 + level + attack,
    defence: 10 + level + armour,
    maxHit: 1 + Math.floor((level + strength) / 2),
    maxHp,
    hp: maxHp,
    food: fish > 0 ? { item: 'cooked_tier2_fish', qty: fish, heals } : null,
    arrows: 0,
  };
}

export function beginBurrow(fighter: Fighter, seed: number, modifier?: string | RunModifier): Run {
  return startRun(BURROW_DUNGEON, {
    fighter,
    monsters: castOf(CONTENT, BURROW.id),
    seed,
    known: Object.keys(CONTENT.items),
    ...(modifier
      ? {
          modifier:
            typeof modifier === 'string'
              ? { id: modifier, effects: effectsOf(CONTENT, modifier) }
              : modifier,
        }
      : {}),
  });
}

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** How he plays: how slow to notice, and whether he lights lanterns at all. */
interface Policy {
  readonly reaction: number;
  readonly light: boolean;
}
let policy: Policy = { reaction: 0, light: true };

/** Every mark on the ground in the room that he has noticed. */
function marksIn(b: Battle, room: string): Telegraph[] {
  return [
    ...b.foes.filter((f) => f.room === room && alive(f) && f.heavy).map((f) => f.heavy!),
    ...b.volleys,
  ].filter((m) => b.clock - m.from >= policy.reaction);
}

/** The clouds in the room he has noticed. */
const cloudsIn = (b: Battle, room: string): Cloud[] =>
  (b.clouds ?? []).filter((c) => c.room === room && b.clock - c.from >= policy.reaction);

const hurtsAt = (marks: readonly Telegraph[], clouds: readonly Cloud[], p: Point): boolean =>
  marks.some((m) => inMark(m, p)) || clouds.some((c) => inCloud(c, p));

/** Where to stand that nothing marked will land on and no cloud hangs over: the nearest such. */
function safeSpot(
  run: Run,
  map: TileMap<RoomTile>,
  marks: readonly Telegraph[],
  clouds: readonly Cloud[],
  prefer?: Point,
): Point | null {
  const hero = run.play.walker.at;
  const ok = (p: Point): boolean => {
    const c = cellAt(p, T);
    if (!inMap(map, c) || isSolid(map, c) || !standable(map.tiles[c.row]![c.col])) return false;
    if (map.tiles[c.row]![c.col] === 'door') return false;
    for (const dx of [0, far(4), -far(4)])
      if (hurtsAt(marks, clouds, { x: p.x + dx, y: p.y })) return false;
    return true;
  };
  if (prefer && ok(prefer) && walkPath(map, hero, prefer).length > 0) return prefer;
  let best: Point | null = null;
  let bestCost = Infinity;
  for (let r = far(10); r <= far(140); r += far(6)) {
    for (let a = 0; a < 24; a++) {
      const t = (a / 24) * Math.PI * 2;
      const p = { x: hero.x + Math.cos(t) * r, y: hero.y + Math.sin(t) * r };
      if (!ok(p)) continue;
      const straight = clearLine(map, hero, p);
      const cost = straight ? r : r * 1.6 + far(20);
      if (!straight && walkPath(map, hero, p).length === 0) continue;
      if (cost < bestCost) {
        best = p;
        bestCost = cost;
      }
    }
    if (best && bestCost <= r) break;
  }
  return best;
}

/** A walk to `to`, unless he is already walking there. */
function walkTo(run: Run, map: TileMap<RoomTile>, to: Point, stop = true): Run {
  const end = run.play.walker.path.at(-1);
  if (end && distance(end, to) <= far(6)) return run;
  return {
    ...run,
    battle: stop ? stopChasing(run.battle!) : run.battle,
    play: {
      ...run.play,
      walker: { at: run.play.walker.at, path: walkPath(map, run.play.walker.at, to) },
      heading: null,
    },
  };
}

/** Behind a guard: on the side it does not face, level with it. */
function behind(map: TileMap<RoomTile>, g: Foe): Point | null {
  const side = g.facing === 'right' ? -1 : 1;
  for (const d of [far(22), far(30), far(16)]) {
    const p = { x: g.at.x + side * d, y: g.at.y };
    const c = cellAt(p, T);
    if (inMap(map, c) && !isSolid(map, c)) return p;
  }
  return null;
}

/** One decision, made every tenth of a second. */
export function decideBurrow(run: Run): Run {
  if (run.finished || run.doorway || !run.battle || run.battle.over) return run;
  const dungeon = BURROW_DUNGEON;
  let b = run.battle;
  const place = placeOf(dungeon, run);
  const map = groundNow(dungeon, run);
  const hero = run.play.walker.at;
  const marks = marksIn(b, run.room);
  const clouds = cloudsIn(b, run.room);
  const here = b.foes.filter((f) => f.room === run.room && alive(f) && !held(b, place, f));

  // Out of anything marked, or a cloud of spores: behind a guard if it is a guard's bash.
  if (hurtsAt(marks, clouds, hero)) {
    const basher = here.find((f) => f.heavy && foeKind(f.monster).guard && inMark(f.heavy, hero));
    const spot = safeSpot(
      run,
      map,
      marks,
      clouds,
      basher ? (behind(map, basher) ?? undefined) : undefined,
    );
    return spot ? walkTo(run, map, spot) : run;
  }

  if (b.hp * 2 < b.fighter.maxHp && !foodProblem(b)) {
    b = eat(b, hero);
    run = { ...run, battle: b };
  }

  // Lighting a lantern: he keeps at it unless something above sends him off.
  if (b.tend) return run;

  // While anything is marked, he goes nowhere near it.
  if (marks.length > 0) {
    const end = run.play.walker.path.at(-1);
    if (b.chase || (end && marks.some((m) => inMark(m, end)))) {
      return {
        ...run,
        battle: stopChasing(b),
        play: { ...run.play, walker: { at: hero, path: [] } },
      };
    }
  }

  const lit = b.lamps?.[run.room] ?? [];
  const lamps = dungeon.rooms[run.room]!.ground.lamps;

  // A moth making for a light, or putting one out: that first.
  if (policy.light && lit.some(Boolean)) {
    const moth = here.find((f) => foeKind(f.monster).seeksLight && f.aware && !f.under);
    if (moth && b.target !== moth.key && marks.length === 0) {
      const aimed = targetFoe(b, place, run.play, moth.key);
      return { ...run, battle: aimed.battle, play: aimed.play };
    }
    if (moth && b.target === moth.key) return run;
  }

  // A lantern to light, while nothing that has seen him is near.
  if (policy.light && marks.length === 0) {
    const near = here.some((f) => f.aware && !f.under && distance(f.at, hero) < far(80));
    const engaged = here.some((f) => f.engaged);
    if (!near && !engaged) {
      const unlit = lamps
        .map((l, i) => ({ i, foot: lampFoot(l.cell), spot: lampStand(map, l.cell, hero) }))
        .filter((l) => !lit[l.i] && l.spot && !hurtsAt(marks, clouds, l.spot))
        .sort((p, q) => distance(p.foot, hero) - distance(q.foot, hero))[0];
      if (unlit && distance(unlit.foot, hero) < far(260)) {
        const tended = tendLamp(b, place, run.play, unlit.i);
        if (tended.battle !== b) return { ...run, battle: tended.battle, play: tended.play };
      }
    }
  }

  // A king under the ground: into a lantern's light, where he cannot come up under him, clear of
  // the lantern itself (he comes up at it, and puts it out).
  if (policy.light && here.some((f) => f.under) && !inLight(b, place, hero)) {
    const spots = lamps
      .flatMap((l, i) => {
        if (!lit[i]) return [];
        const foot = lampFoot(l.cell);
        return [-1, 1].map((side) => ({ x: foot.x + side * far(46), y: foot.y + far(14) }));
      })
      .filter((p) => {
        const c = cellAt(p, T);
        return (
          inMap(map, c) &&
          !isSolid(map, c) &&
          inLight(b, place, p) &&
          !hurtsAt(marks, clouds, p) &&
          walkPath(map, hero, p).length > 0
        );
      })
      .sort((p, q) => distance(p, hero) - distance(q, hero));
    if (spots[0]) return walkTo(run, map, spots[0]);
  }

  // A guard whose cap is to him: round behind it.
  const target = here.find((f) => f.key === b.target);
  if (target && foeKind(target.monster).guard && blocks(b, target, hero) && marks.length === 0) {
    if (distance(target.at, hero) < far(60)) {
      const spot = behind(map, target);
      if (spot && !hurtsAt(marks, clouds, spot)) {
        const end = run.play.walker.path.at(-1);
        if (!end || distance(end, spot) > far(6)) return walkTo(run, map, spot);
        return run;
      }
    }
  }
  // Behind a guard and stopped: go back at it.
  if (
    target &&
    foeKind(target.monster).guard &&
    !blocks(b, target, hero) &&
    !b.chase &&
    run.play.walker.path.length === 0
  ) {
    const aimed = targetFoe(b, place, run.play, target.key);
    return { ...run, battle: aimed.battle, play: aimed.play };
  }

  const reachable = (f: Foe): boolean => alive(f) && !f.under && !held(b, place, f);
  const foes = here.filter(reachable).sort((a, c) => distance(a.at, hero) - distance(c.at, hero));
  const nearest = foes[0];
  if (nearest) {
    if (marks.length > 0) return run;
    const current = b.foes.find((f) => f.key === b.target && alive(f));
    const keep =
      current &&
      reachable(current) &&
      b.chase &&
      distance(current.at, hero) <= distance(nearest.at, hero) + far(16);
    if (!keep) {
      // A guard is gone round, not walked up to from the front.
      if (foeKind(nearest.monster).guard && blocks(b, nearest, hero)) {
        const spot = behind(map, nearest);
        if (spot && !hurtsAt(marks, clouds, spot)) {
          const aimed = targetFoe(b, place, run.play, nearest.key);
          return walkTo({ ...run, battle: { ...aimed.battle, chase: false } }, map, spot, false);
        }
      }
      const aimed = targetFoe(b, place, run.play, nearest.key);
      return { ...run, battle: aimed.battle, play: aimed.play };
    }
    return run;
  }
  if (here.length > 0) {
    // Only what cannot be reached is left (a king under the ground): keep still out of the light.
    return run;
  }
  // The room is clear: what fell, then the way on.
  const pile = b.piles
    .filter(
      (p) =>
        p.room === run.room && distance(walkPath(map, hero, p.at).at(-1) ?? hero, p.at) <= far(12),
    )
    .sort((a, c) => distance(a.at, hero) - distance(c.at, hero))[0];
  const room = dungeon.rooms[run.room]!;
  const onward = room.doors.find((d) => d.to === BURROW_ORDER[BURROW_ORDER.indexOf(run.room) + 1]);
  const goal = pile ? pile.at : onward ? centreOf(onward.cell, T) : null;
  if (!goal) return run;
  const end = run.play.walker.path.at(-1);
  if (!end || distance(end, goal) > far(4) || run.play.walker.path.length === 0) {
    const path = walkPath(map, hero, goal);
    return { ...run, play: { ...run.play, walker: { at: hero, path } } };
  }
  return run;
}

export interface BurrowOutcome {
  readonly cleared: boolean;
  readonly ms: number;
  readonly room: string;
  readonly eaten: number;
  readonly hp: number;
  /** His lowest hit points in the run, and as a share of his whole. */
  readonly lowest: number;
  readonly lowestShare: number;
  readonly kills: number;
  readonly rooms: Readonly<Record<string, number>>;
  /** Lanterns he lit, and lanterns put out (moths, smashes, charges). */
  readonly lit: number;
  readonly snuffed: number;
  readonly hurt: Readonly<Record<string, number>>;
  readonly run: Run;
}

/** The whole Burrow, played through, or until he falls or twenty minutes have gone. */
export function playBurrow(
  fighter: Fighter,
  seed: number,
  options: {
    readonly reactMs?: number;
    readonly light?: boolean;
    readonly modifier?: string | RunModifier;
    /** Called after every step, for tests that look inside a run. */
    readonly each?: (run: Run) => void;
  } = {},
): BurrowOutcome {
  policy = { reaction: options.reactMs ?? 0, light: options.light ?? true };
  let run = beginBurrow(fighter, seed, options.modifier);
  const rooms: Record<string, number> = {};
  const hurt: Record<string, number> = {};
  let roomAt = 0;
  let room = run.room;
  let lowest = run.battle!.hp;
  let lit = 0;
  let snuffed = 0;
  for (let t = 0; t < 20 * 60_000 && !run.finished; t += 100) {
    run = decideBurrow(run);
    const before = run.battle!;
    run = advanceRun(BURROW_DUNGEON, run, run.play, 100);
    const after = run.battle!;
    lowest = Math.min(lowest, after.hp);
    for (const e of after.effects) {
      if (e.from <= before.clock) continue;
      if (e.kind === 'lit') lit += 1;
      if (e.kind === 'snuffed') snuffed += 1;
      if (e.kind !== 'hit' || e.on !== 'hero') continue;
      const cause = after.effects.find((x) => x.from === e.from && x.kind === 'landed');
      const why =
        cause?.kind === 'landed'
          ? cause.mark.shape === 'lane'
            ? 'charge'
            : cause.mark.erupt
              ? 'erupt'
              : cause.mark.spores
                ? 'puff'
                : 'heavy'
          : (after.clouds ?? []).some((c) => c.room === run.room && inCloud(c, run.play.walker.at))
            ? 'spores'
            : 'blow';
      hurt[why] = (hurt[why] ?? 0) + e.amount;
    }
    options.each?.(run);
    if (run.room !== room) {
      rooms[room] = run.ms - roomAt;
      roomAt = run.ms;
      room = run.room;
    }
  }
  rooms[room] = run.ms - roomAt;
  const b = run.battle!;
  return {
    cleared: run.ending === 'cleared',
    ms: run.ms,
    room: run.room,
    eaten: b.tally.eaten,
    hp: b.hp,
    lowest,
    lowestShare: lowest / b.fighter.maxHp,
    kills: b.tally.kills,
    rooms,
    lit,
    snuffed,
    hurt,
    run,
  };
}

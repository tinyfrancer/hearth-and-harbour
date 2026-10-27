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
 * The hero is a character built from the tables (`tier2State`): salt-iron and
 * the red cloak as the level allows, and cooked swordfish, read through
 * `fighterOf` as a run reads a save; the cast is the tables' too.
 */
import type { MonsterDef } from '../../src/core/content';
import { effectsOf } from '../../src/core/progress';
import { newGame, type GameState } from '../../src/core/state';
import { xpForLevel as lvl } from '../../src/core/xp';
import { CONTENT } from '../../src/data';
import {
  alive,
  blocks,
  eat,
  fighterOf,
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

/** What a level-40 hero wears into the Burrow, by item id: full salt-iron and the red cloak. */
export const TIER2_GEAR = [
  'salt_iron_sword',
  'salt_iron_shield',
  'salt_iron_helm',
  'salt_iron_plate',
  'salt_iron_greaves',
  'red_cloak',
] as const;

/**
 * A character at level `level` in Melee, Defence and Vitality, wearing
 * whatever of `TIER2_GEAR` the level allows (each in the slot its row
 * names), with `fish` cooked swordfish: the tables' rows, never a stat line
 * of this file's own.
 */
export function tier2State(level = 40, fish = 20): GameState {
  const skills = { melee: lvl(level), defence: lvl(level), vitality: lvl(level) };
  const equipment: Record<string, { item: string; qty: number }> = {};
  for (const id of TIER2_GEAR) {
    const equip = CONTENT.items[id]?.equip;
    if (!equip) throw new Error(`no row for ${id}`);
    const need = equip.requires;
    if (need && level < need.level) continue;
    equipment[equip.slot] = { item: id, qty: 1 };
  }
  return {
    ...newGame('Bot', 0),
    skills,
    equipment,
    food: fish > 0 ? { item: 'cooked_swordfish', qty: fish } : null,
  };
}

/** That character as the fight reads it (`fighterOf`, the tables' gear and fish). */
export const tier2 = (level = 40, fish = 20): Fighter =>
  fighterOf(tier2State(level, fish), CONTENT);

/** The rows a balance case fights by: the tables' own (`castOf`). */
export const burrowMonsters = (): Readonly<Record<string, MonsterDef>> =>
  castOf(CONTENT, BURROW.id);

export function beginBurrow(
  fighter: Fighter,
  seed: number,
  modifier?: string | RunModifier,
  monsters: Readonly<Record<string, MonsterDef>> = burrowMonsters(),
): Run {
  return startRun(BURROW_DUNGEON, {
    fighter,
    monsters,
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

/** How the next decisions are made (`playBurrow` sets it for each run it plays). */
export function burrowPolicy(reactMs: number, light: boolean): void {
  policy = { reaction: reactMs, light };
}

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

  // Fighting from the light: what is on its way to him is met in a lantern's pool, where he sees
  // it (`light.ts`): he waits there for it, or goes into one near by to wait.
  if (policy.light && marks.length === 0) {
    const coming = here.filter(
      (f) =>
        f.aware &&
        f.path.length > 0 &&
        !f.under &&
        !(f.stuck !== undefined && f.stuck > b.clock) &&
        !foeKind(f.monster).seeksLight &&
        !inLight(b, place, f.at) &&
        distance(f.at, hero) > far(36),
    );
    const lighted = inLight(b, place, hero);
    if (coming.length > 0 && lighted) {
      const current = here.find((f) => f.key === b.target);
      if (current && !inLight(b, place, current.at) && distance(current.at, hero) > far(36))
        return {
          ...run,
          battle: stopChasing(b),
          play: { ...run.play, walker: { at: hero, path: [] } },
        };
      if (!current || !b.chase) {
        const lit2 = here
          .filter((f) => !f.under && inLight(b, place, f.at))
          .sort((p, q) => distance(p.at, hero) - distance(q.at, hero))[0];
        if (lit2) {
          const aimed = targetFoe(b, place, run.play, lit2.key);
          return { ...run, battle: aimed.battle, play: aimed.play };
        }
        return run.play.walker.path.length ? run : run;
      }
    }
    if (coming.length > 0 && !lighted && !here.some((f) => f.engaged)) {
      const spots = lamps
        .flatMap((l, i) => {
          if (!lit[i]) return [];
          const stand = lampStand(map, l.cell, hero);
          if (!stand) return [];
          return [
            stand,
            { x: stand.x - far(24), y: stand.y },
            { x: stand.x + far(24), y: stand.y },
          ];
        })
        .filter((p) => {
          const c = cellAt(p, T);
          return (
            inMap(map, c) &&
            !isSolid(map, c) &&
            inLight(b, place, p) &&
            !hurtsAt(marks, clouds, p) &&
            distance(p, hero) < far(80)
          );
        })
        .sort((p, q) => distance(p, hero) - distance(q, hero));
      if (spots[0] && walkPath(map, hero, spots[0]).length > 0) return walkTo(run, map, spots[0]);
    }
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
  /** Times a blow put out the match as he lit one. */
  readonly interrupted: number;
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
    /** The cast's rows to fight by, in place of the tables' (a measurement of other numbers). */
    readonly monsters?: Readonly<Record<string, MonsterDef>>;
    /** Called after every step, for tests that look inside a run. */
    readonly each?: (run: Run) => void;
  } = {},
): BurrowOutcome {
  policy = { reaction: options.reactMs ?? 0, light: options.light ?? true };
  let run = beginBurrow(fighter, seed, options.modifier, options.monsters);
  const rooms: Record<string, number> = {};
  const hurt: Record<string, number> = {};
  let roomAt = 0;
  let room = run.room;
  let lowest = run.battle!.hp;
  let lit = 0;
  let snuffed = 0;
  let interrupted = 0;
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
      if (e.kind === 'interrupted') interrupted += 1;
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
    interrupted,
    hurt,
    run,
  };
}

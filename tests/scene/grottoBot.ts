/*
 * A scripted hero who plays the grotto through by a simple policy, the way a
 * careful but unimaginative player would: walk out of anything marked on the
 * ground (or about to flood), eat below half health, otherwise go for the
 * nearest foe he can reach; when a room is clear, pick up what fell and go on
 * through the door. He never uses an ability, so a player who does is
 * stronger than him. `grottoRun.test.ts` plays him at two strengths; the
 * cast's numbers in `src/scene/cast.ts` were set by what he showed.
 */
import { newGame, type GameState } from '../../src/core/state';
import { xpForLevel as lvl } from '../../src/core/xp';
import { CONTENT } from '../../src/data';
import {
  alive,
  eat,
  fighterOf,
  foodProblem,
  held,
  inMark,
  inReach,
  stopChasing,
  targetFoe,
  tideOf,
  walkPath,
  type Battle,
  type Foe,
  type Telegraph,
} from '../../src/scene/battle';
import { GROTTO_CAST } from '../../src/scene/cast';
import {
  advanceRun,
  buildDungeon,
  groundNow,
  placeOf,
  startRun,
  type Dungeon,
  type Run,
} from '../../src/scene/dungeon';
import { groundMap, standable, type RoomTile } from '../../src/scene/ground';
import { GROTTO } from '../../src/scene/grotto';
import { clearLine } from '../../src/scene/path';
import { TIDE_WARN_MS, rising } from '../../src/scene/tide';
import {
  cellAt,
  centreOf,
  inMap,
  isSolid,
  type Point,
  type TileMap,
} from '../../src/scene/tileMap';

export const GROTTO_DUNGEON: Dungeon = buildDungeon(GROTTO);
export const ORDER = ['pools', 'store', 'bridge', 'brig', 'cove'];

/**
 * A character at the end of tier 1: levels 19 in Melee, Defence and
 * Vitality, a full set of iron, and a slot of cooked cod.
 */
export function prepared(level = 19, cod = 20): GameState {
  return {
    ...newGame('Bot', 0),
    skills: { melee: lvl(level), defence: lvl(level), vitality: lvl(level) },
    equipment: {
      main_hand: { item: 'iron_sword', qty: 1 },
      off_hand: { item: 'iron_shield', qty: 1 },
      head: { item: 'iron_helmet', qty: 1 },
      body: { item: 'iron_breastplate', qty: 1 },
    },
    food: { item: 'cooked_cod', qty: cod },
  };
}

/** Half that: levels 10, and bronze (what a level-10 character wears), with the same fish. */
export function halfStrength(cod = 20): GameState {
  return {
    ...newGame('Bot', 0),
    skills: { melee: lvl(10), defence: lvl(10), vitality: lvl(10) },
    equipment: {
      main_hand: { item: 'bronze_sword', qty: 1 },
      off_hand: { item: 'bronze_shield', qty: 1 },
      head: { item: 'bronze_helmet', qty: 1 },
      body: { item: 'bronze_breastplate', qty: 1 },
    },
    food: { item: 'cooked_cod', qty: cod },
  };
}

export const MONSTERS = { ...CONTENT.monsters, ...GROTTO_CAST };

export function begin(state: GameState, seed: number, known?: Iterable<string>): Run {
  return startRun(GROTTO_DUNGEON, {
    fighter: fighterOf(state, CONTENT),
    monsters: MONSTERS,
    seed,
    known: known ?? Object.keys(CONTENT.items),
  });
}

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * How long he takes to notice something new, in ms: a person sees a mark and
 * moves a moment later. 0 is a machine; the run's test plays him at a
 * person's pace.
 */
let reaction = 0;

/** Every mark on the ground in the room that he has noticed. */
function marksIn(b: Battle, room: string): Telegraph[] {
  return [
    ...b.foes.filter((f) => f.room === room && alive(f) && f.heavy).map((f) => f.heavy!),
    ...b.volleys,
  ].filter((m) => b.clock - m.from >= reaction);
}

/** Ground that will be under deep water at the next rise, if one is coming and he has noticed it. */
function floodingSoon(run: Run): TileMap<RoomTile> | null {
  const b = run.battle!;
  const place = placeOf(GROTTO_DUNGEON, run);
  const tide = tideOf(b, place);
  if (!rising(tide, b.clock) || !tide.next) return null;
  if (tide.next.at - b.clock > TIDE_WARN_MS - reaction) return null;
  return groundMap(place.ground, {
    level: tide.next.level,
    shut: true,
    released: b.released[run.room] ?? 0,
  });
}

const wet = (map: TileMap<RoomTile> | null, p: Point): boolean => {
  if (!map) return false;
  const c = cellAt(p);
  return !inMap(map, c) || map.tiles[c.row]![c.col] === 'water';
};

/** Where to stand that nothing marked will land on and the sea will not cover: the nearest such. */
function safeSpot(run: Run, map: TileMap<RoomTile>, marks: readonly Telegraph[]): Point | null {
  const hero = run.play.walker.at;
  const soon = floodingSoon(run);
  let best: Point | null = null;
  let bestCost = Infinity;
  for (let r = 10; r <= 112; r += 6) {
    for (let a = 0; a < 24; a++) {
      const t = (a / 24) * Math.PI * 2;
      const p = { x: hero.x + Math.cos(t) * r, y: hero.y + Math.sin(t) * r };
      const c = cellAt(p);
      if (!inMap(map, c) || isSolid(map, c) || !standable(map.tiles[c.row]![c.col])) continue;
      if (map.tiles[c.row]![c.col] === 'door') continue;
      // Clear of every mark by a few pixels, and not about to go under.
      if (
        marks.some(
          (m) =>
            inMark(m, p) || inMark(m, { x: p.x + 4, y: p.y }) || inMark(m, { x: p.x - 4, y: p.y }),
        )
      )
        continue;
      if (wet(soon, p)) continue;
      const straight = clearLine(map, hero, p);
      const cost = straight ? r : r * 1.6 + 20;
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

/** One decision, made every tenth of a second. */
export function decide(run: Run): Run {
  if (run.finished || run.doorway || !run.battle || run.battle.over) return run;
  const dungeon = GROTTO_DUNGEON;
  let b = run.battle;
  const place = placeOf(dungeon, run);
  const map = groundNow(dungeon, run);
  const hero = run.play.walker.at;
  const marks = marksIn(b, run.room);
  const soon = floodingSoon(run);
  if (b.wash) return run;

  // Out of anything marked, or ground about to go under.
  const inDanger = marks.some((m) => inMark(m, hero)) || wet(soon, hero);
  if (inDanger) {
    const spot = safeSpot(run, map, marks);
    if (spot) {
      const end = run.play.walker.path.at(-1);
      if (!end || distance(end, spot) > 8 || b.chase) {
        return {
          ...run,
          battle: stopChasing(b),
          play: {
            ...run.play,
            walker: { at: hero, path: walkPath(map, hero, spot) },
            heading: null,
          },
        };
      }
    }
    return run;
  }

  if (b.hp * 2 < b.fighter.maxHp && !foodProblem(b)) {
    b = eat(b, hero);
    run = { ...run, battle: b };
  }

  // While anything is marked, he goes nowhere near it: no chasing, only striking what is in reach.
  if (marks.length > 0) {
    const end = run.play.walker.path.at(-1);
    if (b.chase || (end && marks.some((m) => inMark(m, end)))) {
      return {
        ...run,
        battle: stopChasing(b),
        play: { ...run.play, walker: { at: hero, path: [] } },
      };
    }
    return run;
  }

  const ranged = b.fighter.style === 'ranged';
  const reachable = (f: Foe): boolean => {
    if (!alive(f) || held(b, place, f)) return false;
    if (f.flight && f.flight.mode !== 'down' && !ranged) return inReach(b, map, hero, f);
    return true;
  };
  const foes = b.foes
    .filter((f) => f.room === run.room && reachable(f))
    .sort((a, c) => distance(a.at, hero) - distance(c.at, hero));
  const nearest = foes[0];
  if (nearest) {
    const current = b.foes.find((f) => f.key === b.target && alive(f));
    const keep =
      current &&
      reachable(current) &&
      b.chase &&
      distance(current.at, hero) <= distance(nearest.at, hero) + 16;
    if (!keep) {
      const aimed = targetFoe(b, place, run.play, nearest.key);
      return { ...run, battle: aimed.battle, play: aimed.play };
    }
    return run;
  }
  if (b.foes.some((f) => f.room === run.room && alive(f))) {
    // Only what cannot be reached is left (a parrot up on its perch, cells not yet open):
    // stand in the middle of the room and let it come.
    const room = dungeon.rooms[run.room]!;
    const middle = centreOf({
      col: Math.floor(room.map.cols / 2),
      row: Math.floor(room.map.rows / 2),
    });
    const end = run.play.walker.path.at(-1);
    if (run.play.walker.path.length === 0 && distance(hero, middle) > 48 && !end) {
      return {
        ...run,
        play: { ...run.play, walker: { at: hero, path: walkPath(map, hero, middle) } },
      };
    }
    return run;
  }
  // The room is clear: what fell, then the way on.
  const pile = b.piles
    .filter(
      (p) => p.room === run.room && distance(walkPath(map, hero, p.at).at(-1) ?? hero, p.at) <= 12,
    )
    .sort((a, c) => distance(a.at, hero) - distance(c.at, hero))[0];
  const room = dungeon.rooms[run.room]!;
  const onward = room.doors.find((d) => d.to === ORDER[ORDER.indexOf(run.room) + 1]);
  const goal = pile ? pile.at : onward ? centreOf(onward.cell) : null;
  if (!goal) return run;
  const end = run.play.walker.path.at(-1);
  if (!end || distance(end, goal) > 4 || run.play.walker.path.length === 0) {
    const path = walkPath(map, hero, goal);
    return { ...run, play: { ...run.play, walker: { at: hero, path } } };
  }
  return run;
}

export interface Outcome {
  readonly cleared: boolean;
  readonly ms: number;
  /** Where the run ended: the room he fell in, or the cove. */
  readonly room: string;
  readonly eaten: number;
  readonly hp: number;
  readonly kills: number;
  /** How long each room took, by id. */
  readonly rooms: Readonly<Record<string, number>>;
  /** Fish eaten in each room. */
  readonly ate: Readonly<Record<string, number>>;
  /** Damage taken, by what did it: ordinary blows, heavy attacks, volleys, the sea. */
  readonly hurt: Readonly<Record<string, number>>;
  readonly run: Run;
}

/** The whole grotto, played through, or until he falls or twenty minutes have gone. */
export function playThrough(
  state: GameState,
  seed: number,
  options: { readonly known?: Iterable<string>; readonly reactMs?: number } = {},
): Outcome {
  reaction = options.reactMs ?? 0;
  let run = begin(state, seed, options.known);
  const rooms: Record<string, number> = {};
  const ate: Record<string, number> = {};
  const hurt: Record<string, number> = {};
  let roomAt = 0;
  let eatenAt = 0;
  let room = run.room;
  for (let t = 0; t < 20 * 60_000 && !run.finished; t += 100) {
    run = decide(run);
    const before = run.battle!;
    run = advanceRun(GROTTO_DUNGEON, run, run.play, 100);
    const after = run.battle!;
    for (const e of after.effects) {
      if (e.kind !== 'hit' || e.on !== 'hero' || e.from <= before.clock) continue;
      const cause = after.effects.find(
        (x) => x.from === e.from && (x.kind === 'splash' || x.kind === 'landed'),
      );
      const why =
        cause?.kind === 'splash'
          ? 'sea'
          : cause?.kind === 'landed'
            ? cause.mark.shape === 'line'
              ? 'volley'
              : `heavy`
            : 'blow';
      hurt[why] = (hurt[why] ?? 0) + e.amount;
    }
    if (run.room !== room) {
      rooms[room] = run.ms - roomAt;
      ate[room] = after.tally.eaten - eatenAt;
      roomAt = run.ms;
      eatenAt = after.tally.eaten;
      room = run.room;
    }
  }
  rooms[room] = run.ms - roomAt;
  const b = run.battle!;
  ate[room] = b.tally.eaten - eatenAt;
  return {
    cleared: run.ending === 'cleared',
    ms: run.ms,
    room: run.room,
    eaten: b.tally.eaten,
    hp: b.hp,
    kills: b.tally.kills,
    rooms,
    ate,
    hurt,
    run,
  };
}

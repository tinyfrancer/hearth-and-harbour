/*
 * A scripted new player in the Tidepool Cave: level 1 in everything, in the
 * linen a first hour of Crafting makes, no weapon, nothing to eat brought.
 * He does what the lessons say, a little slowly (`reactMs` to notice
 * anything new, and as long again to read a lesson), and otherwise what a
 * sensible beginner would: picks up the crate's fish, goes for the nearest
 * thing to fight, walks out of a marked patch of ground, eats when hurt once
 * he has been shown how, and goes on through the door. `caveRun.test.ts`
 * plays him; `brace: false` is the player who never braces.
 */
import type { MonsterDef } from '../../src/core/content';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import {
  alive,
  cooldownLeft,
  eat,
  fighterOf,
  foodProblem,
  held,
  inMark,
  stopChasing,
  targetFoe,
  useAbility,
  walkPath,
  SWEEP_REACH,
  type Telegraph,
} from '../../src/scene/battle';
import { advanceRun, groundNow, placeOf, startRun, type Run } from '../../src/scene/dungeon';
import { castOf, dungeonById, dungeonScene, healsOf } from '../../src/scene/dungeons';
import { DUNGEON, far } from '../../src/scene/dungeonMetrics';
import { standable } from '../../src/scene/ground';
import {
  forgetLessons,
  lessonBlocks,
  shownLesson,
  startLessons,
  stepLessons,
} from '../../src/scene/lessons';
import { clearLine } from '../../src/scene/path';
import { TIDEPOOL_ID } from '../../src/scene/tidepool';
import { cellAt, centreOf, inMap, isSolid, type Point } from '../../src/scene/tileMap';

const T = DUNGEON.tile;
export const CAVE = dungeonById(TIDEPOOL_ID)!;
export const LESSONS = dungeonScene(TIDEPOOL_ID)!.lessons!;
const ORDER = ['landing', 'pools', 'snapper'];

/** A brand-new character in linen: what the novice rows out as. */
export function novice(): GameState {
  return {
    ...newGame('Novice', 0),
    equipment: {
      head: { item: 'linen_hood', qty: 1 },
      body: { item: 'linen_tunic', qty: 1 },
      legs: { item: 'linen_trousers', qty: 1 },
    },
  };
}

export function beginCave(
  state: GameState,
  seed: number,
  lessons = true,
  rows: Readonly<Record<string, MonsterDef>> = {},
): Run {
  const run = startRun(CAVE, {
    fighter: fighterOf(state, CONTENT),
    monsters: { ...castOf(CONTENT, TIDEPOOL_ID), ...rows },
    seed,
    known: Object.keys(CONTENT.items),
    heals: healsOf(CONTENT),
  });
  return lessons ? { ...run, lessons: startLessons(TIDEPOOL_ID, LESSONS, false) } : run;
}

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export interface CaveOptions {
  /** How long he takes to notice anything new, in ms; a lesson takes as long again to read. */
  readonly reactMs: number;
  /** Whether he ever presses Brace (when told to, or after); false walks out every time. */
  readonly brace: boolean;
  /** Whether the lessons are on (a new player) or not. */
  readonly lessons?: boolean;
  /** Rows to fight by in place of the cave's own: for trying other numbers. */
  readonly rows?: Readonly<Record<string, MonsterDef>>;
}

interface Mind {
  /** Ms of the page (not the run) since the lesson showing appeared. */
  lessonFor: number;
  lessonId: string | null;
  /** He has been shown how to fight, to eat, to swing wide, to brace. */
  canFight: boolean;
  canEat: boolean;
  canSweep: boolean;
  canBrace: boolean;
}

/** Ground clear of a mark: the nearest open spot a little outside it, reached in a straight line if possible. */
function outOf(run: Run, mark: Telegraph): Point | null {
  const map = groundNow(CAVE, run);
  const hero = run.play.walker.at;
  let best: Point | null = null;
  let bestCost = Infinity;
  for (let r = far(8); r <= far(100); r += far(6)) {
    for (let a = 0; a < 24; a++) {
      const t = (a / 24) * Math.PI * 2;
      const p = { x: hero.x + Math.cos(t) * r, y: hero.y + Math.sin(t) * r };
      const c = cellAt(p, T);
      if (!inMap(map, c) || isSolid(map, c) || !standable(map.tiles[c.row]![c.col])) continue;
      if (map.tiles[c.row]![c.col] === 'door') continue;
      if (
        inMark(mark, p) ||
        inMark(mark, { x: p.x + far(4), y: p.y }) ||
        inMark(mark, { x: p.x - far(4), y: p.y })
      )
        continue;
      const straight = clearLine(map, hero, p);
      const cost = straight ? r : r * 1.6 + far(20);
      if (cost < bestCost) {
        best = p;
        bestCost = cost;
      }
    }
    if (best && bestCost <= r) break;
  }
  return best;
}

function walk(run: Run, to: Point): Run {
  const map = groundNow(CAVE, run);
  return {
    ...run,
    battle: run.battle && stopChasing(run.battle),
    play: {
      ...run.play,
      walker: { at: run.play.walker.at, path: walkPath(map, run.play.walker.at, to) },
      heading: null,
    },
  };
}

/** One decision, every tenth of a second. */
function decide(run: Run, mind: Mind, o: CaveOptions): Run {
  if (run.finished || run.doorway || !run.battle || run.battle.over) return run;
  let b = run.battle;
  const place = placeOf(CAVE, run);
  const hero = run.play.walker.at;
  const lesson = shownLesson(run.lessons, LESSONS);
  // A lesson showing: read it (twice his reaction), then do what it says.
  if (lesson) {
    if (mind.lessonFor < 2 * o.reactMs) return run;
    switch (lesson.id) {
      case 'eat':
        mind.canEat = true;
        return { ...run, battle: eat(b, hero) };
      case 'sweep':
        mind.canSweep = true;
        {
          const used = useAbility(b, place, run.play, 0);
          return { ...run, battle: used.battle, play: used.play };
        }
      case 'heavy': {
        mind.canBrace = o.brace;
        if (o.brace) {
          const used = useAbility(b, place, run.play, 1);
          if (used.battle !== b) return { ...run, battle: used.battle, play: used.play };
        }
        const mark = markOn(run);
        const spot = mark && outOf(run, mark);
        return spot ? walk(run, spot) : run;
      }
      case 'attack':
      case 'boss': {
        mind.canFight = true;
        const ringed = lesson.ring(CAVE, run);
        const foe =
          ringed?.kind === 'at'
            ? b.foes
                .filter((f) => f.room === run.room && alive(f))
                .sort((x, y) => distance(x.at, ringed.at) - distance(y.at, ringed.at))[0]
            : undefined;
        if (!foe) return run;
        const aimed = targetFoe(b, place, run.play, foe.key);
        return { ...run, battle: aimed.battle, play: aimed.play };
      }
      default:
        break; // walk, door: the plain policy below does what they say.
    }
  }
  const marks = b.foes
    .filter((f) => f.room === run.room && alive(f) && f.heavy)
    .map((f) => f.heavy!);
  const noticed = marks.filter((m) => b.clock - m.from >= o.reactMs);
  const on = noticed.find((m) => inMark(m, hero));
  if (on) {
    if (mind.canBrace && b.braceUntil <= b.clock) {
      const used = useAbility(b, place, run.play, 1);
      if (used.battle !== b) return { ...run, battle: used.battle, play: used.play };
    }
    if (b.braceUntil > b.clock) return run;
    const end = run.play.walker.path.at(-1);
    if (end && !inMark(on, end) && !b.chase) return run;
    const spot = outOf(run, on);
    return spot ? walk(run, spot) : run;
  }
  if (mind.canEat && b.hp * 10 <= b.fighter.maxHp * 4 && !foodProblem(b)) {
    b = eat(b, hero);
    run = { ...run, battle: b };
  }
  const here = b.foes.filter((f) => f.room === run.room && alive(f) && !held(b, place, f));
  if (mind.canSweep && cooldownLeft(b, 'first') === 0) {
    const near = here.filter((f) => f.aware && distance(f.at, hero) <= SWEEP_REACH);
    if (near.length >= 2) {
      const used = useAbility(b, place, run.play, 0);
      if (used.battle !== b) return { ...run, battle: used.battle, play: used.play };
    }
  }
  // While something is marked he keeps out of it: no chasing into it.
  if (noticed.length > 0) {
    const end = run.play.walker.path.at(-1);
    if (b.chase || (end && noticed.some((m) => inMark(m, end))))
      return {
        ...run,
        battle: stopChasing(b),
        play: { ...run.play, walker: { at: hero, path: [] } },
      };
    return run;
  }
  // First the crate, on the way.
  const map = groundNow(CAVE, run);
  const pile = b.piles.find((p) => p.room === run.room);
  if (pile && here.every((f) => !f.aware)) {
    const end = run.play.walker.path.at(-1);
    if (!end || distance(end, pile.at) > far(4)) return walk(run, pile.at);
    return run;
  }
  const nearest = [...here].sort((a, c) => distance(a.at, hero) - distance(c.at, hero))[0];
  if (nearest && mind.canFight) {
    const current = here.find((f) => f.key === b.target);
    if (!current || (!b.chase && distance(current.at, hero) > far(40))) {
      const aimed = targetFoe(b, place, run.play, nearest.key);
      return { ...run, battle: aimed.battle, play: aimed.play };
    }
    return run;
  }
  // Not yet shown how to fight (or nothing left to): on towards the far door, exploring.
  if (nearest && b.target) return run;
  const room = CAVE.rooms[run.room]!;
  const onward = room.doors.find((d) => d.to === ORDER[ORDER.indexOf(run.room) + 1]);
  if (!onward) {
    const end = room.end && centreOf(room.end, T);
    if (end && run.play.walker.path.length === 0 && distance(hero, end) > far(16))
      return walk(run, end);
    return run;
  }
  const goal = centreOf(onward.cell, T);
  const end = run.play.walker.path.at(-1);
  if (!end || distance(end, goal) > far(4)) {
    return { ...run, play: { ...run.play, walker: { at: hero, path: walkPath(map, hero, goal) } } };
  }
  return run;
}

function markOn(run: Run): Telegraph | null {
  const b = run.battle!;
  const hero = run.play.walker.at;
  for (const f of b.foes)
    if (f.room === run.room && alive(f) && f.heavy && inMark(f.heavy, hero)) return f.heavy;
  return null;
}

export interface CaveOutcome {
  readonly cleared: boolean;
  /** Time in the run itself (the run's clock: it stops while a lesson waits). */
  readonly ms: number;
  /** Time on the page, lessons and all. */
  readonly pageMs: number;
  readonly room: string;
  readonly hp: number;
  readonly kills: number;
  readonly braced: number;
  /** The lessons in the order they showed. */
  readonly shown: readonly string[];
  /** The room each lesson first showed in, and his health then. */
  readonly shownIn: Readonly<Record<string, { readonly room: string; readonly hp: number }>>;
  readonly rooms: Readonly<Record<string, number>>;
  readonly lowest: number;
  readonly run: Run;
}

/** The cave, played through as a new player would: the run's clock, and the page's around it. */
export function playCave(state: GameState, seed: number, o: CaveOptions): CaveOutcome {
  forgetLessons();
  let run = beginCave(state, seed, o.lessons ?? true, o.rows);
  const mind: Mind = {
    lessonFor: 0,
    lessonId: null,
    canFight: false,
    canEat: false,
    canSweep: false,
    canBrace: false,
  };
  if (o.lessons === false) {
    mind.canFight = true;
    mind.canEat = true;
    mind.canSweep = true;
    mind.canBrace = o.brace;
  }
  const shown: string[] = [];
  const shownIn: Record<string, { room: string; hp: number }> = {};
  const rooms: Record<string, number> = {};
  let room = run.room;
  let roomAt = 0;
  let pageMs = 0;
  let braced = 0;
  let lowest = run.battle!.hp;
  for (; pageMs < 15 * 60_000 && !run.finished; pageMs += 100) {
    if (run.lessons) {
      const next = stepLessons(run.lessons, LESSONS, CAVE, run);
      if (next !== run.lessons) run = { ...run, lessons: next };
    }
    const lesson = shownLesson(run.lessons, LESSONS);
    if ((lesson?.id ?? null) !== mind.lessonId) {
      mind.lessonId = lesson?.id ?? null;
      mind.lessonFor = 0;
      if (lesson) {
        shown.push(lesson.id);
        shownIn[lesson.id] ??= { room: run.room, hp: run.battle!.hp };
      }
    } else mind.lessonFor += 100;
    const wasBrace = run.battle!.braceUntil;
    run = decide(run, mind, o);
    if (run.battle!.braceUntil > wasBrace) braced += 1;
    const frozen = lessonBlocks(run.lessons, LESSONS);
    run = advanceRun(CAVE, run, run.play, frozen ? 0 : 100);
    lowest = Math.min(lowest, run.battle!.hp);
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
    pageMs,
    room: run.room,
    hp: b.hp,
    kills: b.tally.kills,
    braced,
    shown,
    shownIn,
    rooms,
    lowest,
    run,
  };
}

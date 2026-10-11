/*
 * What a new player is shown the first time each thing is useful, as data:
 * a line of words, a ring on the thing to tap (a place in the room, or one
 * of the buttons), and whether the run waits while it shows. Each lesson
 * says when it is due and when it has been done, both read off the run, so
 * the whole layer is pure and tested without a screen (`stepLessons`).
 *
 * The rules:
 * - A lesson shows the first time it is due, and stays until it is done.
 * - One that `blocks` holds the run still while it shows (no time passes,
 *   so nothing can notice the hero or land on him): it is read, then done.
 *   The player's tap or button press still counts while it waits.
 * - Done is done: it never shows again in the run, nor in a later run this
 *   page (`learned`), nor for a player who has cleared the dungeon before.
 * - Skipping puts every lesson away for the run and the page.
 *
 * Which lesson shows when two are due at once: the first in the list. The
 * cave's rooms are laid out so they come due in the list's order.
 */
import {
  abilityProblem,
  ABILITIES,
  alive,
  bossOf,
  cooldownLeft,
  foodProblem,
  held,
  inMark,
  inSight,
  mapOf,
  SWEEP_REACH,
  type Battle,
  type Foe,
} from './battle';
import { placeOf, type Dungeon, type Run } from './dungeon';
import { DUNGEON } from './dungeonMetrics';
import { foeKind } from './foes';
import { centreOf, type Point } from './tileMap';

const T = DUNGEON.tile;

/** What a lesson rings: a place in the room (art pixels), one of the buttons, or nothing. */
export type LessonRing =
  | { readonly kind: 'at'; readonly at: Point; readonly r: number }
  | { readonly kind: 'button'; readonly which: 'first' | 'second' | 'food' }
  | null;

export interface Lesson {
  readonly id: string;
  /** Shown while the run waits: nothing moves until it is done. */
  readonly blocks: boolean;
  /** Its words, for the run as it is (a bow's buttons are not a blade's). */
  text(dungeon: Dungeon, run: Run): string;
  /** Whether it is useful now; `done` is the lessons already done this run. */
  due(dungeon: Dungeon, run: Run, done: readonly string[]): boolean;
  done(dungeon: Dungeon, run: Run): boolean;
  ring(dungeon: Dungeon, run: Run): LessonRing;
}

/** Where a run's lessons stand: the one showing, those done, and whether they were put away. */
export interface LessonsState {
  readonly shown: string | null;
  readonly done: readonly string[];
  readonly off: boolean;
}

export const NO_LESSONS: LessonsState = { shown: null, done: [], off: true };

/** Lessons done this page, by dungeon and id: a later run does not show them again. */
const learned = new Set<string>();
/** Dungeons whose lessons were skipped this page. */
const skipped = new Set<string>();

/** A run's lessons as it starts: none for a player who has cleared it, or skipped them, this page. */
export function startLessons(
  dungeon: string,
  lessons: readonly Lesson[],
  cleared: boolean,
): LessonsState {
  if (cleared || skipped.has(dungeon) || lessons.length === 0) return NO_LESSONS;
  const done = lessons.filter((l) => learned.has(`${dungeon} ${l.id}`)).map((l) => l.id);
  if (done.length === lessons.length) return NO_LESSONS;
  return { shown: null, done, off: false };
}

/**
 * The lessons after a frame: the one showing is checked for done, and if
 * none is showing, the first due is shown. Unchanged (the same object) when
 * nothing changed.
 */
export function stepLessons(
  state: LessonsState,
  lessons: readonly Lesson[],
  dungeon: Dungeon,
  run: Run,
): LessonsState {
  if (state.off || !run.battle || run.finished) return state;
  let next = state;
  if (next.shown) {
    const lesson = lessons.find((l) => l.id === next.shown);
    if (!lesson || lesson.done(dungeon, run)) {
      learned.add(`${run.dungeon} ${next.shown}`);
      next = { ...next, shown: null, done: [...next.done, next.shown] };
    }
  }
  if (!next.shown && !run.doorway) {
    const due = lessons.find(
      (l) => !next.done.includes(l.id) && l.due(dungeon, run, next.done) && !l.done(dungeon, run),
    );
    if (due) next = { ...next, shown: due.id };
  }
  return next;
}

/** Every lesson put away, for this run and the page. */
export function skipLessons(state: LessonsState, dungeon: string): LessonsState {
  skipped.add(dungeon);
  return { ...state, shown: null, off: true };
}

/** The lesson showing, if any. */
export function shownLesson(
  state: LessonsState | undefined,
  lessons: readonly Lesson[],
): Lesson | null {
  if (!state || state.off || !state.shown) return null;
  return lessons.find((l) => l.id === state.shown) ?? null;
}

/** Whether the run waits on a lesson just now. */
export function lessonBlocks(state: LessonsState | undefined, lessons: readonly Lesson[]): boolean {
  return shownLesson(state, lessons)?.blocks ?? false;
}

/** Forgets what was learned and skipped this page. For tests. */
export function forgetLessons(): void {
  learned.clear();
  skipped.clear();
}

/* ----- Reading a run ----- */

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** The foes standing in the run's room, not behind bars. */
function standing(dungeon: Dungeon, run: Run): Foe[] {
  const b = run.battle!;
  const place = placeOf(dungeon, run);
  return b.foes.filter((f) => f.room === run.room && alive(f) && !held(b, place, f));
}

/** The first foe of the room that is about to be met: aware of him, or nearly near enough to be. */
function meeting(dungeon: Dungeon, run: Run): Foe | null {
  const b = run.battle!;
  const hero = run.play.walker.at;
  const map = mapOf(b, placeOf(dungeon, run));
  return (
    standing(dungeon, run)
      .filter(
        (f) =>
          f.aware ||
          (distance(f.at, hero) <= foeKind(f.monster).notice + 2 * T && inSight(map, f.at, hero)),
      )
      .sort((a, c) => distance(a.at, run.play.walker.at) - distance(c.at, run.play.walker.at))[0] ??
    null
  );
}

/** The mark on the ground that will land on him where he stands, if any. */
function markOn(dungeon: Dungeon, run: Run): Battle['volleys'][number] | null {
  const b = run.battle!;
  const hero = run.play.walker.at;
  for (const f of standing(dungeon, run)) if (f.heavy && inMark(f.heavy, hero)) return f.heavy;
  return b.volleys.find((t) => inMark(t, hero)) ?? null;
}

/** A ring round a foe: about its middle, as wide as it is. */
function ringFoe(f: Foe): LessonRing {
  const box = foeKind(f.monster).box;
  return {
    kind: 'at',
    at: { x: f.at.x, y: f.at.y - box.h / 2 },
    r: Math.max(box.w, box.h) / 2 + 10,
  };
}

const melee = (run: Run): boolean => run.battle!.fighter.style === 'melee';

/** The doors onward from the run's room, open: to rooms not yet cleared. */
function doorsOnward(dungeon: Dungeon, run: Run) {
  const b = run.battle!;
  if (b.foes.some((f) => f.room === run.room && alive(f))) return [];
  return dungeon.rooms[run.room]!.doors.filter((d) => b.opened[d.to] === undefined);
}

/* ----- The cave's lessons ----- */

export const CAVE_LESSONS: readonly Lesson[] = [
  {
    id: 'walk',
    blocks: false,
    text: () => 'Tap the ground to walk there. That crate looks worth a look.',
    due: (dungeon, run) => run.room === dungeon.first,
    done: (dungeon, run) => {
      const start = dungeon.rooms[dungeon.first]!.start!;
      return run.room !== dungeon.first || distance(run.play.walker.at, centreOf(start, T)) > T;
    },
    ring: (_dungeon, run) => {
      const find = run.battle!.piles.find((p) => p.room === run.room);
      return find ? { kind: 'at', at: find.at, r: 16 } : null;
    },
  },
  {
    id: 'attack',
    blocks: true,
    text: (dungeon, run) => {
      const foe = meeting(dungeon, run);
      const name = foe ? run.battle!.monsters[foe.monster]?.name.toLowerCase() : null;
      return `A ${name ?? 'foe'}! Tap it to attack. You keep swinging while it is in reach.`;
    },
    due: (dungeon, run) => meeting(dungeon, run) !== null,
    done: (_dungeon, run) => run.battle!.target !== null,
    ring: (dungeon, run) => {
      const foe = meeting(dungeon, run);
      return foe ? ringFoe(foe) : null;
    },
  },
  {
    id: 'door',
    blocks: false,
    text: () => 'The way on is open. Walk through the door.',
    due: (dungeon, run) => run.room === dungeon.first && doorsOnward(dungeon, run).length > 0,
    done: (dungeon, run) => run.room !== dungeon.first || run.doorway !== null,
    ring: (dungeon, run) => {
      const door = doorsOnward(dungeon, run)[0];
      return door ? { kind: 'at', at: centreOf(door.cell, T), r: 26 } : null;
    },
  },
  {
    id: 'sweep',
    blocks: true,
    text: (_dungeon, run) =>
      melee(run)
        ? 'Surrounded! Wide swing hits everything near you at once.'
        : `Double shot looses two arrows at your target at once.`,
    due: (dungeon, run) => {
      const b = run.battle!;
      const hero = run.play.walker.at;
      const near = standing(dungeon, run).filter(
        (f) => f.aware && distance(f.at, hero) <= SWEEP_REACH,
      );
      return near.length >= 2 && abilityProblem(b, placeOf(dungeon, run), run.play, 0) === null;
    },
    done: (_dungeon, run) => cooldownLeft(run.battle!, 'first') > 0,
    ring: () => ({ kind: 'button', which: 'first' }),
  },
  {
    id: 'heavy',
    blocks: true,
    text: (_dungeon, run) =>
      melee(run)
        ? 'The ground under you is marked: a heavy blow is coming. Walk out of it, or Brace to take half.'
        : 'The ground under you is marked: a heavy blow is coming. Walk out of it, or Step back.',
    due: (dungeon, run) => markOn(dungeon, run) !== null,
    done: (dungeon, run) => {
      const b = run.battle!;
      const mark = markOn(dungeon, run);
      if (!mark || b.braceUntil > b.clock || b.dash) return true;
      const end = run.play.walker.path.at(-1);
      return !!end && !inMark(mark, end);
    },
    // The button, not the mark: a tap on the mark's middle would be a tap on whoever made it,
    // and walking up to them is staying in it. The mark shows itself, filling as it comes.
    ring: () => ({ kind: 'button', which: 'second' }),
  },
  {
    id: 'eat',
    blocks: true,
    text: () => 'You are hurt. Tap Eat to have one of the fish from the crate.',
    // Hurt, once the heavy blow has been shown (so the lessons come in their order); at once if
    // badly hurt; and at the latest at a boss's door, hurt at all, so it is learned before the boss.
    due: (_dungeon, run, done) => {
      const b = run.battle!;
      if (foodProblem(b) !== null) return false;
      const boss = bossOf(b, run.room);
      if (boss && alive(boss)) return true;
      return b.hp * 10 <= b.fighter.maxHp * (done.includes('heavy') ? 6 : 4);
    },
    done: (_dungeon, run) =>
      cooldownLeft(run.battle!, 'food') > 0 || foodProblem(run.battle!) === 'none',
    ring: () => ({ kind: 'button', which: 'food' }),
  },
  {
    id: 'boss',
    blocks: true,
    text: (_dungeon, run) => {
      const boss = bossOf(run.battle!, run.room);
      const name = boss ? run.battle!.monsters[boss.monster]?.name : null;
      return `${name ?? 'The boss'}: slow, but it hits hard. Tap it to fight, and step out when the ground round it is marked.`;
    },
    // As the hero comes into its room, before it is near enough to notice him: after the fish,
    // if there is one to eat.
    due: (_dungeon, run, done) => {
      const b = run.battle!;
      const boss = bossOf(b, run.room);
      return !!boss && alive(boss) && (done.includes('eat') || foodProblem(b) !== null);
    },
    done: (_dungeon, run) => {
      const boss = bossOf(run.battle!, run.room);
      return !boss || !alive(boss) || run.battle!.target === boss.key;
    },
    ring: (_dungeon, run) => {
      const boss = bossOf(run.battle!, run.room);
      return boss ? ringFoe(boss) : null;
    },
  },
];

/** The names of the buttons a lesson can ring, as the fight bar shows them: for words and tests. */
export const BUTTON_NAMES = {
  first: (style: 'melee' | 'ranged') => ABILITIES[style][0].name,
  second: (style: 'melee' | 'ranged') => ABILITIES[style][1].name,
  food: () => 'Eat',
} as const;

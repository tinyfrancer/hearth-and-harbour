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
 * - Done is done: it never shows again in the run, nor in a later run
 *   (remembered in the save where the shell can, else for the page:
 *   `remember.ts`), nor for a player who has cleared the dungeon before.
 * - Skipping puts every lesson away, remembered the same way.
 * - A player who has not done what a lesson says after a while is told it
 *   more plainly (`LESSON_PLAIN_MS`), and after longer still the run goes on
 *   while it shows (`LESSON_GO_ON_MS`): nobody is held for ever.
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
  inFrontOf,
  inLight,
  inMark,
  inSight,
  mapOf,
  SWEEP_REACH,
  type Battle,
  type Foe,
} from './battle';
import { placeOf, type Dungeon, type Run } from './dungeon';
import { DUNGEON } from './dungeonMetrics';
import { bodyMid, foeKind } from './foes';
import { lampFoot } from './light';
import { forgetRemembered, KEYS, remember, remembered } from './remember';
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
  /** The same said more plainly, for a player who has not done it after a while. */
  plain?(dungeon: Dungeon, run: Run): string;
  /** Whether it is useful now; `done` is the lessons already done this run. */
  due(dungeon: Dungeon, run: Run, done: readonly string[]): boolean;
  done(dungeon: Dungeon, run: Run): boolean;
  ring(dungeon: Dungeon, run: Run): LessonRing;
  /**
   * Whether the player has already done what it teaches, by themselves,
   * before it was due (lit a lantern unbidden): it is then learned, as if it
   * had been shown and done, and never shows.
   */
  learnedBy?(dungeon: Dungeon, run: Run): boolean;
  /** Up at least this long (the page's time) however soon it is done: long enough to read. */
  readonly minMs?: number;
}

/** Where a run's lessons stand: the one showing, those done, and whether they were put away. */
export interface LessonsState {
  readonly shown: string | null;
  readonly done: readonly string[];
  readonly off: boolean;
  /** How long the one showing has been up, ms of the page's clock (not the run's: that stops). */
  readonly for?: number;
}

/** A lesson not done after this long is said more plainly. */
export const LESSON_PLAIN_MS = 8000;
/** ...and after this long, one that held the run lets it go on while it shows. */
export const LESSON_GO_ON_MS = 20_000;

/** What a run's lessons are called in what is remembered: short and plain. */
const SHORT_NAMES: Readonly<Record<string, string>> = {
  tidepool_cave: 'cave',
  thistlewood_burrow: 'burrow',
};
const shortName = (dungeon: string): string => SHORT_NAMES[dungeon] ?? dungeon;
const learnedKey = (dungeon: string, id: string): string => KEYS.lesson(shortName(dungeon), id);
const offKey = (dungeon: string): string => KEYS.tipsOff(shortName(dungeon));

export const NO_LESSONS: LessonsState = { shown: null, done: [], off: true };

/** A run's lessons as it starts: none for a player who has cleared it, or put the tips away. */
export function startLessons(
  dungeon: string,
  lessons: readonly Lesson[],
  cleared: boolean,
): LessonsState {
  if (cleared || remembered(offKey(dungeon)) || lessons.length === 0) return NO_LESSONS;
  const done = lessons.filter((l) => remembered(learnedKey(dungeon, l.id))).map((l) => l.id);
  if (done.length === lessons.length) return NO_LESSONS;
  return { shown: null, done, off: false };
}

/**
 * The lessons after a frame of `ms` (the page's time, while the lesson can
 * be seen): the one showing is checked for done, and if none is showing,
 * the first due is shown. Unchanged (the same object) when nothing changed.
 */
export function stepLessons(
  state: LessonsState,
  lessons: readonly Lesson[],
  dungeon: Dungeon,
  run: Run,
  ms = 0,
): LessonsState {
  if (state.off || !run.battle || run.finished) return state;
  let next = state;
  if (next.shown) {
    const lesson = lessons.find((l) => l.id === next.shown);
    if (!lesson || (lesson.done(dungeon, run) && (next.for ?? 0) >= (lesson.minMs ?? 0))) {
      // Done after the run was let go on without it (`LESSON_GO_ON_MS`), it may have been done by
      // the fight, not the player (a rat walking up into his reach makes itself his target): done
      // for this run, but not learned, so a later run shows it again.
      const letGo = !!lesson?.blocks && lessonStage(next) === 2;
      if (!letGo) remember(learnedKey(run.dungeon, next.shown));
      next = { shown: null, done: [...next.done, next.shown], off: next.off };
    } else if (ms > 0) {
      next = { ...next, for: (next.for ?? 0) + ms };
    }
  }
  // Done unbidden before it was ever due: learned, and never shown.
  for (const l of lessons) {
    if (next.done.includes(l.id) || next.shown === l.id || !l.learnedBy?.(dungeon, run)) continue;
    remember(learnedKey(run.dungeon, l.id));
    next = { ...next, done: [...next.done, l.id] };
  }
  if (!next.shown && !run.doorway) {
    const due = lessons.find(
      (l) => !next.done.includes(l.id) && l.due(dungeon, run, next.done) && !l.done(dungeon, run),
    );
    if (due) next = { ...next, shown: due.id, for: 0 };
  }
  return next;
}

/** Every lesson put away, for this run and those after (remembered). */
export function skipLessons(state: LessonsState, dungeon: string): LessonsState {
  remember(offKey(dungeon));
  return { shown: null, done: state.done, off: true };
}

/** How long the lesson showing has been up without being done: 0 plain, 1 said plainly, 2 let go. */
export function lessonStage(state: LessonsState | undefined): 0 | 1 | 2 {
  const t = state?.for ?? 0;
  return t >= LESSON_GO_ON_MS ? 2 : t >= LESSON_PLAIN_MS ? 1 : 0;
}

/** The words of the lesson showing, said more plainly the longer it is not done. */
export function lessonText(
  state: LessonsState | undefined,
  lesson: Lesson,
  dungeon: Dungeon,
  run: Run,
): string {
  const stage = lessonStage(state);
  if (stage === 0 || !lesson.plain) return lesson.text(dungeon, run);
  const plain = lesson.plain(dungeon, run);
  return stage === 2 && lesson.blocks ? `${plain} The fight goes on.` : plain;
}

/** The lesson showing, if any. */
export function shownLesson(
  state: LessonsState | undefined,
  lessons: readonly Lesson[],
): Lesson | null {
  if (!state || state.off || !state.shown) return null;
  return lessons.find((l) => l.id === state.shown) ?? null;
}

/** Whether the run waits on a lesson just now: not once it has waited long enough (`LESSON_GO_ON_MS`). */
export function lessonBlocks(state: LessonsState | undefined, lessons: readonly Lesson[]): boolean {
  return (shownLesson(state, lessons)?.blocks ?? false) && lessonStage(state) < 2;
}

/** Forgets what was learned and put away this page (and the shell remembered through). For tests. */
export function forgetLessons(): void {
  forgetRemembered();
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
    at: { x: f.at.x + bodyMid(f.monster, f.facing), y: f.at.y - box.h / 2 },
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
    plain: (dungeon, run) => {
      const foe = meeting(dungeon, run);
      const name = foe ? run.battle!.monsters[foe.monster]?.name.toLowerCase() : null;
      return `Tap right on the ${name ?? 'foe'}, inside the gold ring, to fight it.`;
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
        : 'Double shot looses two arrows at your target at once.',
    plain: (_dungeon, run) =>
      `Press the glowing ${BUTTON_NAMES.first(run.battle!.fighter.style)} button at the bottom of the screen.`,
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
    // Shown once, so it says once what happens after: he goes back in by himself.
    text: (_dungeon, run) =>
      melee(run)
        ? 'A heavy blow will land on the marked ground. Brace to take half, or walk out. You go back in after.'
        : 'A heavy blow will land on the marked ground. Walk out, or Step back. You go back in after.',
    plain: (_dungeon, run) =>
      melee(run)
        ? 'Press the glowing Brace button, or tap the ground outside the circle.'
        : 'Press the glowing Step back button, or tap the ground outside the circle.',
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
    text: () => 'You are hurt. Tap Eat for one of the fish from the crate.',
    plain: () => 'Press the glowing Eat button at the bottom of the screen.',
    // Hurt, once the heavy blow has been shown (so the lessons come in their order); at once if
    // badly hurt; and at the latest at a boss's door, hurt at all, so it is learned before the boss.
    due: (_dungeon, run, done) => {
      const b = run.battle!;
      if (foodProblem(b) !== null) return false;
      const boss = bossOf(b, run.room);
      if (boss && alive(boss)) return true;
      return b.hp * 4 <= b.fighter.maxHp * (done.includes('heavy') ? 3 : 1.6);
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
      return `${name ?? 'The boss'}: slow, but it hits hard. Tap it to fight; brace or step out when the ground is marked.`;
    },
    plain: (_dungeon, run) => {
      const boss = bossOf(run.battle!, run.room);
      const name = boss ? run.battle!.monsters[boss.monster]?.name : null;
      return `Tap right on ${name ?? 'the boss'}, inside the gold ring, to fight.`;
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

/* ----- The Burrow's hints (wave 19): its light, its moths and its guards, once each ----- */

/** The lanterns in the run's room that do not burn, by the ground's order. */
function unlit(dungeon: Dungeon, run: Run): number[] {
  const lit = run.battle!.lamps?.[run.room];
  if (!lit) return [];
  return dungeon.rooms[run.room]!.ground.lamps.flatMap((_, i) => (lit[i] ? [] : [i]));
}

/** A moth in the room making for a lantern that burns, or putting one out. */
function mothAtWork(dungeon: Dungeon, run: Run): Foe | null {
  const b = run.battle!;
  const lit = b.lamps?.[run.room] ?? [];
  if (!lit.some(Boolean)) return null;
  return (
    standing(dungeon, run).find((f) => foeKind(f.monster).seeksLight && f.aware && !f.under) ?? null
  );
}

/** Whether any lantern written out has been lit (by his hand: nothing else lights one), or he is at it now. */
function litByHand(dungeon: Dungeon, run: Run): boolean {
  const b = run.battle!;
  if (b.tend) return true;
  return Object.entries(b.lamps ?? {}).some(([room, lit]) =>
    (dungeon.rooms[room]?.ground.lamps ?? []).some((l, i) => !l.lit && lit[i]),
  );
}

/** How long the hint about the king's dazzle stays up at the least: longer than the dazzle, to be read. */
export const DAZZLE_HINT_MS = 5000;

/** A boss that burrows, up in the room and dazzled by a lantern, if any. */
function dazzled(dungeon: Dungeon, run: Run): Foe | null {
  const b = run.battle!;
  return (
    standing(dungeon, run).find(
      (f) =>
        !!foeKind(f.monster).boss?.burrow &&
        !f.under &&
        // A burrower is held fast only by a lantern's dazzle.
        f.stuck !== undefined &&
        f.stuck > b.clock,
    ) ?? null
  );
}

/** The cap guards standing in the room. */
const guards = (dungeon: Dungeon, run: Run): Foe[] =>
  standing(dungeon, run).filter((f) => foeKind(f.monster).guard);

export const BURROW_LESSONS: readonly Lesson[] = [
  {
    id: 'lantern',
    blocks: true,
    text: () =>
      'It is dark down here. Tap a lantern to light it: creepers keep still in its light, and you fight better in it.',
    plain: () => 'Tap the lantern in the gold ring. You light it standing beside it.',
    // Once he steps out of the light he came in by, or something comes for him.
    due: (dungeon, run) => {
      const b = run.battle!;
      if (unlit(dungeon, run).length === 0) return false;
      const place = placeOf(dungeon, run);
      return !inLight(b, place, run.play.walker.at) || standing(dungeon, run).some((f) => f.aware);
    },
    done: (dungeon, run) => {
      const b = run.battle!;
      if (b.tend) return true;
      const written = dungeon.rooms[run.room]!.ground.lamps;
      const lit = b.lamps?.[run.room] ?? [];
      return written.some((l, i) => !l.lit && lit[i]) || unlit(dungeon, run).length === 0;
    },
    // Lit one by hand before the hint was due (he walked straight to it): learned already.
    learnedBy: (dungeon, run) => litByHand(dungeon, run),
    ring: (dungeon, run) => {
      const hero = run.play.walker.at;
      const lamps = dungeon.rooms[run.room]!.ground.lamps;
      const near = unlit(dungeon, run).sort(
        (a, c) =>
          distance(lampFoot(lamps[a]!.cell), hero) - distance(lampFoot(lamps[c]!.cell), hero),
      )[0];
      if (near === undefined) return null;
      const foot = lampFoot(lamps[near]!.cell);
      return { kind: 'at', at: { x: foot.x, y: foot.y - 20 }, r: 28 };
    },
  },
  {
    id: 'moth',
    blocks: true,
    text: () =>
      'A lantern moth! It flies to a burning lantern and puts it out. Tap it to stop it; a blow makes it start again.',
    plain: (dungeon, run) => {
      const moth = mothAtWork(dungeon, run);
      const name = moth ? run.battle!.monsters[moth.monster]?.name.toLowerCase() : null;
      return `Tap right on the ${name ?? 'moth'}, inside the gold ring, to go after it.`;
    },
    due: (dungeon, run) => mothAtWork(dungeon, run) !== null,
    done: (dungeon, run) => {
      const b = run.battle!;
      const moth = mothAtWork(dungeon, run);
      return !moth || b.target === moth.key;
    },
    ring: (dungeon, run) => {
      const moth = mothAtWork(dungeon, run);
      if (!moth) return null;
      const ring = ringFoe(moth);
      // Up on the wing, where it is drawn.
      return ring && ring.kind === 'at'
        ? { ...ring, at: { x: ring.at.x, y: ring.at.y - (foeKind(moth.monster).hovers ?? 0) } }
        : ring;
    },
  },
  {
    id: 'guard',
    blocks: false,
    text: (_dungeon, run) =>
      melee(run)
        ? 'Its cap blocks blows from the front. Step round behind it as it bashes, or Brace the bash.'
        : 'Its cap blocks shots from the front. Step round behind it as it bashes, then shoot.',
    // Once a blow of his has glanced off one.
    due: (dungeon, run) =>
      guards(dungeon, run).length > 0 && run.battle!.effects.some((e) => e.kind === 'blocked'),
    done: (dungeon, run) => {
      const b = run.battle!;
      const here = guards(dungeon, run);
      const hero = run.play.walker.at;
      return (
        here.length === 0 ||
        here.some(
          (g) =>
            (g.staggered ?? -Infinity) > b.clock || (b.target === g.key && !inFrontOf(g, hero)),
        )
      );
    },
    ring: (dungeon, run) => {
      const b = run.battle!;
      const target = guards(dungeon, run).find((g) => g.key === b.target);
      if (melee(run) && cooldownLeft(b, 'second') === 0) return { kind: 'button', which: 'second' };
      return target ? ringFoe(target) : null;
    },
  },
  {
    // Why the king came up where he did, and what it is worth: told the first time it happens.
    id: 'dazzle',
    blocks: false,
    minMs: DAZZLE_HINT_MS,
    text: () =>
      'He came up under the lantern you stood by, and its light has dazzled him: strike while he reels! Under the ground, he cannot see you in the light.',
    due: (dungeon, run) => dazzled(dungeon, run) !== null,
    done: (dungeon, run) => dazzled(dungeon, run) === null,
    ring: (dungeon, run) => {
      const king = dazzled(dungeon, run);
      return king ? ringFoe(king) : null;
    },
  },
];

/** The names of the buttons a lesson can ring, as the fight bar shows them: for words and tests. */
export const BUTTON_NAMES = {
  first: (style: 'melee' | 'ranged') => ABILITIES[style][0].name,
  second: (style: 'melee' | 'ranged') => ABILITIES[style][1].name,
  food: () => 'Eat',
} as const;

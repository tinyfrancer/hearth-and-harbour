import { beforeEach, describe, expect, it } from 'vitest';
import { advanceRun, type Run } from '../../src/scene/dungeon';
import { targetFoe, useAbility } from '../../src/scene/battle';
import { placeOf } from '../../src/scene/dungeon';
import {
  forgetLessons,
  LESSON_GO_ON_MS,
  LESSON_PLAIN_MS,
  lessonBlocks,
  lessonStage,
  lessonText,
  NO_LESSONS,
  shownLesson,
  skipLessons,
  startLessons,
  stepLessons,
} from '../../src/scene/lessons';
import { TIDEPOOL_ID } from '../../src/scene/tidepool';
import { rememberingIn, rememberWith } from '../../src/scene/remember';
import { beginCave, CAVE, LESSONS, novice } from './caveBot';

// The cave's lessons, one at a time: each shows the first time it is useful,
// a lesson that waits holds the run still until it is done, done is never
// shown again (this run, or a later one this page), and they can be put away.

beforeEach(() => forgetLessons());

const step = (run: Run): Run => ({
  ...run,
  lessons: stepLessons(run.lessons!, LESSONS, CAVE, run),
});

describe('the cave’s lessons', () => {
  it('starts with walking, which does not hold the run, and is done by walking', () => {
    let run = step(beginCave(novice(), 1));
    expect(run.lessons!.shown).toBe('walk');
    expect(lessonBlocks(run.lessons, LESSONS)).toBe(false);
    const ring = shownLesson(run.lessons, LESSONS)!.ring(CAVE, run);
    // The ring is on the crate's fish.
    expect(ring).toMatchObject({ kind: 'at', at: run.battle!.piles[0]!.at });
    const to = { x: run.play.walker.at.x + 96, y: run.play.walker.at.y };
    run = { ...run, play: { ...run.play, walker: { at: run.play.walker.at, path: [to] } } };
    run = advanceRun(CAVE, run, run.play, 1500);
    run = step(run);
    expect(run.lessons!.done).toEqual(['walk']);
  });

  it('holds the run still at the first foe until it is tapped: nothing moves meanwhile', () => {
    let run = step(beginCave(novice(), 1));
    // Walk to within sight of the rat.
    const rat = run.battle!.foes.find((f) => f.room === 'landing')!;
    run = {
      ...run,
      play: { ...run.play, walker: { at: { x: rat.at.x - 140, y: rat.at.y }, path: [] } },
    };
    run = step(step(run));
    expect(run.lessons!.shown).toBe('attack');
    expect(lessonBlocks(run.lessons, LESSONS)).toBe(true);
    // While it waits, the view gives the run no time: the rat has not noticed him.
    expect(run.battle!.foes.find((f) => f.key === rat.key)!.aware).toBe(false);
    const aimed = targetFoe(run.battle!, placeOf(CAVE, run), run.play, rat.key);
    run = step({ ...run, battle: aimed.battle, play: aimed.play });
    expect(run.lessons!.done).toContain('attack');
    expect(run.lessons!.shown).toBeNull();
  });

  it('is never shown again once done, in this run or a later one, and not at all to a player who cleared it', () => {
    let run = step(beginCave(novice(), 1));
    run = { ...run, play: { ...run.play, walker: { at: { x: 400, y: 120 }, path: [] } } };
    run = step(run);
    expect(run.lessons!.done).toContain('walk');
    // A second run this page starts with walking done.
    expect(startLessons(TIDEPOOL_ID, LESSONS, false).done).toContain('walk');
    expect(startLessons(TIDEPOOL_ID, LESSONS, true)).toEqual(NO_LESSONS);
  });

  it('can be put away for the run and the page', () => {
    const run = step(beginCave(novice(), 1));
    const off = skipLessons(run.lessons!, TIDEPOOL_ID);
    expect(off).toMatchObject({ shown: null, off: true });
    expect(stepLessons(off, LESSONS, CAVE, run)).toBe(off);
    expect(startLessons(TIDEPOOL_ID, LESSONS, false)).toEqual(NO_LESSONS);
  });

  it('rings the button a lesson is about: Wide swing for a crowd', () => {
    const lesson = LESSONS.find((l) => l.id === 'sweep')!;
    const run = beginCave(novice(), 1);
    expect(lesson.ring(CAVE, run)).toEqual({ kind: 'button', which: 'first' });
    // Done once pressed (its cooldown running).
    const used = useAbility(run.battle!, placeOf(CAVE, run), run.play, 0);
    expect(lesson.done(CAVE, { ...run, battle: used.battle })).toBe(used.battle !== run.battle);
  });

  it('is remembered in the save through the shell, so a reload does not teach it again', () => {
    const store = new Set<string>();
    const shell = {
      remembered: (k: string) => store.has(k),
      remember: (k: string) => void store.add(k),
    };
    rememberWith(shell);
    expect(rememberingIn()).toBe('save');
    let run = step(beginCave(novice(), 1));
    run = { ...run, play: { ...run.play, walker: { at: { x: 400, y: 120 }, path: [] } } };
    run = step(run);
    expect([...store]).toEqual(['cave.lesson.walk']);
    // A reload: the page forgets, the save keeps.
    forgetLessons();
    rememberWith({
      remembered: (k: string) => store.has(k),
      remember: (k: string) => void store.add(k),
    });
    expect(startLessons(TIDEPOOL_ID, LESSONS, false).done).toEqual(['walk']);
    skipLessons(startLessons(TIDEPOOL_ID, LESSONS, false), TIDEPOOL_ID);
    expect(store.has('cave.tips.off')).toBe(true);
    forgetLessons();
    rememberWith({ remembered: (k: string) => store.has(k) });
    expect(startLessons(TIDEPOOL_ID, LESSONS, false)).toEqual(NO_LESSONS);
  });

  it('falls back to the page for a shell that cannot remember', () => {
    rememberWith({});
    expect(rememberingIn()).toBe('page');
    let run = step(beginCave(novice(), 1));
    run = { ...run, play: { ...run.play, walker: { at: { x: 400, y: 120 }, path: [] } } };
    step(run);
    expect(startLessons(TIDEPOOL_ID, LESSONS, false).done).toEqual(['walk']);
  });

  it('says it more plainly after a while, and then lets the run go on while it shows', () => {
    let run = step(beginCave(novice(), 1));
    const rat = run.battle!.foes.find((f) => f.room === 'landing')!;
    run = {
      ...run,
      play: { ...run.play, walker: { at: { x: rat.at.x - 140, y: rat.at.y }, path: [] } },
    };
    run = step(step(run));
    const lesson = shownLesson(run.lessons, LESSONS)!;
    expect(lesson.id).toBe('attack');
    const first = lessonText(run.lessons, lesson, CAVE, run);
    // Only the page's time while it shows counts; a frame of nothing changes nothing.
    const wait = (r: Run, ms: number): Run => {
      for (let t = 0; t < ms; t += 100)
        r = { ...r, lessons: stepLessons(r.lessons!, LESSONS, CAVE, r, 100) };
      return r;
    };
    run = wait(run, LESSON_PLAIN_MS - 100);
    expect(lessonStage(run.lessons)).toBe(0);
    expect(lessonBlocks(run.lessons, LESSONS)).toBe(true);
    run = wait(run, 100);
    expect(lessonStage(run.lessons)).toBe(1);
    const plainer = lessonText(run.lessons, lesson, CAVE, run);
    expect(plainer).not.toBe(first);
    expect(plainer).toContain('dock rat');
    expect(lessonBlocks(run.lessons, LESSONS)).toBe(true);
    run = wait(run, LESSON_GO_ON_MS - LESSON_PLAIN_MS);
    expect(lessonStage(run.lessons)).toBe(2);
    // Still shown, still to be done, but nothing is held.
    expect(shownLesson(run.lessons, LESSONS)!.id).toBe('attack');
    expect(lessonBlocks(run.lessons, LESSONS)).toBe(false);
    expect(lessonText(run.lessons, lesson, CAVE, run)).toMatch(/goes on/);
    // Done, the next one starts its own wait from nothing.
    const aimed = targetFoe(run.battle!, placeOf(CAVE, run), run.play, rat.key);
    run = step({ ...run, battle: aimed.battle, play: aimed.play });
    expect(run.lessons!.done).toContain('attack');
    expect(run.lessons!.for ?? 0).toBe(0);
  });

  it('has plainer words for every lesson that holds the run', () => {
    for (const l of LESSONS.filter((x) => x.blocks)) expect(l.plain, l.id).toBeDefined();
  });
});

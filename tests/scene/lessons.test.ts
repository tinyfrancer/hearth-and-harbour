import { beforeEach, describe, expect, it } from 'vitest';
import { advanceRun, type Run } from '../../src/scene/dungeon';
import { targetFoe, useAbility } from '../../src/scene/battle';
import { placeOf } from '../../src/scene/dungeon';
import {
  forgetLessons,
  lessonBlocks,
  NO_LESSONS,
  shownLesson,
  skipLessons,
  startLessons,
  stepLessons,
} from '../../src/scene/lessons';
import { TIDEPOOL_ID } from '../../src/scene/tidepool';
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
});

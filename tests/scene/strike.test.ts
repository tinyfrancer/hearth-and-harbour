import { describe, expect, it } from 'vitest';
import { inReach, mapOf, type Battle } from '../../src/scene/battle';
import { advanceRun, placeOf, type Run } from '../../src/scene/dungeon';
import {
  HERO_STRIKE,
  heroStrikeFrame,
  heroStruckAt,
  type StrikeTiming,
} from '../../src/scene/fightArt';
import { begin, decide, GROTTO_DUNGEON, prepared } from './grottoBot';

// The hero's strike, drawn from the fight's state: its blow frame shows on the very
// millisecond the blow falls, however the frames fall, and nothing in the fight moves.

/** Whether his next blow is coming: a target standing in his reach. */
function coming(run: Run): boolean {
  const b = run.battle!;
  const target = b.foes.find((f) => f.key === b.target);
  if (!target) return false;
  const place = placeOf(GROTTO_DUNGEON, run);
  return inReach(b, mapOf(b, place), run.play.walker.at, target);
}

const timings: StrikeTiming[] = [
  HERO_STRIKE,
  { frames: 4, hit: 2, frameMs: 70 },
  { frames: 5, hit: 3, frameMs: 60 },
  { frames: 3, hit: 1, frameMs: 90 },
];

describe('the hero’s strike', () => {
  for (const timing of timings)
    it(`shows its blow frame exactly as each blow falls (${timing.frames} frames, the blow ${timing.hit})`, () => {
      let run = begin(prepared(), 4);
      let blows = 0;
      let wound = 0;
      let lastFrame: number | null = null;
      for (let t = 0; t < 90_000 && !run.finished; t += 10) {
        if (t % 100 === 0) run = decide(run);
        const before: Battle | null = run.battle;
        run = advanceRun(GROTTO_DUNGEON, run, run.play, 10);
        const b = run.battle!;
        const frame = heroStrikeFrame(b, coming(run), timing);
        if (heroStruckAt(b) === b.clock && before && heroStruckAt(before) !== b.clock) {
          blows++;
          expect(frame).toBe(timing.hit);
          // Led up to it: the frame before the blow was the one before the blow frame.
          if (lastFrame !== null && lastFrame < timing.hit) {
            wound++;
            expect(lastFrame).toBe(timing.hit - 1);
          }
        }
        if (frame !== null) {
          expect(frame).toBeGreaterThanOrEqual(0);
          expect(frame).toBeLessThan(timing.frames);
        }
        lastFrame = frame;
      }
      expect(blows).toBeGreaterThan(10);
      // Nearly every blow is wound up to (only one struck the moment a target came in reach is not).
      expect(wound).toBeGreaterThan(blows * 0.6);
    });

  it('is the same however the frames fall', () => {
    const timing = timings[0]!;
    let fine = begin(prepared(), 6);
    let coarse = fine;
    const seen: (number | null)[] = [];
    const seenCoarse: (number | null)[] = [];
    for (let t = 0; t < 30_000; t += 100) {
      fine = decide(fine);
      coarse = decide(coarse);
      for (let k = 0; k < 10; k++) fine = advanceRun(GROTTO_DUNGEON, fine, fine.play, 10);
      coarse = advanceRun(GROTTO_DUNGEON, coarse, coarse.play, 100);
      seen.push(heroStrikeFrame(fine.battle!, coming(fine), timing));
      seenCoarse.push(heroStrikeFrame(coarse.battle!, coming(coarse), timing));
    }
    expect(seen).toEqual(seenCoarse);
    expect(seen.some((f) => f !== null)).toBe(true);
  });
});

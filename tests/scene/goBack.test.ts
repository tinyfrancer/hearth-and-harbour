import { describe, expect, it } from 'vitest';
import {
  RETURN_MS,
  alive,
  inMark,
  stopChasing,
  targetFoe,
  useAbility,
  walkPath,
  type Foe,
} from '../../src/scene/battle';
import { advanceRun, groundNow, placeOf, type Run } from '../../src/scene/dungeon';
import { startPlay } from '../../src/scene/play';
import type { Point } from '../../src/scene/tileMap';
import { beginCave, CAVE, novice } from './caveBot';
import * as bot from './grottoBot';

// Going back in after stepping out of a heavy blow (`RETURN_MS`, `stopChasing`
// in battle.ts). The rule: a walk ordered while the hero stands in a mark,
// with a foe to fight, is getting out of the way; once nothing marked is left
// in the room and RETURN_MS has gone by, he goes after that foe again by
// himself. Any order of the player's before then is what happens instead; a
// walk ordered anywhere else is an order of its own, and he is not taken back.

const boss = (run: Run): Foe => run.battle!.foes.find((f) => f.monster === 'old_snapper')!;

/** The snapper's pool, the hero beside the turtle and fighting it, nothing else about. */
function atTheSnapper(seed = 3): Run {
  const run = beginCave(novice(), seed, false);
  const snapper = boss(run);
  const start: Point = { x: snapper.at.x - 60, y: snapper.at.y };
  const there: Run = {
    ...run,
    room: 'snapper',
    play: { ...startPlay(start), facing: 'right' },
    // Plenty of health, so the test is about where he goes, not whether he lasts.
    battle: { ...run.battle!, fighter: { ...run.battle!.fighter, maxHp: 99 }, hp: 99 },
  };
  const aimed = targetFoe(there.battle!, placeOf(CAVE, there), there.play, snapper.key);
  return { ...there, battle: aimed.battle, play: aimed.play };
}

/** On until the snapper's slam is marked (the hero fighting all the while). */
function untilMarked(run: Run): Run {
  for (let t = 0; t < 20_000 && !boss(run).heavy; t += 100)
    run = advanceRun(CAVE, run, run.play, 100);
  expect(boss(run).heavy).not.toBeNull();
  return run;
}

/** The ground tapped at `to`: what the view does with a tap that is not on a foe. */
function tapGround(run: Run, to: Point): Run {
  const map = groundNow(CAVE, run);
  return {
    ...run,
    battle: stopChasing(run.battle!),
    play: {
      ...run.play,
      walker: { at: run.play.walker.at, path: walkPath(map, run.play.walker.at, to) },
    },
  };
}

describe('going back in after stepping out of a heavy blow', () => {
  it('a player who steps out and then touches nothing is fighting again soon after the blow lands', () => {
    let run = untilMarked(atTheSnapper());
    const mark = boss(run).heavy!;
    expect(inMark(mark, run.play.walker.at)).toBe(true);
    const snapper = boss(run);
    run = tapGround(run, { x: snapper.at.x - 140, y: snapper.at.y });
    // Out of it in time, and nothing struck while out.
    while (run.battle!.clock < mark.lands) run = advanceRun(CAVE, run, run.play, 100);
    expect(inMark(mark, run.play.walker.at)).toBe(false);
    expect(run.battle!.back?.key).toBe(snapper.key);
    // No input at all from here: within RETURN_MS and a walk back he is striking it again.
    const landed = run.battle!.clock;
    let struckAt: number | null = null;
    let swings = 0;
    for (let t = 0; t < 6000 && struckAt === null; t += 100) {
      const before = run.battle!.clock;
      run = advanceRun(CAVE, run, run.play, 100);
      const b = run.battle!;
      const fresh = b.effects.filter(
        (e) => e.from > before && (e.kind === 'hit' || e.kind === 'miss') && e.on === 'foe',
      );
      swings += fresh.length;
      if (fresh.length) struckAt = b.clock;
    }
    expect(swings).toBeGreaterThan(0);
    expect(struckAt! - landed).toBeGreaterThanOrEqual(RETURN_MS);
    expect(struckAt! - landed).toBeLessThan(RETURN_MS + 3500);
    expect(run.battle!.target).toBe(snapper.key);
    expect(run.battle!.chase).toBe(true);
    expect(run.battle!.back).toBeUndefined();
  });

  it('after Step back too, for a bow', () => {
    let run = atTheSnapper();
    run = {
      ...run,
      battle: {
        ...run.battle!,
        fighter: { ...run.battle!.fighter, style: 'ranged', arrows: 50 },
      },
    };
    run = untilMarked(run);
    expect(inMark(boss(run).heavy!, run.play.walker.at)).toBe(true);
    const stepped = useAbility(run.battle!, placeOf(CAVE, run), run.play, 1);
    expect(stepped.battle).not.toBe(run.battle);
    expect(stepped.battle.back?.key).toBe(boss(run).key);
  });

  it('a player who taps elsewhere once out of the way is not taken back', () => {
    let run = untilMarked(atTheSnapper());
    const mark = boss(run).heavy!;
    const snapper = boss(run);
    run = tapGround(run, { x: snapper.at.x - 140, y: snapper.at.y });
    for (let t = 0; t < 1200; t += 100) run = advanceRun(CAVE, run, run.play, 100);
    expect(inMark(mark, run.play.walker.at)).toBe(false);
    // A second tap, out of the mark: an order of its own.
    const away = { x: snapper.at.x - 200, y: snapper.at.y + 48 };
    run = tapGround(run, away);
    for (let t = 0; t < 8000; t += 100) run = advanceRun(CAVE, run, run.play, 100);
    expect(run.battle!.back).toBeUndefined();
    expect(run.battle!.chase).toBe(false);
    expect(Math.hypot(run.play.walker.at.x - away.x, run.play.walker.at.y - away.y)).toBeLessThan(
      2,
    );
    expect(alive(boss(run))).toBe(true);
  });

  it('a walk ordered with nothing marked under him is an order, never a step out', () => {
    const run = atTheSnapper();
    expect(boss(run).heavy).toBeNull();
    let walked = tapGround(run, { x: boss(run).at.x - 160, y: boss(run).at.y });
    walked = advanceRun(CAVE, walked, walked.play, 100);
    expect(walked.battle!.back).toBeUndefined();
  });

  it('tapping a foe in the meantime is that order: the one tapped is the target', () => {
    let run = untilMarked(atTheSnapper());
    const snapper = boss(run);
    run = tapGround(run, { x: snapper.at.x - 140, y: snapper.at.y });
    run = advanceRun(CAVE, run, run.play, 100);
    expect(run.battle!.back).toBeDefined();
    const aimed = targetFoe(run.battle!, placeOf(CAVE, run), run.play, snapper.key);
    expect(aimed.battle.back).toBeUndefined();
  });

  it('never moves the grotto’s scripted player: he steps out often, and always re-taps first', () => {
    // The balance and timeline tests play him unchanged; this says why they can.
    let backs = 0;
    let fired = 0;
    for (const seed of [7919, 3 * 7919, 7 * 7919]) {
      let run = bot.begin(bot.prepared(), seed);
      for (let t = 0; t < 20 * 60_000 && !run.finished; t += 100) {
        run = bot.decide(run);
        const before = run.battle!.back;
        run = advanceRun(bot.GROTTO_DUNGEON, run, run.play, 100);
        const b = run.battle!;
        if (b.back && !before) backs++;
        if (before && !b.back && b.chase && b.target === before.key) fired++;
      }
    }
    expect(backs).toBeGreaterThan(50);
    expect(fired).toBe(0);
  }, 60_000);
});

/*
 * What a run did (S16), counted from its fight's events, and the day's
 * modifier kept with it: a run reloaded half way counts on as if it never
 * stopped; the modifier is read once, as the boat rows out, and kept, even
 * when the day turns under it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';
import {
  advanceBattle,
  BEAT_MS,
  TICK_MS,
  eat,
  foodProblem,
  useAbility,
  type Battle,
  type Telegraph,
} from '../../src/scene/battle';
import { advanceRun, placeOf, type Run } from '../../src/scene/dungeon';
import { forgetLessons } from '../../src/scene/lessons';
import { runSpoils, runStats } from '../../src/scene/modifiers';
import { restoreRun, savedRunOf, snapshotRun } from '../../src/scene/runSave';
import { resetTown, runNow, townView } from '../../src/scene/townView';
import type { Shell, View } from '../../src/ui/view';
import { beginCave, CAVE, novice } from './caveBot';
import { begin, decide, GROTTO_DUNGEON, prepared } from './grottoBot';

/** The grotto played by its scripted player for `ms`, a tenth of a second at a time. */
function play(run: Run, ms: number): Run {
  for (let t = 0; t < ms && !run.finished; t += 100) {
    run = decide(run);
    run = advanceRun(GROTTO_DUNGEON, run, run.play, 100);
  }
  return run;
}

describe('what a run did', () => {
  it('counts the same played in one piece as reloaded half way through (and under a modifier)', () => {
    for (const modifier of [undefined, 'spring_tide']) {
      const whole = play(begin(prepared(20), 31, undefined, modifier), 12 * 60_000);
      let half = play(begin(prepared(20), 31, undefined, modifier), 4 * 60_000);
      const kept = JSON.parse(JSON.stringify(savedRunOf(half)));
      half = restoreRun(kept.data, kept.scene)!;
      expect(half.modifier?.id).toBe(modifier);
      half = play(half, 8 * 60_000);
      expect(runStats(half)).toEqual(runStats(whole));
      expect(runSpoils(half, true)).toEqual(runSpoils(whole, true));
      // And it did things worth counting.
      const stats = runStats(whole);
      expect(stats.damageTaken).toBeGreaterThan(100);
      expect(stats.stepOuts).toBeGreaterThan(5);
      expect(stats.kills).toBe(whole.battle!.tally.kills);
      expect(stats.foodEaten).toBe(whole.battle!.tally.eaten);
    }
  }, 120_000);

  it('times a clear to the boss’s fall, not the moment of results after it', () => {
    const run = play(begin(prepared(20), 7919), 15 * 60_000);
    expect(run.ending).toBe('cleared');
    const stats = runStats(run);
    expect(stats.timeMs).toBe(Math.round(run.ms - (run.battle!.clock - run.battle!.over!.at)));
    expect(run.ms - stats.timeMs).toBeGreaterThanOrEqual(BEAT_MS);
    expect(stats.knockedOut).toBe(false);
    expect(runSpoils(run, true)).toMatchObject({
      cleared: 'brinebeards_grotto',
      dungeon: 'brinebeards_grotto',
      modifier: null,
      timeMs: stats.timeMs,
      stats,
    });
  }, 120_000);

  /** The cave's boss room, the snapper about to slam where the hero stands. */
  function slam(): { run: Run; mark: Telegraph } {
    const run = beginCave(novice(), 3, false);
    const b = run.battle!;
    const foe = b.foes.find((f) => f.monster === 'old_snapper')!;
    const at = { x: 300, y: 130 };
    const mark: Telegraph = {
      at,
      radius: 75,
      shape: 'circle',
      from: 0,
      lands: 1000,
      origin: null,
      damage: 4,
    };
    const foes = b.foes.map((f) =>
      f === foe ? { ...f, at, heavy: mark, aware: true, hp: 99 } : f,
    );
    return {
      run: {
        ...run,
        room: 'snapper',
        play: { ...run.play, walker: { at: { x: 320, y: 130 }, path: [] } },
        battle: { ...b, foes, clock: 0 },
      },
      mark,
    };
  }
  const go = (run: Run, ms: number): Run => {
    let r = run;
    for (let t = 0; t < ms; t += TICK_MS) r = advanceRun(CAVE, r, r.play, TICK_MS);
    return r;
  };

  it('counts a heavy blow braced, and the hit points it took after the halving', () => {
    const { run } = slam();
    const used = useAbility(run.battle!, placeOf(CAVE, run), run.play, 1);
    const after = go({ ...run, battle: used.battle, play: used.play }, 1100);
    const stats = runStats(after);
    expect(stats.braces).toBe(1);
    expect(stats.stepOuts).toBe(0);
    expect(stats.damageTaken).toBeGreaterThanOrEqual(2);
  });

  it('counts a heavy blow stepped out of, once he stood in its mark', () => {
    const { run } = slam();
    // A tick in it, then away out of it before it lands.
    let r = go(run, TICK_MS);
    r = { ...r, play: { ...r.play, walker: { at: r.play.walker.at, path: [{ x: 420, y: 130 }] } } };
    r = go(r, 1100);
    expect(runStats(r).stepOuts).toBe(1);
    expect(runStats(r).braces).toBe(0);
    // Standing well clear of it all along is not stepping out of it.
    const { run: far } = slam();
    const clear = go(
      { ...far, play: { ...far.play, walker: { at: { x: 520, y: 130 }, path: [] } } },
      1100,
    );
    expect(runStats(clear).stepOuts).toBe(0);
  });

  it('counts food found and eaten with food from the slot', () => {
    const run = beginCave(novice(), 3, false);
    let b: Battle = {
      ...run.battle!,
      hp: 5,
      tally: { ...run.battle!.tally, loot: { cooked_shrimp: 2 } },
    };
    b = eat(b, run.play.walker.at);
    expect(runStats({ ...run, battle: b }).foodEaten).toBe(1);
  });
});

describe('the day’s modifier, as the boat rows out', () => {
  let observers: ResizeObserverCallback[];
  let clock: number;
  let appNow: number;
  let character: GameState;
  beforeEach(() => {
    observers = [];
    clock = 1000;
    appNow = 1_700_000_000_000;
    character = newGame('Cody', 0);
    resetTown();
    forgetLessons();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal('devicePixelRatio', 3);
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    document.body.replaceChildren();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetTown();
  });
  const layOut = (width: number, height: number): void => {
    const entry = { contentRect: { width, height } } as ResizeObserverEntry;
    for (const callback of [...observers]) callback([entry], {} as ResizeObserver);
  };
  const wait = (view: View, ms: number): void => {
    for (let t = 0; t < ms; t += 50) {
      clock += 50;
      appNow += 50;
      view.update?.(character, appNow);
    }
  };

  it('is read once, kept in the run and in what is kept of it, and settled with it', () => {
    let today: string | null = 'slack_tide';
    const asked: string[] = [];
    const settled: unknown[] = [];
    const kept: unknown[] = [];
    const shell: Shell = {
      openTab: () => {},
      openSkill: () => {},
      pauseIdle: () => {},
      fullScreen: () => {},
      settleRun: (s) => settled.push(s),
      keepRun: (r) => kept.push(r),
      takeRequest: (() => {
        let once = true;
        return () => (once ? ((once = false), 'chart' as const) : null);
      })(),
      todaysModifier: (id) => {
        asked.push(id);
        return today;
      },
    };
    const view = townView(character, CONTENT, shell);
    document.body.append(view.el);
    layOut(390, 727);
    wait(view, 100);
    [...view.el.querySelectorAll('button')].find((b) => b.textContent === 'Row out')!.click();
    wait(view, 100);
    expect(runNow()!.modifier).toEqual({ id: 'slack_tide', effects: { foeSpeed: 0.8 } });
    // Its foes swing less often, from their first blow.
    const rat = runNow()!.battle!.monsters.dock_rat!;
    expect(rat.speedMs).toBe(Math.round(CONTENT.dungeons!.tidepool_cave!.cast![0]!.speedMs / 0.8));
    // Midnight comes: a new day's modifier, but not for this run.
    today = 'rich_pickings';
    layOut(844, 390);
    wait(view, 3000);
    expect(runNow()!.modifier!.id).toBe('slack_tide');
    const last = kept.at(-1) as { data: unknown; scene: number; spoils: { modifier: string } };
    expect(last.spoils.modifier).toBe('slack_tide');
    expect(restoreRun(last.data, last.scene)!.modifier!.id).toBe('slack_tide');
    view.el.querySelector<HTMLButtonElement>('.dungeon-leave')!.click();
    [...view.el.querySelectorAll('button')].find((b) => b.textContent === 'Row back')!.click();
    expect(settled.at(-1)).toMatchObject({ dungeon: 'tidepool_cave', modifier: 'slack_tide' });
    expect(asked.filter((id) => id === 'tidepool_cave').length).toBeGreaterThanOrEqual(1);
  });

  it('forbids eating on a day of no food: the button says why', () => {
    // The flag itself, whatever the tables' days are (lane A's wave 18 set none).
    const run = beginCave(novice(), 3, false, {}, { id: 'no_food', effects: { noFood: true } });
    expect(run.battle!.mods).toEqual({ noFood: true });
    const b: Battle = {
      ...run.battle!,
      hp: 5,
      tally: { ...run.battle!.tally, loot: { cooked_shrimp: 2 } },
    };
    expect(foodProblem(b)).toBe('banned');
    expect(eat(b, run.play.walker.at)).toBe(b);
    // A run of another day is untouched.
    const plain = beginCave(novice(), 3, false);
    expect(plain.battle!.mods).toBeUndefined();
    expect(advanceBattle(plain.battle!, placeOf(CAVE, plain), plain.play, 0).battle).toBe(
      plain.battle,
    );
    expect(snapshotRun(plain)).not.toHaveProperty('modifier');
  });
});

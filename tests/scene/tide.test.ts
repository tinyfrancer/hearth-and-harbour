import { describe, expect, it } from 'vitest';
import {
  EBB_STEP_MS,
  HIGH_WATER,
  SURGE_FIRST_MS,
  SURGE_STEP_MS,
  TIDE_CYCLE,
  TIDE_PERIOD,
  TIDE_START,
  TIDE_WARN_MS,
  cycleTide,
  gaugeLevel,
  rising,
  surgeTide,
  waterAt,
} from '../../src/scene/tide';
import { TICK_MS } from '../../src/scene/battle';

describe('the tide’s cycle', () => {
  it('starts at low water with a while before it turns, and goes round in a minute', () => {
    expect(cycleTide(0).level).toBe(0);
    expect(cycleTide(0).next).toEqual({ level: 1, at: TIDE_CYCLE[0]!.ms - TIDE_START });
    expect(TIDE_PERIOD).toBe(60_000);
    for (const t of [0, 1234, 17_000, 33_333, 59_999]) {
      expect(cycleTide(t + TIDE_PERIOD).level).toBe(cycleTide(t).level);
    }
  });

  it('rises a level at a time to high water and falls the same way, every change on a tick', () => {
    const levels: number[] = [];
    let last = -1;
    for (let t = 0; t < TIDE_PERIOD; t += TICK_MS) {
      const now = cycleTide(t);
      if (now.level !== last) levels.push(now.level);
      last = now.level;
      if (now.next) expect(now.next.at % TICK_MS).toBe(0);
    }
    expect(levels).toEqual([0, 1, 2, 3, 2, 1, 0]);
    expect(Math.max(...levels)).toBe(HIGH_WATER);
  });

  it('says a rise is coming for the warning before it, and only then', () => {
    const turn = TIDE_CYCLE[0]!.ms - TIDE_START;
    expect(rising(cycleTide(turn - TIDE_WARN_MS - TICK_MS), turn - TIDE_WARN_MS - TICK_MS)).toBe(
      false,
    );
    expect(rising(cycleTide(turn - TIDE_WARN_MS), turn - TIDE_WARN_MS)).toBe(true);
    expect(rising(cycleTide(turn - TICK_MS), turn - TICK_MS)).toBe(true);
    // A fall is no danger, and is not called a rise.
    const highEnds = turn + 6000 + 6000 + 18_000;
    expect(cycleTide(highEnds - TICK_MS).level).toBe(3);
    expect(rising(cycleTide(highEnds - TICK_MS), highEnds - TICK_MS)).toBe(false);
  });

  it('creeps up the gauge through the warning and arrives as the water does', () => {
    const turn = TIDE_CYCLE[0]!.ms - TIDE_START;
    expect(gaugeLevel(cycleTide(turn - TIDE_WARN_MS - 1), turn - TIDE_WARN_MS - 1)).toBe(0);
    const half = turn - TIDE_WARN_MS / 2;
    expect(gaugeLevel(cycleTide(half), half)).toBeCloseTo(0.5, 5);
    expect(gaugeLevel(cycleTide(turn), turn)).toBe(1);
  });
});

describe('what the water makes of the ground', () => {
  it('is shallows one level over a tile, and deep two or more over', () => {
    const table = [0, 1, 2, 3].map((height) => [0, 1, 2, 3].map((level) => waterAt(height, level)));
    expect(table).toEqual([
      ['shallow', 'deep', 'deep', 'deep'],
      ['dry', 'shallow', 'deep', 'deep'],
      ['dry', 'dry', 'shallow', 'deep'],
      ['dry', 'dry', 'dry', 'shallow'],
    ]);
  });
});

describe('the captain’s tide', () => {
  it('stays out until he calls it, then comes in a level at a time with a warning each, and holds', () => {
    expect(surgeTide(50_000, null, null)).toEqual({ level: 0, since: -Infinity, next: null });
    const s = 10_000;
    expect(surgeTide(s, s, null).level).toBe(0);
    expect(surgeTide(s, s, null).next).toEqual({ level: 1, at: s + SURGE_FIRST_MS });
    expect(rising(surgeTide(s, s, null), s)).toBe(true);
    expect(surgeTide(s + SURGE_FIRST_MS, s, null).level).toBe(1);
    expect(surgeTide(s + SURGE_FIRST_MS + SURGE_STEP_MS, s, null).level).toBe(2);
    expect(surgeTide(s + SURGE_FIRST_MS + 2 * SURGE_STEP_MS, s, null).level).toBe(3);
    expect(surgeTide(s + 600_000, s, null)).toMatchObject({ level: 3, next: null });
    // Every rise is warned of for as long as the shared tide's are.
    expect(SURGE_FIRST_MS).toBeGreaterThanOrEqual(TIDE_WARN_MS);
    expect(SURGE_STEP_MS).toBeGreaterThanOrEqual(TIDE_WARN_MS);
  });

  it('goes out again a level at a time once he is down', () => {
    const s = 10_000;
    const e = 60_000;
    expect(surgeTide(e - 1, s, e).next).toEqual({ level: 2, at: e });
    expect(surgeTide(e, s, e).level).toBe(3);
    expect(surgeTide(e + EBB_STEP_MS, s, e).level).toBe(2);
    expect(surgeTide(e + 3 * EBB_STEP_MS, s, e)).toMatchObject({ level: 0, next: null });
  });
});

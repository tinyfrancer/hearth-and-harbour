/*
 * The day's modifiers in play (S16), held by playing them: the grotto's six
 * by its scripted careful player at the recommended level (combat 20), the
 * cave's two by its scripted novice. A modifier of rewards alone plays
 * exactly as a plain run; every harder one is harder in the play (fewer
 * clears, longer, or more hit points lost), and lane A's rewards pay for it.
 * Measured on these seeds; a number that breaks one is a decision.
 */
import { describe, expect, it } from 'vitest';
import { advanceRun, type Run } from '../../src/scene/dungeon';
import { novice, playCave } from './caveBot';
import { begin, decide, GROTTO_DUNGEON, playThrough, prepared, type Outcome } from './grottoBot';
import type { RunModifier } from '../../src/scene/modifiers';

const SEEDS = Array.from({ length: 12 }, (_, i) => (i + 1) * 7919);
const REACT_MS = 400;
const median = (xs: readonly number[]): number =>
  [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? NaN;
const minutes = (ms: number): number => ms / 60_000;

const played = new Map<string, Outcome[]>();
const grotto = (modifier?: string | RunModifier): Outcome[] => {
  const key = typeof modifier === 'object' ? JSON.stringify(modifier) : (modifier ?? 'none');
  let runs = played.get(key);
  if (!runs) {
    runs = SEEDS.map((seed) => playThrough(prepared(20), seed, { reactMs: REACT_MS, modifier }));
    played.set(key, runs);
  }
  return runs;
};
const clears = (runs: readonly Outcome[]): number => runs.filter((r) => r.cleared).length;
const clearTime = (runs: readonly Outcome[]): number =>
  median(runs.filter((r) => r.cleared).map((r) => r.ms));
const lost = (runs: readonly Outcome[]): number =>
  median(runs.map((r) => r.run.battle!.count?.damage ?? 0));

/** Harder in the play than a plain day: fewer clears, a longer clear, or more lost. */
const harder = (runs: readonly Outcome[]): boolean => {
  const plain = grotto();
  return (
    clears(runs) < clears(plain) || clearTime(runs) > clearTime(plain) || lost(runs) > lost(plain)
  );
};

describe('the grotto under each of its modifiers, at the recommended level', () => {
  it('is cleared on every seed on a plain day (the measure the others are held to)', () => {
    expect(clears(grotto())).toBe(12);
    expect(minutes(clearTime(grotto()))).toBeGreaterThanOrEqual(7);
    expect(minutes(clearTime(grotto()))).toBeLessThanOrEqual(10);
  }, 120_000);

  it('thick skulls: still cleared, slower (measured: 4 of 12, median 10.2 minutes against 8.2)', () => {
    const runs = grotto('thick_skulls');
    expect(clears(runs)).toBeGreaterThanOrEqual(2);
    expect(clearTime(runs)).toBeGreaterThan(clearTime(grotto()));
    expect(harder(runs)).toBe(true);
  }, 120_000);

  it('angry crew: still cleared, at more cost (measured: 3 of 12, 482 lost against 406)', () => {
    const runs = grotto('angry_crew');
    expect(clears(runs)).toBeGreaterThanOrEqual(1);
    expect(lost(runs)).toBeGreaterThan(lost(grotto()));
  }, 120_000);

  it('quick tempers: still cleared, at more cost (measured: 5 of 12, 475 lost against 406)', () => {
    const runs = grotto('quick_tempers');
    expect(clears(runs)).toBeGreaterThanOrEqual(2);
    expect(lost(runs)).toBeGreaterThan(lost(grotto()));
  }, 120_000);

  it('spring tide: still cleared on most seeds, harder (measured: 9 of 12, 428 lost)', () => {
    const runs = grotto('spring_tide');
    expect(clears(runs)).toBeGreaterThanOrEqual(6);
    expect(harder(runs)).toBe(true);
  }, 120_000);

  it('unlit lamps: still cleared on most seeds, slower (measured: 8 of 12, median 8.8 minutes)', () => {
    const runs = grotto('unlit_lamps');
    expect(clears(runs)).toBeGreaterThanOrEqual(5);
    expect(clearTime(runs)).toBeGreaterThan(clearTime(grotto()));
  }, 120_000);

  it('a day of no food: NOT cleared by the careful player, who eats 18 fish on a plain day', () => {
    // The grotto is balanced on what is brought to eat (290 to 480 lost a clear). Without it he
    // falls in the first rooms on every seed. The flag itself, whatever the tables' days are.
    const runs = grotto({ id: 'no_food', effects: { noFood: true } });
    expect(clears(runs)).toBe(0);
    expect(runs.every((r) => r.eaten === 0)).toBe(true);
    expect(harder(runs)).toBe(true);
  }, 120_000);
});

describe('a modifier of rewards alone', () => {
  it('plays exactly as a plain run, to the last roll', () => {
    // Rich pickings changes only what is paid; the fight is the plain one, tick for tick.
    for (const seed of SEEDS.slice(0, 3)) {
      let a: Run = begin(prepared(20), seed);
      let b: Run = begin(prepared(20), seed, undefined, 'rich_pickings');
      expect(b.modifier?.id).toBe('rich_pickings');
      for (let t = 0; t < 120_000 && !a.finished; t += 100) {
        a = decide(a);
        b = decide(b);
        a = advanceRun(GROTTO_DUNGEON, a, a.play, 100);
        b = advanceRun(GROTTO_DUNGEON, b, b.play, 100);
        expect(b.battle!.seed).toBe(a.battle!.seed);
        expect(b.battle!.hp).toBe(a.battle!.hp);
        expect(b.play.walker.at).toEqual(a.play.walker.at);
      }
      expect(b.battle!.mods).toBeUndefined();
      expect({ ...b, modifier: undefined }).toEqual({ ...a, modifier: undefined });
    }
  }, 120_000);
});

describe('the cave under each of its modifiers', () => {
  const plain = SEEDS.map((seed) => playCave(novice(), seed, { reactMs: 600, brace: false }));
  it('slack tide: the novice clears it every time, with health to spare (kind)', () => {
    const runs = SEEDS.map((seed) =>
      playCave(novice(), seed, { reactMs: 600, brace: false, modifier: 'slack_tide' }),
    );
    expect(runs.every((r) => r.cleared)).toBe(true);
    // Foes swing less often: never lower than a plain day's lowest (measured 14 against 7).
    expect(Math.min(...runs.map((r) => r.lowest))).toBeGreaterThanOrEqual(
      Math.min(...plain.map((r) => r.lowest)),
    );
  }, 120_000);

  it('rich pickings: the same cave, paid more', () => {
    const runs = SEEDS.map((seed) =>
      playCave(novice(), seed, { reactMs: 600, brace: false, modifier: 'rich_pickings' }),
    );
    expect(runs.map((r) => [r.cleared, r.ms, r.lowest])).toEqual(
      plain.map((r) => [r.cleared, r.ms, r.lowest]),
    );
  }, 120_000);
});

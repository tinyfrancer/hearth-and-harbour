/*
 * The day's modifiers in play (S16), held by playing them: the grotto's days
 * by its scripted careful player at the recommended level (combat 20), the
 * cave's two by its scripted novice. Since wave 18 every grotto day is held
 * to lane A's target, not a snapshot of its numbers: cleared on at least 10
 * of 12 seeds, and harder than a plain day in the way its effects say
 * (a longer clear, more lost, or more eaten). A modifier of rewards alone
 * plays exactly as a plain run. A number that breaks one is a decision.
 */
import { describe, expect, it } from 'vitest';
import type { ModifierEffects } from '../../src/core/content';
import { effectsOf, isKind } from '../../src/core/progress';
import { CONTENT } from '../../src/data';
import { advanceRun, type Run } from '../../src/scene/dungeon';
import { novice, playCave } from './caveBot';
import { begin, decide, GROTTO_DUNGEON, playThrough, prepared, type Outcome } from './grottoBot';
import { runStats, type RunModifier } from '../../src/scene/modifiers';

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

/** Every grotto day that costs something (lane A's trades; a kind day pays only), by id. */
const TRADES = (CONTENT.dungeons!.brinebeards_grotto!.modifiers ?? []).filter(
  (id) => !isKind(effectsOf(CONTENT, id)),
);

const times = (k: number | undefined): number =>
  typeof k === 'number' && Number.isFinite(k) && k > 0 ? k : 1;

/**
 * How a day says it is harder, from its effects alone (never its name):
 * a longer clear (foes with more health, or the hero's blows softer), more
 * hit points lost (foes hitting harder or oftener, a faster tide), or more
 * food eaten (food healing less).
 */
function stated(e: ModifierEffects): { longer: boolean; hurt: boolean; food: boolean } {
  return {
    longer: times(e.foeHealth) > 1 || times(e.heroDamage) < 1,
    hurt: times(e.foeDamage) > 1 || times(e.foeSpeed) > 1 || times(e.tideFaster) > 1,
    food: times(e.foodHeals) < 1,
  };
}

/** Food eaten in a run, from the slot and found (`runStats`), and on the whole, per hit point lost. */
const eaten = (runs: readonly Outcome[]): number =>
  runs.reduce((n, r) => n + runStats(r.run).foodEaten, 0) / runs.length;
const eatenPerHurt = (runs: readonly Outcome[]): number =>
  runs.reduce((n, r) => n + runStats(r.run).foodEaten, 0) /
  Math.max(
    1,
    runs.reduce((n, r) => n + runStats(r.run).damageTaken, 0),
  );

/**
 * The margins each stated cost is held to against a plain day, set under what
 * was measured (`docs/status/lane-c.md`, wave 18): a longer median clear by a
 * twenty-fifth (measured 8 to 20 per cent), more lost to blows by a fiftieth
 * (measured 4 to 10), a fish more for every hit point lost by a seventh
 * (measured 28 per cent: food runs out at 19 or 20 eaten either way, so it
 * shows per hit point, and on the whole a little).
 */
const LONGER = 1.04;
const HURT = 1.02;
const FOOD_PER_HURT = 1.15;

describe('the grotto under each of its modifiers, at the recommended level', () => {
  it('is cleared on every seed on a plain day (the measure the others are held to)', () => {
    expect(clears(grotto())).toBe(12);
    expect(minutes(clearTime(grotto()))).toBeGreaterThanOrEqual(7);
    expect(minutes(clearTime(grotto()))).toBeLessThanOrEqual(10);
  }, 120_000);

  it('draws only days that cost something, every one of them with a stated cost', () => {
    expect(TRADES.length).toBeGreaterThan(0);
    for (const id of TRADES) {
      const s = stated(effectsOf(CONTENT, id));
      expect(s.longer || s.hurt || s.food, id).toBe(true);
    }
  });

  for (const id of TRADES)
    it(`${id}: cleared on at least 10 of 12 seeds, and harder than a plain day in its stated way`, () => {
      const runs = grotto(id);
      const plain = grotto();
      // Lane A's target for wave 18: a fair trade, not a wall.
      expect(clears(runs)).toBeGreaterThanOrEqual(10);
      const s = stated(effectsOf(CONTENT, id));
      if (s.longer) expect(clearTime(runs)).toBeGreaterThanOrEqual(clearTime(plain) * LONGER);
      if (s.hurt) expect(lost(runs)).toBeGreaterThanOrEqual(lost(plain) * HURT);
      if (s.food) {
        expect(eaten(runs)).toBeGreaterThan(eaten(plain));
        expect(eatenPerHurt(runs)).toBeGreaterThanOrEqual(eatenPerHurt(plain) * FOOD_PER_HURT);
      }
    }, 120_000);

  it('a day of no food: NOT cleared by the careful player, who eats 18 fish on a plain day', () => {
    // The grotto is balanced on what is brought to eat (290 to 480 lost a clear). Without it he
    // falls in the first rooms on every seed. The flag itself: no day of the tables sets it now.
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

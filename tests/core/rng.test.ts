import { describe, expect, it } from 'vitest';
import { Dice, roll, seedFrom } from '../../src/core/rng';

describe('the dice', () => {
  it('roll the same numbers from the same seed, and never change the seed they were given', () => {
    const a = new Dice(12345);
    const b = new Dice(12345);
    const rolls = Array.from({ length: 50 }, () => a.next());
    expect(Array.from({ length: 50 }, () => b.next())).toEqual(rolls);
    expect(roll(12345)).toEqual(roll(12345));
    // Pinned to mulberry32's own first number, so a change to the step (which
    // would change the next fight in every save) cannot slip by.
    expect(roll(0)).toEqual({ value: 0.26642920868471265, seed: 0x6d2b79f5 });
    expect(new Dice(1).next()).toBe(roll(1).value);
  });

  it('carry on from where a saved seed left off', () => {
    const whole = new Dice(99);
    const first = [whole.next(), whole.next(), whole.next()];
    const resumed = new Dice(99);
    resumed.next();
    const saved = new Dice(resumed.seed);
    expect([saved.next(), saved.next()]).toEqual(first.slice(1));
  });

  it('roll from 0 up to 1 and spread evenly', () => {
    const dice = new Dice(7);
    const buckets = Array.from({ length: 10 }, () => 0);
    for (let i = 0; i < 100_000; i += 1) {
      const value = dice.next();
      expect(value >= 0 && value < 1).toBe(true);
      buckets[Math.floor(value * 10)]! += 1;
    }
    for (const count of buckets) expect(Math.abs(count - 10_000)).toBeLessThan(500);
    expect(Number.isInteger(dice.seed) && dice.seed >= 0 && dice.seed < 2 ** 32).toBe(true);
  });

  it('give whole numbers between two ends, both included, and roll nothing when they are one', () => {
    const dice = new Dice(3);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i += 1) seen.add(dice.between(2, 5));
    expect([...seen].sort()).toEqual([2, 3, 4, 5]);
    const before = dice.seed;
    expect(dice.between(4, 4)).toBe(4);
    expect(dice.seed).toBe(before);
  });

  it('are seeded differently for characters made at different moments', () => {
    const seeds = new Set([0, 1, 2, 1_700_000_000_000, 1_700_000_000_001].map(seedFrom));
    expect(seeds.size).toBe(5);
    for (const seed of seeds)
      expect(Number.isInteger(seed) && seed >= 0 && seed < 2 ** 32).toBe(true);
    expect(seedFrom(1_700_000_000_000)).toBe(seedFrom(1_700_000_000_000));
  });
});

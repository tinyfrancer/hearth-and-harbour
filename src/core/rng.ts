/**
 * The game's dice. A seed is one whole number from 0 to 2^32 - 1, kept in the
 * save, and every roll moves it on by one step. Rolled only inside the rules,
 * in a fixed order for each event, a fight is exactly repeatable from a save:
 * the same seed and the same events give the same blows.
 *
 * The step is mulberry32: small, quick, and good enough for a game.
 */

/** One roll: a number from 0 up to (not including) 1, and the seed to roll with next. */
export function roll(seed: number): { value: number; seed: number } {
  const next = (seed + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: next };
}

/**
 * Dice to roll many times in a row without making an object each time, for
 * the fight's walk through tens of thousands of events. `seed` is where they
 * have got to, to write back into the state.
 */
export class Dice {
  seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  /** From 0 up to (not including) 1. */
  next(): number {
    const { value, seed } = roll(this.seed);
    this.seed = seed;
    return value;
  }

  /** A whole number from `min` to `max`, each equally likely. Rolls nothing when they are the same. */
  between(min: number, max: number): number {
    return max <= min ? min : min + Math.floor(this.next() * (max - min + 1));
  }
}

/** A seed made from a number that is different for each character, such as when it was made. */
export function seedFrom(value: number): number {
  const low = value % 4294967296;
  const high = Math.floor(value / 4294967296);
  // A roll's value is a whole number out of 2^32, so scaling it back up is exact.
  return roll((low ^ Math.imul(high, 0x9e3779b1)) >>> 0).value * 4294967296;
}

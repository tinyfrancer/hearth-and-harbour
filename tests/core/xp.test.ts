import { describe, expect, it } from 'vitest';
import { MAX_LEVEL, levelForXp, levelProgress, xpForLevel } from '../../src/core/xp';

describe('the level curve', () => {
  it('starts at nothing and only ever climbs, each level costing more than the last', () => {
    expect(xpForLevel(1)).toBe(0);
    for (let level = 2; level < MAX_LEVEL; level += 1) {
      const cost = xpForLevel(level + 1) - xpForLevel(level);
      expect(cost).toBeGreaterThan(xpForLevel(level) - xpForLevel(level - 1));
    }
  });

  it('pins the landmarks, so a change to the curve is a decision and not an accident', () => {
    expect(xpForLevel(2)).toBe(40);
    expect(xpForLevel(20)).toBe(62943);
    expect(xpForLevel(99)).toBe(3802990);
  });

  it('reads a level back from XP on both sides of every boundary', () => {
    for (let level = 2; level <= MAX_LEVEL; level += 1) {
      expect(levelForXp(xpForLevel(level))).toBe(level);
      expect(levelForXp(xpForLevel(level) - 1)).toBe(level - 1);
    }
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(Number.MAX_SAFE_INTEGER)).toBe(MAX_LEVEL);
  });

  it('measures progress through a level', () => {
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(20)).toBe(0.5);
    expect(levelProgress(xpForLevel(99) + 5)).toBe(1);
  });
});

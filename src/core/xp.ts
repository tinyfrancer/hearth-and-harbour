/**
 * The level curve. Total XP to stand at level L is 40 x (L - 1)^2.5, rounded:
 * quick first levels, then a long steady climb (about 63k for level 20, 2.2m
 * for 80, 3.8m for 99). Flatter than RuneScape's doubling curve on purpose:
 * content comes in tiers of twenty levels that a dungeon unlocks, and a curve
 * that doubles makes the first tier minutes long and the last one months.
 *
 * Pacing is held by tests/data/pacing.test.ts, not by this comment.
 */
export const MAX_LEVEL = 99;

const XP_FOR_LEVEL: readonly number[] = Array.from({ length: MAX_LEVEL + 1 }, (_, level) =>
  level <= 1 ? 0 : Math.round(40 * (level - 1) ** 2.5),
);

/** Total XP at which `level` is reached. Levels outside 1-99 are clamped. */
export function xpForLevel(level: number): number {
  return XP_FOR_LEVEL[Math.min(Math.max(Math.floor(level), 1), MAX_LEVEL)]!;
}

export function levelForXp(xp: number): number {
  // 99 entries: a binary search is not worth its bugs.
  let level = 1;
  while (level < MAX_LEVEL && xp >= XP_FOR_LEVEL[level + 1]!) {
    level += 1;
  }
  return level;
}

/** How far through the current level, 0 to 1. A maxed skill reads as full. */
export function levelProgress(xp: number): number {
  const level = levelForXp(xp);
  if (level >= MAX_LEVEL) return 1;
  const floor = xpForLevel(level);
  return (xp - floor) / (xpForLevel(level + 1) - floor);
}

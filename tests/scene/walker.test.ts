import { describe, expect, it } from 'vitest';
import { WALK_SPEED, step, walkTo, type Walker } from '../../src/scene/walker';
import { centreOf } from '../../src/scene/tileMap';
import { ROOM_START, TEST_ROOM } from '../../src/scene/testRoom';

describe('step', () => {
  const walker: Walker = {
    at: { x: 0, y: 0 },
    path: [
      { x: 64, y: 0 },
      { x: 64, y: 64 },
    ],
  };

  it('covers the speed in art pixels a second', () => {
    expect(step(walker, 500, 64)).toEqual({ at: { x: 32, y: 0 }, path: walker.path });
  });

  it('carries over a corner within one long frame', () => {
    expect(step(walker, 1500, 64)).toEqual({ at: { x: 64, y: 32 }, path: [{ x: 64, y: 64 }] });
  });

  it('stops at the end of the path', () => {
    expect(step(walker, 60_000, 64)).toEqual({ at: { x: 64, y: 64 }, path: [] });
  });

  it('ends up in the same place however the time is cut into frames', () => {
    let small = walker;
    for (let i = 0; i < 90; i++) small = step(small, 1000 / 60, 64);
    const big = step(walker, 1500, 64);
    expect(small.at.x).toBeCloseTo(big.at.x, 6);
    expect(small.at.y).toBeCloseTo(big.at.y, 6);
  });

  it('leaves a walker with nowhere to go as it was', () => {
    const still: Walker = { at: { x: 5, y: 5 }, path: [] };
    expect(step(still, 100)).toBe(still);
    expect(step(walker, 0)).toBe(walker);
  });
});

describe('walkTo', () => {
  it('walks across the test room to where it was sent, at walking speed', () => {
    let walker: Walker = { at: centreOf(ROOM_START), path: [] };
    const target = centreOf({ col: 3, row: 26 });
    walker = walkTo(TEST_ROOM, walker, target);
    expect(walker.path.at(-1)).toEqual(target);
    const length = walker.path.reduce((sum, p, i) => {
      const from = i === 0 ? walker.at : walker.path[i - 1]!;
      return sum + Math.hypot(p.x - from.x, p.y - from.y);
    }, 0);
    walker = step(walker, (length / WALK_SPEED) * 1000 + 1);
    expect(walker.at).toEqual(target);
    expect(walker.path).toEqual([]);
  });
});

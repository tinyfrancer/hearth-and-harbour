import { describe, expect, it } from 'vitest';
import { clearLine, findPath, nearestReachable, route } from '../../src/scene/path';
import { TILE, centreOf, isSolid, parseMap, type Cell } from '../../src/scene/tileMap';
import { TOWN2_TILE } from '../../src/art/town2/town';
import { TOWN2_START_CELL, town2Scene } from '../../src/scene/town2';

const kinds = { floor: { solid: false }, wall: { solid: true } };
const map = (rows: string[]) => parseMap(rows, { '.': 'floor', '#': 'wall' }, kinds);

/** Every step of a path is to a neighbouring open tile, and no diagonal cuts a wall's corner. */
const walkable = (m: ReturnType<typeof map>, cells: Cell[]): boolean =>
  cells.every((c, i) => {
    if (isSolid(m, c)) return false;
    const prev = cells[i - 1];
    if (!prev) return true;
    const dc = c.col - prev.col;
    const dr = c.row - prev.row;
    if (Math.abs(dc) > 1 || Math.abs(dr) > 1 || (dc === 0 && dr === 0)) return false;
    return (
      !(dc && dr) ||
      (!isSolid(m, { col: prev.col + dc, row: prev.row }) &&
        !isSolid(m, { col: prev.col, row: prev.row + dr }))
    );
  });

describe('parseMap', () => {
  it('refuses a character it has no key for', () => {
    expect(() => map(['..x'])).toThrow(/Unknown tile 'x'/);
  });

  it('refuses ragged rows', () => {
    expect(() => map(['...', '..'])).toThrow(/Row 1/);
  });

  it('treats off the map as solid', () => {
    const m = map(['..']);
    expect(isSolid(m, { col: -1, row: 0 })).toBe(true);
    expect(isSolid(m, { col: 0, row: 1 })).toBe(true);
    expect(isSolid(m, { col: 1, row: 0 })).toBe(false);
  });
});

describe('findPath', () => {
  it('finds a straight path across open ground', () => {
    const m = map(['.....']);
    expect(findPath(m, { col: 0, row: 0 }, { col: 4, row: 0 })).toEqual(
      [0, 1, 2, 3, 4].map((col) => ({ col, row: 0 })),
    );
  });

  it('goes around a wall through its gap', () => {
    const m = map([
      '.....', //
      '####.',
      '.....',
    ]);
    const path = findPath(m, { col: 0, row: 0 }, { col: 0, row: 2 })!;
    expect(path).not.toBeNull();
    expect(walkable(m, path)).toBe(true);
    expect(path).toContainEqual({ col: 4, row: 1 });
    expect(path.at(0)).toEqual({ col: 0, row: 0 });
    expect(path.at(-1)).toEqual({ col: 0, row: 2 });
  });

  it('does not cut the corner of a wall on a diagonal', () => {
    const m = map([
      '.#', //
      '..',
    ]);
    const path = findPath(m, { col: 0, row: 0 }, { col: 1, row: 1 })!;
    expect(path).toEqual([
      { col: 0, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
    ]);
  });

  it('says when there is no way there', () => {
    const m = map([
      '..#..', //
      '..#..',
    ]);
    expect(findPath(m, { col: 0, row: 0 }, { col: 4, row: 0 })).toBeNull();
    expect(findPath(m, { col: 0, row: 0 }, { col: 2, row: 0 })).toBeNull();
    expect(findPath(m, { col: 0, row: 0 }, { col: 9, row: 9 })).toBeNull();
  });
});

describe('nearestReachable', () => {
  it('is the target itself when it can be reached', () => {
    const m = map(['...']);
    expect(nearestReachable(m, { col: 0, row: 0 }, { col: 2, row: 0 })).toEqual({ col: 2, row: 0 });
  });

  it('is the nearest open tile when the target is solid', () => {
    const m = map([
      '.....', //
      '.###.',
      '.....',
    ]);
    expect(nearestReachable(m, { col: 0, row: 0 }, { col: 2, row: 1 })).toEqual({ col: 2, row: 0 });
  });

  it('is the nearest tile on this side when the target is shut off', () => {
    const m = map([
      '...#..', //
      '...#..',
    ]);
    expect(nearestReachable(m, { col: 0, row: 0 }, { col: 5, row: 1 })).toEqual({ col: 2, row: 1 });
  });

  it('is nothing for a walker standing inside a wall', () => {
    expect(nearestReachable(map(['#.']), { col: 0, row: 0 }, { col: 1, row: 0 })).toBeNull();
  });
});

describe('route', () => {
  it('walks straight across open ground', () => {
    const m = map(['.....', '.....', '.....']);
    const from = centreOf({ col: 0, row: 0 });
    expect(route(m, from, centreOf({ col: 4, row: 2 }))).toEqual([centreOf({ col: 4, row: 2 })]);
  });

  it('turns at the gap rather than stepping along the grid', () => {
    const m = map([
      '.....', //
      '####.',
      '.....',
    ]);
    const legs = route(m, centreOf({ col: 0, row: 0 }), centreOf({ col: 0, row: 2 }));
    expect(legs.at(-1)).toEqual(centreOf({ col: 0, row: 2 }));
    expect(legs.length).toBeLessThanOrEqual(3);
    let at = centreOf({ col: 0, row: 0 });
    for (const leg of legs) {
      expect(clearLine(m, at, leg)).toBe(true);
      at = leg;
    }
  });

  it('goes as near as it can to a tap on a solid tile or off the map', () => {
    const m = map(['...#']);
    expect(route(m, centreOf({ col: 0, row: 0 }), { x: 3.5 * TILE, y: 8 })).toEqual([
      centreOf({ col: 2, row: 0 }),
    ]);
    expect(route(m, centreOf({ col: 0, row: 0 }), { x: -50, y: 900 })).toEqual([]);
  });

  it('finds its way round the town’s buildings to the end of the pier', () => {
    const { map } = town2Scene();
    const end = centreOf({ col: 29, row: 77 }, TOWN2_TILE);
    const legs = route(map, centreOf(TOWN2_START_CELL, TOWN2_TILE), end);
    expect(legs.at(-1)).toEqual(end);
    let at = centreOf(TOWN2_START_CELL, TOWN2_TILE);
    for (const leg of legs) {
      expect(clearLine(map, at, leg)).toBe(true);
      at = leg;
    }
  });
});

describe('clearLine', () => {
  it('is blocked by a wall in the way and by a corner the feet would clip', () => {
    const m = map([
      '...', //
      '.#.',
      '...',
    ]);
    expect(clearLine(m, centreOf({ col: 0, row: 1 }), centreOf({ col: 2, row: 1 }))).toBe(false);
    expect(clearLine(m, centreOf({ col: 0, row: 0 }), centreOf({ col: 2, row: 2 }))).toBe(false);
    expect(clearLine(m, centreOf({ col: 0, row: 0 }), centreOf({ col: 2, row: 0 }))).toBe(true);
  });
});

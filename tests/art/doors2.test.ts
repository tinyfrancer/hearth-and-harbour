import { describe, expect, it } from 'vitest';
import {
  DOOR2_FOOTPRINTS,
  DUNGEON2_TILE,
  doorFootprint2,
  dungeonDoor2,
  dungeonTile2,
} from '../../src/art/dungeonArt2';
import { matOf } from '../../src/art/dungeon2/cave';
import type { TGrid } from '../../src/art/town2/cells';

// The grotto's doors as the way onward (B13; Cody: "Dungeon doors to new
// areas too small"; docs/style-guide.md, "Doors as the way onward"): a piece
// three tiles tall over the door's cell and its neighbours, a figure high,
// open lit from beyond, barred behind iron; the single tiles by the same ids
// still drawn, as each piece's slice over the door's own cell.

const T = DUNGEON2_TILE;
const KINDS = ['door_open', 'door_barred', 'door_side_open', 'door_side_barred'] as const;
const ROOM_EAST = { n: 'wall_top', s: 'wall_top', e: 'sand', w: 'wall_top' } as const;
const ROOM_WEST = { n: 'wall_top', s: 'wall_top', e: 'wall_top', w: 'sand' } as const;

const count = (g: TGrid, mat: string) => [...g.d].filter((c) => c && matOf(c) === mat).length;

describe('door pieces', () => {
  it('stand a figure high (three tiles, 72 art pixels, against a 64-pixel hero), with their footprint as data', () => {
    for (const kind of KINDS) {
      const f = DOOR2_FOOTPRINTS[kind];
      expect(f.rows, kind).toBe(3);
      const p = dungeonDoor2(kind, ROOM_EAST, { col: 6, row: 4 })!;
      expect(p.picture.grid.h).toBe(f.rows * T);
      expect(p.picture.grid.w).toBe(f.cols * T);
      expect(p.covers.length).toBe(f.cols * f.rows);
      expect(p.covers).toContainEqual([0, 0]);
      // Drawn from the door cell's top-left by (dx, dy): the door's own cell is inside the piece.
      expect(-p.dx % T).toBe(0);
      expect(-p.dy).toBe(f.door[1] * T);
    }
    expect(dungeonDoor2('sand')).toBeNull();
  });

  it('lights an open way from beyond and leaves a barred one dark behind its iron', () => {
    for (const kind of KINDS) {
      const p = dungeonDoor2(kind, ROOM_EAST, { col: 6, row: 4 })!;
      const open = kind.endsWith('open');
      expect(!!p.light, kind).toBe(open);
      expect(p.picture.glows.length > 0, kind).toBe(open);
      // The light beyond, a lamp's warm cells, in the open door; iron bars across the barred.
      if (open) expect(count(p.picture.grid, 'lamp'), kind).toBeGreaterThan(150);
      else expect(count(p.picture.grid, 'iron'), kind).toBeGreaterThan(90);
    }
  });

  it('turns a side door to its room, mirroring its piece and its footprint', () => {
    for (const kind of ['door_side_open', 'door_side_barred'] as const) {
      const east = dungeonDoor2(kind, ROOM_EAST, { col: 6, row: 4 })!;
      const west = dungeonDoor2(kind, ROOM_WEST, { col: 6, row: 4 })!;
      expect(east.dx).toBe(-T);
      expect(west.dx).toBe(0);
      expect(doorFootprint2(kind, true).door).toEqual([0, 1]);
      // The light from beyond lies in the room, on the side away from the passage.
      if (east.light && west.light) {
        expect(east.light.x).toBeGreaterThan(east.picture.grid.w - 1);
        expect(west.light.x).toBeLessThan(0);
      }
    }
  });

  it('keeps the tile ids: each tile is its piece’s slice over the door’s own cell', () => {
    for (const kind of KINDS)
      for (const around of [ROOM_EAST, ROOM_WEST]) {
        const at = { col: 9, row: 5 };
        const tile = dungeonTile2(kind, 0, around, at)!.grid;
        const p = dungeonDoor2(kind, around, at)!;
        expect(tile.w).toBe(T);
        for (let y = 0; y < T; y++)
          for (let x = 0; x < T; x++)
            expect(tile.d[y * T + x], `${kind} ${x},${y}`).toBe(
              p.picture.grid.d[(y - p.dy) * p.picture.grid.w + x - p.dx],
            );
      }
  });
});

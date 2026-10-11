import { describe, expect, it } from 'vitest';
import type { Run } from '../../src/scene/dungeon';
import { DUNGEON } from '../../src/scene/dungeonMetrics';
import {
  BARRED_SAY_MS,
  DOOR_LIFT_MS,
  doorsOpen,
  fightArtFor,
  fightExtra,
  wayMarks,
  wayOnward,
} from '../../src/scene/fightArt';
import {
  doorPaints,
  doorPieces,
  doorUnder,
  groundCells,
  groundWithDoors,
  openGlowsOf,
  roomLook,
} from '../../src/scene/grottoArt';
import { centreOf } from '../../src/scene/tileMap';
import { GROTTO_DUNGEON as grotto, begin, prepared } from './grottoBot';

// The grotto's doors as the art lane's three-tile pieces (B13): drawn after
// the tiles and before anything standing, barred in the ground until the room
// is cleared, then open, fading in with the light from beyond; the whole
// piece a tap target, the way onward marked. Walkability is not touched: a
// door is still one cell (`grottoRules.test.ts`, `grotto.test.ts`).

const T = DUNGEON.tile;

/** A run in `room` with everything in the rooms listed dead `ago` ms ago, and their doors opened then. */
function cleared(room: string, rooms: readonly string[], ago = 5000): Run {
  const run = begin(prepared(), 7);
  const battle = run.battle!;
  const clock = 60_000;
  const opened: Record<string, number> = {};
  for (const r of rooms) opened[r] = clock - ago;
  return {
    ...run,
    room,
    battle: {
      ...battle,
      clock,
      foes: battle.foes.map((f) =>
        rooms.includes(f.room) ? { ...f, hp: 0, diedAt: clock - ago - 1000 } : f,
      ),
      opened,
    },
  };
}

describe('the doors as pieces', () => {
  it('puts every door’s piece over its cell and the rock either side, reaching out past the room’s edge', () => {
    let count = 0;
    for (const room of Object.values(grotto.rooms)) {
      const pieces = doorPieces(room);
      expect(pieces.map((p) => p.letter).sort()).toEqual(room.doors.map((d) => d.letter).sort());
      for (const p of pieces) {
        count++;
        const where = `${room.id} ${p.letter}`;
        // Two tiles across and three tall: the door's cell is the middle row.
        expect([p.box.w, p.box.h], where).toEqual([2 * T, 3 * T]);
        expect(p.box.y, where).toBe((p.cell.row - 1) * T);
        // The second column is beyond the room's edge, on the side the wall is on.
        const west = p.cell.col === 0;
        expect(p.box.x, where).toBe(west ? -T : p.cell.col * T);
        // Open: lit from beyond, its lantern burning, the light laid on the room's floor; barred: dark.
        expect(p.light, where).not.toBeNull();
        expect(p.glows.length, where).toBeGreaterThan(0);
        expect(p.barred.light, where).toBeUndefined();
        expect(p.barred.picture.glows, where).toHaveLength(0);
        const floorX = west ? p.light!.x > 0 : p.light!.x < room.ground.cols * T;
        expect(floorX, `${where}: the light falls inside the room`).toBe(true);
      }
    }
    expect(count).toBe(8);
  });

  it('paints the ground with its doors barred, and lights it from beyond only where they open', () => {
    const store = grotto.rooms.store!;
    const barred = groundCells(store, 0, false);
    const open = groundCells(store, 0, false, true);
    let near = 0;
    for (let y = 0; y < barred.h; y++)
      for (let x = 0; x < barred.w; x++) {
        const i = y * barred.w + x;
        if (barred.d[i] === open.d[i]) continue;
        // Every change is within a few tiles of a door.
        const nearest = Math.min(
          ...store.doors.map((d) =>
            Math.hypot(x - (d.cell.col * T + T / 2), y - (d.cell.row * T + T / 2)),
          ),
        );
        expect(nearest).toBeLessThan(4 * T);
        near++;
      }
    expect(near).toBeGreaterThan(500);
    // The door's own cell differs: iron and the dark behind it, or the light from beyond.
    const d = store.doors[0]!;
    const i = (d.cell.row * T + T / 2) * barred.w + d.cell.col * T + 4;
    expect(barred.d[i]).not.toBe(open.d[i]);
  });

  it('gives each door its cells barred and open over a box holding everything the open door changes', () => {
    for (const room of Object.values(grotto.rooms)) {
      const { cells, doors } = groundWithDoors(room, 0, false);
      const open = groundCells(room, 0, false, true);
      expect(cells.d).toEqual(groundCells(room, 0, false).d);
      expect(doors).toHaveLength(room.doors.length);
      const covered = new Uint8Array(cells.w * cells.h);
      const wrong: string[] = [];
      for (const p of doors) {
        const piece = doorPieces(room).find((d) => d.letter === p.letter)!;
        // It holds the whole piece.
        expect(p.box.x).toBeLessThanOrEqual(piece.box.x);
        expect(p.box.x + p.box.w).toBeGreaterThanOrEqual(piece.box.x + piece.box.w);
        let outside = 0;
        for (let j = 0; j < p.box.h; j++)
          for (let i = 0; i < p.box.w; i++) {
            const x = p.box.x + i;
            const y = p.box.y + j;
            const b = p.barred.d[j * p.box.w + i]!;
            const o = p.open.d[j * p.box.w + i]!;
            if (x >= 0 && x < cells.w) {
              // Inside the room, exactly the ground as painted each way.
              if (b !== cells.d[y * cells.w + x] || o !== open.d[y * cells.w + x])
                wrong.push(`${p.letter} ${x},${y}`);
              covered[y * cells.w + x] = 1;
            } else if (b || o) {
              outside++;
              // Past the edge, only the passage and its jambs: nothing above or below the opening's rows.
              if (y <= piece.box.y + 4 || y >= piece.box.y + piece.box.h - 4)
                wrong.push(`${p.letter} off the map ${x},${y}`);
            }
          }
        expect(
          outside,
          `${room.id} ${p.letter}: the passage runs on past the edge`,
        ).toBeGreaterThan(200);
      }
      // Nothing the open doors change is left outside the boxes.
      for (let i = 0; i < cells.d.length; i++)
        if (cells.d[i] !== open.d[i] && !covered[i]) wrong.push(`uncovered ${i}`);
      expect(wrong.slice(0, 5), room.id).toEqual([]);
    }
  }, 120_000);

  it('works out a door’s cells the same from a painter that leaves them out', () => {
    const pools = grotto.rooms.pools!;
    const look = roomLook(pools, {
      paint: (room, s, _urgent, done) => done(groundCells(room, s.level, s.warn), null),
    });
    look.forget();
    look.paintNow(0, false);
    expect(look.doorsAt(0, false).map((d) => d.box)).toEqual(
      doorPaints(pools, groundCells(pools, 0, false), groundCells(pools, 0, false, true)).map(
        (d) => d.box,
      ),
    );
    // With the doors open, the ground under a contact shadow is the open ground.
    const openCells = look.cellsAt(0, false, true)!;
    expect(openCells.d).toEqual(groundCells(pools, 0, false, true).d);
    look.forget();
  });

  it('lights whoever goes by an open door with its glows too', () => {
    const room = grotto.rooms.bridge!;
    const glows = openGlowsOf(room);
    expect(glows).toBe(openGlowsOf(room));
    expect(glows.length).toBe(roomLook(room).glows.length + 4);
  });
});

describe('the door as a tap target', () => {
  it('is the whole piece, past the room’s edge too, grown to a thumb where it is smaller', () => {
    for (const room of Object.values(grotto.rooms))
      for (const p of doorPieces(room)) {
        for (let y = p.box.y; y < p.box.y + p.box.h; y += 3)
          for (let x = p.box.x; x < p.box.x + p.box.w; x += 3)
            expect(doorUnder(room, { x, y })?.letter, `${room.id} ${x},${y}`).toBe(p.letter);
        // Two tiles into the room is the floor, not the door.
        const inward = p.cell.col === 0 ? 1 : -1;
        expect(
          doorUnder(room, centreOf({ col: p.cell.col + 2 * inward, row: p.cell.row }, T)),
        ).toBe(null);
        // A thumb's width at the edge of a tall piece still finds it.
        expect(doorUnder(room, { x: p.box.x - 6, y: p.box.y + 30 }, 2 * T + 12)?.letter).toBe(
          p.letter,
        );
      }
  });
});

describe('the way onward', () => {
  it('fades the doors open from barred over a moment once the room is clear', () => {
    const shut = begin(prepared(), 3);
    expect(doorsOpen(shut.battle!, 'pools')).toBe(0);
    const just = cleared('pools', ['pools'], 0);
    expect(doorsOpen(just.battle!, 'pools')).toBe(0);
    const half = cleared('pools', ['pools'], DOOR_LIFT_MS / 2);
    expect(doorsOpen(half.battle!, 'pools')).toBeCloseTo(0.5);
    expect(doorsOpen(cleared('pools', ['pools'], DOOR_LIFT_MS * 3).battle!, 'pools')).toBe(1);
  });

  it('marks only the door to a room not yet cleared, and none while shut or in the last room', () => {
    expect(wayOnward(grotto, begin(prepared(), 3))).toEqual([]);
    expect(wayOnward(grotto, cleared('pools', ['pools'])).map((d) => d.letter)).toEqual(['a']);
    // In the store with the pools behind: the way on is b, not back through a.
    expect(wayOnward(grotto, cleared('store', ['pools', 'store'])).map((d) => d.letter)).toEqual([
      'b',
    ]);
    expect(
      wayOnward(grotto, cleared('cove', ['pools', 'store', 'bridge', 'brig', 'cove'])),
    ).toEqual([]);
  });

  it('points to the door from the screen’s edge while it is off the screen', () => {
    const run = cleared('store', ['pools', 'store']);
    // The camera on the store's west end: door b (east) is off the screen.
    const view = { x: 0, y: 0, w: 300, h: 312 };
    const marks = wayMarks(grotto, run, view);
    expect(marks.edges).toHaveLength(1);
    expect(marks.edges[0]!.x).toBeLessThanOrEqual(view.x + view.w);
    expect(marks.edges[0]!.x).toBeGreaterThan(view.w / 2);
    // On the screen: no edge arrow.
    expect(wayMarks(grotto, run, { x: 500, y: 0, w: 340, h: 312 }).edges).toHaveLength(0);
  });

  it('draws the marks, the doors and a barred door’s word inside what it says it draws', () => {
    const store = grotto.rooms.store!;
    const look = roomLook(store);
    look.paintNow(0, false);
    const art = fightArtFor(look);
    // Fading open: the doors' boxes are drawn again each frame, and the way onward is in the overlay.
    const opening = cleared('store', ['pools', 'store'], DOOR_LIFT_MS / 2);
    const extra = fightExtra(grotto, opening, look, art);
    for (const d of look.doorsAt(0, false)) expect(extra.boxes).toContainEqual(d.box);
    const b = store.doors.find((d) => d.letter === 'b')!;
    const box = extra.overlayBox!;
    const c = centreOf(b.cell, T);
    expect(c.x).toBeGreaterThanOrEqual(box.x);
    expect(c.x).toBeLessThanOrEqual(box.x + box.w);
    // Put in place already open (a run taken up, a jump): drawn again on that frame...
    const settled = cleared('store', ['pools', 'store']);
    const first = fightExtra(grotto, settled, look, art);
    for (const d of look.doorsAt(0, false)) expect(first.boxes).toContainEqual(d.box);
    // ... and once open and settled, not again.
    const open = fightExtra(grotto, settled, look, art);
    for (const d of look.doorsAt(0, false)) expect(open.boxes).not.toContainEqual(d.box);
    // A barred door tapped says so for a moment, over it.
    const shut = { ...begin(prepared(), 3), room: 'store' };
    const at = shut.battle!.clock;
    const said = fightExtra(grotto, shut, look, art, { barredTap: { letter: 'b', at } });
    const plain = fightExtra(grotto, shut, look, art);
    expect(said.overlayBox).not.toEqual(plain.overlayBox);
    expect(said.overlayBox!.x + said.overlayBox!.w).toBeGreaterThanOrEqual(c.x);
    // ... and is gone once its moment is over.
    const later = { ...shut, battle: { ...shut.battle!, clock: at + BARRED_SAY_MS } };
    expect(
      fightExtra(grotto, later, look, art, { barredTap: { letter: 'b', at } }).overlayBox,
    ).toEqual(fightExtra(grotto, later, look, art).overlayBox);
    look.forget();
  }, 60_000);
});

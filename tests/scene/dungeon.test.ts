import { describe, expect, it } from 'vitest';
import { get } from '../../src/art/grid';
import {
  DOOR_FADE_MS,
  advanceRun,
  atEnd,
  buildDungeon,
  doorAt,
  doorwayDark,
  paintRoom,
  roomScene,
  runTime,
  sideways,
  startRun,
  type Run,
} from '../../src/scene/dungeon';
import { GROTTO } from '../../src/scene/grotto';
import { cheapest } from '../../src/scene/path';
import type { Play } from '../../src/scene/play';
import { dungeonScale, sceneScale } from '../../src/scene/scale';
import { TILE, centreOf, isSolid } from '../../src/scene/tileMap';

const grotto = buildDungeon(GROTTO);
const rooms = Object.values(grotto.rooms);

/** The run's walker put at `cell`, as if he had walked there. */
const standingAt = (run: Run, col: number, row: number): Play => ({
  ...run.play,
  walker: { at: centreOf({ col, row }), path: [] },
});

describe('the grotto’s rooms and doors', () => {
  it('has three rooms, wider than they are tall, for a phone on its side', () => {
    expect(rooms).toHaveLength(3);
    for (const room of rooms) expect(room.map.cols).toBeGreaterThan(room.map.rows);
  });

  it('leads every door somewhere, and back through the matching door', () => {
    for (const room of rooms) {
      for (const door of room.doors) {
        const there = grotto.rooms[door.to]!;
        const back = there.doors.find((d) => d.letter === door.letter)!;
        expect(back, `${room.id} ${door.letter}`).toBeDefined();
        expect(back.to).toBe(room.id);
        // Who comes through stands on open floor just inside, not on the door.
        expect(isSolid(there.map, back.inside)).toBe(false);
        expect(doorAt(there, centreOf(back.inside))).toBeNull();
      }
    }
  });

  it('can be walked from the boat to the end: every door reachable from where you come in', () => {
    const landing = grotto.rooms[grotto.first]!;
    expect(landing.start).not.toBeNull();
    for (const room of rooms) {
      const from = room.start ?? room.doors[0]!.inside;
      for (const door of room.doors) {
        expect(
          cheapest(room.map, centreOf(from), [door.cell]),
          `${room.id} ${door.letter}`,
        ).toEqual(door.cell);
      }
      if (room.end) expect(cheapest(room.map, centreOf(from), [room.end])).toEqual(room.end);
    }
    expect(rooms.filter((r) => r.end)).toHaveLength(1);
  });

  it('refuses a plan with a door to nowhere, or a door with no floor beside it', () => {
    const plan = (rooms: Record<string, string[]>) => ({ id: 't', first: 'a', rooms });
    expect(() => buildDungeon(plan({ a: ['###', '#sb', '###'] }))).toThrow(/not two/);
    expect(() =>
      buildDungeon(plan({ a: ['###', '#sb', '###'], b: ['#b#', '#~#', '###'] })),
    ).toThrow(/open tile/);
    expect(() => buildDungeon(plan({ a: ['###', '#s?', '###'] }))).toThrow(/Unknown tile/);
  });

  it('paints doors, rock faces and the marked spot in flat placeholder colours', () => {
    const cove = grotto.rooms.cove!;
    const g = paintRoom(cove);
    const door = cove.doors[0]!.cell;
    expect(get(g, door.col * TILE + 8, door.row * TILE + 8)).toBe('navy2');
    const end = centreOf(cove.end!);
    expect(get(g, end.x + 6, end.y)).toBe('gold2');
    // Rock that stands above floor shows its face.
    expect(get(g, 8, 0 * TILE + TILE - 1)).toBe('slate3');
    expect(get(g, 8 * TILE + 8, TILE - 1)).toBe('slate2');
  });

  it('casts the hero’s shadow on floor, not on water or in a doorway', () => {
    const { art } = roomScene(grotto.rooms.landing!);
    expect(art.shadowAt(centreOf({ col: 10, row: 4 }))).not.toBeNull();
    expect(art.shadowAt(centreOf({ col: 2, row: 4 }))).toBeNull();
    expect(art.shadowAt(centreOf({ col: 23, row: 4 }))).toBeNull();
    expect(roomScene(grotto.rooms.landing!)).toBe(roomScene(grotto.rooms.landing!));
  });
});

describe('a run', () => {
  it('starts in the first room where the boat puts you ashore, with nothing on the clock', () => {
    const run = startRun(grotto);
    expect(run.room).toBe('landing');
    expect(run.play.walker.at).toEqual(centreOf(grotto.rooms.landing!.start!));
    expect(run.ms).toBe(0);
    expect(run.finished).toBe(false);
  });

  it('goes through a door: dark, then the next room with the hero at the matching door', () => {
    const run = startRun(grotto);
    const door = grotto.rooms.landing!.doors[0]!;
    const walking = { ...standingAt(run, door.cell.col, door.cell.row) };
    const stepped = advanceRun(grotto, run, walking, 16);
    expect(stepped.doorway).toEqual({ room: 'pools', door: 'a', ms: 0 });
    expect(stepped.room).toBe('landing');
    expect(doorwayDark(stepped.doorway)).toBe(0);

    const half = advanceRun(grotto, stepped, stepped.play, DOOR_FADE_MS);
    expect(half.room).toBe('pools');
    const inside = grotto.rooms.pools!.doors.find((d) => d.letter === 'a')!.inside;
    expect(half.play.walker.at).toEqual(centreOf(inside));
    // Coming in from the west door, facing into the room.
    expect(half.play.facing).toBe('right');
    expect(doorwayDark(half.doorway)).toBe(1);

    const done = advanceRun(grotto, half, half.play, DOOR_FADE_MS);
    expect(done.doorway).toBeNull();
    expect(done.ms).toBe(16 + 2 * DOOR_FADE_MS);
  });

  it('ends at the marked spot and stops its clock there', () => {
    const run: Run = { ...startRun(grotto), room: 'cove' };
    const end = grotto.rooms.cove!.end!;
    expect(atEnd(grotto.rooms.cove!, centreOf(end))).toBe(true);
    const finished = advanceRun(grotto, run, standingAt(run, end.col, end.row), 500);
    expect(finished.finished).toBe(true);
    expect(finished.ms).toBe(500);
    expect(advanceRun(grotto, finished, finished.play, 10_000).ms).toBe(500);
  });

  it('gives its time in minutes and seconds', () => {
    expect(runTime(0)).toBe('0:00');
    expect(runTime(65_400)).toBe('1:05');
    expect(runTime(10 * 60_000)).toBe('10:00');
  });
});

describe('played sideways', () => {
  it('begins only when the screen is wider than it is tall', () => {
    expect(sideways({ width: 844, height: 390 })).toBe(true);
    expect(sideways({ width: 390, height: 844 })).toBe(false);
    expect(sideways({ width: 500, height: 500 })).toBe(false);
    expect(sideways({ width: 0, height: 0 })).toBe(false);
  });

  it('keeps the hero the size he was in town when the phone is turned', () => {
    // 390 x 844 at 3x, turned: the town's scale for the short side.
    expect(dungeonScale({ width: 2532, height: 1170 })).toBe(
      sceneScale({ width: 1170, height: 2532 }),
    );
    expect(dungeonScale({ width: 2532, height: 1170 })).toBe(4);
    expect(dungeonScale({ width: 1334, height: 750 })).toBe(2);
    expect(dungeonScale({ width: 200, height: 100 })).toBe(1);
  });
});

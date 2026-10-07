import { describe, expect, it } from 'vitest';
import {
  DOOR_FADE_MS,
  advanceRun,
  atEnd,
  buildDungeon,
  doorAt,
  doorwayDark,
  runTime,
  sideways,
  startRun,
  type DungeonPlan,
  type Run,
} from '../../src/scene/dungeon';
import { groundMap } from '../../src/scene/ground';
import { GROTTO } from '../../src/scene/grotto';
import { DUNGEON } from '../../src/scene/dungeonMetrics';
import { CaveShadow, groundCells, propsOf, roomLook, tileKindsAt } from '../../src/scene/grottoArt';
import { cheapest } from '../../src/scene/path';
import type { Play } from '../../src/scene/play';
import { dungeonScale, sceneScale } from '../../src/scene/scale';
import { centreOf, isSolid } from '../../src/scene/tileMap';
import { TOWN2_SCENE } from '../../src/scene/town2Place';

const grotto = buildDungeon(GROTTO);
const rooms = Object.values(grotto.rooms);
/** A tile's side in the dungeons. */
const T = DUNGEON.tile;

/** The run's walker put at `cell`, as if he had walked there. */
const standingAt = (run: Run, col: number, row: number): Play => ({
  ...run.play,
  walker: { at: centreOf({ col, row }, T), path: [] },
});

describe('the grotto’s rooms and doors', () => {
  it('leads every door somewhere, and back through the matching door', () => {
    for (const room of rooms) {
      for (const door of room.doors) {
        const there = grotto.rooms[door.to]!;
        const back = there.doors.find((d) => d.letter === door.letter)!;
        expect(back, `${room.id} ${door.letter}`).toBeDefined();
        expect(back.to).toBe(room.id);
        // Who comes through stands on open floor just inside, not on the door.
        expect(isSolid(there.map, back.inside)).toBe(false);
        expect(doorAt(there, centreOf(back.inside, T))).toBeNull();
      }
    }
  });

  it('can be walked from the boat to the end: every door reachable from where you come in', () => {
    const first = grotto.rooms[grotto.first]!;
    expect(first.start).not.toBeNull();
    for (const room of rooms) {
      const from = room.start ?? room.doors[0]!.inside;
      for (const door of room.doors) {
        expect(
          cheapest(room.map, centreOf(from, T), [door.cell]),
          `${room.id} ${door.letter}`,
        ).toEqual(door.cell);
      }
      if (room.end) expect(cheapest(room.map, centreOf(from, T), [room.end])).toEqual(room.end);
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

  it('refuses someone standing in a wall, a flier off its perch, or foes in a room that is not there', () => {
    const plan = (foes: DungeonPlan['foes'], perches?: DungeonPlan['perches']) => ({
      id: 't',
      first: 'a',
      rooms: { a: ['#####', '#s.~#', '#####'] },
      foes,
      ...(perches ? { perches } : {}),
    });
    expect(() =>
      buildDungeon(plan({ a: [{ monster: 'dock_rat', at: { col: 0, row: 0 } }] })),
    ).toThrow(/not standing on floor/);
    expect(() =>
      buildDungeon(plan({ a: [{ monster: 'deckhand', at: { col: 3, row: 1 } }] })),
    ).toThrow(/not standing on floor/);
    expect(() =>
      buildDungeon(plan({ a: [{ monster: 'ships_parrot', at: { col: 3, row: 1 } }] })),
    ).toThrow(/not on a perch/);
    expect(() =>
      buildDungeon(
        plan(
          { a: [{ monster: 'ships_parrot', at: { col: 3, row: 1 } }] },
          { a: [{ col: 3, row: 1 }] },
        ),
      ),
    ).not.toThrow();
    expect(() => buildDungeon(plan({ b: [] }))).toThrow(/not a room/);
  });

  it('bars a room’s doors on its shut ground, and leaves the rest as it was', () => {
    const store = grotto.rooms.store!;
    const door = store.doors[0]!;
    expect(isSolid(store.shut, door.cell)).toBe(true);
    expect(isSolid(store.map, door.cell)).toBe(false);
    expect(isSolid(store.shut, door.inside)).toBe(false);
    // The stage walks on whatever ground the view says is under the room now.
    const look = roomLook(store);
    look.lock.map = store.shut;
    expect(look.scene.map).toBe(store.shut);
    look.lock.map = groundMap(store.ground, { level: 3, shut: false, released: 0 });
    expect(isSolid(look.scene.map, door.cell)).toBe(false);
  });
});

describe('how a room looks', () => {
  const pools = grotto.rooms.pools!;

  it('stands its walls two tiles tall over the floor, and draws open doors as doorways', () => {
    const kinds = tileKindsAt(pools, 0, false);
    // Rock with nothing open below it is the rock's top.
    expect(kinds[0]![0]).toBe('wall_top');
    // Over the floor: the face, and the face's upper half above it.
    expect(kinds[1]![5]).toBe('wall_face');
    expect(kinds[0]![5]).toBe('wall_face_high');
    const door = pools.doors[0]!.cell;
    expect(kinds[door.row]![door.col]).toBe('door_open');
    // The rock over a door in a side wall is the upper half of a face, as the art lane's rule has it.
    expect(kinds[door.row - 1]![door.col]).toBe('wall_face_high');
  });

  it('shows the tide: the sandbar dry at low water, shallows, then sea; wet before it floods', () => {
    const bar = { col: 22, row: 6 };
    const kind = (level: number, warn: boolean) =>
      tileKindsAt(pools, level, warn)[bar.row]![bar.col];
    expect(kind(0, false)).toBe('sand');
    // The sea about to come in: the sand it will cover darkens first.
    expect(kind(0, true)).toBe('wet_sand');
    expect(kind(1, false)).toBe('shallows');
    expect(kind(2, false)).toBe('deep_water');
    // Ground the tide never reaches never darkens.
    expect(tileKindsAt(pools, 0, true)[6]![2]).toBe('sand');
    const low = groundCells(pools, 0, false);
    const high = groundCells(pools, 3, false);
    expect([low.w, low.h]).toEqual([pools.ground.cols * T, pools.ground.rows * T]);
    expect(low.d).not.toEqual(high.d);
  });

  it('works each tide’s ground out once, and every one of them can be asked for ahead', () => {
    const look = roomLook(pools);
    // Four levels, and a warning before each of the three rises.
    expect(look.states).toHaveLength(7);
    look.forget();
    expect(look.ready(1, false)).toBe(false);
    look.warm();
    for (const s of look.states) expect(look.ready(s.level, s.warn)).toBe(true);
    expect(look.cellsAt(1, false)).toBe(look.cellsAt(1, false));
    expect(look.cellsAt(1, true)).not.toBe(look.cellsAt(1, false));
    // Lit by its lanterns: one glow each.
    expect(look.glows.length).toBe(pools.ground.lanterns.length);
    look.forget();
    expect(look.ready(1, false)).toBe(false);
  });

  it('stands its props and lanterns in the room on their feet', () => {
    const store = grotto.rooms.store!;
    const props = propsOf(store);
    const kegs = props.filter((p) => p.id === 'powder_keg');
    expect(kegs.length).toBe(store.ground.props.filter((p) => p.id === 'powder_keg').length);
    expect(props.some((p) => p.id === 'lantern')).toBe(true);
    // Every prop stands on its foot, as the art lane marks it.
    for (const p of props) {
      expect(p.topLeft.x + p.art.foot).toBe(p.feet.x);
      expect(p.topLeft.y + p.art.base).toBe(p.feet.y);
    }
    // jsdom paints nothing: a shadow is null here; the cells it darkens are in `grottoArt.test.ts`.
    const shadow = new CaveShadow();
    const cells = groundCells(store, 3, false);
    expect(() =>
      shadow.at(cells, tileKindsAt(store, 3, false), [], centreOf({ col: 5, row: 4 }, T), 11),
    ).not.toThrow();
  });

  it('bars a room’s doors on its shut ground, and leaves the rest as it was', () => {
    const store = grotto.rooms.store!;
    const door = store.doors[0]!;
    expect(isSolid(store.shut, door.cell)).toBe(true);
    expect(isSolid(store.map, door.cell)).toBe(false);
    expect(isSolid(store.shut, door.inside)).toBe(false);
    // The stage walks on whatever ground the view says is under the room now.
    const look = roomLook(store);
    look.lock.map = store.shut;
    expect(look.scene.map).toBe(store.shut);
    look.lock.map = groundMap(store.ground, { level: 3, shut: false, released: 0 });
    expect(isSolid(look.scene.map, door.cell)).toBe(false);
  });
});

describe('a run', () => {
  it('starts in the first room where the boat puts you ashore, with nothing on the clock', () => {
    const run = startRun(grotto);
    expect(run.room).toBe('pools');
    expect(run.play.walker.at).toEqual(centreOf(grotto.rooms.pools!.start!, T));
    expect(run.ms).toBe(0);
    expect(run.finished).toBe(false);
  });

  it('goes through a door: dark, then the next room with the hero at the matching door', () => {
    const run = startRun(grotto);
    const door = grotto.rooms.pools!.doors[0]!;
    const walking = { ...standingAt(run, door.cell.col, door.cell.row) };
    const stepped = advanceRun(grotto, run, walking, 16);
    expect(stepped.doorway).toEqual({ room: 'store', door: 'a', ms: 0 });
    expect(stepped.room).toBe('pools');
    expect(doorwayDark(stepped.doorway)).toBe(0);

    const half = advanceRun(grotto, stepped, stepped.play, DOOR_FADE_MS);
    expect(half.room).toBe('store');
    const inside = grotto.rooms.store!.doors.find((d) => d.letter === 'a')!.inside;
    expect(half.play.walker.at).toEqual(centreOf(inside, T));
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
    expect(atEnd(grotto.rooms.cove!, centreOf(end, T))).toBe(true);
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
    const scale = (device: { width: number; height: number }) =>
      dungeonScale(device, DUNGEON.scene.width);
    // 390 x 844 at 3x, turned: the town's scale for the short side.
    expect(scale({ width: 2532, height: 1170 })).toBe(
      sceneScale({ width: 1170, height: 2532 }, TOWN2_SCENE),
    );
    expect(scale({ width: 2532, height: 1170 })).toBe(3);
    expect(scale({ width: 1334, height: 750 })).toBe(2);
    expect(scale({ width: 200, height: 100 })).toBe(1);
  });
});

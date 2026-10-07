import { describe, expect, it } from 'vitest';
import { CONTENT } from '../../src/data';
import { GROTTO_CAST } from '../../src/scene/cast';
import { buildDungeon, type Room } from '../../src/scene/dungeon';
import { FOE_KINDS } from '../../src/scene/foes';
import { groundMap, standable, type RoomTile } from '../../src/scene/ground';
import { GROTTO } from '../../src/scene/grotto';
import { PROP_LETTERS } from '../../src/scene/ground';
import { MELEE_REACH, shoreOf } from '../../src/scene/battle';
import { DUNGEON } from '../../src/scene/dungeonMetrics';
import { HIGH_WATER } from '../../src/scene/tide';
import { centreOf, inMap, isSolid, type Cell, type TileMap } from '../../src/scene/tileMap';

const grotto = buildDungeon(GROTTO);
const ORDER = ['pools', 'store', 'bridge', 'brig', 'cove'];
const rooms = ORDER.map((id) => grotto.rooms[id]!);
const LEVELS = [0, 1, 2, 3];
/** A tile's side in the dungeons. */
const T = DUNGEON.tile;

/** The room's ground at a level of the tide, every cell open, doors as given. */
const at = (room: Room, level: number, shut = false): TileMap<RoomTile> =>
  groundMap(room.ground, { level, shut, released: room.ground.bars.length });

/** Every open, standable tile reachable from `from` (4-way, as near as walking gets). */
function reachable(map: TileMap<RoomTile>, from: Cell): Set<string> {
  const seen = new Set<string>();
  if (isSolid(map, from)) return seen;
  const queue: Cell[] = [from];
  seen.add(`${from.col} ${from.row}`);
  while (queue.length > 0) {
    const c = queue.shift()!;
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const n = { col: c.col + dc, row: c.row + dr };
      const key = `${n.col} ${n.row}`;
      if (!inMap(map, n) || seen.has(key) || isSolid(map, n)) continue;
      seen.add(key);
      queue.push(n);
    }
  }
  return seen;
}

/** Every standable tile of a map. */
function standing(map: TileMap<RoomTile>): Cell[] {
  const cells: Cell[] = [];
  map.tiles.forEach((line, row) =>
    line.forEach((t, col) => {
      if (standable(t) && !isSolid(map, { col, row })) cells.push({ col, row });
    }),
  );
  return cells;
}

/** How many steps the walk from one cell to another takes, or Infinity. */
function steps(map: TileMap<RoomTile>, from: Cell, to: Cell): number {
  const dist = new Map<string, number>([[`${from.col} ${from.row}`, 0]]);
  const queue: Cell[] = [from];
  while (queue.length > 0) {
    const c = queue.shift()!;
    const d = dist.get(`${c.col} ${c.row}`)!;
    if (c.col === to.col && c.row === to.row) return d;
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const n = { col: c.col + dc, row: c.row + dr };
      const key = `${n.col} ${n.row}`;
      if (!inMap(map, n) || dist.has(key) || isSolid(map, n)) continue;
      dist.set(key, d + 1);
      queue.push(n);
    }
  }
  return Infinity;
}

describe('Brinebeard’s Grotto, room by room', () => {
  it('has five rooms joined in order, from the boat to the cove', () => {
    expect(Object.keys(grotto.rooms).sort()).toEqual([...ORDER].sort());
    expect(grotto.first).toBe('pools');
    ORDER.forEach((id, i) => {
      const room = grotto.rooms[id]!;
      const leads = room.doors.map((d) => d.to).sort();
      const expected = [ORDER[i - 1], ORDER[i + 1]].filter((r): r is string => !!r).sort();
      expect(leads, id).toEqual(expected);
      // Each through a matching door, back the way it came.
      for (const door of room.doors) {
        const back = grotto.rooms[door.to]!.doors.find((d) => d.letter === door.letter)!;
        expect(back.to).toBe(id);
      }
    });
    expect(rooms.filter((r) => r.end).map((r) => r.id)).toEqual(['cove']);
    expect(grotto.rooms.pools!.start).not.toBeNull();
  });

  it('is drawn for a phone on its side: wider than tall, and short enough to see top to bottom', () => {
    for (const room of rooms) {
      expect(room.map.cols, room.id).toBeGreaterThan(room.map.rows);
      expect(room.map.rows, room.id).toBeLessThanOrEqual(14);
    }
  });

  it('gives every room a name', () => {
    for (const room of rooms) expect(room.title, room.id).toBeTruthy();
  });

  it('keeps the way in and out of every room dry at any tide', () => {
    for (const room of rooms) {
      for (const level of LEVELS) {
        const map = at(room, level);
        for (const door of room.doors)
          expect(map.tiles[door.inside.row]![door.inside.col], `${room.id} ${level}`).not.toBe(
            'water',
          );
        if (room.start) expect(isSolid(map, room.start)).toBe(false);
      }
    }
  });

  it('can be walked from any door to every other and to the end at low water', () => {
    for (const room of rooms) {
      const map = at(room, 0);
      const from = room.start ?? room.doors[0]!.inside;
      const all = reachable(map, from);
      for (const door of room.doors)
        expect(all.has(`${door.cell.col} ${door.cell.row}`), `${room.id} ${door.letter}`).toBe(
          true,
        );
      if (room.end) expect(all.has(`${room.end.col} ${room.end.row}`)).toBe(true);
      // Nowhere to stand is cut off: all of it is one floor at low water.
      expect(standing(map).length, room.id).toBe(all.size);
    }
  });

  it('strands nobody: whatever is dry at a higher tide is dry at low water, which always comes back', () => {
    for (const room of rooms) {
      for (const level of LEVELS) {
        for (const cell of standing(at(room, level))) {
          // The ground only gets wetter as the water rises, so anywhere he stands at
          // a high tide joins the low-water floor once the sea goes out again.
          expect(standable(at(room, 0).tiles[cell.row]![cell.col]), `${room.id} ${level}`).toBe(
            true,
          );
        }
      }
    }
  });

  it('washes anyone on covered ground to somewhere to stand, never far, at every rise', () => {
    for (const room of rooms) {
      for (const level of LEVELS.slice(1)) {
        const before = at(room, level - 1);
        const after = at(room, level);
        for (const cell of standing(before)) {
          if (after.tiles[cell.row]![cell.col] !== 'water') continue;
          const shore = shoreOf(after, centreOf(cell, T));
          expect(shore, `${room.id} ${cell.col},${cell.row} at ${level}`).not.toBeNull();
          const d = Math.hypot(shore!.x - centreOf(cell, T).x, shore!.y - centreOf(cell, T).y);
          expect(d, `${room.id} ${cell.col},${cell.row}`).toBeLessThanOrEqual(5 * T);
        }
      }
    }
  });

  it('keeps the captain’s cove one floor at every tide, so the fight can always be reached', () => {
    const cove = grotto.rooms.cove!;
    expect(cove.ground.ownTide).toBe(true);
    for (const level of LEVELS) {
      const map = at(cove, level);
      const ground = standing(map);
      expect(reachable(map, ground[0]!).size, `level ${level}`).toBe(ground.length);
    }
    // Where he stands and where help comes in stay dry when the sea is in.
    const high = at(cove, HIGH_WATER);
    const boss = cove.foes.find((f) => f.monster === 'brinebeard')!;
    expect(high.tiles[boss.at.row]![boss.at.col]).not.toBe('water');
    for (const p of cove.spawns) {
      const c = { col: Math.floor(p.x / T), row: Math.floor(p.y / T) };
      expect(high.tiles[c.row]![c.col]).toMatch(/floor|sand|planks/);
    }
    // At high water only the middle is left: under half the beach is still dry.
    const dry = (m: TileMap<RoomTile>) =>
      standing(m).filter((c) => m.tiles[c.row]![c.col] !== 'shallows').length;
    expect(dry(high)).toBeLessThan(dry(at(cove, 0)) * 0.7);
  });

  it('makes the tide matter in every room: high water takes away ground', () => {
    for (const room of rooms) {
      const low = standing(at(room, 0)).length;
      const high = standing(at(room, HIGH_WATER)).length;
      expect(low - high, room.id).toBeGreaterThanOrEqual(15);
    }
  });

  it('opens the short ways at low water: the sandbar in the pools, the sandbars under the bridge', () => {
    const pools = grotto.rooms.pools!;
    const start = pools.start!;
    const exit = pools.doors[0]!.inside;
    expect(steps(at(pools, 0), start, exit)).toBeLessThan(
      steps(at(pools, HIGH_WATER), start, exit),
    );
    // Under the bridge: a way over below it only at low water.
    const bridge = grotto.rooms.bridge!;
    const below = { col: 8, row: 10 };
    const far = { col: 30, row: 10 };
    expect(steps(at(bridge, 0), below, far)).toBeLessThan(Infinity);
    expect(steps(at(bridge, 1), below, far)).toBe(Infinity);
    // ...and only then to within a blade's reach of the parrot's lower perch.
    const perch = bridge.perches[1]!;
    const nearest = (level: number) =>
      Math.min(
        ...standing(at(bridge, level)).map((c) =>
          Math.hypot(centreOf(c, T).x - perch.x, centreOf(c, T).y - perch.y),
        ),
      );
    expect(nearest(0)).toBeLessThanOrEqual(MELEE_REACH);
    expect(nearest(1)).toBeGreaterThan(MELEE_REACH);
  });

  it('puts its cast on their feet, its parrot on a perch, and two waves in the brig’s cells', () => {
    const placed = Object.fromEntries(rooms.map((r) => [r.id, r.foes.map((f) => f.monster)]));
    expect(placed).toEqual({
      pools: ['giant_crab', 'giant_crab'],
      store: ['deckhand', 'deckhand', 'powder_monkey'],
      bridge: ['deckhand', 'deckhand', 'deckhand', 'ships_parrot'],
      brig: ['deckhand', 'deckhand', 'deckhand', 'powder_monkey'],
      cove: ['brinebeard'],
    });
    for (const room of rooms)
      for (const foe of room.foes) {
        expect(GROTTO_CAST[foe.monster], foe.monster).toBeDefined();
        expect(FOE_KINDS[foe.monster], foe.monster).toBeDefined();
      }
    const brig = grotto.rooms.brig!;
    expect(brig.ground.bars).toHaveLength(2);
    expect(brig.foes.map((f) => f.wave)).toEqual([0, 0, 1, 1]);
    // Locked in: shut, the cells' bars stand.
    for (const cells of brig.ground.bars)
      for (const c of cells) expect(isSolid(brig.shut, c)).toBe(true);
  });

  it('dresses its rooms with the art lane’s props and lanterns on the walls', () => {
    const ids = new Set(rooms.flatMap((r) => r.ground.props.map((p) => p.id)));
    const known = new Set([...Object.values(PROP_LETTERS)]);
    for (const id of ids) expect(known.has(id)).toBe(true);
    for (const room of rooms) {
      expect(room.ground.lanterns.length, room.id).toBeGreaterThanOrEqual(2);
      for (const l of room.ground.lanterns) {
        expect(room.map.tiles[l.row]![l.col]).toBe('rock');
        expect(room.map.tiles[l.row + 1]![l.col]).not.toBe('rock');
      }
    }
    // Every loot id the cast drops is one the brief fixed, or already in the game.
    const fixed = [
      'doubloon',
      'pirate_cutlass',
      'boarding_axe',
      'tricorn',
      'captains_coat',
      'spyglass',
      'brinebeards_anchor',
      'ships_figurehead',
    ];
    for (const def of Object.values(GROTTO_CAST)) {
      for (const { item } of [...def.always, ...def.rare])
        expect(fixed.includes(item) || item in CONTENT.items, item).toBe(true);
      for (const item of def.pick?.items ?? []) expect(fixed).toContain(item);
    }
  });
});

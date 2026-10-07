import { describe, expect, it } from 'vitest';
import { GROUND2_SHADOW, lightGround2, roomKinds2 } from '../../src/art/dungeonArt2';
import { at, darker } from '../../src/art/town2/cells';
import { buildDungeon } from '../../src/scene/dungeon';
import { DUNGEON } from '../../src/scene/dungeonMetrics';
import { GROTTO } from '../../src/scene/grotto';
import {
  LANTERN_FOOT,
  castShadow,
  groundCells,
  groundOnTheSpot,
  lightsOf,
  propsOf,
  roomLook,
  shadowSteps,
  tileKindsAt,
} from '../../src/scene/grottoArt';
import { groundInAWorker } from '../../src/scene/grottoPainter';

// The grotto at the C scale, as cells: the art lane's wall rule, props on
// their feet, contact shadows in the ground's own steps, lanterns' light.

const grotto = buildDungeon(GROTTO);
const T = DUNGEON.tile;

describe('a room’s ground at the C scale', () => {
  it('follows the art lane’s two-tall wall rule on every room, at every tide', () => {
    // The same rule as `roomKinds2`, on this scene's rows: written in the art lane's key, compared.
    const key: Record<string, string> = {
      wall_top: '#',
      wall_face: '#',
      wall_face_high: '#',
      sand: '.',
      wet_sand: ',',
      rock_floor: 'r',
      shallows: '~',
      deep_water: '=',
      planks: 'p',
      door_open: 'O',
      door_barred: 'D',
    };
    for (const room of Object.values(grotto.rooms))
      for (const level of [0, 3]) {
        const kinds = tileKindsAt(room, level, false);
        const rows = kinds.map((line) => line.map((k) => key[k]!).join(''));
        expect(kinds, `${room.id} ${level}`).toEqual(roomKinds2(rows));
      }
  });

  it('stands two tiles of wall over every room’s floor along its north side', () => {
    for (const room of Object.values(grotto.rooms)) {
      const kinds = tileKindsAt(room, 0, false);
      const faces = kinds.flat().filter((k) => k === 'wall_face').length;
      const highs = kinds.flat().filter((k) => k === 'wall_face_high').length;
      expect(highs, room.id).toBeGreaterThanOrEqual(faces * 0.8);
    }
  });

  it('hangs each lantern on the face over the floor, its post at the wall’s foot', () => {
    for (const room of Object.values(grotto.rooms)) {
      const lanterns = propsOf(room).filter((p) => p.id === 'lantern');
      expect(lanterns.length, room.id).toBe(room.ground.lanterns.length);
      for (const l of lanterns) {
        const row = Math.floor(l.feet.y / T);
        expect(l.feet.y % T, room.id).toBe(LANTERN_FOOT);
        expect(tileKindsAt(room, 0, false)[row - 1]![Math.floor(l.feet.x / T)]).toBe('wall_face');
      }
      expect(lightsOf(room)).toHaveLength(lanterns.length);
    }
  });

  it('casts contact shadows in the ground’s own steps: darker at the heart, none on the deep', () => {
    const store = grotto.rooms.store!;
    const kinds = tileKindsAt(store, 0, false);
    const g = groundCells(store, 0, false);
    const copy = { ...g, d: g.d.slice() };
    const feet = { x: 5 * T + 12, y: 4 * T + 12 };
    const n = shadowSteps(kinds, feet);
    expect(n).toBe(GROUND2_SHADOW.planks);
    castShadow(copy, feet, 11, n);
    expect(at(copy, feet.x, feet.y)).toBe(darker(at(g, feet.x, feet.y), n));
    expect(at(copy, feet.x + 10, feet.y)).toBe(darker(at(g, feet.x + 10, feet.y), n - 1));
    expect(at(copy, feet.x + 13, feet.y)).toBe(at(g, feet.x + 13, feet.y));
    // On the deep, nothing.
    const pools = grotto.rooms.pools!;
    expect(shadowSteps(tileKindsAt(pools, 0, false), { x: 1 * T + 12, y: 10 * T + 12 })).toBe(0);
  });

  it('is lit by the lanterns’ pools as the art lane lights a room', () => {
    const pools = grotto.rooms.pools!;
    const lit = groundCells(pools, 0, false);
    // Lit last: lighting the cells again by the same lights would change them, they are not lit twice.
    expect(lightGround2(lit, lightsOf(pools)).d).not.toEqual(lit.d);
  });

  it('is worked out in a worker where there is one, and on the spot where there is none', () => {
    // jsdom has no Worker: the run's painter answers at once, the same as on the spot.
    const painter = groundInAWorker();
    const pools = grotto.rooms.pools!;
    let fromPainter: Int16Array | null = null;
    painter.paint(pools, { level: 1, warn: true }, true, (cells) => (fromPainter = cells.d));
    let here: Int16Array | null = null;
    groundOnTheSpot.paint(pools, { level: 1, warn: true }, true, (cells) => (here = cells.d));
    expect(fromPainter).toEqual(here);
    painter.close();
    const look = roomLook(pools, painter);
    expect(look.states).toHaveLength(7);
  });
});

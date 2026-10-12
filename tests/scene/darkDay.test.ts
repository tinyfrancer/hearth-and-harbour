/*
 * A darker day (wave 18): the grotto looks and plays dark. Beyond the
 * lanterns' smaller pools (lane B's pools and their ragged edges) the floor
 * goes far down toward the night; the hero carries a pool of his own; a foe
 * out of every pool is drawn as a dim shape. What is marked on the ground
 * (a heavy blow's ring, the sea about to come in) is never lost in it. A
 * plain day is untouched, pixel for pixel.
 */
import { describe, expect, it } from 'vitest';
import { rasterize2 } from '../../src/art/town2/raster';
import { dimDungeon } from '../../src/scene/dungeons';
import {
  HERO_POOL,
  groundPixels,
  groundWithDoors,
  lightsOf,
  litness,
  shadeAt,
  steadyGlows,
  themeOf,
} from '../../src/scene/grottoArt';
import { DARKER_LIGHT } from '../../src/scene/modifiers';
import { GROTTO_DUNGEON } from './grottoBot';

const DARK = dimDungeon(GROTTO_DUNGEON, DARKER_LIGHT);
const luma = (d: Uint8ClampedArray): number => {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    sum += 0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!;
    n += 1;
  }
  return sum / n;
};

describe('a darker day', () => {
  it('leaves a plain day’s ground exactly as it was', () => {
    for (const room of Object.values(GROTTO_DUNGEON.rooms)) {
      const { cells } = groundWithDoors(room, 0, false);
      const plain = rasterize2({ grid: cells, glows: steadyGlows(room) }, themeOf(room).palette, 1);
      expect(groundPixels(room, 0, false).data).toEqual(plain.data);
    }
  }, 120_000);

  it('is dark: the ground on the whole well under two thirds as light, every room', () => {
    for (const id of ['pools', 'bridge', 'cove']) {
      const plain = luma(groundPixels(GROTTO_DUNGEON.rooms[id]!, 0, false).data);
      const dark = luma(groundPixels(DARK.rooms[id]!, 0, false).data);
      expect(dark / plain).toBeLessThan(0.65);
    }
  }, 120_000);

  it('never loses the sea’s warning in the dark', () => {
    // The pools' sandbar goes under at the next rise: marked, at low water, in a checker.
    const room = DARK.rooms.pools!;
    const calm = groundPixels(room, 1, false);
    const warned = groundPixels(room, 1, true);
    let marked = 0;
    let shows = 0;
    for (let i = 0; i < calm.cells.d.length; i++) {
      if (calm.cells.d[i] === warned.cells.d[i]) continue;
      marked += 1;
      const k = i * 4;
      if (
        calm.data[k] !== warned.data[k] ||
        calm.data[k + 1] !== warned.data[k + 1] ||
        calm.data[k + 2] !== warned.data[k + 2]
      )
        shows += 1;
    }
    expect(marked).toBeGreaterThan(0);
    expect(shows / marked).toBeGreaterThan(0.95);
  }, 120_000);

  it('lights what is in a pool (a lantern’s, or the hero’s own) and shades what is beyond', () => {
    const room = DARK.rooms.pools!;
    const lights = lightsOf(room);
    const l = lights[0]!;
    const under = { x: l.x, y: l.y + l.drop };
    expect(litness(lights, null, under)).toBe(0);
    // Far from every lantern, in the dark; beside the hero, in his light.
    const far = { x: 20 * 24, y: 11 * 24 };
    expect(litness(lights, null, far)).toBe(2);
    expect(litness(lights, { x: far.x - 10, y: far.y }, far)).toBe(0);
    expect(litness(lights, { x: far.x - HERO_POOL * 1.2, y: far.y }, far)).toBe(1);
    expect(litness(lights, { x: far.x - HERO_POOL * 3, y: far.y }, far)).toBe(2);
    // Pixel by pixel the same, edges ragged.
    expect(shadeAt(lights, far.x, far.y)).toBe(2);
    expect(shadeAt(lights, far.x, far.y - 4, far)).toBe(0);
  });
});

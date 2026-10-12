/*
 * What a frame of a dark room costs (wave 20): the dark is worked out once
 * per look of the room, with its ground (`DarkLayers`), and a frame only
 * looks things up in it; the overlay's words are drawn on small canvases
 * over their own patches, not one canvas the width of the room; what a
 * lantern lit or put out does not reach is not painted again; a charge's
 * lane fills by rows. Each held here as the same pixels the slow way gave.
 */
import { describe, expect, it } from 'vitest';
import { rasterize2 } from '../../src/art/town2/raster';
import type { Telegraph } from '../../src/scene/battle';
import { castIn, laneFill } from '../../src/scene/fightArt';
import {
  HERO_POOL,
  IN_THE_DARK,
  NIGHT_RGB,
  OwnLight,
  groundPixels,
  groundWithDoors,
  heroLightPixels,
  lampMask,
  lightsOf,
  litRoom,
  poolsNear,
  shadeAt,
  shadeIn,
  steadyGlows,
  themeOf,
} from '../../src/scene/grottoArt';
import { overlayClusters } from '../../src/scene/stage';
import { BURROW_DUNGEON } from './burrowBot';
import { GROTTO_DUNGEON } from './grottoBot';

const T = 24;

describe('the overlay, cut into patches', () => {
  it('keeps boxes far apart on canvases of their own, and close ones on one', () => {
    const bar = (x: number, y: number) => ({ x, y, w: 92, h: 52 });
    // Two bars at either end of a room: two patches, not one the width of the room.
    expect(overlayClusters([bar(10, 40), bar(700, 60)])).toHaveLength(2);
    // Two bars side by side: one.
    expect(overlayClusters([bar(10, 40), bar(60, 50)])).toHaveLength(1);
    // Never more than four, however many there are, and every box inside one.
    const many = Array.from({ length: 9 }, (_, i) => bar(i * 110, (i % 3) * 90));
    const cut = overlayClusters(many);
    expect(cut.length).toBeLessThanOrEqual(4);
    for (const b of many)
      expect(
        cut.some(
          (c) => b.x >= c.x && b.y >= c.y && b.x + b.w <= c.x + c.w && b.y + b.h <= c.y + c.h,
        ),
      ).toBe(true);
    // Far less to copy each frame than one box round them all.
    const area = (bs: readonly { w: number; h: number }[]) => bs.reduce((n, b) => n + b.w * b.h, 0);
    expect(area(overlayClusters([bar(10, 40), bar(700, 160)]))).toBeLessThan((782 * 172) / 3);
  });
});

describe('a dark room’s layers, worked out with its ground', () => {
  const room = litRoom(BURROW_DUNGEON.rooms.hollow!, lampMask([true, true, false]));
  const painted = groundPixels(room, 0, false);
  const dark = painted.dark!;
  const lights = lightsOf(room);

  it('has every pixel’s shade, the ground lit, and the ground darkened by them exactly', () => {
    expect(dark.w).toBe(painted.cells.w);
    const { cells } = groundWithDoors(room, 0, false);
    const plain = rasterize2({ grid: cells, glows: steadyGlows(room) }, themeOf(room).palette, 1);
    expect(dark.lit).toEqual(plain.data);
    let seen = 0;
    for (let y = 0; y < dark.h; y += 7)
      for (let x = 0; x < dark.w; x += 5) {
        const i = y * dark.w + x;
        const s = shadeAt(lights, x, y);
        expect(dark.shade[i]).toBe(s);
        if (!dark.lit[i * 4 + 3]) continue;
        const k = s === 0 ? 1 : IN_THE_DARK[s];
        const want = Math.round(dark.lit[i * 4]! * k + NIGHT_RGB[0] * (1 - k));
        expect(Math.abs(painted.data[i * 4]! - want)).toBeLessThanOrEqual(1);
        seen += 1;
      }
    expect(seen).toBeGreaterThan(1000);
  }, 60_000);

  it('keeps the ground’s own cells and palette beside them (no second copy of either)', () => {
    expect(dark.cells).toBe(painted.cells.d);
    expect(dark.palette).toBe(themeOf(room).palette);
  });

  it('gives a plain day no layers at all, and its ground as before', () => {
    expect(groundPixels(GROTTO_DUNGEON.rooms.pools!, 0, false).dark).toBeNull();
  }, 60_000);

  it('lays the hero’s own light only where it is lighter than the ground, from the layers', () => {
    const own = new OwnLight(HERO_POOL);
    // In the dark, far from every burning lantern.
    const feet = { x: 30 * T, y: 9 * T };
    const at = own.placeAt(feet);
    const into = new Uint8ClampedArray(own.bw * own.bh * 4);
    expect(heroLightPixels(dark, own, at, into)).toBe(true);
    let drawn = 0;
    let heart = 0;
    let lifted = 0;
    for (let j = 0; j < own.bh; j++)
      for (let i = 0; i < own.bw; i++) {
        const x = at.x + i;
        const y = at.y + j;
        const o = (j * own.bw + i) * 4;
        const inRoom = x >= 0 && y >= 0 && x < dark.w && y < dark.h;
        const mine = own.at(x, y);
        const ground = inRoom ? dark.shade[y * dark.w + x]! : 2;
        if (!into[o + 3]) {
          // Not drawn: beyond his light, or no lighter than the ground already is.
          if (inRoom && dark.lit[(y * dark.w + x) * 4 + 3])
            expect(mine).toBeGreaterThanOrEqual(ground);
          continue;
        }
        drawn += 1;
        expect(mine).toBeLessThan(ground);
        expect(shadeIn(dark, own, x, y)).toBe(mine);
        const p = (y * dark.w + x) * 4;
        const m = own.mask[j * own.bw + i]!;
        const k = mine === 1 ? IN_THE_DARK[1] : 1;
        if (m === 0) {
          // The heart: lighter than the ground lit, by the step its cell is lifted (or as lit).
          heart += 1;
          const sum = (d: Uint8ClampedArray, i: number) => d[i]! + d[i + 1]! + d[i + 2]!;
          expect(sum(into, o)).toBeGreaterThanOrEqual(sum(dark.lit, p) - 3);
          if (sum(into, o) > sum(dark.lit, p) + 3) lifted += 1;
        } else
          expect(
            Math.abs(into[o]! - (dark.lit[p]! * k + NIGHT_RGB[0] * (1 - k))),
          ).toBeLessThanOrEqual(1);
      }
    expect(drawn).toBeGreaterThan(2000);
    expect(lifted / heart).toBeGreaterThan(0.5);
    // Beside a burning lantern, where the ground is lit already, nothing of his.
    const lamp = room.ground.lamps.findIndex((_, i) => (room.lit! & (1 << i)) !== 0);
    const l = room.ground.lamps[lamp]!.cell;
    const by = own.placeAt({ x: l.col * T + T / 2, y: l.row * T + T + 2 });
    heroLightPixels(dark, own, by, into);
    for (let j = 0; j < own.bh; j++)
      for (let i = 0; i < own.bw; i++) {
        const x = by.x + i;
        const y = by.y + j;
        if (x < 0 || y < 0 || x >= dark.w || y >= dark.h) continue;
        if (dark.shade[y * dark.w + x] === 0) expect(into[(j * own.bw + i) * 4 + 3]).toBe(0);
      }
  });

  it('never lays it over ground it is told to leave (an open door’s)', () => {
    const own = new OwnLight(HERO_POOL);
    const at = own.placeAt({ x: 30 * T, y: 9 * T });
    const into = new Uint8ClampedArray(own.bw * own.bh * 4);
    const skip = [{ x: at.x, y: at.y, w: own.bw, h: own.bh }];
    expect(heroLightPixels(dark, own, at, into, skip)).toBe(false);
  });
});

describe('what a lantern lit or put out paints again', () => {
  it('takes only the pools that can reach a picture: its shades are the same by them alone', () => {
    const room = litRoom(
      BURROW_DUNGEON.rooms.sett!,
      lampMask([true, true, true, true, true, true]),
    );
    const lights = lightsOf(room);
    let some = 0;
    let none = 0;
    for (let bx = 0; bx < 816; bx += 37)
      for (let by = 30; by < 300; by += 41) {
        const box = { x: bx, y: by, w: 24, h: 40 };
        const near = poolsNear(lights, box);
        if (near.length) some += 1;
        else none += 1;
        for (let y = box.y; y < box.y + box.h; y += 3)
          for (let x = box.x; x < box.x + box.w; x += 2)
            expect(shadeAt(near, x, y)).toBe(shadeAt(lights, x, y));
      }
    expect(some).toBeGreaterThan(10);
    expect(none).toBeGreaterThan(10);
  });
});

describe('a charge’s lane, filled by rows', () => {
  it('fills exactly the pixels whose middles the charge has come past', () => {
    const lanes: Telegraph[] = [
      {
        at: { x: 100, y: 120 },
        to: { x: 400, y: 180 },
        radius: 14,
        shape: 'lane',
        from: 0,
        lands: 1000,
        origin: null,
        damage: 0,
      },
      {
        at: { x: 400, y: 200 },
        to: { x: 120, y: 90 },
        radius: 14,
        shape: 'lane',
        from: 0,
        lands: 1000,
        origin: null,
        damage: 0,
      },
      {
        at: { x: 200, y: 60 },
        to: { x: 200, y: 250 },
        radius: 12,
        shape: 'lane',
        from: 0,
        lands: 1000,
        origin: null,
        damage: 0,
      },
    ];
    for (const t of lanes) {
      const to = t.to!;
      const dx = to.x - t.at.x;
      const dy = to.y - t.at.y;
      const per = dx * dx + dy * dy;
      const whole = new Set<string>();
      for (const [y, x, n] of laneFill(t, 2))
        for (let i = 0; i < n; i++) whole.add(`${x + i} ${y}`);
      for (const k of [0, 0.25, 0.5, 0.8, 1]) {
        const got = new Set<string>();
        for (const [y, x, n] of laneFill(t, k))
          for (let i = 0; i < n; i++) got.add(`${x + i} ${y}`);
        for (const p of whole) {
          const [x, y] = p.split(' ').map(Number) as [number, number];
          const along = ((x + 0.5 - t.at.x) * dx + (y + 0.5 - t.at.y) * dy) / per;
          // Pixels on the very line between filled and not may fall either way.
          if (Math.abs(along - k) < 1e-6) continue;
          expect(got.has(p)).toBe(along <= k);
        }
      }
    }
  });
});

describe('a room’s cast, drawn before it is met', () => {
  it('knows everyone a room may show: who waits there and whom its boss calls', () => {
    expect(castIn(BURROW_DUNGEON.rooms.sett!).sort()).toEqual(
      ['badger_king', 'bramble_hound', 'lantern_moth', 'spore_puff'].sort(),
    );
    expect(castIn(BURROW_DUNGEON.rooms.hollow!)).toEqual(['spore_puff']);
  });
});

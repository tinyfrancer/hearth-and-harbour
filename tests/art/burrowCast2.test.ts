import { describe, expect, it, vi } from 'vitest';
import {
  BURROW2_IDS,
  burrowNight,
  dungeonTile2,
  foeFrames2,
  foePicture2,
  foeSpecial2,
  FOE2_IDS,
  FOE2_SIZES,
  FOE2_SPECIALS,
  NIGHT_EXEMPT,
} from '../../src/art/dungeonArt2';
import { portraitPicture2, PORTRAIT2_SAFE } from '../../src/art/portraits2';
import { measureSafe2 } from '../../src/art/dungeon2/safe';
import { matOf } from '../../src/art/dungeon2/cave';
import type { TGrid } from '../../src/art/town2/cells';

vi.setConfig({ testTimeout: 60_000 });

const SMALL = ['spore_puff', 'cap_guard', 'bramble_hound', 'lantern_moth'] as const;

const lum = (rgb: Uint8Array, c: number) =>
  0.299 * rgb[c * 3]! + 0.587 * rgb[c * 3 + 1]! + 0.114 * rgb[c * 3 + 2]!;

/** The topmost and lowest drawn rows, and how many pixels are drawn. */
function extent(g: TGrid): { top: number; bottom: number; n: number; left: number; right: number } {
  let top = g.h;
  let bottom = -1;
  let left = g.w;
  let right = -1;
  let n = 0;
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++)
      if (g.d[y * g.w + x]) {
        n++;
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
  return { top, bottom, n, left, right };
}

describe('Thistlewood Burrow’s cast: the four smaller creatures (B20)', () => {
  it('draws the spore puff, the cap guard, the bramble hound and the lantern moth', () => {
    expect(BURROW2_IDS).toEqual([
      'spore_puff',
      'cap_guard',
      'bramble_hound',
      'lantern_moth',
      'badger_king',
    ]);
    for (const id of SMALL) {
      expect(FOE2_IDS, id).toContain(id);
      expect(FOE2_SIZES[id], id).toBeDefined();
      expect(foeFrames2(id), id).toEqual({
        idle: 2,
        walk: 4,
        windup: 1,
        strike: 1,
        hurt: 1,
        flash: 1,
        fall: 2,
      });
    }
  });

  it('carries the threat in its size: the puff knee high, the guard a head under the hero, the hound long and low', () => {
    expect(FOE2_SIZES.spore_puff!.tall).toBeLessThanOrEqual(26);
    expect(FOE2_SIZES.cap_guard!.tall).toBeGreaterThan(52);
    expect(FOE2_SIZES.cap_guard!.tall).toBeLessThan(68);
    const h = FOE2_SIZES.bramble_hound!;
    expect(h.front + h.back).toBeGreaterThan(h.tall * 1.6);
    // Lane C's moth hovers by its own lift: its picture stands near its feet point.
    expect(FOE2_SIZES.lantern_moth!.hover).toBeLessThanOrEqual(4);
  });

  it('never draws the guard’s shield over a hero at the melee stand', () => {
    const s = FOE2_SIZES.cap_guard!;
    const MELEE_STAND = 36;
    const HERO_BACK = 13;
    expect(s.front + HERO_BACK - MELEE_STAND).toBeLessThanOrEqual(4);
  });

  it('telegraphs plainly: each wind-up a silhouette of its own', () => {
    const idle = (id: string) => extent(foePicture2(id, 'idle')!.picture.grid);
    const windup = (id: string) => extent(foePicture2(id, 'windup')!.picture.grid);
    // The puff swells: wider and taller.
    expect(windup('spore_puff').n).toBeGreaterThan(idle('spore_puff').n * 1.3);
    // The guard lifts its shield over its head.
    expect(windup('cap_guard').top).toBeLessThan(idle('cap_guard').top - 4);
    // The hound crouches: its back lower.
    expect(windup('bramble_hound').top).toBeGreaterThan(idle('bramble_hound').top + 2);
    // The moth rears with its wings high.
    expect(windup('lantern_moth').top).toBeLessThan(idle('lantern_moth').top - 4);
  });

  it('has the moves its rules give it, both ways, standing on its feet', () => {
    expect(FOE2_SPECIALS.spore_puff).toEqual({ swell: 3, burst: 3 });
    expect(FOE2_SPECIALS.cap_guard).toEqual({ block: 1, turn: 2 });
    expect(FOE2_SPECIALS.bramble_hound).toEqual({ crouch: 2, charge: 4, stuck: 2 });
    expect(FOE2_SPECIALS.lantern_moth).toEqual({ hover: 4, snuff: 3 });
    for (const id of SMALL)
      for (const [move, n] of Object.entries(FOE2_SPECIALS[id]!))
        for (let f = 0; f < n; f++) {
          const r = foeSpecial2(id, move, 'right', f)!;
          const l = foeSpecial2(id, move, 'left', f)!;
          const { w } = r.picture.grid;
          expect(r.feet, `${id} ${move} ${f}`).toEqual(foePicture2(id, 'idle')!.feet);
          expect(l.feet).toEqual({ x: w - 1 - r.feet.x, y: r.feet.y });
          expect(extent(r.picture.grid).n, `${id} ${move} ${f}`).toBeGreaterThan(80);
        }
    expect(foeSpecial2('spore_puff', 'nonsense')).toBeNull();
    expect(foeSpecial2('dock_rat', 'swell')).toBeNull();
    // It wraps.
    expect(foeSpecial2('bramble_hound', 'charge', 'right', 5)).toBe(
      foeSpecial2('bramble_hound', 'charge', 'right', 1),
    );
  });

  it('reads as a shape in the dark: an edge against the dark floor, and a light of its own', () => {
    const dark = burrowNight(2).rgb;
    let floor = 0;
    let fn = 0;
    for (let col = 0; col < 6; col++)
      for (const c of dungeonTile2('rock_floor', col, undefined, { col, row: 3 }, 'burrow')!.grid
        .d) {
        floor += lum(dark, c);
        fn++;
      }
    floor /= fn;
    for (const id of SMALL) {
      const g = foePicture2(id, 'idle')!.picture.grid;
      let edge = 0;
      let en = 0;
      let lights = 0;
      for (const c of g.d) {
        if (!c) continue;
        const m = matOf(c);
        if (m && NIGHT_EXEMPT.includes(m)) lights++;
        if ((c & 7) === 6) {
          edge += lum(dark, c);
          en++;
        }
      }
      // Its outline is a line darker than the floor all round it.
      expect(floor - edge / en, id).toBeGreaterThan(5);
      // And something on it keeps its light (spores, gills, ember eyes).
      expect(lights, id).toBeGreaterThanOrEqual(2);
    }
  });

  it('has a hand-drawn face for each, its safe box measured from the drawing', () => {
    for (const id of SMALL) {
      const p = portraitPicture2(id)!;
      expect([p.grid.w, p.grid.h], id).toEqual([72, 72]);
      expect(PORTRAIT2_SAFE[id], id).toEqual(measureSafe2(id));
      expect(PORTRAIT2_SAFE[id]!.y + PORTRAIT2_SAFE[id]!.h, id).toBeLessThanOrEqual(56);
    }
  });
});

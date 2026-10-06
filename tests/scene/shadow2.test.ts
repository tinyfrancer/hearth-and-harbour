import { describe, expect, it } from 'vitest';
import { cell, matOf, stepOf } from '../../src/art/town2/cells';
import type { Mat } from '../../src/art/town2/ramps';
import {
  contactShadow,
  layShadow,
  shadowBox,
  shadowCells,
  CORE_FLOOR,
  PENUMBRA_FLOOR,
  type Cells,
} from '../../src/scene/shadow2';

// A person's contact shadow in town: the ground's own cells a step or two
// darker, shaped by the town's light from the upper left.

const ground = (mat: Mat, step: number, w = 80, h = 20): Cells => ({
  w,
  h,
  d: new Int16Array(w * h).fill(cell(mat, step)),
});

describe('the contact shadow', () => {
  it('is darkest right under the soles, softer round them', () => {
    for (const time of ['day', 'dusk'] as const) {
      const at = (dx: number, dy: number) =>
        contactShadow(time).find((p) => p.dx === dx && p.dy === dy)?.n ?? 0;
      expect(at(0, 0)).toBe(2);
      expect(at(0, 1)).toBe(2);
      expect(at(12, 1)).toBe(1);
      expect(at(0, 5)).toBe(0);
      expect(contactShadow(time).every((p) => p.n === 1 || p.n === 2)).toBe(true);
    }
  });

  it('falls further to the right than the left, as the light comes from the upper left', () => {
    for (const time of ['day', 'dusk'] as const) {
      const box = shadowBox(time);
      expect(box.x + box.w - 1).toBeGreaterThan(-box.x);
      // And lies on the ground: hardly above the soles, more below.
      expect(-box.y).toBeLessThan(box.y + box.h);
    }
  });

  it('reaches further at dusk, when the light is lower', () => {
    const day = shadowBox('day');
    const dusk = shadowBox('dusk');
    expect(dusk.x + dusk.w).toBeGreaterThan(day.x + day.w);
    expect(contactShadow('dusk').length).toBeGreaterThan(contactShadow('day').length);
  });

  it('darkens whatever ground it falls on in that ground’s own ramp, and never to its line', () => {
    for (const mat of ['grass', 'cobble', 'sand', 'wood', 'stone', 'dirt', 'sea'] as Mat[])
      for (const step of [0, 2, 4, 5]) {
        const g = ground(mat, step);
        layShadow(g, { x: 30, y: 8 }, 'day');
        const under = g.d[8 * g.w + 30]!;
        expect(matOf(under)).toBe(mat);
        // Two steps down, and never lighter than the core's floor: one even shade on busy ground.
        expect(stepOf(under)).toBe(Math.min(5, Math.max(step + 2, CORE_FLOOR.day)));
        // Far off, untouched.
        expect(g.d[0]).toBe(cell(mat, step));
      }
  });

  it('evens busy ground out under the feet nearly to one shade, deeper at dusk, with a soft dithered edge', () => {
    // Light stones and dark mortar side by side: under the soles they come to one shade.
    for (const time of ['day', 'dusk'] as const) {
      const g = ground('cobble', 1);
      for (let x = 0; x < g.w; x += 3)
        for (let y = 0; y < g.h; y++) g.d[y * g.w + x] = cell('cobble', 4);
      layShadow(g, { x: 30, y: 8 }, time);
      const core = [29, 30, 31].map((x) => stepOf(g.d[8 * g.w + x]!));
      // Three steps apart on the bare ground; at most one under the feet.
      expect(Math.max(...core) - Math.min(...core)).toBeLessThanOrEqual(1);
      expect(Math.min(...core)).toBe(CORE_FLOOR[time]);
      expect(CORE_FLOOR[time]).toBeLessThanOrEqual(5);
      expect(PENUMBRA_FLOOR[time]).toBeLessThan(CORE_FLOOR[time]);
    }
    expect(CORE_FLOOR.dusk).toBeGreaterThan(CORE_FLOOR.day);
    // The fringe: past the penumbra, every other pixel a step down, never a hard oval edge.
    const fringe = contactShadow('day').filter((p) => p.floor === 0);
    expect(fringe.length).toBeGreaterThan(10);
    for (const p of fringe) expect(Math.abs((p.dx + p.dy) % 2)).toBe(0);
  });

  it('cuts the same shadow for someone walking as is laid for someone standing', () => {
    const base = ground('cobble', 2);
    // A patch of flagstone in it, to see the shadow keep each ground's own material.
    for (let x = 30; x < 50; x++) base.d[9 * base.w + x] = cell('stone', 1);
    for (const time of ['day', 'dusk'] as const) {
      const feet = { x: 32, y: 8 };
      const laid: Cells = { ...base, d: base.d.slice() };
      layShadow(laid, feet, time);
      const box = shadowBox(time);
      const out: Cells = { w: box.w, h: box.h, d: new Int16Array(box.w * box.h) };
      shadowCells(base, feet, time, out);
      for (let y = 0; y < box.h; y++)
        for (let x = 0; x < box.w; x++) {
          const c = out.d[y * box.w + x]!;
          const gx = feet.x + box.x + x;
          const gy = feet.y + box.y + y;
          if (gx < 0 || gx >= base.w || gy < 0 || gy >= base.h) continue;
          if (c) expect(c).toBe(laid.d[gy * base.w + gx]);
          else expect(laid.d[gy * base.w + gx]).toBe(base.d[gy * base.w + gx]);
        }
    }
  });
});

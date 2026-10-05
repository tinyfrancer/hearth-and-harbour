import { describe, expect, it } from 'vitest';
import {
  QUAY_H,
  ROAD_HALF_WIDTH,
  cobbledSquare,
  quayWall,
  road,
  roadCentre,
  sand,
  sea,
} from '../../src/art/ground';
import { get, grid } from '../../src/art/grid';
import { seeded } from '../../src/art/rng';
import { cobbleAt } from '../../src/art/scenery';

// The grounds as the mock-up paints them are held pixel for pixel by the
// assembled town (town.test.ts); these check what a scene relies on when it
// paints its own, bigger town with them.
describe('grounds', () => {
  it('lays sand with only sand steps, edge to edge', () => {
    const g = grid(40, 20);
    sand(g, seeded(1), { x: 0, y: 0, w: 40, h: 20 });
    const steps = new Set(g.d);
    expect([...steps].sort()).toEqual(['sand1', 'sand2', 'sand3']);
  });

  it('keeps the road within a pixel of its edges as it bends', () => {
    const g = grid(80, 120);
    road(g, seeded(2), 40, 0, 120);
    for (let y = 0; y < 120; y++) {
      const cx = roadCentre(40, y);
      for (let x = 0; x < 80; x++) {
        if (!get(g, x, y)) continue;
        expect(x).toBeGreaterThanOrEqual(cx - ROAD_HALF_WIDTH - 1);
        expect(x).toBeLessThanOrEqual(cx + ROAD_HALF_WIDTH);
      }
    }
    // Ruts on three rows in four (grit lands on a few of them).
    const rutted = Array.from({ length: 120 }, (_, y) => y).filter(
      (y) => y % 4 && get(g, roadCentre(40, y) + 4, y) === 'sand3',
    );
    expect(rutted.length).toBeGreaterThan(80);
  });

  it('cobbles the square so its joints line up with cobbles painted anywhere else', () => {
    const g = grid(60, 30);
    cobbledSquare(g, seeded(3), { x: 0, y: 0, w: 60, h: 30 });
    // Below the tapered top and inside the wandering sides, every cobble is
    // where cobbleAt puts it, or darkened by grime.
    for (let y = 8; y < 30; y++)
      for (let x = 2; x < 58; x++) {
        const c = get(g, x, y);
        if (c !== cobbleAt(x, y)) expect([c, cobbleAt(x, y)]).toEqual(['cobble3', 'cobble2']);
      }
    // The top narrows: 24 pixels in from each side on the first row.
    const filled = (y: number) =>
      Array.from({ length: 60 }, (_, x) => get(g, x, y)).filter(Boolean);
    expect(filled(0).length).toBeLessThanOrEqual(60 - 2 * 24);
    expect(filled(8).length).toBeGreaterThanOrEqual(57);
  });

  it('builds the quay wall QUAY_H rows tall, ending in an ink line on the water', () => {
    const g = grid(30, 14);
    quayWall(g, seeded(4), 0, 1, 30, [10]);
    expect(get(g, 5, 0)).toBeNull();
    expect(get(g, 5, 1)).toBe('stone1');
    expect(get(g, 5, QUAY_H)).toBe('ink1');
    expect(get(g, 5, QUAY_H + 1)).toBeNull();
    expect(get(g, 10, 5)).toBe('metal1');
  });

  it('fills the sea with water, deeper further out, and foam on its shore', () => {
    const g = grid(100, 200);
    sea(g, seeded(5), { x: 0, y: 0, w: 100, h: 200 });
    const count = (y0: number, y1: number, step: string) =>
      g.d.slice(y0 * 100, y1 * 100).filter((c) => c === step).length;
    expect(count(150, 200, 'sea3')).toBeGreaterThan(count(2, 52, 'sea3'));
    expect(count(0, 1, 'foam1')).toBeGreaterThan(10);
    const open = grid(100, 10);
    sea(open, seeded(5), { x: 0, y: 0, w: 100, h: 10 }, false);
    expect(open.d.every(Boolean)).toBe(true);
  });
});

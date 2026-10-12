import { describe, expect, it, vi } from 'vitest';
import {
  CHART_EMBLEM2_IDS,
  CHART_MARKER2_STATES,
  chartBoat2,
  chartDot2,
  chartEmblem2,
  chartMarker2,
  chartRoute2,
  harbourChart2,
} from '../../src/art/chart';
import { matOf } from '../../src/art/town2/cells';
import { DAY2 } from '../../src/art/town2/ramps';

vi.setConfig({ testTimeout: 60_000 });

describe('the harbour chart (B15)', () => {
  it('fills a phone-width panel: 340 x 300 art pixels, drawn in the town’s day colours', () => {
    const c = harbourChart2();
    expect([c.width, c.height]).toEqual([340, 300]);
    expect([c.picture.grid.w, c.picture.grid.h]).toEqual([340, 300]);
    for (const v of c.picture.grid.d) if (v) expect(DAY2.colours[matOf(v)!]).toBeDefined();
    expect(harbourChart2()).toBe(c);
  });

  it('has a landing for each dungeon and three to come, at sea by a shore, inside the frame and apart', () => {
    const c = harbourChart2();
    expect(Object.keys(c.landings).sort()).toEqual(
      [
        'brinebeards_grotto',
        'tidepool_cave',
        // B20: the Burrow's own landing, ashore under the old forest; the spare ones kept.
        'thistlewood_burrow',
        'unknown_1',
        'unknown_2',
        'unknown_3',
      ].sort(),
    );
    const g = c.picture.grid;
    const points = [...Object.values(c.landings), c.home];
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(24);
      expect(p.y).toBeGreaterThanOrEqual(24);
      expect(p.x).toBeLessThan(c.width - 24);
      expect(p.y).toBeLessThan(c.height - 24);
    }
    for (const [id, p] of Object.entries(c.landings)) {
      // At sea (or on the wave lines), with a shore near it.
      expect(['chartsea', 'ink'], id).toContain(matOf(g.d[p.y * g.w + p.x]!));
      let shore = false;
      for (let dy = -14; dy <= 14 && !shore; dy++)
        for (let dx = -14; dx <= 14 && !shore; dx++) {
          const m = matOf(g.d[(p.y + dy) * g.w + p.x + dx]!);
          if (m === 'parchment' || m === 'mossdye') shore = true;
        }
      expect(shore, id).toBe(true);
    }
    // Far enough apart that markers and emblems never overlap.
    for (let i = 0; i < points.length; i++)
      for (let j = i + 1; j < points.length; j++)
        expect(
          Math.hypot(points[i]!.x - points[j]!.x, points[i]!.y - points[j]!.y),
        ).toBeGreaterThan(36);
    // The learning cave close to home, the grotto further out.
    const d = (p: { x: number; y: number }) => Math.hypot(p.x - c.home.x, p.y - c.home.y);
    expect(d(c.landings.tidepool_cave!)).toBeLessThan(d(c.landings.brinebeards_grotto!) + 40);
    expect(d(c.landings.tidepool_cave!)).toBeLessThan(d(c.landings.unknown_3!));
  });

  it('draws a marker for every state, each its own picture, anchored inside it', () => {
    const seen = new Set<string>();
    for (const s of CHART_MARKER2_STATES) {
      const m = chartMarker2(s);
      const g = m.picture.grid;
      expect(m.anchor.x, s).toBeGreaterThanOrEqual(0);
      expect(m.anchor.x, s).toBeLessThan(g.w);
      expect(m.anchor.y, s).toBeLessThan(g.h);
      seen.add(`${g.w}x${g.h}:${Array.from(g.d).join(',')}`);
    }
    expect(seen.size).toBe(CHART_MARKER2_STATES.length);
  });

  it('draws each dungeon’s emblem, and its silhouette in ink while it is locked', () => {
    expect(CHART_EMBLEM2_IDS).toEqual([
      'brinebeards_grotto',
      'tidepool_cave',
      'thistlewood_burrow',
    ]);
    for (const id of CHART_EMBLEM2_IDS) {
      const e = chartEmblem2(id)!;
      const s = chartEmblem2(id, true)!;
      expect(
        new Set(Array.from(e.picture.grid.d).filter(Boolean).map(matOf)).size,
        id,
      ).toBeGreaterThan(2);
      expect(new Set(Array.from(s.picture.grid.d).filter(Boolean).map(matOf)), id).toEqual(
        new Set(['ink']),
      );
    }
    expect(chartEmblem2('nowhere')).toBeNull();
  });

  it('dots a route between two points, evenly, its ends left clear, and has a boat to sail it', () => {
    const c = harbourChart2();
    const r = chartRoute2(c.home, c.landings.brinebeards_grotto!);
    expect(r.length).toBeGreaterThan(6);
    for (let i = 1; i < r.length; i++) {
      const gap = Math.hypot(r[i]!.x - r[i - 1]!.x, r[i]!.y - r[i - 1]!.y);
      expect(gap).toBeGreaterThan(4);
      expect(gap).toBeLessThan(10);
    }
    for (const p of [r[0]!, r[r.length - 1]!]) {
      expect(Math.hypot(p.x - c.home.x, p.y - c.home.y)).toBeGreaterThan(7);
      expect(
        Math.hypot(p.x - c.landings.brinebeards_grotto!.x, p.y - c.landings.brinebeards_grotto!.y),
      ).toBeGreaterThan(7);
    }
    expect(chartDot2().picture.grid.w).toBeLessThanOrEqual(6);
    const right = chartBoat2('right').picture.grid;
    const left = chartBoat2('left').picture.grid;
    expect([left.w, left.h]).toEqual([right.w, right.h]);
    expect(Array.from(left.d)).not.toEqual(Array.from(right.d));
  });
});

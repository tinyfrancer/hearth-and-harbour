import { describe, expect, it } from 'vitest';
import { stepOf } from '../../src/art/town2/cells';
import {
  townMarker2,
  townPointer2,
  TOWN_MARKER2_FRAMES,
  TOWN_MARKER2_KINDS,
  TOWN_MARKER2_SIZES,
  TOWN_POINTER2_DIRECTIONS,
} from '../../src/art/town2/markers';

/** FNV-1a over a grid's cells, with its size, to hold a drawing to what it was. */
function fingerprint(g: { w: number; h: number; d: Int16Array }): string {
  let h = 0x811c9dc5;
  for (const v of g.d) {
    h ^= v & 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
    h ^= (v >> 8) & 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${g.w}x${g.h} ${h.toString(16).padStart(8, '0')}`;
}

/** B15's small markers, frame by frame, as `main` drew them before the size argument. */
const B15_SMALL: Record<string, readonly string[]> = {
  talk: ['7cd701d7', 'f5fa1ad7', '511d63d7', 'f5fa1ad7'],
  enter: ['c3d968e0', 'ef8ff460', 'f3de7be0', 'ef8ff460'],
  gather: ['99ae982a', '3034ebaa', '8731052a', '3034ebaa'],
  travel: ['c2589b27', '55158027', '0b40cd27', '55158027'],
  new: ['9f911dd7', '0e78101d', 'f64bb14c', '0e78101d'],
};

const hasKeyline = (g: { d: Int16Array }): boolean =>
  Array.from(g.d).some((c) => c !== 0 && stepOf(c) === 6);

describe('the marker’s size (B16)', () => {
  it('leaves every existing call as it was: no size is small, byte for byte', () => {
    expect(TOWN_MARKER2_SIZES).toEqual(['small', 'large']);
    for (const kind of TOWN_MARKER2_KINDS)
      for (let f = 0; f < TOWN_MARKER2_FRAMES; f++) {
        const m = townMarker2(kind, f);
        expect(fingerprint(m.picture.grid), `${kind} ${f}`).toBe(`16x18 ${B15_SMALL[kind]![f]}`);
        expect(m.anchor, kind).toEqual({ x: 7, y: 16 });
        expect(townMarker2(kind, f, 'small'), `${kind} ${f}`).toBe(m);
      }
  });

  it('draws a large marker of every kind about twice the small, one size and anchor a kind', () => {
    const small = townMarker2('travel', 0).picture.grid;
    for (const kind of TOWN_MARKER2_KINDS) {
      const frames = Array.from({ length: TOWN_MARKER2_FRAMES }, (_, f) =>
        townMarker2(kind, f, 'large'),
      );
      const g0 = frames[0]!.picture.grid;
      expect(g0.w / small.w, kind).toBeGreaterThan(1.6);
      expect(g0.w / small.w, kind).toBeLessThan(2.4);
      expect(g0.h / small.h, kind).toBeGreaterThan(1.4);
      expect(g0.h / small.h, kind).toBeLessThan(2.4);
      for (const m of frames) {
        expect([m.picture.grid.w, m.picture.grid.h], kind).toEqual([g0.w, g0.h]);
        expect(m.anchor, kind).toEqual(frames[0]!.anchor);
        expect(hasKeyline(m.picture.grid), kind).toBe(true);
      }
      // Every large kind shares one canvas and one anchor, so a scene can swap them.
      expect([g0.w, g0.h], kind).toEqual([29, 30]);
      expect(frames[0]!.anchor, kind).toEqual({ x: 14, y: 29 });
      expect(Array.from(frames[0]!.picture.grid.d), kind).not.toEqual(
        Array.from(frames[2]!.picture.grid.d),
      );
      expect(townMarker2(kind, 6, 'large'), kind).toBe(frames[2]);
      expect(townMarker2(kind, -1, 'large'), kind).toBe(frames[3]);
    }
  });

  it('points the large badge at its anchor: the keyline under the tip, the middle column', () => {
    for (const kind of TOWN_MARKER2_KINDS) {
      if (kind === 'new') continue;
      const m = townMarker2(kind, 0, 'large');
      const g = m.picture.grid;
      const c = g.d[m.anchor.y * g.w + m.anchor.x]!;
      expect(c !== 0 && stepOf(c) === 6, kind).toBe(true);
      expect(g.d[(m.anchor.y - 1) * g.w + m.anchor.x], kind).not.toBe(0);
      expect(stepOf(g.d[(m.anchor.y - 1) * g.w + m.anchor.x]!), kind).toBeLessThan(6);
      expect(m.anchor.x, kind).toBe((g.w - 1) / 2);
    }
  });
});

describe('the edge pointer (B16)', () => {
  it('points each way, every frame one size with one anchor, nudging toward its point', () => {
    expect(TOWN_POINTER2_DIRECTIONS).toEqual(['left', 'right', 'up', 'down']);
    for (const d of TOWN_POINTER2_DIRECTIONS) {
      const frames = Array.from({ length: TOWN_MARKER2_FRAMES }, (_, f) => townPointer2(d, f));
      const g0 = frames[0]!.picture.grid;
      for (const p of frames) {
        expect([p.picture.grid.w, p.picture.grid.h], d).toEqual([g0.w, g0.h]);
        expect(p.anchor, d).toEqual(frames[0]!.anchor);
        expect(hasKeyline(p.picture.grid), d).toBe(true);
      }
      expect(g0.w * g0.h, d).toBeLessThanOrEqual(20 * 20);
      // At its furthest the keyline past the tip is on the anchor; at rest it is short of it.
      const cellAt = (f: number) => {
        const p = frames[f]!;
        return p.picture.grid.d[p.anchor.y * p.picture.grid.w + p.anchor.x]!;
      };
      expect(stepOf(cellAt(2)), d).toBe(6);
      expect(cellAt(0), d).toBe(0);
      expect(townPointer2(d, 5), d).toBe(frames[1]);
    }
  });

  it('turns one drawing: left mirrors right, up and down are it turned', () => {
    for (let f = 0; f < TOWN_MARKER2_FRAMES; f++) {
      const r = townPointer2('right', f).picture.grid;
      const l = townPointer2('left', f).picture.grid;
      const u = townPointer2('up', f).picture.grid;
      const dn = townPointer2('down', f).picture.grid;
      expect([u.w, u.h]).toEqual([r.h, r.w]);
      expect([dn.w, dn.h]).toEqual([r.h, r.w]);
      for (let y = 0; y < r.h; y++)
        for (let x = 0; x < r.w; x++) {
          const on = r.d[y * r.w + x] !== 0;
          expect(l.d[y * l.w + (r.w - 1 - x)] !== 0).toBe(on);
          expect(dn.d[x * dn.w + y] !== 0).toBe(on);
          expect(u.d[(r.w - 1 - x) * u.w + y] !== 0).toBe(on);
        }
    }
  });
});

import { describe, expect, it } from 'vitest';
import { isMat, stepOf } from '../../src/art/town2/cells';
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

/**
 * The small markers, frame by frame: B15's as `main` drew them before the size
 * argument, but for `gather`, redrawn on purpose in B16 (a leaf with a glint;
 * B15's hand axe was `99ae982a 3034ebaa 8731052a 3034ebaa`).
 */
const SMALL: Record<string, readonly string[]> = {
  talk: ['7cd701d7', 'f5fa1ad7', '511d63d7', 'f5fa1ad7'],
  enter: ['c3d968e0', 'ef8ff460', 'f3de7be0', 'ef8ff460'],
  gather: ['9d9f185a', '7a6f79da', '6cf5355a', '7a6f79da'],
  travel: ['c2589b27', '55158027', '0b40cd27', '55158027'],
  new: ['9f911dd7', '0e78101d', 'f64bb14c', '0e78101d'],
};

const hasKeyline = (g: { d: Int16Array }): boolean =>
  Array.from(g.d).some((c) => c !== 0 && stepOf(c) === 6);

describe('the marker’s size (B16)', () => {
  it('leaves every existing call as it was: no size is small, byte for byte (gather redrawn)', () => {
    // B17 added 'medium' after them; the first two keep their places.
    expect(TOWN_MARKER2_SIZES.slice(0, 2)).toEqual(['small', 'large']);
    for (const kind of TOWN_MARKER2_KINDS)
      for (let f = 0; f < TOWN_MARKER2_FRAMES; f++) {
        const m = townMarker2(kind, f);
        expect(fingerprint(m.picture.grid), `${kind} ${f}`).toBe(`16x18 ${SMALL[kind]![f]}`);
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

describe('the markers’ legibility (B16)', () => {
  it('draws gather as a green leaf with a gold glint, small and large', () => {
    for (const size of ['small', 'large'] as const) {
      const g = townMarker2('gather', 0, size).picture.grid;
      const leaf = Array.from(g.d).filter((c) => c && isMat(c, 'leaf')).length;
      const glint = Array.from(g.d).filter((c) => c && isMat(c, 'gold') && stepOf(c) <= 1).length;
      expect(leaf, size).toBeGreaterThan(size === 'small' ? 25 : 70);
      expect(glint, size).toBeGreaterThan(0);
      // No iron left: the hand axe is gone.
      expect(
        Array.from(g.d).some((c) => c && isMat(c, 'iron')),
        size,
      ).toBe(false);
    }
  });

  it('gives the large travel marker a boat on the water, a red pennant, in a gold rim', () => {
    const g = townMarker2('travel', 0, 'large').picture.grid;
    const n = (m: Parameters<typeof isMat>[1]) =>
      Array.from(g.d).filter((c) => c && isMat(c, m)).length;
    expect(n('gold')).toBeGreaterThan(80);
    expect(n('crimson')).toBeGreaterThan(3);
    expect(n('sea')).toBeGreaterThan(6);
    expect(n('tar')).toBeGreaterThan(60);
  });
});

describe('the edge pointer (B16)', () => {
  it('points each way, every frame one size with one anchor, nudging toward its point', () => {
    expect(TOWN_POINTER2_DIRECTIONS.slice(0, 4)).toEqual(['left', 'right', 'up', 'down']);
    for (const d of ['left', 'right', 'up', 'down'] as const) {
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

// B17: diagonal pointers for a corner of the screen; the four straight ones untouched.
describe('the diagonal edge pointers (B17)', () => {
  const STRAIGHT: Record<string, readonly string[]> = {
    left: ['7d2e5d66', '52546d5e', '53182736', '52546d5e'],
    right: ['3930d215', 'd8989025', '640b49d5', 'd8989025'],
    up: ['eb661db5', '49811ea5', '01e9c435', '49811ea5'],
    down: ['5433e194', '965a49bc', 'ffa7e2c4', '965a49bc'],
  };

  it('keeps the four straight pointers byte for byte', () => {
    for (const [d, prints] of Object.entries(STRAIGHT))
      prints.forEach((h, f) => {
        const g = townPointer2(d as 'left', f).picture.grid;
        expect(fingerprint(g).split(' ')[1], `${d} ${f}`).toBe(h);
      });
  });

  it('points each diagonal way, one size and anchor, the anchor just past the tip at its furthest', () => {
    const diagonals = ['up-left', 'up-right', 'down-left', 'down-right'] as const;
    expect(TOWN_POINTER2_DIRECTIONS.slice(4)).toEqual(diagonals);
    for (const d of diagonals) {
      const frames = Array.from({ length: TOWN_MARKER2_FRAMES }, (_, f) => townPointer2(d, f));
      const g0 = frames[0]!.picture.grid;
      for (const p of frames) {
        expect([p.picture.grid.w, p.picture.grid.h], d).toEqual([g0.w, g0.h]);
        expect(p.anchor, d).toEqual(frames[0]!.anchor);
        expect(hasKeyline(p.picture.grid), d).toBe(true);
      }
      expect(g0.w).toBe(g0.h);
      expect(g0.w * g0.h, d).toBeLessThanOrEqual(24 * 24);
      const dx = d.endsWith('left') ? -1 : 1;
      const dy = d.startsWith('up') ? -1 : 1;
      // The anchor is toward the pointed-at corner of the picture.
      expect(Math.sign(frames[0]!.anchor.x - g0.w / 2), d).toBe(dx);
      expect(Math.sign(frames[0]!.anchor.y - g0.h / 2), d).toBe(dy);
      // At its furthest the tip's keyline touches the anchor; at rest nothing is there.
      const near = (f: number) => {
        const { picture, anchor } = frames[f]!;
        const g = picture.grid;
        const c = (x: number, y: number) => g.d[y * g.w + x] ?? 0;
        return c(anchor.x - dx, anchor.y) || c(anchor.x, anchor.y - dy);
      };
      expect(stepOf(near(2)), d).toBe(6);
      expect(frames[0]!.picture.grid.d[frames[0]!.anchor.y * g0.w + frames[0]!.anchor.x]).toBe(0);
      // The four are one drawing turned: up-right mirrors up-left, down-left flips it.
      expect(townPointer2(d, 5), d).toBe(frames[1]);
    }
    for (let f = 0; f < TOWN_MARKER2_FRAMES; f++) {
      const ul = townPointer2('up-left', f).picture.grid;
      const ur = townPointer2('up-right', f).picture.grid;
      const dl = townPointer2('down-left', f).picture.grid;
      for (let y = 0; y < ul.h; y++)
        for (let x = 0; x < ul.w; x++) {
          const on = ul.d[y * ul.w + x] !== 0;
          expect(ur.d[y * ur.w + (ul.w - 1 - x)] !== 0).toBe(on);
          expect(dl.d[(ul.h - 1 - y) * dl.w + x] !== 0).toBe(on);
        }
    }
  });
});

import { describe, expect, it } from 'vitest';
import { isMat, matOf, stepOf, type TGrid } from '../../src/art/town2/cells';
import {
  townHighlight2,
  townMarker2,
  TOWN_MARKER2_FRAMES,
  TOWN_MARKER2_KINDS,
  TOWN_MARKER2_SIZES,
} from '../../src/art/town2/markers';
import {
  town2Facts,
  town2Piece,
  town2PieceFrame,
  TOWN2_PIECE_FRAMES,
} from '../../src/art/town2/pieces';
import { townsfolkWalkPicture2 } from '../../src/art/character2';

const at = (g: TGrid, x: number, y: number) =>
  x < 0 || y < 0 || x >= g.w || y >= g.h ? 0 : g.d[y * g.w + x]!;

describe('the medium marker (B17)', () => {
  it('is a third size, half as big again as the small, one canvas and anchor for every kind', () => {
    expect(TOWN_MARKER2_SIZES).toContain('medium');
    const small = townMarker2('talk', 0).picture.grid;
    const large = townMarker2('talk', 0, 'large').picture.grid;
    for (const kind of TOWN_MARKER2_KINDS) {
      const frames = Array.from({ length: TOWN_MARKER2_FRAMES }, (_, f) =>
        townMarker2(kind, f, 'medium'),
      );
      const g = frames[0]!.picture.grid;
      expect([g.w, g.h], kind).toEqual([22, 23]);
      expect(g.w / small.w, kind).toBeGreaterThan(1.3);
      expect(g.w, kind).toBeLessThan(large.w);
      for (const m of frames) {
        expect([m.picture.grid.w, m.picture.grid.h], kind).toEqual([g.w, g.h]);
        expect(m.anchor, kind).toEqual(frames[0]!.anchor);
      }
      expect(townMarker2(kind, 5, 'medium'), kind).toBe(frames[1]);
    }
  });

  it('points its badge at its anchor: the keyline just under the tip', () => {
    for (const kind of TOWN_MARKER2_KINDS) {
      if (kind === 'new') continue;
      const m = townMarker2(kind, 0, 'medium');
      const g = m.picture.grid;
      const c = at(g, m.anchor.x, m.anchor.y);
      expect(c !== 0 && stepOf(c) === 6, kind).toBe(true);
      const above = at(g, m.anchor.x, m.anchor.y - 1);
      expect(above !== 0 && isMat(above, 'gold'), kind).toBe(true);
    }
  });

  it('draws gather as a leaf and travel as a boat with a red pennant, in the medium too', () => {
    const count = (g: TGrid, m: Parameters<typeof isMat>[1]) =>
      Array.from(g.d).filter((c) => c && isMat(c, m)).length;
    expect(count(townMarker2('gather', 0, 'medium').picture.grid, 'leaf')).toBeGreaterThan(40);
    const travel = townMarker2('travel', 0, 'medium').picture.grid;
    expect(count(travel, 'crimson')).toBeGreaterThan(1);
    expect(count(travel, 'sea')).toBeGreaterThan(4);
  });
});

describe('the ring at dusk (B17)', () => {
  it('carries a soft light that shines only when the lights are on, round its whole line', () => {
    const r = townHighlight2(60, 0);
    expect(r.picture.glows.length).toBeGreaterThan(20);
    for (const g of r.picture.glows) {
      expect(g.always).toBeFalsy();
      expect(g.byDay).toBeFalsy();
      expect(g.x).toBeGreaterThanOrEqual(0);
      expect(g.x).toBeLessThanOrEqual(r.picture.grid.w);
    }
  });
});

describe('pieces that move (B17)', () => {
  it('gives the boat’s lantern two frames, its pennant stirring, nothing else about it changed', () => {
    expect(TOWN2_PIECE_FRAMES.boat_lantern).toEqual({ frames: 2, frameMs: 420 });
    const a = town2PieceFrame('boat_lantern', 0);
    const b = town2PieceFrame('boat_lantern', 1);
    expect(a).toBe(town2Piece('boat_lantern'));
    expect([b.w, b.h, b.base, b.foot]).toEqual([a.w, a.h, a.base, a.foot]);
    expect([b.picture.grid.w, b.picture.grid.h]).toEqual([a.picture.grid.w, a.picture.grid.h]);
    expect(Array.from(b.picture.grid.d)).not.toEqual(Array.from(a.picture.grid.d));
    expect(town2PieceFrame('boat_lantern', 3)).toBe(b);
    const { picture: _p, ...facts } = b;
    void _p;
    expect(facts).toEqual({ ...town2Facts('boat_lantern') });
    // A piece that does not move is itself at every frame.
    expect(town2PieceFrame('rowboat', 7)).toBe(town2Piece('rowboat'));
  });
});

describe('the boat’s painter (B17)', () => {
  it('ends in an iron ring at the boat’s top edge, the line running down from it', () => {
    const g = town2Piece('rowboat').picture.grid;
    let iron = 0;
    let ix = 0;
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < g.w; x++) {
        const c = at(g, x, y);
        if (c && stepOf(c) < 6 && isMat(c, 'iron')) {
          iron++;
          ix = x;
        }
      }
    expect(iron).toBeGreaterThan(10);
    // The line hangs from the ring's foot: rope just below it.
    let rope = false;
    for (let y = 6; y < 12; y++)
      for (let x = ix - 5; x <= ix + 2; x++) {
        const c = at(g, x, y);
        if (c && isMat(c, 'linen')) rope = true;
      }
    expect(rope).toBe(true);
  });
});

describe('the ferryman walking across (B17)', () => {
  it('carries his oar clear of his face: the loom never runs over his chin or beard', () => {
    for (const facing of ['right', 'left'] as const)
      for (let f = 0; f < 8; f++) {
        const g = townsfolkWalkPicture2('ferryman', facing, f)!.grid;
        for (let y = 0; y < 30; y++) {
          const face: number[] = [];
          const oar: number[] = [];
          for (let x = 0; x < g.w; x++) {
            const c = at(g, x, y);
            if (!c || stepOf(c) === 6) continue;
            const m = matOf(c);
            if (m === 'pinewood') oar.push(x);
            else if (m === 'skingolden' || m === 'hairgrey') face.push(x);
          }
          if (!face.length || !oar.length) continue;
          // The oar stands wholly in front of the face, a pixel clear of it.
          const front =
            facing === 'right'
              ? Math.min(...oar) - Math.max(...face)
              : Math.min(...face) - Math.max(...oar);
          expect(front, `${facing} ${f} row ${y}`).toBeGreaterThan(1);
        }
      }
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  townsfolkName2,
  townsfolkPicture2,
  townsfolkWalkPicture2,
  TOWNSFOLK2_IDS,
  WALK2_FRAMES,
} from '../../src/art/character2';
import { portraitPicture2, PORTRAIT2_SAFE } from '../../src/art/portraits2';
import { measureSafe2 } from '../../src/art/dungeon2/safe';
import { ROWBOAT_LANTERN_AT, town2Facts, town2Piece, TOWN2_IDS } from '../../src/art/town2/pieces';
import { town2Layout } from '../../src/art/town2/town';
import {
  townHighlight2,
  townMarker2,
  TOWN_MARKER2_FRAMES,
  TOWN_MARKER2_FRAME_MS,
  TOWN_MARKER2_KINDS,
} from '../../src/art/town2/markers';
import { isMat, matOf, stepOf, type TGrid } from '../../src/art/town2/cells';
import { DAY2, DUSK2 } from '../../src/art/town2/ramps';
import { shines } from '../../src/art/raster';

vi.setConfig({ testTimeout: 60_000 });

const count = (g: TGrid, mat: string) => Array.from(g.d).filter((c) => matOf(c) === mat).length;

describe('the ferryman (B15)', () => {
  it('is a townsperson by id, named, standing on the figure canvas in his yellow oilskin', () => {
    expect(TOWNSFOLK2_IDS).toContain('ferryman');
    expect(townsfolkName2('ferryman')).toBe('The ferryman');
    const g = townsfolkPicture2('ferryman')!.grid;
    expect([g.w, g.h]).toEqual([56, 72]);
    let low = 0;
    for (let i = 0; i < g.d.length; i++) if (g.d[i]) low = Math.floor(i / g.w);
    expect(low).toBe(70);
    // Yellow, so he reads from across the harbour.
    expect(count(g, 'ochre')).toBeGreaterThan(500);
  });

  it('walks in every facing with his oar in his hand', () => {
    for (const facing of ['down', 'right', 'left', 'up'] as const)
      for (let f = 0; f < WALK2_FRAMES; f++) {
        const g = townsfolkWalkPicture2('ferryman', facing, f)!.grid;
        expect(count(g, 'pinewood'), `${facing} ${f}`).toBeGreaterThan(40);
      }
  });

  it('has a face with its safe box', () => {
    expect(portraitPicture2('ferryman')).not.toBeNull();
    expect(PORTRAIT2_SAFE.ferryman).toEqual(measureSafe2('ferryman'));
  });
});

describe('the ferry’s pieces on the quay (B15)', () => {
  it('draws the sign and the bow lantern as town pieces, their lamps lit at dusk only', () => {
    for (const id of ['boat_sign', 'boat_lantern'] as const) {
      expect(TOWN2_IDS).toContain(id);
      const p = town2Piece(id);
      expect(p.picture.glows.length, id).toBeGreaterThan(0);
      for (const glow of p.picture.glows) {
        expect(shines(glow, DUSK2), id).toBe(true);
        expect(shines(glow, DAY2), id).toBe(false);
      }
    }
    // The sign stands on a post a tile square; the lantern rides in the boat.
    expect(town2Facts('boat_sign').ground.w).toBeLessThanOrEqual(24);
    expect(town2Facts('boat_lantern').ground).toEqual({ w: 0, d: 0 });
  });

  it('keeps the rowing boat’s id, size and base, now with its oars and painted strake', () => {
    const f = town2Facts('rowboat');
    expect([f.w, f.h, f.base, f.foot]).toEqual([135, 58, 54, 68]);
    const g = town2Piece('rowboat').picture.grid;
    expect(count(g, 'pinewood')).toBeGreaterThan(100);
    // B16: the strake painted white over a red line (it was blue, lost against the sea).
    expect(count(g, 'sail')).toBeGreaterThan(150);
    expect(count(g, 'crimson')).toBeGreaterThan(80);
    // The lantern's place is inside the boat.
    expect(ROWBOAT_LANTERN_AT.x).toBeGreaterThan(f.w / 2);
    expect(ROWBOAT_LANTERN_AT.x).toBeLessThan(f.w);
    expect(ROWBOAT_LANTERN_AT.y).toBeLessThan(f.base);
  });

  it('leaves the town’s layout to lane C: no placement moved, none added', () => {
    const names = town2Layout().map((p) => p.name);
    expect(names).not.toContain('boat_sign');
    expect(town2Layout().some((p) => p.id === 'boat_sign' || p.id === 'boat_lantern')).toBe(false);
    const boat = town2Layout().find((p) => p.name === 'rowboat')!;
    expect([boat.x + town2Facts('rowboat').foot, boat.base]).toEqual([520, 1522]);
  });
});

describe('interaction markers (B15)', () => {
  it('draws a marker of each kind, its frames differing, all one size with one anchor', () => {
    expect(TOWN_MARKER2_KINDS).toEqual(['talk', 'enter', 'gather', 'travel', 'new']);
    expect(TOWN_MARKER2_FRAMES).toBe(4);
    expect(TOWN_MARKER2_FRAME_MS).toBeGreaterThan(80);
    for (const kind of TOWN_MARKER2_KINDS) {
      const frames = Array.from({ length: TOWN_MARKER2_FRAMES }, (_, f) => townMarker2(kind, f));
      const g0 = frames[0]!.picture.grid;
      expect(g0.w * g0.h, kind).toBeLessThanOrEqual(18 * 20);
      for (const m of frames) {
        expect([m.picture.grid.w, m.picture.grid.h], kind).toEqual([g0.w, g0.h]);
        expect(m.anchor, kind).toEqual(frames[0]!.anchor);
        // A dark keyline round it, so it reads over busy cobbles.
        expect(
          Array.from(m.picture.grid.d).some((c) => c && stepOf(c) === 6),
          kind,
        ).toBe(true);
      }
      expect(Array.from(frames[0]!.picture.grid.d), kind).not.toEqual(
        Array.from(frames[2]!.picture.grid.d),
      );
      expect(townMarker2(kind, 5), kind).toBe(townMarker2(kind, 1));
    }
  });

  it('rings the nearest thing: an unbroken gold line between dark keylines, its anchor its middle', () => {
    const r = townHighlight2(60);
    const g = r.picture.grid;
    expect(g.w).toBeGreaterThanOrEqual(60);
    expect(Array.from(g.d).filter(Boolean).length).toBeGreaterThan(40);
    // B16: gold, kept between keylines a step off the line so it never reads as foam on the sea.
    const gold = Array.from(g.d).filter((c) => c && isMat(c, 'gold')).length;
    const keys = Array.from(g.d).filter((c) => c && isMat(c, 'tar')).length;
    expect(gold).toBeGreaterThan(120);
    expect(keys).toBeGreaterThan(gold);
    // Unbroken: every gold pixel has a gold neighbour on each side along the ring (8-connected).
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        if (!isMat(g.d[y * g.w + x]!, 'gold')) continue;
        let near = 0;
        for (let j = -1; j <= 1; j++)
          for (let i = -1; i <= 1; i++) {
            if (!i && !j) continue;
            const c = g.d[(y + j) * g.w + x + i];
            if (c && isMat(c, 'gold')) near++;
          }
        expect(near, `${x},${y}`).toBeGreaterThanOrEqual(2);
      }
    expect(Math.abs(r.anchor.x - g.w / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.anchor.y - g.h / 2)).toBeLessThanOrEqual(1);
    expect(Array.from(townHighlight2(60, 1).picture.grid.d)).not.toEqual(Array.from(g.d));
  });
});

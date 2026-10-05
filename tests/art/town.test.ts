import { describe, expect, it } from 'vitest';
import { get, type Grid } from '../../src/art/grid';
import { DAY, DUSK } from '../../src/art/palette';
import { shines } from '../../src/art/raster';
import {
  TOWN_H,
  TOWN_IDS,
  TOWN_W,
  townLayout,
  townPicture,
  townPiece,
  type TownId,
} from '../../src/art/town';
import { asMockupGlows, loadMockup, withB5Hand } from './mockup';

const mockup = loadMockup();

/** The lowest row with anything but outline in it: where a drawing meets the ground. */
function lowestRow(g: Grid): number {
  for (let y = g.h - 1; y >= 0; y--)
    for (let x = 0; x < g.w; x++) {
      const c = get(g, x, y);
      if (c && c !== 'ink1') return y;
    }
  return -1;
}

describe('the assembled town', () => {
  it('is the mock-up’s town, pixel for pixel, but for B5’s change to the hero’s hand', () => {
    mockup.dusk(false);
    const hero = townLayout().find((p) => p.id === 'hero')!;
    const theirs = withB5Hand(mockup.town(), hero.x, hero.y);
    const ours = townPicture().grid;
    expect([ours.w, ours.h]).toEqual([TOWN_W, TOWN_H]);
    expect([theirs.w, theirs.h]).toEqual([TOWN_W, TOWN_H]);
    const wrong = ours.d.flatMap((c, i) => (c === theirs.d[i] ? [] : [i]));
    expect(wrong.slice(0, 10).map((i) => [i % TOWN_W, (i / TOWN_W) | 0])).toEqual([]);
  });

  it('glows where the mock-up glows, by day and at dusk', () => {
    const glows = townPicture().glows;
    for (const [palette, night] of [
      [DAY, false],
      [DUSK, true],
    ] as const) {
      mockup.dusk(night);
      mockup.town();
      const theirs = mockup.glows().map((g) => [...g]);
      const ours = asMockupGlows(glows.filter((g) => shines(g, palette)));
      expect(ours.length).toBe(theirs.length);
      ours.forEach((g, i) => g.forEach((v, j) => expect(v).toBeCloseTo(theirs[i]?.[j] ?? NaN, 9)));
    }
  });

  it('places only pieces from the index, and every piece somewhere', () => {
    const placed = new Set(townLayout().map((p) => p.id));
    expect([...placed].sort()).toEqual([...TOWN_IDS].sort());
  });
});

describe('the town index', () => {
  it('gives each piece its picture and size', () => {
    for (const id of TOWN_IDS) {
      const piece = townPiece(id);
      expect(piece.id).toBe(id);
      expect([piece.w, piece.h]).toEqual([piece.picture.grid.w, piece.picture.grid.h]);
      expect(piece.picture.grid.d.some(Boolean), id).toBe(true);
    }
  });

  it('puts each base line on the lowest row of the drawing', () => {
    const bases = Object.fromEntries(TOWN_IDS.map((id) => [id, townPiece(id).base]));
    const lowest = Object.fromEntries(
      TOWN_IDS.map((id) => [id, lowestRow(townPiece(id).picture.grid)]),
    );
    expect(bases).toEqual(lowest);
  });

  it('puts walk-up spots on the ground just in front of their door or counter', () => {
    const spots: [TownId, string][] = [
      ['tavern', 'door'],
      ['smithy', 'door'],
      ['stall', 'counter'],
    ];
    for (const [id, name] of spots) {
      const piece = townPiece(id);
      const spot = piece.spots[name];
      expect(spot, `${id} ${name}`).toBeDefined();
      if (!spot) continue;
      expect(spot.x).toBeGreaterThan(0);
      expect(spot.x).toBeLessThan(piece.w);
      expect(spot.y).toBeGreaterThan(piece.base);
      expect(spot.y).toBeLessThanOrEqual(piece.base + 3);
    }
    const tavern = townPiece('tavern');
    // The tavern's door is planks above its spot.
    expect(get(tavern.picture.grid, 63, 100)).toBe('wood2');
  });

  it('attaches the chimney smoke where the mock-up puffs it', () => {
    const layout = townLayout();
    const at = (id: TownId) => layout.find((p) => p.id === id);
    for (const id of ['tavern', 'smithy'] as const) {
      const building = at(id);
      for (const a of townPiece(id).attached) {
        const other = at(a.id);
        expect(other).toBeDefined();
        expect([other?.x, other?.y]).toEqual([(building?.x ?? 0) + a.x, (building?.y ?? 0) + a.y]);
        expect(townPiece(a.id).layer).toBe('above');
      }
    }
  });

  it('is the very picture the town was drawn with', () => {
    const town = townPicture().grid;
    const smithy = townPiece('smithy').picture.grid;
    const place = townLayout().find((p) => p.id === 'smithy');
    // The smithy's roof ridge is untouched by anything drawn later.
    for (let x = 20; x < 60; x++)
      expect(get(town, (place?.x ?? 0) + x, (place?.y ?? 0) + 12)).toBe(get(smithy, x, 12));
  });
});

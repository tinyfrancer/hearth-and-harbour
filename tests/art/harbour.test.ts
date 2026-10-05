import { describe, expect, it } from 'vitest';
import type { Grid } from '../../src/art/grid';
import {
  PIER_LENGTH,
  anvil,
  bucket,
  buoy,
  crab,
  gull,
  net,
  pier,
  rowboat,
  ship,
  signpost,
  smithy,
  smithySmoke,
  stall,
  tavernSmoke,
  wreckRock,
} from '../../src/art/harbour';
import { DAY, DUSK, type Palette } from '../../src/art/palette';
import { shines, type Picture } from '../../src/art/raster';
import { seeded } from '../../src/art/rng';
import { asMockupGlows, cut, loadMockup, sourceLine, statements } from './mockup';

const mockup = loadMockup();

/**
 * Draws `code` (statements from the mock-up's town()) on an empty canvas and
 * checks that everything it drew is `ours`, placed at (x, y), and nothing else.
 */
function sameAsMockup(ours: Grid, code: string, x: number, y: number, seed = 21) {
  const { grid } = mockup.only(code, seed, false);
  expect(cut(grid, x, y, ours.w, ours.h)).toEqual(ours.d);
  const drawn = grid.d.filter(Boolean).length;
  expect(ours.d.filter(Boolean).length, 'nothing drawn outside the piece').toBe(drawn);
}

/** Our glows lit in a palette, placed at (x, y), in the mock-up's form. */
const litGlows = (pic: Picture, palette: Palette, x: number, y: number) =>
  asMockupGlows(
    pic.glows.filter((g) => shines(g, palette)).map((g) => ({ ...g, x: g.x + x, y: g.y + y })),
  );

describe('the harbour’s pieces, against the mock-up’s own drawing', () => {
  it('draws the smithy as the mock-up does for the same seed', () => {
    for (const seed of [21, 5]) {
      const code = statements('smithy(171,35);');
      sameAsMockup(smithy(seeded(seed)).grid, code, 171, 35, seed);
    }
  });

  it('keeps the forge lit by day and lights the forge and window at dusk', () => {
    const pic = smithy(seeded(21));
    const code = statements('smithy(171,35);');
    expect(litGlows(pic, DAY, 171, 35)).toEqual(mockup.only(code, 21, false).glows);
    expect(litGlows(pic, DUSK, 171, 35)).toEqual(mockup.only(code, 21, true).glows);
  });

  it('draws the stall, signpost and anvil', () => {
    sameAsMockup(stall(), statements('blit(g,stall(),14,156);'), 14, 156);
    sameAsMockup(
      signpost(),
      statements(sourceLine('const sg=P(20,22)'), sourceLine('rect(sg,2,12,15,5')),
      126,
      96,
    );
    sameAsMockup(anvil(), statements(sourceLine('const an=P(17,12)')), 188, 130);
  });

  it('draws the net, the bucket and the crab', () => {
    sameAsMockup(net(), statements(sourceLine('for(let i=0;i<7;i++)line(g,104')), 104, 210);
    sameAsMockup(bucket(), statements(sourceLine('ell(g,160,217,5,3')), 155, 213);
    sameAsMockup(crab(), statements(sourceLine('blit(g,outlined(rows(["cc')), 245, 216);
  });

  it('draws the pier with the foam round its piles, for the same seed', () => {
    const code = statements(
      sourceLine('const d=P(36,126)'),
      sourceLine('for(let i=0;i<60;i++){const x=3+(R()*28|0)'),
      sourceLine('for(let y=0;y<126;y+=30)'),
      sourceLine('blit(g,outlined(d),135,216);'),
      sourceLine('for(let y=244;y<340;y+=15)'),
    );
    for (const seed of [21, 9]) sameAsMockup(pier(seeded(seed)), code, 132, 216, seed);
    expect(pier(seeded(1)).h).toBe(PIER_LENGTH + 2);
  });

  it('draws the ship with its waterline foam, and lights its cabin window at dusk', () => {
    const code = statements(sourceLine('ship(180,242);'));
    const pic = ship();
    sameAsMockup(pic.grid, code, 180, 242);
    expect(litGlows(pic, DUSK, 180, 242)).toEqual(mockup.only(code, 21, true).glows);
    expect(litGlows(pic, DAY, 180, 242)).toEqual([]);
  });

  it('draws the rowing boat with its mooring line, and the buoy', () => {
    sameAsMockup(rowboat(), statements(sourceLine('const b=P(33,13)')), 60, 236);
    sameAsMockup(buoy(), statements(sourceLine('const bu=P(7,11)')), 104, 306);
  });

  it('draws the rock with its face and wreck, for the same seed', () => {
    const code = statements(
      sourceLine('const rk=P(66,45)'),
      sourceLine('sp(rk,40,2,14,60,30'),
      sourceLine('rect(rk,11,25,4,4'),
      sourceLine('line(rk,36,33,54,0'),
      sourceLine('for(let x=47;x<58;x++)'),
      sourceLine('blit(g,outlined(rk),12,288);'),
    );
    for (const seed of [21, 3]) sameAsMockup(wreckRock(seeded(seed)), code, 12, 288, seed);
  });

  it('draws the chimney smoke', () => {
    sameAsMockup(tavernSmoke(), statements(sourceLine('[[104,14,4.5]')), 99, 0);
    sameAsMockup(smithySmoke(), statements(sourceLine('[[249,29,4.5]')), 244, 9);
  });

  it('draws the gulls', () => {
    const { grid } = mockup.only(statements(sourceLine('[[225,264],[36,258]')), 21, false);
    const one = gull();
    for (const [x, y] of [
      [223, 263],
      [34, 257],
      [112, 339],
    ] as const)
      expect(cut(grid, x, y, one.w, one.h)).toEqual(one.d);
    expect(grid.d.filter(Boolean).length).toBe(3 * one.d.filter(Boolean).length);
  });
});

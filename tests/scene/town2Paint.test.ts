import { describe, expect, it } from 'vitest';
import { isMat } from '../../src/art/town2/cells';
import { town2Piece } from '../../src/art/town2/pieces';
import { shoreAt, town2Ground, TOWN2_H, TOWN2_W } from '../../src/art/town2/town';
import {
  SMOKE_FRAMES,
  foamBand,
  groundPixels,
  shiftedFoam,
  smokeFrame,
  townLights,
} from '../../src/scene/town2Paint';
import { DAY2 } from '../../src/art/town2/ramps';
import { rasterize2 } from '../../src/art/town2/raster';

// The C-scale town's pixels, worked out without a canvas. Composing the art
// lane's ground takes a second or two, so these share it and wait longer.

describe('the C-scale town’s pixels', () => {
  it('lights the town with exactly the lights the art lane lays on its ground', () => {
    const theirs = town2Ground('dusk').glows;
    expect(townLights()).toEqual(theirs);
  }, 30000);

  it('paints the ground in strips exactly as it would whole, with every piece in depth order', () => {
    const px = groundPixels('day');
    expect(px.ground.length).toBe(TOWN2_W * TOWN2_H * 4);
    // A band of rows across a strip's edge (rows 120-136), against the art lane's own raster of them.
    const pic = town2Ground('day');
    const whole = rasterize2(
      {
        grid: { w: TOWN2_W, h: 16, d: pic.grid.d.subarray(120 * TOWN2_W, 136 * TOWN2_W) },
        glows: pic.glows.map((g) => ({ ...g, y: g.y - 120 })),
      },
      DAY2,
    );
    expect(px.ground.subarray(120 * TOWN2_W * 4, 136 * TOWN2_W * 4)).toEqual(whole.data);
    const bases = px.standing.map((s) => s.base);
    expect(bases).toEqual([...bases].sort((a, b) => a - b));
    for (const s of px.standing) expect(px.pieces[s.piece]).toBeDefined();
  }, 30000);

  it('moves the foam only on water by the shore, leaving the pier and boats alone', () => {
    const ground = town2Ground('day').grid;
    const { grid, band } = shiftedFoam(ground);
    expect(band).toEqual(foamBand());
    let changed = 0;
    for (let y = 0; y < band.h; y++)
      for (let x = 0; x < band.w; x++) {
        const c = grid.d[y * band.w + x]!;
        if (!c) continue;
        changed++;
        expect(isMat(ground.d[(y + band.y) * TOWN2_W + x]!, 'sea')).toBe(true);
        expect(Math.abs(y + band.y - shoreAt(x))).toBeLessThanOrEqual(5);
      }
    expect(changed).toBeGreaterThan(500);
  }, 30000);

  it('sways chimney smoke without moving its mouth, and comes back round to where it began', () => {
    const src = town2Piece('smithy_smoke').picture.grid;
    expect(smokeFrame(src, 0).d).toEqual(src.d);
    expect(smokeFrame(src, SMOKE_FRAMES).d).toEqual(src.d);
    const bottom = (d: Int16Array) => d.slice((src.h - 1) * src.w);
    for (let f = 0; f < SMOKE_FRAMES; f++)
      expect(bottom(smokeFrame(src, f).d)).toEqual(bottom(src.d));
    expect(smokeFrame(src, 3).d).not.toEqual(src.d);
  });
});

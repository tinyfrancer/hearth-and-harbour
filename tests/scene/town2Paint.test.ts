import { describe, expect, it } from 'vitest';
import { isMat, matOf, stepOf } from '../../src/art/town2/cells';
import { town2Piece } from '../../src/art/town2/pieces';
import { shoreAt, town2Ground, TOWN2_H, TOWN2_W } from '../../src/art/town2/town';
import {
  SMOKE_FRAMES,
  foamBand,
  shiftedFoam,
  smokeFrame,
  townLights,
} from '../../src/scene/town2Paint';
import { paintTown, town2Facts } from '../../src/scene/town2Facts';
import { feetOf, TOWNSFOLK2_AT } from '../../src/scene/town2';
import { shadowBox } from '../../src/scene/shadow2';
import { DAY2 } from '../../src/art/town2/ramps';
import { rasterize2 } from '../../src/art/town2/raster';

// The town's pixels, worked out without a canvas, as the worker works them
// out. Composing the art lane's ground takes a second or two, so these share
// it and wait longer.

describe('the C-scale town’s pixels', () => {
  it('lights the town with exactly the lights the art lane lays on its ground', () => {
    const theirs = town2Ground('dusk').glows;
    expect(townLights()).toEqual(theirs);
  }, 30000);

  it('paints the ground in strips exactly as it would whole, with every piece in depth order', () => {
    const px = paintTown('day');
    expect(px.composed).toBe(false);
    expect(px.still.data.length).toBe(TOWN2_W * TOWN2_H * 4);
    // A band of rows across a strip's edge (rows 120-136, nobody standing there), against the art lane's own raster.
    const pic = town2Ground('day');
    const whole = rasterize2(
      {
        grid: { w: TOWN2_W, h: 16, d: pic.grid.d.subarray(120 * TOWN2_W, 136 * TOWN2_W) },
        glows: pic.glows.map((g) => ({ ...g, y: g.y - 120 })),
      },
      DAY2,
    );
    expect(px.still.data.subarray(120 * TOWN2_W * 4, 136 * TOWN2_W * 4)).toEqual(whole.data);
    const bases = px.standing.map((s) => s.base);
    expect(bases).toEqual([...bases].sort((a, b) => a - b));
    for (const s of px.standing) expect(px.pieces[s.piece]).toBeDefined();
  }, 30000);

  it('lays a contact shadow under each of the townsfolk: their ground a step or two darker, nothing else', () => {
    for (const time of ['day', 'dusk'] as const) {
      const px = paintTown(time);
      const theirs = town2Ground(time).grid.d;
      const box = shadowBox(time);
      const near = (i: number): boolean => {
        const x = i % TOWN2_W;
        const y = Math.floor(i / TOWN2_W);
        return TOWNSFOLK2_AT.some((p) => {
          const f = feetOf(p);
          return (
            x >= f.x + box.x &&
            x < f.x + box.x + box.w &&
            y >= f.y + box.y &&
            y < f.y + box.y + box.h
          );
        });
      };
      let darkened = 0;
      for (let i = 0; i < theirs.length; i++) {
        const was = theirs[i]!;
        const now = px.cells[i]!;
        if (was === now) continue;
        darkened++;
        expect(near(i)).toBe(true);
        expect(matOf(now)).toBe(matOf(was));
        expect(stepOf(now) - stepOf(was)).toBeGreaterThanOrEqual(1);
        expect(stepOf(now) - stepOf(was)).toBeLessThanOrEqual(2);
        expect(stepOf(now)).toBeLessThanOrEqual(5);
      }
      expect(darkened).toBeGreaterThan(TOWNSFOLK2_AT.length * 40);
      // Every townsperson painted both ways, and the smoke frame by frame.
      expect(px.folk).toHaveLength(TOWNSFOLK2_AT.length);
      for (const f of px.folk) expect(f.right && f.left).toBeTruthy();
      for (const frames of px.smoke) expect(frames).toHaveLength(SMOKE_FRAMES);
      expect(px.gull.right && px.gull.left).toBeTruthy();
    }
  }, 60000);

  it('hands the page the facts as plain data: the scene, the lights, the smoke and the gulls', () => {
    const facts = town2Facts();
    expect(structuredClone(facts)).toEqual(facts);
    expect(facts.lights).toEqual(town2Ground('dusk').glows);
    expect(facts.smoke.length).toBe(paintTown('day').smoke.length);
    expect(facts.gulls.length).toBe(3);
  }, 60000);

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

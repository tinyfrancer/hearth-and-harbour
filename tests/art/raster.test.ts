import { describe, expect, it } from 'vitest';
import { parseSprite } from '../../src/art/grid';
import { DAY, DUSK } from '../../src/art/palette';
import { colourPixels, picture, rasterize } from '../../src/art/raster';

const pixel = (data: ArrayLike<number>, width: number, x: number, y: number) =>
  Array.from({ length: 4 }, (_, c) => data[(y * width + x) * 4 + c]);

describe('rasterize', () => {
  const pic = picture(parseSprite(['a.', '.b'], { a: 'fire1', b: 'ink1' }));

  it('turns steps into the palette’s colours, empty pixels clear', () => {
    const image = rasterize(pic, DAY, 1);
    expect([image.width, image.height]).toEqual([2, 2]);
    expect(pixel(image.data, 2, 0, 0)).toEqual([0xff, 0xe2, 0x7a, 255]);
    expect(pixel(image.data, 2, 1, 0)).toEqual([0, 0, 0, 0]);
    expect(pixel(image.data, 2, 1, 1)).toEqual([0x1a, 0x12, 0x24, 255]);
  });

  it('draws the same picture in the dusk palette', () => {
    const image = rasterize(pic, DUSK, 1);
    expect(pixel(image.data, 2, 1, 1)).toEqual([0x15, 0x0d, 0x20, 255]);
  });

  it('makes every art pixel a whole square of device pixels', () => {
    const image = rasterize(pic, DAY, 3);
    expect([image.width, image.height]).toEqual([6, 6]);
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 3; x++) {
        expect(pixel(image.data, 6, x, y)).toEqual([0xff, 0xe2, 0x7a, 255]);
        expect(pixel(image.data, 6, x + 3, y)[3]).toBe(0);
        expect(pixel(image.data, 6, x + 3, y + 3)).toEqual([0x1a, 0x12, 0x24, 255]);
      }
  });

  it('refuses a fractional scale', () => {
    expect(() => rasterize(pic, DAY, 2.5)).toThrow('whole number');
    expect(() => rasterize(pic, DAY, 0)).toThrow('whole number');
  });
});

describe('glows', () => {
  const dark = parseSprite(['kkkkk', 'kkkkk', 'kkkkk'], { k: 'ink1' });
  const lit = picture(dark, [{ x: 2.5, y: 1.5, radius: 3, strength: 0.5 }]);

  it('only shine when the lights are on', () => {
    const day = colourPixels(lit, DAY);
    expect(Array.from(day.subarray(28, 32))).toEqual([0x1a, 0x12, 0x24, 255]);
    const dusk = colourPixels(lit, DUSK);
    // The centre pixel gets the full strength of warm light added.
    expect(Array.from(dusk.subarray(28, 32))).toEqual([
      0x15 + 255 * 0.5,
      0x0d + 170 * 0.5,
      0x20 + 70 * 0.5,
      255,
    ]);
  });

  it('fade toward the edge of their radius', () => {
    const dusk = colourPixels(lit, DUSK);
    const red = (x: number) => dusk[(1 * 5 + x) * 4] as number;
    expect(red(2)).toBeGreaterThan(red(1));
    expect(red(1)).toBeGreaterThan(red(0));
    expect(red(0)).toBeGreaterThan(0x15);
  });

  it('can be lit all day, like a forge', () => {
    const forge = picture(dark, [{ x: 2.5, y: 1.5, radius: 3, strength: 0.5, always: true }]);
    expect(colourPixels(forge, DAY)[28]).toBeGreaterThan(0x1a);
  });

  it('can shine by day only, giving way to a stronger glow at dusk', () => {
    const forge = picture(dark, [
      { x: 2.5, y: 1.5, radius: 3, strength: 0.25, byDay: true },
      { x: 2.5, y: 1.5, radius: 3, strength: 0.5 },
    ]);
    expect(colourPixels(forge, DAY)[28]).toBeCloseTo(0x1a + 255 * 0.25, 6);
    expect(colourPixels(forge, DUSK)[28]).toBeCloseTo(0x15 + 255 * 0.5, 6);
  });
});

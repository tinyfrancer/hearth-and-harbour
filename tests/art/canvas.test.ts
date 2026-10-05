import { describe, expect, it } from 'vitest';
import { cssStep, deviceSize, gameScale, pixelCanvas, wholeScale } from '../../src/art/canvas';
import { parseSprite } from '../../src/art/grid';
import { DAY } from '../../src/art/palette';
import { picture } from '../../src/art/raster';

describe('scale', () => {
  it('fits a 270-pixel world across common phones at a whole number', () => {
    expect(gameScale(390, 3)).toBe(4); // iPhone 12 to 15
    expect(gameScale(430, 3)).toBe(4); // Pro Max
    expect(gameScale(375, 2)).toBe(2); // iPhone SE
    expect(gameScale(412, 2.625)).toBe(4); // many Androids
    expect(gameScale(360, 3)).toBe(4);
    expect(gameScale(480, 2)).toBe(3);
  });

  it('never goes below one, never a fraction', () => {
    expect(gameScale(100, 1)).toBe(1);
    for (let w = 200; w <= 1000; w += 7)
      for (const dpr of [1, 1.5, 2, 2.625, 3])
        expect(Number.isInteger(gameScale(w, dpr))).toBe(true);
  });

  it('is exact on the boundary', () => {
    expect(wholeScale(90, 3)).toBe(1);
    expect(wholeScale(270, 2)).toBe(2);
    expect(wholeScale(269, 2)).toBe(1);
  });
});

describe('pixelCanvas', () => {
  it('sizes the canvas so one canvas pixel is one device pixel', () => {
    const pic = picture(parseSprite(['aaa', 'aaa'], { a: 'wood1' }));
    const canvas = pixelCanvas(pic, { palette: DAY, scale: 4, dpr: 2, label: 'Three planks' });
    expect([canvas.width, canvas.height]).toEqual([12, 8]);
    expect([canvas.style.width, canvas.style.height]).toEqual(['6px', '4px']);
    expect(canvas.getAttribute('aria-label')).toBe('Three planks');
  });

  it('pads to a whole CSS pixel, so the browser never stretches it', () => {
    const pic = picture(parseSprite(['aaa', 'aaa'], { a: 'wood1' }));
    const canvas = pixelCanvas(pic, { palette: DAY, scale: 4, dpr: 3 });
    // 12 x 8 device pixels of picture on a 12 x 9 canvas: 4 x 3 CSS pixels.
    expect([canvas.width, canvas.height]).toEqual([12, 9]);
    expect([canvas.style.width, canvas.style.height]).toEqual(['4px', '3px']);
  });

  it('pads only up to the next size that is whole in CSS and device pixels', () => {
    expect(deviceSize(58, 8, 3)).toBe(465);
    expect(deviceSize(60, 4, 3)).toBe(240);
    expect(deviceSize(58, 4, 2)).toBe(232);
    expect(cssStep(2.625)).toBe(8);
    expect(deviceSize(58, 4, 2.625)).toBe(252); // 96 CSS pixels
    expect(cssStep(1.5)).toBe(2);
  });
});

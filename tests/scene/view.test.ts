import { describe, expect, it } from 'vitest';
import { cameraFor } from '../../src/scene/camera';
import { SCENE_WIDTH, canvasFit, sceneScale, tapToWorld, viewSize } from '../../src/scene/scale';

describe('cameraFor', () => {
  const view = { width: 270, height: 400 };
  const world = { width: 480, height: 704 };

  it('keeps the focus in the middle away from the edges', () => {
    expect(cameraFor({ x: 240, y: 352 }, view, world)).toEqual({ x: 105, y: 152 });
  });

  it('stops at the top-left edges', () => {
    expect(cameraFor({ x: 10, y: 5 }, view, world)).toEqual({ x: 0, y: 0 });
  });

  it('stops at the bottom-right edges', () => {
    expect(cameraFor({ x: 470, y: 700 }, view, world)).toEqual({ x: 210, y: 304 });
  });

  it('centres a map smaller than the view on that axis', () => {
    expect(cameraFor({ x: 50, y: 352 }, { width: 600, height: 400 }, world)).toEqual({
      x: -60,
      y: 152,
    });
  });

  it('lands on whole art pixels even when the view is a fraction wide', () => {
    const camera = cameraFor({ x: 200.3, y: 300.7 }, { width: 292.5, height: 525.25 }, world);
    expect(Number.isInteger(camera.x)).toBe(true);
    expect(Number.isInteger(camera.y)).toBe(true);
  });
});

describe('sceneScale', () => {
  // Screen areas in device pixels: the Town tab's space, not the whole screen.
  const phones: [string, number, number, number][] = [
    ['iPhone 14 (390 at 3x)', 1170, 2100, 4],
    ['iPhone SE (375 at 2x)', 750, 1100, 2],
    ['small phone (320 at 2x)', 640, 900, 2],
    ['small phone (320 at 3x)', 960, 1400, 3],
    ['Pixel (412 at 2.625x)', 1081, 1900, 4],
    ['Android (360 at 3x)', 1080, 1900, 4],
    ['iPhone Pro Max (430 at 3x)', 1290, 2300, 4],
    ['desktop app column (480 at 1x)', 480, 700, 1],
    ['narrower than a scene (200 at 1x)', 200, 400, 1],
  ];

  it.each(phones)('is a whole number for %s', (_name, width, height, expected) => {
    const scale = sceneScale({ width, height });
    expect(Number.isInteger(scale)).toBe(true);
    expect(scale).toBe(expected);
  });

  it('always shows at least a scene’s width when the screen is that wide', () => {
    for (let width = SCENE_WIDTH; width <= 3000; width += 7) {
      const scale = sceneScale({ width, height: 4000 });
      expect(Number.isInteger(scale)).toBe(true);
      expect(width / scale).toBeGreaterThanOrEqual(SCENE_WIDTH);
      // ...and is the biggest that does.
      expect(width / (scale + 1)).toBeLessThan(SCENE_WIDTH);
    }
  });

  it('gives up width for height on a phone turned on its side', () => {
    // 480 CSS pixels of app at 3x, with about 250 CSS pixels of height left.
    const scale = sceneScale({ width: 1440, height: 750 });
    expect(scale).toBe(4);
    expect(750 / scale).toBeGreaterThanOrEqual(160);
  });
});

describe('canvasFit', () => {
  it('fits a whole number of CSS pixels that is also whole in device pixels, never stretched', () => {
    // The Town screen on a 390-wide phone at 3x is 727.4 CSS pixels tall.
    expect(canvasFit({ width: 390, height: 727.40625 }, 3)).toEqual({
      css: { width: 390, height: 727 },
      device: { width: 1170, height: 2181 },
    });
  });

  it('steps by the smallest whole size at a fractional ratio', () => {
    // At 2.625x, 8 CSS pixels is the smallest that is 21 whole device pixels.
    const fit = canvasFit({ width: 412, height: 700.5 }, 2.625);
    expect(fit.css).toEqual({ width: 408, height: 696 });
    expect(fit.device).toEqual({ width: 1071, height: 1827 });
    expect(fit.css.width * 2.625).toBe(fit.device.width);
  });

  it('keeps a box that is already whole as it is', () => {
    expect(canvasFit({ width: 480, height: 273 }, 1).css).toEqual({ width: 480, height: 273 });
  });
});

describe('viewSize and tapToWorld', () => {
  it('shows the device pixels divided by the scale', () => {
    expect(viewSize({ width: 1170, height: 2100 }, 4)).toEqual({ width: 292.5, height: 525 });
  });

  it('turns a tap on the canvas into a point in the scene', () => {
    const css = { width: 390, height: 700 };
    const device = { width: 1170, height: 2100 };
    expect(tapToWorld({ x: 0, y: 0 }, css, device, 4, { x: 100, y: 50 })).toEqual({
      x: 100,
      y: 50,
    });
    expect(tapToWorld({ x: 40, y: 80 }, css, device, 4, { x: 100, y: 50 })).toEqual({
      x: 130,
      y: 110,
    });
  });
});

import { describe, expect, it } from 'vitest';
import { cameraFor } from '../../src/scene/camera';
import { cssStep } from '../../src/art/canvas';
import {
  TOWN_SIZE,
  canvasFit,
  pixelFit,
  scaleFor,
  sceneScale,
  viewSize,
} from '../../src/scene/scale';
import { TOWN2_SCENE } from '../../src/scene/town2Place';
import { TOWN2_H, TOWN2_W } from '../../src/art/town2/town';

// The scale belongs to the scene shown: the dungeons keep a 270-wide world on
// 16-pixel tiles (`TOWN_SIZE`, the first town's); the town is 360 wide on
// 24-pixel tiles. Both are whole device pixels an art pixel on every phone.

/** The Town tab's canvas on a phone `css` wide (the app is never wider than 480), as the stage fits it. */
function town(css: number, dpr: number, tall = 720) {
  const width = Math.min(css, 480);
  return canvasFit({ width, height: tall }, dpr);
}

describe('scene scale', () => {
  // [phone, CSS width, device pixel ratio, current town's scale, C-scale town's scale, art pixels across]
  const phones: [string, number, number, number, number, number][] = [
    ['a 360-wide Android at 3x', 360, 3, 4, 3, 360],
    ['an iPhone at 390, 3x', 390, 3, 4, 3, 390],
    ['an iPhone Pro Max at 430, 3x', 430, 3, 4, 3, 430],
    ['a 412-wide Android at 2.625x', 412, 2.625, 3, 3, 357],
    ['an iPhone SE at 375, 2x', 375, 2, 2, 2, 375],
    ['a tablet at 2x (the app stops at 480)', 820, 2, 3, 2, 480],
    ['a desktop at 1x (the app stops at 480)', 1440, 1, 1, 1, 480],
  ];

  for (const [name, css, dpr, old, two, across] of phones) {
    it(`gives ${name} whole device pixels: ${old} for the current town, ${two} for the new`, () => {
      const { device } = town(css, dpr);
      expect(sceneScale(device)).toBe(old);
      expect(sceneScale(device, TOWN_SIZE)).toBe(old);
      const scale = sceneScale(device, TOWN2_SCENE);
      expect(scale).toBe(two);
      expect(Number.isInteger(scale)).toBe(true);
      expect(Math.floor(viewSize(device, scale).width)).toBe(across);
    });
  }

  it('shows at least the new town’s 360 across on a phone, less only the slack a trimmed canvas loses', () => {
    for (const [css, dpr] of [
      [360, 3],
      [390, 3],
      [393, 2.75],
      [412, 2.625],
      [430, 3],
    ] as const) {
      const { device } = town(css, dpr);
      const across = viewSize(device, sceneScale(device, TOWN2_SCENE)).width;
      expect(across).toBeGreaterThanOrEqual(TOWN2_SCENE.width - (TOWN2_SCENE.slack ?? 0));
      expect(across).toBeLessThan(TOWN2_SCENE.width * 1.25);
    }
  });

  it('gives up width for height on a phone on its side, as the current town does', () => {
    const device = { width: 480 * 3, height: 230 * 3 };
    expect(sceneScale(device, TOWN2_SCENE)).toBe(3);
    expect(viewSize(device, 3).height).toBeGreaterThanOrEqual(TOWN2_SCENE.minHeight);
    expect(sceneScale({ width: 1440, height: 600 }, TOWN2_SCENE)).toBe(2);
  });
});

describe('the camera in the C-scale town', () => {
  const view = { width: 390, height: 727 };
  const world = { width: TOWN2_W, height: TOWN2_H };

  it('stops at the left and top edges', () => {
    expect(cameraFor({ x: 10, y: 10 }, view, world)).toEqual({ x: 0, y: 0 });
  });

  it('stops at the right and bottom edges', () => {
    expect(cameraFor({ x: 1430, y: 2130 }, view, world)).toEqual({
      x: TOWN2_W - 390,
      y: TOWN2_H - 727,
    });
  });

  it('stops at the right edge and the top edge together, and the left and the bottom', () => {
    expect(cameraFor({ x: 1430, y: 10 }, view, world)).toEqual({ x: TOWN2_W - 390, y: 0 });
    expect(cameraFor({ x: 10, y: 2130 }, view, world)).toEqual({ x: 0, y: TOWN2_H - 727 });
  });

  it('follows the hero freely in the middle of town', () => {
    expect(cameraFor({ x: 700, y: 1200 }, view, world)).toEqual({ x: 505, y: 837 });
  });
});

describe('the town drawn at one canvas pixel per art pixel and enlarged', () => {
  const phones: [number, number, number][] = [
    [360, 683, 3],
    [390, 727.4, 3],
    [430, 815, 3],
    [393, 700, 2.75],
    [412, 731, 2.625],
    [375, 560, 2],
    [480, 700, 1],
  ];

  for (const [width, height, dpr] of phones) {
    it(`enlarges by exactly the scale both ways at ${width} CSS pixels and ${dpr}x`, () => {
      const box = { width, height };
      const fit = pixelFit(box, dpr, scaleFor(TOWN2_SCENE));
      // Each art pixel is exactly `scale` device pixels, and the CSS size is whole device pixels.
      expect(fit.device).toEqual({
        width: fit.art.width * fit.scale,
        height: fit.art.height * fit.scale,
      });
      expect(fit.css.width * dpr).toBeCloseTo(fit.device.width, 9);
      expect(fit.css.height * dpr).toBeCloseTo(fit.device.height, 9);
      const step = cssStep(dpr);
      expect(Number.isInteger(Math.round((fit.css.width / step) * 1e9) / 1e9)).toBe(true);
      // The scale is the one the scene would have chosen for this canvas, and nothing is stretched.
      expect(fit.scale).toBe(sceneScale(fit.device, TOWN2_SCENE));
      expect(fit.css.width).toBeLessThanOrEqual(width);
      expect(fit.css.height).toBeLessThanOrEqual(height);
      // Never more than a step or two of the box lost.
      const plain = canvasFit(box, dpr);
      expect(plain.device.width - fit.device.width).toBeLessThan(2 * fit.scale * step * dpr);
    });
  }

  it('is the same view as drawing every device pixel on a 390-wide phone at 3x', () => {
    const fit = pixelFit({ width: 390, height: 727.4 }, 3, scaleFor(TOWN2_SCENE));
    expect(fit).toEqual({
      art: { width: 390, height: 727 },
      device: { width: 1170, height: 2181 },
      css: { width: 390, height: 727 },
      scale: 3,
    });
  });
});

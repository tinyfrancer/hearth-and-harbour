import { describe, expect, it } from 'vitest';
import { artGallery, shotScale } from '../../src/art/gallery';
import { RAMPS } from '../../src/art/palette';

describe('artGallery', () => {
  it('shows the hero, the tavern, the props, the layers and the palette', () => {
    const page = artGallery();
    const titles = [...page.querySelectorAll('h2')].map((h) => h.textContent);
    expect(titles).toEqual([
      'The hero',
      'The tavern',
      'Props',
      'Body plus layers',
      'Palette',
      'Still to come',
    ]);
    const labels = [...page.querySelectorAll('canvas')].map((c) => c.getAttribute('aria-label'));
    expect(labels.filter((l) => l === 'Day').length).toBeGreaterThanOrEqual(4);
    expect(labels.filter((l) => l === 'Dusk').length).toBeGreaterThanOrEqual(4);
  });

  it('draws every picture at a whole number of device pixels', () => {
    for (const canvas of artGallery().querySelectorAll('canvas')) {
      expect(canvas.width).toBeGreaterThan(0);
      const dpr = window.devicePixelRatio || 1;
      expect((parseFloat(canvas.style.width) * dpr) / canvas.width).toBeCloseTo(1, 6);
    }
  });

  it('shows every ramp in day and dusk', () => {
    const page = artGallery();
    const steps = Object.values(RAMPS).reduce((n, ramp) => n + ramp.length, 0);
    expect(page.querySelectorAll('.swatch').length).toBe(steps * 2);
  });

  it('says what has not been drawn yet', () => {
    expect(artGallery().textContent).toContain('Nothing drawn yet.');
  });
});

describe('shotScale', () => {
  const phone = { dpr: 3, app: 390, content: 358 };

  it('draws at game scale, and twice that close up, when there is room', () => {
    expect(shotScale('game', 60, 2, phone)).toEqual({ scale: 4, game: 4, fits: true });
    expect(shotScale('close', 60, 2, phone)).toEqual({ scale: 8, game: 4, fits: true });
  });

  it('steps down to a smaller whole scale when a picture would not fit', () => {
    // 256 art pixels at 4 is 341 CSS pixels: fine at 390 wide, too wide at 360.
    expect(shotScale('game', 256, 1, phone).scale).toBe(4);
    expect(shotScale('game', 256, 1, { dpr: 3, app: 360, content: 328 })).toEqual({
      scale: 3,
      game: 4,
      fits: false,
    });
  });
});

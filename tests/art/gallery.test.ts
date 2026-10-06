import { describe, expect, it } from 'vitest';
import { LOOK_CHOICES } from '../../src/art/character';
import { artGallery, shotScale } from '../../src/art/gallery';
import { RAMPS } from '../../src/art/palette';

describe('artGallery', () => {
  it('shows the wardrobe, the town, the townsfolk, the hero, the tavern, the props, the layers and the palette', () => {
    const page = artGallery();
    const titles = [...page.querySelectorAll('h2')].map((h) => h.textContent);
    expect(titles).toEqual([
      'Brinebeard’s Grotto',
      'Portraits',
      'Icons',
      'Wardrobe',
      'The town',
      'Townsfolk',
      'The hero',
      'The tavern',
      'Props',
      'Body plus layers',
      'Palette',
      'Still to come',
    ]);
    const labels = [...page.querySelectorAll('canvas')].map((c) => c.getAttribute('aria-label'));
    expect(labels.filter((l) => l === 'Day').length).toBeGreaterThanOrEqual(7);
    expect(labels.filter((l) => l === 'Dusk').length).toBeGreaterThanOrEqual(6);
  });

  it('shows the gear ladder, every look choice and every set in the wardrobe, by day and dusk', () => {
    const wardrobe = [...artGallery().querySelectorAll('.gallery-part')].find(
      (part) => part.querySelector('h2')?.textContent === 'Wardrobe',
    )!;
    const heads = [...wardrobe.querySelectorAll('h3')].map((h) => h.textContent);
    expect(heads.slice(0, 2)).toEqual(['The gear ladder', 'Each item alone']);
    expect(heads.indexOf('Skin')).toBeGreaterThan(heads.indexOf('Each item alone'));
    const labels = [...wardrobe.querySelectorAll('figcaption')].map((f) => f.textContent);
    expect(labels[0]).toBe('Linen · Leather · Bronze · Iron · Tier 2 (the hero)');
    expect(labels[1]).toBe('Dusk');
    for (const part of ['skin', 'hair', 'hairColour'] as const)
      expect(labels).toContain(LOOK_CHOICES[part].map((c) => c.name).join(' · '));
    expect(labels).toContain('Bronze · Iron · Linen · Leather');
    expect(labels).toContain('Pine shortbow · Oak shortbow · Willow shortbow');
    expect(labels).toContain('Dusk');
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

  it('shows every icon in its family, labelled', () => {
    const icons = [...artGallery().querySelectorAll('.gallery-part')].find(
      (part) => part.querySelector('h2')?.textContent === 'Icons',
    )!;
    const heads = [...icons.querySelectorAll('h3')].map((h) => h.textContent);
    expect(heads[0]).toBe('Logs');
    expect(heads).toContain('Skills');
    const cells = [...icons.querySelectorAll('.icon-cell')];
    expect(cells.length).toBe(59 + 13 + 13 + 1 + 1);
    // And the five tab icons, each lit and muted (B10b).
    expect(icons.querySelectorAll('.tab-cell canvas').length).toBe(10);
    for (const cell of cells) expect(cell.querySelector('canvas')).not.toBeNull();
    expect(cells.map((c) => c.textContent)).toContain('pine logs');
  });

  it('says what has not been drawn yet', () => {
    expect(artGallery().textContent).toContain('Still to come');
  });

  it('shows every portrait in a frame like the fight screen’s, labelled', () => {
    const cells = [...artGallery().querySelectorAll('.portrait-cell')];
    expect(cells.length).toBeGreaterThanOrEqual(8);
    for (const cell of cells) expect(cell.querySelector('.portrait-art canvas')).not.toBeNull();
    expect(cells.map((c) => c.textContent)).toContain('dock rat');
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

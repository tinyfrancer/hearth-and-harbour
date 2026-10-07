import { describe, expect, it } from 'vitest';
import { artGallery } from '../../src/art/gallery';
import { RAMPS } from '../../src/art/palette';

describe('artGallery', () => {
  it('shows the icons, the finer scale and the palette (the first scale retired in B12)', () => {
    const page = artGallery();
    const titles = [...page.querySelectorAll('h2')].map((h) => h.textContent);
    expect(titles).toEqual(['Icons', 'At the finer scale', 'Palette']);
    const buttons = [...page.querySelectorAll('button')].map((b) => b.textContent);
    expect(buttons).toContain('See the new town at the finer scale');
    expect(buttons).toContain('Draw the new figures');
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
    expect(cells.map((c) => c.textContent)).toContain('shell necklace');
  });
});

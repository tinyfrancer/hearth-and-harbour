import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOOK,
  LOOK_CHOICES,
  characterCanvas,
  characterPicture,
} from '../../src/art/character';
import { FIGURE_H, FIGURE_W } from '../../src/art/figure';

// The door the game draws the character through. What it must never do is
// make the game wait for art: any ids at all give a picture.
describe('characterPicture', () => {
  it('draws a figure for the default look and no gear', () => {
    const pic = characterPicture(DEFAULT_LOOK, []);
    expect(pic.grid.w).toBeGreaterThanOrEqual(FIGURE_W);
    expect(pic.grid.h).toBeGreaterThanOrEqual(FIGURE_H);
  });

  it('never throws for items or looks art has not drawn', () => {
    expect(() =>
      characterPicture({ skin: 'green', hair: 'none', hairColour: 'x' }, ['no_such_item', '']),
    ).not.toThrow();
  });

  it('keeps one item per slot rather than failing on two', () => {
    expect(() => characterPicture(DEFAULT_LOOK, ['iron_sword', 'iron_sword'])).not.toThrow();
  });

  it('offers at least one choice for every part of a look, the default first', () => {
    for (const part of ['skin', 'hair', 'hairColour'] as const) {
      expect(LOOK_CHOICES[part].length).toBeGreaterThan(0);
      expect(DEFAULT_LOOK[part]).toBe(LOOK_CHOICES[part][0]!.id);
    }
  });

  it('gives a labelled element in both sizes', () => {
    for (const size of ['sheet', 'thumb'] as const) {
      const el = characterCanvas(DEFAULT_LOOK, [], size);
      expect(el.tagName).toBe('CANVAS');
      expect(el.getAttribute('aria-label')).toBe('Your character');
    }
  });
});

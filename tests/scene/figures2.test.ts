import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK } from '../../src/art/character';
import {
  FIGURE2_ANCHOR_X,
  FIGURE2_H,
  FIGURE2_SOLE_Y,
  FIGURE2_W,
  STANDING2,
  TOWNSFOLK2,
  heroFigure2,
  townsfolkFigure2,
  type Figure2,
} from '../../src/scene/figures2';

// The figure adapter is the only door the C-scale town has for people. Its
// promise, whatever draws behind it: canvases FIGURE2_W x FIGURE2_H, a person
// about 64 tall with their soles on FIGURE2_SOLE_Y, standing over
// FIGURE2_ANCHOR_X.

function standsRight(figure: Figure2): void {
  expect(figure.w).toBe(FIGURE2_W);
  expect(figure.h).toBe(FIGURE2_H);
  expect(figure.drawn.bottom).toBe(FIGURE2_SOLE_Y);
  const tall = figure.drawn.bottom - figure.drawn.top + 1;
  expect(tall).toBeGreaterThanOrEqual(58);
  expect(tall).toBeLessThanOrEqual(FIGURE2_SOLE_Y + 1);
  expect(figure.drawn.left).toBeLessThan(FIGURE2_ANCHOR_X);
  expect(figure.drawn.right).toBeGreaterThan(FIGURE2_ANCHOR_X);
  expect(figure.drawn.left).toBeGreaterThanOrEqual(0);
  expect(figure.drawn.right).toBeLessThan(FIGURE2_W);
}

describe('the C-scale figure adapter', () => {
  it('has the size and anchor lane B declared', () => {
    expect([FIGURE2_W, FIGURE2_H, FIGURE2_ANCHOR_X, FIGURE2_SOLE_Y]).toEqual([56, 72, 28, 70]);
  });

  it('gives the hero at that size, standing on the anchor about 64 tall, whatever he wears', () => {
    standsRight(heroFigure2(DEFAULT_LOOK, []));
    standsRight(heroFigure2(DEFAULT_LOOK, ['iron_sword', 'iron_shield', 'iron_helmet']));
    standsRight(heroFigure2({ skin: 'deep', hair: 'nonsense', hairColour: 'grey' }, ['nothing']));
  });

  it('gives each of the townsfolk by today’s id, and nothing for an unknown one', () => {
    for (const id of TOWNSFOLK2) standsRight(townsfolkFigure2(id)!);
    expect(townsfolkFigure2('nobody')).toBeNull();
  });

  it('dresses the hero differently for different gear', () => {
    const plain = heroFigure2(DEFAULT_LOOK, []);
    const armed = heroFigure2(DEFAULT_LOOK, ['iron_sword']);
    expect(armed.drawn).not.toEqual(plain.drawn);
  });

  it('paints nothing where there is no canvas, rather than failing', () => {
    expect(
      heroFigure2(DEFAULT_LOOK, []).paint({ ...STANDING2, facing: 'left' }, 'dusk', []),
    ).toBeNull();
  });
});

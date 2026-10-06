import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK } from '../../src/art/character';
import {
  FIGURE2_ANCHOR_X,
  FIGURE2_H,
  FIGURE2_SOLE_Y,
  FIGURE2_W,
  TOWNSFOLK2,
  heroFigure2,
  townsfolkFigure2,
  type Figure2,
} from '../../src/scene/figures2';
import { standing, walking } from '../../src/scene/gait';
import { IDLE2_FRAMES, WALK2_FRAMES, WALK2_STRIDE } from '../../src/art/character2';
import { newGame } from '../../src/core/state';
import { Hero2, LIT_KEPT } from '../../src/scene/town2Art';

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

  it('gives every pose its own picture from lane B: each walk frame, each way, and the breath', () => {
    const figure = heroFigure2(DEFAULT_LOOK, ['iron_sword']);
    const seen = new Set<string>();
    for (const heading of ['right', 'left', 'down'] as const)
      for (let f = 0; f < WALK2_FRAMES; f++) {
        const raw = figure.pixels(walking(heading, f), 'day', []);
        expect([raw.w, raw.h]).toEqual([FIGURE2_W, FIGURE2_H]);
        seen.add(raw.data.join());
      }
    for (let b = 0; b < IDLE2_FRAMES; b++)
      seen.add(figure.pixels(standing('right', b), 'day', []).data.join());
    // Lane B's frames differ where it drew them differently; nothing here collapses them.
    expect(seen.size).toBeGreaterThan(WALK2_FRAMES * 2);
    // Walking left is lane B's own left frame; standing left is the standing figure mirrored.
    expect(figure.anchorX(walking('left', 0))).toBe(FIGURE2_W - 1 - FIGURE2_ANCHOR_X);
    expect(figure.anchorX(walking('down', 0))).toBe(FIGURE2_ANCHOR_X);
    expect(figure.anchorX(standing('right', 1))).toBe(FIGURE2_ANCHOR_X);
  });

  it('lights the hero once per pose, time of day and place, never again for later frames', () => {
    const hero = new Hero2();
    hero.wear(newGame('Cody', 0));
    const lamp = { x: 200, y: 100, radius: 60, strength: 0.6 };
    hero.lightBy([lamp]);
    const walkPast = (): void => {
      for (let x = 150; x <= 250; x += 1) {
        const frame = Math.floor((x - 150) / WALK2_STRIDE);
        // Several animation frames on each spot, as at 60 fps.
        for (let n = 0; n < 4; n++) hero.at({ x, y: 120 }, walking('right', frame), 'dusk');
      }
    };
    walkPast();
    const once = hero.painted;
    expect(once).toBeGreaterThan(0);
    walkPast();
    expect(hero.painted).toBe(once);
    // Each picture asked for is painted at most once: no more than places times frames.
    expect(once).toBeLessThanOrEqual(LIT_KEPT);
  });

  it('paints nothing where there is no canvas, rather than failing', () => {
    expect(heroFigure2(DEFAULT_LOOK, []).paint(standing('left', 0), 'dusk', [])).toBeNull();
  });
});

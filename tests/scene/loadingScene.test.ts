import { describe, expect, it } from 'vitest';
import { isMat } from '../../src/art/town2/cells';
import { CARD_H, CARD_W, boatX, harbourGrid, loadingScene } from '../../src/scene/loadingScene';

// The loading card as a little harbour scene: honest about progress, built
// from the town's own cells and the art lane's boat.

describe('the loading scene', () => {
  it('brings the boat in from off the left to the quay, a step of the work at a time', () => {
    const w = 135;
    const xs = [0, 0.25, 0.5, 0.75, 1].map((p) => boatX(p, w));
    expect(xs[0]! + w).toBeLessThan(CARD_W / 4);
    for (let i = 1; i < xs.length; i++) expect(xs[i]!).toBeGreaterThan(xs[i - 1]!);
    // Alongside the quay when the work is done, never into it, and never past it.
    expect(xs[4]! + w).toBeLessThanOrEqual(198);
    expect(xs[4]! + w).toBeGreaterThan(190);
    expect(boatX(2, w)).toBe(xs[4]);
  });

  it('is the town’s own cells: sky, sea and the quay’s stone, every pixel filled', () => {
    for (const sway of [0, 1, 2]) {
      const g = harbourGrid(sway);
      expect([g.w, g.h]).toEqual([CARD_W, CARD_H]);
      expect(g.d.every((c) => c !== 0)).toBe(true);
      expect(isMat(g.d[(CARD_H - 1) * CARD_W + 10]!, 'sea')).toBe(true);
      expect(isMat(g.d[(CARD_H - 1) * CARD_W + CARD_W - 5]!, 'stone')).toBe(true);
    }
    // The swell rocks to and fro: its first and last beats match, so the loop has no jump.
    expect(harbourGrid(1).d).not.toEqual(harbourGrid(0).d);
  });

  it('says what it is and moves its bar a whole quarter at a time', () => {
    const card = loadingScene('day');
    expect(card.el.getAttribute('role')).toBe('status');
    expect(card.el.textContent).toMatch(/Gullwick/);
    const fill = card.el.querySelector<HTMLElement>('.scene-loading-fill')!;
    card.update(0.3, 1000);
    expect(fill.style.transform).toBe('scaleX(0.25)');
    card.update(1, 2000);
    expect(fill.style.transform).toBe('scaleX(1)');
  });
});

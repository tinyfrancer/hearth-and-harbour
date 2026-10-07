import { describe, expect, it } from 'vitest';
import { isMat, stepOf } from '../../src/art/town2/cells';
import { town2Piece } from '../../src/art/town2/pieces';
import {
  CARD_H,
  CARD_MOST,
  CARD_W,
  QUAY_X,
  boatX,
  cardScale,
  harbourGrid,
  keelOf,
  loadingScene,
} from '../../src/scene/loadingScene';

// The loading card as a little harbour scene: honest about progress, built
// from the town's own cells and the art lane's boat.

describe('the loading scene', () => {
  it('brings the boat in from off the left to the quay, a step of the work at a time', () => {
    const w = 135;
    const xs = [0, 0.25, 0.5, 0.75, 1].map((p) => boatX(p, w));
    expect(xs[0]! + w).toBeLessThan(CARD_W / 4);
    for (let i = 1; i < xs.length; i++) expect(xs[i]!).toBeGreaterThan(xs[i - 1]!);
    // Alongside the quay when the work is done, never into it, and never past it.
    expect(xs[4]! + w).toBeLessThanOrEqual(QUAY_X);
    expect(xs[4]! + w).toBeGreaterThan(QUAY_X - 8);
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

  it('has a sky in broken bands and a cloud, not three ruled stripes', () => {
    const g = harbourGrid(0);
    const steps = (y: number) =>
      new Set(Array.from({ length: CARD_W }, (_, x) => g.d[y * CARD_W + x]!));
    // Somewhere a band's edge breaks: one row of sky holds two of its steps.
    const broken = [...Array(30).keys()].some(
      (y) => [...steps(y)].filter((c) => isMat(c, 'glass')).length > 1,
    );
    expect(broken).toBe(true);
    // And sailcloth clouds in it.
    expect(g.d.some((c) => isMat(c, 'sail'))).toBe(true);
  });

  it('lays the boat’s shadow on the water under its hull, and the boat is under a third of the picture', () => {
    const boat = town2Piece('rowboat').picture.grid;
    expect(boat.w).toBeLessThan(CARD_W / 3);
    const keel = keelOf(boat);
    const x = boatX(0.5, boat.w);
    const top = CARD_H - boat.h - 6;
    const plain = harbourGrid(0);
    const shaded = harbourGrid(0, { x, top, bottom: top, keel });
    const mid = Math.floor(boat.w / 2);
    const below = (top + keel[mid]! + 2) * CARD_W + x + mid;
    expect(isMat(shaded.d[below]!, 'sea')).toBe(true);
    expect(stepOf(shaded.d[below]!)).toBeGreaterThan(stepOf(plain.d[below]!));
    // Nothing changes away from the boat.
    expect(shaded.d[(CARD_H - 1) * CARD_W + 2]).toBe(plain.d[(CARD_H - 1) * CARD_W + 2]);
  });

  it('is shown at whole device pixels, as large as fits a phone’s width, never under one', () => {
    for (const dpr of [1, 2, 2.625, 3, 3.5]) {
      const k = cardScale(dpr);
      expect(Number.isInteger(k) && k >= 1).toBe(true);
      if (dpr >= 2) expect((CARD_W * k) / dpr).toBeLessThanOrEqual(CARD_MOST);
      // The next whole scale up would not fit.
      expect((CARD_W * (k + 1)) / dpr).toBeGreaterThan(CARD_MOST);
    }
    expect(cardScale(3)).toBe(2);
  });
});

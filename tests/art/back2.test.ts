import { describe, expect, it } from 'vitest';
import {
  KNIGHT_GEAR2,
  characterFrameTagged2,
  characterWalkPicture2,
  townsfolkFrameTagged2,
} from '../../src/art/character2';
import { SHIELD_CUT, SHIELD_OUT } from '../../src/art/figure2/views';
import { isMat, stepOf, type TGrid } from '../../src/art/town2/cells';

// From behind (B17; the weak list since B12 and B13): the shield a solid band past the
// arm, the cloak over the shoulders, twin braids over the shoulders, curls kept in under a
// helm, long black hair with a sheen, the alewife's elbows and the townsfolk's backs.

const W = 56;
const cells = (g: TGrid, f: (c: number, x: number, y: number) => boolean) => {
  let n = 0;
  g.d.forEach((c, i) => {
    if (c && f(c, i % W, Math.floor(i / W))) n++;
  });
  return n;
};

describe('the hero from behind (B17)', () => {
  it('shows a shield as a band past the arm, and never through the gap at the body', () => {
    for (const worn of [
      ['iron_shield', 'iron_sword', 'iron_breastplate'],
      ['bronze_shield', 'bronze_sword'],
    ]) {
      for (const f of [0, 2, 4, 6]) {
        const t = characterFrameTagged2({}, worn, 'up', f);
        const xs = t.tags.flatMap((tag, i) => (tag === 'shield' ? [i % W] : []));
        expect(xs.length, `${worn[0]} ${f}`).toBeGreaterThan(20);
        // Cut at the body's side (the walk sways it a column or two).
        expect(Math.max(...xs), `${worn[0]} ${f}`).toBeLessThanOrEqual(SHIELD_CUT + 2);
      }
    }
    expect(SHIELD_OUT).toBeGreaterThan(0);
    // The knight's kite shows more than a sliver beside his cloak.
    const k = characterFrameTagged2({}, [], 'up', 0, [...KNIGHT_GEAR2]);
    const kite = new Set(k.tags.flatMap((tag, i) => (tag === 'shield' ? [i % W] : [])));
    expect(kite.size).toBeGreaterThanOrEqual(5);
  });

  it('lays the cloak over the shoulders, so the pauldrons do not poke out beside it', () => {
    for (const f of [0, 4]) {
      const g = characterWalkPicture2({}, [], 'up', f, [...KNIGHT_GEAR2]).grid;
      // Over the shoulders, short of the sword's blade on the right.
      const plate = cells(
        g,
        (c, x, y) => y >= 20 && y <= 25 && x >= 16 && x <= 40 && isMat(c, 'plate'),
      );
      // Only the gorget at the neck and the shield arm at the cloak's edge (B16 showed both pauldrons whole).
      expect(plate, `${f}`).toBeLessThanOrEqual(8);
    }
  });

  it('carries twin braids from the nape out over both shoulders', () => {
    const t = characterFrameTagged2({ hair: 'twin_braids' }, [], 'up', 0);
    const hair = (x0: number, x1: number) =>
      cells(t.grid, (c, x, y) => y >= 18 && x >= x0 && x <= x1 && isMat(c, 'hair'));
    expect(hair(15, 24)).toBeGreaterThan(10);
    expect(hair(32, 41)).toBeGreaterThan(10);
  });

  it('keeps curls in under a helm: no wider than the head and a curl', () => {
    for (const worn of [['iron_helmet'], ['bronze_helmet'], ['leather_cap']]) {
      const t = characterFrameTagged2({ hair: 'curly' }, worn, 'up', 0);
      const xs = t.tags.flatMap((tag, i) => (tag === 'hair' ? [i % W] : []));
      expect(Math.min(...xs), worn[0]).toBeGreaterThanOrEqual(18);
      expect(Math.max(...xs), worn[0]).toBeLessThanOrEqual(38);
    }
  });

  it('gives long hair from behind a sheen and lit strands, so black is not a dark mass', () => {
    const t = characterFrameTagged2({ hair: 'long' }, [], 'up', 0);
    const lit = cells(t.grid, (c, _x, y) => y >= 10 && isMat(c, 'hair') && stepOf(c) <= 1);
    const all = cells(t.grid, (c, _x, y) => y >= 10 && isMat(c, 'hair'));
    expect(lit / all).toBeGreaterThan(0.3);
  });

  it('gives a bald head from behind a crease at each ear and a shadow where it meets the neck', () => {
    const t = characterFrameTagged2({ hair: 'bald' }, [], 'up', 0);
    const deep = cells(
      t.grid,
      (c, _x, y) => y >= 12 && y <= 20 && isMat(c, 'skin') && stepOf(c) >= 4,
    );
    expect(deep).toBeGreaterThan(12);
  });
});

describe('the townsfolk from behind (B17)', () => {
  it('rounds the alewife’s elbows and ties her apron at her back', () => {
    const t = townsfolkFrameTagged2('alewife', 'up', 0)!;
    // Her elbows: skin turning in below her sleeves on both sides.
    const elbow = (x0: number, x1: number) =>
      cells(t.grid, (c, x, y) => y >= 33 && y <= 39 && x >= x0 && x <= x1 && isMat(c, 'skin'));
    expect(elbow(13, 19)).toBeGreaterThan(8);
    expect(elbow(36, 42)).toBeGreaterThan(8);
    expect(cells(t.grid, (c, _x, y) => y >= 37 && y <= 43 && isMat(c, 'cream'))).toBeGreaterThan(
      12,
    );
  });

  it('crosses the smith’s apron straps on his back and seams the old man’s coat', () => {
    const smith = townsfolkFrameTagged2('smith', 'up', 0)!;
    expect(
      cells(smith.grid, (c, _x, y) => y >= 23 && y <= 35 && isMat(c, 'leather')),
    ).toBeGreaterThan(20);
    const elder = townsfolkFrameTagged2('elder', 'up', 0)!;
    expect(cells(elder.grid, (c) => isMat(c, 'bronze'))).toBeGreaterThanOrEqual(2);
  });
});

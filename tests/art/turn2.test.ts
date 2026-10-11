import { describe, expect, it } from 'vitest';
import {
  FIGURE2_ANCHOR_X,
  FIGURE2_SOLE_Y,
  ITEM_LAYERS2,
  KNIGHT_GEAR2,
  LOOK_CHOICES2,
  characterPicture2,
  characterThreeQuarter2,
  characterThreeQuarterPicture2,
} from '../../src/art/character2';
import { isMat, type TGrid } from '../../src/art/town2/cells';

// Standing turned (B17): the front figure turned toward its facing, for every look and
// wearable, on the same canvas and anchor, the head turned furthest.

const W = 56;
const at = (g: TGrid, x: number, y: number) => g.d[y * g.w + x]!;

/** The middle of what is drawn in a band of rows, and its width. */
function band(g: TGrid, y0: number, y1: number, only?: (c: number) => boolean) {
  let a = W;
  let b = -1;
  for (let y = y0; y <= y1; y++)
    for (let x = 0; x < W; x++) {
      const c = at(g, x, y);
      if (c && (!only || only(c))) {
        a = Math.min(a, x);
        b = Math.max(b, x);
      }
    }
  return { mid: (a + b) / 2, w: b - a + 1 };
}

describe('the hero standing turned (B17)', () => {
  it('stands on the figure’s canvas and anchor, every look and wearable, never the front picture', () => {
    const outfits: { worn: string[]; extra?: string[] }[] = [
      { worn: [] },
      ...Object.keys(ITEM_LAYERS2).map((id) => ({ worn: [id] })),
      { worn: [], extra: [...KNIGHT_GEAR2] },
    ];
    for (const o of outfits)
      for (const facing of ['right', 'left'] as const) {
        const g = characterThreeQuarterPicture2({}, o.worn, 0, o.extra, facing).grid;
        const what = `${o.worn.join()} ${facing}`;
        expect([g.w, g.h], what).toEqual([56, 72]);
        for (let x = 0; x < W; x++) expect(at(g, x, 71), what).toBe(0);
        let sole = false;
        for (let x = FIGURE2_ANCHOR_X - 12; x <= FIGURE2_ANCHOR_X + 12; x++)
          if (at(g, x, FIGURE2_SOLE_Y)) sole = true;
        expect(sole, what).toBe(true);
        for (let y = 0; y < 72; y++) {
          expect(at(g, 0, y), what).toBe(0);
          expect(at(g, W - 1, y), what).toBe(0);
        }
        const front = characterPicture2({}, o.worn, o.extra).grid;
        expect(
          g.d.every((c, i) => c === front.d[i]),
          what,
        ).toBe(false);
      }
  });

  it('turns the face toward the facing and draws the far side in, the head most', () => {
    for (const skin of LOOK_CHOICES2.skin.map((s) => s.id)) {
      const look = { skin };
      const front = characterPicture2(look, []).grid;
      const right = characterThreeQuarterPicture2(look, []).grid;
      const left = characterThreeQuarterPicture2(look, [], 0, [], 'left').grid;
      const eyes = (c: number) => isMat(c, 'eye');
      // The eyes move toward the facing (B9's turn moved them one column inside the skull).
      expect(
        band(right, 12, 15, eyes).mid - band(front, 12, 15, eyes).mid,
        skin,
      ).toBeGreaterThanOrEqual(1.5);
      expect(
        band(front, 12, 15, eyes).mid - band(left, 12, 15, eyes).mid,
        skin,
      ).toBeGreaterThanOrEqual(1.5);
      // The head is narrower turned (its far side drawn in) and the body a little narrower.
      expect(band(right, 8, 18).w, skin).toBeLessThan(band(front, 8, 18).w);
      expect(band(right, 30, 40).w, skin).toBeLessThanOrEqual(band(front, 30, 40).w);
    }
  });

  it('breathes, keeps its pictures, and gives canvases like the walk’s', () => {
    const a = characterThreeQuarterPicture2({}, ['iron_helmet']);
    expect(characterThreeQuarterPicture2({}, ['iron_helmet'], 2)).toBe(a);
    expect(characterThreeQuarterPicture2({}, ['iron_helmet'], 1)).not.toBe(a);
    const canvas = characterThreeQuarter2({}, ['iron_helmet'], 'dusk', 1);
    expect([canvas.width, canvas.height]).toEqual([56, 72]);
  });
});

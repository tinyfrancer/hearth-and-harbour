import { describe, expect, it } from 'vitest';
import {
  ITEM_LAYERS2,
  STRIKE2_FRAMES,
  WALK2_FRAMES,
  characterIdlePicture2,
  characterPicture2,
  characterStrikePicture2,
  characterWalkPicture2,
} from '../../src/art/character2';
import { itemIconPicture } from '../../src/art/icons';
import { DEPTH } from '../../src/art/depth';
import { WARDROBE2 } from '../../src/art/figure2/dress';
import { isMat, type TGrid } from '../../src/art/town2/cells';
import type { Mat } from '../../src/art/town2/ramps';

// The smithy's leg armour (B13; docs/style-guide.md, "Greaves"): drawn in
// every facing and pose, over the trousers and the boots' tops and under
// every skirt and coat, the ladder reading at the shins.

const GREAVES: readonly [string, Mat][] = [
  ['bronze_greaves', 'bronze'],
  ['iron_greaves', 'iron'],
];
const FACINGS = ['down', 'right', 'left', 'up'] as const;

/** Pixels of a metal at or below the knee (row 49 down), where nothing else of that metal is worn here. */
const shin = (g: TGrid, mat: Mat): number => {
  let n = 0;
  for (let y = 49; y < g.h; y++)
    for (let x = 0; x < g.w; x++) if (isMat(g.d[y * g.w + x]!, mat)) n++;
  return n;
};

describe('greaves', () => {
  it('are wearable items with an icon and a layer in the knee slot, so trousers stay on under them', () => {
    for (const [id] of GREAVES) {
      expect(ITEM_LAYERS2[id]).toBe(id);
      expect(WARDROBE2.gear.find((g) => g.id === id)?.slot).toBe('knees');
      expect(itemIconPicture(id), id).not.toBeNull();
      const g = characterPicture2({}, [id]).grid;
      expect(isMat(g.d[47 * g.w + 24]!, 'cloth'), `${id} trousers above the knee`).toBe(true);
    }
  });

  it('show at the shins in every facing, every walk and strike frame, standing and breathing', () => {
    const outfits: readonly string[][] = [[], ['linen_tunic', 'linen_trousers'], ['captains_coat']];
    for (const [id, mat] of GREAVES)
      for (const worn of outfits) {
        const all = [...worn, id];
        expect(shin(characterPicture2({}, all).grid, mat), `${id} standing`).toBeGreaterThan(30);
        expect(shin(characterIdlePicture2({}, all, 1).grid, mat), `${id} breath`).toBeGreaterThan(
          30,
        );
        for (const f of FACINGS) {
          // From behind only the plates' edges and the straps show: less, never none.
          const least = f === 'up' ? 10 : 20;
          for (let k = 0; k < WALK2_FRAMES; k++)
            expect(
              shin(characterWalkPicture2({}, all, f, k).grid, mat),
              `${id} ${worn.join('+')} walk ${f} ${k}`,
            ).toBeGreaterThan(least);
          for (let k = 0; k < STRIKE2_FRAMES; k++)
            expect(
              shin(characterStrikePicture2({}, [...all, 'cudgel'], f, k).grid, mat),
              `${id} strike ${f} ${k}`,
            ).toBeGreaterThan(least);
        }
      }
  });

  it('go under a long cloak from behind and under the coat skirts in front', () => {
    for (const [id, mat] of GREAVES) {
      const caped = characterWalkPicture2({}, [id], 'up', 2, ['red_cloak']).grid;
      const bare = characterWalkPicture2({}, [id], 'up', 2).grid;
      expect(shin(caped, mat)).toBeLessThan(shin(bare, mat));
      // In front: over the boots' tops, under every shirt, skirt and coat.
      for (const p of WARDROBE2.gear.find((g) => g.id === id)!.parts) {
        expect(p.depth).toBeGreaterThan(DEPTH.FEET);
        expect(p.depth).toBeLessThan(DEPTH.SHIRT);
      }
    }
  });

  it('climb the ladder: iron covers more of the shin than bronze', () => {
    const b = shin(characterPicture2({}, ['bronze_greaves']).grid, 'bronze');
    const i = shin(characterPicture2({}, ['iron_greaves']).grid, 'iron');
    expect(i).toBeGreaterThan(b);
  });
});

import { describe, expect, it } from 'vitest';
import {
  BEARD_CHOICES2,
  LOOK_CHOICES2,
  characterPicture2,
  characterStrikePicture2,
  characterWalkPicture2,
} from '../../src/art/character2';
import { heroBust2 } from '../../src/art/portraits2';

// The look's parts added in B13 (docs/style-guide.md, "Beards"): the beard is
// optional in the look, missing is `none`, and an id the art does not know is
// drawn as `none`, never an error.

const FACINGS = ['down', 'right', 'left', 'up'] as const;
const same = (a: { grid: { d: ArrayLike<number> } }, b: { grid: { d: ArrayLike<number> } }) =>
  Array.from(a.grid.d).every((c, i) => c === b.grid.d[i]);

describe('the beard in the look', () => {
  it('is a choice in the table, `none` first', () => {
    expect(BEARD_CHOICES2[0]).toEqual({ id: 'none', name: 'None' });
    expect((LOOK_CHOICES2 as unknown as Record<string, unknown>).beard).toBe(BEARD_CHOICES2);
    expect(new Set(BEARD_CHOICES2.map((c) => c.id)).size).toBe(BEARD_CHOICES2.length);
  });

  it('treats a missing or unknown beard as none, in every facing and pose', () => {
    const look = { skin: 'brown', hair: 'long', hairColour: 'black' };
    for (const beard of [undefined, 'none', 'no_such_beard']) {
      const l = beard === undefined ? look : { ...look, beard };
      expect(same(characterPicture2(l, []), characterPicture2(look, []))).toBe(true);
      for (const f of FACINGS) {
        expect(
          same(characterWalkPicture2(l, [], f, 3), characterWalkPicture2(look, [], f, 3)),
        ).toBe(true);
        expect(
          same(
            characterStrikePicture2(l, ['iron_sword'], f, 2),
            characterStrikePicture2(look, ['iron_sword'], f, 2),
          ),
        ).toBe(true);
      }
      expect(heroBust2(l, []).style).toBe('long');
    }
  });
});

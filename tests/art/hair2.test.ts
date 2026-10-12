import { describe, expect, it } from 'vitest';
import {
  BEARD_CHOICES2,
  LOOK_CHOICES2,
  STRIKE2_FRAMES,
  characterIdlePicture2,
  characterPicture2,
  characterStrikePicture2,
  characterWalkPicture2,
} from '../../src/art/character2';
import { heroPortraitPicture2 } from '../../src/art/portraits2';
import { isMat, type TGrid } from '../../src/art/town2/cells';

// Hair in every facing (B13; Cody: "Hair styles not showing when not facing
// forward"; docs/style-guide.md, "Hair in profile and from behind"): every
// hairstyle is itself in all four facings and every pose, below the rim of
// every hat, helm and hood, and the new styles and beards with them.

const STYLES = LOOK_CHOICES2.hair.map((c) => c.id);
const HAIRED = STYLES.filter((s) => s !== 'bald');
const BEARDS = BEARD_CHOICES2.map((c) => c.id).filter((b) => b !== 'none');
const FACINGS = ['down', 'right', 'left', 'up'] as const;

/** Pixels of the default hair colour (brown is the `hair` ramp itself), above the shoulders' foot. */
const hairMask = (g: TGrid, rows = 40): boolean[] =>
  Array.from({ length: g.w * rows }, (_, i) => isMat(g.d[i]!, 'hair'));
const hairCount = (g: TGrid, rows = 40) => hairMask(g, rows).filter(Boolean).length;
const differ = (a: boolean[], b: boolean[]) => a.filter((v, i) => v !== b[i]).length;

describe('hairstyles', () => {
  it('keeps the old choices and their order, and appends the new ones', () => {
    expect(STYLES.slice(0, 5)).toEqual(['short', 'long', 'braid', 'shaggy', 'bald']);
    expect(STYLES.length).toBeGreaterThanOrEqual(11);
    expect(new Set(STYLES).size).toBe(STYLES.length);
  });

  it('draws hair in every facing and every pose, bare-headed (bald excepted)', () => {
    for (const hair of HAIRED) {
      const look = { hair };
      expect(hairCount(characterPicture2(look, []).grid), `${hair} standing`).toBeGreaterThan(20);
      expect(hairCount(characterIdlePicture2(look, [], 1).grid), `${hair} breath`).toBeGreaterThan(
        20,
      );
      for (const f of FACINGS) {
        for (const k of [0, 3, 6])
          expect(
            hairCount(characterWalkPicture2(look, [], f, k).grid),
            `${hair} walk ${f} ${k}`,
          ).toBeGreaterThan(20);
        for (let k = 0; k < STRIKE2_FRAMES; k++)
          expect(
            hairCount(characterStrikePicture2(look, ['iron_sword'], f, k).grid),
            `${hair} strike ${f} ${k}`,
          ).toBeGreaterThan(14);
      }
    }
    for (const f of FACINGS)
      expect(hairCount(characterWalkPicture2({ hair: 'bald' }, [], f, 0).grid), f).toBeLessThan(12);
    // Every style in every facing and blow: slow when the whole suite runs at once.
  }, 30000);

  it('gives every style its own silhouette in profile and from behind', () => {
    for (const f of ['right', 'up'] as const) {
      const masks = HAIRED.map((hair) => hairMask(characterWalkPicture2({ hair }, [], f, 0).grid));
      for (let a = 0; a < HAIRED.length; a++)
        for (let b = a + 1; b < HAIRED.length; b++)
          expect(differ(masks[a]!, masks[b]!), `${HAIRED[a]} / ${HAIRED[b]} ${f}`).toBeGreaterThan(
            12,
          );
    }
  });

  it('shows the hair below the rim of a helm and a cap, in profile and from behind', () => {
    for (const hair of HAIRED)
      for (const head of [['iron_helmet'], ['bronze_helmet'], ['leather_cap']])
        for (const f of ['right', 'left', 'up'] as const)
          expect(
            hairCount(characterWalkPicture2({ hair }, head, f, 0).grid),
            `${hair} ${head[0]} ${f}`,
          ).toBeGreaterThan(2);
  });

  it('lets long hair and braids fall out of a hood, over its cape', () => {
    for (const hair of ['long', 'braid', 'twin_braids'])
      for (const f of ['down', 'right'] as const)
        expect(
          hairCount(characterWalkPicture2({ hair }, ['linen_hood'], f, 0).grid, 60),
          `${hair} hood ${f}`,
        ).toBeGreaterThan(10);
  });

  it('draws every style in the hero’s portrait, each its own', () => {
    const seen = new Set<string>();
    for (const hair of STYLES) {
      const g = heroPortraitPicture2({ hair }, []).grid;
      seen.add(Array.from(g.d).join(','));
    }
    expect(seen.size).toBe(STYLES.length);
  });
});

describe('beards', () => {
  it('offers none first and at least five beards', () => {
    expect(BEARD_CHOICES2[0]!.id).toBe('none');
    expect(BEARDS.length).toBeGreaterThanOrEqual(5);
  });

  it('draws each beard in the hair’s colour in every facing but from behind, under a helm and a hood too', () => {
    for (const beard of BEARDS)
      for (const worn of [[], ['iron_helmet'], ['linen_hood']])
        for (const f of ['down', 'right', 'left'] as const) {
          const bald = (b?: string) =>
            hairCount(characterWalkPicture2({ hair: 'bald', beard: b }, worn, f, 0).grid, 45);
          expect(bald(beard) - bald(), `${beard} ${worn.join()} ${f}`).toBeGreaterThan(3);
        }
  });

  it('never covers an eye', () => {
    const eyes = (g: TGrid) => [...g.d].filter((c) => isMat(c, 'eye')).length;
    const none = eyes(characterPicture2({}, []).grid);
    for (const beard of BEARDS) {
      expect(eyes(characterPicture2({ beard }, []).grid), beard).toBe(none);
      for (const f of ['right', 'left'] as const)
        expect(eyes(characterWalkPicture2({ beard }, [], f, 0).grid), `${beard} ${f}`).toBe(
          eyes(characterWalkPicture2({}, [], f, 0).grid),
        );
    }
  });

  it('shows in the hero’s portrait, each its own, coloured by the hair', () => {
    const seen = new Set<string>();
    for (const beard of ['none', ...BEARDS]) {
      const g = heroPortraitPicture2({ beard }, []).grid;
      seen.add(Array.from(g.d).join(','));
      if (beard === 'none') continue;
      const blonde = heroPortraitPicture2({ beard, hairColour: 'blonde' }, []).grid;
      expect(Array.from(blonde.d).join(',') === Array.from(g.d).join(','), beard).toBe(false);
    }
    expect(seen.size).toBe(BEARDS.length + 1);
  });
});

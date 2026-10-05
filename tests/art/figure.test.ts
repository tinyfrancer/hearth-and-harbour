import { describe, expect, it } from 'vitest';
import {
  FIGURE_H,
  FIGURE_LEGEND,
  FIGURE_W,
  HERO_OUTFIT,
  dress,
  figure,
} from '../../src/art/figure';
import { get, parseSprite, type Grid } from '../../src/art/grid';
import { BODIES, GEAR } from '../../src/art/wardrobe';

/**
 * heroFig from the approved mock-up (docs/art-reference/town-mockup.html),
 * outline included, written in FIGURE_LEGEND characters by running the
 * mock-up's own drawing code.
 */
const MOCKUP_HERO = [
  '....k............kkkkkk.................',
  '...kmk.........kkhhhhhhkk...............',
  '...kMmk.......khhhihhhhhhk..............',
  '...kMmk......khhhiihhhhhHHk.............',
  '...kMmk......khhhhhhhhhhHHk.............',
  '....kMmk.....khhshhhsshhhHk.............',
  '....kMmk.....khsssssssssdHk.............',
  '....kMmk.....khsHHssssHHdHk.............',
  '.....kMmk....khswksssskwdHk.............',
  '.....kMmk.....ksssssssssdk..............',
  '.....kMmk.....kssssddssddk..............',
  '......kMmk....ksssDDDDsddk..............',
  '......kMmk.....ksssssssdk...............',
  '......kMmk......kssssddk................',
  '......kMmk..kkk..kddddk..kkk............',
  '.......kMmkkMMmkknmmmmnkkmmnk...........',
  '.......kMmkMMmmmnmmmmmmnmmmnnk..........',
  '.......kMmMmmmmnmMMmmmnnmmmmnnk.........',
  '........kMmmmmnnmMMmmmnnmmmnnnk.........',
  '........kMmtttTCmMMmmmnnCtTTTkkkkkk.....',
  '........kMmtttTCmMmmmmnnnnnnnnnnnnnk....',
  '.........kMtttTCmmmmmnnnnuuUUUUUUUnk....',
  '.........kMtttTCnmmmmnnnnuuUUgUUUUnk....',
  '.........kMtttTCnnnnnnnnnuuUUgUUUUnk....',
  '.........kMttTTCCttttTTCnuuUUgUUUUnk....',
  '..........kMttTTCttttTTCnuuUUgUUUUnk....',
  '........kkkMttTTooOggOOOngggggggggnk....',
  '.......kgggggggGttttTTTTnGGGGGGGGGnk....',
  '........kkkcoooOttttTTTTnuuUUgUUUUnk....',
  '..........kcoooOtttttTTTnuuUUgUUUUnk....',
  '.........kccoooOttttTtTTnuuUUgUUUUnk....',
  '.........kcccgGtttpttTxTnuuUUgUUUUnk....',
  '.........kcccCCtppttxTxxTnuUUgUUUnk.....',
  '.........kcccCCpppppxxxxxCnUUgUUnk......',
  '.........kcccCCpppxCCpxxxCCnUgUnk.......',
  '.........kcccCCpppxCCpxxxCCnUgUnk.......',
  '.........kcccCCpppxCCpxxxCCCnUnk........',
  '.........kcccCCmmmnCCmmnnCCCCnk.........',
  '.........kcccCCpppxCCpxxxCCCCnk.........',
  '........kcccCCCpppxCCpxxxCCCCCCk........',
  '........kcccCCoooooCCoooooCCCCCk........',
  '........kcccCCoooooCCoooooCCCCCk........',
  '........kcccCCffffxCCfffxxCCCCCk........',
  '.........kcckCffffxCCfffxxCkCCk.........',
  '........kcckCCffffxCkfffxxkCCkCk........',
  '.........kk.kfffffxkkffffxxkk.k.........',
  '............kfffffxkkffffxxk............',
  '............kxxxxxxkkxxxxxxk............',
  '.............kkkkkk..kkkkkk.............',
  '........................................',
];

const sameGrid = (a: Grid, b: Grid) => {
  expect([a.w, a.h]).toEqual([b.w, b.h]);
  expect(a.d).toEqual(b.d);
};

describe('figure', () => {
  it('dresses the standard body as the approved hero, pixel for pixel', () => {
    sameGrid(figure('standard', HERO_OUTFIT), parseSprite(MOCKUP_HERO, FIGURE_LEGEND));
  });

  it('lets depth decide what covers what, whatever order the gear is listed in', () => {
    sameGrid(figure('standard', [...HERO_OUTFIT].reverse()), figure('standard', HERO_OUTFIT));
  });

  it('mirrors the eyes, pupils toward the nose', () => {
    const body = dress('standard', []);
    const row = Array.from({ length: FIGURE_W }, (_, x) => get(body, x, 7));
    const whites = row.flatMap((c, x) => (c === 'white1' ? [x] : []));
    const pupils = row.flatMap((c, x) => (c === 'ink1' ? [x] : []));
    expect(whites).toEqual([15, 22]);
    expect(pupils).toEqual([16, 21]);
    // Mirror images about the middle of the face.
    expect((whites[0] as number) + (whites[1] as number)).toBe(
      (pupils[0] as number) + (pupils[1] as number),
    );
  });

  it('shows a body with no gear, posed and in smallclothes', () => {
    const body = dress('standard', []);
    expect([body.w, body.h]).toEqual([FIGURE_W, FIGURE_H]);
    expect(body.d.filter(Boolean).length).toBeGreaterThan(400);
    expect(body.d).toContain('plaster1');
  });

  it('keeps the body hidden wherever the hero’s outfit covers it', () => {
    // Every body pixel is under a front layer or shows as the mock-up shows it,
    // which is what the pixel-for-pixel test proves; here, gear really is on top.
    const hero = dress('standard', HERO_OUTFIT);
    expect(get(hero, 18, 20)).toBe('metal2');
    expect(get(hero, 18, 27)).toBe('teal1');
  });

  it('refuses gear it has no picture for, and two pieces in one slot', () => {
    expect(() => figure('standard', ['golden_crown'])).toThrow('No gear "golden_crown".');
    expect(() => figure('giant', [])).toThrow('No body "giant".');
    const wardrobe = {
      bodies: BODIES,
      gear: [...GEAR, { id: 'spare_tunic', slot: 'shirt', parts: [] }],
    };
    expect(() => figure('standard', ['teal_tunic', 'spare_tunic'], wardrobe)).toThrow(
      '"spare_tunic" and "teal_tunic" are both worn in the shirt slot.',
    );
  });

  it('draws every part with characters the legend knows, on the figure canvas', () => {
    for (const thing of [...BODIES, ...GEAR])
      for (const part of thing.parts) {
        const g = parseSprite(part.rows, FIGURE_LEGEND);
        expect(part.at[0] + g.w, thing.id).toBeLessThanOrEqual(FIGURE_W);
        expect(part.at[1] + g.h, thing.id).toBeLessThanOrEqual(FIGURE_H);
      }
  });
});

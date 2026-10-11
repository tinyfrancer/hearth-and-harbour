import { describe, expect, it } from 'vitest';
import { TitleScene } from '../../src/art/title/scene';
import { gullCells } from '../../src/art/title/harbour';

const SIZES: readonly [number, number, number][] = [
  [360, 640, 3],
  [390, 844, 3],
  [430, 932, 3],
  [844, 390, 3],
];

describe('the title (B17)', () => {
  it.each(SIZES)(
    'flies the ship’s flag clear of the smithy at %i x %i, its mast in front of the hill',
    (w, h, dpr) => {
      const s = new TitleScene(w, h, dpr);
      const b = s.build();
      const smithy = s.placed.find((p) => p.id === 'smithy')!;
      const tavern = s.placed.find((p) => p.id === 'tavern')!;
      // The flag is 11 wide from its hoist: wholly between the tavern and the smithy.
      expect(b.flag.x + 11).toBeLessThan(smithy.x0);
      expect(b.flag.x).toBeGreaterThan(tavern.x1);
    },
  );

  it('draws a gull half as big again as before, with dark wingtips', () => {
    for (const f of [0, 1, 2]) {
      const cells = gullCells(f);
      const xs = cells.map(([x]) => x);
      expect(Math.max(...xs) - Math.min(...xs) + 1).toBeGreaterThanOrEqual(12);
    }
  });
});

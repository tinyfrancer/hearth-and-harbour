import { describe, expect, it } from 'vitest';
import {
  ITEM_LAYERS2,
  STRIKE2_FRAMES,
  WALK2_FRAMES,
  WALK2_STRIDE,
  characterGear2,
  characterStrikePicture2,
  characterStrikeTagged2,
} from '../../src/art/character2';
import { EDGE2 } from '../../src/art/figure2/edges';
import { sideWalkGrid } from '../../src/art/figure2/side';
import { sideDress } from '../../src/art/figure2/sideDress';
import { matOf, type TGrid } from '../../src/art/town2/cells';

// Every asymmetric weapon's working side, by its declared edge (B13; Cody:
// "Curved sword looks funky on side character view, curves down?";
// docs/style-guide.md, "The weapon-edge rule"). A cutlass's belly is its
// edge: in profile it must lie on the side the blade sweeps toward, so
// carried point down and forward the belly is underneath and the point curls
// up toward the spine, and in a blow the belly leads. An axe's bit faces
// forward, toward the walk and the one struck.

type Pt = readonly [number, number];
const W = 56;

/** The item ids drawn with each gear id that declares an edge. */
const ITEMS = Object.entries(ITEM_LAYERS2)
  .filter(([, gear]) => EDGE2[gear])
  .map(([item, gear]) => ({ item, gear, rule: EDGE2[gear]! }));

const where = (tags: readonly (string | null)[], tag: string): Pt[] =>
  tags.flatMap((t, i) => (t === tag ? [[i % W, Math.floor(i / W)] as const] : []));

/**
 * Which way a blade bows, from the fist out: its tip, and the mean offset of
 * its pixels from the line fist to tip (positive: on the clockwise side of
 * that line on screen, rows running down).
 */
function bow(tags: readonly (string | null)[]): { tip: Pt; side: number } | null {
  const fist = where(tags, 'fist');
  if (!fist.length) return null;
  const fx = fist.reduce((a, p) => a + p[0], 0) / fist.length;
  const fy = fist.reduce((a, p) => a + p[1], 0) / fist.length;
  // Away from the fist, so the guard and knuckle bow round it do not count.
  const blade = where(tags, 'held').filter(([x, y]) => Math.hypot(x - fx, y - fy) > 6);
  if (blade.length < 6) return null;
  const tip = blade.reduce((a, p) =>
    Math.hypot(p[0] - fx, p[1] - fy) > Math.hypot(a[0] - fx, a[1] - fy) ? p : a,
  );
  const [dx, dy] = [tip[0] - fx, tip[1] - fy];
  const len = Math.hypot(dx, dy);
  // Clockwise of (dx, dy) on screen is (-dy, dx).
  const side =
    blade.reduce((a, [x, y]) => a + ((x - fx) * -dy + (y - fy) * dx) / len, 0) / blade.length;
  return { tip, side };
}

/** Every profile frame of a weapon (the walk and the blow), facing right and left, with what drew each pixel. */
function profiles(item: string) {
  const gear = characterGear2({}, [item]);
  const dress = sideDress(gear)!;
  const out: {
    what: string;
    facing: 'right' | 'left';
    tags: readonly (string | null)[];
    grid?: TGrid;
  }[] = [];
  for (const facing of ['right', 'left'] as const) {
    for (let f = 0; f < WALK2_FRAMES; f++) {
      const g = sideWalkGrid(dress, f, WALK2_STRIDE, facing === 'left');
      out.push({ what: `${item} walk ${facing} ${f}`, facing, tags: g.tags, grid: g.grid });
    }
    for (let f = 0; f < STRIKE2_FRAMES; f++) {
      const t = characterStrikeTagged2({}, [item], facing, f)!;
      const grid = characterStrikePicture2({}, [item], facing, f).grid;
      out.push({ what: `${item} strike ${facing} ${f}`, facing, tags: t.tags, grid });
    }
  }
  return out;
}

describe('the weapon-edge rule', () => {
  it('declares an edge for every curved or one-sided weapon worn', () => {
    expect(ITEMS.map((i) => i.item).sort()).toEqual(
      [
        'boarding_axe',
        'bronze_axe',
        'iron_axe',
        'pirate_cutlass',
        'smugglers_cutlass',
        // B19, tier 2.
        'salt_iron_axe',
      ].sort(),
    );
  });

  it('keeps a cutlass’s belly on the side it sweeps toward in every profile frame', () => {
    for (const { item } of ITEMS.filter((i) => i.rule.turn === 'rotate'))
      for (const p of profiles(item)) {
        const b = bow(p.tags);
        if (!b) continue;
        // Facing left the picture is mirrored, so clockwise becomes anticlockwise.
        const side = p.facing === 'right' ? b.side : -b.side;
        expect(side, p.what).toBeGreaterThan(0.2);
      }
  });

  it('carries a cutlass point down and forward with its belly underneath, its point curling up', () => {
    for (const { item } of ITEMS.filter((i) => i.rule.turn === 'rotate'))
      for (const p of profiles(item).filter((q) => q.what.includes('walk right'))) {
        const b = bow(p.tags)!;
        expect(b.tip[1], p.what).toBeGreaterThan(50);
        expect(b.tip[0], p.what).toBeGreaterThan(34);
        expect(b.side, p.what).toBeGreaterThan(0.2);
      }
  });

  it('faces an axe’s bit forward in the carry and the blow', () => {
    for (const { item } of ITEMS.filter((i) => i.rule.turn === 'flip'))
      for (const p of profiles(item)) {
        // The wind-up has the head behind the shoulders, mostly hidden.
        if (p.what.endsWith('strike right 0') || p.what.endsWith('strike left 0')) continue;
        const metal: number[] = [];
        const wood: number[] = [];
        p.tags.forEach((t, i) => {
          if (t !== 'held') return;
          const m = matOf(p.grid!.d[i]!);
          if (m === 'iron' || m === 'bronze') metal.push(i % W);
          else if (m === 'wood') wood.push(i % W);
        });
        if (metal.length < 4 || wood.length < 4) continue;
        const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
        const ahead = mean(metal) - mean(wood);
        expect(p.facing === 'right' ? ahead : -ahead, p.what).toBeGreaterThan(0);
      }
  });
});

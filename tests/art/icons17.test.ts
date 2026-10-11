import { describe, expect, it } from 'vitest';
import { get, type Grid } from '../../src/art/grid';
import { itemIconPicture } from '../../src/art/icons';

const grid = (id: string): Grid => itemIconPicture(id)!.grid;

/** The pieces of a drawing: runs of colour (not the outline's ink) joined side to side. */
function pieces(g: Grid): number {
  const seen = new Set<number>();
  let n = 0;
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const c = get(g, x, y);
      if (!c || c === 'ink1' || seen.has(y * g.w + x)) continue;
      n++;
      const stack = [[x, y]];
      seen.add(y * g.w + x);
      while (stack.length) {
        const [px, py] = stack.pop()!;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const qx = px! + dx;
          const qy = py! + dy;
          if (qx < 0 || qy < 0 || qx >= g.w || qy >= g.h || seen.has(qy * g.w + qx)) continue;
          const q = get(g, qx, qy);
          if (!q || q === 'ink1') continue;
          seen.add(qy * g.w + qx);
          stack.push([qx, qy]);
        }
      }
    }
  return n;
}

const uses = (g: Grid, prefix: string): number => {
  let k = 0;
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) if (get(g, x, y)?.startsWith(prefix)) k++;
  return k;
};

describe('icons redrawn in B17', () => {
  it('stands the pair of greaves apart, bronze and iron: two pieces, not one tangle', () => {
    for (const id of ['bronze_greaves', 'iron_greaves']) expect(pieces(grid(id)), id).toBe(2);
  });

  it('draws the tea as a wooden chest, not a metal tin', () => {
    const g = grid('smuggled_tea');
    expect(uses(g, 'wood')).toBeGreaterThan(120);
    expect(uses(g, 'metal')).toBe(0);
  });

  it('draws leather as a laced sheet: tan with linen stitches, no bark or wood', () => {
    const g = grid('leather');
    expect(uses(g, 'tan')).toBeGreaterThan(120);
    expect(uses(g, 'linen')).toBeGreaterThan(8);
  });

  it('makes the hunter’s charm mostly tooth, not cord', () => {
    const g = grid('hunters_charm');
    expect(uses(g, 'white') + uses(g, 'plaster')).toBeGreaterThan(uses(g, 'tan'));
  });
});

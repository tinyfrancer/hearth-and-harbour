import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, LOOK_CHOICES, characterPicture } from '../../src/art/character';
import { FIGURE_LEGEND, WARDROBE, type FigurePart } from '../../src/art/figure';
import { get, parseSprite } from '../../src/art/grid';
import { DAY, DUSK, RAMPS, rgbOf, type Shade } from '../../src/art/palette';

// The pieces B3c redrew because they did not read: the shapes that make a
// sword a sword, an axe an axe, a cap a cap and a bracelet a string of shells.

/** A gear part's cells on the figure canvas: [x, y, step]. */
function cells(part: FigurePart): [number, number, Shade][] {
  const g = parseSprite(part.rows, FIGURE_LEGEND);
  const out: [number, number, Shade][] = [];
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const c = get(g, x, y);
      if (c) out.push([part.at[0] + x, part.at[1] + y, c]);
    }
  return out;
}

const gear = (id: string) => {
  const def = WARDROBE.gear.find((g) => g.id === id);
  if (!def) throw new Error(id);
  return def;
};

/** The largest distance of any point from the least-squares line x = a + b * y. */
function bend(points: readonly (readonly [number, number])[]): number {
  const n = points.length;
  const my = points.reduce((s, [, y]) => s + y, 0) / n;
  const mx = points.reduce((s, [x]) => s + x, 0) / n;
  const b =
    points.reduce((s, [x, y]) => s + (y - my) * (x - mx), 0) /
    points.reduce((s, [, y]) => s + (y - my) ** 2, 0);
  return Math.max(...points.map(([x, y]) => Math.abs(x - (mx + b * (y - my)))));
}

const byRow = (list: [number, number, Shade][]) => {
  const rows = new Map<number, [number, Shade][]>();
  for (const [x, y, c] of list) rows.set(y, [...(rows.get(y) ?? []), [x, c]]);
  return [...rows.entries()].sort((a, b) => a[0] - b[0]);
};

describe('the bronze short sword', () => {
  const blade = cells(gear('bronze_shortsword').parts[0]!);
  const rows = byRow(blade);

  it('is straight: its midrib and its middle each run along one line', () => {
    const ridge = blade.filter(([, , c]) => c === 'bronze5').map(([x, y]) => [x, y] as const);
    expect(new Set(ridge.map(([, y]) => y)).size).toBe(rows.length);
    // One-pixel steps along a slope never stray a whole pixel from the line; a bend does.
    expect(bend(ridge)).toBeLessThan(1);
    const middles = rows.map(([y, r]) => {
      const xs = r.map(([x]) => x);
      return [(Math.min(...xs) + Math.max(...xs)) / 2, y] as const;
    });
    expect(bend(middles)).toBeLessThan(1);
    // It steps evenly: a short run between long ones reads as a kink.
    const runs: number[] = [];
    ridge.forEach(([x], i) => {
      if (i > 0 && x === ridge[i - 1]![0]) runs[runs.length - 1]!++;
      else runs.push(1);
    });
    expect(new Set(runs.slice(1, -1)).size).toBe(1);
  });

  it('is symmetric about its midrib, with a dark edge on the shadow side', () => {
    for (const [y, r] of rows.slice(2)) {
      const ridge = r.find(([, c]) => c === 'bronze5')![0];
      const left = r.filter(([x]) => x < ridge).length;
      const right = r.filter(([x]) => x > ridge).length;
      // Even, or one more on the shadow side where the belly is an even width.
      expect(right - left, `row ${y}`).toBeGreaterThanOrEqual(0);
      expect(right - left, `row ${y}`).toBeLessThanOrEqual(1);
      expect(left, `row ${y}`).toBeGreaterThan(0);
      const edge = r.reduce((a, b) => (b[0] > a[0] ? b : a));
      expect(edge[1], `row ${y}`).toBe('bronze3');
    }
  });

  it('comes to a point and has a guard wider than the blade', () => {
    expect(rows[0]![1]).toHaveLength(1);
    const guard = cells(gear('bronze_shortsword').parts[1]!).filter(([, y]) => y === 26);
    const widest = Math.max(...rows.map(([, r]) => r.length));
    expect(guard.length).toBeGreaterThan(widest);
  });
});

describe('the bronze hatchet', () => {
  const part = cells(gear('bronze_hatchet').parts[0]!);
  const head = part.filter(([, , c]) => c.startsWith('bronze'));
  const wood = part.filter(([, , c]) => c.startsWith('wood'));

  it('has a head much heavier than its haft is wide, at the very top of the haft', () => {
    const haftWidth = Math.max(...byRow(wood).map(([, r]) => r.length));
    expect(head.length).toBeGreaterThanOrEqual(12 * haftWidth);
    const top = Math.min(...part.map(([, y]) => y));
    // A little haft shows above the head.
    expect(wood.some(([, y]) => y === top)).toBe(true);
    expect(head.every(([, y]) => y > top && y <= top + 6)).toBe(true);
  });

  it('has a curved bit with a bright edge, and a dark socket where the wood goes in', () => {
    const rows = byRow(head);
    const lefts = rows.map(([, r]) => Math.min(...r.map(([x]) => x)));
    // The middle of the bit stands further out than its two ends.
    expect(lefts[0]!).toBeGreaterThan(Math.min(...lefts));
    expect(lefts[lefts.length - 1]!).toBeGreaterThan(Math.min(...lefts));
    for (const [y, r] of rows) {
      const edge = r.reduce((a, b) => (b[0] < a[0] ? b : a));
      expect(edge[1], `row ${y}`).toBe('bronze5');
    }
    const touchesWood = head.filter(([x, y]) =>
      wood.some(([wx, wy]) => Math.abs(wx - x) + Math.abs(wy - y) === 1),
    );
    expect(touchesWood.every(([, , c]) => c === 'bronze3' || c === 'bronze4')).toBe(true);
  });

  it('is the iron axe’s smaller cousin', () => {
    const iron = cells(gear('iron_bearded_axe').parts[0]!).filter(([, , c]) =>
      c.startsWith('metal'),
    );
    expect(head.length).toBeLessThan(iron.length);
  });
});

describe('the bronze cap', () => {
  const cap = cells(gear('bronze_cap').parts[0]!);

  it('sits close: no more than a pixel proud of the skull on each side, no brim', () => {
    const xs = cap.map(([x]) => x);
    // The skull is columns 14 to 23 (ears at 13 and 24).
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(13);
    expect(Math.max(...xs)).toBeLessThanOrEqual(24);
    // It stops above the brows (row 6).
    expect(Math.max(...cap.map(([, y]) => y))).toBeLessThan(6);
  });

  it('has a bright ridge over the crown and a riveted rim, so it reads as metal, not hair', () => {
    const ridge = cap.filter(([, , c]) => c === 'bronze5');
    expect(new Set(ridge.map(([, y]) => y)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(ridge.map(([x]) => x)).size).toBe(1);
    const rim = byRow(cap).find(([, r]) => r.filter(([, c]) => c === 'bronze1').length >= 4);
    expect(rim).toBeDefined();
  });
});

describe('the shells', () => {
  const steps = (ramp: keyof typeof RAMPS) => RAMPS[ramp].map((_, i) => `${ramp}${i + 1}` as Shade);

  it('cannot be mistaken for skin of any tone, by day or at dusk', () => {
    const skins: Shade[] = [
      'skin1',
      'skin2',
      ...(['skinpale', 'skingolden', 'skinbrown', 'skindeep'] as const).flatMap((r) =>
        steps(r).slice(0, 2),
      ),
    ];
    for (const palette of [DAY, DUSK])
      for (const s of steps('shell'))
        for (const k of skins)
          expect(
            distance(palette.colours[s], palette.colours[k]),
            `${palette.name} ${s} ${k}`,
          ).toBeGreaterThan(12);
  });

  it('hang from a cord in uneven sizes, not in a regular band, in both arm poses', () => {
    for (const id of ['shell_bracelet', 'shell_bracelet_at_ease']) {
      const all = cells(gear(id).parts[0]!);
      const shells = all.filter(([, , c]) => c.startsWith('shell'));
      const cord = all.filter(([, , c]) => !c.startsWith('shell'));
      // Shells in groups: neighbours along an edge belong to the same shell.
      const groups: (typeof shells)[] = [];
      for (const cell of shells) {
        const near = groups.filter((g) =>
          g.some(([x, y]) => Math.abs(x - cell[0]) + Math.abs(y - cell[1]) === 1),
        );
        const merged = [cell, ...near.flat()];
        for (const g of near) groups.splice(groups.indexOf(g), 1);
        groups.push(merged);
      }
      const sizes = groups.map((g) => g.length);
      expect(groups.length, id).toBeGreaterThanOrEqual(2);
      expect(groups.length, id).toBeLessThanOrEqual(3);
      expect(new Set(sizes).size, id).toBeGreaterThan(1);
      expect(cord.length, id).toBeGreaterThan(shells.length);
    }
  });

  it('show on the wrist in every skin tone, holding something or not', () => {
    for (const skin of LOOK_CHOICES.skin)
      for (const held of [[], ['bronze_sword']]) {
        const g = characterPicture({ ...DEFAULT_LOOK, skin: skin.id }, [
          'shell_bracelet',
          ...held,
        ]).grid;
        const shells = g.d.filter((c) => c?.startsWith('shell')).length;
        expect(shells, `${skin.id} ${held.join()}`).toBeGreaterThanOrEqual(4);
      }
  });
});

/** CIE76 distance between two colours, in Lab. */
function distance(a: string, b: string): number {
  const lab = (hex: string) => {
    const [r, g, bl] = rgbOf(hex).map((v) => {
      const c = v / 255;
      return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92;
    }) as [number, number, number];
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const x = f((r * 0.4124 + g * 0.3576 + bl * 0.1805) / 0.95047);
    const y = f(r * 0.2126 + g * 0.7152 + bl * 0.0722);
    const z = f((r * 0.0193 + g * 0.1192 + bl * 0.9505) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)] as const;
  };
  const p = lab(a);
  const q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

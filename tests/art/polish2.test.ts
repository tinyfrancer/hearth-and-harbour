import { describe, expect, it } from 'vitest';
import { isMat, type TGrid } from '../../src/art/town2/cells';
import type { Mat } from '../../src/art/town2/ramps';
import { ROWBOAT_LANTERN_AT, town2Facts, town2Piece } from '../../src/art/town2/pieces';
import { dungeonDoor2, dungeonProp2, FOE2_SIZES } from '../../src/art/dungeonArt2';
import { measureFoe2 } from '../../src/art/dungeon2/sizes';
import { DAYLIGHT2_RGB, flicker2, SHAFT_LIGHT2 } from '../../src/art/dungeon2/light';
import { addGlow, type Glow } from '../../src/art/raster';
import { GLOW_RGB } from '../../src/art/palette';
import { CHART2_LANDINGS, harbourChart2 } from '../../src/art/chart';
import { townsfolkWalkPicture2 } from '../../src/art/character2';

const count = (g: TGrid, m: Mat): number => Array.from(g.d).filter((c) => c && isMat(c, m)).length;

describe('the boat looks like the thing to use (B16)', () => {
  it('keeps the boat’s id, size, base and foot; its lantern stands where it stood', () => {
    const f = town2Facts('rowboat');
    expect([f.w, f.h, f.base, f.foot]).toEqual([135, 58, 54, 68]);
    expect(ROWBOAT_LANTERN_AT).toEqual({ x: 114, y: 23 });
    expect(town2Facts('boat_lantern').foot).toBe(6);
  });

  it('raises the lantern’s pole by a staff with a red pennant at its head, above the quay’s edge', () => {
    const lan = town2Piece('boat_lantern');
    // Its top stands at least 50 pixels over the boat's top row, where the quay's edge is.
    expect(lan.base - ROWBOAT_LANTERN_AT.y).toBeGreaterThan(36);
    expect(lan.base).toBeGreaterThan(55);
    const g = lan.picture.grid;
    let top = g.h;
    for (let i = 0; i < g.d.length; i++)
      if (g.d[i] && isMat(g.d[i]!, 'crimson')) top = Math.min(top, Math.floor(i / g.w));
    expect(top).toBeLessThan(8);
    expect(count(g, 'crimson')).toBeGreaterThan(30);
    // Its lamp still lights at dusk, only at dusk.
    expect(lan.picture.glows.length).toBeGreaterThan(0);
    for (const gl of lan.picture.glows) expect(gl.always ?? false).toBe(false);
  });

  it('paints the sign’s boat boldly: a dark hull, the white and red strake, two rows of sea', () => {
    const g = town2Piece('boat_sign').picture.grid;
    expect(count(g, 'sail')).toBeGreaterThan(20);
    expect(count(g, 'sea')).toBeGreaterThan(45);
  });
});

describe('Old Snapper’s middle (B16)', () => {
  it('says where his body’s middle is, behind his feet, and his box takes in head and tail there', () => {
    const s = FOE2_SIZES.old_snapper!;
    expect(s.mid).toBeLessThan(-8);
    // Centred at his middle, the box reaches from his tail to his head, not past it.
    expect(s.mid! - s.box.w / 2).toBeLessThanOrEqual(-s.back);
    expect(s.mid! + s.box.w / 2).toBeGreaterThanOrEqual(s.front);
    expect(s.mid! + s.box.w / 2).toBeLessThanOrEqual(s.front + 1);
    // Reach as before: the fight's numbers do not move.
    expect([s.front, s.back, s.strike, s.anchor]).toEqual([27, 56, 47, { x: 60, y: 64 }]);
    // Every other foe stands over its middle: no `mid`.
    for (const [id, size] of Object.entries(FOE2_SIZES))
      if (id !== 'old_snapper') expect(size.mid, id).toBeUndefined();
    expect(measureFoe2('old_snapper')).toEqual(s);
  });
});

describe('the tide-pool cave by daylight (B16)', () => {
  it('gives its daylight its own cool colour, the lamp’s kept for the grotto', () => {
    const lum = (c: readonly number[]) => c[2]! - c[0]!;
    expect(lum(DAYLIGHT2_RGB)).toBeGreaterThan(0);
    expect(lum(GLOW_RGB)).toBeLessThan(0);
    for (const id of ['light_shaft', 'cave_mouth']) {
      const p = dungeonProp2(id)!;
      for (const g of p.picture.glows) expect(g.rgb, id).toBe(DAYLIGHT2_RGB);
      expect(p.light!.rgb, id).toBe(DAYLIGHT2_RGB);
    }
    for (const kind of ['door_side_open', 'door_open']) {
      const t = dungeonDoor2(kind, { e: 'sand', w: null }, { col: 2, row: 4 }, 'tidepool')!;
      for (const g of t.picture.glows) expect(g.rgb, kind).toBe(DAYLIGHT2_RGB);
      expect(t.light!.rgb, kind).toBe(DAYLIGHT2_RGB);
      const grotto = dungeonDoor2(kind, { e: 'sand', w: null }, { col: 2, row: 4 })!;
      for (const g of grotto.picture.glows) expect(g.rgb, kind).toBeUndefined();
    }
    expect(SHAFT_LIGHT2.rgb).toBe(DAYLIGHT2_RGB);
    expect(flicker2({ ...SHAFT_LIGHT2, x: 0, y: 0 }, 100).rgb).toBe(DAYLIGHT2_RGB);
  });

  it('colours a glow by its own light, and a lamp’s when it has none', () => {
    const px = () => new Float64Array([0, 0, 0, 255]);
    const at = (glow: Partial<Glow>) => {
      const p = px();
      addGlow(p, 1, 1, { x: 0.5, y: 0.5, radius: 4, strength: 1, ...glow });
      return Array.from(p.subarray(0, 3)).map(Math.round);
    };
    expect(at({})).toEqual([...GLOW_RGB]);
    expect(at({ rgb: DAYLIGHT2_RGB })).toEqual([...DAYLIGHT2_RGB]);
  });

  it('draws the light shaft’s body, dithered, so it shows without its glows', () => {
    const g = dungeonProp2('light_shaft')!.picture.grid;
    expect(count(g, 'lamp') + count(g, 'sail')).toBeGreaterThan(150);
    // Dithered: no two lit pixels of its body side by side in a row.
    let side = 0;
    for (let y = 0; y < g.h; y++)
      for (let x = 1; x < g.w; x++) {
        const a = g.d[y * g.w + x]!;
        const b = g.d[y * g.w + x - 1]!;
        if (a && b && isMat(a, 'lamp') && isMat(b, 'lamp')) side++;
      }
    expect(side).toBeLessThan(6);
  });
});

describe('the chart’s home and the western landing (B16)', () => {
  it('draws home larger: more of the town’s roofs and walls on the land by the quay', () => {
    const c = harbourChart2();
    let roof = 0;
    for (let y = 60; y < 95; y++)
      for (let x = 95; x < 150; x++) {
        const v = c.picture.grid.d[y * c.width + x]!;
        if (v && (isMat(v, 'tile') || isMat(v, 'slate') || isMat(v, 'thatch'))) roof++;
      }
    expect(roof).toBeGreaterThan(110);
  });

  it('keeps the landings’ keys, the western one moved clear of its islet', () => {
    expect(Object.keys(CHART2_LANDINGS).sort()).toEqual(
      ['brinebeards_grotto', 'tidepool_cave', 'unknown_1', 'unknown_2', 'unknown_3'].sort(),
    );
    expect(CHART2_LANDINGS.unknown_2).not.toEqual({ x: 52, y: 133 });
  });
});

describe('the ferryman from behind (B16)', () => {
  it('shows no bare head under his hat: the brim’s back flap is wider than his skull and long', () => {
    const g = townsfolkWalkPicture2('ferryman', 'up', 0)!.grid;
    // The hat's fourteen rows from its crown (above his shoulders): broad (over 13 across) for at
    // least seven of them, the brim and its flap (B15's peaked hat was broad for five).
    const ochre = (y: number) => {
      let n = 0;
      for (let x = 0; x < g.w; x++) {
        const c = g.d[y * g.w + x]!;
        if (c && isMat(c, 'ochre')) n++;
      }
      return n;
    };
    let top = 0;
    while (top < g.h && ochre(top) === 0) top++;
    let rows = 0;
    for (let y = top; y < top + 14; y++) if (ochre(y) > 13) rows++;
    expect(rows).toBeGreaterThanOrEqual(7);
  });
});

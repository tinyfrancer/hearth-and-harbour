import { describe, expect, it } from 'vitest';
import { dungeonProp, dungeonTile, foePicture } from '../../src/art/dungeonArt';
import type { Cell, Grid } from '../../src/art/grid';
import { GROTTO_TILES, wearOf } from '../../src/art/grottoTiles';
import { TEST_ROOM, roomKinds, roomPicture } from '../../src/art/grottoRoom';
import { DUSK, rgbOf } from '../../src/art/palette';
import { characterPicture, DEFAULT_LOOK } from '../../src/art/character';

/** The brief's lists (docs/lanes.md, wave 6), copied here on purpose. */
const TILE_KINDS = [
  'sand',
  'wet_sand',
  'rock_floor',
  'wall_top',
  'wall_face',
  'shallows',
  'deep_water',
  'planks',
  'door_barred',
  'door_open',
];
const PROP_IDS = [
  'powder_keg',
  'treasure_chest',
  'brig_bars',
  'lantern',
  'anchor',
  'rope_coil',
  'cannon',
];
const FOE_IDS = [
  'dock_rat',
  'sand_crab',
  'smuggler',
  'deckhand',
  'powder_monkey',
  'giant_crab',
  'ships_parrot',
  'brinebeard',
];

const at = (g: Grid, x: number, y: number): Cell => g.d[y * g.w + x] ?? null;
const column = (g: Grid, x: number): Cell[] => Array.from({ length: g.h }, (_, y) => at(g, x, y));
const rowOf = (g: Grid, y: number): Cell[] => Array.from({ length: g.w }, (_, x) => at(g, x, y));
const wears = (kind: string): Grid[] =>
  Array.from({ length: GROTTO_TILES[kind as 'sand'].wears }, (_, i) =>
    GROTTO_TILES[kind as 'sand'].draw(i),
  );
const lightness = (cell: Cell): number => {
  const [r, g, b] = rgbOf(DUSK.colours[cell!]);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};
/** How far, from its top-left, the drawn part of a picture reaches. */
function bounds(g: Grid) {
  let x0 = g.w,
    y0 = g.h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++)
      if (at(g, x, y)) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  return { w: x1 - x0 + 1, h: y1 - y0 + 1, bottom: y1 };
}

describe('the dungeon art doors', () => {
  it('answer null, and never throw, for what art has not drawn', () => {
    expect(foePicture('no_such_creature')).toBeNull();
    expect(dungeonTile('nowhere', 'floor')).toBeNull();
    expect(dungeonTile('nowhere', 'floor', 7)).toBeNull();
    expect(dungeonProp('nowhere', 'thing')).toBeNull();
    expect(dungeonTile('grotto', 'lava')).toBeNull();
    expect(dungeonTile('nowhere', 'sand')).toBeNull();
    expect(dungeonProp('grotto', 'no_such_prop')).toBeNull();
    expect(dungeonProp('nowhere', 'lantern')).toBeNull();
    for (const id of ['toString', '__proto__', 'constructor']) {
      expect(foePicture(id), id).toBeNull();
      expect(dungeonTile('grotto', id), id).toBeNull();
      expect(dungeonProp('grotto', id), id).toBeNull();
    }
  });
});

describe('the grotto’s tiles', () => {
  it('gives every kind as a full 16 x 16 tile for any whole variant', () => {
    for (const kind of TILE_KINDS)
      for (const v of [0, 1, 2, 7, 99, -3, 123456, 2.5]) {
        const t = dungeonTile('grotto', kind, v);
        expect(t, `${kind} ${v}`).not.toBeNull();
        expect([t!.grid.w, t!.grid.h]).toEqual([16, 16]);
        expect(
          t!.grid.d.every((c) => c !== null),
          `${kind} ${v} has holes`,
        ).toBe(true);
      }
  });

  it('gives the same tile for the same variant, and several wears of each floor', () => {
    for (const kind of TILE_KINDS) {
      expect(dungeonTile('grotto', kind, 5)).toBe(dungeonTile('grotto', kind, 5));
      expect(dungeonTile('grotto', kind)).toBe(dungeonTile('grotto', kind, 0));
    }
    for (const kind of ['sand', 'wet_sand', 'rock_floor', 'shallows', 'deep_water', 'wall_top']) {
      const seen = new Set<string>();
      for (let v = 0; v < 200; v++) seen.add(dungeonTile('grotto', kind, v)!.grid.d.join());
      expect(seen.size, kind).toBeGreaterThanOrEqual(4);
    }
  });

  it('mixes variant numbers, so neighbouring cells do not step through the wears in order', () => {
    const run = Array.from({ length: 12 }, (_, v) => wearOf(v, 10));
    expect(run).not.toEqual(run.map((_, i) => i % 10));
    expect(new Set(run).size).toBeGreaterThan(4);
  });

  /*
   * A floor joins itself and its neighbours without a seam when nothing but
   * the base and single grains reaches its edge: the base must be most of
   * every edge on every wear, and the edge may hold only these steps.
   */
  const EDGES: Record<string, { base: string; allowed: string[] }> = {
    sand: { base: 'cavesand2', allowed: ['cavesand1', 'cavesand2', 'cavesand3'] },
    wet_sand: { base: 'cavesand3', allowed: ['cavesand2', 'cavesand3', 'cavesand4'] },
    rock_floor: { base: 'stone2', allowed: ['stone1', 'stone2', 'stone3'] },
    shallows: { base: 'shoal2', allowed: ['shoal2'] },
    deep_water: { base: 'sea3', allowed: ['sea3'] },
    wall_top: { base: 'slate3', allowed: ['slate2', 'slate3', 'shade1'] },
  };
  it('lets every wear of a floor, water and the wall’s top join any other without a changed edge', () => {
    for (const [kind, { base, allowed }] of Object.entries(EDGES))
      for (const g of wears(kind)) {
        for (const edge of [rowOf(g, 0), rowOf(g, 15), column(g, 0), column(g, 15)]) {
          for (const c of edge) expect(allowed, kind).toContain(c);
          expect(edge.filter((c) => c === base).length, kind).toBeGreaterThanOrEqual(12);
        }
      }
  });

  it('runs the wall’s face across tiles: every wear’s left edge meets every right edge', () => {
    const faces = wears('wall_face');
    for (const a of faces) for (const b of faces) expect(column(a, 15)).toEqual(column(b, 0));
  });

  it('gives the face a lit lip to meet the wall’s top and a dark foot for the floor below', () => {
    const top = wears('wall_top');
    for (const face of wears('wall_face')) {
      const lip = rowOf(face, 0);
      expect(new Set(lip)).toEqual(new Set(['stone1']));
      for (const t of top) expect(lightness('stone1')).toBeGreaterThan(lightness(at(t, 0, 15)));
      for (const y of [14, 15]) expect(new Set(rowOf(face, y))).toEqual(new Set(['shade1']));
      // The foot is darker than every floor it stands on.
      for (const floor of ['sand', 'wet_sand', 'rock_floor', 'shallows', 'planks'])
        for (const g of wears(floor))
          expect(lightness('shade1')).toBeLessThan(lightness(at(g, 8, 0)));
    }
  });

  it('lays the planks’ boards at the same rows on every wear, so a deck joins any way', () => {
    for (const g of wears('planks'))
      for (const x of [0, 15])
        for (let y = 0; y < 16; y++) {
          if (y % 4 === 3) expect(at(g, x, y)).toBe('wood4');
          if (y % 4 === 0) expect(at(g, x, y)).toBe('wood1');
        }
  });

  it('makes the shallows plainly lighter than deep water, and wet sand darker than dry', () => {
    const mean = (kind: string) => {
      const g = dungeonTile('grotto', kind)!.grid;
      return g.d.reduce((n, c) => n + lightness(c), 0) / g.d.length;
    };
    expect(mean('shallows') - mean('deep_water')).toBeGreaterThan(20);
    expect(mean('sand') - mean('wet_sand')).toBeGreaterThan(15);
  });

  it('frames both doors in timber and shows bars only on the barred one', () => {
    const barred = dungeonTile('grotto', 'door_barred')!.grid;
    const open = dungeonTile('grotto', 'door_open')!.grid;
    for (const g of [barred, open]) {
      expect(column(g, 0).every((c) => c?.startsWith('wood'))).toBe(true);
      expect(column(g, 15).every((c) => c?.startsWith('wood'))).toBe(true);
    }
    expect(barred.d.filter((c) => c?.startsWith('metal')).length).toBeGreaterThan(40);
    expect(open.d.filter((c) => c?.startsWith('metal')).length).toBe(0);
  });

  it('assembles a room, rock showing its face only where open ground lies below', () => {
    const kinds = roomKinds(TEST_ROOM);
    expect(kinds[0]![0]).toBe('wall_top');
    expect(kinds[1]![1]).toBe('wall_face');
    expect(kinds[13]![5]).toBe('wall_top');
    const pic = roomPicture(TEST_ROOM);
    expect([pic.grid.w, pic.grid.h]).toEqual([24 * 16, 14 * 16]);
  });
});

describe('the cast', () => {
  const hero = bounds(characterPicture(DEFAULT_LOOK, []).grid);

  it('gives every foe a picture facing right with its feet inside it', () => {
    for (const id of FOE_IDS) {
      const f = foePicture(id);
      expect(f, id).not.toBeNull();
      const { w, h } = f!.picture.grid;
      expect(f!.feet.x, id).toBeGreaterThanOrEqual(0);
      expect(f!.feet.x, id).toBeLessThan(w);
      expect(f!.feet.y, id).toBeGreaterThanOrEqual(0);
      expect(f!.feet.y, id).toBeLessThan(h);
      expect(foePicture(id)).toBe(f);
    }
  });

  it('stands everything but the parrot on its feet: the feet are on (or a tail’s width above) the drawing’s lowest row', () => {
    for (const id of FOE_IDS.filter((i) => i !== 'ships_parrot')) {
      const f = foePicture(id)!;
      const b = bounds(f.picture.grid);
      // The outline's own row is under the lowest drawn row.
      expect(b.bottom - 1 - f.feet.y, id).toBeGreaterThanOrEqual(0);
      expect(b.bottom - 1 - f.feet.y, id).toBeLessThanOrEqual(1);
      // Feet (or a crab's leg tips) on the feet row, either side of the feet point.
      const ground = rowOf(f.picture.grid, f.feet.y).map((c) => c !== null && c !== 'ink1');
      expect(ground.slice(0, f.feet.x + 4).some(Boolean), id).toBe(true);
      expect(ground.slice(f.feet.x - 3).some(Boolean), id).toBe(true);
    }
    // The parrot flies: its feet are the ground well below it.
    const parrot = foePicture('ships_parrot')!;
    expect(parrot.feet.y - bounds(parrot.picture.grid).bottom).toBeGreaterThanOrEqual(0);
    const drawnRows = parrot.picture.grid.d.findIndex((c) => c) / parrot.picture.grid.w;
    expect(parrot.feet.y - drawnRows).toBeGreaterThan(30);
  });

  it('carries threat in size: a small rat, a deckhand the hero’s height, a wide low crab, a big captain', () => {
    const size = (id: string) => bounds(foePicture(id)!.picture.grid);
    expect(size('dock_rat').h).toBeLessThan(hero.h / 2);
    expect(Math.abs(size('deckhand').h - hero.h)).toBeLessThanOrEqual(4);
    expect(Math.abs(size('smuggler').h - hero.h)).toBeLessThanOrEqual(4);
    expect(size('powder_monkey').h).toBeLessThan(size('deckhand').h);
    expect(size('giant_crab').w).toBeGreaterThan(hero.w);
    expect(size('giant_crab').w).toBeGreaterThan(size('giant_crab').h * 1.5);
    expect(size('giant_crab').w).toBeGreaterThan(size('sand_crab').w * 1.6);
    expect(size('brinebeard').h).toBeGreaterThan(hero.h + 8);
    expect(size('brinebeard').w).toBeGreaterThan(hero.w * 1.3);
  });

  it('lights the powder monkey’s fuse at dusk, inside his picture', () => {
    const f = foePicture('powder_monkey')!;
    expect(f.picture.glows.length).toBe(1);
    const glow = f.picture.glows[0]!;
    expect(glow.y - glow.radius).toBeGreaterThanOrEqual(0);
    expect(glow.x + glow.radius).toBeLessThanOrEqual(f.picture.grid.w);
  });
});

describe('the grotto’s props', () => {
  it('gives every prop a picture standing on a row inside it', () => {
    for (const id of PROP_IDS) {
      const p = dungeonProp('grotto', id);
      expect(p, id).not.toBeNull();
      expect(p!.base, id).toBeGreaterThan(0);
      expect(p!.base, id).toBeLessThan(p!.picture.grid.h);
      // Something stands on the base row.
      expect(
        p!.picture.grid.d
          .slice(p!.base * p!.picture.grid.w, (p!.base + 1) * p!.picture.grid.w)
          .some((c) => c && c !== 'ink1'),
        id,
      ).toBe(true);
      expect(dungeonProp('grotto', id)).toBe(p);
    }
  });

  it('lights the lantern and nothing else', () => {
    for (const id of PROP_IDS) {
      const glows = dungeonProp('grotto', id)!.picture.glows;
      expect(glows.length, id).toBe(id === 'lantern' ? 1 : 0);
    }
    const glow = dungeonProp('grotto', 'lantern')!.picture.glows[0]!;
    expect(glow.radius).toBeGreaterThanOrEqual(32);
  });
});

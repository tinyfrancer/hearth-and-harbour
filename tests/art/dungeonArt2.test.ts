import { describe, expect, it } from 'vitest';
import { dungeonProp, dungeonTile, foePicture } from '../../src/art/dungeonArt';
import {
  dungeonProp2,
  dungeonTile2,
  DUNGEON2_TILE,
  foeFrames2,
  foePicture2,
  FOE2_POSES,
  heroPortrait2,
  heroPortraitPicture2,
  monsterPicture2,
  portrait2,
  portraitScales2,
  PORTRAIT2_IDS,
  PORTRAIT2_SAFE,
  PORTRAIT2_SIZE,
  roomKinds2,
  aroundOf,
  TILE2_WEARS,
} from '../../src/art/dungeonArt2';
import { portraitBust2 } from '../../src/art/dungeon2/portraits2';
import { PORTRAIT_IDS, PORTRAIT_SIZE, portrait } from '../../src/art/portraits';
import { matOf, stepOf, type TGrid } from '../../src/art/town2/cells';
import { tabIcon } from '../../src/art/icons';
import { TAB_ICONS2 } from '../../src/art/tabIcons2';
import { MONSTERS } from '../../src/data/monsters';

/** The first scale's lists (docs/lanes.md, wave 6), and lane C's two props, copied here on purpose. */
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
const LANE_C_PROPS = ['crate', 'perch'];
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
const VILLAGERS = ['alewife', 'market', 'docker', 'elder'];

const drawn = (g: TGrid) => {
  let n = 0;
  for (const c of g.d) if (c) n++;
  return n;
};
const lum = (g: TGrid, x: number, y: number) => stepOf(g.d[y * g.w + x]!);

describe('dungeon tiles at the C scale', () => {
  it('draws every kind the first scale has, and the upper face, at 24 x 24 with no holes', () => {
    expect(DUNGEON2_TILE).toBe(24);
    for (const kind of [...TILE_KINDS, 'wall_face_high'])
      for (let v = 0; v < 30; v++) {
        const t = dungeonTile2('grotto', kind, v, undefined, { col: v, row: 3 })!;
        expect(t, kind).not.toBeNull();
        expect([t.grid.w, t.grid.h]).toEqual([24, 24]);
        expect(drawn(t.grid), kind).toBe(24 * 24);
      }
  });

  it('answers null for anything else, and the same tile for the same ask', () => {
    expect(dungeonTile2('cave', 'sand')).toBeNull();
    expect(dungeonTile2('grotto', 'lava')).toBeNull();
    expect(dungeonTile2('grotto', 'toString')).toBeNull();
    const a = dungeonTile2('grotto', 'sand', 7, undefined, { col: 2, row: 2 })!;
    const b = dungeonTile2('grotto', 'sand', 7, undefined, { col: 2, row: 2 })!;
    expect(a.grid).toBe(b.grid);
    for (const kind of Object.keys(TILE2_WEARS))
      expect(TILE2_WEARS[kind as keyof typeof TILE2_WEARS]).toBeGreaterThan(0);
  });

  it('tiles: a floor laid cell by cell shows no seam at the tiles’ edges', () => {
    for (const kind of [
      'sand',
      'wet_sand',
      'rock_floor',
      'shallows',
      'deep_water',
      'planks',
      'wall_top',
    ]) {
      let seam = 0;
      let inside = 0;
      let n = 0;
      for (let row = 0; row < 6; row++)
        for (let col = 0; col < 6; col++) {
          const a = dungeonTile2('grotto', kind, row * 7 + col, undefined, { col, row })!.grid;
          const b = dungeonTile2('grotto', kind, row * 7 + col + 1, undefined, {
            col: col + 1,
            row,
          })!.grid;
          for (let y = 0; y < 24; y++) {
            seam += Math.abs(lum(a, 23, y) - lum(b, 0, y));
            inside += Math.abs(lum(a, 11, y) - lum(a, 12, y));
            n++;
          }
        }
      // The step from one tile into the next is no rougher than a step inside a tile.
      expect(seam / n, kind).toBeLessThan((inside / n) * 1.5 + 0.15);
    }
  });

  it('tiles: a row of faces runs on, its strata and tide mark at the same rows either side of each join', () => {
    for (const kind of ['wall_face', 'wall_face_high'])
      for (let col = 0; col < 8; col++) {
        const a = dungeonTile2('grotto', kind, col, undefined, { col, row: 1 })!.grid;
        const b = dungeonTile2('grotto', kind, col + 1, undefined, { col: col + 1, row: 1 })!.grid;
        let differ = 0;
        for (let y = 0; y < 24; y++) if (matOf(a.d[y * 24 + 23]!) !== matOf(b.d[y * 24]!)) differ++;
        expect(differ, `${kind} ${col}`).toBeLessThanOrEqual(3);
      }
  });

  it('joins neighbours: sand spills over wet sand in a curve that two tiles agree on where they meet', () => {
    const around = {
      n: 'sand',
      s: 'wet_sand',
      e: 'wet_sand',
      w: 'wet_sand',
      ne: 'sand',
      nw: 'sand',
      se: 'wet_sand',
      sw: 'wet_sand',
    };
    const bare = { ...around, n: 'wet_sand', ne: 'wet_sand', nw: 'wet_sand' };
    // How far down from the top the sand reaches: the rows that differ from the same tile with wet sand above.
    const depth = (col: number, x: number) => {
      const a = dungeonTile2('grotto', 'wet_sand', 0, around, { col, row: 5 })!.grid;
      const b = dungeonTile2('grotto', 'wet_sand', 0, bare, { col, row: 5 })!.grid;
      let d = 0;
      while (d < 24 && a.d[d * 24 + x] !== b.d[d * 24 + x]) d++;
      return d;
    };
    const depths: number[] = [];
    for (let col = 0; col < 6; col++) {
      expect(Math.abs(depth(col, 23) - depth(col + 1, 0)), `col ${col}`).toBeLessThanOrEqual(2);
      for (let x = 0; x < 24; x++) depths.push(depth(col, x));
    }
    // A curve, not a ruled line: the spill's depth wanders along the shore.
    expect(new Set(depths).size).toBeGreaterThan(3);
  });

  it('puts foam where land meets the water, and shade under a wall', () => {
    const shore = dungeonTile2(
      'grotto',
      'shallows',
      1,
      { n: 'sand', s: 'shallows', e: 'shallows', w: 'shallows' },
      { col: 4, row: 4 },
    )!.grid;
    let foam = 0;
    for (const c of shore.d) if (matOf(c) === 'shoal' && stepOf(c) <= 1) foam++;
    expect(foam).toBeGreaterThan(6);
    const open = dungeonTile2(
      'grotto',
      'sand',
      3,
      { n: 'sand', s: 'sand', e: 'sand', w: 'sand' },
      { col: 9, row: 9 },
    )!.grid;
    const under = dungeonTile2(
      'grotto',
      'sand',
      3,
      { n: 'wall_face', s: 'sand', e: 'sand', w: 'sand' },
      { col: 9, row: 9 },
    )!.grid;
    const top = (g: TGrid) => {
      let s = 0;
      for (let x = 0; x < 24; x++) s += stepOf(g.d[x]!) + stepOf(g.d[24 + x]!);
      return s;
    };
    expect(top(under)).toBeGreaterThan(top(open));
  });

  it('stands a wall two tiles tall: the face over open ground, the upper face over that, the top elsewhere', () => {
    const kinds = roomKinds2(['#####', '#####', '##D##', '#...#', '#####']);
    expect(kinds[1]![1]).toBe('wall_face_high');
    expect(kinds[2]![1]).toBe('wall_face');
    expect(kinds[1]![2]).toBe('wall_face_high');
    expect(kinds[0]![2]).toBe('wall_top');
    expect(kinds[4]![2]).toBe('wall_top');
    expect(aroundOf(kinds, 2, 3).n).toBe('door_barred');
    expect(aroundOf(kinds, 0, 0).nw).toBeNull();
  });
});

describe('dungeon props at the C scale', () => {
  it('draws every prop the first scale has and lane C’s crate and perch, standing on their base', () => {
    for (const id of [...PROP_IDS, ...LANE_C_PROPS]) {
      const p = dungeonProp2('grotto', id)!;
      expect(p, id).not.toBeNull();
      expect(p.base, id).toBeLessThan(p.picture.grid.h);
      expect(p.base, id).toBeGreaterThan(p.picture.grid.h / 3);
      expect(drawn(p.picture.grid), id).toBeGreaterThan(60);
    }
    expect(dungeonProp2('grotto', 'lantern')!.picture.glows).toHaveLength(1);
    expect(dungeonProp2('grotto', 'perch')!.seat).toBeDefined();
    expect(dungeonProp2('grotto', 'nothing')).toBeNull();
    expect(dungeonProp2('cave', 'crate')).toBeNull();
  });

  it('draws the brig’s bars a tile wide and two metres tall', () => {
    const bars = dungeonProp2('grotto', 'brig_bars')!.picture.grid;
    expect(bars.w).toBe(26);
    expect(bars.h).toBeGreaterThanOrEqual(76);
  });
});

describe('the cast at the C scale', () => {
  it('draws every foe the first scale draws, in every pose and frame, standing on its feet', () => {
    for (const id of FOE_IDS) {
      const counts = foeFrames2(id)!;
      expect(counts, id).not.toBeNull();
      for (const pose of FOE2_POSES) {
        expect(counts[pose], `${id} ${pose}`).toBeGreaterThanOrEqual(1);
        for (let f = 0; f < counts[pose]; f++)
          for (const phase of id === 'brinebeard' ? [1, 2, 3] : [1]) {
            const p = foePicture2(id, pose, f, phase)!;
            const { w, h } = p.picture.grid;
            expect(p.feet.x, `${id} ${pose} ${f}`).toBeGreaterThanOrEqual(0);
            expect(p.feet.x).toBeLessThan(w);
            expect(p.feet.y).toBeLessThan(h);
            expect(drawn(p.picture.grid), `${id} ${pose} ${f}`).toBeGreaterThan(80);
          }
      }
    }
  });

  it('stands a person on the hero’s canvas and anchor, a head shorter for the powder monkey', () => {
    for (const id of ['deckhand', 'smuggler', 'powder_monkey']) {
      const p = foePicture2(id)!;
      expect([p.picture.grid.w, p.picture.grid.h, p.feet.x, p.feet.y]).toEqual([56, 72, 28, 70]);
    }
    const top = (id: string) => {
      const g = foePicture2(id)!.picture.grid;
      for (let i = 0; i < g.d.length; i++)
        if (g.d[i] && i % g.w > 20 && i % g.w < 36) return Math.floor(i / g.w);
      return 0;
    };
    // His eyes, under the keg he holds up, are well below a deckhand's.
    const eyes = (id: string) => {
      const g = foePicture2(id)!.picture.grid;
      for (let i = 0; i < g.d.length; i++) if (matOf(g.d[i]!) === 'eye') return Math.floor(i / g.w);
      return 0;
    };
    expect(eyes('powder_monkey') - eyes('deckhand')).toBeGreaterThanOrEqual(8);
    expect(top('deckhand')).toBeLessThan(10);
  });

  it('lights the powder monkey’s fuse while he holds his keg, and not once it is thrown', () => {
    expect(foePicture2('powder_monkey', 'idle')!.picture.glows.length).toBe(1);
    expect(foePicture2('powder_monkey', 'strike')!.picture.glows.length).toBe(0);
  });

  it('makes the captain’s three phases plainly different pictures', () => {
    const g = [1, 2, 3].map((ph) => foePicture2('brinebeard', 'idle', 0, ph)!.picture.grid);
    for (const [a, b] of [
      [0, 1],
      [1, 2],
      [0, 2],
    ] as const) {
      let differ = 0;
      for (let i = 0; i < g[a]!.d.length; i++) if (g[a]!.d[i] !== g[b]!.d[i]) differ++;
      expect(differ, `${a + 1} and ${b + 1}`).toBeGreaterThan(600);
    }
    // A head and more taller than the hero.
    const tall = (grid: TGrid) => {
      for (let i = 0; i < grid.d.length; i++) if (grid.d[i]) return grid.h - Math.floor(i / grid.w);
      return 0;
    };
    expect(tall(g[0]!)).toBeGreaterThan(80);
  });

  it('answers null for anything else', () => {
    expect(foePicture2('dragon')).toBeNull();
    expect(foePicture2('toString')).toBeNull();
    expect(foePicture2('deckhand', 'dance' as never)).toBeNull();
  });
});

describe('the idle game’s monsters at the C scale', () => {
  it('draws every monster in the tables, the bounty-only ones too', () => {
    const ids = Object.keys(MONSTERS);
    expect(ids).toContain('goblin_poacher');
    expect(ids).toContain('bramble_wyrm');
    for (const id of ids) {
      const p = monsterPicture2(id)!;
      expect(p, id).not.toBeNull();
      expect(drawn(p.picture.grid), id).toBeGreaterThan(80);
    }
    expect(monsterPicture2('deckhand')).toBeNull();
  });
});

describe('portraits at the C scale', () => {
  it('draws a face for every face the first scale has, the villagers, and every monster', () => {
    expect(PORTRAIT2_SIZE).toBe(72);
    for (const id of [...PORTRAIT_IDS, ...VILLAGERS, ...Object.keys(MONSTERS)])
      expect(PORTRAIT2_IDS, id).toContain(id);
    for (const id of PORTRAIT2_IDS) expect(portrait2(id), id).not.toBeNull();
    expect(portrait2('nobody')).toBeNull();
  });

  it('keeps every face, hat, ear and horn inside the safe box', () => {
    const S = PORTRAIT2_SAFE;
    for (const id of PORTRAIT2_IDS) {
      const g = portraitBust2(id)!;
      for (let y = 0; y < S.y + S.h; y++)
        for (let x = 0; x < g.w; x++)
          if (g.d[y * g.w + x]) {
            expect(y, id).toBeGreaterThanOrEqual(S.y);
            expect(x >= S.x && x < S.x + S.w, `${id} at ${x},${y}`).toBe(true);
          }
    }
  });

  it('carries three sizes, at whole device pixels, the smallest fitting a 48-pixel panel whole', () => {
    expect(portraitScales2(3)).toEqual({ large: 6, small: 4, mini: 2 });
    expect(portraitScales2(2)).toEqual({ large: 4, small: 2, mini: 1 });
    const was = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true });
    try {
      const el = portrait2('brinebeard')!;
      const canvases = [...el.querySelectorAll('canvas')];
      expect(canvases.map((c) => c.className.split(' ').pop())).toEqual([
        'portrait2-large',
        'portrait2-small',
        'portrait2-mini',
      ]);
      for (const c of canvases) expect((parseFloat(c.style.width) * 3) / c.width).toBeCloseTo(1, 6);
      expect(canvases.map((c) => parseFloat(c.style.width))).toEqual([144, 96, 48]);
    } finally {
      if (was) Object.defineProperty(window, 'devicePixelRatio', was);
      else delete (window as { devicePixelRatio?: number }).devicePixelRatio;
    }
  });

  it('draws the hero in the look and the head gear worn, never throwing', () => {
    const plain = heroPortraitPicture2({}, []);
    const helmed = heroPortraitPicture2({}, ['iron_helmet']);
    const dark = heroPortraitPicture2({ skin: 'deep', hairColour: 'grey' }, []);
    const differ = (a: TGrid, b: TGrid) => a.d.filter((c, i) => c !== b.d[i]).length;
    expect(differ(plain.grid, helmed.grid)).toBeGreaterThan(80);
    expect(differ(plain.grid, dark.grid)).toBeGreaterThan(300);
    expect(heroPortraitPicture2({ skin: 'teal' as never }, ['nothing']).grid.w).toBe(72);
    expect(heroPortrait2({}, ['tricorn']).querySelectorAll('canvas')).toHaveLength(3);
  });
});

describe('the first scale’s doors', () => {
  it('are unchanged', () => {
    expect(foePicture('deckhand')!.picture.grid.w).toBe(39);
    expect(foePicture('brinebeard')!.feet).toEqual({ x: 29, y: 60 });
    expect(dungeonTile('grotto', 'sand', 3)!.grid.w).toBe(16);
    expect(dungeonProp('grotto', 'lantern')!.base).toBe(23);
    expect(dungeonProp('grotto', 'crate')).toBeNull();
    expect(PORTRAIT_SIZE).toBe(48);
    expect(portrait('goblin_poacher')).toBeNull();
  });
});

describe('the tab bar’s icons', () => {
  it('draws the five tabs, 16 x 16, in the tab’s own colour', () => {
    for (const id of ['skills', 'bank', 'character', 'town', 'menu']) {
      const rows = TAB_ICONS2[id]!;
      expect(rows, id).toHaveLength(16);
      for (const r of rows) expect(r, id).toMatch(/^[.123]{16}$/);
      const svg = tabIcon(id)!;
      expect(svg.tagName.toLowerCase()).toBe('svg');
      expect(svg.getAttribute('width')).toBe('32');
      for (const path of svg.querySelectorAll('path'))
        expect(path.getAttribute('fill')).toBe('currentColor');
    }
    expect(tabIcon('town')!.querySelectorAll('path').length).toBeGreaterThanOrEqual(2);
    expect(tabIcon('shop')).toBeNull();
    expect(tabIcon('toString')).toBeNull();
  });
});

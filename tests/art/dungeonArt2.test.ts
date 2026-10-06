import { describe, expect, it } from 'vitest';
import { dungeonProp, dungeonTile, foePicture } from '../../src/art/dungeonArt';
import {
  aroundOf,
  CAVE_DAY,
  CAVE_DUSK,
  dungeonProp2,
  dungeonPropSprite2,
  dungeonTile2,
  DUNGEON2_TILE,
  foeFrames2,
  foePicture2,
  foeSize2,
  foeSprite2,
  FOE2_IDS,
  FOE2_POSES,
  FOE2_SIZES,
  GROTTO2_IDS,
  lightAt,
  lightGround2,
  MONSTER2_IDS,
  PROP2_IDS,
  roomKinds2,
  TILE2_KINDS,
  TILE2_WEARS,
} from '../../src/art/dungeonArt2';
import {
  heroPortrait2,
  heroPortraitPicture2,
  HERO_PORTRAIT2_SAFE,
  portrait2,
  portraitScales2,
  PORTRAIT2_IDS,
  PORTRAIT2_SAFE,
  PORTRAIT2_SIZE,
} from '../../src/art/portraits2';
import { PORTRAIT_IDS, PORTRAIT_SIZE, portrait } from '../../src/art/portraits';
import { CAVE_FIRST, cell as cell2, matOf as matOf2 } from '../../src/art/dungeon2/cave';
import { portraitBust2 } from '../../src/art/dungeon2/faces2';
import { measureFoe2 } from '../../src/art/dungeon2/sizes';
import { faceBox, heroBust2Grid, measureSafe2, SHOULDERS } from '../../src/art/dungeon2/safe';
import { POOLS2, STORE2, poolsRoom2, roomAtTide } from '../../src/art/dungeon2/sample';
import { HEADGEAR2 } from '../../src/art/figure2/headgear';
import { stepOf, tgrid, type TGrid } from '../../src/art/town2/cells';
import { DUSK2, MATS } from '../../src/art/town2/ramps';
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
const PEOPLE = ['deckhand', 'smuggler', 'powder_monkey', 'footpad', 'goblin_poacher'];

const drawn = (g: TGrid) => {
  let n = 0;
  for (const c of g.d) if (c) n++;
  return n;
};
const lum = (g: TGrid, x: number, y: number) => stepOf(g.d[y * g.w + x]!);
const differ = (a: TGrid, b: TGrid) => {
  let n = 0;
  for (let i = 0; i < a.d.length; i++) if (a.d[i] !== b.d[i]) n++;
  return n;
};

describe('the cave palette', () => {
  it('is the town’s dusk with the cave’s ramps added, numbered clear of the town’s', () => {
    expect(CAVE_FIRST).toBeGreaterThan(MATS.length + 50);
    // Every town colour the same, so the hero is the same in a cave as at dusk in town.
    expect([...CAVE_DUSK.rgb.subarray(0, DUSK2.rgb.length)]).toEqual([...DUSK2.rgb]);
    const c = cell2('cavesand', 3);
    expect(matOf2(c)).toBe('cavesand');
    expect(c >> 3).toBeGreaterThanOrEqual(CAVE_FIRST);
    for (const pal of [CAVE_DUSK, CAVE_DAY]) {
      const at = c * 3;
      expect(pal.rgb[at]! + pal.rgb[at + 1]! + pal.rgb[at + 2]!).toBeGreaterThan(0);
    }
  });
});

describe('dungeon tiles at the C scale', () => {
  it('draws every kind the first scale has, and the upper face, at 24 x 24 with no holes', () => {
    expect(DUNGEON2_TILE).toBe(24);
    expect(TILE2_KINDS).toEqual([
      ...TILE_KINDS.slice(0, 5),
      'wall_face_high',
      ...TILE_KINDS.slice(5),
    ]);
    for (const kind of TILE2_KINDS)
      for (let v = 0; v < 30; v++) {
        const t = dungeonTile2(kind, v, undefined, { col: v, row: 3 })!;
        expect(t, kind).not.toBeNull();
        expect([t.grid.w, t.grid.h]).toEqual([24, 24]);
        expect(drawn(t.grid), kind).toBe(24 * 24);
      }
  });

  it('answers null for anything else, and the same tile for the same ask', () => {
    expect(dungeonTile2('lava')).toBeNull();
    expect(dungeonTile2('toString')).toBeNull();
    const a = dungeonTile2('sand', 7, undefined, { col: 2, row: 2 })!;
    const b = dungeonTile2('sand', 7, undefined, { col: 2, row: 2 })!;
    expect(a.grid).toBe(b.grid);
    for (const kind of TILE2_KINDS) expect(TILE2_WEARS[kind]).toBeGreaterThan(0);
  });

  it('keeps a wear’s detail off the tile’s edges, so every wear meets its neighbours as the plain tile does', () => {
    for (const kind of TILE2_KINDS)
      for (let w = 1; w < TILE2_WEARS[kind]; w++) {
        const at = { col: 5, row: 5 };
        const plain = dungeonTile2(kind, 0, undefined, at)!.grid;
        // Find the variant number that gives wear w (the door mixes variants).
        let worn: TGrid | null = null;
        for (let v = 0; v < 400 && !worn; v++) {
          const t = dungeonTile2(kind, v, undefined, at)!.grid;
          if (differ(t, plain) > 0) worn = t;
        }
        if (!worn) continue;
        for (let i = 0; i < 24; i++)
          for (const [x, y] of [
            [i, 0],
            [i, 23],
            [0, i],
            [23, i],
          ] as const)
            expect(worn.d[y * 24 + x], `${kind} wear at ${x},${y}`).toBe(plain.d[y * 24 + x]);
      }
  });

  it('tiles: a floor laid cell by cell shows no seam at the tiles’ edges, across and down', () => {
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
          const a = dungeonTile2(kind, row * 7 + col, undefined, { col, row })!.grid;
          const right = dungeonTile2(kind, row * 7 + col + 1, undefined, {
            col: col + 1,
            row,
          })!.grid;
          const below = dungeonTile2(kind, row * 7 + col + 7, undefined, {
            col,
            row: row + 1,
          })!.grid;
          for (let i = 0; i < 24; i++) {
            // Across the seam, the edge columns (and rows) of neighbours.
            seam += Math.abs(lum(a, 23, i) - lum(right, 0, i));
            seam += Math.abs(lum(a, i, 23) - lum(below, i, 0));
            // The same step taken inside a tile.
            inside += Math.abs(lum(a, 11, i) - lum(a, 12, i));
            inside += Math.abs(lum(a, i, 11) - lum(a, i, 12));
            n += 2;
          }
        }
      // The step from one tile into the next is no rougher than a step inside a tile.
      expect(seam / n, kind).toBeLessThan((inside / n) * 1.5 + 0.15);
    }
  });

  it('tiles: a row of faces runs on, its strata and tide mark at the same rows either side of each join', () => {
    for (const kind of ['wall_face', 'wall_face_high'])
      for (let col = 0; col < 8; col++) {
        const a = dungeonTile2(kind, col, undefined, { col, row: 1 })!.grid;
        const b = dungeonTile2(kind, col + 1, undefined, { col: col + 1, row: 1 })!.grid;
        let off = 0;
        for (let y = 0; y < 24; y++) if (matOf2(a.d[y * 24 + 23]!) !== matOf2(b.d[y * 24]!)) off++;
        expect(off, `${kind} ${col}`).toBeLessThanOrEqual(3);
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
    const depth = (col: number, x: number) => {
      const a = dungeonTile2('wet_sand', 0, around, { col, row: 5 })!.grid;
      const b = dungeonTile2('wet_sand', 0, bare, { col, row: 5 })!.grid;
      let d = 0;
      while (d < 24 && a.d[d * 24 + x] !== b.d[d * 24 + x]) d++;
      return d;
    };
    const depths: number[] = [];
    for (let col = 0; col < 6; col++) {
      expect(Math.abs(depth(col, 23) - depth(col + 1, 0)), `col ${col}`).toBeLessThanOrEqual(2);
      for (let x = 0; x < 24; x++) depths.push(depth(col, x));
    }
    expect(new Set(depths).size).toBeGreaterThan(3);
  });

  it('puts foam where land meets the water, and shade under a wall', () => {
    const shore = dungeonTile2(
      'shallows',
      1,
      { n: 'sand', s: 'shallows', e: 'shallows', w: 'shallows' },
      { col: 4, row: 4 },
    )!.grid;
    let foam = 0;
    for (const c of shore.d) if (matOf2(c) === 'shoal' && stepOf(c) <= 1) foam++;
    expect(foam).toBeGreaterThan(6);
    const open = dungeonTile2(
      'sand',
      3,
      { n: 'sand', s: 'sand', e: 'sand', w: 'sand' },
      { col: 9, row: 9 },
    )!.grid;
    const under = dungeonTile2(
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

describe('the cave’s light', () => {
  it('lifts the ground in a lantern’s pool, darkens it out of every light’s reach, and leaves lines alone', () => {
    const g = tgrid(240, 120);
    g.d.fill(cell2('cavesand', 3));
    g.d[0] = cell2('cavesand', 6);
    const lantern = dungeonProp2('lantern')!.light!;
    const lit = lightGround2(g, [lightAt(lantern, 100 - lantern.x, 20 - lantern.y)]);
    const at = (x: number, y: number) => stepOf(lit.d[y * lit.w + x]!);
    // Under the lantern, its drop below the flame: lifted.
    expect(at(100, 20 + lantern.drop)).toBeLessThan(3);
    // Far off: darker.
    expect(at(235, 115)).toBeGreaterThan(3);
    expect(at(0, 0)).toBe(6);
    // Pure: the same light, the same picture, and the ground given is not touched.
    expect(lightGround2(g, [lightAt(lantern, 100 - lantern.x, 20 - lantern.y)]).d).toEqual(lit.d);
    expect(stepOf(g.d[100]!)).toBe(3);
  });

  it('gives the lantern a light and a glow that agree', () => {
    const p = dungeonProp2('lantern')!;
    expect(p.picture.glows).toHaveLength(1);
    expect(p.light!.x).toBe(p.picture.glows[0]!.x);
    expect(p.light!.y).toBe(p.picture.glows[0]!.y);
    expect(p.light!.pool).toBeGreaterThan(24);
  });
});

describe('dungeon props at the C scale', () => {
  it('draws every prop the first scale has and lane C’s crate and perch, standing on their base', () => {
    expect(PROP2_IDS).toEqual(expect.arrayContaining([...PROP_IDS, ...LANE_C_PROPS]));
    for (const id of [...PROP_IDS, ...LANE_C_PROPS]) {
      const p = dungeonProp2(id)!;
      expect(p, id).not.toBeNull();
      expect(p.base, id).toBeLessThan(p.picture.grid.h);
      expect(p.base, id).toBeGreaterThan(p.picture.grid.h / 3);
      expect(p.foot, id).toBeGreaterThan(0);
      expect(p.foot, id).toBeLessThan(p.picture.grid.w);
      expect(drawn(p.picture.grid), id).toBeGreaterThan(60);
    }
    expect(dungeonProp2('perch')!.seat).toBeDefined();
    expect(dungeonProp2('nothing')).toBeNull();
    expect(dungeonPropSprite2('nothing')).toBeNull();
  });

  it('draws the brig’s bars a tile wide and two metres tall', () => {
    const bars = dungeonProp2('brig_bars')!.picture.grid;
    expect(bars.w).toBe(26);
    expect(bars.h).toBeGreaterThanOrEqual(76);
  });
});

describe('every foe at the C scale', () => {
  it('covers every foe the first scale draws and every monster in the tables, the bounty-only ones too', () => {
    expect(GROTTO2_IDS).toEqual(FOE_IDS);
    const monsters = Object.keys(MONSTERS);
    expect(monsters).toContain('goblin_poacher');
    expect(monsters).toContain('bramble_wyrm');
    expect([...MONSTER2_IDS].sort()).toEqual([...monsters].sort());
    expect(new Set(FOE2_IDS)).toEqual(new Set([...FOE_IDS, ...monsters]));
    for (const id of FOE_IDS) expect(foePicture(id), id).not.toBeNull();
  });

  it('draws every foe in every pose and frame, facing both ways, standing on its feet', () => {
    for (const id of FOE2_IDS) {
      const counts = foeFrames2(id)!;
      expect(counts, id).not.toBeNull();
      for (const pose of FOE2_POSES) {
        expect(counts[pose], `${id} ${pose}`).toBeGreaterThanOrEqual(1);
        for (let f = 0; f < counts[pose]; f++)
          for (const phase of id === 'brinebeard' ? [1, 2, 3] : [1]) {
            const right = foePicture2(id, pose, 'right', f, phase)!;
            const left = foePicture2(id, pose, 'left', f, phase)!;
            const { w, h } = right.picture.grid;
            expect(right.feet.x, `${id} ${pose} ${f}`).toBeGreaterThanOrEqual(0);
            expect(right.feet.x).toBeLessThan(w);
            expect(right.feet.y).toBeLessThan(h);
            expect(drawn(right.picture.grid), `${id} ${pose} ${f}`).toBeGreaterThan(80);
            // Left is the exact mirror, feet and glows with it.
            expect(left.feet).toEqual({ x: w - 1 - right.feet.x, y: right.feet.y });
            for (let y = 0; y < h; y += 3)
              for (let x = 0; x < w; x++)
                expect(left.picture.grid.d[y * w + x]).toBe(
                  right.picture.grid.d[y * w + (w - 1 - x)],
                );
            right.picture.glows.forEach((g, i) => expect(left.picture.glows[i]!.x).toBe(w - g.x));
          }
      }
    }
  });

  it('stands every foe on its feet: something drawn on the row just above them, standing', () => {
    for (const id of FOE2_IDS) {
      if (id === 'ships_parrot') continue;
      for (const pose of ['idle', 'windup', 'strike', 'hurt'] as const) {
        const p = foePicture2(id, pose)!;
        const g = p.picture.grid;
        let low = -1;
        for (let i = 0; i < g.d.length; i++) if (g.d[i]) low = Math.floor(i / g.w);
        expect(low, `${id} ${pose}`).toBeGreaterThanOrEqual(p.feet.y - 1);
        expect(low, `${id} ${pose}`).toBeLessThanOrEqual(p.feet.y);
      }
    }
  });

  it('makes each pose its own picture: the wind-up, the blow, the recoil and its flash, and the fall', () => {
    for (const id of FOE2_IDS) {
      const idle = foePicture2(id, 'idle')!.picture.grid;
      const shown = FOE2_POSES.filter((p) => p !== 'idle' && p !== 'walk').map(
        (p) => [p, foePicture2(id, p)!.picture.grid] as const,
      );
      for (const [pose, g] of shown)
        if (g.w === idle.w && g.h === idle.h)
          expect(differ(g, idle), `${id} ${pose}`).toBeGreaterThan(30);
      const hurt = foePicture2(id, 'hurt')!.picture.grid;
      const flash = foePicture2(id, 'flash')!.picture.grid;
      // The flash is the recoil, lit: the same shape, every step lighter or kept.
      for (let i = 0; i < hurt.d.length; i++) {
        expect(!!flash.d[i]).toBe(!!hurt.d[i]);
        if (hurt.d[i]) expect(stepOf(flash.d[i]!)).toBeLessThanOrEqual(stepOf(hurt.d[i]!));
      }
      // Down at the end of the fall: lower than standing.
      const counts = foeFrames2(id)!;
      const down = foePicture2(id, 'fall', 'right', counts.fall - 1)!;
      let top = 0;
      while (
        top < down.picture.grid.h &&
        !down.picture.grid.d
          .slice(top * down.picture.grid.w, (top + 1) * down.picture.grid.w)
          .some(Boolean)
      )
        top++;
      expect(down.feet.y - top, id).toBeLessThanOrEqual(FOE2_SIZES[id]!.tall);
      expect(down.picture.grid, id).not.toEqual(idle);
    }
  });

  it('stands people on the hero’s canvas and anchor, a head shorter for the powder monkey', () => {
    for (const id of PEOPLE) {
      const p = foePicture2(id)!;
      expect([p.picture.grid.w, p.picture.grid.h, p.feet.x, p.feet.y], id).toEqual([
        56, 72, 28, 70,
      ]);
    }
    const eyes = (id: string) => {
      const g = foePicture2(id)!.picture.grid;
      for (let i = 0; i < g.d.length; i++)
        if (matOf2(g.d[i]!) === 'eye') return Math.floor(i / g.w);
      return 0;
    };
    expect(eyes('powder_monkey') - eyes('deckhand')).toBeGreaterThanOrEqual(8);
  });

  it('lights the powder monkey’s fuse while he holds his keg, and not once it is thrown', () => {
    expect(foePicture2('powder_monkey', 'idle')!.picture.glows.length).toBe(1);
    expect(foePicture2('powder_monkey', 'strike')!.picture.glows.length).toBe(0);
  });

  it('makes the captain’s three phases plainly different pictures, a head and more over the hero', () => {
    const g = [1, 2, 3].map(
      (ph) => foePicture2('brinebeard', 'idle', 'right', 0, ph)!.picture.grid,
    );
    for (const [a, b] of [
      [0, 1],
      [1, 2],
      [0, 2],
    ] as const)
      expect(differ(g[a]!, g[b]!), `${a + 1} and ${b + 1}`).toBeGreaterThan(600);
    expect(FOE2_SIZES.brinebeard!.tall).toBeGreaterThan(80);
  });

  it('declares every foe’s sizes as data, and the data matches the drawings', () => {
    expect(Object.keys(FOE2_SIZES).sort()).toEqual([...FOE2_IDS].sort());
    for (const id of FOE2_IDS) {
      expect(FOE2_SIZES[id], id).toEqual(measureFoe2(id));
      const s = foeSize2(id)!;
      const p = foePicture2(id)!;
      expect([s.w, s.h], id).toEqual([p.picture.grid.w, p.picture.grid.h]);
      expect(s.anchor, id).toEqual(p.feet);
      expect(s.box.w, id).toBeLessThanOrEqual(s.front + s.back + 1);
    }
    expect(foeSize2('nobody')).toBeNull();
  });

  it('answers null for anything else', () => {
    expect(foePicture2('dragon')).toBeNull();
    expect(foePicture2('toString')).toBeNull();
    expect(foePicture2('deckhand', 'dance' as never)).toBeNull();
    expect(foeFrames2('dragon')).toBeNull();
    expect(foeSprite2('dragon')).toBeNull();
  });
});

describe('the sample rooms', () => {
  it('re-cuts the grotto’s rooms at about 32 x 12 tiles, every row as wide, at every state of the tide', () => {
    for (const rows of [POOLS2, STORE2]) {
      expect(rows).toHaveLength(12);
      for (const r of rows) expect(r).toHaveLength(32);
      for (const level of [0, 1, 2, 3]) expect(roomAtTide(rows, level).join('')).not.toContain('2');
    }
    const pic = poolsRoom2();
    expect([pic.grid.w, pic.grid.h]).toEqual([32 * 24, 12 * 24]);
    expect(pic.glows.length).toBeGreaterThanOrEqual(2);
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

  it('declares each face’s safe box as data, inside the square, and holds every face, hat, ear and horn inside it', () => {
    expect(Object.keys(PORTRAIT2_SAFE).sort()).toEqual([...PORTRAIT2_IDS].sort());
    for (const id of PORTRAIT2_IDS) {
      const S = PORTRAIT2_SAFE[id]!;
      expect(S, id).toEqual(measureSafe2(id));
      expect(S.x >= 0 && S.y >= 0 && S.x + S.w <= 72 && S.y + S.h <= SHOULDERS, id).toBe(true);
      const g = portraitBust2(id)!;
      for (let y = 0; y < SHOULDERS; y++)
        for (let x = 0; x < g.w; x++)
          if (g.d[y * g.w + x])
            expect(
              x >= S.x && x < S.x + S.w && y >= S.y && y < S.y + S.h,
              `${id} at ${x},${y}`,
            ).toBe(true);
      // The eyes are inside it, well clear of its edges.
      let eyes = 0;
      for (let y = 0; y < SHOULDERS; y++)
        for (let x = 0; x < g.w; x++) if (matOf2(g.d[y * g.w + x]!) === 'eye') eyes++;
      expect(eyes, id).toBeGreaterThan(0);
    }
  });

  it('holds the hero’s face inside the hero’s safe box in every hairstyle and head gear', () => {
    const S = HERO_PORTRAIT2_SAFE;
    for (const style of ['short', 'long', 'braid', 'shaggy', 'bald'] as const)
      for (const head of [null, ...HEADGEAR2.map((g) => g.id)]) {
        const b = faceBox(
          heroBust2Grid({ skin: 'skin', hair: 'hair', style, head, body: null, neck: null }),
        );
        expect(
          b.x >= S.x && b.y >= S.y && b.x + b.w <= S.x + S.w && b.y + b.h <= S.y + S.h,
          `${style} ${head}`,
        ).toBe(true);
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
      expect(canvases.map((c) => parseFloat(c.style.width))).toEqual([144, 96, 48]);
      expect(canvases.map((c) => parseFloat(c.style.height))).toEqual([144, 96, 48]);
    } finally {
      if (was) Object.defineProperty(window, 'devicePixelRatio', was);
      else delete (window as { devicePixelRatio?: number }).devicePixelRatio;
    }
  });

  it('draws the hero in the look and the head gear worn, never throwing', () => {
    const plain = heroPortraitPicture2({}, []);
    const helmed = heroPortraitPicture2({}, ['iron_helmet']);
    const dark = heroPortraitPicture2({ skin: 'deep', hairColour: 'grey' }, []);
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
    expect(foePicture('goblin_poacher')).toBeNull();
    expect(dungeonTile('grotto', 'sand', 3)!.grid.w).toBe(16);
    expect(dungeonProp('grotto', 'lantern')!.base).toBe(23);
    expect(dungeonProp('grotto', 'crate')).toBeNull();
    expect(PORTRAIT_SIZE).toBe(48);
    expect(portrait('goblin_poacher')).toBeNull();
  });
});

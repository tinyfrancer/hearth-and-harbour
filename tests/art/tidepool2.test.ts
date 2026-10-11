import { describe, expect, it, vi } from 'vitest';
import {
  CAVE_DUSK,
  CAVE_TIDEPOOL,
  DUNGEON2_THEMES,
  dungeonDoor2,
  dungeonProp2,
  dungeonTheme2,
  dungeonTile2,
  foeFrames2,
  foePicture2,
  FOE2_IDS,
  FOE2_POSES,
  FOE2_SIZES,
  lightGround2,
  PROP2_IDS,
  TIDEPOOL2_IDS,
  TIDEPOOL2_PROP_IDS,
  TILE2_KINDS,
  TILE2_WEARS,
} from '../../src/art/dungeonArt2';
import { portraitPicture2, PORTRAIT2_SAFE } from '../../src/art/portraits2';
import { measureSafe2 } from '../../src/art/dungeon2/safe';
import { roomGround2, roomKinds2, aroundOf } from '../../src/art/dungeon2/room';
import { POOLS2, STORE2, roomAtTide, TIDE2 } from '../../src/art/dungeon2/sample';
import { DAY2 } from '../../src/art/town2/ramps';
import { matOf, stepOf, type TGrid } from '../../src/art/town2/cells';
import { matOf as caveMatOf } from '../../src/art/dungeon2/cave';
import { activityHitFrame2, ACTIVITY2_IDS, STRIKE2_HIT_FRAME } from '../../src/art/character2';

vi.setConfig({ testTimeout: 60_000 });

class Hash {
  h = 0x811c9dc5;
  add(d: ArrayLike<number>): this {
    for (let i = 0; i < d.length; i++) {
      this.h ^= d[i]! & 0xffff;
      this.h = Math.imul(this.h, 0x01000193);
    }
    return this;
  }
  get hex(): string {
    return (this.h >>> 0).toString(16);
  }
}
const hashOf = (d: ArrayLike<number>) => new Hash().add(d).hex;

/** The grotto's ids before B15, copied here on purpose (the theme must not touch them). */
const GROTTO_PROPS = [
  'powder_keg',
  'crate',
  'treasure_chest',
  'brig_bars',
  'lantern',
  'anchor',
  'rope_coil',
  'cannon',
  'perch',
  'loot_pile',
];

describe('Old Snapper, the tide-pool cave’s boss (B15)', () => {
  it('is a foe of the tide-pool cave’s cast, with every pose, both ways, and its sizes as data', () => {
    expect(TIDEPOOL2_IDS).toEqual(['dock_rat', 'sand_crab', 'old_snapper']);
    expect(FOE2_IDS).toContain('old_snapper');
    const counts = foeFrames2('old_snapper')!;
    expect(counts).toEqual({ idle: 2, walk: 4, windup: 1, strike: 1, hurt: 1, flash: 1, fall: 2 });
    for (const pose of FOE2_POSES)
      for (let f = 0; f < counts[pose]; f++) {
        const r = foePicture2('old_snapper', pose, 'right', f)!;
        const l = foePicture2('old_snapper', pose, 'left', f)!;
        expect(l.feet.x, `${pose} ${f}`).toBe(r.picture.grid.w - 1 - r.feet.x);
      }
    expect(FOE2_SIZES.old_snapper).toBeDefined();
  });

  it('stands tight to his feet: a hero at the melee stand is not drawn over him', () => {
    const s = FOE2_SIZES.old_snapper!;
    const MELEE_STAND = 36;
    const HERO_BACK = 13;
    const ALLOWED = 4;
    // Standing, walking: what is drawn ahead of his feet clears a hero at the stand.
    expect(s.front + HERO_BACK - MELEE_STAND).toBeLessThanOrEqual(ALLOWED);
    for (let f = 0; f < 4; f++) {
      const p = foePicture2('old_snapper', 'walk', 'right', f)!;
      const g = p.picture.grid;
      let x1 = 0;
      for (let i = 0; i < g.d.length; i++) if (g.d[i]) x1 = Math.max(x1, i % g.w);
      expect(x1 - p.feet.x + HERO_BACK - MELEE_STAND, `walk ${f}`).toBeLessThanOrEqual(ALLOWED + 1);
    }
    // His snap reaches well past the stand: the blow plainly lands.
    expect(s.strike).toBeGreaterThan(MELEE_STAND + 6);
    // Big, but no taller than the hero: a level-1 boss.
    expect(s.tall).toBeGreaterThan(36);
    expect(s.tall).toBeLessThan(56);
  });

  it('telegraphs his snap plainly: rearing, the jaws gaping pink, the head high', () => {
    const idle = foePicture2('old_snapper', 'idle')!.picture.grid;
    const windup = foePicture2('old_snapper', 'windup')!.picture.grid;
    const pink = (g: TGrid) => Array.from(g.d).filter((c) => caveMatOf(c) === 'anemone').length;
    expect(pink(idle)).toBe(0);
    expect(pink(windup)).toBeGreaterThan(30);
    const top = (g: TGrid) => {
      for (let i = 0; i < g.d.length; i++) if (g.d[i]) return Math.floor(i / g.w);
      return g.h;
    };
    // The rear lifts his front: something drawn higher than standing.
    expect(top(windup)).toBeLessThan(top(idle));
  });

  it('has a hand-drawn face with its safe box', () => {
    expect(portraitPicture2('old_snapper')).not.toBeNull();
    expect(PORTRAIT2_SAFE.old_snapper).toEqual(measureSafe2('old_snapper'));
  });
});

describe('foes on their canvases (B15)', () => {
  it('ends anything drawn on a frame’s edge in its outline, so nothing runs on past the canvas', () => {
    for (const id of FOE2_IDS) {
      const counts = foeFrames2(id)!;
      for (const pose of FOE2_POSES)
        for (let f = 0; f < counts[pose]; f++) {
          const g = foePicture2(id, pose, 'right', f)!.picture.grid;
          for (let y = 0; y < g.h; y++)
            for (let x = 0; x < g.w; x++) {
              if (x > 0 && y > 0 && x < g.w - 1 && y < g.h - 1) continue;
              const c = g.d[y * g.w + x]!;
              if (c) expect(stepOf(c), `${id} ${pose} ${f} (${x}, ${y})`).toBe(6);
            }
        }
    }
  });
});

describe('dungeon themes (B15)', () => {
  it('names two looks, the grotto the default for every door', () => {
    expect(DUNGEON2_THEMES).toEqual(['grotto', 'tidepool']);
    expect(dungeonTheme2().theme).toBe('grotto');
    expect(dungeonTheme2('nonsense').theme).toBe('grotto');
    expect(dungeonTheme2('tidepool').palette).toBe(CAVE_TIDEPOOL);
    expect(dungeonTheme2('grotto').palette).toBe(CAVE_DUSK);
    expect(dungeonTheme2('tidepool').figureTime).toBe('day');
  });

  it('leaves the grotto exactly as it was before themes (hashed from main)', () => {
    const tiles = new Hash();
    for (const k of TILE2_KINDS)
      for (let w = 0; w < TILE2_WEARS[k]; w++) {
        if (k.startsWith('door')) continue;
        const a = dungeonTile2(k, w)!.grid;
        const b = dungeonTile2(k, w, undefined, undefined, 'grotto')!.grid;
        expect(b.d, k).toEqual(a.d);
        tiles.add(a.d);
      }
    expect(tiles.hex).toBe('8faf45c3');
    const rooms = new Hash();
    const lit = new Hash();
    for (const rows of [POOLS2, STORE2])
      for (const lvl of [0, 1, 2, 3]) {
        const r = roomGround2(roomAtTide(rows, lvl).map((row) => row.replace(/[SZOD]/g, '#')));
        rooms.add(r.grid.d);
        lit.add(
          lightGround2(r.grid, [
            { x: 100, y: 30, radius: 66, strength: 0.5, drop: 46, pool: 70, flicker: 0 },
          ]).d,
        );
      }
    expect(rooms.hex).toBe('30004be8');
    expect(lit.hex).toBe('83b53174');
    const props = new Hash();
    for (const id of GROTTO_PROPS) props.add(dungeonProp2(id)!.picture.grid.d);
    expect(props.hex).toBe('2fc45ef');
    const doors = new Hash();
    for (const k of ['door_barred', 'door_side_barred', 'door_open'])
      for (const west of [false, true]) {
        const around = west ? { w: 'sand', e: null } : { e: 'sand', w: null };
        doors.add(dungeonDoor2(k, around, { col: 5, row: 3 })!.picture.grid.d);
      }
    expect(doors.hex).toBe('6dd7bc91');
    // Every colour the grotto had as it was: the town's and the cave's; new ramps only appended.
    expect(hashOf(CAVE_DUSK.rgb.subarray(0, 1560))).toBe('11bd6cb8');
    expect(hashOf(CAVE_DUSK.rgb.subarray(400 * 24, 411 * 24))).toBe('7186852');
  });

  it('draws every tile kind in the tide-pool look, on the same 24-pixel cells, never the grotto’s', () => {
    for (const k of TILE2_KINDS) {
      const t = dungeonTile2(k, 3, undefined, { col: 4, row: 4 }, 'tidepool')!.grid;
      const g = dungeonTile2(k, 3, undefined, { col: 4, row: 4 })!.grid;
      expect([t.w, t.h], k).toEqual([24, 24]);
      expect(
        t.d.every((c) => c !== 0),
        k,
      ).toBe(true);
      let same = 0;
      for (let i = 0; i < t.d.length; i++) if (t.d[i] === g.d[i]) same++;
      expect(same, k).toBeLessThan(t.d.length / 4);
    }
  });

  it('tiles: a tide-pool floor laid cell by cell shows no seam at the tiles’ edges', () => {
    for (const kind of ['sand', 'wet_sand', 'rock_floor', 'shallows', 'deep_water'] as const) {
      // Steps either side of a tile's edge differ no more than steps inside a tile do.
      let across = 0;
      let inside = 0;
      let nA = 0;
      let nI = 0;
      for (let col = 0; col < 4; col++)
        for (let row = 0; row < 3; row++) {
          const a = dungeonTile2(kind, col * 7 + row, undefined, { col, row }, 'tidepool')!.grid;
          const b = dungeonTile2(
            kind,
            col * 7 + row + 1,
            undefined,
            { col: col + 1, row },
            'tidepool',
          )!.grid;
          for (let y = 0; y < 24; y++) {
            if (matOf(a.d[y * 24 + 23]!) === matOf(b.d[y * 24]!)) {
              across += Math.abs(stepOf(a.d[y * 24 + 23]!) - stepOf(b.d[y * 24]!));
              nA++;
            }
            inside += Math.abs(stepOf(a.d[y * 24 + 11]!) - stepOf(a.d[y * 24 + 12]!));
            nI++;
          }
        }
      expect(across / nA, kind).toBeLessThanOrEqual(inside / nI + 0.35);
    }
  });

  it('keeps the doors’ footprints, lights an open way by day, and leaves a barred one dark', () => {
    for (const kind of ['door_side_open', 'door_side_barred', 'door_open', 'door_barred']) {
      const g = dungeonDoor2(kind, { e: 'sand', w: null }, { col: 2, row: 4 })!;
      const t = dungeonDoor2(kind, { e: 'sand', w: null }, { col: 2, row: 4 }, 'tidepool')!;
      expect([t.picture.grid.w, t.picture.grid.h, t.dx, t.dy], kind).toEqual([
        g.picture.grid.w,
        g.picture.grid.h,
        g.dx,
        g.dy,
      ]);
      expect(t.covers, kind).toEqual(g.covers);
      if (kind.includes('open')) {
        expect(t.light, kind).toBeDefined();
        expect(t.picture.glows.length, kind).toBeGreaterThan(0);
        for (const glow of t.picture.glows) expect(glow.always, kind).toBe(true);
      } else expect(t.picture.glows, kind).toEqual([]);
    }
  });

  it('gives the open side door’s passage a rock surround past the room’s edge, unlike the barred one', () => {
    for (const theme of DUNGEON2_THEMES) {
      const open = dungeonDoor2(
        'door_side_open',
        { e: 'sand', w: null },
        { col: 2, row: 4 },
        theme,
      )!;
      const shut = dungeonDoor2(
        'door_side_barred',
        { e: 'sand', w: null },
        { col: 2, row: 4 },
        theme,
      )!;
      const W = open.picture.grid.w;
      // In the column beyond the room (x < 24), the rock just above and below the passage differs.
      for (let x = 2; x < 22; x++) {
        const pinch = Math.round((24 - x) / 8);
        for (const y of [14 + pinch - 1, 14 + pinch - 5, 57 - pinch + 1, 57 - pinch + 5])
          expect(open.picture.grid.d[y * W + x], `${theme} (${x}, ${y})`).not.toBe(
            shut.picture.grid.d[y * W + x],
          );
      }
    }
  });

  it('lights a tide-pool room by day: nothing darkened near a light, a shaft lifts the floor', () => {
    const r = roomGround2(TIDE2, 'tidepool');
    const shaft = dungeonProp2('light_shaft')!;
    const L = { ...shaft.light!, x: 120, y: 120 };
    const lit = lightGround2(r.grid, [L], 'tidepool');
    const dusk = lightGround2(r.grid, [L]);
    let lifted = 0;
    let darker = 0;
    let darkerAtDusk = 0;
    for (let i = 0; i < r.grid.d.length; i++) {
      if (stepOf(lit.d[i]!) < stepOf(r.grid.d[i]!)) lifted++;
      const x = i % r.grid.w;
      const y = Math.floor(i / r.grid.w);
      const near = Math.hypot(x - 120, (y - 120) / 0.62) < L.pool * 2.5;
      if (near && stepOf(lit.d[i]!) > stepOf(r.grid.d[i]!)) darker++;
      if (near && stepOf(dusk.d[i]!) > stepOf(r.grid.d[i]!)) darkerAtDusk++;
    }
    expect(lifted).toBeGreaterThan(400);
    // Out to two and a half pools nothing is darkened by day; the grotto's rule darkens it.
    expect(darker).toBe(0);
    expect(darkerAtDusk).toBeGreaterThan(1000);
  });

  it('draws the tide-pool props, standing on their base, the shaft and the cave mouth giving daylight', () => {
    expect(PROP2_IDS).toEqual(expect.arrayContaining([...GROTTO_PROPS, ...TIDEPOOL2_PROP_IDS]));
    expect(TIDEPOOL2_PROP_IDS).toEqual([
      'rock_pool',
      'kelp_clump',
      'starfish_cluster',
      'anemone_rock',
      'driftwood',
      'boat_ribs',
      'cave_mouth',
      'light_shaft',
    ]);
    for (const id of TIDEPOOL2_PROP_IDS) {
      const p = dungeonProp2(id)!;
      expect(p.base, id).toBeLessThanOrEqual(p.picture.grid.h);
      expect(p.base, id).toBeGreaterThan(p.picture.grid.h / 3);
      expect(p.foot, id).toBeGreaterThan(0);
      expect(p.foot, id).toBeLessThan(p.picture.grid.w);
    }
    for (const id of ['light_shaft', 'cave_mouth']) {
      const p = dungeonProp2(id)!;
      expect(p.light, id).toBeDefined();
      expect(p.picture.glows.length, id).toBeGreaterThan(0);
      for (const g of p.picture.glows) expect(g.always, id).toBe(true);
    }
    // The cave mouth stands three tiles tall, like a door.
    expect(dungeonProp2('cave_mouth')!.picture.grid.h).toBeGreaterThanOrEqual(72);
  });

  it('paints by day: every town colour the town’s by day, so the hero and foes read as in the sun', () => {
    expect([...CAVE_TIDEPOOL.rgb.subarray(0, DAY2.rgb.length)]).toEqual([...DAY2.rgb]);
    expect(CAVE_TIDEPOOL.lightsOn).toBe(false);
  });

  it('lays a tide-pool room out on the grotto’s kinds: the same rows, the same kinds', () => {
    const kinds = roomKinds2(TIDE2);
    for (let row = 0; row < kinds.length; row++)
      for (let col = 0; col < kinds[0]!.length; col++) {
        const k = kinds[row]![col]!;
        expect(
          dungeonTile2(k, 0, aroundOf(kinds, col, row), { col, row }, 'tidepool'),
        ).not.toBeNull();
      }
  });
});

describe('where the work lands (B15, for lane A)', () => {
  it('gives each loop’s contact frame, the blow’s for combat, none for the breath', () => {
    expect(activityHitFrame2('woodcutting')).toBe(2);
    expect(activityHitFrame2('fletching')).toBe(2);
    expect(activityHitFrame2('melee')).toBe(STRIKE2_HIT_FRAME);
    expect(activityHitFrame2('vitality')).toBeNull();
    expect(activityHitFrame2('nonsense')).toBeNull();
    for (const id of ACTIVITY2_IDS)
      if (id !== 'vitality') expect(activityHitFrame2(id), id).not.toBeNull();
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  BURROW2_LIGHT,
  burrowLevel2,
  burrowNight,
  BURROW_NIGHT_LEVELS,
  CAVE_BURROW,
  CAVE_BURROW_DARK,
  CAVE_DUSK,
  CAVE_TIDEPOOL,
  dungeonDoor2,
  dungeonProp2,
  dungeonTheme2,
  dungeonTile2,
  foePicture2,
  FUNGUS2_RGB,
  lightGround2,
  NIGHT_EXEMPT,
  TILE2_KINDS,
  TILE2_WEARS,
} from '../../src/art/dungeonArt2';
import { roomGround2 } from '../../src/art/dungeon2/room';
import { TIDE2 } from '../../src/art/dungeon2/sample';
import { HOLLOW_ROWS } from '../../src/art/dungeon2/burrowSample';
import { CAVE_MATS, cell, matOf as caveMatOf } from '../../src/art/dungeon2/cave';
import { MATS } from '../../src/art/town2/ramps';
import { matOf, stepOf } from '../../src/art/town2/cells';

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

/** Every prop and foe the tide-pool cave and the grotto had before B20, copied on purpose. */
const PROPS_BEFORE = [
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
  'rock_pool',
  'kelp_clump',
  'starfish_cluster',
  'anemone_rock',
  'driftwood',
  'boat_ribs',
  'cave_mouth',
  'light_shaft',
];
const FOES_BEFORE = [
  'dock_rat',
  'sand_crab',
  'smuggler',
  'deckhand',
  'powder_monkey',
  'giant_crab',
  'ships_parrot',
  'brinebeard',
  'thieving_gull',
  'bramble_boar',
  'footpad',
  'grey_wolf',
  'marsh_troll',
  'goblin_poacher',
  'bramble_wyrm',
  'old_snapper',
  'brigand',
  'black_bear',
  'hobgoblin',
  'dire_wolf',
  'hill_ogre',
  'briar_hag',
  'moss_golem',
];

const lum = (rgb: Uint8Array, c: number) =>
  0.299 * rgb[c * 3]! + 0.587 * rgb[c * 3 + 1]! + 0.114 * rgb[c * 3 + 2]!;

/** Every material's id in the cells (town and cave), for walking a palette. */
const ALL_MATS = [...MATS, ...CAVE_MATS] as const;

describe('Thistlewood Burrow’s look (B20)', () => {
  it('is a theme: `burrow`, painted in its own palette at dusk', () => {
    const art = dungeonTheme2('burrow');
    expect(art.theme).toBe('burrow');
    expect(art.palette).toBe(CAVE_BURROW);
    expect(art.figureTime).toBe('dusk');
    // In the light its colours are the dungeon's dusk, so the hero and figures read as at dusk.
    expect([...CAVE_BURROW.rgb]).toEqual([...CAVE_DUSK.rgb]);
  });

  it('leaves the tide-pool cave and every older prop and foe exactly as on main (hashed from main)', () => {
    const tiles = new Hash();
    for (const k of TILE2_KINDS)
      for (let w = 0; w < TILE2_WEARS[k]; w++)
        for (const at of [undefined, { col: 3, row: 2 }])
          tiles.add(dungeonTile2(k, w, { n: 'sand', e: null }, at, 'tidepool')!.grid.d);
    expect(tiles.hex).toBe('c4b6763f');
    const doors = new Hash();
    for (const k of ['door_barred', 'door_side_barred', 'door_open', 'door_side_open'])
      for (const west of [false, true]) {
        const around = west ? { w: 'sand', e: null } : { e: 'sand', w: null };
        doors.add(dungeonDoor2(k, around, { col: 5, row: 3 }, 'tidepool')!.picture.grid.d);
        doors.add(dungeonDoor2(k, around, { col: 5, row: 3 })!.picture.grid.d);
      }
    expect(doors.hex).toBe('db5f567');
    const props = new Hash();
    for (const id of PROPS_BEFORE) props.add(dungeonProp2(id)!.picture.grid.d);
    expect(props.hex).toBe('441815a5');
    const room = roomGround2(TIDE2, 'tidepool');
    expect(new Hash().add(room.grid.d).hex).toBe('9f45be29');
    expect(new Hash().add(lightGround2(room.grid, room.lights, 'tidepool').d).hex).toBe('2b932dbf');
    const foes = new Hash();
    for (const id of FOES_BEFORE) foes.add(foePicture2(id, 'strike', 'left', 0, 1)!.picture.grid.d);
    expect(foes.hex).toBe('29a5181d');
    expect(new Hash().add(CAVE_TIDEPOOL.rgb.subarray(0, 423 * 24)).hex).toBe('e952ca0');
  });

  it('draws every tile kind in its own look on the same 24-pixel cells, never the grotto’s', () => {
    for (const k of TILE2_KINDS) {
      const b = dungeonTile2(k, 3, undefined, { col: 4, row: 4 }, 'burrow')!.grid;
      // A door's tile is the slice of its piece over its cell: lit from beyond in the lamp's own
      // steps, as every theme's (its piece is held below).
      if (k.startsWith('door_')) {
        expect([b.w, b.h], k).toEqual([24, 24]);
        continue;
      }
      const g = dungeonTile2(k, 3, undefined, { col: 4, row: 4 })!.grid;
      expect([b.w, b.h], k).toEqual([24, 24]);
      expect(
        b.d.every((c) => c !== 0),
        k,
      ).toBe(true);
      let same = 0;
      for (let i = 0; i < b.d.length; i++) if (b.d[i] === g.d[i]) same++;
      expect(same, k).toBeLessThan(b.d.length / 4);
    }
  });

  it('builds its walls of earth, roots and timber, its floors of earth, litter, moss and flags', () => {
    const mats = (kind: string) => {
      const seen = new Set<string>();
      for (let col = 0; col < 40; col++)
        for (const c of dungeonTile2(kind, col, undefined, { col, row: 0 }, 'burrow')!.grid.d)
          seen.add(caveMatOf(c) ?? '');
      return seen;
    };
    const face = new Set([...mats('wall_face'), ...mats('wall_face_high')]);
    for (const m of ['soil', 'clay', 'root', 'wood', 'glowcap']) expect(face, m).toContain(m);
    expect(mats('rock_floor')).toContain('soil');
    expect(mats('rock_floor')).toContain('moss');
    expect(mats('sand')).toContain('litter');
    expect(mats('wet_sand')).toContain('moss');
    expect(mats('planks')).toContain('flag');
    // Floors never red or orange: warnings and loot must stand out on them.
    for (const k of ['rock_floor', 'sand', 'wet_sand', 'planks'])
      for (const m of ['crimson', 'crab', 'fire', 'ember', 'madder', 'hobgob'])
        expect(mats(k), `${k} ${m}`).not.toContain(m);
  });

  it('tiles: a burrow floor laid cell by cell shows no seam at the tiles’ edges', () => {
    for (const kind of ['sand', 'wet_sand', 'rock_floor', 'planks', 'wall_top'] as const) {
      let across = 0;
      let inside = 0;
      let nA = 0;
      let nI = 0;
      for (let col = 0; col < 4; col++)
        for (let row = 0; row < 3; row++) {
          const a = dungeonTile2(kind, col * 7 + row, undefined, { col, row }, 'burrow')!.grid;
          const b = dungeonTile2(
            kind,
            col * 7 + row + 1,
            undefined,
            { col: col + 1, row },
            'burrow',
          )!.grid;
          const c = dungeonTile2(
            kind,
            col * 7 + row + 2,
            undefined,
            { col, row: row + 1 },
            'burrow',
          )!.grid;
          for (let i = 0; i < 24; i++) {
            if (matOf(a.d[i * 24 + 23]!) === matOf(b.d[i * 24]!)) {
              across += Math.abs(stepOf(a.d[i * 24 + 23]!) - stepOf(b.d[i * 24]!));
              nA++;
            }
            if (matOf(a.d[23 * 24 + i]!) === matOf(c.d[i]!)) {
              across += Math.abs(stepOf(a.d[23 * 24 + i]!) - stepOf(c.d[i]!));
              nA++;
            }
            inside += Math.abs(stepOf(a.d[i * 24 + 11]!) - stepOf(a.d[i * 24 + 12]!));
            inside += Math.abs(stepOf(a.d[11 * 24 + i]!) - stepOf(a.d[12 * 24 + i]!));
            nI += 2;
          }
        }
      expect(across / nA, kind).toBeLessThanOrEqual(inside / nI + 0.35);
    }
    // A wall's two faces meet with no seam either: the lower's top row runs on from the upper's foot.
    let jump = 0;
    let n = 0;
    for (let col = 0; col < 12; col++) {
      const hi = dungeonTile2('wall_face_high', col, undefined, { col, row: 0 }, 'burrow')!.grid;
      const lo = dungeonTile2('wall_face', col, undefined, { col, row: 1 }, 'burrow')!.grid;
      for (let x = 0; x < 24; x++)
        if (matOf(hi.d[23 * 24 + x]!) === matOf(lo.d[x]!)) {
          jump += Math.abs(stepOf(hi.d[23 * 24 + x]!) - stepOf(lo.d[x]!));
          n++;
        }
    }
    expect(jump / n).toBeLessThan(1.2);
  });

  it('keeps the doors’ footprints: open lit from beyond with its lantern, barred dark', () => {
    for (const kind of ['door_side_open', 'door_side_barred', 'door_open', 'door_barred'])
      for (const around of [
        { e: 'rock_floor', w: null },
        { w: 'rock_floor', e: null },
      ]) {
        const g = dungeonDoor2(kind, around, { col: 2, row: 4 })!;
        const b = dungeonDoor2(kind, around, { col: 2, row: 4 }, 'burrow')!;
        expect([b.picture.grid.w, b.picture.grid.h, b.dx, b.dy], kind).toEqual([
          g.picture.grid.w,
          g.picture.grid.h,
          g.dx,
          g.dy,
        ]);
        expect(b.covers, kind).toEqual(g.covers);
        expect(
          b.picture.grid.d.every((c) => c !== 0),
          kind,
        ).toBe(true);
        const lit = b.picture.grid.d.filter((c) => caveMatOf(c) === 'lamp').length;
        if (kind.includes('open')) {
          expect(b.light, kind).toBeDefined();
          expect(b.picture.glows.length, kind).toBeGreaterThan(0);
          expect(lit, kind).toBeGreaterThan(80);
        } else {
          expect(b.light, kind).toBeUndefined();
          expect(b.picture.glows, kind).toEqual([]);
          expect(lit, kind).toBe(0);
        }
      }
  });

  it('carries its fungus’s cold glow on the wall’s face, shining in the dark', () => {
    let glows = 0;
    for (let col = 0; col < 30; col++)
      for (const k of ['wall_face', 'wall_face_high']) {
        const t = dungeonTile2(k, col, undefined, { col, row: 1 }, 'burrow')!;
        for (const g of t.glows) {
          expect(g.always).toBe(true);
          expect(g.rgb).toEqual(FUNGUS2_RGB);
          expect(g.x).toBeGreaterThanOrEqual(0);
          expect(g.x).toBeLessThan(24);
          glows++;
        }
      }
    expect(glows).toBeGreaterThan(5);
    // Floor tiles and tiles asked for without a cell carry none.
    expect(dungeonTile2('rock_floor', 3, undefined, { col: 2, row: 2 }, 'burrow')!.glows).toEqual(
      [],
    );
    expect(dungeonTile2('wall_face', 3, undefined, undefined, 'burrow')!.glows).toEqual([]);
  });

  it('lights its floor by lanterns’ pools without darkening beyond them (its dark is the night ramp)', () => {
    const r = roomGround2(HOLLOW_ROWS, 'burrow');
    const L = { x: 120, y: 60, radius: 70, strength: 0.55, drop: 46, pool: 66, flicker: 0 };
    const lit = lightGround2(r.grid, [L], 'burrow');
    let lifted = 0;
    let darker = 0;
    for (let i = 0; i < r.grid.d.length; i++) {
      if (stepOf(lit.d[i]!) < stepOf(r.grid.d[i]!)) lifted++;
      if (stepOf(lit.d[i]!) > stepOf(r.grid.d[i]!)) darker++;
    }
    expect(lifted).toBeGreaterThan(1500);
    expect(darker).toBe(0);
    expect(BURROW2_LIGHT.darkSteps).toBe(0);
  });
});

describe('The Burrow’s night ramp (B20)', () => {
  it('has four levels: the light, its edge, the dark, the far dark; out of range clamps', () => {
    expect(BURROW_NIGHT_LEVELS).toBe(4);
    expect(burrowNight(0)).toBe(CAVE_BURROW);
    expect(burrowNight(2)).toBe(CAVE_BURROW_DARK);
    expect(burrowNight(-3)).toBe(CAVE_BURROW);
    expect(burrowNight(9)).toBe(burrowNight(3));
    expect(burrowNight(Number.NaN)).toBe(CAVE_BURROW);
    // Each a palette of its own in a sprite's cache (they share dusk's name).
    const keys = [1, 2, 3].map((l) => burrowNight(l).key);
    expect(new Set(keys).size).toBe(3);
  });

  it('keeps every material’s steps in order in the dark: its forms survive', () => {
    for (const m of ALL_MATS) {
      if (NIGHT_EXEMPT.includes(m)) continue;
      for (let a = 0; a <= 6; a++)
        for (let b = 0; b <= 6; b++) {
          const ca = cell(m, a);
          const cb = cell(m, b);
          if (lum(CAVE_BURROW.rgb, ca) >= lum(CAVE_BURROW.rgb, cb) + 1)
            expect(lum(CAVE_BURROW_DARK.rgb, ca), `${m} ${a} ${b}`).toBeGreaterThanOrEqual(
              lum(CAVE_BURROW_DARK.rgb, cb) - 0.6,
            );
        }
    }
  });

  it('never paints black, and each level is no lighter than the one before (but a lift for the blackest)', () => {
    for (const m of ALL_MATS)
      for (let t = 0; t <= 6; t++) {
        const c = cell(m, t);
        const ls = [0, 1, 2, 3].map((l) => burrowNight(l).rgb);
        // In the dark nothing is black: every colour keeps the night's cold floor.
        for (const rgb of NIGHT_EXEMPT.includes(m) ? [] : [ls[2]!, ls[3]!]) {
          expect(rgb[c * 3]! + rgb[c * 3 + 1]! + rgb[c * 3 + 2]!, `${m} ${t}`).toBeGreaterThan(36);
          expect(rgb[c * 3 + 2]!, `${m} ${t}`).toBeGreaterThanOrEqual(20);
        }
        if (NIGHT_EXEMPT.includes(m)) {
          // A light keeps its colour at every level.
          for (const rgb of ls) expect(lum(rgb, c)).toBe(lum(CAVE_BURROW.rgb, c));
          continue;
        }
        expect(lum(ls[2]!, c), `${m} ${t}`).toBeLessThanOrEqual(Math.max(lum(ls[0]!, c), 30));
        // The far dark is a step further down the ramp: no lighter, where the ramp itself darkens.
        if (t < 6 && lum(ls[0]!, cell(m, t + 1)) <= lum(ls[0]!, c))
          expect(lum(ls[3]!, c), `${m} ${t}`).toBeLessThanOrEqual(lum(ls[2]!, c) + 0.6);
      }
  });

  it('takes the dark a long way down: the dark floor well under two thirds of its lit brightness', () => {
    const r = roomGround2(HOLLOW_ROWS, 'burrow');
    let lit = 0;
    let dark = 0;
    for (const c of r.grid.d) {
      lit += lum(CAVE_BURROW.rgb, c);
      dark += lum(CAVE_BURROW_DARK.rgb, c);
    }
    expect(dark / lit).toBeGreaterThan(0.2);
    expect(dark / lit).toBeLessThan(0.6);
  });

  it('bands a room by its pools: lit in a pool, its edge, the dark, the far dark', () => {
    const L = { x: 100, y: 40, radius: 70, strength: 0.5, drop: 40, pool: 66, flicker: 0 };
    expect(burrowLevel2([L], 100, 80)).toBe(0);
    expect(burrowLevel2([L], 100 + 66 * 1.25, 80)).toBe(1);
    expect(burrowLevel2([L], 100 + 66 * 1.85, 80)).toBe(2);
    expect(burrowLevel2([L], 100 + 66 * 3, 80)).toBe(3);
    expect(burrowLevel2([], 10, 10)).toBe(3);
  });
});

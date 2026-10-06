import { describe, expect, it } from 'vitest';
import { SCREEN_ART_WIDTH, gameScale } from '../../src/art/canvas';
import { TOWN_IDS, townLayout, townPiece } from '../../src/art/town';
import { LINE, cell, matOf, stepOf, type TGrid } from '../../src/art/town2/cells';
import {
  TOWN2_FACTS,
  TOWN2_IDS,
  town2Facts,
  town2Piece,
  type Town2Id,
} from '../../src/art/town2/pieces';
import { rasterize2 } from '../../src/art/town2/raster';
import { DAY2, DUSK2, MATS, STEPS } from '../../src/art/town2/ramps';
import { METRE, WORLD2_WIDTH, m, town2Scale } from '../../src/art/town2/scale';
import { tavern } from '../../src/art/town2/tavern';
import {
  TOWN2_H,
  TOWN2_START,
  TOWN2_TILE,
  TOWN2_W,
  groundAt,
  town2Ground,
  town2Layout,
  town2Picture,
  town2Walk,
  forgetTown2Grids,
} from '../../src/art/town2/town';

const SLOW = { timeout: 120000 };

/** The lowest row with anything but a line step in it. */
function lowestRow(g: TGrid): number {
  for (let y = g.h - 1; y >= 0; y--)
    for (let x = 0; x < g.w; x++) {
      const c = g.d[y * g.w + x] as number;
      if (c && stepOf(c) !== LINE) return y;
    }
  return -1;
}

const luminance = (hex: string): number => {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * v[0]! + 0.587 * v[1]! + 0.114 * v[2]!;
};

describe('the C scale', () => {
  it('is a world 360 art pixels across, 3 device pixels each on a 390-wide 3x phone', () => {
    expect(WORLD2_WIDTH).toBe(360);
    expect(town2Scale(390, 3)).toBe(3);
    expect(METRE).toBe(38);
    // A door is two metres: 76 pixels, taller than a 64-pixel person.
    expect(m(2)).toBe(76);
  });

  it('leaves what the live game reads alone', () => {
    expect(SCREEN_ART_WIDTH).toBe(270);
    expect(gameScale(390, 3)).toBe(4);
  });
});

describe('the C-scale ramps', () => {
  it('give every material six steps and a line, by day and at dusk', () => {
    for (const palette of [DAY2, DUSK2])
      for (const mat of MATS) {
        expect(palette.colours[mat], `${palette.name} ${mat}`).toHaveLength(STEPS);
        for (const hex of palette.colours[mat]) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      }
  });

  it('have a dusk version of every ramp, darker than day but for the lights', () => {
    // Lights are lit at dusk; `shade`, the deepest dark short of a line, is already darker than dusk's tint.
    const lights = ['glass', 'lamp', 'fire', 'ember', 'shade'];
    for (const mat of MATS) {
      if (lights.includes(mat)) continue;
      const day = luminance(DAY2.colours[mat][3]!);
      const dusk = luminance(DUSK2.colours[mat][3]!);
      expect(dusk, mat).toBeLessThan(day);
    }
  });

  it('light the windows and lamps at dusk, and keep unlit panes dark', () => {
    expect(luminance(DUSK2.colours.glass[4]!)).toBeGreaterThan(luminance(DAY2.colours.glass[4]!));
    expect(luminance(DUSK2.colours.lamp[2]!)).toBeGreaterThan(luminance(DAY2.colours.lamp[2]!));
    expect(luminance(DUSK2.colours.pane[4]!)).toBeLessThan(luminance(DAY2.colours.pane[4]!));
  });

  it('lean cool in the shadows and warm in the lights', () => {
    // Blue minus red rises from the lit step to the deepest shadow on stone, grass and wood.
    for (const mat of ['stone', 'grass', 'wood', 'plaster'] as const) {
      const lean = (hex: string) => parseInt(hex.slice(5, 7), 16) - parseInt(hex.slice(1, 3), 16);
      expect(lean(DAY2.colours[mat][5]!), mat).toBeGreaterThan(lean(DAY2.colours[mat][1]!));
    }
  });

  it('rasterize a cell to its colour, at a whole number of device pixels only', () => {
    const pic = { grid: { w: 1, h: 1, d: Int16Array.of(cell('wood', 2)) }, glows: [] };
    const img = rasterize2(pic, DAY2, 2);
    expect([img.width, img.height]).toEqual([2, 2]);
    const hex = DAY2.colours.wood[2]!;
    expect([...img.data.subarray(0, 3)]).toEqual(
      [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
    );
    expect(() => rasterize2(pic, DAY2, 1.5)).toThrow();
  });
});

describe('the C-scale pieces', () => {
  it('keep the current town’s ids, but for the figures being reworked', () => {
    const figures = ['hero', 'pirate', 'smith', 'trader'];
    for (const id of TOWN_IDS) if (!figures.includes(id)) expect(TOWN2_IDS).toContain(id);
  });

  it('every piece draws, non-empty, at its declared size, standing on its base line', SLOW, () => {
    for (const id of TOWN2_IDS) {
      const p = town2Piece(id);
      expect(p.id).toBe(id);
      expect([p.w, p.h], id).toEqual([p.picture.grid.w, p.picture.grid.h]);
      expect(p.picture.grid.d.some(Boolean), id).toBe(true);
      expect(p.base, id).toBe(lowestRow(p.picture.grid));
      expect(p.foot, id).toBeGreaterThan(0);
      expect(p.foot, id).toBeLessThan(p.w);
    }
  });

  it(
    'outlines each standing piece in its own materials’ darkest tones, never one ink',
    SLOW,
    () => {
      const unlined: Town2Id[] = ['net', 'pier', 'tavern_smoke', 'smithy_smoke'];
      for (const id of TOWN2_IDS) {
        if (unlined.includes(id)) continue;
        const g = town2Piece(id).picture.grid;
        const edge = new Set<string>();
        for (let x = 0; x < g.w; x++)
          for (const y of [0, g.h - 1]) {
            const c = g.d[y * g.w + x] as number;
            if (c) {
              expect(stepOf(c), `${id} at ${x},${y}`).toBe(LINE);
              edge.add(matOf(c) ?? '');
            }
          }
        for (let y = 0; y < g.h; y++)
          for (const x of [0, g.w - 1]) {
            const c = g.d[y * g.w + x] as number;
            if (c) {
              expect(stepOf(c), `${id} at ${x},${y}`).toBe(LINE);
              edge.add(matOf(c) ?? '');
            }
          }
        if (['tavern', 'smithy', 'house', 'ship'].includes(id)) {
          // Round the whole silhouette, the line takes the colour of what it goes round.
          const lines = new Set<string>();
          for (let y = 1; y < g.h - 1; y++)
            for (let x = 1; x < g.w - 1; x++) {
              const c = g.d[y * g.w + x] as number;
              if (!c || stepOf(c) !== LINE) continue;
              const open = [
                g.d[y * g.w + x - 1],
                g.d[y * g.w + x + 1],
                g.d[(y - 1) * g.w + x],
                g.d[(y + 1) * g.w + x],
              ];
              if (open.some((v) => !v)) lines.add(matOf(c) ?? '');
            }
          expect(lines.size, id).toBeGreaterThan(3);
        }
      }
    },
  );

  it('draws buildings to scale with a 64-pixel person', SLOW, () => {
    const t = tavern();
    expect(t.picture.grid.w).toBeGreaterThan(500);
    expect(t.picture.grid.h).toBeGreaterThan(380);
    for (const id of ['tavern', 'smithy', 'house'] as const) {
      const p = town2Piece(id);
      const door = p.spots.door;
      expect(door, id).toBeDefined();
      expect(door!.y).toBeGreaterThan(p.base);
      expect(door!.y).toBeLessThanOrEqual(p.base + 3);
      expect(p.attached.length, `${id} smoke`).toBe(1);
    }
    expect(town2Piece('stall').spots.counter).toBeDefined();
    // A door's opening is two metres, 76 pixels, of planks or paint above its spot.
    const p = town2Piece('tavern');
    const door = p.spots.door!;
    const g = p.picture.grid;
    const at = (x: number, y: number) => matOf(g.d[y * g.w + x] as number);
    expect(at(door.x, door.y - 4)).toBe('stone');
    expect(at(door.x - 6, door.y - 16)).toBe('wood');
    expect(at(door.x - 6, door.y - 80)).toBe('wood');
  });

  it('lights its windows and lamps at dusk, and the forge by day too', SLOW, () => {
    expect(town2Piece('tavern').picture.glows.length).toBeGreaterThanOrEqual(6);
    expect(town2Piece('lamp').picture.glows.length).toBeGreaterThan(0);
    const forge = town2Piece('smithy').picture.glows;
    expect(forge.some((g) => g.byDay)).toBe(true);
    expect(forge.some((g) => !g.byDay && !g.always)).toBe(true);
  });

  it('draws the same piece the same way every time', () => {
    expect(tavern().picture.grid.d).toEqual(tavern().picture.grid.d);
  });
});

describe('the C-scale town', () => {
  it('places only pieces from the index, and every piece somewhere', SLOW, () => {
    const placed = new Set(town2Layout().map((p) => p.id));
    expect([...placed].sort()).toEqual([...TOWN2_IDS].sort());
    const names = town2Layout().map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('is several screens wide and tall', () => {
    expect(TOWN2_W / WORLD2_WIDTH).toBe(4);
    expect(TOWN2_H).toBeGreaterThan(730 * 2.5);
    expect(TOWN2_W % TOWN2_TILE).toBe(0);
    expect(TOWN2_H % TOWN2_TILE).toBe(0);
  });

  it(
    'draws in order: flat things, then standing things by base line, then smoke and gulls',
    SLOW,
    () => {
      const layout = town2Layout();
      const rank = { ground: 0, stand: 1, above: 2 };
      for (let i = 1; i < layout.length; i++) {
        const a = layout[i - 1]!;
        const b = layout[i]!;
        expect(rank[a.layer]).toBeLessThanOrEqual(rank[b.layer]);
        if (a.layer === 'stand' && b.layer === 'stand') expect(a.base).toBeLessThanOrEqual(b.base);
      }
    },
  );

  it('never lets two footprints overlap, and keeps them in town and off the water', SLOW, () => {
    const taken = new Map<string, string>();
    for (const p of town2Layout()) {
      const f = p.footprint;
      if (!f) continue;
      for (let r = f.row; r < f.row + f.rows; r++)
        for (let c = f.col; c < f.col + f.cols; c++) {
          expect(c, p.name).toBeGreaterThanOrEqual(0);
          expect(c, p.name).toBeLessThan(TOWN2_W / TOWN2_TILE);
          const key = `${c},${r}`;
          expect(taken.get(key), `${p.name} on ${key}`).toBeUndefined();
          taken.set(key, p.name);
          const ground = groundAt(c * TOWN2_TILE + 12, r * TOWN2_TILE + 12);
          expect(ground === 'sea' || ground === 'quay', `${p.name} on ${ground}`).toBe(false);
        }
    }
  });

  it(
    'puts every door and counter on walkable ground, reachable on foot from where the hero starts',
    SLOW,
    () => {
      const walk = town2Walk();
      const T = TOWN2_TILE;
      const tile = (x: number, y: number) => Math.floor(y / T) * walk.cols + Math.floor(x / T);
      const start = tile(TOWN2_START.x, TOWN2_START.y);
      expect(walk.solid[start]).toBe(0);
      const seen = new Uint8Array(walk.solid.length);
      const queue = [start];
      seen[start] = 1;
      while (queue.length) {
        const i = queue.pop()!;
        const c = i % walk.cols;
        for (const j of [i - 1, i + 1, i - walk.cols, i + walk.cols]) {
          if (j < 0 || j >= seen.length || seen[j] || walk.solid[j]) continue;
          if ((j === i - 1 && c === 0) || (j === i + 1 && c === walk.cols - 1)) continue;
          seen[j] = 1;
          queue.push(j);
        }
      }
      const spots = town2Layout().flatMap((p) =>
        Object.entries(p.spots).map(([k, s]) => [`${p.name} ${k}`, s] as const),
      );
      expect(spots.length).toBeGreaterThanOrEqual(5);
      for (const [name, s] of spots) {
        expect(walk.solid[tile(s.x, s.y)], name).toBe(0);
        expect(seen[tile(s.x, s.y)], `${name} reachable`).toBe(1);
      }
      // The pier's far end and the house's door are part of the walk.
      expect(seen[tile(696, 1420 + m(11))]).toBe(1);
    },
  );

  it('composes the whole town once per time of day, with every light in it', SLOW, () => {
    const day = town2Picture('day');
    expect([day.grid.w, day.grid.h]).toEqual([TOWN2_W, TOWN2_H]);
    expect(town2Picture('day')).toBe(day);
    expect(day.grid.d.every((c) => c !== 0)).toBe(true);
    const lamps = town2Layout().filter((p) => p.id === 'lamp').length;
    expect(day.glows.length).toBeGreaterThan(lamps * 2);
  });

  it('throws longer shadows at dusk', SLOW, () => {
    const day = town2Ground('day').grid.d;
    const dusk = town2Ground('dusk').grid.d;
    let darkerAtDusk = 0;
    let darkerByDay = 0;
    for (let i = 0; i < day.length; i++) {
      const a = day[i] as number;
      const b = dusk[i] as number;
      if (a >> 3 !== b >> 3) continue;
      if (stepOf(b) > stepOf(a)) darkerAtDusk++;
      else if (stepOf(a) > stepOf(b)) darkerByDay++;
    }
    expect(darkerAtDusk).toBeGreaterThan(darkerByDay * 3 + 1000);
  });
});

describe('the current town, untouched', () => {
  it('still gives the approved mock-up’s pieces and layout', () => {
    expect([townPiece('tavern').w, townPiece('tavern').h]).toEqual([150, 118]);
    expect(townLayout().find((p) => p.id === 'tavern')).toEqual({ id: 'tavern', x: 6, y: 20 });
  });
});

describe('B9: what lane C asked for', () => {
  it('writes down every piece’s facts, and they are the drawn piece’s own', SLOW, () => {
    for (const id of TOWN2_IDS) {
      const { picture, ...drawn } = town2Piece(id);
      expect(picture.grid.w).toBe(drawn.w);
      expect(town2Facts(id), id).toEqual(drawn);
      expect(TOWN2_FACTS[id]).toBe(town2Facts(id));
    }
  });

  it('puts the far buoy where a camera on a walkable tile can show it', () => {
    // The narrowest and shortest view the scene shows on a phone (360 x 600
    // art pixels), centred on the walker a little above the feet, clamped to
    // the town as the scene's camera is.
    const view = { w: 360, h: 600, rise: 30 };
    const buoy = town2Layout().find((p) => p.name === 'buoy-far')!;
    const piece = town2Facts('buoy');
    const { cols, rows, solid } = town2Walk();
    const clamp = (v: number, size: number, world: number) =>
      Math.min(Math.max(v - size / 2, 0), world - size);
    let seen = false;
    for (let r = 0; r < rows && !seen; r++)
      for (let c = 0; c < cols && !seen; c++) {
        if (solid[r * cols + c]) continue;
        const x0 = clamp(c * TOWN2_TILE + 12, view.w, TOWN2_W);
        const y0 = clamp(r * TOWN2_TILE + 12 - view.rise, view.h, TOWN2_H);
        seen =
          buoy.x >= x0 &&
          buoy.x + piece.w <= x0 + view.w &&
          buoy.y >= y0 &&
          buoy.y + piece.h <= y0 + view.h;
      }
    expect(seen).toBe(true);
    expect(groundAt(buoy.x + piece.foot, buoy.base - 4)).toBe('sea');
  });

  it('lets go of the composed grids when asked, and composes them again the same', SLOW, () => {
    const before = town2Ground('day');
    forgetTown2Grids();
    const after = town2Ground('day');
    expect(after).not.toBe(before);
    expect(after.grid.d).toEqual(before.grid.d);
    const tavern = town2Piece('tavern');
    forgetTown2Grids({ pieces: true });
    expect(town2Piece('tavern')).not.toBe(tavern);
  });
});

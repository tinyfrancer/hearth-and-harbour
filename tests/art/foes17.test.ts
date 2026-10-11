import { describe, expect, it } from 'vitest';
import { foe2Frame } from '../../src/art/dungeon2/cast2';
import { prop2 } from '../../src/art/dungeon2/props';
import { dungeonDoor2 } from '../../src/art/dungeonArt2';
import { matOf, stepOf, type TGrid } from '../../src/art/town2/cells';
import { matOf as caveMatOf } from '../../src/art/dungeon2/cave';

const at = (g: TGrid, x: number, y: number) =>
  x < 0 || y < 0 || x >= g.w || y >= g.h ? 0 : g.d[y * g.w + x]!;

describe('the cave’s creatures (B17)', () => {
  it('gives the lying troll seams inside his outline, so his arm and leg read apart from his body', () => {
    const g = foe2Frame('marsh_troll', 'fall', 1)!.picture.grid;
    let inner = 0;
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        const c = at(g, x, y);
        if (!c || stepOf(c) < 6) continue;
        if (at(g, x - 1, y) && at(g, x + 1, y) && at(g, x, y - 1) && at(g, x, y + 1)) inner++;
      }
    expect(inner).toBeGreaterThan(60);
  });

  it('draws the wolf’s near foreleg thick enough to show three pixels in the light', () => {
    const f = foe2Frame('grey_wolf', 'idle', 0)!;
    const g = f.picture.grid;
    // A row through the shins, a few rows above the paws: the near foreleg is the last lit run.
    const y = f.feet.y - 5;
    let lit = 0;
    let last = 0;
    for (let x = 0; x < g.w; x++) {
      const c = at(g, x, y);
      if (c && stepOf(c) <= 1) lit++;
      else if (lit) {
        last = lit;
        lit = 0;
      }
    }
    expect(Math.max(last, lit)).toBeGreaterThanOrEqual(3);
  });

  it('gives the giant crab eye stalks at least four pixels of shell between their lines', () => {
    const g = foe2Frame('giant_crab', 'idle', 0)!.picture.grid;
    // In the middle third, rows crossing just the two stalks (and the lids over the eyes): the
    // thinner of the two in each, and the middle of those over the rows.
    const widths: number[] = [];
    for (let y = 0; y < g.h; y++) {
      const runs: number[] = [];
      let run = 0;
      for (let x = Math.floor(g.w / 3); x <= Math.ceil((g.w * 2) / 3); x++) {
        const c = at(g, x, y);
        if (c && stepOf(c) < 6 && caveMatOf(c) === 'crab') run++;
        else {
          if (run) runs.push(run);
          run = 0;
        }
      }
      if (runs.length === 2) widths.push(Math.min(...runs));
    }
    widths.sort((a, b) => a - b);
    expect(widths[Math.floor(widths.length / 2)]).toBeGreaterThanOrEqual(4);
  });

  it('springs at a strike: the hind feet stay where they stood and the forefeet leave the ground', () => {
    for (const id of ['dock_rat', 'bramble_boar', 'grey_wolf']) {
      const idle = foe2Frame(id, 'idle', 0)!.picture.grid;
      const strike = foe2Frame(id, 'strike', 0)!.picture.grid;
      const ground = (g: TGrid, x0: number, x1: number) => {
        for (let y = g.h - 1; y >= 0; y--) for (let x = x0; x < x1; x++) if (at(g, x, y)) return y;
        return -1;
      };
      const half = Math.floor(idle.w / 2);
      // The back half stands on the same row; the front half's lowest pixel is off it.
      expect(ground(strike, 0, half), id).toBe(ground(idle, 0, half));
      expect(ground(strike, half, strike.w), id).toBeLessThan(ground(idle, half, idle.w));
    }
  });
});

describe('the tide-pool cave (B17)', () => {
  it('draws the light shaft in streaks along the beam, not a checker', () => {
    const g = prop2('light_shaft')!.grid;
    let checker = 0;
    let lit = 0;
    for (let y = 1; y < g.h - 1; y++)
      for (let x = 1; x < g.w - 1; x++) {
        const c = at(g, x, y);
        if (!c || stepOf(c) !== 0) continue;
        lit++;
        // A checker: lit, with its four neighbours empty and its four corners lit.
        const sides = [at(g, x - 1, y), at(g, x + 1, y), at(g, x, y - 1), at(g, x, y + 1)];
        const corners = [
          at(g, x - 1, y - 1),
          at(g, x + 1, y - 1),
          at(g, x - 1, y + 1),
          at(g, x + 1, y + 1),
        ];
        if (sides.every((s) => !s) && corners.filter(Boolean).length >= 3) checker++;
      }
    expect(lit).toBeGreaterThan(150);
    expect(checker / lit).toBeLessThan(0.05);
  });

  it('gives the open side door a tall rock surround past the room’s edge, the grotto’s left as it was', () => {
    const cols = (theme: 'tidepool' | 'grotto') => {
      const open = dungeonDoor2(
        'door_side_open',
        { e: 'sand', w: null },
        { col: 2, row: 4 },
        theme,
      )!.picture.grid;
      const shut = dungeonDoor2(
        'door_side_barred',
        { e: 'sand', w: null },
        { col: 2, row: 4 },
        theme,
      )!.picture.grid;
      // How many columns past the room's edge reach eight or more rows above the passage.
      let tall = 0;
      for (let x = 0; x < 24; x++) {
        const top = 14 + Math.round((24 - x) / 8);
        if (open.d[(top - 9) * open.w + x] !== shut.d[(top - 9) * open.w + x]) tall++;
      }
      return tall;
    };
    expect(cols('tidepool')).toBeGreaterThan(6);
    expect(cols('grotto')).toBe(0);
  });
});

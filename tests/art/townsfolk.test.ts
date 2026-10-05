import { describe, expect, it } from 'vitest';
import {
  FIGURE_H,
  FIGURE_W,
  HERO_OUTFIT,
  PIRATE_OUTFIT,
  SMITH_OUTFIT,
  TRADER_OUTFIT,
  dress,
  figure,
} from '../../src/art/figure';
import { get, type Grid } from '../../src/art/grid';
import { loadMockup, without } from './mockup';

const mockup = loadMockup();

const sameGrid = (a: Grid, b: Grid) => {
  expect([a.w, a.h]).toEqual([b.w, b.h]);
  expect(a.d).toEqual(b.d);
};

/** Columns of one row of a figure holding a step. */
const columns = (g: Grid, y: number, step: string) =>
  Array.from({ length: g.w }, (_, x) => get(g, x, y)).flatMap((c, x) => (c === step ? [x] : []));

describe('townsfolk', () => {
  it('dresses each in their outfit as the mock-up drew them, pixel for pixel', () => {
    sameGrid(figure('pirate', PIRATE_OUTFIT), mockup.pirateFig());
    sameGrid(figure('smith', SMITH_OUTFIT), mockup.smithFig());
    sameGrid(figure('trader', TRADER_OUTFIT), mockup.traderFig());
  });

  it('still draws the hero as the mock-up does', () => {
    sameGrid(figure('standard', HERO_OUTFIT), mockup.heroFig());
  });

  it('makes what they hold a layer of its own', () => {
    // Without the cutlass, the pirate is the mock-up's pirate drawn without one.
    const unarmed = loadMockup((s) =>
      without(
        without(
          s,
          'for(let i=0;i<=16;i++){const x=OX+27+Math.round(3.5*Math.sin(i/16*2.2));set(g,x,29+i,A.m2);if(i<16)set(g,x+1,29+i,A.m1)}',
        ),
        '[28,25,"ggggG"],',
      ),
    );
    sameGrid(figure('pirate', []), unarmed.pirateFig());
    const empty = loadMockup((s) =>
      without(
        s,
        '[28,7,"O.....O"],[29,6,"OjjjjjjjO"],...rp(30,33,6,"jjOjjOjjO"),[34,7,"OOOOOOO"],[28,9,"rg"],[28,11,"r"],',
      ),
    );
    sameGrid(figure('trader', []), empty.traderFig());
  });

  it('mirrors the smith’s and the trader’s eyes, pupils toward the nose', () => {
    for (const [who, row] of [
      ['smith', 6],
      ['trader', 6],
    ] as const) {
      const g = dress(who, []);
      const whites = columns(g, row, 'white1');
      const pupils = columns(g, row, 'ink1');
      expect(whites.length, who).toBe(2);
      expect(pupils.length, who).toBe(2);
      expect((whites[0] as number) + (whites[1] as number)).toBe(
        (pupils[0] as number) + (pupils[1] as number),
      );
      // Each pupil sits on the nose side of its white.
      expect(pupils[0]).toBe((whites[0] as number) + 1);
      expect(pupils[1]).toBe((whites[1] as number) - 1);
    }
  });

  it('gives the pirate one eye looking straight out, the other under a patch', () => {
    const g = dress('pirate', []);
    expect(columns(g, 8, 'white1')).toEqual([15, 17]);
    expect(columns(g, 8, 'ink1').slice(0, 1)).toEqual([16]);
  });

  it('stands everyone on the same figure canvas', () => {
    for (const who of ['pirate', 'smith', 'trader']) {
      const g = dress(who, []);
      expect([g.w, g.h]).toEqual([FIGURE_W, FIGURE_H]);
    }
  });
});

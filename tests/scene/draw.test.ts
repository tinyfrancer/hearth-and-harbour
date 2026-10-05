import { describe, expect, it } from 'vitest';
import { frameAt, loopAt, risenPuffs, type Puff } from '../../src/scene/ambient';
import { redrawn, type Frame, type Standing } from '../../src/scene/draw';
import { mergeBoxes } from '../../src/scene/stage';

// jsdom cannot paint, so images here are only their sizes: all the patch rules look at.
const image = (w: number, h: number) => ({ width: w, height: h }) as HTMLCanvasElement;
const standing = (x: number, y: number, w: number, h: number, base: number): Standing => ({
  image: image(w, h),
  x,
  y,
  base,
});

const barrel = standing(100, 100, 13, 17, 116);
const crate = standing(108, 110, 15, 15, 124);
const lamp = standing(300, 300, 9, 29, 328);

function frame(walker: Standing | null, underfoot: Standing[] = []): Frame {
  return {
    backdrop: '#000',
    scale: 4,
    camera: { x: 0, y: 0 },
    still: image(448, 640),
    standing: [barrel, crate, lamp],
    underfoot,
    target: null,
    marker: { light: '#fff', ink: '#000' },
    actors: walker ? [walker] : [],
    above: [],
  };
}

const whole = { x: 0, y: 0, w: 448, h: 640 };

describe('redrawing a patch', () => {
  it('draws again only the things that cross the walker, with him in depth order', () => {
    // Feet between the barrel's base and the crate's: in front of the barrel, behind the crate.
    const hero = standing(90, 70, 40, 50, 120);
    const { boxes, list } = redrawn(frame(hero), whole);
    expect(boxes).toEqual([{ x: 90, y: 70, w: 40, h: 50 }]);
    expect(list).toEqual([barrel, hero, crate]);
  });

  it('draws the walker and the people who turn to him each in depth order among the rest', () => {
    // Someone standing behind the barrel, and the walker in front of everything.
    const person = standing(95, 80, 40, 47, 110);
    const hero = standing(100, 90, 40, 50, 130);
    const f = { ...frame(hero), actors: [hero, person] };
    const { list } = redrawn(f, whole);
    expect(list).toEqual([person, barrel, crate, hero]);
  });

  it('draws nothing again where nothing moves', () => {
    expect(redrawn(frame(null), whole).list).toEqual([]);
    const hero = standing(90, 70, 40, 50, 120);
    // A patch away from the walker (a gull out at sea) leaves the still picture as it is.
    expect(redrawn(frame(hero), { x: 250, y: 400, w: 10, h: 6 }).list).toEqual([]);
  });

  it('draws again what stands on ground that is laid over, such as foam under a boat', () => {
    const foam = standing(0, 330, 448, 2, 0);
    const boat = standing(200, 320, 35, 23, 351);
    const f = { ...frame(null, [foam]), standing: [barrel, boat] };
    expect(redrawn(f, { x: 0, y: 330, w: 448, h: 2 }).list).toEqual([boat]);
  });
});

describe('mergeBoxes', () => {
  it('merges boxes that overlap or touch, and keeps apart ones that do not', () => {
    expect(
      mergeBoxes([
        { x: 0, y: 0, w: 10, h: 10 },
        { x: 10, y: 0, w: 5, h: 5 },
        { x: 100, y: 100, w: 4, h: 4 },
      ]),
    ).toEqual([
      { x: 0, y: 0, w: 15, h: 10 },
      { x: 100, y: 100, w: 4, h: 4 },
    ]);
  });

  it('merges a chain into one', () => {
    const merged = mergeBoxes([
      { x: 0, y: 0, w: 5, h: 5 },
      { x: 20, y: 0, w: 5, h: 5 },
      { x: 4, y: 0, w: 17, h: 2 },
    ]);
    expect(merged).toEqual([{ x: 0, y: 0, w: 25, h: 5 }]);
  });

  it('keeps apart boxes that only touch at a corner, when the one box would be mostly empty', () => {
    const apart = mergeBoxes([
      { x: 0, y: 0, w: 40, h: 40 },
      { x: 39, y: 39, w: 40, h: 40 },
    ]);
    expect(apart).toHaveLength(2);
  });
});

describe('ambient motion', () => {
  it('shows each frame in turn and goes round', () => {
    expect([0, 399, 400, 800, 1200, 1600].map((ms) => frameAt(ms, 3, 400))).toEqual([
      0, 0, 1, 2, 0, 1,
    ]);
    expect(frameAt(0, 3, 400, 400)).toBe(1);
  });

  it('starts the puffs where they were drawn and lifts each towards the next', () => {
    const puffs: Puff[] = [
      [5, 14, 4.5],
      [9, 8, 3.6],
      [14, 3, 3],
    ];
    expect(risenPuffs(puffs, 0)).toEqual(puffs);
    const half = risenPuffs(puffs, 0.5);
    expect(half[0]).toEqual([7, 11, 4.05]);
    // The top puff has risen past the last place and thinned to half.
    expect(half[2]![1]).toBeLessThan(3);
    expect(half[2]![2]).toBeCloseTo(1.5);
  });

  it('flies a gull round its loop at whole pixels, back to the start after a lap', () => {
    const loop = { x: 100, y: 50, rx: 20, ry: 5, lapMs: 1000, start: 0, turn: 1 as const };
    expect(loopAt(loop, 0)).toEqual({ x: 120, y: 50 });
    expect(loopAt(loop, 250)).toEqual({ x: 100, y: 55 });
    expect(loopAt(loop, 1000)).toEqual(loopAt(loop, 0));
    expect(loopAt({ ...loop, turn: -1 }, 250)).toEqual({ x: 100, y: 45 });
  });
});

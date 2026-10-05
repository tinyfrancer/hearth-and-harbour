import { describe, expect, it } from 'vitest';
import {
  approach,
  blockFootprints,
  drawOrder,
  grown,
  spotsBeside,
  thingAt,
  type Thing,
} from '../../src/scene/things';
import { TILE, centreOf, isSolid, parseMap } from '../../src/scene/tileMap';

const kinds = { floor: { solid: false }, wall: { solid: true } };
const map = (rows: string[]) => parseMap(rows, { '.': 'floor', '#': 'wall' }, kinds);

/** A one-tile prop, standing on the bottom edge of its tile like a barrel. */
const barrel = (col: number, row: number, id = 'barrel'): Thing => ({
  id,
  footprint: [{ col, row }],
  base: (row + 1) * TILE,
  tap: { x: col * TILE, y: (row + 1) * TILE - 18, w: TILE, h: 18 },
});

describe('drawOrder', () => {
  const things = [barrel(2, 2, 'near'), barrel(2, 0, 'far'), barrel(4, 1, 'middle')];
  const ids = (walkerFeet: number) =>
    drawOrder(things, walkerFeet).map((d) => (d === 'walker' ? 'walker' : d.id));

  it('draws things back to front by the line they stand on', () => {
    expect(ids(1000)).toEqual(['far', 'middle', 'near', 'walker']);
  });

  it('puts the walker behind a barrel when standing above it, in front when below', () => {
    // The tile above the near barrel (row 1) and the tile below it (row 3).
    expect(ids(centreOf({ col: 2, row: 1 }).y)).toEqual(['far', 'walker', 'middle', 'near']);
    expect(ids(centreOf({ col: 2, row: 3 }).y)).toEqual(['far', 'middle', 'near', 'walker']);
  });

  it('keeps the walker in front of a thing level with their feet', () => {
    expect(ids(3 * TILE)).toEqual(['far', 'middle', 'near', 'walker']);
  });
});

describe('footprints', () => {
  it('makes a thing’s tiles solid and leaves the rest as they were', () => {
    const ground = map(['....', '....', '...#']);
    const blocked = blockFootprints(ground, [
      {
        id: 'well',
        footprint: [
          { col: 1, row: 1 },
          { col: 2, row: 1 },
        ],
        base: 32,
      },
    ]);
    expect(isSolid(blocked, { col: 1, row: 1 })).toBe(true);
    expect(isSolid(blocked, { col: 2, row: 1 })).toBe(true);
    expect(isSolid(blocked, { col: 0, row: 1 })).toBe(false);
    expect(isSolid(blocked, { col: 3, row: 2 })).toBe(true);
    // The ground itself is untouched.
    expect(isSolid(ground, { col: 1, row: 1 })).toBe(false);
  });
});

describe('the nearest free spot beside a thing', () => {
  it('is any open tile beside its footprint, never inside it or in a wall', () => {
    const ground = map(['.#..', '....', '....']);
    const well: Thing = {
      id: 'well',
      footprint: [
        { col: 1, row: 1 },
        { col: 2, row: 1 },
      ],
      base: 32,
    };
    const scene = blockFootprints(ground, [well]);
    const spots = spotsBeside(scene, well).map((c) => `${c.col},${c.row}`);
    expect(spots.sort()).toEqual(['0,1', '1,2', '2,0', '2,2', '3,1'].sort());
  });

  it('is the spot the walker reaches soonest', () => {
    const well: Thing = { id: 'well', footprint: [{ col: 2, row: 1 }], base: 32 };
    const scene = blockFootprints(map(['.....', '.....', '.....']), [well]);
    expect(approach(scene, centreOf({ col: 4, row: 2 }), well)).toEqual({ col: 3, row: 1 });
    // A diagonal step is shorter than two straight ones.
    expect(approach(scene, centreOf({ col: 0, row: 0 }), well)).toEqual({ col: 1, row: 1 });
  });

  it('goes round a wall to the far side when that is the only way in', () => {
    // The box can only be reached from above; the walker starts below the wall.
    const box: Thing = { id: 'box', footprint: [{ col: 2, row: 1 }], base: 32 };
    const scene = blockFootprints(map(['.....', '.#.#.', '.###.', '.....']), [box]);
    expect(approach(scene, centreOf({ col: 2, row: 3 }), box)).toEqual({ col: 2, row: 0 });
  });

  it('takes the thing’s own spots when it names them (a door)', () => {
    const tavern: Thing = {
      id: 'tavern',
      footprint: [
        { col: 0, row: 0 },
        { col: 1, row: 0 },
        { col: 2, row: 0 },
      ],
      base: 16,
      spots: [{ col: 1, row: 1 }],
    };
    const scene = blockFootprints(map(['...', '...']), [tavern]);
    expect(approach(scene, centreOf({ col: 2, row: 1 }), tavern)).toEqual({ col: 1, row: 1 });
  });

  it('is null when nothing beside it can be reached', () => {
    const box: Thing = { id: 'box', footprint: [{ col: 2, row: 1 }], base: 32 };
    const scene = blockFootprints(map(['.###', '.#.#', '.###']), [box]);
    expect(approach(scene, centreOf({ col: 0, row: 0 }), box)).toBeNull();
  });
});

describe('thingAt', () => {
  const things = [barrel(1, 1, 'a'), barrel(2, 1, 'b')];

  it('picks a thing by its own tap box', () => {
    expect(thingAt(things, { x: 20, y: 25 })?.id).toBe('a');
    expect(thingAt(things, { x: 40, y: 25 })?.id).toBe('b');
  });

  it('picks nothing where no box is', () => {
    expect(thingAt(things, { x: 100, y: 100 })).toBeNull();
    expect(thingAt([{ id: 'plot', footprint: [], base: 0 }], { x: 0, y: 0 })).toBeNull();
  });

  it('grows a small target to a thumb’s size, and picks the nearest grown box', () => {
    const lone = [barrel(4, 4, 'lone')];
    const justOutside = { x: 4 * TILE - 6, y: 5 * TILE - 9 };
    expect(thingAt(lone, justOutside)).toBeNull();
    expect(thingAt(lone, justOutside, 33)?.id).toBe('lone');
    expect(grown({ x: 0, y: 0, w: 10, h: 40 }, 30)).toEqual({ x: -10, y: 0, w: 30, h: 40 });
  });

  it('prefers the thing in front where tap boxes overlap', () => {
    const behind: Thing = {
      id: 'tavern',
      footprint: [],
      base: 100,
      tap: { x: 0, y: 0, w: 100, h: 100 },
    };
    const front: Thing = {
      id: 'lamp',
      footprint: [],
      base: 120,
      tap: { x: 40, y: 60, w: 10, h: 60 },
    };
    expect(thingAt([front, behind], { x: 45, y: 80 })?.id).toBe('lamp');
    expect(thingAt([front, behind], { x: 10, y: 10 })?.id).toBe('tavern');
  });
});

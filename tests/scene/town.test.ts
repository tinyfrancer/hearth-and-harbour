import { describe, expect, it } from 'vitest';
import { picture } from '../../src/art/raster';
import { grid } from '../../src/art/grid';
import { cheapest } from '../../src/scene/path';
import { spotsBeside } from '../../src/scene/things';
import { TILE, centreOf, isSolid } from '../../src/scene/tileMap';
import {
  GROUND_PLAN,
  TOWN_GROUND,
  TOWN_HEIGHT,
  TOWN_START,
  TOWN_WIDTH,
  town,
} from '../../src/scene/town';
import { HERO_FEET, litBy, shadowShadeAt } from '../../src/scene/townArt';

const { scene, art } = town();
const byId = (id: string) => scene.things.find((t) => t.id === id)!;

describe('the town', () => {
  it('is bigger than a phone screen both ways, so the camera has somewhere to go', () => {
    // One screen shows about 270-330 art pixels across and 360-560 down.
    expect(TOWN_WIDTH).toBeGreaterThan(400);
    expect(TOWN_HEIGHT).toBeGreaterThan(600);
    expect(art.groundGrid.w).toBe(TOWN_WIDTH);
    expect(art.groundGrid.h).toBe(TOWN_HEIGHT);
  });

  it('starts the hero on open ground', () => {
    expect(isSolid(scene.map, TOWN_START)).toBe(false);
  });

  it('keeps footprints on the map and out of each other', () => {
    const seen = new Map<string, string>();
    for (const thing of scene.things) {
      for (const cell of thing.footprint) {
        const key = `${cell.col},${cell.row}`;
        expect(seen.get(key), `${thing.id} overlaps ${seen.get(key)} at ${key}`).toBeUndefined();
        seen.set(key, thing.id);
        expect(cell.col).toBeGreaterThanOrEqual(0);
        expect(cell.col).toBeLessThan(TOWN_GROUND.cols);
        expect(cell.row).toBeLessThan(TOWN_GROUND.rows);
      }
    }
  });

  it('lets the hero walk up to everything that has something to say', () => {
    for (const thing of scene.things.filter((t) => t.use)) {
      const spot = cheapest(scene.map, centreOf(TOWN_START), spotsBeside(scene.map, thing));
      expect(spot, `nowhere to stand beside ${thing.id}`).not.toBeNull();
    }
  });

  it('never lets the hero stand where the map’s edge would cut him off', () => {
    // He is 50 art pixels tall and about 40 wide with his sword.
    for (let row = 0; row < TOWN_GROUND.rows; row++)
      for (let col = 0; col < TOWN_GROUND.cols; col++) {
        if (isSolid(scene.map, { col, row })) continue;
        expect(row * TILE + 4 - HERO_FEET.y, `row ${row}`).toBeGreaterThanOrEqual(0);
        expect(col, `col ${col}`).toBeGreaterThanOrEqual(1);
        expect(col, `col ${col}`).toBeLessThanOrEqual(TOWN_GROUND.cols - 2);
      }
  });

  it('can be walked from the top of the road to the end of the pier', () => {
    const top = { col: 13, row: 3 };
    const pierEnd = { col: 14, row: 30 };
    expect(cheapest(scene.map, centreOf(TOWN_START), [top])).toEqual(top);
    expect(cheapest(scene.map, centreOf(TOWN_START), [pierEnd])).toEqual(pierEnd);
    expect(isSolid(scene.map, { col: 5, row: 34 })).toBe(true);
  });

  it('has the things the brief asks for, with the bank and Woodcutting behind buttons', () => {
    for (const id of [
      'tavern',
      'well',
      'board',
      'lamp-west',
      'barrel-stall',
      'crate-yours',
      'pine-grove-1',
    ])
      expect(byId(id).use, id).toBeDefined();
    expect(byId('crate-yours').use!.button!.opens).toEqual({ tab: 'bank' });
    expect(byId('pine-grove-1').use!.button!.opens).toEqual({ skill: 'woodcutting' });
    expect(byId('tavern').spots).toEqual([{ col: 5, row: 10 }]);
  });

  it('leaves solid plots for the smithy and the stall, with nothing to say yet', () => {
    expect(byId('smithy').use).toBeUndefined();
    expect(byId('stall').use).toBeUndefined();
    expect(isSolid(scene.map, { col: 16, row: 4 })).toBe(true);
    expect(isSolid(scene.map, { col: 6, row: 14 })).toBe(true);
    expect(GROUND_PLAN.pier).toEqual({ x: 208, y: 352, w: 32, h: 144 });
  });

  it('casts the hero’s shadow on the ground he stands on, and none on water', () => {
    expect(shadowShadeAt(art.groundGrid, centreOf({ col: 8, row: 15 }))).toBe('cobble3');
    expect(shadowShadeAt(art.groundGrid, centreOf({ col: 12, row: 6 }))).toBe('grass3');
    expect(shadowShadeAt(art.groundGrid, centreOf({ col: 13, row: 27 }))).toBe('wood3');
    expect(shadowShadeAt(art.groundGrid, centreOf({ col: 4, row: 30 }))).toBeNull();
    expect(art.shadowAt(centreOf({ col: 4, row: 30 }))).toBeNull();
  });

  it('lights the ground and each thing with every lamp and window that reaches it', () => {
    // Four street lamps, the tavern's six windows and its lantern.
    expect(art.ground.glows).toHaveLength(11);
    const lamp = byId('lamp-west').sprite!.picture;
    expect(lamp.glows.length).toBeGreaterThanOrEqual(1);
    const far = litBy(picture(grid(4, 4)), { x: 400, y: 600 }, art.ground.glows);
    expect(far.glows).toHaveLength(0);
    // A light keeps its place in the scene, measured from the thing's corner.
    const near = litBy(picture(grid(4, 4)), { x: 10, y: 20 }, [
      { x: 12, y: 22, radius: 5, strength: 1 },
    ]);
    expect(near.glows).toEqual([{ x: 2, y: 2, radius: 5, strength: 1 }]);
  });
});

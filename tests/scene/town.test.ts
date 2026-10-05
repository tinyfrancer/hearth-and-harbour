import { describe, expect, it } from 'vitest';
import { picture } from '../../src/art/raster';
import { get, grid } from '../../src/art/grid';
import { townPiece, TOWN_IDS } from '../../src/art/town';
import { QUAY_H } from '../../src/art/ground';
import { loopAt } from '../../src/scene/ambient';
import { cheapest } from '../../src/scene/path';
import { drawOrder, spotsBeside, thingAt, usable } from '../../src/scene/things';
import { TILE, centreOf, isSolid } from '../../src/scene/tileMap';
import {
  GROUND_PLAN,
  GULL_LOOPS,
  TOWN_GROUND,
  TOWN_HEIGHT,
  TOWN_LAYOUT,
  TOWN_START,
  TOWN_WIDTH,
  town,
} from '../../src/scene/town';
import {
  HERO_FEET,
  SMOKE_PAD,
  litBy,
  seaTop,
  shadowShadeAt,
  smokeFrames,
} from '../../src/scene/townArt';
import { CAPTAIN, SMITH, TRADER } from '../../src/scene/townsfolk';

const { scene, art } = town();
const byId = (id: string) => scene.things.find((t) => t.id === id)!;
const reach = (cell: { col: number; row: number }) =>
  cheapest(scene.map, centreOf(TOWN_START), [cell]);

describe('the town', () => {
  it('is bigger than a phone screen both ways, so the camera has somewhere to go', () => {
    // One screen shows about 270-330 art pixels across and 360-615 down.
    expect(TOWN_WIDTH).toBeGreaterThan(400);
    expect(TOWN_HEIGHT).toBeGreaterThan(615);
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
    for (const thing of scene.things.filter(usable)) {
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

  it('can be walked from the top of the road to the end of the pier, and no further', () => {
    expect(reach({ col: 13, row: 3 })).toEqual({ col: 13, row: 3 });
    expect(reach({ col: 14, row: 30 })).toEqual({ col: 14, row: 30 });
    // Past the end, beside the pier, under the boat and the ship: water.
    for (const cell of [
      { col: 14, row: 31 },
      { col: 12, row: 25 },
      { col: 15, row: 25 },
      { col: 8, row: 21 },
      { col: 18, row: 27 },
      { col: 5, row: 34 },
    ])
      expect(isSolid(scene.map, cell), `${cell.col},${cell.row}`).toBe(true);
    // A tap on the end of the pier is a walk there, not a walk to the lamp beside it.
    expect(thingAt(scene.things, centreOf({ col: 14, row: 30 }), 33)).toBeNull();
    // The quay wall either side of the pier's head.
    expect(isSolid(scene.map, { col: 12, row: 20 })).toBe(true);
    expect(isSolid(scene.map, { col: 13, row: 20 })).toBe(false);
  });

  it('leaves room behind the tavern and the smithy, where they stand in front of the hero', () => {
    for (const cell of [
      { col: 9, row: 5 },
      { col: 19, row: 5 },
    ]) {
      expect(reach(cell)).toEqual(cell);
      const feet = centreOf(cell).y;
      const order = drawOrder([byId('tavern'), byId('smithy')], feet);
      expect(order.indexOf('walker')).toBe(0);
    }
    // In front of them, he is drawn after them.
    const order = drawOrder([byId('tavern'), byId('smithy')], centreOf({ col: 9, row: 11 }).y);
    expect(order.at(-1)).toBe('walker');
  });

  it('places every piece of the art lane’s index', () => {
    const placed = new Set<string>(TOWN_LAYOUT.map((p) => p.piece));
    // The hero walks; the pier is painted with the ground; gulls and smoke move by themselves.
    const elsewhere = new Set(['hero', 'pier', 'gull', 'tavern_smoke', 'smithy_smoke']);
    for (const id of TOWN_IDS) if (!elsewhere.has(id)) expect(placed.has(id), id).toBe(true);
  });

  it('puts the townsfolk where the mock-up has them, each with lines to say', () => {
    // The smith in front of his smithy, the trader beside her stall, the captain on the pier.
    const smith = byId('smith').footprint[0]!;
    expect(smith.row).toBe(Math.max(...byId('smithy').footprint.map((c) => c.row)) + 1);
    const trader = byId('trader').footprint[0]!;
    expect(trader.col).toBe(Math.max(...byId('stall').footprint.map((c) => c.col)) + 1);
    const captain = byId('captain').footprint[0]!;
    expect(TOWN_GROUND.tiles[captain.row]![captain.col]).toBe('pier');
    for (const use of [SMITH, TRADER, CAPTAIN]) {
      expect(use.says!.length, use.name).toBeGreaterThanOrEqual(4);
      expect(use.duskSays!.length, use.name).toBeGreaterThanOrEqual(1);
    }
  });

  it('talks to the townsfolk from beside them, never standing over them', () => {
    for (const id of ['smith', 'trader', 'captain']) {
      const at = byId(id).footprint[0]!;
      for (const spot of spotsBeside(scene.map, byId(id))) expect(spot.row, id).toBe(at.row);
    }
  });

  it('has the doors, counters and buttons the brief asks for', () => {
    expect(byId('smith').use!.button!.opens).toEqual({ skill: 'smithing' });
    expect(byId('smithy').use!.button!.opens).toEqual({ skill: 'smithing' });
    expect(byId('anvil').use!.button!.opens).toEqual({ skill: 'smithing' });
    expect(byId('trader').use!.button!.opens).toEqual({ tab: 'bank' });
    expect(byId('stall').panelOf).toBe('trader');
    expect(byId('crate-yours').use!.button!.opens).toEqual({ tab: 'bank' });
    expect(byId('pine-grove-1').use!.button!.opens).toEqual({ skill: 'woodcutting' });
    // The art lane's door and counter spots, as tiles.
    const door = townPiece('smithy').spots.door!;
    const smithy = byId('smithy').sprite!.at;
    expect(byId('smithy').spots).toEqual([
      { col: Math.floor((smithy.x + door.x) / TILE), row: Math.floor((smithy.y + door.y) / TILE) },
    ]);
    const counter = townPiece('stall').spots.counter!;
    const stall = byId('stall').sprite!.at;
    expect(byId('stall').spots).toEqual([
      {
        col: Math.floor((stall.x + counter.x) / TILE),
        row: Math.floor((stall.y + counter.y) / TILE),
      },
    ]);
    expect(byId('tavern').spots).toEqual([{ col: 8, row: 11 }]);
  });

  it('picks the person over the building behind them where their tap boxes overlap', () => {
    const smith = byId('smith').tap!;
    const smithy = byId('smithy').tap!;
    expect(smith.x).toBeLessThan(smithy.x + smithy.w);
    expect(byId('smith').base).toBeGreaterThan(byId('smithy').base);
  });

  it('paints the art lane’s grounds: road, square, quay wall, sea and foam, flowers', () => {
    const g = art.groundGrid;
    const shades = new Set(g.d);
    for (const s of ['sand3', 'cobble1', 'stone1', 'metal1', 'sea3', 'foam1', 'red1', 'gold1'])
      expect(shades.has(s as never), s).toBe(true);
    // The quay wall's pale kerb across the map, the pier lying over it; water beneath it, foam at the shore.
    const pier = GROUND_PLAN.pier;
    for (let x = 0; x < TOWN_WIDTH; x += 37) {
      if (x >= pier.x && x < pier.x + 44) continue;
      expect(get(g, x, GROUND_PLAN.quay.y), `kerb ${x}`).toBe('stone1');
      expect(get(g, x, seaTop(GROUND_PLAN) + 20)!.startsWith('sea'), `sea ${x}`).toBe(true);
    }
    expect(seaTop(GROUND_PLAN)).toBe(GROUND_PLAN.quay.y + QUAY_H);
    // Nowhere is a flat plot: no tile of land is a single shade.
    for (let row = 3; row < 20; row++)
      for (let col = 1; col < 27; col++) {
        const seen = new Set<string | null>();
        for (let y = 0; y < TILE; y++)
          for (let x = 0; x < TILE; x++) seen.add(get(g, col * TILE + x, row * TILE + y));
        expect(seen.size, `${col},${row}`).toBeGreaterThan(1);
      }
  });

  it('casts the hero’s shadow on the ground he stands on, and none on water', () => {
    expect(shadowShadeAt(art.groundGrid, centreOf({ col: 8, row: 15 }))).toBe('cobble3');
    expect(shadowShadeAt(art.groundGrid, centreOf({ col: 12, row: 5 }))).toBe('grass3');
    expect(shadowShadeAt(art.groundGrid, centreOf({ col: 13, row: 27 }))).toBe('wood3');
    expect(shadowShadeAt(art.groundGrid, centreOf({ col: 4, row: 30 }))).toBeNull();
    expect(art.shadowAt(centreOf({ col: 4, row: 30 }))).toBeNull();
  });

  it('casts a shadow under every standing thing on land, in its ground’s dark step', () => {
    // Under the trader's feet and the well's foot: cobbles' dark step.
    const trader = byId('trader').sprite!.at;
    expect(get(art.groundGrid, trader.x + 20 + 6, trader.y + 46)).toBe('cobble3');
    expect(get(art.groundGrid, centreOf({ col: 12, row: 14 }).x + 8, 14 * TILE + 15)).toBe(
      'cobble3',
    );
  });

  it('lights the ground and each thing with every lamp, window and fire that reaches it', () => {
    const glows = TOWN_LAYOUT.reduce((n, p) => n + townPiece(p.piece).picture.glows.length, 0);
    expect(art.ground.glows).toHaveLength(glows);
    expect(art.lights).toBe(art.ground.glows);
    const lamp = byId('lamp-west').sprite!.picture;
    expect(lamp.glows.length).toBeGreaterThanOrEqual(1);
    const far = litBy(picture(grid(4, 4)), { x: 400, y: 600 }, art.ground.glows);
    expect(far.glows).toHaveLength(0);
    const near = litBy(picture(grid(4, 4)), { x: 10, y: 20 }, [
      { x: 12, y: 22, radius: 5, strength: 1 },
    ]);
    expect(near.glows).toEqual([{ x: 2, y: 2, radius: 5, strength: 1 }]);
  });
});

describe('a little life', () => {
  it('starts the chimney smoke where the art lane drew it, and lets it rise', () => {
    const frames = smokeFrames('tavern_smoke');
    const still = townPiece('tavern_smoke').picture.grid;
    for (let y = 0; y < still.h; y++)
      for (let x = 0; x < still.w; x++)
        expect(get(frames[0]!.grid, x, y + SMOKE_PAD), `${x},${y}`).toBe(get(still, x, y));
    expect(frames[1]!.grid.d).not.toEqual(frames[0]!.grid.d);
  });

  it('keeps the smoke above the chimneys, the gulls over the water, and the foam at the shore', () => {
    const ambient = art.ambient;
    expect(ambient).toHaveLength(6);
    for (const loop of GULL_LOOPS)
      for (let ms = 0; ms < loop.lapMs; ms += 500) {
        const p = loopAt(loop, ms);
        expect(p.y, 'gull over water').toBeGreaterThan(seaTop(GROUND_PLAN));
        expect(p.x).toBeGreaterThan(4);
        expect(p.x).toBeLessThan(TOWN_WIDTH - 4);
      }
    const foam = ambient.find((a) => a.layer === 'ground')!;
    expect(foam.at(0)!.at.y).toBe(seaTop(GROUND_PLAN));
    expect(foam.at(0)!.picture).not.toBe(foam.at(2000)!.picture);
  });
});

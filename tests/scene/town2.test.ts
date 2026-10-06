import { describe, expect, it } from 'vitest';
import { town2Layout, TOWN2_START, TOWN2_TILE, town2Walk } from '../../src/art/town2/town';
import { approach, spotsBeside, thingAt, usable, type Thing } from '../../src/scene/things';
import { findPath } from '../../src/scene/path';
import { advancePlay, startPlay, tapAt } from '../../src/scene/play';
import { cellAt, centreOf, isSolid, mapSize } from '../../src/scene/tileMap';
import { TOWN_LAYOUT } from '../../src/scene/town';
import {
  BOAT_LANDING2,
  TOWN2_START_CELL,
  TOWNSFOLK2_AT,
  WALK_SPEED2,
  buildTown2Scene,
} from '../../src/scene/town2';

// The C-scale town as a scene: lane B's layout and walking map, with words
// and buttons, walked on 24-pixel tiles. Pure data and rules: no canvas.

const scene = buildTown2Scene();
const { map, things } = scene;
const byId = (id: string): Thing => things.find((t) => t.id === id)!;
const start = centreOf(TOWN2_START_CELL, TOWN2_TILE);

describe('the C-scale town scene', () => {
  it('walks on 24-pixel tiles over the whole 1440 x 2136 town, at the new pace', () => {
    expect(map.tile).toBe(24);
    expect(mapSize(map)).toEqual({ width: 1440, height: 2136 });
    expect(scene.speed).toBe(WALK_SPEED2);
    expect(WALK_SPEED2).toBe(88);
  });

  it('is solid exactly where lane B’s walking map is, and where the townsfolk stand', () => {
    const walk = town2Walk();
    const folk = new Set(TOWNSFOLK2_AT.map((p) => `${p.at.col},${p.at.row}`));
    for (let row = 0; row < walk.rows; row++)
      for (let col = 0; col < walk.cols; col++) {
        const solid = isSolid(map, { col, row });
        if (folk.has(`${col},${row}`)) expect(solid).toBe(true);
        else expect(solid).toBe(walk.solid[row * walk.cols + col] === 1);
      }
  });

  it('starts the hero on open ground at lane B’s start', () => {
    expect(cellAt(TOWN2_START, TOWN2_TILE)).toEqual(TOWN2_START_CELL);
    expect(isSolid(map, TOWN2_START_CELL)).toBe(false);
    expect(isSolid(map, BOAT_LANDING2)).toBe(false);
  });

  it('has every placement but smoke, gulls and the pier’s boards, under its own name', () => {
    const names = town2Layout()
      .filter((p) => p.layer !== 'above' && p.id !== 'pier')
      .map((p) => p.name);
    for (const name of names) expect(byId(name), name).toBeDefined();
    for (const p of TOWNSFOLK2_AT) expect(byId(p.id).use).toBe(p.use);
  });

  it('can walk from the start to a spot beside everything that can be used', () => {
    const unreachable: string[] = [];
    for (const thing of things.filter(usable)) {
      // Deep in the forest a pine is only looked at, as the current town's edge pines were.
      if (thing.id.startsWith('pine-forest') && spotsBeside(map, thing).length === 0) continue;
      const spot = approach(map, start, thing);
      if (!spot || !findPath(map, TOWN2_START_CELL, spot)) unreachable.push(thing.id);
    }
    expect(unreachable).toEqual([]);
  });

  it('picks each thing with a tap in the middle of its box, never something behind or in front', () => {
    const taken: string[] = [];
    for (const thing of things) {
      if (!thing.tap) continue;
      const middle = { x: thing.tap.x + thing.tap.w / 2, y: thing.tap.y + thing.tap.h / 2 };
      const picked = thingAt(things, middle, 44 / 3);
      // The forest is pines standing in rows; one pine for another says the same.
      if (picked?.id.startsWith('pine-forest') && thing.id.startsWith('pine-forest')) continue;
      if (picked !== thing) taken.push(`${thing.id} -> ${picked?.id}`);
    }
    expect(taken).toEqual([]);
  });

  it('walks right up to doors on the spots lane B drew for them', () => {
    for (const [id, x, y] of [
      ['tavern', 330, 1106],
      ['smithy', 1141, 1106],
      ['house', 975, 674],
      ['stall', 250, 1300],
    ] as const) {
      expect(byId(id).spots).toContainEqual(cellAt({ x, y }, TOWN2_TILE));
      expect(approach(map, start, byId(id))).not.toBeNull();
    }
  });

  it('opens a door’s panel when the hero gets there, whichever way he came', () => {
    const door = byId('smithy');
    let play = tapAt(scene, startPlay(start), { x: door.tap!.x + 40, y: door.tap!.y + 40 });
    expect(play.heading).toBe('smithy');
    for (let i = 0; i < 400 && !play.open; i++) play = advancePlay(scene, play, 50);
    expect(play.open).toBe('smithy');
  });

  it('crosses the square at 88 art pixels a second', () => {
    let play = tapAt(scene, startPlay(start), { x: start.x + 264, y: start.y + 48 });
    play = advancePlay(scene, play, 1000);
    expect(play.walked).toBeCloseTo(88, 5);
  });

  it('says and opens what the current town does, for every place they share', () => {
    for (const p of TOWN_LAYOUT) {
      const thing = things.find((t) => t.id === p.id);
      if (!thing) continue;
      if (p.id === 'signpost') continue; // Redrawn with two arms, so it says something else.
      expect(thing.use, p.id).toBe(p.use);
      expect(thing.panelOf, p.id).toBe(p.panelOf);
    }
    expect(byId('stall').panelOf).toBe('trader');
    expect(byId('crate-yours').use!.button!.opens).toEqual({ tab: 'bank' });
    expect(byId('rowboat').use!.button!.opens).toEqual({ dungeon: 'brinebeards_grotto' });
  });

  it('has words for every new placement, and the right buttons on those that lead somewhere', () => {
    for (const thing of things) {
      if (!thing.tap) continue;
      expect(usable(thing), thing.id).toBe(true);
      const use = thing.use ?? byId(thing.panelOf!).use!;
      expect(use.name.length, thing.id).toBeGreaterThan(0);
      expect(use.lines.length + (use.says?.length ?? 0), thing.id).toBeGreaterThan(0);
    }
    expect(byId('house').use!.name).toBe('Your house');
    expect(byId('oak').use!.button!.opens).toEqual({ skill: 'woodcutting' });
    expect(byId('pine-forest-0').use!.button!.opens).toEqual({ skill: 'woodcutting' });
    expect(byId('bush-west').use!.button!.opens).toEqual({ skill: 'foraging' });
    expect(byId('boulder-1').use!.button!.opens).toEqual({ skill: 'mining' });
  });

  it('writes British, as the rest of the town does', () => {
    const text = things
      .flatMap((t) => [t.use?.name, ...(t.use?.lines ?? []), ...(t.use?.duskLines ?? [])])
      .join(' ');
    expect(text).not.toMatch(/\b(color|neighbor|center|gray|favorite)\b/i);
  });

  it('puts the townsfolk where their work is, each talked to from beside them', () => {
    for (const p of TOWNSFOLK2_AT) {
      const thing = byId(p.id);
      expect(isSolid(map, p.at)).toBe(true);
      expect(thing.spots!.length).toBeGreaterThan(0);
      for (const spot of thing.spots!) expect(spot.row).toBe(p.at.row);
    }
    // The captain stands on the pier's boards.
    const captain = TOWNSFOLK2_AT.find((p) => p.id === 'captain')!;
    expect(town2Walk().kinds[captain.at.row * 60 + captain.at.col]).toBe('pier');
  });
});

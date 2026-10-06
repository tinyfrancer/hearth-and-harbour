import { describe, expect, it } from 'vitest';
import {
  DRAG_CSS,
  HOLD_MS,
  NOTICE,
  advancePlay,
  startPlay,
  steer,
  steering,
  turnedTo,
} from '../../src/scene/play';
import { TOWN2_TILE } from '../../src/art/town2/town';
import { NOTICE2, TOWN2_START_CELL, TOWNSFOLK2_AT, town2Scene } from '../../src/scene/town2';
import { cellAt, centreOf, type Cell } from '../../src/scene/tileMap';

const scene = town2Scene();
const TOWN_START = TOWN2_START_CELL;
const at = (cell: Cell) => centreOf(cell, TOWN2_TILE);
const start = at(TOWN_START);

describe('holding and dragging to steer', () => {
  it('is a tap until the finger stays down a moment or moves', () => {
    expect(steering(0, 0)).toBe(false);
    expect(steering(HOLD_MS - 1, DRAG_CSS - 1)).toBe(false);
    expect(steering(HOLD_MS, 0)).toBe(true);
    expect(steering(10, DRAG_CSS)).toBe(true);
  });

  it('sets off towards the finger, and re-aims when it moves to another tile', () => {
    const play = startPlay(start);
    const east = at({ col: TOWN_START.col + 4, row: TOWN_START.row });
    const first = steer(scene, play, east, null);
    expect(first.aimed).toEqual(cellAt(east, TOWN2_TILE));
    expect(first.play.walker.path.at(-1)).toEqual(east);

    const moving = advancePlay(scene, first.play, 200);
    const north = at({ col: TOWN_START.col + 2, row: TOWN_START.row - 3 });
    const second = steer(scene, moving, north, first.aimed);
    expect(second.aimed).toEqual(cellAt(north, TOWN2_TILE));
    expect(second.play.walker.path.at(-1)).toEqual(north);
    // From where he had got to, not from where he began.
    expect(second.play.walker.at).toEqual(moving.walker.at);
  });

  it('leaves the walk alone while the finger stays over the same tile', () => {
    const play = startPlay(start);
    const east = at({ col: TOWN_START.col + 4, row: TOWN_START.row });
    const first = steer(scene, play, east, null);
    const again = steer(scene, first.play, { x: east.x + 3, y: east.y - 2 }, first.aimed);
    expect(again.play).toBe(first.play);
  });

  it('closes an open panel, as a tap on the ground does', () => {
    const play = { ...startPlay(start), open: 'well' };
    expect(steer(scene, play, at({ col: 20, row: 50 }), null).play.open).toBeNull();
  });
});

describe('townsfolk turning to the hero', () => {
  const feet = { x: 200, y: 200 };

  it('stand as drawn while he is away', () => {
    expect(turnedTo(feet, { x: feet.x - NOTICE - 1, y: feet.y })).toBe('right');
    expect(turnedTo(feet, { x: feet.x - 10, y: feet.y - NOTICE - 1 })).toBe('right');
  });

  it('turn to whichever side he walks up on', () => {
    expect(turnedTo(feet, { x: feet.x - 16, y: feet.y - 8 })).toBe('left');
    expect(turnedTo(feet, { x: feet.x + 16, y: feet.y - 8 })).toBe('right');
    // Straight in front, as drawn.
    expect(turnedTo(feet, { x: feet.x + 1, y: feet.y + 16 })).toBe('right');
  });

  it('notice him from further off in town, where people are taller', () => {
    expect(NOTICE2).toBeGreaterThan(NOTICE);
    const smith = at(TOWNSFOLK2_AT.find((p) => p.id === 'smith')!.at);
    expect(turnedTo(smith, { x: smith.x - NOTICE2 + 2, y: smith.y }, NOTICE2)).toBe('left');
    expect(turnedTo(smith, { x: smith.x - NOTICE2 - 2, y: smith.y }, NOTICE2)).toBe('right');
  });
});

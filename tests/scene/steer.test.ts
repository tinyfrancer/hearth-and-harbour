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
import { TOWN_START, town } from '../../src/scene/town';
import { cellAt, centreOf } from '../../src/scene/tileMap';

const { scene } = town();
const start = centreOf(TOWN_START);

describe('holding and dragging to steer', () => {
  it('is a tap until the finger stays down a moment or moves', () => {
    expect(steering(0, 0)).toBe(false);
    expect(steering(HOLD_MS - 1, DRAG_CSS - 1)).toBe(false);
    expect(steering(HOLD_MS, 0)).toBe(true);
    expect(steering(10, DRAG_CSS)).toBe(true);
  });

  it('sets off towards the finger, and re-aims when it moves to another tile', () => {
    const play = startPlay(start);
    const east = centreOf({ col: TOWN_START.col + 4, row: TOWN_START.row });
    const first = steer(scene, play, east, null);
    expect(first.aimed).toEqual(cellAt(east));
    expect(first.play.walker.path.at(-1)).toEqual(east);

    const moving = advancePlay(scene, first.play, 200);
    const north = centreOf({ col: TOWN_START.col + 2, row: TOWN_START.row - 3 });
    const second = steer(scene, moving, north, first.aimed);
    expect(second.aimed).toEqual(cellAt(north));
    expect(second.play.walker.path.at(-1)).toEqual(north);
    // From where he had got to, not from where he began.
    expect(second.play.walker.at).toEqual(moving.walker.at);
  });

  it('leaves the walk alone while the finger stays over the same tile', () => {
    const play = startPlay(start);
    const east = centreOf({ col: TOWN_START.col + 4, row: TOWN_START.row });
    const first = steer(scene, play, east, null);
    const again = steer(scene, first.play, { x: east.x + 3, y: east.y - 2 }, first.aimed);
    expect(again.play).toBe(first.play);
  });

  it('closes an open panel, as a tap on the ground does', () => {
    const play = { ...startPlay(start), open: 'well' };
    expect(steer(scene, play, centreOf({ col: 3, row: 13 }), null).play.open).toBeNull();
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

  it('are the people of the town, each with a picture facing the other way', () => {
    const turning = scene.things.filter((t) => t.sprite?.turned).map((t) => t.id);
    expect(turning.sort()).toEqual(['captain', 'smith', 'trader']);
    const smith = scene.things.find((t) => t.id === 'smith')!.sprite!;
    const { w } = smith.picture.grid;
    const row = 20;
    for (let x = 0; x < w; x++) {
      expect(smith.turned!.grid.d[row * w + x]).toBe(smith.picture.grid.d[row * w + (w - 1 - x)]);
    }
  });
});

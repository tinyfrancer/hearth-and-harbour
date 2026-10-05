import { describe, expect, it } from 'vitest';
import { DAY, DUSK } from '../../src/art/palette';
import { paletteFor, timeOfDayAt } from '../../src/scene/daylight';
import {
  STRIDE,
  advancePlay,
  bob,
  closePanel,
  facingAfter,
  startPlay,
  tapAt,
  type Play,
} from '../../src/scene/play';
import { blockFootprints, type Scene, type Thing } from '../../src/scene/things';
import { TILE, centreOf, parseMap } from '../../src/scene/tileMap';

const kinds = { floor: { solid: false }, wall: { solid: true } };
const ground = parseMap(['........', '........', '........', '........'], { '.': 'floor' }, kinds);

const well: Thing = {
  id: 'well',
  footprint: [{ col: 5, row: 1 }],
  base: 2 * TILE,
  tap: { x: 5 * TILE, y: TILE, w: TILE, h: TILE },
  use: { name: 'The well', lines: ['Deep.'] },
};
const plot: Thing = {
  id: 'plot',
  footprint: [{ col: 2, row: 3 }],
  base: 4 * TILE,
  tap: { x: 32, y: 48, w: 16, h: 16 },
};
const scene: Scene = { map: blockFootprints(ground, [well, plot]), things: [well, plot] };

/** Lets time pass until the walker stops, a quarter of a second at a time. */
function settle(play: Play): Play {
  for (let i = 0; i < 200 && (play.walker.path.length > 0 || play.heading); i++) {
    play = advancePlay(scene, play, 250);
  }
  return play;
}

describe('walking up to a thing', () => {
  it('walks to the nearest free spot beside it, then opens it', () => {
    let play = tapAt(scene, startPlay(centreOf({ col: 0, row: 1 })), { x: 88, y: 24 });
    expect(play.heading).toBe('well');
    expect(play.open).toBeNull();
    play = settle(play);
    expect(play.walker.at).toEqual(centreOf({ col: 4, row: 1 }));
    expect(play.open).toBe('well');
    expect(play.heading).toBeNull();
  });

  it('faces the thing it walked up to', () => {
    // From the right, the walker arrives walking left and stays facing the well.
    const play = settle(tapAt(scene, startPlay(centreOf({ col: 7, row: 1 })), { x: 88, y: 24 }));
    expect(play.walker.at).toEqual(centreOf({ col: 6, row: 1 }));
    expect(play.facing).toBe('left');
    // From above, facing away, it steps straight down and turns to the well on arriving.
    const away: Play = { ...startPlay(centreOf({ col: 4, row: 0 })), facing: 'left' };
    const above = settle(tapAt(scene, away, { x: 88, y: 24 }));
    expect(above.walker.at).toEqual(centreOf({ col: 4, row: 1 }));
    expect(above.facing).toBe('right');
  });

  it('opens at once for a walker already standing beside it', () => {
    const play = advancePlay(
      scene,
      tapAt(scene, startPlay(centreOf({ col: 4, row: 1 })), { x: 88, y: 24 }),
      0,
    );
    expect(play.open).toBe('well');
  });

  it('closes the panel and walks on when the ground is tapped', () => {
    let play = settle(tapAt(scene, startPlay(centreOf({ col: 0, row: 1 })), { x: 88, y: 24 }));
    expect(play.open).toBe('well');
    play = tapAt(scene, play, centreOf({ col: 0, row: 3 }));
    expect(play.open).toBeNull();
    expect(play.walker.path.at(-1)).toEqual(centreOf({ col: 0, row: 3 }));
  });

  it('keeps the panel open when the thing it is open for is tapped again', () => {
    const play = settle(tapAt(scene, startPlay(centreOf({ col: 0, row: 1 })), { x: 88, y: 24 }));
    expect(tapAt(scene, play, { x: 88, y: 24 })).toBe(play);
    expect(closePanel(play).open).toBeNull();
  });

  it('walks up to something with nothing to say as if it were ground', () => {
    const play = tapAt(scene, startPlay(centreOf({ col: 0, row: 0 })), { x: 40, y: 56 });
    expect(play.heading).toBeNull();
    expect(play.walker.path.length).toBeGreaterThan(0);
  });
});

describe('facing and bob', () => {
  it('turns the way the walker last went sideways, and keeps it going straight up or down', () => {
    expect(facingAfter('right', { x: 10, y: 10 }, { x: 4, y: 12 })).toBe('left');
    expect(facingAfter('left', { x: 10, y: 10 }, { x: 14, y: 2 })).toBe('right');
    expect(facingAfter('left', { x: 10, y: 10 }, { x: 10, y: 30 })).toBe('left');
    expect(facingAfter('right', { x: 10, y: 10 }, { x: 10, y: 0 })).toBe('right');
  });

  it('faces left after walking left, and still faces left once stopped', () => {
    const play = settle(
      tapAt(scene, startPlay(centreOf({ col: 3, row: 3 })), centreOf({ col: 0, row: 3 })),
    );
    expect(play.walker.path).toEqual([]);
    expect(play.facing).toBe('left');
  });

  it('bobs a pixel every other half-step while walking, and stands still when stopped', () => {
    const walking = tapAt(
      scene,
      startPlay(centreOf({ col: 0, row: 0 })),
      centreOf({ col: 7, row: 0 }),
    );
    const lifts = [0, 1, 2, 3].map((i) => bob({ ...walking, walked: i * STRIDE }));
    expect(lifts).toEqual([0, 1, 0, 1]);
    expect(bob({ ...settle(walking), walked: STRIDE })).toBe(0);
  });
});

describe('day and dusk', () => {
  it('is dusk from 18:00 until 06:00 by the clock', () => {
    expect(timeOfDayAt(6)).toBe('day');
    expect(timeOfDayAt(12)).toBe('day');
    expect(timeOfDayAt(17)).toBe('day');
    expect(timeOfDayAt(18)).toBe('dusk');
    expect(timeOfDayAt(23)).toBe('dusk');
    expect(timeOfDayAt(0)).toBe('dusk');
    expect(timeOfDayAt(5)).toBe('dusk');
  });

  it('draws with lane B’s day and dusk palettes', () => {
    expect(paletteFor('day')).toBe(DAY);
    expect(paletteFor('dusk')).toBe(DUSK);
  });
});

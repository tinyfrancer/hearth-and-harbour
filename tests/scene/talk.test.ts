import { describe, expect, it } from 'vitest';
import { sayingFor } from '../../src/scene/panel';
import {
  advancePlay,
  closePanel,
  startPlay,
  tapAt,
  visitsTo,
  type Play,
} from '../../src/scene/play';
import { blockFootprints, thingAt, type Scene, type Thing, type Use } from '../../src/scene/things';
import { TILE, centreOf, parseMap } from '../../src/scene/tileMap';

const talker: Use = {
  name: 'Someone',
  lines: [],
  says: ['one', 'two', 'three'],
  duskSays: ['evening'],
};

describe('what someone says', () => {
  it('says the next line each visit, in order, then round again', () => {
    expect([1, 2, 3, 4, 5].map((v) => sayingFor(talker, 'day', v))).toEqual([
      'one',
      'two',
      'three',
      'one',
      'two',
    ]);
  });

  it('starts the round with their evening lines after dark', () => {
    expect([1, 2, 3, 4, 5].map((v) => sayingFor(talker, 'dusk', v))).toEqual([
      'evening',
      'one',
      'two',
      'three',
      'evening',
    ]);
  });

  it('has nothing to say for a thing that is only read', () => {
    expect(sayingFor({ name: 'Well', lines: ['Deep.'] }, 'day', 1)).toBeNull();
    // A visit count of nothing yet still says the first line.
    expect(sayingFor(talker, 'day', 0)).toBe('one');
  });
});

// A stall at (2..3, 1) and its trader at (4, 1), with the stall's counter spot at (2, 2).
const kinds = { floor: { solid: false } };
const ground = parseMap(['........', '........', '........', '........'], { '.': 'floor' }, kinds);
const stall: Thing = {
  id: 'stall',
  footprint: [
    { col: 2, row: 1 },
    { col: 3, row: 1 },
  ],
  base: 2 * TILE,
  tap: { x: 2 * TILE, y: 0, w: 2 * TILE, h: 2 * TILE },
  spots: [{ col: 2, row: 2 }],
  panelOf: 'trader',
};
const trader: Thing = {
  id: 'trader',
  footprint: [{ col: 4, row: 1 }],
  base: 2 * TILE,
  // Overlaps the stall's box, as the trader's picture overlaps the stall's awning.
  tap: { x: 3 * TILE + 8, y: 0, w: 20, h: 2 * TILE },
  spots: [{ col: 5, row: 1 }],
  use: talker,
};
const scene: Scene = { map: blockFootprints(ground, [stall, trader]), things: [stall, trader] };

function settle(play: Play): Play {
  for (let i = 0; i < 100 && (play.walker.path.length > 0 || play.heading); i++)
    play = advancePlay(scene, play, 250);
  return play;
}

describe('visiting', () => {
  it('counts each time a panel opens, so the next visit hears the next line', () => {
    let play = startPlay(centreOf({ col: 7, row: 3 }));
    play = settle(tapAt(scene, play, { x: 4 * TILE + 8, y: 20 }));
    expect(play.open).toBe('trader');
    expect(visitsTo(play, 'trader')).toBe(1);
    play = closePanel(play);
    play = settle(tapAt(scene, play, { x: 4 * TILE + 8, y: 20 }));
    expect(visitsTo(play, 'trader')).toBe(2);
    expect(sayingFor(talker, 'day', visitsTo(play, 'trader'))).toBe('two');
  });

  it('opens the trader’s panel from the stall’s counter, as a visit to her', () => {
    let play = startPlay(centreOf({ col: 0, row: 3 }));
    play = settle(tapAt(scene, play, { x: 2 * TILE + 4, y: 8 }));
    expect(play.walker.at).toEqual(centreOf({ col: 2, row: 2 }));
    expect(play.open).toBe('trader');
    expect(visitsTo(play, 'trader')).toBe(1);
    expect(visitsTo(play, 'stall')).toBe(0);
    // Tapping the stall again with her panel open leaves it as it is.
    expect(tapAt(scene, play, { x: 2 * TILE + 4, y: 8 })).toBe(play);
  });

  it('picks the one in front where two tap boxes overlap, the later where they are level', () => {
    // Level bases: the trader is listed after the stall, so she is picked where both could be.
    expect(thingAt(scene.things, { x: 3 * TILE + 12, y: 10 })?.id).toBe('trader');
    expect(thingAt(scene.things, { x: 2 * TILE + 2, y: 10 })?.id).toBe('stall');
    const behind = { ...trader, base: TILE };
    expect(thingAt([stall, behind], { x: 3 * TILE + 12, y: 10 })?.id).toBe('stall');
  });
});

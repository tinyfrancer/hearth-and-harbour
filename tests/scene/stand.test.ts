import { describe, expect, it } from 'vitest';
import { TOWN2_TILE } from '../../src/art/town2/town';
import { footHalf } from '../../src/scene/path';
import { advancePlay, startPlay, tapAt, turnedTo, type Play } from '../../src/scene/play';
import { standOn, type Thing } from '../../src/scene/things';
import { cellAt, centreOf, isSolid } from '../../src/scene/tileMap';
import {
  NOTICE2,
  TALK_GAP,
  TOWN2_START_CELL,
  TOWNSFOLK2_AT,
  buildTown2Scene,
  feetOf,
} from '../../src/scene/town2';

// Walking up to someone in town: the hero stops beside them, clear of them,
// facing them, and they face him. Where he stands is data on the scene.

const scene = buildTown2Scene();
const byId = (id: string): Thing => scene.things.find((t) => t.id === id)!;
const T = TOWN2_TILE;

/** Taps a person and walks until their panel opens. */
function talkTo(id: string, from: Play): Play {
  const thing = byId(id);
  let play = tapAt(scene, from, { x: thing.tap!.x + thing.tap!.w / 2, y: thing.tap!.y + 20 });
  for (let i = 0; i < 600 && play.open !== id; i++) play = advancePlay(scene, play, 50);
  return play;
}

describe('standing beside someone to talk', () => {
  it('gives every townsperson a stand on each side they are talked from, clear of them', () => {
    for (const p of TOWNSFOLK2_AT) {
      const thing = byId(p.id);
      expect(thing.stands, p.id).toHaveLength(thing.spots!.length);
      const feet = feetOf(p);
      thing.stands!.forEach((stand, i) => {
        const spot = thing.spots![i]!;
        // On the spot's own tile, level with them, on their side.
        expect(cellAt(stand, T), p.id).toEqual(spot);
        expect(stand.y).toBe(feet.y);
        expect(Math.sign(stand.x - feet.x)).toBe(spot.col - p.at.col);
        const gap = Math.abs(stand.x - feet.x);
        // Out to the talking gap where there is room; never nearer than his tile's edge allows.
        const beyond = { col: spot.col + (spot.col - p.at.col), row: spot.row };
        if (isSolid(scene.map, beyond)) expect(gap, p.id).toBe(T + T / 2 - footHalf(scene.map));
        else expect(gap, p.id).toBe(TALK_GAP);
        expect(gap).toBeGreaterThan(T);
      });
    }
  });

  it('walks up to each of them, stops on the stand, faces them, and they face him', () => {
    const start = startPlay(centreOf(TOWN2_START_CELL, T));
    for (const p of TOWNSFOLK2_AT) {
      const play = talkTo(p.id, start);
      expect(play.open, p.id).toBe(p.id);
      const thing = byId(p.id);
      const spot = cellAt(play.walker.at, T);
      expect(play.walker.at, p.id).toEqual(standOn(scene.map, thing, spot));
      const feet = feetOf(p);
      expect(play.facing, p.id).toBe(feet.x > play.walker.at.x ? 'right' : 'left');
      // They look at him: as drawn (right) when he is to their right, turned when to their left.
      expect(turnedTo(feet, play.walker.at, NOTICE2), p.id).toBe(
        play.walker.at.x < feet.x ? 'left' : 'right',
      );
    }
  });

  it('steps straight to the stand when spoken to again, not off and back', () => {
    const start = startPlay(centreOf(TOWN2_START_CELL, T));
    const first = talkTo('smith', { ...start });
    const again = tapAt(scene, { ...first, open: null }, byId('smith').tap!);
    expect(again.walker.path.length).toBeLessThanOrEqual(1);
  });

  it('leaves things with no stands to the middle of their spot, as before', () => {
    const well = byId('well');
    expect(well.stands).toBeUndefined();
    const spot = well.spots?.[0] ?? { col: 0, row: 0 };
    expect(standOn(scene.map, well, spot)).toEqual(centreOf(spot, T));
  });
});

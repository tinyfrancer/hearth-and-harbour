import { describe, expect, it } from 'vitest';
import { WALK2_FRAMES, WALK2_STRIDE } from '../../src/art/character2';
import { TOWN2_TILE } from '../../src/art/town2/town';
import { heroPose, strideFrame, walkFacing, type Pose2 } from '../../src/scene/figures2';
import { advancePlay, startPlay, tapAt, wayAfter, type Play, type Way } from '../../src/scene/play';
import { centreOf } from '../../src/scene/tileMap';
import { TOWN2_START_CELL, town2Scene } from '../../src/scene/town2';

// The walk cycle in town, wired to lane B's doors: which frame by distance
// walked (so feet never slide), which facing by the way he goes (steady on a
// diagonal), and the same walk however the time is cut into frames. Only the
// doors' constants are relied on, never what the frames look like.

const scene = town2Scene();
const start = centreOf(TOWN2_START_CELL, TOWN2_TILE);

/** Walks to `to` from the start, `frame` ms at a time, for `ms` in all. */
function walk(to: { x: number; y: number }, ms: number, frame: number): Play {
  let play = tapAt(scene, startPlay(start), to);
  for (let t = 0; t < ms; t += frame) play = advancePlay(scene, play, Math.min(frame, ms - t));
  return play;
}

describe('the stride, by distance', () => {
  it('moves on a frame each time the ground has passed WALK2_STRIDE under the planted foot, at any pace', () => {
    for (const speed of [30, 40, 87.5, 88, 140]) {
      // A walk of 3 s at this pace, sampled every 7 ms: the frame changes exactly
      // where the distance crosses a multiple of the stride, and nowhere else.
      let last = 0;
      for (let t = 0; t <= 3000; t += 7) {
        const walked = (speed * t) / 1000;
        const frame = strideFrame(walked, WALK2_STRIDE);
        expect(frame).toBe(Math.floor(walked / WALK2_STRIDE) % WALK2_FRAMES);
        if (frame !== last) {
          // A new frame begins within a sample's distance past a stride boundary.
          const past = walked - Math.floor(walked / WALK2_STRIDE) * WALK2_STRIDE;
          expect(past).toBeLessThanOrEqual((speed * 7) / 1000 + 1e-9);
          last = frame;
        }
      }
    }
  });

  it('covers exactly one stride of ground while each frame shows, at any pace and frame rate', () => {
    // Lane B's frames move the planted foot back WALK2_STRIDE art pixels from one
    // frame to the next. The foot stays put on the ground if, and only if, the hero
    // moves forward that same distance while a frame shows: so measure, on real
    // walks through the town at three paces and uneven frames, how far he goes
    // from the moment each frame first shows to the moment the next does.
    for (const speed of [40, 88, 140]) {
      const paced = { ...scene, speed };
      let play = tapAt(paced, startPlay(start), { x: start.x + 330, y: start.y + 10 });
      const firstSeen: { frame: number; walked: number }[] = [];
      let t = 0;
      while (play.walker.path.length) {
        // Frames of 9 to 41 ms, unevenly.
        const ms = 9 + ((t * 7919) % 33);
        t++;
        play = advancePlay(paced, play, ms);
        if (!play.walker.path.length) break;
        const frame = heroPose(play, 0).frame;
        if (firstSeen.at(-1)?.frame !== frame) firstSeen.push({ frame, walked: play.walked });
      }
      expect(firstSeen.length).toBeGreaterThan(30);
      const step = (speed * 41) / 1000;
      for (let i = 2; i < firstSeen.length; i++) {
        const covered = firstSeen[i]!.walked - firstSeen[i - 1]!.walked;
        // One stride, give or take where a frame boundary fell within one step of time.
        expect(Math.abs(covered - WALK2_STRIDE)).toBeLessThanOrEqual(step + 1e-9);
        expect(firstSeen[i]!.frame).toBe((firstSeen[i - 1]!.frame + 1) % WALK2_FRAMES);
      }
    }
  });

  it('starts every walk on the first frame, and shows the breath standing', () => {
    let play = walk({ x: start.x + 200, y: start.y }, 1300, 16);
    expect(heroPose(play, 0)).toMatchObject({ walking: true, facing: 'right' });
    while (play.walker.path.length) play = advancePlay(scene, play, 50);
    const standing = heroPose(play, 0);
    expect(standing.walking).toBe(false);
    expect(heroPose(play, 900).frame).not.toBe(heroPose(play, 0).frame);
    // Off again: frame 0, whatever the distance walked so far.
    play = tapAt(scene, play, { x: play.walker.at.x - 200, y: play.walker.at.y });
    play = advancePlay(scene, play, 1);
    expect(heroPose(play, 0)).toMatchObject({ walking: true, facing: 'left', frame: 0 });
  });
});

describe('which way he faces', () => {
  it('shows the down frames toward the camera, the back view away, the side frames across', () => {
    expect(walkFacing('down', 'left')).toBe('down');
    expect(walkFacing('across', 'left')).toBe('left');
    expect(walkFacing('across', 'right')).toBe('right');
    // Away, lane B's back view, whichever way he last went across.
    expect(walkFacing('up', 'left')).toBe('up');
    expect(walkFacing('up', 'right')).toBe('up');
  });

  it('turns from across to down only past 60 degrees, and back only under 30', () => {
    const at = (deg: number) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
    const go = (way: Way, deg: number) => wayAfter(way, at(deg)[0]!, at(deg)[1]!);
    expect(go('across', 45)).toBe('across');
    expect(go('across', 59)).toBe('across');
    expect(go('across', 61)).toBe('down');
    expect(go('down', 45)).toBe('down');
    expect(go('down', 31)).toBe('down');
    expect(go('down', 29)).toBe('across');
    expect(go('across', -61)).toBe('up');
    expect(go('up', -45)).toBe('up');
    // Standing still changes nothing.
    expect(wayAfter('down', 0, 0)).toBe('down');
  });

  it('never flickers on a diagonal that wavers either side of 45 degrees', () => {
    let way: Way = 'across';
    const seen = new Set<Way>();
    for (let i = 0; i < 400; i++) {
      const deg = 45 + 12 * Math.sin(i / 3);
      way = wayAfter(way, Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180));
      seen.add(way);
    }
    expect([...seen]).toEqual(['across']);
  });

  it('walks down the square in the down frames, and stays in them on a steep diagonal', () => {
    // Down onto the pier, from the square above it.
    const play = walk({ x: 696, y: 1690 }, 1500, 16);
    expect(play.way).toBe('down');
    expect(heroPose(play, 0).facing).toBe('down');
    // And back up the pier, from behind.
    let back = tapAt(
      scene,
      { ...play, walker: { at: play.walker.at, path: [] } },
      {
        x: play.walker.at.x,
        y: play.walker.at.y - 200,
      },
    );
    for (let t = 0; t < 1000; t += 16) back = advancePlay(scene, back, 16);
    expect(back.way).toBe('up');
    expect(heroPose(back, 0).facing).toBe('up');
  });
});

describe('time cut into frames', () => {
  const frames = (play: Play): Pose2 => heroPose(play, 0);
  for (const to of [
    { x: start.x + 300, y: start.y + 40 },
    { x: start.x - 250, y: start.y - 150 },
    { x: start.x + 120, y: start.y + 200 },
  ])
    it(`lands in the same place on the same frame in one step as in many (${to.x}, ${to.y})`, () => {
      for (const ms of [700, 1900, 3100]) {
        const one = walk(to, ms, ms);
        for (const frame of [16, 1000 / 60, 50, 100]) {
          const many = walk(to, ms, frame);
          expect(many.walker.at.x).toBeCloseTo(one.walker.at.x, 6);
          expect(many.walker.at.y).toBeCloseTo(one.walker.at.y, 6);
          expect(many.walked).toBeCloseTo(one.walked, 6);
          // The frame is the same unless the distance lies within a hair of a stride's edge.
          const edge = Math.abs(one.walked / WALK2_STRIDE - Math.round(one.walked / WALK2_STRIDE));
          if (edge > 1e-6) expect(frames(many).frame).toBe(frames(one).frame);
        }
      }
    });
});

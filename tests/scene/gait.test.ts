import { describe, expect, it } from 'vitest';
import {
  IDLE2_FRAMES,
  IDLE2_FRAME_MS,
  TOWNSFOLK2_FRAME_MS,
  TOWNSFOLK2_STRIDE,
  WALK2_FRAMES,
  WALK2_FRAME_MS,
  WALK2_STRIDE,
} from '../../src/art/character2';
import {
  FOLK_SPEED2,
  Gait,
  HERO_SPEED2,
  breathAt,
  headingFor,
  standing,
  walkFrame,
  walking,
} from '../../src/scene/gait';
import { advancePlay, startPlay, tapAt, type Play } from '../../src/scene/play';
import { TOWN2_START_CELL, WALK_SPEED2, buildTown2Scene } from '../../src/scene/town2';
import { centreOf } from '../../src/scene/tileMap';

// How a C-scale walker's feet move: lane B's walk cycle by distance, its
// facings, its breath, and a pace that never slides. Every number comes from
// lane B's door, so these hold whatever stride or frame time it draws.

describe('the walk frame', () => {
  it('follows the distance walked, a stride a frame, and wraps at the cycle', () => {
    expect(walkFrame(0)).toBe(0);
    expect(walkFrame(WALK2_STRIDE - 0.01)).toBe(0);
    expect(walkFrame(WALK2_STRIDE)).toBe(1);
    expect(walkFrame(WALK2_STRIDE * (WALK2_FRAMES - 1))).toBe(WALK2_FRAMES - 1);
    expect(walkFrame(WALK2_STRIDE * WALK2_FRAMES)).toBe(0);
    expect(walkFrame(TOWNSFOLK2_STRIDE * 3, TOWNSFOLK2_STRIDE)).toBe(3);
  });

  it('is the same however the time is cut: frames are by distance, not by time', () => {
    const scene = buildTown2Scene();
    const start = centreOf(TOWN2_START_CELL, 24);
    const still = startPlay(start);
    const off = tapAt(scene, still, { x: start.x + 300, y: start.y });
    const run = (frameMs: number): number[] => {
      const gait = new Gait();
      // Seen standing first, as the stage sees every frame.
      gait.pose(still, 0);
      let play: Play = off;
      const frames: number[] = [];
      for (let t = 0; t < 2000; t += frameMs) {
        play = advancePlay(scene, play, frameMs);
        // Read halfway through each walk frame's time, wherever the frames fell.
        if (Math.round(t + frameMs) % WALK2_FRAME_MS === WALK2_FRAME_MS / 2)
          frames.push(gait.pose(play, t).frame);
      }
      return frames;
    };
    expect(run(10)).toEqual(run(20));
    expect(run(10)).toEqual(run(40));
    // A stride a frame from the contact frame on, round the cycle and back to the contact.
    expect(run(10).slice(0, WALK2_FRAMES + 1)).toEqual(
      Array.from({ length: WALK2_FRAMES + 1 }, (_, i) => i % WALK2_FRAMES),
    );
  });

  it('walks at exactly a stride a frame, so the planted foot never slides', () => {
    expect(HERO_SPEED2).toBe((WALK2_STRIDE / WALK2_FRAME_MS) * 1000);
    expect(WALK_SPEED2).toBe(HERO_SPEED2);
    expect(buildTown2Scene().speed).toBe(HERO_SPEED2);
    expect(FOLK_SPEED2).toBe((TOWNSFOLK2_STRIDE / TOWNSFOLK2_FRAME_MS) * 1000);
    // Walking for one frame's time moves one stride, and so one frame of the cycle.
    const ms = WALK2_FRAME_MS;
    expect(walkFrame((HERO_SPEED2 * ms) / 1000)).toBe(1);
  });
});

describe('which way a walker faces', () => {
  it('walks across with the side frames, diagonals included', () => {
    expect(headingFor(10, 0, 'left')).toBe('right');
    expect(headingFor(10, 0, 'right')).toBe('right');
    expect(headingFor(-10, 0, 'left')).toBe('left');
    expect(headingFor(-10, 0, 'right')).toBe('left');
    // Across is whatever way the play last faced, which follows every sideways step.
    expect(headingFor(10, 10, 'right')).toBe('right');
    expect(headingFor(-10, 10, 'left')).toBe('left');
    expect(headingFor(10, -10, 'right')).toBe('right');
  });

  it('walks down the screen with the frames toward the camera', () => {
    expect(headingFor(0, 10, 'left')).toBe('down');
    expect(headingFor(2, 10, 'right')).toBe('down');
  });

  it('walks up the screen with the side frames of the last way across, as lane B asks', () => {
    expect(headingFor(0, -10, 'left')).toBe('left');
    expect(headingFor(0, -10, 'right')).toBe('right');
  });
});

describe('the gait', () => {
  const scene = buildTown2Scene();
  const start = centreOf(TOWN2_START_CELL, 24);

  it('stands breathing until he walks, then starts the cycle at its contact frame', () => {
    const gait = new Gait();
    // However far he has walked before, this walk starts at the contact frame.
    const still = { ...startPlay(start), walked: 500 };
    expect(gait.pose(still, 0)).toBe(standing('right', 0));
    expect(gait.pose(still, IDLE2_FRAME_MS)).toBe(standing('right', 1));
    expect(gait.pose(still, IDLE2_FRAME_MS * IDLE2_FRAMES)).toBe(standing('right', 0));
    let play: Play = tapAt(scene, still, { x: start.x + 200, y: start.y });
    expect(gait.pose(play, 0)).toBe(walking('right', 0));
    play = advancePlay(scene, play, WALK2_FRAME_MS * 3);
    expect(gait.pose(play, 0)).toBe(walking('right', 3));
  });

  it('goes back to standing the moment he stops, and starts afresh next time', () => {
    const gait = new Gait();
    let play = tapAt(scene, startPlay(start), { x: start.x + 48, y: start.y });
    play = advancePlay(scene, play, 250);
    expect(gait.pose(play, 0).walking).toBe(true);
    play = advancePlay(scene, play, 2000);
    expect(play.walker.path).toHaveLength(0);
    expect(gait.pose(play, 0)).toBe(standing('right', 0));
    play = tapAt(scene, play, { x: play.walker.at.x - 96, y: play.walker.at.y });
    expect(gait.pose(play, 0)).toBe(walking('left', 0));
  });

  it('faces the way the next leg goes: down toward the camera, up by the last way across', () => {
    const gait = new Gait();
    const left = { ...startPlay(start), facing: 'left' as const };
    const down = { ...left, walker: { at: start, path: [{ x: start.x, y: start.y + 96 }] } };
    expect(gait.pose(down, 0).heading).toBe('down');
    const up = { ...left, walker: { at: start, path: [{ x: start.x, y: start.y - 96 }] } };
    expect(gait.pose(up, 0).heading).toBe('left');
  });

  it('gives each pose once, with a key to keep its pictures by', () => {
    expect(walking('down', 3)).toBe(walking('down', 3 + WALK2_FRAMES));
    expect(walking('down', 3).key).not.toBe(walking('right', 3).key);
    expect(standing('left', 1).key).not.toBe(walking('left', 1).key);
    expect(breathAt(0)).toBe(0);
    expect(breathAt(IDLE2_FRAME_MS)).toBe(1 % IDLE2_FRAMES);
  });
});

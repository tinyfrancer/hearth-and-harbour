import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK } from '../../src/art/character';
import {
  FIGURE2_ANCHOR_X,
  FIGURE2_SOLE_Y,
  WALK2_FRAMES,
  WALK2_STRIDE,
  characterWalkPicture2,
} from '../../src/art/character2';
import type { TGrid } from '../../src/art/town2/cells';
import { strideFrame } from '../../src/scene/figures2';

// The walk checked against lane B's own pixels, not only its arithmetic:
// with the camera still, the scene shows frame `strideFrame(walked)` with
// the figure's anchor `walked` along, and a foot on the ground (its sole on
// the lowest row) must not move over the ground from one frame to the next.
// It may grow as the heel comes down, or shrink as it rolls onto the toe,
// but whatever of it is on the ground in both frames is in the same place.

/** Each foot on the ground in a frame: its sole's run of columns on the lowest row, in the world. */
function soles(grid: TGrid, x: number, left: boolean): [number, number][] {
  const anchor = left ? grid.w - 1 - FIGURE2_ANCHOR_X : FIGURE2_ANCHOR_X;
  const runs: [number, number][] = [];
  for (let c = 0; c < grid.w; c++) {
    if (!grid.d[FIGURE2_SOLE_Y * grid.w + c]) continue;
    const at = x + c - anchor;
    const last = runs.at(-1);
    if (last && last[1] === at - 1) last[1] = at;
    else runs.push([at, at]);
  }
  return runs;
}

const overlaps = (a: [number, number], b: [number, number]) => a[0] <= b[1] && b[0] <= a[1];
/** One run inside the other: the same foot, grown or shrunk where it stands, not slid. */
const nested = (a: [number, number], b: [number, number]) =>
  (a[0] >= b[0] && a[1] <= b[1]) || (b[0] >= a[0] && b[1] <= a[1]);

/**
 * Walking `facing` with each frame shown `stride` further along: how many
 * frame-to-frame steps keep a foot on the ground where it was (some foot
 * always stays planted), and how many slide one.
 */
function walk(worn: readonly string[], facing: 'right' | 'left', stride: number) {
  const dir = facing === 'right' ? 1 : -1;
  let held = 0;
  let slid = 0;
  for (let i = 0; i < 2 * WALK2_FRAMES; i++) {
    const walked = i * stride;
    const a = characterWalkPicture2(DEFAULT_LOOK, worn, facing, strideFrame(walked, WALK2_STRIDE));
    const b = characterWalkPicture2(
      DEFAULT_LOOK,
      worn,
      facing,
      strideFrame(walked + stride, WALK2_STRIDE),
    );
    const before = soles(a.grid, dir * walked, facing === 'left');
    const after = soles(b.grid, dir * (walked + stride), facing === 'left');
    let kept = false;
    for (const r of after)
      for (const s of before) {
        if (!overlaps(r, s)) continue;
        if (nested(r, s)) kept = true;
        else slid++;
      }
    if (kept) held++;
  }
  return { held, slid, steps: 2 * WALK2_FRAMES };
}

describe('the planted foot, in lane B’s pixels', () => {
  for (const worn of [[], ['iron_sword', 'iron_shield', 'iron_breastplate', 'iron_helmet']])
    for (const facing of ['right', 'left'] as const)
      it(`stays put on the ground, walking ${facing}${worn.length ? ' in iron' : ''}`, () => {
        const w = walk(worn, facing, WALK2_STRIDE);
        // On every step some foot is on the ground and keeps its place; none slides.
        expect(w.held).toBe(w.steps);
        expect(w.slid).toBe(0);
      });

  it('would slide if the frames were shown by anything but the ground walked', () => {
    // The same frames a stride and a half apart: a foot on the ground lands somewhere else.
    expect(walk([], 'right', Math.round(WALK2_STRIDE * 1.5)).slid).toBeGreaterThan(0);
  });
});

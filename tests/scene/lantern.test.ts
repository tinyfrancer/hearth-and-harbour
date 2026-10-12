/*
 * The boat's bow lantern stirs (lane B's B17c pennant frames, wave 18): its
 * frame by the time passed in, never read; a still piece keeps still.
 */
import { describe, expect, it } from 'vitest';
import { TOWN2_PIECE_FRAMES } from '../../src/art/town2/pieces';
import { pieceFrameAt } from '../../src/scene/fromLaneB';

describe('the bow lantern’s pennant', () => {
  it('turns through lane B’s frames by the time passed in', () => {
    const loop = TOWN2_PIECE_FRAMES.boat_lantern!;
    expect(pieceFrameAt('boat_lantern', 0)).toBe(0);
    expect(pieceFrameAt('boat_lantern', loop.frameMs)).toBe(1 % loop.frames);
    expect(pieceFrameAt('boat_lantern', loop.frameMs * loop.frames)).toBe(0);
    expect(pieceFrameAt('boat_lantern', -1)).toBeGreaterThanOrEqual(0);
    // No time, or a piece that does not stir: its one picture.
    expect(pieceFrameAt('boat_lantern')).toBe(0);
    expect(pieceFrameAt('boat_sign', 5000)).toBe(0);
  });
});

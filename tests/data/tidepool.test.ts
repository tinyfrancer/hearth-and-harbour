import { describe, expect, it } from 'vitest';
import { newGame, type GameState } from '../../src/core/state';
import { FOUND_FISH, many, ROOMS } from './cave';
import { characterAt } from './fighting';

// The cave's numbers held to "a lesson, not a test" (src/data/dungeons.ts),
// played by the plain model in tests/data/cave.ts: everyone in a group at the
// hero at once from the first moment, which is harsher than the scene (its
// own scripted novice, tests/scene/caveRun.test.ts, clears every seed).

/** A character made a moment ago: nothing worn, nothing brought to eat, every skill at 1. */
const newcomer = (): GameState => newGame('New', 0);
/** What reasonable play is here: most heavy blows stepped out of, the landing's fish eaten. */
const reasonable = { dodge: 0.9, food: FOUND_FISH };

describe('the Tidepool Cave, for a brand-new character with nothing brought to eat', () => {
  it('cannot knock them out for standing still in the first room', () => {
    const first = many(newcomer(), { rooms: [ROOMS[0]!] });
    expect(first.rate).toBe(1);
    // Most of their health still there on the worst dice of 400.
    expect(first.worst).toBeGreaterThan(0.6);
  });

  it('is cleared with health to spare by stepping out of most heavy blows and eating what is found', () => {
    const fair = many(newcomer(), reasonable);
    expect(fair.rate).toBeGreaterThan(0.97);
    expect(fair.left).toBeGreaterThan(0.4);
  });

  it('is cleared every time by stepping out of every heavy blow', () => {
    expect(many(newcomer(), { dodge: 1, food: FOUND_FISH }).rate).toBe(1);
  });

  it('hurts: the eat lesson comes when it matters, and the fish are needed', () => {
    // The usual run falls under half health, where the scene's eat lesson shows.
    expect(many(newcomer(), reasonable).lowMedian).toBeLessThan(0.5);
    // The same play without the landing's fish is mostly a knock-out.
    expect(many(newcomer(), { ...reasonable, food: 0 }).rate).toBeLessThan(0.1);
  });

  it('still asks for something: never stepping out of a heavy blow is a knock-out', () => {
    expect(many(newcomer(), { dodge: 0, food: FOUND_FISH }).rate).toBeLessThan(0.1);
  });

  it('is easy in linen with a bronze sword, the first clear’s reward', () => {
    const armed = many(characterAt(1), { dodge: 2 / 3, food: FOUND_FISH });
    expect(armed.rate).toBe(1);
    expect(armed.left).toBeGreaterThan(0.6);
  });
});

import { describe, expect, it } from 'vitest';
import { newGame, type GameState } from '../../src/core/state';
import { many, ROOMS } from './cave';
import { characterAt } from './fighting';

// The cave's numbers held to "a lesson, not a test" (src/data/dungeons.ts),
// played by the plain model in tests/data/cave.ts.

/** A character made a moment ago: nothing worn, nothing to eat, every skill at 1. */
const newcomer = (): GameState => newGame('New', 0);

describe('the Tidepool Cave, for a brand-new character with nothing to eat', () => {
  it('cannot knock them out for standing still in the first room', () => {
    const first = many(newcomer(), { rooms: [ROOMS[0]!] });
    expect(first.rate).toBe(1);
    // Most of their health still there on the worst dice of 400.
    expect(first.worst).toBeGreaterThan(0.6);
  });

  it('is cleared with health to spare by dodging two heavy blows in three', () => {
    const fair = many(newcomer(), { dodge: 2 / 3 });
    expect(fair.rate).toBeGreaterThan(0.97);
    expect(fair.left).toBeGreaterThan(0.4);
  });

  it('is cleared every time by dodging most heavy blows', () => {
    expect(many(newcomer(), { dodge: 0.9 }).rate).toBe(1);
  });

  it('still asks for something: never stepping out of a heavy blow is a knock-out', () => {
    expect(many(newcomer(), { dodge: 0 }).rate).toBeLessThan(0.1);
  });

  it('is easy in linen with a bronze sword, the first clear’s reward', () => {
    const armed = many(characterAt(1), { dodge: 2 / 3 });
    expect(armed.rate).toBe(1);
    expect(armed.left).toBeGreaterThan(0.6);
  });
});

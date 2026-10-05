import { describe, expect, it } from 'vitest';
import { advance, startAction } from '../../src/core/actions';
import { newGame, skillLevel, type GameState } from '../../src/core/state';
import { CONTENT } from '../../src/data';

const HOUR = 60 * 60 * 1000;

/**
 * Plays a skill the way a sensible player would: always the best action open,
 * looked at again once a minute. Returns the hours it took to reach `target`.
 *
 * Whatever the skill's recipes use is kept topped up, so an artisan skill is
 * timed with its materials on hand, as its pacing assumes.
 */
function hoursToLevel(skill: string, target: number): number {
  const actions = Object.values(CONTENT.actions).filter((action) => action.skill === skill);
  const best = (state: GameState): string =>
    actions
      .filter((action) => action.level <= skillLevel(state, skill))
      .sort((a, b) => b.xp / b.durationMs - a.xp / a.durationMs)[0]!.id;
  const plenty = Object.fromEntries(
    actions.flatMap((action) => action.uses ?? []).map(({ item }) => [item, 1_000_000]),
  );

  let state = newGame('Sim', 0);
  let elapsed = 0;
  while (skillLevel(state, skill) < target) {
    state = { ...state, bank: { ...state.bank, ...plenty } };
    const started = startAction(state, best(state), CONTENT);
    if (!started.ok) throw new Error(started.reason);
    state = advance(started.state, 60_000, CONTENT);
    elapsed += 60_000;
    if (elapsed > 1000 * HOUR) throw new Error(`${skill} never reached ${target}`);
  }
  return elapsed / HOUR;
}

// Balance is held here, by simulation, and not by eye. Tier 1 of a skill is an
// afternoon of idling, so that ten or so skills make a first week.
describe('pacing', () => {
  it('gets a fresh character a first level within the first half minute', () => {
    let state = newGame('Sim', 0);
    const started = startAction(state, 'chop_pine', CONTENT);
    if (!started.ok) throw new Error(started.reason);
    state = advance(started.state, 30_000, CONTENT);
    expect(skillLevel(state, 'woodcutting')).toBeGreaterThanOrEqual(2);
  });

  it.each(['woodcutting', 'fishing', 'mining', 'foraging'])(
    'takes %s through tier 1 (level 20) in about three hours',
    (skill) => {
      const hours = hoursToLevel(skill, 20);
      expect(hours).toBeGreaterThan(2.5);
      expect(hours).toBeLessThan(3.5);
    },
  );

  it.each(['cooking', 'smithing'])(
    'takes %s through tier 1 in about two hours with the materials on hand',
    (skill) => {
      const hours = hoursToLevel(skill, 20);
      expect(hours).toBeGreaterThan(1.6);
      expect(hours).toBeLessThan(2.4);
    },
  );
});

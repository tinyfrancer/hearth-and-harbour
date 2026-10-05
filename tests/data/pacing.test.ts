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

  it.each(['cooking', 'smithing', 'crafting', 'fletching', 'alchemy'])(
    'takes %s through tier 1 in about two hours with the materials on hand',
    (skill) => {
      const hours = hoursToLevel(skill, 20);
      expect(hours).toBeGreaterThan(1.6);
      expect(hours).toBeLessThan(2.4);
    },
  );
});

// A potion's strength is a number held here, beside what it costs to make:
// a dozen or so seconds of Foraging, Crafting and Alchemy for one. Each case is a
// fresh character doing a level-1 action for an hour, once with the potion
// drunk at the start and once without; the potion runs out within the hour.
describe('what a potion is worth', () => {
  const hourOf = (actionId: string, potion: string | null): GameState => {
    const action = CONTENT.actions[actionId]!;
    const plenty = Object.fromEntries((action.uses ?? []).map(({ item }) => [item, 1_000_000]));
    const state: GameState = {
      ...newGame('Sim', 0),
      bank: plenty,
      potion: potion ? { item: potion, charges: CONTENT.items[potion]!.potion!.charges } : null,
    };
    const started = startAction(state, actionId, CONTENT);
    if (!started.ok) throw new Error(started.reason);
    return advance(started.state, HOUR, CONTENT);
  };
  const gained = (actionId: string, potion: string) => {
    const [aided, plain] = [hourOf(actionId, potion), hourOf(actionId, null)];
    const action = CONTENT.actions[actionId]!;
    const item = action.gives[0]!.item;
    expect(aided.potion, `${potion} lasts less than the hour`).toBeNull();
    return {
      items: (aided.bank[item] ?? 0) - (plain.bank[item] ?? 0),
      xp: (aided.skills[action.skill] ?? 0) - (plain.skills[action.skill] ?? 0),
    };
  };

  it.each([
    // 150 chops at 2.7s instead of 3s: the time saved chops sixteen more.
    ['sage_tonic', 'chop_pine', { items: 16, xp: 160 }],
    // 150 shrimp at 11 XP instead of 10.
    ['steady_draught', 'cook_shrimp', { items: 0, xp: 150 }],
    // A log over again on every fifth of 150 charges.
    ['glowcap_tincture', 'chop_pine', { items: 30, xp: 0 }],
    // 200 chops at 12 XP instead of 10: 10 x 1.15 rounds up.
    ['midnight_oil', 'chop_pine', { items: 0, xp: 400 }],
  ])('pins %s at a fixed gain over an hour of %s', (potion, actionId, expected) => {
    expect(gained(actionId, potion)).toEqual(expected);
  });
});

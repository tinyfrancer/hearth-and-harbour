import { describe, expect, it } from 'vitest';
import { newGame, type GameState } from '../../src/core/state';
import { dressKey, dressOf } from '../../src/scene/hero';
import { Hero2 } from '../../src/scene/town2Art';

// The hero, as the town and the dungeons both draw him: the C-scale figure (`Hero2`).

const fresh = (): GameState => newGame('Cody', 0);
const armed = (state: GameState): GameState => ({
  ...state,
  equipment: {
    main_hand: { item: 'bronze_sword', qty: 1 },
    off_hand: { item: 'bronze_shield', qty: 1 },
  },
});

describe('the hero is the player’s own character', () => {
  it('is dressed again only when the look or the gear really changes', () => {
    const state = fresh();
    const hero = new Hero2();
    expect(hero.wear(state)).toBe(true);
    expect(hero.drawn).toBe(1);
    // Every frame brings a state; most are the same look and gear, or a new object saying the same.
    expect(hero.wear(state)).toBe(false);
    expect(hero.wear({ ...state, coins: 5 })).toBe(false);
    expect(hero.wear({ ...state, look: { ...state.look }, equipment: {} })).toBe(false);
    expect(hero.drawn).toBe(1);
    const before = hero.dressedAs;
    expect(hero.wear(armed(state))).toBe(true);
    expect(hero.drawn).toBe(2);
    expect(hero.dressedAs).not.toBe(before);
    expect(hero.wear({ ...armed(state), look: { hairColour: 'grey' } })).toBe(true);
    expect(hero.drawn).toBe(3);
  });

  it('keys a look by every part and every worn item', () => {
    const a = dressOf(fresh());
    expect(dressKey(a)).toBe(dressKey(dressOf(fresh())));
    expect(dressKey(a)).not.toBe(dressKey(dressOf(armed(fresh()))));
    expect(dressKey(a)).not.toBe(dressKey({ ...a, look: { ...a.look, hair: 'bald' } }));
  });
});

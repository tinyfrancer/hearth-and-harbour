import { describe, expect, it } from 'vitest';
import { newGame, type GameState } from '../../src/core/state';
import { dressKey, dressOf } from '../../src/scene/hero';
import { Hero2 } from '../../src/scene/town2Art';
import { LOOK_CHOICES2 } from '../../src/art/character2';

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

  it('keys every part the look has, the beard and any part still to come, each by name', () => {
    const a = dressOf(fresh());
    // Every part the art offers is in the look drawn, and so in the key.
    for (const part of Object.keys(LOOK_CHOICES2)) {
      const choices = LOOK_CHOICES2[part as keyof typeof LOOK_CHOICES2];
      const other = choices.find(
        (c) => c.id !== (a.look as unknown as Record<string, string>)[part],
      );
      expect(other, part).toBeDefined();
      expect(dressKey({ ...a, look: { ...a.look, [part]: other!.id } }), part).not.toBe(
        dressKey(a),
      );
    }
    // A part the art has not got yet still changes the key.
    expect(dressKey({ ...a, look: { ...a.look, cape: 'red' } as typeof a.look })).not.toBe(
      dressKey(a),
    );
    // Parts named, so two looks never run together: a value moving between parts is a new key.
    expect(dressKey({ ...a, look: { ...a.look, hair: 'x', beard: 'y' } })).not.toBe(
      dressKey({ ...a, look: { ...a.look, hair: 'y', beard: 'x' } }),
    );
  });

  it('is drawn afresh when only the beard changes, in town and in the dungeons alike', () => {
    const state = fresh();
    const hero = new Hero2();
    hero.wear(state);
    const before = hero.dressKey;
    expect(hero.wear({ ...state, look: { ...state.look, beard: 'full_beard' } })).toBe(true);
    expect(hero.dressKey).not.toBe(before);
    expect(hero.dressKey).toMatch(/beard=full_beard/);
    expect(hero.drawn).toBe(2);
  });
});

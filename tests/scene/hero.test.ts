import { describe, expect, it } from 'vitest';
import { characterPicture, DEFAULT_LOOK } from '../../src/art/character';
import { get } from '../../src/art/grid';
import { townPiece } from '../../src/art/town';
import { newGame, type GameState } from '../../src/core/state';
import { Hero, dressKey, dressOf } from '../../src/scene/hero';
import { centreOf } from '../../src/scene/tileMap';
import { town } from '../../src/scene/town';
import { HERO_FEET } from '../../src/scene/townArt';

const { scene, art } = town();
const byId = (id: string) => scene.things.find((t) => t.id === id)!;

const fresh = (): GameState => newGame('Cody', 0);
const armed = (state: GameState): GameState => ({
  ...state,
  equipment: {
    main_hand: { item: 'bronze_sword', qty: 1 },
    off_hand: { item: 'bronze_shield', qty: 1 },
  },
});

describe('the hero is the player’s own character', () => {
  it('is drawn in the character’s look and gear, the same size as the approved hero', () => {
    const state = { ...armed(fresh()), look: { skin: 'deep', hair: 'long' } };
    const hero = new Hero(dressOf(state));
    const drawn = hero.at({ x: 100, y: 100 }, 'right', false);
    const expected = characterPicture({ ...DEFAULT_LOOK, skin: 'deep', hair: 'long' }, [
      'bronze_sword',
      'bronze_shield',
    ]);
    expect(drawn.grid).toEqual(expected.grid);
    // Feet in the same place whatever is worn, so the hero's shadow and base still fit.
    const approved = townPiece('hero').picture.grid;
    expect([drawn.grid.w, drawn.grid.h]).toEqual([approved.w, approved.h]);
    expect(HERO_FEET.y).toBe(townPiece('hero').base);
  });

  it('arrives as a villager in everyday clothes, not in the approved hero’s plate', () => {
    const drawn = new Hero(dressOf(fresh())).at({ x: 0, y: 0 }, 'right', false);
    expect(drawn.grid).toEqual(characterPicture(DEFAULT_LOOK, []).grid);
    expect(drawn.grid).not.toEqual(townPiece('hero').picture.grid);
  });

  it('is drawn again only when the look or the gear really changes', () => {
    const state = fresh();
    const hero = new Hero(dressOf(state));
    expect(hero.drawn).toBe(1);
    // Every frame brings a state; most are the same look and gear, or a new object saying the same.
    expect(hero.wear(state)).toBe(false);
    expect(hero.wear({ ...state, coins: 5 })).toBe(false);
    expect(hero.wear({ ...state, look: { ...state.look }, equipment: {} })).toBe(false);
    expect(hero.drawn).toBe(1);
    const before = hero.at({ x: 0, y: 0 }, 'right', false);
    expect(hero.wear(armed(state))).toBe(true);
    expect(hero.drawn).toBe(2);
    expect(hero.at({ x: 0, y: 0 }, 'right', false)).not.toBe(before);
    expect(hero.wear({ ...armed(state), look: { hairColour: 'grey' } })).toBe(true);
    expect(hero.drawn).toBe(3);
  });

  it('keys a look by every part and every worn item', () => {
    const a = dressOf(fresh());
    expect(dressKey(a)).toBe(dressKey(dressOf(fresh())));
    expect(dressKey(a)).not.toBe(dressKey(dressOf(armed(fresh()))));
    expect(dressKey(a)).not.toBe(dressKey({ ...a, look: { ...a.look, hair: 'bald' } }));
  });

  it('is lit at dusk by the lamps near him, from a few kept pictures', () => {
    const hero = new Hero(dressOf(armed(fresh())), art.lights);
    const plain = hero.at({ x: 0, y: 0 }, 'right', false);
    const lamp = byId('lamp-west').footprint[0]!;
    const beside = centreOf({ col: lamp.col + 1, row: lamp.row });
    const lit = hero.at(beside, 'right', true);
    expect(lit.glows.length).toBeGreaterThan(0);
    // The same place to within a few pixels is the same picture, so it is painted once.
    expect(hero.at({ x: beside.x + 1, y: beside.y }, 'right', true)).toBe(lit);
    // By day, or far from any light, he is the plain picture.
    expect(hero.at(beside, 'right', false)).toBe(plain);
    expect(hero.at(centreOf({ col: 22, row: 5 }), 'right', true)).toBe(plain);
    // Facing left, the mirrored picture: his sword hand on the other side.
    const left = hero.at(beside, 'left', false);
    expect(left).not.toBe(plain);
    expect(get(left.grid, plain.grid.w - 1 - 5, 20)).toBe(get(plain.grid, 5, 20));
  });
});

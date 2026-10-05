import { describe, expect, it } from 'vitest';
import {
  attackRating,
  breatherFor,
  busy,
  defenceRating,
  hitChance,
  loadFood,
  maxHitFor,
  maxHpFor,
  monstersIn,
  playerCombat,
  setEatAt,
  startFight,
  stopFight,
  unloadFood,
} from '../../src/core/combat';
import type { Content } from '../../src/core/content';
import { equip } from '../../src/core/equipment';
import { newGame, type GameState } from '../../src/core/state';
import { xpForLevel } from '../../src/core/xp';

const item = (id: string, extra = {}) => ({ id, name: id, description: '', value: 1, ...extra });
const monster = (id: string, level: number) => ({
  id,
  name: id,
  description: '',
  area: 'yard',
  level,
  hp: 10,
  attack: 10,
  defence: 10,
  maxHit: 2,
  speedMs: 2000,
  coins: [0, 0] as const,
  always: [],
  rare: [],
});
const content: Content = {
  skills: {
    melee: { id: 'melee', name: 'Melee', verb: 'Fighting', group: 'Combat' },
    defence: { id: 'defence', name: 'Defence', verb: 'Fighting', group: 'Combat' },
  },
  actions: {},
  items: {
    sword: item('sword', { equip: { slot: 'main_hand', style: 'melee', attack: 6, strength: 5 } }),
    plate: item('plate', {
      equip: { slot: 'body', armour: 15, requires: { skill: 'defence', level: 10 } },
    }),
    bow: item('bow', { equip: { slot: 'main_hand', twoHanded: true, style: 'ranged', attack: 8 } }),
    arrows: item('arrows', { equip: { slot: 'ammo', style: 'ranged', strength: 3 } }),
    shrimp: item('shrimp', { heals: 3 }),
    cod: item('cod', { heals: 10 }),
    hide: item('hide'),
  },
  monsters: {
    big: monster('big', 9),
    small: monster('small', 2),
    far: { ...monster('far', 1), area: 'moor' },
  },
};

const holding = (bank: Record<string, number>, extra: Partial<GameState> = {}): GameState => ({
  ...newGame('Cody', 0),
  bank,
  ...extra,
});
const ok = (result: { ok: true; state: GameState } | { ok: false; reason: string }): GameState => {
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};

describe('the formulas', () => {
  it('rate attack and defence as 10, the level and the gear', () => {
    expect(attackRating(1, 6)).toBe(17);
    expect(defenceRating(20, 33)).toBe(63);
  });

  it('land a blow with the chance attack / (attack + defence)', () => {
    expect(hitChance(10, 10)).toBe(0.5);
    expect(hitChance(30, 10)).toBe(0.75);
  });

  it('hit up to 1 plus half the level and strength', () => {
    expect(maxHitFor(1, 5)).toBe(4);
    expect(maxHitFor(20, 11)).toBe(16);
    expect(maxHitFor(1, 0)).toBe(1);
  });

  it('give 20 hit points and 4 more a Vitality level, and a tenth back between monsters', () => {
    expect(maxHpFor(1)).toBe(20);
    expect(maxHpFor(20)).toBe(96);
    expect(breatherFor(20)).toBe(2);
    expect(breatherFor(96)).toBe(10);
  });

  it('read the character as worn and trained', () => {
    const state = holding(
      {},
      {
        skills: { melee: xpForLevel(5), defence: xpForLevel(3) },
        equipment: { main_hand: { item: 'sword', qty: 1 } },
      },
    );
    expect(playerCombat(state, content)).toEqual({
      style: 'melee',
      skill: 'melee',
      attack: 21,
      defence: 13,
      maxHit: 6,
      maxHp: 20,
      hp: 20,
    });
    const bow = {
      ...state,
      equipment: { main_hand: { item: 'bow', qty: 1 }, ammo: { item: 'arrows', qty: 9 } },
    };
    expect(playerCombat(bow, content)).toMatchObject({
      style: 'ranged',
      skill: 'ranged',
      attack: 19,
      maxHit: 3, // the arrows are its strength
    });
  });
});

describe('picking a fight', () => {
  it('refuses a monster that does not exist', () => {
    expect(startFight(newGame('Cody', 0), 'dragon', content)).toEqual({
      ok: false,
      reason: 'There is no such thing to fight.',
    });
    expect(startFight(newGame('Cody', 0), 'dragon', { ...content, monsters: undefined }).ok).toBe(
      false,
    );
  });

  it('starts, keeps going, and stops', () => {
    const fighting = ok(startFight(newGame('Cody', 0), 'small', content));
    expect(busy(fighting)).toBe(true);
    expect(stopFight(fighting).fight).toBeNull();
    expect(busy(stopFight(fighting))).toBe(false);
    const idle = newGame('Cody', 0);
    expect(stopFight(idle)).toBe(idle);
  });

  it('lists an area’s monsters weakest first', () => {
    expect(monstersIn(content, 'yard').map((m) => m.id)).toEqual(['small', 'big']);
    expect(monstersIn(content, 'moor').map((m) => m.id)).toEqual(['far']);
    expect(monstersIn({ ...content, monsters: undefined }, 'yard')).toEqual([]);
  });
});

describe('the food slot', () => {
  it('takes the whole stack of a food from the bank', () => {
    const state = ok(loadFood(holding({ cod: 12, hide: 1 }), 'cod', content));
    expect(state.food).toEqual({ item: 'cod', qty: 12 });
    expect(state.bank).toEqual({ hide: 1 });
  });

  it('joins more of the same kind, and sends another kind back to the bank', () => {
    const cod = ok(loadFood(holding({ cod: 12, shrimp: 5 }), 'cod', content));
    const more = ok(loadFood({ ...cod, bank: { ...cod.bank, cod: 3 } }, 'cod', content));
    expect(more.food).toEqual({ item: 'cod', qty: 15 });
    const swapped = ok(loadFood(cod, 'shrimp', content));
    expect(swapped.food).toEqual({ item: 'shrimp', qty: 5 });
    expect(swapped.bank).toEqual({ cod: 12 });
  });

  it('refuses what is not food, and what is not held', () => {
    expect(loadFood(holding({ hide: 4 }), 'hide', content)).toEqual({
      ok: false,
      reason: 'That is not something to eat.',
    });
    expect(loadFood(holding({}), 'cod', content)).toEqual({
      ok: false,
      reason: 'You have none of those.',
    });
  });

  it('empties back into the bank', () => {
    const state = ok(loadFood(holding({ cod: 12 }), 'cod', content));
    expect(unloadFood(state)).toMatchObject({ food: null, bank: { cod: 12 } });
    const empty = holding({});
    expect(unloadFood(empty)).toBe(empty);
  });

  it('eats below a line that moves in whole percent between 10 and 90', () => {
    const state = holding({});
    expect(state.eatAt).toBe(50);
    expect(setEatAt(state, 70).eatAt).toBe(70);
    expect(setEatAt(state, 5).eatAt).toBe(10);
    expect(setEatAt(state, 100).eatAt).toBe(90);
    expect(setEatAt(state, 50)).toBe(state);
  });
});

describe('wearing needs levels', () => {
  it('refuses until the skill is high enough, and says which', () => {
    expect(equip(holding({ plate: 1 }), 'plate', content)).toEqual({
      ok: false,
      reason: 'Needs Defence level 10.',
    });
    const trained = holding({ plate: 1 }, { skills: { defence: xpForLevel(10) } });
    expect(ok(equip(trained, 'plate', content)).equipment.body).toEqual({ item: 'plate', qty: 1 });
  });

  it('leaves alone what is already worn', () => {
    const worn = holding({}, { equipment: { body: { item: 'plate', qty: 1 } } });
    expect(playerCombat(worn, content).defence).toBe(10 + 1 + 15);
  });
});

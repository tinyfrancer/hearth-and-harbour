import { describe, expect, it } from 'vitest';
import type { Content, ItemDef } from '../../src/core/content';
import {
  combatStyle,
  equip,
  equipmentTotals,
  unequip,
  wearablesFor,
  wornItemIds,
} from '../../src/core/equipment';
import { newGame, type GameState } from '../../src/core/state';

const item = (id: string, equipDef?: ItemDef['equip']): ItemDef => ({
  id,
  name: id,
  description: '',
  value: 1,
  ...(equipDef ? { equip: equipDef } : {}),
});

const content: Content = {
  skills: {},
  actions: {},
  items: {
    stick: item('stick'),
    club: item('club', { slot: 'main_hand', style: 'melee', attack: 3, strength: 4 }),
    blade: item('blade', { slot: 'main_hand', style: 'melee', attack: 6, strength: 5 }),
    bow: item('bow', {
      slot: 'main_hand',
      twoHanded: true,
      style: 'ranged',
      attack: 7,
      strength: 2,
    }),
    lid: item('lid', { slot: 'off_hand', armour: 5 }),
    pot: item('pot', { slot: 'head', armour: 3 }),
    charm: item('charm', { slot: 'neck', attack: 1, strength: 1 }),
    darts: item('darts', { slot: 'ammo', style: 'ranged', strength: 4 }),
    bolts: item('bolts', { slot: 'ammo', style: 'ranged', strength: 6 }),
  },
};

const holding = (bank: Record<string, number>): GameState => ({ ...newGame('Cody', 0), bank });

/** Equip, insisting that it works. */
const wear = (state: GameState, id: string): GameState => {
  const result = equip(state, id, content);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
};

describe('equip', () => {
  it('moves one from the bank to its slot', () => {
    const state = wear(holding({ blade: 2 }), 'blade');
    expect(state.equipment).toEqual({ main_hand: { item: 'blade', qty: 1 } });
    expect(state.bank).toEqual({ blade: 1 });
  });

  it('keeps nothing in the bank at zero', () => {
    expect(wear(holding({ pot: 1 }), 'pot').bank).toEqual({});
  });

  it('returns whatever was in the slot to the bank', () => {
    const state = wear(wear(holding({ club: 1, blade: 1 }), 'club'), 'blade');
    expect(state.equipment.main_hand).toEqual({ item: 'blade', qty: 1 });
    expect(state.bank).toEqual({ club: 1 });
  });

  it('changes nothing that matters when the same thing is put on again', () => {
    const once = wear(holding({ pot: 2 }), 'pot');
    const twice = wear(once, 'pot');
    expect(twice.equipment).toEqual(once.equipment);
    expect(twice.bank).toEqual(once.bank);
  });

  it('moves ammunition as the whole stack', () => {
    const state = wear(holding({ darts: 140 }), 'darts');
    expect(state.equipment.ammo).toEqual({ item: 'darts', qty: 140 });
    expect(state.bank).toEqual({});
  });

  it('adds more of the same ammunition to the stack worn', () => {
    const first = wear(holding({ darts: 40 }), 'darts');
    const more = wear({ ...first, bank: { darts: 25 } }, 'darts');
    expect(more.equipment.ammo).toEqual({ item: 'darts', qty: 65 });
    expect(more.bank).toEqual({});
  });

  it('swaps one kind of ammunition for another, stack for stack', () => {
    const state = wear(wear(holding({ darts: 40, bolts: 10 }), 'darts'), 'bolts');
    expect(state.equipment.ammo).toEqual({ item: 'bolts', qty: 10 });
    expect(state.bank).toEqual({ darts: 40 });
  });

  it('empties the off hand for a two-handed weapon', () => {
    const armed = wear(wear(holding({ blade: 1, lid: 1, bow: 1 }), 'blade'), 'lid');
    const state = wear(armed, 'bow');
    expect(state.equipment).toEqual({ main_hand: { item: 'bow', qty: 1 } });
    expect(state.bank).toEqual({ blade: 1, lid: 1 });
  });

  it('puts a two-handed weapon back to take up something for the off hand', () => {
    const state = wear(wear(holding({ bow: 1, lid: 1 }), 'bow'), 'lid');
    expect(state.equipment).toEqual({ off_hand: { item: 'lid', qty: 1 } });
    expect(state.bank).toEqual({ bow: 1 });
  });

  it('leaves a one-handed weapon where it is for something in the off hand', () => {
    const state = wear(wear(holding({ blade: 1, lid: 1 }), 'blade'), 'lid');
    expect(state.equipment).toEqual({
      main_hand: { item: 'blade', qty: 1 },
      off_hand: { item: 'lid', qty: 1 },
    });
  });

  it('refuses what cannot be worn and what is not in the bank, changing nothing', () => {
    const state = holding({ stick: 1 });
    expect(equip(state, 'stick', content)).toEqual({
      ok: false,
      reason: 'That is not something to wear.',
    });
    expect(equip(state, 'nonsense', content).ok).toBe(false);
    expect(equip(state, 'blade', content)).toEqual({
      ok: false,
      reason: 'You have none of those.',
    });
  });

  it('never changes the state it was given', () => {
    const state = holding({ blade: 1, club: 1 });
    const frozen = structuredClone(state);
    wear(wear(state, 'blade'), 'club');
    expect(state).toEqual(frozen);
  });
});

describe('unequip', () => {
  it('puts the thing in a slot back in the bank', () => {
    const state = unequip(wear(holding({ pot: 1, lid: 1 }), 'pot'), 'head');
    expect(state.equipment).toEqual({});
    expect(state.bank).toEqual({ pot: 1, lid: 1 });
  });

  it('puts back a whole stack of ammunition', () => {
    const state = unequip(wear(holding({ darts: 30 }), 'darts'), 'ammo');
    expect(state.bank).toEqual({ darts: 30 });
  });

  it('changes nothing for an empty slot', () => {
    const state = holding({ pot: 1 });
    expect(unequip(state, 'head')).toBe(state);
  });

  it('takes off a thing the tables no longer know', () => {
    const state = { ...holding({}), equipment: { neck: { item: 'lost_locket', qty: 1 } } };
    expect(unequip(state, 'neck').bank).toEqual({ lost_locket: 1 });
  });
});

describe('what is worn', () => {
  it('lists the ids worn in slot order, for drawing', () => {
    const state = wear(
      wear(wear(holding({ darts: 5, pot: 1, blade: 1 }), 'darts'), 'pot'),
      'blade',
    );
    expect(wornItemIds(state)).toEqual(['pot', 'blade', 'darts']);
  });

  it("finds what the bank holds for a slot, in the tables' order", () => {
    const state = holding({ bow: 1, club: 2, pot: 1 });
    expect(wearablesFor(state, 'main_hand', content).map((def) => def.id)).toEqual(['club', 'bow']);
    expect(wearablesFor(state, 'legs', content)).toEqual([]);
  });
});

describe('equipmentTotals', () => {
  it('is nothing at all, fighting melee, with nothing worn', () => {
    expect(equipmentTotals(holding({}), content)).toEqual({
      style: 'melee',
      attack: 0,
      strength: 0,
      armour: 0,
    });
  });

  it('adds up everything worn', () => {
    const state = wear(wear(wear(holding({ blade: 1, lid: 1, pot: 1 }), 'blade'), 'lid'), 'pot');
    expect(equipmentTotals(state, content)).toEqual({
      style: 'melee',
      attack: 6,
      strength: 5,
      armour: 8,
    });
  });

  it("takes its style from the weapon, and counts ammunition only for that style's weapon", () => {
    const bow = wear(wear(wear(holding({ bow: 1, darts: 9, charm: 1 }), 'bow'), 'darts'), 'charm');
    expect(combatStyle(bow, content)).toBe('ranged');
    expect(equipmentTotals(bow, content)).toEqual({
      style: 'ranged',
      attack: 8,
      strength: 7,
      armour: 0,
    });
    const blade = wear({ ...bow, bank: { ...bow.bank, blade: 1 } }, 'blade');
    expect(equipmentTotals(blade, content)).toEqual({
      style: 'melee',
      attack: 7,
      strength: 6,
      armour: 0,
    });
  });

  it('counts nothing for a thing the tables no longer know', () => {
    const state = { ...holding({}), equipment: { head: { item: 'lost_hat', qty: 1 } } };
    expect(equipmentTotals(state, content).armour).toBe(0);
  });
});

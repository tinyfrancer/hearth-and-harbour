import { describe, expect, it } from 'vitest';
import { advance, startAction } from '../../src/core/actions';
import {
  collectable,
  collectionSources,
  foundIn,
  heldIds,
  noteFinds,
} from '../../src/core/collection';
import type { Content, MonsterDef } from '../../src/core/content';
import { newGame, type GameState } from '../../src/core/state';

const item = (id: string) => ({ id, name: id, description: '', value: 1 });
const monster = (id: string, drops: string[]): MonsterDef => ({
  id,
  name: `The ${id}`,
  description: '',
  area: 'yard',
  level: 1,
  hp: 5,
  attack: 1,
  defence: 1,
  maxHit: 1,
  speedMs: 1000,
  coins: [0, 0],
  always: [{ item: drops[0]!, min: 1, max: 1 }],
  rare: drops.slice(1).map((drop) => ({ item: drop, min: 1, max: 1, oneIn: 10 })),
});

const content: Content = {
  skills: {
    digging: { id: 'digging', name: 'Digging', verb: 'Digging', group: 'Gathering' },
    baking: { id: 'baking', name: 'Baking', verb: 'Baking', group: 'Artisan' },
    pinching: { id: 'pinching', name: 'Pinching', verb: 'Pinching', group: 'Roguery' },
  },
  items: Object.fromEntries(
    ['mud', 'worm', 'pie', 'tooth', 'gem', 'purse', 'hat', 'cake', 'coin'].map((id) => [
      id,
      item(id),
    ]),
  ),
  actions: {
    dig: {
      id: 'dig',
      skill: 'digging',
      name: 'Dig',
      level: 1,
      durationMs: 1000,
      xp: 1,
      gives: [{ item: 'mud', qty: 1 }],
    },
    grub: {
      id: 'grub',
      skill: 'digging',
      name: 'Grub',
      level: 1,
      durationMs: 1000,
      xp: 1,
      gives: [{ item: 'worm', qty: 1 }],
    },
    bake: {
      id: 'bake',
      skill: 'baking',
      name: 'Bake',
      level: 1,
      durationMs: 1000,
      xp: 1,
      uses: [{ item: 'mud', qty: 1 }],
      gives: [{ item: 'pie', qty: 1 }],
    },
    pinch: {
      id: 'pinch',
      skill: 'pinching',
      name: 'A sleeping baker',
      level: 1,
      durationMs: 1000,
      xp: 1,
      gives: [],
      steal: {
        description: '',
        difficulty: 1,
        stunMs: 1000,
        coins: [1, 1],
        loot: [{ item: 'pie', min: 1, max: 1, oneIn: 2 }],
      },
    },
  },
  monsters: { mole: monster('mole', ['tooth', 'gem', 'ghost_item']) },
  shop: { hat: { id: 'hat', item: 'hat', qty: 1, cost: 5 } },
  store: {
    pies: { id: 'pies', item: 'pie', qty: 5, price: 10 },
    cake: { id: 'cake', item: 'cake', qty: 1, price: 100 },
    lamp: { id: 'lamp', price: 10, perk: { name: 'Lamp', description: '' } },
  },
  dungeons: { cave: { id: 'cave', name: 'The Cave', loot: ['coin', 'gem'] } },
};

describe('the collection log', () => {
  it('lists where everything comes from, a heading each, and each thing under every source', () => {
    expect(collectionSources(content)).toEqual([
      { id: 'skills:Gathering', name: 'Gathering', items: ['mud', 'worm'] },
      { id: 'skills:Artisan', name: 'Artisan', items: ['pie'] },
      // An item the tables do not hold is left out.
      { id: 'monster:mole', name: 'The mole', items: ['tooth', 'gem'] },
      { id: 'mark:pinch', name: 'A sleeping baker', items: ['pie'] },
      { id: 'bounty_shop', name: 'The bounty shop', items: ['hat'] },
      { id: 'dungeon:cave', name: 'The Cave', items: ['coin', 'gem'] },
      // The store lists only what nothing else gives.
      { id: 'store', name: 'The general store', items: ['cake'] },
    ]);
    expect(collectable(content)).toEqual([
      'mud',
      'worm',
      'pie',
      'tooth',
      'gem',
      'hat',
      'coin',
      'cake',
    ]);
  });

  it('finds what is held anywhere: the bank, worn, the food slot and the potion working', () => {
    const state: GameState = {
      ...newGame('Cody', 0),
      bank: { mud: 2 },
      equipment: { head: { item: 'hat', qty: 1 } },
      food: { item: 'pie', qty: 3 },
      potion: { item: 'tonic', charges: 4 },
    };
    expect(heldIds(state)).toEqual(['mud', 'hat', 'pie', 'tonic']);
    expect(noteFinds(state).collection).toEqual(['mud', 'hat', 'pie', 'tonic']);
  });

  it('adds only what is new, in the order found, and keeps what has gone', () => {
    const before: GameState = { ...newGame('Cody', 0), collection: ['gem', 'mud'], bank: {} };
    // Nothing new: the very same state back, so nothing needs saving or drawing.
    expect(noteFinds(before)).toBe(before);
    const after = noteFinds({ ...before, bank: { worm: 1, mud: 4, pie: 1 } });
    expect(after.collection).toEqual(['gem', 'mud', 'worm', 'pie']);
  });

  it('counts what has been found of each source', () => {
    const state = { ...newGame('Cody', 0), collection: ['gem', 'coin', 'mud'] };
    const counts = collectionSources(content).map((source) => foundIn(state, source));
    expect(counts).toEqual([1, 0, 1, 0, 0, 2, 0]);
  });

  it('misses nothing made in time however the time is cut', () => {
    const started = startAction({ ...newGame('Cody', 0), bank: { mud: 3 } }, 'bake', content);
    if (!started.ok) throw new Error(started.reason);
    const noted = noteFinds(started.state);
    // Every pie made in a stretch is still in the bank at its end.
    const whole = noteFinds(advance(noted, 5000, content));
    let cut = noted;
    for (const ms of [700, 1300, 1000, 2000]) cut = noteFinds(advance(cut, ms, content));
    expect(whole.collection).toEqual(['mud', 'pie']);
    expect(cut.collection).toEqual(whole.collection);
  });
});

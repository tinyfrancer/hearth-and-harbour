/*
 * The grotto's cast: who fights in it, with their numbers and what they
 * drop. These are dungeon-only for now, so they live here with the dungeon
 * and not in the idle game's tables (a later session makes the dungeon
 * idle-able and may move them). They are rows in the idle game's own shape,
 * so the idle game's formulas (`hitChance`, the max hit, XP per damage) work
 * on them unchanged.
 *
 * How each one moves and what its heavy attack is are in `foes.ts`. The
 * numbers were set by playing the whole grotto with a scripted hero in
 * `tests/scene/grottoRun.test.ts`: a character at the end of tier 1 clears
 * it, and one at half that strength does not.
 */
import type { MonsterDef } from '../core/content';

/** The id `RunSpoils.cleared` gives for a clear, and the area the cast belongs to. */
export const GROTTO_ID = 'brinebeards_grotto';

/** One of several things, or none: rolled once a kill, one chance in `oneIn` that it is any. */
export interface PickDrop {
  readonly items: readonly string[];
  readonly oneIn: number;
}

/** A dungeon monster's row: the idle shape, and a drop that is one thing or another. */
export interface CastDef extends MonsterDef {
  readonly pick?: PickDrop;
}

const cast = (rows: Record<string, Omit<CastDef, 'id' | 'area'>>): Record<string, CastDef> =>
  Object.fromEntries(
    Object.entries(rows).map(([id, row]) => [id, { id, area: GROTTO_ID, ...row }]),
  );

export const GROTTO_CAST: Readonly<Record<string, CastDef>> = cast({
  deckhand: {
    name: 'Deckhand',
    description: 'A boathook, a grudge and very little else.',
    level: 16,
    hp: 30,
    attack: 54,
    defence: 36,
    maxHit: 8,
    speedMs: 2400,
    coins: [0, 0],
    always: [{ item: 'doubloon', min: 1, max: 2 }],
    rare: [
      { item: 'pirate_cutlass', min: 1, max: 1, oneIn: 30 },
      { item: 'boarding_axe', min: 1, max: 1, oneIn: 45 },
    ],
  },
  powder_monkey: {
    name: 'Powder monkey',
    description: 'Small, quick and far too pleased about the fuses.',
    level: 14,
    hp: 22,
    attack: 44,
    defence: 34,
    maxHit: 6,
    speedMs: 2000,
    coins: [0, 0],
    always: [{ item: 'doubloon', min: 1, max: 2 }],
    rare: [{ item: 'tricorn', min: 1, max: 1, oneIn: 20 }],
  },
  giant_crab: {
    name: 'Giant crab',
    description: 'The size of a rowing boat, and about as easy to argue with.',
    level: 18,
    hp: 52,
    attack: 50,
    defence: 50,
    maxHit: 8,
    speedMs: 3000,
    coins: [0, 0],
    always: [{ item: 'doubloon', min: 1, max: 3 }],
    rare: [{ item: 'pearl', min: 1, max: 2, oneIn: 5 }],
  },
  ships_parrot: {
    name: 'Ship’s parrot',
    description: 'Knows every word the crew knows, and shouts them at you.',
    level: 15,
    hp: 18,
    attack: 58,
    defence: 56,
    maxHit: 3,
    speedMs: 2000,
    coins: [0, 0],
    always: [
      { item: 'feathers', min: 2, max: 4 },
      { item: 'doubloon', min: 1, max: 3 },
    ],
    rare: [],
  },
  brinebeard: {
    name: 'Captain Brinebeard',
    description: 'Terror of the coast, by his own account.',
    level: 22,
    hp: 180,
    attack: 64,
    defence: 50,
    maxHit: 12,
    speedMs: 2800,
    coins: [0, 0],
    always: [{ item: 'doubloon', min: 8, max: 14 }],
    rare: [
      { item: 'brinebeards_anchor', min: 1, max: 1, oneIn: 30 },
      { item: 'ships_figurehead', min: 1, max: 1, oneIn: 20 },
    ],
    pick: { items: ['captains_coat', 'spyglass'], oneIn: 2 },
  },
});

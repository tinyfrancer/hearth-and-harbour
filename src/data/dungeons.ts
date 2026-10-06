import type { DungeonDef } from '../core/content';

// The dungeons, as far as the idle rules know them: their loot and their cast
// with its numbers. The rooms are the scene's (src/scene), which reports a
// clear by these ids. The cast's rows are also in src/scene/cast.ts, which the
// scene still fights by today; tests/data/content.test.ts holds the two the
// same until the scene reads them from here (see docs/status/lane-a.md).
export const DUNGEONS = {
  brinebeards_grotto: {
    id: 'brinebeards_grotto',
    name: 'Brinebeard’s Grotto',
    loot: [
      'doubloon',
      'pirate_cutlass',
      'boarding_axe',
      'tricorn',
      'captains_coat',
      'spyglass',
      'brinebeards_anchor',
      'ships_figurehead',
    ],
    // Weakest first and the captain last, as the bestiary lists them.
    cast: [
      {
        id: 'powder_monkey',
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
      {
        id: 'ships_parrot',
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
      {
        id: 'deckhand',
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
      {
        id: 'giant_crab',
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
      {
        id: 'brinebeard',
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
    ],
  },
} satisfies Record<string, DungeonDef>;

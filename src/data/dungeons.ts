import type { DungeonDef } from '../core/content';

// The dungeons, as far as the idle rules know them: where each sits on the
// harbour chart, what opens it, its loot, and its cast with their numbers.
// The rooms are the scene's (src/scene), which fights the cast by these rows
// and reports a clear by these ids. Status for the chart and the menus comes
// from `dungeonStatus` (src/core/dungeons.ts).
export const DUNGEONS = {
  // The lesson (Cody's #21): two short rooms and a small boss, for a brand-new
  // character in no armour and with no food. Its numbers are the cave's own:
  // its dock rats and sand crabs are the creatures of the same ids on the
  // tables (one bestiary entry each, kills and bounties counted there as
  // anywhere), but weaker here, as befits a first fight. A landed blow from a
  // level-1 character with bare hands does 1, so hit points are blows needed.
  // tests/data/tidepool.test.ts holds that standing still in the first room
  // cannot knock that character out, that the whole cave is cleared with
  // health to spare dodging most heavy blows, and that it is no farm.
  tidepool_cave: {
    id: 'tidepool_cave',
    name: 'Tidepool Cave',
    description: 'A shallow cave under the quay: somewhere to find your feet before the open sea.',
    order: 1,
    recommended: 1,
    unlock: { kind: 'none' },
    unlockText: 'Open from the start.',
    // Once: a first blade, and a few fish to learn eating with next time.
    firstClear: [
      { item: 'bronze_sword', qty: 1 },
      { item: 'cooked_shrimp', qty: 5 },
    ],
    loot: ['seashells', 'hide', 'pearl', 'bronze_sword', 'cooked_shrimp'],
    // Weakest first and the boss last, as the bestiary lists them. Drops are
    // among the table rows' own (`DungeonDef.cast`), so what is seen is kept.
    cast: [
      {
        id: 'dock_rat',
        name: 'Dock rat',
        description: 'Bold as brass and twice as greasy.',
        level: 1,
        hp: 4,
        attack: 1,
        defence: 1,
        maxHit: 1,
        speedMs: 3000,
        coins: [1, 2],
        always: [],
        rare: [{ item: 'hide', min: 1, max: 1, oneIn: 4 }],
      },
      {
        id: 'sand_crab',
        name: 'Sand crab',
        description: 'Sideways, stubborn, and always somewhere underfoot.',
        level: 1,
        hp: 4,
        attack: 1,
        defence: 2,
        maxHit: 1,
        speedMs: 3600,
        coins: [1, 2],
        always: [{ item: 'seashells', min: 1, max: 1 }],
        rare: [],
      },
      {
        id: 'old_snapper',
        name: 'Old Snapper',
        description:
          'Older than the quay, slower than the tide, and in no mood to move for either.',
        level: 2,
        hp: 12,
        attack: 2,
        defence: 2,
        maxHit: 1,
        speedMs: 3600,
        coins: [4, 8],
        always: [{ item: 'seashells', min: 1, max: 2 }],
        rare: [{ item: 'pearl', min: 1, max: 1, oneIn: 40 }],
      },
    ],
  },
  // The first real dungeon. Nothing gates it but advice: a character at the
  // end of tier 1 clears it (tests/scene/grottoRun.test.ts).
  brinebeards_grotto: {
    id: 'brinebeards_grotto',
    name: 'Brinebeard’s Grotto',
    description: 'A pirate crew’s sea cave, where the tide decides where you can stand.',
    order: 2,
    recommended: 20,
    unlock: { kind: 'none' },
    unlockText: 'Open from the start, for those ready for it.',
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
  // Landings to come: silhouettes on the chart with what will open them. Their
  // ids are placeholders, renamed when each is designed (no save can hold a
  // clear of one, so nothing needs migrating).
  uncharted_1: {
    id: 'uncharted_1',
    name: 'Uncharted',
    description: 'Not yet charted.',
    order: 3,
    recommended: 40,
    unlock: { kind: 'cleared', dungeon: 'brinebeards_grotto' },
    unlockText: 'Clear Brinebeard’s Grotto.',
    comingSoon: true,
    loot: [],
  },
  uncharted_2: {
    id: 'uncharted_2',
    name: 'Uncharted',
    description: 'Not yet charted.',
    order: 4,
    recommended: 60,
    unlock: { kind: 'cleared', dungeon: 'uncharted_1' },
    unlockText: 'Clear the landing before it.',
    comingSoon: true,
    loot: [],
  },
} satisfies Record<string, DungeonDef>;

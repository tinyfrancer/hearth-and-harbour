import type { DungeonDef, ModifierDef } from '../core/content';

// What a day can do to a dungeon (S16). Each dungeon draws its days from a
// pool of these (`DungeonDef.modifiers`), every one in turn, shuffled each
// time round (`dailyModifier`, src/core/progress.ts). The learning cave draws
// only kind ones: easier, or more found, never harder. Every other is a trade,
// harder and paid for it, and each has a catch the idle game feels too (not
// only the tide or the lamps, which it has none of), so none is a free gift
// to a hero sent through unattended. tests/data/content.test.ts holds both.
export const DUNGEON_MODIFIERS = {
  // Kind: for the Tidepool Cave.
  slack_tide: {
    id: 'slack_tide',
    name: 'Slack Tide',
    text: 'Not a ripple. Everything in the pools is half asleep.',
    effects: { foeSpeed: 0.8 },
    kind: true,
  },
  rich_pickings: {
    id: 'rich_pickings',
    name: 'Rich Pickings',
    text: 'The night tide left more than usual lying about.',
    effects: { loot: 1.5, coins: 1.5 },
    kind: true,
  },
  // Trades: for Brinebeard’s Grotto.
  thick_skulls: {
    id: 'thick_skulls',
    name: 'Thick Skulls',
    text: 'The crew slept well for once, and it shows.',
    effects: { foeHealth: 1.3, xp: 1.3 },
  },
  angry_crew: {
    id: 'angry_crew',
    name: 'An Angry Crew',
    text: 'Somebody told the crew what you said about their boat.',
    effects: { foeDamage: 1.3, loot: 1.3 },
  },
  quick_tempers: {
    id: 'quick_tempers',
    name: 'Quick Tempers',
    text: 'A double rum went round at breakfast. Everyone is very fast and very loud.',
    effects: { foeSpeed: 1.25, xp: 1.15, loot: 1.15 },
  },
  spring_tide: {
    id: 'spring_tide',
    name: 'Spring Tide',
    text: 'The moon is full and the sea is in a hurry.',
    effects: { tideFaster: 1.5, foeDamage: 1.1, loot: 1.35 },
  },
  no_rations: {
    id: 'no_rations',
    name: 'No Rations',
    text: 'Gulls got into your pack on the way over. Every last crumb.',
    effects: { noFood: true, xp: 1.2, loot: 1.25 },
  },
  unlit_lamps: {
    id: 'unlit_lamps',
    name: 'Unlit Lamps',
    text: 'Someone forgot the lamp oil. Mind your swing.',
    effects: { darker: true, heroDamage: 0.85, xp: 1.25 },
  },
} satisfies Record<string, ModifierDef>;

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
  // Wave 16, lane C's measure of the scene: these give its scripted novice a
  // run of two and a half minutes and a real need to eat (lowest 7 to 15 of 20
  // hit points), where wave 15's cleared in under two, barely hurt.
  // tests/data/tidepool.test.ts holds that standing still in the first room
  // cannot knock that character out, that the whole cave is cleared with
  // health to spare dodging most heavy blows and eating the fish found on the
  // way, that it hurts enough to need them, and that it is no farm.
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
        hp: 6,
        attack: 4,
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
        hp: 6,
        attack: 5,
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
        hp: 18,
        attack: 5,
        defence: 2,
        maxHit: 2,
        speedMs: 3600,
        coins: [4, 8],
        always: [{ item: 'seashells', min: 1, max: 2 }],
        rare: [{ item: 'pearl', min: 1, max: 1, oneIn: 40 }],
      },
    ],
    // Its days are only ever kind to a newcomer.
    modifiers: ['slack_tide', 'rich_pickings'],
    // Gentle goals for a return visit, each practising something the cave
    // teaches. (Their ids name what lane B's icons draw: a clock, an unhurt
    // hero, an empty plate, the boss.)
    challenges: [
      {
        id: 'tidepool_cave.quick',
        name: 'Brisk',
        text: 'Clear the cave in two minutes or less.',
        rule: { kind: 'atMost', stat: 'timeMs', n: 120_000 },
        reward: { coins: 250, bountyPoints: 2 },
      },
      {
        id: 'tidepool_cave.unhurt',
        name: 'Mostly in One Piece',
        text: 'Clear the cave taking no more than 10 damage.',
        rule: { kind: 'atMost', stat: 'damageTaken', n: 10 },
        reward: { coins: 250, bountyPoints: 2 },
      },
      {
        id: 'tidepool_cave.no_food',
        name: 'Packed Lunch, Uneaten',
        text: 'Clear the cave without eating a thing.',
        rule: { kind: 'atMost', stat: 'foodEaten', n: 0 },
        reward: { coins: 100, items: [{ item: 'cooked_shrimp', qty: 5 }] },
      },
      {
        id: 'tidepool_cave.snapper_dodge',
        name: 'Out of the Snapper’s Way',
        text: 'Clear the cave having stepped out of three heavy blows.',
        rule: { kind: 'atLeast', stat: 'stepOuts', n: 3 },
        reward: { coins: 150 },
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
    // Its first clear opens the next tier of idle content (plan S22, not built yet).
    opens: {
      tier: 2,
      brings:
        'deep-water fishing, driftwood, salt-iron to mine and smith, richer pockets to pick and somewhere new to fight',
    },
    modifiers: [
      'thick_skulls',
      'angry_crew',
      'quick_tempers',
      'spring_tide',
      'no_rations',
      'unlit_lamps',
    ],
    // Real goals: a careful player at the end of tier 1 clears it in seven to
    // ten minutes, eating everything brought and taking 290 to 480 damage
    // all told (tests/scene/grottoRun.test.ts), so none comes with a first clear.
    challenges: [
      {
        id: 'brinebeards_grotto.swift',
        name: 'Ahead of the Tide',
        text: 'Clear the grotto in seven minutes or less.',
        rule: { kind: 'atMost', stat: 'timeMs', n: 420_000 },
        reward: { coins: 6000, bountyPoints: 10 },
      },
      {
        id: 'brinebeards_grotto.no_food',
        name: 'Hard Tack',
        text: 'Clear the grotto without eating a thing.',
        rule: { kind: 'atMost', stat: 'foodEaten', n: 0 },
        reward: { coins: 8000, bountyPoints: 10 },
      },
      {
        id: 'brinebeards_grotto.nearly_unhurt',
        name: 'Barely a Scratch',
        text: 'Clear the grotto taking no more than 150 damage.',
        rule: { kind: 'atMost', stat: 'damageTaken', n: 150 },
        reward: { coins: 6000, bountyPoints: 10 },
      },
      {
        id: 'brinebeards_grotto.spring_tide',
        name: 'Spring Tide Sailor',
        text: 'Clear the grotto on a day of the Spring Tide.',
        rule: { kind: 'withModifier', id: 'spring_tide' },
        reward: { coins: 4000, bountyPoints: 5 },
      },
    ],
  },
  // Landings to come: silhouettes on the chart with what will open them, by
  // the ids lane B's chart has landings for (`harbourChart2`). Their ids are
  // placeholders, renamed when each is designed (no save can hold a
  // clear of one, so nothing needs migrating).
  unknown_1: {
    id: 'unknown_1',
    name: 'Uncharted',
    description: 'Not yet charted.',
    order: 3,
    recommended: 40,
    unlock: { kind: 'cleared', dungeon: 'brinebeards_grotto' },
    unlockText: 'Clear Brinebeard’s Grotto.',
    comingSoon: true,
    opens: { tier: 3, brings: 'the third tier' },
    loot: [],
  },
  unknown_2: {
    id: 'unknown_2',
    name: 'Uncharted',
    description: 'Not yet charted.',
    order: 4,
    recommended: 60,
    unlock: { kind: 'cleared', dungeon: 'unknown_1' },
    unlockText: 'Clear the landing before it.',
    comingSoon: true,
    opens: { tier: 4, brings: 'the fourth tier' },
    loot: [],
  },
  unknown_3: {
    id: 'unknown_3',
    name: 'Uncharted',
    description: 'Not yet charted.',
    order: 5,
    recommended: 80,
    unlock: { kind: 'cleared', dungeon: 'unknown_2' },
    unlockText: 'Clear the landing before it.',
    comingSoon: true,
    loot: [],
  },
} satisfies Record<string, DungeonDef>;

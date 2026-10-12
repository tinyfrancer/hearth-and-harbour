import type { DungeonDef, ModifierDef } from '../core/content';

// What a day can do to a dungeon (S16). Each dungeon draws its days from a
// pool of these (`DungeonDef.modifiers`), every one in turn, shuffled each
// time round (`dailyModifier`, src/core/progress.ts). The learning cave draws
// only kind ones: easier, or more found, never harder. Every other is a fair
// trade, harder in a way of its own and paid for it, and a hero sent through
// idle plays it plain (`idleModifier`). tests/data/content.test.ts holds both.
//
// Wave 18: the grotto is balanced on what is brought to eat (its careful
// player eats 19 of his 20 cod on a plain day), so a day that costs much more
// health is a wall, not a trade. Each trade now costs one thing (a longer
// clear, more damage, or more food) and gives most of it back another way;
// wave 17's were a quarter to a third harder outright and cleared 0 to 9 of
// 12. Measured by lane C's careful player at combat 20 on its twelve seeds
// (tests/scene/modifierRun.test.ts) and on 48: each clears about as often as
// a plain day, and pays 1.0 to 1.3 times a plain day's hour by hand
// (tests/data/pacing.test.ts).
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
  // A longer clear: tougher, and slower to swing.
  thick_skulls: {
    id: 'thick_skulls',
    name: 'Thick Skulls',
    text: 'The crew slept well for once: hard to put down, and slow to get going.',
    effects: { foeHealth: 1.2, foeSpeed: 0.8, xp: 1.2, loot: 1.15 },
  },
  // More damage: harder blows, from a crew too cross to mind itself.
  angry_crew: {
    id: 'angry_crew',
    name: 'An Angry Crew',
    text: 'Somebody told the crew what you said about their boat. They swing hard and wild.',
    effects: { foeDamage: 1.1, foeHealth: 0.95, loot: 1.1 },
  },
  // More damage: more blows, from a crew not quite steady on its feet.
  quick_tempers: {
    id: 'quick_tempers',
    name: 'Quick Tempers',
    text: 'A double rum went round at breakfast. Everyone is very fast, very loud and a little wobbly.',
    effects: { foeSpeed: 1.1, foeHealth: 0.93, xp: 1.15 },
  },
  // More damage and a longer clear: less dry ground, for less long.
  spring_tide: {
    id: 'spring_tide',
    name: 'Spring Tide',
    text: 'The moon is full and the sea is in a hurry.',
    effects: { tideFaster: 1.25, loot: 1.25 },
  },
  // More food: each bite goes less far, but the crew is hungry too. (It
  // replaces wave 17's No Rations, which no careful player could clear.)
  short_rations: {
    id: 'short_rations',
    name: 'Short Rations',
    text: 'Gulls got into every larder on the coast. Your food goes less far, and the crew has less fight in it.',
    effects: { foodHeals: 0.8, foeHealth: 0.9, loot: 1.1 },
  },
  // A longer clear: softer blows in the dark, from both sides.
  unlit_lamps: {
    id: 'unlit_lamps',
    name: 'Unlit Lamps',
    text: 'Someone forgot the lamp oil. Mind your swing; they can hardly see you either.',
    effects: { darker: true, heroDamage: 0.85, foeSpeed: 0.9, xp: 1.25, loot: 1.1 },
  },
  // Trades: for Thistlewood Burrow, each the grotto's trade of the same shape
  // in the burrow's own words (and the grotto's Short Rations, shared).
  thick_caps: {
    id: 'thick_caps',
    name: 'Thick Caps',
    text: 'A wet night: every cap in the warren is plump, tough and slow to get moving.',
    effects: { foeHealth: 1.2, foeSpeed: 0.8, xp: 1.2, loot: 1.15 },
  },
  fierce_brambles: {
    id: 'fierce_brambles',
    name: 'Fierce Brambles',
    text: 'The thorns grew long overnight. Everything in the burrow bites harder and bends easier.',
    effects: { foeDamage: 1.1, foeHealth: 0.95, loot: 1.1 },
  },
  swift_hounds: {
    id: 'swift_hounds',
    name: 'Swift Hounds',
    text: 'Something has the whole warren running about: quick, careless and easier to knock over.',
    effects: { foeSpeed: 1.1, foeHealth: 0.93, xp: 1.15 },
  },
  deep_gloom: {
    id: 'deep_gloom',
    name: 'Deep Gloom',
    text: 'The moths have had every lamp. Swing carefully; nobody down there can see much either.',
    effects: { darker: true, heroDamage: 0.85, foeSpeed: 0.9, xp: 1.25, loot: 1.1 },
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
    // Run idle once cleared (src/core/idleRun.ts): the scene's rooms as it
    // meets them (a rat; three rats under the pool, then two crabs by the far
    // door; the snapper), at a stroll, and the row home and back between runs.
    // tests/data/pacing.test.ts holds it below play by hand and below the
    // rats idle at level 1.
    idle: {
      rooms: [
        { foes: ['dock_rat'], walkMs: 8000 },
        { foes: ['dock_rat', 'dock_rat', 'dock_rat'], walkMs: 8000 },
        { foes: ['sand_crab', 'sand_crab'], walkMs: 4000 },
        { foes: ['old_snapper'], walkMs: 8000 },
      ],
      tripMs: 60_000,
      lootPercent: 50,
    },
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
    // Run idle once cleared (src/core/idleRun.ts): the scene's rooms in order,
    // in the groups their places put together (src/scene/grotto.ts): the two
    // crabs; the store's three spread along it, met one by one; the parrot on
    // its perch before the three deckhands by the far door; the brig's two
    // waves; and in the cove the two who come ashore (at two thirds of the
    // captain's health in the scene) met with him, and dealt with first. The
    // trophies and the anchor are only ever found by hand (docs/design.md).
    // tests/data/pacing.test.ts holds it below play by hand and below the best
    // idle fight at level 20.
    idle: {
      rooms: [
        { foes: ['giant_crab', 'giant_crab'], walkMs: 15_000 },
        { foes: ['deckhand'], walkMs: 10_000 },
        { foes: ['deckhand'], walkMs: 6000 },
        { foes: ['powder_monkey'], walkMs: 5000 },
        { foes: ['ships_parrot'], walkMs: 10_000 },
        { foes: ['deckhand', 'deckhand', 'deckhand'], walkMs: 8000 },
        { foes: ['deckhand', 'deckhand'], walkMs: 10_000 },
        { foes: ['deckhand', 'powder_monkey'], walkMs: 3000 },
        { foes: ['deckhand', 'deckhand', 'brinebeard'], walkMs: 15_000 },
      ],
      tripMs: 120_000,
      lootPercent: 50,
      activeOnly: ['brinebeards_anchor', 'ships_figurehead'],
    },
    modifiers: [
      'thick_skulls',
      'angry_crew',
      'quick_tempers',
      'spring_tide',
      'short_rations',
      'unlit_lamps',
    ],
    // Real goals, a ladder of them: a careful player at the end of tier 1
    // clears it in seven to ten minutes, eating everything brought and losing
    // 260 to 480 hit points to blows (tests/scene/grottoRun.test.ts), so none
    // but the Spring Tide comes with a first clear. Lane C's careful player
    // (twelve seeds, 30 cod; damage is to blows, never the sea's wash) meets
    // Ahead of the Tide once at combat 20 and 9 times at 25; Light on the
    // Bandages once at 25, 4 times at 30 and 8 at 35; Hard Tack, which its
    // text says is for a seasoned fighter, 4 times at 40, 9 at 45 and every
    // time at 50; the Spring Tide on 10 of 12 such days at 20.
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
        text: 'Clear the grotto without eating a thing. One for a seasoned fighter: combat 45 or so.',
        rule: { kind: 'atMost', stat: 'foodEaten', n: 0 },
        reward: { coins: 8000, bountyPoints: 10 },
      },
      {
        id: 'brinebeards_grotto.nearly_unhurt',
        name: 'Light on the Bandages',
        text: 'Clear the grotto losing no more than 250 hit points to blows.',
        rule: { kind: 'atMost', stat: 'damageTaken', n: 250 },
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
  // The second real dungeon (plan S23), opened by the grotto's first clear and
  // the gate to tier 3. Coming soon this wave: a silhouette on the chart (the
  // scene lands it on the spare `unknown_1` spot), its name never shown, but
  // its cast, loot, days and challenges are real rows, so lane C can build and
  // balance against them. The cast's ids are the shared contract with lanes B
  // and C (docs/tier2-manifest.md).
  //
  // First-pass numbers, for a combat-40 hero in full salt-iron eating tier 2's
  // fish, scaled from the grotto's balance at combat 20 in iron: the hero's
  // defence rating is about 1.7 times as high (so the foes' attack too), his
  // attack rating about 1.6 times, his hit points and max hit about 1.85
  // times (so the foes' max hits and hit points). Aimed at an 8 to 10 minute
  // run; lane C measures with a scripted player and sends back what works.
  // Its idle rooms wait for lane C's plan.
  thistlewood_burrow: {
    id: 'thistlewood_burrow',
    name: 'Thistlewood Burrow',
    description:
      'A warren under the old forest, overgrown and lamplit, where something takes visitors very personally.',
    order: 3,
    recommended: 40,
    unlock: { kind: 'cleared', dungeon: 'brinebeards_grotto' },
    unlockText: 'Clear Brinebeard’s Grotto.',
    comingSoon: true,
    firstClear: [
      { item: 'amber', qty: 10 },
      { item: 'cooked_swordfish', qty: 10 },
    ],
    loot: [
      'amber',
      'duskbloom',
      'thick_hide',
      'cooked_swordfish',
      'thornwood_bow',
      'capguard_helm',
      'badger_crown',
    ],
    // Weakest first and the king last, as the bestiary lists them. Each pays tier 2's rate of
    // XP (`xpPercent`, as tier 2's monsters do): the scene should pay it through `foeXp`.
    cast: [
      {
        id: 'spore_puff',
        name: 'Spore puff',
        description: 'Knee-high, round and cheerful, right up until it bursts.',
        level: 34,
        hp: 40,
        attack: 80,
        defence: 60,
        maxHit: 8,
        speedMs: 2000,
        xpPercent: 270,
        coins: [0, 0],
        always: [{ item: 'amber', min: 1, max: 2 }],
        rare: [{ item: 'duskbloom', min: 1, max: 2, oneIn: 6 }],
      },
      {
        id: 'lantern_moth',
        name: 'Lantern moth',
        description: 'Drawn to every light in the warren, and determined to put it out.',
        level: 36,
        hp: 36,
        attack: 100,
        defence: 95,
        maxHit: 6,
        speedMs: 2000,
        xpPercent: 270,
        coins: [0, 0],
        always: [{ item: 'amber', min: 1, max: 2 }],
        rare: [],
      },
      {
        id: 'cap_guard',
        name: 'Cap guard',
        description: 'Stands behind its own hat, which is wider than it is, and means business.',
        level: 38,
        hp: 60,
        attack: 95,
        defence: 70,
        maxHit: 14,
        speedMs: 2400,
        xpPercent: 270,
        coins: [0, 0],
        always: [{ item: 'amber', min: 1, max: 2 }],
        rare: [{ item: 'capguard_helm', min: 1, max: 1, oneIn: 25 }],
      },
      {
        id: 'bramble_hound',
        name: 'Bramble hound',
        description: 'A dog-shaped tangle of thorns that has never once fetched anything back.',
        level: 40,
        hp: 95,
        attack: 92,
        defence: 85,
        maxHit: 15,
        speedMs: 2400,
        xpPercent: 270,
        coins: [0, 0],
        always: [
          { item: 'amber', min: 1, max: 3 },
          { item: 'thick_hide', min: 1, max: 2 },
        ],
        rare: [{ item: 'thornwood_bow', min: 1, max: 1, oneIn: 40 }],
      },
      {
        id: 'badger_king',
        name: 'The Badger King',
        description: 'Lord of the burrow, by his own decree, and deeply offended by yours.',
        level: 44,
        hp: 340,
        attack: 115,
        defence: 90,
        maxHit: 22,
        speedMs: 2800,
        xpPercent: 270,
        coins: [0, 0],
        always: [{ item: 'amber', min: 8, max: 14 }],
        rare: [{ item: 'badger_crown', min: 1, max: 1, oneIn: 20 }],
        pick: { items: ['thornwood_bow', 'capguard_helm'], oneIn: 2 },
      },
    ],
    opens: { tier: 3, brings: 'the third tier' },
    modifiers: ['thick_caps', 'fierce_brambles', 'swift_hounds', 'short_rations', 'deep_gloom'],
    // Real goals, as the grotto's: none expected of a first clear. Their ids
    // name what lane B's icons draw (a clock, an unhurt hero, an empty plate,
    // a step aside).
    challenges: [
      {
        id: 'thistlewood_burrow.swift',
        name: 'Quick Through the Warren',
        text: 'Clear the burrow in eight minutes or less.',
        rule: { kind: 'atMost', stat: 'timeMs', n: 480_000 },
        reward: { coins: 12_000, bountyPoints: 10 },
      },
      {
        id: 'thistlewood_burrow.nearly_unhurt',
        name: 'Barely Brambled',
        text: 'Clear the burrow losing no more than 450 hit points to blows.',
        rule: { kind: 'atMost', stat: 'damageTaken', n: 450 },
        reward: { coins: 12_000, bountyPoints: 10 },
      },
      {
        id: 'thistlewood_burrow.no_food',
        name: 'Nothing from the Larder',
        text: 'Clear the burrow without eating a thing. One for a seasoned fighter: combat 60 or so.',
        rule: { kind: 'atMost', stat: 'foodEaten', n: 0 },
        reward: { coins: 15_000, bountyPoints: 10 },
      },
      {
        id: 'thistlewood_burrow.badger_dodge',
        name: 'Out of the King’s Way',
        text: 'Clear the burrow having stepped out of eight heavy blows.',
        rule: { kind: 'atLeast', stat: 'stepOuts', n: 8 },
        reward: { coins: 8000, bountyPoints: 5 },
      },
    ],
  },
  // Landings to come: silhouettes on the chart with what will open them, by
  // the ids lane B's chart has landings for (`harbourChart2`). Their ids are
  // placeholders, renamed when each is designed (no save can hold a
  // clear of one, so nothing needs migrating).
  unknown_2: {
    id: 'unknown_2',
    name: 'Uncharted',
    description: 'Not yet charted.',
    order: 4,
    recommended: 60,
    unlock: { kind: 'cleared', dungeon: 'thistlewood_burrow' },
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

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
  // in the burrow's own words, a little milder (wave 21, lane C's measure on
  // real tier-2 gear over 48 seeds, #96): the burrow's dark and its king
  // already cost a careful player more than the grotto's tide, and at the
  // grotto's strengths its days cleared 36 to 45 of 48 against a plain 46.
  // Milder, each clears 40 to 46 and is still harder in the way it says.
  // Rewards are the grotto's.
  thick_caps: {
    id: 'thick_caps',
    name: 'Thick Caps',
    text: 'A wet night: every cap in the warren is plump, tough and slow to get moving.',
    effects: { foeHealth: 1.15, foeSpeed: 0.8, xp: 1.2, loot: 1.15 },
  },
  fierce_brambles: {
    id: 'fierce_brambles',
    name: 'Fierce Brambles',
    text: 'The thorns grew long overnight. Everything in the burrow bites harder and bends easier.',
    effects: { foeDamage: 1.07, foeHealth: 0.95, loot: 1.1 },
  },
  swift_hounds: {
    id: 'swift_hounds',
    name: 'Swift Hounds',
    text: 'Something has the whole warren running about, quick on its feet and quicker to bite.',
    effects: { foeSpeed: 1.08, xp: 1.15 },
  },
  // The burrow's own rations day, in place of the grotto's Short Rations
  // (which is right there, and stays): the same fish going less far, but a
  // warren far weaker for it, as the king's long fight would otherwise eat
  // the larder (36 of 48 at Short Rations' strengths; 46 so). Its id says
  // "rations" so lane B's icon draws the same plate. It pays in XP, not loot:
  // weaker foes make a quicker run and less XP a run, and with Short Rations'
  // extra loot as well an hour by hand earned 1.40 times a plain day's.
  lean_rations: {
    id: 'lean_rations',
    name: 'Lean Rations',
    text: 'A thin season under the forest. Your food goes less far, and the whole warren is half-starved and wobbly with it.',
    effects: { foodHeals: 0.8, foeHealth: 0.75, xp: 1.1 },
  },
  deep_gloom: {
    id: 'deep_gloom',
    name: 'Deep Gloom',
    text: 'The moths have had every lamp. Swing carefully; nobody down there can see much either.',
    // Lane C's measure: the burrow's dark already softens his blows, so its own darker day
    // asks less of them than the grotto's 0.85 (0.9 in wave 20, 0.95 since #96).
    effects: { darker: true, heroDamage: 0.95, foeSpeed: 0.9, xp: 1.25, loot: 1.1 },
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
    // Its first clear opens tier 2 (plan S22) and Thistlewood Burrow (by its `unlock`).
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
  // the gate to tier 3. Charted since wave 20, when lane C called it ready to
  // play (it waited a wave as a silhouette, its rows real so lanes B and C
  // could build against them). The cast's ids are the shared contract with
  // lanes B and C (docs/tier2-manifest.md).
  //
  // Wave 20: the cast's numbers are lane C's, measured by its careful player
  // against the burrow's own rules (the dark, the guards' blocks, the king's
  // calls already cost what wave 19's extra health and accuracy were for):
  // level 40 in salt-iron with 20 cooked swordfish clears most seeds in about
  // nine minutes, level 30 about a third (tests/scene/burrowRun.test.ts).
  // Wave 21 (#96), measured again on real tier-2 gear (the plate is worn at
  // Defence 30, so a level-30 hero is nearly as well armoured as one at 40):
  // thicker hides and a little less health, so ten levels tell in how often
  // a blow gets through. Careful at 40 clears 46 of 48 seeds in a median 8.8
  // minutes, never lighting a lantern 8, careful at 30 14.
  thistlewood_burrow: {
    id: 'thistlewood_burrow',
    name: 'Thistlewood Burrow',
    description:
      'A warren under the old forest, overgrown and lamplit, where something takes visitors very personally.',
    order: 3,
    recommended: 40,
    unlock: { kind: 'cleared', dungeon: 'brinebeards_grotto' },
    unlockText: 'Clear Brinebeard’s Grotto.',
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
        hp: 23,
        attack: 65,
        defence: 62,
        maxHit: 10,
        speedMs: 2600,
        xpPercent: 270,
        coins: [0, 0],
        always: [{ item: 'amber', min: 2, max: 3 }],
        rare: [{ item: 'duskbloom', min: 1, max: 2, oneIn: 6 }],
      },
      {
        id: 'lantern_moth',
        name: 'Lantern moth',
        description: 'Drawn to every light in the warren, and determined to put it out.',
        level: 35,
        hp: 17,
        attack: 66,
        defence: 72,
        maxHit: 8,
        speedMs: 2000,
        xpPercent: 270,
        coins: [0, 0],
        always: [{ item: 'amber', min: 2, max: 3 }],
        rare: [],
      },
      {
        id: 'cap_guard',
        name: 'Cap guard',
        description: 'Stands behind its own hat, which is wider than it is, and means business.',
        level: 37,
        hp: 39,
        attack: 71,
        defence: 82,
        maxHit: 15,
        speedMs: 2800,
        xpPercent: 270,
        coins: [0, 0],
        always: [{ item: 'amber', min: 2, max: 3 }],
        rare: [{ item: 'capguard_helm', min: 1, max: 1, oneIn: 25 }],
      },
      {
        id: 'bramble_hound',
        name: 'Bramble hound',
        description: 'A dog-shaped tangle of thorns that has never once fetched anything back.',
        level: 38,
        hp: 35,
        attack: 77,
        defence: 69,
        maxHit: 15,
        speedMs: 2200,
        xpPercent: 270,
        coins: [0, 0],
        always: [
          { item: 'amber', min: 2, max: 3 },
          { item: 'thick_hide', min: 1, max: 2 },
        ],
        rare: [{ item: 'thornwood_bow', min: 1, max: 1, oneIn: 40 }],
      },
      {
        id: 'badger_king',
        name: 'The Badger King',
        description: 'Lord of the burrow, by his own decree, and deeply offended by yours.',
        level: 44,
        hp: 205,
        attack: 88,
        defence: 90,
        maxHit: 26,
        speedMs: 2800,
        xpPercent: 270,
        coins: [0, 0],
        always: [{ item: 'amber', min: 10, max: 16 }],
        rare: [{ item: 'badger_crown', min: 1, max: 1, oneIn: 20 }],
        pick: { items: ['thornwood_bow', 'capguard_helm'], oneIn: 2 },
      },
    ],
    opens: { tier: 3, brings: 'levels 40 to 60 in every skill' },
    // Run idle once cleared (src/core/idleRun.ts): lane C's five rooms in
    // order (src/scene/burrow.ts), each met as one group, and in the sett the
    // king with those he calls (two puffs, a moth, a hound), dealt with first.
    // Each walk is slow: he lights the lanterns as he goes (half a minute a
    // room), and the row up the river and back is three minutes; at 12 s and
    // two minutes an hour idle out-paid an hour by hand in XP (wave 20). The
    // crown is a trophy, only ever found by hand (docs/design.md).
    idle: {
      rooms: [
        { foes: ['spore_puff', 'spore_puff', 'spore_puff'], walkMs: 30_000 },
        { foes: ['cap_guard', 'cap_guard', 'spore_puff', 'spore_puff'], walkMs: 30_000 },
        {
          foes: ['lantern_moth', 'lantern_moth', 'spore_puff', 'spore_puff', 'cap_guard'],
          walkMs: 30_000,
        },
        {
          foes: ['bramble_hound', 'bramble_hound', 'lantern_moth', 'spore_puff'],
          walkMs: 30_000,
        },
        {
          foes: ['spore_puff', 'spore_puff', 'lantern_moth', 'bramble_hound', 'badger_king'],
          walkMs: 30_000,
        },
      ],
      tripMs: 180_000,
      lootPercent: 50,
      activeOnly: ['badger_crown'],
    },
    modifiers: ['thick_caps', 'fierce_brambles', 'swift_hounds', 'lean_rations', 'deep_gloom'],
    // Real goals, a ladder of them as the grotto's: none but its own dark day
    // comes with a first clear. Lane C's careful player (tests/scene/
    // burrowBot.ts, 20 swordfish, salt-iron and the cloak; measured on the
    // tables in wave 21, twelve seeds, 48 at level 40) meets Quick Through
    // the Warren on 1 of 48 at combat 40, 7 of 12 at 50 and 9 at 60 (in the
    // full kit, cloak and amulet: 4 at 40, 7 at 45); Barely Brambled on 2 of
    // 48 at 40, 5 of 12 at 50, 8 at 60; Nothing from the Larder, with no fish
    // at all, once at 60, twice at 65 and 5 times at 70 (tier 3's gear will
    // bring it nearer); The King in the Dark on 43 of 48 such days at 40. Their ids
    // name what lane B's icons draw (a clock, an unhurt hero, an empty plate,
    // the king).
    // Wave 21: the fourth was 'badger_dodge' (eight heavy blows stepped out
    // of), which every careful clear meets many times over (47 to 121): never
    // in a save, as the burrow paid nothing while it waited, so replaced.
    challenges: [
      {
        id: 'thistlewood_burrow.swift',
        name: 'Quick Through the Warren',
        text: 'Clear the burrow in seven minutes or less.',
        rule: { kind: 'atMost', stat: 'timeMs', n: 420_000 },
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
        text: 'Clear the burrow without eating a thing. One for a seasoned fighter: combat 70 or so.',
        rule: { kind: 'atMost', stat: 'foodEaten', n: 0 },
        reward: { coins: 15_000, bountyPoints: 10 },
      },
      {
        id: 'thistlewood_burrow.king_in_the_dark',
        name: 'The King in the Dark',
        text: 'Clear the burrow on a day of Deep Gloom.',
        rule: { kind: 'withModifier', id: 'deep_gloom' },
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

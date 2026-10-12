import type { ActionDef, StealDef } from '../core/content';

const SECOND = 1000;

type Row = [id: string, name: string, level: number, seconds: number, xp: number, item: string];

/** A gathering action: no materials, one of one item per completion. */
function gather(skill: string, rows: Row[]): ActionDef[] {
  return rows.map(([id, name, level, seconds, xp, item]) => ({
    id,
    skill,
    name,
    level,
    durationMs: seconds * SECOND,
    xp,
    gives: [{ item, qty: 1 }],
  }));
}

type RecipeRow = [
  id: string,
  name: string,
  level: number,
  seconds: number,
  xp: number,
  uses: Record<string, number>,
  item: string,
  /** How many of the item one completion makes: one unless said. */
  makes?: number,
];

/**
 * An artisan action: takes materials from the bank, makes one item (or a
 * handful of one, like arrowheads). It will not start without the materials
 * for a completion and stops on the completion that uses the last of them.
 */
function recipe(skill: string, rows: RecipeRow[]): ActionDef[] {
  return rows.map(([id, name, level, seconds, xp, uses, item, makes = 1]) => ({
    id,
    skill,
    name,
    level,
    durationMs: seconds * SECOND,
    xp,
    uses: Object.entries(uses).map(([input, qty]) => ({ item: input, qty })),
    gives: [{ item, qty: makes }],
  }));
}

type MarkRow = { name: string; level: number; seconds: number; xp: number } & Omit<
  StealDef,
  'stunMs' | 'loot'
> & { stunSeconds: number; loot?: StealDef['loot'] };

/**
 * Thieving's marks: an attempt every so many seconds that succeeds by chance,
 * paying XP only when it does (src/core/thieving.ts). They give nothing for
 * certain, so `gives` is empty and the loot is in `steal`.
 */
function marks(rows: Record<string, MarkRow>): ActionDef[] {
  return Object.entries(rows).map(
    ([id, { name, level, seconds, xp, stunSeconds, loot = [], ...steal }]) => ({
      id,
      skill: 'thieving',
      name,
      level,
      durationMs: seconds * SECOND,
      xp,
      gives: [],
      steal: { ...steal, stunMs: stunSeconds * SECOND, loot },
    }),
  );
}

/**
 * Rows listed under one heading on their skill's page. Only a skill with a
 * long page needs its rows grouped; the page decides when to show them.
 */
function grouped(group: string, actions: ActionDef[]): ActionDef[] {
  return actions.map((action) => ({ ...action, group }));
}

/** Rows of tier 2 (S22): shown to everyone, open once Brinebeard's Grotto is cleared (src/core/tiers.ts). */
function tier2(actions: ActionDef[]): ActionDef[] {
  return actions.map((action) => ({ ...action, tier: 2 }));
}

// Tier 1, levels 1-20. In every skill XP per second climbs from about 3.3 at
// level 1 to 8 at the last unlock, so the newest thing is always the one to
// do and each skill takes about three hours to finish the tier
// (tests/data/pacing.test.ts). The skills differ in rhythm, not in pace:
// mining is slow heavy swings, foraging quick small finds.
const ALL: ActionDef[] = [
  ...gather('woodcutting', [
    ['chop_pine', 'Pine', 1, 3, 10, 'pine_logs'],
    ['chop_oak', 'Oak', 8, 4, 22, 'oak_logs'],
    ['chop_willow', 'Willow', 15, 5, 40, 'willow_logs'],
  ]),
  ...gather('fishing', [
    ['fish_shrimp', 'Shrimp', 1, 4, 13, 'raw_shrimp'],
    ['fish_herring', 'Herring', 8, 5, 28, 'raw_herring'],
    ['fish_cod', 'Cod', 15, 6, 48, 'raw_cod'],
  ]),
  ...gather('mining', [
    ['mine_copper', 'Copper', 1, 5, 17, 'copper_ore'],
    ['mine_tin', 'Tin', 8, 6, 33, 'tin_ore'],
    ['mine_iron', 'Iron', 15, 7, 56, 'iron_ore'],
  ]),
  ...gather('foraging', [
    ['forage_seashells', 'Seashells', 1, 3, 10, 'seashells'],
    ['forage_flax', 'Flax', 6, 3.5, 16, 'flax'],
    ['forage_sageleaf', 'Sageleaf', 11, 4, 25, 'sageleaf'],
    ['forage_glowcap', 'Glowcap', 16, 5, 40, 'glowcap'],
  ]),

  // Artisan skills are paced as if the materials were already in the bank:
  // about two hours to level 20, XP per second climbing from 5 to about 12,
  // because gathering the materials is the other half of the time.
  ...recipe('cooking', [
    ['cook_shrimp', 'Shrimp', 1, 2, 10, { raw_shrimp: 1 }, 'cooked_shrimp'],
    ['cook_herring', 'Herring', 8, 2.5, 21, { raw_herring: 1 }, 'cooked_herring'],
    ['cook_cod', 'Cod', 15, 3, 36, { raw_cod: 1 }, 'cooked_cod'],
  ]),
  // Smelting pays once for a bar and smithing again for what it becomes. The
  // bigger the piece, the more bars it takes and the longer at the anvil.
  ...grouped('Bars', [
    ...recipe('smithing', [
      ['smelt_bronze', 'Bronze bar', 1, 3, 15, { copper_ore: 1, tin_ore: 1 }, 'bronze_bar'],
      // Iron opens when Mining can dig it.
      ['smelt_iron', 'Iron bar', 15, 3, 32, { iron_ore: 1 }, 'iron_bar'],
    ]),
  ]),
  ...grouped('Bronze', [
    ...recipe('smithing', [
      ['smith_bronze_axe', 'Bronze axe', 1, 3, 16, { bronze_bar: 1 }, 'bronze_axe'],
      // One bar makes ten arrowheads, for Fletching.
      [
        'smith_bronze_arrowheads',
        'Bronze arrowheads',
        2,
        3,
        16,
        { bronze_bar: 1 },
        'bronze_arrowheads',
        10,
      ],
      ['smith_bronze_sword', 'Bronze sword', 3, 4, 23, { bronze_bar: 2 }, 'bronze_sword'],
      ['smith_bronze_helmet', 'Bronze helmet', 5, 4, 26, { bronze_bar: 2 }, 'bronze_helmet'],
      ['smith_bronze_shield', 'Bronze shield', 7, 5, 37, { bronze_bar: 3 }, 'bronze_shield'],
      ['smith_bronze_greaves', 'Bronze greaves', 8, 5, 38, { bronze_bar: 3 }, 'bronze_greaves'],
      [
        'smith_bronze_breastplate',
        'Bronze breastplate',
        9,
        6,
        49,
        { bronze_bar: 4 },
        'bronze_breastplate',
      ],
    ]),
  ]),
  ...grouped('Iron', [
    ...recipe('smithing', [
      ['smith_iron_axe', 'Iron axe', 15, 3, 33, { iron_bar: 1 }, 'iron_axe'],
      [
        'smith_iron_arrowheads',
        'Iron arrowheads',
        16,
        3,
        34,
        { iron_bar: 1 },
        'iron_arrowheads',
        10,
      ],
      ['smith_iron_sword', 'Iron sword', 16, 4, 44, { iron_bar: 2 }, 'iron_sword'],
      ['smith_iron_helmet', 'Iron helmet', 17, 4, 46, { iron_bar: 2 }, 'iron_helmet'],
      ['smith_iron_shield', 'Iron shield', 18, 5, 59, { iron_bar: 3 }, 'iron_shield'],
      ['smith_iron_greaves', 'Iron greaves', 18, 5, 60, { iron_bar: 3 }, 'iron_greaves'],
      [
        'smith_iron_breastplate',
        'Iron breastplate',
        19,
        6,
        73,
        { iron_bar: 4 },
        'iron_breastplate',
      ],
    ]),
  ]),
  // Hides come from fighting (src/data/monsters.ts): tanned into leather, then
  // the archer's armour.
  ...recipe('crafting', [
    // The vial is cheap on purpose: it is the potion's bottle, not a craft of its own.
    ['craft_shell_vial', 'Shell vial', 1, 2, 10, { seashells: 1 }, 'shell_vial'],
    ['craft_bowstring', 'Bowstring', 2, 2, 11, { flax: 1 }, 'bowstring'],
    ['craft_leather', 'Leather', 3, 2.5, 15, { hide: 1 }, 'leather'],
    [
      'craft_shell_necklace',
      'Shell necklace',
      4,
      3,
      20,
      { seashells: 4, bowstring: 1 },
      'shell_necklace',
    ],
    ['craft_linen', 'Linen', 6, 2.5, 17, { flax: 2 }, 'linen'],
    ['craft_linen_hood', 'Linen hood', 8, 3, 23, { linen: 2 }, 'linen_hood'],
    ['craft_leather_bracers', 'Leather bracers', 9, 3, 25, { leather: 1 }, 'leather_bracers'],
    [
      'craft_shell_bracelet',
      'Shell bracelet',
      11,
      3,
      27,
      { seashells: 6, bowstring: 1 },
      'shell_bracelet',
    ],
    ['craft_leather_cap', 'Leather cap', 12, 3.5, 33, { leather: 2 }, 'leather_cap'],
    ['craft_linen_trousers', 'Linen trousers', 13, 4, 40, { linen: 3 }, 'linen_trousers'],
    ['craft_linen_tunic', 'Linen tunic', 16, 5, 58, { linen: 4 }, 'linen_tunic'],
    ['craft_leather_jerkin', 'Leather jerkin', 18, 5, 62, { leather: 4 }, 'leather_jerkin'],
  ]),
  // Arrows are made ten at a time, from ten shafts and ten heads; a bow is two
  // logs and a string.
  ...recipe('fletching', [
    ['fletch_arrow_shafts', 'Arrow shafts', 1, 2, 10, { pine_logs: 1 }, 'arrow_shafts', 10],
    [
      'fletch_pine_shortbow',
      'Pine shortbow',
      4,
      3,
      18,
      { pine_logs: 2, bowstring: 1 },
      'pine_shortbow',
    ],
    [
      'fletch_bronze_arrows',
      'Bronze arrows',
      7,
      2.5,
      18,
      { arrow_shafts: 10, bronze_arrowheads: 10 },
      'bronze_arrows',
      10,
    ],
    [
      'fletch_oak_shortbow',
      'Oak shortbow',
      10,
      3.5,
      30,
      { oak_logs: 2, bowstring: 1 },
      'oak_shortbow',
    ],
    [
      'fletch_iron_arrows',
      'Iron arrows',
      15,
      2.5,
      29,
      { arrow_shafts: 10, iron_arrowheads: 10 },
      'iron_arrows',
      10,
    ],
    [
      'fletch_willow_shortbow',
      'Willow shortbow',
      17,
      4,
      49,
      { willow_logs: 2, bowstring: 1 },
      'willow_shortbow',
    ],
  ]),
  // Every potion goes into a shell vial (Crafting 1): one cheap step, and no
  // new thing to gather. What each potion does is on its item (src/data/items.ts).
  ...recipe('alchemy', [
    ['brew_sage_tonic', 'Sage tonic', 1, 3, 15, { sageleaf: 1, shell_vial: 1 }, 'sage_tonic'],
    [
      'brew_steady_draught',
      'Steady-hand draught',
      6,
      3.5,
      23,
      { sageleaf: 2, shell_vial: 1 },
      'steady_draught',
    ],
    [
      'brew_glowcap_tincture',
      'Glowcap tincture',
      11,
      4,
      37,
      { glowcap: 1, shell_vial: 1 },
      'glowcap_tincture',
    ],
    [
      'brew_midnight_oil',
      'Midnight oil',
      16,
      4.5,
      54,
      { sageleaf: 1, glowcap: 1, shell_vial: 1 },
      'midnight_oil',
    ],
  ]),
  // Tier 1 of Thieving, held to about three hours to level 20 and to a purse
  // somewhat fuller than selling what gathering brings in, by
  // tests/data/pacing.test.ts. Difficulty is set against the thief's rating
  // (10 + level + half the mastery): a mark opens at a little over even odds.
  ...marks({
    steal_fisherman: {
      name: 'Dozing fisherman',
      description:
        'Asleep on an upturned crate with his hat over his eyes. Snores in the key of herring.',
      level: 1,
      seconds: 3,
      xp: 22,
      difficulty: 8,
      stunSeconds: 3,
      coins: [10, 70],
      loot: [{ item: 'raw_shrimp', min: 1, max: 3, oneIn: 5 }],
    },
    steal_fish_stall: {
      name: 'Fish stall',
      description:
        'Ice, scales and a stallholder who can hear a coin drop across the harbour. Mostly.',
      level: 5,
      seconds: 3.5,
      xp: 36,
      difficulty: 11,
      stunSeconds: 4,
      coins: [30, 110],
      loot: [
        { item: 'cooked_shrimp', min: 1, max: 2, oneIn: 4 },
        { item: 'cooked_herring', min: 1, max: 1, oneIn: 10 },
      ],
    },
    steal_sailor: {
      name: 'Tipsy sailor',
      description:
        'Three sheets to the wind and singing about a fourth. Keeps his purse in his boot, he says.',
      level: 9,
      seconds: 4,
      xp: 50,
      difficulty: 14,
      stunSeconds: 4,
      coins: [60, 180],
      loot: [
        { item: 'smuggled_tea', min: 1, max: 1, oneIn: 20 },
        { item: 'pearl', min: 1, max: 1, oneIn: 80 },
      ],
    },
    steal_pedlar: {
      name: 'Travelling pedlar',
      description:
        'A coat of a hundred pockets, ninety-nine of them full of ribbons. The hundredth is not.',
      level: 13,
      seconds: 4.5,
      xp: 70,
      difficulty: 17,
      stunSeconds: 5,
      coins: [110, 300],
      loot: [
        { item: 'linen', min: 1, max: 2, oneIn: 8 },
        { item: 'sage_tonic', min: 1, max: 1, oneIn: 30 },
        { item: 'shell_bracelet', min: 1, max: 1, oneIn: 100 },
      ],
    },
    steal_strongbox: {
      name: 'Harbourmaster’s strongbox',
      description:
        'Iron-bound, triple-locked, and guarded by a clerk who has not blinked since Tuesday.',
      level: 18,
      seconds: 5,
      xp: 88,
      difficulty: 20,
      stunSeconds: 5,
      coins: [150, 380],
      loot: [
        // Confiscated, and now unconfiscated.
        { item: 'smuggled_tea', min: 1, max: 2, oneIn: 6 },
        { item: 'iron_arrows', min: 10, max: 20, oneIn: 15 },
        { item: 'pearl', min: 1, max: 1, oneIn: 50 },
      ],
    },
  }),

  // Tier 2, levels 20-40 (S22), opened by Brinebeard's Grotto's first clear,
  // in tier 1's shape: three gathering actions a skill seven levels apart
  // (Foraging four, five apart), XP a second climbing from about 20 at level
  // 20 to about 40 at the last unlock, so each skill takes about three hours
  // from 20 to 40 on the curve (tests/data/pacing.test.ts); artisan skills
  // about two, from about 30 to 60 a second with the materials on hand.
  // docs/tier2-manifest.md lists every id.
  ...tier2([
    ...gather('woodcutting', [
      ['chop_driftwood', 'Driftwood', 20, 4, 82, 'driftwood'],
      ['chop_elm', 'Elm', 27, 5, 150, 'elm_logs'],
      ['chop_yew', 'Yew', 34, 6, 232, 'yew_logs'],
    ]),
    ...gather('fishing', [
      ['fish_mackerel', 'Mackerel', 20, 5, 103, 'raw_mackerel'],
      ['fish_halibut', 'Halibut', 27, 6, 178, 'raw_halibut'],
      ['fish_swordfish', 'Swordfish', 34, 7, 270, 'raw_swordfish'],
    ]),
    ...gather('mining', [
      ['mine_salt_iron', 'Salt-iron', 20, 6, 123, 'salt_iron_ore'],
      ['mine_silver', 'Silver', 27, 7, 208, 'silver_ore'],
      ['mine_gold', 'Gold', 34, 8, 309, 'gold_ore'],
    ]),
    ...gather('foraging', [
      ['forage_sea_holly', 'Sea holly', 20, 4, 76, 'sea_holly'],
      ['forage_nettles', 'Nettles', 25, 4.5, 111, 'nettles'],
      ['forage_sea_glass', 'Sea-glass', 30, 5, 160, 'sea_glass'],
      ['forage_duskbloom', 'Duskbloom', 35, 6, 250, 'duskbloom'],
    ]),
    ...recipe('cooking', [
      ['cook_mackerel', 'Mackerel', 20, 2.5, 77, { raw_mackerel: 1 }, 'cooked_mackerel'],
      ['cook_halibut', 'Halibut', 27, 3, 134, { raw_halibut: 1 }, 'cooked_halibut'],
      ['cook_swordfish', 'Swordfish', 34, 3.5, 203, { raw_swordfish: 1 }, 'cooked_swordfish'],
    ]),
    // The knight's set, from salt-iron: one bar for the axe, up to four for the plate.
    ...grouped('Salt-iron', [
      ...recipe('smithing', [
        ['smelt_salt_iron', 'Salt-iron bar', 20, 3, 90, { salt_iron_ore: 1 }, 'salt_iron_bar'],
        ['smith_salt_iron_axe', 'Salt-iron axe', 21, 3, 95, { salt_iron_bar: 1 }, 'salt_iron_axe'],
        [
          'smith_salt_iron_arrowheads',
          'Salt-iron arrowheads',
          22,
          3,
          100,
          { salt_iron_bar: 1 },
          'salt_iron_arrowheads',
          10,
        ],
        [
          'smith_salt_iron_sword',
          'Salt-iron longsword',
          24,
          4,
          145,
          { salt_iron_bar: 2 },
          'salt_iron_sword',
        ],
        [
          'smith_salt_iron_helm',
          'Salt-iron helm',
          26,
          4,
          160,
          { salt_iron_bar: 2 },
          'salt_iron_helm',
        ],
        [
          'smith_salt_iron_shield',
          'Salt-iron kite shield',
          29,
          5,
          235,
          { salt_iron_bar: 3 },
          'salt_iron_shield',
        ],
        [
          'smith_salt_iron_greaves',
          'Salt-iron greaves',
          31,
          5,
          250,
          { salt_iron_bar: 3 },
          'salt_iron_greaves',
        ],
        [
          'smith_salt_iron_plate',
          'Salt-iron plate',
          35,
          6,
          345,
          { salt_iron_bar: 4 },
          'salt_iron_plate',
        ],
      ]),
    ]),
    // Bars for Crafting's jewellery.
    ...grouped('Silver and gold', [
      ...recipe('smithing', [
        ['smelt_silver', 'Silver bar', 27, 3, 130, { silver_ore: 1 }, 'silver_bar'],
        ['smelt_gold', 'Gold bar', 34, 3.5, 190, { gold_ore: 1 }, 'gold_bar'],
      ]),
    ]),
    // Thick hides from tier 2's beasts make the ranger's leathers; nettles the
    // knight's cloak; silver, gold and sea-glass the jewellery.
    ...recipe('crafting', [
      ['craft_thick_leather', 'Thick leather', 20, 2.5, 75, { thick_hide: 1 }, 'thick_leather'],
      ['craft_nettle_cloth', 'Nettle cloth', 21, 2.5, 80, { nettles: 2 }, 'nettle_cloth'],
      [
        'craft_ranger_bracers',
        'Ranger’s bracers',
        23,
        3,
        105,
        { thick_leather: 1 },
        'ranger_bracers',
      ],
      ['craft_ranger_hood', 'Ranger’s hood', 26, 3.5, 140, { thick_leather: 2 }, 'ranger_hood'],
      [
        'craft_silver_bangle',
        'Silver bangle',
        28,
        3.5,
        155,
        { silver_bar: 1, sea_glass: 2 },
        'silver_bangle',
      ],
      ['craft_red_cloak', 'Red cloak', 31, 5, 250, { nettle_cloth: 4 }, 'red_cloak'],
      ['craft_ranger_coat', 'Ranger’s coat', 34, 5, 275, { thick_leather: 4 }, 'ranger_coat'],
      [
        'craft_gold_amulet',
        'Gold amulet',
        37,
        5,
        300,
        { gold_bar: 2, sea_glass: 3 },
        'gold_amulet',
      ],
    ]),
    ...recipe('fletching', [
      [
        'fletch_driftwood_shortbow',
        'Driftwood shortbow',
        20,
        3,
        92,
        { driftwood: 2, bowstring: 1 },
        'driftwood_shortbow',
      ],
      [
        'fletch_salt_iron_arrows',
        'Salt-iron arrows',
        23,
        2.5,
        92,
        { arrow_shafts: 10, salt_iron_arrowheads: 10 },
        'salt_iron_arrows',
        10,
      ],
      [
        'fletch_elm_longbow',
        'Elm longbow',
        28,
        4,
        180,
        { elm_logs: 3, bowstring: 1 },
        'elm_longbow',
      ],
      [
        'fletch_yew_longbow',
        'Yew longbow',
        35,
        4.5,
        260,
        { yew_logs: 3, bowstring: 1 },
        'yew_longbow',
      ],
    ]),
    ...recipe('alchemy', [
      [
        'brew_holly_tonic',
        'Sea-holly tonic',
        20,
        3,
        92,
        { sea_holly: 1, shell_vial: 1 },
        'holly_tonic',
      ],
      [
        'brew_forgehand_draught',
        'Forgehand draught',
        26,
        3.5,
        145,
        { sea_holly: 2, shell_vial: 1 },
        'forgehand_draught',
      ],
      [
        'brew_duskbloom_tincture',
        'Duskbloom tincture',
        32,
        4,
        200,
        { duskbloom: 1, shell_vial: 1 },
        'duskbloom_tincture',
      ],
      [
        'brew_twilight_elixir',
        'Twilight elixir',
        37,
        4.5,
        270,
        { sea_holly: 1, duskbloom: 1, shell_vial: 1 },
        'twilight_elixir',
      ],
    ]),
    // Richer marks, held to the same limits as tier 1's: about three hours from
    // 20 to 40, and a purse somewhat fuller than selling what gathering brings in.
    ...marks({
      steal_spice_merchant: {
        name: 'Spice merchant',
        description:
          'Sacks of saffron, pepper and something he calls dragon dust. He counts his takings twice and his customers never.',
        level: 20,
        seconds: 4,
        xp: 186,
        difficulty: 22,
        stunSeconds: 4,
        coins: [150, 340],
        loot: [{ item: 'sea_holly', min: 1, max: 2, oneIn: 6 }],
      },
      steal_customs_house: {
        name: 'Customs house',
        description:
          'Every seized barrel on the coast ends up here, under the eye of a clerk who is paid by the barrel.',
        level: 24,
        seconds: 4.5,
        xp: 262,
        difficulty: 25,
        stunSeconds: 5,
        coins: [190, 400],
        loot: [
          { item: 'smuggled_tea', min: 1, max: 2, oneIn: 5 },
          { item: 'salt_iron_arrows', min: 10, max: 20, oneIn: 15 },
        ],
      },
      steal_noble: {
        name: 'Visiting noble',
        description:
          'In town to look at the sea, which has not impressed him. His purse is heavier than his cane, and his cane is solid silver.',
        level: 28,
        seconds: 5,
        xp: 349,
        difficulty: 28,
        stunSeconds: 5,
        coins: [250, 510],
        loot: [
          { item: 'pearl', min: 1, max: 1, oneIn: 30 },
          { item: 'silver_bangle', min: 1, max: 1, oneIn: 150 },
        ],
      },
      steal_guild_coffer: {
        name: 'Smiths’ guild coffer',
        description:
          'Iron-banded, hammer-stamped, and guarded by an apprentice who was told never to leave it and has not had lunch.',
        level: 32,
        seconds: 5,
        xp: 441,
        difficulty: 30,
        stunSeconds: 6,
        coins: [320, 640],
        loot: [
          { item: 'salt_iron_bar', min: 1, max: 2, oneIn: 8 },
          { item: 'gold_ore', min: 1, max: 1, oneIn: 20 },
        ],
      },
      steal_counting_house: {
        name: 'Counting house',
        description:
          'Ledgers to the ceiling, scales on every desk, and a banker who can hear a coin change pockets three streets away.',
        level: 37,
        seconds: 5.5,
        xp: 567,
        difficulty: 34,
        stunSeconds: 6,
        coins: [400, 800],
        loot: [
          { item: 'gold_bar', min: 1, max: 1, oneIn: 15 },
          { item: 'pearl', min: 1, max: 1, oneIn: 20 },
        ],
      },
    }),
  ]),
];

export const ACTIONS: Record<string, ActionDef> = Object.fromEntries(
  ALL.map((action) => [action.id, action]),
);

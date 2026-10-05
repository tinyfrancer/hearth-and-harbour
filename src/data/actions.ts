import type { ActionDef } from '../core/content';

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
  ...recipe('smithing', [
    ['smelt_bronze', 'Bronze bar', 1, 3, 15, { copper_ore: 1, tin_ore: 1 }, 'bronze_bar'],
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
    [
      'smith_bronze_breastplate',
      'Bronze breastplate',
      9,
      6,
      49,
      { bronze_bar: 4 },
      'bronze_breastplate',
    ],
    // Iron opens when Mining can dig it.
    ['smelt_iron', 'Iron bar', 15, 3, 32, { iron_ore: 1 }, 'iron_bar'],
    ['smith_iron_axe', 'Iron axe', 15, 3, 33, { iron_bar: 1 }, 'iron_axe'],
    ['smith_iron_arrowheads', 'Iron arrowheads', 16, 3, 34, { iron_bar: 1 }, 'iron_arrowheads', 10],
    ['smith_iron_sword', 'Iron sword', 16, 4, 44, { iron_bar: 2 }, 'iron_sword'],
    ['smith_iron_helmet', 'Iron helmet', 17, 4, 46, { iron_bar: 2 }, 'iron_helmet'],
    ['smith_iron_shield', 'Iron shield', 18, 5, 59, { iron_bar: 3 }, 'iron_shield'],
    ['smith_iron_breastplate', 'Iron breastplate', 19, 6, 73, { iron_bar: 4 }, 'iron_breastplate'],
  ]),
  // Leather (hides into armour) waits for combat (S8) to bring in the hides.
  ...recipe('crafting', [
    // The vial is cheap on purpose: it is the potion's bottle, not a craft of its own.
    ['craft_shell_vial', 'Shell vial', 1, 2, 10, { seashells: 1 }, 'shell_vial'],
    ['craft_bowstring', 'Bowstring', 2, 2, 11, { flax: 1 }, 'bowstring'],
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
    [
      'craft_shell_bracelet',
      'Shell bracelet',
      11,
      3,
      27,
      { seashells: 6, bowstring: 1 },
      'shell_bracelet',
    ],
    ['craft_linen_trousers', 'Linen trousers', 13, 4, 40, { linen: 3 }, 'linen_trousers'],
    ['craft_linen_tunic', 'Linen tunic', 16, 5, 58, { linen: 4 }, 'linen_tunic'],
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
    ['fletch_oak_shortbow', 'Oak shortbow', 10, 3.5, 30, { oak_logs: 2, bowstring: 1 }, 'oak_shortbow'],
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
];

export const ACTIONS: Record<string, ActionDef> = Object.fromEntries(
  ALL.map((action) => [action.id, action]),
);

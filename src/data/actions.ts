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
];

/**
 * An artisan action: takes materials from the bank, makes one of one item. It
 * will not start without the materials for a completion and stops on the
 * completion that uses the last of them.
 */
function recipe(skill: string, rows: RecipeRow[]): ActionDef[] {
  return rows.map(([id, name, level, seconds, xp, uses, item]) => ({
    id,
    skill,
    name,
    level,
    durationMs: seconds * SECOND,
    xp,
    uses: Object.entries(uses).map(([input, qty]) => ({ item: input, qty })),
    gives: [{ item, qty: 1 }],
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
    ['smith_iron_sword', 'Iron sword', 16, 4, 44, { iron_bar: 2 }, 'iron_sword'],
    ['smith_iron_helmet', 'Iron helmet', 17, 4, 46, { iron_bar: 2 }, 'iron_helmet'],
    ['smith_iron_shield', 'Iron shield', 18, 5, 59, { iron_bar: 3 }, 'iron_shield'],
    ['smith_iron_breastplate', 'Iron breastplate', 19, 6, 73, { iron_bar: 4 }, 'iron_breastplate'],
  ]),
];

export const ACTIONS: Record<string, ActionDef> = Object.fromEntries(
  ALL.map((action) => [action.id, action]),
);

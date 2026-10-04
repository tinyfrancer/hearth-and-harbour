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
];

export const ACTIONS: Record<string, ActionDef> = Object.fromEntries(
  ALL.map((action) => [action.id, action]),
);

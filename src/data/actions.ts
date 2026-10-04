import type { ActionDef } from '../core/content';

const SECOND = 1000;

// Tier 1 woodcutting, levels 1-20. XP per second climbs with each tree (3.3,
// 5.5, 8), so the newest tree is always the one to chop.
export const ACTIONS = {
  chop_pine: {
    id: 'chop_pine',
    skill: 'woodcutting',
    name: 'Pine',
    level: 1,
    durationMs: 3 * SECOND,
    xp: 10,
    gives: [{ item: 'pine_logs', qty: 1 }],
  },
  chop_oak: {
    id: 'chop_oak',
    skill: 'woodcutting',
    name: 'Oak',
    level: 8,
    durationMs: 4 * SECOND,
    xp: 22,
    gives: [{ item: 'oak_logs', qty: 1 }],
  },
  chop_willow: {
    id: 'chop_willow',
    skill: 'woodcutting',
    name: 'Willow',
    level: 15,
    durationMs: 5 * SECOND,
    xp: 40,
    gives: [{ item: 'willow_logs', qty: 1 }],
  },
} satisfies Record<string, ActionDef>;

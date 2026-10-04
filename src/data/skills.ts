import type { SkillDef } from '../core/content';

// In the order the Skills tab lists them.
export const SKILLS = {
  woodcutting: { id: 'woodcutting', name: 'Woodcutting', verb: 'Chopping' },
  fishing: { id: 'fishing', name: 'Fishing', verb: 'Catching' },
  mining: { id: 'mining', name: 'Mining', verb: 'Mining' },
  foraging: { id: 'foraging', name: 'Foraging', verb: 'Gathering' },
} satisfies Record<string, SkillDef>;

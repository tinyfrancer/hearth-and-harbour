import type { SkillDef } from '../core/content';

export const SKILLS = {
  woodcutting: { id: 'woodcutting', name: 'Woodcutting', verb: 'Chopping' },
} satisfies Record<string, SkillDef>;

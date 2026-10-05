import type { SkillDef } from '../core/content';

// In the order the Skills tab lists them, under their groups' headings.
export const SKILLS = {
  woodcutting: { id: 'woodcutting', name: 'Woodcutting', verb: 'Chopping', group: 'Gathering' },
  fishing: { id: 'fishing', name: 'Fishing', verb: 'Catching', group: 'Gathering' },
  mining: { id: 'mining', name: 'Mining', verb: 'Mining', group: 'Gathering' },
  foraging: { id: 'foraging', name: 'Foraging', verb: 'Gathering', group: 'Gathering' },
  cooking: { id: 'cooking', name: 'Cooking', verb: 'Cooking', group: 'Artisan' },
  smithing: { id: 'smithing', name: 'Smithing', verb: 'Making', group: 'Artisan' },
  crafting: { id: 'crafting', name: 'Crafting', verb: 'Making', group: 'Artisan' },
  fletching: { id: 'fletching', name: 'Fletching', verb: 'Fletching', group: 'Artisan' },
  alchemy: { id: 'alchemy', name: 'Alchemy', verb: 'Brewing', group: 'Artisan' },
  // Trained by fighting, not by actions (src/core/combat.ts says which blow trains which).
  melee: { id: 'melee', name: 'Melee', verb: 'Fighting', group: 'Combat' },
  ranged: { id: 'ranged', name: 'Ranged', verb: 'Shooting', group: 'Combat' },
  defence: { id: 'defence', name: 'Defence', verb: 'Fighting', group: 'Combat' },
  vitality: { id: 'vitality', name: 'Vitality', verb: 'Fighting', group: 'Combat' },
  // Each attempt goes by chance (src/core/thieving.ts); the marks are in src/data/actions.ts.
  thieving: { id: 'thieving', name: 'Thieving', verb: 'Robbing', group: 'Roguery' },
} satisfies Record<string, SkillDef>;

/** The ids of every skill under a heading, in table order: what a potion that helps a group lists. */
export function skillsIn(...groups: string[]): string[] {
  return Object.values(SKILLS)
    .filter((skill) => groups.includes(skill.group))
    .map((skill) => skill.id);
}

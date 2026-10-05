import type { DungeonDef } from '../core/content';

// The dungeons, as far as the idle rules know them: their rooms, cast and
// numbers live with the scene (src/scene), which reports a clear by these ids.
export const DUNGEONS = {
  brinebeards_grotto: {
    id: 'brinebeards_grotto',
    name: 'Brinebeard’s Grotto',
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
  },
} satisfies Record<string, DungeonDef>;

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
    // The ids and names of src/scene/cast.ts, weakest first and the captain last.
    cast: [
      { id: 'powder_monkey', name: 'Powder monkey' },
      { id: 'ships_parrot', name: 'Ship’s parrot' },
      { id: 'deckhand', name: 'Deckhand' },
      { id: 'giant_crab', name: 'Giant crab' },
      { id: 'brinebeard', name: 'Captain Brinebeard' },
    ],
  },
} satisfies Record<string, DungeonDef>;

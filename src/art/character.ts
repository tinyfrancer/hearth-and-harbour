/**
 * How the player's character looks, as the game stores it, and the choices
 * the creator offers. The drawing is at the C scale (character2.ts, which
 * re-exports these as `LOOK_CHOICES2`); this file keeps only the look itself,
 * which the scene and the menus read by these names. (B12: the first scale's
 * figure, its wardrobe and its door were retired here.)
 */
export interface Look {
  skin: string;
  hair: string;
  hairColour: string;
}

export interface LookChoice {
  id: string;
  /** What the choice is called on the character creation screen. */
  name: string;
}

/** Every look the player may choose, per part. The first of each is the default. */
export const LOOK_CHOICES: Readonly<Record<keyof Look, readonly LookChoice[]>> = {
  skin: [
    { id: 'fair', name: 'Fair' },
    { id: 'pale', name: 'Pale' },
    { id: 'golden', name: 'Golden' },
    { id: 'brown', name: 'Brown' },
    { id: 'deep', name: 'Deep' },
  ],
  hair: [
    { id: 'short', name: 'Short' },
    { id: 'long', name: 'Long' },
    { id: 'braid', name: 'Braid' },
    { id: 'shaggy', name: 'Shaggy' },
    { id: 'bald', name: 'Bald' },
  ],
  hairColour: [
    { id: 'brown', name: 'Brown' },
    { id: 'black', name: 'Black' },
    { id: 'chestnut', name: 'Chestnut' },
    { id: 'auburn', name: 'Auburn' },
    { id: 'blonde', name: 'Blonde' },
    { id: 'grey', name: 'Grey' },
  ],
};

export const DEFAULT_LOOK: Look = {
  skin: LOOK_CHOICES.skin[0]!.id,
  hair: LOOK_CHOICES.hair[0]!.id,
  hairColour: LOOK_CHOICES.hairColour[0]!.id,
};

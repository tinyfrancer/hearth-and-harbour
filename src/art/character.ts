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
  /** B13. Optional, so a look saved before beards (or a caller that never names one) is clean-shaven: missing is `none`. */
  beard?: string;
}

export interface LookChoice {
  id: string;
  /** What the choice is called on the character creation screen. */
  name: string;
}

/** The beards (B13), coloured by the hair colour. The first, `none`, is the default and what a missing beard means. */
export const BEARD_CHOICES: readonly LookChoice[] = [
  { id: 'none', name: 'None' },
  { id: 'stubble', name: 'Stubble' },
  { id: 'moustache', name: 'Moustache' },
  { id: 'short_beard', name: 'Short beard' },
  { id: 'full_beard', name: 'Full beard' },
  { id: 'braided_beard', name: 'Braided beard' },
  { id: 'mutton_chops', name: 'Mutton chops' },
];

const CHOICES = {
  skin: [
    { id: 'fair', name: 'Fair' },
    { id: 'pale', name: 'Pale' },
    { id: 'golden', name: 'Golden' },
    { id: 'brown', name: 'Brown' },
    { id: 'deep', name: 'Deep' },
  ],
  // New styles are appended: a saved id never changes its meaning.
  hair: [
    { id: 'short', name: 'Short' },
    { id: 'long', name: 'Long' },
    { id: 'braid', name: 'Braid' },
    { id: 'shaggy', name: 'Shaggy' },
    { id: 'bald', name: 'Bald' },
    // B13
    { id: 'ponytail', name: 'Ponytail' },
    { id: 'topknot', name: 'Topknot' },
    { id: 'curly', name: 'Curly' },
    { id: 'mohawk', name: 'Mohawk' },
    { id: 'bob', name: 'Bob' },
    { id: 'twin_braids', name: 'Twin braids' },
  ],
  hairColour: [
    { id: 'brown', name: 'Brown' },
    { id: 'black', name: 'Black' },
    { id: 'chestnut', name: 'Chestnut' },
    { id: 'auburn', name: 'Auburn' },
    { id: 'blonde', name: 'Blonde' },
    { id: 'grey', name: 'Grey' },
  ],
  beard: BEARD_CHOICES,
} as const satisfies Readonly<Record<keyof Look, readonly LookChoice[]>>;

/**
 * Every look the player may choose, per part. The first of each is the
 * default; `beard` is the same array as `BEARD_CHOICES` (B13).
 */
export const LOOK_CHOICES: Readonly<Record<keyof Look, readonly LookChoice[]>> = CHOICES;

export const DEFAULT_LOOK: Look = {
  skin: LOOK_CHOICES.skin[0]!.id,
  hair: LOOK_CHOICES.hair[0]!.id,
  hairColour: LOOK_CHOICES.hairColour[0]!.id,
  beard: BEARD_CHOICES[0]!.id,
};

/*
 * The hero in a scene is the player's own character: their look and what they
 * are wearing. A new character wears nothing and walks about in everyday
 * clothes; gear shows as it is put on. The C-scale figure that draws him, in
 * town and in the dungeons, is `Hero2` (`town2Art.ts`); this is what he is
 * dressed in, and the key that says when that has changed.
 */
import type { Look } from '../art/character';
import { wornItemIds } from '../core/equipment';
import type { GameState } from '../core/state';
import { fullLook } from '../ui/look';

/** What the hero looks like, as the art draws it: a whole look and the ids of what is worn. */
export interface Dress {
  readonly look: Look;
  readonly worn: readonly string[];
}

export function dressOf(state: GameState): Dress {
  return { look: fullLook(state.look), worn: wornItemIds(state) };
}

/** One string per way the hero can look, so a change is found by comparing two strings. */
export function dressKey(dress: Dress): string {
  const { skin, hair, hairColour } = dress.look;
  return `${skin} ${hair} ${hairColour} | ${dress.worn.join(' ')}`;
}

/*
 * The grotto's words: what the captain shouts as his fight turns. Room names
 * are with the rooms (`grotto.ts`); the boat's are with the boat (`town.ts`).
 */
import type { SayLine } from './battle';

export const CAPTAIN_SAYS: Readonly<Record<SayLine, string>> = {
  tide: 'Bring in the sea, lads!',
  anchor: 'Right. The anchor.',
  down: 'This is not over! ...Is it?',
};

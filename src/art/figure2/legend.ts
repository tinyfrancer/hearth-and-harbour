/**
 * The characters every figure part shares: skin, eyes and brows. A part's
 * own material is written as digits (its steps), and anything else it needs
 * as pins of its own; these are the ones a face, a hand or a neck uses
 * whatever it is worn with.
 *
 * Skin is drawn in `skin` and takes a look's tone by swapping ramps; brows in
 * `brow`, which takes the look's hair colour at the step that shows on its
 * skin (look.ts).
 */
import type { Pins } from './engine';

export const LEGEND2: Pins = {
  // Skin, light to dark: o a glint on the brow or knuckle, s the lit side,
  // t the turn, u the shadow side, v the mouth and the shadow under the jaw,
  // w the deepest (under the chin, between the fingers).
  o: ['skin', 0],
  s: ['skin', 1],
  t: ['skin', 2],
  u: ['skin', 3],
  v: ['skin', 4],
  w: ['skin', 5],
  // Eyes: K the lid's lash line, W the white, I the iris, J its lit side.
  K: ['eye', 4],
  W: ['eye', 1],
  I: ['eye', 3],
  J: ['eye', 2],
  // Brows.
  b: ['brow', 3],
  B: ['brow', 4],
};

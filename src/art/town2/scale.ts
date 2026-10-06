/**
 * The C scale, chosen by Cody after the scale study: a world 360 art pixels
 * across the phone (3 device pixels each on a 390-wide 3x phone, up from 270
 * at 4), with a person about 64 art pixels tall and everything else to scale
 * with them. The live game still reads SCREEN_ART_WIDTH (270) from canvas.ts;
 * this is its replacement for when the scene switches.
 */
import { wholeScale } from '../canvas';

/** The width of one phone screen, portrait, in art pixels, at the C scale. */
export const WORLD2_WIDTH = 360;

/**
 * Art pixels per metre. A person is about 1.7 m (64 px), a door 2 m (76 px),
 * a storey about 3 m (110-130 px with its floor and beams).
 */
export const METRE = 38;

/** A length in metres, as whole art pixels. */
export const m = (metres: number): number => Math.round(metres * METRE);

/**
 * Device pixels per art pixel for a 360-wide world across `cssWidth` CSS
 * pixels: a whole number, never a fraction. 3 on a 390-wide 3x phone.
 */
export function town2Scale(cssWidth: number, dpr: number): number {
  return wholeScale(cssWidth, dpr, WORLD2_WIDTH);
}

/** How tall a person stands, for laying out doors and for scale checks. */
export const PERSON_H = 64;

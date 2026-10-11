/**
 * Beards for the C-scale head (B13), drawn in the `hair` ramp so a look's
 * hair colour colours them. Each is drawn from the front (the H2 head, its
 * mouth at row 17 and jaw at row 19), in profile and from behind (only what
 * shows past the jaw and neck), and in the hero's portrait (heroFace.ts).
 *
 * A beard is worn over head gear: it sits on the chin below a helm's rim and
 * flows over a hood's cape, as long hair does over a collar.
 */
import type { Gear2, Part2 } from './engine';

/** Every beard by its look id: the gear it is drawn with, or none. Missing or unknown is `none`. */
export const BEARD_STYLES2: Readonly<Record<string, string | null>> = {
  none: null,
};

export const BEARDS2: readonly Gear2[] = [];

/** Each beard in profile and from behind, by gear id. */
export const BEARD_SIDE: Readonly<Record<string, readonly Part2[]>> = {};
export const BEARD_BACK: Readonly<Record<string, readonly Part2[]>> = {};

/** The gear id for a look's beard, or null. */
export const beardGear = (id: string | undefined): string | null => BEARD_STYLES2[id ?? ''] ?? null;

/**
 * A dungeon's look (B15): which cave its tiles, doors, light and palette are
 * drawn in. Every theme has the same tile kinds, wears and footprints, so a
 * room laid out for one is laid out for all; only the drawing differs.
 *
 * - `grotto`: Brinebeard's Grotto, lantern-lit at dusk (`CAVE_DUSK`), violet
 *   rock in lumps, grey sand, the dark sea. Every door's default.
 * - `tidepool`: the tide-pool cave, a shallow sea cave open to daylight
 *   (`CAVE_TIDEPOOL`): warm water-worn rock in beds, bright sand, clear
 *   pools, shafts of sun through cracks above and the sea at its mouth.
 * - `burrow` (B20): Thistlewood Burrow, a warren under the old forest, played
 *   dark (`CAVE_BURROW` in the light, `burrowNight(level)` beyond it): walls
 *   of soil strata, stones and roots shored with old timbers, floors of
 *   trodden earth, moss and leaf litter, flagstones in the badger's hall,
 *   fungus glowing cold in the dark.
 */
export const DUNGEON2_THEMES = ['grotto', 'tidepool', 'burrow'] as const;
export type Dungeon2Theme = (typeof DUNGEON2_THEMES)[number];

/** Whether a string names a theme (anything else is drawn as the grotto). */
export const isDungeon2Theme = (t: unknown): t is Dungeon2Theme =>
  typeof t === 'string' && (DUNGEON2_THEMES as readonly string[]).includes(t);

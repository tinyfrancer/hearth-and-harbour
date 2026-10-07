/*
 * The grotto's cast as the scene fights it: the rows in the game's own
 * tables (`src/data/dungeons.ts`, lane A's, which the bestiary reads too),
 * keyed by id and given the dungeon as their area, so the idle game's
 * formulas (`hitChance`, the max hit, XP per damage) work on them unchanged.
 * A number is changed in one place, the table.
 *
 * How each one moves and what its heavy attack is are in `foes.ts`. The
 * numbers were set by playing the whole grotto with a scripted hero in
 * `tests/scene/grottoRun.test.ts`: a character at the end of tier 1 clears
 * it, and one at half that strength does not. Changing one that breaks that
 * test is a decision.
 */
import type { MonsterDef, PickDrop } from '../core/content';
import { DUNGEONS } from '../data/dungeons';

/** The id `RunSpoils.cleared` gives for a clear, and the area the cast belongs to. */
export const GROTTO_ID = 'brinebeards_grotto';

export type { PickDrop };

/** A dungeon monster's row: the idle shape, and a drop that is one thing or another. */
export interface CastDef extends MonsterDef {
  readonly pick?: PickDrop;
}

export const GROTTO_CAST: Readonly<Record<string, CastDef>> = Object.fromEntries(
  DUNGEONS[GROTTO_ID].cast.map((foe) => [foe.id, { ...foe, area: GROTTO_ID }]),
);

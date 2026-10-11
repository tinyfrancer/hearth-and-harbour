/**
 * Which way each asymmetric held thing's working side faces (B13; Cody:
 * "Curved sword looks funky on side character view, curves down?").
 *
 * A held thing is drawn once, upright in the fist as the hero holds it
 * standing (held.ts), and turned about the fist for the carry (carry.ts) and
 * the blow (strike.ts). A straight blade or a haft is the same object
 * mirrored, so those turns may flip it (that keeps its lit edge on the top or
 * the left). A curved blade is not: flipped, its belly ends on the wrong side
 * and its point droops away from the spine. So each asymmetric thing declares
 * its working side in the upright drawing and how it turns:
 *
 * - `rotate`: the cutlasses. Turned only as a rigid thing turns in the hand,
 *   by true rotations, so the edge stays on the belly (the convex side) and
 *   the point sweeps back toward the spine in every pose: carried point down
 *   and forward its belly is underneath and its point curls up; in a blow the
 *   belly leads the way the blade travels.
 * - `flip`: the axes. Point down they are turned over in the hand (a turn
 *   about the haft, which mirrors them in profile), so the bit faces forward,
 *   toward the walk and the one struck, in every pose.
 *
 * `edge` is the working side in the upright front drawing: `out` is the side
 * away from the body (the drawing's left), so in profile, facing right, the
 * edge or bit faces forward when the thing is upright.
 */
export interface EdgeRule {
  readonly edge: 'out' | 'in';
  readonly turn: 'rotate' | 'flip';
}

export const EDGE2: Readonly<Record<string, EdgeRule>> = {
  smugglers_cutlass: { edge: 'out', turn: 'rotate' },
  pirates_cutlass: { edge: 'out', turn: 'rotate' },
  bronze_hatchet: { edge: 'out', turn: 'flip' },
  iron_bearded_axe: { edge: 'out', turn: 'flip' },
  boarding_axe: { edge: 'out', turn: 'flip' },
};

/** Whether a held thing (by gear id) turns only by true rotations. */
export const turnsRigid = (gearId: string | null | undefined): boolean =>
  !!gearId && EDGE2[gearId]?.turn === 'rotate';

/**
 * How far forward each kind of figure part sits, back to front. The body is
 * at 0; parts at the same depth keep the order they were listed in.
 */
export const DEPTH = {
  CLOAK: -20,
  /** A quiver on the back. */
  QUIVER: -18,
  /** Long hair falling behind the shoulders. */
  HAIR_BACK: -15,
  /** The blade or limbs of a held weapon, behind the arm that holds it. */
  HELD_BEHIND: -10,
  LEGS: 10,
  FEET: 20,
  SHIRT: 30,
  ARMOUR: 40,
  /** An empty hand resting at the belt: over the shirt and armour it rests on. */
  HAND: 45,
  BELT: 50,
  HELD_FRONT: 60,
  HAIR: 70,
  HELMET: 75,
  /**
   * A necklace or bracelet: small, so it sits over clothes, armour and a
   * hood's cape where it can be found.
   */
  JEWELLERY: 76,
  /** Hair that falls over a helmet's or hood's edge (a braid over the shoulder). */
  HAIR_OVER: 77,
  SHIELD: 80,
} as const;

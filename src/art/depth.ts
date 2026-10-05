/**
 * How far forward each kind of figure part sits, back to front. The body is
 * at 0; parts at the same depth keep the order they were listed in.
 *
 * A held thing is layered round the hand (docs/style-guide.md, "How things
 * are held"): its grip at `GRIP`, under the fingers at `FIST`, and the rest of
 * it (blade, guard, head, limbs, pommel, butt) at `HELD_FRONT`, in front of the
 * arm and body. Only what really passes behind the body, a bowstring, is
 * `HELD_BEHIND`.
 */
export const DEPTH = {
  CLOAK: -20,
  /** A quiver on the back. */
  QUIVER: -18,
  /** Long hair falling behind the shoulders. */
  HAIR_BACK: -15,
  /** The part of a held thing that passes behind the body: a bowstring. Never a blade. */
  HELD_BEHIND: -10,
  LEGS: 10,
  FEET: 20,
  SHIRT: 30,
  ARMOUR: 40,
  /** An empty hand resting at the belt: over the shirt and armour it rests on. */
  HAND: 45,
  BELT: 50,
  /**
   * A bracelet: over the sleeve and the hand at rest, under anything held,
   * which passes in front of the wrist.
   */
  WRIST: 51,
  /** The grip of a held thing, where the hand closes on it: over sleeve, armour and belt. */
  GRIP: 52,
  /** The closed fingers of the weapon hand, wrapped over the grip and over nothing else. */
  FIST: 55,
  /**
   * Everything of a held thing but its grip: the blade, guard or head above
   * the fist and the pommel or butt below it, in front of forearm and body.
   */
  HELD_FRONT: 60,
  HAIR: 70,
  HELMET: 75,
  /**
   * A necklace: small, so it sits over clothes, armour and a
   * hood's cape where it can be found.
   */
  JEWELLERY: 76,
  /** Hair that falls over a helmet's or hood's edge (a braid over the shoulder). */
  HAIR_OVER: 77,
  SHIELD: 80,
} as const;

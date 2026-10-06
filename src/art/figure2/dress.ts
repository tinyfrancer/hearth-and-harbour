/**
 * Dressing a C-scale figure: a body and gear by id, one piece per slot,
 * stacked by depth, outlined. Each part also knows what it moves with, for
 * walking (walk.ts).
 */
import type { TGrid } from '../town2/cells';
import { AXIS, BODIES2, FIG_H, FIG_W } from './body';
import { CLOTHES2, type Posed } from './clothes';
import { outlineIn, pixels, stack, type Body2, type Bone, type Gear2, type Part2 } from './engine';
import type { Boned } from './walk';
import { HAIR2 } from './hair';
import { ARMOUR2 } from './armour';
import { HEADGEAR2 } from './headgear';
import { KNIGHT2 } from './knight';
import { TRINKETS2 } from './trinkets';
import { HELD2 } from './held';

export interface Wardrobe2 {
  readonly bodies: readonly Body2[];
  readonly gear: readonly Gear2[];
}

export const WARDROBE2: Wardrobe2 = {
  bodies: BODIES2,
  gear: [...HAIR2, ...CLOTHES2, ...HEADGEAR2, ...ARMOUR2, ...HELD2, ...KNIGHT2, ...TRINKETS2],
};

const gearById = new Map<string, Gear2>();
const findGear = (id: string, w: Wardrobe2): Gear2 | undefined => {
  if (w !== WARDROBE2) return w.gear.find((g) => g.id === id);
  if (!gearById.size) for (const g of WARDROBE2.gear) gearById.set(g.id, g);
  return gearById.get(id);
};

/** Every part of a dressed body and the slot it is worn in (the body's own have none). */
function worn(
  bodyId: string,
  gearIds: readonly string[],
  w: Wardrobe2,
): { part: Part2; slot: string | null }[] {
  const body = w.bodies.find((b) => b.id === bodyId);
  if (!body) throw new Error(`No body "${bodyId}".`);
  const slots = new Map<string, string>();
  const out = body.parts.map((part) => ({ part, slot: null as string | null }));
  for (const id of gearIds) {
    const gear = findGear(id, w);
    if (!gear) throw new Error(`No gear "${id}".`);
    const taken = slots.get(gear.slot);
    if (taken) throw new Error(`"${id}" and "${taken}" are both worn in the ${gear.slot} slot.`);
    slots.set(gear.slot, id);
    for (const part of gear.parts as readonly Posed[]) out.push({ part, slot: gear.slot });
  }
  return out;
}

/** The parts of a dressed body, back to front not yet sorted. Throws on unknown ids or a slot worn twice. */
export function partsOf(
  bodyId: string,
  gearIds: readonly string[],
  w: Wardrobe2 = WARDROBE2,
): Part2[] {
  return worn(bodyId, gearIds, w).map((p) => p.part);
}

/** A body in gear, without its outline. */
export function dress2(
  bodyId: string,
  gearIds: readonly string[],
  w: Wardrobe2 = WARDROBE2,
): TGrid {
  return stackFigure(partsOf(bodyId, gearIds, w));
}

export const stackFigure = (parts: readonly Part2[]): TGrid => stack(parts, FIG_W, FIG_H);

/** A body in gear, outlined: 56 x 72, ready to stand on the ground. */
export function figure2(
  bodyId: string,
  gearIds: readonly string[],
  w: Wardrobe2 = WARDROBE2,
): TGrid {
  return outlineIn(dress2(bodyId, gearIds, w));
}

/** The middle column of a part, for telling a sleeve from a body. */
function middle(part: Part2): number {
  let lo = Infinity;
  let hi = -Infinity;
  for (const [x] of pixels(part)) {
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  }
  return (lo + hi) / 2;
}

/**
 * What a worn part moves with in a walk, if it does not say: worked out from
 * the slot it is worn in and, for clothes and armour, which side of the body
 * it lies on (a sleeve to the near or far side is that arm's).
 */
export function boneOf(part: Part2, slot: string): Bone {
  if (part.bone) return part.bone;
  switch (slot) {
    case 'hair':
    case 'head':
      return 'head';
    case 'weapon':
      return 'nearHeld';
    case 'shield':
      return 'farHeld';
    case 'legs':
    case 'feet':
    case 'knees':
      return 'legs';
    case 'cloak':
      return part.depth < 0 ? 'cloak' : 'body';
    case 'wrist':
      return middle(part) < AXIS ? 'near' : 'far';
    case 'shirt':
    case 'body': {
      const m = middle(part);
      return m < 23 ? 'near' : m > 33 ? 'far' : 'skirt';
    }
    default:
      return 'body';
  }
}

/** A dressed body's parts with what each moves with, for walk.ts. */
export function bonedParts(
  bodyId: string,
  gearIds: readonly string[],
  w: Wardrobe2 = WARDROBE2,
): Boned[] {
  return worn(bodyId, gearIds, w).map(({ part, slot }) => ({
    part,
    bone: slot === null ? (part.bone ?? 'body') : boneOf(part, slot),
  }));
}

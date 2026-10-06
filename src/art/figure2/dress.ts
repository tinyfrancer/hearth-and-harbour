/**
 * Dressing a C-scale figure: a body and gear by id, one piece per slot,
 * stacked by depth, outlined. Parts that cover the weapon forearm say which
 * pose they belong to and are worn only in it.
 */
import type { TGrid } from '../town2/cells';
import { BODIES2, FIG_H, FIG_W } from './body';
import { CLOTHES2, type Posed } from './clothes';
import { outlineIn, stack, type Body2, type Gear2, type Part2 } from './engine';
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

/** The parts of a dressed body, back to front not yet sorted. Throws on unknown ids or a slot worn twice. */
export function partsOf(
  bodyId: string,
  gearIds: readonly string[],
  w: Wardrobe2 = WARDROBE2,
): Part2[] {
  const body = w.bodies.find((b) => b.id === bodyId);
  if (!body) throw new Error(`No body "${bodyId}".`);
  const pose = bodyId.endsWith('_at_ease') ? 'ease' : 'hold';
  const slots = new Map<string, string>();
  const parts: Part2[] = [...body.parts];
  for (const id of gearIds) {
    const gear = findGear(id, w);
    if (!gear) throw new Error(`No gear "${id}".`);
    const taken = slots.get(gear.slot);
    if (taken) throw new Error(`"${id}" and "${taken}" are both worn in the ${gear.slot} slot.`);
    slots.set(gear.slot, id);
    for (const p of gear.parts as readonly Posed[]) if (!p.pose || p.pose === pose) parts.push(p);
  }
  return parts;
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

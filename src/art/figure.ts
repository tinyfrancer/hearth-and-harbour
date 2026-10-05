/**
 * People: a hand-placed, posed body plus gear layers chosen by id. Each layer
 * is drawn to fit the posed body, on the same 38 x 48 canvas, and sits at a
 * depth: a cloak and the blade of a held sword go behind the body, clothes
 * and armour on it, a shield in front. The outline goes round the whole
 * dressed figure, so it reads as one object.
 *
 * Game code will name gear by id; this file knows only pictures.
 */
import { blit, grid, outline, parseSprite, type Grid, type Legend } from './grid';
import { BODIES, GEAR } from './wardrobe';

/** Figures are drawn on a canvas this size (art pixels), so weapons fit beside the body. */
export const FIGURE_W = 38;
export const FIGURE_H = 48;

/** What each character in a figure's rows stands for. */
export const FIGURE_LEGEND: Legend = {
  k: 'ink1',
  w: 'white1',
  s: 'skin1',
  d: 'skin2',
  D: 'lips2',
  i: 'hair1',
  h: 'hair2',
  H: 'hair3',
  M: 'metal1',
  m: 'metal2',
  n: 'metal3',
  t: 'teal1',
  T: 'teal2',
  p: 'cloth1',
  x: 'shade1',
  o: 'wood3',
  O: 'wood4',
  f: 'leather1',
  g: 'gold1',
  G: 'gold2',
  c: 'crimson1',
  C: 'crimson2',
  u: 'blue1',
  U: 'blue2',
  e: 'plaster1',
  E: 'plaster2',
  // Added for the townsfolk.
  r: 'red2',
  R: 'red3',
  z: 'navy2',
  Z: 'navy1',
  B: 'beard2',
  W: 'wood2',
  j: 'wood1',
  q: 'stone3',
  a: 'apron1',
  A: 'apron2',
  v: 'dress1',
  V: 'dress2',
  y: 'auburn1',
  Y: 'auburn2',
  N: 'auburn3',
};

/** Part of a figure: rows of legend characters placed at `at` on the figure canvas. */
export interface FigurePart {
  readonly at: readonly [x: number, y: number];
  /** Lower is further back. The body is at 0. */
  readonly depth: number;
  readonly rows: readonly string[];
}

/** A posed body. Everything else is drawn to fit it. */
export interface BodyDef {
  readonly id: string;
  readonly parts: readonly FigurePart[];
}

/** One piece of gear (or a hairstyle): one or more parts, worn in one slot. */
export interface GearDef {
  readonly id: string;
  /** Only one piece per slot is worn at a time. */
  readonly slot: string;
  readonly parts: readonly FigurePart[];
}

/** The hero as approved in the mock-up, as gear ids on the standard body. */
export const HERO_OUTFIT: readonly string[] = [
  'short_hair',
  'red_cloak',
  'iron_sword',
  'grey_trousers',
  'leather_boots',
  'teal_tunic',
  'iron_plate',
  'leather_belt',
  'kite_shield',
];

/** The pirate captain as the mock-up drew him: his own posed body, cutlass in hand. */
export const PIRATE_OUTFIT: readonly string[] = ['pirate_cutlass'];
/** The smith as the mock-up drew him: his own posed body, arms folded; nothing held. */
export const SMITH_OUTFIT: readonly string[] = [];
/** The trader as the mock-up drew her: her own posed body, a basket on her arm. */
export const TRADER_OUTFIT: readonly string[] = ['trader_basket'];

/** Bodies and gear to dress from: the game's own wardrobe unless a test brings its own. */
export interface Wardrobe {
  readonly bodies: readonly BodyDef[];
  readonly gear: readonly GearDef[];
}

export const WARDROBE: Wardrobe = { bodies: BODIES, gear: GEAR };

const partGrids = new Map<FigurePart, Grid>();
function partGrid(part: FigurePart): Grid {
  let g = partGrids.get(part);
  if (!g) {
    g = parseSprite(part.rows, FIGURE_LEGEND);
    partGrids.set(part, g);
  }
  return g;
}

/**
 * A body wearing the given gear, without its outline: every part from back
 * to front. The order of `gearIds` does not matter; depth decides.
 */
export function dress(
  bodyId: string,
  gearIds: readonly string[],
  wardrobe: Wardrobe = WARDROBE,
): Grid {
  const body = wardrobe.bodies.find((b) => b.id === bodyId);
  if (!body) throw new Error(`No body "${bodyId}".`);
  const slots = new Map<string, string>();
  const layers: FigurePart[] = [...body.parts];
  for (const id of gearIds) {
    const gear = wardrobe.gear.find((g) => g.id === id);
    if (!gear) throw new Error(`No gear "${id}".`);
    const taken = slots.get(gear.slot);
    if (taken) throw new Error(`"${id}" and "${taken}" are both worn in the ${gear.slot} slot.`);
    slots.set(gear.slot, id);
    layers.push(...gear.parts);
  }
  // A stable sort: parts at the same depth keep the order they were listed in.
  layers.sort((a, b) => a.depth - b.depth);
  const g = grid(FIGURE_W, FIGURE_H);
  for (const part of layers) blit(g, partGrid(part), part.at[0], part.at[1]);
  return g;
}

/** A dressed, outlined figure, ready to stand on the ground (40 x 50 with its outline). */
export function figure(
  bodyId: string,
  gearIds: readonly string[],
  wardrobe: Wardrobe = WARDROBE,
): Grid {
  return outline(dress(bodyId, gearIds, wardrobe));
}

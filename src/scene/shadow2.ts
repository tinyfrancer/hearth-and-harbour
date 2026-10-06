/*
 * The contact shadow under a person in the C-scale town, as the art lane
 * shades everything else there: the ground's own cells darkened by a step or
 * two (a cell is a material and a step), never a grey laid over it. So it is
 * right on grass, cobbles, flagstones, sand, the pier's boards and the quay
 * alike, and at dusk it is the dusk ramps' own darker steps, lit by whatever
 * lamp is near, like the ground around it.
 *
 * Its shape follows the town's light, which comes from the upper left: a
 * dark core two steps down right under the soles, and a softer step-down
 * penumbra round it that falls further to the right than the left. At dusk
 * the light is lower and the penumbra reaches further, as the art lane's
 * ground shadows lengthen.
 *
 * On busy ground (cobbles, with their dark mortar) a plain shift of a step
 * or two keeps every stone's contrast, so the eye reads the stones and not
 * the shadow. So each part also has a floor: the core is never lighter than
 * the ramp's `CORE_FLOOR` step, the penumbra never lighter than
 * `PENUMBRA_FLOOR` (a step deeper at dusk, when the ground is already dark),
 * which evens the stones out under the feet into one shade,
 * and a dithered fringe a step down round the penumbra keeps its edge soft
 * rather than a cut-out oval.
 */
import { darker, stepOf } from '../art/town2/cells';
import type { TimeOfDay } from './daylight';
import type { Box } from './things';
import type { Point } from './tileMap';

/**
 * One pixel of a shadow: where it is from the soles' middle, how many steps
 * it darkens, and the step it darkens to at least (0 for none).
 */
export interface ShadowPixel {
  readonly dx: number;
  readonly dy: number;
  readonly n: 1 | 2;
  readonly floor: number;
}

/** The core is never lighter than this step of its ground's ramp; never the line step. */
export const CORE_FLOOR: Readonly<Record<TimeOfDay, number>> = { day: 4, dusk: 5 };
/** Nor the penumbra lighter than this. */
export const PENUMBRA_FLOOR: Readonly<Record<TimeOfDay, number>> = { day: 3, dusk: 4 };

/** An ellipse by its middle and half-sizes, from the soles' middle, in art pixels. */
interface Oval {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

/** The core: two steps down, right under the boots. */
const CORE: Oval = { cx: 1, cy: 1, rx: 11, ry: 2.4 };
/** The penumbra, one step down: off to the right of the core, longer at dusk. */
const PENUMBRA: Readonly<Record<TimeOfDay, Oval>> = {
  day: { cx: 4, cy: 1.5, rx: 15, ry: 3 },
  dusk: { cx: 9, cy: 1.5, rx: 20, ry: 3 },
};

const inside = (o: Oval, x: number, y: number): boolean => {
  const a = (x + 0.5 - o.cx) / o.rx;
  const b = (y + 0.5 - o.cy) / o.ry;
  return a * a + b * b <= 1;
};

/** The fringe: the penumbra grown a little, darkened a step on every other pixel. */
const fringeOf = (o: Oval): Oval => ({ cx: o.cx, cy: o.cy, rx: o.rx + 3, ry: o.ry + 1 });

/** A cell darkened `n` steps, and at least to `floor`, in its own ramp, never to its line. */
export function shade(c: number, n: number, floor: number): number {
  if (!c) return c;
  return darker(c, Math.max(n, Math.min(floor, 5) - stepOf(c)));
}

const made = new Map<TimeOfDay, readonly ShadowPixel[]>();

/** Every pixel of a person's contact shadow at this time of day. */
export function contactShadow(time: TimeOfDay): readonly ShadowPixel[] {
  let pixels = made.get(time);
  if (!pixels) {
    const list: ShadowPixel[] = [];
    const p = PENUMBRA[time];
    const fringe = fringeOf(p);
    for (let dy = -5; dy <= 5; dy++)
      for (let dx = -28; dx <= 34; dx++) {
        if (inside(CORE, dx, dy)) list.push({ dx, dy, n: 2, floor: CORE_FLOOR[time] });
        else if (inside(p, dx, dy)) list.push({ dx, dy, n: 1, floor: PENUMBRA_FLOOR[time] });
        else if (inside(fringe, dx, dy) && (dx + dy) % 2 === 0)
          list.push({ dx, dy, n: 1, floor: 0 });
      }
    pixels = list;
    made.set(time, pixels);
  }
  return pixels;
}

const boxes = new Map<TimeOfDay, Box>();

/** The box a shadow covers, from the soles' middle. Worked out once a time of day: it is asked every step. */
export function shadowBox(time: TimeOfDay): Box {
  let box = boxes.get(time);
  if (!box) {
    const pixels = contactShadow(time);
    const xs = pixels.map((p) => p.dx);
    const ys = pixels.map((p) => p.dy);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    box = { x, y, w: Math.max(...xs) - x + 1, h: Math.max(...ys) - y + 1 };
    boxes.set(time, box);
  }
  return box;
}

/** A grid of cells, row by row, `w` wide. */
export interface Cells {
  readonly w: number;
  readonly h: number;
  readonly d: Int16Array;
}

/**
 * Darkens the cells under someone standing at `feet`, in place: for the
 * townsfolk, whose shadows are laid into the ground before it is painted.
 */
export function layShadow(cells: Cells, feet: Point, time: TimeOfDay): void {
  const fx = Math.round(feet.x);
  const fy = Math.round(feet.y);
  for (const p of contactShadow(time)) {
    const x = fx + p.dx;
    const y = fy + p.dy;
    if (x < 0 || y < 0 || x >= cells.w || y >= cells.h) continue;
    const i = y * cells.w + x;
    cells.d[i] = shade(cells.d[i]!, p.n, p.floor);
  }
}

/**
 * The cells of a shadow on its own, for someone who moves: `out` (the size
 * of `shadowBox`) gets the ground under the shadow darkened and nothing
 * elsewhere, ready to be painted and laid over the town with its top-left at
 * `feet` plus the box's corner.
 */
export function shadowCells(ground: Cells, feet: Point, time: TimeOfDay, out: Cells): void {
  const box = shadowBox(time);
  out.d.fill(0);
  const fx = Math.round(feet.x);
  const fy = Math.round(feet.y);
  for (const p of contactShadow(time)) {
    const x = fx + p.dx;
    const y = fy + p.dy;
    if (x < 0 || y < 0 || x >= ground.w || y >= ground.h) continue;
    out.d[(p.dy - box.y) * out.w + (p.dx - box.x)] = shade(
      ground.d[y * ground.w + x]!,
      p.n,
      p.floor,
    );
  }
}

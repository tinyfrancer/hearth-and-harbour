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
 */
import { darker } from '../art/town2/cells';
import type { TimeOfDay } from './daylight';
import type { Box } from './things';
import type { Point } from './tileMap';

/** One pixel of a shadow: where it is from the soles' middle, and how many steps it darkens. */
export interface ShadowPixel {
  readonly dx: number;
  readonly dy: number;
  readonly n: 1 | 2;
}

/** An ellipse by its middle and half-sizes, from the soles' middle, in art pixels. */
interface Oval {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

/** The core: two steps down, right under the boots. */
const CORE: Oval = { cx: 1, cy: 1, rx: 10.5, ry: 2.2 };
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

const made = new Map<TimeOfDay, readonly ShadowPixel[]>();

/** Every pixel of a person's contact shadow at this time of day. */
export function contactShadow(time: TimeOfDay): readonly ShadowPixel[] {
  let pixels = made.get(time);
  if (!pixels) {
    const list: ShadowPixel[] = [];
    const p = PENUMBRA[time];
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -24; dx <= 28; dx++) {
        if (inside(CORE, dx, dy)) list.push({ dx, dy, n: 2 });
        else if (inside(p, dx, dy)) list.push({ dx, dy, n: 1 });
      }
    pixels = list;
    made.set(time, pixels);
  }
  return pixels;
}

/** The box a shadow covers, from the soles' middle. */
export function shadowBox(time: TimeOfDay): Box {
  const pixels = contactShadow(time);
  const xs = pixels.map((p) => p.dx);
  const ys = pixels.map((p) => p.dy);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x + 1, h: Math.max(...ys) - y + 1 };
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
    cells.d[i] = darker(cells.d[i]!, p.n);
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
    out.d[(p.dy - box.y) * out.w + (p.dx - box.x)] = darker(ground.d[y * ground.w + x]!, p.n);
  }
}

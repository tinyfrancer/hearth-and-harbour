/**
 * Turning drawings into figure parts, and posing them, for the grotto's cast
 * at the C scale. People stand on the figure engine (../figure2/engine.ts and
 * its walk rig, imported, never changed); creatures and the captain, on
 * canvases of their own, are posed here the same way: each part moves with a
 * bone, a frame says how far each bone moves, the parts are stacked by depth
 * with the engine's one-step cast shadow, and the engine's outline goes round
 * the whole.
 */
import { cell, matOf, stepOf, type Cell, type TGrid } from '../town2/cells';
import type { Mat } from '../town2/ramps';
import { outlineIn, pixels, stack, type Part2, type Pin } from '../figure2/engine';

/** Characters a generated part may use for its pins: anything but '.', ' ' and the digits. */
const ALPHABET = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-/:;<=>?@[]^_`{|}~',
  ...Array.from({ length: 400 }, (_, i) => String.fromCharCode(0xc0 + i)),
];

/** A part from a list of pixels in canvas coordinates. */
export function partOf(
  px: readonly (readonly [number, number, Cell])[],
  depth: number,
  o: { bone?: Part2['bone']; cast?: boolean; shaded?: boolean } = {},
): Part2 {
  const live = px.filter((p) => p[2]);
  if (!live.length) return { at: [0, 0], depth, rows: [], ...o };
  const xs = live.map((p) => p[0]);
  const ys = live.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(...xs) - x0 + 1;
  const h = Math.max(...ys) - y0 + 1;
  const rows = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  const pins: Record<string, Pin> = {};
  const chars = new Map<Cell, string>();
  for (const [x, y, c] of live) {
    let ch = chars.get(c);
    if (!ch) {
      ch = ALPHABET[chars.size]!;
      chars.set(c, ch);
      pins[ch] = [matOf(c)!, stepOf(c)];
    }
    rows[y - y0]![x - x0] = ch;
  }
  return { at: [x0, y0], depth, rows: rows.map((r) => r.join('')), pins, ...o };
}

/** A part from everything drawn on a grid, offset by (dx, dy). */
export function gridPart(
  g: TGrid,
  depth: number,
  o: { bone?: Part2['bone']; cast?: boolean; shaded?: boolean; dx?: number; dy?: number } = {},
): Part2 {
  const px: [number, number, Cell][] = [];
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const c = g.d[y * g.w + x]!;
      if (c) px.push([x + (o.dx ?? 0), y + (o.dy ?? 0), c]);
    }
  return partOf(px, depth, { bone: o.bone, cast: o.cast, shaded: o.shaded });
}

/** A part with each pixel passed through `f` (a jersey's stripes, a coat's dye); null leaves a pixel out. */
export function repaint(part: Part2, f: (x: number, y: number, c: Cell) => Cell | null): Part2 {
  const px = pixels(part)
    .map(([x, y, c]) => [x, y, f(x, y, c)] as const)
    .filter((p): p is readonly [number, number, Cell] => p[2] !== null);
  return { ...partOf(px, part.depth, { bone: part.bone, cast: part.cast, shaded: part.shaded }) };
}

/** Swaps one material for another in a part, keeping each step. */
export const dyed = (part: Part2, from: Mat, to: Mat): Part2 =>
  repaint(part, (_x, _y, c) => (matOf(c) === from ? cell(to, stepOf(c)) : c));

/** A part of a creature or the captain and the bone it moves with. */
export interface Bit {
  readonly part: Part2;
  readonly bone: string;
}

/** How far each bone moves in a frame; a bone left out stays put. */
export type Pose = Readonly<Record<string, readonly [dx: number, dy: number]>>;

/** The parts moved by a pose, stacked with the engine's cast shadow, and outlined, on a `w` x `h` canvas. */
export function posedBits(bits: readonly Bit[], w: number, h: number, pose: Pose = {}): TGrid {
  const parts = bits.map(({ part, bone }) => {
    const [dx, dy] = pose[bone] ?? [0, 0];
    return dx || dy ? { ...part, at: [part.at[0] + dx, part.at[1] + dy] as const } : part;
  });
  return outlineIn(stack(parts, w, h));
}

/**
 * A picture turned a quarter, for a body lying where it fell: `back` lays it
 * on its back with its head behind it (to the left when it faces right).
 * A quarter turn moves whole pixels, so nothing smears.
 */
export function laid(g: TGrid): TGrid {
  const out = { w: g.h, h: g.w, d: new Int16Array(g.w * g.h) };
  // Turned anticlockwise: the head (top) goes to the left, the feet to the right.
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) out.d[(g.w - 1 - x) * out.w + y] = g.d[y * g.w + x]!;
  return out;
}

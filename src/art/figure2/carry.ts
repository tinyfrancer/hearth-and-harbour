/**
 * How a long weapon is carried walking across (B11). Cody, on B10b: "Sword
 * goes through head on knight right image." In profile a held thing was its
 * front drawing turned about the fist, upright, so every blade and haft taller
 * than the shoulder passed across the face as the arm swung forward. Now each
 * is carried low, the hand at the hip and the weapon pointing forward and down
 * (an axe's head or a cudgel's knot forward), or for a bow, tilted forward
 * from the top, so nothing held ever crosses the head in any frame.
 *
 * The weapon is still its own front drawing, so the profile and the front
 * view stay the same object: turned point-down (exactly, row for row) and
 * leant forward by sliding each row sideways, as the walk bends a limb, so
 * every row of the drawing keeps its pixels and a blade's edge and midrib
 * run unbroken; first shortened by dropping rows along its length where it
 * points partly toward the viewer (foreshortened), so a knight's long sword
 * fits between the hip and the ground. The grip goes with it and is kept only
 * under the fingers. (Turning it by an angle instead, with shears, left the
 * blade's edges saw-toothed.)
 */
import { DEPTH } from '../depth';
import { FIST2 } from './body';
import { pixels, type Part2 } from './engine';
import { fromPixels, rowsOf } from './views';

/** Where a weapon turns: the middle of the fist. */
export const CARRY_PIVOT = [FIST2.at[0] + 2, FIST2.at[1] + 2] as const;

/**
 * The carry, by gear id: `down` turns it point-down about the fist (upside
 * down, exactly: the pommel above the fingers, the blade or head below);
 * `lean` slides each row forward by that many columns a row away from the
 * fist (forward and down for a blade, forward at the top for a bow), the way
 * the walk bends a limb, so every row of the drawing stays whole and a blade's
 * edge and midrib run unbroken; `keep` is how much of its length beyond the
 * fist is kept (foreshortened below 1). Not listed: carried as drawn.
 */
export const CARRY: Readonly<
  Record<string, { readonly down: boolean; readonly lean: number; readonly keep: number }>
> = {
  bronze_shortsword: { down: true, lean: 0.7, keep: 0.9 },
  iron_arming_sword: { down: true, lean: 0.75, keep: 0.7 },
  smugglers_cutlass: { down: true, lean: 0.75, keep: 0.8 },
  pirates_cutlass: { down: true, lean: 0.75, keep: 0.8 },
  iron_bearded_axe: { down: true, lean: 0.7, keep: 0.85 },
  bronze_hatchet: { down: false, lean: 0.35, keep: 1 },
  cudgel: { down: true, lean: 0.6, keep: 1 },
  boarding_axe: { down: true, lean: 0.75, keep: 0.55 },
  brinebeards_anchor: { down: false, lean: 0, keep: 0.62 },
  poachers_longbow: { down: false, lean: 0.75, keep: 0.8 },
  pine_shortbow: { down: false, lean: 0.6, keep: 0.9 },
  oak_shortbow: { down: false, lean: 0.6, keep: 0.9 },
  willow_shortbow: { down: false, lean: 0.6, keep: 0.9 },
  knight_sword: { down: true, lean: 0.75, keep: 0.6 },
};

/** Rows beyond the fist's own, along the weapon, kept every `keep`: the far end foreshortened. */
function foreshorten(
  px: readonly (readonly [number, number, string])[],
  keep: number,
): [number, number, string][] {
  if (keep >= 1) return px.map((p) => [...p]);
  const [, py] = CARRY_PIVOT;
  const reach = 3;
  const out: [number, number, string][] = [];
  const byRow = new Map<number, [number, string][]>();
  for (const [x, y, ch] of px) {
    if (!byRow.has(y)) byRow.set(y, []);
    byRow.get(y)!.push([x, ch]);
  }
  const ys = [...byRow.keys()];
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  // Near the fist every row stays; beyond `reach` each new row samples the old one `1 / keep` along.
  for (let y = py - reach; y <= py + reach; y++)
    for (const [x, ch] of byRow.get(y) ?? []) out.push([x, y, ch]);
  for (let d = reach + 1; py - (reach + (d - reach) / keep) >= top - 0.5; d++) {
    const src = Math.round(py - (reach + (d - reach) / keep));
    for (const [x, ch] of byRow.get(src) ?? []) out.push([x, py - d, ch]);
  }
  for (let d = reach + 1; py + (reach + (d - reach) / keep) <= bottom + 0.5; d++) {
    const src = Math.round(py + (reach + (d - reach) / keep));
    for (const [x, ch] of byRow.get(src) ?? []) out.push([x, py + d, ch]);
  }
  return out;
}

/** (x, y) carried: turned point-down about the pivot's row if asked, then each row slid by `lean`. */
function slid(x: number, y: number, down: boolean, lean: number): [number, number] {
  const [, cy] = CARRY_PIVOT;
  const ny = down ? 2 * cy - y : y;
  // Forward (+x) as the row goes away from the fist: down for a weapon turned point-down, up for a bow.
  const away = down ? ny - cy : cy - ny;
  return [x + Math.round(lean * away), ny];
}

/** A held thing's parts as carried walking across: turned, foreshortened, the grip only under the fist. */
export function carried(id: string, parts: readonly Part2[]): Part2[] {
  const c = CARRY[id];
  if (!c) return [...parts];
  // The grip only where the fingers cover it.
  const fingers = new Set(pixels(FIST2).map(([x, y]) => y * 1000 + x));
  return parts.map((p) => {
    const px: [number, number, string][] = [];
    for (const [y, row] of rowsOf(p)) for (const [x, ch] of row) px.push([x, y, ch]);
    const seen = new Set<number>();
    const out: [number, number, string][] = [];
    for (const [x, y, ch] of foreshorten(px, c.keep)) {
      const [nx, ny] = slid(x, y, c.down, c.lean);
      // The grip only under the fingers; the rest never over them, so the fist shows whole.
      if ((p.depth === DEPTH.GRIP) !== fingers.has(ny * 1000 + nx)) continue;
      const k = ny * 1000 + nx;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push([nx, ny, ch]);
    }
    return fromPixels(p, out);
  });
}
